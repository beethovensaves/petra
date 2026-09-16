# Wave 5 comparison, impact, and time reads

Date: 2026-09-16
Role: backend
Slice: 15

## Delivered boundary

Petra now exposes one renderer-neutral `focused-graph-analysis-view@1.0.0`
contract and authenticated typed read for three bounded tasks:

- Comparison returns two exact named graph positions, server-computed record
  identity differences, a common base only when the requested snapshots match,
  finite coverage, and limitations. An unreturned member is Added or Removed
  only when the opposite position is complete for its exact scope.
- Impact embeds the existing `project-history-impact-view@1.4.0` dependency
  result for one exact event and focused record. Supplied Review-member and
  ChangeSet consequence summaries are returned separately and only when the
  request binds their exact Review identities. Otherwise consequences are
  explicitly unavailable.
- Time returns one exact graph position, its date when the requested temporal
  dimension supplies one, and a stable textual position for every member.
  Missing member dates stay explicitly unknown; stable-key order is labeled as
  non-chronological.

The production composer reuses the existing focused-graph, History, and Review
read owners. PostgreSQL remains authoritative, Neo4j remains a rebuildable
projection, and the result records the exact graph snapshots and projection
positions supplied by those owners. The endpoint accepts no layout, geometry,
or command state. The contract forbids renderer-derived domain facts and
universal importance, maturity, confidence, or currentness scores.

## Production surface

- `POST /api/queries/projects/:projectId/focused-graph/analysis`
- `FocusedGraphClient.readAnalysis(projectId, request)`
- Production composition is enabled with the existing focused-graph query
  owner and therefore follows its configured PostgreSQL and Neo4j boundary.
- The browser-bundled contract registry includes the same canonical schema for
  the next design slice without adding a presentation implementation.

## Verification boundary

Focused contract, core composition, typed-client, route, and browser registry
checks cover exact identity, partial-scope absence, separate dependency and
consequence sources, exact and unknown dates, response substitution, and
rejection of renderer-owned fields. Repository-wide and real PostgreSQL gates
are required before this slice is committed.

This slice executes no named frozen Wave 5 evidence scenario. It creates no
evidence record and does not change the 0-of-25 executed inventory.
