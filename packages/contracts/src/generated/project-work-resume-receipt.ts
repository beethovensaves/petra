/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable exact result of one authorized registered checkpoint-resume transition. Continuing operational Work never implies domain authority.
 */
export interface PetraProjectWorkResumeReceipt {
  schema_name: "petra.project-work-resume-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  outcome: "resumed";
  actor: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    actor_kind: "human";
  };
  capability_grant_id: string;
  requested_work_unit_ref: WorkUnitRef;
  checkpoint: CheckpointRef;
  resume_registration: {
    resume_registration_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
  resumed_attempt: number;
  resulting_work_unit_ref: WorkUnitRef;
  effect: {
    kind: "operational_only";
    summary: string;
    prior_attempts_preserved: true;
    checkpoint_preserved: true;
    domain_authority_changed: false;
  };
  destination: {
    place_role: "work";
    work_unit_ref: WorkUnitRef;
  };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
export interface CheckpointRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
