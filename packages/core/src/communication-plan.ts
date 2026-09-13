import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type {
  PetraCommunicationPlan,
  CommunicationSegment,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { ProfileCommunicationResolver } from "./profile-communication.js";
import { parsePetraId } from "./identity.js";

export const communicationHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
export class CommunicationPlanError extends Error {
  readonly code = "COMMUNICATION_PLAN_INVALID";
}
export interface CommunicationPlanRequest {
  response_id: string;
  response_revision: number;
  response_content_hash: string;
  response_record_hash: string;
  command_id?: string;
  locale: string;
  expected_definition_hash?: string;
}
export interface CommunicationPlanReader {
  getCommunicationPlan(
    projectId: string,
    request: CommunicationPlanRequest,
  ): Promise<PetraCommunicationPlan | undefined>;
}
export function validateCommunicationRequest(
  projectId: string,
  request: CommunicationPlanRequest,
): void {
  if (typeof request.response_id !== "string")
    throw new CommunicationPlanError("An exact response identity is required.");
  parsePetraId(projectId, "project");
  parsePetraId(request.response_id, "grounded_response");
  if (request.command_id !== undefined)
    parsePetraId(request.command_id, "command");
  if (
    !Number.isSafeInteger(request.response_revision) ||
    request.response_revision < 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(request.response_content_hash) ||
    !/^sha256:[a-f0-9]{64}$/.test(request.response_record_hash) ||
    (request.expected_definition_hash !== undefined &&
      !/^sha256:[a-f0-9]{64}$/.test(request.expected_definition_hash))
  )
    throw new CommunicationPlanError(
      "An exact response revision and hashes are required.",
    );
}

type Content = PetraCommunicationPlan["content"];
export type CommunicationPlanSources = Pick<
  Content,
  | "composition_definition"
  | "source_response"
  | "current_response"
  | "context_packet"
  | "evidence_packet"
  | "model_call"
  | "artifact"
  | "actors"
  | "source_records"
  | "thread"
  | "project_turn_id"
  | "invocation"
  | "delivery"
  | "current_invocation_delivery"
  | "authority"
>;

/** Pure scientific adapter over exact canonical owners read in a single authorized snapshot. */
export function composeCommunicationPlan(
  sources: CommunicationPlanSources,
  locale: string,
  readAt: string,
  contracts: PetraContractRegistry,
): PetraCommunicationPlan {
  const fail = (message: string): never => {
    throw new CommunicationPlanError(message);
  };
  const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
  const {
    composition_definition: definition,
    source_response: response,
    current_response: current,
    context_packet: context,
    evidence_packet: evidence,
    model_call: call,
    artifact,
    invocation,
    delivery,
  } = sources;
  for (const record of [
    definition,
    response,
    current,
    context,
    evidence,
    call,
    delivery,
    ...(invocation ? [invocation] : []),
    ...(sources.thread ? [sources.thread] : []),
    ...(sources.current_invocation_delivery
      ? [sources.current_invocation_delivery]
      : []),
  ]) {
    contracts.assertValid(
      record.schema_name.slice("petra.".length),
      record.schema_version,
      record,
    );
    if (communicationHash(record.content) !== record.content_hash)
      fail("A communication owner has an invalid content hash.");
  }
  const projectId = definition.project_id;
  const c = response.content;
  for (const record of [
    response,
    current,
    context,
    evidence,
    delivery,
    ...(invocation ? [invocation] : []),
    ...(sources.current_invocation_delivery
      ? [sources.current_invocation_delivery]
      : []),
    ...(sources.thread ? [sources.thread] : []),
  ]) {
    if (record.project_id !== projectId)
      fail("A communication owner crossed the exact Project boundary.");
  }
  if (
    current.grounded_response_id !== response.grounded_response_id ||
    !same({ ...current.content, cache: null }, { ...c, cache: null }) ||
    context.context_packet_id !== c.context_packet_ref.context_packet_id ||
    context.content_hash !== c.context_packet_ref.content_hash ||
    evidence.evidence_packet_id !== c.evidence_packet_ref.evidence_packet_id ||
    evidence.content_hash !== c.evidence_packet_ref.content_hash ||
    !same(context.snapshot_ref, c.snapshot_ref) ||
    !same(evidence.snapshot_ref, c.snapshot_ref) ||
    evidence.content.context_packet_ref.context_packet_id !==
      context.context_packet_id ||
    evidence.content.context_packet_ref.content_hash !== context.content_hash ||
    call.model_call_id !== c.execution_ref.model_call_id ||
    call.content.model_request_id !== c.execution_ref.model_request_id ||
    call.content.deployment.model_deployment_id !==
      c.execution_ref.model_deployment_id ||
    call.content.input.context_packet_ref.context_packet_id !==
      context.context_packet_id ||
    call.content.input.context_packet_ref.content_hash !==
      context.content_hash ||
    call.content.input.evidence_packet_ref.evidence_packet_id !==
      evidence.evidence_packet_id ||
    call.content.input.evidence_packet_ref.content_hash !==
      evidence.content_hash ||
    call.content.outcome !== "success" ||
    call.content.output === undefined ||
    communicationHash(call.content.output) !== c.model_output_hash ||
    artifact.artifact_id !== c.response_artifact_ref.artifact_id ||
    artifact.content_hash !== c.response_artifact_ref.content_hash ||
    artifact.byte_size !== c.response_artifact_ref.byte_size ||
    artifact.media_type !== c.response_artifact_ref.media_type ||
    delivery.interaction_run_id !==
      c.interaction_ref.interaction_run_ref.interaction_run_id ||
    delivery.revision !== c.interaction_ref.interaction_run_ref.revision ||
    delivery.content_hash !== c.interaction_ref.interaction_run_ref.content_hash
  )
    fail(
      "The response does not reproduce its exact canonical output, packets, Artifact, or delivery binding.",
    );
  if (invocation !== null) {
    const result = invocation.content.result;
    if (
      result.state !== "available" ||
      result.result_ref.record_id !== current.grounded_response_id ||
      result.result_ref.revision !== current.revision ||
      result.result_ref.content_hash !== current.content_hash ||
      result.result_ref.record_hash !== communicationHash(current)
    )
      fail(
        "The invocation does not identify this exact response's current result revision.",
      );
  }
  if (sources.thread !== null) {
    const turn = sources.thread.content.turns.find(
      (turn) => turn.project_turn_id === sources.project_turn_id,
    );
    if (
      !turn ||
      turn.response.result_record_ref.record_id !==
        response.grounded_response_id ||
      turn.response.result_record_ref.revision !== response.revision ||
      turn.response.result_record_ref.content_hash !== response.content_hash ||
      !same(turn.response.response_artifact_ref, c.response_artifact_ref) ||
      !same(turn.execution, c.interaction_ref) ||
      turn.context.context_record_ref.record_id !== context.context_packet_id ||
      turn.context.context_record_ref.content_hash !== context.content_hash
    )
      fail(
        "The product thread turn is not exactly linked to this response and execution.",
      );
  } else if (sources.project_turn_id !== null)
    fail("A product turn cannot be supplied without its canonical thread.");
  if (sources.current_invocation_delivery !== null) {
    const linked = invocation?.content.interaction;
    const observed = sources.current_invocation_delivery;
    if (
      linked?.durable_state !== "available" ||
      linked.interaction_run_ref === undefined ||
      linked.interaction_run_ref.record_id !== observed.interaction_run_id ||
      linked.interaction_run_ref.revision !== observed.revision ||
      linked.interaction_run_ref.content_hash !== observed.content_hash ||
      linked.interaction_run_ref.record_hash !== communicationHash(observed)
    )
      fail(
        "The current invocation delivery observation has a mismatched identity.",
      );
  } else if (invocation?.content.interaction.durable_state === "available")
    fail("The exact current invocation delivery owner is missing.");
  const actorRefs = [
    response.recorded_by,
    artifact.created_by,
    context.compiled_by,
    evidence.compiled_by,
    delivery.content.authority_context.actor,
    ...(sources.thread
      ? [
          sources.thread.created_by,
          ...sources.thread.content.turns
            .filter((turn) => turn.project_turn_id === sources.project_turn_id)
            .map((turn) => turn.authority_context.actor),
        ]
      : []),
    ...(invocation
      ? [invocation.content.invocation.content.command_ref.actor]
      : []),
  ];
  for (const actorRef of actorRefs) {
    if (
      !sources.actors.some(
        (actor) =>
          actor.actor_id === actorRef.actor_id &&
          actor.actor_kind === actorRef.actor_kind,
      )
    )
      fail("Required recorded attribution has no exact canonical Actor.");
  }
  const resolver = new ProfileCommunicationResolver(contracts);
  const expected = {
    project_id: projectId,
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
  };
  const resolution = resolver.resolve(definition, expected, locale);
  const profile = resolution.payload.profile;
  if (
    call.content.output_contract.schema_hash !==
    profile.response_schema.content_hash
  )
    fail(
      "The original response schema hash is incompatible with the registered communication profile.",
    );
  const labels: Content["reference_labels"] = [];
  const segments: CommunicationSegment[] = [];
  const selected = evidence.content.selected_evidence;
  const included = context.content.included_objects;
  const output = call.content.output!;
  const sourceRecord = (
    kind: string,
    id: string,
    revision: number,
    hash: string,
  ) =>
    sources.source_records.find((record) => {
      const identity = record as unknown as Record<string, unknown>;
      return (
        record.schema_name === `petra.${kind.replaceAll("_", "-")}` &&
        identity[`${kind}_id`] === id &&
        record.revision === revision &&
        communicationHash(record) === hash
      );
    });
  for (const [index, statement] of output.statements.entries()) {
    const findings: string[] = [];
    if (
      output.statements.filter(
        (s) => s.statement_key === statement.statement_key,
      ).length !== 1
    )
      findings.push("The original statement key is duplicated.");
    for (const ref of statement.evidence_refs) {
      const selection = selected.find(
        (s) => s.context_selection_order === ref.context_selection_order,
      );
      const inclusion = included.find(
        (s) => s.selection_order === ref.context_selection_order,
      );
      const object = {
        object_kind: ref.object_kind,
        object_id: ref.object_id,
        object_revision: ref.object_revision,
        object_hash: ref.object_hash,
      };
      if (
        !selection ||
        !inclusion ||
        !same(selection.object_ref, object) ||
        !same(inclusion.object_ref, object) ||
        inclusion.authority.zone !== "trusted" ||
        !same(
          [...selection.source_span_selection_orders].sort(),
          [...ref.source_span_selection_orders].sort(),
        ) ||
        !sourceRecord(
          ref.object_kind,
          ref.object_id,
          ref.object_revision,
          ref.object_hash,
        )
      )
        findings.push(
          `The exact original evidence selection ${ref.context_selection_order} could not be verified.`,
        );
      for (const order of ref.source_span_selection_orders) {
        const span = selected.find((s) => s.context_selection_order === order);
        const spanContext = included.find((s) => s.selection_order === order);
        if (
          !span ||
          span.object_ref.object_kind !== "source_span" ||
          !spanContext ||
          !same(span.object_ref, spanContext.object_ref) ||
          !sourceRecord(
            "source_span",
            span.object_ref.object_id,
            1,
            span.object_ref.object_hash,
          )
        )
          findings.push(`SourceSpan selection ${order} could not be verified.`);
      }
    }
    if (
      statement.origin === "source_report" &&
      !statement.evidence_refs.some((ref) => {
        const record = sourceRecord(
          ref.object_kind,
          ref.object_id,
          ref.object_revision,
          ref.object_hash,
        );
        return (
          record?.schema_name === "petra.assertion" &&
          record.predicate === "ASSERTS"
        );
      })
    )
      findings.push("Source attribution requires an exact ASSERTS record.");
    if (
      statement.origin === "petra_synthesis" &&
      (statement.evidence_refs.length < 2 ||
        !statement.evidence_refs.some((ref) => ref.object_kind === "assertion"))
    )
      findings.push(
        "The synthesis lacks its required multiple evidence references and Assertion.",
      );
    const mapping = profile.origins[statement.origin];
    if (!mapping)
      fail("The registered profile cannot map the original statement origin.");
    segments.push({
      segment_key: statement.statement_key,
      order: index + 1,
      family: mapping,
      original_statement: structuredClone(statement),
      preservation: findings.length ? "blocked" : "passed",
      findings,
      force: "unavailable_as_structured_source_data",
      conditions: "unavailable_as_structured_source_data",
      presentation_depth: "material",
      language_validation: "not_performed",
    });
  }
  for (const inclusion of included) {
    const ref = inclusion.object_ref;
    if (
      !sourceRecord(
        ref.object_kind,
        ref.object_id,
        ref.object_revision,
        ref.object_hash,
      )
    )
      continue;
    const owner = profile.reference_owners.find(
      (owner) => owner.canonical_kind === ref.object_kind,
    );
    if (!owner)
      fail("A source reference kind has no registered communication owner.");
    const resolved = resolver.resolveReference(definition, expected, locale, {
      semantic_key: owner!.semantic_key,
      canonical_id: ref.object_id,
      revision: ref.object_revision,
      content_hash: ref.object_hash,
      source_language: null,
    });
    labels.push({
      ...resolved.reference,
      first_reference: resolved.first_reference,
      later_reference: resolved.later_reference,
      text_alternative: resolved.text_alternative,
      limitations: resolved.limitations,
    });
  }
  if (invocation)
    segments.push({
      segment_key: `command:${invocation.content.invocation.content.command_ref.command_id}`,
      order: segments.length + 1,
      family: "action_report",
      original_statement: null,
      preservation: "passed",
      findings: [],
      force: "unavailable_as_structured_source_data",
      conditions: "unavailable_as_structured_source_data",
      presentation_depth: "material",
      language_validation: "not_performed",
    });
  const contractHash = (name: string) =>
    contracts.entries.find(
      (entry) => entry.name === name && entry.version === "1.0.0",
    )?.canonical_sha256 ??
    fail("A composition validator contract is not installed.");
  const content: Content = {
    ...structuredClone(sources),
    profile: { ...resolution.payload, schema_version: "1.0.0" },
    segments,
    reference_labels: labels,
    composition_binding: {
      plan_contract_hash: contractHash("communication-plan"),
      validator_contract_hash: contractHash("communication-validation-receipt"),
      profile_contract_hash: resolution.composition_contract.content_hash,
      locale: "en",
      renderer: "not_implemented",
    },
    source_time_binding: {
      communication: "not_recorded",
      renderer: "not_recorded",
      terminology: "not_recorded",
      definition: sources.thread ? "exact_thread_turn_binding" : "unavailable",
      prompt: "exact_model_call_prompt_profile",
      validators: "exact_model_call_validation_records",
    },
    validation: {
      schema_name: "petra.communication-validation-receipt",
      schema_version: "1.0.0",
      scope: "structured_preservation_and_reference_fidelity",
      outcome: "blocked",
      language_validation: "incomplete",
      repair_provenance: null,
      checks: [
        {
          check: "canonical_owner_identity_and_record_hashes",
          status: "passed",
          findings: [],
        },
        {
          check: "ordered_original_structured_content_preservation",
          status: segments.some((s) => s.preservation === "blocked")
            ? "blocked"
            : "passed",
          findings: segments.flatMap((s) => s.findings),
        },
        {
          check: "exact_invocation_result_link",
          status: invocation ? "passed" : "not_performed",
          findings: invocation ? [] : ["No exact invocation was supplied."],
        },
        ...profile.validation.future_required_checks.map((check) => ({
          check,
          status: "not_performed" as const,
          findings: [
            "Full response-language validation for this obligation is not implemented; structured preservation checks have narrower scope.",
          ],
        })),
      ],
      limitations: [
        "Original gateway checks retain their original scope. No response-language pass or repair is claimed.",
      ],
    },
    history_coverage: "invocation_work_revisions_first_100_when_linked",
    limitations: [
      "Original response bytes remain addressed by the exact Artifact hash and byte size. This read does not fetch or re-render those bytes.",
      "The original evidence snapshot and current composition position are separate observations; neither reusable cache state nor Work success resolves the inquiry.",
      "Structured force, conditions, inference rule, and author decision are unavailable; original statements, limitations and resolution requirements remain inspectable.",
      "Model-call identity supplies model provenance. The recording service Actor is not the source author or an approving human.",
      "Reference source language is unavailable here; no translation validation is claimed.",
      ...(sources.thread
        ? []
        : [
            "No unique exact product thread and turn linkage was found. Protocol thread identity cannot supply it.",
          ]),
      ...(invocation
        ? []
        : [
            "No linked invocation action report is available. Similar text and ambient actions cannot supply the join.",
          ]),
      "This plan is a read-only composition with no command, Review, domain, or recovery execution authority. Rendering and accessibility conformance remain unimplemented.",
    ],
  };
  const plan: PetraCommunicationPlan = {
    schema_name: "petra.communication-plan",
    schema_version: "1.0.0",
    project_id: projectId,
    content,
    content_hash: communicationHash(content),
    read_at: readAt,
  };
  contracts.assertValid("communication-plan", "1.0.0", plan);
  return plan;
}
