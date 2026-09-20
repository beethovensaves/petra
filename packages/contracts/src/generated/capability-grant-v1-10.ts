/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable Project-scoped grant extended with authority to frame or revise the focused Project Objective.
 */
export interface PetraCapabilityGrantV1100 {
  schema_name: "petra.capability-grant";
  schema_version: "1.10.0";
  capability_grant_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  grantee: Grantee;
  content: GrantContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  issued_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  issued_at: string;
}
export interface Grantee {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface GrantContent {
  scope_kind: "project_commands";
  /**
   * @minItems 1
   * @maxItems 100
   */
  allowed_commands: [
    (
      | "SubmitChangeSet"
      | "RecordApproval"
      | "ApplyChangeSet"
      | "ExcludeProjectSource"
      | "RestoreProjectSource"
      | "CreateProjectSourceReplacement"
      | "RetractProjectSourceReplacement"
      | "InvokeSuggestedAction"
      | "DeferReviewSession"
      | "ReopenReviewSession"
      | "RefreshReviewSession"
      | "CorrectReviewCandidate"
      | "ReviseReviewCandidateBasis"
      | "SeparateReviewSessionMember"
      | "ManageProjectWork"
      | "SaveProjectInquiry"
      | "FrameProjectObjective"
    ),
    ...(
      | "SubmitChangeSet"
      | "RecordApproval"
      | "ApplyChangeSet"
      | "ExcludeProjectSource"
      | "RestoreProjectSource"
      | "CreateProjectSourceReplacement"
      | "RetractProjectSourceReplacement"
      | "InvokeSuggestedAction"
      | "DeferReviewSession"
      | "ReopenReviewSession"
      | "RefreshReviewSession"
      | "CorrectReviewCandidate"
      | "ReviseReviewCandidateBasis"
      | "SeparateReviewSessionMember"
      | "ManageProjectWork"
      | "SaveProjectInquiry"
      | "FrameProjectObjective"
    )[],
  ];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_from: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  expires_at?: string;
  reason: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
