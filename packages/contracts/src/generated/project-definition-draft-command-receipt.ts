/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result of atomically creating a Project, its exact ProjectDefinition, first objective, and current objective focus from one reviewed draft.
 */
export interface PetraProjectDefinitionDraftCommandReceipt {
  schema_name: "petra.project-definition-draft-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  actor: ActorRef;
  draft_ref: {
    draft_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
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
export interface InitialMaterialPlan {
  material_id: string;
  disposition: "register_after_project_creation";
  reason: string;
}
