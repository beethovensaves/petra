CREATE FUNCTION petra.guard_project_thread_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'project threads cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.project_thread_id <> OLD.project_thread_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'project thread identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'project thread current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.project_threads (
  project_thread_id text PRIMARY KEY
    CHECK (project_thread_id ~ '^project_thread_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL,
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL CHECK (created_by_actor_kind = 'human'),
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, project_thread_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.project_thread_revisions (
  project_thread_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL CHECK (
    project_definition_revision >= 1
  ),
  project_definition_content_hash text NOT NULL CHECK (
    project_definition_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  lineage_parent_revision bigint,
  lineage_parent_hash text,
  lifecycle text NOT NULL CHECK (lifecycle IN ('open', 'archived')),
  origin_kind text NOT NULL CHECK (origin_kind IN ('root', 'branch')),
  branch_parent_thread_id text,
  branch_parent_revision bigint,
  branch_parent_hash text,
  branch_parent_turn_id text,
  branch_continuation_mode text,
  turn_count bigint NOT NULL CHECK (turn_count BETWEEN 0 AND 1000),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  schema_name text NOT NULL CHECK (schema_name = 'petra.project-thread'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'project_thread_id' = project_thread_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload -> 'project_definition_ref' ->> 'project_definition_id'
        = project_definition_id
    )
    CHECK (
      (payload -> 'project_definition_ref' ->> 'revision')::bigint
        = project_definition_revision
    )
    CHECK (
      payload -> 'project_definition_ref' ->> 'content_hash'
        = project_definition_content_hash
    )
    CHECK (payload #>> '{content,lifecycle}' = lifecycle)
    CHECK (payload #>> '{content,origin,origin_kind}' = origin_kind)
    CHECK (jsonb_array_length(payload #> '{content,turns}') = turn_count)
    CHECK (payload ->> 'content_hash' = content_hash),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (project_thread_id, revision),
  UNIQUE (project_thread_id, revision, content_hash),
  UNIQUE (project_id, project_thread_id, revision, content_hash),
  FOREIGN KEY (project_id, project_thread_id)
    REFERENCES petra.project_threads (project_id, project_thread_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_thread_id, lineage_parent_revision, lineage_parent_hash)
    REFERENCES petra.project_thread_revisions (
      project_thread_id, revision, content_hash
    ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, branch_parent_thread_id, branch_parent_revision,
    branch_parent_hash
  ) REFERENCES petra.project_thread_revisions (
    project_id, project_thread_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (revision = 1 AND lineage_parent_revision IS NULL
      AND lineage_parent_hash IS NULL)
    OR (revision > 1 AND lineage_parent_revision = revision - 1
      AND lineage_parent_hash IS NOT NULL)
  ),
  CHECK (
    (origin_kind = 'root' AND branch_parent_thread_id IS NULL
      AND branch_parent_revision IS NULL AND branch_parent_hash IS NULL
      AND branch_parent_turn_id IS NULL AND branch_continuation_mode IS NULL)
    OR (origin_kind = 'branch' AND branch_parent_thread_id IS NOT NULL
      AND branch_parent_revision IS NOT NULL AND branch_parent_hash IS NOT NULL
      AND branch_parent_turn_id IS NOT NULL
      AND branch_continuation_mode IN (
        'original_snapshot', 'current_snapshot', 'compare_then_continue'
      ))
  )
);

ALTER TABLE petra.project_threads
  ADD CONSTRAINT project_threads_current_revision_fkey
  FOREIGN KEY (project_thread_id, current_revision)
  REFERENCES petra.project_thread_revisions (project_thread_id, revision)
  ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.project_thread_turn_bindings (
  project_thread_id text NOT NULL,
  thread_revision bigint NOT NULL,
  turn_position bigint NOT NULL CHECK (turn_position BETWEEN 1 AND 1000),
  project_turn_id text NOT NULL
    CHECK (project_turn_id ~ '^project_turn_[0-9A-HJKMNP-TV-Z]{26}$'),
  previous_project_turn_id text,
  project_id text NOT NULL,
  project_definition_id text NOT NULL,
  project_definition_revision bigint NOT NULL,
  project_definition_content_hash text NOT NULL,
  objective_id text,
  objective_revision bigint,
  objective_content_hash text,
  input_retention_state text NOT NULL
    CHECK (input_retention_state IN ('hash_only', 'retained_artifact')),
  input_hash text NOT NULL CHECK (input_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_message_id text NOT NULL,
  input_artifact_id text,
  input_artifact_hash text,
  input_artifact_byte_size bigint,
  input_artifact_media_type text,
  context_schema_name text NOT NULL CHECK (
    context_schema_name = 'petra.context-packet'
  ),
  context_schema_version text NOT NULL CHECK (context_schema_version = '1.0.0'),
  context_packet_id text NOT NULL,
  context_packet_revision bigint NOT NULL CHECK (context_packet_revision = 1),
  context_packet_hash text NOT NULL,
  snapshot_id text NOT NULL,
  snapshot_revision bigint NOT NULL,
  snapshot_event_position bigint NOT NULL,
  snapshot_hash text NOT NULL,
  interaction_run_id text NOT NULL,
  interaction_run_revision bigint NOT NULL,
  interaction_run_hash text NOT NULL,
  work_unit_id text NOT NULL,
  work_unit_revision bigint NOT NULL,
  work_unit_spec_hash text NOT NULL,
  result_schema_name text NOT NULL CHECK (
    result_schema_name = 'petra.grounded-response'
  ),
  result_schema_version text NOT NULL CHECK (result_schema_version = '1.0.0'),
  grounded_response_id text NOT NULL,
  grounded_response_revision bigint NOT NULL,
  grounded_response_hash text NOT NULL,
  response_artifact_id text NOT NULL,
  response_artifact_hash text NOT NULL,
  response_artifact_byte_size bigint NOT NULL,
  response_artifact_media_type text NOT NULL,
  authority_actor_id text NOT NULL,
  authority_actor_kind text NOT NULL,
  capability_grant_id text NOT NULL,
  recorded_at timestamptz NOT NULL,
  turn_payload jsonb NOT NULL CHECK (jsonb_typeof(turn_payload) = 'object'),
  PRIMARY KEY (project_thread_id, thread_revision, turn_position),
  UNIQUE (project_thread_id, thread_revision, project_turn_id),
  FOREIGN KEY (project_thread_id, thread_revision)
    REFERENCES petra.project_thread_revisions (project_thread_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_thread_id, thread_revision, previous_project_turn_id
  ) REFERENCES petra.project_thread_turn_bindings (
    project_thread_id, thread_revision, project_turn_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (
    project_id, project_definition_id, project_definition_revision,
    project_definition_content_hash
  ) REFERENCES petra.project_definition_revisions (
    project_id, project_definition_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    project_id, objective_id, objective_revision, objective_content_hash
  ) REFERENCES petra.project_objective_revisions (
    project_id, objective_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, context_packet_hash
  ) REFERENCES petra.context_packets (
    context_packet_id, project_id, snapshot_id, snapshot_revision,
    snapshot_event_position, snapshot_hash, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (interaction_run_id, project_id)
    REFERENCES petra.interaction_runs (interaction_run_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    interaction_run_id, interaction_run_revision, interaction_run_hash
  ) REFERENCES petra.interaction_run_revisions (
    interaction_run_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    work_unit_id, work_unit_revision, project_id, work_unit_spec_hash
  ) REFERENCES petra.work_unit_revisions (
    work_unit_id, revision, project_id, spec_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (grounded_response_id, project_id)
    REFERENCES petra.grounded_responses (grounded_response_id, project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    grounded_response_id, grounded_response_revision, grounded_response_hash
  ) REFERENCES petra.grounded_response_revisions (
    grounded_response_id, revision, content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    response_artifact_id, response_artifact_hash,
    response_artifact_byte_size, response_artifact_media_type
  ) REFERENCES petra.artifacts (
    artifact_id, content_hash, byte_size, media_type
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    input_artifact_id, input_artifact_hash,
    input_artifact_byte_size, input_artifact_media_type
  ) REFERENCES petra.artifacts (
    artifact_id, content_hash, byte_size, media_type
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (authority_actor_id, authority_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (turn_position = 1 AND previous_project_turn_id IS NULL)
    OR (turn_position > 1 AND previous_project_turn_id IS NOT NULL)
  ),
  CHECK (
    (input_retention_state = 'hash_only' AND input_artifact_id IS NULL
      AND input_artifact_hash IS NULL AND input_artifact_byte_size IS NULL
      AND input_artifact_media_type IS NULL)
    OR (input_retention_state = 'retained_artifact'
      AND input_artifact_id IS NOT NULL AND input_artifact_hash IS NOT NULL
      AND input_artifact_byte_size IS NOT NULL
      AND input_artifact_media_type IS NOT NULL)
  ),
  CHECK (
    (objective_id IS NULL AND objective_revision IS NULL
      AND objective_content_hash IS NULL)
    OR (objective_id IS NOT NULL AND objective_revision IS NOT NULL
      AND objective_content_hash IS NOT NULL)
  ),
  CHECK ((turn_payload ->> 'sequence')::bigint = turn_position),
  CHECK (turn_payload ->> 'project_turn_id' = project_turn_id),
  CHECK (
      turn_payload -> 'project_definition_ref' ->> 'project_definition_id'
        = project_definition_id
  ),
  CHECK (turn_payload #>> '{input,retention_state}' = input_retention_state),
  CHECK (turn_payload #>> '{input,input_hash}' = input_hash),
  CHECK (turn_payload #>> '{input,source_message_id}' = source_message_id),
  CHECK (
      turn_payload #>> '{context,context_record_ref,record_id}'
        = context_packet_id
  ),
  CHECK (
      turn_payload #>> '{execution,interaction_run_ref,interaction_run_id}'
        = interaction_run_id
  ),
  CHECK (
    turn_payload #>> '{execution,work_unit_ref,work_unit_id}' = work_unit_id
  ),
  CHECK (
      turn_payload #>> '{response,result_record_ref,record_id}'
        = grounded_response_id
  ),
  CHECK (
      turn_payload #>> '{response,response_artifact_ref,artifact_id}'
        = response_artifact_id
  ),
  CHECK (
    turn_payload #>> '{authority_context,actor,actor_id}' = authority_actor_id
  ),
  CHECK (
    turn_payload #>> '{authority_context,actor,actor_kind}'
      = authority_actor_kind
  ),
  CHECK ((turn_payload ->> 'recorded_at')::timestamptz = recorded_at)
);

ALTER TABLE petra.project_thread_revisions
  ADD CONSTRAINT project_thread_branch_parent_turn_fkey
  FOREIGN KEY (
    branch_parent_thread_id, branch_parent_revision, branch_parent_turn_id
  ) REFERENCES petra.project_thread_turn_bindings (
    project_thread_id, thread_revision, project_turn_id
  ) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.validate_project_thread_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  observed_turns jsonb;
  parent_turns jsonb;
  retained_prefix jsonb;
BEGIN
  SELECT COALESCE(
           jsonb_agg(binding.turn_payload ORDER BY binding.turn_position),
           '[]'::jsonb
         )
    INTO observed_turns
    FROM petra.project_thread_turn_bindings AS binding
   WHERE binding.project_thread_id = NEW.project_thread_id
     AND binding.thread_revision = NEW.revision;
  IF observed_turns IS DISTINCT FROM NEW.payload #> '{content,turns}' THEN
    RAISE EXCEPTION 'project thread bindings must match the canonical ordered turns'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.revision > 1 THEN
    SELECT parent.payload #> '{content,turns}'
      INTO parent_turns
      FROM petra.project_thread_revisions AS parent
     WHERE parent.project_thread_id = NEW.project_thread_id
       AND parent.revision = NEW.revision - 1;
    IF jsonb_array_length(NEW.payload #> '{content,turns}')
         NOT BETWEEN jsonb_array_length(parent_turns)
             AND jsonb_array_length(parent_turns) + 1 THEN
      RAISE EXCEPTION 'project thread revisions may append at most one material turn'
        USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(jsonb_agg(item.value ORDER BY item.ordinality), '[]'::jsonb)
      INTO retained_prefix
      FROM jsonb_array_elements(NEW.payload #> '{content,turns}')
        WITH ORDINALITY AS item(value, ordinality)
     WHERE item.ordinality <= jsonb_array_length(parent_turns);
    IF retained_prefix IS DISTINCT FROM parent_turns THEN
      RAISE EXCEPTION 'recorded project turns are immutable across revisions'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.payload #> '{content,origin}' IS DISTINCT FROM (
      SELECT parent.payload #> '{content,origin}'
        FROM petra.project_thread_revisions AS parent
       WHERE parent.project_thread_id = NEW.project_thread_id
         AND parent.revision = NEW.revision - 1
    ) THEN
      RAISE EXCEPTION 'project thread origin is immutable across revisions'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER project_thread_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.project_threads
FOR EACH ROW EXECUTE FUNCTION petra.guard_project_thread_identity();

CREATE TRIGGER project_thread_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_thread_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER project_thread_turn_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_thread_turn_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE CONSTRAINT TRIGGER project_thread_revision_is_consistent
AFTER INSERT ON petra.project_thread_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_project_thread_revision();
