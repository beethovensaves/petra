/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * Server-owned eligibility, retention, dependency, and recovery assessment for one exact local source copy.
 */
export interface PetraProjectSourceLocalCopyDeletionPreview {
  schema_name: "petra.project-source-local-copy-deletion-preview";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  expected: Expected;
  eligibility: Eligibility;
  /**
   * @minItems 7
   * @maxItems 7
   */
  retention: [
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
    RetentionItem,
  ];
  consequences: Consequences;
  operation: Operation;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  current_source_ref: CurrentSourceRef;
  copy_ref: CopyRef;
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
  status: "active" | "excluded";
}
export interface CopyRef {
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
  manifest_revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  manifest_record_hash: string;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  store_name: string;
  object_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  byte_size: number;
  media_type: string;
}
export interface Eligibility {
  state: "eligible" | "blocked" | "already_deleted";
  policy_version: "petra-local-copy-retention-v1";
  /**
   * @maxItems 7
   */
  blockers:
    | []
    | [Blocker]
    | [Blocker, Blocker]
    | [Blocker, Blocker, Blocker]
    | [Blocker, Blocker, Blocker, Blocker]
    | [Blocker, Blocker, Blocker, Blocker, Blocker]
    | [Blocker, Blocker, Blocker, Blocker, Blocker, Blocker]
    | [Blocker, Blocker, Blocker, Blocker, Blocker, Blocker, Blocker];
}
export interface Blocker {
  kind:
    | "shared_storage_copy"
    | "shared_project_use"
    | "artifact_derivation"
    | "active_work"
    | "open_review"
    | "deletion_pending"
    | "copy_unavailable";
  count: number;
  /**
   * @maxItems 100
   */
  record_ids: string[];
  reason: string;
}
export interface RetentionItem {
  area:
    | "project_link"
    | "canonical_identity"
    | "artifact_manifest"
    | "rights_history"
    | "selectors"
    | "provenance"
    | "local_bytes";
  state: "retained" | "deleted_if_confirmed" | "already_deleted";
  reason: string;
}
export interface Consequences {
  project_link_unchanged: true;
  representations_may_stop_resolving: true;
  recovery:
    | "reacquire_from_registered_origin"
    | "resupply_required"
    | "regenerate_required";
}
export interface Operation {
  state: "ready" | "blocked" | "already_completed";
  command_name: "DeleteLocalSourceCopy";
  method: "POST";
  path: string;
  recovery_path: string;
}
