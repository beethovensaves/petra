ALTER TABLE petra.command_executions
  DROP CONSTRAINT command_executions_command_name_check;

ALTER TABLE petra.command_executions
  ADD CONSTRAINT command_executions_command_name_check
    CHECK (
      command_name IN (
        'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
        'ExcludeProjectSource', 'RestoreProjectSource'
      )
    ),
  DROP CONSTRAINT command_executions_schema_version_check,
  ADD CONSTRAINT command_executions_schema_version_check
    CHECK (envelope ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0'));

ALTER TABLE petra.domain_events
  DROP CONSTRAINT domain_events_event_type_check,
  ADD CONSTRAINT domain_events_event_type_check
    CHECK (
      event_type IN (
        'change_set.submitted', 'approval.recorded', 'change_set.applied',
        'change_set.conflicted', 'change_set.reverted',
        'change_set.reversal_conflicted', 'project_source.excluded',
        'project_source.restored'
      )
    ),
  DROP CONSTRAINT domain_events_schema_version_check,
  ADD CONSTRAINT domain_events_schema_version_check
    CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0'));

ALTER TABLE petra.outbox_records
  DROP CONSTRAINT outbox_records_schema_version_check,
  ADD CONSTRAINT outbox_records_schema_version_check
    CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0'));

ALTER TABLE petra.project_source_revisions
  ADD CONSTRAINT project_source_revisions_exact_record_key
  UNIQUE (project_source_id, revision, content_hash, record_hash);

ALTER TABLE petra.command_executions
  ADD CONSTRAINT command_executions_exact_record_key
  UNIQUE (command_id, command_fingerprint);

ALTER TABLE petra.domain_events
  ADD CONSTRAINT domain_events_exact_record_key
  UNIQUE (event_id, record_hash);

CREATE TABLE petra.project_source_lifecycle_receipts (
  project_source_lifecycle_receipt_id text PRIMARY KEY
    CHECK (
      project_source_lifecycle_receipt_id
        ~ '^project_source_lifecycle_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
    ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  project_source_id text NOT NULL,
  command_id text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  command_name text NOT NULL
    CHECK (command_name IN ('ExcludeProjectSource', 'RestoreProjectSource')),
  command_fingerprint text NOT NULL
    CHECK (command_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  prior_revision bigint NOT NULL CHECK (prior_revision >= 1),
  prior_content_hash text NOT NULL
    CHECK (prior_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  prior_record_hash text NOT NULL
    CHECK (prior_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  prior_status text NOT NULL CHECK (prior_status IN ('active', 'excluded')),
  resulting_revision bigint NOT NULL CHECK (resulting_revision >= 2),
  resulting_content_hash text NOT NULL
    CHECK (resulting_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  resulting_record_hash text NOT NULL
    CHECK (resulting_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  resulting_status text NOT NULL
    CHECK (resulting_status IN ('active', 'excluded')),
  event_id text NOT NULL UNIQUE,
  event_position bigint NOT NULL UNIQUE CHECK (event_position >= 1),
  stream_revision bigint NOT NULL CHECK (stream_revision >= 1),
  event_type text NOT NULL
    CHECK (event_type IN ('project_source.excluded', 'project_source.restored')),
  event_record_hash text NOT NULL
    CHECK (event_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  inverse_command_name text NOT NULL
    CHECK (
      inverse_command_name IN ('ExcludeProjectSource', 'RestoreProjectSource')
    ),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (
      payload ->> 'schema_name' = 'petra.project-source-lifecycle-receipt'
    )
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'project_source_lifecycle_receipt_id'
        = project_source_lifecycle_receipt_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,command_ref,command_id}' = command_id)
    CHECK (
      payload #>> '{content,command_ref,idempotency_key}' = idempotency_key
    )
    CHECK (payload #>> '{content,command_ref,command_name}' = command_name)
    CHECK (
      payload #>> '{content,command_ref,command_fingerprint}'
        = command_fingerprint
    )
    CHECK (
      payload #>> '{content,prior_source_ref,project_source_id}'
        = project_source_id
    )
    CHECK (
      (payload #>> '{content,prior_source_ref,revision}')::bigint
        = prior_revision
    )
    CHECK (
      payload #>> '{content,prior_source_ref,content_hash}' = prior_content_hash
    )
    CHECK (
      payload #>> '{content,prior_source_ref,record_hash}' = prior_record_hash
    )
    CHECK (payload #>> '{content,prior_source_ref,status}' = prior_status)
    CHECK (
      payload #>> '{content,resulting_source_ref,project_source_id}'
        = project_source_id
    )
    CHECK (
      (payload #>> '{content,resulting_source_ref,revision}')::bigint
        = resulting_revision
    )
    CHECK (
      payload #>> '{content,resulting_source_ref,content_hash}'
        = resulting_content_hash
    )
    CHECK (
      payload #>> '{content,resulting_source_ref,record_hash}'
        = resulting_record_hash
    )
    CHECK (
      payload #>> '{content,resulting_source_ref,status}' = resulting_status
    )
    CHECK (payload #>> '{content,event_ref,event_id}' = event_id)
    CHECK (
      (payload #>> '{content,event_ref,event_position}')::bigint
        = event_position
    )
    CHECK (
      (payload #>> '{content,event_ref,stream_revision}')::bigint
        = stream_revision
    )
    CHECK (payload #>> '{content,event_ref,event_type}' = event_type)
    CHECK (
      payload #>> '{content,event_ref,record_hash}' = event_record_hash
    )
    CHECK (
      payload #>> '{content,recovery,inverse_command_name}'
        = inverse_command_name
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  FOREIGN KEY (project_id, project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (command_id, command_fingerprint)
    REFERENCES petra.command_executions (command_id, command_fingerprint)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (event_id, event_record_hash)
    REFERENCES petra.domain_events (event_id, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_id, prior_revision, prior_content_hash, prior_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_id, resulting_revision,
    resulting_content_hash, resulting_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (resulting_revision = prior_revision + 1),
  CHECK (
    payload #>> '{content,recovery,expected_source_ref,project_source_id}'
      = project_source_id
    AND (
      payload #>> '{content,recovery,expected_source_ref,revision}'
    )::bigint = resulting_revision
    AND payload #>> '{content,recovery,expected_source_ref,content_hash}'
      = resulting_content_hash
    AND payload #>> '{content,recovery,expected_source_ref,record_hash}'
      = resulting_record_hash
    AND payload #>> '{content,recovery,expected_source_ref,status}'
      = resulting_status
  ),
  CHECK (
    (command_name = 'ExcludeProjectSource'
      AND prior_status = 'active' AND resulting_status = 'excluded'
      AND event_type = 'project_source.excluded'
      AND inverse_command_name = 'RestoreProjectSource')
    OR
    (command_name = 'RestoreProjectSource'
      AND prior_status = 'excluded' AND resulting_status = 'active'
      AND event_type = 'project_source.restored'
      AND inverse_command_name = 'ExcludeProjectSource')
  )
);

CREATE TRIGGER project_source_lifecycle_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_lifecycle_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_lifecycle_receipts_source_idx
  ON petra.project_source_lifecycle_receipts (
    project_id, project_source_id, resulting_revision
  );

COMMENT ON TABLE petra.project_source_lifecycle_receipts IS
  'Immutable receipt for one exact ProjectSource status transition and its compensating recovery boundary.';
