# Wave 5 expansion, filters, limits, and omissions

Date: 2026-09-15
Slice: Wave 5 Slice 11
Status: implemented; cumulative Wave 5 evidence remains open

## Result

The authenticated focused-graph query owner now supports one opt-in,
snapshot-bound named expansion without changing existing one-hop callers. A
request with no `exploration` field still returns
`petra.focused-graph-view@1.0.0`. A valid named expansion returns the additive
`petra.focused-graph-view@1.1.0` contract with its exact recipe, target,
normalized filters, finite limits, grouping, and omission accounting.

The current scientific owner accepts only these registered recipes:

- `scientific.graph.trace-sources` for recorded citation and provenance in
  either direction;
- `scientific.graph.show-contrary` for recorded contradiction in either
  direction; and
- `scientific.graph.show-downstream` for the registered scientific
  relationship meanings in the outgoing direction.

The exact ProjectDefinition must register the requested recipe as a
`petra.focused-graph-view@1.1.0` extension. The server also requires the
requested expansion target, action, filter meanings, directions, and finite
depth to match that registration and the allowlisted recipe. Unknown profiles,
recipes, relationship meanings, incompatible filters, and Historical expansion
fail closed.

## Query and authority boundary

The expansion uses the same repeatable-read, authenticated, Project-scoped
query owner as the existing focused view. Neo4j supplies bounded candidate
membership. PostgreSQL resolves every returned Claim and Assertion at the exact
definition, snapshot, authority head, and projection checkpoint. The reader
guards the projection position before and after traversal and does not accept a
projected member as domain authority.

Traversal is breadth-first and bounded by the caller-visible depth, node,
relationship, and path limits. Repeated endpoints and cycles are retained as
explicit path-step facts without unbounded traversal or duplicate relationship
membership. Current and Working members remain separate authority layers.
WorkingRelationship heads are included only on an explicit Working request and
remain `working_non_authority`.

Renderer geometry, pinning, layout, Back/Forward state, and commands are absent
from the request. Expansion is a read-only registered action. It does not start
Work, create a candidate, issue a graph-specific mutation, or infer a
relationship from layout.

## Counts and omissions

The v1.1 response groups returned relationships by exact relationship meaning
and semantic layer. Each group states its membership rule, count unit, returned
members, total/filtered/hidden disclosure state, coverage, and non-overlap.
These groups are presentation facets, not new domain assertions.

The exploration accounting separately reports:

- whether the result is complete for its exact scope, partial, or capped;
- capped membership, hidden relationships, restricted paths, cycles,
  incomplete paths, and unknown paths;
- exact hidden counts only when the bounded query can establish them;
- `not_disclosed` for restricted path counts; and
- `unknown` for paths outside the exact recipe, snapshot, layer, filters, and
  finite limits.

A cap, unavailable source location, unknown candidate membership, or
incompatible Working base cannot be presented as complete. Filtered, capped,
restricted, unknown, and out-of-scope records never imply that a relationship
or path is absent. The response continues to keep semantic layer, temporal
position, requested and represented snapshots, authority position, selection,
provenance, return identity, and projection position distinct.

## Verification boundary

Pinned Node 24.20.0 and npm 11.19.0 were used.

- Focused contract, core, adapter, PostgreSQL-reader, and server-route tests
  passed with 21 tests across five files.
- Repository TypeScript and Python typechecking passed.
- `npm run test:postgres:integration` applied all 43 migrations to a fresh
  PostgreSQL 18.6 store; 17 files and 157 tests passed.
- `npm run test:neo4j:integration` applied all 43 migrations to fresh
  PostgreSQL 18.6 and Neo4j stores; one file and four tests passed, including
  the production v1.1 query through the real projection adapter.
- `npm run verify` passed the complete repository gate: generated contracts
  and fixtures, the retrieval floor, formatting, lint, TypeScript and Python
  type checks, the production workbench build, 1,374 passed tests, and seven
  expected service-dependent skips.
- `git diff --check` passed.

These commands verify the implementation. They do not invoke a named frozen
Wave 5 evidence scenario, so this slice records no evidence entry and the
inventory remains `0/25`.

## Next safe boundary

Design Wave 5 Slice 12 may consume this pushed renderer-neutral v1.1 result for
named expansion, filtering, pin/collapse, home/reset, saved exact questions,
and ten-state Back/Forward presentation state. It must reject late responses
that do not match the active request, scope, and snapshot, preserve selection,
and keep all presentation state local. It must not start Slice 13 Details,
correction, new Work, or renderer-owned inference.
