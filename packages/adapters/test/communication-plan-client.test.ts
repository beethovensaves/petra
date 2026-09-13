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
import { communicationHash } from "@petra/core";
describe("communication typed client", () => {
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
