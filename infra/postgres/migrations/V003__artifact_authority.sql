CREATE TABLE petra.artifacts (
  artifact_id text PRIMARY KEY
    CHECK (artifact_id ~ '^artifact_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  artifact_kind text NOT NULL CHECK (
    artifact_kind IN (
      'pdf', 'html', 'structured_text', 'dataset', 'code',
      'environment_lock', 'run_output', 'image', 'export'
    )
  ),
  media_type text NOT NULL
    CHECK (char_length(media_type) BETWEEN 3 AND 300),
  content_hash text NOT NULL UNIQUE
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  byte_size bigint NOT NULL
    CHECK (byte_size BETWEEN 0 AND 9007199254740991),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.artifact'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'artifact_id' = artifact_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'artifact_kind' = artifact_kind)
    CHECK (payload ->> 'media_type' = media_type)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'byte_size')::bigint = byte_size),
  created_at timestamptz NOT NULL,
  UNIQUE (artifact_id, content_hash),
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.artifact_manifests (
  artifact_manifest_id text PRIMARY KEY
    CHECK (artifact_manifest_id ~ '^artifact_manifest_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  artifact_id text NOT NULL,
  rights_decision_id text NOT NULL UNIQUE
    CHECK (rights_decision_id ~ '^rights_decision_[0-9A-HJKMNP-TV-Z]{26}$'),
  origin_kind text NOT NULL
    CHECK (origin_kind IN ('acquired', 'user_supplied', 'generated')),
  origin_work_version_id text,
  origin_work_version_kind text,
  origin_actor_id text,
  origin_actor_kind text,
  origin_source_connector text,
  origin_connector_version text,
  origin_source_location text,
  origin_original_filename text,
  origin_generator_name text,
  origin_generator_version text,
  origin_at timestamptz NOT NULL,
  storage_kind text NOT NULL CHECK (storage_kind = 'content_addressed_object'),
  store_name text NOT NULL CHECK (char_length(store_name) BETWEEN 1 AND 200),
  object_key text NOT NULL CHECK (char_length(object_key) BETWEEN 1 AND 4000),
  storage_content_hash text NOT NULL
    CHECK (storage_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  availability text NOT NULL CHECK (availability = 'available'),
  storage_verified_at timestamptz NOT NULL,
  integrity_status text NOT NULL
    CHECK (integrity_status IN ('verified', 'verified_with_warnings')),
  integrity_checked_at timestamptz NOT NULL,
  recorded_by_actor_id text NOT NULL,
  recorded_by_actor_kind text NOT NULL,
  schema_name text NOT NULL CHECK (schema_name = 'petra.artifact-manifest'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'artifact_manifest_id' = artifact_manifest_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'artifact_id' = artifact_id)
    CHECK (payload ->> 'rights_decision_id' = rights_decision_id)
    CHECK (payload #>> '{origin,origin_kind}' = origin_kind)
    CHECK (payload #>> '{storage_ref,storage_kind}' = storage_kind)
    CHECK (payload #>> '{storage_ref,store_name}' = store_name)
    CHECK (payload #>> '{storage_ref,object_key}' = object_key)
    CHECK (payload #>> '{storage_ref,content_hash}' = storage_content_hash)
    CHECK (payload #>> '{storage_ref,availability}' = availability)
    CHECK (payload #>> '{integrity,status}' = integrity_status),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (artifact_id, storage_content_hash)
    REFERENCES petra.artifacts (artifact_id, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (origin_work_version_id, origin_work_version_kind)
    REFERENCES petra.canonical_entities (entity_id, entity_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (origin_actor_id, origin_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by_actor_id, recorded_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (origin_work_version_id IS NULL AND origin_work_version_kind IS NULL)
    OR (
      origin_work_version_id IS NOT NULL
      AND origin_work_version_kind = 'work_version'
    )
  ),
  CHECK (
    (origin_actor_id IS NULL AND origin_actor_kind IS NULL)
    OR (origin_actor_id IS NOT NULL AND origin_actor_kind IS NOT NULL)
  ),
  CHECK (
    (
      origin_kind = 'acquired'
      AND origin_work_version_id IS NOT NULL
      AND origin_actor_id IS NULL
      AND origin_source_connector IS NOT NULL
      AND origin_connector_version IS NOT NULL
      AND origin_source_location IS NOT NULL
      AND origin_original_filename IS NULL
      AND origin_generator_name IS NULL
      AND origin_generator_version IS NULL
    )
    OR (
      origin_kind = 'user_supplied'
      AND origin_actor_id IS NOT NULL
      AND origin_source_connector IS NULL
      AND origin_connector_version IS NULL
      AND origin_source_location IS NULL
      AND origin_original_filename IS NOT NULL
      AND origin_generator_name IS NULL
      AND origin_generator_version IS NULL
    )
    OR (
      origin_kind = 'generated'
      AND origin_work_version_id IS NULL
      AND origin_actor_id IS NULL
      AND origin_source_connector IS NULL
      AND origin_connector_version IS NULL
      AND origin_source_location IS NULL
      AND origin_original_filename IS NULL
      AND origin_generator_name IS NOT NULL
      AND origin_generator_version IS NOT NULL
    )
  )
);

CREATE TABLE petra.rights_decisions (
  rights_decision_id text PRIMARY KEY
    CHECK (rights_decision_id ~ '^rights_decision_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  artifact_manifest_id text NOT NULL UNIQUE,
  source_location text NOT NULL
    CHECK (char_length(source_location) BETWEEN 1 AND 4000),
  license_status text NOT NULL
    CHECK (license_status IN ('known', 'unknown', 'restricted')),
  access_basis text NOT NULL CHECK (
    access_basis IN (
      'open_license', 'public_repository', 'subscription', 'user_supplied',
      'permission', 'unknown'
    )
  ),
  decision_status text NOT NULL CHECK (
    decision_status IN (
      'verified', 'inferred', 'unknown', 'conflicting', 'restricted'
    )
  ),
  store_raw_bytes boolean NOT NULL,
  parse_permitted boolean NOT NULL,
  index_permitted boolean NOT NULL,
  embed_permitted boolean NOT NULL,
  remote_selected_text_permitted boolean NOT NULL,
  quote_publicly_permitted boolean NOT NULL,
  redistribute_artifact_permitted boolean NOT NULL,
  conditions text[] NOT NULL CHECK (
    conditions <@ ARRAY[
      'attribution', 'notice', 'noncommercial', 'share_alike', 'no_derivatives'
    ]::text[]
    AND petra.text_array_is_unique(conditions)
  ),
  required_notices text[] NOT NULL
    CHECK (petra.text_array_is_unique(required_notices)),
  decision_maker_actor_id text NOT NULL,
  decision_maker_actor_kind text NOT NULL,
  observed_at timestamptz NOT NULL,
  policy_version text NOT NULL
    CHECK (char_length(policy_version) BETWEEN 1 AND 100),
  schema_name text NOT NULL CHECK (schema_name = 'petra.rights-decision'),
  schema_version text NOT NULL CHECK (schema_version = '1.0.0'),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = schema_name)
    CHECK (payload ->> 'schema_version' = schema_version)
    CHECK (payload ->> 'rights_decision_id' = rights_decision_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'artifact_manifest_id' = artifact_manifest_id)
    CHECK (payload ->> 'source_location' = source_location)
    CHECK (payload ->> 'license_status' = license_status)
    CHECK (payload ->> 'access_basis' = access_basis)
    CHECK (payload ->> 'decision_status' = decision_status)
    CHECK ((payload #>> '{permissions,store_raw_bytes}')::boolean = store_raw_bytes),
  created_at timestamptz NOT NULL,
  FOREIGN KEY (artifact_manifest_id)
    REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (decision_maker_actor_id, decision_maker_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.artifact_manifests
  ADD CONSTRAINT artifact_manifests_rights_decision_fkey
  FOREIGN KEY (rights_decision_id)
  REFERENCES petra.rights_decisions (rights_decision_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE petra.artifact_manifest_inputs (
  artifact_manifest_id text NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  input_artifact_id text NOT NULL,
  PRIMARY KEY (artifact_manifest_id, position),
  UNIQUE (artifact_manifest_id, input_artifact_id),
  FOREIGN KEY (artifact_manifest_id)
    REFERENCES petra.artifact_manifests (artifact_manifest_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (input_artifact_id)
    REFERENCES petra.artifacts (artifact_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.validate_artifact_manifest_rights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked record;
BEGIN
  IF TG_TABLE_NAME = 'artifact_manifests' THEN
    SELECT manifest.artifact_manifest_id,
           manifest.rights_decision_id AS manifest_rights_decision_id,
           manifest.origin_kind,
           manifest.origin_source_location,
           rights.rights_decision_id,
           rights.artifact_manifest_id AS rights_artifact_manifest_id,
           rights.source_location,
           rights.store_raw_bytes
      INTO linked
      FROM petra.artifact_manifests AS manifest
      JOIN petra.rights_decisions AS rights
        ON rights.rights_decision_id = manifest.rights_decision_id
     WHERE manifest.artifact_manifest_id = NEW.artifact_manifest_id;
  ELSE
    SELECT manifest.artifact_manifest_id,
           manifest.rights_decision_id AS manifest_rights_decision_id,
           manifest.origin_kind,
           manifest.origin_source_location,
           rights.rights_decision_id,
           rights.artifact_manifest_id AS rights_artifact_manifest_id,
           rights.source_location,
           rights.store_raw_bytes
      INTO linked
      FROM petra.rights_decisions AS rights
      JOIN petra.artifact_manifests AS manifest
        ON manifest.artifact_manifest_id = rights.artifact_manifest_id
     WHERE rights.rights_decision_id = NEW.rights_decision_id;
  END IF;

  IF NOT FOUND
     OR linked.manifest_rights_decision_id <> linked.rights_decision_id
     OR linked.rights_artifact_manifest_id <> linked.artifact_manifest_id THEN
    RAISE EXCEPTION 'ArtifactManifest and RightsDecision must link exactly'
      USING ERRCODE = '23514';
  END IF;

  IF NOT linked.store_raw_bytes THEN
    RAISE EXCEPTION 'stored Artifact bytes require explicit storage permission'
      USING ERRCODE = '23514';
  END IF;

  IF linked.origin_kind = 'acquired'
     AND linked.source_location <> linked.origin_source_location THEN
    RAISE EXCEPTION 'acquired Artifact rights must describe the exact source copy'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION petra.validate_artifact_manifest_input()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_origin_kind text;
BEGIN
  SELECT origin_kind INTO parent_origin_kind
    FROM petra.artifact_manifests
   WHERE artifact_manifest_id = NEW.artifact_manifest_id;

  IF parent_origin_kind <> 'generated' THEN
    RAISE EXCEPTION 'only generated Artifact manifests may declare input Artifacts'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER artifact_manifest_rights_are_consistent
AFTER INSERT ON petra.artifact_manifests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_artifact_manifest_rights();

CREATE CONSTRAINT TRIGGER rights_decision_manifest_is_consistent
AFTER INSERT ON petra.rights_decisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_artifact_manifest_rights();

CREATE CONSTRAINT TRIGGER artifact_manifest_inputs_match_origin
AFTER INSERT ON petra.artifact_manifest_inputs
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_artifact_manifest_input();

CREATE TRIGGER artifacts_are_immutable
BEFORE UPDATE OR DELETE ON petra.artifacts
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER artifact_manifests_are_immutable
BEFORE UPDATE OR DELETE ON petra.artifact_manifests
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER rights_decisions_are_immutable
BEFORE UPDATE OR DELETE ON petra.rights_decisions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER artifact_manifest_inputs_are_immutable
BEFORE UPDATE OR DELETE ON petra.artifact_manifest_inputs
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX artifact_manifests_artifact_idx
  ON petra.artifact_manifests (artifact_id, recorded_at, artifact_manifest_id);
CREATE INDEX artifact_manifests_work_version_idx
  ON petra.artifact_manifests (origin_work_version_id, artifact_manifest_id)
  WHERE origin_work_version_id IS NOT NULL;
CREATE INDEX artifact_storage_lookup_idx
  ON petra.artifact_manifests (store_name, object_key, storage_content_hash);
CREATE INDEX rights_decisions_policy_idx
  ON petra.rights_decisions (policy_version, decision_status, rights_decision_id);

COMMENT ON TABLE petra.artifacts IS
  'Immutable byte identities; Artifact bytes remain in content-addressed object storage.';
COMMENT ON TABLE petra.artifact_manifests IS
  'Immutable acquisition and verified storage records for exact Artifact bytes.';
COMMENT ON TABLE petra.rights_decisions IS
  'Immutable copy-specific rights decisions linked one-to-one with acquisition manifests.';
