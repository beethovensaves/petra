ALTER TABLE petra.evidence_entity_revisions
  ADD CONSTRAINT evidence_entity_revisions_exact_record_key
  UNIQUE (evidence_id, evidence_kind, revision, record_hash);

CREATE FUNCTION petra.guard_review_session_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'review sessions cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.review_session_id <> OLD.review_session_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'review session identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'review session current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.review_sessions (
  review_session_id text PRIMARY KEY
    CHECK (review_session_id ~ '^review_session_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL CHECK (created_by_actor_kind = 'human'),
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, review_session_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.review_session_revisions (
  review_session_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_id text,
  objective_revision bigint,
  objective_content_hash text,
  lifecycle text NOT NULL CHECK (lifecycle IN ('open', 'deferred', 'completed')),
  responsible_actor_id text NOT NULL,
  responsible_actor_kind text NOT NULL CHECK (responsible_actor_kind = 'human'),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 0),
  snapshot_stream_revision bigint NOT NULL CHECK (snapshot_stream_revision >= 0),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  schema_name text NOT NULL CHECK (schema_name = 'petra.review-session'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'review_session_id' = review_session_id)
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
    CHECK (payload #>> '{content,lifecycle}' = lifecycle)
    CHECK (payload #>> '{content,responsible,actor_id}' = responsible_actor_id)
    CHECK (payload #>> '{content,responsible,actor_kind}' = responsible_actor_kind)
    CHECK (
      (payload #>> '{content,snapshot,event_position}')::bigint
        = snapshot_event_position
    )
    CHECK (
      (payload #>> '{content,snapshot,stream_revision}')::bigint
        = snapshot_stream_revision
    )
    CHECK (payload ->> 'content_hash' = content_hash),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (review_session_id, revision),
  UNIQUE (review_session_id, revision, content_hash),
  UNIQUE (project_id, review_session_id, revision, content_hash),
  FOREIGN KEY (project_id, review_session_id)
    REFERENCES petra.review_sessions (project_id, review_session_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, objective_id, objective_revision, objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id, objective_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (responsible_actor_id, responsible_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (objective_id IS NULL AND objective_revision IS NULL
      AND objective_content_hash IS NULL
      AND payload #> '{content,objective_ref}' IS NULL)
    OR (objective_id IS NOT NULL AND objective_revision IS NOT NULL
      AND objective_revision >= 1
      AND objective_content_hash ~ '^sha256:[0-9a-f]{64}$'
      AND payload #>> '{content,objective_ref,objective_id}' = objective_id
      AND (payload #>> '{content,objective_ref,revision}')::bigint
        = objective_revision
      AND payload #>> '{content,objective_ref,content_hash}'
        = objective_content_hash)
  )
);

ALTER TABLE petra.review_sessions
  ADD CONSTRAINT review_sessions_current_revision_fkey
  FOREIGN KEY (review_session_id, current_revision)
  REFERENCES petra.review_session_revisions (review_session_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.review_session_candidate_bindings (
  review_session_id text NOT NULL,
  review_session_revision bigint NOT NULL,
  member_position bigint NOT NULL CHECK (member_position >= 1),
  review_member_id text NOT NULL
    CHECK (review_member_id ~ '^review_member_[0-9A-HJKMNP-TV-Z]{26}$'),
  member_role text NOT NULL CHECK (member_role IN ('ordinary', 'exception')),
  binding_position bigint NOT NULL CHECK (binding_position >= 1),
  semantic_key text NOT NULL
    CHECK (semantic_key ~ '^[a-z][a-z0-9._/-]{1,199}$'),
  binding_role text NOT NULL
    CHECK (binding_role IN ('candidate', 'relationship', 'finding')),
  evidence_id text NOT NULL,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('claim', 'assertion')),
  evidence_revision bigint NOT NULL CHECK (evidence_revision >= 1),
  evidence_record_hash text NOT NULL
    CHECK (evidence_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  PRIMARY KEY (
    review_session_id, review_session_revision, member_position,
    binding_position
  ),
  UNIQUE (
    review_session_id, review_session_revision, review_member_id,
    binding_position
  ),
  UNIQUE (
    review_session_id, review_session_revision, member_position,
    evidence_id, evidence_revision
  ),
  FOREIGN KEY (review_session_id, review_session_revision)
    REFERENCES petra.review_session_revisions (review_session_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    evidence_id, evidence_kind, evidence_revision, evidence_record_hash
  ) REFERENCES petra.evidence_entity_revisions (
    evidence_id, evidence_kind, revision, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (evidence_kind = 'claim' AND evidence_id ~ '^claim_')
    OR (evidence_kind = 'assertion' AND evidence_id ~ '^assertion_')
  )
);

CREATE FUNCTION petra.validate_review_session_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_bindings jsonb;
  observed_bindings jsonb;
  unresolved_registration_count bigint;
  invalid_pair_count bigint;
  authority_head bigint;
  project_stream_head bigint;
BEGIN
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'review_member_id', member.review_member_id,
             'member_role', member.member_role,
             'candidate_bindings', member.bindings
           ) ORDER BY member.member_position
         ), '[]'::jsonb)
    INTO observed_bindings
    FROM (
      SELECT binding.member_position, binding.review_member_id,
             binding.member_role,
             jsonb_agg(
               jsonb_build_object(
                 'semantic_key', binding.semantic_key,
                 'binding_role', binding.binding_role,
                 'record_ref', jsonb_build_object(
                   'record_id', binding.evidence_id,
                   'revision', binding.evidence_revision,
                   'record_hash', binding.evidence_record_hash
                 )
               ) ORDER BY binding.binding_position
             ) AS bindings
        FROM petra.review_session_candidate_bindings AS binding
       WHERE binding.review_session_id = NEW.review_session_id
         AND binding.review_session_revision = NEW.revision
       GROUP BY binding.member_position, binding.review_member_id,
                binding.member_role
    ) AS member;
  expected_bindings := NEW.payload #> '{content,members}';
  IF observed_bindings IS DISTINCT FROM expected_bindings THEN
    RAISE EXCEPTION 'review session candidate bindings must match the canonical ordered members'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO unresolved_registration_count
    FROM petra.review_session_candidate_bindings AS binding
   WHERE binding.review_session_id = NEW.review_session_id
     AND binding.review_session_revision = NEW.revision
     AND NOT EXISTS (
       SELECT 1
         FROM petra.project_definition_revisions AS definition,
              jsonb_array_elements(
                definition.payload #> '{content,registrations}'
              ) AS registration
        WHERE definition.project_id = NEW.project_id
          AND definition.project_definition_id = NEW.project_definition_id
          AND definition.revision = NEW.project_definition_revision
          AND definition.content_hash = NEW.project_definition_content_hash
          AND registration ->> 'semantic_key' = binding.semantic_key
          AND registration ->> 'registration_kind' = CASE
                WHEN binding.evidence_kind = 'claim' THEN 'object_schema'
                ELSE 'relationship_schema'
              END
          AND registration #>> '{contract,name}' = CASE
                WHEN binding.evidence_kind = 'claim' THEN 'petra.claim'
                ELSE 'petra.assertion'
              END
          AND registration #>> '{contract,version}' = '1.0.0'
     );
  IF unresolved_registration_count <> 0 THEN
    RAISE EXCEPTION 'review session candidate semantics must resolve through the exact ProjectDefinition'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO invalid_pair_count
    FROM (
      SELECT binding.member_position,
             count(*) FILTER (
               WHERE binding.evidence_kind = 'claim'
                 AND binding.binding_role = 'candidate'
             ) AS claims,
             count(*) FILTER (
               WHERE binding.evidence_kind = 'assertion'
                 AND binding.binding_role = 'relationship'
             ) AS assertions,
             max(binding.evidence_id) FILTER (
               WHERE binding.evidence_kind = 'claim'
             ) AS claim_id,
             max(binding.evidence_id) FILTER (
               WHERE binding.evidence_kind = 'assertion'
             ) AS assertion_id,
             max(binding.evidence_revision) FILTER (
               WHERE binding.evidence_kind = 'claim'
             ) AS claim_revision,
             max(binding.evidence_revision) FILTER (
               WHERE binding.evidence_kind = 'assertion'
             ) AS assertion_revision
        FROM petra.review_session_candidate_bindings AS binding
       WHERE binding.review_session_id = NEW.review_session_id
         AND binding.review_session_revision = NEW.revision
       GROUP BY binding.member_position
    ) AS pair
   WHERE pair.claims <> 1 OR pair.assertions <> 1
      OR NOT EXISTS (
        SELECT 1
          FROM petra.assertion_revisions AS assertion
         WHERE assertion.assertion_id = pair.assertion_id
           AND assertion.revision = pair.assertion_revision
           AND assertion.predicate = 'ASSERTS'
           AND assertion.object_kind = 'entity'
           AND assertion.object_entity_id = pair.claim_id
      )
      OR NOT EXISTS (
        SELECT 1
          FROM petra.claim_revisions AS claim
          JOIN petra.claim_source_spans AS grounding
            ON grounding.claim_id = claim.claim_id
           AND grounding.claim_revision = claim.revision
          JOIN petra.source_spans AS span
            ON span.source_span_id = grounding.source_span_id
          JOIN petra.parsed_documents AS document
            ON document.parsed_document_id = span.parsed_document_id
          JOIN petra.project_sources AS source
            ON source.project_id = NEW.project_id
          JOIN petra.project_source_revisions AS binding
            ON binding.project_source_id = source.project_source_id
           AND binding.revision = source.current_revision
           AND binding.work_version_id = claim.source_work_version_id
           AND binding.artifact_manifest_id = document.source_artifact_manifest_id
         WHERE claim.claim_id = pair.claim_id
           AND claim.revision = pair.claim_revision
           AND claim.basis_kind = 'source'
      );
  IF invalid_pair_count <> 0 THEN
    RAISE EXCEPTION 'the current M1 Review renderer requires one exact Claim-ASSERTS pair per member'
      USING ERRCODE = '23514';
  END IF;

  SELECT event_position INTO authority_head
    FROM petra.authority_positions
   WHERE singleton;
  SELECT COALESCE(current_stream_revision, 0) INTO project_stream_head
    FROM petra.project_event_stream_heads
   WHERE project_id = NEW.project_id;
  project_stream_head := COALESCE(project_stream_head, 0);
  IF NEW.snapshot_event_position > authority_head
     OR NEW.snapshot_stream_revision > project_stream_head THEN
    RAISE EXCEPTION 'review session snapshot cannot be ahead of authority'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER review_session_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.review_sessions
FOR EACH ROW EXECUTE FUNCTION petra.guard_review_session_identity();

CREATE TRIGGER review_session_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.review_session_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER review_session_candidate_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.review_session_candidate_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE CONSTRAINT TRIGGER review_session_revision_is_consistent
AFTER INSERT ON petra.review_session_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_review_session_revision();

CREATE INDEX review_sessions_project_state_idx
  ON petra.review_session_revisions (project_id, lifecycle, updated_at DESC);

COMMENT ON TABLE petra.review_sessions IS
  'Stable durable Review identities; presentation context and candidate revisions are retained in immutable revisions.';
COMMENT ON TABLE petra.review_session_candidate_bindings IS
  'Exact ProjectDefinition-resolved candidate records. V021 supports the existing M1 scientific Claim-ASSERTS renderer; other profile payloads require an additive resolver migration.';
