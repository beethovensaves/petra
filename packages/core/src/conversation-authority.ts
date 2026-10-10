import { derivePetraId } from "./identity.js";
import type {
  PetraInteractionRun,
  PetraConversationResult,
  PetraProjectThreadV11,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  type CopilotTurn,
  type CopilotTerminal,
} from "./project-copilot.js";

const conversationContracts = new PetraContractRegistry();

export type ExactConversationRecordRef = {
  schema_name: string;
  schema_version: string;
  record_id: string;
  revision: number;
  record_hash: string;
};
export interface ConversationOwnerBinding {
  project_id: string;
  actor_id: string;
  protocol_thread_id: string;
  protocol_run_id: string;
  project_thread_ref: {
    project_thread_id: string;
    revision: number;
    content_hash: string;
  };
  project_turn_id: string;
  interaction_run_ref: {
    interaction_run_id: string;
    revision: number;
    content_hash: string;
  };
  work_unit_ref: { work_unit_id: string; revision: number; spec_hash: string };
  turn_content_hash: string;
  lineage: {
    inquiries: readonly ExactConversationRecordRef[];
    work: readonly ExactConversationRecordRef[];
    reviews: readonly ExactConversationRecordRef[];
    cycles: readonly ExactConversationRecordRef[];
  };
  capture: "native" | "historical_adoption";
}
export interface ConversationOwnerRecords {
  thread: PetraProjectThreadV11;
  run: PetraInteractionRun;
  work: PetraWorkUnit;
  lineage: readonly {
    ref: ExactConversationRecordRef;
    project_id: string;
    record_id: string;
    revision: number;
    payload: unknown;
  }[];
}
export interface ConversationAuthorityReader {
  readConversationOwners(
    projectId: string,
    actorId: string,
    runId: string,
  ): Promise<
    | { binding: ConversationOwnerBinding; records: ConversationOwnerRecords }
    | undefined
  >;
}
/** All references are checked before a caller can release any retained text. */
export function assertConversationOwnerBinding(
  turn: CopilotTurn,
  binding: ConversationOwnerBinding,
  records: ConversationOwnerRecords,
  contracts = conversationContracts,
): void {
  const deny = (valid: boolean, message: string): void => {
    if (!valid)
      throw new CopilotBoundaryError("CONVERSATION_OWNER_MISMATCH", message);
  };
  contracts.assertValid(
    "project-thread",
    records.thread.schema_version,
    records.thread,
  );
  contracts.assertValid("interaction-run", "1.0.0", records.run);
  contracts.assertValid("work-unit", "1.0.0", records.work);
  deny(
    binding.project_id === turn.project_id &&
      binding.actor_id === turn.actor_id &&
      binding.protocol_thread_id === turn.thread_id &&
      binding.protocol_run_id === turn.run_id,
    "The retained conversation binding does not belong to its exact actor, Project and protocol identity.",
  );
  deny(
    turn.context.project_id === turn.project_id,
    "The retained context cannot cross its Project owner.",
  );
  const {
    terminal: ignoredTerminal,
    input_manifest: ignoredManifest,
    ...content
  } = turn;
  void ignoredTerminal;
  void ignoredManifest;
  deny(
    binding.turn_content_hash === copilotHash(content),
    "The retained question and original context do not match their immutable owner binding.",
  );
  const { thread, run, work } = records;
  deny(
    thread.project_id === turn.project_id &&
      thread.created_by.actor_id === turn.actor_id &&
      thread.project_thread_id ===
        binding.project_thread_ref.project_thread_id &&
      thread.revision === binding.project_thread_ref.revision &&
      thread.content_hash === binding.project_thread_ref.content_hash &&
      copilotHash(thread.content) === thread.content_hash,
    "The exact canonical ProjectThread does not resolve for this conversation.",
  );
  deny(
    run.project_id === turn.project_id &&
      run.interaction_run_id ===
        binding.interaction_run_ref.interaction_run_id &&
      run.revision === binding.interaction_run_ref.revision &&
      run.content_hash === binding.interaction_run_ref.content_hash &&
      copilotHash(run.content) === run.content_hash &&
      run.content.correlation.protocol_thread_id === turn.thread_id &&
      run.content.correlation.protocol_run_id === turn.run_id &&
      run.content.authority_context.actor.actor_id === turn.actor_id &&
      run.content.authority_context.actor.actor_kind === "human" &&
      run.content.input.input_hash === binding.turn_content_hash &&
      run.content.input.source_message_id === turn.run_id,
    "The exact canonical InteractionRun does not resolve for this conversation.",
  );
  deny(
    work.project_id === turn.project_id &&
      work.work_unit_id === binding.work_unit_ref.work_unit_id &&
      work.revision === binding.work_unit_ref.revision &&
      work.spec_hash === binding.work_unit_ref.spec_hash &&
      copilotHash(work.spec) === work.spec_hash,
    "The exact canonical WorkUnit does not resolve for this conversation.",
  );
  deny(
    run.content.correlation.work_unit_ref.work_unit_id === work.work_unit_id &&
      run.content.correlation.work_unit_ref.spec_hash === work.spec_hash &&
      run.content.correlation.work_unit_ref.revision <= work.revision &&
      run.content.authority_context.capability_grant_id ===
        work.capability_grant_id,
    "The run and Work must preserve one exact execution and capability chain.",
  );
  const material = thread.content.turns.find(
    (item) => item.project_turn_id === binding.project_turn_id,
  );
  if (turn.terminal === undefined) {
    deny(
      (run.content.lifecycle.state === "running" ||
        run.content.lifecycle.state === "queued") &&
        (work.status.state === "running" || work.status.state === "queued") &&
        material === undefined,
      "An unanswered conversation cannot hide a terminal owner or invent a completed material turn.",
    );
  }
  if (turn.terminal !== undefined) {
    deny(
      material !== undefined,
      "A terminal conversation must resolve to its retained canonical material turn.",
    );
    deny(
      material!.input.input_hash === binding.turn_content_hash &&
        material!.input.source_message_id === turn.run_id &&
        material!.input.retention_state === "retained_artifact" &&
        material!.input.artifact_ref.content_hash ===
          binding.turn_content_hash &&
        material!.response.response_artifact_ref.content_hash ===
          material!.response.result_record_ref.content_hash &&
        material!.project_definition_ref.project_definition_id ===
          turn.context.basis.definition.record_id &&
        material!.project_definition_ref.revision ===
          turn.context.basis.definition.revision &&
        material!.project_definition_ref.content_hash ===
          turn.context.basis.definition.content_hash &&
        material!.project_definition_ref.definition_family ===
          turn.context.definition_family &&
        "basis" in material!.context &&
        copilotHash(material!.context.basis) ===
          copilotHash(turn.context.basis) &&
        material!.context.context_record_ref.content_hash ===
          turn.context.content_hash &&
        material!.context.context_record_ref.schema_name ===
          "petra.copilot-context" &&
        material!.context.context_record_ref.schema_version === "1.0.0" &&
        material!.context.context_record_ref.record_id ===
          derivePetraId(
            "copilot_context",
            `${turn.run_id}:${turn.context.content_hash}`,
          ) &&
        material!.response.result_record_ref.schema_name ===
          "petra.conversation-result" &&
        material!.response.result_record_ref.schema_version === "1.0.0" &&
        material!.response.result_record_ref.record_id ===
          derivePetraId("conversation_result", turn.run_id) &&
        copilotHash(material!.authority_context.privacy_profile_ref) ===
          copilotHash(run.content.authority_context.privacy_profile_ref) &&
        copilotHash(material!.authority_context.budget_profile_ref) ===
          copilotHash(run.content.authority_context.budget_profile_ref) &&
        material!.response.state === turn.terminal.state &&
        material!.response.result_record_ref.content_hash ===
          copilotHash(conversationResultRecord(turn, turn.terminal)) &&
        material!.authority_context.actor.actor_id === turn.actor_id &&
        material!.authority_context.actor.actor_kind === "human" &&
        material!.authority_context.capability_grant_id ===
          work.capability_grant_id,
      "The material turn must preserve the exact question, native basis, result and authority boundary.",
    );
    deny(
      material!.execution.interaction_run_ref.interaction_run_id ===
        run.interaction_run_id &&
        material!.execution.interaction_run_ref.revision === run.revision &&
        material!.execution.interaction_run_ref.content_hash ===
          run.content_hash &&
        material!.execution.work_unit_ref.work_unit_id === work.work_unit_id &&
        material!.execution.work_unit_ref.revision === work.revision &&
        material!.execution.work_unit_ref.spec_hash === work.spec_hash,
      "A terminal material turn must bind its exact observed run and Work revisions.",
    );
    if (binding.capture === "historical_adoption")
      deny(
        run.content.lifecycle.state === "completed" &&
          run.content.lifecycle.outcome_code === "HISTORICAL_CONTENT_ADOPTED" &&
          work.spec.workflow_name === "petra.copilot.adopt-history" &&
          work.status.state === "completed" &&
          work.status.terminal_outcome === "succeeded",
        "Historical conversation ownership must resolve to actual retention-import Work, not reconstructed model execution.",
      );
    if (binding.capture === "native") {
      deny(
        run.content.lifecycle.state === turn.terminal.state,
        "A conversation cannot relabel the canonical run's terminal outcome.",
      );
      const outcomeMatches =
        turn.terminal.state === "cancelled"
          ? work.status.state === "cancelled"
          : work.status.state === "completed" &&
            (turn.terminal.state === "completed"
              ? work.status.terminal_outcome === "succeeded"
              : [
                  "worker_failed",
                  "validation_failed",
                  "timed_out",
                  "resource_exhausted",
                ].includes(work.status.terminal_outcome));
      deny(
        outcomeMatches,
        "A retained conversation outcome must match its actual terminal Work outcome.",
      );
    }
  }
  for (const reference of [
    ...binding.lineage.inquiries,
    ...binding.lineage.work,
    ...binding.lineage.reviews,
    ...binding.lineage.cycles,
  ]) {
    const owned = records.lineage.find(
      (record) => copilotHash(record.ref) === copilotHash(reference),
    );
    deny(
      owned !== undefined &&
        owned.project_id === turn.project_id &&
        owned.record_id === reference.record_id &&
        owned.revision === reference.revision &&
        copilotHash(owned.payload) === reference.record_hash,
      "A conversation's inquiry, Work, Review and cycle lineage must resolve to exact same-Project owned records.",
    );
    contracts.assertValid(
      reference.schema_name.replace(/^petra\./u, ""),
      reference.schema_version,
      owned!.payload,
    );
  }
}

export function conversationResultRecord(
  turn: CopilotTurn,
  terminal: CopilotTerminal,
): PetraConversationResult {
  const {
    terminal: ignoredTerminal,
    input_manifest: ignoredManifest,
    ...content
  } = turn;
  void ignoredTerminal;
  void ignoredManifest;
  const result: PetraConversationResult = {
    schema_name: "petra.conversation-result",
    schema_version: "1.0.0",
    conversation_result_id: derivePetraId("conversation_result", turn.run_id),
    revision: 1,
    project_id: turn.project_id,
    actor_id: turn.actor_id,
    protocol_thread_id: turn.thread_id,
    protocol_run_id: turn.run_id,
    turn_content_hash: copilotHash(content),
    terminal,
  };
  conversationContracts.assertValid("conversation-result", "1.0.0", result);
  return result;
}

export interface ConversationHistoryRequest {
  readonly thread_id: string;
  readonly limit?: number;
  readonly cursor?: string;
}
export interface ConversationHistoryPage {
  readonly entries: readonly {
    readonly turn: CopilotTurn;
    readonly owners: ConversationOwnerBinding;
  }[];
  readonly page: {
    readonly returned_count: number;
    readonly has_more: boolean;
    readonly next_cursor?: string;
    readonly anchor_sequence: number;
    readonly byte_limit: number;
  };
}
export interface ConversationHistoryReader {
  listPage(
    projectId: string,
    actorId: string,
    request: ConversationHistoryRequest,
  ): Promise<ConversationHistoryPage>;
}
