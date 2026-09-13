/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type RepresentationSummary = {
  extent: "identity_only" | "partial" | "complete" | "restricted";
  extent_label: string;
  document_ref?: ExactRef;
  source_format?:
    "pdf" | "html" | "xml" | "json" | "plain_text" | "code" | "image" | "other";
  document_language?: string;
  quality_state?: "complete" | "partial" | "needs_ocr" | "failed";
  page_count: number;
  block_count: number;
  source_span_count: number;
  preview?: Preview;
};
/**
 * @maxItems 100
 */
export type Limitations = string[];

export interface PetraResearchBriefPayload {
  schema_name: "petra.research-brief-payload";
  schema_version: "1.1.0";
  /**
   * @maxItems 20
   */
  sources:
    | []
    | [PetraProjectSourceView]
    | [PetraProjectSourceView, PetraProjectSourceView]
    | [PetraProjectSourceView, PetraProjectSourceView, PetraProjectSourceView]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ];
  source_coverage: "complete" | "partial";
  /**
   * @minItems 1
   */
  limitations: [string, ...string[]];
  current_state: {
    /**
     * @maxItems 20
     */
    syntheses:
      | []
      | [RetainedSynthesis]
      | [RetainedSynthesis, RetainedSynthesis]
      | [RetainedSynthesis, RetainedSynthesis, RetainedSynthesis]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ];
    coverage: {
      scope: "addressing_results_in_returned_current_objective_links";
      state: "complete" | "partial";
      link_limit: 20;
    };
    /**
     * @minItems 1
     */
    limitations: [string, ...string[]];
  };
}
/**
 * A read-only, snapshot-consistent source composition from the M1 scholarly ProjectSource binding and its authority chain.
 */
export interface PetraProjectSourceView {
  schema_name: "petra.project-source-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string & string;
  project_source_id: string;
  content: SourceViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface SourceViewContent {
  binding: BindingSummary;
  identity: IdentitySummary;
  copy: CopySummary;
  rights: RightsSummary;
  representation: RepresentationSummary;
  downstream_use: DownstreamUse;
  authority: AuthorityPosition;
}
export interface BindingSummary {
  binding_kind: "scientific_work_version";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  project_definition_ref: ExactRef;
  source_role: string;
  source_role_label: string;
  status: "active" | "excluded";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
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
  content_hash: string;
}
export interface IdentitySummary {
  work_ref: ExactRef;
  title: string;
  work_kind:
    | "journal_article"
    | "conference_paper"
    | "preprint"
    | "thesis"
    | "book"
    | "chapter"
    | "other";
  identity_status: "resolved" | "provisional" | "disputed";
  work_version_ref: ExactRef;
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  published_date?: PublishedDate;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  creators: [CreatorSummary, ...CreatorSummary[]];
}
export interface PublishedDate {
  precision: "year" | "month" | "day";
  value: string;
}
export interface CreatorSummary {
  author_ref: ExactRef;
  display_name: string;
  author_kind: "person" | "organization" | "consortium";
  identity_status: "resolved" | "provisional" | "disputed";
}
export interface CopySummary {
  manifest_ref: ExactRef;
  artifact_ref: ExactRef;
  artifact_kind:
    | "pdf"
    | "html"
    | "structured_text"
    | "dataset"
    | "code"
    | "environment_lock"
    | "run_output"
    | "image"
    | "export";
  media_type: string;
  byte_size: number;
  origin_kind: "acquired" | "user_supplied" | "generated";
  source_location: string;
  original_filename?: string;
  availability: "available";
  integrity_status: "verified" | "verified_with_warnings";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface RightsSummary {
  rights_ref: ExactRef;
  license_status: "known" | "unknown" | "restricted";
  license_label: string;
  access_basis:
    | "open_license"
    | "public_repository"
    | "subscription"
    | "user_supplied"
    | "permission"
    | "unknown";
  decision_status:
    "verified" | "inferred" | "unknown" | "conflicting" | "restricted";
  permissions: Permissions;
  conditions: (
    | "attribution"
    | "notice"
    | "noncommercial"
    | "share_alike"
    | "no_derivatives"
  )[];
  policy_version: string;
}
export interface Permissions {
  store_raw_bytes: boolean;
  parse: boolean;
  index: boolean;
  embed: boolean;
  send_selected_text_remotely: boolean;
  quote_publicly: boolean;
  redistribute_artifact: boolean;
}
export interface Preview {
  span_ref: ExactRef;
  structural_block_ref: ExactRef;
  heading: string;
  locator: string;
  text: string;
  verification_status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
}
export interface DownstreamUse {
  claim_count: number;
  assertion_count: number;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface RetainedSynthesis {
  project_inquiry_link_id: string;
  linked_response: PetraGroundedResponse;
  current_response: PetraGroundedResponse;
  context_packet: PetraContextPacket;
  evidence_packet: PetraEvidencePacket;
  output: PetraModelSynthesistOutput;
}
/**
 * A revisioned operational record binding immutable grounded-response bytes to their exact scientific, model, WorkUnit, interaction, and cache dependencies. Invalidation never rewrites the Artifact or scientific authority.
 */
export interface PetraGroundedResponse {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  grounded_response_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string & string;
  lineage:
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
  cache: ReusableCache | InvalidatedCache;
  terminal: PersistedTerminal;
}
export interface ResponseArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
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
  context_packet_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface SnapshotRef {
  snapshot_id: string & string;
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
  model_request_id: string & string;
  model_call_id: string & string;
  model_deployment_id: string & string;
  role_certification_id: string & string;
}
export interface InteractionRef {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef;
}
export interface InteractionRunRef {
  interaction_run_id: string & string;
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
  work_unit_id: string & string;
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
  cache_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
}
export interface InvalidatedCache {
  state: "invalidated";
  cache_key: string;
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
  event_id: string & string;
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
  actor_id: string & string;
  actor_kind: "service";
}
/**
 * An immutable, bounded manifest of the exact scientific records authorized as context for one objective, snapshot, and recipe revision.
 */
export interface PetraContextPacket {
  schema_name: "petra.context-packet";
  schema_version: "1.0.0";
  context_packet_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string & string;
  snapshot_ref: SnapshotRef;
  recipe_ref: ContextRecipeRef;
  content: ContextPacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface ContextRecipeRef {
  context_recipe_id: string & string;
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
  omissions: (KnownObjectOmission | SearchBoundaryOmission)[];
  coverage: Coverage;
  budget: PacketBudget;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency1, ...Dependency1[]];
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
  target_refs: (ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef)[];
}
export interface ContextInclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
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
  authority:
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
  source_span_refs: (string & string)[];
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
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
  material: boolean;
  detail: string;
}
export interface SearchBoundaryOmission {
  omission_kind: "search_boundary";
  boundary: string;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
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
export interface Dependency1 {
  dependency_kind:
    "record" | "artifact" | "schema" | "projection" | "ranking" | "policy";
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ServiceActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
  actor_kind: "service";
}
/**
 * An immutable composition-specific selection over one exact ContextPacket; inclusion records authorized evidence, not truth.
 */
export interface PetraEvidencePacket {
  schema_name: "petra.evidence-packet";
  schema_version: "1.0.0";
  evidence_packet_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string & string;
  snapshot_ref: SnapshotRef;
  content: EvidencePacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface EvidencePacketContent {
  context_packet_ref: ContextPacketRef1;
  composition_objective: string;
  temporal_perspective:
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
  freshness:
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
}
export interface ContextPacketRef1 {
  context_packet_id: string & string;
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
/**
 * A provider-neutral bounded scientific response whose material statements declare epistemic origin and exact EvidencePacket references; it contains no authority state or mutation commands.
 */
export interface PetraModelSynthesistOutput {
  schema_name: "petra.model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * @minItems 1
   * @maxItems 100
   */
  statements: [
    (
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    ),
    ...(
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    )[],
  ];
  coverage: CoverageDisclosure;
}
export interface SourceReportStatement {
  statement_key: string;
  origin: "source_report";
  text: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface EvidenceRef {
  context_selection_order: number;
  object_kind: "claim" | "assertion";
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  source_span_selection_orders: [number, ...number[]];
}
export interface PetraSynthesisStatement {
  statement_key: string;
  origin: "petra_synthesis";
  text: string;
  /**
   * @minItems 2
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface UnresolvedInferenceStatement {
  statement_key: string;
  origin: "unresolved_inference";
  text: string;
  /**
   * @maxItems 20
   */
  evidence_refs:
    | []
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
  resolution_requirement: string;
}
export interface CoverageDisclosure {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  material_omissions_acknowledged: boolean;
  abstract_only_sources_used: boolean;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
