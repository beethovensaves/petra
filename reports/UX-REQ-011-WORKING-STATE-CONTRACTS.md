# UX-REQ-011 WorkingCandidate and WorkingRelationship contracts

Status: bounded Wave 4 contract and authority foundation passed; working-graph
overlay, Review composition and operations, paired-profile conformance, and
frozen-interface integration remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now has additive `petra.working-candidate@1.0.0` and
`petra.working-relationship@1.0.0` contracts. Each revision is Project-scoped,
binds one exact ProjectDefinition revision and profile registration, and points
to an exact profile-owned object or relationship record. The shared contracts
do not contain an open domain payload and do not reinterpret profile semantics.

The first conformance profile is scientific evidence. A synthetic revision of
the existing scientific ProjectDefinition registers `scientific.claim`,
`scientific.assertion`, the evidence-extractor model role, and the two validators
used by the fixture. The WorkingCandidate references the existing quarantine
Claim record. The WorkingRelationship references the existing quarantine
Assertion record and binds its `ASSERTS` predicate, exact WorkVersion subject,
and exact WorkingCandidate object. Claim and Assertion remain the profile-owned
content records; the new contracts supply the shared working-state identity and
lineage needed by later admission and read boundaries.

PostgreSQL migration V033 and the scientific working-state adapter now persist
stable WorkingCandidate and WorkingRelationship heads with immutable additive
revisions. Claim and Assertion payloads remain in the existing evidence ledger;
V033 adds only a non-authoritative `working_correction` admission kind for a
contiguous quarantine correction. It does not add a second profile-content,
Review, command, event, projection, or History ledger.

The server now exposes
`GET /api/queries/projects/:projectId/working-state` behind the existing bearer
authentication middleware. Its reader uses a read-only repeatable-read
transaction and returns the exact current working heads, current
ProjectDefinition reference, event and stream positions, and an explicit
selection boundary. That boundary says the response contains no authoritative
records, historical working revisions, or composed graph overlay.

## Exact working context

Both contracts require:

- the exact Project and ProjectDefinition revision, family, and content hash;
- the exact profile object or relationship registration and contract;
- the producing Actor, with an exact role and model call for model output;
- one objective-bound task context: ProjectThread turn, WorkUnit, or linked
  interaction Work;
- the exact Project snapshot and bounded input record references;
- separate origin, basis, and provenance records;
- an explicit qualification state that distinguishes stated uncertainty or
  limitations from no recorded qualification;
- validation state, target hash, and exact validator versions and results;
- stable working identity, revision, content hash, and supersession lineage;
  and
- immutable authority-boundary constants.

The content hash is the RFC 8785 SHA-256 digest of the working revision with its
`content_hash` member omitted. Conformance tests recompute it rather than only
checking its string shape.

## Revision and validation behavior

A revision-1 record must use root lineage. Every later revision must name the
exact superseded working identity, revision, and content hash, plus whether the
change is a mechanical correction, basis revision, material revision, or
withdrawal. A `revise` intent must also carry an exact reference to the
authoritative profile record it proposes to change. These contract requirements
are now backed by runtime checks: revision admission requires the exact current
ProjectDefinition, exact registered profile and validator contracts, exact
current task records, registered Actors and producer roles, and resolvable
Project-scoped references. A `revise` base must be the exact current trusted
profile revision. Working corrections must be contiguous with the current
working head and the current quarantine profile revision.

The fixture retains a model-produced root Claim candidate with completed
profile-registered validation. A separate human ProjectThread turn narrows its
scope through candidate revision 2. That material revision retains the prior
candidate and Claim identities and returns validation to `pending`. It does not
carry the prior validation result forward.

Validation is structurally separate from qualifications, producer identity,
operational completion, Review, and authority. Pending validation cannot contain
results. Completed validation must contain at least one result. Blocked
validation must contain a failed or blocked result. A passing result cannot grant
authority because both working contracts require
`validation_grants_authority: false`.

## Authority boundary

Both contracts require these fixed values:

- `domain_authority: false`;
- `review_decision: false`;
- `mutation_authority: false`;
- `validation_grants_authority: false`; and
- `promotion_requires_review: true`.

The records have only `available` or `withdrawn` working disposition. They do
not encode accepted, applied, trusted, or projected-authority state. They add no
ChangeSet, Approval, command, event, Review, History, graph-projection, Work,
interaction, or result ledger. Any later promotion must begin with the existing
Review and ChangeSet path.

## Contract evidence

The accepted fixtures cover:

- one exact scientific ProjectDefinition and Objective revision with registered
  Claim, Assertion, model-role, and validator contracts;
- one model-produced WorkingCandidate over the existing quarantine Claim;
- one WorkingRelationship over the existing quarantine ASSERTS record;
- exact source, WorkUnit, model-call, ContextPacket, snapshot, basis, and
  provenance references; and
- one human material correction from an exact ProjectThread turn, with retained
  supersession identity and validation reset to pending.

Focused mutation tests reject a model producer without its model-role identity,
a later revision with root lineage, an injected domain-authority value,
completed validation without results, a relationship using an object-schema
registration, and a revise intent without an exact authoritative base.

Runtime tests additionally cover idempotent root admission, idempotent retry
after later head movement, a human material correction, an exact ASSERTS
relationship, current and historical working reads, and snapshot composition.
They reject stale task references, unknown profile registrations, unknown
validator versions, and mismatched relationship endpoints without leaving
partial working rows. Working admission and correction emit no domain events.

## Verification

Pinned Node 24.20.0 typechecking and the focused contract/server suite pass. The
focused suite covers 30 tests, including contract rejection and authenticated,
exact-Project route behavior.

A fresh PostgreSQL 18.6 store applies Flyway migrations V001 through V033 and
passes all 113 PostgreSQL tests across 16 files. The two working-state tests
exercise success, retry, correction, stale and mismatched references,
unsupported profile and validator registrations, exact current-head queries,
durable cardinality, and the absence of domain events from working-state
admission.

The complete `npm run verify` gate also passes generated-contract and fixture
checks, the retrieval floor, formatting, lint, TypeScript and Python typechecks,
and the production workbench build. Its test totals are 458 contract tests, 216
core tests, 31 adapter tests, 15 retrieval tests, 3 Neo4j tests with 1
integration-only skip, 3 S3 tests with 6 integration-only skips, 66 server
tests, 126 workbench tests, 25 Python tests, and 8 handoff automation tests. The
production build retains the existing non-failing chunk-size advisory.

## Remaining boundary

This slice proves the persistence and query boundary for the registered
scientific Claim–ASSERTS adapter only. It does not establish profile neutrality,
compose authoritative and working records into a graph overlay, or make the
snapshot a graph-renderer contract. It also exposes no client mutation endpoint;
later Review operations must continue through typed commands rather than
conversation or graph selection.

The next slice may expose the accepted working state as a bounded working-graph
overlay with a complete textual peer. Review composition and operations, Brief,
communication, a materially different ProjectDefinition, paired-profile
conformance, and frozen-interface runtime mapping remain later Wave 4 work.
