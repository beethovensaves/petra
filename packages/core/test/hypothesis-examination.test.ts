import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import { copilotHash } from "../src/project-copilot.js";
import {
  HypothesisExaminationKernel,
  examinationRecordRef,
  type ExaminationSemantics,
} from "../src/hypothesis-examination.js";
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
const seal = <T extends { content: unknown; content_hash: string }>(
  value: T,
): T => {
  value.content_hash = copilotHash(value.content);
  return value;
};
const build = () => {
  const hypothesis = fixture<PetraHypothesis>("hypothesis");
  const graph = fixture<PetraProjectSemanticGraphView>(
    "project-semantic-graph-view",
  );
  graph.content.nodes.push({
    key: "target-claim",
    semantic_key: "scientific.claim",
    label: "Claim",
    summary: "Exact scoped target",
    layer: "working",
    record_ref: hypothesis.content.target_claim_ref,
    material_state: "available",
    native_record: fixture("claim"),
  });
  seal(graph);
  const assessment = fixture<PetraHypothesisAssessment>(
    "hypothesis-assessment",
  );
  assessment.content.subject_ref = examinationRecordRef(hypothesis);
  assessment.content.target_claim_ref = hypothesis.content.target_claim_ref;
  assessment.content.basis = {
    definition_ref: graph.content.definition_ref,
    graph_content_hash: graph.content_hash,
    event_position: graph.content.authority.event_position,
    stream_revision: graph.content.authority.stream_revision,
    query_kind: "current_registered_working_heads",
  };
  assessment.content.review_state = "reviewed";
  assessment.content.criteria.push({
    criterion_key: "scoped_evidence_examination",
    result: "passed",
    method:
      "Explicit human examination of the exact target representation and scope.",
    evidence_refs: [hypothesis.content.target_claim_ref],
    explanation:
      "The named scoped criterion was examined; no universal truth follows.",
    origin: "human_judgment",
    limitations: [
      "This unit fixture represents a human judgment, not model or literature certification.",
    ],
  });
  assessment.content.findings.push({
    finding_key: "scoped-finding",
    type_key: "scientific.scoped_support",
    axis: "warrant",
    explanation: "Human-reviewed scoped support judgment.",
    evidence_refs: [hypothesis.content.target_claim_ref],
    criterion_keys: ["scoped_evidence_examination"],
    origin: "human_judgment",
    review_state: "reviewed",
    material_unknowns: ["Independent repetition remains unexamined."],
    limitations: ["Within represented scope only."],
  });
  assessment.content.axes = [
    {
      axis: "warrant",
      summary: "supporting_within_scope",
      finding_keys: ["scoped-finding"],
      material_unknowns: ["Independent repetition is unknown."],
      dependency_refs: [hypothesis.content.target_claim_ref],
    },
  ];
  seal(assessment);
  const posture = fixture<PetraPostureDecision>("posture-decision");
  posture.content.assessment_ref = examinationRecordRef(assessment);
  posture.content.state = "active";
  posture.content.determining_finding_keys.push("scoped-finding");
  seal(posture);
  const disposition = fixture<PetraCycleDisposition>("cycle-disposition");
  disposition.content.assessment_ref = examinationRecordRef(assessment);
  disposition.content.posture_ref = examinationRecordRef(posture);
  disposition.content.basis = assessment.content.basis;
  disposition.content.disposition = "supporting_within_scope";
  disposition.content.criterion_keys.push("scoped_evidence_examination");
  disposition.content.finding_keys.push("scoped-finding");
  disposition.content.unresolved_questions = [
    ...new Set([
      ...assessment.content.material_unknowns,
      ...disposition.content.unresolved_questions,
    ]),
  ];
  seal(disposition);
  const semantics: ExaminationSemantics = {
    profile_ref: assessment.content.profile_ref,
    policy_ref: assessment.content.policy_ref,
    criteria: new Map([
      [
        "scoped_evidence_examination",
        {
          required_for_satisfied: true,
          permitted_origins: ["human_judgment", "model_proposal"],
        },
      ],
    ]),
    finding_types: new Map([["scientific.scoped_support", "warrant"]]),
    obligation_types: new Map([
      [
        "scientific.examine_basis",
        {
          criterion_keys: ["scoped_evidence_examination"],
          enforcement: "required_for_transition",
        },
      ],
    ]),
    allowed_dispositions: [
      "supporting_within_scope",
      "challenging_within_scope",
      "mixed",
      "insufficient",
      "deferred",
      "further_cycle",
    ],
  };
  return {
    hypothesis,
    graph,
    assessment,
    posture,
    disposition,
    kernel: new HypothesisExaminationKernel(semantics),
  };
};
describe("snapshot-bound Hypothesis examination, posture and cycle guards", () => {
  it("records one explicitly reviewed scoped cycle without collapsing development, activity, warrant or lifecycle", () => {
    const b = build();
    const before = JSON.stringify(b.assessment);
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        b.assessment,
        b.posture,
        b.hypothesis,
        b.graph,
      ),
    ).not.toThrow();
    expect(b.hypothesis.content.development).toBe("articulated");
    expect(b.hypothesis.content.lifecycle).toBe("active");
    expect(
      b.assessment.content.axes.some((axis) => axis.axis === "activity"),
    ).toBe(false);
    expect(JSON.stringify(b.assessment)).toBe(before);
  });
  it("keeps missing axes unassessed and rejects a model-proposed passed criterion", () => {
    const b = build();
    b.assessment.content.axes = [];
    b.assessment.content.findings = [];
    b.assessment.content.criteria = [];
    b.assessment.content.review_state = "partial";
    seal(b.assessment);
    expect(() =>
      b.kernel.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).not.toThrow();
    b.assessment.content.criteria.push({
      criterion_key: "scoped_evidence_examination",
      result: "passed",
      method: "Model fluency",
      evidence_refs: [b.hypothesis.content.target_claim_ref],
      explanation: "A fluent response.",
      origin: "model_proposal",
      limitations: [],
    });
    seal(b.assessment);
    expect(() =>
      b.kernel.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).toThrow("Model proposals");
  });
  it("rejects a passed check against metadata-only material and an altered registered method", () => {
    const b = build();
    b.graph.content.nodes[0]!.material_state = "metadata_only";
    seal(b.graph);
    b.assessment.content.basis.graph_content_hash = b.graph.content_hash;
    seal(b.assessment);
    expect(() =>
      b.kernel.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).toThrow("evidence-free");
    b.graph.content.nodes[0]!.material_state = "available";
    seal(b.graph);
    b.assessment.content.basis.graph_content_hash = b.graph.content_hash;
    seal(b.assessment);
    const guarded = new HypothesisExaminationKernel({
      ...b.kernel.semantics,
      criteria: new Map([
        [
          "scoped_evidence_examination",
          {
            required_for_satisfied: true,
            permitted_origins: ["human_judgment"],
            method: "Registered exact passage examination.",
          },
        ],
      ]),
    });
    expect(() =>
      guarded.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).toThrow("registered examination method");
  });
  it("requires policy obligations and rejects expired postures and material-unknown erasure", () => {
    const b = build();
    const required = new HypothesisExaminationKernel({
      ...b.kernel.semantics,
      required_obligation_types: ["scientific.examine_basis"],
    });
    expect(() =>
      required.validatePosture(b.posture, b.assessment, b.hypothesis, b.graph),
    ).toThrow("every mandatory obligation");
    b.posture.content.expires_at = b.posture.created_at;
    seal(b.posture);
    expect(() =>
      b.kernel.validatePosture(b.posture, b.assessment, b.hypothesis, b.graph),
    ).toThrow("expired");
    b.posture.content.expires_at = null;
    seal(b.posture);
    b.disposition.content.posture_ref = examinationRecordRef(b.posture);
    b.disposition.content.unresolved_questions = [
      "A different concern that hides the recorded unknowns.",
    ];
    seal(b.disposition);
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        b.assessment,
        b.posture,
        b.hypothesis,
        b.graph,
      ),
    ).toThrow("every material unknown");
  });
  it("invalidates scope-dependent warrant after an Objective change while preserving independent standing", () => {
    const b = build();
    b.assessment.content.axes = [
      ...b.assessment.content.axes,
      {
        axis: "scientific_standing",
        summary: "unknown",
        finding_keys: [],
        material_unknowns: ["Standing remains unexamined."],
        dependency_refs: [],
      },
    ] as PetraHypothesisAssessment["content"]["axes"];
    seal(b.assessment);
    const next = structuredClone(b.graph);
    next.content.objective_ref = {
      schema_name: "petra.project-objective",
      schema_version: "1.0.0",
      record_id: "objective_01K4E000000000000000000003",
      revision: 2,
      record_hash: `sha256:${"7".repeat(64)}`,
    };
    seal(next);
    expect(b.kernel.freshness(b.assessment, next)).toEqual({
      state: "invalidated",
      affected_axes: ["warrant"],
    });
  });
  it("retains an unmapped consideration without allowing it to control warrant or posture", () => {
    const b = build();
    b.assessment.content.findings[0]!.type_key = "novel.unmapped_reason";
    seal(b.assessment);
    expect(() =>
      b.kernel.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).toThrow("Unmapped");
    b.assessment.content.axes = [];
    seal(b.assessment);
    expect(() =>
      b.kernel.validateAssessment(b.assessment, b.hypothesis, b.graph),
    ).not.toThrow();
    b.posture.content.assessment_ref = examinationRecordRef(b.assessment);
    seal(b.posture);
    expect(() =>
      b.kernel.validatePosture(b.posture, b.assessment, b.hypothesis, b.graph),
    ).toThrow("Unmapped");
  });
  it("blocks satisfied disposition while a mandatory obligation remains open, regardless of task success", () => {
    const b = build();
    b.posture.content.obligations.push({
      obligation_id: "obligation_01K4E000000000000000000111",
      revision: 1,
      type_key: "scientific.examine_basis",
      creating_finding_key: "scoped-finding",
      rationale: "Examine the required basis.",
      enforcement: "required_for_transition",
      criterion_keys: ["scoped_evidence_examination"],
      state: "open",
      satisfaction_evidence_refs: [],
      waiver_ref: null,
      work_refs: [],
    });
    seal(b.posture);
    b.disposition.content.posture_ref = examinationRecordRef(b.posture);
    seal(b.disposition);
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        b.assessment,
        b.posture,
        b.hypothesis,
        b.graph,
      ),
    ).toThrow("Open mandatory");
    b.disposition.content.disposition = "insufficient";
    seal(b.disposition);
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        b.assessment,
        b.posture,
        b.hypothesis,
        b.graph,
      ),
    ).not.toThrow();
  });
  it("requires examined evidence and preserves unknown when a mandatory criterion was not examined", () => {
    const b = build();
    b.assessment.content.criteria[0]!.result = "unknown";
    seal(b.assessment);
    b.posture.content.assessment_ref = examinationRecordRef(b.assessment);
    seal(b.posture);
    b.disposition.content.assessment_ref = examinationRecordRef(b.assessment);
    b.disposition.content.posture_ref = examinationRecordRef(b.posture);
    seal(b.disposition);
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        b.assessment,
        b.posture,
        b.hypothesis,
        b.graph,
      ),
    ).toThrow("Unexamined");
  });
  it("invalidates affected warrant on target correction, preserves unaffected axes and permits a new retained cycle", () => {
    const b = build();
    b.assessment.content.axes = [
      ...b.assessment.content.axes,
      {
        axis: "project_dependence",
        summary: "unknown",
        finding_keys: [],
        material_unknowns: ["No dependence recorded"],
        dependency_refs: [],
      },
    ] as PetraHypothesisAssessment["content"]["axes"];
    seal(b.assessment);
    const old = structuredClone(b.assessment);
    const changed = structuredClone(b.graph);
    const changedNative = fixture<Record<string, unknown>>("claim");
    changedNative.revision = 2;
    changedNative.canonical_text = "A revised scoped proposition.";
    changed.content.nodes[0]!.native_record = changedNative;
    changed.content.nodes[0]!.record_ref = {
      ...b.hypothesis.content.target_claim_ref,
      revision: 2,
      record_hash: copilotHash(changedNative),
    };
    seal(changed);
    expect(b.kernel.freshness(old, changed)).toEqual({
      state: "invalidated",
      affected_axes: ["warrant"],
    });
    expect(() =>
      b.kernel.validateDisposition(
        b.disposition,
        old,
        b.posture,
        b.hypothesis,
        changed,
      ),
    ).toThrow();
    const next = structuredClone(b.hypothesis);
    next.revision = 2;
    next.content.target_claim_ref = changed.content.nodes[0]!.record_ref;
    seal(next);
    const reassessment = structuredClone(old);
    reassessment.revision = 2;
    reassessment.content.subject_ref = examinationRecordRef(next);
    reassessment.content.target_claim_ref = next.content.target_claim_ref;
    reassessment.content.basis.graph_content_hash = changed.content_hash;
    reassessment.content.prior_assessment_ref = examinationRecordRef(old);
    reassessment.content.criteria = [];
    reassessment.content.findings = [];
    reassessment.content.axes = [];
    reassessment.content.review_state = "partial";
    seal(reassessment);
    expect(() =>
      b.kernel.validateAssessment(reassessment, next, changed),
    ).not.toThrow();
    expect(old.content.target_claim_ref.revision).toBe(1);
    expect(b.kernel.freshness(reassessment, changed).state).toBe("current");
  });
});
