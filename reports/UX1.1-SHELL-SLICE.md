# UX1.1 Research Shell Slice

- **Status:** second visual-calibration review candidate; fixture-backed shell slice implemented
- **Date:** 2026-09-02
- **Branch:** `design/m1-ux`
- **Decisions:** `UX1.1-DISC01`, `UX1.1-DISC02`
- **Fixture:** `UX1.1-FX01`
- **Route:** `/__fixtures/shell`

This slice implements the agreed main-first shell in an isolated fixture route.
It does not replace Petra's current production routes. The first line-heavy
render remains rejected visual calibration. This second candidate keeps the
same information model while applying the accepted Primer component grammar,
Pajamas application structure, Petra visual semantics, theme system, and
accessible pane behavior. Evidence and Graph content remains deliberately
bounded module scaffolding rather than an early implementation of
`UX1.2`–`UX1.6`.

## Review target

The primary review is:

- whether soft surface shifts, compact navigation states, and one divider per
  pane boundary now read as a scalable application rather than a presentation
  slide;
- whether the context bar keeps the Project, question, authority revision,
  projection lag, review posture, and requested work legible without reading
  like an operations dashboard;
- whether the Evidence task receives enough space relative to the Research map,
  Details, and Petra;
- whether **Details** reads as a useful selected-object surface rather than a
  menu or a second main workspace;
- whether its bounded relationship view is clearly subordinate to the dedicated
  Graph view;
- whether Petra Stone and Petra Graphite are comfortable for sustained use,
  with High Contrast remaining deliberately stronger;
- whether the settings surface makes pane sizing, layout presets, editor
  readability, and accessibility discoverable without implying scientific
  state changes;
- whether the narrow order—context, main task, Details, then Petra—still feels
  oriented.

Full scientific module workflows, graph controls, assistant conversation, and
the CodeMirror dependency are outside this review boundary.

## Production-candidate boundary

The fixture uses the same workbench component and view-model boundary intended
for later production integration:

- [`ResearchShell.tsx`](../apps/workbench/src/shell/ResearchShell.tsx) owns
  coordinated local view behavior and responsive composition;
- [`model.ts`](../apps/workbench/src/shell/model.ts) defines the Petra-owned shell
  view model without embedding query or persistence behavior;
- [`shell.ts`](../apps/workbench/src/fixtures/shell.ts) supplies the named,
  deterministic scenario and records every mapped, provisional, or
  presentation-only field;
- [`ShellGallery.tsx`](../apps/workbench/src/fixtures/ShellGallery.tsx) exposes the
  review route and contract mapping outside the production route tree.

Existing Project, Claim, Assertion, WorkVersion, SourceSpan,
ProjectionCheckpoint, and WorkUnit contracts supply the mapped data.
ResearchQuestion and Hypothesis read shapes, plus the snapshot-consistent
composite shell query, remain provisional under `UX-REQ-001`. Selection, active
view, theme, pane widths, layout preset, editor preferences, drawer visibility,
and panel collapse remain local presentation state and do not imitate
scientific mutations. Preferences are stored locally under a versioned browser
key; account synchronization would require a later explicit contract.

The workbench adds Primer primitives and Octicons behind Petra-owned tokens and
components, plus Cytoscape.js behind the renderer-neutral focused-graph model.
Pajamas remains structural inspiration rather than a runtime dependency.
CodeMirror and Reagraph are not installed. These dependencies do not own
Petra's domain state, authority, or interaction contracts.

### UX-REQ-001

The roadmap now records the proposed read-only `ProjectShellView` handoff. Its
smallest viable response contains Project identity and revision, the active
question reference and descriptor, authoritative revision, projection
checkpoint and freshness, review posture, attention WorkUnit references, and
an optional selected-object reference. It creates no command, persistence, or
scientific authority. The implementation track owns the request; its status is
`proposed`, so this slice does not claim `G-CONTRACT` or production integration.

## UX1.1-EV01 — route and state map

| State | Researcher-visible result | Preserved invariant |
| --- | --- | --- |
| Initial selected Claim | Evidence is the main view; Research map, Details, and Petra share one Claim context. | `claim_01ARZ3NDEKTSV4RRFFQ69G5FBB@1` remains the selected object. |
| Details · Relationships | Four contract-mapped objects form a bounded Source-to-Claim provenance view with two text paths. | The compact view does not invent a Claim-to-Hypothesis edge. |
| Open in graph | The dedicated main surface becomes **Focused graph** and Details closes. | The selected Claim and text view persist; focus moves to the main view. |
| Details closed and reopened | Main gains space; **Show details** restores the same object surface. | Closing is presentation-only and does not clear selection. |
| Petra collapsed | The dock becomes an attention marker with the requested-work count. | The main selection and requested WorkUnit remain present. |
| Research map collapsed | Main gains the map width and the context bar exposes **Research map** to restore it. | The active question and selected object remain visible. |
| Pane resized | Pointer, touch, keyboard, or Settings changes the named presentation width within its minimum and maximum. | Selection, active view, scientific authority, and WorkUnit state do not change. |
| Theme changed | System, Petra Stone, Petra Graphite, and High Contrast recolor semantic roles together. | Text, symbol, and pattern encodings remain; theme is presentation-only. |
| Layout preset changed | Focus, Review, Graph, and Collaborate update pane widths; a manual resize becomes Custom. | No pane preference becomes project or scientific state. |
| Narrow layout | Research map becomes a drawer; the main surface precedes Details and Petra. | Scientific context, selection, and material shell actions remain available. |

Only Evidence and Graph are functional in this shell slice. Brief, Papers, and
Experiments appear as non-interactive **Module pending** status text with an
explicit reason; they are not enabled placeholder controls.

## UX1.1-EV02 — rendered evidence

- [Petra Stone selected-Claim shell at 1440px](ux1.1/screenshots/shell-recalibrated-stone-1440.png)
- [Petra Graphite selected-Claim shell at 1440px](ux1.1/screenshots/shell-recalibrated-graphite-1440.png)
- [High Contrast selected-Claim shell at 1440px](ux1.1/screenshots/shell-recalibrated-contrast-1440.png)
- [theme settings in Petra Graphite](ux1.1/screenshots/shell-settings-graphite-1440.png)
- [IDE syntax settings and token preview](ux1.1/screenshots/shell-settings-editor-graphite-1440.png)
- [layout presets and panel-width controls](ux1.1/screenshots/shell-settings-layout-1440.png)
- [keyboard-focused Research map divider](ux1.1/screenshots/shell-resizer-focus-1440.png)
- [Details relationship view at 1440px](ux1.1/screenshots/shell-recalibrated-relationships-1440.png)
- [selection transferred to the recalibrated Graph surface](ux1.1/screenshots/shell-recalibrated-graph-1440.png)
- [sequential shell at 390px](ux1.1/screenshots/shell-recalibrated-390.png)
- [Research map drawer at 390px](ux1.1/screenshots/shell-recalibrated-map-390.png)
- [320-CSS-pixel reflow equivalent to 400% zoom on a 1280px display](ux1.1/screenshots/shell-reflow-320.png)

In the default Review preset at 1440px, the Research map measured 216px, the
coordinated main region 932px, Details 376px within Main, and Petra 272px. The
document reported zero horizontal overflow. At 390px the document, Main, and
sequential Details each measured 390px with zero page-level overflow. At 320
CSS pixels, the document, Main, and Details each measured 320px with zero page
overflow, covering the WCAG reflow target equivalent to 400% zoom on a 1280px
display. Context and view strips retain intentional local horizontal scrolling
instead of widening the page.

## UX1.1-EV03 — interaction and accessibility evidence

| Check | Result |
| --- | --- |
| Stable identity | The exact selected Claim appears in Evidence, Details, Graph transfer, and Petra context. Collapsing Petra leaves the Claim in the main view and preserves the requested-work count. |
| Details focus | Closing Details moves focus to **Show details**. Reopening moves focus to the **Details** heading, which is a programmatic focus destination. |
| Graph transfer | **Open in graph** closes Details, retains the Claim, opens the focused Cytoscape view, and moves focus to the main Graph region. |
| Narrow map focus | The closed off-canvas map is `inert` and `aria-hidden`. Opening it removes both states, adds a dismissible scrim, and moves focus to **Close**. Closing it, including with Escape, restores the hidden/inert state and returns focus to **Research map**. |
| Skip path | Focusing the first skip link reveals it; activating it moves focus to the current main research view. |
| Semantics | Context precedes the main surface; main, Details, and Petra retain source order. Research views, Research map, and Petra activity have distinct labels. |
| Pane separator semantics | Research map, Details, and Petra use focusable vertical separators with names, controlled-region references, pixel value text, minimums, maximums, and current values. Arrow changes by 8px, Shift + Arrow by 32px, Home selects minimum, and End selects maximum. |
| Keyboard resize trace | ArrowRight changed the Research map from 216px to 224px while focus remained on **Resize Research map**. |
| Settings resize trace | The Research map range changed the live pane to 280px and moved the preset state to Custom. |
| Theme and preference trace | Stone, Graphite, and High Contrast rendered without page overflow. Theme, layout, editor, motion, and panel-collapse values persist under a local versioned preference key only. |
| Contrast | Tested Stone and Graphite primary, secondary, tertiary, link, positive, information, caution, danger, and Hypothesis text/surface pairs range from 4.67:1 to 15.76:1; all clear the WCAG AA normal-text threshold. High Contrast uses stronger black, white, and system-focus roles. |
| IDE syntax | A shared semantic token preview covers keyword, function/type, string, property, operator, variable, and comment roles; JetBrains Mono with documented system fallbacks keeps ligatures off by default. |
| Non-visual graph equivalent | The focused graph supplies a keyboard node picker, labeled controls, an inspector, and an ordered text view of every visible relationship. |
| Reflow | 390px and 320-CSS-pixel checks produce no document-level horizontal overflow. |
| Reduced motion | Both `prefers-reduced-motion: reduce` and the explicit local preference reduce the shared motion token to `0ms`. |
| Forced colors | The shell maps surfaces, text, focus, dividers, actions, and semantic tones to system colors under `forced-colors: active`; state remains redundantly labeled. |

The browser trace complements component tests; integrated screen-reader,
cross-browser, streaming-update, and full traversal tests remain open under
`UX1.1-W10` and the final validation gate.

## UX1.1-EV04 — capability and authority audit

- The Research map is explicitly a hierarchy preview, not fake navigation.
- Brief, Papers, and Experiments are labeled module-pending status, not links or
  buttons.
- The bounded relationship diagram identifies its task boundary, supplies a
  text equivalent, and links to the focused Graph surface.
- The Graph surface now implements the accepted `UX1.5-DISC01` prototype subset:
  a renderer-neutral model, Cytoscape canvas, bounded depth and relations,
  Neighborhood, Disagreement, and Provenance layouts, selection history,
  inspection, and textual parity.
- Petra exposes selected context, review posture, a capability boundary, one
  requested WorkUnit, and its activity sequence but no fake composer, command,
  streaming response, approval, cancellation, or mutation path.
- The selected Claim is labeled **Proposal**, its extraction origin and
  full-text depth remain visible, and the fixture explicitly states that it has
  not been applied to the trusted graph.
- Projection freshness is separate from Project authority: Project revision 18
  is authoritative while Graph revision 17 is catching up by one record. The
  projection revision and detail are included in the marker's accessible and
  hover description.
- The fixture's contract disclosure distinguishes mapped runtime state,
  provisional composite reads, and local presentation state.
- Theme, pane width, layout preset, editor readability, and reduced-motion
  settings are explicitly described as presentation-only. They cannot issue a
  command or change scientific authority.

## Automated verification

The pinned Node 24 workbench checks for the corrected shell and focused graph
report:

- `npm test --workspace @petra/workbench`: 6 files, 33 tests passed;
- `npm run typecheck --workspace @petra/workbench`: passed;
- scoped ESLint across the touched workbench TypeScript and TSX: passed;
- Prettier check for the touched shell TypeScript and CSS: passed;
- `git diff --check` for the roadmap and report Markdown: passed;
- `npm run build --workspace @petra/workbench`: passed.

No production shell route, root package manifest, server source, shared
contract, core, adapter, persistence, worker, or infrastructure source was
changed for this UX1.1 slice. The workbench manifest and root lockfile record
the coordinated Primer and Cytoscape dependencies described above. The two
user-owned untracked reference files were left untouched.

## Open work

This slice advances `UX1.1-W01`–`W07` and `W09`–`W12`; it does not complete the
module. URL-addressable loading, missing, unauthorized, stale-snapshot, and
replaced-object states remain planned under `UX1.1-W08`. The shell fixture now
contains explicit function coverage and shows the agent presentation subset,
while the full agent interaction paths remain governed by `UX1.6`. Unsent-input
preservation, stable focus during streamed updates, real cross-route selection,
live-provider integration, native screen-reader testing, and cross-browser
pointer/touch validation remain open. No UX1.1 acceptance criterion is closed
solely by this review candidate.
