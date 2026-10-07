import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  PetraProjectSemanticGraphView,
  PetraProjectExaminationScene,
} from "@petra/contracts";
import { copilotHash } from "../src/project-copilot.js";
import {
  graphPresentationContent,
  graphPresentationPeer,
  parseGraphPresentationBinding,
} from "../src/graph-presentation.js";
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
describe("Exact graph presentation without domain authority", () => {
  it("keeps filtered membership, selections, omissions and the complete peer together", () => {
    const source = fixture<PetraProjectSemanticGraphView>(
      "project-semantic-graph-view",
    );
    const ref = {
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      revision: 1,
      record_hash: `sha256:${"a".repeat(64)}`,
    };
    source.content.nodes = [
      {
        key: "a",
        semantic_key: "native.a",
        label: "Private label A",
        summary: "Private bytes",
        layer: "working",
        record_ref: ref,
        material_state: "available",
      },
      {
        key: "b",
        semantic_key: "native.b",
        label: "Private label B",
        summary: "Private bytes",
        layer: "working",
        record_ref: ref,
        material_state: "available",
      },
    ];
    source.content.relationships = [
      {
        key: "ab",
        subject_key: "a",
        object_key: "b",
        predicate: "LINKS",
        semantic_key: "native.links",
        record_ref: ref,
      },
    ];
    source.content.omitted_candidates = 7;
    source.content.omitted_relationships = 3;
    source.content_hash = copilotHash(source.content);
    const parameters = {
      renderer: "native_working" as const,
      mode: "graph" as const,
      semantic_content_hash: source.content_hash,
      selected_keys: ["a"],
      excluded_kinds: ["native.b"],
    };
    const content = graphPresentationContent(source, parameters);
    expect(content.nodes.map((node) => node.key)).toEqual(["a"]);
    expect(content.nodes[0]?.position).toEqual({ x: 110, y: 70 });
    expect(content.relationships).toEqual([]);
    expect(content.omitted_nodes).toBe(8);
    expect(content.omitted_relationships).toBe(4);
    expect(JSON.stringify(content)).not.toContain("Private");
    const peer = graphPresentationPeer(content);
    expect(JSON.stringify(peer)).not.toContain("position");
    expect(JSON.stringify(peer)).toContain('"selected_keys":["a"]');
    const complete = { ...content, peer_content_hash: copilotHash(peer) };
    const binding = {
      parameters,
      content_hash: copilotHash(complete),
      peer_content_hash: complete.peer_content_hash,
    };
    expect(parseGraphPresentationBinding(binding)).toEqual(binding);
    expect(() =>
      graphPresentationContent(source, { ...parameters, selected_keys: ["b"] }),
    ).toThrow("outside the visible graph");
    expect(() =>
      parseGraphPresentationBinding({
        ...binding,
        nodes: source.content.nodes,
      }),
    ).toThrow("malformed");
    expect(() =>
      graphPresentationContent(source, {
        ...parameters,
        semantic_content_hash: `sha256:${"b".repeat(64)}`,
      }),
    ).toThrow("exact semantic result");
  });
  it("pins cycle membership and its separate examined basis without creating self-invalidation", () => {
    const scene = fixture<PetraProjectExaminationScene>(
      "project-examination-scene",
    );
    const content = graphPresentationContent(scene, {
      renderer: "examination_cycles",
      mode: "graph",
      semantic_content_hash: scene.content_hash,
      selected_keys: [],
      excluded_kinds: [],
    });
    expect(content.graph_content_hash).toBe(scene.content.graph_content_hash);
    expect(content.parameters.semantic_content_hash).toBe(scene.content_hash);
    expect(content.nodes.length).toBe(scene.content.nodes.length);
    expect(content.relationships).toEqual(scene.content.relationships);
    expect(content.authority).toBe("presentation_only");
    const text = {
      ...content,
      parameters: { ...content.parameters, mode: "text" as const },
    };
    expect(copilotHash(graphPresentationPeer(content))).not.toBe(
      copilotHash(graphPresentationPeer(text)),
    );
  });
});
