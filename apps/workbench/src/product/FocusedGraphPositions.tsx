import { Link } from "react-router";

import type { FocusedGraphRegions } from "./focused-graph-regions.js";
import { FocusedGraphResult } from "./FocusedGraphResult.js";

type Layer = FocusedGraphRegions["orientation"]["semanticLayer"];

const layerLabel: Record<Layer, string> = {
  current: "Current",
  working: "Working changes",
  historical: "Historical",
};

const layerSymbol: Record<Layer, string> = {
  current: "C",
  working: "W",
  historical: "H",
};

const words = (value: string): string => value.replaceAll("_", " ");

export interface FocusedGraphPositionPaths {
  readonly current: string;
  readonly working: string;
  readonly historical?: string;
  readonly comparison: string;
  readonly time?: string;
}

export const FocusedGraphPositionNavigation = ({
  activeLayer,
  comparisonActive,
  timeActive = false,
  analysisActive = false,
  paths,
}: {
  activeLayer: Layer;
  comparisonActive: boolean;
  timeActive?: boolean;
  analysisActive?: boolean;
  paths: FocusedGraphPositionPaths;
}): React.JSX.Element => (
  <nav className="focused-graph-position-nav" aria-label="Graph position">
    <div
      className="petra-button-group"
      role="group"
      aria-label="Semantic layer"
    >
      {(["current", "working", "historical"] as const).map((layer) => {
        const path = paths[layer];
        const current =
          !analysisActive &&
          !comparisonActive &&
          !timeActive &&
          activeLayer === layer;
        return path === undefined ? (
          <span
            key={layer}
            className="focused-graph-position-nav__unavailable"
            aria-disabled="true"
            title="Historical requires an exact retained snapshot and recorded-time position."
          >
            {layerLabel[layer]}
          </span>
        ) : current ? (
          <span
            key={layer}
            className="focused-graph-position-nav__current"
            aria-current="page"
          >
            {layerLabel[layer]}
          </span>
        ) : (
          <Link
            key={layer}
            className="focused-graph-position-nav__link"
            to={path}
          >
            {layerLabel[layer]}
          </Link>
        );
      })}
    </div>
    <div
      className="petra-button-group"
      role="group"
      aria-label="Position comparison"
    >
      {comparisonActive ? (
        <span
          className="focused-graph-position-nav__current"
          aria-current="page"
        >
          Compare Current / Working changes
        </span>
      ) : (
        <Link
          className="focused-graph-position-nav__link"
          to={paths.comparison}
        >
          Compare Current / Working changes
        </Link>
      )}
      {paths.time === undefined ? null : timeActive ? (
        <span
          className="focused-graph-position-nav__current"
          aria-current="page"
        >
          Time · recorded
        </span>
      ) : (
        <Link className="focused-graph-position-nav__link" to={paths.time}>
          Time · recorded
        </Link>
      )}
    </div>
    {activeLayer === "historical" ? (
      <Link className="reference-primary-link" to={paths.current}>
        Return to current
      </Link>
    ) : null}
  </nav>
);

const sameRef = (
  left: FocusedGraphRegions["orientation"]["task"]["focus_refs"][number],
  right: FocusedGraphRegions["orientation"]["task"]["focus_refs"][number],
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const sameSnapshot = (
  left: FocusedGraphRegions["orientation"]["requestedSnapshot"],
  right: FocusedGraphRegions["orientation"]["requestedSnapshot"],
): boolean =>
  left.snapshot_id === right.snapshot_id &&
  left.revision === right.revision &&
  left.event_position === right.event_position &&
  left.content_hash === right.content_hash;

const samePositionTask = (
  before: FocusedGraphRegions,
  after: FocusedGraphRegions,
): boolean => {
  const left = before.orientation.task;
  const right = after.orientation.task;
  return (
    before.contract.projectId === after.contract.projectId &&
    before.orientation.profile.project_definition_ref.project_definition_id ===
      after.orientation.profile.project_definition_ref.project_definition_id &&
    before.orientation.profile.project_definition_ref.revision ===
      after.orientation.profile.project_definition_ref.revision &&
    before.orientation.profile.project_definition_ref.record_hash ===
      after.orientation.profile.project_definition_ref.record_hash &&
    left.task_kind === right.task_kind &&
    left.task_semantic_key === right.task_semantic_key &&
    left.question === right.question &&
    left.question_hash === right.question_hash &&
    left.return_destination_key === right.return_destination_key &&
    left.origin.origin_kind === right.origin.origin_kind &&
    left.origin.origin_ref?.record_id === right.origin.origin_ref?.record_id &&
    left.origin.origin_ref?.revision === right.origin.origin_ref?.revision &&
    left.origin.origin_ref?.record_hash ===
      right.origin.origin_ref?.record_hash &&
    left.focus_refs.length === right.focus_refs.length &&
    left.focus_refs.every((ref, index) =>
      sameRef(ref, right.focus_refs[index]!),
    ) &&
    sameSnapshot(
      before.orientation.requestedSnapshot,
      after.orientation.requestedSnapshot,
    )
  );
};

export const FocusedGraphPositionFacts = ({
  label,
  regions,
}: {
  label: string;
  regions: FocusedGraphRegions;
}): React.JSX.Element => {
  const orientation = regions.orientation;
  const requested = orientation.requestedSnapshot;
  const represented = orientation.representedSnapshot;
  const projection = orientation.projectionPosition;
  const authorityPositions = [
    ...new Set([
      ...regions.graph.nodes.map((node) => node.authority_position),
      ...regions.graph.relationships.map(
        (relationship) => relationship.authority_position,
      ),
    ]),
  ];
  const temporal = orientation.temporalPosition;
  return (
    <section
      className="focused-graph-position-facts"
      data-layer={orientation.semanticLayer}
      aria-label={`${label} exact position`}
    >
      <header>
        <span className="graph-state" data-layer={orientation.semanticLayer}>
          <span aria-hidden="true">
            {layerSymbol[orientation.semanticLayer]}
          </span>
          {layerLabel[orientation.semanticLayer]}
        </span>
        <strong>{label}</strong>
      </header>
      <dl className="history-facts">
        <div>
          <dt>Requested snapshot</dt>
          <dd>
            <code>{requested.snapshot_id}</code> · revision {requested.revision}{" "}
            · event {requested.event_position}
            <br />
            <code>{requested.content_hash}</code>
          </dd>
        </div>
        <div>
          <dt>Represented snapshot</dt>
          <dd>
            <code>{represented.snapshot_id}</code> · revision{" "}
            {represented.revision}· event {represented.event_position}
            <br />
            <code>{represented.content_hash}</code>
          </dd>
        </div>
        <div>
          <dt>Temporal position</dt>
          <dd>
            {words(temporal.position_kind)} · {words(temporal.dimension)}
            {temporal.position_kind === "historical"
              ? temporal.at.state === "exact"
                ? ` · ${temporal.at.value}`
                : ` · ${words(temporal.at.state)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Member authority</dt>
          <dd>
            {authorityPositions.length === 0
              ? "No represented member authority positions"
              : authorityPositions.map(words).join(", ")}
          </dd>
        </div>
        <div>
          <dt>Projection position</dt>
          <dd>
            {words(projection.state)} · represented event{" "}
            {projection.represented_event_position}· observed event{" "}
            {projection.observed_event_position} · pending{" "}
            {projection.pending_records}
          </dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>
            {regions.graph.selection.state === "none"
              ? "No selected member"
              : `${words(regions.graph.selection.selection_kind)} · ${regions.graph.selection.selected_keys.join(", ")}`}
          </dd>
        </div>
      </dl>
      <p>{projection.detail}</p>
      <p>
        <strong>Scope:</strong> {regions.graph.scope.description} Coverage{" "}
        {words(regions.graph.scope.coverage)}.
      </p>
    </section>
  );
};

export const FocusedGraphComparison = ({
  before,
  after,
}: {
  before: FocusedGraphRegions;
  after: FocusedGraphRegions;
}): React.JSX.Element => {
  if (
    before.orientation.semanticLayer !== "current" ||
    after.orientation.semanticLayer !== "working" ||
    !samePositionTask(before, after)
  ) {
    throw new Error(
      "Focused Graph comparison requires exact compatible Current and Working changes reads for one task and snapshot.",
    );
  }
  return (
    <section
      className="focused-graph-comparison"
      aria-labelledby="focused-graph-comparison-title"
    >
      <header className="graph-task__header">
        <div>
          <p className="reference-panel-kicker">Dedicated comparison</p>
          <h2 id="focused-graph-comparison-title">Current / Working changes</h2>
        </div>
        <span>Separate exact positions</span>
      </header>
      <p className="focused-graph-peer__boundary">
        Before and after are separate server-composed reads. They are not
        overlaid, and renderer geometry supplies no authority or difference
        fact.
      </p>
      <div className="focused-graph-comparison__positions">
        <article aria-labelledby="focused-graph-before-title">
          <h3 id="focused-graph-before-title">Before · Current</h3>
          <FocusedGraphPositionFacts label="Before" regions={before} />
          <FocusedGraphResult
            regions={before}
            initialRepresentation="text"
            idPrefix="focused-graph-before-result"
          />
        </article>
        <article aria-labelledby="focused-graph-after-title">
          <h3 id="focused-graph-after-title">After · Working changes</h3>
          <FocusedGraphPositionFacts label="After" regions={after} />
          <FocusedGraphResult
            regions={after}
            initialRepresentation="text"
            idPrefix="focused-graph-after-result"
          />
        </article>
      </div>
      <section
        className="focused-graph-comparison__difference-boundary"
        aria-labelledby="focused-graph-difference-boundary-title"
      >
        <h3 id="focused-graph-difference-boundary-title">
          Difference boundary
        </h3>
        <p>
          No added, removed, changed, unchanged, or consequence fact is
          calculated from these memberships. Those labels remain unavailable
          until an exact server-owned comparison read supplies them.
        </p>
      </section>
    </section>
  );
};
