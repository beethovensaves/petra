# D020: Read-first Review member recovery with ChangeSet atomicity

- **Status:** Accepted
- **Accepted:** 2026-09-12
- **Scope:** Review-member recovery assessment, effect reconciliation, preservation, atomic manifests, and action eligibility
- **Depends on:** [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D013](D013-ag-ui-sdk-interaction-boundary.md), [D015](D015-language-neutral-runtime-contracts.md), [D018](D018-project-definition-and-checkpoint-boundary.md)

## Decision

A Review member is one proposed change inside a `ReviewSession`. It has a
stable member identity and binds an exact candidate revision, its origin,
basis, provenance, validation, difference, consequences, outcome, and
associated `ChangeSet`.

The member is the unit the author inspects and understands. The `ChangeSet` is
the unit Petra applies or reverses atomically. Members that share one
`ChangeSet` cannot be recovered, retried, or represented as applied
individually.

Review-member recovery has two stages:

1. Petra performs a read-only canonical reconciliation and returns a versioned
   `RecoveryAssessment` with an exact per-member and per-`ChangeSet` manifest.
2. The author may later select an eligible action already owned by a typed
   query or command. That owner rechecks current authority and state before it
   executes.

The assessment never decides, validates, approves, rejects, applies, reverts,
projects, or otherwise mutates a member. It does not synthesize a generic
recovery command, accept model advice as eligibility, or create a second
command, event, receipt, Review, or recovery ledger.

## Canonical assessment

The authenticated server composes one immutable, snapshot-consistent assessment from
canonical Project, `ReviewSession`, candidate, `ChangeSet`, Approval, command,
event, receipt, and projection records. The result carries a stable assessment
ID and hash; producer and rule versions; reconciliation and observation times;
exact Project, Review revision and content hash, member, candidate, and
`ChangeSet` identities; source-record references; freshness, coverage, and
privacy outcomes; and the originating task and return context.

Review outcome and effect knowledge remain separate. The assessment records
what the Review says about each member and what canonical execution evidence
establishes. It also returns a preservation inventory for retained candidate,
basis, validation, Approval, command, receipt, prior authority, projection,
task, and return state, including unavailable or unverified items.

The atomic manifest groups every assessed member by its exact `ChangeSet`,
states counts and coverage in explicit units, and exposes unknowns. It cannot
describe a single `ChangeSet` as partly applied. If the canonical evidence does
not support a complete classification, the assessment reports the uncertainty
instead of inferring an outcome from a timeout, absent projection, old client
state, or model statement.

The existing Project History recovery assessment remains the narrow owner for
applied scientific ChangeSet compensation eligibility. The Review-member
assessment references or composes that read where applicable; it does not copy
its compensation rules, grant checks, or History facts into a new authority.

## Outcome and action rules

- An applied member is never retried. The assessment may offer inspection or a
  separately governed `Revert` action when its owner says that action is
  eligible.
- A rejected member is never retried. A changed proposal creates a new
  candidate revision and follows the ordinary Review path.
- An awaiting or otherwise unapplied member returns to Review. Apply and Reject
  remain separate authorities.
- A failed member may expose a retry descriptor only when canonical records
  confirm no effect and the owning idempotency contract proves the retry safe.
- A stale or conflicted member must refresh or revise through its typed owner
  before Petra reassesses it.
- A pending or in-progress member offers status reconciliation only.
- An unknown or unavailable outcome offers another reconciliation read and no
  mutation.

Action descriptors come only from registered owning contracts. Each descriptor
binds the exact target and expected revision, eligibility evidence and time,
Actor and capability policy, idempotency or new-attempt identity, input reuse,
consequences, authority and History effects, and success and failure return
contexts. Selection does not preserve eligibility: the owning operation must
recheck it immediately before execution.

Direct and model-mediated presentation resolve the same assessment and action
descriptors. Neither path can add an action or supply authority absent from the
canonical response.

## First implementation boundary

Wave 4 implements the read-only assessment and atomic manifest for the current
scientific Review profile. The assessment may return no eligible action when
the accepted owners cannot prove one. It exposes no general redelivery, retry,
resume, apply, reject, or revert command.

Broader cross-module recovery and execution remain later work. A later slice
may expose execution only through an existing typed owner or a separately
accepted command contract with exact identity, authority, idempotency, and
effect semantics.

## Failure behavior

Authentication, Project or profile mismatch, stale expected Review identity,
inconsistent hashes, incomplete atomic grouping, corrupt canonical evidence,
and unsupported subjects fail closed. Transient projection lag remains
distinct from the command effect. Client-held state is identified as a client
assertion until an owning command acknowledges its exact content.

## Consequences

- The author can learn what happened before choosing another state-changing
  operation.
- Mixed Review results remain legible without weakening `ChangeSet` atomicity.
- The browser and models can present server-supplied recovery facts but cannot
  calculate effect, eligibility, or authority.
- Recovery reuses the existing histories and typed operations instead of
  creating a universal recovery subsystem.
- Wave 4 can establish truthful scientific member reconciliation while the
  broader `UX-REQ-023` recovery family remains scheduled for Wave 6.

## Reconsider when

Revisit this decision if an accepted use case requires partial application of
one `ChangeSet`, recovery across a composite with no stable member identity, or
an owning operation whose effect cannot be reconciled from durable canonical
records. Such a change requires a new authority decision; it cannot be added as
presentation behavior.
