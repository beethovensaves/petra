CREATE FUNCTION petra.guard_canonical_entity_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'canonical entities cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.entity_id <> OLD.entity_id
     OR NEW.entity_kind <> OLD.entity_kind
     OR NEW.created_by_actor_id <> OLD.created_by_actor_id
     OR NEW.created_by_actor_kind <> OLD.created_by_actor_kind
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'canonical entity identity and authorship are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.current_revision <> OLD.current_revision + 1 THEN
    RAISE EXCEPTION 'canonical entity current revision must advance exactly once'
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.canonical_entities (
  entity_id text PRIMARY KEY,
  entity_kind text NOT NULL CHECK (
    entity_kind IN ('author', 'work', 'work_version', 'external_identifier')
  ),
  current_revision bigint NOT NULL CHECK (current_revision >= 1),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (entity_id, entity_kind),
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (entity_kind = 'author'
      AND entity_id ~ '^author_[0-9A-HJKMNP-TV-Z]{26}$')
    OR (entity_kind = 'work'
      AND entity_id ~ '^work_[0-9A-HJKMNP-TV-Z]{26}$')
    OR (entity_kind = 'work_version'
      AND entity_id ~ '^work_version_[0-9A-HJKMNP-TV-Z]{26}$')
    OR (entity_kind = 'external_identifier'
      AND entity_id ~ '^external_identifier_[0-9A-HJKMNP-TV-Z]{26}$')
  )
);

CREATE TABLE petra.canonical_entity_revisions (
  entity_id text NOT NULL,
  entity_kind text NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  schema_name text NOT NULL,
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (entity_id, revision),
  UNIQUE (entity_id, entity_kind, revision),
  FOREIGN KEY (entity_id, entity_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (entity_kind = 'author' AND schema_name = 'petra.author')
    OR (entity_kind = 'work' AND schema_name = 'petra.work')
    OR (entity_kind = 'work_version' AND schema_name = 'petra.work-version')
    OR (entity_kind = 'external_identifier'
      AND schema_name = 'petra.external-identifier')
  ),
  CHECK (payload ->> 'schema_name' = schema_name),
  CHECK (payload ->> 'schema_version' = schema_version),
  CHECK ((payload ->> 'revision')::bigint = revision),
  CHECK (
    payload ->> CASE entity_kind
      WHEN 'author' THEN 'author_id'
      WHEN 'work' THEN 'work_id'
      WHEN 'work_version' THEN 'work_version_id'
      WHEN 'external_identifier' THEN 'external_identifier_id'
    END = entity_id
  )
);

ALTER TABLE petra.canonical_entities
  ADD CONSTRAINT canonical_entities_current_revision_fkey
  FOREIGN KEY (entity_id, entity_kind, current_revision)
  REFERENCES petra.canonical_entity_revisions (
    entity_id, entity_kind, revision
  )
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER canonical_entity_identity_is_immutable
BEFORE UPDATE OR DELETE ON petra.canonical_entities
FOR EACH ROW EXECUTE FUNCTION petra.guard_canonical_entity_identity();

CREATE TRIGGER canonical_entity_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.canonical_entity_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TABLE petra.author_revisions (
  author_id text NOT NULL,
  entity_kind text NOT NULL DEFAULT 'author' CHECK (entity_kind = 'author'),
  revision bigint NOT NULL,
  author_kind text NOT NULL
    CHECK (author_kind IN ('person', 'organization', 'consortium')),
  display_name text NOT NULL
    CHECK (char_length(display_name) BETWEEN 1 AND 400),
  identity_status text NOT NULL
    CHECK (identity_status IN ('resolved', 'provisional', 'disputed')),
  PRIMARY KEY (author_id, revision),
  FOREIGN KEY (author_id, entity_kind, revision)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, entity_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.work_revisions (
  work_id text NOT NULL,
  entity_kind text NOT NULL DEFAULT 'work' CHECK (entity_kind = 'work'),
  revision bigint NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 2000),
  work_kind text NOT NULL CHECK (
    work_kind IN (
      'journal_article', 'conference_paper', 'preprint', 'thesis', 'book',
      'chapter', 'other'
    )
  ),
  identity_status text NOT NULL
    CHECK (identity_status IN ('resolved', 'provisional', 'disputed')),
  PRIMARY KEY (work_id, revision),
  UNIQUE (work_id, entity_kind, revision),
  FOREIGN KEY (work_id, entity_kind, revision)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, entity_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.work_author_credits (
  work_id text NOT NULL,
  work_entity_kind text NOT NULL DEFAULT 'work'
    CHECK (work_entity_kind = 'work'),
  work_revision bigint NOT NULL,
  author_id text NOT NULL,
  author_entity_kind text NOT NULL DEFAULT 'author'
    CHECK (author_entity_kind = 'author'),
  position bigint NOT NULL CHECK (position >= 1),
  credit_role text NOT NULL CHECK (credit_role IN ('author', 'editor')),
  corresponding boolean,
  PRIMARY KEY (work_id, work_revision, position),
  FOREIGN KEY (work_id, work_entity_kind, work_revision)
    REFERENCES petra.work_revisions (work_id, entity_kind, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (author_id, author_entity_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.work_version_revisions (
  work_version_id text NOT NULL,
  entity_kind text NOT NULL DEFAULT 'work_version'
    CHECK (entity_kind = 'work_version'),
  revision bigint NOT NULL,
  work_id text NOT NULL,
  work_entity_kind text NOT NULL DEFAULT 'work'
    CHECK (work_entity_kind = 'work'),
  version_label text NOT NULL
    CHECK (char_length(version_label) BETWEEN 1 AND 400),
  publication_status text NOT NULL CHECK (
    publication_status IN (
      'preprint', 'peer_reviewed', 'accepted', 'corrected', 'retracted',
      'unknown'
    )
  ),
  published_date_precision text
    CHECK (published_date_precision IN ('year', 'month', 'day')),
  published_date_value text,
  metadata_source_kind text NOT NULL CHECK (
    metadata_source_kind IN (
      'registry', 'repository', 'publisher', 'provider', 'user'
    )
  ),
  metadata_source_name text NOT NULL
    CHECK (char_length(metadata_source_name) BETWEEN 1 AND 200),
  metadata_source_record_id text CHECK (
    metadata_source_record_id IS NULL
    OR char_length(metadata_source_record_id) BETWEEN 1 AND 2000
  ),
  metadata_retrieved_at timestamptz NOT NULL,
  PRIMARY KEY (work_version_id, revision),
  FOREIGN KEY (work_version_id, entity_kind, revision)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, entity_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (work_id, work_entity_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (published_date_precision IS NULL AND published_date_value IS NULL)
    OR (
      published_date_precision IS NOT NULL AND published_date_value IS NOT NULL
      AND (
        (published_date_precision = 'year'
          AND published_date_value ~ '^[0-9]{4}$')
        OR (published_date_precision = 'month'
          AND published_date_value ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
        OR (published_date_precision = 'day'
          AND published_date_value ~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])$')
      )
    )
  )
);

CREATE TABLE petra.external_identifier_revisions (
  external_identifier_id text NOT NULL,
  entity_kind text NOT NULL DEFAULT 'external_identifier'
    CHECK (entity_kind = 'external_identifier'),
  revision bigint NOT NULL,
  subject_kind text NOT NULL
    CHECK (subject_kind IN ('author', 'work', 'work_version')),
  subject_id text NOT NULL,
  namespace text NOT NULL CHECK (
    namespace IN (
      'doi', 'openalex_work', 'semantic_scholar_work', 'acl_anthology',
      'arxiv', 'pmid', 'isbn', 'orcid', 'openalex_author', 'repository_url'
    )
  ),
  normalized_value text NOT NULL
    CHECK (char_length(normalized_value) BETWEEN 1 AND 2000),
  source_name text NOT NULL
    CHECK (char_length(source_name) BETWEEN 1 AND 200),
  verification_status text NOT NULL CHECK (
    verification_status IN (
      'verified', 'source_reported', 'unverified', 'disputed'
    )
  ),
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (external_identifier_id, revision),
  FOREIGN KEY (external_identifier_id, entity_kind, revision)
    REFERENCES petra.canonical_entity_revisions (
      entity_id, entity_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (subject_id, subject_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER author_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.author_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER work_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.work_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER work_author_credits_are_immutable
BEFORE UPDATE OR DELETE ON petra.work_author_credits
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER work_version_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.work_version_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER external_identifier_revisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.external_identifier_revisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX author_revisions_identity_idx
  ON petra.author_revisions (identity_status, display_name, author_id);
CREATE INDEX work_revisions_identity_idx
  ON petra.work_revisions (identity_status, work_kind, work_id);
CREATE INDEX work_revisions_title_idx
  ON petra.work_revisions (title, work_id);
CREATE INDEX work_version_revisions_work_idx
  ON petra.work_version_revisions (work_id, publication_status, work_version_id);
CREATE INDEX external_identifier_lookup_idx
  ON petra.external_identifier_revisions (
    namespace, normalized_value, subject_kind, subject_id
  );

COMMENT ON TABLE petra.canonical_entities IS
  'Stable global scholarly identities and guarded current-revision pointers.';
COMMENT ON TABLE petra.canonical_entity_revisions IS
  'Immutable canonical payload history shared by typed scholarly identity tables.';
