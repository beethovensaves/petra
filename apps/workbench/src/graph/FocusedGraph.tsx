import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FoldIcon,
  HomeIcon,
  PinIcon,
  SyncIcon,
} from "@primer/octicons-react";
import type {
  Core,
  ElementDefinition,
  EventObjectNode,
  StylesheetJson,
} from "cytoscape";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PetraButton, PetraIconButton } from "../design-system/primitives.js";
import type {
  FocusedGraphEdgeViewModel,
  FocusedGraphLayout,
  FocusedGraphRelation,
  FocusedGraphViewModel,
} from "../shell/model.js";
import "./focused-graph.css";

const LAYOUT_LABELS: Record<FocusedGraphLayout, string> = {
  neighborhood: "Neighborhood",
  disagreement: "Disagreement",
  provenance: "Provenance",
};

const RELATION_LABELS: Record<FocusedGraphRelation, string> = {
  frames: "Frames",
  supports: "Supports",
  contradicts: "Contradicts",
  qualifies: "Qualifies",
  asserts: "Asserts",
  provenance_for: "Provenance for",
};

const KIND_LABELS = {
  research_question: "Research question",
  hypothesis: "Hypothesis",
  claim: "Claim",
  assertion: "Source-stated assertion",
  work_version: "Work version",
  source_span: "Exact source span",
} as const;

const getCanvasNodeLabel = (
  node: FocusedGraphViewModel["nodes"][number],
): string => {
  switch (node.object.kind) {
    case "assertion":
      return "Assertion";
    case "source_span":
      return "Source span";
    case "work_version":
      return "Paper version";
    default:
      return node.object.label;
  }
};

const layouts = Object.keys(LAYOUT_LABELS) as FocusedGraphLayout[];
const relations = Object.keys(RELATION_LABELS) as FocusedGraphRelation[];

const getCssColor = (
  styles: CSSStyleDeclaration,
  property: string,
  fallback: string,
): string => styles.getPropertyValue(property).trim() || fallback;

const makeGraphStyles = (container: HTMLElement): StylesheetJson => {
  const styles = getComputedStyle(container);
  const colors = {
    panel: getCssColor(styles, "--petra-surface-panel", "#fbfbfa"),
    canvas: getCssColor(styles, "--petra-surface-canvas", "#f4f5f5"),
    subtle: getCssColor(styles, "--petra-surface-subtle", "#f0f1f2"),
    selected: getCssColor(styles, "--petra-surface-selection", "#ddf4ff"),
    text: getCssColor(styles, "--petra-text-primary", "#25292e"),
    secondary: getCssColor(styles, "--petra-text-secondary", "#59636e"),
    border: getCssColor(styles, "--petra-border-strong", "#afb8c1"),
    action: getCssColor(styles, "--petra-action-primary", "#0969da"),
    information: getCssColor(styles, "--petra-tone-information", "#245b9e"),
    informationSoft: getCssColor(
      styles,
      "--petra-tone-information-soft",
      "#eaf0f8",
    ),
    hypothesis: getCssColor(styles, "--petra-tone-hypothesis", "#6f4a9e"),
    hypothesisSoft: getCssColor(
      styles,
      "--petra-tone-hypothesis-soft",
      "#f0ebf6",
    ),
    positive: getCssColor(styles, "--petra-tone-positive", "#157a59"),
    caution: getCssColor(styles, "--petra-tone-caution", "#9c570c"),
    danger: getCssColor(styles, "--petra-tone-danger", "#b83232"),
  };

  return [
    {
      selector: "node",
      style: {
        width: 124,
        height: 54,
        "background-color": colors.panel,
        "border-color": colors.border,
        "border-width": 1.5,
        color: colors.text,
        label: "data(label)",
        "font-family": "Petra Inter, Inter, sans-serif",
        "font-size": 13,
        "font-weight": 500,
        "text-halign": "center",
        "text-justification": "center",
        "text-margin-x": 0,
        "text-margin-y": 1,
        "text-valign": "center",
        "text-max-width": "104px",
        "text-wrap": "wrap",
      },
    },
    {
      selector: 'node[kind = "research_question"]',
      style: {
        shape: "round-rectangle",
        "background-color": colors.informationSoft,
        "border-color": colors.information,
        "border-width": 2,
      },
    },
    {
      selector: 'node[kind = "hypothesis"]',
      style: {
        shape: "hexagon",
        "background-color": colors.hypothesisSoft,
        "border-color": colors.hypothesis,
        "border-width": 2,
      },
    },
    {
      selector: 'node[kind = "source_span"]',
      style: {
        shape: "diamond",
        width: 88,
        height: 66,
        "background-color": colors.subtle,
      },
    },
    {
      selector: 'node[kind = "assertion"]',
      style: {
        shape: "round-tag",
        "background-color": colors.informationSoft,
        "border-color": colors.information,
      },
    },
    {
      selector: 'node[kind = "work_version"]',
      style: {
        shape: "barrel",
        "background-color": colors.subtle,
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": colors.selected,
        "border-color": colors.action,
        "border-width": 4,
        "overlay-color": colors.action,
        "overlay-opacity": 0.08,
        "overlay-padding": 8,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "curve-style": "bezier",
        "line-color": colors.secondary,
        "target-arrow-color": colors.secondary,
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.75,
        color: colors.secondary,
        label: "data(label)",
        "font-family": "Petra Inter, Inter, sans-serif",
        "font-size": 9,
        "text-background-color": colors.canvas,
        "text-background-opacity": 0.94,
        "text-background-padding": "3px",
        "text-rotation": "autorotate",
      },
    },
    {
      selector: 'edge[relation = "supports"]',
      style: {
        "line-color": colors.positive,
        "target-arrow-color": colors.positive,
        width: 2.5,
      },
    },
    {
      selector: 'edge[relation = "contradicts"]',
      style: {
        "line-color": colors.danger,
        "target-arrow-color": colors.danger,
        "line-style": "dashed",
        width: 2.5,
      },
    },
    {
      selector: 'edge[relation = "qualifies"]',
      style: {
        "line-color": colors.caution,
        "target-arrow-color": colors.caution,
        "line-style": "dotted",
        width: 2.5,
      },
    },
    {
      selector: 'edge[relation = "provenance_for"], edge[relation = "asserts"]',
      style: {
        "line-color": colors.information,
        "target-arrow-color": colors.information,
        "curve-style": "taxi",
        "taxi-direction": "rightward",
        "taxi-turn": 28,
      },
    },
  ];
};

const directNeighbors = (
  nodeId: string,
  edges: FocusedGraphEdgeViewModel[],
): Set<string> => {
  const result = new Set<string>();
  edges.forEach((edge) => {
    if (edge.from === nodeId) result.add(edge.to);
    if (edge.to === nodeId) result.add(edge.from);
  });
  return result;
};

export const FocusedGraph = ({
  model,
  theme,
}: {
  model: FocusedGraphViewModel;
  theme: string;
}): React.JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const [layout, setLayout] = useState<FocusedGraphLayout>("neighborhood");
  const [depth, setDepth] = useState(model.maximumDepth);
  const [enabledRelations, setEnabledRelations] = useState(
    () => new Set<FocusedGraphRelation>(relations),
  );
  const [history, setHistory] = useState([model.selectedNodeId]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const selectedId = history[historyIndex] ?? model.selectedNodeId;

  const selectNode = useCallback(
    (nodeId: string): void => {
      if (nodeId === selectedId) return;
      setHistory((current) => [...current.slice(0, historyIndex + 1), nodeId]);
      setHistoryIndex((current) => current + 1);
    },
    [historyIndex, selectedId],
  );

  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    collapsed.forEach((nodeId) => {
      directNeighbors(nodeId, model.edges).forEach((neighborId) => {
        if (neighborId !== model.homeNodeId && neighborId !== selectedId) {
          hidden.add(neighborId);
        }
      });
    });
    return hidden;
  }, [collapsed, model.edges, model.homeNodeId, selectedId]);

  const eligibleNodeIds = useMemo(
    () =>
      new Set(
        model.nodes
          .filter(
            (node) => node.depth <= depth && !hiddenNodeIds.has(node.object.id),
          )
          .map((node) => node.object.id),
      ),
    [depth, hiddenNodeIds, model.nodes],
  );

  const visibleEdges = useMemo(
    () =>
      model.edges.filter(
        (edge) =>
          enabledRelations.has(edge.relation) &&
          eligibleNodeIds.has(edge.from) &&
          eligibleNodeIds.has(edge.to),
      ),
    [eligibleNodeIds, enabledRelations, model.edges],
  );

  const connectedNodeIds = useMemo(() => {
    const connected = new Set<string>([model.homeNodeId, selectedId]);
    visibleEdges.forEach((edge) => {
      connected.add(edge.from);
      connected.add(edge.to);
    });
    return connected;
  }, [model.homeNodeId, selectedId, visibleEdges]);

  const visibleNodes = useMemo(
    () =>
      model.nodes.filter(
        (node) =>
          eligibleNodeIds.has(node.object.id) &&
          connectedNodeIds.has(node.object.id),
      ),
    [connectedNodeIds, eligibleNodeIds, model.nodes],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    const elements: ElementDefinition[] = [
      ...visibleNodes.map((node) => ({
        data: {
          id: node.object.id,
          label: getCanvasNodeLabel(node),
          kind: node.object.kind,
        },
        position: node.positions[layout],
        selected: node.object.id === selectedId,
      })),
      ...visibleEdges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          relation: edge.relation,
          label: edge.label,
        },
      })),
    ];

    let disposed = false;
    let graph: Core | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("cytoscape").then(({ default: createGraph }) => {
      if (disposed) return;
      graph = createGraph({
        container,
        elements,
        style: makeGraphStyles(container),
        layout: { name: "preset", fit: true, padding: 44 },
        minZoom: 0.4,
        maxZoom: 2.4,
        wheelSensitivity: 0.22,
        boxSelectionEnabled: false,
        autounselectify: false,
      });
      graphRef.current = graph;
      graph.on("tap", "node", (event: EventObjectNode) =>
        selectNode(event.target.id()),
      );

      resizeObserver = new ResizeObserver(() => {
        graph?.resize();
        graph?.fit(undefined, 44);
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      graph?.destroy();
      graphRef.current = null;
    };
  }, [layout, selectNode, selectedId, theme, visibleEdges, visibleNodes]);

  const selectedNode =
    model.nodes.find((node) => node.object.id === selectedId) ?? model.nodes[0];
  const selectedConnections = visibleEdges.filter(
    (edge) => edge.from === selectedId || edge.to === selectedId,
  );

  const resetView = (): void => {
    setLayout("neighborhood");
    setDepth(model.maximumDepth);
    setEnabledRelations(new Set(relations));
    setHistory([model.selectedNodeId]);
    setHistoryIndex(0);
    setPinned(false);
    setCollapsed(new Set());
  };

  if (selectedNode === undefined) {
    return (
      <p className="focused-graph__dimension-note">
        This focused graph has no nodes to display.
      </p>
    );
  }

  return (
    <section className="focused-graph" aria-labelledby="focused-graph-title">
      <header className="focused-graph__heading">
        <div>
          <p>Focused relationship view</p>
          <h2 id="focused-graph-title">Evidence around H12</h2>
        </div>
        <div className="focused-graph__scope" aria-label="Graph boundary">
          <span>{model.snapshotLabel}</span>
          <span>Projection {model.projectionLabel}</span>
          <span>Depth {depth}</span>
        </div>
      </header>

      <div className="focused-graph__controls">
        <div className="focused-graph__history" aria-label="Graph navigation">
          <PetraIconButton
            label="Back in graph selection history"
            icon={<ArrowLeftIcon />}
            aria-disabled={historyIndex === 0}
            onClick={() => {
              if (historyIndex > 0) setHistoryIndex((current) => current - 1);
            }}
          />
          <PetraIconButton
            label="Forward in graph selection history"
            icon={<ArrowRightIcon />}
            aria-disabled={historyIndex >= history.length - 1}
            onClick={() => {
              if (historyIndex < history.length - 1) {
                setHistoryIndex((current) => current + 1);
              }
            }}
          />
          <PetraIconButton
            label="Return to the active question"
            icon={<HomeIcon />}
            onClick={() => selectNode(model.homeNodeId)}
          />
          <PetraIconButton
            label={pinned ? "Unpin selected node" : "Pin selected node"}
            icon={<PinIcon />}
            aria-pressed={pinned}
            onClick={() => setPinned((current) => !current)}
          />
          <PetraIconButton
            label={
              collapsed.has(selectedId)
                ? "Expand selected node neighbors"
                : "Collapse selected node neighbors"
            }
            icon={<FoldIcon />}
            aria-pressed={collapsed.has(selectedId)}
            onClick={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(selectedId)) next.delete(selectedId);
                else next.add(selectedId);
                return next;
              })
            }
          />
          <PetraIconButton
            label="Reset graph view"
            icon={<SyncIcon />}
            onClick={resetView}
          />
        </div>

        <div
          className="focused-graph__layouts"
          role="group"
          aria-label="Graph layout"
        >
          {layouts.map((layoutId) => (
            <PetraButton
              key={layoutId}
              density="compact"
              variant={layout === layoutId ? "secondary" : "quiet"}
              aria-pressed={layout === layoutId}
              onClick={() => setLayout(layoutId)}
            >
              {LAYOUT_LABELS[layoutId]}
            </PetraButton>
          ))}
        </div>

        <label className="focused-graph__depth">
          <span>Depth</span>
          <input
            type="range"
            min="1"
            max={model.maximumDepth}
            step="1"
            value={depth}
            onChange={(event) => setDepth(Number(event.currentTarget.value))}
          />
          <output>{depth}</output>
        </label>
      </div>

      <fieldset className="focused-graph__filters">
        <legend>Visible relationships</legend>
        {relations.map((relation) => (
          <label key={relation} data-relation={relation}>
            <input
              type="checkbox"
              checked={enabledRelations.has(relation)}
              onChange={(event) =>
                setEnabledRelations((current) => {
                  const next = new Set(current);
                  if (event.currentTarget.checked) next.add(relation);
                  else next.delete(relation);
                  return next;
                })
              }
            />
            <span aria-hidden="true" />
            {RELATION_LABELS[relation]}
          </label>
        ))}
      </fieldset>

      <div className="focused-graph__workspace">
        <div className="focused-graph__canvas-frame">
          <div
            className="focused-graph__canvas"
            ref={containerRef}
            aria-hidden="true"
          />
          <p className="focused-graph__gesture-hint">
            Drag to pan · scroll to zoom · select a node to inspect
          </p>
        </div>

        <aside className="focused-graph__inspector" aria-live="polite">
          <label className="focused-graph__node-picker">
            <span>Inspect node</span>
            <select
              value={selectedId}
              onChange={(event) => selectNode(event.currentTarget.value)}
            >
              {visibleNodes.map((node) => (
                <option key={node.object.id} value={node.object.id}>
                  {node.object.label} — {KIND_LABELS[node.object.kind]}
                </option>
              ))}
            </select>
          </label>
          <div className="focused-graph__selected-heading">
            <span>{KIND_LABELS[selectedNode.object.kind]}</span>
            {pinned ? <strong>Pinned</strong> : null}
          </div>
          <h3>{selectedNode.object.label}</h3>
          <p>{selectedNode.object.descriptor}</p>
          <dl>
            <div>
              <dt>Basis</dt>
              <dd>{selectedNode.basis}</dd>
            </div>
            <div>
              <dt>Identity</dt>
              <dd>
                <code>{selectedNode.object.id}</code>
              </dd>
            </div>
          </dl>
          <section>
            <h4>Visible connections</h4>
            {selectedConnections.length === 0 ? (
              <p>No relationships match the current depth and filters.</p>
            ) : (
              <ul>
                {selectedConnections.map((edge) => (
                  <li key={edge.id} data-relation={edge.relation}>
                    <span aria-hidden="true" />
                    {edge.label}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <details className="focused-graph__text-view">
        <summary>Text view of the visible graph</summary>
        <p>
          {visibleNodes.length} nodes and {visibleEdges.length} relationships in
          the current bounded view.
        </p>
        <ol>
          {visibleEdges.map((edge) => {
            const from = model.nodes.find(
              (node) => node.object.id === edge.from,
            );
            const to = model.nodes.find((node) => node.object.id === edge.to);
            return (
              <li key={edge.id}>
                {from?.object.label} → {edge.label} → {to?.object.label}
              </li>
            );
          })}
        </ol>
      </details>

      <p className="focused-graph__dimension-note">
        2D is authoritative for this focus. A 3D view is unavailable because the
        data does not define a scientific z-axis.
      </p>
      <code className="focused-graph__snapshot-id">{model.snapshotId}</code>
    </section>
  );
};
