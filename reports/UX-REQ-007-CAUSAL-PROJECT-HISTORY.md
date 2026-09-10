# UX-REQ-007 causal Project History

Status: bounded Recent changes and exact event-selected causal episode reads
passed; frozen History integration acceptance mapping recorded; frontend binding
remains open and retained cursor traversal is the next backend capability
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `7ae590f`
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

## Frozen History integration disposition

The closed `UX-DESIGN-FREEZE-01` surface already provides the containers needed
for this data: one ordered History list, one route-selected detail article,
Actor/Occurred/Recorded/Action facts, separate effect and recovery sections, one
subordinate action-dialog slot, one return control, and responsive
list-then-detail stacking. No new page, panel, tab, or visual language is needed.

The implementation acceptance mapping is now recorded under `UX-REQ-007` in
`UX-BACKEND-HANDOFF.md`. Its binding rules are:

- the existing list becomes **Recent changes** and renders the backend order and
  fixed limit of at most ten; `has_older` is status text, not pagination;
- each existing row route uses its exact immutable `event_ref.event_id`, and
  every selected or deep-linked event loads the exact episode endpoint rather
  than composing detail from the list member;
- Actor uses an authorized display label only when a trusted read supplies one,
  otherwise exact Actor kind and ID; Occurred and Recorded remain distinct
  localized `<time>` values with their ISO values preserved;
- the observed effect and completed/conflicted outcome occupy the existing
  Authority-effect area; the Projection-effect area states that projection
  effect is unavailable because this contract supplies none;
- command causation, Project-stream adjacency, and applicable receipt references
  remain separately labelled in the existing Episode-members area;
- eligible and ineligible recovery use the backend reason and exact registered
  command name, but eligibility alone cannot enable the frozen generic reversal
  dialog; and
- the existing return control restores a client-held permitted origin resolved
  through `UX-REQ-008`, with the current Project Brief as the direct/deep-link or
  unavailable-origin fallback.

The same mapping defines collection/detail loading independently; distinguishes
empty, unavailable, unauthorized, missing/malformed event, stale recovery,
integrity, and invalid-response states; preserves a selected event across safe
retry; and prohibits fixture fallback. Native list links, `aria-current`,
programmatic status and reasons, exact focus return, `<time>` semantics, forced
color support, and the existing narrow-screen reading order are required.

The current frozen route still uses synthetic `HistoryEpisode` fixtures. It does
not yet call the implemented clients or map event IDs, error states, focus, and
return context. The backend read also has no authorized Actor display descriptor,
profile-resolved target title/origin, projection effect, revision-bound action
preview, or full retained traversal. Those omissions remain explicit instead of
being filled from the graph, current objects, or client prose. Graph navigation
Back/Forward/Reset remains wholly client-local and never enters Project History.

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

The Recent changes server route is
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

Contract fixtures include accepted exact Recent changes and causal-episode
responses, a rejected attempt to change the quick limit to twenty, and a
rejected episode that asserts a false global order. TypeScript generation, AJV
conformance, strict Pydantic round-trip parity, server route tests, typed-client
tests, and the real PostgreSQL integration suite pass. The database proof starts
from an empty PostgreSQL 18.6 instance, migrates V001 through V030, exercises
Recent changes composition over domain-event versions 1.0, 1.1, 1.2, and 1.3,
and proves causal parent/following-command links, Project-stream adjacency, and
exact lifecycle/replacement receipt references.

## Next backend capability

The next additive backend capability is complete authorized retained
Project-event traversal with a stable cursor. It should reuse the same
composition and authorization boundary, preserve exact Project-stream order,
and prevent cross-Project leakage or false global ordering across command,
event, receipt, Work, and projection families. `has_older` is not a cursor, and
the current API provides no retained traversal. The addition must leave the
ten-item quick window unchanged and must not introduce generic undo, generic
Revert, or multi-step compensation.
