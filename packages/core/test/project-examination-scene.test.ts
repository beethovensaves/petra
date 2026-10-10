import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  PetraProjectExaminationView,
  PetraHypothesis,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { buildProjectExaminationScene } from "../src/project-examination-scene.js";
import { copilotHash } from "../src/project-copilot.js";
import { examinationRecordRef } from "../src/hypothesis-examination.js";
import { derivePetraId } from "../src/identity.js";
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
describe("exact examination scene", () => {
  it("preserves the examined basis and old judgments while exposing invalidation and explicit lineage", () => {
    const view = fixture<PetraProjectExaminationView>(
      "project-examination-view",
    );
    view.records = [
      fixture("hypothesis"),
      fixture("hypothesis-assessment"),
      fixture("posture-decision"),
      fixture("cycle-disposition"),
    ];
    const prior = structuredClone(view);
    const assessment = view.records.find(
      (record) => record.schema_name === "petra.hypothesis-assessment",
    )!;
    if (assessment.schema_name !== "petra.hypothesis-assessment")
      throw new Error("Expected an assessment.");
    assessment.content.criteria = [
      {
        criterion_key: "source_fidelity",
        result: "unknown",
        method: "exact_quote_comparison",
        evidence_refs: [assessment.content.target_claim_ref],
        explanation:
          "The exact target is named, but no verdict follows from the reference alone.",
        origin: "human_judgment",
        limitations: ["Unexamined."],
      },
    ];
    prior.records = structuredClone(view.records);
    view.freshness = [
      {
        record_ref: examinationRecordRef(assessment),
        state: "invalidated",
        affected_axes: ["warrant"],
      },
    ];
    const scene = buildProjectExaminationScene(view);
    new PetraContractRegistry().assertValid(
      "project-examination-scene",
      "1.0.0",
      scene,
    );
    expect(scene.content.graph_content_hash).toBe(prior.graph.content_hash);
    expect(scene.content_hash).toBe(copilotHash(scene.content));
    expect(view.records).toEqual(prior.records);
    expect(
      scene.content.nodes.find(
        (node) =>
          node.record_ref.record_id ===
          examinationRecordRef(assessment).record_id,
      )?.state,
    ).toBe("invalidated");
    for (const predicate of [
      "targets",
      "assesses",
      "uses_evidence",
      "has_posture",
      "concludes",
      "pins_profile",
      "pins_policy",
    ])
      expect(
        scene.content.relationships.some(
          (path) => path.predicate === predicate,
        ),
      ).toBe(true);
  });
  it("counts omitted exact references and drops paths whose endpoints exceed the scene budget", () => {
    const view = fixture<PetraProjectExaminationView>(
      "project-examination-view",
    );
    const hypothesis = fixture<PetraHypothesis>("hypothesis");
    view.records = Array.from({ length: 260 }, (_, index) => ({
      ...hypothesis,
      hypothesis_id: derivePetraId("hypothesis", String(index)),
    }));
    view.has_more = true;
    const scene = buildProjectExaminationScene(view);
    expect(scene.content.nodes).toHaveLength(250);
    expect(scene.content.omitted_nodes).toBeGreaterThanOrEqual(10);
    expect(scene.content.omitted_relationships).toBeGreaterThan(0);
    expect(scene.content.has_more_history).toBe(true);
    const keys = new Set(scene.content.nodes.map((node) => node.key));
    expect(
      scene.content.relationships.every(
        (path) => keys.has(path.subject_key) && keys.has(path.object_key),
      ),
    ).toBe(true);
    new PetraContractRegistry().assertValid(
      "project-examination-scene",
      "1.0.0",
      scene,
    );
  });
});
