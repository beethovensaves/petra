CREATE TABLE petra.project_import_command_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^project_import_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 512
      AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
    ),
  request_hash text NOT NULL
    CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  source_project_id text NOT NULL,
  source_project_revision bigint NOT NULL CHECK (source_project_revision >= 1),
  source_project_record_hash text NOT NULL
    CHECK (source_project_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_project_definition_id text NOT NULL,
  source_project_definition_revision bigint NOT NULL
    CHECK (source_project_definition_revision >= 1),
  source_project_definition_content_hash text NOT NULL
    CHECK (source_project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_project_definition_record_hash text NOT NULL
    CHECK (source_project_definition_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_objective_id text NOT NULL,
  source_objective_revision bigint NOT NULL CHECK (source_objective_revision >= 1),
  source_objective_content_hash text NOT NULL
    CHECK (source_objective_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_objective_record_hash text NOT NULL
    CHECK (source_objective_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  resulting_project_id text NOT NULL UNIQUE,
  schema_name text NOT NULL
    CHECK (schema_name = 'petra.project-import-command-receipt'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'receipt_id' = receipt_id)
    CHECK (payload ->> 'command_id' = command_id)
    CHECK (payload ->> 'idempotency_key' = idempotency_key)
    CHECK (payload -> 'source' -> 'project_ref' ->> 'project_id' = source_project_id)
    CHECK (payload -> 'result' -> 'project_ref' ->> 'project_id' = resulting_project_id),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    source_project_id,
    source_project_revision
  ) REFERENCES petra.project_revisions (project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    source_project_id,
    source_project_definition_id,
    source_project_definition_revision,
    source_project_definition_content_hash,
    source_project_definition_record_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id,
    project_definition_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    source_project_id,
    source_objective_id,
    source_objective_revision,
    source_objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id,
    objective_id,
    revision,
    content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (resulting_project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_import_command_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_import_command_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_import_command_receipts_source_idx
  ON petra.project_import_command_receipts (
    source_project_id,
    source_project_revision,
    recorded_at
  );

COMMENT ON TABLE petra.project_import_command_receipts IS
  'Immutable reviewed retained-Project reuse receipts. Each row is the ancestry link from one exact source Project/definition/focused objective to one new derived Project; source authority is never copied or modified.';
