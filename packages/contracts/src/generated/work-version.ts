/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * One identifiable dated version of a canonical scholarly Work.
 */
export interface PetraWorkVersion {
  schema_name: "petra.work-version";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  /**
   * A publication date that preserves the precision supplied by scholarly metadata instead of inventing a day or time.
   */
  published_date?:
    | {
        precision: "year";
        value: string;
      }
    | {
        precision: "month";
        value: string;
      }
    | {
        precision: "day";
        value: string;
      };
  metadata_source: MetadataSource;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  metadata_retrieved_at: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface MetadataSource {
  source_kind: "registry" | "repository" | "publisher" | "provider" | "user";
  source_name: string;
  source_record_id?: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
