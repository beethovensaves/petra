/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable identity and physical characteristics of an exact byte sequence processed by Petra.
 */
export interface PetraArtifact {
  schema_name: "petra.artifact";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * Artifacts never update in place; changed bytes receive a new identity.
   */
  revision: 1;
  artifact_kind:
    | "pdf"
    | "html"
    | "structured_text"
    | "dataset"
    | "code"
    | "environment_lock"
    | "run_output"
    | "image"
    | "export";
  media_type: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
