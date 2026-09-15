import type {
  PetraFocusedGraphView,
  PetraProjectDefinition,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { FocusedGraphViewRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";

export interface FocusedGraphClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly projectDefinition: PetraProjectDefinition;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class FocusedGraphClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
  ) {
    super("The exact focused graph result is unavailable or inconsistent.");
    this.name = "FocusedGraphClientError";
  }
}

const hash = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

/**
 * Renderer-neutral authenticated client. It sends no geometry or command and
 * rejects a response that substitutes Project, definition, task, snapshot, or
 * finite scope identity.
 */
export class FocusedGraphClient {
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: FocusedGraphClientOptions) {
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async read(
    projectId: string,
    request: FocusedGraphViewRequest,
  ): Promise<PetraFocusedGraphView> {
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      request.request_id.match(
        /^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$/u,
      ) === null ||
      request.project_definition_ref.project_definition_id !==
        this.options.projectDefinition.project_definition_id ||
      request.project_definition_ref.revision !==
        this.options.projectDefinition.revision ||
      request.project_definition_ref.content_hash !==
        this.options.projectDefinition.content_hash ||
      request.project_definition_ref.definition_family !==
        this.options.projectDefinition.definition_family
    ) {
      throw new TypeError(
        "A focused graph read requires one exact Project, request, and ProjectDefinition identity.",
      );
    }
    const endpoint = new URL(
      `/api/queries/projects/${projectId}/focused-graph`,
      this.options.baseUrl,
    );
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new FocusedGraphClientError(response.status, body);
    }
    try {
      this.#contracts.assertValid("focused-graph-view", "1.0.0", body);
      const view = body as PetraFocusedGraphView;
      const definition = this.options.projectDefinition;
      const definitionRef = view.content.profile.project_definition_ref;
      const expectedDefinitionRecordHash = await hash(definition);
      const taskWithoutHash = structuredClone(view.content.task) as Partial<
        PetraFocusedGraphView["content"]["task"]
      >;
      delete taskWithoutHash.request_hash;
      const semantics = new Map(
        view.content.profile.resolved_semantics.map((semantic) => [
          semantic.semantic_key,
          semantic,
        ]),
      );
      const expectedRoles = [
        [request.task_semantic_key, "task"],
        [request.object_semantic_key, "object"],
        [request.relationship_semantic_key, "relationship"],
        [request.return_action_semantic_key, "action"],
      ] as const;
      const semanticMismatch = expectedRoles.some(([key, role]) => {
        const semantic = semantics.get(key);
        const registrations = definition.content.registrations.filter(
          (candidate) => candidate.semantic_key === key,
        );
        const terms = definition.content.terms.filter(
          (candidate) => candidate.semantic_key === key,
        );
        return (
          semantic === undefined ||
          semantic.role !== role ||
          registrations.length !== 1 ||
          terms.length !== 1 ||
          !same(semantic.contract, registrations[0]?.contract) ||
          !same(semantic.term, terms[0])
        );
      });
      const graphRegistration = definition.content.registrations.filter(
        (candidate) => candidate.semantic_key === "petra.focused-graph",
      );
      const returnedSemanticKeys = view.content.profile.resolved_semantics.map(
        (semantic) => semantic.semantic_key,
      );
      if (
        view.project_id !== projectId ||
        definition.project_id !== projectId ||
        definition.content_hash !== (await hash(definition.content)) ||
        request.project_definition_ref.record_hash !==
          expectedDefinitionRecordHash ||
        definitionRef.project_definition_id !==
          definition.project_definition_id ||
        definitionRef.revision !== definition.revision ||
        definitionRef.content_hash !== definition.content_hash ||
        definitionRef.record_hash !== expectedDefinitionRecordHash ||
        definitionRef.definition_family !== definition.definition_family ||
        view.content_hash !== (await hash(view.content)) ||
        view.content.task.question_hash !==
          (await hash(view.content.task.question)) ||
        view.content.task.request_hash !== (await hash(taskWithoutHash)) ||
        view.content.task.request_id !== request.request_id ||
        view.content.task.task_kind !== request.task_kind ||
        view.content.task.task_semantic_key !== request.task_semantic_key ||
        view.content.task.question !== request.question ||
        !same(view.content.task.focus_refs, [request.focus_ref]) ||
        !same(view.content.task.origin, request.origin) ||
        view.content.task.return_destination_key !==
          request.return_destination.destination_key ||
        view.content.semantic_layer !== request.semantic_layer ||
        !same(view.content.temporal_position, request.temporal_position) ||
        !same(view.content.scope.limits, request.limits) ||
        !same(view.content.destinations, [request.return_destination]) ||
        (request.expected_snapshot !== undefined &&
          !same(view.content.requested_snapshot, request.expected_snapshot)) ||
        graphRegistration.length !== 1 ||
        !same(
          view.content.profile.focused_graph_registration.contract,
          graphRegistration[0]?.contract,
        ) ||
        semantics.size !== returnedSemanticKeys.length ||
        !same(view.content.scope.included_relationship_semantics, [
          request.relationship_semantic_key,
        ]) ||
        view.content.nodes.some(
          (node) => node.semantic_key !== request.object_semantic_key,
        ) ||
        view.content.relationships.some(
          (relationship) =>
            relationship.semantic_key !== request.relationship_semantic_key,
        ) ||
        view.content.actions.length !== 1 ||
        view.content.actions[0]?.semantic_key !==
          request.return_action_semantic_key ||
        semanticMismatch
      ) {
        throw new Error("Mismatched focused graph identity.");
      }
      return structuredClone(view);
    } catch {
      throw new FocusedGraphClientError(response.status, body);
    }
  }
}
