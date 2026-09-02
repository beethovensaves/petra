import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  Ajv2020,
  type AnySchema,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import formatsPackage from "ajv-formats";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

interface RegistryEntry {
  name: string;
  version: string;
  $id: string;
  path: string;
  status: "accepted";
  compatibility: string;
  canonical_sha256: string;
  generate_typescript: boolean;
  typescript_path?: string;
}

interface FixtureEntry {
  schema: string;
  version?: string;
  path: string;
}

interface FixtureManifest {
  fixture_manifest_version: string;
  accepted: FixtureEntry[];
  rejected: FixtureEntry[];
  canonical: FixtureEntry[];
}

interface RejectedFoundationValue {
  definition: string;
  value: unknown;
}

const foundationDefinitions = {
  petra_id: "PetraId",
  actor_id: "ActorId",
  project_id: "ProjectId",
  artifact_id: "ArtifactId",
  artifact_manifest_id: "ArtifactManifestId",
  rights_decision_id: "RightsDecisionId",
  parser_run_id: "ParserRunId",
  parsed_document_id: "ParsedDocumentId",
  structural_block_id: "StructuralBlockId",
  source_span_id: "SourceSpanId",
  claim_id: "ClaimId",
  assertion_id: "AssertionId",
  change_set_id: "ChangeSetId",
  approval_id: "ApprovalId",
  review_policy_id: "ReviewPolicyId",
  revision: "Revision",
  byte_size: "ByteSize",
  content_hash: "ContentHash",
  timestamp: "Timestamp",
  actor_ref: "ActorRef",
  project_scope: "ProjectScope",
  evidence_namespace: "EvidenceNamespace",
} as const;

const readJson = (relativePath: string): unknown =>
  JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as unknown;

const registry = readJson("../registry.json") as {
  registry_version: string;
  schemas: RegistryEntry[];
};
const addFormats = formatsPackage.default;
const manifest = readJson("../fixtures/manifest.json") as FixtureManifest;
const acceptedFoundationValues = readJson(
  "../fixtures/accepted/foundation-values.json",
) as Record<keyof typeof foundationDefinitions, unknown>;
const rejectedFoundationValues = readJson(
  "../fixtures/rejected/foundation-values.json",
) as RejectedFoundationValue[];
const schemas = new Map<string, AnySchema>();
for (const entry of registry.schemas) {
  schemas.set(
    `${entry.name}@${entry.version}`,
    readJson(`../${entry.path}`) as AnySchema,
  );
}

const ajv = new Ajv2020({
  allErrors: true,
  coerceTypes: false,
  removeAdditional: false,
  strict: true,
  useDefaults: false,
});
addFormats(ajv, { formats: ["date", "date-time", "uri"] });
for (const schema of schemas.values()) ajv.addSchema(schema);

const validatorFor = (name: string, version = "1.0.0"): ValidateFunction => {
  const entry = registry.schemas.find(
    (candidate) => candidate.name === name && candidate.version === version,
  );
  if (entry === undefined)
    throw new Error(`Fixture names unregistered schema ${name}.`);
  const validate = ajv.getSchema(entry.$id);
  if (validate === undefined)
    throw new Error(`Schema ${name} was not compiled.`);
  return validate;
};

const commonDefinitionValidator = (definition: string): ValidateFunction => {
  const entry = registry.schemas.find(
    (candidate) => candidate.name === "common",
  );
  if (entry === undefined) throw new Error("Common schema is not registered.");
  const validate = ajv.getSchema(`${entry.$id}#/$defs/${definition}`);
  if (validate === undefined) {
    throw new Error(`Common definition ${definition} was not compiled.`);
  }
  return validate;
};

describe("Petra canonical contract registry", () => {
  it.each(registry.schemas)(
    "validates $name@$version and its immutable identity",
    (entry) => {
      const schema = schemas.get(`${entry.name}@${entry.version}`);
      if (schema === undefined) {
        throw new Error(`Registered schema ${entry.name} was not loaded.`);
      }
      expect(ajv.validateSchema(schema)).toBe(true);
      expect((schema as { $id?: string }).$id).toBe(entry.$id);
      const digest = `sha256:${createHash("sha256")
        .update(canonicalize(schema))
        .digest("hex")}`;
      expect(digest).toBe(entry.canonical_sha256);
    },
  );

  it.each(manifest.accepted)(
    "accepts $path without input mutation",
    (fixture) => {
      const value = readJson(`../${fixture.path}`);
      const before = structuredClone(value);
      const validate = validatorFor(fixture.schema, fixture.version ?? "1.0.0");

      expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
      expect(value).toStrictEqual(before);
    },
  );

  it.each(manifest.rejected)("rejects $path", (fixture) => {
    const validate = validatorFor(fixture.schema, fixture.version ?? "1.0.0");
    expect(validate(readJson(`../${fixture.path}`))).toBe(false);
  });

  it.each(manifest.canonical)(
    "reproduces $path RFC 8785 identity",
    (fixture) => {
      const value = readJson(`../${fixture.path}`) as {
        canonical: string;
        input: unknown;
        sha256: string;
      };
      const validate = validatorFor(fixture.schema, fixture.version ?? "1.0.0");
      expect(validate(value.input), JSON.stringify(validate.errors)).toBe(true);
      const canonical = canonicalize(value.input);
      const hash = createHash("sha256").update(canonical).digest("hex");

      expect(canonical).toBe(value.canonical);
      expect(`sha256:${hash}`).toBe(value.sha256);
    },
  );

  it("binds the accepted ChangeSet to the RFC 8785 hash of its exact content", () => {
    const changeSet = readJson("../fixtures/accepted/change-set.json") as {
      content: unknown;
      content_hash: string;
    };
    const hash = createHash("sha256")
      .update(canonicalize(changeSet.content))
      .digest("hex");

    expect(changeSet.content_hash).toBe(`sha256:${hash}`);
  });

  it.each([
    {
      path: "../fixtures/accepted/worker-input-manifest.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/worker-output-manifest.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/work-unit-requested.json",
      projection: "spec",
      hashField: "spec_hash",
    },
    {
      path: "../fixtures/accepted/work-unit-completed.json",
      projection: "spec",
      hashField: "spec_hash",
    },
    {
      path: "../fixtures/accepted/graph-projection-record-failed.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/graph-projection-record-applied.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/projection-checkpoint-catching-up.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/projection-checkpoint-blocked.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/projection-checkpoint-current.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/context-packet.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/evidence-packet.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/draft-artifact.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/draft-span-report.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/draft-span-qualification.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/provenance-map.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/citation-bundle.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-feature-manifest.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-run.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-event-record.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-interrupt-pending.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-interrupt-responded.json",
      projection: "content",
      hashField: "content_hash",
    },
    {
      path: "../fixtures/accepted/interaction-replay-record.json",
      projection: "content",
      hashField: "content_hash",
    },
  ])("binds $path to its exact canonical $projection", (fixture) => {
    const value = readJson(fixture.path) as Record<string, unknown>;
    const hash = createHash("sha256")
      .update(canonicalize(value[fixture.projection]))
      .digest("hex");

    expect(value[fixture.hashField]).toBe(`sha256:${hash}`);
  });

  it("binds the applied graph projection receipt to its exact effect", () => {
    const value = readJson(
      "../fixtures/accepted/graph-projection-record-applied.json",
    ) as {
      content: {
        outcome: { effect: unknown; effect_hash: string };
      };
    };
    const hash = createHash("sha256")
      .update(canonicalize(value.content.outcome.effect))
      .digest("hex");

    expect(value.content.outcome.effect_hash).toBe(`sha256:${hash}`);
  });

  it.each(["draft-span-report.json", "draft-span-qualification.json"])(
    "binds %s to the exact UTF-8 span text",
    (filename) => {
      const value = readJson(`../fixtures/accepted/${filename}`) as {
        content: { exact_text: string; exact_text_hash: string };
      };
      const hash = createHash("sha256")
        .update(value.content.exact_text)
        .digest("hex");

      expect(value.content.exact_text_hash).toBe(`sha256:${hash}`);
    },
  );

  it("accepts every portable foundation value without coercion", () => {
    const before = structuredClone(acceptedFoundationValues);
    for (const [field, definition] of Object.entries(foundationDefinitions)) {
      const validate = commonDefinitionValidator(definition);
      expect(
        validate(
          acceptedFoundationValues[field as keyof typeof foundationDefinitions],
        ),
        JSON.stringify(validate.errors),
      ).toBe(true);
    }
    expect(acceptedFoundationValues).toStrictEqual(before);
  });

  it.each(rejectedFoundationValues)(
    "rejects invalid $definition foundation values",
    (fixture) => {
      expect(commonDefinitionValidator(fixture.definition)(fixture.value)).toBe(
        false,
      );
    },
  );
});
