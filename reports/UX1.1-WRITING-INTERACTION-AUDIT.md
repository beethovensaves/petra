# UX1.1 writing and interaction audit

Status: baseline audit; remediation in progress
Audited: 2026-09-02
Scope: current `ResearchShell` fixture, shell view model, shared primitive behavior, and UX1.1 roadmap language
Primary reader: a researcher who understands scientific evidence and review but should not need Petra implementation vocabulary

## Verdict

The current shell preserves several important scientific distinctions, but it is not ready as product UI: eleven consequential issues mix developer language with researcher language, obscure navigation and settings behavior, or weaken user control. One accepted-mode mismatch has been corrected in the roadmap; the remaining findings belong to the primitive and shell rebuild.

### Remediation recorded on 2026-09-02

The baseline findings below are retained as an audit trail. The current shell
prototype now removes developer and module-status language from the application
frame, omits unavailable destinations from product navigation, replaces the
incorrect evidence-row `aria-pressed` state with an explicit **View details**
name, uses **Research snapshot**, **Graph status**, and **Review mode**, derives
the attention action as **Review requested work (1)**, states that settings
apply immediately, uses explicit accessible panel names, and collapses Petra by
default outside the review fixture. Production routes, adverse-state coverage,
Undo for restored settings, and the full `UX1.6` work-state vocabulary remain
open.

## Findings

### Major

#### `UX1.1-AUD-01` — Review-mode terminology drifted from D005

- **Location:** `design_implementation_roadmap.md`, shared state grammar and `UX1.4-W07`
- **Observed:** the design roadmap used `collaborate` and a custom policy as review-mode values.
- **Required meaning:** D005 defines `inspect`, `guide`, `delegate`, and `supervise`. `Collaborate` is a presentation-only layout preset. A scoped custom policy may configure a mode but is not another mode.
- **Consequence:** researchers and implementers could infer the wrong automation defaults or treat a layout change as a governance change.
- **Heuristics:** `NN-H02`, `NN-H04`, `NN-H05`.
- **Disposition:** fixed in the design roadmap; shell label still changes from **Review posture** to **Review mode** during the rebuild.

#### `UX1.1-AUD-02` — Developer and fixture language appears inside the product frame

- **Location:** `ResearchShell.tsx:479-482`, `588-593`, `862-865`, `880-904`, `1094`, `1248-1251`, `1348-1351`
- **Observed:** the app surface refers to a “calibration slice,” “shell fixture,” `UX1.5`, `UX-REQ-001`, “module pending,” and what the fixture verifies.
- **Consequence:** a researcher cannot tell whether content is unavailable, incomplete, simulated, or merely excluded from the review route. Development status competes with the research task and undermines trust.
- **Heuristics:** `NN-H01`, `NN-H02`, `NN-H08`, `NN-H10`.
- **Fix:** move fixture and contract evidence to a collapsible review overlay outside the application frame. Product UI states only the current capability and a useful next action.
- **Disposition:** fix in the primitive gallery and shell recomposition.

#### `UX1.1-AUD-03` — Navigation-like items are inert or unavailable without an operable explanation

- **Location:** `ResearchShell.tsx:847-868`, `1210-1251`
- **Observed:** unavailable primary views render as non-focusable spans with a `title`; Research map objects and destinations are styled as navigation but are not controls.
- **Consequence:** researchers cannot distinguish a current destination, a future capability, and a decorative preview. Keyboard users cannot reach the unavailable explanation.
- **Heuristics:** `NN-H01`, `NN-H04`, `NN-H06`, `NN-H07`.
- **Fix:** show only functional product destinations. When an unavailable action materially belongs in context, keep it focusable and expose its reason and prerequisite. Keep fixture completeness outside the product frame.
- **Disposition:** fix in shell recomposition.

#### `UX1.1-AUD-04` — Primary view changes are not yet route-addressable

- **Location:** `ResearchShell.tsx:847-858`, `1021-1025`
- **Observed:** primary views use anchors to the same fragment while React state owns the actual destination. Opening the focused graph also closes Details without a route or history entry.
- **Consequence:** reload, browser Back, copied links, and shared context cannot reliably reproduce the active view and selection.
- **Heuristics:** `NN-H03`, `NN-H04`, `NN-H06`.
- **Fix:** define URL-addressable shell routes with view and canonical selection. Preserve panel visibility as local presentation state unless a shareable saved view explicitly includes it.
- **Disposition:** fix in UX1.1 routing; retain the current transfer only as fixture evidence.

#### `UX1.1-AUD-05` — Selection semantics describe a toggle that does not exist

- **Location:** `ResearchShell.tsx:768-798`
- **Observed:** the selected evidence row is a button with `aria-pressed="true"`, but activation opens Details rather than toggling pressed state. There is no comparable selectable collection behavior.
- **Consequence:** assistive technology receives the wrong interaction model, and future rows could mix selection with action unpredictably.
- **Heuristics:** `NN-H04`, `NN-H06`.
- **Fix:** use an explicit selectable-list or grid pattern with `aria-selected`, or use a normal **View details** action if the row itself is not the selection mechanism.
- **Disposition:** fix in the shell collection primitive.

#### `UX1.1-AUD-06` — Shell adverse and recovery paths are specified but not represented

- **Location:** `UX1.1-W08`; current `ResearchShell` fixture
- **Observed:** loading, missing, unauthorized, stale-snapshot, replaced-object, offline, storage-failure, and route-recovery states do not have shell paths. Local-storage failure falls back silently.
- **Consequence:** the shell can look complete while its highest-risk orientation and recovery behavior remains unknown.
- **Heuristics:** `NN-H01`, `NN-H03`, `NN-H05`, `NN-H09`.
- **Fix:** add named fixture paths for every applicable adverse state before UX1.1 validation, including what remains preserved and the exact recovery action.
- **Disposition:** fix in `UX1.1-W08` and `UX1.1-W14`.

### Moderate

#### `UX1.1-AUD-07` — Settings apply immediately but the copy implies an unspecified completion step

- **Location:** `ResearchShell.tsx:321-541`, `1068-1081`
- **Observed:** theme, layout, editor, motion, and reset changes apply immediately, while the footer says **Done** and the description does not explain immediate application. **Reset workspace** changes several preferences at once without naming them or offering restoration.
- **Consequence:** researchers may expect **Done** to save changes or may reset more than intended.
- **Heuristics:** `NN-H01`, `NN-H03`, `NN-H04`, `NN-H05`.
- **Fix:** state “Changes apply immediately.” Use **Close settings**. Rename reset to **Restore default workspace settings**, show its scope, and provide a short-lived **Undo** when technically honest.
- **Disposition:** fix in the settings pattern.

#### `UX1.1-AUD-08` — Panel visibility uses inconsistent and underspecified verbs

- **Location:** `ResearchShell.tsx:1171-1182`, `1219-1239`, `1314-1321`
- **Observed:** the map uses **Research map**, **Close**, and **Hide** for related paths; Petra uses bare **Expand** and **Collapse**; Details uses **Show Details** and **Close Details**.
- **Consequence:** controls do not consistently reveal which region changes, whether the change is temporary, or how to restore it.
- **Heuristics:** `NN-H02`, `NN-H04`, `NN-H06`.
- **Fix:** use explicit pairs: **Show/Hide research map**, **Show/Hide details**, and **Expand/Collapse Petra** only where expansion preserves a visible dock. Accessible names always include the region.
- **Disposition:** fix in navigation and panel-header primitives.

#### `UX1.1-AUD-09` — Context labels expose implementation structure before researcher meaning

- **Location:** `ResearchShell.tsx:1126-1165`
- **Observed:** **Authority** and **Graph projection** are compact but require internal Petra knowledge. Snapshot revision and projection lag are distinct and important, yet their current labels do not explain that relationship.
- **Consequence:** researchers may misread a current authoritative snapshot as a confidence state or assume a lagging graph means the underlying research change is uncommitted.
- **Heuristics:** `NN-H01`, `NN-H02`, `NN-H06`.
- **Fix:** lead with **Research snapshot** and **Graph status**. Use plain status such as “Updating to snapshot 18,” with checkpoint and event details available on inspection.
- **Disposition:** validate wording against the live shell view contract, then fix in UX1.1.

#### `UX1.1-AUD-10` — Active-work copy does not identify the needed action

- **Location:** `ResearchShell.tsx:1167-1173`, `1325-1347`
- **Observed:** **1 work item requested** expands Petra, while the dock reports generic **Requested** status. The label does not say whether work is queued, running, awaiting input, or merely available to inspect.
- **Consequence:** researchers cannot predict what opening Petra will reveal or whether their intervention is required.
- **Heuristics:** `NN-H01`, `NN-H02`, `NN-H06`.
- **Fix:** derive the label from the actual work state, such as **Review requested work (1)** or **Work needs input (1)**. Preserve the WorkUnit identifier as secondary verification detail.
- **Disposition:** needs the final attention-work view-model distinction; track under `UX-REQ-001` if the current contract cannot supply it.

#### `UX1.1-AUD-11` — The shell opens with four competing regions despite the accepted main-first default

- **Location:** `ResearchShell.tsx:52-59`, `995-1000`; current rendered shell
- **Observed:** the Research map, main surface, Details, and Petra all open by default.
- **Consequence:** the researcher has no obvious primary task, and the interface appears denser and more operational than the accepted direction.
- **Heuristics:** `NN-H06`, `NN-H08`.
- **Fix:** keep the map visible on wide screens, open Details only from a real selection path, and collapse Petra to its dock by default while preserving attention state.
- **Disposition:** accepted in `UX1.1-DISC03`; fix in shell recomposition.

## Initial terminology ledger

| Canonical term | Product term | Meaning in UX1.1 | Do not use for | Authority | State |
| --- | --- | --- | --- | --- | --- |
| Project | Project | Durable research workspace and identity | Current route or browser session | D009 | accepted |
| ResearchQuestion | Research question | Active scientific question framing the workspace | Search query, assistant prompt, or Hypothesis | D009 | accepted |
| authoritative snapshot | Research snapshot | Versioned authoritative research state shown by the shell | Graph freshness, confidence, or working copy | D009 | proposed wording |
| projection freshness | Graph status | Whether the derived graph has reached the active research snapshot | Authority or scientific validity | D002/D009 | proposed wording |
| review mode | Review mode | One of `inspect`, `guide`, `delegate`, or `supervise`; selects governance defaults | Permission, layout preset, assistant persona, or custom policy | D005 | accepted correction |
| selected-object inspector | Details | Contextual surface for the selected object's identity, provenance, scope, status, relationships, history, impact, and actions | Settings, generic menu, or full graph | `UX1.1-DISC01` | accepted |
| WorkUnit | Work | Durable background or agentic work with explicit state | Stream, assistant message, or local loading state | D009/D013 | needs researcher validation |
| primary task-bounded graph | Focused graph | Graph view bounded by active object, task, depth, relations, snapshot, and projection state | Whole-corpus explorer or decorative network | `UX1.5-DISC01` | accepted |
| WorkVersion | Paper version | Exact scholarly version Petra acquired or read | Canonical Paper identity | D009 and graph model | proposed wording |
| SourceSpan | Source passage | Exact source location and text used as provenance | Entire paper, citation, or extracted Claim | graph model | proposed wording |
| proposal | Proposal | Candidate scientific structure not yet applied to authoritative state | Validated or trusted conclusion | D005/D006 | accepted |

## Shell interaction pattern register

| ID | Pattern | Current trigger and effect | Required control behavior | Audit state |
| --- | --- | --- | --- | --- |
| `UX1.1-IP01` | Switch primary research view | Activating Evidence or Graph changes local component state | URL and history identify the view; selection persists; focus moves only when needed; Back restores the prior view | major finding |
| `UX1.1-IP02` | Select an object and inspect it | Activating the evidence row opens Details for the fixture-selected Claim | One selection model across collections and views; Details resolves the same canonical ID; return focus is stable | major finding |
| `UX1.1-IP03` | Change Details section | Tabs switch Overview, Source, Relationships, and History | Standard tab keyboard behavior; section labels retain object context; selection persists | implemented and rendered at the 304px minimum; broader validation pending |
| `UX1.1-IP04` | Open selected relationship in graph | **Open in graph** changes the main view, closes Details, focuses main, and supplies bounded graph navigation and a text view | Route and browser history must capture the view; selected object and path must persist across modules | prototype implemented; route integration pending |
| `UX1.1-IP05` | Show or hide Details | Buttons add or remove the contextual panel | Explicit region name, selection preservation, focus restoration, keyboard and narrow-layout parity | partial |
| `UX1.1-IP06` | Show, hide, or dismiss Research map | Header, panel, Escape, and scrim controls change visibility by viewport | Stable Show/Hide language, focus return, drawer dismissal, inert background where required, selection preservation | terminology fix needed |
| `UX1.1-IP07` | Resize a pane | Pointer, touch, Arrow, Shift+Arrow, Home, End, and settings range change local width | Perceivable handle, semantic value, bounds, alternate settings control, saved presentation state, reset and zoom behavior | implemented; accepted minimum widths rendered |
| `UX1.1-IP08` | Expand or collapse Petra | An icon control toggles the Petra panel while preserving the requested-work indicator | Petra is collapsed by default outside the review fixture; accessible names include Petra; active work persists | shell presentation implemented; UX1.6 input preservation pending |
| `UX1.1-IP09` | Change workspace settings | Dialog controls apply and persist changes immediately | Copy states immediate application; Close returns focus; reset scope is explicit and recoverable; storage failure does not break the shell | moderate finding |
| `UX1.1-IP10` | Skip repetitive chrome | Skip link focuses the current main view | First keyboard stop when relevant; target has an informative name; focus remains visible | implemented, needs rendered validation |

## Required path registry for UX1.1 validation

| Path ID | Path | Required branches and evidence | Status |
| --- | --- | --- | --- |
| `UX1.1-P01` | Open project and orient | ordinary, no active question, stale snapshot, graph catching up, active work, offline | pending fixture matrix |
| `UX1.1-P02` | Move from map object to task view | mouse, keyboard, narrow drawer, unavailable route, replaced object | pending route implementation |
| `UX1.1-P03` | Select Claim and inspect Details | different source depths, missing object, selection changed elsewhere, close and restore | partial |
| `UX1.1-P04` | Move from Details relationship to focused graph and back | selection transfer, graph history, bounded controls, and textual equivalent are prototyped; copied production URL, stale state, and graph failure remain | partial |
| `UX1.1-P05` | Resize and restore workspace | pointer, keyboard, settings ranges, minimum widths, presets, and reset are prototyped; touch and browser zoom validation remain | partial |
| `UX1.1-P06` | Open work needing attention | requested work, posture, capability boundary, and activity sequence are presented; running, awaiting input, failure, completion, reconnect, and cancellation require UX1.6 discussion | partial presentation |
| `UX1.1-P07` | Change appearance and accessibility settings | light, dark, dimmed, high contrast, forced colors, reduced motion, reset, reopen | partial |
| `UX1.1-P08` | Recover from an invalid direct link | missing, unauthorized, replaced, stale snapshot, network unavailable | pending |

## What already works conceptually

- Details is correctly separated from the full focused graph.
- Selection is preserved when transferring from the compact relationship view to the graph fixture.
- Snapshot authority and graph freshness are modeled as separate facts.
- Pane sizes are presentation-only and support keyboard alternatives.
- The settings dialog distinguishes appearance, layout, editor, and accessibility concerns.
- Petra's message correctly states that an exact passage grounds the Claim while its scope remains incomplete and the Claim remains unapplied.

These strengths should survive the visual and writing rebuild; they do not close the findings above.

## Next audit checkpoint

The primitive gallery review must demonstrate corrected terminology and complete control states before the shell is recomposed. The next UX1.1 audit then evaluates the implemented route, navigation, selection, panel, work-attention, settings, adverse, and recovery paths against this registry.
