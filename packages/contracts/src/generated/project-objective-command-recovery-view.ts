/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Effect =
  | {
      state: "effect_confirmed";
      receipt: PetraProjectObjectiveCommandReceipt;
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
export type Return =
  | {
      state: "exact";
      destination: BriefDestination;
    }
  | {
      state: "safe_fallback";
      destination: {
        place_role: "brief";
        /**
         * A Petra identifier whose kind is project.
         */
        project_id: string;
      };
      reason: string;
    };

/**
 * A read-only reconciliation of one exact reviewed Objective command, including its exact Brief return when confirmed.
 */
export interface PetraProjectObjectiveCommandRecoveryView {
  schema_name: "petra.project-objective-command-recovery-view";
  schema_version: "1.0.0";
  assessment_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
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
 * The immutable outcome of one authorized reviewed Objective framing or revision command.
 */
export interface PetraProjectObjectiveCommandReceipt {
  schema_name: "petra.project-objective-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  operation: "frame" | "revise";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: HumanActorRef;
  capability_grant_id: string;
  project_definition_ref: DefinitionRef;
  prior_focus: NoFocus | Focused;
  objective_ref: ObjectiveRef;
  review: ReviewOutcome;
  effect: Effect1;
  destination: BriefDestination;
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
export interface NoFocus {
  state: "none";
}
export interface Focused {
  state: "focused";
  objective_ref: ObjectiveRef;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ReviewOutcome {
  decision: "applied";
  rough_statement: string;
  proposed_statement: string;
  reviewed_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
export interface Effect1 {
  kind: "objective_framed" | "objective_revised";
  summary: string;
  current_focus_updated: true;
}
export interface BriefDestination {
  place_role: "brief";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  objective_ref: ObjectiveRef;
}
export interface Recovery {
  command_path: string;
  assessment_path: string;
  retry_reuses_command_identity: true;
  missing_receipt_means_unknown: true;
}
