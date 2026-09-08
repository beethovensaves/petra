import type { StateMarkerViewModel } from "../design-system/state.js";

export type ShellViewId =
  "brief" | "evidence" | "graph" | "papers" | "experiments";
export type ShellObjectKind =
  | "research_question"
  | "hypothesis"
  | "claim"
  | "assertion"
  | "work_version"
  | "source_span";

export interface ShellObjectRef {
  kind: ShellObjectKind;
  id: string;
  revision: number;
  label: string;
  descriptor?: string;
}

export interface ShellContextViewModel {
  project: {
    id: string;
    revision: number;
    name: string;
  };
  activeQuestion: ShellObjectRef;
  authorityLabel: string;
  authorityRevision: string;
  projectionLabel: string;
  projectionDetail: string;
  reviewPosture: "inspect" | "guide" | "delegate" | "supervise";
  attentionWorkCount: number;
}

export interface ResearchMapGroupViewModel {
  id: string;
  label: string;
  count?: number;
  items: Array<{
    object: ShellObjectRef;
    current?: boolean;
    status?: string;
  }>;
}

export interface ShellViewOption {
  id: ShellViewId;
  label: string;
  availability: "ready" | "module_pending";
  unavailableReason?: string;
}

export interface EvidenceRowViewModel {
  object: ShellObjectRef;
  text: string;
  basisLabel: string;
  basisId: string;
  scopeSummary: string;
  markers: StateMarkerViewModel[];
}

export interface DetailsViewModel {
  object: ShellObjectRef;
  text: string;
  markers: StateMarkerViewModel[];
  source: {
    versionLabel: string;
    workVersionId: string;
    sourceSpanId: string;
    exactText: string;
    sectionPath: string;
    verification: string;
  };
  scope: {
    task: string;
    outcome: string;
    unreported: string[];
  };
  relationshipView: {
    nodes: ShellObjectRef[];
    edges: Array<{
      from: string;
      to: string;
      label: string;
    }>;
    textualPaths: string[];
  };
  history: Array<{
    label: string;
    at: string;
    detail: string;
  }>;
}

export type FocusedGraphLayout = "neighborhood" | "disagreement" | "provenance";

export type FocusedGraphRelation =
  | "frames"
  | "supports"
  | "contradicts"
  | "qualifies"
  | "asserts"
  | "provenance_for";

export interface FocusedGraphNodeViewModel {
  object: ShellObjectRef;
  depth: number;
  basis: string;
  positions: Record<FocusedGraphLayout, { x: number; y: number }>;
}

export interface FocusedGraphEdgeViewModel {
  id: string;
  from: string;
  to: string;
  relation: FocusedGraphRelation;
  label: string;
}

export interface FocusedGraphViewModel {
  homeNodeId: string;
  selectedNodeId: string;
  snapshotLabel: string;
  snapshotId: string;
  projectionLabel: string;
  maximumDepth: number;
  hasNamedZDimension: boolean;
  nodes: FocusedGraphNodeViewModel[];
  edges: FocusedGraphEdgeViewModel[];
}

export interface AssistantDockViewModel {
  selectedContext: ShellObjectRef;
  capabilitySummary: string;
  message: string;
  work: {
    workUnitId: string;
    objective: string;
    status: string;
    updatedAt: string;
  };
  activity: Array<{
    label: string;
    detail: string;
    state: "complete" | "current" | "pending";
  }>;
}

export interface ResearchShellViewModel {
  context: ShellContextViewModel;
  researchMap: ResearchMapGroupViewModel[];
  views: ShellViewOption[];
  initialView: ShellViewId;
  selectedObject: ShellObjectRef;
  evidenceRows: EvidenceRowViewModel[];
  details: DetailsViewModel;
  focusedGraph: FocusedGraphViewModel;
  assistant: AssistantDockViewModel;
}
