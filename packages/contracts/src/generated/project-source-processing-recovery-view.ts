/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Effect =
  | {
      state: "effect_confirmed";
      receipt: PetraProjectSourceProcessingReceipt;
    }
  | {
      state: "outcome_unknown";
      reason: "receipt_not_observed_at_cutoff" | "command_still_applying";
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
export type Return =
  | {
      state: "exact";
      destination: Destination;
    }
  | {
      state: "safe_fallback";
      destination: CollectionDestination;
      reason: string;
    };

/**
 * A read-only reconciliation of one exact source-processing request with an exact source/Work return or safe source fallback.
 */
export interface PetraProjectSourceProcessingRecoveryView {
  schema_name: "petra.project-source-processing-recovery-view";
  schema_version: "1.0.0";
  assessment_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  subject: Subject;
  effect: Effect;
  return: Return;
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
 * The durable idempotent outcome of creating and starting one exact ProjectSource processing WorkUnit.
 */
export interface PetraProjectSourceProcessingReceipt {
  schema_name: "petra.project-source-processing-receipt";
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
  expected: Expected;
  work_unit_ref: WorkUnitRef;
  input_manifest_ref: InputManifestRef;
  effect: Effect1;
  destination: Destination;
  recovery: Recovery;
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
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  project_source_ref: ProjectSourceRef;
  source_role: string;
  processing_family_ref: ProcessingFamilyRef;
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
export interface ProjectSourceRef {
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
export interface ProcessingFamilyRef {
  semantic_key: "petra.source-processing";
  contract: {
    name: "petra.document.parse";
    version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
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
  state: "requested" | "queued" | "running";
}
export interface InputManifestRef {
  worker_input_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Effect1 {
  kind: "source_processing_work_started";
  summary: string;
  bounded_to_exact_source_copy: true;
  meaning_authority_unchanged: true;
}
export interface Destination {
  place_role: "sources";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  work_unit_id: string;
}
export interface Recovery {
  command_path: string;
  assessment_path: string;
  processing_path: string;
  retry_reuses_command_identity: true;
  missing_receipt_means_unknown: true;
}
export interface CollectionDestination {
  place_role: "sources";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
}
