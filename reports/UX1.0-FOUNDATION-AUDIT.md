# UX1.0 Foundation Audit

- **Status:** inventory complete; `UX1.0-DISC01` and `UX1.0-DISC02` accepted
- **Date:** 2026-08-29
- **Branch:** `design/m1-ux`
- **Work item:** `UX1.0-W01`
- **Evidence item:** `UX1.0-EV04`
- **Scope:** current `apps/workbench/` routes, major components, tokens, fixtures, placeholders, implied capabilities, accessibility baseline, and design debt

This audit records the current workbench as implementation evidence. It does not treat existing code as an accepted information architecture or begin the broad redesign deferred until discussion.

## Classification vocabulary

| Classification | Meaning |
| --- | --- |
| Retain | Preserve the responsibility and implementation pattern; only routine corrections are expected. |
| Revise | Preserve the responsibility or route, but materially change its hierarchy, behavior, language, or styling. |
| Replace | The current surface cannot meet Petra's accepted scientific or interaction contract; preserve stable identity or routing where applicable while rebuilding the experience. |
| Remove | The element has no honest production role. It may remain only as clearly labeled comparison or conformance evidence. |

## Accepted visual direction

`UX1.0-DISC01` establishes the following boundary:

- the selected rock reference is the root-level `ChatGPT Image Aug 29, 2026, 04_21_35 PM.png` brand board;
- the wordmark is uppercase PETRA in Bebas Neue;
- Bebas Neue is wordmark-only;
- Inter is the product face for headings, controls, tables, and prose;
- monospace remains functional and limited to identifiers, metrics, provenance, and code;
- the tagline is omitted from the compact application header;
- `petra_brand_inspiration/petra_latest_design_reference.png` supplies visual character rather than screen architecture or scientific semantics.

The selected root image is a 1448 by 1086 raster brand board, not an isolated production mark. The current `petra_logo_inspiration.svg` and the inline `RockMark` are provisional vector approximations. A clean isolated mark, horizontal lockup, reversed mark, and small-scale assets remain `UX1.0-W07` work.

## Current implementation inventory

The workbench contains eight source/configuration files. Its product implementation is concentrated in:

- [`apps/workbench/src/router.tsx`](../apps/workbench/src/router.tsx): 716 lines containing loaders, route declarations, inline icons, the mark, all screen components, fixture-like content, and live transport behavior;
- [`apps/workbench/src/styles.css`](../apps/workbench/src/styles.css): 1,296 lines containing palette values, type roles, layout, component styling, graph styling, and three responsive ranges;
- [`apps/workbench/src/main.tsx`](../apps/workbench/src/main.tsx): React root and router provider;
- [`apps/workbench/vite.config.ts`](../apps/workbench/vite.config.ts): fixed design-workbench port `4311` and server proxy to `4310`.

There are no workbench component tests, interaction tests, accessibility tests, visual-regression tests, named view models, named fixture scenarios, or fixture-gallery routes.

### Route and screen audit

| Current route | Current surface | Classification | Reason | Target module |
| --- | --- | --- | --- | --- |
| `/` | New-inquiry `ResearchBrief` with question composer and graph/evidence/assistant transport demo | Revise | The honest early-project framing is useful, but the default hierarchy is graph-first and the transport demo dominates a surface that D009 defines as a living, object-centered Brief. | `UX1.1`, `UX1.2`, `UX1.6` |
| `/projects/:projectId` | Four-card `ProjectOverview` research map | Replace | The cards are addressable but behave as a small dashboard and omit active question, snapshot, selection, work, stable research-map groups, and the default Brief. | `UX1.1`, `UX1.2` |
| `/projects/:projectId/questions/:questionId` | Generic `ObjectPage` placeholder | Replace | The route preserves identity but has no question scope, revision, provenance, selection synchronization, or recovery state. | `UX1.1`, `UX1.2` |
| `/projects/:projectId/hypotheses/:hypothesisId` | Generic `ObjectPage` placeholder | Replace | The label is generic and the surface omits the Hypothesis descriptor, separate state families, standing, evidence frontier, alternatives, and obligations. | `UX1.1`, `UX1.2` |
| `/projects/:projectId/papers/:paperId` | Generic `ObjectPage` placeholder | Replace | It does not distinguish Work, WorkVersion, Artifact, SourceSpan, rights, or processing depth. | `UX1.3` |
| `/projects/:projectId/work/:workId` | Generic `ObjectPage` placeholder | Replace | The stable route is useful, but its generic placeholder has no canonical scholarly identity or version behavior. | `UX1.1`, `UX1.3` |
| `/projects/:projectId/evidence` | Empty `EvidencePreview` collection | Replace | It communicates the intended source-depth idea but has no Claim identity, exact spans, review state, evidence relations, or named adverse fixtures. | `UX1.3`, `UX1.4` |
| `/projects/:projectId/graph` | Static `GraphPreview` collection | Replace | The preview is an unrestricted decorative concept map rather than a task-bounded, snapshot-qualified graph with inspectable paths and a textual equivalent. | `UX1.5` |
| Router `errorElement` | Generic unavailable-object page | Revise | It provides a return path but merges missing, unauthorized, stale-snapshot, replaced-object, and failed states. | `UX1.1` |

Missing addressable surfaces include the Research Brief within project scope, Papers index, evidence inbox/review, selected-object inspector, persistent assistant/activity frame, Outputs/DraftArtifacts, and the UX1.0 fixture gallery. These are planned module work, not reasons to invent routes before their discussions.

### Major component audit

| Component or pattern | Classification | Retained value | Required change |
| --- | --- | --- | --- |
| React Router Data Mode and addressable object routes | Retain | Matches D009 and D014's stable-route boundary. | Add typed route states and module routes only as their contracts and discussions mature. |
| `loadHealth` shell loader | Revise | Provides a real operational signal. | Replace broad “Engine ready” language with the exact service/availability meaning and degraded/recovery states. |
| `Shell` sticky header and responsive rail | Replace | Sticky context and responsive navigation mechanics are useful. | Recompose as D009's context bar, research map, main surface, inspector, and assistant frame; preserve project, question, snapshot, selection, and active work. |
| Inline `RockMark` | Replace | Accessible brand wrapper and monochrome treatment are reusable. | Replace provisional geometry with a production asset derived from the selected mark and test it at app-icon scale. |
| `AppIcon` | Revise | Simple outline icons fit the visual direction. | Establish a consistent icon set, target sizes, selected treatment, and non-icon labels at constrained widths. |
| `ModeSwitch` | Remove | None in its present semantics. | “Guided/Agentic” and “Autonomy” conflict with the accepted governance modes. A later policy control must use `inspect`, `guide`, `delegate`, or `supervise` and show grants separately. |
| `GraphPreview` | Remove from production route | Useful as before-state comparison evidence. | Replace with task-bounded graph fixtures after `UX1.5` discussion; do not imply future Evidence objects or relations. |
| `EvidencePreview` | Remove from production route | Its reading-depth explanation is a useful language seed. | Move explanatory empty-state coverage into named fixtures and implement the Papers/evidence contracts in their modules. |
| `AssistantPanel` transport diagnostic | Remove from researcher surface | Demonstrates the real AG-UI path. | Keep protocol diagnostics in a development/conformance fixture. Product components must consume Petra hooks/view models, not enumerate raw event types. |
| Question composer | Revise | Preserves rough researcher wording and an early-project action. | Separate question framing from transport testing and make any proposed ResearchQuestion/subquestions explicit before mutation. |
| `CollectionPage` | Revise | Provides consistent route framing. | Replace generic framing with module-specific context, selection, state, and recovery behavior. |
| `RouteError` | Revise | Plain language and one recovery link. | Make the object, reason, last known revision, and safe recovery path explicit. |

## Token and visual-language inventory

The root CSS currently declares fourteen raw palette values, one rule color, three font stacks, and a local rock-cut override. It does not yet provide semantic roles for surfaces, text levels, borders, focus, selection, graph relations, authority, freshness, source depth, or work outcomes.

| Area | Current state | Finding |
| --- | --- | --- |
| Color | Brand-kit base and semantic colors are copied into raw variables. At least seventeen additional literal `rgb()` or hex treatments appear in component rules. | Revise into palette foundations plus semantic role tokens. Component CSS should not reconstruct transparency and contrast meaning locally. |
| Type | `--font-display` uses DIN/Arial/Avenir fallbacks and is applied to the brand, page titles, and section titles. `Inter` and `JetBrains Mono` are named but not bundled or loaded. | Replace per `UX1.0-DISC01`: Bebas Neue only for the wordmark, Inter for product type, and functional mono for technical content. Self-hosting or another delivery path needs a bounded implementation decision before dependencies or root package files change. |
| Spacing and sizing | Values are component-local; many labels are 7–10px and navigation targets are 38px. | Define spacing, control-size, target-size, and compact/comfortable density roles. Current microtype is too small to serve as the production density baseline. |
| Radius | Pills and circular glyphs are used alongside otherwise square editorial panels. | Define a restrained radius grammar so status chips do not become generic decorative pills. |
| Rule and elevation | Thin borders fit the inspiration, but each component creates its own rule and shadow. | Retain the editorial direction and normalize border/elevation roles. |
| Background | A 24px decorative grid covers the whole body and a dotted field covers the graph. | Reassess after shell application. The latest reference is calmer; graph structure should remain functional rather than ambient decoration. |

## Current state and fixture coverage

Current state is embedded directly in `router.tsx` rather than supplied through Petra-owned view models.

| Required pressure | Current coverage | Disposition |
| --- | --- | --- |
| Ordinary | Partial new-inquiry preview | Name and rebuild as `UX-FX01`; remove transport diagnostics from the ordinary product surface. |
| Empty | Graph and evidence empty messages | Retain the intent, but separate genuine emptiness from previews and unavailable contracts. |
| Loading/running | `RunStatus = running` with “Mapping…” | Replace with Petra's interaction/work grammar and visible objective, provenance, stop semantics, and layout stability. |
| Failed | One transport-error sentence | Add typed reason, retained partial state, recovery, replay safety, and distinction from failed scientific work. |
| Cached | Missing | Required fixture. |
| Stale/projection catching up | Missing | Required fixture, including `UX-FX09`. |
| Abstract-only/partial source depth | Mentioned as explanatory copy only | Required contract-shaped fixtures, including `UX-FX03`. |
| Dense | Missing | Required fixture and responsive/text-scale pressure. |
| Awaiting input, cancelled, blocked, limited, policy-blocked | Missing | Add only through shared state grammar and named view models. |
| Proposed, validated, applied, superseded, reverted | Missing | Add only through authority-aware fixtures and accepted ChangeSet paths. |

The live health loader and AG-UI transport run are not deterministic scientific fixtures. The static graph and evidence content has no canonical object identity, snapshot, origin, or named schema. A page-level “Interface preview · deterministic data” label is helpful but does not make individual scientific-looking objects contract-shaped.

## Placeholder and implied-capability audit

| Finding | Risk | Required disposition |
| --- | --- | --- |
| “Map question” invokes the interaction transport but does not create or map a ResearchQuestion. | The primary action implies scientific work that did not occur. | Remove from the production Brief until it invokes the correct typed path; retain a clearly named transport action in the fixture/conformance gallery. |
| “Guided/Agentic” changes explanatory copy but appears to change autonomy. | Users may infer a permission or governance change that the control does not make. | Remove; later governance UI follows D005 and shows modes separately from grants. |
| Graph tool chips (“Question scope,” “Labels on,” “Depth 1”) look interactive but are static spans. | Implied graph controls are enabled in appearance only. | Remove from production or implement as real controls in `UX1.5`. |
| Evidence and assistant tabs look interactive but are static spans. | Users cannot predict which controls work. | Replace with semantic tabs only when each panel exists; otherwise render plain section labels. |
| Rail and project cards navigate to generic placeholders. | Navigation implies completed scientific surfaces. | Hide unavailable destinations or identify them as fixture/development paths until their module is implemented. |
| The assistant renders raw AG-UI event type names. | A protocol diagnostic leaks into the scientific feature surface and couples UI meaning to transport events. | Move to conformance evidence; product assistant uses Petra-specific view models and hooks. |
| A running interaction has no stop, detach, reconnect, resume, or explicit durable cancellation path. | Users cannot distinguish connection control from WorkUnit control. | Address in the shared interaction grammar and `UX1.6`; do not add an ambiguous stop button locally. |
| Mobile CSS hides the engine-status text and leaves only a colored dot. | Availability becomes color-only at narrow width. | Preserve a textual or otherwise redundant compact status. |

## Accessibility baseline

### Useful seeds

- The brand link has an accessible name and decorative rock paths are hidden.
- Primary navigation links have accessible labels and expose their text tooltip on focus as well as hover.
- The graph is given an image role and an accessible summary.
- Status badges and run states contain text rather than relying solely on fill color.
- Responsive rules stack the three panels rather than forcing permanent horizontal overflow.

### Gaps

- There is no skip path from the header and rail to the active research surface.
- Focus styling covers links, buttons, and textareas, but no shared primitive or focus-restoration behavior exists.
- There is no `prefers-reduced-motion` treatment despite tooltip transitions and future streaming requirements.
- The graph has no navigable textual path equivalent.
- Many labels and metadata values are 7–10px, which is not an acceptable production text-scale baseline.
- The 38px rail targets and several compact controls require target-size review.
- Static spans visually imitate tabs and controls without semantic roles or keyboard behavior.
- The mobile engine state becomes color-only.
- No keyboard trace, text-scale result, contrast record, screen-reader review, or accessibility test exists.

## Design-debt register

Severity reflects potential scientific misunderstanding, authority confusion, lost work, or accessibility impact—not visual polish alone.

| ID | Severity | Debt | Scientific or product risk | Accessibility impact | Owner / resolution gate |
| --- | --- | --- | --- | --- | --- |
| `UX1.0-DEBT01` | Critical | Graph-first preview is the default project experience. | Encourages the graph and latest assistant state to become de facto orientation rather than the object-centered Brief. | Forces graph interpretation before a textual research orientation. | `UX1.1`, `UX1.2` / `G-PROTOTYPE` |
| `UX1.0-DEBT02` | Critical | Functional-looking placeholders and mismatched autonomy control appear enabled. | Implies unsupported capabilities and authority changes. | Static pseudo-controls fail semantic and keyboard expectations. | `UX1.0`, `UX1.1` / `G-PROTOTYPE` |
| `UX1.0-DEBT03` | High | Product components enumerate raw AG-UI event types. | Transport state can become accidental product and scientific semantics. | Stream changes may destabilize announcements and focus. | `UX1.6` / `G-CONTRACT` |
| `UX1.0-DEBT04` | High | No shared authority, freshness, outcome, source-depth, origin, or availability grammar exists in components. | Proposed, derived, stale, and authoritative science can drift visually between modules. | Non-color redundancy cannot be validated consistently. | `UX1.0-W08`, `UX1.0-W09` / `G-PROTOTYPE` |
| `UX1.0-DEBT05` | High | No named contract-shaped fixtures or adverse-state gallery exists. | Happy-path preview content can silently become a second scientific model. | Dense, failed, limited, and recovery behavior cannot be tested. | `UX1.0-W10` / `G-PROTOTYPE` |
| `UX1.0-DEBT06` | High | Tiny text, missing skip paths, absent reduced-motion rules, color-only mobile status, and no textual graph path remain. | Critical limitations or provenance may be missed. | Direct WCAG and task-completion risk. | `UX1.0-W09`, all modules / `G-VALIDATION` |
| `UX1.0-DEBT07` | Medium | Raw palette tokens and component-local visual values substitute for semantic roles. | Semantic meaning can drift as modules are added. | Focus and contrast behavior are difficult to validate centrally. | `UX1.0-W03`–`UX1.0-W06` / `G-PROTOTYPE` |
| `UX1.0-DEBT08` | Medium | Current mark and font delivery do not implement the accepted identity. | Brand recognition and typography vary by installed system fonts. | Font substitution can change wrapping, zoom behavior, and control sizing. | `UX1.0-W04`, `UX1.0-W07` / `G-PROTOTYPE` |
| `UX1.0-DEBT09` | Medium | Router and CSS files contain nearly the entire product surface. | Fixture, state, and module boundaries will be difficult to review and replace safely. | Shared behaviors may diverge or be omitted as copy-pasted panels grow. | `UX1.0-W06`, `UX1.0-W10` / `G-PROTOTYPE` |
| `UX1.0-DEBT10` | Medium | No frontend component, interaction, accessibility, or visual-regression tests exist. | Scientific-state and implied-capability regressions will be difficult to detect. | No repeatable accessibility evidence. | `UX1.0`, module evidence / `G-VALIDATION` |
| `UX1.0-DEBT11` | Low | “Engine ready” overstates a basic health response. | Researchers may infer models, workers, databases, or projections are usable when only the server is accepting. | Compact status needs an exact accessible label. | `UX1.1` / `G-SPEC` |

## Verification baseline

- Pinned toolchain confirmed: Node `24.20.0`, npm `11.19.0`.
- Existing `node_modules` is present; no install was performed.
- Workbench-only typecheck currently fails because the workspace package export for `@petra/adapters` points to absent `dist` declarations. The audit did not build or edit the read-only shared package to work around this. This is a baseline coordination/tooling condition, not evidence that the current workbench typechecks independently.
- No application, package, server, contract, or lockfile source was changed by the audit.

## Post-audit implementation delta — 2026-09-02

The audit above remains the before-state record. The accepted foundation slice
is documented in
[`UX1.0-FOUNDATION-SLICE.md`](UX1.0-FOUNDATION-SLICE.md) and changes the debt
state as follows:

- `UX1.0-DEBT04` is addressed at the shared-component boundary; consuming
  modules still need to replace their legacy local treatments.
- `UX1.0-DEBT05` is resolved by the named, addressable ordinary, empty,
  loading, cached, running, failed, stale, abstract-only, and dense fixtures.
- `UX1.0-DEBT06` is reduced for the gallery through a skip path, visible focus,
  reduced motion, non-color labels, and narrow reflow; the legacy shell gaps
  remain assigned to their consuming modules.
- `UX1.0-DEBT07` is reduced by semantic foundation tokens and a compatibility
  layer; legacy raw component values remain visible debt.
- `UX1.0-DEBT08` is resolved by self-hosted type delivery and the accepted
  exact-reference production mark and lockup under `UX1.0-W07`.
- `UX1.0-DEBT10` is reduced by brand, state, fixture, and shared-primitive tests
  plus recorded rendered and accessibility checks; full automated
  accessibility and visual regression remain open.

The later `UX1.0-DISC03` slice further reduces `UX1.0-DEBT06` and
`UX1.0-DEBT07` with shared control-state behavior, explicit unavailable-action
language, keyboard tabs, modal focus restoration, 390px reflow, 200%
zoom-equivalent reflow, and 200% text-only scaling. Its evidence is recorded in
[`UX1.0-PRIMITIVES-SLICE.md`](UX1.0-PRIMITIVES-SLICE.md).

After building the existing server workspace declarations without editing
server source, workbench typecheck, lint, tests, and production build pass on
the pinned Node 24 toolchain.

The `UX1.1-DISC02` shell recalibration applies the next accepted visual-system
delta: Primer-inspired component roles, Pajamas-inspired application chrome, a
one-divider pane budget, Stone, Graphite, System, High Contrast, and forced
colors treatments, shared IDE syntax roles, local presentation preferences,
and pointer, touch, keyboard, and settings-based pane sizing. This reduces
`UX1.0-DEBT06`, `UX1.0-DEBT07`, `UX1.0-DEBT09`, and `UX1.0-DEBT10` at the
fixture-backed shell boundary; native assistive-technology and cross-browser
validation remain open.

## Recommended next bounded decisions

The audit supports this order for the remaining UX1.0 discussion:

1. shared semantic state grammar and redundant encodings;
2. typography, density, spacing, focus, and control-state roles;
3. a small primitive set required by the shell and fixture gallery;
4. named fixture/view-model boundaries and gallery routing;
5. production mark extraction and small-scale tests;
6. immediate application of the accepted foundation to the `UX1.1` shell after its own discussion.

No module-specific screen redesign should begin until its information hierarchy and consequential interactions complete the discussion-first loop.
