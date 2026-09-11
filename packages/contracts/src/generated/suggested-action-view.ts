/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type BackgroundWork =
  | {
      state: "completed";
      work_unit_ref: WorkUnitRef;
      terminal_outcome:
        | "succeeded"
        | "worker_failed"
        | "validation_failed"
        | "resource_exhausted"
        | "timed_out"
        | "cancelled";
    }
  | {
      state: "unavailable";
      reason: string;
    };

/**
 * A Project-scoped, revisioned, read-only SuggestedAction preview derived from one exact immutable inquiry-result link and its retained authority. It does not start Work or change Project authority.
 */
export interface PetraSuggestedActionView {
  schema_name: "petra.suggested-action-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  view_kind: "preview";
  action_ref: SuggestedActionRef;
  action: Action;
  /**
   * Current server-owned readiness for the immutable action revision. Readiness is recomputed and is not part of action_ref.content_hash.
   */
  readiness: Ready | Stale;
  operation: {
    state: "read_only";
    work_start: "not_performed";
    authority_change: "none";
  };
  authority: AuthorityPosition;
  /**
   * @minItems 1
   * @maxItems 16
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
      ]
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
        string,
      ]
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
        string,
        string,
      ]
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
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Action {
  action_kind: "inspect_existing_inquiry_result";
  title: string;
  objective: Objective;
  reason: string;
  basis: Basis;
  scope: {
    scope_kind: "exact_existing_result";
    included: string;
    /**
     * @minItems 1
     * @maxItems 8
     */
    excluded:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string];
  };
  /**
   * @maxItems 16
   */
  missing_information:
    | []
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
      ]
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
        string,
      ]
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
        string,
        string,
      ]
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
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
        string,
      ]
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
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  response_depth: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    allowed: ["current_graph"];
    recommended: "current_graph";
    adjustable: false;
  };
  expected_result: {
    state: "already_available";
    result_kind: "grounded_response";
    result_ref: TypedRecordRef;
    authority_effect: "none";
    reusable: boolean;
  };
  resources: {
    duration: "not_required";
    cost: "not_required";
    basis: "read_only_existing_result";
  };
  capability: {
    capability_key: "petra.project-inquiry.read";
    grant_status: "satisfied_by_authenticated_project_read";
    approval: "not_required";
  };
  interrupt: {
    expectation: "none";
  };
  cancellation: {
    consequence: "not_applicable_no_work_started";
  };
  background_work: BackgroundWork;
  invocation: {
    kind: "authenticated_read";
    contract_name: "petra.project-inquiry-view";
    contract_version: "1.0.0";
    operation: "get_project_inquiry_detail";
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    objective_ref: ObjectiveRef;
    place_role: "brief";
    task_intent: "inspect";
    idempotency: "safe_exact_read";
  };
}
export interface Objective {
  objective_ref: ObjectiveRef;
  semantic_key: string;
  statement: string;
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
export interface Basis {
  derivation: "exact_immutable_inquiry_result_link";
  project_definition_ref: DefinitionRef;
  inquiry_result_link_ref: InquiryLinkRef;
  result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  produced_by_work_ref?: WorkUnitRef;
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
  definition_family: string;
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  record_id: string;
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
}
export interface Ready {
  state: "ready";
  reason_code: "exact_existing_result_available";
  reason: string;
  /**
   * @maxItems 0
   */
  missing_prerequisites: [];
}
export interface Stale {
  state: "stale";
  reason_code:
    | "project_definition_changed"
    | "objective_changed"
    | "objective_inactive"
    | "result_invalidated";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
