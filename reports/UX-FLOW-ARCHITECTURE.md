# Petra user-flow architecture

Status: accepted product flow, information architecture, Sources, and Review behavior; profile, source-lifecycle, working-graph, and Review contracts awaiting architecture disposition
Date: 2026-09-04
Primary scope: Petra's governed knowledge-work lifecycle, with scientific research and complex controlled writing as distinct project profiles
Demo boundary: the product flow architecture is completed and frozen before external scientific or writing contexts are integrated

## Purpose

Petra's interface is organized around the responsible project author's decisions, not around a
collection of panels. This document maps the accepted product principles into a
complete family of user flows, identifies which surface supports each task,
and states where work becomes authoritative, cancellable, reversible, or
recoverable.

The map is exhaustive for Petra's shared governed-work lifecycle and Petra's
currently planned scientific horizons. It establishes the controlled-writing
mechanics but does not invent that profile's final ontology. It does not make
every flow an M1 feature or prescribe one permanent screen for every object.
Each module still follows its discussion-first loop.

The completion and separation rules for the whole product design are defined in
[the Petra UX design brief](PETRA-UX-DESIGN-BRIEF.md). This flow document does
not use a demo corpus as a source of product requirements.

## Primary user and scope

The initial user is the individual, hands-on project author: the person who
directs the work and has final responsibility for accepting its consequences.
The profile determines whether the interface addresses that person as a
researcher, author, or another accepted role.

Across profiles, the project author is responsible for:

- framing and revising the controlling question, objective, or problem;
- deciding which sources, constraints, and derived statements are admissible;
- directing retrieval, analysis, validation, composition, and profile-specific work;
- reviewing candidates from identifiable authors, model roles, Work,
  extraction, or import and correcting substantive mistakes;
- promoting exact, inspectable results into new authoritative revisions;
- producing traceable project artifacts.

In the scientific profile, the primary role is `Researcher`;
principal-investigator review, specialist review, and research engineering are task
postures. In the controlled-writing profile, the primary role is `Author`;
structural, continuity, canon, voice, and line review are task postures. These
postures may use different agents or validators without changing who can
approve the authoritative result. Multi-user collaboration, public readers,
and external automation remain later boundaries.

## Use-agnostic kernel and adaptive project profiles

Petra is use-agnostic at the work-and-authority layer and domain-specific at
the meaning layer. A Project binds to one versioned profile. That profile owns
its object types, allowed relationships, validation rules, surface roles, and
user-facing terminology. It does not replace or weaken Petra's invariant
controls.

| Invariant role | Scientific-research profile | Controlled-writing profile |
| --- | --- | --- |
| Responsible person | Researcher | Author |
| Orientation surface | Research Brief | Revision or project Brief |
| Controlling frame | ResearchQuestion and later Hypotheses | Revision objective and governing creative constraints |
| Protected basis | WorkVersion, Artifact, Paper, SourceSpan, Result | Source manuscript revision, reference Artifact, canon or constraint source, exact passage |
| Domain meaning | Claim, Assertion, EvidenceRelation, scope, standing, obligation | Canon fact, continuity or narrative constraint, dependency, validation finding, revision obligation |
| Relationship view | Evidence, provenance, alternative, and experiment paths | Character, event, knowledge, continuity, causality, and revision-impact paths |
| Validation | Evidence review, method checks, replication, and Experiment criteria | Structural, canon, continuity, character, voice, and prose checks |
| Promoted output | Trusted graph change, scientific DraftArtifact, Result, or export | Approved constraint change or new manuscript revision |

The controlled-writing terms above define semantic roles, not final schema
names. The profile design must establish their exact meanings before backend
implementation. A narrative constraint cannot be stored as a scientific Claim
merely because both can appear in a graph.

The invariant mechanics and controls are:

```text
bind Project to profile and immutable source revisions
  -> frame an objective and applicable constraints
  -> inspect the current basis and dependencies
  -> answer locally or start bounded Work
  -> create or revise a non-authoritative candidate or finding
  -> validate with profile-appropriate roles and rules
  -> inspect provenance, impact, limitations, and exact diff
  -> prepare exact changes and approve, correct, reject, defer, branch, or cancel
  -> promote through the typed command path
  -> preserve source, candidate, decision, and resulting revision
```

Profile adaptation is therefore more than relabeling. The shell and assistant
may receive profile-owned nouns, descriptors, and available surface roles, but
only registered profile contracts may supply them. The browser cannot turn a
Hypothesis into a story beat by replacing text. `UX-REQ-004` records the
required runtime boundary.

The model adapts through that same profile boundary. Every material assistant
or worker request binds the Project profile, its domain schemas, the allowed
tool and validator set, and the applicable terminology or prompt revision into
the bounded input record. Outputs are validated as profile-owned candidates or
artifacts before any proposal and Review path. The profile does not silently select
a provider, broaden capabilities, or grant authority; model routing remains a
separate governed decision.

## First-principles interaction rules

1. **A user goal opens a surface.** A surface does not demand attention merely because Petra has data for it.
2. **The profile Brief is the project home.** It states the live objective, material uncertainty or constraint, attention work, and useful next action before exposing detail.
3. **One decision dominates at a time.** Supporting context may remain visible, but it does not compete with the task's primary action.
4. **Object identity survives every representation.** Brief, Evidence, Papers, Graph, Details, assistant, Work, review, and Draft views resolve to the same object and revision.
5. **Petra answers locally before starting expensive work.** Current-snapshot and cached results appear first; new investigation is a separate, visible choice.
6. **The governing basis remains one deliberate action away.** A material statement can reveal its profile-owned object, exact source span or result, scope, origin, and review state.
7. **Read, structure, review, and apply remain distinct.** Fluent text, a working-graph candidate, selection, graph layout, and a completed WorkUnit do not become domain authority.
8. **Direct and conversational actions share one command path.** Chat does not create a second governance system.
9. **Durable work has a durable lifecycle.** Stopping a stream, hiding a panel, detaching, reconnecting, steering, and cancelling Work are different operations.
10. **History is additive.** Corrections, supersession, rejection, and Revert preserve the original source, proposal, decision, and revision.
11. **Progressive disclosure reduces noise without hiding consequence.** Scope, cost, authority, warnings, and recovery appear when they affect the decision.
12. **Every material path has an accessible equivalent.** Graph-only, color-only, hover-only, drag-only, and stream-order-only understanding is insufficient.
13. **Natural conversation supplies working structure.** A named model role may turn bounded interaction into durable non-authoritative candidates, relationships, basis, provenance, uncertainty, and validation inputs without requiring graph entry; Petra presents and governs those records but does not author or approve them.

## Core governed-work loop

```text
Orient to the Project, profile, current objective, snapshot, and attention state
  -> choose the uncertainty, decision, or output that matters now
  -> inspect the smallest adequate evidence and context
  -> decide whether the current basis is sufficient
      -> if sufficient: propose or perform a bounded direct action
      -> if insufficient: ask Petra or start bounded Work
  -> inspect the result, limitations, provenance, and impact
  -> apply, correct, reject, defer, branch, or cancel
  -> observe authoritative and projection state separately
  -> compose or revise a traceable artifact when useful
  -> return to an updated Brief without losing history
```

The loop may end after any useful read-only answer. Petra does not force every
question into new Work, every result into a graph change, or every decision
into a DraftArtifact.

## Interaction roles

| Role in the interaction | What it is for | What it cannot do by itself |
| --- | --- | --- |
| Direct manipulation | Inspect, select, compare, edit, and request a typed change without using conversation | Bypass preview, policy, validation, or the ChangeSet path |
| Petra assistant | Explain current state, answer bounded questions, recommend actions, translate intent, and mediate review in the Project's profile language | Become the source of authority, invent profile semantics, or retain the only copy of Project state |
| Suggested action | Name a profile-valid objective, readiness, basis, likely output, depth, cost, capability, and consequence | Hide an unspecified operation behind a generic AI action or imply that clicking has applied a change |
| Work | Execute durable retrieval, analysis, ingestion, validation, composition, or profile-specific tasks | Self-authorize, silently mutate trusted state, or disappear when the interaction stream closes |
| Review policy | Automate only an eligible, calibrated, versioned class of decisions | Grant a capability or broaden itself because a model is confident |
| ChangeSet | Preview, validate, apply, and reverse one profile-valid authority change | Merge unrelated decisions into an opaque transaction or validate an unregistered domain operation |

## Accepted place model

Petra has a small stable place hierarchy. Domain profiles change the objects,
relationships, validators, terminology, and optional tools within it; they do
not create a second application shell.

| Scope | Places | Navigation rule |
| --- | --- | --- |
| Global | **Projects**, **Settings** | Available without an open Project; Settings returns to its exact origin |
| First-class Project | **Brief**, **Sources**, **Review**, **Graph**, **Work**, **Composition** | Remain stable across profiles; Review and Work may show accessible attention indicators, never a score |
| Profile Project | Registered profile tools | Appear in a clearly named profile group only when the active versioned profile supports them |
| Contextual | **Details**, **Petra** | Open from a selected object, question, action, Work, proposal, or interrupt; do not occupy permanent primary navigation |
| Deliberate secondary | **History** | A full, deep-linkable Project route reached from Recent decisions, Details, Review, changed items, or Revert; it is not an everyday primary tab |

The Project switcher, compact context bar, primary-place navigation, and
profile-owned object map are navigation structures rather than additional
places. The map helps authors locate stable objects; it does not compete with
the current task or become a second Brief.

**Composition** is the shared place role for planning, producing, revising,
validating, and rendering governed outputs. `DB12` may refine its product copy
only if the replacement remains accurate across supported profiles and retains
the same route and authorial controls.

## Surface activation model

The user goal activates the surface. Petra does not open a panel merely because
data exists.

| Surface | Default posture | Opens when | Completion or recession rule |
| --- | --- | --- | --- |
| Projects | Global landing place | The app opens without a Project, the user invokes the Project switcher, or a Project link cannot resolve | A Project opens into its Brief; create/import paths retain their own validation and authority |
| Settings | Global main surface or narrow full-width route | Appearance, layout, editor, accessibility, privacy, model visibility, or local preference control is requested | Apply local settings immediately where safe and return to the exact origin and focus target |
| Context bar | Persistent and compact while a Project is open | Any Project place opens | The Project closes or explicitly switches; it never becomes an editable domain form |
| Project navigation | Persistent on wide screens; compact disclosure on constrained screens | A Project is open | It recedes for focus but remains keyboard reachable |
| Project map | Compact object-navigation region on wide screens; on-demand drawer otherwise | The author locates or compares stable profile-owned objects | It recedes when the task needs reading space and preserves selection |
| Brief | Default Project main surface | A Project opens, a task completes, or the author selects Brief | A more specific task opens; returning restores the originating Brief item and comparison state |
| Sources | First-class Project main surface | A source is added, managed, searched, processed, or followed from provenance | Source work completes or follows an exact object, proposal, relationship, Work result, or composition basis |
| Review | First-class Project main surface | A proposal, validation finding, conflict, batch, promotion, or governed Revert requires judgment | The decision completes, defers, conflicts, or follows its basis; return state identifies the originating item |
| Graph | First-class task-specific Project main surface | A relationship, dependency, provenance, comparison, impact, or temporal question benefits from graph form | The question is answered or another representation is clearer; graph exploration history remains available |
| Work | First-class Project main surface | The author opens durable Work, its queue, an interrupt, progress, failure, result, or recovery | Work reaches a terminal or waiting state and the author returns to its objective, proposal, output, or Brief item |
| Composition | First-class Project main surface | The author plans, creates, reviews, edits, validates, renders, or exports a governed output | The revision is saved, promoted, rejected, or retained and returns to its governing objective and basis |
| Profile tool | Registered task-specific main surface | A supported profile-valid operation is requested | The task returns a typed result, proposal, or failure and then returns to its objective or Work |
| History | Deliberate Project main surface | The author inspects decisions, events, revisions, failures, comparison, or governed Revert | Inspection or reversal completes and returns to the originating object, task, or Brief item |
| Details | Closed until a stable selection exists; contextual secondary surface | An object, relationship, statement, source span, result, Work item, event, or output span is selected | Selection clears, the author closes it, or a dedicated main surface absorbs the detail |
| Petra | Restrained dock at rest; contextual secondary or focus surface | The author asks, opens a recommendation, follows a linked thread, or responds to an interrupt | Collapse preserves thread, composer, context, and Work; only explicit commands cancel Work or apply changes |

At ordinary desktop widths, Petra shows one primary main surface and at most
one expanded secondary task surface by default. Pinning more context is an
explicit, reversible layout choice available only when the viewport preserves
the primary task. On narrow or highly zoomed layouts, Details and Petra become
full-width routes with explicit return actions rather than squeezing the main
surface.

## Navigation-context contract

Every material transition carries a presentation-level navigation context:

- Project and versioned profile identity;
- current focus or task objective;
- authoritative snapshot and separate projection checkpoint;
- primary place and task intent;
- selected object, relationship, statement, source, Work, proposal, event, or
  output references with relevant revisions;
- comparison baseline or historical-view state when applicable;
- active Petra thread and Work references when explicitly linked;
- origin place, originating item, scroll or reading position, and keyboard
  focus target; and
- preserved unsent local input and surface-specific view state.

This context coordinates presentation; it is not a domain command or authority
record. The destination reloads its own snapshot-consistent view model. A route
cannot silently substitute a new object, profile, action revision, or snapshot.
When current state has changed, the destination offers current, compare, or
original-snapshot paths according to the owning module's contract.

Switching Projects is explicit. It changes the shell, Brief, profile, object
map, Details selection, and default Petra context together. Background Work in
the prior Project continues unless explicitly cancelled and remains reachable
from that Project. Unsent local edits are preserved per Project and surface, or
the switch explains why an unsupported draft cannot be retained before it
proceeds.

### Browser history, graph history, and deep links

- Browser Back and Forward restore primary place, selection, contextual
  surface, origin, and focus where the target remains valid.
- **Back in graph** and **Forward in graph** restore the ten-state graph
  exploration trail. Pan, zoom, filter, expansion, and depth changes do not
  flood browser history or issue a domain command.
- A copied deep link contains only opaque identifiers and necessary route,
  revision, snapshot, or comparison references. It does not expose excerpts,
  prompts, private context packets, or credentials in the URL.
- A link to an exact revision preserves that historical meaning and labels it
  historical. A link intentionally targeting current state says so and resolves
  current state at open time.
- Missing, superseded, incompatible, unauthorized, or unsupported targets name
  the condition without leaking protected metadata and offer the current
  replacement, History, stable parent, Projects, or Brief where permitted.
- Opening an external deep link establishes that route as the origin. Browser
  Back returns outside Petra when available; an in-product **Return to Brief**
  provides the safe Project fallback.

`UX-REQ-008` records the semantic object-location and replacement-resolution
gap. The client maps a registered semantic destination role to a route; the
backend does not prescribe layout or raw URL strings.

## Accepted surface-transition matrix

| Trigger | Primary destination | Optional secondary | State that must survive | Normal completion or return |
| --- | --- | --- | --- | --- |
| Open or switch Project | Brief | None | Explicit Project choice; prior Project drafts remain scoped to their origin | Brief current focus |
| Brief attention item requires judgment | Review | Petra | Brief item, baseline, snapshot, affected objects, return focus | Updated or deferred Brief item |
| Brief item requires exact source context | Sources | Details or Petra | Brief statement, source/version/span, snapshot, return focus | Originating Brief item |
| Brief relationship or impact question | Graph | Details or Petra | Task question, endpoints, filters, snapshot, baseline | Originating Brief item with graph trail retained |
| Brief action starts or opens Work | Work after exact action preview | Petra | SuggestedAction revision, objective, context, snapshot, originating item | Result, Review, Composition, or updated Brief item |
| Select an inspectable object anywhere | Current primary place | Details | Stable selection, revision, snapshot, reading position | Same primary place and focus target |
| Ask Petra about any item | Current place or Petra focus | Petra | Exact selected references, snapshot, exclusions, origin, unsent input | Same origin unless the author explicitly follows Petra's link |
| Add, inspect, or process source | Sources | Details or Petra | Source identity, rights, version, processing state, Project relevance | Source list, exact source position, Review, Work, Graph, or origin |
| Open proposal, finding, conflict, promotion, or Revert | Review | Petra or Details | Exact proposal/plan revision, basis, impact, snapshot, origin | Applied, corrected, rejected, deferred, conflicted, or reverted state, then origin |
| Inspect relationship, provenance, dependency, time, or impact | Graph | Details or Petra | Task scope, endpoints, temporal state, selection, graph history | Originating item or another exact representation |
| Open active, blocked, failed, or completed Work | Work | Petra or Details | WorkUnit, objective, inputs, current stage, origin | Interrupt, retry, result destination, Review, Composition, or origin |
| Follow Work result that proposes change | Review | Petra | WorkUnit and result, proposal revision, limitations, snapshot | Work result and updated origin |
| Follow Work result that creates output | Composition | Petra or Details | WorkUnit, artifact/candidate revision, provenance, validation state | Saved/promoted output, Work result, or Brief |
| Inspect composition provenance or dependency | Sources, Graph, or Details according to the question | Petra | Output revision/span, source or relationship, snapshot, editor position | Exact editor position and focus |
| Promote or reverse an output revision | Review | Petra | Candidate/source revisions, validation, impact, approval, origin | Composition at resulting revision and updated Brief |
| Inspect event, prior revision, or recovery | History | Details or Petra | Event/revision, object, current and historical snapshots, origin | Current object, Review for reversal, or origin |
| Change personal settings | Settings | None | Origin place, selection, unsent input, focus, active Work | Exact origin with new presentation applied |
| Open profile tool | Registered profile place | Petra or Details | Objective, profile/version, inputs, snapshot, origin | Typed result, Work, Review, Composition, or origin |
| Open valid deep link | Resolved semantic place | Details or Petra only when encoded and permitted | Exact target/revision/snapshot; no ambient selection substitution | Browser Back or Project Brief |
| Open invalid or inaccessible deep link | Safe error at resolved scope | None | Permitted Project identity only | Replacement, History, stable parent, Projects, or Brief |

## Flow-to-place coverage

The detailed flow definitions below remain normative for entry, path,
completion, branches, authority, and horizon. This matrix proves that every
flow has a place and return path without creating a screen per object.

| Flow | Primary places | Supporting places | Terminal or return state |
| --- | --- | --- | --- |
| `UX-FLOW-01` create/open/resume | Projects, Brief | Settings for local presentation only | Brief current focus or explicit unavailable state |
| `UX-FLOW-02` frame objective | Brief, registered profile place or Review according to the command | Petra, Details, History | Applied focus, retained draft, conflict, or Brief |
| `UX-FLOW-03` form/compare/revise profile propositions | Brief, Graph, Review | Details, Sources, Petra, History | Applied, branched, superseded, deferred, or Brief |
| `UX-FLOW-04` add/reuse/discover/select sources | Sources | Details, Petra, Work | Linked, registered, rejected, deferred, rights-limited, or Sources |
| `UX-FLOW-05` process/inspect source | Sources, Work | Details, Petra, History | Exact source context, retained failure, or origin |
| `UX-FLOW-06` review extracted proposals | Review | Sources, Details, Petra, Graph, History | Applied, corrected, rejected, deferred, conflicted, or Review |
| `UX-FLOW-07` inspect basis/provenance | Details, Sources | Graph, Review, Petra, Composition | Exact admissible basis or explicit no-path state, then origin |
| `UX-FLOW-08` resolve disagreement/gap | Review, Graph | Sources, Details, Petra, Work | Resolved, qualified, rejected, unresolved, bounded Work, or Brief |
| `UX-FLOW-09` understand standing/frontier or profile equivalent | Brief, Graph | Details, Sources, Petra, Work | Supported assessment and next action or explicit limitation |
| `UX-FLOW-10` ask Petra | Petra sidecar or focus | Current origin, Details, Sources, Graph | Answer, abstention, action preview, proposal, or origin |
| `UX-FLOW-11` preview/start/manage Work | Work | Petra, Details, Review, Composition | Completed, failed, cancelled, blocked, proposal, output, or origin |
| `UX-FLOW-12` propose/apply/reverse | Review, History | Details, Sources, Graph, Petra | Applied, rejected, deferred, conflicted, reverted, or origin |
| `UX-FLOW-13` run profile-specific experiment or validation | Registered profile place, Work | Brief, Graph, Details, Petra, Review | Typed result, failure, interpretation proposal, or objective |
| `UX-FLOW-14` request/compose output | Composition | Brief, Petra, Sources, Details, Work | Candidate output, limitation, failure, or Composition |
| `UX-FLOW-15` revise/validate/render/export | Composition, Work | Sources, Details, Graph, Review, History | Saved/promoted revision, retained failure, export receipt, or origin |
| `UX-FLOW-16` inspect history/recover | History, Work, Review | Graph, Details, Petra, Composition | Current recovered state, retained failure, branch, or origin |
| `UX-FLOW-17` configure presentation/governance/capability | Settings for presentation; Review or Petra interrupt for governed changes | Origin, History | Applied local preference, approved/rejected governed change, or origin |
| `UX-FLOW-18` reuse/share/connect | Projects, Sources, Composition, Review | Petra, Work, History | Reused object, explicit receipt, proposal, failure, or origin |

### How the flow catalogue applies across profiles

The catalogue below uses scientific terms where the scientific M1 contract is
already specific. The control path remains shared; the profile supplies the
domain object at each role.

| Flow family | Scientific application | Controlled-writing application |
| --- | --- | --- |
| `UX-FLOW-01`–`03` | Open a research Project; frame a question; form and revise Hypotheses | Open a writing Project; frame a revision objective; establish or revise governing constraints and alternatives |
| `UX-FLOW-04`–`07` | Add, discover, or reuse literature; inspect papers and SourceSpans; review extracted Claims; trace evidence provenance | Register or reuse protected manuscript and reference revisions; inspect exact passages; review extracted canon or constraints; trace revision provenance |
| `UX-FLOW-08`–`09` | Resolve disagreement, evidence gaps, standing, and research frontier | Resolve continuity, causality, character, knowledge-timing, structure, or voice conflicts and coverage gaps |
| `UX-FLOW-10`–`12` | Ask Petra; run bounded research Work; review and apply a scientific ChangeSet | Ask Petra; run bounded revision or validation Work; review and promote an exact candidate or constraint ChangeSet |
| `UX-FLOW-13` | Design and interpret Experiments | Optional profile-specific validation or simulation; no experiment vocabulary appears unless the profile defines it |
| `UX-FLOW-14`–`16` | Compose, revise, validate, export, recover, and revert research artifacts | Produce a candidate manuscript revision, run role-separated validation, approve a new revision, and preserve the source plus every candidate and decision |
| `UX-FLOW-17`–`18` | Configure, govern, reuse, share, or connect research work | Configure, govern, reuse, share, or connect controlled-writing work through the same capability boundaries |

Not every profile enables every domain flow. Use-agnostic means the invariant
mechanics do not assume one domain; it does not make Experiments, Hypotheses,
Papers, or narrative validation mandatory universal modules.

## Complete flow catalogue

### `UX-FLOW-01` — create, open, and resume a Project

- **Goal:** establish the current Project context and decide what needs attention.
- **Entry:** new Project, recent Project, private deep link, search result, or attention notification.
- **Path:** identify Project -> resolve profile, current focus, and snapshot -> load Brief -> show consequence-ordered attention, material change from the visible baseline, the bounded profile-owned current state, relevant Work, and next steps -> choose, defer, or inspect a task.
- **Completion:** the Project author can state the current focus, material change, required decision, supported state and limitation, and next action without opening Petra or another surface.
- **Branches:** no current focus, empty Project, no attention, multiple attention items, stale or partial Brief, offline cache, unsupported profile, missing or unauthorized Project, replaced object, active Work, or unfinished artifact.
- **Authority:** opening, selection, acknowledgment, comparison baseline, disclosure, and layout are presentation state; creating or changing the current focus, resolving attention, applying a change, or cancelling Work uses its typed authority path.
- **Horizon:** M1 orientation; M2 corpus scale; M3 full Hypothesis orientation.

### `UX-FLOW-02` — frame or revise a ResearchQuestion

- **Goal:** turn rough language into a bounded, editable research question without erasing the original wording.
- **Entry:** new Project, no active question, explicit reframe action, or evidence that exposes an ambiguity.
- **Path:** enter rough question -> identify ambiguous constructs, population, task, outcome, and intended decision -> compare proposed interpretations and subquestions -> edit -> preview the typed ResearchQuestion -> apply or retain as draft.
- **Completion:** one active ResearchQuestion has explicit scope, revision, and provenance; unresolved ambiguity remains visible.
- **Branches:** multiple plausible questions, insufficient scope, imported question, revision conflict, or decision to keep exploratory wording.
- **Authority:** a model-produced interpretation remains a non-authoritative
  candidate; the researcher or approved policy applies the exact question
  revision.
- **Horizon:** minimal M1 question context; fuller M3 question and Hypothesis work.

### `UX-FLOW-03` — form, compare, and revise Hypotheses

- **Goal:** represent falsifiable alternatives, assumptions, predictions, confounds, and discriminating evidence.
- **Entry:** question framing, synthesis, unexplained disagreement, experimental result, or direct user creation.
- **Path:** create or select Hypothesis -> define descriptor and scope -> inspect supporting, contradicting, and qualifying evidence -> compare alternatives -> record predictions and assumptions -> propose revision -> inspect impact -> apply, branch, supersede, or defer.
- **Completion:** the Hypothesis is understandable by ordinal and descriptor, and its current development, activity, warrant, lifecycle, standing, and obligations are not conflated.
- **Branches:** seed Hypothesis, competing alternatives, no alternative found,
  search incomplete, model-produced rival, mature Hypothesis with dependents,
  or stale assessment.
- **Authority:** an assistant suggestion is not a Hypothesis transition; material changes use versioned commands and ChangeSets.
- **Horizon:** M3, with fixture-level orientation possible earlier.

### `UX-FLOW-04` — add, reuse, discover, and select sources

- **Goal:** assemble a permitted, profile-valid Project source collection
  without duplicating canonical identity or treating registration,
  recommendation, or discovery metadata as authority.
- **Entry:** known file, identifier, link, supported connector result, existing
  permitted Petra source, provenance path, or a Project basis gap.
- **Path:** submit, discover, or choose existing source -> inspect or resolve
  canonical identity and immutable revision -> inspect exact Artifact,
  integrity, copy-specific rights, and current availability -> choose the
  profile-owned Project role and relevance -> compare duplicate or ambiguous
  candidates -> create or reject the Project source link -> acquire or reuse
  permitted content -> optionally queue bounded processing.
- **Completion:** the candidate is rejected or deferred, or one explicit
  Project source link points to the permitted canonical identity and exact
  revision, or to one exact Artifact in a visibly provisional,
  identity-unresolved state, with its honest content and availability limits.
- **Branches:** exact duplicate; possible match; source already used in another
  Project; ambiguous identity; missing Project role; corrected, replaced,
  withdrawn, or retracted status where profile-defined; identity only; preview
  or abstract only; partial content; unavailable content; rights review;
  disallowed acquisition; offline state; or connector failure.
- **Authority:** source registration and Project linking are typed state
  changes, but neither endorses source meaning. Provider rank, model relevance,
  snippets, and recommendations remain sourced aids rather than evidence or
  governing material.
- **Horizon:** known-source, file, and reuse path in M1; federated discovery and
  larger shared library in M2.

### `UX-FLOW-05` — process and inspect a source

- **Goal:** know exactly which source revision and Artifact Petra could inspect,
  what representations and location precision exist, what processing occurred,
  and where a material passage lives.
- **Entry:** newly linked source, processing Work, Sources collection, Review or
  provenance link, Petra statement, graph relationship, Work result, or
  Composition basis.
- **Path:** inspect profile-resolved source identity and Project role -> inspect
  exact revision and Artifact/copy -> distinguish content extent,
  representations, local availability, rights, and processing -> open the
  original in a supported native reader -> resolve the exact or best honest
  location with surrounding context -> compare original and normalized or
  structured material -> inspect downstream uses -> return to the exact origin.
- **Completion:** the Project author can identify the source identity,
  revision, exact copy, rights boundary, available inspection capabilities,
  processing provenance, location verification, normalization, limitations,
  and downstream use behind the selected object.
- **Branches:** processing queued or running; needs input; partial or failed
  output; unsupported format; corrupt source; bad geometry or unresolved
  selector; missing section; newer revision; rights-limited, preview-only, or
  identity-only access; local copy deleted; offline or remote-only content; or
  ambiguous source identity.
- **Authority:** reading and selection are presentation state. Processing
  creates immutable derived artifacts and proposals through durable Work; it
  does not approve extracted or profile-specific meaning.
- **Horizon:** M1 native PDF and supported structured-text path; M2 queues,
  discovery, and larger collections.

### `UX-FLOW-06` — review source-derived candidates

- **Goal:** decide whether an identified extraction or model run represented
  source material faithfully and in the profile-valid type without rereading
  every ordinary candidate.
- **Entry:** Review, completed source-processing Work, selected exception,
  bounded batch recommendation, source reader, or Petra-mediated review.
- **Path:** orient to candidate or batch and exceptions -> inspect candidate
  meaning, source stance or profile equivalent, scope, origin, validation,
  exact source revision and location, and content limitation -> compare when
  needed -> accept, correct, narrow, split, relink, reject, dispute, or defer as
  the profile permits -> inspect the exact ChangeSet -> apply explicitly.
- **Completion:** every reviewed candidate has an explicit outcome; applied objects retain
  source, Artifact, location, processing, validation, and decision provenance;
  rejected and corrected revisions remain in history.
- **Branches:** ordinary grounded proposal; preview-limited proposal; missing
  scope or governing context; table, figure, or structured-region
  interpretation; ambiguous identity; normalization disagreement; stale source
  revision; unsupported exact inspection; downstream impact; or a conflicted
  member within a batch.
- **Authority:** proposed, validated, reviewed, and applied remain distinct.
  A batch groups independently atomic ChangeSets, and profile validators cannot
  promote their own output.
- **Horizon:** M1 single proposal and exception; M2 calibrated batch review.

### `UX-FLOW-07` — inspect basis and provenance

- **Goal:** understand why a named model or Work role, a source, a validator,
  or an author produced a material statement and whether the exact available
  basis supports its scope, force, and profile meaning.
- **Entry:** Brief statement, Review row, graph relation, Petra sentence,
  SuggestedAction rationale, result or validation interpretation, Work output,
  or Composition span.
- **Path:** select statement or relationship -> open Details -> inspect typed
  identity, scope, origin, authority, source revision, content extent, and
  limitations -> follow each provenance step -> open the exact location,
  structured value, Result, or explicit author judgment -> inspect surrounding
  context and downstream use -> return without losing selection.
- **Completion:** the Project author can distinguish source report, extraction,
  profile-valid inference, result, validation, author judgment, named model or
  Work output, and recommendation and can locate the admissible basis or a precise no-path
  state for each material step.
- **Branches:** no admissible path; identity-only, preview-only, or partial
  content; conflicting passages; indirect reference; superseded assertion or
  source revision; normalized/original disagreement; stale projection;
  inaccessible or deleted local copy; unsupported renderer; or unauthorized
  provenance member.
- **Authority:** read-only inspection and graph traversal never promote,
  migrate, relink, remove, or delete an object.
- **Horizon:** core M1 flow across profiles.

### `UX-FLOW-08` — resolve a disagreement or evidence gap

- **Goal:** decide whether evidence supports, contradicts, qualifies, fails to replicate, or remains incomparable with a Claim or Hypothesis.
- **Entry:** Brief disagreement, evidence relation, graph path, assistant challenge, failed-reproduction result, or user question.
- **Path:** select target -> compare both endpoints, scopes, source stances, methods, and provenance -> inspect current graph answer -> decide whether the basis is sufficient -> directly correct/review the relation or start bounded investigation -> review findings -> apply, reject, qualify, or leave unresolved.
- **Completion:** the relationship decision and its limits are explicit, or the unresolved information need becomes bounded Work.
- **Branches:** comparable contradiction, scope qualification, citation without support, insufficient coverage, conflicting full-text evidence, abstract-only limitation, or no alternative found under the recorded search.
- **Authority:** new literature and model analysis return proposals; they do not settle the relationship automatically.
- **Horizon:** representative design flow now; M1 relation review; M2 search; M3 Hypothesis effect.

### `UX-FLOW-09` — understand standing, alternatives, and the evidence frontier

- **Goal:** decide what is currently warranted, what remains unknown, and which next investigation would be informative.
- **Entry:** Research Brief, Hypothesis Details, completed LandscapeScan, new evidence, or scheduled reassessment.
- **Path:** inspect snapshot and `as_of` basis -> review direct evidence, replication, criticism, method drift, dialogue, corpus freshness, alternatives, and material omissions -> inspect member evidence -> select a useful next action.
- **Completion:** the researcher understands the reasoned profile without reducing it to a universal confidence or currentness score.
- **Branches:** early, developing, mature, disputed, stale, no competitor found,
  incomplete landscape, or only a model-produced rival.
- **Authority:** standing is a derived, snapshot-bound assessment; transitions and obligations require their own commands.
- **Horizon:** M2 landscape coverage and M3 assessments.

### `UX-FLOW-10` — ask Petra about current research state

- **Goal:** obtain a concise, grounded explanation without navigating every source or launching hidden work.
- **Entry:** assistant dock, selected-object action, contextual question, or SuggestedAction explanation.
- **Path:** compose question with explicit selected context -> answer from stable identity, current graph, or valid cache -> distinguish source report, synthesis, inference, uncertainty, and recommendation -> expose evidence paths -> offer a deeper action only when useful.
- **Completion:** the question is answered, abstained from, or converted into a clearly bounded next action.
- **Branches:** ambiguous referent, insufficient evidence, stale snapshot, selected object changed, answer available without a model, cached result, model failure, or prohibited source access.
- **Authority:** assistant text is not trusted graph state.
- **Horizon:** M1 grounded response and provenance fast path.

### `UX-FLOW-11` — preview, start, and manage durable Work

- **Goal:** run useful background work while retaining control of scope, resources, and scientific consequences.
- **Entry:** SuggestedAction, explicit assistant request, direct task action, scheduled preparation, retry, or resume.
- **Path:** inspect objective, target, reason, readiness, depth, expected output, capability, approval, time, and cost -> adjust scope -> start -> observe queued/running activity -> respond to clarification, review, or budget interrupts -> steer, detach, reconnect, resume, or explicitly cancel -> inspect terminal result.
- **Completion:** Work reaches completed, failed, cancelled, or blocked state with recorded inputs, outputs, limitations, resource use, and a useful next action.
- **Branches:** prerequisite missing, low expected yield, stale action, denied capability, budget escalation, partial result, worker failure, model failure, network loss, duplicate delivery, or cancellation race.
- **Authority:** completed Work may create evidence, analysis, artifact, or ChangeSet proposals; only a separate validated command changes trusted state.
- **Horizon:** M1 lifecycle foundation and interaction; M2/M3 proactive research; M4 experiments.

### `UX-FLOW-12` — propose, preview, apply, and reverse a change

- **Goal:** change research state deliberately with inspectable impact and recoverable history.
- **Entry:** direct edit, review decision, assistant-mediated command, policy-eligible promotion, Hypothesis update, or Revert action.
- **Path:** capture intent -> construct typed command -> validate -> preview exact before/after state and downstream impact -> authorize exact revision -> apply atomic PostgreSQL events -> report projection status -> inspect new state -> expose the ten most recent eligible author-visible changes in **Recent changes** -> Revert through a previewed compensating ChangeSet when needed.
- **Completion:** the change is applied, rejected, deferred, conflicted, or reverted without silent partial mutation.
- **Branches:** stale base revision, unauthorized action, invalid command, changed batch manifest, dependency cascade, projection lag/failure, duplicate submission, or failed compensating action.
- **Authority:** Apply is the commit point; browser state and Neo4j are not authority.
- **Horizon:** core M1 review and reversal; broader changes later.

### `UX-FLOW-13` — design, run, and interpret an experiment

- **Goal:** create a discriminating, reproducible test and keep execution, observation, analysis, and scientific interpretation distinct.
- **Entry:** Hypothesis obligation, rival-prediction comparison, reproduction request, or direct Experiment creation.
- **Path:** define Experiment and ProtocolVersion -> specify baselines, controls, measures, criteria, stopping rules, and reproducibility obligations -> approve immutable ExecutionPlan -> run under capability -> monitor -> inspect Result and failures -> perform Analysis -> evaluate criteria -> propose interpretation or Hypothesis update -> reproduce or investigate root cause.
- **Completion:** the run and its scientific meaning are separately recorded, with enough identity to reproduce or explain failure.
- **Branches:** exploratory versus confirmatory profile, plan revision, capability denial, execution failure, invalid result, unexpected result, root-cause investigation, reproduction type, or partial compute budget.
- **Authority:** a failed execution is not negative evidence; model interpretation is not a Result.
- **Horizon:** M4.

### `UX-FLOW-14` — request and compose a research artifact

- **Goal:** produce useful writing or another bounded artifact without losing evidence, origin, audience, or scientific force.
- **Entry:** Brief, selected objects, EvidencePacket, assistant request, Draft workspace, or follow-on from completed Work.
- **Path:** state objective, audience, subject, scope, format, and inference policy -> select snapshot -> compile EvidencePacket with contrary evidence and omissions -> inspect or accept CompositionPlan -> generate DraftArtifact -> validate material DraftSpans -> inspect provenance and citations.
- **Completion:** an immutable DraftArtifact revision is grounded, explicitly inferential, researcher-supplied, or visibly unsupported at every material span.
- **Branches:** insufficient evidence, disputed basis, abstract-only support, long-form plan review, model failure, validation failure, or unsupported requested force.
- **Authority:** a DraftArtifact is a research artifact, not an authoritative Claim or published output.
- **Horizon:** M1 first artifact; M2 expansion from observed use.

### `UX-FLOW-15` — revise, revalidate, render, and export an artifact

- **Goal:** improve or reuse an artifact while preserving authorship, revision history, provenance, and citation meaning.
- **Entry:** generated draft, imported draft if later supported, validation warning, changed project snapshot, or requested format.
- **Path:** edit content -> create immutable researcher revision -> identify affected DraftSpans -> mark mappings stale -> revalidate force, evidence, origin, and citations -> compare revisions -> render -> download or copy the selected artifact and provenance report.
- **Completion:** the selected revision and rendered outputs share the same scientific content and canonical citations; failed exports do not destroy the draft.
- **Branches:** edit changes force, citation no longer supports text, evidence was reversed, renderer failure, missing metadata, merge conflict, or deliberate unsupported author statement.
- **Authority:** human edits retain human origin and do not overwrite generated history.
- **Horizon:** M1 first revision and render; later format and integration expansion.

### `UX-FLOW-16` — inspect history and recover from change or failure

- **Goal:** understand what happened, restore useful work, and correct state without erasing evidence of the failure.
- **Entry:** History, stale object, failed Work, dropped stream, changed source, invalidated draft, projection failure, or explicit comparison.
- **Path:** identify event, actor, revision, snapshot, and affected objects -> compare states -> use graph Back/Forward for a non-authoritative exploration mistake, or choose retry, resume, reconnect, regenerate preview, revalidate, branch, or governed Revert for durable state -> confirm recovered authoritative and derived state.
- **Completion:** the researcher can explain the current state and the recovery action; no command, result, or approval is duplicated.
- **Branches:** unavailable prior artifact, corrupt cache, out-of-order interaction event, failed projection rebuild, stale ChangeSet, or dependency cascade.
- **Authority:** the graph retains ten local view snapshots without changing domain state. Recent changes exposes ten eligible changes for quick access, and **Revert change** uses the same typed compensating command and additive event paths as ordinary work; full history is not truncated.
- **Horizon:** M1 hardening and every later module.

### `UX-FLOW-17` — configure presentation, accessibility, governance, and capability

- **Goal:** adapt Petra to the user and task without confusing presentation preferences with domain authority.
- **Entry:** Settings, layout preset, Review mode, policy view, capability prompt, or accessibility need.
- **Path:** distinguish local presentation settings from project governance -> change theme, layout, editor, motion, or panel size immediately -> preview prospective Review mode or policy change -> inspect capabilities and limits -> apply authorized governance change.
- **Completion:** the setting behaves predictably, its scope is clear, and restoration or reversal is available where appropriate.
- **Branches:** preference storage failure, forced colors, text zoom/reflow, reduced motion, unavailable capability, expired grant, mode-policy mismatch, or policy audit stop.
- **Authority:** presentation changes are local; ReviewPolicy and CapabilityGrant changes are versioned server-side operations.
- **Horizon:** presentation in M1; governance expands in M2/M3.

### `UX-FLOW-18` — reuse, share, and connect selected work

- **Goal:** reuse canonical sources across Projects and move selected artifacts into legitimate external workflows without publishing the whole Project.
- **Entry:** source reuse, Project creation, artifact export, future API request, or later MCP action.
- **Path:** resolve actor, Project, object, snapshot, rights, privacy, capability, and destination -> read or request bounded work -> create selected artifact or proposal -> inspect export/share consequence -> execute explicitly -> retain receipt and provenance.
- **Completion:** the intended object is reused or shared without creating a second authority path or leaking unrelated private context.
- **Branches:** insufficient rights, destination failure, stale artifact, external authentication failure, unsupported adapter capability, or public/private scope mismatch.
- **Authority:** external adapters call the same commands and queries; publication and approval are never implicit.
- **Horizon:** corpus reuse at M2; selected exports in M1/M2; deterministic API and conditional MCP at M6.

## Named end-to-end paths

### `UX-PATH-01` — resolve contradictory evidence around a Hypothesis

```text
Open Project
  -> Brief identifies a material contradiction affecting H12
  -> select H12 and open the disagreement
  -> compare Claims, scopes, source stances, and exact passages
  -> inspect the focused contradiction path if it clarifies the relationship
  -> ask Petra for the current-snapshot explanation
  -> choose:
       sufficient basis -> correct, qualify, accept, reject, or defer the relation
       insufficient basis -> preview and start a bounded literature investigation
  -> monitor, steer, detach, reconnect, or cancel Work
  -> review grounded findings and proposed changes
  -> inspect ChangeSet impact
  -> apply, revise, reject, or defer
  -> observe projection catch-up
  -> return to the updated Brief
  -> optionally compose a snapshot-bound synthesis
```

This is the first integrated design path. It exercises orientation, evidence,
source inspection, graph explanation, assistant interaction, durable Work,
review, authority, projection freshness, and composition without making the
graph or chat the project home.

### `UX-PATH-02` — source to trusted Assertion to grounded answer

```text
Register permitted source
  -> inspect WorkVersion and Artifact
  -> process and locate exact SourceSpan
  -> review supported and unsupported Claim proposals
  -> correct or promote one Assertion through ChangeSet
  -> observe focused projection
  -> ask bounded question
  -> inspect EvidencePacket and grounded response provenance
  -> create DraftArtifact and citation
  -> reverse the Assertion
  -> observe projection and draft invalidation
```

This remains the M1 implementation acceptance path.

### `UX-PATH-03` — rough question to research program

```text
Create Project
  -> preserve rough question
  -> resolve material ambiguity
  -> apply active ResearchQuestion
  -> create competing Hypotheses
  -> build and process corpus
  -> review evidence
  -> inspect standing and frontier
  -> choose literature or experiment work
  -> update without erasing prior states
```

### `UX-PATH-04` — long-form artifact revision

```text
Select Project snapshot and revision objective
  -> identify controlling sources, decisions, and constraints
  -> compile bounded input packet
  -> inspect plan
  -> create candidate revision without changing the source
  -> run role-appropriate validation
  -> inspect findings and dependency impact
  -> revise, reject, or approve exact candidate
  -> promote to a new destination/revision
  -> preserve source, candidate, reviews, and decision history
```

This path describes a general revision problem. It does not decide that
scientific Claims, narrative canon, and manuscript constraints share one domain
schema.

## Entry-point rules

Every entry point resolves into the same loop rather than creating a separate
workflow:

| Entry | Required orientation before action |
| --- | --- |
| Project home | Current focus, profile, snapshot, attention state, material limitation or constraint, and next actions |
| Deep link | Project, view, canonical object and revision, snapshot, and whether the link is stale or unavailable |
| Search, reuse, or discovery result | Candidate status, canonical identity, source revision, exact copy, rights, inspection capabilities, and Project role/relevance |
| Notification or attention item | Why attention is required, affected object, current state, and primary action |
| Selected object | Identity, scope, origin, revision, and task-relevant operations |
| Assistant request | Authorized Project context, selected references, snapshot, and whether the answer uses local, cached, or new work |
| Completed Work | Original objective, exact inputs, terminal outcome, outputs, limits, and review or retry action |
| Draft or output | Artifact revision, snapshot, evidence/provenance state, and unresolved validation warnings |
| Future external adapter | Actor, Project, command/query identity, capability, idempotency, and explicit result object |

## State and recovery coverage

| Condition | What the Project author must understand | Required recovery or next action |
| --- | --- | --- |
| Empty or early Project | What is missing and which framing step is useful | Frame the current objective, add a source, or open an existing Project |
| Current snapshot | Which authoritative revision is being shown | Continue normally |
| Cached derived result | Which snapshot and dependencies produced it | Use, refresh, or start new Work |
| Stale object or result | What changed and which conclusions may no longer hold | Open current revision, compare, or regenerate |
| Projection catching up | The authoritative change committed but this representation is behind | Wait, retry projection, or use an authoritative non-graph view |
| Projection blocked | Which derived views are unsafe and why | Retry/rebuild or continue only with unaffected authoritative views |
| Identity-only, preview-only, or partial source | Which content and exact locations are present, what is missing, and which profile actions Petra cannot support | Acquire deeper content, choose another permitted copy, narrow the task, or remove it from current use |
| Local source copy deleted or unavailable | Which exact reader, locations, and downstream checks no longer resolve while identity and history remain | Reacquire, re-supply, choose another permitted copy, inspect retained metadata, or stop |
| Rights-limited source | What may be stored, displayed, or processed | Use permitted metadata/abstract, provide lawful access, or exclude |
| Parser partial or failed | Which structure and spans are unavailable | Retry, choose another artifact, inspect raw source, or stop |
| Ambiguous identity | Which candidate records conflict and what would merge | Resolve individually or defer; never auto-merge consequential ambiguity |
| Candidate or proposal | What exact content is under review, who or what produced it, and what remains non-authoritative | Review, correct, reject, or defer |
| Change conflict | Which base revision changed | Regenerate and review a new exact preview |
| Work awaiting input | What decision blocks progress and what each response does | Clarify, approve, narrow, reject, or cancel |
| Work failed | What failed, what partial output is safe, and whether authority changed | Retry unchanged input, revise scope, use partial output, or stop |
| Stream disconnected | Work may still be running | Reconnect, replay, detach, or explicitly cancel Work |
| Work cancelled | What stopped and which partial artifacts remain | Inspect retained output or start a new WorkUnit |
| Draft provenance stale | Which edit or graph change invalidated which spans | Revalidate, revise, mark unsupported, or use a prior revision |
| Renderer/export failed | The DraftArtifact remains safe | Retry renderer, choose another format, or download the source revision |
| Offline | Which local state is available and how old it is | Continue read-only where safe, queue permitted local edits, or reconnect |
| Unauthorized or policy-blocked | Which capability is absent and whether it can be requested | Request/narrow capability or choose a permitted path |
| Missing or replaced object | Whether the identity moved, was superseded, or is unavailable | Open replacement/history or return to a stable parent view |

## Accessibility and control requirements for every flow

Every material flow records:

- keyboard entry, action, cancellation, and return paths;
- stable visible focus after route, panel, selection, and streamed updates;
- a textual alternative for graph, timeline, progress, and relation meaning;
- operation without color, hover, drag, fine pointer, or animation;
- behavior at supported text zoom and narrow reflow;
- status announcements that do not repeatedly interrupt reading;
- preservation of unsent text, selection, and active Work when panels collapse;
- a named commit point and a distinct cancellation or reversal action;
- the state preserved when a command, stream, worker, model, projection, or renderer fails.

## Delivery plan by horizon

| Horizon | Flow commitment |
| --- | --- |
| Product-design brief | Complete and accept every flow, surface, state, profile boundary, authority path, recovery route, and accessibility requirement before product or demo fixtures determine the experience |
| Neutral reference UX | Implement all accepted flows against synthetic, contract-shaped conformance scenarios that do not use external demo content or structure |
| M1 / UX1 | Complete the scientific `UX-PATH-02`; implement the M1-relevant portions of flows 01, 04–08, 10–12, and 14–17; exercise `UX-PATH-01` with synthetic provisional Hypothesis data; keep shared shell, Work, review, assistant, provenance, and history components profile-resolved rather than science-hard-coded |
| M2 / UX2 | Scale source discovery, corpus processing, review batches, disagreement work, landscape coverage, and cross-Project reuse |
| M3 / UX3 | Complete question/Hypothesis formation, assessments, obligations, posture, and proactive bounded agency |
| M4 / UX4 | Complete experiment design, execution, analysis, reproduction, and root-cause flows |
| M5 / UX5 | Validate the full loops on the two scientific pilots and revise assumptions from observed use |
| M6 / UX6 | Harden accessibility, operations, privacy, budgets, collaboration boundaries, deterministic API, and conditional external adapters |
| Controlled-writing profile | Specify the domain ontology and terminology; bind the protected-source-to-new-revision path; exercise `UX-PATH-04` first with neutral conformance content; assign delivery only after the applicable Project-profile, lineage, thread-context, and governed-reversal requirements receive architecture and implementation dispositions |

## Demo isolation

The product flow architecture, profile contracts, information hierarchy,
interaction patterns, terminology roles, accessibility behavior, and acceptance
criteria are completed without opening or importing the Prosody or Sentinel
contexts. Scientific research and controlled writing remain required profiles
because the user defined those product categories directly, not because either
demo happens to contain a convenient workflow.

After `UX-DESIGN-FREEZE-01` and the neutral reference UX, separate integrations
may map Prosody and Sentinel into their accepted profiles. Those efforts may
find a general product defect, but they cannot patch corpus-specific names,
paths, objects, workflows, or assumptions into shared components. Any proposed
change must restate the general user failure and pass the ordinary discussion,
contract, and revisit process.

## Accepted scope decisions and remaining definitions

The flow review accepts these directions:

1. **Use-agnostic core:** Petra's Project, Artifact, Work, proposal, review, ChangeSet, provenance, capability, projection, event, and history mechanics do not assume science or controlled writing.
2. **Profile-owned meaning:** scientific research and complex controlled writing use separate typed ontologies and terminology, not aliases over one domain schema.
3. **Invariant controls:** inspect, ask, start Work, interrupt, validate, preview, approve, correct, reject, defer, promote, cancel, and revert keep the same interaction and authority meanings across profiles.
4. **Secondary-panel policy:** one expanded secondary task panel is the default; additional panels require explicit pinning and sufficient space.
5. **Attention ordering:** material consequence, blocked progress, required review, and stale dependent output take precedence over recency; Petra does not manufacture a universal urgency score.
6. **M1 Hypothesis boundary:** M1 may demonstrate provisional, read-oriented Hypothesis context, while lifecycle, standing, alternatives, posture, and obligations remain owned by M3 contracts.
7. **Imported-document boundary:** a permitted existing document may seed an immutable artifact lineage; Petra creates candidate and promoted revisions without overwriting the imported source.

Two semantic definitions and five runtime shapes remain architecture work
rather than open product scope:

- the versioned Project-profile binding and registry shape, including how shared surfaces resolve typed domain objects and vocabulary;
- the controlled-writing ontology, predicates, validators, revision command, and destination policy needed to support protected-source-to-new-revision work without weakening its source-protection rules;
- durable Project threads and exact turn-context binding;
- governed reversal eligibility and compensation planning;
- semantic object location, supersession, and safe route fallback;
- a snapshot-consistent, profile-resolved Project source and exact-inspection
  read model; and
- a Project-source association plus governed Project removal and local-copy
  deletion/retention lifecycle;
- durable, profile-valid, non-authoritative working candidates and graph
  relationships derived from bounded interaction; and
- a snapshot-consistent, profile-neutral Review-session read and command
  composition over existing ChangeSet and Approval authority.

`UX-REQ-004` through `UX-REQ-012` carry the profile, lineage, thread-context,
governed-reversal, semantic-location, source-view, source-lifecycle,
working-candidate, and Review-session needs to the implementation track.
No profile, surface, assistant, worker, graph projection, or external adapter can
silently become the source of trusted state.
