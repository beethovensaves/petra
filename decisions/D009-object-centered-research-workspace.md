# D009: Object-centered research workspace with progressive agent interaction

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Project information architecture, Research Brief, synchronized research surfaces, selection and inspection, progressive responses, proactive action readiness, scientific-standing presentation, background hypothesis-landscape preparation, direct manipulation, and the interaction boundary
- **Depends on:** [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D008](D008-graph-guided-execution-context-and-cost.md)
- **Amended by:** [D013](D013-ag-ui-sdk-interaction-boundary.md), which replaces D009's provisional AG-UI evaluation with an M1 production-SDK decision
- **Implemented for M1 by:** [D014](D014-hono-react-vite-workbench-shell.md)

## Decision

Petra will use an object-centered scientific workspace rather than a chat-first, graph-first, or dashboard-first interface.

Opening a project shows a living `Research Brief` for the active ResearchQuestion. It orients the researcher to the current Hypotheses, evidence coverage, disagreements, scientific standing, alternative landscape, active work, and useful next scientific actions. The assistant remains persistently available, but conversation is one synchronized surface over research state rather than the place where that state lives.

The desktop-grade project shell has four coordinated functions:

1. **Research map:** stable navigation among questions, hypotheses, evidence inbox, experiments, and outputs.
2. **Main research surface:** task-specific Brief, Evidence, Graph, Papers, and Experiments views.
3. **Selected-object inspector:** source, provenance, scope, status, history, dependencies, and typed actions for the current object.
4. **Petra assistant and activity:** explanatory conversation, recommendations, progressive results, approvals, and visible WorkUnits.

The inspector occupies a split or drawer within the main surface so it can remain visible beside the assistant. On constrained screens, panels may collapse without changing object identity or losing active work.

Petra will display the current local graph state immediately when possible. Cached analysis, active research, proposed changes, and newly validated results remain visibly distinct. A result arriving later adds to the interaction history and synchronized views; it does not silently replace the state the researcher previously saw.

Suggested actions name a scientific objective. `current_graph`, `investigate`, and `research_deeply` remain execution depths, not generic calls to action. Petra may proactively prepare alternative-hypothesis and scientific-standing context in bounded background WorkUnits so it does not offer apparently useful actions whose prerequisites or likely outputs are unknown.

Petra uses the official AG-UI SDK from M1 behind Petra-owned client and server adapters. AG-UI is the interaction protocol, not Petra's UX standard, domain model, application state, scientific authority, or permission system. [D013](D013-ag-ui-sdk-interaction-boundary.md) defines the production dependency and conformance boundary.

## Context

Petra must expose a dense scientific graph without making the researcher operate a generic graph database. It must also support a collaborative assistant without reducing a project to an opaque transcript.

A chat-first interface hides durable research objects, makes source comparison difficult, and encourages the assistant's latest prose to become de facto state. A graph-first interface makes structure visible but performs poorly for close reading, evidence comparison, review, and ordinary navigation. A metric dashboard can summarize activity while obscuring the claims, passages, and disagreements that give the numbers meaning.

Petra instead needs stable object identity across several representations. Selecting a Hypothesis in a research map, sentence, evidence matrix, graph, or assistant response should resolve to the same object and revision. Direct editing and conversational mediation must use the same command path established in D005.

D008 also makes latency and background work part of the UX. The interface must say whether an answer came from the current graph, a cache, bounded new analysis, or newly discovered literature. It must expose processing depth and projection lag without turning every interaction into an operations console.

## Project shell

The initial desktop information architecture is:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Project · Active question · Snapshot · Review mode · Active work     │
├────────────────┬──────────────────────────────────┬─────────────────┤
│ Research map   │ Main research surface            │ Petra           │
│                │                                  │                 │
│ Questions      │ Brief · Evidence · Graph          │ Conversation    │
│ Hypotheses     │ Papers · Experiments              │ Recommendations │
│ Evidence inbox │                                  │ Typed actions   │
│ Experiments    │ Selected-object inspector         │ Active work     │
│ Outputs        │                                  │                 │
└────────────────┴──────────────────────────────────┴─────────────────┘
```

This diagram defines responsibilities, not final dimensions, component styling, or framework.

### Context bar

The project context bar shows only state that changes how the current screen should be interpreted:

- project and active ResearchQuestion;
- authoritative snapshot or revision;
- graph-projection freshness when it differs from authority;
- current review mode;
- active or attention-requiring WorkUnits;
- offline, policy-blocked, provider-failed, or degraded state where applicable.

Response depth belongs with the action or assistant request it controls. Cost details remain progressively disclosed unless a budget threshold or approval makes them immediately relevant.

### Research map

The research map provides addressable, stable navigation. It is not a miniature whole-corpus graph.

Initial groups are:

- ResearchQuestions and subquestions;
- Hypotheses with ordinals, descriptors, and development;
- evidence inbox and unresolved review exceptions;
- experiments and reproduction attempts;
- generated and imported research artifacts;
- saved focused views where later testing supports them.

Hypothesis labels include the ordinal and descriptor in navigation. D006's once-per-assistant-turn abbreviation rule reduces conversational repetition; it does not remove descriptors from stable interface labels.

### Main research surface

The main surface provides several views over the same selected object and snapshot:

- **Brief:** research orientation, live hypotheses, evidence frontier, standing, alternatives, active work, and next actions;
- **Evidence:** claim-centered evidence matrix with support, contradiction, qualification, scope, source status, and review state;
- **Graph:** focused explanatory neighborhoods and paths;
- **Papers:** canonical corpus, WorkVersions, rights, processing depth, source inspection, and project relevance;
- **Experiments:** ProtocolVersions, ExecutionPlans, Runs, Results, Analyses, interpretations, and reproduction state under [D011](D011-experiment-sandbox-and-reproducibility.md).

The first implementation may ship only the Brief, Evidence, focused Graph, and Papers views. Tabs that cannot yet meet their scientific contract should not be decorative placeholders in a research session.

### Selected-object inspector

The inspector is polymorphic but structurally consistent. It shows, where applicable:

- stable identity and revision;
- origin and evidence namespace;
- source status and exact SourceSpan;
- scope and unresolved scope fields;
- review and promotion state;
- processing depth and applicable pipeline revision;
- support, contradiction, qualification, and dependence;
- creator, model, policy, ChangeSet, and event history;
- downstream impact;
- commands permitted under the current grant.

Material commands open an exact preview. A direct human edit uses D005's Apply semantics and does not require a duplicate approval of the same revision.

### Petra assistant

The assistant is persistent on larger screens and collapsible on smaller ones. It receives the current selection and authorized ConversationState through typed references rather than reconstructing screen state from prose.

Assistant turns can render app-owned components such as:

- evidence paths and matrices;
- Claim and scope comparisons;
- SourceSpan previews;
- processing-depth and abstract-only warnings;
- active-work and completion cards;
- SuggestedAction cards;
- ChangeSet previews;
- approval, clarification, and budget interrupts;
- cost and latency explanations when relevant.

Selecting an assistant assertion highlights its graph path and sources. Selecting an interface object provides that object as conversational context without treating it as an instruction.

## Research Brief

The Research Brief is the default project home. It should answer:

1. What is this project investigating?
2. Which Hypotheses are live, and how mature are they?
3. What evidence supports, contradicts, or qualifies them?
4. Where is evidence abstract-only, disputed, indirect, stale, or missing?
5. What is currently running or awaiting review?
6. Which next actions are scientifically useful and ready?

The Brief is an evolving dossier, not a decorative metric dashboard. It does not show a single hypothesis confidence or currency percentage.

For a new project without an active ResearchQuestion, the same surface becomes a question-framing state rather than an empty chat. It preserves the researcher's rough wording, exposes ambiguities and candidate scopes, and previews the typed ResearchQuestion and subquestions Petra proposes to create.

A Hypothesis summary may show:

- ordinal and descriptor;
- development, assessment, and current scientific posture;
- scoped evidence counts separated by relation and source status;
- central disagreement or uncertainty;
- scientific-standing summary with `as_of` and coverage;
- alternative-landscape coverage and freshness;
- last material change and reason;
- suggested next scientific action.

Counts always link to their members. They summarize graph state but do not replace inspection of quality, independence, scope, or provenance.

## Focused graph behavior

The graph view exists to answer a question, not to prove that Petra stores a graph.

Initial graph tasks are:

- explain why Petra made a sourced statement;
- inspect a Claim or Hypothesis neighborhood;
- follow support, contradiction, and qualification paths;
- trace provenance from answer to Assertion and SourceSpan;
- inspect dependency and change impact;
- compare versions or reconstruct a temporal state.

Petra will not default to displaying every node or every machine-derived retrieval edge. Each view starts from an explicit object, task, depth, and edge allowlist. Trust zone, origin, review state, direction, scope mismatch, and projection freshness remain visible.

Evidence matrices, tables, timelines, document views, and graphs are complementary renderings. Petra chooses the smallest representation that preserves the relationship the researcher needs to understand.

## Selection, addressability, and interface state

Project, view, active object, and stable filters should be addressable so a researcher can return to or share a private route within the workspace. Panel sizes, temporary expansion, hover, and unsaved composition are local view state.

Petra separates:

- **authoritative domain state:** committed entities, Assertions, policies, events, and ChangeSets;
- **derived interface projections:** Briefs, evidence matrices, graph views, counts, and activity summaries with source revisions;
- **conversation state:** the bounded references and dialogue needed for the assistant;
- **local view state:** selection, layout, open panels, temporary filters, and drafts.

An interface projection never becomes authoritative because the browser patched it. A stale projection shows its revision and refresh path. Mutations enter through typed commands and server-side validation; ordinary selection and layout changes do not pollute the scientific event log.

## Progressive interaction

One request may produce several visible stages:

1. Resolve and show the selected object and current authoritative state.
2. Render cached paths, coverage, and known limitations.
3. Show any new WorkUnit with objective, reason, depth, budget, stage, and stop control.
4. Add validated results and proposed changes without erasing the earlier state.
5. Update dependent projections or show catch-up state until their revision is current.

The interface distinguishes at least:

- `current_snapshot`;
- `cached_derived`;
- `running`;
- `awaiting_input`;
- `proposed`;
- `validated`;
- `applied`;
- `failed`, `cancelled`, or `blocked` with a typed reason.

Activity language describes observable work rather than simulated reasoning. Petra may expose tasks, queries, tools, validators, and graph changes, but it does not display private chain-of-thought.

## Scientifically specific actions

A generic “Deep research” button hides the scientific purpose of the work. Petra instead presents a `SuggestedAction` with:

- target object and scientific objective;
- reason it is being suggested;
- graph evidence and missing information behind the recommendation;
- prerequisite and readiness state;
- expected artifact or decision;
- recommended response depth;
- estimated work, cost, and duration when measurable;
- applicable capability and approval requirements;
- background work already completed or active.

Initial readiness states are:

- `ready`;
- `preparing`;
- `coverage_incomplete`;
- `low_expected_yield`;
- `blocked`;
- `stale`.

Examples of actions include “Trace this hypothesis into current literature,” “Map contemporary alternatives,” “Find direct operationalizations,” “Compare rival predictions,” and “Inspect scope differences behind this contradiction.” Clicking an action creates or previews the corresponding typed request. The requested depth remains visible but does not substitute for the objective.

Low expected yield does not automatically disable an action. Sparse results may reflect terminology, corpus, language, or retrieval failure. Petra explains the basis and lets the researcher deepen, redirect, or stop within policy and budget.

## Scientific standing and dialogue

D009 defines how scientific standing is presented; D010 will define how Petra derives it and how it changes posture.

Standing is always relative to:

- an `as_of` date and graph snapshot;
- a ResearchQuestion and Claim scope;
- the searched corpus, fields, languages, and source policies;
- completed processing depth and dialogue analysis;
- explicit coverage limitations.

The interface presents a reasoned profile rather than one “currentness” score. Relevant dimensions include direct evidence, recency of direct tests, replication and criticism, substantive engagement by later work, construct and method drift, active intellectual descendants, alternative coverage, and corpus freshness.

An older source may be historically foundational and contain strong source-native evidence while remaining insufficient to establish present scientific standing. A recent source is not current merely because its publication date is recent.

Citation is also distinct from dialogue. The UI must distinguish background citation from later work that adopts, directly tests, extends, reframes, challenges, qualifies, reproduces, fails to reproduce, or critiques the method behind a Claim. Substantive dialogue relations require the normal Assertion and SourceSpan path.

Venue may guide discovery and source metadata. It cannot substitute for paper- and Claim-level analysis of dialogue, alternatives, or warrant.

## Proactive hypothesis-landscape preparation

When a Hypothesis becomes active, changes materially, or is about to receive a consequential SuggestedAction, Petra may schedule a bounded `LandscapeScan` WorkUnit.

The scan can seek:

- explicit competing hypotheses and theories;
- alternative mechanisms;
- methodological, measurement, and sampling explanations;
- construct reframings in adjacent fields;
- boundary conditions;
- null or simpler accounts;
- historically rejected alternatives that may survive under another scope.

Its derived `HypothesisLandscape` records the target and snapshot, search protocol, terminology, databases, citation neighborhoods, temporal and language range, explicit literature-derived alternatives, separately labeled Petra-proposed rivals, coverage state, marginal yield, omissions, cost, and freshness dependencies.

Petra never collapses these statements:

- no competing alternative exists;
- none was found under the recorded search;
- the search is incomplete;
- the literature does not frame the issue as an explicit competition;
- only Petra-proposed rivals are currently available.

Local graph and cached work run first. New external discovery follows D001 capability and egress policy and D008 budget, scheduling, and cancellation. Background preparation does not silently mutate the trusted graph or block current local interaction.

## AG-UI interaction boundary

Petra adopts AG-UI's typed streaming, run and activity lifecycle, snapshot and delta synchronization, tool visibility, interrupts, resumption, steering, and cancellation through the official SDK.

A Petra-owned adapter maps protocol events to Petra concepts without importing AG-UI types into the domain model. The workbench consumes Petra hooks and view models rather than generic protocol events.

An initial mapping is:

| AG-UI concept | Petra interpretation |
| --- | --- |
| Thread | ConversationState, never Project authority |
| Run | Interaction envelope linked to WorkUnit and AgentRun |
| Activity | Visible retrieval, analysis, validation, or projection stage |
| Tool call | Proposed or executing typed operation under server policy |
| State snapshot or delta | Disposable interface projection with authoritative revision |
| Interrupt | Approval, clarification, review exception, or budget escalation |
| Message | Conversational rendering linked to graph objects and evidence |
| Custom event | Versioned allowlisted Petra interface event |

The adapter must preserve these boundaries:

- the PostgreSQL event and command path remains authoritative;
- shared client state cannot mutate scientific or control state directly;
- streamed tool arguments remain untrusted proposals until complete, validated, authorized, and executed server-side;
- client filtering is not capability enforcement;
- protocol snapshots do not replace Petra snapshots;
- messages and thread history do not replace graph objects or ConversationState;
- `RAW` and `CUSTOM` events cannot become an unversioned escape hatch;
- prompts, private reasoning, secrets, and disallowed artifacts remain protected;
- correlation, causation, revision, idempotency, visibility, and redaction survive the mapping.

The M1 integration uses a pinned SDK version and a thin adapter. Conformance tests must demonstrate semantic fit, reconnection correctness, acceptable event and bundle overhead, testability, and strict separation from Petra authority. [D013](D013-ag-ui-sdk-interaction-boundary.md) owns the detailed client, server, state, replay, and replacement rules.

## Responsive and accessible behavior

Petra begins as a desktop-grade workbench with a web-capable architecture. It must remain functional at laptop widths and through keyboard and assistive technology.

The first interface contract requires:

- full keyboard navigation and visible focus;
- non-color encoding for evidence relations, trust zones, status, and warnings;
- textual equivalents for graph paths and activity;
- stable focus after streamed updates;
- user-controlled motion and no layout shifts that obscure active reading;
- readable source text and tables without forcing graph interaction;
- panel collapse that preserves selection and active WorkUnits;
- warnings and approvals that remain understandable without relying on icons alone.

Exact breakpoints, component library, visual density, and frontend framework require prototype evidence rather than an ADR guess.

## Options considered

### Chat-first workspace

Rejected as the primary architecture because durable scientific state, source comparison, direct editing, and graph inspection become subordinate to transcript order.

### Graph-first workspace

Rejected as the default because a whole-project graph is visually dense and weak for reading passages, comparing scoped Claims, and reviewing batches. Focused graph views remain central tools.

### Dashboard-first workspace

Rejected because aggregate counts can create an impression of control while hiding source quality, relation meaning, and unresolved scope.

### Object-centered synchronized workspace

Selected because it preserves identity across the representation best suited to each task while keeping the assistant and graph visible.

### Expose AG-UI directly without a Petra adapter

Rejected because protocol state, tool, and lifecycle meanings must be mapped to Petra's stricter authority and provenance model.

### Build a bespoke interaction protocol immediately

Rejected for M1 because the official SDK supplies the adopted protocol infrastructure. A bespoke transport remains a replacement option only if D013's revisit triggers are met.

## Consequences

### Benefits

- The researcher can orient without waiting for a model or reading a transcript.
- Conversation, evidence, documents, and graphs resolve to the same objects.
- Graph visibility supports explanation without forcing graph navigation for every task.
- Background agency becomes legible, interruptible, and tied to a scientific objective.
- Suggestions improve as alternative-landscape preparation completes.
- Historical importance, present standing, search coverage, and evidential warrant remain distinct.
- The official AG-UI SDK supplies interaction infrastructure without coupling Petra's core to protocol types.

### Costs and risks

- Several synchronized surfaces require careful selection, revision, and focus management.
- Dense scientific information can overwhelm researchers without progressive disclosure.
- Standing and landscape summaries can appear more definitive than their search coverage warrants.
- Proactive scans can consume compute, external-service budgets, and attention.
- A persistent assistant can still dominate the workflow if recommendations are visually louder than evidence.
- Protocol adaptation adds a maintained boundary and compatibility obligations.

Petra mitigates these risks with a Brief rather than a dashboard, exact object references, coverage-qualified language, bounded background policy, visible readiness, app-owned components, and task-based prototype evaluation.

## Validation

D009 is satisfied as a design when a frontend prototype with representative mock data supports these tasks:

1. Open a project and identify its active question, live Hypotheses, main disagreement, evidence limitations, and active work without opening chat.
2. Select one Hypothesis from the research map and preserve identity across Brief, Evidence, Graph, inspector, and assistant.
3. Inspect an abstract-only Claim and understand which conclusions the available source cannot support.
4. Trace one assistant assertion through an Assertion to its exact SourceSpan.
5. Distinguish current-snapshot, cached, running, proposed, validated, and applied states.
6. Start, inspect, cancel, and resume a bounded LandscapeScan without losing the current local view.
7. Explain why a SuggestedAction is ready, incomplete, stale, low-yield, or blocked.
8. Keep literature-derived alternatives distinct from Petra-proposed rivals.
9. Correct one evidence relation directly and through conversation, producing the same typed ChangeSet semantics.
10. Show graph projection lag after a committed change and converge without displaying stale state as current.
11. Navigate the core flow by keyboard and inspect a textual equivalent of the evidence path.
12. Recover after a dropped interaction stream without duplicating a command, result, or applied change.

The M1 AG-UI integration is complete only if it additionally:

1. maps the required lifecycle without semantic loss;
2. keeps Petra's domain and protocol types independent;
3. preserves revision, correlation, idempotency, visibility, and redaction;
4. handles interrupt, cancellation, reconnection, and out-of-order or duplicate delivery;
5. blocks incomplete or unauthorized tool calls server-side;
6. requires only bounded, schema-registered Petra extensions;
7. records implementation, interoperability, latency, and bundle costs so the dependency remains evidence-based.

UX evaluation measures orientation time, provenance comprehension, action-state comprehension, correction success, accidental approval, ability to locate and stop work, distinction between cached and newly researched results, keyboard completion, and perceived responsiveness. Numerical targets follow a baseline rather than being invented here.

## Deferred decisions

D009 does not choose:

- final visual styling, panel dimensions, breakpoints, component library, graph renderer, or frontend framework;
- the long-term AG-UI SDK version, CopilotKit adoption, or draft AG-UI features;
- a generative-UI specification;
- the final controlled vocabulary or derivation rules for scientific standing;
- posture selection, assessment, development, and lifecycle transitions, which belong to D010;
- detailed experiment interaction beyond the execution semantics defined in D011;
- public collaboration or shared routes outside one private workspace;
- analytics collection or external product telemetry;
- mobile parity with the desktop-grade scientific workbench.

## Revisit triggers

Reconsider D009 if:

- researchers orient more reliably from another default view;
- the persistent assistant crowds out evidence inspection;
- focused graph views do not improve provenance or dependency comprehension;
- proactive action preparation consumes more resources than its decisions justify;
- readiness states confuse users or discourage valuable exploration;
- scientific-standing summaries create unwarranted trust despite coverage labels;
- one spatial shell cannot support literature and experiment work without excessive mode switching;
- the AG-UI adapter leaks into domain state, requires extensive custom semantics, or fails replay and authorization tests;
- accessibility testing requires a materially different interaction architecture.

Any revision must preserve stable object identity, visible authority and projection state, typed mutation paths, progressive work status, scientific-purpose actions, and an interface usable without treating chat or a whole-corpus graph as the project.

## References considered

- [AG-UI overview](https://docs.ag-ui.com/)
- [AG-UI events](https://docs.ag-ui.com/concepts/events)
- [AG-UI state management](https://docs.ag-ui.com/concepts/state)
- [AG-UI interrupts](https://docs.ag-ui.com/concepts/interrupts)
- [AG-UI generative-UI boundary](https://docs.ag-ui.com/concepts/generative-ui-specs)
- [AG-UI TypeScript middleware](https://docs.ag-ui.com/sdk/js/client/middleware)
- [Official AG-UI repository](https://github.com/ag-ui-protocol/ag-ui)

## Next decision

D010 defines the Hypothesis posture engine: development and standing inputs, temporal perspective, dialogue semantics, alternative-landscape coverage, posture selection, transition guards, and the evidential burden for challenging or retiring a Hypothesis.
