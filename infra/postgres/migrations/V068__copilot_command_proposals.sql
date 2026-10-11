-- Activities resolve to existing canonical conversation, Work and Run owners.
-- Immutable content remains in verified private Artifacts. These are indexes,
-- not an alternative conversation authority or domain command ledger.
CREATE TABLE petra.copilot_command_proposals (
  proposal_id text PRIMARY KEY CHECK (proposal_id ~ '^proposal_[0-9A-HJKMNP-TV-Z]{26}$'),
  project_id text NOT NULL REFERENCES petra.projects(project_id),
  actor_id text NOT NULL REFERENCES petra.actors(actor_id),
  origin_run_id text NOT NULL,
  origin_thread_id text NOT NULL,
  origin_thread_revision bigint NOT NULL,
  origin_thread_hash text NOT NULL,
  origin_turn_id text NOT NULL,
  input_artifact_id text NOT NULL REFERENCES petra.artifacts(artifact_id),
  input_hash text NOT NULL CHECK (input_hash ~ '^sha256:[0-9a-f]{64}$'),
  work_unit_id text NOT NULL UNIQUE REFERENCES petra.work_units(work_unit_id),
  interaction_run_id text NOT NULL UNIQUE REFERENCES petra.interaction_runs(interaction_run_id),
  FOREIGN KEY(origin_run_id,project_id,actor_id)
    REFERENCES petra.project_copilot_context_refs(run_id,project_id,actor_id),
  FOREIGN KEY(origin_thread_id,origin_thread_revision,origin_thread_hash)
    REFERENCES petra.project_thread_revisions(project_thread_id,revision,content_hash),
  FOREIGN KEY(origin_thread_id,origin_thread_revision,origin_turn_id)
    REFERENCES petra.project_thread_turn_bindings(project_thread_id,thread_revision,project_turn_id)
);
CREATE TABLE petra.copilot_command_proposal_terminals (
  proposal_id text PRIMARY KEY REFERENCES petra.copilot_command_proposals(proposal_id),
  state text NOT NULL CHECK (state IN ('completed','failed')),
  output_artifact_id text REFERENCES petra.artifacts(artifact_id),
  output_hash text CHECK (output_hash ~ '^sha256:[0-9a-f]{64}$'),
  error text,
  provider_model text,
  provider_thread_id text,
  provider_turn_id text,
  CHECK ((state='completed' AND output_artifact_id IS NOT NULL AND output_hash IS NOT NULL
    AND error IS NULL AND provider_model IS NOT NULL AND length(provider_model)>0
    AND provider_thread_id IS NOT NULL AND length(provider_thread_id)>0
    AND provider_turn_id IS NOT NULL AND length(provider_turn_id)>0)
    OR (state='failed' AND output_artifact_id IS NULL AND output_hash IS NULL
    AND error IS NOT NULL AND length(error)>0 AND provider_model IS NULL
    AND provider_thread_id IS NULL AND provider_turn_id IS NULL))
);
CREATE TABLE petra.copilot_command_decisions (
  decision_id text PRIMARY KEY CHECK (decision_id ~ '^decision_[0-9A-HJKMNP-TV-Z]{26}$'),
  proposal_id text NOT NULL REFERENCES petra.copilot_command_proposals(proposal_id),
  preview_key text NOT NULL CHECK(length(preview_key) BETWEEN 1 AND 512),
  actor_id text NOT NULL REFERENCES petra.actors(actor_id),
  decision text NOT NULL CHECK(decision IN ('accept','reject')),
  decision_artifact_id text NOT NULL REFERENCES petra.artifacts(artifact_id),
  decision_hash text NOT NULL CHECK(decision_hash ~ '^sha256:[0-9a-f]{64}$'),
  UNIQUE(proposal_id,preview_key)
);
CREATE TABLE petra.copilot_command_decision_claims (
  decision_id text PRIMARY KEY REFERENCES petra.copilot_command_decisions(decision_id),
  claimed_at timestamptz NOT NULL
);
CREATE TABLE petra.copilot_command_decision_observations (
  decision_id text PRIMARY KEY REFERENCES petra.copilot_command_decision_claims(decision_id),
  observation_artifact_id text NOT NULL REFERENCES petra.artifacts(artifact_id),
  observation_hash text NOT NULL CHECK(observation_hash ~ '^sha256:[0-9a-f]{64}$'),
  state text NOT NULL CHECK(state IN ('observed','reconciliation_required'))
);
CREATE FUNCTION petra.validate_copilot_command_proposal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origin petra.project_copilot_owner_bindings%ROWTYPE; run jsonb; work jsonb;
BEGIN
  SELECT * INTO STRICT origin FROM petra.project_copilot_owner_bindings
    WHERE run_id=NEW.origin_run_id AND revision=2;
  SELECT r.payload INTO STRICT run FROM petra.interaction_runs h
    JOIN petra.interaction_run_revisions r ON r.interaction_run_id=h.interaction_run_id AND r.revision=h.current_revision
    WHERE h.interaction_run_id=NEW.interaction_run_id;
  SELECT r.payload INTO STRICT work FROM petra.work_units h
    JOIN petra.work_unit_revisions r ON r.work_unit_id=h.work_unit_id AND r.revision=h.current_revision
    WHERE h.work_unit_id=NEW.work_unit_id;
  IF origin.project_id IS DISTINCT FROM NEW.project_id OR origin.actor_id IS DISTINCT FROM NEW.actor_id
    OR origin.project_thread_id IS DISTINCT FROM NEW.origin_thread_id
    OR origin.thread_revision IS DISTINCT FROM NEW.origin_thread_revision
    OR origin.thread_hash IS DISTINCT FROM NEW.origin_thread_hash
    OR run->>'project_id' IS DISTINCT FROM NEW.project_id
    OR work->>'project_id' IS DISTINCT FROM NEW.project_id
    OR run#>>'{content,authority_context,actor,actor_id}' IS DISTINCT FROM NEW.actor_id
    OR run#>>'{content,input,input_hash}' IS DISTINCT FROM NEW.input_hash
    OR run#>>'{content,input,source_message_id}' IS DISTINCT FROM NEW.proposal_id
    OR run#>>'{content,correlation,work_unit_ref,work_unit_id}' IS DISTINCT FROM NEW.work_unit_id
    OR work#>>'{spec,workflow_name}' IS DISTINCT FROM 'petra.copilot.command-proposal'
    OR run#>>'{content,lifecycle,state}' IS DISTINCT FROM 'running'
    OR work#>>'{status,state}' IS DISTINCT FROM 'running'
    OR NOT EXISTS (SELECT 1 FROM petra.artifacts WHERE artifact_id=NEW.input_artifact_id AND content_hash=NEW.input_hash)
  THEN RAISE EXCEPTION 'command proposal requires exact canonical origin, input, Work and Run' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER copilot_command_proposal_is_exact BEFORE INSERT ON petra.copilot_command_proposals
  FOR EACH ROW EXECUTE FUNCTION petra.validate_copilot_command_proposal();
CREATE FUNCTION petra.validate_copilot_command_decision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM petra.copilot_command_proposals p
    JOIN petra.copilot_command_proposal_terminals t ON t.proposal_id=p.proposal_id
    WHERE p.proposal_id=NEW.proposal_id AND p.actor_id=NEW.actor_id AND t.state='completed')
    OR NOT EXISTS (SELECT 1 FROM petra.artifacts WHERE artifact_id=NEW.decision_artifact_id AND content_hash=NEW.decision_hash)
  THEN RAISE EXCEPTION 'human decision requires its exact owned completed proposal and Artifact' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER copilot_command_decision_is_exact BEFORE INSERT ON petra.copilot_command_decisions
  FOR EACH ROW EXECUTE FUNCTION petra.validate_copilot_command_decision();
CREATE FUNCTION petra.validate_copilot_command_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM petra.copilot_command_decisions WHERE decision_id=NEW.decision_id AND decision='accept')
  THEN RAISE EXCEPTION 'command execution requires an immutable explicit human acceptance' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER copilot_command_claim_requires_acceptance BEFORE INSERT ON petra.copilot_command_decision_claims
  FOR EACH ROW EXECUTE FUNCTION petra.validate_copilot_command_claim();
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['copilot_command_proposals','copilot_command_proposal_terminals',
    'copilot_command_decisions','copilot_command_decision_claims','copilot_command_decision_observations'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON petra.%I FOR EACH ROW EXECUTE FUNCTION petra.reject_immutable_row_mutation()', name || '_immutable', name);
  END LOOP;
END; $$;
