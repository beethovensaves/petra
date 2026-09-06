# Petra UX design brief

Status: in progress; product design must freeze before reference-UX implementation or contextual demos
Date: 2026-09-06
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
| `DB10` | Graph and relationship work | Task entry, query scope, layouts, depth, selection, temporal state, impact, textual parity, and optional 3D boundary | specified; direction accepted; paper audit complete |
| `DB11` | Durable Work and orchestration | Plans, agents and validators, progress, input, steering, cost, detachment, reconnect, cancellation, result, and retry | discussion started; presentation hierarchy pending |
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
`UX-REQ-001` through `UX-REQ-013`. Individual destination data remains owned by
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

The graph previews a reversal in the dedicated comparison specified by DB10,
with named before/after positions, explicit removed and restored relationships,
and inspectable dependency impact. A visible **Return to current** action exits
historical view. Translucent overlapping states do not carry the comparison.
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

**Status:** specified; entry and state layers were accepted at the checkpoint,
and the user accepted question-led semantic depth and named expansion actions on
2026-09-06 as `UX1.5-DISC03`. The remaining rules below complete that direction
using the accepted DB04–DB09 navigation, inspection, Work, Review, and authority
boundaries. The paper audit is complete; runtime contracts, implementation, and
participant validation remain separate gates. This does not record
`UX-DESIGN-FREEZE-01`.

### Product role, task, and completion condition

The Project author opens Graph to understand a specific relationship question:
what bears on this object, where a statement came from, how alternatives differ,
what depends on a proposed change, or what a prior state contained. Graph is
optional throughout the governed-work loop. A complete answer may be a textual
path, matrix, or timeline; it need not be a node-link picture.

The task completes when the author can identify the relevant objects and exact
relationships, distinguish their meaning and authority, follow their available
basis, and understand the view's scope and material omissions. The author can
then return to the origin, correct a working candidate, open Review, or start
bounded Work for an unresolved question. Merely displaying a network or finding
a connection is not evidence that the relationship question has been answered.

### Shared roles and profile-owned meaning

| Role | Shared responsibility | Profile-owned meaning |
| --- | --- | --- |
| Focus and question | Exact object/revision, task, Project, and origin | Recognizable object name and valid relationship question |
| Object | Stable identity, revision, layer, lifecycle, selection, and destination | Claim, Result, passage, constraint, or another registered domain type |
| Relationship | Exact endpoints, direction, origin, revision, and inspection reference | Predicate meaning, scope compatibility, basis requirements, and permitted corrections |
| Path | Ordered, inspectable objects and relationships at a named snapshot | Whether the recorded path expresses evidence, derivation, dependency, or another typed meaning |
| Basis and provenance | Separate exact references, limitations, and producer history | Admissible evidence or governing material and domain-specific force |
| Group and boundary | Disclosed membership rule, count unit, omissions, and expansion | Valid grouping facets and named expansion tasks |
| Comparison and time | Explicit endpoints, revision identity, and read-only historical position | Domain difference, assessed consequence, and applicable temporal dimension |

The responsible author directs the question and any correction. A named model
role may interpret a natural-language question or explain bounded records;
validators evaluate profile-valid meaning. The application and renderer do not
author relationships, infer authority, decide scientific standing, or promote
their output. A profile registers types, predicates, vocabulary, and expansion
recipes through `UX-REQ-004`; arbitrary model text cannot become an executable
predicate or query. Controlled-writing examples here name semantic roles, not a
final domain schema.

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

### Accepted semantic depth and expansion

Depth is the amount of relationship context needed to answer the active question.
The initial scope contains the smallest useful focus and relevant relationship
families, including contrary and qualifying material when the task asks what
bears on a proposition. An overview can group details; it cannot hide a known
material disagreement merely to make the answer look simpler.

The author sees the interpreted question and a concise scope summary immediately.
**Scope** exposes the focus and endpoint revisions, included relationship types
and directions, included layers, snapshot, temporal perspective, exclusions,
traversal limits, and result boundary. Hop limits are exact query safeguards
available for inspection and adjustment within supported limits. They are not
the primary measure of whether enough context has been shown.

A direct task control uses a registered bounded recipe. A natural-language entry
binds its interpretation to the named model role and input context, then validates
it against that same profile and query boundary. Routine read-only interpretation
does not add a confirmation step. Material ambiguity about the target, meaning,
or time position requires clarification. The author can change the question or
use Scope; neither path silently widens to the whole Project.

Named expansion actions state the purpose and target: **Trace sources**, **Show
contrary evidence**, and **Show downstream effects** in an applicable scientific
profile; **Trace requirements** or **Show dependent passages** in an applicable
writing profile. They disclose recorded relationships within the current layer
and snapshot boundary. They do not silently search new sources, run validators,
generate assessments, add working candidates, or apply changes. Those outcomes
use the existing SuggestedAction, Work, candidate, and Review boundaries.

An expansion identifies its branch and acknowledges loading there. Existing
selection, readable paths, and layout remain available. Results extend that
branch only when their request, scope, and snapshot still match; a late response
cannot replace a newer question. A reached limit exposes what stopped traversal
and the permitted next expansion or narrowing action. Stopping or superseding a
view query preserves the last usable view and does not cancel independent Work.

#### Concrete accepted example

In an invented scientific Project, the author asks **What supports or challenges
H4 — Longer spacing improves recall?** The initial view centers that Hypothesis
and summarizes three supporting Claims, one contrary Claim, and two qualifying
Claims recorded within the chosen scope. These illustrative counts describe
recorded relationships, not votes, independent replications, or scientific truth.
The contrary and qualifying groups remain visible before expansion.

| Action | Result and boundary |
| --- | --- |
| **Trace sources** on a supporting Claim | Reveal its recorded source path through the exact passage, Artifact, and source version; inspect every intervening relationship and any missing step |
| **Show contrary evidence** | Open the contrary Claim with its scope, rationale, and exact available basis; do not conduct a new literature search |
| **Show downstream effects** on H4 | Reveal recorded dependencies such as an Experiment or draft conclusion; label any separately supplied consequence assessment with its basis and limitations |

Source tracing may require several graph steps. A shallow neighborhood may contain
many unrelated objects. Named expansion lets the author request the context that
serves the question while exact traversal limits remain inspectable. A writing
Project can apply the same mechanics to **Which requirements govern this passage?**
without storing its requirements as scientific Claims.

### Scope, omissions, and density

The boundary distinguishes what was requested, what was returned, what is currently
drawn, and what remains unknown. The canvas and textual peer consume the same
snapshot-bound scope and membership, even when they present different amounts of
detail at once.

| Condition | Required disclosure and control |
| --- | --- |
| Collapsed group | Membership rule, object/relationship count unit, layer, and **Expand group** or textual member list |
| Filtered records | Active filter and count when known, with **Clear filters**; filtering cannot erase the omission indication |
| Hidden Working changes | Relevant permitted count and reason when known, with **Show working changes**; unknown is not zero |
| Traversal or page limit | Reached boundary, returned amount, total if known, and a bounded continuation action |
| Partial query or unavailable branch | Which branch is incomplete, what remains usable, and branch-specific retry or narrowing |
| Out-of-scope material | Excluded relationship families, layers, time, or object boundary; disclose counts only if the runtime supplies them |
| Restricted material | Only a permitted limitation statement; counts, names, and inferred connections cannot disclose unauthorized objects |

Counts identify whether they measure unique objects, relationships, or paths and
whether they are exact, partial, or estimated by a recorded method. Overlapping
groups are identified and their counts are not silently summed. The client may
count a fully loaded presentation group, but cannot extrapolate corpus totals,
coverage, contrary-evidence absence, or impact from the visible subset.

Grouping uses named, inspectable facets such as source version, relationship
family, or dependency stage. A group is a presentation container, not a domain
object or an accepted higher-level assertion. Bundled lines expose the number
and kinds of member relationships and open their list; they never acquire one
invented rationale. Opposing relationship families and Current/Working changes
remain distinguishable inside every summary. Cycles and repeated endpoints stay
visible in the path list without infinite traversal or duplicate counting.

When the view becomes dense, group or page the unselected context before hiding
the focus, selected endpoints, relationship labels, or material limitations.
Semantic zoom changes detail and label density, not scope, layer, authority, or
membership. An omitted intermediate path segment has an explicit disclosure;
it cannot look like a direct domain relationship. The text view exposes every
permitted returned path step and continuation independently of canvas zoom.

Every query and expansion has finite result and traversal limits. Post-freeze
`UX-FX25` will calibrate visible object/edge, label, layout-time, and interaction
budgets against supported viewports and reference hardware before renderer
optimization is accepted. No unmeasured universal node ceiling or latency claim
is a product fact. The blocking design constraints are readable selection,
bounded results, stable orientation, usable controls, and complete textual access.

### Information hierarchy and responsive blueprints

Graph has one logical reading order:

1. Project, relationship question, focus descriptor, and return origin;
2. layer, represented snapshot, freshness, and any material limitation;
3. scope summary and omission counts, followed by **Scope**;
4. representation and task-layout controls, then the bounded relationship result;
5. selected object, relationship, group, or path in Details;
6. relevant expansion, source, correction, Review, or Work actions.

| Presentation | Blueprint and behavior |
| --- | --- |
| Wide | Question and context above a primary graph/text result. A compact toolbar offers Scope, representation, layout, history, and view controls. One contextual Details or Petra panel expands by default; a second requires explicit pinning and sufficient room under DB04. |
| Medium | Project map collapses; question, state, and scope wrap without losing labels. The result retains usable width; secondary inspection replaces the expanded secondary surface rather than squeezing both into unreadable columns. |
| Narrow or high zoom | One surface at a time. The textual peer is the initial result on narrow layouts unless the author deliberately chooses Graph; Graph remains available. Controls reflow, Details and Petra use full-width routes, and an explicit return restores the originating result and selection. |
| Comparison | Wide layouts show named before/after regions with a shared difference list and linked selection. Narrow layouts stack those regions or show one labeled position at a time with the same difference list. The active position and counterpart state remain explicit. |

Resizing changes presentation, not the question or scope. Graph remains a bounded
canvas with its own pan controls; surrounding prose, tables, controls, and Details
reflow. At 200% text scale and a 320 CSS-pixel effective width, every material
action and fact must remain available through the text route without horizontal
page scrolling. Numeric styling tokens remain owned by DB14/DB16; these are
DB10 conformance scenarios rather than a claim of measured accessibility.

### Selection, relationship details, and path inspection

Selection is separate from task focus. Selecting an object opens its exact Details
without recentering the graph, changing the question, or expanding its neighbors.
**Focus on this object** deliberately starts a bounded question around it and
records the previous view in graph history. Selecting an edge opens the exact
Assertion or profile-owned relationship record behind it, including both endpoint
revisions, direction, predicate meaning, scope, origin, authority layer, lifecycle,
rationale, basis, validation where applicable, and freshness.

Object labels use the profile type and recognizable descriptor. Source versions,
exact spans, results, working revisions, and superseded objects retain their own
identities. A relationship's text label and direction carry its primary meaning;
line treatment and color reinforce it. Citation, support, contradiction,
qualification, failed replication, derivation, and inferred relationship remain
distinct. Nearness, line thickness, visual centrality, or membership in Current
does not encode scientific warrant. **Current** means accepted Project state,
not established truth.

**Inspect path** opens an ordered textual sequence with exact references for each
step, allowing selection of an individual relationship, endpoint, or source.
Several possible paths appear as separately inspectable results; any ordering
reason is disclosed and a short path is not labeled the strongest evidence.
Missing, unavailable, unvalidated, or out-of-scope steps remain explicit. A path
through a Working change cannot be summarized as wholly authoritative. A recorded
dependency cannot by itself establish that a change will invalidate its target.

**Open source** uses DB08's exact source version, Artifact, selector, surrounding
context, and honest location limitation. **Ask Petra** carries the selected
records, question, layer, snapshot, inclusions, and omissions into DB06's context;
the model does not receive an unbounded Project simply because Graph is open.
Following either action preserves the path, selected step, viewport or text
position, expanded groups, and originating focus for return.

Multi-selection creates an explicit inspection or comparison set. Its membership
and **Clear selection** remain visible; keyboard and textual selection are
equivalent. Lassoing, selecting a group, or selecting every returned member grants
no approval and cannot create a semantic relationship. Comparison requires a
profile-supported task and names incompatible or unavailable endpoints.

### Task layouts, comparison, and renderer boundary

| Task layout | Primary question and presentation |
| --- | --- |
| **Neighborhood** | Which recorded relationships concern this focus? Arrange bounded immediate context by named relationship families; deeper paths expand by purpose. |
| **Provenance** | Where did this statement or result come from? Show ordered derivation and source steps with an equivalent textual trace. |
| **Disagreement** | How do these statements conflict or qualify each other? Align endpoints, scope, relationship meaning, and exact basis; an evidence matrix is a full peer. |
| **Comparison** | What differs between named alternatives, candidate/current positions, or snapshots? Show separate labeled positions and a difference list, including incomparable or missing values. |
| **Impact** | What recorded objects depend on this target or exact proposed change? Show dependency paths and separately supplied assessed consequences with their coverage limits. |
| **Time** | What was recorded or applicable at the chosen time? Use a labeled timeline and explicit temporal dimension with historical inspection. |

The task supplies the initial layout. Choosing a supported layout changes only
the arrangement of the current records. A layout that requires a different query
exposes that new scope through the normal bounded task action rather than quietly
fetching a different answer. Profile-inapplicable layouts are omitted or explain
why the current selection cannot support them.

Before/after comparison identifies both snapshots or exact working revisions,
their common base where applicable, and each position's authority and freshness.
It labels **Added**, **Removed**, **Changed**, **Unchanged**, **Not comparable**,
or **Unavailable** only from supplied comparison facts. Position or layout
differences are not domain differences. Selecting a difference selects the exact
counterpart on each side when one exists; missing counterparts are named.
Matching positions are kept stable when meaningful, without requiring identical
geometry for different structures. Translucent overlapping graphs do not replace
the dedicated comparison or its textual difference list.

Candidate comparison uses DB09's **Current**, **Candidate**, **Difference**, and
**Consequences** roles. Candidate is a comparison position within Working changes,
not a fourth Graph semantic layer. A proposed or compensating ChangeSet preview
remains non-authoritative until the exact Review command applies. Historical
comparison offers no current-state editing; **Return to current** resolves the
current target before a fresh correction or Review can begin.

2D and the textual peer are primary. Cytoscape.js remains the primary 2D renderer
candidate, with a renderer-neutral view model and application-owned selection and
view state. Reagraph remains optional only if a named third dimension improves a
specific task in post-freeze evaluation, with full 2D/text parity and accessible
camera reset, saved-view, and permitted link behavior. Depth is not automatically
a z-axis. No 3D dependency or renderer evaluation is authorized by this brief.
Neither renderer queries Neo4j directly, parses raw AG-UI events, or owns domain
meaning, permissions, persistence authority, or mutation.

### View controls, history, and saved questions

| Control | Effect and preservation |
| --- | --- |
| **Back in graph / Forward in graph** | Restore the accepted window of ten meaningful view states: question/scope, depth, expansions, filters, layout, viewport, time, layers, and selection; no domain command |
| **Return to focus** | Bring the task's focus into the viewport or text position without changing selection, scope, or snapshot |
| **Fit view** | Fit the currently displayed result; do not fetch hidden content or clear filters |
| **Pin position / Unpin position** | Hold or release an object's layout position; this is distinct from pinning a contextual panel and from accepting an object |
| **Collapse group** | Hide member detail while retaining group meaning, counts, and access to a selected member in Details; offer **Reveal selection** if the selection is now hidden |
| **Clear filters** | Remove view filters within the same task boundary; do not reset the question, layer, or time |
| **Reset view** | Restore the current task's initial presentation at its existing snapshot/layer boundary; retain a return through graph Back and preserve unsent correction input |
| **Save view** | Retain a named local Project question and view recipe, exact snapshot/revision references, and presentation preferences; do not save an authoritative result or approval |
| **Return to [origin]** | Restore the initiating object, task, scroll/editor position, selection, and focus using DB04's permitted fallback if the origin changed |

Graph history records settled actions, not every drag coordinate, zoom frame, or
streamed update. A new exploration after Back discards only the forward
presentation branch. Reaching the ten-state limit disables unavailable Back with
an explanation; it does not truncate Project History. Browser Back handles route
navigation; **Revert change** remains DB09's compensating authority path.

Saved views and recent questions are separate from the ten-state exploration
window. Reopening a saved view resolves its exact references and rechecks access;
if it is older, it opens explicitly as Historical with **Return to current**.
Unavailable revisions or incompatible profile versions expose a safe recovery,
never an ambient substitution. Applying a saved question to current state creates
a new view. Local saving makes no cross-device synchronization promise. Permitted
deep links carry stable task and object references, not private source content,
credentials, unsent text, or raw model instructions.

### Direct correction and the Work boundary

Ordinary drag changes position. An explicit **Edit relationship**, **Relink**,
**Split**, or profile-valid scope correction opens structured controls or bounded
conversation with the selected exact records. Any optional editing gesture has a
non-drag equivalent and produces the same visible candidate or command preview.
An accidental drop cannot change an endpoint or predicate.

Working corrections create new non-authoritative revisions and preserve lineage
under DB09 and `UX-REQ-011`. Correcting Current prepares a candidate and exact
Changes-to-apply preview, then routes to the existing Review identity. Validation,
capability, stale-input detection, impact, approval, atomic application, and Revert
remain owned by that path. A visually drawn edge cannot stand in for a validated
relationship. Immutable source bytes and earlier revisions remain protected.

Closing unsubmitted correction controls retains the task's draft according to
DB06/DB09; cancelling an unsubmitted edit leaves domain state unchanged. Once
submitted, status is read from the canonical command or Work record. Graph does
not issue a second command because a projection still shows the older edge.

Recorded relationship expansion normally uses the bounded read/query path. A
material new investigation, source search, assessment, or validation shows DB06's
SuggestedAction preview with objective, exact scope, role, input, cost/budget where
applicable, latency or availability limits, expected output, and cancellation
boundary before Work starts. Unknown cost or duration stays unknown. Graph may
show a linked Work summary; the Work route owns execution, input requests,
steering, detach/reconnect, cancellation, and terminal outcomes. Work completion
returns to the origin, candidate Review, or an output according to DB05; it does
not quietly enlarge the graph or apply its findings.

### Temporal position and projection refresh

Current entry targets the current authoritative snapshot and identifies the
snapshot actually represented. Exploration and expansion remain bound to that
view. If newer authoritative state arrives, **Newer state available** offers
refresh or comparison; an in-progress inspection is not silently rewritten.
Refresh preserves the question and view where identities still resolve, explains
replacements or missing objects, and records the prior graph state for Back.

Projection catch-up can update freshness without switching the chosen snapshot.
If the graph cannot yet represent that snapshot consistently, preserve the last
trustworthy view with its actual represented position and a visible lag state.
Do not combine old endpoints, new edges, and current counts into one apparently
consistent answer. Working revisions identify their authoritative base; a stale
working base is not silently rebased when Current refreshes.

Historical mode pins an exact prior snapshot or explicit temporal query and
disables mutation. A time control has a labeled dimension: recorded time,
occurred time, publication time, or a profile-valid applicability interval.
The interface never substitutes ingestion time for publication, observation, or
valid time. Unknown time has an explicit undated/unknown group and remains
inspectable. A domain date filter alone does not change Current into Historical;
the state-layer control states which Project snapshot is being queried.

If historical reconstruction or a selected time dimension is unsupported, the
view says which question cannot be answered and offers supported History records,
another temporal dimension, or **Return to current**. A timestamp slider cannot
fabricate a past graph from today's records. New correction from a historical
inspection first resolves Current and creates a fresh candidate/Review bound to
it; it cannot edit the historical position.

### Interaction and path register

Each path preserves Project, profile, exact task references, snapshot, origin,
return focus, and any unsent local input. Graph and textual controls invoke the
same actions. The state matrix below supplies failure branches for every path.

| Path | Trigger and precondition | Feedback, completion, and authority | Exit, recovery, and focus |
| --- | --- | --- | --- |
| `DB10-P01` Enter a relationship task | Contextual link, selected object, recent/saved question, or interpreted question; permitted target/profile | Show question and scope while resolving, then the bounded graph/text result; read only | Revise ambiguous scope, resolve unavailable target, or return to origin; route entry focuses the question heading |
| `DB10-P02` Inspect and trace | Select a node, edge, group, or path step in a resolved view | Open exact Details, expose origin/basis/limits, and optionally open exact source; read only | Close Details or return from source to the invoking selection; missing path stays explicit |
| `DB10-P03` Expand, filter, or refocus | Named expansion, Scope change, or **Focus on this object** within a supported boundary | Acknowledge affected branch; accept only matching query results and expose omissions; presentation/read only | Stop pending read, retry branch, narrow, or Back; keyboard focus stays on invoking control or its stable replacement |
| `DB10-P04` Change representation or layout | Graph/Text, task layout, group, fit, pin, or reset control | Preserve semantic scope and selection; update arrangement/disclosure and graph history only | Reset/Back or reveal selection; focus remains on the control and text counterpart is reachable |
| `DB10-P05` Compare or inspect time | Exact endpoints, selected time dimension, or historical link | Show named positions and supplied differences with authority/freshness per side; read only | Select counterpart, inspect History, or Return to current; no current mutation inside historical mode |
| `DB10-P06` Correct a relationship | Explicit permitted correction on an exact current or working revision | Prepare new working revision or exact Review preview; authority changes only through DB09's validated apply path | Retain draft, cancel unsubmitted edit, refresh conflict, or inspect command outcome; return to corrected target or named replacement |
| `DB10-P07` Investigate a gap | Insufficient recorded basis and a permitted SuggestedAction | Show scope/cost/consequence preview, start durable Work through DB06, then inspect result; starting Work does not apply findings | Leave/detach without cancelling; explicit Cancel work in Work; return with result or retained failure and original question |
| `DB10-P08` Resume, refresh, and return | Saved question, graph Back/Forward, reconnect, or newer-state notice | Re-resolve exact identity, access, snapshot, and freshness; restore safe presentation, not domain history | Open current explicitly, retry read, inspect permitted history, or return to stable parent/Brief with reason |

### Required state and recovery matrix

| State | Visible meaning | Required path |
| --- | --- | --- |
| No relationship question | Direct Graph entry offers recent/saved questions, object selection, or natural language | Choose a bounded task or return to Brief; no empty corpus network |
| Interpreting or ambiguous | Named role and interpreted target/scope, with any material unresolved meaning | Correct the question, clarify the consequential ambiguity, stop the response, or choose a direct task |
| Loading | Question, target, layer, and pending read remain visible; no fabricated nodes | Stop or supersede the read, return, or use retained permitted results |
| Ordinary, current, complete for scope | Exact represented snapshot, scope, relevant relationships, and material limits | Inspect, expand, compare, correct, or return; complete for scope does not mean complete knowledge |
| No recorded relationship in scope | Empty result names the queried relationship, layer, time, and coverage | Adjust Scope, show relevant Working changes, inspect another basis, or preview new Work; never assert that no relationship exists anywhere |
| Dense | Group/page counts, selection, readable labels, and omitted detail | Expand a group, narrow, inspect members in text, or fit/reset the view |
| Expansion running or interrupted | Affected branch is pending or stopped; existing result remains usable | Stop read, retry that branch, narrow, or Back; unrelated Work continues |
| Partial, capped, or limited | Returned subset and limit reason, unknown totals, missing basis, or inaccessible source | Continue a supported page/branch, retry, narrow, or follow DB08's exact-source recovery |
| Disconnected objects or no path | Endpoints exist but no complete recorded path was returned within the named boundary | Inspect endpoints and gaps, deliberately expand scope, or request bounded investigation; do not draw a synthetic bridge |
| Working or stale working base | Exact producer/revision, non-authority, base snapshot, validation, and any newer revision | Inspect, correct, compare, or open Review; rebase/refresh through canonical working/review behavior |
| Newer authoritative state | The displayed snapshot remains identifiable; newer state is available | Refresh deliberately, compare, retain historical inspection, or return |
| Applied—updating views | Exact authoritative change committed while the graph is behind | Open authoritative Details/Review, return, or await/retry the projection read; no duplicate Apply |
| Projection blocked/rebuilding | Derived graph cannot safely represent the requested snapshot; last valid position is labeled | Use an authorized authoritative non-graph route, retry status/read, or inspect failure; rebuild is a runtime-owned operation |
| Historical or unsupported time | Named prior snapshot/time dimension, non-editing state, or precise temporal limitation | Inspect supported history/other dimension or Return to current |
| Comparison partial or stale | Each side's exact revision and missing/incomparable facts; no invented difference | Retry missing side, choose compatible endpoints, refresh the associated Review, or close comparison |
| Read/renderer failure | Failed read or display is distinct from authority; permitted prior scope and selection survive | Retry bounded read or switch to text when its data is valid; text from the same stale projection is not falsely current |
| Offline or lost connection | Permitted cached content and age; unresolved read or Work status stays unresolved | Inspect safe cached content, reconnect/requery, or use Work's replay path; no success inferred from disconnect |
| Missing, replaced, unauthorized, or unsupported profile | Permitted identity/limitation only; no silent current-object substitution or access leak | Follow DB04/UX-REQ-008 replacement resolution, stable parent, or Brief; retain only permitted local context |
| Correction conflicted, failed, or applied | Canonical candidate/Review/command outcome and projection effect | Use DB09's refresh, exact retry, correction, deferment, or governed Revert; Graph navigation cannot repair authority |
| Question answered or Work completed | Recorded answer with scope, or linked Work result with its actual outcome | Return to origin, inspect result, open candidate Review or output; no automatic approval or expansion |

### Accessibility and visual language

The textual peer is a complete way to perform every relationship task. It exposes
the same question, layers, exact objects and relationships, direction, path order,
basis, scope, omissions, comparison positions, temporal meaning, and expansion
actions. A renderer failure can fall back to text only if the underlying records
remain usable. An authoritative fallback during projection lag must identify its
own valid source and snapshot; a table over the stale graph is still stale.

Keyboard users can enter the result through a named region, navigate an ordered
object/relationship list, select a record, inspect Details, follow a path, expand,
filter, compare, correct, and return. They need not tab through every canvas
primitive or infer spatial neighbors. The canvas uses the same selection model
and provides named pan, zoom, fit, and reset controls. No gesture or double-click
is the sole route to a material action, and graph shortcuts do not intercept text
editing or assistive-technology keys outside the focused graph context.

Selection does not steal keyboard focus on pointer updates. Explicit keyboard
inspection moves focus to the Details heading; closing returns to the invoking
record/control or the nearest stable task target if it no longer exists. A real
modal traps focus only while open; nonmodal Details does not. Async expansion,
layout, projection refresh, and Work status never force focus or scroll. A polite
status announcement reports the changed branch/count and limits once, without
reading every added edge or repeating streamed detail. Urgent action failures
remain visible and announced at the affected control.

Touch selection opens the same Details; panning does not activate a node or edit
an edge. Every drag, hover, resize, or camera operation has a control-based
alternative. Narrow routes, enlarged text, and resized panels preserve the same
reading order and return path. Touch targets, contrast, focus outlines, and panel
resize controls inherit DB14/DB16 and must be verified after freeze.

Use the accepted stone/graphite surfaces, readable UI type, and restrained amber
focus accent. Type labels, relationship words, arrow/direction text, layer badges,
and explicit difference labels carry meaning in monochrome and forced colors.
Color, shape, opacity, motion, and location alone never distinguish authority,
contradiction, selection, or historical state. Reduced motion replaces animated
layout/path transitions with stable updates; the ordinary view has no perpetual
simulation or attention-seeking path animation. A selected path remains legible
without movement.

### Terminology and copy ledger

These terms implement the accepted DB04/DB06/DB09 and `UX1.5-DISC02`–`DISC03`
meanings. Profile terms require registered semantics under `UX-REQ-004`. All rows
are specified for paper review; comprehension and accessible rendering require
post-freeze evidence. Technical IDs and exact predicate names remain inspectable.

| Canonical meaning | User-facing term / allowed short form | Do not use for | Owning source and surfaces |
| --- | --- | --- | --- |
| Task-bounded relationship view | **Graph**; question as its heading | Whole-corpus discovery or a second Project home | DB04/DB10; navigation and result heading |
| Accepted Project state | **Current** | Scientific truth, complete evidence, or guaranteed projection freshness | DB09/DB10; layer, Details, text |
| Durable candidate structure | **Working changes**; profile-specific candidate name | Applied state or a second authority lifecycle | DB09/UX-REQ-011; layer, group, Details, Review link |
| Prior selected state | **Historical**, **Return to current** | A domain date filter, active editable Current, or Revert | DB06/DB10; context, time, comparison |
| Query boundary | **Scope** | Merely the visible canvas or the full authorized Project | UX1.5-DISC03; header, controls, omissions |
| Recorded relationship expansion | **Trace sources**, **Show contrary evidence**, **Show downstream effects**; registered profile variants | New discovery, inferred support, validation, or automatic mutation | DB10/DB06; result, Details, text |
| Relationship assertion | Profile predicate and endpoint names | A decorative line, model confidence, citation-as-support, or dependency-as-certain-impact | D005/D006/profile; edge label, Details, path list |
| Derived representation freshness | **Updating graph**, **Graph unavailable**, **Applied—updating views** when application is known | A fourth semantic layer or a failed authoritative decision | DB09/projection contracts; status and recovery |
| Presentation recovery | **Back in graph**, **Forward in graph**, **Reset view** | Reversing accepted changes or cancelling Work | DB06/DB10; view toolbar and text controls |
| Meaning correction | **Edit relationship**, **Relink**, profile-valid correction verb, **Changes to apply** | Position dragging or immediate unreviewed application | D005/DB09; Details, correction, Review |
| Temporal/comparison positions | Named snapshots or **Current / Candidate**, explicit difference words | Overlapping state, a new semantic layer, or an inferred diff from layout | DB09/DB10; comparison and text list |

Example empty copy is **No contrary relationships recorded in this scope**, with
the scope and known coverage alongside it. An incomplete read instead says
**This branch is incomplete** and offers **Retry branch**. A stopped expansion
says **Expansion stopped; the previous view is available**. Projection-lag copy
names the committed change and offers **Open applied change**. A restricted or
missing endpoint uses the permitted resolution message and safe return. Recovery
labels name their actual object or operation, avoiding a generic **Try again**
that could mean rerunning Work or reapplying a change.

### Backend and persistence needs

The contract audit found existing `ProjectionCheckpoint` and
`GraphProjectionRecord` contracts for authoritative projection status and delivery
receipts. DB09's candidate, ChangeSet, Approval, command, event, and reversal
boundaries remain the foundation for correction. The existing workbench
`FocusedGraphViewModel` is an exploratory client model; it does not establish a
runtime-owned profile-neutral scope, path, omission, or temporal comparison query.

`UX-REQ-013` requests that missing read boundary: a validated task/scope identity,
snapshot and represented projection position, exact layer/revision membership,
relationship/path details, counts and completeness, bounded expansion and
continuations, explicit comparison/time capabilities, and safe semantic
destinations. Its full record in `UX-BACKEND-HANDOFF.md` distinguishes existing
inputs from proposed composition and names the smallest viable response.

It depends on `UX-REQ-004` for profile semantics; `UX-REQ-008` and `UX-REQ-009`
for exact destination/source inspection; `UX-REQ-011` for working structure; and
`UX-REQ-007`/`UX-REQ-012` for supplied reversal/comparison/Review facts. DB06's
`UX-REQ-003` and `UX-REQ-006` supply new Work and task context rather than making
view expansion a second orchestration system.

The client owns renderer geometry, local view history, local saved recipes,
disclosure, resize, selection, and return context. The runtime owns authorized
query results, exact revisions, profile validity, source/basis meaning,
completeness outside a fully loaded local group, comparison facts, impact
assessments, authority, and projection freshness. No browser traversal may invent
missing links, infer absence, calculate promotion eligibility, or infer a domain
difference from two incomplete node sets. Proposed post-freeze fixtures must
declare the `UX-REQ-013` boundary and cannot claim live integration or `G-CONTRACT`
before architecture disposition.

### Nielsen and dangerous-misunderstanding paper audit

| Heuristic | DB10 resolution |
| --- | --- |
| Visibility of system status | Question, scope, exact layer/snapshot, projection position, omitted results, branch loading, and command outcome remain distinct |
| Match with the real world | Named relationship questions and profile verbs lead; exact types and hop limits remain inspectable |
| User control and freedom | Correct scope, expand deliberately, stop reads, select text, Back/Forward, reset, save, and return without altering authority |
| Consistency and standards | Graph and text use the same identities, source readers, Details, Work, Review, History, and command paths |
| Error prevention | No automatic scope widening, snapshot mixing, inferred path, hidden contrary group, or mutation through view gestures |
| Recognition rather than recall | Focus descriptor, selected path, endpoints, group membership, comparison positions, and return origin remain available |
| Flexibility and efficiency | Named actions, optional exact controls, keyboard inspection, saved questions, and task-specific matrices/timelines serve different inspection needs |
| Aesthetic and minimalist design | One bounded question, grouped secondary detail, readable selection, and one expanded contextual panel by default |
| Error recovery | Branch retry, bounded refresh, text fallback, exact historical resolution, Review conflict recovery, and authoritative route during projection lag |
| Help and documentation | In-place explanation of predicate, scope, count unit, omissions, temporal dimension, working state, and action consequences |

The paper design was checked against `DB10-P01`–`P08`, all rows of the state
matrix, and both profile examples. This is a specification audit, not a report
of executed fixtures, performance measurement, accessibility testing, or observed
participant comprehension.

| Finding | Location/evidence and consequence | Severity | Disposition, owner/gate, and verification |
| --- | --- | --- | --- |
| `DB10-A01` Conflicting comparison instruction | Earlier DB06 reversal copy allowed ghosted overlays despite accepted dedicated DB10 comparison; authority positions could be confused | Major | Fixed in this brief by aligning DB06 with DB10; design owner; wording checked in the paper audit |
| `DB10-A02` Missing complete focused read boundary | Projection receipts and exploratory client model cannot supply scoped completeness, exact paths, working membership, or historical comparisons | Major | Needs contract: `UX-REQ-013`, implementation architecture; explicitly provisional post-freeze adapter; `G-CONTRACT` remains blocked pending disposition |
| `DB10-A03` Density and spatial comprehension unmeasured | Text specification cannot prove that selected paths remain readable or that a third dimension helps | Moderate | Needs researcher validation: design owner; `UX-FX24`/`UX-FX25` and `UX1.5-EV02`–`EV04` after freeze; no 3D or performance claim accepted without evidence |
| `DB10-A04` Renderer mistaken for authority | Earlier roadmap phrase described 2D as authoritative; a view could be mistaken for the command/event source | Major | Fixed in the design roadmap to say primary; D005 authority and DB10 renderer boundary checked |

Dangerous misunderstandings are acceptance failures: Current means truth; an edge
means support regardless of predicate; a short path is stronger evidence; a group
is an accepted assertion; a count proves independent corroboration; an omitted or
unknown result proves absence; a dependency proves invalidation; a Working path
is wholly authoritative; an expansion performs new research or mutation; a new
layout changes domain state; Historical can be edited; publication and recorded
time are interchangeable; selection approves a change; Back or Reset Reverts it;
or projection lag means an applied command should be submitted again.

### Acceptance criteria and post-freeze conformance evidence

The DB10 specification is complete when the following behaviors and their
boundaries are defined; post-freeze implementation must demonstrate them:

1. contextual and direct entry open a named bounded question with exact origin,
   Project/profile, focus, layer, snapshot, selection, and return;
2. Current, Working changes, Historical, and projection freshness remain distinct
   in every representation and adverse state;
3. question-led depth, correctable Scope, profile-valid named actions, and finite
   exact query limits preserve contrary and qualifying material;
4. expansion reveals recorded relationships, preserves orientation, and separates
   new investigation/assessment from a read and from authoritative change;
5. objects, edges, groups, and every returned path step expose exact identity,
   direction, meaning, origin, basis, limitations, and layer without visual-only
   inference;
6. omission reasons, units, unknown totals, overlapping groups, partial reads,
   restricted records, cycles, and traversal limits remain honest;
7. layouts change representation while dedicated comparison exposes exact
   positions, supplied differences, missing counterparts, and consequence limits;
8. selection, focus, pan, zoom, pin, fit, collapse, reset, ten-state history, local
   saved questions, and route return have distinct, reversible view effects;
9. direct and conversational correction create the same candidate/Review path,
   preserve source and revision lineage, and cannot apply through a gesture;
10. temporal inspection distinguishes Project snapshot from domain time, labels
    unknown dates, avoids silent rebasing, and offers Return to current;
11. every loading, partial, dense, limited, stale, historical, failed, offline,
    unauthorized, projection-pending, and terminal state has a bounded recovery;
12. the textual peer, keyboard, screen reader, touch, high zoom, panel resize,
    forced colors, non-drag actions, and reduced motion preserve the complete task;
13. graph-origin Work, Review, source inspection, composition return, and History
    inherit DB04–DB09 identity, authority, and recovery rules;
14. runtime needs are registered without modifying implementation-owned contracts
    or treating the pre-freeze graph as conformance evidence; and
15. paper findings are fixed or assigned to explicit contract/validation gates,
    with no claim that design completion constitutes runtime completion.

| Scenario | Post-freeze evidence required |
| --- | --- |
| `UX-FX24` Paired bounded relationship questions | Independently invented scientific and controlled-writing Projects exercise direct/contextual entry, the H4-style evidence/requirements question, opposing or constraining material, multi-step exact-source tracing, working layers, dependency/impact distinction, correction through Review, linked new Work, and exact return. Graph, matrix/path text, and comparison answer the same questions. |
| `UX-FX25` Dense, temporal, and adverse graph exploration | Bounded high-degree and cyclic paths, overlapping groups, partial/unknown counts, hidden Working changes, query cancellation and late replies, projection lag/blocking, stale working base, historical and unknown dates, incomplete comparison, missing/restricted objects, renderer failure, offline recovery, saved-view reopening, and the ten-state navigation boundary. Exercise wide, narrow, high-zoom, keyboard, screen-reader, touch, forced-colors, resized-panel, and reduced-motion variants. |

These scenarios are specifications for later synthetic fixtures. They must not
copy or structurally derive from contextual demo data or user assets.
`UX1.5-EV01`–`EV04` will record fixture coverage, relationship comprehension,
graph/text/accessibility parity, and measured density/performance after freeze.
DB10 can now hand off to the DB11 discussion without starting Graph implementation.

## `DB11` — durable Work and orchestration

**Status:** discussion started after DB10's specification and paper audit.
DB06 already establishes durable Work, bounded action previews, accountable
roles, distinct interrupts, observable activity, cost, cancellation, and exact
result routing. Those accepted boundaries are not reopened here.

The Project author's task is to understand what is running, whether it needs a
decision, what it has produced, and what changing or stopping it would do. The
pending presentation recommendation is to lead with one task overview per bounded
objective: objective and outcome, required input, current stage and remaining
plan, cost/limits, and available controls. Observable role/tool/validator runs and
their inputs, outputs, checkpoints, and errors expand beneath the relevant stage.
The Work collection lists those tasks; the detail route makes the stages primary.
A full execution/dependency view remains available for complex diagnosis.

For an invented writing task, **Check this passage against its requirements**
could show **Gather requirements → Check dependencies → Validate passage → Collect
findings**. If validation needs an author decision, that question leads the task
overview. The author can inspect the exact requirement, accountable validator,
input revision, and partial findings from that stage. Supporting runs remain
inspectable without requiring an execution diagram to follow ordinary progress.
Stages describe observable work and do not claim access to private model reasoning.

The material choice is whether this task-and-stage presentation should be the
default or whether the full execution/dependency structure needs primary space.
The recommendation is **pending user direction**, not an accepted DB11 decision.
After that direction, complete plan revision and steering consequences, stage and
task status, required input, cost, detachment/reconnect, cancellation, partial and
terminal results, retry, responsive/accessibility behavior, backend gaps, and the
DB11 paper audit before advancing to DB12.

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

1. carry the accepted direction and specifications through `DB10` into their recorded backend dispositions without implementing a product surface;
2. discuss and specify `DB11`, durable Work and orchestration, as the next section;
3. design `DB12`–`DB13` module by module through the discussion-first loop;
4. close the design system, language, accessibility, failure, and recovery specifications in `DB14`–`DB17`;
5. assemble the complete screen, state, flow, and backend blueprint in `DB18`;
6. review and explicitly record `UX-DESIGN-FREEZE-01`;
7. begin the neutral reference-UX implementation;
8. begin contextual demo integrations only after the reference UX stands independently.
