import { readFileSync } from "node:fs";

import type {
  PetraProjectInquiryView,
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  REFERENCE_PROJECTS,
  getReferenceProject,
  getReferenceSource,
} from "./fixtures.js";
import {
  BriefSurface,
  ProjectsSurface,
  SuggestedActionPreview,
  SourceReaderSurface,
  SourcesSurface,
  hashFocusTargetId,
} from "./ReferenceWorkbench.js";
import {
  SuggestedActionInvocationResult,
  SuggestedWorkAction,
  attemptSuggestedActionInvocation,
  attemptSuggestedActionInteractionReplay,
  attemptSuggestedActionWorkCancellation,
} from "./SuggestedAction.js";
import { createSuggestedActionInvocationRequest } from "./project-data.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("route focus restoration", () => {
  it("accepts one encoded in-page target and rejects empty or malformed hashes", () => {
    expect(hashFocusTargetId("#basis-source%3A1")).toBe("basis-source:1");
    expect(hashFocusTargetId("#")).toBeUndefined();
    expect(hashFocusTargetId("basis-source")).toBeUndefined();
    expect(hashFocusTargetId("#%E0%A4%A")).toBeUndefined();
  });
});

const suggestedActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionView;

const inquiryDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const suggestedWorkActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionViewV11;

const suggestedActionInvocationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationView;

const referenceWorkbenchCss = readFileSync(
  new URL("./reference-workbench.css", import.meta.url),
  "utf8",
);

describe("neutral Petra reference workbench", () => {
  const inletProject = getReferenceProject("inlet-cycle");

  if (inletProject === undefined) {
    throw new Error("The inlet-cycle conformance Project is missing.");
  }

  it("renders three compatible taxonomies through one Projects surface", () => {
    const markup = render(<ProjectsSurface />);

    expect(markup).toContain("Evidence inquiry");
    expect(markup).toContain("Controlled publication");
    expect(markup).toContain("Decision analysis");
    expect(markup.match(/Open Brief/g)).toHaveLength(3);
    expect(markup).toContain(
      "Profiles supply compatible domain terms and tasks",
    );
    expect(markup).not.toContain("projects/demo");
  });

  it("keeps Petra's recommendation contextual and preserves valid alternatives", () => {
    const markup = render(<BriefSurface project={inletProject} />);

    expect(markup).toContain("One branch depends on an unprocessed source");
    expect(markup).toContain("Process the maintenance note first");
    expect(markup).toContain(
      "earliest unresolved dependency shared by two downstream questions",
    );
    expect(markup).toContain("Other valid next steps");
    expect(markup).toContain(
      "Choosing another branch does not change or dismiss this recommendation.",
    );
    expect(markup).toContain('id="attention-source-depth"');
    expect(markup).toContain("Projection catching up");
    expect(markup).toContain("The authoritative snapshot is current");
  });

  it("maps exact runtime SuggestedAction authority into the frozen Next steps region", () => {
    const markup = render(
      <SuggestedActionPreview
        actionView={suggestedActionView}
        workActionView={suggestedWorkActionView}
        invokedInquiry={inquiryDetailView}
      />,
    );

    expect(markup).toContain("Next steps");
    expect(markup).toContain("Inspect existing inquiry result");
    expect(markup).toContain("Exact existing result available");
    expect(markup).toContain("No new Work or Project authority change");
    expect(markup).toContain("Work not performed");
    expect(markup).toContain(
      suggestedActionView.content.action_ref.suggested_action_id,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.project_definition_ref
        .record_hash,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.snapshot_ref.snapshot_id,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.produced_by_work_ref
        ?.work_unit_id ?? "missing Work fixture",
    );
    expect(markup).toContain('data-contract-name="petra.project-inquiry-view"');
    expect(markup).toContain('data-operation="get_project_inquiry_detail"');
    expect(markup).toContain("This invokes an authenticated exact read");
    expect(markup).toContain("Exact inquiry detail");
    expect(markup).toContain(
      "This GroundedResponse addresses the inquiry with no authority effect",
    );
    expect(markup).toContain("Run exact grounded synthesis");
    expect(markup).toContain("Work starts only after this exact command");
    expect(markup).toContain("InvokeSuggestedAction");
    expect(markup).toContain('data-presentation-path="direct"');
    expect(markup).toContain('data-command-name="InvokeSuggestedAction"');
  });

  it("retains one exact invocation command across uncertain retries", async () => {
    const request = createSuggestedActionInvocationRequest(
      suggestedWorkActionView,
      {
        commandId:
          suggestedActionInvocationView.content.invocation.content.command_ref
            .command_id,
        idempotencyKey: "suggested-action:shared-presentation-attempt",
        submittedAt: "2026-09-11T20:00:00.000Z",
      },
    );
    const retained = { current: undefined };
    const createRequest = vi.fn(() => request);
    const invokedRequests: PetraSuggestedActionInvocationRequest[] = [];
    const invokeAction = vi.fn(
      (
        _projectId: string,
        _suggestedActionId: string,
        invocationRequest: PetraSuggestedActionInvocationRequest,
      ) => {
        invokedRequests.push(invocationRequest);
        return Promise.resolve(suggestedActionInvocationView);
      },
    );
    const published: PetraSuggestedActionInvocationView[] = [];

    await attemptSuggestedActionInvocation(
      suggestedWorkActionView.project_id,
      suggestedWorkActionView,
      retained,
      (invocation) => published.push(invocation),
      { createRequest, invokeAction },
    );
    await attemptSuggestedActionInvocation(
      suggestedWorkActionView.project_id,
      suggestedWorkActionView,
      retained,
      (invocation) => published.push(invocation),
      { createRequest, invokeAction },
    );

    expect(createRequest).toHaveBeenCalledOnce();
    expect(invokeAction).toHaveBeenCalledTimes(2);
    expect(invokedRequests).toEqual([request, request]);
    expect(published).toEqual([
      suggestedActionInvocationView,
      suggestedActionInvocationView,
    ]);
  });

  it("fails closed on a stale action and exposes server prerequisites", () => {
    const stale = structuredClone(suggestedActionView);
    stale.content.readiness = {
      state: "stale",
      reason_code: "result_invalidated",
      reason:
        "The exact GroundedResponse is no longer reusable under current authority.",
      missing_prerequisites: [
        "Regenerate a SuggestedAction from a current reusable result.",
      ],
    };

    const markup = render(<SuggestedActionPreview actionView={stale} />);

    expect(markup).toContain("Stale");
    expect(markup).toContain(
      "Regenerate a SuggestedAction from a current reusable result.",
    );
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain('data-operation="get_project_inquiry_detail"');
  });

  it("maps server-owned stale and unavailable Work readiness without a client substitute", () => {
    const stale = structuredClone(suggestedWorkActionView);
    stale.content.readiness = {
      state: "stale",
      reason_code: "source_result_invalidated",
      reason: "The exact source result is no longer reusable.",
      missing_prerequisites: [
        "Regenerate the action from current Project authority.",
      ],
      regeneration: {
        operation: "regenerate_suggested_action",
        basis: "current_project_authority",
      },
    };
    const unavailable = structuredClone(suggestedWorkActionView);
    unavailable.content.readiness = {
      state: "unavailable",
      reason_code: "capability_grant_missing",
      reason: "No active invocation grant is available.",
      missing_prerequisites: [
        "An administrator must register one exact Project grant.",
      ],
    };

    const staleMarkup = render(
      <SuggestedWorkAction
        projectId={stale.project_id}
        actionView={stale}
        presentationPath="direct"
      />,
    );
    const unavailableMarkup = render(
      <SuggestedWorkAction
        projectId={unavailable.project_id}
        actionView={unavailable}
        presentationPath="conversational"
      />,
    );

    expect(staleMarkup).toContain(
      "The exact source result is no longer reusable",
    );
    expect(staleMarkup).toContain(
      "Regenerate the action from current Project authority",
    );
    expect(staleMarkup).toContain('aria-disabled="true"');
    expect(unavailableMarkup).toContain(
      "No active invocation grant is available",
    );
    expect(unavailableMarkup).toContain('data-state="unavailable"');
    expect(unavailableMarkup).toContain(
      'data-presentation-path="conversational"',
    );
    expect(unavailableMarkup).not.toContain(
      "capability_grant_01K4C000000000000000000062",
    );
  });

  it("preserves exact pending Work, destinations, reconnect, cancellation, and recovery assessments", () => {
    const markup = render(
      <SuggestedActionInvocationResult view={suggestedActionInvocationView} />,
    );

    expect(markup).toContain("Exact invocation");
    expect(markup).toContain(
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id,
    );
    expect(markup).toContain(
      suggestedActionInvocationView.content.work.state ===
        "pending_registration"
        ? suggestedActionInvocationView.content.work.expected_work_unit_id
        : "missing pending Work fixture",
    );
    expect(markup).toContain("Delivery abort cancels Work no");
    expect(markup).toContain("exact interaction replay");
    expect(markup).toContain('data-place-role="work"');
    expect(markup).toContain('data-place-role="history"');
    expect(markup).toContain("target_semantic_key=petra.work-unit");
    expect(markup).toContain(
      `suggested_action_command_id=${suggestedActionInvocationView.content.invocation.content.command_ref.command_id}`,
    );
    expect(markup).toContain('data-operation="retry_exact_start"');
    expect(markup).toContain('data-operation="reconnect_delivery"');
    expect(markup).toContain('data-operation="cancel_work"');
    expect(markup).toContain('data-eligibility="eligible"');
    expect(markup).toContain("Refresh exact state");
    expect(markup).not.toContain("Replay exact response");
    expect(markup).not.toContain("Cancel exact Work");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain(
      'aria-labelledby="suggested-action-invocation-title"',
    );
    expect(markup).toContain("Invocation has no scientific authority effect");
  });

  it("exposes replay in both presentations only from the eligible reconnect_delivery assessment", () => {
    const eligible = structuredClone(suggestedActionInvocationView);
    const reconnect = eligible.content.recovery.actions.find(
      (recovery) => recovery.operation === "reconnect_delivery",
    );
    if (reconnect === undefined) {
      throw new Error("The reconnect recovery assessment is missing.");
    }
    reconnect.eligibility = "eligible";
    reconnect.reason =
      "The exact retained InteractionRun response is eligible for replay.";

    const directMarkup = render(
      <SuggestedWorkAction
        projectId={eligible.project_id}
        actionView={suggestedWorkActionView}
        initialInvocation={eligible}
        presentationPath="direct"
      />,
    );
    const conversationalMarkup = render(
      <SuggestedWorkAction
        projectId={eligible.project_id}
        actionView={suggestedWorkActionView}
        initialInvocation={eligible}
        presentationPath="conversational"
      />,
    );
    const commandBound = structuredClone(eligible);
    const commandBoundReconnect = commandBound.content.recovery.actions.find(
      (recovery) => recovery.operation === "reconnect_delivery",
    );
    if (commandBoundReconnect === undefined) {
      throw new Error("The reconnect recovery assessment is missing.");
    }
    commandBoundReconnect.command_name = "CancelWorkUnit";
    const commandBoundMarkup = render(
      <SuggestedActionInvocationResult
        view={commandBound}
        onReplay={() => undefined}
      />,
    );
    const ineligibleMarkup = render(
      <SuggestedActionInvocationResult
        view={suggestedActionInvocationView}
        onReplay={() => undefined}
      />,
    );
    const unboundMarkup = render(
      <SuggestedActionInvocationResult view={eligible} />,
    );

    for (const markup of [directMarkup, conversationalMarkup]) {
      expect(markup.match(/Replay exact response/g)).toHaveLength(1);
      expect(markup).not.toContain("Start exact Work");
      expect(markup).toContain('data-replay-kind="full-response"');
      expect(markup).toContain('data-after-sequence="0"');
      expect(markup).toContain(
        'aria-describedby="suggested-action-recovery-reconnect_delivery"',
      );
      expect(markup).toContain(
        'id="suggested-action-recovery-reconnect_delivery"',
      );
      expect(markup).toContain("Refresh exact state");
      expect(markup).toContain('data-operation="refresh_exact_state"');
      expect(markup).not.toContain("Resume");
    }
    expect(directMarkup).toContain('data-presentation-path="direct"');
    expect(conversationalMarkup).toContain(
      'data-presentation-path="conversational"',
    );
    expect(commandBoundMarkup).not.toContain("Replay exact response");
    expect(ineligibleMarkup).not.toContain("Replay exact response");
    expect(unboundMarkup).not.toContain("Replay exact response");
  });

  it("retains one replay connection across uncertain retries and publishes only verified SDK state", async () => {
    const request = {
      connectionId: "interaction_connection_01K4C000000000000000000099",
      afterSequence: 0 as const,
    };
    const retained = { current: undefined };
    const createRequest = vi.fn(() => request);
    const publishVerifiedReplay = vi.fn();
    const verifiedInvocation = structuredClone(suggestedActionInvocationView);
    const result = {
      invocation: verifiedInvocation,
      replay: {
        events: [{ type: "RUN_FINISHED", payload: {} }],
        messages: [
          {
            id: "message_suggested_action_replay",
            role: "assistant",
            content: "The exact SDK-derived retained response.",
          },
        ],
        state: {},
        pendingInterrupts: [],
      },
    };
    const replayInteraction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Replay delivery was not confirmed."))
      .mockResolvedValueOnce(result);
    const invocationCommandId =
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id;
    const dependencies = { createRequest, replayInteraction };

    await expect(
      attemptSuggestedActionInteractionReplay(
        suggestedActionInvocationView.project_id,
        invocationCommandId,
        retained,
        publishVerifiedReplay,
        dependencies,
      ),
    ).rejects.toThrow("Replay delivery was not confirmed.");
    expect(retained.current).toBe(request);
    expect(publishVerifiedReplay).not.toHaveBeenCalled();

    await expect(
      attemptSuggestedActionInteractionReplay(
        suggestedActionInvocationView.project_id,
        invocationCommandId,
        retained,
        publishVerifiedReplay,
        dependencies,
      ),
    ).resolves.toBe(result);

    expect(createRequest).toHaveBeenCalledOnce();
    expect(replayInteraction).toHaveBeenCalledTimes(2);
    expect(replayInteraction.mock.calls[0]?.[2]).toBe(request);
    expect(replayInteraction.mock.calls[1]?.[2]).toBe(request);
    expect(request).toEqual({
      connectionId: "interaction_connection_01K4C000000000000000000099",
      afterSequence: 0,
    });
    expect(request).not.toHaveProperty("prompt");
    expect(request).not.toHaveProperty("commandId");
    expect(request).not.toHaveProperty("workUnitId");
    expect(publishVerifiedReplay).toHaveBeenCalledOnce();
    expect(publishVerifiedReplay).toHaveBeenCalledWith(result);
  });

  it("renders only the exact SDK replay messages in an accessible retained-response region", () => {
    const eligible = structuredClone(suggestedActionInvocationView);
    const reconnect = eligible.content.recovery.actions.find(
      (recovery) => recovery.operation === "reconnect_delivery",
    );
    if (reconnect === undefined) {
      throw new Error("The reconnect recovery assessment is missing.");
    }
    reconnect.eligibility = "eligible";
    const replayedResponse = {
      events: [{ type: "RUN_FINISHED", payload: {} }],
      messages: [
        {
          id: "message_suggested_action_replay",
          role: "assistant",
          content:
            "The exact retained response from the authenticated InteractionRun.",
        },
      ],
      state: {},
      pendingInterrupts: [],
    };
    const markup = render(
      <SuggestedActionInvocationResult
        view={eligible}
        replayedResponse={replayedResponse}
        busy="replay"
        onRefresh={() => undefined}
        onReplay={() => undefined}
      />,
    );

    expect(markup).toContain('data-source="petra-interaction-sdk"');
    expect(markup).toContain(
      'aria-labelledby="suggested-action-replayed-response-title"',
    );
    expect(markup).toContain('id="suggested-action-replayed-response-title"');
    expect(markup).toContain(
      'data-message-id="message_suggested_action_replay"',
    );
    expect(markup).toContain('data-message-role="assistant"');
    expect(markup).toContain(
      "The exact retained response from the authenticated InteractionRun.",
    );
    expect(markup).toContain("Replaying exact response…");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain(
      "What does the selected study report, and what limits the claim?",
    );
  });

  it("exposes exact Work cancellation only from the supplied eligible CancelWorkUnit assessment", () => {
    const running = structuredClone(suggestedActionInvocationView);
    const cancellation = running.content.recovery.actions.find(
      (recovery) => recovery.operation === "cancel_work",
    );
    if (cancellation === undefined) {
      throw new Error("The cancellation recovery assessment is missing.");
    }
    cancellation.eligibility = "eligible";
    cancellation.command_name = "CancelWorkUnit";
    cancellation.reason =
      "The exact active Work is eligible for explicit cancellation.";

    const eligibleMarkup = render(
      <SuggestedActionInvocationResult
        view={running}
        onCancel={() => undefined}
      />,
    );
    const commandless = structuredClone(running);
    const commandlessCancellation = commandless.content.recovery.actions.find(
      (recovery) => recovery.operation === "cancel_work",
    );
    if (commandlessCancellation === undefined) {
      throw new Error("The cancellation recovery assessment is missing.");
    }
    delete commandlessCancellation.command_name;
    const commandlessMarkup = render(
      <SuggestedActionInvocationResult
        view={commandless}
        onCancel={() => undefined}
      />,
    );
    const ineligibleMarkup = render(
      <SuggestedActionInvocationResult
        view={suggestedActionInvocationView}
        onCancel={() => undefined}
      />,
    );

    expect(eligibleMarkup).toContain("Cancel exact Work");
    expect(eligibleMarkup).toContain('data-command-name="CancelWorkUnit"');
    expect(eligibleMarkup).toContain(
      'aria-describedby="suggested-action-recovery-cancel_work"',
    );
    expect(eligibleMarkup).toContain(
      'id="suggested-action-recovery-cancel_work"',
    );
    expect(commandlessMarkup).not.toContain("Cancel exact Work");
    expect(ineligibleMarkup).not.toContain("Cancel exact Work");
  });

  it("retains one cancellation request across retries and publishes only the verified reread", async () => {
    const request = {
      commandId: "command_01K4C000000000000000000099",
      reason: "Stop this exact bounded synthesis.",
    };
    const retained = { current: undefined };
    const publishVerifiedInvocation = vi.fn();
    const createRequest = vi.fn(() => request);
    const verifiedCancelled = structuredClone(suggestedActionInvocationView);
    verifiedCancelled.content.operation_state = "cancelled";
    const result = {
      cancellation: {
        applied: true,
        commandId: request.commandId,
        effectId: "work_unit_cancellation_01K4C000000000000000000099",
        runId: verifiedCancelled.content.interaction.protocol_run_id,
        workUnitId:
          verifiedCancelled.content.invocation.content.expected_work_unit_id,
        workUnitRevision: 4,
        workUnitCancellationId:
          "work_unit_cancellation_01K4C000000000000000000099",
        cancellationHash:
          "sha256:2626262626262626262626262626262626262626262626262626262626262626",
      },
      invocation: verifiedCancelled,
    };
    const cancelWork = vi
      .fn()
      .mockRejectedValueOnce(new Error("Cancellation was not confirmed."))
      .mockResolvedValueOnce(result);
    const invocationCommandId =
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id;
    const dependencies = { createRequest, cancelWork };

    await expect(
      attemptSuggestedActionWorkCancellation(
        suggestedActionInvocationView.project_id,
        invocationCommandId,
        retained,
        publishVerifiedInvocation,
        dependencies,
      ),
    ).rejects.toThrow("Cancellation was not confirmed.");
    expect(retained.current).toBe(request);
    expect(publishVerifiedInvocation).not.toHaveBeenCalled();

    await expect(
      attemptSuggestedActionWorkCancellation(
        suggestedActionInvocationView.project_id,
        invocationCommandId,
        retained,
        publishVerifiedInvocation,
        dependencies,
      ),
    ).resolves.toBe(result);

    expect(createRequest).toHaveBeenCalledOnce();
    expect(cancelWork).toHaveBeenCalledTimes(2);
    expect(cancelWork.mock.calls[0]?.[2]).toBe(request);
    expect(cancelWork.mock.calls[1]?.[2]).toBe(request);
    expect(publishVerifiedInvocation).toHaveBeenCalledOnce();
    expect(publishVerifiedInvocation).toHaveBeenCalledWith(verifiedCancelled);
  });

  it("maps terminal result and canonical Work revisions without inventing result bytes", () => {
    const completed = structuredClone(suggestedActionInvocationView);
    const workRef = {
      work_unit_id: "work_unit_01K4C000000000000000000062",
      revision: 3,
      spec_hash:
        "sha256:1616161616161616161616161616161616161616161616161616161616161616",
      record_hash:
        "sha256:1717171717171717171717171717171717171717171717171717171717171717",
    };
    completed.content.operation_state = "completed";
    completed.content.work = {
      state: "available",
      work_unit_ref: workRef,
      input_manifest_ref: {
        record_id: "worker_input_manifest_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:1818181818181818181818181818181818181818181818181818181818181818",
        record_hash:
          "sha256:1919191919191919191919191919191919191919191919191919191919191919",
      },
      execution_state: "completed",
      terminal_outcome: "succeeded",
    };
    completed.content.result = {
      state: "available",
      result_ref:
        suggestedWorkActionView.content.action.basis.source_result_ref,
      authority_effect: "none",
    };
    completed.content.history.work_revisions = [
      {
        work_unit_ref: { ...workRef, revision: 1 },
        state: "requested",
        recorded_at: "2026-09-11T18:40:01.000Z",
      },
      {
        work_unit_ref: workRef,
        state: "completed",
        terminal_outcome: "succeeded",
        recorded_at: "2026-09-11T18:40:04.000Z",
      },
    ];

    const markup = render(<SuggestedActionInvocationResult view={completed} />);

    expect(markup).toContain("Completed");
    expect(markup).toContain("Revision 1 · requested");
    expect(markup).toContain("Revision 3 · completed");
    expect(markup).toContain(
      suggestedWorkActionView.content.action.basis.source_result_ref.record_id,
    );
    expect(markup).toContain("Authority effect none");
    expect(markup).not.toContain(
      "What does the selected study report, and what limits the claim?",
    );
  });

  it("presents cancelled Work and its server-owned recovery posture as retained state", () => {
    const cancelled = structuredClone(suggestedActionInvocationView);
    cancelled.content.operation_state = "cancelled";
    cancelled.content.work = {
      state: "available",
      work_unit_ref: {
        work_unit_id: "work_unit_01K4C000000000000000000062",
        revision: 2,
        spec_hash:
          "sha256:1616161616161616161616161616161616161616161616161616161616161616",
        record_hash:
          "sha256:1717171717171717171717171717171717171717171717171717171717171717",
      },
      input_manifest_ref: {
        record_id: "worker_input_manifest_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:1818181818181818181818181818181818181818181818181818181818181818",
        record_hash:
          "sha256:1919191919191919191919191919191919191919191919191919191919191919",
      },
      execution_state: "cancelled",
      terminal_outcome: "cancelled",
    };
    cancelled.content.result = {
      state: "unavailable",
      reason: "Cancelled Work did not produce a durable GroundedResponse.",
    };
    cancelled.content.recovery.actions = cancelled.content.recovery.actions.map(
      (recovery) =>
        recovery.operation === "cancel_work"
          ? {
              ...recovery,
              eligibility: "ineligible",
              reason: "The Work is already cancelled.",
            }
          : recovery,
    ) as typeof cancelled.content.recovery.actions;

    const markup = render(<SuggestedActionInvocationResult view={cancelled} />);

    expect(markup).toContain("Cancelled");
    expect(markup).toContain(
      "Cancelled Work did not produce a durable GroundedResponse",
    );
    expect(markup).toContain("The Work is already cancelled");
    expect(markup).toContain('data-operation="cancel_work"');
    expect(markup).toContain('data-eligibility="ineligible"');
  });

  it("reflows action facts, recovery, and controls at the frozen narrow breakpoint", () => {
    expect(referenceWorkbenchCss).toContain("@media (max-width: 38rem)");
    expect(referenceWorkbenchCss).toContain(
      ".reference-suggested-action__invocation > dl",
    );
    expect(referenceWorkbenchCss).toContain(
      ".reference-suggested-action__recovery",
    );
    expect(referenceWorkbenchCss).toContain(
      ".reference-suggested-work-action > header",
    );
    expect(referenceWorkbenchCss).toContain(
      ".reference-suggested-action__invocation > header",
    );
    expect(referenceWorkbenchCss).toContain(
      ".reference-suggested-action__replay li p",
    );
    expect(referenceWorkbenchCss).toContain("white-space: pre-wrap");
    expect(referenceWorkbenchCss).toContain("overflow-wrap: anywhere");
  });

  it("separates source identity, extent, rights, and downstream use", () => {
    const markup = render(<SourcesSurface project={inletProject} />);

    expect(markup).toContain("Inlet observation log");
    expect(markup).toContain("Complete for declared scope");
    expect(markup).toContain("Actuator maintenance note");
    expect(markup).toContain("Identity only");
    expect(markup).toContain("Permission status unresolved");
    expect(markup).toContain("Operating threshold table");
    expect(markup).toContain("Partial content");
  });

  it("does not invent source content when only identity is available", () => {
    const source = getReferenceSource(inletProject, "src-maintenance-note");
    if (source === undefined)
      throw new Error("Identity-only source is missing.");

    const markup = render(
      <SourceReaderSurface
        project={inletProject}
        source={source}
        returnTo={{
          path: "/projects/inlet-cycle/brief#attention-source-depth",
          label: "Return to Attention",
        }}
      />,
    );

    expect(markup).toContain("Only identity is available");
    expect(markup).toContain(
      "cannot inspect or cite content until a permitted copy is processed",
    );
    expect(markup).toContain(
      "Processing eligibility and permission are unresolved",
    );
    expect(markup).toContain(
      "/projects/inlet-cycle/brief#attention-source-depth",
    );
    expect(markup).not.toContain("<blockquote>");
  });

  it("provides the exact locator and Details as a semantic peer", () => {
    const source = getReferenceSource(inletProject, "src-observation-log");
    if (source === undefined) throw new Error("Complete source is missing.");

    const markup = render(
      <SourceReaderSurface project={inletProject} source={source} />,
    );

    expect(markup).toContain("Section 4 · entry 21");
    expect(markup).toContain("The closing interval shortened");
    expect(markup).toContain('id="source-details-title"');
    expect(markup).toContain(">Details<");
    expect(markup).toContain(
      "Basis for 3 findings and 1 unresolved comparison",
    );
    expect(markup).toContain("Return to Sources");
  });

  it("keeps the unrelated profile useful when its source collection is empty", () => {
    const project = REFERENCE_PROJECTS.find(({ id }) => id === "north-loop");
    if (project === undefined)
      throw new Error("Decision profile Project is missing.");

    const markup = render(<SourcesSurface project={project} />);

    expect(markup).toContain("No records yet");
    expect(markup).toContain("This early Project has no registered basis");
    expect(markup).toContain("Add Record");
  });
});
