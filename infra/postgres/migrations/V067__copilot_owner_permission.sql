ALTER TABLE petra.capability_grants
  DROP CONSTRAINT capability_grants_allowed_commands_check,
  ADD CONSTRAINT capability_grants_allowed_commands_check CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
      'ExcludeProjectSource', 'RestoreProjectSource',
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement',
      'InvokeSuggestedAction', 'DeferReviewSession', 'ReopenReviewSession',
      'RefreshReviewSession', 'CorrectReviewCandidate',
      'ReviseReviewCandidateBasis', 'SeparateReviewSessionMember',
      'ManageProjectWork', 'SaveProjectInquiry', 'FrameProjectObjective',
      'RegisterProjectSource', 'ReuseProjectSource',
      'StartProjectSourceProcessing', 'AddProjectSourceRevision',
      'DeleteLocalSourceCopy', 'ConductProjectExamination', 'RunProjectCopilot'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0',
      '1.12.0', '1.13.0', '1.14.0', '1.15.0', '1.16.0', '1.17.0'
    )
  );

CREATE TABLE petra.copilot_authority_receipts (
 command_id text PRIMARY KEY CHECK(command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
 idempotency_key text NOT NULL UNIQUE,
 project_id text NOT NULL REFERENCES petra.projects(project_id),
 actor_id text NOT NULL,
 actor_kind text NOT NULL CHECK(actor_kind='human'),
 capability_grant_id text NOT NULL UNIQUE REFERENCES petra.capability_grants(capability_grant_id),
 request_hash text NOT NULL CHECK(request_hash ~ '^sha256:[0-9a-f]{64}$'),
 request_payload jsonb NOT NULL CHECK(request_payload->>'schema_name'='petra.copilot-authority-request' AND request_payload->>'schema_version'='1.0.0' AND request_payload->>'project_id'=project_id AND request_payload->>'command_id'=command_id),
 receipt_hash text NOT NULL CHECK(receipt_hash ~ '^sha256:[0-9a-f]{64}$'),
 receipt_payload jsonb NOT NULL CHECK(receipt_payload->>'schema_name'='petra.copilot-authority-receipt' AND receipt_payload->>'schema_version'='1.0.0' AND receipt_payload->>'project_id'=project_id AND receipt_payload#>>'{content,command_id}'=command_id AND receipt_payload#>>'{content,idempotency_key}'=idempotency_key AND receipt_payload#>>'{content,request_hash}'=request_hash AND receipt_payload#>>'{content,proposal,actor_id}'=actor_id AND receipt_payload#>>'{content,grant,capability_grant_id}'=capability_grant_id),
 recorded_at timestamptz NOT NULL,
 FOREIGN KEY(actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind)
);
CREATE TRIGGER copilot_authority_receipts_are_immutable BEFORE UPDATE OR DELETE ON petra.copilot_authority_receipts FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
