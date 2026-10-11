import type { PetraProjectDefinition } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export interface ExactProjectDefinitionRead {
  projectId: string;
  definitionId: string;
  revision: number;
  contentHash: string;
}
export class ProjectDefinitionClient {
  constructor(
    readonly options: {
      baseUrl: string;
      token: string;
      fetch?: typeof fetch;
    },
  ) {}

  async read(
    binding: ExactProjectDefinitionRead,
  ): Promise<PetraProjectDefinition> {
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(binding.projectId) ||
      !Number.isSafeInteger(binding.revision) ||
      binding.revision < 1
    )
      throw new TypeError(
        "A definition read requires an exact Project and positive revision.",
      );
    const url = new URL(
      `/api/queries/projects/${binding.projectId}/definition`,
      this.options.baseUrl,
    );
    url.searchParams.set("definition_revision", String(binding.revision));
    const response = await (this.options.fetch ?? fetch)(url, {
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!response.ok)
      throw new Error(
        `The exact ProjectDefinition is unavailable (${response.status}).`,
      );
    const value: unknown = await response.json();
    new PetraContractRegistry().assertValid(
      "project-definition",
      "1.0.0",
      value,
    );
    const definition = value as PetraProjectDefinition;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalize(definition.content)),
    );
    const hash = `sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    if (
      definition.project_id !== binding.projectId ||
      definition.project_definition_id !== binding.definitionId ||
      definition.revision !== binding.revision ||
      definition.content_hash !== binding.contentHash ||
      hash !== binding.contentHash
    )
      throw new Error(
        "The definition response changed the requested Project, revision, or immutable content.",
      );
    return structuredClone(definition);
  }
}
