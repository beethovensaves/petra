DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT rel.relname AS table_name, con.conname
      FROM pg_constraint AS con
      JOIN pg_class AS rel ON rel.oid = con.conrelid
      JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'petra'
       AND con.contype = 'c'
       AND (
         (rel.relname IN ('model_role_certifications', 'model_requests')
           AND pg_get_constraintdef(con.oid) LIKE '%role%extractor%')
         OR (rel.relname IN (
               'model_role_certifications', 'model_requests', 'model_calls'
             )
           AND pg_get_constraintdef(con.oid) LIKE '%schema_version%1.0.0%')
       )
  LOOP
    EXECUTE format(
      'ALTER TABLE petra.%I DROP CONSTRAINT %I',
      constraint_row.table_name,
      constraint_row.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE petra.model_role_certifications
  ADD CONSTRAINT model_role_certifications_role_version_check
  CHECK (
    (role = 'extractor' AND payload ->> 'schema_version' = '1.0.0')
    OR (role = 'synthesist' AND payload ->> 'schema_version' = '1.1.0')
  );

ALTER TABLE petra.model_requests
  ADD CONSTRAINT model_requests_role_version_check
  CHECK (
    (role = 'extractor' AND payload ->> 'schema_version' = '1.0.0')
    OR (role = 'synthesist' AND payload ->> 'schema_version' = '1.1.0')
  );

ALTER TABLE petra.model_calls
  ADD CONSTRAINT model_calls_schema_version_check
  CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0'));

CREATE TABLE petra.context_packets (
  context_packet_id text PRIMARY KEY
    CHECK (context_packet_id ~ '^context_packet_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  snapshot_id text NOT NULL
    CHECK (snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 1),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.context-packet')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'context_packet_id' = context_packet_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{snapshot_ref,snapshot_revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at),
  UNIQUE (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.evidence_packets (
  evidence_packet_id text PRIMARY KEY
    CHECK (evidence_packet_id ~ '^evidence_packet_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  context_packet_id text NOT NULL,
  context_packet_hash text NOT NULL
    CHECK (context_packet_hash ~ '^sha256:[0-9a-f]{64}$'),
  snapshot_id text NOT NULL,
  snapshot_revision bigint NOT NULL,
  snapshot_event_position bigint NOT NULL,
  snapshot_hash text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.evidence-packet')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'evidence_packet_id' = evidence_packet_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,context_packet_ref,context_packet_id}' = context_packet_id)
    CHECK (payload #>> '{content,context_packet_ref,content_hash}' = context_packet_hash)
    CHECK (payload #>> '{snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((payload #>> '{snapshot_ref,snapshot_revision}')::bigint = snapshot_revision)
    CHECK ((payload #>> '{snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (payload #>> '{snapshot_ref,content_hash}' = snapshot_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at),
  UNIQUE (
    evidence_packet_id, project_id, context_packet_id, context_packet_hash,
    snapshot_id, snapshot_revision, snapshot_event_position, snapshot_hash,
    content_hash
  ),
  FOREIGN KEY (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, context_packet_hash
  ) REFERENCES petra.context_packets (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.grounded_responses (
  grounded_response_id text PRIMARY KEY
    CHECK (grounded_response_id ~ '^grounded_response_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  cache_key text NOT NULL UNIQUE CHECK (char_length(cache_key) BETWEEN 1 AND 512),
  response_artifact_id text NOT NULL,
  response_artifact_hash text NOT NULL,
  response_artifact_byte_size bigint NOT NULL,
  response_artifact_media_type text NOT NULL,
  context_packet_id text NOT NULL,
  context_packet_hash text NOT NULL,
  evidence_packet_id text NOT NULL,
  evidence_packet_hash text NOT NULL,
  snapshot_id text NOT NULL,
  snapshot_revision bigint NOT NULL,
  snapshot_event_position bigint NOT NULL,
  snapshot_hash text NOT NULL,
  model_request_id text NOT NULL,
  model_call_id text NOT NULL,
  model_deployment_id text NOT NULL,
  role_certification_id text NOT NULL,
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL,
  work_unit_id text NOT NULL,
  work_unit_revision bigint NOT NULL,
  work_unit_spec_hash text NOT NULL,
  model_output_hash text NOT NULL,
  terminal_persisted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (grounded_response_id, project_id),
  UNIQUE (grounded_response_id, cache_key),
  FOREIGN KEY (
    response_artifact_id, response_artifact_hash,
    response_artifact_byte_size, response_artifact_media_type
  ) REFERENCES petra.artifacts (
    artifact_id, content_hash, byte_size, media_type
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, context_packet_hash
  ) REFERENCES petra.context_packets (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    evidence_packet_id, project_id, context_packet_id, context_packet_hash,
    snapshot_id, snapshot_revision, snapshot_event_position, snapshot_hash,
    evidence_packet_hash
  ) REFERENCES petra.evidence_packets (
    evidence_packet_id, project_id, context_packet_id, context_packet_hash,
    snapshot_id, snapshot_revision, snapshot_event_position, snapshot_hash,
    content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_request_id)
    REFERENCES petra.model_requests (model_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_call_id)
    REFERENCES petra.model_calls (model_call_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (role_certification_id)
    REFERENCES petra.model_role_certifications (role_certification_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    interaction_run_id, interaction_run_revision, interaction_run_hash
  ) REFERENCES petra.interaction_run_revisions (
    interaction_run_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    work_unit_id, work_unit_revision, project_id, work_unit_spec_hash
  ) REFERENCES petra.work_unit_revisions (
    work_unit_id, revision, project_id, spec_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (response_artifact_media_type = 'text/markdown; charset=utf-8'),
  CHECK (model_output_hash ~ '^sha256:[0-9a-f]{64}$'),
  CHECK (terminal_persisted_at = created_at)
);

CREATE TABLE petra.grounded_response_revisions (
  grounded_response_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  parent_revision bigint,
  parent_hash text,
  cache_state text NOT NULL CHECK (cache_state IN ('reusable', 'invalidated')),
  cache_key text NOT NULL,
  cache_checked_at timestamptz NOT NULL,
  terminal_persisted_at timestamptz NOT NULL,
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.grounded-response')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'grounded_response_id' = grounded_response_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{content,cache,state}' = cache_state)
    CHECK (payload #>> '{content,cache,cache_key}' = cache_key)
    CHECK ((payload #>> '{content,cache,checked_at}')::timestamptz = cache_checked_at)
    CHECK ((payload #>> '{content,terminal,persisted_at}')::timestamptz = terminal_persisted_at)
    CHECK (payload #>> '{content,terminal,authority_effect}' = 'none')
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  PRIMARY KEY (grounded_response_id, revision),
  UNIQUE (grounded_response_id, revision, content_hash),
  FOREIGN KEY (grounded_response_id, project_id)
    REFERENCES petra.grounded_responses (grounded_response_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (grounded_response_id, cache_key)
    REFERENCES petra.grounded_responses (grounded_response_id, cache_key)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (grounded_response_id, parent_revision, parent_hash)
    REFERENCES petra.grounded_response_revisions (
      grounded_response_id, revision, content_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (revision = 1 AND parent_revision IS NULL AND parent_hash IS NULL
      AND cache_state = 'reusable')
    OR (revision > 1 AND parent_revision = revision - 1
      AND parent_hash IS NOT NULL AND cache_state = 'invalidated')
  ),
  CHECK (recorded_at >= terminal_persisted_at)
);

ALTER TABLE petra.grounded_responses
  ADD CONSTRAINT grounded_responses_current_revision_fkey
  FOREIGN KEY (grounded_response_id, current_revision)
  REFERENCES petra.grounded_response_revisions (
    grounded_response_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.grounded_response_dependencies (
  grounded_response_id text NOT NULL,
  response_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  dependency_role text NOT NULL
    CHECK (dependency_role IN ('selected_evidence', 'provenance', 'control')),
  object_kind text NOT NULL
    CHECK (object_kind IN ('claim', 'assertion', 'source_span', 'work_version')),
  object_id text NOT NULL,
  object_revision bigint NOT NULL CHECK (object_revision >= 1),
  object_hash text NOT NULL CHECK (object_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (grounded_response_id, response_revision, position),
  UNIQUE (
    grounded_response_id, response_revision, object_kind, object_id,
    object_revision, object_hash
  ),
  FOREIGN KEY (grounded_response_id, response_revision)
    REFERENCES petra.grounded_response_revisions (
      grounded_response_id, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.grounded_response_invalidation_causes (
  grounded_response_id text NOT NULL,
  response_revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  event_id text NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN ('change_set.applied', 'change_set.reverted')),
  change_set_id text NOT NULL,
  PRIMARY KEY (grounded_response_id, response_revision, position),
  UNIQUE (grounded_response_id, response_revision, event_id),
  FOREIGN KEY (grounded_response_id, response_revision)
    REFERENCES petra.grounded_response_revisions (
      grounded_response_id, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES petra.domain_events (event_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (change_set_id) REFERENCES petra.change_sets (change_set_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.grounded_response_authority_events (
  event_id text PRIMARY KEY,
  project_id text NOT NULL,
  event_position bigint NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN ('change_set.applied', 'change_set.reverted')),
  event_hash text NOT NULL CHECK (event_hash ~ '^sha256:[0-9a-f]{64}$'),
  processed_at timestamptz NOT NULL,
  affected_response_count bigint NOT NULL CHECK (affected_response_count >= 0),
  FOREIGN KEY (event_id) REFERENCES petra.domain_events (event_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_immutable_grounded_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Grounded response records are immutable; append a revision'
    USING ERRCODE = '55000';
END;
$$;

CREATE FUNCTION petra.guard_grounded_response_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'GroundedResponse heads cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF (to_jsonb(NEW) - 'current_revision')
       IS DISTINCT FROM (to_jsonb(OLD) - 'current_revision') THEN
    RAISE EXCEPTION 'GroundedResponse identity and bindings are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'GroundedResponse head must advance by one revision'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_grounded_response_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id text;
  target_revision bigint;
  response_record petra.grounded_response_revisions%ROWTYPE;
  expected_count bigint;
BEGIN
  target_id := COALESCE(NEW.grounded_response_id, OLD.grounded_response_id);
  IF TG_TABLE_NAME = 'grounded_response_revisions' THEN
    target_revision := COALESCE(NEW.revision, OLD.revision);
  ELSE
    target_revision := COALESCE(NEW.response_revision, OLD.response_revision);
  END IF;
  SELECT * INTO response_record
    FROM petra.grounded_response_revisions
   WHERE grounded_response_id = target_id
     AND revision = target_revision;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  expected_count := jsonb_array_length(
    response_record.payload #> '{content,dependencies}'
  );
  IF expected_count <> (
       SELECT count(*)
         FROM petra.grounded_response_dependencies
        WHERE grounded_response_id = target_id
          AND response_revision = target_revision
     ) OR EXISTS (
       SELECT 1
         FROM petra.grounded_response_dependencies AS dependency
        WHERE dependency.grounded_response_id = target_id
          AND dependency.response_revision = target_revision
          AND NOT (
            response_record.payload #>
              ARRAY['content', 'dependencies', (dependency.position - 1)::text]
            = jsonb_build_object(
                'dependency_role', dependency.dependency_role,
                'object_ref', jsonb_build_object(
                  'object_kind', dependency.object_kind,
                  'object_id', dependency.object_id,
                  'object_revision', dependency.object_revision,
                  'object_hash', dependency.object_hash
                )
              )
          )
     ) THEN
    RAISE EXCEPTION 'GroundedResponse dependency rows do not match payload'
      USING ERRCODE = '23514';
  END IF;

  expected_count := COALESCE(
    jsonb_array_length(
      response_record.payload #> '{content,cache,invalidated_by}'
    ),
    0
  );
  IF expected_count <> (
       SELECT count(*)
         FROM petra.grounded_response_invalidation_causes
        WHERE grounded_response_id = target_id
          AND response_revision = target_revision
     ) OR EXISTS (
       SELECT 1
         FROM petra.grounded_response_invalidation_causes AS cause
        WHERE cause.grounded_response_id = target_id
          AND cause.response_revision = target_revision
          AND NOT (
            response_record.payload #>
              ARRAY['content', 'cache', 'invalidated_by', (cause.position - 1)::text]
            = jsonb_build_object(
                'event_id', cause.event_id,
                'event_type', cause.event_type,
                'change_set_id', cause.change_set_id
              )
          )
     ) THEN
    RAISE EXCEPTION 'GroundedResponse invalidation rows do not match payload'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER guard_context_packets_immutable
BEFORE UPDATE OR DELETE ON petra.context_packets
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE TRIGGER guard_evidence_packets_immutable
BEFORE UPDATE OR DELETE ON petra.evidence_packets
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE TRIGGER guard_grounded_response_heads
BEFORE UPDATE OR DELETE ON petra.grounded_responses
FOR EACH ROW EXECUTE FUNCTION petra.guard_grounded_response_head();

CREATE TRIGGER guard_grounded_response_revisions_immutable
BEFORE UPDATE OR DELETE ON petra.grounded_response_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE TRIGGER guard_grounded_response_dependencies_immutable
BEFORE UPDATE OR DELETE ON petra.grounded_response_dependencies
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE TRIGGER guard_grounded_response_causes_immutable
BEFORE UPDATE OR DELETE ON petra.grounded_response_invalidation_causes
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE TRIGGER guard_grounded_response_events_immutable
BEFORE UPDATE OR DELETE ON petra.grounded_response_authority_events
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_grounded_record();

CREATE CONSTRAINT TRIGGER validate_grounded_response_revision_members
AFTER INSERT ON petra.grounded_response_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_grounded_response_members();

CREATE CONSTRAINT TRIGGER validate_grounded_response_dependency_members
AFTER INSERT ON petra.grounded_response_dependencies
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_grounded_response_members();

CREATE CONSTRAINT TRIGGER validate_grounded_response_cause_members
AFTER INSERT ON petra.grounded_response_invalidation_causes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_grounded_response_members();

CREATE INDEX grounded_response_dependencies_object_idx
  ON petra.grounded_response_dependencies (
    object_id, grounded_response_id, response_revision
  );

CREATE INDEX grounded_response_revisions_cache_idx
  ON petra.grounded_response_revisions (
    cache_key, cache_state, grounded_response_id, revision DESC
  );

COMMENT ON TABLE petra.grounded_responses IS
  'Stable operational answer identity and immutable upstream bindings; not scientific authority.';

COMMENT ON TABLE petra.grounded_response_revisions IS
  'Append-only cache-validity history for one immutable grounded response Artifact.';
