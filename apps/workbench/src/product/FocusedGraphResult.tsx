import type {
  FocusedGraphRegisteredAction,
  FocusedGraphSemanticDestination,
} from "@petra/contracts";
import type { Core, ElementDefinition, StylesheetJson } from "cytoscape";
import { useEffect, useRef, useState } from "react";

import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import type {
  FocusedGraphEvidenceRow,
  FocusedGraphRegions,
  FocusedGraphResolvedPath,
} from "./focused-graph-regions.js";

type FocusedGraphRepresentation = "graph" | "text";

const meaningSymbols = {
  citation: "C",
  support: "+",
  contradiction: "≠",
  qualification: "≈",
  inference: "∴",
  structural: "S",
  provenance: "P",
  governance: "G",
  dependency: "D",
} as const;

const words = (value: string): string => value.replaceAll("_", " ");

const cssColor = (
  styles: CSSStyleDeclaration,
  property: string,
  fallback: string,
): string => styles.getPropertyValue(property).trim() || fallback;

const rendererStyles = (container: HTMLElement): StylesheetJson => {
  const styles = getComputedStyle(container);
  const panel = cssColor(styles, "--petra-surface-panel", "#fbfbfa");
  const canvas = cssColor(styles, "--petra-surface-canvas", "#f4f5f5");
  const text = cssColor(styles, "--petra-text-primary", "#25292e");
  const secondary = cssColor(styles, "--petra-text-secondary", "#59636e");
  const border = cssColor(styles, "--petra-border-strong", "#afb8c1");
  const action = cssColor(styles, "--petra-action-primary", "#0969da");
  return [
    {
      selector: "node",
      style: {
        width: 144,
        height: 64,
        shape: "round-rectangle",
        "background-color": panel,
        "border-color": border,
        "border-width": 2,
        color: text,
        label: "data(label)",
        "font-family": "Petra Inter, Inter, sans-serif",
        "font-size": 12,
        "text-halign": "center",
        "text-valign": "center",
        "text-max-width": "124px",
        "text-wrap": "wrap",
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": canvas,
        "border-color": action,
        "border-width": 4,
        "overlay-color": action,
        "overlay-opacity": 0.08,
        "overlay-padding": 8,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "curve-style": "bezier",
        "line-color": secondary,
        "target-arrow-color": secondary,
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.8,
        color: secondary,
        label: "data(label)",
        "font-family": "Petra Inter, Inter, sans-serif",
        "font-size": 9,
        "text-background-color": canvas,
        "text-background-opacity": 0.96,
        "text-background-padding": "3px",
        "text-rotation": "autorotate",
      },
    },
    {
      selector: 'edge[meaning = "citation"]',
      style: { "line-style": "dashed" },
    },
    {
      selector: 'edge[meaning = "contradiction"]',
      style: { "line-style": "dashed", width: 3 },
    },
    {
      selector: 'edge[meaning = "qualification"]',
      style: { "line-style": "dotted", width: 3 },
    },
    {
      selector: 'edge[meaning = "inference"]',
      style: { "line-style": "dashed", "target-arrow-shape": "vee" },
    },
    {
      selector: "edge:selected",
      style: {
        "line-color": action,
        "target-arrow-color": action,
        width: 4,
      },
    },
  ];
};

const isSelected = (
  regions: FocusedGraphRegions,
  kind: "node" | "relationship" | "path",
  key: string,
): boolean =>
  regions.graph.selection.state === "selected" &&
  regions.graph.selection.selection_kind === kind &&
  regions.graph.selection.selected_keys.includes(key);

const ExactReferences = ({
  refs,
}: {
  refs: FocusedGraphEvidenceRow["relationship"]["basis"]["record_refs"];
}): React.JSX.Element =>
  refs.length === 0 ? (
    <p className="focused-graph-facts__empty">
      No exact basis reference is supplied in this result.
    </p>
  ) : (
    <ul className="focused-graph-facts__refs">
      {refs.map((ref) => (
        <li key={`${ref.record_id}:${ref.revision}:${ref.record_hash}`}>
          <code>{ref.record_id}</code> · revision {ref.revision}
          <br />
          <code>{ref.record_hash}</code>
        </li>
      ))}
    </ul>
  );

const SourceAvailability = ({
  destinations,
}: {
  destinations: readonly FocusedGraphSemanticDestination[];
}): React.JSX.Element => {
  const sources = destinations.filter(
    (destination) => destination.destination_kind === "source_inspection",
  );
  if (sources.length === 0) {
    return <p>Exact source location: not supplied for this relationship.</p>;
  }
  return (
    <ul className="focused-graph-facts__availability">
      {sources.map((destination) => (
        <li
          key={destination.destination_key}
          data-availability={destination.state}
        >
          <strong>{destination.label}</strong>: {destination.state}
          {destination.state === "available" ? (
            <>
              {" "}
              · <code>{destination.target_ref.record_id}</code> · revision{" "}
              {destination.target_ref.revision}
              <br />
              <code>{destination.target_ref.record_hash}</code>
            </>
          ) : (
            <> · {destination.reason}</>
          )}
        </li>
      ))}
    </ul>
  );
};

const RelationshipFacts = ({
  row,
  selected,
}: {
  row: FocusedGraphEvidenceRow;
  selected: boolean;
}): React.JSX.Element => {
  const relationship = row.relationship;
  return (
    <article
      className="focused-graph-facts"
      data-meaning={relationship.meaning_kind}
      data-selected={selected || undefined}
    >
      <header>
        <span className="focused-graph-facts__symbol" aria-hidden="true">
          {meaningSymbols[relationship.meaning_kind]}
        </span>
        <div>
          <h4>{relationship.term.singular}</h4>
          <p>
            {words(relationship.meaning_kind)} · {relationship.predicate}
          </p>
        </div>
        {selected ? <strong>Selected relationship</strong> : null}
      </header>
      <p>{relationship.summary}</p>
      <dl>
        <div>
          <dt>Endpoints</dt>
          <dd>
            {row.source.term.singular}: {row.source.label} →{" "}
            {row.target.term.singular}: {row.target.label}
            <br />
            <code>
              {row.source.record_ref.record_id}@{row.source.record_ref.revision}
            </code>{" "}
            →{" "}
            <code>
              {row.target.record_ref.record_id}@{row.target.record_ref.revision}
            </code>
          </dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{words(relationship.direction)}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>{words(relationship.origin)}</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>
            {words(relationship.authority_position)} · layer{" "}
            {words(relationship.layer)}
          </dd>
        </div>
        <div>
          <dt>Exact identity</dt>
          <dd>
            <code>{relationship.relationship_ref.element_id}</code> · revision{" "}
            {relationship.relationship_ref.revision}
            <br />
            <code>{relationship.relationship_ref.record_hash}</code>
          </dd>
        </div>
      </dl>
      <section aria-label={`${relationship.term.singular} basis`}>
        <strong>Basis</strong>
        <p>{relationship.basis.summary}</p>
        <ExactReferences refs={relationship.basis.record_refs} />
      </section>
      <section aria-label={`${relationship.term.singular} source availability`}>
        <strong>SourceSpan availability</strong>
        <SourceAvailability destinations={row.destinations} />
      </section>
      <section aria-label={`${relationship.term.singular} limitations`}>
        <strong>Limitations</strong>
        {relationship.basis.limitations.length === 0 ? (
          <p>No relationship-basis limitation is supplied.</p>
        ) : (
          <ul>
            {relationship.basis.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        )}
      </section>
      {row.actions.length === 0 ? null : (
        <p>
          Registered for this relationship:{" "}
          {row.actions.map((action) => action.label).join(", ")}.
        </p>
      )}
    </article>
  );
};

const PathSummaries = ({
  regions,
  includeSteps,
}: {
  regions: FocusedGraphRegions;
  includeSteps: boolean;
}): React.JSX.Element => (
  <ol className="focused-graph-paths">
    {regions.textualPeer.resolvedPaths.map((resolvedPath, index) => {
      const selected = isSelected(regions, "path", resolvedPath.path.path_key);
      return (
        <li
          key={resolvedPath.path.path_key}
          data-path-state={resolvedPath.path.state}
          data-selected={selected || undefined}
        >
          <header>
            <strong>Path {index + 1}</strong>
            <span>
              {words(resolvedPath.path.state)}
              {selected ? " · selected path" : ""}
            </span>
          </header>
          <code>{resolvedPath.path.path_key}</code>
          <p>
            <strong>Why this order:</strong>{" "}
            {resolvedPath.path.ordering_rationale}
          </p>
          {includeSteps ? <PathSteps path={resolvedPath} /> : null}
          {resolvedPath.path.limitations.length === 0 ? null : (
            <ul>
              {resolvedPath.path.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          )}
        </li>
      );
    })}
  </ol>
);

const PathSteps = ({
  path,
}: {
  path: FocusedGraphResolvedPath;
}): React.JSX.Element =>
  path.steps.length === 0 ? (
    <p>No recorded step is represented for this path.</p>
  ) : (
    <ol className="focused-graph-path-steps">
      {path.steps.map(({ step, source, relationship, target }) => (
        <li key={`${path.path.path_key}:${step.position}`}>
          <span>Step {step.position}</span>
          <p>
            <strong>
              {source.term.singular}: {source.label}
            </strong>{" "}
            — {relationship.term.singular} ({relationship.predicate}) →{" "}
            <strong>
              {target.term.singular}: {target.label}
            </strong>
          </p>
          <p>
            Direction {words(relationship.direction)}; traversal{" "}
            {words(step.traversal_direction)}; origin{" "}
            {words(relationship.origin)}; authority{" "}
            {words(relationship.authority_position)}.
          </p>
          <p>Basis: {relationship.basis.summary}</p>
          {step.repeated_member ? <p>Repeated member in this path.</p> : null}
        </li>
      ))}
    </ol>
  );

const DestinationInventory = ({
  destinations,
  idPrefix,
}: {
  destinations: readonly FocusedGraphSemanticDestination[];
  idPrefix: string;
}): React.JSX.Element => (
  <section aria-labelledby={`${idPrefix}-destinations-title`}>
    <h4 id={`${idPrefix}-destinations-title`}>Semantic destinations</h4>
    <ul className="focused-graph-semantic-list">
      {destinations.map((destination) => (
        <li
          key={destination.destination_key}
          data-availability={destination.state}
        >
          <strong>{destination.label}</strong>
          <span>
            {words(destination.destination_kind)} · {destination.state} · owner{" "}
            {words(destination.owner)}
          </span>
          {destination.state === "available" ? (
            <code>
              {destination.target_ref.record_id} · revision{" "}
              {destination.target_ref.revision}
              <br />
              {destination.target_ref.record_hash}
            </code>
          ) : (
            <p>{destination.reason}</p>
          )}
        </li>
      ))}
    </ul>
  </section>
);

const ActionInventory = ({
  actions,
  destinations,
  idPrefix,
}: {
  actions: readonly FocusedGraphRegisteredAction[];
  destinations: ReadonlyMap<string, FocusedGraphSemanticDestination>;
  idPrefix: string;
}): React.JSX.Element => (
  <section aria-labelledby={`${idPrefix}-actions-title`}>
    <h4 id={`${idPrefix}-actions-title`}>Registered actions</h4>
    <ul className="focused-graph-semantic-list">
      {actions.map((action) => {
        const destination =
          action.availability.state === "available" &&
          action.availability.destination_key !== undefined
            ? destinations.get(action.availability.destination_key)
            : undefined;
        return (
          <li
            key={action.action_key}
            data-availability={action.availability.state}
          >
            <strong>{action.label}</strong>
            <span>
              {words(action.action_kind)} · {words(action.consequence)} ·{" "}
              {action.availability.state}
            </span>
            <code>{action.target_keys.join(", ")}</code>
            {destination === undefined ? null : <p>{destination.label}</p>}
            {action.availability.state === "unavailable" ? (
              <p>{action.availability.reason}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  </section>
);

const SemanticAccess = ({
  regions,
  idPrefix,
}: {
  regions: FocusedGraphRegions;
  idPrefix: string;
}): React.JSX.Element => (
  <div className="focused-graph-semantic-access">
    <DestinationInventory
      destinations={regions.textualPeer.destinations}
      idPrefix={idPrefix}
    />
    <ActionInventory
      actions={regions.textualPeer.actions}
      destinations={regions.destinations}
      idPrefix={idPrefix}
    />
  </div>
);

const FocusedGraphCanvas = ({
  regions,
}: {
  regions: FocusedGraphRegions;
}): React.JSX.Element => {
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<Core | null>(null);

  useEffect(() => {
    const target = container.current;
    if (target === null) return undefined;
    const elements: ElementDefinition[] = [
      ...regions.graph.nodes.map((node) => ({
        data: {
          id: node.node_key,
          label: `${node.term.singular}\n${node.label}`,
        },
        selected: isSelected(regions, "node", node.node_key),
      })),
      ...regions.graph.relationships.map((relationship) => ({
        data: {
          id: relationship.relationship_key,
          source: relationship.source_node_key,
          target: relationship.target_node_key,
          label: `${relationship.term.singular} · ${relationship.predicate}`,
          meaning: relationship.meaning_kind,
        },
        selected: isSelected(
          regions,
          "relationship",
          relationship.relationship_key,
        ),
      })),
    ];
    let disposed = false;
    let instance: Core | null = null;
    let resizeObserver: ResizeObserver | null = null;
    void import("cytoscape").then(({ default: createGraph }) => {
      if (disposed) return;
      instance = createGraph({
        container: target,
        elements,
        style: rendererStyles(target),
        layout: {
          name: "breadthfirst",
          directed: true,
          fit: true,
          padding: 44,
          spacingFactor: 1.3,
        },
        minZoom: 0.4,
        maxZoom: 2.4,
        wheelSensitivity: 0.22,
        boxSelectionEnabled: false,
        autounselectify: true,
      });
      graph.current = instance;
      resizeObserver = new ResizeObserver(() => {
        instance?.resize();
        instance?.fit(undefined, 44);
      });
      resizeObserver.observe(target);
    });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      instance?.destroy();
      graph.current = null;
    };
  }, [regions]);

  return (
    <div
      ref={container}
      className="focused-graph-production-canvas"
      data-renderer="cytoscape"
      aria-hidden="true"
    />
  );
};

const GraphPeer = ({
  regions,
  idPrefix,
}: {
  regions: FocusedGraphRegions;
  idPrefix: string;
}): React.JSX.Element => (
  <div className="focused-graph-peer" data-focused-peer="graph">
    <p className="focused-graph-peer__boundary">
      The rows preserve endpoint order and profile-owned relationship meaning.
      Their arrangement, spacing, and line length carry no authority or
      scientific force.
    </p>
    <FocusedGraphCanvas regions={regions} />
    <ol
      className="focused-graph-records"
      aria-label="Bounded relationship graph"
    >
      {regions.evidenceMatrix.rows.map((row) => (
        <li key={row.relationship.relationship_key}>
          <div className="focused-graph-record" aria-hidden="true">
            <div
              className="focused-graph-record__node"
              data-selected={
                isSelected(regions, "node", row.source.node_key) || undefined
              }
            >
              <span>{row.source.term.singular}</span>
              <strong>{row.source.label}</strong>
            </div>
            <div
              className="focused-graph-record__edge"
              data-meaning={row.relationship.meaning_kind}
              data-selected={
                isSelected(
                  regions,
                  "relationship",
                  row.relationship.relationship_key,
                ) || undefined
              }
            >
              <span>{meaningSymbols[row.relationship.meaning_kind]}</span>
              <strong>{row.relationship.term.singular}</strong>
              <small>{words(row.relationship.direction)} →</small>
            </div>
            <div
              className="focused-graph-record__node"
              data-selected={
                isSelected(regions, "node", row.target.node_key) || undefined
              }
            >
              <span>{row.target.term.singular}</span>
              <strong>{row.target.label}</strong>
            </div>
          </div>
          <RelationshipFacts
            row={row}
            selected={isSelected(
              regions,
              "relationship",
              row.relationship.relationship_key,
            )}
          />
        </li>
      ))}
    </ol>
    <section aria-labelledby={`${idPrefix}-path-rationale-title`}>
      <h3 id={`${idPrefix}-path-rationale-title`}>Path rationale</h3>
      <PathSummaries regions={regions} includeSteps={false} />
    </section>
    <SemanticAccess regions={regions} idPrefix={idPrefix} />
  </div>
);

const TextPeer = ({
  regions,
  idPrefix,
}: {
  regions: FocusedGraphRegions;
  idPrefix: string;
}): React.JSX.Element => (
  <div className="focused-graph-peer" data-focused-peer="text">
    <p className="focused-graph-peer__boundary">
      This textual peer contains every returned path step and the same
      relationship facts, destinations, actions, and limitations as the graph.
    </p>
    <section aria-labelledby={`${idPrefix}-text-paths-title`}>
      <h3 id={`${idPrefix}-text-paths-title`}>Ordered paths</h3>
      <PathSummaries regions={regions} includeSteps />
    </section>
    <section aria-labelledby={`${idPrefix}-evidence-matrix-title`}>
      <h3 id={`${idPrefix}-evidence-matrix-title`}>
        Relationship evidence matrix
      </h3>
      <ol className="focused-graph-matrix">
        {regions.evidenceMatrix.rows.map((row) => (
          <li key={row.relationship.relationship_key}>
            <RelationshipFacts
              row={row}
              selected={isSelected(
                regions,
                "relationship",
                row.relationship.relationship_key,
              )}
            />
          </li>
        ))}
      </ol>
    </section>
    <SemanticAccess regions={regions} idPrefix={idPrefix} />
  </div>
);

export const FocusedGraphResult = ({
  regions,
  initialRepresentation = "graph",
  idPrefix = "focused-result",
}: {
  regions: FocusedGraphRegions;
  initialRepresentation?: FocusedGraphRepresentation;
  idPrefix?: string;
}): React.JSX.Element => {
  const [representation, setRepresentation] =
    useState<FocusedGraphRepresentation>(initialRepresentation);
  return (
    <section className="graph-task" aria-labelledby={`${idPrefix}-title`}>
      <header className="graph-task__header">
        <div>
          <p className="reference-panel-kicker">Bounded result</p>
          <h2 id={`${idPrefix}-title`}>Recorded relationship view</h2>
        </div>
        <span>
          {regions.graph.nodes.length} objects ·{" "}
          {regions.graph.relationships.length} relationships ·{" "}
          {regions.graph.paths.length} paths
        </span>
      </header>
      <div className="graph-controls">
        <PetraButtonGroup label="Representation">
          {(["graph", "text"] as const).map((value) => (
            <PetraButton
              key={value}
              density="compact"
              variant={representation === value ? "secondary" : "quiet"}
              aria-pressed={representation === value}
              onClick={() => setRepresentation(value)}
            >
              {value === "graph" ? "Graph" : "Text"}
            </PetraButton>
          ))}
        </PetraButtonGroup>
        <p>
          Labels, direction words, symbols, and line patterns carry meaning;
          color and position do not stand alone.
        </p>
      </div>
      <div className="focused-graph-result">
        {representation === "graph" ? (
          <GraphPeer regions={regions} idPrefix={idPrefix} />
        ) : (
          <TextPeer regions={regions} idPrefix={idPrefix} />
        )}
      </div>
      <footer className="graph-scope">
        <div className="graph-scope__result">
          <strong>Coverage</strong>
          <p>{words(regions.evidenceMatrix.coverage)}</p>
          <strong>Scope limitations</strong>
          <ul>
            {regions.evidenceMatrix.omissions.map((omission, index) => (
              <li key={`${omission.omission_kind}:${index}`}>
                {omission.description}
              </li>
            ))}
            {regions.evidenceMatrix.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Authority and visual meaning</strong>
          <p>
            PostgreSQL remains authoritative. This result may read a rebuildable
            projection; layout, selection, and the renderer issue no Project
            mutation.
          </p>
        </div>
      </footer>
    </section>
  );
};
