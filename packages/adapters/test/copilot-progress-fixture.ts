import { readFileSync } from "node:fs";
import { copilotHash } from "@petra/core";
import type {
  CopilotTurn,
  CopilotRequest,
  ConversationOwnerBinding,
} from "@petra/core";
export function setup() {
  const turn = JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/copilot-turn.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as CopilotTurn;
  const request: CopilotRequest = {
    schema_name: "petra.copilot-request",
    schema_version: "1.0.0",
    project_id: turn.project_id,
    context_hash: turn.context.content_hash,
    parent_run_id: null,
    focus_keys: turn.focus_keys,
  };
  const input = {
    threadId: turn.thread_id,
    runId: turn.run_id,
    question: turn.question,
    request,
  };
  turn.request_hash = copilotHash(input);
  turn.terminal = {
    state: "completed",
    finished_at: turn.started_at,
    model: "controlled-sdk-port",
    provider_thread_id: "retained-thread",
    provider_turn_id: "retained-turn",
    output: {
      schema_name: "petra.copilot-output",
      schema_version: "1.0.0",
      authority: "advisory_only",
      blocks: [
        {
          kind: "advice",
          text: "First retained advisory block.",
          citations: [],
        },
        { kind: "question", text: "Second retained question?", citations: [] },
      ],
      focus_keys: [],
    },
  };
  const owner: ConversationOwnerBinding = {
    project_id: turn.project_id,
    actor_id: turn.actor_id,
    protocol_thread_id: turn.thread_id,
    protocol_run_id: turn.run_id,
    work_unit_ref: {
      work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      revision: 5,
      spec_hash: `sha256:${"1".repeat(64)}`,
    },
    project_thread_ref: {
      project_thread_id: "project_thread_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      revision: 2,
      content_hash: copilotHash(turn),
    },
    project_turn_id: "project_turn_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    interaction_run_ref: {
      interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      revision: 3,
      content_hash: copilotHash(turn),
    },
    turn_content_hash: copilotHash(turn),
    lineage: { inquiries: [], work: [], reviews: [], cycles: [] },
    capture: "native",
  };
  return { turn, input, owner };
}
