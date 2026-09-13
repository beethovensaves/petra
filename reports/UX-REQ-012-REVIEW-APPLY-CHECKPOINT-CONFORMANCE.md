# Review Apply checkpoint: frozen placement and required bindings

Status: bounded design review; Apply remains unavailable
Date: 2026-09-13
Design starting commit: `e738ec01cebca8e03e00b8f12d9c16be86a0e09e`
Exact backend counterpart: `bffe13b6ce698b5f55f79a6dee9d34750d2f27a2`
Authority: accepted DB09 in the [UX brief](PETRA-UX-DESIGN-BRIEF.md),
[`UX-REQ-012`](UX-BACKEND-HANDOFF.md#ux-req-012--profile-neutral-review-session-read-and-command-composition),
and [D020](../decisions/D020-read-first-review-member-recovery.md).

## Conformance finding

The frozen Review hierarchy accommodates a ReviewSession Apply checkpoint and
its result. No new surface, browser route, approval gesture, or recovery authority is
needed. Apply remains unavailable until the backend supplies the exact typed
checkpoint boundary described below. This slice changes only this report.

The inspected counterpart's `executeReviewDecisionPlan` captures the plan before
asynchronous execution, checks its scientific promotion ChangeSet and Approval
bindings, and checks returned command identities, outcomes, targets, and resulting
revisions. A result mismatch stops the sequence and requires reconciliation;
it does not establish that the command had no effect.

The counterpart's `reports/UX-REQ-012-REVIEW-APPLY-COMMAND-BINDINGS.md` accurately
limits that change to the executor. Inspection of `apps/server/src/app.ts`,
`packages/core/src/durable-review-interrupt.ts`, and
`packages/adapters/src/ag-ui.ts` confirms that `/api/commands/reviews/resolve`
requires a registered InteractionRun interrupt and that `resolveReview` returns
a generic response object. That route cannot supply generic ReviewSession Apply
by substituting a session ID for an interrupt or inventing a run binding.

## Frozen placement

`apps/workbench/src/product/ReviewSurface.tsx` keeps Current, Candidate, Origin,
Basis, Difference, and Consequences before Changes to apply and Decision.
The Decision region contains the unavailable Apply and Reject controls,
existing lifecycle commands and their result notices, subordinate Recovery,
and the originating-task return link. The subsequent integration belongs in
this same region and must preserve these relationships:

| Existing position | Required checkpoint/result mapping |
| --- | --- |
| Changes to apply | Show the exact server-composed preview and its complete operations, protected state, material validation, consequences, and atomic boundary. A selected member is an inspection context; it cannot narrow a shared ChangeSet. |
| Decision control | One explicit Apply action binds the displayed exact commitment and records the distinct submit, Approval, and Apply facts through their existing owners. Do not add an ordinary second Approve gesture. |
| Decision result | Present the matching command outcome and retained evidence here. Preserve every applied, rejected, failed, and unapplied member, grouped by complete ChangeSet. A partial session result cannot become whole-session success. |
| Projection observation | Keep command effect and projection state distinct. Use the accepted **Applied—updating views** state only when canonical application is established and the projection is behind. Projection lag does not authorize resubmission. |
| Recovery disclosure | Retain the read-only assessment, complete atomic manifest, preservation inventory, and empty action list. Unknown effect calls for reconciliation; confirmed no effect alone grants no retry. |
| Return and History | Preserve exact originating task and return context. Existing History remains the owner of command/event facts and compensation eligibility. Navigation and disclosure stay client-local. |

These are requirements for a later integration, not evidence that an Apply
result is already rendered live. Existing command-specific retry controls
cannot be reused for Apply without its owning idempotency contract.

## Bounded backend request

Implement the smallest authenticated, versioned ReviewSession Apply checkpoint
API and validated renderer-neutral client over the existing scientific command
owners. Preserve the registered interrupt protocol. Do not modify frozen
components, routes, CSS, or presentation fixtures in that backend slice.

1. Bind the Project, exact registered ProjectDefinition/profile, ReviewSession
   revision and content hash, lifecycle, and originating thread/task and return
   context. Preserve applicable Work, run, producer, Actor, snapshot, basis,
   provenance, and lineage references from canonical records.
2. Bind exact member, WorkingCandidate, WorkingRelationship, target, basis,
   validation, rule, policy, and dependency revisions. Recheck current state and
   commitment readiness at execution. Stale, conflicted, unvalidated, unsupported,
   or mismatched inputs fail closed; client selection or a passed validation
   label cannot establish eligibility.
3. Bind each exact ChangeSet revision/hash and its complete member/operation
   manifest to the displayed preview. One ChangeSet executes atomically. A
   bounded first path may apply one complete eligible ChangeSet while retaining
   all other session members and outcomes; it must disclose that scope and
   cannot split a shared ChangeSet or silently claim the whole Review completed.
4. Resolve the authenticated Actor, capabilities, policy, Approval, and command
   envelopes on the server using existing owners. Treat the checkpoint as exact
   human command input. Conversation, model output, Work completion, and client
   state confer no authority; direct and model-mediated presentation must bind
   the same checkpoint identities.
5. Return a validated result bound to the exact request and resulting canonical
   identities. Retain submit, Approval, Apply, event, and member outcomes through
   existing records, including a retained prefix when later execution fails.
   Distinguish new execution, exact retained replay, failed execution, unattempted
   work, and an unverifiable observation. A mismatched result may hide an effect;
   preserve that uncertainty and reconcile before any new attempt.
6. Return projection observations separately from command effects, with exact
   authority/projection positions and canonical History references where
   available. Reload the authenticated Review through its existing query after
   a verified result. Do not create another decision, command, result, recovery,
   History, or projection ledger.

The backend handoff must identify the typed request/result schemas, client,
current-state checks, and exact replay/reconciliation behavior before requesting
frontend integration. If existing owners cannot express a required authority or
atomicity rule, stop for the accepted decision process instead of synthesizing
one in the client.

## Verification and limits

Using Node 24.20.0 and npm 11.19.0, all 59 existing focused tests pass:

```sh
npm test --workspace @petra/workbench -- src/product/review-recovery.test.tsx src/product/review-graph.test.tsx src/product/m1-interface-recovery.test.tsx
```

They exercise the existing read-only Recovery client/validator and rendering,
complete shared-ChangeSet coverage, forbidden actions, stale and unauthorized
reads, unsupported content, mismatched identities, repeated reads, retained
independent outcomes, and the existing Review/interface-recovery presentation.
They do not exercise a ReviewSession Apply API, which remains absent. The
complete repository gate is `npm run verify`; its outcome is recorded in the
handoff. No persistence or PostgreSQL behavior changes in this report-only slice.
The counterpart's executor and PostgreSQL test counts remain backend-reported
evidence, not tests rerun against the design branch.

The next backend slice must prove exact success, stale and mismatched Review,
working and validation bindings, denied authority, unsupported profiles,
incomplete shared-ChangeSet membership, exact replay without duplicate effects,
retained execution prefixes, independent partial outcomes, and projection lag.
Real PostgreSQL integration is required if that slice changes persistence or
PostgreSQL behavior, alongside focused checks and the complete gate.

Felicity review found no material writing issue in the counterpart report or
this conformance report within the inspected code and stated evidence limits.
No browser interaction or new accessibility evidence is claimed. Live Apply,
paired-profile conformance, Brief, communication, and the cumulative production
exit proof remain open. Wave 4 is not complete.
