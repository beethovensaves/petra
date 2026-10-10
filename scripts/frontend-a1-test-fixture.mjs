// Synthetic fixtures exercise the gate. They are never delivery evidence.
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  criterionIds,
  digest,
  itemContractHash,
  mirrorFiles,
  roadmaps,
} from "./frontend-a1-process.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ledger = () =>
  JSON.parse(
    readFileSync(join(repository, "scripts/frontend-a1-work-inventory.json")),
  );
export function fixture() {
  const parent = mkdtempSync(join(tmpdir(), "petra-a1-process-"));
  const root = join(parent, "main"),
    mirror = join(parent, "design");
  mkdirSync(root);
  mkdirSync(mirror);
  const data = ledger();
  data.work_items.forEach((item) => {
    item.status = "planned";
    item.completion_evidence = [];
    item.retained_evidence = [];
    item.historical_completion_evidence = [];
    item.execution_history = [];
    item.reopenings = [];
  });
  data.active_work = null;
  const item = data.work_items.find((entry) => entry.id === "FE-A1.0-W06");
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  for (const path of mirrorFiles)
    put(
      path,
      roadmaps.includes(path)
        ? "# Fixture roadmap\n"
        : readFileSync(join(repository, path)),
    );
  put(
    "test/execution.test.mjs",
    "import test from 'node:test'; test('execution outcome', () => {});\n",
  );
  put(
    "test/critical.test.mjs",
    "import test from 'node:test'; test('critical challenge', () => {});\n",
  );
  put(
    "implementation.txt",
    "Synthetic implementation fixture, not Petra product evidence.\n",
  );
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Petra gate fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Synthetic gate candidate",
  );
  const candidate = git("rev-parse", "HEAD");
  const refs = {};
  function proof(pass, modify = () => {}) {
    const name =
      pass === "execution" ? "execution outcome" : "critical challenge";
    const output = `TAP version 13\nok 1 - ${name}\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
    const log = `proof/${pass}.tap`;
    put(log, output);
    const value = {
      schema_name: "petra.a1-verification-pass",
      schema_version: "1.0.0",
      work_item: item.id,
      pass,
      contract_hash: itemContractHash(item),
      status: "passed",
      candidate_commit: candidate,
      started_at:
        pass === "execution" ? "2026-10-10T10:00:00Z" : "2026-10-10T10:01:00Z",
      finished_at:
        pass === "execution" ? "2026-10-10T10:00:01Z" : "2026-10-10T10:01:01Z",
      criteria: criterionIds(item).map((id) => ({
        id,
        result: "passed",
        observation: "Synthetic gate behavior checked for this criterion only.",
        test: name,
      })),
      sources: [
        "implementation.txt",
        "test/execution.test.mjs",
        "test/critical.test.mjs",
      ].map((path) => ({ path, hash: digest(readFileSync(join(root, path))) })),
      runs: [
        {
          argv: [
            "node",
            "--test",
            "--test-reporter=tap",
            `test/${pass}.test.mjs`,
          ],
          exit_code: 0,
          output: log,
          output_hash: digest(output),
        },
      ],
      boundary:
        "Synthetic unit gate fixture; establishes no product completion.",
      ...(pass === "critical"
        ? {
            review: {
              perspective:
                "Challenge false completion rather than normal success.",
              challenges: criterionIds(item).map((criterion) => ({
                criterion,
                question: "Can this criterion be bypassed?",
                result: "The challenged invalid state was rejected.",
              })),
              findings: [],
            },
          }
        : {}),
    };
    modify(value);
    const artifact = `proof/${pass}.json`;
    put(artifact, JSON.stringify(value));
    return (refs[pass] = {
      pass,
      artifact,
      command: value.runs[0].argv.join(" "),
      boundary: value.boundary,
    });
  }
  return {
    root,
    mirror,
    parent,
    data,
    item,
    put,
    git,
    candidate,
    proof,
    refs,
    cleanup: () => rmSync(parent, { recursive: true, force: true }),
  };
}
