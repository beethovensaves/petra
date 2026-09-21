import type { PetraProjectBriefReadView } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  assertProjectBriefIntegrity,
  ProjectBriefError,
  type ProjectBriefRequest,
} from "@petra/core/project-brief-view";
import { canonicalize } from "json-canonicalize";

export interface ProjectBriefClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  /** Canonical schema hash from the caller's installed ProjectDefinition payload registration. */
  readonly registeredProfileSchemaHash: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ProjectBriefClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProjectBriefClientError";
  }
}

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const responseFailure = async (response: Response): Promise<never> => {
  let code = "PROJECT_BRIEF_READ_FAILED";
  let message = `Project Brief read failed (${response.status}).`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null
    ) {
      if ("code" in body.error && typeof body.error.code === "string") {
        code = body.error.code;
      }
      if ("message" in body.error && typeof body.error.message === "string") {
        message = body.error.message;
      }
    }
  } catch {
    // Keep the stable status-based fallback for non-JSON failures.
  }
  throw new ProjectBriefClientError(code, response.status, message);
};

/** Renderer-neutral authenticated read. No retry or mutation is performed. */
export class ProjectBriefClient {
  constructor(readonly options: ProjectBriefClientOptions) {}
  async read(
    projectId: string,
    request: ProjectBriefRequest = {},
  ): Promise<PetraProjectBriefReadView> {
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      Object.keys(request).some(
        (key) =>
          ![
            "expected_snapshot_hash",
            "baseline_event_id",
            "baseline_record_hash",
          ].includes(key),
      )
    )
      throw new TypeError(
        "A Brief read requires an exact Project and registered query controls.",
      );
    const url = new URL(
      `/api/queries/projects/${projectId}/brief`,
      this.options.baseUrl,
    );
    for (const key of [
      "expected_snapshot_hash",
      "baseline_event_id",
      "baseline_record_hash",
    ] as const) {
      const value = request[key];
      if (value !== undefined) url.searchParams.set(key, value);
    }
    const response = await (this.options.fetch ?? fetch)(url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!response.ok) return responseFailure(response);
    const body: unknown = await response.json();
    const contracts = this.options.contracts ?? new PetraContractRegistry();
    const version = (body as { schema_version?: unknown } | null)
      ?.schema_version;
    if (version !== "1.0.0" && version !== "1.1.0")
      throw new ProjectBriefError(
        "PROJECT_BRIEF_UNSUPPORTED",
        "The Brief schema version is unsupported.",
      );
    contracts.assertValid("project-brief-view", version, body);
    const view = body as PetraProjectBriefReadView;
    await assertProjectBriefIntegrity(
      view,
      projectId,
      digest,
      this.options.registeredProfileSchemaHash,
    );
    if (
      request.expected_snapshot_hash !== undefined &&
      request.expected_snapshot_hash !== view.snapshot_hash
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_STALE",
        "The response substituted a different Brief snapshot.",
      );
    if (
      request.baseline_event_id !== undefined
        ? view.content.comparison.state !== "recent_history_interval" ||
          view.content.comparison.baseline.event_id !==
            request.baseline_event_id ||
          view.content.comparison.baseline.record_hash !==
            request.baseline_record_hash
        : view.content.comparison.state !== "current_only"
    )
      throw new ProjectBriefError(
        "PROJECT_BRIEF_CORRUPT",
        "The response substituted a different comparison baseline.",
      );
    return view;
  }
}
