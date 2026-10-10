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
      'DeleteLocalSourceCopy', 'ConductProjectExamination'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0',
      '1.12.0', '1.13.0', '1.14.0', '1.15.0', '1.16.0'
    )
  );

CREATE TABLE petra.assessment_catalog_records (
  record_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision>0),
  record_kind text NOT NULL CHECK (record_kind IN ('assessment-profile','assessment-policy')),
  semantic_key text NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.' || record_kind)
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK ((payload->>'revision')::bigint=revision)
    CHECK (payload#>>'{content,semantic_key}'=semantic_key)
    CHECK (COALESCE(payload->>'assessment_profile_id',payload->>'assessment_policy_id')=record_id),
  PRIMARY KEY (record_id,revision),
  UNIQUE (record_kind,semantic_key,revision)
);
CREATE TRIGGER assessment_catalog_records_immutable BEFORE UPDATE OR DELETE ON petra.assessment_catalog_records FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TABLE petra.project_examination_command_receipts (
  command_id text PRIMARY KEY CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind='human'),
  capability_grant_id text NOT NULL REFERENCES petra.capability_grants(capability_grant_id),
  record_id text NOT NULL,
  record_revision bigint NOT NULL,
  request_payload jsonb NOT NULL CHECK (jsonb_typeof(request_payload)='object'),
  receipt_hash text NOT NULL CHECK (receipt_hash ~ '^sha256:[0-9a-f]{64}$'),
  receipt_payload jsonb NOT NULL CHECK (jsonb_typeof(receipt_payload)='object')
    CHECK (receipt_payload->>'schema_name'='petra.project-examination-receipt')
    CHECK (receipt_payload->>'schema_version'='1.0.0')
    CHECK (receipt_payload->>'project_id'=project_id)
    CHECK (receipt_payload#>>'{content,command_id}'=command_id)
    CHECK (receipt_payload#>>'{content,idempotency_key}'=idempotency_key)
    CHECK (receipt_payload#>>'{content,request_hash}'=request_hash)
    CHECK (receipt_payload#>>'{content,actor,actor_id}'=actor_id)
    CHECK (receipt_payload#>>'{content,capability_grant_id}'=capability_grant_id),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind),
  FOREIGN KEY (record_id,record_revision) REFERENCES petra.project_examination_records(record_id,revision)
);
CREATE TRIGGER project_examination_command_receipts_immutable BEFORE UPDATE OR DELETE ON petra.project_examination_command_receipts FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
