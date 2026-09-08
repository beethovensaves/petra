export type ProjectProfile = {
  id: string;
  version: string;
  label: string;
  description: string;
  compatibility: string;
  terms: {
    focus: string;
    focusPlural: string;
    finding: string;
    findingPlural: string;
    reference: string;
    referencePlural: string;
  };
};

export type ProjectState = "ready" | "attention" | "early";
export type ProjectionState = "current" | "catching_up" | "unavailable";
export type SourceExtent =
  "identity_only" | "preview" | "partial" | "complete" | "restricted";

export type SourceRecord = {
  id: string;
  title: string;
  kind: string;
  role: string;
  creator: string;
  revision: string;
  copy: string;
  location: string;
  addedAt: string;
  extent: SourceExtent;
  extentLabel: string;
  rights: string;
  downstreamUse: string;
  limitation?: string;
  excerpt?: {
    heading: string;
    locator: string;
    text: string;
    context: string;
  };
};

export type AttentionItem = {
  id: string;
  title: string;
  summary: string;
  consequence: string;
  recommendation: string;
  rationale: string;
  alternatives: string[];
  sourceId?: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  objective: string;
  updatedAt: string;
  state: ProjectState;
  stateLabel: string;
  profile: ProjectProfile;
  snapshot: {
    id: string;
    label: string;
    asOf: string;
  };
  projection: {
    state: ProjectionState;
    label: string;
    detail: string;
  };
  focus: {
    label: string;
    value: string;
    summary: string;
  };
  baselineChange: string;
  attention: AttentionItem[];
  recentDecisions: string[];
  sources: SourceRecord[];
};

export type EngineState = {
  ok: boolean;
  accepting: boolean;
};

export type ProjectPlace = "brief" | "sources" | "review" | "graph";

export type ReviewStatus = "needs_decision" | "waiting" | "completed";
export type ValidationState = "passed" | "needs_judgment" | "blocked";

export type ReviewSession = {
  id: string;
  projectId: string;
  title: string;
  objective: string;
  status: ReviewStatus;
  statusLabel: string;
  responsible: string;
  snapshot: string;
  returnLabel: string;
  candidate: {
    id: string;
    revision: string;
    kind: string;
    current: string;
    proposed: string;
    difference: string;
    origin: string;
    originDetail: string;
  };
  basis: Array<{
    id: string;
    label: string;
    relation: string;
    extent: string;
    detail: string;
    sourceId?: string;
  }>;
  validation: {
    state: ValidationState;
    label: string;
    detail: string;
    recovery?: string;
  };
  consequences: string[];
  changeSet: {
    id: string;
    revision: string;
    atomicity: string;
    changes: string[];
    protected: string[];
  };
};

export type GraphLayer = "current" | "working" | "historical";
export type GraphViewMode = "graph" | "text";

export type GraphNodeRecord = {
  id: string;
  label: string;
  kind: string;
  summary: string;
  basis: string;
  sourceId?: string;
  layers: GraphLayer[];
  position: { x: number; y: number };
};

export type GraphEdgeRecord = {
  id: string;
  from: string;
  to: string;
  label: string;
  summary: string;
  basis: string;
  layers: GraphLayer[];
  tone: "neutral" | "positive" | "caution" | "working";
};

export type GraphQuestion = {
  id: string;
  projectId: string;
  question: string;
  focusNodeId: string;
  scope: string;
  completeness: string;
  authoritativeSnapshot: string;
  representedSnapshot: string;
  historicalSnapshot: string;
  workingRevision: string;
  projectionState: ProjectionState;
  projectionDetail: string;
  recommendation: {
    branchNodeId: string;
    label: string;
    rationale: string;
    consequence: string;
  };
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
};

export const SOURCE_EXTENT_ORDER: SourceExtent[] = [
  "identity_only",
  "preview",
  "partial",
  "complete",
  "restricted",
];
