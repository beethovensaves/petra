import { createHash } from "node:crypto";

import type {
  FocusedGraphActionPreviewContent,
  FocusedGraphDetailsSelection,
  FocusedGraphRelationship,
  PetraFocusedGraphActionPreviewView,
  PetraProjectReviewViewRecord,
  PetraSuggestedActionViewV11,
  PetraWorkingRelationship,
} from "@petra/contracts";
import {
  ContractRegistryError,
  PetraContractRegistry,
} from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { ProjectReviewViewReader } from "./review-session.js";
import type { SuggestedActionViewReader } from "./suggested-action-view.js";
import {
  FocusedGraphQueryError,
  parseFocusedGraphViewRequest,
  type FocusedGraphReadRequest,
  type FocusedGraphViewReader,
  type PetraFocusedGraphReadView,
} from "./focused-graph-view.js";

export type FocusedGraphActionPreviewQueryErrorCode =
  | "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID"
  | "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_NOT_FOUND"
  | "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE"
  | "FOCUSED_GRAPH_ACTION_PREVIEW_CONTRACT_INVALID";

export class FocusedGraphActionPreviewQueryError extends Error {
  constructor(
    readonly code: FocusedGraphActionPreviewQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FocusedGraphActionPreviewQueryError";
  }
}

export type FocusedGraphCorrectionKind =
  "edit_relationship" | "relink" | "split" | "change_scope";

export interface FocusedGraphCorrectionPreviewTarget {
  readonly action_kind: "governed_correction";
  readonly requested_change: FocusedGraphCorrectionKind;
  readonly review_session_id: string;
  readonly review_member_id: string;
}

export interface FocusedGraphNewWorkPreviewTarget {
  readonly action_kind: "new_work";
  readonly inquiry_result_link_ref: {
    readonly project_inquiry_link_id: string;
    readonly content_hash: string;
    readonly record_hash: string;
  };
}

export interface FocusedGraphActionPreviewViewRequest {
  readonly action_request_id: string;
  readonly focused_graph_request: FocusedGraphReadRequest;
  readonly expected_graph: {
    readonly schema_name: "petra.focused-graph-view";
    readonly schema_version: "1.0.0" | "1.1.0";
    readonly content_hash: string;
  };
  readonly selection: FocusedGraphDetailsSelection;
  readonly target:
    FocusedGraphCorrectionPreviewTarget | FocusedGraphNewWorkPreviewTarget;
}

export interface FocusedGraphActionPreviewViewReader {
  queryFocusedGraphActionPreview(
    projectId: string,
    request: FocusedGraphActionPreviewViewRequest,
  ): Promise<PetraFocusedGraphActionPreviewView | undefined>;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const ACTION_REQUEST_ID =
  /^focused_graph_action_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const INQUIRY_LINK_ID = /^project_inquiry_link_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;
const STABLE_KEY = /^[a-z][a-z0-9._:/-]{1,999}$/u;

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
): boolean => {
  const allowed = new Set(required);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
};

const parseSelection = (value: unknown): FocusedGraphDetailsSelection => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["selection_kind", "selected_keys"]) ||
    !["node", "relationship", "path"].includes(String(value.selection_kind)) ||
    !Array.isArray(value.selected_keys) ||
    value.selected_keys.length !== 1 ||
    typeof value.selected_keys[0] !== "string" ||
    !STABLE_KEY.test(value.selected_keys[0])
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A focused graph action preview requires one exact node, relationship, or path selection.",
    );
  }
  return {
    selection_kind:
      value.selection_kind as FocusedGraphDetailsSelection["selection_kind"],
    selected_keys: [value.selected_keys[0]],
  };
};

const parseTarget = (
  value: unknown,
): FocusedGraphActionPreviewViewRequest["target"] => {
  if (!isRecord(value) || typeof value.action_kind !== "string") {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A focused graph action preview requires one registered action target.",
    );
  }
  if (value.action_kind === "governed_correction") {
    if (
      !exactKeys(value, [
        "action_kind",
        "requested_change",
        "review_session_id",
        "review_member_id",
      ]) ||
      !["edit_relationship", "relink", "split", "change_scope"].includes(
        String(value.requested_change),
      ) ||
      typeof value.review_session_id !== "string" ||
      !REVIEW_SESSION_ID.test(value.review_session_id) ||
      typeof value.review_member_id !== "string" ||
      !REVIEW_MEMBER_ID.test(value.review_member_id)
    ) {
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
        "A governed correction preview requires one supported change kind and exact Review session and member identities.",
      );
    }
    return {
      action_kind: "governed_correction",
      requested_change: value.requested_change as FocusedGraphCorrectionKind,
      review_session_id: value.review_session_id,
      review_member_id: value.review_member_id,
    };
  }
  if (
    value.action_kind !== "new_work" ||
    !exactKeys(value, ["action_kind", "inquiry_result_link_ref"]) ||
    !isRecord(value.inquiry_result_link_ref) ||
    !exactKeys(value.inquiry_result_link_ref, [
      "project_inquiry_link_id",
      "content_hash",
      "record_hash",
    ]) ||
    typeof value.inquiry_result_link_ref.project_inquiry_link_id !== "string" ||
    !INQUIRY_LINK_ID.test(
      value.inquiry_result_link_ref.project_inquiry_link_id,
    ) ||
    typeof value.inquiry_result_link_ref.content_hash !== "string" ||
    !HASH.test(value.inquiry_result_link_ref.content_hash) ||
    typeof value.inquiry_result_link_ref.record_hash !== "string" ||
    !HASH.test(value.inquiry_result_link_ref.record_hash)
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A new-Work preview requires one exact retained inquiry-result link.",
    );
  }
  return {
    action_kind: "new_work",
    inquiry_result_link_ref: {
      project_inquiry_link_id:
        value.inquiry_result_link_ref.project_inquiry_link_id,
      content_hash: value.inquiry_result_link_ref.content_hash,
      record_hash: value.inquiry_result_link_ref.record_hash,
    },
  };
};

/** Parse an untrusted action-preview body without accepting layout or gestures. */
export const parseFocusedGraphActionPreviewViewRequest = (
  value: unknown,
): FocusedGraphActionPreviewViewRequest => {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "action_request_id",
      "focused_graph_request",
      "expected_graph",
      "selection",
      "target",
    ]) ||
    typeof value.action_request_id !== "string" ||
    !ACTION_REQUEST_ID.test(value.action_request_id) ||
    !isRecord(value.expected_graph) ||
    !exactKeys(value.expected_graph, [
      "schema_name",
      "schema_version",
      "content_hash",
    ]) ||
    value.expected_graph.schema_name !== "petra.focused-graph-view" ||
    !["1.0.0", "1.1.0"].includes(String(value.expected_graph.schema_version)) ||
    typeof value.expected_graph.content_hash !== "string" ||
    !HASH.test(value.expected_graph.content_hash)
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A focused graph action preview requires one exact request and expected graph identity.",
    );
  }
  let graphRequest: FocusedGraphReadRequest;
  try {
    graphRequest = parseFocusedGraphViewRequest(value.focused_graph_request);
  } catch (error) {
    if (error instanceof FocusedGraphQueryError) {
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
        error.message,
      );
    }
    throw error;
  }
  if (graphRequest.expected_snapshot === undefined) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A focused graph action preview must bind one exact requested Project snapshot.",
    );
  }
  const selection = parseSelection(value.selection);
  const target = parseTarget(value.target);
  if (
    target.action_kind === "governed_correction" &&
    selection.selection_kind !== "relationship"
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
      "A governed correction preview must select exactly one relationship.",
    );
  }
  return {
    action_request_id: value.action_request_id,
    focused_graph_request: graphRequest,
    expected_graph: {
      schema_name: "petra.focused-graph-view",
      schema_version: value.expected_graph
        .schema_version as FocusedGraphActionPreviewViewRequest["expected_graph"]["schema_version"],
      content_hash: value.expected_graph.content_hash,
    },
    selection,
    target,
  };
};

const assertGraphIdentity = (
  projectId: string,
  request: FocusedGraphActionPreviewViewRequest,
  graph: PetraFocusedGraphReadView,
): void => {
  if (
    graph.project_id !== projectId ||
    graph.schema_name !== request.expected_graph.schema_name ||
    graph.schema_version !== request.expected_graph.schema_version ||
    graph.content_hash !== request.expected_graph.content_hash ||
    graph.content.task.request_id !==
      request.focused_graph_request.request_id ||
    !same(
      graph.content.requested_snapshot,
      request.focused_graph_request.expected_snapshot,
    ) ||
    !same(
      graph.content.profile.project_definition_ref,
      request.focused_graph_request.project_definition_ref,
    )
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
      "The action preview resolved a different Project, graph, snapshot, request, or ProjectDefinition identity.",
    );
  }
};

const assertSelection = (
  graph: PetraFocusedGraphReadView,
  selection: FocusedGraphDetailsSelection,
): void => {
  const keys = new Set(
    selection.selection_kind === "node"
      ? graph.content.nodes.map((node) => node.node_key)
      : selection.selection_kind === "relationship"
        ? graph.content.relationships.map(
            (relationship) => relationship.relationship_key,
          )
        : graph.content.paths.map((path) => path.path_key),
  );
  if (selection.selected_keys.some((key) => !keys.has(key))) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_NOT_FOUND",
      "The exact selected graph member is unavailable in the re-executed result.",
    );
  }
};

const selectedRelationship = (
  graph: PetraFocusedGraphReadView,
  selection: FocusedGraphDetailsSelection,
): FocusedGraphRelationship => {
  const key = selection.selected_keys[0];
  const relationship = graph.content.relationships.find(
    (candidate) => candidate.relationship_key === key,
  );
  if (relationship === undefined) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_NOT_FOUND",
      "The selected relationship is unavailable in the exact focused graph.",
    );
  }
  return relationship;
};

const workingRelationshipMatches = (
  selected: FocusedGraphRelationship,
  relationship: PetraWorkingRelationship,
): boolean => {
  if (
    relationship.profile_relationship.registration.semantic_key !==
    selected.semantic_key
  ) {
    return false;
  }
  if (selected.layer === "working") {
    return (
      relationship.working_relationship_id ===
        selected.relationship_ref.element_id &&
      relationship.revision === selected.relationship_ref.revision &&
      digest(relationship) === selected.relationship_ref.record_hash
    );
  }
  const current = relationship.profile_relationship.current_authoritative_ref;
  return (
    selected.layer === "current" &&
    current !== undefined &&
    current.record_id === selected.relationship_ref.element_id &&
    current.revision === selected.relationship_ref.revision &&
    current.record_hash === selected.relationship_ref.record_hash
  );
};

const correctionPreview = (
  projectId: string,
  graph: PetraFocusedGraphReadView,
  selected: FocusedGraphRelationship,
  review: PetraProjectReviewViewRecord,
  target: FocusedGraphCorrectionPreviewTarget,
): FocusedGraphActionPreviewContent["preview"] => {
  if (
    review.project_id !== projectId ||
    review.review_session_id !== target.review_session_id ||
    (review.schema_version !== "1.2.0" && review.schema_version !== "1.3.0") ||
    review.content.session.lifecycle !== "open"
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
      "The exact Review binding is not an open working-state Review preview in this Project.",
    );
  }
  const member = review.content.members.find(
    (candidate) => candidate.review_member_id === target.review_member_id,
  );
  if (member === undefined) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_NOT_FOUND",
      "The exact Review member is unavailable.",
    );
  }
  const matched = member.working_state.relationships.some((relationship) =>
    workingRelationshipMatches(selected, relationship),
  );
  if (
    !matched ||
    member.working_state.selection_basis !==
      "exact_review_session_working_bindings" ||
    member.working_state.authority_effect !== "none"
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
      "The Review member does not own the exact selected relationship through its canonical working-state binding.",
    );
  }
  const candidate = member.working_state.candidate;
  const relationships = member.working_state.relationships;
  return {
    preview_kind: "governed_correction",
    requested_change: target.requested_change,
    selected_relationship: structuredClone(selected),
    review_session_ref: {
      review_session_id: review.review_session_id,
      revision: review.content.session.revision,
      content_hash: review.content.session.content_hash,
      lifecycle: "open",
    },
    review_member_id: member.review_member_id,
    working_candidate_ref: {
      working_candidate_id: candidate.working_candidate_id,
      revision: candidate.revision,
      content_hash: candidate.content_hash,
    },
    working_relationship_refs: relationships.map((relationship) => ({
      working_relationship_id: relationship.working_relationship_id,
      revision: relationship.revision,
      content_hash: relationship.content_hash,
    })) as [
      {
        working_relationship_id: string;
        revision: number;
        content_hash: string;
      },
      ...{
        working_relationship_id: string;
        revision: number;
        content_hash: string;
      }[],
    ],
    review_view: structuredClone(review),
    affected_scope: [
      `The exact selected ${selected.term.singular.toLocaleLowerCase()} ${selected.relationship_ref.element_id} is the correction target.`,
      `Review member ${member.review_member_id} retains WorkingCandidate ${candidate.working_candidate_id} and ${relationships.length} exact WorkingRelationship ${relationships.length === 1 ? "revision" : "revisions"}.`,
    ],
    unchanged: [
      "Opening or closing this preview creates no WorkingCandidate, WorkingRelationship, command, event, ChangeSet, Approval, projection effect, or authority change.",
      "Any submitted correction, relink, split, or scope revision must use the existing canonical Review path and its exact stale-input, validation, approval, Apply, and Revert boundaries.",
      `Graph request ${graph.content.task.request_id}, its layout, coordinates, and gestures grant no mutation authority.`,
    ],
    operation: {
      state: "preview_only",
      working_revision: "only_after_canonical_correction_submission",
      review_decision: "not_performed",
      authority_change: "only_after_validated_review_apply",
      cancellation: "closing_preview_leaves_domain_state_unchanged",
    },
  };
};

const newWorkPreview = (
  projectId: string,
  graph: PetraFocusedGraphReadView,
  selection: FocusedGraphDetailsSelection,
  suggestedAction: PetraSuggestedActionViewV11,
  target: FocusedGraphNewWorkPreviewTarget,
): FocusedGraphActionPreviewContent["preview"] => {
  const action = suggestedAction.content.action;
  const basis = action.basis;
  if (
    suggestedAction.project_id !== projectId ||
    !same(basis.inquiry_result_link_ref, target.inquiry_result_link_ref) ||
    !same(
      basis.project_definition_ref,
      graph.content.profile.project_definition_ref,
    ) ||
    action.objective.semantic_key !== graph.content.task.task_semantic_key ||
    suggestedAction.content.operation.work_start !==
      "only_after_exact_invocation" ||
    suggestedAction.content.operation.authority_change !== "none"
  ) {
    throw new FocusedGraphActionPreviewQueryError(
      "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
      "The SuggestedAction preview does not preserve the exact Project, definition, inquiry-result basis, task semantic, Work-start, or authority boundary.",
    );
  }
  return {
    preview_kind: "new_work",
    selected_member_keys: structuredClone(selection.selected_keys),
    inquiry_result_link_ref: structuredClone(target.inquiry_result_link_ref),
    suggested_action_view: structuredClone(suggestedAction),
    operation: {
      state: "preview_only",
      work_start: "only_after_exact_invocation",
      authority_change: "none",
      delivery_abort: "does_not_cancel_work",
      work_cancellation: "separate_authorized_command",
    },
  };
};

const latestReadAt = (values: readonly string[]): string =>
  [...values].sort((left, right) => Date.parse(right) - Date.parse(left))[0]!;

/**
 * Read-only composition over the exact focused graph and existing Review and
 * SuggestedAction owners. It creates no graph-specific mutation or Work path.
 */
export class FocusedGraphActionPreviewViewComposer implements FocusedGraphActionPreviewViewReader {
  readonly #contracts: PetraContractRegistry;

  constructor(
    readonly focusedGraphs: FocusedGraphViewReader,
    readonly reviews: ProjectReviewViewReader,
    readonly suggestedActions: SuggestedActionViewReader,
    contracts = new PetraContractRegistry(),
  ) {
    this.#contracts = contracts;
  }

  async queryFocusedGraphActionPreview(
    projectId: string,
    input: FocusedGraphActionPreviewViewRequest,
  ): Promise<PetraFocusedGraphActionPreviewView | undefined> {
    const request = parseFocusedGraphActionPreviewViewRequest(input);
    if (!PROJECT_ID.test(projectId)) {
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
        "A focused graph action preview requires one exact Project identity.",
      );
    }
    const graph = await this.focusedGraphs.queryFocusedGraph(
      projectId,
      request.focused_graph_request,
    );
    if (graph === undefined) return undefined;
    assertGraphIdentity(projectId, request, graph);
    assertSelection(graph, request.selection);
    if (graph.content.semantic_layer === "historical") {
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
        "Historical focused graph positions are read-only; return to current before preparing correction or Work.",
      );
    }

    let preview: FocusedGraphActionPreviewContent["preview"];
    const readAts = [graph.read_at];
    let ownerBoundary: Pick<
      FocusedGraphActionPreviewContent["authority_boundary"],
      | "working_candidate_owner"
      | "review_owner"
      | "suggested_action_owner"
      | "work_preview_owner"
    >;
    if (request.target.action_kind === "governed_correction") {
      const review = await this.reviews.getProjectReviewView(
        projectId,
        request.target.review_session_id,
      );
      if (review === undefined) return undefined;
      preview = correctionPreview(
        projectId,
        graph,
        selectedRelationship(graph, request.selection),
        review,
        request.target,
      );
      readAts.push(review.read_at);
      ownerBoundary = {
        working_candidate_owner: "reused",
        review_owner: "reused",
        suggested_action_owner: "not_applicable",
        work_preview_owner: "not_applicable",
      };
    } else {
      const suggestedAction =
        await this.suggestedActions.getWorkStartingSuggestedActionViewForInquiryResult(
          projectId,
          request.target.inquiry_result_link_ref.project_inquiry_link_id,
        );
      if (suggestedAction === undefined) return undefined;
      preview = newWorkPreview(
        projectId,
        graph,
        request.selection,
        suggestedAction,
        request.target,
      );
      readAts.push(suggestedAction.read_at);
      ownerBoundary = {
        working_candidate_owner: "not_applicable",
        review_owner: "not_applicable",
        suggested_action_owner: "reused",
        work_preview_owner: "reused",
      };
    }

    const returnDestination = graph.content.destinations.find(
      (destination) =>
        destination.destination_key ===
        graph.content.task.return_destination_key,
    );
    if (returnDestination === undefined) {
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
        "The exact graph return destination is unavailable.",
      );
    }
    const content: FocusedGraphActionPreviewContent = {
      action_request_id: request.action_request_id,
      request_hash: digest(request),
      graph_view: structuredClone(graph),
      selection: structuredClone(request.selection),
      preview,
      return_context: {
        graph_request_id: graph.content.task.request_id,
        selection: structuredClone(request.selection),
        origin: structuredClone(graph.content.task.origin),
        destination: structuredClone(returnDestination),
      },
      authority_boundary: {
        postgresql_authoritative: true,
        neo4j_projection_only: true,
        focused_graph_owner_reused: true,
        ...ownerBoundary,
        preview_is_read_only: true,
        selection_grants_authority: false,
        renderer_state_accepted: false,
        command_issued: false,
        work_started: false,
      },
      limitations: [
        "This composition previews one exact existing Review or SuggestedAction path; it creates no parallel graph command owner.",
        "Graph coordinates, layout, pan, zoom, grouping, and drag gestures are neither accepted nor retained by this boundary.",
      ],
    };
    const view: PetraFocusedGraphActionPreviewView = {
      schema_name: "petra.focused-graph-action-preview-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: digest(content),
      read_at: latestReadAt(readAts),
    };
    try {
      this.#contracts.assertValid(
        "focused-graph-action-preview-view",
        "1.0.0",
        view,
      );
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
      throw new FocusedGraphActionPreviewQueryError(
        "FOCUSED_GRAPH_ACTION_PREVIEW_CONTRACT_INVALID",
        `The composed focused graph action preview is contract-invalid: ${detail}`,
      );
    }
    return structuredClone(view);
  }
}
