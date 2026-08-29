/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type TemporalPerspective =
  | {
      perspective: "current";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      as_of: string;
    }
  | {
      perspective: "historical" | "comparative";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      as_of: string;
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      historical_boundary: string;
    };
export type Freshness =
  | {
      state: "current_for_snapshot";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      checked_at: string;
    }
  | {
      state: "stale";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      checked_at: string;
      /**
       * @minItems 1
       * @maxItems 1000
       *
       * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
       */
      invalidated_by: [string, ...string[]];
    }
  | {
      state: "unknown";
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      checked_at: string;
      reason: string;
    };

/**
 * An immutable composition-specific selection over one exact ContextPacket; inclusion records authorized evidence, not truth.
 */
export interface PetraEvidencePacket {
  schema_name: "petra.evidence-packet";
  schema_version: "1.0.0";
  evidence_packet_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  content: EvidencePacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
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
export interface EvidencePacketContent {
  context_packet_ref: ContextPacketRef;
  composition_objective: string;
  temporal_perspective: TemporalPerspective;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  selected_evidence: [EvidenceSelection, ...EvidenceSelection[]];
  /**
   * @maxItems 10000
   */
  exclusions: ContextExclusion[];
  coverage: EvidenceCoverage;
  freshness: Freshness;
}
export interface ContextPacketRef {
  context_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidenceSelection {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  bearing:
    | "supporting"
    | "contrary"
    | "qualifying"
    | "conflicting"
    | "background"
    | "unresolved";
  /**
   * @maxItems 10000
   *
   * Items: A one-based optimistic revision within JavaScript's safe-integer range.
   */
  source_span_selection_orders: number[];
  inclusion_reason: string;
  /**
   * @maxItems 100
   */
  use_limitations: string[];
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
export interface ContextExclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  reason:
    | "not_relevant"
    | "redundant"
    | "scope_mismatch"
    | "rights"
    | "budget"
    | "unsupported_depth";
  detail: string;
}
export interface EvidenceCoverage {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
