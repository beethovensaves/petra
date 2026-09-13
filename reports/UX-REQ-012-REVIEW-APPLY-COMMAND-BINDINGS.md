# Review Apply command bindings

Status: bounded command-executor binding; frozen Apply remains unavailable
Date: 2026-09-13
Backend starting commit: `60c78168714eda46297fb909191473ba542d626a`
Exact design counterpart: `e738ec01cebca8e03e00b8f12d9c16be86a0e09e`
Authority: the frozen Review specification in
[the UX brief](PETRA-UX-DESIGN-BRIEF.md), [D020](../decisions/D020-read-first-review-member-recovery.md),
and the existing scientific ChangeSet command owners.

## Finding and bounded change

The existing scientific path supplies exact ChangeSet and Approval commands,
durable command results, domain events, and separate projection observations.
It does **not** yet supply a production ReviewSession Apply request/result
boundary suitable for enabling the frozen control. This slice fixes a smaller
binding defect in the shared executor before that integration proceeds.

`executeReviewDecisionPlan` previously ignored the submission result, checked
only the rejection result's outcome, and checked only `applied` on acceptance.
An executor returning another command's result could therefore advance the
sequence or produce an incorrectly attributed Review outcome.

The executor now captures an immutable plan before its first asynchronous call.
Before sending anything, it checks the complete scientific Claim–ASSERTS
promotion pair, canonical ChangeSet content, submitted ChangeSet, Project,
Approval subject and decision, deciding Actor, and exact Apply ChangeSet and
Approval references. Rejection cannot carry an Apply command. These are
consistency checks; the existing command owner still checks authorization,
current targets, and application eligibility.

Each returned result must match its command identity, ChangeSet, and expected
state. Approval results must name the planned Approval. Apply results must also
name that Approval, both exact operation targets, their next revisions, and the
command's application time. A mismatch stops further commands and returns
`REVIEW_COMMAND_RESULT_MISMATCH`. Its explanation explicitly says a command may
have taken effect and requires canonical reconciliation. It grants no retry
permission and does not classify the effect as absent.

The existing batch owner retains that failed result alongside independent
outcomes. Failure to verify a result is distinct from failure of the underlying
atomic ChangeSet. No recovery action, ledger, persistence schema, History rule,
projection rule, HTTP route, or frozen presentation changes in this slice.

## Existing owners and remaining request boundary

- `buildReviewDecisionCommandPlan` composes the scientific submit, human
  Approval, and Apply envelopes. The plan is command input, not authority.
- `PostgresChangeControlAuthorityRepository.executeCommand` owns current
  capability checks, exact command replay, Approval binding, atomic Claim and
  ASSERTS promotion, events, and outbox persistence.
- `PostgresProjectReviewViewReader` composes Review members, exact ChangeSets,
  Approvals, command/event traces, and projection state. That read does not
  authorize execution.
- `/api/commands/reviews/resolve` and `DurableReviewInterruptCoordinator`
  require an existing registered InteractionRun interrupt. Their request binds
  Project, run, interrupt revision/hash, and ChangeSet revision/hash. They do
  not accept an expected ReviewSession revision/hash or its complete member
  manifest. `PetraInteractionClient.resolveReview` still returns an unvalidated
  generic response object.

Consequently, the existing interrupt route must not be presented as a generic
ReviewSession Apply endpoint. A later bounded backend slice must bind the
structured Review checkpoint to the existing command owners, recheck the exact
session, working revisions, validation and complete ChangeSet membership at
execution, and expose a validated typed result with retained command outcomes.
It must preserve independent partial outcomes and separate projection lag from
command effect. A selected member cannot narrow a shared ChangeSet.

The dependency identified here is concrete: connecting the frozen Apply control
before those bindings exist would require the client to invent missing authority
context. The next design review should retain Apply's unavailable state and
confirm the existing Decision/result placement for that bounded backend handoff.
No new surface or additional approval gesture is proposed.

## Verification and limits

Focused checks use Node 24.20.0 and npm 11.19.0:

```sh
npm test --workspace @petra/core -- test/evidence-review.test.ts test/durable-review-interrupt.test.ts test/change-control.test.ts
```

All 50 focused tests pass. They cover valid accept/reject, correction lineage,
exact replay, stale targets, denied authority, mismatched results at each
command stage, rejection/approval confusion, rebound or incomplete plans,
mutation of caller-owned input during execution, and independent partial
outcomes. The mismatch cases execute the real in-memory command owner before
altering its returned observation: retained effects remain visible, and exact
owner replay neither duplicates events nor advances target revisions twice.

Real PostgreSQL integration passes all 136 tests across 16 files on a fresh
store. Those tests exercise the existing generated-plan and durable-interrupt
paths with this executor. This slice adds no persistence or PostgreSQL schema
changes. The complete `npm run verify` outcome is recorded in the handoff.

Felicity review keeps the command-binding result distinct from a live frozen
Apply integration. Browser interaction, a ReviewSession checkpoint API and
typed client, additional registered profiles, Brief, communication, and the
cumulative Wave 4 exit proof remain open. Wave 4 is not complete.
