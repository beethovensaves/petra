-- Immutable Project-scoped Hypothesis and examination records. Admission is
-- internal persistence; authenticated commands provide the authority boundary.
CREATE TABLE petra.project_examination_snapshots (
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload ?& ARRAY['schema_name','schema_version','project_id','content','content_hash','read_at'])
    CHECK (payload->>'schema_name'='petra.project-semantic-graph-view')
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload->>'project_id'=project_id)
    CHECK (payload->>'content_hash'=content_hash),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (project_id,content_hash)
);
CREATE TRIGGER project_examination_snapshots_immutable BEFORE UPDATE OR DELETE ON petra.project_examination_snapshots FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
CREATE TABLE petra.project_examination_records (
  record_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  record_kind text NOT NULL CHECK (record_kind IN ('hypothesis','hypothesis-assessment','posture-decision','cycle-disposition')),
  record_id text NOT NULL CHECK (record_id ~ '^[a-z][a-z0-9_]*_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision > 0),
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  actor_id text NOT NULL,
  actor_kind text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object')
    CHECK (payload ?& ARRAY['schema_name','schema_version','revision','project_id','content','content_hash','created_by','created_at'])
    CHECK (payload ? (replace(record_kind,'-','_') || '_id'))
    CHECK (payload->>'schema_name'='petra.' || record_kind)
    CHECK (payload->>'schema_version'='1.0.0')
    CHECK (payload->>'project_id'=project_id)
    CHECK ((payload->>'revision')::bigint=revision)
    CHECK (payload->>'content_hash'=content_hash)
    CHECK (payload#>>'{created_by,actor_id}'=actor_id)
    CHECK (payload#>>'{created_by,actor_kind}'=actor_kind)
    CHECK (COALESCE(payload->>'hypothesis_id',payload->>'hypothesis_assessment_id',payload->>'posture_decision_id',payload->>'cycle_disposition_id')=record_id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (record_id,revision),
  FOREIGN KEY (actor_id,actor_kind) REFERENCES petra.actors(actor_id,actor_kind)
);
CREATE UNIQUE INDEX project_hypothesis_ordinal_identity ON petra.project_examination_records(project_id,(payload#>>'{content,ordinal}')) WHERE record_kind='hypothesis' AND revision=1;
CREATE INDEX project_examination_history ON petra.project_examination_records(project_id,record_sequence);
CREATE TRIGGER project_examination_records_immutable BEFORE UPDATE OR DELETE ON petra.project_examination_records FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();
