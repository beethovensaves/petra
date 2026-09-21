import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProjectWorkReadView,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
  PetraWorkerOutputManifest,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
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
const collection = readFixture<PetraProjectWorkReadView>(
  "project-work-view-collection",
);
const detail = readFixture<PetraProjectWorkReadView>(
  "project-work-view-detail",
);
const resumableView = readFixture<PetraProjectWorkOperationsView>(
  "project-work-operations-view-resumable",
);
const resumeRequest = readFixture<PetraProjectWorkResumeRequest>(
  "project-work-resume-request",
);
const resumeReceipt = readFixture<PetraProjectWorkResumeReceipt>(
  "project-work-resume-receipt",
);
const startAgainRequest = readFixture<PetraProjectWorkStartAgainRequest>(
  "project-work-start-again-request",
);
const startAgainReceipt = readFixture<PetraProjectWorkStartAgainReceipt>(
  "project-work-start-again-receipt",
);
const output = readFixture<PetraWorkerOutputManifest>("worker-output-manifest");
const outputRecordHash = `sha256:${createHash("sha256")
  .update(canonicalize(output))
  .digest("hex")}`;

describe("ProjectWorkClient", () => {
  it("authenticates and validates exact Work collection and detail reads", async () => {
    const requests: string[] = [];
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      requests.push(url);
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer work-token",
      );
      return Promise.resolve(
        Response.json(requests.length === 1 ? collection : detail),
      );
    });
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch,
    });
    const workUnitId =
      detail.content.view_kind === "detail"
        ? detail.content.summary.work_unit_ref.work_unit_id
        : "";

    await expect(client.list(collection.project_id)).resolves.toStrictEqual(
      collection,
    );
    await expect(
      client.read(detail.project_id, workUnitId),
    ).resolves.toStrictEqual(detail);
    expect(requests).toEqual([
      `http://petra.local/api/queries/projects/${collection.project_id}/work`,
      `http://petra.local/api/queries/projects/${detail.project_id}/work/${workUnitId}`,
    ]);
  });

  it("rejects crossed Work collection and detail identities", async () => {
    let call = 0;
    const fetch = vi.fn(() => {
      call += 1;
      return Promise.resolve(
        Response.json(
          call === 1
            ? {
                ...collection,
                content: {
                  ...collection.content,
                  query: { limit: 25 },
                },
              }
            : {
                ...detail,
                project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
              },
        ),
      );
    });
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch,
    });
    const workUnitId =
      detail.content.view_kind === "detail"
        ? detail.content.summary.work_unit_ref.work_unit_id
        : "";

    await expect(client.list(collection.project_id)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
    await expect(client.read(detail.project_id, workUnitId)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
  });

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

  it("returns only a server-bound checkpoint resume identity and rejects a crossed binding", async () => {
    let call = 0;
    const fetch = vi.fn(() => {
      call += 1;
      return Promise.resolve(
        Response.json(
          call === 1
            ? resumableView
            : {
                ...resumableView,
                resume_binding: {
                  ...resumableView.resume_binding,
                  expected_work_unit_ref: {
                    ...resumableView.resume_binding?.expected_work_unit_ref,
                    revision: resumableView.work_unit_ref.revision + 1,
                  },
                },
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
      client.readOperations(
        resumableView.project_id,
        resumableView.work_unit_ref.work_unit_id,
      ),
    ).resolves.toStrictEqual(resumableView);
    await expect(
      client.readOperations(
        resumableView.project_id,
        resumableView.work_unit_ref.work_unit_id,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
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

  it("submits a checkpoint resume only to the exact retained Work identity", async () => {
    let capturedUrl: string | undefined;
    let call = 0;
    const fetch = vi.fn((input: URL | RequestInfo) => {
      capturedUrl =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      call += 1;
      return Promise.resolve(
        Response.json(
          call === 1
            ? resumeReceipt
            : {
                ...resumeReceipt,
                resulting_work_unit_ref: {
                  ...resumeReceipt.resulting_work_unit_ref,
                  work_unit_id: "work_unit_01K6P000000000000000000799",
                },
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
      client.resume(
        resumeReceipt.project_id,
        resumeRequest.expected_work_unit_ref.work_unit_id,
        resumeRequest,
      ),
    ).resolves.toStrictEqual(resumeReceipt);
    expect(capturedUrl).toBe(
      `http://petra.local/api/commands/projects/${resumeReceipt.project_id}/work/${resumeRequest.expected_work_unit_ref.work_unit_id}/resume`,
    );
    await expect(
      client.resume(
        resumeReceipt.project_id,
        resumeRequest.expected_work_unit_ref.work_unit_id,
        resumeRequest,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
  });

  it("starts again only through the exact registered fresh-input transition", async () => {
    let capturedUrl: string | undefined;
    let call = 0;
    const fetch = vi.fn((input: URL | RequestInfo) => {
      capturedUrl =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      call += 1;
      return Promise.resolve(
        Response.json(
          call === 1
            ? startAgainReceipt
            : {
                ...startAgainReceipt,
                new_attempt: {
                  ...startAgainReceipt.new_attempt,
                  lineage_attempt:
                    startAgainReceipt.prior_attempt.lineage_attempt + 2,
                },
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
      client.startAgain(
        startAgainReceipt.project_id,
        startAgainRequest.expected_prior_work_unit_ref.work_unit_id,
        startAgainRequest,
      ),
    ).resolves.toStrictEqual(startAgainReceipt);
    expect(capturedUrl).toBe(
      `http://petra.local/api/commands/projects/${startAgainReceipt.project_id}/work/${startAgainRequest.expected_prior_work_unit_ref.work_unit_id}/start-again`,
    );
    await expect(
      client.startAgain(
        startAgainReceipt.project_id,
        startAgainRequest.expected_prior_work_unit_ref.work_unit_id,
        startAgainRequest,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
  });

  it("reads diagnostics from the exact manifest identity without treating it as a WorkUnit", async () => {
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      expect(url).toBe(
        `http://petra.local/api/queries/projects/${output.project_id}/worker-output-manifests/${output.worker_output_manifest_id}?${new URLSearchParams(
          {
            revision: String(output.revision),
            content_hash: output.content_hash,
            record_hash: outputRecordHash,
          },
        )}`,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer work-token",
      );
      return Promise.resolve(Response.json(output));
    });
    const client = new ProjectWorkClient({
      baseUrl: "http://petra.local",
      token: "work-token",
      fetch,
    });

    await expect(
      client.readWorkerOutputManifest(
        output.project_id,
        output.worker_output_manifest_id,
        {
          producing_work_unit_id: output.work_unit_id,
          revision: output.revision,
          content_hash: output.content_hash,
          record_hash: outputRecordHash,
        },
      ),
    ).resolves.toStrictEqual(output);
    expect(output.content.diagnostics).toBeDefined();

    await expect(
      client.readWorkerOutputManifest(
        output.project_id,
        output.worker_output_manifest_id,
        {
          producing_work_unit_id: "work_unit_01K6P000000000000000000799",
          revision: output.revision,
          content_hash: output.content_hash,
          record_hash: outputRecordHash,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectWorkClientError>>({
        code: "PROJECT_WORK_RESPONSE_INVALID",
      }),
    );
  });
});
