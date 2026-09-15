# Wave 5 design closure bookkeeping and contract map

Status: design slice 2 complete as a bounded report-only conformance map; no
frozen component, route, fixture, runtime contract, or authority owner changed,
and no Wave 5 evidence scenario was executed

Date: 2026-09-15 America/New_York

Design starting commit:
`7c5af1c56efa6e8235c2340dea21ed82e83ae2b8`

Exact backend counterpart inspected:
`9568ec4793a173cd4b0f4197ea645e0a6ef5fbd6`

Exact pre-merge design commit inspected:
`bc9b57717830131fadf33a0175ae37237aab47a9`

Wave 4 exit commits: backend
`abe1dc88fdb6081e48c288e80d0b2a4b689e6dac` and design
`1395f49b03fb0511fecf52f44e5c1a32841bd110`

## Result

The Wave 4 `UX1.4` closure is accurately recorded. Commit `bc9b577` changed the
module and all fifteen `UX1.4-W01` through `W15` rows to `complete`, amended
`UX1.4-AC12` to the executed browser-semantic boundary, and added the exact
Wave 4 runtime checkpoint. The final item 56 report supports that bookkeeping:
all six `UX1.4-EV01` through `EV06` rows were materially covered across the
accepted evidence set. Item 49 remains the sole external-model execution; the
final browser boundary was one headless Chrome engine with synthesized touch,
browser-emulated media preferences, Vite asset delivery, and a fixture-scoped
pane check. No physical-device, cross-browser, deployed-host, broad
model-quality, VoiceOver, or native screen-reader result is implied. Those later
evaluations do not reopen the accepted Wave 4 module.

DB10 remains `in_progress` at runtime. Petra has a useful production relationship
read, Current and Working changes presentation, a complete textual peer for that
read, selected-node Details, exact-source return, and canonical Review, Work,
History, and semantic-destination owners. It does not yet have the complete
profile-resolved `petra.focused-graph-view@1.0.0`, the general bounded query owner,
or the paired-profile, historical, comparison, impact, time, expansion, adverse,
and cumulative browser coverage required by Wave 5.

This slice changes only this map. It does not pre-empt slice 3's backend contract,
later query composition, or later design integration. It also does not count a
report, test definition, old Wave 4 trace, or uninvoked helper as Wave 5 evidence.

## Frozen source boundary

The map uses these accepted sources without changing their decisions:

- DB10, including `DB10-P01` through `P08`, the twenty-row state and recovery
  matrix, `DB10-A01` through `A04`, and the fifteen post-freeze acceptance
  behaviors in `reports/PETRA-UX-DESIGN-BRIEF.md`;
- `UX1.5-DISC01` through `DISC03`, `UX1.5-W01` through `W12`, `UX1.5-AC01`
  through `AC10`, and `UX-FX24`/`UX-FX25` in
  `design_implementation_roadmap.md`;
- the accepted `UX-REQ-013` disposition in
  `reports/WAVE5-CLOSURE-BASELINE.md`;
- the automated Wave 5 packet in `scripts/wave-handoff-wave-5.md`; and
- the frozen inventory in `scripts/wave-handoff-wave-5.evidence.json`: one
  mandatory design inventory audit plus twenty-four sidecar scenarios, for
  twenty-five required records in total.

The accepted renderer direction remains two-dimensional Cytoscape with a
renderer-neutral input and a complete textual peer. Literal 3D, Reagraph
adoption, and yFiles evaluation remain outside this wave.

## Existing production integration seams

| Surface or owner | Production route and data path | Reusable boundary | DB10 limit at this commit |
| --- | --- | --- | --- |
| Project shell and navigation | `projects/:projectId` in `apps/workbench/src/router.tsx`, backed by `/api/queries/projects/:projectId/shell` | Preserves Project, ProjectDefinition, profile terms, current place, and the primary Graph destination. | Graph navigation carries only the Project route; it does not establish an exact relationship task, snapshot, origin, or saved question. |
| Brief | `projects/:projectId/brief`, backed by `/api/queries/projects/:projectId/brief` and rendered by `ProjectBriefSurface`/`BriefRoute` | Supplies current focus, retained synthesis, evidence, Work, next action, Review, History, and source identities. | No general contextual focused-graph action yet carries the exact Brief task and return context. |
| Production Graph read | `projects/:projectId/graph` uses `loadProjectRelationshipOverlayGraph`; it calls `/relationship-overlay` and falls back to `/relationship-view`. | Reuses authenticated Project-scoped relationship readers. The loader rejects another Project or mismatched definition/authority positions. | Both server reads are fixed narrow queries. They accept no task, endpoints, layer, time, filter, expansion, continuation, or saved-question identity. |
| Renderer-neutral client mapping | `graphQuestionFromOverlayView` and `graphQuestionFromView` map validated server records to `GraphQuestion`; client code assigns presentation positions. | Keeps PostgreSQL/projection records outside the renderer and checks exact member/text parity plus the non-authority boundary. | `GraphQuestion` is a narrow client type, not the accepted `FocusedGraphView` contract. Historical, general paths, registered actions, comparison, impact, time, and adverse capabilities are absent. |
| Frozen production Graph presentation | `GraphSurface`/`GraphRoute` render Current and Working changes, graph/text modes, two local layouts, selection history, selected-node Details, scope/omissions, exact positions, and projection notice. | Presentation controls do not issue domain commands; labels, arrows, layer text, and a textual peer carry meaning beyond color. | Historical is unavailable; the local history is not the accepted ten-state recipe; there is no named expansion, filter, pin, collapse, fit/reset, save, comparison, impact, time, edge/path Details, or late-response guard. |
| Cytoscape prototype | `apps/workbench/src/graph/FocusedGraph.tsx` is mounted only through the deterministic shell fixture. | Demonstrates lazy Cytoscape loading and a renderer-neutral prototype boundary. | It is not the production Graph route, does not consume live `FocusedGraphView`, and is not Wave 5 evidence. It must not replace the production data owner by inference. |
| Exact source inspection and return | `projects/:projectId/sources/:sourceId`; `SourceReaderRoute` accepts `from=graph`, `graphLayer`, and `graphNodeId`, then returns to the selected Graph node. `/object-location` supplies general authorized semantic destinations. | Reuses exact ProjectSource, Artifact/SourceSpan, immutable revision, permitted fallback, and route-return owners. | Graph currently exposes source links for selected current nodes only. Exact edge, path-step, missing/replaced destination, and full task/scope return identities need the focused contract. |
| Review and governed correction | `projects/:projectId/review/:reviewId`; production endpoints own candidate correction, basis revision, separation, refresh, exact Apply checkpoint/command, recovery, and History compensation. | One canonical candidate/Review/ChangeSet path already exists; Graph selection or layout grants no authority. | Graph uses a fixed Review link and cannot yet resolve a registered correction action from an exact selected relationship. No graph-specific command is needed or allowed. |
| SuggestedAction, Petra, and Work | `projects/:projectId/petra`, `/work`, and `/work/:workId`; `SuggestedWorkAction` uses preview, invocation, observation/replay, and explicit Work cancellation owners. | New research can reuse the typed preview and durable Work lifecycle. Delivery abort and Work cancellation remain separate. | The narrow Graph read does not return a task-valid Work-preview action or exact graph return context. Expansion itself must remain a read. |
| History, impact, recovery, and Revert | `projects/:projectId/history` and `/history/:episodeId`, with retained-event, impact, recovery, preview, plan, and execution endpoints. | Exact retained positions, assessed effects, authority effects, projection effects, and governed compensation are live outside Graph. | No focused Historical, before/after, impact, or time composition yet binds these facts to graph/text positions. Current records cannot be used to fabricate history. |
| Interaction integration | `PetraInteractionClient` and the interaction/communication presentation wrap the AG-UI boundary. | Feature presentation consumes Petra-owned models; delivery, replay, Work, and authority remain separate. | The final Wave 5 tree still needs the named import-boundary audit and cumulative abort/reconnect evidence. Graph must never parse raw AG-UI events. |

## `FocusedGraphView` region map for backend slice 3

This map restates the accepted disposition; it is not a new schema proposal.

| Accepted server-owned information | Existing production consumer or destination | Required boundary |
| --- | --- | --- |
| Exact question/task, Project, ProjectDefinition, requested/represented snapshot, semantic layer, projection position, and request identity | Graph heading, layer control, position summary, projection notice, shell context | The renderer cannot choose the task, profile meaning, authority snapshot, or projection checkpoint. Unknown or incompatible meanings fail closed. |
| Focus/endpoints, relationship allowlist, directions, filters, finite limits, coverage, counts, and omissions | Scope summary, omissions/limitations region, later Scope controls, graph and textual peer | Counts must name units and coverage. Hidden, restricted, partial, capped, and unknown cannot imply absence or completeness. |
| Profile-resolved nodes, relationships, ordered paths, direction, origin, basis, SourceSpans, lifecycle/validation/authority state, and explicit unavailable facts | Bounded renderer input, textual path/evidence matrix, selected node/relationship/path Details | Client geometry and position never create meaning. Citation, support, contradiction, qualification, and inference remain registered, distinct meanings. |
| Current selection and exact semantic destinations | Shared selection state, embedded/full-route Details, Brief, source reader, Review, Work, History, and exact return | Preserve stable identity and return context; do not add a graph-specific source or object registry. |
| Registered read, correction, Review, and Work-preview actions with availability and consequence | Existing Review, SuggestedAction/Work, semantic-location, and History owners | Actions resolve to canonical routes/commands. Coordinates, drag state, or visual grouping never enter a domain payload. |
| Historical, comparison, impact, and time positions and limitations when supported | Dedicated graph/text comparison, impact, timeline, and Return to current views | Differences, assessed consequences, and dates must be supplied facts; topology cannot calculate importance, maturity, confidence, impact, or currentness. |
| Projection catching up, unavailable, rebuilding, and current with authoritative position | Graph freshness notice and authoritative non-graph destinations | Projection freshness is a view condition, not a fourth authority layer. PostgreSQL remains authoritative and Neo4j rebuildable. |
| No geometry, pan, zoom, layout, drag, disclosure, pin, collapse, local saved recipe, or ten-state history | Application-owned presentation state in the frozen workbench | These values stay out of the server domain contract and cannot authorize a mutation. |

## DB10 path map

| Path | Live production seam | Remaining backend need | Later design integration need |
| --- | --- | --- | --- |
| `DB10-P01` Enter a relationship task | Direct Graph route, Project shell, one current scientific relationship question, and Review-to-working-Graph entry are live. | Accept and validate exact task/question, origin, focus/endpoints, definition, snapshot/layer/time, scope, selection, return, and request identity for contextual/direct entry. | Bind Brief, Review, Petra, History, recent/saved exact question, and direct entry to the same production controller; focus the resolved question or exact recovery. |
| `DB10-P02` Inspect and trace | Node selection opens embedded Details; current nodes can open exact source and return to the selected node. | Return exact node, relationship, group/path-step identity, origin, basis, limitations, SourceSpan destinations, and explicit unavailable destination facts. | Synchronize node/edge/path selection with Details, source inspection, graph/text peers, and stable focus/return. |
| `DB10-P03` Expand, filter, or refocus | The current client can change selection only; the fixture prototype has local depth/filter controls but is not production. | Compose named expansion, filtering, groups, caps, cycles, hidden/restricted/unknown counts, continuations, request/snapshot matching, and branch-specific failures through one bounded query owner. | Keep the prior result and selection during branch reads; reject late responses; provide stop/retry/narrow/Back and equivalent text actions. |
| `DB10-P04` Change representation or layout | Production Graph/Text, Neighborhood/Dependency arrangement, and Back/Forward selection history are local and command-free. | No presentation-state owner is needed. The contract must provide one renderer-neutral membership and selection boundary for every peer. | Integrate primary Cytoscape without importing authority; add supported task layout, pin/collapse/fit/reset, saved question, and capped ten-state history with graph/text parity. |
| `DB10-P05` Compare or inspect time | History and exact event impact/recovery routes exist; Graph exposes Historical as unavailable. | Supply retained exact positions, common base where applicable, supplied differences, dependencies, assessed consequences, dates/unknown dates, authority/freshness per position, coverage, and limitations. | Present dedicated comparison, impact, and time views with selection parity and Return to current; never infer a difference from geometry. |
| `DB10-P06` Correct a relationship | Canonical Review correction, refresh, Apply, recovery, and Revert routes are live; Graph links to Review without an exact selected-action binding. | Resolve a registered correction/Review action to the existing exact candidate and Review owners. Do not add a graph mutation or accept coordinates. | Provide pointer and non-drag entry, affected-scope/unchanged-state preview, cancellation, command outcome, and exact return. |
| `DB10-P07` Investigate a gap | SuggestedAction preview/invocation, Petra context, Work observation/replay, explicit cancellation, and terminal Work routes are live. | Return a profile-valid registered Work-preview action with exact scope, consequence, availability, and return references; the expansion query creates no Work. | Route the graph/text action through `SuggestedWorkAction`, then return with the original question/selection and the actual Work result or failure. |
| `DB10-P08` Resume, refresh, and return | Browser route return, source-to-Graph selection return, local selection Back/Forward, Review refresh, interaction replay, and stable Brief fallback exist separately. | Re-resolve exact saved/current references, access, snapshot, replacement, projection position, and request freshness without ambient substitution. | Preserve task, scope, selection, representation, origin, focus, cached-state label, and recovery across refresh/reconnect/return; cap local Graph history at ten settled states. |

## DB10 state and recovery map

Every frozen state is accounted for below. A live neighboring owner is not a
claim that the focused Graph already presents the state.

| Frozen state | Existing production state or owner | Remaining focused-graph composition |
| --- | --- | --- |
| No relationship question | `GraphRoute` renders a bounded empty state after a 404 and returns to Brief; it does not substitute a fixture or corpus network. | General recent/saved/object/natural-language entry and exact return are absent. |
| Interpreting or ambiguous | Petra interaction records named roles and bounded context outside Graph. | The focused request needs typed interpretation, fail-closed profile validation, consequential clarification, and stop/direct-task recovery. |
| Loading | Router and controller loading exist generally. | Keep exact question, target, layer, snapshot, and prior usable result visible; support supersession without fabricated nodes. |
| Ordinary, current, complete for scope | The scientific relationship/overlay read states question, bounded scope, current authority/projection position, counts, omissions, and text parity. | General registered tasks and paired profiles are absent; “complete for scope” must remain distinct from complete knowledge. |
| No recorded relationship in scope | The current 404 empty state says no supported current path is available. | The result must name the exact predicate/layer/time/coverage and offer bounded Scope, Working, basis, or Work recovery without global-absence language. |
| Dense | Responsive Graph CSS and text reflow exist, but no dense production fixture or budget is executed. | Backend must return finite bounded/grouped/capped membership and honest count units; later design must measure `UX-FX25`. |
| Expansion running or interrupted | Interaction and Work interruption owners exist, but Graph has no server expansion. | Add branch request identity, stop/retry, late-response rejection, and preserved prior result; do not cancel unrelated Work. |
| Partial, capped, or limited | The overlay exposes fixed omissions, limitations, returned/excluded counts, and a complete peer for returned members. | Add query-specific caps, pages/continuations, incomplete branches, unknown totals, and exact source recovery. |
| Disconnected objects or no path | No focused production representation exists. | Return exact endpoints and explicit incomplete/no-path coverage without a synthetic bridge, plus bounded expansion or Work-preview options. |
| Working or stale working base | Working changes, exact working snapshot/base, candidate lineage, validation, and non-authority copy are live for the narrow overlay. | Compose stale-base and newer-revision positions generally; preserve incompatible revisions rather than silently rebasing. |
| Newer authoritative state | Projection `catching_up` produces “Newer authoritative state available” with exact positions. | Preserve the selected query snapshot, provide deliberate refresh/comparison, and reject a late response for the superseded request. |
| Applied—updating views | Review Apply distinguishes authoritative `applied` from projection `catching_up`; Graph shows freshness separately. | Bind exact applied change and authoritative destination to the focused result, with no duplicate Apply. |
| Projection blocked/rebuilding | The current view can map blocked projection to unavailable and render a separate notice. | Return all catching-up/unavailable/rebuilding/current positions consistently and an authorized non-graph recovery without mixed generations. |
| Historical or unsupported time | Historical is visible but explicitly unavailable; retained History routes are live. | Compose exact retained Historical/time facts or an explicit unsupported dimension and Return to current. |
| Comparison partial or stale | Review supplies exact Current/Candidate/Difference/Consequences; History supplies exact impact facts. | Add focused comparison capability, per-side position/freshness/coverage, missing/incomparable facts, and safe retry/close. |
| Read/renderer failure | Route errors and the Graph/Text switch exist, but no production Graph-specific preserved-state recovery is executed. | Distinguish data failure from renderer failure; allow text fallback only when the same records remain valid and preserve prior task/selection. |
| Offline or lost connection | Product health, interaction reconnect/replay, and Work observation exist outside the Graph. | Add cached-age/currentness labeling, unresolved status, bounded retry, and preserved task/selection without inferring success. |
| Missing, replaced, unauthorized, or unsupported profile | Semantic-location, exact source, Review, and route loaders already fail closed within their scopes. | Focused destinations and queries must return permitted limitations/fallbacks without identity substitution, relationship inference, or access leakage. |
| Correction conflicted, failed, or applied | Review candidate correction, stale refresh, command failure, exact Apply, recovery, History, and governed Revert are live. | Bind the selected relationship action to those owners and return the canonical outcome/projection effect; Graph navigation cannot repair authority. |
| Question answered or Work completed | Brief, Work result, Review, output, and History destinations exist. | Return the exact bounded answer or actual Work outcome to the original Graph task without automatic approval, query expansion, or candidate promotion. |

## Complete frozen evidence-sidecar map

Status is `missing execution` for every row. “Existing seam” means reusable
production code or a prior regression basis, not passed Wave 5 evidence.

| Evidence / scenario | Existing seam | Required production execution or backend input |
| --- | --- | --- |
| `WAVE5-EVIDENCE-CONTROL/executed-inventory-audit` | The packet, roadmap, scope, frozen JSON, and this slice-2 map identify all records. | Slice 24 must reconcile actual commands and retained artifacts after implementation. This slice did not invoke the named audit and cannot record it. |
| `M1.7-AC01/cross-view-identity-live` | Work, Claim, Assertion, SourceSpan, Brief, narrow Graph, semantic-location, Details/source, and Review identities exist. | Fresh stores and the final `FocusedGraphView` must carry the same exact identities through every named production view. |
| `M1.7-AC02/citation-support-separation-live` | Exact predicate/origin/basis exist for the narrow scientific `ASSERTS` path; controlled-writing governing meaning exists in a separate registered contract. | The bounded focused query must return registered citation, support, contradiction, qualification, and inference distinctly, without scientific aliases or citation-as-support. |
| `M1.7-AC03/review-correct-reverse-live` | Production Review inspect/correct/refresh/Apply/recovery and governed History compensation are live. | The focused action must enter those same owners; execute exact correction, Apply, and Revert without a graph command owner. |
| `M1.7-AC04/reload-reconnect-no-duplicate` | Durable Work, commands, events, interaction replay, ChangeSet Apply, and projection delivery have restart/idempotency coverage from earlier waves. | Execute final focused-path reload/restart/reconnect/replay with exact cardinality checks; historical coverage is not a Wave 5 pass. |
| `M1.7-AC05/authority-projection-separation` | Current authority, Working changes, cached/replayed interaction, running Work, proposed Review, applied result, stale state, and projection freshness have separate production owners. | Compose them through final reads and execute current/working/cached/running/proposed/stale/applied/catching-up without derived or operational authority claims. |
| `M1.7-AC06/ag-ui-import-boundary-audit` | `PetraInteractionClient` wraps the interaction adapter; Graph consumes Petra-owned data. | Audit the final source tree and retain the result, proving raw AG-UI event imports stop at the integration boundary. |
| `M1.7-AC07/abort-cancel-separation` | Interaction delivery abort and authorized `CancelWorkUnit` are separate routes and presentations. | Execute both on final fresh stores and verify exact restart-visible delivery and Work outcomes. |
| `UX1.5-EV01/paired-profile-bounded-graph-fixture` | Paired profile Brief/Review/Work grammar exists; the production relationship overlay is scientific-only. | Backend must resolve materially different registered profile objects, relationships, terms, and actions through one focused contract. Design must execute `UX-FX24` through production components and retain the artifact. |
| `UX1.5-EV01/dense-temporal-adverse-fixture` | Narrow omissions, projection freshness, route failures, and responsive styles exist separately. | Backend must supply finite dense/cyclic, temporal, stale, partial, restricted, missing, offline, and projection-rebuild inputs. Design must execute `UX-FX25`, not a helper-only fixture. |
| `UX1.5-EV02/relation-identification-review` | Production Graph uses text labels/arrows and distinguishes Working with line/border treatment. | Final data must include all registered relation meanings, directions, origins, layers, and limitations. A critic must review the actual graph/text presentation without relying on color or position. |
| `UX1.5-EV02/provenance-comprehension-review` | Narrow Graph Details/text and source return expose basis, exact source identity, scope, omissions, and projection position. | Final paths must supply exact source location, derivation, snapshot, omitted steps, and unavailable facts. A critic must review comprehension and inspectability on the production route. |
| `UX1.5-EV03/contextual-entry-scope-selection-return-browser` | Direct Graph, Review-to-Graph, selected-node source return, and Brief fallback exist. | Backend must bind exact task/scope/snapshot/origin/return; design must execute both contextual and direct entry with selection and focus preservation. |
| `UX1.5-EV03/current-working-historical-browser` | Current/Working presentation and projection freshness are live; Historical is unavailable. | Backend must add exact retained Historical/comparison positions. Design must execute all three layers, comparison, freshness, and Return to current without overlap. |
| `UX1.5-EV03/graph-text-parity-browser` | The narrow overlay maps exact server members into graph and complete textual peer lists. | The focused contract must provide parity for every task, limitation, destination, and action; design must execute the same question through both peers. |
| `UX1.5-EV03/keyboard-focus-browser` | Buttons/links, Review focus recovery, source return anchors, and browser-semantic patterns exist. | Backend must provide stable destinations/recoveries. Design must execute entry, text alternative, Details, exact source, actions, recovery, and return by keyboard with visible focus. |
| `UX1.5-EV03/non-color-relation-semantics-browser` | Labels, direction text, arrows, Working dashes, selected outlines, warnings, and layer names provide a partial non-color basis. | Backend must supply citation/support/contradiction/qualification/inference separately. Design must execute every required meaning, selection, warning, and layer in forced/non-color conditions. |
| `UX1.5-EV03/named-expansion-omission-selection-browser` | Fixed counts/omissions and local selection exist; no production expansion/filter request exists. | Backend must implement named bounded expansion, filters, caps, hidden/restricted/unknown paths, continuations, and request matching. Design must execute late-response rejection and selection preservation. |
| `UX1.5-EV03/correction-preview-shared-command-browser` | Review candidate correction and exact Apply path exist; Graph has a working Review link and presentation-only positions. | Backend must resolve exact registered action/candidate/Review references with no geometry. Design must execute pointer and non-drag entry to the same preview/command owner. |
| `UX1.5-EV03/comparison-impact-time-browser` | Review comparison roles and History impact/retained-event routes exist outside Graph. | Backend must compose exact positions, supplied differences/consequences, dates or unknown dates, and limits. Design must execute dedicated comparison, impact, and time graph/text peers. |
| `UX1.5-EV04/dense-cyclic-performance` | No production dense/cyclic focused fixture or measurement exists. | Backend must return a finite instrumentable result and server/query/projection timings. Design must retain fixture size, query/render timing, layout stability, labels, selection, and environment without a universal threshold. |
| `UX1.5-EV04/stale-late-response-browser` | Stale Review recovery and projection catch-up exist; Graph has no asynchronous branch query controller. | Backend must return exact request/snapshot identities and stale recovery. Design must execute out-of-order responses and prove newer state is not replaced. |
| `UX1.5-EV04/disconnected-offline-recovery-browser` | Health, interaction reconnect/replay, Work observation, and generic route failure exist. | Backend must support bounded retry and honest cached/currentness metadata. Design must execute preserved task/selection, offline labeling, retry, and no false currentness. |
| `UX1.5-EV04/projection-rebuild-browser` | Projection current/catching-up/blocked mapping and authoritative Review/History routes exist. | Backend must compose catching-up, unavailable, rebuilding, and current positions consistently. Design must execute each while keeping PostgreSQL authority and actions accurate. |
| `UX1.5-EV04/responsive-text-motion-touch-browser` | Workbench CSS includes responsive reflow, 44-pixel target tokens, forced-color and reduced-motion treatments; Wave 4 has bounded browser evidence. | Backend must preserve complete facts/actions in text. Design must freshly execute supported viewports, 200% text, coarse touch, forced colors, reduced motion, overflow, and browser semantics on the Wave 5 route. |

## Evidence control

No command in this slice invoked any of the twenty-five exact scenario IDs.
Accordingly, the Wave 5 ledger remains `0/25`, and this slice returns no evidence
entry. The report maps future execution; it is not an executed-inventory-audit,
fixture result, critic review, browser record, or backend trace.

The inventory audit remains due by completed slice 24. Eight reserve slices then
remain for remediation. Wave 5 cannot close while any exact scenario lacks a
passed record with its invoked command, retained artifact, and honest boundary.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 are required. This report-only slice changes
no persistence, PostgreSQL behavior, Neo4j behavior, server route, runtime
contract, typed client, frozen React component, CSS, or fixture, so real-service
integration is not required.

- `npm run test:wave-handoff` passed all 21 focused handoff tests.
- The focused inventory-to-report coverage check found all twenty-five exact
  scenario IDs, all eight DB10 path IDs, and all twenty DB10 state labels.
- `npm run verify` passed the complete repository gate on the final report tree,
  including 1,335 always-on tests and seven expected service-dependent skips.
  The first sandboxed run could not bind `127.0.0.1`; the authorized loopback
  rerun passed.
- `git diff --check` passed.

## Next safe boundary

Hand back for backend Wave 5 slice 3 only. Starting from the pushed design commit
for this report and exact backend counterpart
`9568ec4793a173cd4b0f4197ea645e0a6ef5fbd6`, add the smallest versioned
renderer-neutral `petra.focused-graph-view@1.0.0` contract and fail-closed
validation boundary. Preserve `petra.project-relationship-view@1.0.0` and
`petra.project-relationship-overlay-view@1.0.0` as inputs; do not add query,
persistence, route, renderer, or frontend integration work from later slices.
