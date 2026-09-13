import { describe, expect, it, vi } from "vitest";
import { ProjectBriefError } from "@petra/core";
import { createPetraApp } from "../src/app.js";

const path = "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief";
const headers = { authorization: "Bearer brief-route-test" };
describe("Project Brief read route", () => {
  it("requires authentication and rejects duplicate, unregistered, and mutation controls before storage", async () => {
    const read = vi.fn(() => Promise.resolve(undefined));
    const app = createPetraApp({
      authToken: "brief-route-test",
      projectBriefViews: { getProjectBriefView: read },
    }).app;
    expect((await app.request(path)).status).toBe(401);
    for (const query of [
      "?actor=human",
      "?apply=true",
      "?baseline_event_id=a&baseline_event_id=b",
      "?profile_payload=arbitrary",
    ])
      expect((await app.request(path + query, { headers })).status).toBe(422);
    expect(read).not.toHaveBeenCalled();
    expect((await app.request(path, { headers })).status).toBe(404);
  });
  it("preserves unsupported, stale, and unavailable failures without fixture fallback", async () => {
    for (const [code, status] of [
      ["PROJECT_BRIEF_UNSUPPORTED", 422],
      ["PROJECT_BRIEF_STALE", 409],
      ["PROJECT_BRIEF_BASELINE_UNAVAILABLE", 422],
      ["PROJECT_BRIEF_CORRUPT", 503],
    ] as const) {
      const app = createPetraApp({
        authToken: "brief-route-test",
        projectBriefViews: {
          getProjectBriefView: () =>
            Promise.reject(new ProjectBriefError(code, "Read unavailable.")),
        },
      }).app;
      expect((await app.request(path, { headers })).status).toBe(status);
    }
    expect(
      (
        await createPetraApp({ authToken: "brief-route-test" }).app.request(
          path,
          { headers },
        )
      ).status,
    ).toBe(503);
  });
});
