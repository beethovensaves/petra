/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A reviewed request to link one exact existing source identity and permitted copy into one exact current Project role. Actor, grant, new membership identity, storage, and record timestamps are server-owned.
 */
export interface PetraProjectSourceReuseRequest {
  schema_name: "petra.project-source-reuse-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected: Expected;
  existing_source: ExistingSource;
  project_membership: ProjectMembership;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
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
export interface ExistingSource {
  origin_project_source_ref: OriginProjectSourceRef;
  work_ref: WorkRef;
  work_version_ref: WorkVersionRef;
  artifact_ref: ArtifactRef;
  artifact_manifest_ref: ArtifactManifestRef;
  rights_decision_ref: RightsDecisionRef;
}
export interface OriginProjectSourceRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
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
export interface WorkRef {
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkVersionRef {
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ArtifactManifestRef {
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface RightsDecisionRef {
  /**
   * A Petra identifier whose kind is rights_decision.
   */
  record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ProjectMembership {
  decision: "reuse_and_link";
  source_role: string;
}
