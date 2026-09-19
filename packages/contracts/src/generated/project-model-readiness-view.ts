/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A Project-scoped view of one server-selected certified model role, live provider status, exact model context, and the only registered interaction command that may consume it.
 */
export interface PetraProjectModelReadinessView {
  schema_name: "petra.project-model-readiness-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  project_revision: number;
  project_definition_ref: DefinitionRef;
  objective_ref?: ObjectiveRef;
  readiness: Ready | Unavailable;
  /**
   * @minItems 1
   * @maxItems 20
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
        string,
        string,
        string,
        string,
      ];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
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
  definition_family: string;
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
export interface Ready {
  state: "ready";
  role: SelectedRole;
  provider: ReadyProvider;
  context: BoundContext;
  command: ReadyCommand;
}
export interface SelectedRole {
  state: "selected";
  semantic_key: string;
  label: string;
  meaning: string;
  certification_ref: CertificationRef;
  deployment: {
    model_deployment_id: string;
    provider_kind: "codex_app_server";
    provider_model: string;
    execution_location: "remote";
  };
  authority_effect: "none";
}
export interface CertificationRef {
  role_certification_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ReadyProvider {
  state: "ready";
  provider_kind: "codex_app_server";
  auth_state: "authenticated";
  auth_mode: "chatgpt";
  model: string;
  message: string;
}
export interface BoundContext {
  state: "bound";
  binding: ContextBinding;
}
export interface ContextBinding {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  project_revision: number;
  project_definition_ref: DefinitionRef;
  objective_ref: ObjectiveRef;
  snapshot_ref: SnapshotRef;
  context_packet_ref: RecordRef;
  evidence_packet_ref: RecordRef;
  role_certification_ref: CertificationRef;
}
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RecordRef {
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
export interface ReadyCommand {
  state: "ready";
  method: "POST";
  endpoint: "/api/interactions/run";
  workflow: "grounded_synthesis";
  prompt_policy: "exact_registered_prompt";
  registered_prompt: string;
  request_context: ContextBinding;
  delivery: "streaming_and_replay";
  authority_effect: "none";
}
export interface Unavailable {
  state: "unavailable";
  reason: "role_unavailable" | "provider_unavailable" | "context_unavailable";
  role: SelectedRole | UnavailableRole;
  provider: ReadyProvider | UnavailableProvider;
  context: BoundContext | UnavailableContext;
  command: UnavailableCommand;
}
export interface UnavailableRole {
  state: "unavailable";
  reason:
    | "profile_unsupported"
    | "role_not_registered"
    | "runtime_not_configured"
    | "role_binding_mismatch";
  message: string;
}
export interface UnavailableProvider {
  state:
    | "unavailable"
    | "login_required"
    | "model_unavailable"
    | "configuration_drift";
  provider_kind: "codex_app_server";
  model?: string;
  message: string;
}
export interface UnavailableContext {
  state: "unavailable";
  reason:
    | "objective_unavailable"
    | "project_context_not_compiled"
    | "project_context_stale"
    | "profile_context_unsupported";
  message: string;
}
export interface UnavailableCommand {
  state: "unavailable";
  reason: "role_unavailable" | "provider_unavailable" | "context_unavailable";
  message: string;
}
