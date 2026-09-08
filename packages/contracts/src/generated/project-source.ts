/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The M1 scholarly specialization: an immutable revision binding one Project to an exact scientific WorkVersion and copy under one ProjectDefinition source role.
 */
export interface PetraProjectSource {
  schema_name: "petra.project-source";
  schema_version: "1.0.0";
  project_source_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ProjectSourceContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  added_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
}
export interface ProjectSourceContent {
  binding_kind: "scientific_work_version";
  project_definition_ref: DefinitionRef;
  source_role: string;
  work_ref: WorkRef;
  work_version_ref: WorkVersionRef;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  author_refs: [AuthorRef, ...AuthorRef[]];
  artifact_manifest_ref: ArtifactManifestRef;
  status: "active" | "excluded";
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
export interface AuthorRef {
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
