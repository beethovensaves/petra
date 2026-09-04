import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraModelSynthesistOutput,
  PetraSourceSpan,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  InMemoryContextPacketRegistry,
  type PacketRecord,
  runSynthesistRoleCertificationFixture,
} from "../src/index.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const setup = () => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected applied event fixture.");
  }
  const context = readFixture<PetraContextPacket>("context-packet");
  const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
  const packets = new InMemoryContextPacketRegistry();
  const records: PacketRecord[] = [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
  packets.registerContextPacket(context, records);
  packets.registerEvidencePacket(evidence);
  return { packets, context, evidence };
};

const roleProfile = (): PetraSynthesistRoleCertification["role_profile"] => {
  const contracts = new PetraContractRegistry();
  const contractHash = (name: string): string => {
    const entry = contracts.entries.find(
      (candidate) => candidate.name === name && candidate.version === "1.0.0",
    );
    if (entry === undefined) throw new Error(`Missing ${name}@1.0.0.`);
    return entry.canonical_sha256;
  };
  return {
    role_profile_id: "role_profile_01ARZ3NDEKTSV4RRFFQ69G5FE3",
    role: "synthesist",
    version: "1.0.0",
    input_contract: {
      schema_name: "evidence-packet",
      schema_version: "1.0.0",
      schema_hash: contractHash("evidence-packet"),
    },
    output_contract: {
      schema_name: "model-synthesist-output",
      schema_version: "1.0.0",
      schema_hash: contractHash("model-synthesist-output"),
    },
    required_validators: [
      "model-output-schema",
      "context-packet-grounding",
      "evidence-packet-grounding",
      "statement-origin-separation",
    ],
  };
};

describe("synthesist role certification", () => {
  it("activates only when schema, grounding, and epistemic expectations all match", () => {
    const { packets, context, evidence } = setup();
    const valid = readFixture<PetraModelSynthesistOutput>(
      "model-synthesist-output",
    );
    const malformed = structuredClone(valid) as unknown as Record<
      string,
      unknown
    >;
    delete malformed.coverage;
    const escaped = structuredClone(valid);
    const reference = escaped.statements[0]?.evidence_refs[0];
    if (reference === undefined)
      throw new Error("Expected evidence reference.");
    reference.object_id = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    const certification = readFixture<PetraSynthesistRoleCertification>(
      "model-role-certification-synthesist",
    );
    const run = runSynthesistRoleCertificationFixture({
      suite: { name: "petra-synthesist-role-smoke", version: "1.0.0" },
      dataset_snapshot_hash: canonicalHash({
        cases: ["valid-origins", "malformed", "escaped-evidence"],
      }),
      deployment: certification.deployment,
      role_profile: roleProfile(),
      scope: certification.scope,
      prompt_profile: certification.evaluation.prompt_profile,
      packets,
      cases: [
        {
          case_id: "valid-origins",
          context_packet_id: context.context_packet_id,
          evidence_packet_id: evidence.evidence_packet_id,
          observed_output: valid,
          expected_outcome: { outcome: "valid" },
          expected_output: {
            required_origins: [
              "source_report",
              "petra_synthesis",
              "unresolved_inference",
            ],
            minimum_evidence_references: 3,
          },
        },
        {
          case_id: "malformed",
          context_packet_id: context.context_packet_id,
          evidence_packet_id: evidence.evidence_packet_id,
          observed_output: malformed,
          expected_outcome: {
            outcome: "invalid",
            error_code: "SYNTHESIST_OUTPUT_SCHEMA_INVALID",
          },
        },
        {
          case_id: "escaped-evidence",
          context_packet_id: context.context_packet_id,
          evidence_packet_id: evidence.evidence_packet_id,
          observed_output: escaped,
          expected_outcome: {
            outcome: "invalid",
            error_code: "SYNTHESIS_EVIDENCE_REF_MISMATCH",
          },
        },
      ],
      certified_by: certification.certified_by,
      certified_at: certification.certified_at,
    });

    expect(run.certification.decision.status).toBe("active");
    expect(run.certification.schema_version).toBe("1.1.0");
    expect(run.certification.evaluation).toMatchObject({
      cases_total: 3,
      cases_passed: 3,
      observed_errors: [
        { code: "SYNTHESIS_EVIDENCE_REF_MISMATCH", count: 1 },
        { code: "SYNTHESIST_OUTPUT_SCHEMA_INVALID", count: 1 },
      ],
    });
  });

  it("fails a fluent grounded output that omits a required epistemic origin", () => {
    const { packets, context, evidence } = setup();
    const output = readFixture<PetraModelSynthesistOutput>(
      "model-synthesist-output",
    );
    output.statements = output.statements.filter(
      (statement) => statement.origin !== "unresolved_inference",
    ) as PetraModelSynthesistOutput["statements"];
    const certification = readFixture<PetraSynthesistRoleCertification>(
      "model-role-certification-synthesist",
    );
    const run = runSynthesistRoleCertificationFixture({
      suite: { name: "petra-synthesist-origin-check", version: "1.0.0" },
      dataset_snapshot_hash: canonicalHash({ case: "missing-origin" }),
      deployment: certification.deployment,
      role_profile: roleProfile(),
      scope: certification.scope,
      prompt_profile: certification.evaluation.prompt_profile,
      packets,
      cases: [
        {
          case_id: "missing-origin",
          context_packet_id: context.context_packet_id,
          evidence_packet_id: evidence.evidence_packet_id,
          observed_output: output,
          expected_outcome: { outcome: "valid" },
          expected_output: { required_origins: ["unresolved_inference"] },
        },
      ],
      certified_by: certification.certified_by,
      certified_at: certification.certified_at,
    });

    expect(run.certification.decision.status).toBe("failed");
    expect(run.cases[0]).toEqual({
      case_id: "missing-origin",
      expected: "valid",
      observed: "SYNTHESIST_REQUIRED_ORIGIN_MISSING",
      passed: false,
    });
  });
});
