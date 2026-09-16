# Wave 5 governed correction and new-Work composition

Date: 2026-09-16

Slice: Wave 5 Slice 17

Backend start: `5d8d99e467c16d6c7f936c5e5d9c149019c487f9`

Design counterpart: `d58f00a10e95b69d71c8d9806c81fac035f6db5b`

Status: implemented; cumulative Wave 5 evidence remains open

## Result

The production backend now exposes
`petra.focused-graph-action-preview-view@1.0.0` through authenticated
`POST /api/queries/projects/:projectId/focused-graph/action-preview` and the
renderer-neutral `FocusedGraphClient.readActionPreview` client. The read
re-executes one exact snapshot-bound focused graph, rejects a substituted graph
hash or selection, preserves the graph task, ProjectDefinition, origin, and
return destination, and composes one of two existing owners:

- a governed relationship-correction entry that embeds the exact open Project
  Review view, WorkingCandidate, WorkingRelationship membership, Review member,
  affected scope, unchanged state, and requested **Edit relationship**,
  **Relink**, **Split**, or profile-valid scope-change intent; or
- a new-Work entry that embeds the exact existing `suggested-action-view@1.1.0`
  preview derived from one retained inquiry-result link, including objective,
  scope, basis, readiness, limits, expected result, interruption, cancellation,
  and invocation boundaries.

This is a composition read, not a new command owner. It creates no candidate,
relationship, Review decision, command, event, ChangeSet, Approval, Work,
projection effect, or authority change.

## Exact correction boundary

Current relationship correction is available only when the selected exact
authoritative relationship is already named by an existing Review member's
WorkingRelationship `current_authoritative_ref`. Working-layer correction binds
the selected WorkingRelationship identity and canonical record hash directly.
The bound Review must be open and must retain its candidate and relationship
through `exact_review_session_working_bindings` with `authority_effect: none`.
Missing, closed, cross-Project, stale, or mismatched bindings fail closed.

The preview records the requested edit, relink, split, or scope-change intent
without claiming that the graph performed it. A submitted revision must still
use the existing candidate/Review command path, including its exact stale-input,
validation, separation, approval, Apply, History, and Revert boundaries.
Closing the preview leaves domain state unchanged.

## Exact Work boundary

New investigation entry requires one exact retained ProjectInquiryLink and
reuses `getWorkStartingSuggestedActionViewForInquiryResult`. The composer rejects
a different Project, ProjectDefinition, inquiry-result basis, or task semantic.
Reading the preview starts no Work. Work begins only through the existing exact
`InvokeSuggestedAction` command. Client delivery abort remains distinct from
authorized `CancelWorkUnit`; the preview preserves those existing meanings.

## Renderer and authority boundary

The request parser accepts only the action request identity, exact focused-graph
request and expected hash, one exact semantic selection, and one exact Review or
inquiry-result target. Additional fields fail validation. Coordinates, layout,
pan, zoom, grouping, renderer state, and drag gestures therefore cannot enter a
command payload or grant authority. Pointer and non-drag clients consume the
same preview contract and later design integration must route both through the
same existing owner.

PostgreSQL remains authoritative. Neo4j remains a rebuildable graph projection.
Projection state is retained from the focused graph only as a view condition;
it neither authorizes the preview nor triggers a second command.

## Verification and evidence boundary

Focused tests cover schema rejection of renderer command state; all four
correction intents; exact Current and Working relationship binding; exact
Review, candidate, and relationship ownership; no-command/no-Work effects; exact
SuggestedAction Work-preview reuse; return-context preservation; typed-client
response substitution; route authentication; and rejection of coordinates and
drag state.

This slice does not change a PostgreSQL schema, repository, query, transaction,
or Neo4j projection behavior. The new composer calls the already tested
production graph, Review, and SuggestedAction readers, so no new persistence
migration or fresh-store behavior is introduced. Real-store service gates are
still run with the complete repository verification for integration confidence.

No named frozen Wave 5 scenario is executed by this implementation slice.
Focused tests and contract fixtures are regression verification, not passed
evidence for `M1.7-AC03/review-correct-reverse-live` or
`UX1.5-EV03/correction-preview-shared-command-browser`. The frozen inventory
therefore remains at zero passed records until the named cumulative scenarios
are actually invoked and retained.

## Next safe boundary

Design Slice 18 may add pointer and non-drag entry to this same typed action
preview, show affected scope and unchanged state, preserve exact return context,
and route submission or invocation to the existing Review or SuggestedAction
owners. Presentation-only changes must remain local. Design Slice 18 must not
put Cytoscape coordinates, layout, or gesture state into this request or any
domain command.
