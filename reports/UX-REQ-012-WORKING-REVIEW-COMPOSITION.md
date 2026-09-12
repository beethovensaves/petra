# UX-REQ-012 canonical working ReviewSession composition

Status: bounded Wave 4 scientific composition complete; typed Review operations
and profile-neutral conformance remain open

## Result

`petra.review-session@1.1.0` now binds each Review member to one exact canonical
WorkingCandidate revision and its ordered WorkingRelationship revisions while
retaining the existing profile-registered candidate bindings. V034 persists
those bindings immutably and validates the registered scientific Claim–ASSERTS
pair against the exact Project, ProjectDefinition, Objective, task, input
snapshot, working heads, and authority snapshot.

The additive `petra.project-review-view@1.1.0` composes the retained working
records with the existing Review, validation, ChangeSet, Approval, command,
event, and graph-projection state in one repeatable-read result. The composition
does not create a second ledger or grant domain, Review-decision, mutation, or
projection authority.

## Contract boundary

ReviewSession 1.1 adds only exact working-state membership:

- one WorkingCandidate identity, revision, and content hash per member;
- one or more ordered WorkingRelationship identities, revisions, and content
  hashes per member; and
- the unchanged ordered profile candidate bindings that retain
  ProjectDefinition-owned object and predicate semantics.

The contract retains task-sized Review title, Objective, responsible human,
authority snapshot, origin, return context, ordinary or exception membership,
and lifecycle. Validation remains on the canonical working records. It is not a
Review decision and cannot authorize a change.

Project Review view 1.1 adds the complete canonical WorkingCandidate and
WorkingRelationship records under each member, identifies their selection as
exact ReviewSession bindings, and fixes their authority effect to `none`. The
existing scientific adapter continues to supply Current, Candidate, Origin,
Basis, Difference, Consequences, Decision state, source status, validation,
ChangeSets, Approvals, and member outcome.

Each returned ChangeSet now includes its exact successful or failed command
executions and causal domain events. The view also distinguishes the Review
authority position from a current, catching-up, blocked, or unavailable Neo4j
projection position; the unavailable reason distinguishes a missing checkpoint
from an empty checkpoint. Projection state is a receipt, not proof of domain
authority or Review completion.

## Persistence and failure behavior

V034 retains ReviewSession 1.0 and adds immutable relational bindings for 1.1.
The deferred validation trigger requires payload order and relational order to
match exactly. For the registered scientific adapter it also requires:

- one current, available WorkingCandidate and one current, available
  WorkingRelationship per open member;
- exact Claim and ASSERTS record identities under the bound ProjectDefinition;
- an exact WorkingRelationship endpoint to the member's WorkingCandidate;
- matching task context and input snapshot between both working records;
- the exact Objective revision and a working snapshot no newer than the Review;
  and
- a revision-1 Review snapshot equal to current authority.

Registration is idempotent for the same canonical revision. Stale authority,
mismatched working hashes, unknown or incompatible registered semantics,
cross-Project records, non-current open members, and invalid endpoints fail the
transaction without leaving a ReviewSession or binding prefix.

Working-state admission still emits no domain event. A ReviewSession revision
also changes no domain authority. Commitment remains exclusively in the
existing SubmitChangeSet, RecordApproval, and ApplyChangeSet command path.

## Runtime composition

The PostgreSQL reader reconstructs every working record and verifies both its
stored record hash and working content hash. It rejects any mismatch between
the session, relational bindings, profile records, ProjectDefinition, Project,
task, snapshot, or candidate endpoint.

For the scientific adapter, validation is derived from the exact working
receipts. Pending, failed, blocked, withdrawn, stale-working-head, stale-Review,
excluded-source, and conflicted states remain distinct. Passing validation is
reported with an explicit statement that it neither approves the candidate nor
grants mutation authority nor establishes scientific truth.

The authenticated Review collection and detail routes validate the returned
contract version. The renderer-neutral workbench client accepts either view
version and maps 1.1 into the unchanged frozen Review model. No React component,
CSS, browser route, fixture-backed presentation fallback, or client-side
semantic calculation changed in this slice.

## Verification

Pinned Node 24.20.0 focused contract checks validate ReviewSession and Project
Review view 1.1, including exact working membership and rejection of missing or
injected authority. The renderer-neutral workbench test passes all 45 cases and
proves that the additive server detail does not change the frozen Review model.

A fresh PostgreSQL 18.6 store applies Flyway migrations V001 through V034 and
passes all 118 PostgreSQL tests across 16 files. The new integration cases cover
ordinary and exception membership, idempotent retry, durable cardinality, no
domain event from Review registration, exact working validation, a mismatched
working reference, stale root authority, no partial persistence, the complete
SubmitChangeSet–RecordApproval–ApplyChangeSet path, applied member outcome,
command and event traces, and a separate catching-up projection receipt.

The complete `npm run verify` gate passes generated-contract and fixture checks,
the retrieval floor, formatting, lint, TypeScript and Python typechecks, and the
production workbench build. Its test totals are 468 contract tests, 216 core
tests, 31 adapter tests, 15 retrieval tests, 3 Neo4j tests with 1
integration-only skip, 3 S3 tests with 6 integration-only skips, 69 server
tests, 129 workbench tests, 25 Python tests, and 8 handoff automation tests. The
production build retains the existing non-failing chunk-size advisory.

## Remaining boundary

This slice composes one task-sized Review over the registered scientific
Claim–ASSERTS specialization. It does not add correction or material-basis
revision, defer/reopen, refresh, separation, or member-recovery operations;
those are the next backend-owned slice. It also does not establish a second
profile, multi-member frozen presentation, Brief, communication, direct/model
entry convergence, or the cumulative Wave 4 exit proof.

The Wave 4 exit gate is therefore not complete. The next safe design boundary
is a bounded review of the production Review route against the 1.1 view and the
accepted frozen information hierarchy. The next safe backend boundary after
that handoff is default-order item 5: add only the missing typed Review
operations needed by the exit trace through explicit commands.
