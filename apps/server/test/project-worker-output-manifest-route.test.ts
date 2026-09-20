import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type { PetraWorkerOutputManifest } from "@petra/contracts";
import type { ProjectWorkerOutputManifestReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "worker-output-route-token";
const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/worker-output-manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraWorkerOutputManifest;
const recordHash = `sha256:${createHash("sha256")
  .update(canonicalize(manifest))
  .digest("hex")}`;
const path = `/api/queries/projects/${manifest.project_id}/worker-output-manifests/${manifest.worker_output_manifest_id}?${new URLSearchParams(
  {
    revision: String(manifest.revision),
    content_hash: manifest.content_hash,
    record_hash: recordHash,
  },
)}`;
const authorized = (requestPath: string) =>
  new Request(`http://petra.local${requestPath}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });

describe("exact Project WorkerOutputManifest route", () => {
  it("returns the registered immutable manifest with outcome, outputs, diagnostics, and measured resources", async () => {
    const read = vi.fn<
      ProjectWorkerOutputManifestReader["getProjectWorkerOutputManifest"]
    >(() => Promise.resolve(structuredClone(manifest)));
    const app = createPetraApp({
      authToken: TOKEN,
      projectWorkerOutputManifests: {
        getProjectWorkerOutputManifest: read,
      },
    });

    const response = await app.app.request(authorized(path));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual(manifest);
    expect(read).toHaveBeenCalledWith(
      manifest.project_id,
      manifest.worker_output_manifest_id,
      {
        revision: manifest.revision,
        content_hash: manifest.content_hash,
        record_hash: recordHash,
      },
    );
    expect(manifest.content.outcome).toBeDefined();
    expect(Array.isArray(manifest.content.diagnostics)).toBe(true);
    expect(manifest.content.resource_usage).toBeDefined();
  });

  it("fails closed for incomplete identity, cross-Project absence, and crossed reader output", async () => {
    const malformedApp = createPetraApp({
      authToken: TOKEN,
      projectWorkerOutputManifests: {
        getProjectWorkerOutputManifest: vi.fn(),
      },
    });
    expect(
      (
        await malformedApp.app.request(
          authorized(
            `/api/queries/projects/${manifest.project_id}/worker-output-manifests/${manifest.worker_output_manifest_id}?revision=1`,
          ),
        )
      ).status,
    ).toBe(422);

    const missingApp = createPetraApp({
      authToken: TOKEN,
      projectWorkerOutputManifests: {
        getProjectWorkerOutputManifest: () => Promise.resolve(undefined),
      },
    });
    expect((await missingApp.app.request(authorized(path))).status).toBe(404);

    const crossed = structuredClone(manifest);
    crossed.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    const crossedApp = createPetraApp({
      authToken: TOKEN,
      projectWorkerOutputManifests: {
        getProjectWorkerOutputManifest: () => Promise.resolve(crossed),
      },
    });
    expect((await crossedApp.app.request(authorized(path))).status).toBe(503);
  });
});
