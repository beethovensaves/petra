# Petra UX design brief

Status: in progress; product design must freeze before reference-UX implementation or contextual demos
Date: 2026-09-04
Authority: design specification subordinate to `PETRA.md`, accepted decisions, runtime contracts, and coordinated architecture amendments

## Purpose

This is the master product-design brief for Petra. It defines the complete,
use-agnostic experience before implementation is shaped by a demonstration
corpus. Scientific research and complex controlled writing are required Project
profiles, but no particular research program, manuscript, directory structure,
terminology set, or pre-existing workflow defines the product.

The brief is complete only when Petra can be implemented as a coherent product
from this specification without opening a demo corpus to discover what a
surface, control, object role, interaction, or recovery path is supposed to do.

## Non-negotiable separation

Petra uses three consecutive efforts:

| Phase | Output | May use contextual demo material? | Exit condition |
| --- | --- | --- | --- |
| `P1 — Product design` | Complete, accepted UX brief covering the whole Petra product | No | `UX-DESIGN-FREEZE-01` is recorded |
| `P2 — Petra reference UX` | The entire product experience implemented against synthetic, contract-shaped conformance scenarios | No | The product can stand up, navigate, operate, fail, recover, and demonstrate its profile boundary without external demo files |
| `P3 — Contextual integrations and demos` | Separate scientific and controlled-writing integrations using the user's selected real projects | Yes | Each integration passes the frozen product contracts or raises a generalized change request |

Phase 3 cannot backfill missing product design. A demo-specific need becomes a
product change only when it identifies a general failure against Petra's
principles, names the affected user class and flow, and passes the ordinary
discussion and architecture process. A convenient corpus convention, filename,
workflow label, graph shape, or available data field is not product evidence by
itself.

### Pre-freeze correction

Earlier design work inspected the future scientific and controlled-writing
contexts as pressure tests and referred to them in product fixtures. That was
premature. Those observations are quarantined from the product-design basis and
no longer establish shared requirements, rationale, fixture content,
information hierarchy, terminology, or acceptance criteria. The requirement to
support scientific research and complex controlled writing remains because the
user stated it directly as Petra's intended product scope.

Existing shell, graph, and fixture code remains historical calibration and
design-debt evidence. It is not the reference UX, does not close a brief
section, and does not determine the final product. New production-surface work
resumes only after the complete brief is accepted.

## Product design boundary

The product brief derives from:

- Petra's purpose and accepted authority model;
- the invariant governed-work loop;
- direct user decisions recorded through the discussion-first process;
- accessibility, recovery, safety, and usability principles;
- registered implementation constraints and explicit backend handoffs.

It does not derive from:

- the contents or structure of the Prosody or Sentinel projects;
- an attractive happy-path screenshot;
- whatever data happens to be easiest to mock;
- a model-generated transcript;
- an existing frontend component or backend payload;
- a demo deadline or presentation narrative.

The two requested Project profiles are product requirements. Their exact demo
contexts are not. The design therefore specifies profile extension points,
semantic responsibilities, and invariant controls before either real context is
connected.

## Required design-brief contents

Each section must be accepted at specification depth before the product-design
freeze. “Partial” means useful decisions exist but the complete surface and
interaction contract has not yet been designed.

| ID | Brief section | Required outcome | Current state |
| --- | --- | --- | --- |
| `DB01` | Product premise and non-goals | Use-agnostic purpose, authority boundary, local/private posture, explicit exclusions | accepted, pending architecture amendment for profiles |
| `DB02` | Users, roles, and responsibility | Primary project author, profile-specific role language, specialist and agent roles, decision ownership | partial |
| `DB03` | Project-profile system | Shared kernel, profile responsibilities, semantic adaptation, unsupported-profile behavior, model adaptation | accepted direction; runtime shape proposed |
| `DB04` | Information architecture | Project entry, shell, Brief, task surfaces, Details, Petra, Work, settings, navigation and deep-link rules | accepted |
| `DB05` | Complete flow architecture | Entry, success, branch, adverse state, recovery, authority, and horizon for every material flow | accepted |
| `DB06` | Petra interaction system | Dock, sidecar, focus workspace, composer, answers, context, Work, tools, interrupts, review, replay, failure, and history | accepted |
| `DB07` | Project Brief | Shared base, profile payload boundary, attention ordering, suggested actions, change comparison, empty and stale states | accepted |
| `DB08` | Sources and exact inspection | Registration, rights, versions, inspection capability, processing, source reading, exact locations, limitations, and provenance | accepted |
| `DB09` | Basis, candidates, and review | Ambient structuring, comparison, validation, exception handling, exact change preview, correction, approval, rejection, deferment, conflict, and Revert | accepted |
| `DB10` | Graph and relationship work | Task entry, query scope, layouts, depth, selection, temporal state, impact, textual parity, and optional 3D boundary | partial |
| `DB11` | Durable Work and orchestration | Plans, agents and validators, progress, input, steering, cost, detachment, reconnect, cancellation, result, and retry | not designed |
| `DB12` | Composition and revision | Artifact planning, editing, provenance, validation, citations where applicable, imported ancestry, promotion, rendering, and export | not designed |
| `DB13` | Settings and personal control | Appearance, theme, layout, panel resizing, editor, accessibility, privacy, model visibility, and local preference rules | partial |
| `DB14` | Design system | Brand, color, type, syntax, spacing, controls, icons, motion, density, responsive behavior, and data visualization grammar | partial |
| `DB15` | UX language system | Shared control vocabulary, profile-owned terms, response voice, action rationale, status, errors, confirmations, and prohibited conflations | protocol accepted; full ledgers pending |
| `DB16` | Accessibility specification | Keyboard, focus, zoom/reflow, screen reader, motion, non-color meaning, graph alternative, touch, panel resize, and streamed updates | partial |
| `DB17` | Failure, recovery, and history | Offline, stale, conflict, partial, failed, blocked, unsupported, replay, lost-connection, and non-destructive recovery paths | discussion draft |
| `DB18` | Product blueprint and acceptance | Complete screen inventory, responsive blueprints, state matrix, end-to-end path map, backend request ledger, and design acceptance evidence | not designed |

## Required specification for every module

Every module section in this brief must contain:

1. user task and completion condition;
2. profile-independent semantic roles and profile-owned extensions;
3. primary object, source of truth, snapshot, and authority boundary;
4. information hierarchy and surface entry rules;
5. direct and Petra-mediated interactions;
6. visible system status, cost, latency, capability, and consequence where applicable;
7. empty, ordinary, dense, limited, running, stale, failed, interrupted, completed, and recovery states that apply;
8. responsive, resize, keyboard, focus, screen-reader, zoom, motion, touch, and non-color behavior;
9. shared control terms, profile terminology slots, help, error, and confirmation language;
10. backend query, command, event, profile, policy, or persistence needs;
11. Nielsen heuristic audit and dangerous-misunderstanding review;
12. acceptance criteria and the neutral conformance scenarios needed after the design freeze.

## `DB04` — information architecture

**Decision:** accepted on 2026-09-03 as `UX1.1-DISC05`. Petra uses a small,
stable place hierarchy with first-class Review and Work, contextual Details and
Petra, and deliberate rather than primary History. This section does not
authorize implementation before `UX-DESIGN-FREEZE-01`.

### User task and completion condition

A Project author must be able to enter Petra, establish the exact Project and
profile context, reach the surface suited to the current task, inspect
supporting context without losing place, and return with the result and changed
state intelligible. Navigation succeeds when the author can always answer:

- which Project, profile, objective, snapshot, and primary place are active;
- which object, Work, proposal, source, event, or output is selected;
- whether Details or Petra is adding context to the main task;
- whether the displayed state is current, historical, cached, or projected;
- what will be preserved when they follow a link; and
- where completion, cancellation, failure, or browser Back will return them.

### Place hierarchy

Petra's global places are **Projects** and **Settings**. An open Project has six
first-class places: **Brief**, **Sources**, **Review**, **Graph**, **Work**, and
**Composition**. A registered profile may add clearly grouped profile tools.
**Details** and **Petra** are contextual secondary surfaces. **History** is a
full, deep-linkable Project route reached from Recent decisions, Details,
Review, changed items, and Revert; it is not permanent primary navigation.

The Project switcher, context bar, Project navigation, and profile-owned object
map are navigation structures rather than additional destinations. Review and
Work remain first-class because they contain durable, attention-requiring
objects. Their navigation indicators state a count or condition accessibly when
available; they never express a universal urgency or health score.

The [accepted place and activation model](UX-FLOW-ARCHITECTURE.md#accepted-place-model)
is normative. Its core entry rules are:

- a Project opens into its Brief;
- a source task opens Sources;
- an exact proposal, validation decision, promotion, conflict, or governed Revert
  opens Review;
- a relationship, provenance, dependency, comparison, impact, or temporal
  question may open Graph;
- durable execution, progress, interruption, failure, or result inspection
  opens Work;
- a planned, created, revised, validated, rendered, or exported output opens
  Composition;
- a stable selection may open Details without replacing the primary task;
- a question, recommendation, linked thread, or interrupt may open Petra; and
- an event, revision, recovery, or full audit question opens History.

No surface opens merely because data exists. Brief is the safe Project fallback
after a task completes or when a more specific destination is no longer valid.

### Navigation context and source of truth

Every material transition carries Project/profile identity, current focus,
authoritative snapshot, projection checkpoint, primary place, task intent,
selected typed references and revisions, comparison or historical state,
explicitly linked Petra thread and Work, origin item, return position and focus,
unsent local input, and surface-specific view state where applicable.

This navigation context coordinates presentation only. The destination obtains
its own snapshot-consistent view model. Local route, selection, scroll, panel,
disclosure, graph exploration, and unsent-input state cannot change domain
authority. The target cannot silently substitute a newer snapshot, another
object, an action revision, or ambient selection. If current state differs, the
owning module provides current, compare, original-snapshot, replacement, or
safe fallback paths.

Switching Projects explicitly changes the shell, Brief, profile, map,
selection, Details, and default Petra context together. Prior-Project Work
continues unless cancelled, and local drafts remain scoped to their originating
Project and surface. The switch pauses for an unsupported unsaved state rather
than discarding it.

### Browser, graph, and deep-link behavior

Browser Back and Forward restore application place, stable selection,
contextual surface, origin, and focus where valid. Graph Back and Forward are a
separate ten-state exploration history; graph pan, zoom, expansion, filtering,
and depth changes do not flood browser history or issue commands.

Deep links contain opaque identifiers and only the route, revision, snapshot,
or comparison identity needed to restore meaning. URLs do not contain excerpts,
prompts, context packets, credentials, or private source text. Exact-revision
links remain historical; deliberately current links resolve current state and
say so. Missing, superseded, incompatible, unauthorized, and unsupported
targets disclose only permitted context and offer the current replacement,
History, a stable parent, Projects, or Brief. An external deep link may return
through browser Back; **Return to Brief** is its in-product fallback.

### Required state and recovery coverage

| State family | Required states | Navigation response |
| --- | --- | --- |
| Global entry | no recent Project; one or many Projects; create/open pending; unavailable Project | Keep Projects usable and state the valid create, retry, request-access, or open path |
| Project resolution | loading; ready; missing; unauthorized; unsupported profile; incompatible profile | Preserve permitted identity, fail closed, and offer Projects or an allowed fallback |
| Destination | current; historical; cached; stale; replaced; partial; failed | Name state and snapshot, preserve origin, and offer current, compare, retry, History, or Brief |
| Selection | none; valid; multi-object task set; stale; replaced; unavailable | Preserve the task, resolve replacements explicitly, or close Details and restore originating focus |
| Contextual surface | closed; Details open; Petra docked; Petra focus; interrupt; narrow full-width | Preserve primary place and allow one deliberate return without cancelling Work or discarding input |
| Project switch | safe; Work active; local draft preserved; unsupported unsaved state | Continue Work in origin, scope drafts correctly, or stop and explain before loss |
| Deep link | exact; current; historical; stale; unsupported; unauthorized; malformed | Resolve semantic place or show a safe scoped failure without ambient substitution |
| Return | normal completion; defer; cancel; failure; target changed; browser origin unavailable | Restore origin item/focus or return to Brief with the outcome and change visible |

### Responsive and accessibility contract

Wide layouts show one primary surface and at most one expanded secondary by
default. Medium layouts collapse the Project map and preserve primary-place
navigation. Narrow and high-zoom layouts present one surface at a time; Details
and Petra become full-width routes with explicit return actions. The semantic
place order and all material actions survive reflow.

All places have unique page titles, headings, landmarks, skip targets, and
visible keyboard focus. Navigation indicators have text alternatives. Opening
and closing a contextual surface restores the invoking control or nearest
stable task target. Route, selection, projection, Work, and stream updates do
not steal focus or force scroll. No route depends on color, hover, drag,
animation, fine pointer control, spatial memory, or graph-only meaning.

### Language and authority

The stable shared navigation labels are **Projects**, **Settings**, **Brief**,
**Sources**, **Review**, **Graph**, **Work**, **Composition**, **Details**,
**Petra**, and **History**. Profile tools use registered names inside their own
group. Internal package, pipeline, fixture, protocol, and planning labels never
appear in navigation.

Navigation, selection, inspection, acknowledgment, local drafts, browser
history, graph history, and layout are not authority. Starting or cancelling
Work, resolving a proposal, changing a current objective, promoting an output,
or reversing a Project change uses the owning typed command path. A navigation
result cannot imply that a command completed.

`UX-REQ-001` supplies shell orientation, `UX-REQ-004` supplies registered
profile surface roles, and `UX-REQ-008` records the missing semantic
object-location and replacement-resolution boundary. The client maps semantic place
roles to routes; backend contracts do not prescribe layout or URL strings.

### Nielsen and dangerous-misunderstanding audit

The architecture makes system location and current/historical state visible;
uses stable task language; supports Back, explicit return, Project switching,
and safe fallbacks; applies the same destinations across direct and Petra paths;
prevents ambient selection and snapshot substitution; exposes places rather
than requiring recall; supports shortcuts and contextual depth; limits default
chrome and secondary surfaces; retains origin during failures; and keeps help,
basis, and History one deliberate action away.

It fails acceptance if a user could mistake Details or Petra for the primary
source of Project state, believe navigation applied a change, lose local work
or task origin during a Project switch, land on a different object silently,
confuse browser and graph history, or view a historical or projected state as
current authority.

### Acceptance and post-freeze conformance

`DB04` is accepted at specification depth when:

1. all global, Project, profile, contextual, and History places have one stable
   role and entry rule;
2. every material transition preserves or explicitly resolves its required
   Project, snapshot, object, origin, Work, thread, input, and focus context;
3. browser history, graph history, History, and governed Revert remain distinct;
4. deep links resolve exact, current, historical, stale, replaced, missing,
   unauthorized, and unsupported targets safely;
5. direct and Petra-mediated paths reach the same semantic destinations;
6. wide, narrow, zoomed, keyboard, screen-reader, touch, and non-color paths
   retain the same actions and return behavior; and
7. navigation and local presentation never imply domain authority.

After design freeze, neutral scenarios must exercise every place, Project
switching with active Work and unsent input, every contextual-presentation
mode, browser and graph Back/Forward, internal and external deep links, all
target-resolution failures, task completion, cancellation, deferral, failure,
replacement, and safe return across paired profiles.

## `DB05` — complete flow architecture

**Decision:** accepted on 2026-09-03 as `UX1.8-DISC01`. The complete normative
catalogue, place coverage, and surface transitions live in
[Petra user-flow architecture](UX-FLOW-ARCHITECTURE.md). This section defines
the closure contract and does not authorize implementation before the design
freeze.

### Governing loop and completion rule

All profile-valid tasks use one authorial loop:

```text
orient to Project, profile, current focus, snapshot, and attention
  -> choose the decision, uncertainty, source, relationship, Work, or output
  -> inspect the smallest adequate basis and constraints
  -> answer locally, act directly, or preview bounded Work
  -> inspect result, limitations, provenance, validation, and impact
  -> apply, correct, reject, defer, branch, cancel, or reverse
  -> distinguish authority from projection and historical state
  -> return to the originating task or updated Brief without losing history
```

A flow may end with a useful read-only answer, explicit abstention, retained
unresolved state, safe failure, or deliberate cancellation. It need not produce
Work, a proposal, graph change, or output to count as complete.

### Normative coverage

The [complete flow catalogue](UX-FLOW-ARCHITECTURE.md#complete-flow-catalogue)
defines 18 material flows covering Project entry; objective and proposition
framing; source discovery, processing, and inspection; proposal review; basis
and provenance; disagreement and frontier work; Petra interaction; durable
Work; exact change and reversal; profile tools; composition, revision, export,
and promotion; history and recovery; settings and governance; and bounded reuse
or external connection.

Each flow records goal, entry, ordered path, completion, branches, authority,
and delivery horizon. The
[surface-transition matrix](UX-FLOW-ARCHITECTURE.md#accepted-surface-transition-matrix)
defines origin, primary destination, optional secondary surface, state that
survives, and normal return. The
[flow-to-place matrix](UX-FLOW-ARCHITECTURE.md#flow-to-place-coverage) proves
that every flow has a primary place, supporting places, and terminal or return
state without creating one screen per object.

### Cross-module transition rules

Every transition must:

1. name the user's task and open the smallest suitable surface;
2. preserve the navigation context defined in `DB04`;
3. display the target's snapshot, freshness, source, capability, and authority
   conditions before action;
4. keep direct and Petra-mediated entry on the same object, Work, proposal,
   review, and command identities;
5. expose a commit point, cancellation or deferral behavior, terminal outcome,
   and recovery action;
6. return to the originating item and focus, or to Brief when the origin is no
   longer safe; and
7. show the resulting authoritative change, projection catch-up, invalidated
   dependent, retained failure, or unchanged state explicitly.

Following basis may move from Brief, Review, Graph, Petra, or Composition to an
exact source without losing the statement or decision that prompted it.
Following a relationship may open Graph without replacing the underlying
object. A Work result routes to Review when it proposes authority, Composition
when it creates an output, its origin when it answers read-only, or Work when it
fails. No flow ends at an unlabelled generic success message.

### Profile adaptation

The invariant flows govern Project, source revision, Work, proposal, review,
ChangeSet, approval, provenance, projection, history, recovery, and output
mechanics. Profiles supply typed objective, proposition, source, relationship,
constraint, validation, tool, and promoted-output meaning. A profile may omit
an inapplicable domain flow or add a registered profile flow, but it must map the
result back into the shared Work, Review, Composition, History, return, and
authority contracts.

The scientific and controlled-writing profiles therefore follow the same flow
grammar without sharing a false ontology. Future contextual integrations test
these paths only after design freeze and independent reference implementation;
they do not define them.

### Adverse state, recovery, and accessibility

Every flow covers empty, ordinary, dense, limited, loading, cached, running,
awaiting-input, partial, stale, conflicted, failed, cancelled, unsupported,
unauthorized, offline, projection-lagged, completed, historical, and recovery
states that apply. Recovery uses the same typed queries and commands as ordinary
work and preserves failed inputs, partial safe outputs, origin, decisions, and
history.

Every material path specifies keyboard entry, action, cancellation, deferral,
reversal, and return; stable focus through routes and streamed updates; narrow
and text-zoom reflow; screen-reader status; touch and coarse-pointer controls;
non-color meaning; textual graph, timeline, progress, and relationship parity;
and the state preserved when any command, stream, worker, model, projection, or
renderer fails.

### Backend and persistence needs

The flow architecture depends on the existing and proposed requirements
`UX-REQ-001` through `UX-REQ-012`. Individual destination data remains owned by
its module contract. The navigation context, browser history, return target,
focus target, unsent input, disclosures, and graph exploration trail are client
presentation state. Project/profile identity, snapshots, typed objects, Work,
proposals, approvals, commands, domain events, projection checkpoints, outputs,
reversal eligibility, and replacement/supersession meaning remain server-owned.

### Nielsen and dangerous-misunderstanding audit

The complete flow system exposes status at each step, uses task and profile
language, provides exit and recovery, keeps control patterns consistent,
previews consequential actions, retains context rather than relying on memory,
allows direct or Petra-assisted paths, presents one decision at a time, recovers
without erasing history, and links help or basis in context.

The design fails acceptance if any path can apply authority without exact
preview, start material Work without consequence, confuse closing with
cancelling, lose the originating object, hide a material limitation, strand the
author after a failure, convert profile terminology by alias, or require a
graph, color, drag, hover, animation, or conversation transcript as its only
usable representation.

### Acceptance and post-freeze conformance

`DB05` is accepted at specification depth when:

1. all 18 flows have an entry, completion, branch, adverse state, recovery,
   authority rule, place mapping, return, and horizon;
2. every transition in the accepted matrix preserves its named state and
   returns meaningfully after success, deferment, cancellation, conflict, or
   failure;
3. all direct and Petra-mediated variants converge on the same governed object
   and command identities;
4. every asynchronous flow distinguishes response, connection, Work,
   proposal, authority, projection, and history state;
5. every profile flow uses the shared authorial grammar without semantic
   aliasing or authority drift;
6. every path has complete responsive and accessibility behavior; and
7. every missing runtime dependency has a recorded requirement and safe
   pre-implementation boundary.

After design freeze, neutral conformance must execute the 18 flow families at
the horizons included in the reference UX, plus the four named end-to-end
paths, across ordinary and adverse states. Paired profile scenarios prove
shared control equivalence and typed semantic difference. Contextual demo files,
terminology, workflows, and data shapes remain excluded.

## `DB06` — Petra interaction system

**Decision:** accepted on 2026-09-02 as `UX1.6-DISC01`. This section is the
product interaction contract for Petra. It does not authorize implementation
before `UX-DESIGN-FREEZE-01`.

### Product role and completion condition

Petra is the interaction layer for understanding, directing, and governing
Project work. It is not a chat window attached to the application, a second
authority system, or the place where durable Project state lives.

A Project author completes a Petra interaction when they can:

1. understand the answer, its basis, snapshot, limits, and origin;
2. tell whether Petra answered from current state, cached material, or new Work;
3. inspect and adjust the exact context and consequence before starting Work;
4. follow, interrupt, detach from, reconnect to, steer, or cancel durable Work;
5. inspect a proposed change and use the same review command available outside
   Petra; and
6. recover from an unhelpful exploration path, failed interaction, or reversible
   Project change without erasing history.

### Presentation architecture

Petra has one identity and four responsive presentations of the same
task-linked interaction state:

| Presentation | Purpose and entry | Exit and persistence rule |
| --- | --- | --- |
| **Dock** | A quiet persistent entry showing availability, attention, and the most important active-Work condition | Expanding it does not create a thread or change context |
| **Sidecar** | The normal resizable surface for a contextual question, answer, action preview, or short review | Collapsing it preserves the thread, composer, context, selection, and Work |
| **Focus workspace** | A main-surface route for extended planning, comparison, instruction, review, or multi-stage Work | Leaving the route preserves durable interaction and restores the prior main-surface location |
| **Narrow Petra route** | The full-width equivalent used when a sidecar would make either task unreadable | An explicit return action restores the originating route and focus target |

The main-first shell permits at most one expanded secondary surface by default.
Opening Petra from Details collapses or replaces Details while preserving its
selection; opening Details from Petra does the inverse. Petra may be the main
surface in focus mode. Closing, collapsing, navigating away, or losing a
connection never means **Cancel work**, discard the composer, clear context, or
apply a proposal.

Every expanded presentation uses the same information hierarchy:

1. thread title, task link, history access, and presentation controls;
2. explicit Project, profile, objective, snapshot, and context boundary;
3. pinned interrupts, proposals awaiting review, and active Work that require
   attention;
4. an editorial conversation containing answers, decisions, plans, results,
   and meaningful transitions; and
5. a persistent composer with context and action controls.

The application logo and product name do not repeat inside this surface. Empty
frames, avatar rows, decorative agent cards, and generic **Agent activity**
panels are excluded.

### Threads and per-turn context

Threads are Project-scoped, task-linked records rather than one global,
unbounded transcript. A thread retains its title, profile and objective,
snapshot lineage, linked domain objects, context packets, Work, proposals,
decisions, artifacts, compaction markers, and attention state. Threads are
searchable, deep-linkable, and resumable from their related object or task.

Each submitted turn binds and exposes:

- Project and versioned Project profile;
- task objective and authoritative snapshot;
- explicitly included object, source, artifact, and selection references;
- explicit exclusions, omissions, coverage limits, and cached-basis status;
- capability, privacy, budget, and review-policy boundaries;
- whether Petra may answer locally, suggest new Work, or start already approved
  Work; and
- applicable schema, terminology, prompt, tool, validator, and model-routing
  revisions when they affect interpretation or reproducibility.

A route or selection change does not silently change an existing thread's
context. **Add current selection** is explicit. Before a stale thread continues,
Petra offers **Continue from original snapshot**, **Compare with current**, or
**Start a thread from current state**, with the consequences stated. Deleting a
conversation view cannot delete its Work, artifacts, applied changes,
approvals, or domain events.

### Answers, action transitions, and response writing

The composer does not require an **Ask / Research / Edit** mode selector. Petra
resolves the request into one of three visible outcomes:

| Basis and intent | Required outcome |
| --- | --- |
| The bounded current basis is sufficient and no mutation is requested | A grounded answer with inspectable references |
| The basis is insufficient or requested work has material cost, latency, or capability consequences | A `SuggestedAction` preview before durable Work starts |
| The request would change governed Project state | A proposal followed by exact `ChangeSet` review and a typed command |

The normal response order is: conclusion or direct answer; basis; material
limits and uncertainty; what changed when comparison was requested; and one
useful next action. Prose is editorial rather than a stack of chat bubbles. It
uses inspectable references and distinguishes source report, extraction,
profile-valid inference, author judgment, named model or Work output,
recommendation, question, and action. Petra may expose a concise plan, chosen
tools, validation results, and decision rationale; it does not expose private
chain-of-thought or present the product as the content author.

Current, cached, streaming, partial, and newly completed material remain
visually and linguistically distinct. Stopping a response preserves the text
already received and offers a deliberate retry or follow-on. Malformed or
unvalidated model output never appears as an ordinary grounded answer or
proposal.

### Suggested actions and durable Work

Before new Work starts, `SuggestedAction` shows the objective, reason, target
snapshot and objects, current basis, proposed scope and depth, expected output,
tools and validators, capability and approval requirements, estimated or
measured time and cost with their basis, interrupt expectations, cancellation
consequence, and whether the result will be reusable. The author may adjust
supported parameters, choose an alternative, defer, or start the exact action
revision. Stale actions require regeneration rather than silently changing
scope.

Work is a durable object linked from the thread but not flattened into the
transcript. Its summary shows objective, plan, current stage, status, elapsed or
estimated time, cost, limits, required input, cancellation consequence, and
result. Its expanded activity shows observable stages, tools, queries,
validators, inputs, outputs, checkpoints, and errors. Raw token events, retries,
agent chatter, and protocol traffic stay out of the editorial transcript.

Petra remains one assistant identity. Retrieval, analysis, critic, validator,
editor, and profile-specialist roles appear only as accountable roles inside a
Work plan. They are not characters in a multi-agent chat. Model and provider
details are inspectable from Work and advanced controls but do not occupy the
primary header.

### Interrupts, review, and authority

An interrupt is pinned above the composer and names the blocked Work, why it
stopped, the exact choices available, the consequence of each choice, what
remains safe while Petra waits, and **Cancel work** or **Decide later** where
valid. Clarification, capability, budget, validation, and `ChangeSet` approval
interrupts use distinct language; none collapses into a generic **Continue**.

A small, single-object, low-ambiguity proposal may show its exact diff inline.
A multi-object, ambiguous, dependency-sensitive, or high-impact proposal opens
the dedicated Review main surface. Petra remains linked as a sidecar so the
author can ask about the proposal without creating a second approval path.
Direct and Petra-mediated decisions use the same proposal, validation,
`ChangeSet`, approval, apply, conflict, and reversal commands. Work completion
never means that a change was applied.

### Reversal, graph navigation, and branching

Petra separates presentation recovery from domain reversal:

| Layer | Quick-history behavior | Authority behavior |
| --- | --- | --- |
| Graph exploration | **Back in graph** and **Forward in graph** retain the 10 most recent meaningful view states: task scope, depth, expansion, filters, layout, viewport, temporal position, and selection | Restoring a view state changes no Project object, relationship, proposal, Work, or event |
| Unsent local editing | The composer and editable fields use conventional undo and redo and preserve the draft when their surface collapses | Unsubmitted content is local presentation state; it is not part of the graph or Project quick-history limit |
| Applied Project changes | **Recent changes** exposes the 10 most recent eligible author-visible changes as a quick-access window; each eligible item offers **Revert change** | Every reversal is a previewed, validated compensating `ChangeSet`; the original command, approval, and event remain in the full history |
| Conversation and Work | An author may branch a thread from an earlier turn; Work may be steered, cancelled, retried, or used to start a new branch | Branching does not rewind Project state, and completed Work is not “undone”; any applied result follows the Project-change reversal path |

The 10-step limit bounds immediate recovery controls, not retention. Full
Project and artifact history remains inspectable. **Revert to here** may prepare
an ordered compensation plan for a contiguous set of eligible recent changes,
but it must list every affected action and dependency and may apply only after
the entire plan validates. A stale, irreversible, permission-blocked, or
dependency-conflicted step explains why it cannot be reversed and offers the
safe review, branch, or manual-correction route. Redo is a new forward
`ChangeSet`, not resurrection of a deleted event.

The graph may preview a reversal by ghosting removed and restored nodes and
edges, showing dependency impact, and letting the author inspect earlier
temporal states. A visible **Return to current** action exits historical view.
Neither Cytoscape nor Reagraph owns the history or executes the reversal: Petra
stores view snapshots in application state and derives authoritative previews
from the command and event layer. The textual graph alternative exposes the
same history, difference, and return actions.

### Required interaction-state matrix

| State family | Required states | Required response or recovery |
| --- | --- | --- |
| Entry and availability | no Project; empty thread; ready; unsupported profile; offline; Petra unavailable | Explain scope, preserve input, and offer a valid Project, retry, or local inspection path |
| Context | current; cached; incomplete; explicitly excluded; stale snapshot; replaced object | Name the basis and omission; add, compare, refresh, or retain the original snapshot deliberately |
| Response | preparing; streaming; stopped; completed; partial; malformed; unvalidated; model fallback | Preserve received content, identify status and limits, and separate retry from new Work |
| Action preview | ready; adjustable; missing prerequisite; capability blocked; budget limited; stale; already active | Explain why, show consequences, and start only the exact valid action revision |
| Work | requested; queued; running; background; awaiting input; checkpointed; blocked; failed; cancelled; completed | Keep durable identity, activity, limits, result, cancellation, retry, and return paths visible |
| Interrupt | clarification; capability; budget; validation; review | State the blocked Work, choices, consequences, safe waiting behavior, and cancellation path |
| Connection | disconnected while Work continues; reconnecting; replaying; caught up; replay failed | Never imply cancellation; resume idempotently or open durable Work independently |
| Proposal and review | proposed; validating; awaiting review; conflicted; rejected; deferred; applied; projection catching up; reverted | Keep proposal, authority, projection, and reversal states separate |
| Reversal and history | graph back available/unavailable; historical view; reversal preview; multi-step preview; stale or ineligible reversal; reversal applied; reversal failed | Show the ten-step quick window, full history route, exact impact, commit point, and **Return to current** |

### Responsive and accessibility contract

- A configurable shortcut opens Petra without stealing focus from an active
  editor. Focus moves only after the author requests a presentation change.
- Sidecar size is adjustable by pointer, touch, keyboard, and an accessible
  separator. Personal width, presentation, text, and motion preferences are
  restorable from Settings and cannot change Project authority.
- At high zoom or narrow width, content reflows into the narrow Petra route;
  controls and consequences do not disappear or become horizontal-scroll-only.
- Streaming never forces scroll, moves focus, or overwrites a selection. A user
  may pause visual streaming. Screen-reader announcements are concise and
  batched rather than emitted token by token.
- Work progress, graph history, proposal difference, status, and impact have
  textual equivalents. Color, animation, spatial position, or a 3D view never
  carries the only meaning.
- **Stop response**, **Keep running in background**, **Disconnect**, **Cancel
  work**, **Back in graph**, and **Revert change** remain distinct by
  label, focus behavior, confirmation, and result.
- Composer content, context choices, selection, and active-Work access survive
  panel resize, collapse, route change, reconnect, and recoverable failure.

### Shared language

The shared controls are **Ask Petra**, **Add current selection**, **Review
context**, **Start work**, **Keep running in background**, **Stop response**,
**Cancel work**, **Review changes**, **Apply changes**, **Decide later**, **Back
in graph**, **Forward in graph**, **Recent changes**, **Revert change**, **Revert to here**, and
**Return to current**. Profile-owned nouns fill semantic slots around these
controls; they do not rename the controls' authority meaning. Internal planning
labels, protocol terms, implementation names, unexplained “extraction” labels,
all-caps status prose, and generic **Agent activity** are prohibited in product
copy.

### Nielsen and dangerous-misunderstanding audit

| Heuristic | DB06 resolution |
| --- | --- |
| Visibility of system status | Context, response freshness, Work, connection, review, projection, and reversal status remain separately visible |
| Match with the real world | Task, basis, work, review, change, and history language replaces protocol and planning jargon |
| User control and freedom | Stop, detach, reconnect, cancel, branch, graph Back/Forward, defer, reject, and governed Revert have distinct outcomes |
| Consistency and standards | Direct and Petra-mediated actions share controls, commands, terminology, and review surfaces |
| Error prevention | Exact context, action revision, capability, cost, change impact, and reversal consequence appear before commit |
| Recognition rather than recall | Pinned context, linked objects, Work shelf, recent-ten history, and explicit stale-thread choices preserve orientation |
| Flexibility and efficiency | Dock, sidecar, focus route, shortcuts, bounded defaults, and advanced inspection support different task depths |
| Aesthetic and minimalist design | Editorial responses, one expanded secondary surface, and no avatars, duplicate branding, raw events, or empty panels constrain noise |
| Error recovery | Failed, partial, stale, disconnected, conflicted, and ineligible-reversal states retain work and offer the next safe action |
| Help and documentation | Context, basis, action rationale, tool/validator role, limitation, and consequence remain inspectable in place |

The design fails acceptance if a user could reasonably believe that stopping a
response cancelled Work, Work completion applied a change, graph navigation
changed Project state, a model answer was authoritative, Revert erased history,
or a historical graph was current.

### Backend and persistence needs

Existing `PetraInteractionRun`, `WorkUnit`, `ContextPacket`, `EvidencePacket`,
`ChangeSet`, approval, projection, and additive event boundaries remain the
expected foundation. The proposed `SuggestedAction` boundary is covered by
`UX-REQ-003`. `UX-REQ-006` records the missing product-level Project thread
and per-turn context read boundary; protocol thread identifiers alone do not
define user-facing history. `UX-REQ-007` records graph view-history separation,
reversal eligibility, ordered compensation previews, and the recent-ten quick
window.

The client may own unsent composer text, panel presentation, and the last ten
graph view snapshots. The server owns durable thread linkage, material turn
records, Work, action identity, context packets, proposals, approvals,
authoritative history, reversal eligibility, compensating commands, and their
events. The graph projection visualizes that state and never becomes its source
of truth.

### Acceptance criteria and post-freeze conformance evidence

`DB06` is accepted at specification depth when:

1. the same task-linked interaction can move among dock, sidecar, focus, and
   narrow presentations without lost context, input, selection, or Work;
2. a Project author can distinguish answer, action preview, Work, proposal,
   approval, applied state, projection freshness, and history without color;
3. each turn exposes its Project, profile, objective, snapshot, inclusion,
   omission, capability, policy, and basis boundary;
4. direct and Petra-mediated changes reach the same exact review and command;
5. every Work and connection control has a distinct, accurate consequence;
6. meaningful activity is inspectable without raw protocol noise or private
   reasoning;
7. stale, partial, malformed, fallback, disconnected, interrupted, failed, and
   conflicting states preserve work and provide a safe recovery path;
8. graph Back/Forward restores ten meaningful exploration states without domain
   mutation;
9. the recent-ten Project-change window produces only explicit compensating
   previews and full history remains intact;
10. keyboard, focus, zoom, resize, streaming, screen-reader, touch, motion, and
    textual graph alternatives satisfy the accessibility contract; and
11. no profile, model, presentation, or assistant role changes Petra's authority
    semantics.

After the design freeze, neutral conformance scenarios must cover a grounded
answer, incomplete context, a bounded action preview, adjustable Work, every
interrupt family, detach/reconnect/replay, partial and malformed output, inline
and dedicated review, a ten-state graph exploration followed by Back/Forward,
more than ten applied-history entries with a ten-item recent-changes window, a
multi-step compensation preview, an ineligible reversal, a stale thread, a
model fallback, and paired profile semantics. The scenarios use invented
contract-shaped content and no contextual demo material.

## `DB07` — Project Brief

**Decision:** accepted on 2026-09-02 as `UX1.2-DISC01`. This section defines
the profile-resolved Project home. It does not authorize implementation before
`UX-DESIGN-FREEZE-01`.

### Product role and completion condition

The Brief is Petra's calm arrival and decision surface. It is not a dashboard,
report, activity feed, chat transcript, graph overview, or grid of module
shortcuts. It helps a Project author answer five questions without opening
another surface:

1. What is this Project trying to accomplish now?
2. What has changed materially from the comparison point I can see?
3. What requires my judgment or action?
4. What is the current supported picture, including important limits?
5. What is the most useful next step, and why?

The Brief succeeds when the author can choose a meaningful task, deliberately
defer it, or conclude that no action is currently needed without mistaking a
summary, recommendation, or model statement for authority.

### Surface boundary and hierarchy

The shell retains Project, profile, snapshot, projection freshness, selection,
and active-Work orientation. The Brief does not repeat the entire shell. It
uses a single editorial reading column and an adaptive sequence rather than a
card wall or fixed KPI layout:

| Order | Section | Required purpose |
| --- | --- | --- |
| 1 | **Current focus** | Name the profile-valid objective, its scope, governing constraints, and the snapshot behind the Brief |
| 2 | **Needs your attention** | Expand the one item with the greatest material consequence; keep remaining items in a bounded compact list with **View all** |
| 3 | **What changed** | Compare the visible baseline with the current authoritative snapshot and explain material additions, removals, reversals, conflicts, completed Work, and invalidated dependents |
| 4 | **Current state** | Present a bounded, profile-owned synopsis of the objects, relationships, basis, tensions, unknowns, and outputs needed to understand the current focus |
| 5 | **Work** | Show only active, blocked, awaiting-input, failed, or newly completed Work relevant to the current focus |
| 6 | **Next steps** | Present one recommended `SuggestedAction` with its reason and a compact set of valid alternatives; never invent actions in the browser |
| 7 | **Recent decisions** | Keep the latest consequential decisions, full History, and governed Revert reachable without turning the Brief into a log |

Sections with no meaningful content recede rather than leaving decorative empty
containers. **Current focus** always remains. **Needs your attention** may move
ahead of ordinary orientation content when a safe decision cannot wait, but it
does not displace Project and snapshot identity. One attention item is expanded
at a time. The page does not use a mosaic, equal-weight panels, a universal
health score, or a default miniature network graph.

### Profile-resolved meaning

The shared Brief owns the reading order, control meanings, snapshot and
comparison boundary, attention behavior, Work linkage, history access, and
accessibility. The active Project profile owns:

- the objective object and user-facing name;
- typed domain objects and relationships used in **Current state**;
- governing basis, constraint, tension, unknown, and output roles;
- validators and rules that create profile-specific attention;
- the meaning and phrasing of profile-specific actions; and
- the basis members and detail destinations behind every synthesis.

The scientific profile may resolve the focus to a ResearchQuestion and show
Hypotheses, Claims, EvidenceRelations, source limitations, experimental
results, and evidence frontiers. The controlled-writing profile may resolve it
to a revision objective and show governing source revisions, canon,
constraints, dependencies, validation findings, candidate revisions, and
promotion readiness. These are different typed payloads, not alternate labels
for one generic record.

A profile may omit an irrelevant semantic role, but it cannot redefine
**Review changes**, **Start work**, **Cancel work**, **Apply changes**, **Revert
change**, snapshot identity, or authority. Unknown and unsupported
profiles fail closed instead of falling back to generic cards.

### Attention and consequence ordering

Attention ordering follows material consequence, not recency, model confidence,
or an unexplained score. The ordinary order is:

1. a safety, rights, capability, budget, or integrity decision that blocks safe
   continuation;
2. an exact proposal, approval, conflict, or validation decision assigned to
   the author;
3. Work awaiting input, blocked, failed, or unable to complete as scoped;
4. a stale, invalidated, superseded, or dependency-affected artifact or domain
   object;
5. newly completed Work or a material Project change not yet acknowledged at
   the chosen comparison baseline; and
6. a useful recommendation that does not block existing work.

Every item states what happened, why it matters to the current focus, which
objects and snapshot it concerns, what decision or inspection is available,
and what happens if the author decides later. The profile and governing policy
may refine ordering within a consequence class, but the UI exposes the reason.
**Mark reviewed** changes only the author's presentation acknowledgment.
**Decide later** preserves the unresolved condition and its return path.
Dismissing a row cannot approve, reject, resolve, cancel, or make an underlying
condition disappear.

### Comparison, freshness, and history

**What changed** always names both endpoints. Its default baseline is the last
Brief snapshot acknowledged on the current device; the author may select
another authoritative snapshot or return to a current-only view. The local
acknowledgment marker is presentation state. The comparison itself is derived
from authoritative records and includes basis links.

The section distinguishes:

- authoritative Project changes from projection catch-up;
- newly completed Work from an applied result;
- corrected or reversed objects from deleted history;
- a newly available source or result from a changed interpretation;
- author decisions from Petra recommendations; and
- current state from a historical comparison.

An unchanged comparison says **No material changes from [baseline]** rather
than claiming that the Project is healthy, complete, correct, or fully
reviewed. Historical inspection has a visible **Return to current** action.
The recent-ten governed Revert window from `DB06` is reachable from **Recent
decisions** and exact changed items; the Brief does not execute a silent
rollback.

### Direct and Petra-mediated interactions

Every material Brief item supports the smallest valid next interaction:

- inspect the exact object in Details;
- open its basis in Sources, Review, Graph, Work, or Composition;
- compare snapshots or revisions;
- use a direct typed action where the consequence is already clear;
- choose **Ask Petra about this**, which explicitly adds the item, objects,
  baseline, and current snapshot to the thread context;
- open a `SuggestedAction` preview; or
- defer, acknowledge, or return to the item without losing its state.

Petra explains the Brief but does not duplicate it as a conversational summary.
Opening Petra uses the accepted sidecar/focus rules from `DB06`. Direct and
Petra-mediated actions resolve to the same action revision, WorkUnit,
proposal, Review surface, and command. Material editing, multi-object review,
and dependency-sensitive changes leave the Brief for their dedicated task
surface and return to the updated Brief after completion.

A small relationship preview may appear only when it answers the active Brief
question more clearly than text. It remains task-bounded, has a textual
equivalent, and links to **Open in Graph**. The Brief never opens with an
unrestricted network visualization.

### Required state matrix

| State family | Required states | Required Brief behavior |
| --- | --- | --- |
| Project entry | no Project; new Project; no current focus; ready; missing or unauthorized Project | Explain the condition and offer the valid create, select, request-access, or define-focus path |
| Profile | resolving; ready; limited payload; unsupported; incompatible version | Preserve Project identity, state the limitation, and fail closed for unknown semantics |
| Brief data | loading; current; cached; partial; stale; failed | Preserve the last trustworthy view, label freshness and omissions, and offer retry or comparison |
| Attention | none; one item; multiple items; blocked decision; deferred; acknowledged; resolved elsewhere | Expand one consequential item, keep the rest compact, and distinguish acknowledgment from resolution |
| Comparison | no baseline; unchanged; changed; historical; baseline unavailable; projection catching up | Name endpoints, basis, authoritative versus derived state, and **Return to current** |
| Current state | empty; early; ordinary; dense; disputed; limited basis; stale dependent | Adapt information depth without scores, unsupported conclusions, or a card explosion |
| Work | none; queued; running; background; awaiting input; blocked; failed; cancelled; newly completed | Show only focus-relevant Work and link to its durable record and recovery action |
| Actions | no valid action; ready; adjustable; prerequisite missing; capability blocked; stale; already active | Explain usefulness and consequence and open the exact preview rather than running from a generic button |
| History and Revert | no eligible change; eligible recent change; historical view; reversal preview; conflicted or ineligible reversal | Link to full history and the governed `DB06` reversal path without implying deletion |
| Connectivity | online; offline cached; reconnecting; refreshed; refresh failed | Preserve reading and unsent interaction state and distinguish cached Brief data from continuing Work |

### Responsive and accessibility contract

- Wide layouts keep the Brief as the primary reading surface and permit only
  one expanded secondary surface, normally Petra or Details.
- Narrow and high-zoom layouts retain the same semantic order in one column.
  Attention does not become a horizontal carousel, and actions do not disappear
  into hover-only controls.
- User-set panel sizes, font scaling, spacing, contrast, reduced motion, and
  focus preferences apply without changing Brief meaning or Project state.
- Heading hierarchy and landmark labels let keyboard and screen-reader users
  jump among focus, attention, changes, current state, Work, next steps, and
  history. A **Skip to next decision** action is available when the Brief is
  dense.
- Expanding, acknowledging, deferring, refreshing, or receiving streamed Work
  status does not move focus or force scroll. Updated regions announce a
  concise summary, not every changed row.
- Attention, relation, freshness, origin, status, and comparison differences use
  text and structure in addition to color. Relationship previews have ordered
  textual equivalents.
- Touch targets, keyboard actions, accessible disclosure controls, and focus
  restoration remain complete when one item opens another task surface.

### Shared language

Shared section labels are **Current focus**, **Needs your attention**, **What
changed**, **Work**, **Next steps**, and **Recent decisions**. The profile may
replace **Current state** with a more accurate registered label. Shared actions
include **View basis**, **Open details**, **Ask Petra about this**, **Compare**,
**Review changes**, **Start work**, **Decide later**, **Mark reviewed**, **View
all**, **View history**, **Revert change**, **Open in Graph**, and **Return
to current**.

The Brief does not use **health**, **confidence**, **maturity**, **extraction**,
**agent activity**, **insight**, or **priority score** unless a registered
profile contract defines an exact domain meaning and basis. Empty states use
plain task language such as **Define the current focus** or **Add a source**;
they do not advertise unavailable automation.

### Authority, data, and backend needs

The Brief is a snapshot-bound read model. It may summarize authoritative and
derived records, but it owns neither. Every material synthesis, count,
limitation, conflict, change, and action reason resolves to typed member or
basis references. Model-written orientation text is identified as Petra's
synthesis and cannot be the only representation of a material condition.

`UX-REQ-002` remains the required `ProjectBriefView` boundary and is extended
by this accepted section to cover:

- the ordered semantic sections and one-expanded-attention behavior;
- consequence class and human-readable ordering rationale without a universal
  score;
- an explicit comparison-baseline input and snapshot-bound change summary;
- acknowledgment and deferral presentation state separated from domain
  resolution;
- focus-relevant Work and recently completed results;
- recent consequential decisions and routes to full history and governed Revert;
- profile-owned current-state payloads and registered section terminology; and
- basis/member queries for every material statement and action.

The client may own disclosure state, the locally acknowledged Brief snapshot,
and a user-selected comparison baseline. It cannot calculate material
attention, profile semantics, action readiness, domain standing, change impact,
or reversal eligibility. Cross-device synchronization of local acknowledgment
remains outside the current requirement unless Petra later adds an identity and
preference-sync decision.

### Nielsen and dangerous-misunderstanding audit

| Heuristic | DB07 resolution |
| --- | --- |
| Visibility of system status | Snapshot, freshness, attention, Work, comparison endpoints, projection lag, and action readiness remain visible |
| Match with the real world | Objective, change, decision, basis, work, and next-step language replaces system and pipeline jargon |
| User control and freedom | Compare, defer, acknowledge, inspect, ask, return, and governed Revert have explicit and reversible presentation effects |
| Consistency and standards | Brief rows open the same Details, Petra, Work, Review, Graph, History, and command paths used elsewhere |
| Error prevention | Basis, limitation, prerequisite, consequence, baseline, and authority appear before action |
| Recognition rather than recall | Current focus, one expanded attention item, visible comparison endpoints, and return paths preserve orientation |
| Flexibility and efficiency | Direct actions, Petra mediation, shortcuts, compact rows, and **View all** support different depths without two systems |
| Aesthetic and minimalist design | One reading column, adaptive sections, bounded attention, and no KPI grid, empty panels, or default graph reduce noise |
| Error recovery | Cached, partial, stale, unsupported, failed, conflicted, and historical states retain the last trustworthy view and a safe route |
| Help and documentation | Reasons, basis, limitations, profile meanings, and consequences are inspectable in place |

The design fails acceptance if an author could reasonably believe that an
attention item is a confidence score, acknowledging an item resolved it,
completed Work was applied, a projection update was an authoritative change,
Petra's synthesis was source material, or an unchanged comparison meant the
Project was correct or complete.

### Acceptance criteria and post-freeze conformance evidence

`DB07` is accepted at specification depth when:

1. an author can identify current focus, material change, required decision,
   supported state, limitation, and next step without opening another surface;
2. the Brief remains calm with no attention and intelligible under dense,
   disputed, limited, stale, failed, and active-Work conditions;
3. one attention item is expanded and every other item remains reachable with
   its consequence and resolution state intact;
4. every material statement, count, change, and recommendation resolves to its
   basis and snapshot;
5. profile payloads change typed meaning and terminology without changing the
   shared control and authority grammar;
6. direct and Petra-mediated paths preserve the same identity, context,
   action, Work, review, and return behavior;
7. comparison, acknowledgment, deferral, domain resolution, projection
   catch-up, and governed Revert cannot be confused;
8. the responsive and accessibility contract preserves reading order, focus,
   reflow, controls, and textual parity; and
9. no Brief element presents a universal health, truth, confidence, maturity,
   urgency, quality, or currentness score.

After design freeze, neutral conformance scenarios must cover a new Project,
no current focus, calm current state, one and many attention items, dense
profile content, limited basis, a disputed state, active and blocked Work, a
newly completed result, unchanged and material snapshot comparisons, projection
lag, cached offline reading, partial and failed Brief loads, unsupported and
incompatible profiles, direct and Petra-mediated action entry, historical
inspection, and governed Revert. Paired scientific and controlled-writing
scenarios use invented contract-shaped content and no contextual demo material.

## `DB08` — Sources and exact inspection

**Decision:** accepted on 2026-09-03 as `UX1.3-DISC01`. Sources is a
Project-scoped working collection over reusable canonical source identities,
immutable source revisions, and exact Artifacts. Inspection capability,
processing state, rights, local availability, and Project relevance remain
separate facts. This section does not authorize implementation before
`UX-DESIGN-FREEZE-01`.

### Product role and completion condition

Sources is where a Project author registers, reuses, organizes, reads, and
traces the protected basis for Project work. It is not a generic file manager,
discovery feed, citation list, ingestion dashboard, graph overview, or hidden
retrieval corpus. The same surface must support a scientific Project whose
sources include scholarly Works and a controlled-writing Project whose sources
include protected manuscript revisions and reference material without
pretending that those domains share one ontology.

The surface succeeds when the author can:

1. identify what a source is and why it belongs to this Project;
2. distinguish its canonical identity, exact revision, and exact copy;
3. understand what Petra can inspect, what processing has occurred, what
   rights and privacy rules apply, and which limitations remain;
4. open an exact selected passage in honest surrounding source context;
5. trace how that source, revision, copy, or passage is used downstream;
6. choose a safe next step when content is incomplete, changed, unavailable,
   ambiguous, failed, offline, or unsupported; and
7. remove a source from current Project use or delete a local copy without
   believing that provenance and history were erased.

Registration does not establish truth, quality, admissibility for every task,
or permission for every operation. Processing does not approve extracted
meaning. Reading and selection do not mutate Project authority.

### Shared source model and profile boundary

The experience preserves six semantic roles even when a profile uses more
specific terms:

| Role | Shared meaning | Scientific example | Controlled-writing example |
| --- | --- | --- | --- |
| Canonical source identity | The durable identity reusable across Projects | Scholarly `Work` | Registered manuscript, reference work, or governing source identity |
| Source revision | One immutable, identifiable version of that source | `WorkVersion` | Protected manuscript or reference revision |
| Artifact | Exact immutable bytes or structured snapshot Petra may inspect | One PDF, JATS, or repository copy | One manuscript file, structured export, or reference copy |
| Project source link | Why and how the source participates in this Project | Corpus role and relevance to a research objective | Governing, comparative, contextual, or revision-basis role |
| Exact location | A verifiable region within one Artifact or structured source | `SourceSpan` | Exact passage, line range, structural path, or rendered region |
| Downstream use | The objects, proposals, Work, decisions, and outputs that depend on the source | Claims, Assertions, relations, experiments, or DraftSpans | Constraints, canon or continuity findings, candidate revisions, validations, or output spans |

The shared product owns these role distinctions, the Project-link lifecycle,
inspection and provenance behavior, rights and capability presentation,
history, and controls. The Project profile owns source classes, admissibility
rules, relationship types, Project-role vocabulary, validators, preferred
metadata, revision status, and downstream object kinds. A source class in one
profile cannot be stored as a superficially similar class from another.

Canonical identity is not Project membership. Project membership is not exact
content. One canonical source may be linked to multiple Projects; one source
revision may have multiple Artifacts; and identical bytes may reuse
content-addressed storage while retaining separate acquisition manifests and
copy-specific rights decisions. Reuse never grants access that the actor,
Project, source copy, or intended operation does not already permit.

A newly supplied Artifact may remain linked to the Project under an explicit
provisional or identity-unresolved state until its source identity and revision
are resolved. The UI does not invent a canonical source to make intake look
complete, and operations that require resolved identity or revision remain
unavailable with a stated next step.

### Source lifecycle and authority

The shared lifecycle is:

```text
submit, discover, or choose an existing source
  -> resolve or retain provisional identity
  -> select an immutable revision
  -> evaluate copy-specific rights and integrity
  -> create the Project source link and its role
  -> register or reuse an exact permitted Artifact
  -> run bounded, visible processing when requested or allowed
  -> inspect content and exact locations according to available capabilities
  -> create proposals or downstream uses through their ordinary review paths
  -> retain every revision, limitation, decision, and dependency
```

Identity resolution, acquisition, Project linking, processing, extraction,
review, and application are separate transitions. A failure at one stage does
not fabricate success at another. A profile may require a source to pass
additional admissibility checks before it can support a particular output, but
that decision remains explicit and task-scoped.

A newly discovered or supplied version is additive. It does not overwrite the
previous source revision, Artifact, parse, exact location, proposal, decision,
or output, and it does not silently move an existing downstream reference to
new bytes. The author can compare versions, inspect affected dependents, and
deliberately adopt, retain, replace, or defer the newer revision through the
applicable typed path.

### Surface hierarchy and entry rules

Sources has four coordinated task states, not four permanently visible panels:

| Task state | Primary content | Entry |
| --- | --- | --- |
| Project source collection | Compact, filterable rows for sources linked to the current Project | Project navigation, Brief limitation, or return from a source task |
| Add or reuse source | Search Petra's permitted source library, register a file, identifier, link, or supported connector result, then resolve identity, rights, revision, and Project role | **Add source**, a Petra action preview, or source-requiring Work |
| Source reader | Original source representation, outline or structure, current exact selection, and reading controls | Source row, provenance link, Review item, graph relation, Petra citation, Work result, or Composition basis |
| Source details | Identity, versions, copies, rights, processing, inspection capabilities, provenance, downstream uses, and recovery actions | Contextual Details from the collection or reader |

The collection leads with a human-readable source descriptor and profile-owned
role. It then shows the selected revision, the strongest honestly available
inspection extent, material rights or availability limitation, processing or
attention state, and downstream-use summary. It does not lead with a parser
stage, database identifier, citation count, model score, or generic quality
badge.

Search, sort, and filters may use descriptor, profile role, source class,
author or responsible party, revision, date, Project relevance, inspection
availability, rights limitation, processing state, downstream use, and
attention state. Sorting never implies scientific quality, truth, authority,
or creative importance. Dense collections retain descriptive rows rather than
becoming an equal-weight card grid.

When a source is already registered and permitted, **Use existing source**
creates or previews only the Project link and role; it does not duplicate the
canonical identity, Artifact, or bytes. A duplicate, uncertain match, or
conflicting identifier presents **Use existing**, **Keep separate**, **Compare
records**, or **Decide later** as allowed by the profile and identity policy.
Consequential ambiguity never auto-merges.

### Inspection capability is not processing progress

The former single “source depth” ladder is replaced by visible, independent
dimensions:

| Dimension | Required distinctions | UI rule |
| --- | --- | --- |
| Content extent | identity only; preview; partial content; full content | State the available extent and the missing material; do not imply that preview or partial content represents the whole source |
| Available representations | original; normalized text; structured content; supported media preview | Treat these as a capability set, not a maturity score; multiple representations may coexist or disagree |
| Location precision | none; structural location; verified exact text; source-native region; compound verified location | Call a location **exact** only when its selector and immutable Artifact resolve at the declared verification level |
| Local availability | local copy available; remote only; cached representation; offline; local copy deleted; unavailable | Distinguish the existence of a canonical source from access to its bytes now |
| Rights and operation | view, retain, process, index, send selected material remotely, quote, export, or redistribute as separately permitted or blocked | A broad Project or model capability never overrides copy-specific rights |
| Processing | not requested; queued; inspecting; running; needs input; partial; ready; failed; cancelled; blocked; superseded | Show processing as durable Work with stage detail on demand; never use it as a proxy for content extent or authority |

The scientific profile may render a preview capability as **Abstract only** and
apply its accepted restrictions on method, validity, and detailed-result
claims. Another profile may call the comparable source-provided preview a
summary, excerpt, or synopsis only when its contract defines that content. The
shared UI does not export scientific `abstract_only` terminology into every
Project.

A structured representation can exist without the complete original, and a
full original can exist before Petra has produced normalized text or verified
locations. The interface therefore summarizes **Available for inspection**
and lets the author open the exact capability and limitation facts instead of
displaying one ambiguous progress percentage or depth badge.

### Exact reader and provenance behavior

The reader keeps original source content primary. Its stable hierarchy is:

1. source descriptor, exact revision and Artifact/copy identity, Project role,
   historical or current state, and material rights or availability limits;
2. supported outline, page, section, path, line, table, figure, or other
   source-native navigation;
3. the original rendered content with the selected location highlighted;
4. the exact-location description and verification state;
5. normalized or structured text and a transformation diff when it materially
   differs from the original; and
6. downstream uses, provenance, processing details, and valid next actions in
   contextual Details rather than beside every line.

PDF and supported structured-text sources receive native Petra readers in the
initial reference UX. A PDF location may combine page geometry and verified
text. Structured text may use line, structural-path, pointer, quote, and hash
selectors. Tables, figures, formulas, and non-prose regions retain their
source-native context and limitations.

Unsupported formats do not receive a fabricated text view. Petra shows the
known identity, exact Artifact metadata and hash, rights, inspection
capabilities, downstream references, and **Open externally** or permitted
download action when available. If an exact location cannot be rendered, the
interface states whether the selector is structural, visual only, unresolved,
invalidated, or unavailable and offers the safest source-level context.

Normalized text never replaces the original silently. The comparison names
the normalization or parser run, highlights material additions, removals, and
substitutions, and states when the difference cannot be verified. Copying from
the original and copying normalized text are separately labeled. An isolated
quote is insufficient when surrounding context is available; opening from a
downstream object restores the exact selection and an adequate surrounding
region without losing the origin return path.

**View uses** answers which current and historical objects depend on the
source identity, revision, Artifact, or selected location. It separates direct
source basis, extraction, inference, author judgment, citation, validation,
composition, and historical provenance. A relationship graph appears only for
a named provenance or dependency question, stays bounded to that question,
has an ordered textual equivalent, and offers **Open in Graph**. Sources has no
default network visualization.

### Petra interaction, context, and privacy

**Ask Petra about this source** adds the source identity, exact revision,
Artifact, current snapshot, and visible capability and rights limits to the
thread context. **Ask Petra about this selection** additionally adds the exact
location and a visibly bounded surrounding context. Before sending, the
composer shows what is included, what is excluded, whether original or
normalized material is used, and whether processing is local or requires an
allowed external boundary.

Petra cannot infer permission from selection, broaden the source range, switch
to another Artifact or version, include an unselected source, or send source
material externally without an explicit permitted context change. If rights,
privacy, capability, or offline state blocks the requested operation, Petra
may answer from permitted metadata or Project state only when it states that
limitation; otherwise it abstains and offers a lawful recovery path. Any
proposed extraction, correction, source-link change, or version adoption enters
the same Work, Review, and command path as its direct equivalent.

### Project removal, local-copy deletion, and history

**Remove from Project** and **Delete local copy** are different operations.

- **Remove from Project** changes the Project source link and prevents ordinary
  new use under that link. Its preview names the source role, current
  dependents, affected actions, and any profile or retention rule that blocks
  removal. It does not delete canonical identity, immutable revisions,
  Artifacts, source locations, downstream provenance, decisions, or history.
  Re-adding the permitted source or using governed **Revert change** can restore
  the Project link when its prerequisites still hold.
- **Delete local copy** is a storage and retention operation over exact local
  bytes. Its confirmation names the Artifact, other Project or audit
  dependencies, representations that will stop resolving, retention rules,
  and whether the copy can be reacquired or must be supplied again. It retains
  permitted identity, hash, manifest/tombstone, rights history, selectors,
  provenance, and deletion receipt. It is blocked when protected shared use,
  audit, policy, or retention obligations require the bytes. It never implies
  that source history has been erased.

A source with authoritative current dependents cannot disappear from the
author's mental model through either action. The applicable preview requires a
retain, replace, qualify, remove-current-use, or cancel decision. Local-copy
deletion may be irreversible on the device; it is not called **Revert** or
**Undo**. Ordinary post-commit Project reversal continues to use the accepted
**Revert change** language and additive ChangeSet path.

### Required state and recovery matrix

| State family | Required states | Required behavior and recovery |
| --- | --- | --- |
| Intake | ready; checking; duplicate; possible match; ambiguous; rights review required; registration failed | Preserve submitted input, explain the unresolved fact, and offer use existing, compare, keep separate, revise input, retry, defer, or cancel as permitted |
| Project link | proposed; linked; role incomplete; in current use; removal blocked; removed; conflicted | Show Project role and dependents; preview any mutation; retain provenance and history |
| Identity and revision | provisional; resolved; disputed; current selection; newer version available; corrected; replaced; withdrawn or retracted where profile-defined; unknown | Keep every revision addressable; compare exact endpoints; never migrate dependents silently |
| Rights and privacy | permitted; private/local only; operation-limited; unknown; conflicting; restricted; authorization expired | Show the affected operation and copy; narrow context, choose another copy, provide lawful access, request review, or stop |
| Content extent | identity only; preview; partial; full | Name available and missing material and restrict downstream actions accordingly |
| Representation and locator | original; normalized; structured; exact verified; normalized match; visual only; unresolved; invalidated | Keep the original primary, expose transformations and verification, retry alignment, choose another parse, or inspect source-level context |
| Processing | not requested; queued; inspecting; running; awaiting input; partial; ready; failed; cancelled; blocked; superseded | Link to durable Work, preserve completed artifacts, name failed pages or stages, and offer resume, retry, alternate processing, inspect partial output, or stop |
| Reader | loading; ready; dense; unsupported native format; corrupt; external-only; offline cached; unavailable | Preserve last trustworthy reading position and selection; state omissions; retry, open externally, choose another copy, or return |
| Version impact | no downstream use; current dependents; historical dependents; affected by newer revision; stale derived object | List exact uses and snapshots; compare, retain, update through review, revalidate, or defer |
| Petra context | exact selection ready; metadata-only fallback; context too broad; external processing blocked; stale selection; unavailable | Show included context, narrow or refresh explicitly, use a permitted model boundary, answer with stated limits, or abstain |
| Destructive storage action | eligible; shared dependency; retention blocked; offline; deletion running; completed with receipt; failed | Require explicit confirmation, preserve audit identity, report exact result, and offer reacquire, re-supply, retry, or cancel where possible |

Cached metadata cannot make unavailable content look readable. Partial
processing cannot make an unverified location look exact. A changed source
cannot invalidate a downstream object silently. Error recovery preserves the
author's submitted reference, reader position, exact selection, origin, return
focus, and any unsent Petra text when safe.

### Responsive and accessibility contract

- Wide layouts keep the reader or collection primary and allow one expanded
  secondary surface, normally Details or Petra. User-set panel sizes remain
  respected within accessible minimum and maximum bounds.
- Narrow and high-zoom layouts use one semantic column. Source context,
  limitation, original content, exact location, and actions remain in that
  order; metadata does not consume the reading viewport permanently.
- Collection rows reflow without clipping descriptors or placing status text
  outside controls. Dense metadata uses disclosures, not smaller type.
- The reader supports heading, page, section, line, table, figure, and exact
  selection navigation as applicable. Keyboard users can move from a
  provenance link to the selected location, read surrounding context, open its
  uses, and return to the precise origin.
- Highlights expose programmatic labels, location descriptions, and an ordered
  text alternative. Color, geometry, hover, or animation is never the only
  indication of selection, difference, limitation, rights, processing, or
  version state.
- Text selection, copy actions, diff inspection, split-view resizing, and
  table navigation work without a fine pointer. Touch targets remain distinct
  from text selection.
- Processing updates and newly available versions announce concise changes
  without moving focus, scrolling the reader, or replacing the currently
  inspected revision.
- Reduced motion applies to highlights, loading transitions, and graph entry.
  Screen-reader landmarks distinguish source context, navigation, content,
  selection details, uses, and actions.

### Shared language

Shared nouns and labels are **Sources**, **Source**, **Source revision**,
**Project role**, **Available for inspection**, **Processing**, **Exact
location**, **Original**, **Normalized text**, **Uses**, and **Limitations**.
Shared actions are **Add source**, **Use existing source**, **Open source**,
**View exact location**, **Compare versions**, **View uses**, **Ask Petra about
this source**, **Ask Petra about this selection**, **Retry processing**, **Open
externally**, **Remove from Project**, and **Delete local copy**.

Profiles may use registered terms such as **Paper**, **Work version**,
**Abstract only**, **Source manuscript revision**, or a specific reference
class where those terms carry typed meaning. They may not rename shared
controls in a way that hides their consequence. The UI does not use
**extraction complete**, **fully understood**, **AI-ready**, **verified
source**, **safe to share**, or **current version** when only a parser,
capability, rights decision, or locally preferred revision is meant.

Limitations use concrete statements: **Only the preview is available; Petra
cannot inspect the missing sections**, **Pages 6–8 did not process**, **This
copy may be read locally but not sent to the selected model**, or **The exact
location no longer resolves against this Artifact**. A disabled action names
the missing permission, content, selector, dependency decision, or connection
and the valid next step.

### Authority, data, and backend needs

D003 and D004 already establish the scientific `Work`/`WorkVersion` identity
chain, immutable Artifacts and manifests, copy-specific `RightsDecision`,
immutable parsed documents, processing artifacts, and exact `SourceSpan`
selectors. DB08 preserves those contracts and requires profile-neutral
composition around them rather than a replacement.

`UX-REQ-009` records the missing snapshot-consistent `ProjectSourceView` and
exact-inspection read boundary. It must compose the profile-resolved canonical
identity and source revision, Project role and relevance, Artifact copies,
rights, integrity, availability, inspection capabilities, processing,
locations, version impact, and downstream uses without asking the browser to
derive semantic or policy state.

`UX-REQ-010` records the missing Project-source association and governed
removal/local-copy lifecycle. It must separate Project membership from
content-addressed storage, preview dependencies and retention constraints,
retain historical provenance and tombstones or receipts, and expose typed,
idempotent results. Existing Artifact, manifest, rights, parse, span, proposal,
Work, review, event, and history authority remains unchanged.

The client may own collection query text, sort and filter presentation,
expanded rows, reading position, selection display, split-pane sizes, and
unsent Petra text. It cannot infer canonical identity, Project membership,
rights, inspection capability, processing completion, exactness, downstream
impact, version adoption, removal eligibility, or storage-deletion safety.

### Nielsen and dangerous-misunderstanding audit

| Heuristic | DB08 resolution |
| --- | --- |
| Visibility of system status | Identity, revision, Project role, capability, rights, availability, processing, selector verification, and version impact remain distinct and visible |
| Match with the real world | Source, revision, copy, passage, Project use, and local copy replace ingestion and database jargon in ordinary tasks |
| User control and freedom | Compare, defer, retry, choose another copy, return, remove from Project, and explicitly delete a local copy have bounded consequences |
| Consistency and standards | Sources, Details, Petra, Review, Graph, Work, Composition, History, and Revert use the accepted place and command grammar |
| Error prevention | Duplicate, ambiguity, rights, exactness, dependencies, retention, version impact, and destructive consequences appear before action |
| Recognition rather than recall | The source header, current selection, available representations, limitations, uses, and return origin remain visible |
| Flexibility and efficiency | Reuse, filters, exact deep links, direct actions, Petra mediation, and keyboard navigation support both scanning and close reading |
| Aesthetic and minimalist design | Descriptive rows, one primary reader, contextual detail, and no default graph or pipeline dashboard keep the task calm |
| Error recovery | Submitted input, immutable artifacts, completed processing, reader position, selection, provenance, and explicit receipts survive failure where permitted |
| Help and documentation | Rights, processing, normalization, selector verification, profile roles, and destructive-action consequences are explained in context |

The design fails acceptance if an author could reasonably believe that a
source is unique because it appears once in a Project, a later revision
rewrote an earlier one, processed means approved, full content means exact
locations exist, a preview represents a complete source, selection permits
external transmission, normalized text is the original, **Remove from
Project** deletes provenance, or **Delete local copy** deletes history.

### Acceptance criteria and post-freeze conformance evidence

`DB08` is accepted at specification depth when:

1. one shared Sources architecture supports radically different registered
   profile source types without reducing them to aliases;
2. canonical identity, immutable revision, exact Artifact, Project link,
   exact location, and downstream use remain distinguishable;
3. content extent, representation, location precision, local availability,
   rights, and processing cannot be collapsed into one depth or quality state;
4. an author can open every displayed exact location in honest surrounding
   context or receive a precise no-path explanation;
5. original and normalized content, parser transformations, and selector
   verification remain inspectable;
6. reuse avoids Project-local duplication while preserving access, rights,
   role, and provenance boundaries;
7. a new, corrected, replaced, withdrawn, or profile-specific superseding
   revision identifies affected downstream objects without silently migrating
   them;
8. direct and Petra-mediated inspection use the same identity, Artifact,
   exact location, rights, context, and return path;
9. unsupported, offline, partial, failed, ambiguous, unavailable, and
   rights-limited states preserve honest recovery choices;
10. **Remove from Project** and **Delete local copy** have distinct previews,
    authority effects, retention behavior, receipts, and recovery language;
11. dense, narrow, zoomed, keyboard, screen-reader, touch, resized-panel, and
    non-color presentations preserve exact inspection and every material
    action; and
12. no source list, badge, processing indicator, or Petra statement implies
    truth, quality, completeness, authority, or sharing permission it does not
    establish.

After design freeze, `UX-FX21` must pair invented scientific and
controlled-writing source collections and readers against the same shared
mechanics while using different typed identities, revisions, Project roles,
limitations, exact locations, and downstream uses. `UX-FX22` must cover reuse,
duplicate and ambiguous identity, identity-only and preview content, partial
and failed processing, exact and unresolved locations, normalized differences,
a newer source revision with affected dependents, offline and unavailable
content, Project removal, an eligible local-copy deletion with receipt, and a
retention-blocked deletion. Neither scenario may use contextual demo material.

## `DB09` — basis, candidates, and review

`DB09` defines how natural author interaction becomes inspectable working
structure and how an accountable Project decision crosses into authoritative
state. Review is a calm decision workspace, not an evidence inbox, a model
transcript, a graph-editing form, or a queue of every object the system has
noticed.

### Product role and completion condition

The Project author needs to understand five things at a commitment boundary:

1. what exact candidate, finding, or prior change is under review;
2. who or what produced it and through which task, interaction, or Work;
3. which exact basis supports, constrains, qualifies, or conflicts with it;
4. what authoritative and dependent state would change; and
5. which decisions are available to the responsible author.

Review begins when an accountable decision is required, not whenever
information is generated. It is complete when the exact candidate and basis
have a durable outcome; any authoritative change has passed through the
applicable validation, approval, command, event, and projection boundaries;
the author understands a partial, stale, blocked, or failed outcome; and the
originating task has an exact return path.

The application Petra is not the producer, proposer, believer, or decision
maker. A candidate may originate with an author, a named model role, a Work
run, an extraction or import, or another registered producer. A validator may
produce a finding. The interface attributes each record to its actual origin
and never assigns authorship or judgment to the product shell.

### Shared semantic and authority model

| Concept | Required meaning | Must not imply |
| --- | --- | --- |
| Working graph | Durable, task-linked, non-authoritative structured interpretation derived from conversation, Work, and direct author changes | Trusted or accepted Project state merely because an object or edge is visible |
| Candidate | One exact version of profile-valid content or structure produced by an identified origin | A request for authority, an accepted truth, or a product-authored opinion |
| Proposal | The technical record that asks to make one candidate or exact group eligible for governed change | That Petra itself proposed the content or that approval already exists |
| Validation finding | A versioned evaluation of an exact candidate against an applicable rule or constraint | Truth, authorship, approval, or an independent change request |
| Basis | Exact material used to support, qualify, conflict with, or constrain the candidate | A generic citation list, provenance, completeness, or endorsement |
| Provenance | How, when, and by whom the candidate, basis link, validation, or change was produced | Evidentiary support merely because processing occurred |
| Review session | A durable, task-sized decision context bound to exact candidates, findings, origins, and a Project snapshot | One large transaction or a second conversation thread |
| Changes to apply | The human-facing preview of one exact `ChangeSet` or a disclosed set of independently atomic ChangeSets | Authority before application or hidden operations outside the preview |
| Decision | An authenticated, capability-checked disposition of the exact review revision | Permission inferred from selection, conversational assent, Work completion, or model confidence |
| Projection | A derived representation of committed events at a named position | The source of command authority or proof that a command failed |

The profile owns domain object types, predicates, validators, constraints, and
user-facing object names. The shared kernel owns candidate identity and
revision, basis and provenance roles, review and decision identity, ChangeSet
and command boundaries, additive events, projection status, and recovery.

### Natural conversation and the working graph

Natural conversation is the primary capture and correction interface. The
active model translates bounded conversational steps into typed candidates,
relationships, basis links, provenance, uncertainty, and validation inputs.
The author does not have to populate graph fields, choose predicates, classify
every object, or confirm each inferred structure.

```text
Natural conversation or bounded Work
  -> identified model or worker output
  -> profile-valid working candidates and relationships
  -> exact basis, provenance, uncertainty, and validation links
  -> durable non-authoritative working graph
  -> optional graph or textual inspection
  -> accountable review only when authority would change
```

Conversational correction creates a new candidate revision and preserves the
prior lineage. For example, changing the scope, dependency, relationship,
source stance, constraint, or basis revises the working structure and reruns
applicable validation. The model may ask for clarification only when ambiguity
materially changes the interpretation, blocks useful work, or reaches an
authority boundary.

The working graph survives closing, detaching, and reconnecting to its Project
task, subject to the accepted thread, privacy, retention, and profile
contracts. It remains distinct from the authoritative graph. A model, browser
component, graph renderer, or conversation transcript cannot promote its
contents by projection or visibility.

During ordinary work, this semantic machinery is quiet. Graph controls may
expose working, authoritative, and historical layers; exact basis and
provenance; validation state; uncertainty; exclusions; and affected paths when
the author chooses to inspect them. A textual peer view exposes the same facts.
At an authority boundary, the concise material change and consequence remain
visible even if the author never opens graph inspection.

### Relationship and operation exposure

The specification maps relationships and operations before mapping them to
components:

```text
Conversation or Work
  -> produces Candidate
Candidate
  -> grounded in or constrained by Basis
  -> evaluated by Validation finding
  -> grouped into Review session
Eligible reviewed candidate
  -> compiled as ChangeSet
ChangeSet
  -> authorized by Decision
  -> emits Domain events
Domain events
  -> projected into authoritative graph and peer views
Later Revert
  -> compensates the original ChangeSet without deleting it
```

| Exposure class | Operations | Presentation rule |
| --- | --- | --- |
| Automatic | Structure bounded conversation, bind candidate origin, link basis, run mechanical validation, update working graph | Do not interrupt or require graph controls; retain inspectable records |
| Inspect-only | Exact revisions, hashes, graph edges, model or tool provenance, validator details, omissions, projection position | Reveal through graph controls, Details, or a textual report; do not make routine task furniture |
| Contextual | Inspect basis, compare, refresh, edit candidate, change basis, separate changes, open affected dependencies | Offer only when the current object and state make the operation meaningful |
| Explicit commitment | Apply, reject, decide later, and Revert | Use a structured Review checkpoint bound to exact records; never infer from ordinary conversation |
| Prohibited | Implicit approval, graph-selection authority, silent partial application, history overwrite, validator self-promotion | Fail closed and explain the safe recovery path |

Every post-freeze interaction specification records the producer or actor,
source and target objects, preconditions, authority level, trigger, result,
failure and recovery, reversibility, visibility, accessible alternative, and
runtime contract or `UX-REQ` disposition. An internal operation does not earn a
button merely because it exists.

### Basis and provenance

Basis is the exact material used to warrant or constrain the item under review.
Depending on the active profile, it may include source locations, accepted
graph objects and relationships, governing requirements, prior revisions,
dependencies, results, or applicable policies and constraints. The profile may
label these accurately as **Evidence**, **Constraints**, **Prior revision**, or
**Dependencies** while preserving the shared basis role.

Basis and provenance remain separate:

- basis answers why the candidate may be warranted or limited;
- provenance answers how, when, and by whom it was produced.

The default decision view shows the principal basis, material counter-basis or
limitation, origin, and affected scope. Exact inspection adds object and source
revisions, resolvable source locations, lineage, included and excluded context,
validator details, and technical identifiers. Missing, inaccessible, partial,
preview-only, conflicting, or indirect basis is stated rather than smoothed
into a confident summary.

Changing material basis creates a new candidate or proposal revision,
invalidates any prior approval or Changes-to-apply preview, and reruns affected
validation. A source does not support a candidate merely because it was
processed, retrieved, or linked.

### Review boundary and session architecture

The following do not enter Review merely because they exist:

- a read-only answer;
- an exploratory graph state;
- a Work result retained as an artifact;
- a validation finding that requires no accountable disposition;
- a working candidate not yet intended to change governed state; or
- selection, navigation, expansion, filtering, or layout state.

Review is required when the next step would promote working material, revise or
remove authoritative state, accept a governed relationship, resolve a material
conflict through a state change, promote an exact output revision, or Revert an
applied change. A material finding may enter Review when it requires a durable
decision, but the finding remains an evaluation rather than becoming a
candidate mutation by itself.

Petra has one canonical Review place. Each Review session is bound to one task,
objective, responsible decision-maker, Project snapshot, exact candidates and
findings, origin, and return context. It may appear as a compact structured
checkpoint beside a simple task, a focus workspace for comparison or
correction, or the main Review route for several candidates, conflicts, and
history. These are synchronized presentations of the same records, not separate
approval systems.

The main Review route uses three quiet groups: **Needs your decision**,
**Waiting**, and **Completed**. Counts represent decisions rather than every
candidate, graph object, or validator result. Review sessions keep ordinary
members inside their task context instead of flooding a global queue. Leaving a
presentation preserves the session, candidate revision, comparison, focus,
composer draft, selection, and exact return origin.

### Comparison grammar and information hierarchy

Every profile uses the same semantic comparison positions without forcing its
objects into a generic card, graph shape, or text diff:

1. **Current** — the authoritative state, if one exists;
2. **Candidate** — the exact version under review;
3. **Origin** — the author, named model role, Work, extraction, or import that
   produced it;
4. **Basis** — supporting, qualifying, conflicting, missing, and constraining
   material;
5. **Difference** — the material meaning, structure, scope, or status change;
6. **Consequences** — affected authority, dependencies, outputs, rights, and
   projections; and
7. **Decision** — the exact available dispositions and their effects.

A new object renders **No accepted version** for Current. A correction compares
the accepted and candidate revisions. A reversal compares **Current accepted
state** with **State after reversal**. Scientific profiles may compare Claims,
relationships, scopes, and source locations; controlled-writing profiles may
compare passages, constraints, accepted revisions, and dependent sections.
Their renderers differ while their identity, authority, and control grammar
does not.

The default view shows material differences, limitations, exceptions, and the
smallest basis adequate for the decision. Unchanged context, complete member
lists, graph structure, provenance chains, and technical identifiers remain
available without dominating the task.

### Validation and exception-led review

Validation runs against exact candidate, profile, basis, rule, and snapshot
revisions. Its results have three presentation outcomes:

| Outcome | Meaning | User interruption |
| --- | --- | --- |
| Resolved automatically | A mechanical structure, normalization, reference, or schema issue was corrected without changing substantive meaning | No interruption; correction remains inspectable |
| Needs judgment | Ambiguity, conflicting interpretation, uncertain identity, limited basis, disputed relationship, or another question requires author responsibility | Lead the Review session with the decision and relevant basis |
| Blocks commitment | Invalid reference, missing authority, stale revision, rights restriction, failed invariant, or unsafe ChangeSet prevents application | Disable commitment, explain the exact block, and offer a bounded recovery |

The model may repair structure but not meaning or authority. It cannot silently
change source stance, choose among materially different interpretations,
resolve a substantive conflict, broaden scope, or assign authority.

Exception-led review begins with a truthful summary such as **2 decisions need
your attention; 10 other candidates passed the applicable checks**. It opens on
the first unresolved exception. Ordinary members may be collapsed, but their
count, identity, applicable checks, and full inspection path remain available.
“Passed” means only that the applicable validations succeeded; it does not mean
true, correct, complete, approved, or supported beyond the stated basis.

### Model interaction during Review

The active task model remains available for natural explanation and correction.
The author may ask why a relationship was inferred, request the exact source,
change scope or basis, exclude a constraint, separate changes, inspect
dependencies, or compare with the accepted version. The model responds against
the exact Review snapshot rather than silently substituting current state.

Every response distinguishes:

- **Explanation only** — no working or authoritative state changed;
- **Working candidate updated** — a new non-authoritative revision exists;
- **Changes to apply updated** — the exact commitment preview was rebuilt; or
- **Unable to proceed** — named clarification, capability, basis, or recovery
  is required.

Review continues the same durable task thread. It does not create a generic
second chat. Direct and model-mediated corrections resolve to the same
candidate identities, revision lineage, validation, Review session, and
command path.

Conversational phrases such as “yes,” “looks good,” or “continue” never apply a
change by themselves. Conversation may prepare an intended disposition, but
authorization occurs only through the active structured Review checkpoint with
the exact material consequence visible.

### Changes to apply and decision actions

A Review session may begin before any `ChangeSet` exists. When candidates are
commitment-ready, the command layer compiles the exact Changes-to-apply preview
from the current authoritative snapshot. The preview identifies every create,
revise, supersede, retract, relink, dependency effect, unchanged protected
object, validation result, capability requirement, and expected projection
consequence that is material to the author.

The ordinary user language is:

| Control | Exact behavior |
| --- | --- |
| **Apply _n_ changes** | Approve and apply the one exact displayed ChangeSet; the supporting record retains the distinct submit, approval, and apply facts |
| **Apply _n_ reviewed changes** | Submit the disclosed set of independently atomic ChangeSets with member-level outcomes |
| **Reject candidate** | Record rejection of the exact candidate or proposed change; retain its content, origin, basis, and decision; apply nothing |
| **Decide later** | Keep the session pending with an optional reason or revisit time; confer no approval and revalidate when reopened |
| **Edit candidate** | Return to natural correction or an accessible direct editor and create a new candidate revision |
| **Change basis** | Revise exact basis relationships, create a new candidate or proposal revision where material, and rerun validation |
| **Separate changes** | Create independently reviewable candidates or ChangeSets; never silently split a semantic unit |
| **Prepare reversal** | Build an exact compensation preview for an eligible applied change |
| **Revert change** | Approve and apply the exact compensating ChangeSet while retaining the original decision and events |

The interface does not require separate ordinary **Approve** and **Apply**
gestures when one direct, explicit application action can record both facts for
the exact ChangeSet. A policy may require an additional responsible person or
approval stage, but the interface names that requirement and does not add an
unexplained duplicate confirmation.

### ChangeSet and Review-session atomicity

A `ChangeSet` is the smallest semantic unit whose operations must apply and
reverse together. It never partially applies. A Review session or accepted
`ReviewBatch` may group several independently atomic ChangeSets and is not one
large database transaction.

Before a multi-ChangeSet action, known stale, blocked, ineligible, or conflicted
members are identified and require refresh, resolution, exclusion, or explicit
separation. The preview states whether the visible changes form one atomic
ChangeSet or several independent ChangeSets. A group selection is never itself
approval.

An independent member may still fail after submission while other members
apply. That is a partial Review-session outcome, not a partially applied
ChangeSet. The interface preserves every successful result, identifies the
exact failed and unapplied members, states that the session is only partly
complete, and offers member-specific retry, refresh, correction, separation,
or deferment. It never reports the entire group as applied.

### Stale state, conflict, application, and projection

A Review revision is bound to exact Project, profile, candidate, basis,
validator, policy, dependency, and authoritative snapshot revisions. If a
material input changes while Review is open:

- commitment becomes unavailable;
- the old comparison remains inspectable as historical state;
- the interface states what changed in profile-accurate language;
- **Refresh review** creates a new Review and Changes-to-apply revision; and
- the earlier revision remains superseded rather than overwritten.

Conflict reasons distinguish changed basis, changed candidate, changed target,
authority or rights changes, dependency changes, another applied ChangeSet, and
validator or governing-constraint changes.

After authoritative application, the decision is recorded once. If graph or
another projection is behind, the state reads **Applied—updating views** and
the author may return to the originating task without waiting. The same action
cannot be submitted again. A projection failure is a synchronization problem,
not a failed decision, and views that require a falsely current projection fail
closed.

If application itself fails, nothing is presented as applied for that
ChangeSet. Retry is available only when the exact command is idempotent and
still valid; otherwise Review must refresh against current state.

### Working recovery, navigation history, and Revert

Three recovery mechanisms remain linguistically and operationally distinct:

| Mechanism | Scope | Authority effect |
| --- | --- | --- |
| **Back/Forward in graph** | Up to 10 recent exploration states including task scope, depth, expansion, filters, layout, viewport, time position, and selection | None; presentation only |
| **Restore working revision** | A prior non-authoritative candidate or composition revision | Creates or selects working lineage; does not change accepted state |
| **Revert change** | An eligible applied authoritative change | Appends a validated compensating ChangeSet, decision, commands, and events |

A reversal Review shows the current accepted state, expected state after
reversal, original decision being compensated, affected dependencies and
outputs, irreversible consequences, and projection effects. Ineligible or
unsafe reversal explains why and offers a bounded split, refresh, corrective
forward change, or full-history path.

**Recent changes** is a convenience window over the 10 most recent eligible
author-visible Project changes, not an event-retention rule. Full authoritative
history remains durable. Multi-change compensation must preserve the accepted
independently atomic ChangeSet boundaries.

### Required state and recovery matrix

| State | What the author sees | Required path |
| --- | --- | --- |
| No accountable decision | No artificial Review task; recent completed decisions may remain inspectable | Return to the originating task |
| Working | Origin and quiet indication that non-authoritative structure is being updated | Continue naturally or inspect working graph |
| Preparing | Candidates or validation are incomplete; authority has not changed | Continue, wait, detach, stop the response, or cancel applicable Work |
| Needs decision | Exact candidate, origin, principal basis, material difference, consequence, and available decisions | Explain, correct, inspect, defer, reject, or prepare Changes to apply |
| Needs judgment | One or more material exceptions lead; ordinary members remain countable and inspectable | Resolve conversationally or through accessible direct controls |
| Blocked | Exact failed prerequisite and responsible boundary | Supply permitted input, narrow, refresh, request capability, correct, defer, or stop |
| Deferred | No approval; original snapshot and optional rationale retained | Reopen and revalidate before commitment |
| Stale or conflicted | Historical preview retained; changed inputs and unsafe action identified | Refresh, compare, separate, correct, or defer |
| Applying | Exact command is in flight; repeat submission unavailable | Wait, detach where safe, or inspect command status |
| Partly completed session | Per-ChangeSet applied, rejected, failed, and unapplied outcomes | Retry valid members, refresh stale members, correct, separate, or defer |
| Applied—updating views | Authority committed; named projections are behind | Return, inspect authoritative text, wait, or retry projection |
| Applied and current | Decision, resulting revisions, projection position, and return origin | Continue task, inspect History, or prepare eligible Revert |
| Rejected | Exact candidate and rejection retained; no application | Return, create a new candidate, or inspect history |
| Superseded | Newer candidate or Review revision identified | Open current revision or retain historical comparison |
| Failed | Authority effect stated precisely; submitted input and safe records retained | Retry exact idempotent command, refresh, or use named no-path recovery |
| Offline or unauthorized | Available cached facts, age, missing capability, and unsafe actions identified | Continue read-only where valid, reconnect, request/narrow capability, or defer |

### Profile adaptation

The shared interface uses profile-owned object and relationship names rather
than exposing **Candidate** everywhere. A scientific Project may name a Claim,
EvidenceRelation, scope interpretation, or source extraction. A
controlled-writing Project may name a passage revision, constraint,
dependency, or continuity finding. The shared control meanings and authority
path do not change.

Profile renderers fill the Current, Candidate, Origin, Basis, Difference,
Consequences, and Decision roles. A profile cannot relabel an unsupported
generic record into domain validity, allow its validator to approve its own
output, inject client code, create a parallel Review lifecycle, or redefine
Apply, Reject, Decide later, Revert, authority, provenance, and history.

### Responsive and accessibility contract

Review has one logical reading order independent of its visual columns:
identity and status, candidate, origin, basis, difference, validation,
consequences, and decisions. A wide presentation may compare Current and
Candidate side by side while keeping basis or graph inspection contextual. A
narrow or zoomed presentation stacks the same sequence and keeps the material
consequence before its commitment action.

Every Review path provides:

- complete textual parity for graph objects, relationships, basis, differences,
  and consequences;
- keyboard access to members, exceptions, inspection, correction, decisions,
  and return;
- stable headings, names, counts, and table or list semantics for assistive
  technology;
- explicit focus entry, focus preservation during refresh, and focus return
  after correction, decision, or navigation;
- live status announcements that do not steal focus or repeat streamed detail;
- no meaning carried only by color, shape, geometry, position, hover, drag, or
  animation;
- non-drag alternatives for relink, separation, ordering, and dependency
  inspection;
- target sizes, panel resizing, text scaling, forced-colors behavior, and
  reduced motion consistent with the shared design system; and
- no preselected approval, hidden primary consequence, countdown pressure, or
  optimistic success before authority commits.

The graph is never required to complete Review. Graph inspection is an
optional, synchronized explanation of the same records.

### Language contract

User-facing language names the real object and origin. Prefer **Produced by
Source-processing work**, **Generated by the active model role**, **Edited by
you**, **Changes to apply**, **Needs your decision**, **Change basis**,
**Separate changes**, **Decide later**, and **Applied—updating views**.

Do not write **Petra proposes**, **Petra believes**, **Petra decided**, **Petra
knows**, or **Petra's judgment**. Petra is the product and control environment,
not the content origin or authority actor. A conversational model may explain
its own bounded output, but the interface retains the named model role, Work,
interaction, basis, and authority state behind that language.

**Proposal**, `ChangeSet`, revision hashes, schema names, command envelopes,
and projection checkpoints are inspectable technical terms. They do not replace
profile-accurate object names or consequence-led controls in the ordinary
interface.

### Authority, data, and backend needs

Current M1.5 contracts already provide scientific evidence candidates and
admission, a source-grounded evidence ReviewBatch view, exact ChangeSets and
Approvals, direct accept and reject command plans, human correction lineage,
independently atomic batch execution, compensating reversal, and projection
events. The durable AG-UI review interrupt binds accept or reject to exact
InteractionRun, interrupt, and ChangeSet revisions and does not let the client
assert actor, capability, Approval, command, or graph authority. DB09 does not
add fields to that protocol response.

Current M1.6 ContextPacket, EvidencePacket, model-call, and validation records
can identify the exact bounded basis used by a model role. They do not by
themselves define a durable, profile-neutral conversation-derived working graph
or the complete Project Review read and command surface.

The remaining implementation needs are:

- `UX-REQ-004` for registered profile-owned objects, predicates, validators,
  and language;
- `UX-REQ-006` for durable Project task threads and exact per-turn context;
- `UX-REQ-007` for the recent-ten change view and complete governed reversal
  planning;
- `UX-REQ-008` for stable origin and return destinations;
- `UX-REQ-011` for durable, profile-valid, non-authoritative working candidates
  and relationship overlays derived from bounded interactions; and
- `UX-REQ-012` for a snapshot-consistent, profile-neutral Review-session read
  model and the missing correction, basis-change, separation, deferment, and
  member-outcome command composition.

These requests must reuse existing candidate, Artifact, Work, InteractionRun,
ChangeSet, Approval, event, projection, and idempotency contracts wherever they
already supply the required meaning. A browser view model cannot calculate
authority, promotion eligibility, basis sufficiency, validator force,
ChangeSet consequences, conflict, or reversal eligibility.

### Nielsen and dangerous-misunderstanding audit

| Heuristic | DB09 resolution |
| --- | --- |
| Visibility of system status | Working, authoritative, validation, decision, application, and projection states remain distinct |
| Match with the real world | Profile object names, producer attribution, basis, differences, consequences, and direct decision verbs replace graph and protocol jargon |
| User control and freedom | Natural correction, inspection, deferment, rejection, separation, refresh, return, working restoration, and governed Revert have bounded meanings |
| Consistency and standards | Every entry uses one Review identity, comparison grammar, decision path, and additive history model |
| Error prevention | Exact snapshot, basis limits, validation, atomic boundary, dependencies, and authority consequences precede commitment |
| Recognition rather than recall | Origin, current state, candidate, principal basis, exception count, and return context remain present |
| Flexibility and efficiency | Conversation handles ordinary structuring and correction; exception-led sessions, direct controls, and keyboard paths support deliberate review |
| Aesthetic and minimalist design | One decision leads, ordinary members collapse without disappearing, and technical graph structure remains optional |
| Error recovery | Stale previews, member failures, projection lag, rejected and superseded revisions, and Revert preserve exact records and bounded recovery |
| Help and documentation | Basis, validation force, atomicity, authority, projection, deferment, and reversal consequences are explained in context |

The design fails acceptance if an author could reasonably believe that visible
working graph content is accepted, Petra authored or endorsed a candidate, a
validator established truth, processing established support, a batch is one
transaction when it contains independent ChangeSets, ordinary conversation
approved a change, Work completion applied a result, selection granted
authority, rejection deleted a candidate, deferment approved it, correction
overwrote lineage, Revert erased history, projection lag meant the decision
failed, or a partly completed session wholly succeeded.

### Acceptance criteria and post-freeze conformance evidence

`DB09` is accepted at specification depth when:

1. natural conversation and Work may create durable profile-valid working
   candidates and relationships without requiring graph entry or changing
   authoritative state;
2. every candidate, basis link, finding, review, and decision names its actual
   producer or actor rather than attributing authorship to Petra;
3. basis and provenance remain distinct, exact, revision-bound, limitation-aware,
   and inspectable in graph and textual forms;
4. Review begins at an accountable decision rather than every generated object
   or result;
5. one Review identity supports contextual, focus, and main-route
   presentations with exact origin and return;
6. Current, Candidate, Origin, Basis, Difference, Consequences, and Decision
   roles support radically different profile objects without semantic aliases;
7. validation distinguishes automatic structural repair, author judgment, and
   commitment-blocking failure without implying truth or authority;
8. exceptions lead without hiding ordinary members, applicable checks, counts,
   or full inspection;
9. conversational correction creates new working revisions while structured
   commitment remains explicit and cannot be inferred from chat;
10. the human Changes-to-apply preview matches the exact ChangeSet operations,
    snapshot, dependencies, validation, and atomic boundary;
11. Apply, Reject candidate, Decide later, Edit candidate, Change basis,
    Separate changes, Prepare reversal, and Revert change retain their distinct
    authority and history effects;
12. one ChangeSet is atomic while a multi-ChangeSet Review session exposes
    independent member outcomes and never hides partial completion;
13. stale, conflicted, blocked, failed, deferred, superseded, projection-pending,
    and partly completed states preserve exact recovery;
14. graph navigation, working-revision restoration, and authoritative Revert
    cannot be confused; and
15. narrow, zoomed, keyboard, screen-reader, touch, resized-panel, reduced-motion,
    forced-colors, non-graph, and non-color paths preserve the complete decision.

After design freeze, `UX-FX23` must pair two independently invented Project
profiles in natural task conversations. Each creates and revises a durable
working graph, attributes author, model-role, and Work origins correctly,
supports optional graph and textual inspection, exposes ordinary and exception
members, corrects meaning and basis conversationally, prepares exact Changes to
apply, applies one atomic ChangeSet, produces one partial multi-ChangeSet
session outcome, refreshes a stale Review, reports projection lag, and Reverts
an eligible change. It must not copy or structurally derive from either future
contextual demo.

## `DB10` — graph and relationship work

**Status:** in progress. Entry and state-layer direction is accepted; semantic
depth and the remaining module specification are still under discussion.

### Accepted entry and layer direction

The Graph is an optional relationship workspace for a named task. It never opens
as an unrestricted Project or corpus network. A contextual entry preserves the
originating task, object, snapshot, selection, and return path, and opens the
smallest relationship view needed by that context. Direct Graph entry begins from
a recent or saved relationship question, a selected object, or a natural-language
question. A named model role may translate the natural-language question into a
bounded object, predicate, depth, snapshot, temporal, and layout request; Petra
presents and governs that interpretation but does not author its domain meaning.
The interpreted scope remains inspectable and correctable without requiring the
author to maintain graph records.

The Graph distinguishes three semantic layers:

| Layer | Meaning | Default and interaction rule |
| --- | --- | --- |
| **Current** | The graph projection of current authoritative Project state | Default for direct Graph entry; selection and view manipulation do not change authority |
| **Working changes** | Durable, profile-valid, non-authoritative candidate objects and relationships from bounded conversation or Work | Relevant working structure may appear with contextual entry; when hidden, its count and reason remain available; any authority change routes through Review |
| **Historical** | An explicitly selected prior state or temporal comparison position | Clearly headed as historical, disables current-state mutation, and provides **Return to current** |

Projection is not a fourth semantic layer. It is the freshness of a derived graph
representation relative to authoritative Project state. When projection lags, the
view states that the authoritative change already applied, identifies the relevant
snapshot or revision, and provides an authoritative non-graph route while the
projection catches up. Before/after state uses a dedicated comparison presentation
rather than overlapping translucent graphs. The textual peer exposes the same
layers, freshness, scope, omissions, selections, and return behavior.

Layout, position, selection, pinning, dragging, expansion, collapse, grouping,
filtering, and renderer state are presentation only. They cannot accept a working
relationship, mutate a Project object, or imply that a graph projection is the
source of authority. `UX-REQ-011` remains a proposed backend need for the generic
durable conversational working graph and is not made real by this paper design.

### Pending semantic-depth decision

The current recommendation defines depth as the amount of relationship context
needed to answer the active question rather than primarily as a hop count. Petra
would derive the smallest useful focus, predicates, snapshot, temporal position,
and boundary; lead with meaningful expansion actions such as **Show contrary
evidence**, **Trace sources**, and **Show downstream effects**; disclose hidden
counts and summarized groups; and place exact relationship types and hop limits in
optional inspectable controls. Selection would open Details, all view manipulation
would remain non-authoritative, and the textual peer would expose identical paths,
scope, omissions, and expansion actions.

This recommendation is not accepted. Resume DB10 by confirming or revising it,
then specify selection and path inspection, task layouts and comparison, density
and grouping, correction boundaries, temporal behavior, adverse states,
responsive and accessible parity, language, backend needs, acceptance criteria,
and post-freeze conformance evidence before advancing to DB11.

## `UX-DESIGN-FREEZE-01`

The product design may freeze only when:

- all `DB01`–`DB18` sections are accepted or carry an explicit, non-blocking deferral;
- every surface and material interaction has a blueprint and state contract;
- Petra's AI interaction system is fully specified rather than represented by a placeholder panel;
- the complete flow catalogue maps to surfaces, commands, authority, recovery, and accessibility;
- shared mechanics and profile-owned semantics are distinguishable in every module;
- all material backend gaps have recorded `UX-REQ` items and safe fixture boundaries;
- the product can be implemented without inspecting either demo corpus;
- no demo name, path, content, or workflow convention appears in a product acceptance criterion;
- the user explicitly accepts the complete brief as the baseline for implementation.

Freezing the brief does not make it immutable. Later evidence can reopen a
decision through its recorded revisit trigger. It prevents a demo from changing
the product silently.

## Phase 2 — neutral Petra reference UX

After the design freeze, the design worktree implements the entire accepted UX
against synthetic conformance scenarios created from the product contracts.
These scenarios may represent different Project profiles, but their content is
invented for conformance and is not copied, summarized, or structurally derived
from the future demos.

The reference UX must:

- start and operate without access to the external demo directories;
- include empty, ordinary, dense, limited, running, stale, interrupted, failed,
  completed, and recovery states;
- prove that profile adaptation changes typed domain meaning and terminology
  while retaining the same authorial controls;
- exercise direct and Petra-mediated paths through the same commands;
- include visual, interaction, accessibility, language, heuristic, and recovery
  evidence;
- remain a complete product when every Phase 3 adapter and dataset is absent.

Synthetic fixtures are test infrastructure, not demos. They exist to prove the
product specification and are never presented as processed real-world evidence.

## Phase 3 — contextual integrations and demos

Only after the product baseline stands independently may separate efforts:

- map the Prosody project into the accepted scientific profile;
- map the Sentinel revision project into the accepted controlled-writing profile;
- configure profile-specific objects, relationships, validators, prompts,
  imports, and outputs through registered contracts;
- evaluate the frozen UX on the real tasks;
- report missing or broken general capabilities as new findings rather than
  patching demo behavior into shared components.

Demo adapters, fixtures, routes, scripts, and documentation remain visibly
separate from production UX and neutral conformance assets. Removing them must
not change Petra's product navigation, shared components, terminology registry,
or default behavior.

## Design sequence from this point

The next work remains specification, not demo production:

1. carry accepted `DB04`–`DB09` through their recorded backend dispositions without implementing a product surface;
2. design `DB10`, graph and relationship work, as the next discussion-first section;
3. design `DB11`–`DB13` module by module through the discussion-first loop;
4. close the design system, language, accessibility, failure, and recovery specifications in `DB14`–`DB17`;
5. assemble the complete screen, state, flow, and backend blueprint in `DB18`;
6. review and explicitly record `UX-DESIGN-FREEZE-01`;
7. begin the neutral reference-UX implementation;
8. begin contextual demo integrations only after the reference UX stands independently.
