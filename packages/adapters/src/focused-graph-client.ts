import type {
  PetraFocusedGraphDetailsView,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  FocusedGraphExplorationViewRequest,
  FocusedGraphDetailsViewRequest,
  FocusedGraphReadRequest,
  FocusedGraphViewRequest,
  PetraFocusedGraphReadView,
} from "@petra/core";
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
    request: FocusedGraphExplorationViewRequest,
  ): Promise<PetraFocusedGraphViewV11>;
  async read(
    projectId: string,
    request: FocusedGraphViewRequest,
  ): Promise<PetraFocusedGraphView>;
  async read(
    projectId: string,
    request: FocusedGraphReadRequest,
  ): Promise<PetraFocusedGraphReadView> {
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
      const explorationRequest =
        "exploration" in request && request.exploration !== undefined;
      const expectedVersion = explorationRequest ? "1.1.0" : "1.0.0";
      this.#contracts.assertValid("focused-graph-view", expectedVersion, body);
      const view = body as PetraFocusedGraphReadView;
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
        ...(explorationRequest
          ? ([[request.exploration.recipe_semantic_key, "action"]] as const)
          : []),
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
      const returnDestinations = view.content.destinations.filter(
        (destination) =>
          destination.destination_key ===
          request.return_destination.destination_key,
      );
      if (
        view.project_id !== projectId ||
        view.schema_version !== expectedVersion ||
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
        returnDestinations.length !== 1 ||
        !same(returnDestinations[0], request.return_destination) ||
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
        view.content.actions.length !== (explorationRequest ? 2 : 1) ||
        view.content.actions.filter(
          (action) =>
            action.action_kind === "return_to_origin" &&
            action.semantic_key === request.return_action_semantic_key,
        ).length !== 1 ||
        semanticMismatch
      ) {
        throw new Error("Mismatched focused graph identity.");
      }
      if (explorationRequest) {
        if (view.schema_version !== "1.1.0") {
          throw new Error("Mismatched focused graph expansion version.");
        }
        const expansionActions = view.content.actions.filter(
          (action) =>
            action.action_kind === "expand_recorded" &&
            action.semantic_key === request.exploration.recipe_semantic_key,
        );
        const grouped = new Set(
          view.content.groups.flatMap(
            (group) => group.member_relationship_keys,
          ),
        );
        if (
          view.content.exploration.mode !== "named_expansion" ||
          view.content.exploration.expansion_key !==
            request.exploration.expansion_key ||
          view.content.exploration.recipe_semantic_key !==
            request.exploration.recipe_semantic_key ||
          !same(
            view.content.exploration.target_ref,
            request.exploration.target_ref,
          ) ||
          view.content.exploration.maximum_depth !==
            request.exploration.maximum_depth ||
          !same(
            view.content.exploration.filters,
            request.exploration.filters,
          ) ||
          !same(
            view.content.scope.directions,
            request.exploration.filters.directions,
          ) ||
          expansionActions.length !== 1 ||
          view.content.relationships.some(
            (relationship) =>
              !request.exploration.filters.meaning_kinds.includes(
                relationship.meaning_kind,
              ) ||
              !request.exploration.filters.origins.includes(
                relationship.origin,
              ),
          ) ||
          view.content.paths.some((path) =>
            path.steps.some(
              (step) =>
                !request.exploration.filters.directions.includes(
                  step.traversal_direction,
                ),
            ),
          ) ||
          grouped.size !== view.content.relationships.length ||
          view.content.relationships.some(
            (relationship) => !grouped.has(relationship.relationship_key),
          )
        ) {
          throw new Error("Mismatched focused graph expansion identity.");
        }
      }
      return structuredClone(view);
    } catch {
      throw new FocusedGraphClientError(response.status, body);
    }
  }

  async readDetails(
    projectId: string,
    request: FocusedGraphDetailsViewRequest,
  ): Promise<PetraFocusedGraphDetailsView> {
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      !/^focused_graph_details_request_[0-9A-HJKMNP-TV-Z]{26}$/u.test(
        request.details_request_id,
      ) ||
      request.selection.selected_keys.length < 1 ||
      request.selection.selected_keys.length > 100 ||
      new Set(request.selection.selected_keys).size !==
        request.selection.selected_keys.length ||
      request.focused_graph_request.project_definition_ref
        .project_definition_id !==
        this.options.projectDefinition.project_definition_id ||
      request.focused_graph_request.project_definition_ref.revision !==
        this.options.projectDefinition.revision ||
      request.focused_graph_request.project_definition_ref.content_hash !==
        this.options.projectDefinition.content_hash
    ) {
      throw new TypeError(
        "Focused graph Details requires one exact Project, definition, graph result, and bounded selection.",
      );
    }
    const endpoint = new URL(
      `/api/queries/projects/${projectId}/focused-graph/details`,
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
      this.#contracts.assertValid("focused-graph-details-view", "1.0.0", body);
      const view = body as PetraFocusedGraphDetailsView;
      const graph = view.content.graph;
      const graphRequest = request.focused_graph_request;
      const returnDestination = graph.return_destination;
      const exactMembers = [
        ...view.content.nodes.map((entry) => ({
          kind: "node" as const,
          key: entry.member_key,
          ref: entry.member.record_ref,
          basis: entry.member.basis.record_refs,
          location: entry.semantic_location,
          sources: entry.source_inspections,
        })),
        ...view.content.relationships.map((entry) => ({
          kind: "relationship" as const,
          key: entry.member_key,
          ref: {
            record_id: entry.member.relationship_ref.element_id,
            revision: entry.member.relationship_ref.revision,
            record_hash: entry.member.relationship_ref.record_hash,
          },
          basis: entry.member.basis.record_refs,
          location: entry.semantic_location,
          sources: entry.source_inspections,
        })),
      ];
      const duplicateMembers = new Set(
        exactMembers.map((member) => `${member.kind}:${member.key}`),
      );
      const pathKeys = view.content.paths.map((path) => path.path_key);
      const returnedSelectionKeys =
        request.selection.selection_kind === "node"
          ? view.content.nodes.map((entry) => entry.member_key)
          : request.selection.selection_kind === "relationship"
            ? view.content.relationships.map((entry) => entry.member_key)
            : pathKeys;
      const invalidMember = exactMembers.some((member) => {
        const resolution = member.location.resolution;
        const locationDefinition = member.location.definition_ref;
        const locationRequestMismatch =
          member.location.request.object_ref.object_id !==
            member.ref.record_id ||
          member.location.request.object_ref.revision !== member.ref.revision;
        const locationMismatch =
          resolution.state === "current" ||
          resolution.state === "historical" ||
          resolution.state === "superseded"
            ? resolution.resolved_ref.object_id !== member.ref.record_id ||
              resolution.resolved_ref.revision !== member.ref.revision ||
              resolution.resolved_ref.record_hash !== member.ref.record_hash
            : false;
        const definitionMismatch =
          locationDefinition.project_definition_id !==
            graph.profile.project_definition_ref.project_definition_id ||
          locationDefinition.revision !==
            graph.profile.project_definition_ref.revision ||
          locationDefinition.content_hash !==
            graph.profile.project_definition_ref.content_hash ||
          locationDefinition.definition_family !==
            graph.profile.project_definition_ref.definition_family;
        const sourceRefs = new Map(
          member.basis
            .filter((ref) => ref.record_id.startsWith("source_span_"))
            .map((ref) => [ref.record_id, ref]),
        );
        const sourceMismatch = member.sources.some((source) => {
          const expected = sourceRefs.get(source.source_span_ref.record_id);
          if (expected === undefined || !same(expected, source.source_span_ref))
            return true;
          if (source.state === "unavailable") return false;
          const preview = source.source_view.representation.preview;
          return (
            source.project_source_id.length === 0 ||
            source.source_view.binding.revision !== source.binding_revision ||
            source.source_view.binding.content_hash !==
              source.binding_content_hash ||
            source.source_view.binding.project_definition_ref.record_id !==
              graph.profile.project_definition_ref.project_definition_id ||
            source.source_view.binding.project_definition_ref.revision !==
              graph.profile.project_definition_ref.revision ||
            source.source_view.binding.project_definition_ref.content_hash !==
              graph.profile.project_definition_ref.content_hash ||
            preview === undefined ||
            preview.span_ref.record_id !== expected.record_id ||
            preview.span_ref.revision !== expected.revision ||
            preview.span_ref.content_hash !== expected.record_hash
          );
        });
        return (
          locationRequestMismatch ||
          locationMismatch ||
          definitionMismatch ||
          sourceMismatch
        );
      });
      const sourceContentHashMismatch = (
        await Promise.all(
          exactMembers.flatMap((member) =>
            member.sources.map(
              async (source) =>
                source.state === "available" &&
                source.source_view_content_hash !==
                  (await hash(source.source_view)),
            ),
          ),
        )
      ).some(Boolean);
      if (
        view.project_id !== projectId ||
        view.content.details_request_id !== request.details_request_id ||
        view.content_hash !== (await hash(view.content)) ||
        graph.schema_name !== request.expected_graph.schema_name ||
        graph.schema_version !== request.expected_graph.schema_version ||
        graph.content_hash !== request.expected_graph.content_hash ||
        graph.task.request_id !== graphRequest.request_id ||
        graph.task.task_kind !== graphRequest.task_kind ||
        graph.task.task_semantic_key !== graphRequest.task_semantic_key ||
        graph.task.question !== graphRequest.question ||
        !same(graph.task.focus_refs, [graphRequest.focus_ref]) ||
        !same(graph.task.origin, graphRequest.origin) ||
        graph.semantic_layer !== graphRequest.semantic_layer ||
        !same(graph.temporal_position, graphRequest.temporal_position) ||
        !same(graph.scope.limits, graphRequest.limits) ||
        !same(returnDestination, graphRequest.return_destination) ||
        !same(view.content.selection, request.selection) ||
        !same(
          [...returnedSelectionKeys].sort(),
          [...request.selection.selected_keys].sort(),
        ) ||
        duplicateMembers.size !== exactMembers.length ||
        invalidMember ||
        sourceContentHashMismatch
      ) {
        throw new Error("Mismatched focused graph Details identity.");
      }
      return structuredClone(view);
    } catch {
      throw new FocusedGraphClientError(response.status, body);
    }
  }
}
