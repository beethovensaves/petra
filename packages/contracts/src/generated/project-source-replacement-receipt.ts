/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ReceiptContent = CreateReceiptContent | RetractionReceiptContent;

/**
 * An immutable receipt for one authorized ProjectSource replacement creation or command-granular retraction, its exact event, preservation boundary, and recovery disposition.
 */
export interface PetraProjectSourceReplacementReceipt {
  schema_name: "petra.project-source-replacement-receipt";
  schema_version: "1.0.0";
  project_source_replacement_receipt_id: string;
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
export interface CreateReceiptContent {
  command_ref: CommandRef & {
    command_name?: "CreateProjectSourceReplacement";
    [k: string]: unknown;
  };
  event_ref: EventRef & {
    event_type?: "project_source.replacement_created";
    [k: string]: unknown;
  };
  result: CreatedResult;
  preservation: Preservation;
  recovery: CreateRecovery;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name:
    "CreateProjectSourceReplacement" | "RetractProjectSourceReplacement";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
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
  event_type:
    | "project_source.replacement_created"
    | "project_source.replacement_retracted";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface CreatedResult {
  effect: "replacement_activated";
  replacement_ref: ExactReplacementRef & {
    state?: "active";
    [k: string]: unknown;
  };
}
export interface ExactReplacementRef {
  project_source_replacement_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  state: "active" | "retracted";
}
export interface Preservation {
  replacement_history: "retained";
  retraction_history: "retained";
  predecessor_source_history: "retained";
  successor_source_history: "retained";
  dependent_history: "retained";
  artifact_material: "retained";
}
export interface CreateRecovery {
  recovery_kind: "compensating_relationship_retraction";
  state: "available";
  inverse_command_name: "RetractProjectSourceReplacement";
  expected_replacement_ref: ExactReplacementRef & {
    state?: "active";
    [k: string]: unknown;
  };
  effect: "relationship_retracted_without_source_restore";
}
export interface RetractionReceiptContent {
  command_ref: CommandRef & {
    command_name?: "RetractProjectSourceReplacement";
    [k: string]: unknown;
  };
  event_ref: EventRef & {
    event_type?: "project_source.replacement_retracted";
    [k: string]: unknown;
  };
  result: RetractedResult;
  preservation: Preservation;
  recovery: RetractionDisposition;
}
export interface RetractedResult {
  effect: "replacement_retracted";
  replacement_ref: ExactReplacementRef & {
    state?: "retracted";
    [k: string]: unknown;
  };
  retraction_ref: ExactRetractionRef;
}
export interface ExactRetractionRef {
  project_source_replacement_retraction_id: string;
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
export interface RetractionDisposition {
  recovery_kind: "separate_source_status_transition";
  source_status: "unchanged";
  separate_command_name: "RestoreProjectSource";
  effect: "relationship_inactive_predecessor_not_restored";
}
