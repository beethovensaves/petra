import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modelRoot = resolve(repositoryRoot, ".cache/docling/models");
const manifest = JSON.parse(
  readFileSync(
    resolve(
      repositoryRoot,
      "workers/science/model-manifests/docling-standard-pdf-2.121.0.json",
    ),
    "utf8",
  ),
);
const checkOnly = process.argv.includes("--check");

if (!checkOnly) {
  const result = spawnSync(
    "uv",
    [
      "run",
      "--project",
      "workers/science",
      ...manifest.acquisition_command,
      "--output-dir",
      modelRoot,
    ],
    {
      cwd: repositoryRoot,
      env: { ...process.env, UV_CACHE_DIR: ".cache/uv" },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const failures = [];
for (const expected of manifest.required_files) {
  const path = resolve(modelRoot, expected.path);
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch {
    failures.push(`${expected.path} is missing.`);
    continue;
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== expected.sha256) {
    failures.push(
      `${expected.path} has SHA-256 ${digest}; expected ${expected.sha256}.`,
    );
  }
}
if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}
console.log(
  `Verified ${manifest.required_files.length} Docling model assets for ${manifest.recipe}.`,
);
