import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { canonicalize } from "json-canonicalize";

import { PetraContractRegistry } from "../src/validator.js";

interface FixtureManifest {
  source_scope: string;
  scholarly_status: {
    doi: string;
    publication_status: string;
  };
  acquisition: {
    pdf_path: string;
    byte_size: number;
    sha256: string;
    page_count: number;
  };
  metadata_observation: {
    response_path: string;
    sha256: string;
  };
  rights_evidence: {
    license_identifier: string;
    redistribution_permitted_with_attribution: boolean;
    remote_model_egress_enabled: boolean;
  };
  layout_targets: Array<{ target_id: string; page_number: number }>;
  source_span_targets: Array<{
    target_id: string;
    claim_role: string;
    page_number: number;
    exact_text: string;
  }>;
  generated_records: { files: string[] };
}

const fixtureRoot = new URL(
  "../../../fixtures/full-text/fair-guiding-principles/",
  import.meta.url,
);
const readJson = <Value>(path: string): Value =>
  JSON.parse(readFileSync(new URL(path, fixtureRoot), "utf8")) as Value;
const digest = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const canonicalHash = (value: unknown): string =>
  `sha256:${digest(Buffer.from(canonicalize(value), "utf8"))}`;
const manifest = readJson<FixtureManifest>("source-manifest.json");
const registry = new PetraContractRegistry();

describe("M1.4 lawful full-text calibration fixture", () => {
  it("freezes the exact openly licensed publisher PDF and metadata observation", () => {
    const pdf = readFileSync(
      new URL(manifest.acquisition.pdf_path, fixtureRoot),
    );
    const crossref = readFileSync(
      new URL(manifest.metadata_observation.response_path, fixtureRoot),
    );

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBe(manifest.acquisition.byte_size);
    expect(digest(pdf)).toBe(manifest.acquisition.sha256);
    expect(digest(crossref)).toBe(manifest.metadata_observation.sha256);
    expect(manifest.source_scope).toBe("full_text");
    expect(manifest.scholarly_status.publication_status).toBe("peer_reviewed");
    expect(manifest.rights_evidence).toMatchObject({
      license_identifier: "CC-BY-4.0",
      redistribution_permitted_with_attribution: true,
      remote_model_egress_enabled: false,
    });
  });

  it("validates every generated Petra record and preserves cross-record identity", () => {
    const actor = readJson<Record<string, unknown>>("records/actor.json");
    const authors = readJson<Array<Record<string, unknown>>>(
      "records/authors.json",
    );
    const work = readJson<{
      work_id: string;
      author_credits: Array<{ author_id: string; position: number }>;
    }>("records/work.json");
    const workVersion = readJson<{
      work_id: string;
      work_version_id: string;
      publication_status: string;
    }>("records/work-version.json");
    const artifact = readJson<{
      artifact_id: string;
      content_hash: string;
      byte_size: number;
    }>("records/artifact.json");
    const artifactManifest = readJson<{
      artifact_id: string;
      rights_decision_id: string;
      origin: { work_version_id: string };
      storage_ref: { content_hash: string };
    }>("records/artifact-manifest.json");
    const rightsDecision = readJson<{
      rights_decision_id: string;
      artifact_manifest_id: string;
      permissions: { parse: boolean; send_selected_text_remotely: boolean };
    }>("records/rights-decision.json");
    const externalIdentifiers = readJson<Array<Record<string, unknown>>>(
      "records/external-identifiers.json",
    );

    registry.assertValid("actor", "1.0.0", actor);
    for (const author of authors) {
      registry.assertValid("author", "1.0.0", author);
    }
    registry.assertValid("work", "1.0.0", work);
    registry.assertValid("work-version", "1.0.0", workVersion);
    registry.assertValid("artifact", "1.0.0", artifact);
    registry.assertValid("artifact-manifest", "1.0.0", artifactManifest);
    registry.assertValid("rights-decision", "1.0.0", rightsDecision);
    for (const identifier of externalIdentifiers) {
      registry.assertValid("external-identifier", "1.0.0", identifier);
    }

    expect(authors).toHaveLength(53);
    expect(new Set(authors.map((author) => author.author_id)).size).toBe(53);
    expect(work.author_credits).toEqual(
      authors.map((author, index) => ({
        author_id: author.author_id,
        position: index + 1,
        credit_role: "author",
        ...(index === authors.length - 1 ? { corresponding: true } : {}),
      })),
    );
    expect(workVersion.work_id).toBe(work.work_id);
    expect(workVersion.publication_status).toBe("peer_reviewed");
    expect(artifactManifest.origin.work_version_id).toBe(
      workVersion.work_version_id,
    );
    expect(artifactManifest.artifact_id).toBe(artifact.artifact_id);
    expect(artifactManifest.storage_ref.content_hash).toBe(
      artifact.content_hash,
    );
    expect(artifact.byte_size).toBe(manifest.acquisition.byte_size);
    expect(rightsDecision.rights_decision_id).toBe(
      artifactManifest.rights_decision_id,
    );
    expect(rightsDecision.permissions).toMatchObject({
      parse: true,
      send_selected_text_remotely: false,
    });
  });

  it("binds the parser job to exact records, bytes, limits, and local execution", () => {
    const artifact = readJson<Record<string, unknown>>("records/artifact.json");
    const artifactManifest = readJson<Record<string, unknown>>(
      "records/artifact-manifest.json",
    );
    const rightsDecision = readJson<Record<string, unknown>>(
      "records/rights-decision.json",
    );
    const workVersion = readJson<Record<string, unknown>>(
      "records/work-version.json",
    );
    const workerInput = readJson<{
      content: {
        worker: { entrypoint: string };
        inputs: Array<{
          binding_kind: string;
          name: string;
          snapshot_hash?: string;
        }>;
        expected_outputs: Array<{
          output_name: string;
          contract?: { schema_hash: string };
        }>;
        resource_limits: { max_parallelism: number };
        network_policy: { network_mode: string };
      };
      content_hash: string;
    }>("records/worker-input-manifest.json");
    const bindingIndex = readJson<{
      binding_index_version: string;
      bindings: Record<string, string>;
    }>("records/worker-input-bindings.json");

    registry.assertValid("worker-input-manifest", "1.0.0", workerInput);
    expect(workerInput.content_hash).toBe(canonicalHash(workerInput.content));
    expect(workerInput.content.worker.entrypoint).toBe(
      "petra_science.document_worker:main",
    );
    expect(workerInput.content.network_policy.network_mode).toBe("blocked");
    expect(workerInput.content.resource_limits.max_parallelism).toBe(1);
    expect(bindingIndex).toEqual({
      binding_index_version: "1.0.0",
      bindings: {
        source_pdf: manifest.acquisition.pdf_path,
        source_artifact: "records/artifact.json",
        source_artifact_manifest: "records/artifact-manifest.json",
        rights_decision: "records/rights-decision.json",
        work_version: "records/work-version.json",
      },
    });

    const records = new Map([
      ["source_artifact", artifact],
      ["source_artifact_manifest", artifactManifest],
      ["rights_decision", rightsDecision],
      ["work_version", workVersion],
    ]);
    for (const input of workerInput.content.inputs) {
      if (input.binding_kind !== "record") continue;
      expect(input.snapshot_hash).toBe(canonicalHash(records.get(input.name)));
    }
    const bundleOutput = workerInput.content.expected_outputs.find(
      (output) => output.output_name === "document_parse_bundle",
    );
    expect(bundleOutput?.contract?.schema_hash).toBe(
      registry.entries.find(
        (entry) =>
          entry.name === "document-parse-bundle" && entry.version === "1.0.0",
      )?.canonical_sha256,
    );
    expect(manifest.generated_records.files).toContain(
      "worker-input-manifest.json",
    );
    expect(manifest.generated_records.files).toContain(
      "worker-input-bindings.json",
    );
  });

  it("freezes layout and broad-claim/qualification judgments for parser evaluation", () => {
    expect(manifest.acquisition.page_count).toBe(9);
    expect(manifest.layout_targets.map((target) => target.target_id)).toEqual([
      "box-1-terms-and-abbreviations",
      "box-2-fair-guiding-principles",
      "article-body-columns",
    ]);
    expect(
      manifest.layout_targets.every((target) => target.page_number > 0),
    ).toBe(true);
    expect(
      manifest.source_span_targets.map((target) => target.claim_role),
    ).toEqual(["broad_claim", "qualification"]);
    expect(
      manifest.source_span_targets.every(
        (target) => target.page_number > 0 && target.exact_text.length > 0,
      ),
    ).toBe(true);
  });
});
