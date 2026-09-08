/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type DefinitionOrigin =
  | {
      origin_kind: "project_authored";
    }
  | {
      origin_kind: "template_seed";
      template_id: string;
      template_version: string;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      template_hash: string;
    };

/**
 * An immutable Project-owned semantic definition revision. Reusable templates may seed it but never remain a mutable dependency.
 */
export interface PetraProjectDefinition {
  schema_name: "petra.project-definition";
  schema_version: "1.0.0";
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  definition_family: string;
  origin: DefinitionOrigin;
  content: DefinitionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
