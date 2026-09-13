# UX-REQ-012 paired-profile Review composition

Status: fixed Wave 4 closure item 43 passed; paired-profile presentation and
the cumulative exit trace remain open
Date: 2026-09-13
Backend starting commit: `5e220d06855d31f2a146e995979c30fcae99afe3`
Exact design counterpart inspected: `1309403c38179eadd300d86b98868890bdcd40b4`

## Result

Petra now composes the installed controlled-writing Requirement and its exact
GOVERNS relationship through the existing durable `ReviewSession` 1.1 kernel.
The same ReviewSession revision, member, working-state binding, Project,
ProjectDefinition, Objective, authority snapshot, responsible human, origin,
and return-context owners used by the scientific specialization remain
canonical. No second candidate, Review, ChangeSet, Approval, command, event,
projection, or recovery ledger was added.

The additive `petra.project-review-view@1.3.0` contract accepts only the
installed scientific evidence or controlled-writing payload shapes. The
runtime continues to return 1.2 for scientific Reviews and returns 1.3 for the
new controlled-writing read. That branch resolves definition-owned
Requirement, governing-link, and authority-source terms and returns exact
Requirement, governing relationship, active ProjectSource, WorkingCandidate,
and WorkingRelationship records. It maps Current, Candidate, Origin, Basis,
Difference, Consequences, and Decision state without treating pending
validation or Review inclusion as authority.

The controlled-writing candidate remains durable, non-authoritative working
state. Its Review member has no ChangeSet, and its profile payload fixes
`apply_available` to false. The read states that Petra has installed no
controlled-writing ChangeSet operation, Approval, or Apply path. This slice
does not create or imply any writing mutation command.

## Contract and persistence boundary

ReviewSession 1.1 remains unchanged and profile-neutral. Migration V043 extends
its existing candidate-binding table with exact profile record schema, ID,
revision, and record-hash columns. Existing Claim and Assertion columns remain
as a compatibility binding for the scientific specialization; controlled-
writing rows use the same table and leave only those legacy evidence columns
null.

The deferred ReviewSession invariant now admits exactly two installed pairs:

- a source-grounded scientific Claim with its ASSERTS relationship; or
- a controlled-writing Requirement with its GOVERNS relationship to the exact
  current active `writing.authority-source` ProjectSource.

Each record must resolve through the exact bound ProjectDefinition registration
and its profile-owned persistence table. Each open member must also bind the
exact current, available, task-aligned WorkingCandidate and
WorkingRelationship heads. Unknown record families, unresolved registrations,
cross-profile pairs, mismatched record hashes, stale working heads, invalid
endpoints, stale root snapshots, and non-working controlled-writing Reviews
fail the same transaction without a ReviewSession or binding prefix.

Registration remains idempotent for the same canonical ReviewSession revision.
The change adds no controlled-writing correction, refresh semantics,
separation semantics, ChangeSet operation, Approval, Apply checkpoint, domain
event, outbox record, or graph projection instruction.

## Read composition

The PostgreSQL Review reader dispatches only after the exact
ProjectDefinition family and both registered contracts resolve. Scientific
working Reviews continue to return the existing 1.2 view and retain their
Claim, ASSERTS, source-grounding, validation, ChangeSet, command, event, and
projection behavior.

Controlled-writing Reviews return the additive 1.3 view. The profile payload
uses a distinct `controlled_writing_requirement` discriminator, exact typed
references, the Requirement kind, the GOVERNS predicate, and
`apply_available: false`. The textual peer reports no authoritative current
writing representation, the proposed Requirement statement, its exact
authority-source basis and rationale, retained human producer provenance,
pending or recorded validation, consequences, and an empty ChangeSet list.

The reader validates the Requirement and governing record content and record
hashes, the exact current ProjectSource and its role, Project scope,
ProjectDefinition identity, endpoint identity, predicate, working membership,
and Actor kind before returning the view. The test invokes the same read
through direct and restarted-reader instances representing direct and
model-mediated callers; both return the same content and content hash. It does
not execute an external model. `read_at` remains read metadata rather than
stored candidate or Review identity.

The existing authenticated collection and detail routes validate the returned
contract version without accepting client-provided semantics. Project Brief
fails explicitly for a controlled-writing Review until a registered
controlled-writing Brief payload exists; it does not omit the Review or cast it
as scientific content.

## Fresh-store and failure evidence

A fresh PostgreSQL 18.6 store applied and validated migrations V001 through
V043, then passed all 155 PostgreSQL tests across 16 files. The new trace
admitted one exact controlled-writing Requirement, governing relationship,
WorkingCandidate, and WorkingRelationship; registered and idempotently replayed
one ReviewSession revision; and returned matching direct and restarted-reader
content hashes.

The controlled-writing Project retained exactly one ReviewSession and no
ChangeSet, Approval, command execution, or domain event. Separate current
coverage continues to exercise the scientific Review composition, including
source-grounded Claim-ASSERTS meaning, ordinary and exception membership,
stale and mismatched references, lifecycle and refresh commands, independent
ChangeSet outcomes, manual Apply, recovery, and restart reads.

New failure cases reject a substituted governing-record hash, a scientific
Claim mixed into the controlled-writing definition, and an unsupported profile
record prefix. Each failed admission leaves no partial ReviewSession. Existing
tests continue to reject stale snapshots, unknown registrations, invalid
working endpoints, and reused identities.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly.

- The focused Review composition contract suite passed five tests, including
  rejection of an invented controlled-writing Apply flag and arbitrary client-
  defined profile payload.
- Package TypeScript build, repository lint, and complete TypeScript and Python
  typechecking passed.
- The fresh PostgreSQL integration passed all 155 tests after applying and
  validating all 43 migrations.
- The complete `npm run verify` gate passed generated-contract and fixture
  checks, the retrieval floor, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, every repository unit suite, and
  the handoff automation suite.

## Felicity review

Felicity review found three material clarity risks in the draft and new
user-facing language. The corrections distinguish contract capability from the
runtime version actually returned, limit the direct/model-mediated claim to the
tested caller seam, report completed passing checks as passed rather than only
recorded, and make the Brief failure tell the reader where the Review remains
available. The final wording also distinguishes stored Review coordination
from authority, pending validation from approval, a controlled-writing
candidate from scientific evidence, and an unavailable writing Apply path from
an eligible operation.

## Limits and next safe boundary

This slice does not modify frozen React components, CSS, browser routes,
presentation fixtures, browser behavior, or accessibility evidence. The design
branch therefore does not yet accept Project Review view 1.3, and the production
workbench does not yet render the controlled-writing Review. This slice also
does not add a controlled-writing Apply path, a controlled-writing Brief
payload, the cumulative live exit trace, or final Wave 4 authority and UX
audits.

The next safe slice is fixed closure item 44, owned by design: run both
registered ProjectDefinitions through the production working-graph/textual-
peer and Review renderers. Use definition-resolved terms and generic fallbacks,
preserve shared selection, warning, decision, status, authority, and recovery
meaning, and record browser and accessibility evidence without claiming a
controlled-writing Apply path.
