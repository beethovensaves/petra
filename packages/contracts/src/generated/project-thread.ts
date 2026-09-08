/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ProjectThreadId = string;
export type RevisionLineage =
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
export type ThreadOrigin =
  | {
      origin_kind: "root";
    }
  | {
      origin_kind: "branch";
      parent_thread_ref: ThreadRevisionRef;
      parent_turn_id: ProjectTurnId;
      continuation_mode:
        "original_snapshot" | "current_snapshot" | "compare_then_continue";
    };
export type ProjectTurnId = string;
export type TurnInput = HashOnlyInput | RetainedInput;

/**
 * A revisioned Project-owned product thread whose immutable material turns bind exact inputs, context, execution, Work, and response records without replacing their authority.
 */
export interface PetraProjectThread {
  schema_name: "petra.project-thread";
  schema_version: "1.0.0";
  project_thread_id: ProjectThreadId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: DefinitionRef;
  lineage: RevisionLineage;
  content: ThreadContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
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
export interface ThreadContent {
  title: string;
  task: string;
  lifecycle: "open" | "archived";
  origin: ThreadOrigin;
  /**
   * @maxItems 1000
   */
  turns: Turn[];
  retention: Retention;
}
export interface ThreadRevisionRef {
  project_thread_id: ProjectThreadId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Turn {
  project_turn_id: ProjectTurnId;
  sequence: number;
  previous_turn_id?: ProjectTurnId;
  project_definition_ref: DefinitionRef;
  objective_ref?: ObjectiveRef;
  input: TurnInput;
  context: ContextBinding;
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
export interface ContextBinding {
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
export interface CompletedResponse {
  state: "completed";
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
export interface Retention {
  state: "retained";
  limitation: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
