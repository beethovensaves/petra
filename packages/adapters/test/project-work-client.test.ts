import { readFileSync } from "node:fs";

import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
} from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectWorkClient,
  type ProjectWorkClientError,
} from "../src/project-work-client.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const request = readFixture<PetraProjectWorkOperationRequest>(
  "project-work-operation-request",
);
const receipt = readFixture<PetraProjectWorkOperationReceipt>(
  "project-work-operation-receipt",
);
const view = readFixture<PetraProjectWorkOperationsView>(
  "project-work-operations-view",
);

describe("ProjectWorkClient", () => {
  it("authenticates and validates the exact composed Work read", async () => {
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      expect(url).toBe(
        `http://petra.local/api/queries/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}/operations`,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer work-token",
      );
      return Promise.resolve(Response.json(view));
    });
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch,
    });

    await expect(
      client.readOperations(view.project_id, view.work_unit_ref.work_unit_id),
    ).resolves.toStrictEqual(view);
  });

  it("submits only the exact command payload and rejects crossed receipts", async () => {
    let call = 0;
    let captured:
      | { readonly url: string; readonly init: RequestInit | undefined }
      | undefined;
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      captured = { url, init };
      call += 1;
      return Promise.resolve(
        Response.json(
          call === 1
            ? receipt
            : {
                ...receipt,
                command_id: "command_01K6P000000000000000000799",
              },
        ),
      );
    });
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch,
    });

    await expect(
      client.execute(view.project_id, view.work_unit_ref.work_unit_id, request),
    ).resolves.toStrictEqual(receipt);
    if (captured === undefined) throw new Error("Expected a Work request.");
    expect(captured.url).toBe(
      `http://petra.local/api/commands/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}`,
    );
    expect(new Headers(captured.init?.headers).get("authorization")).toBe(
      "Bearer work-token",
    );
    const capturedBody = captured.init?.body;
    if (typeof capturedBody !== "string") {
      throw new Error("Expected a JSON string Work request body.");
    }
    const parsedBody: unknown = JSON.parse(capturedBody);
    expect(parsedBody).toStrictEqual(request);
    await expect(
      client.execute(view.project_id, view.work_unit_ref.work_unit_id, request),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
  });

  it("rejects a route WorkUnit that differs from the exact request", async () => {
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch: vi.fn(),
    });

    await expect(
      client.execute(
        view.project_id,
        "work_unit_01K6P000000000000000000799",
        request,
      ),
    ).rejects.toThrow("exact route WorkUnit");
  });
});
