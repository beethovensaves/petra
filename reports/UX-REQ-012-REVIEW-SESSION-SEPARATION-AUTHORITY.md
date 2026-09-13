# UX-REQ-012 authenticated ReviewSession member separation

Status: bounded Wave 4 backend operation complete; frozen-interface integration
and later Review work remain open
Date: 2026-09-12
Design counterpart: `cab37835d160102cebf4b6b2057016dea785f593`

## Result

`SeparateReviewSessionMember` now moves one exact, unchanged member from a
current open multi-member ReviewSession into a new canonical ReviewSession. The
source ReviewSession advances one revision with the other members in their
original order. The new ReviewSession starts at revision 1 with the selected
member. Every Review member, WorkingCandidate, WorkingRelationship, profile
record, basis, provenance, validation record, ChangeSet, Approval, command,
event, projection receipt, and derived member outcome keeps its existing
identity and content.

Separation changes only Review membership. It does not decide, validate,
approve, reject, apply, recover, or project anything. It does not infer that
the separated member is compatible with another Review or eligible for
commitment.

## Contract, API, and typed client

Command envelope 1.9, CapabilityGrant 1.7, and
`petra.review-session-separation-receipt@1.0.0` add only
`SeparateReviewSessionMember`. The command binds the exact Project,
authenticated human Actor and grant, current open ReviewSession revision and
content hash, selected Review member, command, and idempotency identities.

The authenticated endpoint is:

`POST /api/commands/projects/{project_id}/reviews/{review_session_id}/separation`

The compact request contains only the command identity, idempotency key, exact
expected ReviewSession reference, and Review member identity. The server
resolves the Actor and exactly one eligible Project-scoped grant.
Request-carried Actor, capability, candidate content, validation, decision,
ChangeSet, Approval, destination identity, or conversational authority is not
accepted.

The renderer-neutral client validates the compact request and the returned
receipt, source ReviewSession, separated ReviewSession, exact member partition,
and shared task-sized Review context. It rejects a mismatched result before
presentation. No frozen React component, CSS, browser route, fixture,
accessibility behavior, or interaction test changed in this backend slice.

## Persistence and atomicity

V040 extends the existing capability and canonical command-execution
constraints. It adds no table or ledger. One serializable transaction locks the
command, idempotency, Project, source ReviewSession, and deterministic
destination ReviewSession identities. It verifies the exact current open
ReviewSession, current Project authority snapshot, current ProjectDefinition,
current Objective, registered scientific profile, canonical stored hashes, and
unambiguous ownership of every profile binding.

The transaction appends the source revision, creates the destination
ReviewSession, copies the existing immutable working bindings for both
partitions, records the typed receipt in `petra.command_executions`, and
advances the source head. Generic ReviewSession registration rejects direct
membership changes, so callers cannot bypass the authenticated command
boundary.

Existing ChangeSets remain the atomic unit. Before separation, the repository
validates every Project ChangeSet that touches a Review member. The command
fails if one ChangeSet crosses the proposed partition, includes a target
outside the exact member, or omits part of that member's semantic unit.
Separation never splits, duplicates, rewrites, or transfers a ChangeSet,
Approval, command, event, or projection ledger.

An exact retry returns the retained receipt and both exact ReviewSession
revisions with `applied: false`. Changed governed input under the same command
or idempotency identity fails closed. A second command cannot create another
destination from the stale source revision.

## Failure behavior

The operation fails closed for non-human or unauthorized callers; stale,
missing, cross-Project, non-open, single-member, unsupported-profile, or
incompatible ReviewSessions; missing members; stale Project authority,
ProjectDefinition, or Objective; ambiguous profile-record ownership; an
existing cross-partition or incomplete atomic ChangeSet; corrupt stored
ReviewSession, ChangeSet, receipt, or hash state; destination conflict; retry
mismatch; and concurrent head changes.

All governed writes share one transaction. A failed attempt retains no command
result, ReviewSession revision, destination ReviewSession, or binding prefix.
Validation success, model output, candidate similarity, graph position, and
conversational text cannot authorize or alter separation.

## Verification

All checks use pinned Node 24.20.0 and npm 11.19.0.

- Focused contract tests accept the exact command, grant, receipt, partition,
  preservation, and no-authority boundary and reject incomplete or injected
  authority.
- Focused renderer-neutral client and authenticated route tests cover compact
  transport, server-resolved principal and grant, exact success matching,
  strict input, authorization failure, stale error mapping, and mismatched
  success rejection.
- A fresh PostgreSQL 18.6 store validates and applies Flyway V001 through V040.
  All 131 PostgreSQL integration tests across 16 files pass. The separation
  cases prove atomic two-Review partitioning, unchanged candidate and
  ChangeSet cardinality, exact replay, direct-registration bypass rejection,
  and fail-closed unauthorized, stale, single-member, unsupported-profile,
  cross-partition ChangeSet, and retry-mismatch behavior.
- The complete `npm run verify` gate passes generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, repository test suites, and
  handoff automation. The production build retains its existing non-failing
  chunk-size advisory.

## Remaining boundary

The persisted adapter still supports only the registered scientific
Claim–`ASSERTS` profile, so this is not paired-profile conformance. The slice
does not add member recovery, scheduled validator reruns, dependency-group
editing, a second profile, ProjectBriefView, CommunicationPlan, multi-member
frozen presentation, or the cumulative live Wave 4 proof.

The next safe design boundary is a bounded conformance review of whether the
accepted frozen Review hierarchy has an existing explicit separation control.
Any integration must send the exact Review and member identities, retain the
same command for uncertain-outcome retry, accept only the matching typed
partition, reload authenticated Review state after success, and avoid implying
validation, approval, application, recovery, or semantic compatibility. If no
accepted control exists, the design role should return an unchanged handoff
instead of inventing one.

Wave 4 is not complete.
