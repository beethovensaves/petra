/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable outcome of one authorized source-version intake, including the exact successor and a server-owned handoff to separately governed predecessor exclusion and replacement creation.
 */
export interface PetraProjectSourceRevisionReceipt {
  schema_name: "petra.project-source-revision-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: HumanActorRef;
  capability_grant_id: string;
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  predecessor_source_ref: CurrentSourceRef;
  work_ref: ExactRecordRef;
  work_version_ref: ExactRecordRef;
  material: Material;
  successor_source_ref: SuccessorSourceRef;
  effect: Effect;
  replacement_handoff: ReplacementHandoff;
  destination: SourceDestination;
  recovery: Recovery;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ProjectRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface CurrentSourceRef {
  project_source_id: string;
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
  status: "active";
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
export interface Material {
  artifact_ref: ArtifactRef;
  artifact_manifest_ref: ExactRecordRef;
  rights_decision_ref: ExactRecordRef;
  storage: {
    store_name: string;
    object_key: string;
    availability: "available";
  };
  origin: {
    origin_kind: "user_supplied";
    original_filename: string;
    source_location: string;
  };
}
export interface ArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface SuccessorSourceRef {
  project_source_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  status: "active";
}
export interface Effect {
  kind: "source_revision_intake_retained";
  summary: string;
  predecessor_unchanged: true;
}
export interface ReplacementHandoff {
  state: "governed_replacement_required";
  exclude_predecessor: {
    command_name: "ExcludeProjectSource";
    method: "POST";
    path: string;
    requested_action: "exclude_project_source";
    expected_source_ref: CurrentSourceRef;
    reason: string;
  };
  create_replacement: {
    command_name: "CreateProjectSourceReplacement";
    method: "POST";
    path: string;
    replacement_kind: "newer_version";
    replaced_source_from: "exclude_result.resulting_source_ref";
    replacement_source_ref: SuccessorSourceRef;
    exclusion_receipt_from: "exclude_result.receipt";
    rationale: string;
  };
}
export interface SourceDestination {
  place_role: "sources";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
}
export interface Recovery {
  command_path: string;
  assessment_path: string;
  retry_reuses_command_identity: true;
  missing_receipt_means_unknown: true;
}
