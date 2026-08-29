-- petra:execute-in-transaction=false
CREATE INDEX CONCURRENTLY evidence_record_payload_schema_version
ON evidence_record ((payload ->> 'schema_version'));

SELECT pg_sleep(30);
