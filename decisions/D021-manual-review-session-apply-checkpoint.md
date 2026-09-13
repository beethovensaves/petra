# D021: Manual ReviewSession Apply checkpoint without ReviewPolicy

- **Status:** Accepted
- **Accepted:** 2026-09-13
- **Scope:** First ReviewSession Apply checkpoint, human Approval, policy applicability, command composition, and uncertain outcomes
- **Depends on:** [D005](D005-trusted-graph-review-and-direct-editing.md), [D013](D013-ag-ui-sdk-interaction-boundary.md), [D015](D015-language-neutral-runtime-contracts.md), [D018](D018-project-definition-and-checkpoint-boundary.md), [D020](D020-read-first-review-member-recovery.md)

## Decision

The first `ReviewSession` Apply checkpoint uses D005's exact human-decision
path. It does not require a `ReviewPolicy`. The authenticated human's explicit
Apply checkpoint authorizes only the displayed exact commitment and supplies
the human decision used by the existing ChangeSet, Approval, and command
owners.

The server must represent the authorization basis as an exact human checkpoint
and represent `ReviewPolicy` as not applicable to this execution. It cannot
invent a policy identity or version, treat the missing policy owner as implicit
permission, or use a display mode, model recommendation, validation result, or
conversation as an Approval.

Petra does not ask the author to approve the same commitment twice. The one
checkpoint composes the existing `SubmitChangeSet`, `RecordApproval`, and
`ApplyChangeSet` sequence with exact identities and current grants. Each owner
retains its own transaction, idempotency, receipt, event, and effect rules.

## Checkpoint binding

The request binds the authenticated Actor and Project; exact ProjectDefinition
and profile; current `ReviewSession` revision, content hash, and lifecycle;
selected inspection member; complete atomic `ChangeSet` revision, content hash,
members, and operations; exact candidates, working relationships, targets,
basis, provenance, validation, snapshot, dependencies, and consequences; the
displayed commitment hash; and the originating task and return context.

The selected member cannot narrow a shared `ChangeSet`. The server rechecks all
bindings, current revisions, validation, atomic membership, Actor, and
capability grants immediately before composing or executing the sequence.
Unsupported profiles and stale, conflicted, incomplete, mismatched, or
unauthorized commitments fail closed.

## Result and recovery

The validated result binds the exact request, Approval, commands, retained
command outcomes, resulting target revisions, events, History references, and
separate projection observations. It preserves independent ChangeSet outcomes
and every unapplied session member. A partial session cannot be reported as
whole success.

Exact retained replay follows the existing command owners' idempotency
contracts. A missing or mismatched result may hide an effect and therefore
cannot establish no effect or retry permission. Petra must reconcile it through
D020's read-only assessment before the author starts another attempt.

Direct and model-mediated presentation resolve to the same server-composed
checkpoint and result. A model may explain or present the checkpoint; it cannot
supply the human decision, Actor, capability, or executable identity.

## Deferred policy path

Delegated or automatic Apply remains unavailable until Petra registers a
versioned `ReviewPolicy` owner and can bind the exact applicable revision,
eligibility evidence, approving Actor, calibration boundary, and current
capability. That later policy path does not weaken or reinterpret the manual
checkpoint.

## Consequences

- Wave 4 can connect an exact manual Apply without fabricating a policy.
- Human and policy authorization remain distinct and inspectable.
- The initial checkpoint cannot silently become delegated automation.
- Existing ChangeSet, Approval, command, event, projection, History, and
  recovery authorities remain canonical.
