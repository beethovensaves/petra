# UX-REQ-012 authenticated Review candidate-correction authority

Status: bounded Wave 4 backend correction operation complete;
frozen-interface integration and later Review operations remain open
Date: 2026-09-12
Design counterpart: `d0cb4a9c7b51d865f905afa9605306254182c9c8`

## Result

`CorrectReviewCandidate` now advances one existing scientific Claim,
WorkingCandidate, ASSERTS WorkingRelationship, Review member, and open
ReviewSession under their existing identities. The command stores additive
revisions and retains every prior revision. It creates no candidate, Review,
validation result, Review decision, ChangeSet, Approval, event, outbox record,
projection instruction, History entry, or recovery ledger.

The first adapter is deliberately narrow: one registered source-grounded
scientific Claim and its ASSERTS relationship inside one single-member
ReviewSession 1.1. A correction may identify a material content revision, but
it cannot change source-basis identity. Material-basis revision remains a
separate missing operation.

## Contract, API, and typed client

Command envelope 1.6 and CapabilityGrant 1.5 add only
`CorrectReviewCandidate`. The command binds the exact Project, authenticated
Actor and grant, current open ReviewSession revision and content hash, Review
member, current WorkingCandidate and WorkingRelationship revisions and content
hashes, full corrected WorkingCandidate, and full corrected Claim. Existing
contracts bind the ProjectDefinition, Objective, task, input snapshot,
producer, origin, basis, provenance, validation target and validators, and
contiguous supersession lineage.

The authenticated endpoint is:

`POST /api/commands/projects/{project_id}/reviews/{review_session_id}/candidate-correction`

The request carries no caller-selected Actor, capability grant, Review
decision, approval, or conversational authority. It does carry the corrected
records and their exact ProjectDefinition and working-state references as
governed command data. The server resolves the Actor and one active
Project-scoped grant. It rejects extra fields, query controls, incomplete exact
references, and route/body mismatches. The renderer-neutral client validates
the request contracts and every returned candidate, profile, relationship,
Review, member, command, and receipt identity. No frozen React component, CSS,
browser route, presentation fixture, accessibility behavior, interaction test,
or design report changed in this backend slice.

## Persistence and authority boundary

V037 extends existing capability and canonical command-execution constraints;
it creates no table. One serializable command transaction authorizes the exact
Actor and grant, locks the command and Review identities, validates the exact
current Project, ProjectDefinition, Objective, Review, member, candidate,
relationship, task, input snapshot, source basis, producer, origin, provenance,
and validation references, then composes existing WorkingCandidate and
WorkingRelationship admission with one appended ReviewSession revision.

The corrected Claim uses the existing scientific quarantine ledger. The
WorkingCandidate keeps its ID, advances one revision, and names the exact prior
candidate record in its inputs and provenance. The WorkingRelationship keeps
its ID, advances mechanically, points its candidate endpoint at the corrected
candidate, and resets validation to pending. The ReviewSession and member keep
their IDs and bind the new exact working and profile revisions. Correction
neither decides the member nor changes authoritative Claim or Assertion heads.

The result receipt is stored in `petra.command_executions`. It binds prior and
resulting record hashes, validation identities, the retained scientific source
identity, the current authority position, and explicit no-authority and
preservation statements. An exact retry returns those retained revisions with
`applied: false`; different governed content under the same command ID or
idempotency key fails closed.

## Failure behavior

The operation fails closed for an unauthorized caller; stale, missing, or
mismatched Review, candidate, or relationship references; a non-open or
multi-member Review; an unsupported profile; invalid candidate or Claim
lineage; changed ProjectDefinition, Objective, task, input snapshot, candidate
endpoint, scientific source basis, authorship, origin, provenance, validation
target, or validators; corrupt stored hashes; retry-content mismatch; and a
concurrent Review head change. The correction transaction rolls back on
failure, so it cannot retain a candidate, relationship, or Review revision
prefix.

Validation success, candidate content, model output, and conversational text
do not authorize correction. The only mutation authority is the authenticated
`CorrectReviewCandidate` capability, and its result remains working state
rather than a Review decision or domain authority.

## Verification

All checks use pinned Node 24.20.0 and npm 11.19.0.

- Two focused contract tests cover the exact command, capability, and receipt,
  and reject implicit authority or incomplete references.
- Three focused core files pass 28 Review and registry tests.
- Three renderer-neutral client tests cover exact transport and result
  validation, local rejection, server-error rejection, and mismatched success.
- Three authenticated route tests cover server-resolved authority, strict
  input, missing grant, and stable authority-error mapping. The focused
  persistence-startup and route run passes four tests across two files.
- A fresh PostgreSQL 18.6 store validates and applies Flyway V001 through V037.
  All 125 PostgreSQL integration tests across 16 files pass. Three correction
  tests cover atomic admission and exact replay; unauthorized, stale,
  mismatched, unsupported-profile, invalid-lineage, incompatible-basis,
  invalid-provenance, retry-content, and ledger-cardinality failures; and a
  Review without registered working scientific membership.
- The complete `npm run verify` gate passes generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, all repository test suites, and
  handoff automation. The production build retains the existing non-failing
  chunk-size advisory.

## Remaining boundary

This is one scientific adapter, not paired-profile conformance or a generalized
correction command. It does not implement material-basis revision, separation,
member recovery, ProjectBriefView, CommunicationPlan, another profile,
multi-member frozen presentation, or the cumulative live Wave 4 proof.

The Wave 4 exit gate is not complete. The next safe design boundary is one
bounded integration of the typed correction operation into the frozen **Edit
candidate** Review control. That integration must preserve unsent edits
locally, retain exact retry identity while outcome is uncertain, accept only
server-confirmed new working and Review revisions, present stale,
unauthorized, or unsupported failures without implying a decision, and keep
Review lifecycle, validation, authority, focus, comparison, and return context
server-supplied or presentation-local according to their accepted owners.
