import { readFile } from "node:fs/promises";

import { projectSynthesistOutputSchemaForProvider } from "@petra/adapters";
import {
  CodexSubscriptionProvider,
  CodexSubscriptionSynthesistAdapter,
} from "@petra/adapters/server";
import {
  GroundedSynthesisValidator,
  InMemoryContextPacketRegistry,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

const [
  canonicalSchema,
  commonSchema,
  modelCall,
  context,
  evidence,
  event,
  span,
] = await Promise.all([
  readJson(
    "../packages/contracts/schemas/model-synthesist-output/1.0.0/schema.json",
  ),
  readJson("../packages/contracts/schemas/common/1.0.0/schema.json"),
  readJson(
    "../packages/contracts/fixtures/accepted/model-call-synthesist.json",
  ),
  readJson("../packages/contracts/fixtures/accepted/context-packet.json"),
  readJson("../packages/contracts/fixtures/accepted/evidence-packet.json"),
  readJson(
    "../packages/contracts/fixtures/accepted/domain-event-change-set-applied.json",
  ),
  readJson("../packages/contracts/fixtures/accepted/source-span.json"),
]);

if (event.event.event_type !== "change_set.applied") {
  throw new Error("The synthesis smoke fixture requires an applied ChangeSet.");
}

const packetRegistry = new InMemoryContextPacketRegistry();
packetRegistry.registerContextPacket(context, [
  event.event.payload.claim,
  event.event.payload.assertion,
  span,
]);
packetRegistry.registerEvidencePacket(evidence);
const grounded = new GroundedSynthesisValidator(packetRegistry);
const providerSchema = projectSynthesistOutputSchemaForProvider(
  canonicalSchema,
  commonSchema,
  { strictObjectProperties: true },
);

const provider = await CodexSubscriptionProvider.startSidecar({
  cwd: process.cwd(),
  requestTimeoutMs: 30_000,
});

try {
  const account = await provider.readAccount();
  if (!account.authenticated || account.authMode !== "chatgpt") {
    throw new Error(
      "A Codex-managed ChatGPT OAuth session is required; Petra will not fall back to an API key.",
    );
  }
  const catalog = await provider.listModels();
  const requestedModel =
    process.env.PETRA_CODEX_SYNTHESIST_MODEL ?? "gpt-5.6-terra";
  if (!catalog.some((entry) => entry.model === requestedModel)) {
    throw new Error(
      `The managed ChatGPT entitlement does not expose ${requestedModel}.`,
    );
  }

  const adapter = new CodexSubscriptionSynthesistAdapter({
    provider,
    workspaceRoot: process.cwd(),
    timeoutMs: 120_000,
    outputSchema: {
      name: "petra_model_synthesist_output",
      description:
        "A bounded scientific response with explicit epistemic origins and exact evidence references.",
      schema: providerSchema,
    },
    effort: "low",
  });
  const response = await adapter.invoke({
    model_request_id: modelCall.content.model_request_id,
    model_call_id: modelCall.model_call_id,
    deployment: {
      ...modelCall.content.deployment,
      provider_kind: "codex_app_server",
      provider_model: requestedModel,
      observed_revision: requestedModel,
      replayability: "best_effort",
      execution_location: "remote",
      structured_output: true,
      max_context_tokens: 131_072,
    },
    input: {
      ...modelCall.content.input,
      messages: [
        {
          role: "system",
          content: [
            "Act as Petra's bounded scientific synthesist.",
            "Report only what the exact packet supports.",
            "Every source_report must reference the ASSERTS selection at order 2.",
            "A petra_synthesis, if used, must reference both the Claim at order 1 and Assertion at order 2.",
            "Use SourceSpan order 3 for either material reference.",
            "Use unresolved_inference only for a question the packet cannot settle.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            "Explain what this bounded packet establishes and what it does not.",
            "Reproduce the EvidencePacket coverage controls exactly:",
            canonicalize(evidence.content.coverage),
            `Material omissions acknowledged: ${context.content.omissions.some((item) => item.material)}.`,
            "Abstract-only sources used: false.",
          ].join("\n"),
        },
      ],
    },
    parameters: { temperature: 0, max_output_tokens: 1600 },
    output_contract: modelCall.content.output_contract,
  });

  if (response.outcome !== "success") {
    throw new Error(`${response.failure.code}: ${response.failure.message}`);
  }
  const validated = grounded.validate(
    response.output,
    context.context_packet_id,
    evidence.evidence_packet_id,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        authentication: {
          authMode: account.authMode,
          planType: account.planType,
          apiKeyUsed: false,
        },
        deployment: {
          model: requestedModel,
          observedRevision: response.observed_revision,
        },
        call: {
          providerRequestIdPresent:
            (response.provider_request_id?.length ?? 0) > 0,
          outcome: response.outcome,
          costAccounting: response.cost.accounting,
        },
        validation: {
          grounded: true,
          statementOrigins: validated.statements.map((item) => item.origin),
          evidenceReferences: validated.statements.reduce(
            (total, item) => total + item.evidence_refs.length,
            0,
          ),
        },
      },
      null,
      2,
    ),
  );
} finally {
  await provider.close();
}
