/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectExaminationReceipt {
  schema_name: "petra.project-examination-receipt";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  project_examination_receipt_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  content: {
    command_id: string;
    idempotency_key: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    request_hash: string;
    operation:
      | "register_hypothesis"
      | "revise_hypothesis"
      | "assess_hypothesis"
      | "decide_posture"
      | "conclude_cycle";
    actor: ActorRef;
    capability_grant_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    profile_ref: TargetClaimRef;
    policy_ref: TargetClaimRef;
    record_ref: TargetClaimRef;
    prior_ref: TargetClaimRef | null;
    review: {
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      content_hash: string;
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      reviewed_at: string;
      rationale: string;
    };
    authority_effect: "project_scoped_examination";
    projection_effect: "none";
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    recorded_at: string;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
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
