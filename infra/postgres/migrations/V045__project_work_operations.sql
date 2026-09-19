ALTER TABLE petra.capability_grants
  DROP CONSTRAINT capability_grants_allowed_commands_check,
  ADD CONSTRAINT capability_grants_allowed_commands_check CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet',
      'RecordApproval',
      'ApplyChangeSet',
      'ExcludeProjectSource',
      'RestoreProjectSource',
      'CreateProjectSourceReplacement',
      'RetractProjectSourceReplacement',
      'InvokeSuggestedAction',
      'DeferReviewSession',
      'ReopenReviewSession',
      'RefreshReviewSession',
      'CorrectReviewCandidate',
      'ReviseReviewCandidateBasis',
      'SeparateReviewSessionMember',
      'ManageProjectWork'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0'
    )
  );

CREATE TABLE petra.project_work_input_requests (
  input_request_id text PRIMARY KEY
    CHECK (input_request_id ~ '^work_input_request_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  expected_work_unit_revision bigint NOT NULL CHECK (expected_work_unit_revision >= 1),
  request_kind text NOT NULL CHECK (
    request_kind IN ('clarification', 'capability', 'budget', 'validation_judgment')
  ),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 4000),
  response_options jsonb NOT NULL CHECK (
    jsonb_typeof(response_options) = 'array'
    AND jsonb_array_length(response_options) BETWEEN 1 AND 20
  ),
  consequence text NOT NULL CHECK (char_length(consequence) BETWEEN 1 AND 4000),
  state text NOT NULL CHECK (state IN ('pending', 'answered', 'superseded')),
  registered_at timestamptz NOT NULL,
  answered_at timestamptz,
  answer_command_id text UNIQUE,
  CHECK (
    (state = 'pending' AND answered_at IS NULL AND answer_command_id IS NULL)
    OR (state = 'answered' AND answered_at IS NOT NULL AND answer_command_id IS NOT NULL)
    OR (state = 'superseded' AND answer_command_id IS NULL)
  ),
  UNIQUE (input_request_id, revision),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, expected_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_work_input_responses (
  input_request_id text NOT NULL,
  input_request_revision bigint NOT NULL,
  command_id text PRIMARY KEY
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  response text NOT NULL CHECK (char_length(response) BETWEEN 1 AND 4000),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (input_request_id, input_request_revision)
    REFERENCES petra.project_work_input_requests (input_request_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_input_responses_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_input_responses
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_work_plan_heads (
  work_unit_id text PRIMARY KEY,
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  selected_priority text NOT NULL CHECK (
    selected_priority IN ('user_blocking', 'user_visible', 'normal', 'opportunistic')
  ),
  latest_instruction text CHECK (
    latest_instruction IS NULL OR char_length(latest_instruction) BETWEEN 1 AND 4000
  ),
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_work_plan_revisions (
  work_unit_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  operation text NOT NULL CHECK (operation IN ('steer', 'prioritize')),
  selected_priority text NOT NULL CHECK (
    selected_priority IN ('user_blocking', 'user_visible', 'normal', 'opportunistic')
  ),
  instruction text CHECK (
    instruction IS NULL OR char_length(instruction) BETWEEN 1 AND 4000
  ),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (work_unit_id, revision),
  FOREIGN KEY (work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (operation = 'steer' AND instruction IS NOT NULL)
    OR (operation = 'prioritize' AND instruction IS NULL)
  )
);

CREATE TRIGGER project_work_plan_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_plan_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

ALTER TABLE petra.project_work_plan_heads
  ADD CONSTRAINT project_work_plan_heads_current_revision_fkey
  FOREIGN KEY (work_unit_id, current_revision)
  REFERENCES petra.project_work_plan_revisions (work_unit_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.project_work_operation_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^project_work_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  operation text NOT NULL CHECK (
    operation IN ('start', 'answer_input', 'steer', 'prioritize', 'cancel', 'retry')
  ),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL CHECK (jsonb_typeof(request_payload) = 'object'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'completed')),
  receipt_payload jsonb,
  recorded_at timestamptz NOT NULL,
  completed_at timestamptz,
  CHECK (
    (state = 'pending' AND receipt_payload IS NULL AND completed_at IS NULL)
    OR (state = 'completed' AND receipt_payload IS NOT NULL AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_project_work_operation_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.state = 'completed' THEN
    RAISE EXCEPTION 'project_work_operation_receipts rows are immutable after completion'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.state <> 'completed'
     OR ROW(
       NEW.receipt_id, NEW.command_id, NEW.idempotency_key, NEW.project_id,
       NEW.work_unit_id, NEW.operation, NEW.request_hash, NEW.request_payload,
       NEW.actor_id, NEW.actor_kind, NEW.capability_grant_id, NEW.recorded_at
     ) IS DISTINCT FROM ROW(
       OLD.receipt_id, OLD.command_id, OLD.idempotency_key, OLD.project_id,
       OLD.work_unit_id, OLD.operation, OLD.request_hash, OLD.request_payload,
       OLD.actor_id, OLD.actor_kind, OLD.capability_grant_id, OLD.recorded_at
     ) THEN
    RAISE EXCEPTION 'project_work_operation_receipts permit only pending-to-completed finalization'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_work_operation_receipts_finalize_once
BEFORE UPDATE OR DELETE ON petra.project_work_operation_receipts
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_work_operation_receipt_mutation();

CREATE INDEX project_work_input_requests_work_idx
  ON petra.project_work_input_requests (project_id, work_unit_id, state, input_request_id);
CREATE INDEX project_work_operation_receipts_work_idx
  ON petra.project_work_operation_receipts (project_id, work_unit_id, recorded_at, command_id);

COMMENT ON TABLE petra.project_work_operation_receipts IS
  'Idempotent authenticated Work operation ledger. Pending rows preserve unknown-effect reconciliation; completed payloads are immutable command results.';
