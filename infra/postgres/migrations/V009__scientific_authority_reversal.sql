ALTER TABLE petra.evidence_entity_revisions
  DROP CONSTRAINT evidence_entity_revisions_admission_kind_check,
  DROP CONSTRAINT evidence_entity_revisions_admission_authority_check;

ALTER TABLE petra.evidence_entity_revisions
  ADD CONSTRAINT evidence_entity_revisions_admission_kind_check
    CHECK (admission_kind IN ('proposal', 'promotion', 'reversal')),
  ADD CONSTRAINT evidence_entity_revisions_admission_authority_check
    CHECK (
      (revision = 1
        AND admission_kind = 'proposal'
        AND authority_zone = 'quarantine')
      OR (revision > 1
        AND admission_kind = 'promotion'
        AND authority_zone = 'trusted'
        AND review_state = 'human_accepted')
      OR (revision > 1
        AND admission_kind = 'reversal'
        AND authority_zone = 'quarantine'
        AND review_state = 'human_rejected')
    );

ALTER TABLE petra.change_sets
  ADD COLUMN compensates_change_set_id text;

ALTER TABLE petra.change_sets
  ADD CONSTRAINT change_sets_compensates_change_set_fkey
  FOREIGN KEY (compensates_change_set_id)
  REFERENCES petra.change_sets (change_set_id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE petra.change_sets
  DROP CONSTRAINT change_sets_current_state_check;

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT constraint_name
      FROM information_schema.check_constraints
     WHERE constraint_schema = 'petra'
       AND constraint_name IN (
         SELECT con.conname
           FROM pg_constraint AS con
           JOIN pg_class AS rel ON rel.oid = con.conrelid
           JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
          WHERE ns.nspname = 'petra'
            AND rel.relname = 'change_sets'
            AND con.contype = 'c'
            AND (
              pg_get_constraintdef(con.oid) LIKE '%schema_version%1.0.0%'
              OR pg_get_constraintdef(con.oid)
                   LIKE '%current_state%applied%applied_approval_id%'
            )
       )
  LOOP
    EXECUTE format(
      'ALTER TABLE petra.change_sets DROP CONSTRAINT %I',
      constraint_row.constraint_name
    );
  END LOOP;
END;
$$;

ALTER TABLE petra.change_sets
  ADD CONSTRAINT change_sets_current_state_check
    CHECK (
      current_state IN (
        'submitted', 'approved', 'rejected', 'applied', 'conflicted',
        'reverted'
      )
    ),
  ADD CONSTRAINT change_sets_schema_version_check
    CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0')),
  ADD CONSTRAINT change_sets_compensation_payload_check
    CHECK (
      (payload ->> 'schema_version' = '1.0.0'
        AND compensates_change_set_id IS NULL
        AND NOT (payload #> '{content}' ? 'compensates_change_set_id'))
      OR (payload ->> 'schema_version' = '1.1.0'
        AND (payload #>> '{content,compensates_change_set_id}')
          IS NOT DISTINCT FROM compensates_change_set_id)
    ),
  ADD CONSTRAINT change_sets_applied_binding_check
    CHECK (
      (current_state IN ('applied', 'reverted')
        AND applied_approval_id IS NOT NULL)
      OR (current_state NOT IN ('applied', 'reverted')
        AND applied_approval_id IS NULL)
    );

CREATE OR REPLACE FUNCTION petra.guard_change_set_state()
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
     OR NEW.compensates_change_set_id
       IS DISTINCT FROM OLD.compensates_change_set_id
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
    OR (OLD.current_state = 'applied'
      AND NEW.current_state = 'reverted')
  ) THEN
    RAISE EXCEPTION 'illegal ChangeSet state transition'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.state_updated_at < OLD.state_updated_at THEN
    RAISE EXCEPTION 'ChangeSet state time cannot move backwards'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.current_state IN ('applied', 'reverted')
     AND NEW.applied_approval_id IS NULL THEN
    RAISE EXCEPTION 'applied or reverted ChangeSet requires its exact Approval'
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

ALTER TABLE petra.change_set_operations
  DROP CONSTRAINT change_set_operations_operation_kind_check,
  DROP CONSTRAINT change_set_operations_before_zone_check,
  DROP CONSTRAINT change_set_operations_before_review_state_check,
  DROP CONSTRAINT change_set_operations_after_zone_check,
  DROP CONSTRAINT change_set_operations_after_review_state_check,
  DROP CONSTRAINT change_set_operations_check;

ALTER TABLE petra.change_set_operations
  ADD CONSTRAINT change_set_operations_operation_kind_check
    CHECK (
      operation_kind IN (
        'promote_claim', 'promote_assertion',
        'retract_claim', 'retract_assertion'
      )
    ),
  ADD CONSTRAINT change_set_operations_authority_transition_check
    CHECK (
      (operation_kind IN ('promote_claim', 'promote_assertion')
        AND before_zone = 'quarantine'
        AND before_review_state IN ('unreviewed', 'machine_checked')
        AND after_zone = 'trusted'
        AND after_review_state = 'human_accepted')
      OR (operation_kind IN ('retract_claim', 'retract_assertion')
        AND before_zone = 'trusted'
        AND before_review_state = 'human_accepted'
        AND after_zone = 'quarantine'
        AND after_review_state = 'human_rejected')
    ),
  ADD CONSTRAINT change_set_operations_target_kind_check
    CHECK (
      (operation_kind IN ('promote_claim', 'retract_claim')
        AND target_evidence_kind = 'claim')
      OR (operation_kind IN ('promote_assertion', 'retract_assertion')
        AND target_evidence_kind = 'assertion')
    );

CREATE OR REPLACE FUNCTION petra.validate_change_set_operations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_count bigint;
  compensated_project_id text;
  compensated_state text;
BEGIN
  expected_count := jsonb_array_length(NEW.payload #> '{content,operations}');
  IF expected_count <> (
    SELECT count(*) FROM petra.change_set_operations
     WHERE change_set_id = NEW.change_set_id
  ) THEN
    RAISE EXCEPTION 'ChangeSet operations are incomplete'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.compensates_change_set_id IS NULL THEN
    IF expected_count <> 2
       OR 1 <> (
         SELECT count(*) FROM petra.change_set_operations
          WHERE change_set_id = NEW.change_set_id
            AND operation_kind = 'promote_claim'
       )
       OR 1 <> (
         SELECT count(*) FROM petra.change_set_operations
          WHERE change_set_id = NEW.change_set_id
            AND operation_kind = 'promote_assertion'
       ) THEN
      RAISE EXCEPTION 'Promotion ChangeSet must contain one Claim and one Assertion operation'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT project_id, current_state
    INTO compensated_project_id, compensated_state
    FROM petra.change_sets
   WHERE change_set_id = NEW.compensates_change_set_id;
  IF compensated_project_id IS DISTINCT FROM NEW.project_id
     OR compensated_state NOT IN ('applied', 'reverted')
     OR expected_count <> 2
     OR 1 <> (
       SELECT count(*) FROM petra.change_set_operations
        WHERE change_set_id = NEW.change_set_id
          AND operation_kind = 'retract_claim'
     )
     OR 1 <> (
       SELECT count(*) FROM petra.change_set_operations
        WHERE change_set_id = NEW.change_set_id
          AND operation_kind = 'retract_assertion'
     )
     OR EXISTS (
       SELECT 1
         FROM petra.change_set_operations AS reversal
         FULL JOIN petra.change_set_operations AS promotion
           ON promotion.change_set_id = NEW.compensates_change_set_id
          AND promotion.target_id = reversal.target_id
          AND (
            (reversal.operation_kind = 'retract_claim'
              AND promotion.operation_kind = 'promote_claim')
            OR (reversal.operation_kind = 'retract_assertion'
              AND promotion.operation_kind = 'promote_assertion')
          )
        WHERE reversal.change_set_id = NEW.change_set_id
          AND promotion.change_set_id IS NULL
     ) THEN
    RAISE EXCEPTION 'Reversal ChangeSet must exactly compensate one applied promotion pair in the same Project'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE petra.evidence_revision_authorizations
  DROP CONSTRAINT evidence_revision_authorizations_admission_kind_check;

ALTER TABLE petra.evidence_revision_authorizations
  ADD CONSTRAINT evidence_revision_authorizations_admission_kind_check
    CHECK (admission_kind IN ('promotion', 'reversal'));

CREATE OR REPLACE FUNCTION petra.guard_evidence_revision_authorization()
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
     OR approval_actor_id IS DISTINCT FROM NEW.approved_by_actor_id
     OR approval_actor_kind IS DISTINCT FROM NEW.approved_by_actor_kind
     OR approval_decision IS DISTINCT FROM 'approved'
     OR (
       NEW.admission_kind = 'promotion'
       AND (
         evidence_payload #>> '{authority,promotion,change_set_id}'
           IS DISTINCT FROM NEW.change_set_id
         OR evidence_payload #>> '{authority,promotion,approval_basis,approval_id}'
           IS DISTINCT FROM NEW.approval_id
         OR evidence_payload #>> '{authority,promotion,approval_basis,approved_by,actor_id}'
           IS DISTINCT FROM NEW.approved_by_actor_id
         OR evidence_payload #>> '{authority,promotion,approval_basis,approved_by,actor_kind}'
           IS DISTINCT FROM NEW.approved_by_actor_kind
         OR (evidence_payload #>> '{authority,promotion,applied_at}')::timestamptz
           IS DISTINCT FROM NEW.applied_at
       )
     )
     OR (
       NEW.admission_kind = 'reversal'
       AND (
         evidence_payload #>> '{authority,zone}' IS DISTINCT FROM 'quarantine'
         OR evidence_payload #>> '{authority,review_state}'
           IS DISTINCT FROM 'human_rejected'
         OR NOT EXISTS (
           SELECT 1 FROM petra.change_sets
            WHERE change_set_id = NEW.change_set_id
              AND compensates_change_set_id IS NOT NULL
         )
       )
     ) THEN
    RAISE EXCEPTION 'Evidence revision authorization differs from its canonical authority payload'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  relation_name text;
  constraint_row record;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'command_executions', 'domain_events', 'outbox_records'
  ]
  LOOP
    FOR constraint_row IN
      SELECT con.conname
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'petra'
         AND rel.relname = relation_name
         AND con.contype = 'c'
         AND pg_get_constraintdef(con.oid) LIKE '%schema_version%1.0.0%'
    LOOP
      EXECUTE format(
        'ALTER TABLE petra.%I DROP CONSTRAINT %I',
        relation_name,
        constraint_row.conname
      );
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE petra.command_executions
  ADD CONSTRAINT command_executions_schema_version_check
    CHECK (envelope ->> 'schema_version' IN ('1.0.0', '1.1.0'));

ALTER TABLE petra.domain_events
  DROP CONSTRAINT domain_events_event_type_check;

ALTER TABLE petra.domain_events
  ADD CONSTRAINT domain_events_event_type_check
    CHECK (
      event_type IN (
        'change_set.submitted', 'approval.recorded', 'change_set.applied',
        'change_set.conflicted', 'change_set.reverted',
        'change_set.reversal_conflicted'
      )
    ),
  ADD CONSTRAINT domain_events_schema_version_check
    CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0'));

ALTER TABLE petra.outbox_records
  ADD CONSTRAINT outbox_records_schema_version_check
    CHECK (payload ->> 'schema_version' IN ('1.0.0', '1.1.0'));

CREATE OR REPLACE FUNCTION petra.guard_graph_projection_record_outbox()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE outbox_payload jsonb;
BEGIN
  SELECT payload INTO outbox_payload FROM petra.outbox_records
   WHERE outbox_id = NEW.outbox_id;
  IF outbox_payload IS NULL
     OR (outbox_payload ->> 'outbox_position')::bigint
       IS DISTINCT FROM NEW.outbox_position
     OR (outbox_payload ->> 'target_sequence')::bigint
       IS DISTINCT FROM NEW.target_sequence
     OR outbox_payload ->> 'partition_key' IS DISTINCT FROM NEW.project_id
     OR outbox_payload #>> '{message,event,event_id}'
       IS DISTINCT FROM NEW.event_id
     OR (outbox_payload #>> '{message,event,event_position}')::bigint
       IS DISTINCT FROM NEW.event_position
     OR (outbox_payload #>> '{message,event,stream_revision}')::bigint
       IS DISTINCT FROM NEW.stream_revision
     OR (NEW.outcome_kind = 'applied'
       AND outbox_payload #>> '{message,event,event,event_type}'
         NOT IN ('change_set.applied', 'change_set.reverted')) THEN
    RAISE EXCEPTION 'Projection receipt differs from its authoritative outbox record'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN petra.change_sets.compensates_change_set_id IS
  'The immutable applied promotion reversed by this ChangeSet; null for promotions.';
