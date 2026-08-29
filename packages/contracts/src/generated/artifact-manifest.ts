/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A closed origin variant. Acquired scholarly copies must bind the exact WorkVersion; uploads may remain unbound until identity resolution.
 */
export type Origin = AcquiredOrigin | UserSuppliedOrigin | GeneratedOrigin;
export type Integrity =
  | {
      status: "verified";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      checked_at: string;
      /**
       * @maxItems 0
       */
      problems: [];
    }
  | {
      status: "verified_with_warnings";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      checked_at: string;
      /**
       * @minItems 1
       * @maxItems 100
       */
      problems: [IntegrityProblem, ...IntegrityProblem[]];
    };

/**
 * An immutable record of how exact Artifact bytes entered Petra and where their verified content-addressed copy is available.
 */
export interface PetraArtifactManifest {
  schema_name: "petra.artifact-manifest";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
  /**
   * A changed acquisition or storage fact creates a new manifest.
   */
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A Petra identifier whose kind is rights_decision.
   */
  rights_decision_id: string;
  origin: Origin;
  storage_ref: StorageRef;
  integrity: Integrity;
  recorded_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface AcquiredOrigin {
  origin_kind: "acquired";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  source_connector: string;
  connector_version: string;
  retrieval_url: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  retrieved_at: string;
  response_metadata: ResponseMetadata;
}
export interface ResponseMetadata {
  status_code?: number;
  content_type?: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  content_length?: number;
  etag?: string;
  last_modified?: string;
}
export interface UserSuppliedOrigin {
  origin_kind: "user_supplied";
  supplied_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  supplied_at: string;
  original_filename: string;
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id?: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface GeneratedOrigin {
  origin_kind: "generated";
  generator_name: string;
  generator_version: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  generated_at: string;
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is artifact.
   */
  input_artifact_ids: string[];
}
export interface StorageRef {
  storage_kind: "content_addressed_object";
  store_name: string;
  object_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  availability: "available";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  verified_at: string;
}
export interface IntegrityProblem {
  code: string;
  severity: "warning";
  message: string;
}
