ALTER TABLE petra.project_source_replacements
  ADD CONSTRAINT project_source_replacements_exact_record_key
  UNIQUE (
    project_source_replacement_id, revision, content_hash, record_hash
  );

CREATE TABLE petra.project_source_replacement_heads (
  project_id text NOT NULL,
  replaced_project_source_id text NOT NULL,
  current_project_source_replacement_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('active', 'retracted')),
  head_revision bigint NOT NULL CHECK (head_revision >= 1),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (project_id, replaced_project_source_id),
  FOREIGN KEY (project_id, replaced_project_source_id)
    REFERENCES petra.project_sources (project_id, project_source_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (current_project_source_replacement_id)
    REFERENCES petra.project_source_replacements (
      project_source_replacement_id
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO petra.project_source_replacement_heads (
  project_id, replaced_project_source_id,
  current_project_source_replacement_id, state, head_revision, updated_at
)
SELECT project_id, replaced_project_source_id,
       project_source_replacement_id, 'active', 1, recorded_at
  FROM petra.project_source_replacements;

ALTER TABLE petra.project_source_replacements
  DROP CONSTRAINT
    project_source_replacements_project_id_replaced_project_sou_key;

CREATE TABLE petra.project_source_replacement_retractions (
  project_source_replacement_retraction_id text PRIMARY KEY CHECK (
    project_source_replacement_retraction_id
      ~ '^project_source_replacement_retraction_[0-9A-HJKMNP-TV-Z]{26}$'
  ),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  project_source_replacement_id text NOT NULL,
  replacement_revision bigint NOT NULL CHECK (replacement_revision = 1),
  replacement_content_hash text NOT NULL CHECK (
    replacement_content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  replacement_record_hash text NOT NULL CHECK (
    replacement_record_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 4000),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  retracted_by_actor_id text NOT NULL,
  retracted_by_actor_kind text NOT NULL,
  retracted_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (
      payload ->> 'schema_name'
        = 'petra.project-source-replacement-retraction'
    )
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (
      payload ->> 'project_source_replacement_retraction_id'
        = project_source_replacement_retraction_id
    )
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (
      payload #>> '{content,replacement_ref,project_source_replacement_id}'
        = project_source_replacement_id
    )
    CHECK (
      (payload #>> '{content,replacement_ref,revision}')::bigint
        = replacement_revision
    )
    CHECK (
      payload #>> '{content,replacement_ref,content_hash}'
        = replacement_content_hash
    )
    CHECK (
      payload #>> '{content,replacement_ref,record_hash}'
        = replacement_record_hash
    )
    CHECK (payload #>> '{content,reason}' = reason)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{retracted_by,actor_id}' = retracted_by_actor_id)
    CHECK (
      payload #>> '{retracted_by,actor_kind}' = retracted_by_actor_kind
    )
    CHECK ((payload ->> 'retracted_at')::timestamptz = retracted_at),
  UNIQUE (project_source_replacement_id),
  FOREIGN KEY (
    project_source_replacement_id, replacement_revision,
    replacement_content_hash, replacement_record_hash
  ) REFERENCES petra.project_source_replacements (
    project_source_replacement_id, revision, content_hash, record_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (retracted_by_actor_id, retracted_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION petra.validate_project_source_replacement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  creates_cycle boolean;
  downstream_depth bigint;
  upstream_depth bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'project-source-replacement-outgoing:' || NEW.project_id || ':' ||
      NEW.replaced_project_source_id,
      0
    )
  );

  IF EXISTS (
    SELECT 1
      FROM petra.project_source_replacement_heads AS head
     WHERE head.project_id = NEW.project_id
       AND head.replaced_project_source_id = NEW.replaced_project_source_id
       AND head.state = 'active'
  ) THEN
    RAISE EXCEPTION 'replaced ProjectSource already has an active successor'
      USING ERRCODE = '23505',
            CONSTRAINT = 'project_source_replacement_heads_active_key';
  END IF;

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
      JOIN petra.project_source_replacement_heads AS head
        ON head.project_id = NEW.project_id
       AND head.replaced_project_source_id = downstream.project_source_id
       AND head.state = 'active'
      JOIN petra.project_source_replacements AS edge
        ON edge.project_source_replacement_id =
           head.current_project_source_replacement_id
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
      JOIN petra.project_source_replacement_heads AS head
        ON head.project_id = edge.project_id
       AND head.replaced_project_source_id = edge.replaced_project_source_id
       AND head.current_project_source_replacement_id =
           edge.project_source_replacement_id
       AND head.state = 'active'
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

CREATE FUNCTION petra.activate_project_source_replacement_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO petra.project_source_replacement_heads (
    project_id, replaced_project_source_id,
    current_project_source_replacement_id, state, head_revision, updated_at
  ) VALUES (
    NEW.project_id, NEW.replaced_project_source_id,
    NEW.project_source_replacement_id, 'active', 1, NEW.recorded_at
  )
  ON CONFLICT (project_id, replaced_project_source_id) DO UPDATE
    SET current_project_source_replacement_id =
          EXCLUDED.current_project_source_replacement_id,
        state = 'active',
        head_revision =
          petra.project_source_replacement_heads.head_revision + 1,
        updated_at = EXCLUDED.updated_at
    WHERE petra.project_source_replacement_heads.state = 'retracted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'replaced ProjectSource already has an active successor'
      USING ERRCODE = '23505',
            CONSTRAINT = 'project_source_replacement_heads_active_key';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_source_replacement_activates_head
AFTER INSERT ON petra.project_source_replacements
FOR EACH ROW EXECUTE FUNCTION petra.activate_project_source_replacement_head();

CREATE FUNCTION petra.validate_project_source_replacement_retraction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  replacement_project_id text;
  replaced_source_id text;
BEGIN
  SELECT replacement.project_id, replacement.replaced_project_source_id
    INTO replacement_project_id, replaced_source_id
    FROM petra.project_source_replacements AS replacement
   WHERE replacement.project_source_replacement_id =
         NEW.project_source_replacement_id
     AND replacement.revision = NEW.replacement_revision
     AND replacement.content_hash = NEW.replacement_content_hash
     AND replacement.record_hash = NEW.replacement_record_hash;

  IF replacement_project_id IS NULL OR replacement_project_id <> NEW.project_id
  THEN
    RAISE EXCEPTION 'retraction must pin an exact replacement in the same Project'
      USING ERRCODE = '23514';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'project-source-replacement-outgoing:' || NEW.project_id || ':' ||
      replaced_source_id,
      0
    )
  );

  IF NOT EXISTS (
    SELECT 1
      FROM petra.project_source_replacement_heads AS head
     WHERE head.project_id = NEW.project_id
       AND head.replaced_project_source_id = replaced_source_id
       AND head.current_project_source_replacement_id =
           NEW.project_source_replacement_id
       AND head.state = 'active'
  ) THEN
    RAISE EXCEPTION 'only the current active replacement can be retracted'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.retract_project_source_replacement_head()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE petra.project_source_replacement_heads AS head
     SET state = 'retracted',
         head_revision = head.head_revision + 1,
         updated_at = NEW.retracted_at
    FROM petra.project_source_replacements AS replacement
   WHERE replacement.project_source_replacement_id =
         NEW.project_source_replacement_id
     AND head.project_id = NEW.project_id
     AND head.replaced_project_source_id =
         replacement.replaced_project_source_id
     AND head.current_project_source_replacement_id =
         NEW.project_source_replacement_id
     AND head.state = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'only the current active replacement can be retracted'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_source_replacement_retraction_is_valid
BEFORE INSERT ON petra.project_source_replacement_retractions
FOR EACH ROW
EXECUTE FUNCTION petra.validate_project_source_replacement_retraction();

CREATE TRIGGER project_source_retraction_retracts_head
AFTER INSERT ON petra.project_source_replacement_retractions
FOR EACH ROW EXECUTE FUNCTION petra.retract_project_source_replacement_head();

CREATE TRIGGER project_source_replacement_retractions_are_immutable
BEFORE UPDATE OR DELETE ON petra.project_source_replacement_retractions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX project_source_replacement_retractions_project_idx
  ON petra.project_source_replacement_retractions (
    project_id, project_source_replacement_id
  );

COMMENT ON TABLE petra.project_source_replacement_heads IS
  'Derived current effectiveness pointer for immutable ProjectSource replacement and retraction history.';

COMMENT ON TABLE petra.project_source_replacement_retractions IS
  'Immutable command-granular compensation of one exact supersession relation; it does not restore either source.';
