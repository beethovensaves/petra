ALTER TABLE petra.project_definition_revisions
  ADD CONSTRAINT project_definition_revisions_exact_record_key
  UNIQUE (
    project_id,
    project_definition_id,
    revision,
    content_hash,
    record_hash
  );

CREATE TABLE petra.project_definition_history_bindings (
  project_id text NOT NULL,
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
  effective_after_stream_revision bigint NOT NULL CHECK (
    effective_after_stream_revision >= 0
  ),
  captured_at timestamptz NOT NULL,
  PRIMARY KEY (project_definition_id, project_definition_revision),
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
  ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX project_definition_history_bindings_lookup_idx
  ON petra.project_definition_history_bindings (
    project_id,
    effective_after_stream_revision DESC,
    project_definition_revision DESC
  );

CREATE FUNCTION petra.capture_project_definition_history_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  boundary_revision bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('project:' || NEW.project_id, 0)
  );

  SELECT current_stream_revision
    INTO boundary_revision
    FROM petra.project_event_stream_heads
   WHERE project_id = NEW.project_id;

  INSERT INTO petra.project_definition_history_bindings (
    project_id,
    project_definition_id,
    project_definition_revision,
    project_definition_content_hash,
    project_definition_record_hash,
    effective_after_stream_revision,
    captured_at
  ) VALUES (
    NEW.project_id,
    NEW.project_definition_id,
    NEW.revision,
    NEW.content_hash,
    NEW.record_hash,
    COALESCE(boundary_revision, 0),
    transaction_timestamp()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_definition_history_binding_is_captured
AFTER INSERT ON petra.project_definition_revisions
FOR EACH ROW EXECUTE FUNCTION petra.capture_project_definition_history_binding();

INSERT INTO petra.project_definition_history_bindings (
  project_id,
  project_definition_id,
  project_definition_revision,
  project_definition_content_hash,
  project_definition_record_hash,
  effective_after_stream_revision,
  captured_at
)
SELECT revision.project_id,
       revision.project_definition_id,
       revision.revision,
       revision.content_hash,
       revision.record_hash,
       COALESCE(stream.current_stream_revision, 0),
       transaction_timestamp()
  FROM petra.project_definitions AS head
  JOIN petra.project_definition_revisions AS revision
    ON revision.project_definition_id = head.project_definition_id
   AND revision.revision = head.current_revision
  LEFT JOIN petra.project_event_stream_heads AS stream
    ON stream.project_id = revision.project_id;

CREATE TRIGGER project_definition_history_bindings_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_definition_history_bindings
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
