import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

export const a1ProcessVersion = "1.0.0";
export const digest = (value) =>
  `sha256:${createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex")}`;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const criterionIds = (item) =>
  item.acceptance.map(
    (_, i) => `${item.id}-AC${String(i + 1).padStart(2, "0")}`,
  );
export const itemContractHash = (item) =>
  digest({
    process: a1ProcessVersion,
    id: item.id,
    owner: item.owner,
    implementation: item.implementation,
    acceptance: item.acceptance,
    depends_on: item.depends_on,
    contracts: item.contracts,
    verification_plans: item.verification_plans,
  });
export const roadmapHash = (data) =>
  digest({
    process: data.execution_policy,
    work: data.work_items.map((item) => ({
      id: item.id,
      contract: itemContractHash(item),
      status: item.status,
      completion_evidence: item.completion_evidence,
    })),
    operations: data.operation_coverage,
    requests: data.request_coverage,
    flows: data.flow_coverage,
    repairs: data.repair_sequence,
    active: data.active_work,
    acceptance: data.user_acceptance,
  });

export function executionOrder(data) {
  const result = [],
    visited = new Set(),
    visiting = new Set();
  const items = new Map(data.work_items.map((item) => [item.id, item]));
  function visit(id) {
    check(!visiting.has(id), `A1 dependency cycle at ${id}.`);
    if (visited.has(id)) return;
    const item = items.get(id);
    check(item, `Unknown prerequisite ${id}.`);
    visiting.add(id);
    item.depends_on.forEach(visit);
    visiting.delete(id);
    visited.add(id);
    result.push(item);
  }
  const first = [
    "FE-A1.0-W06",
    "FE-A1.0-W01",
    "FE-A1.0-W02",
    "FE-A1.0-W03",
    "FE-A1.0-W04",
    "FE-A1.0-W05",
    "FE-A1.6-W07",
    "FE-A1.3-W01",
    "FE-A1.3-W02",
    "FE-A1.3-W03",
    "FE-A1.3-W04",
    "FE-A1.3-W05",
    "FE-A1.3-W07",
    "FE-A1.2-W07",
  ];
  [...first.filter((id) => items.has(id)), ...items.keys()].forEach(visit);
  return result;
}

export function validateExecutionState(data) {
  check(
    data.execution_policy?.version === a1ProcessVersion,
    "A1 requires the accepted two-pass execution policy.",
  );
  check(
    data.execution_policy.maximum_active_items === 1 &&
      data.execution_policy.required_passes?.join(",") === "execution,critical",
    "A1 must use one active item and two distinct passes.",
  );
  check(
    data.execution_policy.repeated_failure_limit === 2,
    "Repeated A1 failures must stop for broad diagnosis.",
  );
  const active = data.work_items.filter(
    (item) => item.status === "in_progress",
  );
  check(active.length <= 1, "A1 permits only one active incomplete item.");
  check(
    active.length === (data.active_work === null ? 0 : 1),
    "Active execution and roadmap status disagree.",
  );
  if (active.length) {
    const item = active[0];
    check(
      data.active_work.item === item.id,
      "Active execution names another roadmap item.",
    );
    check(
      item.depends_on.every(
        (id) =>
          data.work_items.find((entry) => entry.id === id)?.status ===
          "complete",
      ),
      `${item.id} started before its prerequisites completed.`,
    );
    check(
      ["execution", "critical", "repair", "diagnosis_required"].includes(
        data.active_work.phase,
      ),
      "Unknown A1 execution phase.",
    );
    check(
      Number.isInteger(data.active_work.failed_attempts) &&
        data.active_work.failed_attempts >= 0,
      "A1 must retain its failed attempts.",
    );
    check(
      data.active_work.failed_attempts < 2 ||
        data.active_work.phase === "diagnosis_required",
      "Repeated failures require broad diagnosis before further work.",
    );
  }
  executionOrder(data);
}

export function safePath(root, path) {
  check(
    typeof path === "string" &&
      path.length &&
      !isAbsolute(path) &&
      !path.includes("\\") &&
      !path.split("/").includes(".."),
    `Unsafe A1 evidence path: ${path}`,
  );
  const absolute = resolve(root, path);
  check(existsSync(absolute), `A1 evidence is missing: ${path}`);
  const resolved = relative(realpathSync(root), realpathSync(absolute));
  check(
    resolved &&
      !resolved.startsWith("..") &&
      !isAbsolute(resolved) &&
      statSync(absolute).isFile(),
    `Unsafe A1 evidence path: ${path}`,
  );
  return absolute;
}

export function validateTestCommand(argv, root) {
  check(
    Array.isArray(argv) &&
      argv.length >= 4 &&
      argv[0] === "node" &&
      argv[1] === "--test" &&
      argv[2] === "--test-reporter=tap",
    "A1 evidence requires a directly executed Node test suite with TAP output.",
  );
  for (const path of argv.slice(3)) {
    check(
      /\.test(?:\.critical)?\.mjs$/.test(path) && !path.startsWith("-"),
      `Unregistered A1 test invocation: ${path}`,
    );
    safePath(root, path);
  }
}

export function validatePass(
  item,
  reference,
  root,
  { checkCommit = true } = {},
) {
  check(
    ["execution", "critical"].includes(reference.pass),
    `${item.id} lacks a named execution or critical pass.`,
  );
  const proof = JSON.parse(
    readFileSync(safePath(root, reference.artifact), "utf8"),
  );
  check(
    proof.schema_name === "petra.a1-verification-pass" &&
      proof.schema_version === "1.0.0",
    `${item.id} has no structured verification pass.`,
  );
  check(
    proof.work_item === item.id && proof.pass === reference.pass,
    `${item.id} pass belongs to another item or phase.`,
  );
  check(
    proof.contract_hash === itemContractHash(item),
    `${item.id} evidence belongs to a different contract.`,
  );
  check(
    proof.status === "passed" &&
      /^[a-f0-9]{40}$/.test(proof.candidate_commit ?? ""),
    `${item.id} pass has no passing candidate.`,
  );
  if (checkCommit)
    check(
      spawnSync(
        "git",
        ["merge-base", "--is-ancestor", proof.candidate_commit, "HEAD"],
        { cwd: root },
      ).status === 0,
      `${item.id} candidate is not in this execution branch.`,
    );
  check(
    Number.isFinite(Date.parse(proof.started_at)) &&
      Date.parse(proof.finished_at) >= Date.parse(proof.started_at),
    `${item.id} pass has invalid execution times.`,
  );
  const expected = criterionIds(item);
  check(
    Array.isArray(proof.criteria) &&
      proof.criteria.length === expected.length &&
      new Set(proof.criteria.map((entry) => entry.id)).size === expected.length,
    `${item.id} needs evidence for every criterion.`,
  );
  for (const id of expected) {
    const entry = proof.criteria.find((entry) => entry.id === id);
    check(
      entry?.result === "passed" &&
        typeof entry.observation === "string" &&
        entry.observation.trim().length >= 24 &&
        typeof entry.test === "string" &&
        entry.test.trim(),
      `${id} has no observed, tested outcome.`,
    );
  }
  check(
    Array.isArray(proof.sources) &&
      proof.sources.length > 0 &&
      new Set(proof.sources.map((source) => source.path)).size ===
        proof.sources.length,
    `${item.id} has no exact source bindings.`,
  );
  for (const source of proof.sources) {
    check(
      digest(readFileSync(safePath(root, source.path))) === source.hash,
      `${item.id} evidence is stale for ${source.path}.`,
    );
    if (checkCommit) {
      const committed = spawnSync(
        "git",
        ["show", `${proof.candidate_commit}:${source.path}`],
        { cwd: root },
      );
      check(
        committed.status === 0 && digest(committed.stdout) === source.hash,
        `${item.id} source was not tested at its candidate commit: ${source.path}.`,
      );
    }
  }
  check(
    Array.isArray(proof.runs) && proof.runs.length > 0,
    `${item.id} has no retained test invocation.`,
  );
  const retainedOutputs = [];
  for (const run of proof.runs) {
    validateTestCommand(run.argv, root);
    check(
      run.exit_code === 0 &&
        run.argv
          .slice(3)
          .every((path) =>
            proof.sources.some((source) => source.path === path),
          ),
      `${item.id} test suite is not bound to its passing candidate.`,
    );
    const output = readFileSync(safePath(root, run.output), "utf8");
    check(
      digest(output) === run.output_hash,
      `${item.id} test output was modified.`,
    );
    check(
      /^TAP version 13$/m.test(output) &&
        /^# pass [1-9]\d*$/m.test(output) &&
        /^# fail 0$/m.test(output) &&
        /^# skipped 0$/m.test(output) &&
        /^# todo 0$/m.test(output),
      `${item.id} output establishes no fully executed passing checks.`,
    );
    retainedOutputs.push(output);
  }
  for (const entry of proof.criteria)
    check(
      retainedOutputs.some((output) =>
        output
          .split("\n")
          .some(
            (line) =>
              /^ok \d+ - /.test(line) &&
              line.replace(/^ok \d+ - /, "") === entry.test,
          ),
      ),
      `${entry.id} named passing test is absent from retained output.`,
    );
  check(
    typeof proof.boundary === "string" && proof.boundary.trim().length >= 24,
    `${item.id} needs an honest evidence boundary.`,
  );
  if (proof.pass === "critical") {
    check(
      typeof proof.review?.perspective === "string" &&
        proof.review.perspective.trim().length >= 24,
      `${item.id} critical pass has no distinct review perspective.`,
    );
    check(
      Array.isArray(proof.review.challenges) &&
        expected.every((id) =>
          proof.review.challenges.some(
            (challenge) =>
              challenge.criterion === id &&
              challenge.question?.trim() &&
              challenge.result?.trim(),
          ),
        ),
      `${item.id} critical pass does not challenge every criterion.`,
    );
    check(
      Array.isArray(proof.review.findings) &&
        proof.review.findings.every(
          (finding) =>
            finding.disposition === "resolved" ||
            (finding.severity === "minor" &&
              finding.disposition === "retained_limit"),
        ),
      `${item.id} has unresolved material critical findings.`,
    );
  }
  return proof;
}

export function validateCompletionPasses(item, root, options) {
  const records = item.completion_evidence;
  check(
    Array.isArray(records) &&
      records.length === 2 &&
      new Set(records.map((record) => record.pass)).size === 2,
    `${item.id} requires execution and critical completion evidence.`,
  );
  const execution = validatePass(
    item,
    records.find((record) => record.pass === "execution"),
    root,
    options,
  );
  const critical = validatePass(
    item,
    records.find((record) => record.pass === "critical"),
    root,
    options,
  );
  check(
    Date.parse(critical.started_at) >= Date.parse(execution.finished_at),
    `${item.id} critical pass must follow execution.`,
  );
  check(
    execution.candidate_commit === critical.candidate_commit &&
      JSON.stringify(execution.sources) === JSON.stringify(critical.sources),
    `${item.id} passes evaluated different candidates.`,
  );
  check(
    !execution.runs.some((a) =>
      critical.runs.some(
        (b) =>
          JSON.stringify(a.argv) === JSON.stringify(b.argv) ||
          a.output_hash === b.output_hash ||
          a.output === b.output,
      ),
    ),
    `${item.id} critical pass repeats execution rather than challenging it.`,
  );
}

export function renderExecutionPacket(data) {
  const hash = roadmapHash(data);
  const lines = [
    "# A1 execution instructions",
    "",
    `Roadmap binding: \`${hash}\`. Generated from frontend-a1-work-inventory.json.`,
    "",
    "D025 and D024 govern this execution. Historical frozen Wave 6 instructions are subordinate. Native screen-reader evaluation is excluded; browser semantics and functional peers remain mandatory. The sixteen late scenarios are optional.",
    "",
    "## Working procedure",
    "",
    "1. Audit synchronization of the readable roadmap, this packet, the ledger, and both execution worktrees.",
    "2. Select one prerequisite-ready incomplete item. Preserve prior partial code and evidence. Implement only the selected deliverable and its criteria.",
    "3. Execution pass: exercise every criterion through its actual owners and retain exact candidate, inputs, source bindings, test invocation, output, result, and limits.",
    "4. Critical pass: review the integrated behavior against the intended user outcome and execute distinct adverse, semantic, authority, recovery, and composition challenges. Resolve material findings.",
    "5. When necessary, repair findings in a third pass and re-execute affected functional and critical checks. Two consecutive unsuccessful attempts require a broad diagnosis; do not keep retrying the same local remedy.",
    "6. Close the item only with both passing records, current bindings, and completed prerequisites. Regenerate and synchronize all roadmap and execution views in the same change.",
    "7. Publish a fully verified candidate for explicit user acceptance after every required item closes. Never self-record acceptance or substitute a legacy Wave 6 checkpoint.",
    "",
    "## Diagnosed repair sequence",
    "",
    ...data.repair_sequence.flatMap((repair) => [
      `${repair.order}. **Diagnoses ${repair.diagnoses.join(", ")}:** ${repair.resolution} Owners: ${repair.work_items.join(", ")}.`,
      "",
    ]),
    "Construction follows the prerequisites below. Independent shell work can run before runtime integration; it cannot close runtime or integrated behavior criteria.",
    "",
    "## Granular prerequisite order",
    "",
  ];
  for (const [index, item] of executionOrder(data).entries()) {
    lines.push(
      `### ${index + 1}. ${item.id}: ${item.title}`,
      "",
      `State: ${item.status}. Owner: ${item.owner}. Prerequisites: ${item.depends_on.join(", ") || "none"}.`,
      "",
      item.implementation,
      "",
      ...(item.verification_plans
        ? [
            `Execution plan: [${item.verification_plans.execution}](../${item.verification_plans.execution}). Critical plan: [${item.verification_plans.critical}](../${item.verification_plans.critical}). Run each with \`npm run a1:verify -- PLAN\` in that order.`,
          ]
        : [
            "Publish exact criterion/test plans in the ledger before recording verification. Invoke them through the capture runner, then run the separate critical plan.",
          ]),
      "",
      ...item.acceptance.map(
        (criterion, i) => `- **${criterionIds(item)[i]}:** ${criterion}`,
      ),
      "",
      "Execution: prove the observable outcome of each criterion. Critical: challenge each criterion with a distinct test and explain the user consequence of any finding. Both pass records bind this exact contract and candidate.",
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

export function roadmapBlock(data) {
  const completed = data.work_items.filter(
    (item) => item.status === "complete",
  ).length;
  const lines = [
    "<!-- A1-SYNC:START -->",
    "## Controlling A1 execution",
    "",
    `Binding: \`${roadmapHash(data)}\`. ${completed}/${data.work_items.length} required items complete; ${data.work_items.length - completed} incomplete.`,
    "",
    "D024 governs the conversational copilot and reactive Workspace. D025 governs synchronized execution and two distinct validation passes. The canonical [function ledger](scripts/frontend-a1-work-inventory.json), [readable implementation ledger](reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md), and [granular execution instructions](scripts/frontend-a1-execution.md) agree before work starts, evidence is recorded, completion is accepted, or another wave proceeds.",
    "",
    `Active work: ${data.active_work ? `${data.active_work.item}, ${data.active_work.phase}` : "none; select one prerequisite-ready item"}.`,
    "",
    "| Stage | Required behavior | Complete / required |",
    "| --- | --- | --- |",
  ];
  for (const milestone of data.milestones) {
    const items = data.work_items.filter(
      (item) => item.milestone === milestone.id,
    );
    lines.push(
      `| ${milestone.id} | ${milestone.title} | ${items.filter((item) => item.status === "complete").length} / ${items.length} |`,
    );
  }
  lines.push(
    "",
    "Select one prerequisite-ready item. Execute every criterion with proper tests; then challenge the delivered behavior in a separate critical pass with distinct tests. Repair findings when needed. Two unsuccessful attempts require broad diagnosis before more local retries. Preserve earlier partial evidence. The sixteen late scenarios are optional; browser semantics are required and native screen-reader evaluation remains excluded. Wave 7/8 stay blocked until all required functions pass and the user accepts the exact candidate.",
    "",
    "<!-- A1-SYNC:END -->",
  );
  return lines.join("\n");
}

export const roadmaps = [
  "ROADMAP.md",
  "implementation_roadmap.md",
  "design_implementation_roadmap.md",
  "reports/FRONTEND-ADAPTATION-MILESTONE.md",
  "reports/UX-BACKEND-HANDOFF.md",
  "reports/UX-RUNTIME-ARCHITECTURE-DISPOSITION.md",
  "WAVE_HANDOFF_AUTOMATION.md",
];
export const mirrorFiles = [
  "scripts/a1/contract-reconciliation.test.mjs",
  "scripts/a1/contract-reconciliation.critical.test.mjs",
  "scripts/a1/accounting.test.mjs",
  "scripts/a1/accounting.critical.test.mjs",
  ...[
    "FE-A1.0-W01",
    "FE-A1.0-W02",
    "FE-A1.0-W03",
    "FE-A1.0-W04",
    "FE-A1.0-W05",
    "FE-A1.0-W06",
    "FE-A1.6-W07",
  ].flatMap((id) =>
    ["execution", "critical"].map(
      (pass) => `reports/a1-plans/${id}-${pass}.json`,
    ),
  ),
  "package.json",
  "package-lock.json",
  "scripts/frontend-a1-work-inventory.json",
  "scripts/frontend-a1-process.mjs",
  "scripts/frontend-a1-execute.mjs",
  "scripts/frontend-a1-process.test.mjs",
  "scripts/frontend-a1-process.critical.test.mjs",
  "scripts/frontend-a1-test-fixture.mjs",
  "scripts/audit-frontend-a1.mjs",
  "scripts/audit-frontend-a1.test.mjs",
  "scripts/wave-handoff.mjs",
  "scripts/frontend-a1-execution.md",
  "decisions/D024-agentic-split-workspace.md",
  "decisions/D025-contract-ledger-and-two-pass-delivery.md",
  "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md",
  "reports/FE-A1-EVIDENCE-INDEX.json",
  ...roadmaps,
];
export function assertExecutionMirrors(
  root,
  mirrorRoots = [counterpartRoot(root)],
) {
  for (const mirrorRoot of mirrorRoots)
    for (const path of mirrorFiles) {
      const own = safePath(root, path),
        other = safePath(mirrorRoot, path);
      check(
        digest(readFileSync(own)) === digest(readFileSync(other)),
        `A1 roadmap/execution drift in ${mirrorRoot}: ${path}`,
      );
    }
}

export const counterpartRoot = (root) =>
  resolve(
    root,
    basename(root) === "petra-design" ? "../petra" : "../petra-design",
  );

export function assertRoadmapBindings(data, root) {
  const normalize = (value) =>
    value
      .replace(/\|\s*-+\s*/g, "|-")
      .replace(/\s+/g, " ")
      .trim();
  for (const path of roadmaps) {
    let expected = roadmapBlock(data);
    if (path.startsWith("reports/"))
      expected = expected
        .replace(/\]\(scripts\//g, "](../scripts/")
        .replace(/\]\(reports\//g, "](");
    const content = readFileSync(safePath(root, path), "utf8");
    const actual = content.match(
      /<!-- A1-SYNC:START -->[\s\S]*?<!-- A1-SYNC:END -->/,
    )?.[0];
    check(
      actual && normalize(actual) === normalize(expected),
      `Roadmap synchronization is stale: ${path}`,
    );
  }
}
