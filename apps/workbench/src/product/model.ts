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
  placeSummaries?: Array<{
    role: ProjectPlace;
    coverage: "complete" | "partial" | "unavailable";
    label: string;
    summary: string;
    itemCount?: number;
    attentionCount: number;
    limitation?: string;
  }>;
  selection?: {
    state:
      | "current"
      | "historical"
      | "superseded"
      | "missing"
      | "unauthorized"
      | "unsupported";
    semanticKey: string;
    objectId: string;
    requestedRevision?: number;
    resolvedRevision?: number;
    recordHash?: string;
    label?: string;
    summary?: string;
    destination: ProjectPlace;
  };
};

export type EngineState = {
  ok: boolean;
  accepting: boolean;
};

export type ProjectPlace =
  | "brief"
  | "sources"
  | "review"
  | "graph"
  | "work"
  | "petra"
  | "composition"
  | "history"
  | "settings"
  | "profile_tool";

export type ReviewStatus = "needs_decision" | "waiting" | "completed";
export type ReviewSessionLifecycle = "open" | "deferred" | "completed";
export type ValidationState = "passed" | "needs_judgment" | "blocked";

export type ReviewSessionMember = Pick<
  ReviewSession,
  | "candidate"
  | "candidateCorrection"
  | "candidateBasisRevision"
  | "basis"
  | "validation"
  | "consequences"
  | "changeSet"
> & {
  reviewMemberId: string;
  role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
};

export type ReviewSession = {
  id: string;
  projectId: string;
  exactRef: {
    revision: number;
    contentHash: string;
  };
  title: string;
  objective: string;
  status: ReviewStatus;
  statusLabel: string;
  lifecycle?: ReviewSessionLifecycle;
  responsible: string;
  snapshot: string;
  snapshotState: "current" | "stale";
  returnLabel: string;
  returnPath: string;
  reviewMemberId?: string;
  memberRole?: ReviewSessionMember["role"];
  memberOutcome?: ReviewSessionMember["outcome"];
  members?: ReviewSessionMember[];
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
  candidateCorrection?: {
    reviewMemberId: string;
    expectedWorkingCandidateRef: {
      working_candidate_id: string;
      revision: number;
      content_hash: string;
    };
    expectedWorkingRelationshipRef: {
      working_relationship_id: string;
      revision: number;
      content_hash: string;
    };
  };
  candidateBasisRevision?: {
    reviewMemberId: string;
    expectedProjectDefinitionRef: {
      project_definition_id: string;
      revision: number;
      content_hash: string;
      definition_family: string;
    };
    expectedWorkingCandidateRef: {
      working_candidate_id: string;
      revision: number;
      content_hash: string;
    };
    expectedWorkingRelationshipRef: {
      working_relationship_id: string;
      revision: number;
      content_hash: string;
    };
    expectedClaimRef: {
      schema_name: "petra.claim";
      schema_version: "1.0.0";
      record_id: string;
      revision: number;
      record_hash: string;
    };
    projectSourceId: string;
    sourceSpanRefs: Array<{
      schema_name: "petra.source-span";
      schema_version: "1.0.0";
      record_id: string;
      revision: 1;
      record_hash: string;
    }>;
    expectedProjectSourceRef?: {
      project_source_id: string;
      revision: number;
      content_hash: string;
      record_hash: string;
      status: "active";
    };
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
  changeSet?: {
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
  semanticLayer?: GraphLayer;
  endpointPosture?: string;
  validationSummary?: string;
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
  meaning?: string;
  scope?: string;
  direction?: "outgoing";
  semanticLayer?: GraphLayer;
  endpointPosture?: string;
  validationSummary?: string;
  layers: GraphLayer[];
  tone: "neutral" | "positive" | "caution" | "working";
};

export type GraphTextNodeRecord = {
  id: string;
  layer: Exclude<GraphLayer, "historical">;
  kind: string;
  label: string;
  summary: string;
  basis: string;
  endpointPosture?: string;
  validationSummary?: string;
};

export type GraphTextRelationshipRecord = {
  id: string;
  layer: Exclude<GraphLayer, "historical">;
  from: string;
  fromLabel: string;
  direction: "outgoing";
  label: string;
  to: string;
  toLabel: string;
  summary: string;
  meaning: string;
  scope: string;
  basis: string;
  endpointPosture?: string;
  validationSummary?: string;
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
  layerLabels?: Record<GraphLayer, string>;
  positionLabels?: Record<GraphLayer, string>;
  layerCounts?: Record<
    GraphLayer,
    {
      objects: number;
      relationships: number;
      objectLayers?: Partial<Record<GraphLayer, number>>;
    }
  >;
  layerAvailability?: Record<GraphLayer, { available: boolean; label: string }>;
  resultCounts?: Array<{ label: string; value: number }>;
  omissions?: string[];
  limitations?: string[];
  authorityBoundary?: string;
  textualPeer?: {
    title: string;
    scope: string;
    completeness: string;
    nodes: GraphTextNodeRecord[];
    relationships: GraphTextRelationshipRecord[];
    omissions: string[];
  };
  recommendation?: {
    branchNodeId: string;
    label: string;
    rationale: string;
    consequence: string;
  };
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
};

export type WorkExecutionState =
  | "queued"
  | "running"
  | "awaiting_input"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkStageState =
  | "not_started"
  | "ready"
  | "running"
  | "awaiting_input"
  | "completed"
  | "failed"
  | "skipped";

export type InquiryBranch = {
  id: string;
  projectId: string;
  label: string;
  kind: string;
  state: string;
  summary: string;
  dependency: string;
  consequence: string;
  workIds: string[];
  recommended: boolean;
  rationale?: string;
};

export type WorkStage = {
  id: string;
  label: string;
  purpose: string;
  state: WorkStageState;
  stateLabel: string;
  prerequisites: string[];
  accountableRole: string;
  input: string;
  output: string;
  activity: string[];
};

export type WorkUnit = {
  id: string;
  projectId: string;
  objective: string;
  expectedOutcome: string;
  origin: string;
  execution: WorkExecutionState;
  executionLabel: string;
  observedAt: string;
  revision: string;
  currentStageId?: string;
  branchIds: string[];
  elapsed: string;
  estimate: string;
  resourceUse: string;
  authorizedLimit: string;
  cancellation: string;
  requiredInput?: {
    id: string;
    kind: string;
    question: string;
    responsible: string;
    consequence: string;
    responses: string[];
  };
  stages: WorkStage[];
  inputs?: string[];
  dependencies?: string[];
  stagePlanLimitation?: string;
  inquiryLimitation?: string;
  results: Array<{
    id: string;
    label: string;
    status: string;
    validation: string;
    limitation: string;
    destination?: string;
  }>;
  reviewState: string;
};

export type WorkProjectView = {
  projectId: string;
  branches: InquiryBranch[];
  units: WorkUnit[];
  query?: {
    limit: number;
    cursor?: string;
    state?: string;
  };
  page?: {
    totalCount: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  readAt?: string;
};

export type PetraReference = {
  label: string;
  kind: string;
  destination: string;
};

export type PetraMessage = {
  id: string;
  speaker: string;
  origin: string;
  force: "author_instruction" | "explanation_only" | "work_update" | "proposal";
  forceLabel: string;
  content: string;
  references: PetraReference[];
};

export type PetraThread = {
  id: string;
  projectId: string;
  title: string;
  task: string;
  snapshot: string;
  context: string[];
  omissions: string[];
  activeWorkId?: string;
  activeWorkTitle?: string;
  activeWorkSummary?: string;
  activeWorkLinkLabel?: string;
  messages: PetraMessage[];
};

export type CompositionArtifact = {
  id: string;
  projectId: string;
  title: string;
  kind: string;
  objective: string;
  currentRevision: string;
  workingRevision: string;
  currentText: string;
  workingText: string;
  localPersistence: string;
  structure: Array<{ id: string; heading: string; status: string }>;
  provenance: Array<{ statement: string; basis: string; sourceId?: string }>;
  validation: {
    state: string;
    summary: string;
    findings: string[];
    checkedRevision: string;
  };
  outputs: Array<{
    id: string;
    label: string;
    status: string;
    revision: string;
    delivery: string;
  }>;
};

export type HistoryEpisode = {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  actor: string;
  recordedAt: string;
  occurredAt: string;
  action: string;
  authorityEffect: string;
  projectionEffect: string;
  members: string[];
  recovery: string;
  revert: {
    eligible: boolean;
    label: string;
    reason: string;
    consequence: string;
  };
};

export type ProfileToolTask = {
  id: string;
  projectId: string;
  label: string;
  profileLabel: string;
  objective: string;
  capability: string;
  inputs: Array<{ label: string; value: string }>;
  result?: {
    status: string;
    summary: string;
    members: string[];
    limitation: string;
  };
  returnLabel: string;
};

export const SOURCE_EXTENT_ORDER: SourceExtent[] = [
  "identity_only",
  "preview",
  "partial",
  "complete",
  "restricted",
];
