import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PetraCommunicationPlan } from "@petra/contracts";
import { CommunicationPlanClient } from "../src/communication-plan-client.js";
const fixture = (): PetraCommunicationPlan =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/communication-plan.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraCommunicationPlan;
const request = (plan: PetraCommunicationPlan) => ({
  response_id: plan.content.source_response.grounded_response_id,
  response_revision: plan.content.source_response.revision,
  response_content_hash: plan.content.source_response.content_hash,
  response_record_hash: "sha256:placeholder",
  locale: "en",
});
import { communicationHash, composeCommunicationPlan } from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
const contracts = new PetraContractRegistry();
const composed = (linked: boolean, complete = false) => {
  const sources = fixture().content;
  if (complete) {
    const output = sources.model_call.content.output!;
    output.statements = [output.statements[2]!];
    sources.model_call.content_hash = communicationHash(
      sources.model_call.content,
    );
    sources.source_response.content.model_output_hash =
      communicationHash(output);
    sources.source_response.content_hash = communicationHash(
      sources.source_response.content,
    );
    sources.current_response = structuredClone(sources.source_response);
  }
  if (linked) {
    const invocation = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/accepted/suggested-action-invocation-view.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as NonNullable<typeof sources.invocation>;
    invocation.content.invocation.content.command_ref.actor =
      sources.delivery.content.authority_context.actor;
    invocation.content.invocation.content_hash = communicationHash(
      invocation.content.invocation.content,
    );
    invocation.content.invocation_ref.content_hash =
      invocation.content.invocation.content_hash;
    invocation.content.invocation_ref.record_hash = communicationHash(
      invocation.content.invocation,
    );
    invocation.content.history.command_receipt_ref = structuredClone(
      invocation.content.invocation_ref,
    );
    const current = sources.current_response;
    invocation.content.result = {
      state: "available",
      result_ref: {
        schema_name: "petra.grounded-response",
        schema_version: "1.0.0",
        record_id: current.grounded_response_id,
        revision: current.revision,
        content_hash: current.content_hash,
        record_hash: communicationHash(current),
      },
      authority_effect: "none",
    };
    invocation.content_hash = communicationHash(invocation.content);
    sources.invocation = invocation;
  }
  return composeCommunicationPlan(
    sources,
    "en",
    "2026-09-13T12:00:00.000Z",
    contracts,
  );
};
const readPlan = (plan: PetraCommunicationPlan) =>
  new CommunicationPlanClient({
    baseUrl: "http://localhost",
    token: "test-token",
    contracts,
    fetch: () => Promise.resolve(Response.json(plan)),
  }).read(plan.project_id, {
    ...request(plan),
    response_record_hash: communicationHash(plan.content.source_response),
    ...(plan.content.invocation
      ? {
          command_id:
            plan.content.invocation.content.invocation.content.command_ref
              .command_id,
        }
      : {}),
  });
describe("communication typed client", () => {
  it.each([false, true])(
    "retains complete and partial preservation with linked invocation %s",
    async (linked) => {
      for (const complete of [false, true]) {
        const plan = composed(linked, complete);
        const before = structuredClone(plan);
        expect(
          plan.content.segments.some(
            (segment) => segment.preservation === "blocked",
          ),
        ).toBe(!complete);
        expect(await readPlan(plan)).toEqual(before);
        expect(plan).toEqual(before);
        expect(plan.content.validation.outcome).toBe("blocked");
        expect(plan.content.validation.language_validation).toBe("incomplete");
        expect(plan.content.validation.repair_provenance).toBeNull();
      }
    },
  );
  it.each([
    "source_family",
    "synthesis_family",
    "inference_family",
    "duplicate_order",
    "gapped_order",
    "segment_key",
    "fabricated_action",
    "missing_action",
    "duplicate_action",
    "action_key",
    "action_family",
    "action_position",
  ])("rejects resealed contradictory segment metadata: %s", async (kind) => {
    const linked = [
      "missing_action",
      "duplicate_action",
      "action_key",
      "action_family",
      "action_position",
    ].includes(kind);
    const plan = composed(linked);
    const segments = plan.content.segments;
    if (kind === "source_family") segments[0]!.family = "action_report";
    if (kind === "synthesis_family") segments[1]!.family = "attributed_report";
    if (kind === "inference_family") segments[2]!.family = "petra_assessment";
    if (kind === "duplicate_order") segments[0]!.order = segments[1]!.order;
    if (kind === "gapped_order") segments[2]!.order = 4;
    if (kind === "segment_key")
      segments[0]!.segment_key = segments[1]!.segment_key;
    if (kind === "fabricated_action")
      segments.push({
        ...structuredClone(segments[0]!),
        original_statement: null,
        family: "action_report",
        segment_key: "command:command_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        order: 4,
      });
    if (kind === "missing_action") segments.pop();
    if (kind === "duplicate_action")
      segments.push({ ...structuredClone(segments.at(-1)!), order: 5 });
    if (kind === "action_key")
      segments.at(-1)!.segment_key =
        "command:command_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    if (kind === "action_family") segments.at(-1)!.family = "attributed_report";
    if (kind === "action_position") {
      segments.unshift(segments.pop()!);
      segments.forEach((segment, index) => {
        segment.order = index + 1;
      });
    }
    plan.content_hash = communicationHash(plan.content);
    // These are schema-valid contradictions, even with a recomputed envelope hash.
    contracts.assertValid("communication-plan", "1.0.0", plan);
    const before = structuredClone(plan);
    await expect(readPlan(plan)).rejects.toThrow("segment metadata");
    expect(plan).toEqual(before);
  });
  it("reads one authenticated exact plan without changing its scoped receipt", async () => {
    const plan = fixture();
    let reads = 0;
    const client = new CommunicationPlanClient({
      baseUrl: "http://localhost",
      token: "test-token",
      fetch: (url, init) => {
        reads++;
        expect(
          new URL(url instanceof Request ? url.url : url).searchParams.get(
            "response_id",
          ),
        ).toBe(plan.content.source_response.grounded_response_id);
        expect(init?.headers).toEqual({ authorization: "Bearer test-token" });
        return Promise.resolve(Response.json(plan));
      },
    });
    expect(
      await client.read(plan.project_id, {
        ...request(plan),
        response_record_hash: communicationHash(plan.content.source_response),
      }),
    ).toEqual(plan);
    expect(reads).toBe(1);
  });
  it.each(["project", "response", "invocation", "receipt", "definition"])(
    "rejects %s substitution",
    async (kind) => {
      const plan = fixture();
      const query = {
        ...request(plan),
        response_record_hash: communicationHash(plan.content.source_response),
      };
      if (kind === "project")
        plan.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
      if (kind === "response") plan.content.source_response.revision++;
      if (kind === "invocation")
        Object.assign(query, {
          command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        });
      if (kind === "receipt")
        (plan.content.validation as { outcome: string }).outcome = "repaired";
      if (kind === "definition")
        Object.assign(query, {
          expected_definition_hash: `sha256:${"0".repeat(64)}`,
        });
      const client = new CommunicationPlanClient({
        baseUrl: "http://localhost",
        token: "test-token",
        fetch: () => Promise.resolve(Response.json(plan)),
      });
      await expect(client.read(fixture().project_id, query)).rejects.toThrow();
    },
  );
  it.each(["model_output", "segment_text", "current_project", "packet"])(
    "rejects resealed %s substitution",
    (kind) => {
      const plan = fixture();
      const query = {
        ...request(plan),
        response_record_hash: communicationHash(plan.content.source_response),
      };
      if (kind === "model_output") {
        plan.content.model_call.content.output!.statements[0].text =
          "Substituted source text.";
        plan.content.model_call.content_hash = communicationHash(
          plan.content.model_call.content,
        );
      }
      if (kind === "segment_text")
        plan.content.segments[0]!.original_statement!.text =
          "Substituted source text.";
      if (kind === "current_project")
        plan.content.current_response.project_id =
          "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
      if (kind === "packet") {
        plan.content.context_packet.content.included_objects[0].object_ref.object_hash = `sha256:${"0".repeat(64)}`;
        plan.content.context_packet.content_hash = communicationHash(
          plan.content.context_packet.content,
        );
      }
      plan.content_hash = communicationHash(plan.content);
      const client = new CommunicationPlanClient({
        baseUrl: "http://localhost",
        token: "test-token",
        fetch: () => Promise.resolve(Response.json(plan)),
      });
      return expect(client.read(fixture().project_id, query)).rejects.toThrow();
    },
  );
  it("propagates authentication and unavailable service failures without retry", async () => {
    for (const status of [401, 404, 422, 503]) {
      const client = new CommunicationPlanClient({
        baseUrl: "http://localhost",
        token: "test-token",
        fetch: () => Promise.resolve(new Response(null, { status })),
      });
      await expect(
        client.read(fixture().project_id, request(fixture())),
      ).rejects.toThrow(String(status));
    }
  });
});
