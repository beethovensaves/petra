import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraDocumentParseBundle,
  PetraModelExtractorOutput,
  PetraModelRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  extractorRoutingPolicyHash,
  ModelGateway,
  type ExtractorGatewayRequest,
  type ExtractorModelAdapter,
  type ExtractorModelDeployment,
  type ExtractorRoutingPolicy,
  type ModelGatewayError,
} from "../src/model-gateway.js";
import { runExtractorRoleCertificationFixture } from "../src/extractor-role-certification.js";

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

const sourceBundle = (): PetraDocumentParseBundle =>
  readFixture<PetraDocumentParseBundle>("document-parse-bundle");

const extractorOutput = (): PetraModelExtractorOutput =>
  readFixture<PetraModelExtractorOutput>("model-extractor-output");

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const messages = [
  {
    role: "system" as const,
    content:
      "Extract only atomic, source-grounded scientific proposals. Preserve scope and never assign authority.",
  },
  {
    role: "user" as const,
    content: "Extract the proposition in the selected passage.",
  },
] as const;

const deploymentSnapshot = (
  suffix = "01ARZ3NDEKTSV4RRFFQ69G5FE0",
  location: "local" | "remote" = "local",
): PetraModelRoleCertification["deployment"] => ({
  model_deployment_id: `model_deployment_${suffix}`,
  provider_id: `provider_${suffix}`,
  provider_kind: "fixture",
  provider_model: `petra-extractor-${suffix}`,
  observed_revision: "fixture-v1",
  replayability: "exact",
  execution_location: location,
  structured_output: true,
  max_context_tokens: 8192,
});

const roleProfile = (): PetraModelRoleCertification["role_profile"] => {
  const contracts = new PetraContractRegistry();
  const schemaHash = (name: string): string => {
    const entry = contracts.entries.find(
      (candidate) => candidate.name === name && candidate.version === "1.0.0",
    );
    if (entry === undefined) throw new Error(`Missing ${name} schema.`);
    return entry.canonical_sha256;
  };
  return {
    role_profile_id: "role_profile_01ARZ3NDEKTSV4RRFFQ69G5FE1",
    role: "extractor",
    version: "1.0.0",
    input_contract: {
      schema_name: "document-parse-bundle",
      schema_version: "1.0.0",
      schema_hash: schemaHash("document-parse-bundle"),
    },
    output_contract: {
      schema_name: "model-extractor-output",
      schema_version: "1.0.0",
      schema_hash: schemaHash("model-extractor-output"),
    },
    required_validators: [
      "model-output-schema",
      "source-span-grounding",
      "abstract-scope",
    ],
  };
};

const selections = () =>
  [
    {
      source_span_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7",
      exact_text: "The study reports a measurable improvement.",
      structural_path: "abstract/results",
      page_numbers: [1] as [number],
    },
  ] as const;

const certify = (
  deployment = deploymentSnapshot(),
): PetraModelRoleCertification => {
  const valid = extractorOutput();
  const fabricated = structuredClone(valid);
  const first = fabricated.candidates[0];
  if (first === undefined) throw new Error("Expected an extractor candidate.");
  first.source_quote.exact_text = "A fabricated sentence not in the source.";
  return runExtractorRoleCertificationFixture({
    suite: { name: "petra-extractor-role-smoke", version: "1.0.0" },
    dataset_snapshot_hash: canonicalHash({
      cases: ["valid", "malformed", "fabricated-quote"],
    }),
    deployment,
    role_profile: roleProfile(),
    scope: {
      domain: "cross-domain scientific text",
      language: "en",
      modality: "text",
      document_class: "scholarly",
    },
    prompt_profile: {
      name: "petra-source-grounded-extractor",
      version: "1.0.0",
      content_hash: canonicalHash(messages),
    },
    cases: [
      {
        case_id: "valid",
        source_bundle: sourceBundle(),
        source_selections: selections(),
        observed_output: valid,
        expected_outcome: { outcome: "valid" },
      },
      {
        case_id: "malformed",
        source_bundle: sourceBundle(),
        source_selections: selections(),
        observed_output: {
          schema_name: "petra.model-extractor-output",
          schema_version: "1.0.0",
          candidates: [],
          diagnostics: [],
        },
        expected_outcome: {
          outcome: "invalid",
          error_code: "MODEL_OUTPUT_SCHEMA_INVALID",
        },
      },
      {
        case_id: "fabricated-quote",
        source_bundle: sourceBundle(),
        source_selections: selections(),
        observed_output: fabricated,
        expected_outcome: {
          outcome: "invalid",
          error_code: "MODEL_OUTPUT_QUOTE_NOT_GROUNDED",
        },
      },
    ],
    certified_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "service",
    },
    certified_at: "2026-09-02T19:00:00.000Z",
  }).certification;
};

const deploymentConfig = (
  snapshot = deploymentSnapshot(),
  overrides: Partial<ExtractorModelDeployment> = {},
): ExtractorModelDeployment => ({
  deployment: snapshot,
  adapter_id: `adapter-${snapshot.model_deployment_id}`,
  active: true,
  health: "healthy",
  provider_policy_verified: true,
  accepted_egress_classes: ["E0"],
  accepted_data_classes: ["open_full_text", "source_spans"],
  expected_validated_cost_usd: "0",
  expected_latency_ms: 4,
  endpoint_fingerprint: canonicalHash({
    adapter: snapshot.model_deployment_id,
  }),
  ...overrides,
});

const policyFor = (
  deploymentIds: readonly string[],
): ExtractorRoutingPolicy => {
  const content = {
    routing_policy_id: "routing_policy_01ARZ3NDEKTSV4RRFFQ69G5FE2",
    revision: 1 as const,
    project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    role: "extractor" as const,
    active: true,
    permitted_deployment_ids: deploymentIds,
    max_egress_class: "E2" as const,
    selection: "validated_cost_then_latency_then_identity" as const,
  };
  return { ...content, content_hash: extractorRoutingPolicyHash(content) };
};

const adapterFor = (
  output: unknown = extractorOutput(),
): ExtractorModelAdapter => ({
  invoke: vi.fn(() =>
    Promise.resolve({
      outcome: "success" as const,
      provider_request_id: "fixture-request-1",
      observed_revision: "fixture-v1",
      output,
      timing: {
        queue_ms: 0,
        first_token_ms: 2,
        total_ms: 4,
        validation_ms: 1,
      },
      usage: {
        accounting: "provider_reported" as const,
        input_tokens: 84,
        output_tokens: 112,
      },
      cost: {
        amount: "0",
        currency: "USD" as const,
        accounting: "computed" as const,
        pricing_source: "Local fixture deployment.",
      },
    }),
  ),
});

const requestFor = (
  policy: ExtractorRoutingPolicy,
): ExtractorGatewayRequest => ({
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  workflow_id: "extraction_run_01ARZ3NDEKTSV4RRFFQ69G5FE3",
  objective: "Extract atomic scientific proposals from the selected passage.",
  impact_class: "routine",
  context_packet_ref: {
    context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
    content_hash:
      "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
  },
  source_bundle: sourceBundle(),
  source_selections: selections(),
  egress_class: "E0",
  visibility: "private",
  data_classes: ["open_full_text", "source_spans"],
  rights_decision_ids: ["rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB3"],
  selected_fields: ["exact_text", "structural_path", "page_numbers"],
  redactions: [],
  capability_grant_id: "grant_01ARZ3NDEKTSV4RRFFQ69G5FE4",
  purpose: "Bounded scientific Claim extraction.",
  prompt_profile: {
    name: "petra-source-grounded-extractor",
    version: "1.0.0",
    content_hash: canonicalHash(messages),
  },
  messages: [...messages],
  parameters: { temperature: 0, seed: 7, max_output_tokens: 1200 },
  budget: {
    max_attempts: 1,
    max_input_tokens: 2000,
    max_output_tokens: 1200,
    max_latency_ms: 5000,
    max_cost_usd: "0",
  },
  estimated_input_tokens: 300,
  certification_scope: {
    domain: "computational linguistics",
    language: "en",
    modality: "text",
    document_class: "peer_reviewed",
  },
  routing_policy: policy,
  created_by: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "service",
  },
  requested_at: "2026-09-02T19:01:00.000Z",
});

describe("policy-first extractor ModelGateway", () => {
  it("certifies exact fixture behavior before activating a deployment", () => {
    const certification = certify();
    expect(certification.decision.status).toBe("active");
    expect(certification.evaluation).toMatchObject({
      cases_total: 3,
      cases_passed: 3,
      observed_errors: [
        { code: "MODEL_OUTPUT_QUOTE_NOT_GROUNDED", count: 1 },
        { code: "MODEL_OUTPUT_SCHEMA_INVALID", count: 1 },
      ],
    });
    expect(certification.content_hash).toBe(
      canonicalHash({
        deployment: certification.deployment,
        role_profile: certification.role_profile,
        scope: certification.scope,
        evaluation: certification.evaluation,
        decision: certification.decision,
      }),
    );
  });

  it("routes one certified call and emits only a quarantine proposal", async () => {
    const gateway = new ModelGateway();
    const snapshot = deploymentSnapshot();
    const config = deploymentConfig(snapshot);
    const adapter = adapterFor();
    gateway.registerDeployment(config, adapter);
    gateway.registerCertification(certify(snapshot));

    const request = requestFor(policyFor([snapshot.model_deployment_id]));
    const result = await gateway.executeExtractor(request);
    const replay = await gateway.executeExtractor(request);

    expect(adapter.invoke).toHaveBeenCalledOnce();
    expect(replay).toStrictEqual(result);
    expect(result.request.content.terminal.state).toBe("completed");
    expect(result.request.content.routing.selected?.model_deployment_id).toBe(
      snapshot.model_deployment_id,
    );
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]).toMatchObject({
      content: {
        outcome: "success",
        usage: { input_tokens: 84, output_tokens: 112 },
        cost: { amount: "0", currency: "USD" },
      },
    });
    expect(result.proposal_bundle?.content.extraction).toMatchObject({
      extraction_kind: "model_extraction",
      model_request_id: result.request.model_request_id,
      model_call_id: result.calls[0]?.model_call_id,
      model_deployment: snapshot.model_deployment_id,
    });
    expect(result.proposal_bundle?.content.candidates[0]).toMatchObject({
      claim: {
        authority: { zone: "quarantine", review_state: "machine_checked" },
        basis: {
          derivation: {
            derivation_kind: "model_extraction",
            derivation_ref: result.calls[0]?.model_call_id,
          },
        },
      },
      assertion: {
        authority: { zone: "quarantine", review_state: "machine_checked" },
      },
    });
    expect(gateway.getRequest(result.request.model_request_id)).toStrictEqual(
      result.request,
    );
  });

  it("selects by validated cost, then latency, then stable identity", async () => {
    const gateway = new ModelGateway();
    const expensive = deploymentSnapshot("01ARZ3NDEKTSV4RRFFQ69G5FE5");
    const cheap = deploymentSnapshot("01ARZ3NDEKTSV4RRFFQ69G5FE6");
    const expensiveAdapter = adapterFor();
    const cheapAdapter = adapterFor();
    gateway.registerDeployment(
      deploymentConfig(expensive, {
        expected_validated_cost_usd: "0.02",
        accepted_egress_classes: ["E2"],
      }),
      expensiveAdapter,
    );
    gateway.registerDeployment(
      deploymentConfig(cheap, {
        expected_validated_cost_usd: "0.01",
        accepted_egress_classes: ["E2"],
      }),
      cheapAdapter,
    );
    gateway.registerCertification(certify(expensive));
    gateway.registerCertification(certify(cheap));
    const policy = policyFor([
      expensive.model_deployment_id,
      cheap.model_deployment_id,
    ]);
    const request = {
      ...requestFor(policy),
      egress_class: "E2" as const,
      budget: {
        ...requestFor(policy).budget,
        max_cost_usd: "0.10",
      },
    };

    const result = await gateway.executeExtractor(request);

    expect(result.request.content.routing.selected?.model_deployment_id).toBe(
      cheap.model_deployment_id,
    );
    expect(cheapAdapter.invoke).toHaveBeenCalledOnce();
    expect(expensiveAdapter.invoke).not.toHaveBeenCalled();
  });

  it("records policy exclusions and makes no call when every route is blocked", async () => {
    const gateway = new ModelGateway();
    const remote = deploymentSnapshot("01ARZ3NDEKTSV4RRFFQ69G5FE7", "remote");
    const uncertified = deploymentSnapshot("01ARZ3NDEKTSV4RRFFQ69G5FE8");
    const remoteAdapter = adapterFor();
    const uncertifiedAdapter = adapterFor();
    gateway.registerDeployment(
      deploymentConfig(remote, {
        accepted_egress_classes: ["E0", "E2"],
      }),
      remoteAdapter,
    );
    gateway.registerDeployment(
      deploymentConfig(uncertified),
      uncertifiedAdapter,
    );
    gateway.registerCertification(certify(remote));
    const result = await gateway.executeExtractor(
      requestFor(
        policyFor([
          remote.model_deployment_id,
          uncertified.model_deployment_id,
        ]),
      ),
    );

    expect(result.request.content.terminal.state).toBe("blocked_policy");
    expect(result.calls).toEqual([]);
    expect(result.request.content.routing.excluded).toEqual([
      expect.objectContaining({ code: "EGRESS_LOCAL_ONLY" }),
      expect.objectContaining({ code: "ROLE_CERTIFICATION_MISSING" }),
    ]);
    expect(remoteAdapter.invoke).not.toHaveBeenCalled();
    expect(uncertifiedAdapter.invoke).not.toHaveBeenCalled();
  });

  it("retains invalid raw output but creates no scientific proposal", async () => {
    const gateway = new ModelGateway();
    const snapshot = deploymentSnapshot();
    gateway.registerDeployment(
      deploymentConfig(snapshot),
      adapterFor({ plausible_claim: "Unsupported free-form response" }),
    );
    gateway.registerCertification(certify(snapshot));

    const result = await gateway.executeExtractor(
      requestFor(policyFor([snapshot.model_deployment_id])),
    );

    expect(result.request.content.terminal).toMatchObject({
      state: "validation_failed",
      failure_code: "MODEL_OUTPUT_SCHEMA_INVALID",
      proposal_bundle_ids: [],
    });
    expect(result.calls[0]?.content).toMatchObject({
      outcome: "validation_failed",
      raw_output: {
        payload: { plausible_claim: "Unsupported free-form response" },
      },
      failure: { retryable: false },
    });
    expect(result.calls[0]?.content.output).toBeUndefined();
    expect(result.proposal_bundle).toBeUndefined();
  });

  it("rejects a schema-valid fabricated quote and a changed policy hash", async () => {
    const fabricated = extractorOutput();
    const first = fabricated.candidates[0];
    if (first === undefined) throw new Error("Expected a candidate.");
    first.source_quote.exact_text =
      "A plausible statement absent from the source.";
    const gateway = new ModelGateway();
    const snapshot = deploymentSnapshot();
    gateway.registerDeployment(
      deploymentConfig(snapshot),
      adapterFor(fabricated),
    );
    gateway.registerCertification(certify(snapshot));
    const policy = policyFor([snapshot.model_deployment_id]);

    const result = await gateway.executeExtractor(requestFor(policy));
    expect(result.request.content.terminal).toMatchObject({
      state: "validation_failed",
      failure_code: "MODEL_OUTPUT_QUOTE_NOT_GROUNDED",
      proposal_bundle_ids: [],
    });

    await expect(
      gateway.executeExtractor(requestFor({ ...policy, active: false })),
    ).rejects.toMatchObject({
      code: "ROUTING_POLICY_HASH_MISMATCH",
    } satisfies Partial<ModelGatewayError>);
  });

  it("blocks output from an uncertified observed revision", async () => {
    const gateway = new ModelGateway();
    const snapshot = deploymentSnapshot();
    const driftedAdapter: ExtractorModelAdapter = {
      invoke: vi.fn(() =>
        Promise.resolve({
          outcome: "success" as const,
          provider_request_id: "fixture-drift",
          observed_revision: "fixture-v2",
          output: extractorOutput(),
          timing: { queue_ms: 0, total_ms: 3, validation_ms: 0 },
          usage: {
            accounting: "provider_reported" as const,
            input_tokens: 80,
            output_tokens: 100,
          },
          cost: {
            amount: "0",
            currency: "USD" as const,
            accounting: "computed" as const,
            pricing_source: "Local fixture deployment.",
          },
        }),
      ),
    };
    gateway.registerDeployment(deploymentConfig(snapshot), driftedAdapter);
    gateway.registerCertification(certify(snapshot));

    const result = await gateway.executeExtractor(
      requestFor(policyFor([snapshot.model_deployment_id])),
    );

    expect(result.request.content.terminal).toMatchObject({
      state: "validation_failed",
      failure_code: "DEPLOYMENT_REVISION_DRIFT",
      proposal_bundle_ids: [],
    });
    expect(result.calls[0]?.content.raw_output).toBeDefined();
    expect(result.proposal_bundle).toBeUndefined();
  });

  it("records a successful call but emits no proposal after observed budget overrun", async () => {
    const gateway = new ModelGateway();
    const snapshot = deploymentSnapshot();
    const expensiveActual: ExtractorModelAdapter = {
      invoke: vi.fn(() =>
        Promise.resolve({
          outcome: "success" as const,
          provider_request_id: "fixture-overrun",
          observed_revision: "fixture-v1",
          output: extractorOutput(),
          timing: { queue_ms: 0, total_ms: 4, validation_ms: 1 },
          usage: {
            accounting: "provider_reported" as const,
            input_tokens: 84,
            output_tokens: 112,
          },
          cost: {
            amount: "0.01",
            currency: "USD" as const,
            accounting: "provider_reported" as const,
            pricing_source: "Fixture observation.",
          },
        }),
      ),
    };
    gateway.registerDeployment(deploymentConfig(snapshot), expensiveActual);
    gateway.registerCertification(certify(snapshot));

    const result = await gateway.executeExtractor(
      requestFor(policyFor([snapshot.model_deployment_id])),
    );

    expect(result.calls[0]?.content).toMatchObject({
      outcome: "success",
      cost: { amount: "0.01" },
      output: { schema_name: "petra.model-extractor-output" },
    });
    expect(result.request.content.terminal).toMatchObject({
      state: "budget_exhausted",
      failure_code: "OBSERVED_BUDGET_EXCEEDED",
      proposal_bundle_ids: [],
    });
    expect(result.proposal_bundle).toBeUndefined();
  });
});
