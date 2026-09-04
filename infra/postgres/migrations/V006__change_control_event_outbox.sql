ALTER TABLE petra.evidence_entity_revisions
  DROP CONSTRAINT evidence_entity_revisions_revision_check,
  DROP CONSTRAINT evidence_entity_revisions_authority_zone_check,
  DROP CONSTRAINT evidence_entity_revisions_review_state_check,
  DROP CONSTRAINT evidence_entity_revisions_admission_kind_check;

ALTER TABLE petra.evidence_entity_revisions
  ADD CONSTRAINT evidence_entity_revisions_revision_check
    CHECK (revision >= 1),
  ADD CONSTRAINT evidence_entity_revisions_authority_check
    CHECK (
      (authority_zone = 'quarantine'
        AND review_state IN (
          'unreviewed', 'machine_checked', 'human_rejected', 'disputed'
        ))
      OR (authority_zone = 'trusted'
        AND review_state IN ('machine_checked', 'human_accepted', 'disputed'))
      OR (authority_zone = 'personal'
        AND review_state IN ('unreviewed', 'human_accepted', 'disputed'))
    ),
  ADD CONSTRAINT evidence_entity_revisions_admission_kind_check
    CHECK (
      admission_kind IN ('proposal', 'promotion')
    ),
  ADD CONSTRAINT evidence_entity_revisions_admission_authority_check
    CHECK (
      (revision = 1
        AND admission_kind = 'proposal'
        AND authority_zone = 'quarantine')
      OR (revision > 1
        AND admission_kind = 'promotion'
        AND authority_zone = 'trusted'
        AND review_state = 'human_accepted')
    ),
  ADD CONSTRAINT evidence_entity_revisions_promotion_payload_check
    CHECK (
      authority_zone <> 'trusted'
      OR (
        payload #>> '{authority,promotion,change_set_id}'
          ~ '^change_set_[0-9A-HJKMNP-TV-Z]{26}$'
        AND payload #>> '{authority,promotion,approval_basis,approval_id}'
          ~ '^approval_[0-9A-HJKMNP-TV-Z]{26}$'
        AND payload #>> '{authority,promotion,applied_at}' IS NOT NULL
      )
    );

CREATE FUNCTION petra.guard_change_set_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ChangeSets cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.change_set_id <> OLD.change_set_id
     OR NEW.revision <> OLD.revision
     OR NEW.project_id <> OLD.project_id
     OR NEW.content_hash <> OLD.content_hash
     OR NEW.proposed_by_actor_id <> OLD.proposed_by_actor_id
     OR NEW.proposed_by_actor_kind <> OLD.proposed_by_actor_kind
     OR NEW.record_hash <> OLD.record_hash
     OR NEW.payload <> OLD.payload
     OR NEW.proposed_at <> OLD.proposed_at THEN
    RAISE EXCEPTION 'ChangeSet content is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NOT (
    (OLD.current_state = 'submitted'
      AND NEW.current_state IN ('approved', 'rejected', 'conflicted'))
    OR (OLD.current_state = 'approved'
      AND NEW.current_state IN ('applied', 'conflicted'))
  ) THEN
    RAISE EXCEPTION 'illegal ChangeSet state transition'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.state_updated_at < OLD.state_updated_at THEN
    RAISE EXCEPTION 'ChangeSet state time cannot move backwards'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.current_state = 'applied' AND NEW.applied_approval_id IS NULL THEN
    RAISE EXCEPTION 'applied ChangeSet requires its exact Approval'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.applied_approval_id IS NOT NULL
     AND NEW.applied_approval_id IS DISTINCT FROM OLD.applied_approval_id THEN
    RAISE EXCEPTION 'the applied Approval binding is immutable'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE petra.change_sets (
  change_set_id text PRIMARY KEY
    CHECK (change_set_id ~ '^change_set_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  project_id text NOT NULL,
  origin text NOT NULL
    CHECK (origin IN ('direct_edit', 'agent_proposal', 'worker_proposal')),
  proposed_by_actor_id text NOT NULL,
  proposed_by_actor_kind text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 8000),
  impact jsonb NOT NULL CHECK (jsonb_typeof(impact) = 'object'),
  risk_tier text NOT NULL CHECK (risk_tier = 'R2'),
  content_hash text NOT NULL
    CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  current_state text NOT NULL DEFAULT 'submitted' CHECK (
    current_state IN (
      'submitted', 'approved', 'rejected', 'applied', 'conflicted'
    )
  ),
  state_updated_at timestamptz NOT NULL,
  applied_approval_id text,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.change-set')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'change_set_id' = change_set_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload ->> 'state' = 'submitted')
    CHECK (payload #>> '{content,project_id}' = project_id)
    CHECK (payload #>> '{content,origin}' = origin)
    CHECK (payload #>> '{content,proposed_by,actor_id}' = proposed_by_actor_id)
    CHECK (payload #>> '{content,proposed_by,actor_kind}' = proposed_by_actor_kind)
    CHECK (payload #>> '{content,reason}' = reason)
    CHECK (payload #> '{content,impact}' = impact)
    CHECK (payload #>> '{content,risk_tier}' = risk_tier)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'proposed_at')::timestamptz = proposed_at),
  proposed_at timestamptz NOT NULL,
  CHECK (
    (current_state = 'applied'
      AND applied_approval_id IS NOT NULL)
    OR (current_state <> 'applied'
      AND applied_approval_id IS NULL)
  ),
  UNIQUE (change_set_id, revision),
  UNIQUE (change_set_id, revision, content_hash),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (proposed_by_actor_id, proposed_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.change_set_operations (
  change_set_id text NOT NULL,
  change_set_revision bigint NOT NULL,
  position bigint NOT NULL CHECK (position >= 1),
  operation_kind text NOT NULL
    CHECK (operation_kind IN ('promote_claim', 'promote_assertion')),
  target_id text NOT NULL,
  target_evidence_kind text NOT NULL
    CHECK (target_evidence_kind IN ('claim', 'assertion')),
  base_revision bigint NOT NULL CHECK (base_revision >= 1),
  before_zone text NOT NULL CHECK (before_zone = 'quarantine'),
  before_review_state text NOT NULL
    CHECK (before_review_state IN ('unreviewed', 'machine_checked')),
  after_zone text NOT NULL CHECK (after_zone = 'trusted'),
  after_review_state text NOT NULL CHECK (after_review_state = 'human_accepted'),
  operation jsonb NOT NULL CHECK (jsonb_typeof(operation) = 'object'),
  PRIMARY KEY (change_set_id, position),
  UNIQUE (change_set_id, target_id),
  FOREIGN KEY (change_set_id, change_set_revision)
    REFERENCES petra.change_sets (change_set_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (target_id, target_evidence_kind, base_revision)
    REFERENCES petra.evidence_entity_revisions (
      evidence_id, evidence_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (operation_kind = 'promote_claim' AND target_evidence_kind = 'claim')
    OR (operation_kind = 'promote_assertion'
      AND target_evidence_kind = 'assertion')
  )
);

CREATE TABLE petra.approvals (
  approval_id text PRIMARY KEY
    CHECK (approval_id ~ '^approval_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision = 1),
  change_set_id text NOT NULL,
  change_set_revision bigint NOT NULL,
  change_set_content_hash text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decision_scope text NOT NULL CHECK (decision_scope = 'exact_change_set'),
  decided_by_actor_id text NOT NULL,
  decided_by_actor_kind text NOT NULL CHECK (decided_by_actor_kind = 'human'),
  rationale text NOT NULL CHECK (char_length(rationale) BETWEEN 1 AND 8000),
  conditions text[] NOT NULL CHECK (petra.text_array_is_unique(conditions)),
  decided_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.approval')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'approval_id' = approval_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{subject,change_set_id}' = change_set_id)
    CHECK ((payload #>> '{subject,change_set_revision}')::bigint = change_set_revision)
    CHECK (payload #>> '{subject,change_set_content_hash}' = change_set_content_hash)
    CHECK (payload ->> 'decision' = decision)
    CHECK (payload ->> 'decision_scope' = decision_scope)
    CHECK (payload #>> '{decided_by,actor_id}' = decided_by_actor_id)
    CHECK (payload #>> '{decided_by,actor_kind}' = decided_by_actor_kind)
    CHECK (payload ->> 'rationale' = rationale)
    CHECK (payload -> 'conditions' = to_jsonb(conditions))
    CHECK ((payload ->> 'decided_at')::timestamptz = decided_at),
  UNIQUE (approval_id, revision),
  UNIQUE (approval_id, change_set_id),
  UNIQUE (
    approval_id, revision, change_set_id, change_set_revision,
    change_set_content_hash
  ),
  FOREIGN KEY (change_set_id, change_set_revision, change_set_content_hash)
    REFERENCES petra.change_sets (change_set_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (decided_by_actor_id, decided_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE petra.change_sets
  ADD CONSTRAINT change_sets_applied_approval_fkey
  FOREIGN KEY (applied_approval_id, change_set_id)
  REFERENCES petra.approvals (approval_id, change_set_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE petra.evidence_revision_authorizations (
  evidence_id text NOT NULL,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('claim', 'assertion')),
  evidence_revision bigint NOT NULL CHECK (evidence_revision > 1),
  admission_kind text NOT NULL
    CHECK (admission_kind = 'promotion'),
  change_set_id text NOT NULL,
  change_set_revision bigint NOT NULL,
  change_set_content_hash text NOT NULL,
  approval_id text NOT NULL,
  approval_revision bigint NOT NULL,
  approved_by_actor_id text NOT NULL,
  approved_by_actor_kind text NOT NULL CHECK (approved_by_actor_kind = 'human'),
  applied_at timestamptz NOT NULL,
  PRIMARY KEY (evidence_id, evidence_revision),
  FOREIGN KEY (evidence_id, evidence_kind, evidence_revision)
    REFERENCES petra.evidence_entity_revisions (
      evidence_id, evidence_kind, revision
    ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (change_set_id, change_set_revision, change_set_content_hash)
    REFERENCES petra.change_sets (change_set_id, revision, content_hash)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    approval_id, approval_revision, change_set_id, change_set_revision,
    change_set_content_hash
  ) REFERENCES petra.approvals (
    approval_id, revision, change_set_id, change_set_revision,
    change_set_content_hash
  ) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_actor_id, approved_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_evidence_revision_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  evidence_payload jsonb;
  recorded_admission_kind text;
  approval_actor_id text;
  approval_actor_kind text;
  approval_decision text;
BEGIN
  SELECT payload, admission_kind
    INTO evidence_payload, recorded_admission_kind
    FROM petra.evidence_entity_revisions
   WHERE evidence_id = NEW.evidence_id
     AND evidence_kind = NEW.evidence_kind
     AND revision = NEW.evidence_revision;

  SELECT decided_by_actor_id, decided_by_actor_kind, decision
    INTO approval_actor_id, approval_actor_kind, approval_decision
    FROM petra.approvals
   WHERE approval_id = NEW.approval_id
     AND revision = NEW.approval_revision;

  IF evidence_payload IS NULL
     OR recorded_admission_kind IS DISTINCT FROM NEW.admission_kind
     OR evidence_payload #>> '{authority,promotion,change_set_id}'
       IS DISTINCT FROM NEW.change_set_id
     OR evidence_payload #>> '{authority,promotion,approval_basis,approval_id}'
       IS DISTINCT FROM NEW.approval_id
     OR evidence_payload #>> '{authority,promotion,approval_basis,approved_by,actor_id}'
       IS DISTINCT FROM NEW.approved_by_actor_id
     OR evidence_payload #>> '{authority,promotion,approval_basis,approved_by,actor_kind}'
       IS DISTINCT FROM NEW.approved_by_actor_kind
     OR (evidence_payload #>> '{authority,promotion,applied_at}')::timestamptz
       IS DISTINCT FROM NEW.applied_at
     OR approval_actor_id IS DISTINCT FROM NEW.approved_by_actor_id
     OR approval_actor_kind IS DISTINCT FROM NEW.approved_by_actor_kind
     OR approval_decision IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Evidence revision authorization differs from its canonical authority payload'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_evidence_revision_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.revision > 1 AND NOT EXISTS (
    SELECT 1 FROM petra.evidence_revision_authorizations
     WHERE evidence_id = NEW.evidence_id
       AND evidence_kind = NEW.evidence_kind
       AND evidence_revision = NEW.revision
  ) THEN
    RAISE EXCEPTION 'Later evidence revision requires exact ChangeSet and Approval authorization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE petra.authority_positions (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  event_position bigint NOT NULL DEFAULT 0 CHECK (event_position >= 0),
  outbox_position bigint NOT NULL DEFAULT 0 CHECK (outbox_position >= 0)
);

INSERT INTO petra.authority_positions (singleton) VALUES (true);

CREATE TABLE petra.project_event_stream_heads (
  project_id text PRIMARY KEY,
  current_stream_revision bigint NOT NULL CHECK (current_stream_revision >= 1),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.outbox_target_heads (
  target text NOT NULL CHECK (target IN ('neo4j_graph', 'interface_authority')),
  project_id text NOT NULL,
  current_target_sequence bigint NOT NULL CHECK (current_target_sequence >= 1),
  PRIMARY KEY (target, project_id),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE petra.command_executions (
  command_id text PRIMARY KEY
    CHECK (command_id ~ '^command_[0-9A-HJKMNP-TV-Z]{26}$'),
  idempotency_key text NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 512),
  project_id text NOT NULL,
  actor_id text NOT NULL,
  actor_kind text NOT NULL,
  capability_grant_id text NOT NULL
    CHECK (capability_grant_id ~ '^capability_grant_[0-9A-HJKMNP-TV-Z]{26}$'),
  correlation_id text NOT NULL
    CHECK (correlation_id ~ '^trace_[0-9A-HJKMNP-TV-Z]{26}$'),
  submitted_at timestamptz NOT NULL,
  command_name text NOT NULL CHECK (
    command_name IN ('SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet')
  ),
  command_fingerprint text NOT NULL
    CHECK (command_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  envelope jsonb NOT NULL
    CHECK (jsonb_typeof(envelope) = 'object')
    CHECK (envelope ->> 'schema_name' = 'petra.command-envelope')
    CHECK (envelope ->> 'schema_version' = '1.0.0')
    CHECK (envelope ->> 'command_id' = command_id)
    CHECK (envelope ->> 'idempotency_key' = idempotency_key)
    CHECK (envelope ->> 'project_id' = project_id)
    CHECK (envelope #>> '{actor,actor_id}' = actor_id)
    CHECK (envelope #>> '{actor,actor_kind}' = actor_kind)
    CHECK (envelope ->> 'capability_grant_id' = capability_grant_id)
    CHECK (envelope ->> 'correlation_id' = correlation_id)
    CHECK ((envelope ->> 'submitted_at')::timestamptz = submitted_at)
    CHECK (envelope #>> '{command,command_name}' = command_name),
  outcome_kind text NOT NULL CHECK (outcome_kind IN ('success', 'failure')),
  result jsonb,
  error_code text,
  error_message text,
  completed_at timestamptz NOT NULL,
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (
    command_id, project_id, actor_id, actor_kind, correlation_id,
    idempotency_key, capability_grant_id, submitted_at
  ),
  CHECK (
    (outcome_kind = 'success'
      AND result IS NOT NULL
      AND error_code IS NULL
      AND error_message IS NULL)
    OR (outcome_kind = 'failure'
      AND result IS NULL
      AND error_code IN ('STALE_TARGET_REVISION', 'TARGET_AUTHORITY_MISMATCH')
      AND error_message IS NOT NULL)
  )
);

CREATE TABLE petra.domain_events (
  event_id text PRIMARY KEY
    CHECK (event_id ~ '^event_[0-9A-HJKMNP-TV-Z]{26}$'),
  event_position bigint NOT NULL UNIQUE CHECK (event_position >= 1),
  project_id text NOT NULL,
  stream_revision bigint NOT NULL CHECK (stream_revision >= 1),
  actor_id text NOT NULL,
  actor_kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  correlation_id text NOT NULL,
  command_id text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  capability_grant_id text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'change_set.submitted', 'approval.recorded', 'change_set.applied',
      'change_set.conflicted'
    )
  ),
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.domain-event')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'event_id' = event_id)
    CHECK ((payload ->> 'event_position')::bigint = event_position)
    CHECK (payload ->> 'stream_type' = 'project')
    CHECK (payload ->> 'stream_id' = project_id)
    CHECK ((payload ->> 'stream_revision')::bigint = stream_revision)
    CHECK (payload ->> 'project_id' = project_id)
    CHECK (payload #>> '{actor,actor_id}' = actor_id)
    CHECK (payload #>> '{actor,actor_kind}' = actor_kind)
    CHECK ((payload ->> 'occurred_at')::timestamptz = occurred_at)
    CHECK ((payload ->> 'recorded_at')::timestamptz = recorded_at)
    CHECK (payload ->> 'correlation_id' = correlation_id)
    CHECK (payload ->> 'causation_id' = command_id)
    CHECK (payload ->> 'command_id' = command_id)
    CHECK (payload ->> 'idempotency_key' = idempotency_key)
    CHECK (payload ->> 'capability_grant_id' = capability_grant_id)
    CHECK (payload #>> '{event,event_type}' = event_type),
  UNIQUE (project_id, stream_revision),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (actor_id, actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (
    command_id, project_id, actor_id, actor_kind, correlation_id,
    idempotency_key, capability_grant_id, occurred_at
  ) REFERENCES petra.command_executions (
    command_id, project_id, actor_id, actor_kind, correlation_id,
    idempotency_key, capability_grant_id, submitted_at
  )
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE petra.outbox_records (
  outbox_id text PRIMARY KEY
    CHECK (outbox_id ~ '^outbox_[0-9A-HJKMNP-TV-Z]{26}$'),
  outbox_position bigint NOT NULL UNIQUE CHECK (outbox_position >= 1),
  target text NOT NULL CHECK (target IN ('neo4j_graph', 'interface_authority')),
  target_sequence bigint NOT NULL CHECK (target_sequence >= 1),
  partition_key text NOT NULL,
  deduplication_key text NOT NULL UNIQUE
    CHECK (char_length(deduplication_key) BETWEEN 1 AND 512),
  event_id text NOT NULL,
  enqueued_at timestamptz NOT NULL,
  record_hash text NOT NULL
    CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.outbox-record')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'outbox_id' = outbox_id)
    CHECK ((payload ->> 'outbox_position')::bigint = outbox_position)
    CHECK (payload ->> 'target' = target)
    CHECK ((payload ->> 'target_sequence')::bigint = target_sequence)
    CHECK (payload ->> 'partition_key' = partition_key)
    CHECK (payload ->> 'deduplication_key' = deduplication_key)
    CHECK ((payload ->> 'enqueued_at')::timestamptz = enqueued_at)
    CHECK (payload #>> '{message,event,event_id}' = event_id),
  UNIQUE (target, partition_key, target_sequence),
  FOREIGN KEY (partition_key) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES petra.domain_events (event_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION petra.guard_change_set_operation_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_operation jsonb;
BEGIN
  SELECT payload #> ARRAY['content', 'operations', (NEW.position - 1)::text]
    INTO expected_operation
    FROM petra.change_sets
   WHERE change_set_id = NEW.change_set_id;

  IF expected_operation IS NULL OR expected_operation <> NEW.operation THEN
    RAISE EXCEPTION 'ChangeSet operation order differs from canonical payload'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.validate_change_set_operations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_count bigint;
BEGIN
  expected_count := jsonb_array_length(NEW.payload #> '{content,operations}');
  IF expected_count <> (
    SELECT count(*) FROM petra.change_set_operations
     WHERE change_set_id = NEW.change_set_id
  ) THEN
    RAISE EXCEPTION 'ChangeSet operations are incomplete'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION petra.guard_outbox_embedded_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  authoritative_event jsonb;
BEGIN
  SELECT payload INTO authoritative_event
    FROM petra.domain_events
   WHERE event_id = NEW.event_id;
  IF authoritative_event IS NULL
     OR NEW.payload #> '{message,event}' <> authoritative_event THEN
    RAISE EXCEPTION 'Outbox message must embed the exact authoritative event'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER change_set_state_is_guarded
BEFORE UPDATE OR DELETE ON petra.change_sets
FOR EACH ROW EXECUTE FUNCTION petra.guard_change_set_state();

CREATE TRIGGER change_set_operation_order_is_exact
BEFORE INSERT ON petra.change_set_operations
FOR EACH ROW EXECUTE FUNCTION petra.guard_change_set_operation_order();

CREATE CONSTRAINT TRIGGER change_set_operations_are_complete
AFTER INSERT ON petra.change_sets
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_change_set_operations();

CREATE TRIGGER change_set_operations_are_immutable
BEFORE UPDATE OR DELETE ON petra.change_set_operations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER approvals_are_immutable
BEFORE UPDATE OR DELETE ON petra.approvals
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER evidence_revision_authorization_is_exact
BEFORE INSERT ON petra.evidence_revision_authorizations
FOR EACH ROW EXECUTE FUNCTION petra.guard_evidence_revision_authorization();

CREATE CONSTRAINT TRIGGER evidence_revision_authorization_is_complete
AFTER INSERT ON petra.evidence_entity_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION petra.validate_evidence_revision_authorization();

CREATE TRIGGER evidence_revision_authorizations_are_immutable
BEFORE UPDATE OR DELETE ON petra.evidence_revision_authorizations
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER command_executions_are_immutable
BEFORE UPDATE OR DELETE ON petra.command_executions
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER domain_events_are_immutable
BEFORE UPDATE OR DELETE ON petra.domain_events
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE TRIGGER outbox_embedded_event_is_exact
BEFORE INSERT ON petra.outbox_records
FOR EACH ROW EXECUTE FUNCTION petra.guard_outbox_embedded_event();

CREATE TRIGGER outbox_records_are_immutable
BEFORE UPDATE OR DELETE ON petra.outbox_records
FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation();

CREATE INDEX change_sets_project_state_idx
  ON petra.change_sets (project_id, current_state, proposed_at, change_set_id);
CREATE INDEX approvals_change_set_idx
  ON petra.approvals (change_set_id, change_set_revision, decided_at);
CREATE INDEX command_executions_project_idx
  ON petra.command_executions (project_id, completed_at, command_id);
CREATE INDEX domain_events_project_stream_idx
  ON petra.domain_events (project_id, stream_revision);
CREATE INDEX outbox_records_target_project_idx
  ON petra.outbox_records (target, partition_key, target_sequence);

COMMENT ON TABLE petra.change_sets IS
  'Immutable reviewed intent with lifecycle derived through guarded authority events.';
COMMENT ON TABLE petra.command_executions IS
  'Content-bound successful commands and durable conflicts for exact idempotent replay.';
COMMENT ON TABLE petra.domain_events IS
  'Gapless global and per-Project append-only authority facts.';
COMMENT ON TABLE petra.outbox_records IS
  'Projection intent committed atomically with each authoritative domain event.';
