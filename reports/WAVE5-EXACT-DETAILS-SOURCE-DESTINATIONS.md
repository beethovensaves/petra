# Wave 5 exact Details and source destinations

Date: 2026-09-15

Slice: Wave 5 Slice 13

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The production focused-graph boundary now returns a read-only, renderer-neutral
Details result for an exact selected node, relationship, or path. The result is
bound to the re-executed focused graph, its content hash, task, profile,
requested and represented snapshots, semantic layer, temporal position,
projection position, scope, return destination, and a distinct Details request
identity.

The new `petra.focused-graph-details-view@1.0.0` contract composes the existing
`project_object_location_view` and `project_source_view` owners. It does not add
a graph-specific object or source registry. The authenticated production route
is `POST /api/queries/projects/:projectId/focused-graph/details`, and the typed
focused-graph client validates the complete response identity before returning
it to a renderer.

## Exact composition

- A node selection retains the exact graph member and resolves its canonical
  Claim revision through the semantic-location owner.
- A relationship selection retains its registered graph meaning while
  resolving the underlying Assertion revision through the same owner.
- A path selection returns the exact selected path plus its node and
  relationship closure. Selection remains local presentation state and grants
  no domain authority.
- Each exact SourceSpan in a selected member's basis is resolved through a
  current Project-scoped ProjectSource binding. An inspectable result embeds the
  existing ProjectSource view with a preview targeted to that SourceSpan. A
  missing binding, restricted representation, or non-reproducing preview is an
  explicit unavailable destination rather than evidence of absence.
- Working candidates and working relationships continue through their existing
  identities. Because the semantic-location owner does not register those
  working kinds, Details reports the owner's existing unsupported result rather
  than inventing a destination or promoting working state to authority.

The reader first re-executes the exact bounded graph request and rejects a
different schema version or content hash. Details composition then runs in a
repeatable-read PostgreSQL transaction. For current and working reads, it also
rejects an authority event that advanced between graph resolution and Details
composition. PostgreSQL remains authoritative; the Neo4j position is retained
only as the graph's rebuildable projection condition.

## Existing owner extension

The semantic-location owner now recognizes canonical Claim records alongside
its existing Assertion and other registered record adapters. Project scoping is
enforced through the Claim's authoritative ChangeSet operation. The
ProjectSource reader accepts an optional exact SourceSpan when it is composed
inside an existing snapshot; its public collection and ordinary detail reads
are unchanged.

## Verification boundary

Pinned Node 24.20.0 and npm 11.19.0 were used.

- Focused contract, core parser, PostgreSQL reader, typed-client, and server
  route checks passed 29 tests across 6 files.
- The focused PostgreSQL reader check covers exact Claim and Assertion
  revisions and an explicit unavailable SourceSpan destination.
- `npm run test:postgres:integration` passed all 157 tests across 17 files on a
  freshly migrated disposable PostgreSQL 18.6 store. The ProjectSource
  integration check invoked the exact-SourceSpan snapshot composition.
- `npm run verify` passed generated-contract and fixture checks, the retrieval
  floor, formatting, lint, TypeScript and Python type checks, the production
  workbench build, 1,383 tests, and seven expected service-dependent skips.

These commands are implementation verification, not a frozen Wave 5 evidence
scenario. No command in this slice invoked an exact scenario ID from
`scripts/wave-handoff-wave-5.evidence.json`, so the evidence array remains
empty. In particular, this slice does not claim the cumulative fresh-store
cross-view trace or a browser Details-and-return record.

## Next boundary

Design Slice 14 can bind synchronized Details and exact source inspection to
the new typed client while preserving graph selection, origin, return focus,
snapshot, semantic layer, temporal position, authority position, provenance,
and projection position. It must keep stale, replaced, missing, and restricted
destinations explicit and must not turn navigation or layout into authority.
