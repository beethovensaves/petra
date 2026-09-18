/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A Project-scoped, exact-definition taxonomy read that either resolves a registered profile or fails closed without substitute semantics.
 */
export interface PetraProjectProfileTaxonomyView {
  schema_name: "petra.project-profile-taxonomy-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  project_revision: number;
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
  resolution:
    | {
        state: "registered";
        profile_ref: ProfileRef;
        label: string;
        purpose: string;
        taxonomy: Taxonomy;
      }
    | {
        state: "unsupported_profile";
        profile_ref: ProfileRef;
        reason:
          | "profile_not_registered"
          | "profile_version_unavailable"
          | "profile_hash_mismatch"
          | "definition_binding_mismatch";
        message: string;
        safe_destination: "projects";
      }
    | {
        state: "project_authored";
        label: string;
        purpose: string;
        taxonomy: Taxonomy;
        limitation: string;
      };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ProfileRef {
  profile_id: string;
  profile_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Taxonomy {
  object_kinds: TaxonomySection;
  relationship_meanings: TaxonomySection;
  source_roles: TaxonomySection;
  validators: TaxonomySection;
  work_families: TaxonomySection;
  model_roles: TaxonomySection;
  review_destinations: TaxonomySection;
  /**
   * @minItems 3
   * @maxItems 1000
   */
  terminology: [Term, Term, Term, ...Term[]];
  /**
   * @minItems 1
   */
  supported_places: [
    (
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    ),
    ...(
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    )[],
  ];
  /**
   * @maxItems 200
   */
  unavailable_operations: UnavailableOperation[];
}
export interface TaxonomySection {
  state: "available" | "partially_available" | "unavailable";
  /**
   * @maxItems 1000
   */
  items: RegisteredTaxonomyItem[];
  limitation?: string;
}
export interface RegisteredTaxonomyItem {
  semantic_key: string;
  label: string;
  meaning: string;
  availability: "available" | "unavailable";
  contract?: NamedVersionHash;
  unavailable_reason?: string;
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
}
export interface UnavailableOperation {
  operation_id: string;
  label: string;
  reason: string;
}
