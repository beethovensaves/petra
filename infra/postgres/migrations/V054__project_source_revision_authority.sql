ALTER TABLE petra.capability_grants
  DROP CONSTRAINT capability_grants_allowed_commands_check,
  ADD CONSTRAINT capability_grants_allowed_commands_check CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet',
      'RecordApproval',
      'ApplyChangeSet',
      'ExcludeProjectSource',
      'RestoreProjectSource',
      'CreateProjectSourceReplacement',
      'RetractProjectSourceReplacement',
      'InvokeSuggestedAction',
      'DeferReviewSession',
      'ReopenReviewSession',
      'RefreshReviewSession',
      'CorrectReviewCandidate',
      'ReviseReviewCandidateBasis',
      'SeparateReviewSessionMember',
      'ManageProjectWork',
      'SaveProjectInquiry',
      'FrameProjectObjective',
      'RegisterProjectSource',
      'ReuseProjectSource',
      'StartProjectSourceProcessing',
      'AddProjectSourceRevision'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0',
      '1.12.0', '1.13.0', '1.14.0'
    )
  );

CREATE TABLE petra.project_source_revision_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^source_revision_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  command_id text NOT NULL UNIQUE CHECK (
    command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  project_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  predecessor_project_source_id text NOT NULL,
  predecessor_revision bigint NOT NULL CHECK (predecessor_revision >= 1),
  predecessor_content_hash text NOT NULL CHECK (
    predecessor_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  predecessor_record_hash text NOT NULL CHECK (
    predecessor_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  work_id text NOT NULL,
  work_revision bigint NOT NULL CHECK (work_revision >= 1),
  work_record_hash text NOT NULL CHECK (work_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  work_version_id text NOT NULL,
  work_version_revision bigint NOT NULL CHECK (work_version_revision = 1),
  work_version_record_hash text NOT NULL CHECK (
    work_version_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  artifact_id text NOT NULL,
  artifact_content_hash text NOT NULL CHECK (
    artifact_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  artifact_manifest_id text NOT NULL,
  rights_decision_id text NOT NULL,
  successor_project_source_id text NOT NULL,
  successor_revision bigint NOT NULL CHECK (successor_revision = 1),
  successor_content_hash text NOT NULL CHECK (
    successor_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  successor_record_hash text NOT NULL CHECK (
    successor_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.project-source-revision-receipt'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  recorded_at timestamptz NOT NULL,
  CHECK (payload ->> 'schema_name' = schema_name),
  CHECK (payload ->> 'schema_version' = schema_version),
  CHECK (payload ->> 'receipt_id' = receipt_id),
  CHECK (payload ->> 'command_id' = command_id),
  CHECK (payload ->> 'idempotency_key' = idempotency_key),
  CHECK (payload ->> 'request_hash' = request_hash),
  CHECK (payload ->> 'project_id' = project_id),
  CHECK (payload ->> 'record_hash' = record_hash),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id)
    REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    predecessor_project_source_id, predecessor_revision,
    predecessor_content_hash, predecessor_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_id, work_revision, work_record_hash)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id, work_version_revision, work_version_record_hash)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, artifact_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_manifest_id)
    REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (rights_decision_id)
    REFERENCES petra.rights_decisions (rights_decision_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    successor_project_source_id, successor_revision,
    successor_content_hash, successor_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_source_revision_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_revision_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_revision_receipts_project_source_idx
  ON petra.project_source_revision_receipts (
    project_id, predecessor_project_source_id, recorded_at
  );

COMMENT ON TABLE petra.project_source_revision_receipts IS
  'Immutable receipts for authenticated new-version intake; predecessor exclusion and replacement remain separately governed.';
