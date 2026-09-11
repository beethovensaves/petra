/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ContinuationFailureSubcode =
  "CURSOR_INVALID" | "CURSOR_BINDING_MISMATCH" | "SNAPSHOT_UNAVAILABLE";
export type RequestIdentity = string;

/**
 * A stable, non-disclosing failure response for an opaque retained Project History continuation. The subcode distinguishes an invalid cursor, a Project/query/limit binding mismatch, or an unavailable retained snapshot without exposing cursor contents or the mismatched binding. Every result fails closed and requires a cursorless restart with the same active query.
 */
export interface PetraProjectHistoryRetainedContinuationFailure {
  schema_name: "petra.project-history-retained-continuation-failure";
  schema_version: "1.0.0";
  error: ContinuationFailure;
  requestId: RequestIdentity;
  traceId: RequestIdentity;
}
export interface ContinuationFailure {
  code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID";
  subcode: ContinuationFailureSubcode;
  message: "This Full History traversal can no longer continue from its verified snapshot. Start again with the same filters.";
  restart: Restart;
}
export interface Restart {
  cursor_disposition: "discard_without_client_decoding";
  request_kind: "cursorless_same_project_limit_and_filters";
}
