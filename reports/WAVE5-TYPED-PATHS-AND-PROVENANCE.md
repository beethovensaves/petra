# Wave 5 typed paths and provenance

## Result

Wave 5 slice 7 extends the production focused query without changing the
accepted renderer-neutral `petra.focused-graph-view@1.0.0` contract. Each
ordered path step still identifies its exact source node, relationship, target
node, and traversal direction by stable keys. The resolved node and
relationship members now carry their immutable PostgreSQL identities, recorded
origin, current authority position, exact basis records, validation or review
state, and Project-scoped SourceSpan locations.

The exact design counterpart
`fdb5833f758557ee1fa53de32313c436048ab397` was fast-forwarded from backend
`d95510372a606ed2ad84e06bb8b7b8d11087a4b0` before implementation. The frozen
React components, CSS, and browser-route ownership were not modified by this
backend slice.

## Runtime boundary

- PostgreSQL remains the source of every Claim, Assertion, SourceSpan, record
  hash, validator outcome, authority zone, and review state. Neo4j supplies only
  the bounded one-hop member candidates already guarded by the exact durable
  projection checkpoint.
- The scientific predicate allowlist now maps `CITES` and
  `CITES_AS_BACKGROUND` to citation, separately from support. Support,
  contradiction, qualification, and inference retain their own allowlisted
  meanings. An unlisted predicate fails closed instead of receiving a visual
  or scientific interpretation.
- SourceSpan facts are resolved from exact immutable records. A location is
  returned only when the existing ProjectSource binding proves it belongs to
  the queried Project at its current binding revision. Its semantic destination
  is owned by the existing `project_object_location_view`; the focused graph
  adds no source registry or browser route.
- A Claim without direct SourceSpan basis, an Assertion without SourceSpan
  provenance, or a location without a Project-scoped destination receives an
  explicit unavailable source-inspection fact. The result never treats missing
  inspectability as absence of scientific basis.
- Source-location composition is bounded to 96 unique SourceSpans. Additional
  recorded locations produce exact capped coverage, member limitations, and an
  unavailable fact rather than an incomplete-looking path.
- The typed client continues to require the exact caller-owned return
  destination once, while accepting separately validated server-composed
  source destinations. Duplicate or substituted return identity remains a
  client error.

This slice does not add relation presentation, layer composition, expansion,
comparison, correction, or renderer-owned meaning. Exact Details and final
source-navigation composition remain with their later packet slices.

## Verification boundary

Focused PostgreSQL, adapter, core, and integrated workbench tests cover the
five distinct required meanings, stable ordered path members, model-inference
origin, exact SourceSpan identity, validator and authority facts, available and
unavailable source destinations, typed-client return identity, and the Slice 6
entry/region boundary.

Real fresh-store integration passed against PostgreSQL 18.6 and Neo4j
2026.07.1 after all 43 migrations:

- `npm run test:postgres:integration`: 17 files and 157 tests passed.
- `npm run test:neo4j:integration`: 1 file and 4 tests passed, including the
  production focused reader.

`npm run verify` passed the complete repository gate on pinned Node 24.20.0:
generated contracts and fixtures, the retrieval floor, formatting, lint,
TypeScript and Python type checks, the production workbench build, 1,362
passed tests, seven expected service-dependent skips, and the Wave handoff
checks. `git diff --check` also passed.

These commands are implementation verification, not execution of a named
frozen Wave 5 evidence scenario, so this slice records no evidence entry.

## Next safe boundary

Design Wave 5 slice 8 may consume the pushed typed path members and source
facts through the existing renderer-neutral regions. It should present
profile-owned relation labels, direction, origin, authority or validation
state, exact basis, limitations, and source availability with graph/text
parity and redundant non-color meaning. It must not reinterpret citation as
support, infer facts from layout, or start slice 9 layer composition.
