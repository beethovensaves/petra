# D019: Command-granular ProjectSource replacement retraction

- **Status:** Accepted
- **Accepted:** 2026-09-10
- **Scope:** ProjectSource replacement effectiveness, immutable compensation, current graph traversal, and quick-recovery ordering
- **Depends on:** [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D015](D015-language-neutral-runtime-contracts.md), [D018](D018-project-definition-and-checkpoint-boundary.md)

## Decision

Undoing a ProjectSource replacement retracts only that exact effective
supersession relationship. It does not delete or mutate the replacement, restore
the excluded predecessor, exclude the successor, rebind either source identity,
or rewrite dependent history.

Restoring the predecessor remains a separate governed `RestoreProjectSource`
step. In quick recovery, relation retraction is therefore one undo and source
restoration is the next independent undo. Each has its own authorization,
expected-state check, receipt, event, and retained history.

Replacement and retraction records are immutable authority. A small derived head
identifies the latest relation for a predecessor and whether it is active or
retracted. Current graph and semantic-location traversal follow active heads
only. Exact historical lookup continues to return every retained replacement
and retraction.

At most one replacement relation for a predecessor may be active. After its
current relation is retracted, a new immutable replacement may become the active
head. The old edge and its retraction remain inspectable and cannot be
reactivated by mutation.

## Persistence and concurrency

PostgreSQL serializes replacement and retraction for the same predecessor.
Database triggers advance the head only when immutable records pass their exact
Project, source, receipt, Actor, revision, content-hash, and record-hash
constraints. The head is rejected if it disagrees with immutable history.

The head is a reconstructable current-state index, not a second history ledger.
Neo4j remains a rebuildable graph projection and never decides whether a
replacement is effective.

## Governed command boundary

The persistence foundation does not make raw registration a public operation.
Public creation and retraction must use typed Project commands with exact Actor
and capability-grant authority, idempotency, immutable events and receipts, and
registered outbox intent in one transaction. Request bodies cannot supply or
override authority identity.

## Options considered

### Restore the predecessor automatically

Rejected. Replacement and source status are two separately authorized facts.
Combining them would hide an additional state change and make the quick-recovery
sequence ambiguous.

### Delete or mutate the replacement edge

Rejected. That would erase why the graph previously resolved through the
successor and would weaken checkpoints, provenance, replay, and audit.

### Keep every replacement effective

Rejected. Historical edges are necessary, but following all of them would make
the current graph fork after a corrected replacement.

## Consequences

- Undo remains atomic at the user-command level.
- The current graph can stop following an erroneous relation immediately while
  preserving both source statuses.
- A corrected successor can be registered without overwriting prior history.
- Historical and current graph questions require distinct reads.
- Governed command/event/receipt vocabulary is still required before this
  compensation is exposed through the API or frozen workbench.
