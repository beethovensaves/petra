# Wave 5 Slice 31 final critic authority audit

Date: 2026-09-16

Status: passed with no material backend finding. Wave 5 remains open for the final design UX, Felicity, and exit audit.

## Result

The final integrated tree preserves its authority, identity, scope, and replay boundaries under adversarial review. `npm run audit:wave5:evidence` verifies all 24 required implementation scenarios and the inventory self-record with zero errors and zero warnings. The real PostgreSQL integration passed 158 tests after applying all 43 migrations. The real Neo4j integration passed all four projection tests. No external model call or native screen-reader evaluation was performed.

| Risk | Adversarial question | Finding |
| --- | --- | --- |
| Direct Neo4j coupling | Can a browser or domain command treat the projection as authority? | No. The server owns the Neo4j driver behind the graph-store boundary. PostgreSQL supplies canonical records, Project definition, provenance, snapshots, commands, and checkpoints. Neo4j supplies bounded rebuildable membership. The workbench imports no Neo4j driver. |
| Renderer authority | Can Cytoscape position, selection, or an inferred label create a domain fact? | No. The renderer receives typed semantic facts, and graph and text render the same normalized relationships. Selection and layout remain presentation state. Governed effects still enter through existing Review, History, or Work commands. |
| Hard-coded scientific meaning | Does scientific terminology leak into a supposedly generic graph contract? | No material leak was found. Object, relationship, action, and expansion semantics bind to the exact ProjectDefinition, and unsupported registrations fail closed. The controlled-writing graph remains an explicitly synthetic fixture because the live focused-query composer is still scientific-only; no report promotes that fixture to live backend coverage. |
| Cross-Project leakage | Can an exact object or relationship from another Project pass because its identifier is otherwise valid? | No. Authenticated routes bind the path Project; PostgreSQL, graph-store, returned records, snapshot, and checkpoint identities must agree. Cross-Project route and dependency tests reject mismatches. |
| False completeness | Can a capped, filtered, hidden, restricted, or unknown member be interpreted as absent? | No. Coverage remains `complete_for_scope`, `capped`, `partial`, or `unknown`, with explicit omissions and finite limits. Comparison logic refuses to infer Added or Removed from an incomplete side. |
| Stale response replacement | Can an older response replace a newer graph, Details selection, or expansion? | No. Controllers bind request, presentation, snapshot, and selection identities. The final browser evidence deliberately completes requests out of order and retains only the newer state. |
| Lost provenance | Can a relationship survive while its exact basis or source destination is lost? | No. Members and paths retain record revision and hash, basis, SourceSpan and ProjectSource destinations, origin, authority layer, snapshot, and projection position. Exact source inspection is exercised in Chrome. |
| Duplicate effects | Can restart, reconnect, replay, or compensation create a second command, event, ChangeSet, output, or projection-outbox effect? | No. The fresh-store cumulative trace compares durable identities and cardinalities after restart, reconnect, exact replay, Apply, and governed compensation, and records no duplicate effect. |
| Local-state promotion | Can cached, selected, working, proposed, stale, or running UI state become current authority? | No. Current, working, historical, cached, running, proposed, stale, applied, and projection-catching-up states remain separate. Presentation state creates no authority record, and PostgreSQL remains canonical. |

## Verification

- `npm run test:postgres:integration` passed 158 real-store tests after all 43 migrations.
- `npm run test:neo4j:integration` passed four real projection and rebuild tests.
- `npm run audit:wave5:evidence` passed 24 of 24 required implementation scenarios with zero errors and zero warnings.
- `npm run verify` passed the generated-contract and fixture checks, retrieval floor, formatting, lint, type checks, production build, TypeScript suites, Python suites, and controller tests.

## Remaining boundary

Design Slice 32 owns the final UX, report-language, and exit decision. It must integrate this audit, rerun material browser checks, confirm the evidence inventory and complete gate, and mark the wave complete only if no material finding remains.
