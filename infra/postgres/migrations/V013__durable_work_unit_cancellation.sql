CREATE TABLE petra.work_unit_cancellations (
  work_unit_cancellation_id text PRIMARY KEY
    CHECK (work_unit_cancellation_id ~ '^work_unit_cancellation_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  expected_revision bigint NOT NULL CHECK (expected_revision >= 1),
  resulting_revision bigint NOT NULL CHECK (resulting_revision >= 2),
  spec_hash text NOT NULL
    CHECK (spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  protocol_thread_id text NOT NULL
    CHECK (char_length(protocol_thread_id) BETWEEN 1 AND 512),
  protocol_run_id text NOT NULL
    CHECK (char_length(protocol_run_id) BETWEEN 1 AND 512),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 4000),
  requested_by_actor_id text NOT NULL,
  requested_by_actor_kind text NOT NULL CHECK (requested_by_actor_kind = 'service'),
  capability_grant_id text NOT NULL
    CHECK (capability_grant_id ~ '^capability_grant_[0-9A-HJKMNP-TV-Z]{26}$'),
  trace_id text NOT NULL
    CHECK (trace_id ~ '^trace_[0-9A-HJKMNP-TV-Z]{26}$'),
  requested_at timestamptz NOT NULL,
  cancelled_at timestamptz NOT NULL,
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.work-unit-cancellation')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'work_unit_cancellation_id' = work_unit_cancellation_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,command,command_name}' = 'CancelWorkUnit')
    CHECK (payload #>> '{content,command,command_id}' = command_id)
    CHECK (payload #>> '{content,command,idempotency_key}' = idempotency_key)
    CHECK (payload #>> '{content,command,expected_work_unit_ref,work_unit_id}' = work_unit_id)
    CHECK ((payload #>> '{content,command,expected_work_unit_ref,revision}')::bigint = expected_revision)
    CHECK (payload #>> '{content,command,expected_work_unit_ref,spec_hash}' = spec_hash)
    CHECK (payload #>> '{content,command,interaction,protocol_thread_id}' = protocol_thread_id)
    CHECK (payload #>> '{content,command,interaction,protocol_run_id}' = protocol_run_id)
    CHECK (payload #>> '{content,command,reason}' = reason)
    CHECK (payload #>> '{content,command,requested_by,actor_id}' = requested_by_actor_id)
    CHECK (payload #>> '{content,command,requested_by,actor_kind}' = requested_by_actor_kind)
    CHECK (payload #>> '{content,command,capability_grant_id}' = capability_grant_id)
    CHECK (payload #>> '{content,command,trace_id}' = trace_id)
    CHECK ((payload #>> '{content,command,requested_at}')::timestamptz = requested_at)
    CHECK (payload #>> '{content,outcome,outcome_kind}' = 'cancelled')
    CHECK (payload #>> '{content,outcome,work_unit_ref,work_unit_id}' = work_unit_id)
    CHECK ((payload #>> '{content,outcome,work_unit_ref,revision}')::bigint = resulting_revision)
    CHECK (payload #>> '{content,outcome,work_unit_ref,spec_hash}' = spec_hash)
    CHECK ((payload #>> '{content,outcome,cancelled_at}')::timestamptz = cancelled_at)
    CHECK (payload #>> '{content,authority_boundary,effect_kind}' = 'operational_only')
    CHECK ((payload #>> '{content,authority_boundary,scientific_authority_changed}')::boolean = false)
    CHECK ((payload #>> '{content,authority_boundary,connection_abort_was_command}')::boolean = false)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  UNIQUE (work_unit_cancellation_id, work_unit_id, resulting_revision),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (requested_by_actor_id, requested_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, expected_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, resulting_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK (resulting_revision = expected_revision + 1),
  CHECK (requested_at = cancelled_at AND cancelled_at = recorded_at),
  CHECK (
    requested_by_actor_id = recorded_by_actor_id
    AND requested_by_actor_kind = recorded_by_actor_kind
  )
);

CREATE TRIGGER work_unit_cancellations_immutable
BEFORE UPDATE OR DELETE ON petra.work_unit_cancellations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
