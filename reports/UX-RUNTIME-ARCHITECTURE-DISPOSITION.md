# UX runtime architecture disposition and implementation sequence

Current execution amendment — 2026-10-07: the
[A1 function ledger](FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md) controls remaining
implementation order, dependencies and completion. All required A1 functions
must complete before product delivery Wave 7 or Wave 8. The architecture waves
described historically below are subsystem sequencing, not permission to
advance those product delivery waves. Retained backend evidence is preserved;
the inspected frontend remains rejected. The sixteen supplementary scenario
groupings are optional during FE-A1.7 and do not control release.

Status: implementation-track review complete; M1.9 cumulative trace, six live
presentation reads, interface recovery gate, semantic-location foundation,
expanded Project-shell context, initial Project Work read, durable Project
thread read, initial Project inquiry authority/read plus frozen Work
composition, and governed ProjectSource exclusion/restoration authority passed;
exact ProjectSource supersession/location and governed backend replacement
creation/retraction plus authenticated API and typed-client integration also
passed; bounded Recent changes, exact event-selected episodes with retained
ProjectDefinition authority and an exact renderer-neutral historical History
destination or supplied unavailable state, signed snapshot-stable filtered
retained Project-event traversal with authorized Actor and target option
catalogues plus stable non-disclosing continuation failures, bounded direct
dependency impact
plus registered exact semantic-target adapters through ProjectSource and
replacement authority, three exact record-bound Work/output/replay groups with
an exact same-snapshot current-Work destination state, exact read-only ChangeSet
recovery assessment, revision-bound compensation preview, confirmed
non-persisted command-plan composition, and separately authorized exact
compensation execution with retained-prefix recovery through event 1.3 also
passed; the first server-owned read-only SuggestedAction preview and its frozen
Brief **Next steps** integration also passed without client-side readiness,
priority, capability, cost, or authority calculation; one exact authenticated
SuggestedAction can now start bounded grounded-synthesis Work and expose its
result, Work revisions, and current recovery posture through existing runtime
authority, and its frozen direct and conversational presentations now preserve
that authority without client-side calculation; its exact Work History
destination now authenticates and rereads the invocation, validates the
server-supplied route identity, and renders canonical Work revisions without
fixture fallback; its cancellation control now appears only from an eligible
server-owned `cancel_work` assessment naming `CancelWorkUnit`, retains one exact
command across retries, and replaces presentation state only from the verified
post-command reread;
the exact InteractionRun replay control and cumulative live interface proof now
also pass through the production workbench client and shared presentation
controllers, render direct and conversational frozen action states from live
runtime authority, and retain the no-reauthorization/no-Work-reexecution
boundary after restart;
broader neutral runtime work remains open; transactional authorization
and canonical Project-command CapabilityGrant authority passed
Date: 2026-09-12
Backend baseline: `main` at `344cf77`
History dependency-impact implementation: `161235a`
History episode implementation: `6feea46`
History retained-filter implementation: `04872ff`
History retained-continuation implementation: `d0ae4c9`
History recovery-assessment implementation: `9e90258`
History compensation-preview implementation: `37ffc38`
History compensation-plan implementation: `718f641`
History compensation-execution implementation: `0e6688e`
SuggestedAction preview implementation: `840a036`
SuggestedAction invocation implementation: `01c8b47`
Frozen design baseline: `655d094`
Design handoff reviewed: `5c629ea`
Neutral reference checkpoint reviewed: `26b03ee`

## Outcome

The frozen UX is implementable without replacing Petra's existing M1 authority,
artifact, graph-projection, Work, interaction, review, or composition contracts.
Those contracts provide strong scientific foundations, but none of
`UX-REQ-001` through `UX-REQ-023` is completely satisfied as a neutral product
contract. The implementation should add Project-definition records, composed
queries, and typed commands around the existing foundations rather than edit
accepted schemas in place or let the client infer missing authority.

The principal architecture adjustment is `UX-REQ-004`: Petra is governed by an
explicit, immutable, versioned `ProjectDefinition`, which may be unique to one
Project. A reusable profile or template may supply an optional origin or
dependency, but Petra does not require Projects to belong to a predefined
catalogue. The design's “profile-resolved” behavior is retained as
Project-definition-resolved behavior.

This review does not close `G-CONTRACT`, `G-INTEGRATION`, or `G-VALIDATION`.
It records which existing capabilities may be reused, which runtime work is
missing, and the order in which to implement it.

## Implementation progress after the reviewed baseline

The disposition below was made against `344cf77`. Subsequent additive work now
provides the ProjectDefinition and Objective authority root, authenticated
repeatable-read Project shell queries, the first explicitly scientific
ProjectSource binding and exact source reader, durable ReviewSession identity
plus an authorized scientific Review collection/detail view, an authorized
current scientific relationship/provenance view guarded across PostgreSQL and
Neo4j, the first Project-scoped semantic object locator, and shell 1.1 place
summaries plus optional exact selection. It now also provides the first
Project-scoped Work collection/detail read over existing WorkUnit and
worker-manifest authority, including bounded pagination, attention, resources,
outputs, disabled operations, and honest coverage. A separate durable
ProjectThread aggregate now preserves exact completed-turn context, execution,
Work, result, response, definition, retention, revision, and branch bindings
without overloading InteractionRun. Its bounded collection/detail view,
authenticated routes, and frozen Petra workspace are live without transcript
fixture fallback; unavailable bytes and commands remain explicit.
The initial Project inquiry authority now maps a definition-registered
scientific Objective kind to the product inquiry role without creating another
domain identity, and preserves exact zero/many/shared Work and addressing-result
links independently of Objective status. Its bounded collection/detail reader,
authenticated routes, and frozen Work-sidecar composition are live. The client
labels authored inquiry status separately from current operational Work and
does not derive a recommendation.
The ProjectSource lifecycle now also has typed exclude and restore commands,
exact expected-state guards, authorization, idempotency, status-only immutable
revisions, Project events, registered interface outbox intent, immutable
preservation receipts, compensating recovery, and an authenticated public
execution path that binds an exact Actor and capability grant; physical
deletion remains excluded.
An immutable ProjectSource replacement record now binds an exact excluded
predecessor, active successor, and the exclusion receipt that connects it to the
governed lifecycle path. Immutable retraction records and a validated effective
head now separate current graph traversal from retained replacement history.
PostgreSQL prevents ambiguous active successors, active cycles, and chains
beyond 32 edges. The semantic object locator validates and returns only the
active chain as `superseded`. Retraction does not restore the predecessor;
command-envelope/event/outbox 1.3, CapabilityGrant 1.1, V030, and the immutable
replacement-command receipt now execute governed creation and retraction in one
transaction. Restore is rejected until the active replacement is retracted.
Separate authenticated create/retract routes and a typed workbench client now
reach the same authority without accepting request-carried identity or changing
the frozen presentation.
`petra.suggested-action-view@1.1.0` now adds one exact Work-starting
grounded-synthesis action beside the unchanged 1.0 read-only action. Its
server-owned readiness binds the current ProjectDefinition, Objective,
inquiry-result link, GroundedResponse, snapshot, context and evidence packets,
fixed prompt, execution limits, and one active `InvokeSuggestedAction` grant.
The authenticated command resolves its Actor and grant on the server, stores an
immutable idempotent invocation receipt, and converges direct and conversational
callers on the existing grounded-synthesis interaction. That path registers the
exact inputs on the deterministic WorkUnit, preserves InteractionRun replay and
explicit Work cancellation, and composes result, Work-revision History,
destinations, and current recovery without a second runtime ledger. The
renderer-neutral typed client is ready for frozen action-region mapping; no
frozen presentation code changed in the backend slice.
`petra.project-history-view@1.0.0` now composes the newest ten Project event-
producing commands from the existing immutable command/event/receipt records
and current recovery authority. The authenticated query and typed client expose
exact actor, time, identity, target, observed effect, current eligibility or
reason, and semantic History destination across event versions 1.0 through 1.3.
It persists no parallel ledger, keeps graph navigation history client-local,
and introduces no generic undo or multi-step compensation.
`petra.project-history-episode-view@1.0.0` now selects one exact retained event,
reuses that authority composition, and returns its recorded parent command,
bounded following commands, separate Project-stream neighbors, and exact
lifecycle or replacement receipt when applicable. It explicitly omits
dependency impact, generic reversal assessment, and cross-family total order.
`petra.project-history-retained-view@1.0.0` now traverses the complete retained
Project event stream newest-first with bounded keyset pages. Signed opaque
cursors bind the Project, initial authority position, Project-stream head,
exact head event/hash, and exclusive continuation boundary. Appends cannot
shift an in-progress traversal. Retained event membership stays fixed while
recovery eligibility is explicitly recomputed against current page-read
authority. No offset, filter, parallel ledger, or cross-family order is exposed.
`petra.project-history-retained-view@1.1.0` at `7380a0b` adds single-value exact
family, command, event, Actor, outcome, observed-effect, semantic-target, and
inclusive recorded-time filters without changing Recent changes or its fixed
ten-item window. Its opaque `phc2` cursor binds the Project, retained snapshot,
exclusive Project-stream boundary, page limit, and complete normalized filter
identity. Matching counts and zero-result pages remain inside the authorized
Project snapshot; rows remain newest-first by Project-stream revision. Origin
filtering is explicitly unsupported because current authority provides no
trustworthy origin classification.
`petra.project-history-retained-view@1.2.0` at `04872ff` preserves that endpoint,
query, retained order, cursor binding, and fixed Recent changes boundary while
adding Actor and exact-target option catalogues inside the same repeatable-read
response. Each catalogue removes only its own filter dimension, preserves every
other normalized filter, and counts matching authorized events in the retained
snapshot. Options are bounded at one hundred and preserve active-first stable
order, returned/total counts, complete/truncated coverage, and explicit absence
of continuation. Actor names retain exact immutable Actor ID and record-hash
authority; targets expose exact identity only because no revision-neutral title
authority exists. No current/historical title, profile label, compatibility,
origin, or client authority is inferred.
`petra.project-history-retained-continuation-failure@1.0.0` at `d0ae4c9`
preserves HTTP 422 and the outer query-invalid code while classifying a rejected
continuation as invalid cursor, combined Project/limit/complete-query binding
mismatch, or unavailable retained snapshot. Every class returns the same public
message and cursorless restart instruction, exposes no cursor or internal
diagnostic, and leaves successful retained History at version 1.2. Cursorless
query errors acquire no subcode, and the typed client retains classification
and restart only for a fully valid failure envelope.
`petra.project-history-episode-view@1.1.0` at `1415352` adds one read-only
retained ProjectDefinition authority union to the exact selected-event episode.
Available authority preserves the immutable definition identity, revision,
content hash, record hash, strictly earlier Project-stream boundary, fixed
authority source, and selection basis. Unavailable authority preserves its
exact reason/code. Both states preserve
`historical_destination_interpretation: not_performed` and
`historical_project_definition_not_interpreted`; they forbid current-definition
substitution.
`petra.project-history-episode-view@1.2.0` at `6feea46` uses only an available
exact retained definition and Petra's registered historical History-target
adapter to return one renderer-neutral destination for the selected event.
Availability preserves the exact primary target, `history` place,
`view_history` intent, retained definition reference, interpretation basis, and
event-bound episode 1.2 route authority. Missing retained authority, missing
History-place support, and an unregistered target return three distinct exact
unavailable reasons. Interpretation is performed only when retained authority
is available; definition content remains omitted, and no current definition,
label, term, URL, renderer component, CSS rule, browser route, origin, recovery,
filter, or client authority is inferred.
`petra.project-history-impact-view@1.0.0` now inventories four registered kinds
of direct dependents for one exact selected event under current repeatable-read
Project authority: causally downstream commands, exact event outbox records,
graph-projection attempts, and GroundedResponse invalidations. Every bounded
group names its owning immutable authority source, exact identities, total, and
coverage. The authenticated API and typed client preserve selected actor, time,
target, observed effect, and semantic destination while stating that semantic-
target, transitive, profile-specific, and external dependencies remain omitted
or unknown. It neither decides reversibility nor composes compensation.
`petra.project-history-impact-view@1.1.0` at `c5da977` preserves those direct
groups and adds four bounded exact semantic-target adapters over existing
immutable change-control, ReviewSession membership, GroundedResponse
dependency, and composition-lineage authority. Each returned target is resolved
at its exact revision and verified authority hash under the same repeatable-read
Project snapshot; each adapter reports its authority source, exact relation
identity, total, coverage, and current, historical, or immutable-revision
posture. Registered keys with incomplete or unavailable target authority and
unregistered ProjectSource/replacement keys remain explicit target-local
non-results. Identity-only relations, transitive closure, dependent effects,
reversibility, and compensation are not inferred.
`petra.project-history-impact-view@1.2.0` at `c198af6` adds five bounded exact
adapters for ProjectSource lifecycle receipts, source-bound downstream
dependencies, immutable replacement/retraction lineage, immutable replacement
command receipts, and the current derived replacement head. Exact ProjectSource
and replacement targets are re-resolved inside the same Project repeatable-read
transaction. Retained lineage and receipts use immutable-revision posture; the
separate effective-head group reports whether the exact replacement is the
current active or retracted head. The existing target/ref bounds, explicit
unavailable states, event support through 1.3, and non-inference boundaries
remain intact.
`petra.project-history-impact-view@1.3.0` at `96acc5d` preserves those results
and adds three separately bounded operational adapters. Exact immutable target
record bindings lead to current WorkUnit heads, immutable WorkerOutputManifest
records for that bound Work, and immutable InteractionReplayRecord receipts for
InteractionRuns tied to the same Work. Every reference preserves its target,
WorkerInputManifest, WorkUnit, and applicable output, InteractionRun, and replay
authority chain. Project scope, independent counts, coverage, and content or
record hashes are enforced under the same repeatable-read snapshot. The view
does not infer worker-output or interaction-replay effect, treat interaction
replay as worker-output delivery or a ProjectThread binding, compose transitive
closure, or assert a cross-family order. It creates no second History or
operational ledger.
`petra.project-history-impact-view@1.4.0` at `161235a` preserves every 1.3
target, group, identity, relation, count, coverage value, unknown, and
non-inference boundary while adding an exact destination state to each
operational reference. Only a current WorkUnit may be available, and only when
the same repeatable-read snapshot validates a current ProjectDefinition that
supports Work. Its destination preserves exact Work ID/revision/record hash,
`work` place, `inspect` intent, `petra.project-work-view@1.0.0` detail authority,
and the exact ProjectDefinition reference. Output and replay remain unavailable
with distinct reasons; neither redirects through owning Work, Petra, or
ProjectThread. The view supplies no URL or client return context and changes no
History group or ledger.
`petra.project-history-recovery-assessment-view@1.0.0` at `9e90258` composes one
exact applied or reverted event with its original promotion ChangeSet and
Approval, current Claim–Assertion heads, current server-resolved grants for the
three established ChangeSet commands, and the bounded direct/semantic impact
summaries and unknowns. It returns eligible-for-preview, exact ordered blockers,
or the exact retained compensation ChangeSet/Approval/event. The frozen History
detail maps these facts into Episode members, Authority effect, and Recovery
relationship without adding a surface or route. The read composes no preview,
executes no command, and cannot propose reversal of a reversal.
`petra.project-history-compensation-preview-view@1.0.0` at `37ffc38` derives a
five-minute read-only preview only from a currently eligible assessment. It
binds exact assessment authority, promotion ChangeSet, current Claim/Assertion
revisions and hashes, and command grants; shows ordered retractions, resulting
revisions, retained records, required human input, and the governed three-
command sequence; and names every invalidation cause. The existing subordinate
History dialog consumes it without a new surface or route. The preview creates,
records, composes, persists, and executes nothing.
`petra.project-history-compensation-plan-request@1.0.0` and
`petra.project-history-compensation-plan-view@1.0.0` at `718f641` accept the
compact preview reference, explicit Reason, Approval rationale, and literal
confirmation. The PostgreSQL composer reconstructs the eligible preview from
current authority before returning its exact ChangeSet, Approval, and three
causal command envelopes with separate grant bindings. The existing dialog
consumes the confirmation, revalidation, and plan states. Nothing is persisted,
submitted, or executed, and no new component, CSS, or browser route is needed.
`petra.project-history-compensation-execution-request@1.0.0` and
`petra.project-history-compensation-execution-view@1.0.0` at `0e6688e` accept
the full plan only as untrusted input plus separate execution confirmation. A
first attempt revalidates it by reconstructing the exact plan against current
preview authority; each of SubmitChangeSet, RecordApproval, and ApplyChangeSet
then owns a separate transaction and current grant check. Retries recover
completion or the exact retained successful prefix from immutable command
executions and events, while the response distinguishes retained terminal
failure, an unretained failed attempt, and work not attempted. The frozen dialog
maps progress, interruption, retry/review, completion, and resulting ChangeSet,
Claim, Assertion, and reversal-event identities without a second ledger, client
authority, component, CSS rule, or browser route.
PostgreSQL command repositories now authorize inside their command transaction
through an async-capable adapter supplied with the exact transactional client.
V026 now supplies immutable Project-command grants, exact retained revocations,
owner-only single-user issuance/revocation, transactional validity and scope
enforcement, and live effective-controls composition without changing the
synchronous core policy seam. Both lifecycle and replacement routes now bind
the bearer-authenticated request to an exact server-resolved Actor and grant.

This advances `UX-REQ-001`, `UX-REQ-004`, `UX-REQ-006`, `UX-REQ-007`, `UX-REQ-008`, `UX-REQ-009`,
`UX-REQ-010`, `UX-REQ-012`, `UX-REQ-013`, `UX-REQ-014`, `UX-REQ-016`, and
`UX-REQ-020` without changing the frozen presentation. It does not close those
neutral-product requirements: additional source specializations and lifecycle
commands, general working candidates,
multi-profile Review renderers and batch commands,
working and historical relationship layers, comparison and continuation,
replacement and parent records, Project snapshot reconstruction, profile tools,
managed folders, `.petra` checkpoints, and the remaining product queries still
require later slices.

## Baseline and gate boundary

- The design brief is frozen at `UX-DESIGN-FREEZE-01`; DB01 through DB18 are
  complete at specification depth.
- The frozen workbench contains the initial presentation of all fourteen DB18
  surface packets. Project shell, scientific source, scientific Review, bounded
  current Graph, Project Work with exact inquiry linkage, and the Petra workspace
  now use live authenticated reads. Remaining product places are still fixture-backed or explicitly
  unavailable and must not be described as live.
- Backend `M1.9-W01` through `M1.9-W04` are complete. The cumulative clean-start
  trace passed all fifteen steps. Shell, scientific source, scientific Review,
  and bounded current Graph reads pass, and the interface recovery gate covers
  the relevant frozen presentation and existing AG-UI protocol paths.
- M1.9 closes the existing scientific evidence spine. It does not, by itself,
  close all 23 neutral-product runtime requests.
- Contextual Prosody, Sentinel, or other real-project integrations remain gated
  until the neutral product stands independently. Synthetic conformance data
  may exercise accepted contracts after the freeze.

## Implemented evidence anchors

- [`petra.project@1.0.0`](../packages/contracts/schemas/project/1.0.0/schema.json)
  defines private Project identity and revision but no ProjectDefinition,
  objective, or reusable-profile binding.
- [`ResearchScopeRepository`](../packages/core/src/research-scope-repository.ts)
  registers and reads actors and individual Project revisions; it has no
  authorized Project collection or composite shell query.
- [`WorkUnitAuthorityRepository`](../packages/core/src/work-unit-authority-repository.ts)
  preserves exact WorkUnit and manifest revisions, lifecycle, and cancellation;
  it has no Project collection, stage view, or steering plan.
- [`InteractionAuthorityRepository`](../packages/core/src/interaction-authority-repository.ts)
  preserves individual interaction runs, events, interrupts, replay, and
  connection attempts. The additive
  [`ProjectThreadAuthorityRepository`](../packages/core/src/project-thread.ts)
  now preserves product-thread identity, immutable completed turns, and exact
  branch origin separately. Its Project-scoped collection/detail reader is live;
  lifecycle and continuation commands remain open.
- [`ChangeControlAuthorityRepository`](../packages/core/src/change-control-authority-repository.ts)
  owns exact ChangeSet, approval, domain-event, and outbox reads. The existing
  scientific reversal and Review implementation is in
  [`evidence-review.ts`](../packages/core/src/evidence-review.ts).
- [`AuthorityGraphStore`](../packages/core/src/graph-store.ts) exposes current
  scientific graph objects, Project-scoped relationships, neighborhoods,
  provenance, evidence and citation paths, and projection freshness. The
  authorized `ProjectRelationshipViewReader` now composes one current
  ProjectDefinition-resolved provenance result. It does not implement the
  later temporal, comparison, working-layer, expansion, or continuation parts
  of `UX-REQ-013`.
- [`ProjectObjectLocationViewReader`](../packages/core/src/project-object-location-view.ts)
  now resolves five registered M1 object kinds to exact ProjectDefinition-valid
  semantic place roles. The browser maps those roles to frozen routes; the read
  contract owns no URL or layout.
- [`ContextPacketRegistry`](../packages/core/src/context-packet-registry.ts)
  validates a bounded scientific packet over Claim, Assertion, SourceSpan, and
  WorkVersion records. It is not a generic Project-definition context registry.
- [`DraftRevisionEngine`](../packages/core/src/draft-revision.ts) and the
  composition repositories provide additive scientific draft revisions and
  assessments, but not a general continuous working-document contract.
- [`app.ts`](../apps/server/src/app.ts) authenticates `/api/*` and now exposes
  Project shell, scientific source, scientific Review, bounded current
  relationship, Project Work, and Project thread reads in addition to provider
  and interaction paths. Bounded authenticated Recent changes, retained
  Project-event traversal, exact causal History episode, and exact-event direct
  plus registered semantic-target dependency-impact reads are also live; Brief
  and the remaining neutral-product queries are not live.
- [The M1.9 gate matrix](M1.9-BACKEND-GATE-MATRIX.md) and
  [recovery exercise](M1.9-RECOVERY-EXERCISE.md) establish component and
  operational-recovery evidence. The
  [cumulative demonstration](M1.9-CUMULATIVE-DEMONSTRATION.md) establishes the
  identity-preserving backend trace. The scoped M1 frontend follow-through is
  recorded in [M1.9 interface recovery](M1.9-INTERFACE-RECOVERY.md).

## Accepted architecture boundary

### A01 — Project definitions are the semantic root

Every Project binds an exact `ProjectDefinition` revision. The definition names
its objective, object, relationship, source-role, workflow, validator, output,
terminology, presentation-descriptor, and extension contracts. It can be unique.
An optional reusable template or profile can seed it and remains recorded as
origin; later template changes do not silently change existing Projects.

Changing a definition creates a new reviewed revision with an impact assessment.
A supported migration within the same definition family retains the prior
interpretation. A change to a materially different family creates an explicitly
linked derived Project rather than reinterpreting the existing Project in place.

### A02 — Objectives and task context are revisioned

Objectives are versioned graph objects. A Project can have several objectives,
subobjectives, and dependencies. Every material WorkUnit, model call, candidate,
and output binds the exact objective and ProjectDefinition revisions it used.
Changing focus does not rebind existing Work.

A task records one coherent snapshot of its relevant inputs, rules,
capabilities, limits, and expected output. Relevant later changes trigger an
impact explanation and explicit adoption or revalidation; unrelated changes do
not invalidate the task. Current authority and target revisions are checked
again before a material effect is applied.

### A03 — One authoritative history supports several graph views

PostgreSQL remains the authoritative ledger, immutable bytes remain in the
ArtifactStore, and Neo4j remains a rebuildable graph read model. The default
graph workspace is a focused, live projection of the latest working state.
Current, working, historical, temporal, comparison, and Project-evolution views
are derived from the same records; none is a second authority database.

Every Project must support temporal visibility and reconstruction of retained
recorded states. Domain time, such as publication time or story time, is a typed
Project-definition dimension and is not substituted for recorded or valid time.

### A04 — Conversation and graph interaction share one command path

Users may work conversationally, through the graph UI, or through both. A
conversational action appears in the graph, while a graph selection supplies
exact context to conversation. Zoom, layout, selection, and focus are
presentation state. Material changes use the same versioned preview, command,
Review, receipt, and history records regardless of where the action began.

### A05 — Working candidates never inherit authority

Human, model, tool, import, and extension proposals enter a typed working layer
with exact identity, revision, origin, basis, producer, and validation state.
They may link to canonical objects but cannot inherit or mutate canonical
authority. Successful execution means the operation completed; it does not mean
the result was validated, accepted, or applied.

Similarity may group candidates, show comparable decisions, and open an
expedient batch Review. Similarity alone cannot carry validation or approval
forward. A revised candidate is a retained new revision; material changes must
run the applicable checks again.

### A06 — Review respects dependency and atomicity boundaries

Review sessions are durable and resumable. Users can accept, reject, revise, or
defer candidates individually. A dependency-coupled set is applied atomically
when partial application would be invalid. Genuinely independent members receive
independent outcomes and receipts; failures and conflicts preserve their state
for recovery.

### A07 — Bounded autonomy remains explicit

One authorized action may cover internal steps within its declared objective,
material, tool, permission, cost, time, and result limits. Petra asks again only
for unresolved consequential meaning or additional authority. If execution is
interrupted or reaches a limit, Petra preserves exact partial results and may
resume only from a supported durable checkpoint within the original authority.

Every SuggestedAction binds the exact snapshot that produced it. A stale action
must be regenerated or reassessed; Petra cannot silently execute a changed plan
under the old authorization.

### A08 — Quick recovery is bounded; material history is retained

The current-version quick recovery window is ten user-visible atomic steps for
each supported working-edit, graph-navigation, and applied-change history. An
internal model or tool call is not a user step. Governed reversal appends a
validated compensating ChangeSet, explains affected dependents, and preserves
unrelated work and the original event.

The ten-step limit does not limit retention. Material Project history remains
inspectable for the Project lifetime and is preserved in archives, subject only
to an explicit dependency-aware retention or deletion process.

### A09 — Sources are Project-definition-resolved

Petra's source kernel supplies exact identity, revision, origin, integrity,
access, provenance, and relationships. A ProjectDefinition supplies source roles
such as literature, tests, code, documents, observations, or any other admitted
type. Project membership does not imply acceptance, evidentiary status, or
automatic inclusion in model context. Projects are isolated by default.
Cross-Project reuse is explicit and retains exact origin, revision, permitted
scope, and receiving-Project review.

### A10 — Folders and imports are managed explicitly

Each Project has a Petra-managed, inspectable folder with a canonical,
domain-neutral layout. The exact directory names remain an implementation detail;
the initial layout should cover identity and manifests, definition, sources,
working material, outputs, Work and interactions, history, graph exports, and
extensions. The folder is not a second editable ledger.

External folder editing is out of scope for this version. Unexpected changes are
integrity mismatches, not automatically admitted revisions. Code, Markdown,
documents, and folders enter through explicit import or re-import operations.
GitHub is the only contemplated external synchronization channel, and any later
integration must use an explicit snapshot/sync contract rather than filesystem
watching.

### A11 — `.petra` is an open, reconstructable Project checkpoint

A `.petra` archive uses an application-specific extension over an open,
documented, versioned, preferably ZIP-compatible container. It captures one
coherent Project-scoped checkpoint, the complete Project identity taxonomy,
definitions, retained history, artifacts, Work and interaction context, graph
and lineage records, extensions, hashes, and declared dependencies or omissions.
It never includes credentials or transfers authorization.

Archives are self-contained by default when rights permit. A reference-only or
incomplete archive must identify omissions and cannot claim complete
reconstruction. Open/Restore preserves Project identity; Create Derived Project
assigns a new identity with lineage to the source checkpoint. Existing identical,
older, or divergent Project identities are recognized, inspected, compared, or
explicitly branched—never silently duplicated or overwritten.

### A12 — Model independence means observable-context preservation

Petra records the observable inputs and outputs needed to understand Work across
model changes: prompts, compiled context, exact source revisions, tool inputs and
outputs, exposed provider/model/configuration identity, schemas, validators,
extensions, limits, intermediate artifacts, checkpoints, receipts, and results.
Restoration guarantees inspection of what Petra recorded. Re-execution with a
changed or unavailable model creates a linked Work revision and does not claim
bit-identical reproduction.

### A13 — Current product scope is single-user

Multi-user collaboration, invitations, shared editing, presence, and role
management are outside this version. Actor identity remains required for
authorization, provenance, auditability, and distinguishing the user from Petra,
models, tools, and extensions.

### A14 — Executable extensions are governed Project material

ProjectDefinitions may combine declarative rules with versioned, validated
executable extensions such as validators and tools. Each extension declares its
inputs, outputs, permissions, resources, version, and evidence. Code authored by
Petra or a model begins as a candidate, passes bounded tests and Review, and is
activated explicitly; no definition, template, extension, or model grants itself
authority.

For technical Projects, Petra should preserve and streamline the path from
literature and tests through interpretation, definition rules, implementation,
test evidence, and validated use. The resulting implementation remains honest
about what is executable, what is only specified, and what still requires human
judgment.

## UX request disposition

Status terms in this table describe the backend at `344cf77`, except where a row
explicitly records later implementation progress:

- **partial** — one or more accepted foundations exist, but the requested
  product contract does not;
- **missing** — no corresponding product record/query/command exists, though
  lower-level foundations may still be reusable;
- **adapted** — accept the product behavior but replace the proposed runtime
  shape with the architecture boundary above.

| Request      | Current capability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Missing work and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Sequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UX-REQ-001` | **Partial, advanced after baseline.** `ProjectShellView` 1.1 now composes exact ProjectDefinition, focused Objective, authority position, projection freshness, attention, ProjectDefinition-supported place summaries, and optional exact semantic selection under one repeatable-read transaction. The client verifies a complete route identity/hash tuple and does not persist selection. Paired project-authored scientific and controlled-writing definitions prove neutral term resolution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Add exact attention-Work references, complete Review posture, active Work context, selection/Details behavior across applicable frozen surfaces, and the remaining accessibility/recovery validation.                                                                                                                                                                                                                                                                                                                                                                                                              | Wave 1 read foundation complete; Wave 2 and integration validation                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `UX-REQ-002` | **Partial.** EvidencePacket, GroundedResponse, Work, review, graph, and composition records can supply a scientific Brief.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Add a bounded `ProjectBriefView` composition with exact basis, comparison, attention, recent decisions, and SuggestedAction references. Resolve sections through ProjectDefinition roles; keep summaries read-only.                                                                                                                                                                                                                                                                                                                                                                                                | Wave 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-003` | **Partial overall; bounded Wave 3 increment complete.** The unchanged `petra.suggested-action-view@1.0.0` derives a stable read-only inspection action from an exact inquiry-result link. Version 1.1 adds one exact bounded grounded-synthesis Work action with immutable ProjectDefinition, Objective, link, source result, snapshot, context/evidence packet, prompt, execution, resource, interrupt, cancellation, and result bindings. Current dependency and exact `InvokeSuggestedAction` grant authority supply server-owned ready, stale, or unavailable state. The authenticated invocation request carries no Actor, grant, Project, Work, interaction, or trace authority; the server stores an immutable idempotent command receipt, converges direct and conversational callers on one deterministic existing-runtime WorkUnit, and composes result, InteractionRun replay, Work-revision History, destinations, and current recovery without a second ledger. The frozen **Next steps** region preserves the 1.0 inspect action and maps the 1.1 preview and invocation into one shared direct/conversational component. It passes the exact action ref through the typed client, retains an uncertain retry identity, accepts only a matching server regeneration, and presents supplied Work/result/History/recovery state without client authority, grant, readiness, priority, cost, reversibility, or recovery calculation. The action-owned History deep link now carries the server-supplied Work target and invocation command receipt; its loader authenticates the invocation reread, validates exact receipt/destination/Work/revision identity, and maps canonical revisions plus supplied result, InteractionRun, recovery, and limitations into the frozen History regions without fixture fallback. The existing `CancelWorkUnit` route is bound only from the returned eligible `cancel_work` assessment, retains one exact cancellation command across retries, and accepts presentation state only from the verified post-command invocation reread. Exact InteractionRun replay is exposed only from eligible server recovery and publishes only SDK output plus a verified post-delivery reread. The cumulative proof executes the production workbench preview, invocation, reread, replay, and frozen React renderers against one live restarted runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Add other action families only from accepted product authority. Keep adjustable depth, priority, steering, pause/resume, and generalized budget or cost policy outside this bounded increment until their product authority is accepted.                                                                                                                                                                                                                                                                                                                                                                           | Wave 3 bounded Work action, exact invocation, frozen mapping, runtime History destination, cancellation, replay, and cumulative live interface exit passed                                                                                                                                                                                                                                                                                                                                               |
| `UX-REQ-004` | **Partial, adapted and advanced after baseline.** ProjectDefinition and Objective contracts, immutable PostgreSQL authority, current binding, terminology, supported places, and optional template-seed origin now exist without requiring a profile catalogue. Paired scientific and controlled-writing Projects are independently project-authored and pass the same shell, control, and client-mapping paths.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Add full extension, presentation, compatibility, component-resolution, impact-review, and migration behavior while preserving Project-specific definitions.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Wave 1 foundation complete; extensions in later waves                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `UX-REQ-005` | **Partial.** Artifact/Manifest, document, DraftArtifact, provenance, support assessment, and additive draft revision preserve exact scientific ancestry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Add an explicit imported-lineage root and reviewed promotion command for existing documents or projects. Import never endorses extracted meaning or overwrites the source.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Wave 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-006` | **Partial, advanced after baseline.** `petra.project-thread@1.0.0`, V022, and `ProjectThreadAuthorityRepository` provide durable Project-owned thread identity, immutable completed turns, exact definition/input/context/snapshot/execution/Work/result/Artifact/authority bindings, contiguous revisions, retained branch origin and continuation mode, and hash-only prompt limitations where legacy input bytes do not exist. `petra.project-thread-view@1.0.0`, authenticated routes, and the frozen Petra workspace now expose bounded exact collection/detail reads without fixture transcript fallback. InteractionRun remains execution and delivery state rather than the product thread.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Add create/append/branch/archive/reopen commands, stale-snapshot preflight and execution, retained transcript bytes for new turns, compaction, proposal/decision and PresentationContext linkage, and archive reconstruction.                                                                                                                                                                                                                                                                                                                                                                                      | Wave 2 read integration passed; commands and richer retention remain                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `UX-REQ-007` | **Partial, advanced after baseline.** `petra.project-history-view@1.0.0` exposes at most ten newest event-producing Project commands. Episode 1.0 adds exact causation and Project-stream adjacency; episode 1.1 adds exact retained ProjectDefinition authority without historical interpretation; episode 1.2 adds the exact retained-definition and selected-event-bound History destination or one of three supplied unavailable states; retained 1.1 adds filtered traversal with authorized counts and opaque Project/snapshot/limit/query cursor binding; retained 1.2 adds same-snapshot Actor and exact-target option catalogues with replace-own-dimension facet counts, active-first stable order, immutable Actor descriptors, and exact-identity-only target fallbacks. The retained-continuation failure contract adds invalid-cursor, combined binding-mismatch, and snapshot-unavailable subcodes under one non-disclosing cursorless-restart rule. Impact 1.4 preserves four direct groups, nine semantic adapters, and the three independent exact-target-record groups for current WorkUnit heads, immutable WorkerOutputManifest records, and immutable InteractionReplayRecord receipts. It adds one destination state to each operational reference. Only a same-snapshot exact current WorkUnit backed by current ProjectDefinition Work support may use the existing Project Work detail authority; output and replay remain unavailable and cannot redirect through owning Work, Petra, or ProjectThread. Every operational reference preserves its WorkerInputManifest, WorkUnit, and applicable InteractionRun chain without inferring output effect, transitive closure, or cross-family order. Recovery assessment 1.0 binds one applied or reverted event to its promotion ChangeSet/Approval, current Claim–Assertion heads, current three-command grants, impact summaries/unknowns, and exact blockers or retained compensation. Compensation preview 1.0 derives an exact five-minute Claim/Assertion retraction, resulting revisions, retention boundary, required human input, and governed sequence only from a currently eligible assessment. Plan request/view 1.0 accepts only its compact preview reference and confirmed human input, reconstructs current authority, and returns the linked ChangeSet, Approval, and three causal command envelopes without persistence or execution. Execution request/view 1.0 separately accepts the full plan as untrusted input, revalidates an initial attempt against current preview authority, and runs each command through its own transaction and current grant check. It derives completion or a retained prefix from immutable command executions and events and distinguishes retained success, retained terminal failure, unretained attempt failure, and not-attempted work. All History state derives from existing authority, persists no second ledger, keeps graph navigation and exact History return/origin/focus/scroll context client-local, and exposes no generic undo or reversal of a reversal. The frozen Scope/filter, collection, detail, and subordinate-dialog mappings require no new components, CSS, or browser routes. | Bind the fixture-backed frozen route to the typed reads and command. The backend still lacks authoritative origin filtering and complete applicable accessibility/recovery evidence. Another historical destination adapter is unavailable until a newly supported event-target family has exact target and renderer-neutral route authority. Exact fallback identities and safe invalidation behavior are specified. Dependent occurrence times, current projection freshness, and broader related facts remain gaps. Do not infer authority, effect, reversibility, transitive closure, or a cross-family order. | Wave 3 Recent changes, episode, filtered traversal, direct/semantic/operational impact, recovery assessment, read-only preview, confirmed non-persisted plan composition, and separately authorized exact execution with partial-outcome recovery passed; exact operational destination, retained filter-option, continuation-failure, and episode 1.1 authority and episode 1.2 historical-destination mappings passed; any next adapter waits for a newly supported target family with exact authority |
| `UX-REQ-008` | **Partial, advanced after baseline.** `petra.project-object-location-view@1.0.0` and its Project-scoped PostgreSQL reader resolve exact current or retained historical ProjectSource, Assertion, ChangeSet, WorkUnit, and DraftArtifact identities to ProjectDefinition-permitted semantic place roles. V025 plus V027–V029 make its `superseded` state and bounded active replacement chain live while retaining retracted lineage separately. The frozen client alone maps roles to routes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Add replacement/parent adapters for other owning object types, retained Project-snapshot selection, extension-registered profile tools, actor-specific object authorization if required, and full applicable `UX-FX19` evidence.                                                                                                                                                                                                                                                                                                                                                                                   | Wave 1 read foundation plus current/historical ProjectSource replacement separation passed; type-specific later slices                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-009` | **Partial, advanced after baseline.** The scientific ProjectSource specialization and authorized collection/detail view now bind exact role, identity, copy, rights, parsed coverage, preview spans, downstream use, and authority position. The paired definition proof establishes neutral reference terminology but not a controlled-writing source adapter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Add non-scholarly source specializations, linked Work/results, broader limitations, intake, and source-adapter conformance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Wave 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-010` | **Partial, advanced after baseline.** ProjectSource has stable Project-local identity and immutable active or excluded revisions over a retained copy. `petra.project-source-lifecycle-view@1.0.0` previews exclude, restore, or local-copy deletion intent against eight bounded exact dependency groups and seven explicit retention areas. Lifecycle command/event/outbox 1.2, the lifecycle receipt, V024, and the PostgreSQL authority execute authorized, idempotent exclude/restore transitions as status-only revisions with compensating recovery. The authenticated public lifecycle route resolves a server-configured human Actor and exactly one active Project-command grant, rejects request-carried authority, and returns the exact receipt and resulting source revision. `petra.project-source-replacement@1.0.0`, immutable retraction 1.0, and V025/V027–V029 add exclusion-receipt-bound supersession with a validated effective head. Command/event/outbox 1.3, CapabilityGrant 1.1, the immutable replacement receipt, and V030 now govern creation and relation-only retraction atomically. Separate authenticated create/retract routes and a typed client reach that authority without request-carried identity. D019's separate next restore is enforced: restore fails while the replacement is active. All dependents and source materials remain retained; physical deletion is unavailable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Add frozen-interface preview/confirmation/receipt/recovery integration, other source adapters, and broader dependency policy. Do not expose physical deletion until an accepted retention policy exists.                                                                                                                                                                                                                                                                                                                                                                                                           | Wave 2 backend lifecycle, governed replacement authority, authenticated APIs, and typed clients passed; frozen presentation integration next; physical-copy policy in Wave 5                                                                                                                                                                                                                                                                                                                             |
| `UX-REQ-011` | **Partial, advanced in Wave 4.** `petra.working-candidate@1.0.0` and `petra.working-relationship@1.0.0` define additive Project-scoped working revisions over profile-owned records. V033 and the scientific adapter persist immutable working heads and revisions, admit contiguous Claim corrections through the existing quarantine evidence ledger, and expose an authenticated repeatable-read current-head snapshot. `petra.project-relationship-overlay-view@1.0.0` now composes relevant working structure with the existing bounded authoritative provenance path, preserves their positions separately, includes exact superseded candidate endpoints, and supplies complete textual parity without client semantic interpretation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Add another materially different registered profile and map the overlay through the frozen interface. Keep Review, ChangeSet, projection, History, and client presentation state in their existing authority boundaries.                                                                                                                                                                                                                                                                                                                                                                                           | Wave 4 scientific persistence, admission, correction, query, and relationship overlay passed; paired-profile and interface mapping remain open                                                                                                                                                                                                                                                                                                                                                           |
| `UX-REQ-012` | **Partial, advanced in Wave 4.** EvidenceReviewBatch, accept/reject/correct plans, durable review interrupts, ChangeSets, Approvals, and independent batch outcomes remain canonical. V021 provides durable profile-neutral ReviewSession identity and the scientific Claim–`ASSERTS` read. ReviewSession and Project Review view 1.1 plus V034 bind exact WorkingCandidate and WorkingRelationship revisions and compose validation, ChangeSets, Approvals, command/event traces, member outcomes, and separate authority/projection positions without a second ledger or implicit authority. Project Review view 1.2 exposes exact stored lifecycle. Command envelopes 1.4–1.9, CapabilityGrants 1.3–1.7, V035–V040, authenticated routes, and renderer-neutral clients now defer, reopen, refresh, correct Claim text, revise material source basis, and explicitly separate one unchanged member from a current open multi-member ReviewSession. Separation advances the source ReviewSession, creates one canonical single-member ReviewSession, preserves exact candidate, relationship, basis, validation, ChangeSet, Approval, command, event, projection, and outcome identities, and refuses to split an existing atomic ChangeSet. Refresh retains the stale revision while rebinding compatible current heads. Claim-text correction and material-basis revision remain distinct operations; both advance the same Claim, WorkingCandidate, ASSERTS WorkingRelationship, Review member, and ReviewSession identities through additive revisions with exact retained lineage. Envelope 1.7 accepts only human-authored Claim text. Envelope 1.8 accepts an exact active ProjectSource, exact SourceSpans, and bounded source semantics while preserving source scope and WorkVersion. Serialized server authority composes the profile and working records, lineage, validation reset, separation partition, and hashes. None of these operations decides, validates, approves, rejects, applies, or projects a member. The frozen Review route maps **Decide later**, server-confirmed deferred lifecycle, stale/open refresh, human Claim-text editing, the accepted **Change basis** disclosure, exact multi-member selection, and the accepted **Separate changes** control through typed server authority without inferring lifecycle, source semantics, atomicity, compatibility, or authorization. Member selection remains client-local; separation retains the exact request for uncertain retry, accepts only a matching typed partition, and starts an authenticated source-Review reload after success. D020 now fixes member recovery as a read-only canonical assessment with an exact member/ChangeSet manifest; the member is the inspection unit and the ChangeSet remains the atomic execution unit.                                                                                                                                                                                                                                                                                                                                                                                                       | Implement D020's scientific Review-member assessment without execution. Add a second profile renderer, dependency grouping, and permitted independent apply while retaining existing ChangeSet atomicity. A scheduled revisit time and external validator rerun also remain open.                                                                                                                                                                                                                                                                                                                                  | Wave 4 scientific working-to-Review composition, authenticated defer/reopen/refresh/correction/basis-revision/separation authority and server-owned composition, exact lifecycle read, and frozen Defer/Reopen/Refresh/Claim-text/Basis/multi-member/Separation integration passed; read-only member recovery and paired-profile conformance remain open                                                                                                                                                 |
| `UX-REQ-013` | **Partial, advanced after baseline.** `petra.project-relationship-view@1.0.0` and its authorized reader now return one bounded current scientific `ASSERTS` provenance path with ProjectDefinition terminology, exact PostgreSQL records and graph checkpoint, omissions, source destinations, and a textual peer. The frozen Graph consumes it without fixture fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Add general task and endpoint selection, other registered relationship types, working and historical membership, retained-position reconstruction, comparison, expansion and continuation cursors, and temporal paths. Preserve renderer-neutral semantics and never infer authority from layout.                                                                                                                                                                                                                                                                                                                  | Wave 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-014` | **Partial, advanced after baseline.** `petra.project-work-view@1.0.0` now composes bounded Project Work collection and exact detail reads from current WorkUnit and worker-manifest authority under repeatable-read isolation. It provides exact identities, lifecycle and attention, pagination/filtering, dependencies, inputs, declared limits, measured-use coverage, output reporting, semantic Work destination, and policy assessments. The frozen Work routes also compose exact inquiry anchors and many-to-many Work links from the inquiry sidecar without synthetic stages, recommendations, usable outputs, or commands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Add registered definition-resolved stage plans, durable input requests, profile-neutral Review linkage, Project-level output registration/validation/destination, actor-authorized retry and supported resume, richer recovery, visual filters, and the remaining validation gates. Same-snapshot inquiry composition inside the Work contract remains optional future hardening; do not infer authority or inquiry resolution from operational success.                                                                                                                                                           | Wave 2 read and inquiry-linkage integration passed; orchestration remains                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `UX-REQ-015` | **Partial.** Explicit cancellation is authorized and durable; immutable Work inputs prevent silent rebinding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Add typed steering, task-priority, and execution-plan transition commands with declared cutover, reuse/revalidation, shared-consumer analysis, and receipts. Do not imply generic pause/resume or cancel shared Work automatically.                                                                                                                                                                                                                                                                                                                                                                                | Wave 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-016` | **Partial, advanced after baseline.** `petra.project-inquiry-role@1.0.0`, `petra.project-inquiry-link@1.0.0`, `petra.project-inquiry-view@1.0.0`, V023, and the authority/read repositories map the scientific definition's registered Research-question Objective kind to the product inquiry role without a universal Inquiry identity. Immutable exact links and bounded collection/detail reads support zero/many/shared Work, exact Work filtering, retained framing, dependencies, and GroundedResponse addressing results while leaving authored Objective status independent from Work completion. Authenticated routes and the frozen Work composition are live.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Add other ProjectDefinition-valid record/linked-set adapters, authoritative understanding and stronger basis/finding adapters, broader cross-surface composition, evidence-backed recommendations, and governed semantic commands.                                                                                                                                                                                                                                                                                                                                                                                 | Wave 2 authority/read/Work integration passed; broader semantics remain                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `UX-REQ-017` | **Partial.** CompositionRequest/Plan, DraftArtifact/Span, ProvenanceMap, CitationBundle, assessments, renders, and persistence provide an exact scientific composition aggregate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Add ProjectDefinition-resolved document collection/context reads, recognizable purpose, current and historical revision positions, ancestry, Work/inquiry links, findings, capabilities, and safe destinations.                                                                                                                                                                                                                                                                                                                                                                                                    | Wave 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-018` | **Partial.** DraftRevisionEngine creates exact non-empty span replacements and additive support assessments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Add a durable working-document boundary for blank, structural, and successive authoring; exact save acknowledgments; late suggestion/check reconciliation; and working-to-registered promotion. External filesystem editing remains excluded.                                                                                                                                                                                                                                                                                                                                                                      | Wave 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-019` | **Partial.** Deterministic rendering, Artifact publication, warnings, and support assessments preserve exact generated scientific outputs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Add exact working-copy capture, scoped findings/coverage, status-bearing representation, ExportManifest and delivery receipts, partial-format recovery, and destination eligibility. Export does not promote or certify content.                                                                                                                                                                                                                                                                                                                                                                                   | Wave 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-020` | **Partial, advanced after baseline.** `petra.project-effective-controls-view@1.0.0` composes exact Project privacy and enabled namespaces with the current ProjectDefinition and authority position under repeatable-read isolation. V026 adds immutable Project-command grants, retained revocations, exact Actor/Project/command/validity enforcement, and live effective/expired/revoked capability values. The single-user server resolver binds a configured canonical human Actor to exactly one eligible Project-command grant without accepting request-carried identity; ProjectSource lifecycle and replacement routes now exercise that boundary end to end. Routing, budget, and ReviewPolicy remain explicitly unsupported. The authenticated client verifies the Project and definition snapshot before presentation, and paired project-authored definitions prove Project-specific control resolution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Extend the same resolved-principal discipline only to typed public commands as they become ready; add other owning policy and capability-scope records only where required, inheritance/pause/conflict states, active-Work impact, History destinations, and a registry mapping each genuinely editable value to its typed operation. Never add a universal `SetProjectSetting`; personal preferences remain local.                                                                                                                                                                                                | Wave 1 read, command-grant authority, principal resolution, and multiple public command uses passed; transitions in Wave 3                                                                                                                                                                                                                                                                                                                                                                               |
| `UX-REQ-021` | **Partial.** Scientific synthesist output, GroundedResponse, Felicity records, command receipts, and AG-UI delivery preserve important communication boundaries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Add a ProjectDefinition-resolved CommunicationPlan with statement-level origin, force, basis, limitation, action/event links, terminology versions, and a validation/repair receipt. It is not mutation authority.                                                                                                                                                                                                                                                                                                                                                                                                 | Wave 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-022` | **Missing composite contract.** AG-UI can carry non-authoritative client state; graph and ContextPacket foundations exist separately.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Add a bounded PresentationContext record linking exact semantic result, visible scene, complete accessible peer, optional permitted capture, model input, and validated explanation. Pixels and layout never establish domain meaning.                                                                                                                                                                                                                                                                                                                                                                             | Wave 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `UX-REQ-023` | **Partial foundations with D020's first profile boundary accepted.** Commands, events, ChangeSets, Work, interaction replay, projection checkpoints, artifacts, composition, and M1.9 recovery each record their own outcomes. D020 fixes a read-first assessment and atomic manifest for scientific Review members.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Implement D020's read-only Review-member slice in Wave 4. Broader RecoveryAssessment then reconciles owning records into effect, preservation, member outcomes, eligible registered actions, and exact return. It cannot execute a generic recovery command or become another event ledger.                                                                                                                                                                                                                                                                                                                        | Review-member assessment in Wave 4; broader composition in Wave 6                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Implementation sequence

### Wave 0 — preserve and close the current M1 baseline

`M1.9-W03` is complete against the existing `344cf77` backend. The cumulative
script and result manifest exercise `M1.9-DEMO-01` through `DEMO-15` as one
identity-preserving clean-start trace. This is the regression baseline before
new schemas or migrations are introduced.

Do not broaden W03 to claim the frozen neutral UX. It proves the existing M1
scientific evidence spine.

### Wave 1 — Project definition and coherent query foundation

1. Record an architecture decision for ProjectDefinition, optional reusable
   origins, definition migration, executable-extension admission, Project folder,
   and `.petra` packaging boundaries.
2. Add ProjectDefinition, objective, and exact binding contracts additively;
   preserve `petra.project@1.0.0`.
3. Add repository and migration support with immutable revisions and exact
   effective-definition resolution.
4. Establish authenticated Project collection/read scope and one coherent query
   snapshot boundary.
5. Implement `UX-REQ-001`, `UX-REQ-008`, and the read-only portion of
   `UX-REQ-020` on that foundation.

Exit gate: passed for the initial neutral read foundation. A single-user client
can open a Project, resolve its exact definition and objective, and navigate an
authorized semantic identity without mixed snapshots. Paired project-authored
scientific and controlled-writing Projects prove that shell, control, and client
term resolution do not hard-code either example; unregistered type adapters fail
closed instead of borrowing another definition's behavior.

### Wave 2 — durable Project records and read spine

Implement durable ProjectThread/turn records, ProjectSourceLink, Project Work
collection queries, and ProjectDefinition-valid inquiry mapping. The initial
Project Work collection/detail read, ProjectThread authority/read integration,
and inquiry mapping, exact linkage, collection/detail read, and frozen Work
composition are complete. The ProjectSource lifecycle now has an exact bounded
impact and retention preview plus governed backend exclusion/restoration,
immutable receipts, compensating recovery, exact receipt-bound replacement
lineage, and immutable relationship retraction with active-head semantic
resolution. Authenticated exclude/restore execution
now binds the server-configured Actor and exact eligible grant; frozen-interface
integration remains open. This advances `UX-REQ-006`,
`UX-REQ-009`, `UX-REQ-010`, `UX-REQ-014`, and `UX-REQ-016` before feature
surfaces depend on them.

Exit gate: shell, Sources, Work, Details, and conversation context can read exact
authorized records and clearly report unsupported fields.

### Wave 3 — graph, History, action, and operational control

Implement the bounded relationship query, full retained temporal/causal History,
ten-step quick recovery, SuggestedAction preview/invocation, dependency-aware
reversal, Work steering, and typed Project-control transitions. This establishes
`UX-REQ-003`, `UX-REQ-007`, `UX-REQ-013`, `UX-REQ-015`, and the command portion
of `UX-REQ-020`.

The bounded current relationship read, Recent changes History read, exact
event-selected causal episode detail, signed snapshot-stable retained event
traversal, bounded direct event/command dependency impact, and four exact
semantic-target dependency adapters plus five exact ProjectSource/replacement
adapters plus three exact operational groups for Work, output manifests, and
interaction replay have passed. Bounded retained-event filters and complete
Project/snapshot/limit/query binding in signed opaque cursors have also passed.
The read-only exact ChangeSet recovery assessment now distinguishes eligible-
for-preview, precise blockers, and retained already-compensated authority. The
separately requested compensation preview now binds the eligible assessment,
current target revisions and grants, ordered Claim then Assertion retractions,
resulting revisions, retention, required input, and the governed three-command
sequence for exactly five minutes while creating and executing nothing. The
confirmed command-plan composer now accepts the compact preview reference and
exact human input, reconstructs current authority, and returns the ChangeSet,
Approval, and per-grant causal envelopes without persistence or execution. The
separate execution boundary now treats the echoed plan as untrusted, revalidates
an initial attempt against current preview authority, and executes only its
exact three envelopes through independent idempotent command transactions. It
derives completion or a successful retained prefix from immutable executions
and events and reports retained failure, unretained attempt failure, and retry
or review posture without adding an execution ledger. The 1.4 operational
result now maps into the existing Episode members and Authority effect regions
with every 1.3 target and binding chain, independent count, bounded coverage
value, and non-inference boundary intact. Only the exact current WorkUnit
identity becomes the existing row's link when its same-snapshot
ProjectDefinition and Project Work detail authority are available. Output and
replay stay static with their exact reasons. Retained 1.2 Actor and target
catalogues now map into the existing Full History fields with exact facet
counts, bounded coverage, immutable Actor authority, and target identity-only
fallback. The three stable continuation-failure subcodes now map into the same
invalid Full History continuation state, fixed public message, and cursorless
restart while preserving verified rows, filters, catalogues, and detail. An
exact retained ProjectDefinition authority reference now maps into the existing
selected-event Authority effect and Recovery relationship regions as static
authority or its supplied unavailable reason. Episode 1.2 now maps the supplied
available destination into the existing selected-event semantic-destination
position and its exact retained-definition, target, interpretation, and event-
route basis into **Authority effect**. Its three unavailable states remain
static exact reasons without a link or keyboard stop. The route adapter uses
the supplied selected-event identity and never parses the semantic target. A
later destination adapter is safe only for a newly supported event-target
family with exact target authority and an existing renderer-neutral route
authority. Generic Undo, reversal of a reversal, and multi-step compensation
remain later work. The conformance mapping adds no filter dimension, component,
CSS rule, browser route, or second ledger.

The first `SuggestedActionView` retains its exact read-only existing-result
inspection action and now adds one exact bounded grounded-synthesis Work action.
The authenticated `InvokeSuggestedAction` boundary resolves server-owned Actor and
grant authority, rejects stale revisions with regeneration, persists one
immutable idempotent command receipt, and drives the existing interaction and
Work runtime. Exact input manifests, InteractionRun replay, explicit
cancellation, GroundedResponse results, Work-revision History, semantic
destinations, and current recovery assessments remain bound to their owning
records rather than a second ledger. The shared frozen Brief and Petra mapping
uses the renderer-neutral typed client, carries the same exact command from both
presentation paths, retains the 1.0 inspect action, and maps supplied action,
Work, result, History, reconnect, cancellation, and recovery states without
client-side authority calculation. Its action-owned History destination now
rereads the invocation through the authenticated typed boundary, rejects any
route or returned-authority substitution, and renders the exact canonical Work
revision sequence in the frozen History layout without fixture fallback. Exact
`CancelWorkUnit` is now bound in the frozen action region only from its supplied
eligible recovery assessment, with one retry-stable request and verified
post-command reread. Exact InteractionRun replay is likewise bound only from its
supplied eligible recovery assessment. The cumulative proof executes the
production workbench preview, shared direct/conversational invocation
controller, post-restart replay controller, and frozen React renderers against
one live runtime and retained stores. It verifies one command, one WorkUnit,
four Work revisions, and two delivery attempts without fixture fallback or
client authority calculation. Generic undo and broader action/control families
remain later work.

Exit gate passed: one exact action starts bounded Work, preserves interruption
state, returns a result, and exposes its history and eligible recovery without
client-side authority calculations.

### Wave 4 — working candidates, Review, Brief, and communication

Implement generic working-candidate records and projection, durable ReviewSession
composition, ProjectBriefView, and the first CommunicationPlan/validation
receipt. This establishes `UX-REQ-011`, `UX-REQ-012`, `UX-REQ-002`, and
`UX-REQ-021` in that dependency order.

The first bounded slice adds the additive `WorkingCandidate` and
`WorkingRelationship` contracts, generated TypeScript types, and one scientific
Claim–`ASSERTS` conformance trace. Contract tests prove the fixture's exact model
and human producer, task, snapshot, basis, provenance, validation, and
supersession bindings while the schemas deny domain, Review, mutation, and
validation-derived authority. This evidence does not yet provide canonical
persistence, runtime admission or correction, an authenticated query, a
working-graph overlay, or a second profile.

The second bounded slice adds V033 working heads and immutable revisions, a
scientific adapter that reuses the Claim and Assertion evidence ledger,
idempotent admission and correction with exact-current and registered-reference
guards, and an authenticated repeatable-read Project snapshot. The snapshot is
textual working state only: it excludes authoritative records, historical
working revisions, and graph-overlay composition. The bounded working-graph
overlay and a second profile remain open.

The third bounded slice adds
`petra.project-relationship-overlay-view@1.0.0`, an authenticated
`relationship-overlay` query, and a renderer-neutral typed fetch. The server
composes the existing exact authoritative provenance result with current
working relationships whose exact subject is on that path. It includes each
relationship's exact WorkingCandidate endpoint revision and the current head as
separate nodes when they differ; a current edge is never rebound to the newer
candidate. Server-resolved profile terms, labels, summaries, direction,
meaning, scope, basis, omissions, counts, and full textual parity remove any
need for React to interpret semantic keys or predicates. Exact Project,
definition, registration, hash, authority, projection, and endpoint mismatches
fail closed. The frozen current-only relationship contract and all frozen React,
CSS, and browser-route files remain unchanged.

This third slice remains limited to the registered scientific Claim–`ASSERTS`
adapter and one bounded authoritative path. It does not establish a second
profile, whole-Project traversal, historical authoritative composition, Review
composition, Brief, communication, or frozen-interface runtime evidence.

The fourth bounded slice adds `petra.review-session@1.1.0`, V034, and
`petra.project-review-view@1.1.0`. Each Review member now retains exact canonical
WorkingCandidate and WorkingRelationship revisions alongside the existing
profile candidate bindings. The scientific adapter requires current,
available, task- and snapshot-aligned working records and preserves ordinary or
exception membership, Objective, origin, return context, Current, Candidate,
Basis, Difference, Consequences, validation, ChangeSet atomicity, Approval, and
member outcome. The read also exposes exact command/event receipts and keeps
authority and Neo4j projection positions separate. Review registration and
working validation grant no authority; commitment still uses the existing
SubmitChangeSet, RecordApproval, and ApplyChangeSet commands.

The fourth slice does not add typed Review operations, a second profile
renderer, multi-member frozen presentation, Brief, communication, or the
cumulative Wave 4 runtime proof. The renderer-neutral workbench adapter accepts
the additive view without changing frozen React, CSS, or browser routes.

The fifth bounded slice adds `DeferReviewSession` and `ReopenReviewSession`
through command envelope 1.4 and CapabilityGrant 1.3. V035 stores the governed
command, a complete retained ReviewSession revision, its copied exact working
bindings, and an immutable lifecycle receipt in one serializable transaction.
The authenticated route resolves the Actor and one active grant on the server;
the request carries only its command identity, idempotency key, transition,
exact expected session revision/content hash/lifecycle, and optional rationale.
Direct lifecycle-changing registration, conversation-carried authority,
mismatches, stale input, invalid direction, authorization failure, and reused
identities fail closed. Exact retry returns the stored result.

Deferral and reopen change Review coordination only. They do not decide a
member, validate or approve content, create or apply a ChangeSet, move Project
event authority, or instruct projection. Reopen rechecks V034's retained
relational constraints and leaves snapshot freshness to the existing Review
read. It does not refresh a stale session or rerun an external profile
validator. The renderer-neutral typed client verifies the exact result without
changing frozen React, CSS, browser routes, or presentation fixtures.

This fifth slice does not add correction or material-basis revision, refresh,
separation, member recovery, a scheduled revisit time, a second profile,
multi-member presentation, Brief, communication, or the cumulative Wave 4
runtime proof.

The sixth bounded design slice connects the frozen **Decide later** control to
the exact typed defer operation. It keeps optional rationale, pending state,
verified new or retained success, same-identity retry after an uncertain
result, stale refresh, unauthorized failure, and server-supplied return context
inside the existing Review decision region. The client verifies the receipt's
retention and no-authority boundary before reporting success. It does not
expose the receipt or treat validation as approval.

The same slice leaves Reopen unavailable. The authenticated Review read maps a
deferred session to `waiting`, but it also returns `waiting` when all member
outcomes wait. Until that read exposes exact lifecycle or a revision-bound
operation descriptor, the client cannot construct Reopen from `waiting`
without inferring lifecycle and eligibility.

The seventh bounded backend slice adds
`petra.project-review-view@1.2.0`. Its exact stored ReviewSession lifecycle is
separate from derived display status and does not grant operation eligibility
or authority. The eighth bounded design slice uses that field to expose
**Reopen review** only for a server-confirmed deferred session, retaining exact
command identity, pending context, same-command retry, stale and unauthorized
failure, and the no-decision boundary through the frozen Review route.

The ninth bounded backend slice adds `RefreshReviewSession` through command
envelope 1.5, CapabilityGrant 1.4, V036, an authenticated route, and a
renderer-neutral client. One serializable transaction verifies the exact
current open ReviewSession, Actor, grant, ProjectDefinition, Objective,
authority position, existing member identities, compatible current working
heads, registered Claim and ASSERTS records, task, snapshot, and endpoint. It
then appends one revision under the same ReviewSession identity and stores the
typed result in the canonical command ledger. The stale session revision and
all candidate and authority records remain retained; refresh creates no
candidate, basis, validation, decision, ChangeSet, Approval, domain event,
outbox record, projection instruction, or recovery ledger. Unsupported
profiles and incompatible current revisions fail closed.

This ninth slice does not add frozen Refresh presentation, correction or
material-basis revision, separation, member recovery, a scheduled validator
rerun, a second profile, multi-member presentation, Brief, communication, or
the cumulative Wave 4 proof.

The tenth bounded design slice integrates the typed refresh operation into the
frozen stale/open Review control. It retains exact retry input when the outcome
is uncertain, accepts only a matching typed result, revalidates the
authenticated Review read after success, and does not infer lifecycle,
eligibility, membership, validation, or authority in the browser.

The eleventh bounded backend slice adds `CorrectReviewCandidate` through
command envelope 1.6, CapabilityGrant 1.5, V037, an authenticated route, and a
renderer-neutral client. One serializable transaction composes the accepted
scientific Claim and working-state admission with the existing ReviewSession.
It advances the same Claim, WorkingCandidate, ASSERTS WorkingRelationship,
Review member, and ReviewSession identities, retains every prior revision and
exact source-basis identity, resets validation to pending, and records its
typed result in the canonical command ledger. Correction remains additive
working state: it creates no Review decision, ChangeSet, Approval, domain
event, outbox record, projection instruction, History entry, or recovery
ledger. Exact retry returns the retained revisions; stale, mismatched,
unauthorized, unsupported-profile, invalid-lineage, incompatible-basis,
invalid-provenance, and retry-content cases fail closed.

This eleventh slice does not add frozen correction presentation,
material-basis revision, separation, member recovery, a scheduled validator
rerun, a second profile, multi-member presentation, Brief, communication, or
the cumulative Wave 4 proof.

The twelfth bounded backend slice adds compact human Claim-text preparation to
the same correction authority through command envelope 1.7 and V038. The
authenticated caller still binds the exact open Review, member, candidate, and
relationship but supplies only the replacement Claim text. Inside the existing
serializable transaction, the scientific profile adapter retains exact scope
and source-basis identity, composes human authorship and timestamps, reuses the
candidate's ProjectDefinition, task, snapshot, basis, qualifications, and
authority boundary, appends exact prior-record input and provenance, resets
validation to pending, and computes all record hashes. Exact retries return the
retained result even when transport metadata changes; changed-content retries
fail closed. The operation creates no second ledger and grants no Review or
domain authority.

This twelfth slice does not add frozen correction presentation, editable scope
or material basis, separation, member recovery, a second profile, Brief,
communication, or the cumulative Wave 4 proof.

The following bounded design slice maps the compact human Claim-text command
through the frozen **Edit candidate** disclosure. It keeps draft, disclosure,
and focus client-local; sends only the exact server-supplied Review and working
references, caller-owned command identity, and edited text; retains the exact
request for uncertain reconciliation; accepts only a matching typed result;
and reloads the authenticated Review after confirmed success. Its stale,
unauthorized, unsupported-profile, invalid-response, retry-mismatch, and
uncertain-result states claim no Review decision, validation success,
application, or domain authority. The browser uses bundled canonical response
schemas without reconstructing profile records or working revisions.

This design slice does not add editable scope or material basis, separation,
member recovery, another profile, multi-member presentation, Brief,
communication, or the cumulative Wave 4 proof.

The thirteenth bounded backend slice adds `ReviseReviewCandidateBasis` through
command envelope 1.8, CapabilityGrant 1.6, V039, an authenticated route, and a
renderer-neutral client. One serializable transaction binds the exact current
open single-member Review, ProjectDefinition, Claim, WorkingCandidate,
WorkingRelationship, ASSERTS record, active ProjectSource, SourceSpans, human
Actor, capability, command, and idempotency identities. The first scientific
adapter preserves source scope and WorkVersion, advances the existing Claim and
working identities through additive `basis_revision` lineage, resets
validation to pending, and rebinds the same Review member. Exact retries return
the retained result; stale, unauthorized, unsupported, incompatible-source,
no-change, corrupt, and retry-mismatch cases fail closed.

This thirteenth slice does not decide or validate the Review, create or apply a
ChangeSet, approve anything, emit domain authority, project the graph, update
History, or create another ledger. It does not add frozen material-basis
presentation, source-scope or WorkVersion changes, separation, member recovery,
a second profile, Brief, communication, or the cumulative Wave 4 proof.

The following bounded design slice maps the accepted **Change basis** control
inside the frozen Basis region. It receives exact Review, member,
ProjectDefinition, WorkingCandidate, WorkingRelationship, Claim, ProjectSource,
and SourceSpan positions from authenticated reads; keeps human source semantics,
disclosure, and focus client-local; retains one exact request while its outcome
is uncertain; accepts only a matching typed result; and reloads authenticated
Review state after success. Claim-text correction remains a separate disclosure
inside Current and Candidate. Stale, unauthorized, unsupported-profile,
incompatible-source, no-material-change, invalid-response, retry-mismatch, and
uncertain-result states claim no validation success, Review decision,
application, or domain authority.

This design slice does not support source-scope or WorkVersion changes,
separation, member recovery, another profile, multi-member presentation, Brief,
communication, or the cumulative Wave 4 proof.

The fourteenth bounded backend slice adds `SeparateReviewSessionMember` through
command envelope 1.9, CapabilityGrant 1.7, V040, an authenticated route, and a
renderer-neutral client. One serializable transaction moves one exact unchanged
member from a current open multi-member ReviewSession into a new canonical
single-member ReviewSession while advancing the source ReviewSession. It
retains the original member identities and immutable working bindings in their
partition and records the typed receipt only in the existing command ledger.
Generic ReviewSession registration refuses membership changes, so the command
boundary cannot be bypassed.

Separation validates exact Project authority, ProjectDefinition, Objective,
profile ownership, and stored hashes. It also checks every existing ChangeSet
that touches a Review member and refuses any partition that would split or
partially assign one atomic ChangeSet semantic unit. It creates no candidate,
relationship, basis, validation, decision, ChangeSet, Approval, domain event,
outbox record, projection instruction, History entry, or recovery ledger.

This fourteenth slice does not add frozen separation presentation, member
recovery, a second profile, dependency-group editing, Brief, communication, or
the cumulative Wave 4 proof.

The fifteenth bounded design slice connects the frozen Review hierarchy's
accepted **Separate changes** control to the typed separation client. The
authenticated read retains all exact Review members, and client-local selection
opens the complete frozen comparison and decision hierarchy for one member at a
time. The command submits the exact Review revision, content hash, open
lifecycle, member, command, and idempotency identities. It locks competing
commands, retains the same request for uncertain retry, accepts only a matching
typed partition, links the new exact ReviewSession, and starts an authenticated
reload of the source Review after success.

The presentation does not calculate separation eligibility, ChangeSet
atomicity, semantic compatibility, validation, approval, application,
recovery, domain authority, or graph authority. This fifteenth slice does not
add member recovery, a second profile, dependency-group editing, permitted
independent apply, Brief, communication, or the cumulative Wave 4 proof.

D020 accepts the next bounded backend slice: an authenticated, read-only,
snapshot-consistent `RecoveryAssessment` for the current scientific Review
profile. It reconciles exact Review, candidate, ChangeSet, Approval, command,
event, receipt, and projection records; separates Review outcome from effect
knowledge; returns preservation evidence and a complete member manifest grouped
by atomic ChangeSet; and fails closed on incomplete or inconsistent evidence.
It executes nothing, creates no recovery command or ledger, and returns action
descriptors only when an existing typed owner proves current eligibility.
Broader cross-module recovery remains in Wave 6.

D021 resolves the following Apply checkpoint boundary through D005's existing
human-decision authority. The first ReviewSession Apply path binds an exact
authenticated human checkpoint and reports ReviewPolicy as not applicable. It
reuses the current ChangeSet, Approval, command, event, projection, History,
capability, and recovery owners. Delegated or automatic Apply remains
unavailable until a versioned ReviewPolicy owner exists.

Similarity-based batch suggestions remain advisory. Material application uses
the existing ChangeSet/approval path, with dependency-coupled atomicity and
independent member receipts.

Exit gate: one model or human candidate can appear incrementally in the working
graph, enter a resumable Review, apply through the authoritative path, and update
the Brief and History without losing provenance.

### Wave 5 — governed documents, imports, exports, and packages

Implement imported lineage and promotion, the profile-neutral document read,
durable working-document revisions, exact export/status/delivery records, source
retention completion, managed Project folders, and `.petra` checkpoint packages.
This establishes `UX-REQ-005` and `UX-REQ-017` through `UX-REQ-019` and
completes `UX-REQ-010` retention behavior.

Exit gate: Petra can explicitly import or create a document, preserve exact
ancestry, edit and validate successive revisions, export an honestly marked
working copy, and restore the same Project identity and retained history from a
verified package.

### Wave 6 — model-readable presentation and composed recovery

Implement PresentationContext and semantic-peer binding, then RecoveryAssessment
and exact registered-action composition. This establishes `UX-REQ-022` and
`UX-REQ-023` only after their owning queries and commands can supply truthful
state.

Exit gate: Petra can explain the graph the user actually sees without inferring
semantics from pixels, and can reconcile uncertain effects across a representative
read, Work, Review/apply, save, projection, and delivery failure.

### Wave 7 — replace neutral fixtures and close evidence gates

Migrate each reference-UX packet from synthetic to live data as one explicit
contract boundary. A packet or capability is either live end to end, synthetic
and confined to conformance testing, or unavailable with its missing dependency
named. Never mix live authority with silent fixture fallback.

Run the named `UX-FX01` through `UX-FX46` evidence appropriate to each packet,
including interaction, accessibility, clean-start, recovery, privacy, and
performance gates. Contextual integrations begin only after the neutral product
stands independently.

## M1.9 closeout cut line

`M1.9-W04` integrates the frozen reference presentation with the existing M1
scientific vertical slice through the minimum live contracts required by that
slice. Its recorded recovery gate verifies asynchronous state, exact source and
graph identity, stale Review prevention, reversal-aware graph absence,
grounded interaction replay, stream abort versus Work cancellation, terminal
persistence, and recovery.

`M1.9-AC01` through `M1.9-AC04` pass for the scoped scientific evidence spine.
The closeout explicitly retains the partial and unavailable neutral UX
requests; it does not relabel M1's scientific proof as full `UX-REQ-001`
through `UX-REQ-023` conformance.

## Immediate next implementation task

Resolve FE-A1.3-W01's registered conversational interaction contracts and
FE-A1.3-W02/W03's eligible model routes and exact text retention/read boundaries,
alongside the FE-A1.1 copilot components and FE-A1.2 definition/empty-entry
construction. Continue through the ledger's prerequisite graph to reactive
Workspace, native claim/object examiners, functioning graph/scene guidance,
scoped cyclic Hypothesis assessment/closure/invalidation, complete progressive
Inspect and adapted operation conformance. Verification attaches to each
function. Optional end-of-A1 groupings do not add required capabilities.

### Retained earlier implementation handoff

Treat the completed M1.9 cumulative result, Wave 1 neutral read foundation, the
passed Project Work and inquiry composition, the live ProjectThread
authority/read/workspace slice, and the governed ProjectSource lifecycle plus
replacement foundations as the safety point. The PostgreSQL transaction-aware
authorization seam and canonical Project-command grant authority are now in
place. The single-user principal resolver and authenticated ProjectSource
exclude/restore API now pass, and a typed workbench client reaches that boundary
without changing the frozen presentation. The replacement-compensation
semantics are accepted in D019 and the governed backend command path is now
persisted through V030 with command/event/receipt/dual-outbox and grant 1.1
vocabulary. Authenticated replacement APIs and the typed client now reach that
authority, and the frozen lifecycle/replacement control-slot mapping is recorded
without client authority. For History, the exact assessment, five-minute
preview, confirmed non-persisted plan, and separately confirmed exact execution
map into the existing detail and subordinate dialog. The full echoed plan
confers no Actor, grant, command identity, or authority. Initial execution
revalidates current preview authority; each command then owns its transaction
and current grant check. Exact completion, a retained successful prefix,
terminal retained failure, unretained failed attempt, and not-attempted work all
come from immutable command executions and events rather than a second History
or execution ledger. Impact 1.4 preserves the three independent operational
groups under the same selected-event target and adds a destination state to
each existing reference. The frozen detail mapping preserves every
WorkerInputManifest, WorkUnit, output, InteractionRun, and replay authority
chain. Only the exact current Work row may link through same-snapshot
ProjectDefinition and Project Work detail authority; output and replay remain
static with their exact unavailable reasons. The client retains History origin,
focus, scroll, and return context locally. Retained 1.2 Actor and target
catalogues now map into the existing Full History filter fields without client
authority or origin classification. The stable continuation-failure contract
now maps all three subcodes into the existing invalid-continuation state without
decoding `phc2`, varying public copy, or disclosing a failed binding. Episode
1.2 preserves episode 1.1's exact retained ProjectDefinition identity,
revision, hashes, strictly earlier stream boundary, source, selection basis,
and unavailable state. The frozen selected-event semantic-destination position
uses the supplied exact primary target, `history` role, `view_history` intent,
retained definition, interpretation basis, and event-bound episode route only
for an available result. The three supplied unavailable outcomes create no
link. Definition content stays omitted, and no current definition, label, term,
URL, component, CSS rule, browser route, origin, recovery behavior, or client
authority is inferred. The next safe backend History increment is one
separately registered destination adapter for a newly supported event-target
family with exact target and renderer-neutral route authority; until then, do
not widen the registry. Episode 1.2 already covers every primary target family
in the currently supported event union.
Physical deletion remains excluded. Do not infer external filesystem edits or
turn either conformance example into a mandatory template.

## Verification status

The original disposition was based on read-only inspection of the frozen
handoff, neutral reference implementation, accepted decisions, runtime schemas,
repositories, server routes, M1.9 reports, and roadmap state. The status refresh
records the verified cumulative trace, six additive live presentation reads,
initial semantic-location slice, Project-shell 1.1 context expansion, the first
read-only effective Project controls composition, and paired project-authored
scientific/controlled-writing conformance across the neutral reads. It does not
claim profile-specific object adapters or full neutral-product conformance. The
first Wave 2 Project Work read is live end to end; its stage, input-request,
inquiry/Review, output-usability, and command limitations remain explicit. The
ProjectThread foundation is durable through PostgreSQL V022 and its exact read,
route, and frozen-surface integration are live; lifecycle commands, retained
transcript bytes, and continuation execution remain open.
The Project inquiry authority is durable through PostgreSQL V023 and proves
zero, many, and shared Work links plus non-authoritative GroundedResponse
bearing. Its collection/detail reader, authenticated routes, strict contract
parity, and frozen Work composition pass; additional definition-valid adapters,
stronger semantic authorities, and broader surfaces remain open.
The ProjectSource lifecycle preview now resolves exclusion, restoration, and
local-copy deletion intent through a repeatable-read Project-scoped dependency
and retention view. Typed backend exclude/restore commands additionally enforce
authorization, exact expected state, idempotency, immutable Project events and
receipts, retained history, and compensating recovery through PostgreSQL V024.
The public lifecycle command now resolves exact Actor/capability authority and
returns the retained receipt; physical deletion remains unavailable pending
policy, and frozen-interface integration remains open.
V025 additionally retains exact, bounded, acyclic ProjectSource supersession
lineage tied to the predecessor's exclusion receipt. V027–V029 retain exact
relationship retractions and validate a derived effective head. The semantic
locator now returns only the active replacement chain without client inference.
V030 adds governed replacement creation/retraction, exact replay, immutable
events and receipts, dual graph/interface outbox intent, and strict relation
retraction before predecessor restoration. Separate authenticated create and
retract routes plus the typed client now pass without changing the frozen
presentation.
The PostgreSQL command authorities await authorization after their
deterministic locks and inside the transaction that owns replay or application.
V026 adds immutable exact command grants and retained revocations, while its
database-backed authorizer serializes revocation against in-flight authorized
commands. The effective-controls read now reports this authority without
inferring it from execution references. The server-configured single-user human
principal now resolves exactly one eligible Project-command grant and fails
closed on missing or ambiguous authority. Lifecycle and replacement routes use
that resolution and still revalidate the grant transactionally.
The current complete repository gate passes with 856 always-on TypeScript tests,
25 Python tests, and seven expected service-dependent skips; the real PostgreSQL
suite passes 110 cases after a clean V001-through-V031 migration.
The History impact 1.3 proof resolves the selected event's exact immutable
target record, follows its WorkerInputManifest binding into the selected
Project's current WorkUnit head, and validates every Work, input, output,
InteractionRun, and replay content or record hash. It returns immutable
WorkerOutputManifest and InteractionReplayRecord dependents while excluding a
second Project's Work over the same target. It does not infer either dependent's
effect, treat replay as worker-output delivery or a ProjectThread binding,
compose transitive closure, or claim a cross-family order.
The History impact 1.4 proof validates the current ProjectDefinition record
before returning a renderer-neutral Work destination bound to the exact current
WorkUnit revision and record hash and the existing Project Work detail
authority. Advancing that definition to remove Work support changes only the
Work destination to its exact unavailable state. Output and replay references
remain unavailable with distinct reasons, and contract, typed-client, and
PostgreSQL checks reject a fabricated replay-to-ProjectThread destination.
The retained History 1.2 proof validates bounded Actor and target catalogues
against the exact Project, retained snapshot, and complete normalized query. It
proves replace-only dimension counts, active-first stable order, continuation
stability after an append, unrelated-Actor exclusion, selected-option count
equivalence for positive results, exact immutable Actor descriptors, and
revision-neutral target-title unavailability. Contract, Python parity,
typed-client, and PostgreSQL checks reject a fabricated target title.
The retained-continuation failure proof classifies malformed shape/prefix,
signature, payload, and encoding failures; Project/limit/complete-query binding
mismatches; and unavailable retained authority or snapshot-head evidence at
their exact server-side failure points. HTTP 422, the outer code, fixed public
message, and restart instruction remain constant. The API exposes no cursor or
internal diagnostic, cursorless validation gains no subcode, and the strict
typed client preserves classification and restart only for a fully valid
envelope.
The episode 1.2 proof validates an available History destination against the
exact retained ProjectDefinition and selected event, a no-authority result for
an event before every retained binding, and the exact unavailable state when a
retained definition omits History. A later definition without History does not
alter an earlier event's destination. Contract fixtures, Python parity, the
typed client, and PostgreSQL checks reject a destination without authority, a
substituted definition, and a route bound to another event. V031 retains future
definition boundaries while backfilling the current definition only after the
existing Project stream head.
The History recovery proof validates exact promotion ChangeSet/Approval,
current Claim–Assertion, active-grant, impact-summary, blocker, and retained
compensation bindings under repeatable-read isolation. It exercises eligible,
blocked, and already-compensated states across application and reversal events
without composing a preview or executing another command. The compensation-
preview proof validates exact assessment/authority binding, ordered operations
and results, five-minute freshness and invalidation, and missing, ambiguous, or
already-compensated rejection while proving unchanged ChangeSet, Approval,
command, event, and evidence-revision counts.
The compensation-plan proof reconstructs the compact preview reference from
current authority, preserves distinct command grants, rejects tampering,
cross-Project reuse, unconfirmed input, and grant changes, validates the exact
causal envelope chain, and proves that plan composition leaves the same
authority-table counts unchanged.
The compensation-execution proof separately validates explicit confirmation and
the per-command atomicity acknowledgment, current-plan revalidation, exact
idempotent completion replay, tamper and cross-Project rejection, and zero
duplicate writes. It also distinguishes an unretained interrupted Approval
attempt and resumes from the retained Submit prefix to the exact reversal event
and resulting evidence revisions.

<!-- A1-SYNC:START -->

## Controlling A1 execution

Binding: `sha256:81218b7f14816dc38def5de230a0eca92e9e857bc3da6057bd7e849fcfa8da55`. 9/90 required items complete; 81 incomplete.

D024 governs the conversational copilot and reactive Workspace. D025 governs synchronized execution and two distinct validation passes. The canonical [function ledger](../scripts/frontend-a1-work-inventory.json), [readable implementation ledger](FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md), and [granular execution instructions](../scripts/frontend-a1-execution.md) agree before work starts, evidence is recorded, completion is accepted, or another wave proceeds.

Active work: FE-A1.3-W03, execution.

| Stage   | Required behavior                                                          | Complete / required |
| ------- | -------------------------------------------------------------------------- | ------------------- |
| FE-A1.0 | Contract reconciliation and execution control                              | 6 / 6               |
| FE-A1.1 | Copilot shell and interaction design                                       | 0 / 7               |
| FE-A1.2 | Conversational zero/empty Project entry                                    | 0 / 7               |
| FE-A1.3 | Durable grounded conversation and AG-UI                                    | 2 / 18              |
| FE-A1.4 | Reactive Workspace, compositional examination and cyclic graph-guided work | 0 / 23              |
| FE-A1.5 | Progressive inspection and complete authority receipts                     | 0 / 9               |
| FE-A1.6 | Complete migration and operation conformance                               | 1 / 7               |
| FE-A1.7 | Functional verification and explicit user acceptance                       | 0 / 13              |

Select one prerequisite-ready item. Execute every criterion with proper tests; then challenge the delivered behavior in a separate critical pass with distinct tests. Repair findings when needed. Two unsuccessful attempts require broad diagnosis before more local retries. Preserve earlier partial evidence. The sixteen late scenarios are optional; browser semantics are required and native screen-reader evaluation remains excluded. Wave 7/8 stay blocked until all required functions pass and the user accepts the exact candidate.

<!-- A1-SYNC:END -->
