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
      'ReuseProjectSource'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0',
      '1.12.0'
    )
  );

CREATE TABLE petra.project_source_reuse_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^source_reuse_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
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
  project_revision bigint NOT NULL CHECK (project_revision >= 1),
  project_record_hash text NOT NULL CHECK (
    project_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_definition_record_hash text NOT NULL CHECK (
    project_definition_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  source_role text NOT NULL CHECK (
    source_role ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  origin_project_id text NOT NULL,
  origin_project_source_id text NOT NULL,
  origin_project_source_revision bigint NOT NULL CHECK (
    origin_project_source_revision >= 1
  ),
  origin_project_source_content_hash text NOT NULL CHECK (
    origin_project_source_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  origin_project_source_record_hash text NOT NULL CHECK (
    origin_project_source_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  artifact_id text NOT NULL,
  artifact_revision bigint NOT NULL CHECK (artifact_revision = 1),
  artifact_content_hash text NOT NULL CHECK (
    artifact_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  artifact_record_hash text NOT NULL CHECK (
    artifact_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  artifact_manifest_id text NOT NULL,
  artifact_manifest_revision bigint NOT NULL CHECK (
    artifact_manifest_revision = 1
  ),
  artifact_manifest_record_hash text NOT NULL CHECK (
    artifact_manifest_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  rights_decision_id text NOT NULL,
  rights_decision_revision bigint NOT NULL CHECK (rights_decision_revision = 1),
  rights_decision_record_hash text NOT NULL CHECK (
    rights_decision_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_source_id text NOT NULL,
  project_source_revision bigint NOT NULL CHECK (project_source_revision = 1),
  project_source_content_hash text NOT NULL CHECK (
    project_source_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_source_record_hash text NOT NULL CHECK (
    project_source_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.project-source-reuse-receipt'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'receipt_id' = receipt_id)
    CHECK (payload ->> 'command_id' = command_id)
    CHECK (payload ->> 'idempotency_key' = idempotency_key)
    CHECK (payload ->> 'request_hash' = request_hash)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{membership,source_role}' = source_role)
    CHECK (payload #>> '{existing_source,origin_project_source_ref,project_source_id}' = origin_project_source_id)
    CHECK (payload #>> '{project_source_ref,project_source_id}' = project_source_id),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id)
    REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id, project_revision, project_record_hash)
    REFERENCES petra.project_revisions (project_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash, project_definition_record_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    origin_project_source_id, origin_project_source_revision,
    origin_project_source_content_hash, origin_project_source_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, artifact_revision, artifact_record_hash)
    REFERENCES petra.artifacts (artifact_id, revision, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_manifest_id, artifact_manifest_revision, artifact_manifest_record_hash)
    REFERENCES petra.artifact_manifests (
      artifact_manifest_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (rights_decision_id, rights_decision_revision, rights_decision_record_hash)
    REFERENCES petra.rights_decisions (
      rights_decision_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_id, project_source_revision,
    project_source_content_hash, project_source_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_source_reuse_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_reuse_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_reuse_receipts_project_idx
  ON petra.project_source_reuse_receipts (
    project_id,
    recorded_at DESC,
    receipt_id
  );

COMMENT ON TABLE petra.project_source_reuse_receipts IS
  'Immutable outcomes for linking an exact existing canonical source and permitted copy into a current Project role without cloning identity, Artifact, or bytes.';
