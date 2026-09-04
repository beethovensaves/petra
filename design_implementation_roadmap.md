# Petra Design Implementation Roadmap

Status: use-agnostic brief in progress; DB04–DB09 accepted; DB10 next
Last updated: 2026-09-04
Scope: deliver Petra's M1 experience module by module while implementation continues, without creating a second authority for architecture or feature completion

Companion documents:

- [Product brief and founding design](PETRA.md)
- [Logical graph and event model](PETRA_GRAPH_MODEL.md)
- [Decision and milestone roadmap](ROADMAP.md)
- [Implementation roadmap](implementation_roadmap.md)
- [Design terminal handoff](DESIGN_TERMINAL_HANDOFF.md)
- [Object-centered workspace decision](decisions/D009-object-centered-research-workspace.md)
- [Petra language and reference contract](decisions/D006-petra-language-and-reference-contract.md)
- [Brand inspiration kit](petra_brand_inspiration/README.md)
- [UX writing and interaction audit protocol](reports/UX-WRITING-INTERACTION-AUDIT-PROTOCOL.md)
- [Use-agnostic user-flow architecture](reports/UX-FLOW-ARCHITECTURE.md)
- [UX-to-implementation requirements handoff](reports/UX-BACKEND-HANDOFF.md)
- [Master Petra UX design brief and freeze criteria](reports/PETRA-UX-DESIGN-BRIEF.md)

## Outcome

Petra will receive a deliberate design pass without pausing the evidence-spine build or allowing prototypes to invent authoritative state. Design can run ahead with deterministic fixtures, but production integration follows the contracts and authoritative data delivered by the implementation roadmap.

Petra's shared work-and-authority model is use-agnostic. Each Project binds to a versioned profile that supplies its typed domain objects, relationships, validators, surface roles, and terminology. Scientific research is the first implementation profile; complex controlled writing is a distinct profile that uses the same authorial mechanics and controls without reclassifying narrative meaning as scientific evidence.

The M1 design track is complete when a researcher can move through one coherent, accessible path:

```text
orient to Project, question, and snapshot
  -> understand H12 — its plain-language descriptor and current standing
  -> inspect the Papers and exact SourceSpans behind a Claim
  -> compare evidence, scope, origin, and disagreement
  -> review a visible ChangeSet directly or with Petra
  -> inspect the focused graph and textual provenance path
  -> start, monitor, interrupt, reconnect to, or cancel agentic work
  -> receive a grounded answer
  -> create a DraftArtifact with traceable citations
```

For the scientific profile, the interface should feel like a scientific IDE with a collaborative research assistant: calm at rest, dense when inspected, fast for local work, explicit about background work, and skeptical about what has not been established. The controlled-writing profile keeps that application quality and control grammar while adapting its domain language and tools to governed revision.

## Product design, reference UX, and demo separation

The design track now proceeds through three explicit efforts:

1. **Complete the product brief.** Specify and accept Petra's entire use-agnostic experience, including every module, flow, state, authority boundary, recovery path, accessibility behavior, profile extension point, and backend need. No contextual demo material participates in this phase.
2. **Stand up Petra independently.** Implement the complete accepted experience against synthetic, contract-shaped conformance scenarios. The product must build and operate without access to any external demo directory.
3. **Produce contextual integrations and demos.** Only after the design freeze and independent reference UX may separate work map the selected scientific and controlled-writing contexts into their accepted profiles.

The controlling completion contract is
[`reports/PETRA-UX-DESIGN-BRIEF.md`](reports/PETRA-UX-DESIGN-BRIEF.md).
`UX-DESIGN-FREEZE-01` must be explicitly accepted before Phase 2 starts. Phase
3 cannot define missing product behavior, and removing every demo adapter or
dataset must leave the complete Petra product unchanged.

## Design-terminal mission

The design track's first responsibility is to complete and freeze Petra's entire
use-agnostic UX brief. For each module, Phase 1 produces:

- accepted user task, information hierarchy, and interaction behavior;
- complete surface, responsive, and state blueprints;
- profile-independent semantic roles and profile-owned terminology slots;
- direct, Petra-mediated, authority, cancellation, recovery, and history paths;
- keyboard, focus, zoom, motion, touch, screen-reader, and non-color behavior;
- terminology, error, status, confirmation, and assistant-language specifications;
- query, command, event, policy, profile, and persistence requirements;
- heuristic, accessibility, dangerous-misunderstanding, and cross-module audits;
- acceptance criteria and synthetic conformance scenarios for later implementation.

After `UX-DESIGN-FREEZE-01`, the same design track is responsible for leaving
Petra's reference frontend as close to production-complete as available
contracts permit. Phase 2 produces production React components, synthetic
contract-shaped fixtures, interaction and visual evidence, narrow live-data
adapters, and live integration where the corresponding contracts exist.

“Frontend complete” does not mean inventing backend state in the browser. When
a live contract is not ready, the reference UX uses an explicitly provisional
synthetic fixture and records the missing connection as a `UX-REQ`. The
component must survive live connection without a visual or interaction rewrite.

Exploration during Phase 1 uses diagrams, blueprints, and documented
alternatives. Existing pre-freeze routes remain calibration evidence. New
production-surface or contextual-demo code does not resume until the applicable
phase gate opens. After implementation begins, exploratory code never becomes
an unlabeled production path.

## Authority and ownership

This document is a delivery track, not a new product or architecture authority. The following order resolves conflicts:

| Priority | Authority | Controls |
| --- | --- | --- |
| 1 | `PETRA.md` and accepted decisions in `decisions/` | Product, scientific, authority, interaction, and architecture constraints |
| 2 | `PETRA_GRAPH_MODEL.md` and runtime contracts | Scientific object meaning, identity, provenance, and allowed state transitions |
| 3 | `implementation_roadmap.md` | Build order, technical dependencies, shipped capability, and implementation completion |
| 4 | This roadmap | Experience sequencing, design artifacts, interface acceptance, and design validation |
| 5 | Brand inspiration kit | Visual direction, tokens, tone, and logo inspiration |
| 6 | Prototypes and current workbench code | Testable proposals and implementation evidence, never policy by accident |

Where two documents appear to disagree, the higher authority wins until a recorded change amends it. In particular:

- this roadmap cannot mark an implementation slice complete;
- the implementation roadmap cannot mark an experience validated without this roadmap's evidence;
- a prototype cannot create a field, score, permission, state transition, or mutation path that Petra does not own;
- the visual reference controls visual direction, not information architecture; D009 controls the object-centered workspace;
- the official AG-UI SDK carries interactions, but Petra owns the view models, components, scientific semantics, and authority;
- current code is a provisional baseline. Its existence does not make a pattern accepted.

## How both roadmaps run in parallel

The implementation track may continue building accepted backend foundations
while the design track completes the whole product brief. The design track uses
three consecutive gates:

1. **Specify now:** complete every product module and cross-module flow in `reports/PETRA-UX-DESIGN-BRIEF.md`; issue backend requests, but do not use a contextual demo to resolve design gaps.
2. **Implement after design freeze:** stand up the whole product against synthetic conformance scenarios, then integrate accepted live contracts.
3. **Demonstrate last:** build real contextual integrations only after Petra operates independently.

Existing shell and graph code remains useful exploratory evidence, but it does
not satisfy the design freeze and does not authorize continued screen-by-screen
implementation before the complete brief is accepted. The tracks synchronize
through explicit contract requests:

```text
complete accepted product brief
      |
      +-> UX-REQ dispositions -----------+-> accepted runtime contracts
      |                                  |
      +-> synthetic conformance spec ----+-> independent reference UX
                                             |
                                             +-> later contextual integrations
```

### Parallel-work rules

| ID | Rule | Consequence |
| --- | --- | --- |
| `UX-P01` | During product-brief work, design uses blueprints and state specifications only; executable synthetic fixtures begin after `UX-DESIGN-FREEZE-01`. | Available data or unfinished contracts cannot determine the design by implementation accident. |
| `UX-P02` | Every fixture declares which authoritative query, command, or event it represents. | Mock data cannot silently become a second domain model. |
| `UX-P03` | Production integration waits for the corresponding runtime contract and implementation acceptance path. | Components do not guess final payloads or mutation semantics. |
| `UX-P04` | Screen-level specifications cover the entire product before new production-surface implementation resumes. After design freeze, reference-UX delivery may proceed module by module. | Petra's cross-module experience is resolved before local implementation choices harden it. |
| `UX-P05` | A design need that changes data, commands, policy, or authority becomes a `UX-REQ` request. | Architecture changes remain visible and reviewable. |
| `UX-P06` | One stable object identity must survive route, Brief, table, graph, inspector, and assistant representations. | Parallel work cannot create screen-local domain objects. |
| `UX-P07` | Direct interaction and assistant mediation call the same Petra command path. | Design cannot add a conversational back door into trusted state. |
| `UX-P08` | Module prototypes are reviewed in realistic dense and adverse states, not only a polished happy path. | Design decisions account for governed domain work rather than demo content. |
| `UX-P09` | Cross-module coherence is specified before design freeze and validated again after reference-UX integration. | A complete paper design and an integrated product both have to behave coherently. |
| `UX-P10` | A design refactor does not reopen accepted architecture unless evidence crosses a decision's revisit trigger. | Design iteration stays productive and bounded. |
| `UX-P11` | Accepted fixture-backed components are production frontend code, not throwaway mockups. | Live integration should replace providers and adapters rather than rebuild the experience. |
| `UX-P12` | Each module begins with a user discussion before consequential design choices are implemented. | Priorities, definitions, and tradeoffs remain collaborative and explicit. |
| `UX-P13` | Every module maintains a user-facing terminology ledger and audits complete interaction paths against D006, the active Project profile, authority boundaries, accessibility requirements, and Nielsen's ten usability heuristics. | Friendly language cannot disguise the wrong domain meaning, and a polished control cannot hide an unsafe, incomplete, or unrecoverable path. |
| `UX-P14` | Shared components consume one versioned Project profile and stable semantic roles; profiles own domain types and vocabulary while Petra owns the invariant control and authority grammar. | Science and controlled writing can use the same shell and mechanics without hard-coded scientific nouns or cosmetic aliases over incompatible meanings. |
| `UX-P15` | Complete and explicitly accept the entire product-design brief before implementing the neutral reference UX or any contextual demo. | A partial screen or available corpus cannot silently determine Petra's product architecture. |
| `UX-P16` | Reference-UX fixtures are synthetic, contract-shaped conformance scenarios created from accepted product requirements and kept separate from demo assets. | Petra can stand up as a complete product without external project files or corpus assumptions. |
| `UX-P17` | A later demo finding changes the product only through a generalized user failure, affected flow, revisit trigger, and ordinary design/contract review. | A real context can expose a defect without becoming the template for every user. |

### Post-freeze reference-UX delivery sequence

These delivery waves begin only after `UX-DESIGN-FREEZE-01`. They do not define
the order in which the remaining product-brief sections are discussed.

| Wave | Design work | Parallel implementation | Required handoff |
| --- | --- | --- | --- |
| `UX-WAVE-0` | `UX1.0` foundations and inventory | Current M1 work | Tokens, fixture rules, state vocabulary, and design-debt register |
| `UX-WAVE-1` | `UX1.1` Project shell plus `UX1.3` profile-resolved Sources and exact-inspection reference surface | `M1.2` PostgreSQL and Artifact spine | Stable Project profile, snapshot, Project-source link, source identity/revision, Artifact, rights, capability, processing, and exact-inspection view needs |
| `UX-WAVE-2` | `UX1.2` profile Brief and `UX1.5` focused graph prototypes | `M1.3` projection and `M1.4` parsing | Profile-resolved Brief, projection, SourceSpan, standing, evidence-frontier, and selection view needs |
| `UX-WAVE-3` | `UX1.4` basis, candidates, and review | `M1.5` proposals, ChangeSets, and trusted graph | Working-candidate, exact basis, comparison, validation, decision, impact, batch-outcome, and reversal contracts |
| `UX-WAVE-4` | `UX1.6` assistant, actions, and active work; integrate `UX1.1`–`UX1.6` | `M1.6` retrieval and `M1.7` workbench | ContextPacket, EvidencePacket, WorkUnit, AG-UI, interrupt, replay, and cancellation view models |
| `UX-WAVE-5` | `UX1.7` drafting and citations | `M1.8` DraftArtifact path | Composition, provenance, revision, citation, and renderer contracts |
| `UX-WAVE-6` | `UX1.8` whole-workbench validation | `M1.9` hardening and closure | End-to-end acceptance run, recovery states, accessibility evidence, and resolved critical design debt |

The order names dependencies, not calendar commitments. If implementation order changes, the design item keeps its identifier and updates its named handoff.

## Discussion-first module loop

The design terminal proceeds with the same collaborative cadence used for Petra's architecture decisions. It does not interpret the roadmap as permission to make every consequential UX decision alone.

During Phase 1, each module follows this specification loop:

1. **Orient:** inspect accepted principles, decisions, contracts, prior design sections, and known product debt; do not inspect a contextual demo to discover the module's purpose.
2. **Define:** discuss the project author's task, profile-independent roles, profile-owned meaning, primary object, information priority, key actions, dangerous misunderstandings, and explicit non-goals.
3. **Compare:** when a choice is consequential, present a small number of viable approaches with concrete tradeoffs and a recommendation.
4. **Decide:** record the accepted direction, unresolved questions, and any implementation contract needed.
5. **Specify:** complete the information hierarchy, responsive blueprints, direct and Petra-mediated paths, ordinary and adverse states, copy roles, accessibility behavior, authority and recovery boundaries, backend needs, acceptance criteria, and post-freeze synthetic conformance scenarios.
6. **Audit:** review the paper design against cross-module flows, the active profile boundary, the writing and interaction protocol, accessibility, dangerous misunderstandings, and Nielsen's heuristics.
7. **Advance:** place the accepted module in the master brief and discuss the next module without implementing a new production surface.

After every module is specified, the design track performs the `DB18`
cross-module blueprint and requests explicit acceptance of
`UX-DESIGN-FREEZE-01`. Only then does each module enter the implementation loop:
build against synthetic conformance scenarios, review all applicable states,
audit the working interaction, refine, and integrate accepted contracts.

The terminal may resolve routine specification details autonomously after a
direction is accepted. It pauses for discussion when a choice changes
information hierarchy, domain interpretation, authority cues, action
consequences, navigation, cross-module behavior, or the accepted visual
language.

Discussion identifiers use `UX1.n-DISCnn`. Each record states the question, accepted direction, why it matters, affected work items, and any revisit trigger. A discussion record refines this roadmap; it does not amend a higher-authority decision silently.

## Worktree ownership and coordination

The design terminal works on branch `design/m1-ux` in a separate Git worktree. The main Petra worktree remains the implementation track.

| Area | Design worktree | Main implementation worktree |
| --- | --- | --- |
| `apps/workbench/` | Primary owner of client components, routes, styles, frontend fixtures, accessibility, and interaction tests | Supplies integration changes only through coordination |
| `apps/server/` | Read-only unless a named `UX-REQ` handoff is accepted | Primary owner |
| `packages/contracts/`, `packages/core/`, `packages/adapters/`, `packages/postgres/` | Read-only; proposes changes through `UX-REQ` | Primary owner |
| `workers/`, `infra/`, persistence, and projection code | Read-only | Primary owner |
| `petra_brand_inspiration/` | Reference material; accepted production assets may be added without overwriting source inspiration | Read-only unless coordinated |
| This roadmap and design evidence | Primary owner | Reads and links; avoids simultaneous edits |
| `implementation_roadmap.md` and accepted decisions | Read-only unless a coordinated handoff explicitly requires an update | Primary owner |
| Root package files and lockfile | Shared hotspot; discuss and coordinate before changing | Shared hotspot; discuss and coordinate before changing |

Both terminals follow these rules:

- commit coherent work to their own branch before exchanging it;
- do not edit the same shared hotspot concurrently;
- do not use the filesystem as an implicit merge mechanism between worktrees;
- bring implementation changes into the design branch at explicit synchronization points;
- merge or cherry-pick accepted design work back only after its relevant review;
- keep local ports distinct if both worktrees run development servers;
- never resolve a scientific contract conflict by preserving whichever branch happened to edit it last.

## Work numbering and status

Design work uses `UX` so it cannot be confused with accepted decisions (`D001`–`D016`) or implementation milestones (`M1.0`–`M1.9`).

| Form | Meaning | Example |
| --- | --- | --- |
| `UX1.4` | M1 design module 4 | Evidence inbox and review |
| `UX1.4-W03` | Required work item | Design the exact ChangeSet diff |
| `UX1.4-AC02` | Acceptance criterion | Direct and conversational review resolve to one proposal |
| `UX1.4-EV02` | Required design evidence | Keyboard-recorded review run |
| `UX1.4-DISC01` | Required module discussion | Select the batch-review information hierarchy |
| `UX-REQ-003` | Cross-roadmap contract request | Add a versioned action preview and invocation boundary |
| `UX-RISK-002` | Design risk to monitor | Dense graph causes selection loss |
| `UX-D01` | Explicit design deferral | Final production logo artwork |

Identifiers are stable and never reused. Allowed work statuses match the implementation roadmap:

- `planned`: specified but not started;
- `in_progress`: active design or integration work exists;
- `blocked`: a named dependency prevents useful progress;
- `complete`: all module acceptance criteria have evidence;
- `deferred`: intentionally outside the active gate;
- `superseded`: replaced by a named item.

Design artifacts move through five gates. These are evidence gates, not extra statuses:

| Gate | Meaning |
| --- | --- |
| `G-SPEC` | Task, object, states, terminology, interaction paths, accessibility, and authority boundary are specified. |
| `G-PROTOTYPE` | The production-candidate frontend works against representative deterministic fixtures. |
| `G-CONTRACT` | Queries, commands, events, and identity assumptions match the runtime contracts or have accepted `UX-REQ` items. |
| `G-INTEGRATION` | Production components consume Petra view models and real application paths. |
| `G-VALIDATION` | Acceptance scenarios pass with recorded heuristic, usability, accessibility, language, and visual evidence. |

A polished prototype is not integrated. Integrated code is not validated. A module becomes `complete` only after all five gates pass. During Phase 1, modules advance through `G-SPEC` only. `G-PROTOTYPE` and later gates reopen after `UX-DESIGN-FREEZE-01`; pre-freeze code remains exploratory evidence rather than the frozen product candidate.

## M1 design track at a glance

| ID | Status | What Petra designs and integrates | Why Petra needs it | Implementation link |
| --- | --- | --- | --- | --- |
| `UX1.0` | `in_progress` | Design foundations, fixture gallery, state vocabulary, and review evidence | Parallel module work needs one visual and behavioral grammar | `M1.0`, all M1 slices |
| `UX1.1` | `in_progress` | Profile-resolved Project shell, navigation, selection, Details, assistant frame, and responsive behavior | Project authors must remain oriented while moving among synchronized views | `M1.1`, `M1.2`, `M1.7` |
| `UX1.2` | `in_progress` | Profile-resolved Project Brief, consequence-led attention, supported current state, snapshot comparison, relevant Work, next actions, and history | The default surface must support the next profile-valid decision without becoming a dashboard | `M1.3`, `M1.6`, `M1.7` |
| `UX1.3` | `in_progress` | Profile-resolved Sources, reusable identity, immutable revisions, rights, inspection capability, processing, exact reading, provenance, and local-copy lifecycle | Project authors must know exactly what Petra can inspect, used, cannot use, and would change | `M1.2`, `M1.4`, `M1.7` |
| `UX1.4` | `in_progress` | Conversation-derived working graph, basis and provenance, profile-resolved comparison, exception-led Review, exact change preview, decision, recovery, and reversal | Natural interaction needs quiet structuring and visible, reversible authority boundaries | `M1.5`, `M1.6`, `M1.7` |
| `UX1.5` | `in_progress` | Focused graph, evidence paths, edge semantics, projection state, and textual equivalents | The graph must explain and control work rather than decorate it | `M1.3`, `M1.5`, `M1.6`, `M1.7` |
| `UX1.6` | `in_progress` | Petra interaction system, contextual answers, SuggestedActions, durable Work, review, reconnect, branching, and governed reversal | Project authors need fast collaboration and recoverable exploration without surrendering domain authority | `M1.5`, `M1.6`, `M1.7` |
| `UX1.7` | `planned` | DraftArtifact, provenance, revision, citations, BibTeX, and LaTeX | Scientific writing should be useful immediately and remain inspectable | `M1.8` |
| `UX1.8` | `in_progress` | Whole-product information architecture, flow coherence, accessibility, responsiveness, recovery, and visual hardening | The modules count only when they behave as one dependable workbench | `M1.9` |

## Design principles

| ID | Principle | Interface consequence |
| --- | --- | --- |
| `UX-DP01` | Object-centered, not chat-first. | Conversation stays synchronized with durable scientific objects and never becomes their sole representation. |
| `UX-DP02` | The graph is state, not decoration. | Graph views answer a task, expose provenance, and control bounded work. |
| `UX-DP03` | Rock first, graph second. | The mark reads as a durable black rock; graph structure appears subtly in facets and product semantics. |
| `UX-DP04` | Evidence first. | Material scientific prose has an immediate path to sources, scope, origin, and review state. |
| `UX-DP05` | Progressive disclosure. | The main surface states the useful decision first; detail remains one deliberate action away. |
| `UX-DP06` | Scientific force remains visible. | Source report, extraction, graph inference, researcher judgment, assistant judgment, and recommendation never collapse into one voice. |
| `UX-DP07` | Local work feels immediate. | Current graph state renders first; cached, running, and newly discovered work appears as a distinct progression. |
| `UX-DP08` | Automation remains governable. | Modes are visible presets; grants, cost, scope, exceptions, and consequential changes stay explicit. |
| `UX-DP09` | Color is redundant. | Every semantic color also has text, icon, pattern, line style, or position. |
| `UX-DP10` | Dense does not mean noisy. | Calm shells contain compact, inspectable scientific detail with disciplined hierarchy. |
| `UX-DP11` | No universal scientific score. | Standing is a reasoned profile; counts and measurements link to their basis. |
| `UX-DP12` | Language is part of the interface contract. | Felicity and Grice govern labels, explanations, actions, errors, and streamed responses. |
| `UX-DP13` | Control is visible and recoverable. | Every consequential path shows its current state, authority boundary, commit point, cancellation or reversal behavior, result, and recovery route in user-facing language. |

## Shared interface state grammar

Every module uses the same visible distinctions. A component may omit an irrelevant dimension, but it cannot rename or merge one locally.

| Dimension | Required distinctions | Design rule |
| --- | --- | --- |
| Scientific authority | `proposal`, `validated`, `applied`, `superseded`, `reverted` | Never style a proposal as trusted graph state. |
| Work freshness | `current_snapshot`, `cached_derived`, `running`, `stale`, `projection_catching_up` | State the snapshot or source revision behind every derived view. |
| Work outcome | `awaiting_input`, `completed`, `failed`, `cancelled`, `blocked` | Terminal states use explicit language and recovery actions. |
| Source content extent | `identity_only`, `preview`, `partial_content`, `full_content` | State what is present and missing; the scientific profile may render preview as `abstract_only`. |
| Source representation | original, normalized text, structured content, supported media preview | Representations form a capability set, not a maturity score, and may coexist or disagree. |
| Source location precision | none, structural, verified exact text, source-native region, compound verified location | Call a location exact only when it resolves against the named immutable Artifact at its declared verification level. |
| Source availability | local copy, remote only, cached representation, offline, local copy deleted, unavailable | Canonical identity and access to exact bytes remain separate facts. |
| Source processing | not requested, queued, inspecting, running, needs input, partial, ready, failed, cancelled, blocked, superseded | Processing state does not establish content extent, exactness, admissibility, or authority. |
| Origin | source, extraction, experiment, graph inference, researcher judgment, assistant judgment | Origin appears near the statement, not only in a distant audit view. |
| Evidence relation | supports, contradicts, qualifies, fails to replicate, cites, derives from, unresolved | Citation and scientific support must be visibly different. |
| Review mode | `inspect`, `guide`, `delegate`, `supervise` | Mode names summarize versioned governance defaults from D005; a mode does not grant permission, and a scoped custom policy is not a fifth mode. |
| Interaction phase | current response, activity, tool proposal, interrupt, resumed, replayed | Stream state never overwrites authoritative domain state. |
| Availability | ready, limited, unavailable, policy-blocked | A disabled action explains the missing prerequisite or policy. |

Numerical values are appropriate for observable quantities such as latency, cost, sample size, effect estimates, tolerance, benchmark results, and validation criteria. They must include units, basis, and relevant snapshot or run. Numerical thresholds may control an experiment or interface test after they are defined in the corresponding protocol. They do not become a universal confidence, truth, maturity, or currentness score.

## Visual foundation

The brand inspiration kit establishes the direction:

- off-white, stone, slate, graphite, charcoal, and restrained amber surfaces;
- semantic green, blue, amber, red, violet, and neutral states used functionally;
- Bebas Neue only for the uppercase PETRA wordmark;
- Inter for product headings, controls, tables, and prose, with monospace reserved for identifiers, metrics, provenance, and code;
- a compact irregular black rock with sparse facet lines;
- thin rules, precise alignment, compact tables, and generous whitespace around brand surfaces;
- an editorial scientific-tool character, not futuristic AI gradients or glowing network imagery.

The raster reference is a composition and visual-language source, not a screen specification. Its graph canvas, evidence inspector, and assistant demonstrate synchronization, but Petra's production hierarchy follows D009's Research Brief and object-centered shell. The exact extracted rock figure from `petra_latest_design_reference.png` is the accepted production mark; the supplied SVG and rejected approximations remain inspiration or historical assets.

## `UX1.0` — design foundations and fixture system

- **Status:** `in_progress`
- **Builds:** the shared design grammar used by every M1 surface.
- **Why:** without a controlled foundation, parallel module work will drift in terminology, spacing, state semantics, accessibility, and authority cues.
- **Depends on:** accepted decisions, brand kit, current workbench inventory.
- **Implementation link:** `M1.0`; consumed by all later slices.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.0-DISC01` | Which logo, typography roles, and inspiration boundary establish Petra's first production visual foundation? | Use the exact black rock figure extracted from `petra_latest_design_reference.png` as the production mark and pair it with an uppercase Bebas Neue wordmark. Reserve Bebas Neue for the PETRA wordmark; use Inter for product headings, controls, tables, and prose; retain a monospace face only for canonical identifiers, metrics, provenance, and code. Keep the tagline on brand and entry surfaces rather than the compact application header. Use the remainder of `petra_latest_design_reference.png` for visual character, density, palette, and component mood, not as a graph-first screen specification. | The selected reference mixes the desired rock with a different wordmark and contains visual patterns that conflict with Petra's object-centered hierarchy and prohibition on universal scientific scores. Separating the exact mark, type, and product semantics preserves the intended identity without importing accidental authority or navigation. | `UX1.0-W03`–`UX1.0-W08`, `UX1.0-W11`, `UX1.1`, and the production asset path | Revisit if small-scale mark review later fails, Inter cannot sustain the required scientific density, the wordmark lacks a usable production font asset, or task evaluation shows that the resulting hierarchy does not match Petra's calm, editorial character. |
| `UX1.0-DISC02` | What does fixture-backed frontend completion require, and how should shared scientific and operational state appear? | Fixture-backed completion means production workbench components consume named, contract-shaped Petra view models; cover ordinary and adverse states; implement relevant navigation, selection, responsive, keyboard, focus, text-scale, motion, and non-color behavior; expose rather than disguise missing live contracts; and accept a conforming live provider without redesign. Use a contextual state grammar rather than a universal badge system: authority uses an explicit labeled marker; freshness stays with snapshot and revision metadata; origin stays near the statement; evidence relations use text plus icon or line pattern; source content, representation, exactness, availability, rights, and processing remain separate limitations; work status includes observable activity and recovery; and unavailable actions explain their reason and prerequisite. | A single decorative status treatment would merge dimensions that answer different scientific questions. The contextual grammar keeps proposal, authority, provenance, source limits, projection freshness, and operational outcomes legible without turning every surface into badge noise or relying on color. | `UX1.0-W03`–`UX1.0-W06`, `UX1.0-W08`–`UX1.0-W11`, all module fixture gates | Revisit if researchers cannot identify a state without color, compact treatments become too repetitive or dense, a consuming module needs a materially different distinction, or live provider integration requires component redesign rather than adapter replacement. |
| `UX1.0-DISC03` | Which density model and primitive scope should close the next foundation slice? | Use comfortable spacing for reading and forms and compact spacing for navigation and metadata; do not add a global density switch. Build the shell-essential button, link, text-field, text-area, tab, tooltip, dialog, notice, empty, and failure treatments first. Every shared control defines visible focus, hover, selected, unavailable, busy, error, and reduced-motion behavior. An unavailable action remains keyboard discoverable and states both its reason and missing prerequisite. Defer specialized chips, badges, popovers, tables, trees, and split panes until a consuming module supplies their real object and interaction contract. | One global density would either waste review space or compress reading tasks. A bounded primitive layer prevents the provisional shell from defining behavior by accident while avoiding speculative complex widgets. Explicit unavailable-action language prevents a silent disabled control from hiding scientific or policy limits. | `UX1.0-W03`–`UX1.0-W06`, `UX1.0-W09`, `UX1.0-W11`, and the primitive fixture route | Revisit if compact controls fail target or readability checks, comfortable controls impede dense review, a consuming module needs a shared complex primitive, or visible unavailability becomes too repetitive to scan. |
| `UX1.0-DISC04` | Which user-task architecture should govern the modules and prevent the shell from becoming a collection of simultaneous panels? | Design for the responsible project author moving through one durable loop: orient to the Project, profile, current objective, and snapshot; choose the material uncertainty, constraint, decision, or output; inspect the smallest adequate basis; answer locally or start bounded Work; review the result and consequences; apply, correct, reject, or defer through the authoritative path; and return to an updated profile Brief or compose a traceable artifact. The profile Brief is the default Project home. A user goal opens the relevant basis/review, Sources, Graph, Details, assistant, Work, profile tools, or Draft surface; their existence alone does not make them simultaneously prominent. The assistant mediates explanation and action, the graph answers relationship questions, and neither becomes the place where Project state lives. Define the task model from first principles and test it after design freeze with synthetic conformance scenarios. Maintain the complete catalogue, entry rules, adverse states, and horizon plan in `reports/UX-FLOW-ARCHITECTURE.md`; send runtime gaps through the `UX-REQ` register. | The shell prototype proved component and state coverage but did not prove that a person could complete a meaningful governed operation. A task-first loop makes hierarchy, progressive disclosure, terminology, activity, and completion criteria derive from user intent while preserving Petra's object, basis, authority, and history boundaries. | All UX modules, `UX-EV03`, `UX-EV05`, `UX-EV06`, `UX-EV08`, `UX-REQ-001`–`UX-REQ-012`, M1–M6 design horizons | Revisit if task evaluation shows that the Brief is not the best orientation surface, a material workflow cannot re-enter the loop, domain profiles require incompatible authority semantics, or secondary context cannot remain accessible without restoring simultaneous-panel overload. |
| `UX1.0-DISC05` | Is Petra a scientific application with a later writing mode, or a use-agnostic governed-work system that adapts to radically different Projects? | Petra is use-agnostic at the shared work-and-authority layer. Every Project binds to one versioned profile that owns typed domain objects, relationships, validators, surface roles, and user-facing terminology. Scientific research and complex controlled writing are separate semantic profiles, not UI modes or vocabulary aliases. They use the same authorial mechanics and controls: immutable sources, framed objectives, inspectable dependencies, bounded Work, candidates and ChangeSets, profile-appropriate validation, exact preview, approval/correction/rejection/deferment, promotion, cancellation, provenance, recovery, and additive history. The scientific profile may expose ResearchQuestions, Hypotheses, Claims, EvidenceRelations, Papers, and Experiments; the controlled-writing profile may expose revision objectives, canon, narrative constraints, dependencies, validation findings, source manuscript revisions, and promoted manuscript revisions. Final controlled-writing schema names remain to be defined. A permitted existing document can seed an immutable lineage, and a promoted revision never overwrites it. | Scientific research and controlled writing differ radically in domain meaning while still requiring the same governed authorial controls. Encoding science in shared components would make Petra brittle; forcing narrative knowledge into scientific schemas would make it false. A registered profile boundary preserves one trustworthy product while allowing each Project to speak accurately. | `UX1.0-W13`, `UX1.1-W01`–`W15`, all shared work/review/assistant/provenance/history components, `UX-FX15`–`UX-FX23`, `UX-REQ-001`–`UX-REQ-012`, and required architecture amendments | Revisit only if a profile requires a genuinely different authority or control meaning; a new noun, validator, graph predicate, or task surface extends the profile and does not by itself fork the kernel. |
| `UX1.0-DISC06` | When may contextual demo material influence Petra's product design or implementation? | Complete and explicitly accept the entire use-agnostic product brief first; then stand up the complete Petra reference UX against synthetic contract-shaped conformance scenarios; only then create separate contextual scientific and controlled-writing integrations and demos. Product design does not open a demo corpus to discover navigation, terminology, ontology, controls, workflows, defaults, states, or success criteria. Existing pre-freeze corpus observations are quarantined from product rationale. A later demo finding may reopen the product only when it states a generalized user failure, affected flow, and revisit trigger and passes the ordinary design and contract process. Removing all demo adapters and data must leave the complete Petra product operational. | Designing against available real material would optimize Petra for two projects before its general interaction model exists. A full design freeze and independent reference UX make product completeness observable and allow later contexts to validate Petra without defining it by accident. | `reports/PETRA-UX-DESIGN-BRIEF.md`, all `DB01`–`DB18` sections, `UX-DESIGN-FREEZE-01`, `UX-P15`–`UX-P17`, all modules and fixtures, contextual integration plans, and backend handoffs | Revisit only through an explicit product-scope decision; a demo deadline, convenient dataset, or attractive demo flow is not a trigger. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.0-W01` | `complete` | Inventory every current workbench route, component, token, fixture, placeholder, and unresolved design debt. | The dedicated design pass must improve the existing build without treating it as finished or discarding useful work. |
| `UX1.0-W02` | `planned` | Encode the authority hierarchy and parallel-work rules from this roadmap in contribution guidance. | Future design and implementation work need one conflict-resolution path. |
| `UX1.0-W03` | `in_progress` | Normalize color tokens into surface, text, border, focus, graph, and semantic-state roles. | Raw colors create inconsistent meaning and inaccessible status cues. |
| `UX1.0-W04` | `in_progress` | Define typography roles for display, page title, section title, body, table, label, identifier, provenance, metric, and code. | Dense domain information needs a predictable reading hierarchy. |
| `UX1.0-W05` | `in_progress` | Define spacing, sizing, radius, rule, elevation, and density tokens with compact and comfortable data treatments. | Modules must align without forcing one density on reading and review tasks. |
| `UX1.0-W06` | `in_progress` | Specify primitives for buttons, links, inputs, tabs, chips, badges, tooltips, popovers, dialogs, tables, trees, split panes, notices, and empty states. | Profile modules should compose stable controls rather than restyle basic behavior. |
| `UX1.0-W07` | `complete` | Define icon, rock mark, wordmark, and lockup usage at app, navigation, loading, and brand scales. | Petra needs a recognizable identity without turning every surface into a logo treatment. |
| `UX1.0-W08` | `complete` | Define redundant visual encodings for origin, profile-owned relation, review state, freshness, source limitation dimensions, and work status; the scientific profile supplies evidence-relation variants. | Color alone cannot carry domain or operational meaning. |
| `UX1.0-W09` | `complete` | Define focus, hover, selected, disabled, busy, error, and reduced-motion behavior for shared controls. | Streaming and dense panels must remain keyboard-accessible and stable. |
| `UX1.0-W10` | `complete` | Build a route-based fixture gallery from Petra-owned view models; do not add Storybook or another design dependency without a tested need. | Designers and implementers need deterministic adverse states without committing to a new tool prematurely. |
| `UX1.0-W11` | `in_progress` | Create shared language patterns for titles, labels, qualifiers, action rationales, approval prompts, errors, empty states, and recovery, with explicit slots for profile-owned domain terms. | Petra's assistant identity and control language must survive module, profile, and model changes. |
| `UX1.0-W12` | `complete` | Establish a design-debt register with severity, affected module, domain or authority risk, accessibility impact, and intended resolution gate. | Known compromises must not disappear inside screenshots or CSS. |
| `UX1.0-W13` | `in_progress` | Define the shared semantic roles, Project-profile resolution rules, adaptive terminology boundary, and paired scientific/controlled-writing conformance specification without importing contextual demo content or inventing the controlled-writing ontology in the browser. | Shared components must adapt to Project meaning while retaining one control, authority, accessibility, and recovery grammar. |
| `UX1.0-W14` | `in_progress` | Complete `DB01`–`DB18`, conduct the whole-product review, and record `UX-DESIGN-FREEZE-01` before new reference-UX or demo implementation. | Petra needs one coherent, reviewable product specification before local screens or real contexts harden incomplete assumptions. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.0-AC01` | Every production color, type, space, and semantic state used by M1 resolves to a named Petra token. |
| `UX1.0-AC02` | Every profile-owned domain status and Work status remains distinguishable without color. |
| `UX1.0-AC03` | Focus order, focus visibility, reduced motion, and text scaling work in the shared primitives. |
| `UX1.0-AC04` | The fixture gallery covers ordinary, empty, loading, cached, running, failed, stale, preview-limited including scientific **Abstract only**, and dense states. |
| `UX1.0-AC05` | The rock remains recognizable at app-icon scale and is not mistaken for a generic network mark in a small review. |
| `UX1.0-AC06` | Current screens are classified as retain, revise, replace, or remove, with a reason and target module. |
| `UX1.0-AC07` | The paired synthetic profile conformance scenarios use the same shared controls and lifecycle states while exposing distinct typed domain terms; no browser-only label map pretends one profile object is another. |
| `UX1.0-AC08` | The accepted design brief can specify and the neutral reference UX can later operate the complete product without access to contextual demo files, paths, structures, names, or data. |

### Completion evidence

- `UX1.0-EV01`: [token and primitive inventory with code references](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev01--token-and-primitive-inventory);
- `UX1.0-EV02`: [fixture-gallery route list and screenshots](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev02--routes-and-rendered-evidence), including the [accepted brand mark and lockup scale review](reports/UX1.0-BRAND-SLICE.md), which closes `UX1.0-AC05`;
- `UX1.0-EV03`: [keyboard, contrast, reflow, and reduced-motion foundation results](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev03--accessibility-slice), extended by the [accepted shared primitive interaction review](reports/UX1.0-PRIMITIVES-SLICE.md), which closes `UX1.0-AC03` at the shared-primitive boundary;
- `UX1.0-EV04`: [current-screen audit and design-debt register](reports/UX1.0-FOUNDATION-AUDIT.md).
- `UX1.0-EV05`: [first-principles user-flow architecture and complete use-case catalogue](reports/UX-FLOW-ARCHITECTURE.md), with [runtime requirements handoff](reports/UX-BACKEND-HANDOFF.md).
- `UX1.0-EV06`: paired scientific/controlled-writing profile role map and conformance specification; executable `UX-FX15` begins only after design freeze and `UX-REQ-004` disposition.
- `UX1.0-EV07`: [master product-design brief, phase boundary, section status, and `UX-DESIGN-FREEZE-01` criteria](reports/PETRA-UX-DESIGN-BRIEF.md).

## `UX1.1` — Project shell, navigation, and synchronized selection

- **Status:** `in_progress`
- **Builds:** the profile-resolved persistent frame around every Project task.
- **Why:** Petra can expose radically different domain objects and views only if project authors retain Project, profile, current objective, snapshot, selection, and active-work orientation.
- **Depends on:** `UX1.0`.
- **Implementation link:** `M1.1`, `M1.2`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.1-DISC01` | Which shell responsibilities remain persistent, and what role does the selected-object inspector play? | Use a main-first adaptive shell. Keep Project, active ResearchQuestion, authoritative snapshot, differing projection freshness, review posture, and attention-requiring work in a compact context bar. Keep the research map persistent on wide screens and available as a drawer on narrow screens. Give the task-specific main surface most of the space. Present the selected-object inspector to researchers as **Details**, opening only when an object is selected and preserving selection when collapsed. Details is a real object surface for identity, source, provenance, scope, status, relationships, history, impact, and permitted actions—not a menu. Its Relationships section may show a small task-bounded graph or provenance path with a textual equivalent and an **Open in Graph** path; the full graph remains a dedicated main-surface view. Keep Petra available as a restrained dock that expands for conversation or active work. Narrow layouts order context, main surface, Details, then Petra without losing selection or active work. | Four permanently equal panels would compress the research task and make the shell feel like a dashboard. A main-first hierarchy preserves D009's coordinated functions while keeping durable objects—not conversation or a miniature graph—at the center. Renaming the inspector clarifies its researcher-facing purpose, and bounding embedded relationships prevents a cramped duplicate of the full Graph view. | `UX1.1-W01`–`UX1.1-W11`, shell view model, responsive fixture, Details component | Revisit if researchers lose context when map or Petra collapses, Details duplicates module content, a selected object cannot preserve identity across surfaces, the compact relationship view is mistaken for the full graph, or active work becomes too easy to miss. |
| `UX1.1-DISC02` | What scalable application system, theme, editor, and layout-accessibility grammar should replace the line-heavy first shell candidate? | Treat the first shell render as rejected visual calibration, not the accepted system. Use GitHub Primer for component roles, tokens, and interaction behavior; GitLab Pajamas for application chrome and panel structure; and Petra for brand and profile-owned domain semantics. Provide System, Petra Stone, Petra Graphite, and High Contrast themes plus forced-colors support. Keep surfaces comfortable for long sessions without weakening required text, control, focus, or state contrast. Use CodeMirror 6 for editable LaTeX, JSON, queries, and code-like surfaces, a shared syntax-token palette for static code, and JetBrains Mono with ligatures off by default. Make pane resizing work by pointer, touch, keyboard, and WAI-ARIA separator semantics, with Appearance, Layout, Editor, and Accessibility settings; Focus, Review, Graph, and Collaborate presets; and reset controls. Treat layout preferences as presentation-only state. Enforce a border budget of one structural divider between adjacent panes: no nested framing, and the main surface is a workspace rather than a card. Do not add design-system or editor dependencies until the isolated calibration and shared-lockfile coordination are complete. | The first candidate's nested lines and panels resemble a presentation slide and will not scale across Petra's dense workflows. Established systems reduce unnecessary invention, while coordinated theme, syntax, resize, and accessibility rules preserve comfort and orientation without producing hidden domain state. | `UX1.0-W03`–`UX1.0-W09`, `UX1.1-W01`–`UX1.1-W12`, `UX1.7`, theme/settings/view-state models, isolated shell fixture | Revisit if Primer customization conflicts with Petra's semantics, Pajamas-inspired chrome weakens orientation, comfort or accessibility tests fail, CodeMirror does not fit a required editing task, presets create hidden state, or the dependency spike fails its budgets. |
| `UX1.1-DISC03` | What must change for the accepted systems to produce a cohesive, finished application rather than a themed version of the provisional shell? | Rebuild the shared primitive layer before recomposing the shell. Use Primer primitives as the token reference and Octicons as the icon language, while retaining Petra-owned React components and profile-owned domain semantics; use Pajamas as a structural and navigation reference rather than a runtime dependency. Use blue for interaction, focus, and current selection; reserve Petra amber for brand and bounded review/proposal emphasis instead of every action. Keep Inter but replace the current hierarchy with named text roles, sentence case, standard weights, and deliberate measure; keep Bebas Neue wordmark-only. Define one elevation model with app base, chrome, primary work surface, and temporary overlay, with no more than three simultaneous planes. Remove fixture metadata and unavailable future modules from product chrome, open Details contextually, and collapse Petra by default. Review the primitive gallery before applying the system to the shell. Do not adopt the complete Primer React package until a React 19 compatibility and bundle spike passes. | The second calibration changed layout and themes but retained legacy borders, buttons, type hierarchy, and overlapping surface roles. A system-first rebuild prevents another accumulation of local CSS and makes the accepted visual direction scalable across modules. | `UX1.0-W03`–`UX1.0-W06`, `UX1.0-W11`, `UX1.1-W01`–`UX1.1-W12`, primitive gallery, shell fixture, dependency spike | Revisit if blue weakens Petra's identity, the reduced plane count hides material context, Octicons cannot express required profile states, the compatibility spike supports a lower-cost Primer React adoption, or task testing requires a different default panel posture. |
| `UX1.1-DISC04` | How will Petra ensure that terminology is domain-accurate and approachable, and that every interaction path preserves user control? | Treat UX writing and interaction integrity as module acceptance work rather than final polish. For every module and Project profile, maintain a terminology ledger with canonical object, user-facing term, definition, prohibited conflations, source authority, and profile owner. Document each material path from entry state through feedback, commit point, result, cancellation or reversal, adverse states, recovery, focus behavior, and preserved work. Audit labels, descriptions, actions, statuses, confirmations, empty states, errors, and assistant language against D006, the active profile and command contracts, accessibility requirements, and Nielsen's ten usability heuristics. Separate product language from fixture and developer evidence. Record findings by consequence, assign a disposition, and block validation for unresolved issues that can cause unsupported trust, accidental mutation, lost work, provenance confusion, or loss of control. Heuristic review complements rather than replaces task testing with project authors. | Friendly wording can still be functionally false, and a polished control can still lead to an opaque or irreversible outcome. A shared control vocabulary plus profile-owned domain vocabulary keeps terms stable across direct and conversational paths, exposes authority and consequences, and makes usability review repeatable rather than subjective. | `UX1.0-W11`, `UX1.0-W13`, `UX1.1-W01`–`UX1.1-W15`, all module `G-SPEC` and `G-VALIDATION` gates, `UX-EV03`, `UX-EV05`, `UX-EV08` | Revisit if a profile's terminology differs materially from the ledger, a domain-specific heuristic is needed, the protocol creates documentation without finding interaction defects, or live contracts reveal a different action or recovery boundary. |
| `UX1.1-DISC05` | Which places are first-class in Petra, and how must navigation, deep links, contextual surfaces, History, and task completion preserve meaning without restoring the crowded multi-panel shell? | Use **Projects** and **Settings** as global places. Within a Project, keep **Brief**, **Sources**, **Review**, **Graph**, **Work**, and **Composition** as stable first-class places, with registered profile tools in a separate group. Keep **Details** and **Petra** contextual and allow one expanded secondary surface by default. Make **History** a full, deep-linkable route reached deliberately from decisions, selected objects, Review, changed items, and Revert rather than a permanent primary tab. Carry Project, profile, current focus, authoritative snapshot, projection state, selected typed references, comparison state, linked thread/Work, origin, return position, unsent input, and focus through material transitions. Browser history restores application places; Graph Back/Forward restores its independent ten-step exploration trail. Deep links use opaque identities and resolve exact, current, historical, replaced, unsupported, and unauthorized targets through registered semantic place roles without leaking data or substituting ambient selection. Brief is the safe Project fallback. | Stable places make radically different profiles feel like one product, while task-specific activation and exact return state prevent navigation from turning into either a module dump or an authority-changing side effect. Keeping History reachable but non-primary preserves recovery without crowding everyday work. | `DB04`, `DB05`; `UX1.1-W01`–`W15`; `UX1.8-W02`–`W06`; all module entry/return paths; `UX-REQ-001`, `UX-REQ-004`, `UX-REQ-008`; `UX-FX19` | Revisit if authors cannot discover History, Review or Work do not justify first-class placement, Composition proves too narrow or broad across accepted profiles, one-secondary behavior blocks a material task, or semantic resolution cannot preserve exact identity without a different routing contract. |

### Contract request

`UX-REQ-001` proposes the smallest read boundary needed to replace
`UX1.1-FX01` without redesigning the accepted shell:

- **Origin:** `UX1.1-W01`, `W02`, `W06`, `W07`, and `W11`; fixture
  `UX1.1-FX01`.
- **Implementation link:** `M1.7`, consuming the Project, WorkUnit, and
  projection contracts supplied by earlier M1 slices.
- **Project-author task and failure:** orient from any primary route to one
  active Project, Project profile, current objective, authoritative revision,
  projection freshness, selection, and attention-requiring work. Without one
  read model, the client would either issue an unstable collection of
  screen-local queries, hard-code the scientific profile, or imply that local
  panel and conversation state are domain state.
- **Requested behavior:** a read-only `ProjectShellView` containing Project
  identity and revision, Project-profile identity and revision, a typed
  current-objective reference and descriptor, authoritative revision, projection
  checkpoint/freshness, review posture, attention WorkUnit references, and an
  optional selected-object reference. The scientific profile supplies the
  active ResearchQuestion reference; the shared shell does not require it.
- **Authority and persistence:** no mutation and no new authority. Profile and
  domain identities and revisions remain owned by registered contracts; active view,
  panel visibility, and collapse remain presentation-only client state.
- **Smallest viable response:** one route-addressable composite view or an
  adapter with equivalent snapshot-consistent fields. The profile binding in
  `UX-REQ-004` and the scientific ResearchQuestion/Hypothesis read shapes need
  accepted runtime contracts before production integration.
- **Owner and status:** implementation track; `proposed`. The design fixture
  and its narrow adapter are explicitly provisional. No replacement or
  rejection rationale has been recorded yet.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.1-W01` | `in_progress` | Design the context bar for Project, profile-resolved current objective, snapshot, review mode, and active work. | Project authors must always know which authoritative state they are viewing. |
| `UX1.1-W02` | `in_progress` | Design the Project map from profile-owned object and task roles; specify Questions, Hypotheses, Evidence, Experiments, and Outputs for the scientific profile without importing a contextual corpus. | Durable domain objects need stable navigation outside transcript order without hard-coding one ontology. |
| `UX1.1-W03` | `in_progress` | Define main-surface navigation through semantic roles for Brief, basis/review, Graph, Sources, and profile tools; resolve scientific labels from its profile. | Complementary representations need predictable access without becoming a tab dump or global list of every possible module. |
| `UX1.1-W04` | `in_progress` | Define Details for profile-owned identity, source, provenance, method or validator, graph, impact, and history sections. | Selection should produce one consistent route into domain-accurate detail. |
| `UX1.1-W05` | `in_progress` | Define the persistent Petra assistant frame and its collapsed, expanded, and context-linked states. | Collaboration stays available without dominating the workspace. |
| `UX1.1-W06` | `in_progress` | Preserve profile, object identity, and selection across routes, Brief, basis/review, graph, Details, and assistant. | The same domain object cannot appear to change meaning between representations. |
| `UX1.1-W07` | `in_progress` | Separate authoritative domain data, derived projections, conversation state, and local view state in the view hierarchy. | Panel state or a stream update must not look like a domain mutation. |
| `UX1.1-W08` | `planned` | Design URL-addressable loading, missing, unauthorized, unsupported-profile, stale-snapshot, and replaced-object states. | Direct links and recovery must remain semantically unambiguous. |
| `UX1.1-W09` | `in_progress` | Define split-pane resizing, collapse, restoration, and narrow-width priority without losing selection or active work. | The workbench must survive laptops and smaller windows without hidden state changes. |
| `UX1.1-W10` | `in_progress` | Define complete keyboard traversal, skip paths, focus restoration, and stable focus during streaming updates. | Dense synchronized panes must not trap or disorient keyboard users. |
| `UX1.1-W11` | `in_progress` | Keep active work and projection freshness visible without turning the shell into an operations dashboard. | Latency and stale projections matter, but the profile task remains primary. |
| `UX1.1-W12` | `in_progress` | Remove or label decorative, empty, and non-functional controls in the current shell. | Petra must not imply capability it does not have. |
| `UX1.1-W13` | `in_progress` | Create and apply the shell terminology ledger across context, navigation, selection, Details, assistant, settings, status, and recovery language, distinguishing shared control terms from profile-owned domain terms. | Stable terms must preserve their owning contract's meaning without exposing architecture or fixture jargon. |
| `UX1.1-W14` | `in_progress` | Document and audit every shell interaction path, including entry conditions, feedback, focus, persistence, commit boundaries, cancellation or reversal, adverse states, and recovery. | Project authors need predictable control when panes, routes, selections, settings, and background work change. |
| `UX1.1-W15` | `planned` | After design freeze, exercise the same shell components with paired synthetic scientific and controlled-writing conformance scenarios, including profile switching at Project boundaries and unsupported-profile failure. | Profile adaptation must be structural and typed rather than a science UI with substituted labels, and it must stand without demo data. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.1-AC01` | A project author can state the active Project, profile, current objective, snapshot, selection, and work state from any primary route. |
| `UX1.1-AC02` | Selecting one object in any synchronized surface highlights or resolves the same stable object elsewhere. |
| `UX1.1-AC03` | Collapsing or resizing a panel preserves selection, unsent local input, and active WorkUnit visibility. |
| `UX1.1-AC04` | Keyboard navigation reaches all primary surfaces and restores focus after route changes, dialogs, and streamed updates. |
| `UX1.1-AC05` | Narrow layouts preserve Project context and offer the same material actions, even when panes become sequential. |
| `UX1.1-AC06` | No placeholder control appears enabled and no preview data appears authoritative. |
| `UX1.1-AC07` | Every user-facing shell term has one documented meaning consistent with the shared control contract or owning Project profile; fixture and implementation language does not appear in product chrome. |
| `UX1.1-AC08` | Every material shell path passes the interaction-control and Nielsen heuristic audit with no unresolved issue that could cause unsupported trust, accidental mutation, lost work, provenance confusion, or loss of control. |
| `UX1.1-AC09` | Paired profile fixtures retain the same shell control meanings and accessibility while presenting distinct domain objects, relations, validators, and vocabulary. |

### Completion evidence

- `UX1.1-EV01`: [review-candidate route and state map](reports/UX1.1-SHELL-SLICE.md#ux11-ev01--route-and-state-map);
- `UX1.1-EV02`: [desktop and narrow rendered evidence](reports/UX1.1-SHELL-SLICE.md#ux11-ev02--rendered-evidence);
- `UX1.1-EV03`: [cross-view identity and keyboard trace](reports/UX1.1-SHELL-SLICE.md#ux11-ev03--interaction-and-accessibility-evidence);
- `UX1.1-EV04`: [placeholder and implied-capability audit](reports/UX1.1-SHELL-SLICE.md#ux11-ev04--capability-and-authority-audit).
- `UX1.1-EV05`: [terminology ledger and D006 interface-copy baseline](reports/UX1.1-WRITING-INTERACTION-AUDIT.md#initial-terminology-ledger);
- `UX1.1-EV06`: [shell path registry, Nielsen heuristic findings, and dispositions](reports/UX1.1-WRITING-INTERACTION-AUDIT.md); recovery traces remain required before validation.

## `UX1.2` — profile-resolved Project Brief and orientation

- **Status:** `in_progress`
- **Builds:** Petra's default profile-resolved Project home and the first scientific Research Brief payload.
- **Why:** the first screen should explain the current objective, governing basis, material conflicts or uncertainty, and useful next action in accurate profile language rather than present a dashboard or blank chat.
- **Depends on:** `UX1.0`, `UX1.1`.
- **Implementation link:** `M1.3`, `M1.6`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.2-DISC01` | What must the Project Brief let an author understand and decide on arrival without becoming a dashboard, activity feed, generic chat, or profile-specific special case? | Use one calm editorial reading column that answers: what is the current focus, what changed from a visible comparison baseline, what requires the author's judgment, what is the bounded supported state and its limits, and what next step is useful and why. Keep **Current focus** first; expand one highest-consequence **Needs your attention** item and keep the remainder compact; then show **What changed**, a typed profile-owned **Current state**, only relevant Work, one primary `SuggestedAction` with alternatives, and compact recent decisions/history. Order attention by material consequence with an exposed reason, not recency or a universal score. Acknowledgment and deferral cannot resolve the underlying condition. Each row opens the exact Details, Sources, Review, Work, Graph, Composition, History, or Petra context; direct and Petra-mediated actions share identity and command paths. A relationship preview appears only when it clarifies the current decision and has textual parity. The scientific and controlled-writing profiles supply different typed objects, relationships, validators, and terminology inside the same Brief mechanics. | The Brief must make a useful next decision obvious without recreating the simultaneous-panel shell or encoding science as Petra's universal ontology. A bounded, consequence-led reading order preserves calm, basis, profile accuracy, and user control while keeping every path inspectable. | `DB07`; `UX1.2-W01`–`W12`; `UX1.6`; `UX1.8`; `UX-REQ-002`, `UX-REQ-003`; `UX-FLOW-01`, `UX-FLOW-08`, `UX-FLOW-10`, `UX-FLOW-16` | Revisit if task testing shows that the current focus does not orient authors, one expanded attention item hides an urgent parallel decision, a required profile role cannot fit without changing shared authority semantics, or the Brief still reads as a dashboard rather than a decision surface. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.2-W01` | `in_progress` | Lead with profile-resolved current focus, scope, constraints, snapshot, and a bounded synthesis. | Authors need a clear task frame before detail. |
| `UX1.2-W02` | `in_progress` | Define the shared semantic sections and registered profile-payload boundary; keep scientific and controlled-writing objects typed rather than aliased. | The Brief must adapt without encoding one domain in its shared components. |
| `UX1.2-W03` | `in_progress` | Present one expanded attention item and a compact remainder ordered by visible material consequence rather than a score. | A calm Brief still needs to surface decisions that block or materially affect the Project. |
| `UX1.2-W04` | `in_progress` | Keep acknowledgment, deferral, review, resolution, Work completion, application, and reversal as distinct states and actions. | Clearing a presentation notice must not change domain authority. |
| `UX1.2-W05` | `in_progress` | Expose profile-owned disagreements, constraints, omissions, source limits, validation failures, stale dependents, and unresolved unknowns near the affected synthesis. | Important limits must appear before the author acts. |
| `UX1.2-W06` | `in_progress` | Preserve the scientific profile's distinct Hypothesis, evidence-relation, source-capability and limitation, alternative-landscape, temporal-standing, and evidence-frontier semantics without making them shared Brief fields. | Scientific orientation remains precise while the product stays use-agnostic. |
| `UX1.2-W07` | `in_progress` | Define the controlled-writing payload extension for revision focus, protected source lineage, canon, constraints, dependencies, validation findings, candidate state, and promotion readiness without inventing its ontology in the client. | Controlled writing needs domain-accurate orientation through the same authorial controls. |
| `UX1.2-W08` | `in_progress` | Show only focus-relevant active, blocked, awaiting-input, failed, or newly completed Work with its durable route and consequence. | The Brief must inform action without becoming an operations feed. |
| `UX1.2-W09` | `in_progress` | Present one primary SuggestedAction and compact alternatives with objective, reason, basis, readiness, output, depth, cost, duration, capability, approval, and Work state. | A generic AI button cannot communicate usefulness or consequence. |
| `UX1.2-W10` | `in_progress` | Link every material Brief statement, count, comparison, attention item, and action reason to members, relationships, source spans, results, constraints, or an explicit judgment origin. | Orientation must remain inspectable. |
| `UX1.2-W11` | `in_progress` | Design no-Project, new, no-focus, calm, early, ordinary, dense, disputed, limited, unsupported-profile, offline, partial, stale, and failed states. | The Brief must remain useful without invented content or decorative empty panels. |
| `UX1.2-W12` | `in_progress` | Design visible-baseline comparison, projection catch-up, historical inspection, return, recent decisions, and governed Revert without silently replacing or erasing prior state. | Authors need to understand what changed, what merely caught up, and how to recover. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.2-AC01` | A Project author can explain the current focus, material change, required decision, supported state, principal limitation, and next step without opening another surface. |
| `UX1.2-AC02` | No Brief element implies a universal health, confidence, truth, maturity, urgency, quality, or currentness score. |
| `UX1.2-AC03` | Every profile-specific conclusion or action respects its source capability, exactness, rights, constraint, validation, omission, and authority limits. |
| `UX1.2-AC04` | Every count, comparison, attention reason, and material synthesis statement resolves to its basis and snapshot. |
| `UX1.2-AC05` | SuggestedActions explain usefulness, basis, prerequisites, cost, and consequence before Work starts. |
| `UX1.2-AC06` | Baseline and current Brief states, Work completion, application, projection catch-up, acknowledgment, resolution, and Revert remain distinguishable. |
| `UX1.2-AC07` | Paired profile scenarios preserve the same Brief hierarchy and controls while presenting different typed semantics and terminology. |
| `UX1.2-AC08` | Dense, narrow, zoomed, keyboard, screen-reader, and non-color presentations preserve one clear decision order and every material action. |

### Completion evidence

- `UX1.2-EV01`: post-freeze paired-profile new, calm, dense, disputed, limited, active-Work, stale, offline, and failed conformance scenarios;
- `UX1.2-EV02`: attention-order, basis, comparison, and profile-payload drill-down recording;
- `UX1.2-EV03`: direct/Petra path, historical view, return, and governed-Revert recording;
- `UX1.2-EV04`: language, action-readiness, responsive, accessibility, and Nielsen audit.

## `UX1.3` — Sources and exact inspection

- **Status:** `in_progress`
- **Builds:** the Project-scoped source collection, reuse and registration
  path, exact reader, provenance path, and governed source lifecycle over
  profile-owned identities and Petra's immutable Artifact spine.
- **Why:** a Project author must know what a source is, which exact revision
  and copy Petra used, what can be inspected or transmitted, where an exact
  passage lives, and what depends on it.
- **Depends on:** `UX1.0`, `UX1.1`, `UX-REQ-004`, `UX-REQ-005`,
  `UX-REQ-008`–`UX-REQ-010`.
- **Implementation link:** `M1.2`, `M1.4`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.3-DISC01` | How should radically different Project profiles register, reuse, inspect, and govern protected source material without collapsing identity, versions, bytes, processing, rights, and downstream meaning? | Make Sources a Project-scoped working collection over reusable canonical source identities, immutable source revisions, and exact Artifacts. Preserve a separate Project source link with profile-owned role and relevance. Present content extent, available representations, exact-location precision, local availability, rights per operation, and durable processing as independent facts rather than one “depth” or quality state. Keep original content primary; expose normalized differences, selector verification, processing provenance, and downstream uses. Provide native PDF and supported structured-text readers, with honest metadata/external-open fallbacks for unsupported formats. A new version never overwrites or silently migrates existing references. **Remove from Project** changes only the Project link; **Delete local copy** is a separately confirmed retention/storage operation that preserves permitted identity, hashes, tombstone or receipt, provenance, and history. Petra may inspect only an explicitly selected source or location within the visible rights, privacy, capability, and context boundary. Relationship graphs answer named provenance or dependency questions only and have textual parity. | The same authorial controls can serve scholarly research and controlled writing only if profile semantics remain typed while source identity, immutable evidence, exact inspection, privacy, and history stay trustworthy. Separating capability from progress prevents a processed preview, unparsed full file, or structured derivative from being misrepresented as complete understanding. | `DB08`; `UX1.3-W01`–`W15`; `UX-FLOW-04`–`07`, `UX-FLOW-10`, `UX-FLOW-14`–`16`, `UX-FLOW-18`; `UX-REQ-009`, `UX-REQ-010`; `UX-FX21`, `UX-FX22` | Revisit if a required profile cannot express its source identity and revision roles without changing shared authority semantics, exact selectors cannot be rendered reliably for supported formats, Project linking cannot remain distinct from Artifact storage, or user testing shows that the independent capability dimensions cannot be understood without a different presentation. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.3-W01` | `in_progress` | Design a profile-resolved Sources collection over canonical source identity, immutable revision, exact Artifact, Project role, and reuse state. | One source should not fragment into Project-local duplicates, and Project membership must not redefine canonical identity. |
| `UX1.3-W02` | `in_progress` | Design add/reuse intake for a file, identifier, link, supported connector result, or permitted existing source, including duplicate and ambiguous-identity choices. | Registration needs an honest path before processing or extraction begins. |
| `UX1.3-W03` | `in_progress` | Expose Artifact-specific rights, access basis, local/remote availability, integrity, and per-operation permission without turning the UI into legal metadata. | Possession, readability, processing, remote egress, quotation, export, and redistribution are different permissions. |
| `UX1.3-W04` | `in_progress` | Present content extent, representation set, location precision, local availability, rights, and processing as independent dimensions. | A single source-depth badge would misstate what Petra has and what it can do. |
| `UX1.3-W05` | `in_progress` | Preserve scientific **Abstract only** as a profile-owned preview limitation while allowing other profiles to define accurate preview semantics. | Shared controls must stay neutral without weakening science-specific restrictions. |
| `UX1.3-W06` | `in_progress` | Design native PDF and supported structured-text readers with source-native navigation, exact selection, surrounding context, and stable return position. | An exact location is useful only when the author can inspect it in the source. |
| `UX1.3-W07` | `in_progress` | Keep original content primary and show normalized or structured representations, parser identity, transformations, and material diffs explicitly. | Cleanup and parsing must not silently become the source. |
| `UX1.3-W08` | `in_progress` | Expose exact-location verification and honest structural, visual-only, unresolved, invalidated, and unavailable fallbacks. | Petra must not label a location exact when it cannot resolve against immutable content. |
| `UX1.3-W09` | `in_progress` | Link source identity, revision, Artifact, and exact location to typed current and historical downstream uses, with a bounded graph only for a named provenance or dependency task. | Authors need impact and provenance without a decorative network view. |
| `UX1.3-W10` | `in_progress` | Design additive version comparison, correction/replacement warnings, affected-dependent inspection, and deliberate adoption or retention. | New source material can make downstream work stale but cannot rewrite its history. |
| `UX1.3-W11` | `in_progress` | Design Petra context for a selected source or exact location with visible inclusions, exclusions, representation, surrounding range, rights, and local/remote processing boundary. | Selection must not silently broaden context or grant external transmission. |
| `UX1.3-W12` | `in_progress` | Design queued, running, partial, needs-input, failed, cancelled, blocked, superseded, unsupported, offline, and unavailable states with preserved Work and safe recovery. | Imperfect source access and parsing are ordinary product states, not exceptions to hide. |
| `UX1.3-W13` | `in_progress` | Specify **Remove from Project** as a governed Project-link change with dependency preview, retained provenance, and eligible Revert. | Removing current Project use must not imply deleting the canonical source or its history. |
| `UX1.3-W14` | `in_progress` | Specify **Delete local copy** as a separately confirmed storage/retention operation with dependency and policy checks, retained tombstone or receipt, and reacquisition consequences. | Destructive local-byte handling must remain distinguishable from Project reversal and historical erasure. |
| `UX1.3-W15` | `in_progress` | Preserve reader position, exact selection, origin, focus, unsent Petra text, resizing, reflow, keyboard paths, screen-reader structure, touch access, and non-color meaning across synchronized surfaces. | Exact inspection must remain usable for long, dense work and assistive technology. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.3-AC01` | The shared Sources architecture supports paired profile-owned source types without aliases or profile-specific control semantics. |
| `UX1.3-AC02` | Canonical identity, immutable revision, exact Artifact, Project link, exact location, and downstream use remain distinguishable. |
| `UX1.3-AC03` | Content extent, representations, exact-location precision, local availability, rights, and processing cannot collapse into one depth, readiness, or quality state. |
| `UX1.3-AC04` | Every displayed exact passage opens in honest surrounding context or states precisely why it cannot. |
| `UX1.3-AC05` | Original and normalized content, transformations, parser identity, and selector verification remain inspectable. |
| `UX1.3-AC06` | Reuse avoids duplicate canonical identities without leaking or broadening Project, actor, copy, or operation permission. |
| `UX1.3-AC07` | A new or corrected revision identifies affected objects without overwriting, silently upgrading, or moving their source references. |
| `UX1.3-AC08` | Direct and Petra-mediated inspection preserve the same identity, revision, Artifact, location, context, rights, and return path. |
| `UX1.3-AC09` | Unsupported, partial, failed, ambiguous, offline, unavailable, and rights-limited states expose an accurate recovery or no-path state. |
| `UX1.3-AC10` | Remove from Project and Delete local copy have different previews, authority effects, retention behavior, receipts, and recovery language. |
| `UX1.3-AC11` | Dense, narrow, zoomed, keyboard, screen-reader, touch, resized-panel, and non-color presentations preserve exact inspection and actions. |
| `UX1.3-AC12` | No source or processing state implies truth, completeness, authority, quality, or sharing permission that it does not establish. |

### Completion evidence

- `UX1.3-EV01`: post-freeze `UX-FX21` paired-profile collection, registration,
  reader, exact-location, Petra-context, provenance, and accessibility record;
- `UX1.3-EV02`: post-freeze `UX-FX22` duplicate, ambiguity, preview, partial,
  failed, unsupported, rights-limited, offline, unavailable, newer-revision,
  removal, deletion, and retention-blocked recovery record;
- `UX1.3-EV03`: source identity/revision/Artifact/Project-link and
  exact-location resolution trace;
- `UX1.3-EV04`: version-impact, downstream-use, original/normalized diff, and
  bounded relationship-graph textual-parity audit; and
- `UX1.3-EV05`: `UX-REQ-009`/`UX-REQ-010` contract disposition and
  destructive-action language/authority audit.

## `UX1.4` — basis, candidates, review, and trusted changes

- **Status:** `in_progress`
- **Builds:** the use-agnostic working-candidate and accountable-decision layer
  across natural conversation, optional graph inspection, profile validation,
  exact change preview, application, recovery, and Revert.
- **Why:** authors should not operate a graph form or approve every structured
  observation, but no author, model, Work, import, or validator output may
  silently become governed Project state.
- **Depends on:** `UX1.0`, `UX1.1`, `UX1.3`, `UX-REQ-004`, `UX-REQ-006`–
  `UX-REQ-008`, `UX-REQ-011`, and `UX-REQ-012`.
- **Implementation link:** `M1.5`, `M1.6`, `M1.7`, and later profile contracts.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.4-DISC01` | How should natural interaction become inspectable graph structure and reach accountable Review without making Petra the content author, forcing graph controls, or hiding authority consequences? | Treat the graph as an inspectable semantic substrate rather than a data-entry interface. A named model role translates bounded natural conversation and Work into durable, profile-valid, non-authoritative candidates, relationships, basis links, provenance, uncertainty, and validation inputs. Petra presents and governs these records but does not propose, believe, decide, or take authorship. Ordinary structuring and mechanical repair remain quiet; the author inspects graph or textual controls by choice. Review begins only when an accountable Project decision is required. One durable task-sized Review session uses Current, Candidate, Origin, Basis, Difference, Consequences, and Decision roles; leads with material exceptions without hiding ordinary members; supports natural correction and exact inspection; and compiles a human-readable **Changes to apply** preview only when commitment-ready. A structured checkpoint, never ordinary conversational assent, authorizes the exact ChangeSet. One ChangeSet is atomic; a Review session may contain several independently atomic ChangeSets and must disclose partial member outcomes. Apply, Reject candidate, Decide later, Edit candidate, Change basis, Separate changes, Prepare reversal, and Revert change preserve distinct authority and history effects. Graph Back/Forward, working-revision restoration, and governed Revert remain separate. | Petra should absorb semantic bookkeeping from natural collaboration without turning model inference into accepted truth. Separating working structure, accountable review, command atomicity, and projection state makes the experience calm while retaining exact origin, basis, consequence, recovery, and user control across radically different profiles. | `DB09`; `UX1.4-W01`–`W15`; `UX1.5`; `UX1.6`; `UX1.8`; `UX-FLOW-02`, `UX-FLOW-03`, `UX-FLOW-06`–`08`, `UX-FLOW-10`–`12`, `UX-FLOW-15`, `UX-FLOW-16`; `UX-REQ-004`, `UX-REQ-006`–`UX-REQ-008`, `UX-REQ-011`, `UX-REQ-012`; `UX-FX23` | Revisit if a required profile cannot map its objects into the shared comparison and authority roles, natural structuring creates unacceptable interruption or hidden semantic drift, authors cannot distinguish working and authoritative graph layers, ReviewBatch transaction boundaries cannot be explained safely, or task evaluation shows that exact commitment is either too frequent or too easy to misunderstand. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.4-W01` | `in_progress` | Specify bounded conversation and Work as inputs to durable, profile-valid, non-authoritative working candidates and relationships with exact producer, task, snapshot, and revision lineage. | The model should perform semantic structuring without making the author operate graph fields or turning its output into authority. |
| `UX1.4-W02` | `in_progress` | Distinguish candidate, technical proposal, validation finding, basis, provenance, Review session, ChangeSet, decision, event, and projection roles. | Similar-looking records answer different authorship and authority questions. |
| `UX1.4-W03` | `in_progress` | Keep ambient working-graph updates quiet while exposing exact graph and textual inspection of origin, basis, uncertainty, validation, omissions, and current authority layer. | Inspectability should be available without becoming routine interface ceremony. |
| `UX1.4-W04` | `in_progress` | Trigger Review only for accountable Project decisions and preserve one task-sized Review identity across contextual checkpoint, focus workspace, and main Review route presentations. | Generated information should not flood an inbox, and contextual entry must not create a second approval system. |
| `UX1.4-W05` | `in_progress` | Use Current, Candidate, Origin, Basis, Difference, Consequences, and Decision as profile-neutral comparison roles with profile-owned object renderers and terminology. | Scientific and controlled-writing Projects need the same mechanics without semantic aliases. |
| `UX1.4-W06` | `in_progress` | Present principal basis, counter-basis or limitation, and affected scope by default; retain exact revisions, locations, included and excluded context, lineage, and technical identifiers for inspection. | Review should be calm without hiding the material grounds of a decision. |
| `UX1.4-W07` | `in_progress` | Separate automatic mechanical repair, findings that need judgment, and commitment-blocking validation; never present passed checks as truth or authority. | Validation should reduce effort without deciding substantive meaning. |
| `UX1.4-W08` | `in_progress` | Lead sessions with unresolved exceptions and count, preserve, and expose every ordinary member and applicable check. | Exception-led review must not become selective evidence hiding. |
| `UX1.4-W09` | `in_progress` | Let the active task model explain and revise exact working candidates conversationally while labeling explanation-only, candidate-updated, preview-updated, and unable-to-proceed outcomes. | Natural correction should remain primary without making conversation an authority channel. |
| `UX1.4-W10` | `in_progress` | Compile **Changes to apply** only when commitment-ready and show exact operations, snapshot, dependencies, limitations, validator and policy effects, unchanged protected state, and projection consequence. | The commitment action must match the canonical ChangeSet rather than a friendly but incomplete summary. |
| `UX1.4-W11` | `in_progress` | Specify Apply, Reject candidate, Decide later, Edit candidate, Change basis, Separate changes, Prepare reversal, and Revert change with exact revision, authority, and history behavior. | Correction and recovery require more than binary approval without multiplying governance systems. |
| `UX1.4-W12` | `in_progress` | Distinguish one atomic ChangeSet from a Review session containing independently atomic ChangeSets; preflight known conflicts and expose every member outcome without silent partial success. | Accepted batch execution permits precise progress and retry but must not mislead authors about transaction boundaries. |
| `UX1.4-W13` | `in_progress` | Design stale, conflict, deferred, blocked, applying, failed, partly completed, applied/projection-pending, current, rejected, superseded, and unauthorized states with bounded recovery and exact return. | Authority, command completion, and graph freshness can diverge without becoming ambiguous. |
| `UX1.4-W14` | `in_progress` | Distinguish ten-state graph Back/Forward, working-revision restoration, recent-ten applied changes, full History, and compensating Revert. | Navigation and drafting recovery must not be mistaken for authoritative erasure. |
| `UX1.4-W15` | `in_progress` | Preserve complete textual parity, reading order, keyboard and focus behavior, text scaling, touch access, panel resize, forced colors, reduced motion, non-drag actions, and non-color meaning. | Review must remain complete without a graph, wide screen, pointer, or visual-only encoding. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.4-AC01` | Natural task conversation can create and revise inspectable working graph structure without graph entry or authoritative mutation. |
| `UX1.4-AC02` | Every candidate and finding names its actual author, model role, Work, extraction, import, or validator origin; Petra is never presented as the content author or decision maker. |
| `UX1.4-AC03` | Basis and provenance remain distinct, exact, limitation-aware, and available in synchronized graph and textual views. |
| `UX1.4-AC04` | One Review identity supports contextual and main-route presentations and returns to the exact originating task. |
| `UX1.4-AC05` | Profile-owned renderers fill the shared comparison roles without changing control, authority, or history meanings. |
| `UX1.4-AC06` | Exceptions lead without hiding ordinary members, applicable validations, or the complete inspection path. |
| `UX1.4-AC07` | Conversational correction creates new candidate revisions, but ordinary chat, Work completion, graph selection, and batch selection cannot apply authority. |
| `UX1.4-AC08` | The human **Changes to apply** preview resolves exactly to the applicable ChangeSet operations and atomic boundary. |
| `UX1.4-AC09` | Direct and model-mediated paths resolve to the same candidate, Review, decision, command, and resulting revisions. |
| `UX1.4-AC10` | Independent batch members expose individual applied, rejected, failed, and unapplied outcomes and never present partial completion as whole success. |
| `UX1.4-AC11` | Correction, stale refresh, projection lag, failure, and Revert preserve exact lineage and additive history. |
| `UX1.4-AC12` | The entire comparison and decision works at supported viewports and text scales through keyboard, screen reader, touch, non-drag controls, and textual graph parity. |

### Completion evidence

- `UX1.4-EV01`: post-freeze `UX-FX23` paired-profile natural-conversation,
  working-graph, optional-inspection, and exact-origin record;
- `UX1.4-EV02`: ordinary, exception-heavy, limited-basis, blocked, corrected,
  stale, and deferred Review recordings;
- `UX1.4-EV03`: direct-versus-model-mediated candidate, Review, command, and
  revision identity trace;
- `UX1.4-EV04`: single atomic and partial independent-batch application,
  projection lag, failure, and Revert scenarios;
- `UX1.4-EV05`: prohibited implicit-approval and misleading-attribution audit;
  and
- `UX1.4-EV06`: responsive, keyboard, focus, screen-reader, touch, graph/text,
  non-color, and panel-resize evaluation.

## `UX1.5` — focused graph and provenance inspection

- **Status:** `planned`
- **Builds:** task-bounded graph views and their textual equivalents.
- **Why:** Petra must demonstrate that graph structure controls retrieval, review, and generation while remaining understandable to researchers who do not operate a graph database.
- **Depends on:** `UX1.0`, `UX1.1`, `UX1.2`, `UX1.3`.
- **Implementation link:** `M1.3`, `M1.5`, `M1.6`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.5-DISC01` | What should graph depth mean, when is 3D justified, and which renderer candidates should Petra evaluate? | Keep 2D authoritative and primary. Define every view by active object, scientific task, hop depth, edge allowlist, snapshot, and projection position. Drive expansion through meaningful actions such as **Show contrary evidence** and **Trace exact sources**, preserve the mental map, and provide back, forward, home, pin, collapse, and reset. Support task-specific Provenance, Neighborhood, Disagreement, Comparison, Impact, and Time layouts with semantic zoom and restrained selected-path motion plus a reduced-motion alternative. Allow literal 3D only when the z-axis represents a named scientific dimension, testing shows a comprehension benefit, full 2D and textual parity exists, and selection plus camera state can be reset, bookmarked, and shared accessibly. Feed a renderer-neutral `FocusedGraphViewModel` into Cytoscape.js as the primary 2D candidate, textual-path and evidence-matrix peer views, and Reagraph as the optional 3D candidate. Do not evaluate yFiles in this slice. No renderer may query Neo4j directly or own authority, permissions, or mutation. Compare candidates on a frozen fixture before adding a dependency. | A graph should look compelling because it exposes scientific structure, not because the camera is novel. Depth is first a scientific and query-scope concept. The adapter boundary avoids renderer lock-in, and textual parity keeps graph evidence understandable and accessible. | `UX1.5-W01`–`UX1.5-W12`, `UX1.5-AC01`–`UX1.5-AC06`, `M1.3`, `M1.5`, `M1.6`, `M1.7`, graph scene and focused-view contracts | Revisit if Cytoscape.js fails density, layout, stability, or accessibility budgets; Reagraph cannot provide 3D parity; a comprehension study demonstrates a necessary 3D benefit; a real fixture requires another renderer; or an engine pressures the client toward direct projection coupling. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.5-W01` | `in_progress` | Define initial graph tasks: inspect evidence, trace provenance, compare alternatives, inspect contradiction, review a change, and explain a generated statement. | A graph view should answer a question rather than expose the whole corpus. |
| `UX1.5-W02` | `in_progress` | Bound each view by active object, task, depth, edge allowlist, snapshot, and projection position. | Focus and latency need explicit graph scope. |
| `UX1.5-W03` | `in_progress` | Define node treatments for Question, Hypothesis, Claim, Assertion, Work, WorkVersion, SourceSpan, Experiment, Result, and DraftSpan. | Scientific objects should not appear as generic graph database records. |
| `UX1.5-W04` | `in_progress` | Define edge line, label, direction, origin, trust, and review treatments for support, contradiction, qualification, failed replication, citation, and derivation. | Relation semantics cannot depend on color or proximity alone. |
| `UX1.5-W05` | `planned` | Distinguish source-reported, proposed, trusted, inferred, superseded, and stale-projection paths. | A visible edge must reveal why it exists and how much authority it has. |
| `UX1.5-W06` | `in_progress` | Synchronize graph selection with the Brief, evidence view, source inspector, assistant, and route. | The graph is one representation of stable objects, not a separate explorer. |
| `UX1.5-W07` | `in_progress` | Design a path inspector with edge rationale, source spans, scope compatibility, snapshot, and projection freshness. | Users need to inspect the meaning behind a path. |
| `UX1.5-W08` | `in_progress` | Provide a textual path, evidence matrix, or timeline whenever it explains the relationship more clearly or accessibly. | Node-link graphics are not always the best scientific representation. |
| `UX1.5-W09` | `in_progress` | Design progressive expansion, filters, grouping, saved views, and a clear return to the active object. | Larger reused corpora must remain navigable. |
| `UX1.5-W10` | `planned` | Make drag, relink, split, narrow, and relation changes produce typed draft commands and visible previews. | Direct graph manipulation cannot mutate Neo4j or trusted state directly. |
| `UX1.5-W11` | `planned` | Design current, loading, partial, empty, disconnected, stale, and projection-rebuilding states without layout collapse. | Graph failures and lag need honest recovery. |
| `UX1.5-W12` | `in_progress` | Establish density and performance budgets based on real fixtures before choosing rendering optimizations. | A fast graph must preserve labels, selection, semantics, and accessibility. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.5-AC01` | A researcher can distinguish citation, support, contradiction, qualification, and inference without relying on color. |
| `UX1.5-AC02` | Every visible path states its snapshot, trust/origin, and projection freshness or provides a direct inspector route. |
| `UX1.5-AC03` | The graph opens focused on a scientific task and never defaults to an unrestricted corpus hairball. |
| `UX1.5-AC04` | The same provenance question can be answered through an accessible textual representation. |
| `UX1.5-AC05` | Direct graph edits create previews and use the same command path as other review actions. |
| `UX1.5-AC06` | Expanding, filtering, streaming, or projection refresh does not lose the active selection unexpectedly. |

### Completion evidence

- `UX1.5-EV01`: task-bounded graph fixture set;
- `UX1.5-EV02`: relation-identification and provenance-comprehension review;
- `UX1.5-EV03`: graph/text parity and keyboard-path evidence;
- `UX1.5-EV04`: dense, stale, disconnected, and projection-rebuild performance record.

## `UX1.6` — Petra assistant, suggested actions, and active work

- **Status:** `in_progress`
- **Builds:** the use-agnostic interaction layer over profile-owned objects, bounded context, WorkUnits, proposals, and history.
- **Why:** Petra should save time and feel responsive while keeping basis, action, cost, authority, uncertainty, and recovery legible.
- **Depends on:** `UX1.0`–`UX1.5` view semantics.
- **Implementation link:** `M1.5`, `M1.6`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.6-DISC01` | What is Petra's central AI interaction model, and how can authors recover from wrong graph or Project paths without confusing presentation history with authority? | Petra is one task-linked interaction system presented as a quiet dock, resizable contextual sidecar, focus workspace, or full-width narrow route. It is not a generic chat or a separate authority surface. Each turn binds explicit Project, profile, objective, snapshot, included and excluded context, basis, capabilities, policies, and applicable control revisions. Petra returns a grounded answer, previews a `SuggestedAction` before material Work, or routes a mutation through the same exact `ChangeSet` review used by direct controls. Conversation is editorial; durable Work, observable roles, interrupts, cost, cancellation, replay, proposals, and results remain inspectable without raw protocol chatter or private reasoning. Threads are Project-scoped and task-linked. Graph exploration has a ten-state local Back/Forward history. **Recent changes** exposes the ten most recent eligible author-visible changes, and **Revert change** opens a validated compensating `ChangeSet`; the full additive history remains intact. Thread branching and Work cancellation do not rewind Project state. | Petra is central to the product, but a chat-first model would hide context, work, authority, and recovery. Separating graph view history from governed reversal gives authors a fast exit from unhelpful exploration while preventing a visualization engine or an “undo” label from erasing provenance and decisions. | `DB06`; `UX1.1-W05`; `UX1.4-W05`, `W09`, `W11`; `UX1.5`; `UX1.6-W01`–`W15`; `UX-REQ-003`, `UX-REQ-006`, `UX-REQ-007`; `UX-FLOW-10`–`12`, `UX-FLOW-16` | Revisit if task testing shows that a presentation loses context, ten view states are insufficient for ordinary graph exploration, the recent-ten Project window hides needed recovery, a profile needs materially different context semantics, or the command layer cannot produce safe compensating plans without changing the accepted authority model. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.6-W01` | `in_progress` | Specify dock, resizable sidecar, focus workspace, and narrow-route presentations around active Project, profile, objective, selection, snapshot, review posture, and capabilities. | Relevant context should remain explicit without making Petra dominate every task. |
| `UX1.6-W02` | `in_progress` | Apply Felicity and Grice to responses: useful conclusion early, sufficient basis, relevance, stable shared terms, profile-owned terminology, calibrated force, and natural language. | Petra's identity and authority boundaries must remain consistent across profiles and models. |
| `UX1.6-W03` | `in_progress` | Resolve profile-owned object identity through a stable descriptor on first mention and compact identity thereafter; the scientific profile may render `H12 — descriptor`. | Stable shorthand remains understandable without hard-coding scientific identifiers into the shared assistant. |
| `UX1.6-W04` | `in_progress` | Visually and linguistically distinguish source report, extraction, observation or result, profile-valid inference, author judgment, named model or Work output, uncertainty, recommendation, question, and action. | Fluent prose must not erase origin or force or present Petra as the content author. |
| `UX1.6-W05` | `in_progress` | Replace mandatory assistant modes with three explicit outcomes: answer from bounded basis, preview a `SuggestedAction`, or prepare an exact governed change. Attach adjustable depth and scope to the action objective. | Depth should bound work without making authors predict an implementation mode before asking. |
| `UX1.6-W06` | `in_progress` | Present SuggestedActions with readiness, output, alternatives, missing prerequisites, context, budget, latency, capability, approval, interrupt, reuse, and cancellation consequences. | Authors need to know whether Work is useful and governable before starting it. |
| `UX1.6-W07` | `in_progress` | Design progressive response stages for current snapshot, cached result, bounded active analysis, stopped response, partial result, and newly completed material. | Petra can feel fast without presenting unfinished or invalid output as final. |
| `UX1.6-W08` | `in_progress` | Expose Work plans, accountable roles, tools, validators, queries, checkpoints, and result changes without raw protocol noise or private chain-of-thought. | Transparency should explain work rather than simulate internal reasoning. |
| `UX1.6-W09` | `in_progress` | Design clarification, capability, budget, validation, and review interrupts with objective, exact consequence, affected objects, safe waiting behavior, and return path. | An interrupt must support a real decision rather than ask the author to “continue.” |
| `UX1.6-W10` | `in_progress` | Distinguish stop response, keep running in background, disconnect, reconnect, replay, resume, steer, and explicitly cancel durable Work. | Connection, presentation, response, and Work controls have different consequences. |
| `UX1.6-W11` | `in_progress` | Render latency and cost as measured or estimated values with basis and update state. | Resource consequences should be visible without dominating the conversation. |
| `UX1.6-W12` | `in_progress` | Consume only Petra hooks and view models; keep raw AG-UI events inside the integration module. | Protocol changes must not reshape product or profile components. |
| `UX1.6-W13` | `in_progress` | Design model substitution, fallback, unavailable, malformed, unvalidated, and partial-output states without changing Petra's identity, origin rules, or authority semantics. | A multiple-model harness needs one durable interaction contract. |
| `UX1.6-W14` | `in_progress` | Design proactive preparation as bounded, cancellable Work that cannot silently mutate governed Project state. | Useful preparation must remain visible, attributable, and controllable. |
| `UX1.6-W15` | `in_progress` | Specify Project-scoped task threads, stale-snapshot choices, branching, ten-state graph Back/Forward, a recent-ten Project-change window, exact Revert previews, full-history access, and textual parity. | Authors need fast recovery from wrong paths without erasing provenance or confusing graph state with authority. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.6-AC01` | A Project author can identify the available bounded context, what a named model or Work is calculating, which candidates exist and who or what produced them, what requires a decision, and what has become authoritative. |
| `UX1.6-AC02` | Profile-resolved first-mention descriptors and origin/force distinctions pass the D006 language scenarios. |
| `UX1.6-AC03` | SuggestedActions state the Project purpose, basis, cost, scope, and material consequence before Work starts. |
| `UX1.6-AC04` | Dropping or stopping a stream cannot look like cancelling its durable WorkUnit. |
| `UX1.6-AC05` | Reconnect and replay do not duplicate a command, assistant turn, or ChangeSet application. |
| `UX1.6-AC06` | No feature component imports or switches on raw AG-UI event types. |
| `UX1.6-AC07` | Switching a conformance model preserves Petra's identity, references, profile-valid force, and action semantics. |
| `UX1.6-AC08` | Graph Back/Forward restores the ten most recent meaningful exploration states without changing Project state. |
| `UX1.6-AC09` | Recent changes exposes ten eligible changes for quick access; Revert previews a compensating ChangeSet, retains full history, and explains ineligible or conflicted reversals. |
| `UX1.6-AC10` | Branching a thread or cancelling Work cannot be mistaken for rewinding authoritative Project state. |

### Completion evidence

- `UX1.6-EV01`: concise, multi-object, conflict, limited-basis, failed-run, and review-batch interaction records across paired profiles;
- `UX1.6-EV02`: action, interrupt, resume, replay, detach, cancel, branch, graph Back/Forward, and governed Revert recording;
- `UX1.6-EV03`: raw AG-UI import boundary check;
- `UX1.6-EV04`: model-substitution, latency, cost, full-history, and recent-ten recovery evaluation.

## `UX1.7` — DraftArtifacts, provenance, and citations

- **Status:** `planned`
- **Builds:** the first usable scientific writing and export experience.
- **Why:** Petra should help researchers compose sections, citations, BibTeX, and LaTeX without publishing wholesale or losing the origin and force of each statement.
- **Depends on:** `UX1.1`, `UX1.2`, `UX1.3`, `UX1.6`.
- **Implementation link:** `M1.8`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.7-W01` | `planned` | Design the CompositionRequest around purpose, audience, scope, snapshot, and requested format. | Drafting needs an explicit bounded request. |
| `UX1.7-W02` | `planned` | Show an inspectable CompositionPlan and its EvidencePacket assignment. | Researchers should see how evidence is intended to support the prose. |
| `UX1.7-W03` | `planned` | Map material DraftSpans to evidence, source, inference, researcher language, or explicit unsupported origin. | Provenance must operate at the statement level. |
| `UX1.7-W04` | `planned` | Provide inline inspection of source force, scope, version, and citation from the draft. | Writing should not require leaving the composition context to verify support. |
| `UX1.7-W05` | `planned` | Design immutable revision history, comparison, edit origin, stale provenance, and revalidation. | Human editing can change scientific meaning and support. |
| `UX1.7-W06` | `planned` | Render Markdown and LaTeX from one scientific content revision. | Formats must not diverge in claim meaning. |
| `UX1.7-W07` | `planned` | Generate, inspect, and copy BibTeX and canonical citations for exact WorkVersions. | Citation convenience must preserve source identity. |
| `UX1.7-W08` | `planned` | Apply Felicity editing while showing any claim-force, scope, origin, or citation validation failure. | Clearer prose cannot silently strengthen the science. |
| `UX1.7-W09` | `planned` | Design unsupported, disputed, abstract-only, superseded, and stale-snapshot DraftSpan warnings. | Draft quality should reflect the evidence boundary. |
| `UX1.7-W10` | `planned` | Design copy, download, and future-adapter actions as scoped artifact operations. | Petra supports researchers' workflows without pretending to publish a paper. |
| `UX1.7-W11` | `planned` | Preserve manual edits and selection through generation, validation, and renderer failures. | A failed operation must not destroy researcher work. |
| `UX1.7-W12` | `planned` | Provide a textual provenance report suitable for external review. | Explainability should survive outside Petra's graph visualization. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.7-AC01` | Every material generated statement resolves to evidence or an explicit non-evidence origin. |
| `UX1.7-AC02` | Markdown, LaTeX, BibTeX, and the in-app view refer to the same WorkVersions and scientific content revision. |
| `UX1.7-AC03` | Editing creates a new revision and visibly invalidates affected provenance or citations until revalidated. |
| `UX1.7-AC04` | Felicity changes cannot pass when they alter validated force, scope, origin, or citation meaning. |
| `UX1.7-AC05` | Export failure preserves the DraftArtifact and gives a bounded recovery action. |
| `UX1.7-AC06` | The experience offers scoped composition assistance, not an unsupported wholesale-publication workflow. |

### Completion evidence

- `UX1.7-EV01`: DraftSpan-to-SourceSpan provenance trace;
- `UX1.7-EV02`: renderer and citation parity fixtures;
- `UX1.7-EV03`: human-edit, stale-provenance, and revalidation recording;
- `UX1.7-EV04`: Felicity force-preservation results.

## `UX1.8` — integrated design hardening and M1 closure

- **Status:** `in_progress`
- **Builds:** one coherent, resilient workbench and transition system from all accepted product modules.
- **Why:** individually coherent surfaces can still produce a confusing product when task intent, selection, identity, hierarchy, language, responsiveness, or recovery crosses module boundaries.
- **Depends on:** `UX1.0`–`UX1.7` integrated; `M1.9` acceptance environment.
- **Implementation link:** `M1.9`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.8-DISC01` | What complete flow and transition contract prevents Petra's modules from becoming disconnected destinations? | Use one governed authorial loop across the 18 accepted flow families: orient; select the decision, uncertainty, source, relationship, Work, or output; inspect the smallest adequate basis; answer, act, or preview bounded Work; inspect result, limitation, provenance, validation, and impact; apply, correct, reject, defer, branch, cancel, or reverse; distinguish authority, projection, and historical state; and return to the originating item or updated Brief. Every transition names its origin, semantic destination, optional contextual surface, preserved state, commit point, terminal outcome, recovery, and return. A Work result routes to Review for proposed authority, Composition for an output, its origin for a read-only answer, or Work for retained failure. Direct and Petra-mediated variants converge on the same identities and commands. Each profile maps typed meaning into this grammar without aliasing its ontology, and every material path has responsive and accessible parity. | A screen inventory cannot prove that a person can complete work. An explicit cross-module contract prevents lost context, duplicate governance, generic success states, and dead ends while making adverse-state and accessibility testing finite. | `DB05`; all `UX-FLOW-01`–`18` and `UX-PATH-01`–`04`; accepted surface-transition and flow-to-place matrices; `UX1.8-W02`–`W08`; `UX-REQ-001`–`UX-REQ-012` | Revisit if a material user goal lacks an entry or terminal state, a profile cannot map into the shared loop, task testing exposes a dead end or false return, or a required transition cannot preserve identity and authority through the accepted navigation context. |

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.8-W01` | `planned` | Run a module-by-module visual pass in the order shell, Brief, Papers, evidence, graph, assistant, drafting. | The dedicated pass can improve specifics after the architecture is real. |
| `UX1.8-W02` | `in_progress` | Specify and later run an end-to-end hierarchy and synchronization pass across the complete accepted flow and place architecture. | Local optimization must not fragment the overall experience. |
| `UX1.8-W03` | `planned` | Validate every shared state from current through cached, running, awaiting input, proposed, applied, stale, failed, cancelled, and blocked. | Rare states are where scientific and operational confusion is most costly. |
| `UX1.8-W04` | `planned` | Test responsive behavior, text zoom, dense data, long titles, long descriptors, and multilingual source metadata. | Real literature and research questions exceed demo-length content. |
| `UX1.8-W05` | `planned` | Complete keyboard, screen-reader, focus, contrast, motion, graph-alternative, and target-size review. | Accessibility is a system property, not a component afterthought. |
| `UX1.8-W06` | `planned` | Exercise slow, offline, reconnecting, stale-projection, worker-failed, model-failed, and renderer-failed paths. | Petra must remain understandable when the system is not healthy. |
| `UX1.8-W07` | `planned` | Validate local-response immediacy, progressive work, layout stability, and active-work visibility with measured traces. | “Lightning fast” should come from bounded local behavior and honest progression. |
| `UX1.8-W08` | `planned` | Conduct task-based evaluations for orientation, source verification, contradiction inspection, proposal correction, cancellation, and citation tracing. | Petra needs evidence that researchers can perform the core scientific tasks. |
| `UX1.8-W09` | `planned` | Establish visual-regression coverage for stable routes and state fixtures. | Later implementation work should not silently erode accepted design behavior. |
| `UX1.8-W10` | `planned` | Resolve all critical design debt and assign every remaining item to a later milestone or named trigger. | M1 should close with known limits rather than forgotten polish work. |
| `UX1.8-W11` | `planned` | Replace demo copy and unlabeled preview content with contract-backed data or explicit fixtures. | A public demonstration must not imply evidence Petra has not processed. |
| `UX1.8-W12` | `planned` | Record the final M1 design system, module decisions, exceptions, and evaluation evidence. | Future public and experiment work needs a durable design baseline. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.8-AC01` | The complete M1 acceptance demonstration can be performed without losing project, snapshot, selection, provenance, or active-work orientation. |
| `UX1.8-AC02` | All primary actions and scientific relationships have keyboard-accessible, non-color-dependent paths. |
| `UX1.8-AC03` | No asynchronous, failure, or projection-lag state is presented as current authoritative science. |
| `UX1.8-AC04` | Critical task evaluations reveal no unresolved issue that could cause unsupported trust, accidental mutation, lost work, or provenance confusion. |
| `UX1.8-AC05` | Stable fixture routes pass visual-regression review at the supported viewport and text-scale matrix. |
| `UX1.8-AC06` | The M1 design-debt register contains no unowned critical item. |

### Completion evidence

- `UX1.8-EV01`: full M1 screen and interaction recording;
- `UX1.8-EV02`: accessibility conformance report;
- `UX1.8-EV03`: adverse-state, latency, and recovery report;
- `UX1.8-EV04`: task-evaluation findings and dispositions;
- `UX1.8-EV05`: visual-regression baseline and final debt register.

## Required fixture scenarios

The fixture gallery reuses stable objects across modules. It should remain small enough to understand and varied enough to expose dangerous assumptions.

| ID | Scenario | Required pressure |
| --- | --- | --- |
| `UX-FX01` | Early project | Rough question, tentative `H12 — descriptor`, little evidence, no alternatives found yet |
| `UX-FX02` | Seminal but not current | Strong intra-paper argument from an older WorkVersion with limited dialogue with current literature |
| `UX-FX03` | Abstract-only paper | Broad source report allowed; method and validity detail unavailable |
| `UX-FX04` | Full-text supported proposal | Exact SourceSpan, scope, source stance, and ordinary review path |
| `UX-FX05` | Scope qualification | Apparently conflicting Claims become a qualification after population or outcome inspection |
| `UX-FX06` | Direct contradiction | Competing Assertions with visible provenance and no premature global refutation |
| `UX-FX07` | Failed replication | Distinct relation, protocol context, and mature-Hypothesis obligation |
| `UX-FX08` | Review exception batch | Mostly routine proposals plus causal language, identity ambiguity, correction, and mature-Hypothesis impact |
| `UX-FX09` | Projection lag | PostgreSQL change committed while Neo4j remains stale and rebuilding |
| `UX-FX10` | Agentic interruption | Background alternative search requests input, reconnects, resumes, and remains cancellable |
| `UX-FX11` | Model and worker failure | Partial activity retained; no proposal or answer masquerades as completed |
| `UX-FX12` | Edited draft | Human wording invalidates one provenance link and citation until revalidation |
| `UX-FX13` | Resolve a material contradiction | Active question and `H12 — descriptor`, contrary and qualifying evidence, source limitation, review item, current graph answer, and active Work remain inspectable through one decision |
| `UX-FX14` | Bounded investigation lifecycle | Versioned action can be previewed and started, requests input or budget direction, survives detach and reconnect, remains cancellable, and returns a reviewable result without applying it |
| `UX-FX15` | Paired synthetic Project profiles | Independently invented scientific and controlled-writing conformance Projects use the same shell, Work, proposal, review, provenance, approval, cancellation, promotion, recovery, and history controls while resolving different typed domain objects, relationships, validators, surfaces, and vocabulary |
| `UX-FX16` | Synthetic existing-document revision lineage | A registered source document at revision R3 remains immutable while exact candidate revisions, role-separated findings, author decisions, rejected work, and the approved R4 destination preserve complete ancestry |
| `UX-FX17` | Synthetic Project thread and context lineage | One task-linked thread binds exact turn context, Work, proposal, decision, stale-snapshot choices, branching, collapse, reconnect, and replay without becoming the domain ledger |
| `UX-FX18` | Synthetic graph history and governed Revert | Ten graph exploration states remain presentation-only while more than ten applied changes exercise Recent changes, single and multi-step compensation previews, ineligible reversal, conflict, and full History |
| `UX-FX19` | Synthetic semantic route resolution | Current, exact historical, superseded, missing, unauthorized, unsupported-profile, malformed, and registered profile-tool targets resolve to permitted semantic places or safe fallbacks without ambient substitution |
| `UX-FX20` | Paired synthetic Project Briefs | Scientific and controlled-writing Briefs use the same focus, attention, comparison, Work, next-step, history, accessibility, and authority grammar while presenting different typed profile meaning |
| `UX-FX21` | Paired synthetic Sources and exact readers | Scientific and controlled-writing Projects reuse the same collection, registration, immutable revision, rights, inspection-capability, reader, exact-location, Petra-context, provenance, navigation, and accessibility mechanics while presenting different typed source identities, roles, limitations, and downstream uses |
| `UX-FX22` | Synthetic source lifecycle and recovery | Reuse, duplicate and ambiguous identity, identity-only and preview content, partial and failed processing, exact and unresolved locations, normalized differences, unsupported format, a newer revision with affected dependents, offline and unavailable content, Project removal, eligible local-copy deletion with receipt, and retention-blocked deletion remain honest and recoverable |
| `UX-FX23` | Paired conversational working graph and Review | Two invented Project profiles turn bounded natural conversation into durable non-authoritative candidates, relationships, exact origin and basis, optional graph/text inspection, exception-led Review, conversational correction, exact Changes to apply, atomic and independent-batch outcomes, stale refresh, projection lag, and governed Revert without contextual demo material |

Post-freeze fixtures use Petra's canonical IDs and runtime shapes. When a runtime contract is not yet available, a fixture declares its provisional schema and associated `UX-REQ` item. They use synthetic content and remain independent of contextual demo assets and directories. Existing pre-freeze shell and graph fixtures remain exploratory comparison evidence; they do not satisfy the neutral reference-UX gate until reviewed or rebuilt against the frozen brief.

## Design validation evidence

| ID | Evidence class | Minimum record |
| --- | --- | --- |
| `UX-EV01` | Specification | Task, states, language, authority boundary, dependencies, and acceptance criteria |
| `UX-EV02` | Visual | Screenshots or recordings for named fixture, viewport, theme if applicable, and revision |
| `UX-EV03` | Interaction | Named path, entry conditions, steps, system feedback, commit point, authority effect, preserved state, cancellation or reversal, successful result, adverse states, recovery, and focus trace |
| `UX-EV04` | Accessibility | Keyboard, focus, text scale, contrast, motion, semantic structure, and graph alternative results |
| `UX-EV05` | Language | Terminology ledger plus D006 origin, force, reference, descriptor, uncertainty, action, status, confirmation, empty-state, and error fixtures |
| `UX-EV06` | Contract | View model, query, command, event, object identity, and AG-UI boundary trace |
| `UX-EV07` | Performance | Fixture size, hardware/context, local/cached/remote origin, latency, layout stability, and rendering observations |
| `UX-EV08` | Usability | Heuristic or participant method, task, evaluator or participant context, observed failure, affected heuristic, consequence, severity, disposition, and follow-up |
| `UX-EV09` | Regression | Stable state fixture, expected rendering/behavior, comparison result, and approved exception |

Usability numbers describe observed behavior; they do not become universal product truths. Petra may later adopt quantitative exit thresholds after the pilot protocol defines the task, population, environment, and tolerance. Until then, a severe provenance, authority, accessibility, or lost-work failure blocks validation even if an average task metric looks favorable.

## Cross-roadmap request path

Design must not solve missing architecture inside a component. A request uses `UX-REQ-NNN` and records:

- originating design item and pre-freeze scenario or post-freeze synthetic fixture;
- affected implementation item;
- project-author task and failure without the change;
- requested query, command, event, or view-model behavior;
- authority and persistence implications;
- smallest viable response;
- decision owner and status;
- accepted replacement or rejection rationale.

Requests follow this sequence:

1. reproduce the need with a named design scenario, adding a synthetic fixture only after design freeze;
2. check whether an accepted contract already supplies it;
3. propose the smallest read model or command change;
4. review it against authority, identity, event, AG-UI, and projection boundaries;
5. update both linked roadmap items if accepted;
6. integrate only after the contract or explicit provisional adapter is recorded.

A local component calculation is allowed for presentation-only state such as panel size or expanded rows. It is not allowed for scientific standing, review authority, provenance, action readiness, or mutation consequences.

### Active UX request register

| Request | Status | Need | Implementation link | Full record |
| --- | --- | --- | --- | --- |
| `UX-REQ-001` | `proposed` | Snapshot-consistent `ProjectShellView` | `M1.7` | `UX1.1` in this roadmap |
| `UX-REQ-002` | `proposed` | Task-oriented, profile-resolved, snapshot-consistent `ProjectBriefView` | `M1.6`, `M1.7`, later `M2`/`M3` extensions | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-003` | `proposed` | Versioned `SuggestedActionView` with preview and typed invocation | `M1.6`, `M1.7`, later `M2`/`M3` extensions | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-004` | `proposed`; architecture decision required | Versioned Project-profile binding, typed domain registry, and adaptive vocabulary/view boundary | `M1.1`, `M1.2`, `M1.7`, later controlled-writing contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-005` | `proposed`; architecture decision required | Immutable existing-document lineage and exact new-revision promotion | `M1.2`, `M1.8`, later controlled-writing contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-006` | `proposed` | Durable Project threads, task linkage, exact per-turn context, stale-thread choices, and branch lineage | `M1.1`, `M1.6`, `M1.7` | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-007` | `proposed` | Recent-ten reversible-change query, exact compensation preview, additive governed Revert, and projection comparison | `M1.3`, `M1.5`, `M1.7` | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-008` | `proposed`; depends on Project-profile disposition | Semantic object location, exact/historical/replaced resolution, safe fallback, and registered destination role | `M1.1`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-009` | `proposed`; depends on Project-profile disposition | Snapshot-consistent, profile-resolved Project source and exact-inspection read model | `M1.2`, `M1.4`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-010` | `proposed`; architecture and retention decision required | Project-source association plus governed removal and local-copy deletion lifecycle | `M1.2`, `M1.5`, `M1.7`, later retention policy | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-011` | `proposed`; architecture decision required | Durable, profile-valid, non-authoritative working candidates and graph relationships derived from bounded interactions with exact origin, basis, validation, and revision lineage | `M1.1`, `M1.3`, `M1.5`, `M1.6`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-012` | `proposed` | Snapshot-consistent, profile-neutral Review-session query and missing correction, basis-change, separation, deferment, and member-outcome command composition | `M1.5`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |

The implementation track owns each request's disposition. A post-freeze synthetic fixture may
use the proposed shape, but no module may claim `G-CONTRACT` until the request
is accepted, replaced by a smaller contract, mapped to an existing contract,
or explicitly deferred with a safe adapter boundary.

## Definition of ready and done

### Product-design brief complete

The product design is complete only when every `DB01`–`DB18` section in
`reports/PETRA-UX-DESIGN-BRIEF.md` is accepted or has an explicit non-blocking
deferral, all cross-module paths and backend gaps are resolved at specification
depth, and the user explicitly accepts `UX-DESIGN-FREEZE-01`. Existing code,
individual fixture routes, screenshots, or completed module fragments cannot
substitute for this gate.

### Frontend complete against fixtures

A module reaches fixture-backed frontend completion when:

- its accepted direction is implemented in production workbench components rather than a disposable mockup;
- ordinary and adverse states render from Petra-owned contract-shaped view models;
- navigation, selection, direct actions, assistant context, and responsive behavior are implemented where relevant;
- keyboard, focus, text-scale, motion, and non-color requirements pass;
- user-facing language and Hypothesis references follow D006;
- the module terminology ledger and complete interaction-path audit are current;
- no placeholder looks authoritative or functional when it is not;
- remaining live dependencies are explicit `UX-REQ` items attached to narrow provider or command boundaries;
- replacing fixture providers with conforming live providers should not require redesigning the module.

This is the design terminal's minimum implementation target when backend work is still in progress. It is substantial frontend completion, but it is not `G-INTEGRATION` or module completion.

### Ready for production integration

A module is ready to integrate when:

- `G-SPEC` and `G-PROTOTYPE` pass;
- its complete state and fixture matrix exists;
- every object has a canonical identity path;
- commands and authority changes are explicit;
- accessibility, terminology, interaction paths, recovery, and language behavior are specified;
- all contract gaps have accepted or deliberately provisional `UX-REQ` dispositions;
- the corresponding implementation slice can supply the required view models.

### Design complete

A module is `complete` when:

- all five gates pass;
- every acceptance criterion has linked evidence;
- production code uses Petra-owned components and view models;
- ordinary, dense, empty, stale, failed, and recovery states work;
- no unresolved major terminology, interaction-control, or Nielsen heuristic finding remains;
- no critical scientific-trust, lost-work, provenance, or accessibility issue remains;
- remaining debt has an owner, milestone, and revisit trigger.

Design completion never substitutes for the implementation acceptance criteria, test suites, replay evidence, or clean-start demonstration.

## Explicit deferrals

| ID | Deferral | Revisit trigger |
| --- | --- | --- |
| `UX-D01` | Final production rock artwork and formal trademark package | The shell and app-icon use cases stabilize or public beta preparation begins |
| `UX-D02` | Superseded by `UX1.1-DISC02`: dark and dimmed themes are now part of the active shell and design-system scope | Reopen only if theme validation fails its comfort, contrast, forced-colors, or semantic-token requirements |
| `UX-D03` | Mobile feature parity | A validated mobile research workflow exists; M1 supports resilient narrow windows, not full mobile parity |
| `UX-D04` | Generic whole-corpus graph explorer | A scientific task cannot be served by focused graphs, matrices, timelines, or search |
| `UX-D05` | CopilotKit or generative-UI component adoption | A bounded component beats Petra's own implementation without taking over state or design |
| `UX-D06` | Public multi-user collaboration design | Individual-workbench workflows and authority boundaries pass pilot evaluation |
| `UX-D07` | External API or MCP management surfaces | Internal commands stabilize and a concrete external workflow is selected |
| `UX-D08` | Final experiment-workbench design | `M4` protocols, sandbox behavior, criteria, diagnosis, and artifact promotion become executable |

## Later design horizons

Later milestones remain intentionally less detailed. They inherit the same authority, language, accessibility, fixture, and validation rules.

| Horizon | Design scope | Entry evidence |
| --- | --- | --- |
| `UX2` | Discovery, reusable corpus intake, identity resolution, acquisition rights, ingestion queues, and literature landscape | M1 source and review paths validated on representative papers |
| `UX3` | Hypothesis development, assessment posture, obligations, policy tuning, proactive alternatives, and governed autonomy | M2 corpus and review behavior produce realistic standing and exception data |
| `UX4` | Progressive ML/scientific experiments, protocols, sandbox activity, validation criteria, root-cause analysis, reproduction, and artifact promotion | Experiment contracts and execution policy are executable |
| `UX5` | Pilot-specific workflows, comparative evaluation, cost/latency diagnostics, and longitudinal trust calibration | Two pilot protocols and representative projects exist |
| `UX6` | Private-beta hardening, public demonstration, collaboration, onboarding, and selected API/MCP surfaces | M1–M5 evidence identifies stable workflows and external needs |

Project-profile support is a cross-horizon constraint, not a late “writing
feature.” The brief specifies shared shell, Brief base, assistant, Work, review,
provenance, promotion, recovery, and history components as profile-resolved.
Their neutral reference implementation begins after design freeze. Contextual
scientific and controlled-writing integrations receive separate delivery plans
only after the full reference UX stands independently.

## Immediate sequence

Backend implementation of already accepted architecture may continue. The
design track should now:

1. carry accepted `DB04`–`DB09` through `UX-REQ-001`–`UX-REQ-012` without implementing a product surface;
2. specify `DB10`, graph and relationship work, as the next discussion-first section;
3. specify Work, composition, settings, design-system, language, accessibility, and recovery behavior through `DB11`–`DB17`;
4. maintain the `UX-REQ` register and request architecture dispositions without allowing available backend shapes to dictate the UX;
5. assemble the complete screen inventory, responsive blueprints, state matrix, flow map, and acceptance plan in `DB18`;
6. review the entire brief and explicitly record `UX-DESIGN-FREEZE-01`;
7. implement the complete neutral reference UX against synthetic conformance scenarios and verify that it builds and operates without external demo directories;
8. plan and produce the scientific and controlled-writing contextual integrations as separate efforts after the product baseline stands independently.

This sequence turns the accepted visual system into a task-complete product one
flow at a time while keeping implementation contracts and domain authority
explicit.
