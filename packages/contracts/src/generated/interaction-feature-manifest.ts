/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionFeatureManifestId = string;
export type Version = string;
export type StandardEventType =
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "ACTIVITY_SNAPSHOT"
  | "ACTIVITY_DELTA"
  | "CUSTOM";

/**
 * An immutable declaration of the interaction protocol features Petra can translate safely. It describes compatibility and never grants a Petra capability.
 */
export interface PetraInteractionFeatureManifest {
  schema_name: "petra.interaction-feature-manifest";
  schema_version: "1.0.0";
  interaction_feature_manifest_id: InteractionFeatureManifestId;
  revision: 1;
  content: FeatureContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface FeatureContent {
  protocol: {
    name: "ag-ui";
    sdk_version: Version;
    profile_version: Version;
  };
  /**
   * @minItems 1
   * @maxItems 4
   */
  transports:
    | ["text_event_stream" | "binary_stream"]
    | [
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
      ]
    | [
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
      ]
    | [
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
        "text_event_stream" | "binary_stream",
      ];
  /**
   * @minItems 1
   * @maxItems 100
   */
  standard_events: [StandardEventType, ...StandardEventType[]];
  /**
   * @maxItems 100
   */
  custom_events: CustomEventRegistration[];
  /**
   * @minItems 1
   * @maxItems 100
   */
  features: [FeatureSupport, ...FeatureSupport[]];
  authority_boundary: {
    grants_capabilities: false;
    interaction_state_is_authoritative: false;
    replay_reapplies_authority: false;
    connection_abort_cancels_work: false;
  };
}
export interface CustomEventRegistration {
  event_name: string;
  payload_schema_ref: SchemaRef;
  stability: "stable" | "experimental";
  authority_effect: "none";
}
export interface SchemaRef {
  schema_name: string;
  schema_version: Version;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  json_pointer?: string;
}
export interface FeatureSupport {
  feature:
    | "text_streaming"
    | "activity"
    | "tool_proposals"
    | "state_projection"
    | "interrupts"
    | "resumption"
    | "replay"
    | "explicit_work_cancellation";
  support: "supported" | "deferred" | "unsupported";
  limitation?: string;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
