/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Availability = {
  state: "available" | "empty" | "unsupported";
  reason:
    | "permitted_sources_found"
    | "no_permitted_sources"
    | "all_permitted_sources_already_linked"
    | "source_roles_unavailable"
    | "profile_unsupported";
  message: string;
};

/**
 * An authenticated, server-composed selector for source copies the current human may reuse in one exact current ProjectDefinition. It exposes the exact existing-source refs required by the reuse command without exposing Actor, grant, target membership identity, storage location, or record timestamps.
 */
export interface PetraProjectSourceReuseOptionsView {
  schema_name: "petra.project-source-reuse-options-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  expected: Expected;
  profile: Profile;
  /**
   * @maxItems 1000
   */
  source_roles: SourceRole[];
  availability: Availability;
  counts: Counts;
  candidates: Candidate[];
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
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
export interface Profile {
  resolution: "registered" | "project_authored" | "unsupported";
  definition_family: string;
  label: string;
  purpose: string;
}
export interface SourceRole {
  semantic_key: string;
  label: string;
  meaning: string;
}
export interface Counts {
  permitted: number;
  already_linked: number;
}
export interface Candidate {
  display: CandidateDisplay;
  existing_source: ExistingSource;
}
export interface CandidateDisplay {
  title: string;
  /**
   * @minItems 1
   */
  contributors: [string, ...string[]];
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
  origin_project_name: string;
  origin_source_role: SourceRole;
  origin_membership_status: "active" | "excluded";
  copy_status: "available_for_reuse";
}
export interface ExistingSource {
  origin_project_source_ref: OriginProjectSourceRef;
  work_ref: WorkRef;
  work_version_ref: WorkVersionRef;
  artifact_ref: ArtifactRef;
  artifact_manifest_ref: ArtifactManifestRef;
  rights_decision_ref: RightsDecisionRef;
}
export interface OriginProjectSourceRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
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
export interface WorkRef {
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkVersionRef {
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
}
export interface ArtifactManifestRef {
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface RightsDecisionRef {
  /**
   * A Petra identifier whose kind is rights_decision.
   */
  record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
