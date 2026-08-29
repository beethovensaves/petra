/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionRunId = string;
export type InteractionFeatureManifestId = string;
export type RunLineage =
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
export type OpaqueProtocolId = string;
export type RequestId = string;
export type TraceId = string;
export type CapabilityGrantId = string;
export type RunLifecycle =
  ActiveLifecycle | AwaitingInterruptLifecycle | TerminalLifecycle;
export type StreamHead =
  | {
      state: "empty";
      event_count: 0;
    }
  | {
      state: "advanced";
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      event_count: number;
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      latest_sequence: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      head_hash: string;
    };

/**
 * A revisioned durable record of one Petra interaction run, its protocol correlation, bounded authority context, WorkUnit linkage, and presentation-stream head. It is not a scientific domain ledger.
 */
export interface PetraInteractionRun {
  schema_name: "petra.interaction-run";
  schema_version: "1.0.0";
  interaction_run_id: InteractionRunId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  feature_manifest_ref: FeatureManifestRef;
  lineage: RunLineage;
  content: RunContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface FeatureManifestRef {
  interaction_feature_manifest_id: InteractionFeatureManifestId;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RunContent {
  correlation: {
    protocol_thread_id: OpaqueProtocolId;
    protocol_run_id: OpaqueProtocolId;
    request_id: RequestId;
    trace_id: TraceId;
    work_unit_ref: WorkUnitRef;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    model_request_id?: string;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    agent_run_id?: string;
  };
  authority_context: {
    actor: ActorRef;
    capability_grant_id: CapabilityGrantId;
    privacy_profile_ref: VersionedControlRef;
    budget_profile_ref: VersionedControlRef;
  };
  input: {
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    input_hash: string;
    source_message_id: OpaqueProtocolId;
  };
  lifecycle: RunLifecycle;
  stream_head: StreamHead;
  authority_boundary: {
    interaction_state_is_authoritative: false;
    events_are_domain_ledger: false;
    connection_abort_cancels_work: false;
  };
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
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
export interface ActiveLifecycle {
  state: "queued" | "running";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
}
export interface AwaitingInterruptLifecycle {
  state: "awaiting_interrupt";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  interaction_interrupt_ids: [string & string, ...(string & string)[]];
}
export interface TerminalLifecycle {
  state: "completed" | "failed" | "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  ended_at: string;
  outcome_code: string;
}
