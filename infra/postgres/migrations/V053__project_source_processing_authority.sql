CREATE TABLE petra.project_source_processing_commands (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^source_processing_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  project_id text NOT NULL,
  project_source_id text NOT NULL,
  work_unit_id text NOT NULL UNIQUE
    CHECK (work_unit_id ~ '^work_unit_[0-9A-HJKMNP-TV-Z]{26}$'),
  request_hash text NOT NULL
    CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL
    CHECK (jsonb_typeof(request_payload) = 'object'),
  work_unit_payload jsonb NOT NULL
    CHECK (jsonb_typeof(work_unit_payload) = 'object'),
  input_manifest_payload jsonb NOT NULL
    CHECK (jsonb_typeof(input_manifest_payload) = 'object'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  requested_at timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'completed')),
  receipt_payload jsonb,
  receipt_record_hash text,
  completed_at timestamptz,
  CHECK (
    (state = 'pending' AND receipt_payload IS NULL
      AND receipt_record_hash IS NULL AND completed_at IS NULL)
    OR
    (state = 'completed' AND jsonb_typeof(receipt_payload) = 'object'
      AND receipt_record_hash ~ '^sha256:[0-9a-f]{64}$'
      AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (project_id, project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id)
    REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE UNIQUE INDEX project_source_processing_one_work_per_source
  ON petra.project_source_processing_commands (project_id, project_source_id);

CREATE FUNCTION petra.prevent_project_source_processing_command_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project source processing commands cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.state = 'completed' THEN
    RAISE EXCEPTION 'completed project source processing commands are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.receipt_id <> OLD.receipt_id
     OR NEW.command_id <> OLD.command_id
     OR NEW.idempotency_key <> OLD.idempotency_key
     OR NEW.project_id <> OLD.project_id
     OR NEW.project_source_id <> OLD.project_source_id
     OR NEW.work_unit_id <> OLD.work_unit_id
     OR NEW.request_hash <> OLD.request_hash
     OR NEW.request_payload <> OLD.request_payload
     OR NEW.work_unit_payload <> OLD.work_unit_payload
     OR NEW.input_manifest_payload <> OLD.input_manifest_payload
     OR NEW.actor_id <> OLD.actor_id
     OR NEW.actor_kind <> OLD.actor_kind
     OR NEW.capability_grant_id <> OLD.capability_grant_id
     OR NEW.requested_at <> OLD.requested_at
     OR NEW.state <> 'completed'
     OR NEW.receipt_payload IS NULL
     OR NEW.receipt_record_hash IS NULL
     OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'pending project source processing command may only finalize once'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_source_processing_command_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_processing_commands
FOR EACH ROW EXECUTE FUNCTION petra.prevent_project_source_processing_command_mutation();
