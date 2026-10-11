import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  PetraProjectDefinition,
  PetraProjectSemanticGraphView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { resolveProjectDefinitionComponents } from "@petra/core/project-definition-components";
import registry from "../../../../packages/contracts/registry.json";
import {
  installedNativeExaminers,
  ProjectDefinitionComponentsDisclosure,
} from "./project-definition-components.js";
import { nativeExamination } from "./native-examination-registry.js";
import { PetraContractRegistry as BrowserContracts } from "./browser-contract-registry.js";
const read = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
function definition(name: string): PetraProjectDefinition {
  const p = read(
    `registered-project-profile-${name}`,
  ) as PetraRegisteredProjectProfile;
  const d = read(
    "project-definition-controlled-writing",
  ) as PetraProjectDefinition;
  d.content = structuredClone(p.content.definition);
  d.definition_family = p.definition_family;
  d.origin = { origin_kind: "project_authored" };
  d.content_hash = `sha256:${createHash("sha256").update(canonicalize(d.content)).digest("hex")}`;
  return d;
}
function resolve(d: PetraProjectDefinition) {
  return resolveProjectDefinitionComponents(
    d,
    {
      projectId: d.project_id,
      definitionId: d.project_definition_id,
      revision: d.revision,
      contentHash: d.content_hash,
    },
    registry.schemas,
    installedNativeExaminers,
  );
}
type Node = PetraProjectSemanticGraphView["content"]["nodes"][number];
function writingNode(d: PetraProjectDefinition): Node {
  const r = read("controlled-writing-requirement") as Record<string, unknown>;
  r.project_id = d.project_id;
  r.project_definition_ref = {
    project_definition_id: d.project_definition_id,
    revision: d.revision,
    content_hash: d.content_hash,
    definition_family: d.definition_family,
  };
  return {
    key: "requirement",
    semantic_key: "writing.requirement",
    label: "Requirement",
    summary: "Examine the obligation",
    layer: "reference",
    material_state: "available",
    native_record: r,
    record_ref: {
      record_id: r.requirement_id as string,
      revision: 1,
      record_hash: `sha256:${"a".repeat(64)}`,
      schema_name: "petra.controlled-writing-requirement",
      schema_version: "1.0.0",
    },
  };
}
describe("definition-composed Workspace", () => {
  it("renders scientific writing and unrelated definitions through one component disclosure without family conditionals", () => {
    const scientific = definition("scientific-v1-5"),
      writing = definition("controlled-writing"),
      unrelated = definition("controlled-writing");
    unrelated.definition_family = "example.block-party";
    unrelated.content.label = "Block party";
    unrelated.content.description =
      "Coordinate venue and volunteer constraints.";
    unrelated.content.registrations = [
      { ...unrelated.content.registrations[0], semantic_key: "event.purpose" },
    ];
    for (const term of unrelated.content.terms) {
      term.semantic_key = `event.${term.generic_family}`;
      term.singular = `Event ${term.generic_family}`;
    }
    unrelated.content_hash = `sha256:${createHash("sha256").update(canonicalize(unrelated.content)).digest("hex")}`;
    for (const d of [scientific, writing, unrelated]) {
      const html = renderToStaticMarkup(
        <ProjectDefinitionComponentsDisclosure value={resolve(d)} />,
      );
      expect(html).toContain(
        renderToStaticMarkup(<p>{d.content.description}</p>),
      );
      expect(html).toContain("revision 1");
      expect(html).not.toContain("invalid Project");
    }
    expect(
      renderToStaticMarkup(
        <ProjectDefinitionComponentsDisclosure value={resolve(unrelated)} />,
      ),
    ).not.toContain("scientific");
  });
  it("loads the actual writing examiner under its declared exact contract and the browser validates its native material", () => {
    const d = definition("controlled-writing"),
      node = writingNode(d);
    new BrowserContracts().assertValid("project-definition", "1.0.0", d);
    new BrowserContracts().assertValid(
      "controlled-writing-requirement",
      "1.0.0",
      node.native_record,
    );
    const examined = nativeExamination({
      node,
      projectId: d.project_id,
      graphHash: `sha256:${"b".repeat(64)}`,
      definition: resolve(d),
    });
    const html = renderToStaticMarkup(examined.body);
    expect(html).toContain('data-examiner="writing-requirement"');
    expect(html).toContain("Writing requirement");
    expect(examined.continuation).toBeUndefined();
  });
  it("does not give stale unavailable undeclared or malformed material a current examiner or continuation", () => {
    const d = definition("controlled-writing"),
      original = writingNode(d);
    for (const change of [
      {
        native_record: {
          ...original.native_record,
          project_id: "project_01K6P000000000000000000999",
        },
      },
      {
        native_record: {
          ...original.native_record,
          project_definition_ref: {
            project_definition_id: d.project_definition_id,
            revision: 2,
            content_hash: d.content_hash,
          },
        },
      },
      { material_state: "definition_stale" as const },
      { semantic_key: "writing.undeclared" },
      {
        native_record: {
          ...original.native_record,
          invented_authority: "approved",
        },
      },
    ]) {
      const result = nativeExamination({
        node: { ...original, ...change },
        projectId: d.project_id,
        graphHash: `sha256:${"b".repeat(64)}`,
        definition: resolve(d),
      });
      expect(renderToStaticMarkup(result.body)).not.toContain("data-examiner");
      expect(result.continuation).toBeUndefined();
    }
    const result = nativeExamination({
      node: original,
      projectId: d.project_id,
      graphHash: `sha256:${"b".repeat(64)}`,
    });
    expect(renderToStaticMarkup(result.body)).toContain(
      "current meaning is not substituted",
    );
  });
});
