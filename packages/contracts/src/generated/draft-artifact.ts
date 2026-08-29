/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type DraftArtifactId = string;
export type ProvenanceMapId = string;
export type CitationBundleId = string;
export type DraftLineage =
  | {
      lineage_kind: "root";
    }
  | {
      lineage_kind: "revision";
      parent_draft_artifact_id: DraftArtifactId;
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      parent_revision: number;
      edit_origin: "researcher_edit" | "felicity_revision" | "model_revision";
    };
export type ProductionOrigin =
  ModelProduction | ResearcherProduction | DeterministicProduction;
export type DraftSpanId = string;

/**
 * One immutable semantic draft revision bound to an exact snapshot, EvidencePacket, provenance map, citation bundle, production origin, and language controls.
 */
export interface PetraDraftArtifact {
  schema_name: "petra.draft-artifact";
  schema_version: "1.0.0";
  draft_artifact_id: DraftArtifactId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  composition_request_ref: VersionedControlRef;
  composition_plan_ref: VersionedControlRef;
  evidence_packet_ref: EvidencePacketRef;
  provenance_map_ref: ProvenanceMapRef;
  citation_bundle_ref: CitationBundleRef;
  lineage: DraftLineage;
  production: ProductionOrigin;
  controls: DraftControls;
  content: DraftContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  validation: DraftValidation;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface VersionedControlRef {
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
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProvenanceMapRef {
  provenance_map_id: ProvenanceMapId;
  revision: 1;
}
export interface CitationBundleRef {
  citation_bundle_id: CitationBundleId;
  revision: 1;
}
export interface ModelProduction {
  origin_kind: "model_generated";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  model_request_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  model_call_id: string;
  model_deployment: string;
  prompt_profile: NamedVersion;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  prompt_hash: string;
}
export interface NamedVersion {
  name: string;
  version: string;
}
export interface ResearcherProduction {
  origin_kind: "researcher_authored";
  /**
   * A Petra identifier whose kind is actor.
   */
  researcher_id: string;
}
export interface DeterministicProduction {
  origin_kind: "deterministic";
  producer: NamedVersion;
}
export interface DraftControls {
  output_profile: NamedVersionHash;
  language_contract: NamedVersionHash;
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface DraftContent {
  artifact_kind:
    | "passage"
    | "outline"
    | "table"
    | "methods_description"
    | "experiment_report"
    | "literature_synthesis"
    | "bibliography"
    | "other";
  semantic_format: "plain_text" | "markdown" | "structured_json";
  language: string;
  text: string;
  /**
   * @minItems 1
   * @maxItems 100000
   */
  draft_span_ids: [DraftSpanId, ...DraftSpanId[]];
}
export interface DraftValidation {
  state: "pending" | "passed" | "failed" | "stale";
  /**
   * @maxItems 1000
   */
  validator_results: ValidatorResult[];
  /**
   * @maxItems 1000
   */
  limitations: string[];
  /**
   * @maxItems 100000
   */
  unresolved_support_span_ids: DraftSpanId[];
}
export interface ValidatorResult {
  validator: string;
  version: string;
  outcome: "pass" | "fail" | "warning";
  code: string;
  message?: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
