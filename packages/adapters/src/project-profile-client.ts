import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export class ProjectProfileClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProjectProfileClientError";
    this.status = status;
    this.code = code;
  }
}

export interface ProjectProfileClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROFILE_ID = /^project_template_[0-9A-HJKMNP-TV-Z]{26}$/u;

const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const deriveIdentity = async (
  kind: string,
  immutableIdentity: string,
): Promise<string> => {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${kind}:${immutableIdentity}`),
    ),
  ).slice(0, 16);
  let value = BigInt(
    `0x${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
  );
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = alphabet[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};

export class ProjectProfileClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectProfileClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async listProfiles(): Promise<PetraRegisteredProjectProfile[]> {
    const response = await this.#request("/api/queries/project-profiles", {
      method: "GET",
    });
    const body = (await response.json()) as { profiles?: unknown };
    if (!Array.isArray(body.profiles)) {
      throw new ProjectProfileClientError(
        503,
        "PROJECT_PROFILE_RESPONSE_INVALID",
        "The profile collection response is invalid.",
      );
    }
    for (const profile of body.profiles) {
      this.#contracts.assertValid(
        "registered-project-profile",
        "1.0.0",
        profile,
      );
    }
    return structuredClone(body.profiles as PetraRegisteredProjectProfile[]);
  }

  async getProfile(
    profileId: string,
    profileVersion?: string,
  ): Promise<PetraRegisteredProjectProfile> {
    if (!PROFILE_ID.test(profileId)) {
      throw new TypeError("A profile read requires a canonical profile ID.");
    }
    const url = new URL(
      `/api/queries/project-profiles/${profileId}`,
      this.options.baseUrl,
    );
    if (profileVersion !== undefined) {
      url.searchParams.set("version", profileVersion);
    }
    const response = await this.#request(url, { method: "GET" });
    const body: unknown = await response.json();
    this.#contracts.assertValid("registered-project-profile", "1.0.0", body);
    return structuredClone(body as PetraRegisteredProjectProfile);
  }

  async readProjectTaxonomy(
    projectId: string,
    definitionRevision?: number,
  ): Promise<PetraProjectProfileTaxonomyView> {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError("A taxonomy read requires a canonical Project ID.");
    }
    const url = new URL(
      `/api/queries/projects/${projectId}/taxonomy`,
      this.options.baseUrl,
    );
    if (definitionRevision !== undefined) {
      url.searchParams.set("definition_revision", String(definitionRevision));
    }
    const response = await this.#request(url, { method: "GET" });
    const body: unknown = await response.json();
    this.#contracts.assertValid("project-profile-taxonomy-view", "1.0.0", body);
    const view = body as PetraProjectProfileTaxonomyView;
    if (
      view.project_id !== projectId ||
      (definitionRevision !== undefined &&
        view.project_definition_ref.revision !== definitionRevision)
    ) {
      throw new ProjectProfileClientError(
        503,
        "PROJECT_PROFILE_RESPONSE_INVALID",
        "The taxonomy response crossed the requested Project or definition revision.",
      );
    }
    return structuredClone(view);
  }

  async createProject(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandReceipt> {
    if (request.operation !== "create") {
      throw new TypeError("Project creation requires a create request.");
    }
    return this.#command("/api/commands/projects", request);
  }

  async resetProject(
    projectId: string,
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandReceipt> {
    if (
      !PROJECT_ID.test(projectId) ||
      request.operation !== "reset" ||
      request.expected_project?.project_id !== projectId
    ) {
      throw new TypeError(
        "Project reset requires a reset request bound to the exact route Project.",
      );
    }
    return this.#command(`/api/commands/projects/${projectId}/reset`, request);
  }

  async assessProjectRecovery(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandRecoveryView> {
    this.#contracts.assertValid(
      "project-profile-command-request",
      "1.0.0",
      request,
    );
    const response = await this.#request(
      "/api/queries/project-profile-command-recovery",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid(
      "project-profile-command-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectProfileCommandRecoveryView;
    const requestHash = await canonicalHash(request);
    const expectedAssessmentId = await deriveIdentity(
      "project_profile_recovery",
      view.content_hash,
    );
    const subject = view.content.subject;
    if (
      subject.command_id !== request.command_id ||
      subject.idempotency_key !== request.idempotency_key ||
      subject.operation !== request.operation ||
      subject.request_hash !== requestHash ||
      canonicalize(subject.expected_project ?? null) !==
        canonicalize(request.expected_project ?? null) ||
      view.content_hash !== (await canonicalHash(view.content)) ||
      view.assessment_id !== expectedAssessmentId ||
      view.read_at !== view.content.observation_cutoff
    ) {
      throw new ProjectProfileClientError(
        503,
        "PROJECT_PROFILE_RESPONSE_INVALID",
        "The Project recovery assessment does not bind the exact request or verified content.",
      );
    }
    const effect = view.content.effect;
    if (effect.state === "effect_confirmed") {
      const receipt = effect.receipt;
      const action = view.content.eligible_actions[0];
      if (
        !this.#receiptMatchesRequest(receipt, request) ||
        view.content.eligible_actions.length !== 1 ||
        action?.operation !== "open_resulting_project" ||
        action.owner !== "browser_navigation" ||
        action.method !== "GET" ||
        action.path !== `/projects/${receipt.project_ref.project_id}` ||
        action.identity_behavior !== "no_command" ||
        view.content.return.state !== "exact" ||
        view.content.return.destination.place_role !== "brief" ||
        view.content.return.destination.project_id !==
          receipt.project_ref.project_id
      ) {
        throw new ProjectProfileClientError(
          503,
          "PROJECT_PROFILE_RESPONSE_INVALID",
          "The confirmed Project recovery result crossed its exact receipt or return destination.",
        );
      }
    } else if (effect.state === "outcome_unknown") {
      const action = view.content.eligible_actions[0];
      const expectedPath =
        request.operation === "create"
          ? "/api/commands/projects"
          : `/api/commands/projects/${request.expected_project?.project_id}/reset`;
      const expectedProjectId = await deriveIdentity(
        "project",
        request.command_id,
      );
      if (
        view.content.eligible_actions.length !== 1 ||
        action?.operation !== "retry_exact_command" ||
        action.owner !== "project_profile_command" ||
        action.method !== "POST" ||
        action.path !== expectedPath ||
        action.input_behavior !== "reuse_exact_request" ||
        action.identity_behavior !== "reuse_command_and_idempotency" ||
        action.success_destination.place_role !== "brief" ||
        action.success_destination.project_id !== expectedProjectId
      ) {
        throw new ProjectProfileClientError(
          503,
          "PROJECT_PROFILE_RESPONSE_INVALID",
          "An unknown Project command effect is missing its exact idempotent recovery action.",
        );
      }
    } else if (
      effect.state === "unavailable_to_verify" &&
      view.content.eligible_actions.length !== 0
    ) {
      throw new ProjectProfileClientError(
        503,
        "PROJECT_PROFILE_RESPONSE_INVALID",
        "A conflicting Project command identity cannot expose a recovery action.",
      );
    }
    return structuredClone(view);
  }

  async #command(
    path: string,
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandReceipt> {
    this.#contracts.assertValid(
      "project-profile-command-request",
      "1.0.0",
      request,
    );
    const response = await this.#request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const body: unknown = await response.json();
    this.#contracts.assertValid(
      "project-profile-command-receipt",
      "1.0.0",
      body,
    );
    const receipt = body as PetraProjectProfileCommandReceipt;
    if (!this.#receiptMatchesRequest(receipt, request)) {
      throw new ProjectProfileClientError(
        503,
        "PROJECT_PROFILE_RESPONSE_INVALID",
        "The Project profile receipt does not match the exact command request.",
      );
    }
    return structuredClone(receipt);
  }

  #receiptMatchesRequest(
    receipt: PetraProjectProfileCommandReceipt,
    request: PetraProjectProfileCommandRequest,
  ): boolean {
    return (
      receipt.command_id === request.command_id &&
      receipt.idempotency_key === request.idempotency_key &&
      receipt.operation === request.operation &&
      receipt.profile_ref.profile_id === request.profile_ref.profile_id &&
      receipt.profile_ref.profile_version ===
        request.profile_ref.profile_version &&
      receipt.profile_ref.content_hash === request.profile_ref.content_hash
    );
  }

  async #request(path: string | URL, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.options.token}`);
    const response = await this.#fetch(
      path instanceof URL ? path : new URL(path, this.options.baseUrl),
      { ...init, headers },
    );
    if (response.ok) return response;
    let code = "PROJECT_PROFILE_REQUEST_FAILED";
    let message = `Project profile request failed (${response.status}).`;
    try {
      const body = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof body.error?.code === "string") code = body.error.code;
      if (typeof body.error?.message === "string") message = body.error.message;
    } catch {
      // The stable status remains available when an upstream body is unreadable.
    }
    throw new ProjectProfileClientError(response.status, code, message);
  }
}
