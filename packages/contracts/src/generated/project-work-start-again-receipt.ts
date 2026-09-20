/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable exact result of one authorized registered fresh-input transition. It starts linked Work without overwriting prior attempts or applying domain authority.
 */
export interface PetraProjectWorkStartAgainReceipt {
  schema_name: "petra.project-work-start-again-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  outcome: "started_again";
  actor: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    actor_kind: "human";
  };
  capability_grant_id: string;
  requested_prior_work_unit_ref: WorkUnitRef;
  start_again_registration: StartAgainRegistrationRef;
  prior_attempt: PriorAttempt;
  fresh_input: FreshInput;
  new_attempt: NewAttempt;
  effect: Effect;
  destination: Destination;
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
export interface StartAgainRegistrationRef {
  start_again_registration_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface PriorAttempt {
  work_unit_ref: WorkUnitRef;
  work_attempt: number;
  lineage_attempt: number;
  input_manifest_ref: InputManifestRef;
}
export interface InputManifestRef {
  worker_input_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface FreshInput {
  strategy: "fresh_input";
  prior_input_manifest_ref: InputManifestRef;
  fresh_input_manifest_ref: InputManifestRef;
  retained_output_reuse: "none";
  summary: string;
}
export interface NewAttempt {
  lineage_attempt: number;
  work_attempt: 1;
  work_unit_ref: WorkUnitRef;
}
export interface Effect {
  kind: "operational_only";
  summary: string;
  prior_work_preserved: true;
  prior_attempts_preserved: true;
  fresh_work_identity: true;
  domain_authority_changed: false;
}
export interface Destination {
  place_role: "work";
  work_unit_ref: WorkUnitRef;
}
