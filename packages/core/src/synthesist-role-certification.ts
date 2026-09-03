import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraModelSynthesistOutput,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import {
  GroundedSynthesisError,
  GroundedSynthesisValidator,
} from "./grounded-synthesis.js";
import { derivePetraId } from "./identity.js";
import type { InMemoryContextPacketRegistry } from "./context-packet-registry.js";

type StatementOrigin =
  PetraModelSynthesistOutput["statements"][number]["origin"];

export interface SynthesistOutputExpectation {
  readonly required_origins?: readonly StatementOrigin[];
  readonly forbidden_origins?: readonly StatementOrigin[];
  readonly minimum_evidence_references?: number;
}

export interface SynthesistCertificationCase {
  readonly case_id: string;
  readonly context_packet_id: string;
  readonly evidence_packet_id: string;
  readonly observed_output: unknown;
  readonly expected_outcome:
    | { readonly outcome: "valid" }
    | { readonly outcome: "invalid"; readonly error_code: string };
  readonly expected_output?: SynthesistOutputExpectation;
}

export interface SynthesistCertificationFixture {
  readonly suite: {
    readonly name: string;
    readonly version: string;
  };
  readonly dataset_snapshot_hash: string;
  readonly deployment: PetraSynthesistRoleCertification["deployment"];
  readonly role_profile: PetraSynthesistRoleCertification["role_profile"];
  readonly scope: PetraSynthesistRoleCertification["scope"];
  readonly prompt_profile: PetraSynthesistRoleCertification["evaluation"]["prompt_profile"];
  readonly packets: InMemoryContextPacketRegistry;
  readonly cases: readonly [
    SynthesistCertificationCase,
    ...SynthesistCertificationCase[],
  ];
  readonly certified_by: ActorRef;
  readonly certified_at: string;
}

export interface SynthesistCertificationRun {
  readonly certification: PetraSynthesistRoleCertification;
  readonly cases: readonly {
    readonly case_id: string;
    readonly expected: string;
    readonly observed: string;
    readonly passed: boolean;
  }[];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const observeCase = (
  contracts: PetraContractRegistry,
  grounded: GroundedSynthesisValidator,
  fixtureCase: SynthesistCertificationCase,
): string => {
  try {
    contracts.assertValid(
      "model-synthesist-output",
      "1.0.0",
      fixtureCase.observed_output,
    );
  } catch {
    return "SYNTHESIST_OUTPUT_SCHEMA_INVALID";
  }

  let output: PetraModelSynthesistOutput;
  try {
    output = grounded.validate(
      fixtureCase.observed_output,
      fixtureCase.context_packet_id,
      fixtureCase.evidence_packet_id,
    ) as PetraModelSynthesistOutput;
  } catch (error) {
    return error instanceof GroundedSynthesisError
      ? error.code
      : "SYNTHESIST_OUTPUT_VALIDATION_FAILED";
  }

  const expectation = fixtureCase.expected_output;
  if (expectation === undefined) return "valid";
  const origins = new Set(
    output.statements.map((statement) => statement.origin),
  );
  if (
    expectation.required_origins?.some((origin) => !origins.has(origin)) ===
    true
  ) {
    return "SYNTHESIST_REQUIRED_ORIGIN_MISSING";
  }
  if (
    expectation.forbidden_origins?.some((origin) => origins.has(origin)) ===
    true
  ) {
    return "SYNTHESIST_FORBIDDEN_ORIGIN_PRESENT";
  }
  const references = output.statements.reduce(
    (total, statement) => total + statement.evidence_refs.length,
    0,
  );
  if (
    expectation.minimum_evidence_references !== undefined &&
    references < expectation.minimum_evidence_references
  ) {
    return "SYNTHESIST_EVIDENCE_REFERENCE_MINIMUM_MISSED";
  }
  return "valid";
};

export const runSynthesistRoleCertificationFixture = (
  fixture: SynthesistCertificationFixture,
  contracts: PetraContractRegistry = new PetraContractRegistry(),
): SynthesistCertificationRun => {
  const grounded = new GroundedSynthesisValidator(fixture.packets, contracts);
  const seen = new Set<string>();
  const observations = fixture.cases.map((fixtureCase) => {
    if (seen.has(fixtureCase.case_id)) {
      throw new Error(`Certification case ${fixtureCase.case_id} is repeated.`);
    }
    seen.add(fixtureCase.case_id);
    const expected =
      fixtureCase.expected_outcome.outcome === "valid"
        ? "valid"
        : fixtureCase.expected_outcome.error_code;
    const observed = observeCase(contracts, grounded, fixtureCase);
    return {
      case_id: fixtureCase.case_id,
      expected,
      observed,
      passed: expected === observed,
    };
  });
  const casesPassed = observations.filter((item) => item.passed).length;
  const active = casesPassed === observations.length;
  const errors = new Map<string, number>();
  for (const item of observations) {
    if (item.observed === "valid") continue;
    errors.set(item.observed, (errors.get(item.observed) ?? 0) + 1);
  }
  const decision: PetraSynthesistRoleCertification["decision"] = {
    status: active ? "active" : "failed",
    reason: active
      ? "The deployment matched every exact expected outcome in the bounded synthesist role fixture."
      : "The deployment did not match every exact expected outcome in the bounded synthesist role fixture.",
    valid_from: fixture.certified_at,
    invalidation_conditions: [
      "The deployment identity changes.",
      "The prompt, packet contracts, output contract, or required validator changes.",
      "The certification fixture or its expected outcomes change.",
    ],
  };
  const evaluation: PetraSynthesistRoleCertification["evaluation"] = {
    suite: structuredClone(fixture.suite),
    dataset_snapshot_hash: fixture.dataset_snapshot_hash,
    prompt_profile: structuredClone(fixture.prompt_profile),
    cases_total: observations.length,
    cases_passed: casesPassed,
    metrics: [
      {
        name: "fixture_cases_passed",
        value: casesPassed,
        unit: "count",
        direction: "descriptive",
      },
      {
        name: "expected_failures_missed",
        value: observations.filter(
          (item) => item.expected !== "valid" && item.observed === "valid",
        ).length,
        unit: "count",
        direction: "lower_is_better",
      },
    ],
    observed_errors: [...errors]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, count]) => ({ code, count })),
  };
  const contentHash = canonicalHash({
    deployment: fixture.deployment,
    role_profile: fixture.role_profile,
    scope: fixture.scope,
    evaluation,
    decision,
  });
  const certification: PetraSynthesistRoleCertification = {
    schema_name: "petra.model-role-certification",
    schema_version: "1.1.0",
    role_certification_id: derivePetraId("role_certification", contentHash),
    revision: 1,
    deployment: structuredClone(fixture.deployment),
    role_profile: structuredClone(fixture.role_profile),
    scope: structuredClone(fixture.scope),
    evaluation,
    decision,
    content_hash: contentHash,
    certified_by: structuredClone(fixture.certified_by),
    certified_at: fixture.certified_at,
  };
  contracts.assertValid("model-role-certification", "1.1.0", certification);
  return { certification, cases: observations };
};
