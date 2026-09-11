# UX runtime architecture disposition and implementation sequence

Status: implementation-track review complete; M1.9 cumulative trace, six live
presentation reads, interface recovery gate, semantic-location foundation,
expanded Project-shell context, initial Project Work read, durable Project
thread read, initial Project inquiry authority/read plus frozen Work
composition, and governed ProjectSource exclusion/restoration authority passed;
exact ProjectSource supersession/location and governed backend replacement
creation/retraction plus authenticated API and typed-client integration also
passed; bounded Recent changes, exact event-selected episodes, signed
snapshot-stable filtered retained Project-event traversal, and bounded direct
dependency impact plus registered exact semantic-target adapters through
ProjectSource and replacement authority and event 1.3 also passed; exact
retained ProjectDefinition authority and its bounded renderer-neutral historical
History destination at a selected event now pass without current-definition or
client interpretation;
broader neutral runtime work remains open; transactional authorization
and canonical Project-command CapabilityGrant authority passed
Date: 2026-09-11
Backend baseline: `main` at `344cf77`
Frozen design baseline: `655d094`
Design handoff reviewed: `ced8d81`
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
`petra.project-history-episode-view@1.1.0` adds an exact read-only retained
ProjectDefinition authority state for the selected event. PostgreSQL V031
serializes definition registration with Project event append and retains the
definition identity, revision, content hash, record hash, and stream boundary.
Only a boundary strictly before the event is available; pre-binding events
remain explicitly unavailable. The response performs no historical terminology,
place, or destination interpretation and never substitutes the current
definition.
`petra.project-history-episode-view@1.2.0` uses only that exact retained
definition and Petra's registered History target registry to interpret the
selected event's existing History destination. Availability requires retained
History-place support and returns the exact target, definition, and event-bound
episode route authority. Missing definition authority, missing retained History
support, and an unregistered target remain distinct unavailable results. The
response exposes no definition content, label, term, URL, renderer component,
CSS rule, browser route, recovery change, or client-derived authority.
`petra.project-history-retained-view@1.0.0` now traverses the complete retained
Project event stream newest-first with bounded keyset pages. Signed opaque
cursors bind the Project, initial authority position, Project-stream head,
exact head event/hash, and exclusive continuation boundary. Appends cannot
shift an in-progress traversal. Retained event membership stays fixed while
recovery eligibility is explicitly recomputed against current page-read
authority. No offset, filter, parallel ledger, or cross-family order is exposed.
`petra.project-history-retained-view@1.1.0` adds single-value exact family,
command, event, Actor, outcome, observed-effect, semantic-target, and inclusive
recorded-time filters. Its `phc2` cursor binds the Project, retained snapshot,
exclusive keyset boundary, limit, and complete normalized filter identity under
one signature. Matching counts and zero-result pages stay inside the authorized
Project snapshot; Project-stream order remains newest-first and is not recast as
a timestamp or cross-family order. The current authority still has no trusted
origin classification, so origin filtering remains explicit unsupported work.
`petra.project-history-retained-view@1.2.0` adds bounded Actor and exact-target
option catalogues inside that same authenticated collection response and
repeatable-read snapshot. Each catalogue replaces only its own dimension while
preserving all other normalized filters, reports server-derived matching-event
counts and explicit coverage, and remains stable across cursor continuation.
Actor names come only from exact immutable Actor records present in authorized
Project events. Revision-neutral targets retain their semantic key and object ID
and explicitly decline to infer a current or historical title.
`petra.project-history-retained-continuation-failure@1.0.0` now gives rejected
`phc2` continuations one of three stable subcodes: invalid cursor, complete
Project/query/limit binding mismatch, or unavailable retained snapshot. Every
case keeps the existing outer query-invalid code and status, returns one fixed
non-disclosing restart message, and directs the client to discard the opaque
cursor and repeat the same active query without it. Successful retained reads
remain version 1.2, and ordinary cursorless query failures have no continuation
subcode.
`petra.project-history-impact-view@1.0.0` now inventories four registered kinds
of direct dependents for one exact selected event under current repeatable-read
Project authority: causally downstream commands, exact event outbox records,
graph-projection attempts, and GroundedResponse invalidations. Every bounded
group names its owning immutable authority source, exact identities, total, and
coverage. The authenticated API and typed client preserve selected actor, time,
target, observed effect, and semantic destination while stating that semantic-
target, transitive, profile-specific, and external dependencies remain omitted
or unknown. It neither decides reversibility nor composes compensation.
`petra.project-history-impact-view@1.1.0` now preserves those direct groups and
adds four bounded exact semantic-target adapters over existing immutable
change-control, ReviewSession membership, GroundedResponse dependency, and
composition-lineage authority. Each selected target is resolved at its exact
revision/hash under the same repeatable-read Project snapshot; each adapter
reports its own authority source, exact relation identity, total, coverage, and
current/historical/immutable posture. Registered keys with incomplete or
unavailable target authority and unregistered ProjectSource/replacement keys
remain explicit non-results. Identity-only relations, transitive closure,
dependent effects, reversibility, and compensation are not inferred.
`petra.project-history-impact-view@1.2.0` adds five bounded exact adapters for
ProjectSource lifecycle receipts, source-bound downstream dependencies,
immutable replacement/retraction lineage, immutable replacement command
receipts, and the current derived replacement head. Exact ProjectSource and
replacement targets are re-resolved inside the same Project repeatable-read
transaction. Retained lineage uses immutable-revision posture; the separate
effective-head group reports whether the exact replacement is the current
active or retracted head. The existing target/ref bounds, explicit unavailable
states, event support through 1.3, and non-inference boundaries remain intact.
`petra.project-history-impact-view@1.3.0` now preserves the 1.2 result and adds
three separately bounded operational adapters. Exact immutable target record
bindings lead to the current WorkUnit head, immutable WorkerOutputManifest
records for that bound Work, and immutable InteractionReplayRecord receipts for
InteractionRuns tied to the same Work. Every reference retains its target,
WorkerInputManifest, WorkUnit, and applicable InteractionRun authority chain.
Project scoping, independent counts, and record hashes are enforced under the
same repeatable-read snapshot. The view does not infer output or delivery
effects, claim that replay delivered worker output, compose a transitive
closure, or assert a cross-family order.
`petra.project-history-impact-view@1.4.0` now gives every operational reference
an explicit renderer-neutral destination state. Only a current WorkUnit whose
same-snapshot current ProjectDefinition supports Work receives an available
destination, bound to its exact revision and record hash and to
`petra.project-work-view@1.0.0` detail authority. Missing Work-place authority,
WorkerOutputManifest, and InteractionReplayRecord destinations remain
explicitly unavailable. Petra does not redirect output to owning Work or replay
to a ProjectThread, and it returns no URL or client return state.
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
multi-profile Review renderers, Review deferral/reopen and batch commands,
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
  Project-event traversal, and exact causal History episode reads are also live;
  Brief and the remaining neutral-product queries are not live.
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

| Request | Current capability | Missing work and disposition | Sequence |
| --- | --- | --- | --- |
| `UX-REQ-001` | **Partial, advanced after baseline.** `ProjectShellView` 1.1 now composes exact ProjectDefinition, focused Objective, authority position, projection freshness, attention, ProjectDefinition-supported place summaries, and optional exact semantic selection under one repeatable-read transaction. The client verifies a complete route identity/hash tuple and does not persist selection. Paired project-authored scientific and controlled-writing definitions prove neutral term resolution. | Add exact attention-Work references, complete Review posture, active Work context, selection/Details behavior across applicable frozen surfaces, and the remaining accessibility/recovery validation. | Wave 1 read foundation complete; Wave 2 and integration validation |
| `UX-REQ-002` | **Partial.** EvidencePacket, GroundedResponse, Work, review, graph, and composition records can supply a scientific Brief. | Add a bounded `ProjectBriefView` composition with exact basis, comparison, attention, recent decisions, and SuggestedAction references. Resolve sections through ProjectDefinition roles; keep summaries read-only. | Wave 4 |
| `UX-REQ-003` | **Partial, advanced after baseline.** `petra.suggested-action-view@1.0.0` now derives one stable revisioned action from an exact immutable inquiry-result link under authenticated repeatable-read Project authority. It binds the exact ProjectDefinition, Objective, snapshot, GroundedResponse, any declared producing Work, reason, scope, depth, result, capability posture, no-work consequence, and typed inquiry-detail read. Current definition/objective/reuse authority supplies server-owned ready or stale state; the action starts no Work and creates no second ledger. | Add Work-starting action families, exact capability/grant/budget/tool/interrupt/cancellation readiness, invocation commands with idempotency and stale regeneration, durable Work/result/History/recovery bindings, and frozen-interface integration. Direct and conversational invocation share the command. | Wave 3 read-only existing-result preview passed; Work invocation next after design mapping |
| `UX-REQ-004` | **Partial, adapted and advanced after baseline.** ProjectDefinition and Objective contracts, immutable PostgreSQL authority, current binding, terminology, supported places, and optional template-seed origin now exist without requiring a profile catalogue. Paired scientific and controlled-writing Projects are independently project-authored and pass the same shell, control, and client-mapping paths. | Add full extension, presentation, compatibility, component-resolution, impact-review, and migration behavior while preserving Project-specific definitions. | Wave 1 foundation complete; extensions in later waves |
| `UX-REQ-005` | **Partial.** Artifact/Manifest, document, DraftArtifact, provenance, support assessment, and additive draft revision preserve exact scientific ancestry. | Add an explicit imported-lineage root and reviewed promotion command for existing documents or projects. Import never endorses extracted meaning or overwrites the source. | Wave 5 |
| `UX-REQ-006` | **Partial, advanced after baseline.** `petra.project-thread@1.0.0`, V022, and `ProjectThreadAuthorityRepository` provide durable Project-owned thread identity, immutable completed turns, exact definition/input/context/snapshot/execution/Work/result/Artifact/authority bindings, contiguous revisions, retained branch origin and continuation mode, and hash-only prompt limitations where legacy input bytes do not exist. `petra.project-thread-view@1.0.0`, authenticated routes, and the frozen Petra workspace now expose bounded exact collection/detail reads without fixture transcript fallback. InteractionRun remains execution and delivery state rather than the product thread. | Add create/append/branch/archive/reopen commands, stale-snapshot preflight and execution, retained transcript bytes for new turns, compaction, proposal/decision and PresentationContext linkage, and archive reconstruction. | Wave 2 read integration passed; commands and richer retention remain |
| `UX-REQ-007` | **Partial, advanced after baseline.** `petra.project-history-view@1.0.0` and its authenticated repeatable-read PostgreSQL composition expose at most ten newest event-producing Project commands across domain-event 1.0–1.3 with exact command/event/Actor/time/target/effect facts, semantic History destinations, and current lifecycle/replacement recovery eligibility. `petra.project-history-episode-view@1.0.0` adds exact event-selected parent/following-command causation, separate Project-stream adjacency, and exact applicable receipt references; 1.1 adds the exact retained ProjectDefinition identity, revision, content hash, record hash, and stream boundary effective before the event, or an explicit unavailable state, without historical interpretation. Episode 1.2 uses only that exact retained definition and the registered History target registry to return an event-bound renderer-neutral History destination or exact unavailable result, without exposing definition content or renderer instructions. `petra.project-history-retained-view@1.0.0` adds complete Project-event traversal with signed Project/snapshot-bound keyset cursors and explicitly separates stable retention membership from current recovery authority; 1.1 adds bounded exact family/command/event/Actor/outcome/effect/target/time filtering with authorized matching counts and cryptographic Project/snapshot/limit/complete-query cursor binding; 1.2 adds same-snapshot Actor and exact-target option catalogues with replace-only-the-same-dimension facet counts, immutable Actor descriptors, and explicit exact-identity-only target fallbacks. `petra.project-history-retained-continuation-failure@1.0.0` adds stable invalid-cursor, binding-mismatch, and snapshot-unavailable subcodes under one non-disclosing fail-closed restart contract. `petra.project-history-impact-view@1.0.0` adds four authorized bounded direct dependency groups; 1.1 adds independently bounded exact semantic-target adapters over immutable change-control, Review membership, GroundedResponse dependency, and composition-lineage authority. Version 1.2 adds bounded exact ProjectSource lifecycle/dependency and replacement lineage/receipt/effective-head adapters, keeping retained lineage separate from current effective state. Version 1.3 adds separately bounded exact record-binding adapters for current WorkUnit heads, immutable WorkerOutputManifest records, and immutable InteractionReplayRecord receipts while preserving their input-manifest, Work, and applicable InteractionRun authority chains. Version 1.4 adds an explicit destination state to every operational reference: exact current Work may name the ProjectDefinition-authorized Work detail, while output and replay remain unavailable because neither has an exact Project-owned route. `petra.project-history-recovery-assessment-view@1.0.0` composes one applied or reverted event with its exact promotion ChangeSet, Approval, current evidence heads, causal-impact summaries, and server-resolved command grants to report eligible-for-preview, precise blockers, or an exact retained compensation. `petra.project-history-compensation-preview-view@1.0.0` derives a five-minute, revision- and authority-bound preview of the exact Claim–Assertion retraction, resulting revisions, preservation facts, required input, and governed three-command sequence only from a currently eligible assessment. `petra.project-history-compensation-plan-request@1.0.0` and `petra.project-history-compensation-plan-view@1.0.0` then accept only the exact preview reference and required human input, reconstruct every binding from current authority, and compose the deterministic ChangeSet, Approval, and three causal command envelopes without persistence. `petra.project-history-compensation-execution-request@1.0.0` and `petra.project-history-compensation-execution-view@1.0.0` separately execute that exact plan through the existing idempotent command authority. A first attempt revalidates the plan against current preview authority; retries derive an exact completion or retained prefix from immutable command executions and events. Every command owns its transaction and current grant check, and the result distinguishes retained failure, unretained attempt failure, and not-yet-attempted work instead of claiming three-command atomicity. Every group preserves exact identities, relation identity, owning authority, totals, coverage, and authority posture while declining to infer dependent effect, transitive closure, or cross-family order. All History state derives from existing authority, persists no second ledger, keeps graph navigation history client-local, and exposes no generic undo. | Add an authoritative origin filter, interpretation beyond the registered selected-event History destination, exact return, and applicable accessibility/recovery evidence. Do not erase or rewrite events. | Wave 3 Recent changes, causal episode, filtered retained traversal with authorized filter options and stable continuation failure classification, direct, semantic-target, and operational impact, exact ChangeSet recovery assessment, read-only compensation preview, confirmed command-plan composition, and separately authorized exact execution with partial-outcome recovery passed; episode 1.2 historical-destination freeze-conformance mapping next |
| `UX-REQ-008` | **Partial, advanced after baseline.** `petra.project-object-location-view@1.0.0` and its Project-scoped PostgreSQL reader resolve exact current or retained historical ProjectSource, Assertion, ChangeSet, WorkUnit, and DraftArtifact identities to ProjectDefinition-permitted semantic place roles. V025 plus V027–V029 make its `superseded` state and bounded active replacement chain live while retaining retracted lineage separately. The frozen client alone maps roles to routes. | Add replacement/parent adapters for other owning object types, retained Project-snapshot selection, extension-registered profile tools, actor-specific object authorization if required, and full applicable `UX-FX19` evidence. | Wave 1 read foundation plus current/historical ProjectSource replacement separation passed; type-specific later slices |
| `UX-REQ-009` | **Partial, advanced after baseline.** The scientific ProjectSource specialization and authorized collection/detail view now bind exact role, identity, copy, rights, parsed coverage, preview spans, downstream use, and authority position. The paired definition proof establishes neutral reference terminology but not a controlled-writing source adapter. | Add non-scholarly source specializations, linked Work/results, broader limitations, intake, and source-adapter conformance. | Wave 2 |
| `UX-REQ-010` | **Partial, advanced after baseline.** ProjectSource has stable Project-local identity and immutable active or excluded revisions over a retained copy. `petra.project-source-lifecycle-view@1.0.0` previews exclude, restore, or local-copy deletion intent against eight bounded exact dependency groups and seven explicit retention areas. Lifecycle command/event/outbox 1.2, the lifecycle receipt, V024, and the PostgreSQL authority execute authorized, idempotent exclude/restore transitions as status-only revisions with compensating recovery. The authenticated public lifecycle route resolves a server-configured human Actor and exactly one active Project-command grant, rejects request-carried authority, and returns the exact receipt and resulting source revision. `petra.project-source-replacement@1.0.0`, immutable retraction 1.0, and V025/V027–V029 add exclusion-receipt-bound supersession with a validated effective head. Command/event/outbox 1.3, CapabilityGrant 1.1, the immutable replacement receipt, and V030 now govern creation and relation-only retraction atomically. Separate authenticated create/retract routes and a typed client reach that authority without request-carried identity. D019's separate next restore is enforced: restore fails while the replacement is active. All dependents and source materials remain retained; physical deletion is unavailable. | Add frozen-interface preview/confirmation/receipt/recovery integration, other source adapters, and broader dependency policy. Do not expose physical deletion until an accepted retention policy exists. | Wave 2 backend lifecycle, governed replacement authority, authenticated APIs, and typed clients passed; frozen presentation integration next; physical-copy policy in Wave 5 |
| `UX-REQ-011` | **Partial.** Claim/Assertion quarantine and DraftArtifact revisions prove proposal-before-authority in scientific paths. | Add ProjectDefinition-valid WorkingCandidate and working-relationship records for arbitrary domain objects, with exact turn/task/model/tool origin and validation state. Project them as the live working graph layer. | Wave 4 |
| `UX-REQ-012` | **Partial, advanced after baseline.** EvidenceReviewBatch, accept/reject/correct plans, durable review interrupts, ChangeSets, approvals, and independent batch outcomes exist. V021 now adds durable profile-neutral ReviewSession identity plus a snapshot-consistent scientific Claim–`ASSERTS` read over exact ProjectDefinition semantics, ProjectSource basis, validation, ChangeSets, and Approvals. | Add other profile renderers, general working candidates, defer/reopen and material-basis commands, preflight, dependency grouping, multi-member presentation, per-member recovery, and permitted batch apply. Retain existing ChangeSet authority. | Wave 4 |
| `UX-REQ-013` | **Partial, advanced after baseline.** `petra.project-relationship-view@1.0.0` and its authorized reader now return one bounded current scientific `ASSERTS` provenance path with ProjectDefinition terminology, exact PostgreSQL records and graph checkpoint, omissions, source destinations, and a textual peer. The frozen Graph consumes it without fixture fallback. | Add general task and endpoint selection, other registered relationship types, working and historical membership, retained-position reconstruction, comparison, expansion and continuation cursors, and temporal paths. Preserve renderer-neutral semantics and never infer authority from layout. | Wave 3 |
| `UX-REQ-014` | **Partial, advanced after baseline.** `petra.project-work-view@1.0.0` now composes bounded Project Work collection and exact detail reads from current WorkUnit and worker-manifest authority under repeatable-read isolation. It provides exact identities, lifecycle and attention, pagination/filtering, dependencies, inputs, declared limits, measured-use coverage, output reporting, semantic Work destination, and policy assessments. The frozen Work routes also compose exact inquiry anchors and many-to-many Work links from the inquiry sidecar without synthetic stages, recommendations, usable outputs, or commands. | Add registered definition-resolved stage plans, durable input requests, profile-neutral Review linkage, Project-level output registration/validation/destination, actor-authorized retry and supported resume, richer recovery, visual filters, and the remaining validation gates. Same-snapshot inquiry composition inside the Work contract remains optional future hardening; do not infer authority or inquiry resolution from operational success. | Wave 2 read and inquiry-linkage integration passed; orchestration remains |
| `UX-REQ-015` | **Partial.** Explicit cancellation is authorized and durable; immutable Work inputs prevent silent rebinding. | Add typed steering, task-priority, and execution-plan transition commands with declared cutover, reuse/revalidation, shared-consumer analysis, and receipts. Do not imply generic pause/resume or cancel shared Work automatically. | Wave 3 |
| `UX-REQ-016` | **Partial, advanced after baseline.** `petra.project-inquiry-role@1.0.0`, `petra.project-inquiry-link@1.0.0`, `petra.project-inquiry-view@1.0.0`, V023, and the authority/read repositories map the scientific definition's registered Research-question Objective kind to the product inquiry role without a universal Inquiry identity. Immutable exact links and bounded collection/detail reads support zero/many/shared Work, exact Work filtering, retained framing, dependencies, and GroundedResponse addressing results while leaving authored Objective status independent from Work completion. Authenticated routes and the frozen Work composition are live. | Add other ProjectDefinition-valid record/linked-set adapters, authoritative understanding and stronger basis/finding adapters, broader cross-surface composition, evidence-backed recommendations, and governed semantic commands. | Wave 2 authority/read/Work integration passed; broader semantics remain |
| `UX-REQ-017` | **Partial.** CompositionRequest/Plan, DraftArtifact/Span, ProvenanceMap, CitationBundle, assessments, renders, and persistence provide an exact scientific composition aggregate. | Add ProjectDefinition-resolved document collection/context reads, recognizable purpose, current and historical revision positions, ancestry, Work/inquiry links, findings, capabilities, and safe destinations. | Wave 5 |
| `UX-REQ-018` | **Partial.** DraftRevisionEngine creates exact non-empty span replacements and additive support assessments. | Add a durable working-document boundary for blank, structural, and successive authoring; exact save acknowledgments; late suggestion/check reconciliation; and working-to-registered promotion. External filesystem editing remains excluded. | Wave 5 |
| `UX-REQ-019` | **Partial.** Deterministic rendering, Artifact publication, warnings, and support assessments preserve exact generated scientific outputs. | Add exact working-copy capture, scoped findings/coverage, status-bearing representation, ExportManifest and delivery receipts, partial-format recovery, and destination eligibility. Export does not promote or certify content. | Wave 5 |
| `UX-REQ-020` | **Partial, advanced after baseline.** `petra.project-effective-controls-view@1.0.0` composes exact Project privacy and enabled namespaces with the current ProjectDefinition and authority position under repeatable-read isolation. V026 adds immutable Project-command grants, retained revocations, exact Actor/Project/command/validity enforcement, and live effective/expired/revoked capability values. The single-user server resolver binds a configured canonical human Actor to exactly one eligible Project-command grant without accepting request-carried identity; ProjectSource lifecycle and replacement routes now exercise that boundary end to end. Routing, budget, and ReviewPolicy remain explicitly unsupported. The authenticated client verifies the Project and definition snapshot before presentation, and paired project-authored definitions prove Project-specific control resolution. | Extend the same resolved-principal discipline only to typed public commands as they become ready; add other owning policy and capability-scope records only where required, inheritance/pause/conflict states, active-Work impact, History destinations, and a registry mapping each genuinely editable value to its typed operation. Never add a universal `SetProjectSetting`; personal preferences remain local. | Wave 1 read, command-grant authority, principal resolution, and multiple public command uses passed; transitions in Wave 3 |
| `UX-REQ-021` | **Partial.** Scientific synthesist output, GroundedResponse, Felicity records, command receipts, and AG-UI delivery preserve important communication boundaries. | Add a ProjectDefinition-resolved CommunicationPlan with statement-level origin, force, basis, limitation, action/event links, terminology versions, and a validation/repair receipt. It is not mutation authority. | Wave 4 |
| `UX-REQ-022` | **Missing composite contract.** AG-UI can carry non-authoritative client state; graph and ContextPacket foundations exist separately. | Add a bounded PresentationContext record linking exact semantic result, visible scene, complete accessible peer, optional permitted capture, model input, and validated explanation. Pixels and layout never establish domain meaning. | Wave 6 |
| `UX-REQ-023` | **Partial foundations only.** Commands, events, ChangeSets, Work, interaction replay, projection checkpoints, artifacts, composition, and M1.9 recovery each record their own outcomes. | Add a read-only RecoveryAssessment that reconciles owning records into effect, preservation, member outcomes, eligible registered actions, and exact return. It cannot execute a generic recovery command or become another event ledger. | Wave 6 |

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
traversal, bounded direct event/command dependency impact, and nine exact
semantic-target dependency adapters through ProjectSource lifecycle,
dependency, retained replacement, receipt, and effective-head authority, plus
three exact operational adapters for Work, output, and interaction delivery,
have passed. Bounded retained-event filters, complete
Project/snapshot/limit/query binding in signed cursors, same-snapshot Actor and
target option facets, and stable non-disclosing continuation-failure subcodes
have also passed. The exact read-only ChangeSet
recovery assessment now distinguishes eligible-for-preview, precisely blocked,
and already-compensated authority while retaining the established immutable
reversal path and current grant checks. A five-minute, revision- and
authority-bound compensation preview now derives the exact retraction and
governed three-command sequence from an eligible assessment without creating or
executing anything. Confirmed command-plan composition now reconstructs the
compact preview reference against current authority and derives the exact
ChangeSet, Approval, and per-grant causal envelopes without persistence. The
separate execution boundary now treats the echoed plan as untrusted, revalidates
an initial attempt against current preview authority, and executes only its
exact three envelopes through independent idempotent command transactions. It
derives completion or a successful retained prefix from immutable executions
and events and reports retained failure, unretained attempt failure, and retry
posture without adding an execution ledger. The 1.4 operational-destination,
retained 1.2 filter-option, stable continuation-failure, and episode 1.1
authority freeze-conformance mappings have passed. Episode 1.2 now adds the
renderer-neutral historical History destination using only that exact retained
authority, and its freeze-conformance mapping has passed. The first
`SuggestedActionView` now derives an exact read-only existing-result inspection
action with server-owned readiness from retained ProjectDefinition, Objective,
inquiry-link, GroundedResponse, snapshot, and any declared producing-Work
authority. It
starts no Work and creates no action ledger. Frozen action-region mapping is
the next safe paired increment; exact Work-starting invocation follows that
mapping. Generic undo and multi-step compensation remain later work.

Exit gate: one exact action can start bounded Work, preserve interruption state,
return a result, and expose its history and eligible recovery without client-side
authority calculations.

### Wave 4 — working candidates, Review, Brief, and communication

Implement generic working-candidate records and projection, durable ReviewSession
composition, ProjectBriefView, and the first CommunicationPlan/validation
receipt. This establishes `UX-REQ-011`, `UX-REQ-012`, `UX-REQ-002`, and
`UX-REQ-021` in that dependency order.

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
authority. The semantic-target adapter registry is now live over exact
change-control, Review, grounded-response, composition, ProjectSource
lifecycle/dependency, retained replacement/receipt, and current effective-head
bindings. The 1.3 impact view now separately follows exact record inputs into
current WorkUnit heads, immutable output manifests, and retained interaction
delivery receipts while preserving Project scope and every intermediate
authority reference. Design commits through `5c629ea` map the fixed operational
destinations, retained 1.2 filter options, stable continuation failures, and
episode 1.1 retained-definition authority into the frozen History regions.
Version 1.4 adds renderer-neutral destination states: exact current Work may
name the ProjectDefinition-authorized Work detail, while output and replay
remain unavailable and replay cannot become a ProjectThread binding. The
backend also provides retained History filtering with the complete
normalized query bound into a signed Project/snapshot cursor. Version 1.2 now
adds bounded Actor and target option facets to that same snapshot-bound
response. Counts replace only the same dimension, Actor names retain their
immutable record authority, and targets remain exact identities because no
revision-neutral title authority is registered. The retained-continuation
failure contract distinguishes invalid cursor, complete binding mismatch, and
unavailable snapshot without exposing the cursor or internal diagnostic.
Episode 1.2 now uses the exact immutable ProjectDefinition effective before the
selected event to return the registered History destination or an explicit
unavailable state. The route authority stays bound to the selected event and
names no URL, component, CSS, or browser route. The design track should map that
fixed destination union into the existing selected-event detail. One
exact applied or reverted ChangeSet can now be assessed against its retained
ChangeSet and Approval, current evidence heads, causal-impact summaries, and current
server-resolved grants without creating compensation. The design track should
map that fixed read-only assessment into the existing History detail regions.
The backend now also derives a five-minute, revision- and authority-bound
compensation preview only from a currently eligible assessment. It shows the
exact Claim–Assertion retraction, resulting revisions, preservation boundary,
required input, and governed command sequence while creating and executing
nothing. The design track should map that fixed read-only preview into the
existing History detail regions. Confirmed plan composition now accepts only
the compact preview reference, exact reason, Approval rationale, and explicit
confirmation; it reconstructs every binding from current authority and returns
deterministic command envelopes without submitting them. The design track
should map its confirmation, revalidation, non-persistence, and non-execution
states into the frozen History detail regions. The backend now executes one
exact still-current plan through the existing idempotent command authority and
reports each retained command outcome and precise recovery/retry posture rather
than implying atomic success after a partial submission. The full echoed plan
cannot confer authority, initial execution revalidates its current preview,
every command rechecks its grant in its own transaction, and retries validate
immutable completion or the exact retained successful prefix before continuing.
The design track should map those atomicity, retained/unretained outcome, retry,
and exact completed-effect states into the frozen History detail regions. The
next backend History increment should wait for the episode 1.2
freeze-conformance mapping. Physical deletion remains excluded. Do not infer
external filesystem edits or turn either conformance example into a mandatory
template.

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
25 Python tests, and seven expected service-dependent skips; the real
PostgreSQL suite passes 110 cases after a clean V001-through-V031 migration.
The History impact 1.1 proof additionally validates exact semantic target and
dependent record hashes, ChangeSet authority versions 1.0/1.1, independently
bounded adapter counts and coverage, current versus historical dependent
posture, explicit unavailable/unregistered states, and Project-scoped exclusion
of a second Project's ReviewSession even when it binds the same retained
scientific record.
The History impact 1.3 proof additionally resolves the selected event's exact
immutable target record, follows its WorkerInputManifest binding into the
selected Project's current WorkUnit head, and validates every Work, input,
output, InteractionRun, and replay content or record hash. It returns immutable
WorkerOutputManifest and InteractionReplayRecord dependents while excluding a
second Project's Work over the same target. It does not infer either dependent's
effect, treat replay as output or a ProjectThread binding, compose transitive
closure, or claim a cross-family order.
The History impact 1.4 proof additionally validates the current
ProjectDefinition record before returning a renderer-neutral Work destination
bound to the exact current WorkUnit revision and record hash and the existing
Project Work detail contract. Advancing the definition to remove the Work place
changes that destination to an explicit unavailable result. Exact output and
replay records remain non-navigable with distinct reasons, and the contract,
typed client, and PostgreSQL proof reject a fabricated replay-to-ProjectThread
destination.
The retained History 1.2 proof additionally validates bounded Actor and target
catalogues against the exact Project, retained snapshot, and complete normalized
query. It proves replace-only-the-same-dimension counts, active-first stable
ordering, continuation stability after an append, unrelated-Actor exclusion,
selected-option count equivalence, exact immutable Actor descriptors, and
explicit revision-neutral target-title unavailability. Contract fixtures,
strict Python parity, and the typed client reject a fabricated target title.
The retained-continuation failure proof classifies malformed or tampered cursor
state, Project/query/limit binding mismatches, and unavailable retained
snapshots at their exact server-side failure points. The API emits one fixed
non-disclosing message and restart instruction, excludes internal diagnostics
and cursor bytes, and keeps ordinary query validation outside the subcode
contract. The strict client preserves only a fully validated failure envelope.
The History recovery proof additionally validates exact promotion, Approval,
current Claim–Assertion, active-grant, causal-impact, and retained compensation
bindings under repeatable-read isolation. It exercises eligible, explicitly
blocked, and already-compensated states across both application and reversal
events without executing another command. The compensation-preview proof adds
the exact operation/result order, five-minute freshness binding,
missing/ambiguous/already-compensated rejection, and unchanged ChangeSet,
Approval, command, event, and evidence-revision counts.
The compensation-plan proof reconstructs the compact preview reference from
current authority, preserves distinct command grants, rejects tampering,
cross-Project reuse, unconfirmed input, and grant changes, and proves that plan
composition leaves the same authority-table counts unchanged.
The compensation-execution proof separately validates explicit confirmation and
per-command atomicity acknowledgment, current-plan revalidation, exact
idempotent completion replay, tamper and cross-Project rejection, zero duplicate
writes, an unretained interrupted Approval attempt, and resumption from the
retained Submit prefix to the exact reversal event and resulting evidence
revisions.
The History episode 1.2 proof additionally binds an available destination to the
exact retained ProjectDefinition and selected event, returns no destination
when retained authority is unavailable, and reports retained History-place
omission separately. A later definition without History does not alter an
earlier event's destination. Contract, Python, client, and PostgreSQL checks
reject authority, definition, event, and route substitution.
