import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PetraContractRegistry } from "../packages/contracts/dist/validator.js";
import { InMemoryDocumentRegistry } from "../packages/core/dist/document-registry.js";
import { canonicalize } from "json-canonicalize";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputRoot = resolve(
  repositoryRoot,
  process.argv[2] ?? "fixtures/full-text/fair-guiding-principles",
);
const outputRoot = resolve(repositoryRoot, process.argv[3] ?? "");
if (process.argv[3] === undefined) {
  throw new Error(
    "Usage: node scripts/verify-document-worker-output.mjs INPUT_ROOT OUTPUT_ROOT",
  );
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const canonicalHash = (value) => sha256(Buffer.from(canonicalize(value)));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const safeOutputPath = (handle) => {
  assert(handle.startsWith("output:"), `Invalid output handle ${handle}.`);
  const relative = handle.slice("output:".length);
  assert(!isAbsolute(relative), `Output handle ${handle} must be relative.`);
  const candidate = resolve(outputRoot, relative);
  assert(
    candidate.startsWith(`${outputRoot}/`),
    `Output handle ${handle} leaves its attempt root.`,
  );
  return candidate;
};

const contracts = new PetraContractRegistry();
const inputManifest = readJson(
  resolve(inputRoot, "records/worker-input-manifest.json"),
);
const outputManifest = readJson(
  resolve(outputRoot, "worker-output-manifest.json"),
);
const bundle = readJson(resolve(outputRoot, "document-parse-bundle.json"));
const sourceArtifact = readJson(resolve(inputRoot, "records/artifact.json"));
const sourceArtifactManifest = readJson(
  resolve(inputRoot, "records/artifact-manifest.json"),
);
const rightsDecision = readJson(
  resolve(inputRoot, "records/rights-decision.json"),
);
const workVersion = readJson(resolve(inputRoot, "records/work-version.json"));
const fixture = readJson(resolve(inputRoot, "source-manifest.json"));

contracts.assertValid("worker-input-manifest", "1.0.0", inputManifest);
contracts.assertValid("worker-output-manifest", "1.0.0", outputManifest);
contracts.assertValid("document-parse-bundle", "1.0.0", bundle);
assert(
  canonicalHash(inputManifest.content) === inputManifest.content_hash,
  "Worker input content hash mismatch.",
);
assert(
  canonicalHash(outputManifest.content) === outputManifest.content_hash,
  "Worker output content hash mismatch.",
);
assert(
  outputManifest.worker_input_manifest_hash === inputManifest.content_hash,
  "Worker output does not identify the exact worker input content.",
);
assert(
  outputManifest.content.outcome.outcome_kind === "succeeded",
  "The worker attempt did not succeed.",
);
assert(
  outputManifest.content.network_activity.length === 0 &&
    outputManifest.content.resource_usage.network_bytes === 0,
  "The local parser attempt reported network activity.",
);

const expectedByName = new Map(
  inputManifest.content.expected_outputs.map((output) => [
    output.output_name,
    output,
  ]),
);
const produced = outputManifest.content.outcome.produced_outputs;
assert(
  new Set(produced.map((output) => output.output_name)).size ===
    produced.length,
  "The worker output manifest repeats an output slot.",
);
for (const output of produced) {
  const expected = expectedByName.get(output.output_name);
  assert(expected !== undefined, `Unexpected output ${output.output_name}.`);
  assert(
    expected.output_role === output.output_role &&
      expected.media_type === output.media_type,
    `Output ${output.output_name} changed its manifested role or media type.`,
  );
  assert(
    (expected.contract === undefined && output.contract === undefined) ||
      (expected.contract !== undefined &&
        output.contract !== undefined &&
        canonicalize(expected.contract) === canonicalize(output.contract)),
    `Output ${output.output_name} changed its contract identity.`,
  );
  const bytes = readFileSync(safeOutputPath(output.output_handle));
  assert(
    bytes.byteLength === output.byte_size,
    `${output.output_name} size mismatch.`,
  );
  assert(
    sha256(bytes) === output.content_hash,
    `${output.output_name} hash mismatch.`,
  );
  assert(
    bytes.byteLength <= expected.max_bytes,
    `${output.output_name} exceeds its slot limit.`,
  );
}
for (const expected of expectedByName.values()) {
  assert(
    !expected.required ||
      produced.some((output) => output.output_name === expected.output_name),
    `Required output ${expected.output_name} is absent.`,
  );
}

const nativeOutput = produced.find(
  (output) => output.output_name === "docling_document",
);
assert(nativeOutput !== undefined, "The native Docling output is absent.");
JSON.parse(
  gunzipSync(readFileSync(safeOutputPath(nativeOutput.output_handle))),
);

assert(
  bundle.source_artifact_manifest_id ===
    sourceArtifactManifest.artifact_manifest_id &&
    bundle.rights_decision_id === rightsDecision.rights_decision_id &&
    bundle.document.source_artifact_id === sourceArtifact.artifact_id &&
    bundle.document.source_artifact_content_hash ===
      sourceArtifact.content_hash &&
    bundle.document.work_version_id === workVersion.work_version_id,
  "The parse bundle leaves its manifested authority chain.",
);
assert(
  bundle.document.block_ids.length === bundle.blocks.length &&
    bundle.spans.length === bundle.blocks.length,
  "The parse bundle does not declare a one-span structural chain.",
);

const parserArtifact = {
  artifact_id: bundle.document.parser_output_artifact_id,
  content_hash: nativeOutput.content_hash,
};
const artifacts = new Map([
  [sourceArtifact.artifact_id, { artifact: sourceArtifact }],
  [parserArtifact.artifact_id, { artifact: parserArtifact }],
]);
const documents = new InMemoryDocumentRegistry({
  getByArtifactId: (artifactId) => artifacts.get(artifactId),
});
documents.registerParsedDocument(bundle.document);
for (const block of bundle.blocks) documents.registerStructuralBlock(block);
for (const span of bundle.spans) documents.attachSourceSpan(span);

for (const target of fixture.source_span_targets) {
  const block = bundle.blocks.find(
    (candidate) =>
      candidate.content.content_kind === "text" &&
      candidate.content.text.includes(target.exact_text) &&
      candidate.page_locations.some(
        (location) => location.page_number === target.page_number,
      ),
  );
  assert(
    block !== undefined,
    `Source target ${target.target_id} was not grounded.`,
  );
  const span = bundle.spans.find(
    (candidate) => candidate.structural_block_id === block.structural_block_id,
  );
  assert(
    span !== undefined,
    `Source target ${target.target_id} has no SourceSpan.`,
  );
  assert(
    span.selector.components.some(
      (component) =>
        component.component_kind === "page_region" &&
        component.page_region.page_number === target.page_number &&
        component.page_region.regions.length > 0,
    ),
    `Source target ${target.target_id} has no page geometry.`,
  );
}

console.log(
  JSON.stringify(
    {
      outcome: "accepted_for_quarantine",
      quality_state: bundle.document.quality_state,
      page_count: bundle.document.pages.length,
      block_count: documents.blockCount,
      span_count: documents.spanCount,
      diagnostic_codes: [
        ...new Set(bundle.diagnostics.map(({ code }) => code)),
      ],
      source_targets_grounded: fixture.source_span_targets.map(
        ({ target_id }) => target_id,
      ),
      network_activity_count: outputManifest.content.network_activity.length,
    },
    null,
    2,
  ),
);
