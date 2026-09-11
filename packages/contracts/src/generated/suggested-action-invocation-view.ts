/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A current read over one immutable SuggestedAction invocation and its canonical WorkUnit, result, InteractionRun, revision history, semantic destinations, and eligible recovery operations.
 */
export interface PetraSuggestedActionInvocationView {
  schema_name: "petra.suggested-action-invocation-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  view_kind: "invocation";
  invocation_ref: InvocationRef;
  invocation: PetraSuggestedActionInvocation;
  operation_state:
    "accepted" | "running" | "completed" | "cancelled" | "failed";
  work:
    | {
        state: "pending_registration";
        expected_work_unit_id: string;
      }
    | {
        state: "available";
        work_unit_ref: WorkUnitRef;
        input_manifest_ref: RecordRef;
        execution_state:
          | "requested"
          | "queued"
          | "running"
          | "checkpointed"
          | "completed"
          | "cancelled";
        terminal_outcome?:
          | "succeeded"
          | "worker_failed"
          | "validation_failed"
          | "resource_exhausted"
          | "timed_out"
          | "cancelled";
      };
  result:
    | {
        state: "pending";
        reason: string;
      }
    | {
        state: "available";
        result_ref: TypedRecordRef;
        authority_effect: "none";
      }
    | {
        state: "unavailable";
        reason: string;
      };
  interaction: {
    protocol_thread_id: string;
    protocol_run_id: string;
    durable_state: "pending_terminal" | "available";
    interaction_run_ref?: RecordRef;
  };
  interrupt: {
    state: "none_expected";
    delivery_abort_cancels_work: false;
    reconnect: "exact_interaction_replay";
  };
  history: {
    source: "canonical_command_receipt_and_work_unit_revisions";
    command_receipt_ref: InvocationRef;
    /**
     * @maxItems 100
     */
    work_revisions: HistoryEntry[];
    /**
     * @minItems 2
     * @maxItems 2
     */
    destinations: [
      {
        place_role: "work" | "history";
        task_intent: "continue_work" | "view_history";
        object_ref: {
          semantic_key: "petra.work-unit";
          object_id: string;
        };
      },
      {
        place_role: "work" | "history";
        task_intent: "continue_work" | "view_history";
        object_ref: {
          semantic_key: "petra.work-unit";
          object_id: string;
        };
      },
    ];
  };
  recovery: {
    assessment: "current_server_owned";
    /**
     * @minItems 5
     * @maxItems 5
     */
    actions: [
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
    ];
  };
  authority: AuthorityPosition;
  /**
   * @minItems 1
   * @maxItems 16
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface InvocationRef {
  suggested_action_invocation_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
/**
 * An immutable receipt for one actor-authorized SuggestedAction command accepted against exact action inputs and deterministically bound to one WorkUnit and interaction correlation.
 */
export interface PetraSuggestedActionInvocation {
  schema_name: "petra.suggested-action-invocation";
  schema_version: "1.0.0";
  suggested_action_invocation_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: InvocationContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface InvocationContent {
  command_ref: CommandRef;
  action_ref: SuggestedActionRef;
  response_depth: "current_graph";
  exact_inputs: ExactInputs;
  expected_work_unit_id: string;
  interaction: InteractionCorrelation;
  path_convergence: "direct_and_conversational_same_command";
  authority_effect: "none";
}
export interface CommandRef {
  command_id: string;
  command_name: "InvokeSuggestedAction";
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  capability_grant_id: string;
  actor: ActorRef;
  correlation_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExactInputs {
  project_definition_ref: DefinitionRef;
  objective_ref: ObjectiveRef;
  inquiry_result_link_ref: InquiryLinkRef;
  source_result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  context_packet_ref: PacketRef;
  evidence_packet_ref: PacketRef;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  prompt_hash: string;
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface ObjectiveRef {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface PacketRef {
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface InteractionCorrelation {
  protocol_thread_id: string;
  protocol_run_id: string;
}
export interface WorkUnitRef {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface RecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HistoryEntry {
  work_unit_ref: WorkUnitRef;
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface RecoveryAction {
  operation:
    | "retry_exact_start"
    | "reconnect_delivery"
    | "cancel_work"
    | "inspect_work"
    | "inspect_result";
  eligibility: "eligible" | "ineligible";
  command_name?: "InvokeSuggestedAction" | "CancelWorkUnit";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
