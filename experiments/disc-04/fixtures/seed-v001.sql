INSERT INTO research_project (
  project_id,
  revision,
  descriptor,
  schema_version,
  metadata
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  1,
  'H01 — frozen migration comparison',
  '1.0.0',
  '{"discipline":"methodology"}'::jsonb
);

INSERT INTO evidence_record (
  evidence_id,
  revision,
  project_id,
  evidence_kind,
  schema_version,
  payload
) VALUES (
  '20000000-0000-4000-8000-000000000001',
  1,
  '10000000-0000-4000-8000-000000000001',
  'claim',
  '1.0.0',
  '{"schema_version":"1.0.0","text":"A quarantined claim proposal."}'::jsonb
);

WITH appended AS (
  INSERT INTO domain_event (
    event_id,
    stream_id,
    stream_revision,
    event_type,
    schema_version,
    idempotency_key,
    payload
  ) VALUES (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    1,
    'EvidenceProposed',
    '1.0.0',
    'disc04-seed-event-1',
    '{"schema_version":"1.0.0","evidence_id":"20000000-0000-4000-8000-000000000001"}'::jsonb
  )
  RETURNING event_position, payload
)
INSERT INTO outbox_record (event_position, destination, payload)
SELECT event_position, 'neo4j-projection', payload
FROM appended;

INSERT INTO projection_checkpoint (
  projection_name,
  last_event_position,
  revision
) VALUES ('evidence-graph', 1, 1);
