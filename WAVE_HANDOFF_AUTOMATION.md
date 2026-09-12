# Petra wave handoff automation

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
- a new coherent commit for completed work;
- local HEAD equality with the remote branch; and
- a structured next boundary, exit assessment, or exact stop reason.

The loop stops for an unresolved product/architecture decision, failed test or
service, authorization or usage limit, unexpected file, branch divergence,
push failure, or merge conflict. It does not silently recover by deleting,
resetting, stashing, or rebasing work.

The current Wave 4 execution packet is
[`scripts/wave-handoff-wave-4.md`](scripts/wave-handoff-wave-4.md). Every future
wave requires its own reviewed packet before it can be initialized.
