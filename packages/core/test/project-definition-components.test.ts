import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";
import type {
  PetraProjectDefinition,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  resolveProjectDefinitionComponents,
  resolveNativeDefinitionComponent,
  type DefinitionBinding,
  type InstalledDefinitionComponent,
} from "../src/project-definition-components.js";
const contracts = new PetraContractRegistry();
function definition(name = "controlled-writing"): PetraProjectDefinition {
  const profile = JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/registered-project-profile-${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraRegisteredProjectProfile;
  const content = structuredClone(profile.content.definition);
  return {
    schema_name: "petra.project-definition",
    schema_version: "1.0.0",
    project_definition_id: "project_definition_01K6P000000000000000000002",
    revision: 1,
    project_id: "project_01K6P000000000000000000002",
    definition_family: profile.definition_family,
    origin: { origin_kind: "project_authored" },
    content,
    content_hash: `sha256:${createHash("sha256").update(canonicalize(content)).digest("hex")}`,
    created_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "human",
    },
    created_at: "2026-10-10T00:00:00.000Z",
  };
}
const binding = (d: PetraProjectDefinition): DefinitionBinding => ({
  projectId: d.project_id,
  definitionId: d.project_definition_id,
  revision: d.revision,
  contentHash: d.content_hash,
});
const examiner = (d: PetraProjectDefinition): InstalledDefinitionComponent => {
  const r = d.content.registrations.find(
    (r) => r.registration_kind === "object_schema",
  )!;
  return {
    kind: r.registration_kind,
    contract: r.contract,
    componentId: "native-object",
    capability: "examine",
  };
};
describe("ProjectDefinition component composition", () => {
  it("resolves scientific and writing components through exact registrations without a template lookup", () => {
    for (const name of ["scientific-v1-5", "controlled-writing"]) {
      const d = definition(name),
        installed = examiner(d);
      contracts.assertValid("project-definition", "1.0.0", d);
      const result = resolveProjectDefinitionComponents(
        d,
        binding(d),
        contracts.entries,
        [installed],
      );
      expect(
        result.registrations.find(
          (r) =>
            r.registration.semantic_key ===
            d.content.registrations[1].semantic_key,
        )?.components,
      ).toEqual([installed]);
      expect(result.places).toEqual(d.content.supported_places);
      expect(result.terms).toEqual(d.content.terms);
      expect(result.authority).toBe("none");
    }
  });
  it("resolves every declared category and precisely distinguishes schema admission from installed execution", () => {
    const d = definition();
    const kinds = [
      "validator",
      "output",
      "terminology",
      "presentation_descriptor",
      "model_context",
      "prompt",
      "tool",
      "model_role",
      "extension",
    ] as const;
    for (const kind of kinds)
      d.content.registrations.push({
        registration_kind: kind,
        semantic_key: `writing.${kind}`,
        contract: d.content.registrations[0].contract,
      });
    const result = resolveProjectDefinitionComponents(
      d,
      binding(d),
      contracts.entries,
      [examiner(d)],
    );
    for (const kind of kinds) {
      const r = result.registrations.find(
        (r) => r.registration.registration_kind === kind,
      )!;
      expect(r.schema).toBe("installed");
      expect(r.components).toEqual([]);
      expect(r.limitation).toContain("no component implements");
    }
    const unavailable = structuredClone(d);
    unavailable.content.registrations[1].contract.content_hash = `sha256:${"0".repeat(64)}`;
    const r = resolveProjectDefinitionComponents(
      unavailable,
      binding(unavailable),
      contracts.entries,
      [examiner(d)],
    ).registrations[1];
    expect(r?.schema).toBe("unavailable");
    expect(r?.components).toEqual([]);
    expect(r?.limitation).toContain("content hash");
  });
  it("does not reinterpret retained material under a newer revision even when its content hash is identical", () => {
    const d = definition(),
      installed = examiner(d);
    const original = resolveProjectDefinitionComponents(
      d,
      binding(d),
      contracts.entries,
      [installed],
    );
    const material = {
      projectId: d.project_id,
      definition: binding(d),
      semanticKey: "writing.requirement",
      schemaName: installed.contract.name,
      schemaVersion: installed.contract.version,
      kind: "object_schema" as const,
    };
    expect(
      resolveNativeDefinitionComponent(original, material)?.components,
    ).toEqual([installed]);
    d.revision = 2;
    const revised = resolveProjectDefinitionComponents(
      d,
      binding(d),
      contracts.entries,
      [installed],
    );
    expect(resolveNativeDefinitionComponent(revised, material)).toBeUndefined();
    expect(
      resolveNativeDefinitionComponent(original, material)?.components,
    ).toEqual([installed]);
  });
  it("rejects crossed Projects revisions hashes duplicate meanings and examiner contracts with mismatched hashes", () => {
    const d = definition(),
      installed = examiner(d),
      b = binding(d);
    for (const change of [
      { projectId: "project_01K6P000000000000000000003" },
      { revision: 2 },
      { definitionId: "project_definition_01K6P000000000000000000003" },
      { contentHash: `sha256:${"0".repeat(64)}` },
    ])
      expect(() =>
        resolveProjectDefinitionComponents(
          d,
          { ...b, ...change },
          contracts.entries,
          [installed],
        ),
      ).toThrow("substitution is forbidden");
    const forged = {
      ...installed,
      contract: {
        ...installed.contract,
        content_hash: `sha256:${"0".repeat(64)}`,
      },
    };
    expect(
      resolveProjectDefinitionComponents(d, b, contracts.entries, [forged])
        .registrations[1]?.components,
    ).toEqual([]);
    const ambiguous = resolveProjectDefinitionComponents(
      d,
      b,
      contracts.entries,
      [installed, { ...installed, componentId: "other-examiner" }],
    ).registrations[1];
    expect(ambiguous?.components).toEqual([]);
    expect(ambiguous?.limitation).toContain("ambiguous");
    d.content.registrations.push(structuredClone(d.content.registrations[0]));
    expect(() =>
      resolveProjectDefinitionComponents(d, b, contracts.entries, [installed]),
    ).toThrow("unambiguous");
  });
});
