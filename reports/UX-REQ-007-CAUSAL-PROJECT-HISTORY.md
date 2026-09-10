# UX-REQ-007 causal Project History

Status: first bounded Recent changes read slice passed; full causal episodes,
dependency impact, filters, and broader recovery planning remain open
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

The server route is
`GET /api/queries/projects/:projectId/history/recent`. Existing `/api/*` bearer
authentication applies before the reader is called. The route accepts no query
parameters, returns no substitute Project, and validates the composed contract
before responding. The typed workbench client verifies the contract family,
fixed ten-item boundary, separation from graph history, and exact Project
identity. No component, CSS, browser route, or frozen surface changed.

The PostgreSQL reader fails closed when it cannot reproduce:

- an event record hash from its canonical payload;
- the version-appropriate command fingerprint;
- a lifecycle or replacement receipt's content and record hashes;
- the receipt-to-command and receipt-to-event references;
- a lifecycle event's exact prior and resulting source transition;
- a replacement event's exact relationship or retraction record; or
- the current exact source/replacement head used for recovery eligibility.

## Verification

Contract fixtures include an accepted exact History response and a rejected
attempt to change the quick limit to twenty. TypeScript generation, AJV
conformance, strict Pydantic round-trip parity, server route tests, typed-client
tests, and the real PostgreSQL integration suite pass. The database proof starts
from an empty PostgreSQL 18.6 instance, migrates V001 through V030, and exercises
History composition over domain-event versions 1.0, 1.1, 1.2, and 1.3.

## Next safe slice

The next additive read can expose one exact causal episode selected by event
identity. It should reuse the same composition and authorization boundary,
include the complete linked command/event/receipt facts already proven here,
and return explicit omissions for still-unimplemented dependency impact,
cross-family ordering, and generic reversal assessment. It must not turn the
quick window into authoritative retention or introduce a universal undo
command.
