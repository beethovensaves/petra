import type { PetraProjectModelReadinessView } from "@petra/contracts";
import type { PetraInteractionResult } from "@petra/adapters/ag-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  PetraModelInteraction,
  projectModelResultPresentation,
  projectModelRunStorageKey,
  readProjectModelRunIdentity,
} from "./PetraModelInteraction.js";
import { createProjectModelRunIdentity } from "./project-data.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

const readyReadiness = (): PetraProjectModelReadinessView => {
  const definition = {
    project_definition_id: "project_definition_01K4C000000000000000000001",
    revision: 3,
    content_hash:
      "sha256:2f184efe9610fc19e8e42e7e9a1a8765b47999929a6331fb0cf5bb0bd50c366c",
    record_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    definition_family: "petra.scientific-evidence",
  };
  const objective = {
    objective_id: "objective_01K4C000000000000000000005",
    revision: 3,
    content_hash:
      "sha256:335ccee3cdd67d50a07b0e3acef369fb57ee6b2d83b0397a4bdddd48b97358f7",
    record_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  };
  const certification = {
    role_certification_id: "role_certification_2QNNWEG32XSDY4HWQW209N9T86",
    revision: 1,
    content_hash:
      "sha256:129da2f34cb87fef177783726a730b0f263a7c9c41ea8b8dbd634a259f240c45",
  };
  const binding = {
    project_id: projectId,
    project_revision: 1,
    project_definition_ref: definition,
    objective_ref: objective,
    snapshot_ref: {
      snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
      snapshot_revision: 1,
      event_position: 3,
      content_hash:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
    context_packet_ref: {
      record_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
      revision: 1,
      content_hash:
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    },
    evidence_packet_ref: {
      record_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
      revision: 1,
      content_hash:
        "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    },
    role_certification_ref: certification,
  };
  return {
    schema_name: "petra.project-model-readiness-view",
    schema_version: "1.0.0",
    project_id: projectId,
    project_revision: 1,
    project_definition_ref: definition,
    objective_ref: objective,
    readiness: {
      state: "ready",
      role: {
        state: "selected",
        semantic_key: "scientific.grounded-synthesist",
        label: "Grounded synthesist",
        meaning: "A certified advisory role bound to exact Project context.",
        certification_ref: certification,
        deployment: {
          model_deployment_id: "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
          provider_kind: "codex_app_server",
          provider_model: "gpt-5.6-terra",
          execution_location: "remote",
        },
        authority_effect: "none",
      },
      provider: {
        state: "ready",
        provider_kind: "codex_app_server",
        auth_state: "authenticated",
        auth_mode: "chatgpt",
        model: "gpt-5.6-terra",
        message: "The certified model is available.",
      },
      context: { state: "bound", binding },
      command: {
        state: "ready",
        method: "POST",
        endpoint: "/api/interactions/run",
        workflow: "grounded_synthesis",
        prompt_policy: "exact_registered_prompt",
        registered_prompt:
          "What does the selected evidence support, and what remains unresolved?",
        request_context: binding,
        delivery: "streaming_and_replay",
        authority_effect: "none",
      },
    },
    limitations: [
      "The response is advisory and cannot apply a Project change.",
    ],
    read_at: "2026-09-19T05:30:00.000Z",
  };
};

const unavailableReadiness = (): PetraProjectModelReadinessView => {
  const value = readyReadiness();
  return {
    ...value,
    readiness: {
      state: "unavailable",
      reason: "role_unavailable",
      role: {
        state: "unavailable",
        reason: "role_not_registered",
        message: "This profile registers no certified model role.",
      },
      provider: {
        state: "unavailable",
        provider_kind: "codex_app_server",
        message: "No provider will be selected for an unregistered role.",
      },
      context: {
        state: "unavailable",
        reason: "profile_context_unsupported",
        message: "This profile has no certified model context compiler.",
      },
      command: {
        state: "unavailable",
        reason: "role_unavailable",
        message: "No prompt will be submitted.",
      },
    },
  };
};

const render = (readiness: PetraProjectModelReadinessView): string =>
  renderToStaticMarkup(
    <MemoryRouter>
      <PetraModelInteraction
        projectId={projectId}
        readiness={readiness}
        returnContext={{
          path: `/projects/${projectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2#work-control-boundary`,
          label: "Work task",
        }}
      />
    </MemoryRouter>,
  );

describe("production Petra certified-model interaction", () => {
  it("shows the server-selected role, exact prompt, limits, and task return", () => {
    const markup = render(readyReadiness());

    expect(markup).toContain("Grounded synthesist");
    expect(markup).toContain("The certified model is available");
    expect(markup).toContain("gpt-5.6-terra");
    expect(markup).toContain("What does the selected evidence support");
    expect(markup).toContain("No authority effect");
    expect(markup).toContain("Ask Petra");
    expect(markup).toContain("Return to Work task");
    expect(markup).toContain("#work-control-boundary");
    expect(markup).not.toContain('aria-disabled="true"');
  });

  it("preserves the server-owned unsupported profile state without fallback", () => {
    const markup = render(unavailableReadiness());

    expect(markup).toContain("Unavailable for this Project");
    expect(markup).toContain("This profile registers no certified model role");
    expect(markup).toContain("no certified model context compiler");
    expect(markup).toContain("No prompt will be submitted");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("Grounded synthesist");
  });

  it("presents exact terminal identity, basis, Work, Review, and progress", () => {
    const result: PetraInteractionResult = {
      events: [
        {
          type: "ACTIVITY_SNAPSHOT",
          payload: {
            content: {
              label: "Evidence references and epistemic origins validated",
              status: "completed",
              stage: "validation",
            },
          },
        },
        {
          type: "RUN_FINISHED",
          payload: {
            result: {
              authorityEffect: "none",
              executionSource: "provider",
              statementOrigins: [
                "source_report",
                "petra_synthesis",
                "unresolved_inference",
              ],
              contextPacketRef: {
                context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
              },
              evidencePacketRef: {
                evidence_packet_id:
                  "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
              },
              snapshotId: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
              modelDeploymentId: "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
              roleCertificationId:
                "role_certification_2QNNWEG32XSDY4HWQW209N9T86",
              coverage: {
                state: "complete_for_context",
                statement: "Every selected context object is accounted for.",
              },
              terminalBinding: {
                grounded_response_id:
                  "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FCM",
                work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
              },
            },
          },
        },
      ],
      messages: [
        {
          id: "message_grounded",
          role: "assistant",
          content: "What the source reports\n\nThe exact grounded answer.",
        },
      ],
      state: {},
      pendingInterrupts: [],
    };

    expect(projectModelResultPresentation(result)).toEqual(
      expect.objectContaining({
        state: "completed",
        answer: "What the source reports\n\nThe exact grounded answer.",
        executionSource: "Provider",
        contextPacketId: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
        evidencePacketId: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
        groundedResponseId: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FCM",
        workUnitId: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        origins: ["source_report", "petra_synthesis", "unresolved_inference"],
        reviewInterrupts: 0,
      }),
    );
  });

  it("keeps provider failure distinct from uncertain delivery", () => {
    const failed = projectModelResultPresentation({
      events: [
        {
          type: "RUN_ERROR",
          payload: {
            code: "GROUNDED_SYNTHESIS_FAILED",
            message: "The certified provider is unavailable.",
          },
        },
      ],
      messages: [],
      state: {},
      pendingInterrupts: [],
    });
    const disconnected = projectModelResultPresentation({
      events: [{ type: "RUN_STARTED", payload: {} }],
      messages: [],
      state: {},
      pendingInterrupts: [],
    });

    expect(failed).toMatchObject({
      state: "failed",
      message: "The certified provider is unavailable.",
    });
    expect(disconnected.state).toBe("disconnected");
    expect(disconnected.message).toContain("reconnected and replayed");
  });

  it("keeps a durable Review pause distinct from a delivery disconnect", () => {
    const pending = projectModelResultPresentation({
      events: [
        {
          type: "RUN_FINISHED",
          payload: { outcome: { type: "interrupt", interrupts: [] } },
        },
      ],
      messages: [],
      state: {},
      pendingInterrupts: [
        {
          id: "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FD8",
          reason: "changeset_review",
          message: "Review the exact proposed ChangeSet.",
        },
      ],
    });

    expect(pending).toMatchObject({
      state: "awaiting_response",
      reviewInterrupts: 1,
    });
    expect(pending.message).toContain("durably paused");
    expect(pending.message).toContain("No Review or Work authority changed");
  });

  it("retains only canonical browser-owned run identities", () => {
    const identity = createProjectModelRunIdentity();
    const storage = {
      getItem: (key: string): string | null =>
        key === projectModelRunStorageKey(projectId)
          ? JSON.stringify(identity)
          : null,
    };

    expect(identity.threadId).toMatch(/^thread_[0-9A-HJKMNP-TV-Z]{26}$/u);
    expect(identity.runId).toMatch(/^run_[0-9A-HJKMNP-TV-Z]{26}$/u);
    expect(identity.connectionId).toMatch(
      /^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
    expect(readProjectModelRunIdentity(projectId, storage)).toEqual(identity);
    expect(
      readProjectModelRunIdentity(projectId, {
        getItem: () =>
          JSON.stringify({ ...identity, connectionId: "invented" }),
      }),
    ).toBeUndefined();
  });
});
