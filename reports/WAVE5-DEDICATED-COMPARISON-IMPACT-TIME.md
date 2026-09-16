# Wave 5 dedicated comparison, impact, and time views

Date: 2026-09-16

Slice: Wave 5 Slice 16

Design start: `3186822ace88a320dac56a350d29ea8d7460c55d`

Backend counterpart: `5d8d99e467c16d6c7f936c5e5d9c149019c487f9`

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The frozen focused-graph workbench now uses the authenticated
`FocusedGraphClient.readAnalysis` path and
`petra.focused-graph-analysis-view@1.0.0` for dedicated comparison, impact,
and time tasks. The production Graph loader calls
`POST /api/queries/projects/:projectId/focused-graph/analysis` through that
typed client after binding every analysis position to one exact requested
Project snapshot. The route retains the exact analysis request, graph request,
Project, definition, focus, origin, return, layer, snapshot, and finite-scope
identity. No layout, geometry, score, or command state enters the request.

The prior Current / Working changes production route no longer presents two
raw reads while withholding differences. It now renders the backend-supplied
common base, difference kind, exact before and after members, coverage, basis,
and limitations. Added, removed, changed, unchanged, unavailable, and
not-comparable remain server facts; the client does not calculate them from
membership or position.

## Task-specific presentation

- Comparison presents separate exact before and after positions plus supplied
  differences. It preserves each position's snapshot, semantic layer,
  projection position, scope, selected member, destinations, actions, and
  profile-resolved object terminology.
- Impact keeps immutable History dependencies separate from explicitly bound
  Review-member and ChangeSet consequence summaries. Without an exact Review
  binding, consequences remain visibly unavailable rather than inferred from
  topology. Exact Claim targets on History expose a direct impact entry.
- Time keeps the selected position date separate from every member date.
  Exact timestamps use semantic time markup; unknown and unavailable dates
  retain their supplied reasons. Stable-key fallback order is labeled as
  non-chronological. Exact Claim targets on History expose a recorded-time
  entry, and every focused graph offers the bounded recorded-time task.

One representation control switches every exact position between the existing
graph and complete textual peer. The task facts and limitations remain shared
and visible in both modes, so switching representation does not change the
selection, scope, destinations, actions, difference, consequence, dependency,
or date meaning. Responsive structure and redundant labels, words, border
styles, and state attributes avoid reliance on color or graph position alone.

## Authority boundary

PostgreSQL remains authoritative and Neo4j remains a rebuildable projection.
The client accepts only the server-composed analysis contract and does not
derive importance, maturity, confidence, currentness, consequences, dates, or
comparison meaning. The analysis surface is read-only. Selection, layout,
ordering, and graph/text presentation grant no Project authority and issue no
domain mutation.

## Verification boundary

Pinned Node 24.20.0 and npm 11.19.0 are required. Focused checks cover exact
route round trips, typed request mapping, snapshot binding, comparison
differences, separate History dependencies and Review consequences, unknown
dates, profile terms, graph/text parity, selection retention, responsive
structure, non-color difference meaning, and History entry paths. Backend
contract, client, and route checks are included in the complete repository
gate.

No persistence, PostgreSQL, Neo4j, backend contract, or server behavior changed
in this slice, so no real-store integration rerun is required for the design
change. This slice invokes no named frozen Wave 5 browser scenario and adds no
passed evidence record; component and route tests are verification, not the
`UX1.5-EV03/comparison-impact-time-browser` execution. The 25-record inventory
therefore remains open.

## Next safe boundary

Backend Wave 5 Slice 17 may compose governed correction and new-Work reads by
reusing the existing typed working-candidate, Review, SuggestedAction, and Work
preview owners. It must not allow graph coordinates, renderer layout, or drag
gestures into a command payload.
