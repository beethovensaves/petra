import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalize } from "json-canonicalize";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRelative = "fixtures/full-text/fair-guiding-principles";
const fixtureRoot = resolve(repositoryRoot, fixtureRelative);
const contractsRoot = resolve(repositoryRoot, "packages/contracts");
const modelsRoot = resolve(repositoryRoot, ".cache/docling/models");
const temporaryRoot = mkdtempSync(join(tmpdir(), "petra-docling-integration-"));
const firstOutput = resolve(temporaryRoot, "first-output");
const secondOutput = resolve(temporaryRoot, "second-output");
const malformedRoot = resolve(temporaryRoot, "malformed-input");
const malformedOutput = resolve(temporaryRoot, "malformed-output");

const sha256 = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const canonicalHash = (value) => sha256(Buffer.from(canonicalize(value)));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const run = (command, commandArguments, options = {}) => {
  const result = spawnSync(command, commandArguments, {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      HF_HUB_OFFLINE: "1",
      PYTHONHASHSEED: "0",
      TRANSFORMERS_OFFLINE: "1",
      UV_CACHE_DIR: ".cache/uv",
    },
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.error !== undefined) throw result.error;
  return result;
};
const workerArguments = (inputRoot, outputRoot) => [
  "run",
  "--project",
  "workers/science",
  "petra-document-worker",
  "--contracts-root",
  contractsRoot,
  "--input-root",
  inputRoot,
  "--manifest",
  "records/worker-input-manifest.json",
  "--bindings",
  "records/worker-input-bindings.json",
  "--models",
  modelsRoot,
  "--output-root",
  outputRoot,
  "--attempt",
  "1",
];

try {
  let result = run(process.execPath, [
    "scripts/prepare-docling-models.mjs",
    "--check",
  ]);
  assert(result.status === 0, "Pinned Docling model verification failed.");
  result = run("npm", ["run", "build:packages"]);
  assert(result.status === 0, "TypeScript package build failed.");

  for (const outputRoot of [firstOutput, secondOutput]) {
    result = run("uv", workerArguments(fixtureRoot, outputRoot));
    assert(result.status === 0, "The lawful Docling fixture did not parse.");
    result = run(process.execPath, [
      "scripts/verify-document-worker-output.mjs",
      fixtureRelative,
      outputRoot,
    ]);
    assert(
      result.status === 0,
      "The TypeScript control-plane verifier rejected output.",
    );
  }

  const firstBundle = readJson(
    resolve(firstOutput, "document-parse-bundle.json"),
  );
  const secondBundle = readJson(
    resolve(secondOutput, "document-parse-bundle.json"),
  );
  assert(
    firstBundle.document.quality_state === "partial",
    "Expected partial parse.",
  );
  assert(
    firstBundle.diagnostics.some(
      ({ code }) => code === "READING_ORDER_GEOMETRY_CONFLICT",
    ),
    "The known Box 2 reading-order defect was not surfaced.",
  );
  assert(
    firstBundle.document.parsed_document_id ===
      secondBundle.document.parsed_document_id &&
      canonicalize(firstBundle.document.block_ids) ===
        canonicalize(secondBundle.document.block_ids) &&
      canonicalize(
        firstBundle.spans.map(({ source_span_id }) => source_span_id),
      ) ===
        canonicalize(
          secondBundle.spans.map(({ source_span_id }) => source_span_id),
        ),
    "Immutable input and parser identities did not produce stable Petra IDs.",
  );

  cpSync(fixtureRoot, malformedRoot, { recursive: true });
  const malformedPdf = Buffer.from(
    "%PDF-1.7\nPetra intentionally malformed calibration fixture.\n%%EOF\n",
  );
  const pdfPath = resolve(malformedRoot, "source/wilkinson-et-al-2016.pdf");
  writeFileSync(pdfPath, malformedPdf);
  const artifactPath = resolve(malformedRoot, "records/artifact.json");
  const artifactManifestPath = resolve(
    malformedRoot,
    "records/artifact-manifest.json",
  );
  const workerManifestPath = resolve(
    malformedRoot,
    "records/worker-input-manifest.json",
  );
  const artifact = readJson(artifactPath);
  const artifactManifest = readJson(artifactManifestPath);
  const workerManifest = readJson(workerManifestPath);
  artifact.content_hash = sha256(malformedPdf);
  artifact.byte_size = malformedPdf.byteLength;
  artifactManifest.storage_ref.content_hash = artifact.content_hash;
  artifactManifest.storage_ref.object_key = `sha256/${artifact.content_hash.slice(7)}`;
  for (const input of workerManifest.content.inputs) {
    if (input.name === "source_pdf") {
      input.content_hash = artifact.content_hash;
      input.byte_size = artifact.byte_size;
    } else if (input.name === "source_artifact") {
      input.snapshot_hash = canonicalHash(artifact);
    } else if (input.name === "source_artifact_manifest") {
      input.snapshot_hash = canonicalHash(artifactManifest);
    }
  }
  workerManifest.content_hash = canonicalHash(workerManifest.content);
  writeJson(artifactPath, artifact);
  writeJson(artifactManifestPath, artifactManifest);
  writeJson(workerManifestPath, workerManifest);

  result = run("uv", workerArguments(malformedRoot, malformedOutput), {
    capture: true,
  });
  assert(
    result.status === 1,
    "The malformed PDF was not rejected as a job failure.",
  );
  assert(
    !existsSync(resolve(malformedOutput, "document-parse-bundle.json")),
    "A malformed PDF produced a parse proposal.",
  );
  const failure = readJson(
    resolve(malformedOutput, "worker-output-manifest.json"),
  );
  assert(
    failure.content.outcome.outcome_kind === "worker_failed" &&
      failure.content.outcome.failure.code === "DOCLING_CONVERSION_FAILED" &&
      failure.content.outcome.produced_outputs.length === 0,
    "The malformed PDF did not produce the expected typed failure.",
  );
  assert(
    failure.content.network_activity.length === 0 &&
      failure.content.resource_usage.network_bytes === 0 &&
      canonicalHash(failure.content) === failure.content_hash,
    "The failed attempt violated its output-manifest boundary.",
  );

  console.log(
    JSON.stringify(
      {
        lawful_runs: 2,
        stable_document_identity: firstBundle.document.parsed_document_id,
        page_count: firstBundle.document.pages.length,
        block_count: firstBundle.blocks.length,
        span_count: firstBundle.spans.length,
        quality_state: firstBundle.document.quality_state,
        malformed_pdf_failure: failure.content.outcome.failure.code,
        remote_model_calls: 0,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
