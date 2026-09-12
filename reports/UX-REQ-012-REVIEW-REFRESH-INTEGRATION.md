# UX-REQ-012 frozen Review refresh integration

Status: bounded Wave 4 RefreshReviewSession integration complete; later Review
operations and the cumulative Wave 4 proof remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `591fbb31274724d4ba32adb70b7d2b11e01660d6`

## Result

The production Review detail route now presents **Refresh Review** when the
authenticated Review read marks the exact comparison `stale` and supplies the
exact `open` ReviewSession lifecycle. A stale read without that lifecycle keeps
the control unavailable. The browser does not derive lifecycle, refresh
eligibility, profile meaning, validation force, authority, or member selection.

The request contains a new caller-owned command identity and idempotency key
plus the exact ReviewSession identity, revision, content hash, and server-supplied
open lifecycle. It contains no Actor, CapabilityGrant, Approval, ChangeSet,
member, candidate, basis, validation, or conversational field. The authenticated
server still resolves the Actor and grant and rechecks the exact current session,
lifecycle, Project authority, profile adapter, and compatible working heads.

The workbench accepts success only after the returned typed receipt and
ReviewSession agree with the request and with each other on Project, command,
session, revision, content hash, open lifecycle, resulting snapshot, member
order, exact working references, retention, and no-authority fields. The
interface does not expose the receipt, Actor, grant, command trace, or authority
fields.

## Interaction and recovery

While refresh is pending, the stale Current/Candidate comparison, origin, basis,
validation, consequences, and ChangeSet preview remain visible. The refresh
control is busy, other Review commands cannot start, and a polite live status
says that nothing is shown as refreshed yet.

A newly executed refresh says **Review refreshed**. An idempotent stored result
says **Review refresh already confirmed** and that the exact command was not
applied again. Both state that refresh approved, rejected, applied, and
separated nothing and edited no candidate or basis record. After either
validated success, the route revalidates the authenticated Review read so the
server-composed comparison replaces the stale presentation.

An uncertain network, service, or invalid-result failure retains the original
command input and offers **Retry exact refresh**. Serializing that retained input
again produces the same request bytes. A 409 stale, incompatible, or no-longer-
required result says that nothing is shown as refreshed and offers **Reload
Review**, not a retry of an obsolete command. A 401 or 403 result says that the
refresh was not authorized and offers no retry. Other rejected requests remain
explicit failures. All terminal outcomes move focus to the alert or status
inside the existing Decision region and retain the server-supplied return link.

## Frozen presentation boundary

Refresh stays in the existing Review Decision hierarchy and reuses its button
and notice primitives, live-region and focus patterns, forced-colors and
reduced-motion rules, and text-scaling, keyboard, touch, and responsive
behavior. Current and Candidate remain visually and textually available
throughout the command. A disabled stale-state control remains
visible when an older authenticated read does not supply exact lifecycle, but it
has no operation marker and cannot construct a command.

This slice changes no backend contract, server, persistence, migration, or
authority behavior. The exact backend counterpart's PostgreSQL 18.6 evidence
through V036 remains applicable; no PostgreSQL rerun was required for this
frontend-only integration.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Workbench typecheck and production build pass.
- `project-data.test.ts`, `review-graph.test.tsx`, and
  `m1-interface-recovery.test.tsx` pass 74 tests. They cover exact request
  identity and bytes, authenticated transport, response reconciliation,
  retained success, stale/open presentation gating, absent-lifecycle refusal,
  pending retained context, conflict reload, uncertain exact retry,
  unauthorized no-retry behavior, return context, and no-authority language.
- The complete `npm run verify` repository gate passes generated-contract and
  fixture checks, retrieval-floor checks, formatting, lint, TypeScript and
  Python typechecks, the production workbench build, and all repository test
  suites. The build retains the existing non-failing chunk-size advisory.
- Felicity review found and corrected ambiguity between refreshed comparison
  bindings and unchanged candidate or basis records, narrowed the success scope
  to the current Project position and compatible working heads, and completed
  the 409 conflict explanation without weakening its no-success claim.

The focused tests render every presentation state and exercise the typed
transport, but they do not drive the control in a browser. Browser focus,
announcement, keyboard, touch, text-scaling, forced-colors, reduced-motion, and
responsive behavior remain automation boundaries for the cumulative Wave 4
proof.

## Remaining boundary

This slice does not add correction or material-basis revision, Apply, Reject,
explicit separation, member recovery, scheduled validator rerun, a second
profile renderer, multi-member Review, ProjectBriefView, CommunicationPlan,
direct/model-mediated entry convergence, or the cumulative Wave 4 runtime proof.
It does not establish the Wave 4 exit trace. Wave 4 remains open.
