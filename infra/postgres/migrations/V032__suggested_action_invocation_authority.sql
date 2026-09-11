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
      'InvokeSuggestedAction'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check
    CHECK (schema_version IN ('1.0.0', '1.1.0', '1.2.0'));

CREATE TABLE petra.suggested_action_invocations (
  suggested_action_invocation_id text PRIMARY KEY CHECK (
    suggested_action_invocation_id
      ~ '^suggested_action_invocation_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  command_id text NOT NULL UNIQUE CHECK (
    command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
  ),
  command_fingerprint text NOT NULL CHECK (
    command_fingerprint ~ '^sha256:[0-9a-f]{64}$'
  ),
  suggested_action_id text NOT NULL CHECK (
    suggested_action_id ~ '^suggested_action_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  action_revision bigint NOT NULL CHECK (action_revision = 1),
  action_content_hash text NOT NULL CHECK (
    action_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  expected_work_unit_id text NOT NULL UNIQUE CHECK (
    expected_work_unit_id ~ '^work_unit_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  correlation_id text NOT NULL CHECK (
    correlation_id ~ '^trace_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  protocol_thread_id text NOT NULL CHECK (
    char_length(protocol_thread_id) BETWEEN 1 AND 200
  ),
  protocol_run_id text NOT NULL UNIQUE CHECK (
    char_length(protocol_run_id) BETWEEN 1 AND 200
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.suggested-action-invocation')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'suggested_action_invocation_id'
        = suggested_action_invocation_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,command_ref,command_id}' = command_id)
    CHECK (
      payload #>> '{content,command_ref,idempotency_key}' = idempotency_key
    )
    CHECK (
      payload #>> '{content,command_ref,command_fingerprint}'
        = command_fingerprint
    )
    CHECK (
      payload #>> '{content,action_ref,suggested_action_id}'
        = suggested_action_id
    )
    CHECK (
      (payload #>> '{content,action_ref,revision}')::bigint = action_revision
    )
    CHECK (
      payload #>> '{content,action_ref,content_hash}' = action_content_hash
    )
    CHECK (
      payload #>> '{content,expected_work_unit_id}' = expected_work_unit_id
    )
    CHECK (payload #>> '{content,command_ref,actor,actor_id}' = actor_id)
    CHECK (payload #>> '{content,command_ref,actor,actor_kind}' = actor_kind)
    CHECK (
      payload #>> '{content,command_ref,capability_grant_id}'
        = capability_grant_id
    )
    CHECK (
      payload #>> '{content,command_ref,correlation_id}' = correlation_id
    )
    CHECK (
      payload #>> '{content,interaction,protocol_thread_id}'
        = protocol_thread_id
    )
    CHECK (
      payload #>> '{content,interaction,protocol_run_id}' = protocol_run_id
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  UNIQUE (suggested_action_invocation_id, revision, content_hash, record_hash),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (
    capability_grant_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX suggested_action_invocations_project_action_idx
  ON petra.suggested_action_invocations (
    project_id, suggested_action_id, recorded_at, command_id
  );

CREATE TRIGGER suggested_action_invocations_are_immutable
BEFORE UPDATE OR DELETE ON petra.suggested_action_invocations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.suggested_action_invocations IS
  'Immutable actor-authorized command receipts for exact SuggestedAction-to-Work invocation. Work state and history remain authoritative in WorkUnit revisions.';
