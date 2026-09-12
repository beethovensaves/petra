# UX-REQ-012 frozen Review defer integration

Status: bounded Wave 4 DeferReviewSession integration complete; Reopen remains
unavailable at the frozen interface
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `36882964fb16dd6decffeae893b842f47a0f8e5b`

## Result

The production Review detail route now connects **Decide later** to the
authenticated `DeferReviewSession` client. The request carries a new command
identity and idempotency key, the route's exact ReviewSession identity,
revision and content hash, the command-required `open` lifecycle, and an
optional reason. It carries no Actor, grant, Approval, ChangeSet, validation
force, or completion claim. The server remains responsible for resolving
authority and rechecking the current lifecycle.

The route presents this control only while the authenticated Review view says
**Needs your decision**. That placement preserves the frozen Review hierarchy;
it does not claim that validation or presentation state authorizes the command.
Apply and Reject remain unavailable because their frozen command boundaries are
not connected in this slice.

## Interaction and recovery

The optional reason remains local until submission and is omitted when blank.
The interface states that no scheduled revisit time is supported. While the
command is pending, the exact comparison, basis, consequences, and ChangeSet
preview remain visible; the control is busy and the status region says that no
decision has yet been recorded.

A success state appears only after the typed client verifies the command,
prior and resulting Review references, transition, retained records, and fixed
no-authority effect. A newly executed transition says **Review deferred**. An
idempotent stored result says **Review deferral confirmed**. Both state that the
Review is waiting and that no candidate was approved, rejected, or applied.
Neither state exposes the lifecycle receipt or command trace.

An uncertain network, service, or invalid-result failure retains the original
command identity and offers **Retry exact command**. This is reconciliation,
not a new submission: a command that already succeeded returns its stored
result, while an unapplied command is attempted with the same identity. A 409
response shows **Review needs refresh** and never reports deferment. A 401 or
403 response states that **Decide later was not authorized** and offers no
retry. Other rejected requests remain explicit failures.

Success refreshes the authenticated Review loader and exposes **Return to
{origin}** from the server-supplied return context. The adapter maps the shared
Project place and, where that place has an existing detail route, its exact
object reference to the browser route. Places without an object-detail route
return to their named place; restoring item focus there remains open. The
presentation fixture supplies its own return path and is not used by the
production loader.

Status changes use a live region. Failure states are assertive; pending and
success states are polite. Keyboard focus moves to the verified success or
failure status so the result and return or recovery action are encountered once
without hiding the retained Review context.

## Reopen conformance boundary

The frozen interface does not expose **Reopen review** in this slice. The
current `petra.project-review-view` session summary supplies
`needs_decision`, `waiting`, or `completed`, but not the exact ReviewSession
lifecycle. `waiting` is ambiguous: the backend reader returns it for a deferred
session and when every member outcome is waiting. Mapping `waiting` to
`deferred` would therefore invent the expected lifecycle and client-side
eligibility.

The next backend-owned Review read slice should expose the exact session
lifecycle or an equally authoritative operation descriptor bound to the same
session revision and content hash. The frozen route can then connect
`ReopenReviewSession`, revalidate the returned Review, and preserve the same
pending, exact-retry, stale, unauthorized, and return grammar without inferring
authority.

## Verification

Pinned Node 24.20.0 focused evidence passes:

- package build and workbench TypeScript typecheck;
- `project-data.test.ts`, `review-graph.test.tsx`, and
  `m1-interface-recovery.test.tsx`, 67 tests total;
- exact Defer request shape without client-carried authority;
- new-transition and retained-result response handling with identical retry
  input;
- rejection of a response that changes the receipt's no-authority boundary;
- accessible pending, success, stale, unauthorized, uncertain-result retry,
  ambiguous-Waiting, and exact-return presentations.

The focused tests render every state and exercise the typed transport, but they
do not drive the control in a browser. Browser focus and announcement behavior
remain an automation boundary for the cumulative Wave 4 proof.

The complete `npm run verify` gate passes generated-contract and fixture
checks, the retrieval floor, formatting, lint, TypeScript and Python
typechecks, and the production workbench build. Its test totals are 474
contract tests, 216 core tests, 31 adapter tests, 15 retrieval tests, 3 Neo4j
tests with 1 integration-only skip, 3 S3 tests with 6 integration-only skips,
73 server tests, 138 workbench tests, 25 Python tests, and 8 handoff automation
tests. The production build retains the existing non-failing chunk-size
advisory.

This design slice changes no persistence or PostgreSQL behavior, so the real
PostgreSQL integration evidence remains the exact counterpart's fresh V001–V035
run rather than a new database run.

## Remaining boundary

This slice does not integrate Reopen, Apply, Reject, correction or material
basis revision, refresh as a typed Review command, separation, member recovery,
a second profile renderer, multi-member Review, ProjectBriefView,
CommunicationPlan, or the cumulative Wave 4 proof. Wave 4 remains open.
