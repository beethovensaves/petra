# Wave 6 slice 23 — authenticated Review rejection

Date: 2026-09-19

Backend base: `991a276ffea4a32b8c7e005eb277635cedc98aec`

Exact design counterpart: `0a5eb122648ce4854fcc929241d374714cd5e904`

## Bounded result

This slice closes the missing backend owner for `review.reject` without
changing React components, CSS, or browser routes. The authenticated server now
prepares an exact, read-only rejection checkpoint and accepts one human
rejection request through production query and command routes. The server, not
the browser, resolves the human Actor and current `SubmitChangeSet` and
`RecordApproval` grants.

Execution reuses the canonical ChangeSet and Approval owners. It sends exactly
two commands: `SubmitChangeSet`, followed by `RecordApproval` with decision
`rejected`. It never sends `ApplyChangeSet`, never accepts model prose as a
decision, and creates no parallel rejection ledger. The selected member's
complete atomic ChangeSet remains the decision boundary; independent members
retain their own outcomes.

The exact server-composed request is retained with both immutable command
executions. A restart can verify and replay the complete ordered prefix without
duplicating a ChangeSet, Approval, event, or target evidence revision. A
partial or inconsistent prefix returns reconciliation-required rather than
sending a missing suffix. The result composes the canonical D020 assessment: a
rejected Review outcome is distinct from command-effect knowledge, so absence
of Apply continues to report `effect: unknown` rather than inventing
`no_effect`.

The renderer-neutral client validates the checkpoint commitment, exact command
identities, Actor and grants, rejected Approval, event hashes, atomic member
outcomes, and recovery assessment before returning the observation. Migration
V046 adds only the retained checkpoint context and database constraints that
bind its request, command, grant, timestamp, and idempotency identity.

## Operation ledger

`review.reject` now has a production runtime owner in both Wave 6 ledgers. It
remains `unavailable` in the UI-operation inventory because this backend slice
does not alter Design's frozen Review control. The 97-row backend baseline is
now 68 owned, 14 partial, seven missing, and eight intentionally client-owned
operations.

## Verification

- Pinned Node `24.20.0` and npm `11.19.0`.
- Generated contract registry check passes.
- Complete TypeScript, Workbench, and Python type checks pass.
- Disposable PostgreSQL 18 integration applies all 46 Flyway migrations from
  empty state and passes all 168 PostgreSQL tests. The production-route test
  verifies two executed commands, no Apply, unchanged target evidence
  revisions, independent-member preservation, exact retained requests, and
  two-step restart replay with no duplicate records.
- The complete repository verification gate passes.

## Evidence boundary

No frozen evidence-plan scenario is claimed. The real PostgreSQL route and
restart test proves this backend owner, but it does not execute the complete
visible correction, rejection, defer/reopen, refresh, separation, preparation,
Apply, and member-outcome workflow required by
`UX1.6-REVIEW/correct-reject-defer-apply`.

## Next safe boundary

Design can integrate the new checkpoint and command through the existing
Review rejection control, then run one complete guided replay. It must preserve
the server-supplied exact request and D020 `effect: unknown` language and must
not infer authorization, atomic membership, or no-effect status in the client.
