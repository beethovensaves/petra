ALTER TABLE petra.evidence_entity_revisions
  DROP CONSTRAINT evidence_entity_revisions_admission_kind_check,
  DROP CONSTRAINT evidence_entity_revisions_admission_authority_check;

ALTER TABLE petra.evidence_entity_revisions
  ADD CONSTRAINT evidence_entity_revisions_admission_kind_check
    CHECK (admission_kind IN (
      'proposal', 'working_correction', 'promotion', 'reversal'
    )),
  ADD CONSTRAINT evidence_entity_revisions_admission_authority_check
    CHECK (
      (revision = 1
        AND admission_kind = 'proposal'
        AND authority_zone = 'quarantine')
      OR (revision > 1
        AND admission_kind = 'working_correction'
        AND authority_zone = 'quarantine'
        AND review_state IN ('unreviewed', 'machine_checked', 'disputed'))
      OR (revision > 1
        AND admission_kind = 'promotion'
        AND authority_zone = 'trusted'
        AND review_state = 'human_accepted')
      OR (revision > 1
        AND admission_kind = 'reversal'
        AND authority_zone = 'quarantine'
        AND review_state = 'human_rejected')
    );

CREATE OR REPLACE FUNCTION petra.validate_evidence_revision_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.revision > 1
     AND NEW.admission_kind <> 'working_correction'
     AND NOT EXISTS (
       SELECT 1 FROM petra.evidence_revision_authorizations
        WHERE evidence_id = NEW.evidence_id
          AND evidence_kind = NEW.evidence_kind
          AND evidence_revision = NEW.revision
     ) THEN
    RAISE EXCEPTION 'Later authoritative evidence revision requires exact ChangeSet and Approval authorization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_working_candidate_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'working candidates cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.working_candidate_id <> OLD.working_candidate_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.profile_semantic_key <> OLD.profile_semantic_key
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'working candidate identity, Project, profile, and recorder are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'working candidate current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.working_candidates (
  working_candidate_id text PRIMARY KEY CHECK (
    working_candidate_id ~ '^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  profile_semantic_key text NOT NULL CHECK (
    profile_semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, working_candidate_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.working_candidate_revisions (
  working_candidate_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  definition_family text NOT NULL,
  profile_semantic_key text NOT NULL,
  profile_evidence_id text NOT NULL,
  profile_evidence_kind text NOT NULL CHECK (profile_evidence_kind = 'claim'),
  profile_evidence_revision bigint NOT NULL CHECK (profile_evidence_revision >= 1),
  profile_evidence_record_hash text NOT NULL CHECK (
    profile_evidence_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  producer_actor_id text NOT NULL,
  producer_actor_kind text NOT NULL,
  task_kind text NOT NULL CHECK (
    task_kind IN ('thread_turn', 'work_unit', 'interaction_work')
  ),
  snapshot_id text NOT NULL CHECK (
    snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 0),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  validation_state text NOT NULL CHECK (
    validation_state IN ('pending', 'completed', 'blocked')
  ),
  disposition text NOT NULL CHECK (disposition IN ('available', 'withdrawn')),
  schema_name text NOT NULL CHECK (schema_name = 'petra.working-candidate'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'working_candidate_id' = working_candidate_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{project_definition_ref,project_definition_id}' = project_definition_id)
    CHECK ((payload #>> '{project_definition_ref,revision}')::bigint = project_definition_revision)
    CHECK (payload #>> '{project_definition_ref,content_hash}' = project_definition_content_hash)
    CHECK (payload #>> '{project_definition_ref,definition_family}' = definition_family)
    CHECK (payload #>> '{profile_object,registration,semantic_key}' = profile_semantic_key)
    CHECK (payload #>> '{profile_object,object_record_ref,record_id}' = profile_evidence_id)
    CHECK ((payload #>> '{profile_object,object_record_ref,revision}')::bigint = profile_evidence_revision)
    CHECK (payload #>> '{profile_object,object_record_ref,record_hash}' = profile_evidence_record_hash)
    CHECK (payload #>> '{producer,actor,actor_id}' = producer_actor_id)
    CHECK (payload #>> '{producer,actor,actor_kind}' = producer_actor_kind)
    CHECK (payload #>> '{task_context,task_kind}' = task_kind)
    CHECK (payload #>> '{input_snapshot,snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{input_snapshot,snapshot_ref,revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{input_snapshot,snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{input_snapshot,snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload #>> '{validation,state}' = validation_state)
    CHECK (payload ->> 'disposition' = disposition)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{authority_boundary,domain_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,review_decision}' = 'false')
    CHECK (payload #>> '{authority_boundary,mutation_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,validation_grants_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,promotion_requires_review}' = 'true'),
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (working_candidate_id, revision),
  UNIQUE (working_candidate_id, revision, content_hash),
  UNIQUE (project_id, working_candidate_id, revision, content_hash),
  FOREIGN KEY (project_id, working_candidate_id)
    REFERENCES petra.working_candidates (project_id, working_candidate_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    profile_evidence_id, profile_evidence_kind,
    profile_evidence_revision, profile_evidence_record_hash
  ) REFERENCES petra.evidence_entity_revisions (
    evidence_id, evidence_kind, revision, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (producer_actor_id, producer_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.working_candidates
  ADD CONSTRAINT working_candidates_current_revision_fkey
  FOREIGN KEY (working_candidate_id, current_revision)
  REFERENCES petra.working_candidate_revisions (working_candidate_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.guard_working_relationship_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'working relationships cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.working_relationship_id <> OLD.working_relationship_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.profile_semantic_key <> OLD.profile_semantic_key
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'working relationship identity, Project, profile, and recorder are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'working relationship current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.working_relationships (
  working_relationship_id text PRIMARY KEY CHECK (
    working_relationship_id ~ '^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  profile_semantic_key text NOT NULL CHECK (
    profile_semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'
  ),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, working_relationship_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.working_relationship_revisions (
  working_relationship_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (project_definition_revision >= 1),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  definition_family text NOT NULL,
  profile_semantic_key text NOT NULL,
  predicate text NOT NULL,
  profile_evidence_id text NOT NULL,
  profile_evidence_kind text NOT NULL CHECK (profile_evidence_kind = 'assertion'),
  profile_evidence_revision bigint NOT NULL CHECK (profile_evidence_revision >= 1),
  profile_evidence_record_hash text NOT NULL CHECK (
    profile_evidence_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  producer_actor_id text NOT NULL,
  producer_actor_kind text NOT NULL,
  task_kind text NOT NULL CHECK (
    task_kind IN ('thread_turn', 'work_unit', 'interaction_work')
  ),
  snapshot_id text NOT NULL CHECK (
    snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 0),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  validation_state text NOT NULL CHECK (
    validation_state IN ('pending', 'completed', 'blocked')
  ),
  disposition text NOT NULL CHECK (disposition IN ('available', 'withdrawn')),
  schema_name text NOT NULL CHECK (schema_name = 'petra.working-relationship'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'working_relationship_id' = working_relationship_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{project_definition_ref,project_definition_id}' = project_definition_id)
    CHECK ((payload #>> '{project_definition_ref,revision}')::bigint = project_definition_revision)
    CHECK (payload #>> '{project_definition_ref,content_hash}' = project_definition_content_hash)
    CHECK (payload #>> '{project_definition_ref,definition_family}' = definition_family)
    CHECK (payload #>> '{profile_relationship,registration,semantic_key}' = profile_semantic_key)
    CHECK (payload #>> '{profile_relationship,predicate}' = predicate)
    CHECK (payload #>> '{profile_relationship,relationship_record_ref,record_id}' = profile_evidence_id)
    CHECK ((payload #>> '{profile_relationship,relationship_record_ref,revision}')::bigint = profile_evidence_revision)
    CHECK (payload #>> '{profile_relationship,relationship_record_ref,record_hash}' = profile_evidence_record_hash)
    CHECK (payload #>> '{producer,actor,actor_id}' = producer_actor_id)
    CHECK (payload #>> '{producer,actor,actor_kind}' = producer_actor_kind)
    CHECK (payload #>> '{task_context,task_kind}' = task_kind)
    CHECK (payload #>> '{input_snapshot,snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{input_snapshot,snapshot_ref,revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{input_snapshot,snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{input_snapshot,snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload #>> '{validation,state}' = validation_state)
    CHECK (payload ->> 'disposition' = disposition)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{authority_boundary,domain_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,review_decision}' = 'false')
    CHECK (payload #>> '{authority_boundary,mutation_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,validation_grants_authority}' = 'false')
    CHECK (payload #>> '{authority_boundary,promotion_requires_review}' = 'true'),
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (working_relationship_id, revision),
  UNIQUE (working_relationship_id, revision, content_hash),
  UNIQUE (project_id, working_relationship_id, revision, content_hash),
  FOREIGN KEY (project_id, working_relationship_id)
    REFERENCES petra.working_relationships (project_id, working_relationship_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    profile_evidence_id, profile_evidence_kind,
    profile_evidence_revision, profile_evidence_record_hash
  ) REFERENCES petra.evidence_entity_revisions (
    evidence_id, evidence_kind, revision, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (producer_actor_id, producer_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.working_relationships
  ADD CONSTRAINT working_relationships_current_revision_fkey
  FOREIGN KEY (working_relationship_id, current_revision)
  REFERENCES petra.working_relationship_revisions (working_relationship_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX working_candidates_project_recorded_idx
  ON petra.working_candidate_revisions (project_id, recorded_at DESC, working_candidate_id);
CREATE INDEX working_relationships_project_recorded_idx
  ON petra.working_relationship_revisions (project_id, recorded_at DESC, working_relationship_id);

CREATE TRIGGER working_candidate_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.working_candidates
FOR EACH ROW EXECUTE FUNCTION petra.guard_working_candidate_identity();
CREATE TRIGGER working_candidate_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.working_candidate_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER working_relationship_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.working_relationships
FOR EACH ROW EXECUTE FUNCTION petra.guard_working_relationship_identity();
CREATE TRIGGER working_relationship_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.working_relationship_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE FUNCTION petra.validate_working_evidence_correction_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.admission_kind = 'working_correction'
     AND NOT EXISTS (
       SELECT 1
         FROM petra.working_candidate_revisions
        WHERE profile_evidence_id = NEW.evidence_id
          AND profile_evidence_kind = NEW.evidence_kind
          AND profile_evidence_revision = NEW.revision
          AND profile_evidence_record_hash = NEW.record_hash
     )
     AND NOT EXISTS (
       SELECT 1
         FROM petra.working_relationship_revisions
        WHERE profile_evidence_id = NEW.evidence_id
          AND profile_evidence_kind = NEW.evidence_kind
          AND profile_evidence_revision = NEW.revision
          AND profile_evidence_record_hash = NEW.record_hash
     ) THEN
    RAISE EXCEPTION 'Working evidence correction requires one exact durable working revision binding'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER working_evidence_correction_is_bound
AFTER INSERT ON petra.evidence_entity_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_working_evidence_correction_binding();

COMMENT ON TABLE petra.working_candidates IS
  'Durable non-authoritative profile-record bindings; promotion remains in Review and ChangeSet authority.';
COMMENT ON TABLE petra.working_relationships IS
  'Durable non-authoritative registered relationship bindings; no graph or domain event is emitted here.';
