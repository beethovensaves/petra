-- The existing immutable command record retains the complete exact human
-- checkpoint beside its existing envelope. Command and History identities stay
-- unchanged. There is no additional checkpoint or decision ledger.
ALTER TABLE petra.command_executions
  ADD COLUMN review_apply_request jsonb,
  ADD CONSTRAINT command_executions_review_checkpoint_context_check CHECK (
    (idempotency_key LIKE 'review-checkpoint:%') = (review_apply_request IS NOT NULL)
    AND (review_apply_request IS NULL OR (
      command_name IN ('SubmitChangeSet', 'RecordApproval', 'ApplyChangeSet')
      AND actor_kind = 'human'
      AND jsonb_typeof(review_apply_request) = 'object'
      AND review_apply_request ->> 'schema_name' = 'petra.review-session-apply-request'
      AND review_apply_request ->> 'schema_version' = '1.0.0'
      AND review_apply_request #>> '{checkpoint,binding,project_id}' = project_id
      AND review_apply_request #> '{checkpoint,binding,authorization_basis,actor}' = envelope -> 'actor'
      AND review_apply_request #>> '{checkpoint,binding,authorization_basis,kind}' = 'authenticated_human_checkpoint'
      AND review_apply_request #>> '{checkpoint,binding,authorization_basis,decision}' = 'apply'
      AND review_apply_request #> '{checkpoint,binding,review_policy}' = '{"applicability":"not_applicable"}'::jsonb
      AND (review_apply_request ->> 'decided_at')::timestamptz = submitted_at
      AND split_part(idempotency_key, ':', 2) || ':' || split_part(idempotency_key, ':', 3)
          = review_apply_request #>> '{checkpoint,displayed_commitment_hash}'
    ) IS TRUE)
  );
