# Manual Review Apply in the frozen interface

Date: 2026-09-13
Design starting commit: `c63ef9104078b784d03cdcc9a382ee5ffce584dc`
Exact backend counterpart: `eed1dddb6b953e3a4437614b79d89ecedd69c419`
Authority: [D021](../decisions/D021-manual-review-session-apply-checkpoint.md),
[D020](../decisions/D020-read-first-review-member-recovery.md), and the
[frozen checkpoint placement](UX-REQ-012-REVIEW-APPLY-CHECKPOINT-CONFORMANCE.md).

## Integrated boundary

The production Review surface now prepares and submits the backend's manual
checkpoint through `ReviewSessionApplyClient`. Preparation is an authenticated
read. It displays one complete atomic ChangeSet within **Changes to apply**:
exact commitment identity, every member and operation, before/after state,
server-composed consequences, material validation and qualifications, with
complete origin, basis, provenance, and dependencies available in textual
disclosure. The existing Current, Candidate, Origin, Basis, Difference,
Consequences, Changes to apply, and Decision hierarchy is preserved.

One **Apply displayed ChangeSet** action in **Decision** supplies the complete
checkpoint and `decided_at`. There is no second approval gesture. Browser
validation registers the three canonical 1.0.0 contracts and uses the existing
adapter to verify hashes, exact identities, atomic membership, command results,
History evidence, and the D020 assessment. No frontend eligibility calculation,
command synthesis, authority record, or production fixture fallback was added.

This first path supports fresh scientific candidates without a pre-existing
ChangeSet touching their targets. The server decides support and authorization.
Preparation failures leave Apply unavailable. Closed or stale Review reads,
missing exact member identity, existing ChangeSets, and active local edits cannot
start preparation. Discarding a prepared preview grants no authority and allows
local editing again. ReviewPolicy remains `not_applicable`; delegated and
automatic Apply and Reject remain unavailable.

## Results and reconciliation

The controller captures the displayed commitment before transport, suppresses
repeated clicks, and never retries Apply or sends a missing command suffix.
A validated result reloads the authorized Review through its existing route
revalidator. A reload failure retains the result and reports the failed read
separately. Results survive member selection and Review revalidation in this
mounted session; they are transient presentation of canonical records.

Success names only the displayed ChangeSet. Every supplied Review member outcome
and complete atomic group remains visible through the existing Recovery
assessment renderer. Command observations retain executed, replayed, failed,
unattempted, and unverified states independently of Review outcomes. Canonical
History references retain returned event IDs. The existing event-detail browser
route still uses presentation fixtures, so this integration does not link to it. Projection state and authority
positions are presented separately; **Applied—updating views** is used only for
a validated application with a `catching_up` projection observation.

An incomplete result or uncertain observation requires canonical reconciliation.
The current page offers no further Apply after submission. Reload Review and the
existing read-only Recovery status check remain available; its actions stay
empty. The originating task return remains unchanged. Browser navigation or a
fresh page cannot authorize a replay: the server excludes already-bound targets
and owns all retained-prefix rules.

## Evidence and limits

Node 24.20.0 and npm 11.19.0 are used throughout. The focused workbench suite
passes 83 tests across Apply, Recovery, Review/Graph, and interface recovery.
The Apply cases exercise the actual browser-aliased schema validator and typed
client over synthetic authenticated responses, exact success, denied and stale
reads, unsupported preparation, shared-ChangeSet membership, malformed policy/hash, mismatched
results, repeated clicks, late preparation, changed inspection identity,
incomplete results, retained independent outcomes, and failed reloads.
Presentation variants do not claim database authority or profile neutrality.

The mounted Chrome harness passes keyboard preparation, preview focus, one
touch Apply, exact request/result validation, reload callback, canonical History
references, separate projection lag, disabled resubmission, textual manifest,
375-pixel reflow at 200% text size, touch target size, forced colors, reduced
motion, and an accessible status node. It uses the production mapper, controller,
client, and frozen component with synthetic transport. It does not exercise a
live HTTP server/PostgreSQL session or a screen reader. The harness is isolated
under `apps/workbench/test`; the production router never imports it.

To repeat the browser check, run the workbench on `127.0.0.1:4312`, launch an
isolated Chrome page with remote debugging on port 9432, then run:

```sh
node apps/workbench/test/review-apply-browser.mjs
```

The real PostgreSQL integration gate passes all 145 tests in 16 files on a fresh
store after V001–V041, including the counterpart's production checkpoint route,
restart replay, exact cardinalities, stale and unauthorized execution, complete
atomic membership, retained prefixes, independent members, and projection lag.
This design slice changes no backend contract, server, persistence, migration,
or compensation rule. The complete repository gate is `npm run verify`; its
final outcome is recorded in the worker handoff.

The integration audit also removed links to the fixture-backed History event
route; exact canonical event references remain visible in the result.

Felicity review found one misleading prepared-state label: **No ChangeSet
prepared** remained above an available checkpoint. The label now names the
complete atomic ChangeSet. Success and reload-failure copy distinguish the
applied scope, remaining Review outcomes, and observation limits. No unresolved
material writing finding remains within these evidence limits.

Wave 4 remains open. A cumulative live production exit trace, materially
different registered profiles, ProjectBriefView, and communication remain later
work. This slice does not establish UX1.4-EV01–EV06 closure, direct/model-mediated
identity convergence, or the full wave exit gate.
