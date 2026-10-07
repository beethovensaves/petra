import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { assertFrontendA1Complete } from "./audit-frontend-a1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const backendRoot = resolve(dirname(scriptPath), "..");

export function assertDeliveryWavePrerequisites(
  wave,
  command,
  root = backendRoot,
) {
  if (
    Number.parseInt(wave, 10) >= 7 &&
    ["worker", "resume", "extend", "accept"].includes(command)
  ) {
    assertFrontendA1Complete(root);
  }
}

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

const wave6ClosureBundles = [
  {
    id: "actions-feedback",
    title: "Suggested actions and feedback",
    operationIds: [
      "brief.suggested-preview",
      "brief.suggested-invoke",
      "petra.preview-action",
      "petra.invoke-action",
      "feedback.confirm",
      "feedback.retry",
      "feedback.dismiss",
      "feedback.return",
    ],
    evidenceKeys: ["UX1.6-ACTIONS::suggested-action-interrupt-review"],
  },
  {
    id: "sources",
    title: "Source discovery and lifecycle",
    operationIds: [
      "source.find",
      "source.open",
      "source.register",
      "source.reuse",
      "source.start-processing",
      "source.inspect-processing",
      "source.inspect-exact",
      "source.add-revision",
      "source.remove-project-link",
      "source.delete-local-copy",
    ],
    evidenceKeys: ["UX1.6-SOURCES::register-process-inspect-replace"],
  },
  {
    id: "graph-details",
    title: "Graph, exact Details, source basis, and task return",
    operationIds: [
      "graph.open",
      "graph.return",
      "graph.layer-position",
      "graph.select",
      "graph.open-details",
      "graph.open-source",
      "graph.expand",
      "graph.filter",
      "graph.save-question",
      "graph.compare",
      "graph.impact",
      "graph.time",
      "graph.correct-through-review",
      "details.open",
      "details.return",
    ],
    evidenceKeys: ["UX1.6-GRAPH::task-graph-details-return"],
  },
  {
    id: "history-recovery",
    title: "History, impact, recovery, and governed Revert",
    operationIds: [
      "brief.recent-decisions",
      "history.list",
      "history.filter",
      "history.open",
      "history.compare",
      "history.impact",
      "history.preview-revert",
      "history.execute-revert",
    ],
    evidenceKeys: ["UX1.6-HISTORY::effect-recovery-revert-return"],
  },
  {
    id: "work-petra-model",
    title: "Work, Petra, and certified-model task flow",
    operationIds: [
      "work.list",
      "work.open",
      "work.start",
      "work.answer-input",
      "work.steer",
      "work.prioritize",
      "work.detach",
      "work.reconnect",
      "work.replay",
      "work.cancel",
      "work.retry",
      "work.resume",
      "work.start-again",
      "work.open-result",
      "petra.open",
      "petra.resume-thread",
      "petra.ask",
      "petra.inspect-context",
      "petra.inspect-references",
      "model.inspect-readiness",
      "model.use",
    ],
    evidenceKeys: [],
  },
  {
    id: "taxonomy-guide-reset",
    title: "Registered taxonomy, Project map, guide, and reset",
    operationIds: [
      "shell.project-map",
      "taxonomy.inspect-profile",
      "taxonomy.bind-project",
      "application.guide",
      "application.reset",
    ],
    evidenceKeys: [
      "USER-TESTABLE-01::stable-url-clean-start-reset",
      "UX1.6-TAXONOMY::usable-profile-ui",
    ],
  },
  {
    id: "personal-settings",
    title: "Personal settings and scoped reset",
    operationIds: ["settings.personal-change", "settings.personal-reset"],
    evidenceKeys: [],
  },
];

function operationIsIncomplete(operation) {
  return (
    operation?.current_state !== "live" ||
    !nonEmptyString(operation?.runtime_owner) ||
    !Array.isArray(operation?.evidence) ||
    operation.evidence.length === 0
  );
}

export function selectWave6ClosureBundle(
  operations = [],
  outstandingEvidence = [],
) {
  const operationsById = new Map(
    operations.map((operation) => [operation.id, operation]),
  );
  const outstandingEvidenceKeys = new Set(
    outstandingEvidence.map((requirement) => evidenceKey(requirement)),
  );
  for (const bundle of wave6ClosureBundles) {
    const remainingOperationIds = bundle.operationIds.filter((operationId) => {
      const operation = operationsById.get(operationId);
      return operation !== undefined && operationIsIncomplete(operation);
    });
    if (remainingOperationIds.length > 0) {
      return {
        ...bundle,
        remainingOperationIds,
        outstandingEvidenceKeys: bundle.evidenceKeys.filter((key) =>
          outstandingEvidenceKeys.has(key),
        ),
      };
    }
  }
  const assignedOperationIds = new Set(
    wave6ClosureBundles.flatMap((bundle) => bundle.operationIds),
  );
  const unassignedOperationIds = operations
    .filter(
      (operation) =>
        operationIsIncomplete(operation) &&
        !assignedOperationIds.has(operation.id),
    )
    .map((operation) => operation.id);
  if (unassignedOperationIds.length > 0) {
    return {
      id: "unassigned-operations",
      title: "Unassigned operation closure",
      operationIds: unassignedOperationIds,
      remainingOperationIds: unassignedOperationIds,
      evidenceKeys: [],
      outstandingEvidenceKeys: [],
    };
  }
  return {
    id: "final-evidence-exit",
    title: "Cumulative evidence, adversarial audit, and exit",
    operationIds: [],
    remainingOperationIds: [],
    evidenceKeys: [...outstandingEvidenceKeys],
    outstandingEvidenceKeys: [...outstandingEvidenceKeys],
  };
}

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

export function parseArguments(argv) {
  const [command = "help", ...rest] = argv;
  const options = {
    command,
    wave: "4",
    role: undefined,
    maxSlices: 64,
    evidenceId: undefined,
    scenarioId: undefined,
  };

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
    } else if (argument === "--evidence-id" && value !== undefined) {
      options.evidenceId = value;
      index += 1;
    } else if (argument === "--scenario-id" && value !== undefined) {
      options.scenarioId = value;
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
    options.maxSlices > 160
  ) {
    throw new Error("--max-slices must be an integer from 1 through 160.");
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

  throw new Error(`Competing JSON edits at ${location}.`);
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

export function mergeOperationInventoryDocuments(
  baseText,
  oursText,
  theirsText,
) {
  let base;
  let ours;
  let theirs;
  try {
    base = JSON.parse(baseText);
    ours = JSON.parse(oursText);
    theirs = JSON.parse(theirsText);
  } catch (error) {
    throw new Error(
      "Cannot resolve the operation inventory with invalid JSON.",
      {
        cause: error,
      },
    );
  }
  const index = (document, label) => {
    if (!Array.isArray(document.operations)) {
      throw new Error(`${label} operation inventory has no operations array.`);
    }
    const result = {};
    for (const operation of document.operations) {
      if (
        !nonEmptyString(operation?.id) ||
        Object.hasOwn(result, operation.id)
      ) {
        throw new Error(
          `${label} operation inventory has an invalid or duplicate id.`,
        );
      }
      result[operation.id] = operation;
    }
    return result;
  };
  const baseOperations = index(base, "Base");
  const oursOperations = index(ours, "Design");
  const theirsOperations = index(theirs, "Backend");
  const operationIds = new Set([
    ...Object.keys(baseOperations),
    ...Object.keys(oursOperations),
    ...Object.keys(theirsOperations),
  ]);
  const mergedOperations = {};
  for (const id of operationIds) {
    const baseOperation = baseOperations[id] ?? missingJsonValue;
    const oursOperation = oursOperations[id] ?? missingJsonValue;
    const theirsOperation = theirsOperations[id] ?? missingJsonValue;
    if (
      isPlainObject(baseOperation) &&
      isPlainObject(oursOperation) &&
      isPlainObject(theirsOperation)
    ) {
      const mergedOperation = {};
      const keys = new Set([
        ...Object.keys(baseOperation),
        ...Object.keys(oursOperation),
        ...Object.keys(theirsOperation),
      ]);
      for (const key of keys) {
        const baseValue = Object.hasOwn(baseOperation, key)
          ? baseOperation[key]
          : missingJsonValue;
        const oursValue = Object.hasOwn(oursOperation, key)
          ? oursOperation[key]
          : missingJsonValue;
        const theirsValue = Object.hasOwn(theirsOperation, key)
          ? theirsOperation[key]
          : missingJsonValue;
        let value;
        if (
          key === "evidence" &&
          Array.isArray(oursValue) &&
          Array.isArray(theirsValue)
        ) {
          const unique = new Map(
            [...oursValue, ...theirsValue].map((record) => [
              JSON.stringify(record),
              record,
            ]),
          );
          value = [...unique.values()];
        } else if (key === "runtime_owner") {
          value = !isDeepStrictEqual(theirsValue, baseValue)
            ? theirsValue
            : oursValue;
        } else if (key === "current_state") {
          value = oursValue;
        } else {
          value = mergeJsonValue(
            baseValue,
            oursValue,
            theirsValue,
            `ui-operation-inventory.operations.${id}.${key}`,
          );
        }
        if (value !== missingJsonValue) mergedOperation[key] = value;
      }
      mergedOperations[id] = mergedOperation;
    } else {
      mergedOperations[id] = mergeJsonValue(
        baseOperation,
        oursOperation,
        theirsOperation,
        `ui-operation-inventory.operations.${id}`,
      );
    }
  }
  const withoutOperations = (document) => {
    const copy = { ...document };
    delete copy.operations;
    return copy;
  };
  const merged = mergeJsonValue(
    withoutOperations(base),
    withoutOperations(ours),
    withoutOperations(theirs),
    "ui-operation-inventory",
  );
  const order = [
    ...base.operations,
    ...ours.operations,
    ...theirs.operations,
  ].map((operation) => operation.id);
  merged.operations = [...new Set(order)].map((id) => mergedOperations[id]);
  return `${JSON.stringify(merged, null, 2)}\n`;
}

export function mergeAdditiveMarkdownDocuments(baseText, oursText, theirsText) {
  const root = mkdtempSync(join(tmpdir(), "petra-wave-markdown-"));
  const basePath = join(root, "base.md");
  const oursPath = join(root, "ours.md");
  const theirsPath = join(root, "theirs.md");
  try {
    writeFileSync(basePath, baseText, "utf8");
    writeFileSync(oursPath, oursText, "utf8");
    writeFileSync(theirsPath, theirsText, "utf8");
    const result = spawnSync(
      "git",
      ["merge-file", "-p", "--union", oursPath, basePath, theirsPath],
      { encoding: "utf8", env: pinnedEnvironment() },
    );
    if (result.error) throw result.error;
    if (
      result.status !== 0 ||
      /^(?:<<<<<<<|=======|>>>>>>>)/mu.test(result.stdout)
    ) {
      throw new Error("Additive Markdown merge left an unresolved conflict.");
    }
    const headings = [
      ...result.stdout.matchAll(/^### (Slice \d+[^\n]*)$/gmu),
    ].map(([, heading]) => heading);
    if (new Set(headings).size !== headings.length) {
      throw new Error("Additive Markdown merge duplicated a slice section.");
    }
    return result.stdout;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

export function resolveCompatibleIntegrationConflicts(root) {
  const conflicted = git(root, "diff", "--name-only", "--diff-filter=U")
    .split("\n")
    .filter(Boolean);
  const allowed = new Set([
    "package.json",
    "scripts/ui-operation-inventory.json",
    "reports/UI-OPERATION-COVERAGE.md",
  ]);
  if (
    conflicted.length === 0 ||
    conflicted.some((path) => !allowed.has(path))
  ) {
    return false;
  }
  for (const path of conflicted) {
    const base = git(root, "show", `:1:${path}`);
    const ours = git(root, "show", `:2:${path}`);
    const theirs = git(root, "show", `:3:${path}`);
    const merged =
      path === "package.json"
        ? mergePackageJsonDocuments(base, ours, theirs)
        : path === "scripts/ui-operation-inventory.json"
          ? mergeOperationInventoryDocuments(base, ours, theirs)
          : mergeAdditiveMarkdownDocuments(base, ours, theirs);
    writeFileSync(join(root, path), merged, "utf8");
    git(root, "add", path);
  }
  const remaining = git(root, "diff", "--name-only", "--diff-filter=U");
  if (remaining.length > 0) {
    throw new Error(`Unresolved merge paths remain: ${remaining}`);
  }
  git(root, "commit", "--no-edit");
  return true;
}

export function retainDesignIntegrationConflict(
  claimedState,
  backendCommit,
  conflictedPaths,
  automaticResolutionError = "",
) {
  if (!Array.isArray(conflictedPaths) || conflictedPaths.length === 0) {
    throw new Error(
      "A design integration conflict cannot be retained without exact conflicted paths.",
    );
  }
  const conflicts = conflictedPaths.map((path) => `- ${path}`).join("\n");
  const automaticResolution = automaticResolutionError
    ? `\nThe bounded automatic resolver declined the conflict: ${automaticResolutionError}\n`
    : "";
  return {
    ...claimedState,
    handoff_prompt:
      `DESIGN INTEGRATION RECOVERY\n` +
      `The controller retained the in-progress merge of backend ${backendCommit} so the visible design worker can resolve it instead of stopping the wave.\n` +
      `Conflicted paths:\n${conflicts}\n` +
      automaticResolution +
      `Inspect all three merge stages for every conflicted path. Preserve compatible backend and design behavior, reject any unresolved semantic ambiguity with needs_user, and do not discard either branch wholesale. ` +
      `Resolve and stage every conflict, complete the merge commit, then continue the originally assigned bounded design slice. Run the required checks and push the clean design branch before returning.\n\n` +
      claimedState.handoff_prompt,
  };
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
  if (/usage limit|purchase more credits|try again at/i.test(message)) {
    return false;
  }
  return (
    /^Codex (backend|design) worker exited with status /.test(message) ||
    /^Codex produced no structured result: /.test(message) ||
    message === "The active worker process disappeared; inspect its run logs."
  );
}

export function canResumeBlockedRecovery(
  state,
  role,
  snapshot,
  recordedCommitIsAncestor,
) {
  const recovery = state?.recovery;
  if (
    state?.status !== "blocked" ||
    recovery?.role !== role ||
    !snapshot ||
    snapshot.unexpected.length === 0 ||
    snapshot.worktree_digest !== recovery.worktree_digest ||
    !recordedCommitIsAncestor
  ) {
    return false;
  }
  return (
    matchesRecoverySnapshot(recovery, role, snapshot) ||
    snapshot.head === snapshot.remote
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

export function canRetryWorkerFailure(state, snapshots) {
  if (
    !state ||
    state.status !== "running" ||
    !state.active ||
    !Number.isSafeInteger(state.active.attempt) ||
    state.active.attempt >= 3 ||
    !roles[state.active.role]
  ) {
    return false;
  }
  const role = state.active.role;
  const otherRole = role === "backend" ? "design" : "backend";
  const own = snapshots[role];
  const counterpart = snapshots[otherRole];
  return Boolean(
    own &&
    counterpart &&
    own.remote === state.commits[role] &&
    (own.head === state.commits[role] || own.remote_is_ancestor) &&
    counterpart.unexpected.length === 0 &&
    counterpart.head === counterpart.remote &&
    counterpart.head === state.commits[otherRole],
  );
}

export function clearRetryAttempt(state, slice, role) {
  if (!state?.retry_attempts) return false;
  const key = `${slice}:${role}`;
  if (!Object.hasOwn(state.retry_attempts, key)) return false;
  delete state.retry_attempts[key];
  return true;
}

export function matchesRecoverySnapshot(recovery, role, snapshot) {
  const expectedHead = recovery?.expected_head ?? recovery?.expected_commit;
  const expectedRemote = recovery?.expected_remote ?? recovery?.expected_commit;
  return Boolean(
    recovery &&
    recovery.role === role &&
    snapshot &&
    snapshot.head === expectedHead &&
    snapshot.remote === expectedRemote &&
    (snapshot.head !== snapshot.remote || snapshot.unexpected.length > 0) &&
    snapshot.worktree_digest === recovery.worktree_digest,
  );
}

export function worktreeDigest(root, entries) {
  const hash = createHash("sha256");
  for (const entry of [...entries].sort((left, right) =>
    `${left.status}\0${left.path}`.localeCompare(
      `${right.status}\0${right.path}`,
    ),
  )) {
    hash.update(entry.status);
    hash.update("\0");
    hash.update(entry.path);
    hash.update("\0");
    if (entry.status === "??") {
      hash.update(readFileSync(join(root, entry.path)));
    } else {
      hash.update(
        run("git", ["diff", "--binary", "HEAD", "--", entry.path], root, {
          trim: false,
        }),
      );
    }
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
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
  return {
    branch,
    head,
    remote,
    unexpected,
    worktree_digest: worktreeDigest(configuration.root, unexpected),
    remote_is_ancestor: gitIsAncestor(configuration.root, remote, head),
  };
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
      !["backend", "design", "either", "user"].includes(requirement.owner)
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

export function evidenceOwnerCanSatisfy(owner, role) {
  return owner === "either" || owner === role;
}

export function normalizePlannedEvidenceRecords(plan, records = []) {
  if (!plan) return records;
  const requirements = evidenceRequirements(plan);
  const keys = new Set(
    requirements.map((requirement) => evidenceKey(requirement)),
  );
  return records.map((record) => {
    if (keys.has(evidenceKey(record))) return record;
    if (record.evidence_id !== record.scenario_id) return record;
    const requirement = requirements.find(
      (candidate) =>
        record.evidence_id ===
          `${candidate.evidence_id}/${candidate.scenario_id}` ||
        record.evidence_id ===
          `${candidate.evidence_id}::${candidate.scenario_id}`,
    );
    return requirement
      ? {
          ...record,
          evidence_id: requirement.evidence_id,
          scenario_id: requirement.scenario_id,
        }
      : record;
  });
}

export function admissibleEvidenceRecords(
  plan,
  existingRecords = [],
  candidateRecords = [],
  role,
) {
  if (!plan) return candidateRecords;
  const requirements = new Map(
    evidenceRequirements(plan).map((requirement) => [
      evidenceKey(requirement),
      requirement,
    ]),
  );
  const existingKeys = new Set(
    existingRecords.map((record) => evidenceKey(record)),
  );
  const accepted = [];
  for (const record of candidateRecords) {
    const key = evidenceKey(record);
    const requirement = requirements.get(key);
    if (!requirement) {
      throw new Error(`Worker reported unplanned evidence ${key}.`);
    }
    if (!evidenceOwnerCanSatisfy(requirement.owner, role)) {
      if (existingKeys.has(key)) continue;
      throw new Error(
        `${role} cannot satisfy ${key} owned by ${requirement.owner}.`,
      );
    }
    accepted.push(record);
  }
  return accepted;
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
  const missing = missingRequiredEvidence(plan, evidence);
  if (disposition === "wave_complete" && missing.length > 0) {
    return "handoff";
  }
  if (disposition === "needs_user" && plan) {
    const automatedEvidenceMissing = missing.some(
      (requirement) => requirement.owner !== "user",
    );
    const userAcceptanceMissing = missing.some(
      (requirement) => requirement.owner === "user",
    );
    if (automatedEvidenceMissing || !userAcceptanceMissing) return "handoff";
  }
  return disposition;
}

export function enforceProgressDisposition(result, plan, evidence = []) {
  const disposition = enforceCompletionDisposition(
    result.disposition,
    plan,
    evidence,
  );
  if (disposition === "blocked" && nonEmptyString(result.handoff_prompt)) {
    return "handoff";
  }
  return disposition;
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

export function extendStoppedState(
  state,
  {
    wave,
    maxSlices,
    planDigest: nextPlanDigest,
    evidencePlanDigest,
    commits,
    now,
  },
) {
  if (
    !state ||
    state.wave !== wave ||
    state.status !== "stopped" ||
    state.active !== null ||
    !String(state.stop_reason ?? "").startsWith("Maximum slice count ") ||
    state.slice_count < state.max_slices
  ) {
    throw new Error(
      `Wave ${wave} must be stopped exactly at its slice ceiling before extension.`,
    );
  }
  if (!Number.isSafeInteger(maxSlices) || maxSlices <= state.max_slices) {
    throw new Error(
      `The extended slice ceiling must exceed ${state.max_slices}.`,
    );
  }
  const previousMaximum = state.max_slices;
  const previousPlanDigest = state.plan_digest;
  const previousHandoff = state.handoff_prompt;
  const lastRole = state.history.at(-1)?.role;
  const nextRole = lastRole === "backend" ? "design" : "backend";
  const retryAttempts = { ...(state.retry_attempts ?? {}) };
  delete retryAttempts[`${state.slice_count + 1}:${nextRole}`];
  return {
    ...state,
    status: "waiting",
    next_role: nextRole,
    max_slices: maxSlices,
    plan_digest: nextPlanDigest,
    evidence_plan_digest: evidencePlanDigest,
    commits: { ...commits },
    handoff_prompt:
      `Continue Wave ${wave} after the first safety checkpoint. The protected ceiling is now ${maxSlices} slices. ` +
      `Follow the grouped completion reserve in the current packet: close coherent production workflows and attach only executed evidence, rather than spending a slice on each ledger row. ` +
      `Preserve every accepted result and begin with the first incomplete grouped bundle.\n\n` +
      `PRIOR HANDOFF\n${previousHandoff}`,
    active: null,
    retry_attempts: retryAttempts,
    updated_at: now,
    stop_reason: "",
    extensions: [
      ...(state.extensions ?? []),
      {
        previous_max_slices: previousMaximum,
        max_slices: maxSlices,
        previous_plan_digest: previousPlanDigest,
        plan_digest: nextPlanDigest,
        extended_at: now,
      },
    ],
  };
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
  recovery,
  closureBundle,
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
    ? `\nEXECUTED EVIDENCE CONTROL\nThe frozen evidence plan requires ${requirements.length} scenario records. ${recorded.size} are currently recorded. The inventory audit is due by completed slice ${evidencePlan.inventory_audit.required_by_completed_slice}, leaving ${evidencePlan.remediation_reserve_slices} remediation slices. A helper, test case, route, fixture, report, or scenario definition that was not invoked is not evidence. Return an evidence entry only for a named scenario actually executed in this slice. Copy evidence_id and scenario_id into their separate JSON fields exactly as shown; never concatenate them. Each entry must name its command, retained artifact, and honest boundary. A completion claim is rejected while any required scenario lacks a passed record.\n\nOutstanding records:\n${missingRequiredEvidence(
        evidencePlan,
        recordedEvidence,
      )
        .map(
          (requirement) =>
            `- ${requirement.evidence_id}/${requirement.scenario_id} (${requirement.owner}): ${requirement.description}`,
        )
        .join("\n")}\n`
    : "";

  const recoveryControl = recovery
    ? `\nTRANSIENT SLICE RECOVERY\nA prior worker attempt for this same slice ended because of a transient Codex failure after advancing the local branch or writing files. The coordinator verified the unchanged remote at ${recovery.expected_remote ?? recovery.expected_commit}, the local head at ${recovery.expected_head ?? recovery.expected_commit}, and the worktree fingerprint ${recovery.worktree_digest}. Inspect the complete local commit range, diff, and prior run logs; preserve coherent partial work, correct or finish it, then run every required check, commit, and push. Do not reset, discard, or broaden the slice.\n`
    : "";

  const closureControl = closureBundle
    ? `\nMANDATORY WORKFLOW BUNDLE\nThis slice is assigned to ${closureBundle.id}: ${closureBundle.title}. The operation gate currently reports these incomplete operations in this bundle: ${closureBundle.remainingOperationIds.join(", ") || "none"}. ${closureBundle.outstandingEvidenceKeys.length > 0 ? `Applicable outstanding named scenarios: ${closureBundle.outstandingEvidenceKeys.map((key) => key.replace("::", "/")).join(", ")}.` : "No outstanding named scenario is assigned to this bundle."}\n\nThe bundle assignment takes precedence over an unrelated or narrower counterpart handoff. Treat the prior handoff as diagnostic input for this bundle. Complete every role-owned prerequisite and defect exposed by the same end-to-end workflow; do not stop after the first ledger row, stale assertion, or adjacent failure. The backend slice must reconcile all server owners and production prerequisites needed by this bundle in one pass. The design slice must integrate the exact backend commit, exercise the complete visible workflow, fix all design-owned failures encountered in that workflow, and update every inventory row actually proven by the retained execution. Do not claim an operation or named scenario that the execution did not cover. End by running the Wave 6 operation gate and report the bundle's exact remaining operation IDs.\n`
    : "";

  return `You are Petra's unattended ${role} worker for Wave ${wave}.

Current ${role} commit: ${ownCommit}
Exact counterpart commit: ${counterpartCommit}

${roleBoundary}

Process exactly ONE bounded slice. When a mandatory workflow bundle is supplied, that entire coherent workflow is the slice; a single ledger row or test assertion is not the slice boundary. Inspect the repository and the exact counterpart commit before acting. Follow accepted decisions and frozen requirements; this automation packet is coordination guidance only. Do not spawn additional agents. Use the pinned Node 24 toolchain. Preserve unrelated work and never use destructive Git commands.

For a completed slice, run proportionate focused checks, the complete repository verification gate, and real PostgreSQL integration when persistence or PostgreSQL behavior changes. If the slice changes repository files, commit and push the coherent change before responding. If a bounded role-owned review finds no safe repository change, return a handoff from the unchanged clean and pushed commit and say so explicitly; do not fabricate a file change merely to create a commit. Confirm that your HEAD equals its remote tracking branch and that the worktree is clean except for the two explicitly known design assets. Do not continue to a second slice yourself.

If a consequential product, architecture, authority, information-hierarchy, or freeze decision is unresolved, make no partial commit and return needs_user. A failed completion gate or a repository defect owned by either worker is remediation work: return handoff with the exact defect and next bounded owning-role task so the controller keeps the wave moving. Return blocked only when an external dependency prevents either repository role from making progress, such as unavailable authorization, an unavailable required service, a push failure, an unsafe worktree, or an exhausted usage limit; for that external-only disposition, leave handoff_prompt empty and state the intervention in user_attention. A coherent prerequisite fix may be committed and pushed before either disposition. Never label partial or unverified work complete.

Your final response must be only the JSON object required by the supplied output schema. Use the full 40-character HEAD in commit and the exact supplied counterpart commit in counterpart_commit. Return evidence as an array; use an empty array when this slice executed no named evidence-plan scenario. For handoff, write a complete next-turn prompt for the other role. For needs_user or blocked, explain the exact intervention in user_attention. Declare wave_complete only under the packet's full exit rule.

${recoveryControl}${evidenceControl}${closureControl}

COUNTERPART HANDOFF
${handoff}

WAVE ${wave} PACKET
${plan}`;
}

export function validateCommitTransition(
  disposition,
  beforeCommit,
  afterCommit,
  { allowNeedsUserCommit = false } = {},
) {
  const retainsCommit =
    ["handoff", "wave_complete", "blocked"].includes(disposition) ||
    (disposition === "needs_user" && allowNeedsUserCommit);
  const changed = afterCommit !== beforeCommit;
  if (!retainsCommit && changed) {
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

export function codexEventFailure(line) {
  try {
    const event = JSON.parse(line);
    if (event.type === "error") return String(event.message ?? "");
    if (event.type === "turn.failed") {
      return String(event.error?.message ?? event.message ?? "");
    }
  } catch {
    return "";
  }
  return "";
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
  const outstandingEvidence = evidencePlan
    ? missingRequiredEvidence(evidencePlan, state.evidence ?? [])
    : [];
  let closureBundle;
  if (wave === "6" && state.slice_count >= 96) {
    const inventoryPath = join(
      designRoot,
      "scripts/ui-operation-inventory.json",
    );
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
    closureBundle = selectWave6ClosureBundle(
      (inventory.operations ?? []).filter(
        (operation) => operation.milestone === 6,
      ),
      outstandingEvidence,
    );
  }
  const prompt = buildWorkerPrompt({
    role,
    wave,
    ownCommit: state.active?.recovery?.expected_head ?? state.commits[role],
    counterpartCommit: state.commits[otherRole],
    handoff: state.handoff_prompt,
    plan,
    evidencePlan,
    recordedEvidence: state.evidence ?? [],
    recovery: state.active?.recovery,
    closureBundle,
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
  let terminalFailure = "";
  child.stdout.on("data", (chunk) => {
    eventLog.write(chunk);
    stdoutBuffer += chunk.toString("utf8");
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      terminalFailure = codexEventFailure(line) || terminalFailure;
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
    terminalFailure = codexEventFailure(stdoutBuffer) || terminalFailure;
    const detail = terminalFailure ? `: ${terminalFailure}` : "";
    throw new Error(
      `Codex ${role} worker exited with status ${exitCode}${detail}. Logs: ${jsonlPath} and ${stderrPath}`,
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
    if (
      state.wave === "6" &&
      state.slice_count >= 96 &&
      state.status !== "complete"
    ) {
      try {
        const inventory = JSON.parse(
          readFileSync(
            join(designRoot, "scripts/ui-operation-inventory.json"),
            "utf8",
          ),
        );
        const closureBundle = selectWave6ClosureBundle(
          (inventory.operations ?? []).filter(
            (operation) => operation.milestone === 6,
          ),
          missing,
        );
        lines.push(
          `Next closure bundle: ${closureBundle.id} (${closureBundle.remainingOperationIds.length} incomplete operations)`,
        );
      } catch (error) {
        lines.push(
          `Next closure bundle unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
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
      ...(state.recovery?.role === role
        ? { recovery: structuredClone(state.recovery) }
        : {}),
    };
    state.updated_at = new Date().toISOString();
    writeJsonAtomic(statePath(wave), state);
    return state;
  });
}

async function integrateBackendForDesign(wave, claimedState) {
  if (claimedState.active?.recovery) return claimedState;
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
        if (resolveCompatibleIntegrationConflicts(roles.design.root)) {
          process.stdout.write(
            "[design] Resolved compatible shared-ledger additions with strict three-way merges.\n",
          );
        } else {
          const conflicted = git(
            roles.design.root,
            "diff",
            "--name-only",
            "--diff-filter=U",
          )
            .split("\n")
            .filter(Boolean);
          process.stdout.write(
            `[design] Retaining ${conflicted.length} source conflict(s) for the visible design worker: ${conflicted.join(", ")}\n`,
          );
          return retainDesignIntegrationConflict(
            claimedState,
            backend.head,
            conflicted,
            "The conflict is outside the deterministic shared-ledger resolver.",
          );
        }
      } catch (resolutionError) {
        const conflicted = git(
          roles.design.root,
          "diff",
          "--name-only",
          "--diff-filter=U",
        )
          .split("\n")
          .filter(Boolean);
        if (conflicted.length > 0) {
          process.stdout.write(
            `[design] Retaining ${conflicted.length} unresolved source conflict(s) for the visible design worker after automatic resolution declined them.\n`,
          );
          return retainDesignIntegrationConflict(
            claimedState,
            backend.head,
            conflicted,
            resolutionError.message,
          );
        }
        git(roles.design.root, "merge", "--abort");
        throw new Error(
          `Design synchronization with backend ${backend.head} failed: ${error.message}\nAutomatic shared-ledger resolution was unavailable: ${resolutionError.message}`,
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

async function retryWorkerFailure(wave, error) {
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
    if (!canRetryWorkerFailure(state, snapshots)) return false;
    const timestamp = new Date().toISOString();
    const failed = state.active;
    const own = snapshots[failed.role];
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
    if (own.head !== own.remote || own.unexpected.length > 0) {
      state.recovery = {
        role: failed.role,
        expected_head: own.head,
        expected_remote: own.remote,
        worktree_digest: own.worktree_digest,
        changed_paths: own.unexpected,
        failed_attempt: failed.attempt,
        recovered_at: timestamp,
      };
    } else {
      delete state.recovery;
    }
    writeJsonAtomic(statePath(wave), state);
    return true;
  });
}

async function finalizeTurn(wave, role, claimedState, worker) {
  const otherRole = role === "backend" ? "design" : "backend";
  const result = worker.result;
  const evidencePlan = readEvidencePlan(wave, claimedState.max_slices);
  const resultEvidence = admissibleEvidenceRecords(
    evidencePlan,
    claimedState.evidence ?? [],
    normalizePlannedEvidenceRecords(evidencePlan, result.evidence),
    role,
  );
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

  if (!evidencePlan && resultEvidence.length > 0) {
    throw new Error("Worker reported evidence without a frozen evidence plan.");
  }

  const prospectiveEvidence = mergeEvidence(
    claimedState.evidence,
    resultEvidence,
  );
  const disposition = enforceProgressDisposition(
    result,
    evidencePlan,
    prospectiveEvidence,
  );
  const prospectiveMissingEvidence = missingRequiredEvidence(
    evidencePlan,
    prospectiveEvidence,
  );
  const userCheckpointReady =
    disposition === "needs_user" &&
    prospectiveMissingEvidence.length > 0 &&
    prospectiveMissingEvidence.every(
      (requirement) => requirement.owner === "user",
    );
  const completed =
    ["handoff", "wave_complete"].includes(disposition) || userCheckpointReady;
  const commitChanged = validateCommitTransition(
    disposition,
    claimedState.commits[role],
    own.head,
    { allowNeedsUserCommit: userCheckpointReady },
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
    state.evidence = mergeEvidence(state.evidence, resultEvidence, {
      role,
      commit: result.commit,
      run_id: worker.runId,
      completed_at: timestamp,
    });
    const missingEvidence = missingRequiredEvidence(
      evidencePlan,
      state.evidence,
    );
    const completionRejected =
      disposition === "handoff" &&
      ["wave_complete", "needs_user"].includes(result.disposition);
    const actionableBlockerContinued =
      disposition === "handoff" && result.disposition === "blocked";
    const evidenceRejection = completionRejected
      ? `Coordinator rejected ${result.disposition}; missing executed evidence: ${missingEvidence
          .map((requirement) => evidenceKey(requirement))
          .join(", ")}.`
      : "";
    const progressAdjustment = actionableBlockerContinued
      ? "Coordinator continued the actionable repository blocker as a worker handoff; no external intervention was required."
      : "";
    state.active = null;
    delete state.recovery;
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
        : progressAdjustment
          ? `${result.wave_exit_assessment} ${progressAdjustment}`.trim()
          : result.wave_exit_assessment,
      user_attention: result.user_attention,
      commit_changed: commitChanged,
      run_id: worker.runId,
      completed_at: timestamp,
    });

    if (completed || (disposition === "blocked" && commitChanged)) {
      state.commits[role] = own.head;
    }
    if (completed) {
      state.slice_count += 1;
      clearRetryAttempt(state, state.slice_count, role);
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
      state.handoff_prompt = result.handoff_prompt;
      state.stop_reason = result.user_attention;
    }
    writeJsonAtomic(statePath(wave), state);
  });
}

async function acceptUserEvidence(wave, evidenceId, scenarioId) {
  if (!nonEmptyString(evidenceId) || !nonEmptyString(scenarioId)) {
    throw new Error(
      "accept requires --evidence-id and --scenario-id from the Wave evidence plan.",
    );
  }
  await withStateLock(wave, () => {
    const state = readState(wave);
    if (!state) throw new Error(`Wave ${wave} is not initialized.`);
    if (state.status !== "needs_user") {
      throw new Error(
        `Wave ${wave} must be waiting for explicit user acceptance; current status is ${state.status}.`,
      );
    }
    const evidencePlan = readEvidencePlan(wave, state.max_slices);
    const requirement = evidenceRequirements(evidencePlan).find(
      (candidate) =>
        candidate.evidence_id === evidenceId &&
        candidate.scenario_id === scenarioId,
    );
    if (requirement === undefined || requirement.owner !== "user") {
      throw new Error(
        `${evidenceId}::${scenarioId} is not a user-owned Wave ${wave} requirement.`,
      );
    }
    const backend = repositorySnapshot("backend");
    const design = repositorySnapshot("design");
    requireCleanAndPushed("backend", backend);
    requireCleanAndPushed("design", design);
    const timestamp = new Date().toISOString();
    state.evidence = mergeEvidence(
      state.evidence,
      [
        {
          evidence_id: evidenceId,
          scenario_id: scenarioId,
          status: "passed",
          command: "explicit user acceptance",
          artifact: `Wave ${wave} runtime acceptance record`,
          boundary:
            "The user accepted the guided, live application checkpoint; automated workers cannot create this record.",
        },
      ],
      {
        role: "user",
        commit: backend.head,
        counterpart_commit: design.head,
        completed_at: timestamp,
      },
    );
    const missing = missingRequiredEvidence(evidencePlan, state.evidence);
    if (missing.length > 0) {
      throw new Error(
        `User acceptance cannot close Wave ${wave}; missing evidence: ${missing
          .map((item) => evidenceKey(item))
          .join(", ")}.`,
      );
    }
    state.status = "complete";
    state.next_role = null;
    state.handoff_prompt = "";
    state.stop_reason = `Explicit user acceptance recorded for ${evidenceId}::${scenarioId}.`;
    state.updated_at = timestamp;
    state.history.push({
      role: "user",
      disposition: "wave_complete",
      requested_disposition: "user_acceptance",
      slice_id: `${wave}-user-acceptance`,
      summary: state.stop_reason,
      commit: backend.head,
      counterpart_commit: design.head,
      verification: [
        "Explicit user acceptance after the guided live checkpoint.",
      ],
      next_safe_boundary: `Wave ${Number.parseInt(wave, 10) + 1}`,
      wave_exit_assessment: state.stop_reason,
      user_attention: "",
      commit_changed: false,
      run_id: "user-acceptance",
      completed_at: timestamp,
    });
    writeJsonAtomic(statePath(wave), state);
  });
  process.stdout.write(
    `Wave ${wave}: explicit user acceptance recorded for ${evidenceId}::${scenarioId}.\n`,
  );
}

async function workerLoop({ role, wave, maxSlices }) {
  if (!roles[role]) throw new Error("--role must be backend or design.");
  let announcedWait = false;

  for (;;) {
    assertDeliveryWavePrerequisites(wave, "worker");
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
        const recovered = await retryWorkerFailure(wave, error);
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
      requireCleanAndPushed(otherRole, counterpart);
      const recovery = claimed.active?.recovery;
      if (recovery) {
        if (!matchesRecoverySnapshot(recovery, role, own)) {
          throw new Error(
            "The partial worktree changed after transient-recovery fingerprinting.",
          );
        }
      } else {
        requireCleanAndPushed(role, own);
      }
      if (
        (!recovery && own.head !== claimed.commits[role]) ||
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
        (await retryWorkerFailure(wave, error));
      if (recovered) {
        process.stderr.write(
          `[${role}] Transient worker failure; retrying the same slice. ${error.message}\n`,
        );
        await sleep(2_000);
      } else {
        await markFailure(wave, role, error);
        process.stderr.write(`[${role}] ${error.stack ?? error.message}\n`);
      }
    }
  }
}

async function doctor(wave, maxSlices) {
  if (process.versions.node.split(".")[0] !== "24") {
    throw new Error(`Node 24 is required; found ${process.version}.`);
  }
  if (!existsSync(resultSchemaPath)) {
    throw new Error(`Missing worker result schema: ${resultSchemaPath}`);
  }
  if (!existsSync(wavePlanPath(wave))) {
    throw new Error(`Missing Wave ${wave} packet: ${wavePlanPath(wave)}`);
  }
  let state = readState(wave);
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
  let snapshots = {
    backend: repositorySnapshot("backend"),
    design: repositorySnapshot("design"),
  };
  if (state?.status === "running" && !processExists(state.active?.pid)) {
    const error = new Error(
      "The active worker process disappeared; inspect its run logs.",
    );
    const recovered = await retryWorkerFailure(wave, error);
    if (!recovered) {
      await markFailure(wave, state.active?.role ?? "unknown", error);
      throw error;
    }
    snapshots = {
      backend: repositorySnapshot("backend"),
      design: repositorySnapshot("design"),
    };
  }

  await withStateLock(wave, () => {
    const current = readState(wave);
    let changed = false;
    for (const role of Object.keys(roles)) {
      const snapshot = snapshots[role];
      const activeWorktree =
        current?.status === "running" &&
        current.active?.role === role &&
        processExists(current.active.pid);
      const recoveredWorktree = matchesRecoverySnapshot(
        current?.recovery,
        role,
        snapshot,
      );
      const resumableBlockedRecovery = canResumeBlockedRecovery(
        current,
        role,
        snapshot,
        current
          ? gitIsAncestor(
              roles[role].root,
              current.commits[role],
              snapshot.head,
            )
          : false,
      );
      if (activeWorktree || recoveredWorktree || resumableBlockedRecovery) {
        continue;
      }
      requireCleanAndPushed(role, snapshot);
      if (
        current?.status === "waiting" &&
        (current.recovery || current.next_role !== role) &&
        snapshot.head !== current.commits[role]
      ) {
        if (
          !gitIsAncestor(roles[role].root, current.commits[role], snapshot.head)
        ) {
          throw new Error(
            `${role} HEAD does not descend from the controller's recorded commit.`,
          );
        }
        current.doctor_reconciliations ??= [];
        current.doctor_reconciliations.push({
          role,
          previous_commit: current.commits[role],
          reconciled_commit: snapshot.head,
          reconciled_at: new Date().toISOString(),
        });
        current.commits[role] = snapshot.head;
        changed = true;
      }
    }
    if (changed) {
      current.updated_at = new Date().toISOString();
      writeJsonAtomic(statePath(wave), current);
    }
  });
  state = readState(wave);
  const backend = snapshots.backend;
  const design = snapshots.design;
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

function retainedBlockedHandoff(wave, state) {
  const lastRunId = state.history.at(-1)?.run_id;
  if (nonEmptyString(lastRunId)) {
    const resultPath = join(
      stateDirectory(wave),
      "runs",
      `${lastRunId}.result.json`,
    );
    if (existsSync(resultPath)) {
      try {
        const result = JSON.parse(readFileSync(resultPath, "utf8"));
        if (nonEmptyString(result.handoff_prompt)) {
          return result.handoff_prompt;
        }
      } catch {
        // Fall back to the state copy when a retained run result is unreadable.
      }
    }
  }
  return state.handoff_prompt;
}

async function resumeBlockedWave(wave, role) {
  if (!roles[role]) {
    throw new Error("resume requires --role backend or --role design.");
  }
  await withStateLock(wave, () => {
    const state = readState(wave);
    if (!state) throw new Error(`Wave ${wave} is not initialized.`);
    if (state.status !== "blocked") {
      throw new Error(
        `Wave ${wave} must be blocked before resume; current status is ${state.status}.`,
      );
    }
    if (state.active?.pid && processExists(state.active.pid)) {
      throw new Error(
        `A ${state.active.role} worker is still active at pid ${state.active.pid}.`,
      );
    }
    const otherRole = role === "backend" ? "design" : "backend";
    const own = repositorySnapshot(role);
    const counterpart = repositorySnapshot(otherRole);
    const resumableRecovery = canResumeBlockedRecovery(
      state,
      role,
      own,
      gitIsAncestor(roles[role].root, state.commits[role], own.head),
    );
    if (!resumableRecovery) requireCleanAndPushed(role, own);
    requireCleanAndPushed(otherRole, counterpart);
    if (counterpart.head !== state.commits[otherRole]) {
      throw new Error(
        `${otherRole} advanced after the blocked slice; reconcile it before resume.`,
      );
    }
    if (!gitIsAncestor(roles[role].root, state.commits[role], own.head)) {
      throw new Error(
        `${role} HEAD does not descend from the controller's recorded commit.`,
      );
    }
    const previousCommit = state.commits[role];
    const previousReason = state.stop_reason;
    const previousRole = state.history.at(-1)?.role ?? role;
    const retainedHandoff = retainedBlockedHandoff(wave, state);
    const timestamp = new Date().toISOString();
    state.status = "waiting";
    state.next_role = role;
    state.active = null;
    state.commits[role] = own.head;
    if (resumableRecovery) {
      state.recovery = {
        ...state.recovery,
        expected_head: own.head,
        expected_remote: own.remote,
        worktree_digest: own.worktree_digest,
        changed_paths: own.unexpected,
        recovered_at: timestamp,
      };
    }
    clearRetryAttempt(state, state.slice_count + 1, role);
    state.stop_reason = "";
    state.handoff_prompt =
      `Recover Wave ${wave} slice ${state.slice_count + 1} in the ${role} role after the prior ${previousRole} attempt stopped. ` +
      `The controller recorded ${role} at ${previousCommit}; its clean pushed head is now ${own.head}. Inspect any exact commit range and the latest run logs before changing anything. ` +
      `Preserve completed work and address only this blocker: ${previousReason} ` +
      `Then return one bounded slice without duplicating implementation.\n\n` +
      `DETAILED PRIOR HANDOFF\n${retainedHandoff || "No additional handoff was retained."}`;
    state.updated_at = timestamp;
    state.operator_recoveries ??= [];
    state.operator_recoveries.push({
      role,
      previous_commit: previousCommit,
      recovered_commit: own.head,
      reason: previousReason,
      recovered_at: timestamp,
    });
    writeJsonAtomic(statePath(wave), state);
  });
  process.stdout.write(`Wave ${wave}: resumed blocked ${role} slice.\n`);
}

async function extendStoppedWave(wave, maxSlices) {
  const snapshots = {
    backend: repositorySnapshot("backend"),
    design: repositorySnapshot("design"),
  };
  requireCleanAndPushed("backend", snapshots.backend);
  requireCleanAndPushed("design", snapshots.design);
  const plan = readFileSync(wavePlanPath(wave), "utf8");
  const evidencePlan = readEvidencePlan(wave, maxSlices);
  await withStateLock(wave, () => {
    const state = readState(wave);
    if (!state) throw new Error(`Wave ${wave} is not initialized.`);
    for (const role of Object.keys(roles)) {
      if (
        !gitIsAncestor(
          roles[role].root,
          state.commits[role],
          snapshots[role].head,
        )
      ) {
        throw new Error(
          `${role} HEAD does not descend from the controller's recorded commit.`,
        );
      }
    }
    const extended = extendStoppedState(state, {
      wave,
      maxSlices,
      planDigest: planDigest(plan),
      evidencePlanDigest: evidencePlan
        ? planDigest(JSON.stringify(evidencePlan))
        : null,
      commits: {
        backend: snapshots.backend.head,
        design: snapshots.design.head,
      },
      now: new Date().toISOString(),
    });
    writeJsonAtomic(statePath(wave), extended);
  });
  process.stdout.write(
    `Wave ${wave}: extended to ${maxSlices} grouped-remediation slices.\n`,
  );
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/wave-handoff.mjs worker --role backend|design [--wave 4] [--max-slices 64]
  node scripts/wave-handoff.mjs doctor [--wave 4]
  node scripts/wave-handoff.mjs status [--wave 4]
  node scripts/wave-handoff.mjs stop [--wave 4]
  node scripts/wave-handoff.mjs resume --wave N --role backend|design
  node scripts/wave-handoff.mjs extend --wave N --max-slices N
  node scripts/wave-handoff.mjs accept --wave N --evidence-id ID --scenario-id ID

The backend worker initializes missing state. Start one worker in each worktree.
Runtime state and logs are written under .codex-wave-handoff/ and are ignored by Git.
`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  assertDeliveryWavePrerequisites(options.wave, options.command);
  if (options.command === "worker") {
    process.exitCode = await workerLoop(options);
  } else if (options.command === "doctor") {
    await doctor(options.wave, options.maxSlices);
  } else if (options.command === "status") {
    process.stdout.write(`${stateSummary(readState(options.wave))}\n`);
  } else if (options.command === "stop") {
    await stop(options.wave);
  } else if (options.command === "resume") {
    await resumeBlockedWave(options.wave, options.role);
  } else if (options.command === "extend") {
    await extendStoppedWave(options.wave, options.maxSlices);
  } else if (options.command === "accept") {
    await acceptUserEvidence(
      options.wave,
      options.evidenceId,
      options.scenarioId,
    );
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
