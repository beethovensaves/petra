/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type OperationAvailability = UnavailableOperation | AvailableOperation;
export type HistoryAvailability =
  | {
      state: "retained";
      record_ref: ExactRecordRef;
      limitation: string;
    }
  | {
      state: "unavailable";
      limitation: string;
    };

/**
 * A read-only composition of the controls that are actually effective for one exact Project and ProjectDefinition snapshot, including explicit unsupported policy families.
 */
export interface PetraProjectEffectiveControlsView {
  schema_name: "petra.project-effective-controls-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: EffectiveControlsContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface EffectiveControlsContent {
  project_ref: ExactRecordRef;
  project_definition_ref: ProjectDefinitionRef;
  authority: AuthoritySnapshot;
  sections: ControlSections;
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
}
export interface AuthoritySnapshot {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface ControlSections {
  privacy: ControlSection;
  capability: ControlSection;
  model_routing: ControlSection;
  work_budget: ControlSection;
  review_policy: ControlSection;
}
export interface ControlSection {
  state:
    | "effective"
    | "inherited"
    | "expired"
    | "observed_only"
    | "unavailable"
    | "unknown"
    | "unsupported"
    | "conflicting";
  label: string;
  summary: string;
  owner_kind:
    | "project"
    | "capability_authority"
    | "routing_policy"
    | "budget_profile"
    | "review_policy";
  scope: ControlScope;
  freshness: Freshness;
  /**
   * @maxItems 100
   */
  values: MaterialValue[];
  history: HistoryAvailability;
  operation: OperationAvailability;
}
export interface ControlScope {
  scope_kind: "project";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
}
export interface Freshness {
  state: "current" | "stale" | "unknown";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
  limitation?: string;
}
export interface MaterialValue {
  key: string;
  label: string;
  meaning: string;
  state:
    | "effective"
    | "inherited"
    | "expired"
    | "observed_only"
    | "unavailable"
    | "unknown"
    | "unsupported"
    | "conflicting";
  value: string | boolean | number | string[];
  origin: ControlOrigin;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  effective_from?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  expires_at?: string;
  limitation?: string;
  operation: OperationAvailability;
}
export interface ControlOrigin {
  owner_kind:
    | "project"
    | "capability_authority"
    | "routing_policy"
    | "budget_profile"
    | "review_policy";
  record_ref: ExactRecordRef;
}
export interface UnavailableOperation {
  state: "unsupported";
  reason: string;
}
export interface AvailableOperation {
  state: "available";
  command_name: string;
  schema_name: string;
  schema_version: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
}
