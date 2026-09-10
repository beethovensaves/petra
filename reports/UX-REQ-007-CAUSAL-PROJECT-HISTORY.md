# UX-REQ-007 causal Project History

Status: bounded Recent changes, exact event-selected causal episodes,
snapshot-stable filtered retained Project-event traversal, and bounded direct
dependency impact plus registered exact semantic-target adapters through
ProjectSource and replacement authority plus exact read-only ChangeSet recovery
assessment passed; revision-bound compensation preview remains open
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `7380a0b` plus this slice

## Result

Petra now exposes an authenticated, newest-first Recent changes view containing
at most ten Project commands that produced immutable Project domain events. The
view is composed under one repeatable-read PostgreSQL transaction from the
existing command executions, domain events, lifecycle or replacement receipts,
and current ProjectSource/replacement authority. It persists no History rows and
does not create a second ledger.

`petra.project-history-view@1.0.0` carries, for each change:

- the exact command identity, schema version, registered command name,
  idempotency key, fingerprint, grant, and correlation;
- the exact event identity, schema version through 1.3, event type, global
  position, Project-stream revision, and record hash;
- the Actor plus occurred and recorded times;
- one exact primary target and any affected or related targets;
- the observed completed or conflicted effect;
- current command-granular recovery eligibility or a specific ineligibility
  reason; and
- a renderer-neutral semantic History destination for the primary target.

The response fixes the quick window at ten, reports whether older authority
exists, names its repeatable-read authority boundary, and explicitly declares
graph navigation history `client_local_separate`. Ten is a presentation window,
not a retention limit.

## Supported event families

The reader validates and composes every event currently accepted by Petra:

- domain-event 1.0: ChangeSet submission, Approval recording, application, and
  application conflict;
- domain-event 1.1: the 1.0 family plus applied compensation and compensation
  conflict;
- domain-event 1.2: the earlier family plus ProjectSource exclusion and
  restoration; and
- domain-event 1.3: the earlier family plus replacement creation and
  replacement retraction.

This support uses a History-specific version boundary. Petra's intentionally
narrow older exhaustive command/event unions were not widened.

## Exact causal episode detail

`petra.project-history-episode-view@1.0.0` adds an authenticated detail read at
`GET /api/queries/projects/:projectId/history/events/:eventId`. It selects one
exact retained Project event and reuses the Recent changes composition for its
actor, time, command/event identity, targets, observed effect, current recovery
assessment, and semantic destination.

The episode then adds four bounded relationships without asserting a synthetic
total history order:

- an exact parent command when the selected event records command causation;
- up to one hundred later commands whose envelopes cite the selected event as
  their cause, including whether each command produced a retained event;
- the immediately previous and next event in the same Project event stream,
  kept separate from command causation; and
- the exact lifecycle or replacement receipt associated with the selected
  command and event when that event family produces one.

The response explicitly omits dependency-impact composition, generic reversal
assessment, and any cross-family total-order assertion. It is a read over the
same immutable authority, not a new episode or History ledger.

## Retained Project-event traversal

`petra.project-history-retained-view@1.0.0` adds the authenticated collection
read `GET /api/queries/projects/:projectId/history/events`. It reuses the exact
change composition above and pages every retained Project event in descending
Project-stream revision. The default page contains fifty changes; callers may
request from one through one hundred. The fixed Recent changes window remains
ten.

The collection uses signed, opaque, keyset cursors rather than mutable offsets.
Every continuation is bound to the exact Project, initial global authority
position, initial Project-stream revision, head event identity and record hash,
and the next exclusive stream boundary. A cursor therefore cannot be
reinterpreted for another Project or another retained snapshot. Events appended
after the first page do not shift, duplicate, or enter that traversal.

The response deliberately separates two authority positions:

- `retention_snapshot` fixes event membership and ordering for every page; and
- `current_authority` records the page-read boundary used to recompute recovery
  eligibility.

This distinction keeps traversal stable while ensuring Petra never presents an
old recovery assessment as current. The contract reports the total event count
within the retained snapshot, whether another page exists, and an opaque next
cursor only when required. It exposes no offset, filters, client-carried
snapshot override, or cross-family order.

`petra.project-history-retained-view@1.1.0` adds conservative exact filtering
without changing the Recent changes endpoint or its fixed ten-item window. One
value per dimension may select family, registered command, event type, exact
Actor ID, completed/conflicted outcome, observed authority effect, one exact
target semantic-key/object-ID pair, and inclusive recorded-time bounds. All
selected events remain ordered only by newest-first Project-stream revision;
time filtering does not turn their timestamps into a global order.

The response always echoes a normalized `filters` object. Every `phc2` cursor
cryptographically binds its Project, retained snapshot, exclusive keyset
boundary, page limit, and complete normalized filter identity. A continuation
therefore fails closed if the caller changes a filter, adds or removes one,
changes the limit, crosses Projects, tampers with the cursor, or can no longer
resolve the original snapshot. `snapshot_total_count` is the authorized count
matching those exact filters inside the fixed retained snapshot. A zero-match
result preserves the authorized Project snapshot but exposes neither another
Project nor an unfiltered count. Actor filtering is exact; origin filtering
remains explicitly unavailable because current authority has no trustworthy
origin classification.

## Bounded direct dependency impact

`petra.project-history-impact-view@1.0.0` adds the authenticated exact-event read
`GET /api/queries/projects/:projectId/history/events/:eventId/impact`. Under one
repeatable-read transaction it reuses the selected event's existing History
composition and enumerates four registered kinds of direct dependent records:

- commands whose immutable envelope cites the selected command as its cause;
- outbox records that carry the exact selected event;
- graph-projection attempts bound to that event and its outbox record; and
- GroundedResponse revisions whose invalidation-cause record names the selected
  ChangeSet application or reversal event.

Each group names its exact authority source, returns no more than one hundred
references, reports its complete total, and declares `complete` or `truncated`
coverage. Exact command/event identities, actor and times, targets, observed
effect, and semantic destination remain attached to the selected event. The
response also records the current event position and Project-stream revision
used for the read.

This is an inventory of registered direct event and command dependencies, not a
claim that Petra has found every semantic consequence. It explicitly reports
that profile-specific, transitive, and external-system dependencies may remain
unknown. Semantic-target dependencies and transitive closure are omitted;
historical ProjectDefinition interpretation and a cross-family total order are
not asserted. A reference proves the relationship only: Petra neither infers
the dependent's effect nor assesses reversibility or composes compensation in
this view.

## Registered exact semantic-target impact

`petra.project-history-impact-view@1.1.0` preserves the 1.0 direct groups and
adds a separate bounded assessment for each exact target carried by the
selected event. It inspects at most ten targets and returns at most twenty-five
references from each adapter. The assessment never substitutes identity-only
similarity for an exact target revision/hash binding.

Four adapters are registered against existing immutable authorities:

- `change_control` reads exact ChangeSet, Approval, and evidence-revision
  bindings from ChangeSets, approvals, operations, and promotion
  authorizations;
- `review_membership` reads exact Claim/Assertion membership from retained
  ReviewSession candidate bindings;
- `grounded_response_dependency` reads exact Claim/Assertion dependencies from
  retained GroundedResponse revisions; and
- `composition_lineage` reads exact Claim/Assertion subjects, plan evidence,
  provenance bases, and draft-authority dependencies from retained composition
  records.

Every group names its owning authority, exact-revision relation scope, total,
returned count, coverage, relation kind, stable relation identity, owning record
identity/hash, and current, historical, or immutable-revision posture. Target
authority is re-resolved and hash-validated in the same repeatable-read Project
transaction. ChangeSet target and dependent records support both current
contract versions 1.0 and 1.1; the selected event remains supported through
domain-event 1.3.

The assessment distinguishes three non-results rather than overclaiming
coverage: no adapter is registered for the semantic key, a registered key lacks
an immutable revision, or the named target authority is unavailable in the
Project snapshot. Identity-only semantic relations, transitive closure, and
external-system dependents remain explicit unknowns. References do not imply
the dependent's effect. Reversibility remains `not_assessed`; compensation
remains `not_composed`.

`petra.project-history-impact-view@1.2.0` preserves 1.1 and registers five more
bounded exact adapters for `petra.project-source` and
`petra.project-source-replacement` targets:

- `project_source_lifecycle` returns immutable lifecycle receipts only when
  their exact prior or resulting source revision/hash matches the target;
- `project_source_dependency` composes the exact source revision's immutable
  artifact binding into parsed-document, structure, span, evidence, active
  Work, open Review, and GroundedResponse authorities;
- `project_source_replacement_lineage` returns immutable predecessor/successor
  replacement edges or the immutable retraction of an exact replacement;
- `project_source_replacement_receipt` returns the exact retained command
  receipts for replacement creation or retraction; and
- `project_source_effective_head` separately reads the current derived head and
  states whether the exact replacement is the active or retracted head.

The retained-lineage group always uses immutable-revision posture. The
effective-head group is a separate current-authority group and never turns a
retained replacement record into an assertion that it is active. All five
groups retain the existing ten-target and twenty-five-reference bounds and run
inside the same Project-scoped repeatable-read transaction. Missing exact
source or replacement authority produces the existing explicit unavailable
assessment rather than a substitute identity or a failure-open inference.

## Recovery semantics

`petra.project-history-recovery-assessment-view@1.0.0` adds the authenticated
exact-event read
`GET /api/queries/projects/:projectId/history/events/:eventId/recovery` for
`change_set.applied` and `change_set.reverted` facts. It composes no new ledger
and performs no mutation. Under one Project-scoped repeatable-read transaction,
it binds the selected immutable command/event episode to the promotion
ChangeSet and its retained state, exact applied Approval, current Claim and
Assertion heads, the existing causal-impact summaries, and the server-resolved
single-user command authority required by the established reversal path.

The assessment has three exact outcomes:

- `eligible_for_preview` means the promotion remains applied, its immutable
  operation and impact bindings name exactly the selected Claim–`ASSERTS` pair,
  the current heads still equal the event-produced trusted human-accepted
  revisions, and exactly one active grant currently authorizes each of
  `SubmitChangeSet`, `RecordApproval`, and `ApplyChangeSet`;
- `blocked` names each current operation, revision, authority, relationship,
  impact-set, missing-grant, or ambiguous-grant obstacle without proposing a
  substitute action; and
- `already_compensated` returns the exact retained applied compensation
  ChangeSet and `change_set.reverted` event. Selecting that reversal event
  resolves the same result and never proposes reversing a reversal.

Grant facts are read at the assessment timestamp and every later command must
recheck them. Dependency references provide context only and do not become
effect or safety claims. The contract fixes compensation preview to
`not_composed`, execution to `not_performed`, multi-step compensation to
`not_assessed`, and keeps graph-navigation history client-local. Generic undo,
historical ProjectDefinition interpretation, event rewriting, and compensation
creation remain absent.

ProjectSource recovery continues to be computed rather than copied from an old
receipt:

ProjectSource recovery is computed rather than copied from an old receipt:

- an exclude or restore entry is eligible only while its exact resulting
  ProjectSource revision remains current;
- an excluded predecessor cannot be restored while it has an active
  replacement;
- replacement creation is eligible for
  `RetractProjectSourceReplacement` only while that exact relationship remains
  the active head; and
- replacement retraction may make the exact still-excluded predecessor eligible
  for a separate `RestoreProjectSource` command. Retraction itself never changes
  source status.

The output is only an eligibility read. Existing typed commands remain the sole
mutation boundaries and recheck current authority when invoked.

## Integrity and authorization

Existing `/api/*` bearer authentication applies to Recent changes, retained
event traversal, exact episode detail, exact dependency impact, and recovery
assessment before a reader is called. The Recent route accepts no query
parameters; the retained route accepts one bounded limit, one opaque cursor,
and only the registered single-value exact filters; the episode, impact, and
recovery routes accept only one canonical event identity. Each returns no
substitute Project and validates its composed contract before responding. Typed
workbench clients verify the contract family, normalized query, Project, and
event identity while treating the cursor as opaque. No component, CSS, browser
route, or frozen surface changed.

The PostgreSQL reader fails closed when it cannot reproduce:

- an event record hash from its canonical payload;
- the version-appropriate command fingerprint;
- a lifecycle or replacement receipt's content and record hashes;
- the receipt-to-command and receipt-to-event references;
- a lifecycle event's exact prior and resulting source transition;
- a replacement event's exact relationship or retraction record; or
- the current exact source/replacement head used for recovery eligibility;
- a cursor signature, Project binding, canonical payload, retained authority
  bounds, exact query identity, or exact head-event identity/hash; or
- the original cursor snapshot after the authority store has moved backwards
  or been replaced;
- an outbox record's exact embedded event payload and record hash;
- a graph-projection attempt's event, outbox, sequence, content, and record
  hashes; or
- a GroundedResponse invalidation's selected event/change-set binding and exact
  retained response revision;
- a registered semantic target's exact immutable authority payload, revision,
  content hash where applicable, and record hash; or
- an exact ProjectSource lifecycle receipt, source-bound dependency,
  replacement/retraction/receipt record, or current effective-head relation; or
- a semantic dependent's exact owning record, version, revision, content hash
  where applicable, record hash, Project scope, and registered relation
  identity; or
- a recovery ChangeSet, applied Approval, current evidence head, active grant,
  or retained compensation event's exact Project, revision, content, record,
  and causal binding.

## Verification

Contract fixtures include accepted exact Recent changes, causal-episode,
retained traversal 1.0/1.1, dependency-impact 1.0/1.1/1.2, and ChangeSet
recovery-assessment responses.
Rejected fixtures cover an altered quick limit, false global episode order,
unsafe offset or query-unbound cursor reuse, a dependency read that claims a
reversibility decision, and an unregistered semantic target that fabricates a
registered adapter group, plus an invalid response that collapses retained
replacement lineage and effective head state into one unsupported authority,
or claims that a recovery assessment composed a compensation preview.
TypeScript generation, AJV conformance, strict Pydantic round-trip parity,
server route tests, typed-client tests, and the real PostgreSQL integration
suite pass. The database proof starts from an empty PostgreSQL 18.6 instance,
migrates V001 through V030, exercises all five reads over domain-event versions
1.0, 1.1, 1.2, and 1.3, and proves cursor integrity, cross-Project rejection,
stable membership after a concurrent append, keyset continuation without
duplication, complete query/limit binding, exact filtered counts and zero-match
results, every registered filter dimension, source/replacement/retraction target
matching, causal parent/following-command links, Project-stream adjacency, exact
lifecycle or replacement receipt references, and exact command, outbox,
graph-projection, GroundedResponse-invalidation, ChangeSet/Approval,
ReviewSession-membership, GroundedResponse-dependency, composition-lineage,
ProjectSource lifecycle/dependency, immutable replacement/retraction/receipt,
and current effective-head bindings. The recovery proof additionally exercises
eligible, unavailable-principal blocked, and already-compensated states before
and after one real compensating reversal, exact grant resolution, cross-Project
non-disclosure, and both applied and reverted event selection. Active and
retracted head states are distinguished from retained lineage without rewriting
either.

## Next safe slice

The next safe History boundary is a revision-bound, read-only compensation
preview for an assessment that is still `eligible_for_preview`. It may compose
the exact proposed ChangeSet 1.1 retraction pair and required approval/apply
sequence from the assessed authority while persisting nothing, and must bind
the assessment event, authority position, target revisions/hashes, exact active
grants, causal-impact basis, and a short expiry or equivalent freshness check.
Preview requests must fail closed when any bound authority changes. Execution,
generic undo, reversal of a reversal, multiple compensations, multi-step
planning, historical ProjectDefinition interpretation, and frozen-interface
integration remain later boundaries.
