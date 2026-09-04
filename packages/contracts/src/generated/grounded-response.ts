/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type GroundedResponseId = string;
export type Lineage =
  | {
      lineage_kind: "root";
    }
  | {
      lineage_kind: "revision";
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      parent_revision: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      parent_hash: string;
    };
export type ModelRequestId = string;
export type ModelCallId = string;
export type ModelDeploymentId = string;
export type RoleCertificationId = string;
export type CacheState = ReusableCache | InvalidatedCache;
export type CacheKey = string;
export type EventId = string & string;

/**
 * A revisioned operational record binding immutable grounded-response bytes to their exact scientific, model, WorkUnit, interaction, and cache dependencies. Invalidation never rewrites the Artifact or scientific authority.
 */
export interface PetraGroundedResponse {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  grounded_response_id: GroundedResponseId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  lineage: Lineage;
  content: Content;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface Content {
  response_artifact_ref: ResponseArtifactRef;
  context_packet_ref: ContextPacketRef;
  evidence_packet_ref: EvidencePacketRef;
  snapshot_ref: SnapshotRef;
  execution_ref: ExecutionRef;
  interaction_ref: InteractionRef;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency, ...Dependency[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  model_output_hash: string;
  cache: CacheState;
  terminal: PersistedTerminal;
}
export interface ResponseArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: "text/markdown; charset=utf-8";
}
export interface ContextPacketRef {
  context_packet_id: string;
  revision: 1;
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
export interface ExecutionRef {
  model_request_id: ModelRequestId;
  model_call_id: ModelCallId;
  model_deployment_id: ModelDeploymentId;
  role_certification_id: RoleCertificationId;
}
export interface InteractionRef {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef;
}
export interface InteractionRunRef {
  interaction_run_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkUnitRef {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
}
export interface Dependency {
  dependency_role: "selected_evidence" | "provenance" | "control";
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
}
export interface ClaimRef {
  object_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface AssertionRef {
  object_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface SourceSpanRef {
  object_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface WorkVersionRef {
  object_kind: "work_version";
  /**
   * A Petra identifier whose kind is work_version.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface ReusableCache {
  state: "reusable";
  cache_key: CacheKey;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
}
export interface InvalidatedCache {
  state: "invalidated";
  cache_key: CacheKey;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  invalidated_by: [InvalidationCause, ...InvalidationCause[]];
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_dependency_ids: [string, ...string[]];
}
export interface InvalidationCause {
  event_id: EventId;
  event_type: "change_set.applied" | "change_set.reverted";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string & string;
}
export interface PersistedTerminal {
  state: "completed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  persisted_at: string;
  authority_effect: "none";
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
