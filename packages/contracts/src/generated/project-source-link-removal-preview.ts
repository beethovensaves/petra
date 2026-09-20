/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An authenticated server-owned preview for removing one exact active ProjectSource link while retaining source authority, immutable revisions, dependents, and local bytes.
 */
export interface PetraProjectSourceLinkRemovalPreview {
  schema_name: "petra.project-source-link-removal-preview";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  expected: Expected;
  transition: PreviewTransition;
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
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  current_source_ref: ActiveSourceRef;
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
export interface ActiveSourceRef {
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
export interface PreviewTransition {
  state: "preview_available";
  from_status: "active" | "excluded";
  to_status: "active" | "excluded";
  effect: "ordinary_new_use_disabled" | "ordinary_new_use_restored";
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
  state: "ready";
  command_name: "ExcludeProjectSource";
  method: "POST";
  path: string;
  recovery_path: string;
  separate_local_copy_deletion: true;
}
