import { readFileSync } from "node:fs";

import type { PetraProjectShellView } from "@petra/contracts";
import type { ProjectShellViewReader } from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-shell-route-token";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const reader: ProjectShellViewReader = {
  listProjectShellViews: () => Promise.resolve([structuredClone(fixture)]),
  getProjectShellView: (projectId) =>
    Promise.resolve(
      projectId === fixture.project_id ? structuredClone(fixture) : undefined,
    ),
};

const authorized = (path: string): Request =>
  new Request(`http://petra.local${path}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

describe("authorized Project shell query routes", () => {
  it("returns the contract view for collections and exact Project identity", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const collection = await petra.app.request(
      authorized("/api/queries/projects"),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({ projects: [fixture] });

    const detail = await petra.app.request(
      authorized(`/api/queries/projects/${fixture.project_id}/shell`),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(fixture);
  });

  it("does not substitute another Project and preserves the API auth boundary", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const missing = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/shell",
      ),
    );
    expect(missing.status).toBe(404);
    const missingBody = JSON.parse(await missing.text()) as unknown;
    expect(isRecord(missingBody)).toBe(true);
    if (!isRecord(missingBody) || !isRecord(missingBody.error)) {
      throw new Error("Expected Petra's structured missing-Project error.");
    }
    expect(missingBody.error.code).toBe("PROJECT_NOT_FOUND");

    const unauthorized = await petra.app.request("/api/queries/projects");
    expect(unauthorized.status).toBe(401);
  });

  it("fails visibly when the read boundary is absent or unavailable", async () => {
    const absent = createPetraApp({ authToken: TOKEN });
    const absentResponse = await absent.app.request(
      authorized("/api/queries/projects"),
    );
    expect(absentResponse.status).toBe(503);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectShellViews: {
        listProjectShellViews: () =>
          Promise.reject(new Error("repeatable-read snapshot unavailable")),
        getProjectShellView: () => Promise.resolve(undefined),
      },
    });
    const unavailableResponse = await unavailable.app.request(
      authorized("/api/queries/projects"),
    );
    expect(unavailableResponse.status).toBe(503);
    const unavailableBody = JSON.parse(
      await unavailableResponse.text(),
    ) as unknown;
    if (!isRecord(unavailableBody) || !isRecord(unavailableBody.error)) {
      throw new Error("Expected Petra's structured shell-read error.");
    }
    expect(unavailableBody.error.code).toBe("PROJECT_SHELL_READ_FAILED");
    expect(unavailableBody.error.message).toBe(
      "repeatable-read snapshot unavailable",
    );
  });
});
