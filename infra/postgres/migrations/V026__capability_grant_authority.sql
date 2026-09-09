CREATE TABLE petra.capability_grants (
  capability_grant_id text PRIMARY KEY
    CHECK (capability_grant_id ~ '^capability_grant_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  grantee_actor_id text NOT NULL,
  grantee_actor_kind text NOT NULL,
  scope_kind text NOT NULL CHECK (scope_kind = 'project_commands'),
  allowed_commands text[] NOT NULL CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet',
      'RecordApproval',
      'ApplyChangeSet',
      'ExcludeProjectSource',
      'RestoreProjectSource'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  valid_from timestamptz NOT NULL,
  expires_at timestamptz CHECK (
    expires_at IS NULL OR expires_at > valid_from
  ),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  issued_by_actor_id text NOT NULL,
  issued_by_actor_kind text NOT NULL CHECK (issued_by_actor_kind = 'human'),
  issued_at timestamptz NOT NULL CHECK (issued_at <= valid_from),
  schema_name text NOT NULL CHECK (schema_name = 'petra.capability-grant'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'capability_grant_id' = capability_grant_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload -> 'grantee' ->> 'actor_id' = grantee_actor_id)
    CHECK (payload -> 'grantee' ->> 'actor_kind' = grantee_actor_kind)
    CHECK (payload -> 'content' ->> 'scope_kind' = scope_kind)
    CHECK (
      payload -> 'content' -> 'allowed_commands' = to_jsonb(allowed_commands)
    )
    CHECK (
      (payload -> 'content' ->> 'valid_from')::timestamptz = valid_from
    )
    CHECK (
      CASE
        WHEN payload -> 'content' ? 'expires_at'
          THEN (payload -> 'content' ->> 'expires_at')::timestamptz
            = expires_at
        ELSE expires_at IS NULL
      END
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload -> 'issued_by' ->> 'actor_id' = issued_by_actor_id)
    CHECK (payload -> 'issued_by' ->> 'actor_kind' = issued_by_actor_kind)
    CHECK ((payload ->> 'issued_at')::timestamptz = issued_at),
  UNIQUE (
    capability_grant_id, revision, project_id, content_hash, record_hash
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (grantee_actor_id, grantee_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (issued_by_actor_id, issued_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.capability_grant_revocations (
  capability_grant_revocation_id text PRIMARY KEY CHECK (
    capability_grant_revocation_id
      ~ '^capability_grant_revocation_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL CHECK (revision = 1),
  capability_grant_id text NOT NULL UNIQUE,
  capability_grant_revision bigint NOT NULL CHECK (
    capability_grant_revision = 1
  ),
  project_id text NOT NULL,
  grant_content_hash text NOT NULL
    CHECK (grant_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  grant_record_hash text NOT NULL
    CHECK (grant_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  revoked_by_actor_id text NOT NULL,
  revoked_by_actor_kind text NOT NULL CHECK (revoked_by_actor_kind = 'human'),
  revoked_at timestamptz NOT NULL,
  schema_name text NOT NULL
    CHECK (schema_name = 'petra.capability-grant-revocation'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (
      payload ->> 'capability_grant_revocation_id'
        = capability_grant_revocation_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload -> 'grant_ref' ->> 'capability_grant_id'
        = capability_grant_id
    )
    CHECK (
      (payload -> 'grant_ref' ->> 'revision')::bigint
        = capability_grant_revision
    )
    CHECK (
      payload -> 'grant_ref' ->> 'content_hash' = grant_content_hash
    )
    CHECK (payload -> 'grant_ref' ->> 'record_hash' = grant_record_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload -> 'revoked_by' ->> 'actor_id' = revoked_by_actor_id)
    CHECK (payload -> 'revoked_by' ->> 'actor_kind' = revoked_by_actor_kind)
    CHECK ((payload ->> 'revoked_at')::timestamptz = revoked_at),
  FOREIGN KEY (
    capability_grant_id, capability_grant_revision, project_id,
    grant_content_hash, grant_record_hash
  ) REFERENCES petra.capability_grants (
    capability_grant_id, revision, project_id, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (revoked_by_actor_id, revoked_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX capability_grants_project_grantee_idx
  ON petra.capability_grants (
    project_id, grantee_actor_id, grantee_actor_kind, valid_from
  );

CREATE TRIGGER capability_grants_are_immutable
BEFORE UPDATE OR DELETE ON petra.capability_grants
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER capability_grant_revocations_are_immutable
BEFORE UPDATE OR DELETE ON petra.capability_grant_revocations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.capability_grants IS
  'Immutable Project-scoped grants of exact registered Petra commands.';
COMMENT ON TABLE petra.capability_grant_revocations IS
  'Immutable, exact-grant-bound revocations; reauthorization requires a new grant identity.';
