import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraDocumentParseBundle,
  PetraModelExtractorOutput,
  PetraModelRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import { derivePetraId } from "./identity.js";
import {
  ModelEvidenceExtractionError,
  type ModelSourceSelection,
  validateModelExtractorGrounding,
} from "./model-evidence-extraction.js";

export interface ExtractorCertificationCase {
  readonly case_id: string;
  readonly source_bundle: PetraDocumentParseBundle;
  readonly source_selections: readonly [
    ModelSourceSelection,
    ...ModelSourceSelection[],
  ];
  readonly observed_output: unknown;
  readonly expected_outcome:
    | { readonly outcome: "valid" }
    | { readonly outcome: "invalid"; readonly error_code: string };
  readonly expected_candidate?: ExtractorCandidateExpectation;
}

type ExtractorCandidate = PetraModelExtractorOutput["candidates"][number];

export interface ExtractorCandidateExpectation {
  readonly source_span_id: string;
  readonly proposal_roles?: readonly ExtractorCandidate["proposal_role"][];
  readonly claim_kinds?: readonly ExtractorCandidate["claim_kind"][];
  readonly detail_levels?: readonly ExtractorCandidate["detail_level"][];
  readonly source_stances?: readonly ExtractorCandidate["source_stance"][];
  readonly modalities?: readonly ExtractorCandidate["modality"][];
  readonly negated?: boolean;
}

export interface ExtractorCertificationFixture {
  readonly suite: {
    readonly name: string;
    readonly version: string;
  };
  readonly dataset_snapshot_hash: string;
  readonly deployment: PetraModelRoleCertification["deployment"];
  readonly role_profile: PetraModelRoleCertification["role_profile"];
  readonly scope: PetraModelRoleCertification["scope"];
  readonly prompt_profile: PetraModelRoleCertification["evaluation"]["prompt_profile"];
  readonly cases: readonly [
    ExtractorCertificationCase,
    ...ExtractorCertificationCase[],
  ];
  readonly certified_by: ActorRef;
  readonly certified_at: string;
}

export interface ExtractorCertificationRun {
  readonly certification: PetraModelRoleCertification;
  readonly cases: readonly {
    case_id: string;
    expected: string;
    observed: string;
    passed: boolean;
  }[];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const observeCase = (
  contracts: PetraContractRegistry,
  fixtureCase: ExtractorCertificationCase,
): string => {
  try {
    contracts.assertValid(
      "model-extractor-output",
      "1.0.0",
      fixtureCase.observed_output,
    );
  } catch {
    return "MODEL_OUTPUT_SCHEMA_INVALID";
  }
  try {
    validateModelExtractorGrounding(
      fixtureCase.observed_output as PetraModelExtractorOutput,
      fixtureCase.source_bundle,
      fixtureCase.source_selections,
    );
  } catch (error) {
    return error instanceof ModelEvidenceExtractionError
      ? error.code
      : "MODEL_OUTPUT_VALIDATION_FAILED";
  }
  if (fixtureCase.expected_candidate !== undefined) {
    const output = fixtureCase.observed_output as PetraModelExtractorOutput;
    const expectation = fixtureCase.expected_candidate;
    const candidates = output.candidates.filter((candidate) =>
      candidate.source_quote.source_span_ids.includes(
        expectation.source_span_id,
      ),
    );
    const matches = candidates.some(
      (candidate) =>
        (expectation.proposal_roles === undefined ||
          expectation.proposal_roles.includes(candidate.proposal_role)) &&
        (expectation.claim_kinds === undefined ||
          expectation.claim_kinds.includes(candidate.claim_kind)) &&
        (expectation.detail_levels === undefined ||
          expectation.detail_levels.includes(candidate.detail_level)) &&
        (expectation.source_stances === undefined ||
          expectation.source_stances.includes(candidate.source_stance)) &&
        (expectation.modalities === undefined ||
          expectation.modalities.includes(candidate.modality)) &&
        (expectation.negated === undefined ||
          expectation.negated === candidate.negated),
    );
    if (!matches) return "MODEL_OUTPUT_EXPECTATION_FAILED";
  }
  return "valid";
};

export const runExtractorRoleCertificationFixture = (
  fixture: ExtractorCertificationFixture,
  contracts: PetraContractRegistry = new PetraContractRegistry(),
): ExtractorCertificationRun => {
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
    const observed = observeCase(contracts, fixtureCase);
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
  const decision: PetraModelRoleCertification["decision"] = {
    status: active ? ("active" as const) : ("failed" as const),
    reason: active
      ? "The deployment matched every exact expected outcome in the bounded extractor role fixture."
      : "The deployment did not match every exact expected outcome in the bounded extractor role fixture.",
    valid_from: fixture.certified_at,
    invalidation_conditions: [
      "The deployment identity changes.",
      "The prompt, input contract, output contract, or required validator changes.",
      "The certification fixture or its expected outcomes change.",
    ],
  };
  const evaluation: PetraModelRoleCertification["evaluation"] = {
    suite: fixture.suite,
    dataset_snapshot_hash: fixture.dataset_snapshot_hash,
    prompt_profile: fixture.prompt_profile,
    cases_total: observations.length,
    cases_passed: casesPassed,
    metrics: [
      {
        name: "fixture_cases_passed",
        value: casesPassed,
        unit: "count" as const,
        direction: "descriptive" as const,
      },
      {
        name: "expected_failures_missed",
        value: observations.filter(
          (item) => item.expected !== "valid" && item.observed === "valid",
        ).length,
        unit: "count" as const,
        direction: "lower_is_better" as const,
      },
    ],
    observed_errors: [...errors]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, count]) => ({ code, count })),
  };
  const identity = canonicalHash({
    deployment: fixture.deployment,
    role_profile: fixture.role_profile,
    scope: fixture.scope,
    evaluation,
    decision,
  });
  const certification: PetraModelRoleCertification = {
    schema_name: "petra.model-role-certification",
    schema_version: "1.0.0",
    role_certification_id: derivePetraId("role_certification", identity),
    revision: 1,
    deployment: structuredClone(fixture.deployment),
    role_profile: structuredClone(fixture.role_profile),
    scope: structuredClone(fixture.scope),
    evaluation,
    decision,
    content_hash: identity,
    certified_by: structuredClone(fixture.certified_by),
    certified_at: fixture.certified_at,
  };
  contracts.assertValid("model-role-certification", "1.0.0", certification);
  return { certification, cases: observations };
};
