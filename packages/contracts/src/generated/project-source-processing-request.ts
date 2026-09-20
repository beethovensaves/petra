/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A reviewed request to create and start one bounded processing WorkUnit from an exact current ProjectSource. Actor, grant, Work identity, worker configuration, limits, and timestamps are server-owned.
 */
export interface PetraProjectSourceProcessingRequest {
  schema_name: "petra.project-source-processing-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected: Expected;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  project_source_ref: ProjectSourceRef;
  source_role: string;
  processing_family_ref: ProcessingFamilyRef;
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
export interface ProjectSourceRef {
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
export interface ProcessingFamilyRef {
  semantic_key: "petra.source-processing";
  contract: {
    name: "petra.document.parse";
    version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
}
