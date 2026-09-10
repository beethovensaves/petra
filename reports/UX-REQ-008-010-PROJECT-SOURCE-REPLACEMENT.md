# UX-REQ-008/010 ProjectSource replacement lineage

Status: exact immutable ProjectSource supersession, command-granular retraction,
effective-head integrity, and semantic-location traversal passed; governed
creation/retraction commands and public integration remain open
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now records an explicit replacement between two stable ProjectSource
identities without rebinding either identity. The
`petra.project-source-replacement@1.0.0` record names:

- one exact current excluded predecessor revision;
- one exact current active successor revision;
- the replacement kind and human-readable rationale;
- the exact immutable lifecycle receipt that established the predecessor's
  governed exclusion; and
- the Project, recording Actor, and time.

The initial replacement kinds are newer source version, identity resolution,
preferred-copy change, and Project-role replacement. These classify why one
Project association supersedes another; they do not merge canonical identities,
broaden rights, clone bytes, or assert that either source's contents are true.

## Persistence and integrity

PostgreSQL V025 retains each replacement as an immutable record with exact
foreign keys to both ProjectSource revisions and the exclusion receipt. A
serializable repository validates the contract, canonical content and record
hashes, Project and Actor, current source heads, statuses, and receipt semantics
before registration.

V027 adds immutable
`petra.project-source-replacement-retraction@1.0.0` records and a derived
effective head. One predecessor can have only one active successor, so following
a source never yields an ambiguous current fork. After that exact relation is
retracted, a new immutable replacement may become current while both the old
edge and its retraction remain retained. V028 prevents direct head changes from
disagreeing with immutable history, and V029 enforces the canonical bounded
retraction ID kind. Several predecessors may still converge on one successor. Active cycles are prohibited, and every active upstream and
downstream path is bounded to 32 edges. Exact replay is idempotent; identity
rebinding and retracting a non-current edge fail closed.

The exclusion receipt is not decorative provenance. Its exact ID, revision,
content hash, and record hash must resolve to an `ExcludeProjectSource` result
whose resulting source reference exactly equals the predecessor reference.

## Semantic location

The existing `petra.project-object-location-view@1.0.0` contract already had a
`superseded` state and a bounded `replacement_chain`; those fields are now live
for ProjectSource identities. The repeatable-read location reader follows only
active replacement heads, validates each edge and exact successor revision, and
returns the registered `sources` destination while preserving the originally
requested identity and revision. Retraction immediately removes that edge from
current traversal without changing the predecessor's still-excluded status.

The server and browser contracts do not guess replacements. Other object kinds
continue to return no replacement chain until their owning authority registers
equivalent semantics.

## Authority and recovery boundary

This slice supplies the contracts, storage invariants, registration repository,
compensation semantics, and current/historical read separation. It does not
expose replacement or retraction through a public command route. Petra's
single-user bearer principal and canonical Project-command grant authority now
resolve the exact Actor and active grant needed by that later boundary.

[D019](../decisions/D019-command-granular-project-source-replacement-retraction.md)
fixes recovery at the command boundary: undoing replacement retracts only the
effective relation. Restoring the excluded predecessor remains the next
separately authorized `RestoreProjectSource` step. Neither action erases the
replacement or retraction record.

## Design-freeze behavior

No CSS, component, route hierarchy, layout, or client-owned history changed.
The existing semantic-location response can support a later approved
replacement affordance without requiring the client to infer domain authority.

## Verification

The increment passes the complete generation, registry, fixture, formatting,
lint, typecheck, production-build, and always-on test gate. It also passes 105
real PostgreSQL 18.6 integration cases after Flyway V001 through V029.

The database proof additionally covers exact retraction replay, stale
replacement-ref rejection, repeated-retraction refusal, immutable retraction
storage, active-head integrity, retained excluded source state, removal from
current semantic traversal, and a new successor after retraction.

## Remaining work

- add typed, authorized, idempotent replacement-creation and retraction
  commands, events, receipts, outbox intent, and public routes;
- extend replacement/parent semantics only through owning object adapters; and
- integrate the existing location result into an approved frozen-interface
  control slot.
