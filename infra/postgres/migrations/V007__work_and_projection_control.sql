ALTER TABLE petra.artifacts
  ADD CONSTRAINT artifacts_exact_input_identity_key
  UNIQUE (artifact_id, content_hash, byte_size);

CREATE FUNCTION petra.guard_work_unit_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'WorkUnits cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW.work_unit_id <> OLD.work_unit_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.idempotency_key <> OLD.idempotency_key
     OR NEW.registration_hash <> OLD.registration_hash
     OR NEW.spec_hash <> OLD.spec_hash
     OR NEW.input_manifest_id <> OLD.input_manifest_id
     OR NEW.input_manifest_hash <> OLD.input_manifest_hash
     OR NEW.workflow_name <> OLD.workflow_name
     OR NEW.workflow_version <> OLD.workflow_version
     OR NEW.objective <> OLD.objective
     OR NEW.work_mode <> OLD.work_mode
     OR NEW.priority <> OLD.priority
     OR NEW.cache_mode <> OLD.cache_mode
     OR NEW.cache_key IS DISTINCT FROM OLD.cache_key
     OR NEW.cancellation_policy <> OLD.cancellation_policy
     OR NEW.checkpoint_policy <> OLD.checkpoint_policy
     OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
     OR NEW.capability_grant_id <> OLD.capability_grant_id
     OR NEW.trace_id <> OLD.trace_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'WorkUnit identity and specification are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'WorkUnit revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.work_units (
  work_unit_id text PRIMARY KEY
    CHECK (work_unit_id ~ '^work_unit_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  idempotency_key text NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  registration_hash text NOT NULL
    CHECK (registration_hash ~ '^sha256:[0-9a-f]{64}$'),
  spec_hash text NOT NULL
    CHECK (spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  input_manifest_id text NOT NULL UNIQUE
    CHECK (input_manifest_id ~ '^worker_input_manifest_[0-9A-HJKMNP-TV-Z]{26}$'),
  input_manifest_hash text NOT NULL
    CHECK (input_manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  workflow_name text NOT NULL,
  workflow_version text NOT NULL,
  objective text NOT NULL CHECK (char_length(objective) BETWEEN 1 AND 4000),
  work_mode text NOT NULL
    CHECK (work_mode IN ('interactive', 'foreground', 'background', 'batch')),
  priority text NOT NULL
    CHECK (priority IN ('user_blocking', 'user_visible', 'normal', 'opportunistic')),
  cache_mode text NOT NULL CHECK (cache_mode IN ('reuse_exact', 'refresh', 'disabled')),
  cache_key text,
  cancellation_policy text NOT NULL
    CHECK (cancellation_policy IN ('cancellable', 'checkpoint_then_cancel', 'atomic')),
  checkpoint_policy text NOT NULL
    CHECK (checkpoint_policy IN ('disabled', 'latest_valid', 'all_valid')),
  deadline_at timestamptz,
  capability_grant_id text NOT NULL
    CHECK (capability_grant_id ~ '^capability_grant_[0-9A-HJKMNP-TV-Z]{26}$'),
  trace_id text NOT NULL
    CHECK (trace_id ~ '^trace_[0-9A-HJKMNP-TV-Z]{26}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (work_unit_id, project_id, spec_hash, input_manifest_id),
  UNIQUE (
    work_unit_id, project_id, input_manifest_id, input_manifest_hash,
    created_by_actor_id, created_by_actor_kind
  ),
  CHECK (
    (cache_mode = 'disabled' AND cache_key IS NULL)
    OR (cache_mode IN ('reuse_exact', 'refresh') AND cache_key IS NOT NULL)
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.worker_input_manifests (
  worker_input_manifest_id text PRIMARY KEY
    CHECK (worker_input_manifest_id ~ '^worker_input_manifest_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  work_unit_id text NOT NULL UNIQUE,
  project_id text NOT NULL,
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  task_family text NOT NULL CHECK (
    task_family IN (
      'ingestion', 'document_processing', 'scientific_extraction',
      'retrieval', 'reasoning', 'scientific_computation',
      'experiment_execution', 'projection', 'maintenance'
    )
  ),
  task_name text NOT NULL,
  task_version text NOT NULL,
  executor_kind text NOT NULL
    CHECK (executor_kind IN ('python_worker', 'typescript_worker', 'sandbox')),
  worker_name text NOT NULL,
  worker_version text NOT NULL,
  runtime_name text NOT NULL,
  runtime_version text NOT NULL,
  entrypoint text NOT NULL,
  max_wall_time_ms bigint NOT NULL CHECK (max_wall_time_ms >= 1),
  max_output_bytes bigint NOT NULL CHECK (max_output_bytes >= 1),
  max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 100),
  max_parallelism integer NOT NULL CHECK (max_parallelism >= 1),
  resource_limits jsonb NOT NULL CHECK (jsonb_typeof(resource_limits) = 'object'),
  network_mode text NOT NULL CHECK (network_mode IN ('blocked', 'allowlist')),
  network_policy jsonb NOT NULL CHECK (jsonb_typeof(network_policy) = 'object'),
  partial_result_policy text NOT NULL
    CHECK (partial_result_policy IN ('discard', 'retain_declared', 'retain_diagnostics')),
  issued_by_actor_id text NOT NULL,
  issued_by_actor_kind text NOT NULL,
  issued_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.worker-input-manifest')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'worker_input_manifest_id' = worker_input_manifest_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'work_unit_id' = work_unit_id)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{content,task,task_family}' = task_family)
    CHECK (payload #>> '{content,task,task_name}' = task_name)
    CHECK (payload #>> '{content,task,task_version}' = task_version)
    CHECK (payload #>> '{content,worker,executor_kind}' = executor_kind)
    CHECK (payload #>> '{content,worker,worker_name}' = worker_name)
    CHECK (payload #>> '{content,worker,worker_version}' = worker_version)
    CHECK (payload #>> '{content,worker,runtime_name}' = runtime_name)
    CHECK (payload #>> '{content,worker,runtime_version}' = runtime_version)
    CHECK (payload #>> '{content,worker,entrypoint}' = entrypoint)
    CHECK (payload #> '{content,resource_limits}' = resource_limits)
    CHECK ((payload #>> '{content,resource_limits,max_wall_time_ms}')::bigint = max_wall_time_ms)
    CHECK ((payload #>> '{content,resource_limits,max_output_bytes}')::bigint = max_output_bytes)
    CHECK ((payload #>> '{content,resource_limits,max_attempts}')::integer = max_attempts)
    CHECK ((payload #>> '{content,resource_limits,max_parallelism}')::integer = max_parallelism)
    CHECK (payload #>> '{content,network_policy,network_mode}' = network_mode)
    CHECK (payload #> '{content,network_policy}' = network_policy)
    CHECK (payload #>> '{content,partial_result_policy}' = partial_result_policy)
    CHECK (payload #>> '{issued_by,actor_id}' = issued_by_actor_id)
    CHECK (payload #>> '{issued_by,actor_kind}' = issued_by_actor_kind)
    CHECK ((payload ->> 'issued_at')::timestamptz = issued_at),
  UNIQUE (
    worker_input_manifest_id, content_hash, work_unit_id, project_id
  ),
  FOREIGN KEY (work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    work_unit_id, project_id, worker_input_manifest_id, content_hash,
    issued_by_actor_id, issued_by_actor_kind
  ) REFERENCES petra.work_units (
    work_unit_id, project_id, input_manifest_id, input_manifest_hash,
    created_by_actor_id, created_by_actor_kind
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (issued_by_actor_id, issued_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.work_units
  ADD CONSTRAINT work_units_input_manifest_fkey
  FOREIGN KEY (input_manifest_id)
  REFERENCES petra.worker_input_manifests (worker_input_manifest_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.work_unit_dependencies (
  work_unit_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  dependency_work_unit_id text NOT NULL,
  PRIMARY KEY (work_unit_id, position),
  UNIQUE (work_unit_id, dependency_work_unit_id),
  FOREIGN KEY (work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (dependency_work_unit_id) REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK (work_unit_id <> dependency_work_unit_id)
);

CREATE TABLE petra.worker_input_bindings (
  worker_input_manifest_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  binding_kind text NOT NULL CHECK (binding_kind IN ('artifact', 'record')),
  binding_name text NOT NULL,
  artifact_id text,
  artifact_content_hash text,
  artifact_byte_size bigint,
  record_id text,
  record_revision bigint,
  snapshot_hash text,
  binding jsonb NOT NULL CHECK (jsonb_typeof(binding) = 'object'),
  PRIMARY KEY (worker_input_manifest_id, position),
  UNIQUE (worker_input_manifest_id, binding_name),
  FOREIGN KEY (worker_input_manifest_id)
    REFERENCES petra.worker_input_manifests (worker_input_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, artifact_content_hash, artifact_byte_size)
    REFERENCES petra.artifacts (artifact_id, content_hash, byte_size)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (binding_kind = 'artifact'
      AND artifact_id IS NOT NULL
      AND artifact_content_hash IS NOT NULL
      AND artifact_byte_size IS NOT NULL
      AND record_id IS NULL AND record_revision IS NULL AND snapshot_hash IS NULL)
    OR (binding_kind = 'record'
      AND artifact_id IS NULL
      AND artifact_content_hash IS NULL
      AND artifact_byte_size IS NULL
      AND record_id IS NOT NULL
      AND record_revision >= 1
      AND snapshot_hash IS NOT NULL)
  )
);

CREATE TABLE petra.worker_expected_outputs (
  worker_input_manifest_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  output_name text NOT NULL,
  output_role text NOT NULL CHECK (
    output_role IN ('result', 'proposal', 'diagnostic', 'log', 'metrics', 'checkpoint')
  ),
  required boolean NOT NULL,
  media_type text NOT NULL,
  max_bytes bigint NOT NULL CHECK (max_bytes >= 1),
  contract jsonb,
  declaration jsonb NOT NULL CHECK (jsonb_typeof(declaration) = 'object'),
  PRIMARY KEY (worker_input_manifest_id, position),
  UNIQUE (worker_input_manifest_id, output_name),
  FOREIGN KEY (worker_input_manifest_id)
    REFERENCES petra.worker_input_manifests (worker_input_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.worker_output_manifests (
  worker_output_manifest_id text PRIMARY KEY
    CHECK (worker_output_manifest_id ~ '^worker_output_manifest_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  work_unit_id text NOT NULL,
  project_id text NOT NULL,
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 100),
  worker_input_manifest_id text NOT NULL,
  worker_input_manifest_hash text NOT NULL,
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  outcome_kind text NOT NULL CHECK (
    outcome_kind IN (
      'succeeded', 'worker_failed', 'resource_exhausted', 'timed_out', 'cancelled'
    )
  ),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  reported_at timestamptz NOT NULL,
  failure jsonb,
  resource_usage jsonb NOT NULL CHECK (jsonb_typeof(resource_usage) = 'object'),
  network_activity jsonb NOT NULL CHECK (jsonb_typeof(network_activity) = 'array'),
  diagnostics jsonb NOT NULL CHECK (jsonb_typeof(diagnostics) = 'array'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.worker-output-manifest')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'worker_output_manifest_id' = worker_output_manifest_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'work_unit_id' = work_unit_id)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK ((payload ->> 'attempt')::integer = attempt)
    CHECK (payload ->> 'worker_input_manifest_id' = worker_input_manifest_id)
    CHECK (payload ->> 'worker_input_manifest_hash' = worker_input_manifest_hash)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{content,outcome,outcome_kind}' = outcome_kind)
    CHECK ((payload #>> '{content,started_at}')::timestamptz = started_at)
    CHECK ((payload #>> '{content,completed_at}')::timestamptz = completed_at)
    CHECK ((payload ->> 'reported_at')::timestamptz = reported_at)
    CHECK (payload #> '{content,resource_usage}' = resource_usage)
    CHECK (payload #> '{content,network_activity}' = network_activity)
    CHECK (payload #> '{content,diagnostics}' = diagnostics),
  UNIQUE (work_unit_id, attempt),
  UNIQUE (worker_output_manifest_id, work_unit_id),
  FOREIGN KEY (
    worker_input_manifest_id, worker_input_manifest_hash, work_unit_id, project_id
  ) REFERENCES petra.worker_input_manifests (
    worker_input_manifest_id, content_hash, work_unit_id, project_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (completed_at >= started_at AND reported_at >= completed_at),
  CHECK (failure IS NOT DISTINCT FROM payload #> '{content,outcome,failure}'),
  CHECK (
    (outcome_kind = 'succeeded' AND failure IS NULL)
    OR (outcome_kind <> 'succeeded' AND failure IS NOT NULL)
  )
);

CREATE TABLE petra.worker_produced_outputs (
  worker_output_manifest_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  output_name text NOT NULL,
  output_role text NOT NULL CHECK (
    output_role IN ('result', 'proposal', 'diagnostic', 'log', 'metrics', 'checkpoint')
  ),
  output_handle text NOT NULL,
  content_hash text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  media_type text NOT NULL,
  contract jsonb,
  produced_output jsonb NOT NULL CHECK (jsonb_typeof(produced_output) = 'object'),
  PRIMARY KEY (worker_output_manifest_id, position),
  UNIQUE (worker_output_manifest_id, output_name),
  UNIQUE (worker_output_manifest_id, output_handle),
  FOREIGN KEY (worker_output_manifest_id)
    REFERENCES petra.worker_output_manifests (worker_output_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.work_unit_revisions (
  work_unit_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  spec_hash text NOT NULL,
  input_manifest_id text NOT NULL,
  state text NOT NULL CHECK (
    state IN ('requested', 'queued', 'running', 'completed', 'cancelled')
  ),
  terminal_outcome text CHECK (
    terminal_outcome IS NULL OR terminal_outcome IN (
      'succeeded', 'worker_failed', 'validation_failed',
      'resource_exhausted', 'timed_out', 'cancelled'
    )
  ),
  attempt integer NOT NULL CHECK (attempt BETWEEN 0 AND 100),
  output_manifest_id text,
  failure jsonb,
  status jsonb NOT NULL CHECK (jsonb_typeof(status) = 'object'),
  updated_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.work-unit')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'work_unit_id' = work_unit_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload ->> 'spec_hash' = spec_hash)
    CHECK (payload #>> '{spec,input_manifest_ref,worker_input_manifest_id}' = input_manifest_id)
    CHECK (payload #>> '{status,state}' = state)
    CHECK (payload -> 'status' = status)
    CHECK (COALESCE(payload #>> '{status,terminal_outcome}', '') = COALESCE(terminal_outcome, ''))
    CHECK (COALESCE((payload #>> '{status,attempt}')::integer, 0) = attempt)
    CHECK (COALESCE(payload #>> '{status,output_manifest_ref,worker_output_manifest_id}', '') = COALESCE(output_manifest_id, ''))
    CHECK (failure IS NOT DISTINCT FROM payload #> '{status,failure}')
    CHECK ((payload ->> 'updated_at')::timestamptz = updated_at),
  PRIMARY KEY (work_unit_id, revision),
  UNIQUE (work_unit_id, project_id, revision),
  FOREIGN KEY (work_unit_id, project_id, spec_hash, input_manifest_id)
    REFERENCES petra.work_units (
      work_unit_id, project_id, spec_hash, input_manifest_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
      DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (output_manifest_id, work_unit_id)
    REFERENCES petra.worker_output_manifests (
      worker_output_manifest_id, work_unit_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (state IN ('requested', 'queued')
      AND terminal_outcome IS NULL AND attempt = 0
      AND output_manifest_id IS NULL AND failure IS NULL)
    OR (state = 'running'
      AND terminal_outcome IS NULL AND attempt >= 1
      AND output_manifest_id IS NULL AND failure IS NULL)
    OR (state = 'completed'
      AND terminal_outcome = 'succeeded' AND attempt >= 1
      AND output_manifest_id IS NOT NULL AND failure IS NULL)
    OR (state = 'completed'
      AND terminal_outcome IN (
        'worker_failed', 'validation_failed', 'resource_exhausted', 'timed_out'
      )
      AND attempt >= 1 AND failure IS NOT NULL)
    OR (state = 'cancelled'
      AND terminal_outcome = 'cancelled' AND failure IS NULL)
  )
);

ALTER TABLE petra.work_units
  ADD CONSTRAINT work_units_current_revision_fkey
  FOREIGN KEY (work_unit_id, project_id, current_revision)
  REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.guard_work_unit_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE head petra.work_units%ROWTYPE;
BEGIN
  SELECT * INTO head FROM petra.work_units
   WHERE work_unit_id = NEW.work_unit_id;
  IF head.work_unit_id IS NULL THEN
    RAISE EXCEPTION 'WorkUnit revision requires its stable head'
      USING ERRCODE = '23503';
  END IF;
  IF (NEW.revision = 1 AND head.current_revision <> 1)
     OR (NEW.revision > 1 AND NEW.revision <> head.current_revision + 1) THEN
    RAISE EXCEPTION 'WorkUnit revision is not contiguous with its head'
      USING ERRCODE = '40001';
  END IF;
  IF NEW.payload #>> '{spec,workflow_name}' IS DISTINCT FROM head.workflow_name
     OR NEW.payload #>> '{spec,workflow_version}' IS DISTINCT FROM head.workflow_version
     OR NEW.payload #>> '{spec,objective}' IS DISTINCT FROM head.objective
     OR NEW.payload #>> '{spec,work_mode}' IS DISTINCT FROM head.work_mode
     OR NEW.payload #>> '{spec,priority}' IS DISTINCT FROM head.priority
     OR NEW.payload #>> '{spec,input_manifest_ref,content_hash}'
       IS DISTINCT FROM head.input_manifest_hash
     OR NEW.payload #>> '{spec,idempotency_key}' IS DISTINCT FROM head.idempotency_key
     OR NEW.payload #>> '{spec,cache,cache_mode}' IS DISTINCT FROM head.cache_mode
     OR NEW.payload #>> '{spec,cache,cache_key}' IS DISTINCT FROM head.cache_key
     OR NEW.payload #>> '{spec,cancellation_policy}'
       IS DISTINCT FROM head.cancellation_policy
     OR NEW.payload #>> '{spec,checkpoint_policy}'
       IS DISTINCT FROM head.checkpoint_policy
     OR (NEW.payload #>> '{spec,deadline_at}')::timestamptz
       IS DISTINCT FROM head.deadline_at
     OR NEW.payload ->> 'capability_grant_id' IS DISTINCT FROM head.capability_grant_id
     OR NEW.payload ->> 'trace_id' IS DISTINCT FROM head.trace_id
     OR NEW.payload #>> '{created_by,actor_id}'
       IS DISTINCT FROM head.created_by_actor_id
     OR NEW.payload #>> '{created_by,actor_kind}'
       IS DISTINCT FROM head.created_by_actor_kind
     OR (NEW.payload ->> 'created_at')::timestamptz
       IS DISTINCT FROM head.created_at THEN
    RAISE EXCEPTION 'WorkUnit revision differs from its immutable specification'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_work_unit_dependency_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_id text;
BEGIN
  SELECT revision.payload #>> ARRAY[
           'spec', 'dependency_work_unit_ids', (NEW.position - 1)::text
         ]
    INTO expected_id
    FROM petra.work_unit_revisions AS revision
   WHERE revision.work_unit_id = NEW.work_unit_id AND revision.revision = 1;
  IF expected_id IS DISTINCT FROM NEW.dependency_work_unit_id THEN
    RAISE EXCEPTION 'WorkUnit dependency order differs from canonical specification'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_worker_input_binding_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_member jsonb;
BEGIN
  SELECT payload #> ARRAY['content', 'inputs', (NEW.position - 1)::text]
    INTO expected_member
    FROM petra.worker_input_manifests
   WHERE worker_input_manifest_id = NEW.worker_input_manifest_id;
  IF expected_member IS NULL OR expected_member IS DISTINCT FROM NEW.binding THEN
    RAISE EXCEPTION 'Worker input binding order differs from canonical manifest'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_worker_expected_output_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_member jsonb;
BEGIN
  SELECT payload #> ARRAY[
           'content', 'expected_outputs', (NEW.position - 1)::text
         ]
    INTO expected_member
    FROM petra.worker_input_manifests
   WHERE worker_input_manifest_id = NEW.worker_input_manifest_id;
  IF expected_member IS NULL OR expected_member IS DISTINCT FROM NEW.declaration THEN
    RAISE EXCEPTION 'Worker expected output order differs from canonical manifest'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_worker_output_member_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_member jsonb;
BEGIN
  SELECT payload #> ARRAY[
           'content', 'outcome', 'produced_outputs', (NEW.position - 1)::text
         ]
    INTO expected_member
    FROM petra.worker_output_manifests
   WHERE worker_output_manifest_id = NEW.worker_output_manifest_id;
  IF expected_member IS NULL OR expected_member IS DISTINCT FROM NEW.produced_output THEN
    RAISE EXCEPTION 'Worker output order differs from canonical manifest'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_work_unit_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_dependencies bigint;
BEGIN
  SELECT jsonb_array_length(payload #> '{spec,dependency_work_unit_ids}')
    INTO expected_dependencies
    FROM petra.work_unit_revisions
   WHERE work_unit_id = NEW.work_unit_id AND revision = 1;
  IF expected_dependencies IS DISTINCT FROM (
    SELECT count(*) FROM petra.work_unit_dependencies
     WHERE work_unit_id = NEW.work_unit_id
  ) THEN
    RAISE EXCEPTION 'WorkUnit dependencies are incomplete'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_worker_input_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF jsonb_array_length(NEW.payload #> '{content,inputs}') IS DISTINCT FROM (
    SELECT count(*) FROM petra.worker_input_bindings
     WHERE worker_input_manifest_id = NEW.worker_input_manifest_id
  ) OR jsonb_array_length(NEW.payload #> '{content,expected_outputs}') IS DISTINCT FROM (
    SELECT count(*) FROM petra.worker_expected_outputs
     WHERE worker_input_manifest_id = NEW.worker_input_manifest_id
  ) THEN
    RAISE EXCEPTION 'Worker input manifest members are incomplete'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_worker_output_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF jsonb_array_length(NEW.payload #> '{content,outcome,produced_outputs}')
     IS DISTINCT FROM (
       SELECT count(*) FROM petra.worker_produced_outputs
        WHERE worker_output_manifest_id = NEW.worker_output_manifest_id
     ) THEN
    RAISE EXCEPTION 'Worker output manifest members are incomplete'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE petra.outbox_records
  ADD CONSTRAINT outbox_records_projection_reference_key
  UNIQUE (
    outbox_id, outbox_position, target, target_sequence, partition_key, event_id
  );

CREATE FUNCTION petra.guard_projection_checkpoint_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Projection checkpoints cannot be deleted'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.projection_checkpoint_id <> OLD.projection_checkpoint_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.projection_name <> OLD.projection_name
     OR NEW.projection_version <> OLD.projection_version
     OR NEW.configuration_hash <> OLD.configuration_hash THEN
    RAISE EXCEPTION 'Projection checkpoint identity is immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'Projection checkpoint revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.projection_checkpoints (
  projection_checkpoint_id text PRIMARY KEY
    CHECK (projection_checkpoint_id ~ '^projection_checkpoint_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  target text NOT NULL DEFAULT 'neo4j_graph' CHECK (target = 'neo4j_graph'),
  projection_name text NOT NULL,
  projection_version text NOT NULL,
  configuration_hash text NOT NULL
    CHECK (configuration_hash ~ '^sha256:[0-9a-f]{64}$'),
  current_revision bigint NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  UNIQUE (
    project_id, target, projection_name, projection_version, configuration_hash
  ),
  UNIQUE (
    projection_checkpoint_id, project_id, target, projection_name,
    projection_version, configuration_hash
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.graph_projection_records (
  graph_projection_record_id text PRIMARY KEY
    CHECK (graph_projection_record_id ~ '^graph_projection_record_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  projection_checkpoint_id text NOT NULL,
  project_id text NOT NULL,
  target text NOT NULL DEFAULT 'neo4j_graph' CHECK (target = 'neo4j_graph'),
  projection_name text NOT NULL,
  projection_version text NOT NULL,
  configuration_hash text NOT NULL,
  outbox_id text NOT NULL,
  outbox_position bigint NOT NULL,
  target_sequence bigint NOT NULL,
  event_id text NOT NULL,
  event_position bigint NOT NULL,
  stream_revision bigint NOT NULL,
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 100),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  outcome_kind text NOT NULL CHECK (outcome_kind IN ('applied', 'failed')),
  failure_code text,
  failure_message text,
  failure_retryable boolean,
  effect_hash text,
  backend_receipt text,
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.graph-projection-record')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'graph_projection_record_id' = graph_projection_record_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{projection,target}' = target)
    CHECK (payload #>> '{projection,projection_name}' = projection_name)
    CHECK (payload #>> '{projection,projection_version}' = projection_version)
    CHECK (payload #>> '{projection,configuration_hash}' = configuration_hash)
    CHECK (payload #>> '{content,outbox_ref,outbox_id}' = outbox_id)
    CHECK ((payload #>> '{content,outbox_ref,outbox_position}')::bigint = outbox_position)
    CHECK ((payload #>> '{content,outbox_ref,target_sequence}')::bigint = target_sequence)
    CHECK (payload #>> '{content,outbox_ref,event_id}' = event_id)
    CHECK ((payload #>> '{content,outbox_ref,event_position}')::bigint = event_position)
    CHECK ((payload #>> '{content,outbox_ref,stream_revision}')::bigint = stream_revision)
    CHECK ((payload #>> '{content,attempt}')::integer = attempt)
    CHECK ((payload #>> '{content,started_at}')::timestamptz = started_at)
    CHECK ((payload #>> '{content,completed_at}')::timestamptz = completed_at)
    CHECK (payload #>> '{content,outcome,outcome_kind}' = outcome_kind)
    CHECK (COALESCE(payload #>> '{content,outcome,failure,code}', '') = COALESCE(failure_code, ''))
    CHECK (COALESCE(payload #>> '{content,outcome,failure,message}', '') = COALESCE(failure_message, ''))
    CHECK ((payload #>> '{content,outcome,failure,retryable}')::boolean IS NOT DISTINCT FROM failure_retryable)
    CHECK (COALESCE(payload #>> '{content,outcome,effect_hash}', '') = COALESCE(effect_hash, ''))
    CHECK (COALESCE(payload #>> '{content,outcome,backend_receipt,receipt}', '') = COALESCE(backend_receipt, ''))
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  UNIQUE (projection_checkpoint_id, outbox_id, attempt),
  UNIQUE (graph_projection_record_id, projection_checkpoint_id),
  FOREIGN KEY (
    projection_checkpoint_id, project_id, target, projection_name,
    projection_version, configuration_hash
  ) REFERENCES petra.projection_checkpoints (
    projection_checkpoint_id, project_id, target, projection_name,
    projection_version, configuration_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    outbox_id, outbox_position, target, target_sequence, project_id, event_id
  ) REFERENCES petra.outbox_records (
    outbox_id, outbox_position, target, target_sequence, partition_key, event_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (completed_at >= started_at AND recorded_at >= completed_at),
  CHECK (
    (outcome_kind = 'applied'
      AND failure_code IS NULL AND failure_message IS NULL
      AND failure_retryable IS NULL AND effect_hash IS NOT NULL
      AND backend_receipt IS NOT NULL)
    OR (outcome_kind = 'failed'
      AND failure_code IS NOT NULL AND failure_message IS NOT NULL
      AND failure_retryable IS NOT NULL AND effect_hash IS NULL
      AND backend_receipt IS NULL)
  )
);

CREATE TABLE petra.graph_projected_objects (
  graph_projection_record_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  graph_element_kind text NOT NULL
    CHECK (graph_element_kind IN ('node', 'relationship')),
  object_id text NOT NULL,
  object_revision bigint NOT NULL CHECK (object_revision >= 1),
  operation text NOT NULL CHECK (operation IN ('upsert', 'tombstone')),
  projected_object jsonb NOT NULL CHECK (jsonb_typeof(projected_object) = 'object'),
  PRIMARY KEY (graph_projection_record_id, position),
  UNIQUE (graph_projection_record_id, graph_element_kind, object_id),
  FOREIGN KEY (graph_projection_record_id)
    REFERENCES petra.graph_projection_records (graph_projection_record_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.projection_checkpoint_revisions (
  projection_checkpoint_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  target text NOT NULL DEFAULT 'neo4j_graph' CHECK (target = 'neo4j_graph'),
  projection_name text NOT NULL,
  projection_version text NOT NULL,
  configuration_hash text NOT NULL,
  position_kind text NOT NULL CHECK (position_kind IN ('empty', 'advanced')),
  position_target_sequence bigint NOT NULL CHECK (position_target_sequence >= 0),
  position_outbox_id text,
  position_outbox_position bigint,
  position_event_id text,
  position_event_position bigint,
  position_stream_revision bigint,
  position_projection_record_id text,
  position_advanced_at timestamptz,
  observed_outbox_id text NOT NULL,
  observed_outbox_position bigint NOT NULL,
  observed_target_sequence bigint NOT NULL CHECK (observed_target_sequence >= 1),
  observed_event_id text NOT NULL,
  observed_event_position bigint NOT NULL,
  observed_stream_revision bigint NOT NULL,
  observed_at timestamptz NOT NULL,
  freshness_state text NOT NULL
    CHECK (freshness_state IN ('current', 'catching_up', 'blocked')),
  pending_records bigint NOT NULL CHECK (pending_records >= 0),
  blocking_projection_record_id text,
  failure_code text,
  failure_message text,
  blocked_at timestamptz,
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL CHECK (recorded_by_actor_kind = 'service'),
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.projection-checkpoint')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'projection_checkpoint_id' = projection_checkpoint_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{projection,target}' = target)
    CHECK (payload #>> '{projection,projection_name}' = projection_name)
    CHECK (payload #>> '{projection,projection_version}' = projection_version)
    CHECK (payload #>> '{projection,configuration_hash}' = configuration_hash)
    CHECK (payload #>> '{content,position,position_kind}' = position_kind)
    CHECK ((payload #>> '{content,position,target_sequence}')::bigint = position_target_sequence)
    CHECK (COALESCE(payload #>> '{content,position,outbox_id}', '') = COALESCE(position_outbox_id, ''))
    CHECK ((payload #>> '{content,position,outbox_position}')::bigint IS NOT DISTINCT FROM position_outbox_position)
    CHECK (COALESCE(payload #>> '{content,position,event_id}', '') = COALESCE(position_event_id, ''))
    CHECK ((payload #>> '{content,position,event_position}')::bigint IS NOT DISTINCT FROM position_event_position)
    CHECK ((payload #>> '{content,position,stream_revision}')::bigint IS NOT DISTINCT FROM position_stream_revision)
    CHECK (COALESCE(payload #>> '{content,position,graph_projection_record_id}', '') = COALESCE(position_projection_record_id, ''))
    CHECK ((payload #>> '{content,position,advanced_at}')::timestamptz IS NOT DISTINCT FROM position_advanced_at)
    CHECK (payload #>> '{content,observed_head,outbox_id}' = observed_outbox_id)
    CHECK ((payload #>> '{content,observed_head,outbox_position}')::bigint = observed_outbox_position)
    CHECK ((payload #>> '{content,observed_head,target_sequence}')::bigint = observed_target_sequence)
    CHECK (payload #>> '{content,observed_head,event_id}' = observed_event_id)
    CHECK ((payload #>> '{content,observed_head,event_position}')::bigint = observed_event_position)
    CHECK ((payload #>> '{content,observed_head,stream_revision}')::bigint = observed_stream_revision)
    CHECK ((payload #>> '{content,observed_head,observed_at}')::timestamptz = observed_at)
    CHECK (payload #>> '{content,freshness,state}' = freshness_state)
    CHECK ((payload #>> '{content,freshness,pending_records}')::bigint = pending_records)
    CHECK (COALESCE(payload #>> '{content,freshness,blocking_projection_record_id}', '') = COALESCE(blocking_projection_record_id, ''))
    CHECK (COALESCE(payload #>> '{content,freshness,failure_code}', '') = COALESCE(failure_code, ''))
    CHECK (COALESCE(payload #>> '{content,freshness,message}', '') = COALESCE(failure_message, ''))
    CHECK ((payload #>> '{content,freshness,blocked_at}')::timestamptz IS NOT DISTINCT FROM blocked_at)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  PRIMARY KEY (projection_checkpoint_id, revision),
  UNIQUE (projection_checkpoint_id, project_id, revision),
  FOREIGN KEY (
    projection_checkpoint_id, project_id, target, projection_name,
    projection_version, configuration_hash
  ) REFERENCES petra.projection_checkpoints (
    projection_checkpoint_id, project_id, target, projection_name,
    projection_version, configuration_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    observed_outbox_id, observed_outbox_position, target,
    observed_target_sequence, project_id, observed_event_id
  ) REFERENCES petra.outbox_records (
    outbox_id, outbox_position, target, target_sequence, partition_key, event_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (position_projection_record_id, projection_checkpoint_id)
    REFERENCES petra.graph_projection_records (
      graph_projection_record_id, projection_checkpoint_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (blocking_projection_record_id, projection_checkpoint_id)
    REFERENCES petra.graph_projection_records (
      graph_projection_record_id, projection_checkpoint_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (pending_records = observed_target_sequence - position_target_sequence),
  CHECK (recorded_at >= observed_at),
  CHECK (
    (position_kind = 'empty'
      AND position_target_sequence = 0
      AND position_outbox_id IS NULL AND position_outbox_position IS NULL
      AND position_event_id IS NULL AND position_event_position IS NULL
      AND position_stream_revision IS NULL
      AND position_projection_record_id IS NULL AND position_advanced_at IS NULL)
    OR (position_kind = 'advanced'
      AND position_target_sequence >= 1
      AND position_outbox_id IS NOT NULL AND position_outbox_position IS NOT NULL
      AND position_event_id IS NOT NULL AND position_event_position IS NOT NULL
      AND position_stream_revision IS NOT NULL
      AND position_projection_record_id IS NOT NULL
      AND position_advanced_at IS NOT NULL)
  ),
  CHECK (
    (freshness_state = 'current'
      AND pending_records = 0
      AND blocking_projection_record_id IS NULL AND failure_code IS NULL
      AND failure_message IS NULL AND blocked_at IS NULL)
    OR (freshness_state = 'catching_up'
      AND pending_records >= 1
      AND blocking_projection_record_id IS NULL AND failure_code IS NULL
      AND failure_message IS NULL AND blocked_at IS NULL)
    OR (freshness_state = 'blocked'
      AND pending_records >= 1
      AND blocking_projection_record_id IS NOT NULL AND failure_code IS NOT NULL
      AND failure_message IS NOT NULL AND blocked_at IS NOT NULL)
  )
);

ALTER TABLE petra.projection_checkpoints
  ADD CONSTRAINT projection_checkpoints_current_revision_fkey
  FOREIGN KEY (projection_checkpoint_id, project_id, current_revision)
  REFERENCES petra.projection_checkpoint_revisions (
    projection_checkpoint_id, project_id, revision
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.guard_graph_projection_record_outbox()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE outbox_payload jsonb;
BEGIN
  SELECT payload INTO outbox_payload FROM petra.outbox_records
   WHERE outbox_id = NEW.outbox_id;
  IF outbox_payload IS NULL
     OR (outbox_payload ->> 'outbox_position')::bigint
       IS DISTINCT FROM NEW.outbox_position
     OR (outbox_payload ->> 'target_sequence')::bigint
       IS DISTINCT FROM NEW.target_sequence
     OR outbox_payload ->> 'partition_key' IS DISTINCT FROM NEW.project_id
     OR outbox_payload #>> '{message,event,event_id}'
       IS DISTINCT FROM NEW.event_id
     OR (outbox_payload #>> '{message,event,event_position}')::bigint
       IS DISTINCT FROM NEW.event_position
     OR (outbox_payload #>> '{message,event,stream_revision}')::bigint
       IS DISTINCT FROM NEW.stream_revision
     OR (NEW.outcome_kind = 'applied'
       AND outbox_payload #>> '{message,event,event,event_type}'
         IS DISTINCT FROM 'change_set.applied') THEN
    RAISE EXCEPTION 'Projection receipt differs from its authoritative outbox record'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_projection_checkpoint_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  observed_payload jsonb;
  position_record petra.graph_projection_records%ROWTYPE;
  blocking_record petra.graph_projection_records%ROWTYPE;
BEGIN
  SELECT payload INTO observed_payload FROM petra.outbox_records
   WHERE outbox_id = NEW.observed_outbox_id;
  IF observed_payload IS NULL
     OR (observed_payload ->> 'outbox_position')::bigint
       IS DISTINCT FROM NEW.observed_outbox_position
     OR (observed_payload ->> 'target_sequence')::bigint
       IS DISTINCT FROM NEW.observed_target_sequence
     OR observed_payload #>> '{message,event,event_id}'
       IS DISTINCT FROM NEW.observed_event_id
     OR (observed_payload #>> '{message,event,event_position}')::bigint
       IS DISTINCT FROM NEW.observed_event_position
     OR (observed_payload #>> '{message,event,stream_revision}')::bigint
       IS DISTINCT FROM NEW.observed_stream_revision THEN
    RAISE EXCEPTION 'Projection checkpoint head differs from authoritative outbox'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.position_kind = 'advanced' THEN
    SELECT * INTO position_record FROM petra.graph_projection_records
     WHERE graph_projection_record_id = NEW.position_projection_record_id;
    IF position_record.graph_projection_record_id IS NULL
       OR position_record.projection_checkpoint_id
         IS DISTINCT FROM NEW.projection_checkpoint_id
       OR position_record.outcome_kind IS DISTINCT FROM 'applied'
       OR position_record.outbox_id IS DISTINCT FROM NEW.position_outbox_id
       OR position_record.outbox_position
         IS DISTINCT FROM NEW.position_outbox_position
       OR position_record.target_sequence
         IS DISTINCT FROM NEW.position_target_sequence
       OR position_record.event_id IS DISTINCT FROM NEW.position_event_id
       OR position_record.event_position
         IS DISTINCT FROM NEW.position_event_position
       OR position_record.stream_revision
         IS DISTINCT FROM NEW.position_stream_revision
       OR position_record.completed_at
         IS DISTINCT FROM NEW.position_advanced_at THEN
      RAISE EXCEPTION 'Advanced checkpoint differs from its applied projection receipt'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.freshness_state = 'blocked' THEN
    SELECT * INTO blocking_record FROM petra.graph_projection_records
     WHERE graph_projection_record_id = NEW.blocking_projection_record_id;
    IF blocking_record.graph_projection_record_id IS NULL
       OR blocking_record.projection_checkpoint_id
         IS DISTINCT FROM NEW.projection_checkpoint_id
       OR blocking_record.outcome_kind IS DISTINCT FROM 'failed'
       OR blocking_record.failure_code IS DISTINCT FROM NEW.failure_code
       OR blocking_record.failure_message IS DISTINCT FROM NEW.failure_message
       OR blocking_record.completed_at IS DISTINCT FROM NEW.blocked_at THEN
      RAISE EXCEPTION 'Blocked checkpoint differs from its failed projection receipt'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_projected_object_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_object jsonb;
BEGIN
  SELECT payload #> ARRAY[
           'content', 'outcome', 'effect', 'objects', (NEW.position - 1)::text
         ]
    INTO expected_object
    FROM petra.graph_projection_records
   WHERE graph_projection_record_id = NEW.graph_projection_record_id;
  IF expected_object IS NULL OR expected_object IS DISTINCT FROM NEW.projected_object THEN
    RAISE EXCEPTION 'Projected object order differs from canonical receipt'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_projected_objects()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE expected_count bigint;
BEGIN
  expected_count := CASE NEW.outcome_kind
    WHEN 'applied' THEN jsonb_array_length(
      NEW.payload #> '{content,outcome,effect,objects}'
    )
    ELSE 0
  END;
  IF expected_count IS DISTINCT FROM (
    SELECT count(*) FROM petra.graph_projected_objects
     WHERE graph_projection_record_id = NEW.graph_projection_record_id
  ) THEN
    RAISE EXCEPTION 'Projected object receipts are incomplete'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_unit_head_is_guarded
BEFORE UPDATE OR DELETE ON petra.work_units
FOR EACH ROW EXECUTE FUNCTION petra.guard_work_unit_head();
CREATE TRIGGER work_unit_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.work_unit_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER work_unit_revision_is_exact
BEFORE INSERT ON petra.work_unit_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_work_unit_revision();
CREATE TRIGGER worker_input_manifests_are_immutable
BEFORE UPDATE OR DELETE ON petra.worker_input_manifests
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER work_unit_dependencies_are_immutable
BEFORE UPDATE OR DELETE ON petra.work_unit_dependencies
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER worker_input_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.worker_input_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER worker_expected_outputs_are_immutable
BEFORE UPDATE OR DELETE ON petra.worker_expected_outputs
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER worker_output_manifests_are_immutable
BEFORE UPDATE OR DELETE ON petra.worker_output_manifests
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER worker_produced_outputs_are_immutable
BEFORE UPDATE OR DELETE ON petra.worker_produced_outputs
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER work_unit_dependency_order_is_exact
BEFORE INSERT ON petra.work_unit_dependencies
FOR EACH ROW EXECUTE FUNCTION petra.guard_work_unit_dependency_order();
CREATE TRIGGER worker_input_binding_order_is_exact
BEFORE INSERT ON petra.worker_input_bindings
FOR EACH ROW EXECUTE FUNCTION petra.guard_worker_input_binding_order();
CREATE TRIGGER worker_expected_output_order_is_exact
BEFORE INSERT ON petra.worker_expected_outputs
FOR EACH ROW EXECUTE FUNCTION petra.guard_worker_expected_output_order();
CREATE TRIGGER worker_produced_output_order_is_exact
BEFORE INSERT ON petra.worker_produced_outputs
FOR EACH ROW EXECUTE FUNCTION petra.guard_worker_output_member_order();
CREATE CONSTRAINT TRIGGER work_unit_members_are_complete
AFTER INSERT ON petra.work_units DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_work_unit_members();
CREATE CONSTRAINT TRIGGER worker_input_members_are_complete
AFTER INSERT ON petra.worker_input_manifests DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_worker_input_members();
CREATE CONSTRAINT TRIGGER worker_output_members_are_complete
AFTER INSERT ON petra.worker_output_manifests DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_worker_output_members();

CREATE TRIGGER projection_checkpoint_head_is_guarded
BEFORE UPDATE OR DELETE ON petra.projection_checkpoints
FOR EACH ROW EXECUTE FUNCTION petra.guard_projection_checkpoint_head();
CREATE TRIGGER projection_checkpoint_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.projection_checkpoint_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER graph_projection_records_are_immutable
BEFORE UPDATE OR DELETE ON petra.graph_projection_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER graph_projection_record_outbox_is_exact
BEFORE INSERT ON petra.graph_projection_records
FOR EACH ROW EXECUTE FUNCTION petra.guard_graph_projection_record_outbox();
CREATE TRIGGER graph_projected_objects_are_immutable
BEFORE UPDATE OR DELETE ON petra.graph_projected_objects
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TRIGGER graph_projected_object_order_is_exact
BEFORE INSERT ON petra.graph_projected_objects
FOR EACH ROW EXECUTE FUNCTION petra.guard_projected_object_order();
CREATE CONSTRAINT TRIGGER graph_projected_objects_are_complete
AFTER INSERT ON petra.graph_projection_records DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_projected_objects();
CREATE TRIGGER projection_checkpoint_revision_is_exact
BEFORE INSERT ON petra.projection_checkpoint_revisions
FOR EACH ROW EXECUTE FUNCTION petra.guard_projection_checkpoint_revision();

CREATE INDEX work_units_project_current_idx
  ON petra.work_units (project_id, current_revision, created_at, work_unit_id);
CREATE INDEX work_unit_revisions_state_idx
  ON petra.work_unit_revisions (project_id, state, updated_at, work_unit_id);
CREATE INDEX worker_output_manifests_work_unit_idx
  ON petra.worker_output_manifests (work_unit_id, attempt);
CREATE INDEX projection_checkpoint_freshness_idx
  ON petra.projection_checkpoint_revisions (
    project_id, freshness_state, recorded_at, projection_checkpoint_id
  );
CREATE INDEX graph_projection_records_repair_idx
  ON petra.graph_projection_records (
    projection_checkpoint_id, outcome_kind, target_sequence, attempt
  );

COMMENT ON TABLE petra.work_units IS
  'Stable bounded-work identities with immutable specifications and revisioned operational state.';
COMMENT ON TABLE petra.worker_output_manifests IS
  'Immutable untrusted worker reports; persistence does not grant artifact or scientific authority.';
COMMENT ON TABLE petra.projection_checkpoint_revisions IS
  'PostgreSQL-authoritative graph freshness and contiguous delivery position.';
COMMENT ON TABLE petra.graph_projection_records IS
  'Immutable Neo4j attempt receipts recorded after success or visible failure.';
