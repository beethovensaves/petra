/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A conservative, copy-specific decision describing how one acquired Artifact may be used.
 */
export interface PetraRightsDecision {
  schema_name: "petra.rights-decision";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is rights_decision.
   */
  rights_decision_id: string;
  /**
   * A changed rights interpretation creates a new decision rather than rewriting this one.
   */
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
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
  decision_maker: ActorRef;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
  policy_version: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
