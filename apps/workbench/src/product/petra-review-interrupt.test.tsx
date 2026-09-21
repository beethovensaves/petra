import type { PetraInteractionResult } from "@petra/adapters/ag-ui";
import type {
  PetraReviewInterruptResponse,
  PetraReviewSessionApplyResult,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import applyResultJson from "./review-apply-result.fixture.json";
import { PetraReviewInterrupt } from "./PetraReviewInterrupt.js";
import {
  createProjectReviewInterruptResponse,
  projectReviewInterruptResolution,
  projectReviewInterruptsFromInteraction,
  readRetainedProjectReviewInterruptResponse,
  resolveProjectReviewInterrupt,
  retainProjectReviewInterruptResponse,
  type ProjectReviewInterruptPresentation,
} from "./petra-review-interrupt.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const interruptId = "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FD8";
const interactionRunId = "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FD6";
const changeSetId = "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

const interactionResult = (): PetraInteractionResult => ({
  events: [
    {
      type: "RUN_FINISHED",
      payload: {
        outcome: {
          type: "interrupt",
          interrupts: [
            {
              id: interruptId,
              reason: "changeset_review",
              message:
                "Review the exact proposed ChangeSet before it becomes authoritative.",
              metadata: {
                projectId,
                interactionRunId,
                interactionInterruptRef: {
                  interaction_interrupt_id: interruptId,
                  revision: 1,
                  content_hash: hash("1"),
                },
                changeSetRef: {
                  change_set_id: changeSetId,
                  revision: 1,
                  content_hash:
                    "sha256:40f3f95b427df39085f5471705ec3e8fad6290943320c98832ef2e2efc922a2a",
                },
              },
            },
          ],
        },
      },
    },
  ],
  messages: [],
  state: {},
  pendingInterrupts: [
    {
      id: interruptId,
      reason: "changeset_review",
      message:
        "Review the exact proposed ChangeSet before it becomes authoritative.",
    },
  ],
});

const presentation = (): ProjectReviewInterruptPresentation =>
  projectReviewInterruptsFromInteraction(interactionResult(), projectId)[0]!;

const response = (): PetraReviewInterruptResponse =>
  createProjectReviewInterruptResponse(presentation(), {
    decision: "accept",
    rationale: "The exact source basis supports this bounded candidate.",
    clientResponseId: "review-response-browser-1",
    decidedAt: "2026-09-20T16:30:00.000Z",
  });

const resolutionPayload = (
  exactResponse: PetraReviewInterruptResponse,
): Record<string, unknown> => {
  const result = structuredClone(
    applyResultJson,
  ) as unknown as PetraReviewSessionApplyResult;
  result.request.decided_at = exactResponse.decided_at;
  return {
    replayed: false,
    response_recorded: true,
    interaction_interrupt_id:
      exactResponse.interrupt_ref.interaction_interrupt_id,
    interaction_interrupt_revision: 2,
    command_id: "command_11VZV703ZT28R2EFMB9051WZQ3",
    result,
    return_context: {
      project_thread_ref: {
        project_thread_id: "project_thread_01K4C000000000000000000101",
        revision: 1,
        content_hash: hash("2"),
        record_hash: hash("3"),
      },
      review_session_ref: {
        review_session_id:
          result.request.checkpoint.binding.review_session.review_session_id,
        revision: result.request.checkpoint.binding.review_session.revision,
        content_hash:
          result.request.checkpoint.binding.review_session.content_hash,
      },
      review_member_id:
        result.request.checkpoint.binding.selected_review_member_id,
      work_unit_ref: {
        work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        revision: 1,
        spec_hash: hash("4"),
        record_hash: hash("5"),
      },
      destination: {
        place: "work",
        object_ref: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        label: "Extract supported claims",
      },
      paths: {
        project_thread: `/projects/${projectId}/petra/project_thread_01K4C000000000000000000101`,
        review: `/projects/${projectId}/review/review_session_01K4D000000000000000000004`,
        work: `/projects/${projectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2`,
        return: `/projects/${projectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2`,
      },
    },
  };
};

afterEach(() => vi.unstubAllGlobals());

describe("Petra durable Review interrupt", () => {
  it("accepts only the exact pending server-owned interrupt metadata", () => {
    const exact = presentation();

    expect(exact).toEqual({
      projectId,
      interactionRunId,
      interruptRef: {
        interaction_interrupt_id: interruptId,
        revision: 1,
        content_hash: hash("1"),
      },
      changeSetRef: {
        change_set_id: changeSetId,
        revision: 1,
        content_hash:
          "sha256:40f3f95b427df39085f5471705ec3e8fad6290943320c98832ef2e2efc922a2a",
      },
      reason: "changeset_review",
      message:
        "Review the exact proposed ChangeSet before it becomes authoritative.",
    });

    const missingMetadata = interactionResult();
    const event = missingMetadata.events[0]!;
    const outcome = event.payload.outcome as {
      interrupts: Array<Record<string, unknown>>;
    };
    delete outcome.interrupts[0]!.metadata;
    expect(() =>
      projectReviewInterruptsFromInteraction(missingMetadata, projectId),
    ).toThrow("server-owned interrupt identity");
  });

  it("retains one exact response identity and timestamp for uncertain delivery", () => {
    const exactPresentation = presentation();
    const exactResponse = response();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => values.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        values.set(key, value);
      },
    };

    retainProjectReviewInterruptResponse(
      exactPresentation,
      exactResponse,
      storage,
    );

    expect(
      readRetainedProjectReviewInterruptResponse(exactPresentation, storage),
    ).toEqual(exactResponse);
    expect(exactResponse).toMatchObject({
      client_response_id: "review-response-browser-1",
      decision: "accept",
      decided_at: "2026-09-20T16:30:00.000Z",
      interrupt_ref: exactPresentation.interruptRef,
      change_set_ref: exactPresentation.changeSetRef,
    });
    const stale = structuredClone(exactPresentation);
    stale.interruptRef.revision += 1;
    expect(
      readRetainedProjectReviewInterruptResponse(stale, storage),
    ).toBeUndefined();
  });

  it("validates authenticated outcome, recovery, and exact return context", () => {
    const exactResponse = response();
    const parsed = projectReviewInterruptResolution(
      resolutionPayload(exactResponse),
      exactResponse,
    );

    expect(parsed.replayed).toBe(false);
    expect(parsed.responseRecorded).toBe(true);
    expect(parsed.interactionInterruptRevision).toBe(2);
    expect(parsed.decision).toBe("accept");
    expect(parsed.actorId).toBe("actor_01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(parsed.outcome).toBe("applied");
    expect(parsed.coverageState).toBe("complete");
    expect(parsed.memberOutcome).toBe("applied");
    expect(parsed.snapshotState).toBe("current");
    expect(parsed.returnContext.reviewMemberId).toBe(
      "review_member_01K4D000000000000000000005",
    );
    expect(parsed.returnContext.paths.projectThread).toContain(
      "/petra/project_thread_",
    );
    expect(parsed.returnContext.paths.review).toContain(
      "/review/review_session_",
    );
    expect(parsed.returnContext.paths.work).toContain("/work/work_unit_");
    expect(parsed.returnContext.paths.return).toContain("/work/work_unit_");

    const crossProject = resolutionPayload(exactResponse);
    (
      crossProject.return_context as {
        paths: { return: string };
      }
    ).paths.return = "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAX/brief";
    expect(() =>
      projectReviewInterruptResolution(crossProject, exactResponse),
    ).toThrow("cross-Project");
  });

  it("posts through the typed client and parses the durable receipt", async () => {
    const exactResponse = response();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(resolutionPayload(exactResponse)));
    vi.stubGlobal("fetch", fetch);

    await expect(resolveProjectReviewInterrupt(exactResponse)).resolves.toEqual(
      expect.objectContaining({ outcome: "applied" }),
    );
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    const exactUrl =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    expect(exactUrl).toBe("http://petra.local/api/commands/reviews/resolve");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    expect(typeof init?.body).toBe("string");
    if (typeof init?.body !== "string") {
      throw new TypeError("Expected the typed client to encode a JSON body.");
    }
    expect(JSON.parse(init.body) as unknown).toEqual(exactResponse);
  });

  it("renders a visible semantic Respond control and authority boundary", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PetraReviewInterrupt interrupt={presentation()} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Respond before Work can continue");
    expect(markup).toContain("Authenticated Review decision");
    expect(markup).toContain("Accept and apply");
    expect(markup).toContain("Reject");
    expect(markup).toContain("Respond");
    expect(markup).toContain(interruptId);
    expect(markup).toContain(changeSetId);
    expect(markup).toContain("Model text supplies neither");
  });
});
