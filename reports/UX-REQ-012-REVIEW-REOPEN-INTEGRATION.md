# UX-REQ-012 frozen Review reopen integration

Status: bounded Wave 4 ReopenReviewSession integration complete; later Review
operations and the cumulative Wave 4 proof remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `ee4caeb12e44d3b44dd504013c4cbd1ba552c6a5`

## Result

The production Review detail route now presents **Reopen review** only when the
authenticated `petra.project-review-view@1.2.0` says that the exact
ReviewSession lifecycle is `deferred`. A Review that displays **Waiting** while
its lifecycle is `open` does not expose Reopen, and an older Review read without
an exact lifecycle cannot expose it. The client does not convert presentation
status into lifecycle or command eligibility.

The Reopen request carries a new caller-owned command identity and idempotency
key plus the route's exact ReviewSession identity, revision, content hash, and
`deferred` lifecycle. It carries no Actor, CapabilityGrant, Approval, ChangeSet,
validation force, or completion claim. The authenticated server command still
resolves the Actor and CapabilityGrant and rechecks the current lifecycle and
exact ReviewSession reference before appending a coordination-state revision.

The lifecycle read is a necessary presentation condition only. The interface
states that seeing **Deferred** does not establish command eligibility or
authorization. Apply and Reject remain unavailable because their frozen command
boundaries are not connected in this slice.

## Interaction and recovery

Reopen uses the existing Review lifecycle command path and revalidates the
returned lifecycle result before showing success. While the command is pending,
the exact comparison, basis, consequences, and ChangeSet preview remain visible;
the control is busy, and the live status says that the Review is not yet shown
as open again.

A newly executed transition says **Review reopened**. An idempotent stored
result says **Review already reopened**. Both state that the Review is open
again and that no candidate was approved, rejected, or applied. Neither state
exposes the lifecycle receipt or command trace.

An uncertain network, service, or invalid-result failure retains the original
command identity and offers **Retry exact command**. A 409 response shows
**Review needs refresh** and does not report the Review as reopened. A 401 or
403 response says that **Reopen review was not authorized** and offers no retry.
Other rejected requests remain explicit failures. The same notice, live-region,
focus, and retained-context behavior continues to cover Defer without changing
its command meaning.

Success revalidates the authenticated Review loader and retains **Return to
{origin}** from the server-supplied return context. The component does not
expose command receipts, invent a return destination, or hide the Review's
candidate, basis, validation, consequence, and ChangeSet context while a
lifecycle command runs.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Focused workbench typecheck and production build pass.
- `project-data.test.ts`, `review-graph.test.tsx`, and
  `m1-interface-recovery.test.tsx` pass 71 tests covering exact Reopen request
  identity, no client-carried authority, validated success, stored-result
  reconciliation with identical request bytes, mismatched lifecycle refusal,
  ambiguous Waiting, pending, stale-refresh presentation, unauthorized, return, and
  no-authority language.
- The complete `npm run verify` repository gate passes generated contracts and
  fixtures, retrieval-floor checks, formatting, lint, TypeScript and Python
  typechecks, the production workbench build, and all repository test suites.
- Felicity review found no material ambiguity after the user-facing pending,
  stored-result, and lifecycle-condition language was tightened.

The focused tests render each state and exercise the typed transport, but they
do not drive the control in a browser. Browser focus and announcement behavior
remain an automation boundary for the cumulative Wave 4 proof.

This slice changes no persistence, migration, or PostgreSQL behavior. The exact
counterpart's fresh PostgreSQL 18.6 run remains the relevant database evidence;
no additional database run was required for this frontend-only integration.

## Remaining boundary

This slice does not integrate Apply, Reject, correction or material basis
revision, refresh as a typed Review command, separation, member recovery, a
second profile renderer, multi-member Review, ProjectBriefView,
CommunicationPlan, or the cumulative Wave 4 proof. It does not establish the
Wave 4 exit trace. Wave 4 remains open.
