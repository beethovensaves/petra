# Wave 5 snapshot-consistent focused query

## Result

Wave 5 slice 5 now has one authenticated, Project-scoped production query
owner for `petra.focused-graph-view@1.0.0`. It composes an exact current,
one-hop Claim neighborhood from canonical PostgreSQL records and bounded Neo4j
membership. The response binds its ProjectDefinition, task, question, focus,
origin, request identity, requested and represented snapshots, temporal
position, semantic layer, projection checkpoint, finite limits, coverage,
omissions, selection, and return destination.

The owner adds no renderer geometry, unrestricted traversal, expansion,
working or historical overlay, graph-specific mutation, or design slice 6
entry integration. PostgreSQL remains authoritative. Neo4j remains a guarded,
rebuildable projection that supplies bounded candidate membership only.

## Exact integrated boundary

- Backend work began at `d8c25074855caca0d1a994decf7c93d68e551495`.
- The exact design counterpart
  `0de57b07bff247bb6d1f993000c8714845094786` was inspected and integrated
  before implementation.
- `FocusedGraphViewRequest` is a strict renderer-neutral request contract. Its
  parser rejects unknown fields, including renderer and command fields, and
  limits this first owner to a current one-hop neighborhood of at most 100
  nodes, 99 relationships, and 99 paths.
- `PostgresFocusedGraphViewReader` uses a repeatable-read transaction for the
  current definition, canonical records, authority head, outbox head, and
  projection checkpoint. It guards the Neo4j position before and after the
  bounded graph read and rejects cross-Project, newer-than-checkpoint,
  hash-inconsistent, untrusted, or otherwise incompatible members.
- The requested snapshot binds the current PostgreSQL authority and Project
  stream positions. The represented snapshot binds the exact durable
  checkpoint. Projection lag remains an explicit view condition, never a new
  authority layer.
- The authenticated server route is
  `POST /api/queries/projects/:projectId/focused-graph`. Its typed client
  revalidates schema, hashes, Project, definition, task, semantics, scope,
  limits, destinations, actions, and optional expected snapshot before
  returning data to a renderer.

## Scope and omissions

The current scientific profile resolves the requested task, Claim object,
Assertion relationship, and return action only from the exact installed
ProjectDefinition. Unsupported or ambiguous meanings fail closed. Scientific
relationship predicates retain distinct renderer-neutral meanings for
support, contradiction, qualification, and inference; representation links
such as citation are not silently promoted into scientific support.

Every response states finite limits and includes an out-of-scope omission for
whole-Project traversal, structural provenance, other semantic layers, and
expansion. If the bounded candidate or member budget is exhausted, coverage is
`capped` with a separate explicit omission. SourceSpan and Details composition
remain for the later typed-path and exact-destination slices and are named as
limitations instead of being inferred.

## Verification boundary

Focused unit, route, client, and renderer-neutral conformance checks exercise
strict request parsing, authentication, Project forwarding, exact semantic and
hash validation, finite limits, projection guards, stale-snapshot rejection,
and the unchanged design adapter boundary. The real PostgreSQL/Neo4j suite
also executes the production reader against fresh stores and verifies that an
exact canonical Claim can be returned from its guarded represented position.

These checks are implementation verification, not a frozen Wave 5 evidence
scenario. No command in this slice invokes an exact scenario ID from
`scripts/wave-handoff-wave-5.evidence.json`, so the evidence array remains
empty and the ledger remains `0/25`.

Pinned Node 24.20.0 and npm 11.19.0 were used.

- Focused Vitest runs passed 6 core, 1 PostgreSQL reader, 2 typed client, 2
  authenticated route, and 3 renderer-neutral conformance tests.
- All nine affected source and test TypeScript projects passed `tsc --noEmit`.
- `node scripts/test-neo4j-integration.mjs` passed against fresh PostgreSQL
  18.6 and Neo4j 2026.07.1 stores after applying all 43 migrations; all four
  real Neo4j tests passed, including the production focused reader.
- `npm run verify` passed the complete repository gate: generated contracts
  and fixtures, retrieval floor, formatting, lint, type checks, production
  workbench build, 1,358 tests, and seven expected service-dependent skips.
- `git diff --check` passed.

## Next safe boundary

Hand back for design Wave 5 slice 6 only. Integrate this pushed backend commit,
then connect the exact typed focused query response to contextual and direct
entry and orientation from Brief, Review, Petra, History, and an exact saved
question. Preserve task, scope, selected object, snapshot, origin, and return
context. Do not add slice 7 typed provenance paths, slice 11 expansion, or any
renderer-owned authority.
