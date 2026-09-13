# UX-REQ-012 frozen Review candidate basis-revision integration

Status: bounded Wave 4 material source-basis integration complete; later Review
operations and the cumulative Wave 4 proof remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `3ccfec852be4b2964c3ae2e67a7c75411dddfe16`

## Result

The frozen product brief already accepts **Change basis** as a control distinct
from **Edit candidate**. The production Review detail route now places that
control in the existing **Basis** region for the supported open, single-member
scientific Review shape. Claim-text correction remains inside **Current and
Candidate**. No new information-hierarchy or authority decision was introduced.

The browser exposes the operation only when the authenticated Project Review
1.2 read supplies the exact ReviewSession, member, scientific
ProjectDefinition, WorkingCandidate, one WorkingRelationship, Claim, and
SourceSpan bindings. The detail loader obtains the current exact active
ProjectSource reference from the existing read-only Project-source lifecycle
view. If that exact active reference is unavailable or mismatched, Review
remains readable and **Change basis** is explicitly unavailable. The browser
does not synthesize a source record hash or treat a displayed source label as
authority.

The submitted request contains only those server-supplied identities, a new
caller-owned command identity and idempotency key, and the human-entered source
scope, detail level, stance, attribution, modality, negation, optional
uncertainty, and material reason. Source scope must be restated because the
typed command requires it, but the interface does not infer it from the
presentation label. Server authority rejects a scope change or an incompatible
source. The browser sends no Actor, grant, Claim content, profile record,
working revision, validator result, Review decision, Approval, ChangeSet,
event, projection, or recovery instruction.

`ReviewCandidateBasisRevisionClient.revise` validates the compact request and
accepts a response only when the registered receipt, Claim, WorkingCandidate,
WorkingRelationship, and ReviewSession match the request and each other. The
browser validator bundle now includes the basis-revision receipt and its command
definition dependency. Server and package consumers continue to use the
filesystem-backed canonical registry.

## Interaction and recovery

The basis editor is an in-place disclosure below the exact Basis items. Source
semantics, disclosure state, draft fields, and focus stay React-local until
submission. Closing and reopening retains every unsent field. Opening focuses
the first required select; closing returns focus to **Change basis**.

While the command is pending, the loaded basis remains visible, the form and
other Review commands are locked, and nothing is shown as revised, validated,
decided, or applied. A confirmed matching result triggers an authenticated
Review reload. A new result is labeled **Working basis revision confirmed**;
an idempotent replay is labeled **Exact basis result recovered**. Both states
state that validation is pending and that no Review decision or domain
authority was created.

Network, service, invalid-response, and identity uncertainty retain the exact
command request. **Retry exact basis revision** resends the same command,
idempotency key, exact references, and human fields. Stale records, incompatible
source semantics, and reused command identities require an authenticated
Review reload before another command. Unauthorized, unsupported-profile,
no-material-change, and other rejected results remain distinct and show no
working revision, validation reset, Review decision, application, or domain
change.

## Frozen presentation boundary

The disclosure reuses Petra's field, textarea, button, status, and alert
treatments. Every select has a persistent label and hint, required values have
non-placeholder labels, the negation checkbox has explanatory text, and local
draft behavior is stated before submission. Terminal outcomes receive focus
and use assertive announcements; pending and matching results use polite status
announcements.

The source-semantic fields use a two-column layout when space permits and one
logical column on narrow or zoomed layouts. The checkbox keeps the shared
minimum control height, meaning is not color-only, and the implementation adds
no animation. Native-control behavior in forced colors and reduced-motion
settings remains part of the real-browser validation boundary below.

This slice changes no backend contract, route, persistence, migration, or
authority. The exact counterpart's fresh PostgreSQL 18.6 evidence through V039
remains applicable; no PostgreSQL rerun was required for this frontend-only
integration.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Focused workbench typecheck passes.
- Focused workbench tests cover exact Review and source-reference mapping,
  compact command construction, typed-client delegation, missing exact-source
  unavailability, local disclosure and draft retention, command locking, new
  and retained success, stale, unauthorized, unsupported-profile,
  incompatible-source, no-material-change, retry-mismatch, invalid-response,
  and uncertain outcomes.
- The complete repository gate passes. The production workbench build also
  passes with Vite's existing advisory that the main JavaScript chunk exceeds
  its default size threshold.

The focused tests render the disclosure and outcome variants, exercise local
state transitions and exact transport delegation, and instantiate the bundled
schema registry. They do not drive focus, announcements, typing, or clicks in
a real browser. Browser keyboard, focus, announcement, touch, text-scaling,
forced-colors, reduced-motion, and responsive behavior remain automation
boundaries for the cumulative Wave 4 proof.

## Remaining boundary

This slice does not change Claim text, source scope, or WorkVersion. It does not
add Apply, Reject, explicit separation, member recovery, scheduled validator
rerun, a second profile renderer, multi-member Review, ProjectBriefView,
CommunicationPlan, direct/model-mediated entry convergence, or the cumulative
Wave 4 runtime proof. It does not establish the Wave 4 exit trace. Wave 4
remains open.
