import type { ProjectProfile, ProjectRecord, SourceRecord } from "./model.js";

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
