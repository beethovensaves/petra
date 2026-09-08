ALTER TABLE petra.canonical_entity_revisions
  ADD CONSTRAINT canonical_entity_revisions_exact_record_key
  UNIQUE (entity_id, revision, record_hash);

ALTER TABLE petra.artifact_manifests
  ADD CONSTRAINT artifact_manifests_exact_record_key
  UNIQUE (artifact_manifest_id, revision, record_hash);

ALTER TABLE petra.work_version_revisions
  ADD CONSTRAINT work_version_revisions_work_exact_key
  UNIQUE (work_id, work_version_id, revision);

CREATE FUNCTION petra.guard_project_source_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project sources cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.project_source_id <> OLD.project_source_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.artifact_manifest_id <> OLD.artifact_manifest_id THEN
    RAISE EXCEPTION 'project source identity and copy are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project source current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.project_sources (
  project_source_id text PRIMARY KEY
    CHECK (project_source_id ~ '^project_source_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  artifact_manifest_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  UNIQUE (project_id, artifact_manifest_id),
  UNIQUE (project_id, project_source_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_manifest_id)
    REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_source_revisions (
  project_source_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  binding_kind text NOT NULL CHECK (binding_kind = 'scientific_work_version'),
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL,
  project_definition_content_hash text NOT NULL
    CHECK (project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_role text NOT NULL
    CHECK (source_role ~ '^[a-z][a-z0-9._/-]{1,199}$'),
  work_id text NOT NULL,
  work_revision bigint NOT NULL,
  work_record_hash text NOT NULL
    CHECK (work_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  work_version_id text NOT NULL,
  work_version_revision bigint NOT NULL,
  work_version_record_hash text NOT NULL
    CHECK (work_version_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  artifact_manifest_id text NOT NULL,
  artifact_manifest_revision bigint NOT NULL CHECK (artifact_manifest_revision = 1),
  artifact_manifest_record_hash text NOT NULL
    CHECK (artifact_manifest_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('active', 'excluded')),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  added_by_actor_id text NOT NULL,
  added_by_actor_kind text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.project-source'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'project_source_id' = project_source_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,binding_kind}' = binding_kind)
    CHECK (payload #>> '{content,source_role}' = source_role)
    CHECK (payload #>> '{content,status}' = status)
    CHECK (payload ->> 'content_hash' = content_hash),
  added_at timestamptz NOT NULL,
  PRIMARY KEY (project_source_id, revision),
  UNIQUE (project_source_id, revision, content_hash),
  FOREIGN KEY (project_id, project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_id, work_revision)
    REFERENCES petra.work_revisions (work_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    work_id, work_version_id, work_version_revision
  ) REFERENCES petra.work_version_revisions (
    work_id, work_version_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_id, work_revision, work_record_hash)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id, work_version_revision, work_version_record_hash)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    artifact_manifest_id, artifact_manifest_revision,
    artifact_manifest_record_hash
  ) REFERENCES petra.artifact_manifests (
    artifact_manifest_id, revision, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (added_by_actor_id, added_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.project_sources
  ADD CONSTRAINT project_sources_current_revision_fkey
  FOREIGN KEY (project_source_id, current_revision)
  REFERENCES petra.project_source_revisions (project_source_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.project_source_author_refs (
  project_source_id text NOT NULL,
  project_source_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  author_id text NOT NULL,
  author_revision bigint NOT NULL,
  author_record_hash text NOT NULL
    CHECK (author_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (project_source_id, project_source_revision, position),
  UNIQUE (project_source_id, project_source_revision, author_id),
  FOREIGN KEY (project_source_id, project_source_revision)
    REFERENCES petra.project_source_revisions (project_source_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (author_id, author_revision)
    REFERENCES petra.author_revisions (author_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (author_id, author_revision, author_record_hash)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, revision, record_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.validate_project_source_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  definition_role_count bigint;
  bound_origin_work_version_id text;
  expected_authors jsonb;
  observed_authors jsonb;
BEGIN
  SELECT count(*) INTO definition_role_count
    FROM petra.project_definition_revisions AS definition,
         jsonb_array_elements(definition.payload #> '{content,registrations}') AS registration
   WHERE definition.project_id = NEW.project_id
     AND definition.project_definition_id = NEW.project_definition_id
     AND definition.revision = NEW.project_definition_revision
     AND definition.content_hash = NEW.project_definition_content_hash
     AND registration ->> 'registration_kind' = 'source_role'
     AND registration ->> 'semantic_key' = NEW.source_role
     AND registration #>> '{contract,name}' = 'petra.rights-decision'
     AND registration #>> '{contract,version}' = '1.0.0';

  IF definition_role_count <> 1 THEN
    RAISE EXCEPTION 'scientific project source role must register the RightsDecision contract exactly once'
      USING ERRCODE = '23514';
  END IF;

  SELECT manifest.origin_work_version_id INTO bound_origin_work_version_id
    FROM petra.artifact_manifests AS manifest
   WHERE manifest.artifact_manifest_id = NEW.artifact_manifest_id;
  IF bound_origin_work_version_id IS DISTINCT FROM NEW.work_version_id THEN
    RAISE EXCEPTION 'project source copy must originate from its exact WorkVersion'
      USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'author_id', credit.author_id,
             'revision', author_ref.author_revision,
             'record_hash', author_ref.author_record_hash
           ) ORDER BY credit.position
         ), '[]'::jsonb)
    INTO observed_authors
    FROM petra.work_author_credits AS credit
    JOIN petra.project_source_author_refs AS author_ref
      ON author_ref.project_source_id = NEW.project_source_id
     AND author_ref.project_source_revision = NEW.revision
     AND author_ref.position = credit.position
     AND author_ref.author_id = credit.author_id
   WHERE credit.work_id = NEW.work_id
     AND credit.work_revision = NEW.work_revision;
  expected_authors := NEW.payload #> '{content,author_refs}';
  IF observed_authors IS DISTINCT FROM expected_authors THEN
    RAISE EXCEPTION 'project source authors must exactly bind the selected Work revision credits'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER project_source_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_sources
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_source_identity();

CREATE TRIGGER project_source_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER project_source_author_refs_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_author_refs
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE CONSTRAINT TRIGGER project_source_revision_is_consistent
AFTER INSERT ON petra.project_source_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_project_source_revision();

CREATE INDEX project_source_revisions_project_status_idx
  ON petra.project_source_revisions (project_id, status, added_at, project_source_id);

COMMENT ON TABLE petra.project_sources IS
  'Stable Project-owned source identities, each bound to one immutable source copy.';
COMMENT ON TABLE petra.project_source_revisions IS
  'Immutable exact bindings across ProjectDefinition, scholarly identity, and ArtifactManifest authority.';
