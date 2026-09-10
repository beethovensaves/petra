# UX-REQ-007 causal Project History

Status: bounded Recent changes, exact event-selected causal episodes,
snapshot-stable retained Project-event traversal, and bounded direct dependency
impact plus registered exact semantic-target adapters passed; frozen History
conformance mapping recorded; frontend binding remains open and source-lifecycle
semantic-target adapters are the next safe boundary
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `c5da977`
Integration handoff:
[UX-to-implementation requirements handoff](UX-BACKEND-HANDOFF.md)

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
claim that Petra has found every semantic consequence. Version 1.0 explicitly
reports that profile-specific, transitive, and external-system dependencies may
remain unknown and omits semantic-target dependencies and transitive closure.
Historical ProjectDefinition interpretation and a cross-family total order are
not asserted. A reference proves the relationship only: Petra neither infers
the dependent's effect nor assesses reversibility or composes compensation in
this view.

## Registered exact semantic-target impact

Backend commit `c5da977` advances the same route to
`petra.project-history-impact-view@1.1.0`. Version 1.1 preserves the 1.0 direct
groups and adds a separate bounded assessment for each exact target carried by
the selected event. It inspects at most ten targets and returns at most
twenty-five references from each adapter. The assessment never substitutes
identity-only similarity for an exact target revision and verified authority
record.

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

Every group names its owning authority, `exact_target_revision` relation scope,
total, returned count, coverage, relation kind, stable relation identity, owning
record identity/hash, and `current`, `historical`, or `immutable_revision`
posture. Target authority is re-resolved and hash-validated in the same
repeatable-read Project transaction. ChangeSet target and dependent records
support contract versions 1.0 and 1.1; the selected event remains supported
through domain-event 1.3.

The assessment distinguishes three target-local non-results: no adapter is
registered for the semantic key, a registered key lacks an immutable revision,
or the named target authority is unavailable in the Project snapshot. Each has
an exact reason and an empty `groups` array. ProjectSource and ProjectSource-
replacement targets remain explicitly unregistered in this slice even though
their dedicated lifecycle authorities already exist. Identity-only semantic
relations, transitive closure, and external-system dependents remain explicit
unknowns. References do not imply a dependent effect. Reversibility remains
`not_assessed`; compensation remains `not_composed`.

## Frozen History conformance

The closed `UX-DESIGN-FREEZE-01` History detail already has every placement this
contract needs. The impact view does not add a component, panel, dialog, CSS
rule, or browser route:

- its `selected_event` validates and preserves the exact event already open in
  the existing detail header and Actor/time/action facts;
- its direct and semantic summaries may follow the observed event in
  **Authority effect**, separately labelled as registered reference counts
  rather than all impact;
- causal commands, event outbox records, GroundedResponse invalidations, the
  four per-target semantic adapter groups, and any target-local non-result
  reason remain separately labelled in **Episode members**;
- exact graph-projection attempts occupy **Projection effect**, while their
  applied/failed records remain distinct from current Graph freshness; and
- aggregate target/group coverage, both `unknowns` arrays,
  `decision_boundary`, and `omissions` appear with **Recovery relationship**,
  where they explicitly prevent references from being read as effects,
  reversibility, or compensation.

Every group retains its immutable `authority_source`, relation, returned count,
total count, complete/truncated coverage, and exact references. The client keeps
server order inside a group and never sorts relation families into a common
timeline. The semantic portion also retains exact target order, target and
per-adapter bounds, resolved authority identity, relation identity, and posture.
Complete zero direct groups and complete zero semantic groups receive separate
bounded wording followed immediately by applicable unregistered-key,
identity-only, transitive, profile-specific, and external limitations. They
cannot be summarized as no impact.

Impact loads independently for the selected event and never replaces episode
facts or recovery eligibility. Its Project, event, and complete overlapping
event anchor must match the accepted episode. Pending impact marks only the
existing detail regions busy and does not move focus. Unavailable,
unauthorized, malformed, missing, integrity-failed, mismatched, or out-of-order
impact exposes no dependent identities or counts, uses no fixture fallback, and
leaves an independently verified episode selected. A target-local unregistered,
incomplete, or unavailable result preserves other verified target assessments
and displays its exact reason rather than becoming a zero group. Programmatic
target and group labels, authority sources, postures, counts, coverage,
relations, and limitations stay in the existing detail reading order;
truncated target or group coverage is stated in text and does not create a
continuation control.

The frozen route remains fixture-backed and has no loaders or adapters for the
implemented Recent, episode, retained, or 1.1 impact clients. This is an
integration gap rather than a design gap. Retained cursor traversal is now
implemented; the impact conformance review does not design its collection
controls. Graph Back/Forward/Reset remains client-local presentation history
and does not call, populate, order, or alter any Project History read.

## Recovery semantics

This slice does not invent generic undo or multi-step compensation. ChangeSet
facts are readable but report command-granular recovery as ineligible until a
separate causal assessment can prove the existing explicit reversal path is
safe for that exact current authority.

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
event traversal, exact episode detail, and exact dependency impact before a
reader is called. The Recent route accepts no query parameters; the retained
route accepts only one bounded limit and one opaque cursor; the episode and
impact routes accept only one canonical event identity. Each returns no
substitute Project and validates its composed contract before responding. Typed
workbench clients verify the contract family, query, Project, and event identity
while treating the cursor as opaque. No component, CSS, browser route, or frozen
surface changed.

The 1.1 typed client also binds `target_total_count` to the selected event's
target count, `target_returned_count` to the assessment count, every
`target_index` and `target_ref` to the same ordered event target, every
registered resolution to the exact target revision and supplied hashes, and
every non-result state to an empty group array and its fixed reason.

The PostgreSQL reader fails closed when it cannot reproduce:

- an event record hash from its canonical payload;
- the version-appropriate command fingerprint;
- a lifecycle or replacement receipt's content and record hashes;
- the receipt-to-command and receipt-to-event references;
- a lifecycle event's exact prior and resulting source transition;
- a replacement event's exact relationship or retraction record; or
- the current exact source/replacement head used for recovery eligibility;
- a cursor signature, Project binding, canonical payload, retained authority
  bounds, or exact head-event identity/hash; or
- the original cursor snapshot after the authority store has moved backwards
  or been replaced;
- an outbox record's exact embedded event payload and record hash;
- a graph-projection attempt's event, outbox, sequence, content, and record
  hashes; or
- a GroundedResponse invalidation's selected event/change-set binding and exact
  retained response revision;
- a registered semantic target's exact immutable authority payload, revision,
  content hash where applicable, and record hash; or
- a semantic dependent's exact owning record, version, revision, content hash
  where applicable, record hash, Project scope, and registered relation
  identity.

## Verification

Contract fixtures include accepted exact Recent changes, causal-episode,
retained traversal, and dependency-impact 1.0/1.1 responses. Rejected fixtures
cover an altered quick limit, false global episode order, unsafe offset-cursor
reuse, a dependency read that claims a reversibility decision, and an
unregistered semantic target that fabricates a registered adapter group.
TypeScript generation, AJV conformance, strict Pydantic round-trip parity,
server route tests, typed-client tests, and the real PostgreSQL integration
suite pass. The database proof starts from an empty PostgreSQL 18.6 instance,
migrates V001 through V030, exercises all four reads over domain-event versions
1.0, 1.1, 1.2, and 1.3, and proves cursor integrity, cross-Project rejection,
stable membership after a concurrent append, keyset continuation without
duplication, causal parent/following-command links, Project-stream adjacency,
exact lifecycle or replacement receipt references, and exact command, outbox,
graph-projection, GroundedResponse-invalidation, ChangeSet/Approval,
ReviewSession-membership, GroundedResponse-dependency, and composition-lineage
bindings. Historical and current dependent revisions are distinguished without
rewriting either.

## Next safe slice

The next safe History boundary is to register exact ProjectSource and
ProjectSource-replacement semantic-target adapters by reusing their existing
immutable lifecycle, replacement, receipt, and dependency authorities. The
adapters must preserve the same per-target and per-adapter bounds and explicitly
separate retained lineage from the effective replacement head. They must not
reinterpret historical ProjectDefinitions, turn identity-only relations into
dependency truth, or claim transitive closure. Filters, undo, reversibility
assessment, and compensation remain unstarted and outside this boundary;
universal undo, multi-step compensation, and event rewriting remain excluded.
