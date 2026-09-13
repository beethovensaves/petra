import type {
  CompositionArtifact,
  GraphQuestion,
  HistoryEpisode,
  PetraThread,
  ProfileToolTask,
  ProjectProfile,
  ProjectRecord,
  ReviewSession,
  SourceRecord,
  WorkProjectView,
} from "./model.js";

const inquiryProfile: ProjectProfile = {
  id: "profile.inquiry",
  version: "1.0.0",
  label: "Evidence inquiry",
  description:
    "Organizes questions, findings, and references without changing Petra's shared authority and recovery rules.",
  compatibility: "Petra profile contract 1.0",
  terms: {
    focus: "Inquiry",
    focusPlural: "Inquiries",
    finding: "Finding",
    findingPlural: "Findings",
    reference: "Source",
    referencePlural: "Sources",
  },
};

const publicationProfile: ProjectProfile = {
  id: "profile.controlled-publication",
  version: "1.0.0",
  label: "Controlled publication",
  description:
    "Organizes requirements, passages, and references while preserving the same Petra project grammar.",
  compatibility: "Petra profile contract 1.0",
  terms: {
    focus: "Requirement",
    focusPlural: "Requirements",
    finding: "Passage",
    findingPlural: "Passages",
    reference: "Reference",
    referencePlural: "References",
  },
};

const decisionProfile: ProjectProfile = {
  id: "profile.decision-analysis",
  version: "1.0.0",
  label: "Decision analysis",
  description:
    "Organizes decision questions, constraints, and records within Petra's shared project controls.",
  compatibility: "Petra profile contract 1.0",
  terms: {
    focus: "Decision question",
    focusPlural: "Decision questions",
    finding: "Constraint",
    findingPlural: "Constraints",
    reference: "Record",
    referencePlural: "Records",
  },
};

const inletSources: SourceRecord[] = [
  {
    id: "src-observation-log",
    title: "Inlet observation log",
    kind: "Field record",
    role: "Primary observations for the active inquiry",
    creator: "Synthetic field team",
    revision: "Revision 3",
    copy: "Local copy LC-104",
    location: "Section 4 · entries 18–24",
    addedAt: "2026-08-28",
    extent: "complete",
    extentLabel: "Complete for declared scope",
    rights: "Private project use",
    downstreamUse: "Basis for 3 findings and 1 unresolved comparison",
    excerpt: {
      heading: "Evening cycle",
      locator: "Section 4 · entry 21",
      text: "The closing interval shortened after the second adjustment, while the upstream reading remained within the declared tolerance.",
      context:
        "Entries 18–24 describe the same operating window. Entry 21 is the exact basis currently cited by the active finding.",
    },
  },
  {
    id: "src-maintenance-note",
    title: "Actuator maintenance note",
    kind: "Service note",
    role: "Candidate explanation for the interval change",
    creator: "Synthetic maintenance desk",
    revision: "Revision 1",
    copy: "Identity record IR-228",
    location: "Copy not yet processed",
    addedAt: "2026-09-02",
    extent: "identity_only",
    extentLabel: "Identity only",
    rights: "Permission status unresolved",
    downstreamUse: "Referenced by 2 unresolved inquiry branches",
    limitation:
      "Petra can confirm identity and revision, but cannot inspect or cite content until a permitted copy is processed.",
  },
  {
    id: "src-threshold-table",
    title: "Operating threshold table",
    kind: "Reference table",
    role: "Defines the comparison tolerance",
    creator: "Synthetic operations group",
    revision: "Revision 6",
    copy: "Local copy LC-131",
    location: "Rows 7–12",
    addedAt: "2026-08-19",
    extent: "partial",
    extentLabel: "Partial content",
    rights: "Private project use",
    downstreamUse: "Basis for the active comparison boundary",
    limitation: "Only the declared operating-range rows are available.",
    excerpt: {
      heading: "Declared operating range",
      locator: "Rows 7–12 · row 9 selected",
      text: "For a standard evening cycle, variation within 0.8 units remains inside the review tolerance.",
      context:
        "The retained copy contains rows 7–12. Petra does not claim coverage outside that range.",
    },
  },
];

export const REFERENCE_PROJECTS: ProjectRecord[] = [
  {
    id: "inlet-cycle",
    title: "Inlet cycle review",
    objective:
      "Determine which operating condition best explains the shortened closing interval.",
    updatedAt: "Today, 14:20",
    state: "attention",
    stateLabel: "Needs attention",
    profile: inquiryProfile,
    snapshot: {
      id: "snapshot-018",
      label: "Snapshot 18",
      asOf: "2026-09-07 14:18",
    },
    projection: {
      state: "catching_up",
      label: "Projection catching up",
      detail:
        "The authoritative snapshot is current. Relationship counts may omit the last accepted change.",
    },
    focus: {
      label: "Active inquiry",
      value: "What explains the shorter closing interval?",
      summary:
        "Two viable branches remain: a control adjustment and an actuator service event.",
    },
    baselineChange:
      "Since Snapshot 17, one observation was accepted and the service-event branch gained a second dependency.",
    attention: [
      {
        id: "attention-source-depth",
        title: "One branch depends on an unprocessed source",
        summary:
          "The service-event branch depends on a maintenance note whose identity is known but whose content is unavailable.",
        consequence:
          "Reviewing that branch now would leave its central explanation without inspectable source content.",
        recommendation: "Process the maintenance note first",
        rationale:
          "It is the earliest unresolved dependency shared by two downstream questions, so resolving it removes the most uncertainty with one action.",
        alternatives: [
          "Continue with the control-adjustment branch",
          "Compare the available observations",
          "Defer the inquiry without changing either branch",
        ],
        sourceId: "src-maintenance-note",
      },
    ],
    recentDecisions: [
      "Accepted observation entry 21 as a basis for the interval finding.",
      "Kept both explanation branches open after the threshold comparison.",
    ],
    sources: inletSources,
  },
  {
    id: "field-guide",
    title: "Harbor field guide revision",
    objective:
      "Prepare a traceable revision whose safety language matches the approved requirements.",
    updatedAt: "Yesterday, 17:45",
    state: "ready",
    stateLabel: "Ready to continue",
    profile: publicationProfile,
    snapshot: {
      id: "snapshot-011",
      label: "Snapshot 11",
      asOf: "2026-09-06 17:43",
    },
    projection: {
      state: "current",
      label: "Projection current",
      detail: "All derived views use Snapshot 11.",
    },
    focus: {
      label: "Active requirement",
      value: "Keep emergency instructions exact and locally verifiable",
      summary:
        "Two passages are linked to the approved wording and await final comparison.",
    },
    baselineChange:
      "Since Snapshot 10, one passage was revised and its source locator was restored.",
    attention: [],
    recentDecisions: [
      "Retained the approved emergency verb in the opening instruction.",
    ],
    sources: [
      {
        id: "src-approved-language",
        title: "Approved emergency language",
        kind: "Controlled reference",
        role: "Governing reference for two passages",
        creator: "Synthetic editorial authority",
        revision: "Revision 5",
        copy: "Local copy LC-207",
        location: "Clause 2.4",
        addedAt: "2026-09-04",
        extent: "complete",
        extentLabel: "Complete for declared scope",
        rights: "Private project use",
        downstreamUse: "Governs 2 current passages",
        excerpt: {
          heading: "Emergency sequence",
          locator: "Clause 2.4",
          text: "Close the marked inlet before leaving the platform.",
          context:
            "Clause 2.4 is the approved source for the two passages under comparison.",
        },
      },
    ],
  },
  {
    id: "north-loop",
    title: "North loop service plan",
    objective:
      "Choose a service sequence that meets access, staffing, and continuity constraints.",
    updatedAt: "September 4",
    state: "early",
    stateLabel: "Early project",
    profile: decisionProfile,
    snapshot: {
      id: "snapshot-003",
      label: "Snapshot 3",
      asOf: "2026-09-04 09:12",
    },
    projection: {
      state: "current",
      label: "Projection current",
      detail: "All derived views use Snapshot 3.",
    },
    focus: {
      label: "Decision question",
      value: "Which sequence preserves morning access?",
      summary:
        "Initial constraints are recorded; alternatives are not yet ranked.",
    },
    baselineChange:
      "Since Snapshot 2, the morning-access constraint was added.",
    attention: [],
    recentDecisions: ["Recorded morning access as a required constraint."],
    sources: [],
  },
];

export const getReferenceProject = (
  projectId: string | undefined,
): ProjectRecord | undefined =>
  REFERENCE_PROJECTS.find((project) => project.id === projectId);

export const getReferenceSource = (
  project: ProjectRecord,
  sourceId: string | undefined,
): SourceRecord | undefined =>
  project.sources.find((source) => source.id === sourceId);

export const REFERENCE_REVIEWS: ReviewSession[] = [
  {
    id: "review-service-link",
    projectId: "inlet-cycle",
    exactRef: {
      revision: 2,
      contentHash: `sha256:${"a".repeat(64)}`,
    },
    title: "Service-event relationship",
    objective:
      "Decide whether the working relationship is ready to enter the accepted Project state.",
    status: "needs_decision",
    statusLabel: "Needs your decision",
    responsible: "Project author",
    snapshot: "Snapshot 18",
    snapshotState: "current",
    returnLabel: "Inlet cycle review",
    returnPath: "/projects/inlet-cycle/brief#attention-source-depth",
    candidate: {
      id: "candidate-service-link",
      revision: "Candidate revision 2",
      kind: "Relationship candidate",
      current: "No accepted relationship",
      proposed:
        "Actuator service event may explain the shortened closing interval.",
      difference:
        "Adds a qualifying explanation branch and links it to the maintenance note as its principal basis.",
      origin: "Inquiry analyst",
      originDetail:
        "Created by synthetic Work task work-inquiry-014 from Snapshot 18 inputs.",
    },
    basis: [
      {
        id: "basis-maintenance-note",
        label: "Actuator maintenance note",
        relation: "Principal basis",
        extent: "Identity only",
        detail:
          "Identity and revision are known; source content and permission are unresolved.",
        sourceId: "src-maintenance-note",
      },
      {
        id: "basis-observation-log",
        label: "Inlet observation log · entry 21",
        relation: "Qualifying observation",
        extent: "Complete for declared scope",
        detail:
          "The observation records the changed interval but does not identify the cause.",
        sourceId: "src-observation-log",
      },
    ],
    validation: {
      state: "blocked",
      label: "Commitment blocked",
      detail:
        "The principal basis has no inspectable content and its use permission is unresolved.",
      recovery:
        "Process a permitted copy or change the candidate's principal basis, then refresh Review.",
    },
    consequences: [
      "Create one accepted qualifying relationship.",
      "Add the service-event branch to two downstream inquiry views.",
      "Keep the control-adjustment branch accepted and unchanged.",
      "Update relationship projections after the authoritative event commits.",
    ],
    commitment: { available: true },
    changeSet: {
      id: "changeset-service-link",
      revision: "Preview revision 2",
      atomicity: "One atomic ChangeSet · 1 proposed change",
      changes: [
        "Create: qualifying explanation relationship from service event to active inquiry.",
      ],
      protected: [
        "No source content changes.",
        "No accepted finding is replaced or removed.",
        "No Work task is started or cancelled.",
      ],
    },
  },
];

export const getProjectReviews = (projectId: string): ReviewSession[] =>
  REFERENCE_REVIEWS.filter((review) => review.projectId === projectId);

export const getReferenceReview = (
  projectId: string,
  reviewId: string | undefined,
): ReviewSession | undefined =>
  REFERENCE_REVIEWS.find(
    (review) => review.projectId === projectId && review.id === reviewId,
  );

export const REFERENCE_GRAPHS: GraphQuestion[] = [
  {
    id: "graph-closing-interval",
    projectId: "inlet-cycle",
    question:
      "What recorded branches could explain the shorter closing interval?",
    focusNodeId: "node-inquiry",
    scope:
      "Immediate recorded explanations, their principal basis, and one downstream inquiry dependency.",
    completeness:
      "Complete for the declared depth in the represented snapshot; restricted content remains identified but unread.",
    authoritativeSnapshot: "Snapshot 18",
    representedSnapshot: "Snapshot 17",
    historicalSnapshot: "Snapshot 14",
    workingRevision: "Working revision 6 · based on Snapshot 18",
    projectionState: "catching_up",
    projectionDetail:
      "The graph safely represents Snapshot 17. Snapshot 18 is authoritative and available through Brief and Review while this projection catches up.",
    recommendation: {
      branchNodeId: "node-service-event",
      label: "Resolve the service-event branch first",
      rationale:
        "Its maintenance note is the earliest unresolved dependency shared by two downstream questions.",
      consequence:
        "Following another branch is valid and leaves this recommendation open; it does not damage accepted Project state.",
    },
    nodes: [
      {
        id: "node-inquiry",
        label: "Shorter closing interval",
        kind: "Inquiry",
        summary: "The active question being answered by this bounded graph.",
        basis: "Project focus at the represented or working position.",
        layers: ["current", "working", "historical"],
        position: { x: 50, y: 14 },
      },
      {
        id: "node-control-adjustment",
        label: "Control adjustment",
        kind: "Explanation branch",
        summary: "An accepted branch linked to the interval inquiry.",
        basis: "Accepted Project relationship at Snapshot 17.",
        layers: ["current", "working", "historical"],
        position: { x: 24, y: 42 },
      },
      {
        id: "node-observation",
        label: "Observation entry 21",
        kind: "Finding",
        summary:
          "Records the shorter interval in the current operating window.",
        basis: "Inlet observation log · Revision 3 · entry 21.",
        sourceId: "src-observation-log",
        layers: ["current", "working"],
        position: { x: 76, y: 42 },
      },
      {
        id: "node-threshold",
        label: "Review tolerance",
        kind: "Constraint",
        summary: "Defines the declared tolerance used in the comparison.",
        basis: "Operating threshold table · Revision 6 · row 9.",
        sourceId: "src-threshold-table",
        layers: ["current", "working", "historical"],
        position: { x: 18, y: 76 },
      },
      {
        id: "node-service-event",
        label: "Actuator service event",
        kind: "Working explanation",
        summary:
          "A non-authoritative branch whose principal basis cannot yet be inspected.",
        basis: "Working candidate revision 2; maintenance note identity only.",
        sourceId: "src-maintenance-note",
        layers: ["working"],
        position: { x: 52, y: 68 },
      },
      {
        id: "node-followup",
        label: "Timing dependency",
        kind: "Downstream inquiry",
        summary: "A second inquiry that depends on resolving the event timing.",
        basis: "Recorded dependency in Working revision 6.",
        layers: ["working"],
        position: { x: 82, y: 80 },
      },
    ],
    edges: [
      {
        id: "edge-control-frames",
        from: "node-control-adjustment",
        to: "node-inquiry",
        label: "may explain",
        summary: "Accepted explanation branch.",
        basis: "Accepted relationship at Snapshot 17.",
        layers: ["current", "working", "historical"],
        tone: "positive",
      },
      {
        id: "edge-observation-qualifies",
        from: "node-observation",
        to: "node-inquiry",
        label: "records",
        summary:
          "The observation records the interval change without assigning cause.",
        basis: "Observation log · entry 21.",
        layers: ["current", "working"],
        tone: "neutral",
      },
      {
        id: "edge-threshold-constrains",
        from: "node-threshold",
        to: "node-control-adjustment",
        label: "constrains",
        summary: "The tolerance constrains interpretation of the adjustment.",
        basis: "Threshold table · row 9.",
        layers: ["current", "working", "historical"],
        tone: "caution",
      },
      {
        id: "edge-service-qualifies",
        from: "node-service-event",
        to: "node-inquiry",
        label: "may explain",
        summary: "Working relationship awaiting inspectable principal basis.",
        basis: "Candidate revision 2; validation blocked.",
        layers: ["working"],
        tone: "working",
      },
      {
        id: "edge-followup-depends",
        from: "node-followup",
        to: "node-service-event",
        label: "depends on",
        summary: "The downstream timing inquiry shares this unresolved branch.",
        basis: "Working revision 6 dependency record.",
        layers: ["working"],
        tone: "working",
      },
    ],
  },
];

export const getProjectGraph = (projectId: string): GraphQuestion | undefined =>
  REFERENCE_GRAPHS.find((graph) => graph.projectId === projectId);

export const REFERENCE_WORK: WorkProjectView[] = [
  {
    projectId: "inlet-cycle",
    branches: [
      {
        id: "branch-service-event",
        projectId: "inlet-cycle",
        label: "Actuator service event",
        kind: "Explanation path",
        state: "Blocked by source depth",
        summary:
          "Tests whether a service event changed the closing interval through a traceable timing relationship.",
        dependency: "A permitted, inspectable actuator maintenance note",
        consequence:
          "Two downstream questions remain qualified until this dependency is resolved.",
        workIds: ["work-process-maintenance", "work-compare-timing"],
        recommended: true,
        rationale:
          "This is the earliest unresolved dependency shared by two questions, and one source action can clarify both.",
      },
      {
        id: "branch-control-adjustment",
        projectId: "inlet-cycle",
        label: "Control adjustment",
        kind: "Explanation path",
        state: "Active comparison",
        summary:
          "Checks whether the accepted adjustment and the observed interval align within the declared tolerance.",
        dependency: "Observation entry 21 and threshold row 9",
        consequence:
          "This branch can proceed independently while source permission is unresolved.",
        workIds: ["work-compare-adjustment"],
        recommended: false,
      },
      {
        id: "branch-observation-quality",
        projectId: "inlet-cycle",
        label: "Observation comparability",
        kind: "Quality path",
        state: "Ready to inspect",
        summary:
          "Examines whether compared entries share the same operating window and measurement boundary.",
        dependency: "Complete observation entries 18–24",
        consequence:
          "It may qualify both explanation paths without selecting either one.",
        workIds: [],
        recommended: false,
      },
    ],
    units: [
      {
        id: "work-process-maintenance",
        projectId: "inlet-cycle",
        objective: "Establish inspectable maintenance-note coverage",
        expectedOutcome:
          "A permitted processed copy, or an exact finding that processing cannot proceed.",
        origin: "Brief recommendation · attention-source-depth",
        execution: "awaiting_input",
        executionLabel: "Awaiting input",
        observedAt: "2026-09-07 14:20",
        revision: "Work revision 4",
        currentStageId: "stage-permission",
        branchIds: ["branch-service-event"],
        elapsed: "8 minutes observed",
        estimate: "Unknown until a permitted copy is selected",
        resourceUse: "No model or processing use recorded",
        authorizedLimit: "Existing local-source capability only",
        cancellation:
          "Cancellation is unavailable while the input request is open; deciding later leaves the task waiting.",
        requiredInput: {
          id: "input-maintenance-copy",
          kind: "Capability and source choice",
          question: "Which permitted local copy may Petra process?",
          responsible: "Project author",
          consequence:
            "Without a permitted copy, Petra can retain identity but cannot inspect or cite the note's content.",
          responses: [
            "Choose a permitted local copy",
            "Continue another inquiry branch",
            "Decide later and leave this Work waiting",
          ],
        },
        stages: [
          {
            id: "stage-identify",
            label: "Confirm identity",
            purpose: "Bind the exact source identity and revision.",
            state: "completed",
            stateLabel: "Completed",
            prerequisites: [],
            accountableRole: "Source registrar",
            input: "Identity record IR-228",
            output: "Actuator maintenance note · Revision 1",
            activity: [
              "14:12 · Matched the source title and revision to IR-228.",
              "14:13 · Recorded identity-only coverage.",
            ],
          },
          {
            id: "stage-permission",
            label: "Resolve permitted copy",
            purpose:
              "Identify a local copy and permission sufficient for processing.",
            state: "awaiting_input",
            stateLabel: "Awaiting input",
            prerequisites: ["Confirm identity"],
            accountableRole: "Project author",
            input: "Open input request input-maintenance-copy",
            output: "No copy selected",
            activity: [
              "14:20 · Requested an exact permitted-copy choice from the Project author.",
            ],
          },
          {
            id: "stage-process",
            label: "Process selected copy",
            purpose:
              "Create an inspectable representation with exact locations.",
            state: "not_started",
            stateLabel: "Not started",
            prerequisites: ["Resolve permitted copy"],
            accountableRole: "Source processor",
            input: "No permitted copy available",
            output: "No representation",
            activity: [],
          },
          {
            id: "stage-validate",
            label: "Validate coverage",
            purpose: "Declare processing extent, rights, and usable locations.",
            state: "not_started",
            stateLabel: "Not started",
            prerequisites: ["Process selected copy"],
            accountableRole: "Coverage validator",
            input: "No processed representation",
            output: "No coverage finding",
            activity: [],
          },
        ],
        results: [],
        reviewState: "No candidate or Review decision produced",
      },
      {
        id: "work-compare-adjustment",
        projectId: "inlet-cycle",
        objective: "Compare control adjustment timing with observations",
        expectedOutcome:
          "A bounded comparison finding with exact observation and threshold basis.",
        origin: "Control-adjustment inquiry path",
        execution: "running",
        executionLabel: "Running",
        observedAt: "2026-09-07 14:22",
        revision: "Work revision 7",
        currentStageId: "stage-align",
        branchIds: ["branch-control-adjustment"],
        elapsed: "3 minutes 18 seconds measured",
        estimate: "No finish-time estimate supplied",
        resourceUse: "2 source reads measured · cost not supplied",
        authorizedLimit: "Up to 6 source reads",
        cancellation:
          "Cancellable after the current source read completes; retained partial output is diagnostic only.",
        stages: [
          {
            id: "stage-gather",
            label: "Gather exact inputs",
            purpose: "Resolve the observation and threshold revisions.",
            state: "completed",
            stateLabel: "Completed",
            prerequisites: [],
            accountableRole: "Comparison worker",
            input: "Observation log Revision 3; threshold table Revision 6",
            output: "Two exact input references",
            activity: ["14:19 · Resolved entry 21 and threshold row 9."],
          },
          {
            id: "stage-align",
            label: "Align operating windows",
            purpose:
              "Check that the time and tolerance scopes can be compared.",
            state: "running",
            stateLabel: "Running",
            prerequisites: ["Gather exact inputs"],
            accountableRole: "Comparison worker",
            input: "Two exact input references",
            output: "Alignment pending",
            activity: [
              "14:21 · Matched the declared evening-cycle interval.",
              "14:22 · Checking the remaining tolerance boundary.",
            ],
          },
          {
            id: "stage-evaluate",
            label: "Evaluate difference",
            purpose: "Produce the bounded comparison finding.",
            state: "ready",
            stateLabel: "Ready after dependency",
            prerequisites: ["Align operating windows"],
            accountableRole: "Comparison validator",
            input: "Aligned operating window",
            output: "No finding yet",
            activity: [],
          },
        ],
        results: [],
        reviewState: "No candidate or Review decision produced",
      },
      {
        id: "work-compare-timing",
        projectId: "inlet-cycle",
        objective: "Compare service timing with interval change",
        expectedOutcome:
          "A timing finding grounded in the maintenance note and observation log.",
        origin: "Service-event inquiry path",
        execution: "queued",
        executionLabel: "Blocked by dependency",
        observedAt: "2026-09-07 14:20",
        revision: "Work revision 2",
        currentStageId: "stage-wait-source",
        branchIds: ["branch-service-event"],
        elapsed: "Not started",
        estimate: "Unknown until source coverage resolves",
        resourceUse: "No use recorded",
        authorizedLimit: "Inherited from the existing inquiry task",
        cancellation:
          "May be cancelled before execution starts; no output would be retained.",
        stages: [
          {
            id: "stage-wait-source",
            label: "Wait for source coverage",
            purpose:
              "Require inspectable maintenance-note content before comparison.",
            state: "not_started",
            stateLabel: "Dependency blocked",
            prerequisites: ["work-process-maintenance usable result"],
            accountableRole: "Timing analyst",
            input: "Maintenance note identity only",
            output: "No comparison",
            activity: [],
          },
        ],
        results: [],
        reviewState: "No candidate or Review decision produced",
      },
    ],
  },
];

export const getProjectWork = (
  projectId: string,
): WorkProjectView | undefined =>
  REFERENCE_WORK.find((work) => work.projectId === projectId);

export const getReferenceWorkUnit = (
  projectId: string,
  workId: string | undefined,
) => getProjectWork(projectId)?.units.find((work) => work.id === workId);

export const REFERENCE_PETRA_THREADS: PetraThread[] = [
  {
    id: "thread-inlet-brief",
    projectId: "inlet-cycle",
    title: "Closing-interval inquiry",
    task: "Understand which inquiry branch to resolve next",
    snapshot: "Snapshot 18",
    context: [
      "Active inquiry: What explains the shorter closing interval?",
      "Selected recommendation: resolve the service-event branch first",
      "Working candidate: candidate-service-link revision 2",
      "Projection: Graph safely represents Snapshot 17 while Snapshot 18 is authoritative",
    ],
    omissions: [
      "Maintenance-note content is unavailable",
      "No unbounded Project sources or private file paths are included",
      "No authority to apply or reject a candidate is included",
    ],
    activeWorkId: "work-process-maintenance",
    messages: [
      {
        id: "message-author-1",
        speaker: "Project author",
        origin: "Author instruction",
        force: "author_instruction",
        forceLabel: "Direction within current scope",
        content:
          "Explain why Petra recommends the service-event branch, and whether choosing the adjustment branch would harm the Project.",
        references: [],
      },
      {
        id: "message-petra-1",
        speaker: "Petra inquiry guide",
        origin: "Model response grounded in the disclosed context",
        force: "explanation_only",
        forceLabel: "Explanation only · no state changed",
        content:
          "The service-event branch comes first because its unprocessed maintenance note is the earliest unresolved dependency shared by two downstream questions. Resolving it could clarify both questions with one source action. You can continue the control-adjustment branch instead: it has independent basis and can progress without changing, rejecting, or weakening the service-event branch.",
        references: [
          {
            label: "Branch recommendation",
            kind: "Graph question",
            destination: "/projects/inlet-cycle/graph?layer=working",
          },
          {
            label: "Source-coverage task",
            kind: "Work task",
            destination: "/projects/inlet-cycle/work/work-process-maintenance",
          },
        ],
      },
      {
        id: "message-work-1",
        speaker: "Source-coverage task",
        origin: "Canonical Work update",
        force: "work_update",
        forceLabel: "Work update · awaiting input",
        content:
          "Identity is confirmed. The task needs the Project author to choose a permitted local copy before processing can begin.",
        references: [
          {
            label: "Open required input",
            kind: "Work task",
            destination:
              "/projects/inlet-cycle/work/work-process-maintenance#required-input",
          },
        ],
      },
    ],
  },
];

export const getProjectPetraThread = (
  projectId: string,
): PetraThread | undefined =>
  REFERENCE_PETRA_THREADS.find((thread) => thread.projectId === projectId);

export const REFERENCE_ARTIFACTS: CompositionArtifact[] = [
  {
    id: "artifact-emergency-sequence",
    projectId: "field-guide",
    title: "Emergency sequence revision",
    kind: "Controlled guide section",
    objective:
      "Produce a traceable passage that preserves the approved emergency instruction.",
    currentRevision: "Accepted revision 10",
    workingRevision: "Working revision 12",
    currentText:
      "Before leaving the platform, close the inlet when conditions allow.",
    workingText:
      "Close the marked inlet before leaving the platform. Confirm the indicator is settled, then use the north exit.",
    localPersistence: "Durably saved as Working revision 12",
    structure: [
      { id: "section-action", heading: "Required action", status: "Revised" },
      { id: "section-check", heading: "Indicator check", status: "Added" },
      { id: "section-exit", heading: "Exit instruction", status: "Added" },
    ],
    provenance: [
      {
        statement: "Close the marked inlet before leaving the platform.",
        basis: "Approved emergency language · Revision 5 · Clause 2.4",
        sourceId: "src-approved-language",
      },
      {
        statement: "Confirm the indicator is settled.",
        basis: "Author-authored working text; no governing reference linked",
      },
      {
        statement: "Use the north exit.",
        basis: "Author-authored working text; location reference unresolved",
      },
    ],
    validation: {
      state: "finding",
      summary: "One governing check passed; two statements need basis review.",
      findings: [
        "Passed: the required action exactly matches Clause 2.4.",
        "Needs review: the indicator check has no governing reference.",
        "Needs review: the north-exit location is unresolved.",
      ],
      checkedRevision: "Working revision 12",
    },
    outputs: [
      {
        id: "output-preview-12",
        label: "Accessible HTML preview",
        status: "Prepared",
        revision: "Working revision 12",
        delivery: "Stored locally · not delivered",
      },
    ],
  },
];

export const getProjectArtifacts = (projectId: string) =>
  REFERENCE_ARTIFACTS.filter((artifact) => artifact.projectId === projectId);

export const getReferenceArtifact = (
  projectId: string,
  artifactId: string | undefined,
) =>
  REFERENCE_ARTIFACTS.find(
    (artifact) =>
      artifact.projectId === projectId && artifact.id === artifactId,
  );

export const REFERENCE_HISTORY: HistoryEpisode[] = [
  {
    id: "episode-observation-accepted",
    projectId: "inlet-cycle",
    title: "Observation entry accepted",
    summary:
      "Entry 21 became accepted basis for the interval finding; the graph projection then began catching up.",
    actor: "Project author",
    recordedAt: "2026-09-07 14:18",
    occurredAt: "2026-09-07 14:17",
    action: "Applied ChangeSet changeset-observation-021 revision 1",
    authorityEffect: "Created one accepted basis relationship at Snapshot 18.",
    projectionEffect:
      "Authoritative application succeeded; Graph still represents Snapshot 17.",
    members: [
      "Decision decision-observation-021 recorded",
      "Basis relationship basis-observation-021 created",
      "Project advanced from Snapshot 17 to Snapshot 18",
      "Graph projection catch-up requested",
    ],
    recovery:
      "The accepted event is retained. Projection retry cannot repeat the Apply command.",
    revert: {
      eligible: true,
      label: "Prepare reversal",
      reason:
        "The applied relationship remains current and no protected dependent change blocks compensation.",
      consequence:
        "A reversal would remove the accepted basis relationship in a new ChangeSet while retaining this decision and event history.",
    },
  },
  {
    id: "episode-threshold-retained",
    projectId: "inlet-cycle",
    title: "Threshold interpretation retained",
    summary:
      "Review kept the control-adjustment branch open after comparing the declared tolerance.",
    actor: "Project author",
    recordedAt: "2026-09-06 16:42",
    occurredAt: "2026-09-06 16:41",
    action: "Recorded Review decision decision-threshold-006",
    authorityEffect: "No accepted object or relationship changed.",
    projectionEffect: "No projection update was required.",
    members: [
      "Review session review-threshold-006 completed",
      "Candidate remained unapplied",
      "Both inquiry paths remained open",
    ],
    recovery:
      "No authoritative effect needs recovery. The completed Review remains inspectable.",
    revert: {
      eligible: false,
      label: "Reversal unavailable",
      reason: "The decision produced no authoritative change to compensate.",
      consequence:
        "Open a new Review if a later candidate should change the branch.",
    },
  },
];

export const getProjectHistory = (projectId: string) =>
  REFERENCE_HISTORY.filter((episode) => episode.projectId === projectId);

export const getHistoryEpisode = (
  projectId: string,
  episodeId: string | undefined,
) =>
  REFERENCE_HISTORY.find(
    (episode) => episode.projectId === projectId && episode.id === episodeId,
  );

export const REFERENCE_PROFILE_TOOLS: ProfileToolTask[] = [
  {
    id: "tool-constraint-coverage",
    projectId: "north-loop",
    label: "Constraint coverage check",
    profileLabel: "Decision analysis",
    objective:
      "Check whether every proposed service sequence addresses the required access constraints.",
    capability: "profile.decision-analysis/constraint-coverage@1.0",
    inputs: [
      {
        label: "Decision question",
        value: "Which sequence preserves morning access?",
      },
      {
        label: "Required constraint",
        value: "Morning access remains available",
      },
      { label: "Alternatives", value: "No registered alternatives yet" },
    ],
    returnLabel: "North loop service plan Brief",
  },
];

export const getProjectProfileTool = (projectId: string, toolId?: string) =>
  REFERENCE_PROFILE_TOOLS.find(
    (tool) =>
      tool.projectId === projectId &&
      (toolId === undefined || tool.id === toolId),
  );
