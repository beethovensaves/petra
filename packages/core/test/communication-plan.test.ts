import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { PetraActor, PetraModelSynthesistOutput } from "@petra/contracts";
import {
  composeCommunicationPlan,
  communicationHash as hash,
  type CommunicationPlanSources,
} from "../src/communication-plan.js";
import { ProfileCommunicationResolver } from "../src/profile-communication.js";
const contracts = new PetraContractRegistry();
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
  record: T,
): T => {
  record.content_hash = hash(record.content);
  return record;
};
function sources(): CommunicationPlanSources {
  const definition = fixture<
    CommunicationPlanSources["composition_definition"]
  >("project-definition-scientific");
  definition.content.registrations = [
    definition.content.registrations[0],
    ...new ProfileCommunicationResolver(contracts).requiredRegistrations(),
  ];
  seal(definition);
  const response =
    fixture<CommunicationPlanSources["source_response"]>("grounded-response");
  const context = seal(
    fixture<CommunicationPlanSources["context_packet"]>("context-packet"),
  );
  const evidence =
    fixture<CommunicationPlanSources["evidence_packet"]>("evidence-packet");
  evidence.content.context_packet_ref.content_hash = context.content_hash;
  seal(evidence);
  const call = fixture<CommunicationPlanSources["model_call"]>(
    "model-call-synthesist",
  );
  call.content.output = fixture<PetraModelSynthesistOutput>(
    "model-synthesist-output",
  );
  call.content.input.context_packet_ref.content_hash = context.content_hash;
  call.content.input.evidence_packet_ref.content_hash = evidence.content_hash;
  seal(call);
  const artifact = fixture<CommunicationPlanSources["artifact"]>("artifact");
  Object.assign(artifact, response.content.response_artifact_ref);
  const delivery =
    fixture<CommunicationPlanSources["delivery"]>("interaction-run");
  delivery.content.authority_context.actor.actor_id =
    "actor_01ARZ3NDEKTSV4RRFFQ69G5FAA";
  seal(delivery);
  response.content.interaction_ref.interaction_run_ref = {
    interaction_run_id: delivery.interaction_run_id,
    revision: delivery.revision,
    content_hash: delivery.content_hash,
  };
  response.content.context_packet_ref.content_hash = context.content_hash;
  response.content.evidence_packet_ref.content_hash = evidence.content_hash;
  response.content.model_output_hash = hash(call.content.output);
  response.content.execution_ref.model_call_id = call.model_call_id;
  response.content.execution_ref.model_request_id =
    call.content.model_request_id;
  response.content.execution_ref.model_deployment_id =
    call.content.deployment.model_deployment_id;
  seal(response);
  const refs = [
    response.recorded_by,
    artifact.created_by,
    context.compiled_by,
    evidence.compiled_by,
    delivery.content.authority_context.actor,
  ];
  const actors = [
    ...new Map(
      refs.map((ref) => [
        ref.actor_id,
        { ...fixture<PetraActor>("actor"), ...ref },
      ]),
    ).values(),
  ];
  return {
    composition_definition: definition,
    source_response: response,
    current_response: structuredClone(response),
    context_packet: context,
    evidence_packet: evidence,
    model_call: call,
    artifact,
    delivery,
    current_invocation_delivery: null,
    actors,
    source_records: [],
    thread: null,
    project_turn_id: null,
    invocation: null,
    authority: {
      isolation: "repeatable_read",
      event_position: 5,
      stream_revision: 2,
      effect: "none",
      projection: "not_observed",
    },
  };
}
const compose = (s = sources(), locale = "en") =>
  composeCommunicationPlan(s, locale, "2026-09-13T12:00:00.000Z", contracts);
describe("bounded scientific communication", () => {
  it("preserves valid segments alongside blocked references with a scoped blocked language receipt", () => {
    const s = sources();
    const before = structuredClone(s);
    const plan = compose(s);
    expect(
      plan.content.segments.map((segment) => segment.preservation),
    ).toEqual(["blocked", "blocked", "passed"]);
    expect(
      plan.content.segments.map((segment) => segment.original_statement),
    ).toEqual(s.model_call.content.output!.statements);
    expect(plan.content.validation.outcome).toBe("blocked");
    expect(plan.content.validation.repair_provenance).toBeNull();
    expect(
      plan.content.validation.checks.filter(
        (check) => check.status === "not_performed",
      ).length,
    ).toBeGreaterThan(7);
    expect(plan.content.invocation).toBeNull();
    expect(plan.content.source_time_binding.definition).toBe("unavailable");
    expect(s).toEqual(before);
    expect(compose(s)).toEqual(plan);
  });
  it("preserves failed Work and stopped delivery independently from result availability", () => {
    const s = sources();
    const view = fixture<NonNullable<CommunicationPlanSources["invocation"]>>(
      "suggested-action-invocation-view",
    );
    const ref = s.current_response;
    view.content.result = {
      state: "available",
      result_ref: {
        schema_name: "petra.grounded-response",
        schema_version: "1.0.0",
        record_id: ref.grounded_response_id,
        revision: ref.revision,
        content_hash: ref.content_hash,
        record_hash: hash(ref),
      },
      authority_effect: "none",
    };
    view.content.operation_state = "failed";
    view.content.work = {
      state: "available",
      work_unit_ref: {
        ...s.source_response.content.interaction_ref.work_unit_ref,
        record_hash: `sha256:${"0".repeat(64)}`,
      },
      input_manifest_ref: {
        record_id: "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC3",
        revision: 1,
        content_hash: `sha256:${"0".repeat(64)}`,
        record_hash: `sha256:${"0".repeat(64)}`,
      },
      execution_state: "completed",
      terminal_outcome: "worker_failed",
    };
    view.content.invocation.content.command_ref.actor =
      s.delivery.content.authority_context.actor;
    seal(view.content.invocation);
    view.content.invocation_ref.content_hash =
      view.content.invocation.content_hash;
    view.content.invocation_ref.record_hash = hash(view.content.invocation);
    view.content.recovery.actions[0].eligibility = "ineligible";
    view.content.recovery.actions[0].reason = "Work is already registered.";
    const stopped = structuredClone(s.delivery);
    stopped.content.lifecycle = {
      state: "cancelled",
      started_at: "2026-09-13T12:00:00.000Z",
      ended_at: "2026-09-13T12:00:01.000Z",
      outcome_code: "DELIVERY_STOPPED",
    };
    seal(stopped);
    const dc = contracts.validator("interaction-run", "1.0.0");
    expect(dc(stopped), JSON.stringify(dc.errors)).toBe(true);
    view.content.interaction = {
      ...view.content.interaction,
      durable_state: "available",
      interaction_run_ref: {
        record_id: stopped.interaction_run_id,
        revision: stopped.revision,
        content_hash: stopped.content_hash,
        record_hash: hash(stopped),
      },
    };
    seal(view);
    const check = contracts.validator(
      "suggested-action-invocation-view",
      "1.0.0",
    );
    expect(check(view), JSON.stringify(check.errors)).toBe(true);
    s.invocation = view;
    s.current_invocation_delivery = stopped;
    const plan = compose(s);
    expect(plan.content.invocation?.content.operation_state).toBe("failed");
    expect(plan.content.invocation?.content.result.state).toBe("available");
    expect(
      plan.content.current_invocation_delivery?.content.lifecycle.state,
    ).toBe("cancelled");
    expect(
      plan.content.invocation?.content.recovery.actions[0].eligibility,
    ).toBe("ineligible");
    expect(plan.content.validation.outcome).toBe("blocked");
    expect(plan.content.segments.at(-1)?.family).toBe("action_report");
    view.content.result = {
      state: "unavailable",
      reason: "No result exists for this invocation.",
    };
    seal(view);
    expect(() => compose(s)).toThrow("invocation");
  });
  it.each(["fr", "en-US", ""])("rejects unsupported locale %s", (locale) => {
    expect(() => compose(sources(), locale)).toThrow();
  });
  it.each([
    "definition",
    "response",
    "call",
    "artifact",
    "actor",
    "snapshot",
    "delivery",
    "thread",
  ])("fails closed on %s identity mismatch", (kind) => {
    const s = sources();
    if (kind === "definition")
      s.composition_definition.content.registrations.splice(1);
    if (kind === "response")
      s.current_response.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    if (kind === "call")
      s.model_call.content.model_request_id =
        "model_request_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    if (kind === "artifact") s.artifact.byte_size++;
    if (kind === "actor") s.actors = [];
    if (kind === "snapshot") s.context_packet.snapshot_ref.event_position++;
    if (kind === "delivery")
      s.delivery.content_hash = `sha256:${"0".repeat(64)}`;
    if (kind === "thread")
      s.project_turn_id = "project_turn_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    expect(() => compose(s)).toThrow();
  });
  it("retains historical source bytes and definitions without backfilling new version bindings", () => {
    const s = sources();
    s.current_response.revision++;
    s.current_response.content.cache = {
      state: "invalidated",
      cache_key: s.source_response.content.cache.cache_key,
      checked_at: "2026-09-13T12:00:00.000Z",
      invalidated_by: [
        {
          event_id: "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
          event_type: "change_set.applied",
          change_set_id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        },
      ],
      affected_dependency_ids: [
        s.source_response.content.dependencies[0].object_ref.object_id,
      ],
    };
    seal(s.current_response);
    const plan = compose(s);
    expect(plan.content.current_response.content.cache.state).toBe(
      "invalidated",
    );
    expect(plan.content.source_response.content.cache.state).toBe("reusable");
    expect(plan.content.current_response.revision).toBe(2);
    expect(plan.content.source_response.revision).toBe(1);
    expect(plan.content.artifact.content_hash).toBe(
      s.source_response.content.response_artifact_ref.content_hash,
    );
    expect(plan.content.source_time_binding.terminology).toBe("not_recorded");
    expect(plan.content.composition_binding.profile_contract_hash).toMatch(
      /^sha256:/,
    );
  });
  it("never upgrades missing validator, registration, or incomplete gateway evidence into a language pass", () => {
    const s = sources();
    const mock = vi.spyOn(contracts, "validator").mockImplementation(() => {
      throw new Error("Validator unavailable");
    });
    expect(() => compose(s)).toThrow();
    mock.mockRestore();
    s.model_call.content.validation = [s.model_call.content.validation[0]];
    seal(s.model_call);
    expect(compose(s).content.validation.outcome).toBe("blocked");
    const p = compose(s);
    const altered = structuredClone(p);
    (altered.content.validation as { outcome: string }).outcome = "passed";
    expect(() =>
      contracts.assertValid("communication-plan", "1.0.0", altered),
    ).toThrow();
  });
});
