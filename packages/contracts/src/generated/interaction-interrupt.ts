/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionInterruptId = string;
export type InteractionRunId = string;
export type InterruptLineage =
  | {
      lineage_kind: "root";
    }
  | {
      lineage_kind: "revision";
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      parent_revision: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      parent_hash: string;
    };
export type InterruptContent =
  PendingInterrupt | RespondedInterrupt | ClosedInterrupt;
export type InterruptKind =
  "clarification" | "review" | "approval" | "correction" | "budget_escalation";
export type InteractionEventRecordId = string;
/**
 * @minItems 1
 * @maxItems 1000
 *
 * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
 */
export type SubjectRefs = [string, ...string[]];

/**
 * A revisioned request for researcher input and its exact linkage to a separate Petra command proposal. An interrupt response never applies authority directly.
 */
export interface PetraInteractionInterrupt {
  schema_name: "petra.interaction-interrupt";
  schema_version: "1.0.0";
  interaction_interrupt_id: InteractionInterruptId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  interaction_run_ref: InteractionRunRef;
  lineage: InterruptLineage;
  content: InterruptContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
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
export interface PendingInterrupt {
  state: "pending";
  interrupt_kind: InterruptKind;
  request_event_ref: EventRecordRef;
  subject_refs: SubjectRefs;
  prompt_artifact_ref: PayloadArtifactRef;
  response_schema_ref: SchemaRef;
  authority_effect: "none";
}
export interface EventRecordRef {
  interaction_event_record_id: InteractionEventRecordId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  sequence: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface SchemaRef {
  schema_name: string;
  schema_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RespondedInterrupt {
  state: "responded";
  interrupt_kind: InterruptKind;
  request_event_ref: EventRecordRef;
  subject_refs: SubjectRefs;
  response_artifact_ref: PayloadArtifactRef;
  responded_by: ActorRef;
  resulting_command_ref: CommandRef;
  authority_effect: "command_input_only";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_hash: string;
}
export interface ClosedInterrupt {
  state: "closed_without_response";
  interrupt_kind: InterruptKind;
  request_event_ref: EventRecordRef;
  subject_refs: SubjectRefs;
  close_reason: "expired" | "withdrawn" | "superseded";
  authority_effect: "none";
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
