/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type LatestTurn =
  | {
      state: "available";
      project_turn_id: string;
      sequence: number;
      snapshot_ref: SnapshotRef;
      force: "explanation_only" | "work_update" | "proposal";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      recorded_at: string;
    }
  | Unavailable
  | {
      state: "available";
      project_turn_id: string;
      sequence: number;
      force: "explanation_only" | "work_update" | "proposal";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      recorded_at: string;
      basis: Basis;
    };
export type Page = {
  returned_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
};

/**
 * A read-only, snapshot-consistent Project thread collection or exact thread detail composed from durable product-thread authority.
 */
export interface PetraProjectThreadViewV11 {
  schema_name: "petra.project-thread-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: CollectionContent | DetailContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface CollectionContent {
  view_kind: "collection";
  project_definition_ref: DefinitionRef;
  query: CollectionQuery;
  /**
   * @maxItems 100
   */
  threads: ThreadSummary[];
  page: Page;
  /**
   * @minItems 1
   * @maxItems 5
   */
  operations:
    | [OperationCapability]
    | [OperationCapability, OperationCapability]
    | [OperationCapability, OperationCapability, OperationCapability]
    | [
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
      ]
    | [
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
      ];
  authority: AuthorityPosition;
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
  definition_family: string;
}
export interface CollectionQuery {
  limit: number;
  cursor?: string;
  lifecycle?: "open" | "archived";
}
export interface ThreadSummary {
  thread_ref: ThreadRef;
  project_definition_ref: DefinitionRef;
  title: string;
  task: string;
  lifecycle: "open" | "archived";
  origin:
    | {
        origin_kind: "root";
      }
    | {
        origin_kind: "branch";
        parent_thread_ref: ThreadRevisionRef;
        parent_turn_id: string;
        continuation_mode:
          "original_snapshot" | "current_snapshot" | "compare_then_continue";
      };
  turn_count: number;
  latest_turn: LatestTurn;
  retention: Retention;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface ThreadRef {
  project_thread_id: string;
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
export interface ThreadRevisionRef {
  project_thread_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface Unavailable {
  state: "unavailable";
  reason: string;
}
export interface Basis {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  project_revision: number;
  definition: {
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
  };
  objective: {
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
  } | null;
  event_position: number;
  stream_revision: number;
}
export interface Retention {
  state: "retained";
  limitation: string;
}
export interface OperationCapability {
  operation: "create" | "append_turn" | "branch" | "archive" | "reopen";
  state: "unavailable";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface DetailContent {
  view_kind: "detail";
  summary: ThreadSummary;
  /**
   * @maxItems 1000
   */
  turns: TurnView[];
  /**
   * @minItems 1
   * @maxItems 5
   */
  operations:
    | [OperationCapability]
    | [OperationCapability, OperationCapability]
    | [OperationCapability, OperationCapability, OperationCapability]
    | [
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
      ]
    | [
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
        OperationCapability,
      ];
  authority: AuthorityPosition;
}
export interface TurnView {
  turn: Turn;
  input_representation: HashOnlyRepresentation | RetainedRepresentation;
  response_representation: Representation;
  work_destination: {
    role: "work";
    work_unit_ref: WorkUnitRef;
  };
}
export interface Turn {
  project_turn_id: string;
  sequence: number;
  previous_turn_id?: string;
  project_definition_ref: DefinitionRef1;
  objective_ref?: ObjectiveRef;
  input: HashOnlyInput | RetainedInput;
  context: SnapshotContextBinding | NativeConversationContextBinding;
  execution: ExecutionBinding;
  authority_context: AuthorityContext;
  response: CompletedResponse;
  compaction: UnmodifiedCompaction | CompactedContext;
  proposal_decision_linkage: UnavailablePolicy;
  presentation_context: UnavailablePolicy;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface DefinitionRef1 {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
}
export interface HashOnlyInput {
  retention_state: "hash_only";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  input_hash: string;
  source_message_id: string;
  limitation: string;
}
export interface RetainedInput {
  retention_state: "retained_artifact";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  input_hash: string;
  source_message_id: string;
  artifact_ref: ExactArtifactRef;
}
export interface ExactArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface SnapshotContextBinding {
  context_record_ref: ExactTypedRecordRef;
  snapshot_ref: SnapshotRef;
  included_object_count: number;
  omission_count: number;
  coverage_state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  coverage_statement: string;
}
export interface ExactTypedRecordRef {
  schema_name: string;
  schema_version: string;
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
}
export interface NativeConversationContextBinding {
  context_record_ref: ExactTypedRecordRef;
  basis: Basis;
  included_object_count: number;
  /**
   * Unknown when the original bounded native context records limitations without an exhaustive machine-counted omission inventory.
   */
  omission_count: number | null;
  coverage_state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  coverage_statement: string;
}
export interface ExecutionBinding {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef;
}
export interface InteractionRunRef {
  interaction_run_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
}
export interface AuthorityContext {
  actor: ActorRef;
  capability_grant_id: string;
  privacy_profile_ref: VersionedControlRef;
  budget_profile_ref: VersionedControlRef;
  review_policy: UnavailablePolicy;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface VersionedControlRef {
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
}
export interface UnavailablePolicy {
  state: "unavailable";
  reason: string;
}
/**
 * A retained terminal conversational result. The result owner preserves its exact native meaning; completed denotes successful delivery, not domain warrant or approved authority.
 */
export interface CompletedResponse {
  state: "completed" | "failed" | "cancelled";
  result_record_ref: ExactTypedRecordRef;
  response_artifact_ref: ExactArtifactRef;
  force: "explanation_only" | "work_update" | "proposal";
  authority_effect: "none";
}
export interface UnmodifiedCompaction {
  state: "unmodified";
}
export interface CompactedContext {
  state: "compacted";
  summary_artifact_ref: ExactArtifactRef;
  covered_through_sequence: number;
  method_ref: ExactTypedRecordRef;
}
export interface HashOnlyRepresentation {
  state: "hash_only";
  reason: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  input_hash: string;
}
export interface RetainedRepresentation {
  state: "metadata_only";
  reason: string;
  artifact_ref: ExactArtifactRef1;
}
export interface ExactArtifactRef1 {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface Representation {
  state: "metadata_only";
  reason: string;
  artifact_ref: ExactArtifactRef1;
}
