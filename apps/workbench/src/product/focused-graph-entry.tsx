import type {
  FocusedGraphExactRef,
  FocusedGraphLimits,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphSemanticDestination,
  FocusedGraphTemporalPosition,
  PetraFocusedGraphAnalysisView,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
  ProjectInquirySaveSelection,
  ProjectShellRetainedTask,
  ProjectShellResumeRecovery,
} from "@petra/contracts";
import type {
  FocusedGraphActionPreviewViewRequest,
  FocusedGraphReadRequest,
} from "@petra/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { focusedGraphRegionsFromView } from "./focused-graph-regions.js";
import {
  createFocusedGraphAnalysisRequestId,
  createFocusedGraphRequestId,
} from "./focused-graph-identities.js";
import { FocusedGraphAnalysisSurface } from "./FocusedGraphAnalysis.js";
import type { FocusedGraphActionPreviewRead } from "./FocusedGraphActions.js";
import {
  FocusedGraphExploration,
  type FocusedGraphExplorationRead,
} from "./FocusedGraphExploration.js";
import { FocusedGraphPositionNavigation } from "./FocusedGraphPositions.js";
import type { FocusedGraphRendererFactory } from "./FocusedGraphResult.js";
import type {
  ProjectInquirySaveCommand,
  ProjectInquirySaveRecoveryRead,
} from "./project-inquiry-save.js";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REQUEST_ID = /^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const ANALYSIS_REQUEST_ID =
  /^focused_graph_analysis_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const DEFINITION_ID = /^project_definition_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const INQUIRY_LINK_ID = /^project_inquiry_link_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PETRA_ID = /^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;
const SEMANTIC_KEY = /^[a-z][a-z0-9._/-]{1,199}$/u;
const STABLE_KEY = /^[a-z][a-z0-9._:/-]{1,999}$/u;
const DESTINATION_KINDS = new Set([
  "details",
  "source_inspection",
  "brief",
  "evidence",
  "review",
  "history",
  "work",
]);
const DESTINATION_OWNERS = new Set([
  "project_object_location_view",
  "project_source_view",
  "project_brief_view",
  "project_relationship_view",
  "project_review_view",
  "project_history_episode_view",
  "project_work_view",
]);

const ENTRY_VERSION = "1";
export { createFocusedGraphRequestId } from "./focused-graph-identities.js";
export { createFocusedGraphAnalysisRequestId } from "./focused-graph-identities.js";

export type FocusedGraphEntryOriginKind =
  | "brief"
  | "evidence"
  | "review"
  | "petra"
  | "history"
  | "saved_question"
  | "direct";

export interface FocusedGraphEntryDefinitionRef {
  readonly project_definition_id: string;
  readonly revision: number;
  readonly content_hash: string;
  readonly definition_family: string;
  readonly record_hash?: string;
}

export interface FocusedGraphReturnContext {
  readonly path: string;
  readonly label: string;
  readonly focus_id?: string;
}

export interface FocusedGraphHistoricalPosition {
  readonly snapshot: FocusedGraphProjectSnapshotRef;
  readonly temporal_position: Extract<
    FocusedGraphTemporalPosition,
    { readonly position_kind: "historical" }
  > & {
    readonly dimension: "recorded_time";
    readonly at: { readonly state: "exact"; readonly value: string };
  };
}

export type FocusedGraphPresentation =
  "position" | "current_working_comparison" | "impact" | "time";

export type FocusedGraphActionPreviewTarget =
  FocusedGraphActionPreviewViewRequest["target"];

export type FocusedGraphAnalysisEntry =
  | {
      readonly analysis_request_id: string;
      readonly analysis_kind: "comparison";
    }
  | {
      readonly analysis_request_id: string;
      readonly analysis_kind: "impact";
      readonly history_event_id: string;
      readonly review_binding?: {
        readonly review_session_id: string;
        readonly review_member_ids: readonly [string, ...string[]];
      };
    }
  | {
      readonly analysis_request_id: string;
      readonly analysis_kind: "time";
      readonly temporal_dimension:
        "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
    };

export type FocusedGraphAnalysisEntryDraft =
  | Omit<
      Extract<FocusedGraphAnalysisEntry, { analysis_kind: "comparison" }>,
      "analysis_request_id"
    >
  | Omit<
      Extract<FocusedGraphAnalysisEntry, { analysis_kind: "impact" }>,
      "analysis_request_id"
    >
  | Omit<
      Extract<FocusedGraphAnalysisEntry, { analysis_kind: "time" }>,
      "analysis_request_id"
    >;

export interface FocusedGraphEntry {
  readonly project_id: string;
  readonly request_id: string;
  readonly question: string;
  readonly focus_ref: FocusedGraphExactRef;
  readonly origin: {
    readonly origin_kind: FocusedGraphEntryOriginKind;
    readonly origin_ref?: FocusedGraphExactRef;
  };
  readonly project_definition_ref: FocusedGraphEntryDefinitionRef;
  readonly task_semantic_key: string;
  readonly object_semantic_key: string;
  readonly relationship_semantic_key: string;
  readonly return_action_semantic_key: string;
  readonly return_destination: FocusedGraphSemanticDestination;
  readonly limits: FocusedGraphLimits;
  readonly semantic_layer: "current" | "working" | "historical";
  readonly presentation: FocusedGraphPresentation;
  readonly analysis?: FocusedGraphAnalysisEntry;
  readonly expected_snapshot?: FocusedGraphProjectSnapshotRef;
  readonly historical_position?: FocusedGraphHistoricalPosition;
  readonly action_preview_target?: FocusedGraphActionPreviewTarget;
  readonly return_context: FocusedGraphReturnContext;
}

export type FocusedGraphEntryDraft = Omit<
  FocusedGraphEntry,
  "request_id" | "return_context" | "analysis"
> & {
  readonly analysis?: FocusedGraphAnalysisEntry;
  readonly return_context: Omit<FocusedGraphReturnContext, "path"> & {
    readonly path?: string;
  };
};

export interface FocusedGraphRouteData {
  readonly kind: "focused_graph";
  readonly entry: FocusedGraphEntry;
  readonly definition: PetraProjectDefinition;
  readonly request: FocusedGraphReadRequest;
  readonly view: PetraFocusedGraphView | PetraFocusedGraphViewV11;
  readonly analysis?: PetraFocusedGraphAnalysisView;
  readonly resume?: {
    readonly label: string;
    readonly retainedAt: string;
    readonly selection: ProjectInquirySaveSelection;
    readonly origin: ProjectShellRetainedTask["origin"];
    readonly focusRefs: ProjectShellRetainedTask["focus_refs"];
    readonly recovery: ProjectShellResumeRecovery;
  };
}

export class FocusedGraphEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FocusedGraphEntryError";
  }
}

const requiredParam = (params: URLSearchParams, key: string): string => {
  const values = params.getAll(key);
  if (values.length !== 1 || values[0]?.length === 0) {
    throw new FocusedGraphEntryError(
      `The focused graph entry requires one exact ${key}.`,
    );
  }
  return values[0]!;
};

const optionalParam = (
  params: URLSearchParams,
  key: string,
): string | undefined => {
  const values = params.getAll(key);
  if (values.length > 1) {
    throw new FocusedGraphEntryError(
      `The focused graph entry accepts at most one ${key}.`,
    );
  }
  return values[0];
};

const positiveInteger = (
  value: string,
  key: string,
  maximum?: number,
): number => {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    (maximum !== undefined && parsed > maximum)
  ) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${key}.`,
    );
  }
  return parsed;
};

const nonNegativeInteger = (value: string, key: string): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${key}.`,
    );
  }
  return parsed;
};

const exactRef = (
  params: URLSearchParams,
  prefix: string,
): FocusedGraphExactRef => {
  const record_id = requiredParam(params, `${prefix}Id`);
  const revision = positiveInteger(
    requiredParam(params, `${prefix}Revision`),
    `${prefix}Revision`,
  );
  const record_hash = requiredParam(params, `${prefix}Hash`);
  if (!PETRA_ID.test(record_id) || !HASH.test(record_hash)) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${prefix} reference.`,
    );
  }
  return { record_id, revision, record_hash };
};

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const safeReturnPath = (projectId: string, value: string): string => {
  const url = new URL(value, "https://petra.local");
  const root = `/projects/${encodeURIComponent(projectId)}`;
  if (
    url.origin !== "https://petra.local" ||
    (url.pathname !== root && !url.pathname.startsWith(`${root}/`))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph return context must stay inside the exact Project.",
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const validSnapshot = (snapshot: FocusedGraphProjectSnapshotRef): boolean =>
  /^snapshot_[0-9A-HJKMNP-TV-Z]{26}$/u.test(snapshot.snapshot_id) &&
  Number.isSafeInteger(snapshot.revision) &&
  snapshot.revision >= 1 &&
  Number.isSafeInteger(snapshot.event_position) &&
  snapshot.event_position >= 0 &&
  HASH.test(snapshot.content_hash);

const exactRecordedTime = (value: string): boolean => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const validAnalysis = (entry: FocusedGraphEntry): boolean => {
  const analysis = entry.analysis;
  if (entry.presentation === "position") return analysis === undefined;
  if (
    analysis === undefined ||
    !ANALYSIS_REQUEST_ID.test(analysis.analysis_request_id)
  ) {
    return false;
  }
  if (entry.presentation === "current_working_comparison") {
    return analysis.analysis_kind === "comparison";
  }
  if (entry.presentation === "time") {
    return (
      analysis.analysis_kind === "time" &&
      [
        "recorded_time",
        "occurred_time",
        "publication_time",
        "valid_time",
      ].includes(analysis.temporal_dimension)
    );
  }
  if (entry.presentation !== "impact" || analysis.analysis_kind !== "impact") {
    return false;
  }
  const binding = analysis.review_binding;
  return (
    EVENT_ID.test(analysis.history_event_id) &&
    (binding === undefined ||
      (REVIEW_SESSION_ID.test(binding.review_session_id) &&
        binding.review_member_ids.length >= 1 &&
        binding.review_member_ids.length <= 100 &&
        new Set(binding.review_member_ids).size ===
          binding.review_member_ids.length &&
        binding.review_member_ids.every((memberId) =>
          REVIEW_MEMBER_ID.test(memberId),
        )))
  );
};

const validActionPreviewTarget = (
  target: FocusedGraphActionPreviewTarget,
): boolean =>
  target.action_kind === "governed_correction"
    ? ["edit_relationship", "relink", "split", "change_scope"].includes(
        target.requested_change,
      ) &&
      REVIEW_SESSION_ID.test(target.review_session_id) &&
      REVIEW_MEMBER_ID.test(target.review_member_id)
    : INQUIRY_LINK_ID.test(
        target.inquiry_result_link_ref.project_inquiry_link_id,
      ) &&
      HASH.test(target.inquiry_result_link_ref.content_hash) &&
      HASH.test(target.inquiry_result_link_ref.record_hash);

const assertEntry = (entry: FocusedGraphEntry): FocusedGraphEntry => {
  const returnDestinationValid =
    entry.return_destination.state === "available"
      ? PETRA_ID.test(entry.return_destination.target_ref.record_id) &&
        Number.isSafeInteger(entry.return_destination.target_ref.revision) &&
        entry.return_destination.target_ref.revision > 0 &&
        HASH.test(entry.return_destination.target_ref.record_hash)
      : entry.return_destination.reason.trim().length > 0;
  if (
    !PROJECT_ID.test(entry.project_id) ||
    !REQUEST_ID.test(entry.request_id) ||
    entry.question.trim().length === 0 ||
    entry.question.length > 8000 ||
    !DEFINITION_ID.test(entry.project_definition_ref.project_definition_id) ||
    !Number.isSafeInteger(entry.project_definition_ref.revision) ||
    entry.project_definition_ref.revision < 1 ||
    !HASH.test(entry.project_definition_ref.content_hash) ||
    (entry.project_definition_ref.record_hash !== undefined &&
      !HASH.test(entry.project_definition_ref.record_hash)) ||
    !/^[a-z][a-z0-9.-]{2,127}$/u.test(
      entry.project_definition_ref.definition_family,
    ) ||
    !SEMANTIC_KEY.test(entry.task_semantic_key) ||
    !SEMANTIC_KEY.test(entry.object_semantic_key) ||
    !SEMANTIC_KEY.test(entry.relationship_semantic_key) ||
    !SEMANTIC_KEY.test(entry.return_action_semantic_key) ||
    !STABLE_KEY.test(entry.return_destination.destination_key) ||
    !DESTINATION_KINDS.has(entry.return_destination.destination_kind) ||
    !DESTINATION_OWNERS.has(entry.return_destination.owner) ||
    !returnDestinationValid ||
    !["current", "working", "historical"].includes(entry.semantic_layer) ||
    !["position", "current_working_comparison", "impact", "time"].includes(
      entry.presentation,
    ) ||
    !validAnalysis(entry) ||
    (entry.expected_snapshot !== undefined &&
      !validSnapshot(entry.expected_snapshot)) ||
    (entry.historical_position !== undefined &&
      (!validSnapshot(entry.historical_position.snapshot) ||
        entry.historical_position.temporal_position.position_kind !==
          "historical" ||
        entry.historical_position.temporal_position.dimension !==
          "recorded_time" ||
        entry.historical_position.temporal_position.at.state !== "exact" ||
        !exactRecordedTime(
          entry.historical_position.temporal_position.at.value,
        ))) ||
    (entry.semantic_layer === "historical" &&
      entry.historical_position === undefined) ||
    (entry.presentation === "current_working_comparison" &&
      entry.semantic_layer === "historical") ||
    (entry.action_preview_target !== undefined &&
      (entry.semantic_layer === "historical" ||
        entry.presentation !== "position" ||
        !validActionPreviewTarget(entry.action_preview_target))) ||
    entry.return_context.label.trim().length === 0 ||
    entry.return_context.label.length > 240 ||
    (entry.return_context.focus_id !== undefined &&
      !/^[A-Za-z][A-Za-z0-9_:.-]{0,199}$/u.test(entry.return_context.focus_id))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry is incomplete or incompatible.",
    );
  }
  if (
    entry.origin.origin_kind !== "direct" &&
    entry.origin.origin_ref === undefined
  ) {
    throw new FocusedGraphEntryError(
      "A contextual focused graph entry requires its exact originating object.",
    );
  }
  if (
    entry.limits.maximum_depth < 1 ||
    entry.limits.maximum_depth > 4 ||
    entry.limits.maximum_nodes < 1 ||
    entry.limits.maximum_nodes > 100 ||
    entry.limits.maximum_relationships < 1 ||
    entry.limits.maximum_relationships > 99 ||
    entry.limits.maximum_paths < 1 ||
    entry.limits.maximum_paths > 99
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry exceeds the current finite query boundary.",
    );
  }
  safeReturnPath(entry.project_id, entry.return_context.path);
  return entry;
};

const appendRef = (
  params: URLSearchParams,
  prefix: string,
  ref: FocusedGraphExactRef,
): void => {
  params.set(`${prefix}Id`, ref.record_id);
  params.set(`${prefix}Revision`, String(ref.revision));
  params.set(`${prefix}Hash`, ref.record_hash);
};

export const focusedGraphEntryPath = (entry: FocusedGraphEntry): string => {
  assertEntry(entry);
  const params = new URLSearchParams({
    graphEntry: ENTRY_VERSION,
    requestId: entry.request_id,
    question: entry.question,
    origin: entry.origin.origin_kind,
    definitionId: entry.project_definition_ref.project_definition_id,
    definitionRevision: String(entry.project_definition_ref.revision),
    definitionHash: entry.project_definition_ref.content_hash,
    definitionFamily: entry.project_definition_ref.definition_family,
    taskSemanticKey: entry.task_semantic_key,
    objectSemanticKey: entry.object_semantic_key,
    relationshipSemanticKey: entry.relationship_semantic_key,
    returnActionSemanticKey: entry.return_action_semantic_key,
    returnDestinationKey: entry.return_destination.destination_key,
    returnDestinationKind: entry.return_destination.destination_kind,
    returnDestinationOwner: entry.return_destination.owner,
    returnDestinationLabel: entry.return_destination.label,
    returnDestinationState: entry.return_destination.state,
    semanticLayer: entry.semantic_layer,
    presentation: entry.presentation,
    maximumDepth: String(entry.limits.maximum_depth),
    maximumNodes: String(entry.limits.maximum_nodes),
    maximumRelationships: String(entry.limits.maximum_relationships),
    maximumPaths: String(entry.limits.maximum_paths),
    returnPath: entry.return_context.path,
    returnLabel: entry.return_context.label,
  });
  appendRef(params, "focus", entry.focus_ref);
  if (entry.return_destination.state === "available") {
    appendRef(params, "returnTarget", entry.return_destination.target_ref);
  } else {
    params.set("returnDestinationReason", entry.return_destination.reason);
  }
  if (entry.origin.origin_ref !== undefined) {
    appendRef(params, "originRef", entry.origin.origin_ref);
  }
  if (entry.project_definition_ref.record_hash !== undefined) {
    params.set(
      "definitionRecordHash",
      entry.project_definition_ref.record_hash,
    );
  }
  if (entry.return_context.focus_id !== undefined) {
    params.set("returnFocus", entry.return_context.focus_id);
  }
  if (entry.expected_snapshot !== undefined) {
    params.set("snapshotId", entry.expected_snapshot.snapshot_id);
    params.set("snapshotRevision", String(entry.expected_snapshot.revision));
    params.set(
      "snapshotEventPosition",
      String(entry.expected_snapshot.event_position),
    );
    params.set("snapshotHash", entry.expected_snapshot.content_hash);
  }
  if (entry.historical_position !== undefined) {
    const historical = entry.historical_position;
    params.set("historicalSnapshotId", historical.snapshot.snapshot_id);
    params.set(
      "historicalSnapshotRevision",
      String(historical.snapshot.revision),
    );
    params.set(
      "historicalSnapshotEventPosition",
      String(historical.snapshot.event_position),
    );
    params.set("historicalSnapshotHash", historical.snapshot.content_hash);
    params.set("historicalRecordedAt", historical.temporal_position.at.value);
  }
  if (entry.analysis !== undefined) {
    params.set("analysisRequestId", entry.analysis.analysis_request_id);
    if (entry.analysis.analysis_kind === "impact") {
      params.set("historyEventId", entry.analysis.history_event_id);
      if (entry.analysis.review_binding !== undefined) {
        params.set(
          "reviewSessionId",
          entry.analysis.review_binding.review_session_id,
        );
        params.set(
          "reviewMemberIds",
          entry.analysis.review_binding.review_member_ids.join(","),
        );
      }
    } else if (entry.analysis.analysis_kind === "time") {
      params.set("temporalDimension", entry.analysis.temporal_dimension);
    }
  }
  if (entry.action_preview_target !== undefined) {
    const target = entry.action_preview_target;
    params.set("actionKind", target.action_kind);
    if (target.action_kind === "governed_correction") {
      params.set("actionRequestedChange", target.requested_change);
      params.set("actionReviewSessionId", target.review_session_id);
      params.set("actionReviewMemberId", target.review_member_id);
    } else {
      params.set(
        "actionInquiryLinkId",
        target.inquiry_result_link_ref.project_inquiry_link_id,
      );
      params.set(
        "actionInquiryContentHash",
        target.inquiry_result_link_ref.content_hash,
      );
      params.set(
        "actionInquiryRecordHash",
        target.inquiry_result_link_ref.record_hash,
      );
    }
  }
  return `/projects/${encodeURIComponent(entry.project_id)}/graph?${params}`;
};

const requiredKeys = new Set([
  "graphEntry",
  "requestId",
  "question",
  "focusId",
  "focusRevision",
  "focusHash",
  "origin",
  "definitionId",
  "definitionRevision",
  "definitionHash",
  "definitionFamily",
  "taskSemanticKey",
  "objectSemanticKey",
  "relationshipSemanticKey",
  "returnActionSemanticKey",
  "returnDestinationKey",
  "returnDestinationKind",
  "returnDestinationOwner",
  "returnDestinationLabel",
  "returnDestinationState",
  "semanticLayer",
  "presentation",
  "maximumDepth",
  "maximumNodes",
  "maximumRelationships",
  "maximumPaths",
  "returnPath",
  "returnLabel",
]);

const optionalKeys = new Set([
  "originRefId",
  "originRefRevision",
  "originRefHash",
  "definitionRecordHash",
  "returnFocus",
  "returnDestinationReason",
  "returnTargetId",
  "returnTargetRevision",
  "returnTargetHash",
  "snapshotId",
  "snapshotRevision",
  "snapshotEventPosition",
  "snapshotHash",
  "historicalSnapshotId",
  "historicalSnapshotRevision",
  "historicalSnapshotEventPosition",
  "historicalSnapshotHash",
  "historicalRecordedAt",
  "analysisRequestId",
  "historyEventId",
  "reviewSessionId",
  "reviewMemberIds",
  "temporalDimension",
  "actionKind",
  "actionRequestedChange",
  "actionReviewSessionId",
  "actionReviewMemberId",
  "actionInquiryLinkId",
  "actionInquiryContentHash",
  "actionInquiryRecordHash",
]);

export const focusedGraphEntryFromSearch = (
  projectId: string,
  params: URLSearchParams,
): FocusedGraphEntry | undefined => {
  if (!params.has("graphEntry")) return undefined;
  if (
    [...params.keys()].some(
      (key) => !requiredKeys.has(key) && !optionalKeys.has(key),
    ) ||
    [...requiredKeys].some((key) => params.getAll(key).length !== 1)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry contains missing, duplicate, or unsupported fields.",
    );
  }
  if (requiredParam(params, "graphEntry") !== ENTRY_VERSION) {
    throw new FocusedGraphEntryError(
      "This focused graph entry version is unsupported.",
    );
  }
  const originKind = requiredParam(params, "origin");
  if (
    ![
      "brief",
      "evidence",
      "review",
      "petra",
      "history",
      "saved_question",
      "direct",
    ].includes(originKind)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry origin is unsupported.",
    );
  }
  const originRefFields = [
    optionalParam(params, "originRefId"),
    optionalParam(params, "originRefRevision"),
    optionalParam(params, "originRefHash"),
  ];
  if (
    originRefFields.some((value) => value !== undefined) &&
    originRefFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry origin reference is incomplete.",
    );
  }
  const snapshotFields = [
    optionalParam(params, "snapshotId"),
    optionalParam(params, "snapshotRevision"),
    optionalParam(params, "snapshotEventPosition"),
    optionalParam(params, "snapshotHash"),
  ];
  if (
    snapshotFields.some((value) => value !== undefined) &&
    snapshotFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry snapshot reference is incomplete.",
    );
  }
  const historicalFields = [
    optionalParam(params, "historicalSnapshotId"),
    optionalParam(params, "historicalSnapshotRevision"),
    optionalParam(params, "historicalSnapshotEventPosition"),
    optionalParam(params, "historicalSnapshotHash"),
    optionalParam(params, "historicalRecordedAt"),
  ];
  if (
    historicalFields.some((value) => value !== undefined) &&
    historicalFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph historical position is incomplete.",
    );
  }
  const focus = exactRef(params, "focus");
  const originRef =
    originRefFields[0] === undefined
      ? undefined
      : exactRef(params, "originRef");
  const returnDestinationState = requiredParam(
    params,
    "returnDestinationState",
  );
  const returnTargetFields = [
    optionalParam(params, "returnTargetId"),
    optionalParam(params, "returnTargetRevision"),
    optionalParam(params, "returnTargetHash"),
  ];
  const returnDestinationReason = optionalParam(
    params,
    "returnDestinationReason",
  );
  if (
    (returnDestinationState === "available" &&
      (returnDestinationReason !== undefined ||
        returnTargetFields.some((value) => value === undefined))) ||
    (returnDestinationState === "unavailable" &&
      (returnDestinationReason === undefined ||
        returnTargetFields.some((value) => value !== undefined))) ||
    !["available", "unavailable"].includes(returnDestinationState)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph return destination is incomplete or incompatible.",
    );
  }
  const returnDestination = {
    destination_key: requiredParam(params, "returnDestinationKey"),
    destination_kind: requiredParam(
      params,
      "returnDestinationKind",
    ) as FocusedGraphSemanticDestination["destination_kind"],
    owner: requiredParam(
      params,
      "returnDestinationOwner",
    ) as FocusedGraphSemanticDestination["owner"],
    label: requiredParam(params, "returnDestinationLabel"),
    ...(returnDestinationState === "available"
      ? {
          state: "available" as const,
          target_ref: exactRef(params, "returnTarget"),
        }
      : {
          state: "unavailable" as const,
          reason: returnDestinationReason!,
        }),
  } satisfies FocusedGraphSemanticDestination;
  const snapshotId = snapshotFields[0];
  const expectedSnapshot =
    snapshotId === undefined
      ? undefined
      : {
          snapshot_id: snapshotId,
          revision: positiveInteger(snapshotFields[1]!, "snapshotRevision"),
          event_position: nonNegativeInteger(
            snapshotFields[2]!,
            "snapshotEventPosition",
          ),
          content_hash: snapshotFields[3]!,
        };
  if (
    expectedSnapshot !== undefined &&
    (!/^snapshot_[0-9A-HJKMNP-TV-Z]{26}$/u.test(expectedSnapshot.snapshot_id) ||
      !HASH.test(expectedSnapshot.content_hash))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry snapshot reference is invalid.",
    );
  }
  const definitionRecordHash = optionalParam(params, "definitionRecordHash");
  const returnFocus = optionalParam(params, "returnFocus");
  const semanticLayer = requiredParam(params, "semanticLayer");
  const presentation = requiredParam(params, "presentation");
  const historicalSnapshotId = historicalFields[0];
  const historicalPosition =
    historicalSnapshotId === undefined
      ? undefined
      : {
          snapshot: {
            snapshot_id: historicalSnapshotId,
            revision: positiveInteger(
              historicalFields[1]!,
              "historicalSnapshotRevision",
            ),
            event_position: nonNegativeInteger(
              historicalFields[2]!,
              "historicalSnapshotEventPosition",
            ),
            content_hash: historicalFields[3]!,
          },
          temporal_position: {
            position_kind: "historical" as const,
            dimension: "recorded_time" as const,
            at: {
              state: "exact" as const,
              value: historicalFields[4]!,
            },
          },
        };
  const analysisRequestId = optionalParam(params, "analysisRequestId");
  const historyEventId = optionalParam(params, "historyEventId");
  const reviewSessionId = optionalParam(params, "reviewSessionId");
  const reviewMemberIds = optionalParam(params, "reviewMemberIds");
  const temporalDimension = optionalParam(params, "temporalDimension");
  const actionKind = optionalParam(params, "actionKind");
  const actionRequestedChange = optionalParam(params, "actionRequestedChange");
  const actionReviewSessionId = optionalParam(params, "actionReviewSessionId");
  const actionReviewMemberId = optionalParam(params, "actionReviewMemberId");
  const actionInquiryLinkId = optionalParam(params, "actionInquiryLinkId");
  const actionInquiryContentHash = optionalParam(
    params,
    "actionInquiryContentHash",
  );
  const actionInquiryRecordHash = optionalParam(
    params,
    "actionInquiryRecordHash",
  );
  const hasReviewBinding =
    reviewSessionId !== undefined || reviewMemberIds !== undefined;
  if (
    (reviewSessionId === undefined) !== (reviewMemberIds === undefined) ||
    (presentation === "position" &&
      [
        analysisRequestId,
        historyEventId,
        reviewSessionId,
        reviewMemberIds,
        temporalDimension,
      ].some((value) => value !== undefined))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph analysis entry is incomplete or incompatible.",
    );
  }
  let analysis: FocusedGraphAnalysisEntry | undefined;
  if (
    presentation === "current_working_comparison" &&
    analysisRequestId !== undefined &&
    historyEventId === undefined &&
    !hasReviewBinding &&
    temporalDimension === undefined
  ) {
    analysis = {
      analysis_request_id: analysisRequestId,
      analysis_kind: "comparison",
    };
  } else if (
    presentation === "impact" &&
    analysisRequestId !== undefined &&
    historyEventId !== undefined &&
    temporalDimension === undefined
  ) {
    const memberIds = reviewMemberIds?.split(",");
    analysis = {
      analysis_request_id: analysisRequestId,
      analysis_kind: "impact",
      history_event_id: historyEventId,
      ...(reviewSessionId === undefined || memberIds === undefined
        ? {}
        : {
            review_binding: {
              review_session_id: reviewSessionId,
              review_member_ids: memberIds as [string, ...string[]],
            },
          }),
    };
  } else if (
    presentation === "time" &&
    analysisRequestId !== undefined &&
    historyEventId === undefined &&
    !hasReviewBinding &&
    temporalDimension !== undefined
  ) {
    analysis = {
      analysis_request_id: analysisRequestId,
      analysis_kind: "time",
      temporal_dimension: temporalDimension as Extract<
        FocusedGraphAnalysisEntry,
        { analysis_kind: "time" }
      >["temporal_dimension"],
    };
  }
  const correctionActionFields = [
    actionRequestedChange,
    actionReviewSessionId,
    actionReviewMemberId,
  ];
  const workActionFields = [
    actionInquiryLinkId,
    actionInquiryContentHash,
    actionInquiryRecordHash,
  ];
  let actionPreviewTarget: FocusedGraphActionPreviewTarget | undefined;
  if (
    actionKind === "governed_correction" &&
    correctionActionFields.every((value) => value !== undefined) &&
    workActionFields.every((value) => value === undefined)
  ) {
    actionPreviewTarget = {
      action_kind: "governed_correction",
      requested_change: actionRequestedChange as Extract<
        FocusedGraphActionPreviewTarget,
        { action_kind: "governed_correction" }
      >["requested_change"],
      review_session_id: actionReviewSessionId!,
      review_member_id: actionReviewMemberId!,
    };
  } else if (
    actionKind === "new_work" &&
    workActionFields.every((value) => value !== undefined) &&
    correctionActionFields.every((value) => value === undefined)
  ) {
    actionPreviewTarget = {
      action_kind: "new_work",
      inquiry_result_link_ref: {
        project_inquiry_link_id: actionInquiryLinkId!,
        content_hash: actionInquiryContentHash!,
        record_hash: actionInquiryRecordHash!,
      },
    };
  } else if (
    actionKind !== undefined ||
    [...correctionActionFields, ...workActionFields].some(
      (value) => value !== undefined,
    )
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph action-preview target is incomplete or incompatible.",
    );
  }
  const entry: FocusedGraphEntry = {
    project_id: projectId,
    request_id: requiredParam(params, "requestId"),
    question: requiredParam(params, "question"),
    focus_ref: focus,
    origin: {
      origin_kind: originKind as FocusedGraphEntryOriginKind,
      ...(originRef === undefined ? {} : { origin_ref: originRef }),
    },
    project_definition_ref: {
      project_definition_id: requiredParam(params, "definitionId"),
      revision: positiveInteger(
        requiredParam(params, "definitionRevision"),
        "definitionRevision",
      ),
      content_hash: requiredParam(params, "definitionHash"),
      definition_family: requiredParam(params, "definitionFamily"),
      ...(definitionRecordHash === undefined
        ? {}
        : { record_hash: definitionRecordHash }),
    },
    task_semantic_key: requiredParam(params, "taskSemanticKey"),
    object_semantic_key: requiredParam(params, "objectSemanticKey"),
    relationship_semantic_key: requiredParam(params, "relationshipSemanticKey"),
    return_action_semantic_key: requiredParam(
      params,
      "returnActionSemanticKey",
    ),
    return_destination: returnDestination,
    limits: {
      maximum_depth: positiveInteger(
        requiredParam(params, "maximumDepth"),
        "maximumDepth",
        4,
      ),
      maximum_nodes: positiveInteger(
        requiredParam(params, "maximumNodes"),
        "maximumNodes",
        100,
      ),
      maximum_relationships: positiveInteger(
        requiredParam(params, "maximumRelationships"),
        "maximumRelationships",
        99,
      ),
      maximum_paths: positiveInteger(
        requiredParam(params, "maximumPaths"),
        "maximumPaths",
        99,
      ),
    },
    semantic_layer: semanticLayer as FocusedGraphEntry["semantic_layer"],
    presentation: presentation as FocusedGraphPresentation,
    ...(analysis === undefined ? {} : { analysis }),
    ...(expectedSnapshot === undefined
      ? {}
      : { expected_snapshot: expectedSnapshot }),
    ...(historicalPosition === undefined
      ? {}
      : { historical_position: historicalPosition }),
    ...(actionPreviewTarget === undefined
      ? {}
      : { action_preview_target: actionPreviewTarget }),
    return_context: {
      path: safeReturnPath(projectId, requiredParam(params, "returnPath")),
      label: requiredParam(params, "returnLabel"),
      ...(returnFocus === undefined ? {} : { focus_id: returnFocus }),
    },
  };
  return assertEntry(entry);
};

export const focusedGraphDefinitionRef = (
  definition: PetraProjectDefinition,
): FocusedGraphEntryDefinitionRef => ({
  project_definition_id: definition.project_definition_id,
  revision: definition.revision,
  content_hash: definition.content_hash,
  definition_family: definition.definition_family,
});

export const scientificFocusedGraphSemantics = (
  definition: PetraProjectDefinition,
):
  | Pick<
      FocusedGraphEntry,
      | "task_semantic_key"
      | "object_semantic_key"
      | "relationship_semantic_key"
      | "return_action_semantic_key"
    >
  | undefined => {
  const expected = [
    ["scientific.research-question", "objective_schema"],
    ["scientific.claim", "object_schema"],
    ["scientific.assertion", "relationship_schema"],
    ["scientific.graph.return", "extension"],
    ["petra.focused-graph", "extension"],
  ] as const;
  const registered = expected.every(
    ([semanticKey, registrationKind]) =>
      definition.content.registrations.filter(
        (registration) =>
          registration.semantic_key === semanticKey &&
          registration.registration_kind === registrationKind,
      ).length === 1 &&
      (semanticKey === "petra.focused-graph" ||
        definition.content.terms.filter(
          (term) => term.semantic_key === semanticKey,
        ).length === 1),
  );
  if (!registered) return undefined;
  return {
    task_semantic_key: "scientific.research-question",
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.return",
  };
};

export const scientificFocusedGraphEntryDraft = (input: {
  readonly projectId: string;
  readonly question: string;
  readonly focusRef: FocusedGraphExactRef;
  readonly originKind: FocusedGraphEntryOriginKind;
  readonly definitionRef: FocusedGraphEntryDefinitionRef;
  readonly returnDestinationKind: FocusedGraphSemanticDestination["destination_kind"];
  readonly returnDestinationOwner: FocusedGraphSemanticDestination["owner"];
  readonly returnLabel: string;
  readonly returnFocusId?: string;
  readonly expectedSnapshot?: FocusedGraphProjectSnapshotRef;
  readonly historicalPosition?: FocusedGraphHistoricalPosition;
  readonly semanticLayer?: FocusedGraphEntry["semantic_layer"];
  readonly analysis?: FocusedGraphAnalysisEntryDraft;
  readonly actionPreviewTarget?: FocusedGraphActionPreviewTarget;
}): FocusedGraphEntryDraft => ({
  project_id: input.projectId,
  question: input.question,
  focus_ref: structuredClone(input.focusRef),
  origin: {
    origin_kind: input.originKind,
    ...(input.originKind === "direct"
      ? {}
      : { origin_ref: structuredClone(input.focusRef) }),
  },
  project_definition_ref: structuredClone(input.definitionRef),
  task_semantic_key: "scientific.research-question",
  object_semantic_key: "scientific.claim",
  relationship_semantic_key: "scientific.assertion",
  return_action_semantic_key: "scientific.graph.return",
  return_destination: {
    destination_key: `destination:${input.originKind}:${input.focusRef.record_id.toLowerCase()}`,
    destination_kind: input.returnDestinationKind,
    state: "available",
    owner: input.returnDestinationOwner,
    label: input.returnLabel,
    target_ref: structuredClone(input.focusRef),
  },
  limits: {
    maximum_depth: 1,
    maximum_nodes: 25,
    maximum_relationships: 24,
    maximum_paths: 24,
  },
  semantic_layer: input.semanticLayer ?? "current",
  presentation:
    input.analysis?.analysis_kind === "comparison"
      ? "current_working_comparison"
      : (input.analysis?.analysis_kind ?? "position"),
  ...(input.analysis === undefined
    ? {}
    : {
        analysis: {
          ...structuredClone(input.analysis),
          analysis_request_id: createFocusedGraphAnalysisRequestId(),
        },
      }),
  ...(input.expectedSnapshot === undefined
    ? {}
    : { expected_snapshot: structuredClone(input.expectedSnapshot) }),
  ...(input.historicalPosition === undefined
    ? {}
    : { historical_position: structuredClone(input.historicalPosition) }),
  ...(input.actionPreviewTarget === undefined
    ? {}
    : { action_preview_target: structuredClone(input.actionPreviewTarget) }),
  return_context: {
    label: input.returnLabel,
    ...(input.returnFocusId === undefined
      ? {}
      : { focus_id: input.returnFocusId }),
  },
});

export const FocusedGraphEntryLink = ({
  entry,
  children,
  className = "reference-text-link",
}: {
  entry: FocusedGraphEntryDraft;
  children: ReactNode;
  className?: string;
}): React.JSX.Element | null => {
  const location = useLocation();
  const [requestId] = useState(createFocusedGraphRequestId);
  const [analysisRequestId] = useState(createFocusedGraphAnalysisRequestId);
  const currentReturnPath = `${location.pathname}${location.search}${
    entry.return_context.focus_id === undefined
      ? location.hash
      : `#${encodeURIComponent(entry.return_context.focus_id)}`
  }`;
  const returnPath = entry.return_context.path ?? currentReturnPath;
  const exactEntry: FocusedGraphEntry = {
    ...entry,
    request_id: requestId,
    ...(entry.analysis === undefined
      ? {}
      : {
          analysis: {
            ...entry.analysis,
            analysis_request_id: analysisRequestId,
          },
        }),
    return_context: { ...entry.return_context, path: returnPath },
  };
  let path: string;
  try {
    path = focusedGraphEntryPath(exactEntry);
  } catch (error) {
    if (error instanceof FocusedGraphEntryError) return null;
    throw error;
  }
  return (
    <Link className={className} to={path}>
      {children}
    </Link>
  );
};

const originLabel: Record<FocusedGraphEntryOriginKind, string> = {
  brief: "Brief",
  evidence: "evidence",
  review: "Review",
  petra: "Petra",
  history: "History",
  saved_question: "saved question",
  direct: "direct Graph entry",
};

const layerLabel: Record<FocusedGraphEntry["semantic_layer"], string> = {
  current: "Current",
  working: "Working changes",
  historical: "Historical",
};

const layerSymbol: Record<FocusedGraphEntry["semantic_layer"], string> = {
  current: "C",
  working: "W",
  historical: "H",
};

export const FocusedGraphOrientationSurface = ({
  data,
  explorationRead,
  actionPreviewRead,
  saveInquiry,
  assessInquirySave,
  rendererFactory,
}: {
  data: FocusedGraphRouteData;
  explorationRead?: FocusedGraphExplorationRead | undefined;
  actionPreviewRead?: FocusedGraphActionPreviewRead | undefined;
  saveInquiry?: ProjectInquirySaveCommand | undefined;
  assessInquirySave?: ProjectInquirySaveRecoveryRead | undefined;
  rendererFactory?: FocusedGraphRendererFactory | undefined;
}): React.JSX.Element => {
  const regions = focusedGraphRegionsFromView(data.view);
  const heading = useRef<HTMLHeadingElement>(null);
  const [navigationIds] = useState(() => ({
    current: createFocusedGraphRequestId(),
    working: createFocusedGraphRequestId(),
    historical: createFocusedGraphRequestId(),
    comparisonGraph: createFocusedGraphRequestId(),
    comparisonAnalysis: createFocusedGraphAnalysisRequestId(),
    timeGraph: createFocusedGraphRequestId(),
    timeAnalysis: createFocusedGraphAnalysisRequestId(),
  }));
  useEffect(() => heading.current?.focus(), []);
  const focus = regions.graph.nodes.find((node) =>
    sameRef(node.record_ref, data.entry.focus_ref),
  );
  if (focus === undefined) {
    throw new FocusedGraphEntryError(
      "The focused graph response omitted the exact selected object.",
    );
  }
  const requested = regions.orientation.requestedSnapshot;
  const represented = regions.orientation.representedSnapshot;
  const projection = regions.orientation.projectionPosition;
  const activeLayer = regions.orientation.semanticLayer;
  const positionPath = (
    layer: FocusedGraphEntry["semantic_layer"],
    requestId: string,
    presentation: FocusedGraphPresentation = "position",
    analysis?: FocusedGraphAnalysisEntry,
  ): string => {
    const {
      analysis: priorAnalysis,
      action_preview_target: actionPreviewTarget,
      ...entryWithoutAnalysis
    } = data.entry;
    void priorAnalysis;
    return focusedGraphEntryPath({
      ...entryWithoutAnalysis,
      request_id: requestId,
      semantic_layer: layer,
      presentation,
      ...(layer === "historical" ||
      presentation !== "position" ||
      actionPreviewTarget === undefined
        ? {}
        : { action_preview_target: actionPreviewTarget }),
      ...(analysis === undefined ? {} : { analysis }),
    });
  };
  const positionPaths = {
    current: positionPath("current", navigationIds.current),
    working: positionPath("working", navigationIds.working),
    ...(data.entry.historical_position === undefined
      ? {}
      : {
          historical: positionPath("historical", navigationIds.historical),
        }),
    comparison: positionPath(
      activeLayer === "historical" ? "working" : activeLayer,
      navigationIds.comparisonGraph,
      "current_working_comparison",
      {
        analysis_request_id: navigationIds.comparisonAnalysis,
        analysis_kind: "comparison",
      },
    ),
    time: positionPath(activeLayer, navigationIds.timeGraph, "time", {
      analysis_request_id: navigationIds.timeAnalysis,
      analysis_kind: "time",
      temporal_dimension: "recorded_time",
    }),
  };
  const analysisKind = data.analysis?.content.analysis.analysis_kind;
  return (
    <main
      className="reference-surface graph-surface"
      id="reference-main"
      data-focused-request-id={regions.orientation.task.request_id}
    >
      <header className="graph-heading">
        <div>
          <p className="reference-eyebrow">
            Graph · bounded relationship question
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {regions.orientation.task.question}
          </h1>
          <p className="reference-lede">
            {focus.term.singular}: {focus.label}
          </p>
          <p>
            Opened from {originLabel[data.entry.origin.origin_kind]}. This{" "}
            {layerLabel[activeLayer].toLowerCase()}, snapshot-bound entry
            preserves the exact selected object and return context.
          </p>
        </div>
        <span className="graph-state" data-layer={activeLayer}>
          <span aria-hidden="true">{layerSymbol[activeLayer]}</span>
          {layerLabel[activeLayer]}
        </span>
      </header>

      <FocusedGraphPositionNavigation
        activeLayer={activeLayer}
        comparisonActive={analysisKind === "comparison"}
        timeActive={analysisKind === "time"}
        analysisActive={analysisKind !== undefined}
        paths={positionPaths}
      />

      {data.resume === undefined ? null : (
        <section
          className="reference-notice focused-graph-resume"
          aria-labelledby="focused-graph-resume-title"
          data-resume-state="available"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            ↳
          </span>
          <div>
            <p className="reference-panel-kicker">Project resume</p>
            <h2 id="focused-graph-resume-title">Resumed exact task</h2>
            <p>{data.resume.recovery.reason}</p>
            <p>
              Opened from {originLabel[data.resume.origin.origin_kind]} ·
              retained {data.resume.retainedAt} ·{" "}
              {data.resume.selection.state === "selected"
                ? `${data.resume.selection.selected_keys.length} retained ${data.resume.selection.selection_kind} selection${data.resume.selection.selected_keys.length === 1 ? "" : "s"}`
                : "no retained selection"}
              .
            </p>
            <details>
              <summary>Exact retained context</summary>
              <dl className="history-facts">
                <div>
                  <dt>Task</dt>
                  <dd>{data.resume.label}</dd>
                </div>
                <div>
                  <dt>Focus</dt>
                  <dd>
                    {data.resume.focusRefs
                      .map((ref) => ref.record_id)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Selection</dt>
                  <dd>
                    {data.resume.selection.state === "selected"
                      ? data.resume.selection.selected_keys.join(", ")
                      : "None"}
                  </dd>
                </div>
              </dl>
            </details>
          </div>
        </section>
      )}

      {activeLayer === "historical" ? (
        <section
          className="reference-notice"
          aria-labelledby="focused-graph-historical-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            H
          </span>
          <div>
            <h2 id="focused-graph-historical-title">Historical · read only</h2>
            <p>
              This exact retained position cannot be edited. Return to current
              before starting a current correction or Review path.
            </p>
          </div>
        </section>
      ) : null}

      {projection.state === "current" ? null : (
        <section
          className="reference-notice"
          aria-labelledby="focused-graph-projection-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            ↻
          </span>
          <div>
            <h2 id="focused-graph-projection-title">
              Projection position · {projection.state.replaceAll("_", " ")}
            </h2>
            <p>{projection.detail}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="focused-graph-orientation-title">
        <p className="reference-panel-kicker">Exact entry orientation</p>
        <h2 id="focused-graph-orientation-title">Entry scope and position</h2>
        <p>{regions.graph.scope.description}</p>
        <dl className="history-facts">
          <div>
            <dt>Requested snapshot</dt>
            <dd>
              <code>{requested.snapshot_id}</code> · event{" "}
              {requested.event_position}
            </dd>
          </div>
          <div>
            <dt>Represented snapshot</dt>
            <dd>
              <code>{represented.snapshot_id}</code> · event{" "}
              {represented.event_position}
            </dd>
          </div>
          <div>
            <dt>Entry result</dt>
            <dd>
              {regions.graph.nodes.length} objects ·{" "}
              {regions.graph.relationships.length} relationships ·{" "}
              {regions.graph.paths.length} paths
            </dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{regions.graph.scope.coverage.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Semantic layer</dt>
            <dd>{layerLabel[activeLayer]}</dd>
          </div>
          <div>
            <dt>Temporal position</dt>
            <dd>
              {regions.orientation.temporalPosition.position_kind.replaceAll(
                "_",
                " ",
              )}{" "}
              ·{" "}
              {regions.orientation.temporalPosition.dimension.replaceAll(
                "_",
                " ",
              )}
              {regions.orientation.temporalPosition.position_kind ===
                "historical" &&
              regions.orientation.temporalPosition.at.state === "exact"
                ? ` · ${regions.orientation.temporalPosition.at.value}`
                : regions.orientation.temporalPosition.position_kind ===
                      "historical" &&
                    regions.orientation.temporalPosition.at.state === "unknown"
                  ? " · date unknown"
                  : regions.orientation.temporalPosition.position_kind ===
                        "historical" &&
                      regions.orientation.temporalPosition.at.state ===
                        "unavailable"
                    ? ` · date unavailable: ${regions.orientation.temporalPosition.at.reason}`
                    : ""}
            </dd>
          </div>
          <div>
            <dt>Projection position</dt>
            <dd>
              {projection.state.replaceAll("_", " ")} · represented event{" "}
              {projection.represented_event_position} · observed event{" "}
              {projection.observed_event_position} · pending{" "}
              {projection.pending_records}
            </dd>
          </div>
        </dl>
        <details>
          <summary>Entry request, finite limits, and omissions</summary>
          <dl className="history-facts">
            <div>
              <dt>Request</dt>
              <dd>
                <code>{regions.orientation.task.request_id}</code>
              </dd>
            </div>
            <div>
              <dt>Definition</dt>
              <dd>
                {regions.orientation.profile.label} · revision{" "}
                {regions.orientation.profile.project_definition_ref.revision}
              </dd>
            </div>
            <div>
              <dt>Limits</dt>
              <dd>
                depth {regions.graph.scope.limits.maximum_depth}; nodes{" "}
                {regions.graph.scope.limits.maximum_nodes}; relationships{" "}
                {regions.graph.scope.limits.maximum_relationships}; paths{" "}
                {regions.graph.scope.limits.maximum_paths}
              </dd>
            </div>
          </dl>
          <ul>
            {regions.graph.scope.omissions.map((omission, index) => (
              <li key={`${omission.omission_kind}:${index}`}>
                {omission.description}
              </li>
            ))}
            {regions.graph.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      </section>

      {data.analysis === undefined ? (
        <FocusedGraphExploration
          key={`${data.view.content.task.request_id}:${data.view.content_hash}`}
          entry={data.entry}
          definition={data.definition}
          initialRequest={data.request}
          initialView={data.view}
          {...(data.resume === undefined
            ? {}
            : { initialSelection: data.resume.selection })}
          {...(explorationRead === undefined ? {} : { read: explorationRead })}
          {...(actionPreviewRead === undefined ? {} : { actionPreviewRead })}
          {...(saveInquiry === undefined ? {} : { saveInquiry })}
          {...(assessInquirySave === undefined ? {} : { assessInquirySave })}
          {...(rendererFactory === undefined ? {} : { rendererFactory })}
        />
      ) : (
        <FocusedGraphAnalysisSurface view={data.analysis} />
      )}

      <footer className="reference-reader-return">
        <p>
          This entry is read-only. Selection, layout, and this return link grant
          no Project authority.
        </p>
        {data.entry.return_destination.state === "available" ? (
          <Link
            className="reference-primary-link"
            to={data.entry.return_context.path}
            {...(data.entry.return_context.focus_id === undefined
              ? {}
              : { "data-return-focus": data.entry.return_context.focus_id })}
          >
            Return to {data.entry.return_context.label}
          </Link>
        ) : (
          <div className="reference-unavailable" role="status">
            <strong>Exact return unavailable</strong>
            <p>{data.entry.return_destination.reason}</p>
            <Link
              className="reference-text-link"
              to={data.entry.return_context.path}
            >
              Open current Brief
            </Link>
          </div>
        )}
      </footer>
    </main>
  );
};

export const isFocusedGraphRouteData = (
  value: unknown,
): value is FocusedGraphRouteData =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  value.kind === "focused_graph";
