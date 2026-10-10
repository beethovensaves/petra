-- Advisory conversation has its own immutable inputs and terminal deliveries.
-- These records do not confer domain, Review, approval, or Work authority.
CREATE TABLE petra.project_copilot_turns (
  run_id text PRIMARY KEY CHECK (run_id ~ '^run_[0-9A-HJKMNP-TV-Z]{26}$'),
  thread_id text NOT NULL CHECK (thread_id ~ '^thread_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL,
  actor_kind text NOT NULL DEFAULT 'human' CHECK (actor_kind = 'human'),
  parent_run_id text REFERENCES petra.project_copilot_turns(run_id),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'run_id' = run_id)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'actor_id' = actor_id)
    CHECK (payload ->> 'thread_id' = thread_id)
    CHECK (payload ->> 'request_hash' = request_hash)
    CHECK (NOT payload ? 'terminal'),
  started_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors(actor_id, actor_kind)
);
CREATE INDEX project_copilot_turns_by_owner
  ON petra.project_copilot_turns(project_id, actor_id, sequence);
CREATE TABLE petra.project_copilot_terminals (
  run_id text PRIMARY KEY REFERENCES petra.project_copilot_turns(run_id),
  state text NOT NULL CHECK (state IN ('completed', 'failed', 'cancelled')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'state' = state)
    CHECK ((state = 'completed') = (payload ? 'output')),
  finished_at timestamptz NOT NULL
);
CREATE TRIGGER project_copilot_turns_are_immutable
  BEFORE UPDATE OR DELETE ON petra.project_copilot_turns
  FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER project_copilot_terminals_are_immutable
  BEFORE UPDATE OR DELETE ON petra.project_copilot_terminals
  FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
