/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A read-only exact preview of Project-source membership and local-copy lifecycle impact. It never deletes retained authority or executes a transition.
 */
export interface PetraProjectSourceLifecycleView {
  schema_name: "petra.project-source-lifecycle-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  content: LifecycleContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface LifecycleContent {
  requested_action:
    "exclude_project_source" | "restore_project_source" | "delete_local_copy";
  source_ref: SourceRef;
  transition:
    PreviewTransition | NotApplicableTransition | UnavailableTransition;
  impact: Impact;
  /**
   * @minItems 7
   * @maxItems 7
   */
  retention: [
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
  ];
  operation: Operation;
  authority: AuthorityPosition;
}
export interface SourceRef {
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
export interface PreviewTransition {
  state: "preview_available";
  from_status: "active" | "excluded";
  to_status: "active" | "excluded";
  effect: "ordinary_new_use_disabled" | "ordinary_new_use_restored";
  reason: string;
}
export interface NotApplicableTransition {
  state: "not_applicable";
  current_status: "active" | "excluded";
  reason: string;
}
export interface UnavailableTransition {
  state: "unavailable";
  reason: string;
}
export interface Impact {
  scope: "registered_direct_and_scientific_downstream";
  /**
   * @minItems 8
   * @maxItems 8
   */
  groups: [
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
    ImpactGroup,
  ];
  /**
   * @minItems 1
   * @maxItems 20
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
        string,
        string,
        string,
        string,
      ];
}
export interface ImpactGroup {
  group_kind:
    | "parsed_documents"
    | "structural_blocks"
    | "source_spans"
    | "claims"
    | "assertions"
    | "active_work"
    | "open_reviews"
    | "grounded_responses";
  total_count: number;
  returned_count: number;
  coverage: "complete" | "truncated";
  /**
   * @maxItems 100
   */
  refs: ExactDependentRef[];
  effect: "retained";
}
export interface ExactDependentRef {
  record_kind:
    | "parsed_document"
    | "structural_block"
    | "source_span"
    | "claim"
    | "assertion"
    | "work_unit"
    | "review_session"
    | "grounded_response";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "current_and_historical";
  effect: "retained";
}
export interface RetentionItem {
  area:
    | "project_source_history"
    | "canonical_identity"
    | "selected_work_version"
    | "artifact_manifest"
    | "local_artifact"
    | "parsed_representation"
    | "provenance";
  state: "retained" | "deletion_unavailable";
  reason: string;
}
export interface Operation {
  state: "unavailable";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
