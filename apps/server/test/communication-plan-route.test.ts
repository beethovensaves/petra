import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { PetraCommunicationPlan } from "@petra/contracts";
import { communicationHash } from "@petra/core";
import { CommunicationPlanClient } from "@petra/adapters";
import { createPetraApp } from "../src/app.js";
const path =
  "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/communication";
const headers = { authorization: "Bearer communication-test" };
const query = new URLSearchParams({
  response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FE8",
  response_revision: "1",
  response_content_hash: `sha256:${"0".repeat(64)}`,
  response_record_hash: `sha256:${"1".repeat(64)}`,
}).toString();
describe("communication read authentication", () => {
  it("authenticates before reading and rejects duplicate or mutation controls", async () => {
    const read = vi.fn(() => Promise.resolve(undefined));
    const app = createPetraApp({
      authToken: "communication-test",
      communicationPlans: { getCommunicationPlan: read },
    }).app;
    expect((await app.request(`${path}?${query}`)).status).toBe(401);
    expect(
      (
        await app.request(`${path}?${query}`, {
          headers: { authorization: "Bearer wrong" },
        })
      ).status,
    ).toBe(401);
    for (const extra of [
      "apply=true",
      "actor_id=anything",
      "response_revision=2",
      "locale=en&locale=fr",
    ])
      expect(
        (await app.request(`${path}?${query}&${extra}`, { headers })).status,
      ).toBe(422);
    expect(read).not.toHaveBeenCalled();
    expect((await app.request(`${path}?${query}`, { headers })).status).toBe(
      404,
    );
    expect(read).toHaveBeenCalledWith(
      "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      expect.objectContaining({ locale: "en", response_revision: 1 }),
    );
  });
  it("keeps missing service and storage failures explicit", async () => {
    expect(
      (
        await createPetraApp({ authToken: "communication-test" }).app.request(
          `${path}?${query}`,
          { headers },
        )
      ).status,
    ).toBe(503);
    const app = createPetraApp({
      authToken: "communication-test",
      communicationPlans: {
        getCommunicationPlan: () =>
          Promise.reject(new Error("Read unavailable")),
      },
    }).app;
    expect((await app.request(`${path}?${query}`, { headers })).status).toBe(
      503,
    );
  });
  it.each(["valid", "family", "order"])(
    "reads an authenticated endpoint through the typed client: %s",
    async (kind) => {
      const plan = JSON.parse(
        readFileSync(
          new URL(
            "../../../packages/contracts/fixtures/accepted/communication-plan.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as PetraCommunicationPlan;
      if (kind === "family") plan.content.segments[0]!.family = "action_report";
      if (kind === "order") plan.content.segments[0]!.order = 2;
      plan.content_hash = communicationHash(plan.content);
      const read = vi.fn(() => Promise.resolve(plan));
      const app = createPetraApp({
        authToken: "communication-test",
        communicationPlans: { getCommunicationPlan: read },
      }).app;
      const client = new CommunicationPlanClient({
        baseUrl: "http://localhost",
        token: "communication-test",
        fetch: async (url, init) => {
          const response = await app.request(
            url instanceof Request ? url : String(url),
            init,
          );
          expect(response.status).toBe(200);
          expect(response.headers.get("Cache-Control")).toBe("no-store");
          return response;
        },
      });
      const request = {
        response_id: plan.content.source_response.grounded_response_id,
        response_revision: plan.content.source_response.revision,
        response_content_hash: plan.content.source_response.content_hash,
        response_record_hash: communicationHash(plan.content.source_response),
        locale: "en",
        expected_definition_hash:
          plan.content.composition_definition.content_hash,
      };
      const result = client.read(plan.project_id, request);
      if (kind === "valid") expect(await result).toEqual(plan);
      else await expect(result).rejects.toThrow("segment metadata");
      expect(read).toHaveBeenCalledExactlyOnceWith(plan.project_id, request);
    },
  );
});
