import { readFileSync } from "node:fs";
import type { PetraProjectDefinition } from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";
import { createPetraApp } from "../src/app.js";
const fixture = (): PetraProjectDefinition =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../../packages/contracts/fixtures/accepted/project-definition-controlled-writing.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
describe("exact ProjectDefinition reads", () => {
  it("reads the exact retained revision through authenticated authority without consulting a template", async () => {
    const d = fixture(),
      read = vi.fn(() => Promise.resolve(d));
    const { app } = createPetraApp({
      authToken: "definition-test",
      projectDefinitions: { getProjectDefinition: read },
    });
    const path = `/api/queries/projects/${d.project_id}/definition?definition_revision=1`;
    expect((await app.request(path)).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
    const response = await app.request(path, {
      headers: { authorization: "Bearer definition-test" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(d);
    expect(read).toHaveBeenCalledWith(d.project_id, 1);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects identity and parameter substitution and does not replace an unavailable retained revision", async () => {
    const d = fixture(),
      read = vi.fn(() => Promise.resolve(undefined));
    const { app } = createPetraApp({
      authToken: "definition-test",
      projectDefinitions: { getProjectDefinition: read },
    });
    const path = `/api/queries/projects/${d.project_id}/definition`;
    const headers = { authorization: "Bearer definition-test" };
    for (const query of [
      "",
      "?definition_revision=01",
      "?definition_revision=0",
      "?definition_revision=1&definition_revision=2",
      "?definition_revision=1&template=current",
      "?definition_revision=9007199254740992",
    ])
      expect((await app.request(path + query, { headers })).status).toBe(422);
    expect(read).not.toHaveBeenCalled();
    const unavailable = await app.request(path + "?definition_revision=2", {
      headers,
    });
    expect(unavailable.status).toBe(404);
    expect(
      ((await unavailable.json()) as { error: { code: string } }).error.code,
    ).toBe("PROJECT_DEFINITION_REVISION_UNAVAILABLE");
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(d.project_id, 2);
  });
  it("denies valid records from a foreign Project newer revision or corrupted immutable bytes", async () => {
    const d = fixture(),
      headers = { authorization: "Bearer definition-test" };
    for (const change of [
      { project_id: "project_01K6P000000000000000000999" },
      { revision: 2 },
      { content_hash: `sha256:${"0".repeat(64)}` },
    ]) {
      const { app } = createPetraApp({
        authToken: "definition-test",
        projectDefinitions: {
          getProjectDefinition: () => Promise.resolve({ ...d, ...change }),
        },
      });
      const response = await app.request(
        `/api/queries/projects/${d.project_id}/definition?definition_revision=1`,
        { headers },
      );
      expect(response.status).toBe(503);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("PROJECT_DEFINITION_READ_CORRUPT");
    }
  });
});
