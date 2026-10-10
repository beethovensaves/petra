import { createHash } from "node:crypto";
import type { PetraProjectBriefViewV11 } from "@petra/contracts";
import { projectBriefSnapshotMaterial } from "@petra/core/project-brief-view";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import registry from "../../../../packages/contracts/registry.json";
import fixture from "./project-brief.fixture.json";
import actionFixture from "../../../../packages/contracts/fixtures/accepted/suggested-action-view.json";
import controlsFixture from "../../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json";
import historyFixture from "../../../../packages/contracts/fixtures/accepted/project-history-view.json";
import workFixture from "../../../../packages/contracts/fixtures/accepted/project-work-view-detail.json";
import { PetraContractRegistry } from "./browser-contract-registry.js";
import { installedBriefPayloadHash, readProjectBrief } from "./brief-read.js";
import { loadProjectBrief } from "./project-data.js";
import { ProjectBriefSurface } from "./ProjectBriefSurface.js";
import type { ProjectObjectiveCommandContext } from "./project-objective-command.js";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
};
const sample = () =>
  structuredClone(fixture) as unknown as PetraProjectBriefViewV11;
const seal = (view: PetraProjectBriefViewV11) => {
  view.content_hash = hash(view.content);
  view.snapshot_hash = hash(projectBriefSnapshotMaterial(view.content));
  return view;
};
const objectiveContext = (
  view: PetraProjectBriefViewV11,
): ProjectObjectiveCommandContext => {
  const objective = view.content.objective;
  return {
    projectId: view.project_id,
    projectName: view.content.shell.content.project.name,
    definitionLabel: view.content.definition.content.label,
    projectRef: {
      project_id: view.project_id,
      revision: view.content.shell.content.project.revision,
      record_hash: `sha256:${"1".repeat(64)}`,
    },
    projectDefinitionRef: {
      project_definition_id: view.content.definition.project_definition_id,
      revision: view.content.definition.revision,
      content_hash: view.content.definition.content_hash,
      record_hash: hash(view.content.definition),
    },
    focus: {
      state: "focused",
      objective,
      objectiveRecordHash: hash(objective),
      term:
        view.content.definition.content.terms.find(
          (term) => term.semantic_key === objective.content.objective_kind,
        )?.singular ?? "Objective",
    },
  };
};
const controls = () => {
  const value = structuredClone(controlsFixture);
  value.content.project_definition_ref.content_hash =
    fixture.content.definition.content_hash;
  value.content.project_definition_ref.record_hash = hash(
    fixture.content.definition,
  );
  return value;
};
const read = () =>
  readProjectBrief({
    projectId: fixture.project_id,
    baseUrl: "http://petra.test",
    token: "brief-browser-test",
    signal: new AbortController().signal,
  });
const render = (
  view = sample(),
  comparisonRecovery?: {
    state: "unavailable" | "stale";
    eventId: string;
    reason: string;
  },
  objectiveSuggestion?: string,
) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ProjectBriefSurface
        view={view}
        objectiveCommandContext={objectiveContext(view)}
        {...(comparisonRecovery === undefined ? {} : { comparisonRecovery })}
        {...(objectiveSuggestion === undefined ? {} : { objectiveSuggestion })}
      />
    </MemoryRouter>,
  );
afterEach(() => vi.unstubAllGlobals());

describe("Project Brief browser boundary", () => {
  it("opens an Agent draft as an uncommitted Objective proposal for review", () => {
    const suggestion = "Compare the two explanations under the same limits.";
    const markup = render(sample(), undefined, suggestion);
    expect(markup).toContain("Your Agent draft is here for review");
    expect(markup).toContain("It has not changed the");
    expect(markup).toContain(suggestion);
    expect(markup).toContain("Proposed objective");
    expect(markup).not.toContain("Objective revised");
  });

  it("registers exact installed schemas and complete dependencies, and checks their registry hashes", async () => {
    const contracts = new PetraContractRegistry();
    contracts.assertValid("project-brief-view", "1.1.0", fixture);
    contracts.assertValid(
      "research-brief-payload",
      "1.1.0",
      fixture.content.profile_payload,
    );
    for (const version of ["1.0.0", "1.1.0"])
      expect(await installedBriefPayloadHash(version)).toBe(
        registry.schemas.find(
          (entry) =>
            entry.name === "research-brief-payload" &&
            entry.version === version,
        )?.canonical_sha256,
      );
    const invalid = sample();
    invalid.content.profile_payload.current_state.syntheses[0]!.output.statements[0].origin =
      "invented" as "source_report";
    expect(() =>
      contracts.assertValid("project-brief-view", "1.1.0", invalid),
    ).toThrow();
  });

  it("loads one authenticated, fully validated Brief without shell or fixture fallback and preserves retries", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((input) => {
      const url = input instanceof Request ? input.url : String(input);
      return Promise.resolve(
        Response.json(
          url.endsWith("/effective-controls") ? controls() : fixture,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${fixture.project_id}/brief`,
    );
    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      params: { projectId: fixture.project_id },
      pattern: "/projects/:projectId/brief",
      context: new RouterContextProvider(),
    });
    expect(result.briefView).toEqual(fixture);
    expect(result.objectiveCommandContext).toEqual(objectiveContext(sample()));
    expect(fetch).toHaveBeenCalledTimes(2);
    const briefCall = fetch.mock.calls.find(([input]) =>
      fetchUrl(input).endsWith(`projects/${fixture.project_id}/brief`),
    );
    expect(briefCall?.[0]).toEqual(
      new URL(
        `http://petra.local/api/queries/projects/${fixture.project_id}/brief`,
      ),
    );
    expect(briefCall?.[1]?.headers).toEqual({
      authorization: "Bearer petra-local-development",
    });
    expect(await read()).toEqual(fixture);
  });

  it.each([401, 403, 409, 422, 503])(
    "preserves HTTP %s as an explicit failed read with no substitute",
    async (status) => {
      const fetch = vi.fn<typeof globalThis.fetch>(() =>
        Promise.resolve(new Response(null, { status })),
      );
      vi.stubGlobal("fetch", fetch);
      await expect(read()).rejects.toThrow(`(${status})`);
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("frames from the shell's exact reviewed absence when the full Brief requires a focus", async () => {
    const shell = structuredClone(fixture.content.shell);
    delete (shell.content as { current_objective?: unknown }).current_objective;
    const fetch = vi.fn<typeof globalThis.fetch>((input) => {
      const path = fetchUrl(input);
      return Promise.resolve(
        path.endsWith("/effective-controls")
          ? Response.json(controls())
          : path.endsWith("/shell")
            ? Response.json(shell)
            : new Response(null, { status: 422 }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${fixture.project_id}/brief`,
    );
    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      params: { projectId: fixture.project_id },
      pattern: "/projects/:projectId/brief",
      context: new RouterContextProvider(),
    });
    expect(result.briefView).toBeUndefined();
    expect(result.objectiveCommandContext?.focus).toStrictEqual({
      state: "none",
      objectiveKind: "scientific.research-question",
      term: "Research question",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps a registered non-scientific starting Brief useful without substituting scientific sections", async () => {
    const shell = structuredClone(fixture.content.shell);
    const fetch = vi.fn<typeof globalThis.fetch>((input) => {
      const path = fetchUrl(input);
      return Promise.resolve(
        path.endsWith("/effective-controls")
          ? Response.json(controls())
          : path.endsWith("/shell")
            ? Response.json(shell)
            : Response.json(
                {
                  error: {
                    code: "PROJECT_BRIEF_UNSUPPORTED",
                    message:
                      "No exact registered controlled-writing Brief payload is available for this ProjectDefinition and Objective.",
                  },
                },
                { status: 422 },
              ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${fixture.project_id}/brief`,
    );
    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      params: { projectId: fixture.project_id },
      pattern: "/projects/:projectId/brief",
      context: new RouterContextProvider(),
    });

    expect(result.briefView).toBeUndefined();
    expect(result.objectiveCommandContext).toBeUndefined();
    expect(result.profileStartingBrief).toMatchObject({
      projectRef: {
        projectId: fixture.project_id,
        revision: shell.content.project.revision,
      },
      projectDefinitionRef: {
        projectDefinitionId: shell.content.definition.project_definition_id,
        revision: shell.content.definition.revision,
        contentHash: shell.content.definition.content_hash,
      },
      objectiveRef: {
        objectiveId: shell.content.current_objective?.objective_id,
        revision: shell.content.current_objective?.revision,
        contentHash: shell.content.current_objective?.content_hash,
      },
      limitation:
        "No exact registered controlled-writing Brief payload is available for this ProjectDefinition and Objective.",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps an explicitly selected current preview separate from the captured Brief", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((input) => {
      const url = input instanceof Request ? input.url : String(input);
      return Promise.resolve(
        url.endsWith("/effective-controls")
          ? Response.json(controls())
          : url.endsWith("/brief")
            ? Response.json(fixture)
            : url.includes("action_kind=")
              ? new Response(null, { status: 404 })
              : Response.json(actionFixture),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const link =
      actionFixture.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const url = new URL(
      `http://petra.test/projects/${fixture.project_id}/brief?inquiry_result_link_id=${link}`,
    );
    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      params: { projectId: fixture.project_id },
      pattern: "/projects/:projectId/brief",
      context: new RouterContextProvider(),
    });
    expect(result.briefView).toEqual(fixture);
    expect(result.suggestedAction).toEqual(actionFixture);
    expect(result.briefView?.content.next_steps[0]?.content_hash).not.toBe(
      result.suggestedAction?.content_hash,
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("rejects unavailable comparison controls before reading a substitute current-only view", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${fixture.project_id}/brief?baseline_event_id=event_old`,
    );
    await expect(
      loadProjectBrief({
        request: new Request(url),
        url,
        params: { projectId: fixture.project_id },
        pattern: "/projects/:projectId/brief",
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      "Objective revision",
      (v: PetraProjectBriefViewV11) => {
        v.content.objective.revision++;
      },
    ],
    [
      "installed profile hash",
      (v: PetraProjectBriefViewV11) => {
        v.content.profile_registration.contract.content_hash = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      "linked statement",
      (v: PetraProjectBriefViewV11) => {
        v.content.profile_payload.current_state.syntheses[0]!.output.statements[0].text =
          "Substituted conclusion";
      },
    ],
    [
      "packet snapshot",
      (v: PetraProjectBriefViewV11) => {
        v.content.profile_payload.current_state.syntheses[0]!.context_packet
          .snapshot_ref.snapshot_revision++;
      },
    ],
    [
      "omitted synthesis",
      (v: PetraProjectBriefViewV11) => {
        v.content.profile_payload.current_state.syntheses = [];
      },
    ],
    [
      "missing action",
      (v: PetraProjectBriefViewV11) => {
        v.content.next_steps = [];
      },
    ],
    [
      "cross-Project current response",
      (v: PetraProjectBriefViewV11) => {
        v.content.profile_payload.current_state.syntheses[0]!.current_response.project_id =
          "project_01ARZ3NDEKTSV4RRFFQ69G5FAV";
      },
    ],
  ] as const)("rejects resealed %s mismatches", async (_label, mutate) => {
    const invalid = sample();
    mutate(invalid);
    seal(invalid);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(invalid))),
    );
    await expect(read()).rejects.toThrow();
  });

  it("rejects unsupported versions without accepting a response-supplied hash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(Response.json({ ...fixture, schema_version: "9.0.0" })),
      ),
    );
    await expect(read()).rejects.toThrow("unsupported");
  });
});

describe("DB07 retained synthesis mapping", () => {
  it("leads with the task and keeps diagnostic records in progressive disclosure", () => {
    const markup = render();

    expect(markup).toContain("<h1>Brief</h1>");
    expect(markup).toContain(
      "The current focus, what needs attention, and where to continue.",
    );
    expect(markup).toContain('href="#brief-next"');
    expect(markup).toContain("Review next step");
    expect(markup).toContain('class="brief-position"');
    expect(markup).toContain(
      'class="brief-record brief-technical"><summary>Technical position and scope',
    );
    expect(markup).not.toContain("<h1>Competing explanations</h1>");
  });

  it("preserves the seven-section hierarchy, origins, limitations, exact basis and full History navigation", () => {
    const markup = render();
    const headings = [
      "Current focus",
      "Needs your attention",
      "What changed",
      "Current state",
      "Work",
      "Next steps",
      "Recent decisions",
    ];
    const positions = headings.map((heading) =>
      markup.indexOf(`>${heading}</h2>`),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const phrase of [
      "Source report",
      "Petra synthesis",
      "Unresolved inference",
      "Resolution requirement:",
      "Complete original ContextPacket and EvidencePacket",
      "No attention items were returned within this coverage.",
      "A preferred recommendation and ranked alternatives are unavailable.",
      "No comparison baseline was requested.",
    ])
      expect(markup).toContain(phrase);
    const synthesis =
      fixture.content.profile_payload.current_state.syntheses[0]!;
    for (const identity of [
      synthesis.project_inquiry_link_id,
      synthesis.context_packet.context_packet_id,
      synthesis.evidence_packet.evidence_packet_id,
      synthesis.linked_response.grounded_response_id,
      synthesis.linked_response.content.snapshot_ref.snapshot_id,
    ])
      expect(markup).toContain(identity);
    expect(markup).toContain(`href="/projects/${fixture.project_id}/history"`);
    expect(markup).toContain("View all Project History");
    expect(markup).not.toContain("No item needs attention");
    expect(markup).not.toContain("Petra recommends");
    expect(markup).toContain("Read current preview for this result");
  });

  it("opens an exact Work attention owner and preserves its Brief return focus", () => {
    const view = sample();
    const work = structuredClone(
      workFixture,
    ) as unknown as PetraProjectBriefViewV11["content"]["work"][number];
    work.read_at = view.read_at;
    work.project_id = view.project_id;
    if (work.content.view_kind !== "detail")
      throw new Error("Expected exact Work detail fixture.");
    view.content.work = [work];
    view.content.attention = [
      {
        item_id: work.content.summary.work_unit_ref.work_unit_id,
        owner: "work",
        owner_content_hash: work.content_hash,
        consequence_class: "work_interruption",
        reason: "This task needs a response before it can continue.",
        resolution: "inspect_canonical_owner",
        deferral: "preserves_underlying_condition",
        acknowledgment: "client_local",
      },
    ];

    const markup = render(view);

    expect(markup).toContain("Open exact Work task");
    expect(markup).toContain("expected_work_revision=4");
    expect(markup).toContain("expected_work_spec_hash=sha256%3A");
    expect(markup).toContain("return_focus=brief-attention-item-0");
  });

  it("offers exact recent-History baselines, material comparison, and explicit recovery", () => {
    const current = sample();
    const history = structuredClone(historyFixture);
    const newer = structuredClone(
      history.content.changes[0]!,
    ) as unknown as PetraProjectBriefViewV11["content"]["recent_decisions"]["content"]["changes"][number];
    const older = structuredClone(
      history.content.changes[0]!,
    ) as unknown as PetraProjectBriefViewV11["content"]["recent_decisions"]["content"]["changes"][number];
    newer.event_ref.event_id = "event_01K4C000000000000000000058";
    newer.event_ref.event_position = 2;
    newer.event_ref.stream_revision = 2;
    newer.observed_effect.summary = "Applied the reviewed source replacement.";
    older.event_ref.event_id = "event_01K4C000000000000000000057";
    older.event_ref.event_position = 1;
    older.event_ref.stream_revision = 1;
    older.observed_effect.summary = "Recorded the earlier source baseline.";
    current.content.recent_decisions.content.changes = [newer, older];
    current.content.recent_decisions.content.authority = {
      through_event_position: 2,
      through_stream_revision: 2,
    };

    const currentMarkup = render(current);
    expect(currentMarkup).toContain(
      "Compare from Recorded the earlier source baseline.",
    );
    expect(currentMarkup).toContain("baseline_event_id=event_01K4C");
    expect(currentMarkup).toContain("baseline_record_hash=sha256%3A");

    const compared = structuredClone(current);
    compared.content.comparison = {
      state: "recent_history_interval",
      baseline: structuredClone(older.event_ref),
      through: structuredClone(
        current.content.recent_decisions.content.authority,
      ),
      changes: [newer],
      limitation: "Only canonical recent History events are compared.",
    };
    const comparedMarkup = render(compared);
    expect(comparedMarkup).toContain(
      "Applied the reviewed source replacement.",
    );
    expect(comparedMarkup).toContain("Refresh this exact comparison");
    expect(comparedMarkup).toContain("Return to current Brief");

    const recoveryMarkup = render(current, {
      state: "stale",
      eventId: older.event_ref.event_id,
      reason: "The expected Brief snapshot is stale.",
    });
    expect(recoveryMarkup).toContain("The Brief changed before comparison");
    expect(recoveryMarkup).toContain("without substituting a comparison");
  });

  it("keeps invalidated current revisions separate from original statements and evidence snapshots", () => {
    const view = sample();
    const result = view.content.profile_payload.current_state.syntheses[0]!;
    result.current_response.revision = 2;
    result.current_response.content.cache = {
      ...result.current_response.content.cache,
      state: "invalidated",
      invalidated_by: [
        {
          event_id: "event_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          event_type: "change_set.reverted",
          change_set_id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        },
      ],
      affected_dependency_ids: ["claim_01ARZ3NDEKTSV4RRFFQ69G5FBB"],
    };
    const markup = render(view);
    expect(markup).toContain(
      "Linked response revision 1; current response revision 2",
    );
    expect(markup).toContain("<strong>invalidated</strong>");
    expect(markup).toContain("change_set.reverted");
    expect(markup).toContain(result.output.statements[0].text);
  });

  it("does not infer scientific absence from empty bounded coverage", () => {
    const view = sample();
    view.content.profile_payload.current_state.syntheses = [];
    expect(render(view)).toContain(
      "Relevant evidence and unresolved questions may exist outside it.",
    );
  });
});
