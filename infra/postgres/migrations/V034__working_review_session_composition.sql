ALTER TABLE petra.review_session_revisions
  DROP CONSTRAINT review_session_revisions_schema_version_check;

ALTER TABLE petra.review_session_revisions
  ADD CONSTRAINT review_session_revisions_schema_version_check
  CHECK (schema_version IN ('1.0.0', '1.1.0'));

CREATE TABLE petra.review_session_working_candidate_bindings (
  review_session_id text NOT NULL,
  review_session_revision bigint NOT NULL,
  member_position bigint NOT NULL CHECK (member_position >= 1),
  review_member_id text NOT NULL CHECK (
    review_member_id ~ '^review_member_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  working_candidate_id text NOT NULL CHECK (
    working_candidate_id ~ '^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  working_candidate_revision bigint NOT NULL CHECK (
    working_candidate_revision >= 1
  ),
  working_candidate_content_hash text NOT NULL CHECK (
    working_candidate_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  PRIMARY KEY (
    review_session_id, review_session_revision, member_position
  ),
  UNIQUE (
    review_session_id, review_session_revision, review_member_id
  ),
  FOREIGN KEY (review_session_id, review_session_revision)
    REFERENCES petra.review_session_revisions (review_session_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    working_candidate_id, working_candidate_revision,
    working_candidate_content_hash
  ) REFERENCES petra.working_candidate_revisions (
    working_candidate_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.review_session_working_relationship_bindings (
  review_session_id text NOT NULL,
  review_session_revision bigint NOT NULL,
  member_position bigint NOT NULL CHECK (member_position >= 1),
  relationship_position bigint NOT NULL CHECK (relationship_position >= 1),
  working_relationship_id text NOT NULL CHECK (
    working_relationship_id ~ '^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  working_relationship_revision bigint NOT NULL CHECK (
    working_relationship_revision >= 1
  ),
  working_relationship_content_hash text NOT NULL CHECK (
    working_relationship_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  PRIMARY KEY (
    review_session_id, review_session_revision, member_position,
    relationship_position
  ),
  UNIQUE (
    review_session_id, review_session_revision, member_position,
    working_relationship_id, working_relationship_revision
  ),
  FOREIGN KEY (
    review_session_id, review_session_revision, member_position
  ) REFERENCES petra.review_session_working_candidate_bindings (
    review_session_id, review_session_revision, member_position
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    working_relationship_id, working_relationship_revision,
    working_relationship_content_hash
  ) REFERENCES petra.working_relationship_revisions (
    working_relationship_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION petra.validate_review_session_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_bindings jsonb;
  observed_bindings jsonb;
  expected_working_bindings jsonb;
  observed_working_bindings jsonb;
  unresolved_registration_count bigint;
  invalid_pair_count bigint;
  invalid_working_count bigint;
  authority_head bigint;
  project_stream_head bigint;
BEGIN
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'review_member_id', member.value ->> 'review_member_id',
             'member_role', member.value ->> 'member_role',
             'candidate_bindings', member.value -> 'candidate_bindings'
           ) ORDER BY member.ordinality
         ), '[]'::jsonb)
    INTO expected_bindings
    FROM jsonb_array_elements(NEW.payload #> '{content,members}')
         WITH ORDINALITY AS member(value, ordinality);

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
  IF observed_bindings IS DISTINCT FROM expected_bindings THEN
    RAISE EXCEPTION 'review session candidate bindings must match the canonical ordered members'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.schema_version = '1.1.0' THEN
    SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'review_member_id', member.value ->> 'review_member_id',
               'working_state', member.value -> 'working_state'
             ) ORDER BY member.ordinality
           ), '[]'::jsonb)
      INTO expected_working_bindings
      FROM jsonb_array_elements(NEW.payload #> '{content,members}')
           WITH ORDINALITY AS member(value, ordinality);

    SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'review_member_id', candidate.review_member_id,
               'working_state', jsonb_build_object(
                 'candidate_ref', jsonb_build_object(
                   'working_candidate_id', candidate.working_candidate_id,
                   'revision', candidate.working_candidate_revision,
                   'content_hash', candidate.working_candidate_content_hash
                 ),
                 'relationship_refs', candidate.relationship_refs
               )
             ) ORDER BY candidate.member_position
           ), '[]'::jsonb)
      INTO observed_working_bindings
      FROM (
        SELECT candidate.member_position, candidate.review_member_id,
               candidate.working_candidate_id,
               candidate.working_candidate_revision,
               candidate.working_candidate_content_hash,
               COALESCE(jsonb_agg(
                 jsonb_build_object(
                   'working_relationship_id', relationship.working_relationship_id,
                   'revision', relationship.working_relationship_revision,
                   'content_hash', relationship.working_relationship_content_hash
                 ) ORDER BY relationship.relationship_position
               ) FILTER (WHERE relationship.working_relationship_id IS NOT NULL),
               '[]'::jsonb) AS relationship_refs
          FROM petra.review_session_working_candidate_bindings AS candidate
          LEFT JOIN petra.review_session_working_relationship_bindings AS relationship
            ON relationship.review_session_id = candidate.review_session_id
           AND relationship.review_session_revision = candidate.review_session_revision
           AND relationship.member_position = candidate.member_position
         WHERE candidate.review_session_id = NEW.review_session_id
           AND candidate.review_session_revision = NEW.revision
         GROUP BY candidate.member_position, candidate.review_member_id,
                  candidate.working_candidate_id,
                  candidate.working_candidate_revision,
                  candidate.working_candidate_content_hash
      ) AS candidate;
    IF observed_working_bindings IS DISTINCT FROM expected_working_bindings THEN
      RAISE EXCEPTION 'review session working bindings must match the canonical ordered members'
        USING ERRCODE = '23514';
    END IF;
  ELSIF EXISTS (
    SELECT 1
      FROM petra.review_session_working_candidate_bindings
     WHERE review_session_id = NEW.review_session_id
       AND review_session_revision = NEW.revision
  ) THEN
    RAISE EXCEPTION 'review session 1.0 revisions cannot acquire working-state bindings'
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
    RAISE EXCEPTION 'the current scientific Review renderer requires one exact Claim-ASSERTS pair per member'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.schema_version = '1.1.0' THEN
    SELECT count(*) INTO invalid_working_count
      FROM petra.review_session_working_candidate_bindings AS candidate
     WHERE candidate.review_session_id = NEW.review_session_id
       AND candidate.review_session_revision = NEW.revision
       AND (
         (SELECT count(*)
            FROM petra.review_session_working_relationship_bindings AS relationship
           WHERE relationship.review_session_id = candidate.review_session_id
             AND relationship.review_session_revision = candidate.review_session_revision
             AND relationship.member_position = candidate.member_position) <> 1
         OR NOT EXISTS (
           SELECT 1
             FROM petra.working_candidate_revisions AS working_candidate
             JOIN petra.working_candidates AS candidate_head
               ON candidate_head.working_candidate_id = working_candidate.working_candidate_id
             JOIN petra.review_session_candidate_bindings AS claim_binding
               ON claim_binding.review_session_id = candidate.review_session_id
              AND claim_binding.review_session_revision = candidate.review_session_revision
              AND claim_binding.member_position = candidate.member_position
              AND claim_binding.binding_role = 'candidate'
              AND claim_binding.evidence_kind = 'claim'
             JOIN petra.project_objective_revisions AS objective
               ON objective.project_id = NEW.project_id
              AND objective.objective_id = NEW.objective_id
              AND objective.revision = NEW.objective_revision
              AND objective.content_hash = NEW.objective_content_hash
            WHERE working_candidate.working_candidate_id = candidate.working_candidate_id
              AND working_candidate.revision = candidate.working_candidate_revision
              AND working_candidate.content_hash = candidate.working_candidate_content_hash
              AND working_candidate.project_id = NEW.project_id
              AND working_candidate.project_definition_id = NEW.project_definition_id
              AND working_candidate.project_definition_revision = NEW.project_definition_revision
              AND working_candidate.project_definition_content_hash = NEW.project_definition_content_hash
              AND working_candidate.profile_semantic_key = claim_binding.semantic_key
              AND working_candidate.profile_evidence_id = claim_binding.evidence_id
              AND working_candidate.profile_evidence_revision = claim_binding.evidence_revision
              AND working_candidate.profile_evidence_record_hash = claim_binding.evidence_record_hash
              AND working_candidate.disposition = 'available'
              AND working_candidate.payload #>> '{task_context,objective_ref,record_id}' = NEW.objective_id
              AND (working_candidate.payload #>> '{task_context,objective_ref,revision}')::bigint = NEW.objective_revision
              AND working_candidate.payload #>> '{task_context,objective_ref,record_hash}' = objective.record_hash
              AND working_candidate.snapshot_event_position <= NEW.snapshot_event_position
              AND (
                NEW.lifecycle <> 'open'
                OR candidate_head.current_revision = working_candidate.revision
              )
         )
         OR NOT EXISTS (
           SELECT 1
             FROM petra.review_session_working_relationship_bindings AS relationship
             JOIN petra.working_relationship_revisions AS working_relationship
               ON working_relationship.working_relationship_id = relationship.working_relationship_id
              AND working_relationship.revision = relationship.working_relationship_revision
              AND working_relationship.content_hash = relationship.working_relationship_content_hash
             JOIN petra.working_relationships AS relationship_head
               ON relationship_head.working_relationship_id = working_relationship.working_relationship_id
             JOIN petra.working_candidate_revisions AS working_candidate
               ON working_candidate.working_candidate_id = candidate.working_candidate_id
              AND working_candidate.revision = candidate.working_candidate_revision
              AND working_candidate.content_hash = candidate.working_candidate_content_hash
             JOIN petra.review_session_candidate_bindings AS assertion_binding
               ON assertion_binding.review_session_id = candidate.review_session_id
              AND assertion_binding.review_session_revision = candidate.review_session_revision
              AND assertion_binding.member_position = candidate.member_position
              AND assertion_binding.binding_role = 'relationship'
              AND assertion_binding.evidence_kind = 'assertion'
            WHERE relationship.review_session_id = candidate.review_session_id
              AND relationship.review_session_revision = candidate.review_session_revision
              AND relationship.member_position = candidate.member_position
              AND working_relationship.project_id = NEW.project_id
              AND working_relationship.project_definition_id = NEW.project_definition_id
              AND working_relationship.project_definition_revision = NEW.project_definition_revision
              AND working_relationship.project_definition_content_hash = NEW.project_definition_content_hash
              AND working_relationship.profile_semantic_key = assertion_binding.semantic_key
              AND working_relationship.profile_evidence_id = assertion_binding.evidence_id
              AND working_relationship.profile_evidence_revision = assertion_binding.evidence_revision
              AND working_relationship.profile_evidence_record_hash = assertion_binding.evidence_record_hash
              AND working_relationship.disposition = 'available'
              AND working_relationship.payload -> 'task_context' = working_candidate.payload -> 'task_context'
              AND working_relationship.payload #> '{input_snapshot,snapshot_ref}' = working_candidate.payload #> '{input_snapshot,snapshot_ref}'
              AND working_relationship.payload #>> '{endpoints,object,candidate_ref,working_candidate_id}' = candidate.working_candidate_id
              AND (working_relationship.payload #>> '{endpoints,object,candidate_ref,revision}')::bigint = candidate.working_candidate_revision
              AND working_relationship.payload #>> '{endpoints,object,candidate_ref,content_hash}' = candidate.working_candidate_content_hash
              AND working_relationship.snapshot_event_position <= NEW.snapshot_event_position
              AND (
                NEW.lifecycle <> 'open'
                OR relationship_head.current_revision = working_relationship.revision
              )
         )
       );
    IF invalid_working_count <> 0 THEN
      RAISE EXCEPTION 'Review working members must bind one exact current, available, task-aligned scientific candidate and relationship'
        USING ERRCODE = '23514';
    END IF;
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
  IF NEW.schema_version = '1.1.0'
     AND NEW.revision = 1
     AND (NEW.snapshot_event_position <> authority_head
       OR NEW.snapshot_stream_revision <> project_stream_head) THEN
    RAISE EXCEPTION 'a new working Review session must bind the exact current authority snapshot'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER review_session_working_candidate_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.review_session_working_candidate_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER review_session_working_relationship_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.review_session_working_relationship_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.review_session_working_candidate_bindings IS
  'Exact non-authoritative WorkingCandidate membership for ReviewSession 1.1 revisions; authority remains in existing ChangeSets, Approvals, commands, and events.';

COMMENT ON TABLE petra.review_session_working_relationship_bindings IS
  'Exact non-authoritative WorkingRelationship membership for ReviewSession 1.1 revisions; the current scientific adapter requires one task-aligned ASSERTS relationship per member.';
