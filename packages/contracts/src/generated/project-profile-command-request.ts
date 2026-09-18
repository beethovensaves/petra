/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A client request to create a Project or safely reset one by creating a replacement from one exact registered profile. Actor and authority are server-owned.
 */
export type PetraProjectProfileCommandRequest = {
  schema_name: "petra.project-profile-command-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  operation: "create" | "reset";
  profile_ref: ProfileRef;
  expected_project?: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
  };
  project: {
    name: string;
    description?: string;
  };
  objective: {
    statement: string;
  };
};

export interface ProfileRef {
  profile_id: string;
  profile_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
