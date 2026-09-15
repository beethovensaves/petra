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
import { isDeepStrictEqual } from "node:util";

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

const missingJsonValue = Symbol("missing-json-value");

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value !== missingJsonValue
  );
}

function mergeJsonValue(base, ours, theirs, location) {
  if (isDeepStrictEqual(ours, theirs)) return ours;
  if (isDeepStrictEqual(ours, base)) return theirs;
  if (isDeepStrictEqual(theirs, base)) return ours;

  const objectBase =
    base === missingJsonValue && isPlainObject(ours) && isPlainObject(theirs)
      ? {}
      : base;
  if (
    isPlainObject(objectBase) &&
    isPlainObject(ours) &&
    isPlainObject(theirs)
  ) {
    const result = {};
    const keys = new Set([
      ...Object.keys(objectBase),
      ...Object.keys(ours),
      ...Object.keys(theirs),
    ]);
    for (const key of keys) {
      const merged = mergeJsonValue(
        Object.hasOwn(objectBase, key) ? objectBase[key] : missingJsonValue,
        Object.hasOwn(ours, key) ? ours[key] : missingJsonValue,
        Object.hasOwn(theirs, key) ? theirs[key] : missingJsonValue,
        `${location}.${key}`,
      );
      if (merged !== missingJsonValue) result[key] = merged;
    }
    return result;
  }

  throw new Error(`Competing package.json edits at ${location}.`);
}

export function mergePackageJsonDocuments(baseText, oursText, theirsText) {
  let base;
  let ours;
  let theirs;
  try {
    base = JSON.parse(baseText);
    ours = JSON.parse(oursText);
    theirs = JSON.parse(theirsText);
  } catch (error) {
    throw new Error(
      "Cannot resolve a package.json conflict with invalid JSON.",
      {
        cause: error,
      },
    );
  }
  const merged = mergeJsonValue(base, ours, theirs, "package.json");
  if (!isPlainObject(merged)) {
    throw new Error("The merged package.json root must remain an object.");
  }
  return `${JSON.stringify(merged, null, 2)}\n`;
}

export function isCompatiblePackageJsonConflictSet(conflicted) {
  return conflicted.length === 1 && conflicted[0] === "package.json";
}

export function resolveCompatiblePackageJsonConflict(root) {
  const conflicted = git(root, "diff", "--name-only", "--diff-filter=U")
    .split("\n")
    .filter(Boolean);
  if (!isCompatiblePackageJsonConflictSet(conflicted)) {
    return false;
  }

  const merged = mergePackageJsonDocuments(
    git(root, "show", ":1:package.json"),
    git(root, "show", ":2:package.json"),
    git(root, "show", ":3:package.json"),
  );
  writeFileSync(join(root, "package.json"), merged, "utf8");
  git(root, "add", "package.json");
  const remaining = git(root, "diff", "--name-only", "--diff-filter=U");
  if (remaining.length > 0) {
    throw new Error(`Unresolved merge paths remain: ${remaining}`);
  }
  git(root, "commit", "--no-edit");
  return true;
}

function gitIsAncestor(root, ancestor, descendant) {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    {
      cwd: root,
      encoding: "utf8",
      env: pinnedEnvironment(),
    },
  );
  if (result.error) throw result.error;
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(
    `git merge-base --is-ancestor failed in ${root}:\n${result.stderr || result.stdout}`,
  );
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

export function isRetryableWorkerError(error) {
  const message = String(error?.message ?? error);
  return (
    /^Codex (backend|design) worker exited with status /.test(message) ||
    /^Codex produced no structured result: /.test(message) ||
    message === "The active worker process disappeared; inspect its run logs."
  );
}

export function canRetryUnchangedWorkerFailure(state, snapshots) {
  if (
    !state ||
    state.status !== "running" ||
    !state.active ||
    !Number.isSafeInteger(state.active.attempt) ||
    state.active.attempt >= 3
  ) {
    return false;
  }
  return Object.keys(roles).every((role) => {
    const snapshot = snapshots[role];
    return (
      snapshot &&
      snapshot.unexpected.length === 0 &&
      snapshot.head === snapshot.remote &&
      snapshot.head === state.commits[role]
    );
  });
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

function waveEvidencePlanPath(wave) {
  return join(backendRoot, `scripts/wave-handoff-wave-${wave}.evidence.json`);
}

function planDigest(plan) {
  return `sha256:${createHash("sha256").update(plan).digest("hex")}`;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function evidenceKey(record) {
  return `${record.evidence_id}::${record.scenario_id}`;
}

export function validateEvidencePlan(plan, { wave, maxSlices }) {
  if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("Wave evidence plan must be an object.");
  }
  if (plan.schema_version !== 1 || plan.wave !== String(wave)) {
    throw new Error(
      `Wave ${wave} evidence plan has the wrong version or wave.`,
    );
  }
  if (!Array.isArray(plan.required) || plan.required.length === 0) {
    throw new Error(`Wave ${wave} evidence plan must name required scenarios.`);
  }
  const inventory = plan.inventory_audit;
  if (
    inventory === null ||
    typeof inventory !== "object" ||
    Array.isArray(inventory) ||
    !Number.isSafeInteger(inventory.required_by_completed_slice) ||
    inventory.required_by_completed_slice < 1 ||
    !Number.isSafeInteger(plan.remediation_reserve_slices) ||
    plan.remediation_reserve_slices < 2 ||
    inventory.required_by_completed_slice + plan.remediation_reserve_slices >
      maxSlices
  ) {
    throw new Error(
      `Wave ${wave} evidence plan must reserve at least two slices after its inventory audit.`,
    );
  }

  const requirements = [inventory, ...plan.required];
  const keys = new Set();
  for (const requirement of requirements) {
    if (
      !nonEmptyString(requirement.evidence_id) ||
      !nonEmptyString(requirement.scenario_id) ||
      !nonEmptyString(requirement.description) ||
      !["backend", "design", "either"].includes(requirement.owner)
    ) {
      throw new Error(`Wave ${wave} has an invalid evidence requirement.`);
    }
    const key = evidenceKey(requirement);
    if (keys.has(key)) {
      throw new Error(`Wave ${wave} repeats evidence requirement ${key}.`);
    }
    keys.add(key);
  }
  return plan;
}

function readEvidencePlan(wave, maxSlices) {
  const path = waveEvidencePlanPath(wave);
  if (!existsSync(path)) {
    if (Number.parseInt(wave, 10) >= 5) {
      throw new Error(
        `Wave ${wave} requires a scenario evidence plan before initialization: ${path}`,
      );
    }
    return undefined;
  }
  return validateEvidencePlan(JSON.parse(readFileSync(path, "utf8")), {
    wave,
    maxSlices,
  });
}

function evidenceRequirements(plan) {
  return plan ? [plan.inventory_audit, ...plan.required] : [];
}

export function missingRequiredEvidence(plan, evidence = []) {
  if (!plan) return [];
  const passed = new Set(
    evidence
      .filter((record) => record.status === "passed")
      .map((record) => evidenceKey(record)),
  );
  return evidenceRequirements(plan).filter(
    (requirement) => !passed.has(evidenceKey(requirement)),
  );
}

export function inventoryAuditOverdue(plan, evidence = [], sliceCount) {
  if (!plan || sliceCount < plan.inventory_audit.required_by_completed_slice) {
    return false;
  }
  return missingRequiredEvidence(plan, evidence).some(
    (requirement) =>
      evidenceKey(requirement) === evidenceKey(plan.inventory_audit),
  );
}

export function enforceCompletionDisposition(disposition, plan, evidence = []) {
  return disposition === "wave_complete" &&
    missingRequiredEvidence(plan, evidence).length > 0
    ? "handoff"
    : disposition;
}

function mergeEvidence(existing = [], additions = [], metadata = {}) {
  const merged = new Map(
    existing.map((record) => [evidenceKey(record), record]),
  );
  for (const record of additions) {
    merged.set(evidenceKey(record), { ...record, ...metadata });
  }
  return [...merged.values()];
}

export function initialHandoff(wave, backendCommit, designCommit) {
  return `Resume after backend ${backendCommit} and design ${designCommit}. Review the Wave ${wave} packet and implement exactly the smallest coherent backend-owned slice from the first incomplete item in its default implementation order. Preserve the packet's dependency order, authority boundaries, and role ownership; do not pull later work into this slice. If repository evidence exposes a prerequisite or consequential unresolved architecture choice, stop with needs_user rather than inventing it.`;
}

export function validatePriorWaveState(wave, priorState) {
  const waveNumber = Number.parseInt(wave, 10);
  if (waveNumber <= 3) return;
  const priorWave = String(waveNumber - 1);
  if (
    !priorState ||
    priorState.wave !== priorWave ||
    priorState.status !== "complete"
  ) {
    throw new Error(
      `Wave ${wave} cannot start until Wave ${priorWave} is complete.`,
    );
  }
}

function createInitialState(wave, maxSlices) {
  const planPath = wavePlanPath(wave);
  if (!existsSync(planPath)) {
    throw new Error(
      `No automation packet exists for Wave ${wave}: ${planPath}`,
    );
  }
  const plan = readFileSync(planPath, "utf8");
  const evidencePlan = readEvidencePlan(wave, maxSlices);
  validatePriorWaveState(
    wave,
    readState(String(Number.parseInt(wave, 10) - 1)),
  );
  const backend = repositorySnapshot("backend");
  const design = repositorySnapshot("design");
  requireCleanAndPushed("backend", backend);
  requireCleanAndPushed("design", design);
  const now = new Date().toISOString();
  return {
    schema_version: 2,
    wave,
    status: "waiting",
    next_role: "backend",
    slice_count: 0,
    max_slices: maxSlices,
    plan_digest: planDigest(plan),
    evidence_plan_digest: evidencePlan
      ? planDigest(JSON.stringify(evidencePlan))
      : null,
    evidence: [],
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
  if (!Array.isArray(result.evidence)) {
    throw new Error("Worker evidence must be an array.");
  }
  const evidenceKeys = new Set();
  for (const record of result.evidence) {
    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      !nonEmptyString(record.evidence_id) ||
      !nonEmptyString(record.scenario_id) ||
      record.status !== "passed" ||
      !nonEmptyString(record.command) ||
      !nonEmptyString(record.artifact) ||
      !nonEmptyString(record.boundary)
    ) {
      throw new Error("Worker evidence contains an invalid execution record.");
    }
    const key = evidenceKey(record);
    if (evidenceKeys.has(key)) {
      throw new Error(`Worker evidence repeats ${key}.`);
    }
    evidenceKeys.add(key);
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
  evidencePlan,
  recordedEvidence = [],
}) {
  const roleBoundary =
    role === "backend"
      ? "You own backend runtime contracts, authority, persistence, APIs, typed clients, tests, and implementation reports on main. Do not modify frozen React components, CSS, or browser routes unless the design handoff explicitly authorizes one bounded integration. You may update renderer-neutral typed client code and its tests when required."
      : "You own freeze-conformance reports and, only when the handoff explicitly requests integration, frozen frontend components, routes, fixtures, accessibility, and interaction tests on design/m1-ux. The coordinator merges required backend history into design/m1-ux before your slice. Inherited backend files remain backend-owned; their presence in your branch is not a design edit, and you must not rewrite or revert them. Do not edit backend contracts, server code, persistence, migrations, or backend authority. Leave the known untracked image and PDF untouched.";

  const requirements = evidenceRequirements(evidencePlan);
  const recorded = new Set(
    recordedEvidence.map((record) => evidenceKey(record)),
  );
  const evidenceControl = evidencePlan
    ? `\nEXECUTED EVIDENCE CONTROL\nThe frozen evidence plan requires ${requirements.length} scenario records. ${recorded.size} are currently recorded. The inventory audit is due by completed slice ${evidencePlan.inventory_audit.required_by_completed_slice}, leaving ${evidencePlan.remediation_reserve_slices} remediation slices. A helper, test case, route, fixture, report, or scenario definition that was not invoked is not evidence. Return an evidence entry only for a named scenario actually executed in this slice. Each entry must name its command, retained artifact, and honest boundary. A completion claim is rejected while any required scenario lacks a passed record.\n\nOutstanding records:\n${missingRequiredEvidence(
        evidencePlan,
        recordedEvidence,
      )
        .map(
          (requirement) =>
            `- ${requirement.evidence_id}/${requirement.scenario_id} (${requirement.owner}): ${requirement.description}`,
        )
        .join("\n")}\n`
    : "";

  return `You are Petra's unattended ${role} worker for Wave ${wave}.

Current ${role} commit: ${ownCommit}
Exact counterpart commit: ${counterpartCommit}

${roleBoundary}

Process exactly ONE bounded slice. Inspect the repository and the exact counterpart commit before acting. Follow accepted decisions and frozen requirements; this automation packet is coordination guidance only. Do not spawn additional agents. Use the pinned Node 24 toolchain. Preserve unrelated work and never use destructive Git commands.

For a completed slice, run proportionate focused checks, the complete repository verification gate, and real PostgreSQL integration when persistence or PostgreSQL behavior changes. If the slice changes repository files, commit and push the coherent change before responding. If a bounded role-owned review finds no safe repository change, return a handoff from the unchanged clean and pushed commit and say so explicitly; do not fabricate a file change merely to create a commit. Confirm that your HEAD equals its remote tracking branch and that the worktree is clean except for the two explicitly known design assets. Do not continue to a second slice yourself.

If a consequential product, architecture, authority, information-hierarchy, or freeze decision is unresolved, make no partial commit and return needs_user. If a required gate, service, authorization, push, branch, worktree, or usage limit prevents safe completion, return blocked. Never label partial or unverified work complete.

Your final response must be only the JSON object required by the supplied output schema. Use the full 40-character HEAD in commit and the exact supplied counterpart commit in counterpart_commit. Return evidence as an array; use an empty array when this slice executed no named evidence-plan scenario. For handoff, write a complete next-turn prompt for the other role. For needs_user or blocked, explain the exact intervention in user_attention. Declare wave_complete only under the packet's full exit rule.

${evidenceControl}

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
  const evidencePlan = readEvidencePlan(wave, state.max_slices);
  const evidencePlanDigest = evidencePlan
    ? planDigest(JSON.stringify(evidencePlan))
    : null;
  if (evidencePlanDigest !== (state.evidence_plan_digest ?? null)) {
    throw new Error("The Wave evidence plan changed after initialization.");
  }
  const otherRole = role === "backend" ? "design" : "backend";
  const prompt = buildWorkerPrompt({
    role,
    wave,
    ownCommit: state.commits[role],
    counterpartCommit: state.commits[otherRole],
    handoff: state.handoff_prompt,
    plan,
    evidencePlan,
    recordedEvidence: state.evidence ?? [],
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
  if (state.evidence_plan_digest) {
    const evidencePlan = readEvidencePlan(state.wave, state.max_slices);
    const total = evidenceRequirements(evidencePlan).length;
    const missing = missingRequiredEvidence(evidencePlan, state.evidence ?? []);
    lines.push(`Executed evidence: ${total - missing.length}/${total}`);
  }
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
    const evidencePlan = readEvidencePlan(wave, state.max_slices);
    if (evidencePlan) {
      if (
        inventoryAuditOverdue(evidencePlan, state.evidence, state.slice_count)
      ) {
        state.status = "stopped";
        state.stop_reason =
          `Evidence inventory audit was not recorded by slice ` +
          `${evidencePlan.inventory_audit.required_by_completed_slice}; ` +
          `${evidencePlan.remediation_reserve_slices} remediation slices were reserved.`;
        state.updated_at = new Date().toISOString();
        writeJsonAtomic(statePath(wave), state);
        return undefined;
      }
    }
    if (state.slice_count >= state.max_slices) {
      state.status = "stopped";
      state.stop_reason = `Maximum slice count ${state.max_slices} reached.`;
      state.updated_at = new Date().toISOString();
      writeJsonAtomic(statePath(wave), state);
      return undefined;
    }
    state.status = "running";
    state.retry_attempts ??= {};
    const retryKey = `${state.slice_count + 1}:${role}`;
    const attempt = (state.retry_attempts[retryKey] ?? 0) + 1;
    state.retry_attempts[retryKey] = attempt;
    state.active = {
      role,
      pid: process.pid,
      attempt,
      started_at: new Date().toISOString(),
      expected_commit: state.commits[role],
    };
    state.updated_at = new Date().toISOString();
    writeJsonAtomic(statePath(wave), state);
    return state;
  });
}

async function integrateBackendForDesign(wave, claimedState) {
  const design = repositorySnapshot("design");
  const backend = repositorySnapshot("backend");
  requireCleanAndPushed("design", design);
  requireCleanAndPushed("backend", backend);

  if (
    design.head !== claimedState.commits.design ||
    backend.head !== claimedState.commits.backend
  ) {
    throw new Error("Repository heads changed before design synchronization.");
  }
  if (gitIsAncestor(roles.design.root, backend.head, design.head)) {
    return claimedState;
  }

  process.stdout.write(
    `[design] Integrating backend ${backend.head} before the design slice.\n`,
  );
  try {
    git(
      roles.design.root,
      "merge",
      "--no-ff",
      backend.head,
      "-m",
      `chore: integrate wave ${wave} backend for design`,
    );
  } catch (error) {
    const mergeHead = spawnSync(
      "git",
      ["rev-parse", "--verify", "-q", "MERGE_HEAD"],
      {
        cwd: roles.design.root,
        encoding: "utf8",
        env: pinnedEnvironment(),
      },
    );
    if (mergeHead.status === 0) {
      try {
        if (resolveCompatiblePackageJsonConflict(roles.design.root)) {
          process.stdout.write(
            "[design] Resolved compatible package.json additions with a strict three-way merge.\n",
          );
        } else {
          throw new Error(
            "The merge includes conflicts outside the supported package.json boundary.",
            { cause: error },
          );
        }
      } catch (resolutionError) {
        git(roles.design.root, "merge", "--abort");
        throw new Error(
          `Design synchronization with backend ${backend.head} failed: ${error.message}\nAutomatic package resolution was unavailable: ${resolutionError.message}`,
          { cause: resolutionError },
        );
      }
    } else {
      throw new Error(
        `Design synchronization with backend ${backend.head} failed before a merge was created: ${error.message}`,
        { cause: error },
      );
    }
  }

  git(
    roles.design.root,
    "push",
    "origin",
    `HEAD:refs/heads/${roles.design.branch}`,
  );
  const integrated = repositorySnapshot("design");
  requireCleanAndPushed("design", integrated);
  if (!gitIsAncestor(roles.design.root, backend.head, integrated.head)) {
    throw new Error(
      "Design synchronization did not contain the backend commit.",
    );
  }

  return withStateLock(wave, () => {
    const state = readState(wave);
    if (
      !state ||
      state.status !== "running" ||
      state.active?.pid !== process.pid ||
      state.active?.role !== "design" ||
      state.commits.design !== claimedState.commits.design ||
      state.commits.backend !== claimedState.commits.backend
    ) {
      throw new Error(
        "Handoff ownership changed during design synchronization.",
      );
    }
    const timestamp = new Date().toISOString();
    state.commits.design = integrated.head;
    state.active.expected_commit = integrated.head;
    state.updated_at = timestamp;
    state.integrations ??= [];
    state.integrations.push({
      role: "design",
      commit: integrated.head,
      counterpart_commit: backend.head,
      completed_at: timestamp,
    });
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

async function retryUnchangedWorkerFailure(wave, error) {
  let snapshots;
  try {
    snapshots = {
      backend: repositorySnapshot("backend"),
      design: repositorySnapshot("design"),
    };
  } catch {
    return false;
  }

  return withStateLock(wave, () => {
    const state = readState(wave);
    if (!canRetryUnchangedWorkerFailure(state, snapshots)) return false;
    const timestamp = new Date().toISOString();
    const failed = state.active;
    state.status = "waiting";
    state.next_role = failed.role;
    state.active = null;
    state.stop_reason = "";
    state.updated_at = timestamp;
    state.transient_failures ??= [];
    state.transient_failures.push({
      role: failed.role,
      slice: state.slice_count + 1,
      attempt: failed.attempt,
      error: String(error?.message ?? error),
      recovered_at: timestamp,
    });
    writeJsonAtomic(statePath(wave), state);
    return true;
  });
}

async function finalizeTurn(wave, role, claimedState, worker) {
  const otherRole = role === "backend" ? "design" : "backend";
  const result = worker.result;
  const evidencePlan = readEvidencePlan(wave, claimedState.max_slices);
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

  if (evidencePlan) {
    const requirements = new Map(
      evidenceRequirements(evidencePlan).map((requirement) => [
        evidenceKey(requirement),
        requirement,
      ]),
    );
    for (const record of result.evidence) {
      const requirement = requirements.get(evidenceKey(record));
      if (!requirement) {
        throw new Error(
          `Worker reported unplanned evidence ${evidenceKey(record)}.`,
        );
      }
      if (requirement.owner !== "either" && requirement.owner !== role) {
        throw new Error(
          `${role} cannot satisfy ${evidenceKey(record)} owned by ${requirement.owner}.`,
        );
      }
    }
  } else if (result.evidence.length > 0) {
    throw new Error("Worker reported evidence without a frozen evidence plan.");
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
    state.evidence = mergeEvidence(state.evidence, result.evidence, {
      role,
      commit: result.commit,
      run_id: worker.runId,
      completed_at: timestamp,
    });
    const missingEvidence = missingRequiredEvidence(
      evidencePlan,
      state.evidence,
    );
    const disposition = enforceCompletionDisposition(
      result.disposition,
      evidencePlan,
      state.evidence,
    );
    const completionRejected = disposition !== result.disposition;
    const evidenceRejection = completionRejected
      ? `Coordinator rejected wave completion; missing executed evidence: ${missingEvidence
          .map((requirement) => evidenceKey(requirement))
          .join(", ")}.`
      : "";
    state.active = null;
    state.updated_at = timestamp;
    state.history.push({
      role,
      disposition,
      requested_disposition: result.disposition,
      slice_id: result.slice_id,
      summary: result.summary,
      commit: result.commit,
      counterpart_commit: result.counterpart_commit,
      verification: result.verification,
      next_safe_boundary: result.next_safe_boundary,
      wave_exit_assessment: evidenceRejection
        ? `${result.wave_exit_assessment} ${evidenceRejection}`.trim()
        : result.wave_exit_assessment,
      user_attention: result.user_attention,
      commit_changed: commitChanged,
      run_id: worker.runId,
      completed_at: timestamp,
    });

    if (completed) {
      state.commits[role] = own.head;
      state.slice_count += 1;
      if (state.retry_attempts) {
        delete state.retry_attempts[`${state.slice_count}:${role}`];
      }
    }
    if (disposition === "handoff") {
      state.status = "waiting";
      state.next_role = otherRole;
      state.handoff_prompt = completionRejected
        ? `${evidenceRejection} Execute only the outstanding frozen evidence-plan scenarios, then repeat the role-owned closure audit.`
        : result.handoff_prompt;
      state.stop_reason = "";
    } else if (disposition === "wave_complete") {
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
        const error = new Error(
          "The active worker process disappeared; inspect its run logs.",
        );
        const recovered = await retryUnchangedWorkerFailure(wave, error);
        if (!recovered) {
          await markFailure(wave, state.active?.role ?? "unknown", error);
        }
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

    let claimed = await claimTurn(wave, role);
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
      if (role === "design") {
        claimed = await integrateBackendForDesign(wave, claimed);
      }
      const execution = await runCodexWorker({ role, wave, state: claimed });
      await finalizeTurn(wave, role, claimed, execution);
    } catch (error) {
      const recovered =
        isRetryableWorkerError(error) &&
        (await retryUnchangedWorkerFailure(wave, error));
      if (recovered) {
        process.stderr.write(
          `[${role}] Transient unchanged worker failure; retrying the same slice. ${error.message}\n`,
        );
        await sleep(2_000);
      } else {
        await markFailure(wave, role, error);
        process.stderr.write(`[${role}] ${error.stack ?? error.message}\n`);
      }
    }
  }
}

function doctor(wave, maxSlices) {
  if (process.versions.node.split(".")[0] !== "24") {
    throw new Error(`Node 24 is required; found ${process.version}.`);
  }
  if (!existsSync(resultSchemaPath)) {
    throw new Error(`Missing worker result schema: ${resultSchemaPath}`);
  }
  if (!existsSync(wavePlanPath(wave))) {
    throw new Error(`Missing Wave ${wave} packet: ${wavePlanPath(wave)}`);
  }
  const state = readState(wave);
  validatePriorWaveState(
    wave,
    readState(String(Number.parseInt(wave, 10) - 1)),
  );
  const evidencePlan = readEvidencePlan(wave, state?.max_slices ?? maxSlices);
  if (state && evidencePlan) {
    const digest = planDigest(JSON.stringify(evidencePlan));
    if (digest !== state.evidence_plan_digest) {
      throw new Error("The Wave evidence plan differs from initialized state.");
    }
  }
  const backend = repositorySnapshot("backend");
  const design = repositorySnapshot("design");
  requireCleanAndPushed("backend", backend);
  requireCleanAndPushed("design", design);
  const version = run(codexExecutable(), ["--version"], backendRoot);
  const nextWorker =
    state?.status === "waiting"
      ? state.next_role
      : state
        ? `none (${state.status})`
        : "backend";
  process.stdout.write(
    [
      `Wave ${wave} handoff is ready.`,
      `Codex: ${version}`,
      `Backend: ${backend.head}`,
      `Design: ${design.head}`,
      `Next worker: ${nextWorker}`,
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
    doctor(options.wave, options.maxSlices);
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
