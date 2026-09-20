/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Effect =
  | {
      state: "effect_confirmed";
      receipt: PetraProjectSourceLinkRemovalReceipt;
    }
  | {
      state: "outcome_unknown";
      reason: "receipt_not_observed_at_cutoff";
      retry: {
        method: "POST";
        path: string;
        reuse_exact_request: true;
      };
    }
  | {
      state: "unavailable_to_verify";
      reason:
        | "command_identity_conflict"
        | "command_not_owned_by_authenticated_actor";
    };

/**
 * A read-only reconciliation of one exact ProjectSource link-removal request with explicit unknown-effect and ownership boundaries.
 */
export interface PetraProjectSourceLinkRemovalRecoveryView {
  schema_name: "petra.project-source-link-removal-recovery-view";
  schema_version: "1.0.0";
  assessment_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  subject: Subject;
  effect: Effect;
  return:
    | {
        state: "exact";
        destination: SourceDestination;
      }
    | {
        state: "safe_fallback";
        destination: CollectionDestination;
        reason: string;
      };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Subject {
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
}
/**
 * An immutable receipt proving one exact ExcludeProjectSource effect and the authority retained across Project-link removal.
 */
export interface PetraProjectSourceLinkRemovalReceipt {
  schema_name: "petra.project-source-link-removal-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: HumanActorRef;
  capability_grant_id: string;
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  prior_source_ref: ActiveSourceRef;
  resulting_source_ref: ExcludedSourceRef;
  lifecycle_receipt: PetraProjectSourceLifecycleReceipt;
  effect: Effect1;
  destination: SourceDestination;
  recovery: Recovery1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ProjectRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
}
export interface ActiveSourceRef {
  project_source_id: string;
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
  status: "active";
}
export interface ExcludedSourceRef {
  project_source_id: string;
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
  status: "excluded";
}
/**
 * An immutable receipt for one authorized ProjectSource exclude or restore command, its exact resulting revision, Project event, preservation boundary, and compensating recovery.
 */
export interface PetraProjectSourceLifecycleReceipt {
  schema_name: "petra.project-source-lifecycle-receipt";
  schema_version: "1.0.0";
  project_source_lifecycle_receipt_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ReceiptContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ReceiptContent {
  command_ref: CommandRef;
  prior_source_ref: ExactProjectSourceRef;
  resulting_source_ref: ExactProjectSourceRef;
  event_ref: EventRef;
  preservation: Preservation;
  recovery: Recovery;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "ExcludeProjectSource" | "RestoreProjectSource";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
}
export interface ExactProjectSourceRef {
  project_source_id: string;
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
  status: "active" | "excluded";
}
export interface EventRef {
  event_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  event_type: "project_source.excluded" | "project_source.restored";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Preservation {
  project_source_history: "retained";
  canonical_identity: "retained";
  selected_work_version: "retained";
  artifact_manifest: "retained";
  local_artifact: "retained";
  parsed_representation: "retained";
  provenance: "retained";
}
export interface Recovery {
  recovery_kind: "compensating_status_transition";
  state: "available";
  inverse_command_name: "ExcludeProjectSource" | "RestoreProjectSource";
  expected_source_ref: ExactProjectSourceRef;
  effect: "ordinary_new_use_disabled" | "ordinary_new_use_restored";
}
export interface Effect1 {
  kind: "project_source_link_removed";
  summary: string;
  ordinary_new_project_use: "disabled";
  preservation: Preservation;
  local_copy_deleted: false;
}
export interface SourceDestination {
  place_role: "sources";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
}
export interface Recovery1 {
  command_path: string;
  assessment_path: string;
  inverse_command_name: "RestoreProjectSource";
  retry_reuses_command_identity: true;
  missing_receipt_means_unknown: true;
}
export interface CollectionDestination {
  place_role: "sources";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
}
