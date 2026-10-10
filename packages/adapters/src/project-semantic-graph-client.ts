import type { PetraProjectSemanticGraphView } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export class ProjectSemanticGraphClient {
  constructor(
    readonly options: { baseUrl: string; token: string; fetch?: typeof fetch },
  ) {}

  async read(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<PetraProjectSemanticGraphView> {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId))
      throw new Error("The Project identity is malformed.");
    const response = await (this.options.fetch ?? fetch)(
      new URL(
        `/api/queries/projects/${encodeURIComponent(projectId)}/semantic-graph`,
        this.options.baseUrl,
      ),
      {
        headers: { authorization: `Bearer ${this.options.token}` },
        ...(signal === undefined ? {} : { signal }),
      },
    );
    if (!response.ok)
      throw new Error(
        "Petra could not read this Project's bounded working graph.",
      );
    const value: unknown = await response.json();
    new PetraContractRegistry().assertValid(
      "project-semantic-graph-view",
      "1.0.0",
      value,
    );
    const view = value as PetraProjectSemanticGraphView;
    if (view.project_id !== projectId)
      throw new Error("The graph belongs to another Project.");
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalize(view.content)),
    );
    if (
      `sha256:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")}` !==
      view.content_hash
    )
      throw new Error(
        "The graph content hash does not match its exact snapshot.",
      );
    const keys = new Set(view.content.nodes.map((node) => node.key));
    if (
      keys.size !== view.content.nodes.length ||
      view.content.relationships.some(
        (edge) => !keys.has(edge.subject_key) || !keys.has(edge.object_key),
      )
    )
      throw new Error(
        "The bounded graph contains incoherent node or endpoint identities.",
      );
    return view;
  }
}
