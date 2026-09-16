import { createHash } from "node:crypto";

import type {
  FocusedGraphAnalysisContent,
  FocusedGraphAnalysisExactMember,
  FocusedGraphAnalysisPosition,
  FocusedGraphAssessedConsequence,
  FocusedGraphComparisonAnalysis,
  FocusedGraphDateFact,
  FocusedGraphDifference,
  FocusedGraphExactRef,
  FocusedGraphImpactAnalysis,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphSuppliedConsequences,
  FocusedGraphTimeAnalysis,
  PetraFocusedGraphAnalysisView,
  PetraProjectReviewViewRecord,
} from "@petra/contracts";
import {
  ContractRegistryError,
  PetraContractRegistry,
} from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { ProjectHistoryViewReader } from "./project-history-view.js";
import type { ProjectReviewViewReader } from "./review-session.js";
import {
  FocusedGraphQueryError,
  parseFocusedGraphViewRequest,
  type FocusedGraphReadRequest,
  type FocusedGraphViewReader,
  type PetraFocusedGraphReadView,
} from "./focused-graph-view.js";

export type FocusedGraphAnalysisQueryErrorCode =
  | "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID"
  | "FOCUSED_GRAPH_ANALYSIS_SOURCE_NOT_FOUND"
  | "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE"
  | "FOCUSED_GRAPH_ANALYSIS_CONTRACT_INVALID";

export class FocusedGraphAnalysisQueryError extends Error {
  constructor(
    readonly code: FocusedGraphAnalysisQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FocusedGraphAnalysisQueryError";
  }
}

export interface FocusedGraphAnalysisPositionRequest {
  readonly position_key: string;
  readonly label: string;
  readonly graph_request: FocusedGraphReadRequest;
}

interface FocusedGraphAnalysisRequestBase {
  readonly analysis_request_id: string;
  readonly question: string;
}

export interface FocusedGraphComparisonViewRequest extends FocusedGraphAnalysisRequestBase {
  readonly task_kind: "comparison";
  readonly before: FocusedGraphAnalysisPositionRequest;
  readonly after: FocusedGraphAnalysisPositionRequest;
}

export interface FocusedGraphImpactReviewBinding {
  readonly review_session_id: string;
  readonly review_member_ids: readonly [string, ...string[]];
}

export interface FocusedGraphImpactViewRequest extends FocusedGraphAnalysisRequestBase {
  readonly task_kind: "impact";
  readonly position: FocusedGraphAnalysisPositionRequest;
  readonly history_event_id: string;
  readonly review_binding?: FocusedGraphImpactReviewBinding;
}

export interface FocusedGraphTimeViewRequest extends FocusedGraphAnalysisRequestBase {
  readonly task_kind: "time";
  readonly position: FocusedGraphAnalysisPositionRequest;
  readonly temporal_dimension:
    "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
}

export type FocusedGraphAnalysisViewRequest =
  | FocusedGraphComparisonViewRequest
  | FocusedGraphImpactViewRequest
  | FocusedGraphTimeViewRequest;

export interface FocusedGraphAnalysisViewReader {
  queryFocusedGraphAnalysis(
    projectId: string,
    request: FocusedGraphAnalysisViewRequest,
  ): Promise<PetraFocusedGraphAnalysisView | undefined>;
}

const ANALYSIS_REQUEST_ID =
  /^focused_graph_analysis_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const STABLE_KEY = /^[a-z][a-z0-9._:/-]{1,999}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean => {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
};

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const sameSnapshot = (
  left: FocusedGraphProjectSnapshotRef,
  right: FocusedGraphProjectSnapshotRef,
): boolean =>
  left.snapshot_id === right.snapshot_id &&
  left.revision === right.revision &&
  left.event_position === right.event_position &&
  left.content_hash === right.content_hash;

const uniqueRefs = (
  values: readonly FocusedGraphExactRef[],
): [FocusedGraphExactRef, ...FocusedGraphExactRef[]] => {
  const refs = [
    ...new Map(
      values.map((value) => [
        `${value.record_id}:${value.revision}:${value.record_hash}`,
        structuredClone(value),
      ]),
    ).values(),
  ];
  if (refs.length === 0) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
      "A focused graph analysis lost its exact focus identity.",
    );
  }
  return refs as [FocusedGraphExactRef, ...FocusedGraphExactRef[]];
};

const parsePosition = (value: unknown): FocusedGraphAnalysisPositionRequest => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["position_key", "label", "graph_request"]) ||
    typeof value.position_key !== "string" ||
    !STABLE_KEY.test(value.position_key) ||
    typeof value.label !== "string" ||
    value.label.trim().length === 0 ||
    value.label.length > 240
  ) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
      "A focused graph analysis position requires one stable key, label, and exact graph request.",
    );
  }
  let graphRequest: FocusedGraphReadRequest;
  try {
    graphRequest = parseFocusedGraphViewRequest(value.graph_request);
  } catch (error) {
    if (error instanceof FocusedGraphQueryError) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
        error.message,
      );
    }
    throw error;
  }
  if (graphRequest.expected_snapshot === undefined) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
      "Every comparison, impact, or time position must bind one exact requested Project snapshot.",
    );
  }
  return {
    position_key: value.position_key,
    label: value.label,
    graph_request: graphRequest,
  };
};

const assertCompatibleComparison = (
  before: FocusedGraphAnalysisPositionRequest,
  after: FocusedGraphAnalysisPositionRequest,
): void => {
  const left = before.graph_request;
  const right = after.graph_request;
  if (
    before.position_key === after.position_key ||
    left.task_semantic_key !== right.task_semantic_key ||
    left.object_semantic_key !== right.object_semantic_key ||
    left.relationship_semantic_key !== right.relationship_semantic_key ||
    left.project_definition_ref.definition_family !==
      right.project_definition_ref.definition_family ||
    !same(left.limits, right.limits)
  ) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
      "Comparison positions require distinct keys and one compatible profile, object, relationship, and finite scope boundary.",
    );
  }
};

/** Parse an untrusted task-specific analysis request without accepting layout. */
export const parseFocusedGraphAnalysisViewRequest = (
  value: unknown,
): FocusedGraphAnalysisViewRequest => {
  if (
    !isRecord(value) ||
    typeof value.analysis_request_id !== "string" ||
    !ANALYSIS_REQUEST_ID.test(value.analysis_request_id) ||
    typeof value.question !== "string" ||
    value.question.trim().length === 0 ||
    value.question.length > 8000 ||
    typeof value.task_kind !== "string"
  ) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
      "A focused graph analysis requires one exact request identity, task, and question.",
    );
  }
  const base = {
    analysis_request_id: value.analysis_request_id,
    question: value.question,
  };
  if (value.task_kind === "comparison") {
    if (
      !exactKeys(value, [
        "analysis_request_id",
        "task_kind",
        "question",
        "before",
        "after",
      ])
    ) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
        "A comparison requires exactly two named graph positions.",
      );
    }
    const before = parsePosition(value.before);
    const after = parsePosition(value.after);
    assertCompatibleComparison(before, after);
    return { ...base, task_kind: "comparison", before, after };
  }
  if (value.task_kind === "impact") {
    if (
      !exactKeys(
        value,
        [
          "analysis_request_id",
          "task_kind",
          "question",
          "position",
          "history_event_id",
        ],
        ["review_binding"],
      ) ||
      typeof value.history_event_id !== "string" ||
      !EVENT_ID.test(value.history_event_id)
    ) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
        "An impact read requires one exact graph position and canonical History event.",
      );
    }
    let reviewBinding: FocusedGraphImpactReviewBinding | undefined;
    if (value.review_binding !== undefined) {
      const binding = value.review_binding;
      const reviewMemberIds =
        isRecord(binding) && Array.isArray(binding.review_member_ids)
          ? binding.review_member_ids.filter(
              (memberId: unknown): memberId is string =>
                typeof memberId === "string",
            )
          : [];
      if (
        !isRecord(binding) ||
        !exactKeys(binding, ["review_session_id", "review_member_ids"]) ||
        typeof binding.review_session_id !== "string" ||
        !REVIEW_SESSION_ID.test(binding.review_session_id) ||
        !Array.isArray(binding.review_member_ids) ||
        reviewMemberIds.length !== binding.review_member_ids.length ||
        reviewMemberIds.length < 1 ||
        reviewMemberIds.length > 100 ||
        reviewMemberIds.some((memberId) => !REVIEW_MEMBER_ID.test(memberId)) ||
        new Set(reviewMemberIds).size !== reviewMemberIds.length
      ) {
        throw new FocusedGraphAnalysisQueryError(
          "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
          "An impact Review binding requires one exact session and bounded unique member identities.",
        );
      }
      reviewBinding = {
        review_session_id: binding.review_session_id,
        review_member_ids: [reviewMemberIds[0]!, ...reviewMemberIds.slice(1)],
      };
    }
    return {
      ...base,
      task_kind: "impact",
      position: parsePosition(value.position),
      history_event_id: value.history_event_id,
      ...(reviewBinding === undefined ? {} : { review_binding: reviewBinding }),
    };
  }
  if (value.task_kind === "time") {
    if (
      !exactKeys(value, [
        "analysis_request_id",
        "task_kind",
        "question",
        "position",
        "temporal_dimension",
      ]) ||
      typeof value.temporal_dimension !== "string" ||
      ![
        "recorded_time",
        "occurred_time",
        "publication_time",
        "valid_time",
      ].includes(value.temporal_dimension)
    ) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
        "A time read requires one exact graph position and explicit temporal dimension.",
      );
    }
    return {
      ...base,
      task_kind: "time",
      position: parsePosition(value.position),
      temporal_dimension:
        value.temporal_dimension as FocusedGraphTimeViewRequest["temporal_dimension"],
    };
  }
  throw new FocusedGraphAnalysisQueryError(
    "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
    "The requested focused graph analysis task is unsupported.",
  );
};

const memberRef = (
  view: PetraFocusedGraphReadView,
): FocusedGraphAnalysisExactMember[] => [
  ...view.content.nodes.map((node) => ({
    state: "exact" as const,
    member_kind: "node" as const,
    member_key: node.node_key,
    record_ref: structuredClone(node.record_ref),
    semantic_key: node.semantic_key,
    label: node.label,
    layer: node.layer,
    authority_position: node.authority_position,
  })),
  ...view.content.relationships.map((relationship) => ({
    state: "exact" as const,
    member_kind: "relationship" as const,
    member_key: relationship.relationship_key,
    record_ref: {
      record_id: relationship.relationship_ref.element_id,
      revision: relationship.relationship_ref.revision,
      record_hash: relationship.relationship_ref.record_hash,
    },
    semantic_key: relationship.semantic_key,
    label: relationship.predicate,
    layer: relationship.layer,
    authority_position: relationship.authority_position,
  })),
];

const scopeCoverage = (
  values: readonly PetraFocusedGraphReadView[],
): "complete_for_scope" | "partial" | "capped" | "unknown" => {
  const coverage = values.map((view) => view.content.scope.coverage);
  if (coverage.every((state) => state === "complete_for_scope"))
    return "complete_for_scope";
  if (coverage.includes("capped")) return "capped";
  if (coverage.includes("partial")) return "partial";
  return "unknown";
};

const position = (
  request: FocusedGraphAnalysisPositionRequest,
  role: FocusedGraphAnalysisPosition["role"],
  view: PetraFocusedGraphReadView,
): FocusedGraphAnalysisPosition => ({
  position_key: request.position_key,
  label: request.label,
  role,
  graph_view: structuredClone(view),
});

const differenceIdentity = (member: FocusedGraphAnalysisExactMember): string =>
  `${member.member_kind}:${member.record_ref.record_id}`;

const comparison = (
  before: PetraFocusedGraphReadView,
  after: PetraFocusedGraphReadView,
  request: FocusedGraphComparisonViewRequest,
): FocusedGraphComparisonAnalysis => {
  const beforeCoverage = before.content.scope.coverage;
  const afterCoverage = after.content.scope.coverage;
  const beforeMembers = new Map(
    memberRef(before).map((member) => [differenceIdentity(member), member]),
  );
  const afterMembers = new Map(
    memberRef(after).map((member) => [differenceIdentity(member), member]),
  );
  const identities = [
    ...new Set([...beforeMembers.keys(), ...afterMembers.keys()]),
  ].sort();
  const differences: FocusedGraphDifference[] = identities.map(
    (identity, index): FocusedGraphDifference => {
      const left = beforeMembers.get(identity);
      const right = afterMembers.get(identity);
      let differenceKind: FocusedGraphDifference["difference_kind"];
      let beforeMember: FocusedGraphDifference["before"];
      let afterMember: FocusedGraphDifference["after"];
      let limitation: string | undefined;
      if (left !== undefined && right !== undefined) {
        beforeMember = left;
        afterMember = right;
        if (
          left.member_kind !== right.member_kind ||
          left.semantic_key !== right.semantic_key
        ) {
          differenceKind = "not_comparable";
          limitation =
            "The matching record identity resolves to incompatible member or semantic kinds across positions.";
        } else {
          differenceKind = sameRef(left.record_ref, right.record_ref)
            ? "unchanged"
            : "changed";
        }
      } else if (left === undefined && right !== undefined) {
        beforeMember =
          beforeCoverage === "complete_for_scope"
            ? { state: "absent_from_exact_position" }
            : {
                state: "unavailable",
                reason:
                  "The Before position is not complete for its exact scope, so absence cannot be established.",
              };
        afterMember = right;
        differenceKind =
          beforeCoverage === "complete_for_scope" ? "added" : "unavailable";
        if (differenceKind === "unavailable")
          limitation =
            "An incomplete Before position cannot prove that this returned After member was added.";
      } else if (left !== undefined) {
        beforeMember = left;
        afterMember =
          afterCoverage === "complete_for_scope"
            ? { state: "absent_from_exact_position" }
            : {
                state: "unavailable",
                reason:
                  "The After position is not complete for its exact scope, so absence cannot be established.",
              };
        differenceKind =
          afterCoverage === "complete_for_scope" ? "removed" : "unavailable";
        if (differenceKind === "unavailable")
          limitation =
            "An incomplete After position cannot prove that this returned Before member was removed.";
      } else {
        throw new FocusedGraphAnalysisQueryError(
          "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
          "The comparison member inventory is inconsistent.",
        );
      }
      return {
        difference_key: `difference:${index + 1}:${identity.toLowerCase()}`,
        difference_kind: differenceKind,
        before: beforeMember,
        after: afterMember,
        basis: "exact_server_comparison_of_returned_record_identity",
        limitations: limitation === undefined ? [] : [limitation],
      };
    },
  );
  if (differences.length === 0) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
      "The exact comparison positions contain no members.",
    );
  }
  const commonBase = sameSnapshot(
    before.content.requested_snapshot,
    after.content.requested_snapshot,
  )
    ? {
        state: "exact" as const,
        snapshot: structuredClone(before.content.requested_snapshot),
      }
    : {
        state: "unavailable" as const,
        reason:
          "The two exact positions do not name the same requested Project snapshot; no common base is inferred.",
      };
  return {
    analysis_kind: "comparison",
    before_position_key: request.before.position_key,
    after_position_key: request.after.position_key,
    common_base: commonBase,
    differences: differences as [
      FocusedGraphDifference,
      ...FocusedGraphDifference[],
    ],
    coverage: scopeCoverage([before, after]),
    limitations: [
      "Differences compare exact returned record identities only; renderer position, order, geometry, and topology add no difference meaning.",
      "Partial, capped, or unknown membership never turns an unreturned record into a supplied Added or Removed fact.",
    ],
  };
};

const collectExactRefs = (value: unknown): FocusedGraphExactRef[] => {
  const refs: FocusedGraphExactRef[] = [];
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (!isRecord(candidate)) return;
    if (
      typeof candidate.record_id === "string" &&
      Number.isSafeInteger(candidate.revision) &&
      Number(candidate.revision) >= 1 &&
      typeof candidate.record_hash === "string" &&
      HASH.test(candidate.record_hash)
    ) {
      refs.push({
        record_id: candidate.record_id,
        revision: Number(candidate.revision),
        record_hash: candidate.record_hash,
      });
    }
    for (const child of Object.values(candidate)) visit(child);
  };
  visit(value);
  return refs;
};

const reviewConsequences = (
  review: PetraProjectReviewViewRecord,
  binding: FocusedGraphImpactReviewBinding,
  focusRefs: readonly FocusedGraphExactRef[],
): FocusedGraphSuppliedConsequences => {
  const membersById = new Map(
    review.content.members.map((member) => [member.review_member_id, member]),
  );
  const source = {
    schema_name: "petra.project-review-view" as const,
    schema_version: review.schema_version,
    review_session_id: review.review_session_id,
    content_hash: review.content_hash,
    read_at: review.read_at,
  };
  const items: FocusedGraphAssessedConsequence[] = [];
  for (const memberId of binding.review_member_ids) {
    const member = membersById.get(memberId);
    if (member === undefined) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_SOURCE_NOT_FOUND",
        `Review member ${memberId} is unavailable in the exact bound Review session.`,
      );
    }
    const targetRefs = uniqueRefs(
      collectExactRefs(member.candidate.profile_payload),
    );
    if (
      !targetRefs.some((target) =>
        focusRefs.some((focus) => sameRef(target, focus)),
      )
    ) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
        `Review member ${memberId} does not assess the exact focused record.`,
      );
    }
    member.consequences.forEach((summary, index) => {
      items.push({
        consequence_key: `consequence:review:${memberId.toLowerCase()}:${index + 1}`,
        source,
        review_member_id: memberId,
        source_kind: "review_member",
        summary,
        target_refs: targetRefs,
        coverage: "exact_requested_review_member",
        limitations: [
          "This is a supplied Review-member consequence for the exact bound candidate, not a universal graph impact score.",
        ],
      });
    });
    member.change_sets.forEach((changeSet, index) => {
      items.push({
        consequence_key: `consequence:change-set:${memberId.toLowerCase()}:${index + 1}`,
        source,
        review_member_id: memberId,
        source_kind: "change_set_impact",
        summary: changeSet.impact_summary,
        target_refs: targetRefs,
        coverage: "exact_requested_review_member",
        limitations: [
          "This is the exact ChangeSet impact summary exposed by Review; the focused graph does not reassess or widen it.",
        ],
      });
    });
  }
  if (items.length === 0) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
      "The exact Review binding contains no supplied consequence facts.",
    );
  }
  return {
    state: "supplied",
    items: items as [
      FocusedGraphAssessedConsequence,
      ...FocusedGraphAssessedConsequence[],
    ],
    coverage: "exact_requested_review_members",
    limitations: [
      "Only explicitly requested Review members are represented; other candidate or Project consequences remain outside scope.",
    ],
  };
};

const timeAnalysis = (
  view: PetraFocusedGraphReadView,
  request: FocusedGraphTimeViewRequest,
): FocusedGraphTimeAnalysis => {
  const temporal = view.content.temporal_position;
  const positionDate: FocusedGraphDateFact =
    temporal.position_kind === "historical" &&
    temporal.dimension === request.temporal_dimension &&
    temporal.at.state === "exact"
      ? { state: "exact_timestamp", value: temporal.at.value }
      : {
          state: "unknown",
          reason:
            temporal.position_kind === "current"
              ? "Current Project-snapshot position does not supply a domain timestamp for this temporal dimension."
              : `The selected position is expressed in ${temporal.dimension}, not ${request.temporal_dimension}.`,
        };
  const members = memberRef(view).sort((left, right) =>
    left.member_key.localeCompare(right.member_key),
  );
  return {
    analysis_kind: "time",
    position_key: request.position.position_key,
    temporal_dimension: request.temporal_dimension,
    position_date: positionDate,
    entries: members.map((member, index) => ({
      position: index + 1,
      member,
      date: {
        state: "unknown",
        reason: `The exact focused graph member contract does not supply a ${request.temporal_dimension} value for this member.`,
      },
      date_basis: "focused_graph_member_fact",
      limitations: [
        "Unknown member dates remain inspectable and are not replaced by read time, ingestion time, layout order, or the selected Project snapshot date.",
      ],
    })) as FocusedGraphTimeAnalysis["entries"],
    ordering_rationale:
      "Members with unknown dates use stable renderer-neutral member-key order; this ordering is not chronology, maturity, confidence, importance, or currentness.",
    coverage: scopeCoverage([view]),
    limitations: [
      "The selected Project position and each member date are separate facts; an exact snapshot date is never copied onto undated members.",
      "Unsupported occurred, publication, or valid-time facts remain explicitly unknown until a canonical owner supplies them.",
    ],
  };
};

const assertPositionView = (
  projectId: string,
  request: FocusedGraphAnalysisPositionRequest,
  view: PetraFocusedGraphReadView,
): void => {
  if (
    view.project_id !== projectId ||
    view.content.task.request_id !== request.graph_request.request_id ||
    view.content.task.question !== request.graph_request.question ||
    !same(view.content.task.focus_refs, [request.graph_request.focus_ref]) ||
    view.content.semantic_layer !== request.graph_request.semantic_layer ||
    !same(
      view.content.temporal_position,
      request.graph_request.temporal_position,
    ) ||
    !same(
      view.content.requested_snapshot,
      request.graph_request.expected_snapshot,
    )
  ) {
    throw new FocusedGraphAnalysisQueryError(
      "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
      "A focused graph analysis source substituted its exact Project, request, focus, layer, time, or snapshot identity.",
    );
  }
};

const latestReadAt = (values: readonly string[]): string =>
  [...values].sort((left, right) => Date.parse(right) - Date.parse(left))[0]!;

/**
 * Read-only composition over existing focused graph, History, and Review
 * owners. It stores no parallel authority and accepts no renderer geometry.
 */
export class FocusedGraphAnalysisViewComposer implements FocusedGraphAnalysisViewReader {
  readonly #contracts: PetraContractRegistry;

  constructor(
    readonly focusedGraphs: FocusedGraphViewReader,
    readonly history: ProjectHistoryViewReader,
    readonly reviews: ProjectReviewViewReader,
    contracts = new PetraContractRegistry(),
  ) {
    this.#contracts = contracts;
  }

  async queryFocusedGraphAnalysis(
    projectId: string,
    request: FocusedGraphAnalysisViewRequest,
  ): Promise<PetraFocusedGraphAnalysisView | undefined> {
    request = parseFocusedGraphAnalysisViewRequest(request);
    if (!PROJECT_ID.test(projectId)) {
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
        "A focused graph analysis requires one exact Project identity.",
      );
    }

    let positions:
      | [FocusedGraphAnalysisPosition]
      | [FocusedGraphAnalysisPosition, FocusedGraphAnalysisPosition];
    let analysis: FocusedGraphAnalysisContent["analysis"];
    let focusRefs: [FocusedGraphExactRef, ...FocusedGraphExactRef[]];
    let readAts: string[];
    if (request.task_kind === "comparison") {
      const [before, after] = await Promise.all([
        this.focusedGraphs.queryFocusedGraph(
          projectId,
          request.before.graph_request,
        ),
        this.focusedGraphs.queryFocusedGraph(
          projectId,
          request.after.graph_request,
        ),
      ]);
      if (before === undefined || after === undefined) return undefined;
      assertPositionView(projectId, request.before, before);
      assertPositionView(projectId, request.after, after);
      if (
        before.content.profile.project_definition_ref.definition_family !==
        after.content.profile.project_definition_ref.definition_family
      ) {
        throw new FocusedGraphAnalysisQueryError(
          "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
          "Comparison positions resolved to incompatible ProjectDefinition families.",
        );
      }
      positions = [
        position(request.before, "before", before),
        position(request.after, "after", after),
      ];
      analysis = comparison(before, after, request);
      focusRefs = uniqueRefs([
        request.before.graph_request.focus_ref,
        request.after.graph_request.focus_ref,
      ]);
      readAts = [before.read_at, after.read_at];
    } else if (request.task_kind === "impact") {
      const [graph, impact] = await Promise.all([
        this.focusedGraphs.queryFocusedGraph(
          projectId,
          request.position.graph_request,
        ),
        this.history.getProjectHistoryImpactView(
          projectId,
          request.history_event_id,
        ),
      ]);
      if (graph === undefined || impact === undefined) return undefined;
      assertPositionView(projectId, request.position, graph);
      const graphFocus = graph.content.task.focus_refs;
      const exactTarget = impact.content.selected_event.targets.some(
        (target) =>
          target.revision !== undefined &&
          target.record_hash !== undefined &&
          graphFocus.some(
            (focus) =>
              focus.record_id === target.object_id &&
              focus.revision === target.revision &&
              focus.record_hash === target.record_hash,
          ),
      );
      if (
        impact.project_id !== projectId ||
        impact.event_id !== request.history_event_id ||
        !exactTarget
      ) {
        throw new FocusedGraphAnalysisQueryError(
          "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
          "The selected History impact does not bind the exact focused record and event.",
        );
      }
      let consequences: FocusedGraphImpactAnalysis["assessed_consequences"];
      readAts = [graph.read_at, impact.read_at];
      if (request.review_binding === undefined) {
        consequences = {
          state: "unavailable",
          reason:
            "No exact Review member was bound to this impact request, so assessed consequences are unavailable.",
          coverage: "not_assessed",
          limitations: [
            "Recorded dependencies do not by themselves establish consequence, importance, reversibility, or invalidation.",
          ],
        };
      } else {
        const review = await this.reviews.getProjectReviewView(
          projectId,
          request.review_binding.review_session_id,
        );
        if (review === undefined) {
          throw new FocusedGraphAnalysisQueryError(
            "FOCUSED_GRAPH_ANALYSIS_SOURCE_NOT_FOUND",
            "The exact bound Review session is unavailable.",
          );
        }
        consequences = reviewConsequences(
          review,
          request.review_binding,
          graphFocus,
        );
        readAts.push(review.read_at);
      }
      positions = [position(request.position, "context", graph)];
      const coverage = [
        impact.content.impact.summary.coverage,
        impact.content.semantic_target_impact.summary.coverage,
        impact.content.operational_dependency_impact.summary.coverage,
      ].includes("truncated")
        ? "truncated"
        : "complete";
      analysis = {
        analysis_kind: "impact",
        position_key: request.position.position_key,
        dependency_source: structuredClone(
          impact,
        ) as unknown as FocusedGraphImpactAnalysis["dependency_source"],
        assessed_consequences: consequences,
        coverage,
        limitations: [
          "Dependencies are the exact registered direct facts supplied by Project History; transitive, external, and unregistered dependents remain omitted as named by that owner.",
          "Assessed consequences remain separate Review facts and are never inferred from graph topology or dependency counts.",
        ],
      };
      focusRefs = uniqueRefs(graphFocus);
    } else {
      const graph = await this.focusedGraphs.queryFocusedGraph(
        projectId,
        request.position.graph_request,
      );
      if (graph === undefined) return undefined;
      assertPositionView(projectId, request.position, graph);
      positions = [position(request.position, "time_position", graph)];
      analysis = timeAnalysis(graph, request);
      focusRefs = uniqueRefs(graph.content.task.focus_refs);
      readAts = [graph.read_at];
    }

    const taskWithoutHash = {
      analysis_request_id: request.analysis_request_id,
      task_kind: request.task_kind,
      question: request.question,
      question_hash: digest(request.question),
      focus_refs: focusRefs,
      position_keys: positions.map((item) => item.position_key) as
        [string] | [string, string],
    };
    const content: FocusedGraphAnalysisContent = {
      task: {
        ...taskWithoutHash,
        request_hash: digest(taskWithoutHash),
      },
      positions,
      analysis,
      authority_boundary: {
        postgresql_authoritative: true,
        neo4j_projection_only: true,
        focused_graph_owner_reused: true,
        history_owner_reused: true,
        review_owner_reused_when_bound: true,
        analysis_is_read_only: true,
        renderer_calculates_domain_facts: false,
        universal_scores_calculated: false,
      },
      limitations: [
        "This result answers one bounded task over named exact positions; it does not claim whole-Project or universal knowledge.",
        "Importance, maturity, confidence, scientific standing, and currentness are not calculated by this analysis boundary.",
      ],
    };
    const view: PetraFocusedGraphAnalysisView = {
      schema_name: "petra.focused-graph-analysis-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: digest(content),
      read_at: latestReadAt(readAts),
    };
    try {
      this.#contracts.assertValid("focused-graph-analysis-view", "1.0.0", view);
    } catch (error) {
      const detail =
        error instanceof ContractRegistryError
          ? error.validationErrors
              .map(
                (failure) =>
                  `${failure.instancePath || "/"} ${failure.message ?? "is invalid"}`,
              )
              .join("; ")
          : error instanceof Error
            ? error.message
            : "unknown contract failure";
      throw new FocusedGraphAnalysisQueryError(
        "FOCUSED_GRAPH_ANALYSIS_CONTRACT_INVALID",
        `The composed focused graph analysis is contract-invalid: ${detail}`,
      );
    }
    return structuredClone(view);
  }
}
