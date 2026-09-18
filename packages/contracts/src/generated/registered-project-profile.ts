/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable registered profile version that may seed a Project-owned ProjectDefinition without becoming that Project's authority ledger.
 */
export interface PetraRegisteredProjectProfile {
  schema_name: "petra.registered-project-profile";
  schema_version: "1.0.0";
  profile_id: string;
  profile_version: string;
  definition_family: string;
  status: "active";
  content: ProfileContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  registered_at: string;
}
export interface ProfileContent {
  label: string;
  purpose: string;
  /**
   * @minItems 1
   */
  enabled_evidence_namespaces: [
    "scholarly" | "operational" | "personal" | "discovery",
    ...("scholarly" | "operational" | "personal" | "discovery")[],
  ];
  objective_kind: string;
  definition: DefinitionContent;
  taxonomy: Taxonomy;
}
export interface DefinitionContent {
  label: string;
  description: string;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  registrations: [Registration, ...Registration[]];
  /**
   * @minItems 3
   * @maxItems 1000
   */
  terms: [Term, Term, Term, ...Term[]];
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
   * @maxItems 100
   */
  omitted_flows: string[];
}
export interface Registration {
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "validator"
    | "output"
    | "terminology"
    | "presentation_descriptor"
    | "model_context"
    | "prompt"
    | "tool"
    | "model_role"
    | "extension";
  semantic_key: string;
  contract: NamedVersionHash;
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
export interface UnavailableOperation {
  operation_id: string;
  label: string;
  reason: string;
}
