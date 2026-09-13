ALTER TABLE petra.review_session_candidate_bindings
  ADD COLUMN profile_record_schema_name text,
  ADD COLUMN profile_record_id text,
  ADD COLUMN profile_record_revision bigint,
  ADD COLUMN profile_record_hash text;

UPDATE petra.review_session_candidate_bindings
   SET profile_record_schema_name = CASE evidence_kind
         WHEN 'claim' THEN 'petra.claim'
         ELSE 'petra.assertion'
       END,
       profile_record_id = evidence_id,
       profile_record_revision = evidence_revision,
       profile_record_hash = evidence_record_hash;

ALTER TABLE petra.review_session_candidate_bindings
  ALTER COLUMN profile_record_schema_name SET NOT NULL,
  ALTER COLUMN profile_record_id SET NOT NULL,
  ALTER COLUMN profile_record_revision SET NOT NULL,
  ALTER COLUMN profile_record_hash SET NOT NULL,
  ALTER COLUMN evidence_id DROP NOT NULL,
  ALTER COLUMN evidence_kind DROP NOT NULL,
  ALTER COLUMN evidence_revision DROP NOT NULL,
  ALTER COLUMN evidence_record_hash DROP NOT NULL,
  ADD CONSTRAINT review_session_candidate_profile_record_check CHECK (
    profile_record_revision >= 1
    AND profile_record_hash ~ '^sha256:[0-9a-f]{64}$'
    AND (
      (profile_record_schema_name = 'petra.claim'
        AND binding_role = 'candidate'
        AND evidence_id = profile_record_id
        AND evidence_kind = 'claim'
        AND evidence_revision = profile_record_revision
        AND evidence_record_hash = profile_record_hash)
      OR
      (profile_record_schema_name = 'petra.assertion'
        AND binding_role = 'relationship'
        AND evidence_id = profile_record_id
        AND evidence_kind = 'assertion'
        AND evidence_revision = profile_record_revision
        AND evidence_record_hash = profile_record_hash)
      OR
      (profile_record_schema_name = 'petra.controlled-writing-requirement'
        AND binding_role = 'candidate'
        AND evidence_id IS NULL
        AND evidence_kind IS NULL
        AND evidence_revision IS NULL
        AND evidence_record_hash IS NULL)
      OR
      (profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
        AND binding_role = 'relationship'
        AND evidence_id IS NULL
        AND evidence_kind IS NULL
        AND evidence_revision IS NULL
        AND evidence_record_hash IS NULL)
    )
  ),
  ADD CONSTRAINT review_session_candidate_profile_record_unique UNIQUE (
    review_session_id, review_session_revision, member_position,
    profile_record_id, profile_record_revision
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
  unresolved_record_count bigint;
  invalid_pair_count bigint;
  invalid_working_count bigint;
  definition_family text;
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
                   'record_id', binding.profile_record_id,
                   'revision', binding.profile_record_revision,
                   'record_hash', binding.profile_record_hash
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

  SELECT definition.definition_family
    INTO definition_family
    FROM petra.project_definition_revisions AS definition
   WHERE definition.project_id = NEW.project_id
     AND definition.project_definition_id = NEW.project_definition_id
     AND definition.revision = NEW.project_definition_revision
     AND definition.content_hash = NEW.project_definition_content_hash;

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
                WHEN binding.profile_record_schema_name IN (
                  'petra.claim', 'petra.controlled-writing-requirement'
                ) THEN 'object_schema'
                WHEN binding.profile_record_schema_name IN (
                  'petra.assertion',
                  'petra.controlled-writing-governing-relationship'
                ) THEN 'relationship_schema'
              END
          AND registration #>> '{contract,name}' = binding.profile_record_schema_name
          AND registration #>> '{contract,version}' = '1.0.0'
     );
  IF unresolved_registration_count <> 0 THEN
    RAISE EXCEPTION 'review session candidate semantics must resolve through the exact ProjectDefinition'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO unresolved_record_count
    FROM petra.review_session_candidate_bindings AS binding
   WHERE binding.review_session_id = NEW.review_session_id
     AND binding.review_session_revision = NEW.revision
     AND NOT (
       (binding.profile_record_schema_name IN ('petra.claim', 'petra.assertion')
        AND EXISTS (
          SELECT 1
            FROM petra.evidence_entity_revisions AS record
           WHERE record.evidence_id = binding.profile_record_id
             AND record.evidence_kind = CASE binding.profile_record_schema_name
                   WHEN 'petra.claim' THEN 'claim'
                   ELSE 'assertion'
                 END
             AND record.revision = binding.profile_record_revision
             AND record.record_hash = binding.profile_record_hash
        ))
       OR
       (binding.profile_record_schema_name = 'petra.controlled-writing-requirement'
        AND EXISTS (
          SELECT 1
            FROM petra.controlled_writing_requirement_records AS record
           WHERE record.project_id = NEW.project_id
             AND record.requirement_id = binding.profile_record_id
             AND record.revision = binding.profile_record_revision
             AND record.record_hash = binding.profile_record_hash
        ))
       OR
       (binding.profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
        AND EXISTS (
          SELECT 1
            FROM petra.controlled_writing_governing_relationship_records AS record
           WHERE record.project_id = NEW.project_id
             AND record.governing_relationship_id = binding.profile_record_id
             AND record.revision = binding.profile_record_revision
             AND record.record_hash = binding.profile_record_hash
        ))
     );
  IF unresolved_record_count <> 0 THEN
    RAISE EXCEPTION 'review session candidate records must resolve exactly through an installed profile owner'
      USING ERRCODE = '23514';
  END IF;

  IF definition_family = 'petra.scientific-evidence' THEN
    SELECT count(*) INTO invalid_pair_count
      FROM (
        SELECT binding.member_position,
               count(*) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.claim'
                   AND binding.binding_role = 'candidate'
               ) AS candidates,
               count(*) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.assertion'
                   AND binding.binding_role = 'relationship'
               ) AS relationships,
               max(binding.profile_record_id) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.claim'
               ) AS candidate_id,
               max(binding.profile_record_id) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.assertion'
               ) AS relationship_id,
               max(binding.profile_record_revision) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.claim'
               ) AS candidate_revision,
               max(binding.profile_record_revision) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.assertion'
               ) AS relationship_revision
          FROM petra.review_session_candidate_bindings AS binding
         WHERE binding.review_session_id = NEW.review_session_id
           AND binding.review_session_revision = NEW.revision
         GROUP BY binding.member_position
      ) AS pair
     WHERE pair.candidates <> 1 OR pair.relationships <> 1
        OR NOT EXISTS (
          SELECT 1
            FROM petra.assertion_revisions AS assertion
           WHERE assertion.assertion_id = pair.relationship_id
             AND assertion.revision = pair.relationship_revision
             AND assertion.predicate = 'ASSERTS'
             AND assertion.object_kind = 'entity'
             AND assertion.object_entity_id = pair.candidate_id
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
           WHERE claim.claim_id = pair.candidate_id
             AND claim.revision = pair.candidate_revision
             AND claim.basis_kind = 'source'
        );
  ELSIF definition_family = 'petra.controlled-writing' THEN
    IF NEW.schema_version <> '1.1.0' THEN
      RAISE EXCEPTION 'controlled-writing Review composition requires exact working-state membership'
        USING ERRCODE = '23514';
    END IF;
    SELECT count(*) INTO invalid_pair_count
      FROM (
        SELECT binding.member_position,
               count(*) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-requirement'
                   AND binding.binding_role = 'candidate'
               ) AS candidates,
               count(*) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
                   AND binding.binding_role = 'relationship'
               ) AS relationships,
               max(binding.profile_record_id) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-requirement'
               ) AS candidate_id,
               max(binding.profile_record_id) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
               ) AS relationship_id,
               max(binding.profile_record_revision) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-requirement'
               ) AS candidate_revision,
               max(binding.profile_record_revision) FILTER (
                 WHERE binding.profile_record_schema_name = 'petra.controlled-writing-governing-relationship'
               ) AS relationship_revision
          FROM petra.review_session_candidate_bindings AS binding
         WHERE binding.review_session_id = NEW.review_session_id
           AND binding.review_session_revision = NEW.revision
         GROUP BY binding.member_position
      ) AS pair
     WHERE pair.candidates <> 1 OR pair.relationships <> 1
        OR NOT EXISTS (
          SELECT 1
            FROM petra.controlled_writing_governing_relationship_records AS relationship
            JOIN petra.controlled_writing_requirement_records AS requirement
              ON requirement.project_id = relationship.project_id
             AND requirement.requirement_id = relationship.requirement_id
             AND requirement.revision = relationship.requirement_revision
             AND requirement.record_hash = relationship.requirement_record_hash
            JOIN petra.project_source_revisions AS source
              ON source.project_id = relationship.project_id
             AND source.project_source_id = relationship.payload #>> '{content,authority_source_ref,record_id}'
             AND source.revision = (relationship.payload #>> '{content,authority_source_ref,revision}')::bigint
             AND source.record_hash = relationship.payload #>> '{content,authority_source_ref,record_hash}'
            JOIN petra.project_sources AS source_head
              ON source_head.project_id = source.project_id
             AND source_head.project_source_id = source.project_source_id
             AND source_head.current_revision = source.revision
           WHERE relationship.project_id = NEW.project_id
             AND relationship.governing_relationship_id = pair.relationship_id
             AND relationship.revision = pair.relationship_revision
             AND relationship.requirement_id = pair.candidate_id
             AND relationship.requirement_revision = pair.candidate_revision
             AND source.status = 'active'
             AND source.source_role = 'writing.authority-source'
        );
  ELSE
    invalid_pair_count := 1;
  END IF;
  IF invalid_pair_count <> 0 THEN
    RAISE EXCEPTION 'Review members must preserve one exact installed profile candidate-relationship pair'
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
             JOIN petra.review_session_candidate_bindings AS candidate_binding
               ON candidate_binding.review_session_id = candidate.review_session_id
              AND candidate_binding.review_session_revision = candidate.review_session_revision
              AND candidate_binding.member_position = candidate.member_position
              AND candidate_binding.binding_role = 'candidate'
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
              AND working_candidate.profile_semantic_key = candidate_binding.semantic_key
              AND working_candidate.profile_record_schema_name = candidate_binding.profile_record_schema_name
              AND working_candidate.profile_record_id = candidate_binding.profile_record_id
              AND working_candidate.profile_record_revision = candidate_binding.profile_record_revision
              AND working_candidate.profile_record_hash = candidate_binding.profile_record_hash
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
             JOIN petra.review_session_candidate_bindings AS relationship_binding
               ON relationship_binding.review_session_id = candidate.review_session_id
              AND relationship_binding.review_session_revision = candidate.review_session_revision
              AND relationship_binding.member_position = candidate.member_position
              AND relationship_binding.binding_role = 'relationship'
            WHERE relationship.review_session_id = candidate.review_session_id
              AND relationship.review_session_revision = candidate.review_session_revision
              AND relationship.member_position = candidate.member_position
              AND working_relationship.project_id = NEW.project_id
              AND working_relationship.project_definition_id = NEW.project_definition_id
              AND working_relationship.project_definition_revision = NEW.project_definition_revision
              AND working_relationship.project_definition_content_hash = NEW.project_definition_content_hash
              AND working_relationship.profile_semantic_key = relationship_binding.semantic_key
              AND working_relationship.profile_record_schema_name = relationship_binding.profile_record_schema_name
              AND working_relationship.profile_record_id = relationship_binding.profile_record_id
              AND working_relationship.profile_record_revision = relationship_binding.profile_record_revision
              AND working_relationship.profile_record_hash = relationship_binding.profile_record_hash
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
      RAISE EXCEPTION 'Review working members must bind one exact current, available, task-aligned installed candidate and relationship'
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

COMMENT ON TABLE petra.review_session_candidate_bindings IS
  'Exact ProjectDefinition-resolved profile records in the canonical ReviewSession ledger. Installed scientific Claim-ASSERTS and controlled-writing Requirement-GOVERNS pairs retain separate semantics.';
