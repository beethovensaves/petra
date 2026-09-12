# UX-REQ-011 WorkingCandidate and WorkingRelationship contracts

Status: bounded Wave 4 contract foundation passed; persistence, admission,
correction commands, authenticated reads, and working-graph projection remain
open
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
do not establish that the referenced record is current or that a correction is
admissible; that remains runtime work.

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

## Verification

Pinned Node 24.20.0 focused contract validation passes 10 tests across the new
working-state suite and the complete runtime-registry suite. Generated
TypeScript declarations, the contracts test typecheck, strict Python/Pydantic
round-trip parity, and focused TypeScript and Python lint also pass.

The complete `npm run verify` repository gate passes generated-contract and
fixture checks, the retrieval floor, formatting, lint, TypeScript and Python
typechecks, the production workbench build, 456 contract tests, 216 core tests,
31 adapter tests, 15 retrieval tests, 3 Neo4j tests with 1 integration-only skip,
3 S3 tests with 6 integration-only skips, 65 server tests, 126 workbench tests,
25 Python tests, and 7 handoff automation tests. The production build retains
the existing non-failing chunk-size advisory. This slice changes no PostgreSQL
schema or behavior, so a new real PostgreSQL integration run is not required by
the Wave 4 packet.

## Remaining boundary

This slice establishes record shape, generated types, accepted fixtures, and
contract-level invariants only. JSON Schema cannot prove that a supplied
ProjectDefinition is current, that a semantic key and contract hash resolve to
its registration, that a profile record satisfies that registered contract,
that endpoints match the relationship record, that referenced records exist in
the same Project and snapshot, or that a validator is executable and permitted.
The conformance tests prove those relationships only for the scientific
fixtures.

The next backend slice must add canonical persistence, idempotent admission and
correction, exact-current and reference guards, profile and validator
resolution, and an authenticated snapshot-consistent query. Unknown profile
types, predicates, references, validators, and incompatible revisions must fail
closed there. Working-graph projection, Review composition and commands, Brief,
communication, paired-profile conformance, and frozen-interface mapping remain
later Wave 4 work.
