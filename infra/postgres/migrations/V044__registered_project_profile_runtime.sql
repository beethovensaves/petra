CREATE TABLE petra.registered_project_profiles (
  profile_id text NOT NULL
    CHECK (profile_id ~ '^project_template_[0-9A-HJKMNP-TV-Z]{26}$'),
  profile_version text NOT NULL
    CHECK (profile_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  definition_family text NOT NULL
    CHECK (definition_family ~ '^[a-z][a-z0-9.-]{2,127}$'),
  status text NOT NULL CHECK (status = 'active'),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  schema_name text NOT NULL CHECK (schema_name = 'petra.registered-project-profile'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'profile_id' = profile_id)
    CHECK (payload ->> 'profile_version' = profile_version)
    CHECK (payload ->> 'definition_family' = definition_family)
    CHECK (payload ->> 'status' = status)
    CHECK (payload ->> 'content_hash' = content_hash),
  registered_at timestamptz NOT NULL,
  PRIMARY KEY (profile_id, profile_version),
  UNIQUE (profile_id, profile_version, content_hash)
);

CREATE TRIGGER registered_project_profiles_are_immutable
BEFORE UPDATE OR DELETE ON petra.registered_project_profiles
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_profile_command_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^project_profile_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 512
      AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
    ),
  operation text NOT NULL CHECK (operation IN ('create', 'reset')),
  request_hash text NOT NULL
    CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  profile_content_hash text NOT NULL,
  prior_project_id text,
  resulting_project_id text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.project-profile-command-receipt'),
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
    CHECK (payload ->> 'operation' = operation),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (profile_id, profile_version, profile_content_hash)
    REFERENCES petra.registered_project_profiles (
      profile_id, profile_version, content_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (prior_project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (resulting_project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (operation = 'create' AND prior_project_id IS NULL)
    OR (operation = 'reset' AND prior_project_id IS NOT NULL)
  )
);

CREATE TRIGGER project_profile_command_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_profile_command_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX registered_project_profiles_family_idx
  ON petra.registered_project_profiles (definition_family, profile_id, profile_version);

COMMENT ON TABLE petra.registered_project_profiles IS
  'Immutable optional ProjectDefinition template profiles available for explicit Project creation; unique project-authored definitions remain valid.';
COMMENT ON TABLE petra.project_profile_command_receipts IS
  'Idempotent authenticated Project create/reset results. Reset archives its exact prior Project and creates a new Project; it never deletes retained authority.';
