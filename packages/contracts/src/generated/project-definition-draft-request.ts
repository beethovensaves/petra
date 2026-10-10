/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
