CREATE TABLE petra.project_definition_draft_command_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^definition_draft_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 512
      AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
    ),
  request_hash text NOT NULL
    CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  draft_id text NOT NULL
    CHECK (draft_id ~ '^project_definition_draft_[0-9A-HJKMNP-TV-Z]{26}$'),
  draft_content_hash text NOT NULL
    CHECK (draft_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  resulting_project_id text NOT NULL UNIQUE,
  schema_name text NOT NULL
    CHECK (schema_name = 'petra.project-definition-draft-command-receipt'),
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
    CHECK (payload #>> '{draft_ref,draft_id}' = draft_id)
    CHECK (payload #>> '{draft_ref,content_hash}' = draft_content_hash)
    CHECK (payload #>> '{project_ref,project_id}' = resulting_project_id),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (resulting_project_id)
    REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_definition_draft_command_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_definition_draft_command_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.project_definition_draft_command_receipts IS
  'Idempotent authenticated results for atomically creating a Project, ProjectDefinition, first objective, and current objective focus from one exact reviewed use-agnostic definition draft.';
