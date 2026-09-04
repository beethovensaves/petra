# UX-to-implementation requirements handoff

Status: proposed requests awaiting implementation-track review
Date: 2026-09-03
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
`UX-REQ-010` as general architecture needs and return a disposition without
using either contextual project as the contract fixture. `UX-REQ-006` through
`UX-REQ-010` follow the accepted Petra interaction, navigation, and Sources
design; they do not authorize a frontend implementation before the design
freeze.

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

- **Originating design work:** accepted `UX1.0-DISC05`; use-agnostic kernel section of `UX-FLOW-ARCHITECTURE.md`; `UX-PATH-02` and `UX-PATH-04`.
- **Named fixture need:** `UX-FX15`, paired synthetic scientific-research and controlled-writing Projects that expose the same shell, Work, proposal, review, provenance, approval, cancellation, promotion, and history mechanics while resolving different typed domain objects, relationships, validators, and vocabulary. Neither fixture is derived from a future demo corpus.
- **Implementation links:** accepted `M1.1-W02` and `M1.1-W13`; `M1.2-W01`; `M1.7-W01`–`W12`; later controlled-writing domain contracts. The existing `petra.project@1.0.0` schema must not be edited in place.
- **Project-author task and failure:** open either a scientific or complex controlled-writing Project and see the right concepts, relationships, validation tools, and language without entering a different product or losing Petra's controls. Without a server-owned profile boundary, shared components will hard-code science, clients will invent semantic aliases, or narrative constraints will be stored as scientific Claims.
- **Requested contract behavior:** every Project resolves one immutable, versioned profile binding and one registered profile manifest. The manifest names:
  - stable profile identity and version;
  - registered domain schema, object-kind, relationship, command, event, validator, and output references;
  - registered model-context, prompt, tool, and role references applicable to the profile;
  - semantic surface roles and their user-facing terminology;
  - supported task families, views, and profile tools;
  - the profile-specific Brief payload schema;
  - compatibility, replacement, and unsupported-version behavior.
- **Shared-kernel rule:** Project, Artifact, source revision, WorkUnit, candidate/proposal, ChangeSet, review/approval, capability, provenance, projection, event, interaction, cancellation, promotion, and history mechanics retain the same authority meanings. A profile adds typed domain meaning; it cannot inject executable client code, create a second command envelope, or bypass policy and approval.
- **Model-adaptation rule:** every material assistant interaction and Work input binds the Project profile and applicable schema, terminology/prompt, tool, role, and validator revisions. The model gateway may route a provider according to D007, but returned objects must validate against the active profile before entering its ordinary proposal and review path. Profile selection cannot grant a capability, broaden tool access, or authorize an output.
- **Authority and persistence:** the profile binding is authoritative Project state, not a theme or local setting. Creation and any permitted migration use typed, idempotent commands and additive events. Reads fail closed for unknown or unsupported profiles. Profile and terminology versions are retained on material outputs and decisions where interpretation depends on them.
- **Smallest viable response:** preserve `petra.project@1.0.0`; propose either an additive versioned profile-binding record or a new compatible Project schema version; register the scientific profile; expose its reference through shell and Brief views; and define the contract extension point against which the controlled-writing fixture can be built pending its ontology. Do not claim controlled-writing integration from a vocabulary-only manifest.
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

- **Originating design work:** accepted `DB06` and `UX1.6-DISC01`;
  `UX-FLOW-10`, `UX-FLOW-11`, and `UX-FLOW-16`.
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
  revisions, response status, and created outputs.
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

### `UX-REQ-007` — bounded graph history and governed Project reversal

- **Originating design work:** accepted `DB06` and `UX1.6-DISC01`;
  `UX1.4-W05`, `UX1.4-W11`, `UX1.5`, `UX1.6-W15`, `UX-FLOW-12`, and
  `UX-FLOW-16`.
- **Named fixture need:** `UX-FX18`, a synthetic Project with more than ten
  applied changes, an independent ten-state graph exploration trail, one safe
  single-step reversal, one contiguous multi-step compensation preview, one
  dependency-conflicted change, and one ineligible change. It contains no
  contextual demo material.
- **Implementation links:** `M1.3` graph projection, `M1.5` commands,
  ChangeSets, approvals, events, and projection status, and `M1.7` workbench
  integration.
- **Project-author task and failure:** back out of an unhelpful graph exploration
  or reverse a wrong Project path without believing that a visualization action
  mutates authority or that Revert erases an earlier decision. The current M1
  command envelope exposes submit, approve, and apply behavior but does not yet
  establish the complete reversal-planning and eligibility boundary required by
  this UX.
- **Graph-view behavior:** the client owns the ten most recent meaningful view
  snapshots for task scope, depth, expansion, filters, layout, viewport,
  temporal position, and selection. **Back in graph** and **Forward in graph**
  restore those snapshots without issuing a domain command. Cytoscape and
  Reagraph render controlled state; neither owns Project history.
- **Requested read shape:** return the ten most recent eligible author-visible
  Project changes in **Recent changes**, ordered newest first, with stable command,
  actor, time, target, summary, current eligibility, ineligibility reason,
  dependency-impact summary, and full-history link. Ten limits the quick window,
  not authoritative event retention.
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
  hidden restoration of prior state. Immutable source revisions remain
  immutable.
- **Projection behavior:** graph and textual views may compare the current and
  proposed compensated states, but PostgreSQL command/event authority decides
  eligibility and result. A historical graph is marked as historical and has a
  visible **Return to current** path.
- **Smallest viable response:** identify whether the planned M1.5 Revert path
  already supplies single-step eligibility, impact preview, compensation, and
  idempotency. Record the additive query/command/event work needed for any gap;
  multi-step compensation may be deferred to a named milestone if single-step
  behavior and the ten-item read window remain extensible.
- **Owner and status:** product architecture and implementation track; UX
  requirement accepted, runtime shape `proposed`.

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
| Recent reversible-change query and compensation plan | Proposed `UX-REQ-007`; graph exploration history remains client presentation state |
| Semantic object location, replacement, and safe fallback | Proposed `UX-REQ-008`; the client retains route and layout ownership |
| Project source collection and exact-inspection read composition | Proposed `UX-REQ-009`; existing Artifact, rights, parse, and selector records retain authority |
| Project-source membership, governed removal, and local-copy retention/deletion | Proposed `UX-REQ-010`; Project linking and content-addressed storage remain separate lifecycles |
| Durable task state and explicit cancellation | WorkUnit and worker manifests from `M1.1`, persistence in `M1.2`, interaction in `M1.7` |
| Current/cached/new evidence boundary | ContextPacket and EvidencePacket from `M1.1`, retrieval path in `M1.6` |
| Assistant stream, interrupt, reconnect, and replay | PetraInteractionRun and AG-UI adapter boundary from `M1.0`/`M1.1`, product hooks in `M1.7` |
| Projection freshness | GraphProjectionRecord and ProjectionCheckpoint from `M1.1`, delivery in `M1.3`/`M1.5` |
| Grounded composition and human revision | DraftArtifact, ProvenanceMap, CitationBundle, and renderer path in `M1.8` |

Profile contracts should specialize the domain objects, predicates, validators,
and outputs attached to these mechanics. They should not duplicate Work,
interaction, proposal, review, approval, cancellation, provenance, or history
lifecycles merely because the profile uses different nouns.

## Remaining candidate requirement

The authored-project, imported-document, Project-thread, exact turn-context,
governed-reversal, semantic-location, Project-source-view, and source-lifecycle
questions are no longer candidates; their accepted UX requirements are
`UX-REQ-004` through `UX-REQ-010`. Their backend shapes remain proposed until
the required architecture and retention dispositions.

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
governed-reversal, semantic-location, Project-source-view, or source-lifecycle
flows until the applicable requests have an explicit disposition.
