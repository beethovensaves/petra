import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { repositoryRoot } from "../audit-frontend-a1.mjs";
export function runVitest(workspace, files, pattern, minimum = 1) {
  const result = spawnSync(
    "npm",
    [
      "test",
      "--workspace",
      workspace,
      "--",
      ...files,
      "--testNamePattern",
      pattern,
      "--reporter=verbose",
    ],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const output = stripVTControlCharacters(
    `${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
  console.log(output);
  assert.equal(
    result.status,
    0,
    "The underlying registered function tests failed.",
  );
  const count = Number(output.match(/Tests\s+(\d+)\s+passed/)?.[1] ?? 0);
  assert.ok(
    count >= minimum,
    "The selection must execute the named functions; an all-skipped suite is not evidence.",
  );
}
