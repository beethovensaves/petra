# Manual ReviewSession Apply checkpoint

Status: backend checkpoint implemented; frozen Apply remains unavailable
Date: 2026-09-13
Backend starting commit: `43add19d8d22bf6bb929aef66162486c88ed95dd`
Exact design counterpart: `c63ef9104078b784d03cdcc9a382ee5ffce584dc`
Authority: [D021](../decisions/D021-manual-review-session-apply-checkpoint.md),
[D020](../decisions/D020-read-first-review-member-recovery.md), and
[UX-REQ-012](UX-BACKEND-HANDOFF.md#ux-req-012--profile-neutral-review-session-read-and-command-composition).

## One human checkpoint composes the existing commands

The authenticated API prepares one complete scientific Claim–ASSERTS promotion
ChangeSet for an exact open working Review. One explicit Apply request supplies
its human decision and composes `SubmitChangeSet`, `RecordApproval`, and
`ApplyChangeSet`. Each command keeps its existing transaction, authorization,
idempotency, result, event, and outbox rules. The initial path requires an
available candidate without an existing ChangeSet touching its targets. An
existing submitted, approved, rejected, conflicted, or applied ChangeSet requires
canonical reconciliation; this API does not replace or resume that owner.

The versioned `review-session-apply-checkpoint`, `review-session-apply-request`,
and `review-session-apply-result` contracts are registered at `1.0.0`.
`authorization_basis` names the authenticated human checkpoint and its Apply
decision. `review_policy` contains only `applicability: not_applicable`.
Delegation, automatic approval, fabricated policy identity/version, and a second
ordinary approval gesture are outside this path.

The checkpoint binds the exact ProjectDefinition and profile, complete Review
revision/hash/lifecycle and originating context, all member identities, working
candidate and relationship revisions, profile records, source revisions, basis,
provenance, validation, qualifications, snapshots, targets, operations, and
consequences. The selected member is an inspection context. Every member sharing
the selected pair belongs to its atomic manifest; selection cannot remove a
member or operation. Other members retain their independent outcomes.

## Current-state guards run inside each command transaction

`PostgresReviewSessionApplyBoundary` composes canonical Review, working-state,
scientific evidence, definition, source, command, and Recovery records.
The existing change-control owner accepts additional server guards inside its
transaction. It checks the exact planned command, current Actor and grants,
then rechecks the Review and its dependencies under the relevant locks before
executing an unseen command. Only that exact sequence's already committed
command prefix may advance the Review snapshot during execution. An unrelated
Project event, revised Review, newer working head, changed source or definition,
invalid validation, incomplete membership, or mismatched commitment stops it.
The scientific owner still checks the complete promotion pair and before-state.

V041 adds `review_apply_request` to the existing immutable `command_executions`
record. Each retained step carries the complete human checkpoint beside its
unchanged command envelope. The command ID and idempotency key bind its commitment
hash; the exact command fingerprint also binds the human decision time. Database
constraints bind checkpoint context to the human Actor, Project, decision time,
manual basis, and absent policy. There is no new checkpoint or decision ledger.
An unseen command in the reserved checkpoint namespace cannot execute without
the checkpoint owner. Existing command and History schema identities remain
unchanged, and the registered InteractionRun interrupt protocol is preserved.

## Typed transport and retained outcomes

`ReviewSessionApplyClient` is renderer-neutral. It validates complete checkpoint
and result schemas, hashes, request identity, command and Approval identities,
complete atomic membership, resulting target revisions, canonical event/History
references, and the composed D020 assessment. It captures the request before
asynchronous transport and does not retry automatically.

- `GET /api/queries/projects/:projectId/reviews/:reviewSessionId/apply-checkpoint`
  takes `expected_revision`, `expected_content_hash`, and
  `selected_review_member_id`. It resolves the authenticated human's current
  grants and returns the server-composed exact commitment.
- `POST /api/commands/projects/:projectId/reviews/:reviewSessionId/apply`
  takes `petra.review-session-apply-request@1.0.0`: the complete checkpoint and
  the explicit human decision's `decided_at` timestamp. It accepts no separate
  approval or execution mode.

The result reports each command as executed, replayed, failed, unattempted, or
unverified. `outcome: applied` refers to the checkpoint's one complete ChangeSet,
not every member of the Review. The assessment retains every session member,
its independent outcome, complete ChangeSet groups, canonical History references,
and separate projection observations. Recovery remains read-only with empty
actions; compensation remains owned by History.

A complete retained success replays through the same authorized command owners
without duplicate effects. An incomplete retained prefix returns its evidence
without sending the missing suffix, even if grants later become available.
A lost or inconsistent observation requires D020 reconciliation and cannot imply
no effect or retry permission. If the Review has since changed, reload its current
identity before requesting that assessment. The production boundary composes the
configured History reader for its narrow compensation facts.

## Verification and remaining design work

Using Node 24.20.0 and npm 11.19.0, all 53 focused server/core checks pass.
They cover the new authentication/request boundary and the existing scientific
decision, result-binding, change-control, and durable-interrupt paths. All 145
PostgreSQL tests pass across 16 files on a fresh store after V001–V041. The cases exercise the production server route through the typed
client, exact restart replay and durable cardinalities, guarded execution,
checkpoint retention, stale and mismatched bindings, denied authority,
unsupported Review profiles, shared atomic membership, retained prefixes,
independent members, and projection lag. The complete repository gate outcome is recorded in the handoff.

The authority/atomicity review required durable retention of the complete human
checkpoint and a distinction between new execution and concurrent exact replay.
Both are implemented in the existing command owner. Felicity review keeps
preparation failures distinct from uncertain execution observations and limits
success to the selected complete ChangeSet.

The design role may now inspect these exact contracts for one bounded integration
in the frozen Changes-to-apply and Decision regions. It must display the prepared
commitment, send the single explicit checkpoint, validate the matching result,
and reload the authorized Review. It must preserve all member outcomes, separate
projection lag, read-only Recovery, originating-task return, and History ownership.
Apply remains unavailable in the current frozen React surface: this slice changes
no components, CSS, browser routes, or presentation fixtures. No new browser or
accessibility evidence is claimed. Paired-profile conformance, Brief,
communication, and the cumulative production exit proof remain open. Wave 4 is
not complete.
