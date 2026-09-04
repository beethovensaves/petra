ALTER TABLE petra.artifacts
  ADD CONSTRAINT artifacts_exact_interaction_payload_key
  UNIQUE (artifact_id, content_hash, byte_size, media_type);

ALTER TABLE petra.work_unit_revisions
  ADD CONSTRAINT work_unit_revisions_exact_interaction_ref_key
  UNIQUE (work_unit_id, revision, project_id, spec_hash);

CREATE TABLE petra.interaction_feature_manifests (
  interaction_feature_manifest_id text PRIMARY KEY
    CHECK (interaction_feature_manifest_id ~ '^interaction_feature_manifest_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  protocol_name text NOT NULL CHECK (protocol_name = 'ag-ui'),
  sdk_version text NOT NULL CHECK (char_length(sdk_version) BETWEEN 1 AND 100),
  profile_version text NOT NULL CHECK (char_length(profile_version) BETWEEN 1 AND 100),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  compiled_by_actor_id text NOT NULL,
  compiled_by_actor_kind text NOT NULL CHECK (compiled_by_actor_kind = 'service'),
  compiled_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.interaction-feature-manifest')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'interaction_feature_manifest_id' = interaction_feature_manifest_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{content,protocol,name}' = protocol_name)
    CHECK (payload #>> '{content,protocol,sdk_version}' = sdk_version)
    CHECK (payload #>> '{content,protocol,profile_version}' = profile_version)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{compiled_by,actor_id}' = compiled_by_actor_id)
    CHECK (payload #>> '{compiled_by,actor_kind}' = compiled_by_actor_kind)
    CHECK ((payload ->> 'compiled_at')::timestamptz = compiled_at)
    CHECK (payload #>> '{content,authority_boundary,grants_capabilities}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,interaction_state_is_authoritative}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,replay_reapplies_authority}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,connection_abort_cancels_work}' = 'false'),
  UNIQUE (interaction_feature_manifest_id, revision, content_hash),
  FOREIGN KEY (compiled_by_actor_id, compiled_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_feature_standard_events (
  interaction_feature_manifest_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  event_type text NOT NULL CHECK (
    event_type IN (
      'RUN_STARTED', 'RUN_FINISHED', 'RUN_ERROR',
      'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END',
      'TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_END',
      'STATE_SNAPSHOT', 'STATE_DELTA',
      'ACTIVITY_SNAPSHOT', 'ACTIVITY_DELTA', 'CUSTOM'
    )
  ),
  PRIMARY KEY (interaction_feature_manifest_id, position),
  UNIQUE (interaction_feature_manifest_id, event_type),
  FOREIGN KEY (interaction_feature_manifest_id)
    REFERENCES petra.interaction_feature_manifests (interaction_feature_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_feature_custom_events (
  interaction_feature_manifest_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  event_name text NOT NULL,
  schema_name text NOT NULL,
  schema_version text NOT NULL,
  schema_hash text NOT NULL CHECK (schema_hash ~ '^sha256:[0-9a-f]{64}$'),
  json_pointer text,
  stability text NOT NULL CHECK (stability IN ('stable', 'experimental')),
  authority_effect text NOT NULL CHECK (authority_effect = 'none'),
  registration jsonb NOT NULL CHECK (jsonb_typeof(registration) = 'object'),
  PRIMARY KEY (interaction_feature_manifest_id, position),
  UNIQUE (interaction_feature_manifest_id, event_name),
  FOREIGN KEY (interaction_feature_manifest_id)
    REFERENCES petra.interaction_feature_manifests (interaction_feature_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_interaction_run_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'InteractionRun heads cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW.interaction_run_id <> OLD.interaction_run_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.feature_manifest_id <> OLD.feature_manifest_id
     OR NEW.feature_manifest_revision <> OLD.feature_manifest_revision
     OR NEW.feature_manifest_hash <> OLD.feature_manifest_hash
     OR NEW.protocol_thread_id <> OLD.protocol_thread_id
     OR NEW.protocol_run_id <> OLD.protocol_run_id
     OR NEW.request_id <> OLD.request_id
     OR NEW.trace_id <> OLD.trace_id
     OR NEW.work_unit_id <> OLD.work_unit_id
     OR NEW.work_unit_revision <> OLD.work_unit_revision
     OR NEW.work_unit_spec_hash <> OLD.work_unit_spec_hash
     OR NEW.model_request_id IS DISTINCT FROM OLD.model_request_id
     OR NEW.agent_run_id IS DISTINCT FROM OLD.agent_run_id
     OR NEW.authority_actor_id <> OLD.authority_actor_id
     OR NEW.authority_actor_kind <> OLD.authority_actor_kind
     OR NEW.capability_grant_id <> OLD.capability_grant_id
     OR NEW.privacy_profile_id <> OLD.privacy_profile_id
     OR NEW.privacy_profile_revision <> OLD.privacy_profile_revision
     OR NEW.privacy_profile_hash <> OLD.privacy_profile_hash
     OR NEW.budget_profile_id <> OLD.budget_profile_id
     OR NEW.budget_profile_revision <> OLD.budget_profile_revision
     OR NEW.budget_profile_hash <> OLD.budget_profile_hash
     OR NEW.input_hash <> OLD.input_hash
     OR NEW.source_message_id <> OLD.source_message_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'InteractionRun identity, correlation, input, and authority context are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'InteractionRun revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.interaction_runs (
  interaction_run_id text PRIMARY KEY
    CHECK (interaction_run_id ~ '^interaction_run_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  feature_manifest_id text NOT NULL,
  feature_manifest_revision bigint NOT NULL CHECK (feature_manifest_revision = 1),
  feature_manifest_hash text NOT NULL CHECK (feature_manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  protocol_thread_id text NOT NULL CHECK (char_length(protocol_thread_id) BETWEEN 1 AND 256),
  protocol_run_id text NOT NULL CHECK (char_length(protocol_run_id) BETWEEN 1 AND 256),
  request_id text NOT NULL CHECK (request_id ~ '^request_[0-9A-HJKMNP-TV-Z]{26}$'),
  trace_id text NOT NULL CHECK (trace_id ~ '^trace_[0-9A-HJKMNP-TV-Z]{26}$'),
  work_unit_id text NOT NULL,
  work_unit_revision bigint NOT NULL CHECK (work_unit_revision >= 1),
  work_unit_spec_hash text NOT NULL CHECK (work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  model_request_id text,
  agent_run_id text,
  authority_actor_id text NOT NULL,
  authority_actor_kind text NOT NULL,
  capability_grant_id text NOT NULL
    CHECK (capability_grant_id ~ '^capability_grant_[0-9A-HJKMNP-TV-Z]{26}$'),
  privacy_profile_id text NOT NULL,
  privacy_profile_revision bigint NOT NULL CHECK (privacy_profile_revision >= 1),
  privacy_profile_hash text NOT NULL CHECK (privacy_profile_hash ~ '^sha256:[0-9a-f]{64}$'),
  budget_profile_id text NOT NULL,
  budget_profile_revision bigint NOT NULL CHECK (budget_profile_revision >= 1),
  budget_profile_hash text NOT NULL CHECK (budget_profile_hash ~ '^sha256:[0-9a-f]{64}$'),
  input_hash text NOT NULL CHECK (input_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_message_id text NOT NULL CHECK (char_length(source_message_id) BETWEEN 1 AND 256),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (protocol_thread_id, protocol_run_id),
  UNIQUE (interaction_run_id, project_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (feature_manifest_id, feature_manifest_revision, feature_manifest_hash)
    REFERENCES petra.interaction_feature_manifests
      (interaction_feature_manifest_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, work_unit_revision, project_id, work_unit_spec_hash)
    REFERENCES petra.work_unit_revisions
      (work_unit_id, revision, project_id, spec_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (authority_actor_id, authority_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_run_revisions (
  interaction_run_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  parent_revision bigint,
  parent_hash text,
  lifecycle_state text NOT NULL
    CHECK (lifecycle_state IN ('queued', 'running', 'awaiting_interrupt', 'completed', 'failed', 'cancelled')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  outcome_code text,
  stream_state text NOT NULL CHECK (stream_state IN ('empty', 'advanced')),
  event_count bigint NOT NULL CHECK (event_count >= 0),
  latest_sequence bigint,
  stream_head_hash text,
  updated_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.interaction-run')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'interaction_run_id' = interaction_run_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{content,lifecycle,state}' = lifecycle_state)
    CHECK ((payload #>> '{content,lifecycle,started_at}')::timestamptz = started_at)
    CHECK (payload #>> '{content,stream_head,state}' = stream_state)
    CHECK ((payload #>> '{content,stream_head,event_count}')::bigint = event_count)
    CHECK ((payload ->> 'updated_at')::timestamptz = updated_at)
    CHECK (payload #>> '{content,authority_boundary,interaction_state_is_authoritative}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,events_are_domain_ledger}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,connection_abort_cancels_work}' = 'false'),
  PRIMARY KEY (interaction_run_id, revision),
  UNIQUE (interaction_run_id, revision, content_hash),
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_run_id, parent_revision, parent_hash)
    REFERENCES petra.interaction_run_revisions
      (interaction_run_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (revision = 1 AND parent_revision IS NULL AND parent_hash IS NULL)
    OR (revision > 1 AND parent_revision = revision - 1 AND parent_hash IS NOT NULL)
  ),
  CHECK (
    (stream_state = 'empty' AND event_count = 0 AND latest_sequence IS NULL AND stream_head_hash IS NULL)
    OR (stream_state = 'advanced' AND event_count >= 1 AND latest_sequence = event_count
        AND stream_head_hash ~ '^sha256:[0-9a-f]{64}$')
  ),
  CHECK (
    (lifecycle_state IN ('queued', 'running', 'awaiting_interrupt')
      AND ended_at IS NULL AND outcome_code IS NULL)
    OR (lifecycle_state IN ('completed', 'failed', 'cancelled')
      AND ended_at IS NOT NULL AND ended_at >= started_at
      AND outcome_code IS NOT NULL)
  ),
  CHECK (updated_at >= started_at)
);

ALTER TABLE petra.interaction_runs
  ADD CONSTRAINT interaction_runs_current_revision_fkey
  FOREIGN KEY (interaction_run_id, current_revision)
  REFERENCES petra.interaction_run_revisions (interaction_run_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.interaction_event_records (
  interaction_event_record_id text PRIMARY KEY
    CHECK (interaction_event_record_id ~ '^interaction_event_record_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL CHECK (interaction_run_hash ~ '^sha256:[0-9a-f]{64}$'),
  sequence bigint NOT NULL CHECK (sequence >= 1),
  previous_event_record_id text,
  previous_sequence bigint,
  previous_content_hash text,
  protocol_name text NOT NULL CHECK (protocol_name = 'ag-ui'),
  protocol_event_type text NOT NULL,
  protocol_event_id text,
  custom_event_name text,
  custom_schema_name text,
  custom_schema_version text,
  custom_schema_hash text,
  semantic_kind text NOT NULL CHECK (
    semantic_kind IN (
      'run_lifecycle', 'assistant_text', 'activity', 'tool_proposal',
      'state_projection', 'interrupt', 'error', 'custom'
    )
  ),
  payload_artifact_id text NOT NULL,
  payload_content_hash text NOT NULL,
  payload_byte_size bigint NOT NULL,
  payload_media_type text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('researcher', 'project', 'private_system')),
  redaction text NOT NULL CHECK (redaction IN ('none', 'metadata_only', 'payload_withheld')),
  visibility_reason text,
  authority_effect text NOT NULL
    CHECK (authority_effect IN ('none', 'command_proposed', 'command_result_observed')),
  command_id text,
  command_idempotency_key text,
  command_hash text,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.interaction-event-record')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'interaction_event_record_id' = interaction_event_record_id)
    CHECK ((payload ->> 'sequence')::bigint = sequence)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{interaction_run_ref,interaction_run_id}' = interaction_run_id)
    CHECK ((payload #>> '{interaction_run_ref,revision}')::bigint = interaction_run_revision)
    CHECK (payload #>> '{interaction_run_ref,content_hash}' = interaction_run_hash)
    CHECK (payload #>> '{content,protocol,protocol}' = protocol_name)
    CHECK (payload #>> '{content,protocol,event_type}' = protocol_event_type)
    CHECK (payload #>> '{content,semantic_kind}' = semantic_kind)
    CHECK (payload #>> '{content,payload_artifact_ref,artifact_id}' = payload_artifact_id)
    CHECK (payload #>> '{content,payload_artifact_ref,content_sha256}' = payload_content_hash)
    CHECK ((payload #>> '{content,payload_artifact_ref,byte_size}')::bigint = payload_byte_size)
    CHECK (payload #>> '{content,payload_artifact_ref,media_type}' = payload_media_type)
    CHECK (payload #>> '{content,visibility,audience}' = audience)
    CHECK (payload #>> '{content,visibility,redaction}' = redaction)
    CHECK (payload #>> '{content,authority_effect,effect_kind}' = authority_effect)
    CHECK (payload ->> 'content_hash' = content_hash),
  UNIQUE (interaction_run_id, sequence),
  UNIQUE (interaction_event_record_id, sequence, content_hash),
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_run_id, interaction_run_revision, interaction_run_hash)
    REFERENCES petra.interaction_run_revisions
      (interaction_run_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (previous_event_record_id, previous_sequence, previous_content_hash)
    REFERENCES petra.interaction_event_records
      (interaction_event_record_id, sequence, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (payload_artifact_id, payload_content_hash, payload_byte_size, payload_media_type)
    REFERENCES petra.artifacts (artifact_id, content_hash, byte_size, media_type)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (sequence = 1 AND previous_event_record_id IS NULL
      AND previous_sequence IS NULL AND previous_content_hash IS NULL)
    OR (sequence > 1 AND previous_event_record_id IS NOT NULL
      AND previous_sequence = sequence - 1 AND previous_content_hash IS NOT NULL)
  ),
  CHECK (
    (protocol_event_type = 'CUSTOM' AND custom_event_name IS NOT NULL
      AND custom_schema_name IS NOT NULL AND custom_schema_version IS NOT NULL
      AND custom_schema_hash IS NOT NULL)
    OR (protocol_event_type <> 'CUSTOM' AND custom_event_name IS NULL
      AND custom_schema_name IS NULL AND custom_schema_version IS NULL
      AND custom_schema_hash IS NULL)
  ),
  CHECK (
    (authority_effect = 'none' AND command_id IS NULL
      AND command_idempotency_key IS NULL AND command_hash IS NULL)
    OR (authority_effect <> 'none' AND command_id IS NOT NULL
      AND command_idempotency_key IS NOT NULL AND command_hash IS NOT NULL
      AND semantic_kind IN ('tool_proposal', 'interrupt', 'run_lifecycle'))
  )
);

CREATE TABLE petra.interaction_interrupts (
  interaction_interrupt_id text PRIMARY KEY
    CHECK (interaction_interrupt_id ~ '^interaction_interrupt_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL,
  request_event_record_id text NOT NULL,
  request_event_sequence bigint NOT NULL,
  request_event_hash text NOT NULL,
  interrupt_kind text NOT NULL CHECK (
    interrupt_kind IN ('clarification', 'review', 'approval', 'correction', 'budget_escalation')
  ),
  created_at timestamptz NOT NULL,
  UNIQUE (interaction_interrupt_id, project_id),
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_run_id, interaction_run_revision, interaction_run_hash)
    REFERENCES petra.interaction_run_revisions
      (interaction_run_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (request_event_record_id, request_event_sequence, request_event_hash)
    REFERENCES petra.interaction_event_records
      (interaction_event_record_id, sequence, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_interrupt_revisions (
  interaction_interrupt_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  parent_revision bigint,
  parent_hash text,
  state text NOT NULL CHECK (state IN ('pending', 'responded', 'closed_without_response')),
  prompt_artifact_id text,
  prompt_content_hash text,
  prompt_byte_size bigint,
  prompt_media_type text,
  response_schema_name text,
  response_schema_version text,
  response_schema_hash text,
  response_artifact_id text,
  response_content_hash text,
  response_byte_size bigint,
  response_media_type text,
  responded_by_actor_id text,
  responded_by_actor_kind text,
  resulting_command_id text,
  resulting_command_idempotency_key text,
  resulting_command_hash text,
  close_reason text,
  authority_effect text NOT NULL CHECK (authority_effect IN ('none', 'command_input_only')),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  updated_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.interaction-interrupt')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'interaction_interrupt_id' = interaction_interrupt_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,state}' = state)
    CHECK (payload #>> '{content,authority_effect}' = authority_effect)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'updated_at')::timestamptz = updated_at),
  PRIMARY KEY (interaction_interrupt_id, revision),
  UNIQUE (interaction_interrupt_id, revision, content_hash),
  UNIQUE (resulting_command_id),
  FOREIGN KEY (interaction_interrupt_id, project_id)
    REFERENCES petra.interaction_interrupts (interaction_interrupt_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_interrupt_id, parent_revision, parent_hash)
    REFERENCES petra.interaction_interrupt_revisions
      (interaction_interrupt_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (prompt_artifact_id, prompt_content_hash, prompt_byte_size, prompt_media_type)
    REFERENCES petra.artifacts (artifact_id, content_hash, byte_size, media_type)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (response_artifact_id, response_content_hash, response_byte_size, response_media_type)
    REFERENCES petra.artifacts (artifact_id, content_hash, byte_size, media_type)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (responded_by_actor_id, responded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (revision = 1 AND parent_revision IS NULL AND parent_hash IS NULL AND state = 'pending')
    OR (revision > 1 AND parent_revision = revision - 1 AND parent_hash IS NOT NULL AND state <> 'pending')
  ),
  CHECK (
    (state = 'pending' AND prompt_artifact_id IS NOT NULL
      AND prompt_content_hash IS NOT NULL AND prompt_byte_size IS NOT NULL
      AND prompt_media_type IS NOT NULL AND response_schema_name IS NOT NULL
      AND response_schema_version IS NOT NULL AND response_schema_hash IS NOT NULL
      AND response_artifact_id IS NULL AND response_content_hash IS NULL
      AND response_byte_size IS NULL AND response_media_type IS NULL
      AND responded_by_actor_id IS NULL AND resulting_command_id IS NULL
      AND close_reason IS NULL AND authority_effect = 'none')
    OR (state = 'responded' AND prompt_artifact_id IS NULL
      AND prompt_content_hash IS NULL AND prompt_byte_size IS NULL
      AND prompt_media_type IS NULL AND response_schema_name IS NULL
      AND response_schema_version IS NULL AND response_schema_hash IS NULL
      AND response_artifact_id IS NOT NULL AND response_content_hash IS NOT NULL
      AND response_byte_size IS NOT NULL AND response_media_type IS NOT NULL
      AND responded_by_actor_id IS NOT NULL AND responded_by_actor_kind IS NOT NULL
      AND resulting_command_id IS NOT NULL
      AND resulting_command_idempotency_key IS NOT NULL
      AND resulting_command_hash IS NOT NULL
      AND close_reason IS NULL AND authority_effect = 'command_input_only')
    OR (state = 'closed_without_response' AND prompt_artifact_id IS NULL
      AND prompt_content_hash IS NULL AND prompt_byte_size IS NULL
      AND prompt_media_type IS NULL AND response_schema_name IS NULL
      AND response_schema_version IS NULL AND response_schema_hash IS NULL
      AND response_artifact_id IS NULL AND response_content_hash IS NULL
      AND response_byte_size IS NULL AND response_media_type IS NULL
      AND responded_by_actor_id IS NULL AND responded_by_actor_kind IS NULL
      AND resulting_command_id IS NULL AND resulting_command_idempotency_key IS NULL
      AND resulting_command_hash IS NULL
      AND close_reason IN ('expired', 'withdrawn', 'superseded')
      AND authority_effect = 'none')
  )
);

ALTER TABLE petra.interaction_interrupts
  ADD CONSTRAINT interaction_interrupts_current_revision_fkey
  FOREIGN KEY (interaction_interrupt_id, current_revision)
  REFERENCES petra.interaction_interrupt_revisions
    (interaction_interrupt_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.interaction_interrupt_subjects (
  interaction_interrupt_id text NOT NULL,
  revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  subject_ref text NOT NULL,
  PRIMARY KEY (interaction_interrupt_id, revision, position),
  UNIQUE (interaction_interrupt_id, revision, subject_ref),
  FOREIGN KEY (interaction_interrupt_id, revision)
    REFERENCES petra.interaction_interrupt_revisions
      (interaction_interrupt_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_run_revision_interrupts (
  interaction_run_id text NOT NULL,
  revision bigint NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  interaction_interrupt_id text NOT NULL,
  PRIMARY KEY (interaction_run_id, revision, position),
  UNIQUE (interaction_run_id, revision, interaction_interrupt_id),
  FOREIGN KEY (interaction_run_id, revision)
    REFERENCES petra.interaction_run_revisions (interaction_run_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_interrupt_id)
    REFERENCES petra.interaction_interrupts (interaction_interrupt_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_connections (
  connection_id text PRIMARY KEY
    CHECK (connection_id ~ '^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$'),
  interaction_run_id text NOT NULL,
  project_id text NOT NULL,
  current_attempt integer NOT NULL CHECK (current_attempt >= 1),
  UNIQUE (connection_id, interaction_run_id),
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.interaction_replay_records (
  interaction_replay_record_id text PRIMARY KEY
    CHECK (interaction_replay_record_id ~ '^interaction_replay_record_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL,
  connection_id text NOT NULL,
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 1000000),
  delivery_kind text NOT NULL CHECK (delivery_kind IN ('initial', 'resume', 'replay')),
  after_sequence bigint NOT NULL CHECK (after_sequence >= 0),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  outcome_kind text NOT NULL CHECK (outcome_kind IN ('completed', 'connection_aborted', 'write_error')),
  last_delivered_sequence bigint,
  error_code text,
  error_message text,
  observed_work_unit_id text NOT NULL,
  observed_work_unit_revision bigint NOT NULL,
  observed_work_unit_status text NOT NULL CHECK (
    observed_work_unit_status IN ('requested', 'queued', 'running', 'checkpointed', 'succeeded', 'failed', 'cancelled')
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.interaction-replay-record')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'interaction_replay_record_id' = interaction_replay_record_id)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{interaction_run_ref,interaction_run_id}' = interaction_run_id)
    CHECK ((payload #>> '{interaction_run_ref,revision}')::bigint = interaction_run_revision)
    CHECK (payload #>> '{interaction_run_ref,content_hash}' = interaction_run_hash)
    CHECK (payload #>> '{content,connection_id}' = connection_id)
    CHECK ((payload #>> '{content,attempt}')::integer = attempt)
    CHECK (payload #>> '{content,request,delivery_kind}' = delivery_kind)
    CHECK ((payload #>> '{content,request,after_sequence}')::bigint = after_sequence)
    CHECK (payload #>> '{content,outcome,outcome_kind}' = outcome_kind)
    CHECK (payload #>> '{content,work_unit_observation,work_unit_id}' = observed_work_unit_id)
    CHECK ((payload #>> '{content,work_unit_observation,revision}')::bigint = observed_work_unit_revision)
    CHECK (payload #>> '{content,work_unit_observation,status}' = observed_work_unit_status)
    CHECK (payload #>> '{content,authority_boundary,authority_reapplied}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,commands_reexecuted}' = 'false')
    CHECK (payload #>> '{content,authority_boundary,durable_work_cancelled}' = 'false')
    CHECK (payload ->> 'content_hash' = content_hash),
  UNIQUE (connection_id, attempt),
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_run_id, interaction_run_revision, interaction_run_hash)
    REFERENCES petra.interaction_run_revisions
      (interaction_run_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (connection_id, interaction_run_id)
    REFERENCES petra.interaction_connections (connection_id, interaction_run_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (observed_work_unit_id, observed_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (completed_at >= started_at AND recorded_at >= completed_at),
  CHECK (
    (outcome_kind = 'completed' AND last_delivered_sequence IS NULL
      AND error_code IS NULL AND error_message IS NULL)
    OR (outcome_kind = 'connection_aborted' AND last_delivered_sequence IS NOT NULL
      AND error_code IS NULL AND error_message IS NULL)
    OR (outcome_kind = 'write_error' AND last_delivered_sequence IS NOT NULL
      AND error_code IS NOT NULL AND error_message IS NOT NULL)
  )
);

CREATE TABLE petra.interaction_replay_deliveries (
  interaction_replay_record_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  interaction_event_record_id text NOT NULL,
  sequence bigint NOT NULL,
  content_hash text NOT NULL,
  PRIMARY KEY (interaction_replay_record_id, position),
  UNIQUE (interaction_replay_record_id, interaction_event_record_id),
  FOREIGN KEY (interaction_replay_record_id)
    REFERENCES petra.interaction_replay_records (interaction_replay_record_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_event_record_id, sequence, content_hash)
    REFERENCES petra.interaction_event_records
      (interaction_event_record_id, sequence, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.interaction_connections
  ADD CONSTRAINT interaction_connections_current_attempt_fkey
  FOREIGN KEY (connection_id, current_attempt)
  REFERENCES petra.interaction_replay_records (connection_id, attempt)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.validate_interaction_run_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  run_head petra.interaction_runs%ROWTYPE;
  prior_state text;
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
    SELECT lifecycle_state INTO prior_state
      FROM petra.interaction_run_revisions
     WHERE interaction_run_id = NEW.interaction_run_id
       AND revision = NEW.revision - 1;
    IF prior_state IS NULL OR prior_state IN ('completed', 'failed', 'cancelled') THEN
      RAISE EXCEPTION 'InteractionRun revision must follow a nonterminal immediate predecessor'
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

CREATE FUNCTION petra.validate_interaction_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  feature_id text;
  run_created_at timestamptz;
  enabled boolean;
  prior_run_id text;
  existing_count bigint;
BEGIN
  SELECT feature_manifest_id, created_at INTO feature_id, run_created_at
    FROM petra.interaction_runs WHERE interaction_run_id = NEW.interaction_run_id;
  IF NEW.recorded_at < run_created_at THEN
    RAISE EXCEPTION 'Interaction event cannot precede its run' USING ERRCODE = '23514';
  END IF;
  SELECT count(*) INTO existing_count FROM petra.interaction_event_records
   WHERE interaction_run_id = NEW.interaction_run_id;
  IF existing_count <> NEW.sequence - 1 THEN
    RAISE EXCEPTION 'Interaction event sequence must be contiguous within its run'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.sequence > 1 THEN
    SELECT interaction_run_id INTO prior_run_id
      FROM petra.interaction_event_records
     WHERE interaction_event_record_id = NEW.previous_event_record_id;
    IF prior_run_id IS DISTINCT FROM NEW.interaction_run_id THEN
      RAISE EXCEPTION 'Interaction event lineage cannot cross runs'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF (NEW.payload ->> 'revision')::bigint <> NEW.revision
     OR NEW.payload ->> 'content_hash' <> NEW.content_hash
     OR NEW.payload #>> '{content,protocol,protocol_event_id}'
       IS DISTINCT FROM NEW.protocol_event_id
     OR NEW.payload #>> '{content,protocol,custom_event,event_name}'
       IS DISTINCT FROM NEW.custom_event_name
     OR NEW.payload #>> '{content,protocol,custom_event,schema_name}'
       IS DISTINCT FROM NEW.custom_schema_name
     OR NEW.payload #>> '{content,protocol,custom_event,schema_version}'
       IS DISTINCT FROM NEW.custom_schema_version
     OR NEW.payload #>> '{content,protocol,custom_event,schema_hash}'
       IS DISTINCT FROM NEW.custom_schema_hash
     OR NEW.payload #>> '{content,visibility,reason}'
       IS DISTINCT FROM NEW.visibility_reason
     OR NEW.payload #>> '{content,authority_effect,command_ref,command_id}'
       IS DISTINCT FROM NEW.command_id
     OR NEW.payload #>> '{content,authority_effect,command_ref,idempotency_key}'
       IS DISTINCT FROM NEW.command_idempotency_key
     OR NEW.payload #>> '{content,authority_effect,command_ref,command_hash}'
       IS DISTINCT FROM NEW.command_hash
     OR NEW.payload #>> '{recorded_by,actor_id}' <> NEW.recorded_by_actor_id
     OR NEW.payload #>> '{recorded_by,actor_kind}' <> NEW.recorded_by_actor_kind
     OR (NEW.payload ->> 'recorded_at')::timestamptz <> NEW.recorded_at THEN
    RAISE EXCEPTION 'Interaction event query columns must reproduce its canonical payload'
      USING ERRCODE = '23514';
  END IF;
  IF (NEW.sequence = 1 AND NEW.payload #>> '{lineage,lineage_kind}' <> 'start')
     OR (NEW.sequence > 1 AND
       (NEW.payload #>> '{lineage,lineage_kind}' <> 'continuation'
        OR NEW.payload #>> '{lineage,previous_event_record_id}' <>
          NEW.previous_event_record_id
        OR (NEW.payload #>> '{lineage,previous_sequence}')::bigint <>
          NEW.previous_sequence
        OR NEW.payload #>> '{lineage,previous_content_hash}' <>
          NEW.previous_content_hash)) THEN
    RAISE EXCEPTION 'Interaction event lineage columns must reproduce its canonical payload'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.protocol_event_type = 'CUSTOM' THEN
    SELECT EXISTS (
      SELECT 1 FROM petra.interaction_feature_custom_events
       WHERE interaction_feature_manifest_id = feature_id
         AND event_name = NEW.custom_event_name
         AND schema_name = NEW.custom_schema_name
         AND schema_version = NEW.custom_schema_version
         AND schema_hash = NEW.custom_schema_hash
    ) INTO enabled;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM petra.interaction_feature_standard_events
       WHERE interaction_feature_manifest_id = feature_id
         AND event_type = NEW.protocol_event_type
    ) INTO enabled;
  END IF;
  IF NOT enabled THEN
    RAISE EXCEPTION 'Interaction event is outside its exact feature manifest'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_interaction_interrupt_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_run_id text;
  event_project_id text;
  event_semantic_kind text;
  event_recorded_at timestamptz;
BEGIN
  SELECT interaction_run_id, project_id, semantic_kind, recorded_at
    INTO event_run_id, event_project_id, event_semantic_kind, event_recorded_at
    FROM petra.interaction_event_records
   WHERE interaction_event_record_id = NEW.request_event_record_id;
  IF event_run_id IS DISTINCT FROM NEW.interaction_run_id
     OR event_project_id IS DISTINCT FROM NEW.project_id
     OR event_semantic_kind IS DISTINCT FROM 'interrupt'
     OR NEW.created_at < event_recorded_at THEN
    RAISE EXCEPTION 'InteractionInterrupt must bind an interrupt event from the same run and Project'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_interaction_interrupt_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'InteractionInterrupt heads cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW.interaction_interrupt_id <> OLD.interaction_interrupt_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.interaction_run_id <> OLD.interaction_run_id
     OR NEW.interaction_run_revision <> OLD.interaction_run_revision
     OR NEW.interaction_run_hash <> OLD.interaction_run_hash
     OR NEW.request_event_record_id <> OLD.request_event_record_id
     OR NEW.request_event_sequence <> OLD.request_event_sequence
     OR NEW.request_event_hash <> OLD.request_event_hash
     OR NEW.interrupt_kind <> OLD.interrupt_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'InteractionInterrupt request identity is immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'InteractionInterrupt revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_interaction_connection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.current_attempt <> 1 THEN
      RAISE EXCEPTION 'Interaction connection must begin at attempt one'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Interaction connection history cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW.connection_id <> OLD.connection_id
     OR NEW.interaction_run_id <> OLD.interaction_run_id
     OR NEW.project_id <> OLD.project_id THEN
    RAISE EXCEPTION 'Interaction connection identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.current_attempt <> OLD.current_attempt + 1 THEN
    RAISE EXCEPTION 'Interaction connection attempt must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_interaction_interrupt_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prior_state text;
  created timestamptz;
  interrupt_head petra.interaction_interrupts%ROWTYPE;
BEGIN
  SELECT * INTO STRICT interrupt_head FROM petra.interaction_interrupts
   WHERE interaction_interrupt_id = NEW.interaction_interrupt_id;
  created := interrupt_head.created_at;
  IF NEW.payload #>> '{interaction_run_ref,interaction_run_id}' <>
       interrupt_head.interaction_run_id
     OR (NEW.payload #>> '{interaction_run_ref,revision}')::bigint <>
       interrupt_head.interaction_run_revision
     OR NEW.payload #>> '{interaction_run_ref,content_hash}' <>
       interrupt_head.interaction_run_hash
     OR NEW.payload #>> '{content,request_event_ref,interaction_event_record_id}' <>
       interrupt_head.request_event_record_id
     OR (NEW.payload #>> '{content,request_event_ref,sequence}')::bigint <>
       interrupt_head.request_event_sequence
     OR NEW.payload #>> '{content,request_event_ref,content_hash}' <>
       interrupt_head.request_event_hash
     OR NEW.payload #>> '{content,interrupt_kind}' <> interrupt_head.interrupt_kind
     OR (NEW.payload ->> 'created_at')::timestamptz <> interrupt_head.created_at
     OR NEW.payload #>> '{recorded_by,actor_id}' <> NEW.recorded_by_actor_id
     OR NEW.payload #>> '{recorded_by,actor_kind}' <> NEW.recorded_by_actor_kind
     OR NEW.payload #>> '{content,prompt_artifact_ref,artifact_id}'
       IS DISTINCT FROM NEW.prompt_artifact_id
     OR NEW.payload #>> '{content,prompt_artifact_ref,content_sha256}'
       IS DISTINCT FROM NEW.prompt_content_hash
     OR (NEW.payload #>> '{content,prompt_artifact_ref,byte_size}')::bigint
       IS DISTINCT FROM NEW.prompt_byte_size
     OR NEW.payload #>> '{content,prompt_artifact_ref,media_type}'
       IS DISTINCT FROM NEW.prompt_media_type
     OR NEW.payload #>> '{content,response_schema_ref,schema_name}'
       IS DISTINCT FROM NEW.response_schema_name
     OR NEW.payload #>> '{content,response_schema_ref,schema_version}'
       IS DISTINCT FROM NEW.response_schema_version
     OR NEW.payload #>> '{content,response_schema_ref,content_hash}'
       IS DISTINCT FROM NEW.response_schema_hash
     OR NEW.payload #>> '{content,response_artifact_ref,artifact_id}'
       IS DISTINCT FROM NEW.response_artifact_id
     OR NEW.payload #>> '{content,response_artifact_ref,content_sha256}'
       IS DISTINCT FROM NEW.response_content_hash
     OR (NEW.payload #>> '{content,response_artifact_ref,byte_size}')::bigint
       IS DISTINCT FROM NEW.response_byte_size
     OR NEW.payload #>> '{content,response_artifact_ref,media_type}'
       IS DISTINCT FROM NEW.response_media_type
     OR NEW.payload #>> '{content,responded_by,actor_id}'
       IS DISTINCT FROM NEW.responded_by_actor_id
     OR NEW.payload #>> '{content,responded_by,actor_kind}'
       IS DISTINCT FROM NEW.responded_by_actor_kind
     OR NEW.payload #>> '{content,resulting_command_ref,command_id}'
       IS DISTINCT FROM NEW.resulting_command_id
     OR NEW.payload #>> '{content,resulting_command_ref,idempotency_key}'
       IS DISTINCT FROM NEW.resulting_command_idempotency_key
     OR NEW.payload #>> '{content,resulting_command_ref,command_hash}'
       IS DISTINCT FROM NEW.resulting_command_hash
     OR NEW.payload #>> '{content,close_reason}' IS DISTINCT FROM NEW.close_reason THEN
    RAISE EXCEPTION 'InteractionInterrupt query columns must reproduce its canonical payload'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.updated_at < created THEN
    RAISE EXCEPTION 'InteractionInterrupt timestamps must be monotonic'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.revision > 1 THEN
    SELECT state INTO prior_state FROM petra.interaction_interrupt_revisions
     WHERE interaction_interrupt_id = NEW.interaction_interrupt_id
       AND revision = NEW.revision - 1;
    IF prior_state <> 'pending' THEN
      RAISE EXCEPTION 'Only one pending interrupt revision may be closed'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.payload #>> '{lineage,lineage_kind}' <> 'revision'
       OR (NEW.payload #>> '{lineage,parent_revision}')::bigint <>
         NEW.parent_revision
       OR NEW.payload #>> '{lineage,parent_hash}' <> NEW.parent_hash THEN
      RAISE EXCEPTION 'InteractionInterrupt lineage must reproduce its canonical payload'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.payload #>> '{lineage,lineage_kind}' <> 'root' THEN
    RAISE EXCEPTION 'InteractionInterrupt root lineage must be explicit'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_interaction_replay()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_head bigint;
  observed_state text;
  observed_outcome text;
  run_work_unit_id text;
BEGIN
  SELECT max(sequence) INTO event_head FROM petra.interaction_event_records
   WHERE interaction_run_id = NEW.interaction_run_id;
  event_head := coalesce(event_head, 0);
  IF NEW.after_sequence > event_head THEN
    RAISE EXCEPTION 'Replay cannot begin beyond the interaction event head'
      USING ERRCODE = '23514';
  END IF;
  SELECT state, terminal_outcome INTO observed_state, observed_outcome
    FROM petra.work_unit_revisions
   WHERE work_unit_id = NEW.observed_work_unit_id
     AND revision = NEW.observed_work_unit_revision;
  SELECT work_unit_id INTO run_work_unit_id FROM petra.interaction_runs
   WHERE interaction_run_id = NEW.interaction_run_id;
  IF run_work_unit_id IS DISTINCT FROM NEW.observed_work_unit_id THEN
    RAISE EXCEPTION 'Replay must observe the WorkUnit correlated to its run'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.observed_work_unit_status <> (CASE
      WHEN observed_state = 'completed' AND observed_outcome = 'succeeded' THEN 'succeeded'
      WHEN observed_state = 'completed' THEN 'failed'
      ELSE observed_state
    END) THEN
    RAISE EXCEPTION 'Replay WorkUnit observation does not match its exact revision'
      USING ERRCODE = '23514';
  END IF;
  IF (NEW.payload ->> 'revision')::bigint <> NEW.revision
     OR NEW.payload ->> 'content_hash' <> NEW.content_hash
     OR (NEW.payload #>> '{content,started_at}')::timestamptz <> NEW.started_at
     OR (NEW.payload #>> '{content,completed_at}')::timestamptz <> NEW.completed_at
     OR (NEW.payload #>> '{content,outcome,last_delivered_sequence}')::bigint
       IS DISTINCT FROM NEW.last_delivered_sequence
     OR NEW.payload #>> '{content,outcome,error,code}' IS DISTINCT FROM NEW.error_code
     OR NEW.payload #>> '{content,outcome,error,message}' IS DISTINCT FROM NEW.error_message
     OR NEW.payload #>> '{recorded_by,actor_id}' <> NEW.recorded_by_actor_id
     OR NEW.payload #>> '{recorded_by,actor_kind}' <> NEW.recorded_by_actor_kind
     OR (NEW.payload ->> 'recorded_at')::timestamptz <> NEW.recorded_at THEN
    RAISE EXCEPTION 'Interaction replay query columns must reproduce its canonical payload'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_interaction_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_count integer;
  actual_count integer;
  invalid_count integer;
BEGIN
  IF TG_TABLE_NAME = 'interaction_feature_manifests' THEN
    expected_count := jsonb_array_length(NEW.payload #> '{content,standard_events}');
    SELECT count(*), count(*) FILTER (
      WHERE row.event_type <> NEW.payload #>> ARRAY['content','standard_events',(row.position - 1)::text]
    ) INTO actual_count, invalid_count
      FROM petra.interaction_feature_standard_events AS row
     WHERE row.interaction_feature_manifest_id = NEW.interaction_feature_manifest_id;
    IF actual_count <> expected_count OR invalid_count <> 0 THEN
      RAISE EXCEPTION 'Feature standard-event order must reproduce the canonical payload'
        USING ERRCODE = '23514';
    END IF;
    expected_count := jsonb_array_length(NEW.payload #> '{content,custom_events}');
    SELECT count(*), count(*) FILTER (
      WHERE row.registration <> NEW.payload #> ARRAY['content','custom_events',(row.position - 1)::text]
    ) INTO actual_count, invalid_count
      FROM petra.interaction_feature_custom_events AS row
     WHERE row.interaction_feature_manifest_id = NEW.interaction_feature_manifest_id;
    IF actual_count <> expected_count OR invalid_count <> 0 THEN
      RAISE EXCEPTION 'Feature custom-event order must reproduce the canonical payload'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'interaction_run_revisions' THEN
    expected_count := coalesce(
      jsonb_array_length(NEW.payload #> '{content,lifecycle,interaction_interrupt_ids}'),
      0
    );
    SELECT count(*), count(*) FILTER (
      WHERE row.interaction_interrupt_id <>
        NEW.payload #>> ARRAY['content','lifecycle','interaction_interrupt_ids',(row.position - 1)::text]
    ) INTO actual_count, invalid_count
      FROM petra.interaction_run_revision_interrupts AS row
     WHERE row.interaction_run_id = NEW.interaction_run_id
       AND row.revision = NEW.revision;
    IF actual_count <> expected_count OR invalid_count <> 0
       OR (NEW.lifecycle_state = 'awaiting_interrupt' AND actual_count = 0)
       OR (NEW.lifecycle_state <> 'awaiting_interrupt' AND actual_count <> 0) THEN
      RAISE EXCEPTION 'InteractionRun interrupt linkage must reproduce its lifecycle payload'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'interaction_interrupt_revisions' THEN
    expected_count := jsonb_array_length(NEW.payload #> '{content,subject_refs}');
    SELECT count(*), count(*) FILTER (
      WHERE row.subject_ref <> NEW.payload #>> ARRAY['content','subject_refs',(row.position - 1)::text]
    ) INTO actual_count, invalid_count
      FROM petra.interaction_interrupt_subjects AS row
     WHERE row.interaction_interrupt_id = NEW.interaction_interrupt_id
       AND row.revision = NEW.revision;
    IF actual_count <> expected_count OR invalid_count <> 0 THEN
      RAISE EXCEPTION 'Interrupt subjects must reproduce the canonical payload'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'interaction_replay_records' THEN
    expected_count := jsonb_array_length(NEW.payload #> '{content,delivered_event_refs}');
    SELECT count(*), count(*) FILTER (
      WHERE row.sequence <> NEW.after_sequence + row.position
         OR row.interaction_event_record_id <>
            NEW.payload #>> ARRAY['content','delivered_event_refs',(row.position - 1)::text,'interaction_event_record_id']
         OR row.sequence <>
            (NEW.payload #>> ARRAY['content','delivered_event_refs',(row.position - 1)::text,'sequence'])::bigint
         OR row.content_hash <>
            NEW.payload #>> ARRAY['content','delivered_event_refs',(row.position - 1)::text,'content_hash']
         OR NOT EXISTS (
           SELECT 1 FROM petra.interaction_event_records AS event
            WHERE event.interaction_event_record_id = row.interaction_event_record_id
              AND event.interaction_run_id = NEW.interaction_run_id
         )
    ) INTO actual_count, invalid_count
      FROM petra.interaction_replay_deliveries AS row
     WHERE row.interaction_replay_record_id = NEW.interaction_replay_record_id;
    IF actual_count <> expected_count OR invalid_count <> 0 THEN
      RAISE EXCEPTION 'Replay deliveries must be the exact ordered event suffix'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.outcome_kind = 'completed' AND NEW.after_sequence + actual_count <>
       (SELECT coalesce(max(sequence), 0) FROM petra.interaction_event_records
         WHERE interaction_run_id = NEW.interaction_run_id) THEN
      RAISE EXCEPTION 'Completed replay must reach the event head' USING ERRCODE = '23514';
    END IF;
    IF NEW.outcome_kind <> 'completed' AND NEW.last_delivered_sequence <>
       NEW.after_sequence + actual_count THEN
      RAISE EXCEPTION 'Interrupted replay must report its exact last sequence'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER interaction_feature_manifests_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_feature_manifests
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_feature_standard_events_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_feature_standard_events
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_feature_custom_events_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_feature_custom_events
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE CONSTRAINT TRIGGER interaction_feature_members_are_exact
AFTER INSERT ON petra.interaction_feature_manifests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_members();

CREATE TRIGGER interaction_run_head_is_guarded
BEFORE UPDATE OR DELETE ON petra.interaction_runs
FOR EACH ROW EXECUTE FUNCTION petra.guard_interaction_run_head();
CREATE TRIGGER interaction_run_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_run_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_run_revision_is_exact
BEFORE INSERT ON petra.interaction_run_revisions
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_run_revision();
CREATE TRIGGER interaction_run_revision_interrupts_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_run_revision_interrupts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE CONSTRAINT TRIGGER interaction_run_revision_interrupts_are_exact
AFTER INSERT ON petra.interaction_run_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_members();

CREATE TRIGGER interaction_event_records_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_event_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_event_is_registered
BEFORE INSERT ON petra.interaction_event_records
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_event();

CREATE TRIGGER interaction_interrupt_head_is_guarded
BEFORE UPDATE OR DELETE ON petra.interaction_interrupts
FOR EACH ROW EXECUTE FUNCTION petra.guard_interaction_interrupt_head();
CREATE TRIGGER interaction_interrupt_head_is_exact
BEFORE INSERT ON petra.interaction_interrupts
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_interrupt_head();
CREATE TRIGGER interaction_interrupt_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_interrupt_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_interrupt_revision_is_exact
BEFORE INSERT ON petra.interaction_interrupt_revisions
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_interrupt_revision();
CREATE TRIGGER interaction_interrupt_subjects_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_interrupt_subjects
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE CONSTRAINT TRIGGER interaction_interrupt_subjects_are_exact
AFTER INSERT ON petra.interaction_interrupt_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_members();

CREATE TRIGGER interaction_connections_are_guarded
BEFORE UPDATE OR DELETE ON petra.interaction_connections
FOR EACH ROW EXECUTE FUNCTION petra.guard_interaction_connection();
CREATE TRIGGER interaction_replay_records_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_replay_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER interaction_replay_is_exact
BEFORE INSERT ON petra.interaction_replay_records
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_replay();
CREATE TRIGGER interaction_replay_deliveries_are_immutable
BEFORE UPDATE OR DELETE ON petra.interaction_replay_deliveries
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE CONSTRAINT TRIGGER interaction_replay_deliveries_are_exact
AFTER INSERT ON petra.interaction_replay_records
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_interaction_members();

CREATE INDEX interaction_runs_project_updated_idx
  ON petra.interaction_runs (project_id, current_revision, interaction_run_id);
CREATE INDEX interaction_events_run_sequence_idx
  ON petra.interaction_event_records (interaction_run_id, sequence);
CREATE INDEX interaction_events_project_recorded_idx
  ON petra.interaction_event_records (project_id, recorded_at, interaction_event_record_id);
CREATE INDEX interaction_interrupts_run_idx
  ON petra.interaction_interrupts (interaction_run_id, current_revision, interaction_interrupt_id);
CREATE INDEX interaction_replays_run_recorded_idx
  ON petra.interaction_replay_records (interaction_run_id, recorded_at, interaction_replay_record_id);
