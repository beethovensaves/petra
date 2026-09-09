/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable revocation of one exact CapabilityGrant. Revocation is retained and cannot reactivate or rewrite the grant.
 */
export interface PetraCapabilityGrantRevocation {
  schema_name: "petra.capability-grant-revocation";
  schema_version: "1.0.0";
  capability_grant_revocation_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  grant_ref: GrantRef;
  content: RevocationContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  revoked_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  revoked_at: string;
}
export interface GrantRef {
  capability_grant_id: string;
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
export interface RevocationContent {
  reason: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
