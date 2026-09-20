ALTER TABLE petra.work_unit_revisions
  DROP CONSTRAINT work_unit_revisions_state_check,
  ADD CONSTRAINT work_unit_revisions_state_check CHECK (
    state IN (
      'requested', 'queued', 'running', 'checkpointed', 'completed', 'cancelled'
    )
  ),
  DROP CONSTRAINT work_unit_revisions_check12,
  ADD CONSTRAINT work_unit_revisions_lifecycle_shape_check CHECK (
    (state IN ('requested', 'queued')
      AND terminal_outcome IS NULL AND attempt = 0
      AND output_manifest_id IS NULL AND failure IS NULL)
    OR (state IN ('running', 'checkpointed')
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
  );

CREATE TABLE petra.project_work_resume_registrations (
  resume_registration_id text PRIMARY KEY
    CHECK (resume_registration_id ~ '^work_resume_registration_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  source_work_unit_revision bigint NOT NULL CHECK (source_work_unit_revision >= 1),
  work_unit_spec_hash text NOT NULL CHECK (work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  input_manifest_id text NOT NULL,
  input_manifest_hash text NOT NULL CHECK (input_manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  checkpoint_artifact_id text NOT NULL,
  checkpoint_content_hash text NOT NULL CHECK (checkpoint_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  checkpoint_recorded_at timestamptz NOT NULL,
  workflow_name text NOT NULL,
  workflow_version text NOT NULL,
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 100),
  registered_by_actor_id text NOT NULL,
  registered_by_actor_kind text NOT NULL CHECK (registered_by_actor_kind = 'service'),
  registered_at timestamptz NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object'
    AND payload ->> 'resume_registration_id' = resume_registration_id
    AND payload ->> 'project_id' = project_id
    AND payload #>> '{work_unit_ref,work_unit_id}' = work_unit_id
    AND (payload #>> '{work_unit_ref,revision}')::bigint = source_work_unit_revision
    AND payload #>> '{work_unit_ref,spec_hash}' = work_unit_spec_hash
    AND payload #>> '{input_manifest_ref,worker_input_manifest_id}' = input_manifest_id
    AND payload #>> '{input_manifest_ref,content_hash}' = input_manifest_hash
    AND payload #>> '{checkpoint,artifact_id}' = checkpoint_artifact_id
    AND payload #>> '{checkpoint,content_hash}' = checkpoint_content_hash
    AND (payload #>> '{checkpoint,recorded_at}')::timestamptz = checkpoint_recorded_at
    AND payload #>> '{workflow,workflow_name}' = workflow_name
    AND payload #>> '{workflow,workflow_version}' = workflow_version
    AND (payload ->> 'attempt')::integer = attempt
    AND payload #>> '{registered_by,actor_id}' = registered_by_actor_id
    AND payload #>> '{registered_by,actor_kind}' = registered_by_actor_kind
    AND (payload ->> 'registered_at')::timestamptz = registered_at
  ),
  UNIQUE (work_unit_id, source_work_unit_revision),
  UNIQUE (resume_registration_id, content_hash),
  FOREIGN KEY (work_unit_id, project_id, source_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, work_unit_spec_hash, input_manifest_id)
    REFERENCES petra.work_units (
      work_unit_id, project_id, spec_hash, input_manifest_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (input_manifest_id, input_manifest_hash, work_unit_id, project_id)
    REFERENCES petra.worker_input_manifests (
      worker_input_manifest_id, content_hash, work_unit_id, project_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (checkpoint_artifact_id, checkpoint_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (registered_by_actor_id, registered_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_resume_registrations_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_resume_registrations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.project_work_resume_receipts (
  receipt_id text PRIMARY KEY
    CHECK (receipt_id ~ '^project_work_resume_receipt_[0-9A-HJKMNP-TV-Z]{26}$'),
  command_id text NOT NULL UNIQUE
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  source_work_unit_revision bigint NOT NULL CHECK (source_work_unit_revision >= 1),
  resume_registration_id text NOT NULL,
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
  FOREIGN KEY (work_unit_id, project_id, source_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (resume_registration_id)
    REFERENCES petra.project_work_resume_registrations (resume_registration_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_project_work_resume_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'completed' THEN
      RAISE EXCEPTION 'completed project_work_resume_receipts rows are immutable'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.state = 'completed' THEN
    RAISE EXCEPTION 'completed project_work_resume_receipts rows are immutable'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.state <> 'completed'
     OR ROW(
       NEW.receipt_id, NEW.command_id, NEW.idempotency_key, NEW.project_id,
       NEW.work_unit_id, NEW.source_work_unit_revision,
       NEW.resume_registration_id, NEW.request_hash, NEW.request_payload,
       NEW.actor_id, NEW.actor_kind, NEW.capability_grant_id, NEW.recorded_at
     ) IS DISTINCT FROM ROW(
       OLD.receipt_id, OLD.command_id, OLD.idempotency_key, OLD.project_id,
       OLD.work_unit_id, OLD.source_work_unit_revision,
       OLD.resume_registration_id, OLD.request_hash, OLD.request_payload,
       OLD.actor_id, OLD.actor_kind, OLD.capability_grant_id, OLD.recorded_at
     ) THEN
    RAISE EXCEPTION 'project_work_resume_receipts permit only pending-to-completed finalization'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_work_resume_receipts_finalize_once
BEFORE UPDATE OR DELETE ON petra.project_work_resume_receipts
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_work_resume_receipt_mutation();

CREATE TABLE petra.project_work_resume_transitions (
  command_id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  resume_registration_id text NOT NULL UNIQUE,
  project_id text NOT NULL,
  work_unit_id text NOT NULL,
  source_work_unit_revision bigint NOT NULL CHECK (source_work_unit_revision >= 1),
  resulting_work_unit_revision bigint NOT NULL CHECK (
    resulting_work_unit_revision = source_work_unit_revision + 1
  ),
  work_unit_spec_hash text NOT NULL CHECK (work_unit_spec_hash ~ '^sha256:[0-9a-f]{64}$'),
  checkpoint_artifact_id text NOT NULL,
  checkpoint_content_hash text NOT NULL CHECK (checkpoint_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 100),
  resumed_at timestamptz NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  transition_payload jsonb NOT NULL CHECK (jsonb_typeof(transition_payload) = 'object'),
  FOREIGN KEY (resume_registration_id)
    REFERENCES petra.project_work_resume_registrations (resume_registration_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (command_id) REFERENCES petra.project_work_resume_receipts (command_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, source_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_unit_id, project_id, resulting_work_unit_revision)
    REFERENCES petra.work_unit_revisions (work_unit_id, project_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (checkpoint_artifact_id, checkpoint_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_work_resume_transitions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_work_resume_transitions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_work_resume_registration_work_idx
  ON petra.project_work_resume_registrations (project_id, work_unit_id, source_work_unit_revision);
CREATE INDEX project_work_resume_receipt_work_idx
  ON petra.project_work_resume_receipts (project_id, work_unit_id, recorded_at, command_id);

COMMENT ON TABLE petra.project_work_resume_registrations IS
  'Trusted workflow registrations attesting that one exact retained checkpoint can continue within its immutable Work specification, input manifest, workflow, actor, and capability boundary.';
COMMENT ON TABLE petra.project_work_resume_transitions IS
  'Immutable exact checkpoint-to-running continuation lineage. Resume preserves the Work identity and attempt and never applies domain authority.';
