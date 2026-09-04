CREATE FUNCTION petra.guard_immutable_model_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Model execution records are immutable; append a new request, call, proposal, or certification'
    USING ERRCODE = '55000';
END;
$$;

CREATE TABLE petra.model_role_certifications (
  role_certification_id text PRIMARY KEY
    CHECK (role_certification_id ~ '^role_certification_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  model_deployment_id text NOT NULL
    CHECK (model_deployment_id ~ '^model_deployment_[0-9A-HJKMNP-TV-Z]{26}$'),
  provider_id text NOT NULL
    CHECK (provider_id ~ '^provider_[0-9A-HJKMNP-TV-Z]{26}$'),
  role text NOT NULL CHECK (role = 'extractor'),
  role_profile_id text NOT NULL
    CHECK (role_profile_id ~ '^role_profile_[0-9A-HJKMNP-TV-Z]{26}$'),
  role_profile_version text NOT NULL,
  domain text NOT NULL,
  language text NOT NULL,
  document_class text NOT NULL CHECK (document_class IN ('peer_reviewed', 'preprint', 'scholarly')),
  decision_status text NOT NULL CHECK (decision_status IN ('active', 'failed', 'invalidated', 'expired')),
  valid_from timestamptz NOT NULL,
  expires_at timestamptz,
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  certified_by_actor_id text NOT NULL,
  certified_by_actor_kind text NOT NULL,
  certified_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.model-role-certification')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'role_certification_id' = role_certification_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{deployment,model_deployment_id}' = model_deployment_id)
    CHECK (payload #>> '{deployment,provider_id}' = provider_id)
    CHECK (payload #>> '{role_profile,role}' = role)
    CHECK (payload #>> '{role_profile,role_profile_id}' = role_profile_id)
    CHECK (payload #>> '{role_profile,version}' = role_profile_version)
    CHECK (payload #>> '{scope,domain}' = domain)
    CHECK (payload #>> '{scope,language}' = language)
    CHECK (payload #>> '{scope,document_class}' = document_class)
    CHECK (payload #>> '{decision,status}' = decision_status)
    CHECK ((payload #>> '{decision,valid_from}')::timestamptz = valid_from)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{certified_by,actor_id}' = certified_by_actor_id)
    CHECK (payload #>> '{certified_by,actor_kind}' = certified_by_actor_kind)
    CHECK ((payload ->> 'certified_at')::timestamptz = certified_at),
  UNIQUE (model_deployment_id, role_certification_id),
  FOREIGN KEY (certified_by_actor_id, certified_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (expires_at IS NULL OR expires_at > valid_from)
);

CREATE TABLE petra.model_requests (
  model_request_id text PRIMARY KEY
    CHECK (model_request_id ~ '^model_request_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  workflow_id text NOT NULL
    CHECK (workflow_id ~ '^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$'),
  role text NOT NULL CHECK (role = 'extractor'),
  impact_class text NOT NULL CHECK (impact_class IN ('routine', 'difficult', 'adversarial', 'high_impact')),
  egress_class text NOT NULL CHECK (egress_class IN ('E0', 'E1', 'E2', 'E3')),
  routing_policy_id text NOT NULL
    CHECK (routing_policy_id ~ '^routing_policy_[0-9A-HJKMNP-TV-Z]{26}$'),
  routing_policy_hash text NOT NULL CHECK (routing_policy_hash ~ '^sha256:[0-9a-f]{64}$'),
  selected_deployment_id text,
  selected_certification_id text,
  terminal_state text NOT NULL CHECK (
    terminal_state IN (
      'completed', 'blocked_policy', 'budget_exhausted',
      'provider_unavailable', 'validation_failed'
    )
  ),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.model-request')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'model_request_id' = model_request_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{content,project_id}' = project_id)
    CHECK (payload #>> '{content,workflow,workflow_id}' = workflow_id)
    CHECK (payload #>> '{content,role}' = role)
    CHECK (payload #>> '{content,impact_class}' = impact_class)
    CHECK (payload #>> '{content,outbound_context,egress_class}' = egress_class)
    CHECK (payload #>> '{content,routing_policy_ref,routing_policy_id}' = routing_policy_id)
    CHECK (payload #>> '{content,routing_policy_ref,content_hash}' = routing_policy_hash)
    CHECK (payload #>> '{content,terminal,state}' = terminal_state)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at)
    CHECK ((payload ->> 'completed_at')::timestamptz = completed_at),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (selected_certification_id)
    REFERENCES petra.model_role_certifications (role_certification_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (completed_at >= created_at),
  CHECK (
    (terminal_state = 'blocked_policy'
      AND selected_deployment_id IS NULL
      AND selected_certification_id IS NULL)
    OR
    (terminal_state <> 'blocked_policy'
      AND selected_deployment_id IS NOT NULL
      AND selected_certification_id IS NOT NULL)
  )
);

CREATE TABLE petra.model_calls (
  model_call_id text PRIMARY KEY
    CHECK (model_call_id ~ '^model_call_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  model_request_id text NOT NULL,
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 20),
  attempt_kind text NOT NULL CHECK (attempt_kind IN ('initial', 'retry', 'schema_repair', 'fallback')),
  model_deployment_id text NOT NULL,
  provider_id text NOT NULL,
  observed_revision text NOT NULL,
  replayability text NOT NULL CHECK (replayability IN ('exact', 'best_effort', 'unavailable')),
  outcome text NOT NULL CHECK (outcome IN ('success', 'validation_failed', 'provider_error', 'refusal', 'timeout')),
  input_tokens bigint NOT NULL CHECK (input_tokens >= 0),
  output_tokens bigint NOT NULL CHECK (output_tokens >= 0),
  cost_amount numeric(24, 12) NOT NULL CHECK (cost_amount >= 0),
  cost_currency text NOT NULL CHECK (cost_currency = 'USD'),
  total_ms bigint NOT NULL CHECK (total_ms >= 0),
  validation_ms bigint NOT NULL CHECK (validation_ms >= 0),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.model-call')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'model_call_id' = model_call_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{content,model_request_id}' = model_request_id)
    CHECK ((payload #>> '{content,attempt}')::integer = attempt)
    CHECK (payload #>> '{content,attempt_kind}' = attempt_kind)
    CHECK (payload #>> '{content,deployment,model_deployment_id}' = model_deployment_id)
    CHECK (payload #>> '{content,deployment,provider_id}' = provider_id)
    CHECK (payload #>> '{content,deployment,observed_revision}' = observed_revision)
    CHECK (payload #>> '{content,deployment,replayability}' = replayability)
    CHECK (payload #>> '{content,outcome}' = outcome)
    CHECK ((payload #>> '{content,usage,input_tokens}')::bigint = input_tokens)
    CHECK ((payload #>> '{content,usage,output_tokens}')::bigint = output_tokens)
    CHECK ((payload #>> '{content,cost,amount}')::numeric = cost_amount)
    CHECK (payload #>> '{content,cost,currency}' = cost_currency)
    CHECK ((payload #>> '{content,timing,total_ms}')::bigint = total_ms)
    CHECK ((payload #>> '{content,timing,validation_ms}')::bigint = validation_ms)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK ((payload ->> 'started_at')::timestamptz = started_at)
    CHECK ((payload ->> 'completed_at')::timestamptz = completed_at),
  UNIQUE (model_request_id, attempt),
  FOREIGN KEY (model_request_id) REFERENCES petra.model_requests (model_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (completed_at >= started_at)
);

CREATE TABLE petra.model_evidence_proposal_bundles (
  evidence_proposal_bundle_id text PRIMARY KEY
    CHECK (evidence_proposal_bundle_id ~ '^evidence_proposal_bundle_[0-9A-HJKMNP-TV-Z]{26}$'),
  revision bigint NOT NULL CHECK (revision = 1),
  project_id text NOT NULL,
  model_request_id text NOT NULL,
  model_call_id text NOT NULL,
  extraction_run_id text NOT NULL
    CHECK (extraction_run_id ~ '^extraction_run_[0-9A-HJKMNP-TV-Z]{26}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_actor_id text NOT NULL,
  created_by_actor_kind text NOT NULL,
  created_at timestamptz NOT NULL,
  record_hash text NOT NULL CHECK (record_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL
    CHECK (jsonb_typeof(payload) = 'object')
    CHECK (payload ->> 'schema_name' = 'petra.evidence-proposal-bundle')
    CHECK (payload ->> 'schema_version' = '1.0.0')
    CHECK (payload ->> 'evidence_proposal_bundle_id' = evidence_proposal_bundle_id)
    CHECK ((payload ->> 'revision')::bigint = revision)
    CHECK (payload #>> '{content,project_id}' = project_id)
    CHECK (payload #>> '{content,extraction,extraction_kind}' = 'model_extraction')
    CHECK (payload #>> '{content,extraction,model_request_id}' = model_request_id)
    CHECK (payload #>> '{content,extraction,model_call_id}' = model_call_id)
    CHECK (payload #>> '{content,extraction,extraction_run_id}' = extraction_run_id)
    CHECK (payload ->> 'content_hash' = content_hash)
    CHECK (payload #>> '{created_by,actor_id}' = created_by_actor_id)
    CHECK (payload #>> '{created_by,actor_kind}' = created_by_actor_kind)
    CHECK ((payload ->> 'created_at')::timestamptz = created_at),
  FOREIGN KEY (project_id) REFERENCES petra.projects (project_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_request_id) REFERENCES petra.model_requests (model_request_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (model_call_id) REFERENCES petra.model_calls (model_call_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by_actor_id, created_by_actor_kind)
    REFERENCES petra.actors (actor_id, actor_kind)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX model_requests_project_created_idx
  ON petra.model_requests (project_id, created_at DESC, model_request_id);
CREATE INDEX model_calls_request_attempt_idx
  ON petra.model_calls (model_request_id, attempt);
CREATE INDEX model_proposals_project_created_idx
  ON petra.model_evidence_proposal_bundles (project_id, created_at DESC, evidence_proposal_bundle_id);

CREATE TRIGGER guard_model_role_certifications_immutable
BEFORE UPDATE OR DELETE ON petra.model_role_certifications
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_model_record();

CREATE TRIGGER guard_model_requests_immutable
BEFORE UPDATE OR DELETE ON petra.model_requests
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_model_record();

CREATE TRIGGER guard_model_calls_immutable
BEFORE UPDATE OR DELETE ON petra.model_calls
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_model_record();

CREATE TRIGGER guard_model_evidence_proposals_immutable
BEFORE UPDATE OR DELETE ON petra.model_evidence_proposal_bundles
FOR EACH ROW EXECUTE FUNCTION petra.guard_immutable_model_record();
