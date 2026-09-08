import type { ReactNode } from "react";

import "./state.css";

export type ScientificAuthority =
  "proposal" | "validated" | "applied" | "superseded" | "reverted";

export type WorkFreshness =
  | "current_snapshot"
  | "cached_derived"
  | "running"
  | "stale"
  | "projection_catching_up";

export type WorkOutcome =
  "awaiting_input" | "completed" | "failed" | "cancelled" | "blocked";

export type SourceDepth =
  "metadata_only" | "abstract_only" | "partial_full_text" | "full_text";

export type EpistemicOrigin =
  | "source"
  | "extraction"
  | "experiment"
  | "graph_inference"
  | "researcher_judgment"
  | "assistant_judgment";

export type EvidenceRelation =
  | "supports"
  | "contradicts"
  | "qualifies"
  | "fails_to_replicate"
  | "cites"
  | "derives_from"
  | "unresolved";

export type ReviewPosture =
  "inspect" | "guide" | "delegate" | "supervise" | "custom";

export type Availability =
  "ready" | "limited" | "unavailable" | "policy_blocked";

export interface StateValueMap {
  scientific_authority: ScientificAuthority;
  work_freshness: WorkFreshness;
  work_outcome: WorkOutcome;
  source_depth: SourceDepth;
  origin: EpistemicOrigin;
  evidence_relation: EvidenceRelation;
  review_posture: ReviewPosture;
  availability: Availability;
}

export type StateDimension = keyof StateValueMap;

export type StateMarkerViewModel = {
  [Dimension in StateDimension]: {
    dimension: Dimension;
    value: StateValueMap[Dimension];
    detail?: string;
  };
}[StateDimension];

export interface FreshnessStampViewModel {
  state: WorkFreshness;
  snapshotLabel: string;
  snapshotId: string;
  asOf: string;
  detail: string;
}

export interface OriginLabelViewModel {
  origin: EpistemicOrigin;
  basisLabel: string;
  basisId?: string;
  detail: string;
}

export interface EvidenceRelationViewModel {
  relation: EvidenceRelation;
  subjectLabel: string;
  objectLabel: string;
  detail: string;
}

export interface SourceDepthFlagViewModel {
  depth: SourceDepth;
  sourceLabel: string;
  permittedUse: string;
  limitation?: string;
}

export interface WorkActivityViewModel {
  workUnitId: string;
  objective: string;
  freshness: Extract<WorkFreshness, "running">;
  stage: string;
  updatedAt: string;
  outcome?: WorkOutcome;
  recovery?: string;
}

export interface AvailabilityNoteViewModel {
  availability: Availability;
  actionLabel: string;
  reason: string;
  prerequisite?: string;
}

export type NoticeTone =
  "neutral" | "information" | "positive" | "caution" | "danger";

export interface StateNoticeViewModel {
  tone: NoticeTone;
  title: string;
  message: string;
  recovery?: string;
}

const DIMENSION_LABELS: Record<StateDimension, string> = {
  scientific_authority: "Scientific authority",
  work_freshness: "Work freshness",
  work_outcome: "Work outcome",
  source_depth: "Source depth",
  origin: "Origin",
  evidence_relation: "Evidence relation",
  review_posture: "Review mode",
  availability: "Availability",
};

const DIMENSION_SYMBOLS: Record<StateDimension, string> = {
  scientific_authority: "A",
  work_freshness: "F",
  work_outcome: "W",
  source_depth: "D",
  origin: "O",
  evidence_relation: "R",
  review_posture: "P",
  availability: "!",
};

const STATE_LABELS: {
  [Dimension in StateDimension]: Record<StateValueMap[Dimension], string>;
} = {
  scientific_authority: {
    proposal: "Proposal",
    validated: "Validated",
    applied: "Applied",
    superseded: "Superseded",
    reverted: "Reverted",
  },
  work_freshness: {
    current_snapshot: "Current snapshot",
    cached_derived: "Cached result",
    running: "Running",
    stale: "Stale",
    projection_catching_up: "Catching up",
  },
  work_outcome: {
    awaiting_input: "Awaiting input",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    blocked: "Blocked",
  },
  source_depth: {
    metadata_only: "Metadata only",
    abstract_only: "Abstract only",
    partial_full_text: "Partial full text",
    full_text: "Full text",
  },
  origin: {
    source: "Source report",
    extraction: "Extracted from source",
    experiment: "Experiment result",
    graph_inference: "Graph inference",
    researcher_judgment: "Researcher judgment",
    assistant_judgment: "Assistant judgment",
  },
  evidence_relation: {
    supports: "Supports",
    contradicts: "Contradicts",
    qualifies: "Qualifies",
    fails_to_replicate: "Fails to replicate",
    cites: "Cites",
    derives_from: "Derives from",
    unresolved: "Unresolved relation",
  },
  review_posture: {
    inspect: "Inspect",
    guide: "Guide",
    delegate: "Delegate",
    supervise: "Supervise",
    custom: "Scoped custom policy",
  },
  availability: {
    ready: "Ready",
    limited: "Limited",
    unavailable: "Unavailable",
    policy_blocked: "Policy-blocked",
  },
};

export const getStateLabel = (marker: StateMarkerViewModel): string => {
  const labels = STATE_LABELS[marker.dimension] as Record<string, string>;
  return labels[marker.value] ?? marker.value;
};

export const getDimensionLabel = (dimension: StateDimension): string =>
  DIMENSION_LABELS[dimension];

export const StateMarker = ({
  marker,
  showDimension = false,
}: {
  marker: StateMarkerViewModel;
  showDimension?: boolean;
}): React.JSX.Element => {
  const label = getStateLabel(marker);
  const dimensionLabel = getDimensionLabel(marker.dimension);
  const accessibleLabel = `${dimensionLabel}: ${label}${marker.detail === undefined ? "" : `. ${marker.detail}`}`;

  return (
    <span
      className="petra-state-marker"
      data-dimension={marker.dimension}
      data-state={marker.value}
      aria-label={accessibleLabel}
      title={marker.detail}
    >
      <span className="petra-state-marker__symbol" aria-hidden="true">
        {DIMENSION_SYMBOLS[marker.dimension]}
      </span>
      <span className="petra-state-marker__label">{label}</span>
      {showDimension ? (
        <span className="petra-state-marker__dimension">{dimensionLabel}</span>
      ) : null}
    </span>
  );
};

export const StateGroup = ({
  label,
  markers,
}: {
  label: string;
  markers: StateMarkerViewModel[];
}): React.JSX.Element => (
  <section className="petra-state-group" aria-label={label}>
    <h3>{label}</h3>
    <div className="petra-state-group__items">
      {markers.map((marker) => (
        <StateMarker
          key={`${marker.dimension}:${marker.value}`}
          marker={marker}
          showDimension
        />
      ))}
    </div>
  </section>
);

export const FreshnessStamp = ({
  freshness,
}: {
  freshness: FreshnessStampViewModel;
}): React.JSX.Element => (
  <section className="petra-foundation-block petra-freshness">
    <div className="petra-foundation-block__heading">
      <h3>Snapshot and freshness</h3>
      <StateMarker
        marker={{ dimension: "work_freshness", value: freshness.state }}
      />
    </div>
    <dl>
      <div>
        <dt>Snapshot</dt>
        <dd>
          <span>{freshness.snapshotLabel}</span>
          <code>{freshness.snapshotId}</code>
        </dd>
      </div>
      <div>
        <dt>As of</dt>
        <dd>{freshness.asOf}</dd>
      </div>
    </dl>
    <p>{freshness.detail}</p>
  </section>
);

export const OriginLabel = ({
  origin,
}: {
  origin: OriginLabelViewModel;
}): React.JSX.Element => (
  <section className="petra-foundation-block petra-origin">
    <div className="petra-foundation-block__heading">
      <h3>Statement origin</h3>
      <StateMarker marker={{ dimension: "origin", value: origin.origin }} />
    </div>
    <p className="petra-origin__basis">
      <span>{origin.basisLabel}</span>
      {origin.basisId === undefined ? null : <code>{origin.basisId}</code>}
    </p>
    <p>{origin.detail}</p>
  </section>
);

export const EvidenceRelationLine = ({
  relation,
}: {
  relation: EvidenceRelationViewModel;
}): React.JSX.Element => (
  <section className="petra-foundation-block petra-relation">
    <div className="petra-foundation-block__heading">
      <h3>Evidence relation</h3>
      <StateMarker
        marker={{
          dimension: "evidence_relation",
          value: relation.relation,
        }}
      />
    </div>
    <div className="petra-relation__path" data-relation={relation.relation}>
      <span>{relation.subjectLabel}</span>
      <i aria-hidden="true" />
      <strong>
        {getStateLabel({
          dimension: "evidence_relation",
          value: relation.relation,
        })}
      </strong>
      <i aria-hidden="true" />
      <span>{relation.objectLabel}</span>
    </div>
    <p>{relation.detail}</p>
  </section>
);

export const SourceDepthFlag = ({
  source,
}: {
  source: SourceDepthFlagViewModel;
}): React.JSX.Element => (
  <aside
    className="petra-foundation-block petra-source-depth"
    data-depth={source.depth}
  >
    <div className="petra-foundation-block__heading">
      <h3>{source.sourceLabel}</h3>
      <StateMarker
        marker={{ dimension: "source_depth", value: source.depth }}
      />
    </div>
    <dl>
      <div>
        <dt>Permitted use</dt>
        <dd>{source.permittedUse}</dd>
      </div>
      {source.limitation === undefined ? null : (
        <div>
          <dt>Limitation</dt>
          <dd>{source.limitation}</dd>
        </div>
      )}
    </dl>
  </aside>
);

export const WorkActivity = ({
  work,
}: {
  work: WorkActivityViewModel;
}): React.JSX.Element => {
  const markers: StateMarkerViewModel[] = [
    { dimension: "work_freshness", value: work.freshness },
  ];
  if (work.outcome !== undefined) {
    markers.push({ dimension: "work_outcome", value: work.outcome });
  }

  return (
    <section className="petra-foundation-block petra-work-activity">
      <div className="petra-foundation-block__heading">
        <h3>Active work</h3>
        <div className="petra-work-activity__markers">
          {markers.map((marker) => (
            <StateMarker
              key={`${marker.dimension}:${marker.value}`}
              marker={marker}
            />
          ))}
        </div>
      </div>
      <p className="petra-work-activity__objective">{work.objective}</p>
      <dl>
        <div>
          <dt>WorkUnit</dt>
          <dd>
            <code>{work.workUnitId}</code>
          </dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>{work.stage}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{work.updatedAt}</dd>
        </div>
      </dl>
      {work.recovery === undefined ? null : (
        <p className="petra-work-activity__recovery">
          <strong>Recovery:</strong> {work.recovery}
        </p>
      )}
    </section>
  );
};

export const AvailabilityNote = ({
  availability,
}: {
  availability: AvailabilityNoteViewModel;
}): React.JSX.Element => (
  <section className="petra-foundation-block petra-availability">
    <div className="petra-foundation-block__heading">
      <h3>{availability.actionLabel}</h3>
      <StateMarker
        marker={{
          dimension: "availability",
          value: availability.availability,
        }}
      />
    </div>
    <p>{availability.reason}</p>
    {availability.prerequisite === undefined ? null : (
      <p className="petra-availability__prerequisite">
        <strong>Prerequisite:</strong> {availability.prerequisite}
      </p>
    )}
  </section>
);

export const StateNotice = ({
  notice,
  children,
  announce = false,
}: {
  notice: StateNoticeViewModel;
  children?: ReactNode;
  announce?: boolean;
}): React.JSX.Element => (
  <section
    className="petra-state-notice"
    data-tone={notice.tone}
    {...(announce
      ? { role: notice.tone === "danger" ? "alert" : "status" }
      : {})}
  >
    <span className="petra-state-notice__symbol" aria-hidden="true">
      {notice.tone === "danger" ? "!" : "i"}
    </span>
    <div>
      <h3>{notice.title}</h3>
      <p>{notice.message}</p>
      {notice.recovery === undefined ? null : (
        <p className="petra-state-notice__recovery">
          <strong>Recovery:</strong> {notice.recovery}
        </p>
      )}
      {children}
    </div>
  </section>
);
