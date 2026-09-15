# Wave 5 renderer-neutral conformance

## Result

Wave 5 slice 4 now has one design-owned conformance boundary for
`petra.focused-graph-view@1.0.0`. The boundary maps the exact resolved contract
members to the frozen graph, textual path, evidence matrix, Details, origin,
and return regions. It adds no renderer-owned domain type, graph query, route,
geometry authority, unrestricted traversal, or mutation path.

The production Graph route still reads the earlier bounded relationship view
and overlay. That is intentional at this slice boundary: backend slice 5 owns
the authenticated snapshot-consistent focused query. A later design slice can
connect its typed response to this adapter without changing the semantic region
model. This report does not claim that the final focused route or a Wave 5
evidence scenario is live.

## Exact inspected boundary

- Design started at `d98b543a678ea918b77c2a00d5e4ee583be1ab4d` with exact
  backend counterpart `d8c25074855caca0d1a994decf7c93d68e551495` already
  integrated.
- The focused contract was introduced in integrated backend commit
  `92c7c0b3a38e2ff8bb08b637224e7dbbab29e3ad`.
- `FocusedGraphViewContractResolver` remains the upstream fail-closed owner for
  ProjectDefinition, profile registration, semantic role, snapshot, layer,
  finite limits, endpoint, path, selection, destination, action, and authority
  consistency. The frontend does not reinterpret those profile decisions.
- `focusedGraphRegionsFromView` is a pure secondary consistency boundary over
  an already resolved view. It performs no fetch, persistence, projection read,
  route transition, renderer layout, command, or authority calculation.

## Frozen region bindings

| Frozen region | Exact contract input | Conformance rule |
| --- | --- | --- |
| Orientation and graph heading | `task`, `profile`, requested and represented snapshots, active semantic layer, temporal position, projection position | Preserve the exact question, ProjectDefinition-resolved terms, origin, request identity, snapshot, layer, and freshness. Do not synthesize an ambient question or call the projection. |
| Bounded graph | `scope`, `nodes`, `relationships`, `paths`, `selection`, `limitations` | Use stable member keys, exact record refs, semantic keys, terms, direction, origin, authority position, basis, and finite limits. Renderer geometry remains local presentation state and is absent from this model. |
| Textual path peer | The same node, relationship, path, selection, destination, action, and limitation objects used by the graph | Text never receives a reduced or separately interpreted relationship set. Profile wording and relationship meaning remain contract-owned. |
| Evidence matrix | Exact relationships joined only to their contract-named source, target, and containing paths; `scope.coverage`, omissions, and limitations | Rows index supplied membership; they do not infer support, confidence, completeness, or missing links. Citation, support, contradiction, qualification, inference, and other meanings stay distinct through `meaning_kind` and the resolved term. |
| Details | Exact selection plus exact node or relationship members and their destination keys | Details preserves record, element, semantic, basis, layer, lifecycle, origin, authority, and destination identity. Missing targets or destinations fail closed instead of substituting a nearby object. |
| Origin | `task.origin` | Entry origin is carried unchanged. No route path or browser history is treated as domain origin. |
| Return | `task.return_destination_key`, its exact semantic destination, and an optional registered `return_to_origin` action | Return uses a canonical destination owner and target ref, including an explicit unavailable state. It is not reconstructed from a hard-coded Brief link. |
| Authority and freshness | Requested and represented snapshots, temporal position, semantic layer, projection position, and `authority_boundary` | PostgreSQL authority, Neo4j projection state, current/working/historical meaning, and presentation state remain separate. No client-derived authority flag is introduced. |

## Fail-closed frontend checks

The adapter rejects ambiguous stable keys, endpoints outside returned
membership, paths with missing members, selections outside represented
membership, unknown destination keys, missing exact return destinations, a
semantic layer outside the declared scope, membership over finite limits, and
paths over the exact depth limit. These checks prevent the frozen regions from
quietly diverging if an invalid value crosses the typed client boundary. They
do not replace the canonical contract resolver or invent a second authority
owner.

The adapter deliberately exports no coordinates, renderer tone, projection
query, unrestricted expand call, route loader, or domain command. Registered
actions remain descriptive contract values. Later slices must route them to the
named canonical owners; they must not execute a mutation from this model.

## Focused proof

`focused-graph-regions.test.ts` executes three focused checks:

1. Graph, text, evidence matrix, Details, origin, return, scope, omissions,
   snapshots, projection position, and authority boundary retain the same exact
   contract object identities.
2. A controlled-writing term and governing relationship pass through the same
   adapter without a scientific alias or renderer-specific branch.
3. Missing endpoints, over-limit membership, missing selected paths, and a
   missing return destination fail closed.

This is contract-conformance proof, not `UX-FX24`, `UX-FX25`, critic review,
browser evidence, or cumulative production evidence.

## Evidence control

No command in this slice invoked an exact scenario ID from
`scripts/wave-handoff-wave-5.evidence.json`. The ledger therefore remains
`0/25`, and this slice returns an empty evidence array. In particular, the
paired-profile unit check above is not
`UX1.5-EV01/paired-profile-bounded-graph-fixture`: it does not execute UX-FX24
through the production route and components.

The mandatory inventory audit remains due by completed slice 24. Wave 5 cannot
close while any required scenario lacks an actual passed record with its exact
command, retained artifact, and honest boundary.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were used.

- `/opt/homebrew/opt/node@24/bin/node node_modules/vitest/vitest.mjs run --config apps/workbench/vite.config.ts apps/workbench/src/product/focused-graph-regions.test.ts`
  passed all three focused conformance checks.
- `/opt/homebrew/opt/node@24/bin/node node_modules/typescript/bin/tsc --noEmit --project apps/workbench/tsconfig.json`
  passed.
- `npm run verify` passed the complete repository gate, including 1,353
  always-on tests and seven expected service-dependent skips. The first
  sandboxed run could not bind `127.0.0.1`; the authorized loopback rerun
  passed.
- `git diff --check` passed.

This slice changes no persistence, PostgreSQL behavior, Neo4j behavior,
backend contract, server route, or query owner, so real-service integration is
not required.

## Next safe boundary

Hand back for backend Wave 5 slice 5 only. Starting from this pushed design
commit and exact backend counterpart
`d8c25074855caca0d1a994decf7c93d68e551495`, implement the authenticated,
Project-scoped, snapshot-consistent focused query owner over canonical
PostgreSQL records and the bounded Neo4j projection. Bind the exact definition,
layer, snapshot, projection checkpoint, finite query limits, and caller-visible
coverage. Preserve this renderer-neutral region boundary; do not add design
slice 6 entry/orientation integration or later exploration behavior.
