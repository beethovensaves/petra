CREATE SCHEMA petra;

CREATE FUNCTION petra.text_array_is_unique(values_to_check text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT cardinality(values_to_check) = count(DISTINCT value)
  FROM unnest(values_to_check) AS value;
$$;

CREATE FUNCTION petra.reject_immutable_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; insert a new revision instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE FUNCTION petra.guard_project_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'projects cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.project_id <> OLD.project_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'project identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.actors (
  actor_id text PRIMARY KEY
    CHECK (actor_id ~ '^actor_[0-9A-HJKMNP-TV-Z]{26}$'),
  actor_kind text NOT NULL
    CHECK (actor_kind IN ('human', 'service', 'model')),
  display_name text NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 160),
  schema_name text NOT NULL CHECK (schema_name = 'petra.actor'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'actor_id' = actor_id)
    CHECK (payload ->> 'actor_kind' = actor_kind)
    CHECK (payload ->> 'display_name' = display_name),
  created_at timestamptz NOT NULL,
  UNIQUE (actor_id, actor_kind)
);

CREATE TRIGGER actors_are_immutable
BEFORE UPDATE OR DELETE ON petra.actors
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.projects (
  project_id text PRIMARY KEY
    CHECK (project_id ~ '^project_[0-9A-HJKMNP-TV-Z]{26}$'),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_revisions (
  project_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  schema_name text NOT NULL CHECK (schema_name = 'petra.project'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 240),
  description text CHECK (
    description IS NULL OR char_length(description) BETWEEN 1 AND 4000
  ),
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  visibility text NOT NULL CHECK (visibility = 'private'),
  enabled_evidence_namespaces text[] NOT NULL CHECK (
    cardinality(enabled_evidence_namespaces) >= 1
    AND enabled_evidence_namespaces <@ ARRAY[
      'scholarly', 'operational', 'personal', 'discovery'
    ]::text[]
    AND petra.text_array_is_unique(enabled_evidence_namespaces)
  ),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'name' = name)
    CHECK (payload ->> 'status' = status)
    CHECK (payload ->> 'visibility' = visibility),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL CHECK (updated_at >= created_at),
  PRIMARY KEY (project_id, revision),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.projects
  ADD CONSTRAINT projects_current_revision_fkey
  FOREIGN KEY (project_id, current_revision)
  REFERENCES petra.project_revisions (project_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER project_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.projects
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_identity();

CREATE TRIGGER project_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_revisions_status_idx
  ON petra.project_revisions (status, project_id, revision DESC);

COMMENT ON SCHEMA petra IS
  'Petra authoritative application records; Flyway history remains operational metadata.';
COMMENT ON TABLE petra.actors IS
  'Immutable actors that can author or execute Petra work.';
COMMENT ON TABLE petra.projects IS
  'Stable Project identities and their current authoritative revision pointers.';
COMMENT ON TABLE petra.project_revisions IS
  'Immutable, schema-versioned Project history with queryable scope fields.';
