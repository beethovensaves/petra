/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectExaminationScene {
  schema_name: "petra.project-examination-scene";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: {
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    /**
     * @maxItems 250
     */
    nodes: {
      key: string;
      record_ref: TargetClaimRef;
      kind: string;
      label: string;
      state:
        | "working"
        | "reference"
        | "current"
        | "stale"
        | "invalidated"
        | "profile_unavailable"
        | "unassessed";
      /**
       * @maxItems 8
       */
      affected_axes:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string];
    }[];
    /**
     * @maxItems 500
     */
    relationships: {
      key: string;
      subject_key: string;
      object_key: string;
      predicate:
        | "targets"
        | "assesses"
        | "uses_evidence"
        | "has_posture"
        | "concludes"
        | "supersedes"
        | "prior_disposition"
        | "pins_profile"
        | "pins_policy"
        | "satisfies";
    }[];
    omitted_nodes: number;
    omitted_relationships: number;
    has_more_history: boolean;
    /**
     * @maxItems 10
     */
    limitations:
      | []
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ];
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface TargetClaimRef {
  schema_name: string;
  schema_version: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
