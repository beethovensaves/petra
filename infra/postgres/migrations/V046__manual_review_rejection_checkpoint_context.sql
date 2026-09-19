-- Rejection reuses the canonical ChangeSet and Approval ledgers. The exact
-- server-composed human checkpoint is retained beside each immutable command so
-- restart replay can prove identity without inventing a rejection ledger.
ALTER TABLE petra.command_executions
  ADD COLUMN review_reject_request jsonb,
  ADD CONSTRAINT command_executions_review_reject_context_check CHECK (
    (idempotency_key LIKE 'review-reject:%') = (review_reject_request IS NOT NULL)
    AND (review_reject_request IS NULL OR (
      command_name IN ('SubmitChangeSet', 'RecordApproval')
      AND actor_kind = 'human'
      AND jsonb_typeof(review_reject_request) = 'object'
      AND review_reject_request ->> 'schema_name' = 'petra.review-session-reject-request'
      AND review_reject_request ->> 'schema_version' = '1.0.0'
      AND review_reject_request #>> '{checkpoint,binding,project_id}' = project_id
      AND review_reject_request #> '{checkpoint,binding,authorization_basis,actor}' = envelope -> 'actor'
      AND review_reject_request #>> '{checkpoint,binding,authorization_basis,kind}' = 'authenticated_human_checkpoint'
      AND review_reject_request #>> '{checkpoint,binding,authorization_basis,decision}' = 'reject'
      AND (review_reject_request ->> 'decided_at')::timestamptz = submitted_at
      AND CASE command_name
        WHEN 'SubmitChangeSet' THEN
          review_reject_request #>> '{checkpoint,binding,capability_grants,SubmitChangeSet}'
        WHEN 'RecordApproval' THEN
          review_reject_request #>> '{checkpoint,binding,capability_grants,RecordApproval}'
      END = capability_grant_id
      AND split_part(idempotency_key, ':', 2) || ':' || split_part(idempotency_key, ':', 3)
          = review_reject_request #>> '{checkpoint,displayed_commitment_hash}'
      AND split_part(idempotency_key, ':', 4) = CASE command_name
        WHEN 'SubmitChangeSet' THEN 'submit'
        WHEN 'RecordApproval' THEN 'approval'
      END
    ) IS TRUE)
    AND NOT (
      review_apply_request IS NOT NULL
      AND review_reject_request IS NOT NULL
    )
  );

COMMENT ON COLUMN petra.command_executions.review_reject_request IS
  'Exact server-composed human rejection checkpoint retained with SubmitChangeSet and rejected RecordApproval commands; not a second Review ledger.';
