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
      'ReopenReviewSession'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check
    CHECK (schema_version IN ('1.0.0', '1.1.0', '1.2.0', '1.3.0'));

ALTER TABLE petra.command_executions
  DROP CONSTRAINT command_executions_command_name_check,
  ADD CONSTRAINT command_executions_command_name_check CHECK (
    command_name IN (
      'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
      'ExcludeProjectSource', 'RestoreProjectSource',
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement',
      'DeferReviewSession', 'ReopenReviewSession'
    )
  ),
  DROP CONSTRAINT command_executions_schema_version_check,
  ADD CONSTRAINT command_executions_schema_version_check CHECK (
    envelope ->> 'schema_version' IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0'
    )
  );

ALTER TABLE petra.review_session_revisions
  ADD CONSTRAINT review_session_revisions_lifecycle_exact_record_key UNIQUE (
    project_id, review_session_id, revision, content_hash, record_hash
  );

CREATE TABLE petra.review_session_lifecycle_receipts (
  review_session_lifecycle_receipt_id text PRIMARY KEY CHECK (
    review_session_lifecycle_receipt_id
      ~ '^review_session_lifecycle_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  command_id text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
  ),
  command_name text NOT NULL CHECK (
    command_name IN ('DeferReviewSession', 'ReopenReviewSession')
  ),
  command_fingerprint text NOT NULL CHECK (
    command_fingerprint ~ '^sha256:[0-9a-f]{64}$'
  ),
  review_session_id text NOT NULL,
  prior_revision bigint NOT NULL CHECK (prior_revision >= 1),
  prior_content_hash text NOT NULL CHECK (
    prior_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  prior_record_hash text NOT NULL CHECK (
    prior_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  prior_lifecycle text NOT NULL CHECK (
    prior_lifecycle IN ('open', 'deferred')
  ),
  resulting_revision bigint NOT NULL CHECK (
    resulting_revision = prior_revision + 1
  ),
  resulting_content_hash text NOT NULL CHECK (
    resulting_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  resulting_record_hash text NOT NULL CHECK (
    resulting_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  resulting_lifecycle text NOT NULL CHECK (
    resulting_lifecycle IN ('open', 'deferred')
  ),
  transition text NOT NULL CHECK (transition IN ('deferred', 'reopened')),
  rationale text CHECK (char_length(rationale) BETWEEN 1 AND 4000),
  content_hash text NOT NULL CHECK (
    content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (
    record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (
      payload ->> 'schema_name'
        = 'petra.review-session-lifecycle-receipt'
    )
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'review_session_lifecycle_receipt_id'
        = review_session_lifecycle_receipt_id
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
      payload #>> '{content,prior_review_session_ref,review_session_id}'
        = review_session_id
    )
    CHECK (
      (payload #>> '{content,prior_review_session_ref,revision}')::bigint
        = prior_revision
    )
    CHECK (
      payload #>> '{content,prior_review_session_ref,content_hash}'
        = prior_content_hash
    )
    CHECK (
      payload #>> '{content,prior_review_session_ref,record_hash}'
        = prior_record_hash
    )
    CHECK (
      payload #>> '{content,prior_review_session_ref,lifecycle}'
        = prior_lifecycle
    )
    CHECK (
      payload #>> '{content,resulting_review_session_ref,review_session_id}'
        = review_session_id
    )
    CHECK (
      (payload #>> '{content,resulting_review_session_ref,revision}')::bigint
        = resulting_revision
    )
    CHECK (
      payload #>> '{content,resulting_review_session_ref,content_hash}'
        = resulting_content_hash
    )
    CHECK (
      payload #>> '{content,resulting_review_session_ref,record_hash}'
        = resulting_record_hash
    )
    CHECK (
      payload #>> '{content,resulting_review_session_ref,lifecycle}'
        = resulting_lifecycle
    )
    CHECK (payload #>> '{content,transition}' = transition)
    CHECK (
      CASE
        WHEN payload -> 'content' ? 'rationale'
          THEN payload #>> '{content,rationale}' = rationale
        ELSE rationale IS NULL
      END
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  UNIQUE (
    review_session_lifecycle_receipt_id, revision, content_hash, record_hash
  ),
  FOREIGN KEY (command_id, command_fingerprint)
    REFERENCES petra.command_executions (command_id, command_fingerprint)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, review_session_id, prior_revision, prior_content_hash,
    prior_record_hash
  ) REFERENCES petra.review_session_revisions (
    project_id, review_session_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, review_session_id, resulting_revision,
    resulting_content_hash, resulting_record_hash
  ) REFERENCES petra.review_session_revisions (
    project_id, review_session_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (command_name = 'DeferReviewSession'
      AND transition = 'deferred'
      AND prior_lifecycle = 'open'
      AND resulting_lifecycle = 'deferred')
    OR (command_name = 'ReopenReviewSession'
      AND transition = 'reopened'
      AND prior_lifecycle = 'deferred'
      AND resulting_lifecycle = 'open')
  )
);

CREATE INDEX review_session_lifecycle_receipts_session_idx
  ON petra.review_session_lifecycle_receipts (
    project_id, review_session_id, resulting_revision
  );

CREATE TRIGGER review_session_lifecycle_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.review_session_lifecycle_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.review_session_lifecycle_receipts IS
  'Authenticated, idempotent ReviewSession defer/reopen receipts. These transitions retain working and authority records and emit no Project domain event or projection instruction.';
