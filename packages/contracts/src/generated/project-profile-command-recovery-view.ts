/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Subject = {
  operation: "create" | "reset";
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  expected_project?: ExpectedProject;
};
/**
 * The immutable result of an authorized Project create or reset operation using one exact registered profile.
 */
export type PetraProjectProfileCommandReceipt = {
  schema_name: "petra.project-profile-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  operation: "create" | "reset";
  actor: ActorRef;
  profile_ref: ProfileRef;
  prior_project_ref?: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    resulting_status: "archived";
  };
  project_ref: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
  };
  project_definition_ref: {
    project_definition_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
  objective_ref: {
    objective_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
  destination: {
    place_role: "brief";
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
  };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
};
export type Destination = {
  place_role: "projects" | "brief";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id?: string;
};

/**
 * A read-only reconciliation of one exact Project create or reset request against the immutable Project-profile command receipt. It may offer exact idempotent redelivery through the existing command owner but never executes recovery or creates a second ledger.
 */
export interface PetraProjectProfileCommandRecoveryView {
  schema_name: "petra.project-profile-command-recovery-view";
  schema_version: "1.0.0";
  assessment_id: string;
  content: RecoveryContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface RecoveryContent {
  subject: Subject;
  effect: EffectConfirmed | OutcomeUnknown | UnavailableToVerify;
  /**
   * @minItems 1
   * @maxItems 6
   */
  preservation:
    | [PreservedItem]
    | [PreservedItem, PreservedItem]
    | [PreservedItem, PreservedItem, PreservedItem]
    | [PreservedItem, PreservedItem, PreservedItem, PreservedItem]
    | [
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
      ]
    | [
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
      ];
  /**
   * @maxItems 1
   */
  eligible_actions: [] | [RecoveryAction];
  return: ExactReturn | SafeReturn;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observation_cutoff: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface ExpectedProject {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
}
export interface EffectConfirmed {
  state: "effect_confirmed";
  meaning: "The exact Project-profile command receipt is retained. Repeating the same request returns this receipt without another effect.";
  receipt: PetraProjectProfileCommandReceipt;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface ProfileRef {
  profile_id: string;
  profile_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface OutcomeUnknown {
  state: "outcome_unknown";
  reason: "receipt_not_observed_at_cutoff";
  meaning: "No exact receipt was visible at the observation cutoff. Absence does not prove that no effect occurred after the cutoff.";
}
export interface UnavailableToVerify {
  state: "unavailable_to_verify";
  reason:
    "command_identity_conflict" | "command_not_owned_by_authenticated_actor";
  meaning: "The command or idempotency identity cannot be reconciled to this exact authenticated request. Petra will not expose another request or retry with conflicting identity.";
}
export interface PreservedItem {
  item:
    | "exact_request"
    | "command_receipt"
    | "project"
    | "project_definition"
    | "objective"
    | "prior_project";
  identity: string;
  revision?: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  durability: "client_session" | "postgresql";
  state: "client_copy_required" | "retained" | "archived";
}
export interface RecoveryAction {
  operation: "retry_exact_command" | "open_resulting_project";
  eligibility: "eligible";
  owner: "project_profile_command" | "browser_navigation";
  method: "GET" | "POST";
  path: string;
  input_behavior: "reuse_exact_request" | "none";
  identity_behavior: "reuse_command_and_idempotency" | "no_command";
  authority_effect: string;
  history_effect: string;
  reason: string;
  success_destination: Destination;
  failure_destination: Destination;
  execution_recheck: true;
}
export interface ExactReturn {
  state: "exact";
  destination: Destination;
  reason: "The retained receipt supplies the resulting Project Brief destination.";
}
export interface SafeReturn {
  state: "safe_fallback";
  destination: Destination;
  reason: string;
}
