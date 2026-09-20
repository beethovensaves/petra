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
      'FrameProjectObjective'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0'
    )
  );

CREATE TABLE petra.project_objective_command_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^project_objective_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  command_id text NOT NULL UNIQUE CHECK (
    command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL
    CHECK (jsonb_typeof(request_payload) = 'object')
    CHECK (
      request_payload ->> 'schema_name'
        = 'petra.project-objective-command-request'
    )
    CHECK (request_payload ->> 'schema_version' = '1.0.0')
    CHECK (request_payload ->> 'command_id' = command_id)
    CHECK (request_payload ->> 'idempotency_key' = idempotency_key),
  operation text NOT NULL CHECK (operation IN ('frame', 'revise')),
  project_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
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
  prior_objective_id text,
  prior_objective_revision bigint,
  prior_objective_content_hash text,
  prior_objective_record_hash text,
  objective_id text NOT NULL,
  objective_revision bigint NOT NULL CHECK (objective_revision >= 1),
  objective_content_hash text NOT NULL CHECK (
    objective_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_record_hash text NOT NULL CHECK (
    objective_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.project-objective-command-receipt'
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
    CHECK (payload ->> 'operation' = operation)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload -> 'objective_ref' ->> 'objective_id' = objective_id),
  recorded_at timestamptz NOT NULL,
  CHECK (
    (
      operation = 'frame'
      AND prior_objective_id IS NULL
      AND prior_objective_revision IS NULL
      AND prior_objective_content_hash IS NULL
      AND prior_objective_record_hash IS NULL
      AND objective_revision = 1
    )
    OR
    (
      operation = 'revise'
      AND prior_objective_id IS NOT NULL
      AND prior_objective_revision IS NOT NULL
      AND prior_objective_content_hash IS NOT NULL
      AND prior_objective_record_hash IS NOT NULL
      AND objective_id = prior_objective_id
      AND objective_revision = prior_objective_revision + 1
    )
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id)
    REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    project_definition_id,
    project_definition_revision,
    project_definition_content_hash,
    project_definition_record_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id,
    project_definition_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    prior_objective_id,
    prior_objective_revision,
    prior_objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    objective_id,
    revision,
    content_hash
  ) MATCH FULL ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    objective_id,
    objective_revision,
    objective_content_hash,
    objective_record_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id,
    objective_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_objective_command_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_objective_command_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_objective_command_receipts_project_idx
  ON petra.project_objective_command_receipts (
    project_id,
    recorded_at DESC,
    receipt_id
  );

COMMENT ON TABLE petra.project_objective_command_receipts IS
  'Immutable reviewed Objective framing/revision outcomes. Exact Project, ProjectDefinition, prior focus, actor grant, result revision, recovery identity, and Brief return are retained together.';
