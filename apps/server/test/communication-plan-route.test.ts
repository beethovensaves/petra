import { describe, expect, it, vi } from "vitest";
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
  it("keeps missing service, corrupt response and storage failures explicit", async () => {
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
});
