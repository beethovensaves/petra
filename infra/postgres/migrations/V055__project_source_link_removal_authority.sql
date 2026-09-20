CREATE TABLE petra.project_source_link_removal_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^source_link_removal_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
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
  project_source_id text NOT NULL,
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
  prior_revision bigint NOT NULL CHECK (prior_revision >= 1),
  prior_content_hash text NOT NULL CHECK (
    prior_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  prior_record_hash text NOT NULL CHECK (
    prior_record_hash ~ '^sha256:[0-9a-f]{64}$'
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
  lifecycle_receipt_id text NOT NULL,
  lifecycle_revision bigint NOT NULL DEFAULT 1 CHECK (lifecycle_revision = 1),
  lifecycle_content_hash text NOT NULL CHECK (
    lifecycle_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  lifecycle_record_hash text NOT NULL CHECK (
    lifecycle_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.project-source-link-removal-receipt'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  recorded_at timestamptz NOT NULL,
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
    project_source_id, prior_revision, prior_content_hash, prior_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_source_id, resulting_revision, resulting_content_hash,
    resulting_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    lifecycle_receipt_id, lifecycle_revision, lifecycle_content_hash,
    lifecycle_record_hash
  ) REFERENCES petra.project_source_lifecycle_receipts (
    project_source_lifecycle_receipt_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (payload ->> 'schema_name' = schema_name),
  CHECK (payload ->> 'schema_version' = schema_version),
  CHECK (payload ->> 'receipt_id' = receipt_id),
  CHECK (payload ->> 'command_id' = command_id),
  CHECK (payload ->> 'idempotency_key' = idempotency_key),
  CHECK (payload ->> 'request_hash' = request_hash),
  CHECK (payload ->> 'project_id' = project_id),
  CHECK (payload #>> '{actor,actor_id}' = actor_id),
  CHECK (payload #>> '{actor,actor_kind}' = actor_kind),
  CHECK (payload ->> 'capability_grant_id' = capability_grant_id),
  CHECK (payload #>> '{project_ref,project_id}' = project_id),
  CHECK ((payload #>> '{project_ref,revision}')::bigint = project_revision),
  CHECK (payload #>> '{project_ref,record_hash}' = project_record_hash),
  CHECK (
    payload #>> '{project_definition_ref,project_definition_id}'
      = project_definition_id
  ),
  CHECK (
    (payload #>> '{project_definition_ref,revision}')::bigint
      = project_definition_revision
  ),
  CHECK (
    payload #>> '{project_definition_ref,content_hash}'
      = project_definition_content_hash
  ),
  CHECK (
    payload #>> '{project_definition_ref,record_hash}'
      = project_definition_record_hash
  ),
  CHECK (payload #>> '{prior_source_ref,project_source_id}' = project_source_id),
  CHECK ((payload #>> '{prior_source_ref,revision}')::bigint = prior_revision),
  CHECK (payload #>> '{prior_source_ref,content_hash}' = prior_content_hash),
  CHECK (payload #>> '{prior_source_ref,record_hash}' = prior_record_hash),
  CHECK (payload #>> '{prior_source_ref,status}' = 'active'),
  CHECK (
    payload #>> '{resulting_source_ref,project_source_id}' = project_source_id
  ),
  CHECK (
    (payload #>> '{resulting_source_ref,revision}')::bigint
      = resulting_revision
  ),
  CHECK (
    payload #>> '{resulting_source_ref,content_hash}'
      = resulting_content_hash
  ),
  CHECK (
    payload #>> '{resulting_source_ref,record_hash}' = resulting_record_hash
  ),
  CHECK (payload #>> '{resulting_source_ref,status}' = 'excluded'),
  CHECK (
    payload #>> '{lifecycle_receipt,project_source_lifecycle_receipt_id}'
      = lifecycle_receipt_id
  ),
  CHECK (
    (payload #>> '{lifecycle_receipt,revision}')::bigint = lifecycle_revision
  ),
  CHECK (
    payload #>> '{lifecycle_receipt,content_hash}' = lifecycle_content_hash
  ),
  CHECK (payload #>> '{effect,kind}' = 'project_source_link_removed'),
  CHECK (payload #>> '{effect,ordinary_new_project_use}' = 'disabled'),
  CHECK ((payload #>> '{effect,local_copy_deleted}')::boolean = false),
  CHECK (payload ->> 'record_hash' = record_hash),
  CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at)
);

CREATE TRIGGER project_source_link_removal_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_link_removal_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_link_removal_receipts_source_idx
  ON petra.project_source_link_removal_receipts (
    project_id, project_source_id, resulting_revision
  );

COMMENT ON TABLE petra.project_source_link_removal_receipts IS
  'Immutable exact-context receipt composing ExcludeProjectSource as Project-link removal without local-copy deletion.';
