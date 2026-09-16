# Wave 5 graph exploration state

Date: 2026-09-15

Slice: Wave 5 Slice 12

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The production focused-graph route now consumes the renderer-neutral
`petra.focused-graph-view@1.1.0` client contract for registered, snapshot-bound
expansion. The browser validator registers both v1.0 entry results and additive
v1.1 expansion results.

The interface exposes only expansion recipes registered by the exact
ProjectDefinition and understood by its profile client. The scientific profile
maps trace-sources, contrary, and downstream recipes to their allowed
relationship meanings and directions. Historical expansion and unknown
profiles or recipes fail closed. Labels and definitions come from the exact
profile registration rather than the renderer.

## Exploration behavior

One represented object can start a named expansion with normalized meaning,
direction, origin, and finite-depth filters. The typed client still supplies no
geometry, pin, collapse, history, or command field. An accepted v1.1 result
shows its exact request, recipe, target, normalized filters, returned groups,
and disclosure accounting. Filtered, hidden, capped, restricted, incomplete,
and unknown paths are not presented as absence or completeness.

Selection, relationship or radial layout, pinning, visual neighbor collapse,
graph or text representation, saved exact questions, Home, Reset, and a
ten-state Back/Forward history remain local presentation state. Visual collapse
does not remove facts from the complete textual peer. A saved question retains
the exact returned view and snapshot in the current local session; it creates
no server record or domain authority.

## Late-response boundary

Each asynchronous expansion is bound to its client request identity, Project,
ProjectDefinition, task, origin, return identity, semantic layer, temporal
position, requested snapshot, finite scope, registered recipe, target, and
normalized filters. The interface accepts the response only while that exact
request and presentation state remain active. A newer request, navigation,
selection, filter, layout, pin, collapse, saved-question restore, Home, Reset,
or representation change invalidates the pending result.

The active selection must also exist in the returned membership. A response
that would drop it is ignored. The adapter continues to validate the complete
v1.1 contract and request-response identity before this presentation guard runs.

## Authority boundary

- PostgreSQL remains authoritative; Neo4j remains a rebuildable projection.
- Semantic layer, temporal position, authority position, provenance, selection,
  return identity, and projection position remain separate fields.
- Layout and interaction state do not enter the query contract or grant
  authority.
- Named expansion reveals recorded relationships. It does not start Work,
  prepare correction, issue a Review command, or infer a relationship from
  layout.
- Current/Working comparison remains on its dedicated route presentation. This
  slice does not add Details or source composition from Slice 13.

## Verification boundary

Pinned Node 24.20.0 and npm 11.19.0 are required. Focused exploration,
renderer-neutral mapping, entry, result, and layer/comparison tests cover exact
request construction, browser validation, normalized filters, fail-closed
recipe resolution, stale-response rejection, selection preservation, local
controls, and the ten-state history cap.

- `npm test --workspace @petra/workbench -- focused-graph-exploration.test.tsx`
  passed one file and five tests.
- `npm test --workspace @petra/workbench` passed 20 files and 263 tests.
- `npm run verify` passed generated-contract and fixture checks, the retrieval
  floor, formatting, lint, TypeScript and Python type checks, the production
  workbench build, 1,379 tests, and seven expected service-dependent skips.
- `git diff --check` passed.

This slice invokes no named frozen Wave 5 evidence scenario, so it adds no
passed evidence record. The inventory remains open.

## Next safe boundary

Backend Wave 5 Slice 13 may compose the existing Details and exact source
destinations for the selected node, relationship, basis, SourceSpan, and
revision. It must keep the selected graph identity and return context intact
without adding a graph-specific source registry.
