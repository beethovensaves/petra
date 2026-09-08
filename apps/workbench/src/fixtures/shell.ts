import type { ResearchShellViewModel, ShellObjectRef } from "../shell/model.js";

export type ShellContractStatus =
  "mapped" | "provisional" | "presentation_only";

export interface ShellContractMapping {
  field: string;
  status: ShellContractStatus;
  source: string;
}

export interface ShellFixture {
  id: string;
  scenarioId: string;
  title: string;
  summary: string;
  contractRefs: string[];
  contractMappings: ShellContractMapping[];
  viewModel: ResearchShellViewModel;
}

const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const QUESTION_ID = "research_question_01ARZ3NDEKTSV4RRFFQ69G5FD0";
const CLAIM_ID = "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB";
const ASSERTION_ID = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC";
const WORK_VERSION_ID = "work_version_01ARZ3NDEKTSV4RRFFQ69G5FB0";
const SOURCE_SPAN_ID = "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7";
const WORK_UNIT_ID = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2";

const activeQuestion: ShellObjectRef = {
  kind: "research_question",
  id: QUESTION_ID,
  revision: 1,
  label: "Q1",
  descriptor:
    "When does evaluator position bias persist after counterbalancing?",
};

const selectedClaim: ShellObjectRef = {
  kind: "claim",
  id: CLAIM_ID,
  revision: 1,
  label: "Claim",
  descriptor: "The study reports a measurable improvement.",
};

const sourceVersion: ShellObjectRef = {
  kind: "work_version",
  id: WORK_VERSION_ID,
  revision: 1,
  label: "Version of record",
};

const sourceSpan: ShellObjectRef = {
  kind: "source_span",
  id: SOURCE_SPAN_ID,
  revision: 1,
  label: "Exact SourceSpan",
};

const sourceAssertion: ShellObjectRef = {
  kind: "assertion",
  id: ASSERTION_ID,
  revision: 1,
  label: "Source-stated Assertion",
};

export const SELECTED_CLAIM_SHELL_FIXTURE: ShellFixture = {
  id: "selected-claim",
  scenarioId: "UX1.1-FX01",
  title: "Selected Claim with visible context and provenance",
  summary:
    "The main Evidence surface retains priority while Project, question, authority revision, projection lag, selection, Details, Petra context, and requested work remain synchronized.",
  contractRefs: [
    "petra.project@1.0.0",
    "petra.claim@1.0.0",
    "petra.assertion@1.0.0",
    "petra.work-version@1.0.0",
    "petra.source-span@1.0.0",
    "petra.projection-checkpoint@1.0.0",
    "petra.work-unit@1.0.0",
    "UX-REQ-001 provisional ProjectShellView",
  ],
  contractMappings: [
    {
      field: "context.project",
      status: "mapped",
      source: "petra.project@1.0.0",
    },
    {
      field: "context.activeQuestion and researchMap hypotheses",
      status: "provisional",
      source:
        "UX-REQ-001; ResearchQuestion and Hypothesis read models are not yet runtime contracts",
    },
    {
      field: "context authority and projection freshness",
      status: "mapped",
      source: "Project revision plus petra.projection-checkpoint@1.0.0",
    },
    {
      field: "selected Claim and Details source/provenance",
      status: "mapped",
      source:
        "petra.claim, petra.assertion, petra.work-version, and petra.source-span @1.0.0",
    },
    {
      field: "assistant selected context and attention work",
      status: "provisional",
      source:
        "Selection is local view state; WorkUnit fields map to petra.work-unit@1.0.0; composite query is UX-REQ-001",
    },
    {
      field:
        "theme, panel widths, layout preset, editor preferences, active view, and collapse state",
      status: "presentation_only",
      source:
        "Local React view state plus versioned browser preferences; never project or scientific state",
    },
  ],
  viewModel: {
    context: {
      project: {
        id: PROJECT_ID,
        revision: 18,
        name: "Competing explanations",
      },
      activeQuestion,
      authorityLabel: "Project authority",
      authorityRevision: "Revision 18",
      projectionLabel: "Graph revision 17",
      projectionDetail: "Catching up · 1 record pending",
      reviewPosture: "guide",
      attentionWorkCount: 1,
    },
    researchMap: [
      {
        id: "questions",
        label: "Questions",
        count: 1,
        items: [{ object: activeQuestion, current: true }],
      },
      {
        id: "hypotheses",
        label: "Hypotheses",
        count: 2,
        items: [
          {
            object: {
              kind: "hypothesis",
              id: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
              revision: 3,
              label: "H12",
              descriptor: "Position bias persists after counterbalancing",
            },
            status: "Developing",
          },
          {
            object: {
              kind: "hypothesis",
              id: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD2",
              revision: 2,
              label: "H18",
              descriptor: "Observed effects arise from evaluator adaptation",
            },
            status: "Alternative",
          },
        ],
      },
    ],
    views: [
      {
        id: "brief",
        label: "Brief",
        availability: "module_pending",
        unavailableReason:
          "The UX1.2 Research Brief is not part of this shell fixture.",
      },
      { id: "evidence", label: "Evidence", availability: "ready" },
      { id: "graph", label: "Graph", availability: "ready" },
      {
        id: "papers",
        label: "Papers",
        availability: "module_pending",
        unavailableReason:
          "The UX1.3 Papers module is not part of this shell fixture.",
      },
      {
        id: "experiments",
        label: "Experiments",
        availability: "module_pending",
        unavailableReason:
          "The Experiments module is not part of this shell fixture.",
      },
    ],
    initialView: "evidence",
    selectedObject: selectedClaim,
    evidenceRows: [
      {
        object: selectedClaim,
        text: "The study reports a measurable improvement.",
        basisLabel: "Version of record · exact full-text passage",
        basisId: SOURCE_SPAN_ID,
        scopeSummary:
          "Study-defined evaluation task; population, language, dataset, and setting remain unreported.",
        markers: [
          { dimension: "scientific_authority", value: "proposal" },
          {
            dimension: "origin",
            value: "extraction",
            detail:
              "Created from the linked source passage; researcher review is still required.",
          },
          { dimension: "source_depth", value: "full_text" },
        ],
      },
    ],
    details: {
      object: selectedClaim,
      text: "The study reports a measurable improvement.",
      markers: [
        {
          dimension: "scientific_authority",
          value: "proposal",
          detail:
            "Machine-checked quarantine state; no trusted graph mutation has occurred.",
        },
        {
          dimension: "origin",
          value: "extraction",
          detail:
            "Created from the linked source passage; researcher review is still required.",
        },
        { dimension: "source_depth", value: "full_text" },
      ],
      source: {
        versionLabel: "Version of record · peer reviewed · 2025-06",
        workVersionId: WORK_VERSION_ID,
        sourceSpanId: SOURCE_SPAN_ID,
        exactText: "measurable improvement",
        sectionPath: "Results · Paragraph 1 · page 1",
        verification: "Exact text and geometry verified",
      },
      scope: {
        task: "The study-defined evaluation task",
        outcome: "Measurable improvement in the reported metric",
        unreported: [
          "population",
          "language",
          "model family",
          "dataset",
          "setting",
        ],
      },
      relationshipView: {
        nodes: [sourceVersion, sourceSpan, sourceAssertion, selectedClaim],
        edges: [
          {
            from: WORK_VERSION_ID,
            to: ASSERTION_ID,
            label: "subject of ASSERTS",
          },
          { from: ASSERTION_ID, to: CLAIM_ID, label: "ASSERTS" },
          {
            from: SOURCE_SPAN_ID,
            to: ASSERTION_ID,
            label: "provenance for",
          },
        ],
        textualPaths: [
          "Version of record → source-stated Assertion → ASSERTS → Claim",
          "Exact SourceSpan → provenance for → source-stated Assertion",
        ],
      },
      history: [
        {
          label: "Extracted and machine checked",
          at: "2026-08-28 18:12 UTC",
          detail:
            "The exact SourceSpan resolved and scope-preservation validation passed. The Claim remains a proposal.",
        },
      ],
    },
    focusedGraph: {
      homeNodeId: QUESTION_ID,
      selectedNodeId: CLAIM_ID,
      snapshotLabel: "Project revision 18",
      snapshotId: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FG0",
      projectionLabel: "revision 17 · 1 record pending",
      maximumDepth: 2,
      hasNamedZDimension: false,
      nodes: [
        {
          object: activeQuestion,
          depth: 0,
          basis: "Active project research question",
          positions: {
            neighborhood: { x: 120, y: 260 },
            disagreement: { x: 110, y: 250 },
            provenance: { x: 110, y: 110 },
          },
        },
        {
          object: {
            kind: "hypothesis",
            id: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
            revision: 3,
            label: "H12",
            descriptor: "Position bias persists after counterbalancing",
          },
          depth: 1,
          basis: "Researcher-authored hypothesis at revision 3",
          positions: {
            neighborhood: { x: 360, y: 175 },
            disagreement: { x: 485, y: 250 },
            provenance: { x: 300, y: 110 },
          },
        },
        {
          object: {
            kind: "hypothesis",
            id: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD2",
            revision: 2,
            label: "H18",
            descriptor: "Observed effects arise from evaluator adaptation",
          },
          depth: 1,
          basis: "Alternative researcher-authored hypothesis at revision 2",
          positions: {
            neighborhood: { x: 360, y: 355 },
            disagreement: { x: 250, y: 400 },
            provenance: { x: 300, y: 410 },
          },
        },
        {
          object: selectedClaim,
          depth: 2,
          basis: "Exact full-text passage from the version of record",
          positions: {
            neighborhood: { x: 650, y: 100 },
            disagreement: { x: 740, y: 90 },
            provenance: { x: 525, y: 110 },
          },
        },
        {
          object: {
            kind: "claim",
            id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FC8",
            revision: 2,
            label: "Contrary Claim",
            descriptor: "The position effect disappears under order balancing.",
          },
          depth: 2,
          basis: "Independent full-text extraction awaiting researcher review",
          positions: {
            neighborhood: { x: 650, y: 245 },
            disagreement: { x: 740, y: 250 },
            provenance: { x: 525, y: 260 },
          },
        },
        {
          object: {
            kind: "claim",
            id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FC9",
            revision: 1,
            label: "Scope qualifier",
            descriptor: "The reported effect is limited to novice evaluators.",
          },
          depth: 2,
          basis: "Abstract-only extraction with a visible source limitation",
          positions: {
            neighborhood: { x: 650, y: 400 },
            disagreement: { x: 740, y: 410 },
            provenance: { x: 525, y: 410 },
          },
        },
        {
          object: sourceAssertion,
          depth: 2,
          basis: "Source-stated assertion linked by the ASSERTS relation",
          positions: {
            neighborhood: { x: 890, y: 110 },
            disagreement: { x: 980, y: 90 },
            provenance: { x: 735, y: 110 },
          },
        },
        {
          object: sourceSpan,
          depth: 2,
          basis: "Verified exact text and document geometry",
          positions: {
            neighborhood: { x: 890, y: 260 },
            disagreement: { x: 980, y: 250 },
            provenance: { x: 930, y: 110 },
          },
        },
        {
          object: sourceVersion,
          depth: 2,
          basis: "Registered version of record",
          positions: {
            neighborhood: { x: 890, y: 410 },
            disagreement: { x: 980, y: 410 },
            provenance: { x: 1110, y: 110 },
          },
        },
      ],
      edges: [
        {
          id: "edge-question-h12",
          from: QUESTION_ID,
          to: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
          relation: "frames",
          label: "frames",
        },
        {
          id: "edge-question-h18",
          from: QUESTION_ID,
          to: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD2",
          relation: "frames",
          label: "frames alternative",
        },
        {
          id: "edge-claim-supports-h12",
          from: CLAIM_ID,
          to: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
          relation: "supports",
          label: "supports",
        },
        {
          id: "edge-claim-contradicts-h12",
          from: "claim_01ARZ3NDEKTSV4RRFFQ69G5FC8",
          to: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
          relation: "contradicts",
          label: "contradicts",
        },
        {
          id: "edge-claim-qualifies-h12",
          from: "claim_01ARZ3NDEKTSV4RRFFQ69G5FC9",
          to: "hypothesis_01ARZ3NDEKTSV4RRFFQ69G5FD1",
          relation: "qualifies",
          label: "qualifies",
        },
        {
          id: "edge-assertion-claim",
          from: ASSERTION_ID,
          to: CLAIM_ID,
          relation: "asserts",
          label: "asserts",
        },
        {
          id: "edge-span-assertion",
          from: SOURCE_SPAN_ID,
          to: ASSERTION_ID,
          relation: "provenance_for",
          label: "provenance for",
        },
        {
          id: "edge-version-assertion",
          from: WORK_VERSION_ID,
          to: ASSERTION_ID,
          relation: "provenance_for",
          label: "source for",
        },
      ],
    },
    assistant: {
      selectedContext: selectedClaim,
      capabilitySummary:
        "Petra may inspect registered sources and draft proposals. Applying a proposal to trusted project data still requires an explicit review step.",
      message:
        "The selected Claim is grounded in an exact full-text passage. Its scope remains incomplete, and it has not been applied to the trusted graph.",
      work: {
        workUnitId: WORK_UNIT_ID,
        objective: "Parse the exact registered PDF without mutating authority.",
        status: "Requested",
        updatedAt: "2026-08-29 14:00 UTC",
      },
      activity: [
        {
          label: "Request recorded",
          detail: "WorkUnit identity and requested scope are preserved.",
          state: "complete",
        },
        {
          label: "Waiting to start",
          detail: "No tool execution or authority mutation has occurred.",
          state: "current",
        },
        {
          label: "Review result",
          detail: "The result path is shown after execution and validation.",
          state: "pending",
        },
      ],
    },
  },
};
