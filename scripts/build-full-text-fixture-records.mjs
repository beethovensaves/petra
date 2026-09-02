import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = resolve(
  repositoryRoot,
  "fixtures/full-text/fair-guiding-principles",
);
const recordsRoot = resolve(fixtureRoot, "records");
const checkOnly = process.argv.includes("--check");
const base32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const createdAt = "2026-09-02T20:05:00.000Z";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const encodeBase32 = (number) => {
  let value = BigInt(number);
  let encoded = "";
  do {
    encoded = base32[Number(value % 32n)] + encoded;
    value /= 32n;
  } while (value > 0n);
  return encoded.padStart(20, "0");
};

const id = (kind, number) => `${kind}_01K45F${encodeBase32(number)}`;
const actorId = id("actor", 1);
const workId = id("work", 2);
const workVersionId = id("work_version", 3);
const artifactId = id("artifact", 4);
const artifactManifestId = id("artifact_manifest", 5);
const rightsDecisionId = id("rights_decision", 6);
const serviceActor = { actor_id: actorId, actor_kind: "service" };

const manifestPath = resolve(fixtureRoot, "source-manifest.json");
const manifest = readJson(manifestPath);
const pdfPath = resolve(fixtureRoot, manifest.acquisition.pdf_path);
const crossrefPath = resolve(
  fixtureRoot,
  manifest.metadata_observation.response_path,
);
const pdf = readFileSync(pdfPath);
const crossrefBytes = readFileSync(crossrefPath);
const crossref = JSON.parse(crossrefBytes.toString("utf8"));

const failures = [];
if (pdf.byteLength !== manifest.acquisition.byte_size) {
  failures.push(
    `PDF byte size ${pdf.byteLength} does not match ${manifest.acquisition.byte_size}.`,
  );
}
if (sha256(pdf) !== manifest.acquisition.sha256) {
  failures.push("PDF SHA-256 does not match the frozen acquisition manifest.");
}
if (sha256(crossrefBytes) !== manifest.metadata_observation.sha256) {
  failures.push(
    "Crossref response SHA-256 does not match the frozen manifest.",
  );
}
if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
  failures.push(
    "The acquired full-text fixture does not begin with a PDF header.",
  );
}
if (
  crossref.status !== "ok" ||
  crossref.message?.DOI !== manifest.scholarly_status.doi
) {
  failures.push("The Crossref observation does not identify the fixture DOI.");
}
if (
  !Array.isArray(crossref.message?.author) ||
  crossref.message.author.length === 0
) {
  failures.push("The Crossref observation does not contain author credits.");
}
if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

const authors = crossref.message.author.map((sourceAuthor, index) => ({
  schema_name: "petra.author",
  schema_version: "1.0.0",
  author_id: id("author", 100 + index),
  revision: 1,
  author_kind: "person",
  display_name: [sourceAuthor.given, sourceAuthor.family]
    .filter(Boolean)
    .join(" "),
  identity_status: "provisional",
  created_by: serviceActor,
  created_at: createdAt,
  updated_at: createdAt,
}));

const actor = {
  schema_name: "petra.actor",
  schema_version: "1.0.0",
  actor_id: actorId,
  actor_kind: "service",
  display_name: "Petra M1.4 fixture builder",
  created_at: createdAt,
};

const work = {
  schema_name: "petra.work",
  schema_version: "1.0.0",
  work_id: workId,
  revision: 1,
  title: manifest.scholarly_status.title,
  work_kind: "journal_article",
  identity_status: "provisional",
  author_credits: authors.map((author, index) => ({
    author_id: author.author_id,
    position: index + 1,
    credit_role: "author",
    ...(index === authors.length - 1 ? { corresponding: true } : {}),
  })),
  created_by: serviceActor,
  created_at: createdAt,
  updated_at: createdAt,
};

const workVersion = {
  schema_name: "petra.work-version",
  schema_version: "1.0.0",
  work_version_id: workVersionId,
  revision: 1,
  work_id: workId,
  version_label: manifest.scholarly_status.version_label,
  publication_status: manifest.scholarly_status.publication_status,
  published_date: {
    precision: "day",
    value: manifest.scholarly_status.published_date,
  },
  metadata_source: {
    source_kind: "registry",
    source_name: manifest.metadata_observation.provider,
    source_record_id: manifest.scholarly_status.doi,
  },
  metadata_retrieved_at: manifest.metadata_observation.retrieved_at,
  created_by: serviceActor,
  created_at: createdAt,
  updated_at: createdAt,
};

const contentHash = `sha256:${manifest.acquisition.sha256}`;
const artifact = {
  schema_name: "petra.artifact",
  schema_version: "1.0.0",
  artifact_id: artifactId,
  revision: 1,
  artifact_kind: "pdf",
  media_type: manifest.acquisition.media_type,
  content_hash: contentHash,
  byte_size: manifest.acquisition.byte_size,
  created_by: serviceActor,
  created_at: createdAt,
};

const artifactManifest = {
  schema_name: "petra.artifact-manifest",
  schema_version: "1.0.0",
  artifact_manifest_id: artifactManifestId,
  revision: 1,
  artifact_id: artifactId,
  rights_decision_id: rightsDecisionId,
  origin: {
    origin_kind: "acquired",
    work_version_id: workVersionId,
    source_connector: "nature-scientific-data",
    connector_version: "publisher-pdf/1.0.0",
    retrieval_url: manifest.acquisition.retrieval_url,
    retrieved_at: manifest.acquisition.retrieved_at,
    response_metadata: {
      status_code: 200,
      content_type: manifest.acquisition.media_type,
      content_length: manifest.acquisition.byte_size,
      etag: manifest.acquisition.etag,
      last_modified: manifest.acquisition.last_modified,
    },
  },
  storage_ref: {
    storage_kind: "content_addressed_object",
    store_name: "petra-fixture",
    object_key: `sha256/${manifest.acquisition.sha256.slice(0, 2)}/${manifest.acquisition.sha256.slice(2)}`,
    content_hash: contentHash,
    availability: "available",
    verified_at: manifest.acquisition.retrieved_at,
  },
  integrity: {
    status: "verified",
    checked_at: manifest.acquisition.retrieved_at,
    problems: [],
  },
  recorded_by: serviceActor,
  recorded_at: createdAt,
};

const rightsDecision = {
  schema_name: "petra.rights-decision",
  schema_version: "1.0.0",
  rights_decision_id: rightsDecisionId,
  revision: 1,
  artifact_manifest_id: artifactManifestId,
  source_location: manifest.acquisition.retrieval_url,
  license_status: "known",
  observed_license: {
    identifier: manifest.rights_evidence.license_identifier,
    url: manifest.rights_evidence.license_url,
    statement:
      "The exact publisher PDF states that the work is licensed under Creative Commons Attribution 4.0 International.",
    source: "artifact",
  },
  access_basis: "open_license",
  decision_status: "verified",
  permissions: {
    store_raw_bytes: true,
    parse: true,
    index: true,
    embed: true,
    send_selected_text_remotely:
      manifest.rights_evidence.remote_model_egress_enabled,
    quote_publicly: true,
    redistribute_artifact:
      manifest.rights_evidence.redistribution_permitted_with_attribution,
  },
  conditions: ["attribution", "notice"],
  required_notices: [
    "Credit Wilkinson et al. (2016), link the source, preserve the CC BY 4.0 notice, and indicate any changes.",
  ],
  decision_maker: serviceActor,
  rationale:
    "The exact publisher PDF, publisher record, and Crossref observation identify CC BY 4.0. Local parsing, indexing, quotation, and redistribution with attribution are permitted. Remote-model egress remains disabled until Petra grants it separately.",
  observed_at: manifest.acquisition.retrieved_at,
  policy_version: "petra-rights/1.0.0",
  created_at: createdAt,
};

const externalIdentifiers = [
  {
    external_identifier_id: id("external_identifier", 7),
    namespace: "doi",
    normalized_value: manifest.scholarly_status.doi,
    source_name: "Crossref",
    verification_status: "verified",
  },
  {
    external_identifier_id: id("external_identifier", 8),
    namespace: "pmid",
    normalized_value: manifest.scholarly_status.pmid,
    source_name: "PubMed Central",
    verification_status: "source_reported",
  },
  {
    external_identifier_id: id("external_identifier", 9),
    namespace: "repository_url",
    normalized_value: manifest.scholarly_status.repository_record_url,
    source_name: "PubMed Central",
    verification_status: "source_reported",
  },
].map((identifier) => ({
  schema_name: "petra.external-identifier",
  schema_version: "1.0.0",
  revision: 1,
  subject: { subject_kind: "work_version", work_version_id: workVersionId },
  observed_at: createdAt,
  created_by: serviceActor,
  created_at: createdAt,
  ...identifier,
}));

const outputs = new Map([
  ["actor.json", actor],
  ["artifact-manifest.json", artifactManifest],
  ["artifact.json", artifact],
  ["authors.json", authors],
  ["external-identifiers.json", externalIdentifiers],
  ["rights-decision.json", rightsDecision],
  ["work-version.json", workVersion],
  ["work.json", work],
]);

for (const [filename, value] of outputs) {
  const path = resolve(recordsRoot, filename);
  const expected = await format(JSON.stringify(value), {
    filepath: path,
    parser: "json",
  });
  if (checkOnly) {
    let actual;
    try {
      actual = readFileSync(path, "utf8");
    } catch {
      failures.push(`${filename} is missing.`);
      continue;
    }
    if (actual !== expected) failures.push(`${filename} is stale.`);
  } else {
    writeFileSync(path, expected);
  }
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log(
  checkOnly
    ? `Verified lawful fixture and ${outputs.size} generated record files.`
    : `Generated ${outputs.size} lawful-fixture record files.`,
);
