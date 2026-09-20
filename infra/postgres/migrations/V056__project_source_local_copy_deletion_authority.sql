ALTER TABLE petra.capability_grants
  DROP CONSTRAINT capability_grants_allowed_commands_check,
  ADD CONSTRAINT capability_grants_allowed_commands_check CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
      'ExcludeProjectSource', 'RestoreProjectSource',
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement',
      'InvokeSuggestedAction', 'DeferReviewSession', 'ReopenReviewSession',
      'RefreshReviewSession', 'CorrectReviewCandidate',
      'ReviseReviewCandidateBasis', 'SeparateReviewSessionMember',
      'ManageProjectWork', 'SaveProjectInquiry', 'FrameProjectObjective',
      'RegisterProjectSource', 'ReuseProjectSource',
      'StartProjectSourceProcessing', 'AddProjectSourceRevision',
      'DeleteLocalSourceCopy'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0',
      '1.12.0', '1.13.0', '1.14.0', '1.15.0'
    )
  );

CREATE TABLE petra.project_source_local_copy_deletion_attempts (
  command_id text PRIMARY KEY CHECK (
    command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  project_id text NOT NULL,
  project_source_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  artifact_manifest_id text NOT NULL,
  artifact_id text NOT NULL,
  store_name text NOT NULL,
  object_key text NOT NULL,
  storage_content_hash text NOT NULL CHECK (
    storage_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  state text NOT NULL CHECK (state IN ('pending_storage', 'completed')),
  request_payload jsonb NOT NULL CHECK (jsonb_typeof(request_payload) = 'object'),
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_source_id) REFERENCES petra.project_sources (project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id)
    REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_manifest_id) REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, storage_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (request_payload ->> 'command_id' = command_id),
  CHECK (request_payload ->> 'idempotency_key' = idempotency_key),
  CHECK (request_payload #>> '{expected,project_ref,project_id}' = project_id),
  CHECK (request_payload #>> '{expected,current_source_ref,project_source_id}' = project_source_id),
  CHECK (request_payload #>> '{expected,copy_ref,artifact_manifest_id}' = artifact_manifest_id),
  CHECK (request_payload #>> '{expected,copy_ref,artifact_id}' = artifact_id),
  CHECK (request_payload #>> '{expected,copy_ref,store_name}' = store_name),
  CHECK (request_payload #>> '{expected,copy_ref,object_key}' = object_key),
  CHECK (request_payload #>> '{expected,copy_ref,content_hash}' = storage_content_hash),
  CHECK ((state = 'pending_storage' AND completed_at IS NULL)
      OR (state = 'completed' AND completed_at IS NOT NULL))
);

CREATE INDEX project_source_local_copy_deletion_attempts_copy_idx
  ON petra.project_source_local_copy_deletion_attempts (
    store_name, object_key, storage_content_hash, state
  );

CREATE TABLE petra.project_source_local_copy_deletion_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^source_copy_deletion_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  command_id text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  project_id text NOT NULL,
  project_source_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  artifact_manifest_id text NOT NULL UNIQUE,
  artifact_id text NOT NULL,
  store_name text NOT NULL,
  object_key text NOT NULL,
  storage_content_hash text NOT NULL CHECK (
    storage_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  observation text NOT NULL CHECK (
    observation IN ('deleted_now', 'already_absent_after_durable_intent')
  ),
  schema_name text NOT NULL CHECK (
    schema_name = 'petra.project-source-local-copy-deletion-receipt'
  ),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (command_id) REFERENCES petra.project_source_local_copy_deletion_attempts (command_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_source_id) REFERENCES petra.project_sources (project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_manifest_id) REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, storage_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (payload ->> 'schema_name' = schema_name),
  CHECK (payload ->> 'schema_version' = schema_version),
  CHECK (payload ->> 'receipt_id' = receipt_id),
  CHECK (payload ->> 'command_id' = command_id),
  CHECK (payload ->> 'idempotency_key' = idempotency_key),
  CHECK (payload ->> 'request_hash' = request_hash),
  CHECK (payload ->> 'project_id' = project_id),
  CHECK (payload #>> '{source_ref,project_source_id}' = project_source_id),
  CHECK (payload #>> '{actor,actor_id}' = actor_id),
  CHECK (payload #>> '{actor,actor_kind}' = actor_kind),
  CHECK (payload ->> 'capability_grant_id' = capability_grant_id),
  CHECK (payload #>> '{copy_ref,artifact_manifest_id}' = artifact_manifest_id),
  CHECK (payload #>> '{copy_ref,artifact_id}' = artifact_id),
  CHECK (payload #>> '{copy_ref,store_name}' = store_name),
  CHECK (payload #>> '{copy_ref,object_key}' = object_key),
  CHECK (payload #>> '{copy_ref,content_hash}' = storage_content_hash),
  CHECK (payload #>> '{effect,observation}' = observation),
  CHECK (payload #>> '{effect,local_copy_state}' = 'absent'),
  CHECK (payload ->> 'record_hash' = record_hash),
  CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at)
);

CREATE TRIGGER project_source_local_copy_deletion_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_local_copy_deletion_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

COMMENT ON TABLE petra.project_source_local_copy_deletion_attempts IS
  'Durable exact deletion intents retained before the non-transactional local byte-store effect.';
COMMENT ON TABLE petra.project_source_local_copy_deletion_receipts IS
  'Immutable local-copy tombstones preserving source identity, authority, and exact retry recovery.';
