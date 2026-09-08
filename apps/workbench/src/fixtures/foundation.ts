import type {
  AvailabilityNoteViewModel,
  EvidenceRelationViewModel,
  FreshnessStampViewModel,
  OriginLabelViewModel,
  SourceDepthFlagViewModel,
  StateMarkerViewModel,
  StateNoticeViewModel,
  WorkActivityViewModel,
} from "../design-system/state.js";

export type FoundationFixturePressure =
  | "ordinary"
  | "empty"
  | "loading"
  | "cached"
  | "running"
  | "failed"
  | "stale"
  | "abstract_only"
  | "dense";

export interface FoundationFixture {
  id: string;
  scenarioId: string;
  pressure: FoundationFixturePressure;
  title: string;
  summary: string;
  contractStatus: "mapped" | "presentation_only";
  contractRefs: string[];
  markers: StateMarkerViewModel[];
  freshness?: FreshnessStampViewModel;
  origin?: OriginLabelViewModel;
  relation?: EvidenceRelationViewModel;
  sourceDepth?: SourceDepthFlagViewModel;
  work?: WorkActivityViewModel;
  availability?: AvailabilityNoteViewModel;
  notice?: StateNoticeViewModel;
}

const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const CLAIM_ID = "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB";
const SOURCE_SPAN_ID = "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7";
const WORK_VERSION_ID = "work_version_01ARZ3NDEKTSV4RRFFQ69G5FB0";
const WORK_UNIT_ID = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2";

export const FOUNDATION_FIXTURES: FoundationFixture[] = [
  {
    id: "ordinary",
    scenarioId: "UX-FX04",
    pressure: "ordinary",
    title: "Full-text supported proposal",
    summary:
      "A machine-checked Claim remains a proposal while its source, full-text depth, and supporting relation stay inspectable.",
    contractStatus: "mapped",
    contractRefs: [
      "petra.claim@1.0.0",
      "petra.assertion@1.0.0",
      "petra.source-span@1.0.0",
    ],
    markers: [
      {
        dimension: "scientific_authority",
        value: "proposal",
        detail: "Quarantine authority; no trusted graph mutation has occurred.",
      },
      { dimension: "review_posture", value: "guide" },
      { dimension: "availability", value: "ready" },
    ],
    freshness: {
      state: "current_snapshot",
      snapshotLabel: "Project evidence snapshot",
      snapshotId: `${PROJECT_ID}@17`,
      asOf: "2026-08-29 14:12 UTC",
      detail:
        "The proposal and its displayed provenance resolve against the same authoritative project revision.",
    },
    origin: {
      origin: "extraction",
      basisLabel: "Model extraction from an exact full-text SourceSpan",
      basisId: SOURCE_SPAN_ID,
      detail:
        "The source reports the observation; Petra proposed the normalized Claim and scope representation.",
    },
    relation: {
      relation: "supports",
      subjectLabel: "Observed reduction",
      objectLabel: "H12 — Position bias persists",
      detail:
        "Support is scoped to the study-defined evaluation task and does not establish the Hypothesis globally.",
    },
    sourceDepth: {
      depth: "full_text",
      sourceLabel: "Version of record",
      permittedUse:
        "Inspect the exact passage, surrounding section, reported method, and scoped result.",
    },
    availability: {
      availability: "ready",
      actionLabel: "Inspect the exact proposal",
      reason:
        "The Claim, WorkVersion, SourceSpan, and proposal revision all resolve in this fixture.",
    },
  },
  {
    id: "empty",
    scenarioId: "UX-FX01",
    pressure: "empty",
    title: "Early project with no accepted evidence",
    summary:
      "The empty state preserves the rough research question without rendering preview Claims or a decorative graph as scientific state.",
    contractStatus: "presentation_only",
    contractRefs: ["petra.project@1.0.0"],
    markers: [
      { dimension: "availability", value: "limited" },
      { dimension: "review_posture", value: "inspect" },
    ],
    notice: {
      tone: "neutral",
      title: "No evidence has been added",
      message:
        "Petra can help frame the question, but there are no Claims, evidence relations, or scientific standing to summarize yet.",
      recovery:
        "Add a legitimate source or continue refining the ResearchQuestion. No placeholder graph objects will be created.",
    },
    availability: {
      availability: "limited",
      actionLabel: "Compare competing explanations",
      reason:
        "There are not yet any source-backed Claims or explicit alternatives to compare.",
      prerequisite:
        "Frame at least one candidate explanation and add evidence that bears on the question.",
    },
  },
  {
    id: "loading",
    scenarioId: "UX1.0-STATE-LOADING",
    pressure: "loading",
    title: "Loading an authoritative snapshot",
    summary:
      "Loading is presentation state only. It does not borrow the prior project's authority, selection, or status while the requested revision resolves.",
    contractStatus: "presentation_only",
    contractRefs: ["React Router loader state"],
    markers: [],
    notice: {
      tone: "information",
      title: "Loading project revision 17",
      message:
        "The route is resolving the requested Project and snapshot. Scientific content remains intentionally absent until identity and revision checks finish.",
    },
  },
  {
    id: "cached",
    scenarioId: "UX-FX02",
    pressure: "cached",
    title: "Cached derived analysis",
    summary:
      "A reusable synthesis can render immediately while retaining the snapshot and limitations behind the cached result.",
    contractStatus: "mapped",
    contractRefs: ["petra.context-packet@1.0.0", "petra.evidence-packet@1.0.0"],
    markers: [
      { dimension: "work_freshness", value: "cached_derived" },
      { dimension: "origin", value: "graph_inference" },
      { dimension: "availability", value: "ready" },
    ],
    freshness: {
      state: "cached_derived",
      snapshotLabel: "Cached standing analysis",
      snapshotId: `${PROJECT_ID}@14`,
      asOf: "2026-08-27 09:30 UTC",
      detail:
        "The cached result is usable for orientation, but it predates three current project revisions.",
    },
    origin: {
      origin: "graph_inference",
      basisLabel: "Snapshot-bound evidence packet",
      detail:
        "This is Petra's derived synthesis, not language attributed to any one source.",
    },
  },
  {
    id: "running",
    scenarioId: "UX-FX10",
    pressure: "running",
    title: "Bounded work remains active",
    summary:
      "Active work names its scientific objective, durable WorkUnit, stage, and update time without exposing private reasoning.",
    contractStatus: "mapped",
    contractRefs: ["petra.work-unit@1.0.0", "petra.interaction-run@1.0.0"],
    markers: [
      { dimension: "work_freshness", value: "running" },
      { dimension: "availability", value: "limited" },
    ],
    work: {
      workUnitId: WORK_UNIT_ID,
      objective:
        "Map contemporary alternatives to H12 — Position bias persists under randomized ordering.",
      freshness: "running",
      stage:
        "Searching citation neighborhoods and validating source identities",
      updatedAt: "2026-08-29 14:18 UTC",
      recovery:
        "Reconnect to the interaction stream or inspect the durable WorkUnit. Closing the stream does not cancel the work.",
    },
    availability: {
      availability: "limited",
      actionLabel: "Summarize the alternative landscape",
      reason:
        "The bounded scan is still running, so only the current snapshot and validated partial results are available.",
      prerequisite:
        "Wait for completion or inspect the current partial result.",
    },
  },
  {
    id: "failed",
    scenarioId: "UX-FX11",
    pressure: "failed",
    title: "Worker failure with retained context",
    summary:
      "An operational failure remains distinct from a negative scientific result and preserves a bounded recovery path.",
    contractStatus: "mapped",
    contractRefs: [
      "petra.work-unit@1.0.0",
      "petra.worker-output-manifest@1.0.0",
    ],
    markers: [
      { dimension: "work_outcome", value: "failed" },
      { dimension: "availability", value: "limited" },
    ],
    notice: {
      tone: "danger",
      title: "Full-text parsing failed",
      message:
        "The worker did not produce a validated ParsedDocument. This is an operational failure, not evidence against a Claim or Hypothesis.",
      recovery:
        "Inspect the retained diagnostics, verify the artifact, and retry from the same immutable input if the failure is recoverable.",
    },
    availability: {
      availability: "limited",
      actionLabel: "Inspect method details",
      reason:
        "No validated full-text parse exists, so method-level inspection is unavailable from this WorkVersion.",
      prerequisite:
        "Complete a valid full-text parse or use another legitimate artifact.",
    },
  },
  {
    id: "stale",
    scenarioId: "UX-FX09",
    pressure: "stale",
    title: "Authority committed; graph projection catching up",
    summary:
      "PostgreSQL authority and the derived graph are shown separately while a committed ChangeSet propagates.",
    contractStatus: "mapped",
    contractRefs: [
      "petra.projection-checkpoint@1.0.0",
      "petra.change-set@1.0.0",
    ],
    markers: [
      { dimension: "scientific_authority", value: "applied" },
      { dimension: "work_freshness", value: "projection_catching_up" },
      { dimension: "availability", value: "limited" },
    ],
    freshness: {
      state: "projection_catching_up",
      snapshotLabel: "Authoritative Project revision",
      snapshotId: `${PROJECT_ID}@18`,
      asOf: "2026-08-29 14:20 UTC",
      detail:
        "One projection record is pending. PostgreSQL contains the applied change; the focused Neo4j view remains at revision 17.",
    },
    notice: {
      tone: "caution",
      title: "The focused graph is one revision behind",
      message:
        "The committed change remains authoritative. Graph paths that require revision 18 are withheld until projection catch-up completes.",
      recovery:
        "Continue with the authoritative textual view or wait for the projection checkpoint to become current.",
    },
  },
  {
    id: "abstract-only",
    scenarioId: "UX-FX03",
    pressure: "abstract_only",
    title: "Abstract-only source boundary",
    summary:
      "A broad source report remains inspectable while method-level language and actions stay visibly limited.",
    contractStatus: "mapped",
    contractRefs: ["petra.claim@1.0.0", "petra.work-version@1.0.0"],
    markers: [
      { dimension: "source_depth", value: "abstract_only" },
      { dimension: "origin", value: "source" },
      { dimension: "availability", value: "limited" },
    ],
    origin: {
      origin: "source",
      basisLabel: "Authors' abstract",
      basisId: WORK_VERSION_ID,
      detail:
        "The wording reports the authors' broad conclusion. Petra has not inspected the paper's method or full result context.",
    },
    sourceDepth: {
      depth: "abstract_only",
      sourceLabel: "Preprint abstract",
      permittedUse:
        "Report the authors' broad stated conclusion with the abstract-only limitation attached.",
      limitation:
        "Do not describe detailed methods, validity, exclusions, statistical analysis, or causal mechanism from this source.",
    },
    availability: {
      availability: "limited",
      actionLabel: "Compare experimental methods",
      reason:
        "Method-level detail is unavailable because Petra has only the abstract.",
      prerequisite: "Acquire and parse a legitimate full-text artifact.",
    },
  },
  {
    id: "dense",
    scenarioId: "UX-FX08",
    pressure: "dense",
    title: "Dense exception and state matrix",
    summary:
      "The compact treatment keeps multiple state dimensions readable without merging them into one score or relying on color.",
    contractStatus: "presentation_only",
    contractRefs: [
      "UX1.0 shared interface state grammar",
      "petra.claim@1.0.0",
      "petra.work-unit@1.0.0",
    ],
    markers: [
      { dimension: "scientific_authority", value: "proposal" },
      { dimension: "scientific_authority", value: "validated" },
      { dimension: "scientific_authority", value: "superseded" },
      { dimension: "work_freshness", value: "cached_derived" },
      { dimension: "work_freshness", value: "stale" },
      { dimension: "work_outcome", value: "awaiting_input" },
      { dimension: "work_outcome", value: "blocked" },
      { dimension: "source_depth", value: "metadata_only" },
      { dimension: "source_depth", value: "partial_full_text" },
      { dimension: "evidence_relation", value: "contradicts" },
      { dimension: "evidence_relation", value: "qualifies" },
      { dimension: "evidence_relation", value: "fails_to_replicate" },
      { dimension: "origin", value: "researcher_judgment" },
      { dimension: "origin", value: "assistant_judgment" },
      { dimension: "review_posture", value: "supervise" },
      { dimension: "availability", value: "policy_blocked" },
    ],
    notice: {
      tone: "information",
      title: "Density is contextual",
      message: `This fixture pressures compact status treatment around ${CLAIM_ID} without implying that every marker belongs on one production card. Consuming modules choose only the dimensions material to their task.`,
    },
  },
];

export const FOUNDATION_PRESSURES: FoundationFixturePressure[] = [
  "ordinary",
  "empty",
  "loading",
  "cached",
  "running",
  "failed",
  "stale",
  "abstract_only",
  "dense",
];

export const getFoundationFixture = (
  fixtureId: string | undefined,
): FoundationFixture | undefined =>
  fixtureId === undefined
    ? undefined
    : FOUNDATION_FIXTURES.find((fixture) => fixture.id === fixtureId);
