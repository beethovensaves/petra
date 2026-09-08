# Petra UX design brief

Status: in progress; product design must freeze before reference-UX implementation or contextual demos
Date: 2026-09-07
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

Scientific research and complex controlled writing are the first two required
Project-profile conformance examples. They are not Petra's profile catalogue or
an exhaustive classification of Projects. Their exact demo contexts are not
product requirements. Petra may admit many other versioned profiles and
taxonomies when they fit its governed knowledge-work purpose and functions.

An admitted profile must define its typed objectives, objects, relationships,
sources or governing basis, validators, task families, tools, outputs, terminology,
and supported places well enough to map its applicable work into Petra's shared
Work, candidate/proposal, Review, approval, provenance, revision, recovery, and
History contracts. It may omit a domain flow that does not apply and add a
registered profile flow that returns through the shared kernel. It cannot redefine
permissions, approval, authority, provenance, cancellation, or history through a
taxonomy or label. Unknown and incompatible profiles fail safely. Profile
admission therefore tests semantic and functional compatibility with Petra; it
does not require membership in a closed list of disciplines.

## Project lines of inquiry

**Clarification accepted on 2026-09-06 as `UX1.6-DISC04`:** the parallel branches
the author follows are primarily lines of inquiry in the Project's reasoning.
They can concern hypotheses, but also definitions, methods, criteria, uncertain
assumptions, source disagreements, interpretation, design alternatives, or other
profile-valid open questions. They are not limited to Hypotheses or to branches
in an execution plan. This clarifies the scope of the advisory-order direction
in `UX1.6-DISC03`; its author-control and authority boundaries remain intact.

A line of inquiry names what the author is trying to understand or resolve, why
it matters to the Project, its current basis and uncertainty, related questions,
and useful next investigation. A Hypothesis may anchor a line; the interface does
not require every line to be phrased as a falsifiable proposition. A profile may
represent the role through an existing question, Hypothesis, interpretation,
design question, or linked set of typed objects where their semantics fit.
**Line of inquiry** is a product role here, not a mandated universal schema or a
new wrapper required around every Hypothesis. `UX-REQ-016` requests its canonical
profile mapping and cross-surface read/linkage boundary.

| Concept | Meaning and duration | Relationship to the others |
| --- | --- | --- |
| Project | The author's overall purpose and governed body of work | Contains or references multiple lines of inquiry that can advance in parallel |
| Line of inquiry | An ongoing question or direction of investigation with exact basis, uncertainty, and history | May involve one or more Hypotheses or other profile objects, conversations, outputs, and zero or many Work tasks over time |
| Work task | A bounded authorized execution with exact inputs, limits, outputs, and operational outcome | Addresses part of one or more inquiries; finishing it does not by itself resolve them |
| Stage or execution branch | A declared unit or path inside a registered workflow | Describes how particular Work proceeds, not the complete structure of the Project's reasoning |

Parallel inquiry does not require simultaneous model or worker execution. A line
remains recognizable when no Work is running, after a task completes, and while
the author attends elsewhere. Shared sources, assumptions, findings, and Work
retain one identity across lines. An inquiry hierarchy may group and relate
questions, but cross-links and shared basis prevent it from being treated as a
strict tree of isolated tasks. Unresolved questions can inform one another without
either being a mandatory prerequisite for all useful progress on the other.

For example, **Which criteria should guide this comparison?** and **What
alternatives are worth comparing?** can proceed together. A named model role may
recommend clarifying criteria first to make comparison more consistent. The author
may instead explore alternatives to discover which criteria matter. The response
acknowledges that choice, labels the comparison exploratory, and records what it
suggests about the criteria. It does not mark the inquiry blocked merely because
the recommended reasoning order changed. A separate inquiry might test a specific
Hypothesis; another might examine whether a measurement method is appropriate.

An inquiry recommendation explains expected relevance to the Project's current
purpose, unresolved questions, basis, potential information gain or rework, known
limits, and uncertainty. It is not a scheduler order or a universal priority score.
The author's selected inquiry is respected without repeated nudges or a claim of
Project harm merely because another line was recommended. Actual eligibility and
prerequisites are checked for a concrete requested operation; a reasoning
relationship or provisional interpretation alone cannot make all inquiry into
another question impossible.

Where an unresolved inquiry limits another conclusion, explain the specific
limitation and its basis. For example, unresolved comparison criteria may leave
a ranking provisional while exploration of the alternatives remains useful.
Respecting the author's chosen order does not erase uncertainty or turn a
conditional finding into a settled one.

Opening or focusing an inquiry is navigation/context selection, not an instruction
to start Work, reschedule running tasks, accept findings, or replace the Project's
governing objective. Explicit requests can answer from current basis, continue
bounded conversation, or enter the existing Work preview/start/steering path.
Creating or revising meaningful inquiry structure follows registered profile and
DB09 working-candidate/Review rules; a model cannot silently convert an inferred
inquiry relationship or resolution into authoritative Project meaning.

Inquiry summaries distinguish what is currently understood, what remains open,
what is provisional or contested, and the actual operational status of linked
Work. A successful search or validator run can leave its inquiry unresolved;
cancelled Work does not abandon the inquiry. Unsupported profile meaning,
unavailable basis, stale summaries, and missing linkage have explicit limitations.
The UI never derives inquiry resolution from Work completion percentages.

This clarification uses existing Brief, Project-map, Details, Petra, Graph, Work,
Review, and History places; it does not add a mandatory inquiry dashboard or a
seventh primary Project destination. DB07 orients to the lines of inquiry, DB10
inspects their relationships, and DB11 manages the bounded Work undertaken for
them. The canonical mapping and persistence remain proposed until architecture
disposition; no product or backend implementation is authorized by this section.

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
| `DB11` | Durable Work and orchestration | Plans, agents and validators, progress, input, steering, cost, detachment, reconnect, cancellation, result, and retry | specified; direction accepted; paper audit complete |
| `DB12` | Composition and revision | Artifact planning, editing, provenance, validation, citations where applicable, imported ancestry, promotion, rendering, and export | specified; document-first and working-copy export direction accepted; paper audit complete |
| `DB13` | Settings and personal control | Appearance, theme, layout, panel resizing, editor, accessibility, privacy, model visibility, and local preference rules | specified; personal-preferences-first organization accepted; paper audit complete |
| `DB14` | Design system | Brand, color, type, syntax, spacing, controls, icons, motion, density, responsive behavior, and data visualization grammar | specified; shared Petra grammar and bounded profile semantic encodings accepted; paper audit complete |
| `DB15` | UX language system | Shared control vocabulary, profile-owned terms, response voice, action rationale, status, errors, confirmations, and prohibited conflations | specified; shared communication contract and profile-owned discourse accepted; paper audit complete |
| `DB16` | Accessibility specification | Keyboard, focus, zoom/reflow, screen reader, motion, non-color meaning, graph alternative, touch, panel resize, and streamed updates | specified; task/outcome equivalence and model-readable graph context accepted; paper audit complete |
| `DB17` | Failure, recovery, and history | Offline, stale, conflict, partial, failed, blocked, unsupported, replay, lost-connection, and non-destructive recovery paths | specified; canonical reconciliation, preserved-state, and exact-return direction accepted; paper audit complete |
| `DB18` | Product blueprint and acceptance | Complete screen inventory, responsive blueprints, state matrix, end-to-end path map, backend request ledger, and design acceptance evidence | discussion open; implementation-packet recommendation pending |

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
`UX-REQ-001` through `UX-REQ-023`. Individual destination data remains owned by
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

The accepted Project-lines-of-inquiry clarification applies to this hierarchy.
**Current state** can summarize the selected and related inquiry lines, their
current understanding, unresolved questions, and shared basis; **Next steps**
can recommend an inquiry direction with valid alternatives. The Project map and
exact Details preserve access to other lines without making every inquiry an
expanded card or active Work row. Project purpose and selected inquiry remain
recognizable as different context. Selecting an inquiry does not rewrite the
governing objective or schedule Work. An inquiry with no active Work still exists,
and completed Work need not resolve its question. `UX-REQ-016` supplies the missing
mapping/linkage; `UX-REQ-002` composes these facts into the existing Brief roles.

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

Graph may also inspect the relationships among selected Project lines of inquiry:
shared basis, assumptions, alternative interpretations, open questions, and any
profile-valid dependencies. The entry stays bounded to the named relationship
question. An inquiry line is not automatically a Hypothesis node or a Work branch;
linked Work and its execution prerequisites remain separately inspectable.
Changing inquiry focus or expanding those relationships neither schedules Work
nor makes a provisional reasoning dependency a runtime constraint. The same
meaning and exact inquiry references appear in the textual peer under UX-REQ-016.

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

**Status:** specified. The user accepted the task overview and meaningful-stage
presentation on 2026-09-06 as `UX1.6-DISC02`, then accepted direct steering within
authorized limits and contextual branch recommendations as `UX1.6-DISC03`.
Recommended order is advisory; actual prerequisites and authority boundaries
remain enforceable. The paper audit is complete; runtime contract disposition,
implementation, and participant validation remain separate gates. This does not
record `UX-DESIGN-FREEZE-01`.

`UX1.6-DISC04` clarifies that the author's primary branches are parallel Project
lines of inquiry, which may concern Hypotheses or other questions and can span
multiple Work tasks. DB11 manages their associated execution; it does not define
inquiry identity or progress through a task tree. The shared Project inquiry
section, DB07, and DB10 provide the corresponding orientation and relationship
boundary. Operational branch scheduling below remains the narrower Work behavior.

DB06 already establishes durable Work, bounded action previews, accountable
roles, distinct interrupts, observable activity, cost, cancellation, and exact
result routing. Those accepted boundaries are not reopened here.

### Product role and accepted presentation

The Project author's task is to understand what is running, whether it needs a
decision, what it has produced, and what changing or stopping it would do. Work
leads with one task overview per bounded objective: objective and expected or
actual outcome, required input, current stage and remaining plan, cost/limits,
and available controls. Observable role/tool/validator runs and their inputs,
outputs, checkpoints, and errors expand beneath the relevant stage. The Work
collection lists those tasks; the detail route makes the stages primary. A full
execution/dependency view remains available for complex diagnosis.

For an invented writing task, **Check this passage against its requirements**
could show **Gather requirements → Check dependencies → Validate passage → Collect
findings**. If validation needs an author decision, that question leads the task
overview. The author can inspect the exact requirement, accountable validator,
input revision, and partial findings from that stage. Supporting runs remain
inspectable without requiring an execution diagram to follow ordinary progress.
Stages describe observable work and do not claim access to private model reasoning.

The management task completes when the author understands the exact current or
terminal outcome, any remaining input or limitation, the available control and
result paths, and how to return to the originating work. Execution may continue
in the background, wait for input, or be terminal; leaving the management surface
does not change that operational state.

### Shared roles, identity, and authority

| Role | Shared responsibility | Profile-owned meaning |
| --- | --- | --- |
| Objective | Exact Project/task identity, originating request, bounded input, expected outcome, and return | Research, source processing, validation, composition, or another registered task |
| Plan | Versioned description of declared stages, dependencies, expected outputs, limits, and control boundaries | Valid order, relevant checks, and task-specific prerequisites |
| Stage | Named observable unit of progress with input/output references and actual execution status | Gather sources, compare scope, check continuity, or another valid workflow step |
| Execution | WorkUnit, attempt, role/tool/model identity, manifests, timestamps, resource use, and terminal receipts | Registered worker, validator, or specialist role |
| Required input | Exact unresolved question, responsible actor, permitted response, consequence, and affected work | Domain clarification, validation judgment, or profile-specific choice |
| Result | Exact output revision, origin, limitations, validation, and destination | Read-only answer, finding, candidate, Artifact, or another registered output |
| Recovery | Preserved records, eligibility, safe retry/resume/cancel path, and exact outcome | Workflow-specific reusable checkpoints and valid partial outputs |

The author directs the task; named roles and workers produce outputs. The
application displays their records and enforces registered control boundaries.
It cannot turn a stage summary into a WorkUnit, invent an execution dependency,
declare a worker successful, or promote a result because its progress bar ended.
Profile-specific stage names do not create a parallel Work or approval lifecycle.

The primary durable identity is the canonical WorkUnit bound to the exact action
and input. A stage may contain several calls or attempts; a call is not
automatically a separate author-facing task. If a registered workflow composes
several WorkUnits, its runtime-owned composition identifies the task's members,
dependencies, and control scope. Without that composition, the UI lists the known
WorkUnits separately rather than fabricating a parent identity or overall outcome.
Shared dependencies retain their actual ownership and other consumers.

The task has three separate outcomes: operational execution, whether the expected
outputs are available and usable, and whether any resulting candidate was applied
through Review. Success in one does not imply success in the others. A failed
validation run is distinct from a successfully executed validator finding a domain
problem. Already authorized policy application, if present, names its separate
decision and command receipt; Work completion itself grants no new authority.

### Work collection and task-detail hierarchy

The first-class Work route resolves the current Project and profile and exposes
existing tasks before offering a new action. Contextual entry from Graph, Sources,
Review, Composition, a Petra thread, or the Brief opens the exact task and relevant
stage/result with its origin intact. A deep link rechecks the exact permitted
identity under DB04. Closing Work or switching Project does not cancel execution.

The collection uses task rows with recognizable objective, current condition,
stage/blocked reason, required input, elapsed time, available cost/limit summary,
and exact result or recovery destination. Attention-requiring tasks lead under
DB07's consequence rules. Active tasks and terminal tasks remain reachable through
named filters; a retained failure is not hidden merely because it is old. Filter
counts describe authorized membership and disclose partial/unknown totals. Opening
a row resolves the same identity shown in the dock, thread, or Brief.

The task detail has one logical reading order:

1. objective, expected/actual outcome, status, Project, origin, and return;
2. any required input or material blocker, with its consequence and scope;
3. current stage and the remaining plan, including parallel/dependent stages;
4. limits, elapsed/estimated time, resource use/cost, and available controls;
5. produced results, their completeness/validation, and useful destinations;
6. expanded stage activity, exact basis, attempts, checkpoints, and history.

Required input leads while a decision is blocking the task. At a terminal outcome,
the result or failure explanation occupies that same prominent task area. One
current or attention-requiring stage expands by default; authors can inspect any
other stage without automatic recollapse or being pulled back by new activity.
Several concurrent stages show their actual status; the UI does not pretend they
execute in the reading order of a linear list.

Each stage names its purpose, prerequisites, accountable role, current condition,
input revisions, produced outputs, applicable limits, and unresolved findings.
**Show activity** exposes observable tool/query/validator/model runs, attempts,
timestamps, checkpoints, and errors. **Show dependencies** opens the complete
permitted execution structure with an equivalent ordered dependency list.
Node placement cannot infer prerequisite order, control ownership, or success.
Selecting a stage or run opens exact Details without changing its execution.

### Responsive and accessible presentation

| Presentation | Required behavior |
| --- | --- |
| Wide | Work collection uses readable rows; task detail gives the plan/stages primary space with one contextual Details or Petra panel by default. Dependency view is deliberate. |
| Medium | Secondary navigation collapses and task fields wrap. Required input, current stage, cost/limits, and control consequences remain visible without shrinking the plan into an illegible diagram. |
| Narrow/high zoom | Collection and task detail reflow to one column. Details and Petra open full-width with exact return; dependency structure is available as a textual list. Stage expansion and task controls remain complete. |

Task and stage headings, status, dependencies, progress, required input, outputs,
and controls have textual names and a stable reading order. Keyboard selection,
stage expansion, dependency inspection, input response, source/result navigation,
and return work without drag, hover, color, animation, or spatial memory.
Opening a task focuses its heading or an explicitly invoked input request.
Opening Details or an input form moves focus deliberately and closing it returns
to the invoking control or nearest surviving task target.

Stream updates never steal focus, reorder the active row under the pointer, or
force scroll. A concise live announcement identifies a meaningful stage change,
new required input, or terminal outcome; it does not read every tool event or
token. Authors can stop visual follow/auto-scroll while Work continues. Reduced
motion uses static progress and stage changes; forced colors retain text labels,
focus, and boundaries. Resized panels, enlarged text, and touch retain the same
actions and consequence language under DB14/DB16.

### Execution, progress, and required input

Work status is a composition of canonical facts, not one client-generated enum.
The view separates execution lifecycle, required input/dependency condition,
connection/replay state, and result/review status. Several conditions can coexist:
a dependency can fail while another stage runs, or an execution can finish while
its candidate still needs a decision. The task overview names the condition that
changes the author's next action and keeps the others inspectable.

| Canonical fact or condition | Required presentation |
| --- | --- |
| Requested/queued | Task received or waiting to start, with a known queue/dependency reason if supplied; do not claim a queue position or start time without data |
| Running | Actual active stage(s), observable activity, elapsed time, and current limits; no simulated progress |
| Checkpointed | A valid retained checkpoint is recorded; this alone does not mean execution is paused or resumable |
| Required input | Exact unresolved input record and affected stage/task, why it is needed, permitted responses, and what continues or waits |
| Dependency blocked | Missing/failed prerequisite and affected successors; unrelated work is not labeled stopped unless the runtime reports it |
| Terminal succeeded | Operation succeeded; name outputs, limitations, validation, and the separate Review state |
| Terminal failed | Actual failure kind and affected stage/attempt, retained permitted outputs, and eligible recovery; the canonical `completed` lifecycle value alone cannot render as success |
| Cancelled | Canonical cancellation outcome, stopped scope, retained permitted outputs, and any independent/shared work that continues |
| Connection unavailable | Last known task revision and observation time; execution may continue and its terminal result remains unknown until resolved |

Progress describes observable work. Completed-stage or processed-item counts name
their denominator and plan/input revision. They are not estimates of elapsed-time
completion unless the runtime supplies a justified estimate. Unknown duration
stays unknown. Optional, skipped, superseded, failed, and cancelled stages retain
their distinct reasons; they are not all counted as successful. A retry has its
own attempt record rather than making the earlier failure disappear.

Input requests preserve DB06's distinction among clarification, capability,
budget, validation judgment, and Review approval. Each has exact identity/revision,
scope, question, available responses, consequences, safe waiting behavior, and a
permitted exit. The same request displayed in Work and Petra resolves once through
its canonical adapter. Stale, already answered, superseded, or unauthorized input
shows its actual disposition rather than offering a second active answer form.
Responding to clarification cannot implicitly approve a ChangeSet or broaden a
capability. **Decide later** affects only the request's permitted disposition and
never implies that waiting Work resumed.

### Resource and output inspection

The overview distinguishes elapsed time, an estimate with its basis, measured
usage, authorized limit, and an unknown or pending amount. Stage detail identifies
the producing attempt/model/tool and measurement source. Task totals deduplicate
canonical usage records and disclose incomplete coverage, retries, shared work,
and whether values are estimates or measurements. Counts, tokens, or a model's
language cannot manufacture a price or guaranteed finish time.

Budget pressure and resource exhaustion name the affected boundary and available
response. Continued conversation cannot silently grant a new capability or expand
an authorized spending limit. Existing approved retries and limits remain
inspectable. A clear steering instruction inside those limits follows the
acknowledged operational command path below; additional authorization is requested
only for a real unresolved boundary. A numeric display does not imply an editable
budget or a currently implemented command.

Outputs are exact immutable references with producer, task/stage/attempt, input
basis, creation time, status, validation, and limitations. A partial output can be
shown only when the canonical manifest and partial-result policy permit retention
and the output is actually available. `discard`, `retain_declared`, and
`retain_diagnostics` are distinct: logs or diagnostic fragments cannot become a
usable result by being visible. Inspecting retained content grants no approval.

Answers return to their originating task; domain candidates route to the same
Review identity; draft/artifact work opens its exact Composition or source/output
destination; failures retain their Work and attempt records. A link to a newer
output or object is explicit and never silently substitutes for the output being
inspected. Source, Graph, Review, and Composition inspection preserve the selected
task/stage/result and return focus.

### Existing control and recovery boundaries

| Control | Meaning already established by DB06 and the runtime boundary |
| --- | --- |
| **Stop response** | Stops the delivered response at its supported boundary; never substitutes for a Work cancellation command |
| **Keep running in background / Return to [origin]** | Changes presentation or detaches from live delivery; the task retains its durable identity and authorized execution |
| **Reconnect** | Resolves durable status and replays from the known position; it does not start a new task, answer an interrupt again, or repeat a command |
| **Cancel work** | Requests the exact supported operational cancellation; show its current eligibility, affected task, retained-output policy, and known consequences |
| **Retry failed work** | Only when runtime eligibility, attempts, dependencies, capability, and unchanged exact inputs permit; creates the next recorded attempt, preserving the failed one |
| **Resume work** | Only if a registered operation validates the checkpoint and exact input/context; a visible checkpoint or a reconnected stream alone is not evidence of resumability |

The current WorkUnit cancellation policy distinguishes cancellable work,
checkpoint-before-cancellation, and atomic work. The client cannot promise an
immediate stop, queue an unsupported future stop, or invent a general Pause
command. **Cancellation requested** may be shown only when a runtime record
supports that pending state. **Cancelled** requires a terminal receipt; a race
with completion resolves to the actual recorded outcome and never retries the
cancellation blindly. An unavailable action exposes its reason and valid recovery.

Cancellation is operational history. It does not reverse accepted changes, erase
outputs, refund incurred cost, or terminate a shared dependency by implication.
Applied effects, if any, remain separately inspectable and use DB09's governed
Revert. A retry of failed Work cannot be used to apply a result twice. Restored or
offline views preserve last-known facts and input drafts but do not invent an
execution command queue while authorization or current state is unknown.

### Backend read needs and contract check

Existing `WorkUnit`, immutable worker input/output manifests, per-attempt outcomes,
dependency references, resource limits, partial-result policies, and cancellation
receipts provide the core operational records. `WorkUnitAuthorityRepository`
retains revisions and manifests and exposes exact state transitions and
cancellation. `WorkUnitRegistry` enforces dependency readiness, retry limits, and
cancellation policies. Interaction replay and durable Review responses remain
behind Petra's interaction adapters.

These records do not establish the complete Project Work collection and task/stage
read composition required by the accepted presentation: stable stage membership,
declared dependency structure, attention/input and result summaries, observation
freshness, reconciled resource use, and safe semantic destinations.
`UX-REQ-014` requests that read boundary using existing canonical records,
including the distinction between actual prerequisites, contextual advice, and
the author's selected branch order. It does not add an operational lifecycle.

`UX-REQ-015` records the missing generic steering/plan-revision and branch-priority
command composition: exact interpretation, authorized direct instruction,
validated reuse, active-stage transition boundaries, shared dependencies,
idempotent outcomes, and the available retry/resume/cancellation mappings.
Its smallest viable response must map existing operations before adding new ones.
No generic Pause, checkpoint-resume capability, recursive cancellation, or spend
increase is claimed from fields in a WorkUnit or a graph of its dependencies.

`UX-REQ-016` supplies the distinct Project inquiry mapping, basis/status and
recommendation context, and exact links to zero or many Work tasks. UX-REQ-014
can consume those references in task detail; UX-REQ-015 remains an operational
transition request. Neither replaces an inquiry with a WorkUnit or derives its
resolution from execution outcomes.

The client owns local filters, selection, disclosure, panel layout, unsent input,
and return context. Runtime contracts own task membership, plan/stage meaning,
progress, eligibility, required input, resource accounting, results, and control
outcomes. `UX-REQ-003` remains the start/preview boundary; `UX-REQ-004` supplies
registered profile vocabulary; `UX-REQ-006` supplies thread/context linkage;
`UX-REQ-008` supplies safe destinations; and DB09 governs result Review.

### Accepted direct steering and plan revision

A clear instruction can change the task's execution scope, order, inputs, or
expected output within the author's existing authority and limits. The supported
operational command acknowledges the interpreted change, affected stages, reuse,
and when it takes effect. It does not ask the author to approve the same clear
instruction again merely because it creates a new plan revision. A question about
possible work, tentative suggestion, ambiguous reference, or quoted source text
does not itself instruct a change.

The system asks when the instruction leaves a consequential ambiguity or would
require authorization not already given: an uncertain target revision, a new
capability, spending beyond the authorized limit, or an additional consequence
the instruction does not clearly authorize. It presents the exact unresolved
choice and its effects. Material facts remain visible even when no extra
confirmation is needed. Reviewing a suggested change is different from directing
one: an unrequested model recommendation never becomes an execution instruction.

Direct controls and explicit conversational steering resolve to the same
authenticated, revision-bound operation. The application records the actual
instruction, producing interpretation when applicable, exact task/plan/input
references, operational effect, and outcome. The instruction does not edit an
immutable input manifest or a running worker's consumed context by implication.
It cannot approve a domain ChangeSet or bypass DB09's separate commitment path.

Revise affected work and retain exact earlier records. Reuse requires compatible
input revisions, dependency results, validation and resource policies; it is a
runtime decision with an inspectable basis. Changed inputs may require new
manifests, replacement WorkUnits, validation, or a new attempt according to the
canonical workflow. The task view retains lineage across those records rather
than overwriting the old plan or fabricating a client-only continuation identity.

The acknowledgment or unresolved-choice preview identifies:

- the interpreted instruction and revised objective, scope, or order;
- compatible outputs to reuse and affected stages to replace or rerun;
- what happens to each affected running stage at its supported instruction,
  checkpoint, cancellation, or atomic completion boundary;
- the effective revision and point at which successor scheduling changes;
- remaining outputs, exclusions, known time/cost effects, and authorized limits;
- any independent/shared work that continues; and
- the recorded outcome or precise pending/failed transition and recovery.

Preparing a recommendation or asking about alternatives does not change the
active plan. A submitted instruction shows **Updating work** until its canonical
outcome is known. The runtime orders the transition against ongoing execution so
superseded successors cannot start under an apparently updated plan. An active
atomic stage may need to finish; a required checkpoint may be unavailable. The
view states that boundary and the effective timing rather than claiming an
immediate change. If the runtime cannot support the requested transition, it
offers the available bounded stop, completion, or new-task path without silently
running a different instruction.

A stale or failed steering operation reports which effects, if any, were recorded
and what remains active. It re-resolves status before retry or another plan change.
One exact idempotent command is not resubmitted as a new instruction after a lost
connection. Dependent command sequences report per-operation outcomes rather than
claiming atomicity that their contracts do not supply. An unresolved instruction
does not silently consume authorization for new work.

In the invented passage example, **Check continuity only** narrows the running
requirements check. Compatible collection/dependency work is reused, affected
validation follows the revised input at a supported boundary, and earlier findings
retain their original scope. The acknowledgment names the omitted checks. The
eventual result says **Continuity check completed** and identifies unchecked or
partly checked requirements; it does not claim the original full check succeeded.
**Use the latest passage instead** requires resolution of an exact revision and
reuse assessment; it asks only if a consequential choice or authorization remains
unresolved. **Start again** deliberately requests fresh execution, names whether
existing Work continues or stops, and preserves prior history and incurred cost.

### Dependency hierarchy and contextual branch recommendations

The author's primary hierarchy concerns Project lines of inquiry, as clarified in
`UX1.6-DISC04`: ongoing directions of reasoning that can span several tasks and
need not be Hypotheses. Work detail identifies which inquiry or inquiries its
exact task addresses and offers a return to their basis and open questions.
Inquiry context remains available when there are no tasks or all linked tasks
have finished. One Work result can inform several lines without being duplicated
or declaring all of them resolved.

Within a Work task, the author can also inspect execution stages, branches, and
shared prerequisites. In the operational rules below, **execution branch** means
a named part of a registered workflow. Its scheduling priority is separate from
the Project-level recommendation about which inquiry would be useful to explore.
Shared prerequisites retain one identity and do not become duplicate work because
they appear under several parents. The existing source-version A/B/C/D example
illustrates this narrower execution case, not the definition of inquiry.

The interface distinguishes three facts:

| Meaning | User-facing treatment | Effect of author choice |
| --- | --- | --- |
| Actual prerequisite | **Requires [input/stage]** or **Waiting for [dependency]**, with the owning workflow or control rule and exact missing condition | The dependent operation cannot execute until the real prerequisite is satisfied; offer eligible preparation, independent work, or the prerequisite task |
| Contextual recommendation | **Recommended next**, followed by a concise reason tied to the current objective, known dependencies, uncertainty, likely rework, or resource limits | Advisory; another eligible branch can be chosen without an override ceremony or negative status |
| Other eligible branch | Its purpose, readiness, known consequence, and **Work on this next** | Honor the explicit instruction within existing authority and limits, acknowledging scheduling effects |

Project relationships and model assessments may inform advice. They do not
automatically become execution prerequisites. An inferred dependency remains
attributed and uncertain until its applicable canonical validation/authority
boundary is satisfied. A model's preference, a lower ranking, or a domain
disagreement is not a capability denial or a blocked WorkUnit.

Recommendation basis identifies the actual producer or rule, current objective,
input/plan snapshot, relevant dependency paths, reason, and material uncertainty.
It may explain **This supplies an input for two waiting checks**, **This can reduce
rework on the current objective**, or **This independent branch fits the remaining
budget** when the available records support that claim. No universal priority
score or invented Project-risk rating substitutes for that explanation. A stale
or unsupported recommendation is labeled or absent; eligible work remains usable.

For an invented task, resolving source version A is a prerequisite for checks B
and C, while a wording pass D is independent and authorized. The recommendation
can read **Resolve the source version first; two checks need it**. If the author
chooses D, the acknowledgment reads **I'll work on the wording pass next. The two
checks still await the source version.** This is a valid alternate order and may
have no detrimental effect on the overall Project. The interface does not add an
**At risk**, **Blocked**, or failure state merely because the recommendation was
not followed. If a real consequence exists, it names the affected output or task
and supporting reason rather than warning vaguely about the Project.

**Open branch** inspects; **Work on this next** directs eligible scheduling. The
latter is not a request to cancel every other branch, serialize all concurrent
work, or change Project-wide policy. A new task outside the existing authorized
scope follows DB06's bounded action path. Choosing an eligible branch cannot
bypass its actual prerequisite, but it can select independent preparatory work
that has its own valid operation and clear completion condition.

These are execution controls. **Explore this inquiry** instead opens its current
basis and bounded conversation context. It may produce a useful answer without
starting Work. If new investigation is needed, the exact action binds the inquiry
and its open question through DB06; linked results return to that inquiry with
their actual scope, uncertainty, and Review status. Merely choosing an inquiry
does not reprioritize, cancel, or launch its associated tasks. An explicit request
to execute or steer still follows the accepted direct-instruction boundary.

The accepted choice stays effective for its task/plan scope until the author
changes it or material new facts require re-evaluation. The former recommendation
can remain inspectable without repeated prompts, automatic priority resets, or
warning styling. A new recommendation explains what changed and does not itself
reschedule work. Selecting another branch or changing priority grants no additional
capability, budget, domain approval, or cancellation authority.

### Required state and recovery matrix

The matrix applies to Project collection, task detail, expanded stages, dependency
inspection, and contextual summaries. Each representation preserves the same
identity, observation revision, control consequence, and exact outcome.

| State | Visible meaning | Required path |
| --- | --- | --- |
| No Work | No task in the selected Project/filter; distinguish empty Project from no matching rows | Clear filters, return to origin, or open a profile-valid SuggestedAction; no artificial task |
| Inquiry has no active Work or linked Work is complete | Inquiry identity, current understanding, and unresolved questions remain distinct from its task list | Return to inquiry context, reason from existing basis, or prepare bounded new Work; no automatic resolution or abandonment |
| Preparing action/plan | Objective and readiness are being resolved; nothing claims to be running | Inspect available context, adjust unsubmitted input, defer, or stop the response |
| Action ready or stale | Exact objective, input, output, scope, cost/limits, and control consequences, or changed prerequisites | Start the authorized exact action, revise it, regenerate stale input, or return |
| Requested/queued | Durable task received and waiting, with known prerequisites/resource condition | Inspect, leave running where applicable, direct another eligible branch, or use supported cancellation |
| Running | Actual active stages and attempts with observable progress and known limits | Inspect activity/basis, steer, detach, or cancel at the declared boundary |
| Dense/concurrent/dependent | Several stages, tasks, or shared prerequisites; grouped counts and actual simultaneous states | Filter or expand, inspect the full dependency list/graph, and select without changing execution |
| Recommended branch differs from selected branch | Reason for advice and the author's valid selected priority remain distinct | Continue chosen eligible work; inspect or revisit advice deliberately; no override warning or failed state |
| Actual dependency blocked | Exact unmet prerequisite and affected successors; independent stages retain their own state | Inspect/resolve the prerequisite, run eligible preparation or another branch, or cancel applicable work |
| Awaiting clarification/capability/budget/judgment | Exact request, affected scope, permitted responses, and what continues or waits | Respond once, inspect basis, decide later where supported, or cancel; new authority uses its owning command |
| Awaiting Review decision | Work produced a candidate or encountered a real Review boundary; execution and review outcomes remain separate | Open exact Review, correct, reject, defer, or apply through DB09; selection/chat alone is not approval |
| Steering pending or applied | Interpreted instruction, affected scope, transition timing, and recorded outcome | Inspect acknowledgment, wait for the declared boundary, or continue unaffected work; no optimistic claim of application |
| Steering ambiguous/unauthorized/stale | Exact unresolved target/consequence/limit or changed revision | Resolve the named issue or refresh the proposal; retain the active plan and report any already recorded effects |
| Steering partly effected/failed | Per-operation outcomes and actual remaining active plan are known or explicitly unresolved | Reconcile command/task status, then use eligible exact retry or prepare a new revision; no hidden rollback claim |
| Checkpoint recorded | Exact retained checkpoint and input/attempt basis | Inspect or use an explicitly supported resume/cancel operation; do not infer paused state |
| Cancellation pending or unavailable | Receipt-backed pending state or actual checkpoint/atomic/shared-control limitation | Await a supported boundary, inspect outcome, choose the available stop/completion path, or return; no invented queued cancellation |
| Cancellation raced with completion | Actual canonical terminal outcome, outputs, and cost; request acknowledgment alone is not cancellation | Inspect the outcome or remaining independent work; do not submit a duplicate command |
| Disconnected/reconnecting/replaying | Last known task revision, observation age, and connection state; Work may continue | Reconnect and replay idempotently, open durable Work, or inspect permitted cached facts |
| Offline/stale view | Cached permitted task/output data and age; current control eligibility unknown | Inspect read-only, preserve unsent instructions, reconnect/re-resolve before commands |
| Partial output | Exact available outputs and retention policy, missing/failed stages, and usability limits | Inspect permitted results, retry eligible failed work, revise scope, or stop; never promote diagnostics into a result |
| Worker/model/validation/resource/timeout failure | Actual failure, attempt, retained outputs, incurred usage, and retry eligibility | Retry unchanged eligible input, resume a valid checkpoint if supported, revise input/start follow-on work, or return |
| Model/worker substitution | Actual accountable role/provider/version and any change to eligibility, capability, limits, or output validity | Inspect substitution; proceed only under supported routing and existing authorization or resolve a real new boundary |
| Completed successfully | Exact expected outputs and limitations; separate domain finding and Review status | Open answer, source/result, Composition, or Review and return to origin |
| Cancelled | Exact stopped scope and terminal receipt, retained output/diagnostics, incurred cost, and continuing shared/independent work | Inspect, start a deliberate follow-on task, or return; applied changes remain separate |
| Superseded plan/input/output | Newer exact revision/lineage and whether old work remains useful, running, or historical | Inspect either permitted revision, resolve current explicitly, or use validated reuse; no silent substitution |
| Missing/restricted/unsupported task or workflow | Permitted identity and limitation only; no fabricated plan or control | Open a permitted parent/Project, resolve access or supported workflow, or return to Brief |
| Read/command error | Affected request, preserved input/view, actual or unresolved effects, and valid recovery | Retry a bounded read or reconcile exact command outcome before any new submission |

### Interaction and path register

Every path retains Project/profile, objective, exact task/stage/input/output,
origin and return focus, applicable Work/InteractionRun/command revisions, and
permitted unsent input. The state matrix supplies the ordinary, dense, partial,
stale, failed, interrupted, offline, and recovery branches for every path.

| Path | Trigger and preconditions | Feedback, commit, and completion | Exit, preservation, and focus |
| --- | --- | --- | --- |
| `DB11-P01` Preview and start | Direct action or explicit task request; exact ready scope and valid authorization under DB06 | Show bounded action, invoke once, and resolve durable Work; start changes operational state only | Defer unsubmitted action, correct stale scope, or open running task; retain origin and submitted identity |
| `DB11-P02` Open and inspect Work | Collection/contextual/deep link to an authorized task | Resolve exact task and stage, then inspect plan, activity, dependencies, inputs, outputs, and cost; read only | Return to invoking item/focus; missing/stale/unsupported resolution follows DB04 |
| `DB11-P03` Choose a branch | Inspect recommendation and eligible alternatives; explicit **Work on this next** or conversational instruction | Acknowledge chosen branch and scheduling effects through the operational path; valid non-recommended order is accepted without another confirmation | Inspect other branches without steering; maintain chosen priority and exact prior/updated plan history |
| `DB11-P04` Clarify or steer | Clear directive to an exact task within current authority, or an instruction with an unresolved material boundary | Validate interpretation and reuse, issue supported command, expose effective revision/timing; ask only for the unresolved consequence/authorization | Preserve unsent input or reported active plan; reconcile stale/failed/partial transitions before retry; announcements do not steal focus |
| `DB11-P05` Resolve required input | Exact pending clarification, capability, budget, validation, or Review request | Display question/consequences and resolve once through its canonical adapter; Review authority remains DB09-owned | Inspect basis and return, decide later where valid, or cancel applicable Work; focus returns to request outcome/stage |
| `DB11-P06` Detach and reconnect | Leave route, collapse Petra, switch Project, lose stream, or choose reconnect | Preserve durable execution; re-resolve status and replay from a known position without starting another task | Open durable Work independently; retain input/selection/scroll; unresolved status remains explicit |
| `DB11-P07` Cancel Work | Explicit cancellation of eligible exact task/branch scope | State active boundary and consequences, submit idempotently, then show canonical pending/terminal outcome and any continuing work | Leave after request without changing its meaning; race/failure resolves from receipts; cancellation does not Revert domain state |
| `DB11-P08` Retry, resume, or start again | Runtime eligibility for unchanged retry, exact compatible checkpoint, or deliberate fresh execution | Show retained/reused inputs and outputs, limits and effects; record new attempt or linked execution according to the operation | Failed history and original source survive; incompatible or exhausted paths offer revised input or stop; no hidden continuation |
| `DB11-P09` Inspect and use result | Available permitted exact output from successful, partial, failed, or cancelled Work | Show origin, scope, usability, validation, and limitations; route to answer/source/Composition/Review as appropriate | Return to result/stage and origin; applying a candidate uses separate DB09 command and projection outcome |
| `DB11-P10` Inspect execution history | Plan change, attempt, checkpoint, command, input response, or result lineage selected | Show exact prior and current records, responsible actor/role, and operational versus domain effects; read only | Resolve current explicitly for new instructions; return to selected event/task without rewinding work |
| `DB11-P11` Explore inquiry and use Work | A Project inquiry is selected with exact question/basis context; explicit execution request only when Work is needed | Inspect or discuss existing basis without scheduling; bind any bounded task to its inquiry references; return outputs with exact scope, uncertainty, and Review status | Preserve inquiry focus and related lines across task/source/Graph inspection; cancelled or completed Work does not silently abandon or resolve the inquiry |

Routine expansion, inspection, filtering, branch selection for viewing, and
navigation require no confirmation. A clear authorized Work instruction also
does not acquire a second approval step solely because it was conversational.
Actual new permission, consequential ambiguity, and authoritative domain change
keep their existing exact decision boundaries.

### Language ledger and status copy

The following labels use DB04/DB06/DB09, canonical operational records, and
`UX1.6-DISC02`–`DISC03`. Profile-owned stage, requirement, finding, and result
names require registered meaning under `UX-REQ-004`. These are paper-specified
terms; post-freeze evidence must verify comprehension and accessible rendering.

| Canonical meaning | User-facing term / allowed short form | Must not imply | Surfaces and owning boundary |
| --- | --- | --- | --- |
| Durable bounded task | **Work**, with the recognizable objective as title | Conversation thread, one model call, or accepted domain truth | Work/Brief/Petra; WorkUnit and DB06 |
| Project reasoning direction | **Line of inquiry**, **Explore this inquiry**, or a registered profile-specific name | Necessarily a Hypothesis, WorkUnit, conversation branch, or execution prerequisite | Brief/Project map/Details/Graph/Petra/Work context; DISC04 and UX-REQ-016 |
| Observable workflow stage | Profile-valid stage name, **Show activity**, **Show dependencies** | Private reasoning, invented task membership, or a mandatory serial order | Task detail/activity; registered workflow and UX-REQ-014 |
| Actual prerequisite | **Requires [input]**, **Waiting for [stage]** | A model preference or a global Project failure | Task/stage/dependency view; canonical workflow/control rule |
| Advisory ordering | **Recommended next**, with reason | Required order, granted authority, or a risk warning for another valid choice | Task/branch/Petra; contextual recommendation and DISC03 |
| Execution direction | **Work on this next**, explicit task instruction | Merely opening a branch, cancelling all others, or accepting a result | Task/branch/Petra; UX-REQ-015 operational command |
| Steering transition | **Updating work**, then a concrete acknowledgment of recorded scope/order/timing | Immediate worker interruption, new permission, or success before the command resolves | Task/Petra; canonical command outcome |
| Required response | **Needs your input**, with the specific question and consequence | Generic approval or proof that every stage has stopped | Task/request/Petra; exact input adapter |
| Retained execution position | **Checkpoint available** when actually recorded | **Paused**, **Resumable**, or a guaranteed restart point | Task/history; checkpoint and eligibility records |
| Operational cancellation | **Cancel work**, **Cancellation requested** only when recorded, **Cancelled** after terminal outcome | Stop response, deletion, refund, or Revert | Task/Petra/status; WorkUnit cancellation |
| Recovery | **Retry failed work**, **Resume work**, **Start again** | Identical input semantics, silent output reuse, or erased attempts | Task/failure/checkpoint; registered recovery operation |
| Terminal success/failure | **[Task] completed**, **[Stage] failed**, precise cancelled/partial outcome | All terminal states succeeded, validation findings are execution errors, or results applied | Task/result/Petra; terminal manifest and Review |
| Retained partial content | **Partial result**, **Diagnostics**, **Unavailable output**, as applicable | Complete or reusable result merely because text is visible | Result/activity; exact output and retention policy |

Ordinary acknowledgment can say **I'll check continuity only. The collected
requirements are reusable; other checks will remain incomplete.** If the active
stage must finish, add that fact and the effective point supplied by the runtime.
A valid alternate priority says **I'll work on [branch] next** with any relevant
waiting dependency. It does not say **Override recommendation**, **Proceed at
risk**, or **Are you sure?** merely because another branch was recommended.

Errors state the actual effect and recovery: **The instruction could not be
applied because the task changed. The current plan is [revision/description].**
An unresolved result says **The connection ended before the outcome was confirmed**
and offers **Check work status**. A request to exceed an authorized limit names
the additional amount/scope when known and its decision boundary. Unknown prices,
durations, effects, and restricted details are not filled in to make copy fluent.
Exact identifiers and diagnostic records remain available through inspection.

### Nielsen and dangerous-misunderstanding paper audit

| Heuristic | DB11 resolution |
| --- | --- |
| Visibility of system status | Execution, input/dependency, delivery, output usability, Review, and pending operational changes are separately identifiable |
| Match with the real world | Objective and meaningful stages lead; branch advice explains its local purpose in profile vocabulary |
| User control and freedom | Clear authorized instructions steer directly; eligible alternate branches, detach, exact cancellation, recovery, and return remain available |
| Consistency and standards | Work, Brief, Graph, Sources, Composition, and Petra resolve the same tasks, commands, requests, and outputs |
| Error prevention | Real prerequisites and authority boundaries remain enforceable; recommendations do not become gates; reuse and plan cutover are runtime-validated |
| Recognition rather than recall | Current stage, chosen branch, recommendation reason, pending input, output scope, limits, and return origin remain visible |
| Flexibility and efficiency | Compatible work can be reused, stages expose detail on demand, clear steering avoids duplicate confirmation, and the full dependency view remains available |
| Aesthetic and minimalist design | One task/decision leads with compact stage summaries; tools, attempts, raw diagnostics, and technical identity stay inspectable |
| Error recovery | Exact command reconciliation, retained attempts, supported checkpoints, partial-output policy, stale-plan resolution, and cancellation races preserve honest outcomes |
| Help and documentation | Contextual explanations distinguish required/recommended order, checkpoint/pause, retry/resume/new execution, operational success, and domain acceptance |

The paper audit walks `DB11-P01`–`P11`, the state matrix, the narrowed passage
check, the A/B/C/D execution example, and the parallel criteria/alternatives
inquiries in both profile roles. It checks the specified reading order and
textual control equivalents against the accepted
authority and interaction contracts. It does not claim executed fixtures,
measured accessibility/performance, or observed participant comprehension.

| Finding | Location/evidence and consequence | Severity | Disposition, owner/gate, and verification |
| --- | --- | --- | --- |
| `DB11-A01` Recommendation could become a false gate | Branch ordering and dependency presentation could label an eligible alternate choice blocked or risky | Major | Fixed in specification: actual prerequisites, advice, and eligible alternatives are distinct; chosen priority persists; paper paths P03/P04 checked; participant verification remains in UX-FX27 |
| `DB11-A02` Repeated approval for clear steering | Earlier pending proposal asked for a preview on every material plan change, even when the instruction already authorized it | Moderate | Fixed by accepted DISC03: acknowledge clear supported direction within limits; ask only for unresolved meaning/consequence/authority; paper instruction examples checked |
| `DB11-A03` Terminal/checkpoint status conflation | Canonical completed can mean failure; checkpointed does not supply generic pause/resume | Major | Fixed in state/copy mapping using WorkUnit and WorkUnitRegistry; post-freeze UX-FX26 must exercise both distinctions |
| `DB11-A04` Missing composed Work view | Existing operational records do not supply complete stage membership, attention/input/result summaries, advice, or accounting coverage | Major | Needs contract: UX-REQ-014, implementation architecture; provisional synthetic read provider only after freeze; G-CONTRACT remains open |
| `DB11-A05` Missing generic steering and transition composition | Immutable manifests, narrow retry/cancel APIs, and dependency IDs do not implement safe generic plan changes, shared-branch scheduling, or resume | Major | Needs contract: UX-REQ-015, implementation architecture; explicit unsupported control boundaries until disposition; no claimed live command |
| `DB11-A06` Stage/dependency comprehension unmeasured | A paper hierarchy cannot establish whether users understand concurrent work, shared prerequisites, advisory order, and terminal outcomes | Moderate | Needs researcher validation: design owner, UX-FX26/UX-FX27 after freeze; any severe misunderstanding blocks G-VALIDATION |
| `DB11-A07` Inquiry conflated with execution branch | The earlier hierarchy described branches within registered tasks; the user clarified parallel Project lines of inquiry beyond Hypotheses | Major | Fixed in shared inquiry model, DB07/DB10/DB11, flow and roadmap wording; UX-REQ-016 records canonical mapping/linkage needs; paper path P11 and UX-FX28 check zero/many/shared tasks and unresolved inquiry after Work completion |

Acceptance fails if the author could reasonably believe that a recommended branch
is compulsory, another eligible priority jeopardizes the Project merely by being
different, a model-inferred dependency is a runtime prerequisite, opening a branch
changes execution, selecting a branch cancels all others, clear authorized steering
needs repeated assent, chat grants new authority, a stage change edits consumed
inputs retroactively, a checkpoint guarantees pause/resume, terminal means success,
validation findings mean execution failure, retained diagnostics are a usable
result, cancellation erased/refunded/reverted work, replay reruns it, a narrowed
task's success proves that the original larger objective is complete, every inquiry
must be a Hypothesis, a WorkUnit defines the inquiry's lifetime, or reasoning order
alone establishes an execution prerequisite.

### Acceptance criteria and post-freeze conformance evidence

DB11 is complete at specification depth with the following defined behaviors;
implementation and validation must demonstrate them after design freeze:

1. one canonical task identity supports collection/detail, contextual summaries,
   exact stage/activity/dependency inspection, and preserved origin/return;
2. the accepted task-and-stage hierarchy adapts to scientific and writing work,
   including concurrency and shared prerequisites, without a second lifecycle;
3. execution, input/dependency, delivery, output usability, and Review outcomes
   remain distinct in ordinary and adverse states;
4. contextual recommendations expose reason, basis, producer, and freshness,
   while actual prerequisites and other eligible branches remain distinguishable;
5. an explicit choice of another eligible branch is honored within current
   authorization, without warning styling, override ceremony, or priority reset;
6. clear authorized instructions use the supported operational command directly,
   with visible interpretation/effects and no duplicate confirmation; unresolved
   ambiguity, additional authority, and domain application keep exact decisions;
7. plan revisions preserve input/attempt/output history, validate reuse, and state
   effective scheduling and active-stage stop/checkpoint/completion boundaries;
8. partial or failed command transitions and stale instructions reveal actual
   effects and reconcile state before retry, with idempotent command identity;
9. input requests retain their type, scope, exact identity, safe waiting behavior,
   and single canonical response across Work and Petra;
10. progress, time, cost, limits, retries, shared usage, and unknown measurements
    remain honest and do not manufacture completion percentages or estimates;
11. detach, stop response, reconnect/replay, checkpoint, cancel, retry, resume,
    Start again, working restoration, and governed Revert retain distinct effects;
12. results retain exact origin/scope/validation/retention and route to the correct
    source, answer, Composition, or Review outcome without automatic approval;
13. every listed empty, dense, limited, running, blocked, awaiting-input, stale,
    failed, partial, offline, cancelled, and successful state has bounded recovery;
14. keyboard, screen-reader, textual dependency, touch, resized-panel, high-zoom,
    reduced-motion, and forced-colors paths preserve the complete task;
15. runtime gaps and paper findings have explicit owners/gates, while no product
    surface or command is implemented before UX-DESIGN-FREEZE-01; and
16. inquiry identity, basis, open questions, and advisory priority survive across
    zero, many, or shared Work tasks; hypotheses are optional inquiry anchors,
    selecting an inquiry does not schedule execution, and task completion does
    not silently resolve the inquiry.

| Scenario | Post-freeze evidence required |
| --- | --- |
| `UX-FX26` Paired Work task and stage inspection | Independently invented scientific and writing tasks show declared stages, concurrent/dependent activity, exact attempts, required input, progress and resource coverage, valid partial outputs, terminal success/failure, checkpoint/cancellation distinctions, reconnect/replay, and full responsive/textual/accessibility parity across entry points. |
| `UX-FX27` Contextual branch choice and Work steering | A real prerequisite feeds two stages while another branch is eligible; the author chooses the non-recommended branch without a warning or extra approval. Then exercise changed recommendation basis, preserved priority, shared dependencies, clear scope narrowing, exact new input, validated reuse and reruns, a genuine authorization/ambiguity question, active atomic/checkpoint boundaries, stale/partial/failed steering, cancellation/completion races, exhausted retry, unsupported resume, deliberate fresh execution, and result scope/return. Pair profile-specific meaning with the same control grammar. |
| `UX-FX28` Parallel Project lines of inquiry | Invent criteria, alternatives, method/interpretation, and optional Hypothesis-centered inquiries in two profiles. Explore alternatives before clarifying criteria without a false prerequisite; retain an inquiry with no active tasks, one with completed Work but open questions, multiple tasks over time, and one shared result informing several inquiries. Preserve basis, uncertainty, cross-links, advisory preference, exact Work/Review return, and graph/text/navigation parity without forcing a Hypothesis or WorkUnit schema onto every line. |

These are named paper scenarios, not existing fixtures or processed real-world
data. They must be independently invented and cannot derive from contextual demo
material or user assets. The full Work/interaction module remains in progress at
runtime gates despite DB11's specification closure. DB12 carries the accepted
inquiry and Work boundaries into Composition and revision; the author can still
refine this design before the explicit whole-product freeze.

## DB12 — Composition and revision

**Status:** document-first workspace direction accepted on 2026-09-06 as
`UX1.7-DISC01`; working-copy export with unresolved findings accepted on
2026-09-07 as `UX1.7-DISC02`. DB12 is complete at specification depth with a paper audit.
Runtime contract, implementation, integration, and participant validation remain
separate gates. No product surface, editor, renderer, fixture, or backend contract
is implemented, and `UX-DESIGN-FREEZE-01` remains unaccepted.

### Author task and product role

The author develops an artifact from a purpose, existing material, and one or
more lines of inquiry, then revises it without losing manual work, provenance,
uncertainty, or source ancestry. Composition owns the document workspace. Petra
assists in the context of the selected passage, section, or whole artifact.
Sources, related inquiries, validation findings, and revision comparisons are
available alongside the document when needed.

A document can be a bounded passage, outline, table, report, or a longer artifact
supported by its profile. This design does not turn every inquiry into a document
section or require inquiry resolution before drafting. Several inquiries can
inform one section; one inquiry can inform several artifacts. The selected
document scope and its inquiry context are explicit and independently inspectable.

The scientific profile uses evidence, scientific force, source-version citations,
and research artifacts. Controlled writing uses its registered manuscript,
creative constraints, continuity, voice, and revision rules. Shared controls
preserve identity, source protection, authorship, exact revisions, Work, Review,
and recovery. Scientific support classifications and citation requirements cannot
be imposed on every sentence of a creative manuscript.

### Information hierarchy and entry

| Place | Leading information and actions | Context preserved |
| --- | --- | --- |
| Composition collection | Recognizable artifact purpose/title, selected or latest available revision, draft or promoted status where supported, outstanding findings, and last meaningful activity; resume or create | Project/profile, origin, filters, and selected artifact; recency alone does not imply readiness |
| Document header | Artifact title and purpose, current revision or working-copy state, save acknowledgment, validation coverage, and relevant actions | Exact revision, author/model origin, imported ancestry where applicable, and return target |
| Primary document | Readable editable content with caret/selection, optional outline, and restrained markers for material findings | Working text, selection, scroll, and document structure |
| Contextual Petra | Instruction plus explicit passage/section/document scope, included basis and inquiry references, exclusions, and task outcome | Exact submitted content revision and scope; later selection changes do not retarget active Work |
| Contextual Details | Exact selected statement, source/inference/author origin, basis, limitations, citation meaning, and links to related inquiry or source | Document location and a reliable return after inspecting an exact source |
| Validation or comparison | Findings ordered by consequence, affected passage, reason and available remedy; exact before/after content and meaning changes | Working text and active selection; inspecting a finding does not accept a revision |
| Revision and output inspection | Exact selected prior revision, ancestry, producer, assessment, renderer/format, and recorded output | Explicit historical or current position, with return to the working document |

Contextual entry from Brief, an inquiry, Work result, Sources, Review, or Petra
opens the exact artifact/revision and passage when one exists. If no artifact
exists, entry carries a bounded composition intent instead of pretending a
document is already saved. A Work result opens its actual output even when a
newer document revision exists; it must not silently replace the current draft.

Direct entry lists available documents and offers a profile-valid new document
or use of an existing permitted source. A blank working document is an authoring
state; it must not fabricate Claims, evidence, a successful CompositionPlan, or a
canonical DraftArtifact with impossible empty-span fields. The author can write
manually and add basis later. `UX-REQ-018` records the required working-copy
boundary where existing contracts cannot yet express it.

### Document-first responsive blueprint

The document receives the primary reading and editing area. A compact title,
revision/save status, findings summary, and relevant actions precede it. An
outline can be disclosed for navigation; it does not compete with the document
as a second primary task. Whole-document controls and selected-text actions have
different scope labels. No ribbon full of unavailable formats or future tools
is required.

On a wide viewport, one contextual secondary panel is expanded by default:
Petra, Details/basis, or findings. A second panel requires explicit pinning and
sufficient space under DB04. Replacing the secondary panel preserves Petra's
unsent instruction and the document's selection and scroll. A pending instruction
retains its stated context until explicitly changed; it does not follow every
caret movement.

Comparison temporarily becomes the primary task. It names the exact base and
proposed revisions and shows aligned passages when useful and space permits.
A sequential textual comparison supplies the same additions, removals, changed
meaning, findings, and actions. Returning from comparison restores the document
position rather than opening a new unrelated workspace.

At narrow widths or high zoom, document, Petra, source inspection, findings, and
comparison use full-width contextual routes with explicit return. Essential
scope, save status, and unresolved findings remain available without simultaneous
panels. Text reflows; wide tables or profile-specific structures retain labelled,
keyboard-accessible local scrolling or a supplied equivalent.

Long documents use the outline, search, and exact passage navigation to keep the
author oriented. Loaded content, selected scope, and requested whole-document
scope remain distinct. A partially loaded view cannot silently redefine
**Whole document** as the visible paragraphs. Work and output use exact runtime
references and explicit coverage; unavailable content has a scoped recovery path.
Supported size limits and incomplete comparison are stated without losing the
working text or pretending every change is visible.

Dense findings can group by section or supplied finding type, with scoped counts
and an exact path to each member. Filtered, omitted, not-yet-loaded, and unknown
findings stay distinguishable. Hiding findings for comfortable reading changes
presentation; it cannot remove unresolved status from assessment or export.

### Planning and initial composition

A request carries purpose, audience, output scope, selected basis, relevant
inquiries, snapshot, language, format, and applicable profile constraints.
Petra may resolve already available context and asks only for omissions that
materially affect the output's meaning or usefulness. The author need not fill
every contract field manually.

Short, bounded composition can retain an implicit plan that remains inspectable.
Consequential or long-form composition exposes a readable plan before or alongside
the draft, as D012 allows. The plan states section purpose, intended statements or
profile-specific moves, basis, unresolved questions, exclusions, and limitations.
An inquiry hierarchy does not automatically become the outline. Requesting a
different order or structure follows the accepted direct-steering boundary.

New generation is bounded Work under DB06/DB11. Scope and resource consequences
remain visible. Partial generated content has an explicit partial status; Work
success does not establish support, settle an inquiry, or promote a document.
The existing working text and author edits survive failed or cancelled generation.

For example, the author requests a comparison drawing on the alternatives and
criteria inquiries. Petra may produce an exploratory comparison while criteria
remain unsettled. The corresponding passage names that limitation and offers a
route back to the inquiry. Producing fluent prose does not turn the provisional
ranking into an accepted finding.

### Direct editing, Petra revisions, and save meaning

Direct author editing changes the working copy without approval for each
keystroke. Saving work and validating its meaning are distinct outcomes. The UI
distinguishes unsaved changes, saving, saved to the Project, retained only on this
device where supported, save failed, and conflicting base. It must not call a
local recovery buffer a durable Project save or promise offline retention without
the corresponding capability.

Authors can continue writing while support or other profile checks are pending,
stale, or failed. Existing findings stay attached to their assessed revision;
the new working copy does not inherit a passing assessment by appearance.
Continuing to edit does not grant reuse, promotion, or export eligibility.
`UX-REQ-018` requests the missing durable editing and exact assessment boundary.

A named model role produces proposed wording with exact origin and input scope.
Comparison preserves the author's version and makes substantive changes,
qualifications, omissions, and citation effects inspectable. A request to generate
a proposal does not authorize overwriting later manual edits. A sufficiently
explicit instruction to use an exact inspected proposal can authorize its draft
transition without another confirmation; it cannot bypass profile promotion
requirements. Combining selected changes creates a new exact candidate whose
basis and affected validation must be checked; “accept selected” cannot reuse an
assessment for a different whole revision.

While Work runs, the author may edit elsewhere or in the same passage. Results
remain bound to the submitted base. If the target changed, show the conflict and
both versions, retain the result, and offer explicit reconciliation or fresh
bounded Work. The UI never places text into the current caret simply because the
original selection no longer resolves. Composition, Petra, and Work refer to the
same proposal/task identities.

The existing revision engine accepts exact non-empty span replacements and
requires a non-failed draft with current provenance. It does not yet provide a
general editor for repeated edits while stale, inserting/deleting sections,
reordering content, blank authoring, or merging late model output. These are
explicit runtime gaps, not reasons to interrupt normal writing with mandatory
revalidation after each edit.

Local editing undo affects the working buffer. Saved revision history and
registered restoration retain immutable prior records. Neither mechanism
reverses an applied Project ChangeSet or restores overwritten source bytes;
governed Revert remains DB09/History. A previous document revision opens read-only
unless a supported action explicitly creates a new working descendant.

### Provenance, citations, and validation

Selecting a material passage exposes its exact basis: source report, named
model inference, author statement/judgment, structural language, or explicitly
unsupported meaning as defined by the active profile. Origin, support, validation,
and approval remain separate. A citation's presence or a validator's success does
not by itself establish that the statement is supported.

The scientific profile preserves exact WorkVersions, source locators, quoted
wording, processing depth, contrary or qualifying basis, and canonical citation
metadata. Missing metadata stays missing with a useful explanation; formatting
does not invent an author, date, or identifier. The controlled-writing profile
exposes its registered constraint and source relationships without requiring a
scientific citation on narrative prose.

Findings name the affected text, assessed revision, producer, reason, consequence,
and available action. Relevant uncertainty remains readable in the document;
additional diagnostic detail opens on demand. Unknown coverage is not “no issues.”
The interface distinguishes not checked, checking, stale, check failed to run,
and a completed check that found a substantive issue. A failed validator service
does not prove that the passage is wrong.

Editing a mapped statement marks the affected provenance and citation links stale
according to runtime assessment. Exact old source relationships remain available
as history; they are not silently reassigned to new wording. Structural edits
must remap exact locations and identifiers under the runtime contract. The
browser cannot infer unchanged support from similar text.

Revalidation applies to an exact saved revision and scope, with known coverage
and limits. A late result stays attached to that revision and cannot mark later
edits checked. Choosing a newer Project snapshot is explicit and preserves the
previous basis and any resulting comparison. Scope narrowing or using only part
of an artifact requires matching assessment coverage; an omitted problematic
passage cannot make an unrelated whole-document assessment applicable.

Language improvement preserves meaning, origin, claim force, scope, quotations,
measurements, and citation meaning under D006. For example, a revision from
“is associated with” to “causes” needs a substantive support check, even if the
sentence reads more smoothly. A writing-profile check uses its own constraints
and authority rules.

### Imported ancestry, promotion, rendering, and export

An existing permitted source opens in the source reader and remains immutable.
Composition creates a separate working descendant with exact imported ancestry.
Unsupported import/conversion does not silently normalize, truncate, or replace
the source; show the available representation, fidelity limits, and safe route.
`UX-REQ-005` remains the proposed imported-lineage/promotion boundary.

Saving a draft, using suggested text, passing validation, creating an approved
profile revision, rendering a format, and exporting bytes are separate actions.
An authoritative manuscript revision or domain change follows the registered
profile command and DB09 exact Review path. A scientific DraftArtifact remains
an artifact rather than an authoritative Claim. Creating an output never closes
its contributing inquiries automatically.

Rendering binds one exact content revision, citation bundle where applicable,
renderer/options, and any supplied assessment. Formats are capability-driven.
The current deterministic renderer implements Markdown, LaTeX, and BibTeX;
PDF, DOCX, rich layout, and other renderers are not claimed from those contracts.
A bibliography-only output names that scope. Format changes preserve semantic
content and expose escaping, losses, unsupported structure, or render warnings.

The output action names the exact artifact/revision, format, included material,
destination type, and applicable access/destination eligibility. Download or copy
does not publish the Project or replace its protected source. External delivery
is a separate explicit action under supported destination policy. A renderer's
internal artifact-registration operation must not be labelled public publication.

**Accepted on 2026-09-07 as `UX1.7-DISC02`:** authors can export a clearly
marked working copy while validation findings remain unresolved. The copy
preserves its exact revision, known limitations, and assessment coverage under
existing access rules. Required validation for a governed promotion remains
enforceable. This direction completes the pending DB12 product decision;
`UX-REQ-019` records its proposed runtime mapping.

Concrete case: a comparison draft has an unresolved criterion and one citation
mapping became stale after an edit. **Download working copy** exports the chosen
draft with those limitations attached. The author can continue work elsewhere;
the copy does not claim that the ranking is settled or the citation rechecked.
In a writing profile, an unresolved continuity finding is carried with the exact
manuscript revision without labelling its narrative prose scientifically unsupported.

#### Exact output selection and instruction

The output view leads with the document, selected scope and revision, format,
working-copy status, and a concise findings/coverage summary. The author can
inspect relevant findings before acting. Routine download or copy does not add
a separate confirmation merely because checks are unresolved. An explicit Petra
instruction naming an available revision, scope, and format uses the same path;
ask only for unresolved material ambiguity, missing authority, or a changed
consequence that the instruction did not settle.

The action captures one exact content position. If unsaved edits exist, name the
working copy as the target and obtain an exact export snapshot under the supported
authoring/export contract. This capture must not claim **Saved to Project** unless
durable save is acknowledged. If that capture is unavailable, preserve the buffer
and explain the required save/capture step. Exporting a last-saved or historical
revision is a distinct explicit choice; it cannot be an automatic fallback.

Edits made after capture remain in the editor and do not alter the in-flight
output. Completion names the revision actually exported and can say that newer
edits exist. A later check result cannot retroactively change the exported file
or certify newer text. Regenerating an updated copy is a new explicit operation
with its own exact basis.

#### What travels with a working copy

The exported representation carries a readable **Working copy** label, document
identity/purpose, exact content revision or captured working-copy identity, and
the relevant limitations. A concise status note names unchecked or changed text,
unresolved findings, applicable assessment scope/revision, and unavailable or
unknown coverage. A linked detailed report can provide passage locations, check
producer, source/citation identity, and supplied explanations. Exact internal IDs
remain inspectable without dominating the document's reading surface.

The status note and detailed findings are part of the exported representation
or a delivered bundle with an explicit relationship between its members. A
notification left only inside Petra is insufficient. The product does not offer
an unresolved working-copy operation that silently strips the status note while
retaining a misleading checked appearance. This is a delivery guarantee about
what Petra produces, not a claim that an external editor cannot later alter it.

Use supported document notes, a clearly identified accompanying report, or a
supported bundle according to the renderer. For clipboard export, include a
readable working-copy/status note in the copied payload, with relevant findings
or their supplied explanation. If a clipboard representation cannot preserve
the required meaning, offer a supported textual copy or download. Do not claim
clipboard success before acknowledgment or claim that pasting elsewhere succeeded.

Citation-only output and structured formats preserve valid syntax. A status
comment or explicit accompanying report may carry limitations when supported;
prose must not be injected into a BibTeX entry as bibliographic metadata or into
a data field as if it were source content. A format unable to carry the required
status has an explicit limitation and a supported alternative. The design does
not invent PDF/DOCX or arbitrary format capability.

#### Findings, coverage, and eligibility

Unresolved, stale, failed, or not-yet-run domain checks do not alone block working
copy export. The output reflects which condition applies; **not checked** does
not mean a finding of error. A completed check is reported with its scope and
revision, and does not automatically confer profile approval or general truth.

Exporting a selected passage includes findings and shared limitations relevant
to that scope. A whole-document limitation that still affects the selection
travels with it. Omitted passages are not described as part of the output.
If runtime mapping cannot determine applicability, state the coverage limit or
include a clearly labelled broader report; the client must not infer that the
selection is clear because the warning marker lies outside it.

The operation retains exact basis links where permitted. Export does not fetch
or embed all cited source bytes automatically. An unavailable cited source may
limit verification without preventing export of an otherwise permitted draft.
If requested embedded content is unavailable or restricted, explain that specific
inclusion problem and offer an explicitly described narrower output when allowed.
The copy cannot silently include private thread history, unrelated inquiries,
excluded source material, or raw model diagnostics.

Actual access, destination, content-integrity, and supported-format requirements
remain enforceable for the concrete operation. Unsupported output/status carriage
or malformed content has a bounded failure path; **working copy** is not a bypass.
Internal support-reuse restrictions remain separate from this export permission.
A safe runtime mapping is required before the client can expose the operation.

#### Completion, partial delivery, and recovery

The output receipt identifies exact content, format, included members, captured
assessment/status, and generated files. Separate **Ready to download**, **Download
started**, and **Copied** according to observable capability. A browser-triggered
download does not prove the user saved the file or that an external destination
received it. Public sharing is a separate supported action.

If a bundle's required status report fails, do not label the incomplete delivery
a successful working-copy export. Retain valid generated members for inspection,
state what is missing, and retry or offer a format that carries the status.
Multi-format requests report each exact outcome; one failed format does not
erase successful outputs or trigger new prose generation. Repeated delivery of
the same generated bytes is distinguishable from a new export of newer text.

Cancellation follows DB11 for durable generation; it cannot recall bytes already
delivered to a clipboard, browser, or external destination. Show completed effects
and preserve the document. Reconnect reconciles the operation before repeating it,
and a failed transfer keeps its output identity available for supported retry.

### Ordinary and adverse states

| State | Visible meaning and action | Preservation and recovery |
| --- | --- | --- |
| No documents / no matching documents | Distinguish an empty collection from active filters; create or clear filters | Preserve Project and composition intent; no invented document |
| Long document / partial content or comparison / dense findings | Outline, exact locations, supplied limits, and honest loaded/selected/whole scope | Preserve text and location; reveal bounded content or a supported equivalent; filters do not clear findings or shrink Work scope silently |
| Blank working copy | Authoring has begun but no generated or validated content exists | Retain text through supported save/recovery; add basis later |
| Unsaved / saving / saved / locally retained | Name the actual persistence boundary and acknowledged revision | Retry exact saves; retain unsent text; do not hide failed persistence |
| Preparing / generating / partial output | Bounded scope, linked Work, actual status, and partial-result limits | Existing document remains available; stop response and cancel Work retain distinct effects |
| Proposed revision | Exact base, proposed wording, producer, and meaning/basis changes | Inspect, revise, use the supported exact candidate, or retain the current text |
| Later manual edits / stale proposal | Generated proposal addresses an older base | Preserve both versions; reconcile or regenerate explicitly |
| Findings pending, stale, or substantive failure | Identify coverage, affected passage/revision, and consequence | Continue working; remedy or run a bounded check; no automatic passing status |
| Validation unavailable or failed to execute | No reliable assessment for the requested scope | Retain draft and prior exact assessments; retry when supported |
| Source changed, restricted, or unavailable | Exact basis and what can currently be inspected | Preserve references; offer permitted historical/current inspection without substitution |
| Historical / promoted revision | Exact immutable position and profile status | Inspect; return to current or create a permitted new descendant |
| Save conflict / offline / reconnect | Actual base, acknowledgment, and local retention capability | Preserve both texts and reconcile by exact identity; replay does not duplicate a save or acceptance |
| Render or export failure | Failed format/destination and any completed output with exact revision | Preserve draft and successful outputs; retry the failed operation without regenerating prose |
| Export with unresolved findings | Working copy names exact content, relevant limitations, and assessment coverage | Proceed through the supported export action under access rules; findings travel with the copy and do not imply approval |
| Unsaved or newer edits during export | Captured output and current editor are different exact positions | Export the chosen capture, preserve later edits, and name the actual result; no fallback to an older revision |
| Selected scope / unknown finding coverage | Relevant local and shared limitations plus supplied coverage limits | Use exact runtime mapping or an explicitly broader report; do not infer a clear selection from absent markers |
| Status carriage or included content unavailable | Required report/format member or requested embedded content cannot be delivered | Preserve valid members; retry or explicitly choose a supported narrower output; no misleading success |
| Generated / copied / download started / delivery unknown | Report only the observed stage and exact bytes | Retry delivery where supported without regenerating text; cancellation cannot recall completed delivery |

### Interaction paths

Every path preserves Project/profile, exact artifact and revision, inquiry/basis
context, current selection, unsent instruction, origin, and return where relevant.
Authority-changing steps use their existing registered commands.

| Path | Entry and steps | Result and recovery |
| --- | --- | --- |
| `DB12-P01` Resume document | Open exact contextual output or collection item; inspect revision, save state, and findings | Resume working copy or inspect historical output; unavailable targets preserve a safe return |
| `DB12-P02` Plan and draft | Frame purpose/scope/basis; inspect the appropriate plan; start bounded Work; inspect output and limitations | Exact draft and source/inquiry links; failure retains existing text and any permitted partial result |
| `DB12-P03` Write and save | Type, insert/delete/reorganize supported structure, save working progress, inspect acknowledgment | Durable working progress without falsely current support; failed/conflicting saves retain recoverable text |
| `DB12-P04` Request and use revision | Select scope; submit explicit instruction; inspect exact proposal comparison; use authorized exact content | New working revision with origin and affected checks; late output cannot overwrite intervening edits |
| `DB12-P05` Inspect basis | Select statement or finding; inspect exact source, inference, author input, citation, or related inquiry | Return to the same document passage; missing/stale/unsupported basis stays explicit |
| `DB12-P06` Validate and remedy | Request checks on an exact revision/scope; inspect coverage and findings; edit or choose an available remedy | Assessment remains tied to its actual subject; writing can continue while it is pending |
| `DB12-P07` Revise an imported document | Inspect immutable source and import capability; create separate descendant; compare and validate; route any promotion through Review | Source and ancestry survive; conversion limits and failed promotion cannot overwrite it |
| `DB12-P08` Compare or restore history | Select exact revisions; inspect textual or aligned comparison; return or create a supported new descendant | Prior history and origin retained; working-buffer undo remains distinct from governed Revert |
| `DB12-P09` Render and export | Select exact revision/format/scope; inspect output status and eligibility; request supported copy/download | Working-copy identity and relevant limitations travel with the output; routine authorized export needs no duplicate confirmation |
| `DB12-P10` Export selected or changing text | Resolve selected-scope findings and exact capture, including unsaved text where supported; continue editing while output is prepared | Output keeps captured content and coverage; later edits and checks do not change or certify it; unknown applicability stays explicit |
| `DB12-P11` Recover output delivery | Inspect exact generated members and actual clipboard/browser/transfer status; retry failed delivery or choose a supported representation | Required status accompanies delivery; partial outcomes remain visible; retries do not regenerate prose and cancellation does not recall delivered bytes |

### Language, accessibility, and verification boundary

Use **Saved to Project** only after durable acknowledgment. **Checking** names
active validation; **Needs checking** or **Changed since check** names its actual
scope. **Working copy**, **Suggested revision**, **Compare revisions**, **Use this
revision**, and **Download** each name their distinct effects. **Approved** is
reserved for the applicable profile decision; **Published** cannot label a local
save or download. Unresolved export uses **Download working copy** or **Copy
working copy**, with a concise reason such as **Two passages need checking**.
The label **Checks passed for revision R4** names an assessment result; it does
not substitute for a profile approval or imply that newer edits were checked.

| Meaning | User-facing language | Required limitation |
| --- | --- | --- |
| Working progress | **Unsaved changes**, **Saving**, **Saved to Project**, **Retained on this device** | State only the actual persistence boundary |
| Proposed wording | **Suggested revision**, **Compare revisions**, **Use this revision** | Name base, scope, origin, and the exact content transition |
| Incomplete or stale assessment | **Not checked**, **Checking**, **Changed since check**, **Check could not run** | Keep revision/coverage and substantive findings distinct from execution failure |
| Unresolved output | **Working copy**, **Download working copy**, **Copy working copy** | Carry the relevant limitations with the delivered representation |
| Output identity | **Copy of revision R4**, **Newer edits are not included** | Never substitute last-passing or latest content silently |
| Delivery | **Ready to download**, **Download started**, **Copied**, **Delivery could not be confirmed** | Report the observable outcome, not an assumed filesystem save or external receipt |
| Profile authority | **Approved revision** where supplied | Requires its own exact registered decision; saving/exporting alone does not confer it |

Document editing, text selection actions, outline navigation, findings, source
inspection, comparison, and output controls have keyboard and screen-reader
equivalents. Hover/color/drag cannot be the only route to a finding or revision.
Preserve composition and input-method text during background updates. Announce
save failures, command outcomes, and meaningful validation changes without
reading every keystroke or streamed token. Findings expose text locations and
return focus; comparison supplies additions and removals as text. Document order
and focus survive responsive transitions, text scaling, and panel changes.

### Paper audit

The paper audit walks `DB12-P01`–`P11`, the state matrix, the exploratory
comparison with unsettled criteria and a stale citation, and an invented
manuscript with an unresolved continuity finding. It checks ordinary entry,
success, stale input, failed persistence, late results, scoped export, partial
delivery, and responsive/textual recovery against the accepted controls and
existing contract limits. It does not claim executed fixtures, measured
accessibility/performance, or participant comprehension.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Save, Work, assessment, approval, rendering, and delivery have distinct exact subjects and outcomes |
| Match to author task | The document leads; passage, section, whole-artifact, inquiry, and output scope are recognizable |
| User control | Manual edits survive generation, comparison, failure, and cancellation; unfinished work can leave Petra with its limitations |
| Consistency | Composition, Petra, Work, Review, Sources, and History resolve the same document, proposal, and output identities |
| Error prevention | Exact capture/base checks prevent overwriting edits, misattributing support, substituting output, or dropping required status |
| Recognition | Basis, selected scope, assessed revision, unresolved findings, and return origin remain inspectable |
| Efficiency | Continued writing and clear export instructions do not require duplicate approvals or checks after every edit |
| Minimal presentation | Contextual panels and restrained findings preserve the writing area; detailed reports remain available |
| Recovery | Exact conflicting texts, generated members, assessments, and delivery states survive retry and reconnect |
| Help and language | Copy terms distinguish working progress, checked scope, approved revision, and observable delivery |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB12-A01` Document obscured by tool surfaces | Writing loses scope, selection, and continuity when assistance or provenance becomes the primary workspace | Moderate | Fixed in specification: document-first layout, one contextual panel by default, exact narrow-route return; design owner verifies with UX-FX29 after freeze |
| `DB12-A02` Existing edit engine requires current provenance | Repeated writing could be blocked by stale support; blank/structural authoring exceeds exact non-empty span replacement | Major | Needs contract: implementation architecture, UX-REQ-018; continuous working-copy capability preserves existing reuse rules; UX-FX30, G-CONTRACT remains open |
| `DB12-A03` Late results can overwrite or certify newer text | Manual edits or current validation meaning could be lost | Major | Fixed in specification: exact base/result/capture binding and conflict preservation; UX-REQ-017/018/019 runtime mapping; UX-FX30/31 after freeze |
| `DB12-A04` Scientific composition mistaken for universal profile support | Creative constraints, imported ancestry, or general editing could be falsely claimed | Major | Needs contracts: implementation architecture, UX-REQ-004/005/017/018; D012 scientific semantics retained; paired UX-FX29/30 verify mappings |
| `DB12-A05` Unresolved findings lack export treatment | Download could silently certify unfinished work or impose an unaccepted validation gate | Major | Fixed by accepted DISC02 and exact output/status specification; P09–P11 paper paths checked; runtime mapping UX-REQ-019 and post-freeze UX-FX31 remain required |
| `DB12-A06` Existing rendering is not a complete working-copy export contract | Citation warnings and internal artifact registration do not supply scoped findings, working-copy capture, required report carriage, or delivery reconciliation | Major | Needs contract: implementation architecture, UX-REQ-019; no frontend bypass or claimed live export; UX-FX31 after freeze |
| `DB12-A07` Output status comprehension remains unmeasured | An author or recipient may still mistake a working copy or passed check for an approved, fully supported document | Moderate | Needs participant validation: design owner, UX-FX29–31 after freeze; severe authority, lost-text, or scope misunderstanding blocks G-VALIDATION |

Acceptance fails if the author could reasonably believe that saving proves
support, every edit requires revalidation before more writing, a late result
targets the current caret, a passed check certifies a newer revision, a finished
draft settles its inquiries, export promotes a document, a working copy can lose
its stated limitations silently, an absent marker proves a selection clear,
format conversion adds scientific authority, cancellation recalls delivered
bytes, or a browser download proves receipt on disk.

### Acceptance criteria and post-freeze evidence

DB12 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. document-first entry and layout preserve recognizable scope, selection,
   inquiry/source context, working text, unsent instruction, and return;
2. profile-valid planning, direct writing, and bounded generation distinguish
   blank authoring, partial output, exact artifacts, and unresolved inquiry;
3. direct editing continues while checks are pending, stale, or failed, with
   honest save acknowledgment and recoverable failed/conflicting writes;
4. proposals and accepted content retain exact origin and base; combining or
   editing suggestions produces distinct content with corresponding check needs;
5. late Work and validation results cannot overwrite, relocate into, or certify
   newer text, and stale source/snapshot changes remain explicit;
6. selected passages expose profile-valid basis, uncertainty, exact source and
   citation identity, assessment coverage, and permitted inspection;
7. protected imported sources and immutable saved ancestry survive revision,
   comparison, restoration, and profile promotion;
8. working-buffer undo, saved revision restoration, and governed Revert have
   distinct scopes and consequences;
9. working-copy export remains available despite unresolved checks when actual
   access, integrity, format, and status-carriage requirements are satisfied;
10. exact capture includes the chosen working/saved/historical content and
    scope; neither later edits nor last-passing fallback silently changes output;
11. relevant findings and unknown coverage accompany download/copy in a supported
    representation or delivered bundle, including selected-scope and citation-only cases;
12. export does not grant approval, promote a Project change, permit unrelated
    support reuse, or disclose excluded context; explicit governed operations
    retain their registered checks;
13. rendering preserves semantic content and reports supported formats, loss,
    exact citation versions, and individual output outcomes;
14. delivery reports only observable completion, retains partial outcomes, and
    supports bounded retry/reconnect without new prose or erased prior effects;
15. keyboard, screen-reader, input-method, high-zoom, narrow-route, comparison,
    non-color, and reduced-motion paths preserve the task and return focus; and
16. all runtime gaps and audit findings have owners and follow-up evidence,
    with no product implementation or claimed runtime validation before freeze.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX29` Paired document-first Composition | Invent a scientific comparison from open inquiries and a protected-source manuscript revision; exercise entry, plan, explicit scope, contextual Petra/basis/findings, exact proposal comparison, source/inquiry return, and responsive/textual accessibility |
| `UX-FX30` Continuous authoring and exact revision recovery | Blank and structural edits, successive saves while checks are stale, late model/validator results, source changes, partial/failed Work, conflicting/disconnected saves, historical comparison, and render failure preserve text and exact status |
| `UX-FX31` Working-copy export and delivery | Pair unresolved criteria/stale citation with a continuity finding; exercise unchecked/failed/unknown coverage, selected scope, unsaved capture, newer edits, historical choice, clipboard and valid structured-format status, required-report failure, excluded/restricted inclusions, partial multi-format output, delivery uncertainty, retry, and cancellation after delivery |

These are named paper scenarios for independently invented post-freeze fixtures.
No contextual demo material or user asset supplies their content. Paper closure
does not establish live contracts, renderer capability, performance, accessibility,
or observed author/recipient comprehension.

### Backend needs and next section

`UX-REQ-017` requests the profile-resolved Composition collection/document read
composition and exact cross-surface context. `UX-REQ-018` requests the working
draft, continuous save/edit, proposal reconciliation, and exact assessment
boundary missing from the narrower existing scientific revision engine.
`UX-REQ-019` requests exact working-copy export capture, scoped status carriage,
operation eligibility, output composition, and observable delivery/recovery.
`UX-REQ-004`, `UX-REQ-005`, `UX-REQ-006`, `UX-REQ-011`–`UX-REQ-016`
retain profile, ancestry, conversation, Review, inquiry, Graph, and Work ownership.

DB12 closes at `G-SPEC`; `G-CONTRACT`, implementation/integration, and participant
validation remain separate. Continue to DB13, Settings and personal control,
using the accepted local-presentation and governed-operation boundaries.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB13 — Settings and personal control

**Status:** personal preferences first, with clearly scoped and discoverable
Project controls, accepted on 2026-09-07 as `UX1.1-DISC06`. DB13 is complete at
specification depth with a paper audit. Runtime contract, implementation,
integration, and participant validation remain separate gates. No Settings
surface, preference store, or policy command is implemented, and
`UX-DESIGN-FREEZE-01` remains unaccepted.

### Author task and inherited boundaries

The author adjusts Petra for comfortable work, understands which settings affect
only presentation and which affect a Project's execution or permissions, and
can restore personal preferences without losing text or changing Project meaning.

DB04 already establishes Settings as a global place. Accepted foundation work
provides Appearance, Layout, Editor, and Accessibility groups; theme and
forced-colors behavior; accessible resizing and reset; and local presentation
state. UX-FLOW-17 separates immediate personal changes from versioned
ReviewPolicy, CapabilityGrant, and other supported Project controls. Account
synchronization remains a separate future identity/persistence decision.

Model identity and accountable roles remain inspectable in Petra and Work.
Changing their display does not select a new provider, grant access, change a
budget, or retarget a running task. Action-specific scope and depth remain on
the corresponding Work request. A personal default cannot override a registered
profile, Project policy, or operating-system accessibility constraint.

### Personal preferences first

Settings should lead with the four personal-preference groups. Changes with
purely local presentation effects apply immediately and have scoped reset or
restoration. A clearly labelled **Project controls** section names the selected
Project and exposes its effective permissions, model/Work policies, budget,
and review controls where those operations exist. More technical configuration
is disclosed within its relevant group instead of filling the default page.

Project controls remain deliberately reachable
while preserving relevant effective limits and unavailable-action reasons at
the point of use. It does not hide access or execution consequences behind an
“advanced” switch. With no selected Project, the interface cannot imply that
changing a personal preference changes every Project's policy.

For example, changing text size takes effect immediately on this device.
**Show model details** changes presentation. Allowing another model service or
changing a Work budget affects a named Project and follows its supported exact
control path, stating effective timing and scope. Resetting Appearance cannot
reset those permissions, alter the budget, or cancel Work.

The complete inventory and behavior follow.

### Settings information architecture

Settings is a global place with a stable page title and a concise persistence
statement. Its primary navigation leads with **Appearance**, **Layout**,
**Editor**, and **Accessibility**, followed by **Project controls**. The selected
group becomes the main form; it is not rendered as a dashboard of simultaneous
cards. The page preserves the originating Project and return target.

| Group | Personal controls and defaults | Scope and boundary |
| --- | --- | --- |
| Appearance | **System**, **Petra Stone**, **Petra Graphite**, and **High Contrast** themes; supplied syntax colors follow the effective theme | On this device; forced-colors mode overrides the rendered palette while retaining the chosen theme for later |
| Layout | Available Focus, Review, Graph, and profile-valid layout presets; default secondary-panel posture; saved panel sizes and pinning | On this device and responsive capability; layout does not open domain objects, start Work, or grant a feature |
| Editor | Line wrapping and supported code-like editor presentation, including JetBrains Mono and ligatures off by default; language-specific behavior comes from the registered editor/profile | On this device; prose, code, query, JSON, and LaTeX surfaces retain their correct semantic roles |
| Accessibility | Text scale within supported app controls, reduced visual motion, pause visual streaming, focus and announcement preferences that remain safe, and the explicit High Contrast route | On this device; browser zoom, platform settings, forced colors, and reduced-motion requirements remain effective constraints |
| Project controls | Effective privacy/data access, capability, model/routing, Work budget, and Review policy; technical details and history on demand | Exact named Project and versioned runtime records; editable only through a supported governed operation |

Comfortable spacing remains the default for reading and forms, while navigation
and metadata use their accepted compact treatment. DB14 owns component density;
DB13 does not add a global density switch. A layout preset composes presentation
values and explains the surfaces it affects. **Collaborate** appears only when a
registered consuming capability makes the preset meaningful; a layout name cannot
imply multi-user access.

The page uses visible group navigation rather than an initially empty search box.
Direct contextual links can open the exact preference or Project control and
retain a reliable return. If the inventory later becomes too large to scan,
task evidence can trigger settings search without changing this grouping model.

### Effective values, defaults, and overrides

Each control exposes the effective value and its origin where the distinction
matters: Petra default, personal preference on this device, responsive adaptation,
platform accessibility setting, or versioned Project rule. Stored preference and
current effective presentation may differ. For example, Petra retains **Graphite**
while forced colors determines the current palette, and it retains wide-screen
panel sizes while a narrow viewport presents sequential routes.

Platform accessibility constraints take precedence over a preference that would
reduce access. Petra can apply more contrast or less motion than the system asks
for; it cannot offer a setting that suppresses visible focus, required semantic
structure, non-color meaning, or essential status. Browser text zoom remains
supported independently of Petra's optional text-size preference.

Project rules can constrain an operation, but they do not rewrite personal theme,
layout, or editor choices. Personal preferences cannot weaken profile validation,
privacy, source rights, ReviewPolicy, CapabilityGrant, RoutingPolicy, budget, or
retention. The interface shows both facts when they interact rather than inventing
one undifferentiated “effective settings” layer.

### Apply, reset, persistence, and recovery

Personal presentation changes apply immediately. A visible acknowledgment names
their scope, and the current page demonstrates their effect without moving focus
or losing form position. Theme and layout changes preserve the current Project,
route, selection, unsent Petra/document text, active Work access, and scroll where
the layout permits. Motion changes do not restart animations or streams.

Personal settings are local to the device for the current product boundary.
**Saved on this device** is used only after local persistence succeeds. If storage
is unavailable, the change can remain active for the session with **Applied for
this session; could not save on this device** and a retry. Petra does not imply
account synchronization, backup, or transfer to another browser. Corrupt or
unsupported stored values fall back to safe defaults, identify the affected
group, and offer a scoped reset without discarding unrelated valid preferences.

Individual controls and each group provide **Reset**. **Reset all personal
settings** applies the known personal defaults with an exact acknowledgment and
a session-scoped **Undo reset** where the prior values remain available. The
explicit reset action needs no additional confirmation because it is local and
recoverable. It never changes Project controls, clears Project content, removes
sources, closes active Work, deletes drafts, or resets the operating system.

If another tab changes a stored personal preference and the runtime reports the
change, Petra applies the newer value without overwriting input or moving focus
and announces the relevant group once. A user may set a new value again. DB13
does not prescribe distributed preference conflict resolution or claim reliable
cross-tab synchronization where the storage capability cannot supply it.

### Layout and editor behavior

Panel resizing works through pointer, touch, and keyboard under the DB04 separator
contract. The current value and reset are available from Settings; direct resizing
and Settings update the same local preference. Minimum task space and responsive
reflow can constrain the effective size without rewriting the saved wide-layout
value. A preset changes only its declared layout values. Applying **Focus** does
not dismiss required attention, cancel Work, or erase pinned-state history; it
changes how available context is presented.

Editor preferences apply to registered editable surfaces. CodeMirror remains the
post-freeze candidate for code-like LaTeX, JSON, query, and code editing after the
accepted dependency check. A visual preference cannot change serialization,
indentation semantics owned by a format, line-ending requirements, exact quotes,
or saved content. Composition prose retains its document-first reading typography
unless its registered semantic format needs the code-like editor.

Changing a preference while editing preserves the buffer, selection, composition
state, input-method text, undo history where supported, and exact save status.
If an editor cannot apply a setting safely during composition, retain the requested
value, explain when it becomes effective, and preserve the current edit. Do not
reload the route or silently normalize content.

### Project controls, privacy, and model visibility

Entry from a Project binds **Project controls** to that exact Project. Direct
global entry asks the author to select a Project for inspection; personal groups
remain usable without one. The control header names the Project, profile, policy
revision/freshness, and author capability. Choosing a Project in this settings
context changes the inspection/edit target, not the shell's active Project or a
running task. Navigation back to the Project is explicit.

The default view summarizes effective rules and consequences in familiar terms.
Technical detail discloses exact policy, grant, certification, provider/deployment,
budget-profile, validator, and revision identifiers where the runtime supplies
them. A local **Show technical model details** preference changes this disclosure
default. It cannot hide the accountable model role, origin, fallback, limitation,
or material provider/egress consequence required to understand current Work.

| Project-control area | Leading meaning | Governed behavior |
| --- | --- | --- |
| Privacy and data access | Private Project scope, enabled evidence namespaces, permitted source/data use, egress or destination limits, and known retention rules | Inspect exact effective basis; change only through a supported typed operation, never a local toggle |
| Capabilities | What the author and services may currently read, propose, execute, approve, export, or administer, including expiry and scope | Expired/missing grants explain the unavailable action and the supported request/access path |
| Models and routing | Registered roles, currently eligible/certified routes, provider/egress implications, fallback behavior, and supplied policy status | Project routing selects only already permitted and certified options; a preference cannot grant a provider or lower the validation floor |
| Work budgets | Supplied Project/workflow/period limits, measurement basis, current coverage, reservations, and unknown values | Change through an exact budget-policy operation; per-action scope/depth and concrete cost remain on Work |
| Review and change | Current review mode/policy summary, scope, gates, approving actor, start/expiry/pause/supersession, and history | Preview exact before/after effect and apply prospectively through the registered policy path |

Petra has no global “best model” or one quality score. Settings cannot offer an
ambient provider picker that bypasses role certification, task scope, privacy,
budget, or RoutingPolicy. A permitted preference may influence a registered
selection objective only when the runtime contract defines its exact scope and
fallback behavior. It does not retarget an already submitted model call.

A Project-control edit uses the owning typed command rather than a generic
**Save settings** mutation. The preview names exact old/new values, Project,
actor authority, affected workflow/data scope, start time, expiry where supplied,
and expected effect on running and future Work. Clear form submission is the
authorizing action; an extra confirmation is reserved for a distinct unresolved
consequence or additional authority requirement. Success records the new revision
and history route. Failure preserves the form and current effective policy.

Policy changes are prospective unless their contract explicitly supplies a safe
transition. Work and model calls retain the policy, capability, and budget
references they actually used. Settings cannot silently cancel, reroute, re-review,
or relabel existing records. If a policy changed elsewhere, refresh and compare
before resubmission; do not overwrite the newer revision.

Current contracts provide Project private visibility and enabled evidence
namespaces, exact capability references on commands and Work, model certifications
and request budgets, while accepted D005/D007 decisions define ReviewPolicy and
RoutingPolicy semantics. They do not supply one composed Project-controls read or
a universal settings command. `UX-REQ-020` requests exact composition and mapping
to existing or future typed operations. The UI remains read-only for any control
without a supported command.

### Responsive and accessibility behavior

Wide screens use compact group navigation and one main settings form. Project
control detail can open as the one secondary contextual surface. Narrow and
high-zoom layouts use a full-width group list and group route with **Back to
Settings**; labels, current values, scope, reset, unavailable reasons, and Project
identity remain complete. A dense policy table becomes an ordered definition list
or labelled rows, not a clipped horizontal-only view.

Settings groups use headings, fieldsets, descriptions, and native control
semantics. Theme swatches include names and selected state. Resizable demonstrations
have keyboard equivalents. Toggle labels describe the positive effect; unavailable
controls remain discoverable with their reason and required capability. Dynamic
previews, storage failures, policy updates, and reset acknowledgments announce one
concise change without taking focus. System-forced contrast and reduced motion
remain truthful even when the retained preference differs.

### Ordinary and adverse states

| State | Visible meaning and available action | Preservation and recovery |
| --- | --- | --- |
| Personal settings ready | Effective value, device scope, reset availability, and any system override | Apply immediately; preserve current task and input |
| First use / no saved preference | Petra or System default is active | Set a preference or leave the default; no warning state |
| Platform override | Forced colors, reduced motion, zoom, or viewport adaptation determines effective presentation | Retain the compatible preference and explain current effect |
| Local storage unavailable | Preference can apply only for the current session | Preserve session value; retry storage without claiming device persistence |
| Invalid or unsupported stored value | Safe default replaces only the affected value | Inspect affected group and reset it; preserve other valid settings |
| Reset applied | Exact personal group/all values returned to defaults | Undo during the supported session; Project state and content remain untouched |
| No Project selected | Personal settings remain usable; Project controls have no target | Select an exact Project for inspection without changing active workspace |
| Project controls loading/current/cached/stale/failed | Exact Project and available policy position/limitations | Preserve the last trustworthy read; refresh or follow a safe return; no edit from stale unknown state |
| Read-only or missing capability | Effective control visible with actor/scope reason | Inspect history or use the supported access/request path; no fake toggle |
| Unsupported profile/control | Registered meaning or typed operation unavailable | State the limitation and retain safe navigation; no generic fallback mutation |
| Prospective change ready | Exact diff, authority, effective timing, and affected future/running work known | Submit typed operation or revise/defer; no generic save-all |
| Project control conflict | Expected revision differs from current policy | Preserve proposed values, compare/refresh, and deliberately resubmit if still valid |
| Project control partially applied or delivery uncertain | Per-operation actual outcome and current effective revision | Reconcile before retry; do not claim the entire Settings form succeeded |
| Expired grant / unavailable route / budget exhausted | Current constraint and affected operations named | Inspect basis, request supported access/change, revise Work, or stop; presentation settings remain usable |

### Interaction paths

| Path | Entry and action | Result and recovery |
| --- | --- | --- |
| `DB13-P01` Open personal Settings | Enter globally or return from a contextual link; inspect group and persistence scope | Stable Settings route with personal groups first; preserve origin and return |
| `DB13-P02` Change appearance | Select theme or supported appearance value; observe effective/system state | Immediate accessible presentation and device-save acknowledgment; storage failure retains session value |
| `DB13-P03` Apply layout or resize | Select an available preset or change a panel size via Settings/direct separator | Same local preference, preserved task/input, responsive constraints explained; reset available |
| `DB13-P04` Change editor behavior | Update supported code-like editor presentation while a clean or active edit exists | Buffer/selection/save state preserved; delayed applicability stated; no content normalization |
| `DB13-P05` Change accessibility preference | Reduce motion, pause visual streaming, change supported text/focus/announcement behavior, or choose High Contrast | Effective system/app relationship remains explicit; essential access cannot be disabled |
| `DB13-P06` Reset personal settings | Reset one control/group or all personal settings; inspect exact acknowledgment and optional session Undo | Personal defaults restored without changing Project control/content/Work; failed persistence stays explicit |
| `DB13-P07` Inspect Project controls | Enter from Project or select an inspection target; read effective privacy, capabilities, model/Work, budget, and Review controls | Exact Project/revision and technical detail on demand; no selected target does not block personal settings |
| `DB13-P08` Change supported Project control | Open owning control, inspect exact before/after scope/effective timing, submit typed operation | New revision/history or exact failure; running records retain actual bindings unless contract says otherwise |
| `DB13-P09` Resolve stale/conflicting policy | A control changes elsewhere before submission or current read becomes stale | Preserve intended values; refresh/compare and submit against exact current revision; no overwrite |
| `DB13-P10` Inspect or request unavailable capability | Open unavailable action reason, grant/route/budget basis, expiry, and available request/change path | No local bypass; return to Settings or original action with exact context |
| `DB13-P11` Recover preference failure | Reopen after invalid storage, another-tab change, or session-only application | Safe effective values, bounded reset/retry, preserved form/input, and honest persistence status |

### Language and paper audit

Use **On this device**, **Applied for this session**, **Saved on this device**,
**Set by your system**, **Reset [group]**, **Reset all personal settings**, and
**Undo reset** for personal state. Use **Project controls for [Project]**,
**Effective policy**, **Applies to future work**, **View policy details**,
**Request access**, and exact registered action labels for governed state.

Avoid **Account settings** without an account scope, **Private** as a promise about
every provider or export, **Preferred model** when routing remains policy-bound,
**Unlimited**, **Safe**, or **Default** without its basis, and a generic **Save
settings** that combines local preferences with Project commands. **Show technical
model details** affects disclosure only; model role and output origin remain visible.

The paper audit walks `DB13-P01`–`P11`, the state matrix, a forced-colors and
narrow-layout transition, an editor with unsaved text, failed device persistence,
and a Project policy conflict with active Work. It checks the accepted distinction
between presentation and authority and does not claim executed fixtures,
accessibility measurements, live policy commands, or participant comprehension.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Effective value, retained value, system override, device persistence, Project revision, and operation result stay distinct |
| Match to author task | Settings uses appearance, layout, editor, access, model, budget, and review language before technical IDs |
| User control | Immediate personal changes have scoped reset/recovery; Project changes show exact effect and history |
| Consistency | Direct resize/theme controls and Settings use the same preference; governed controls use owning commands |
| Error prevention | Scope and origin prevent a personal preference from becoming permission or a stale policy from overwriting current state |
| Recognition | Personal groups lead, Project identity stays visible, and technical details remain available in context |
| Efficiency | Preferences apply without confirmation; clear Project submission is not followed by a duplicate assent step |
| Minimal design | One group leads; technical records and policy detail stay disclosed rather than becoming a control wall |
| Recovery | Safe defaults, session-only status, reset/undo, exact policy conflicts, and reconciliation preserve work |
| Help and language | Persistence, system overrides, prospective policy, unavailable actions, and model disclosure use distinct terms |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB13-A01` Personal and Project settings conflated | Theme/reset could appear to change privacy, permission, budget, or active Work | Major | Fixed in IA, scope labels, separate apply/reset behavior, and paths P01/P06–P08; verify with UX-FX32 |
| `DB13-A02` Stored and effective presentation conflated | Forced colors or responsive layout could look like a lost preference | Moderate | Fixed with origin/effective value and retained preference; UX-FX32/33 after freeze |
| `DB13-A03` Device save overstated | Session-only or failed browser persistence could appear synchronized or durable | Major | Fixed in persistence copy and P02/P11; post-freeze storage failures in UX-FX33 |
| `DB13-A04` Model display becomes routing authority | “Preferred model” could bypass certification, egress, capability, or budget | Major | Fixed with disclosure-only preference and typed Project routing; runtime UX-REQ-020, UX-FX32/33 |
| `DB13-A05` Generic policy editor lacks runtime composition | Current contracts reference grants/budgets/certifications but do not supply complete effective controls or commands | Major | Needs contract: architecture/implementation, UX-REQ-020; unsupported controls read-only; G-CONTRACT remains open |
| `DB13-A06` Reset or layout loses active work | A local preference action could destroy input, selection, editor state, or obscure required attention | Major | Fixed in apply/reset/preset rules and P02–P06; verify with UX-FX33 after freeze |
| `DB13-A07` Accessible settings behavior unmeasured | Visual previews, separators, overrides, and dynamic policy updates may remain hard to operate or interpret | Moderate | Needs post-freeze accessibility/participant evidence in UX-FX32/33; severe access, authority, or lost-work failure blocks G-VALIDATION |

Acceptance fails if an author could believe a theme grants access, a layout preset
starts or cancels Work, an editor setting changes saved content, a hidden model ID
means anonymous origin, a preferred provider bypasses policy, device storage means
account sync, forced colors erased the retained theme, reset personal settings
changes Project policy, a policy change applies retroactively without saying so,
or an unavailable control can be enabled through client state.

### Acceptance criteria and post-freeze evidence

DB13 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. Settings leads with Appearance, Layout, Editor, and Accessibility, while
   Project controls are clearly labelled, discoverable, and bound to one Project;
2. personal controls show effective value, origin/override, device persistence,
   and reset behavior without changing domain or operational authority;
3. System, Stone, Graphite, High Contrast, forced colors, reduced motion, zoom,
   focus, and non-color meaning retain the accepted accessibility contract;
4. layout presets and panel resizing preserve route, selection, unsent input,
   active Work access, responsive adaptation, and exact preference scope;
5. editor preferences preserve content, buffer, selection, input method, undo,
   save status, and format/profile semantics;
6. failed/unavailable/corrupt local storage yields honest session/default state,
   bounded retry/reset, and no synchronization claim;
7. group/all reset affects personal preferences only and offers supported local
   recovery without deleting Project content or cancelling Work;
8. Project-control entry preserves exact Project/profile/policy identity and does
   not silently change the active workspace or infer a target;
9. privacy, capability, model/routing, Work-budget, and Review controls expose
   effective scope, limitations, history, and typed operation availability;
10. model detail preference cannot obscure accountable role, output origin,
    fallback, or material provider/egress consequence, and cannot route Work;
11. supported Project edits preview exact before/after, scope, authority, and
    effective timing and preserve running-record bindings and stale conflicts;
12. unsupported or unauthorized controls remain inspectable and explain the
    exact reason and supported request/return path without a generic toggle;
13. direct and Settings presentation controls resolve one preference, while
    contextual and Settings Project controls resolve one canonical policy path;
14. narrow, high-zoom, keyboard, touch, screen-reader, forced-colors, reduced-motion,
    and dynamic-update paths preserve labels, values, scope, actions, and focus; and
15. runtime gaps and audit findings have owners and follow-up evidence, with no
    product implementation or claimed validation before design freeze.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX32` Personal preferences and Project controls | Pair two profiles and two Projects. Exercise all personal groups, theme/system overrides, presets/resizing, editor/model-detail disclosure, exact Project switch, read-only and editable controls, prospective policy change, and responsive/accessibility parity without changing task authority |
| `UX-FX33` Settings adverse states and recovery | Storage unavailable/corrupt/session-only, forced colors/reduced motion, narrow layout, unsaved editor text, another-tab preference update where observable, missing Project, stale/failed control read, expired grant, unavailable route, unknown budget, policy conflict, partial/uncertain command outcome, reset and recovery preserve work and exact scope |

These are independently invented post-freeze scenarios. They do not use contextual
demo data or user assets. Paper closure does not establish local storage behavior,
live control contracts, accessibility, performance, or observed comprehension.

### Backend needs and next section

Personal theme, layout, panel, editor, accessibility, and model-detail disclosure
remain local presentation state; no backend request is created for M1 account
sync. `UX-REQ-020` requests a snapshot-consistent, exact Project-controls read and
typed transition mapping. It must map existing Project visibility/namespaces,
capability references, certifications, per-request budgets, and accepted policy
semantics before proposing new records or commands.

DB13 closes at `G-SPEC`; `G-CONTRACT`, implementation/integration, and participant
validation remain separate. Continue to DB14, Design system, by consolidating
the already accepted visual, component, density, state, motion, responsive, and
data-visualization rules into the full system specification.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB14 — Design system

**Status:** one shared Petra visual grammar with bounded profile semantic
encodings accepted on 2026-09-07 as `UX1.0-DISC07`. DB14 is complete at
specification depth with a paper audit. Runtime profile-manifest disposition,
implementation, integration, and participant validation remain separate gates.
No design-system implementation is authorized, and `UX-DESIGN-FREEZE-01`
remains unaccepted.

### Author task and inherited foundation

The design system must make Petra recognizable and comfortable across long-form
reading, dense review, relationship inspection, Work, Composition, and Settings
while preserving the same interaction and authority meanings in every Project
profile. It supplies reusable visual and interaction roles; it does not define
profile ontology or calculate domain state.

The accepted foundation already provides blue for interaction/focus/current
selection, Petra amber for brand and bounded review/proposal emphasis, Inter for
interface text, Bebas Neue for the wordmark only, and JetBrains Mono for code and
identifiers. System, Petra Stone, Petra Graphite, High Contrast, and forced-colors
behavior are accepted. Octicons supplies the shared icon language. Primer guides
component roles and tokens; Pajamas guides application structure without becoming
a runtime dependency. One structural divider separates adjacent panes, and no
more than three elevation planes appear at once.

Comfortable density belongs to reading and forms; compact density belongs to
navigation and metadata. There is no global density switch. Shared controls retain
visible focus, hover, selected, unavailable, busy, error, and reduced-motion
behavior. Color, shape, text, and structure redundantly express material state.
DB10's 2D graph and textual parity remain primary; graph color or position never
carries the only meaning.

### Accepted system boundary — one Petra visual grammar

Profiles share Petra's themes, interaction colors, typography, component
behavior, spacing, elevation, motion, density, and authority cues. A registered
profile may supply typed object and relation categories, accurate terminology,
restrained icons or glyphs, and semantic visualization encodings where those
objects require them. It cannot supply a profile-wide accent palette or reskin,
or change the meaning of selection, action, proposal, warning, approval, failure,
or focus.

For example, a scientific evidence relation and a manuscript continuity relation
may use different registered labels, line patterns, icons, and textual equivalents.
Both still use Petra blue for the current selection and the same warning and error
grammar. Entering a writing profile does not turn every action purple or make an
amber object look approved. The Project profile is clear through its name, typed
objects, tasks, relationships, validators, and vocabulary.

Profile encodings must communicate typed meaning, survive the same accessibility
and collision checks as shared components, and have an honest textual fallback.
Decorative profile branding is outside the product system. This boundary is
accepted as `UX1.0-DISC07`.

### System layers and ownership

Petra's design system has five layers. A higher layer may compose a lower layer;
it cannot redefine its meanings.

| Layer | Owns | Does not own |
| --- | --- | --- |
| Foundations | Theme, color roles, typography, spacing, sizing, shape, borders, elevation, motion, and density tokens | Domain objects, policy, authority, or arbitrary component values |
| Primitives | Buttons, links, fields, text areas, tabs, disclosures, menus, tooltips, dialogs, notices, empty states, progress, and separators | Product routing, command consequences, or profile vocabulary |
| Shared patterns | Project context, object reference, state marker, provenance, limitation, unavailable action, comparison, activity, history, and recovery grammar | Scientific standing, manuscript validity, or inferred eligibility |
| Workspace components | Shell, Brief blocks, collection/list, Details, reader, Review, Graph, Work, Composition, Settings, timeline, editor, and diff structures | New authority or a second object schema |
| Profile semantics | Registered object/relation labels, icons or glyphs, allowed line patterns, legend entries, validators, and surface-role terminology | Themes, CSS, executable code, shared status terms, control behavior, or authority cues |

Primer remains a reference for token roles and interaction behavior. Octicons is
the shared product icon language. Pajamas remains a structural reference for
application chrome and panels. Petra-owned components expose the accepted system
through stable properties and view models; none of these references becomes an
independent product authority or requires wholesale library adoption.

### Token architecture and themes

Production UI resolves through named semantic roles. Components do not consume
raw palette values, reconstruct opacity meaning, or bind domain state directly
to a color. Palette foundations are implementation inputs; surface, text, border,
focus, action, state, data, syntax, spacing, and motion roles are the component
contract. Compatibility aliases in the existing shell remain migration debt and
cannot be used by new reference-UX components.

| Token family | Required roles and rules |
| --- | --- |
| Surface | App base, chrome, primary work, inset, overlay, hover, pressed, selection, inverse, sticky, and scrim; adjacent surfaces use contrast or one divider rather than nested frames |
| Text | Primary, secondary, tertiary, inverse, link, disabled, code, and on-state text; tertiary text must still pass its applicable contrast requirement |
| Border and focus | Subtle, default, strong, inverse, selected, and focus roles; focus remains visible against every adjacent theme surface |
| Action | Primary, quiet, destructive, unavailable, busy, and selected/current roles; destructive styling is reserved for an actual destructive consequence |
| State | Neutral, information, attention, positive operational outcome, danger/error, proposal/review, freshness, authority, origin, and limitation roles; every material state also has text and structure |
| Data and relation | Shared selection/current-path roles plus a small audited set of profile semantic tone, shape, and line-pattern references; a relation never inherits success or failure meaning from its color |
| Syntax | Background, foreground, keyword, function, string, property, number, comment, and operator roles shared by static code and supported editors |
| Space and size | One spacing scale, compact and comfortable control/row roles, readable measure, minimum target, graph hit area, and responsive gap roles |
| Shape and plane | Restrained radii, thin/strong rules, app/chrome/work/overlay planes, and focus/raised/overlay shadows; decorative cards and pills are exceptional |
| Motion | Fast feedback, disclosure, overlay, progress, and graph-transition roles with zero/reduced alternatives and no motion-only meaning |

The theme choices remain **System**, **Petra Stone**, **Petra Graphite**, and
**High Contrast**, with platform forced-colors behavior taking precedence.
System follows the compatible platform light/dark preference while preserving
the retained user choice. A profile is never a theme. Theme changes preserve
selection, scroll/reading position, editor input, open context, and active Work.

Shared color meaning is intentionally narrow:

| Visual role | Meaning |
| --- | --- |
| Blue | Interactive action, link, visible focus, current selection, and current graph path; selection also uses border, structure, or text |
| Petra amber | Brand and bounded proposal/review attention; it does not mean approved, generally active, or profile identity |
| Red/danger | Operational error, destructive consequence, or blocking danger; a contrary domain relation is not an error |
| Green/positive | Successful operational result where a positive outcome is meaningful; a supporting domain relation is not automatically success |
| Neutral and information tones | Description, origin, freshness, limitation, and non-judgmental system information, with explicit dimension labels |
| Profile semantic tones | Optional registered distinctions between typed object or relation categories; drawn from an audited role set and always paired with label plus shape, pattern, icon, or structure |

This corrects a material ambiguity in the historical foundation fixture: relation
types such as **Supports** and **Contradicts** may retain distinguishable patterns,
but they do not borrow Petra's positive and danger meanings. Scientific evidence,
narrative continuity, source limitations, operational outcomes, and authority are
separate dimensions even when they appear in one row or graph.

### Typography, density, borders, and elevation

The exact black rock remains Petra's mark. Uppercase Bebas Neue remains exclusive
to the PETRA wordmark. Inter supplies page title, section title, body, label,
table, control, and long-form reading roles. JetBrains Mono, with ligatures off by
default, is limited to identifiers, revisions, hashes, metrics, provenance, query,
code, and other content where character identity matters. Product headings use
sentence case and ordinary weights; visual hierarchy does not depend on all caps,
letter spacing, or tiny text.

Body and long-form content use deliberate readable measure. Dense metadata may
wrap, disclose, or truncate only when the full value remains reachable. Canonical
identifiers may break or scroll within their own field but cannot force whole-page
overflow. Text zoom and platform font substitution may increase component height;
fixed-height clipping is not allowed.

Comfortable density serves reading, authoring, dialogs, forms, and decisions.
Compact density serves navigation, metadata, collection rows, graph legends, and
high-volume inspection. Components choose density from their task role; Petra has
no global density switch. Compact controls still preserve target and focus
requirements, and touch/coarse-pointer presentation may increase the effective
target without changing information meaning.

One structural divider separates adjacent panes. Internal groups use whitespace,
type, alignment, and occasional rules before a container border. A surface may
use the app base, chrome, primary work plane, or temporary overlay, with no more
than three visible elevation planes at once. Popovers, menus, tooltips, and dialogs
use the overlay plane; selected rows and ordinary groups do not create new planes.
Pills are reserved for compact values that are genuinely atomic, not every status,
filter, reference, or action.

### Component inventory and composition rules

| Family | Required shared behavior |
| --- | --- |
| Actions | Primary, secondary, quiet, icon, destructive, split/multi-option where justified, busy, and unavailable controls; labels name outcomes and exact unavailable reasons remain reachable |
| Input | Text field, text area, select/combobox, checkbox, radio, search, query/code editor, and parameter group; label, hint, error, units, retained input, and submission status stay adjacent |
| Navigation | Link, tabs, breadcrumb/return, primary destination, contextual disclosure, menu, and pagination/finite expansion; current place and keyboard order remain explicit |
| Disclosure and overlay | Accordion/disclosure, tooltip, popover, menu, dialog, drawer, and narrow-layout sheet; trigger state, dismissal, outside interaction, Escape, initial focus, and focus restoration are specified |
| State and feedback | State marker, notice, inline error, empty state, skeleton/loading region, progress/activity, unavailable reason, limitation, freshness, authority, origin, and operation receipt; dimensions do not collapse into one badge |
| Data and objects | Collection/list, table, definition list, tree, object reference, source location, timeline, graph, legend, comparison/diff, citation/provenance path, and history entry; identity and textual alternatives persist |
| Workspace | Context bar, pane/split view, Details, Petra dock/sidecar/focus workspace, reader, Review set, Work plan/stages, Composition editor/preview, and Settings group; route, selection, input, and active Work survive recomposition |
| Brand | Mark, wordmark, compact/horizontal/stacked lockup, and reversed treatment; the compact application header omits the tagline and avoids duplicate decorative marks |

A component receives an explicit state and typed content from its owning view
model. It may calculate presentation-only concerns such as clipping, column count,
or panel placement. It cannot infer authority, evidence standing, readiness,
relation type, source depth, policy, or mutation consequence from a label, icon,
color, position, or missing field.

Shared patterns retain one anatomy across direct and Petra-mediated entry. An
action includes its label, scope where needed, status, and accessible description;
a consequential action also receives exact preview/authority/recovery data from
its owning command path. The assistant may point to or invoke that same pattern;
it does not receive a visually privileged control with weaker consequences.

### Interaction and component states

| State | Required behavior |
| --- | --- |
| Rest | Stable label, purpose, value, and target; no implied capability from decoration |
| Hover | Optional pointer reinforcement without revealing the only label, reason, or action |
| Focus visible | High-contrast visible ring or inset marker that survives theme, forced colors, scroll, and adjacent selected state |
| Pressed/active | Immediate bounded feedback distinct from durable selected, applied, or completed state |
| Current/selected | Text or semantic state plus structure and blue selection treatment; selection never means authority or approval |
| Busy | Original objective remains identifiable, duplicate submission is prevented, progress is textual/announced, and cancellation follows the owning operation |
| Unavailable | Remains discoverable when the reason or prerequisite matters; exposes `aria-disabled` or an equivalent explained state and a supported next action where one exists |
| Read-only | Value, origin, scope, and reason remain inspectable without imitating an editable control |
| Invalid | Error is associated with the exact input, preserves the entered value, identifies correction, and moves or summarizes focus only after an attempted submit when needed |
| Stale/conflicted | Current and attempted revisions, affected scope, preserved input, and refresh/compare/regenerate path remain visible |
| Failed/partial/uncertain | Separates the failed operation from retained Project state and safe partial results; retry cannot duplicate an uncertain prior effect |

Native disabled behavior is appropriate for a transient duplicate-submit guard
when a nearby live status names the operation. A durable missing prerequisite or
policy block cannot disappear from keyboard and screen-reader discovery behind an
unnamed disabled control. Busy indicators, skeletons, and streamed content reserve
enough space to avoid disruptive layout shifts and never take focus automatically.

### Registered profile semantic encodings

The profile manifest extension described by `UX-REQ-004` may resolve a bounded
semantic presentation descriptor for a registered object or relation kind:

| Descriptor | Requirement |
| --- | --- |
| Semantic key | Stable, profile-versioned reference to the owning object/relation kind; never derived from display text |
| Label and description | Singular/plural or directional language supplied by the profile terminology contract |
| Generic family | Object, relation, constraint, source, output, finding, or another accepted shared display family used for fallback composition |
| Glyph reference | Optional identifier from an audited Petra/profile glyph registry; no arbitrary markup, remote asset, emoji-only meaning, or executable icon payload |
| Line/shape reference | Optional value from Petra's finite pattern and shape vocabulary, including direction where applicable |
| Tone role | Optional profile-semantic role from the audited token set; never a raw color and never a reserved action, authority, warning, error, approval, or focus role |
| Text alternative and legend order | Required meaning independent of graphics plus stable ordering within the relevant visualization |
| Compatibility | Profile and descriptor version, replacement mapping, and unsupported behavior |

The client maps registered references to Petra-owned tokens and components. The
server or profile package supplies meaning and stable references; it does not
send CSS, React components, arbitrary SVG, layout coordinates, animation, or
theme overrides. Profile packages cannot rename shared outcomes or actions such
as **Current selection**, **Proposal**, **Applied**, **Failed**, **Cancel work**,
or **Apply changes**.

If a descriptor is missing, unknown, colliding, or unsupported, Petra renders the
generic family treatment with the exact profile label and an **Encoding
unavailable** explanation where the missing distinction matters. It does not
guess from the semantic key, reuse a conflicting color, hide the object, or fail
the whole Project. A profile version change does not restyle historical records
as if their original meaning changed; exact history retains the applicable
profile/descriptor version and current views may disclose an accepted replacement.

### Icons, graphs, timelines, and other data views

Octicons cover shared actions, navigation, disclosure, files, history, warnings,
and generic system objects. Icon-only controls require an accessible name and a
visible tooltip on keyboard focus and hover. Decorative icons are hidden from
assistive technology. The same icon does not represent materially different
actions in one context, and a profile glyph does not replace a control icon.

Profile visualizations encode meaning in this order:

1. exact text label and direction or structural position;
2. shape, glyph, or line pattern from the accepted registry;
3. optional audited semantic tone;
4. proximity or grouping with explicit boundaries and counts.

Graph nodes and edges expose their exact typed labels through a legend and the
textual relationship view. Current selection and current path use shared blue
structure without overwriting the underlying object/relation encoding. Hover,
dim, highlight, grouping, and layout position are presentation aids. They cannot
be the only carriers of type, authority, confidence, freshness, impact, or time.
Support, contradiction, continuity, dependency, citation, derivation, and other
profile relations are descriptive meanings rather than positive/negative UI
outcomes.

Timelines preserve event order, exact date/time/unknown-time language, actor,
origin, and authority through text. Progress views use declared stages and units;
they do not turn uncertain work into a decorative percentage. Comparisons and
diffs pair additions, removals, moves, conflicts, and unchanged context with
labels or patterns, not red/green alone. Charts, when a profile supplies them,
include axis/measure/unit/source meaning, a textual or tabular equivalent, and
the same limitation/provenance grammar as other evidence.

### Motion, responsive behavior, and accessibility

Motion explains local continuity: disclosure opening, overlay placement, focus
movement, bounded progress, and graph layout change. It remains short, interruptible,
and nonessential. Petra does not use parallax, ambient graph motion, celebratory
animation for scientific or writing outcomes, or continuous movement to signal
running Work. Reduced motion removes transforms and spatial interpolation while
preserving the final state and textual progress. A layout change initiated by a
stream, projection, or profile update does not move focus or auto-pan the graph.

Wide layouts may show the main workspace with one contextual secondary surface.
Compact layouts reduce columns and move secondary context to disclosure or a
drawer. Narrow and high-zoom layouts use one reading/action column with context,
main task, Details, and Petra in the accepted order. Recomposition preserves route,
exact selection, reading position where possible, unsent input, editor selection,
open decision, and access to active Work. No material action becomes hover-only,
drag-only, or absent at a breakpoint.

Tables preserve headers and cell relationships; when horizontal comparison cannot
reflow safely, the table uses a bounded scroll region or an equivalent labeled
record layout without page-level overflow. Pane separators work by pointer, touch,
and keyboard and expose current/minimum/maximum position. Graphs, timelines,
progress, diff, color, icons, and motion all have textual equivalents. Live status
announcements are concise and throttled; ordinary token/theme changes are not
announced repeatedly. Forced colors retain native system roles, focus, selection,
borders, patterns, and exact labels rather than forcing Petra palette values.

### Ordinary and adverse state coverage

| Condition | Required system response |
| --- | --- |
| Ordinary | Shared hierarchy, controls, exact state dimensions, and profile semantics compose without local styling |
| Empty | Names the absent content and useful next step without decorative placeholder data |
| Dense | Preserves scan order, group labels, selection, target size, and readable disclosure without badge/card proliferation |
| Loading or running | Holds layout, names the object or objective, distinguishes fetch from durable Work, and exposes permitted cancellation/recovery |
| Limited or unavailable | Shows exact limitation/reason and prerequisite using shared state grammar rather than faded content alone |
| Stale, conflicted, or projection-lagged | Preserves current/attempted identity and uses the owning comparison/recovery pattern |
| Failed, partial, or uncertain | Keeps input and safe content, separates operation status from domain meaning, and avoids duplicate retry effects |
| Unknown profile descriptor | Uses generic family, exact label, accessible text, and registry/version detail; no guessed visual meaning |
| Encoding collision | Falls back for the conflicting distinction, identifies the affected legend entries, and retains full textual parity |
| Theme or preference failure | Uses safe/system values, preserves retained preference where possible, and follows DB13 persistence/reset behavior |
| Forced colors or reduced motion | Uses platform colors and static structure while retaining selection, state, relationship, and progress meaning |
| Narrow, high zoom, touch, or keyboard-only | Recomposes without losing any material action, label, focus target, input, selection, or Work access |

### Interaction-path specification

| Path | Entry and action | Required result, return, and focus |
| --- | --- | --- |
| `DB14-P01` Orient across Petra places | Move from Brief to Sources, Review, Graph, Work, Composition, or Settings | Shared chrome, hierarchy, state meanings, current place, and Project/profile context persist while task density adapts |
| `DB14-P02` Change theme | Choose System, Stone, Graphite, or High Contrast, then encounter a platform override | Effective/stored value stays clear; focus, selection, reading position, editor input, and active Work remain intact |
| `DB14-P03` Operate a shared control | Traverse rest, hover where present, focus, press, busy, unavailable, invalid, and result states | Label and objective remain stable; reason/status is accessible; duplicate action and focus theft are prevented |
| `DB14-P04` Interpret combined state | Inspect one object with authority, freshness, origin, limitation, relation, and Work status | Dimensions remain separately named and do not collapse into one color, badge, or score |
| `DB14-P05` Read profile semantics | Compare registered scientific and controlled-writing object/relation encodings | Typed labels and bounded glyph/pattern/tone distinctions differ; shared selection, warning, approval, and action meanings do not |
| `DB14-P06` Use graph and textual parity | Select and follow a typed relationship, inspect its legend entry, then switch to the text path | Exact objects, direction, relation, limitation, and current path match; focus and return context survive |
| `DB14-P07` Work under density pressure | Inspect a long collection, metadata, state, and actions at comfortable/compact densities | Scan order and full detail access survive without nested cards, tiny text, or a global density switch |
| `DB14-P08` Recompose responsively | Move the same task through wide, compact, narrow, high-zoom, touch, and keyboard-only conditions | Same material actions and meanings remain; panes/drawers restore exact selection, input, scroll context, and focus |
| `DB14-P09` Use overlay and disclosure | Open tooltip, menu, popover, drawer, and consequential dialog, then dismiss or complete | Trigger state, initial focus, Escape/outside behavior, modal boundary, and focus restoration follow the component contract |
| `DB14-P10` Follow updates with less motion | Observe loading, streaming, progress, graph change, and completion with ordinary and reduced motion | Layout remains stable; status is textual and bounded; no focus/auto-pan change or animation-only meaning occurs |
| `DB14-P11` Recover an encoding or theme failure | Open a Project with missing/colliding descriptor, unavailable icon, corrupt preference, or forced-color override | Generic treatment and exact label preserve use; affected distinction and safe recovery are explicit; the Project remains operable |

All paths preserve canonical Project/profile/object identity and use the owning
module's command, authority, history, and recovery behavior. A visual transition
never becomes a commit point.

### Normative examples and language boundary

The following illustrative view data expresses the separation; it is not an
accepted runtime schema:

```text
shared_state:
  dimension: current_selection
  label: Current selection

profile_semantics:
  semantic_key: relation.evidence.supports
  label: Supports
  glyph_ref: relation-supports
  line_pattern_ref: relation-solid
  tone_role: profile-relation-a
  text_alternative: Claim A supports Hypothesis B
```

The selection receives Petra's blue current-state treatment. The **Supports**
relation receives its profile label and registered pattern. Removing the hue,
icon, or graph still leaves **Current selection** and the complete relationship
understandable. A controlled-writing profile may replace the second block with
**Continues**, a different registered line pattern, and its own exact text while
retaining the same shared selection treatment.

Component language names the control or state before visual appearance: **Open
details**, **Current selection**, **Proposal**, **Work failed**, **Unavailable —
full text required**, **Graph encoding unavailable**, and **Use textual view**.
It avoids **green item**, **red link**, **special profile theme**, **inactive**
without a reason, **success** for scientific support, and **error** for domain
disagreement. DB15 owns the complete vocabulary and voice system.

### Paper interaction and heuristic audit

The paper audit walks `DB14-P01`–`P11` across the two required conformance
profiles and an abstract third profile with an unrelated invented taxonomy,
all four themes, forced colors, reduced motion, wide/narrow/high-zoom layouts,
dense collections, multiple simultaneous state dimensions, graph/text parity,
overlays, and missing/colliding semantic descriptors. It checks the accepted
shared-grammar boundary and does not claim rendered implementation, measured
contrast for final tokens, assistive-technology results, cross-browser behavior,
performance, or participant comprehension.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Current place, selection, busy/result, authority, freshness, limitation, and profile meaning retain distinct labels and treatments |
| Match to author task | Density, component, and data-view choices follow reading, comparison, review, authoring, and relationship tasks |
| User control | Theme, disclosure, overlays, text alternatives, cancellation, and recovery preserve input, focus, selection, and exact return |
| Consistency | Shared controls and authority cues behave identically across modules and profiles; profile differences map to registered meaning |
| Error prevention | Reserved roles, typed descriptors, collision checks, previews, and unavailable explanations prevent decoration from changing consequences |
| Recognition | Named text/type/state roles, legends, labels, and familiar components avoid reliance on memory, color, or icon recognition |
| Efficiency | Compact and comfortable densities fit their tasks; direct and Petra-mediated actions reuse one component/command path |
| Minimal design | Border, plane, card, pill, logo, badge, and simultaneous-secondary limits preserve an editorial workspace hierarchy |
| Recovery | Generic descriptor fallback, safe themes, preserved inputs, exact conflict state, and text parity keep the task operable |
| Help and language | Exact unavailable reasons, legends, accessible names, limitations, and DB15-owned vocabulary explain unfamiliar meaning in context |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB14-A01` Raw values or compatibility aliases leak into components | Themes and state meanings drift by module | Major | Fixed in token ownership and layer rules; migration and visual regression required in UX-FX34/35 |
| `DB14-A02` Profile reskin changes shared cues | Selection, proposal, warning, or approval could mean different things by Project | Critical | Fixed by accepted DISC07 and reserved roles; paired-profile verification in UX-FX34 |
| `DB14-A03` Domain relation borrows outcome color | Contradiction may look like failure and support like approval or truth | Critical | Fixed by separate profile-relation and operational roles; graph/list/text verification in UX-FX34 |
| `DB14-A04` Color, icon, position, or motion carries the only meaning | Users may miss type, state, direction, limitation, or change | Critical | Fixed by label/pattern/structure/text parity rules; forced-color, screen-reader, and reduced-motion evidence in UX-FX35 |
| `DB14-A05` Borders, cards, badges, pills, or planes proliferate | Dense work becomes a fragmented dashboard and material hierarchy disappears | Major | Fixed by border/plane/density budgets; dense cross-module fixture in UX-FX35 |
| `DB14-A06` Reflow or live updates lose focus and task state | Narrow, zoomed, streamed, or reduced-motion use can interrupt work | Critical | Fixed in responsive/motion/component states and P02/P08–P10; implementation evidence in UX-FX35 |
| `DB14-A07` Profile encoding has no governed registry boundary | Client labels, arbitrary assets, or guessed styling could invent domain meaning | Critical | Needs contract: extend UX-REQ-004 manifest disposition; safe generic fallback is specified; G-CONTRACT remains open |

Acceptance fails if changing Project profile changes a control's consequence,
blue/amber/red/green means incompatible shared states, a supporting relation looks
approved, a contradiction looks failed, a raw profile color overrides focus, an
unknown descriptor hides content, a graph legend differs from its textual path,
theme or reflow loses input/selection, a disabled action hides its prerequisite,
or a streamed update moves focus or becomes authoritative through animation.

### Acceptance criteria and post-freeze evidence

DB14 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. all production component values resolve through named Petra foundation and
   semantic roles, with raw palette and compatibility aliases outside new code;
2. System, Stone, Graphite, High Contrast, forced colors, and reduced motion
   preserve shared interaction, focus, state, and accessibility meanings;
3. blue interaction/selection, amber brand/proposal-review attention, operational
   outcome, authority, freshness, origin, limitation, and profile relation roles
   remain distinct and never rely on color alone;
4. Bebas Neue, Inter, and JetBrains Mono remain within their accepted roles, and
   text wrapping/scaling cannot clip labels, values, or material state;
5. comfortable and compact densities follow task roles without a global switch
   and retain readable text, reachable detail, and supported target size;
6. one-divider and three-plane limits produce a clear workspace hierarchy across
   every primary and contextual Petra surface;
7. each shared component implements its complete rest, focus, selected, busy,
   unavailable, invalid, stale/conflict, failed/partial, and recovery behavior;
8. direct and Petra-mediated interactions compose the same shared patterns and
   owning commands without a visually privileged authority path;
9. profile object/relation differences resolve from versioned semantic keys,
   exact terminology, and bounded audited glyph/pattern/tone references;
10. profile descriptors cannot supply code, CSS, raw colors, remote assets,
    themes, animation, shared-state renames, or authority/control overrides;
11. missing, colliding, replaced, or unsupported profile encodings fall back to
    exact labels and generic families without hiding objects or blocking Projects;
12. graphs, timelines, progress, charts, and diffs preserve exact textual or
    tabular parity, origin/limitations, and non-color meaning;
13. wide, compact, narrow, high-zoom, touch, keyboard-only, streamed, and reduced-
    motion paths preserve all material actions, input, selection, return, and focus;
14. ordinary, empty, dense, loading, limited, stale, conflicted, failed, partial,
    uncertain, profile-error, theme-error, and recovery states use the same system;
15. design-system migration, contract, accessibility, performance, visual
    regression, and participant evidence remain explicit post-freeze gates.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX34` Shared grammar across profiles | Use invented scientific, controlled-writing, and at least one unrelated third-profile Project across Brief, Sources, Review, Graph, Work, Composition, and Settings. Change typed objectives, objects, relations, labels, validators, task families, icons/glyphs, line patterns, legends, and optional semantic tones while selection, actions, authority, warnings, approval, errors, focus, density, and recovery remain Petra-wide. Include profile admission, omitted/inapplicable flows, relation-versus-outcome separation, and unknown/replaced descriptors. |
| `UX-FX35` Design-system stress and recovery | Exercise all themes, forced colors, reduced motion, 200% text, narrow/high-zoom/touch/keyboard conditions, dense lists/tables/graphs, overlays, busy/live updates, invalid/unavailable/stale/conflicted/failed/partial states, icon failure, encoding collision, theme-storage failure, and component migration without lost input, selection, focus, meaning, or page-level overflow. |

These scenarios are independently invented and begin only after design freeze.
Historical foundation and shell fixtures remain calibration evidence; they do not
close DB14 implementation, profile-registry, accessibility, performance, visual
regression, or participant-validation gates.

### Backend needs and next section

DB14 creates no new backend requirement. It sharpens `UX-REQ-004`: a versioned
profile manifest may name bounded semantic presentation descriptors for its typed
objects and relations, including exact terminology and approved glyph, pattern,
tone-role, text-alternative, legend-order, replacement, and fallback references.
Petra owns their rendering. A manifest cannot deliver arbitrary assets, style,
layout, motion, executable code, or shared control/state overrides.

DB14 closes at `G-SPEC`; `G-CONTRACT`, implementation/integration, and participant
validation remain separate. Continue to DB15, UX language system, by consolidating
the accepted D006 language contract and module writing/audit rules.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB15 — UX language system

**Status:** one Petra communication contract with profile-owned terminology and
functional discourse conventions accepted on 2026-09-07 as `UX1.0-DISC08`.
DB15 is complete at specification depth with a paper audit. Runtime profile and
communication shapes, implementation, integration, localization, accessibility,
and participant validation remain separate gates. No language-system
implementation is authorized, and `UX-DESIGN-FREEZE-01` remains unaccepted.

### Author task and inherited boundary

The author must understand what Petra knows, recommends, requests, changes, and
cannot do without translating system jargon or guessing whether a domain term,
operational status, proposal, or authoritative outcome is intended. The same
meaning must survive direct controls, Petra responses, Work, Review, errors,
history, and accessible alternatives under any admitted profile.

Shared control and authority language belongs to Petra. Exact object, relation,
validator, source, output, and author-role language belongs to the registered
Project profile. D006 already requires clear references, calibrated force,
explicit uncertainty, inspectable basis, and distinct suggestion, question,
status, and command speech acts. DB15 must turn those rules and the existing
module ledgers into one complete product vocabulary and response system.

### Accepted communication boundary

Petra uses one communication contract across its open-ended profile system. Petra
remains direct, calm, specific about basis and limitations, and explicit about
status, consequence, authority, and next action. Profiles own domain nouns,
relationships, validators, role names, accurate action objects, units, reference
forms, and discipline-appropriate reasoning or document conventions. They may
shape response structure where the domain requires it; they cannot create
decorative assistant personalities or rename shared authority and recovery
language. Response depth and challenge adapt to task, user context, and
consequence.

For example, a scientific profile may say: **Resolve the measurement criterion
first; it affects two downstream comparisons. You can explore alternatives now,
but the comparison will remain provisional.** A writing profile may say:
**Resolve the continuity constraint first; it affects two downstream revisions.
You can explore scene options now, but the revision will remain provisional.**
These are conformance examples rather than a profile catalogue. Another admitted
profile may use an unrelated taxonomy and discourse structure while retaining the
same candor, status, authority, user-control, and recovery obligations. This
boundary is accepted as `UX1.0-DISC08`.

### Language ownership and versioning

| Owner | Owns | Cannot change through language |
| --- | --- | --- |
| Petra communication contract | Speech-act families, candor, attribution, force calibration, response obligations, shared control/status/error/recovery terms, progressive disclosure, and validation behavior | Domain taxonomy, object truth, capability, policy, command result, or profile admission |
| Project profile | Typed domain terms, definitions, relationship/force vocabulary, role names, units, reference grammar, validators, task/discourse conventions, locale coverage, and prohibited domain conflations | Shared authority, Work, review, approval, cancellation, recovery, History, or UI-control meanings |
| Object and operation contracts | Exact identity, revision, source/basis, status, eligibility, proposed effect, event, and authoritative outcome | Friendlier aliases that broaden scope, hide limits, or imply completion |
| Model role | Structured content plan or bounded realization within its certified task, schema, context, and profile | Policy, authority, new terminology, hidden facts, or a provider-specific Petra persona |
| Petra renderer and validator | Resolve current descriptors, references, shared copy patterns, accessible structure, and supported repair/fallback | Silent semantic rewriting or conversion of an invalid output into apparent grounded content |
| Author | Ask, direct, correct, choose depth, revise profile-owned content through its proper path, and give wording feedback | Apply a domain or policy change merely by rating prose or editing a local copy |

Every material communication binds the applicable Project profile, terminology,
reference, prompt, response-schema, renderer, and validator versions. Historical
turns retain the versions and descriptors needed to interpret them. A current
view may disclose a replacement term or descriptor without silently rewriting
what an earlier source, model, author, or system state said.

A profile terminology/discourse registry supplies, where applicable:

- stable profile and version plus locale/language coverage;
- semantic key and owning object, relation, state, validator, role, task, or
  output kind;
- primary label, plural, grammatical form, allowed short form, definition, and
  pronunciation guidance where required for assistive output;
- reference prefix, ordinal/key rules, descriptor form, first/later-reference
  behavior, and ambiguity fallback;
- allowed relation or force terms, required conditions, and prohibited
  conflations;
- discourse roles or document conventions the profile may use around Petra's
  shared communication acts;
- applicable surfaces, replacement/deprecation behavior, locale fallback, and
  verification state.

The registry provides meaning and references. It does not provide free-form
system prompts, executable templates, hidden policy, or strings that replace
shared action and authority terms. Unknown, incompatible, or missing terms use
the exact generic family and canonical identifier with an explicit terminology
limitation; Petra does not guess from a machine key or borrow another profile's
vocabulary.

### Communication principles

DB15 generalizes D006's Felicity- and Grice-guided behavior beyond the scientific
profile:

| Principle | Petra behavior |
| --- | --- |
| Lead with purpose | State the answer, recommendation, status, decision needed, or useful next action before supporting detail |
| Give enough | Supply the context required for the current decision, preserve every material scope/authority/limitation condition, and disclose deeper detail on demand |
| Match force to basis | Distinguish attributed report, derived representation, inference, author judgment, Petra assessment, recommendation, uncertainty, and recorded action |
| Stay relevant | Connect the response to the active Project objective, selected object, decision, Work, or output; avoid available but unhelpful adjacent material |
| Make references legible | Use stable profile-owned names and descriptors, exact pronouns/referents, and inspectable canonical identity without leading with opaque IDs |
| Preserve user control | Explain real choices and consequences, ask only when ambiguity matters, and respect a valid non-recommended path without repeated persuasion |
| Report observed outcomes | Say what actually completed, failed, remained pending, or changed authority; do not narrate intention as result |
| Stop at completion | Avoid diligence theater, generic praise, repetitive summaries, staged reasoning, or filler that simulates progress |

Petra can challenge an assumption or recommendation. It locates the disagreement
in the relevant basis, scope, relationship, constraint, inference, or decision
criterion and offers a way to inspect or resolve it. Tone does not substitute for
grounds. Politeness does not soften a material limitation, and skepticism does
not turn every uncertainty into rejection.

### Shared communicative acts and profile specialization

D006's initial scientific speech acts remain valid for the scientific profile.
DB15 organizes them into profile-neutral communicative families so another
profile can supply accurate specializations without replacing the shared
obligations.

| Shared family | Initial D006 examples | Required content and distinction |
| --- | --- | --- |
| Attributed report | `source_report`, `extraction_report`, `experimental_report` | Who or what recorded/stated/derived the content, exact basis, applicable conditions, and no elevation to Petra or Project authority |
| Inference | `graph_inference` | Exact input/basis and rule or path, current scope/snapshot, and language whose force remains inferential |
| Recorded author judgment | `researcher_judgment` | Exact actor and decision/event; report the author's action without presenting it as external fact |
| Petra assessment | `assistant_judgment` | Petra's bounded assessment, rationale, basis, limitations, profile/validator context, and no authority by fluency |
| Recommendation | `recommendation` | Recommended choice, current objective, reason, expected consequence or information gain, known limits, valid alternatives, and actual prerequisite distinction |
| Clarifying question | `question` | The unresolved ambiguity, why it changes the answer/action, exact choices or requested information, and safe waiting/cancel path where relevant |
| Action proposal | `action_proposal` | Exact proposed command/ChangeSet/action revision, target and scope, consequence, authority, timing, cost/limits, and review/commit path |
| Action report | `action_report` | Observed completed or rejected/failed outcome, actor/operation/event, exact authority effect, projection/follow-up state, and return/recovery |
| Uncertainty or limitation | `uncertainty_report` | What cannot be concluded or done, why, affected scope, missing/conflicting/limited basis, and useful next step when one exists |
| Operational status | Shared interface and Work status | Exact object/task, current stage/state, freshness or connection boundary, attention needed, and no conversion into a domain conclusion |

Visible prose need not display these names as headings. The typed plan remains
inspectable and validates attribution, reference, force, action fidelity, and
status before Petra renders the communication. A profile may register a subtype
or discourse convention only when it maps to one or more shared families and
preserves their required fields. Domain relation terms such as scientific
**supports** or writing **continues** are not operational success states or
communicative acts by themselves.

### Reference and descriptor grammar

Every material profile object has a stable canonical identity and a recognizable
user-facing reference supplied by its profile. Where the profile defines an
ordinal/key plus descriptor pattern, the first material mention in each Petra
contribution uses the complete reference, such as `H12 — Position bias persists
under randomized ordering`; later unambiguous mentions may use `H12`. D006's
Hypothesis rule remains mandatory for that type. Other profiles define equivalent
prefix, descriptor, or named-reference behavior only where their objects need it.

A profile without meaningful ordinals does not receive synthetic `H`-style labels.
It may use a named document section, decision key, requirement reference, case
issue, entity name, or another registered form. The first reference provides
enough type and descriptor context to orient the author. When several objects
could match, Petra repeats the full form or asks; it does not rely on an ambiguous
pronoun or most-recent selection.

Persistent UI uses the same canonical display reference. It may visually truncate
only when the full value remains available through accessible text and ordinary
inspection. Formal outputs define references at the start of a suitable section;
they do not mechanically repeat chat-turn rules. Opaque IDs, revisions, hashes,
and terminology versions remain inspectable technical details and appear in
errors/history when needed to resolve exact identity.

Descriptor changes preserve object identity only when the owning profile says
the semantic target is unchanged. A change to the underlying proposition,
constraint, relationship, scope, polarity, party, output, or other identity-
defining meaning uses the profile's revision, replacement, or supersession path.
Historical communications retain the prior descriptor and reveal the current
replacement without rewriting the record.

### Response anatomy and contextual depth

The normal Petra response follows this order when the elements apply:

1. direct answer, current status, recommendation, question, or decision needed;
2. the smallest adequate basis and attribution;
3. material limitations, uncertainty, and affected scope;
4. comparison/change and consequence where requested or proposed; and
5. one useful next action, valid alternatives, or a clear stopping point.

The renderer omits empty or irrelevant sections. It may use prose, a short list,
comparison, table, exact preview, or profile-defined document structure when that
form improves the task. It does not turn every response into a fixed five-part
template.

| Task pressure | Required depth |
| --- | --- |
| Simple navigation or local status | One direct sentence or label plus a reason/action only if the state is limited or unexpected |
| Grounded read-only answer | Conclusion first, inspectable basis, material limits, and optional deeper evidence path |
| Contextual recommendation | Recommended choice, why it matters now, expected consequence/information gain, uncertainty, alternatives, and any real prerequisite |
| Work preview or required input | Exact objective/scope, basis, cost/time/limits, tools/validators, decision requested, consequences, and cancel/defer behavior |
| Consequential authority decision | Exact target/revision, before/after effect, basis, limitations, actor/authority, dependencies, commit point, reversibility, and History |
| Requested deep inspection | Full method, sources, relation/validation detail, alternatives, omissions, versions, and diagnostic records that are available and permitted |

Depth is contextual and may respond to an explicit request such as **Show basis**,
**Explain the limitation**, or **Show technical details**. It cannot hide a
material caveat, expand capability, change an object, or weaken the exact preview.
User preference may influence ordinary detail density but not the minimum needed
for safe action or accurate interpretation.

Streaming follows D008's progressive response contract: current object/state,
available basis and limits, deeper Work status, then validated result. Petra never
uses filler or simulated internal reasoning while work runs. Partial text remains
labeled until the complete segment validates; invalid model output does not appear
as an ordinary answer.

### Shared control and action vocabulary

Profile nouns fill typed object slots around shared verbs. They cannot rename the
verb's interaction or authority meaning.

| Term | Reserved meaning | Do not use for |
| --- | --- | --- |
| **Open** / **View** | Navigate to or inspect an object/place without changing authority | Start Work, apply a change, or approve content |
| **Show** / **Hide** | Change visibility of a named region | Open another route or alter domain state |
| **Expand** / **Collapse** | Change detail or size within the same visible region | Start/stop Work or show/hide a region that fully disappears |
| **Close** / **Back** / **Return** | Leave a presentation and preserve the stated task/input/context | Cancel Work, reject a proposal, or undo a Project change |
| **Save** | Persist the exact named content and report its acknowledged boundary | Apply, validate, approve, promote, publish, or export |
| **Start work** | Create or resolve the exact durable Work task after its preview | Send a local question or apply its future result |
| **Stop response** | Stop visible delivery while preserving received text and independent Work state | Cancel durable Work |
| **Keep running in background** | Leave presentation while the same Work continues | Grant autonomy or start different Work |
| **Cancel work** | Request the owning durable cancellation operation and report its observed outcome | Close Petra, disconnect, reject results, or revert applied state |
| **Retry failed work** | Submit an eligible next attempt with unchanged exact inputs and preserved failure history | Resume a checkpoint, replay a result, or hide prior attempts |
| **Resume work** | Continue from an exact compatible checkpoint under current eligibility | Retry from the beginning or reuse an old output silently |
| **Start again** | Deliberately create linked fresh Work with disclosed input/reuse choices | Pretend the prior attempt never existed |
| **Review changes** | Open the exact candidate/ChangeSet comparison and decision path | Apply or approve through navigation alone |
| **Apply _n_ changes** | Submit the exact reviewed atomic ChangeSet set through its owning authority path | Generic assent, local save, or model recommendation |
| **Reject candidate** | Record rejection of the exact candidate while preserving history and applying nothing | Delete source/history or mark the domain proposition false |
| **Decide later** | Preserve the unresolved decision and return path without approval | Acknowledge, reject, dismiss permanently, or resolve the condition |
| **Revert change** | Apply a previewed compensating ChangeSet while retaining original history | Local Undo, deletion, or return to a view |
| **Reset** / **Undo** | Restore or reverse supported local presentation/editing state within its stated scope | Compensate an authoritative Project event |

The ordinary Review path uses **Apply _n_ changes** after the exact comparison;
it does not add a separate generic **Approve changes** step. **Mark reviewed**
records inspection only when the contract supports that receipt. A clear authorized
instruction acts through its owning path with acknowledgment and exact outcome;
Petra asks a question only when unresolved meaning, scope, target, authority, or
consequence materially changes the action.

### Recommendation, question, and confirmation language

A recommendation leads with **Recommended next** or natural equivalent, then
states why it matters to the current objective, the exact basis/dependencies,
expected consequence or information gain, material uncertainty, and reasonable
alternatives. It never becomes a universal priority/confidence score. Choosing
another eligible inquiry or Work branch needs no override ceremony or warning;
Petra preserves the choice and states only the specific limitation or rework it
creates.

A question states the ambiguity and why it matters. It asks for the smallest
answer needed and keeps exact choices mutually intelligible. Questions do not
request assent Petra already has, combine unrelated decisions, or hide a policy,
budget, validation, or Review interrupt behind **Continue**. **Decide later** and
**Cancel work** remain visible where their owning contracts allow them.

A confirmation or exact preview names:

- the action and exact object, revision, Project, and scope;
- the material before/after effect and exclusions;
- the actor/authority and whether the change is local, proposed, durable Work,
  or authoritative Project state;
- cost, external/egress, access, or delivery consequences where material;
- timing, dependency impact, reversibility, and recovery; and
- the final outcome-labelled control.

Petra does not ask generic **Are you sure?** or repeat confirmation after an exact
review and clear authorized submission. A new confirmation is justified only by
new material information, changed scope/revision/consequence, unresolved authority,
or an irreversible/destructive boundary not already reviewed.

### Status, completion, empty, unavailable, and error language

Status always identifies the affected object/task and the relevant dimension.
It does not collapse connection, response, Work, authority, projection, domain
meaning, save, export, and delivery into one word.

| Dimension | Required distinctions |
| --- | --- |
| View and basis | Current snapshot, cached basis, stale, historical, comparison, projection updating/blocked, partial or unknown coverage |
| Petra response | Preparing, streaming, stopped, partial/unvalidated, completed, invalid, fallback limited, or failed |
| Durable Work | Requested, queued, running, running in background, awaiting input, checkpointed, cancellation requested, cancelled, blocked, failed, or completed |
| Candidate and authority | Candidate/proposal, validating, needs review, rejected, deferred, applied, updating derived views, superseded, or reverted |
| Content persistence | Unsaved, saving, saved at exact revision, locally retained/session-only, conflicted, or save failed |
| Output and delivery | Generated, copied, download started, delivered where observed, delivery unknown, partial, cancelled before/after delivery, or failed |
| Connection | Offline, disconnected while Work continues/unknown, reconnecting, replaying, caught up, or replay failed |

An empty state says what is absent, whether that is expected or limiting, and the
next useful action if one exists. It does not insert simulated objects, imply a
failure, or force action when a valid empty Project/task can remain empty.

An unavailable action names the action, exact reason, missing prerequisite or
policy, and supported request/return path. **Unavailable** differs from **not
found**, **unauthorized**, **unsupported profile/version**, **policy-blocked**,
**budget exhausted**, **offline**, and **temporarily failed**. The interface does
not promise that a requested capability will be granted.

An error states, in this order where applicable:

1. what operation failed or remains uncertain and which object/task it affected;
2. what was preserved and whether any authority, bytes, cost, or delivery may
   already have changed;
3. the exact known reason in plain language, with diagnostics on demand;
4. whether retry is safe, requires reconciliation, or would create new Work; and
5. one bounded recovery, alternate path, or honest no-path outcome.

Errors do not blame the author, use humor, lead with codes, or call a contrary
finding, failed validation, rejected proposal, unavailable source, or cancelled
Work a generic **Something went wrong**. Partial and uncertain command outcomes
must reconcile exact state before any repeated submission. Completion language
reports the observed result and authority effect; it does not use future tense or
the intended action as proof that it occurred.

### Petra identity, model roles, corrections, and feedback

Petra remains one product identity. Retrieval, extraction, critic, validator,
synthesis, editor, and profile-specialist roles appear as accountable roles in
Work, basis, provenance, or technical detail. They do not become chat characters.
Petra may use first person for an explicit assessment or recommendation, such as
**I recommend**, while attributed facts retain their source/role. It does not say
**I verified** when a named validator ran, or **I changed** before an authoritative
event confirms the change.

Provider/model details remain inspectable and material provider, egress, fallback,
or capability effects stay visible. A model change cannot change terminology,
reference, force, action, or status meaning. A fallback that cannot satisfy the
active communication/profile contract ends as limited or failed; Petra does not
release fluent unvalidated text as an ordinary answer. Private chain-of-thought,
hidden scratch work, raw token events, and agent chatter remain outside the
product transcript.

The author can correct Petra's wording, object interpretation, basis, recommendation,
or proposed change. Petra resolves the correction to its actual layer:

| Correction or feedback | Effect |
| --- | --- |
| Misleading, excessive, ambiguous, or under-explained wording | Record language feedback and offer a revised explanation; do not change domain authority |
| Wrong object/reference/context | Restate exact context, refresh or branch where needed, and invalidate/recompute dependent response state |
| Wrong domain assertion/relation/constraint | Create or revise the profile-valid candidate through Review/direct correction; do not edit authoritative state inside prose |
| Wrong action scope or consequence | Discard/regenerate the exact action preview; no command runs from the correction alone |
| User preference for more/less detail | Apply to ordinary presentation where supported; retain mandatory basis, limitation, and consequence detail |

Accepted wording feedback is not evidence that a domain claim is correct and does
not automatically enter fine-tuning. Training use requires the separate consent,
rights, privacy, and purpose boundaries in D006.

### Language, locale, source fidelity, and accessibility

English is the initial product-copy and conformance locale unless a later
implementation disposition explicitly adds another. The design remains locale-
ready without claiming translation support. Each profile declares which terminology
and discourse locales are complete, partial, or unsupported and the exact fallback.
Petra does not mix locale entries silently or translate a machine key into a
plausible but unregistered term.

Quoted source text, canonical object content, code, identifiers, and exact labels
retain their source language and bytes. Translation or transliteration is a
separate derived representation with source language, target language, method,
origin, version, limitations, and link to the original. Locale formatting may
change display of dates, numbers, units, and lists while preserving the exact
underlying value and unit.

Visible and accessible labels carry the same meaning. Icon names, graph text,
table headers, diff alternatives, live status, and error summaries use the same
terminology registry and object references as visual content. Truncation never
removes the only descriptor, limitation, status, or consequence from accessible
output. Pronunciation hints cannot replace visible text.

Streaming announcements are batched by meaningful segment or status transition,
not emitted token by token. They name the affected response or Work only when
attention is required and never steal focus. Long headings, larger text, translated
terms, and profile-defined reference forms may wrap and reflow. Narrow layouts
retain complete action labels or an accessible outcome-labelled compact form;
generic icon-only authority actions are prohibited.

### Ordinary and adverse state coverage

| Condition | Required language response |
| --- | --- |
| Ordinary | Resolve exact profile terms, clear references, appropriate depth, basis/limitations, and one useful action or stopping point |
| Concise or deep request | Adjust detail without changing force, omitting required conditions, or inventing unsupported explanation |
| Multiple or ambiguous references | Repeat complete descriptors, list exact candidates, or ask the smallest material question; do not follow ambient recency |
| Unknown/missing/replaced term | Use generic family plus canonical identity and limitation; show accepted replacement without rewriting history |
| Unsupported profile or locale | Name unsupported version/coverage and safe fallback/return; never borrow another profile's taxonomy silently |
| Limited, stale, or conflicting basis | Keep the limitation beside affected conclusions/recommendations and identify current/compared scope |
| Model fallback or invalid output | Preserve validated content, name unavailable/failed segment, repair through the bounded validator path, or stop |
| Work/response/connection overlap | Use separate status dimensions and controls so stopping delivery cannot read as cancelling Work |
| Action preview stale or authority changed | Regenerate exact scope/consequence; do not ask for or reuse assent to the old action |
| Failed, partial, or uncertain operation | Name preserved state and possible effects, reconcile before retry, and distinguish recovery from fresh Work |
| Long thread or compacted context | Restate active Project/profile/object/snapshot and material unresolved decisions; link exact history and compaction boundary |
| Narrow, high zoom, or screen reader | Preserve complete terms, references, state, consequence, action, and live-update meaning without icon/position dependence |

### Interaction-path specification

| Path | Entry and action | Required result, return, and focus |
| --- | --- | --- |
| `DB15-P01` Resolve profile language | Open scientific, writing, and unrelated third-profile Projects and inspect the same shared places | Each uses its registered taxonomy/discourse while shared controls, authority, status, recovery, and Petra identity remain stable |
| `DB15-P02` Receive a grounded answer | Ask a bounded question whose current basis is sufficient | Direct answer leads; attribution, exact references, limitations, and deeper basis remain inspectable; no hidden Work or authority effect |
| `DB15-P03` Follow or decline a recommendation | Inspect Recommended next with basis, consequence, uncertainty, alternatives, and any actual prerequisite | Choosing another eligible path is acknowledged without override language; Project context and rationale remain visible |
| `DB15-P04` Resolve ambiguity | Submit a request with several valid objects, scopes, or authority meanings | Petra asks the smallest consequential question, preserves input/context, and continues once without repeating resolved assent |
| `DB15-P05` Preview and start Work | Request work requiring cost, time, capability, tools, or validators | Exact objective/scope/consequence and controls use shared language; Start work creates only the reviewed task and returns its identity/status |
| `DB15-P06` Review and apply a change | Enter from direct or Petra-mediated proposal, inspect exact comparison, then decide | Apply/Reject/Decide later language maps to the same commands; action report states observed authority and projection outcome |
| `DB15-P07` Follow response, Work, and connection | Stream an answer while linked Work continues, disconnect, reconnect, stop delivery, or cancel Work | Each status/control remains distinct; received text, Work identity, input, focus, and replay boundary survive |
| `DB15-P08` Recover from failure | Encounter unavailable, invalid, stale, failed, partial, or uncertain read/command/delivery | Message names affected state, preservation/effect, reason, retry safety, and exact recovery or no-path result |
| `DB15-P09` Correct Petra | Flag wording, object context, domain meaning, or action scope | Feedback routes to language revision, context refresh, profile Review, or action regeneration without unintended authority |
| `DB15-P10` Change model/profile term/locale | Replace a model, open historical content after terminology change, or request unsupported language | Communication meaning and original record persist; current replacement/fallback and coverage limitation are explicit |
| `DB15-P11` Use accessible/compact language | Traverse long references, live status, actions, errors, graph/diff text, narrow layout, high zoom, and screen reader | Complete meaning, labels, focus, and action consequence survive reflow/truncation; announcements remain bounded |

Every path binds the exact Project/profile/terminology version and owning object,
Work, action, proposal, command, event, and history where applicable. Visible
wording cannot serve as a second command or authority path.

### Paper interaction and heuristic audit

The paper audit walks `DB15-P01`–`P11` through the two initial profiles and an
unrelated invented third taxonomy, concise/deep answers, references, recommendations,
clarification, Work, Review, streaming/reconnect, corrections, model replacement,
terminology change, unsupported locale, failure/uncertainty, long threads, and
accessible/narrow output. It checks D006 and the accepted audit protocol without
claiming a runtime terminology registry, speech-act response contract, rendered
copy, model behavior, localization, assistive-technology results, or participant
comprehension.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Response, Work, connection, authority, projection, save, export, and delivery states name their affected object and remain distinct |
| Match to author task | Profile terms/discourse fit the admitted taxonomy while shared language describes Petra's actual controls and consequences |
| User control | Clear instructions act once; questions target material ambiguity; alternatives, stop/cancel/defer/reject/revert, correction, and return remain exact |
| Consistency | One communication contract and control vocabulary survive module, profile, model, direct/Petra, visual/accessibility, and historical contexts |
| Error prevention | Reference resolution, calibrated force, exact previews, prohibited conflations, and validation block misleading action or authority language |
| Recognition | Full first references, visible context, adjacent limitations, outcome labels, and on-demand diagnostics reduce recall and jargon burden |
| Efficiency | Contextual depth, concise status, profile discourse forms, and progressive disclosure avoid both filler and compulsory technical detail |
| Minimal design | One useful answer/decision/action leads; speech-act metadata, role detail, diagnostics, and history remain inspectable rather than repeated |
| Recovery | Error anatomy, preserved state, retry safety, terminology fallback, model repair, and exact History support bounded recovery |
| Help and language | Definitions, terminology limits, basis, action rationale, prerequisites, reference expansion, and locale coverage appear where needed |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB15-A01` Scientific D006 terms become Petra's universal taxonomy | Other profiles would receive false objects, roles, force, or reference grammar | Critical | Fixed by shared communicative families and profile-owned specialization; multi-profile evidence in UX-FX36 |
| `DB15-A02` One voice becomes a fixed script or persona | Profile discourse becomes inaccurate, responses become repetitive, and anthropomorphic trust grows | Major | Fixed by communication obligations plus profile/task realization freedom; participant/model evidence in UX-FX36 |
| `DB15-A03` Shared controls and status drift across modules | Close/cancel, stop/cancel work, save/apply, recommendation/prerequisite, or completed/applied can cause wrong action | Critical | Fixed by reserved vocabulary and status matrices; cross-module evidence in UX-FX36/37 |
| `DB15-A04` Current runtime lacks a profile-neutral speech-act communication plan | Client prose or scientific-only synthesis could hide origin, reference, action, or validation meaning | Critical | Needs contract: UX-REQ-021; existing artifacts remain inputs, not a complete communication view; G-CONTRACT open |
| `DB15-A05` Profile terminology/discourse has no complete registry shape | Browser maps, missing locales, or changed labels could invent meaning or rewrite history | Critical | Needs contract: sharpen UX-REQ-004 with language fields/version/fallback; generic limitation remains safe |
| `DB15-A06` Confirmation and error copy omit exact consequence or preserved state | Authors may repeat uncertain commands, assume changes applied, or lose recovery context | Critical | Fixed in preview/error anatomy and P04–P08; adverse execution evidence in UX-FX37 |
| `DB15-A07` Long, translated, streamed, and assistive output is unvalidated | Terms, references, limits, and actions may truncate, overwhelm, or announce incorrectly | Major | Needs post-freeze accessibility/localization/participant evidence in UX-FX37; unresolved loss blocks G-VALIDATION |

Acceptance fails if a profile silently borrows scientific terms, a model changes
Petra's action meaning, a recommendation reads as a prerequisite, a source report
loses attribution, a proposal reads as applied, Work completion reads as approval,
**Close** reads as cancellation, **Stop response** reads as **Cancel work**, a
generic confirmation follows an exact review, an uncertain command is retried
before reconciliation, a terminology update rewrites history, or an accessible
alternative omits the visible limitation or consequence.

### Acceptance criteria and post-freeze evidence

DB15 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. Petra's candor, attribution, force, status, authority, user-control, action,
   and recovery obligations remain consistent across every admitted profile;
2. profiles can supply unrelated typed terminology, reference grammar, force
   vocabulary, units, roles, task/discourse conventions, and locale coverage
   without renaming shared controls or authority;
3. every material term has stable semantic identity, definition, allowed form,
   prohibited conflations, owner, version, surface, replacement, and fallback;
4. D006 scientific speech acts map to shared communicative families while other
   profiles can register accurate specializations with the same required basis;
5. every material Petra response preserves typed act, origin, references, basis,
   limitations, recommendation/action links, terminology versions, and validation;
6. the first/later reference grammar or profile equivalent preserves recognition,
   exact identity, ambiguity handling, descriptor history, and accessible expansion;
7. response order and depth serve the current task without filler, fixed scripts,
   hidden caveats, exposed chain-of-thought, or compulsory technical detail;
8. shared navigation, presentation, Work, Review, save/export, History, reset,
   retry/resume, cancellation, and reversal verbs retain their exact meanings;
9. recommendations distinguish advice from eligibility/prerequisite and preserve
   valid author choice without repeated persuasion or universal scoring;
10. clarification and confirmation occur only at the exact material ambiguity or
    changed consequence and do not duplicate reviewed authorization;
11. status, empty, unavailable, completion, and error messages name affected
    scope, actual state/effect, preserved work, reason, retry safety, and recovery;
12. model/role/provider changes preserve Petra language and fail or limit safely
    when response/profile validation cannot be satisfied;
13. wording feedback, context correction, domain correction, and action-scope
    correction route to their proper non-authoritative or governed paths;
14. locale/source-language behavior, long terms, narrow/high-zoom reflow, live
    announcements, and visual/text alternatives preserve identical meaning; and
15. contract, implementation, model, localization, accessibility, cross-module,
    and participant evidence remain explicit post-freeze gates.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX36` Extensible-profile communication conformance | Use invented scientific, controlled-writing, and at least one unrelated third profile with materially different taxonomy, references, force terms, units, roles, validators, task/discourse conventions, and outputs. Run grounded answers, recommendations, clarifications, Work, Review, action reports, corrections, and history through two eligible conversational models while Petra's shared acts, controls, authority, status, candor, and recovery remain stable. |
| `UX-FX37` Language, reference, and recovery stress | Exercise ambiguous/multiple/replaced references, terminology version change, missing term, unsupported/partial locale, long labels, source language and derived translation, limited/stale/conflicting basis, invalid/fallback model output, simultaneous response/Work/connection state, stale action, uncertain command, failed/partial delivery, long compacted thread, narrow/high-zoom/screen-reader/live-region behavior, and wording-versus-domain correction without lost meaning or duplicate effect. |

These scenarios are independently invented and begin only after design freeze.
Existing scientific model-output, grounded-response, Felicity revision, shell-copy,
and writing-audit records remain useful inputs. They do not prove the generalized
profile terminology registry, communication plan, renderer/validator, model
portability, localization, accessible realization, or participant comprehension.

### Backend needs and next section

DB15 sharpens `UX-REQ-004` so the profile manifest resolves versioned terminology,
reference, relation/force, discourse, locale coverage, replacement, and fallback
metadata for any admitted profile. This remains semantic configuration, not
free-form executable prompting or shared-control override.

The runtime audit found that `petra.model-synthesist-output@1.0.0` provides a
bounded scientific synthesis with `source_report`, `petra_synthesis`, and
`unresolved_inference`; `petra.grounded-response@1.0.0` binds exact response bytes
to dependencies and execution; Felicity revision records bind a language contract
while prohibiting force changes; and AG-UI carries interaction delivery. None is
a complete profile-neutral, statement-level communication plan with generalized
speech acts, profile/terminology/reference versions, recommendation/action links,
render/validation outcome, and safe repair/fallback. `UX-REQ-021` requests that
missing composition without replacing those existing contracts or granting
authority to prose.

DB15 closes at `G-SPEC`; `G-CONTRACT`, implementation/integration, model,
localization, accessibility, and participant validation remain separate. Continue
to DB16, Accessibility specification, by consolidating task-equivalent keyboard,
focus, zoom/reflow, screen-reader, motion, non-color, graph, touch, resize, and
streamed-update behavior.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB16 — Accessibility specification

**Status:** task and outcome equivalence with modality-appropriate peer
presentations accepted on 2026-09-07 as `UX1.0-DISC09`. The user additionally
requires Petra's language model to receive and explain the graph presentation the
author is actually seeing. DB16 is complete at specification depth with a paper
audit. Implementation, assistive-technology, model, cross-browser, performance,
and participant validation remain separate gates. No accessibility or model-
context implementation is authorized, and `UX-DESIGN-FREEZE-01` remains
unaccepted.

### Author task and inherited boundary

An author must be able to understand and complete the same material Petra task
when vision, hearing, movement, attention, reading, pointer precision, viewport,
or assistive technology changes how the interface is presented. Equivalent access
preserves object identity, basis, action, consequence, authority, status, recovery,
and result; it does not require every modality to reproduce the same geometry or
interaction sequence.

### Accepted equivalence and model-understanding boundary

Every material visual presentation has a modality-appropriate peer that supports
the same author objective, material information, controls, authority boundary,
recovery, and result with reasonable efficiency. A graph canvas may use spatial
nodes and edges while its keyboard and screen-reader peer uses a scoped
relationship summary, outline, path table, legend, and exact actions. Both expose
the same query scope, omissions, layers, current selection, typed relationships,
source/provenance paths, expansion, Details, Work, Review, History, and return
context. The textual peer remains a complete workspace and may use a more useful
sequence than two-dimensional navigation.

Petra also understands the presentation the author currently sees. When asked
**What does this graph show?**, the active model receives a bound, model-readable
scene containing the exact graph query/result identity, Project/profile and
snapshot, visible objects and relationships, layout, grouping, selection, layers,
legend encodings, collapsed or hidden content, counts, viewport omissions, and
the semantic text peer. A permitted captured render may supplement this scene for
a vision-capable model. The structured graph result remains the source for object
and relationship meaning; pixels can support statements about visible position,
density, clustering, overlap, and emphasis only when the capture and scene are
current and consistent.

For example, the visual graph can highlight that **Measurement criterion A**
affects **Comparison B** and **Comparison C**, with one qualifying relationship
near the selected path. Petra can explain that same visible organization, name
the selection and limitation, and offer **Explain relationship**, **Open source**,
or **Explore another inquiry**. The accessible peer exposes those relationships
and actions directly. Changing representation preserves the query, selection,
scope, and return context.

AG-UI state snapshots, deltas, messages, and registered custom events may carry
the synchronized presentation context through Petra's accepted adapter. Every
interface or generative presentation delivered through that boundary inherits
this accessibility contract. AG-UI remains transport and synchronization; Petra
owns the semantic scene, accessible structure, actions, validation, and authority.
This boundary is accepted as `UX1.0-DISC09`.

### Standards and conformance baseline

The reference UX targets [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/) as
its minimum web conformance baseline and uses native HTML semantics first. Custom
widgets follow the applicable [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
keyboard and semantic pattern, with implementation and assistive-technology tests
required because ARIA alone does not supply behavior. Petra records the tested
browser, operating system, input method, assistive technology and version,
viewport, theme, language, and fixture for every conformance claim.

WCAG conformance is one gate rather than the complete Petra outcome. A surface
can satisfy a technical checkpoint and still fail DB16 if its peer hides material
basis, takes far more effort for an ordinary task, loses current selection, makes
Work or Review read-only, or produces a different authority or recovery outcome.
Legal or procurement requirements may add stricter gates without weakening this
product contract.

### Equivalence contract

| Dimension | Required equivalence | Permitted presentation adaptation |
| --- | --- | --- |
| Objective | Same named author task and completion condition | Different entry explanation or ordering suited to the modality |
| Meaning | Same objects, relationships, basis, provenance, scope, omissions, limitations, uncertainty, profile terms, and versions | Summary, outline, table, spatial view, progressive disclosure, or another accurate structure |
| State | Same current/historical/working layer, selection, freshness, Work, Review, connection, and content state | Different announcement, marker, grouping, or disclosure behavior |
| Control | Same material navigation, inspection, expansion, edit, Work, Review, cancellation, retry, defer, reversal, and return actions | Native control or modality-appropriate action sequence rather than gesture imitation |
| Consequence and authority | Same exact target, preview, commit point, actor/authority, result, History, and preserved state | Different confirmation layout or amount of visible technical detail |
| Recovery | Same safe outcome after stale, invalid, failed, partial, offline, or uncertain state | Different guidance order and focus restoration suited to the presentation |
| Efficiency | A practical route that does not require exhaustive serial traversal for a task completed directly elsewhere | Helpful summaries, landmarks, filters, jump actions, and remembered position |
| Model explanation | Same current scene identity and semantic facts available to Petra, with visual observations bound to the exact scene/capture | Text-only semantic explanation or additional spatial explanation from a compatible visual input |

Presentation-only geometry may differ. If position, order, grouping, or movement
has domain or authority meaning, it becomes material information and receives a
programmatic description plus an exact non-drag action. A peer never gains fewer
permissions merely because it is textual, narrow, keyboard-driven, spoken, or
generated through an interaction protocol.

### Accessibility ownership

| Owner | Owns | Boundary |
| --- | --- | --- |
| Petra design system | Semantic component roles, focus treatment, non-color state grammar, target and spacing rules, motion behavior, reflow, and accessible-name patterns | Cannot leave accessibility to individual profile themes or model-generated markup |
| Product surface | Landmarks, headings, reading/action order, task peer, focus transitions, selection, announcements, errors, and return | Cannot expose a visually complete task through an inaccessible summary |
| Project profile | Exact object/relation terminology, text alternatives, reference and pronunciation guidance, units, and domain meaning | Cannot redefine standard control roles, keyboard behavior, authority, or shared status language |
| Runtime/view contract | Exact identity, content, relationships, scope, omissions, state, capabilities, actions, and outcomes used by all peers | Cannot infer visual geometry or user focus unless a presentation-context record supplies it |
| Petra interaction adapter | Synchronized state, messages, activity, interrupts, replay, and registered non-authoritative presentation events | Protocol availability does not establish semantic accessibility or command authority |
| Model and communication validator | Explain the bound semantic scene, distinguish grounded meaning from visual observation, and return DB15-valid language | Cannot infer hidden content, treat pixels as domain authority, operate an unregistered action, or emit arbitrary executable UI |
| Author | Choose presentation and input method, set supported preferences, request explanation, navigate, act, and recover | A chosen accessibility preference cannot change Project meaning or permissions |

### Semantic structure and orientation

Each route has a descriptive page title, one task heading, stable landmarks, and
a meaningful reading order independent of CSS position. Repeated chrome offers
skip paths to Project context, primary task, active contextual surface, and status
where applicable. Headings describe the current Project object or task; landmarks
and accessible names distinguish repeated navigation, Details, Petra, Work,
Review, graph/text result, editor, and History regions.

Changing route announces the new task and moves focus to its heading or the exact
requested object. Opening a modal moves focus inside and returns it to the invoking
control or a stable successor. Opening a nonmodal contextual surface moves focus
only when the author's action requested that surface. Closing returns to the
invoker and preserves selection, input, scroll or reading position, and task state.
Automatic updates do not move focus.

Current place, keyboard focus, selected object, graph focus, text cursor, checked
item, expanded state, and authoritative state remain separate. Focus never applies,
selects, checks, expands, navigates, or starts Work merely by arriving. Selection
follows focus only in a conventional control where the exact effect is local,
expected, and announced.

### Keyboard, voice, switch, and focus behavior

All functionality is operable through the keyboard without pointer movement,
path gestures, or timing-dependent chords. `Tab` and `Shift+Tab` move between
components; standard arrows, Home/End, Page keys, Enter, Space, and Escape operate
the applicable native or ARIA pattern within a component. Positive `tabindex`
does not reorder the page. Custom shortcuts are optional accelerators, visible in
context and Settings, remappable or disableable where conflicts are possible, and
never the only path.

Voice, switch, keyboard-emulation, eye-gaze, and other input methods can resolve
controls through stable accessible names and roles. Visible action text and
accessible names share the same leading words. Repeated controls include the
object or scope needed for a unique command, such as **Open details for Comparison
B**. A glyph-only control requires an exact name and visible explanation on focus
or request; authority actions keep visible outcome text.

| Transition | Required focus result |
| --- | --- |
| Route or deep link | Exact target when resolved; otherwise page task heading and explicit limitation |
| Open Details/Petra/Work context | Requested heading or first unresolved decision; preserve origin for return |
| Open dialog | Dialog heading or first required field; focus remains within the active modal until dismissal |
| Close/cancel presentation | Invoking control or nearest stable successor, with the underlying task unchanged |
| Submit local edit or command | Stay with the affected object/control while status is reported; move only when the task requires a new decision |
| Delete/remove visible item | Next logical item, previous item, or collection heading; announce exact result and preserved state |
| Refresh/reconcile | Retain object and control where identity survives; explain replacement/conflict before a deliberate move |
| Stream/update collection | Keep current focus and reading position; announce a bounded status or available-new-content notice |
| Switch graph/text peer | Same query and selected object/path when representable; peer heading when the exact selection is unavailable |

Focus is visibly unobscured by sticky chrome, panels, Petra, notices, or overlays.
Narrow and zoomed layouts make persistent side content static, dismissible, or a
separate route before it covers the focused control. Focus indicators retain a
shape/boundary and sufficient contrast in every theme and forced-colors mode.

### Complex-view peer presentations

| Visual or spatial presentation | Required peer and material behavior |
| --- | --- |
| Graph/network | Scoped relationship summary, outline or tree where hierarchy is real, exact path table, legend, object/relationship Details, layer and omission controls, expansion, source paths, Work/Review actions, History, and return |
| Timeline | Ordered event/change list with exact time dimension, unknown-time group, actor/origin, state, comparison, and event Details; scrubbing has step/select controls |
| Work progress/dependency view | Task and stage outline/table with lifecycle, dependency, required input, measured/estimated resource coverage, activity, result, controls, and live status |
| Before/after diff | Linear and side-by-side choices with additions, removals, replacements, moved content, unchanged context on demand, findings, exact revisions, and decision actions |
| Chart/metric display | Text summary plus data table or structured values with units, series, axes, sample/coverage, uncertainty, thresholds, and source; visual trend language remains calibrated |
| Dense table/grid | Native table where static; accessible grid only when cell interaction requires it, with headers, sorting/filtering state, row actions, selection count, and compact alternative at narrow widths |
| Editor/composition | Document headings/regions, label and instruction associations, selection/cursor context, finding navigation, source/provenance links, revision state, keyboard editing, and exact save/export status |
| Resizable/multipane workspace | Keyboard-operable separators plus named size/state; presets, reset, and single-surface routes preserve every panel's task and return context |
| Generated or streamed UI | Stable semantic container, heading, ordered content, labeled controls, progressive status, preserved focus, complete final state, and an ordinary non-generated recovery path |

A peer may lead with a concise explanation so sequential navigation does not
require reading every object. It discloses count units, grouping, filters, hidden
or restricted content, partial coverage, and the command that produced a change.
The author can move between representations without launching new Work or changing
authority.

### Model-readable graph and presentation context

Petra's explanation context is a versioned, bounded projection of the current
presentation rather than a raw DOM dump or an unbound screenshot. It contains:

- Project, profile, terminology/descriptor, snapshot, projection, query/result,
  route, surface, and presentation-context identities;
- the author-visible question, effective scope, layers, relationship allowlist,
  traversal/result limits, partial coverage, and material omissions;
- ordered visible objects and relationships with exact semantic references,
  profile labels, origin/basis/limitations, and current/historical/working state;
- selected, focused, pinned, expanded, collapsed, grouped, filtered, compared,
  emphasized, and hidden-with-count members;
- layout family, meaningful ordering, rendered positions or spatial regions,
  clusters, crossings/overlap, viewport/clipping, legend encodings, and other
  visual facts that are actually present;
- the complete semantic text peer and available Details, source, expansion,
  Work, Review, History, and return actions;
- scene producer/version, captured-at time, content hash, freshness, supported
  explanation capability, privacy/redaction disposition, and optional permitted
  image/capture reference.

The scene contains only the bounded presentation needed for the author's request.
It excludes inaccessible hidden DOM, unrelated panels, unsent private input,
restricted object names/counts, raw protocol events, and arbitrary screen capture.
The current scene and optional image bind to the same graph result and presentation
revision. If they differ, Petra uses the semantic result for graph meaning, names
the visual-context mismatch, and avoids claims about the current layout until it
refreshes or the author chooses the semantic explanation alone.

Petra can explain purpose, scope, prominent visible paths/groups, the selected
item, why an encoding appears, relevant omissions, and available actions. It
distinguishes **the graph records**, **the current visual arrangement emphasizes**,
and **the image appears to show** when those bases differ. Visual proximity,
centrality, size, color, order, or motion does not become evidentiary support,
importance, causal influence, priority, success, or authority unless an exact
registered semantic field establishes that meaning.

The model may request the current registered scene or a permitted image through
the interaction boundary. Capability, provider/egress, rights, privacy, latency,
and cost rules remain visible. If no eligible model can consume the visual input,
Petra explains the graph from the semantic scene and states that it did not inspect
the rendered image. A model cannot demand a screenshot when the structured scene
fully answers the question or capture would broaden disclosure.

### Visual perception, color, contrast, and text

All text, controls, focus, selection, boundaries, icons, graph relations, syntax,
and state indicators use named design-system roles with post-freeze measured
contrast evidence. Color never carries the only distinction. Labels, patterns,
shapes, line styles/direction, position in a named structure, and text alternatives
preserve meaning in monochrome and forced-colors modes. User-agent forced colors
may replace the palette while keeping current/selected/focused/invalid/disabled
and relationship distinctions.

Text can scale to 200% without clipping or lost action, and the product reflows at
400% zoom to the equivalent of a 320 CSS-pixel-wide viewport. Ordinary reading and
controls use one-dimensional scrolling. A graph, source image, wide comparison,
data table, or editor region may retain bounded two-dimensional scrolling where
its use requires it, while task context, instructions, status, actions, and the
complete peer reflow outside that region. Page-level horizontal scrolling cannot
become the only route to an action.

Text uses selectable real characters where content is textual, respects operating-
system and browser font/spacing preferences, and does not place material copy
inside images. Truncation exposes the complete value programmatically and through
ordinary inspection. Enlarged text, long profile terms, source-language text, and
user spacing changes preserve labels, values, errors, references, and action
consequences.

### Pointer, touch, dragging, and resize

Every authored pointer target is at least 24 by 24 CSS pixels or has the spacing
or equivalent-control treatment permitted by WCAG 2.2; primary and repeated touch
actions aim for a larger 44 by 44 CSS-pixel target. Dense inline source links may
use the inline-text exception while an equivalent row/object action remains
available. Targets do not overlap at narrow widths, under zoom, or while controls
stream into place.

Dragging, swiping, pinching, hovering, precise path movement, multi-pointer input,
and long press are never the only action. Graph pan/zoom, node positioning, list
reordering, selection ranges, timeline scrubbing, split-pane resizing, and drag-
and-drop inputs have visible single-pointer and keyboard controls. If dragging
changes only presentation, its alternative changes the same local state. If it
changes content or authority, the alternative uses the same exact preview and
command.

Hover content also appears on keyboard focus, remains inspectable, and is
dismissible and persistent while needed. Material instructions, provenance,
limits, or actions never exist only in a tooltip. Touch use cannot depend on
hover, and coarse-pointer layouts preserve task context and outcome labels.

### Motion, time, sound, and cognitive load

Reduced-motion preference removes decorative animation, parallax, animated graph
repositioning, auto-scrolling, pulsing, and nonessential transitions. Meaningful
change uses immediate state replacement, restrained highlight, or a textual status.
Progress never relies on motion. Flashing and rapid visual changes remain outside
the system.

Authors can pause, stop, hide, or control nonessential moving or automatically
updating presentation. No ordinary task has a short interaction time limit.
Authentication, security, scarce external resources, or expiring authorization
states name the limit, preserve input where permitted, warn before expiry when
possible, and expose a supported extension/recovery path. A model or Work timeout
is an operational outcome and cannot silently discard the author's input.

Sound is supplemental. Any alert, speech, or audio explanation has synchronized
text and a non-audio control path; volume and playback use platform-compatible
controls. Petra does not auto-play spoken responses. Clear headings, short initial
summaries, consistent controls, explicit steps, contextual definitions, preserved
input, and reversible local choices reduce memory and attention demands without
hiding material caveats.

### Streaming, status, and live updates

Dynamic content uses the DB15 status dimensions and announces only meaningful
changes. Polite status covers load completion, saved local state, background Work
updates, projection catch-up, and available new content. Assertive interruption is
reserved for a failure or decision requiring immediate attention. New content
does not take focus merely to be announced.

Model text is announced by validated semantic segment or user-requested sentence,
not token by token. Activity streams summarize meaningful stage changes and
provide an inspectable log. Repeated counts, progress ticks, cursor motion, graph
layout changes, and decorative animation stay silent. The author can stop response
delivery without cancelling Work and can review received content without the live
region repeatedly restarting.

When a collection, graph, Review, or diff changes, Petra reports what changed and
offers **Show updates** while preserving the current reading position. A required
input or stale action is placed in the task order and announced once. Reconnect
and replay deduplicate announcements as well as commands.

### Forms, editors, validation, and recovery

Every input has a persistent label, purpose, format, current value, required or
optional state, and instructions before the error it prevents. Related choices
use a fieldset/group and a clear legend. Placeholder text never replaces a label.
Autocomplete and platform input semantics are used where they fit without exposing
private Project data to an unintended service.

Validation identifies the exact field, problem, preserved input, expected format
or constraint, and correction path in text. An error summary links to each invalid
field; focus moves to the summary only after a submitted multi-field operation
needs correction. Inline findings remain associated with their field or editor
range. Spelling, grammar, scientific validation, profile findings, and command
errors retain different force.

Editors expose document and finding structure without turning every character
change into a live announcement. Keyboard and assistive-technology editing retains
cursor/selection, composition input, undo/redo, unsaved state, late-result conflict,
and exact save acknowledgment. Failed navigation or presentation changes preserve
input and offer the same task in a simpler peer when possible.

### Responsive and assistive presentation states

| Condition | Required behavior |
| --- | --- |
| Wide/default | Primary task and at most one expanded contextual surface maintain logical reading/focus order; visual and peer representations are both reachable |
| Compact | Secondary context moves to disclosure without changing task order, names, selection, or commands |
| Narrow/high zoom | One task surface at a time; context, status, action, and return stay adjacent; text peer may lead for spatial views |
| Screen reader | Landmarks/headings orient; names, roles, values, descriptions, relationships, position/count, state, and changes are programmatically available |
| Keyboard/switch/voice | Every action uses a stable named control and predictable focus; shortcuts are optional and conflicts avoidable |
| Touch/coarse pointer | Targets and spacing grow, hover dependencies disappear, drag has tap/select controls, and fixed surfaces do not cover the task |
| Magnification | Focus stays visible; overlays and tooltips do not cover target/context; pan is bounded inside genuine 2D regions |
| Reduced motion | State changes remain understandable through immediate layout and text without movement or flashing |
| Forced colors/monochrome | Native/system colors, boundaries, labels, patterns, and text keep all interaction and domain distinctions |
| Speech output or audio unavailable | Complete visible/programmatic text and controls remain; no task depends on sound |
| Unsupported assistive combination | Name the affected feature and tested limitation, preserve work, and provide a safe peer/return rather than a false conformance claim |

Accessibility preferences remain device-local under DB13 unless a later account-
sync decision is accepted. System preferences take effect without restarting Work
and preserve Project state, selection, input, and focus. A stored preference that
cannot apply reports the effective fallback; it does not disable the underlying
accessible path.

### Interaction-path specification

| Path | Entry and action | Required result, return, and focus |
| --- | --- | --- |
| `DB16-P01` Orient and navigate | Enter Projects, a Project place, contextual surface, deep link, or History using screen reader, keyboard, voice, switch, touch, or magnification | Page title, landmarks, task heading, Project/profile/snapshot, current place, status, and skip/return paths agree; focus reaches the exact target or explicit fallback |
| `DB16-P02` Inspect a graph | Open a bounded relationship question and traverse its visual canvas or semantic peer | Both representations expose identical scope, layers, paths, relations, omissions, selection, Details, expansion, sources, Work/Review, History, and return; switching preserves context |
| `DB16-P03` Ask Petra about the visible graph | Select or arrange a graph, then ask what it shows or why an item appears emphasized | Petra binds the exact semantic result and current presentation scene, explains visible organization and graph meaning with distinct bases, names omissions/limits, and offers valid actions |
| `DB16-P04` Follow live response and Work | Receive model text, activity, progress, input request, disconnect/replay, and terminal result | Bounded announcements preserve focus and distinguish response, Work, connection, authority, and result; Stop response and Cancel work remain separate |
| `DB16-P05` Review and apply | Inspect a candidate/diff, navigate findings, correct input, and apply/reject/defer through non-pointer paths | Linear and visual comparisons match exact revisions and decisions; focus, error summary, command status, individual outcomes, History, and return remain correct |
| `DB16-P06` Compose and edit | Navigate document structure, select content, invoke Petra, review a proposal, save, validate, and export | Cursor/selection, scope, unsaved content, findings, source links, revision, output status, undo, and recovery survive assistive and responsive changes |
| `DB16-P07` Manipulate without dragging | Pan/zoom/position graph, reorder supported content, scrub time, resize panes, or add a source | Single-pointer and keyboard controls perform the same supported local or governed effect with exact feedback and no precision gesture requirement |
| `DB16-P08` Reflow and enlarge | Use 200% text, 400% zoom/320 CSS-pixel equivalent, long profile terms, translated text, and magnification | Task content and controls reflow without page-level two-dimensional reading; bounded genuine 2D regions retain complete peers and do not obscure focus |
| `DB16-P09` Change perception settings | Enter forced colors, monochrome, reduced motion, High Contrast, larger pointer, coarse pointer, or no audio | Every state and relation retains non-color/non-motion text or structure; preferences apply without lost task state |
| `DB16-P10` Resolve forms and errors | Submit empty, invalid, stale, conflicted, failed, partial, or uncertain input/action | Exact labels, summary, field association, preserved input/state, consequence, retry safety, and recovery are perceivable and operable without forced focus churn |
| `DB16-P11` Open and close layers | Use menus, tooltips, dialogs, drawers, Details, Petra, and unavailable actions | Names/roles/states and dismissal work across inputs; focus is unobscured, trapped only by a true modal, and restored to the invoker or stable successor |
| `DB16-P12` Recover from unsupported or failed accessibility | Encounter failed semantic peer, stale scene, unsupported assistive combination, icon/font/theme failure, or model visual mismatch | Preserve the primary task and work, name the limitation and tested boundary, use a safe semantic or native fallback, and retain an exact return/retry path |

All paths run through scientific, controlled-writing, and an unrelated admitted
profile where the feature applies. Omitted profile functions remain honestly
absent; accessibility does not fabricate a universal domain workflow.

### Paper interaction and heuristic audit

The paper audit walks `DB16-P01`–`P12` across visual, keyboard, screen-reader,
voice/switch-equivalent, touch/coarse-pointer, magnified, reflowed, forced-color,
reduced-motion, no-audio, narrow, streamed, disconnected, invalid, failed, and
unsupported states. It compares graph, timeline, Work, diff, table, editor, pane,
and generated-interface peers and checks Petra's bound scene explanation. It does
not claim rendered conformance, final-token contrast, browser/AT compatibility,
model visual accuracy, participant efficiency, or legal compliance.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Programmatic status and bounded announcements expose task, response, Work, connection, authority, save/output, and recovery without moving focus |
| Match to author task | Peers preserve the same objective, domain meaning, consequence, and useful sequence rather than narrating visual coordinates |
| User control | Input choice, presentation switch, stop/cancel, dismissal, settings, correction, deferment, reversal, and safe return remain operable |
| Consistency | Native/APG patterns, shared action names, focus rules, semantic peers, and model explanation bindings survive module and profile changes |
| Error prevention | Exact labels, non-drag controls, unobscured focus, semantic graph facts, action previews, and scene validation prevent accidental or invented effects |
| Recognition | Landmarks, headings, full references, position/count, summaries, legends, instructions, and preserved state reduce memory and spatial reconstruction |
| Efficiency | Skip paths, peer summaries, composite navigation, filters, jump actions, and stable focus avoid exhaustive serial traversal |
| Minimal design | Initial task content and meaningful updates lead; diagnostics, full logs, and exhaustive graph members remain available on demand |
| Recovery | Input, selection, focus, task identity, semantic peer, exact outcomes, replay deduplication, and safe fallbacks survive failures |
| Help and language | Control purpose, interaction instructions, unavailable reasons, terminology, limitations, tested support, and model explanation basis appear in context |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB16-A01` Text alternative becomes a read-only summary | Authors using a screen reader cannot inspect, expand, start Work, Review, or recover | Critical | Fixed by task/control/outcome equivalence and complex-view peers; UX-FX38 |
| `DB16-A02` Pixel-identical parity forces inefficient serial use | A formally complete alternative becomes practically unusable | Critical | Fixed by modality-appropriate sequence and efficiency requirement; participant task evidence in UX-FX38 |
| `DB16-A03` AG-UI or generated UI is assumed accessible by transport | Streamed/custom content may lack stable structure, names, keyboard behavior, or recovery | Critical | Fixed by Petra-owned semantic containers and peer contract; AG-UI/AT evidence in UX-FX39 |
| `DB16-A04` Model explains an unbound screenshot or guesses from layout | Petra may invent graph meaning, omit hidden scope, or describe stale visual state | Critical | Needs contract: UX-REQ-022; semantic/result and scene/capture binding tested in UX-FX40 |
| `DB16-A05` Selection, focus, and authority collapse | Keyboard arrival or representation switch could select, apply, or retarget a task | Critical | Fixed by distinct states and transition matrix; cross-module evidence in UX-FX38/39 |
| `DB16-A06` Reflow, overlay, or streaming obscures task/focus | Magnified or assistive use loses control, reading position, or input | Critical | Fixed by reflow, focus, overlay, and live-update rules; UX-FX39 |
| `DB16-A07` Drag, hover, color, motion, sound, or precision is the only path | Material information or action becomes unavailable to common input/perception modes | Critical | Fixed by redundant semantics and non-gesture controls; UX-FX38/39 |
| `DB16-A08` Technical conformance substitutes for observed usability | A path may pass automated checks while remaining slow, confusing, or incomplete | Major | G-VALIDATION requires AT and participant task outcome/efficiency evidence; UX-FX38–40 |

Acceptance fails if an assistive presentation omits a material object, relation,
limitation, action, or outcome; requires exhaustive traversal for an ordinary
task; lets focus apply authority; loses selection/input on representation change;
announces tokens or every progress tick; relies on drag, hover, color, motion,
sound, or pointer precision; obscures focused content; makes generated UI a
keyboard trap; exposes restricted scene data to a model; treats visual proximity
as domain meaning; or lets Petra describe a stale/unbound graph as current.

### Acceptance criteria and post-freeze evidence

DB16 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. every material surface meets WCAG 2.2 Level AA and applicable native/APG
   semantics in the recorded supported environment;
2. each graph, timeline, progress/dependency view, diff, chart, dense table,
   editor, pane workspace, and generated interface has a complete task peer;
3. visual and peer presentations preserve objective, meaning, state, control,
   consequence/authority, recovery, result, and practical task efficiency;
4. representation changes preserve exact Project/profile/snapshot/query,
   selection, input, Work/Review, History, and return context;
5. landmarks, headings, names, roles, values, descriptions, relationships,
   position/count, state, and changes are programmatically available;
6. every action works through keyboard, and voice/switch/keyboard-emulation can
   address stable controls without timing-dependent input;
7. focus remains visible, predictable, distinct from selection/authority,
   unobscured by overlays, and restored after routes, dialogs, updates, errors,
   removals, and presentation changes;
8. text scaling, 400% zoom/320 CSS-pixel-equivalent reflow, long terms, and user
   spacing preserve content, actions, status, and bounded 2D peers;
9. targets meet the accepted size/spacing rules, and every drag, gesture, hover,
   resize, range, reorder, and drop operation has single-pointer and keyboard paths;
10. forced colors, monochrome, reduced motion, magnification, coarse pointer, and
    absent audio preserve all state, domain meaning, and controls;
11. forms/editors preserve label, instruction, cursor/selection, input, error
    association, undo, save/revision, proposal conflict, and recovery behavior;
12. streaming and dynamic changes announce bounded semantic statuses without
    stealing focus, repeating replay, or conflating response, Work, authority,
    connection, save, output, and delivery;
13. AG-UI-delivered and generated presentations resolve through Petra semantic
    structures, controls, peers, validation, and ordinary fallback paths;
14. Petra can explain the exact current graph semantics and visible arrangement
    from a versioned, bounded presentation context linked to the semantic peer;
15. optional image understanding is capability/privacy/rights bound, identifies
    visual inference, and cannot override canonical object/relation meaning;
16. stale, mismatched, partial, unsupported, or failed scene/accessibility state
    preserves the task and produces a safe semantic fallback or exact limitation;
17. all three profile examples retain their own terminology and applicable tasks
    without changing shared accessibility, action, or authority semantics; and
18. automated, browser, input, assistive-technology, model, participant task,
    performance, and regression evidence remain explicit post-freeze gates.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX38` Task and outcome equivalence | Use scientific, controlled-writing, and unrelated third-profile Projects across orientation, Sources, Graph, Work, Review, Composition, Settings, and History. Complete the same named tasks through visual/pointer and keyboard/screen-reader peers, comparing material information/actions/outcomes, focus/selection/return, errors/recovery, command identity, task time, navigation steps, and observed confusion. |
| `UX-FX39` Accessibility pressure and generated-interface recovery | Exercise keyboard, voice/switch-equivalent input, touch/coarse pointer, 200% text, 400% zoom/320 CSS-pixel equivalent, magnification, forced colors, monochrome, reduced motion, no audio, long/translated terms, drag/hover alternatives, overlays, tooltips, dialogs, editors, panes, streaming, reconnect/replay, invalid/stale/partial/failed state, unsupported AT combination, and AG-UI-generated content without lost task, focus, input, meaning, or duplicate effect. |
| `UX-FX40` Model explanation of the visible graph | Use the same bounded graph under visual/text peers, layouts, selections, groups, filters, layers, expansion, viewport clipping, hidden counts, stale scene, delayed projection, mismatched capture, restricted members, semantic-only model, and eligible vision model. Verify that Petra explains graph facts and current visual organization from their exact bases, names omissions/mismatch/capability, preserves privacy, and never infers authority or domain force from pixels. |

These scenarios are independently invented and begin only after design freeze.
Existing primitive, shell, graph, design-system, AG-UI, and language fixtures are
calibration or contract evidence. They do not prove DB16 task equivalence,
assistive-technology compatibility, model scene understanding, participant
efficiency, performance, or legal conformance.

### Backend needs and next section

Native structure, component semantics, focus, reflow, target size, non-color
meaning, motion, and most representation switching are frontend responsibilities
over exact existing/proposed view contracts. DB16 sharpens `UX-REQ-006` so a
material turn binds the presentation context it used, `UX-REQ-013` so graph
results remain the semantic source and complete peer, and `UX-REQ-021` so Petra's
explanation states its semantic versus visual basis and validates references,
force, limitations, and actions.

D013 and the current interaction feature manifest support AG-UI state projection,
snapshots/deltas, messages, custom events, replay, and a non-authoritative adapter
boundary. `UX-REQ-013` proposes renderer-neutral semantic graph records while the
client owns layout and selection. No current accepted contract binds that semantic
result to an exact author-visible scene, accessible peer, optional permitted
capture, model input, and resulting explanation. `UX-REQ-022` requests this
missing presentation-context composition without making pixels authoritative or
placing DOM/ARIA implementation inside a backend contract.

DB16 closes at `G-SPEC`; `G-CONTRACT`, implementation/integration, browser/AT,
model, performance, legal, and participant validation remain separate. DB17
carries these boundaries into failure, recovery, and History below.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB17 — Failure, recovery, and history

**Status:** canonical-state reconciliation before recovery, explicit preserved
state, and exact task return accepted on 2026-09-07 as `UX1.0-DISC10`. DB17 is
complete at specification depth with a paper audit. Runtime contract,
implementation, integration, service-level disaster recovery, accessibility,
performance, security, and participant validation remain separate gates. No
recovery interface, command, fixture, or History implementation is authorized,
and `UX-DESIGN-FREEZE-01` remains unaccepted.

### Author task and completion condition

An author must be able to tell what happened after a failure or interruption,
protect useful work, choose a safe next action, and return to the same task and
object without reconstructing state from logs. Recovery is complete when Petra
has reconciled the records that own the effect; exposed what is confirmed,
pending, mixed, unknown, preserved, lost, or unavailable; performed only the
chosen eligible action; recorded its outcome; and restored an exact or explicitly
explained fallback context.

Recovery does not promise that every operation can continue or every transient
input can be recovered. It promises an honest boundary, no duplicate authority,
the strongest retained state actually available, and a useful route forward.

### Accepted reconciliation boundary

Every material failure path begins with canonical state reconciliation before
Petra offers an action that could repeat, replace, or compensate an operation.
The interface answers these questions in order:

1. **What was attempted?** Name the task, object, exact input or revision, actor,
   operation, and last known client observation.
2. **What is now known?** Read the owning command, event, Work, interaction,
   persistence, projection, output, delivery, or policy records and state their
   coverage and freshness.
3. **What changed?** Classify the effect as confirmed none, confirmed effect,
   still in progress, mixed across independent members, unknown, or unavailable
   to verify.
4. **What remains?** Name durable work, local-only input, partial output,
   approvals, proposals, prior revisions, history, and return context that
   survived, plus anything confirmed lost.
5. **What is safe now?** Expose only registered actions whose identity,
   eligibility, consequences, cost, authority, and History effect are current.

For example, if the connection drops after **Apply 3 changes**, Petra checks the
three exact ChangeSets, commands, and event receipts. If all applied, it reports
their resulting revisions and lets derived views catch up. If none applied, it
may redeliver the same idempotent command for each still-eligible member. If the
independent members have mixed outcomes, it lists each result and offers recovery
only for unresolved eligible members. One ChangeSet remains atomic; a mixed
batch means different ChangeSets reached different outcomes, not that one atomic
change was half applied.

Likewise, after a browser crash during editing, Petra can say **Draft restored on
this device. It has not been saved to the Project.** It then compares the
restored local base with the current durable revision before save. Restoration
does not silently overwrite newer work or claim that local bytes were durable.

### Recovery invariants

- A view, toast, model statement, AG-UI event, cached response, or projection
  never establishes the outcome of an authoritative or durable operation.
- Reconciliation is a read/composition step. It cannot mutate, approve, retry,
  cancel, reverse, save, publish, or delete by itself.
- Exact redelivery reuses the original operation identity where its contract
  supports idempotency. Conflicting reuse fails closed.
- Independent member outcomes remain independent. A group summary never hides
  a stale, failed, applied, cancelled, or unknown member.
- Preserved content keeps its actual durability: local, session-only, durable
  draft, immutable artifact, Work output, candidate, applied state, or History.
- Recovery retains the attempted operation and failure. It appends a new action
  and outcome where a durable change occurs; it never edits history into a
  cleaner story.
- Returning to a task restores the exact object, revision/snapshot, selection,
  input, focus, scroll/reading position, and origin where they still resolve.
  Every fallback names what could not be restored.
- Privacy and current authorization are rechecked during recovery. Prior access
  does not grant continued disclosure or permission.
- A profile supplies accurate object, relationship, validation, and workflow
  meaning. It cannot redefine **Retry**, **Resume**, **Start again**,
  **Reconcile**, **Undo**, **Revert**, authority, or History.

### Recovery ownership and authority

| Owner or record | Supplies | Cannot establish |
| --- | --- | --- |
| PostgreSQL command/event authority | Exact command receipt, base/result revisions, per-ChangeSet effect, actor/capability, idempotency, conflict, compensation, and ordered domain history | What the browser last rendered or whether a projection already caught up |
| Work and workflow authority | Task/attempt lifecycle, immutable inputs, dependencies, retry/cancellation/checkpoint policy, retained outputs, resource use, and operational outcome | Domain acceptance, usable output without validation, or generic resume support |
| Interaction/delivery records | Thread/run identity, persisted logical events, replay checkpoint, connection attempt, delivered suffix, and observed delivery outcome | Re-executed Work, domain authority, or cancellation from disconnect |
| Projection and outbox records | Authoritative source position, derived-view position, lag/failure, replay/rebuild progress, and current read eligibility | A new domain fact or permission to repeat its producing command |
| Draft/artifact/output records | Exact saved revisions, provenance/assessment state, immutable bytes, output identity, and publication/delivery receipts | Recovery of unsaved client content or proof that a download reached the author's filesystem |
| Client recovery state | Unsent input, local draft, view history, selection, focus, layout, and last observed identifiers | Durable save, command outcome, server permission, or authoritative current state |
| Profile contracts | Domain-specific failure meaning, validation, object names, eligible workflow actions, and exact return destinations | Shared recovery verb meanings or a new authority path |
| Petra model | Explain the reconciled state, summarize member outcomes, compare choices, and propose a registered action | Guess an effect, fabricate a receipt, turn advice into eligibility, or execute an unregistered recovery |

### Failure and interruption taxonomy

| Failure family | Required facts | Safe default and recovery boundary |
| --- | --- | --- |
| Presentation or navigation | Failed render, missing selection, invalid route, closed surface, stale layout, or unsupported peer; canonical task may remain intact | Preserve local context, resolve the exact object, use a native/text peer or stable parent, and keep presentation Back/Forward/Reset separate from domain action |
| Read, cache, or freshness | Query identity, requested snapshot, observed source, cache age, missing coverage, timeout, or stale result | Keep the last labeled result when safe; Refresh or compare exact snapshots; do not submit a write to repair a read |
| Connection, stream, or response delivery | Run/connection identity, durable event position, received suffix, Work observation, and whether response generation completed | Reconnect/replay persisted content; open durable Work independently; a delivery abort never cancels or restarts Work |
| Durable Work | Task, plan/input revision, attempt, lifecycle, failure class, retained outputs, checkpoint, retry/cancel policy, dependencies, and usage | Check status, use retained valid output, Retry under the exact policy, Resume only from a verified checkpoint, or Start again deliberately |
| Required input or blocked work | Exact request, owner, reason, consequence, waiting behavior, expiry, and alternatives | Answer once through its owning adapter, defer where valid, change authorized scope, or cancel eligible Work; no generic Continue |
| Command, Review, or authority | Proposal/ChangeSet, approval, command/idempotency identity, expected revisions, actor/capability, per-member receipt, and projection effect | Reconcile before redelivery; refresh a conflict; regenerate an exact preview; correct, defer, reject, or use governed Revert through the owning command |
| Projection or derived index | Authoritative revision, projection checkpoint, lag/failure, affected views/actions, and rebuild/replay status | Keep the committed outcome, use an authoritative textual route, and catch up idempotently; never repeat the domain command to refresh a projection |
| Local edit or save | Durable base, local edit identity/hash when available, storage scope, last save receipt, newer server revision, and recoverable bytes | Restore as visibly unsaved, compare base/local/current, save a new eligible revision, retain separately, or export locally; never silently overwrite |
| Render, export, or external delivery | Exact source revision, generated member/byte identities, destination, eligibility, delivery observation, partial members, and irreversible disclosure | Retry missing publication linkage or delivery of the same output where safe; regenerate only as a distinct action; report delivery unknown honestly |
| Source, artifact, capability, or access | Identity, availability, integrity, rights, authorization, expiry, affected dependents, and permitted fallback | Reauthorize, reacquire/restore a permitted copy, use metadata/preview, revise scope, or stop; no existence leak or silent substitute |
| Service, storage, or integrity incident | Affected boundary, last verified epoch/receipt, read/write posture, preserved durable records, recovery operator status, and verification limits | Fail writes closed when outcomes cannot be established, provide read-only/local work where safe, reconcile after service recovery, and avoid claiming backup restoration from UI state |

A profile-specific validator finding, disputed conclusion, or unsupported claim is
not automatically a system failure. An operationally successful task may produce
an unusable or rejected result. A task can fail while retaining a valid partial
artifact. These dimensions remain separately visible.

### Effect reconciliation states

| Effect state | Meaning | Permitted next behavior |
| --- | --- | --- |
| **No effect confirmed** | The owning boundary proves no mutation, durable start, save, publication, or delivery occurred | Offer the same eligible operation, revised input, alternate path, or return |
| **Effect confirmed** | Exact resulting identity/revision/receipt exists | Show the result and downstream freshness; offer follow-on or governed compensation rather than repeating the effect |
| **In progress** | An accepted operation has durable identity and has not reached a terminal outcome | Observe, detach, reconnect, provide required input, or cancel where eligible; do not start a duplicate |
| **Mixed outcomes** | Independent members have exact different outcomes | Show each member; recover unresolved members only; derive the aggregate summary from member state |
| **Outcome unknown** | Available records cannot yet prove whether the operation took effect | Keep the task pending, Check status/reconcile, block unsafe repetition, and state the verification limit |
| **Unavailable to verify** | The owning service or required record is inaccessible, corrupt, or outside retained history | Preserve local and known durable context, name the limit, provide an operational/support path where one exists, and do not imply success or failure |

The interface may say **Failed** only with the failed boundary and known effect.
For example, **Graph update failed; all three changes are applied** is materially
different from **Apply outcome not confirmed**. A stale client observation is
not converted to **No effect** merely because the result is absent on screen.

### Recovery action vocabulary

| Action | Exact meaning | History and authority effect |
| --- | --- | --- |
| **Check status** | Read and reconcile the owning records for the same operation or task | Read-only; may update presentation freshness |
| **Refresh** | Repeat a read against an explicit current or named snapshot | Read-only; preserves the prior labeled result when useful |
| **Reconnect** | Establish another delivery connection for the same durable interaction or Work | No new Work, command, approval, or domain event |
| **Replay response** | Redeliver persisted logical interaction events after an exact checkpoint | Presentation/delivery receipt only; no model or Work execution |
| **Retry** / **Retry failed work** | Repeat the same intended operation with the same semantic inputs under its owning idempotency or attempt policy | May return the prior receipt or create a numbered attempt; never hides earlier attempts or adds scope |
| **Resume work** | Continue from a verified compatible checkpoint with exact retained inputs and remaining plan | Uses a registered resume transition; unavailable when checkpoint semantics or compatibility are absent |
| **Start again** | Begin deliberate fresh linked execution with stated inputs, reuse, cost, and relationship to prior Work | New attempt/task identity as required; prior Work and usage remain in History |
| **Restore local work** | Reopen recoverable client-held input or edits in visibly unsaved state | Local presentation state until an exact save/export succeeds |
| **Reconcile** | Compare base, local, current, receipts, or independent outcomes and establish current choices | Read/composition only; later save, correction, or command is separate |
| **Regenerate preview** | Build a current proposal/action/reversal preview after stale inputs | Creates a new preview/revision; does not apply it |
| **Revalidate** | Assess the exact current content or result against the applicable validator/basis | New assessment/result; does not rewrite the assessed revision |
| **Retry delivery** | Deliver the exact already generated output/member again to the same or explicitly selected destination | New delivery attempt/receipt; no silent regeneration or approval |
| **Undo** / **Redo** | Change supported unsent editing or local presentation state | No Project command or authoritative History event until saved/applied |
| **Back/Forward/Reset view** | Restore or reset client navigation/presentation state | No Project mutation and no cancellation |
| **Revert change** | Preview and apply a compensating typed ChangeSet for an eligible applied change | New approval/command/events as required; original history remains |
| **Return to current** | Leave an exact historical presentation for current resolved state | Navigation/read only; no forward or compensating command |

Labels become more specific when their object matters: **Retry graph update**,
**Retry export delivery**, or **Restore local draft**. Petra does not use a bare
**Try again** when several boundaries could have failed. An unavailable recovery
remains discoverable with its reason and prerequisite when that helps the author;
the interface does not offer a control that it cannot map to an owning operation.

### Automatic and deliberate recovery

Petra may automatically reconnect transport, replay undelivered presentation
events, retry idempotent projection/outbox processing, restore safe client
presentation state, and perform attempts already authorized by an exact Work
retry policy. Automatic behavior exposes its current state, attempt/limit, and
final outcome and cannot broaden data, capability, cost, scope, or authority.

An already submitted exact command may be safely redelivered under its accepted
idempotency contract. A new command, changed input, new Work, Start again,
Revert, broader disclosure, additional cost/capability, conflict resolution, or
overwrite decision remains deliberate. Clear authorized recovery does not gain
an extra confirmation merely because it follows a failure; the existing action,
Review, cost, and authority boundaries still apply.

Offline Petra never accumulates invisible authoritative commands. It may preserve
input, permit safe local presentation/editing, and show previously available
content with its exact age and limits. On reconnect, it reconciles current access,
revisions, commands, Work, and retained local changes before offering submission.
A future registered offline command queue would require a separate explicit
ordering, conflict, disclosure, and cancellation contract.

### Information hierarchy and surface behavior

A material failure appears first beside the affected task, object, field, or
action. A transient toast may announce it but cannot be the only record of
unknown effect, lost work, required input, failed save, partial output, or
recovery. The persistent recovery summary orders:

1. task/object and concise current state;
2. confirmed, pending, mixed, or unknown effect;
3. preserved and lost content;
4. the safest primary action and its consequence;
5. valid alternatives and unavailable reasons;
6. current revision/snapshot, freshness, and last reconciliation time; and
7. **Details** or **History** for member outcomes, receipts, diagnostics, and
   causal records.

One failure does not force a global error page while other Project tasks remain
safe. Project-level or service-wide interruption uses a persistent banner/notice
with affected functions, safe available work, and status. The Brief and Work
attention areas link unresolved recovery without duplicating its state. Petra may
explain or guide the same recovery summary; it does not create a parallel error
state in conversation.

When several failures share one cause, the Project notice summarizes the cause
and affected count while each task retains its exact outcome. When several causes
affect one task, the task leads with the action-blocking boundary and preserves
the others under Details. Severity follows consequence and recoverability rather
than technical exception class.

### Cross-module recovery matrix

| Surface or object | Preserved state | Primary recovery and exact return |
| --- | --- | --- |
| Projects/Brief | Project choice, profile, snapshot, inquiry/task focus, permitted last result | Refresh exact summary or use labeled cached state; return to the same attention item or explicit current replacement |
| Sources/reader | Source identity/revision, location, surrounding context, Project role, local-copy status | Reauthorize, reacquire permitted bytes, retry processing/read, or use metadata/preview; return to the exact selector or honest nearest context |
| Graph/Details | Query/result, layers, selection/path, graph view history, textual peer, snapshot and projection position | Refresh/read authoritative state, catch up projection, use Back/Forward/Reset, or resolve replacement; return to selected object/path |
| Petra/thread | Submitted and unsent turns, bound context, received persisted segments, linked Work and decision | Reconnect/replay, retry a response deliberately, choose current/original context, or open Work; return to turn/composer focus |
| Work | Task/plan/input, attempts, activity, checkpoints, outputs, usage, required input, cancellation receipt | Check status, answer once, reconnect, retry, resume when verified, start again, or cancel where eligible; return to task/stage/result |
| Review/change | Candidate, exact source/basis, batch manifest, decision, ChangeSet, approval, command/member outcomes | Refresh conflict, regenerate preview, correct/reject/defer, exact redelivery, or governed Revert; return to member and batch position |
| Composition | Durable revision, local unsaved content, selection, proposal/assessment basis, citations and ancestry | Restore local unsaved work, compare base/local/current, save new revision, revalidate, retry rendering/export, or retain a separate copy; return to cursor/finding |
| Settings | Last effective value, unsaved control input, owning Project, policy revision, local storage result | Re-read effective state, retry local persistence, reset scoped preference, or regenerate typed Project-control preview; return to exact control |
| History | Selected event/change/attempt, filters, comparison endpoints, recovery chain | Re-resolve current eligibility, inspect causal records, preview Revert, or Return to current; preserve selected event and reading position |

### Local work, stale bases, and conflicts

Client restoration records the local item's type, Project/object, base revision,
last local update, content identity or hash where safe, storage scope, and whether
the recovery survived only in memory, session storage, or durable local storage.
The visible label remains **Unsaved** until the owning durable save acknowledges
the exact content. If local storage failed or content cannot be reconstructed,
Petra states the confirmed loss and retains any last durable revision.

When current durable state advanced, Petra preserves base, local, and current as
separate positions. A three-way comparison names local changes, current changes,
overlap/conflict, unsupported merge regions, provenance/assessment consequences,
and each permitted outcome. An author may retain the local copy, save a separate
eligible revision, deliberately replace a supported target, revise manually, or
discard local changes. No choice is preselected when it could lose either side.

A stale candidate, action, policy, or reversal preview is regenerated against
current state and requires the ordinary exact decision where applicable. Previous
approval does not transfer to a materially changed hash or manifest. A conflict
never resolves through visual last-write-wins, a model rewrite, or a route refresh.

### Connection, response, and Work recovery

Connection status remains separate from Work and response status. Leaving a
route, closing Petra, aborting a delivery, losing a browser connection, or
restarting the client does not cancel Work. Reconnection uses the exact thread,
run, connection, and checkpoint identities; replay emits persisted content once
and identifies gaps or unavailable progress. It does not repeat retrieval, model
execution, a tool, a Review response, or a command.

If active execution cannot resume after a service crash, Petra reports the
canonical task and attempt state rather than labelling it **Resuming**. A
registered lease/scheduler may later mark the attempt failed, restart it under
policy, or expose a verified checkpoint. **Resume work** appears only for the
last case. Visible partial model text remains partial and unvalidated unless its
accepted terminal record establishes otherwise.

Cancellation is complete only after its durable command/receipt and terminal
Work state reconcile. **Cancellation requested** does not promise provider stop,
deleted output, refund, or domain reversal. If completion wins the race, Petra
shows completed Work and its result separately from the cancellation attempt. A
lost cancellation response uses the same command identity and checks its receipt.

### Command, batch, projection, and output recovery

An authoritative command stays **Applying** or **Outcome unknown** until its
owning record resolves. Client timeout cannot label it failed. Exact retry uses
the original command/idempotency identity when permitted. A different payload
requires a different preview and command. An authorization or revision change
can make the original operation ineligible even when no effect was confirmed.

Review batches group independently atomic ChangeSets. The summary gives counts
for applied, rejected, deferred, conflicted, failed, pending, and unknown members,
and every member remains inspectable. A recovery selection includes only eligible
unresolved members and produces its own exact manifest; it cannot resubmit applied
members or transfer an earlier approval to changed content.

When authority committed but a graph, search, vector, or other projection lags,
the change is **Applied—updating views**. Petra links the authoritative object or
text result, reports the affected derived functions, and catches up from the
ordered event/outbox position. Projection recovery never repeats Apply or Revert.
Actions requiring a falsely current projection stay unavailable with their reason.

Rendering, storage publication, and delivery remain separate outcomes. An exact
retry may finish a missing durable link for already stored bytes or redeliver the
same output. **Regenerate** creates a new output identity and may require new Work,
cost, validation, and comparison. Browser download initiation and clipboard write
acknowledgment report only what the client can observe. External delivery remains
unknown when Petra has no destination receipt, even if bytes left Petra.

### History architecture

History is a full, deep-linkable Project route reached from an object, task,
thread, source, Review, Composition revision, changed item, recovery summary, or
**Recent changes**. It is not a permanent primary Project tab and does not replace
the Work activity log, document revision list, conversation transcript, or graph
view history. Those focused histories link into the relevant Project event chain.

The default History view is an accessible newest-first event/change list grouped
into recognizable causal episodes such as one Work task, Review batch, save,
export, policy change, recovery, or reversal. It exposes filters for object/task,
profile event family, actor/origin, outcome, authority effect, and time. Each row
shows:

- user-facing action/event and affected object or task;
- exact current or historical identity/revision/snapshot;
- actor or accountable role, origin, and recorded time/order;
- requested effect, observed outcome, and authority boundary;
- related Work, candidate, approval, command/receipt, output/delivery, projection,
  and recovery references that the author may access;
- supersedes, compensates, retries, resumes, branches-from, restores, or
  revalidates relationships; and
- current recovery/reversal eligibility, reason, consequence, and destination.

Selecting an item opens a readable event detail and, where meaningful, exact
before/after comparison. Technical IDs, hashes, raw payloads, correlation chains,
and diagnostics are available on demand. History does not narrate raw token,
layout, hover, selection, or retry-loop noise as Project events. Client view
history stays local, while durable local saves or preference failures appear only
in their own scoped history unless they produce a Project record.

History preserves the record and language versions that applied at the time and
may show current profile terminology as a clearly marked aid. Reversal, redaction,
retention, and correction append their own record; they do not rewrite the prior
event. Where independent systems provide no verified total order, Petra preserves
causation and each source's ordering/timestamps and avoids inventing a single
precise sequence.

The **Recent changes** quick window retains DB06's ten most recent eligible
author-visible Project changes. Ten is a presentation limit, not retention. Full
History includes permitted ineligible, failed, superseded, and compensated events
needed to explain current state. Historical views name their position and provide
**Return to current**; acting on current state re-resolves permissions, revisions,
and eligibility.

### Privacy, unavailable history, and service recovery

History and recovery disclose only records the current actor may inspect.
Unauthorized or later-restricted members do not reveal names, counts, existence,
relationships, or prior values beyond the permitted aggregate statement. An
expired capability may identify the affected function without reproducing
restricted content. Redacted records retain the minimum lawful continuity needed
to explain that a change or restriction occurred.

If an authoritative store, Artifact bytes, or recovery record is unavailable or
fails integrity verification, Petra marks the affected functions read-only or
unavailable and states the last verified boundary. The everyday interface does
not claim that browser state, projection rebuild, or Project History is a backup.
Operational restore may use verified database, object, migration, and projection
rebuild procedures; after restoration, Petra reconciles exact identities,
revisions, artifacts, outbox positions, and derived views before reopening writes.

Confirmed irrecoverable loss is stated directly with its scope and last durable
state. Petra retains any valid provenance and incident/recovery record permitted
by policy. It never manufactures reconstructed content through a model and calls
it restored work.

### Petra explanation and recovery language

Recovery language follows DB15's error anatomy: affected task and operation;
known effect; preserved or lost state; cause or limitation at useful depth; retry
safety; and one bounded next action. It leads with author consequences and keeps
codes, stack traces, provider messages, and internal protocol terms under
**Technical details**.

Examples include:

- **All 3 changes were applied. The Graph is still updating.**
- **2 changes were applied; 1 was not. Review the unresolved change before retrying.**
- **The apply outcome has not been confirmed. Check status before submitting again.**
- **Work failed after producing one retained output. Inspect the output or retry the failed stage.**
- **Your draft was restored on this device and is unsaved. Compare it with the current Project revision.**
- **The export was generated. Delivery could not be confirmed. Retry delivery uses the same file.**

**Something went wrong**, **Retry** without an object, **Recovered** without a
verified state, **Undo** for an applied change, **Resume** without a checkpoint,
and **No changes** based only on a stale screen are prohibited. Petra may explain
the reconciliation evidence or compare eligible options, but direct controls and
conversation resolve to the same recovery identities and actions.

### Responsive and accessible recovery behavior

| Condition | Required behavior |
| --- | --- |
| Wide | Inline recovery remains beside the task; History uses list plus one event detail/comparison and at most one contextual surface |
| Compact/narrow | State, effect, preserved work, primary action, alternatives, and History link form one ordered column; returning restores the affected control/focus |
| Screen reader/keyboard/voice | Summary heading receives focus only after a submitted action needs intervention; member counts, outcomes, current selection, actions, unavailable reasons, and return are programmatically available |
| Streaming/replay | Announce one meaningful failure, reconciliation result, or available update; preserve reading position and deduplicate replay announcements |
| High zoom/magnification | The affected object and action remain adjacent, focus is unobscured, tables become lists where needed, and comparison retains a linear peer |
| Forced colors/reduced motion/no audio | Text, boundaries, icons, and immediate state replacement carry effect and severity without color, motion, or sound alone |
| Offline or service outage | Persistent status names affected functions and last known basis; safe local/read-only paths remain usable without hidden command queuing |
| Dense/mixed batch | Summary counts identify units and unknowns; grouping/filtering never removes individual outcomes or the selected recovery manifest |

Automatic focus movement is reserved for a blocking result of the author's
submitted action. Background failure appears in the task's attention state and a
bounded status announcement; it does not interrupt unrelated editing. Focus stays
on **Check status** while a reconciliation updates, then the result is announced
and the newly eligible action follows in reading order.

### Interaction-path specification

| Path | Entry and action | Required result, return, and focus |
| --- | --- | --- |
| `DB17-P01` Reconcile uncertain command | Lose delivery during Apply, save, policy transition, cancellation, or another typed command, then reopen the task | Check exact command/event/receipt and expected revisions; classify effect before showing any repeat action; return to the affected object/control |
| `DB17-P02` Recover a mixed batch | Apply independently atomic members with applied, conflicted, failed, pending, or unknown outcomes | Show per-member results and derived counts; form recovery only from eligible unresolved members; preserve batch position and approvals only where still exact |
| `DB17-P03` Reconnect and replay | Lose a stream, close Petra, restart the client, or return from another Project | Reconnect to the same run/Work, replay persisted content after the checkpoint once, expose gaps, and restore turn/composer/task context without starting or cancelling Work |
| `DB17-P04` Retry, resume, or start again | Open failed/interrupted Work with an unchanged eligible retry, verified checkpoint, or need for fresh execution | Present the exact operation, retained/reused inputs and outputs, limits, cost, and prior attempts; perform only the chosen registered path and return to the task/stage |
| `DB17-P05` Resolve cancellation race | Cancel eligible Work while completion or failure may occur and delivery is lost | Reconcile cancellation receipt and terminal Work state; report the winner and retained outputs; never claim reversal, refund, or deleted results |
| `DB17-P06` Restore local work | Reopen after browser crash, save failure, local-storage failure, or newer server revision | Label recovered content and durability, compare base/local/current, preserve both sides, and save/export/discard only by explicit eligible action; return to cursor/finding |
| `DB17-P07` Resolve stale or conflicted state | Use a stale action, candidate, revision, policy, source, or reversal preview | Preserve the attempted input, show current change and impact, regenerate/compare/revise through the owner, and require a current exact decision where authority applies |
| `DB17-P08` Recover a lagging projection | Apply/revert succeeds while Graph/search/vector view is delayed or failed | Show authoritative result and projection position separately, provide a usable authoritative/text path, catch up idempotently, and never repeat the domain command |
| `DB17-P09` Recover output or delivery | Rendering, byte publication, download, clipboard, or external delivery fails, is partial, or is uncertain | Identify exact generated members and observable delivery; retry the same output separately from regenerate; preserve source revision and return to output |
| `DB17-P10` Recover source/access/capability | Encounter missing/corrupt bytes, expired permission, offline remote source, unsupported renderer, or denied capability | Reveal only permitted identity/limitation, preserve task input, offer reauthorization/reacquisition/fallback/revised scope, and return to the exact source/task |
| `DB17-P11` Inspect History and return | Enter from an object, task, thread, recovery, Recent changes, or deep link; filter and select an episode | Show exact actor/origin/order/effect/outcome/links and current eligibility; comparison is read-only; Return to current restores a resolved current target and origin |
| `DB17-P12` Revert an applied change | Select an eligible recent/historical change or contiguous supported set | Re-resolve eligibility, preview every compensation and downstream effect, apply the exact typed plan, append history, report projection state, and return to current result |
| `DB17-P13` Withstand service/integrity failure | Authoritative or object storage is unavailable, restored, or fails verification during read/write | Fail unsafe writes closed, preserve local work, state last verified boundary, reconcile after operational recovery, and reopen only verified functions without claiming browser/History backup |

All paths run through scientific, controlled-writing, and an unrelated admitted
profile where the underlying function applies. Profile differences alter object,
validator, workflow, and failure meaning; the reconciliation and action semantics
remain shared.

### Paper interaction and heuristic audit

The paper audit walks `DB17-P01`–`P13` from inline failure, Petra, Work, Review,
Composition, Graph, Sources, Settings, History, deep links, reconnect, browser
restart, offline, and restored-service entry. It covers no-effect, complete,
in-progress, mixed, unknown, and unavailable verification states; local/durable
preservation; unchanged retry, verified resume, fresh execution, cancellation
races, projection lag, stale conflicts, delivery uncertainty, and governed
reversal. It does not claim runtime reconciliation, disaster recovery,
cross-browser storage, accessibility, performance, security, or participant
comprehension.

| Heuristic | Paper-design check |
| --- | --- |
| Visibility of status | Task, attempted operation, effect knowledge, preserved/lost state, freshness, recovery progress, and exact outcome lead |
| Match to author task | Recovery returns to the affected object and uses domain-valid terms while shared verbs keep stable consequences |
| User control | Check, refresh, reconnect, retry, resume, start again, restore, reconcile, revalidate, redeliver, undo, revert, and return remain distinct |
| Consistency | Direct and Petra-mediated recovery use the same records/actions across modules, profiles, viewports, and input modes |
| Error prevention | Reconciliation, exact identity, current eligibility, per-member outcomes, and no preselected destructive conflict choice prevent duplicate or lost work |
| Recognition | Persistent summaries, preserved input, causal episodes, explicit comparisons, and return context remove the need to reconstruct logs |
| Efficiency | Safe automatic delivery/projection repair and concise member summaries reduce work while exact detail and alternatives remain available |
| Minimal design | One blocking boundary and primary recovery lead; technical records, related failures, and complete History remain on demand |
| Recovery | The design preserves durability labels, attempts, outputs, approvals, history, privacy, and exact return through every adverse state |
| Help and language | Action labels state their object and effect; unavailable reasons, retry safety, data loss, and technical detail are accessible in context |

| Finding | Consequence | Severity | Disposition and verification |
| --- | --- | --- | --- |
| `DB17-A01` Generic Retry appears before effect is known | An applied command, save, cancellation, or external delivery could be duplicated | Critical | Fixed by reconciliation-first effect states and P01/P02/P05/P09; UX-FX42 |
| `DB17-A02` Retry, Resume, and Start again collapse | Petra could invent checkpoint support, reuse stale inputs, hide attempts, or add unacknowledged cost | Critical | Fixed by action vocabulary and Work boundary; UX-FX41/42 |
| `DB17-A03` Local restoration looks durably saved | Recovered browser content could overwrite a newer revision or be lost again | Critical | Fixed by durability labels and base/local/current comparison; UX-FX41/43 |
| `DB17-A04` Batch summary hides independent outcomes | Applied members may repeat or conflicted members may inherit invalid approval | Critical | Fixed by atomic-member manifests and mixed-outcome recovery; UX-FX42 |
| `DB17-A05` Projection failure is treated as failed authority | Authors may repeat Apply/Revert or distrust a valid committed change | Critical | Fixed by authority/projection separation and P08; UX-FX41/42 |
| `DB17-A06` Reconnect, replay, stop, and cancel share an outcome | Delivery recovery could restart/cancel Work or duplicate a response/decision | Critical | Fixed by interaction identities, receipts, and P03/P05; UX-FX42 |
| `DB17-A07` History becomes destructive undo or an invented total order | Prior decisions could appear erased or causal claims could exceed the records | Critical | Fixed by additive causal episodes, compensation, and source-order limits; UX-FX43 |
| `DB17-A08` Recovery leaks restricted historical state | Errors, counts, replacements, or prior values could disclose inaccessible Project content | Critical | Fixed by current authorization and redacted continuity; UX-FX42/43 |
| `DB17-A09` Existing records have no complete recovery composition | The client/model could infer effect, eligibility, preservation, or return from mismatched records | Critical | Needs contract: `UX-REQ-023`; runtime disposition and UX-FX41–43 |
| `DB17-A10` Paper rules substitute for observed recovery | Authors may still misread durability, action effects, mixed outcomes, or History | Major | G-VALIDATION requires participant, accessibility, timing, interruption, and destructive-error evidence; UX-FX41–43 |

Acceptance fails if the interface repeats a material operation before reconciling
its effect; calls an unresolved timeout failed or no-effect; labels local work
saved; hides mixed members; retries an applied member; resumes without a verified
checkpoint; restarts Work during replay; treats disconnect as cancellation;
repeats Apply to repair a projection; calls regeneration redelivery; presents
History as deletion or exact total order without evidence; transfers approval to
changed content; leaks a restricted object through recovery; lets a model invent
eligibility; or returns to an ambient selection without naming the fallback.

### Acceptance criteria and post-freeze evidence

DB17 is complete at specification depth. Implementation and validation must
demonstrate these behaviors after freeze:

1. every material failure identifies its task/object, attempted operation, exact
   basis, effect knowledge, preserved/lost state, freshness, and safe next action;
2. canonical command, event, Work, interaction, persistence, projection, output,
   delivery, and policy records establish outcomes within their own authority;
3. reconciliation occurs before any action that could repeat, replace, save,
   publish, cancel, compensate, or broaden an operation;
4. confirmed no-effect, confirmed effect, in-progress, mixed, unknown, and
   unavailable-to-verify states remain distinguishable without color;
5. Retry, Resume, Start again, Restore local work, Reconcile, Revalidate, Retry
   delivery, Undo, view Back/Forward/Reset, Revert, and Return to current retain
   the specified identities, costs, and History effects;
6. automatic reconnect/replay, projection repair, client restoration, and policy-
   authorized attempt behavior cannot broaden scope, capability, cost, or authority;
7. offline and service-failure states preserve input and safe local/read-only work
   without hidden command queues or false claims about current durable state;
8. reconnect/replay deduplicates content and decisions, never creates or cancels
   Work, and restores the exact turn/task context or states the gap;
9. Work retry, verified checkpoint resume, fresh execution, retained partial
   output, required input, resource use, and cancellation race outcomes remain exact;
10. independent batch members expose individual outcomes and form a new recovery
    manifest from eligible unresolved members only;
11. projection lag/failure preserves committed authority, supplies a safe current
    route, and never repeats the producing domain command;
12. local draft recovery preserves durability labels and base/local/current until
    an explicit current save, separate revision, export, or discard outcome;
13. output recovery separates rendering, byte publication, delivery observation,
    redelivery, regeneration, cancellation, and irreversible prior disclosure;
14. History provides authorized causal episodes, exact event/action facts,
    comparison, recovery relationships, current eligibility, and additive reversal
    without truncating retention to the recent-ten quick window;
15. recovery, History, errors, redactions, and fallbacks disclose no unauthorized
    object identity, count, prior value, relationship, or content;
16. inline, Project-level, Petra, Details, Work, and History presentations resolve
    the same recovery state and registered actions without competing ownership;
17. responsive and assistive paths preserve task/outcome equivalence, focus,
    announcements, member inspection, action consequence, and exact return; and
18. runtime, browser/storage, offline, race, disaster-recovery, accessibility,
    performance, security, and participant evidence remain explicit post-freeze gates.

| Scenario | Required post-freeze evidence |
| --- | --- |
| `UX-FX41` Cross-module preservation and exact return | In scientific, controlled-writing, and unrelated third-profile Projects, interrupt Project/Brief reads, source inspection, Graph/Details, Petra, Work, Review, Composition, Settings, export, and History. Exercise recoverable and lost local input, cached/stale state, retained partial output, exact task/object/selection/focus return, profile terminology, narrow/high-zoom, keyboard/screen-reader, and direct/Petra paths without changed authority. |
| `UX-FX42` Uncertain, mixed, offline, and race recovery | Drop delivery before and after command receipt; apply a batch with applied/conflicted/failed/pending/unknown members; reuse conflicting idempotency input; disconnect/replay; race completion with cancellation; fail projection after commit; exhaust retry; present invalid checkpoint resume; expire access/capability; enter and leave offline/service outage. Verify reconciliation, no duplicate effect, no leakage, accurate attempt/cost, and safe unavailable states. |
| `UX-FX43` Local conflict, History, delivery, and reversal | Restore a local draft against unchanged and newer durable bases; fail local storage and save; regenerate/revalidate; generate multi-member output with publication and delivery uncertainty; retry exact delivery separately from regeneration; inspect filtered object/task/Project histories, terminology-version change, restricted/redacted members, causal-order ambiguity, recent-ten/full-history boundary, single and supported multi-step compensation, ineligible Revert, projection catch-up, and Return to current. |

These scenarios are independently invented and start only after design freeze.
Existing cancellation, replay, reversal, composition, publication, projection,
and infrastructure-recovery evidence establishes component mechanisms. It does
not prove the DB17 author-facing composition, cross-module return, browser/local
recovery, accessibility, privacy, performance, or participant comprehension.

### Backend needs and next section

Existing command envelopes and events provide idempotency and exact effects;
M1.5 provides independently atomic ChangeSets, Review outcomes, compensating
reversal, and projection separation; M1.7 provides durable Work cancellation,
interaction replay, connection delivery receipts, and exact retry; M1.8 provides
atomic composition, additive revision, rendered Artifact identity, and interrupted
publication recovery; M1.9 proves infrastructure backup/restore and graph rebuild
under a consistent capture. These remain separate sources with different
authority and do not themselves compose the author's recovery decision.

DB17 sharpens `UX-REQ-007` to supply full authorized Project History and causal
recovery relationships alongside Recent changes and reversal eligibility;
`UX-REQ-014`/`015` to expose reconciled Work attempts, controls, transition and
cancellation outcomes; `UX-REQ-018` to bind local/base/current editing recovery;
and `UX-REQ-019` to distinguish publication, delivery retry, and regeneration.
No accepted contract currently composes an attempted cross-module operation,
authoritative observations, effect classification, preserved-state inventory,
per-member outcomes, eligible owning actions, History consequence, and exact
return. Proposed `UX-REQ-023` requests that recovery assessment without creating
a universal recovery command or a second event ledger.

DB17 closes at `G-SPEC`; contract, implementation/integration, offline/browser,
race, disaster-recovery, accessibility, performance, security, and participant
validation remain separate. Continue to DB18, Product blueprint and acceptance.
`UX-DESIGN-FREEZE-01` remains unaccepted.

## DB18 — Product blueprint and acceptance

**Status:** opening discussion after DB17 specification closure. The
implementation-packet recommendation below is proposed and not yet accepted. No
reference-UX implementation or design freeze is authorized.

### Opening recommendation — one traceable implementation packet

The recommendation is for DB18 to assemble the accepted design into one
implementation-ready packet organized by author task and canonical surface. It
would include the complete screen/surface inventory, responsive blueprints,
shared and surface-specific state matrix, transition and return map, component
roles, exact view/query/command/event dependencies, profile extension slots,
copy and accessibility obligations, recovery paths, and post-freeze evidence
for every material route. It would reference the detailed DB sections rather
than restating or weakening them.

For example, the Graph blueprint would bind contextual and direct entry to the
same relationship task; show wide, narrow, high-zoom, keyboard, and semantic-peer
compositions; map Current/Working changes/Historical, selection, presentation
scene, Work/Review actions, projection lag, recovery, History, and return; and
name `UX-REQ-013`, `UX-REQ-022`, and `UX-REQ-023` as proposed dependencies. An
implementer could build and test that surface without consulting a demo corpus or
guessing whether a visual control changes authority.

DB18 would close only when every accepted flow and adverse state maps through
that packet, every remaining contract gap has an owner, and the freeze review can
identify contradictions or omissions explicitly. Whether this traceable packet
is the accepted DB18 consolidation format remains the next decision.

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

1. carry accepted specifications through `DB17` into their recorded backend dispositions without implementing a product surface;
2. discuss DB18's traceable implementation-packet consolidation format;
3. assemble the complete screen inventory, responsive blueprints, state matrices, flow/return map, backend ledger, and acceptance plan in `DB18`;
4. review and explicitly record `UX-DESIGN-FREEZE-01`;
5. begin the neutral reference-UX implementation;
6. begin contextual demo integrations only after the reference UX stands independently.
