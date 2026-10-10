/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectExaminationAuthorityReceipt {
  schema_name: "petra.project-examination-authority-receipt";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  project_examination_authority_receipt_id: string;
  revision: 1;
  content: {
    command_id: string;
    idempotency_key: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    request_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    actor: Grantee;
    grant: PetraCapabilityGrantV1160;
    review: {
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      proposed_content_hash: string;
      rationale: string;
      reviewed_at: string;
    };
    recorded_at: string;
    authority_effect: "owner_examination_grant";
    projection_effect: "none";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Grantee {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
/**
 * Immutable exact Project command grants extended with explicit human examination authority. No existing grant gains these permissions.
 */
export interface PetraCapabilityGrantV1160 {
  schema_name: "petra.capability-grant";
  schema_version: "1.16.0";
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
      | "RegisterProjectSource"
      | "ReuseProjectSource"
      | "StartProjectSourceProcessing"
      | "AddProjectSourceRevision"
      | "DeleteLocalSourceCopy"
      | "ConductProjectExamination"
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
      | "RegisterProjectSource"
      | "ReuseProjectSource"
      | "StartProjectSourceProcessing"
      | "AddProjectSourceRevision"
      | "DeleteLocalSourceCopy"
      | "ConductProjectExamination"
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
