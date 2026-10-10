-- An intake has an authenticated owner and acknowledged policy, without a
-- placeholder Project. Creation binds it only through the human-reviewed owner.
CREATE TABLE petra.intake_copilot_sessions (
  intake_session_id text PRIMARY KEY CHECK (intake_session_id ~ '^intake_session_[0-9A-HJKMNP-TV-Z]{26}$'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL DEFAULT 'human' CHECK (actor_kind='human'),
  thread_id text NOT NULL UNIQUE CHECK (thread_id ~ '^thread_[0-9A-HJKMNP-TV-Z]{26}$'),
  policy_hash text NOT NULL CHECK (policy_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.intake-copilot-session')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload#>>'{content,intake_session_id}'=intake_session_id)
    CHECK (payload#>>'{content,actor_id}'=actor_id)
    CHECK (payload#>>'{content,thread_id}'=thread_id)
    CHECK (payload#>>'{content,policy_hash}'=policy_hash)
    CHECK (payload#>>'{content,consent,accepted_policy_hash}'=policy_hash)
    CHECK (payload#>>'{content,consent,accepted_by}'=actor_id)
    CHECK (NOT ((payload->'content') ? 'project_id')),
  opened_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind)
);
CREATE INDEX intake_copilot_sessions_by_owner ON petra.intake_copilot_sessions(actor_id,opened_at DESC);
CREATE TABLE petra.intake_copilot_turns (
  run_id text PRIMARY KEY CHECK (run_id ~ '^run_[0-9A-HJKMNP-TV-Z]{26}$'),
  intake_session_id text NOT NULL REFERENCES petra.intake_copilot_sessions(intake_session_id),
  actor_id text NOT NULL,
  parent_run_id text REFERENCES petra.intake_copilot_turns(run_id),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.intake-copilot-turn')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload->>'run_id'=run_id)
    CHECK (payload->>'intake_session_id'=intake_session_id)
    CHECK (payload->>'actor_id'=actor_id)
    CHECK (payload->>'request_hash'=request_hash)
    CHECK (NOT (payload ? 'terminal')) CHECK (NOT (payload ? 'input_manifest')) CHECK (NOT (payload ? 'project_id')),
  started_at timestamptz NOT NULL
);
CREATE INDEX intake_copilot_turns_by_session ON petra.intake_copilot_turns(intake_session_id,sequence);
CREATE TABLE petra.intake_copilot_terminals (
  run_id text PRIMARY KEY REFERENCES petra.intake_copilot_turns(run_id),
  state text NOT NULL CHECK (state IN ('completed','failed','cancelled')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'state'=state) CHECK ((state='completed')=(payload ? 'output')),
  finished_at timestamptz NOT NULL
);
CREATE TABLE petra.intake_copilot_input_manifests (
  run_id text PRIMARY KEY REFERENCES petra.intake_copilot_turns(run_id),
  intake_session_id text NOT NULL REFERENCES petra.intake_copilot_sessions(intake_session_id),
  actor_id text NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.intake-copilot-input-manifest')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload#>>'{content,run_id}'=run_id)
    CHECK (payload#>>'{content,intake_session_id}'=intake_session_id)
    CHECK (payload#>>'{content,actor_id}'=actor_id),
  prepared_at timestamptz NOT NULL
);
CREATE TABLE petra.intake_copilot_definition_drafts (
  intake_session_id text NOT NULL REFERENCES petra.intake_copilot_sessions(intake_session_id),
  draft_hash text NOT NULL CHECK (draft_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.project-definition-draft-view'),
  selected_at timestamptz NOT NULL,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  PRIMARY KEY (intake_session_id,draft_hash)
);
CREATE TABLE petra.intake_project_bindings (
  intake_session_id text PRIMARY KEY REFERENCES petra.intake_copilot_sessions(intake_session_id),
  project_id text NOT NULL UNIQUE REFERENCES petra.projects(project_id),
  creation_command_id text NOT NULL UNIQUE REFERENCES petra.project_definition_draft_command_receipts(command_id),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.intake-project-binding')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload#>>'{content,intake_session_ref,record_id}'=intake_session_id)
    CHECK (payload#>>'{content,project_id}'=project_id)
    CHECK (payload#>>'{content,creation_command_id}'=creation_command_id),
  bound_at timestamptz NOT NULL
);
CREATE TRIGGER intake_copilot_sessions_immutable BEFORE UPDATE OR DELETE ON petra.intake_copilot_sessions FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER intake_copilot_turns_immutable BEFORE UPDATE OR DELETE ON petra.intake_copilot_turns FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER intake_copilot_terminals_immutable BEFORE UPDATE OR DELETE ON petra.intake_copilot_terminals FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER intake_copilot_input_manifests_immutable BEFORE UPDATE OR DELETE ON petra.intake_copilot_input_manifests FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER intake_copilot_definition_drafts_immutable BEFORE UPDATE OR DELETE ON petra.intake_copilot_definition_drafts FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER intake_project_bindings_immutable BEFORE UPDATE OR DELETE ON petra.intake_project_bindings FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
