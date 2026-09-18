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
import { PetraContractRegistry } from "./browser-contract-registry.js";
import { installedBriefPayloadHash, readProjectBrief } from "./brief-read.js";
import { loadProjectBrief } from "./project-data.js";
import { ProjectBriefSurface } from "./ProjectBriefSurface.js";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const sample = () =>
  structuredClone(fixture) as unknown as PetraProjectBriefViewV11;
const seal = (view: PetraProjectBriefViewV11) => {
  view.content_hash = hash(view.content);
  view.snapshot_hash = hash(projectBriefSnapshotMaterial(view.content));
  return view;
};
const read = () =>
  readProjectBrief({
    projectId: fixture.project_id,
    baseUrl: "http://petra.test",
    token: "brief-browser-test",
    signal: new AbortController().signal,
  });
const render = (view = sample()) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ProjectBriefSurface view={view} />
    </MemoryRouter>,
  );
afterEach(() => vi.unstubAllGlobals());

describe("Project Brief browser boundary", () => {
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
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json(fixture)),
    );
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
    expect(result).toEqual({ briefView: fixture });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toEqual(
      new URL(
        `http://petra.local/api/queries/projects/${fixture.project_id}/brief`,
      ),
    );
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
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

  it("keeps an explicitly selected current preview separate from the captured Brief", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((input) => {
      const url = input instanceof Request ? input.url : String(input);
      return Promise.resolve(
        url.endsWith("/brief")
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
    expect(fetch).toHaveBeenCalledTimes(3);
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

  it("preserves the seven-section hierarchy, origins, limitations, exact basis and disabled History navigation", () => {
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
    expect(markup).not.toMatch(/href="[^"]*\/history/);
    expect(markup).not.toContain("No item needs attention");
    expect(markup).not.toContain("Petra recommends");
    expect(markup).toContain("Read current preview for this result");
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
