import type {
  PetraGraphPresentationContext,
  PetraProjectExaminationScene,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";

export type GraphPresentationParameters = Omit<
  PetraGraphPresentationContext["content"]["parameters"],
  "selected_keys" | "excluded_kinds"
> & { selected_keys: string[]; excluded_kinds: string[] };
export interface GraphPresentationBinding {
  parameters: GraphPresentationParameters;
  content_hash: string;
  peer_content_hash: string;
}
export type GraphPresentationSource =
  PetraProjectSemanticGraphView | PetraProjectExaminationScene;
type Content = PetraGraphPresentationContext["content"];
export const cycleGraphColumn = (kind: string): number =>
  kind === "petra.hypothesis"
    ? 1
    : kind === "petra.hypothesis-assessment"
      ? 2
      : kind === "petra.posture-decision"
        ? 3
        : kind === "petra.cycle-disposition"
          ? 4
          : 0;

/** The renderer and the server construct the same presentation. No labels,
 * private source bytes, or client-supplied coordinates enter this contract. */
export const graphPresentationContent = (
  source: GraphPresentationSource,
  parameters: GraphPresentationParameters,
): Omit<Content, "peer_content_hash"> => {
  const cycles = source.schema_name === "petra.project-examination-scene";
  if (
    parameters.semantic_content_hash !== source.content_hash ||
    parameters.renderer !==
      (cycles ? "examination_cycles" : "native_working") ||
    !["graph", "text"].includes(parameters.mode) ||
    new Set(parameters.selected_keys).size !==
      parameters.selected_keys.length ||
    new Set(parameters.excluded_kinds).size !== parameters.excluded_kinds.length
  )
    throw new Error(
      "The shared graph parameters do not bind this exact semantic result.",
    );
  const allNodes = source.content.nodes.map((node) => ({
    key: node.key,
    record_ref: node.record_ref,
    kind: "kind" in node ? node.kind : node.semantic_key,
    state: "state" in node ? node.state : node.material_state,
  }));
  const kinds = new Set(allNodes.map((node) => node.kind));
  if (parameters.excluded_kinds.some((kind) => !kinds.has(kind)))
    throw new Error("A graph filter references an unrepresented kind.");
  const represented = allNodes.filter(
    (node) => !parameters.excluded_kinds.includes(node.kind),
  );
  const keys = new Set(represented.map((node) => node.key));
  if (parameters.selected_keys.some((key) => !keys.has(key)))
    throw new Error("The shared selection is outside the visible graph.");
  const nodes = represented.map((node, index) => {
    const column = cycleGraphColumn(node.kind);
    const row = represented
      .filter((item) => cycleGraphColumn(item.kind) === column)
      .findIndex((item) => item.key === node.key);
    return {
      ...node,
      position: cycles
        ? { x: 95 + column * 185, y: 60 + row * 90 }
        : { x: 110 + (index % 4) * 220, y: 70 + Math.floor(index / 4) * 130 },
    };
  });
  const relationships = source.content.relationships
    .filter((edge) => keys.has(edge.subject_key) && keys.has(edge.object_key))
    .map(({ key, subject_key, object_key, predicate }) => ({
      key,
      subject_key,
      object_key,
      predicate,
    }));
  const rows = cycles
    ? Math.max(
        1,
        ...[0, 1, 2, 3, 4].map(
          (column) =>
            nodes.filter((node) => cycleGraphColumn(node.kind) === column)
              .length,
        ),
      )
    : 0;
  return {
    project_id: source.project_id,
    graph_content_hash: cycles
      ? source.content.graph_content_hash
      : source.content_hash,
    parameters: structuredClone(parameters) as Content["parameters"],
    layout_version: "petra.graph-layout@1.0.0",
    viewport: {
      width: cycles ? 940 : 880,
      height: cycles
        ? Math.max(240, rows * 90 + 50)
        : Math.max(280, Math.ceil(nodes.length / 4) * 130),
    },
    nodes,
    relationships,
    omitted_nodes:
      (cycles
        ? source.content.omitted_nodes
        : source.content.omitted_candidates) +
      allNodes.length -
      nodes.length,
    omitted_relationships:
      source.content.omitted_relationships +
      source.content.relationships.length -
      relationships.length,
    has_more_history: cycles ? source.content.has_more_history : false,
    legend: [...new Set(nodes.map((node) => node.kind))].sort().map((kind) => ({
      kind,
      meaning: `Registered ${kind} records. Placement and adjacency confer no evidence, priority, or authority.`,
    })),
    authority: "presentation_only",
  };
};

export const graphPresentationPeer = (
  content: Omit<Content, "peer_content_hash">,
): unknown => ({
  project_id: content.project_id,
  graph_content_hash: content.graph_content_hash,
  parameters: content.parameters,
  nodes: content.nodes.map(({ key, record_ref, kind, state }) => ({
    key,
    record_ref,
    kind,
    state,
  })),
  relationships: content.relationships,
  omitted_nodes: content.omitted_nodes,
  omitted_relationships: content.omitted_relationships,
  has_more_history: content.has_more_history,
  legend: content.legend,
});

export const parseGraphPresentationBinding = (
  value: unknown,
): GraphPresentationBinding => {
  const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const hash = (v: unknown): v is string =>
    typeof v === "string" && /^sha256:[0-9a-f]{64}$/u.test(v);
  const keys = (v: unknown, max: number): v is string[] =>
    Array.isArray(v) &&
    v.length <= max &&
    v.every(
      (key) => typeof key === "string" && key.length > 0 && key.length <= 200,
    ) &&
    new Set(v).size === v.length;
  if (
    !object(value) ||
    Object.keys(value).sort().join(",") !==
      "content_hash,parameters,peer_content_hash" ||
    !hash(value.content_hash) ||
    !hash(value.peer_content_hash) ||
    !object(value.parameters)
  )
    throw new Error("The bounded shared graph binding is malformed.");
  const p = value.parameters;
  if (
    Object.keys(p).sort().join(",") !==
      "excluded_kinds,mode,renderer,selected_keys,semantic_content_hash" ||
    !["native_working", "examination_cycles"].includes(p.renderer as string) ||
    !["graph", "text"].includes(p.mode as string) ||
    !hash(p.semantic_content_hash) ||
    !keys(p.selected_keys, 8) ||
    !keys(p.excluded_kinds, 20)
  )
    throw new Error("The bounded shared graph parameters are malformed.");
  return structuredClone(value) as unknown as GraphPresentationBinding;
};
