import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const backendRoot = resolve(dirname(scriptPath), "..");
const designRoot = resolve(backendRoot, "../petra-design");
const stateBase = join(backendRoot, ".codex-wave-handoff");
const resultSchemaPath = join(
  backendRoot,
  "scripts/wave-handoff-result.schema.json",
);

const roles = {
  backend: {
    root: backendRoot,
    branch: "main",
    remote: "origin/main",
    allowedUntracked: new Set(),
  },
  design: {
    root: designRoot,
    branch: "design/m1-ux",
    remote: "origin/design/m1-ux",
    allowedUntracked: new Set([
      "ChatGPT Image Aug 29, 2026, 04_21_35 PM.png",
      "Claim Form BASIC.pdf",
    ]),
  },
};

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

export function parseArguments(argv) {
  const [command = "help", ...rest] = argv;
  const options = { command, wave: "4", role: undefined, maxSlices: 32 };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    const value = rest[index + 1];
    if (argument === "--wave" && value !== undefined) {
      options.wave = value;
      index += 1;
    } else if (argument === "--role" && value !== undefined) {
      options.role = value;
      index += 1;
    } else if (argument === "--max-slices" && value !== undefined) {
      options.maxSlices = Number.parseInt(value, 10);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  if (!/^\d+$/.test(options.wave)) {
    throw new Error("--wave must be a positive integer.");
  }
  if (
    !Number.isSafeInteger(options.maxSlices) ||
    options.maxSlices < 1 ||
    options.maxSlices > 100
  ) {
    throw new Error("--max-slices must be an integer from 1 through 100.");
  }
  return options;
}

function pinnedEnvironment() {
  const pinnedBin = "/opt/homebrew/opt/node@24/bin";
  const existingPath = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: existingPath.startsWith(`${pinnedBin}:`)
      ? existingPath
      : `${pinnedBin}:${existingPath}`,
  };
}

function run(command, args, cwd, { trim = true } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: pinnedEnvironment(),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}:\n${result.stderr || result.stdout}`,
    );
  }
  return trim ? result.stdout.trim() : result.stdout;
}

function git(root, ...args) {
  return run("git", args, root);
}

export function parsePorcelainZ(output) {
  if (output.length === 0) return [];
  const fields = output.split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.length === 0) continue;
    const status = field.slice(0, 2);
    const path = field.slice(3);
    entries.push({ status, path });
    if (status.includes("R") || status.includes("C")) index += 1;
  }
  return entries;
}

export function unexpectedChanges(entries, allowedUntracked) {
  return entries.filter(
    ({ status, path }) => status !== "??" || !allowedUntracked.has(path),
  );
}

function repositorySnapshot(role) {
  const configuration = roles[role];
  if (!existsSync(configuration.root)) {
    throw new Error(`${role} repository is missing: ${configuration.root}`);
  }
  const branch = git(configuration.root, "rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== configuration.branch) {
    throw new Error(
      `${role} must be on ${configuration.branch}; found ${branch}.`,
    );
  }
  const head = git(configuration.root, "rev-parse", "HEAD");
  const remote = git(configuration.root, "rev-parse", configuration.remote);
  const status = run(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    configuration.root,
    { trim: false },
  );
  const unexpected = unexpectedChanges(
    parsePorcelainZ(status),
    configuration.allowedUntracked,
  );
  return { branch, head, remote, unexpected };
}

function requireCleanAndPushed(role, snapshot) {
  if (snapshot.unexpected.length > 0) {
    const detail = snapshot.unexpected
      .map(({ status, path }) => `${status} ${path}`)
      .join(", ");
    throw new Error(`${role} has unexpected worktree changes: ${detail}`);
  }
  if (snapshot.head !== snapshot.remote) {
    throw new Error(
      `${role} HEAD ${snapshot.head} does not match ${roles[role].remote} ${snapshot.remote}.`,
    );
  }
}

function stateDirectory(wave) {
  return join(stateBase, `wave-${wave}`);
}

function statePath(wave) {
  return join(stateDirectory(wave), "state.json");
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function readState(wave) {
  const path = statePath(wave);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

async function withStateLock(wave, operation) {
  const directory = stateDirectory(wave);
  const lockPath = join(directory, "state.lock");
  mkdirSync(directory, { recursive: true });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      mkdirSync(lockPath);
      try {
        return await operation();
      } finally {
        rmSync(lockPath, { recursive: true });
      }
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let age;
      try {
        age = Date.now() - statSync(lockPath).mtimeMs;
      } catch (statError) {
        if (statError?.code !== "ENOENT") throw statError;
      }
      if (age > 120_000) {
        throw new Error(
          `State lock is older than two minutes: ${lockPath}. Inspect it before recovery.`,
          { cause: error },
        );
      }
      await sleep(100);
    }
  }
  throw new Error(`Could not acquire state lock: ${lockPath}`);
}

function wavePlanPath(wave) {
  return join(backendRoot, `scripts/wave-handoff-wave-${wave}.md`);
}

function planDigest(plan) {
  return `sha256:${createHash("sha256").update(plan).digest("hex")}`;
}

export function initialHandoff(wave, backendCommit, designCommit) {
  return `Resume after backend ${backendCommit} and design ${designCommit}. Review the Wave ${wave} packet and implement exactly the smallest coherent backend-owned slice from the first incomplete item in its default implementation order. Preserve the packet's dependency order, authority boundaries, and role ownership; do not pull later work into this slice. If repository evidence exposes a prerequisite or consequential unresolved architecture choice, stop with needs_user rather than inventing it.`;
}

function createInitialState(wave, maxSlices) {
  const planPath = wavePlanPath(wave);
  if (!existsSync(planPath)) {
    throw new Error(
      `No automation packet exists for Wave ${wave}: ${planPath}`,
    );
  }
  const plan = readFileSync(planPath, "utf8");
  const backend = repositorySnapshot("backend");
  const design = repositorySnapshot("design");
  requireCleanAndPushed("backend", backend);
  requireCleanAndPushed("design", design);
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    wave,
    status: "waiting",
    next_role: "backend",
    slice_count: 0,
    max_slices: maxSlices,
    plan_digest: planDigest(plan),
    commits: { backend: backend.head, design: design.head },
    handoff_prompt: initialHandoff(wave, backend.head, design.head),
    active: null,
    history: [],
    created_at: now,
    updated_at: now,
    stop_reason: "",
  };
}

function processExists(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function validateWorkerResult(result, expected) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Worker result must be an object.");
  }
  if (result.role !== expected.role) {
    throw new Error(
      `Worker returned role ${result.role}; expected ${expected.role}.`,
    );
  }
  if (result.counterpart_commit !== expected.counterpartCommit) {
    throw new Error("Worker returned a different counterpart commit.");
  }
  if (!/^[0-9a-f]{40}$/.test(result.commit ?? "")) {
    throw new Error("Worker result has no full lowercase commit hash.");
  }
  if (
    !["handoff", "wave_complete", "needs_user", "blocked"].includes(
      result.disposition,
    )
  ) {
    throw new Error(`Unsupported worker disposition: ${result.disposition}`);
  }
  if (!Array.isArray(result.verification)) {
    throw new Error("Worker verification must be an array.");
  }
  if (
    result.disposition === "handoff" &&
    result.handoff_prompt.trim().length === 0
  ) {
    throw new Error("A completed slice must provide the counterpart handoff.");
  }
  if (
    result.disposition === "wave_complete" &&
    result.wave_exit_assessment.trim().length === 0
  ) {
    throw new Error("Wave completion requires an exit-gate assessment.");
  }
  if (
    ["needs_user", "blocked"].includes(result.disposition) &&
    result.user_attention.trim().length === 0
  ) {
    throw new Error("A stopped worker must state what needs attention.");
  }
  return result;
}

export function buildWorkerPrompt({
  role,
  wave,
  ownCommit,
  counterpartCommit,
  handoff,
  plan,
}) {
  const roleBoundary =
    role === "backend"
      ? "You own backend runtime contracts, authority, persistence, APIs, typed clients, tests, and implementation reports on main. Do not modify frozen React components, CSS, or browser routes unless the design handoff explicitly authorizes one bounded integration. You may update renderer-neutral typed client code and its tests when required."
      : "You own freeze-conformance reports and, only when the handoff explicitly requests integration, frozen frontend components, routes, fixtures, accessibility, and interaction tests on design/m1-ux. Do not edit backend contracts, server code, persistence, migrations, or backend authority. Leave the known untracked image and PDF untouched.";

  return `You are Petra's unattended ${role} worker for Wave ${wave}.

Current ${role} commit: ${ownCommit}
Exact counterpart commit: ${counterpartCommit}

${roleBoundary}

Process exactly ONE bounded slice. Inspect the repository and the exact counterpart commit before acting. Follow accepted decisions and frozen requirements; this automation packet is coordination guidance only. Do not spawn additional agents. Use the pinned Node 24 toolchain. Preserve unrelated work and never use destructive Git commands.

For a completed slice, run proportionate focused checks, the complete repository verification gate, and real PostgreSQL integration when persistence or PostgreSQL behavior changes. If the slice changes repository files, commit and push the coherent change before responding. If a bounded role-owned review finds no safe repository change, return a handoff from the unchanged clean and pushed commit and say so explicitly; do not fabricate a file change merely to create a commit. Confirm that your HEAD equals its remote tracking branch and that the worktree is clean except for the two explicitly known design assets. Do not continue to a second slice yourself.

If a consequential product, architecture, authority, information-hierarchy, or freeze decision is unresolved, make no partial commit and return needs_user. If a required gate, service, authorization, push, branch, worktree, or usage limit prevents safe completion, return blocked. Never label partial or unverified work complete.

Your final response must be only the JSON object required by the supplied output schema. Use the full 40-character HEAD in commit and the exact supplied counterpart commit in counterpart_commit. For handoff, write a complete next-turn prompt for the other role. For needs_user or blocked, explain the exact intervention in user_attention. Declare wave_complete only under the packet's full exit rule.

COUNTERPART HANDOFF
${handoff}

WAVE ${wave} PACKET
${plan}`;
}

export function validateCommitTransition(
  disposition,
  beforeCommit,
  afterCommit,
) {
  const completed = ["handoff", "wave_complete"].includes(disposition);
  const changed = afterCommit !== beforeCommit;
  if (!completed && changed) {
    throw new Error(`Worker changed or committed work despite ${disposition}.`);
  }
  return changed;
}

function codexExecutable() {
  const preferred = "/opt/homebrew/bin/codex";
  return existsSync(preferred) ? preferred : "codex";
}

export function buildCodexExecArguments({ root, outputPath }) {
  return [
    "exec",
    "--cd",
    root,
    "--approve-for-me",
    "--json",
    "--output-schema",
    resultSchemaPath,
    "--output-last-message",
    outputPath,
    "-",
  ];
}

function eventSummary(line, role) {
  try {
    const event = JSON.parse(line);
    if (event.type === "thread.started") {
      return `[${role}] Codex thread ${event.thread_id} started.`;
    }
    if (event.type === "turn.started") return `[${role}] Slice started.`;
    if (event.type === "turn.completed") {
      return `[${role}] Slice turn completed.`;
    }
    if (event.type === "turn.failed" || event.type === "error") {
      return `[${role}] ${event.type}: ${event.message ?? "unknown error"}`;
    }
    const item = event.item;
    if (event.type === "item.started" && item?.type === "command_execution") {
      const command = String(item.command ?? "command").replaceAll(/\s+/g, " ");
      return `[${role}] Running: ${command.slice(0, 180)}`;
    }
    if (event.type === "item.completed" && item?.type === "agent_message") {
      return `[${role}] ${String(item.text ?? "").slice(0, 500)}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function runCodexWorker({ role, wave, state }) {
  const runDirectory = join(stateDirectory(wave), "runs");
  mkdirSync(runDirectory, { recursive: true });
  const ordinal = String(state.slice_count + 1).padStart(3, "0");
  const runId = `${ordinal}-${role}-${Date.now()}`;
  const outputPath = join(runDirectory, `${runId}.result.json`);
  const jsonlPath = join(runDirectory, `${runId}.events.jsonl`);
  const stderrPath = join(runDirectory, `${runId}.stderr.log`);
  const promptPath = join(runDirectory, `${runId}.prompt.txt`);
  const plan = readFileSync(wavePlanPath(wave), "utf8");
  if (planDigest(plan) !== state.plan_digest) {
    throw new Error("The Wave packet changed after initialization.");
  }
  const otherRole = role === "backend" ? "design" : "backend";
  const prompt = buildWorkerPrompt({
    role,
    wave,
    ownCommit: state.commits[role],
    counterpartCommit: state.commits[otherRole],
    handoff: state.handoff_prompt,
    plan,
  });
  writeFileSync(promptPath, `${prompt}\n`, "utf8");

  const eventLog = createWriteStream(jsonlPath, { flags: "wx" });
  const errorLog = createWriteStream(stderrPath, { flags: "wx" });
  const child = spawn(
    codexExecutable(),
    buildCodexExecArguments({ root: roles[role].root, outputPath }),
    {
      cwd: roles[role].root,
      env: pinnedEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  child.stdin.end(prompt);
  let stdoutBuffer = "";
  child.stdout.on("data", (chunk) => {
    eventLog.write(chunk);
    stdoutBuffer += chunk.toString("utf8");
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const summary = eventSummary(line, role);
      if (summary) process.stdout.write(`${summary}\n`);
    }
  });
  child.stderr.on("data", (chunk) => {
    errorLog.write(chunk);
    process.stderr.write(chunk);
  });

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", resolvePromise);
  });
  eventLog.end();
  errorLog.end();

  if (exitCode !== 0) {
    throw new Error(
      `Codex ${role} worker exited with status ${exitCode}. Logs: ${jsonlPath} and ${stderrPath}`,
    );
  }
  if (!existsSync(outputPath)) {
    throw new Error(`Codex produced no structured result: ${outputPath}`);
  }
  const parsed = JSON.parse(readFileSync(outputPath, "utf8"));
  return {
    result: validateWorkerResult(parsed, {
      role,
      counterpartCommit: state.commits[otherRole],
    }),
    runId,
  };
}

function stateSummary(state) {
  if (!state) return "No handoff state exists.";
  const lines = [
    `Wave ${state.wave}: ${state.status}`,
    `Slices: ${state.slice_count}/${state.max_slices}`,
    `Backend: ${state.commits.backend}`,
    `Design: ${state.commits.design}`,
  ];
  if (state.status === "waiting") lines.push(`Next worker: ${state.next_role}`);
  if (state.active) {
    lines.push(
      `Active: ${state.active.role} pid=${state.active.pid} since ${state.active.started_at}`,
    );
  }
  if (state.stop_reason) lines.push(`Reason: ${state.stop_reason}`);
  const latest = state.history.at(-1);
  if (latest) {
    lines.push(`Last slice: ${latest.role}/${latest.slice_id}`);
    lines.push(latest.summary);
  }
  return lines.join("\n");
}

async function initializeIfNeeded(wave, maxSlices, role) {
  return withStateLock(wave, () => {
    const existing = readState(wave);
    if (existing) return existing;
    if (role !== "backend") return undefined;
    const state = createInitialState(wave, maxSlices);
    writeJsonAtomic(statePath(wave), state);
    process.stdout.write(`[backend] Initialized Wave ${wave} handoff.\n`);
    return state;
  });
}

async function claimTurn(wave, role) {
  return withStateLock(wave, () => {
    const state = readState(wave);
    if (!state || state.status !== "waiting" || state.next_role !== role) {
      return undefined;
    }
    if (state.slice_count >= state.max_slices) {
      state.status = "stopped";
      state.stop_reason = `Maximum slice count ${state.max_slices} reached.`;
      state.updated_at = new Date().toISOString();
      writeJsonAtomic(statePath(wave), state);
      return undefined;
    }
    state.status = "running";
    state.active = {
      role,
      pid: process.pid,
      started_at: new Date().toISOString(),
      expected_commit: state.commits[role],
    };
    state.updated_at = new Date().toISOString();
    writeJsonAtomic(statePath(wave), state);
    return state;
  });
}

async function markFailure(wave, role, error) {
  await withStateLock(wave, () => {
    const state = readState(wave);
    if (!state) return;
    state.status = "blocked";
    state.active = null;
    state.stop_reason = `${role}: ${error.message}`;
    state.updated_at = new Date().toISOString();
    writeJsonAtomic(statePath(wave), state);
  });
}

async function finalizeTurn(wave, role, claimedState, worker) {
  const otherRole = role === "backend" ? "design" : "backend";
  const result = worker.result;
  const own = repositorySnapshot(role);
  const counterpart = repositorySnapshot(otherRole);

  requireCleanAndPushed(role, own);
  requireCleanAndPushed(otherRole, counterpart);
  if (counterpart.head !== claimedState.commits[otherRole]) {
    throw new Error(`${otherRole} changed while ${role} was running.`);
  }
  if (result.commit !== own.head) {
    throw new Error(
      `Worker reported ${result.commit}, but ${role} HEAD is ${own.head}.`,
    );
  }

  const completed = ["handoff", "wave_complete"].includes(result.disposition);
  const commitChanged = validateCommitTransition(
    result.disposition,
    claimedState.commits[role],
    own.head,
  );

  await withStateLock(wave, () => {
    const state = readState(wave);
    if (
      !state ||
      state.status !== "running" ||
      state.active?.pid !== process.pid ||
      state.active?.role !== role
    ) {
      throw new Error("Handoff ownership changed before completion.");
    }
    const timestamp = new Date().toISOString();
    state.active = null;
    state.updated_at = timestamp;
    state.history.push({
      role,
      disposition: result.disposition,
      slice_id: result.slice_id,
      summary: result.summary,
      commit: result.commit,
      counterpart_commit: result.counterpart_commit,
      verification: result.verification,
      next_safe_boundary: result.next_safe_boundary,
      wave_exit_assessment: result.wave_exit_assessment,
      user_attention: result.user_attention,
      commit_changed: commitChanged,
      run_id: worker.runId,
      completed_at: timestamp,
    });

    if (completed) {
      state.commits[role] = own.head;
      state.slice_count += 1;
    }
    if (result.disposition === "handoff") {
      state.status = "waiting";
      state.next_role = otherRole;
      state.handoff_prompt = result.handoff_prompt;
      state.stop_reason = "";
    } else if (result.disposition === "wave_complete") {
      state.status = "complete";
      state.next_role = null;
      state.handoff_prompt = "";
      state.stop_reason = result.wave_exit_assessment;
    } else {
      state.status = result.disposition;
      state.next_role = null;
      state.stop_reason = result.user_attention;
    }
    writeJsonAtomic(statePath(wave), state);
  });
}

async function workerLoop({ role, wave, maxSlices }) {
  if (!roles[role]) throw new Error("--role must be backend or design.");
  let announcedWait = false;

  for (;;) {
    const state = await initializeIfNeeded(wave, maxSlices, role);
    if (!state) {
      if (!announcedWait) {
        process.stdout.write(
          `[${role}] Waiting for the backend worker to initialize Wave ${wave}.\n`,
        );
        announcedWait = true;
      }
      await sleep(5_000);
      continue;
    }

    if (
      ["complete", "blocked", "needs_user", "stopped"].includes(state.status)
    ) {
      process.stdout.write(`${stateSummary(state)}\n`);
      return state.status === "complete" ? 0 : 2;
    }

    if (state.status === "running") {
      if (!processExists(state.active?.pid)) {
        await markFailure(
          wave,
          state.active?.role ?? "unknown",
          new Error(
            "The active worker process disappeared; inspect its run logs.",
          ),
        );
        continue;
      }
      if (!announcedWait) {
        process.stdout.write(
          `[${role}] Waiting for active ${state.active?.role} slice.\n`,
        );
        announcedWait = true;
      }
      await sleep(5_000);
      continue;
    }

    if (state.next_role !== role) {
      if (!announcedWait) {
        process.stdout.write(
          `[${role}] Waiting for ${state.next_role} to complete its slice.\n`,
        );
        announcedWait = true;
      }
      await sleep(5_000);
      continue;
    }

    const claimed = await claimTurn(wave, role);
    if (!claimed) continue;
    announcedWait = false;
    process.stdout.write(
      `[${role}] Claimed slice ${claimed.slice_count + 1}/${claimed.max_slices}.\n`,
    );

    try {
      const own = repositorySnapshot(role);
      const otherRole = role === "backend" ? "design" : "backend";
      const counterpart = repositorySnapshot(otherRole);
      requireCleanAndPushed(role, own);
      requireCleanAndPushed(otherRole, counterpart);
      if (
        own.head !== claimed.commits[role] ||
        counterpart.head !== claimed.commits[otherRole]
      ) {
        throw new Error("Repository heads changed after the turn was claimed.");
      }
      const execution = await runCodexWorker({ role, wave, state: claimed });
      await finalizeTurn(wave, role, claimed, execution);
    } catch (error) {
      await markFailure(wave, role, error);
      process.stderr.write(`[${role}] ${error.stack ?? error.message}\n`);
    }
  }
}

function doctor(wave) {
  if (process.versions.node.split(".")[0] !== "24") {
    throw new Error(`Node 24 is required; found ${process.version}.`);
  }
  if (!existsSync(resultSchemaPath)) {
    throw new Error(`Missing worker result schema: ${resultSchemaPath}`);
  }
  if (!existsSync(wavePlanPath(wave))) {
    throw new Error(`Missing Wave ${wave} packet: ${wavePlanPath(wave)}`);
  }
  const backend = repositorySnapshot("backend");
  const design = repositorySnapshot("design");
  requireCleanAndPushed("backend", backend);
  requireCleanAndPushed("design", design);
  const version = run(codexExecutable(), ["--version"], backendRoot);
  process.stdout.write(
    [
      `Wave ${wave} handoff is ready.`,
      `Codex: ${version}`,
      `Backend: ${backend.head}`,
      `Design: ${design.head}`,
      "Next worker: backend",
    ].join("\n") + "\n",
  );
}

async function stop(wave) {
  await withStateLock(wave, () => {
    const state = readState(wave);
    if (!state) throw new Error(`Wave ${wave} is not initialized.`);
    if (state.status === "running" && processExists(state.active?.pid)) {
      throw new Error(
        `A ${state.active.role} worker is active at pid ${state.active.pid}; interrupt that terminal first.`,
      );
    }
    state.status = "stopped";
    state.active = null;
    state.next_role = null;
    state.stop_reason = "Stopped by the operator.";
    state.updated_at = new Date().toISOString();
    writeJsonAtomic(statePath(wave), state);
  });
  process.stdout.write(`Wave ${wave} handoff stopped.\n`);
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/wave-handoff.mjs worker --role backend|design [--wave 4] [--max-slices 32]
  node scripts/wave-handoff.mjs doctor [--wave 4]
  node scripts/wave-handoff.mjs status [--wave 4]
  node scripts/wave-handoff.mjs stop [--wave 4]

The backend worker initializes missing state. Start one worker in each worktree.
Runtime state and logs are written under .codex-wave-handoff/ and are ignored by Git.
`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.command === "worker") {
    process.exitCode = await workerLoop(options);
  } else if (options.command === "doctor") {
    doctor(options.wave);
  } else if (options.command === "status") {
    process.stdout.write(`${stateSummary(readState(options.wave))}\n`);
  } else if (options.command === "stop") {
    await stop(options.wave);
  } else if (options.command === "help") {
    printHelp();
  } else {
    throw new Error(`Unknown command: ${options.command}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
