# Review Recovery assessment in the frozen workbench

Status: bounded read-only integration; Wave 4 remains open
Date: 2026-09-13
Design starting commit: `0933ddd40366935d74dd65c6fd946bd5f0ec5b39`
Exact backend counterpart: `60c78168714eda46297fb909191473ba542d626a`
Authority: [D020](../decisions/D020-read-first-review-member-recovery.md),
DB17's accepted reconciliation order, and the
[backend assessment report](UX-REQ-012-REVIEW-RECOVERY-ASSESSMENT.md).

## Frozen placement and read boundary

The Review Decision region contains a subordinate **Recovery** disclosure.
**Check status** calls `ReviewRecoveryAssessmentClient.assess` with the loaded
Project, ReviewSession ID, expected revision, and content hash. Selecting a
Review member does not narrow the request or the assessment. This uses the
existing authenticated API transport; no production assessment fixture or
fallback is added.

The disclosure follows the accepted recovery order: exact subject and expected
identity; known coverage and freshness; effect by complete ChangeSet; preserved
state; limitations and safe next step. This is an integration within Review's
existing decision and recovery context, without a new browser route or recovery
workspace. Candidate editing, comparison, return links, and History remain in
their existing places.

Every member's ordinary or exception role, Review outcome, and working-head
freshness appears in text. Every associated ChangeSet retains all member
outcomes, operation count, complete coverage, state, effect classification,
and supplied effect basis. Its complete operations, Approvals, command receipt
observations, and events remain available in textual disclosures. Unbound
members appear separately with their outcomes and no inferred effect.

The thirteen preservation categories retain their verified, unavailable, or
unverified labels, details, exact IDs, and hashes. Assessment identity, producer
and rule versions, read and reconciliation times, canonical source records,
return context, and projection observations are available without truncation.
The text distinguishes the authority snapshot from Review identity and current
or superseded working heads. Local unsent edits and navigation are outside the
server preservation inventory.

## Authority and failure behavior

The browser validator registers the canonical assessment schema and its exact
schema dependencies. The typed client checks the requested identity, hashes,
counts, inventory, freshness, every associated group, all touched members, and
complete operation coverage before presentation. An action list containing
anything fails validation.

The server's `next_step` values become explanations only. No assessment text
creates a retry, apply, reject, resume, or revert control. Applied and rejected
outcomes offer no retry; unknown effects explain reconciliation; stale or
conflicted state refers to the existing refresh or revision owner. Even a
confirmed no-effect observation does not grant a new attempt. Supplied History
compensation assessments retain their exact content and hash in a subordinate
read-only disclosure; History continues to own eligibility and grant checks.

A repeated read clears the prior assessment while pending. Duplicate pending
clicks share one read. Failed, unauthorized, stale, unsupported, incomplete, or
inconsistent reads display no assessment and no inferred effect. The author
can repeat **Check status** or use **Reload Review**, which revalidates the
route read rather than sending the typed Review refresh command.

Changing the exact loaded Review identity, selected member, or command state
remounts the assessment reader and discards late results. Existing command
locks also disable the assessment read. The implementation retains no second
Review, recovery, command, or History ledger.

## Verification and limits

Node 24.20.0 and npm 11.19.0 are used. The focused command is:

```sh
npm test --workspace @petra/workbench -- src/product/review-recovery.test.tsx src/product/review-graph.test.tsx src/product/m1-interface-recovery.test.tsx
```

All 59 focused tests pass, including 29 new recovery tests. They cover the
actual workbench query wrapper and bundled browser validator, exact repeated
GETs, authorization and stale errors, unsupported profile content, mismatched
identity and hashes, forbidden actions, omitted groups, truncated shared-member
and operation coverage, freshness and inventory omissions, pending read
coalescing, late-response invalidation, and removal of a previously successful
assessment after authorization failure. Synthetic presentation cases retain
independent outcomes, a shared ChangeSet, an unbound rejection, History
observations, and unknown or confirmed no-effect classifications.

Rendered-markup checks establish native keyboard-operable disclosure elements,
a named read control, textual meaning, and a focusable live status notice. The
component focuses that notice after a read succeeds or fails. CSS uses wrapping
identities, bounded list indentation, intrinsic sizing, a 44px disclosure target,
and current-color focus outlines; this slice adds no animation. The existing
Review and interface-recovery checks also pass.

These checks do not drive React clicks in a real browser. Actual keyboard and
focus behavior, screen-reader announcements, touch, text scaling, forced colors,
and reduced-motion rendering remain browser evidence boundaries. The synthetic
mixed-outcome cases do not establish new backend effect semantics or a fresh
PostgreSQL exit trace. This design slice changes no persistence or PostgreSQL
behavior; the exact backend report records its PostgreSQL integration evidence.
The complete repository gate for this slice is `npm run verify`; its outcome is
recorded in the handoff.

Felicity review found no material issue in the final report or recovery wording.
The wording keeps assessment completeness distinct from Review completion and
keeps next-step explanations distinct from execution permission. Review is
limited to the implementation and test evidence described here.

Live Apply/Reject integration, a second registered profile, ProjectBriefView,
CommunicationPlan, real model-turn convergence, and the cumulative production
Wave 4 exit proof remain open. This report does not declare Wave 4 complete.
