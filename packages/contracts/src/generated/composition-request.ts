/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CompositionRequestId = string;

/**
 * An immutable request for one snapshot-bound research artifact. It records the intended use and control limits without authorizing prose or scientific claims.
 */
export interface PetraCompositionRequest {
  schema_name: "petra.composition-request";
  schema_version: "1.0.0";
  composition_request_id: CompositionRequestId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  content: CompositionRequestContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  requested_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
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
export interface CompositionRequestContent {
  objective: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  subject_refs: [
    ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef,
    ...(ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef)[],
  ];
  requested_output: RequestedOutput;
  citation_preferences: CitationPreferences;
  evidence_policy: EvidencePolicy;
  control_context: ControlContext;
  authority_boundary: {
    request_is_scientific_authority: false;
    request_authorizes_publication: false;
  };
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
export interface RequestedOutput {
  artifact_kind:
    | "passage"
    | "outline"
    | "table"
    | "methods_description"
    | "experiment_report"
    | "literature_synthesis"
    | "bibliography"
    | "other";
  description: string;
  audience: string;
  language: string;
  semantic_format: "plain_text" | "markdown" | "structured_json";
  /**
   * An unordered permission set, not a numeric or ordinal confidence scale.
   *
   * @minItems 1
   * @maxItems 9
   */
  permitted_scientific_forces:
    | [
        | "direct_report"
        | "descriptive"
        | "association"
        | "comparison"
        | "qualification"
        | "causal"
        | "mechanistic"
        | "methodological"
        | "none",
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ]
    | [
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
        (
          | "direct_report"
          | "descriptive"
          | "association"
          | "comparison"
          | "qualification"
          | "causal"
          | "mechanistic"
          | "methodological"
          | "none"
        ),
      ];
  target_code_points?: number;
}
export interface CitationPreferences {
  style: {
    style_kind: "csl";
    style_name: string;
    style_version: string;
  };
  /**
   * @minItems 1
   * @maxItems 4
   */
  export_formats:
    | ["inline" | "markdown" | "latex" | "bibtex"]
    | [
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
      ]
    | [
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
      ]
    | [
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
        "inline" | "markdown" | "latex" | "bibtex",
      ];
}
export interface EvidencePolicy {
  /**
   * @minItems 1
   * @maxItems 4
   */
  allowed_namespaces:
    | ["scholarly" | "operational" | "personal" | "discovery"]
    | [
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
      ]
    | [
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
      ]
    | [
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
        "scholarly" | "operational" | "personal" | "discovery",
      ];
  inference_policy:
    | "source_reports_only"
    | "bounded_synthesis_allowed"
    | "researcher_material_allowed";
  desired_depth: "concise" | "standard" | "deep";
}
export interface ControlContext {
  output_profile: NamedVersionHash;
  language_contract: FelicityContractRef;
  capability_grant_id: string;
  privacy_profile_ref: VersionedControlRef;
  budget_profile_ref: VersionedControlRef;
  approval_mode: "automatic_with_validation" | "review_before_draft";
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface FelicityContractRef {
  name: "petra.felicity";
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
