/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotAuthorityReceipt {
  schema_name: "petra.copilot-authority-receipt";
  schema_version: "1.0.0";
  copilot_authority_receipt_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: {
    command_id: string;
    idempotency_key: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    request_hash: string;
    proposal: ConversationAuthorityProposal;
    review: ConversationAuthorityReview;
    grant: PetraCapabilityGrantV1170;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ConversationAuthorityProposal {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  project_record_hash: string;
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  allowed_commands: ["RunProjectCopilot"];
  limits: {
    max_wall_time_ms: 120000;
    max_output_bytes: 256000;
    max_attempts: 1;
    max_parallelism: 1;
  };
  domain_authority: false;
}
export interface ConversationAuthorityReview {
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  proposed_content_hash: string;
  /**
   * Original client-reported review time. The owner accepts at most one second of clock skew against the actual database transaction time; the original review and actual receipt/grant times remain separately retained.
   */
  reviewed_at: string;
}
/**
 * Immutable exact Project command grants extended with explicit human examination authority. No existing grant gains these permissions.
 */
export interface PetraCapabilityGrantV1170 {
  schema_name: "petra.capability-grant";
  schema_version: "1.17.0";
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
      | "RegisterProjectSource"
      | "ReuseProjectSource"
      | "StartProjectSourceProcessing"
      | "AddProjectSourceRevision"
      | "DeleteLocalSourceCopy"
      | "ConductProjectExamination"
      | "RunProjectCopilot"
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
      | "RunProjectCopilot"
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
