# UX-REQ-008/010 ProjectSource replacement lineage

Status: exact immutable ProjectSource supersession and semantic-location chain
passed; governed creation command, relationship compensation, and public
integration remain open
Date: 2026-09-08
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

One predecessor can have only one successor, so following a source never yields
an ambiguous fork. Several duplicate or superseded predecessors may converge on
one successor. Cycles are prohibited, and every upstream/downstream path is
bounded to 32 edges to match the semantic-location contract. Replaying the same
record is idempotent; rebinding its identity or assigning another successor
fails closed.

The exclusion receipt is not decorative provenance. Its exact ID, revision,
content hash, and record hash must resolve to an `ExcludeProjectSource` result
whose resulting source reference exactly equals the predecessor reference.

## Semantic location

The existing `petra.project-object-location-view@1.0.0` contract already had a
`superseded` state and a bounded `replacement_chain`; those fields are now live
for ProjectSource identities. The repeatable-read location reader follows V025
lineage, validates each edge and exact successor revision, and returns the
registered `sources` destination while preserving the originally requested
identity and revision.

The server and browser contracts do not guess replacements. Other object kinds
continue to return no replacement chain until their owning authority registers
equivalent semantics.

## Authority and recovery boundary

This slice supplies the contract, storage invariant, registration repository,
and read integration. It does not expose a replacement command or public route.
The existing bearer token still does not resolve an exact Actor and capability
grant, and Petra has no canonical CapabilityGrant registry. The relation itself
also lacks a compensating disposition, so it is not yet eligible for the
ten-step quick-recovery experience.

A later governed replacement command must use the same exclusion receipt,
record a Project event and command result, and define how an erroneous
supersession is compensated without deleting this retained edge. It must not
reinterpret `RestoreProjectSource` as silently erasing replacement history.

## Design-freeze behavior

No CSS, component, route hierarchy, layout, or client-owned history changed.
The existing semantic-location response can support a later approved
replacement affordance without requiring the client to infer domain authority.

## Verification

The increment passes:

- 353 contract, registry, generation, hash, and fixture cases;
- strict TypeScript and Python type checks plus 25 Python cases;
- 99 real PostgreSQL 18.6 integration cases after Flyway V001 through V025;
  and
- the complete generation, retrieval-floor, formatting, lint, typecheck,
  production-build, and test gate with 686 always-on cases and seven expected
  service-dependent skips.

The database proof covers receipt-bound registration, exact copy replacement,
idempotent replay, stale receipt rejection, duplicate-successor refusal,
self-cycle refusal, immutable storage, Project-scoped chain reads, and a live
`superseded` semantic-location result.

## Remaining work

- define the authenticated single-user Actor and capability-grant boundary;
- add a typed, authorized, idempotent replacement command, event, result, and
  compensation path;
- decide whether and how supersession itself can be retracted while preserving
  its historical record;
- extend replacement/parent semantics only through owning object adapters; and
- integrate the existing location result into an approved frozen-interface
  control slot.
