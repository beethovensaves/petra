# Petra Design Implementation Roadmap

Status: `UX-DESIGN-FREEZE-01` accepted against baseline `655d094`; initial Phase 2 neutral reference packet set implemented through `bfdcecf`
Last updated: 2026-09-10
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
- [Sources lifecycle interface handoff](reports/UX-REQ-008-010-SOURCES-LIFECYCLE-INTERFACE-HANDOFF.md)
- [Master Petra UX design brief and freeze criteria](reports/PETRA-UX-DESIGN-BRIEF.md)

## Outcome

Petra will receive a deliberate design pass without pausing the evidence-spine build or allowing prototypes to invent authoritative state. Design can run ahead with deterministic fixtures, but production integration follows the contracts and authoritative data delivered by the implementation roadmap.

Petra's shared work-and-authority model is use-agnostic. Each Project binds to a versioned profile that supplies its typed domain objects, relationships, validators, surface roles, and terminology. Scientific research is the first implementation profile; complex controlled writing is a distinct required conformance profile that uses the same authorial mechanics and controls without reclassifying narrative meaning as scientific evidence. They are initial examples in an extensible profile system, not Petra's complete taxonomy catalogue.

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

### Binding automated milestones after Wave 5

The earlier automated waves proved contracts, authority, persistence, and
individual browser paths, but they did not deliver a user-testable application.
Route availability, reference surfaces, fixture galleries, and isolated browser
assertions no longer count as product completion.

| Automated milestone | Required product result | Blocking exit gate |
| --- | --- | --- |
| Wave 6 | `UX1.6` graph-controlled mechanical baseline | Every milestone-6 operation remains live and evidenced, including actual model, Work, Review, provenance, recovery, and clean pushed integration. The 2026-09-21 checkpoint did not receive frontend acceptance and cannot satisfy the former product exit claim. |
| `FE-A1` | [Agentic frontend adaptation](reports/FRONTEND-ADAPTATION-MILESTONE.md) under [D024](decisions/D024-agentic-split-workspace.md) | Accepted 30/70 Agent–Workspace shell; outcome-first Project creation without mandatory profiles; all 116 operations mapped; all Wave 6 operations adapted; complete inspect path; task-based visual, interaction, accessibility, adverse-state, and recovery evidence; explicit replacement frontend acceptance |
| Wave 7 | `UX1.7` document-first Composition in the accepted `FE-A1` application | `FE-A1` remains conformant; every milestone-7 operation is live and evidenced inside the Artifact workspace; actual scoped model use, durable editing, provenance, revision, validation, render, export, promotion, product-design/Felicity review, and explicit `USER-TESTABLE-02` user acceptance |
| Wave 8 | `UX1.8` whole-workbench validation and M1 closure | All 116 operations conform to `scripts/ui-operation-presentation-map.json`; integrated outcome tasks, definition/control boundaries, visual and interaction validation, adverse recovery, and zero critical design debt pass; explicit `USER-TESTABLE-03` user acceptance |

The automated controller treats each final acceptance record as user-owned.
Backend and design workers cannot self-certify it. Each wave or adaptation milestone must reach
`needs_user`, publish the stable URL and guided task, and remain incomplete until
the user accepts that checkpoint.

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
| `UX1.4` | `complete` | Conversation-derived working graph, basis and provenance, profile-resolved comparison, exception-led Review, exact change preview, decision, recovery, and reversal | Natural interaction needs quiet structuring and visible, reversible authority boundaries | `M1.5`, `M1.6`, `M1.7` |
| `UX1.5` | `in_progress` | Focused graph, evidence paths, edge semantics, projection state, and textual equivalents | The graph must explain and control work rather than decorate it | `M1.3`, `M1.5`, `M1.6`, `M1.7` |
| `UX1.6` | `in_progress` | Petra interaction system, contextual answers, SuggestedActions, durable Work, review, reconnect, branching, and governed reversal | Project authors need fast collaboration and recoverable exploration without surrendering domain authority | `M1.5`, `M1.6`, `M1.7` |
| `UX1.7` | `in_progress` | DraftArtifact, provenance, revision, citations, BibTeX, and LaTeX | Scientific writing should be useful immediately and remain inspectable | `M1.8` |
| `UX1.8` | `in_progress` | Whole-product information architecture, flow coherence, accessibility, responsiveness, recovery, and visual hardening | The modules count only when they behave as one dependable workbench | `M1.9` |
| `FE-A1` | `planned` | D024 30/70 Agent–Workspace adaptation, use-agnostic Project entry, progressive inspection, and operation-presentation migration | The proven graph-controlled mechanics need a coherent frontend before Composition and closure can continue | `M1.7`, `M1.8`, `M1.9` |

## Design principles

| ID | Principle | Interface consequence |
| --- | --- | --- |
| `UX-DP01` | Agent-directed and object-grounded. | The persistent Agent is the primary control surface; the Workspace retains durable objects and never reduces Project state to a transcript. |
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
| `UX1.0-DISC04` | Which user-task architecture should govern the modules and prevent the shell from becoming a collection of simultaneous panels? | Design for the responsible project author moving through one durable loop: orient to the Project, profile, current objective, and snapshot; choose the material uncertainty, constraint, decision, or output; inspect the smallest adequate basis; answer locally or start bounded Work; review the result and consequences; apply, correct, reject, or defer through the authoritative path; and return to an updated profile Brief or compose a traceable artifact. The profile Brief is the default Project home. A user goal opens the relevant basis/review, Sources, Graph, Details, assistant, Work, profile tools, or Draft surface; their existence alone does not make them simultaneously prominent. The assistant mediates explanation and action, the graph answers relationship questions, and neither becomes the place where Project state lives. Define the task model from first principles and test it after design freeze with synthetic conformance scenarios. Maintain the complete catalogue, entry rules, adverse states, and horizon plan in `reports/UX-FLOW-ARCHITECTURE.md`; send runtime gaps through the `UX-REQ` register. | The shell prototype proved component and state coverage but did not prove that a person could complete a meaningful governed operation. A task-first loop makes hierarchy, progressive disclosure, terminology, activity, and completion criteria derive from user intent while preserving Petra's object, basis, authority, and history boundaries. | All UX modules, `UX-EV03`, `UX-EV05`, `UX-EV06`, `UX-EV08`, `UX-REQ-001`–`UX-REQ-023`, M1–M6 design horizons | Revisit if task evaluation shows that the Brief is not the best orientation surface, a material workflow cannot re-enter the loop, domain profiles require incompatible authority semantics, or secondary context cannot remain accessible without restoring simultaneous-panel overload. |
| `UX1.0-DISC05` | Is Petra a scientific application with a later writing mode, or a use-agnostic governed-work system that adapts to radically different Projects? | Petra is use-agnostic at the shared work-and-authority layer. Every Project binds to one versioned profile that owns typed domain objects, relationships, validators, surface roles, and user-facing terminology. Scientific research and complex controlled writing are separate semantic profiles, not UI modes or vocabulary aliases. They use the same authorial mechanics and controls: immutable sources, framed objectives, inspectable dependencies, bounded Work, candidates and ChangeSets, profile-appropriate validation, exact preview, approval/correction/rejection/deferment, promotion, cancellation, provenance, recovery, and additive history. The scientific profile may expose ResearchQuestions, Hypotheses, Claims, EvidenceRelations, Papers, and Experiments; the controlled-writing profile may expose revision objectives, canon, narrative constraints, dependencies, validation findings, source manuscript revisions, and promoted manuscript revisions. Final controlled-writing schema names remain to be defined. A permitted existing document can seed an immutable lineage, and a promoted revision never overwrites it. | Scientific research and controlled writing differ radically in domain meaning while still requiring the same governed authorial controls. Encoding science in shared components would make Petra brittle; forcing narrative knowledge into scientific schemas would make it false. A registered profile boundary preserves one trustworthy product while allowing each Project to speak accurately. | `UX1.0-W13`, `UX1.1-W01`–`W15`, all shared work/review/assistant/provenance/history components, `UX-FX15`–`UX-FX23`, `UX-REQ-001`–`UX-REQ-023`, and required architecture amendments | Revisit only if a profile requires a genuinely different authority or control meaning; a new noun, validator, graph predicate, or task surface extends the profile and does not by itself fork the kernel. |
| `UX1.0-DISC06` | When may contextual demo material influence Petra's product design or implementation? | Complete and explicitly accept the entire use-agnostic product brief first; then stand up the complete Petra reference UX against synthetic contract-shaped conformance scenarios; only then create separate contextual scientific and controlled-writing integrations and demos. Product design does not open a demo corpus to discover navigation, terminology, ontology, controls, workflows, defaults, states, or success criteria. Existing pre-freeze corpus observations are quarantined from product rationale. A later demo finding may reopen the product only when it states a generalized user failure, affected flow, and revisit trigger and passes the ordinary design and contract process. Removing all demo adapters and data must leave the complete Petra product operational. | Designing against available real material would optimize Petra for two projects before its general interaction model exists. A full design freeze and independent reference UX make product completeness observable and allow later contexts to validate Petra without defining it by accident. | `reports/PETRA-UX-DESIGN-BRIEF.md`, all `DB01`–`DB18` sections, `UX-DESIGN-FREEZE-01`, `UX-P15`–`UX-P17`, all modules and fixtures, contextual integration plans, and backend handoffs | Revisit only through an explicit product-scope decision; a demo deadline, convenient dataset, or attractive demo flow is not a trigger. |
| `UX1.0-DISC07` | How much visual variation may a Project profile introduce? | Accepted 2026-09-07: use one Petra visual grammar across profiles. Themes, typography, components, density, motion, responsive behavior, and selection/focus/action/authority/warning/approval/error meanings remain shared. A versioned profile may supply bounded semantic object/relation labels, audited glyph references, finite line/shape patterns, optional profile-semantic tone roles, legends, and text alternatives. It cannot supply a profile-wide palette or reskin, arbitrary styling/assets/code, or override shared control and state meanings. Relation meaning remains separate from operational success/failure. | Authors can recognize profile-specific meaning without relearning Petra or mistaking a decorative difference for selection, authority, approval, failure, or consequence. | `DB14`; `UX1.0-W15`–`W18`; `UX1.0-AC09`–`AC15`; `UX-REQ-004`; `UX-FX34`/`UX-FX35` | Revisit if paired-profile evaluation cannot distinguish material domain types, a generic fallback hides necessary meaning, a required visualization cannot fit the bounded descriptor registry, or the shared grammar causes profile-specific accuracy or accessibility failure. |
| `UX1.0-DISC08` | How should Petra keep one recognizable communication system while supporting many unrelated Project taxonomies and valid discourse conventions? | Accepted 2026-09-07: use one Petra communication contract across an open-ended profile system. Petra owns candor, attribution, force calibration, contextual depth, shared communicative acts, control/status/authority/recovery language, and validation behavior. A versioned profile owns accurate domain terms, reference grammar, relationship/force vocabulary, units, roles, validators, action objects, and functional discourse conventions. It may shape a response or document for its work; it cannot create a decorative assistant persona, rename shared consequences, or turn contextual advice into a prerequisite. | Authors should recognize Petra's controls, authority, and reliability while each Project speaks accurately about its own objects and reasoning. A fixed scientific lexicon or generic persona would misstate other profiles; unrestricted profile voice would make consequences drift. | `DB15`; `UX1.0-W19`–`W22`; `UX1.0-AC16`–`AC22`; `UX-REQ-004`, `UX-REQ-021`; `UX-FX36`/`UX-FX37` | Revisit if an admitted profile cannot express material reasoning accurately within the shared communicative families, language validation changes semantic force, a required discourse convention conflicts with shared authority, or authors cannot distinguish advice, actual prerequisites, proposals, and observed outcomes. |
| `UX1.0-DISC09` | What accessibility equivalence must every Petra presentation provide, and how should Petra explain the graph the author currently sees? | Accepted 2026-09-07: require task and outcome equivalence through modality-appropriate peers. Visual, textual, keyboard, screen-reader, touch, magnified/reflowed, reduced-motion, forced-color, and generated presentations preserve the same objective, material meaning, state, controls, consequence/authority, recovery, result, and practical efficiency while using an appropriate sequence for the modality. Petra can explain the current graph from the exact semantic result plus a versioned bounded scene describing visible layout, members, selection, groups, legend, and omissions; a permitted image may supplement the scene for an eligible vision model. AG-UI carries synchronized state while Petra owns semantics, accessibility, validation, actions, and authority. | A read-only or exhausting text summary does not provide equal access, and an unbound screenshot lets a model invent graph meaning or describe stale state. Binding the semantic peer and visible scene supports both assistive use and accurate contextual explanation without making pixels authoritative. | `DB16`; `UX1.0-W23`–`W26`; `UX1.0-AC23`–`AC30`; `UX-REQ-006`, `UX-REQ-013`, `UX-REQ-021`, `UX-REQ-022`; `UX-FX38`–`UX-FX40` | Revisit if a modality cannot complete a material task efficiently, a peer requires different authority, scene capture cannot preserve privacy or freshness, AG-UI cannot synchronize the bounded context, or model/participant testing cannot distinguish graph semantics from visual observation. |
| `UX1.0-DISC10` | What must Petra establish before offering recovery, and how should recovery relate to preserved work and History? | Accepted 2026-09-07: reconcile canonical owning records before any action that could repeat, replace, save, publish, cancel, compensate, or broaden an operation. State the attempted operation, effect as confirmed none/confirmed/in progress/mixed/unknown/unavailable, preserved or lost state, per-member outcomes, and current safe actions. Restore the exact task/object/input/focus or explain the fallback. Retry, Resume, Start again, Restore local work, Reconcile, Revalidate, Retry delivery, presentation Undo/Back/Forward/Reset, Revert, and Return to current retain distinct identity, cost, authority, and additive-History effects. | A generic retry can duplicate an applied command, restart Work during replay, overwrite a newer draft, resubmit an applied batch member, or confuse projection/delivery failure with failed authority. Exact reconciliation protects work while keeping failures and recovery actions inspectable. | `DB17`; `UX1.0-W27`–`W30`; `UX1.0-AC31`–`AC38`; `UX-REQ-007`, `UX-REQ-014`, `UX-REQ-015`, `UX-REQ-018`, `UX-REQ-019`, `UX-REQ-023`; `UX-FX41`–`UX-FX43` | Revisit if owning records cannot establish a useful effect boundary, authors cannot distinguish recovery actions, local preservation or exact return is unreliable, History cannot explain causal recovery without leakage, or reconciliation materially delays safe ordinary recovery. |

**Profile-scope clarification accepted 2026-09-07:** scientific research and
controlled writing are minimum conformance examples, not an exhaustive profile
catalogue. Petra may admit many other versioned taxonomies when they define their
own typed objectives, objects, relationships, basis, validators, tools, task
families, outputs, terminology, and supported places and map applicable behavior
honestly to Petra's shared Work, Review, approval, provenance, revision, recovery,
and History contracts. Profiles may omit inapplicable domain flows. A taxonomy
cannot redefine permission or authority. This clarifies `UX1.0-DISC05` and
`UX1.0-DISC07` without changing their shared-kernel or visual-system decisions.

### DB14 specification checkpoint

DB14 consolidates the accepted brand, token, theme, typography, density, border,
elevation, component, icon, interaction-state, motion, responsive, accessibility,
and data-visualization rules. `UX1.0-DISC07` keeps one Petra visual grammar while
allowing versioned profile object/relation labels and bounded glyph, pattern,
shape, semantic-tone, legend, and text-alternative references. Profiles cannot
provide a reskin, raw style, arbitrary asset/code, or shared state/authority
override. Domain relations remain distinct from operational outcomes.

Eleven paths (`DB14-P01`–`P11`) and seven findings (`DB14-A01`–`A07`) cover the
paper specification. `UX-FX34`/`UX-FX35` are post-freeze conformance scenarios.
DB14 creates no new backend requirement; it sharpens the existing proposed
`UX-REQ-004` profile-manifest boundary. DB14 closes at `G-SPEC`; implementation,
contract, accessibility, performance, visual-regression, and participant evidence
remain pending.

### DB15 specification checkpoint

DB15 generalizes D006 into one Petra communication contract while profiles own
their versioned terminology, reference forms, relation/force vocabulary, units,
roles, validators, and functional discourse conventions. Scientific, controlled-
writing, and an unrelated third profile are conformance examples rather than a
closed catalogue. Shared communicative acts, response obligations, action verbs,
status dimensions, confirmation/error anatomy, model-role identity, correction,
locale/source fidelity, and accessible language preserve the same consequence
and authority under every admitted profile.

Eleven paths (`DB15-P01`–`P11`) and seven findings (`DB15-A01`–`A07`) cover the
paper specification. `UX-FX36`/`UX-FX37` are post-freeze conformance scenarios.
DB15 sharpens `UX-REQ-004` with terminology/discourse registry fields and creates
proposed `UX-REQ-021` for a profile-resolved statement-level communication plan
and validation receipt. DB15 closes at `G-SPEC`; contract, implementation, model,
localization, accessibility, and participant evidence remain pending. DB16
carries this communication contract into the accepted task-equivalence and
model-readable presentation rules below.
This checkpoint did not itself record the later product-design freeze.

### DB16 specification checkpoint

DB16 accepts task and outcome equivalence through modality-appropriate peers.
It specifies semantic structure, keyboard and focus, screen-reader behavior,
complex-view peers, model-readable graph scenes, reflow and magnification,
color/contrast, touch and non-drag controls, motion/time/sound, streaming/status,
forms/editors, responsive and assistive states, and unsupported-state recovery.
Petra can explain the current graph from its exact semantic result plus the bound
visible scene; a permitted capture supplements rather than defines graph meaning.
AG-UI transports synchronized state while Petra owns the accessibility contract.

Twelve paths (`DB16-P01`–`P12`) and eight findings (`DB16-A01`–`A08`) cover the
paper specification. `UX-FX38`–`UX-FX40` are post-freeze conformance scenarios.
DB16 sharpens `UX-REQ-006`, `UX-REQ-013`, and `UX-REQ-021` and creates proposed
`UX-REQ-022` for semantic-result, visible-scene, accessible-peer, optional-capture,
model-context, and explanation binding. DB16 closes at `G-SPEC`; implementation,
browser/AT, model, performance, legal, and participant evidence remain pending.
DB17 carries these accessibility and presentation-context rules into its
recovery specification below.
This checkpoint did not itself record the later product-design freeze.

### DB17 specification checkpoint

DB17 accepts canonical reconciliation before recovery, explicit preservation and
loss, independently inspectable member outcomes, and exact task return. It
defines six effect-knowledge states; stable meanings for Check status, Refresh,
Reconnect, Replay, Retry, Resume, Start again, Restore, Reconcile, Revalidate,
redelivery, local Undo/view history, governed Revert, and Return to current; safe
automatic recovery; cross-module local/durable state behavior; projection and
delivery separation; and an authorized additive History route.

Thirteen paths (`DB17-P01`–`P13`) and ten findings (`DB17-A01`–`A10`) cover the
paper specification. `UX-FX41`–`UX-FX43` are post-freeze conformance scenarios.
DB17 sharpens `UX-REQ-007`, `UX-REQ-014`, `UX-REQ-015`, `UX-REQ-018`, and
`UX-REQ-019` and creates proposed `UX-REQ-023` for effect, preservation, member-
outcome, eligible-action, History, and return composition. DB17 closes at
`G-SPEC`; runtime, offline/browser, race, disaster-recovery, accessibility,
performance, security, and participant evidence remain pending. DB18 carries
these boundaries into the completed product blueprint; freeze review is next.
This checkpoint did not itself record the later product-design freeze.

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
| `UX1.0-W14` | `complete` | Complete `DB01`–`DB18`, conduct the whole-product review, and record `UX-DESIGN-FREEZE-01` before new reference-UX or demo implementation. | Petra needs one coherent, reviewable product specification before local screens or real contexts harden incomplete assumptions. |
| `UX1.0-W15` | `complete` | Consolidate DB14's foundation layers, token ownership, themes, type roles, density, border/elevation budgets, and shared component inventory at specification depth. | Modules need one reviewable system contract before reference-UX implementation resumes. |
| `UX1.0-W16` | `complete` | Specify shared control states, reserved visual meanings, profile semantic descriptors, icon/data-view grammar, textual parity, and safe descriptor fallback. | Domain meaning must vary without changing Petra's interaction or authority cues. |
| `UX1.0-W17` | `complete` | Specify DB14 motion, responsive recomposition, forced-colors, reduced-motion, dense/adverse states, and eleven interaction paths. | The system must preserve action, meaning, input, selection, and focus under real interface pressure. |
| `UX1.0-W18` | `complete` | Complete the DB14 paper audit, findings, acceptance criteria, post-freeze scenarios, and UX-REQ-004 trace before opening DB15. | Design-system completeness and remaining evidence must be explicit rather than inferred from calibration fixtures. |
| `UX1.0-W19` | `complete` | Specify DB15's one Petra communication contract, language ownership/versioning, and extensible profile terminology/discourse registry. | Petra must remain recognizable while arbitrary admitted profiles use accurate concepts and functional discourse. |
| `UX1.0-W20` | `complete` | Generalize D006 into shared communicative families, profile-specific reference grammar, contextual response depth, and reserved control/action vocabulary. | Origin, force, advice, actual prerequisites, proposals, and observed outcomes must stay distinct across profile and model changes. |
| `UX1.0-W21` | `complete` | Specify status dimensions, confirmations, empty/unavailable/error/completion language, Petra/model identity, correction/feedback boundaries, locale/source fidelity, and accessible realization. | Functional language must preserve consequence, authority, exact source meaning, and recovery under ordinary and adverse conditions. |
| `UX1.0-W22` | `complete` | Complete DB15's eleven paths, paper audit, findings, acceptance criteria, UX-FX36/37 evidence plan, UX-REQ-004 refinement, and UX-REQ-021 trace before opening DB16. | Language-system completeness and remaining runtime/model/accessibility evidence must be reviewable rather than inferred from prose quality. |
| `UX1.0-W23` | `complete` | Specify DB16 task/outcome equivalence, accessibility ownership, standards baseline, semantic structure, keyboard behavior, and focus transitions. | Every author needs the same meaningful task, control, authority, and recovery through an efficient modality-appropriate path. |
| `UX1.0-W24` | `complete` | Specify complete peers for graphs, timelines, Work, diffs, charts, tables, editors, panes, and generated interfaces plus model-readable graph scene explanation. | A textual summary cannot become read-only, and Petra must explain the exact presentation the author sees without guessing meaning from pixels. |
| `UX1.0-W25` | `complete` | Specify visual/non-color behavior, text scale/reflow, targets, touch/non-drag control, motion/time/sound, streaming/live status, forms/editors, and assistive/responsive adverse states. | Accessibility must survive actual interface pressure while preserving input, selection, focus, and task context. |
| `UX1.0-W26` | `complete` | Complete DB16's twelve paths, paper audit, findings, acceptance criteria, UX-FX38–40 evidence plan, and UX-REQ-006/013/021/022 trace before opening DB17. | Accessibility completeness and remaining browser, AT, model, participant, and contract evidence must be explicit. |
| `UX1.0-W27` | `complete` | Specify DB17's reconciliation-first effect states, preserved/lost-state inventory, recovery ownership, and shared action vocabulary. | An interrupted interface must establish what happened before it repeats or replaces an operation. |
| `UX1.0-W28` | `complete` | Specify automatic recovery, offline/service behavior, local draft conflict, Work/replay/cancellation races, batch, projection, output, and delivery recovery. | Cross-module failures must preserve exact durability and authority while offering only actions the owning contract supports. |
| `UX1.0-W29` | `complete` | Specify the authorized additive History route, causal episodes, ordering limits, Recent changes boundary, comparison, reversal, redaction, and exact return. | Authors need to understand and recover from prior actions without treating History as destructive undo or exposing restricted state. |
| `UX1.0-W30` | `complete` | Complete DB17's thirteen paths, paper audit, findings, acceptance criteria, UX-FX41–43 evidence plan, UX-REQ-007/014/015/018/019 refinements, and UX-REQ-023 trace before opening DB18. | Recovery completeness and all remaining runtime, browser, race, disaster, accessibility, security, and participant evidence must be explicit. |

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
| `UX1.0-AC09` | Shared themes, components, interaction states, density, motion, and authority cues retain the same meanings in every registered Project profile. |
| `UX1.0-AC10` | Profile object/relation distinctions resolve from exact versioned semantic keys and bounded labels, glyph/pattern/shape/tone references, legends, and text alternatives. |
| `UX1.0-AC11` | Profile descriptors cannot supply raw style, arbitrary or remote assets, executable code, themes, animation, shared-state renames, or control/authority overrides. |
| `UX1.0-AC12` | Domain relations remain visually and semantically distinct from operational success, failure, danger, approval, and selection. |
| `UX1.0-AC13` | Missing, colliding, replaced, and unsupported encodings retain exact labels, generic-family rendering, textual parity, history version, and Project operability. |
| `UX1.0-AC14` | Wide, narrow, high-zoom, touch, keyboard, forced-color, reduced-motion, dense, live-update, and overlay paths preserve material actions, input, selection, meaning, return, and focus. |
| `UX1.0-AC15` | The system observes its named token, one-divider, three-plane, component-state, non-color, and safe-fallback contracts across every product module. |
| `UX1.0-AC16` | Petra's candor, attribution, force, contextual depth, action, status, authority, and recovery obligations remain stable across all admitted profiles, models, modules, and direct or conversational paths. |
| `UX1.0-AC17` | Profiles may supply unrelated typed terms, references, relationship/force vocabulary, units, roles, validators, tasks, outputs, locale coverage, and functional discourse without renaming shared controls or consequences. |
| `UX1.0-AC18` | Every material statement retains its communicative family, origin, exact references and basis, conditions, limitations, recommendation/action links, applicable versions, and validation outcome. |
| `UX1.0-AC19` | Shared navigation, presentation, Work, Review, save/export, retry/resume, cancellation, reversal, status, and completion terms retain one exact meaning across the product. |
| `UX1.0-AC20` | Recommendations remain contextual advice distinct from eligibility and actual prerequisites; another valid branch is accepted without override ceremony, warning language, or repeated persuasion. |
| `UX1.0-AC21` | Questions, previews, confirmations, errors, corrections, and feedback act only at their material ambiguity or owning authority boundary and preserve exact state, consequence, and recovery. |
| `UX1.0-AC22` | Terminology change, locale fallback, source language, long or ambiguous references, streaming, narrow/high-zoom layout, and assistive output preserve identical material meaning or fail with an explicit limitation. |
| `UX1.0-AC23` | Every material surface supplies a modality-appropriate peer with the same objective, meaning, state, controls, consequence/authority, recovery, result, and practical task efficiency. |
| `UX1.0-AC24` | Landmarks, headings, names, roles, values, relationships, states, changes, and complete task peers are programmatically available through native or tested standard patterns. |
| `UX1.0-AC25` | Every action is keyboard operable and addressable through stable controls; focus remains visible, predictable, unobscured, restored, and distinct from selection and authority. |
| `UX1.0-AC26` | Text scale/reflow, long terms, magnification, forced colors, monochrome, reduced motion, touch/coarse pointer, absent audio, and non-drag use preserve all material content and control. |
| `UX1.0-AC27` | Dynamic and AG-UI-generated presentations expose stable semantic structure, bounded status announcements, preserved focus/input, complete final state, and an ordinary recovery path. |
| `UX1.0-AC28` | Forms, editors, diffs, tables, graphs, Work, and pane layouts preserve labels, instructions, selection, exact revision, errors, saved state, commands, and recovery across input and presentation changes. |
| `UX1.0-AC29` | Petra can explain the current graph from the exact semantic result and bound visible scene, identifying semantic facts, presentation observations, omissions, freshness, capability, and optional image inference separately. |
| `UX1.0-AC30` | Stale, mismatched, restricted, partial, unsupported, or failed presentation context preserves the task and falls back to exact semantic explanation or an explicit limitation without leaking data or inventing meaning. |
| `UX1.0-AC31` | Every material failure reconciles its owning records before offering an action that could repeat, replace, save, publish, cancel, compensate, or broaden an operation. |
| `UX1.0-AC32` | No-effect, confirmed-effect, in-progress, mixed, unknown, and unavailable verification remain distinct and identify exact preserved, lost, pending, and per-member state. |
| `UX1.0-AC33` | Retry, Resume, Start again, Restore local work, Reconcile, Revalidate, redelivery, local Undo/view navigation, Revert, and Return to current retain exact and non-overlapping consequences. |
| `UX1.0-AC34` | Reconnect/replay, cancellation races, retry limits, checkpoints, attempts, retained outputs, measured cost, and Work return preserve canonical operational state without duplicate execution. |
| `UX1.0-AC35` | Local/base/current edits, atomic batch members, projection lag, rendered outputs, publication, and delivery each retain their own durability, authority, and recovery outcome. |
| `UX1.0-AC36` | History exposes authorized causal episodes, exact actions/effects, recovery relationships, source-order limits, current eligibility, additive compensation, and a safe Return to current. |
| `UX1.0-AC37` | Recovery preserves task/object/input/selection/focus/return across profiles, viewports, and assistive paths and reveals no unauthorized identity, count, prior value, relationship, or content. |
| `UX1.0-AC38` | Runtime composition, offline/browser storage, races, operational restore, accessibility, performance, security, and participant comprehension remain explicit post-freeze validation gates. |

### Completion evidence

- `UX1.0-EV01`: [token and primitive inventory with code references](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev01--token-and-primitive-inventory);
- `UX1.0-EV02`: [fixture-gallery route list and screenshots](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev02--routes-and-rendered-evidence), including the [accepted brand mark and lockup scale review](reports/UX1.0-BRAND-SLICE.md), which closes `UX1.0-AC05`;
- `UX1.0-EV03`: [keyboard, contrast, reflow, and reduced-motion foundation results](reports/UX1.0-FOUNDATION-SLICE.md#ux10-ev03--accessibility-slice), extended by the [accepted shared primitive interaction review](reports/UX1.0-PRIMITIVES-SLICE.md), which closes `UX1.0-AC03` at the shared-primitive boundary;
- `UX1.0-EV04`: [current-screen audit and design-debt register](reports/UX1.0-FOUNDATION-AUDIT.md).
- `UX1.0-EV05`: [first-principles user-flow architecture and complete use-case catalogue](reports/UX-FLOW-ARCHITECTURE.md), with [runtime requirements handoff](reports/UX-BACKEND-HANDOFF.md).
- `UX1.0-EV06`: initial paired scientific/controlled-writing profile role map and conformance specification within an extensible profile system; executable `UX-FX15` begins only after design freeze and `UX-REQ-004` disposition.
- `UX1.0-EV07`: [master product-design brief, phase boundary, section status, and `UX-DESIGN-FREEZE-01` criteria](reports/PETRA-UX-DESIGN-BRIEF.md).
- `UX1.0-EV08`: DB14 complete design-system specification, eleven paths, seven
  findings, accepted DISC07, and sharpened UX-REQ-004 trace; rendered/runtime
  evidence remains pending.
- `UX1.0-EV09`: paired-profile shared-grammar and design-system stress/recovery
  evidence under UX-FX34/35 after design freeze.
- `UX1.0-EV10`: DB15 complete language-system specification, eleven paths, seven
  findings, accepted DISC08, UX-REQ-004 language-registry refinement, and
  UX-REQ-021 trace; runtime/model/localization evidence remains pending.
- `UX1.0-EV11`: extensible-profile communication and language/reference/recovery
  evidence under UX-FX36/37 after design freeze.
- `UX1.0-EV12`: DB16 complete accessibility specification, twelve paths, eight
  findings, accepted DISC09, UX-REQ-006/013/021 refinements, and UX-REQ-022
  trace; browser/AT/model/participant evidence remains pending.
- `UX1.0-EV13`: task-equivalence, accessibility-pressure, generated-interface,
  and current-graph explanation evidence under UX-FX38–40 after design freeze.
- `UX1.0-EV14`: DB17 complete recovery/History specification, thirteen paths,
  ten findings, accepted DISC10, UX-REQ-007/014/015/018/019 refinements, and
  UX-REQ-023 trace; runtime/offline/race/disaster/accessibility evidence remains
  pending.
- `UX1.0-EV15`: cross-module preservation, uncertain/mixed/race recovery, local
  conflicts, delivery, History, privacy, and reversal evidence under UX-FX41–43
  after design freeze.

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
| `UX1.1-DISC06` | How should Settings organize personal preferences and advanced Project controls? | Accepted 2026-09-07: lead with Appearance, Layout, Editor, and Accessibility preferences that apply locally and have scoped reset/recovery. Keep **Project controls** clearly labelled and discoverable, bound to one exact Project, with effective privacy/data, capability, model/routing, budget, and Review rules plus technical detail on demand. Personal model-detail display cannot route Work or hide accountable origin. Project changes use their owning typed, prospective control paths; personal reset cannot change policy or cancel Work. | Authors need comfortable personal control without mistaking device presentation for permission, privacy, automation, or Project authority. | `DB13`; `UX1.1-W16`–`W18`; `UX-REQ-020`; `UX-FX32`/`UX-FX33` | Revisit if personal groups hide Project controls, advanced detail overwhelms ordinary settings, an effective value's origin is unclear, reset loses work, or a display preference changes operational behavior. |

### DB13 specification checkpoint

DB13 specifies personal-preferences-first information architecture, effective
values and platform overrides, device persistence and session-only failure,
group/all reset, layout/editor preservation, privacy and model visibility,
exact Project-control inspection and prospective transitions, responsive and
accessible behavior, language, eleven paths, and seven audit findings.
`DB13-P01`–`P11` and `DB13-A01`–`A07` record paper coverage.
`UX-REQ-020` requests the missing effective Project-control read and typed
transition mapping; it remains proposed and does not create a universal settings
command. `UX-FX32`/`UX-FX33` are post-freeze conformance scenarios.

DB13 closes at `G-SPEC`; runtime, accessibility, integration, and participant
evidence remain separate. DB14 subsequently consolidates the accepted visual,
component, density, state, motion, responsive, and visualization rules and closes
its own specification gate.
This checkpoint did not itself record the later product-design freeze.

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
| `UX1.1-W16` | `in_progress` | Specify Appearance, Layout, Editor, and Accessibility preferences with exact effective value/origin, device persistence, platform overrides, reset, and failure recovery. | Personal control should be immediate and recoverable without implying account sync or changing Project meaning. |
| `UX1.1-W17` | `in_progress` | Specify Project-control discovery and exact privacy, capability, model/routing, budget, and Review summaries with technical detail on demand. | Authors need to understand effective constraints without a wall of implementation records or a local authority bypass. |
| `UX1.1-W18` | `in_progress` | Map editable Project controls to their owning typed prospective transitions, exact conflict/outcome recovery, and active-Work effects; complete DB13 paths and audit. | Settings cannot invent a generic mutation or silently rewrite the bindings of existing Work. |

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
| `UX1.1-AC10` | Personal preference and Project-control scopes, effective origins, persistence, resets, and consequences remain distinguishable throughout Settings. |
| `UX1.1-AC11` | Theme, layout, editor, accessibility, and model-detail presentation changes preserve active task state and cannot change authority or routing. |
| `UX1.1-AC12` | Platform accessibility constraints and responsive adaptations can override effective presentation without appearing to erase the retained compatible preference. |
| `UX1.1-AC13` | Device persistence failures and invalid values recover safely without an account-sync claim or loss of unrelated settings, content, or input. |
| `UX1.1-AC14` | Project controls bind one exact Project/policy revision and map only to supported typed prospective operations with honest stale/conflict/partial outcomes. |
| `UX1.1-AC15` | Missing capability, expired grant, unavailable route, unknown budget, unsupported profile, and read-only policy remain inspectable with exact reasons and safe return/request paths. |

### Completion evidence

- `UX1.1-EV01`: [review-candidate route and state map](reports/UX1.1-SHELL-SLICE.md#ux11-ev01--route-and-state-map);
- `UX1.1-EV02`: [desktop and narrow rendered evidence](reports/UX1.1-SHELL-SLICE.md#ux11-ev02--rendered-evidence);
- `UX1.1-EV03`: [cross-view identity and keyboard trace](reports/UX1.1-SHELL-SLICE.md#ux11-ev03--interaction-and-accessibility-evidence);
- `UX1.1-EV04`: [placeholder and implied-capability audit](reports/UX1.1-SHELL-SLICE.md#ux11-ev04--capability-and-authority-audit).
- `UX1.1-EV05`: [terminology ledger and D006 interface-copy baseline](reports/UX1.1-WRITING-INTERACTION-AUDIT.md#initial-terminology-ledger);
- `UX1.1-EV06`: [shell path registry, Nielsen heuristic findings, and dispositions](reports/UX1.1-WRITING-INTERACTION-AUDIT.md); recovery traces remain required before validation.
- `UX1.1-EV07`: DB13 complete specification, paths/state/language and paper-audit record, accepted DISC06, and UX-REQ-020 trace; runtime validation remains pending;
- `UX1.1-EV08`: paired personal/Project Settings and adverse persistence/policy scenario evidence after freeze.

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

- **Status:** `complete`
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
| `UX1.4-W01` | `complete` | Specify bounded conversation and Work as inputs to durable, profile-valid, non-authoritative working candidates and relationships with exact producer, task, snapshot, and revision lineage. | The model should perform semantic structuring without making the author operate graph fields or turning its output into authority. |
| `UX1.4-W02` | `complete` | Distinguish candidate, technical proposal, validation finding, basis, provenance, Review session, ChangeSet, decision, event, and projection roles. | Similar-looking records answer different authorship and authority questions. |
| `UX1.4-W03` | `complete` | Keep ambient working-graph updates quiet while exposing exact graph and textual inspection of origin, basis, uncertainty, validation, omissions, and current authority layer. | Inspectability should be available without becoming routine interface ceremony. |
| `UX1.4-W04` | `complete` | Trigger Review only for accountable Project decisions and preserve one task-sized Review identity across contextual checkpoint, focus workspace, and main Review route presentations. | Generated information should not flood an inbox, and contextual entry must not create a second approval system. |
| `UX1.4-W05` | `complete` | Use Current, Candidate, Origin, Basis, Difference, Consequences, and Decision as profile-neutral comparison roles with profile-owned object renderers and terminology. | Scientific and controlled-writing Projects need the same mechanics without semantic aliases. |
| `UX1.4-W06` | `complete` | Present principal basis, counter-basis or limitation, and affected scope by default; retain exact revisions, locations, included and excluded context, lineage, and technical identifiers for inspection. | Review should be calm without hiding the material grounds of a decision. |
| `UX1.4-W07` | `complete` | Separate automatic mechanical repair, findings that need judgment, and commitment-blocking validation; never present passed checks as truth or authority. | Validation should reduce effort without deciding substantive meaning. |
| `UX1.4-W08` | `complete` | Lead sessions with unresolved exceptions and count, preserve, and expose every ordinary member and applicable check. | Exception-led review must not become selective evidence hiding. |
| `UX1.4-W09` | `complete` | Let the active task model explain and revise exact working candidates conversationally while labeling explanation-only, candidate-updated, preview-updated, and unable-to-proceed outcomes. | Natural correction should remain primary without making conversation an authority channel. |
| `UX1.4-W10` | `complete` | Compile **Changes to apply** only when commitment-ready and show exact operations, snapshot, dependencies, limitations, validator and policy effects, unchanged protected state, and projection consequence. | The commitment action must match the canonical ChangeSet rather than a friendly but incomplete summary. |
| `UX1.4-W11` | `complete` | Specify Apply, Reject candidate, Decide later, Edit candidate, Change basis, Separate changes, Prepare reversal, and Revert change with exact revision, authority, and history behavior. | Correction and recovery require more than binary approval without multiplying governance systems. |
| `UX1.4-W12` | `complete` | Distinguish one atomic ChangeSet from a Review session containing independently atomic ChangeSets; preflight known conflicts and expose every member outcome without silent partial success. | Accepted batch execution permits precise progress and retry but must not mislead authors about transaction boundaries. |
| `UX1.4-W13` | `complete` | Design stale, conflict, deferred, blocked, applying, failed, partly completed, applied/projection-pending, current, rejected, superseded, and unauthorized states with bounded recovery and exact return. | Authority, command completion, and graph freshness can diverge without becoming ambiguous. |
| `UX1.4-W14` | `complete` | Distinguish ten-state graph Back/Forward, working-revision restoration, recent-ten applied changes, full History, and compensating Revert. | Navigation and drafting recovery must not be mistaken for authoritative erasure. |
| `UX1.4-W15` | `complete` | Preserve complete textual parity, reading order, keyboard and focus behavior, text scaling, touch access, panel resize, forced colors, reduced motion, non-drag actions, and non-color meaning. | Review must remain complete without a graph, wide screen, pointer, or visual-only encoding. |

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
| `UX1.4-AC12` | The entire comparison and decision works at supported viewports and text scales through keyboard, browser semantic structure, touch, non-drag controls, and textual graph parity. Native screen-reader evaluation is outside the accepted Wave 4 boundary. |

### Wave 4 runtime completion checkpoint

Automated Wave 4 closed on 2026-09-15 at backend
`abe1dc88fdb6081e48c288e80d0b2a4b689e6dac` and design
`1395f49b03fb0511fecf52f44e5c1a32841bd110`. The final executed UX and
Felicity audit in `reports/WAVE4-ITEM56-FINAL-EXECUTED-UX-FELICITY-AUDIT.md`
records material coverage for every `UX1.4-EV01`–`EV06` row within the amended
browser boundary. The working-candidate, Review, exact human Apply, Brief,
History, recovery, profile, provenance, responsive, and adverse-state paths
therefore pass `G-PROTOTYPE`, `G-CONTRACT`, `G-INTEGRATION`, and `G-VALIDATION`
in addition to the accepted DB09 specification. Later physical-device,
cross-browser, deployed-host, broad model-quality, and native assistive-
technology evaluation does not reopen this module.

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
- `UX1.4-EV06`: responsive, keyboard, focus, browser accessibility-tree, touch,
  graph/text, non-color, and panel-resize evaluation. A native screen-reader
  session is outside the Wave 4 exit criteria.

## `UX1.5` — focused graph and provenance inspection

- **Status:** `in_progress`
- **Builds:** task-bounded graph views and their textual equivalents.
- **Why:** Petra must demonstrate that graph structure controls retrieval, review, and generation while remaining understandable to researchers who do not operate a graph database.
- **Depends on:** `UX1.0`, `UX1.1`, `UX1.2`, `UX1.3`.
- **Implementation link:** `M1.3`, `M1.5`, `M1.6`, `M1.7`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.5-DISC01` | What should graph depth mean, when is 3D justified, and which renderer candidates should Petra evaluate? | Keep 2D primary, with full textual parity and command/event authority outside the renderer. Define every view by active object, scientific task, hop depth, edge allowlist, snapshot, and projection position. Drive expansion through meaningful actions such as **Show contrary evidence** and **Trace exact sources**, preserve the mental map, and provide back, forward, home, pin, collapse, and reset. Support task-specific Provenance, Neighborhood, Disagreement, Comparison, Impact, and Time layouts with semantic zoom and restrained selected-path motion plus a reduced-motion alternative. Allow literal 3D only when the z-axis represents a named scientific dimension, testing shows a comprehension benefit, full 2D and textual parity exists, and selection plus camera state can be reset, bookmarked, and shared accessibly. Feed a renderer-neutral `FocusedGraphViewModel` into Cytoscape.js as the primary 2D candidate, textual-path and evidence-matrix peer views, and Reagraph as the optional 3D candidate. Do not evaluate yFiles in this slice. No renderer may query Neo4j directly or own authority, permissions, or mutation. Compare candidates on a frozen fixture before adding a dependency. | A graph should look compelling because it exposes scientific structure, not because the camera is novel. Depth is first a scientific and query-scope concept. The adapter boundary avoids renderer lock-in, and textual parity keeps graph evidence understandable and accessible. | `UX1.5-W01`–`UX1.5-W12`, `UX1.5-AC01`–`UX1.5-AC06`, `M1.3`, `M1.5`, `M1.6`, `M1.7`, graph scene and focused-view contracts | Revisit if Cytoscape.js fails density, layout, stability, or accessibility budgets; Reagraph cannot provide 3D parity; a comprehension study demonstrates a necessary 3D benefit; a real fixture requires another renderer; or an engine pressures the client toward direct projection coupling. |
| `UX1.5-DISC02` | How should an author enter a graph task and distinguish authoritative, working, historical, and projected state? | Never open an unrestricted corpus hairball. Contextual entry opens the exact relationship question with origin, selected object, task, snapshot, and return path intact. Direct Graph entry begins from a recent or saved relationship question, a selected object, or natural language that a named model role translates into an inspectable bounded view. Use three semantic layers: **Current** for the projection of current authoritative Project state and the default view; **Working changes** for relevant durable non-authoritative candidate structure, included on contextual entry and counted when hidden; and **Historical** as an explicit non-editing mode with **Return to current**. Treat projection as view freshness rather than a fourth layer, and state when an authoritative change has applied but its graph representation is catching up. Use a dedicated before/after comparison rather than overlapping translucent states. Expose identical layer, scope, freshness, omission, and return meaning in the textual peer. | Authors need relationship inspection without learning graph storage or mistaking model structure, history, or a delayed projection for current authority. Task-preserving entry and explicit layers reduce disorientation while keeping the graph optional and inspectable. | `DB10`; `UX1.5-W01`, `W02`, `W05`–`W09`, `W11`; `UX1.5-AC02`–`AC04`; `UX-REQ-007`, `UX-REQ-011` | Revisit if task testing shows that contextual entry hides necessary scope, working structure overwhelms the current answer, authors mistake projection freshness for semantic status, or a profile requires a materially different temporal comparison. |
| `UX1.5-DISC03` | What should depth and expansion mean for the author? | Accepted 2026-09-06 after the synthetic H4 evidence example: define depth by the relationship context needed to answer the current question. Lead with profile-valid named actions, expose exact types and hop limits in Scope, retain contrary/qualifying summaries, and distinguish grouped, filtered, capped, partial, and unknown results. Expansion reveals recorded relationships at the same layer/snapshot boundary; new research or assessment uses bounded Work. Selection opens exact Details; text exposes the same paths and actions. | Authors can request useful context while inspecting the boundary and avoiding false absence, lost orientation, or hidden research/authority effects. | `DB10`; `UX1.5-W01`–`W12`; `UX1.5-AC01`–`AC10`; `UX-REQ-013`; `UX-FX24`/`UX-FX25` | Revisit if task testing shows misunderstood scope, concealed contrary material, unreliable omission counts, lost orientation, profile-invalid actions, or expansion mistaken for new Work or mutation. |

### DB10 specification checkpoint

The user accepted `UX1.5-DISC03` on 2026-09-06 after the concrete synthetic
H4 evidence example. DB10 now specifies entry and layers, semantic depth and
expansion, selection and exact paths, task layouts and dedicated comparison,
density and omissions, correction, time, view history and saved questions,
responsive/textual parity, adverse states, terminology, and the paper audit.
`DB10-P01`–`P08` and `DB10-A01`–`A04` record path and audit coverage.

`UX-REQ-013` requests the missing bounded relationship-view query composition;
its runtime shape remains proposed. `UX-FX24` and `UX-FX25` specify the paired
and adverse conformance scenarios to implement after freeze. The specification
gate is covered; this module remains `in_progress` because no new frontend,
live contract, performance, accessibility, or participant evidence is claimed.
DB11's task-and-stage presentation, direct steering, and advisory branch order
are accepted and specified; DB12–DB17 also have complete specifications and
paper-audit coverage. DB18 now supplies the accepted cross-product packet;
freeze review is next.
This checkpoint did not itself record the later product-design freeze.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.5-W01` | `in_progress` | Specify profile-valid evidence/basis, provenance, comparison, disagreement, impact, and time tasks with contextual or direct bounded entry in DB10. | A graph view should answer the author's question rather than expose the whole corpus. |
| `UX1.5-W02` | `in_progress` | Specify question-led depth, inspectable exact relationship types and limits, layer/snapshot identity, named expansion, omissions, and query consistency through DB10 and `UX-REQ-013`. | Useful context and honest completeness require an explicit scope. |
| `UX1.5-W03` | `in_progress` | Specify profile-resolved object labels, exact revision/layer identity, recognizable descriptors, selection, and Details; scientific and writing types keep distinct meanings. | Objects should remain recognizable without becoming generic graph records or semantic aliases. |
| `UX1.5-W04` | `in_progress` | Define edge line, label, direction, origin, trust, and review treatments for support, contradiction, qualification, failed replication, citation, and derivation. | Relation semantics cannot depend on color or proximity alone. |
| `UX1.5-W05` | `in_progress` | Specify Current, Working changes, Historical, and separate projection freshness, with origin, inference, lifecycle, exact base, and per-path authority preserved. | A visible edge must reveal why it exists and how much authority it has. |
| `UX1.5-W06` | `in_progress` | Synchronize graph selection with the Brief, evidence view, source inspector, assistant, and route. | The graph is one representation of stable objects, not a separate explorer. |
| `UX1.5-W07` | `in_progress` | Design a path inspector with edge rationale, source spans, scope compatibility, snapshot, and projection freshness. | Users need to inspect the meaning behind a path. |
| `UX1.5-W08` | `in_progress` | Provide a textual path, evidence matrix, or timeline whenever it explains the relationship more clearly or accessibly. | Node-link graphics are not always the best scientific representation. |
| `UX1.5-W09` | `in_progress` | Specify named expansion, filtering, honest grouping/counts, local saved exact views, ten-state history, and distinct focus/reset/return controls. | Larger reused corpora must remain navigable without losing scope or identity. |
| `UX1.5-W10` | `in_progress` | Keep ordinary drag presentation-only; explicit relink, split, scope, and relationship corrections produce working revisions or exact Review previews with non-drag parity. | Direct correction must share the existing typed authority path. |
| `UX1.5-W11` | `in_progress` | Specify every DB10 read, working, historical, comparison, projection, offline, correction, and terminal state with a bounded recovery and preserved orientation. | Graph failures and lag need honest recovery. |
| `UX1.5-W12` | `in_progress` | Specify finite query limits and readable selection; measure density, layout stability, and performance budgets on post-freeze synthetic `UX-FX25` before rendering optimization. | A fast graph must preserve labels, selection, semantics, and accessibility; paper design cannot establish measured thresholds. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.5-AC01` | A researcher can distinguish citation, support, contradiction, qualification, and inference without relying on color. |
| `UX1.5-AC02` | Every visible path states its snapshot, trust/origin, and projection freshness or provides a direct inspector route. |
| `UX1.5-AC03` | The graph opens focused on a scientific task and never defaults to an unrestricted corpus hairball. |
| `UX1.5-AC04` | The same provenance question can be answered through an accessible textual representation. |
| `UX1.5-AC05` | Direct graph edits create previews and use the same command path as other review actions. |
| `UX1.5-AC06` | Expanding, filtering, streaming, or projection refresh does not lose the active selection unexpectedly. |
| `UX1.5-AC07` | Named expansion reveals recorded context within an inspectable scope; new research or assessment uses a bounded Work preview. |
| `UX1.5-AC08` | Counts, groups, cycles, omissions, partial reads, and missing/restricted paths never imply invented links, completeness, or absence. |
| `UX1.5-AC09` | Dedicated comparison and time inspection expose exact positions and supplied differences, preserve unknown dates, and distinguish dependency from assessed consequence. |
| `UX1.5-AC10` | Graph controls, saved questions, and ten-state history change presentation only; correction, Work, and Revert retain their canonical consequences and recovery. |

### Completion evidence

- `UX1.5-EV00`: DB10 specification, terminology, paths, state matrix, paper audit, and `UX-REQ-013` contract trace (recorded 2026-09-06);
- `UX1.5-EV01`: post-freeze task-bounded graph fixture set including `UX-FX24` and `UX-FX25`;
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
| `UX1.6-DISC02` | How should an author follow durable Work and inspect orchestration? | Accepted 2026-09-06: lead with one task overview per bounded objective and meaningful stages. Show status, required input, current/remaining plan, costs/limits, controls, and results. Expand exact role/tool/validator activity beneath its stage; retain a full execution/dependency view and textual equivalent for diagnosis. The Work collection lists tasks and each detail route keeps their canonical identity and exact origin. | Authors need to follow progress and respond to decisions without reconstructing the task from calls or an execution diagram. | `DB11`; `UX1.6-W08`–`W11`, `W15`; `UX-REQ-014`; `UX-FX26` | Revisit if stage grouping obscures concurrent work, dependencies, required input, actual outcomes, resource use, or cancellation scope, or if routine tasks need the full execution structure to be understood. |
| `UX1.6-DISC03` | How should an author steer active Work and choose among dependent branches? | Accepted 2026-09-06: a clear instruction acts through a supported operational command within existing authority/limits, with a visible acknowledgment of scope, reuse, affected stages, and timing. Ask again only for unresolved consequential meaning or additional authority. Preserve exact prior inputs/results, validate reuse, and apply changes at declared running-stage boundaries. Distinguish actual prerequisites from contextual Recommended next advice. Another eligible branch can be chosen without override ceremony, warning status, repeated nudges, or automatic priority reset. Keep dependency/shared-consumer identity and task-scoped priority; viewing a branch does not schedule it. | Authors should be able to direct useful work without treating recommendations as commands or assuming that a valid alternate order harms the Project. Exact operational transitions preserve control and history. | `DB11`; `UX1.6-W08`–`W11`, `W15`–`W17`; `UX-REQ-014`, `UX-REQ-015`; `UX-FX26`/`UX-FX27` | Revisit if users mistake advice for a prerequisite, branch choice changes unrelated work, instructions need repeated approval, reuse loses scope, or a transition obscures cost, authority, scheduling, or cancellation effects. |
| `UX1.6-DISC04` | What do the author's parallel branches represent? | Clarified 2026-09-06: Project lines of inquiry extend beyond Hypotheses, though a Hypothesis can anchor a line. Questions about criteria, methods, interpretation, alternatives, or conflicting sources may advance together and share basis. Each line can involve zero or many Work tasks over time; a task or result can serve several lines. Inquiry focus and advisory reasoning order remain separate from execution scheduling, and Work completion does not resolve an inquiry. Preserve DISC03's operational control rules within that narrower scope. | The Project's reasoning must remain recognizable before, during, and after bounded execution without forcing every question into a Hypothesis or task tree. | Shared inquiry model; `DB07`, `DB10`, `DB11`; `UX1.6-W18`; `UX-REQ-016`; `UX-FX28` | Revisit if inquiry context is lost, profiles require a forced schema, task state substitutes for understanding, or selecting a line changes execution or governing Project purpose. |

### DB11 specification checkpoint

The user accepted task/stage presentation as `UX1.6-DISC02` and direct steering
with contextual, advisory branch order as `UX1.6-DISC03`. The later direction
replaces the earlier pending rule that every material plan change needed another
preview/confirmation: clear authorized instructions act with acknowledgment;
only unresolved consequential meaning or additional authority requires a question.

`UX1.6-DISC04` clarifies the intended primary branches as parallel Project lines
of inquiry. They may concern Hypotheses or other open questions and can share
basis, tasks, and results. DISC03's execution rules remain valid for Work; they
do not define the inquiry's lifetime or the Project's reasoning structure. The
shared model and DB07/DB10/DB11 now carry this distinction.

DB11 now specifies identity and hierarchy, concurrency and actual prerequisites,
contextual advice and valid alternate order, exact steering/reuse/cutover,
progress/input/resource/result meanings, supported cancellation and recovery,
responsive/textual parity, inquiry context, language, paths, and the paper audit.
`DB11-P01`–`P11` and `DB11-A01`–`A07` record path and finding coverage.
`UX-REQ-014`–`UX-REQ-016` remain proposed Work compositions and inquiry mappings;
`UX-FX26`–`UX-FX28` are post-freeze scenario specifications.

DB11 closes at `G-SPEC`; the Work/interaction module remains `in_progress`
because runtime, fixture, integration, and participant evidence are separate.
DB12–DB18 are also specified and paper-audited; continue to the explicit
product-design freeze decision.
This checkpoint did not itself record the later product-design freeze or
authorize product implementation.

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
| `UX1.6-W16` | `in_progress` | Specify actual execution prerequisites, shared dependencies, contextual recommendation rationale, eligible alternate execution branches, persistent task-scoped priority, and non-warning acknowledgment of author choice. Keep these operational rules distinct from Project inquiry context under DISC04. | Recommended order must not become authority or imply Project harm when another valid branch is chosen. |
| `UX1.6-W17` | `in_progress` | Specify direct authorized steering, exact plan/input lineage, validated reuse, active-stage transitions, successor scheduling, per-operation outcomes, and complete DB11 control/recovery paths. | Authors need natural control without duplicate confirmation, retroactive input changes, or hidden effects on unrelated work. |
| `UX1.6-W18` | `in_progress` | Preserve profile-valid Project inquiries, optional Hypothesis anchors, shared basis and open questions, contextual advisory order, and exact zero/many/shared Work links across Brief, Project map, Details, Petra, Graph, and Work. | Lines of inquiry need continuity independently of execution status; exploring one should not schedule Work or silently settle a question. |

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
| `UX1.6-AC11` | Actual prerequisites, contextual advice, and other eligible branches remain distinct; valid author priority is honored without warning or repeated approval. |
| `UX1.6-AC12` | Clear authorized steering acts with exact acknowledgment and validated reuse/cutover; unresolved meaning or new authority alone introduces another decision. |
| `UX1.6-AC13` | Concurrent/shared work, input requests, progress/resource coverage, checkpoint/cancellation/retry distinctions, and partial/terminal results retain exact identity and recovery across all DB11 paths. |
| `UX1.6-AC14` | Project inquiries can concern Hypotheses or other questions, with zero/many/shared tasks and results; choosing an inquiry does not schedule Work, and task completion or cancellation does not silently resolve or abandon it. |

### Completion evidence

- `UX1.6-EV00`: shared inquiry model and DB06/DB11 specification, terminology, path/state and paper-audit records, and `UX-REQ-014`–`UX-REQ-016` contract trace; runtime validation remains pending;
- `UX1.6-EV01`: concise, multi-object, conflict, limited-basis, failed-run, and review-batch interaction records across paired profiles;
- `UX1.6-EV02`: action, interrupt, resume, replay, detach, cancel, branch, graph Back/Forward, and governed Revert recording;
- `UX1.6-EV03`: raw AG-UI import boundary check;
- `UX1.6-EV04`: model-substitution, latency, cost, full-history, and recent-ten recovery evaluation.

## `UX1.7` — DraftArtifacts, provenance, and citations

- **Status:** `in_progress`
- **Builds:** document-first Composition and revision, with scientific artifacts as the existing contract foundation and controlled-writing semantics supplied by registered profiles.
- **Why:** Authors need to write, inspect basis, use Petra revisions, and preserve their work across checks and output operations without losing origin, uncertainty, or source ancestry.
- **Depends on:** `UX1.1`, `UX1.2`, `UX1.3`, `UX1.6`.
- **Implementation link:** `M1.8`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.7-DISC01` | What should the composition workspace center on? | Accepted 2026-09-06: the document is primary. Petra acts in explicit passage, section, or whole-artifact context; sources, related inquiries, validation findings, and revision comparisons open when needed. Preserve author edits, exact basis, uncertainty, and imported ancestry through drafting and revision. | Writing needs continuity and inspectable assistance; producing prose must not silently resolve an inquiry or overwrite manual work. | `DB12`; `UX1.7-W01`–`W14`; `UX-REQ-017`/`018`; `UX-FX29`/`UX-FX30` | Revisit if scope or selection is lost, assistance obscures the document, edits are overwritten, profile meaning is forced into scientific fields, or ordinary writing is interrupted by validation. |
| `UX1.7-DISC02` | Can an author export unfinished work while validation findings remain unresolved? | Accepted 2026-09-07: allow a clearly marked working copy with exact chosen content, relevant limitations, and assessment coverage under existing access rules. Capture selected/unsaved scope explicitly; preserve status in copied/downloaded bytes or a delivered bundle; do not substitute older passing content or certify later edits. Clear authorized export needs no duplicate approval. Profile promotion and support reuse keep their separate rules; delivery reports only observed outcomes. | Authors can continue unfinished work elsewhere while its meaning, uncertainty, and identity remain legible. | `DB12`; `UX1.7-W10`–`W15`; `UX-REQ-019`; `UX-FX31` | Revisit if recipients mistake output for approved work, status is lost, selected-scope coverage is misleading, later edits change output, actual delivery is overstated, or an access/format constraint is bypassed. |

### DB12 specification checkpoint

DB12 specifies document-first entry and responsive/dense behavior, planning,
continuous authoring, exact proposal/assessment binding, source and inquiry
context, protected ancestry, revision history, rendering, and accepted
working-copy export. Output captures exact chosen content and carries relevant
limitations; ordinary authorized export needs no repeated approval. Partial,
failed, stale, selected-scope, unsaved, and uncertain-delivery paths retain honest
outcomes and recovery. `DB12-P01`–`P11` and `DB12-A01`–`A07` record complete
paper path/audit coverage. `UX-REQ-017`–`UX-REQ-019` remain proposed workspace,
authoring, and export mappings; `UX-FX29`–`UX-FX31` are post-freeze scenarios.

DB12 closes at `G-SPEC`. Contract, implementation, integration, accessibility,
performance, and participant evidence remain separate, so this module remains
`in_progress`. DB13's personal-preferences-first Settings organization, DB14's
shared Petra visual grammar, DB15's communication contract, DB16's task-
equivalent accessibility system, and DB17's reconciliation-first recovery
system are accepted and specified. DB18's cross-product blueprint is complete;
continue to the explicit product-design freeze decision.
This checkpoint did not itself record the later product-design freeze.

The scientific tasks below retain D012's exact evidence and citation meaning.
DB12's shared authoring controls also require explicit profile mappings for
controlled writing; a manuscript cannot inherit scientific semantics by relabeling.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.7-W01` | `in_progress` | Design the CompositionRequest around purpose, audience, scope, snapshot, and requested format. | Drafting needs an explicit bounded request. |
| `UX1.7-W02` | `in_progress` | Show an inspectable CompositionPlan and its EvidencePacket assignment. | Researchers should see how evidence is intended to support the prose. |
| `UX1.7-W03` | `in_progress` | Map material DraftSpans to evidence, source, inference, researcher language, or explicit unsupported origin. | Provenance must operate at the statement level. |
| `UX1.7-W04` | `in_progress` | Provide inline inspection of source force, scope, version, and citation from the draft. | Writing should not require leaving the composition context to verify support. |
| `UX1.7-W05` | `in_progress` | Design immutable revision history, comparison, edit origin, stale provenance, and revalidation. | Human editing can change scientific meaning and support. |
| `UX1.7-W06` | `in_progress` | Render Markdown and LaTeX from one scientific content revision. | Formats must not diverge in claim meaning. |
| `UX1.7-W07` | `in_progress` | Generate, inspect, and copy BibTeX and canonical citations for exact WorkVersions. | Citation convenience must preserve source identity. |
| `UX1.7-W08` | `in_progress` | Apply Felicity editing while showing any claim-force, scope, origin, or citation validation failure. | Clearer prose cannot silently strengthen the science. |
| `UX1.7-W09` | `in_progress` | Design unsupported, disputed, abstract-only, superseded, and stale-snapshot DraftSpan warnings. | Draft quality should reflect the evidence boundary. |
| `UX1.7-W10` | `in_progress` | Design copy, download, and future-adapter actions as scoped artifact operations. | Petra supports researchers' workflows without pretending to publish a paper. |
| `UX1.7-W11` | `in_progress` | Preserve manual edits and selection through generation, validation, and renderer failures. | A failed operation must not destroy researcher work. |
| `UX1.7-W12` | `in_progress` | Provide a textual provenance report suitable for external review. | Explainability should survive outside Petra's graph visualization. |
| `UX1.7-W13` | `in_progress` | Specify continuous blank and structural authoring, durable save acknowledgment, stale assessment handling, exact late-proposal reconciliation, and revision restoration. | Authors must retain progress without support checks becoming a prerequisite for each edit or late output replacing their text. |
| `UX1.7-W14` | `in_progress` | Compose document-first collection/detail, contextual Petra, source/inquiry links, findings, comparison, and responsive/accessibility return paths. | The same artifact and selected scope must remain recognizable across surfaces and profiles. |
| `UX1.7-W15` | `in_progress` | Specify accepted working-copy export with exact capture, selected-scope limitations, format/status carriage, operation eligibility, observable copy/download outcomes, and bounded recovery. | Authors can continue unfinished work elsewhere without losing uncertainty or confusing export, support reuse, and profile approval. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.7-AC01` | Every material generated statement resolves to evidence or an explicit non-evidence origin. |
| `UX1.7-AC02` | Markdown, LaTeX, BibTeX, and the in-app view refer to the same WorkVersions and scientific content revision. |
| `UX1.7-AC03` | Editing creates a new revision and visibly invalidates affected provenance or citations until revalidated. |
| `UX1.7-AC04` | Felicity changes cannot pass when they alter validated force, scope, origin, or citation meaning. |
| `UX1.7-AC05` | Export failure preserves the DraftArtifact and gives a bounded recovery action. |
| `UX1.7-AC06` | The experience offers scoped composition assistance, not an unsupported wholesale-publication workflow. |
| `UX1.7-AC07` | Document scope, working text, selection, and unsent instructions survive contextual panels and narrow routes; profile-specific meaning remains explicit. |
| `UX1.7-AC08` | Continuous editing and acknowledged saves remain possible while checks are stale without claiming current support, approval, or reuse eligibility. |
| `UX1.7-AC09` | Model and validator results bind exact submitted revisions; late results cannot overwrite later edits or certify newer content. |
| `UX1.7-AC10` | Inquiry context and imported ancestry survive revisions; draft completion does not resolve inquiries or replace protected source bytes. |
| `UX1.7-AC11` | Unresolved checks alone do not block a supported working-copy export; exact content, relevant limitations, and assessment scope travel with the copy under actual access and format rules. |
| `UX1.7-AC12` | Selected or unsaved scope uses exact capture and runtime finding applicability; newer edits, last-passing fallback, and unknown coverage cannot silently alter or certify output. |
| `UX1.7-AC13` | Clipboard, structured formats, and bundles preserve required status without corrupting content or metadata; omitted private context remains excluded. |
| `UX1.7-AC14` | Output preparation, clipboard acknowledgment, download initiation, and confirmed receipt remain distinct; partial failure/retry/cancellation preserves actual delivered effects. |

These criteria close the DB12 specification gate; runtime and participant
verification remain pending against UX-FX29–31 and the proposed contracts.

### Completion evidence

- `UX1.7-EV00`: complete DB12 specification and paper audit, accepted DISC01/02, eleven paths/seven findings, and UX-REQ-017–019 trace; runtime evidence remains pending;
- `UX1.7-EV01`: DraftSpan-to-SourceSpan provenance trace;
- `UX1.7-EV02`: renderer and citation parity fixtures;
- `UX1.7-EV03`: human-edit, stale-provenance, and revalidation recording;
- `UX1.7-EV04`: Felicity force-preservation results;
- `UX1.7-EV05`: working-copy status/selected-scope/capture and clipboard/download/bundle delivery scenarios, including recipient comprehension and partial-outcome recovery.

## `UX1.8` — integrated design hardening and M1 closure

- **Status:** `in_progress`
- **Builds:** one coherent, resilient workbench and transition system from all accepted product modules.
- **Why:** individually coherent surfaces can still produce a confusing product when task intent, selection, identity, hierarchy, language, responsiveness, or recovery crosses module boundaries.
- **Depends on:** `UX1.0`–`UX1.7` integrated; `M1.9` acceptance environment.
- **Implementation link:** `M1.9`.

### Discussion record

| ID | Question | Accepted direction | Why it matters | Affected work | Revisit trigger |
| --- | --- | --- | --- | --- | --- |
| `UX1.8-DISC01` | What complete flow and transition contract prevents Petra's modules from becoming disconnected destinations? | Use one governed authorial loop across the 18 accepted flow families: orient; select the decision, uncertainty, source, relationship, Work, or output; inspect the smallest adequate basis; answer, act, or preview bounded Work; inspect result, limitation, provenance, validation, and impact; apply, correct, reject, defer, branch, cancel, or reverse; distinguish authority, projection, and historical state; and return to the originating item or updated Brief. Every transition names its origin, semantic destination, optional contextual surface, preserved state, commit point, terminal outcome, recovery, and return. A Work result routes to Review for proposed authority, Composition for an output, its origin for a read-only answer, or Work for retained failure. Direct and Petra-mediated variants converge on the same identities and commands. Each profile maps typed meaning into this grammar without aliasing its ontology, and every material path has responsive and accessible parity. | A screen inventory cannot prove that a person can complete work. An explicit cross-module contract prevents lost context, duplicate governance, generic success states, and dead ends while making adverse-state and accessibility testing finite. | `DB05`; all `UX-FLOW-01`–`18` and `UX-PATH-01`–`04`; accepted surface-transition and flow-to-place matrices; `UX1.8-W02`–`W08`; `UX-REQ-001`–`UX-REQ-023` | Revisit if a material user goal lacks an entry or terminal state, a profile cannot map into the shared loop, task testing exposes a dead end or false return, or a required transition cannot preserve identity and authority through the accepted navigation context. |
| `UX1.8-DISC02` | What format should consolidate the complete design into an implementation-ready product blueprint? | Accepted 2026-09-07: use one traceable implementation packet organized by author task and canonical surface. Fourteen entries cover Projects, the Project shell, Brief, Sources, Review, Graph, Work, Composition, registered profile tools, History, Settings, Details, Petra, and transient action/feedback. Each entry binds its source specification, ordered regions, responsive and assistive compositions, independent states, flow/commit/recovery/return, component ownership, `UX-REQ` dependencies, profile slots, language/accessibility/recovery rules, and later evidence. The packet indexes normative DB04–DB17 contracts and cannot weaken them or become runtime authority. | Implementers need a finite build and validation map without guessing across documents, while a second restatement of product semantics would create drift. Traceability makes missing contracts, adverse states, return paths, and evidence gates visible before code resumes. | `DB18`; `UX1.8-W13`–`W16`; `UX1.8-AC07`–`AC14`; `UX-FX44`–`UX-FX46`; `UX-REQ-001`–`UX-REQ-023`; `UX-DESIGN-FREEZE-01` | Revisit if a material surface or flow cannot fit one packet entry, an implementer must infer authority or recovery, source and packet requirements conflict, profile variation requires a control fork, or post-freeze traceability fails. |

### DB18 specification checkpoint

DB18 consolidates the accepted product into fourteen traceable surface packets,
six responsive/assistive compositions, nine independent state dimensions, all
18 flow families, and four named end-to-end traces. It specifies component and
state ownership, profile extension slots, language/accessibility/recovery
obligations, the full `UX-REQ-001`–`023` dependency ledger, a post-freeze build
sequence, five evidence gates, sixteen paper interaction paths, twelve findings,
21 acceptance criteria, and `UX-FX44`–`UX-FX46`.

The cross-product audit closes DB01–DB03 at specification depth: DB01's premise
and non-goals, DB02's responsible-author and supporting-role boundaries, and
DB03's versioned profile system are accepted. `UX-REQ-004` remains the proposed
runtime profile boundary, and public multi-user collaboration remains deferred
under `UX-D06`. DB18 finds no need for `UX-REQ-024` and leaves every proposed
runtime request and all prototype/contract/integration/validation evidence open.

DB18 closes at `G-SPEC`. The user subsequently accepted
`UX-DESIGN-FREEZE-01` on 2026-09-07 against frozen baseline commit `655d094`.

### `UX-DESIGN-FREEZE-01` record

The accepted baseline contains DB01–DB18, fourteen surface packets, all 18 flow
families, four end-to-end paths, the complete `UX-REQ-001`–`023` ledger, and
explicit non-blocking deferrals `UX-D01` and `UX-D03`–`UX-D08`; `UX-D02` is
superseded. The freeze authorizes Phase 2 neutral reference-UX work with synthetic
conformance content. It does not accept a runtime request, complete a module, or
claim prototype, contract, integration, accessibility, performance, security,
recovery, clean-start, or participant evidence.

Later evidence changes the baseline only through the affected decision's revisit
trigger and a stated generalized product failure. Contextual integrations remain
Phase 3 work after the neutral product stands independently.

### Phase 2 implementation checkpoint

The first production-candidate presentation of all fourteen DB18 packets is
implemented in `apps/workbench/` against invented, profile-resolved fixtures:

| Commit | Packet coverage | Material evidence |
| --- | --- | --- |
| `1893eed` | Projects, Project shell, Brief, Sources, Details | Three synthetic profiles; exact source return; identity-only content refusal; responsive shell |
| `66971e9` | Review, Graph | Exact candidate/current/basis/consequence presentation; Current, Working changes, and Historical layers; shared-data canvas, textual peer, and semantic scene |
| `9aae040` | Work, Petra | Canonical task references; visible command boundaries; parallel inquiries mapped independently to zero/many Work tasks; advisory dependency-aware recommendation |
| `bfdcecf` | Composition, registered profile tools, History, Settings, transient action/feedback | Exact revision comparison and provenance; local/durable/delivery distinctions; causal effects and additive reversal preview; personal/governed settings boundary; narrow active-nav visibility |

The checkpoint has 60 passing workbench tests, a passing workbench typecheck,
targeted ESLint and Prettier checks, a successful production Vite build, and
manual wide/500-CSS-pixel visual review. The fixtures do not use contextual demo
data or the two untracked user assets.

This records packet coverage and limited `G-PROTOTYPE` evidence. It does not
close any module: the full synthetic state/flow matrix, keyboard and assistive-
technology runs, model scene-explanation validation, visual regression,
performance, clean-start, privacy/security, recovery, and participant evidence
remain open. `UX-REQ-001`–`023` also remain proposed, so `G-CONTRACT` and
`G-INTEGRATION` are open. Where a command boundary is unavailable, the frontend
explains the missing capability and cannot fabricate success or authority.

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
| `UX1.8-W13` | `complete` | Inventory the fourteen canonical, persistent, contextual, and transient surface packets with tasks, completion, ordered information, source specifications, and dependencies. | Implementation needs complete surface coverage without promoting every mode or profile object into global navigation. |
| `UX1.8-W14` | `complete` | Map responsive/assistive compositions, independent state dimensions, all 18 flow commit/recovery/return paths, four end-to-end traces, and component ownership. | Cross-surface identity, authority, state, and return must be assessable before implementation resumes. |
| `UX1.8-W15` | `complete` | Map bounded profile slots and DB15–DB17 language, accessibility, model-readable presentation, and recovery obligations into every packet. | New profiles and modalities must preserve Petra's exact control and outcome meanings. |
| `UX1.8-W16` | `complete` | Reconcile `UX-REQ-001`–`023`, close DB01–DB03 bookkeeping, complete the DB18 paper audit and evidence plan, and expose the design-freeze boundary. | A paper-complete product must show every runtime gap and later proof obligation without claiming they already pass. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.8-AC01` | The complete M1 acceptance demonstration can be performed without losing project, snapshot, selection, provenance, or active-work orientation. |
| `UX1.8-AC02` | All primary actions and scientific relationships have keyboard-accessible, non-color-dependent paths. |
| `UX1.8-AC03` | No asynchronous, failure, or projection-lag state is presented as current authoritative science. |
| `UX1.8-AC04` | Critical task evaluations reveal no unresolved issue that could cause unsupported trust, accidental mutation, lost work, or provenance confusion. |
| `UX1.8-AC05` | Stable fixture routes pass visual-regression review at the supported viewport and text-scale matrix. |
| `UX1.8-AC06` | The M1 design-debt register contains no unowned critical item. |
| `UX1.8-AC07` | Every accepted product surface has one DB18 packet entry with its task, completion, hierarchy, responsive/assistive forms, source specification, and contract dependencies. |
| `UX1.8-AC08` | Every UX-FLOW-01–18 family and UX-PATH-01–04 trace identifies its canonical packet, authority/commit point, terminal state, recovery, and exact return. |
| `UX1.8-AC09` | Authority, time, representation, content extent, Work, validation/Review, connectivity/delivery, local persistence, and recovery effect remain independent state dimensions across surfaces. |
| `UX1.8-AC10` | Direct and Petra-mediated paths use the same registered operations, while component and model roles cannot infer identity, eligibility, completion, authority, or recovery facts. |
| `UX1.8-AC11` | Versioned profile slots support scientific, controlled-writing, and unrelated compatible taxonomies without changing Petra's control, visual, language, accessibility, recovery, or History grammar. |
| `UX1.8-AC12` | DB15 language, DB16 task/outcome equivalence, and DB17 reconciliation obligations attach to every applicable packet, including unavailable and constrained presentations. |
| `UX1.8-AC13` | `UX-REQ-001`–`023` account for every missing runtime dependency; no `UX-REQ-024`, client inference, model prose, fixture field, or projection is used to conceal a gap. |
| `UX1.8-AC14` | DB01–DB18 reach `G-SPEC`, later evidence gates remain open, explicit deferrals remain visible, and only the user's separate acceptance records `UX-DESIGN-FREEZE-01`. |

### Completion evidence

- `UX1.8-EV01`: full M1 screen and interaction recording;
- `UX1.8-EV02`: accessibility conformance report;
- `UX1.8-EV03`: adverse-state, latency, and recovery report;
- `UX1.8-EV04`: task-evaluation findings and dispositions;
- `UX1.8-EV05`: visual-regression baseline and final debt register.
- `UX1.8-EV06`: DB18 traceable product blueprint with fourteen surface entries,
  all flow and end-to-end mappings, state/component/profile ownership, request
  ledger, sixteen paths, twelve findings, and accepted DISC02.
- `UX1.8-EV07`: complete-packet, whole-product, and safe-degradation evidence
  under `UX-FX44`–`UX-FX46` after design freeze.
- `UX1.8-EV08`: user acceptance of `UX-DESIGN-FREEZE-01` on 2026-09-07
  against exact product-design baseline commit `655d094`, with later evidence
  gates and explicit deferrals unchanged.

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
| `UX-FX24` | Paired bounded relationship questions | Two invented profiles exercise question-led scope, exact multi-step paths, contrary or constraining material, working layers, dependencies versus impact, dedicated comparison, direct correction, bounded new Work, textual parity, and exact return |
| `UX-FX25` | Dense, temporal, and adverse graph exploration | High-degree/cyclic paths, overlapping groups and honest counts, query limits and late responses, historical/unknown dates, stale working base, incomplete comparison, projection lag/blocking, missing/restricted targets, renderer/offline recovery, local saved views, ten-state history, and responsive/accessibility variants |
| `UX-FX26` | Paired Work task and stage inspection | Invented scientific and writing tasks expose objective, declared stages and concurrent/dependent activity, exact role/tool/validator attempts, required input, progress units, resource coverage, permitted partial outputs, success/failure, checkpoint/cancellation distinctions, reconnect/replay, and responsive/textual parity across task entry points |
| `UX-FX27` | Contextual branch choice and Work steering | A real prerequisite feeds two stages while another branch is eligible; valid non-recommended choice preserves priority without warnings. Pair changed advice, shared dependencies, direct authorized scope/input changes, validated reuse/reruns, actual authorization/ambiguity, atomic/checkpoint limits, stale/failed/partial transitions, cancellation races, retry/resume limits, deliberate fresh execution, and exact result scope across profiles. |
| `UX-FX28` | Parallel Project lines of inquiry | Invent criteria, alternatives, method/interpretation, and optional Hypothesis inquiries across two profiles. Explore alternatives before criteria without a false gate; preserve zero/many/shared tasks and results, an open inquiry after Work completion, exact basis and uncertainty, advisory preference, Work/Review return, and graph/text/navigation parity. |
| `UX-FX29` | Paired document-first Composition | Invent a scientific comparison drawing on unresolved inquiry lines and a controlled-writing revision with protected source ancestry. Exercise collection/contextual entry, document scope, plan, contextual Petra/basis/findings, exact proposal comparison, source/inquiry return, and responsive/textual accessibility. |
| `UX-FX30` | Continuous authoring and exact revision recovery | Blank and structural edits, successive saves while checks are stale, late model and validation results, source changes, partial/failed Work, conflicting or disconnected saves, historical comparison, and render failure preserve text, exact identities, origin, and honest status. |
| `UX-FX31` | Working-copy export and delivery | Pair unresolved criteria/stale citation and manuscript continuity findings; exercise unchecked/failed/unknown coverage, selected scope, unsaved capture, newer edits, historical choice, clipboard and structured-format status, required-report failure, restricted/excluded inclusions, partial multi-format results, delivery uncertainty, retry, and cancellation after delivery. |
| `UX-FX32` | Personal preferences and Project controls | Pair two profiles and Projects; exercise Appearance, Layout, Editor, Accessibility, system overrides, presets/resizing, model-detail disclosure, exact control target, read-only/editable rules, prospective policy change, and responsive/accessibility parity without changing task authority. |
| `UX-FX33` | Settings adverse states and recovery | Storage unavailable/corrupt/session-only, forced colors/reduced motion, narrow layout, unsaved editor text, observable cross-tab update, missing Project, stale/failed control read, expired grant, unavailable route, unknown budget, policy conflict, partial/uncertain outcome, reset and recovery preserve work and exact scope. |
| `UX-FX34` | Shared visual grammar across profiles | Use invented scientific, controlled-writing, and at least one unrelated third-profile Project across every primary place. Vary registered objectives, objects/relations, task families, labels, glyphs, finite patterns/shapes, legends, and optional semantic tones while selection, actions, authority, warning, approval, error, focus, density, and recovery remain shared. Include admission, omitted flows, relation-versus-outcome separation, and unknown/replaced descriptors. |
| `UX-FX35` | Design-system stress and recovery | Exercise all themes, forced colors, reduced motion, 200% text, narrow/high-zoom/touch/keyboard conditions, dense lists/tables/graphs, overlays, busy/live updates, invalid/unavailable/stale/conflicted/failed/partial states, icon failure, encoding collision, theme-storage failure, and component migration without lost input, selection, focus, meaning, or page overflow. |
| `UX-FX36` | Extensible-profile communication conformance | Use invented scientific, controlled-writing, and at least one unrelated third-profile Project with materially different taxonomy, references, force terms, units, roles, validators, task/discourse conventions, and outputs. Run grounded answers, recommendations, clarifications, Work, Review, action reports, corrections, and history through two eligible conversational models while Petra's shared acts, controls, authority, status, candor, and recovery remain stable. |
| `UX-FX37` | Language, reference, and recovery stress | Exercise ambiguous, multiple, replaced, missing, and long references; terminology-version change; unsupported/partial locale; source language and derived translation; limited/stale/conflicting basis; invalid/fallback model output; simultaneous response/Work/connection state; stale action; uncertain command; failed/partial delivery; long compacted thread; narrow/high-zoom/screen-reader/live-region output; and wording-versus-domain correction without lost meaning or duplicate effect. |
| `UX-FX38` | Task and outcome equivalence | Use scientific, controlled-writing, and unrelated third-profile Projects across orientation, Sources, Graph, Work, Review, Composition, Settings, and History. Complete the same named tasks through visual/pointer and keyboard/screen-reader peers, comparing material information/actions/outcomes, focus/selection/return, errors/recovery, command identity, task time, navigation steps, and observed confusion. |
| `UX-FX39` | Accessibility pressure and generated-interface recovery | Exercise keyboard, voice/switch-equivalent input, touch/coarse pointer, 200% text, 400% zoom/320 CSS-pixel equivalent, magnification, forced colors, monochrome, reduced motion, no audio, long/translated terms, drag/hover alternatives, overlays, tooltips, dialogs, editors, panes, streaming, reconnect/replay, invalid/stale/partial/failed state, unsupported AT combination, and AG-UI-generated content without lost task, focus, input, meaning, or duplicate effect. |
| `UX-FX40` | Model explanation of the visible graph | Use the same bounded graph under visual/text peers, layouts, selections, groups, filters, layers, expansion, viewport clipping, hidden counts, stale scene, delayed projection, mismatched capture, restricted members, semantic-only model, and eligible vision model. Verify that Petra explains graph facts and current visual organization from their exact bases, names omissions/mismatch/capability, preserves privacy, and never infers authority or domain force from pixels. |
| `UX-FX41` | Cross-module preservation and exact return | In scientific, controlled-writing, and unrelated third-profile Projects, interrupt Project/Brief reads, source inspection, Graph/Details, Petra, Work, Review, Composition, Settings, export, and History. Exercise recoverable and lost local input, cached/stale state, retained partial output, exact task/object/selection/focus return, profile terminology, narrow/high-zoom, keyboard/screen-reader, and direct/Petra paths without changed authority. |
| `UX-FX42` | Uncertain, mixed, offline, and race recovery | Drop delivery before and after command receipt; apply a batch with applied/conflicted/failed/pending/unknown members; reuse conflicting idempotency input; disconnect/replay; race completion with cancellation; fail projection after commit; exhaust retry; present invalid checkpoint resume; expire access/capability; enter and leave offline/service outage. Verify reconciliation, no duplicate effect, no leakage, accurate attempt/cost, and safe unavailable states. |
| `UX-FX43` | Local conflict, History, delivery, and reversal | Restore a local draft against unchanged and newer durable bases; fail local storage and save; regenerate/revalidate; generate multi-member output with publication and delivery uncertainty; retry exact delivery separately from regeneration; inspect filtered object/task/Project histories, terminology-version change, restricted/redacted members, causal-order ambiguity, recent-ten/full-history boundary, single and supported multi-step compensation, ineligible Revert, projection catch-up, and Return to current. |
| `UX-FX44` | Complete packet and route conformance | Run all fourteen DB18 packets and every applicable UX-FLOW-01–18 entry/commit/terminal/return combination across invented scientific, controlled-writing, and unrelated compatible profiles. Cover wide, compact, narrow/high-zoom, keyboard/screen-reader, touch, long/translated terms, ordinary/dense/empty/limited/asynchronous/adverse states, exact identity, direct/Petra parity, and component ownership without demo inputs. |
| `UX-FX45` | Whole-product end-to-end acceptance | Run UX-PATH-01–04 from cold entry through source/basis, Graph/Details, Petra, Work, Review, Composition, History, Settings where relevant, interruption/recovery, and updated Brief. Record navigation/focus, authority/commit, provenance, projection, cost, cancellation, outputs, task time/steps, confusion, severe errors, and participant dispositions. |
| `UX-FX46` | Contract, profile, privacy, and clean-start degradation | Remove each proposed read/action family in turn; use unsupported/replaced profile versions, omitted flows, restricted objects, invalid deep links, stale/partial reads, offline/service failure, model/scene mismatch, and recovery uncertainty. Verify exact unavailable behavior and no leakage or fabricated authority, then start/build/operate the neutral product with every contextual demo directory and adapter absent. |

Post-freeze fixtures use Petra's canonical IDs and runtime shapes. When a runtime contract is not yet available, a fixture declares its provisional schema and associated `UX-REQ` item. They use synthetic content and remain independent of contextual demo assets and directories. Existing pre-freeze shell and graph fixtures remain exploratory comparison evidence; they do not satisfy the neutral reference-UX gate until reviewed or rebuilt against the frozen brief.

## Design validation evidence

| ID | Evidence class | Minimum record |
| --- | --- | --- |
| `UX-EV01` | Specification | Task, states, language, authority boundary, dependencies, and acceptance criteria |
| `UX-EV02` | Visual | Screenshots or recordings for named fixture, viewport, theme if applicable, and revision |
| `UX-EV03` | Interaction | Named path, entry conditions, steps, system feedback, commit point, authority effect, preserved state, cancellation or reversal, successful result, adverse states, recovery, and focus trace |
| `UX-EV04` | Accessibility | Named task/outcome equivalence across visual and assistive peers; keyboard/input, focus, text scale/reflow, contrast/non-color, motion, targets/non-drag, semantic structure, live status, graph alternative, browser/AT, and model scene-explanation results |
| `UX-EV05` | Language | Terminology ledger plus D006 origin, force, reference, descriptor, uncertainty, action, status, confirmation, empty-state, and error fixtures |
| `UX-EV06` | Contract | View model, query, command, event, object identity, and AG-UI boundary trace |
| `UX-EV07` | Performance | Fixture size, hardware/context, local/cached/remote origin, latency, layout stability, and rendering observations |
| `UX-EV08` | Usability | Heuristic or participant method, task, evaluator or participant context, observed failure, affected heuristic, consequence, severity, disposition, and follow-up |
| `UX-EV09` | Regression | Stable state fixture, expected rendering/behavior, comparison result, and approved exception |

Usability numbers describe observed behavior; they do not become universal product truths. Petra may later adopt quantitative exit thresholds after the pilot protocol defines the task, population, environment, and tolerance. Until then, a severe provenance, authority, accessibility, or lost-work failure blocks validation even if an average task metric looks favorable.

### Automated wave execution evidence

`UX1.5` through `UX1.8` and later automated design waves must translate every
applicable completion-evidence row into the frozen scenario sidecar defined in
`scripts/wave-evidence-policy.md` before a wave starts. Compound rows are split
into independently executable scenarios, including their named ordinary,
adverse, recovery, profile, provenance, authority, responsive, and
accessibility conditions.

A scenario counts only after its actual command runs and a retained artifact
records the exact commit and honest boundary. The existence of a fixture,
helper, route, test case, or report does not establish execution. An inventory
audit must reconcile this roadmap, the wave packet, accepted scope changes,
the invoked commands, and the retained artifacts before the remediation
reserve begins. Later slices repair the identified gaps and repeat the
adversarial and final design audits. The coordinator cannot close a wave while
the frozen sidecar contains an unexecuted scenario.

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
| `UX-REQ-001` | `partial`; shell 1.1 context and exact-selection slice passed | Snapshot-consistent `ProjectShellView` | `M1.7` | `reports/UX-REQ-001-SHELL-CONTEXT.md` |
| `UX-REQ-002` | `proposed` | Task-oriented, profile-resolved, snapshot-consistent `ProjectBriefView` | `M1.6`, `M1.7`, later `M2`/`M3` extensions | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-003` | `proposed` | Versioned `SuggestedActionView` with preview and typed invocation | `M1.6`, `M1.7`, later `M2`/`M3` extensions | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-004` | `proposed`; architecture decision required | Versioned Project-profile binding, typed domain registry, adaptive vocabulary/view boundary, and bounded semantic presentation descriptors with safe fallback | `M1.1`, `M1.2`, `M1.7`, later controlled-writing contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-005` | `proposed`; architecture decision required | Immutable existing-document lineage and exact new-revision promotion | `M1.2`, `M1.8`, later controlled-writing contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-006` | `proposed` | Durable Project threads, task linkage, exact per-turn context, stale-thread choices, and branch lineage | `M1.1`, `M1.6`, `M1.7` | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-007` | `proposed` | Client presentation-history boundary, recent-ten reversible changes, authorized causal Project History, exact compensation preview, additive governed Revert, projection comparison, and Return to current | `M1.1`, `M1.3`, `M1.5`, `M1.7`, later profile/history contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-008` | `partial`; initial live semantic-location slice passed | Semantic object location, exact/historical/replaced resolution, safe fallback, and registered destination role | `M1.1`, `M1.7`, later definition/type contracts | `reports/UX-REQ-008-SEMANTIC-LOCATION.md` |
| `UX-REQ-009` | `partial`; scientific Project source read is live and frozen lifecycle integration is specified | Snapshot-consistent, profile-resolved Project source and exact-inspection read model | `M1.2`, `M1.4`, `M1.7`, later profile contracts | `reports/UX-REQ-008-010-SOURCES-LIFECYCLE-INTERFACE-HANDOFF.md` |
| `UX-REQ-010` | `partial`; exclude/restore and replacement create/retract authority are live, frozen interface integration specified, physical deletion unavailable | Project-source association plus governed removal and local-copy deletion lifecycle | `M1.2`, `M1.5`, `M1.7`, later retention policy | `reports/UX-REQ-008-010-SOURCES-LIFECYCLE-INTERFACE-HANDOFF.md` |
| `UX-REQ-011` | `proposed`; architecture decision required | Durable, profile-valid, non-authoritative working candidates and graph relationships derived from bounded interactions with exact origin, basis, validation, and revision lineage | `M1.1`, `M1.3`, `M1.5`, `M1.6`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-012` | `proposed` | Snapshot-consistent, profile-neutral Review-session query and missing correction, basis-change, separation, deferment, and member-outcome command composition | `M1.5`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-013` | `proposed` | Bounded profile-resolved relationship query with exact layers/paths, scope and omissions, finite expansion, supplied comparison/impact facts, and temporal capabilities | `M1.3`, `M1.5`, `M1.6`, `M1.7`, later profile/temporal contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-014` | `proposed` | Project Work collection and task/stage read composition with exact identity/activity, required input, outcomes, resource coverage, control eligibility, and safe destinations | `M1.1`, `M1.2`, `M1.6`, `M1.7`, later orchestration/profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-015` | `proposed` | Direct Work steering, task-scoped branch priority, validated reuse, exact plan/input lineage, safe active-stage and successor transition, and recovery command composition | `M1.1`, `M1.2`, `M1.6`, `M1.7`, later orchestration/profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-016` | `proposed`; profile mapping required | Project lines of inquiry beyond Hypotheses, shared basis/open questions, contextual advisory order, and exact zero/many/shared Work and result links across existing surfaces | `M1.1`, `M1.2`, `M1.3`, `M1.5`, `M1.6`, `M1.7`, later profile contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-017` | `proposed` | Profile-resolved Composition collection/document reads with exact selection, inquiry/basis, save/assessment, revision comparison, output capabilities, and return context | `M1.1`, `M1.2`, `M1.7`, `M1.8`, later profile/authoring contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-018` | `proposed`; authoring boundary required | Continuous blank/structural working-copy edits, durable save acknowledgment, exact proposal reconciliation, and assessment binding without bypassing existing draft reuse or promotion rules | `M1.1`, `M1.2`, `M1.7`, `M1.8`, later profile/authoring contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-019` | `proposed` | Exact working-copy export capture, scoped limitation/status carriage, operation eligibility, format/bundle composition, and observable delivery/recovery | `M1.1`, `M1.2`, `M1.7`, `M1.8`, later profile/destination contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-020` | `partial`; first read-only composition implemented | Snapshot-consistent effective Project controls with exact privacy/data, capability, model/routing, budget, and Review scope plus mapping to owning typed prospective transitions and conflict/outcome recovery | `M1.1`, `M1.2`, `M1.5`, `M1.6`, `M1.7`, later governance/profile contracts | `reports/UX-BACKEND-HANDOFF.md`, `reports/UX-REQ-020-EFFECTIVE-CONTROLS.md` |
| `UX-REQ-021` | `proposed` | Profile-resolved statement-level communication plan with generalized communicative acts, exact origin/basis/reference and recommendation/action links, bound terminology/renderer/validator versions, progressive state, and safe language validation/repair receipts | `M1.6`, `M1.7`, `M1.8`, `UX-REQ-004`, later profile communication contracts | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-022` | `proposed` | Versioned model-readable presentation context binding exact graph/view semantics, current visible scene, complete accessible peer, optional permitted capture, model input, and validated explanation without making pixels or interaction state authoritative | `M1.3`, `M1.6`, `M1.7`, `UX-REQ-006`, `UX-REQ-013`, `UX-REQ-021` | `reports/UX-BACKEND-HANDOFF.md` |
| `UX-REQ-023` | `proposed` | Canonical recovery assessment composing exact owning records into effect knowledge, preserved/lost state, independent-member outcomes, current registered actions, History consequence, and safe return without creating a universal recovery command or second ledger | `M1.1`–`M1.9`, `UX-REQ-007`, `UX-REQ-014`, `UX-REQ-015`, `UX-REQ-018`, `UX-REQ-019` | `reports/UX-BACKEND-HANDOFF.md` |

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

1. use frozen baseline `655d094` and treat later changes through the named
   revisit and generalized-failure process;
2. obtain architecture dispositions for `UX-REQ-001`–`UX-REQ-023` while keeping
   unavailable runtime facts explicit and preventing backend convenience from
   redefining the frozen UX;
3. broaden the implemented fourteen-packet neutral reference presentation across
   the complete synthetic `UX-FX01`–`UX-FX46` state and flow matrix;
4. validate every packet, flow, end-to-end trace, responsive/assistive peer,
   language role, adverse state, recovery path, and no-demo clean start through
   the five evidence gates; and
5. plan and produce scientific, controlled-writing, and later profile
   integrations as separate efforts after the product baseline stands
   independently.

This sequence turns the accepted visual, language, accessibility, and recovery
systems into a task-complete product one flow at a time while keeping
implementation contracts and domain authority explicit.
