/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionEventRecordId = string;
export type InteractionRunId = string;
export type EventLineage =
  | {
      lineage_kind: "start";
    }
  | {
      lineage_kind: "continuation";
      previous_event_record_id: InteractionEventRecordId;
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      previous_sequence: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      previous_content_hash: string;
    };
export type ProtocolEvent = StandardProtocolEvent | CustomProtocolEvent;
export type OpaqueProtocolId = string;
export type AuthorityEffect =
  | {
      effect_kind: "none";
    }
  | {
      effect_kind: "command_proposed" | "command_result_observed";
      command_ref: CommandRef;
    };

/**
 * An immutable, hash-chained presentation-event record for one interaction run. Protocol payload bytes remain content-addressed and any domain effect is only an explicit reference to a separate Petra command.
 */
export interface PetraInteractionEventRecord {
  schema_name: "petra.interaction-event-record";
  schema_version: "1.0.0";
  interaction_event_record_id: InteractionEventRecordId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  interaction_run_ref: InteractionRunRef;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  sequence: number;
  lineage: EventLineage;
  content: EventContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface InteractionRunRef {
  interaction_run_id: InteractionRunId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EventContent {
  protocol: ProtocolEvent;
  semantic_kind:
    | "run_lifecycle"
    | "assistant_text"
    | "activity"
    | "tool_proposal"
    | "state_projection"
    | "interrupt"
    | "error"
    | "custom";
  payload_artifact_ref: PayloadArtifactRef;
  visibility: Visibility;
  authority_effect: AuthorityEffect;
}
export interface StandardProtocolEvent {
  protocol: "ag-ui";
  event_type:
    | "RUN_STARTED"
    | "RUN_FINISHED"
    | "RUN_ERROR"
    | "TEXT_MESSAGE_START"
    | "TEXT_MESSAGE_CONTENT"
    | "TEXT_MESSAGE_END"
    | "TOOL_CALL_START"
    | "TOOL_CALL_ARGS"
    | "TOOL_CALL_END"
    | "STATE_SNAPSHOT"
    | "STATE_DELTA"
    | "ACTIVITY_SNAPSHOT"
    | "ACTIVITY_DELTA";
  protocol_event_id?: OpaqueProtocolId;
}
export interface CustomProtocolEvent {
  protocol: "ag-ui";
  event_type: "CUSTOM";
  protocol_event_id?: OpaqueProtocolId;
  custom_event: {
    event_name: string;
    schema_name: "interaction-custom-event";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    schema_hash: string;
  };
}
export interface PayloadArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_sha256: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface Visibility {
  audience: "researcher" | "project" | "private_system";
  redaction: "none" | "metadata_only" | "payload_withheld";
  reason?: string;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_hash: string;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
