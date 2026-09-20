/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Effect =
  | {
      state: "effect_confirmed";
      meaning: "The exact Project import receipt and ancestry are retained. Repeating the same request returns this receipt without another derived Project.";
      receipt: PetraProjectImportCommandReceipt;
    }
  | {
      state: "outcome_unknown";
      reason: "receipt_not_observed_at_cutoff";
      meaning: "No exact import receipt was visible at the observation cutoff. Absence does not prove that no derived Project was created later.";
    }
  | {
      state: "unavailable_to_verify";
      reason:
        | "command_identity_conflict"
        | "command_not_owned_by_authenticated_actor";
      meaning: "The command or idempotency identity cannot be reconciled to this exact authenticated import request. Petra will not expose another request or retry with conflicting identity.";
    };
export type Destination =
  | {
      place_role: "projects";
    }
  | {
      place_role: "brief";
      /**
       * A Petra identifier whose kind is project.
       */
      project_id: string;
    };

/**
 * A read-only reconciliation of one exact retained-Project reuse request against its immutable ancestry receipt.
 */
export interface PetraProjectImportCommandRecoveryView {
  schema_name: "petra.project-import-command-recovery-view";
  schema_version: "1.0.0";
  assessment_id: string;
  content: Content;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface Content {
  subject: Subject;
  effect: Effect;
  /**
   * @minItems 1
   * @maxItems 10
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
      ]
    | [
        PreservedItem,
        PreservedItem,
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
        PreservedItem,
        PreservedItem,
        PreservedItem,
        PreservedItem,
      ];
  /**
   * @maxItems 1
   */
  eligible_actions: [] | [Action];
  return: Return;
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
export interface Subject {
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  source_project_id: string;
}
/**
 * The immutable result and retained ancestry of one authorized retained-Project reuse command.
 */
export interface PetraProjectImportCommandReceipt {
  schema_name: "petra.project-import-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  actor: ActorRef;
  source: SourceAncestry;
  admission: Admission;
  result: Result;
  material: {
    copied: ["project_definition", "focused_objective"];
    retained_only: [
      "source_project_identity",
      "source_history",
      "source_sources",
      "source_work",
      "source_reviews",
    ];
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
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SourceAncestry {
  source_kind: "retained_project";
  project_ref: ExactProjectRef;
  project_definition_ref: DefinitionRef;
  focused_objective_ref: ObjectiveRef;
  project_status: "active" | "archived";
}
export interface ExactProjectRef {
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
export interface Admission {
  decision: "create_derived_project";
  copy_scope: "definition_and_focused_objective";
  source_effect: "preserve_without_modification";
  reviewed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
export interface Result {
  project_ref: ExactProjectRef;
  project_definition_ref: DefinitionRef;
  focused_objective_ref: ObjectiveRef;
}
export interface PreservedItem {
  item:
    | "exact_request"
    | "import_receipt"
    | "source_project"
    | "source_definition"
    | "source_objective"
    | "derived_project";
  identity: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  durability: "client_session" | "postgresql";
  state: "client_copy_required" | "retained" | "derived";
}
export interface Action {
  operation: "retry_exact_command" | "open_derived_project";
  owner: "project_import_command" | "browser_navigation";
  method: "GET" | "POST";
  path: string;
  input_behavior: "reuse_exact_request" | "none";
  identity_behavior:
    "reuse_command_and_idempotency" | "navigate_to_receipt_project";
  reason: string;
  success_destination: Destination;
  failure_destination: Destination;
  execution_recheck: true;
}
export interface Return {
  state: "exact" | "safe_fallback";
  destination: Destination;
  reason: string;
}
