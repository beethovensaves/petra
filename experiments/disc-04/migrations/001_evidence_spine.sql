CREATE DOMAIN petra_project_id AS uuid;
CREATE DOMAIN petra_evidence_id AS uuid;
CREATE DOMAIN petra_event_id AS uuid;

CREATE TABLE research_project (
  project_id petra_project_id PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision >= 1),
  descriptor text NOT NULL CHECK (length(btrim(descriptor)) > 0),
  schema_version text NOT NULL CHECK (
    schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);
CREATE TABLE evidence_record (
  evidence_id petra_evidence_id NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 1),
  project_id petra_project_id NOT NULL REFERENCES research_project (project_id),
  evidence_kind text NOT NULL CHECK (
    evidence_kind IN ('work_version', 'artifact', 'source_span', 'claim', 'assertion')
  ),
  schema_version text NOT NULL CHECK (
    schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object'
    AND payload ? 'schema_version'
    AND payload ->> 'schema_version' = schema_version
  ),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (evidence_id, revision)
);

CREATE TABLE domain_event (
  event_position bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id petra_event_id NOT NULL UNIQUE,
  stream_id uuid NOT NULL,
  stream_revision bigint NOT NULL CHECK (stream_revision >= 1),
  event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
  schema_version text NOT NULL CHECK (
    schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  idempotency_key text NOT NULL UNIQUE CHECK (length(btrim(idempotency_key)) > 0),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object'
    AND payload ? 'schema_version'
    AND payload ->> 'schema_version' = schema_version
  ),
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (stream_id, stream_revision)
);

CREATE FUNCTION reject_domain_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'domain_event is append-only';
END;
$$;

CREATE TRIGGER domain_event_append_only
BEFORE UPDATE OR DELETE ON domain_event
FOR EACH ROW
EXECUTE FUNCTION reject_domain_event_mutation();

CREATE TABLE outbox_record (
  outbox_position bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_position bigint NOT NULL UNIQUE REFERENCES domain_event (event_position),
  destination text NOT NULL CHECK (length(btrim(destination)) > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  published_at timestamptz
);

CREATE UNIQUE INDEX outbox_one_unpublished_event
ON outbox_record (event_position)
WHERE published_at IS NULL;

CREATE TABLE projection_checkpoint (
  projection_name text PRIMARY KEY CHECK (length(btrim(projection_name)) > 0),
  last_event_position bigint NOT NULL DEFAULT 0 CHECK (last_event_position >= 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);
