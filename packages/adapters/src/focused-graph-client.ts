import type {
  PetraFocusedGraphActionPreviewView,
  PetraFocusedGraphAnalysisView,
  PetraFocusedGraphDetailsView,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { parseFocusedGraphActionPreviewViewRequest } from "@petra/core";
import type {
  FocusedGraphActionPreviewViewRequest,
  FocusedGraphAnalysisPositionRequest,
  FocusedGraphAnalysisViewRequest,
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

const exactObjectKeys = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
};

const exactAnalysisRequest = (
  value: FocusedGraphAnalysisViewRequest,
): value is FocusedGraphAnalysisViewRequest => {
  const graphKeys = [
    "request_id",
    "task_kind",
    "task_semantic_key",
    "question",
    "focus_ref",
    "origin",
    "project_definition_ref",
    "semantic_layer",
    "temporal_position",
    "object_semantic_key",
    "relationship_semantic_key",
    "return_action_semantic_key",
    "return_destination",
    "limits",
  ] as const;
  const position = (candidate: unknown): boolean =>
    exactObjectKeys(candidate, ["position_key", "label", "graph_request"]) &&
    typeof candidate.position_key === "string" &&
    typeof candidate.label === "string" &&
    exactObjectKeys(candidate.graph_request, graphKeys, [
      "expected_snapshot",
      "exploration",
    ]) &&
    candidate.graph_request.expected_snapshot !== undefined;
  if (value.task_kind === "comparison") {
    return (
      exactObjectKeys(value, [
        "analysis_request_id",
        "task_kind",
        "question",
        "before",
        "after",
      ]) &&
      position(value.before) &&
      position(value.after)
    );
  }
  if (value.task_kind === "impact") {
    return (
      exactObjectKeys(
        value,
        [
          "analysis_request_id",
          "task_kind",
          "question",
          "position",
          "history_event_id",
        ],
        ["review_binding"],
      ) && position(value.position)
    );
  }
  return (
    value.task_kind === "time" &&
    exactObjectKeys(value, [
      "analysis_request_id",
      "task_kind",
      "question",
      "position",
      "temporal_dimension",
    ]) &&
    position(value.position)
  );
};

const analysisPositions = (
  request: FocusedGraphAnalysisViewRequest,
): readonly {
  readonly request: FocusedGraphAnalysisPositionRequest;
  readonly role: "before" | "after" | "context" | "time_position";
}[] => {
  switch (request.task_kind) {
    case "comparison":
      return [
        { request: request.before, role: "before" },
        { request: request.after, role: "after" },
      ];
    case "impact":
      return [{ request: request.position, role: "context" }];
    case "time":
      return [{ request: request.position, role: "time_position" }];
  }
};

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
      const representedRoles = new Map<
        string,
        PetraFocusedGraphView["content"]["profile"]["resolved_semantics"][number]["role"]
      >();
      let representedRoleConflict = false;
      const represent = (
        key: string,
        role: PetraFocusedGraphView["content"]["profile"]["resolved_semantics"][number]["role"],
      ): void => {
        const existing = representedRoles.get(key);
        if (existing !== undefined && existing !== role) {
          representedRoleConflict = true;
          return;
        }
        representedRoles.set(key, role);
      };
      for (const [key, role] of expectedRoles) represent(key, role);
      for (const node of view.content.nodes)
        represent(node.semantic_key, "object");
      for (const relationship of view.content.relationships)
        represent(relationship.semantic_key, "relationship");
      for (const action of view.content.actions)
        represent(action.semantic_key, "action");
      const semanticMismatch = [...representedRoles].some(([key, role]) => {
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
        semantics.size !== representedRoles.size ||
        representedRoleConflict ||
        !same(view.content.scope.included_relationship_semantics, [
          request.relationship_semantic_key,
        ]) ||
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

  async readActionPreview(
    projectId: string,
    request: FocusedGraphActionPreviewViewRequest,
  ): Promise<PetraFocusedGraphActionPreviewView> {
    let parsed: FocusedGraphActionPreviewViewRequest;
    try {
      parsed = parseFocusedGraphActionPreviewViewRequest(request);
    } catch {
      throw new TypeError(
        "A focused graph action preview requires one exact snapshot-bound selection and canonical Review or inquiry-result target.",
      );
    }
    const definition = this.options.projectDefinition;
    const definitionRef = parsed.focused_graph_request.project_definition_ref;
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      definition.project_id !== projectId ||
      definition.content_hash !== (await hash(definition.content)) ||
      definitionRef.project_definition_id !==
        definition.project_definition_id ||
      definitionRef.revision !== definition.revision ||
      definitionRef.content_hash !== definition.content_hash ||
      definitionRef.record_hash !== (await hash(definition)) ||
      definitionRef.definition_family !== definition.definition_family
    ) {
      throw new TypeError(
        "A focused graph action preview requires one exact Project and ProjectDefinition identity.",
      );
    }
    const endpoint = new URL(
      `/api/queries/projects/${projectId}/focused-graph/action-preview`,
      this.options.baseUrl,
    );
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new FocusedGraphClientError(response.status, body);
    }
    try {
      this.#contracts.assertValid(
        "focused-graph-action-preview-view",
        "1.0.0",
        body,
      );
      const view = body as PetraFocusedGraphActionPreviewView;
      const graph = view.content.graph_view;
      const returnDestination = graph.content.destinations.find(
        (destination) =>
          destination.destination_key ===
          graph.content.task.return_destination_key,
      );
      const preview = view.content.preview;
      const targetMismatch =
        parsed.target.action_kind === "governed_correction"
          ? preview.preview_kind !== "governed_correction" ||
            preview.requested_change !== parsed.target.requested_change ||
            preview.review_session_ref.review_session_id !==
              parsed.target.review_session_id ||
            preview.review_member_id !== parsed.target.review_member_id
          : preview.preview_kind !== "new_work" ||
            !same(
              preview.inquiry_result_link_ref,
              parsed.target.inquiry_result_link_ref,
            );
      if (
        view.project_id !== projectId ||
        view.content_hash !== (await hash(view.content)) ||
        view.content.action_request_id !== parsed.action_request_id ||
        view.content.request_hash !== (await hash(parsed)) ||
        graph.project_id !== projectId ||
        graph.schema_name !== parsed.expected_graph.schema_name ||
        graph.schema_version !== parsed.expected_graph.schema_version ||
        graph.content_hash !== parsed.expected_graph.content_hash ||
        graph.content.task.request_id !==
          parsed.focused_graph_request.request_id ||
        !same(
          graph.content.requested_snapshot,
          parsed.focused_graph_request.expected_snapshot,
        ) ||
        !same(view.content.selection, parsed.selection) ||
        view.content.return_context.graph_request_id !==
          parsed.focused_graph_request.request_id ||
        !same(view.content.return_context.selection, parsed.selection) ||
        !same(
          view.content.return_context.origin,
          parsed.focused_graph_request.origin,
        ) ||
        returnDestination === undefined ||
        !same(view.content.return_context.destination, returnDestination) ||
        targetMismatch
      ) {
        throw new Error("Mismatched focused graph action preview identity.");
      }
      return structuredClone(view);
    } catch {
      throw new FocusedGraphClientError(response.status, body);
    }
  }

  async readAnalysis(
    projectId: string,
    request: FocusedGraphAnalysisViewRequest,
  ): Promise<PetraFocusedGraphAnalysisView> {
    if (!exactAnalysisRequest(request)) {
      throw new TypeError(
        "A focused graph analysis requires one exact Project, task, and snapshot-bound position set.",
      );
    }
    const parsed = structuredClone(request);
    const expectedPositions = analysisPositions(parsed);
    const definition = this.options.projectDefinition;
    const expectedDefinitionRecordHash = await hash(definition);
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      definition.project_id !== projectId ||
      definition.content_hash !== (await hash(definition.content)) ||
      expectedPositions.some(({ request: candidate }) => {
        const reference = candidate.graph_request.project_definition_ref;
        return (
          reference.project_definition_id !==
            definition.project_definition_id ||
          reference.revision !== definition.revision ||
          reference.content_hash !== definition.content_hash ||
          reference.record_hash !== expectedDefinitionRecordHash ||
          reference.definition_family !== definition.definition_family
        );
      })
    ) {
      throw new TypeError(
        "A focused graph analysis requires the client's exact ProjectDefinition identity.",
      );
    }

    const endpoint = new URL(
      `/api/queries/projects/${projectId}/focused-graph/analysis`,
      this.options.baseUrl,
    );
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new FocusedGraphClientError(response.status, body);
    }
    try {
      this.#contracts.assertValid("focused-graph-analysis-view", "1.0.0", body);
      const view = body as PetraFocusedGraphAnalysisView;
      const expectedFocusRefs = [
        ...new Map(
          expectedPositions.map(({ request: candidate }) => {
            const reference = candidate.graph_request.focus_ref;
            return [
              `${reference.record_id}:${reference.revision}:${reference.record_hash}`,
              reference,
            ];
          }),
        ).values(),
      ];
      const expectedTaskWithoutHash = {
        analysis_request_id: parsed.analysis_request_id,
        task_kind: parsed.task_kind,
        question: parsed.question,
        question_hash: await hash(parsed.question),
        focus_refs: expectedFocusRefs,
        position_keys: expectedPositions.map(
          ({ request: candidate }) => candidate.position_key,
        ),
      };
      const returnedPositions = view.content.positions;
      const positionMismatch = await Promise.all(
        expectedPositions.map(async (expected, index) => {
          const returned = returnedPositions[index];
          if (returned === undefined) return true;
          const graphRequest = expected.request.graph_request;
          const graph = returned.graph_view;
          const graphTaskWithoutHash = structuredClone(
            graph.content.task,
          ) as Partial<typeof graph.content.task>;
          delete graphTaskWithoutHash.request_hash;
          const expectedGraphVersion =
            "exploration" in graphRequest &&
            graphRequest.exploration !== undefined
              ? "1.1.0"
              : "1.0.0";
          return (
            returned.position_key !== expected.request.position_key ||
            returned.label !== expected.request.label ||
            returned.role !== expected.role ||
            graph.schema_version !== expectedGraphVersion ||
            graph.project_id !== projectId ||
            graph.content_hash !== (await hash(graph.content)) ||
            graph.content.task.request_hash !==
              (await hash(graphTaskWithoutHash)) ||
            graph.content.task.question_hash !==
              (await hash(graph.content.task.question)) ||
            graph.content.task.request_id !== graphRequest.request_id ||
            graph.content.task.task_kind !== graphRequest.task_kind ||
            graph.content.task.task_semantic_key !==
              graphRequest.task_semantic_key ||
            graph.content.task.question !== graphRequest.question ||
            !same(graph.content.task.focus_refs, [graphRequest.focus_ref]) ||
            !same(graph.content.task.origin, graphRequest.origin) ||
            graph.content.semantic_layer !== graphRequest.semantic_layer ||
            !same(
              graph.content.temporal_position,
              graphRequest.temporal_position,
            ) ||
            !same(
              graph.content.requested_snapshot,
              graphRequest.expected_snapshot,
            ) ||
            !same(graph.content.scope.limits, graphRequest.limits) ||
            !same(
              graph.content.profile.project_definition_ref,
              graphRequest.project_definition_ref,
            )
          );
        }),
      );

      let analysisMismatch = false;
      const analysis = view.content.analysis;
      if (parsed.task_kind === "comparison") {
        analysisMismatch =
          analysis.analysis_kind !== "comparison" ||
          analysis.before_position_key !== parsed.before.position_key ||
          analysis.after_position_key !== parsed.after.position_key;
      } else if (parsed.task_kind === "impact") {
        analysisMismatch =
          analysis.analysis_kind !== "impact" ||
          analysis.position_key !== parsed.position.position_key ||
          analysis.dependency_source.project_id !== projectId ||
          analysis.dependency_source.event_id !== parsed.history_event_id ||
          (parsed.review_binding === undefined
            ? analysis.assessed_consequences.state !== "unavailable"
            : analysis.assessed_consequences.state !== "supplied" ||
              analysis.assessed_consequences.items.some(
                (item) =>
                  item.source.review_session_id !==
                    parsed.review_binding?.review_session_id ||
                  !parsed.review_binding?.review_member_ids.includes(
                    item.review_member_id,
                  ),
              ));
      } else {
        analysisMismatch =
          analysis.analysis_kind !== "time" ||
          analysis.position_key !== parsed.position.position_key ||
          analysis.temporal_dimension !== parsed.temporal_dimension;
      }

      if (
        view.project_id !== projectId ||
        view.content_hash !== (await hash(view.content)) ||
        view.content.task.analysis_request_id !== parsed.analysis_request_id ||
        !same(view.content.task, {
          ...expectedTaskWithoutHash,
          request_hash: await hash(expectedTaskWithoutHash),
        }) ||
        returnedPositions.length !== expectedPositions.length ||
        positionMismatch.some(Boolean) ||
        analysisMismatch
      ) {
        throw new Error("Mismatched focused graph analysis identity.");
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
