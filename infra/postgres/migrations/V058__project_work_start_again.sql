CREATE TABLE petra.project_work_start_again_registrations (
  start_again_registration_id text PRIMARY KEY
    CHECK (start_again_registration_id ~ '^work_start_again_registration_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  prior_work_unit_id text NOT NULL,
  prior_work_unit_revision bigint NOT NULL CHECK (prior_work_unit_revision >= 1),
  prior_work_unit_spec_hash text NOT NULL CHECK (prior_work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  prior_input_manifest_id text NOT NULL,
  prior_input_manifest_hash text NOT NULL CHECK (prior_input_manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  prior_work_attempt integer NOT NULL CHECK (prior_work_attempt BETWEEN 1 AND 100),
  prior_lineage_attempt integer NOT NULL CHECK (prior_lineage_attempt BETWEEN 1 AND 99),
  fresh_work_unit_id text NOT NULL UNIQUE,
  fresh_work_unit_revision bigint NOT NULL CHECK (fresh_work_unit_revision = 1),
  fresh_work_unit_spec_hash text NOT NULL CHECK (fresh_work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  fresh_input_manifest_id text NOT NULL,
  fresh_input_manifest_hash text NOT NULL CHECK (fresh_input_manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  new_lineage_attempt integer NOT NULL CHECK (new_lineage_attempt = prior_lineage_attempt + 1),
  workflow_name text NOT NULL,
  workflow_version text NOT NULL,
  task_family text NOT NULL,
  task_name text NOT NULL,
  task_version text NOT NULL,
  transition_summary text NOT NULL CHECK (char_length(transition_summary) BETWEEN 1 AND 1000),
  registered_by_actor_id text NOT NULL,
  registered_by_actor_kind text NOT NULL CHECK (registered_by_actor_kind = 'service'),
  registered_at timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object'
    AND payload ->> 'start_again_registration_id' = start_again_registration_id
    AND payload ->> 'project_id' = project_id
    AND payload #>> '{prior_work_unit_ref,work_unit_id}' = prior_work_unit_id
    AND (payload #>> '{prior_work_unit_ref,revision}')::bigint = prior_work_unit_revision
    AND payload #>> '{prior_work_unit_ref,spec_hash}' = prior_work_unit_spec_hash
    AND payload #>> '{prior_input_manifest_ref,worker_input_manifest_id}' = prior_input_manifest_id
    AND payload #>> '{prior_input_manifest_ref,content_hash}' = prior_input_manifest_hash
    AND (payload ->> 'prior_work_attempt')::integer = prior_work_attempt
    AND (payload ->> 'prior_lineage_attempt')::integer = prior_lineage_attempt
    AND payload #>> '{fresh_work_unit_ref,work_unit_id}' = fresh_work_unit_id
    AND (payload #>> '{fresh_work_unit_ref,revision}')::bigint = fresh_work_unit_revision
    AND payload #>> '{fresh_work_unit_ref,spec_hash}' = fresh_work_unit_spec_hash
    AND payload #>> '{fresh_input_manifest_ref,worker_input_manifest_id}' = fresh_input_manifest_id
    AND payload #>> '{fresh_input_manifest_ref,content_hash}' = fresh_input_manifest_hash
    AND (payload ->> 'new_lineage_attempt')::integer = new_lineage_attempt
    AND payload #>> '{workflow,workflow_name}' = workflow_name
    AND payload #>> '{workflow,workflow_version}' = workflow_version
    AND payload #>> '{workflow,task_family}' = task_family
    AND payload #>> '{workflow,task_name}' = task_name
    AND payload #>> '{workflow,task_version}' = task_version
    AND payload #>> '{input_transition,summary}' = transition_summary
    AND payload #>> '{registered_by,actor_id}' = registered_by_actor_id
    AND payload #>> '{registered_by,actor_kind}' = registered_by_actor_kind
    AND (payload ->> 'registered_at')::timestamptz = registered_at
  ),
  UNIQUE (prior_work_unit_id, prior_work_unit_revision),
  UNIQUE (start_again_registration_id, content_hash),
  FOREIGN KEY (prior_work_unit_id, project_id, prior_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (prior_work_unit_id, project_id, prior_work_unit_spec_hash, prior_input_manifest_id)
    REFERENCES petra.work_units (work_unit_id, project_id, spec_hash, input_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (prior_input_manifest_id, prior_input_manifest_hash, prior_work_unit_id, project_id)
    REFERENCES petra.worker_input_manifests (worker_input_manifest_id, content_hash, work_unit_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_work_unit_id, project_id, fresh_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_work_unit_id, project_id, fresh_work_unit_spec_hash, fresh_input_manifest_id)
    REFERENCES petra.work_units (work_unit_id, project_id, spec_hash, input_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_input_manifest_id, fresh_input_manifest_hash, fresh_work_unit_id, project_id)
    REFERENCES petra.worker_input_manifests (worker_input_manifest_id, content_hash, work_unit_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (registered_by_actor_id, registered_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_start_again_registrations_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_start_again_registrations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_work_start_again_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^project_work_start_again_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  project_id text NOT NULL,
  prior_work_unit_id text NOT NULL,
  prior_work_unit_revision bigint NOT NULL CHECK (prior_work_unit_revision >= 1),
  start_again_registration_id text NOT NULL,
  fresh_work_unit_id text NOT NULL,
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
  FOREIGN KEY (prior_work_unit_id, project_id, prior_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (start_again_registration_id)
    REFERENCES petra.project_work_start_again_registrations (start_again_registration_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_work_unit_id)
    REFERENCES petra.work_units (work_unit_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_project_work_start_again_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'completed' THEN
      RAISE EXCEPTION 'completed project_work_start_again_receipts rows are immutable'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.state = 'completed' THEN
    RAISE EXCEPTION 'completed project_work_start_again_receipts rows are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.state <> 'completed'
     OR ROW(
       NEW.receipt_id, NEW.command_id, NEW.idempotency_key, NEW.project_id,
       NEW.prior_work_unit_id, NEW.prior_work_unit_revision,
       NEW.start_again_registration_id, NEW.fresh_work_unit_id,
       NEW.request_hash, NEW.request_payload, NEW.actor_id, NEW.actor_kind,
       NEW.capability_grant_id, NEW.recorded_at
     ) IS DISTINCT FROM ROW(
       OLD.receipt_id, OLD.command_id, OLD.idempotency_key, OLD.project_id,
       OLD.prior_work_unit_id, OLD.prior_work_unit_revision,
       OLD.start_again_registration_id, OLD.fresh_work_unit_id,
       OLD.request_hash, OLD.request_payload, OLD.actor_id, OLD.actor_kind,
       OLD.capability_grant_id, OLD.recorded_at
     ) THEN
    RAISE EXCEPTION 'project_work_start_again_receipts permit only pending-to-completed finalization'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_work_start_again_receipts_finalize_once
BEFORE UPDATE OR DELETE ON petra.project_work_start_again_receipts
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_work_start_again_receipt_mutation();

CREATE TABLE petra.project_work_start_again_transitions (
  command_id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  start_again_registration_id text NOT NULL UNIQUE,
  project_id text NOT NULL,
  prior_work_unit_id text NOT NULL,
  prior_work_unit_revision bigint NOT NULL CHECK (prior_work_unit_revision >= 1),
  prior_work_attempt integer NOT NULL CHECK (prior_work_attempt BETWEEN 1 AND 100),
  prior_lineage_attempt integer NOT NULL CHECK (prior_lineage_attempt BETWEEN 1 AND 99),
  fresh_work_unit_id text NOT NULL UNIQUE,
  fresh_registered_revision bigint NOT NULL CHECK (fresh_registered_revision = 1),
  fresh_resulting_revision bigint NOT NULL CHECK (fresh_resulting_revision = fresh_registered_revision + 2),
  fresh_work_attempt integer NOT NULL CHECK (fresh_work_attempt = 1),
  new_lineage_attempt integer NOT NULL CHECK (new_lineage_attempt = prior_lineage_attempt + 1),
  started_at timestamptz NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  transition_payload jsonb NOT NULL CHECK (jsonb_typeof(transition_payload) = 'object'),
  FOREIGN KEY (start_again_registration_id)
    REFERENCES petra.project_work_start_again_registrations (start_again_registration_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (command_id) REFERENCES petra.project_work_start_again_receipts (command_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (prior_work_unit_id, project_id, prior_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_work_unit_id, project_id, fresh_registered_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (fresh_work_unit_id, project_id, fresh_resulting_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_start_again_transitions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_start_again_transitions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_work_start_again_registration_prior_idx
  ON petra.project_work_start_again_registrations (project_id, prior_work_unit_id, prior_work_unit_revision);
CREATE INDEX project_work_start_again_receipt_prior_idx
  ON petra.project_work_start_again_receipts (project_id, prior_work_unit_id, recorded_at, command_id);

COMMENT ON TABLE petra.project_work_start_again_registrations IS
  'Trusted workflow registrations linking exact terminal prior Work to distinct requested Work with a genuinely fresh immutable input manifest and no implicit retained-output reuse.';
COMMENT ON TABLE petra.project_work_start_again_transitions IS
  'Immutable prior-attempt to fresh-Work attempt lineage. Start again preserves prior Work and domain authority while beginning attempt one under a distinct registered Work identity.';
