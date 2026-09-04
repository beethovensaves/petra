-- Permit a completed InteractionRun to advance only its presentation-stream
-- head. The scientific/operational outcome remains immutable; this narrow
-- revision closes the event suffix written after GroundedResponse authority.

CREATE OR REPLACE FUNCTION petra.validate_interaction_run_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  run_head petra.interaction_runs%ROWTYPE;
  prior_state text;
  prior_event_count bigint;
  prior_lifecycle jsonb;
  actual_count bigint;
  actual_sequence bigint;
  actual_hash text;
BEGIN
  SELECT * INTO STRICT run_head FROM petra.interaction_runs
   WHERE interaction_run_id = NEW.interaction_run_id;
  IF NEW.payload #>> '{feature_manifest_ref,interaction_feature_manifest_id}' <>
       run_head.feature_manifest_id
     OR (NEW.payload #>> '{feature_manifest_ref,revision}')::bigint <>
       run_head.feature_manifest_revision
     OR NEW.payload #>> '{feature_manifest_ref,content_hash}' <>
       run_head.feature_manifest_hash
     OR NEW.payload #>> '{content,correlation,protocol_thread_id}' <>
       run_head.protocol_thread_id
     OR NEW.payload #>> '{content,correlation,protocol_run_id}' <>
       run_head.protocol_run_id
     OR NEW.payload #>> '{content,correlation,request_id}' <> run_head.request_id
     OR NEW.payload #>> '{content,correlation,trace_id}' <> run_head.trace_id
     OR NEW.payload #>> '{content,correlation,work_unit_ref,work_unit_id}' <>
       run_head.work_unit_id
     OR (NEW.payload #>> '{content,correlation,work_unit_ref,revision}')::bigint <>
       run_head.work_unit_revision
     OR NEW.payload #>> '{content,correlation,work_unit_ref,spec_hash}' <>
       run_head.work_unit_spec_hash
     OR NEW.payload #>> '{content,correlation,model_request_id}' IS DISTINCT FROM
       run_head.model_request_id
     OR NEW.payload #>> '{content,correlation,agent_run_id}' IS DISTINCT FROM
       run_head.agent_run_id
     OR NEW.payload #>> '{content,authority_context,actor,actor_id}' <>
       run_head.authority_actor_id
     OR NEW.payload #>> '{content,authority_context,actor,actor_kind}' <>
       run_head.authority_actor_kind
     OR NEW.payload #>> '{content,authority_context,capability_grant_id}' <>
       run_head.capability_grant_id
     OR NEW.payload #>> '{content,authority_context,privacy_profile_ref,record_id}' <>
       run_head.privacy_profile_id
     OR (NEW.payload #>> '{content,authority_context,privacy_profile_ref,revision}')::bigint <>
       run_head.privacy_profile_revision
     OR NEW.payload #>> '{content,authority_context,privacy_profile_ref,content_hash}' <>
       run_head.privacy_profile_hash
     OR NEW.payload #>> '{content,authority_context,budget_profile_ref,record_id}' <>
       run_head.budget_profile_id
     OR (NEW.payload #>> '{content,authority_context,budget_profile_ref,revision}')::bigint <>
       run_head.budget_profile_revision
     OR NEW.payload #>> '{content,authority_context,budget_profile_ref,content_hash}' <>
       run_head.budget_profile_hash
     OR NEW.payload #>> '{content,input,input_hash}' <> run_head.input_hash
     OR NEW.payload #>> '{content,input,source_message_id}' <> run_head.source_message_id
     OR NEW.payload #>> '{created_by,actor_id}' <> run_head.created_by_actor_id
     OR NEW.payload #>> '{created_by,actor_kind}' <> run_head.created_by_actor_kind
     OR (NEW.payload ->> 'created_at')::timestamptz <> run_head.created_at
     OR (NEW.payload #>> '{content,lifecycle,ended_at}')::timestamptz
       IS DISTINCT FROM NEW.ended_at
     OR NEW.payload #>> '{content,lifecycle,outcome_code}'
       IS DISTINCT FROM NEW.outcome_code
     OR (NEW.payload #>> '{content,stream_head,latest_sequence}')::bigint
       IS DISTINCT FROM NEW.latest_sequence
     OR NEW.payload #>> '{content,stream_head,head_hash}'
       IS DISTINCT FROM NEW.stream_head_hash THEN
    RAISE EXCEPTION 'InteractionRun query columns must reproduce its canonical payload'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.revision = 1 THEN
    IF NEW.stream_state <> 'empty'
       OR NEW.payload #>> '{lineage,lineage_kind}' <> 'root' THEN
      RAISE EXCEPTION 'InteractionRun root must begin with an empty stream'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT lifecycle_state, event_count, payload #> '{content,lifecycle}'
      INTO prior_state, prior_event_count, prior_lifecycle
      FROM petra.interaction_run_revisions
     WHERE interaction_run_id = NEW.interaction_run_id
       AND revision = NEW.revision - 1;
    IF prior_state IS NULL THEN
      RAISE EXCEPTION 'InteractionRun revision must follow its immediate predecessor'
        USING ERRCODE = '23514';
    END IF;
    IF prior_state IN ('completed', 'failed', 'cancelled')
       AND (NEW.lifecycle_state <> prior_state
         OR NEW.payload #> '{content,lifecycle}' <> prior_lifecycle
         OR NEW.event_count <= prior_event_count) THEN
      RAISE EXCEPTION 'A terminal InteractionRun revision may only advance its presentation stream head'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.payload #>> '{lineage,lineage_kind}' <> 'revision'
       OR (NEW.payload #>> '{lineage,parent_revision}')::bigint <>
         NEW.parent_revision
       OR NEW.payload #>> '{lineage,parent_hash}' <> NEW.parent_hash THEN
      RAISE EXCEPTION 'InteractionRun lineage columns must reproduce its canonical payload'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT count(*), max(sequence) INTO actual_count, actual_sequence
    FROM petra.interaction_event_records
   WHERE interaction_run_id = NEW.interaction_run_id;
  SELECT content_hash INTO actual_hash
    FROM petra.interaction_event_records
   WHERE interaction_run_id = NEW.interaction_run_id
   ORDER BY sequence DESC LIMIT 1;
  IF actual_count <> NEW.event_count
     OR (NEW.event_count > 0 AND
         (actual_sequence <> NEW.latest_sequence OR actual_hash <> NEW.stream_head_hash)) THEN
    RAISE EXCEPTION 'InteractionRun stream head does not match its exact event chain'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
