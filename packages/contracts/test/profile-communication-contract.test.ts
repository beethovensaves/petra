import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PetraContractRegistry } from "../src/validator.js";

const registry = new PetraContractRegistry();
const schema = JSON.parse(
  readFileSync(
    new URL(
      "../schemas/scientific-communication-payload/1.0.0/schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as { properties: { profile: { const: Record<string, unknown> } } };
const payload = () => ({
  schema_name: "petra.scientific-communication-payload",
  schema_version: "1.0.0",
  profile: structuredClone(schema.properties.profile.const),
});

describe("installed scientific communication payload", () => {
  it("accepts the exact non-executable payload", () => {
    expect(
      registry.isValid("scientific-communication-payload", "1.0.0", payload()),
    ).toBe(true);
  });
  it.each([
    "origins",
    "reference_owners",
    "validation",
    "action_report",
    "structured_fields",
    "locale",
    "preservation",
    "version_rules",
    "textual_equivalence",
  ])("rejects client replacement of %s meaning", (field) => {
    const value = payload();
    value.profile[field] = { override: "client-defined" };
    expect(
      registry.isValid("scientific-communication-payload", "1.0.0", value),
    ).toBe(false);
  });
  it("rejects executable additions and a claimed response receipt", () => {
    expect(
      registry.isValid("scientific-communication-payload", "1.0.0", {
        ...payload(),
        template: "<script>apply()</script>",
      }),
    ).toBe(false);
    expect(
      registry.isValid("scientific-communication-payload", "1.0.0", {
        ...payload(),
        receipt: { status: "passed" },
      }),
    ).toBe(false);
  });
});
