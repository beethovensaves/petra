import type {
  FocusedGraphNode,
  FocusedGraphPath,
  FocusedGraphRegisteredAction,
  FocusedGraphRelationship,
  FocusedGraphSemanticDestination,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
} from "@petra/contracts";

export type PetraFocusedGraphReadView =
  PetraFocusedGraphView | PetraFocusedGraphViewV11;

export class FocusedGraphRegionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FocusedGraphRegionError";
  }
}

export type FocusedGraphSelectedMember =
  | { selectionKind: "node"; member: FocusedGraphNode }
  | {
      selectionKind: "relationship";
      member: FocusedGraphRelationship;
    }
  | { selectionKind: "path"; member: FocusedGraphPath };

export type FocusedGraphEvidenceRow = {
  relationship: FocusedGraphRelationship;
  source: FocusedGraphNode;
  target: FocusedGraphNode;
  paths: readonly FocusedGraphPath[];
  destinations: readonly FocusedGraphSemanticDestination[];
  actions: readonly FocusedGraphRegisteredAction[];
};

export type FocusedGraphResolvedPathStep = {
  step: FocusedGraphPath["steps"][number];
  source: FocusedGraphNode;
  relationship: FocusedGraphRelationship;
  target: FocusedGraphNode;
};

export type FocusedGraphResolvedPath = {
  path: FocusedGraphPath;
  steps: readonly FocusedGraphResolvedPathStep[];
};

export type FocusedGraphDetailTarget = {
  target: FocusedGraphNode | FocusedGraphRelationship;
  destinations: readonly FocusedGraphSemanticDestination[];
};

/**
 * Renderer-neutral inputs for the frozen graph regions. Every semantic value is
 * an exact member of the compatible petra.focused-graph-view@1.0.0 or additive
 * @1.1.0 contract. A renderer may add local geometry around these values, but
 * this model supplies no position or domain mutation API from which authority
 * could be inferred.
 */
export type FocusedGraphRegions = {
  contract: {
    schemaName: PetraFocusedGraphView["schema_name"];
    schemaVersion: PetraFocusedGraphReadView["schema_version"];
    projectId: PetraFocusedGraphView["project_id"];
    contentHash: PetraFocusedGraphView["content_hash"];
    readAt: PetraFocusedGraphView["read_at"];
  };
  orientation: {
    task: PetraFocusedGraphView["content"]["task"];
    profile: PetraFocusedGraphView["content"]["profile"];
    requestedSnapshot: PetraFocusedGraphView["content"]["requested_snapshot"];
    representedSnapshot: PetraFocusedGraphView["content"]["represented_snapshot"];
    semanticLayer: PetraFocusedGraphView["content"]["semantic_layer"];
    temporalPosition: PetraFocusedGraphView["content"]["temporal_position"];
    projectionPosition: PetraFocusedGraphView["content"]["projection_position"];
  };
  authority: {
    semanticLayer: PetraFocusedGraphView["content"]["semantic_layer"];
    requestedSnapshot: PetraFocusedGraphView["content"]["requested_snapshot"];
    representedSnapshot: PetraFocusedGraphView["content"]["represented_snapshot"];
    temporalPosition: PetraFocusedGraphView["content"]["temporal_position"];
    projectionPosition: PetraFocusedGraphView["content"]["projection_position"];
    boundary: PetraFocusedGraphView["content"]["authority_boundary"];
  };
  graph: {
    scope: PetraFocusedGraphView["content"]["scope"];
    nodes: readonly FocusedGraphNode[];
    relationships: readonly FocusedGraphRelationship[];
    paths: readonly FocusedGraphPath[];
    resolvedPaths: readonly FocusedGraphResolvedPath[];
    selection: PetraFocusedGraphView["content"]["selection"];
    limitations: PetraFocusedGraphView["content"]["limitations"];
  };
  textualPeer: {
    scope: PetraFocusedGraphView["content"]["scope"];
    nodes: readonly FocusedGraphNode[];
    relationships: readonly FocusedGraphRelationship[];
    paths: readonly FocusedGraphPath[];
    resolvedPaths: readonly FocusedGraphResolvedPath[];
    selection: PetraFocusedGraphView["content"]["selection"];
    destinations: readonly FocusedGraphSemanticDestination[];
    actions: readonly FocusedGraphRegisteredAction[];
    limitations: PetraFocusedGraphView["content"]["limitations"];
  };
  evidenceMatrix: {
    rows: readonly FocusedGraphEvidenceRow[];
    omissions: PetraFocusedGraphView["content"]["scope"]["omissions"];
    coverage: PetraFocusedGraphView["content"]["scope"]["coverage"];
    limitations: PetraFocusedGraphView["content"]["limitations"];
  };
  details: {
    selection: PetraFocusedGraphView["content"]["selection"];
    selectedMembers: readonly FocusedGraphSelectedMember[];
    nodeTargets: ReadonlyMap<string, FocusedGraphDetailTarget>;
    relationshipTargets: ReadonlyMap<string, FocusedGraphDetailTarget>;
  };
  origin: PetraFocusedGraphView["content"]["task"]["origin"];
  returnRegion: {
    destination: FocusedGraphSemanticDestination;
    action: FocusedGraphRegisteredAction | undefined;
  };
  destinations: ReadonlyMap<string, FocusedGraphSemanticDestination>;
  actions: readonly FocusedGraphRegisteredAction[];
};

const exactMap = <Value>(
  values: readonly Value[],
  keyOf: (value: Value) => string,
  label: string,
): Map<string, Value> => {
  const result = new Map<string, Value>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key)) {
      throw new FocusedGraphRegionError(`${label} ${key} is ambiguous.`);
    }
    result.set(key, value);
  }
  return result;
};

const requireMember = <Value>(
  members: ReadonlyMap<string, Value>,
  key: string,
  label: string,
): Value => {
  const member = members.get(key);
  if (member === undefined) {
    throw new FocusedGraphRegionError(`${label} ${key} is unavailable.`);
  }
  return member;
};

const exactDestinations = (
  keys: readonly string[],
  destinations: ReadonlyMap<string, FocusedGraphSemanticDestination>,
): FocusedGraphSemanticDestination[] =>
  keys.map((key) => requireMember(destinations, key, "Destination"));

/**
 * Adapts one already resolved focused-graph contract into the frozen Graph,
 * textual-path/evidence-matrix, Details, origin, and return regions. The
 * adapter is a pure consistency boundary: it performs no query, navigation,
 * renderer layout, domain command, or authority calculation.
 */
export const focusedGraphRegionsFromView = (
  view: PetraFocusedGraphReadView,
): FocusedGraphRegions => {
  if (
    view.schema_name !== "petra.focused-graph-view" ||
    (view.schema_version !== "1.0.0" && view.schema_version !== "1.1.0")
  ) {
    throw new FocusedGraphRegionError(
      "The focused graph region adapter requires a compatible petra.focused-graph-view contract.",
    );
  }

  const content = view.content;
  const nodes = exactMap(content.nodes, (node) => node.node_key, "Node");
  const relationships = exactMap(
    content.relationships,
    (relationship) => relationship.relationship_key,
    "Relationship",
  );
  const paths = exactMap(content.paths, (path) => path.path_key, "Path");
  const destinations = exactMap(
    content.destinations,
    (destination) => destination.destination_key,
    "Destination",
  );
  const actions = exactMap(
    content.actions,
    (action) => action.action_key,
    "Action",
  );

  if (
    !content.scope.included_layers.includes(content.semantic_layer) ||
    content.nodes.length > content.scope.limits.maximum_nodes ||
    content.relationships.length > content.scope.limits.maximum_relationships ||
    content.paths.length > content.scope.limits.maximum_paths
  ) {
    throw new FocusedGraphRegionError(
      "The focused graph membership is outside its exact finite scope.",
    );
  }

  const evidenceRows = content.relationships.map((relationship) => {
    const source = requireMember(
      nodes,
      relationship.source_node_key,
      "Relationship source node",
    );
    const target = requireMember(
      nodes,
      relationship.target_node_key,
      "Relationship target node",
    );
    const relationshipDestinations = exactDestinations(
      relationship.destination_keys,
      destinations,
    );
    return {
      relationship,
      source,
      target,
      paths: content.paths.filter((path) =>
        path.steps.some(
          (step) => step.relationship_key === relationship.relationship_key,
        ),
      ),
      destinations: relationshipDestinations,
      actions: content.actions.filter((action) =>
        action.target_keys.includes(relationship.relationship_key),
      ),
    };
  });

  for (const node of content.nodes) {
    exactDestinations(node.destination_keys, destinations);
  }
  const resolvedPaths = content.paths.map((path) => {
    if (path.steps.length > content.scope.limits.maximum_depth) {
      throw new FocusedGraphRegionError(
        `Path ${path.path_key} exceeds the exact finite depth limit.`,
      );
    }
    const steps = path.steps.map((step, index) => {
      if (step.position !== index + 1) {
        throw new FocusedGraphRegionError(
          `Path ${path.path_key} has an inconsistent step position.`,
        );
      }
      return {
        step,
        source: requireMember(nodes, step.from_node_key, "Path source node"),
        relationship: requireMember(
          relationships,
          step.relationship_key,
          "Path relationship",
        ),
        target: requireMember(nodes, step.to_node_key, "Path target node"),
      };
    });
    return { path, steps };
  });

  const memberKeys = new Set([
    ...nodes.keys(),
    ...relationships.keys(),
    ...paths.keys(),
  ]);
  for (const action of actions.values()) {
    for (const targetKey of action.target_keys) {
      if (!memberKeys.has(targetKey)) {
        throw new FocusedGraphRegionError(
          `Action target ${targetKey} is outside the represented membership.`,
        );
      }
    }
    if (
      action.availability.state === "available" &&
      action.availability.destination_key !== undefined
    ) {
      requireMember(
        destinations,
        action.availability.destination_key,
        "Action destination",
      );
    }
  }

  const selectedMembers: FocusedGraphSelectedMember[] = [];
  if (content.selection.state === "selected") {
    for (const key of content.selection.selected_keys) {
      if (content.selection.selection_kind === "node") {
        selectedMembers.push({
          selectionKind: "node",
          member: requireMember(nodes, key, "Selected node"),
        });
      } else if (content.selection.selection_kind === "relationship") {
        selectedMembers.push({
          selectionKind: "relationship",
          member: requireMember(relationships, key, "Selected relationship"),
        });
      } else {
        selectedMembers.push({
          selectionKind: "path",
          member: requireMember(paths, key, "Selected path"),
        });
      }
    }
  }

  const nodeTargets = new Map<string, FocusedGraphDetailTarget>();
  for (const node of content.nodes) {
    nodeTargets.set(node.node_key, {
      target: node,
      destinations: exactDestinations(node.destination_keys, destinations),
    });
  }
  const relationshipTargets = new Map<string, FocusedGraphDetailTarget>();
  for (const relationship of content.relationships) {
    relationshipTargets.set(relationship.relationship_key, {
      target: relationship,
      destinations: exactDestinations(
        relationship.destination_keys,
        destinations,
      ),
    });
  }

  const returnDestination = requireMember(
    destinations,
    content.task.return_destination_key,
    "Return destination",
  );
  const returnAction = content.actions.find(
    (action) =>
      action.action_kind === "return_to_origin" &&
      action.availability.state === "available" &&
      action.availability.destination_key ===
        content.task.return_destination_key,
  );

  return {
    contract: {
      schemaName: view.schema_name,
      schemaVersion: view.schema_version,
      projectId: view.project_id,
      contentHash: view.content_hash,
      readAt: view.read_at,
    },
    orientation: {
      task: content.task,
      profile: content.profile,
      requestedSnapshot: content.requested_snapshot,
      representedSnapshot: content.represented_snapshot,
      semanticLayer: content.semantic_layer,
      temporalPosition: content.temporal_position,
      projectionPosition: content.projection_position,
    },
    authority: {
      semanticLayer: content.semantic_layer,
      requestedSnapshot: content.requested_snapshot,
      representedSnapshot: content.represented_snapshot,
      temporalPosition: content.temporal_position,
      projectionPosition: content.projection_position,
      boundary: content.authority_boundary,
    },
    graph: {
      scope: content.scope,
      nodes: content.nodes,
      relationships: content.relationships,
      paths: content.paths,
      resolvedPaths,
      selection: content.selection,
      limitations: content.limitations,
    },
    textualPeer: {
      scope: content.scope,
      nodes: content.nodes,
      relationships: content.relationships,
      paths: content.paths,
      resolvedPaths,
      selection: content.selection,
      destinations: content.destinations,
      actions: content.actions,
      limitations: content.limitations,
    },
    evidenceMatrix: {
      rows: evidenceRows,
      omissions: content.scope.omissions,
      coverage: content.scope.coverage,
      limitations: content.limitations,
    },
    details: {
      selection: content.selection,
      selectedMembers,
      nodeTargets,
      relationshipTargets,
    },
    origin: content.task.origin,
    returnRegion: {
      destination: returnDestination,
      action: returnAction,
    },
    destinations,
    actions: content.actions,
  };
};
