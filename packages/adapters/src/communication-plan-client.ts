import type { PetraCommunicationPlan } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { CommunicationPlanRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";
const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
/** Authenticated renderer-neutral read; it checks transport bindings and grants no authority. */
export class CommunicationPlanClient {
  constructor(
    private readonly options: {
      baseUrl: string;
      token: string;
      contracts?: PetraContractRegistry;
      fetch?: typeof fetch;
    },
  ) {}
  async read(
    projectId: string,
    request: CommunicationPlanRequest,
  ): Promise<PetraCommunicationPlan> {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/.test(projectId))
      throw new TypeError("An exact Project identity is required.");
    const url = new URL(
      `/api/queries/projects/${projectId}/communication`,
      this.options.baseUrl,
    );
    for (const [key, value] of Object.entries(request))
      if (value !== undefined) url.searchParams.set(key, String(value));
    const result = await (this.options.fetch ?? fetch)(url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!result.ok)
      throw new Error(`Communication read failed (${result.status}).`);
    const body: unknown = await result.json();
    const contracts = this.options.contracts ?? new PetraContractRegistry();
    contracts.assertValid("communication-plan", "1.0.0", body);
    const plan = body as PetraCommunicationPlan;
    const source = plan.content.source_response;
    const invocation = plan.content.invocation;
    if (
      plan.project_id !== projectId ||
      source.project_id !== projectId ||
      source.grounded_response_id !== request.response_id ||
      source.revision !== request.response_revision ||
      source.content_hash !== request.response_content_hash ||
      (await hash(source)) !== request.response_record_hash ||
      (await hash(plan.content)) !== plan.content_hash ||
      (request.expected_definition_hash !== undefined &&
        request.expected_definition_hash !==
          plan.content.composition_definition.content_hash) ||
      plan.content.composition_binding.locale !== request.locale ||
      (request.command_id === undefined
        ? invocation !== null
        : invocation?.content.invocation.content.command_ref.command_id !==
          request.command_id)
    )
      throw new Error(
        "The communication response does not match the exact requested bindings.",
      );
    const content = plan.content;
    const original = source.content;
    const call = content.model_call;
    const same = (left: unknown, right: unknown) =>
      canonicalize(left) === canonicalize(right);
    for (const record of [
      content.composition_definition,
      content.current_response,
      content.context_packet,
      content.evidence_packet,
      call,
      content.delivery,
      ...(content.thread ? [content.thread] : []),
      ...(invocation ? [invocation] : []),
      ...(content.current_invocation_delivery
        ? [content.current_invocation_delivery]
        : []),
    ]) {
      if (
        (await hash(record.content)) !== record.content_hash ||
        ("project_id" in record && record.project_id !== projectId)
      )
        throw new Error(
          "A communication owner has mismatched Project or content bindings.",
        );
    }
    if (
      content.current_response.grounded_response_id !==
        source.grounded_response_id ||
      !same(
        { ...content.current_response.content, cache: null },
        { ...original, cache: null },
      ) ||
      content.context_packet.context_packet_id !==
        original.context_packet_ref.context_packet_id ||
      content.context_packet.content_hash !==
        original.context_packet_ref.content_hash ||
      content.evidence_packet.evidence_packet_id !==
        original.evidence_packet_ref.evidence_packet_id ||
      content.evidence_packet.content_hash !==
        original.evidence_packet_ref.content_hash ||
      call.model_call_id !== original.execution_ref.model_call_id ||
      call.content.model_request_id !==
        original.execution_ref.model_request_id ||
      call.content.output === undefined ||
      (await hash(call.content.output)) !== original.model_output_hash ||
      content.artifact.artifact_id !==
        original.response_artifact_ref.artifact_id ||
      content.artifact.content_hash !==
        original.response_artifact_ref.content_hash ||
      content.artifact.byte_size !== original.response_artifact_ref.byte_size ||
      content.delivery.interaction_run_id !==
        original.interaction_ref.interaction_run_ref.interaction_run_id ||
      content.delivery.revision !==
        original.interaction_ref.interaction_run_ref.revision ||
      content.delivery.content_hash !==
        original.interaction_ref.interaction_run_ref.content_hash ||
      !same(
        content.segments
          .filter((segment) => segment.original_statement !== null)
          .map((segment) => segment.original_statement),
        call.content.output.statements,
      )
    )
      throw new Error(
        "The communication replaced exact original response content or owner references.",
      );
    if (invocation) {
      const result = invocation.content.result;
      if (
        result.state !== "available" ||
        result.result_ref.record_id !==
          content.current_response.grounded_response_id ||
        result.result_ref.revision !== content.current_response.revision ||
        result.result_ref.content_hash !==
          content.current_response.content_hash ||
        result.result_ref.record_hash !== (await hash(content.current_response))
      )
        throw new Error(
          "The communication invocation does not bind the exact current response.",
        );
    }
    for (const [name, expected] of [
      [
        "communication-plan",
        plan.content.composition_binding.plan_contract_hash,
      ],
      [
        "communication-validation-receipt",
        plan.content.composition_binding.validator_contract_hash,
      ],
      [
        "scientific-communication-payload",
        plan.content.composition_binding.profile_contract_hash,
      ],
    ] as const) {
      if (
        !contracts.entries.some(
          (entry) =>
            entry.name === name &&
            entry.version === "1.0.0" &&
            entry.canonical_sha256 === expected,
        )
      )
        throw new Error(
          "The communication composition contract is not installed.",
        );
    }
    // The plan schema pins profile.origins to the installed immutable payload.
    // Check supplied metadata against it; never infer families from prose or
    // reorder, reclassify, or repair segments before exposing them to a renderer.
    const statements = call.content.output.statements;
    if (
      content.segments.length !== statements.length + (invocation ? 1 : 0) ||
      content.segments.some((segment, index) => {
        if (segment.order !== index + 1) return true;
        const statement = statements[index];
        if (statement)
          return (
            !same(segment.original_statement, statement) ||
            segment.segment_key !== statement.statement_key ||
            segment.family !== content.profile.profile.origins[statement.origin]
          );
        return (
          invocation === null ||
          segment.original_statement !== null ||
          segment.family !== "action_report" ||
          segment.segment_key !==
            `command:${invocation.content.invocation.content.command_ref.command_id}`
        );
      })
    )
      throw new Error(
        "The communication segment metadata contradicts the original statement sequence or exact invocation.",
      );
    return plan;
  }
}
