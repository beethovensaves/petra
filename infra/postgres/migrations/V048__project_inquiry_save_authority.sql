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
      'ManageProjectWork',
      'SaveProjectInquiry'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0', '1.8.0', '1.9.0'
    )
  );

CREATE TABLE petra.project_inquiry_save_receipts (
  receipt_id text PRIMARY KEY CHECK (
    receipt_id ~ '^project_inquiry_save_receipt_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  command_id text NOT NULL UNIQUE CHECK (
    command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 512
    AND idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL
    CHECK (jsonb_typeof(request_payload) = 'object')
    CHECK (request_payload ->> 'schema_name' = 'petra.project-inquiry-save-request')
    CHECK (request_payload ->> 'schema_version' = '1.0.0')
    CHECK (request_payload ->> 'command_id' = command_id)
    CHECK (request_payload ->> 'idempotency_key' = idempotency_key),
  project_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind = 'human'),
  capability_grant_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_definition_record_hash text NOT NULL CHECK (
    project_definition_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_inquiry_role_id text NOT NULL,
  project_inquiry_role_revision bigint NOT NULL CHECK (
    project_inquiry_role_revision >= 1
  ),
  project_inquiry_role_content_hash text NOT NULL CHECK (
    project_inquiry_role_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_inquiry_role_record_hash text NOT NULL CHECK (
    project_inquiry_role_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_id text NOT NULL UNIQUE CHECK (
    objective_id ~ '^objective_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  objective_revision bigint NOT NULL CHECK (objective_revision = 1),
  objective_content_hash text NOT NULL CHECK (
    objective_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  objective_record_hash text NOT NULL CHECK (
    objective_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  graph_request_id text NOT NULL CHECK (
    graph_request_id ~ '^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  graph_request_hash text NOT NULL CHECK (
    graph_request_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  focused_graph_schema_version text NOT NULL CHECK (
    focused_graph_schema_version IN ('1.0.0', '1.1.0')
  ),
  focused_graph_content_hash text NOT NULL CHECK (
    focused_graph_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  snapshot_id text NOT NULL CHECK (
    snapshot_id ~ '^snapshot_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  snapshot_revision bigint NOT NULL CHECK (snapshot_revision >= 1),
  snapshot_event_position bigint NOT NULL CHECK (snapshot_event_position >= 0),
  snapshot_content_hash text NOT NULL CHECK (
    snapshot_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  semantic_layer text NOT NULL CHECK (semantic_layer IN ('current', 'working')),
  receipt_record_hash text NOT NULL CHECK (
    receipt_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  receipt_payload jsonb NOT NULL
    CHECK (jsonb_typeof(receipt_payload) = 'object')
    CHECK (receipt_payload ->> 'schema_name' = 'petra.project-inquiry-save-receipt')
    CHECK (receipt_payload ->> 'schema_version' = '1.0.0')
    CHECK (receipt_payload ->> 'receipt_id' = receipt_id)
    CHECK (receipt_payload ->> 'command_id' = command_id)
    CHECK (receipt_payload ->> 'idempotency_key' = idempotency_key)
    CHECK (receipt_payload ->> 'request_hash' = request_hash)
    CHECK (receipt_payload ->> 'project_id' = project_id)
    CHECK (receipt_payload #>> '{actor,actor_id}' = actor_id)
    CHECK (receipt_payload #>> '{actor,actor_kind}' = actor_kind)
    CHECK (receipt_payload ->> 'capability_grant_id' = capability_grant_id)
    CHECK (receipt_payload #>> '{objective_ref,objective_id}' = objective_id)
    CHECK ((receipt_payload #>> '{objective_ref,revision}')::bigint = objective_revision)
    CHECK (receipt_payload #>> '{objective_ref,content_hash}' = objective_content_hash)
    CHECK (receipt_payload #>> '{objective_ref,record_hash}' = objective_record_hash)
    CHECK (receipt_payload #>> '{graph_binding,task_request_id}' = graph_request_id)
    CHECK (receipt_payload #>> '{graph_binding,graph_request_hash}' = graph_request_hash)
    CHECK (receipt_payload #>> '{graph_binding,focused_graph_ref,schema_version}' = focused_graph_schema_version)
    CHECK (receipt_payload #>> '{graph_binding,focused_graph_ref,content_hash}' = focused_graph_content_hash)
    CHECK (receipt_payload #>> '{graph_binding,snapshot_ref,snapshot_id}' = snapshot_id)
    CHECK ((receipt_payload #>> '{graph_binding,snapshot_ref,revision}')::bigint = snapshot_revision)
    CHECK ((receipt_payload #>> '{graph_binding,snapshot_ref,event_position}')::bigint = snapshot_event_position)
    CHECK (receipt_payload #>> '{graph_binding,snapshot_ref,content_hash}' = snapshot_content_hash)
    CHECK (receipt_payload #>> '{graph_binding,semantic_layer}' = semantic_layer)
    CHECK (receipt_payload ->> 'record_hash' = receipt_record_hash),
  recorded_at timestamptz NOT NULL CHECK (
    (receipt_payload ->> 'recorded_at')::timestamptz = recorded_at
  ),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind) REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (capability_grant_id) REFERENCES petra.capability_grants (capability_grant_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    project_definition_id,
    project_definition_revision,
    project_definition_content_hash,
    project_definition_record_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id,
    project_definition_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    project_inquiry_role_id,
    project_inquiry_role_revision,
    project_inquiry_role_content_hash,
    project_inquiry_role_record_hash
  ) REFERENCES petra.project_inquiry_role_revisions (
    project_id,
    project_inquiry_role_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id,
    objective_id,
    objective_revision,
    objective_content_hash,
    objective_record_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id,
    objective_id,
    revision,
    content_hash,
    record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER project_inquiry_save_receipts_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_inquiry_save_receipts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_inquiry_save_receipts_project_idx
  ON petra.project_inquiry_save_receipts (
    project_id, recorded_at DESC, command_id
  );

COMMENT ON TABLE petra.project_inquiry_save_receipts IS
  'Immutable authenticated receipts binding a server-verified focused Graph question and exact return context to one newly retained ProjectObjective inquiry.';
