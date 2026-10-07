CREATE TABLE petra.project_copilot_input_manifests (
  run_id text PRIMARY KEY REFERENCES petra.project_copilot_turns(run_id),
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL,
  actor_kind text NOT NULL DEFAULT 'human' CHECK (actor_kind='human'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload->>'schema_name'='petra.copilot-input-manifest')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload->>'content_hash'=content_hash)
    CHECK (payload#>>'{content,run_id}'=run_id)
    CHECK (payload#>>'{content,project_id}'=project_id)
    CHECK (payload#>>'{content,actor_id}'=actor_id),
  prepared_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind)
);
CREATE TRIGGER project_copilot_input_manifests_immutable BEFORE UPDATE OR DELETE ON petra.project_copilot_input_manifests FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
