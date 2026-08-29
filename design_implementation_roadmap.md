# Petra Design Implementation Roadmap

Status: UX1.0 design foundations and UX1.1 research shell in progress
Last updated: 2026-08-29
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

## Outcome

Petra will receive a deliberate design pass without pausing the evidence-spine build or allowing prototypes to invent scientific state. Design can run ahead with deterministic fixtures, but production integration follows the contracts and authoritative data delivered by the implementation roadmap.

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

The interface should feel like a scientific IDE with a collaborative research assistant: calm at rest, dense when inspected, fast for local work, explicit about background work, and skeptical about what has not been established.

## Design-terminal mission

The design track is responsible for leaving Petra's frontend as close to production-complete as its available contracts permit. It does not stop at wireframes, visual references, or disposable prototypes. For each module, it should produce:

- accepted information hierarchy and interaction behavior;
- production-quality React components and Petra-specific view models;
- realistic deterministic fixtures for every material state;
- responsive, keyboard, focus, motion, and non-color behavior;
- user-facing language that follows D006;
- component, interaction, accessibility, and visual-regression evidence;
- a narrow adapter boundary through which fixture data can be replaced by live Petra queries, commands, and AG-UI interactions;
- live integration when the corresponding implementation contract is available.

“Frontend complete” does not mean inventing backend state in the browser. When a live contract is not ready, the design track completes the real interface against a named contract-shaped fixture and records the missing connection as a `UX-REQ`. The resulting component should survive that connection without a visual or interaction rewrite.

Exploration remains part of this mission. Alternative layouts or interactions may be tested in isolated fixture routes or short-lived branches. Once a direction is accepted, the design terminal implements the selected candidate in the production workbench and removes or clearly archives rejected variants. Exploratory code never becomes an unlabeled production path.

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

Petra uses a three-horizon rule:

1. **Integrate now:** production frontend work for the implementation slice whose contracts are stable enough to consume.
2. **Complete against fixtures next:** production-quality frontend work for the next scientific surface, including the view-model and query needs implementation should expose.
3. **Outline later:** only goals, risks, and dependencies for work beyond the next surface.

This keeps design one useful step ahead without designing an imaginary backend. At any point, the two tracks should have one explicit synchronization point:

```text
accepted decisions
      |
      +-> implementation contracts ------+-> production component
      |                                  |
      +-> design fixture -> prototype ---+-> integrated validation
```

### Parallel-work rules

| ID | Rule | Consequence |
| --- | --- | --- |
| `UX-P01` | Design may prototype against named deterministic fixtures before persistence or models are ready. | Visual and interaction work does not wait for every backend slice. |
| `UX-P02` | Every fixture declares which authoritative query, command, or event it represents. | Mock data cannot silently become a second domain model. |
| `UX-P03` | Production integration waits for the corresponding runtime contract and implementation acceptance path. | Components do not guess final payloads or mutation semantics. |
| `UX-P04` | Screen-level specifications and prototypes can lead production integration by one module. This roadmap may specify M1 delivery requirements further ahead. | Petra knows what each module must accomplish without accumulating speculative screen designs. |
| `UX-P05` | A design need that changes data, commands, policy, or authority becomes a `UX-REQ` request. | Architecture changes remain visible and reviewable. |
| `UX-P06` | One stable object identity must survive route, Brief, table, graph, inspector, and assistant representations. | Parallel work cannot create screen-local scientific objects. |
| `UX-P07` | Direct interaction and assistant mediation call the same Petra command path. | Design cannot add a conversational back door into trusted state. |
| `UX-P08` | Module prototypes are reviewed in realistic dense and adverse states, not only a polished happy path. | Design decisions account for scientific work rather than demo content. |
| `UX-P09` | A dedicated coherence pass follows module integration. | Module-by-module work can proceed now without pretending local polish guarantees a coherent product. |
| `UX-P10` | A design refactor does not reopen accepted architecture unless evidence crosses a decision's revisit trigger. | Design iteration stays productive and bounded. |
| `UX-P11` | Accepted fixture-backed components are production frontend code, not throwaway mockups. | Live integration should replace providers and adapters rather than rebuild the experience. |
| `UX-P12` | Each module begins with a user discussion before consequential design choices are implemented. | Priorities, definitions, and tradeoffs remain collaborative and explicit. |

### Synchronization sequence

| Wave | Design work | Parallel implementation | Required handoff |
| --- | --- | --- | --- |
| `UX-WAVE-0` | `UX1.0` foundations and inventory | Current M1 work | Tokens, fixture rules, state vocabulary, and design-debt register |
| `UX-WAVE-1` | `UX1.1` shell plus `UX1.3` Papers/source prototype | `M1.2` PostgreSQL and artifact spine | Stable Project, snapshot, Work, WorkVersion, Artifact, and interaction-trace view needs |
| `UX-WAVE-2` | `UX1.2` Research Brief and `UX1.5` focused graph prototypes | `M1.3` projection and `M1.4` parsing | Projection, SourceSpan, standing, evidence-frontier, and selection view needs |
| `UX-WAVE-3` | `UX1.4` evidence inbox and review | `M1.5` proposals, ChangeSets, and trusted graph | Exact proposal, diff, policy, decision, impact, and reversal command contracts |
| `UX-WAVE-4` | `UX1.6` assistant, actions, and active work; integrate `UX1.1`–`UX1.6` | `M1.6` retrieval and `M1.7` workbench | ContextPacket, EvidencePacket, WorkUnit, AG-UI, interrupt, replay, and cancellation view models |
| `UX-WAVE-5` | `UX1.7` drafting and citations | `M1.8` DraftArtifact path | Composition, provenance, revision, citation, and renderer contracts |
| `UX-WAVE-6` | `UX1.8` whole-workbench validation | `M1.9` hardening and closure | End-to-end acceptance run, recovery states, accessibility evidence, and resolved critical design debt |

The order names dependencies, not calendar commitments. If implementation order changes, the design item keeps its identifier and updates its named handoff.

## Discussion-first module loop

The design terminal proceeds with the same collaborative cadence used for Petra's architecture decisions. It does not interpret the roadmap as permission to make every consequential UX decision alone.

Each module follows this loop:

1. **Orient:** inspect the accepted decisions, current frontend, available contracts, fixture states, and prior module evidence.
2. **Define:** discuss the researcher's task, primary object, information priority, key actions, dangerous misunderstandings, and explicit non-goals.
3. **Compare:** when a choice is consequential, present a small number of viable approaches with concrete tradeoffs and a recommendation.
4. **Decide:** record the accepted direction, unresolved questions, and any implementation contract needed.
5. **Implement:** build the smallest production-quality vertical interaction that exercises the decision against realistic fixtures.
6. **Review:** show the implemented module in ordinary, dense, empty, limited, running, stale, failed, and recovery states that apply.
7. **Refine:** incorporate the user's design feedback, update evidence and debt, and close only the gates that actually pass.
8. **Advance:** discuss the next module before beginning its consequential design work.

The terminal may resolve routine implementation details autonomously after a direction is accepted. It pauses for discussion when a choice changes information hierarchy, scientific interpretation, authority cues, action consequences, navigation, cross-module behavior, or the accepted visual language.

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
| `UX-REQ-003` | Cross-roadmap contract request | Add proposal impact summary to a query view |
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
| `G-SPEC` | Task, object, states, language, accessibility, and authority boundary are specified. |
| `G-PROTOTYPE` | The production-candidate frontend works against representative deterministic fixtures. |
| `G-CONTRACT` | Queries, commands, events, and identity assumptions match the runtime contracts or have accepted `UX-REQ` items. |
| `G-INTEGRATION` | Production components consume Petra view models and real application paths. |
| `G-VALIDATION` | Acceptance scenarios pass with recorded usability, accessibility, language, and visual evidence. |

A polished prototype is not integrated. Integrated code is not validated. A module becomes `complete` only after all five gates pass.

## M1 design track at a glance

| ID | Status | What Petra designs and integrates | Why Petra needs it | Implementation link |
| --- | --- | --- | --- | --- |
| `UX1.0` | `in_progress` | Design foundations, fixture gallery, state vocabulary, and review evidence | Parallel module work needs one visual and behavioral grammar | `M1.0`, all M1 slices |
| `UX1.1` | `in_progress` | Research shell, navigation, selection, inspector, assistant frame, and responsive behavior | Researchers must remain oriented while moving among synchronized views | `M1.1`, `M1.2`, `M1.7` |
| `UX1.2` | `planned` | Research Brief, question framing, Hypothesis identity, standing, frontier, alternatives, and next actions | The default surface must support the next scientific decision | `M1.3`, `M1.6`, `M1.7` |
| `UX1.3` | `planned` | Papers, versions, rights, processing depth, document reading, and SourceSpan inspection | Researchers must know exactly what Petra read and what it could not inspect | `M1.2`, `M1.4`, `M1.7` |
| `UX1.4` | `planned` | Evidence inbox, proposal comparison, review modes, ChangeSet preview, and reversal | High-throughput automation needs visible, reversible governance | `M1.5`, `M1.7` |
| `UX1.5` | `planned` | Focused graph, evidence paths, edge semantics, projection state, and textual equivalents | The graph must explain and control work rather than decorate it | `M1.3`, `M1.5`, `M1.6`, `M1.7` |
| `UX1.6` | `planned` | Petra assistant, SuggestedActions, agentic modes, activity, interrupts, reconnect, and cancellation | Researchers need fast collaboration without surrendering scientific authority | `M1.5`, `M1.6`, `M1.7` |
| `UX1.7` | `planned` | DraftArtifact, provenance, revision, citations, BibTeX, and LaTeX | Scientific writing should be useful immediately and remain inspectable | `M1.8` |
| `UX1.8` | `planned` | Whole-product coherence, accessibility, responsiveness, recovery, and visual hardening | The modules count only when they behave as one dependable workbench | `M1.9` |

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

## Shared interface state grammar

Every module uses the same visible distinctions. A component may omit an irrelevant dimension, but it cannot rename or merge one locally.

| Dimension | Required distinctions | Design rule |
| --- | --- | --- |
| Scientific authority | `proposal`, `validated`, `applied`, `superseded`, `reverted` | Never style a proposal as trusted graph state. |
| Work freshness | `current_snapshot`, `cached_derived`, `running`, `stale`, `projection_catching_up` | State the snapshot or source revision behind every derived view. |
| Work outcome | `awaiting_input`, `completed`, `failed`, `cancelled`, `blocked` | Terminal states use explicit language and recovery actions. |
| Source depth | `metadata_only`, `abstract_only`, `partial_full_text`, `full_text` | Abstract-only is conspicuous and limits method-level actions and claims. |
| Origin | source, extraction, experiment, graph inference, researcher judgment, assistant judgment | Origin appears near the statement, not only in a distant audit view. |
| Evidence relation | supports, contradicts, qualifies, fails to replicate, cites, derives from, unresolved | Citation and scientific support must be visibly different. |
| Review posture | inspect, collaborate, supervise, plus scoped custom policy | Mode names summarize defaults; they do not imply permission. |
| Interaction phase | current response, activity, tool proposal, interrupt, resumed, replayed | Stream state never overwrites authoritative scientific state. |
| Availability | ready, limited, unavailable, policy-blocked | A disabled action explains the missing prerequisite or policy. |

Numerical values are appropriate for observable quantities such as latency, cost, sample size, effect estimates, tolerance, benchmark results, and validation criteria. They must include units, basis, and relevant snapshot or run. Numerical thresholds may control an experiment or interface test after they are defined in the corresponding protocol. They do not become a universal confidence, truth, maturity, or currentness score.

## Visual foundation

The brand inspiration kit establishes the direction:

- off-white, stone, slate, graphite, charcoal, and restrained amber surfaces;
- semantic green, blue, amber, red, violet, and neutral states used functionally;
- condensed display type for the wordmark and major headings;
- Inter for interface and prose, and JetBrains Mono for identifiers, metrics, provenance, and code;
- a compact irregular black rock with sparse facet lines;
- thin rules, precise alignment, compact tables, and generous whitespace around brand surfaces;
- an editorial scientific-tool character, not futuristic AI gradients or glowing network imagery.

The raster reference is a composition and visual-language source, not a screen specification. Its graph canvas, evidence inspector, and assistant demonstrate synchronization, but Petra's production hierarchy follows D009's Research Brief and object-centered shell. The supplied SVG and all current logo renderings remain inspiration assets until final artwork is accepted.

## `UX1.0` — design foundations and fixture system

- **Status:** `in_progress`
- **Builds:** the shared design grammar used by every M1 surface.
- **Why:** without a controlled foundation, parallel module work will drift in terminology, spacing, state semantics, accessibility, and authority cues.
- **Depends on:** accepted decisions, brand kit, current workbench inventory.
- **Implementation link:** `M1.0`; consumed by all later slices.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.0-W01` | `in_progress` | Inventory every current workbench route, component, token, fixture, placeholder, and unresolved design debt. | The dedicated design pass must improve the existing build without treating it as finished or discarding useful work. |
| `UX1.0-W02` | `planned` | Encode the authority hierarchy and parallel-work rules from this roadmap in contribution guidance. | Future design and implementation work need one conflict-resolution path. |
| `UX1.0-W03` | `planned` | Normalize color tokens into surface, text, border, focus, graph, and semantic-state roles. | Raw colors create inconsistent meaning and inaccessible status cues. |
| `UX1.0-W04` | `planned` | Define typography roles for display, page title, section title, body, table, label, identifier, provenance, metric, and code. | Dense scientific information needs a predictable reading hierarchy. |
| `UX1.0-W05` | `planned` | Define spacing, sizing, radius, rule, elevation, and density tokens with compact and comfortable data treatments. | Modules must align without forcing one density on reading and review tasks. |
| `UX1.0-W06` | `planned` | Specify primitives for buttons, links, inputs, tabs, chips, badges, tooltips, popovers, dialogs, tables, trees, split panes, notices, and empty states. | Scientific modules should compose stable controls rather than restyle basic behavior. |
| `UX1.0-W07` | `planned` | Define icon, rock mark, wordmark, and lockup usage at app, navigation, loading, and brand scales. | Petra needs a recognizable identity without turning every surface into a logo treatment. |
| `UX1.0-W08` | `planned` | Define redundant visual encodings for origin, evidence relation, review state, freshness, source depth, and work status. | Color alone cannot carry scientific or operational meaning. |
| `UX1.0-W09` | `planned` | Define focus, hover, selected, disabled, busy, error, and reduced-motion behavior for shared controls. | Streaming and dense panels must remain keyboard-accessible and stable. |
| `UX1.0-W10` | `planned` | Build a route-based fixture gallery from Petra-owned view models; do not add Storybook or another design dependency without a tested need. | Designers and implementers need deterministic adverse states without committing to a new tool prematurely. |
| `UX1.0-W11` | `planned` | Create shared language patterns for titles, labels, qualifiers, action rationales, approval prompts, errors, empty states, and recovery. | Petra's research-assistant identity must survive module and model changes. |
| `UX1.0-W12` | `planned` | Establish a design-debt register with severity, affected module, scientific risk, accessibility impact, and intended resolution gate. | Known compromises must not disappear inside screenshots or CSS. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.0-AC01` | Every production color, type, space, and semantic state used by M1 resolves to a named Petra token. |
| `UX1.0-AC02` | Every scientific and work status remains distinguishable without color. |
| `UX1.0-AC03` | Focus order, focus visibility, reduced motion, and text scaling work in the shared primitives. |
| `UX1.0-AC04` | The fixture gallery covers ordinary, empty, loading, cached, running, failed, stale, abstract-only, and dense states. |
| `UX1.0-AC05` | The rock remains recognizable at app-icon scale and is not mistaken for a generic network mark in a small review. |
| `UX1.0-AC06` | Current screens are classified as retain, revise, replace, or remove, with a reason and target module. |

### Completion evidence

- `UX1.0-EV01`: token and primitive inventory with code references;
- `UX1.0-EV02`: fixture-gallery route list and screenshots;
- `UX1.0-EV03`: keyboard, contrast, text-scale, and reduced-motion results;
- `UX1.0-EV04`: current-screen audit and design-debt register.

## `UX1.1` — research shell, navigation, and synchronized selection

- **Status:** `in_progress`
- **Builds:** the persistent frame around every scientific task.
- **Why:** Petra can expose many objects and views only if researchers retain project, question, snapshot, selection, and active-work orientation.
- **Depends on:** `UX1.0`.
- **Implementation link:** `M1.1`, `M1.2`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.1-W01` | `in_progress` | Design the context bar for Project, active ResearchQuestion, snapshot, review mode, and active work. | Researchers must always know which scientific state they are viewing. |
| `UX1.1-W02` | `planned` | Design the research map for Questions, Hypotheses, Evidence inbox, Experiments, and Outputs. | Durable research objects need stable navigation outside transcript order. |
| `UX1.1-W03` | `planned` | Define the main-surface navigation for Brief, Evidence, Graph, Papers, and Experiments. | Complementary representations need predictable access without becoming a tab dump. |
| `UX1.1-W04` | `planned` | Define the selected-object inspector and its source, provenance, method, graph, and history sections. | Selection should produce one consistent route into scientific detail. |
| `UX1.1-W05` | `planned` | Define the persistent Petra assistant frame and its collapsed, expanded, and context-linked states. | Collaboration stays available without dominating the workspace. |
| `UX1.1-W06` | `planned` | Preserve object identity and selection across routes, Brief, evidence, graph, inspector, and assistant. | The same Hypothesis or Claim cannot appear to become a different object in each surface. |
| `UX1.1-W07` | `planned` | Separate authoritative data, derived projections, conversation state, and local view state in the view hierarchy. | Panel state or a stream update must not look like a scientific mutation. |
| `UX1.1-W08` | `planned` | Design URL-addressable loading, missing, unauthorized, stale-snapshot, and replaced-object states. | Direct links and recovery must remain scientifically unambiguous. |
| `UX1.1-W09` | `planned` | Define split-pane resizing, collapse, restoration, and narrow-width priority without losing selection or active work. | The workbench must survive laptops and smaller windows without hidden state changes. |
| `UX1.1-W10` | `planned` | Define complete keyboard traversal, skip paths, focus restoration, and stable focus during streaming updates. | Dense synchronized panes must not trap or disorient keyboard users. |
| `UX1.1-W11` | `planned` | Keep active work and projection freshness visible without turning the shell into an operations dashboard. | Latency and stale projections matter, but scientific work remains primary. |
| `UX1.1-W12` | `planned` | Remove or label decorative, empty, and non-functional controls in the current shell. | A research tool must not imply capability it does not have. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.1-AC01` | A researcher can state the active Project, question, snapshot, selection, and work state from any primary route. |
| `UX1.1-AC02` | Selecting one object in any synchronized surface highlights or resolves the same stable object elsewhere. |
| `UX1.1-AC03` | Collapsing or resizing a panel preserves selection, unsent local input, and active WorkUnit visibility. |
| `UX1.1-AC04` | Keyboard navigation reaches all primary surfaces and restores focus after route changes, dialogs, and streamed updates. |
| `UX1.1-AC05` | Narrow layouts preserve scientific context and offer the same material actions, even when panes become sequential. |
| `UX1.1-AC06` | No placeholder control appears enabled and no preview data appears authoritative. |

### Completion evidence

- `UX1.1-EV01`: route and state map;
- `UX1.1-EV02`: desktop, laptop, and narrow-window recordings;
- `UX1.1-EV03`: cross-view identity fixture and keyboard trace;
- `UX1.1-EV04`: placeholder and implied-capability audit.

## `UX1.2` — Research Brief and Hypothesis orientation

- **Status:** `planned`
- **Builds:** Petra's default project home and the researcher's current scientific orientation.
- **Why:** the first screen should explain the live question, evidence frontier, disagreements, alternatives, and useful next action rather than present a dashboard or blank chat.
- **Depends on:** `UX1.0`, `UX1.1`.
- **Implementation link:** `M1.3`, `M1.6`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.2-W01` | `planned` | Lead with the active ResearchQuestion, scope, snapshot, and a bounded synthesis. | The researcher needs a clear problem frame before detail. |
| `UX1.2-W02` | `planned` | Present each Hypothesis with its stable identifier and discriminative plain-language descriptor. | `H12` alone is compact but not memorable in a dense project. |
| `UX1.2-W03` | `planned` | Present development, activity, warrant, lifecycle, standing, posture, and obligations as distinct facets. | A single confidence or maturity score would conceal why Petra is cautious or demanding. |
| `UX1.2-W04` | `planned` | Summarize support, contradiction, qualification, failed replication, scope mismatch, and missing evidence with inspectable members. | Counts orient the user but cannot replace evidence quality and provenance. |
| `UX1.2-W05` | `planned` | Expose abstract-only, disputed, indirect, stale, retracted/corrected, and method-limited evidence near affected conclusions. | Important limitations must be visible before action, not buried in source detail. |
| `UX1.2-W06` | `planned` | Show the alternative landscape as: no alternative exists, none found, search incomplete, not framed as competition, or Petra-proposed. | Absence of a discovered competitor is not evidence that no alternative exists. |
| `UX1.2-W07` | `planned` | Show temporal standing through dates, dialogue with later papers, field position, and unresolved modern relevance. | Seminal evidence can be strong within a paper and outdated as a current field claim. |
| `UX1.2-W08` | `planned` | Design the evidence frontier and explicit unknowns. | Petra should make the next informative uncertainty visible. |
| `UX1.2-W09` | `planned` | Present SuggestedActions with scientific objective, reason, basis, readiness, output, depth, estimated work, cost, duration, capability, approval, and background-work status. | A generic “deep research” button cannot communicate whether the action is useful or possible. |
| `UX1.2-W10` | `planned` | Link every Brief statement, count, and action basis to members, graph paths, source spans, or an explicit judgment origin. | Orientation must remain inspectable. |
| `UX1.2-W11` | `planned` | Design empty and early-project states that encourage tentative framing without overstating a seed Hypothesis. | Petra's posture should change with the depth of the work. |
| `UX1.2-W12` | `planned` | Design update and comparison states for a newly arrived result without silently replacing the prior Brief. | Researchers need to understand what changed and why. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.2-AC01` | A researcher can explain the question, each live Hypothesis, its standing, and the main uncertainty without opening the graph. |
| `UX1.2-AC02` | No Brief element implies a universal confidence, truth, maturity, or currentness score. |
| `UX1.2-AC03` | Abstract-only evidence cannot support method-specific interface language or actions without an explicit limitation. |
| `UX1.2-AC04` | Every count and material synthesis statement resolves to its basis. |
| `UX1.2-AC05` | SuggestedActions explain usefulness and prerequisites before asking for approval. |
| `UX1.2-AC06` | Prior and updated Brief states remain distinguishable after background work completes. |

### Completion evidence

- `UX1.2-EV01`: early, developing, mature, disputed, and stale-Hypothesis fixtures;
- `UX1.2-EV02`: provenance and count drill-down recording;
- `UX1.2-EV03`: alternative-landscape comprehension review;
- `UX1.2-EV04`: action-readiness and abstract-only language audit.

## `UX1.3` — Papers, versions, and source inspection

- **Status:** `planned`
- **Builds:** the source library and the exact reading path from scholarly identity to the material Petra used.
- **Why:** scientific trust begins with knowing which legitimate paper, version, bytes, passage, and processing depth support an object.
- **Depends on:** `UX1.0`, `UX1.1`.
- **Implementation link:** `M1.2`, `M1.4`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.3-W01` | `planned` | Design the Papers index around canonical Work identity, authors, venue, year, identifiers, and project reuse. | One paper should not fragment into project-local duplicates. |
| `UX1.3-W02` | `planned` | Show WorkVersion, artifact identity, acquisition path, rights, access status, and correction/retraction signals. | Researchers need to know exactly which version Petra read and may retain. |
| `UX1.3-W03` | `planned` | Show processing depth and pipeline state from metadata through structured full text. | Availability and interpretation depth are different facts. |
| `UX1.3-W04` | `planned` | Make `abstract_only` persistent and conspicuous in lists, inspectors, Claims, actions, and generated summaries. | Abstract-only evidence permits broad source reports, not detailed method inspection. |
| `UX1.3-W05` | `planned` | Design a readable document surface with section, page, region, and surrounding-context navigation. | A SourceSpan should be inspectable in the paper rather than as an isolated quote. |
| `UX1.3-W06` | `planned` | Highlight exact and normalized span text and explain any normalization diff. | Extraction cleanup must not silently change source meaning. |
| `UX1.3-W07` | `planned` | Link a source location to related Claims, Assertions, Hypotheses, experiments, and DraftSpans. | The paper view participates in the graph rather than ending the provenance path. |
| `UX1.3-W08` | `planned` | Design version comparison and stale-derivative warnings when a WorkVersion changes. | New source bytes can invalidate parses, spans, and downstream interpretations. |
| `UX1.3-W09` | `planned` | Design unavailable, rights-limited, parser-failed, partial-text, and ambiguous-identity states with recovery. | Failure and lawful access constraints must remain honest and actionable. |
| `UX1.3-W10` | `planned` | Support compact scanning, filtering, and sorting without inventing source-quality rankings. | Dozens of reusable papers require throughput without a misleading quality score. |
| `UX1.3-W11` | `planned` | Generate and copy canonical citations only for the selected WorkVersion. | Convenience must not detach citations from the version Petra used. |
| `UX1.3-W12` | `planned` | Preserve selection when moving between a source span and any synchronized surface. | Source inspection should not break the researcher's place in the project. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.3-AC01` | A researcher can identify the Work, exact WorkVersion, Artifact, access basis, processing depth, and selected SourceSpan. |
| `UX1.3-AC02` | Every displayed source passage can open in surrounding document context or state precisely why it cannot. |
| `UX1.3-AC03` | Abstract-only and partial-text states remain visible throughout downstream inspection. |
| `UX1.3-AC04` | Version changes identify affected derived objects without rewriting their history. |
| `UX1.3-AC05` | Dense paper lists remain keyboard-operable and readable at text zoom. |
| `UX1.3-AC06` | No unavailable method section is summarized as if Petra inspected it. |

### Completion evidence

- `UX1.3-EV01`: full-text, abstract-only, partial, failed, corrected, and rights-limited fixtures;
- `UX1.3-EV02`: SourceSpan-to-document resolution recording;
- `UX1.3-EV03`: WorkVersion comparison and stale-impact trace;
- `UX1.3-EV04`: citation identity and accessibility checks.

## `UX1.4` — evidence inbox, review, and trusted changes

- **Status:** `planned`
- **Builds:** Petra's high-throughput review-by-exception workflow.
- **Why:** researchers should not approve every extracted line, but no model output should silently become trusted scientific structure.
- **Depends on:** `UX1.0`, `UX1.1`, `UX1.3`.
- **Implementation link:** `M1.5`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.4-W01` | `planned` | Design the Evidence inbox with grouping by paper, run, proposal type, question, Hypothesis impact, policy, and exception reason. | Dozens of papers require coherent batch review. |
| `UX1.4-W02` | `planned` | Summarize each batch, identify exceptions, recommend a bounded decision, and expose source and impact paths. | Assistant mediation should reduce effort without hiding consequential differences. |
| `UX1.4-W03` | `planned` | Show Claim text, relation, polarity, scope, source stance, origin, proposal provenance, and review state. | Reviewers need the scientific meaning of a proposal before its visual status. |
| `UX1.4-W04` | `planned` | Show the exact passage, surrounding section, normalized diff, and WorkVersion beside the proposal. | Review must be source-grounded and efficient. |
| `UX1.4-W05` | `planned` | Design the exact ChangeSet diff, downstream-impact preview, and atomic apply boundary. | Approval should name what authoritative state will change. |
| `UX1.4-W06` | `planned` | Design approve, reject, correct, narrow, split, relink, and defer actions through typed commands. | Scientific correction is richer than a binary approval. |
| `UX1.4-W07` | `planned` | Make inspect, collaborate, supervise, and scoped custom policies visible as presets with grants and exceptions shown separately. | A mode changes defaults, not authority. |
| `UX1.4-W08` | `planned` | Design batch automation thresholds, audit sampling, escalation triggers, and budget boundaries with inspectable rationale. | Trust can grow through measured automation rather than ambient permission. |
| `UX1.4-W09` | `planned` | Route direct controls and assistant-mediated decisions to the same proposal, command, and ChangeSet preview. | Petra must not create two scientific governance systems. |
| `UX1.4-W10` | `planned` | Design committed, projection-pending, applied, failed, reverted, and superseded change states. | PostgreSQL authority and derived graph freshness can diverge temporarily. |
| `UX1.4-W11` | `planned` | Design Revert as a compensating action with dependency and cascade choices. | Auditability requires history-preserving reversal rather than visual undo. |
| `UX1.4-W12` | `planned` | Make consequential and exceptional proposals hard to approve accidentally without making routine review slow. | Visual weight should reflect scientific risk, not encourage automation for convenience. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.4-AC01` | A researcher can review a representative batch by exception without opening every ordinary proposal. |
| `UX1.4-AC02` | Direct and conversational review show and act on the same proposal and exact ChangeSet. |
| `UX1.4-AC03` | A researcher can approve, reject, correct, and reverse the fixture proposal while preserving history. |
| `UX1.4-AC04` | No mode, threshold, or visual default grants a capability or bypasses escalation. |
| `UX1.4-AC05` | Abstract-only, causal/mechanistic, ambiguous-identity, contradiction, correction, and mature-Hypothesis exceptions are conspicuous. |
| `UX1.4-AC06` | A committed change with a delayed graph projection is not presented as projection-current. |

### Completion evidence

- `UX1.4-EV01`: ordinary and exception-heavy batch recordings;
- `UX1.4-EV02`: direct-versus-assistant command identity trace;
- `UX1.4-EV03`: correction, atomic apply, projection lag, and Revert scenarios;
- `UX1.4-EV04`: accidental-approval and keyboard review evaluation.

## `UX1.5` — focused graph and provenance inspection

- **Status:** `planned`
- **Builds:** task-bounded graph views and their textual equivalents.
- **Why:** Petra must demonstrate that graph structure controls retrieval, review, and generation while remaining understandable to researchers who do not operate a graph database.
- **Depends on:** `UX1.0`, `UX1.1`, `UX1.2`, `UX1.3`.
- **Implementation link:** `M1.3`, `M1.5`, `M1.6`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.5-W01` | `planned` | Define initial graph tasks: inspect evidence, trace provenance, compare alternatives, inspect contradiction, review a change, and explain a generated statement. | A graph view should answer a question rather than expose the whole corpus. |
| `UX1.5-W02` | `planned` | Bound each view by active object, task, depth, edge allowlist, snapshot, and projection position. | Focus and latency need explicit graph scope. |
| `UX1.5-W03` | `planned` | Define node treatments for Question, Hypothesis, Claim, Assertion, Work, WorkVersion, SourceSpan, Experiment, Result, and DraftSpan. | Scientific objects should not appear as generic graph database records. |
| `UX1.5-W04` | `planned` | Define edge line, label, direction, origin, trust, and review treatments for support, contradiction, qualification, failed replication, citation, and derivation. | Relation semantics cannot depend on color or proximity alone. |
| `UX1.5-W05` | `planned` | Distinguish source-reported, proposed, trusted, inferred, superseded, and stale-projection paths. | A visible edge must reveal why it exists and how much authority it has. |
| `UX1.5-W06` | `planned` | Synchronize graph selection with the Brief, evidence view, source inspector, assistant, and route. | The graph is one representation of stable objects, not a separate explorer. |
| `UX1.5-W07` | `planned` | Design a path inspector with edge rationale, source spans, scope compatibility, snapshot, and projection freshness. | Users need to inspect the meaning behind a path. |
| `UX1.5-W08` | `planned` | Provide a textual path, evidence matrix, or timeline whenever it explains the relationship more clearly or accessibly. | Node-link graphics are not always the best scientific representation. |
| `UX1.5-W09` | `planned` | Design progressive expansion, filters, grouping, saved views, and a clear return to the active object. | Larger reused corpora must remain navigable. |
| `UX1.5-W10` | `planned` | Make drag, relink, split, narrow, and relation changes produce typed draft commands and visible previews. | Direct graph manipulation cannot mutate Neo4j or trusted state directly. |
| `UX1.5-W11` | `planned` | Design current, loading, partial, empty, disconnected, stale, and projection-rebuilding states without layout collapse. | Graph failures and lag need honest recovery. |
| `UX1.5-W12` | `planned` | Establish density and performance budgets based on real fixtures before choosing rendering optimizations. | A fast graph must preserve labels, selection, semantics, and accessibility. |

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

- **Status:** `planned`
- **Builds:** the collaborative, agentic interaction layer over Petra's scientific objects and WorkUnits.
- **Why:** Petra should save time and feel responsive while keeping action, evidence, cost, authority, and uncertainty legible.
- **Depends on:** `UX1.0`–`UX1.5` view semantics.
- **Implementation link:** `M1.5`, `M1.6`, `M1.7`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.6-W01` | `planned` | Design the assistant around the active Project, question, selection, snapshot, review mode, and allowed capabilities. | Relevant context should be explicit without dumping the whole graph into each turn. |
| `UX1.6-W02` | `planned` | Apply Felicity and Grice to responses: useful conclusion early, sufficient context, relevance, stable terms, calibrated force, and natural scientific language. | Petra's identity must be consistent across models. |
| `UX1.6-W03` | `planned` | Restate each Hypothesis as `H12 — descriptor` on first mention per assistant turn, then use `H12` alone. | Stable shorthand remains understandable without crowding every sentence. |
| `UX1.6-W04` | `planned` | Visually and linguistically distinguish source report, extraction, experiment, graph inference, researcher judgment, assistant judgment, uncertainty, recommendation, question, and action. | Fluent prose must not erase origin or scientific force. |
| `UX1.6-W05` | `planned` | Design `current_graph`, `investigate`, and `research_deeply` as visible execution depths attached to scientific objectives. | Depth should bound work, not become a vague call to action. |
| `UX1.6-W06` | `planned` | Present SuggestedActions with readiness, likely output, alternatives, missing prerequisites, budget, latency, capability, approval, and cancellation consequences. | Users need to know whether an agentic action is worth starting. |
| `UX1.6-W07` | `planned` | Design progressive response stages for current snapshot, cached result, bounded active analysis, and newly discovered evidence. | Petra can feel fast without pretending unfinished work is final. |
| `UX1.6-W08` | `planned` | Expose observable activity, tools, validators, queries, and graph changes without exposing private chain-of-thought. | Transparency should explain work, not simulate internal reasoning. |
| `UX1.6-W09` | `planned` | Design tool proposals and review interrupts with scientific purpose, exact consequence, affected object, and return path. | Approval should happen in context and remain governable. |
| `UX1.6-W10` | `planned` | Distinguish stop streaming, detach, reconnect, resume, steer, and explicitly cancel a durable WorkUnit. | Connection control and scientific work control are not the same operation. |
| `UX1.6-W11` | `planned` | Render latency and cost as measured or estimated values with basis and update state. | Resource consequences should be visible without dominating the conversation. |
| `UX1.6-W12` | `planned` | Consume only Petra hooks and view models; keep raw AG-UI events inside the integration module. | Protocol changes must not reshape scientific components. |
| `UX1.6-W13` | `planned` | Design model substitution, fallback, failure, and partial-output states without changing Petra's persona or evidence rules. | A multiple-model harness needs one durable assistant identity. |
| `UX1.6-W14` | `planned` | Design proactive background preparation as bounded, cancellable work that cannot silently mutate the trusted graph. | Alternative-landscape and standing research should be useful before a click without becoming invisible authority. |

### Acceptance

| ID | Criterion |
| --- | --- |
| `UX1.6-AC01` | A researcher can identify what Petra knows now, what it is calculating, what it proposes, and what has become authoritative. |
| `UX1.6-AC02` | First-mention Hypothesis descriptors and origin/force distinctions pass the D006 language fixtures. |
| `UX1.6-AC03` | SuggestedActions state the scientific purpose and material consequence before approval. |
| `UX1.6-AC04` | Dropping or stopping a stream cannot look like cancelling its durable WorkUnit. |
| `UX1.6-AC05` | Reconnect and replay do not duplicate a command, assistant turn, or ChangeSet application. |
| `UX1.6-AC06` | No feature component imports or switches on raw AG-UI event types. |
| `UX1.6-AC07` | Switching the fixture model preserves persona, references, scientific force, and action semantics. |

### Completion evidence

- `UX1.6-EV01`: concise, multi-Hypothesis, conflict, abstract-only, failed-run, and review-batch transcripts;
- `UX1.6-EV02`: action, interrupt, resume, replay, detach, and cancel recording;
- `UX1.6-EV03`: raw AG-UI import boundary check;
- `UX1.6-EV04`: model-substitution, latency, and cost presentation evaluation.

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

- **Status:** `planned`
- **Builds:** one coherent, resilient workbench from all M1 modules.
- **Why:** a series of good panels can still produce a confusing product when selection, hierarchy, language, responsiveness, or recovery crosses module boundaries.
- **Depends on:** `UX1.0`–`UX1.7` integrated; `M1.9` acceptance environment.
- **Implementation link:** `M1.9`.

### Work

| ID | Status | Design specification | Why Petra needs it |
| --- | --- | --- | --- |
| `UX1.8-W01` | `planned` | Run a module-by-module visual pass in the order shell, Brief, Papers, evidence, graph, assistant, drafting. | The dedicated pass can improve specifics after the architecture is real. |
| `UX1.8-W02` | `planned` | Run an end-to-end hierarchy and synchronization pass across the complete M1 path. | Local optimization must not fragment the overall experience. |
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

Fixtures use Petra's canonical IDs and runtime shapes. When a runtime contract is not yet available, the fixture declares its provisional schema and associated `UX-REQ` item.

## Design validation evidence

| ID | Evidence class | Minimum record |
| --- | --- | --- |
| `UX-EV01` | Specification | Task, states, language, authority boundary, dependencies, and acceptance criteria |
| `UX-EV02` | Visual | Screenshots or recordings for named fixture, viewport, theme if applicable, and revision |
| `UX-EV03` | Interaction | Successful and adverse task traces with expected commands and resulting states |
| `UX-EV04` | Accessibility | Keyboard, focus, text scale, contrast, motion, semantic structure, and graph alternative results |
| `UX-EV05` | Language | D006 origin, force, reference, descriptor, uncertainty, action, and error fixtures |
| `UX-EV06` | Contract | View model, query, command, event, object identity, and AG-UI boundary trace |
| `UX-EV07` | Performance | Fixture size, hardware/context, local/cached/remote origin, latency, layout stability, and rendering observations |
| `UX-EV08` | Usability | Task, participant context, observed failure, severity, decision, and follow-up |
| `UX-EV09` | Regression | Stable state fixture, expected rendering/behavior, comparison result, and approved exception |

Usability numbers describe observed behavior; they do not become universal product truths. Petra may later adopt quantitative exit thresholds after the pilot protocol defines the task, population, environment, and tolerance. Until then, a severe provenance, authority, accessibility, or lost-work failure blocks validation even if an average task metric looks favorable.

## Cross-roadmap request path

Design must not solve missing architecture inside a component. A request uses `UX-REQ-NNN` and records:

- originating design item and fixture;
- affected implementation item;
- researcher task and failure without the change;
- requested query, command, event, or view-model behavior;
- authority and persistence implications;
- smallest viable response;
- decision owner and status;
- accepted replacement or rejection rationale.

Requests follow this sequence:

1. reproduce the need with a named fixture;
2. check whether an accepted contract already supplies it;
3. propose the smallest read model or command change;
4. review it against authority, identity, event, AG-UI, and projection boundaries;
5. update both linked roadmap items if accepted;
6. integrate only after the contract or explicit provisional adapter is recorded.

A local component calculation is allowed for presentation-only state such as panel size or expanded rows. It is not allowed for scientific standing, review authority, provenance, action readiness, or mutation consequences.

## Definition of ready and done

### Frontend complete against fixtures

A module reaches fixture-backed frontend completion when:

- its accepted direction is implemented in production workbench components rather than a disposable mockup;
- ordinary and adverse states render from Petra-owned contract-shaped view models;
- navigation, selection, direct actions, assistant context, and responsive behavior are implemented where relevant;
- keyboard, focus, text-scale, motion, and non-color requirements pass;
- user-facing language and Hypothesis references follow D006;
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
- accessibility and language behavior are specified;
- all contract gaps have accepted or deliberately provisional `UX-REQ` dispositions;
- the corresponding implementation slice can supply the required view models.

### Design complete

A module is `complete` when:

- all five gates pass;
- every acceptance criterion has linked evidence;
- production code uses Petra-owned components and view models;
- ordinary, dense, empty, stale, failed, and recovery states work;
- no critical scientific-trust, lost-work, provenance, or accessibility issue remains;
- remaining debt has an owner, milestone, and revisit trigger.

Design completion never substitutes for the implementation acceptance criteria, test suites, replay evidence, or clean-start demonstration.

## Explicit deferrals

| ID | Deferral | Revisit trigger |
| --- | --- | --- |
| `UX-D01` | Final production rock artwork and formal trademark package | The shell and app-icon use cases stabilize or public beta preparation begins |
| `UX-D02` | Dark theme | Accessibility or sustained-use evaluation establishes a need and semantic tokens are stable |
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

## Immediate sequence

The current implementation continues. The design track should now:

1. begin the `UX1.0` discussion by agreeing on the audit priorities, frontend-completion boundary, and first design-system decisions;
2. finish `UX1.0-W01` by auditing the existing routes, CSS, brand assets, fixtures, and implied capabilities;
3. close the shared tokens, state grammar, primitives, and fixture-gallery decisions in `UX1.0`;
4. discuss and implement `UX1.1` against the current deterministic workbench without waiting for live models;
5. discuss and implement `UX1.3` with the M1 Work, WorkVersion, Artifact, and SourceSpan fixtures while `M1.2` is built;
6. submit any resulting `UX-REQ` items before the affected persistence/query contracts close;
7. preserve the current preview as comparison evidence, then perform the full module-by-module visual pass in `UX1.8` after the surfaces are integrated.

This sequence gives Petra a real design track now, keeps it useful to implementation, and reserves the expensive whole-product polish pass for the point when the scientific workflows are no longer placeholders.
