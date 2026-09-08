CREATE FUNCTION petra.guard_project_definition_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project definitions cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.project_definition_id <> OLD.project_definition_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.definition_family <> OLD.definition_family THEN
    RAISE EXCEPTION 'project definition identity is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project definition current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_project_objective_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project objectives cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.objective_id <> OLD.objective_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'project objective identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project objective current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.project_definitions (
  project_definition_id text PRIMARY KEY
    CHECK (project_definition_id ~ '^project_definition_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL UNIQUE,
  definition_family text NOT NULL
    CHECK (definition_family ~ '^[a-z][a-z0-9.-]{2,127}$'),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_definition_revisions (
  project_definition_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.project-definition'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  definition_family text NOT NULL
    CHECK (definition_family ~ '^[a-z][a-z0-9.-]{2,127}$'),
  origin_kind text NOT NULL
    CHECK (origin_kind IN ('project_authored', 'template_seed')),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'project_definition_id' = project_definition_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'definition_family' = definition_family)
    CHECK (payload -> 'origin' ->> 'origin_kind' = origin_kind)
    CHECK (payload ->> 'content_hash' = content_hash),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (project_definition_id, revision),
  UNIQUE (project_definition_id, revision, content_hash),
  UNIQUE (project_id, project_definition_id, revision, content_hash),
  FOREIGN KEY (project_definition_id) REFERENCES petra.project_definitions (
    project_definition_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.project_definitions
  ADD CONSTRAINT project_definitions_current_revision_fkey
  FOREIGN KEY (project_definition_id, current_revision)
  REFERENCES petra.project_definition_revisions (
    project_definition_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER project_definition_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_definitions
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_definition_identity();

CREATE TRIGGER project_definition_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_definition_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_objectives (
  objective_id text PRIMARY KEY
    CHECK (objective_id ~ '^objective_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_objective_revisions (
  objective_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.project-objective'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_kind text NOT NULL
    CHECK (objective_kind ~ '^[a-z][a-z0-9._/-]{1,199}$'),
  status text NOT NULL
    CHECK (status IN ('active', 'satisfied', 'superseded', 'abandoned')),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'objective_id' = objective_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload -> 'project_definition_ref' ->> 'project_definition_id'
        = project_definition_id
    )
    CHECK (
      (payload -> 'project_definition_ref' ->> 'revision')::bigint
        = project_definition_revision
    )
    CHECK (
      payload -> 'project_definition_ref' ->> 'content_hash'
        = project_definition_content_hash
    )
    CHECK (payload -> 'content' ->> 'objective_kind' = objective_kind)
    CHECK (payload -> 'content' ->> 'status' = status)
    CHECK (payload ->> 'content_hash' = content_hash),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL CHECK (updated_at >= created_at),
  PRIMARY KEY (objective_id, revision),
  UNIQUE (objective_id, revision, content_hash),
  UNIQUE (project_id, objective_id, revision, content_hash),
  FOREIGN KEY (objective_id) REFERENCES petra.project_objectives (objective_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    project_definition_id,
    project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id,
    project_definition_id,
    revision,
    content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.project_objectives
  ADD CONSTRAINT project_objectives_current_revision_fkey
  FOREIGN KEY (objective_id, current_revision)
  REFERENCES petra.project_objective_revisions (objective_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER project_objective_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_objectives
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_objective_identity();

CREATE TRIGGER project_objective_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_objective_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_objective_dependencies (
  project_id text NOT NULL,
  objective_id text NOT NULL,
  objective_revision bigint NOT NULL,
  objective_content_hash text NOT NULL,
  relation_kind text NOT NULL CHECK (relation_kind IN ('parent', 'dependency')),
  position integer NOT NULL CHECK (position >= 0),
  related_objective_id text NOT NULL,
  related_objective_revision bigint NOT NULL,
  related_objective_content_hash text NOT NULL,
  PRIMARY KEY (objective_id, objective_revision, relation_kind, position),
  UNIQUE (
    objective_id,
    objective_revision,
    relation_kind,
    related_objective_id,
    related_objective_revision,
    related_objective_content_hash
  ),
  FOREIGN KEY (
    project_id, objective_id, objective_revision, objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id, objective_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    related_objective_id,
    related_objective_revision,
    related_objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id, objective_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (objective_id <> related_objective_id)
);

CREATE TRIGGER project_objective_dependencies_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_objective_dependencies
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_objective_focus (
  project_id text PRIMARY KEY,
  objective_id text NOT NULL,
  objective_revision bigint NOT NULL,
  objective_content_hash text NOT NULL,
  changed_by_actor_id text NOT NULL,
  changed_by_actor_kind text NOT NULL,
  changed_at timestamptz NOT NULL,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, objective_id, objective_revision, objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id, objective_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (changed_by_actor_id, changed_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_objective_focus_history (
  focus_sequence bigserial PRIMARY KEY,
  project_id text NOT NULL,
  objective_id text,
  objective_revision bigint,
  objective_content_hash text,
  changed_by_actor_id text NOT NULL,
  changed_by_actor_kind text NOT NULL,
  changed_at timestamptz NOT NULL,
  CHECK (
    (objective_id IS NULL
      AND objective_revision IS NULL
      AND objective_content_hash IS NULL)
    OR
    (objective_id IS NOT NULL
      AND objective_revision IS NOT NULL
      AND objective_content_hash IS NOT NULL)
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    objective_id, objective_revision, objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    objective_id, revision, content_hash
  ) MATCH FULL ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (changed_by_actor_id, changed_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_objective_focus_history_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_objective_focus_history
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_definition_revisions_project_idx
  ON petra.project_definition_revisions (project_id, revision DESC);

CREATE INDEX project_objective_revisions_project_status_idx
  ON petra.project_objective_revisions (project_id, status, objective_id, revision DESC);

CREATE INDEX project_objective_dependencies_related_idx
  ON petra.project_objective_dependencies (
    related_objective_id, related_objective_revision
  );

CREATE INDEX project_objective_focus_history_project_idx
  ON petra.project_objective_focus_history (project_id, focus_sequence DESC);

COMMENT ON TABLE petra.project_definitions IS
  'One stable Project-owned definition identity and its current revision pointer.';
COMMENT ON TABLE petra.project_definition_revisions IS
  'Immutable ProjectDefinition history; templates are recorded origins only.';
COMMENT ON TABLE petra.project_objective_revisions IS
  'Immutable Objectives bound to exact ProjectDefinition revisions.';
COMMENT ON TABLE petra.project_objective_focus IS
  'The current Project pointer to at most one exact active Objective revision.';
COMMENT ON TABLE petra.project_objective_focus_history IS
  'Append-only history of Project objective-focus selections and clears.';
