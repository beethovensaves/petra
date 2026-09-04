ALTER TABLE petra.artifact_manifests
  ADD CONSTRAINT artifact_manifests_identity_content_key
  UNIQUE (artifact_manifest_id, artifact_id, storage_content_hash);

CREATE TABLE petra.parsed_documents (
  parsed_document_id text PRIMARY KEY
    CHECK (parsed_document_id ~ '^parsed_document_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  source_artifact_id text NOT NULL,
  source_artifact_content_hash text NOT NULL
    CHECK (source_artifact_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  source_artifact_manifest_id text NOT NULL,
  parser_output_artifact_id text NOT NULL,
  work_version_id text NOT NULL,
  work_version_kind text NOT NULL DEFAULT 'work_version'
    CHECK (work_version_kind = 'work_version'),
  parser_run_id text NOT NULL UNIQUE
    CHECK (parser_run_id ~ '^parser_run_[0-9A-HJKMNP-TV-Z]{26}$'),
  source_format text NOT NULL CHECK (
    source_format IN (
      'pdf', 'html', 'xml', 'json', 'plain_text', 'code', 'image', 'other'
    )
  ),
  document_language text,
  adapter_name text NOT NULL CHECK (char_length(adapter_name) BETWEEN 1 AND 200),
  adapter_version text NOT NULL
    CHECK (char_length(adapter_version) BETWEEN 1 AND 100),
  normalization_version text NOT NULL
    CHECK (char_length(normalization_version) BETWEEN 1 AND 100),
  parser_name text NOT NULL CHECK (char_length(parser_name) BETWEEN 1 AND 200),
  parser_version text NOT NULL
    CHECK (char_length(parser_version) BETWEEN 1 AND 100),
  parser_configuration_hash text NOT NULL
    CHECK (parser_configuration_hash ~ '^sha256:[0-9a-f]{64}$'),
  parser_started_at timestamptz NOT NULL,
  parser_completed_at timestamptz NOT NULL
    CHECK (parser_completed_at >= parser_started_at),
  quality_state text NOT NULL
    CHECK (quality_state IN ('complete', 'partial', 'needs_ocr', 'failed')),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.parsed-document'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'parsed_document_id' = parsed_document_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'source_artifact_id' = source_artifact_id)
    CHECK (payload ->> 'source_artifact_content_hash' = source_artifact_content_hash)
    CHECK (payload ->> 'parser_output_artifact_id' = parser_output_artifact_id)
    CHECK (payload ->> 'work_version_id' = work_version_id)
    CHECK (payload ->> 'parser_run_id' = parser_run_id)
    CHECK (payload ->> 'source_format' = source_format)
    CHECK (payload ->> 'normalization_version' = normalization_version)
    CHECK (payload ->> 'quality_state' = quality_state),
  created_at timestamptz NOT NULL CHECK (created_at >= parser_completed_at),
  UNIQUE (
    parsed_document_id,
    parser_run_id,
    source_artifact_id,
    source_artifact_content_hash,
    normalization_version
  ),
  FOREIGN KEY (source_artifact_id, source_artifact_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    source_artifact_manifest_id,
    source_artifact_id,
    source_artifact_content_hash
  ) REFERENCES petra.artifact_manifests (
    artifact_manifest_id,
    artifact_id,
    storage_content_hash
  )
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (parser_output_artifact_id)
    REFERENCES petra.artifacts (artifact_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id, work_version_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.parsed_document_block_declarations (
  parsed_document_id text NOT NULL,
  reading_order bigint NOT NULL CHECK (reading_order >= 0),
  structural_block_id text NOT NULL
    CHECK (structural_block_id ~ '^structural_block_[0-9A-HJKMNP-TV-Z]{26}$'),
  PRIMARY KEY (parsed_document_id, structural_block_id),
  UNIQUE (parsed_document_id, reading_order),
  UNIQUE (parsed_document_id, structural_block_id, reading_order),
  FOREIGN KEY (parsed_document_id)
    REFERENCES petra.parsed_documents (parsed_document_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.structural_blocks (
  structural_block_id text PRIMARY KEY
    CHECK (structural_block_id ~ '^structural_block_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  parsed_document_id text NOT NULL,
  block_kind text NOT NULL CHECK (
    block_kind IN (
      'document_title', 'heading', 'paragraph', 'sentence', 'list',
      'list_item', 'footnote', 'reference', 'formula', 'table', 'table_row',
      'table_cell', 'figure', 'caption', 'code_block', 'other'
    )
  ),
  content_layer text NOT NULL
    CHECK (content_layer IN ('source_native', 'ocr', 'parser_derived', 'visual_only')),
  reading_order bigint NOT NULL CHECK (reading_order >= 0),
  parent_block_id text,
  previous_block_id text,
  next_block_id text,
  content_kind text NOT NULL
    CHECK (content_kind IN ('text', 'structured_artifact', 'visual_only')),
  content_hash text
    CHECK (content_hash IS NULL OR content_hash ~ '^sha256:[0-9a-f]{64}$'),
  structured_artifact_id text,
  schema_name text NOT NULL CHECK (schema_name = 'petra.structural-block'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'structural_block_id' = structural_block_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'parsed_document_id' = parsed_document_id)
    CHECK (payload ->> 'block_kind' = block_kind)
    CHECK (payload ->> 'content_layer' = content_layer)
    CHECK ((payload ->> 'reading_order')::bigint = reading_order)
    CHECK (payload #>> '{content,content_kind}' = content_kind),
  created_at timestamptz NOT NULL,
  UNIQUE (parsed_document_id, structural_block_id),
  FOREIGN KEY (parsed_document_id, structural_block_id, reading_order)
    REFERENCES petra.parsed_document_block_declarations (
      parsed_document_id, structural_block_id, reading_order
    )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (parsed_document_id, parent_block_id)
    REFERENCES petra.parsed_document_block_declarations (
      parsed_document_id, structural_block_id
    )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (parsed_document_id, previous_block_id)
    REFERENCES petra.parsed_document_block_declarations (
      parsed_document_id, structural_block_id
    )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (parsed_document_id, next_block_id)
    REFERENCES petra.parsed_document_block_declarations (
      parsed_document_id, structural_block_id
    )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (structured_artifact_id)
    REFERENCES petra.artifacts (artifact_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (
      content_kind = 'text'
      AND content_hash IS NOT NULL
      AND structured_artifact_id IS NULL
    )
    OR (
      content_kind = 'structured_artifact'
      AND content_hash IS NOT NULL
      AND structured_artifact_id IS NOT NULL
    )
    OR (
      content_kind = 'visual_only'
      AND content_hash IS NULL
      AND structured_artifact_id IS NULL
    )
  )
);

ALTER TABLE petra.parsed_document_block_declarations
  ADD CONSTRAINT parsed_document_block_declaration_resolves_fkey
  FOREIGN KEY (parsed_document_id, structural_block_id)
  REFERENCES petra.structural_blocks (parsed_document_id, structural_block_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.structural_block_children (
  parsed_document_id text NOT NULL,
  parent_block_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  child_block_id text NOT NULL,
  PRIMARY KEY (parsed_document_id, parent_block_id, position),
  UNIQUE (parsed_document_id, parent_block_id, child_block_id),
  FOREIGN KEY (parsed_document_id, parent_block_id)
    REFERENCES petra.structural_blocks (parsed_document_id, structural_block_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (parsed_document_id, child_block_id)
    REFERENCES petra.structural_blocks (parsed_document_id, structural_block_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE petra.structural_block_span_declarations (
  parsed_document_id text NOT NULL,
  structural_block_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  source_span_id text NOT NULL
    CHECK (source_span_id ~ '^source_span_[0-9A-HJKMNP-TV-Z]{26}$'),
  PRIMARY KEY (parsed_document_id, structural_block_id, position),
  UNIQUE (source_span_id),
  UNIQUE (parsed_document_id, structural_block_id, source_span_id),
  FOREIGN KEY (parsed_document_id, structural_block_id)
    REFERENCES petra.structural_blocks (parsed_document_id, structural_block_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE petra.source_spans (
  source_span_id text PRIMARY KEY
    CHECK (source_span_id ~ '^source_span_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  artifact_id text NOT NULL,
  artifact_content_hash text NOT NULL
    CHECK (artifact_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  parsed_document_id text NOT NULL,
  parser_run_id text NOT NULL,
  structural_block_id text NOT NULL,
  selector_schema_version text NOT NULL CHECK (selector_schema_version = '1.0.0'),
  selector_type text NOT NULL CHECK (
    selector_type IN (
      'text_quote', 'page_region', 'section_path', 'json_pointer',
      'line_range', 'compound'
    )
  ),
  selected_text_hash text
    CHECK (selected_text_hash IS NULL OR selected_text_hash ~ '^sha256:[0-9a-f]{64}$'),
  start_codepoint bigint,
  end_codepoint bigint,
  page_number bigint CHECK (page_number IS NULL OR page_number >= 1),
  section_path text[],
  json_pointer text,
  start_line bigint,
  end_line bigint,
  extraction_method text NOT NULL
    CHECK (
      extraction_method IN (
        'embedded_text', 'ocr', 'structured_source', 'parser_alignment',
        'manual_selection', 'visual_region'
      )
    ),
  extraction_method_version text NOT NULL
    CHECK (char_length(extraction_method_version) BETWEEN 1 AND 100),
  normalization_version text NOT NULL
    CHECK (char_length(normalization_version) BETWEEN 1 AND 100),
  verification_status text NOT NULL CHECK (
    verification_status IN (
      'exact_text_and_geometry', 'normalized', 'visual_only',
      'manual_alignment', 'unresolved'
    )
  ),
  verified_at timestamptz NOT NULL,
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.source-span'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'source_span_id' = source_span_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'artifact_id' = artifact_id)
    CHECK (payload ->> 'artifact_content_hash' = artifact_content_hash)
    CHECK (payload ->> 'parsed_document_id' = parsed_document_id)
    CHECK (payload ->> 'parser_run_id' = parser_run_id)
    CHECK (payload ->> 'structural_block_id' = structural_block_id)
    CHECK (payload ->> 'selector_schema_version' = selector_schema_version)
    CHECK (payload #>> '{selector,selector_type}' = selector_type)
    CHECK (payload #>> '{extraction,method}' = extraction_method)
    CHECK (payload #>> '{extraction,normalization_version}' = normalization_version)
    CHECK (payload #>> '{verification,status}' = verification_status),
  created_at timestamptz NOT NULL CHECK (created_at >= verified_at),
  FOREIGN KEY (
    parsed_document_id,
    parser_run_id,
    artifact_id,
    artifact_content_hash,
    normalization_version
  ) REFERENCES petra.parsed_documents (
    parsed_document_id,
    parser_run_id,
    source_artifact_id,
    source_artifact_content_hash,
    normalization_version
  )
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (parsed_document_id, structural_block_id, source_span_id)
    REFERENCES petra.structural_block_span_declarations (
      parsed_document_id, structural_block_id, source_span_id
    )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (start_codepoint IS NULL AND end_codepoint IS NULL)
    OR (
      start_codepoint IS NOT NULL
      AND end_codepoint IS NOT NULL
      AND start_codepoint >= 0
      AND end_codepoint > start_codepoint
    )
  ),
  CHECK (
    (start_line IS NULL AND end_line IS NULL)
    OR (
      start_line IS NOT NULL
      AND end_line IS NOT NULL
      AND start_line >= 1
      AND end_line >= start_line
    )
  )
);

ALTER TABLE petra.structural_block_span_declarations
  ADD CONSTRAINT structural_block_span_declaration_resolves_fkey
  FOREIGN KEY (source_span_id)
  REFERENCES petra.source_spans (source_span_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION petra.validate_document_block_declarations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  document_id text;
  expected jsonb;
  observed jsonb;
BEGIN
  document_id := NEW.parsed_document_id;

  SELECT payload -> 'block_ids' INTO expected
    FROM petra.parsed_documents
   WHERE parsed_document_id = document_id;

  SELECT COALESCE(jsonb_agg(structural_block_id ORDER BY reading_order), '[]'::jsonb)
    INTO observed
    FROM petra.parsed_document_block_declarations
   WHERE parsed_document_id = document_id;

  IF expected IS NULL OR expected <> observed THEN
    RAISE EXCEPTION 'ParsedDocument block declarations must exactly match block_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION petra.require_parsed_document_permission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
    FROM petra.artifact_manifests AS manifest
    JOIN petra.rights_decisions AS rights
      ON rights.rights_decision_id = manifest.rights_decision_id
     AND rights.artifact_manifest_id = manifest.artifact_manifest_id
   WHERE manifest.artifact_manifest_id = NEW.source_artifact_manifest_id
     AND manifest.artifact_id = NEW.source_artifact_id
     AND manifest.storage_content_hash = NEW.source_artifact_content_hash
     AND rights.parse_permitted;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ParsedDocument source acquisition must explicitly permit parsing'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_structural_block_children()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  document_id text;
  block_id text;
  expected jsonb;
  observed jsonb;
BEGIN
  IF TG_TABLE_NAME = 'structural_blocks' THEN
    document_id := NEW.parsed_document_id;
    block_id := NEW.structural_block_id;
  ELSE
    document_id := NEW.parsed_document_id;
    block_id := NEW.parent_block_id;
  END IF;

  SELECT payload -> 'child_block_ids' INTO expected
    FROM petra.structural_blocks
   WHERE parsed_document_id = document_id
     AND structural_block_id = block_id;

  SELECT COALESCE(jsonb_agg(child_block_id ORDER BY position), '[]'::jsonb)
    INTO observed
    FROM petra.structural_block_children
   WHERE parsed_document_id = document_id
     AND parent_block_id = block_id;

  IF expected IS NULL OR expected <> observed THEN
    RAISE EXCEPTION 'StructuralBlock child declarations must exactly match child_block_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION petra.validate_structural_block_spans()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  document_id text;
  block_id text;
  expected jsonb;
  observed jsonb;
BEGIN
  document_id := NEW.parsed_document_id;
  block_id := NEW.structural_block_id;

  SELECT payload -> 'source_span_ids' INTO expected
    FROM petra.structural_blocks
   WHERE parsed_document_id = document_id
     AND structural_block_id = block_id;

  SELECT COALESCE(jsonb_agg(source_span_id ORDER BY position), '[]'::jsonb)
    INTO observed
    FROM petra.structural_block_span_declarations
   WHERE parsed_document_id = document_id
     AND structural_block_id = block_id;

  IF expected IS NULL OR expected <> observed THEN
    RAISE EXCEPTION 'StructuralBlock span declarations must exactly match source_span_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION petra.guard_document_block_declaration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_block_id text;
BEGIN
  SELECT payload -> 'block_ids' ->> NEW.reading_order::integer
    INTO expected_block_id
    FROM petra.parsed_documents
   WHERE parsed_document_id = NEW.parsed_document_id;

  IF expected_block_id IS NULL
     OR expected_block_id <> NEW.structural_block_id THEN
    RAISE EXCEPTION 'ParsedDocument block declaration does not match block_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_structural_block_child()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_child_id text;
BEGIN
  SELECT payload -> 'child_block_ids' ->> (NEW.position - 1)::integer
    INTO expected_child_id
    FROM petra.structural_blocks
   WHERE parsed_document_id = NEW.parsed_document_id
     AND structural_block_id = NEW.parent_block_id;

  IF expected_child_id IS NULL
     OR expected_child_id <> NEW.child_block_id THEN
    RAISE EXCEPTION 'StructuralBlock child declaration does not match child_block_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_structural_block_span_declaration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_source_span_id text;
BEGIN
  SELECT payload -> 'source_span_ids' ->> (NEW.position - 1)::integer
    INTO expected_source_span_id
    FROM petra.structural_blocks
   WHERE parsed_document_id = NEW.parsed_document_id
     AND structural_block_id = NEW.structural_block_id;

  IF expected_source_span_id IS NULL
     OR expected_source_span_id <> NEW.source_span_id THEN
    RAISE EXCEPTION 'StructuralBlock span declaration does not match source_span_ids order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER parsed_document_blocks_are_complete
AFTER INSERT ON petra.parsed_documents
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_document_block_declarations();

CREATE TRIGGER parsed_document_block_order_is_exact
BEFORE INSERT ON petra.parsed_document_block_declarations
FOR EACH ROW EXECUTE FUNCTION petra.guard_document_block_declaration();

CREATE CONSTRAINT TRIGGER structural_block_children_are_complete
AFTER INSERT ON petra.structural_blocks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_structural_block_children();

CREATE TRIGGER structural_block_child_order_is_exact
BEFORE INSERT ON petra.structural_block_children
FOR EACH ROW EXECUTE FUNCTION petra.guard_structural_block_child();

CREATE CONSTRAINT TRIGGER structural_block_spans_are_complete
AFTER INSERT ON petra.structural_blocks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_structural_block_spans();

CREATE TRIGGER structural_block_span_order_is_exact
BEFORE INSERT ON petra.structural_block_span_declarations
FOR EACH ROW EXECUTE FUNCTION petra.guard_structural_block_span_declaration();

CREATE TRIGGER parsed_document_source_is_parse_permitted
BEFORE INSERT ON petra.parsed_documents
FOR EACH ROW EXECUTE FUNCTION petra.require_parsed_document_permission();

CREATE TRIGGER parsed_documents_are_immutable
BEFORE UPDATE OR DELETE ON petra.parsed_documents
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER parsed_document_block_declarations_are_immutable
BEFORE UPDATE OR DELETE ON petra.parsed_document_block_declarations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER structural_blocks_are_immutable
BEFORE UPDATE OR DELETE ON petra.structural_blocks
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER structural_block_children_are_immutable
BEFORE UPDATE OR DELETE ON petra.structural_block_children
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER structural_block_span_declarations_are_immutable
BEFORE UPDATE OR DELETE ON petra.structural_block_span_declarations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER source_spans_are_immutable
BEFORE UPDATE OR DELETE ON petra.source_spans
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX parsed_documents_source_idx
  ON petra.parsed_documents (
    source_artifact_id, source_artifact_content_hash, created_at
  );
CREATE INDEX parsed_documents_work_version_idx
  ON petra.parsed_documents (work_version_id, created_at);
CREATE INDEX structural_blocks_document_order_idx
  ON petra.structural_blocks (parsed_document_id, reading_order);
CREATE INDEX source_spans_artifact_idx
  ON petra.source_spans (artifact_id, created_at, source_span_id);
CREATE INDEX source_spans_document_idx
  ON petra.source_spans (
    parsed_document_id, structural_block_id, source_span_id
  );
CREATE INDEX source_spans_text_hash_idx
  ON petra.source_spans (selected_text_hash)
  WHERE selected_text_hash IS NOT NULL;
CREATE INDEX source_spans_page_idx
  ON petra.source_spans (parsed_document_id, page_number)
  WHERE page_number IS NOT NULL;

COMMENT ON TABLE petra.parsed_documents IS
  'Immutable parser-run interpretations bound to exact source and parser-output Artifacts.';
COMMENT ON TABLE petra.structural_blocks IS
  'Immutable ordered document structure declared by one ParsedDocument.';
COMMENT ON TABLE petra.source_spans IS
  'Immutable queryable evidence locations bound to exact bytes, parser run, document, and block.';
