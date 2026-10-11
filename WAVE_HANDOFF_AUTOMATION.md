# Petra wave handoff automation

D024 and D025 govern current A1 delivery. Use `npm run a1:status`, the generated
`scripts/frontend-a1-execution.md` packet, and the canonical function ledger.
Legacy Wave 6 worker/resume/extend/accept commands fail while A1 is incomplete.
The older packets and evidence plans below describe historical execution; they
cannot reassign current scope or promote the sixteen optional A1 scenarios.

The wave handoff runs two local, non-interactive Codex workers. One worker owns
the backend `main` worktree; the other owns the `design/m1-ux` worktree. They
alternate only after the active worker verifies, commits, pushes, and emits a
structured handoff.

```text
backend slice -> verification -> commit/push -> design handoff
design slice  -> verification -> commit/push -> backend handoff
```

Only one worker may mutate at a time. Runtime state, prompts, structured results,
JSONL event logs, and stderr logs live under `.codex-wave-handoff/`, which is
ignored by Git.

## Prerequisites

- Backend worktree: `/Users/felipe.casadei/vscode/graphRAG/petra` on `main`.
- Design worktree: `/Users/felipe.casadei/vscode/graphRAG/petra-design` on
  `design/m1-ux`.
- Both heads equal their remote tracking refs.
- Backend is clean. Design may contain only the two known untracked image/PDF.
- Node 24 and an authenticated Codex CLI are available.

Run the read-only doctor before the first launch:

```sh
/usr/bin/env PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin npm run wave:doctor -- --wave 4
```

## Start the two workers

In the backend terminal:

```sh
cd /Users/felipe.casadei/vscode/graphRAG/petra
/usr/bin/env PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin npm run wave:backend -- --wave 4
```

In the design terminal:

```sh
cd /Users/felipe.casadei/vscode/graphRAG/petra-design
/usr/bin/env PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin node ../petra/scripts/wave-handoff.mjs worker --role design --wave 4
```

The backend worker initializes a new Wave 4 run when no state exists. Either
terminal may be started first; the design worker waits for initialization. Both
processes exit at the wave gate or a fail-closed stop.

## Inspect or stop

From the backend worktree:

```sh
npm run wave:status -- --wave 4
npm run wave:stop -- --wave 4
```

`wave:stop` refuses to overwrite an active worker. Interrupt the active terminal
first, then record the stop. If a worker exits unexpectedly, inspect
`.codex-wave-handoff/wave-4/runs/` and the status before resuming manually.

## Safety boundary

The coordinator uses `codex exec --approve-for-me`, which routes approvals
through automatic review in the `workspace-write` sandbox, with a strict output
schema. It never uses the dangerous sandbox bypass. Every handoff verifies:

- expected branch and exact counterpart commit;
- no concurrent counterpart change;
- clean allowed worktree state;
- a new coherent commit whenever repository files change, or an explicit
  verified no-change handoff from the unchanged pushed commit;
- local HEAD equality with the remote branch; and
- a structured next boundary, exit assessment, or exact stop reason.

The loop stops for an unresolved product/architecture decision, failed test or
service, authorization or usage limit, unexpected file, branch divergence,
push failure, or merge conflict. It does not silently recover by deleting,
resetting, stashing, or rebasing work.

The current Wave 4 execution packet is
[`scripts/wave-handoff-wave-4.md`](scripts/wave-handoff-wave-4.md). Every future
wave requires its own reviewed packet before it can be initialized.

<!-- A1-SYNC:START -->

## Controlling A1 execution

Binding: `sha256:450fb385f85bfdcc1a251d848b118eddba5f838727843a82418044dfd6e46c46`. 11/90 required items complete; 79 incomplete.

D024 governs the conversational copilot and reactive Workspace. D025 governs synchronized execution and two distinct validation passes. The canonical [function ledger](scripts/frontend-a1-work-inventory.json), [readable implementation ledger](reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md), and [granular execution instructions](scripts/frontend-a1-execution.md) agree before work starts, evidence is recorded, completion is accepted, or another wave proceeds.

Active work: none; select one prerequisite-ready item.

| Stage   | Required behavior                                                          | Complete / required |
| ------- | -------------------------------------------------------------------------- | ------------------- |
| FE-A1.0 | Contract reconciliation and execution control                              | 6 / 6               |
| FE-A1.1 | Copilot shell and interaction design                                       | 0 / 7               |
| FE-A1.2 | Conversational zero/empty Project entry                                    | 0 / 7               |
| FE-A1.3 | Durable grounded conversation and AG-UI                                    | 4 / 18              |
| FE-A1.4 | Reactive Workspace, compositional examination and cyclic graph-guided work | 0 / 23              |
| FE-A1.5 | Progressive inspection and complete authority receipts                     | 0 / 9               |
| FE-A1.6 | Complete migration and operation conformance                               | 1 / 7               |
| FE-A1.7 | Functional verification and explicit user acceptance                       | 0 / 13              |

Select one prerequisite-ready item. Execute every criterion with proper tests; then challenge the delivered behavior in a separate critical pass with distinct tests. Repair findings when needed. Two unsuccessful attempts require broad diagnosis before more local retries. Preserve earlier partial evidence. The sixteen late scenarios are optional; browser semantics are required and native screen-reader evaluation remains excluded. Wave 7/8 stay blocked until all required functions pass and the user accepts the exact candidate.

<!-- A1-SYNC:END -->
