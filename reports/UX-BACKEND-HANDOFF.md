# UX-to-implementation requirements handoff

Status: proposed requests awaiting implementation-track review
Date: 2026-09-07
Source: [Petra user-flow architecture](UX-FLOW-ARCHITECTURE.md)
Design-freeze source: [Petra UX design brief](PETRA-UX-DESIGN-BRIEF.md)

## Purpose

This register informs the implementation track when an accepted UX direction
requires a query, command, event, policy, persistence rule, or runtime-owned
view model. It does not edit implementation-owned contracts or change milestone
scope by implication.

Product contracts and backend dispositions are derived from the accepted Petra
brief and neutral conformance scenarios. Prosody and Sentinel are later
integration contexts; their paths, names, file structures, workflow labels,
and incidental data shapes must not enter shared contracts.

Fixture references in this register describe synthetic scenarios to implement
after `UX-DESIGN-FREEZE-01`. They document why a contract is needed; they do not
authorize reference-UX or demo implementation during product-brief work.

## Immediate coordination notice

The implementation track may continue already accepted backend work. It should
not add a demo adapter, corpus path, profile-specific shortcut,
imported-document promotion behavior, or new shared schema from the future demo contexts
while the product brief is open. It should review `UX-REQ-004` through
`UX-REQ-023` as general architecture needs and return a disposition without
using either contextual project as the contract fixture. `UX-REQ-006` through
`UX-REQ-023` follow the accepted Petra interaction, navigation, Sources,
Review, Graph, Work, Project-inquiry, Composition, Settings, language-system,
accessibility, recovery, and product-blueprint directions.
These requests do not authorize a frontend implementation before the
design freeze.

## Accepted UX changes with no backend semantic impact

- The Project's profile-specific Brief is the default Project surface.
- The shell is task-first: four coordinated responsibilities do not mean four simultaneously expanded panels.
- Details opens from a real selection; the Petra assistant opens from an explicit request, recommendation, active Work, or interrupt.
- Agent activity is subordinate to a Work task. It is not a product module or a second Project identity.
- The graph opens for a named relationship, provenance, comparison, dependency, or temporal task.
- Panel visibility, size, pinning, layout preset, theme, editor preferences, and unsent local composition remain presentation state.

These decisions change frontend hierarchy and view models but do not require a
second authority, persistence, or mutation lifecycle. The Project-profile
binding that supplies their domain meaning is a separate requirement below.

## Existing request

### `UX-REQ-001` — snapshot-consistent `ProjectShellView`

- **Origin:** `UX1.1-W01`, `W02`, `W06`, `W07`, and `W11`; fixture `UX1.1-FX01`.
- **Implementation link:** `M1.7`, consuming Project, WorkUnit, review, and projection contracts.
- **Need:** orient any primary route to Project, Project profile, current objective, authoritative revision, projection freshness, attention Work, and optional selected object. The scientific profile resolves the current objective to the active ResearchQuestion.
- **Status:** `proposed`; the full record remains in `design_implementation_roadmap.md` under `UX1.1`.

The task-first decision does not supersede this request. It makes the distinction
between shell context and task content more important.

## New requests

### `UX-REQ-002` — task-oriented, profile-resolved `ProjectBriefView`

- **Originating design work:** accepted `DB07` and `UX1.2-DISC01`;
  `UX1.2-W01`–`W12`, `UX1.8-W02`; `UX-FLOW-01`, `UX-FLOW-08`, and
  `UX-PATH-01`.
- **Named fixture need:** `UX-FX20`, paired synthetic profile-resolved Briefs
  with current focus, one material tension or constraint, one basis limitation,
  one attention-requiring decision, one active or newly completed WorkUnit, and
  a visible comparison baseline. Neither fixture derives from contextual demo
  material.
- **Implementation links:** `M1.6`, `M1.7-W02`, `M2-W08`, and later `M3-W01`–`W04`.
- **Project-author task and failure:** open a Project and identify the current objective, material uncertainty or constraint, basis limitations, attention state, and useful next action without opening chat. Without a snapshot-consistent Brief read model, the client would calculate priority from unrelated counts, duplicate query logic, hard-code scientific meaning into the shared shell, or present fixture-authored conclusions as runtime facts.
- **Requested read behavior:** return a snapshot-bound base view plus one registered profile payload. The base contains:
  - Project, Project-profile, and current-objective references and revisions;
  - authoritative snapshot and projection freshness;
  - a bounded orientation summary whose material statements carry basis references;
  - ordered semantic sections for current focus, attention, change comparison,
    current state, relevant Work, next steps, and recent decisions;
  - one expanded attention item plus a compact remainder ordered by material
    consequence class and an exposed human-readable reason, without a universal
    score;
  - focus-relevant active, blocked, awaiting-input, failed, and newly completed
    Work summaries;
  - an optional explicit comparison baseline and a typed, basis-linked summary
    of material changes between it and the current authoritative snapshot;
  - recent consequential decision references plus routes to full History and
    governed Revert; and
  - zero or more versioned `SuggestedActionView` references rather than client-generated recommendations.
- **Profile payloads:** the scientific `ResearchBriefView` payload adds applicable live Hypothesis summaries, evidence-frontier summaries with typed relation and source capability or limitation counts, and material disagreement, source limitation, omission, and stale-state summaries with member-query or basis references. A controlled-writing payload will instead carry the accepted revision objective, governing constraint summaries, validation findings, dependency conflicts, and candidate-revision state once its domain contracts exist.
- **Attention item minimum:** stable item identity, profile-valid kind,
  consequence class, ordering rationale, affected object references, reason,
  current state, source snapshot, primary action reference, deferral behavior,
  acknowledgment state, and underlying resolution state. The read model must
  not invent a universal health, urgency, confidence, truth, maturity, quality,
  or currentness score.
- **Comparison behavior:** accept an optional authoritative baseline reference
  and return exact endpoints, authoritative changes, relevant Work outcomes,
  projection catch-up, affected dependents, limitations, and member or basis
  references. An unavailable baseline fails explicitly. An unchanged result
  cannot imply that the Project is correct, complete, or healthy.
- **Authority and persistence:** read-only derived projection. Every summary,
  count, conflict, comparison, and action basis names its authoritative records
  and source revision. Attention state derives from review, Work, artifact,
  profile-domain, and conflict records. Client-owned acknowledgment, deferral
  display, comparison baseline, and disclosure state cannot resolve the
  underlying condition or change domain authority.
- **Smallest viable M1 response:** one registered scientific profile payload
  containing the active ResearchQuestion, snapshot, bounded synthesis over the
  existing evidence-spine objects, one source limitation, one review attention
  item, a visible comparison baseline, relevant Work summaries, recent decision
  reference, and one action reference. Full Hypothesis development, standing,
  alternatives, and obligations remain M3. The shared base and shell must not
  require a later rewrite to admit the typed controlled-writing payload.
- **Owner and status:** implementation track; `proposed`.

### `UX-REQ-003` — versioned SuggestedAction preview and invocation boundary

- **Originating design work:** `UX1.2-W09`, `UX1.6-W01`, `W05`–`W11`, and `W14`; `UX-FLOW-08`, `UX-FLOW-10`, `UX-FLOW-11`, and `UX-PATH-01`.
- **Named fixture need:** `UX-FX14`, a contradiction investigation that can answer from current graph state, offer bounded new literature work, reach an input or budget interrupt, detach, reconnect, cancel, and return a reviewable result.
- **Implementation links:** `M1.6-W13`–`W18`, `M1.7-W09`–`W12`, `M2-W04`–`W05`, and `M3-W06`.
- **Researcher task and failure:** understand what an action will do and why before starting it, then operate the resulting durable Work without confusing a stream or assistant turn with the WorkUnit. Without a runtime-owned action contract, buttons would hide arbitrary prompt text, readiness would be calculated in the browser, and direct versus conversational starts could diverge.
- **Requested read shape:** a revisioned `SuggestedActionView` containing:
  - stable action identity and revision;
  - Project, Project profile, snapshot, target object references, and profile-valid objective;
  - user-facing reason and inspectable basis references;
  - closed readiness state with reason and missing prerequisites;
  - allowed execution depths and one recommended depth;
  - expected result or artifact kind;
  - measured or estimated duration and cost with basis and update state when available;
  - applicable capability, grant status, approval or interrupt expectation, and cancellation consequence;
  - preparatory or already active WorkUnit reference;
  - typed invocation identity and version.
- **Requested command behavior:** preview and start the exact action revision against the exact target snapshot and chosen depth with idempotency. Direct controls and assistant mediation invoke the same command. A stale action or changed target returns a typed regeneration path rather than silently starting different work.
- **Lifecycle behavior:** the invocation creates or resolves to one durable WorkUnit and one PetraInteractionRun where conversation or streaming is used. Stopping delivery, detaching, reconnecting, replaying, steering, responding to an interrupt, and cancelling Work remain distinct and idempotent.
- **Result behavior:** completed Work returns typed Artifact, profile packet, analysis, candidate revision, or ChangeSet proposal references plus limitations and terminal state. Completion cannot apply domain authority automatically unless an already accepted ReviewPolicy separately authorizes the exact eligible change.
- **Authority and persistence:** action readiness, capability, budget, Work identity, interrupts, and terminal outcomes are server-owned. The client may hold unsent parameter edits and panel state only.
- **Smallest viable M1 response:** one current-graph action that requires no Work and one bounded action that starts an existing WorkUnit-compatible operation, with explicit stream abort, reconnect, and cancellation behavior. External discovery and LandscapeScan semantics remain M2/M3.
- **Owner and status:** implementation track; `proposed`.

### `UX-REQ-004` — versioned Project profile and domain-semantic boundary

- **Originating design work:** accepted `UX1.0-DISC05`, DB14's accepted
  `UX1.0-DISC07`, and DB15's accepted `UX1.0-DISC08`; use-agnostic kernel
  section of `UX-FLOW-ARCHITECTURE.md`; `DB14-P05`, `DB14-P06`, `DB14-P11`,
  `DB15-P01`, `DB15-P10`, `UX-PATH-02`, and `UX-PATH-04`.
- **Named fixture need:** `UX-FX15`, paired synthetic scientific-research and
  controlled-writing Projects that expose the same kernel while resolving
  different typed domain meaning; `UX-FX34`, those profiles plus at least one
  unrelated invented taxonomy exercising shared visual grammar and bounded
  profile object/relation encodings; and `UX-FX35`, forced-color, missing,
  colliding, and replaced-encoding recovery. The named profiles are minimum
  conformance examples rather than an exhaustive registry. No fixture is derived
  from a future demo corpus.
- **Implementation links:** accepted `M1.1-W02` and `M1.1-W13`; `M1.2-W01`; `M1.7-W01`–`W12`; later controlled-writing domain contracts. The existing `petra.project@1.0.0` schema must not be edited in place.
- **Project-author task and failure:** open a Project under any admitted profile,
  including but not limited to scientific research or complex controlled writing,
  and see the right concepts, relationships, validation tools, and language
  without entering a different product or losing Petra's controls. Without a
  server-owned profile boundary, shared components will hard-code one taxonomy,
  clients will invent semantic aliases, or unrelated domain meaning will be
  stored under false object types.
- **Requested contract behavior:** every Project resolves one immutable, versioned profile binding and one registered profile manifest. The manifest names:
  - stable profile identity and version;
  - registered domain schema, object-kind, relationship, command, event, validator, and output references;
  - registered model-context, prompt, tool, and role references applicable to the profile;
  - semantic surface roles and their user-facing terminology;
  - versioned terminology and discourse entries: semantic owner, primary and
    allowed grammatical forms, definition, pronunciation guidance where needed,
    reference grammar, relation/force terms, prohibited conflations, discourse
    conventions, locale coverage, replacement/deprecation, and exact fallback;
  - optional bounded semantic presentation descriptors for registered object and
    relation kinds: semantic key, generic family, approved glyph, finite
    line/shape pattern, optional profile-semantic tone role, exact text
    alternative, legend order, and compatibility/replacement behavior;
  - supported task families, views, and profile tools;
  - the profile-specific Brief payload schema;
  - compatibility, replacement, and unsupported-version behavior.
- **Shared-kernel rule:** Project, Artifact, source revision, WorkUnit, candidate/proposal, ChangeSet, review/approval, capability, provenance, projection, event, interaction, cancellation, promotion, and history mechanics retain the same authority meanings. A profile adds typed domain meaning; it cannot inject executable client code, create a second command envelope, or bypass policy and approval.
- **Profile-admission rule:** admission is based on semantic and functional
  compatibility, not a discipline allowlist. A profile defines its versioned
  objectives, object/relation schemas, governing basis or sources, validators,
  tools, task families, outputs, terminology, and supported places; maps every
  applicable operation back to the shared Work, proposal/Review, approval,
  provenance, revision, recovery, and History contracts; and declares omitted
  flows and compatibility behavior. A profile that requires different permission,
  approval, provenance, cancellation, or history meaning needs an architecture
  change rather than a manifest alias.
- **Presentation-descriptor rule:** Petra owns themes, tokens, components,
  selection/focus, action, proposal/review, warning, approval, error, density,
  layout, motion, accessibility, and fallback rendering. A profile descriptor
  cannot supply CSS, layout coordinates, raw colors, animation, arbitrary or
  remote assets, executable markup, shared-state renames, or control/authority
  overrides. The client maps registered references to an audited Petra glyph,
  pattern, shape, and tone-role registry. Missing, unknown, colliding, replaced,
  or unsupported references fall back to the exact profile label and generic
  family without hiding the object or failing the Project. Historical meaning
  retains its applicable profile/descriptor version.
- **Model-adaptation rule:** every material assistant interaction and Work input binds the Project profile and applicable schema, terminology/prompt, tool, role, and validator revisions. The model gateway may route a provider according to D007, but returned objects must validate against the active profile before entering its ordinary proposal and review path. Profile selection cannot grant a capability, broaden tool access, or authorize an output.
- **Authority and persistence:** the profile binding is authoritative Project state, not a theme or local setting. Creation and any permitted migration use typed, idempotent commands and additive events. Reads fail closed for unknown or unsupported profiles. Profile and terminology versions are retained on material outputs and decisions where interpretation depends on them.
- **Smallest viable response:** preserve `petra.project@1.0.0`; propose either an additive versioned profile-binding record or a new compatible Project schema version; register the scientific profile; expose its reference through shell and Brief views; define the contract extension point against which the controlled-writing fixture can be built pending its ontology; and return exact terminology plus generic-family fallback before specialized glyph/pattern references. Do not claim controlled-writing integration from a vocabulary-only or decorative-style manifest.
- **Decision dependency:** the accepted decisions and implementation roadmap currently describe a scientific research workbench. This UX direction requires an explicit architecture amendment or new decision before backend contracts change.
- **Owner and status:** product architecture and implementation track; UX requirement accepted, runtime shape `proposed`.

### `UX-REQ-005` — immutable existing-document lineage and new-revision promotion

- **Originating design work:** accepted imported-document boundary in `UX-FLOW-ARCHITECTURE.md`; `UX-FLOW-14`–`16`; `UX-PATH-04`.
- **Named fixture need:** `UX-FX16`, a synthetic registered source document at revision R3, one or more candidate revisions, role-separated validation findings, an author decision, and exact promotion to R4 while R3 and rejected candidates remain unchanged.
- **Implementation links:** `M1.2-W03`, `M1.8`, D012 composition contracts, and the later controlled-writing profile.
- **Project-author task and failure:** bring an existing governed document under Petra, revise it through bounded Work and review, and promote an exact new revision without overwriting or ambiguously reclassifying the source. Without an explicit lineage root, imported text may be treated as model-generated draft content, edits may lose ancestry, or “approve” may overwrite the only canonical source.
- **Requested command and record behavior:** register a permitted existing Artifact and ArtifactManifest as an immutable lineage root with import origin, content hash, rights decision, profile, and exact parent revision; create candidate DraftArtifact or profile-specific revision records that name that root and every parent; attach validation and provenance to exact candidate revisions; and promote only an approved exact candidate to a new destination revision through an idempotent command.
- **Authority and persistence:** import does not imply endorsement of extracted domain statements. Candidate creation does not mutate the source. Promotion records actor, command, approval, profile and validator versions, source and candidate hashes, destination identity, and additive events. Rejected candidates and failed validations remain inspectable.
- **Smallest viable response:** confirm whether existing Artifact, ArtifactManifest, DraftArtifact, and provenance contracts can represent an imported immutable parent without semantic ambiguity. If not, specify the smallest additive origin/lineage contract and defer the profile-specific promotion command to a named milestone.
- **Decision dependency:** D012 does not currently define imported-document ancestry or controlled-writing promotion. It requires an explicit architecture disposition before implementation.
- **Owner and status:** product architecture and implementation track; UX requirement accepted, runtime shape `proposed`.

### `UX-REQ-006` — durable Project threads and exact per-turn context

- **Originating design work:** accepted `DB06`, `UX1.6-DISC01`, and DB16's
  `UX1.0-DISC09`; `UX-FLOW-10`, `UX-FLOW-11`, and `UX-FLOW-16`.
- **Named fixture need:** `UX-FX17`, a synthetic Project thread that answers
  from a bounded current basis, links one WorkUnit and proposal, survives
  collapse and reconnect, becomes stale after an unrelated Project change, and
  branches through each permitted snapshot choice. It contains no contextual
  demo material.
- **Implementation links:** `M1.1` interaction records, `M1.6` context and
  retrieval, and `M1.7` assistant integration.
- **Project-author task and failure:** resume a meaningful Petra task and know
  which Project, profile, objective, snapshot, objects, omissions, Work,
  proposals, and decisions each turn used. A protocol thread ID correlates
  transport events but does not by itself supply a durable product thread,
  user-facing lineage, search result, or exact context boundary.
- **Requested read shape:** a versioned `ProjectThreadView` with stable thread
  identity, Project and profile references, task/objective link, title,
  snapshot lineage, branch parent, linked object and artifact references,
  material turn summaries, context-packet references, WorkUnit and
  interaction-run references, proposal and decision references, compaction markers, and
  attention state. Each material turn exposes its exact input identity,
  snapshot, included and excluded context, coverage or omission status,
  capability/privacy/budget/review-policy boundary, applicable profile control
  revisions, response status, created outputs, and any exact non-authoritative
  presentation-context reference used to explain the author's current view.
- **Requested command behavior:** create a task-linked thread, append one turn
  against its exact context, branch from a named turn, and resolve stale-thread
  continuation as **Continue from original snapshot**, **Compare with current**,
  or **Start a thread from current state**. Commands are idempotent and cannot
  silently substitute the current route selection or a newer snapshot.
- **Retention and deletion behavior:** deleting or hiding conversation content
  cannot delete WorkUnits, interaction runs required for audit, artifacts,
  proposals, approvals, applied changes, or domain events. The product needs an
  explicit retention/redaction disposition rather than inheriting a provider's
  transcript semantics.
- **Authority and persistence:** threads organize interaction history and
  references; they are not the domain ledger. `ContextPacket`, WorkUnit,
  `ChangeSet`, approval, and event records retain their existing authority.
  Unsent composer text and panel state remain client-owned.
- **Smallest viable response:** confirm whether an existing record can supply
  this product thread without overloading `PetraInteractionRun`. If not, define
  the smallest additive thread/turn view and command boundary while retaining
  the existing run schema and opaque protocol correlation.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, runtime shape `proposed`.

### `UX-REQ-007` — presentation history, Project History, and governed reversal

- **Originating design work:** accepted `DB06`, `UX1.6-DISC01`, DB17, and
  `UX1.0-DISC10`; `UX1.4-W05`, `UX1.4-W11`, `UX1.5`, `UX1.6-W15`,
  `DB17-P11`–`P12`, `UX-FLOW-12`, and `UX-FLOW-16`.
- **Named fixture need:** `UX-FX18`, a synthetic Project with more than ten
  applied changes, an independent ten-state graph exploration trail, one safe
  single-step reversal, one contiguous multi-step compensation preview, one
  dependency-conflicted change, and one ineligible change. `UX-FX43` adds
  object/task/Project causal episodes, recovery relationships, restricted
  members, terminology change, ambiguous cross-system order, and exact return.
  Both use synthetic content and no contextual demo material.
- **Implementation links:** `M1.3` graph projection, `M1.5` commands,
  ChangeSets, approvals, events, and projection status, and `M1.7` workbench
  integration.
- **Project-author task and failure:** back out of an unhelpful graph exploration,
  understand the causal Project record, or reverse a wrong Project path without
  believing that navigation mutates authority, that History is one editable log,
  or that Revert erases an earlier decision. Existing events and receipts retain
  exact facts but do not yet establish the complete authorized History,
  reversal-planning, eligibility, filtering, and return boundary required by
  this UX.
- **Graph-view behavior:** the client owns the ten most recent meaningful view
  snapshots for task scope, depth, expansion, filters, layout, viewport,
  temporal position, and selection. **Back in graph** and **Forward in graph**
  restore those snapshots without issuing a domain command. Cytoscape and
  Reagraph render controlled state; neither owns Project history.
- **Requested read shape:** return the ten most recent eligible author-visible
  Project changes in **Recent changes**, ordered newest first, with stable command,
  actor, time, target, summary, current eligibility, ineligibility reason,
  dependency-impact summary, and full-history link. Also compose the complete
  permitted History route as readable causal episodes grouped by object/task and
  action/recovery chain. Each entry supplies exact identity/revision/snapshot,
  profile/event family, actor/origin, recorded time and verified ordering,
  requested and observed effect, authority boundary, related Work/candidate/
  approval/command/receipt/output/delivery/projection references, supersession or
  compensation links, current eligibility, and semantic destination. Filters and
  counts cannot reveal unauthorized members. When no verified total order exists
  across record families, preserve causation and source order without inventing
  precision. Ten limits the quick window, not authoritative retention.
- **Requested preview and command behavior:** preview a compensating
  `ChangeSet` for one eligible change or an ordered compensation plan for a
  contiguous recent set. Bind the plan to the exact current authoritative
  snapshot, original commands, target revisions, dependency analysis, policy,
  content hashes, and projected graph difference. State every removal,
  restoration, cascade, invalidation, and irreversible consequence. Apply only
  the exact validated plan through an idempotent typed command. If any step is
  stale, ineligible, unauthorized, or conflicted, fail closed and return a safe
  split, refresh, branch, or manual-correction path.
- **History rule:** reversal appends a new command, approval where required,
  compensating events, provenance, and projection status. It never deletes or
  edits the original event. Redo is a newly previewed forward `ChangeSet`, not a
  hidden restoration of prior state. Retry, resume, branch, restoration,
  revalidation, redelivery, conflict, restriction/redaction, and recovery expose
  their exact relationships where durable records exist. Historical profile
  language remains interpretable without rewriting the recorded meaning.
  Immutable source revisions remain immutable.
- **Projection behavior:** graph and textual views may compare the current and
  proposed compensated states, but PostgreSQL command/event authority decides
  eligibility and result. A historical graph is marked as historical and has a
  visible **Return to current** path.
- **Privacy and return behavior:** authorize every History read at request time;
  restricted entries disclose no hidden name, count, value, relation, or prior
  permission. Resolve selected current/historical objects through `UX-REQ-008`.
  Historical presentations remain read-only and retain a visible **Return to
  current** path with an explicit fallback if the target changed or is unavailable.
- **Smallest viable response:** identify whether the planned M1.5 Revert path
  already supplies single-step eligibility, impact preview, compensation, and
  idempotency, then compose one authorized object/task episode and the recent-ten
  Project window from existing immutable records. Record additive query/command/
  event work needed for gaps; broader filters and multi-step compensation may be
  assigned to named milestones if the first read remains extensible and does not
  misrepresent incomplete History.
- **Owner and status:** product architecture and implementation track; UX
  History/reversal direction accepted, runtime shape `proposed`.

### `UX-REQ-008` — semantic object location and safe deep-link resolution

- **Originating design work:** accepted `DB04`, `DB05`, `UX1.1-DISC05`, and
  `UX1.8-DISC01`; every flow that enters through a selected object, deep link,
  replacement, History event, or cross-surface return.
- **Named fixture need:** `UX-FX19`, a synthetic route-resolution set containing
  a current object, exact historical revision, superseded object with permitted
  replacement, missing object, unauthorized object, unsupported profile,
  malformed link, and valid profile-tool destination. It contains opaque IDs
  and no contextual demo material.
- **Implementation links:** `M1.1` stable identities and profile binding,
  `M1.7` workbench integration, and later profile-domain contracts.
- **Project-author task and failure:** open a selected object or deep link and
  reach the place that can perform the intended task while retaining exact
  revision and snapshot meaning. Without a runtime-owned semantic resolver,
  the browser would hard-code scientific object kinds, guess replacements,
  leak existence through error handling, or redirect a stale identity to a
  different current object silently.
- **Requested query behavior:** accept actor context, Project identity, a typed
  opaque object or reference identity, optional exact revision and snapshot,
  and task intent. Return a versioned location view containing:
  - permitted Project and profile references;
  - resolved object identity, revision, descriptor, and current, historical,
    superseded, missing, unauthorized, or unsupported state;
  - one registered semantic destination role such as Brief, Sources, Review,
    Graph, Work, Composition, History, or a named profile tool, plus permitted
    alternate roles where the task supports them;
  - current replacement or supersession chain and a stable parent or Brief
    fallback where disclosure is permitted;
  - authoritative snapshot and separate projection state needed to interpret
    the destination; and
  - whether Details or Petra context may open for the exact target.
- **Privacy and failure behavior:** unauthorized resolution discloses no object
  descriptor, type, replacement, Project membership, or existence beyond what
  the actor may know. Unknown profile versions and unregistered destination
  roles fail closed. Malformed input never falls back to ambient selection.
- **Client boundary:** the server returns semantic place roles and identity
  state, not React component names, layout, browser history, or raw URL strings.
  The client maps registered roles to routes and owns origin, return focus,
  scroll, panel, disclosure, unsent input, and graph-view history.
- **Authority and persistence:** resolution is read-only. Opening a destination,
  following a replacement, or changing selection does not update domain state.
  Supersession and replacement meaning comes from authoritative records.
- **Smallest viable response:** determine whether existing per-object queries
  plus the proposed Project-profile manifest can supply one adapter-neutral
  location result for the M1 source, Assertion, ChangeSet, WorkUnit, and
  DraftArtifact identities. If not, add the smallest resolver view while
  preserving extensibility for registered profile object kinds.
- **Decision dependency:** the semantic destination registry depends on the
  Project-profile disposition in `UX-REQ-004`; it must not be implemented as a
  science-only switch statement presented as a shared resolver.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, runtime shape `proposed`.

### `UX-REQ-009` — profile-resolved `ProjectSourceView` and exact inspection

- **Originating design work:** accepted `DB08` and `UX1.3-DISC01`;
  `UX1.3-W01`–`W12`, `W15`; `UX-FLOW-04`–`07`, `UX-FLOW-10`,
  `UX-FLOW-14`–`16`, and `UX-FLOW-18`.
- **Named fixture need:** `UX-FX21`, paired synthetic scientific and
  controlled-writing source collections and readers. They use the same source
  role, immutable revision, rights, capability, exact-location, context,
  provenance, navigation, and accessibility grammar while resolving different
  typed profile identities and downstream uses. They contain no contextual
  demo material.
- **Implementation links:** `M1.2` source and Artifact spine, `M1.4` parsed
  document and exact selectors, `M1.7` workbench integration, and later
  profile-domain contracts.
- **Project-author task and failure:** identify why a source belongs to the
  Project, open the exact revision and copy Petra used, understand what is
  available and permitted, inspect an exact passage in context, and trace every
  downstream use. Without a composed read boundary, the client would join
  profile identity, Artifact manifests, rights, parser records, Work state,
  selectors, and domain dependents; it would likely collapse processing into
  availability, infer exactness, or expose a source from another Project.
- **Requested collection and detail read behavior:** accept actor context,
  Project, Project profile, authoritative snapshot, optional source identity or
  revision, and bounded query, sort, and filter inputs. Return a versioned,
  snapshot-consistent `ProjectSourceView` or collection member containing:
  - stable Project-source-link identity and state, profile-owned source role,
    relevance basis, and attention or limitation summary;
  - one registered profile-resolved canonical source identity and immutable
    source-revision reference, descriptor, source class, and applicable
    version, correction, or replacement status;
  - permitted Artifact and manifest combinations with content hash, media
    type, acquisition and integrity summary, local or remote availability, and
    the exact selected or preferred copy without hiding alternatives;
  - the applicable copy-specific rights decision and separate operation
    eligibility for viewing, retaining, processing, indexing, remote selected
    material, quotation, export, and redistribution;
  - independent content extent, available representation set, location
    precision, and durable processing or Work state with limitations;
  - exact and historical downstream-use summaries grouped by direct basis,
    extraction, inference, judgment, citation, validation, composition, and
    profile-owned kinds, with member references and affected snapshots;
  - newer or superseding revision availability plus current and historical
    dependent impact without automatic adoption; and
  - registered actions and destinations rather than client-invented readiness.
- **Requested exact-inspection behavior:** resolve an authorized exact-location
  reference against one immutable Artifact under one applicable manifest and
  rights decision, then return the supported original rendering target,
  source-native navigation and surrounding-context boundary, selector
  components and verification state, permitted quote or region,
  normalized or structured representations with parser and normalization
  identity, material transformation diff, downstream uses, and return-origin
  context. If no native reader or exact resolution is available, return a typed
  structural, visual-only, unresolved, invalidated, external-only, or
  unavailable result; never synthesize source text or silently substitute
  another revision or copy.
- **Capability rule:** content extent, representations, location precision,
  availability, rights, and processing are independent dimensions. The
  scientific profile may resolve preview as **Abstract only** and apply its
  restrictions, but the shared response cannot make `abstract_only` a universal
  source type or client-calculated badge.
- **Privacy and authorization:** collection reuse, downstream-use membership,
  descriptors, locations, and content are filtered to the actor and Project.
  Unauthorized lookup discloses no cross-Project membership or object
  existence. Petra context receives only the explicitly selected permitted
  source, revision, copy, location, surrounding range, and representation.
- **Authority and persistence:** the view is read-only. It composes existing
  authoritative profile, identity, Artifact, rights, Work, parse, selector,
  proposal, decision, and provenance records without changing their ownership.
  Reading, selection, sorting, filtering, and opening a location are
  presentation state.
- **Smallest viable response:** compose the accepted scientific `Work`,
  `WorkVersion`, Artifact and manifest, `RightsDecision`, processing Work,
  `ParsedDocument`, and `SourceSpan` records into one authorized M1 view while
  exposing registered profile roles for later source identities. Include an
  explicit capability matrix and no-path exact-inspection results. Do not
  change existing immutable source contracts to make the view convenient.
- **Decision dependency:** profile-resolved identity and downstream object
  kinds depend on `UX-REQ-004`; safe destinations depend on `UX-REQ-008`.
  D003 and D004 remain authoritative for scholarly identity, copy-specific
  rights, immutable parsing, and exact selectors.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, runtime shape `proposed`.

### `UX-REQ-010` — Project-source association and governed local-copy lifecycle

- **Originating design work:** accepted `DB08` and `UX1.3-DISC01`;
  `UX1.3-W01`–`W04`, `W09`, `W10`, `W12`–`W15`; `UX-FLOW-04`,
  `UX-FLOW-05`, `UX-FLOW-16`, and `UX-FLOW-18`.
- **Named fixture need:** `UX-FX22`, a synthetic source lifecycle with reuse,
  duplicate and ambiguous identity, limited and failed inspection, one newer
  revision with affected dependents, Project removal, an eligible local-copy
  deletion with receipt, a retention-blocked deletion, and reacquisition or
  re-supply recovery. It contains no contextual demo material.
- **Implementation links:** `M1.2` Project and Artifact persistence, `M1.5`
  typed commands and additive events, `M1.7` workbench integration, and a
  required retention-policy disposition.
- **Project-author task and failure:** reuse a canonical source in a Project,
  change or remove its Project role, or deliberately remove exact local bytes
  while preserving every historical fact that must remain. No current contract
  found in the design audit represents Project-source membership, and the
  current Artifact manifest exposes only available local storage. Without an
  explicit lifecycle, deleting a row could orphan provenance, delete bytes
  shared with another Project, or imply that history was erased.
- **Requested association behavior:** define the smallest additive, versioned
  `ProjectSourceLink` or equivalent that binds one Project and profile to one
  canonical source identity and exact selected revision or, while identity
  resolution is pending, to one exact Artifact in an explicit provisional
  state. It names the profile-owned role and relevance basis, records permitted
  preferred Artifact and applicable manifest selection without owning either,
  and retains
  creation, replacement, removal, actor, command, snapshot, and history
  references. Linking an already registered source reuses its permitted
  identity and bytes; it does not clone them or broaden rights. Operations that
  require resolved identity or revision fail closed for a provisional link.
- **Requested link commands:** preview and idempotently create, revise the role
  of, replace the selected revision for, or remove the exact Project source
  link. Every preview names current authoritative and historical dependents,
  affected actions and outputs, profile or admissibility rules, and the
  resulting Project state. Removal prevents ordinary new use under that link
  but cannot delete canonical identity, revisions, Artifacts, exact locations,
  decisions, or provenance. Eligible restoration uses the ordinary
  compensating **Revert change** path or an explicit re-link command.
- **Requested local-copy behavior:** preview and idempotently delete one exact
  local Artifact copy only after checking actor capability, copy-specific
  rights, storage identity, all Project and audit dependencies, active Work,
  retention policy, and reacquisition or re-supply availability. A shared
  content-addressed object is not physically removed while a protected
  permitted reference still requires it. The result records retained identity,
  content hash, manifest or tombstone, rights history, selectors and their new
  resolution state, actor, policy, time, reason, affected representations, and
  an explicit receipt or typed failure.
- **Destructive-action rule:** local-copy deletion is not Project **Revert** or
  editor undo. It can make exact reading and downstream revalidation
  unavailable and may be locally irreversible. The preview must state that
  consequence and any reacquisition, re-supply, or permanent no-path state. It
  never deletes the domain event history needed to explain prior decisions.
- **Authority and persistence:** Project linking and removal are governed
  Project state and use the accepted command, ChangeSet, approval where
  required, event, and history model. Local-copy deletion is a separately
  authorized storage and retention command with an additive audit result.
  Neither operation is inferred from UI visibility, filesystem absence, or a
  provider-side deletion.
- **Smallest viable response:** add one Project-source association and its
  link/remove commands, plus an explicit Artifact availability or tombstone
  and local-copy deletion preview/result. If physical deletion must be
  deferred, implement a safe unavailable or retained state and block the UI
  action until a named retention milestone rather than mapping it to row
  removal.
- **Decision dependency:** D003 explicitly defers long-term Artifact retention
  and deletion schedules. Product architecture must define or name the policy
  decision before physical deletion ships. The Project-link contract may
  proceed independently if it preserves this separation.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, architecture and retention shape `proposed`.

### `UX-REQ-011` — durable conversational working candidates and graph relationships

- **Originating design work:** accepted `DB09` and `UX1.4-DISC01`;
  `UX1.4-W01`–`W03`, `W07`, `W09`, `W13`, and `W15`; `UX-FLOW-02`,
  `UX-FLOW-03`, `UX-FLOW-06`–`08`, `UX-FLOW-10`, and `UX-FLOW-12`.
- **Named fixture need:** `UX-FX23`, two invented Project profiles whose
  bounded task conversations produce, correct, inspect, retain, and later
  review profile-valid working candidates and relationships. The scenario is
  independent of both contextual demo projects.
- **Implementation links:** `M1.1` task and identity records, `M1.3` graph
  boundaries, `M1.5` candidate and authority controls, `M1.6` bounded model
  context and validated outputs, `M1.7` interaction integration, and later
  registered profile contracts.
- **Project-author task and failure:** work naturally with a model that
  structures the exchange into an inspectable Project representation without
  requiring manual graph entry or treating model inference as accepted state.
  Current M1.5 evidence candidates are specific to source-grounded scientific
  Claim–Assertion extraction. Current M1.6 ContextPackets, EvidencePackets,
  model calls, and synthesis validation record bounded model inputs and
  outputs but deliberately grant no graph or review authority. No current
  profile-neutral contract found in the design audit represents a durable
  conversation-derived working candidate graph across Project profiles.
- **Requested record behavior:** architecture should define the smallest
  additive, versioned representation for non-authoritative profile-valid
  candidates and relationships produced from an exact author interaction,
  model role, Work result, extraction, import, or direct edit. The record or
  registered profile equivalent preserves the Project, task/thread, producing
  run or actor, input snapshot and context references, profile and applicable
  schema revisions, typed object or relationship meaning, exact basis and
  provenance references, uncertainty or limitation, validation references,
  revision and supersession lineage, and current working disposition. These
  are required semantics, not a proposed JSON shape.
- **Requested admission and correction behavior:** accept only output that
  validates against the active registered profile and exact bounded input;
  reject unknown object types, predicates, references, or unsupported profile
  revisions. Idempotently retain admitted working revisions without promoting
  them. Natural-language or direct correction creates a new revision and
  preserves its origin and supersession lineage. A model may repair mechanical
  structure but cannot silently resolve substantive ambiguity, source stance,
  meaning, or authority.
- **Requested read behavior:** return a snapshot-consistent working overlay
  that can be inspected beside current authoritative and historical graph
  state, with exact origin, basis, provenance, validation, uncertainty,
  exclusions, revision, and safe semantic destinations. Supply a complete
  textual peer representation. Graph engines remain controlled renderers and
  do not query or mutate authority directly.
- **Authority and persistence:** the working layer is durable task state but
  non-authoritative. Creating, displaying, selecting, arranging, or correcting
  it cannot emit trusted-domain events, update the authoritative projection,
  imply approval, or broaden capability. Promotion starts the ordinary Review,
  ChangeSet, Approval, command, event, and projection path. Retention must align
  with the accepted Project-thread and privacy boundaries rather than relying
  on browser-only state.
- **Smallest viable response:** identify whether existing Artifact,
  InteractionRun, model-output, evidence-candidate, or future profile records
  can compose this behavior. Add only the missing durable candidate/relation
  revision and authorized query boundary. A first response may support one
  registered profile type if the shared identity and authority boundary is
  explicitly extensible and not encoded as scientific UI state.
- **Decision dependencies:** registered object, relationship, validator, and
  language meaning depends on `UX-REQ-004`; exact task conversation and context
  lineage depends on `UX-REQ-006`; safe destinations depend on `UX-REQ-008`.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, canonical persistence and profile shape `proposed`.

### `UX-REQ-012` — profile-neutral Review-session read and command composition

- **Originating design work:** accepted `DB09` and `UX1.4-DISC01`;
  `UX1.4-W04`–`W15`; `UX-FLOW-06`–`08`, `UX-FLOW-10`–`12`,
  `UX-FLOW-15`, and `UX-FLOW-16`.
- **Named fixture need:** `UX-FX23`, with ordinary and exception members,
  exact comparison, conversational correction, single-ChangeSet application,
  independent multi-ChangeSet outcomes, stale refresh, projection lag, and
  governed Revert across two invented profiles.
- **Implementation links:** existing `M1.5` evidence review, ChangeSet,
  Approval, ReviewBatch, reversal, event, projection, and durable interrupt
  behavior; `M1.7` Project workbench queries and commands; and later registered
  profile contracts.
- **Project-author task and failure:** make one accountable decision from the
  exact candidate, producer, basis, validation, difference, and consequence,
  then return to the originating task. The current M1.5
  `EvidenceReviewBatchView` provides strong source-grounded scientific evidence
  review, and the current durable interrupt resolves exact accept or reject
  responses. It does not establish the complete use-agnostic Review place,
  profile-owned comparison renderers, task-session lifecycle, deferment,
  general basis revision, semantic separation, or cross-profile correction
  boundary required by DB09.
- **Requested read behavior:** compose a snapshot-consistent Project Review
  session from existing canonical records. It identifies the objective,
  responsible decision boundary, origin and return context, exact candidates
  and findings, Current/Candidate/Origin/Basis/Difference/Consequences roles,
  ordinary and exception membership, applicable validation and blocking
  reasons, freshness and conflict, one or more Changes-to-apply previews,
  ChangeSet atomic boundaries, member outcomes, decision history, and
  projection status. Profile contracts supply typed content and labels; the
  shared read model cannot alias unregistered domain objects.
- **Requested command behavior:** reuse current submit, approval, apply,
  reversal, capability, hash, idempotency, and conflict controls. Define or map
  the missing typed behavior for candidate correction, material basis change,
  explicit separation, deferment and reopen, Review refresh, and member-level
  retry or recovery. Every operation binds exact revisions and preserves
  superseded, rejected, deferred, failed, and applied history. Direct and
  model-mediated entry invokes the same canonical commands.
- **Atomicity and outcome behavior:** one ChangeSet remains the smallest unit
  that succeeds and reverses together. A Review session or ReviewBatch may
  contain independently atomic ChangeSets. Known blocked or stale members are
  identified before submission; runtime results retain every applied,
  rejected, failed, and unapplied member. No aggregate status may convert a
  partly completed session into whole success.
- **AG-UI boundary:** do not add actor, capability, Approval, command, graph
  operation, or authority fields to the accepted review-interrupt response.
  Its existing exact accept/reject path remains valid. Other Review operations
  use their canonical typed command adapters unless a separately reviewed
  protocol version is later required; conversational text alone never
  authorizes them.
- **Authority and persistence:** Review composition is a read and orchestration
  boundary over canonical candidates, validation, ChangeSets, Approvals,
  commands, events, and projections. The browser cannot infer eligibility,
  sufficient basis, validator force, conflict, authority, impact, or reversal.
  Contextual, focus, and main-route presentations resolve to one durable Review
  identity rather than creating presentation-local decisions.
- **Smallest viable response:** first map the scientific M1.5 evidence-review
  view and command path into the shared session roles without weakening its
  exact source semantics. Add a versioned Review-session query and only the
  missing commands needed for defer, refresh, correction/basis revision,
  separation, and member recovery. Profile expansion follows `UX-REQ-004`
  rather than adding a generic client-defined object payload.
- **Decision dependencies:** candidate/profile meaning depends on
  `UX-REQ-004` and `UX-REQ-011`; thread linkage on `UX-REQ-006`; reversal on
  `UX-REQ-007`; origin and return resolution on `UX-REQ-008`.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, runtime read and missing-command shape `proposed`.

### `UX-REQ-013` — bounded, profile-resolved relationship-view query

- **Originating design work:** DB10 and accepted `UX1.5-DISC02`–`DISC03`,
  sharpened by DB16's `UX1.0-DISC09`; `UX1.5-W01`–`W12`;
  `DB10-P01`–`P08`, `DB16-P02`–`P03`; `UX-FLOW-07`–`12`, `UX-FLOW-15`,
  and `UX-FLOW-16`.
- **Named design scenario and post-freeze fixture need:** `UX-FX24` pairs an
  invented scientific evidence question with a controlled-writing requirements
  question. Each traces exact recorded paths, shows non-authoritative Working
  changes, expands dependencies, and returns to its origin. `UX-FX25` adds
  dense/cyclic results, grouped and unknown counts, limited queries, late
  responses, stale bases, lagging projections, historical comparison, and
  missing/restricted endpoints. These are paper scenarios until freeze and use
  no contextual demo data or user assets. `UX-FX40` binds the same semantic
  result to current visual/text scenes and model explanations after freeze.
- **Implementation links:** `M1.3` graph projection and reads, `M1.5`
  relationship/candidate/ChangeSet authority, `M1.6` bounded context and model
  interpretation, `M1.7` workbench query integration, and later profile/temporal
  contracts where current milestones do not supply the required semantics.
- **Project-author task and failure:** answer a bounded relationship question
  and deliberately reveal more recorded context without confusing omitted
  results with absence, Working changes with authority, or old and current
  graph positions. Without a runtime-owned read boundary, the browser would
  infer complete paths, coverage, layer membership, temporal reconstruction,
  domain differences, or impact from incomplete renderer data.
- **Existing contract check:** `packages/contracts/src/generated/projection-checkpoint.ts`
  supplies authoritative projection position, observed head, and current,
  catching-up, or blocked freshness. `graph-projection-record.ts` supplies
  immutable delivery-attempt receipts. Existing candidate, ChangeSet, Approval,
  event, context, and source records remain authoritative inputs. The
  `FocusedGraphViewModel` in `apps/workbench/src/shell/model.ts` is an
  exploratory client model with nodes, edges, layout positions, snapshot
  labels, and a maximum depth. It is not a canonical profile-neutral query
  contract for the behaviors below; the audit found no complete corresponding
  boundary in the current contracts/core/adapters/server source.
- **Requested scope behavior:** validate Project/profile, actor context,
  exact focus or endpoint revisions, task intent, permitted relationship types
  and directions, selected layers, authoritative base, requested snapshot,
  temporal perspective, and finite traversal/result limits. Accept a named
  profile expansion recipe or validated interpreted scope, not renderer-authored
  Cypher or arbitrary model predicates. Preserve the interpreted question,
  producing role/context when applicable, and the effective boundary so direct
  and conversational entry are inspectable and correctable.
- **Requested read behavior:** return a versioned, renderer-neutral result with:
  - query/scope identity and enough request identity to reject late responses;
  - requested and represented snapshots, canonical projection position/freshness,
    profile revision, and supported read/expansion/comparison/time capabilities;
  - exact object and relationship revisions, layer and lifecycle, endpoint
    direction, predicate meaning, origin, rationale, basis, provenance,
    validation references, limitations, and safe semantic destinations;
  - ordered inspectable path steps, including missing/incomplete boundaries,
    cycles or repeated members, and any disclosed path-ordering rationale;
  - group membership/facets, count units, overlap, known totals, partial or
    unknown counts, returned and filtered membership, hidden permitted Working
    changes, traversal/page limits, and material omissions;
  - finite continuation/expansion references bound to the same query scope,
    snapshot, layer set, and access context; and
  - semantic records sufficient for the full textual path/matrix/timeline peer,
    without renderer geometry or visual inference supplying missing meaning.
- **Comparison and temporal behavior:** name both exact positions and their
  bases, authority layers, freshness, and supported temporal dimension. Compose
  differences and assessed consequences from canonical records or an authorized
  read/analysis boundary with known coverage; incomplete node sets cannot imply
  removals or certain invalidation. Separate recorded dependencies from supplied
  impact assessments. Distinguish recorded, occurred, publication, and valid time
  where supported; unknown time remains unknown. Return an explicit unsupported
  or unavailable state if a historical position cannot be reconstructed.
- **Working/projection behavior:** compose Working changes through
  `UX-REQ-011` with exact producer/revision and authoritative base; never rebase
  them silently. Do not combine old endpoints, new edges, and current counts
  into an apparently consistent snapshot. When graph projection is behind,
  identify the represented position and a permitted authoritative Details or
  Review route; a text table over the same stale projection remains stale.
- **Authority and persistence:** this is a bounded query/composition boundary,
  not a new domain store or mutation path. Reads and saved view recipes do not
  approve candidates, run new scientific assessments, or emit authoritative
  relationship changes. The client owns local view history, layout, selection,
  local saved recipes, and return focus. The runtime owns access, profile meaning,
  exact data membership, completeness, supplied comparison/impact facts, and
  freshness. Every continuation rechecks authorization without leaking hidden
  names, counts, or connections. Direct corrections still use DB09's canonical
  candidate/Review commands; new investigation uses DB06's Work path.
- **Accessible/model-scene boundary:** this result supplies the complete
  renderer-neutral graph meaning and semantic peer. `UX-REQ-022` may bind a
  current client-owned layout, visibility, grouping, focus/selection, legend,
  viewport, and permitted capture to the exact result so Petra can explain what
  the author sees. Visual position and pixels cannot fill a missing semantic
  relationship, scope, omission, authority, or basis field.
- **Smallest viable response:** first map a bounded current scientific
  relationship/source-path read onto existing assertion, source, and projection
  records, with exact scope, honest completeness, safe failure, and a textual
  peer. Compose working and Review positions from `UX-REQ-011`/`UX-REQ-012`
  rather than duplicating them. Explicitly mark unsupported expansion, profile,
  comparison, and historical capabilities. Architecture may assign remaining
  capabilities to named milestones with safe unavailable/provisional boundaries;
  it must not claim the full DB10 runtime contract from a current-only response.
- **Provisional post-freeze boundary:** an explicitly labeled synthetic provider
  may supply the required semantic records behind an application query adapter,
  referencing `UX-REQ-013`. Feature components receive no raw graph-store or
  AG-UI protocol objects and calculate no authoritative meaning. No fixture,
  server query, schema, renderer dependency, or live integration is created by
  this request.
- **Decision dependencies:** `UX-REQ-004` profile semantics; `UX-REQ-003` and
  `UX-REQ-006` Work/context for questions needing new computation;
  `UX-REQ-007` canonical reversal facts; `UX-REQ-008` safe destinations;
  `UX-REQ-009` exact source inspection; `UX-REQ-011` working structure; and
  `UX-REQ-012` Review comparison and correction composition.
- **Owner and status:** product architecture and implementation track; UX
  direction accepted on 2026-09-06, runtime query/composition shape `proposed`.
  No backend milestone is changed or closed by this design record.

### `UX-REQ-014` — Project Work collection and task/stage read composition

- **Originating design work:** DB11's accepted presentation and branch-choice
  direction, `UX1.6-DISC02`–`DISC03` (2026-09-06), sharpened by DB17's accepted
  `UX1.0-DISC10`; DB06's Work/interrupt/result boundaries; `DB17-P03`–`P05`;
  `UX-FLOW-11` and `UX-FLOW-16`; `UX1.6-W08`–`W11` and `W15`.
- **Named design scenario and post-freeze fixture need:** `UX-FX26`, paired
  invented scientific and controlled-writing tasks with meaningful stages,
  concurrent or blocked activity, exact role/tool/validator attempts, required
  input, retained partial outputs, terminal success and failure, a recorded
  checkpoint, cancellation eligibility, and disconnect/replay. The same task
  resolves from Work, Brief, Petra, and an originating source/Graph/output.
  This is a paper scenario until freeze and contains no contextual demo data.
- **Implementation links:** `M1.1` WorkUnit/manifests and operational records,
  `M1.2` durable revisions, `M1.6` model/validation/resource records, `M1.7`
  Work queries and interaction integration, and later orchestration/profile
  contracts where current workflows do not supply the required meaning.
- **Project-author task and failure:** understand what a bounded task is doing,
  what needs a decision, which results exist, and which controls are valid,
  without reconstructing that state from a transcript or execution graph.
  Without a composed read boundary, the browser would invent stage membership,
  aggregate lifecycle, readiness, progress, input ownership, or cost from
  independent and potentially stale records.
- **Existing contract check:** `WorkUnit` contains exact objective/spec/input,
  dependencies, cancellation/checkpoint/cache policies, lifecycle, attempts,
  and terminal outcome. Input/output manifests provide immutable bindings,
  resource limits/usage, output slots, failure information, and declared partial
  retention. `WorkUnitAuthorityRepository` preserves revisions and manifests;
  `WorkUnitRegistry` constrains retry and cancellation. The current cancellation
  command/receipt and interaction replay/Review responses remain the operational
  and protocol foundation. A WorkUnit's `completed` status can encode failure;
  `checkpointed` alone does not establish a pause/resume operation. These records
  do not supply the complete Project collection and task/stage presentation.
- **Requested collection behavior:** return authorized Project/profile task
  membership, exact identities/revisions, recognizable objectives, canonical
  execution conditions, required-input/blocked reasons, current stage summary,
  elapsed time, available usage/limit summary, result/failure destinations,
  observation freshness, and bounded filters/pagination with honest counts.
  Ordering reasons follow the accepted attention model; no universal urgency
  score or invented queue position.
- **Requested detail behavior:** compose existing records into a versioned view
  with exact task/action/input/plan references; declared stage membership,
  purpose, order/dependencies and concurrent status; accountable role/tool/model
  executions and attempts; immutable input/output/checkpoint references;
  required-input records and dispositions; resource use and limits; output
  availability/validation/retention; current supported control eligibility and
  consequences; semantic destinations; and observation/replay freshness.
  Every aggregate identifies its input records and coverage. An unavailable
  stage plan is explicit rather than reconstructed from model prose.
- **Reconciled recovery fields:** expose the exact current attempt and terminal
  state; retained, reusable, diagnostic-only, missing, or unavailable outputs;
  verified checkpoint and compatibility; retry/cancellation policy and remaining
  attempts; cancellation command/receipt and race outcome; interaction replay
  position; measured/unknown usage; and registered control eligibility with the
  record and time that established it. This Work composition is an input to
  `UX-REQ-023`; it does not derive a cross-module recovery outcome itself.
- **Recommendation and branch behavior:** distinguish actual workflow/control
  prerequisites from contextual advice and other eligible work. Supply the
  recommendation's producer/rule, objective, exact basis and observation/plan
  revision, concise reason, material uncertainty, and currentness. Supply the
  author's effective task-scoped priority separately, with actual eligibility,
  waiting successors, and shared dependency identity. A model preference or
  inferred domain dependency cannot turn an eligible branch into blocked Work.
  Reopening the view does not silently reset the author's chosen priority.
- **Inquiry linkage clarification (`UX1.6-DISC04`):** consume exact inquiry
  references/context from `UX-REQ-016` where a task addresses a Project line of
  inquiry. An inquiry can outlive this task, have no active Work, or share results
  with other lines. The Work view owns execution presentation; its stage tree,
  terminal status, and priority do not define inquiry identity, resolution, or
  the author's Project-level reasoning order.
- **Composition and identity:** use the primary canonical WorkUnit identity and
  registered workflow records. If a workflow composes several WorkUnits, return
  their exact membership, dependencies, shared consumers, and control ownership
  from a runtime-owned composition. Do not invent a new lifecycle merely to make
  one card; independent WorkUnits remain separate without that canonical mapping.
- **Status and accounting:** distinguish execution lifecycle, required input,
  dependency blocking, delivery/replay, output usability, and separate Review
  outcome. Do not map every terminal WorkUnit to success, a validation finding
  to execution failure, or a checkpoint to paused/resumable. Progress names its
  unit, denominator, plan revision, and any missing coverage. Resource totals
  deduplicate canonical observations and distinguish measured, estimated,
  authorized, shared, retry, and unknown amounts.
- **Controls and privacy:** expose only registered, authorized operations and
  their exact identities/revisions and consequences. Read composition cannot
  declare generic steering, Pause, resume, budget increase, or recursive
  cancellation to exist. Access changes and stale input/control revisions fail
  safely without disclosing restricted task membership or hidden outputs.
  Work and Petra presentations resolve the same input request and command once.
- **Authority and persistence:** a read boundary over operational, interaction,
  output, and Review records, not a new command authority. The runtime owns
  execution and aggregation meaning; the client owns filters, disclosure,
  selection, panel state, unsent input, and return focus. Displaying output,
  completing Work, acknowledging a result, or reconnecting cannot apply it.
- **Smallest viable response:** compose one exact WorkUnit detail and a bounded
  Project list from existing records, with honest unavailable stage/resource/input
  fields and safe control eligibility. Add registered stage/activity composition
  only where the workflow can supply it. Larger orchestration may be assigned to
  named milestones with a safe limitation; a simple task view must not claim the
  entire DB11 runtime contract.
- **Provisional post-freeze boundary:** a synthetic application-query provider
  may model the required semantic records and cite `UX-REQ-014`; feature
  components do not parse raw AG-UI events or derive execution authority from
  stream order. No runtime contract or frontend is implemented by this request.
- **Dependencies:** `UX-REQ-003` action preview/start, `UX-REQ-004` registered
  profile semantics, `UX-REQ-006` exact thread/context, `UX-REQ-008` destinations,
  existing WorkUnit/manifest/cancellation and interaction contracts, and DB09's
  candidate/Review boundary.
- **Owner and status:** product architecture and implementation track;
  presentation direction accepted, runtime collection/detail composition
  `proposed`. DB11's accepted steering and branch-priority command needs are
  recorded separately in `UX-REQ-015`; this read request does not implement them.

### `UX-REQ-015` — Work steering, branch priority, and execution-plan transition

- **Scope clarification (`UX1.6-DISC04`):** this request governs operational
  Work branches only. The author's primary parallel lines of inquiry are
  Project-level reasoning contexts, may concern Hypotheses or other open
  questions, and can span zero or many tasks. Their representation and advisory
  priority are requested in `UX-REQ-016`; selecting an inquiry does not invoke
  this scheduling command. Existing direct execution instructions still do.
- **Originating design work:** DB11 and accepted `UX1.6-DISC03` (2026-09-06),
  sharpened by DB17's accepted `UX1.0-DISC10`, including the distinction between
  contextual branch advice and actual prerequisite constraints;
  `DB11-P03`–`P08`, `DB17-P03`–`P05`, `UX-FLOW-11`, and `UX-FLOW-16`.
- **Named design scenario and post-freeze fixture need:** `UX-FX27` uses an
  invented task whose source-version prerequisite A feeds checks B/C while
  branch D is independent. The author chooses D despite advice to resolve A,
  then narrows scope or changes an exact input while execution is underway.
  Exercise validated reuse, new attempts, shared dependencies, a real new
  authorization/ambiguity boundary, atomic/checkpoint limits, stale and failed
  transitions, cancellation races, and exact result scope in two profiles.
- **Implementation links:** `M1.1` WorkUnit/input/output/control records,
  `M1.2` durable lineage, `M1.6` interpreted instructions and worker execution,
  `M1.7` application commands and interaction, and later orchestration/profile
  contracts where the current bounded worker lifecycle does not supply the need.
- **Project-author task and failure:** direct valid work naturally and follow
  another eligible branch without redundant confirmation, while understanding
  exactly which running or future stages change. Without a runtime-owned
  transition, a browser or model could overwrite consumed inputs, invent reuse,
  turn advice into authority, apply an instruction twice, launch superseded
  successors, or cancel a shared dependency that another task still needs.
- **Existing contract check:** WorkUnit has dependency IDs, priority classes,
  immutable spec/input binding, retry and cancellation policies. The authority
  repository/registry expose bounded lifecycle operations, exact revisions,
  dependency readiness, retry limits, and cancellation receipts. These do not
  establish a generic stage-aware steering/replan command, persistent contextual
  branch preference, safe scheduling cutover across shared branches, or universal
  checkpoint resume. Work priority classes do not encode the meaning or force of
  a recommendation. Reuse the existing operations where they supply the effect.
- **Requested instruction boundary:** resolve an explicit authenticated author
  instruction or direct control to exact Project/task/plan/input/branch references,
  expected revisions, interpretation, existing capability and resource limits,
  and an idempotent operational action. Sufficiently clear authorized direction
  acts without another approval request. Questions, tentative proposals, model
  recommendations, quoted source text, and ambiguous references do not become
  instructions. The model cannot supply actor, capability, approval, or command
  authority. Ask only for unresolved consequential meaning or additional authority,
  naming the exact choice; preserve the separate DB09 domain-approval boundary.
- **Requested branch-priority behavior:** validate real prerequisites and resource/
  capability eligibility, then honor an explicit choice among valid branches.
  Record task/plan-scoped priority and its producer without changing Project-wide
  policy or treating a non-recommended choice as failure/risk. Keep the preference
  until the author changes it or material facts require re-evaluation. A new
  recommendation does not automatically reschedule work. Read-only branch selection
  remains distinct from **Work on this next**. No command infers recursive
  cancellation or changes other consumers of a shared prerequisite by implication.
- **Requested plan-change behavior:** validate compatibility of exact completed
  inputs/outputs and declared dependencies; identify reuse, revalidation, reruns,
  changed expected outputs, exclusions, and known resource effects. Preserve
  earlier manifests, plan/attempt records, instruction origin, and result scope.
  Create new canonical input/plan/WorkUnit records where required by the existing
  immutable boundary and expose their lineage through the task composition.
  Do not mutate consumed worker context or silently attach old findings to a new
  input. **Start again** records deliberate fresh execution with its explicit
  stop/continue relationship to prior Work and existing cost history.
- **Transition and concurrency behavior:** return when the instruction takes
  effect and what each affected active stage does at its supported instruction,
  cancellation, checkpoint, or atomic completion boundary. Order the transition
  against successor scheduling so a plan cannot appear updated while superseded
  work starts silently. Retain unaffected/shared work under its actual control
  owner. Report exact applied, pending, rejected, stale, failed, or partly effected
  command composition; do not invent atomicity across independent operations.
  A missing operation returns a safe unsupported path instead of pretending the
  change happened or queuing an unimplemented future stop.
- **Recovery behavior:** reconcile canonical task/command receipts after lost
  delivery or races before retry; duplicate instruction/response delivery cannot
  issue a new command. Map unchanged eligible retries to existing attempt and
  dependency rules. Expose resume only when a registered operation validates its
  checkpoint and input/context. Map cancellation to existing capability, policy,
  revision, and receipt rules; distinguish requested cancellation from actual
  terminal outcome and actual completion winning a race. Retention follows exact
  manifest policy and does not turn diagnostics into reusable output. Expose the
  owning records and current eligibility to `UX-REQ-023`; recovery composition
  cannot invoke this transition or invent a missing resume/checkpoint operation.
- **Acknowledgment/read response:** supply the interpreted instruction, effective
  plan/priority revision, affected and reused work, transition timing, continuing
  branches, scope/output change, cost/limits and unknowns, real unresolved choice,
  and exact operation outcomes to `UX-REQ-014`. A concise explanation suffices for
  an already authorized clear instruction; no additional approval artifact is
  fabricated merely to justify acting on it.
- **Authority and persistence:** commands affect authorized operational work,
  never domain acceptance, immutable source bytes, or historical erasure. Record
  exact authenticated intent and operational lineage using existing canonical
  control records where possible. AG-UI remains behind PetraInteractionClient;
  new operations do not append authority fields to the existing Review response.
- **Smallest viable response:** identify one supported workflow and map its exact
  branch priority and within-limit steering to existing commands/records first.
  Where immutable inputs require replacement, compose a bounded follow-on
  WorkUnit with explicit dependency/reuse and control outcomes. Add only the
  missing canonical intent/plan/priority/transition linkage. Name unsupported
  cross-branch transitions, checkpoint resume, and future-stop capabilities and
  assign them to explicit milestones if deferred; a narrow mapping cannot claim
  the whole DB11 runtime contract.
- **Provisional post-freeze boundary:** a clearly declared synthetic command
  adapter can model exact inputs and outcomes referencing `UX-REQ-015` and
  `UX-FX27`. No feature component supplies eligibility, dependency meaning,
  reuse validity, or authority. This request creates no production command,
  schema, fixture, scheduler, backend change, or new operational permission.
- **Dependencies:** `UX-REQ-003` preview/start, `UX-REQ-004` profile/workflow
  meaning, `UX-REQ-006` exact task instruction/context, `UX-REQ-008` safe
  destinations, `UX-REQ-014` task composition, and the existing WorkUnit,
  manifest, capability, cancellation, interaction, and Review boundaries.
- **Owner and status:** product architecture and implementation track; UX
  direction accepted, canonical command/composition shape `proposed`.

### `UX-REQ-016` — Project lines of inquiry and exact Work linkage

- **Originating design work:** the user's clarification accepted on 2026-09-06
  as `UX1.6-DISC04`; the shared Project inquiry model and DB07/DB10/DB11;
  `DB11-P11`, `UX-FLOW-02`, `UX-FLOW-07`–`11`, and `UX-FLOW-16`.
- **Named design scenario and post-freeze fixture need:** `UX-FX28`, parallel
  invented criteria, alternatives, method/interpretation, and optional
  Hypothesis-centered inquiries. The author explores alternatives before fixing
  criteria; one line has no active Work, another has completed tasks but unresolved
  questions, and a shared result informs several lines. Pair two profiles without
  aliasing every question to a Hypothesis or WorkUnit.
- **Implementation links:** `M1.1` Project/domain identity, `M1.2` durable
  records, `M1.3` typed relationships, `M1.5` working/Review boundaries,
  `M1.6` bounded context and recommendations, `M1.7` cross-surface reads,
  and later registered profile/domain contracts where required.
- **Project-author task and failure:** maintain and explore several meaningful
  directions of inquiry, understand their shared basis and open questions, and
  choose where to reason next independently of whether a worker is running.
  Without this boundary, the UI would force questions into Hypotheses, lose an
  inquiry when Work ends, treat a successful task as a resolved question, or turn
  recommended reasoning order into a scheduler constraint.
- **Existing contract check:** PETRA.md describes subquestions, concepts,
  mechanisms, explanations, and search strategies; D009's research map includes
  ResearchQuestions and subquestions separately from Hypotheses. PETRA_GRAPH_MODEL.md
  describes ResearchQuestion meaning and provisional/deferred states. The current
  canonical Project schema supplies Project identity and private scope; WorkUnit
  supplies bounded execution. These do not by themselves establish the complete
  profile-resolved inquiry role, cross-surface read composition, recommendation
  context, and zero/many/shared Work linkage. Architecture should first map the
  role onto existing domain records rather than add a universal new object type.
- **Requested semantic mapping:** register how each supported profile represents
  a line of inquiry through a question, Hypothesis, other valid domain object, or
  linked set where its semantics fit. Preserve stable identity/revision and
  recognizable inquiry purpose, original/revised framing, relationship to the
  Project purpose, basis, uncertainty, open questions, history, and any supplied
  resolution/assessment meaning. Do not require every line to be a falsifiable
  proposition or a new wrapper around an existing Hypothesis. Final profile
  ontology and persistence require architecture disposition.
- **Requested read/linkage behavior:** provide exact inquiry references, profile
  meaning, current understanding and limitations, shared/cross-linked basis and
  related questions, recommendation basis/producer/freshness, and authorized
  destinations. Link zero or many conversations, Work tasks over time, results,
  candidates, and decisions. Preserve one identity for shared Work/basis rather
  than duplicating it in each inquiry. State whether a result merely addresses
  the question, provides admissible basis, or carries a separate accepted finding;
  execution provenance alone cannot establish evidentiary support.
- **Recommendation behavior:** explain why a line could be useful to explore next
  in the current Project context, including its uncertain reasoning dependencies,
  likely learning value, rework, and known limits where supported. Keep authored
  preference, model/rule advice, inquiry meaning, and actual operational
  prerequisites distinct. Choosing another line does not create a failed/risky
  Project state or automatically start/cancel/reprioritize linked Work. A valid
  exploratory order can help discover the criteria or assumptions that an earlier
  recommendation suggested resolving first.
  Where an unresolved inquiry limits another conclusion, preserve the specific
  limitation and basis without treating all exploration as blocked. Respecting
  chosen order does not remove uncertainty or make a provisional ranking settled.
- **Authority and persistence:** inquiry framing, relationships, assessments, and
  resolutions use registered profile-valid working and authoritative records
  under `UX-REQ-004`/`UX-REQ-011`/DB09. Navigation focus and presentation preference
  remain distinct from durable semantic changes and operational scheduling. A
  model can produce candidate inquiry structure but cannot silently promote it.
  Do not derive inquiry resolution, abandonment, or confidence from Work progress,
  terminal success, cancellation, or mere artifact existence. Preserve references
  and history across focus changes, disconnected delivery, and task completion.
- **Surface composition:** feed existing Brief/Project-map/Details/Petra/Graph
  roles and exact Work context; no new primary destination or mandatory dashboard.
  Opening/focusing an inquiry resolves context and permits bounded reasoning from
  existing basis. New execution uses `UX-REQ-003`/`UX-REQ-015` only when directed;
  results return through `UX-REQ-014` to their inquiry without automatic resolution.
  Unsupported profiles, stale basis, unavailable/restricted members, and missing
  mappings have honest scoped failure and safe navigation.
- **Smallest viable response:** map one supported inquiry role to a suitable
  existing domain representation with exact Project identity, basis/open-question
  read composition, and explicit Work/result links. Compose the existing Brief
  and Details roles; use existing graph relationships where meaning matches.
  Identify missing profile schemas, durable semantic/priority records, or new
  command mappings explicitly; do not relabel a WorkUnit as the fallback inquiry.
- **Provisional post-freeze boundary:** a synthetic profile/query adapter may
  declare its inquiry mapping and exact links under `UX-REQ-016`/`UX-FX28`.
  It must label provisional contract assumptions outside the product frame and
  may not calculate domain meaning or approval in feature components. No schema,
  interface, demo corpus, or persistence change is implemented by this request.
- **Dependencies:** `UX-REQ-002` Brief composition, `UX-REQ-004` profile semantics,
  `UX-REQ-006` conversation/context linkage, `UX-REQ-008` destinations,
  `UX-REQ-011`/`UX-REQ-012` working meaning and Review, `UX-REQ-013` bounded graph
  inspection, and `UX-REQ-014`/`UX-REQ-015` distinct operational Work boundaries.
- **Owner and status:** product architecture and implementation track; Project
  inquiry meaning accepted, canonical mapping/read/linkage shape `proposed`.

### `UX-REQ-017` — Composition workspace and exact document context

- **Originating design work:** DB12; document-first direction accepted as
  `UX1.7-DISC01` on 2026-09-06; `DB12-P01`–`P11`;
  `UX-FLOW-14`–`16` and `UX-PATH-04`.
- **Named post-freeze scenario:** `UX-FX29`, paired document-first composition
  and revision; `UX-FX30`, exact revision and adverse-state inspection.
- **Implementation links:** `M1.1` identity, `M1.2` persistence,
  `M1.7` interaction/read composition, `M1.8` composition/rendering, and
  later profile/authoring contracts.
- **Author task and failure:** resume a document, write with contextual Petra,
  inspect passage basis and findings, compare exact revisions, and reach a
  supported output without losing text or inquiry context. Independent artifact,
  Work, citation, and validation records do not provide a coherent document view.
- **Existing contract check:** D012 and CompositionRequest/CompositionPlan,
  DraftArtifact/DraftSpan, ProvenanceMap, CitationBundle, DraftSupportAssessment,
  and RenderedArtifact provide a scientific composition foundation with exact
  identities. Composition aggregates and artifact repositories retain related
  records. The deterministic renderer supports Markdown, LaTeX, and BibTeX.
  These do not establish a profile-neutral document collection/editor view,
  imported ancestry, complete working-copy state, or general format support.
  Scientific subject references and force/origin values cannot simply be
  relabelled as controlled-writing meaning.
- **Requested read behavior:** compose Project/profile identity, recognizable
  document purpose/title, exact selected revision, working-copy/save
  acknowledgment where available, origin/ancestry, content/structure capability,
  linked inquiry and Work context, scoped findings and assessed revision,
  citations and source access where applicable, available comparison positions,
  revision history, and safe destinations. Separate document revision,
  Project snapshot, model-input revision, assessment revision, and output
  revision rather than returning one ambiguous “current” field.
- **Selection and context:** resolve passage/section/document scope with exact
  content identity and locators, including the contract's Unicode-code-point
  span semantics where applicable. Preserve origin/return across Details,
  Sources, Petra, Work, Review, and inquiry context. Missing or changed locators
  produce a scoped failure; they cannot silently select nearby text or the
  author's new caret position.
- **Status and eligibility:** distinguish actual save acknowledgment, local-only
  retention capability, Work execution, validation execution/coverage/findings,
  source/provenance freshness, profile approval, and rendering. Return
  operation-specific capabilities and reasons. Consume the accepted working-copy
  export policy through UX-REQ-019; this read request cannot grant eligibility
  through a presentation field.
- **Authority and persistence:** this is a composed read boundary over existing
  and explicitly proposed records. UI selection, disclosure, layout, and unsent
  instructions remain presentation state. Runtime records own origin, support,
  assessment, save identity, profile promotion, and output eligibility.
- **Smallest viable response:** compose existing scientific aggregates with
  exact context, findings, and format capabilities; explicitly map the
  working-copy and profile gaps through UX-REQ-018/004/005. Do not present an
  unavailable controlled-writing operation as a working scientific alias.
- **Provisional boundary:** after freeze, a synthetic profile/query adapter may
  expose these facts with its request and assumptions recorded outside product
  copy. No editor, new renderer, frontend fixture, or live endpoint is added here.
- **Dependencies:** UX-REQ-004 profile roles, UX-REQ-005 ancestry/promotion,
  UX-REQ-006 turn context, UX-REQ-008 destinations, UX-REQ-009 exact sources,
  UX-REQ-012 Review, UX-REQ-014/015 Work, UX-REQ-016 inquiries, and
  UX-REQ-018 working-copy commands.
- **Owner and status:** architecture and implementation track; accepted workspace
  direction, runtime read composition `proposed`; export mapping is UX-REQ-019.

### `UX-REQ-018` — Continuous document editing and exact revision reconciliation

- **Originating design work:** DB12 direct editing, proposal comparison, save
  meaning, and recovery under accepted `UX1.7-DISC01`, sharpened by DB17's
  accepted `UX1.0-DISC10`; `DB12-P03`, `P04`, `P06`, `P08`, and `DB17-P06`.
- **Named post-freeze scenario:** `UX-FX30`: successive and structural edits
  while validation is stale; a model proposal and a validator result arrive
  after further edits; a save conflicts or disconnects. Pair an invented
  scientific passage and controlled-writing document without aliasing semantics.
- **Implementation links:** `M1.1` exact command/domain identity,
  `M1.2` persistence, `M1.7` interaction, `M1.8` draft revisions and
  support assessment, later profile/authoring contracts.
- **Author task and failure:** write continuously, retain progress, use inspected
  suggestions, and correct findings without revalidating after every edit or
  losing intervening changes. Save state must be honest even when the document
  has no basis yet or its latest support assessment is stale.
- **Existing contract check:** `packages/core/src/draft-revision.ts` accepts
  exact non-empty replacements of existing DraftSpans and rejects a stale/failed
  base or non-current provenance. Its result creates a new composition revision
  and a support assessment. DraftArtifact requires composition/evidence context
  and non-empty span membership; the current request requires scientific subject
  references. DraftSupportAssessment binds exact draft/map/citation references
  and controls reuse without becoming scientific evidence. This does not supply
  blank or general structural authoring, repeated editing before revalidation,
  durable working-copy save composition, or reconciliation of later model output.
- **Requested working-copy behavior:** define the smallest durable,
  non-authoritative authoring representation with exact Project/profile,
  document lineage, working revision/content identity, author origin, and save
  acknowledgment. Allow text insertion/deletion, supported restructuring, and
  successive edits while checks are pending/stale/failed. Distinguish an empty
  working document from a registered composed DraftArtifact. Do not invent
  evidence, dummy subject objects, or a passing assessment to satisfy a schema.
- **Requested save and conflict behavior:** commands name exact expected base
  and operation identity, acknowledge the durable revision, and reconcile
  duplicate delivery. Concurrent or disconnected edits preserve both available
  contents and report actual saved effects. Local recovery, when a supported
  storage capability exists, identifies Project/document, exact base, local
  revision/hash and timestamp, storage scope, and available bytes. Preserve
  base/local/current as distinct comparison positions when durable state advanced;
  no loss-bearing choice is preselected. A browser buffer cannot claim a Project
  save. Expose the resulting preservation/conflict facts and owning save actions
  to `UX-REQ-023`. UX specifies preservation, not a new collaborative editing
  algorithm.
- **Requested suggestion transition:** bind every model proposal to exact input
  revision, passage/section/document scope, and producer. Using inspected
  changes records exact accepted content, retained human text, and origin.
  If the base changed, preserve the result and report conflict; no last-writer
  replacement or implicit application to a new selection. Selecting a subset or
  combining suggestions creates a distinct result with new assessment needs.
- **Requested assessment boundary:** saving working progress does not mark
  provenance current, pass validation, permit reuse, or promote a document.
  Explicit checks bind exact content, source snapshot, profile/validator
  revisions, and coverage. Results for an older revision remain historical.
  Runtime mapping determines which unchanged support can be retained; the
  client cannot infer support from text similarity or carry green status forward.
  Map how a working revision becomes a registered composed revision without
  weakening the existing support-assessment or scientific reuse invariants.
- **Authority and persistence:** direct author edits and explicit use of exact
  suggested content retain author/model origin and immutable saved lineage.
  Registered profile promotion or Project mutation still uses its own command
  and Review boundary. Working-buffer undo, a new descendant of prior content,
  and governed Revert remain separate. Imported source bytes remain protected.
- **Smallest viable response:** first map existing draft/artifact persistence
  and commands; add an explicit working-copy boundary where necessary. Support
  exact durable saves, continued editing, and reconciliation before claiming a
  general editor. Architecture owns representation and batching; the UX does
  not require one domain event per keystroke or a particular editor library.
- **Provisional boundary:** a post-freeze synthetic command adapter can model
  acknowledged saves, stale assessments, conflicts, and late results under
  UX-FX30. It must not bypass the current revision engine and claim equivalent
  runtime semantics. No contract or persistence code changes in this request.
- **Dependencies:** UX-REQ-004/005 profile and ancestry, UX-REQ-006 context,
  UX-REQ-011/012 working/Review meaning where applicable, UX-REQ-014/015
  Work, UX-REQ-016 inquiry links, UX-REQ-017 document read composition.
- **Owner and status:** architecture and implementation track; normal authoring
  requirement specified from the accepted workspace direction, runtime
  representation and command composition `proposed`. Accepted export behavior
  is mapped separately in UX-REQ-019; a save alone does not invoke export.

### `UX-REQ-019` — Working-copy export, status carriage, and delivery

- **Originating design work:** DB12 and accepted `UX1.7-DISC02` (2026-09-07),
  sharpened by DB17's accepted `UX1.0-DISC10`; `DB12-P09`–`P11`, `DB17-P09`;
  `UX-FLOW-14`–`16` and `UX-FLOW-18`.
- **Named post-freeze scenario:** `UX-FX31`, an exploratory comparison with
  unsettled criteria and a stale citation, paired with a manuscript continuity
  finding. Include unchecked/failed/unknown coverage, selected-scope export,
  unsaved capture, later edits, clipboard/structured formats, incomplete status
  delivery, individual format failure, and cancellation after bytes are delivered.
- **Implementation links:** `M1.1` exact identities and controls, `M1.2`
  artifact/persistence, `M1.7` interaction and delivery composition,
  `M1.8` rendering/export, and later profile/destination contracts.
- **Author task and failure:** take an unfinished document outside Petra to
  continue work while keeping its exact content and known limitations. A blanket
  validation gate obstructs that authorized use; dropping status, changing the
  chosen revision, or claiming delivery without evidence misrepresents the copy.
- **Existing contract check:** D012 permits scoped artifacts and explicit
  external actions without making rendering scientific authority. RenderedArtifact
  binds an exact DraftArtifact, CitationBundle, renderer, output Artifact, warnings,
  and semantic content hash. DeterministicCompositionRenderer exposes requested
  Markdown/LaTeX/BibTeX formats; its recorded warnings are composed from citations.
  CompositionArtifactPublisher registers generated bytes and artifact records
  internally, rather than proving public publication or user receipt.
  DraftSupportAssessment controls exact support reuse and is not an export policy.
  These records do not by themselves supply a general working-copy capture,
  complete scoped validation/inquiry status, required-report composition,
  destination eligibility, or browser/clipboard delivery reconciliation.
- **Requested exact capture:** bind the explicitly chosen document/working
  revision and hash, selected scope and locator, profile, applicable source and
  citation references, and assessment/coverage position. Capture unsaved working
  content only through a supported exact operation under UX-REQ-018; do not call
  it durably saved unless acknowledged. If unavailable, preserve edits and
  expose the required save/capture step. Never substitute a last-saved,
  last-passing, latest, or historical revision without the corresponding intent.
- **Requested status composition:** include readable working-copy identity,
  relevant unresolved findings, not-checked/stale/failed-to-run distinctions,
  assessed revision/scope, unknown coverage, and permitted detailed report links.
  Resolve applicability for selected passages and shared limitations on the
  runtime side. Unknown scope cannot be turned into an empty findings list.
  A broader report is allowed only when its scope is explicitly labelled.
- **Requested representation:** carry the status with the returned bytes or a
  delivered bundle whose required members and relationship are explicit. Clipboard
  output includes status in its supported text representation. Structured formats
  retain valid syntax and do not insert status as false citation metadata or
  source data. Unsupported status carriage offers a supported copy/download
  alternative. The delivery guarantee does not claim immutable control over files
  after the author edits them elsewhere.
- **Eligibility and authority:** unresolved domain checks alone do not block
  working-copy export. Check actual actor/Project access, requested inclusions,
  destination, integrity, format, and status carriage for the operation. Do not
  embed all cited bytes, private conversations, or excluded context implicitly.
  Source unavailability may limit verification without preventing a permitted
  draft-only export. A restricted requested inclusion has its own reason and
  possible explicitly narrower alternative. Export neither promotes a document
  nor changes approved Project state or the existing support-reuse assessment.
- **Instruction behavior:** direct and Petra-mediated requests converge on the
  exact operation. A sufficiently clear authorized instruction needs no repeated
  approval just because findings remain open. Resolve consequential ambiguity
  or new authority explicitly; do not infer a public delivery destination from
  a local copy/download request.
- **Requested outcomes and recovery:** bind generated files and required reports
  to exact capture, format/options, status, and operation identity. Report each
  member/format outcome and observed delivery stage: prepared output, clipboard
  acknowledgment, browser download initiation, or confirmed external receipt only
  where supported. Keep failed/partial results and retry delivery of exact
  retained members without regeneration. Treat **Regenerate** as a separate
  output operation with its own identity, possible Work/cost, validation, and
  History. Reconnect reconciles prior effects; cancellation cannot recall
  delivered bytes. Newer edits and assessments do not mutate an existing output
  receipt. Expose member outcomes, delivery knowledge, and owning actions to
  `UX-REQ-023` without upgrading client observation into external receipt.
- **Authority and persistence:** architecture determines the smallest export
  record/manifest and event composition over existing artifact storage. Preserve
  original sources, prior outputs, and exact provenance. The client renders
  runtime-supplied eligibility, scope, and status; it cannot override a reuse
  gate locally or invent the export policy from renderer success.
- **Smallest viable response:** map one supported exact working revision to a
  permitted textual copy/download carrying an in-document status note and exact
  identity, with observable outcome and preserved source/basis references.
  Add a composed manifest/status record only where existing records are
  insufficient. Keep richer formats, bundles, and external destinations explicit
  capabilities rather than prerequisites for the simplest author workflow.
- **Provisional boundary:** after freeze, a synthetic adapter may exercise exact
  captures, scoped findings, status-bearing representations, eligibility, and
  delivery outcomes under UX-FX31. No current renderer, gateway, backend contract,
  or browser export is changed by this specification.
- **Dependencies:** UX-REQ-004/005 profile and ancestry/promotion, UX-REQ-009/010
  source access/lifecycle, UX-REQ-012 Review, UX-REQ-014/015 Work controls,
  UX-REQ-016 inquiry context, UX-REQ-017 document reads, and UX-REQ-018 working
  revisions. Existing rights, capability, artifact, citation, and support
  assessment contracts retain their boundaries.
- **Owner and status:** product architecture and implementation track; working-copy
  export UX accepted, runtime mapping/command/read composition `proposed`.

### `UX-REQ-020` — Effective Project controls and typed policy transitions

- **Originating design work:** DB13 and accepted `UX1.1-DISC06` (2026-09-07);
  `DB13-P07`–`P10` and `UX-FLOW-17`.
- **Named post-freeze scenarios:** `UX-FX32`, paired personal preferences and
  Project controls; `UX-FX33`, stale, unavailable, conflicted, and partially
  reconciled control states.
- **Implementation links:** `M1.1` identity/capability/control references,
  `M1.2` durable policy records where supplied, `M1.5` Review policy,
  `M1.6` model routing and budgets, `M1.7` composed Settings reads/commands,
  and later governance/profile contracts.
- **Author task and failure:** understand the privacy, capability, model/Work,
  budget, and Review rules effective for one Project and change a supported rule
  through its owning operation. Without a composed boundary, Settings would
  present stale fragments, invent a universal toggle, apply a personal preference
  as authority, or obscure which Work a change affects.
- **Existing contract check:** PetraProject supplies exact private visibility and
  enabled evidence namespaces. Command envelopes, WorkUnits, interaction runs,
  and model requests reference capabilities and budget profiles or carry bounded
  budgets. ModelRoleCertification and the gateway retain exact eligible deployment
  context. D005 defines versioned ReviewPolicy semantics and D007 defines
  RoutingPolicy, certification, egress, and multi-dimensional budgets. The
  generated contract inventory does not currently expose one canonical
  CapabilityGrant/ReviewPolicy/RoutingPolicy/BudgetProfile Settings composition
  or a generic policy command. Existing references cannot be reverse-engineered
  into editable rules by the client.
- **Requested read composition:** resolve one exact Project/profile and return
  effective privacy/data-access, capability, model/routing, Work-budget, and
  Review-policy sections. Each material value names its registered meaning,
  current revision/state, origin or policy owner, scope, effective/start/expiry
  position where supplied, freshness, limitations, history destination, and
  whether an exact typed operation exists for this actor. Return unavailable,
  expired, inherited, unknown, unsupported, and conflicting states rather than
  normalizing them into enabled/disabled.
- **Project selection and context:** contextual entry binds the originating
  Project. Direct global entry requires an explicit inspection target. A local
  Settings Project selector does not silently switch the active workspace,
  retarget Work, or alter ambient command context. Reads fail closed for missing,
  unauthorized, or unsupported Project/profile identity.
- **Model and budget behavior:** expose accountable role, route eligibility and
  certification basis, material provider/egress/fallback consequences, and exact
  supplied budget scope/measurement. Petra has no global model score or ambient
  provider preference. Local technical-detail disclosure does not invoke this
  contract or hide material origin. A routing change may choose only among
  permitted certified routes and cannot grant capability, raise egress, change
  ReviewPolicy, or lower validation requirements. Per-action scope, depth, and
  cost remain visible on the concrete Work request.
- **Requested transition mapping:** map each editable control to its owning typed,
  idempotent command and expected current revision. Return an exact before/after
  plan with Project, affected workflow/data/object scope, actor authority,
  effective time, expiry/pause where relevant, and effects on active and future
  Work. Do not create one universal `SetProjectSetting` operation merely for
  screen convenience. A form submission authorizes the exact shown operation;
  ask again only for unresolved consequential meaning or additional authority.
- **Prospective and active-work behavior:** policy changes apply prospectively
  unless the owning contract explicitly supplies a safe cutover. Preserve the
  policy, grant, routing, and budget references that existing Work/model calls
  actually used. Return affected active tasks and their real unchanged,
  checkpoint, completion, cancellation, or transition behavior. Settings cannot
  silently reroute, cancel, re-review, reclassify, or relabel prior records.
- **Conflict and recovery:** reject or replan a stale expected revision without
  discarding the author's proposed values. Compose per-operation outcomes and
  current effective state after partial, failed, duplicated, disconnected, or
  uncertain delivery. Reconcile before retry. A change in one policy must not be
  reported as success for unrelated controls in the same visual group.
- **Authority and persistence:** Project controls are canonical versioned state
  under their owning decisions and commands. The Settings surface owns
  disclosure, selection of an inspection target, and unsent form state only.
  Personal theme/layout/editor/accessibility/model-detail preferences remain
  device-local and cannot be written through this requirement. Project changes
  retain actor, command, approval where required, event, revision, and History.
- **Smallest viable response:** first compose read-only effective values from
  existing Project and registered control records, with exact unsupported fields.
  Enable only an already accepted typed transition and expose its result/history.
  Add the smallest missing query or record mapping needed for that path; do not
  invent all policy schemas or a universal editor to make the Settings page look
  complete.
- **Provisional boundary:** after freeze, synthetic read/command adapters may
  represent exact Project controls and outcomes under UX-FX32/33, declaring
  unsupported operations. They cannot accept arbitrary client settings or
  calculate permissions/routing locally. No contract, policy, or frontend
  implementation is created by this request.
- **Dependencies:** UX-REQ-001 shell context, UX-REQ-004 profile binding,
  UX-REQ-008 semantic destinations, UX-REQ-014/015 Work reads/transitions, and
  the accepted capability, Review, model-gateway, budget, rights/privacy,
  history, and command boundaries.
- **Owner and status:** product architecture and implementation track; Settings
  scope and presentation accepted, effective-control read/typed transitions
  `proposed`.

### `UX-REQ-021` — Profile-resolved communication plan and language-validation receipt

- **Originating design work:** DB15 and accepted `UX1.0-DISC08` (2026-09-07),
  sharpened by DB16's `UX1.0-DISC09` and `DB16-P03`; `DB15-P01`–`P11`, D006,
  `UX-FLOW-02`, `UX-FLOW-10`–`12`, and `UX-FLOW-16`.
- **Named post-freeze scenarios:** `UX-FX36`, extensible-profile communication
  conformance; `UX-FX37`, language, reference, and recovery stress; and
  `UX-FX40`, semantic-versus-visual explanation of the current graph.
- **Implementation links:** `M1.6` bounded model context and synthesis, `M1.7`
  interaction/delivery and application reads/actions, `M1.8` composition and
  rendering, plus `UX-REQ-004` and later profile communication contracts.
- **Author task and failure:** receive a response whose statements, references,
  rationale, limitations, recommendations, proposed actions, and reported
  outcomes retain their exact meaning across Project profiles, models, modules,
  streaming, history, and accessible presentation. Without a runtime-owned plan,
  a model or client could drop attribution, apply scientific force terms to an
  unrelated profile, turn advice into a prerequisite, present a proposal as an
  applied result, or release fluent but invalid text as grounded communication.
- **Existing contract check:** `petra.model-synthesist-output@1.0.0` supplies the
  scientific `source_report`, `petra_synthesis`, and `unresolved_inference`
  result. `petra.grounded-response@1.0.0` binds exact response bytes to artifact,
  dependency, execution, interaction, cache, and terminal context. Felicity
  revision records bind a language contract and prohibit silent force changes.
  AG-UI carries delivery through the accepted adapter boundary. Together these
  are valuable inputs, but they do not supply one profile-neutral,
  statement-level plan with generalized communicative acts, terminology and
  reference versions, action links, or validation and repair outcome.
- **Requested communication identity:** resolve the exact Project, profile,
  authoritative snapshot, thread, turn, and response identity. Bind the Petra
  communication contract plus applicable terminology, reference, discourse,
  prompt, response-schema, renderer, and validator versions. Historical reads
  retain the versions needed to interpret their original content and may expose
  a current replacement without rewriting the record.
- **Requested ordered plan:** return ordered material segments. Each segment
  names its shared communicative family and optional registered profile subtype,
  text or exact content reference, origin/actor, canonical object references,
  basis/dependencies, conditions, limitations and uncertainty, presentation
  depth, and any linked recommendation, suggested action, candidate, ChangeSet,
  command, or observed event. The shared families include attributed report,
  inference, recorded author judgment, Petra assessment, recommendation,
  clarifying question, action proposal, action report, uncertainty/limitation,
  and operational status. Profile extensions map to these families through
  `UX-REQ-004`; they cannot replace their force, attribution, authority, or
  recovery obligations.
- **Presentation-explanation behavior:** when a response explains a current
  visual or accessible presentation, bind the applicable `UX-REQ-022` context
  and state whether each material statement rests on canonical semantics,
  registered presentation state, or optional image observation. Preserve scene
  omissions, freshness, mismatch, capability, and privacy limits. Visual
  proximity, color, size, motion, or emphasis cannot silently become domain
  force, priority, causality, or authority.
- **Reference and historical behavior:** resolve user-facing references through
  the exact profile terminology/reference registry while retaining canonical
  identity. Carry first/later-reference or equivalent rules, ambiguity fallback,
  descriptor revision/replacement, source language, and locale coverage where
  applicable. Current and historical rendering cannot invent an ordinal, infer
  a label from a machine key, borrow another profile's taxonomy, or silently
  alter quoted/source bytes.
- **Action fidelity:** a recommendation or action proposal links to the exact
  eligible action revision and its real prerequisites, scope, consequences, and
  authority path. An action report links to the observed command/event/receipt
  and actual effect. Prose cannot create permission, invoke a command, approve a
  candidate, or claim completion independently of those records.
- **Validation and repair receipt:** return `passed`, `repaired`, or `blocked`
  status for the applicable communication/profile contract, with material
  findings and exact repair provenance. Repair may resolve registered terms,
  references, structure, or supported formatting without silently changing
  origin, force, basis, uncertainty, action, scope, or outcome. When no safe
  realization can validate, preserve validated segments and return an exact
  limited or failed result rather than ordinary fluent prose.
- **Progressive and fallback behavior:** expose segment availability and final,
  partial, invalid, repaired, limited, failed, and stopped-delivery state. A
  streamed segment does not become grounded merely because bytes arrived. Model
  fallback may change provider or eligible realization method while retaining
  the bound profile and communication meaning; incompatible fallback stops or
  reports its limitation.
- **Feedback boundary:** wording, reference/context, domain-meaning, and
  action-scope corrections retain distinct paths. Language feedback may produce
  a revised realization or audit record but cannot mutate Project authority or
  become training consent. Domain correction and action changes use their owning
  candidate/Review or action-preview contracts.
- **Authority and persistence:** this is a communication read/artifact and
  validation receipt around canonical domain, Work, action, and event records,
  not a new mutation authority. The server/runtime owns plan identity, bindings,
  action links, validation state, and historical interpretation; the client owns
  presentation disclosure and local reading state. AG-UI transports progressive
  delivery but does not define speech-act semantics or validation.
- **Smallest viable response:** add an additive communication-plan view or
  artifact around the existing scientific model-synthesist and grounded-response
  records, mapping their current speech acts into the generalized families and
  returning honest unsupported fields. Do not edit accepted schemas in place or
  claim arbitrary-profile coverage from scientific-only fields. Add the smallest
  terminology/reference and validation receipt necessary for one bounded answer
  and one linked recommendation/action report, then assign remaining profile,
  locale, repair, or renderer work to named milestones.
- **Dependencies:** `UX-REQ-003` exact action preview/invocation, `UX-REQ-004`
  profile terminology/discourse registry, `UX-REQ-006` thread/turn context,
  `UX-REQ-008` semantic destinations, `UX-REQ-011`/`012` candidate and Review
  authority, `UX-REQ-014`/`015` Work state/actions, existing response, Felicity,
  command/event, model-gateway, and AG-UI adapter boundaries; current visual
  explanations additionally depend on `UX-REQ-022`.
- **Owner and status:** product architecture and implementation track; DB15 UX
  language direction accepted, communication-plan and validation-receipt shape
  `proposed`.

### `UX-REQ-022` — Model-readable presentation context and semantic-peer binding

- **Originating design work:** DB16 and accepted `UX1.0-DISC09` (2026-09-07),
  especially `DB16-P02`, `DB16-P03`, and `DB16-P12`; D013's Petra-owned AG-UI
  adapter and non-authoritative state boundary.
- **Named post-freeze scenarios:** `UX-FX38`, task/outcome equivalence;
  `UX-FX39`, accessibility and generated-interface pressure; and `UX-FX40`,
  model explanation of the current visible graph.
- **Implementation links:** `M1.3` graph result/projection identity, `M1.6`
  bounded model context and explanation, `M1.7` workbench presentation and
  interaction state, plus `UX-REQ-006`, `UX-REQ-013`, and `UX-REQ-021`.
- **Author task and failure:** ask Petra what the current graph or another
  complex presentation shows and receive an accurate explanation of both its
  semantic content and visible organization. Without an exact binding, the
  model could describe a stale layout, infer domain meaning from color or
  proximity, overlook filtered/restricted members, or interpret an unrelated
  screenshot while presenting the answer as current graph fact.
- **Existing contract check:** D013 permits disposable/reconstructable selected-
  object, active-panel, focused-path, partial-rendering, and interaction state
  behind `PetraInteractionClient`. The interaction feature manifest supports
  state projection, snapshots/deltas, messages, and registered non-authoritative
  custom events. Proposed `UX-REQ-013` supplies renderer-neutral graph meaning
  and the semantic peer while assigning layout and selection to the client.
  ContextPacket and `UX-REQ-006` bind bounded model input and turn context.
  None currently binds one exact author-visible scene and optional capture to
  its semantic result, accessible peer, model call, and validated explanation.
- **Requested presentation identity:** create or compose a versioned bounded
  presentation-context record with stable identity/revision/hash, Project,
  profile and terminology/descriptor versions, authoritative snapshot and graph
  projection position, route/surface, source view/query/result, semantic-peer
  reference, renderer/layout version, producing client/session, and captured-at
  time. The record is immutable once used by a model call or historical turn.
- **Requested scene content:** include the author-visible question and scope;
  layers and limits; visible ordered object and relationship references; exact
  profile labels and legend mappings; selection/focus/pin/expansion/collapse;
  groups, filters, comparisons, emphasis, hidden counts, partial coverage, and
  material omissions; layout family, meaningful order, rendered positions or
  regions, clusters, overlap/crossings, and viewport clipping that are actually
  present; and available Details, source, expansion, Work, Review, History, and
  return actions. Scene fields describe presentation only and link back to the
  canonical semantic records that establish meaning.
- **Accessible-peer binding:** identify the complete task-equivalent outline,
  path table, relationship summary, legend, and actions generated from the same
  semantic result. Record parity-validation status and material discrepancies.
  An inaccessible hidden DOM mirror or unvalidated prose summary does not count
  as the peer and is not sent as authoritative context.
- **Optional visual capture:** where a permitted vision-capable route materially
  improves explanation, bind an exact image/render Artifact reference, byte hash,
  dimensions/scale, viewport, theme, capture revision/time, source application,
  and privacy/redaction/rights/egress disposition. Capture excludes unrelated
  panels, unsent input, restricted objects/counts, and secrets. A model cannot
  request broader screen capture merely for convenience.
- **Model-context behavior:** compile only the smallest scene needed for the
  author's question and bind it to the model call, role/certification, capability,
  provider/egress, cost/budget, prompt, communication, and validator revisions.
  A semantic-only model receives the scene and peer without a false image claim.
  A vision-capable model may additionally inspect the bound capture. The response
  plan under `UX-REQ-021` labels graph semantics, registered visual-state facts,
  and image observations distinctly.
- **Validation and mismatch behavior:** verify Project/profile/snapshot/query,
  scene, peer, capture, and model-call bindings before release. Reject or limit
  stale, mixed-revision, incomplete, unauthorized, unregistered-renderer, or
  mismatched context. If scene and capture differ, retain the canonical semantic
  explanation, name the unavailable current-layout explanation, and refresh only
  with the author's existing permitted context. Do not repair mismatch by
  guessing from pixels.
- **AG-UI behavior:** carry a registered Petra context reference or bounded
  snapshot/delta through the adapter; feature components and models do not parse
  raw protocol events as semantics. Replay deduplicates the context and model
  request, and a connection abort cannot mutate the graph or cancel Work. A
  custom event remains versioned, allowlisted, and `authority_effect: none`.
- **Authority and persistence:** presentation context records what the author
  could see at one moment. It cannot create or alter graph facts, profile meaning,
  selection authority, permissions, Work, Review, or commands. The runtime owns
  canonical semantic/query identity and access; the client supplies validated
  presentation state; the interaction/model boundary owns context use and receipt.
  Retention follows thread/model-trace, privacy, redaction, and audit policy and
  does not require keeping every transient scene or screenshot indefinitely.
- **Recovery and unavailable behavior:** when exact current context cannot be
  composed, Petra offers a semantic explanation of the bound graph result, asks
  the author to refresh/share the current registered view where necessary, or
  states that it cannot explain the current visual arrangement. Existing task,
  selection, input, and return state remain available. The product does not fall
  back to an ambient route, old screenshot, or unrestricted screen inspection.
- **Smallest viable response:** extend one current `UX-REQ-013` scientific graph
  result with an additive non-authoritative scene record for layout, visible
  membership, selection, grouping, legend, viewport, and semantic-peer identity;
  bind that record to one `UX-REQ-006` turn and `UX-REQ-021` explanation. Begin
  with semantic-only explanation and add a permitted capture only where a named
  visual question requires it. Do not edit accepted graph, ContextPacket, AG-UI,
  or grounded-response schemas in place or claim general screen understanding.
- **Dependencies:** `UX-REQ-004` profile terminology/descriptors, `UX-REQ-006`
  turn context, `UX-REQ-008` destinations, `UX-REQ-013` semantic graph result,
  `UX-REQ-021` communication/validation, D007 model routing/privacy/egress,
  D013 AG-UI containment, and existing Artifact/access/redaction boundaries.
- **Owner and status:** product architecture and implementation track; DB16
  task-equivalence and current-graph explanation direction accepted,
  presentation-context/peer/capture binding shape `proposed`.

### `UX-REQ-023` — Canonical recovery assessment and exact-action composition

- **Originating design work:** DB17 and accepted `UX1.0-DISC10` (2026-09-07),
  especially `DB17-P01`–`P10` and `DB17-P13`; `UX-FLOW-11`, `UX-FLOW-12`,
  `UX-FLOW-15`, and `UX-FLOW-16`.
- **Named post-freeze scenarios:** `UX-FX41`, cross-module preservation and
  exact return; `UX-FX42`, uncertain/mixed/offline/race recovery; and `UX-FX43`,
  local conflict, History, delivery, and reversal.
- **Implementation links:** `M1.1` command/event/Work/artifact foundations,
  `M1.2` durable authority and persistence, `M1.3` projection status, `M1.5`
  Review/commands/reversal, `M1.7` cancellation/interaction replay, `M1.8`
  composition/revision/publication, `M1.9` infrastructure recovery, and
  `UX-REQ-006`–`022` where their records participate.
- **Author task and failure:** after an interrupted read, response, Work task,
  save, Review action, command, projection, export, policy change, or service
  failure, determine what actually happened and act safely without reconstructing
  mismatched records or repeating an effect. Existing mechanisms establish their
  own outcomes but no accepted product contract composes effect knowledge,
  preserved state, member outcomes, eligible owning actions, and exact return.
- **Existing contract check:** command envelopes/events carry stable command and
  idempotency identity; independently atomic ChangeSets and compensating reversal
  retain exact effects; WorkUnit/manifests and cancellation receipts retain
  operational lifecycle; InteractionRun/events/connections retain replay and
  delivery; projection checkpoints/outbox retain derived freshness; composition,
  DraftArtifact, support-assessment, RenderedArtifact, ArtifactStore, and
  delivery records retain content and publication stages. `UX-REQ-007`, `014`,
  `015`, `018`, and `019` request the applicable author-facing reads/actions.
  None of these is a universal failure ledger, and no client or model may infer
  one from display state.
- **Requested assessment identity:** accept authenticated actor/Project, one
  recovery subject and task/origin context, the attempted operation/action/input
  identity when available, expected revisions/snapshot, last known client
  observation, locally retained-state declaration with integrity/storage scope,
  and requested recovery purpose. Return a versioned, immutable assessment with
  stable ID/hash, reconciliation time, producer/rules version, observation cutoff,
  source-record references, coverage, freshness, and privacy/redaction outcome.
- **Recovery subjects:** support registered typed references to a route/read,
  interaction run/connection, Work task/attempt/input request, candidate/Review
  batch/ChangeSet/command, projection, document/local edit/save, artifact/render/
  export/delivery, source/access/capability, policy transition, or service/integrity
  incident. New profile types map through registered subject and action roles;
  they do not create an arbitrary stringly typed recovery API.
- **Requested effect classification:** derive exactly one top-level state from
  source records: `no_effect_confirmed`, `effect_confirmed`, `in_progress`,
  `mixed_outcomes`, `outcome_unknown`, or `unavailable_to_verify`. Include the
  meaning and applicable boundary, exact resulting identities/revisions/receipts,
  pending observations, and verification limitations. A timeout, absent projection,
  old browser state, or model statement cannot establish no effect. Mixed outcome
  requires independently atomic members and a complete or explicitly partial
  per-member accounting.
- **Requested preservation inventory:** identify durable task/input/output,
  candidate/approval, saved revision, immutable artifact, prior authoritative
  state, recoverable local/session-only input, partial usable or diagnostic-only
  result, view/selection/focus/return context, unavailable content, and confirmed
  loss. Every item carries identity, revision/hash where applicable, durability,
  accessibility/privacy disposition, validation/usability state, and the record
  or client assertion establishing it. Client-held state remains non-authoritative
  until an owning save/export acknowledges exact content.
- **Requested member outcomes:** for a Review batch, multi-format export, staged
  task, or other registered composite, return each independent member's exact
  applied/completed/failed/conflicted/cancelled/pending/unknown/delivery state,
  authority effect, retained result, recovery eligibility, and reason. Aggregate
  counts state their unit, coverage, overlap/grouping, and unknowns and are derived
  from members. A single atomic ChangeSet cannot be represented as partly applied.
- **Requested action composition:** return zero or more registered action
  descriptors with shared semantic roles such as check status, refresh,
  reconnect, replay response, retry, resume, start again, restore local work,
  reconcile, regenerate preview, revalidate, retry delivery, Revert, or return.
  Each descriptor names the owning query/command/adapter, exact target and
  expected revision, input/reuse behavior, idempotency or new-attempt identity,
  eligibility basis/time, consequence, authority and History effect, cost/limit,
  required input/authorization/confirmation, and success/failure destination.
  The assessment cannot execute the action, synthesize a generic command, or
  treat a model recommendation as eligibility.
- **Ordering and primary-action behavior:** select a suggested primary action
  only from current eligible descriptors using a versioned product rule and
  explain why it is safest for the author's task. Reading/checking status precedes
  any unsafe repetition while effect is unknown. Another eligible action remains
  available without override language. New facts, access, or revisions invalidate
  the affected descriptor and require reassessment.
- **Local conflict behavior:** accept client-held content only with its explicit
  Project/object/base, local identity/hash, time, and storage scope. Compose
  base/local/current comparison facts from `UX-REQ-018` without declaring the
  local copy saved. Preserve both available sides; saving separately, updating
  current, exporting, or discarding remains an owning action with current
  eligibility. Do not implement a collaborative merge algorithm in this record.
- **Connection and Work behavior:** correlate interaction delivery with the
  exact durable Work observation. Reconnect/replay descriptors reuse the run and
  checkpoint and have no Work or authority effect. Retry/resume/start-again and
  cancellation descriptors come only from `UX-REQ-014`/`015` and accepted Work
  commands. Cancellation requested, provider interruption, terminal Work, retained
  output, and completion-winning races remain separately observable.
- **Command/projection behavior:** correlate command/idempotency, receipt/event,
  target revision, approval/manifest, and projection checkpoint. Exact command
  redelivery can be eligible only under its owning idempotency contract. A
  committed effect with lagging projection offers projection catch-up or an
  authoritative read; it never offers the producing domain command as repair.
- **Output/delivery behavior:** distinguish generation/render, byte storage,
  Artifact/publication linkage, browser/clipboard observation, and confirmed
  external receipt. A delivery retry references exact retained output; regeneration
  is a distinct action and identity. Partial members and prior irreversible
  disclosure remain visible after cancellation or failure.
- **History and receipt behavior:** link the assessment and any chosen action/
  outcome to the permitted causal episode under `UX-REQ-007`. Reconciliation
  reads do not create domain history, though an operational assessment/incident
  receipt may be retained according to policy. Any save, retry attempt, resume,
  fresh Work, revalidation, delivery, conflict resolution, or compensation uses
  its existing additive record. Do not introduce a second canonical event ledger.
- **Privacy, access, and integrity:** authorize every source record and resulting
  descriptor at assessment and invocation time. Restricted objects, member counts,
  prior values, and relations remain undisclosed. If a source is unavailable,
  corrupt, mixed-revision, or outside retention, return `outcome_unknown` or
  `unavailable_to_verify` with the safe limitation. A model cannot fill gaps or
  transform reconstructed content into a recovery fact.
- **Return behavior:** supply exact origin route/surface, task/object, current or
  historical identity, selection/range, scroll/reading/focus anchor, linked
  thread/Work, and safe semantic destination. Resolve it through `UX-REQ-008` at
  use time. When the exact target is unavailable, return the permitted replacement,
  stable parent, or Brief with a machine-readable and user-facing reason; never
  fall back to ambient selection.
- **AG-UI and model behavior:** the Petra interaction adapter may carry the
  assessment/reference, progressive reconciliation status, and selected registered
  action. Replay cannot invoke it again. `UX-REQ-021` lets the model explain
  exact facts and alternatives; the model receives no raw secrets or capability
  authority and cannot construct executable UI/actions outside the allowlist.
- **Smallest viable response:** compose one lost-delivery Apply example across
  an exact ChangeSet command/event and projection checkpoint, plus one failed
  Work/replay example and one local-save conflict. Return effect, preservation,
  eligible existing actions, and exact return without adding a universal mutation
  endpoint. Expand subject families only as their owning reads and commands can
  supply truthful state.
- **Provisional post-freeze boundary:** a synthetic application provider may
  produce versioned recovery assessments and registered action descriptors for
  `UX-FX41`–`43`. It must label unavailable runtime fields and delegate every
  action to a named synthetic owning adapter. Feature components and models
  cannot calculate authority or fabricate receipts. This request creates no
  schema, command, fixture, backend implementation, or product surface.
- **Dependencies:** `UX-REQ-004` profile semantics, `UX-REQ-006` interaction
  context, `UX-REQ-007` History/reversal, `UX-REQ-008` destinations,
  `UX-REQ-009`/`010` source state, `UX-REQ-012` Review, `UX-REQ-014`/`015` Work,
  `UX-REQ-017`–`019` Composition/edit/export, `UX-REQ-020` Project controls,
  `UX-REQ-021` language/validation, existing command/event/capability/artifact/
  projection/replay/cancellation contracts, and operational restore evidence.
- **Owner and status:** product architecture and implementation track; DB17
  reconciliation/preservation/return direction accepted, recovery-assessment
  and action-composition shape `proposed`.

## DB18 request-ledger closure

DB18's traceable implementation-packet format was accepted on 2026-09-07 as
`UX1.8-DISC02`. Its fourteen surface entries, 18 flow families, and four named
end-to-end paths consume the requests above without adding a backend concept.
No `UX-REQ-024` is needed for the paper design.

| Dependency group | Requests | Blueprint consumers and disposition rule |
| --- | --- | --- |
| Product context and action | `UX-REQ-001`–`004`, `008` | Projects, shell, Brief, routed places, SuggestedActions, profile meaning, and safe destinations; implementation exposes missing or unsupported state until each shape is accepted or mapped |
| Lineage, interaction, and History | `UX-REQ-005`–`007` | Sources, Petra, Work, Review, Composition, History, and exact return; imported ancestry, thread context, causal history, and compensation retain separate authority |
| Sources, working meaning, Review, and Graph | `UX-REQ-009`–`013` | Source collection/reader, Details, Petra, Review, and Graph; clients cannot infer exact inspection, candidate authority, Review eligibility, path completeness, or omissions |
| Work and Project inquiry | `UX-REQ-014`–`016` | Shell attention, Brief, Petra, Work, Graph, and profile tools; lifecycle, advice, operational priority, and inquiry resolution remain distinct |
| Composition, controls, and communication | `UX-REQ-017`–`021` | Composition, Settings, Review, Petra, output/delivery, and every authored statement; saving, validation, promotion, rendering, delivery, policy, and language validation retain exact identities |
| Presentation understanding and recovery | `UX-REQ-022`–`023` | Graph/semantic peers, Petra explanation, and every adverse packet; the model receives bound semantic/scene context and recovery composes owning facts without creating authority |

A post-freeze synthetic provider may implement an explicitly provisional shape
for an unresolved request and label unavailable fields. No consuming surface may
claim `G-CONTRACT` until architecture accepts the request, replaces it with an
equivalent smaller composition, maps it to an existing contract, or records a
safe deferral. Rejection without an equivalent safe path reopens the affected
source specification instead of moving the missing fact into client or model
logic.

No request above authorizes a demo adapter, demo-specific schema, or corpus
import. The neutral product contracts must be accepted before those separate
integration requests are written.

## Existing contracts expected to satisfy the flow map

The design track found no reason to replace these accepted control boundaries.
They are the shared authorial mechanics, regardless of Project profile:

| Need | Existing implementation direction |
| --- | --- |
| Immutable source and exact revision identity | Artifact, ArtifactManifest, source hashes, and additive revision records from `M1.1`/`M1.2` |
| Proposal, correction, exact preview, Apply, conflict, and Revert | ChangeSet, Approval, ReviewBatch, and additive event path in `M1.5` |
| Durable conversation-derived working candidates and relationships | Proposed `UX-REQ-011`; existing bounded model records and evidence candidates remain inputs, not a generic working graph contract |
| Profile-neutral Review session, comparison, deferment, separation, and member recovery | Proposed `UX-REQ-012`; current M1.5 evidence review remains the scientific contract foundation |
| Presentation history, authorized Project History, and compensation plan | Proposed `UX-REQ-007`; graph exploration history remains client presentation state while durable causal episodes come from owning records |
| Semantic object location, replacement, and safe fallback | Proposed `UX-REQ-008`; the client retains route and layout ownership |
| Project source collection and exact-inspection read composition | Proposed `UX-REQ-009`; existing Artifact, rights, parse, and selector records retain authority |
| Project-source membership, governed removal, and local-copy retention/deletion | Proposed `UX-REQ-010`; Project linking and content-addressed storage remain separate lifecycles |
| Durable task state and explicit cancellation | WorkUnit and worker manifests from `M1.1`, persistence in `M1.2`, interaction in `M1.7` |
| Project Work collection, task stages, input/result summaries, and reconciled activity | Proposed `UX-REQ-014`; existing WorkUnit, manifests, cancellation, and interaction records retain operational authority |
| Direct Work steering, contextual branch priority, validated reuse, and safe plan transition | Proposed `UX-REQ-015`; existing immutable inputs, operational commands, dependency rules, and cancellation retain their boundaries |
| Project lines of inquiry beyond Hypotheses, with exact basis and zero/many/shared Work links | Proposed `UX-REQ-016`; profile-owned reasoning contexts remain distinct from Work execution and its lifecycle |
| Document-first Composition and exact contextual reads | Proposed `UX-REQ-017`; existing scientific composition aggregates are the foundation, with profile/ancestry mappings still required |
| Continuous working-copy edits, exact saves, late-proposal reconciliation, and assessment binding | Proposed `UX-REQ-018`; current exact-span revision and reuse contracts remain intact until architecture disposition |
| Exact working-copy export with scoped limitations and observable delivery | Proposed `UX-REQ-019`; rendering/storage, support reuse, profile promotion, and external delivery retain distinct boundaries |
| Effective Project controls and typed policy transitions in Settings | Proposed `UX-REQ-020`; personal preferences remain local while Project privacy, capability, routing, budget, and Review controls retain their owning authority |
| Profile-resolved object and relation visual semantics | Existing proposed `UX-REQ-004`, sharpened by DB14; the manifest may name bounded semantic descriptor references while Petra owns shared tokens, components, state/authority cues, accessibility, and safe fallback |
| Profile-resolved communication plan, action linkage, and language validation | Proposed `UX-REQ-021`; existing scientific synthesis, grounded-response, Felicity revision, command/event, and AG-UI records remain inputs while profile terminology/discourse is resolved through `UX-REQ-004` |
| Model-readable current presentation and semantic-peer binding | Proposed `UX-REQ-022`; bind exact graph/view semantics, current client-owned scene, complete accessible peer, optional permitted capture, model context, and explanation without making pixels or AG-UI state authoritative |
| Canonical cross-module recovery assessment and exact eligible actions | Proposed `UX-REQ-023`; compose owning records into effect, preservation, member outcomes, registered recovery choices, History consequence, and exact return without creating a universal recovery command or second ledger |
| Current/cached/new evidence boundary | ContextPacket and EvidencePacket from `M1.1`, retrieval path in `M1.6` |
| Assistant stream, interrupt, reconnect, and replay | PetraInteractionRun and AG-UI adapter boundary from `M1.0`/`M1.1`, product hooks in `M1.7` |
| Projection freshness | GraphProjectionRecord and ProjectionCheckpoint from `M1.1`, delivery in `M1.3`/`M1.5` |
| Bounded relationship scope, paths, omissions, working membership, and temporal comparison | Proposed `UX-REQ-013`; existing projection and domain records remain inputs, and the renderer remains presentation only |
| Grounded composition and human revision | DraftArtifact, ProvenanceMap, CitationBundle, and renderer path in `M1.8` |

Profile contracts should specialize the domain objects, predicates, validators,
and outputs attached to these mechanics. They should not duplicate Work,
interaction, proposal, review, approval, cancellation, provenance, or history
lifecycles merely because the profile uses different nouns.

## Requirement status after DB18

The authored-project, imported-document, Project-thread, exact turn-context,
governed-reversal, semantic-location, Project-source-view, source-lifecycle,
conversational-working-graph, profile-neutral Review, bounded relationship-view,
Work-presentation, Work steering/branch-priority, and Project inquiry questions are no
longer candidate design ideas; their accepted UX requirements are `UX-REQ-004`
through `UX-REQ-016`. Their backend shapes remain proposed until the required
architecture, contract, and retention dispositions.

DB11's accepted direct-steering and advisory branch-order behavior is recorded in
`UX-REQ-015`. `UX-REQ-014` supplies its read composition; neither request claims
that the generic operational transition is implemented.

The subsequent accepted inquiry clarification is `UX-REQ-016`. It places the
author's parallel reasoning lines at Project level and limits `UX-REQ-015` to
the execution behavior of concrete Work tasks undertaken for those inquiries.

DB12's document-first and working-copy export directions are accepted as
`UX1.7-DISC01`/`DISC02`. `UX-REQ-017`–`UX-REQ-019` record workspace, authoring,
and export gaps. DB12 closes its specification gate with paper paths/audit and
post-freeze scenarios; none of these runtime mappings is implemented or closed.
Saving, support assessment, profile promotion, rendering, and delivery retain
their separate outcomes and authority. No new Project policy is inferred from
a personal preference.

DB13's personal-preferences-first organization and discoverable, exactly scoped
Project controls are accepted as `UX1.1-DISC06`. `UX-REQ-020` requests the
missing effective-control read and typed transition mapping; it does not propose
a universal settings command. Appearance, layout, editor, accessibility, and
technical-detail disclosure remain device-local presentation state. Privacy,
capability, routing, budget, and Review controls retain their exact Project,
policy, actor, revision, and prospective-effect boundaries. DB13 closes at
`G-SPEC`; runtime and participant evidence remain pending.

DB14's one-Petra-grammar direction is accepted as `UX1.0-DISC07`. It creates no
new backend requirement. `UX-REQ-004` now explicitly includes bounded semantic
presentation descriptors for registered profile object and relation kinds, with
exact labels, approved references, version/replacement behavior, and generic
fallback. Petra retains themes, tokens, components, interaction and authority
cues, rendering, and accessibility. DB14 closes at `G-SPEC`; profile-manifest,
implementation, accessibility, visual-regression, and participant evidence
remain pending.

DB15's one-communication-contract/profile-owned-discourse direction is accepted
as `UX1.0-DISC08`. It sharpens `UX-REQ-004` with terminology, reference,
relation/force, discourse, locale, replacement, and fallback metadata and creates
`UX-REQ-021` for the missing profile-neutral statement-level communication plan
and validation receipt. Existing scientific model-synthesist output,
grounded-response bytes, Felicity revision records, command/event authority, and
AG-UI delivery retain their current meanings. DB15 closes at `G-SPEC`; contract,
implementation, model, localization, accessibility, and participant evidence
remain pending.

DB16's task/outcome-equivalence direction and model-readable current-graph
requirement are accepted as `UX1.0-DISC09`. Native semantics, keyboard/focus,
reflow, targets, non-color meaning, motion, live announcements, and most peer
presentation behavior remain frontend responsibilities over canonical view and
command contracts. `UX-REQ-022` requests the missing exact binding among a
semantic result, author-visible presentation scene, complete accessible peer,
optional permitted capture, model call, and validated explanation. It sharpens
`UX-REQ-006`, `UX-REQ-013`, and `UX-REQ-021` without making AG-UI state or pixels
authoritative. DB16 closes at `G-SPEC`; implementation, browser/AT, model,
performance, legal, and participant evidence remain pending. DB17 carries those
accessibility and presentation-context boundaries into recovery below.

DB17's canonical-reconciliation, preserved-state, and exact-return direction is
accepted as `UX1.0-DISC10`. Existing idempotent command, atomic ChangeSet,
reversal, Work/cancellation, interaction replay/delivery, projection, composition,
revision, publication, and infrastructure-recovery records retain their own
authority. DB17 sharpens `UX-REQ-007`, `UX-REQ-014`, `UX-REQ-015`,
`UX-REQ-018`, and `UX-REQ-019`. Proposed `UX-REQ-023` requests the missing
cross-module assessment that composes exact source observations into effect
knowledge, preserved/lost state, independent-member outcomes, currently eligible
owning actions, History consequence, and safe return. It creates no universal
recovery command or alternate ledger. DB17 closes at `G-SPEC`; runtime,
offline/browser, race, disaster-recovery, accessibility, performance, security,
and participant evidence remain pending.

DB18's traceable implementation-packet direction is accepted as
`UX1.8-DISC02`. It maps every accepted surface and flow to
`UX-REQ-001`–`023`, finds no additional backend need, and keeps every unresolved
runtime shape visible as a contract or implementation gate. DB18 closes at
`G-SPEC`; the pending design-freeze decision does not accept a runtime request
or claim integration evidence.

### Cross-device preference synchronization

The current layout and accessibility preferences are local presentation state.
Account synchronization would require identity, persistence, conflict, and
privacy decisions. The flow map does not require it for M1.

## Requested implementation-track response

For each proposed request, record one of:

- accepted with contract and implementation item;
- accepted in smaller form with the replacement shape;
- already supplied by a named contract or query;
- deferred to a named milestone with a safe fixture boundary;
- rejected with rationale and the UX constraint that must change.

The design track will not claim live integration or `G-CONTRACT` for the shell,
Brief, SuggestedAction, Project-profile, imported-document, Project-thread,
governed-reversal, semantic-location, Project-source-view, source-lifecycle,
conversational-working-graph, profile-neutral Review, bounded relationship-view,
composed Work-presentation, generic Work-steering, Project inquiry, or Composition
workspace/authoring/export, Project-control Settings, profile-resolved
communication, model-readable presentation, or cross-module recovery flows until
the applicable requests have an explicit disposition.
