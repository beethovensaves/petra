# UX-REQ-012 authenticated Review candidate material-basis revision

Status: bounded Wave 4 backend operation complete; frozen-interface
integration and later Review operations remain open
Date: 2026-09-12
Design counterpart: `5f23e8d23806fb9592245b647aa0dd65ed41b11e`

## Result

`ReviseReviewCandidateBasis` now revises the source basis of one existing,
source-grounded scientific Claim in one open, single-member ReviewSession. The
operation advances the same Claim, WorkingCandidate, ASSERTS
WorkingRelationship, Review member, and ReviewSession identities through
additive revisions. Every prior revision and its provenance remain retained.

The command is separate from `CorrectReviewCandidate`: it does not change the
Claim text. It accepts an exact active ProjectSource and exact SourceSpan
references, then records the human-supplied detail level, source stance,
attribution, modality, negation, optional uncertainty, and material reason. The
first adapter deliberately preserves the existing source scope and
WorkVersion. Changing either requires broader source or relationship semantics
and is outside this operation.

## Contract, API, and typed client

Command envelope 1.8, CapabilityGrant 1.6, and
`petra.review-candidate-basis-revision-receipt@1.0.0` add only
`ReviseReviewCandidateBasis`. The command binds the exact Project,
authenticated human Actor and grant, current open ReviewSession and member,
current WorkingCandidate and WorkingRelationship revisions, current Claim,
ProjectDefinition, active ProjectSource, SourceSpans, command, and idempotency
identities.

The authenticated endpoint is:

`POST /api/commands/projects/{project_id}/reviews/{review_session_id}/candidate-basis-revision`

The request cannot carry its own Actor, capability grant, profile record,
working record, Review decision, validation outcome, approval, or
conversational authority. The server resolves the principal and exactly one
eligible Project-scoped grant, locks and verifies the named current records,
and composes all resulting profile and working records. The renderer-neutral
client validates the compact request and every returned receipt, Claim,
WorkingCandidate, WorkingRelationship, ReviewSession, and cross-record
identity.

No frozen React component, CSS, browser route, presentation fixture,
accessibility behavior, or interaction test changed in this backend slice.

## Persistence and authority boundary

V039 extends the existing capability and canonical command-execution
constraints. It adds no table. One serializable transaction authorizes the
exact Actor and grant, verifies the current open single-member Review and its
exact ProjectDefinition, Claim, WorkingCandidate, WorkingRelationship, and
ASSERTS composition, and resolves every SourceSpan inside the selected active
ProjectSource artifact and retained WorkVersion. The ProjectSource must belong
to the same ProjectDefinition lineage and its source role must still be
registered by the Review's current ProjectDefinition.

The scientific Claim remains in the existing quarantine ledger. Its text,
kind, normalization, scope, and identity remain unchanged while the Claim
advances one revision with the revised source basis. The WorkingCandidate and
WorkingRelationship keep their identities, append supersession revisions with
`basis_revision` lineage, and reset validation to pending. The ReviewSession
keeps its identity and open lifecycle while its only member is rebound to the
new exact working and profile revisions.

The typed receipt is retained in `petra.command_executions`. It binds both
basis positions, the resulting records, the validation reset, and explicit
no-authority outcomes. An exact retry returns the retained records with
`applied: false`; changed governed input under the same command or idempotency
identity fails closed.

This operation does not decide the Review, validate the candidate, create or
apply a ChangeSet, create an Approval, emit a domain event or outbox record,
project the graph, update History, or create another ledger. The result remains
non-authoritative working state.

## Failure behavior

The operation fails closed for unauthorized or non-human callers; stale,
missing, or mismatched Review, member, candidate, relationship, Claim,
ProjectDefinition, ProjectSource, or SourceSpan references; a non-open or
multi-member Review; unsupported profile or basis kinds; an inactive or
incompatible source; changed source scope or WorkVersion; invalid source-role,
task, snapshot, profile, endpoint, authorship, lineage, provenance, or
validation semantics; duplicate spans; no material change; corrupt stored
hashes; retry mismatch; and a concurrent current-head change.

All governed writes share one transaction. A failed attempt retains none of
the governed revisions. An uncertain client outcome may hide one complete
retained command, but it cannot leave a Claim, WorkingCandidate,
WorkingRelationship, or ReviewSession revision prefix. Validation results,
model output, candidate content, and conversational text grant no authority to
run the operation.

## Verification

All checks use pinned Node 24.20.0 and npm 11.19.0.

- Focused contract tests accept the exact command, grant, and receipt boundary
  and reject unsupported basis kinds, implicit authority, and incomplete exact
  references.
- Focused renderer-neutral client and authenticated route tests cover compact
  transport, strict input, server-resolved principal and grant, preserved
  server errors, and mismatched success rejection. The correction path remains
  covered as a distinct regression boundary.
- A fresh PostgreSQL 18.6 store validates and applies Flyway V001 through V039.
  All 128 PostgreSQL integration tests across 16 files pass. The new authority
  tests prove atomic same-identity revision, exact replay, retained ledger
  cardinality, and fail-closed unauthorized, stale, profile-binding,
  source-semantics, and retry-mismatch behavior.
- The complete `npm run verify` gate passes generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, repository test suites, and
  handoff automation. The production build retains its existing non-failing
  chunk-size advisory.

## Remaining boundary

This is one scientific adapter, not a profile-neutral conformance proof. It
does not support source-scope or WorkVersion changes, model-authored basis
revision, separation, member recovery, a scheduled external-validator rerun,
a second profile, ProjectBriefView, CommunicationPlan, multi-member frozen
presentation, or the cumulative live Wave 4 proof.

The next safe design boundary is a bounded review of whether the accepted
frozen Review information hierarchy already provides a place for this typed
material-basis operation. Any integration must keep it visibly distinct from
Claim-text correction, retain exact command identity while the outcome is
uncertain, accept only the matching typed result, reload authenticated Review
state after success, and present stale, unauthorized, unsupported, or
incompatible failures without implying validation, a Review decision, or
authoritative application. If the frozen hierarchy has no accepted control,
the design role should return an unchanged handoff instead of inventing one.

Wave 4 is not complete.
