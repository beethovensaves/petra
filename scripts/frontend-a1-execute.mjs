import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  renderA1Ledger,
  validateA1Inventory,
  repositoryRoot,
} from "./audit-frontend-a1.mjs";
import {
  assertExecutionMirrors,
  counterpartRoot,
  digest,
  executionOrder,
  itemContractHash,
  mirrorFiles,
  roadmaps,
  renderExecutionPacket,
  roadmapBlock,
  safePath,
  validateCompletionPasses,
  validatePass,
  validateExecutionState,
  validateTestCommand,
} from "./frontend-a1-process.mjs";

const inventory = "scripts/frontend-a1-work-inventory.json";
export const readA1 = (root = repositoryRoot) =>
  JSON.parse(readFileSync(resolve(root, inventory), "utf8"));
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function beginItem(data, id) {
  validateExecutionState(data);
  check(
    data.active_work === null,
    "Finish or diagnose the active work before selecting another item.",
  );
  const item = data.work_items.find((item) => item.id === id);
  check(item && item.status === "planned", "Select a planned required item.");
  check(
    item.depends_on.every(
      (id) =>
        data.work_items.find((item) => item.id === id)?.status === "complete",
    ),
    `${id} has incomplete prerequisites.`,
  );
  item.status = "in_progress";
  data.active_work = {
    item: id,
    phase: "execution",
    failed_attempts: 0,
    started_at: new Date().toISOString(),
  };
  return item;
}

export function recordFailure(data, reason) {
  check(data.active_work, "No active A1 item.");
  check(
    data.active_work.phase !== "diagnosis_required",
    "Stop the retry loop and diagnose broadly before resuming.",
  );
  check(
    typeof reason === "string" && reason.trim().length >= 12,
    "Retain the actual failure reason.",
  );
  data.active_work.failed_attempts += 1;
  data.active_work.failures ??= [];
  data.active_work.failures.push({
    reason,
    phase: data.active_work.phase,
    recorded_at: new Date().toISOString(),
  });
  if (data.active_work.failed_attempts >= 2)
    data.active_work.phase = "diagnosis_required";
}

export function beginRepair(data, findings) {
  const active = data.active_work;
  check(
    active && active.phase === "critical" && active.failed_attempts === 1,
    "Repair follows an unsuccessful critical pass; repeated failures require diagnosis.",
  );
  check(
    typeof findings === "string" && findings.trim().length >= 24,
    "Repair must name the critical findings and affected functional checks.",
  );
  active.repairs ??= [];
  active.repairs.push({
    findings,
    prior_passes: active.passes ?? [],
    started_at: new Date().toISOString(),
  });
  active.passes = [];
  active.phase = "repair";
}

export function recordDiagnosis(data, diagnosis) {
  const active = data.active_work;
  check(
    active?.phase === "diagnosis_required",
    "Broad diagnosis resumes a stopped retry loop.",
  );
  for (const key of [
    "contract",
    "architecture",
    "dependencies",
    "environment",
    "verification",
    "changed_remedy",
  ])
    check(
      typeof diagnosis[key] === "string" && diagnosis[key].trim().length >= 24,
      `Broad diagnosis must examine ${key}.`,
    );
  check(
    !(active.diagnoses ?? []).some(
      (entry) => entry.changed_remedy === diagnosis.changed_remedy,
    ),
    "Repeating the same remedy does not resolve a retry loop.",
  );
  active.diagnoses ??= [];
  active.diagnoses.push({
    ...diagnosis,
    failures: active.failures,
    recorded_at: new Date().toISOString(),
  });
  active.passes = [];
  active.failed_attempts = 0;
  active.phase = "execution";
}

export function recordPass(data, reference, root, options) {
  const active = data.active_work;
  check(
    active && active.phase !== "diagnosis_required",
    "A1 execution requires a ready item; a retry loop needs broad diagnosis.",
  );
  const item = data.work_items.find((item) => item.id === active.item);
  check(
    reference.pass === active.phase ||
      (active.phase === "repair" && reference.pass === "execution"),
    "Execute the functional pass before the critical pass.",
  );
  validatePass(item, reference, root, options);
  const passes = [
    ...(active.passes ?? []).filter((entry) => entry.pass !== reference.pass),
    reference,
  ];
  if (passes.length === 2)
    validateCompletionPasses(
      { ...item, completion_evidence: passes },
      root,
      options,
    );
  active.passes = passes;
  if (reference.pass === "execution") active.phase = "critical";
}

// This entrypoint executes the tests itself. Imported report files alone cannot
// advance the CLI state. Plans carry criterion observations and review challenges;
// the runner supplies the candidate, source hashes, times and retained output.
export function executeVerification(data, plan, root = repositoryRoot) {
  const item = data.work_items.find(
    (entry) => entry.id === data.active_work?.item,
  );
  check(
    item && plan.work_item === item.id,
    "Verification plan names another active item.",
  );
  check(
    plan.pass === data.active_work.phase ||
      (data.active_work.phase === "repair" && plan.pass === "execution"),
    "Execute the functional pass before the critical pass.",
  );
  validateTestCommand(plan.argv, root);
  check(
    Array.isArray(plan.sources) && plan.sources.length > 0,
    "Verification needs exact implementation and test sources.",
  );
  const candidate = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  check(candidate.status === 0, "Verification requires a committed candidate.");
  const candidate_commit = candidate.stdout.trim();
  const sources = [...new Set([...plan.sources, ...plan.argv.slice(3)])]
    .sort()
    .map((path) => ({
      path,
      hash: digest(readFileSync(safePath(root, path))),
    }));
  for (const source of sources) {
    const committed = spawnSync(
      "git",
      ["show", `${candidate_commit}:${source.path}`],
      { cwd: root },
    );
    check(
      committed.status === 0 && digest(committed.stdout) === source.hash,
      `Commit the tested source before verification: ${source.path}`,
    );
  }
  const started_at = new Date().toISOString();
  const testEnvironment = { ...process.env };
  delete testEnvironment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, plan.argv.slice(1), {
    cwd: root,
    env: testEnvironment,
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const finished_at = new Date().toISOString();
  const base = `reports/a1-passes/${item.id}-${plan.pass}-${Date.now()}`;
  const output = `${base}.tap`;
  mkdirSync(resolve(root, "reports/a1-passes"), { recursive: true });
  writeFileSync(
    resolve(root, output),
    `${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
  if (result.status !== 0) {
    recordFailure(
      data,
      `Verification failed: ${plan.argv.join(" ")}; retained output ${output}`,
    );
    return { failed: true, output };
  }
  const proof = {
    schema_name: "petra.a1-verification-pass",
    schema_version: "1.0.0",
    work_item: item.id,
    pass: plan.pass,
    contract_hash: itemContractHash(item),
    status: "passed",
    candidate_commit,
    started_at,
    finished_at,
    criteria: plan.criteria,
    sources,
    runs: [
      {
        argv: plan.argv,
        exit_code: result.status,
        output,
        output_hash: digest(readFileSync(resolve(root, output))),
      },
    ],
    boundary: plan.boundary,
    ...(plan.review ? { review: plan.review } : {}),
  };
  const artifact = `${base}.json`;
  writeFileSync(resolve(root, artifact), `${JSON.stringify(proof, null, 2)}\n`);
  try {
    recordPass(
      data,
      {
        pass: plan.pass,
        artifact,
        command: plan.argv.join(" "),
        boundary: plan.boundary,
      },
      root,
    );
  } catch (error) {
    recordFailure(
      data,
      `Verification rejected: ${error.message}; retained output ${output}`,
    );
    return { failed: true, output, reason: error.message };
  }
  return { failed: false, artifact };
}

export function closeItem(data, root, options) {
  validateExecutionState(data);
  const active = data.active_work;
  check(
    active && active.phase !== "diagnosis_required",
    "A1 cannot close while diagnosis is required.",
  );
  const item = data.work_items.find((item) => item.id === active.item);
  const records = active.passes ?? [];
  validateCompletionPasses(
    { ...item, completion_evidence: records },
    root,
    options,
  );
  item.completion_evidence = records;
  item.execution_history ??= [];
  item.execution_history.push({
    ...active,
    finished_at: new Date().toISOString(),
  });
  item.status = "complete";
  data.active_work = null;
  return item;
}

export async function synchronizeA1(data, root = repositoryRoot, mirrors = []) {
  validateExecutionState(data);
  data.updated = "2026-10-10";
  const block = roadmapBlock(data);
  const prepared = new Map([
    [inventory, `${JSON.stringify(data, null, 2)}\n`],
    [
      "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md",
      await renderA1Ledger(data),
    ],
    [
      "scripts/frontend-a1-execution.md",
      await format(renderExecutionPacket(data), { parser: "markdown" }),
    ],
  ]);
  for (const path of roadmaps) {
    const absolute = resolve(root, path);
    let content = readFileSync(absolute, "utf8");
    content = content
      .replace(/89 required/g, `${data.work_items.length} required`)
      .replace(
        /eight documentation\/creation items are complete and 81 remain incomplete/g,
        "prior documentation/creation evidence is retained; current closure is shown below",
      )
      .replace(
        /Eight items are complete: five documentation and\nexecution-control items plus three retained creation mechanics\. The remaining\n81 are incomplete\./g,
        "Prior documentation and creation evidence is retained for revalidation under D025. The generated controlling section below records current closure.",
      );
    content = content.includes("<!-- A1-SYNC:START -->")
      ? content.replace(
          /<!-- A1-SYNC:START -->[\s\S]*?<!-- A1-SYNC:END -->/,
          block,
        )
      : `${content.trimEnd()}\n\n${block}\n`;
    if (path.startsWith("reports/"))
      content = content
        .replace(/\]\(scripts\//g, "](../scripts/")
        .replace(/\]\(reports\//g, "](");
    prepared.set(path, await format(content, { parser: "markdown" }));
  }
  const artifacts = data.work_items
    .flatMap((item) => [
      ...item.completion_evidence,
      ...(item.id === data.active_work?.item
        ? (data.active_work.passes ?? [])
        : []),
    ])
    .flatMap((entry) => {
      const proof = JSON.parse(
        readFileSync(resolve(root, entry.artifact), "utf8"),
      );
      return [
        entry.artifact,
        ...proof.runs.map((run) => run.output),
        ...proof.sources.map((source) => source.path),
      ];
    });
  const writes = [...prepared].map(([path, content]) => [
    resolve(root, path),
    content,
  ]);
  for (const mirror of mirrors) {
    check(
      existsSync(mirror),
      `Configured A1 execution worktree is missing: ${mirror}`,
    );
    for (const path of new Set([...mirrorFiles, ...artifacts]))
      writes.push([
        resolve(mirror, path),
        prepared.get(path) ?? readFileSync(safePath(root, path)),
      ]);
  }
  const backups = [];
  try {
    for (const [destination, content] of writes) {
      const backup = [
        destination,
        existsSync(destination) ? readFileSync(destination) : null,
      ];
      mkdirSync(dirname(destination), { recursive: true });
      backups.push(backup);
      writeFileSync(destination, content);
    }
  } catch (error) {
    for (const [destination, content] of backups.reverse())
      if (content === null) rmSync(destination, { force: true });
      else writeFileSync(destination, content);
    throw error;
  }
}

export async function assertRoadmapSynchronization(
  data,
  root = repositoryRoot,
) {
  check(
    readFileSync(
      resolve(root, "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md"),
      "utf8",
    ) === (await renderA1Ledger(data)),
    "Readable A1 ledger is stale.",
  );
  check(
    readFileSync(resolve(root, "scripts/frontend-a1-execution.md"), "utf8") ===
      (await format(renderExecutionPacket(data), { parser: "markdown" })),
    "Granular A1 execution instructions are stale.",
  );
  for (const path of roadmaps) {
    let block = roadmapBlock(data);
    if (path.startsWith("reports/"))
      block = block
        .replace(/\]\(scripts\//g, "](../scripts/")
        .replace(/\]\(reports\//g, "](");
    const expected = (await format(block, { parser: "markdown" })).trim();
    const actual = readFileSync(resolve(root, path), "utf8").match(
      /<!-- A1-SYNC:START -->[\s\S]*?<!-- A1-SYNC:END -->/,
    )?.[0];
    check(actual === expected, `Roadmap synchronization is stale: ${path}`);
  }
}

async function main() {
  const [command, value, ...rest] = process.argv.slice(2);
  check(rest.length === 0, "Unexpected A1 execution argument.");
  const data = readA1();
  if (command === "sync") {
    await synchronizeA1(data, repositoryRoot, [
      counterpartRoot(repositoryRoot),
    ]);
    return;
  }
  validateA1Inventory(
    data,
    JSON.parse(
      readFileSync(
        resolve(repositoryRoot, "scripts/ui-operation-inventory.json"),
      ),
    ).operations,
  );
  await assertRoadmapSynchronization(data);
  assertExecutionMirrors(repositoryRoot);
  if (command === "status") {
    console.log(
      JSON.stringify(
        {
          active: data.active_work,
          ready: executionOrder(data)
            .filter(
              (item) =>
                item.status === "planned" &&
                item.depends_on.every(
                  (id) =>
                    data.work_items.find((item) => item.id === id).status ===
                    "complete",
                ),
            )
            .map((item) => ({ id: item.id, title: item.title })),
          complete: data.work_items.filter((item) => item.status === "complete")
            .length,
          required: data.work_items.length,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "begin") beginItem(data, value);
  else if (command === "failure") recordFailure(data, value);
  else if (command === "repair") beginRepair(data, value);
  else if (command === "diagnose")
    recordDiagnosis(
      data,
      JSON.parse(readFileSync(resolve(repositoryRoot, value), "utf8")),
    );
  else if (command === "verify") {
    const result = executeVerification(
      data,
      JSON.parse(readFileSync(safePath(repositoryRoot, value), "utf8")),
    );
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode = 1;
  } else if (command === "close") closeItem(data, repositoryRoot);
  else
    throw new Error(
      "Use A1 status, sync, begin ID, verify PLAN, failure REASON, repair FINDINGS, diagnose ARTIFACT, or close. Importing a report cannot record a passing execution.",
    );
  await synchronizeA1(data, repositoryRoot, [counterpartRoot(repositoryRoot)]);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
