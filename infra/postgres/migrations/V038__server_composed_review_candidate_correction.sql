ALTER TABLE petra.command_executions
  DROP CONSTRAINT command_executions_schema_version_check,
  ADD CONSTRAINT command_executions_schema_version_check CHECK (
    envelope ->> 'schema_version' IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0',
      '1.6.0', '1.7.0'
    )
  );

COMMENT ON TABLE petra.command_executions IS
  'Canonical idempotent Project command ledger, including ReviewSession lifecycle, refresh, and candidate-correction results. Candidate correction may retain caller-composed 1.6 records or compose 1.7 scientific Claim text edits inside server authority; both append working and Review revisions without a Review decision, ChangeSet, Approval, domain event, outbox record, or projection instruction.';
