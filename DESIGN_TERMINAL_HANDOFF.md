# Petra Design Terminal Handoff

Worktree: `/Users/felipe.casadei/vscode/graphRAG/petra-design`
Branch: `design/m1-ux`
Mission: complete and freeze Petra's entire use-agnostic UX design brief, then stand up the independent reference UX against synthetic conformance scenarios before producing any contextual demo

## Start here

1. Confirm the current directory is the design worktree and the branch is `design/m1-ux`.
2. Activate Petra's pinned Node 24.20.0 toolchain.
3. Install the worktree's dependencies with `npm ci` if `node_modules` is absent.
4. Read, in order:
   - `PETRA.md`;
   - `reports/PETRA-UX-DESIGN-BRIEF.md`;
   - `reports/UX-FLOW-ARCHITECTURE.md`;
   - `reports/UX-BACKEND-HANDOFF.md`;
   - `design_implementation_roadmap.md`;
   - `decisions/D009-object-centered-research-workspace.md`;
   - `decisions/D006-petra-language-and-reference-contract.md`;
   - `decisions/D005-trusted-graph-review-and-direct-editing.md`;
   - `decisions/D013-ag-ui-sdk-interaction-boundary.md`;
   - `petra_brand_inspiration/README.md` and its referenced assets;
   - the current `apps/workbench/` implementation.
5. Review the completed DB01–DB18 product brief and continue from the pending
   `UX-DESIGN-FREEZE-01` decision below. Do not resume production-surface
   implementation or create a contextual demo before that explicit freeze.

## Working posture

Treat this as a complete product-design track followed by a production frontend track. Explore alternatives when a decision is genuinely open, recommend a direction, and record the accepted result at full specification depth. Complete every section in `reports/PETRA-UX-DESIGN-BRIEF.md` and obtain explicit design-freeze acceptance before implementing new product surfaces.

During product-brief work, proceed module by module:

1. state the project-author task and why the module matters;
2. identify profile-independent roles, profile-owned objects, and authority boundaries;
3. propose the information hierarchy and material interactions;
4. identify ordinary, dense, empty, limited, running, stale, failed, and recovery states that apply;
5. discuss the few choices that would materially change the experience;
6. obtain the user's direction;
7. specify responsive blueprints, interaction paths, copy roles, accessibility, recovery, backend needs, and acceptance criteria;
8. audit the paper design and advance to the next brief section without implementing a new product surface.

After the complete brief freezes, implement the entire Petra reference UX against synthetic, contract-shaped conformance scenarios that do not copy or depend on contextual demo data. Only after that product stands independently may separate efforts integrate the selected scientific and controlled-writing contexts.

Routine specification decisions do not require a new discussion. Pause when a choice changes domain interpretation, authority cues, navigation, action consequences, cross-module behavior, or Petra's language and visual identity.

## Ownership boundary

The design worktree primarily owns:

- `apps/workbench/` client code, routes, styles, frontend fixtures, and frontend tests;
- design evidence and design-specific reports;
- `design_implementation_roadmap.md` status and discussion records;
- accepted production visual assets derived from the inspiration kit.

Treat these as read-only unless the user coordinates a handoff:

- `apps/server/`;
- `packages/contracts/`, `packages/core/`, `packages/adapters/`, and `packages/postgres/`;
- `workers/`, `infra/`, and persistence/projection code;
- accepted decisions and `implementation_roadmap.md`.

Root package files and `package-lock.json` are shared hotspots. Discuss a new frontend dependency before changing them. Prefer the existing stack and a route-based fixture gallery until evidence establishes a need for another tool.

## Contract gaps

Do not invent domain or authoritative state in a blueprint or React component. When a required query, command, event, profile, or view-model field is missing:

1. reproduce the need with a named design scenario during brief work or a synthetic conformance fixture after design freeze;
2. create a `UX-REQ-NNN` record as specified in the design roadmap;
3. specify an explicitly provisional contract-shaped boundary when safe;
4. wait for a coordinated backend handoff before claiming live integration.

AG-UI remains behind `PetraInteractionClient` and Petra-specific hooks. Feature components do not parse raw AG-UI events.

## Coordination with the implementation worktree

- Commit coherent design work on `design/m1-ux`.
- Do not edit a shared hotspot while the implementation terminal is editing it.
- Synchronize from `main` only at an explicit checkpoint and with a clean design worktree.
- Merge or cherry-pick reviewed design changes into `main`; never copy changed files between worktrees as a substitute for Git.
- If both terminals run development servers, agree on separate ports or run only one server pair at a time.
- Preserve user changes and avoid destructive resets or cleanup commands.

## Current conversation

`DB10` is specified and paper-audited. The user accepted its semantic-depth and
expansion model on 2026-09-06 after the synthetic H4 evidence example
(`UX1.5-DISC03`). The following direction is accepted:

- the Graph is an optional, task-bounded relationship workspace rather than a
  corpus-wide explorer or graph-entry form;
- contextual entry opens the exact relationship question and preserves its
  originating object, task, snapshot, selection, and return path;
- direct Graph entry begins from a recent or saved relationship question, a
  selected object, or a natural-language relationship question that a named
  model role translates into inspectable bounded scope;
- the three semantic layers are **Current**, **Working changes**, and
  **Historical**. **Current** is the default; contextual entry from conversation,
  a candidate, or Review may include the relevant non-authoritative **Working
  changes**; **Historical** is an explicit non-editing mode with **Return to
  current**;
- projection is representation freshness, not a fourth semantic layer. A lagging
  graph says that the authoritative change already applied and provides an
  authoritative non-graph route while the projection catches up;
- Graph controls and the textual peer expose layer, scope, hidden working-change
  counts, snapshot, and projection position. Layout, selection, dragging,
  filtering, and expansion never carry authority;
- before/after comparison uses a dedicated comparison presentation rather than
  translucent overlapping state;
- 2D and textual parity remain primary, Cytoscape.js remains the 2D candidate,
  and Reagraph remains optional only when a named third dimension improves
  comprehension;
- depth means the relationship context needed to answer the question. Named
  profile-valid actions lead; Scope exposes exact types, directions, hop limits,
  layers, snapshot, time, and omissions;
- contrary and qualifying material remains visible in initial summaries; counts
  distinguish units, overlap, grouping/filtering, partial results, and unknowns;
- expansion reveals recorded relationships and preserves focus, selection, and
  snapshot. New research, validation, or assessment uses bounded Work;
- selection opens exact Details; paths retain every relationship's meaning,
  origin, basis, layer, and limitations. Dependency links do not establish
  assessed consequences.

DB10 now specifies selection/path inspection, task layouts and dedicated
comparison, density/grouping, direct correction through DB09, temporal behavior,
ten-state view history, local saved questions, adverse states, responsive/textual
parity, language, backend needs, acceptance criteria, and the paper audit. The
earlier DB06 ghosted-reversal wording and roadmap's renderer-authority wording
were aligned with the accepted direction.

`DB10-P01`–`P08` are the interaction paths and `DB10-A01`–`A04` the paper
findings. `UX-REQ-013` requests the missing bounded relationship-view query;
architecture owns its disposition. `UX-FX24`/`UX-FX25` specify post-freeze paired
and adverse conformance scenarios. No fixture, query, renderer, backend contract,
or product surface was implemented. Paper completion is not runtime validation.

The user accepted DB11's task overview and meaningful-stage presentation on
2026-09-06 as `UX1.6-DISC02`. The subsequent discussion accepted direct steering
and contextual branch advice as `UX1.6-DISC03`:

- a clear instruction acts through the supported operational command within
  existing authority and limits, with a visible acknowledgment of interpreted
  scope, affected stages, reuse, and effective timing;
- ask again only for unresolved consequential meaning or additional authority,
  not merely because a clear instruction changes the plan;
- actual prerequisites and control constraints remain distinct from contextual
  **Recommended next** advice. The recommendation explains its benefit using
  the current objective, dependency paths, known limits, and material uncertainty;
- another eligible branch may be chosen without an override ceremony, warning
  status, repeated nudges, or an automatic reset to the recommended order. A
  valid alternate choice need not harm the overall Project;
- viewing a branch does not schedule it. **Work on this next** records task-scoped
  priority without implicitly cancelling other work or changing global policy;
- preserve shared dependency identity, exact consumed inputs and prior results;
  validate reuse and state what happens to affected running stages at supported
  instruction, cancellation, checkpoint, or atomic completion boundaries; and
- narrowed-task completion names its actual scope, while Work success, usable
  output, and domain application remain separate.

The earlier pending rule requiring another preview/confirmation for every
material plan change is superseded by this direction. Do not revive that blanket
confirmation rule. Recommendations remain advisory even when prominently placed;
a model preference or inferred domain dependency cannot create a runtime gate.

The user clarified the intended branches as **parallel Project lines of inquiry**
on 2026-09-06 (`UX1.6-DISC04`), going beyond Hypotheses while allowing a
Hypothesis to anchor a line. This corrects the earlier emphasis on execution
branches; those Work control rules remain valid within their narrower scope.

- A line concerns what the author is trying to understand: criteria, methods,
  alternatives, interpretation, source disagreement, or another profile-valid
  question. It has recognizable purpose, basis, uncertainty, and history.
- Lines can share sources, assumptions, findings, and tasks. A line may have zero
  or many Work tasks over time, and a result can inform several lines. A completed
  or cancelled task does not silently resolve or abandon its inquiry.
- Petra recommends which inquiry could be useful next in the current Project
  context. Exploring alternatives before clarifying criteria can itself reveal
  useful criteria; the recommendation must allow that valid choice without
  warning or repeated nudges.
- Selecting an inquiry opens its basis and conversation context. It does not
  schedule Work, cancel other tasks, accept findings, or replace the governing
  Project objective. Explicit execution requests retain DB06/DB11 semantics.
- Existing Brief, Project map, Details, Petra, Graph, Work, Review, and History
  carry the context. **Line of inquiry** is a product role whose canonical
  profile mapping remains proposed, not a mandated new universal schema.

DB11 now includes full task/stage and dependency hierarchy, direct steering,
progress/input/resource/result meaning, lifecycle/recovery states, responsive and
textual parity, inquiry context, language, eleven interaction paths
(`DB11-P01`–`P11`), seven paper findings (`DB11-A01`–`A07`), acceptance criteria,
and post-freeze scenarios `UX-FX26`–`UX-FX28`.
`UX-REQ-014` is the proposed Work read composition;
`UX-REQ-015` is the proposed operational steering/branch-priority transition.
`UX-REQ-016` requests profile-valid inquiry mapping and exact Work/result links.
Current WorkUnit, manifests, retry/cancellation, and interaction records remain
the foundation. Checkpointed does not mean paused/resumable, terminal completed
may encode failure, and generic Pause/resume/cascade operations are not invented.

DB11 closes at `G-SPEC`; contract, implementation, integration, and participant
validation remain separate. The author can still refine the design before the
explicit whole-product freeze.

The user accepted DB12's **document-first Composition workspace** on 2026-09-06
as `UX1.7-DISC01`: the document is primary; Petra works in explicit passage,
section, or whole-artifact context; sources, related inquiries, findings, and
revision comparisons open when needed. Author edits and source ancestry survive.

The user then accepted marked working-copy export with unresolved findings on
2026-09-07 as `UX1.7-DISC02` and directed the design work to continue. Record
this as accepted; do not ask for the same export decision again.

- The copy binds exact chosen working/saved/historical content and selected
  scope. Unsaved capture requires a supported exact operation and cannot claim
  a durable Project save without acknowledgment. Newer edits remain separate.
- Relevant findings, limitations, and unknown assessment coverage travel with
  copied/downloaded content or a delivered bundle. Structured formats retain
  valid syntax; in-app notifications alone do not satisfy status carriage.
- Clear authorized export does not need another confirmation because checks
  remain open. Actual access, integrity, included content, format, and supported
  status-carriage requirements still apply.
- Export neither promotes the document nor changes support-reuse rules.
  Source/inquiry references do not imply inclusion of all source bytes, private
  conversation, or excluded context.
- Report exact generated members and observable delivery. Download initiation
  does not prove a saved file; clipboard acknowledgment does not prove a paste.
  Retry retains exact outputs, partial outcomes remain visible, and cancellation
  cannot recall bytes already delivered.

DB12 now specifies collection/detail entry, responsive/dense layout, planning,
continuous authoring, exact proposal and assessment binding, source/inquiry
context, protected ancestry, rendering, working-copy export, recovery, language,
and accessibility. Eleven paths (`DB12-P01`–`P11`) and seven paper findings
(`DB12-A01`–`A07`) cover the specification. `UX-FX29`–`UX-FX31` describe
post-freeze scenarios. DB12 closes at `G-SPEC`; runtime, integration, performance,
accessibility, and participant validation remain separate gates.

The contract audit found that the existing DraftRevisionEngine requires current
provenance and exact non-empty span replacements. It does not implement general
blank/structural authoring or successive editing while support is stale.
`UX-REQ-017` requests document workspace reads; `UX-REQ-018` requests durable
working-copy edits, exact saves, proposal reconciliation, and assessment binding.
`UX-REQ-019` requests exact export capture, scoped status, eligibility, output
composition, and delivery/recovery. All three runtime shapes remain proposed.
Existing renderer citation warnings and internal artifact registration are not
the complete working-copy export contract. Do not weaken scientific reuse rules
or claim an editor/export path is implemented from these design records.

The user accepted DB13's personal-preferences-first organization on 2026-09-07
as `UX1.1-DISC06`: Appearance, Layout, Editor, and Accessibility lead; Project
controls remain clearly labelled and discoverable with technical detail on demand.

- Personal preferences apply on this device with effective-value/system-override,
  session-only/storage-failure, group/all reset, and scoped recovery behavior.
  They cannot change Project meaning, policy, permissions, routing, or Work.
- Project controls bind one exact Project and summarize effective privacy/data,
  capability, model/routing, budget, and Review rules. A Settings selector changes
  the inspection target, not the active workspace or running Work.
- Show technical model details changes disclosure only. Accountable role, origin,
  fallback, and material provider/egress consequences remain visible. Petra has
  no ambient preferred-model picker or global model score.
- Editable Project controls use their owning typed operations with exact
  before/after scope, authority, prospective timing, stale/conflict recovery, and
  History. There is no generic settings mutation; unsupported controls are read-only.
- Theme/layout/editor/accessibility changes and resets preserve selection, unsent
  input, drafts, active Work access, and platform accessibility requirements.

DB13 contains eleven interaction paths (`DB13-P01`–`P11`) and seven findings
(`DB13-A01`–`A07`) with complete paper coverage. `UX-FX32`/`UX-FX33` are
post-freeze scenarios. `UX-REQ-020` requests effective Project-control reads and
typed transition mapping; it remains proposed. DB13 closes at `G-SPEC`; no live
policy, local-storage, accessibility, or participant evidence is claimed.

The user accepted DB14's one-Petra-grammar direction on 2026-09-07 as
`UX1.0-DISC07`.

- System, Stone, Graphite, High Contrast, forced colors, typography, density,
  components, motion, responsive behavior, and interaction/authority cues remain
  Petra-wide. A Project profile is not a theme or reskin.
- Blue remains interaction, focus, and current selection. Petra amber remains
  brand and bounded proposal/review attention. Operational outcome, authority,
  freshness, origin, limitation, and profile relation meaning stay separate.
- Registered profiles may supply exact object/relation labels, audited glyph
  references, finite line/shape patterns, optional profile-semantic tone roles,
  legends, and text alternatives. They cannot supply raw colors, CSS, layout,
  motion, arbitrary assets/code, or shared control/state overrides.
- **Supports** and **Contradicts**, like profile-valid continuity or dependency
  relations, do not inherit Petra's success and error meanings. Selection and
  approval remain independently visible.
- Missing, colliding, replaced, or unsupported descriptors fall back to an exact
  profile label and generic family without hiding content or failing the Project.

DB14 contains eleven interaction paths (`DB14-P01`–`P11`) and seven findings
(`DB14-A01`–`A07`) with complete paper coverage. `UX-FX34`/`UX-FX35` are
post-freeze scenarios. DB14 creates no new backend request; it sharpens proposed
`UX-REQ-004` with versioned bounded presentation descriptors and safe fallback.
DB14 closes at `G-SPEC`; no design-system implementation, final-token contrast,
profile-registry, accessibility, performance, visual-regression, or participant
evidence is claimed.

The user clarified on 2026-09-07 that scientific research and controlled writing
are minimum conformance examples, not an exhaustive profile catalogue. Petra may
admit many other versioned taxonomies when their objectives, objects, relations,
basis, validators, tools, task families, outputs, terminology, and supported
places map honestly to Petra's governed Work, Review, approval, provenance,
revision, recovery, and History contracts. A profile may omit inapplicable domain
flows. It cannot redefine permission or authority through taxonomy. This sharpens
`UX1.0-DISC05`, DB14, UX-FX34, and `UX-REQ-004`; it does not reopen DB14's shared
visual grammar.

The user accepted DB15's one-communication-contract/profile-owned-discourse
boundary on 2026-09-07 as `UX1.0-DISC08`.

- Petra owns candor, attribution, force calibration, contextual depth, shared
  communicative acts, action/control terms, status, authority, confirmation,
  error, correction, and recovery obligations.
- A versioned Project profile owns accurate domain terms, reference grammar,
  relation/force vocabulary, units, roles, validators, action objects, locale
  coverage, and functional reasoning or document conventions. It may shape the
  response form for its work but cannot create a decorative assistant persona or
  rename a shared consequence.
- Scientific and controlled-writing profiles are minimum conformance examples.
  At least one unrelated third taxonomy tests extensibility; profile admission
  remains based on fit with Petra's shared governed-work functions.
- Contextual recommendations identify the useful branch, current objective,
  basis/dependencies, expected information gain or rework, limits, and eligible
  alternatives. Another valid line of inquiry remains a legitimate choice without
  override ceremony, warning language, or repeated persuasion. Real execution or
  conclusion prerequisites remain explicit.
- D006's scientific speech acts map to profile-neutral families: attributed
  report, inference, recorded author judgment, Petra assessment, recommendation,
  clarifying question, action proposal, action report, uncertainty/limitation,
  and operational status. Profile subtypes cannot weaken origin, force, basis,
  action, or authority fields.
- Shared verbs distinguish Open/View, Show/Hide, Expand/Collapse, Close/Back/
  Return, Save, Start work, Stop response, Cancel work, retry/resume/start again,
  Review changes, Apply changes, Reject candidate, Decide later, Revert change,
  and local Reset/Undo.
- Response, Work, connection, candidate/authority, content persistence, and
  output/delivery statuses remain separate. Confirmations and errors name exact
  consequence, observed effect, preserved state, retry safety, and recovery.
- Petra remains one product identity; model and validator roles are inspectable
  without becoming chat characters. Wording feedback, context correction, domain
  correction, and action-scope correction route to their actual layers.
- English is the initial conformance locale. Source language and bytes remain
  intact; translation is a separate derived and provenanced representation.
  Accessible, narrow, and streamed output preserves the same material language.

DB15 contains eleven interaction paths (`DB15-P01`–`P11`) and seven findings
(`DB15-A01`–`A07`) with complete paper coverage. `UX-FX36`/`UX-FX37` are
post-freeze scenarios. DB15 sharpens `UX-REQ-004` with a versioned terminology/
discourse registry and creates proposed `UX-REQ-021` for a profile-resolved
statement-level communication plan and language-validation receipt. The runtime
audit treats scientific model-synthesist output, grounded-response bytes,
Felicity revision records, command/event authority, and AG-UI delivery as inputs,
not as a complete profile-neutral communication contract. DB15 closes at
`G-SPEC`; no language implementation, model/localization/accessibility evidence,
or participant validation is claimed.

The user accepted DB16's task-and-outcome-equivalence boundary on 2026-09-07 as
`UX1.0-DISC09` and added that Petra's language model must be able to understand
and explain the graph the author currently sees.

- Every visual, textual, keyboard, screen-reader, touch, magnified/reflowed,
  reduced-motion, forced-color, and generated presentation preserves the same
  objective, material meaning, state, controls, consequence/authority, recovery,
  result, and practical efficiency through a modality-appropriate sequence.
- A graph peer is a complete relationship workspace with scope, layers, paths,
  omissions, selection, Details, expansion, sources, Work, Review, History, and
  return. It cannot become a read-only summary or require exhaustive serial
  traversal for an ordinary visual task.
- Landmarks, headings, native/tested component semantics, stable names, keyboard
  operation, predictable unobscured focus, non-color meaning, 200% text, 400%
  zoom/320 CSS-pixel-equivalent reflow, target/spacing rules, non-drag controls,
  reduced motion, bounded live announcements, and form/editor recovery apply
  across every material surface.
- AG-UI snapshots, deltas, messages, and registered custom events carry
  synchronized interaction state. Petra owns the semantic scene, accessible
  structure, task peers, validation, actions, and authority; protocol support
  alone does not close accessibility.
- When asked what the current graph shows, Petra receives the exact semantic
  graph result plus a versioned bounded scene containing visible objects and
  relationships, layout, grouping, selection, layers, legend, hidden counts,
  viewport omissions, and the semantic peer. A permitted image may supplement
  the scene for an eligible vision-capable model.
- Petra distinguishes canonical graph meaning, registered presentation facts,
  and optional image observation. Pixels, proximity, size, color, motion, or
  visual emphasis cannot independently establish domain force, causality,
  priority, success, or authority. Mismatch produces a semantic fallback and an
  explicit limitation.

DB16 contains twelve interaction paths (`DB16-P01`–`P12`) and eight findings
(`DB16-A01`–`A08`) with complete paper coverage. `UX-FX38`–`UX-FX40` are
post-freeze scenarios. DB16 sharpens `UX-REQ-006`, `UX-REQ-013`, and
`UX-REQ-021`; proposed `UX-REQ-022` records the missing binding among semantic
result, visible scene, accessible peer, optional permitted capture, model input,
and validated explanation. DB16 closes at `G-SPEC`; no accessibility or model-
context implementation, browser/AT result, participant evidence, performance
claim, or legal conformance is recorded.

The user accepted DB17's canonical-reconciliation, preserved-state, and exact-
return boundary on 2026-09-07 as `UX1.0-DISC10`.

- Recovery first identifies the attempted task/object/input and reconciles the
  records that own its effect. It classifies the outcome as confirmed no effect,
  confirmed effect, in progress, mixed across independent members, unknown, or
  unavailable to verify.
- Petra then names durable, local-only, partial, unavailable, and confirmed-lost
  state; offers only current registered actions; records any chosen effect; and
  returns to the exact task/object/input/selection/focus or names the fallback.
- **Check status**, **Refresh**, **Reconnect**, **Replay response**, **Retry**,
  **Resume work**, **Start again**, **Restore local work**, **Reconcile**,
  **Regenerate preview**, **Revalidate**, **Retry delivery**, local **Undo** and
  view Back/Forward/Reset, **Revert change**, and **Return to current** keep
  separate identities, costs, authority, and History effects.
- Exact redelivery reuses owning idempotency where supported. A Review batch
  exposes each independently atomic ChangeSet; replay never restarts Work;
  projection repair never repeats Apply; output redelivery never silently
  regenerates; local restoration never claims a Project save; Revert appends
  compensating records without erasing the original.
- Safe automatic recovery is bounded to transport reconnect/replay, projection/
  outbox repair, client presentation restoration, and already authorized Work
  retry policy. Offline Petra does not queue invisible authoritative commands.
- History is a full, authorized, deep-linkable route presenting readable causal
  episodes and exact actions/effects. The recent-ten changes window is only quick
  access. Where no cross-system total order is verified, Petra preserves
  causation and source ordering without inventing precision.
- Everyday recovery does not claim that browser state, a projection rebuild, or
  History is a backup. Operational restore remains a separate verified process;
  confirmed irrecoverable loss is stated honestly.

DB17 contains thirteen paths (`DB17-P01`–`P13`) and ten findings
(`DB17-A01`–`A10`) with complete paper coverage. `UX-FX41`–`UX-FX43` are
post-freeze scenarios. DB17 sharpens `UX-REQ-007`, `UX-REQ-014`,
`UX-REQ-015`, `UX-REQ-018`, and `UX-REQ-019`; proposed `UX-REQ-023` records
the missing cross-module recovery assessment and registered-action composition.
DB17 closes at `G-SPEC`; no recovery implementation, offline/browser, race,
disaster-recovery, accessibility, performance, security, or participant evidence
is claimed.

The user accepted DB18's traceable implementation-packet format on 2026-09-07 as
`UX1.8-DISC02`.

- Fourteen packet entries cover Projects, the Project shell, Brief, Sources,
  Review, Graph, Work, Composition, registered profile tools, History, Settings,
  Details, Petra, and transient action/feedback.
- Each packet binds its author task, completion, source specification, ordered
  regions, responsive/assistive forms, shared and surface states, flow and commit
  point, recovery and return, component ownership, profile slots, dependencies,
  and later evidence.
- Six responsive/assistive compositions, nine independent state dimensions, all
  18 flow families, and UX-PATH-01–04 form the cross-product map. Direct and Petra
  variants use the same identities and registered operations.
- The DB01–DB03 audit closes the accepted premise/non-goals, current individual-
  workbench responsibilities, and profile system at specification depth.
  `UX-REQ-004` remains a runtime dependency and public multi-user collaboration
  remains deferred under `UX-D06`.
- The complete `UX-REQ-001`–`023` ledger covers the packet. DB18 creates no
  `UX-REQ-024`; clients, models, fixtures, projections, and AG-UI cannot fill
  unresolved authoritative gaps.
- DB18 contains sixteen interaction paths, twelve findings, 21 criteria, and
  post-freeze `UX-FX44`–`UX-FX46` for complete-packet, whole-product, and safe-
  degradation/clean-start evidence.

DB18 closes at `G-SPEC`. Prototype, contract, integration, browser/AT, model,
localization, performance, privacy/security, disaster-recovery, regression,
clean-start, and participant evidence remain later gates.

**Next decision: `UX-DESIGN-FREEZE-01`.** Record it only after the user explicitly
accepts DB01–DB18 as the product implementation baseline, including the listed
deferrals and open runtime/evidence gates. Until then, keep the work at design-
specification depth.

## Latest repository checkpoint

- This conversation resumed on `design/m1-ux` at `230fadd`; DB10's specification
  closure and DB11 opening discussion were saved at `5cd707b`; DB11 presentation
  and the then-pending steering choice were saved at `6fa8f91`; accepted steering
  and the DB11 specification closure were saved at `a6f6901`; parallel Project
  inquiries were clarified at `8290251`; DB12's document-first direction and
  then-pending export choice were saved at `38fb39c`; completed DB12 and the DB13
  opening discussion were saved at `4faa54f`; completed DB13 and the DB14 opening
  discussion were saved at `02c7383`; completed DB14 and the DB15 opening
  discussion were saved at `8cf31da`; the extensible-profile clarification and
  refined DB15 recommendation were saved at `df31fb3`; completed DB15 and the
  DB16 opening discussion were saved at `9d5f94c`; completed DB16 and the DB17
  opening discussion were saved at `823b0b5`; completed DB17 and the DB18
  opening discussion were saved at `fd21213`. The current working checkpoint
  records accepted/completed DB18 and opens the design-freeze decision; inspect
  Git status/log for local and remote position.
- The preceding synchronized merge was `81c3786`.
- The merge consumes backend `main` at `344cf77` without workbench or design-doc
  conflicts.
- Verification at that preceding merge passed 599 always-on tests with seven
  expected service skips. It is historical evidence, not a test run for this
  documentation-only closure.
- Documentation checks at the DB10 closure covered table/fence structure, new local
  links, path/audit and decision/request/fixture definitions, acceptance status,
  five-file design-only scope, and `git diff --check`.
- The inquiry clarification passed documentation structure/link checks, unique
  decision/request/scenario definitions, DB10/DB11 path and audit coverage,
  proposed-runtime/freeze status, five-file scope, and `git diff --check`.
- DB12 closure passed Markdown/link checks, unique decision/request/scenario
  records, DB10–DB12 path/audit coverage, acceptance/date/status consistency,
  five-file design-only scope, and `git diff --check`.
- DB13 closure checks cover Markdown structure and links, unique decision/request/
  scenario definitions, DB10–DB13 path/audit sequences, acceptance/status and
  freeze boundaries, five-file design-only scope, and `git diff --check`. No
  runtime, local-storage, accessibility, or participant evidence is claimed.
- DB14 closure checks cover Markdown structure and links, unique decision/scenario
  definitions, DB10–DB14 path/audit sequences, UX-REQ-004 trace, acceptance/status
  and freeze boundaries, five-file design-only scope, and `git diff --check`. No
  implementation or runtime validation is claimed.
- DB15 closure checks cover Markdown structure and links, unique decision/request/
  scenario definitions, DB10–DB15 path/audit sequences, UX-REQ-004/021 trace,
  acceptance/status and freeze boundaries, five-file design-only scope, and
  `git diff --check`. No runtime, model, localization, accessibility, or
  participant validation is claimed.
- DB16 closure checks cover Markdown structure and links, unique decision/request/
  scenario definitions, DB10–DB16 path/audit sequences, UX-REQ-006/013/021/022
  trace, accepted-versus-proposed status and freeze boundaries, five-file design-
  only scope, and `git diff --check`. No implementation, browser/AT, model,
  performance, participant, or legal validation is claimed.
- DB17 closure checks cover Markdown structure and links, unique decision/request/
  scenario definitions, DB10–DB17 path/audit sequences, UX-REQ-007/014/015/018/
  019/023 trace, accepted-versus-proposed status and freeze boundaries, five-file
  design-only scope, and `git diff --check`. No runtime, offline/browser, race,
  disaster-recovery, accessibility, performance, security, or participant
  validation is claimed.
- DB18 closure checks cover Markdown structure and links, unique DISC02/work/
  acceptance/scenario definitions, DB10–DB18 path/audit sequences, fourteen
  surface packets, all 18 flows and four end-to-end paths, complete UX-REQ-001–023
  coverage, DB01–DB03 closure, accepted-versus-proposed status, freeze boundaries,
  five-file design-only scope, and `git diff --check`. No prototype, runtime,
  integration, browser/AT, model, performance, privacy/security, recovery,
  clean-start, or participant validation is claimed.
- `UX-REQ-001` through `UX-REQ-023` remain proposed runtime
  requirements; the design closure does not implement or close them.
- `ChatGPT Image Aug 29, 2026, 04_21_35 PM.png` and `Claim Form BASIC.pdf` are
  intentionally untracked user assets. Do not add or remove them without explicit
  direction.

Do not implement a Graph, Composition, Settings, design-system, language,
accessibility, recovery, or whole-product fixture before the pending freeze.
Product implementation resumes only after the user accepts
`UX-DESIGN-FREEZE-01`.
