import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { repositoryRoot } from "../audit-frontend-a1.mjs";
export function ownedPostgres() {
  const project = `petra-a1-owner-${process.pid}-${Date.now()}`;
  const args = [
    "compose",
    "--project-name",
    project,
    "--file",
    resolve(repositoryRoot, "infra/postgres/integration.compose.yaml"),
  ];
  const run = (more) => {
    const result = spawnSync("docker", [...args, ...more], {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    });
    assert.equal(
      result.status,
      0,
      `Disposable PostgreSQL command failed: ${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
    return result.stdout;
  };
  const close = () => run(["down", "--volumes", "--remove-orphans"]);
  try {
    run(["up", "--detach", "--wait", "postgres"]);
    const migration = run(["run", "--rm", "migrations", "migrate"]),
      validation = run(["run", "--rm", "migrations", "validate"]);
    assert.match(migration, /version v068/u);
    assert.match(validation, /Successfully validated 68 migrations/u);
    console.log(
      "Fresh isolated PostgreSQL applied and validated all 68 migrations.",
    );
    const port = run(["port", "postgres", "5432"]).match(/:(\d+)\s*$/u)?.[1];
    assert(port);
    process.env.PETRA_TEST_POSTGRES_URL = `postgresql://petra:petra-m12-integration-only@127.0.0.1:${port}/petra`;
    return { close };
  } catch (error) {
    close();
    throw error;
  }
}
