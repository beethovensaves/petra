# UX-REQ-007 causal Project History

Status: bounded Recent changes, exact event-selected causal episodes,
snapshot-stable filtered retained Project-event traversal with authorized Actor
and target option catalogues, bounded direct dependency impact plus registered
exact semantic-target adapters through ProjectSource and replacement authority,
three exact record-bound Work/output/replay groups with the exact current-Work
destination state, exact read-only ChangeSet recovery assessment, revision-bound
compensation preview, confirmed non-persisted command-plan composition, and
separately authorized exact compensation execution with partial-outcome recovery
passed; frozen History conformance mapping recorded; frontend binding remains
open
Date: 2026-09-10
Design boundary: `UX-DESIGN-FREEZE-01`
Implementation baseline: `04872ff`
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

## Authorized Full History filter options

Backend commit `04872ff` advances the same authenticated endpoint to
`petra.project-history-retained-view@1.2.0`. It preserves the fixed Recent
changes endpoint and ten-item window, the eight existing Full History filter
dimensions, newest-first retained Project-stream order, `phc2` opacity, and
complete Project/snapshot/limit/query cursor binding. Actor and target
catalogues are additive members of the retained response rather than separate
requests, controls, routes, or ledgers.

`filter_options` requires `authorization_scope: authenticated_project`,
`snapshot_and_query_binding: retention_snapshot_and_complete_normalized_query`,
`dimension_semantics: replace_same_dimension_preserve_other_filters`, and
`count_basis: matching_authorized_events_after_replacing_same_dimension`. The
Actor catalogue removes only `filters.actor_id` while preserving every other
normalized filter; the target catalogue removes only the complete
`filters.target` pair. Selecting or clearing an option changes only that field,
and the existing **Apply filters** command begins a new cursorless traversal.
The client performs no compatibility or authority calculation.

Both catalogues have `option_limit: 100`, a returned count equal to the options
array length, an exact total count, complete/truncated coverage, and
`continuation: not_composed`. The active option appears first when returned;
other options sort by `matching_event_count` descending, then Actor ID or exact
target semantic key/object ID. Petra renders the server order and visibly states
**{returned_count} of {total_count} · {Complete|Truncated} coverage · No option
continuation** beside the appropriate existing field. Truncation creates no
load-more control.

Actor options contain only Actors on authorized matching Project events within
the retained snapshot after applying every non-Actor filter. The option
preserves exact Actor ID/kind and a positive matching-event count. Its display
name comes only from `display_descriptor.state: available` backed by the exact
immutable `petra.actor@1.0.0` Actor ID and record hash. The field presents the
name with Actor kind, exact ID, and count; the record hash remains in its
programmatically associated authority description. A globally registered Actor
without a matching Project event is absent and cannot be inserted from client
state.

Target options contain only a registered exact semantic-key/object-ID pair and
a positive count of distinct matching events. They preserve
`display_descriptor.state: exact_identity_only`,
`fallback: semantic_key_and_object_id`, reason code
`revision_neutral_target_title_authority_not_registered`, and the exact reason
**No authorized revision-neutral title is registered for this exact History
target identity.** The existing Target field uses only semantic key, object ID,
and count. It does not resolve a current/historical title, replacement,
ProjectDefinition term, profile label, or compatibility state.

Catalogue counts are facet counts, not collection totals. Actor counts partition
the other-filter result only with no active Actor and complete Actor coverage.
Target counts can overlap because an event can have several targets; they count
distinct events per identity and cannot be added together. When a positive
fully filtered result has an active Actor or target option, that option's count
equals `page.snapshot_total_count`. On a valid zero-result query the active
value may be absent because every returned option has a positive count; the
field retains the exact selected value from the query echo.

Complete zero catalogues say **No Actor options match the other active filters**
or **No Target options match the other active filters** while keeping zero of
zero, complete coverage, and no continuation visible. On first-page loading,
the frozen Full History filter group stays busy, preserves entered values, and
announces **Loading Full History filter options…** once without presenting old
counts as current. Continuations keep accepted options because the retained
snapshot and complete query are unchanged; a catalogue mismatch rejects the
page append.

A malformed option identity, Actor authority/hash mismatch, inferred target
title, server-order/count/coverage mismatch, missing catalogue, unauthorized
response, or stale response fails the complete retained result closed. One
catalogue cannot survive while the other fails. Existing Full History failure
and restart behavior applies, and no option identity or count is disclosed on
unauthorized results.

The existing Actor and Target fields retain their native keyboard behavior.
Their programmatic labels expose the active value, option identity,
matching-event count, immutable authority or exact-identity-only reason,
catalogue returned/total counts, coverage, zero/truncated state, and explicit
absence of continuation in reading order. Long IDs and hashes wrap at the
frozen narrow breakpoint. Counts, reasons, and unavailable states are text and
never color-only or focusable controls.

Retained 1.2 adds no filter dimension, component, CSS rule, browser route,
second ledger, generic Undo, recovery decision, or compensation behavior.

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

## Registered exact operational dependencies

Backend commit `96acc5d` advances the same exact-event endpoint to
`petra.project-history-impact-view@1.3.0`. Version 1.3 preserves the complete
direct and semantic-target result and adds a separate
`operational_dependency_impact` section. For each of at most ten event targets,
it resolves the exact immutable target record from the event or an already
validated semantic authority, then returns three independent groups in fixed
registry order:

- `work_input_binding` returns current WorkUnit-head references only where an
  immutable WorkerInputManifest record input matches the target ID, revision,
  and record hash;
- `work_output` returns immutable WorkerOutputManifest records for Work with
  that exact input binding; and
- `interaction_delivery` returns immutable InteractionReplayRecord receipts for
  InteractionRuns tied to that bound Work.

Every reference preserves semantic and owning-record identity, revision,
schema, posture, relation, stable relation identity, and record hash. Its
`work_unit_ref` preserves WorkUnit ID, revision, spec hash, and record hash. Its
`input_binding_ref` preserves WorkerInputManifest ID/revision, content and record
hashes, binding position/name, and target ID/revision/snapshot hash. Output and
replay references add their content and record hashes; replay also preserves
the exact InteractionRun ID/revision/content hash/record hash. A replay row's
WorkUnit is the revision retained by its InteractionRun and is never replaced
with the current WorkUnit head.

The Work group uses `current` posture; output and replay use
`immutable_revision`. Each group has its own total, returned count,
twenty-five-reference bound, coverage, and server order. Target and group totals
remain separate from direct and semantic-target totals and count relation
references rather than unique objects. The three-group registry order is only a
reading order: Petra asserts no transitive closure or temporal, causal, or
cross-family ordering.

The frozen detail places the three groups beneath their exact target in
**Episode members**, labelled **Current Work using this exact target**,
**Worker output manifests for bound Work**, and **Interaction replay receipts
for bound Work**. **Authority effect** receives a third separately labelled
operational summary. It states **Worker output effect is not inferred** and
**Interaction replay effect is not inferred. Interaction replay is not
worker-output delivery or a ProjectThread binding.** **Projection effect**,
recovery, and compensation remain unchanged.
Version 1.3 supplies no operational semantic destination, so the exact
identities remain text rather than client-constructed links. It creates no
second History or operational ledger.

`target_identity_incomplete` retains the target and states **Operational
adapters require an immutable target revision.**
`target_record_authority_unavailable` retains the target and states **The exact
immutable target record authority is unavailable in this Project snapshot.**
Both require empty groups and expose no operational identities or counts. Work
without the exact immutable record binding is excluded. Complete zero groups
say separately that no current bound WorkUnit head, immutable output manifest,
or immutable replay record was found; zero does not mean no operational effect.
Truncated target or group coverage reports the exact returned and total counts
and adds no continuation control.

The operational `unknowns` remain exact and independently visible:
`work_without_exact_record_binding_is_excluded`,
`unresolved_target_record_authority_may_hide_bindings`,
`worker_output_effect_is_not_inferred`,
`interaction_delivery_effect_is_not_inferred`,
`transitive_operational_dependency_closure_is_not_composed`, and
`cross_family_total_order_is_not_asserted`.

The 1.3 request loads all direct, semantic-target, and operational impact
together. Pending state reuses the existing dependency status and moves no
focus. A registry/order, selected-target, binding, Project, content-hash,
record-hash, count, coverage, or authority mismatch fails the entire impact
response closed while preserving the independently verified episode. A
target-local unavailable state preserves other verified targets. Each target,
group, authority source, posture, relation, count, coverage, empty/unavailable
reason, and binding-chain label has programmatic text in reading order. On
narrow screens, identities and hashes wrap while each WorkUnit,
WorkerInputManifest, output/replay, and InteractionRun chain stays together;
static identities add no inactive keyboard stops or horizontal scrolling.

## Exact operational destination conformance

Backend commit `161235a` advances the existing exact-event impact response to
`petra.project-history-impact-view@1.4.0`. It preserves every 1.3 target,
operational group, identity, binding chain, posture, relation, order, count,
coverage value, unknown, and observed-effect, transitive-closure, and
cross-family-order omission. The only additive member is one exact
renderer-neutral `destination` state on every existing operational reference.
It changes no group membership or total and introduces no URL.

The existing **Episode members** row for `work_input_binding` uses its
already-visible WorkUnit identity as the single native link only when the
containing current `petra.work-unit` reference has `destination.state` set to
`available`. The client requires all of these exact bindings before exposing
the link:

- `place_role: work` and `task_intent: inspect`;
- destination `object_ref.semantic_key: petra.work-unit`, with object ID,
  revision, and record hash equal to the containing reference and its
  `work_unit_ref`;
- route authority `petra.project-work-view@1.0.0`, `view_kind: detail`, and
  `authority_source: current_project_definition_and_project_work_view`; and
- the same-snapshot current `project_definition_ref`, preserving exact
  ProjectDefinition ID, revision, content hash, and definition family.

That ProjectDefinition authority proves Work support at the impact snapshot.
The client does not recompute `supported_places`, infer support from the
definition family, construct a URL from the semantic key, or interpret a
historical ProjectDefinition. The existing Work-detail route adapter consumes
the renderer-neutral authority without adding a browser route or control.

A current WorkUnit with `destination.state: unavailable` remains static text
and shows `project_work_route_authority_unavailable`: **The current
ProjectDefinition does not authorize the exact Project Work detail
destination.** WorkerOutputManifest always remains static text with
`worker_output_manifest_route_not_registered`: **No exact Project-owned
WorkerOutputManifest destination is registered.** Its nested Work binding is
not a substitute link. InteractionReplayRecord and its InteractionRun/Work
chain remain static text with
`interaction_replay_record_route_not_registered`: **No exact Project-owned
InteractionReplayRecord destination is registered; replay is not a
ProjectThread binding.** Replay does not redirect to Petra, ProjectThread,
InteractionRun, or owning Work.

An available non-current Work destination, a Work object-ref mismatch, a
malformed route or definition authority, or any available output/replay
destination fails the complete impact portion closed. The existing episode
stays usable and reports dependency impact unavailable. Version 1.4 retains the
six operational `unknowns` and all nine 1.3 content omissions, including
`operational_dependent_effect_not_inferred`,
`transitive_dependency_closure_not_composed`,
`historical_project_definition_not_interpreted`, and
`cross_family_total_order_not_asserted`. Its single added omission is
`unregistered_operational_destination_not_inferred`. No omission grants a
client fallback.

An available Work identity is the only kind of new tab stop. Its accessible name
includes **Inspect Work**, the exact fallback WorkUnit ID, and current-revision
meaning. Every unavailable reason is programmatically associated with its
static identity and remains visible in narrow layouts, forced colors, and high
zoom. Loading exposes no partly validated link and does not move focus. After
activation, the existing Work detail heading receives focus only after its read
succeeds; its existing unavailable state receives focus if the supplied exact
current Work identity no longer resolves.

The selected History event, invoking Work link, Recent/Full History scope,
filters, scroll position, and permitted incoming origin remain client-local.
Browser Back and the existing return behavior restore that context when it is
still available. Version 1.4 supplies no origin, return, focus, scroll, or
browser-history state and does not alter graph-navigation history. No component,
CSS rule, browser route, filter, recovery decision, undo, or compensation
behavior changes.

## Frozen full-History conformance

The closed design already assigns **Scope/filter** as the first ordered region
of `DB18-SP10` History and includes long filtered History in its state coverage.
Version 1.1 introduced the exact filters and version 1.2 fills their existing
Actor and Target fields with same-snapshot options on the existing History
route. It does not create a new surface, component family, visual language, CSS
rule, or browser route. The same `history-episodes` ordered-list region presents
either the unchanged Recent changes read or one Full History traversal, while
the selected-event detail remains the same exact detail region.

Recent changes always calls its dedicated endpoint without a filter, limit, or
cursor and remains capped at ten. Full History alone calls the retained 1.2
endpoint. Its frozen Scope/filter position exposes one value per family,
command, event, Actor, outcome, authority-effect, and exact-target dimension,
plus either or both inclusive recorded-time bounds. Applying, clearing, or
changing a filter or page limit starts a cursorless traversal. All supplied
filters are conjunctive. The client does not infer compatible combinations;
valid combinations with no match remain authorized empty results. The Actor and
Target catalogues populate those two existing fields and replace only their own
dimension when computing option counts.

The Full History collection preserves backend order and reports the authorized
`snapshot_total_count` next to its heading. Continuation appends only a response
whose exact Project, normalized filters, limit, retained snapshot head, and
exclusive Project-stream boundary and option catalogues still match the active
traversal. `phc2` remains opaque and absent from visible and assistive output.
Newer events do not enter the fixed traversal; current recovery facts are
recomputed at each page read and remain backend facts rather than client
decisions.

The exact selected event and verified detail survive filter changes until the
author selects another matching row. If it is outside the current result page,
the detail says so without marking another row selected. A zero-match response
says **No permitted History events match these filters**, preserves the filter
values, and exposes no unfiltered count. Its catalogues may still contain
replace-one-dimension alternatives, and an absent selected zero-match option
does not clear the field. A continuation that is invalid, query-mismatched, or
no longer resolvable keeps the last verified rows and catalogues and offers a
cursorless restart with the same filters; it never appends an unverified page or
silently widens the query.

The Scope/filter group, every field, composite target pair, inclusive time
meaning, validation error, active value, and matching count have programmatic
labels. Actor and Target option identity, count, descriptor authority/reason,
catalogue returned/total counts, coverage, and absent continuation join that
same reading order. Filter submission is keyboard operable and returns focus to
the invoked control with one result announcement. A user-invoked continuation
places focus at the first newly appended event; row selection follows the
existing detail-heading focus rule. At narrow widths the Scope/filter region,
collection, and detail retain that linear order; controls, exact identities,
and hashes reflow without horizontal scrolling. Empty, unavailable,
unauthorized, query-invalid, continuation-invalid, loading, and
integrity-failure states stay in the affected existing region, preserve exact
return, and reveal no unverified identities or counts.

The backend omission `origin_filter_not_supported` appears as a limitation in
the existing Scope/filter position: **Origin filtering is unavailable because
Project History has no authoritative origin classification.** No origin control
is enabled or implemented from client state.

The frozen design contract contains the required Scope/filter position, but the
checked-in fixture-backed `HistorySurface` does not instantiate it, Full History
collection state, retained continuation, Actor/Target catalogue binding, or any
History loader. That is the precise frontend integration gap. This
freeze-conformance report does not fill it by editing a component, stylesheet,
or route.

## Frozen History detail conformance

The closed `UX-DESIGN-FREEZE-01` History detail already has every placement this
contract needs. The impact view does not add a component, panel, dialog, CSS
rule, or browser route:

- its `selected_event` validates and preserves the exact event already open in
  the existing detail header and Actor/time/action facts;
- its direct, semantic-target, and operational summaries may follow the observed
  event in **Authority effect**, separately labelled as registered reference
  counts rather than all impact;
- causal commands, event outbox records, GroundedResponse invalidations, the
  applicable per-target semantic and operational adapter groups, and any
  target-local non-result reason remain separately labelled in **Episode
  members**;
- exact graph-projection attempts occupy **Projection effect**, while their
  applied/failed records remain distinct from current Graph freshness; and
- aggregate target/group coverage, all three `unknowns` arrays,
  `decision_boundary`, and `omissions` appear with **Recovery relationship**,
  where they explicitly prevent references from being read as effects,
  reversibility, or compensation.

Every group retains its immutable `authority_source`, relation, returned count,
total count, complete/truncated coverage, and exact references. The client keeps
server order inside a group and never sorts relation families into a common
timeline. The semantic and operational portions also retain exact target order,
target and per-adapter bounds, resolved authority identity, relation identity,
and posture.
Replacement lineage and command receipts stay under separately labelled
retained groups; only the separately labelled effective-head group presents the
current active or retracted relationship. Each keeps independent counts,
coverage, and empty wording.
Complete zero direct, semantic-target, and operational groups receive separate
bounded wording followed immediately by applicable unregistered-key,
identity-only, exact-binding, unresolved-authority, transitive,
profile-specific, external, effect, and ordering limitations. They cannot be
summarized as no impact.

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
implemented Recent, episode, retained, 1.4 impact, or recovery-assessment
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
receipt, event, evidence revision, or projection work and does not itself
authorize execution.

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
unchanged. After success **Open Revert Review** has completed plan composition;
the same primary footer slot may advance only through the separate execution
confirmation below. Plan arrival alone still runs no command.

`petra.project-history-compensation-execution-request@1.0.0` and
`petra.project-history-compensation-execution-view@1.0.0` add the separately
confirmed command at
`POST /api/commands/projects/:projectId/history/events/:eventId/recovery/execute`.
Within the same frozen dialog, the existing primary footer slot advances from
**Open Revert Review** to the accepted **Revert change** action after the exact
plan appears. One new unchecked confirmation states that Submit ChangeSet,
Record approval, and Apply ChangeSet use separate transactions and that earlier
commands may remain completed if a later command stops. It supplies literal
confirmation and
`per_command_transaction_not_three_command_atomic`; the earlier plan
confirmation cannot satisfy it.

The request echoes the complete composed plan unchanged. That echoed plan is
untrusted input and cannot confer its Actor, grants, command IDs, envelopes, or
authority. With no retained command prefix, the server validates its canonical
identity and reconstructs the exact plan from current preview authority before
attempting the first command. With a retained prefix or completed result, a
retry instead validates immutable command executions and domain events. The
client checks response shape and routed identities but does not calculate plan
freshness, authority, prefix membership, grant validity, recovery, or the next
command.

`SubmitChangeSet`, `RecordApproval`, and `ApplyChangeSet` execute in fixed order
through three separate command transactions and current grant checks. The
server reads the immutable result and event after each command before it may
attempt the next. One HTTP request therefore does not make the sequence atomic;
a later stop retains every earlier success.

The response identifies one of three preflights: current plan revalidated before
first execution, retained prefix validated before continuation/review, or
retained completion replayed without another command. It supplies `completed`
or `stopped`, an exact `completed_prefix` from zero through three, and three
ordered step records. The frozen dialog states each step exactly:

- `retained_success` includes completion time, exact command result, and its
  immutable domain event;
- `retained_failure` is the immutable terminal Apply conflict with exact stale-
  revision or authority-mismatch error and reversal-conflict event;
- `attempt_failed_not_retained` states that no immutable execution was retained
  for that attempt and shows its exact error; and
- `not_attempted` states that the prior command did not complete and supplies
  no invented event or error.

Only `recovery.state: retry_exact_plan` enables the existing primary slot as
**Retry exact reversal**. It displays the retained prefix and server-supplied
next position and resends the same full plan and atomicity acknowledgment; the
backend validates the prefix and rechecks the next command's grant.
`review_retained_failure` exposes the retained failure and event without an
execution retry. `complete` states that the same request returns the exact
retained result and exposes no further execution action.

A completed response supplies the exact compensation and compensated ChangeSet
IDs, Approval ID, Claim and Assertion prior/resulting revisions and resulting
quarantine/human-rejected authority, and reversal event identity. A stopped
response states that compensation was not completed while preserving the exact
successful prefix. Every result states three-command non-atomicity and derives
from immutable command executions, immutable domain events, and current change-
control authority with `aggregate_ledger: not_created`. No second History or
execution ledger exists. Dependent effects are not inferred or automatically
reversed,
cross-family order is not asserted, historical ProjectDefinition is not
interpreted, and graph-navigation history remains client-local.

While the POST is pending, the existing dialog shows one busy state and retains
the last verified three-step list; it does not invent streaming progress.
Closing, navigation, timeout, or connection loss does not cancel execution and
leaves the result unknown until the same exact request reconciles immutable
state. A verified stopped result focuses its affected command and recovery; a
retry preserves retained successes. A completed or replayed result focuses the
completion heading and never duplicates command, event, or evidence writes.

The exact reversal event uses the existing History-detail route. Claim and
Assertion references use the existing semantic resolver when available and
remain exact text otherwise; the browser does not parse their semantic keys
into routes. The original event may refresh to its already-compensated
assessment, and the existing top return control preserves origin and focus.

Invalid confirmation/atomicity or route/body/query input fails with 422 before
execution. A stale, altered, cross-Project, authority-mismatched, or
unreproducible plan/prefix fails closed with 409. Missing event, unauthorized,
unconfigured, integrity-failed, and unexpected 503 states expose no substitute
result. A 503 execution failure or lost response does not establish whether a
command committed; only the same-request reconciliation path is safe. The exact
plan and last verified result remain visible as untrusted client-held recovery
state, but loss of the full plan cannot be reconstructed from a nonexistent
aggregate ledger.

Confirmation, non-atomicity, busy and interruption state, preflight, outcome,
completed prefix, all four step states, exact errors/events, authoritative
effect, recovery, and omissions have programmatic text in reading order.
Status is never color-only. Focus moves to the outcome or stopped/error heading,
and close returns to **Prepare reversal**. At narrow widths each step remains
with its command identity, grant, result/error, and event; IDs and hashes wrap,
and keyboard or screen-reader recovery never requires the graph, hover, drag,
animation, or horizontal scrolling.

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
recovery assessment, compensation preview, compensation-plan composition, and
compensation execution before a read or command boundary is called. The Recent
route accepts no query parameters; the retained route accepts one bounded limit,
one opaque cursor, and only the registered
single-value `family`, `command_name`, `event_type`, `actor_id`, `outcome`,
`effect`, paired `target_semantic_key`/`target_object_id`, `recorded_from`, and
`recorded_through` parameters. Parameters cannot repeat. The episode, impact,
recovery, and preview routes accept only one canonical event identity; recovery
and preview reject query parameters, and preview returns unavailable unless the
recomposed assessment remains eligible. Plan composition rejects query
parameters and accepts only its registered compact preview reference and
confirmation body. Execution rejects query parameters and accepts only the
exact full plan, literal confirmation, and per-command-transaction
acknowledgment, with outer, embedded, and routed Project/event identity equal.
Each returns no substitute Project and validates its contract before responding.
Typed workbench clients verify the contract family, normalized filters, limit,
optional cursor, Project, event, selected-event/assessment anchors,
impact-source identity, operation/result order, revision increment, freshness,
preview reference, confirmed input, ChangeSet/Approval linkage,
command/envelope sequence, plan reference, execution steps, completed prefix,
`authoritative_effect`, recovery, and non-atomicity while treating `phc2` and
content/binding hashes as opaque. No component, CSS, browser route, or frozen
surface changed.

The retained 1.2 typed client requires both catalogues, their exact binding and
facet constants, unique canonical option identities, fixed fallback/reason
values, positive matching-event counts, active-first stable order, and exact
returned/total/coverage/no-continuation relationships. It binds an Actor name
only to a matching immutable Actor ID and valid record hash, requires a returned
active option's count to equal the positive fully filtered snapshot total, and
rejects any inferred target title. It does not decode `phc2` or infer an omitted
active option on a zero-result page.

The impact 1.2 typed client also binds `target_total_count` to the selected event's
target count, `target_returned_count` to the assessment count, every
`target_index` and `target_ref` to the same ordered event target, every
registered resolution to the exact target revision and supplied hashes, and
every non-result state to an empty group array and its fixed reason. It requires
the exact nine-entry registry and the exact group set and order for each
registered target kind, including the distinct immutable lineage and current
effective-head authorities.

The 1.3 typed client additionally requires the exact three-entry operational
registry and fixed group order. It binds every operational target index and
reference to the selected event, validates resolved record authority, requires
independent group totals and coverage, and checks every WorkUnit and immutable
input binding against that target. Output and replay references must preserve
their registered posture and relation; replay must also retain the exact
InteractionRun authority. The client derives no effect, destination, transitive
relationship, or recovery state from these references.

The 1.4 typed client additionally requires exactly one valid destination union
on every operational reference. It permits `available` only for the containing
current WorkUnit and verifies its exact object, route-authority, and
ProjectDefinition bindings. It requires the fixed unavailable reason for a
Work destination without current definition authority and rejects any available
WorkerOutputManifest or InteractionReplayRecord destination.

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
- a retained 1.2 option catalogue's Project/snapshot/query facet basis, Actor
  payload/identity/record hash, target identity-only descriptor, stable order,
  matching-event counts, total, coverage, or zero-result behavior;
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
- an operational dependent's exact Project, target record binding,
  WorkerInputManifest, WorkUnit, output manifest, InteractionRun, replay record,
  content hash where applicable, record hash, or registered relation identity;
  or
- the current ProjectDefinition payload/content/record hashes and Work-place
  support used to authorize a Work destination, or the exact destination object
  and route-authority binding; or
- a recovery promotion ChangeSet, applied Approval, current Claim/Assertion
  head, active command grant, or retained compensation ChangeSet/Approval/event
  exact Project, revision, content, record, and causal binding; or
- a compensation preview's exact assessment, authority position, current
  target, active grant, five-minute expiry, or canonical binding-hash input; or
- a confirmed plan's canonical preview reconstruction, original five-minute
  interval, current Project/target/impact/grant authority,
  ChangeSet/Approval linkage, or exact command order and causation; or
- an execution request's exact plan identity, route binding, envelope
  fingerprints, retained-prefix shape, immutable execution/event hashes,
  command result, or resulting reversal authority.

## Verification

Contract fixtures include accepted exact Recent changes, causal-episode,
retained traversal 1.0/1.1/1.2, dependency-impact 1.0/1.1/1.2/1.3/1.4, and
ChangeSet recovery-assessment and compensation-preview responses. Accepted plan-request
and plan-view fixtures cover explicit confirmation and non-persistence.
Accepted execution-request and execution-view fixtures cover separate command
authorization, non-atomicity, retained prefix, retry, and completed effect.
Rejected fixtures cover an altered quick limit, false global episode order,
unsafe offset or query-unbound cursor reuse, a dependency read that claims a
reversibility decision, a retained 1.2 target option that fabricates a title,
and an unregistered semantic target that fabricates a registered adapter group,
plus an invalid response that collapses retained replacement lineage and
effective head state into one unsupported authority or claims a global ordering
scope for an operational group. The 1.4 rejected
fixture fabricates an available replay-to-ProjectThread destination. Further
cases claim that a recovery assessment composed a compensation preview, or turn
a read-only preview into a created ChangeSet, recorded Approval, composed
command, or execution. An unconfirmed plan request and a plan response that
claims execution are also rejected. An unconfirmed execution request and an execution
response that claims three-command atomicity are rejected.
TypeScript generation, AJV conformance, strict Pydantic round-trip parity,
server route tests, typed-client tests, and the real PostgreSQL integration
suite pass. The complete gate includes 845 always-on TypeScript tests, 25 Python
tests, seven expected service-dependent skips, and 109 PostgreSQL cases after a
clean V001-through-V030 migration. The database proof exercises all seven
History reads/compositions plus the execution command over domain-event versions
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
and proves the same zero-write boundary. The execution proof completes the three
exact commands, replays completion without duplicate writes, rejects tampering
and cross-Project reuse, distinguishes an unretained interrupted Approval
attempt, and resumes from the exact retained Submit prefix before returning the
reversal event and resulting evidence revisions.

The retained 1.2 proof validates both catalogues against the same Project,
retention snapshot, and normalized query. It proves replace-only dimension
counts across combined Actor/target filters, active-first stable
ordering, selected-option equivalence to the positive filtered snapshot total,
continuation stability after a new event, exclusion of an unrelated registered
Actor, exact immutable Actor authority, and explicit revision-neutral target
title unavailability. Contract, Python parity, typed-client, and PostgreSQL
checks reject a fabricated target title.

The 1.3 operational proof registers the same exact ChangeSet record as a Work
input in two Projects and returns only the selected Project's current WorkUnit.
It follows that binding to immutable WorkerOutputManifest and
InteractionReplayRecord authorities and validates every selected target,
WorkerInputManifest, WorkUnit, output, InteractionRun, replay, content-hash, and
record-hash link under the same repeatable-read snapshot.

The 1.4 proof validates the current ProjectDefinition before returning a Work
destination bound to the exact current WorkUnit revision and record hash and
the existing Project Work detail authority. Advancing the definition to a
revision without Work support changes only that Work destination to the exact
unavailable state. Output and replay remain unavailable with separate reasons,
and contract, typed-client, and PostgreSQL checks reject a fabricated
replay-to-ProjectThread destination.

## Next safe slice

The next safe History boundary is a backend-only retained-view revision with
stable machine-readable continuation-failure subcodes. It may distinguish a
malformed or tampered cursor, changed Project/query/limit binding, and an
unavailable retained snapshot while preserving the same non-disclosing,
fail-closed restart behavior and `phc2` opacity. This report does not define the
subcodes. It adds no filter, catalogue, component, CSS rule, browser route,
second ledger, recovery decision, generic Undo, or compensation behavior.
