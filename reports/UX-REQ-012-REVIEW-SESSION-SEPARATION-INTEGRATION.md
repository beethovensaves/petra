# UX-REQ-012 frozen ReviewSession member-separation integration

Status: bounded Wave 4 multi-member Review integration complete; member recovery
and the cumulative Wave 4 proof remain open
Date: 2026-09-12
Design boundary: `UX-DESIGN-FREEZE-01`
Backend basis: `624d6a31dbf7af44158fdc0779af7a5013d2de55`

## Result

The frozen product brief already accepts **Separate changes** inside the Review
decision hierarchy. It defines the operation as creating independently
reviewable candidates or ChangeSets without silently splitting a semantic unit.
The production Review detail route now connects that existing control to the
typed `SeparateReviewSessionMember` boundary for an authenticated, exact, open
multi-member ReviewSession. No new product meaning or information-hierarchy
decision was introduced.

The authenticated Project Review 1.2 read now retains every exact member in
server order. A Review-members region exposes the ordinary or exception role,
candidate, validation label, outcome, and member identity for each position.
Selecting a member changes only client-local presentation and opens that
member's complete Current, Candidate, Origin, Basis, Difference, Consequences,
Changes to apply, and Decision hierarchy. It does not group, rank, validate, or
transfer authority between members. The existing single-member Review remains
unchanged and does not show a separation control.

The submitted request contains only a caller-owned command identity and
idempotency key, the exact server-supplied ReviewSession identity, revision,
content hash and open lifecycle, and the exact selected member identity. It
contains no Actor, grant, destination Review identity, candidate content,
validation, decision, ChangeSet, Approval, graph position, or recovery
instruction. Server authority remains responsible for authorization, profile
support, membership, ChangeSet atomicity, and the destination identity.

The browser validator bundle registers the separation receipt and its exact
dependencies. `ReviewSessionSeparationClient.separate` accepts success only
when the receipt, updated source ReviewSession, new single-member ReviewSession,
command and idempotency identities, exact member partition, and shared Review
context all match. A mismatched typed result is rejected before presentation.

## Interaction and retry boundary

**Separate changes** remains in the frozen Decision region and is available
only for an exact open multi-member read. While the command is pending, the
loaded membership stays visible and member selection, lifecycle, refresh,
candidate correction, basis revision, Apply, and Reject controls cannot start a
competing operation. Member selection also pauses while unsent local edits or
an unresolved exact command must be retained, so switching members cannot
silently discard local state.

Network, service, and invalid-response uncertainty retains the complete exact
request. **Retry exact separation** resends the same command, idempotency key,
Review reference, and member identity. Stale Review state and reused command or
idempotency identities require an authenticated Review reload before another
command. Unauthorized, unsupported-profile, incompatible-atomicity, and other
rejections remain distinct and show no membership, validation, decision, or
authority change.

A matching new result links to the exact new ReviewSession and starts an
authenticated reload of the source Review. A retained idempotent result says
that the member was not separated again. Both outcomes state that separation
does not validate, approve, reject, apply, recover a member, grant graph or
domain authority, or establish semantic compatibility.

## Frozen presentation boundary

The member selector uses native buttons with persistent labels, `aria-pressed`
selection state, exact textual identities, and at least the shared minimum
touch target. Keyboard selection returns focus to the selected member after its
detail is remounted. Terminal command outcomes receive focus and use assertive
announcements; pending and matching results use polite status announcements.

The member list uses an auto-fitting grid that collapses to one logical column
on narrow or zoomed layouts. Long candidate and member identities wrap. The
selected state has border and forced-color outline treatment in addition to
color. The implementation adds no animation, and command meaning is available
in text.

This design integration changes no runtime contract, server, persistence,
migration, or backend authority. The exact counterpart's fresh PostgreSQL 18.6
evidence through V040 remains the backend basis.

## Verification

All checks use the pinned Node 24.20.0 and npm 11.19.0 toolchain.

- Focused workbench typecheck passes.
- Focused project-data and Review tests cover complete multi-member mapping,
  client-local ordinary and exception selection, exact compact request shape,
  typed-client delegation, command locking, exact uncertain retry, matching
  partition success, stale, unauthorized, unsupported-profile,
  incompatible-atomicity, retry-mismatch, invalid-response, and no-authority
  language.
- The complete `npm run verify` repository gate passes generated-contract and
  fixture checks, retrieval-floor checks, formatting, lint, TypeScript and
  Python typechecks, the production workbench build, repository test suites,
  and handoff automation. The build retains the existing non-failing chunk-size
  advisory.
- Felicity review replaced a completed-reload claim with accurate in-progress
  wording, broadened the atomicity failure explanation to match all server
  rejection cases, and made graph/domain authority and member-recovery limits
  explicit.

The focused tests render the member hierarchy and material outcome variants,
exercise exact input construction and transport delegation, and instantiate
the bundled schema registry. They do not drive focus, announcements, typing, or
clicks in a real browser. Real-browser keyboard, focus, announcement, touch,
text-scaling, forced-colors, reduced-motion, and responsive behavior remain
automation boundaries for the cumulative Wave 4 proof.

## Remaining boundary

This slice does not add member recovery, dependency-group editing, scheduled
validator reruns, Apply or Reject authority, permitted independent apply, a
second profile renderer, ProjectBriefView, CommunicationPlan,
direct/model-mediated entry convergence, or the cumulative live Wave 4 proof.
It does not establish paired-profile conformance or the Wave 4 exit trace. Wave
4 remains open.
