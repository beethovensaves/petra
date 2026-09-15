# Wave 5 closure baseline and focused-graph disposition

Status: backend slice 1 passed as a bounded architecture and evidence audit;
the existing owners are reusable, the complete DB10 read remains incomplete,
and no Wave 5 evidence scenario was executed

Date: 2026-09-15 America/New_York

Backend starting commit: `f10487d7344f3bb7822a8b830286e6ca30e3a0c5`

Exact design counterpart inspected:
`bc9b57717830131fadf33a0175ae37237aab47a9`

Wave 4 exit commits: backend
`abe1dc88fdb6081e48c288e80d0b2a4b689e6dac` and design
`1395f49b03fb0511fecf52f44e5c1a32841bd110`

## Result

Wave 4 materially completed `UX1.4` within its recorded production-browser,
provider, and accessibility boundaries. Its working-candidate, working-
relationship, Review, exact human Apply, Brief, History, recovery,
communication, interaction, Work, source, projection, and paired-profile
owners are the starting boundary for Wave 5. Wave 5 must compose those owners;
it must not replace them with graph-specific commands, ledgers, profile rules,
or source registries.

The existing graph boundary is useful but narrower than DB10. The additive
`petra.project-relationship-view@1.0.0` supplies one current scientific
provenance question over an `ASSERTS` relationship, exact Work, WorkVersion,
Claim, Assertion, SourceSpan, and Artifact identity, a projection checkpoint,
bounded scope and omissions, safe source destinations, and a complete textual
peer. `petra.project-relationship-overlay-view@1.0.0` composes relevant durable
scientific WorkingCandidate and WorkingRelationship records without promoting
them to current authority. The frozen Graph consumes that overlay through a
renderer-neutral client rather than querying Neo4j.

Those contracts do not provide the complete DB10 query owner. General task and
endpoint selection, other registered relationship meanings, paired-profile
graph composition, historical reconstruction, dedicated comparison, impact
and time reads, named expansion, continuations, filtering, dense/cyclic
coverage, and the complete adverse-state boundary remain Wave 5 work. No
consequential product, profile, authority, or information-hierarchy decision is
unresolved: the accepted DB10 decisions and the Wave 5 packet fix the smallest
safe disposition below.

## M1.7 implementation baseline

This table records reusable production coverage, not milestone completion and
not new executed evidence. A capability remains open wherever the Wave 5 exit
requires broader composition or a fresh cumulative trace.

| Work | Reusable production boundary | Wave 5 consequence |
| --- | --- | --- |
| `M1.7-W01` | The Project shell carries exact Project, ProjectDefinition, authority snapshot, and selection context. | Reuse those identities in every focused-graph entry and return; do not add a graph Project header owner. |
| `M1.7-W02` | `ProjectBriefView` supplies a snapshot-bound current question, retained grounded synthesis, evidence frontier, History window, and typed SuggestedAction paths. | Compose Brief identity into the focused question and return context; do not rebuild Brief. |
| `M1.7-W03` | The scientific ProjectSource read and exact source inspection expose canonical identity, active revision, rights, processing coverage, Artifact, and SourceSpan destinations. | Reuse the source and semantic-location owners for graph Details; broader profile source adapters remain outside a graph registry. |
| `M1.7-W04` | The current scientific relationship read, working overlay, Review views, and communication records separately retain Claim, relationship, scope, origin, basis, validation, and authority state. | Compose them into one focused result and add the registered relationship coverage needed by `M1.7-AC02`; do not collapse citation into support. |
| `M1.7-W05` | One bounded current scientific provenance graph plus its working overlay is live and rejects fixture fallback. | Extend through the new focused-graph contract instead of widening the existing single-purpose view in place. |
| `M1.7-W06` | Semantic location, ProjectSource inspection, Review basis links, and exact return targets are live. | Preserve the selected graph identity through Details and source inspection and execute the fresh cross-view trace. |
| `M1.7-W07` | ReviewSession, ChangeSet, Approval, member outcomes, exact Apply checkpoint, recovery assessment, and governed Revert are canonical production paths. | Graph correction must prepare or enter those paths; graph gestures and coordinates confer no authority. |
| `M1.7-W08` | Current authority, working candidates, cached/replayed interaction, running Work, proposed Review state, validation, applied outcomes, stale reads, and projection freshness have distinct owners. | Compose and execute them together without presenting operational or derived state as authority. |
| `M1.7-W09` | Project Work reads, SuggestedAction preview/invocation, durable Work observation, measured-use coverage, explicit cancellation, and restart-visible outcomes are live. | Reuse the typed Work preview and cancellation paths for graph-origin investigation; expansion remains a read. |
| `M1.7-W10` | `PetraInteractionClient` wraps the AG-UI integration and production feature data is mapped into Petra-owned models. | Audit the import boundary on the final tree; feature code must not parse raw AG-UI events. |
| `M1.7-W11` | The frozen assistant, activity, proposal, Review interrupt, Work, and recovery presentations consume Petra-owned client models. | Preserve that integration; Wave 5 adds graph destinations and previews only through renderer-neutral data. |
| `M1.7-W12` | Successful and cancelled interaction history, replay checkpoints, delivery receipts, client abort, authorized Work cancellation, provider interruption ordering, and restart recovery are live as separate paths. | Re-execute reload, reconnect, replay, abort, and cancel with duplicate-effect assertions in the Wave 5 cumulative trace. |

Every `M1.7` acceptance row requires a fresh Wave 5 execution. Existing owners
make the seven scenarios feasible, but historical tests and Wave 4 recordings
cannot be copied into the frozen Wave 5 ledger.

| Acceptance | Current basis | Required Wave 5 execution |
| --- | --- | --- |
| `M1.7-AC01` | Work, Claim, Assertion, SourceSpan, Brief, Graph, semantic-location, and source-inspection identities exist. | `cross-view-identity-live` on fresh stores through all named production views. |
| `M1.7-AC02` | Predicate, relation class, origin, and basis are typed; scientific `ASSERTS`, provenance/structural links, and controlled-writing `GOVERNS` remain distinct in their registered paths. | `citation-support-separation-live` with citation, support, contradiction, qualification, and inference in one bounded production query. |
| `M1.7-AC03` | Inspect, correct, Review, exact Apply, recovery, and governed Revert owners are live. | `review-correct-reverse-live` through those production paths with no graph-specific command owner. |
| `M1.7-AC04` | Commands, events, Apply, interaction history, replay, and projection delivery are idempotent and restart-visible in prior traces. | `reload-reconnect-no-duplicate` with exact Work result, command, event, ChangeSet, and projection cardinality checks. |
| `M1.7-AC05` | Authority, working, operational, cached, stale, applied, and projection positions are represented separately across current owners. | `authority-projection-separation` through the composed focused read and related production views. |
| `M1.7-AC06` | AG-UI is wrapped by the interaction adapter and `PetraInteractionClient`. | `ag-ui-import-boundary-audit` against the final Wave 5 source tree with a retained artifact. |
| `M1.7-AC07` | Delivery abort records delivery state only; the authorized cancellation command changes the WorkUnit before provider interruption and persists a cancelled terminal. | `abort-cancel-separation` with exact restart-visible outcomes. |

## UX1.5 implementation baseline

DB10, `UX1.5-DISC01` through `DISC03`, and the frozen sidecar remain the
acceptance sources. The exploratory `FocusedGraphViewModel` and the current
scientific production graph demonstrate a renderer boundary; neither is the
complete `FocusedGraphView` requested by Wave 5.

| Work | Live coverage at this boundary | Remaining bounded work |
| --- | --- | --- |
| `UX1.5-W01` | One scientific provenance question has bounded current entry. | Add profile-valid provenance, disagreement, comparison, impact, time, and paired-profile tasks with exact task identity. |
| `UX1.5-W02` | The scientific view states its question, scope, focus, objective, current position, maximum depth, projection position, and completeness. | Generalize exact layer, endpoint, predicate, limit, omission, and request identity without accepting renderer-authored traversal. |
| `UX1.5-W03` | Current scientific nodes and working scientific Claims retain exact revisions, labels, descriptors, layer, selection target, and destinations. | Resolve all returned object meanings through the registered profile and prove a materially different profile fails closed rather than borrowing scientific terms. |
| `UX1.5-W04` | Exact predicates, direction, relation class, origin/basis, and non-authority text exist for the narrow current and working paths. | Register and compose citation, support, contradiction, qualification, inference, and paired-profile meanings with non-color-identifiable limitations. |
| `UX1.5-W05` | Current and Working changes are composed separately; projection freshness is separate from authority. | Add exact Historical and comparison positions without mixing revisions, and exercise all freshness states. |
| `UX1.5-W06` | Graph/Review selection can reach exact source inspection and return through stable semantic identities. | Preserve one selection across Brief, Evidence, focused Graph, Details, source inspection, refresh, and route return. |
| `UX1.5-W07` | The current path and textual peer expose ordered steps, rationale, basis, SourceSpan destinations, scope, and projection position. | Add selected-node/relationship Details, validation and authority state, explicit unavailable facts, and profile-valid paths generally. |
| `UX1.5-W08` | The current scientific Graph has a complete textual peer for its returned records. | Provide graph/text parity for every new layer, omission, action, comparison, impact, time, and adverse state. |
| `UX1.5-W09` | Bounded scope and one fixed finite depth exist; presentation selection and layout remain local. | Add server-owned named expansion, filters, caps, groups, cycles, hidden/restricted/unknown counts, and bound continuations; keep saved questions and ten-state history local. |
| `UX1.5-W10` | Canonical working correction, Review, Apply, recovery, and Revert paths are live independently of renderer layout. | Compose graph-origin correction and non-drag parity into the same exact candidate/Review preview; never accept coordinates in a command. |
| `UX1.5-W11` | Existing readers fail closed for identity, authorization, stale state, unavailable projection, and source/review recovery within their own scopes. | Exercise the complete DB10 adverse-state matrix while preserving the last usable orientation and exact recovery owner. |
| `UX1.5-W12` | The current query has a finite maximum depth and the renderer has prior bounded parity/accessibility evidence. | Run `UX-FX25` density, cyclic, layout, selection, query/projection timing, responsive, and accessibility evidence without inventing a universal threshold. |

The narrow current view materially establishes only a starting subset of
`UX1.5-AC02` through `AC04`: it is task-bounded, exposes exact provenance and
projection state, and has a textual peer. It does not close those criteria for
the full DB10 scope. `UX1.5-AC01` and `AC05` through `AC10` remain unproven for
the focused graph. In particular, the current graph does not demonstrate all
five required relationship meanings, graph-origin correction, named
expansion, dense/adverse omission behavior, dedicated comparison/time, or the
complete presentation-only control boundary.

## Accepted disposition of `UX-REQ-013`

`UX-REQ-013` is accepted for Wave 5 as an additive read composition, not a new
authority model. The smallest coherent contract is
`petra.focused-graph-view@1.0.0`, implemented after the design contract map as
the packet's slice 3. It must preserve the existing relationship view and
overlay versions as reusable inputs rather than edit either schema in place.

The first contract records the exact question and task; Project and
ProjectDefinition; requested and represented snapshot; Current, Working
changes, or Historical layer; authority and projection positions; bounded
scope, filters, limits, coverage, and omissions; profile-resolved nodes and
relationships; ordered paths; current selection; semantic destinations; and
registered read, correction, Review, or Work-preview actions. Unsupported
profile meanings, relationship types, layers, temporal positions, or actions
are explicit unavailable results or fail closed. Geometry, pan, zoom, layout,
drag, disclosure, local history, and local saved-view state do not enter this
contract.

The authenticated query owner introduced in later slices composes canonical
PostgreSQL records with the bounded Neo4j projection under one exact Project,
definition, snapshot, projection checkpoint, and authorization boundary.
PostgreSQL remains authoritative; Neo4j remains rebuildable. The view creates
no domain record, command, event, ChangeSet effect, projection effect, or new
research. Correction reuses WorkingCandidate and Review. Investigation reuses
the typed Work preview. Details and source inspection reuse semantic location
and ProjectSource owners. Historical, comparison, impact, and time facts come
only from retained canonical positions or an explicitly supported owner with
known coverage; the runtime never derives importance, confidence, maturity,
absence, or authority from topology or layout.

This disposition is deliberately smaller than the complete implementation.
Slice 3 defines the versioned renderer-neutral result and fail-closed profile
boundary. Slices 5 through 19 add query composition in the packet's dependency
order. The design slices map that data into the frozen workbench. No later
query, correction, performance, or browser work is pulled into this baseline.

## Executed-evidence control

The frozen Wave 5 inventory contains 25 required scenario records: seven
backend-owned and eighteen design-owned. At this baseline, zero records are
executed. This audit invoked no named sidecar scenario and therefore adds no
evidence entry. Prior Wave 4 traces, ordinary repository tests, contract
fixtures, uninvoked helpers, and this report remain prerequisites or regression
support only.

The seven backend scenarios must run through the cumulative production path in
slice 21 and be reconciled again in the protected reserve. Design must execute
the inventory audit by completed slice 24 before remediation begins. Wave 5
cannot close until all 25 exact records pass against retained commands and
artifacts on pushed commits.

## Verification

Pinned Node 24.20.0 and npm 11.19.0 were selected explicitly. This report-only
slice changes no persistence, PostgreSQL behavior, Neo4j behavior, runtime
contract, API, typed client, frozen React component, CSS file, or browser
route, so no real-service integration run is required.

- The focused Wave 5 handoff automation tests passed.
- The complete `npm run verify` repository gate passed.
- `git diff --check` passed.

## Next safe boundary

Perform exactly Wave 5 slice 2 on the design branch against this pushed backend
commit and design counterpart
`bc9b57717830131fadf33a0175ae37237aab47a9`. Record the Wave 4 closure
bookkeeping, map DB10 and every Wave 5 sidecar state to existing production
components, routes, and remaining backend needs, and make no speculative
product change. Then hand back for backend slice 3, which adds only the
versioned renderer-neutral `FocusedGraphView` contract and its fail-closed
validation boundary.
