import type { PetraProjectWorkingStateSnapshot } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export interface ProjectWorkingStateClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ProjectWorkingStateClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
  ) {
    super(
      "The exact Project working-state snapshot is unavailable or inconsistent.",
    );
    this.name = "ProjectWorkingStateClientError";
  }
}

const hash = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

/** Renderer-neutral exact read shared by direct and model-mediated callers. */
export class ProjectWorkingStateClient {
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectWorkingStateClientOptions) {
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async read(projectId: string): Promise<PetraProjectWorkingStateSnapshot> {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId)) {
      throw new TypeError(
        "A working-state read requires one exact Project identity.",
      );
    }
    const endpoint = new URL(
      `/api/queries/projects/${projectId}/working-state`,
      this.options.baseUrl,
    );
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new ProjectWorkingStateClientError(response.status, body);
    }
    try {
      this.#contracts.assertValid(
        "project-working-state-snapshot",
        "1.0.0",
        body,
      );
      const snapshot = body as PetraProjectWorkingStateSnapshot;
      const definition = snapshot.content.project_definition_ref;
      const records = [
        ...snapshot.content.candidates,
        ...snapshot.content.relationships,
      ];
      const candidateIds = snapshot.content.candidates.map(
        (record) => record.working_candidate_id,
      );
      const relationshipIds = snapshot.content.relationships.map(
        (record) => record.working_relationship_id,
      );
      const recordContentHashes = await Promise.all(
        records.map(async (record) => {
          const projection = structuredClone(record) as Record<string, unknown>;
          delete projection.content_hash;
          return hash(projection);
        }),
      );
      if (
        snapshot.project_id !== projectId ||
        snapshot.content_hash !== (await hash(snapshot.content)) ||
        new Set(candidateIds).size !== candidateIds.length ||
        new Set(relationshipIds).size !== relationshipIds.length ||
        records.some(
          (record, index) =>
            record.content_hash !== recordContentHashes[index] ||
            record.project_id !== projectId ||
            record.project_definition_ref.project_definition_id !==
              definition.project_definition_id ||
            record.project_definition_ref.revision !== definition.revision ||
            record.project_definition_ref.content_hash !==
              definition.content_hash ||
            record.project_definition_ref.definition_family !==
              definition.definition_family,
        )
      ) {
        throw new Error("Mismatched working-state identity.");
      }
      return structuredClone(snapshot);
    } catch {
      throw new ProjectWorkingStateClientError(response.status, body);
    }
  }
}
