/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Delivery =
  | {
      state: "unavailable";
      reason: string;
    }
  | {
      state: "durable";
      interaction_run_id: string;
      protocol_thread_id: string;
      protocol_run_id: string;
      reconnect_path: string;
      replay_path: string;
    };

/**
 * A snapshot-consistent assessment of exact Work input, plan, delivery, controls, recovery, and result destinations.
 */
export interface PetraProjectWorkOperationsView {
  schema_name: "petra.project-work-operations-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  work_unit_ref: WorkUnitRef;
  execution_state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  plan: Plan;
  /**
   * @maxItems 100
   */
  required_inputs: RequiredInput[];
  delivery: Delivery;
  resume_binding?: ResumeBinding;
  start_again_binding?: StartAgainBinding;
  /**
   * @minItems 11
   * @maxItems 11
   */
  controls: [
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
    Control,
  ];
  /**
   * @maxItems 1000
   */
  results: Result[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
}
export interface Plan {
  revision: number;
  selected_priority:
    "user_blocking" | "user_visible" | "normal" | "opportunistic";
  latest_instruction?: string;
  effect_boundary: "next_queue_or_successor_schedule";
}
export interface RequiredInput {
  input_request_ref: InputRequestRef;
  kind: "clarification" | "capability" | "budget" | "validation_judgment";
  question: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  response_options:
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
  state: "pending" | "answered" | "superseded";
  answer?: string;
  consequence: string;
}
export interface InputRequestRef {
  input_request_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
}
/**
 * The exact server-owned identity a client must copy into a checkpoint-resume request. It is present only while Resume is available through a trusted registered transition.
 */
export interface ResumeBinding {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  expected_work_unit_ref: WorkUnitRef;
  expected_checkpoint: CheckpointRef;
}
export interface CheckpointRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
/**
 * The exact server-owned fresh-input registration a client may copy into a Start again request. It is present only while all source, replacement Work, input, workflow, and authority prerequisites remain exact.
 */
export interface StartAgainBinding {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  expected_prior_work_unit_ref: WorkUnitRef;
  start_again_registration_ref: StartAgainRegistrationRef;
  fresh_work_unit_ref: WorkUnitRef;
  prior_work_attempt: number;
  prior_lineage_attempt: number;
  new_lineage_attempt: number;
  input_transition: FreshInput;
}
export interface StartAgainRegistrationRef {
  start_again_registration_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface FreshInput {
  strategy: "fresh_input";
  prior_input_manifest_ref: InputManifestRef;
  fresh_input_manifest_ref: InputManifestRef;
  retained_output_reuse: "none";
  summary: string;
}
export interface InputManifestRef {
  worker_input_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Control {
  operation:
    | "start"
    | "answer_input"
    | "steer"
    | "prioritize"
    | "detach"
    | "reconnect"
    | "replay"
    | "cancel"
    | "retry"
    | "resume"
    | "start_again";
  state: "available" | "unavailable" | "client_owned" | "query_only";
  reason: string;
  command_path?: string;
}
export interface Result {
  result_kind: "grounded_response" | "worker_output_manifest";
  record_ref: {
    semantic_key: string;
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
  };
  destination:
    | {
        state: "available";
        place_role: "work" | "petra" | "review" | "sources" | "composition";
        target_ref: {
          semantic_key: string;
          /**
           * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
           */
          object_id: string;
          /**
           * A one-based optimistic revision within JavaScript's safe-integer range.
           */
          revision: number;
        };
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
