/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Page = {
  returned_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
};
export type OpenQuestion =
  | {
      state: "available";
      /**
       * @minItems 1
       * @maxItems 100
       */
      items: [string, ...string[]];
      basis: "authored_active_framing";
    }
  | Unavailable;

/**
 * A read-only, snapshot-consistent collection or detail view over ProjectDefinition-mapped inquiry anchors and their exact Work/result links.
 */
export interface PetraProjectInquiryView {
  schema_name: "petra.project-inquiry-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: CollectionContent | DetailContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface CollectionContent {
  view_kind: "collection";
  project_definition_ref: DefinitionRef;
  query: CollectionQuery;
  /**
   * @maxItems 100
   */
  inquiries: InquirySummary[];
  page: Page;
  /**
   * @minItems 1
   * @maxItems 1
   */
  operations: [Operation];
  authority: AuthorityPosition;
}
export interface DefinitionRef {
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
export interface CollectionQuery {
  limit: number;
  cursor?: string;
  authored_status?: "active" | "satisfied" | "superseded" | "abandoned";
  work_unit_id?: string;
}
export interface InquirySummary {
  role: RoleSummary;
  inquiry_anchor_ref: ObjectiveRef;
  original_framing: string;
  current_framing: string;
  authored_status: "active" | "satisfied" | "superseded" | "abandoned";
  resolution_boundary: "authored_status_only";
  parent_ref?: ObjectiveRef;
  dependency_count: number;
  linked_work_count: number;
  linked_result_count: number;
  operational_work: OperationalCounts;
  destination: Destination;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface RoleSummary {
  role_ref: RoleRef;
  semantic_key: string;
  singular: string;
  plural: string;
  representation_kind: "project_objective";
}
export interface RoleRef {
  project_inquiry_role_id: string;
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
export interface OperationalCounts {
  active: number;
  completed: number;
  cancelled: number;
}
export interface Destination {
  role: "brief";
  objective_ref: ObjectiveRef;
}
export interface Operation {
  operation: "create" | "revise" | "focus" | "link_work" | "unlink";
  state: "unavailable";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface DetailContent {
  view_kind: "detail";
  project_definition_ref: DefinitionRef;
  summary: InquirySummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  framing_history: [FramingRevision, ...FramingRevision[]];
  /**
   * @maxItems 1001
   */
  related_inquiries: RelatedInquiry[];
  open_questions: OpenQuestion;
  current_understanding: Unavailable;
  basis: Unavailable;
  /**
   * @maxItems 10000
   */
  work_links: WorkLink[];
  /**
   * @maxItems 10000
   */
  result_links: ResultLink[];
  recommendation: Unavailable;
  /**
   * @minItems 10
   * @maxItems 10
   */
  coverage: [
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
    CoverageItem,
  ];
  /**
   * @minItems 4
   * @maxItems 4
   */
  operations: [Operation, Operation, Operation, Operation];
  authority: AuthorityPosition;
}
export interface FramingRevision {
  objective_ref: ObjectiveRef;
  statement: string;
  authored_status: "active" | "satisfied" | "superseded" | "abandoned";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface RelatedInquiry {
  relationship: "parent" | "dependency";
  objective_ref: ObjectiveRef;
  framing: string;
  authored_status: "active" | "satisfied" | "superseded" | "abandoned";
}
export interface Unavailable {
  state: "unavailable";
  reason: string;
}
export interface WorkLink {
  link_ref: LinkRef;
  relationship: "addresses";
  linked_work_ref: WorkUnitRef;
  current_work: CurrentWork;
}
export interface LinkRef {
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface CurrentWork {
  work_unit_ref: WorkUnitRef;
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface ResultLink {
  link_ref: LinkRef;
  bearing: "addresses" | "admissible_basis" | "accepted_finding";
  result_ref: TypedRecordRef;
  produced_by_work_ref?: WorkUnitRef;
  authority_statement: string;
}
export interface TypedRecordRef {
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
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface CoverageItem {
  area:
    | "identity"
    | "framing"
    | "relationships"
    | "open_questions"
    | "understanding"
    | "basis"
    | "work"
    | "results"
    | "recommendation"
    | "commands";
  state: "complete" | "partial" | "unavailable";
  limitation?: string;
}
