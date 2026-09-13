CREATE TABLE petra.controlled_writing_requirement_records (
  requirement_id text NOT NULL CHECK (
    requirement_id ~ '^requirement_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.controlled-writing-requirement'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'requirement_id' = requirement_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{project_definition_ref,project_definition_id}' = project_definition_id)
    CHECK ((payload #>> '{project_definition_ref,revision}')::bigint = project_definition_revision)
    CHECK (payload #>> '{project_definition_ref,content_hash}' = project_definition_content_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK (payload #>> '{authority_boundary,domain_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,review_decision}' = 'false')
    CHECK (payload #>> '{authority_boundary,mutation_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,apply_path}' = 'false'),
  PRIMARY KEY (requirement_id, revision),
  UNIQUE (project_id, requirement_id, revision, record_hash),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.controlled_writing_governing_relationship_records (
  governing_relationship_id text NOT NULL CHECK (
    governing_relationship_id ~ '^governing_relationship_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  requirement_id text NOT NULL,
  requirement_revision bigint NOT NULL CHECK (requirement_revision = 1),
  requirement_record_hash text NOT NULL CHECK (
    requirement_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.controlled-writing-governing-relationship'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'governing_relationship_id' = governing_relationship_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{project_definition_ref,project_definition_id}' = project_definition_id)
    CHECK ((payload #>> '{project_definition_ref,revision}')::bigint = project_definition_revision)
    CHECK (payload #>> '{project_definition_ref,content_hash}' = project_definition_content_hash)
    CHECK (payload #>> '{content,requirement_ref,record_id}' = requirement_id)
    CHECK ((payload #>> '{content,requirement_ref,revision}')::bigint = requirement_revision)
    CHECK (payload #>> '{content,requirement_ref,record_hash}' = requirement_record_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK (payload #>> '{content,predicate}' = 'GOVERNS')
    CHECK (payload #>> '{authority_boundary,domain_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,review_decision}' = 'false')
    CHECK (payload #>> '{authority_boundary,mutation_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,apply_path}' = 'false'),
  PRIMARY KEY (governing_relationship_id, revision),
  UNIQUE (project_id, governing_relationship_id, revision, record_hash),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, requirement_id, requirement_revision, requirement_record_hash
  ) REFERENCES petra.controlled_writing_requirement_records (
    project_id, requirement_id, revision, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.working_candidate_revisions
  ADD COLUMN profile_record_schema_name text,
  ADD COLUMN profile_record_id text,
  ADD COLUMN profile_record_revision bigint,
  ADD COLUMN profile_record_hash text;

UPDATE petra.working_candidate_revisions
   SET profile_record_schema_name = 'petra.claim',
       profile_record_id = profile_evidence_id,
       profile_record_revision = profile_evidence_revision,
       profile_record_hash = profile_evidence_record_hash;

ALTER TABLE petra.working_candidate_revisions
  ALTER COLUMN profile_record_schema_name SET NOT NULL,
  ALTER COLUMN profile_record_id SET NOT NULL,
  ALTER COLUMN profile_record_revision SET NOT NULL,
  ALTER COLUMN profile_record_hash SET NOT NULL,
  ALTER COLUMN profile_evidence_id DROP NOT NULL,
  ALTER COLUMN profile_evidence_kind DROP NOT NULL,
  ALTER COLUMN profile_evidence_revision DROP NOT NULL,
  ALTER COLUMN profile_evidence_record_hash DROP NOT NULL,
  ADD CONSTRAINT working_candidate_profile_record_columns_check CHECK (
    profile_record_revision >= 1
    AND profile_record_hash ~ '^sha256:[0-9a-f]{64}$'
    AND payload #>> '{profile_object,object_record_ref,schema_name}' = profile_record_schema_name
    AND payload #>> '{profile_object,object_record_ref,record_id}' = profile_record_id
    AND (payload #>> '{profile_object,object_record_ref,revision}')::bigint = profile_record_revision
    AND payload #>> '{profile_object,object_record_ref,record_hash}' = profile_record_hash
  ),
  ADD CONSTRAINT working_candidate_evidence_compatibility_check CHECK (
    (profile_record_schema_name = 'petra.claim'
      AND profile_evidence_id = profile_record_id
      AND profile_evidence_kind = 'claim'
      AND profile_evidence_revision = profile_record_revision
      AND profile_evidence_record_hash = profile_record_hash)
    OR
    (profile_record_schema_name = 'petra.controlled-writing-requirement'
      AND profile_evidence_id IS NULL
      AND profile_evidence_kind IS NULL
      AND profile_evidence_revision IS NULL
      AND profile_evidence_record_hash IS NULL)
  );

ALTER TABLE petra.working_relationship_revisions
  ADD COLUMN profile_record_schema_name text,
  ADD COLUMN profile_record_id text,
  ADD COLUMN profile_record_revision bigint,
  ADD COLUMN profile_record_hash text;

UPDATE petra.working_relationship_revisions
   SET profile_record_schema_name = 'petra.assertion',
       profile_record_id = profile_evidence_id,
       profile_record_revision = profile_evidence_revision,
       profile_record_hash = profile_evidence_record_hash;

ALTER TABLE petra.working_relationship_revisions
  ALTER COLUMN profile_record_schema_name SET NOT NULL,
  ALTER COLUMN profile_record_id SET NOT NULL,
  ALTER COLUMN profile_record_revision SET NOT NULL,
  ALTER COLUMN profile_record_hash SET NOT NULL,
  ALTER COLUMN profile_evidence_id DROP NOT NULL,
  ALTER COLUMN profile_evidence_kind DROP NOT NULL,
  ALTER COLUMN profile_evidence_revision DROP NOT NULL,
  ALTER COLUMN profile_evidence_record_hash DROP NOT NULL,
  ADD CONSTRAINT working_relationship_profile_record_columns_check CHECK (
    profile_record_revision >= 1
    AND profile_record_hash ~ '^sha256:[0-9a-f]{64}$'
    AND payload #>> '{profile_relationship,relationship_record_ref,schema_name}' = profile_record_schema_name
    AND payload #>> '{profile_relationship,relationship_record_ref,record_id}' = profile_record_id
    AND (payload #>> '{profile_relationship,relationship_record_ref,revision}')::bigint = profile_record_revision
    AND payload #>> '{profile_relationship,relationship_record_ref,record_hash}' = profile_record_hash
  ),
  ADD CONSTRAINT working_relationship_evidence_compatibility_check CHECK (
    (profile_record_schema_name = 'petra.assertion'
      AND profile_evidence_id = profile_record_id
      AND profile_evidence_kind = 'assertion'
      AND profile_evidence_revision = profile_record_revision
      AND profile_evidence_record_hash = profile_record_hash)
    OR
    (profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
      AND profile_evidence_id IS NULL
      AND profile_evidence_kind IS NULL
      AND profile_evidence_revision IS NULL
      AND profile_evidence_record_hash IS NULL)
  );

CREATE FUNCTION petra.validate_working_profile_record_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'working_candidate_revisions' THEN
    IF NEW.profile_record_schema_name = 'petra.claim' THEN
      RETURN NEW;
    END IF;
    IF NEW.profile_record_schema_name = 'petra.controlled-writing-requirement'
       AND EXISTS (
         SELECT 1
           FROM petra.controlled_writing_requirement_records AS requirement
          WHERE requirement.project_id = NEW.project_id
            AND requirement.requirement_id = NEW.profile_record_id
            AND requirement.revision = NEW.profile_record_revision
            AND requirement.record_hash = NEW.profile_record_hash
       ) THEN
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'working_relationship_revisions' THEN
    IF NEW.profile_record_schema_name = 'petra.assertion' THEN
      RETURN NEW;
    END IF;
    IF NEW.profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
       AND EXISTS (
         SELECT 1
           FROM petra.controlled_writing_governing_relationship_records AS relationship
          WHERE relationship.project_id = NEW.project_id
            AND relationship.governing_relationship_id = NEW.profile_record_id
            AND relationship.revision = NEW.profile_record_revision
            AND relationship.record_hash = NEW.profile_record_hash
       ) THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Working state requires one exact installed profile-record binding'
    USING ERRCODE = '23514';
END;
$$;

CREATE CONSTRAINT TRIGGER working_candidate_profile_record_is_exact
AFTER INSERT ON petra.working_candidate_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_working_profile_record_binding();

CREATE CONSTRAINT TRIGGER working_relationship_profile_record_is_exact
AFTER INSERT ON petra.working_relationship_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_working_profile_record_binding();

CREATE TRIGGER controlled_writing_requirements_are_immutable
BEFORE UPDATE OR DELETE ON petra.controlled_writing_requirement_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER controlled_writing_governing_relationships_are_immutable
BEFORE UPDATE OR DELETE ON petra.controlled_writing_governing_relationship_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.controlled_writing_requirement_records IS
  'Exact non-authoritative controlled-writing Requirement payloads admitted only with WorkingCandidate revisions.';
COMMENT ON TABLE petra.controlled_writing_governing_relationship_records IS
  'Exact non-authoritative controlled-writing GOVERNS payloads admitted only with WorkingRelationship revisions.';
