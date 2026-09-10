# UX-REQ-007 causal Project History

Status: bounded Recent changes, exact event-selected causal episodes,
snapshot-stable filtered retained Project-event traversal, and bounded direct
dependency impact plus registered exact semantic-target adapters through
ProjectSource and replacement authority plus exact read-only ChangeSet recovery
assessment, revision-bound compensation preview, and confirmed non-persisted
command-plan composition passed; frozen History conformance mapping recorded;
frontend binding remains open and separately authorized single-plan execution
is the next backend boundary
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `718f641`
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
old recovery assessment as current. Version 1.0 reports the total event count
within the retained snapshot, whether another page exists, and an opaque next
cursor only when required. It exposes no offset, filters, client-carried
snapshot override, or cross-family order.

Backend commit `7380a0b` advances the same endpoint to
`petra.project-history-retained-view@1.1.0`. One exact value may be supplied for
each of eight conjunctive dimensions: family, registered command, event type,
Actor ID, completed/conflicted outcome, observed authority effect, one target
semantic-key/object-ID pair, and inclusive recorded-time bounds. The target
filter is exact at object identity and carries no revision. Time bounds apply to
`recorded_at`; matching rows remain in descending Project-stream revision rather
than timestamp or cross-family order.

Every response echoes the normalized `filters` object and one-through-one-
hundred `limit`; the default limit remains fifty. `snapshot_total_count` is the
authorized number of matching events inside the fixed retained snapshot. An
authorized zero-match page returns no rows, zero count, `has_more: false`, and
no unfiltered count or substitute event. The fixed Recent changes endpoint and
ten-item window are unchanged and accept none of these collection parameters.

The signed opaque cursor advances from `phc1` to `phc2`. It binds the exact
Project, snapshot event and stream positions, head event and record hash,
exclusive stream boundary, page limit, and complete normalized filter identity.
The client resends the unchanged limit and filters with a continuation and does
not decode, display, synthesize, edit, or treat the cursor as authority. A
tampered cursor or changed Project, limit, filters, or snapshot fails closed.

Version 1.1 has no authoritative origin filter and requires
`origin_filter_not_supported`. Actor identity, correlation, semantic target,
return context, and current object state cannot substitute for origin. The
backend supplies neither an authorized Actor option catalogue/display label nor
target option catalogue/title; any display resolution must come from a separate
authorized Project read and preserve the exact ID fallback.

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
an exact reason and an empty `groups` array. Identity-only semantic relations,
transitive closure, and external-system dependents remain explicit unknowns.
References do not imply a dependent effect. Reversibility remains
`not_assessed`; compensation remains `not_composed`.

Backend commit `c198af6` advances the same route to
`petra.project-history-impact-view@1.2.0`. Version 1.2 preserves 1.1 and
registers five more bounded exact adapters for `petra.project-source` and
`petra.project-source-replacement` targets:

- `project_source_lifecycle` returns immutable lifecycle receipts only when
  their exact prior or resulting source revision and hashes match the target;
- `project_source_dependency` composes the exact source revision's immutable
  artifact binding into parsed-document, structure, span, evidence, active
  Work, open Review, and GroundedResponse authorities;
- `project_source_replacement_lineage` returns immutable predecessor/successor
  replacement edges or the immutable retraction of an exact replacement;
- `project_source_replacement_receipt` returns the exact retained command
  receipts for replacement creation or retraction; and
- `project_source_effective_head` separately reads the current derived head and
  states whether the exact replacement is the active or retracted head.

The retained-lineage and replacement-receipt groups always use
`immutable_revision` posture. The effective-head group uses a distinct current
authority and `current` posture; its relation, rather than its posture, states
active or retracted. The interface cannot infer current replacement state from
the newest retained lineage or receipt. All five groups retain the ten-target
and twenty-five-reference bounds and run inside the same Project-scoped
repeatable-read transaction. Missing exact source or replacement authority
produces the existing target-local unavailable assessment rather than a
substitute identity or failure-open inference.

## Frozen full-History conformance

The closed design already assigns **Scope/filter** as the first ordered region
of `DB18-SP10` History and includes long filtered History in its state coverage.
Version 1.1 fills that semantic position on the existing History route; it does
not create a new surface, component family, visual language, CSS rule, or
browser route. The same `history-episodes` ordered-list region presents either
the unchanged Recent changes read or one Full History traversal, while the
selected-event detail remains the same exact detail region.

Recent changes always calls its dedicated endpoint without a filter, limit, or
cursor and remains capped at ten. Full History alone calls the retained 1.1
endpoint. Its frozen Scope/filter position exposes one value per family,
command, event, Actor, outcome, authority-effect, and exact-target dimension,
plus either or both inclusive recorded-time bounds. Applying, clearing, or
changing a filter or page limit starts a cursorless traversal. All supplied
filters are conjunctive. The client does not infer compatible combinations;
valid combinations with no match remain authorized empty results.

The Full History collection preserves backend order and reports the authorized
`snapshot_total_count` next to its heading. Continuation appends only a response
whose exact Project, normalized filters, limit, retained snapshot head, and
exclusive Project-stream boundary still match the active traversal. `phc2`
remains opaque and absent from visible and assistive output. Newer events do not
enter the fixed traversal; current recovery facts are recomputed at each page
read and remain backend facts rather than client decisions.

The exact selected event and verified detail survive filter changes until the
author selects another matching row. If it is outside the current result page,
the detail says so without marking another row selected. A zero-match response
says **No permitted History events match these filters**, preserves the filter
values, and exposes no unfiltered count. A continuation that is invalid,
query-mismatched, or no longer resolvable keeps the last verified rows and
offers a cursorless restart with the same filters; it never appends an unverified
page or silently widens the query.

The Scope/filter group, every field, composite target pair, inclusive time
meaning, validation error, active value, and matching count have programmatic
labels. Filter submission is keyboard operable and returns focus to the invoked
control with one result announcement. A user-invoked continuation places focus
at the first newly appended event; row selection follows the existing detail-
heading focus rule. At narrow widths the Scope/filter region, collection, and
detail retain that linear order; controls and exact identities reflow without
horizontal scrolling. Empty, unavailable, unauthorized, query-invalid,
continuation-invalid, loading, and integrity-failure states stay in the affected
existing region, preserve exact return, and reveal no unverified identities or
counts.

The backend omission `origin_filter_not_supported` appears as a limitation in
the existing Scope/filter position: **Origin filtering is unavailable because
Project History has no authoritative origin classification.** No origin control
is enabled or implemented from client state.

The frozen design contract contains the required Scope/filter position, but the
checked-in fixture-backed `HistorySurface` does not instantiate it, Full History
collection state, retained continuation, or any History loader. That is the
precise frontend integration gap. This freeze-conformance report does not fill
it by editing a component, stylesheet, or route.

## Frozen History detail conformance

The closed `UX-DESIGN-FREEZE-01` History detail already has every placement this
contract needs. The impact view does not add a component, panel, dialog, CSS
rule, or browser route:

- its `selected_event` validates and preserves the exact event already open in
  the existing detail header and Actor/time/action facts;
- its direct and semantic summaries may follow the observed event in
  **Authority effect**, separately labelled as registered reference counts
  rather than all impact;
- causal commands, event outbox records, GroundedResponse invalidations, the
  applicable per-target semantic adapter groups, and any target-local non-result
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
Replacement lineage and command receipts stay under separately labelled
retained groups; only the separately labelled effective-head group presents the
current active or retracted relationship. Each keeps independent counts,
coverage, and empty wording.
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
implemented Recent, episode, retained, 1.2 impact, or recovery-assessment
clients. This is an integration gap rather than a design gap. The retained
filter mapping, impact detail mapping, and recovery assessment use separate
frozen regions and do not change each other's authority. Graph
Back/Forward/Reset remains client-local presentation history and does not call,
populate, order, or alter any Project History read.

## Recovery semantics

`petra.project-history-recovery-assessment-view@1.0.0` adds the authenticated
exact-event read
`GET /api/queries/projects/:projectId/history/events/:eventId/recovery` for
`change_set.applied` and `change_set.reverted`. It binds the selected immutable
episode to the original promotion ChangeSet and its exact applied Approval,
exactly one current Claim and one current Assertion, the three current command-
grant checks, and direct/semantic impact summaries under one Project-scoped
repeatable-read transaction. It persists no record and performs no mutation.

The assessment returns one of three outcomes:

- `eligible_for_preview` means the original promotion remains applied, its two
  operations and impact target set bind the exact current trusted,
  human-accepted Claim–`ASSERTS` pair produced by the selected event, and
  exactly one active grant authorizes each of `SubmitChangeSet`,
  `RecordApproval`, and `ApplyChangeSet`;
- `blocked` preserves the supplied reason and ordered exact blockers for a
  compensation ChangeSet, unapplied state, invalid operation set, changed target
  revision or authority, changed Claim–Assertion pair, mismatched impact target
  set, or missing/ambiguous command authority; or
- `already_compensated` retains the exact applied compensation ChangeSet,
  Approval, and `change_set.reverted` event. Selecting either the promotion or
  that reversal resolves the same retained compensation and never proposes a
  reversal of a reversal.

The frozen detail places the promotion ChangeSet, applied Approval, and current
Claim/Assertion under separately named **Episode members** groups. It places
the four-group direct and nine-adapter semantic counts/coverage with their three
unknowns and `dependent_effect: not_inferred_from_reference` in **Authority
effect**. It places the configured/unavailable principal, three fixed-order
grant checks, assessment state/reason/blockers, and decision boundary in
**Recovery relationship** and the existing `history-revert` block. Every exact
identity, revision, schema version, hash, state, and authority reason remains
visible; current Claim/Assertion or grant facts are not represented as immutable
event facts.

`eligible_for_preview` is labelled **Eligible for compensation preview** and
states that no preview exists yet. It permits only a separately requested,
current-authority preview; it enables no execution. `blocked` is labelled
**Compensation preview blocked** and exposes every exact blocker. An
`already_compensated` result links its retained event through the existing
History-detail route and offers no preview or recovery action. The complete
decision boundary remains explicit: the exact ChangeSet was assessed, preview
was not composed, execution was not performed, and multi-step compensation was
not assessed.

Loading marks only the existing assessment-related detail regions busy and
preserves the verified episode. Missing, unsupported-event, unauthorized,
unavailable, integrity-failed, mismatched, stale, and out-of-order results reveal
no unverified ChangeSet, Approval, evidence, grant, blocker, or compensation
identity and enable no action. A known newer Project-stream position changes
eligible wording to **Recovery assessment needs refresh** until the same event
is reassessed. Programmatic group names, text states, counts, coverage, blockers,
unknowns, and decision boundaries follow the existing detail reading order;
focus moves to the result heading only after a user-requested assessment. IDs
and hashes wrap at narrow widths, and the Claim/Assertion and three-command
orders remain intact.

Grant facts are current at `read_at`; `execution_recheck:
required_at_each_command` prevents any later command from relying on the
assessment alone. The contract fixes `compensation_preview: not_composed`,
`compensation_execution: not_performed`, and `multi_step_compensation:
not_assessed`. Generic Undo, historical ProjectDefinition interpretation, event
rewriting, preview composition, and compensation execution remain absent.

`petra.project-history-compensation-preview-view@1.0.0` adds the authenticated
read-only endpoint
`GET /api/queries/projects/:projectId/history/events/:eventId/recovery/preview`.
An explicit **Prepare reversal** request calls it only while the exact assessment
is `eligible_for_preview`. The server recomposes current assessment authority;
blocked or already-compensated results return unavailable rather than a
substitute preview. Assessment arrival alone does not open the preview.

The existing subordinate `PetraDialog` displays the successful preview. It
first binds the assessment schema/version, event, content hash, assessment time,
eligible state, and authority position to the accepted assessment, then binds
the exact applied promotion ChangeSet. Its comparison presents
`retract_claim` before `retract_assertion`; each operation shows target ID, base
revision/current record hash, trusted/human-accepted before state, and
quarantine/human-rejected after state beside the same target's exactly next
resulting revision. The client preserves operation and result order.

The dialog keeps the impact basis separate from the exact operation effect and
states the retention boundary: prior revisions, promotion, Approval, and
selected event remain retained; dependent records are not rewritten; dependent
effects are not inferred or automatically reversed. It lists Reason, Approval
rationale, and explicit confirmation as input still required before plan
composition. This read collects or defaults none of them.

The governed sequence remains explanatory and ordered:
`SubmitChangeSet` → `RecordApproval` → `ApplyChangeSet`. Each step displays the
exact Actor and CapabilityGrant, required authority recheck, not-composed state,
and prerequisite. The preview provides no command envelope. Its decision
boundary states read only, ChangeSet not created, Approval not recorded,
commands not composed or executed, generic Undo unavailable, and multi-step
compensation not assessed.

Freshness starts at the assessment `read_at` and ends exactly five minutes
later. The binding hash covers Project, event, assessment hash/authority,
promotion ChangeSet, current targets, command grants, and valid-through time.
Expiry, Project-authority advance, promotion-state change, target revision/hash
change, or command-grant change invalidates the preview. An invalidated preview
remains readable as expired/stale evidence but loses any current action posture;
refresh requires a new assessment and preview for the same event.

Loading keeps the assessment visible and dialog closed. Missing, malformed,
unauthorized, unavailable, newly blocked/already-compensated, expired,
integrity-failed, mismatched, or out-of-order results expose no unverified
preview and create nothing. On success focus moves to the dialog heading; one
expiry announcement replaces a live countdown, and **Close preview** returns
focus to **Prepare reversal**. The comparison, retention, required inputs,
three-command sequence, freshness, and read-only boundary have programmatic
names and preserve their order when stacked at narrow widths.

`petra.project-history-compensation-plan-request@1.0.0` and
`petra.project-history-compensation-plan-view@1.0.0` add authenticated,
explicitly confirmed, non-persisted command composition at
`POST /api/queries/projects/:projectId/history/events/:eventId/recovery/plan`.
The existing preview dialog's **Required before a plan** region accepts the
author's nonblank Reason and Approval rationale, each bounded to 8,000
characters, plus unchecked-by-default explicit confirmation. The frozen **Open
Revert Review** action sends them only while the exact preview is unexpired. Its
request includes the routed Project/event and the compact preview schema,
version, content hash, binding hash, issued time, and valid-through time. It
accepts no client Actor, grant, command identity, persistence flag, or execution
flag.

The server recomputes an eligible assessment and preview from current authority
and compares its canonical content/binding identity, original five-minute
interval, Project/event, assessment, targets, impact, results, preservation,
and three command grants with the compact reference. A successful response
reports explicit confirmation by the server-resolved human Actor and a passed
revalidation with checked time, assessment hash, repeatable-read authority,
Claim then Assertion target bindings, all three command/grant bindings, and an
unexpired preview.

The same dialog then shows the exact proposed ChangeSet 1.1/R2/direct-edit
record with the author's Reason and original compensation identity, the exact
approved Approval with the author's rationale and exact ChangeSet subject, and
three ordered command-envelope 1.1 records: `SubmitChangeSet`,
`RecordApproval`, then `ApplyChangeSet`. Each envelope keeps its own exact grant
and a common Actor/correlation; Record Approval is caused by Submit, and Apply
is caused by Record Approval. Every step is `composed_not_submitted`. Submitted
or approved state inside a composed payload does not mean its record was
persisted or its command submitted.

The result states ChangeSet, Approval, and commands not persisted; commands not
submitted; execution not performed; a separate request required; and authority
recheck required at each command. Generic Undo and multi-step compensation
remain unavailable/not assessed; dependent effects are not inferred or
reversed; historical ProjectDefinition is not interpreted; graph-navigation
history remains client-local. Plan composition adds no Recent changes row,
receipt, event, evidence revision, projection work, or execution control.

While plan composition is loading, the dialog retains the verified preview and
authored input, marks **Open Revert Review** busy, and prevents duplicate
submission. Success focuses the plan heading; failure focuses an error next to
the action or first invalid field. A 422 invalid request preserves input for
correction. A 409 unavailable result covers expiry, tampering, cross-Project
reuse, changed authority/grants, newly blocked assessment, or retained prior
compensation: keep the prior preview labelled stale/expired, preserve text as
an unsent draft, clear confirmation, and require a new assessment and preview.
A missing event, unavailable boundary, authentication failure, integrity
failure, or mismatched/out-of-order response exposes no plan. Safe 503 retry is
available only before the same preview expires.

Reason, rationale, confirmation, status, revalidation, ChangeSet, Approval,
three envelopes, and decision boundaries have programmatic names in that
reading order. Exact IDs and hashes wrap. At narrow widths each command stacks
without separating its Actor, grant, causation, embedded payload, or state.
Closing or Escape returns focus to **Prepare reversal** and leaves the Project
unchanged. After success **Open Revert Review** remains present but unavailable
with a separate-capability reason; **Close preview** remains the only available
footer action. Execution stays outside the frozen interface and this
conformance slice.

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
event traversal, exact episode detail, exact dependency impact, and exact
recovery assessment, compensation preview, and compensation-plan composition
before a reader is called. The Recent route accepts no query parameters; the
retained route accepts one bounded limit, one opaque cursor, and only the
registered
single-value `family`, `command_name`, `event_type`, `actor_id`, `outcome`,
`effect`, paired `target_semantic_key`/`target_object_id`, `recorded_from`, and
`recorded_through` parameters. Parameters cannot repeat. The episode, impact,
recovery, and preview routes accept only one canonical event identity; recovery
and preview reject query parameters, and preview returns unavailable unless the
recomposed assessment remains eligible. Plan composition rejects query
parameters and accepts only its registered compact preview reference and
confirmation body. Each returns no substitute Project and validates its
composed contract before responding. Typed workbench clients verify the
contract family, normalized filters, limit, optional cursor, Project, event,
selected-event/assessment anchors, impact-source identity, operation/result
order, revision increment, freshness, preview reference, confirmed input,
ChangeSet/Approval linkage, and command/envelope sequence while treating `phc2`
and content/binding hashes as opaque. No component, CSS, browser route, or
frozen surface changed.

The 1.2 typed client also binds `target_total_count` to the selected event's
target count, `target_returned_count` to the assessment count, every
`target_index` and `target_ref` to the same ordered event target, every
registered resolution to the exact target revision and supplied hashes, and
every non-result state to an empty group array and its fixed reason. It requires
the exact nine-entry registry and the exact group set and order for each
registered target kind, including the distinct immutable lineage and current
effective-head authorities.

The PostgreSQL reader fails closed when it cannot reproduce:

- an event record hash from its canonical payload;
- the version-appropriate command fingerprint;
- a lifecycle or replacement receipt's content and record hashes;
- the receipt-to-command and receipt-to-event references;
- a lifecycle event's exact prior and resulting source transition;
- a replacement event's exact relationship or retraction record; or
- the current exact source/replacement head used for recovery eligibility;
- a cursor signature, canonical payload, Project/snapshot/limit/complete-query
  binding, retained authority bounds, or exact head-event identity/hash; or
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
- a recovery promotion ChangeSet, applied Approval, current Claim/Assertion
  head, active command grant, or retained compensation ChangeSet/Approval/event
  exact Project, revision, content, record, and causal binding; or
- a compensation preview's exact assessment, authority position, current
  target, active grant, five-minute expiry, or canonical binding-hash input; or
- a confirmed plan's canonical preview reconstruction, original five-minute
  interval, current Project/target/impact/grant authority,
  ChangeSet/Approval linkage, or exact command order and causation.

## Verification

Contract fixtures include accepted exact Recent changes, causal-episode,
retained traversal 1.0/1.1, dependency-impact 1.0/1.1/1.2, and ChangeSet
recovery-assessment and compensation-preview responses. Accepted plan-request
and plan-view fixtures cover explicit confirmation and non-persistence.
Rejected fixtures cover an altered quick limit, false global episode order,
unsafe offset or query-unbound cursor reuse, a dependency read that claims a
reversibility decision, and an unregistered semantic target that fabricates a
registered adapter group, plus an invalid response that collapses retained
replacement lineage and effective head state into one unsupported authority or
claims that a recovery assessment composed a compensation preview, or turns a
read-only preview into a created ChangeSet, recorded Approval, composed command,
or execution. An unconfirmed plan request and a plan response that claims
execution are also rejected.
TypeScript generation, AJV conformance, strict Pydantic round-trip parity,
server route tests, typed-client tests, and the real PostgreSQL integration
suite pass. The complete gate includes 828 always-on TypeScript tests, 25 Python
tests, seven expected service-dependent skips, and 106 PostgreSQL cases after a
clean V001-through-V030 migration. The database proof exercises all seven
History reads/compositions over domain-event versions
1.0, 1.1, 1.2, and 1.3, and proves cursor integrity, cross-Project rejection,
stable membership after a concurrent append, keyset continuation without
duplication, complete Project/snapshot/limit/query binding, exact filtered counts
and zero-match results, every registered filter dimension,
source/replacement/retraction target matching, causal parent/following-command
links, Project-stream adjacency, exact lifecycle or replacement receipt
references, and exact command, outbox,
graph-projection, GroundedResponse-invalidation, ChangeSet/Approval,
ReviewSession-membership, GroundedResponse-dependency, composition-lineage,
ProjectSource lifecycle/dependency, immutable replacement/retraction/receipt,
and current effective-head bindings. The recovery proof additionally exercises
eligible, unavailable-principal blocked, and already-compensated states before
and after one real compensating reversal, exact grant resolution, cross-Project
non-disclosure, and both applied and reverted event selection. Active and
retracted head states remain separate from retained lineage. The preview proof
verifies exact operation/result order, five-minute authority binding,
missing/ambiguous/already-compensated rejection, and unchanged ChangeSet,
Approval, command, event, and evidence-revision counts. The plan proof
reconstructs the compact preview reference, preserves exact human input and
distinct per-command grants, rejects tampering, cross-Project reuse,
unconfirmed input, and grant change, validates deterministic causal envelopes,
and proves the same zero-write boundary.

## Next safe slice

Backend `718f641` identifies separately authorized execution of one exact,
still-current confirmed plan as the next safe History boundary. That future
request must retain the plan's canonical identity and causal envelope chain,
revalidate preview freshness, targets, and each command grant, and expose exact
outcomes if submission is partial. This freeze-conformance slice stops before
execution design or integration. Generic Undo, reversal of a reversal, multiple
or multi-step compensation, historical ProjectDefinition interpretation, event
rewriting, and an untrusted origin filter remain excluded.
