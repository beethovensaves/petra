/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ContextPacketId = string;
export type VersionedObjectRef =
  ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
export type SelectionAuthority =
  | {
      zone: "quarantine";
      review_state:
        "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
    }
  | {
      zone: "trusted";
      review_state: "machine_checked" | "human_accepted" | "disputed";
    }
  | {
      zone: "personal";
      review_state: "unreviewed" | "human_accepted" | "disputed";
    }
  | {
      zone: "source_record";
      review_state: "not_applicable";
    };
export type Omission = KnownObjectOmission | SearchBoundaryOmission;
export type OmissionReason =
  | "budget"
  | "policy"
  | "rights"
  | "visibility"
  | "truncation"
  | "unavailable"
  | "not_retrieved";

/**
 * An immutable, bounded manifest of the exact scientific records authorized as context for one objective, snapshot, and recipe revision.
 */
export interface PetraContextPacket {
  schema_name: "petra.context-packet";
  schema_version: "1.0.0";
  context_packet_id: ContextPacketId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  recipe_ref: ContextRecipeRef;
  content: ContextPacketContent;
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
export interface ContextRecipeRef {
  context_recipe_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ContextPacketContent {
  objective: Objective;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  included_objects: [ContextInclusion, ...ContextInclusion[]];
  /**
   * @maxItems 10000
   */
  omissions: Omission[];
  coverage: Coverage;
  budget: PacketBudget;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency, ...Dependency[]];
}
export interface Objective {
  objective_kind:
    | "answer"
    | "inspect"
    | "compare"
    | "review"
    | "compose"
    | "experiment"
    | "other";
  statement: string;
  /**
   * @maxItems 1000
   */
  target_refs: VersionedObjectRef[];
}
export interface ClaimRef {
  object_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  object_id: string;
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
  object_id: string;
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
  object_id: string;
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
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface ContextInclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  selection_order: number;
  object_ref: VersionedObjectRef;
  /**
   * @minItems 1
   */
  evidence_roles: [
    (
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    ),
    ...(
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    )[],
  ];
  authority: SelectionAuthority;
  source_access:
    | "metadata_only"
    | "abstract_only"
    | "full_text_structured"
    | "full_text_analyzed"
    | "not_applicable";
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_refs: string[];
  selection: SelectionTrace;
  estimated_tokens: number;
}
export interface SelectionTrace {
  route:
    | "deterministic_graph"
    | "lexical"
    | "dense"
    | "hybrid"
    | "graph_expansion"
    | "cached"
    | "explicit_user_selection";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  rank: number;
  score?: string;
  reason: string;
}
export interface KnownObjectOmission {
  omission_kind: "known_object";
  object_ref: VersionedObjectRef;
  reason: OmissionReason;
  material: boolean;
  detail: string;
}
export interface SearchBoundaryOmission {
  omission_kind: "search_boundary";
  boundary: string;
  reason: OmissionReason;
  material: boolean;
  detail: string;
}
export interface Coverage {
  state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  statement: string;
  contrary_evidence_checked: boolean;
}
export interface PacketBudget {
  max_input_tokens: number;
  max_objects: number;
  max_source_spans: number;
  estimated_input_tokens: number;
  included_object_count: number;
  included_source_span_count: number;
  truncated: boolean;
}
export interface Dependency {
  dependency_kind:
    "record" | "artifact" | "schema" | "projection" | "ranking" | "policy";
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
