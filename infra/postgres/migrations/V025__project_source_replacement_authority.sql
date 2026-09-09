ALTER TABLE petra.project_source_lifecycle_receipts
  ADD CONSTRAINT project_source_lifecycle_receipts_exact_record_key
  UNIQUE (
    project_source_lifecycle_receipt_id, revision, content_hash, record_hash
  );

CREATE TABLE petra.project_source_replacements (
  project_source_replacement_id text PRIMARY KEY CHECK (
    project_source_replacement_id
      ~ '^project_source_replacement_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  relationship text NOT NULL CHECK (relationship = 'supersedes'),
  replacement_kind text NOT NULL CHECK (
    replacement_kind IN (
      'newer_source_version', 'identity_resolution',
      'preferred_copy_changed', 'project_role_replacement'
    )
  ),
  replaced_project_source_id text NOT NULL,
  replaced_revision bigint NOT NULL CHECK (replaced_revision >= 1),
  replaced_content_hash text NOT NULL CHECK (
    replaced_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replaced_record_hash text NOT NULL CHECK (
    replaced_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replacement_project_source_id text NOT NULL,
  replacement_revision bigint NOT NULL CHECK (replacement_revision >= 1),
  replacement_content_hash text NOT NULL CHECK (
    replacement_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replacement_record_hash text NOT NULL CHECK (
    replacement_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  exclusion_receipt_id text NOT NULL,
  exclusion_receipt_revision bigint NOT NULL CHECK (
    exclusion_receipt_revision = 1
  ),
  exclusion_receipt_content_hash text NOT NULL CHECK (
    exclusion_receipt_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  exclusion_receipt_record_hash text NOT NULL CHECK (
    exclusion_receipt_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL,
  recorded_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.project-source-replacement')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'project_source_replacement_id'
        = project_source_replacement_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{content,relationship}' = relationship)
    CHECK (payload #>> '{content,replacement_kind}' = replacement_kind)
    CHECK (
      payload #>> '{content,replaced_source_ref,project_source_id}'
        = replaced_project_source_id
    )
    CHECK (
      (payload #>> '{content,replaced_source_ref,revision}')::bigint
        = replaced_revision
    )
    CHECK (
      payload #>> '{content,replaced_source_ref,content_hash}'
        = replaced_content_hash
    )
    CHECK (
      payload #>> '{content,replaced_source_ref,record_hash}'
        = replaced_record_hash
    )
    CHECK (
      payload #>> '{content,replaced_source_ref,status}' = 'excluded'
    )
    CHECK (
      payload #>> '{content,replacement_source_ref,project_source_id}'
        = replacement_project_source_id
    )
    CHECK (
      (payload #>> '{content,replacement_source_ref,revision}')::bigint
        = replacement_revision
    )
    CHECK (
      payload #>> '{content,replacement_source_ref,content_hash}'
        = replacement_content_hash
    )
    CHECK (
      payload #>> '{content,replacement_source_ref,record_hash}'
        = replacement_record_hash
    )
    CHECK (
      payload #>> '{content,replacement_source_ref,status}' = 'active'
    )
    CHECK (
      payload #>> '{content,exclusion_receipt_ref,project_source_lifecycle_receipt_id}'
        = exclusion_receipt_id
    )
    CHECK (
      (payload #>> '{content,exclusion_receipt_ref,revision}')::bigint
        = exclusion_receipt_revision
    )
    CHECK (
      payload #>> '{content,exclusion_receipt_ref,content_hash}'
        = exclusion_receipt_content_hash
    )
    CHECK (
      payload #>> '{content,exclusion_receipt_ref,record_hash}'
        = exclusion_receipt_record_hash
    )
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{recorded_by,actor_id}' = recorded_by_actor_id)
    CHECK (payload #>> '{recorded_by,actor_kind}' = recorded_by_actor_kind)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at),
  UNIQUE (project_id, replaced_project_source_id),
  CHECK (replaced_project_source_id <> replacement_project_source_id),
  FOREIGN KEY (project_id, replaced_project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (project_id, replacement_project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    replaced_project_source_id, replaced_revision,
    replaced_content_hash, replaced_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    replacement_project_source_id, replacement_revision,
    replacement_content_hash, replacement_record_hash
  ) REFERENCES petra.project_source_revisions (
    project_source_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    exclusion_receipt_id, exclusion_receipt_revision,
    exclusion_receipt_content_hash, exclusion_receipt_record_hash
  ) REFERENCES petra.project_source_lifecycle_receipts (
    project_source_lifecycle_receipt_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.validate_project_source_replacement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  creates_cycle boolean;
  downstream_depth bigint;
  upstream_depth bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_sources AS head
      JOIN petra.project_source_revisions AS revision
        ON revision.project_source_id = head.project_source_id
       AND revision.revision = head.current_revision
     WHERE head.project_id = NEW.project_id
       AND head.project_source_id = NEW.replaced_project_source_id
       AND revision.revision = NEW.replaced_revision
       AND revision.content_hash = NEW.replaced_content_hash
       AND revision.record_hash = NEW.replaced_record_hash
       AND revision.status = 'excluded'
  ) THEN
    RAISE EXCEPTION 'replaced ProjectSource must be the exact current excluded revision'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_source_lifecycle_receipts AS receipt
     WHERE receipt.project_id = NEW.project_id
       AND receipt.project_source_lifecycle_receipt_id =
           NEW.exclusion_receipt_id
       AND receipt.revision = NEW.exclusion_receipt_revision
       AND receipt.content_hash = NEW.exclusion_receipt_content_hash
       AND receipt.record_hash = NEW.exclusion_receipt_record_hash
       AND receipt.command_name = 'ExcludeProjectSource'
       AND receipt.project_source_id = NEW.replaced_project_source_id
       AND receipt.resulting_revision = NEW.replaced_revision
       AND receipt.resulting_content_hash = NEW.replaced_content_hash
       AND receipt.resulting_record_hash = NEW.replaced_record_hash
       AND receipt.resulting_status = 'excluded'
  ) THEN
    RAISE EXCEPTION 'ProjectSource supersession requires the exact predecessor exclusion receipt'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_sources AS head
      JOIN petra.project_source_revisions AS revision
        ON revision.project_source_id = head.project_source_id
       AND revision.revision = head.current_revision
     WHERE head.project_id = NEW.project_id
       AND head.project_source_id = NEW.replacement_project_source_id
       AND revision.revision = NEW.replacement_revision
       AND revision.content_hash = NEW.replacement_content_hash
       AND revision.record_hash = NEW.replacement_record_hash
       AND revision.status = 'active'
  ) THEN
    RAISE EXCEPTION 'replacement ProjectSource must be the exact current active revision'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE downstream(project_source_id, depth, path) AS (
    SELECT NEW.replacement_project_source_id, 0::bigint,
           ARRAY[NEW.replacement_project_source_id]
    UNION ALL
    SELECT edge.replacement_project_source_id, downstream.depth + 1,
           downstream.path || edge.replacement_project_source_id
      FROM downstream
      JOIN petra.project_source_replacements AS edge
        ON edge.project_id = NEW.project_id
       AND edge.replaced_project_source_id = downstream.project_source_id
     WHERE NOT edge.replacement_project_source_id = ANY(downstream.path)
  ),
  upstream(project_source_id, depth, path) AS (
    SELECT NEW.replaced_project_source_id, 0::bigint,
           ARRAY[NEW.replaced_project_source_id]
    UNION ALL
    SELECT edge.replaced_project_source_id, upstream.depth + 1,
           upstream.path || edge.replaced_project_source_id
      FROM upstream
      JOIN petra.project_source_replacements AS edge
        ON edge.project_id = NEW.project_id
       AND edge.replacement_project_source_id = upstream.project_source_id
     WHERE NOT edge.replaced_project_source_id = ANY(upstream.path)
  )
  SELECT
    EXISTS (
      SELECT 1 FROM downstream
       WHERE project_source_id = NEW.replaced_project_source_id
    ),
    (SELECT max(depth) FROM downstream),
    (SELECT max(depth) FROM upstream)
    INTO creates_cycle, downstream_depth, upstream_depth;

  IF creates_cycle THEN
    RAISE EXCEPTION 'ProjectSource replacement lineage cannot contain a cycle'
      USING ERRCODE = '23514';
  END IF;

  IF upstream_depth + 1 + downstream_depth > 32 THEN
    RAISE EXCEPTION 'ProjectSource replacement lineage exceeds 32 edges'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_source_replacement_is_valid
BEFORE INSERT ON petra.project_source_replacements
FOR EACH ROW EXECUTE FUNCTION petra.validate_project_source_replacement();

CREATE TRIGGER project_source_replacements_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_replacements
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_replacements_successor_idx
  ON petra.project_source_replacements (
    project_id, replacement_project_source_id
  );

COMMENT ON TABLE petra.project_source_replacements IS
  'Immutable bounded supersession lineage between exact retained ProjectSource revisions.';
