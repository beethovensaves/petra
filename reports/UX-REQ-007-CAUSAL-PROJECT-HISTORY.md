# UX-REQ-007 causal Project History

Status: bounded Recent changes, exact event-selected causal episodes, and
snapshot-stable retained Project-event traversal passed; dependency impact,
filters, and broader recovery planning remain open
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `29f26f9`

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
event traversal, and exact episode detail before a reader is called. The Recent
route accepts no query parameters; the retained route accepts only one bounded
limit and one opaque cursor; the episode route accepts only one canonical event
identity. Each returns no substitute Project and validates its composed
contract before responding. Typed workbench clients verify the contract family,
query and Project identity while treating the cursor as opaque. No component,
CSS, browser route, or frozen surface changed.

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
  or been replaced.

## Verification

Contract fixtures include accepted exact Recent changes, causal-episode, and
retained traversal responses. Rejected fixtures cover an altered quick limit,
false global episode order, and the unsafe reuse of an offset cursor. TypeScript
generation, AJV conformance, strict Pydantic round-trip parity, server route
tests, typed-client tests, and the real PostgreSQL integration suite pass. The
database proof starts from an empty PostgreSQL 18.6 instance, migrates V001
through V030, exercises all three reads over domain-event versions 1.0, 1.1,
1.2, and 1.3, and proves cursor integrity, cross-Project rejection, stable
membership after a concurrent append, keyset continuation without duplication,
causal parent/following-command links, Project-stream adjacency, and exact
lifecycle/replacement receipt references.

## Next safe slice

The next safe History boundary is a read-only dependency-impact assessment for
one exact selected event. It should enumerate only registered, authorized,
bounded dependent records with their precise authority source and omissions,
without yet deciding ChangeSet reversibility or composing a compensation plan.
Filters can follow once their exact query identity is bound into cursor
snapshots. Universal undo, multi-step compensation, and event rewriting remain
excluded.
