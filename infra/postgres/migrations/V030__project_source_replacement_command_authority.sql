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
      'RetractProjectSourceReplacement'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check
    CHECK (schema_version IN ('1.0.0', '1.1.0'));

ALTER TABLE petra.command_executions
  DROP CONSTRAINT command_executions_command_name_check,
  ADD CONSTRAINT command_executions_command_name_check CHECK (
    command_name IN (
      'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
      'ExcludeProjectSource', 'RestoreProjectSource',
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement'
    )
  ),
  DROP CONSTRAINT command_executions_schema_version_check,
  ADD CONSTRAINT command_executions_schema_version_check CHECK (
    envelope ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0', '1.3.0')
  );

ALTER TABLE petra.domain_events
  DROP CONSTRAINT domain_events_event_type_check,
  ADD CONSTRAINT domain_events_event_type_check CHECK (
    event_type IN (
      'change_set.submitted', 'approval.recorded', 'change_set.applied',
      'change_set.conflicted', 'change_set.reverted',
      'change_set.reversal_conflicted', 'project_source.excluded',
      'project_source.restored', 'project_source.replacement_created',
      'project_source.replacement_retracted'
    )
  ),
  DROP CONSTRAINT domain_events_schema_version_check,
  ADD CONSTRAINT domain_events_schema_version_check CHECK (
    payload ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0', '1.3.0')
  );

ALTER TABLE petra.outbox_records
  DROP CONSTRAINT outbox_records_schema_version_check,
  ADD CONSTRAINT outbox_records_schema_version_check CHECK (
    payload ->> 'schema_version' IN ('1.0.0', '1.1.0', '1.2.0', '1.3.0')
  );

ALTER TABLE petra.project_source_replacement_retractions
  ADD CONSTRAINT project_source_retractions_exact_record_key UNIQUE (
    project_source_replacement_retraction_id, revision,
    content_hash, record_hash
  );

CREATE TABLE petra.project_source_replacement_receipts (
  project_source_replacement_receipt_id text PRIMARY KEY CHECK (
    project_source_replacement_receipt_id
      ~ '^project_source_relation_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  command_id text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  command_name text NOT NULL CHECK (
    command_name IN (
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement'
    )
  ),
  command_fingerprint text NOT NULL CHECK (
    command_fingerprint ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_source_replacement_id text NOT NULL,
  replacement_revision bigint NOT NULL CHECK (replacement_revision = 1),
  replacement_content_hash text NOT NULL CHECK (
    replacement_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replacement_record_hash text NOT NULL CHECK (
    replacement_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replacement_state text NOT NULL CHECK (
    replacement_state IN ('active', 'retracted')
  ),
  project_source_retraction_id text,
  retraction_revision bigint CHECK (
    retraction_revision IS NULL OR retraction_revision = 1
  ),
  retraction_content_hash text CHECK (
    retraction_content_hash IS NULL
    OR retraction_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  retraction_record_hash text CHECK (
    retraction_record_hash IS NULL
    OR retraction_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  event_id text NOT NULL,
  event_position bigint NOT NULL CHECK (event_position >= 1),
  stream_revision bigint NOT NULL CHECK (stream_revision >= 1),
  event_type text NOT NULL CHECK (
    event_type IN (
      'project_source.replacement_created',
      'project_source.replacement_retracted'
    )
  ),
  event_record_hash text NOT NULL CHECK (
    event_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (
      payload ->> 'schema_name'
        = 'petra.project-source-replacement-receipt'
    )
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'project_source_replacement_receipt_id'
        = project_source_replacement_receipt_id
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
      payload #>> '{content,result,replacement_ref,project_source_replacement_id}'
        = project_source_replacement_id
    )
    CHECK (
      (payload #>> '{content,result,replacement_ref,revision}')::bigint
        = replacement_revision
    )
    CHECK (
      payload #>> '{content,result,replacement_ref,content_hash}'
        = replacement_content_hash
    )
    CHECK (
      payload #>> '{content,result,replacement_ref,record_hash}'
        = replacement_record_hash
    )
    CHECK (
      payload #>> '{content,result,replacement_ref,state}' = replacement_state
    )
    CHECK (
      CASE
        WHEN payload #> '{content,result,retraction_ref}' IS NULL
          THEN project_source_retraction_id IS NULL
            AND retraction_revision IS NULL
            AND retraction_content_hash IS NULL
            AND retraction_record_hash IS NULL
        ELSE
          payload #>> '{content,result,retraction_ref,project_source_replacement_retraction_id}'
            = project_source_retraction_id
          AND (
            payload #>> '{content,result,retraction_ref,revision}'
          )::bigint = retraction_revision
          AND payload #>> '{content,result,retraction_ref,content_hash}'
            = retraction_content_hash
          AND payload #>> '{content,result,retraction_ref,record_hash}'
            = retraction_record_hash
      END
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
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  CHECK (
    (command_name = 'CreateProjectSourceReplacement'
      AND replacement_state = 'active'
      AND project_source_retraction_id IS NULL
      AND event_type = 'project_source.replacement_created')
    OR
    (command_name = 'RetractProjectSourceReplacement'
      AND replacement_state = 'retracted'
      AND project_source_retraction_id IS NOT NULL
      AND retraction_revision IS NOT NULL
      AND retraction_content_hash IS NOT NULL
      AND retraction_record_hash IS NOT NULL
      AND event_type = 'project_source.replacement_retracted')
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (command_id, command_fingerprint)
    REFERENCES petra.command_executions (command_id, command_fingerprint)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (event_id, event_record_hash)
    REFERENCES petra.domain_events (event_id, record_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_replacement_id, replacement_revision,
    replacement_content_hash, replacement_record_hash
  ) REFERENCES petra.project_source_replacements (
    project_source_replacement_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_retraction_id, retraction_revision,
    retraction_content_hash, retraction_record_hash
  ) REFERENCES petra.project_source_replacement_retractions (
    project_source_replacement_retraction_id, revision,
    content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_source_replacement_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_replacement_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.project_source_replacement_receipts IS
  'Immutable authorized command receipt for replacement activation or command-granular retraction.';
