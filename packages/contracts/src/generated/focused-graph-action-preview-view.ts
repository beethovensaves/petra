/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type GraphView = PetraFocusedGraphView | PetraFocusedGraphViewV110;
export type StableKey = string;
export type ActionPreview = GovernedCorrectionPreview | NewWorkPreview;
export type ReviewView =
  PetraProjectReviewViewV120 | PetraProjectReviewViewV130;
/**
 * An additive Project-scoped working revision that binds one exact profile-registered object record to its producer, task, input snapshot, basis, provenance, qualifications, and validation. It is durable working state and never domain authority.
 */
export type PetraWorkingCandidate = {
  schema_name: "petra.working-candidate";
  schema_version: "1.0.0";
  working_candidate_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef1;
  profile_object: ProfileObjectBinding;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin1;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem, ...BasisItem[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  provenance: [ProvenanceItem, ...ProvenanceItem[]];
  qualifications: Qualifications;
  validation: Validation;
  lineage: RootLineage | SupersessionLineage;
  disposition: "available" | "withdrawn";
  authority_boundary: AuthorityBoundary1;
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
  recorded_at: string;
};
export type ProfileObjectBinding = {
  registration: ProfileRegistration;
  object_record_ref: ExactTypedRecordRef;
  candidate_operation: "create" | "revise";
  current_authoritative_ref?: ExactTypedRecordRef;
};
export type Qualifications = {
  assessment_state: "stated" | "none_recorded";
  /**
   * @maxItems 100
   */
  statements: QualificationStatement[];
} & {
  assessment_state: "stated" | "none_recorded";
  /**
   * @maxItems 100
   */
  statements: QualificationStatement[];
};
export type Validation = {
  state: "pending" | "completed" | "blocked";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  target_record_hash: string;
  /**
   * @maxItems 1000
   */
  results: ValidationResult[];
} & {
  state: "pending" | "completed" | "blocked";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  target_record_hash: string;
  /**
   * @maxItems 1000
   */
  results: ValidationResult[];
};
/**
 * An additive Project-scoped working revision that binds one exact profile-registered relationship record and its endpoints to the same non-authoritative producer, task, input, basis, provenance, qualification, validation, and supersession boundary as a WorkingCandidate.
 */
export type PetraWorkingRelationship = {
  schema_name: "petra.working-relationship";
  schema_version: "1.0.0";
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef1;
  profile_relationship: ProfileRelationshipBinding;
  endpoints: RelationshipEndpoints;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin1;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem, ...BasisItem[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  provenance: [ProvenanceItem, ...ProvenanceItem[]];
  qualifications: Qualifications;
  validation: Validation;
  lineage: RootLineage1 | SupersessionLineage1;
  disposition: "available" | "withdrawn";
  authority_boundary: AuthorityBoundary1;
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
  recorded_at: string;
} & {
  schema_name: "petra.working-relationship";
  schema_version: "1.0.0";
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef1;
  profile_relationship: ProfileRelationshipBinding;
  endpoints: RelationshipEndpoints;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin1;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem, ...BasisItem[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  provenance: [ProvenanceItem, ...ProvenanceItem[]];
  qualifications: Qualifications;
  validation: Validation;
  lineage: RootLineage1 | SupersessionLineage1;
  disposition: "available" | "withdrawn";
  authority_boundary: AuthorityBoundary1;
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
  recorded_at: string;
};
export type ProfileRelationshipBinding = {
  registration: ProfileRegistration1;
  predicate: string;
  relationship_record_ref: ExactTypedRecordRef;
  candidate_operation: "create" | "revise";
  current_authoritative_ref?: ExactTypedRecordRef;
};

/**
 * A renderer-neutral, read-only composition that binds one exact focused-graph selection and return context to either an existing WorkingCandidate and Review preview or an existing SuggestedAction Work preview. It accepts no geometry or gesture state and performs no correction, command, Work start, Review decision, or authority change.
 */
export interface PetraFocusedGraphActionPreviewView {
  schema_name: "petra.focused-graph-action-preview-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ActionPreviewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ActionPreviewContent {
  action_request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  graph_view: GraphView;
  selection: Selection;
  preview: ActionPreview;
  return_context: ReturnContext1;
  authority_boundary: AuthorityBoundary2;
  /**
   * @minItems 1
   * @maxItems 16
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
/**
 * A renderer-neutral, profile-resolved result for one exact bounded relationship question. It preserves Project, definition, snapshot, layer, projection, scope, semantic membership, path, selection, destination, and action meaning without granting a renderer query or mutation authority.
 */
export interface PetraFocusedGraphView {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  task: Task;
  profile: Profile;
  /**
   * @maxItems 2
   */
  source_views:
    | []
    | [
        | {
            schema_name: "petra.project-relationship-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          }
        | {
            schema_name: "petra.project-relationship-overlay-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          },
      ]
    | [
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
      ];
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope;
  /**
   * @maxItems 10000
   */
  nodes: Node[];
  /**
   * @maxItems 10000
   */
  relationships: Relationship[];
  /**
   * @maxItems 10000
   */
  paths: Path[];
  selection:
    | {
        state: "none";
      }
    | {
        state: "selected";
        selection_kind: "node" | "relationship" | "path";
        /**
         * @minItems 1
         * @maxItems 100
         */
        selected_keys: [StableKey, ...StableKey[]];
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  destinations: [
    AvailableDestination | UnavailableDestination,
    ...(AvailableDestination | UnavailableDestination)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  actions: [RegisteredAction, ...RegisteredAction[]];
  authority_boundary: AuthorityBoundary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface Task {
  request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  task_kind:
    | "neighborhood"
    | "provenance"
    | "disagreement"
    | "comparison"
    | "impact"
    | "time";
  task_semantic_key: string;
  question: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  question_hash: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef, ...ExactRef[]];
  origin: Origin;
  return_destination_key: StableKey;
}
export interface ExactRef {
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
  record_hash: string;
}
export interface Origin {
  origin_kind:
    | "brief"
    | "evidence"
    | "review"
    | "petra"
    | "history"
    | "direct"
    | "saved_question";
  origin_ref?: ExactRef;
}
export interface Profile {
  project_definition_ref: ProjectDefinitionRef;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  label: string;
  focused_graph_registration: {
    semantic_key: "petra.focused-graph";
    registration_kind: "extension";
    contract: ContractRef;
  };
  /**
   * @minItems 3
   * @maxItems 1000
   */
  resolved_semantics: [
    ResolvedSemantic,
    ResolvedSemantic,
    ResolvedSemantic,
    ...ResolvedSemantic[],
  ];
}
export interface ProjectDefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface ContractRef {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ResolvedSemantic {
  semantic_key: string;
  role: "task" | "object" | "relationship" | "action";
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "tool"
    | "extension";
  contract: ContractRef;
  term: Term;
}
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
}
export interface ProjectSnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CurrentTemporalPosition {
  position_kind: "current";
  dimension: "project_snapshot";
}
export interface HistoricalTemporalPosition {
  position_kind: "historical";
  dimension:
    "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
  at:
    | {
        state: "exact";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        value: string;
      }
    | {
        state: "unknown";
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
export interface ProjectionPosition {
  authority_source: "postgresql";
  projection_source: "neo4j_rebuildable_projection";
  state: "current" | "catching_up" | "unavailable" | "rebuilding";
  checkpoint_ref?: ExactRef;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  detail: string;
}
export interface Scope {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  included_relationship_semantics: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 3
   */
  directions:
    | ["outgoing" | "incoming" | "bidirectional"]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ];
  /**
   * @minItems 1
   * @maxItems 3
   */
  included_layers:
    | ["current" | "working" | "historical"]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ];
  limits: Limits;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [Omission, ...Omission[]];
}
export interface Limits {
  maximum_depth: number;
  maximum_nodes: number;
  maximum_relationships: number;
  maximum_paths: number;
}
export interface Omission {
  omission_kind:
    | "out_of_scope"
    | "filtered"
    | "capped"
    | "restricted"
    | "missing"
    | "unknown"
    | "unsupported"
    | "projection_unavailable"
    | "working_hidden";
  description: string;
  count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
}
export interface Node {
  node_key: StableKey;
  record_ref: ExactRef;
  semantic_key: string;
  term: Term;
  label: string;
  summary: string;
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  lifecycle: "represented" | "superseded" | "restricted" | "missing";
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: StableKey[];
}
export interface Basis {
  summary: string;
  /**
   * @maxItems 1000
   */
  record_refs: ExactRef[];
  /**
   * @maxItems 100
   */
  limitations: string[];
}
export interface Relationship {
  relationship_key: StableKey;
  relationship_ref: GraphElementRef;
  semantic_key: string;
  term: Term;
  predicate: string;
  meaning_kind:
    | "citation"
    | "support"
    | "contradiction"
    | "qualification"
    | "inference"
    | "structural"
    | "provenance"
    | "governance"
    | "dependency";
  source_node_key: StableKey;
  target_node_key: StableKey;
  direction: "outgoing" | "incoming" | "bidirectional";
  origin:
    | "canonical_record"
    | "working_candidate"
    | "historical_record"
    | "model_inference";
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  summary: string;
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: StableKey[];
}
export interface GraphElementRef {
  element_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Path {
  path_key: StableKey;
  state: "complete" | "partial" | "no_path";
  ordering_rationale: string;
  /**
   * @maxItems 10000
   */
  steps: PathStep[];
  /**
   * @maxItems 100
   */
  limitations: string[];
}
export interface PathStep {
  position: number;
  from_node_key: StableKey;
  relationship_key: StableKey;
  to_node_key: StableKey;
  traversal_direction: "outgoing" | "incoming";
  repeated_member: boolean;
}
export interface AvailableDestination {
  destination_key: StableKey;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "available";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  target_ref: ExactRef;
}
export interface UnavailableDestination {
  destination_key: StableKey;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "unavailable";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  reason: string;
}
export interface RegisteredAction {
  action_key: StableKey;
  action_kind:
    | "inspect_details"
    | "open_source"
    | "inspect_path"
    | "expand_recorded"
    | "prepare_correction"
    | "open_review"
    | "preview_work"
    | "return_to_origin";
  semantic_key: string;
  label: string;
  consequence:
    | "read_only_navigation"
    | "read_only_expansion"
    | "prepares_working_candidate"
    | "opens_canonical_review"
    | "previews_typed_work";
  /**
   * @minItems 1
   * @maxItems 100
   */
  target_keys: [StableKey, ...StableKey[]];
  availability:
    | {
        state: "available";
        destination_key?: StableKey;
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
export interface AuthorityBoundary {
  postgresql_authoritative: true;
  neo4j_rebuildable_projection: true;
  renderer_neutral: true;
  renderer_queries_projection: false;
  layout_grants_authority: false;
  selection_grants_authority: false;
  actions_issue_domain_mutation: false;
  correction_requires_canonical_owner: true;
  work_requires_typed_preview: true;
}
/**
 * An additive focused-graph result for one snapshot-bound named expansion. It preserves the 1.0 authority and semantic membership boundary while making the registered recipe, normalized filters, groups, hidden membership, cycles, caps, restricted paths, incomplete state, and unknowns explicit.
 */
export interface PetraFocusedGraphViewV110 {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent1 {
  task: Task;
  profile: Profile;
  /**
   * @maxItems 2
   */
  source_views:
    | []
    | [
        | {
            schema_name: "petra.project-relationship-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          }
        | {
            schema_name: "petra.project-relationship-overlay-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          },
      ]
    | [
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
      ];
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope1;
  exploration: NamedExploration;
  /**
   * @minItems 1
   * @maxItems 100
   */
  groups: [Group, ...Group[]];
  /**
   * @maxItems 10000
   */
  nodes: Node[];
  /**
   * @maxItems 10000
   */
  relationships: Relationship[];
  /**
   * @maxItems 10000
   */
  paths: Path[];
  selection:
    | {
        state: "none";
      }
    | {
        state: "selected";
        selection_kind: "node" | "relationship" | "path";
        /**
         * @minItems 1
         * @maxItems 100
         */
        selected_keys: [StableKey, ...StableKey[]];
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  destinations: [
    AvailableDestination | UnavailableDestination,
    ...(AvailableDestination | UnavailableDestination)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  actions: [RegisteredAction, ...RegisteredAction[]];
  authority_boundary: AuthorityBoundary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface Scope1 {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  included_relationship_semantics: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 3
   */
  directions:
    | ["outgoing" | "incoming" | "bidirectional"]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ];
  /**
   * @minItems 1
   * @maxItems 3
   */
  included_layers:
    | ["current" | "working" | "historical"]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ];
  limits: Limits;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [Omission, ...Omission[]];
}
export interface NamedExploration {
  mode: "named_expansion";
  expansion_key: StableKey;
  recipe_semantic_key: string;
  recipe_label: string;
  target_ref: ExactRef;
  target_node_key: StableKey;
  maximum_depth: number;
  filters: ExplorationFilters;
  accounting: ExplorationAccounting;
}
export interface ExplorationFilters {
  /**
   * @minItems 1
   * @maxItems 9
   */
  meaning_kinds:
    | [
        | "citation"
        | "support"
        | "contradiction"
        | "qualification"
        | "inference"
        | "structural"
        | "provenance"
        | "governance"
        | "dependency",
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ];
  /**
   * @minItems 1
   * @maxItems 2
   */
  directions:
    | ["outgoing" | "incoming"]
    | ["outgoing" | "incoming", "outgoing" | "incoming"];
  /**
   * @minItems 1
   * @maxItems 4
   */
  origins:
    | [
        | "canonical_record"
        | "working_candidate"
        | "historical_record"
        | "model_inference",
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ];
}
export interface ExplorationAccounting {
  result_state: "complete_for_scope" | "partial" | "capped" | "unknown";
  capped_members:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  hidden_relationships:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  restricted_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  cycle_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  incomplete_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  unknown_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
}
export interface Group {
  group_key: StableKey;
  facet: "relationship_meaning";
  label: string;
  membership_rule: string;
  count_unit: "relationships";
  layer: "current" | "working" | "historical";
  meaning_kind:
    | "citation"
    | "support"
    | "contradiction"
    | "qualification"
    | "inference"
    | "structural"
    | "provenance"
    | "governance"
    | "dependency";
  /**
   * @maxItems 10000
   */
  member_relationship_keys: StableKey[];
  returned_count: number;
  total_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  filtered_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  hidden_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  overlap: false;
}
export interface Selection {
  selection_kind: "node" | "relationship" | "path";
  /**
   * @minItems 1
   * @maxItems 100
   */
  selected_keys: [string, ...string[]];
}
export interface GovernedCorrectionPreview {
  preview_kind: "governed_correction";
  requested_change: "edit_relationship" | "relink" | "split" | "change_scope";
  selected_relationship: Relationship;
  review_session_ref: ReviewSessionRef;
  review_member_id: string;
  working_candidate_ref: WorkingCandidateRef;
  /**
   * @minItems 1
   * @maxItems 100
   */
  working_relationship_refs: [
    WorkingRelationshipRef,
    ...WorkingRelationshipRef[],
  ];
  review_view: ReviewView;
  /**
   * @minItems 1
   * @maxItems 16
   */
  affected_scope:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  /**
   * @minItems 1
   * @maxItems 16
   */
  unchanged:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  operation: {
    state: "preview_only";
    working_revision: "only_after_canonical_correction_submission";
    review_decision: "not_performed";
    authority_change: "only_after_validated_review_apply";
    cancellation: "closing_preview_leaves_domain_state_unchanged";
  };
}
export interface ReviewSessionRef {
  review_session_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  lifecycle: "open";
}
export interface WorkingCandidateRef {
  working_candidate_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkingRelationshipRef {
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
/**
 * An additive Review read that preserves the 1.1 canonical composition and exposes the exact stored ReviewSession lifecycle beside its revision and content hash. Lifecycle is coordination state only; it does not express command eligibility, validation force, Review decision, completion, or mutation authority.
 */
export interface PetraProjectReviewViewV120 {
  schema_name: "petra.project-review-view";
  schema_version: "1.2.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember, ...ReviewMember[]];
  authority: AuthorityPosition;
  projection: UnavailableProjection | AvailableProjection;
}
/**
 * The exact canonical ReviewSession record position and its separately derived display summary. Lifecycle does not imply that a transition is eligible or authorized.
 */
export interface SessionSummary {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * The lifecycle stored on this exact ReviewSession revision. It is not an operation descriptor or an authority grant.
   */
  lifecycle: "open" | "deferred" | "completed";
  title: string;
  objective_summary: string;
  objective?: ObjectiveSummary;
  status: "needs_decision" | "waiting" | "completed";
  status_label: string;
  responsible: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    display_name: string;
  };
  project_definition_ref: DefinitionRef;
  project_definition_label: string;
  snapshot: ProjectSnapshot;
  snapshot_state: "current" | "stale";
  origin: OriginSummary;
  return_context: ReturnContext;
}
export interface ObjectiveSummary {
  objective_ref: ExactRef1;
  objective_kind: string;
  statement: string;
}
export interface ExactRef1 {
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
export interface DefinitionRef {
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
export interface ProjectSnapshot {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface OriginSummary {
  origin_kind:
    | "direct_edit"
    | "evidence_extraction"
    | "work_result"
    | "interaction"
    | "history_reversal";
  /**
   * @minItems 1
   * @maxItems 100
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_refs: [string, ...string[]];
  label: string;
  detail: string;
}
export interface ReturnContext {
  place:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "profile_tool";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_ref?: string;
  label: string;
}
export interface ReviewMember {
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: CandidateSummary;
  working_state: WorkingStateComposition;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  basis: [BasisItem1, ...BasisItem1[]];
  validation: ValidationSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  consequences: [string, ...string[]];
  /**
   * @maxItems 100
   */
  change_sets: ChangeSetSummary[];
}
export interface CandidateSummary {
  candidate_id: string;
  revision_label: string;
  kind_label: string;
  current: string;
  proposed: string;
  difference: string;
  origin_label: string;
  origin_detail: string;
  profile_payload: ScientificEvidencePayload;
}
export interface ScientificEvidencePayload {
  payload_kind: "scientific_evidence_pair";
  claim_ref: ExactRecordRef;
  assertion_ref: ExactRecordRef;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  assertion_predicate: "ASSERTS";
  /**
   * @maxItems 100
   */
  scope_dimensions: string[];
}
export interface ExactRecordRef {
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
  record_hash: string;
}
export interface WorkingStateComposition {
  candidate: PetraWorkingCandidate;
  /**
   * @minItems 1
   * @maxItems 100
   */
  relationships: [PetraWorkingRelationship, ...PetraWorkingRelationship[]];
  selection_basis: "exact_review_session_working_bindings";
  authority_effect: "none";
}
export interface ProjectDefinitionRef1 {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface ProfileRegistration {
  registration_kind: "object_schema";
  semantic_key: string;
  contract: NamedVersionHash;
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExactTypedRecordRef {
  schema_name: string;
  schema_version: string;
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
  record_hash: string;
}
export interface HumanProducer {
  producer_kind: "human";
  actor: HumanActorRef;
  contribution_kind: "direct_edit" | "human_extraction";
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ServiceProducer {
  producer_kind: "service";
  actor: ServiceActorRef;
  contribution_kind: "tool_output" | "import" | "deterministic_mapping";
  service_role_ref: NamedVersionHash;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
export interface ModelProducer {
  producer_kind: "model";
  actor: ModelActorRef;
  contribution_kind: "model_output";
  model_role_ref: NamedVersionHash;
  model_call_ref: ExactTypedRecordRef;
}
export interface ModelActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "model";
}
export interface ThreadTurnTask {
  task_kind: "thread_turn";
  objective_ref: ExactTypedRecordRef;
  thread_binding: ThreadBinding;
}
export interface ThreadBinding {
  project_thread_ref: ExactTypedRecordRef;
  project_turn_id: string;
}
export interface WorkUnitTask {
  task_kind: "work_unit";
  objective_ref: ExactTypedRecordRef;
  work_unit_ref: ExactTypedRecordRef;
}
export interface InteractionWorkTask {
  task_kind: "interaction_work";
  objective_ref: ExactTypedRecordRef;
  thread_binding: ThreadBinding;
  work_unit_ref: ExactTypedRecordRef;
  interaction_run_ref: ExactTypedRecordRef;
}
export interface InputSnapshot {
  snapshot_ref: ProjectSnapshotRef1;
  context_packet_ref?: ExactTypedRecordRef;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  input_record_refs: [ExactTypedRecordRef, ...ExactTypedRecordRef[]];
}
export interface ProjectSnapshotRef1 {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Origin1 {
  origin_kind:
    | "direct_edit"
    | "model_output"
    | "tool_output"
    | "import"
    | "extraction"
    | "work_result";
  /**
   * @minItems 1
   * @maxItems 100
   */
  source_record_refs: [ExactTypedRecordRef, ...ExactTypedRecordRef[]];
  summary: string;
}
export interface BasisItem {
  basis_role:
    | "source"
    | "current_state"
    | "instruction"
    | "constraint"
    | "prior_work"
    | "author_judgment";
  record_ref: ExactTypedRecordRef;
  summary: string;
}
export interface ProvenanceItem {
  provenance_role:
    | "derivation"
    | "input"
    | "output"
    | "model_call"
    | "interaction"
    | "work_result"
    | "prior_revision";
  record_ref: ExactTypedRecordRef;
  statement: string;
}
export interface QualificationStatement {
  qualification_kind: "uncertainty" | "limitation";
  statement: string;
  basis_ref?: ExactTypedRecordRef;
}
export interface ValidationResult {
  validator_ref: NamedVersionHash;
  outcome: "passed" | "warning" | "failed" | "blocked";
  code: string;
  statement: string;
  validated_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  validated_at: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface RootLineage {
  lineage_kind: "root";
}
export interface SupersessionLineage {
  lineage_kind: "supersession";
  supersedes: WorkingCandidateRef;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface AuthorityBoundary1 {
  domain_authority: false;
  review_decision: false;
  mutation_authority: false;
  validation_grants_authority: false;
  promotion_requires_review: true;
}
export interface ProfileRegistration1 {
  registration_kind: "relationship_schema";
  semantic_key: string;
  contract: NamedVersionHash;
}
export interface RelationshipEndpoints {
  subject: ProfileRecordEndpoint | WorkingCandidateEndpoint | LiteralEndpoint;
  object: ProfileRecordEndpoint | WorkingCandidateEndpoint | LiteralEndpoint;
}
export interface ProfileRecordEndpoint {
  endpoint_kind: "profile_record";
  record_ref: ExactTypedRecordRef;
}
export interface WorkingCandidateEndpoint {
  endpoint_kind: "working_candidate";
  candidate_ref: WorkingCandidateRef;
}
export interface LiteralEndpoint {
  endpoint_kind: "literal";
  literal_type: "string" | "boolean" | "integer" | "decimal" | "timestamp";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  value_hash: string;
}
export interface RootLineage1 {
  lineage_kind: "root";
}
export interface SupersessionLineage1 {
  lineage_kind: "supersession";
  supersedes: WorkingRelationshipRef;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface BasisItem1 {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  basis_id: string;
  label: string;
  relation: string;
  extent: string;
  detail: string;
  project_source_id?: string;
  project_source_status?: "active" | "excluded";
  source_span_ref?: ExactRecordRef;
}
export interface ValidationSummary {
  state: "passed" | "needs_judgment" | "blocked";
  label: string;
  detail: string;
  recovery?: string;
}
export interface ChangeSetSummary {
  change_set_ref: ExactRef1;
  state: "submitted" | "approved" | "rejected" | "applied" | "conflicted";
  atomicity: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  changes: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 100
   */
  protected: [string, ...string[]];
  impact_summary: string;
  approval_ref?: ExactRecordRef;
  /**
   * @maxItems 100
   */
  commands: CommandTrace[];
  /**
   * @maxItems 100
   */
  events: EventTrace[];
}
export interface CommandTrace {
  command_id: string;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  error_code?: string;
  error_message?: string;
}
export interface EventTrace {
  event_id: string;
  event_type:
    | "change_set.submitted"
    | "approval.recorded"
    | "change_set.applied"
    | "change_set.conflicted";
  event_position: number;
  stream_revision: number;
  command_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface UnavailableProjection {
  state: "unavailable";
  reason: string;
}
export interface AvailableProjection {
  state: "current" | "catching_up" | "blocked";
  checkpoint_ref: ExactRef1;
  represented_event_position: number;
  represented_stream_revision: number;
  represented_target_sequence: number;
  observed_event_position: number;
  observed_stream_revision: number;
  observed_target_sequence: number;
  pending_records: number;
  failure_code?: string;
}
/**
 * An additive paired-profile Review read that preserves the exact 1.2 lifecycle and 1.1 working-state composition while allowing only installed scientific evidence or controlled-writing Requirement-GOVERNS payloads. The controlled-writing payload is non-authoritative and exposes no ChangeSet operation, Approval, or Apply path.
 */
export interface PetraProjectReviewViewV130 {
  schema_name: "petra.project-review-view";
  schema_version: "1.3.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent1 {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember1, ...ReviewMember1[]];
  authority: AuthorityPosition;
  projection: UnavailableProjection | AvailableProjection;
}
export interface ReviewMember1 {
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: CandidateSummary1;
  working_state: WorkingStateComposition;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  basis: [BasisItem1, ...BasisItem1[]];
  validation: ValidationSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  consequences: [string, ...string[]];
  /**
   * @maxItems 100
   */
  change_sets: ChangeSetSummary[];
}
export interface CandidateSummary1 {
  candidate_id: string;
  revision_label: string;
  kind_label: string;
  current: string;
  proposed: string;
  difference: string;
  origin_label: string;
  origin_detail: string;
  profile_payload: ScientificEvidencePayload | ControlledWritingPayload;
}
/**
 * The exact registered controlled-writing Requirement and GOVERNS records selected for Review. Their inclusion grants no mutation or domain authority.
 */
export interface ControlledWritingPayload {
  payload_kind: "controlled_writing_requirement";
  requirement_ref: ExactTypedRecordRef & {
    schema_name: "petra.controlled-writing-requirement";
    schema_version: "1.0.0";
    [k: string]: unknown;
  };
  governing_relationship_ref: ExactTypedRecordRef & {
    schema_name: "petra.controlled-writing-governing-relationship";
    schema_version: "1.0.0";
    [k: string]: unknown;
  };
  authority_source_ref: ExactTypedRecordRef & {
    schema_name: "petra.project-source";
    schema_version: "1.0.0";
    [k: string]: unknown;
  };
  requirement_kind: "obligation" | "constraint";
  relationship_predicate: "GOVERNS";
  apply_available: false;
}
export interface NewWorkPreview {
  preview_kind: "new_work";
  /**
   * @minItems 1
   * @maxItems 100
   */
  selected_member_keys: [StableKey, ...StableKey[]];
  inquiry_result_link_ref: InquiryLinkRef;
  suggested_action_view: PetraSuggestedActionViewV110;
  operation: {
    state: "preview_only";
    work_start: "only_after_exact_invocation";
    authority_change: "none";
    delivery_abort: "does_not_cancel_work";
    work_cancellation: "separate_authorized_command";
  };
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
/**
 * A Project-scoped SuggestedAction preview that preserves the 1.0 exact read action and adds one exact, bounded grounded-synthesis Work action. It starts no Work while read.
 */
export interface PetraSuggestedActionViewV110 {
  schema_name: "petra.suggested-action-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: WorkPreviewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface WorkPreviewContent {
  view_kind: "preview";
  action_ref: SuggestedActionRef;
  action: WorkAction;
  readiness: WorkReady | WorkStale | WorkUnavailable;
  operation: {
    state: "command_ready";
    work_start: "only_after_exact_invocation";
    authority_change: "none";
  };
  authority: AuthorityPosition1;
  /**
   * @minItems 1
   * @maxItems 16
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkAction {
  action_kind: "run_grounded_synthesis";
  title: string;
  objective: Objective;
  reason: string;
  basis: WorkBasis;
  scope: {
    scope_kind: "exact_grounded_synthesis_rerun";
    included: string;
    /**
     * @minItems 1
     * @maxItems 8
     */
    excluded:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string];
  };
  /**
   * @maxItems 16
   */
  missing_information:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  response_depth: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    allowed: ["current_graph"];
    recommended: "current_graph";
    adjustable: false;
  };
  expected_result: {
    state: "new_work_result";
    result_kind: "grounded_response";
    authority_effect: "none";
    reusable: true;
  };
  resources: {
    estimate_state: "bounded_limits";
    duration: "unknown_with_hard_limit";
    cost: "zero_monetary_cost_expected";
    basis: "certified_grounded_synthesis_profile";
    limits: ResourceLimits;
  };
  execution: {
    workflow_name: "petra.synthesis.grounded";
    workflow_version: "1.0.0";
    task_name: "petra.synthesis.grounded";
    worker_name: "petra.grounded_synthesis";
    validator: "petra.grounded-synthesist-profile@1.1.0";
    prompt: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    prompt_hash: string;
    network_policy: "managed_provider_allowlist";
  };
  capability: {
    command_name: "InvokeSuggestedAction";
    approval: "not_required_after_exact_invocation";
  };
  interrupt: {
    input_expectation: "none";
    delivery_abort: "does_not_cancel_work";
    reconnect: "exact_interaction_replay";
  };
  cancellation: {
    policy: "cancellable";
    command_name: "CancelWorkUnit";
    consequence: "explicit_command_cancels_work_and_preserves_recorded_history";
  };
  invocation: {
    kind: "authenticated_command";
    contract_name: "petra.suggested-action-invocation-request";
    contract_version: "1.0.0";
    command_name: "InvokeSuggestedAction";
    idempotency: "exact_command_and_work_convergence";
    path_convergence: "direct_and_conversational_same_command";
  };
}
export interface Objective {
  objective_ref: ObjectiveRef;
  semantic_key: string;
  statement: string;
}
export interface ObjectiveRef {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkBasis {
  derivation: "exact_immutable_inquiry_result_link";
  project_definition_ref: DefinitionRef1;
  objective_ref: ObjectiveRef;
  inquiry_result_link_ref: InquiryLinkRef;
  source_result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  context_packet_ref: PacketRef;
  evidence_packet_ref: PacketRef;
}
export interface DefinitionRef1 {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
export interface PacketRef {
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
export interface ResourceLimits {
  max_wall_time_ms: number;
  max_output_bytes: number;
  max_attempts: number;
  max_parallelism: number;
  max_cpu_time_ms?: number;
  max_memory_bytes?: number;
  max_storage_bytes?: number;
  max_network_bytes?: number;
  max_gpu_time_ms?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  monetary_limit?: MonetaryLimit;
}
export interface MonetaryLimit {
  currency: string;
  max_microunits: number;
}
export interface WorkReady {
  state: "ready";
  reason_code: "exact_grounded_work_authorized";
  reason: string;
  /**
   * @maxItems 0
   */
  missing_prerequisites: [];
  grant_ref: GrantRef;
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
export interface WorkStale {
  state: "stale";
  reason_code:
    | "project_definition_changed"
    | "objective_changed"
    | "objective_inactive"
    | "source_result_invalidated";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
  regeneration: {
    operation: "regenerate_suggested_action";
    basis: "current_project_authority";
  };
}
export interface WorkUnavailable {
  state: "unavailable";
  reason_code:
    | "authenticated_actor_unavailable"
    | "capability_grant_missing"
    | "capability_grant_ambiguous";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
}
export interface AuthorityPosition1 {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface ReturnContext1 {
  graph_request_id: string;
  selection: Selection;
  origin: Origin;
  destination: AvailableDestination | UnavailableDestination;
}
export interface AuthorityBoundary2 {
  postgresql_authoritative: true;
  neo4j_projection_only: true;
  focused_graph_owner_reused: true;
  working_candidate_owner: "reused" | "not_applicable";
  review_owner: "reused" | "not_applicable";
  suggested_action_owner: "reused" | "not_applicable";
  work_preview_owner: "reused" | "not_applicable";
  preview_is_read_only: true;
  selection_grants_authority: false;
  renderer_state_accepted: false;
  command_issued: false;
  work_started: false;
}
