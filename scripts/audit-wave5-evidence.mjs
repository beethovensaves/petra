import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  root,
  "reports/WAVE5-EXECUTED-EVIDENCE-INVENTORY.json",
);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const evidenceKey = (record) => `${record.evidence_id}/${record.scenario_id}`;
const git = (args, encoding = "utf8") => {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    maxBuffer: 20 * 1024 * 1024,
  });
  return result;
};
const checkedGit = (args, encoding = "utf8") => {
  const result = git(args, encoding);
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${String(result.stderr).trim()}`,
    );
  }
  return result.stdout;
};

const commonGitDir = String(
  checkedGit(["rev-parse", "--git-common-dir"]),
).trim();
const authorityRoot = dirname(resolve(root, commonGitDir));
const statePath =
  process.env.PETRA_WAVE5_STATE?.trim() ||
  resolve(authorityRoot, ".codex-wave-handoff/wave-5/state.json");
const planPath = resolve(root, "scripts/wave-handoff-wave-5.evidence.json");
const planBytes = readFileSync(planPath);
const stateBytes = readFileSync(statePath);
const plan = JSON.parse(planBytes);
const state = JSON.parse(stateBytes);
const packageScripts = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
).scripts;
const sourcePaths = [
  "scripts/wave-handoff-wave-5.md",
  "scripts/wave-handoff-wave-5.evidence.json",
  "ROADMAP.md",
  "implementation_roadmap.md",
  "design_implementation_roadmap.md",
  "PETRA.md",
];
const errors = [];
const warnings = [];
const checks = [];
const stateRecords = state.evidence ?? [];
const recordsByKey = new Map();

for (const record of stateRecords) {
  const key = evidenceKey(record);
  const records = recordsByKey.get(key) ?? [];
  records.push(record);
  recordsByKey.set(key, records);
}

const requiredKeys = new Set(plan.required.map(evidenceKey));
for (const key of recordsByKey.keys()) {
  if (!requiredKeys.has(key))
    errors.push(`${key}: unexpected evidence record.`);
}

for (const requirement of plan.required) {
  const key = evidenceKey(requirement);
  const matches = recordsByKey.get(key) ?? [];
  if (matches.length !== 1) {
    errors.push(`${key}: expected one state record, found ${matches.length}.`);
    continue;
  }
  const record = matches[0];
  const recordErrors = [];
  const recordWarnings = [];
  if (record.status !== "passed") recordErrors.push("state is not passed");
  if (record.role !== requirement.owner)
    recordErrors.push(
      `owner ${record.role ?? "missing"} differs from ${requirement.owner}`,
    );
  if (typeof record.command !== "string" || record.command.trim() === "")
    recordErrors.push("command is missing");
  const npmScript = /(?:^|\s)npm run ([a-zA-Z0-9:_-]+)/u.exec(
    record.command ?? "",
  )?.[1];
  if (npmScript !== undefined && packageScripts[npmScript] === undefined)
    recordErrors.push(`npm script ${npmScript} is not registered`);
  if (!/^[0-9a-f]{40}$/u.test(record.commit ?? ""))
    recordErrors.push("commit is not an exact 40-character Git identity");
  else if (git(["cat-file", "-e", `${record.commit}^{commit}`]).status !== 0)
    recordErrors.push("commit is unavailable in the shared repository");
  else {
    const branch =
      requirement.owner === "backend" ? "origin/main" : "origin/design/m1-ux";
    if (
      git(["merge-base", "--is-ancestor", record.commit, branch]).status !== 0
    )
      recordErrors.push(`commit is not reachable from ${branch}`);
  }
  const artifactMatch = /^([^\s].*?)(?: \(sha256 ([0-9a-f]{64})\))?$/u.exec(
    record.artifact ?? "",
  );
  let artifactPath;
  let artifactSha256;
  let artifactBoundary;
  if (artifactMatch === null)
    recordErrors.push("artifact reference is invalid");
  else if (/^[0-9a-f]{40}$/u.test(record.commit ?? "")) {
    artifactPath = artifactMatch[1];
    const shown = git(["show", `${record.commit}:${artifactPath}`], null);
    if (shown.status !== 0) {
      recordErrors.push("artifact is absent at the recorded commit");
    } else {
      const bytes = Buffer.from(shown.stdout);
      artifactSha256 = digest(bytes);
      if (artifactMatch[2] !== undefined && artifactMatch[2] !== artifactSha256)
        recordErrors.push(
          "annotated artifact hash does not match commit bytes",
        );
      try {
        const artifact = JSON.parse(bytes.toString("utf8"));
        if (artifact.status !== "passed" && artifact.status !== "pass")
          recordErrors.push("artifact root is not passed");
        const artifactMatches = (artifact.scenario_records ?? []).filter(
          (candidate) => evidenceKey(candidate) === key,
        );
        if (artifactMatches.length !== 1) {
          recordErrors.push(
            `artifact contains ${artifactMatches.length} matching scenario records`,
          );
        } else {
          const artifactRecord = artifactMatches[0];
          if (artifactRecord.status !== "passed")
            recordErrors.push("artifact scenario is not passed");
          artifactBoundary = artifactRecord.boundary;
          if (
            typeof artifactBoundary !== "string" ||
            artifactBoundary.trim() === ""
          )
            recordWarnings.push(
              "artifact scenario relies on the controller-state boundary and shared artifact limitations",
            );
          if (
            typeof record.boundary !== "string" ||
            record.boundary.trim() === ""
          )
            recordErrors.push("state scenario boundary is missing");
        }
      } catch (error) {
        recordErrors.push(
          `artifact is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  errors.push(...recordErrors.map((message) => `${key}: ${message}.`));
  warnings.push(...recordWarnings.map((message) => `${key}: ${message}.`));
  checks.push({
    evidence_id: requirement.evidence_id,
    scenario_id: requirement.scenario_id,
    owner: requirement.owner,
    status: recordErrors.length === 0 ? "passed" : "failed",
    command: record.command,
    artifact: artifactPath ?? record.artifact,
    artifact_sha256: artifactSha256,
    commit: record.commit,
    state_boundary: record.boundary,
    artifact_boundary: artifactBoundary,
    warnings: recordWarnings,
  });
}

const source_documents = sourcePaths.map((path) => {
  const bytes = readFileSync(resolve(root, path));
  return { path, sha256: digest(bytes) };
});
const result = {
  schema_name: "petra.wave5-executed-evidence-inventory",
  schema_version: "1.0.0",
  wave: 5,
  status: errors.length === 0 ? "passed" : "failed",
  audited_at: new Date().toISOString(),
  command: "npm run audit:wave5:evidence",
  plan_sha256: digest(planBytes),
  state_sha256: digest(stateBytes),
  state_position: {
    slice_count: state.slice_count,
    max_slices: state.max_slices,
    recorded_scenarios: stateRecords.length,
  },
  summary: {
    required_scenarios: plan.required.length,
    passed_scenarios: checks.filter(({ status }) => status === "passed").length,
    failed_scenarios: checks.filter(({ status }) => status === "failed").length,
    duplicate_or_unexpected_records: errors.filter((error) =>
      /expected one|unexpected/u.test(error),
    ).length,
    warning_records: checks.filter(({ warnings }) => warnings.length > 0)
      .length,
  },
  source_documents,
  scenario_records: checks,
  errors,
  warnings,
};
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(
  `Wave 5 evidence inventory: ${result.status}; ${result.summary.passed_scenarios}/${result.summary.required_scenarios} scenario records verified.\n`,
);
if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exitCode = 1;
}
