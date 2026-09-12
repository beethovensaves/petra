ALTER TABLE petra.capability_grants
  DROP CONSTRAINT capability_grants_allowed_commands_check,
  ADD CONSTRAINT capability_grants_allowed_commands_check CHECK (
    cardinality(allowed_commands) BETWEEN 1 AND 100
    AND allowed_commands <@ ARRAY[
      'SubmitChangeSet',
      'RecordApproval',
      'ApplyChangeSet',
      'ExcludeProjectSource',
      'RestoreProjectSource',
      'CreateProjectSourceReplacement',
      'RetractProjectSourceReplacement',
      'InvokeSuggestedAction',
      'DeferReviewSession',
      'ReopenReviewSession',
      'RefreshReviewSession'
    ]::text[]
    AND petra.text_array_is_unique(allowed_commands)
  ),
  DROP CONSTRAINT capability_grants_schema_version_check,
  ADD CONSTRAINT capability_grants_schema_version_check CHECK (
    schema_version IN ('1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0')
  );

ALTER TABLE petra.command_executions
  DROP CONSTRAINT command_executions_command_name_check,
  ADD CONSTRAINT command_executions_command_name_check CHECK (
    command_name IN (
      'SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet',
      'ExcludeProjectSource', 'RestoreProjectSource',
      'CreateProjectSourceReplacement', 'RetractProjectSourceReplacement',
      'DeferReviewSession', 'ReopenReviewSession', 'RefreshReviewSession'
    )
  ),
  DROP CONSTRAINT command_executions_schema_version_check,
  ADD CONSTRAINT command_executions_schema_version_check CHECK (
    envelope ->> 'schema_version' IN (
      '1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'
    )
  );

COMMENT ON TABLE petra.command_executions IS
  'Canonical idempotent Project command ledger, including ReviewSession refresh results. Refresh appends only a ReviewSession revision and emits no Review decision, ChangeSet, Approval, domain event, outbox record, or projection instruction.';
