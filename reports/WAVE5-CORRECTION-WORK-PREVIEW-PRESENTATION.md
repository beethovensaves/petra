# Wave 5 correction and Work preview presentation

Date: 2026-09-16

Slice: Wave 5 Slice 18

Design start: `6a983fb02329a8fdb700bf4e76a296bcfdad6810`

Backend counterpart: `1d8dfa6a0f640b478d731ddd4d3715ed950a5e6f`

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The production focused-graph route now provides pointer and non-drag entry to
the same renderer-neutral `FocusedGraphClient.readActionPreview` read. The
existing Cytoscape selection and the complete selection control continue to
converge on one exact semantic selection key. The action controller turns that
selection into the same snapshot-bound request regardless of input method.
Its input type does not accept coordinates, layout, pan, zoom, renderer state,
or gesture state.

Review entry retains the exact existing ReviewSession and Review member target.
Brief entry retains the exact inquiry-result link used by the existing
SuggestedAction owner. Both targets survive a strict production-route round
trip, fail closed when incomplete or incompatible, and are removed when the
user changes to Historical, comparison, impact, or time presentation.

## Exact preview presentation

The governed-correction panel displays the backend-supplied current and working
candidate values, supplied difference, selected relationship, ReviewSession,
Review member, WorkingCandidate, WorkingRelationship count, affected scope,
unchanged state, authority consequence, cancellation boundary, and
limitations. Its action returns to the existing Review route with the exact
Review member selected. It does not submit a graph-owned mutation.

The new-Work panel renders the exact existing SuggestedAction preview and
therefore preserves its objective, scope, expected result, basis, readiness,
limits, interruption, authorized cancellation, and canonical invocation path.
Reading or closing either preview leaves Project state unchanged. The graph
request, selection, origin, semantic destination, and return focus remain
visible and preserved.

Late or substituted preview responses cannot replace a newer graph state. A
closed preview restores focus to its trigger while retaining the active graph
selection. Keyboard activation uses the same button and request path as pointer
activation.

## Authority boundary

PostgreSQL remains authoritative and Neo4j remains a rebuildable projection.
The renderer selects recorded identities but neither grants authority nor
constructs correction or Work meaning. Candidate revision and Review remain on
the existing Review path. Work begins only through the existing exact
SuggestedAction invocation; client delivery abort remains distinct from
authorized Work cancellation.

No backend contract, server, persistence, migration, or projection file is
changed by this slice.

## Verification and evidence boundary

Pinned Node 24.20.0 and npm 11.19.0 are required. Focused checks cover strict
entry round trips, absence of renderer fields, pointer/non-drag request parity,
selection constraints, stale-response rejection, exact correction content,
exact SuggestedAction reuse, cancellation language, and preserved return
context. The complete repository gate is recorded in the final Slice 18
handoff.

No persistence or PostgreSQL behavior changes in this design slice, so a new
real-store integration run is not required. This slice invokes no named frozen
Wave 5 evidence scenario. Component and route regression tests are verification,
not the production browser execution of
`UX1.5-EV03/correction-preview-shared-command-browser`; the 25-record inventory
therefore remains open.

## Next safe boundary

Backend Wave 5 Slice 19 may exercise dense and cyclic paths, finite limits,
stale snapshots, late responses, restricted and missing targets, projection
lag or rebuild, disconnect, and retry. It may record server, query, and
projection timings without converting them into product truth. Design must not
begin Slice 20 in this handoff.
