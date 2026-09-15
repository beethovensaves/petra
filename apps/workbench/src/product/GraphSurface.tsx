import { useMemo, useState } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import type {
  GraphEdgeRecord,
  GraphLayer,
  GraphNodeRecord,
  GraphQuestion,
  GraphViewMode,
  ProjectRecord,
} from "./model.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";
import {
  FocusedGraphOrientationSurface,
  isFocusedGraphRouteData,
  type FocusedGraphRouteData,
} from "./focused-graph-entry.js";

type GraphLayout = "neighborhood" | "dependency";

const FALLBACK_LAYER_LABELS: Record<GraphLayer, string> = {
  current: "Current",
  working: "Working changes",
  historical: "Historical",
};

const layerLabel = (graph: GraphQuestion, layer: GraphLayer): string =>
  graph.layerLabels?.[layer] ?? FALLBACK_LAYER_LABELS[layer];

const layerPositionLabel = (
  graph: GraphQuestion,
  layer: GraphLayer,
): string => {
  const conciseLabel = graph.positionLabels?.[layer];
  if (conciseLabel !== undefined) return conciseLabel;
  if (layer === "working") return graph.workingRevision;
  if (layer === "historical") return graph.historicalSnapshot;
  return graph.representedSnapshot;
};

const layerAvailable = (graph: GraphQuestion, layer: GraphLayer): boolean =>
  graph.layerAvailability?.[layer].available ?? true;

const nodePosition = (
  node: GraphNodeRecord,
  visibleNodes: GraphNodeRecord[],
  layout: GraphLayout,
): { x: number; y: number } => {
  if (layout === "neighborhood") return node.position;
  if (node.id === visibleNodes[0]?.id) return { x: 50, y: 12 };
  const index = Math.max(0, visibleNodes.indexOf(node) - 1);
  return {
    x: index % 2 === 0 ? 27 : 73,
    y: 37 + Math.floor(index / 2) * 28,
  };
};

const GraphStatus = ({
  graph,
  layer,
}: {
  graph: GraphQuestion;
  layer: GraphLayer;
}) => (
  <span className="graph-state" data-layer={layer}>
    <span aria-hidden="true">
      {layer === "current" ? "C" : layer === "working" ? "W" : "H"}
    </span>
    {layerLabel(graph, layer)}
  </span>
);

const buildSceneDescription = (
  graph: GraphQuestion,
  layer: GraphLayer,
  nodes: GraphNodeRecord[],
  edges: GraphEdgeRecord[],
): string => {
  const suppliedCounts = graph.layerCounts?.[layer];
  const objectCount = suppliedCounts?.objects ?? nodes.length;
  const relationshipCount = suppliedCounts?.relationships ?? edges.length;
  const relationships = edges
    .map((edge) => {
      const from =
        nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
      const to = nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
      return `${from} ${edge.label} ${to}`;
    })
    .join("; ");

  const semanticCounts = (["current", "working", "historical"] as const)
    .map((semanticLayer) => ({
      semanticLayer,
      count:
        suppliedCounts?.objectLayers?.[semanticLayer] ??
        nodes.filter((node) => (node.semanticLayer ?? layer) === semanticLayer)
          .length,
    }))
    .filter(({ count }) => count > 0)
    .map(
      ({ semanticLayer, count }) =>
        `${count} ${layerLabel(graph, semanticLayer)} ${count === 1 ? "object" : "objects"}`,
    )
    .join("; ");

  return `${layerLabel(graph, layer)} at ${layerPositionLabel(graph, layer)} contains ${objectCount} objects and ${relationshipCount} recorded relationships${semanticCounts.length === 0 ? "" : ` (${semanticCounts})`}. ${relationships}. Position groups the answer for inspection and does not encode authority, strength, or causal order.`;
};

export const GraphSurface = ({
  project,
  graph,
  initialLayer = "current",
  initialSelectedNodeId,
  initialViewMode = "graph",
}: {
  project: ProjectRecord;
  graph: GraphQuestion;
  initialLayer?: GraphLayer;
  initialSelectedNodeId?: string | undefined;
  initialViewMode?: GraphViewMode;
}): React.JSX.Element => {
  const [layer, setLayer] = useState<GraphLayer>(() =>
    layerAvailable(graph, initialLayer) ? initialLayer : "current",
  );
  const [viewMode, setViewMode] = useState<GraphViewMode>(initialViewMode);
  const [layout, setLayout] = useState<GraphLayout>("neighborhood");
  const [history, setHistory] = useState<string[]>([
    initialSelectedNodeId ?? graph.focusNodeId,
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const selectedNodeId = history[historyIndex] ?? graph.focusNodeId;

  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => node.layers.includes(layer)),
    [graph.nodes, layer],
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );
  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) =>
          edge.layers.includes(layer) &&
          visibleNodeIds.has(edge.from) &&
          visibleNodeIds.has(edge.to),
      ),
    [graph.edges, layer, visibleNodeIds],
  );
  const selectedNode =
    visibleNodes.find((node) => node.id === selectedNodeId) ??
    visibleNodes.find((node) => node.id === graph.focusNodeId) ??
    visibleNodes[0];
  const sceneDescription = buildSceneDescription(
    graph,
    layer,
    visibleNodes,
    visibleEdges,
  );
  const visibleTextNodes = graph.textualPeer?.nodes.filter(
    (node) =>
      node.layer === layer || (layer === "working" && node.layer === "current"),
  );
  const visibleTextRelationships = graph.textualPeer?.relationships.filter(
    (relationship) =>
      relationship.layer === layer ||
      (layer === "working" && relationship.layer === "current"),
  );

  const selectNode = (nodeId: string): void => {
    if (nodeId === selectedNode?.id) return;
    setHistory((current) => [...current.slice(0, historyIndex + 1), nodeId]);
    setHistoryIndex((current) => current + 1);
  };

  const selectLayer = (nextLayer: GraphLayer): void => {
    if (!layerAvailable(graph, nextLayer)) return;
    setLayer(nextLayer);
    const currentSelection = graph.nodes.find(
      (node) => node.id === selectedNodeId,
    );
    if (currentSelection?.layers.includes(nextLayer) !== true) {
      setHistory([graph.focusNodeId]);
      setHistoryIndex(0);
    }
  };

  return (
    <main className="reference-surface graph-surface" id="reference-main">
      <header className="graph-heading">
        <div>
          <p className="reference-eyebrow">Graph · relationship question</p>
          <h1>{graph.question}</h1>
          <p className="reference-lede">{graph.scope}</p>
        </div>
        <GraphStatus graph={graph} layer={layer} />
      </header>

      {graph.projectionState !== "current" ? (
        <section
          className="reference-notice"
          aria-labelledby="graph-freshness-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            ↻
          </span>
          <div>
            <h2 id="graph-freshness-title">
              {graph.projectionState === "catching_up"
                ? "Newer authoritative state available"
                : "Graph projection unavailable"}
            </h2>
            <p>{graph.projectionDetail}</p>
          </div>
        </section>
      ) : null}

      {graph.recommendation === undefined ? null : (
        <section
          className="graph-recommendation"
          aria-labelledby="graph-recommendation-title"
        >
          <span aria-hidden="true">↳</span>
          <div>
            <p className="reference-panel-kicker">Contextual recommendation</p>
            <h2 id="graph-recommendation-title">
              {graph.recommendation.label}
            </h2>
            <p>{graph.recommendation.rationale}</p>
            <p>{graph.recommendation.consequence}</p>
          </div>
          <div className="graph-recommendation__actions">
            {layer === "working" ? (
              <>
                <Link
                  className="reference-text-link"
                  to={`/projects/${project.id}/review/review-service-link`}
                >
                  Open candidate Review
                </Link>
                <Link
                  className="reference-text-link"
                  to={`/projects/${project.id}/work/work-process-maintenance`}
                >
                  Open related Work
                </Link>
              </>
            ) : (
              <PetraButton
                variant="secondary"
                onClick={() => selectLayer("working")}
              >
                Show recommended branch
              </PetraButton>
            )}
          </div>
        </section>
      )}

      <section className="graph-task" aria-labelledby="graph-result-title">
        <header className="graph-task__header">
          <div>
            <p className="reference-panel-kicker">Bounded result</p>
            <h2 id="graph-result-title">Recorded relationship view</h2>
          </div>
          <span>{layerPositionLabel(graph, layer)}</span>
        </header>

        <div className="graph-controls">
          <PetraButtonGroup label="Semantic layer">
            {(Object.keys(FALLBACK_LAYER_LABELS) as GraphLayer[]).map(
              (layerId) => (
                <PetraButton
                  key={layerId}
                  density="compact"
                  variant={layer === layerId ? "secondary" : "quiet"}
                  aria-pressed={layer === layerId}
                  aria-disabled={!layerAvailable(graph, layerId)}
                  aria-label={
                    layerAvailable(graph, layerId)
                      ? layerLabel(graph, layerId)
                      : `${layerLabel(graph, layerId)}: ${graph.layerAvailability?.[layerId].label ?? "Unavailable"}`
                  }
                  title={
                    layerAvailable(graph, layerId)
                      ? undefined
                      : graph.layerAvailability?.[layerId].label
                  }
                  onClick={() => selectLayer(layerId)}
                >
                  {layerLabel(graph, layerId)}
                </PetraButton>
              ),
            )}
          </PetraButtonGroup>
          <PetraButtonGroup label="Representation">
            {(["graph", "text"] as GraphViewMode[]).map((mode) => (
              <PetraButton
                key={mode}
                density="compact"
                variant={viewMode === mode ? "secondary" : "quiet"}
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
              >
                {mode === "graph" ? "Graph" : "Text"}
              </PetraButton>
            ))}
          </PetraButtonGroup>
          <PetraButtonGroup label="Graph layout">
            <PetraButton
              density="compact"
              variant={layout === "neighborhood" ? "secondary" : "quiet"}
              aria-pressed={layout === "neighborhood"}
              onClick={() => setLayout("neighborhood")}
            >
              Neighborhood
            </PetraButton>
            <PetraButton
              density="compact"
              variant={layout === "dependency" ? "secondary" : "quiet"}
              aria-pressed={layout === "dependency"}
              onClick={() => setLayout("dependency")}
            >
              Dependency
            </PetraButton>
          </PetraButtonGroup>
          <div className="graph-history" aria-label="Graph selection history">
            <PetraButton
              density="compact"
              variant="quiet"
              aria-disabled={historyIndex === 0}
              onClick={() => {
                if (historyIndex > 0) setHistoryIndex((current) => current - 1);
              }}
            >
              Back in graph
            </PetraButton>
            <PetraButton
              density="compact"
              variant="quiet"
              aria-disabled={historyIndex >= history.length - 1}
              onClick={() => {
                if (historyIndex < history.length - 1) {
                  setHistoryIndex((current) => current + 1);
                }
              }}
            >
              Forward
            </PetraButton>
          </div>
        </div>

        <details className="graph-scene" open>
          <summary>What this graph represents</summary>
          <p>{sceneDescription}</p>
        </details>

        <div className="graph-workspace" data-view={viewMode}>
          <div className="graph-representation">
            {viewMode === "graph" ? (
              <div
                className="graph-canvas"
                data-layout={layout}
                aria-label={`${layerLabel(graph, layer)} visual graph. Use the node controls to inspect an object; the complete relationship text follows the canvas.`}
              >
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="reference-graph-arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  {visibleEdges.map((edge) => {
                    const from = visibleNodes.find(
                      (node) => node.id === edge.from,
                    );
                    const to = visibleNodes.find((node) => node.id === edge.to);
                    if (from === undefined || to === undefined) return null;
                    const start = nodePosition(from, visibleNodes, layout);
                    const end = nodePosition(to, visibleNodes, layout);
                    return (
                      <g
                        key={edge.id}
                        className={`graph-edge graph-edge--${edge.tone}`}
                        data-layer={edge.semanticLayer ?? layer}
                        data-endpoint-posture={edge.endpointPosture}
                      >
                        <line
                          x1={start.x}
                          y1={start.y}
                          x2={end.x}
                          y2={end.y}
                          markerEnd="url(#reference-graph-arrow)"
                        />
                        <text
                          x={(start.x + end.x) / 2}
                          y={(start.y + end.y) / 2 - 1}
                        >
                          {edge.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {visibleNodes.map((node) => {
                  const position = nodePosition(node, visibleNodes, layout);
                  return (
                    <button
                      key={node.id}
                      className="graph-node"
                      data-kind={node.kind}
                      data-layer={node.semanticLayer ?? layer}
                      data-endpoint-posture={node.endpointPosture}
                      data-selected={selectedNode?.id === node.id || undefined}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      type="button"
                      onClick={() => selectNode(node.id)}
                    >
                      <span>{node.kind}</span>
                      <strong>{node.label}</strong>
                      {node.endpointPosture === undefined ? null : (
                        <small>{node.endpointPosture}</small>
                      )}
                    </button>
                  );
                })}
                <ol className="visually-hidden">
                  {visibleEdges.map((edge) => {
                    const from = visibleNodes.find(
                      (node) => node.id === edge.from,
                    );
                    const to = visibleNodes.find((node) => node.id === edge.to);
                    return (
                      <li key={edge.id}>
                        {layerLabel(graph, edge.semanticLayer ?? layer)}.{" "}
                        {from?.label} {edge.label} {to?.label}. Direction:{" "}
                        {edge.direction ?? "outgoing"}. {edge.summary}
                        {edge.meaning === undefined
                          ? ""
                          : ` Meaning: ${edge.meaning}`}
                        {edge.scope === undefined
                          ? ""
                          : ` Scope: ${edge.scope}`}
                        {` Basis: ${edge.basis}`}
                        {edge.endpointPosture === undefined
                          ? ""
                          : ` Endpoint: ${edge.endpointPosture}`}
                        {edge.validationSummary === undefined
                          ? ""
                          : ` Validation: ${edge.validationSummary}`}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <div
                className="graph-text-view"
                aria-labelledby="graph-text-title"
              >
                <h3 id="graph-text-title">
                  {graph.textualPeer?.title ??
                    "Text view of the complete result"}
                </h3>
                {graph.textualPeer === undefined ? (
                  <ol>
                    {visibleEdges.map((edge) => {
                      const from = visibleNodes.find(
                        (node) => node.id === edge.from,
                      );
                      const to = visibleNodes.find(
                        (node) => node.id === edge.to,
                      );
                      return (
                        <li key={edge.id} data-tone={edge.tone}>
                          <button
                            type="button"
                            onClick={() => selectNode(edge.from)}
                          >
                            {from?.label}
                          </button>
                          <span>{edge.label}</span>
                          <button
                            type="button"
                            onClick={() => selectNode(edge.to)}
                          >
                            {to?.label}
                          </button>
                          <p>{edge.summary}</p>
                          <small>Basis: {edge.basis}</small>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <>
                    <p className="graph-text-view__scope">
                      {graph.textualPeer.scope}
                    </p>
                    <section aria-labelledby="graph-text-nodes-title">
                      <h4 id="graph-text-nodes-title">Objects</h4>
                      <ol className="graph-text-view__nodes">
                        {(visibleTextNodes ?? []).map((node) => (
                          <li key={node.id} data-layer={node.layer}>
                            <div className="graph-text-view__node-heading">
                              <button
                                type="button"
                                onClick={() => selectNode(node.id)}
                              >
                                {node.label}
                              </button>
                              <span>
                                {node.kind} · {layerLabel(graph, node.layer)}
                              </span>
                            </div>
                            <p>{node.summary}</p>
                            <small>Basis: {node.basis}</small>
                            {node.endpointPosture === undefined ? null : (
                              <small>Endpoint: {node.endpointPosture}</small>
                            )}
                            {node.validationSummary === undefined ? null : (
                              <small>
                                Validation: {node.validationSummary}
                              </small>
                            )}
                          </li>
                        ))}
                      </ol>
                    </section>
                    <section aria-labelledby="graph-text-relationships-title">
                      <h4 id="graph-text-relationships-title">Relationships</h4>
                      <ol>
                        {(visibleTextRelationships ?? []).map(
                          (relationship) => (
                            <li
                              key={relationship.id}
                              data-tone={
                                relationship.layer === "working"
                                  ? "working"
                                  : "neutral"
                              }
                              data-layer={relationship.layer}
                            >
                              <button
                                type="button"
                                onClick={() => selectNode(relationship.from)}
                              >
                                {relationship.fromLabel}
                              </button>
                              <span>
                                {relationship.label} · {relationship.direction}
                              </span>
                              <button
                                type="button"
                                onClick={() => selectNode(relationship.to)}
                              >
                                {relationship.toLabel}
                              </button>
                              <p>{relationship.summary}</p>
                              <p>Meaning: {relationship.meaning}</p>
                              <p>Scope: {relationship.scope}</p>
                              <small>Basis: {relationship.basis}</small>
                              {relationship.endpointPosture ===
                              undefined ? null : (
                                <small>
                                  Endpoint: {relationship.endpointPosture}
                                </small>
                              )}
                              {relationship.validationSummary ===
                              undefined ? null : (
                                <small>
                                  Validation: {relationship.validationSummary}
                                </small>
                              )}
                            </li>
                          ),
                        )}
                      </ol>
                    </section>
                    <section
                      className="graph-text-view__omissions"
                      aria-labelledby="graph-text-omissions-title"
                    >
                      <h4 id="graph-text-omissions-title">Omissions</h4>
                      <ul>
                        {graph.textualPeer.omissions.map((omission) => (
                          <li key={omission}>{omission}</li>
                        ))}
                      </ul>
                    </section>
                  </>
                )}
              </div>
            )}
          </div>

          {selectedNode === undefined ? null : (
            <aside
              className="graph-details"
              id="graph-selection"
              tabIndex={-1}
              aria-labelledby="graph-details-title"
            >
              <div className="graph-details__heading">
                <div>
                  <p className="reference-panel-kicker">Selected object</p>
                  <h3 id="graph-details-title">Details</h3>
                </div>
                <span>{selectedNode.kind}</span>
              </div>
              <h4>{selectedNode.label}</h4>
              <p>{selectedNode.summary}</p>
              <dl>
                <div>
                  <dt>Identity</dt>
                  <dd>
                    <code>{selectedNode.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Basis</dt>
                  <dd>{selectedNode.basis}</dd>
                </div>
                <div>
                  <dt>Record layer</dt>
                  <dd>
                    {layerLabel(graph, selectedNode.semanticLayer ?? layer)}
                  </dd>
                </div>
                <div>
                  <dt>View position</dt>
                  <dd>{layerPositionLabel(graph, layer)}</dd>
                </div>
                {selectedNode.endpointPosture === undefined ? null : (
                  <div>
                    <dt>Working endpoint</dt>
                    <dd>{selectedNode.endpointPosture}</dd>
                  </div>
                )}
                {selectedNode.validationSummary === undefined ? null : (
                  <div>
                    <dt>Validation</dt>
                    <dd>{selectedNode.validationSummary}</dd>
                  </div>
                )}
              </dl>
              <div className="graph-details__actions">
                {selectedNode.sourceId === undefined ? null : (
                  <Link
                    className="reference-text-link"
                    to={`/projects/${project.id}/sources/${selectedNode.sourceId}?from=graph&graphLayer=${layer}&graphNodeId=${selectedNode.id}`}
                  >
                    Open exact source
                  </Link>
                )}
                {graph.recommendation !== undefined &&
                selectedNode.id === graph.recommendation.branchNodeId ? (
                  <Link
                    className="reference-text-link"
                    to={`/projects/${project.id}/review/review-service-link`}
                  >
                    Open candidate Review
                  </Link>
                ) : null}
                <PetraButton
                  variant="quiet"
                  density="compact"
                  onClick={() => selectNode(graph.focusNodeId)}
                >
                  Return to focus
                </PetraButton>
              </div>
            </aside>
          )}
        </div>

        <footer className="graph-scope">
          <div className="graph-scope__positions">
            <strong>Exact positions</strong>
            <dl>
              <div>
                <dt>Current authority</dt>
                <dd>{graph.authoritativeSnapshot}</dd>
              </div>
              <div>
                <dt>Graph projection</dt>
                <dd>{graph.representedSnapshot}</dd>
              </div>
              <div>
                <dt>Working snapshot and base</dt>
                <dd>{graph.workingRevision}</dd>
              </div>
            </dl>
          </div>
          <div className="graph-scope__result">
            <strong>Scope and omissions</strong>
            <p>{graph.completeness}</p>
            {graph.omissions === undefined ? null : (
              <ul>
                {graph.omissions.map((omission) => (
                  <li key={omission}>{omission}</li>
                ))}
              </ul>
            )}
            {graph.limitations === undefined ? null : (
              <>
                <strong>Limitations</strong>
                <ul>
                  {graph.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {graph.resultCounts === undefined ? null : (
            <div className="graph-scope__counts">
              <strong>Returned and excluded counts</strong>
              <dl>
                {graph.resultCounts.map((count) => (
                  <div key={count.label}>
                    <dt>{count.label}</dt>
                    <dd>{count.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div>
            <strong>Authority and visual meaning</strong>
            {graph.authorityBoundary === undefined ? null : (
              <p>{graph.authorityBoundary}</p>
            )}
            <p>
              Labels and arrows carry relationship meaning. Position and line
              length do not express confidence, importance, or authority.
            </p>
          </div>
        </footer>
      </section>

      <footer className="reference-reader-return">
        <p>
          The Graph is read-only. Selection and layout do not change Project
          state.
        </p>
        <Link
          className="reference-primary-link"
          to={`/projects/${project.id}/brief#attention-source-depth`}
        >
          Return to Brief
        </Link>
      </footer>
    </main>
  );
};

export const GraphRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const graph = useLoaderData<
    GraphQuestion | FocusedGraphRouteData | undefined
  >();
  const [searchParams] = useSearchParams();
  if (isFocusedGraphRouteData(graph)) {
    return <FocusedGraphOrientationSurface data={graph} />;
  }
  if (graph === undefined) {
    return (
      <main className="reference-surface" id="reference-main">
        <header className="reference-surface-heading">
          <div>
            <p className="reference-eyebrow">Graph · current Project</p>
            <h1>No relationship question is open</h1>
            <p className="reference-lede">
              Graph begins with a bounded relationship, path, provenance,
              comparison, impact, or time question.
            </p>
          </div>
        </header>
        <section
          className="reference-empty"
          aria-labelledby="graph-empty-title"
        >
          <PetraMark />
          <h2 id="graph-empty-title">No supported current path is available</h2>
          <p>
            {project.focus.value} has no exact current relationship path that
            this M1 graph reader can present. Petra did not substitute a
            whole-Project network or fixture.
          </p>
          <Link
            className="reference-text-link"
            to={`/projects/${project.id}/brief`}
          >
            Return to Brief
          </Link>
        </section>
      </main>
    );
  }
  const requestedLayer = searchParams.get("layer");
  const initialLayer: GraphLayer =
    (requestedLayer === "working" || requestedLayer === "historical") &&
    layerAvailable(graph, requestedLayer)
      ? requestedLayer
      : "current";
  const requestedNodeId = searchParams.get("selected");
  const initialSelectedNodeId = graph.nodes.find(
    (node) => node.id === requestedNodeId && node.layers.includes(initialLayer),
  )?.id;

  return (
    <GraphSurface
      project={project}
      graph={graph}
      initialLayer={initialLayer}
      initialSelectedNodeId={initialSelectedNodeId}
    />
  );
};
