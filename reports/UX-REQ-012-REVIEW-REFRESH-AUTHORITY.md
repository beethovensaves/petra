# UX-REQ-012 authenticated ReviewSession refresh authority

Status: bounded Wave 4 backend refresh operation complete; frozen-interface
integration and later Review operations remain open
Date: 2026-09-12
Design counterpart: `8fc290df8252b27f074cfff2ba057c4c6a15073a`

## Result

`RefreshReviewSession` now recomposes one exact current open ReviewSession
against the current Project authority position and compatible current heads of
its existing working members. A successful refresh keeps the ReviewSession and
member identities, appends one ReviewSession revision, and advances that
revision's authority snapshot and exact WorkingCandidate,
WorkingRelationship, Claim, and ASSERTS bindings.

The prior ReviewSession revision and its exact comparison bindings remain
stored and are addressable through the backend revision read. Existing working
revisions, validation records, ChangeSets, Approvals, domain events, outbox
records, and projection records are not overwritten or replaced. Refresh
itself creates none of them and makes no Review decision. Candidate correction,
material-basis revision, validation, approval, rejection, separation,
application, and projection remain with their existing owners.

## Contract and authenticated API

Command envelope 1.5 adds only `RefreshReviewSession`. The command binds one
exact open ReviewSession identity, revision, and content hash. It has no
member-selection, rationale, conversational, approval, validation, or mutation
fields. CapabilityGrant 1.4 adds the matching explicit Project-scoped command.

The authenticated endpoint is:

`POST /api/commands/projects/{project_id}/reviews/{review_session_id}/refresh`

Its body contains only a caller-owned command identity, idempotency key, and
exact expected ReviewSession reference. The server resolves the authenticated
Actor and one current CapabilityGrant, constructs the registered envelope, and
rejects extra fields and route/body identity mismatches before execution.

The new renderer-neutral client sends that bounded request and validates the
typed receipt, resulting ReviewSession, command identity, Project and Review
identity, revision, content hash, lifecycle, authority snapshot, member order,
and exact refreshed working references before returning the result. This slice
does not modify frozen React components, CSS, browser routes, or presentation
fixtures.

## Persistence and authority boundary

V036 extends the existing capability and command constraints for the new
schema versions and command name. It creates no table. The refresh transaction
reuses `petra.command_executions`, `petra.review_sessions`,
`petra.review_session_revisions`, and the existing immutable membership
bindings.

Execution runs at serializable isolation and locks the command,
idempotency-key, Project, and ReviewSession identities. It authorizes the exact
Actor and grant, verifies the exact current session head and open lifecycle,
then resolves current Project authority, ProjectDefinition, Objective, working
heads, registered profile records, task context, input snapshot, and
relationship endpoint. The first adapter supports only ReviewSession 1.1 with
the registered scientific Claim–ASSERTS shape: one WorkingCandidate and one
ASSERTS relationship per member.

A compatible refresh copies the current member roles and identities into the
new session revision, replaces only their exact working/profile references,
and records the current authority snapshot. Existing candidate and basis
records are referenced, not edited. The typed refresh receipt is retained as
the canonical command result. It binds the prior and resulting session record
hashes, exact refreshed members, both snapshots, preservation claims, and an
explicit no-authority result. No duplicate Review, candidate, validation,
ChangeSet, Approval, command, event, projection, or recovery ledger is added.

## Retry and failure behavior

An exact retry returns the retained receipt and resulting ReviewSession
revision with `applied: false`; it does not append another revision. Reusing a
command identity or idempotency key for different governed content fails
closed.

The transaction also fails closed for an unauthorized Actor or grant, a stale
or mismatched session reference, a missing or non-open session, a no-op refresh,
an unsupported Review/profile shape, a changed ProjectDefinition or Objective,
a missing or incompatible current working head, an unregistered or non-current
profile record, a mismatched task/input snapshot or candidate endpoint, stored
hash corruption, and a concurrent head change. A failed attempt rolls back the
entire transaction and cannot leave a session-revision or binding prefix.

Refresh does not rerun an external validator and does not create a changed
candidate or basis. If compatible current working revisions already exist, it
can bind them into the new Review revision; their original revisions and the
stale Review revision remain stored for inspection.

## Verification

All checks use pinned Node 24.20.0 and npm 11.19.0.

- Three focused contract cases cover the exact command and no-authority
  receipt and reject conversational authority, deferred input, client-selected
  members, and unregistered capability names.
- Three renderer-neutral client cases cover exact transport/result validation,
  local input rejection, server failure preservation, and mismatched-success
  rejection.
- Four authenticated route cases cover server-resolved Actor and grant,
  extra/request-route mismatch rejection, missing grant, and authority error
  mapping.
- A fresh PostgreSQL 18.6 store applies and validates Flyway V001 through V036.
  All 122 PostgreSQL tests across 16 files pass. Refresh coverage includes
  current-head rebinding with stable Review/member identities, prior-revision
  reads, stale authority refresh, no-op refusal, exact replay, invalid retry,
  unauthorized access, unsupported profile, changed definition, and retained
  ledger cardinalities with no lifecycle receipt, domain event, or outbox
  record from refresh.
- The complete `npm run verify` gate passes generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, and the production workbench build. Its test totals are 482
  contract tests, 216 core tests, 34 adapter tests, 15 retrieval tests, 3 Neo4j
  tests with 1 integration-only skip, 3 S3 tests with 6 integration-only skips,
  78 server tests, 142 workbench tests, 25 Python tests, and 8 handoff
  automation tests. The production build retains the existing non-failing
  chunk-size advisory.

## Remaining boundary

This is the first registered scientific refresh adapter, not paired-profile
conformance. It does not add candidate correction or material-basis commands,
explicit separation, member recovery, scheduled validator reruns,
multi-member frozen presentation, ProjectBriefView, CommunicationPlan,
direct/model-mediated entry convergence, or the cumulative Wave 4 runtime
proof.

The Wave 4 exit gate is not complete. The next safe design boundary is one
bounded integration of the typed refresh operation into the frozen Review
stale-state control, preserving the existing comparison, pending state, exact
retry, unauthorized/conflict language, focus behavior, and server-supplied
return context without inferring eligibility in the browser.
