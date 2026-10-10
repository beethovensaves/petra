-- Native conversation content extends the existing canonical Thread/Run/Work owners.
-- It does not create alternative thread, run or domain authority.
CREATE TABLE petra.project_copilot_context_refs (
  run_id text PRIMARY KEY REFERENCES petra.project_copilot_turns(run_id),
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL REFERENCES petra.actors(actor_id),
  context_record_id text NOT NULL UNIQUE,
  context_hash text NOT NULL CHECK (context_hash ~ '^sha256:[0-9a-f]{64}$'),
  turn_content_hash text NOT NULL CHECK (turn_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  input_artifact_id text NOT NULL REFERENCES petra.artifacts(artifact_id),
  UNIQUE(run_id,project_id,actor_id)
);
CREATE TABLE petra.project_copilot_result_refs (
  run_id text PRIMARY KEY REFERENCES petra.project_copilot_context_refs(run_id),
  result_record_id text NOT NULL UNIQUE,
  result_hash text NOT NULL CHECK (result_hash ~ '^sha256:[0-9a-f]{64}$'),
  response_artifact_id text NOT NULL REFERENCES petra.artifacts(artifact_id),
  FOREIGN KEY(run_id) REFERENCES petra.project_copilot_terminals(run_id)
);
CREATE TABLE petra.project_copilot_owner_bindings (
  run_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision IN (1,2)),
  project_id text NOT NULL,
  actor_id text NOT NULL,
  project_thread_id text NOT NULL,
  thread_revision bigint NOT NULL,
  thread_hash text NOT NULL,
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL,
  work_unit_id text NOT NULL,
  work_unit_revision bigint NOT NULL,
  work_unit_spec_hash text NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  PRIMARY KEY(run_id,revision),
  FOREIGN KEY(run_id,project_id,actor_id) REFERENCES petra.project_copilot_context_refs(run_id,project_id,actor_id),
  FOREIGN KEY(project_thread_id,thread_revision,thread_hash) REFERENCES petra.project_thread_revisions(project_thread_id,revision,content_hash),
  FOREIGN KEY(interaction_run_id,interaction_run_revision,interaction_run_hash) REFERENCES petra.interaction_run_revisions(interaction_run_id,revision,content_hash),
  FOREIGN KEY(work_unit_id,work_unit_revision,project_id,work_unit_spec_hash) REFERENCES petra.work_unit_revisions(work_unit_id,revision,project_id,spec_hash),
  CHECK (payload->>'project_id'=project_id),
  CHECK (payload->>'actor_id'=actor_id),
  CHECK (payload->>'protocol_run_id'=run_id),
  CHECK (payload#>>'{project_thread_ref,project_thread_id}'=project_thread_id),
  CHECK ((payload#>>'{project_thread_ref,revision}')::bigint=thread_revision),
  CHECK (payload#>>'{project_thread_ref,content_hash}'=thread_hash),
  CHECK (payload#>>'{interaction_run_ref,interaction_run_id}'=interaction_run_id),
  CHECK ((payload#>>'{interaction_run_ref,revision}')::bigint=interaction_run_revision),
  CHECK (payload#>>'{interaction_run_ref,content_hash}'=interaction_run_hash),
  CHECK (payload#>>'{work_unit_ref,work_unit_id}'=work_unit_id),
  CHECK ((payload#>>'{work_unit_ref,revision}')::bigint=work_unit_revision),
  CHECK (payload#>>'{work_unit_ref,spec_hash}'=work_unit_spec_hash)
);
ALTER TABLE petra.project_thread_revisions DROP CONSTRAINT project_thread_revisions_schema_version_check;
ALTER TABLE petra.project_thread_revisions ADD CHECK (schema_version IN ('1.0.0','1.1.0'));
ALTER TABLE petra.project_thread_turn_bindings DROP CONSTRAINT project_thread_turn_bindings_context_schema_name_check;
ALTER TABLE petra.project_thread_turn_bindings DROP CONSTRAINT project_thread_turn_bindings_result_schema_name_check;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN context_packet_id DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN context_packet_revision DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN context_packet_hash DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN snapshot_id DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN snapshot_revision DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN snapshot_event_position DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN snapshot_hash DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN grounded_response_id DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN grounded_response_revision DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ALTER COLUMN grounded_response_hash DROP NOT NULL;
ALTER TABLE petra.project_thread_turn_bindings ADD COLUMN native_run_id text
  REFERENCES petra.project_copilot_result_refs(run_id);
ALTER TABLE petra.project_thread_turn_bindings ADD CONSTRAINT project_thread_native_or_scientific CHECK (
  (native_run_id IS NULL AND context_schema_name='petra.context-packet'
   AND result_schema_name='petra.grounded-response'
   AND context_packet_id IS NOT NULL AND context_packet_revision IS NOT NULL
   AND context_packet_hash IS NOT NULL AND snapshot_id IS NOT NULL
   AND snapshot_revision IS NOT NULL AND snapshot_event_position IS NOT NULL
   AND snapshot_hash IS NOT NULL AND grounded_response_id IS NOT NULL
   AND grounded_response_revision IS NOT NULL AND grounded_response_hash IS NOT NULL)
 OR
  (native_run_id IS NOT NULL AND context_schema_name='petra.copilot-context'
   AND result_schema_name='petra.conversation-result'
   AND context_packet_id IS NULL AND context_packet_revision IS NULL
   AND context_packet_hash IS NULL AND snapshot_id IS NULL
   AND snapshot_revision IS NULL AND snapshot_event_position IS NULL
   AND snapshot_hash IS NULL AND grounded_response_id IS NULL
   AND grounded_response_revision IS NULL AND grounded_response_hash IS NULL
   AND turn_payload#>>'{input,source_message_id}'=native_run_id
   AND turn_payload#>'{context,basis}' IS NOT NULL)
);
CREATE FUNCTION petra.validate_native_conversation_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE retained jsonb; terminal jsonb; context_ref petra.project_copilot_context_refs%ROWTYPE;
        result_ref petra.project_copilot_result_refs%ROWTYPE; run_payload jsonb; work_payload jsonb; owned_thread_id text; thread_schema_version text;
BEGIN
 IF NEW.native_run_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO STRICT context_ref FROM petra.project_copilot_context_refs WHERE run_id=NEW.native_run_id;
 SELECT * INTO STRICT result_ref FROM petra.project_copilot_result_refs WHERE run_id=NEW.native_run_id;
 SELECT payload INTO STRICT retained FROM petra.project_copilot_turns WHERE run_id=NEW.native_run_id;
 SELECT payload INTO STRICT terminal FROM petra.project_copilot_terminals WHERE run_id=NEW.native_run_id;
 SELECT payload INTO STRICT run_payload FROM petra.interaction_run_revisions WHERE interaction_run_id=NEW.interaction_run_id AND revision=NEW.interaction_run_revision;
 SELECT payload INTO STRICT work_payload FROM petra.work_unit_revisions WHERE work_unit_id=NEW.work_unit_id AND revision=NEW.work_unit_revision;
 SELECT project_thread_id INTO STRICT owned_thread_id FROM petra.project_copilot_owner_bindings WHERE run_id=NEW.native_run_id AND revision=1;
 SELECT schema_version INTO STRICT thread_schema_version FROM petra.project_thread_revisions WHERE project_thread_id=NEW.project_thread_id AND revision=NEW.thread_revision;
 IF NEW.project_thread_id IS DISTINCT FROM owned_thread_id
 OR thread_schema_version IS DISTINCT FROM '1.1.0'
 OR NEW.project_id IS DISTINCT FROM context_ref.project_id
 OR NEW.authority_actor_id IS DISTINCT FROM context_ref.actor_id
 OR NEW.input_hash IS DISTINCT FROM context_ref.turn_content_hash
 OR NEW.input_artifact_id IS DISTINCT FROM context_ref.input_artifact_id
 OR NEW.response_artifact_id IS DISTINCT FROM result_ref.response_artifact_id
 OR NEW.turn_payload#>>'{context,context_record_ref,record_id}' IS DISTINCT FROM context_ref.context_record_id
 OR NEW.turn_payload#>>'{context,context_record_ref,content_hash}' IS DISTINCT FROM context_ref.context_hash
 OR NEW.turn_payload#>'{context,basis}' IS DISTINCT FROM retained#>'{context,basis}'
 OR NEW.turn_payload#>>'{response,result_record_ref,record_id}' IS DISTINCT FROM result_ref.result_record_id
 OR NEW.turn_payload#>>'{response,result_record_ref,content_hash}' IS DISTINCT FROM result_ref.result_hash
 OR NEW.turn_payload#>>'{response,state}' IS DISTINCT FROM terminal->>'state'
 OR NEW.turn_payload#>>'{project_definition_ref,project_definition_id}' IS DISTINCT FROM retained#>>'{context,basis,definition,record_id}'
 OR NEW.turn_payload#>>'{project_definition_ref,content_hash}' IS DISTINCT FROM retained#>>'{context,basis,definition,content_hash}'
 OR NEW.turn_payload#>>'{project_definition_ref,revision}' IS DISTINCT FROM retained#>>'{context,basis,definition,revision}'
 OR run_payload#>>'{content,correlation,protocol_run_id}' IS DISTINCT FROM NEW.native_run_id
 OR run_payload#>>'{content,correlation,protocol_thread_id}' IS DISTINCT FROM retained->>'thread_id'
 OR run_payload#>>'{content,input,input_hash}' IS DISTINCT FROM NEW.input_hash
 OR run_payload#>>'{content,authority_context,actor,actor_id}' IS DISTINCT FROM NEW.authority_actor_id
 OR run_payload#>>'{content,authority_context,capability_grant_id}' IS DISTINCT FROM NEW.capability_grant_id
 OR work_payload->>'capability_grant_id' IS DISTINCT FROM NEW.capability_grant_id
 OR work_payload#>>'{status,state}' NOT IN ('completed','cancelled')
 THEN RAISE EXCEPTION 'native conversation binding does not resolve to its exact canonical owners' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER project_thread_native_binding_is_exact BEFORE INSERT ON petra.project_thread_turn_bindings
 FOR EACH ROW EXECUTE FUNCTION petra.validate_native_conversation_binding();
CREATE TRIGGER project_copilot_context_refs_are_immutable BEFORE UPDATE OR DELETE ON petra.project_copilot_context_refs
 FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER project_copilot_result_refs_are_immutable BEFORE UPDATE OR DELETE ON petra.project_copilot_result_refs
 FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER project_copilot_owner_bindings_are_immutable BEFORE UPDATE OR DELETE ON petra.project_copilot_owner_bindings
 FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='petra.worker_output_manifests'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%schema_version%' LOOP
 EXECUTE format('ALTER TABLE petra.worker_output_manifests DROP CONSTRAINT %I',item.conname);
 END LOOP; END $$;
ALTER TABLE petra.worker_output_manifests ADD CHECK (payload->>'schema_version' IN ('1.0.0','1.1.0'));
