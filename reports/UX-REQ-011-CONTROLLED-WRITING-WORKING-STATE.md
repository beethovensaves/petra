# UX-REQ-011 controlled-writing working-state adapter

Status: fixed Wave 4 closure item 41 passed; communication presentation,
paired-profile Review composition, and the cumulative exit trace remain open
Date: 2026-09-13
Backend starting commit: `c935910e3d7bedad8323539322807073ee72a968`
Exact design counterpart inspected: `78c37dfb8e36f9df35e5ae4eef356992f6048606`

## Result

Petra now installs versioned
`petra.controlled-writing-requirement@1.0.0` and
`petra.controlled-writing-governing-relationship@1.0.0` contracts. The
controlled-writing ProjectDefinition registers their canonical registry hashes:

- Requirement:
  `sha256:5a6d449b44078f2df1c2f29fe15164d22b0c4151a05c6f35dd8718964c3c3f1e`;
- governing relationship:
  `sha256:8875324fac5a6911a90aaf833289d0cc5ae2141c10f023d087a1cd876bd9e896`.

The Requirement represents one exact obligation or constraint and its bounded
application references. The governing relationship retains the exact active
ProjectSource, Requirement, and `GOVERNS` meaning registered by the current
controlled-writing definition. These payloads are not Claim or Assertion
variants. They live in distinct immutable profile-owned tables and use the
existing shared WorkingCandidate and WorkingRelationship records only for
working identity, task and snapshot context, producer provenance, validation,
lineage, and current-head selection.

Every controlled-writing profile payload fixes domain authority, Review
decision, mutation authority, and Apply availability to false. The adapter
accepts only root `create` candidates at revision 1. It adds no controlled-
writing correction, Review, ChangeSet operation, Approval, command, event,
projection, Brief, History, or Apply path.

## Persistence and read boundary

Migration V042 adds immutable Requirement and governing-relationship storage
with exact Project, current ProjectDefinition, Actor, Requirement, content-hash,
record-hash, and payload bindings. It extends the existing working revision
tables with profile-neutral record identity columns while preserving their
legacy Claim and Assertion foreign-key columns for the scientific adapter.
Deferred constraints require every controlled-writing working revision to bind
the exact profile-owned record inserted in the same transaction.

The existing PostgreSQL working-state authority repository now admits both
installed profiles through the same methods. It resolves the current
ProjectDefinition and its exact registration before writing, requires the real
installed registry hash for each controlled-writing contract, resolves all
Project-scoped task, snapshot, basis, provenance, and profile references, and
validates that the `GOVERNS` endpoints name the exact active
`writing.authority-source` ProjectSource and candidate-bound Requirement.
Idempotent retry returns the previously stored records without adding rows.

The existing working-state repository getters return the exact WorkingCandidate
and WorkingRelationship revisions. The repeatable-read Project working-state
snapshot returns those same current identities and hashes without including
authoritative records or silently composing a graph overlay. A new
renderer-neutral typed client validates the authenticated production query,
snapshot contract and content hash, exact Project and ProjectDefinition binding,
and unique current identities. It returns the server record unchanged and
derives no meaning, status, eligibility, force, priority, or authority.

## Fresh-store evidence

A fresh PostgreSQL 18.6 store applied Flyway migrations V001 through V042 and
passed all 155 PostgreSQL tests across 16 files. The controlled-writing trace
persisted exactly one Requirement, one governing relationship, one
WorkingCandidate, and one WorkingRelationship. Direct profile-table reads,
working repository reads, and the Project snapshot retained the submitted
payloads, record identities, and hashes. Retry left those cardinalities at one.
No controlled-writing evidence row, ReviewSession, or domain event appeared.

The same fresh store retained a separate scientific WorkingCandidate produced
by a registered model execution and exact ModelCall. Repeated direct and
model-mediated reads of each Project returned the same snapshot content and
content hash. Their independent `read_at` timestamps remained read metadata,
not record identity. The controlled-writing candidate retained its human Actor
and `direct_edit` contribution; the scientific candidate retained its model
Actor, model-role registration, exact ModelCall, ContextPacket, and proposal
references. No read path collapsed or reassigned producer provenance.

Focused failures reject a substituted registry hash, a stale
ProjectDefinition hash, an unregistered producer Actor, a mismatched authority-
source record hash, and a Requirement substituted for the registered authority-
source type. The failed attempts leave no partial controlled-writing profile or
working rows. Existing repository coverage continues to reject unsupported
profile registrations and validators, stale task references, cross-Project
references, invalid lineage, and mismatched scientific endpoints.

## Verification

Pinned Node 24.20.0 was selected explicitly. The focused contract suite passed
534 tests. It covered canonical registry hashes, controlled-writing fixture
hashes, non-authority constants, semantic separation from Claim and Assertion,
and human/model provenance separation. The renderer-neutral typed-client suite
passed its direct/model-mediated identity case and its invalid Project,
unauthorized response, resealed cross-Project, and duplicate-identity rejection
case. The package TypeScript build passed.

The complete `npm run verify` repository gate passed under the same pinned
toolchain. It covered generated contracts and fixtures, retrieval-floor checks,
formatting, lint, TypeScript and Python typechecks, the production workbench
build, all repository unit suites, and the handoff automation tests. The
production build retained its existing non-failing chunk-size advisory.

## Felicity review

Felicity review corrected one imprecise attribution in the draft: generated-file
checking belongs to the complete repository gate, not the focused contract test
count. The final report distinguishes profile-owned payload storage from shared
working identity, read-time metadata from stored identity, controlled-writing
semantics from Claim and Assertion, and this non-authoritative adapter from
later Review and Apply work. No user-facing product copy changed.

## Limits and next safe boundary

This slice does not compose the controlled-writing records into a ReviewSession
and does not demonstrate a controlled-writing Apply path. That paired-profile
Review read remains fixed closure item 43. It also does not change frozen React
components, CSS, browser routes, communication presentation, or browser and
accessibility evidence. It does not establish the cumulative Wave 4 exit trace
or close `UX1.4-EV01` through `UX1.4-EV06`.

The next safe slice is fixed closure item 42, owned by design: map the already
validated scientific CommunicationPlan through the frozen workbench using the
production typed client, preserving ordered families, exact references, partial
preservation, blocked validation, delivery state, action outcome, limitations,
and textual parity. A blocked receipt must not become an ordinary validated
answer.
