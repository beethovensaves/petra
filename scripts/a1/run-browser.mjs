import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
export function runBrowser(path, expected) {
  const result = spawnSync(process.execPath, [path], {
    encoding: "utf8",
    timeout: 240000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  assert.equal(
    result.status,
    0,
    `The actual browser did not complete ${path}: ${result.error?.message ?? ""}`,
  );
  assert(
    (result.stdout ?? "").includes(expected),
    "The browser must report its actually reached outcome.",
  );
}
