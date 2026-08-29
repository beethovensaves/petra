import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  PetraContractRegistry,
  assertPortableSchema,
  type ContractRegistryError,
  type ContractRegistryErrorCode,
} from "../src/validator.js";

interface FixtureEntry {
  schema: string;
  path: string;
}

interface TransitionFixture {
  schema_name: string;
  from_version: string;
  to_version: string;
  strategy: "reject";
  source_fixture_path: string;
  target_payload: unknown;
  expected_error: ContractRegistryErrorCode;
}

interface FixtureManifest {
  accepted: FixtureEntry[];
  rejected: FixtureEntry[];
  version_transitions: Array<{ path: string }>;
}

const readJson = <Value>(relativePath: string): Value =>
  JSON.parse(
    readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"),
  ) as Value;

const manifest = readJson<FixtureManifest>("fixtures/manifest.json");

const expectCode = (
  operation: () => unknown,
  code: ContractRegistryErrorCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<ContractRegistryError>>({ code }),
  );
};

describe("Petra runtime contract registry", () => {
  it("loads the accepted local registry and enforces shared fixtures without mutation", () => {
    const registry = new PetraContractRegistry();
    expect(registry.entries.length).toBeGreaterThan(1);

    for (const fixture of manifest.accepted) {
      const value = readJson<unknown>(fixture.path);
      const before = structuredClone(value);
      registry.assertValid(fixture.schema, "1.0.0", value);
      expect(value).toStrictEqual(before);
    }
    for (const fixture of manifest.rejected) {
      expect(
        registry.isValid(fixture.schema, "1.0.0", readJson(fixture.path)),
      ).toBe(false);
    }
  });

  it("rejects every non-finite JSON number at the boundary", () => {
    const registry = new PetraContractRegistry();
    const accepted = readJson<Record<string, unknown>>(
      "fixtures/accepted/contract-smoke.json",
    );

    for (const sequence of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      const value = { ...accepted, sequence };
      expect(registry.isValid("contract-smoke", "1.0.0", value)).toBe(false);
      expectCode(
        () => registry.assertValid("contract-smoke", "1.0.0", value),
        "CONTRACT_VALUE_INVALID",
      );
    }
  });

  it("accepts only registered formats and locally registered reference targets", () => {
    const id = "https://petra.local/schemas/profile-test/1.0.0/schema.json";
    const base = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: id,
      title: "ProfileTest",
      type: "string",
    };
    expect(() =>
      assertPortableSchema({ ...base, format: "date" }, new Set([id])),
    ).not.toThrow();
    expectCode(
      () =>
        assertPortableSchema(
          { ...base, format: "petra-unregistered" },
          new Set([id]),
        ),
      "CONTRACT_SCHEMA_PROFILE_INVALID",
    );
    expectCode(
      () =>
        assertPortableSchema(
          { ...base, $ref: "https://example.org/remote-schema.json" },
          new Set([id]),
        ),
      "CONTRACT_SCHEMA_PROFILE_INVALID",
    );
  });

  it("makes an unsupported version transition an explicit rejection", () => {
    const registry = new PetraContractRegistry();
    const transitionEntry = manifest.version_transitions[0];
    if (transitionEntry === undefined) {
      throw new Error("Expected the contract version-transition fixture.");
    }
    const transition = readJson<TransitionFixture>(transitionEntry.path);
    const source = readJson<unknown>(transition.source_fixture_path);

    expect(transition.strategy).toBe("reject");
    registry.assertValid(
      transition.schema_name,
      transition.from_version,
      source,
    );
    expect(
      registry.isValid(
        transition.schema_name,
        transition.from_version,
        transition.target_payload,
      ),
    ).toBe(false);
    expect(registry.has(transition.schema_name, transition.to_version)).toBe(
      false,
    );
    expectCode(
      () =>
        registry.assertValid(
          transition.schema_name,
          transition.to_version,
          transition.target_payload,
        ),
      transition.expected_error,
    );
  });

  it("keeps adapter and generated-type extensions out of canonical schemas", () => {
    const registry = new PetraContractRegistry();
    const forbiddenKeys = new Set([
      "x-ag-ui",
      "x-hono",
      "x-neo4j",
      "x-postgresql",
      "x-pydantic",
      "x-typescript",
    ]);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const member of value) visit(member);
      } else if (typeof value === "object" && value !== null) {
        for (const [key, member] of Object.entries(value)) {
          expect(forbiddenKeys.has(key)).toBe(false);
          visit(member);
        }
      }
    };

    for (const entry of registry.entries) {
      expect(entry.path.startsWith("schemas/")).toBe(true);
      if (entry.typescript_path !== undefined) {
        expect(entry.typescript_path.startsWith("src/generated/")).toBe(true);
      }
      visit(readJson(entry.path));
    }
  });
});
