import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRelative = "fixtures/full-text/fair-guiding-principles";
const fixtureRoot = resolve(repositoryRoot, fixtureRelative);
const contractsRoot = resolve(repositoryRoot, "packages/contracts");
const modelsRoot = resolve(repositoryRoot, ".cache/docling/models");
const temporaryRoot = mkdtempSync(
  join(tmpdir(), "petra-evidence-proposal-integration-"),
);
const outputRoot = resolve(temporaryRoot, "worker-output");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const run = (command, commandArguments) => {
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
    stdio: "inherit",
  });
  if (result.error !== undefined) throw result.error;
  return result;
};

const workerArguments = [
  "run",
  "--project",
  "workers/science",
  "petra-document-worker",
  "--contracts-root",
  contractsRoot,
  "--input-root",
  fixtureRoot,
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

const pageNumbers = (span) =>
  span.selector.components.flatMap((component) =>
    component.component_kind === "page_region"
      ? [component.page_region.page_number]
      : [],
  );

try {
  let result = run(process.execPath, [
    "scripts/prepare-docling-models.mjs",
    "--check",
  ]);
  assert(result.status === 0, "Pinned Docling model verification failed.");
  result = run("npm", ["run", "build:packages"]);
  assert(result.status === 0, "TypeScript package build failed.");
  result = run("uv", workerArguments);
  assert(result.status === 0, "The lawful FAIR paper did not parse.");
  result = run(process.execPath, [
    "scripts/verify-document-worker-output.mjs",
    fixtureRelative,
    outputRoot,
  ]);
  assert(
    result.status === 0,
    "The TypeScript document boundary rejected the parsed paper.",
  );

  const {
    InMemoryEvidenceRegistry,
    admitEvidenceProposalBundle,
    buildDeterministicEvidenceProposalBundle,
  } = await import("../packages/core/dist/index.js");
  const { PetraContractRegistry } =
    await import("../packages/contracts/dist/validator.js");
  const parseBundle = readJson(
    resolve(outputRoot, "document-parse-bundle.json"),
  );
  const fixture = readJson(resolve(fixtureRoot, "source-manifest.json"));
  const actor = readJson(resolve(fixtureRoot, "records/actor.json"));
  const workerInput = readJson(
    resolve(fixtureRoot, "records/worker-input-manifest.json"),
  );
  const targetById = new Map(
    fixture.source_span_targets.map((target) => [target.target_id, target]),
  );
  const primary = targetById.get("broad-machine-actionability-claim");
  const qualification = targetById.get("principles-not-standard-qualification");
  assert(primary !== undefined, "The primary fixture target is absent.");
  assert(
    qualification !== undefined,
    "The qualification fixture target is absent.",
  );

  const proposal = buildDeterministicEvidenceProposalBundle(parseBundle, {
    recipe_name: "petra-fair-calibration-mapper",
    recipe_version: "1.0.0",
    project_id: workerInput.project_id,
    created_by: {
      actor_id: actor.actor_id,
      actor_kind: actor.actor_kind,
    },
    created_at: "2026-09-02T20:10:00.000Z",
    candidates: [
      {
        candidate_key: primary.target_id,
        proposal_role: "primary",
        source: {
          selection_kind: "exact_text",
          exact_text: primary.exact_text,
          page_number: primary.page_number,
        },
        canonical_text:
          "The FAIR Principles emphasize enabling machines to find and use data automatically.",
        claim_kind: "descriptive",
        scope: {
          outcome: {
            description: "Machine ability to find and use data automatically",
            entity_refs: [],
          },
          setting: {
            description: "Scientific data management and stewardship",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "intervention_or_exposure",
            "comparator",
            "temporal_boundary",
          ],
        },
        detail_level: "broad",
        source_stance: "states",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: false,
      },
      {
        candidate_key: qualification.target_id,
        proposal_role: "qualification",
        source: {
          selection_kind: "exact_text",
          exact_text: qualification.exact_text,
          page_number: qualification.page_number,
        },
        canonical_text:
          "The FAIR Principles are not themselves a standard or specification.",
        claim_kind: "descriptive",
        scope: {
          intervention_or_exposure: {
            description: "The FAIR Principles",
            entity_refs: [],
          },
          outcome: {
            description: "Status as a formal standard or specification",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "comparator",
            "setting",
            "temporal_boundary",
          ],
        },
        detail_level: "detailed",
        source_stance: "qualifies",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: true,
      },
      {
        candidate_key: "fabricated-guarantee-negative-control",
        proposal_role: "negative_control",
        source: {
          selection_kind: "explicit_span",
          exact_text:
            "The FAIR Principles guarantee reproducible scientific results.",
          source_span_ids: ["source_span_00000000000000000000000000"],
        },
        canonical_text:
          "Following the FAIR Principles guarantees reproducible scientific results.",
        claim_kind: "causal",
        scope: {
          intervention_or_exposure: {
            description: "Following the FAIR Principles",
            entity_refs: [],
          },
          outcome: {
            description: "Reproducible scientific results",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "comparator",
            "setting",
            "temporal_boundary",
          ],
        },
        detail_level: "detailed",
        source_stance: "reports",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: false,
      },
    ],
  });
  new PetraContractRegistry().assertValid(
    "evidence-proposal-bundle",
    "1.0.0",
    proposal,
  );

  const evidence = new InMemoryEvidenceRegistry({
    getSourceSpan: (sourceSpanId) =>
      parseBundle.spans.find((span) => span.source_span_id === sourceSpanId),
    getParsedDocument: (parsedDocumentId) =>
      parseBundle.document.parsed_document_id === parsedDocumentId
        ? parseBundle.document
        : undefined,
  });
  const admission = admitEvidenceProposalBundle(
    proposal,
    parseBundle,
    evidence,
  );
  assert(
    admission.admitted_count === 2 && admission.rejected_count === 1,
    "Expected two grounded candidates and one rejected negative control.",
  );
  const rejected = admission.candidates.find(
    (candidate) => candidate.outcome === "rejected",
  );
  assert(
    rejected?.error_code === "SOURCE_SPAN_NOT_IN_BUNDLE",
    "The fabricated span was not rejected at the admission boundary.",
  );

  const grounded = proposal.content.candidates
    .filter((candidate) => candidate.proposal_role !== "negative_control")
    .map((candidate) => {
      const span = parseBundle.spans.find(
        (value) =>
          value.source_span_id === candidate.source_quote.source_span_ids[0],
      );
      assert(span !== undefined, "An admitted candidate lost its SourceSpan.");
      return {
        role: candidate.proposal_role,
        claim_id: candidate.claim.claim_id,
        source_span_id: span.source_span_id,
        pages: pageNumbers(span),
      };
    });
  assert(
    grounded.some(
      (candidate) =>
        candidate.role === "primary" && candidate.pages.includes(1),
    ) &&
      grounded.some(
        (candidate) =>
          candidate.role === "qualification" && candidate.pages.includes(5),
      ),
    "The admitted evidence did not preserve the expected page provenance.",
  );

  console.log(
    JSON.stringify(
      {
        proposal_bundle_id: proposal.evidence_proposal_bundle_id,
        source_document_id: parseBundle.document.parsed_document_id,
        source_quality_state: parseBundle.document.quality_state,
        admitted_count: admission.admitted_count,
        rejected_count: admission.rejected_count,
        grounded,
        negative_control: {
          error_code: rejected.error_code,
          claim_persisted: evidence.getClaim(rejected.claim_id) !== undefined,
        },
        remote_model_calls: 0,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
