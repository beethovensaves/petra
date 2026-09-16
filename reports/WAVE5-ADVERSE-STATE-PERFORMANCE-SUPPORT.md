# Wave 5 adverse-state and performance support

Date: 2026-09-16

Slice: Wave 5 Slice 19

Backend start: `1d8dfa6a0f640b478d731ddd4d3715ed950a5e6f`

Design counterpart: `ba0c06f71f6a784c8a90869812b758e7280cb2f6`

Status: implemented and executed; cumulative Wave 5 evidence remains open

## Result

`npm run test:wave5:adverse-support` now executes the bounded backend adverse
matrix through the existing focused-graph reader, authenticated server route,
renderer-neutral typed client, late-response controller, PostgreSQL authority,
Neo4j projection store, and projector. It retains the resulting environment,
fixture cardinalities, commands, state outcomes, and observed timings in
`reports/WAVE5-ADVERSE-STATE-PERFORMANCE-OBSERVATION.json`.

The fresh-store projection trace adds 32 canonical PostgreSQL Claim records and
33 scientific projection relationships to the disposable integration fixture.
The relationships include a two-edge cycle. A production Neo4j relationship
read requests a finite limit of 12 and returns exactly 12, while an exact
cycle-member read returns the two recorded directions. The existing focused
query owner separately verifies capped membership, explicit cycle accounting,
filtered/hidden/restricted/unknown omissions, and stale snapshot rejection.

## Adverse-state matrix

- Dense and cyclic: real PostgreSQL records and Neo4j nodes/edges exercise 32
  dense Claims, 33 scientific relationships, and a two-edge cycle.
- Finite limits: the graph store returns exactly the requested 12 relationships;
  the focused query owner retains capped and incomplete accounting rather than
  claiming completeness.
- Stale snapshot: the repeatable-read focused query rejects a substituted
  expected snapshot and rolls back.
- Late response: two authenticated production HTTP requests complete in the
  deliberate order newer then older. The existing controller check proves an
  older request identity cannot replace the active state.
- Restricted and missing targets: the expansion response retains restricted
  path non-disclosure and unknown-path accounting. The PostgreSQL reader fails
  a missing exact focus closed, and the server preserves that result as 404.
- Projection lag and rebuild: the real projection owner observes current,
  catching-up, and ahead-invalid positions, rejects stale projection input,
  rebuilds from the contiguous authoritative outbox, and restores current
  freshness.
- Disconnect and retry: a stopped production HTTP server and an unavailable
  Bolt endpoint fail visibly. Reusing the exact read body against a restarted
  server and a fresh Neo4j store connection succeeds. Neither path retries a
  command or creates a domain effect.

## Observed timings

The retained run used pinned Node 24.20.0 on Darwin arm64 with fresh disposable
PostgreSQL 18.6 and Neo4j 2026.07.1 stores. It observed:

- production HTTP newer response: 40.266 ms;
- production HTTP deliberately older response: 49.852 ms;
- exact HTTP read retry after disconnect: 46.279 ms;
- snapshot-consistent focused query: 110.724 ms;
- finite dense Neo4j relationship query: 7.154 ms;
- initial projection apply: 998.237 ms;
- dense projection apply: 521.555 ms; and
- contiguous projection rebuild: 187.805 ms.

These are observations from one disposable integration run. They are not
product truth, an SLA, a universal threshold, scientific authority, graph
importance, or renderer performance evidence.

## Authority and ownership boundary

PostgreSQL remains authoritative. Neo4j remains a rebuildable bounded
projection. The adverse fixture does not grant its proposed scientific members
trusted authority, and direct projection exercise is discarded by the tested
contiguous rebuild. Renderer state, coordinates, layout, pan, zoom, selection,
or gestures never enter a domain command. Retry remains a caller-owned read
delivery retry; Review, Apply, Revert, and Work ownership are unchanged.

No frozen React component, CSS file, browser route, contract schema,
persistence migration, or production authority implementation changed in this
slice. The code change is an executable support harness plus focused regression
coverage and a retained observation.

## Verification and evidence boundary

The Slice 19 command passed its focused suites, production HTTP trace, all 43
fresh PostgreSQL migrations, and the real Neo4j integration suite. The complete
repository gate is recorded in the final Slice 19 handoff.

This slice executed no named scenario from the frozen 25-record inventory. In
particular, this backend support trace is not
`UX1.5-EV04/dense-cyclic-performance`: that design-owned record also requires a
production browser run with render timing, layout stability, labels, selection,
and environment. No helper, test, or retained timing is promoted to evidence
merely because it exists.

## Next safe boundary

Design Slice 20 may use the retained backend fixture cardinalities and adverse
state outcomes while running `UX-FX25` through production components. It must
exercise density, overflow, stale/offline/projection recovery, keyboard and
focus, browser semantics, 200% text, touch/coarse pointer, forced colors,
reduced motion, and non-color relationship meaning. It may record a frozen
scenario only when that named browser scenario is actually invoked and its
artifact retained.
