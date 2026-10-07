/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * Exact human-reviewed Project creation with an acknowledged intake, immutable proposed draft and settled original discussion bound atomically to the resulting Project.
 */
export interface PetraProjectDefinitionDraftCommandRequestV11 {
  schema_name: "petra.project-definition-draft-command-request";
  schema_version: "1.1.0";
  command_id: string;
  idempotency_key: string;
  draft: PetraProjectDefinitionDraftView;
  /**
   * @minItems 1
   * @maxItems 30
   */
  accepted_assumption_codes: [string, ...string[]];
  intake_ref: {
    intake_session_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    session_record_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    definition_draft_hash: string;
    last_run_id: string | null;
  };
}
/**
 * A deterministic server-owned proposal for one Project, ProjectDefinition, objective, capability selection, assumptions, limitations, and initial-material plan.
 */
export interface PetraProjectDefinitionDraftView {
  schema_name: "petra.project-definition-draft-view";
  schema_version: "1.0.0";
  draft_id: string;
  content: DraftContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface DraftContent {
  request: PetraProjectDefinitionDraftRequest;
  project: {
    name: string;
    description: string;
  };
  definition_family: string;
  definition_origin:
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
  definition_content: DefinitionContent;
  objective: {
    objective_kind: string;
    statement: string;
  };
  /**
   * @minItems 1
   */
  enabled_evidence_namespaces: [
    "scholarly" | "operational" | "personal" | "discovery",
    ...("scholarly" | "operational" | "personal" | "discovery")[],
  ];
  /**
   * @minItems 1
   * @maxItems 100
   */
  selected_capabilities: [SelectedCapability, ...SelectedCapability[]];
  /**
   * @minItems 1
   * @maxItems 30
   */
  assumptions: [Assumption, ...Assumption[]];
  /**
   * @maxItems 100
   */
  unsupported_capabilities: UnsupportedCapability[];
  /**
   * @maxItems 12
   */
  initial_material_plan:
    | []
    | [InitialMaterialPlan]
    | [InitialMaterialPlan, InitialMaterialPlan]
    | [InitialMaterialPlan, InitialMaterialPlan, InitialMaterialPlan]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ]
    | [
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
        InitialMaterialPlan,
      ];
}
/**
 * A use-agnostic request for Petra to propose one Project-owned definition and first objective while preserving the user's outcome wording.
 */
export interface PetraProjectDefinitionDraftRequest {
  schema_name: "petra.project-definition-draft-request";
  schema_version: "1.0.0";
  request_id: string;
  outcome: string;
  project_name?: string;
  example_ref?: ProfileRef;
  /**
   * @maxItems 12
   */
  initial_material?:
    | []
    | [InitialMaterial]
    | [InitialMaterial, InitialMaterial]
    | [InitialMaterial, InitialMaterial, InitialMaterial]
    | [InitialMaterial, InitialMaterial, InitialMaterial, InitialMaterial]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ]
    | [
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
        InitialMaterial,
      ];
}
export interface ProfileRef {
  profile_id: string;
  profile_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface InitialMaterial {
  material_id: string;
  filename: string;
  media_type: string;
  byte_size: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface SelectedCapability {
  capability_id: string;
  label: string;
  source: "petra_kernel" | "registered_template";
  reason: string;
  profile_ref?: ProfileRef;
}
export interface Assumption {
  code: string;
  statement: string;
  consequence: string;
}
export interface UnsupportedCapability {
  capability: string;
  reason: string;
}
export interface InitialMaterialPlan {
  material_id: string;
  disposition: "register_after_project_creation";
  reason: string;
}
