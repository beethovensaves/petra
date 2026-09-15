import { createHash } from "node:crypto";

import type {
  FocusedGraphContractRef,
  FocusedGraphExactRef,
  FocusedGraphRegisteredAction,
  FocusedGraphResolvedSemantic,
  FocusedGraphTerm,
  PetraFocusedGraphView,
  PetraProjectDefinition,
  ProjectDefinitionContractRef,
  ProjectDefinitionRegistration,
  ProjectDefinitionTerm,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export type FocusedGraphViewContractErrorCode =
  | "FOCUSED_GRAPH_CONTRACT_INVALID"
  | "FOCUSED_GRAPH_DEFINITION_MISMATCH"
  | "FOCUSED_GRAPH_PROFILE_UNREGISTERED"
  | "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS"
  | "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED"
  | "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE"
  | "FOCUSED_GRAPH_LAYER_INCOMPATIBLE"
  | "FOCUSED_GRAPH_TEMPORAL_POSITION_INCOMPATIBLE"
  | "FOCUSED_GRAPH_ACTION_INCOMPATIBLE"
  | "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE";

export class FocusedGraphViewContractError extends Error {
  constructor(
    readonly code: FocusedGraphViewContractErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FocusedGraphViewContractError";
  }
}

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const sameContract = (
  left: FocusedGraphContractRef | ProjectDefinitionContractRef,
  right: FocusedGraphContractRef | ProjectDefinitionContractRef,
): boolean =>
  left.name === right.name &&
  left.version === right.version &&
  left.content_hash === right.content_hash;

const sameTerm = (
  left: FocusedGraphTerm,
  right: ProjectDefinitionTerm,
): boolean =>
  left.semantic_key === right.semantic_key &&
  left.singular === right.singular &&
  left.plural === right.plural &&
  left.definition === right.definition &&
  left.generic_family === right.generic_family;

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const registrationKindsByRole = {
  task: new Set(["objective_schema", "workflow", "extension"]),
  object: new Set(["object_schema", "source_role"]),
  relationship: new Set(["relationship_schema"]),
  action: new Set(["workflow", "tool", "extension"]),
} satisfies Record<
  FocusedGraphResolvedSemantic["role"],
  ReadonlySet<ProjectDefinitionRegistration["registration_kind"]>
>;

const termFamiliesByRole = {
  task: new Set(["focus", "task"]),
  object: new Set(["focus", "finding", "reference", "output", "other"]),
  relationship: new Set(["relationship"]),
  action: new Set(["task"]),
} satisfies Record<
  FocusedGraphResolvedSemantic["role"],
  ReadonlySet<ProjectDefinitionTerm["generic_family"]>
>;

const consequenceByAction = {
  inspect_details: "read_only_navigation",
  open_source: "read_only_navigation",
  inspect_path: "read_only_navigation",
  expand_recorded: "read_only_expansion",
  prepare_correction: "prepares_working_candidate",
  open_review: "opens_canonical_review",
  preview_work: "previews_typed_work",
  return_to_origin: "read_only_navigation",
} satisfies Record<
  FocusedGraphRegisteredAction["action_kind"],
  FocusedGraphRegisteredAction["consequence"]
>;

const authorityByLayer = {
  current: "current_authority",
  working: "working_non_authority",
  historical: "historical_authority",
} as const;

const uniqueMap = <Value>(
  values: readonly Value[],
  keyOf: (value: Value) => string,
  code: FocusedGraphViewContractErrorCode,
  label: string,
): Map<string, Value> => {
  const result = new Map<string, Value>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key))
      throw new FocusedGraphViewContractError(
        code,
        `${label} ${key} is ambiguous.`,
      );
    result.set(key, value);
  }
  return result;
};

/**
 * Pure conformance boundary over an already authorized ProjectDefinition and a
 * composed view. It performs no query, authority read, persistence, route, or
 * mutation. Profile text and actions are accepted only from exact installed
 * registrations on the supplied immutable definition revision.
 */
export class FocusedGraphViewContractResolver {
  constructor(private readonly contracts: PetraContractRegistry) {}

  private fail(
    code: FocusedGraphViewContractErrorCode,
    message: string,
  ): never {
    throw new FocusedGraphViewContractError(code, message);
  }

  private installed(contract: FocusedGraphContractRef): void {
    const entry = this.contracts.entries.find(
      (candidate) =>
        `petra.${candidate.name}` === contract.name &&
        candidate.version === contract.version,
    );
    if (entry === undefined || entry.canonical_sha256 !== contract.content_hash)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${contract.name}@${contract.version} semantic contract is not installed.`,
      );
    try {
      this.contracts.validator(entry.name, entry.version);
    } catch {
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The installed ${contract.name}@${contract.version} contract has no validator.`,
      );
    }
  }

  private exactRegistration(
    definition: PetraProjectDefinition,
    semanticKey: string,
  ): ProjectDefinitionRegistration {
    const matches = definition.content.registrations.filter(
      (registration) => registration.semantic_key === semanticKey,
    );
    if (matches.length > 1)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
        `The exact ${semanticKey} profile registration is ambiguous.`,
      );
    const match = matches[0];
    if (match === undefined)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${semanticKey} profile registration is unavailable.`,
      );
    return match;
  }

  private exactTerm(
    definition: PetraProjectDefinition,
    semanticKey: string,
  ): ProjectDefinitionTerm {
    const matches = definition.content.terms.filter(
      (term) => term.semantic_key === semanticKey,
    );
    if (matches.length > 1)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
        `The exact ${semanticKey} profile term is ambiguous.`,
      );
    const match = matches[0];
    if (match === undefined)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${semanticKey} profile term is unavailable.`,
      );
    return match;
  }

  private resolveSemantic(
    definition: PetraProjectDefinition,
    semantic: FocusedGraphResolvedSemantic,
  ): void {
    const registrationKinds: ReadonlySet<
      ProjectDefinitionRegistration["registration_kind"]
    > = registrationKindsByRole[semantic.role];
    const termFamilies: ReadonlySet<ProjectDefinitionTerm["generic_family"]> =
      termFamiliesByRole[semantic.role];
    if (semantic.term.semantic_key !== semantic.semantic_key)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} term names a different meaning.`,
      );
    if (!registrationKinds.has(semantic.registration_kind))
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} registration kind is incompatible with its ${semantic.role} role.`,
      );
    if (!termFamilies.has(semantic.term.generic_family))
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} term family is incompatible with its ${semantic.role} role.`,
      );
    const registration = this.exactRegistration(
      definition,
      semantic.semantic_key,
    );
    const term = this.exactTerm(definition, semantic.semantic_key);
    if (
      registration.registration_kind !== semantic.registration_kind ||
      !sameContract(registration.contract, semantic.contract) ||
      !sameTerm(semantic.term, term)
    )
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} view meaning is incompatible with the exact ProjectDefinition.`,
      );
    this.installed(semantic.contract);
  }

  resolve(
    definition: PetraProjectDefinition,
    view: PetraFocusedGraphView,
  ): {
    state: "resolved";
    definition_family: string;
    view: PetraFocusedGraphView;
  } {
    try {
      this.contracts.assertValid("project-definition", "1.0.0", definition);
      this.contracts.assertValid("focused-graph-view", "1.0.0", view);
    } catch {
      this.fail(
        "FOCUSED_GRAPH_CONTRACT_INVALID",
        "The ProjectDefinition or focused graph value is not contract-valid.",
      );
    }

    const content = view.content;
    const profile = content.profile;
    const definitionRef = profile.project_definition_ref;
    if (
      view.project_id !== definition.project_id ||
      definitionRef.project_definition_id !==
        definition.project_definition_id ||
      definitionRef.revision !== definition.revision ||
      definitionRef.content_hash !== definition.content_hash ||
      definitionRef.record_hash !== digest(definition) ||
      definitionRef.definition_family !== definition.definition_family ||
      definition.content_hash !== digest(definition.content)
    )
      this.fail(
        "FOCUSED_GRAPH_DEFINITION_MISMATCH",
        "Focused graph resolution requires one exact Project-owned definition revision and record hash.",
      );
    if (
      profile.kernel_compatibility !==
        definition.content.kernel_compatibility ||
      profile.label !== definition.content.label ||
      !definition.content.supported_places.includes("graph")
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "The exact ProjectDefinition is not registered for this focused graph profile.",
      );

    const graphRegistration = this.exactRegistration(
      definition,
      profile.focused_graph_registration.semantic_key,
    );
    if (
      graphRegistration.registration_kind !== "extension" ||
      !sameContract(
        graphRegistration.contract,
        profile.focused_graph_registration.contract,
      )
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "The exact ProjectDefinition focused graph registration is incompatible.",
      );
    const focusedContract = this.contracts.entries.find(
      (candidate) =>
        candidate.name === "focused-graph-view" &&
        candidate.version === "1.0.0",
    );
    if (
      focusedContract === undefined ||
      graphRegistration.contract.name !== "petra.focused-graph-view" ||
      graphRegistration.contract.version !== "1.0.0" ||
      graphRegistration.contract.content_hash !==
        focusedContract.canonical_sha256
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "No installed focused graph contract supports this ProjectDefinition.",
      );
    this.installed(profile.focused_graph_registration.contract);

    const semantics = uniqueMap(
      profile.resolved_semantics,
      (semantic) => semantic.semantic_key,
      "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
      "Resolved semantic",
    );
    for (const semantic of semantics.values())
      this.resolveSemantic(definition, semantic);
    const requireSemantic = (
      semanticKey: string,
      role: FocusedGraphResolvedSemantic["role"],
    ): FocusedGraphResolvedSemantic => {
      const semantic = semantics.get(semanticKey);
      if (semantic === undefined)
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
          `The ${semanticKey} ${role} meaning is not resolved by this profile.`,
        );
      if (semantic.role !== role)
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `The ${semanticKey} meaning cannot be used as a ${role}.`,
        );
      return semantic;
    };

    requireSemantic(content.task.task_semantic_key, "task");
    for (const semanticKey of content.scope.included_relationship_semantics)
      requireSemantic(semanticKey, "relationship");
    for (const node of content.nodes) {
      const semantic = requireSemantic(node.semantic_key, "object");
      if (!sameTerm(node.term, semantic.term))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Node ${node.node_key} does not preserve its resolved profile term.`,
        );
    }
    for (const relationship of content.relationships) {
      const semantic = requireSemantic(
        relationship.semantic_key,
        "relationship",
      );
      if (!sameTerm(relationship.term, semantic.term))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} does not preserve its resolved profile term.`,
        );
    }
    for (const action of content.actions)
      requireSemantic(action.semantic_key, "action");

    const { request_hash: requestHash, ...requestIdentity } = content.task;
    if (
      content.task.question_hash !== digest(content.task.question) ||
      requestHash !== digest(requestIdentity) ||
      view.content_hash !== digest(content)
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The focused graph question, request, or content identity is inconsistent.",
      );

    if (!content.scope.included_layers.includes(content.semantic_layer))
      this.fail(
        "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
        "The active semantic layer is outside the bounded scope.",
      );
    const historical = content.semantic_layer === "historical";
    if (
      historical !==
        (content.temporal_position.position_kind === "historical") ||
      (historical &&
        content.scope.included_layers.some((layer) => layer !== "historical"))
    )
      this.fail(
        "FOCUSED_GRAPH_TEMPORAL_POSITION_INCOMPATIBLE",
        "The temporal position is incompatible with the active semantic layer.",
      );
    if (
      content.projection_position.represented_event_position !==
      content.represented_snapshot.event_position
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The projection position does not identify the represented snapshot.",
      );

    const nodes = uniqueMap(
      content.nodes,
      (node) => node.node_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Node",
    );
    const relationships = uniqueMap(
      content.relationships,
      (relationship) => relationship.relationship_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Relationship",
    );
    const paths = uniqueMap(
      content.paths,
      (path) => path.path_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Path",
    );
    const destinations = uniqueMap(
      content.destinations,
      (destination) => destination.destination_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Destination",
    );
    uniqueMap(
      content.actions,
      (action) => action.action_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Action",
    );

    if (
      content.nodes.length > content.scope.limits.maximum_nodes ||
      content.relationships.length >
        content.scope.limits.maximum_relationships ||
      content.paths.length > content.scope.limits.maximum_paths
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The returned membership exceeds its declared finite limits.",
      );
    if (
      !content.task.focus_refs.some((focus) =>
        [...nodes.values()].some((node) => sameRef(node.record_ref, focus)),
      )
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The exact task focus is not represented by the bounded result.",
      );

    const memberKeys = new Set([
      ...nodes.keys(),
      ...relationships.keys(),
      ...paths.keys(),
    ]);
    for (const node of nodes.values()) {
      if (
        !content.scope.included_layers.includes(node.layer) ||
        node.authority_position !== authorityByLayer[node.layer]
      )
        this.fail(
          "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
          `Node ${node.node_key} has incompatible layer authority.`,
        );
      for (const destinationKey of node.destination_keys)
        if (!destinations.has(destinationKey))
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Node ${node.node_key} names an unavailable destination key.`,
          );
    }
    for (const relationship of relationships.values()) {
      if (
        !nodes.has(relationship.source_node_key) ||
        !nodes.has(relationship.target_node_key)
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has an unrepresented endpoint.`,
        );
      if (
        !content.scope.included_layers.includes(relationship.layer) ||
        relationship.authority_position !== authorityByLayer[relationship.layer]
      )
        this.fail(
          "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has incompatible layer authority.`,
        );
      if (!content.scope.directions.includes(relationship.direction))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has a direction outside the bounded scope.`,
        );
      for (const destinationKey of relationship.destination_keys)
        if (!destinations.has(destinationKey))
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Relationship ${relationship.relationship_key} names an unavailable destination key.`,
          );
    }

    for (const path of paths.values()) {
      if (
        (path.state === "no_path" && path.steps.length !== 0) ||
        (path.state !== "no_path" && path.steps.length === 0) ||
        path.steps.length > content.scope.limits.maximum_depth
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          `Path ${path.path_key} is inconsistent with its state or depth limit.`,
        );
      for (const [index, step] of path.steps.entries()) {
        const relationship = relationships.get(step.relationship_key);
        if (
          step.position !== index + 1 ||
          relationship === undefined ||
          !nodes.has(step.from_node_key) ||
          !nodes.has(step.to_node_key)
        )
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Path ${path.path_key} has an invalid ordered step.`,
          );
        const forward =
          relationship.source_node_key === step.from_node_key &&
          relationship.target_node_key === step.to_node_key;
        const reverse =
          relationship.source_node_key === step.to_node_key &&
          relationship.target_node_key === step.from_node_key;
        if (
          (step.traversal_direction === "outgoing" && !forward) ||
          (step.traversal_direction === "incoming" && !reverse)
        )
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Path ${path.path_key} reverses an endpoint without naming incoming traversal.`,
          );
      }
    }

    if (!destinations.has(content.task.return_destination_key))
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The exact return destination is unavailable.",
      );
    if (content.selection.state === "selected") {
      const selected =
        content.selection.selection_kind === "node"
          ? nodes
          : content.selection.selection_kind === "relationship"
            ? relationships
            : paths;
      if (content.selection.selected_keys.some((key) => !selected.has(key)))
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          "The selection does not resolve within the represented membership.",
        );
    }
    for (const action of content.actions) {
      if (action.consequence !== consequenceByAction[action.action_kind])
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has an incompatible consequence.`,
        );
      if (action.target_keys.some((key) => !memberKeys.has(key)))
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has a target outside the represented membership.`,
        );
      if (
        action.availability.state === "available" &&
        action.availability.destination_key !== undefined &&
        !destinations.has(action.availability.destination_key)
      )
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has an unavailable semantic destination.`,
        );
      if (
        historical &&
        (action.action_kind === "prepare_correction" ||
          action.action_kind === "preview_work")
      )
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          "Historical focused graph positions cannot prepare current correction or Work actions.",
        );
    }

    return {
      state: "resolved",
      definition_family: definition.definition_family,
      view: structuredClone(view),
    };
  }
}
