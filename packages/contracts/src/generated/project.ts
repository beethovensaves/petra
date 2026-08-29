/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The explicit private scope that owns a research question, evidence overlays, hypotheses, and work.
 */
export interface PetraProject {
  schema_name: "petra.project";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  name: string;
  description?: string;
  status: "active" | "archived";
  visibility: "private";
  /**
   * @minItems 1
   */
  enabled_evidence_namespaces: [
    "scholarly" | "operational" | "personal" | "discovery",
    ...("scholarly" | "operational" | "personal" | "discovery")[],
  ];
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
