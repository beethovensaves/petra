CREATE TABLE petra.project_examination_authority_receipts (
  command_id text PRIMARY KEY CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE,
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind='human'),
  capability_grant_id text NOT NULL UNIQUE REFERENCES petra.capability_grants(capability_grant_id),
  request_hash text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL CHECK (jsonb_typeof(request_payload)='object')
    CHECK (request_payload->>'schema_name'='petra.project-examination-authority-request')
    CHECK (request_payload->>'schema_version'='1.0.0'),
  receipt_hash text NOT NULL CHECK (receipt_hash ~ '^sha256:[0-9a-f]{64}$'),
  receipt_payload jsonb NOT NULL CHECK (jsonb_typeof(receipt_payload)='object')
    CHECK (receipt_payload->>'schema_name'='petra.project-examination-authority-receipt')
    CHECK (receipt_payload->>'schema_version'='1.0.0')
    CHECK (receipt_payload->>'project_id'=project_id)
    CHECK (receipt_payload#>>'{content,command_id}'=command_id)
    CHECK (receipt_payload#>>'{content,idempotency_key}'=idempotency_key)
    CHECK (receipt_payload#>>'{content,request_hash}'=request_hash)
    CHECK (receipt_payload#>>'{content,actor,actor_id}'=actor_id)
    CHECK (receipt_payload#>>'{content,grant,capability_grant_id}'=capability_grant_id),
  recorded_at timestamptz NOT NULL,
  FOREIGN KEY (actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind)
);
CREATE TRIGGER project_examination_authority_receipts_immutable BEFORE UPDATE OR DELETE ON petra.project_examination_authority_receipts FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
