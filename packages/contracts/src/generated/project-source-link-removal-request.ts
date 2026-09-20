/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact reviewed request to stop ordinary new Project use of one active ProjectSource. Actor, capability grant, authority time, global source identity, immutable revisions, and local-copy retention remain server-owned.
 */
export interface PetraProjectSourceLinkRemovalRequest {
  schema_name: "petra.project-source-link-removal-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected: Expected;
  reason: string;
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
