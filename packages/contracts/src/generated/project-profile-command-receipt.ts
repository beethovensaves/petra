/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result of an authorized Project create or reset operation using one exact registered profile.
 */
export type PetraProjectProfileCommandReceipt = {
  schema_name: "petra.project-profile-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  operation: "create" | "reset";
  actor: ActorRef;
  profile_ref: ProfileRef;
  prior_project_ref?: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    resulting_status: "archived";
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
};

export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface ProfileRef {
  profile_id: string;
  profile_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
