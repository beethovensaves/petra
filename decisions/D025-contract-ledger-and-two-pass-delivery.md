# D025: Contract-ledger execution with two distinct validation passes

- **Status:** Accepted by explicit user instruction on 2026-10-10
- **Scope:** Roadmap and execution synchronization, work selection, functional evidence, critical validation, recovery from repeated failure, and delivery gates
- **Depends on:** D024, D013, D018, D005, D021

## Decision

The readable roadmap and the execution environment describe the same required
functions, prerequisites, criteria, active work, evidence, and remaining work.
They derive from `scripts/frontend-a1-work-inventory.json`. Generated documents
and every configured execution worktree must agree before work starts, passes
are recorded, completion is accepted, or a later wave advances. A stale copy is
a failing prerequisite, not an alternative plan.

Each deliverable uses two passes in this order:

1. **Execution:** implement the selected contract and run its functional,
   integration, and applicable repository tests. Record observable behavior
   against each acceptance criterion, exact inputs and identities, source
   bindings, invocation, output, and limitations.
2. **Critical:** examine the delivered behavior against the user's intended
   outcome. Challenge assumptions, authority, semantic composition, missing
   connections, misleading completion, adverse states, and recovery. Execute
   distinct challenge tests and record findings and dispositions. Repeating
   the execution tests or summarizing their success is insufficient.

A third repair pass is used when findings require changes. Its evidence names
the repaired findings and executes the affected functional and critical checks
against the repaired source. A required failure cannot be waived by making the
repair pass optional. Two consecutive unsuccessful attempts at the same work
boundary stop local retries and require a broad diagnosis of contract,
architecture, dependencies, environment, and verification assumptions before
execution resumes. Diagnosis must identify a changed remedy; resetting an
attempt counter is not a remedy.

## Execution and completion

Only one incomplete work item is active at a time. Its prerequisites must be
complete. Prior partial construction remains retained evidence and is evaluated
when its item becomes eligible; it does not make every item active. A change
that needs another owner or unmet prerequisite returns to the ledger before
that construction proceeds. Newly discovered contractual gaps are recorded
before implementation; material product scope changes retain the user's
authority.

An item is complete only when every criterion has functional evidence and
critical evidence, material findings are resolved, source and contract bindings
remain current, and prerequisites are complete. A rendered component, measured
split, moved control, protocol dependency, model answer, graph, successful
operation, or report file cannot independently establish an integrated
function. Evidence of one domain cannot establish another domain's semantics.

## Required A1 behavior

The copilot organizes normal Q&A, exact task context, typed proposals, required
decisions, and observed results. Model output remains non-authoritative. Its
proposals reach the same authorized commands as direct manipulation. The
Workspace progressively exposes the native material, examination, validation,
and consequence needed for the current task. A graph supplies recorded basis,
dependencies, rivals, obligations, and eligible next actions to that task.

The complete cycle connects inquiry, bounded evidence, native examination,
Review, graph/result updates, assessment, obligations, scoped disposition, and
changed-basis invalidation through the existing ProjectThread, InteractionRun,
Work, command, and retained-history owners. Scientific, writing, and an unrelated
compatible definition use their native registered semantics. A1 does not defer
these connections to broader agency or document Composition.

Browser semantic structure, keyboard, focus, reflow, non-color meaning, motion,
touch, and complete graph-peer actions remain required. Native screen-reader
evaluation remains excluded by the user's existing instruction. The sixteen
supplementary A1 scenario groupings remain optional near the end; verification
of each contracted function is mandatory.

## Release

Legacy Wave 6 execution cannot substitute for the A1 queue. Wave 7 and Wave 8
remain closed until all required A1 work and both validation passes are complete
and the user accepts the exact reviewable candidate. Automated execution never
creates a user acceptance record.
