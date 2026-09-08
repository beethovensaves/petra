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

export type ProjectPlace = "brief" | "sources";

export const SOURCE_EXTENT_ORDER: SourceExtent[] = [
  "identity_only",
  "preview",
  "partial",
  "complete",
  "restricted",
];
