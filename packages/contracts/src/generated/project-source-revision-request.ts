/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact reviewed request to intake immutable bytes for a new version of the Work bound by one current ProjectSource. Actor, capability grant, successor identities, storage, and timestamps remain server-owned; predecessor exclusion and replacement remain separate governed commands.
 */
export interface PetraProjectSourceRevisionRequest {
  schema_name: "petra.project-source-revision-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected: Expected;
  version: Version;
  material: Material;
  rights: Rights;
  replacement: Replacement;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  current_source_ref: CurrentSourceRef;
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
export interface Version {
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  /**
   * A publication date that preserves the precision supplied by scholarly metadata instead of inventing a day or time.
   */
  published_date?:
    | {
        precision: "year";
        value: string;
      }
    | {
        precision: "month";
        value: string;
      }
    | {
        precision: "day";
        value: string;
      };
  metadata_source_name: string;
  metadata_source_record_id?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  metadata_retrieved_at: string;
}
export interface Material {
  encoding: "base64";
  content_base64: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  expected_content_hash: string;
  artifact_kind:
    "pdf" | "html" | "structured_text" | "dataset" | "code" | "image";
  media_type: string;
  original_filename: string;
}
export interface Rights {
  source_location: string;
  license_status: "known" | "unknown" | "restricted";
  observed_license?: ObservedLicense;
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
  /**
   * @maxItems 5
   */
  conditions:
    | []
    | [
        | "attribution"
        | "notice"
        | "noncommercial"
        | "share_alike"
        | "no_derivatives",
      ]
    | [
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
      ]
    | [
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
      ]
    | [
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
      ]
    | [
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
        (
          | "attribution"
          | "notice"
          | "noncommercial"
          | "share_alike"
          | "no_derivatives"
        ),
      ];
  /**
   * @maxItems 100
   */
  required_notices: string[];
  authorization_reference?: string;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
  policy_version: string;
}
export interface ObservedLicense {
  identifier?: string;
  url?: string;
  statement?: string;
  source:
    | "artifact"
    | "license_file"
    | "repository_record"
    | "publisher_record"
    | "user_declaration"
    | "permission_record";
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
export interface Replacement {
  replacement_kind: "newer_version";
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
