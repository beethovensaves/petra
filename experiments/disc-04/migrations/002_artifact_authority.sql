ALTER TABLE evidence_record
ADD COLUMN authority_scope text;

UPDATE evidence_record
SET authority_scope = 'proposal'
WHERE authority_scope IS NULL;

ALTER TABLE evidence_record
ALTER COLUMN authority_scope SET NOT NULL,
ADD CONSTRAINT evidence_record_authority_scope_check CHECK (
  authority_scope IN ('proposal', 'reviewed_assertion', 'source_metadata')
);

CREATE TABLE artifact_manifest (
  artifact_id uuid PRIMARY KEY,
  project_id petra_project_id NOT NULL REFERENCES research_project (project_id),
  content_hash text NOT NULL UNIQUE CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  media_type text NOT NULL CHECK (length(btrim(media_type)) > 0),
  byte_length bigint NOT NULL CHECK (byte_length >= 0),
  schema_version text NOT NULL CHECK (
    schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE INDEX evidence_record_project_kind
ON evidence_record (project_id, evidence_kind);
