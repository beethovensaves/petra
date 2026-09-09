/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
