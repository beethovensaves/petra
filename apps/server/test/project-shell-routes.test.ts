import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";

import type {
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedContinuationFailure,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectRelationshipOverlayView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectReviewViewV120,
  PetraProjectWorkingStateSnapshot,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSourceLifecycleView,
  PetraProjectSourceView,
  PetraProjectThreadView,
  PetraProjectWorkView,
  PetraSuggestedActionView,
  PetraSuggestedActionViewV11,
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
} from "@petra/contracts";
import type {
  ProjectEffectiveControlsViewReader,
  ProjectHistoryViewReader,
  ProjectInquiryViewReader,
  ProjectObjectLocationViewReader,
  ProjectRelationshipOverlayViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ProjectWorkingStateSnapshotReader,
  ProjectShellSelectionRequest,
  ProjectShellViewReader,
  ProjectSourceLifecycleViewReader,
  ProjectSourceViewReader,
  ProjectThreadViewReader,
  ProjectWorkViewReader,
  SuggestedActionViewReader,
} from "@petra/core";
import {
  ProjectHistoryCompensationExecutionUnavailableError,
  ProjectHistoryCompensationPlanUnavailableError,
  ProjectHistoryRetainedContinuationError,
  ProjectHistoryRecoveryPreviewUnavailableError,
} from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-shell-route-token";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const shellV11Fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellViewV11;

const sourceFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const sourceLifecycleFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source-lifecycle-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceLifecycleView;

const controlsFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

const historyFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryView;

const historyEpisodeFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-episode-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryEpisodeViewV12;

const historyRetainedFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-retained-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedViewV12;

const historyContinuationFailureFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-retained-continuation-failure.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedContinuationFailure;

const historyImpactFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const historyRecoveryFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-recovery-assessment-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRecoveryAssessmentView;

const historyCompensationPreviewFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-preview-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPreviewView;

const historyCompensationPlanRequestFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanRequest;

const historyCompensationPlanFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanView;

const historyCompensationExecutionRequestFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionRequest;

const historyCompensationExecutionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionView;

const reviewFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-review-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectReviewView;

const relationshipFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-relationship-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectRelationshipView;

const workingCandidateFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/working-candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkingStateSnapshot["content"]["candidates"][number];

const workingRelationshipFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/working-relationship.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkingStateSnapshot["content"]["relationships"][number];

const workingReviewFixture: PetraProjectReviewViewV120 = (() => {
  const view = structuredClone(
    reviewFixture,
  ) as unknown as PetraProjectReviewViewV120;
  view.schema_version = "1.2.0";
  view.content.session.lifecycle = "open";
  view.content.members[0].working_state = {
    candidate: structuredClone(workingCandidateFixture),
    relationships: [structuredClone(workingRelationshipFixture)],
    selection_basis: "exact_review_session_working_bindings",
    authority_effect: "none",
  };
  view.content.members[0].change_sets = view.content.members[0].change_sets.map(
    (changeSet) => ({
      ...changeSet,
      commands: [],
      events: [],
    }),
  );
  view.content.projection = {
    state: "unavailable",
    reason: "No authoritative graph-projection checkpoint is registered.",
  };
  view.content_hash = `sha256:${createHash("sha256")
    .update(canonicalize(view.content))
    .digest("hex")}`;
  return view;
})();

const workingStateContent: PetraProjectWorkingStateSnapshot["content"] = {
  project_definition_ref: workingCandidateFixture.project_definition_ref,
  authority: {
    isolation: "repeatable_read",
    event_position: 42,
    stream_revision: 7,
  },
  selection_boundary: {
    selection_kind: "current_working_heads",
    historical_working_revisions_included: false,
    authoritative_records_included: false,
    graph_overlay_composed: false,
  },
  candidates: [workingCandidateFixture],
  relationships: [workingRelationshipFixture],
};

const workingStateFixture: PetraProjectWorkingStateSnapshot = {
  schema_name: "petra.project-working-state-snapshot",
  schema_version: "1.0.0",
  project_id: workingCandidateFixture.project_id,
  content: workingStateContent,
  content_hash: `sha256:${createHash("sha256")
    .update(canonicalize(workingStateContent))
    .digest("hex")}`,
  read_at: "2026-09-12T14:20:00.000Z",
};

const relationshipOverlayFixture: PetraProjectRelationshipOverlayView = (() => {
  const currentNodes = relationshipFixture.content.nodes.map((node) => ({
    node_key: `current:${node.node_ref.record_id}:${node.node_ref.revision}:${node.node_ref.record_hash}`,
    layer: "current" as const,
    owner: {
      owner_kind: "authoritative_record" as const,
      record_ref: node.node_ref,
    },
    object_kind: node.object_kind,
    object_term:
      node.object_kind === "claim"
        ? "Claim"
        : node.object_kind === "source_span"
          ? "Source passage"
          : node.object_kind.replace("_", " "),
    label: node.label,
    summary: node.summary,
    basis: node.basis,
    lifecycle: "represented" as const,
    ...(node.source_destination === undefined
      ? {}
      : { source_destination: node.source_destination }),
  }));
  const currentById = new Map(
    currentNodes.map((node) => [node.owner.record_ref.record_id, node]),
  );
  const currentRelationships = relationshipFixture.content.relationships.map(
    (relationship) => ({
      relationship_key: `current:${relationship.relationship_ref.element_id}:${relationship.relationship_ref.revision}:${relationship.relationship_ref.record_hash}`,
      layer: "current" as const,
      owner: {
        owner_kind: "authoritative_relationship" as const,
        relationship_ref: relationship.relationship_ref,
      },
      source_node_key: currentById.get(relationship.source_id)!.node_key,
      target_node_key: currentById.get(relationship.target_id)!.node_key,
      direction: "outgoing" as const,
      relation_class: relationship.relation_class,
      label: relationship.label,
      summary: relationship.summary,
      meaning: "Server-resolved exact relationship meaning.",
      scope: relationshipFixture.content.completeness.scope,
      basis: relationship.basis,
    }),
  );
  const candidateRecordHash = `sha256:${createHash("sha256")
    .update(canonicalize(workingCandidateFixture))
    .digest("hex")}`;
  const candidateKey = `working:${workingCandidateFixture.working_candidate_id}:${workingCandidateFixture.revision}:${candidateRecordHash}`;
  const workingNode = {
    node_key: candidateKey,
    layer: "working" as const,
    owner: {
      owner_kind: "working_candidate" as const,
      working_candidate_ref: {
        working_candidate_id: workingCandidateFixture.working_candidate_id,
        revision: workingCandidateFixture.revision,
        content_hash: workingCandidateFixture.content_hash,
        record_hash: candidateRecordHash,
      },
    },
    profile_record_ref: {
      record_id:
        workingCandidateFixture.profile_object.object_record_ref.record_id,
      revision:
        workingCandidateFixture.profile_object.object_record_ref.revision,
      record_hash:
        workingCandidateFixture.profile_object.object_record_ref.record_hash,
    },
    object_term: "Claim",
    label: "The study reports a measurable improvement.",
    summary: "Model-produced working Claim revision 1.",
    basis: workingCandidateFixture.basis[0].summary,
    validation_summary:
      "Validation completed: 2 passed; validation does not grant authority.",
    endpoint_posture: "current_working_head" as const,
    working_record: workingCandidateFixture,
  };
  if (
    workingRelationshipFixture.endpoints.subject.endpoint_kind !==
    "profile_record"
  ) {
    throw new Error("Expected a profile-record relationship subject.");
  }
  const source = currentById.get(
    workingRelationshipFixture.endpoints.subject.record_ref.record_id,
  )!;
  const relationshipRecordHash = `sha256:${createHash("sha256")
    .update(canonicalize(workingRelationshipFixture))
    .digest("hex")}`;
  const workingRelationship = {
    relationship_key: `working:${workingRelationshipFixture.working_relationship_id}:${workingRelationshipFixture.revision}:${relationshipRecordHash}`,
    layer: "working" as const,
    owner: {
      owner_kind: "working_relationship" as const,
      working_relationship_ref: {
        working_relationship_id:
          workingRelationshipFixture.working_relationship_id,
        revision: workingRelationshipFixture.revision,
        content_hash: workingRelationshipFixture.content_hash,
        record_hash: relationshipRecordHash,
      },
    },
    profile_record_ref: {
      record_id:
        workingRelationshipFixture.profile_relationship.relationship_record_ref
          .record_id,
      revision:
        workingRelationshipFixture.profile_relationship.relationship_record_ref
          .revision,
      record_hash:
        workingRelationshipFixture.profile_relationship.relationship_record_ref
          .record_hash,
    },
    source_node_key: source.node_key,
    target_node_key: candidateKey,
    target_endpoint_posture: "current_working_head" as const,
    direction: "outgoing" as const,
    relation_class: "representation" as const,
    relationship_term: "Evidence relationship",
    label: "asserts",
    summary:
      "The exact working relationship connects the source to the candidate Claim.",
    meaning: "This records representation, not truth, approval, or authority.",
    scope: "Bound to the exact working input snapshot.",
    basis: workingRelationshipFixture.basis[0].summary,
    validation_summary:
      "Validation completed: 1 passed; validation does not grant authority.",
    working_record: workingRelationshipFixture,
  };
  const nodes = [...currentNodes, workingNode];
  const relationships = [...currentRelationships, workingRelationship];
  const nodeByKey = new Map(nodes.map((node) => [node.node_key, node]));
  const definitionRef = {
    project_definition_id:
      workingCandidateFixture.project_definition_ref.project_definition_id,
    revision: workingCandidateFixture.project_definition_ref.revision,
    content_hash: workingCandidateFixture.project_definition_ref.content_hash,
    record_hash: `sha256:${"0".repeat(64)}`,
    definition_family:
      workingCandidateFixture.project_definition_ref.definition_family,
  };
  const query = {
    request_hash: `sha256:${"1".repeat(64)}`,
    query_kind: "scientific_provenance_working_overlay" as const,
    question: relationshipFixture.content.query.question,
    scope: relationshipFixture.content.query.scope,
    authoritative_focus_ref: relationshipFixture.content.query.focus_ref,
    maximum_authoritative_depth: 3 as const,
    working_selection:
      "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints" as const,
  };
  const content: PetraProjectRelationshipOverlayView["content"] = {
    query,
    profile: {
      project_definition_ref: definitionRef,
      label: "Scientific evidence inquiry with working records",
      object_term: {
        semantic_key: "scientific.claim",
        singular: "Claim",
        plural: "Claims",
        definition: "A proposition with explicit scope and basis.",
      },
      relationship_term: {
        semantic_key: "scientific.assertion",
        singular: "Evidence relationship",
        plural: "Evidence relationships",
        definition: "A typed relationship with exact provenance.",
      },
      source_term: {
        semantic_key: "scientific.literature",
        singular: "Source",
        plural: "Sources",
        definition: "A versioned basis available to the Project.",
      },
      layer_labels: {
        current: "Current authority",
        working: "Working — not authoritative",
      },
      endpoint_posture_labels: {
        current_working_head: "Current working revision",
        non_current_working_endpoint:
          "Referenced earlier working revision — not current",
      },
    },
    capabilities: {
      current: "available",
      working: "available",
      historical_authority: "unavailable",
      historical_working_endpoints: "exact_references_only",
      comparison: "unavailable",
      expansion: "unavailable",
      continuation: "unavailable",
      text_peer: "available",
    },
    positions: {
      isolation:
        "repeatable_read_working_with_exact_authoritative_projection_guard",
      authoritative: {
        source_view_ref: {
          schema_name: "petra.project-relationship-view",
          schema_version: "1.0.0",
          content_hash: relationshipFixture.content_hash,
          read_at: relationshipFixture.read_at,
        },
        authority: relationshipFixture.content.position.authority,
        projection: relationshipFixture.content.position.projection,
      },
      working: {
        snapshot_ref: {
          schema_name: "petra.project-working-state-snapshot",
          schema_version: "1.0.0",
          content_hash: workingStateFixture.content_hash,
          read_at: workingStateFixture.read_at,
        },
        base_authority: relationshipFixture.content.position.authority,
        project_definition_ref: definitionRef,
        selection_kind: "current_heads_plus_exact_referenced_working_revisions",
        historical_working_revisions_included: "referenced_only",
        authoritative_records_included: false,
      },
    },
    nodes: nodes as PetraProjectRelationshipOverlayView["content"]["nodes"],
    relationships:
      relationships as PetraProjectRelationshipOverlayView["content"]["relationships"],
    completeness: {
      state:
        "complete_for_selected_authoritative_path_and_relevant_working_heads",
      scope:
        "Complete for the selected authoritative path and relevant working heads.",
      authoritative_nodes: currentNodes.length,
      authoritative_relationships: currentRelationships.length,
      current_working_candidate_heads: 1,
      current_working_relationship_heads: 1,
      returned_working_candidate_revisions: 1,
      returned_working_relationships: 1,
      referenced_non_current_working_candidate_revisions: 0,
      returned_nodes: nodes.length,
      returned_relationships: relationships.length,
      exclusions: [
        {
          member_kind: "working_candidate",
          reason: "not_referenced_by_selected_relationship",
          count: 0,
        },
        {
          member_kind: "working_relationship",
          reason: "outside_authoritative_path",
          count: 0,
        },
      ],
      omissions: ["Historical authoritative state is not included."],
    },
    textual_peer: {
      title: "Scientific evidence inquiry: relationship layers",
      scope: "Textual peer for every returned node and relationship.",
      completeness: "complete_for_every_returned_node_and_relationship",
      nodes: nodes.map((node) => ({
        node_key: node.node_key,
        layer: node.layer,
        object_term: node.object_term,
        label: node.label,
        summary: node.summary,
        basis: node.basis,
      })) as PetraProjectRelationshipOverlayView["content"]["textual_peer"]["nodes"],
      relationships: relationships.map((relationship) => ({
        relationship_key: relationship.relationship_key,
        layer: relationship.layer,
        source_node_key: relationship.source_node_key,
        source_label: nodeByKey.get(relationship.source_node_key)!.label,
        direction: "outgoing",
        label: relationship.label,
        target_node_key: relationship.target_node_key,
        target_label: nodeByKey.get(relationship.target_node_key)!.label,
        summary: relationship.summary,
        meaning: relationship.meaning,
        scope: relationship.scope,
        basis: relationship.basis,
      })) as PetraProjectRelationshipOverlayView["content"]["textual_peer"]["relationships"],
      omissions: ["Historical authoritative state is not included."],
    },
    authority_boundary: {
      working_domain_authority: false,
      working_review_decision: false,
      working_mutation_authority: false,
      validation_grants_authority: false,
      visibility_grants_authority: false,
      selection_grants_authority: false,
      projection_grants_authority: false,
      promotion_requires_review: true,
      layout_client_local: true,
      focus_client_local: true,
      disclosure_client_local: true,
      comparison_selection_client_local: true,
      navigation_history_client_local: true,
    },
    limitations: ["The first adapter supports one scientific profile."],
  };
  return {
    schema_name: "petra.project-relationship-overlay-view",
    schema_version: "1.0.0",
    project_id: relationshipFixture.project_id,
    content,
    content_hash: `sha256:${createHash("sha256")
      .update(canonicalize(content))
      .digest("hex")}`,
    read_at: "2026-09-12T14:30:00.000Z",
  };
})();

const locationFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-object-location-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjectLocationView;

const workCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-work-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const workDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-work-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const threadCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-thread-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const threadDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-thread-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const inquiryCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-inquiry-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const inquiryDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const suggestedActionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/suggested-action-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionView;

const suggestedWorkActionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/suggested-action-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionViewV11;

const suggestedActionInvocationRequestFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/suggested-action-invocation-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationRequest;

const suggestedActionInvocationViewFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationView;

const reader: ProjectShellViewReader = {
  listProjectShellViews: () => Promise.resolve([structuredClone(fixture)]),
  getProjectShellView: (projectId) =>
    Promise.resolve(
      projectId === fixture.project_id ? structuredClone(fixture) : undefined,
    ),
};

const sourceReader: ProjectSourceViewReader = {
  listProjectSourceViews: (projectId) =>
    Promise.resolve(
      projectId === sourceFixture.project_id
        ? [structuredClone(sourceFixture)]
        : [],
    ),
  getProjectSourceView: (projectId, sourceId) =>
    Promise.resolve(
      projectId === sourceFixture.project_id &&
        sourceId === sourceFixture.project_source_id
        ? structuredClone(sourceFixture)
        : undefined,
    ),
};

const sourceLifecycleReader: ProjectSourceLifecycleViewReader = {
  getProjectSourceLifecycleView: (projectId, projectSourceId, action) =>
    Promise.resolve(
      projectId === sourceLifecycleFixture.project_id &&
        projectSourceId === sourceLifecycleFixture.project_source_id &&
        action === sourceLifecycleFixture.content.requested_action
        ? structuredClone(sourceLifecycleFixture)
        : undefined,
    ),
};

const controlsReader: ProjectEffectiveControlsViewReader = {
  getProjectEffectiveControlsView: (projectId) =>
    Promise.resolve(
      projectId === controlsFixture.project_id
        ? structuredClone(controlsFixture)
        : undefined,
    ),
};

const historyReader: ProjectHistoryViewReader = {
  getRecentProjectHistoryView: (projectId) =>
    Promise.resolve(
      projectId === historyFixture.project_id
        ? structuredClone(historyFixture)
        : undefined,
    ),
  getProjectHistoryEpisodeView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyEpisodeFixture.project_id &&
        eventId === historyEpisodeFixture.event_id
        ? structuredClone(historyEpisodeFixture)
        : undefined,
    ),
  getProjectHistoryImpactView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyImpactFixture.project_id &&
        eventId === historyImpactFixture.event_id
        ? structuredClone(historyImpactFixture)
        : undefined,
    ),
  getProjectHistoryRecoveryAssessmentView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyRecoveryFixture.project_id &&
        eventId === historyRecoveryFixture.event_id
        ? structuredClone(historyRecoveryFixture)
        : undefined,
    ),
  getProjectHistoryCompensationPreviewView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyCompensationPreviewFixture.project_id &&
        eventId === historyCompensationPreviewFixture.event_id
        ? structuredClone(historyCompensationPreviewFixture)
        : undefined,
    ),
  composeProjectHistoryCompensationPlan: (request) =>
    Promise.resolve(
      request.project_id === historyCompensationPlanFixture.project_id &&
        request.event_id === historyCompensationPlanFixture.event_id &&
        request.preview_ref.content_hash ===
          historyCompensationPlanFixture.content.preview_ref.content_hash &&
        request.preview_ref.binding_hash ===
          historyCompensationPlanFixture.content.preview_ref.binding_hash
        ? structuredClone(historyCompensationPlanFixture)
        : undefined,
    ),
  listRetainedProjectHistoryView: (projectId, request = {}) => {
    if (projectId !== historyRetainedFixture.project_id) {
      return Promise.resolve(undefined);
    }
    const view = structuredClone(historyRetainedFixture);
    view.content.query = {
      limit: request.limit ?? 50,
      filters: request.filters ?? {},
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
    };
    return Promise.resolve(view);
  },
};

const reviewReader: ProjectReviewViewReader = {
  listProjectReviewViews: (projectId) =>
    Promise.resolve(
      projectId === reviewFixture.project_id
        ? [structuredClone(reviewFixture)]
        : [],
    ),
  getProjectReviewView: (projectId, reviewSessionId) =>
    Promise.resolve(
      projectId === reviewFixture.project_id &&
        reviewSessionId === reviewFixture.review_session_id
        ? structuredClone(reviewFixture)
        : undefined,
    ),
};

const workingStateReader: ProjectWorkingStateSnapshotReader = {
  getProjectWorkingStateSnapshot: (projectId) =>
    Promise.resolve(
      projectId === workingStateFixture.project_id
        ? structuredClone(workingStateFixture)
        : undefined,
    ),
};

const relationshipReader: ProjectRelationshipViewReader = {
  getProjectRelationshipView: (projectId) =>
    Promise.resolve(
      projectId === relationshipFixture.project_id
        ? structuredClone(relationshipFixture)
        : undefined,
    ),
};

const relationshipOverlayReader: ProjectRelationshipOverlayViewReader = {
  getProjectRelationshipOverlayView: (projectId) =>
    Promise.resolve(
      projectId === relationshipOverlayFixture.project_id
        ? structuredClone(relationshipOverlayFixture)
        : undefined,
    ),
};

const locationReader: ProjectObjectLocationViewReader = {
  locateProjectObject: (request) =>
    Promise.resolve(
      request.project_id === locationFixture.project_id
        ? structuredClone(locationFixture)
        : undefined,
    ),
};

const workReader: ProjectWorkViewReader = {
  listProjectWorkView: (projectId) =>
    Promise.resolve(
      projectId === workCollectionFixture.project_id
        ? structuredClone(workCollectionFixture)
        : undefined,
    ),
  getProjectWorkView: (projectId, workUnitId) => {
    const expectedWorkUnitId =
      workDetailFixture.content.view_kind === "detail"
        ? workDetailFixture.content.summary.work_unit_ref.work_unit_id
        : undefined;
    return Promise.resolve(
      projectId === workDetailFixture.project_id &&
        workUnitId === expectedWorkUnitId
        ? structuredClone(workDetailFixture)
        : undefined,
    );
  },
};

const threadReader: ProjectThreadViewReader = {
  listProjectThreadView: (projectId) =>
    Promise.resolve(
      projectId === threadCollectionFixture.project_id
        ? structuredClone(threadCollectionFixture)
        : undefined,
    ),
  getProjectThreadView: (projectId, projectThreadId) => {
    const expectedThreadId =
      threadDetailFixture.content.view_kind === "detail"
        ? threadDetailFixture.content.summary.thread_ref.project_thread_id
        : undefined;
    return Promise.resolve(
      projectId === threadDetailFixture.project_id &&
        projectThreadId === expectedThreadId
        ? structuredClone(threadDetailFixture)
        : undefined,
    );
  },
};

const inquiryReader: ProjectInquiryViewReader = {
  listProjectInquiryView: (projectId) =>
    Promise.resolve(
      projectId === inquiryCollectionFixture.project_id
        ? structuredClone(inquiryCollectionFixture)
        : undefined,
    ),
  getProjectInquiryView: (projectId, objectiveId) => {
    const expectedObjectiveId =
      inquiryDetailFixture.content.view_kind === "detail"
        ? inquiryDetailFixture.content.summary.inquiry_anchor_ref.objective_id
        : undefined;
    return Promise.resolve(
      projectId === inquiryDetailFixture.project_id &&
        objectiveId === expectedObjectiveId
        ? structuredClone(inquiryDetailFixture)
        : undefined,
    );
  },
};

const suggestedActionReader: SuggestedActionViewReader = {
  getSuggestedActionViewForInquiryResult: (projectId, projectInquiryLinkId) =>
    Promise.resolve(
      projectId === suggestedActionFixture.project_id &&
        projectInquiryLinkId ===
          suggestedActionFixture.content.action.basis.inquiry_result_link_ref
            .project_inquiry_link_id
        ? structuredClone(suggestedActionFixture)
        : undefined,
    ),
  getWorkStartingSuggestedActionViewForInquiryResult: (
    projectId,
    projectInquiryLinkId,
  ) =>
    Promise.resolve(
      projectId === suggestedWorkActionFixture.project_id &&
        projectInquiryLinkId ===
          suggestedWorkActionFixture.content.action.basis
            .inquiry_result_link_ref.project_inquiry_link_id
        ? structuredClone(suggestedWorkActionFixture)
        : undefined,
    ),
};

const authorized = (path: string): Request =>
  new Request(`http://petra.local${path}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });

const authorizedJson = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

describe("authorized Project shell query routes", () => {
  it("returns the contract view for collections and exact Project identity", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const collection = await petra.app.request(
      authorized("/api/queries/projects"),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({ projects: [fixture] });

    const detail = await petra.app.request(
      authorized(`/api/queries/projects/${fixture.project_id}/shell`),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(fixture);
  });

  it("composes an exact optional selection into the 1.1 shell view", async () => {
    let observedSelection: ProjectShellSelectionRequest | undefined;
    const v11Reader: ProjectShellViewReader = {
      listProjectShellViews: () =>
        Promise.resolve([structuredClone(shellV11Fixture)]),
      getProjectShellView: (projectId, selection) => {
        observedSelection = selection;
        return Promise.resolve(
          projectId === shellV11Fixture.project_id
            ? structuredClone(shellV11Fixture)
            : undefined,
        );
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: v11Reader,
    });
    const response = await petra.app.request(
      authorized(
        `/api/queries/projects/${shellV11Fixture.project_id}/shell?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&revision=1&taskIntent=inspect`,
      ),
    );

    expect(response.status).toBe(200);
    expect(observedSelection).toEqual({
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: "project_source_01K4C000000000000000000007",
        revision: 1,
      },
      task_intent: "inspect",
    });
    await expect(response.json()).resolves.toEqual(shellV11Fixture);

    const invalid = await petra.app.request(
      authorized(
        `/api/queries/projects/${shellV11Fixture.project_id}/shell?semanticKey=petra.project-source`,
      ),
    );
    expect(invalid.status).toBe(422);
  });

  it("returns exact read-only effective controls and rejects client overrides", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectEffectiveControls: controlsReader,
    });
    const response = await petra.app.request(
      authorized(
        `/api/queries/projects/${controlsFixture.project_id}/effective-controls`,
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(controlsFixture);

    const override = await petra.app.request(
      authorized(
        `/api/queries/projects/${controlsFixture.project_id}/effective-controls?profile=personal`,
      ),
    );
    expect(override.status).toBe(422);
    const overrideBody = JSON.parse(await override.text()) as unknown;
    expect(isRecord(overrideBody)).toBe(true);
    if (!isRecord(overrideBody) || !isRecord(overrideBody.error)) {
      throw new Error("Expected Petra's structured invalid-target error.");
    }
    expect(overrideBody.error.code).toBe(
      "PROJECT_EFFECTIVE_CONTROLS_TARGET_INVALID",
    );
  });

  it("returns authenticated bounded Recent changes without accepting client history state", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyFixture.project_id}/history/recent`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyFixture);

    const override = await petra.app.request(
      authorized(`${path}?limit=20&graphSnapshot=local`),
    );
    expect(override.status).toBe(422);
    const overrideBody = (await override.json()) as {
      error: { code: string };
    };
    expect(overrideBody.error.code).toBe("PROJECT_HISTORY_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/recent",
      ),
    );
    expect(crossProject.status).toBe(404);

    const unauthorized = await petra.app.request(path);
    expect(unauthorized.status).toBe(401);
  });

  it("returns one authenticated event-selected causal History episode", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/${historyEpisodeFixture.event_id}`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyEpisodeFixture);

    const invalid = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/not-an-event?order=global`,
      ),
    );
    expect(invalid.status).toBe(422);
    const invalidBody = (await invalid.json()) as {
      error: { code: string };
    };
    expect(invalidBody.error.code).toBe("PROJECT_HISTORY_EVENT_INVALID");

    const missing = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/event_01ARZ3NDEKTSV4RRFFQ69G5FZZ`,
      ),
    );
    expect(missing.status).toBe(404);
  });

  it("returns authenticated bounded dependency impact for one exact History event", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyImpactFixture.project_id}/history/events/${historyImpactFixture.event_id}/impact`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyImpactFixture);

    const filtered = await petra.app.request(
      authorized(`${path}?kind=projection`),
    );
    expect(filtered.status).toBe(422);
    const filteredBody = (await filtered.json()) as {
      error: { code: string };
    };
    expect(filteredBody.error.code).toBe(
      "PROJECT_HISTORY_IMPACT_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyImpactFixture.event_id}/impact`,
      ),
    );
    expect(crossProject.status).toBe(404);

    const unauthorized = await petra.app.request(path);
    expect(unauthorized.status).toBe(401);
  });

  it("returns one authenticated read-only ChangeSet recovery assessment", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyRecoveryFixture.project_id}/history/events/${historyRecoveryFixture.event_id}/recovery`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyRecoveryFixture);

    const override = await petra.app.request(
      authorized(`${path}?execute=true`),
    );
    expect(override.status).toBe(422);
    const overrideBody = (await override.json()) as {
      error: { code: string };
    };
    expect(overrideBody.error.code).toBe(
      "PROJECT_HISTORY_RECOVERY_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyRecoveryFixture.event_id}/recovery`,
      ),
    );
    expect(crossProject.status).toBe(404);
    expect((await petra.app.request(path)).status).toBe(401);
  });

  it("returns one authenticated read-only revision-bound compensation preview", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyCompensationPreviewFixture.project_id}/history/events/${historyCompensationPreviewFixture.event_id}/recovery/preview`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationPreviewFixture,
    );

    const execute = await petra.app.request(authorized(`${path}?execute=true`));
    expect(execute.status).toBe(422);
    const executeBody = (await execute.json()) as {
      error: { code: string };
    };
    expect(executeBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_PREVIEW_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyCompensationPreviewFixture.event_id}/recovery/preview`,
      ),
    );
    expect(crossProject.status).toBe(404);
    expect((await petra.app.request(path)).status).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: {
        ...historyReader,
        getProjectHistoryCompensationPreviewView: () => {
          throw new ProjectHistoryRecoveryPreviewUnavailableError(
            "The exact recovery assessment is blocked.",
          );
        },
      },
    });
    const blocked = await unavailable.app.request(authorized(path));
    expect(blocked.status).toBe(409);
    const blockedBody = (await blocked.json()) as {
      error: { code: string };
    };
    expect(blockedBody.error.code).toBe(
      "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE",
    );
  });

  it("composes a confirmed compensation command plan without submitting it", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyCompensationPlanRequestFixture.project_id}/history/events/${historyCompensationPlanRequestFixture.event_id}/recovery/plan`;
    const response = await petra.app.request(
      authorizedJson(path, historyCompensationPlanRequestFixture),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationPlanFixture,
    );

    const unconfirmed = structuredClone(
      historyCompensationPlanRequestFixture,
    ) as
      | PetraProjectHistoryCompensationPlanRequest
      | { confirmation: { confirmed: boolean } };
    unconfirmed.confirmation.confirmed = false;
    const rejected = await petra.app.request(authorizedJson(path, unconfirmed));
    expect(rejected.status).toBe(422);

    const queryOverride = await petra.app.request(
      authorizedJson(
        `${path}?execute=true`,
        historyCompensationPlanRequestFixture,
      ),
    );
    expect(queryOverride.status).toBe(422);

    const unauthenticated = await petra.app.request(
      new Request(`http://petra.local${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(historyCompensationPlanRequestFixture),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: {
        ...historyReader,
        composeProjectHistoryCompensationPlan: () => {
          throw new ProjectHistoryCompensationPlanUnavailableError(
            "The exact preview is stale.",
          );
        },
      },
    });
    const stale = await unavailable.app.request(
      authorizedJson(path, historyCompensationPlanRequestFixture),
    );
    expect(stale.status).toBe(409);
    const staleBody = (await stale.json()) as { error: { code: string } };
    expect(staleBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_PLAN_UNAVAILABLE",
    );
  });

  it("executes one exact confirmed compensation plan with retained per-command outcomes", async () => {
    const execution = {
      executeProjectHistoryCompensationPlan: (
        request: PetraProjectHistoryCompensationExecutionRequest,
      ) =>
        Promise.resolve(
          request.project_id ===
            historyCompensationExecutionFixture.project_id &&
            request.event_id === historyCompensationExecutionFixture.event_id &&
            request.plan.content_hash ===
              historyCompensationExecutionFixture.content.plan_ref.content_hash
            ? structuredClone(historyCompensationExecutionFixture)
            : undefined,
        ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryCompensationExecution: execution,
    });
    const path = `/api/commands/projects/${historyCompensationExecutionRequestFixture.project_id}/history/events/${historyCompensationExecutionRequestFixture.event_id}/recovery/execute`;
    const response = await petra.app.request(
      authorizedJson(path, historyCompensationExecutionRequestFixture),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationExecutionFixture,
    );

    const unconfirmed = structuredClone(
      historyCompensationExecutionRequestFixture,
    ) as
      | PetraProjectHistoryCompensationExecutionRequest
      | { execution_confirmation: { confirmed: boolean } };
    unconfirmed.execution_confirmation.confirmed = false;
    expect(
      (await petra.app.request(authorizedJson(path, unconfirmed))).status,
    ).toBe(422);
    expect(
      (
        await petra.app.request(
          authorizedJson(
            `${path}?atomic=true`,
            historyCompensationExecutionRequestFixture,
          ),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await petra.app.request(
          new Request(`http://petra.local${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(historyCompensationExecutionRequestFixture),
          }),
        )
      ).status,
    ).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryCompensationExecution: {
        executeProjectHistoryCompensationPlan: () => {
          throw new ProjectHistoryCompensationExecutionUnavailableError(
            "The exact plan is stale or altered.",
          );
        },
      },
    });
    const stale = await unavailable.app.request(
      authorizedJson(path, historyCompensationExecutionRequestFixture),
    );
    expect(stale.status).toBe(409);
    const staleBody = (await stale.json()) as { error: { code: string } };
    expect(staleBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE",
    );
  });

  it("returns authenticated retained History pages and rejects unsafe query state", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyRetainedFixture);

    const firstPage = historyRetainedFixture.content.page;
    if (!firstPage.has_more) throw new Error("Expected a retained cursor.");
    const cursor = firstPage.next_cursor;
    const continued = await petra.app.request(
      authorized(`${path}&cursor=${encodeURIComponent(cursor)}`),
    );
    expect(continued.status).toBe(200);
    const continuedBody =
      (await continued.json()) as PetraProjectHistoryRetainedViewV12;
    expect(continuedBody.content.query.cursor).toBe(cursor);

    const oldOffset = await petra.app.request(
      authorized(`${path}&cursor=offset%3A1`),
    );
    expect(oldOffset.status).toBe(422);
    const oldOffsetBody =
      (await oldOffset.json()) as PetraProjectHistoryRetainedContinuationFailure;
    expect(oldOffsetBody).toMatchObject({
      schema_name: "petra.project-history-retained-continuation-failure",
      schema_version: "1.0.0",
      error: {
        code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
        subcode: "CURSOR_INVALID",
        message: historyContinuationFailureFixture.error.message,
        restart: historyContinuationFailureFixture.error.restart,
      },
    });

    const unboundCursor = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&cursor=phc1.eyJ2IjoxLCJwcm9qZWN0Ijoib3BhcXVlIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      ),
    );
    expect(unboundCursor.status).toBe(422);

    const incompleteTarget = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&target_semantic_key=petra.change-set`,
      ),
    );
    expect(incompleteTarget.status).toBe(422);
    const incompleteTargetBody = (await incompleteTarget.json()) as {
      error: { subcode?: string };
    };
    expect(incompleteTargetBody.error.subcode).toBeUndefined();
    const reversedTime = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?recorded_from=2026-09-11T00%3A00%3A00.000Z&recorded_through=2026-09-10T00%3A00%3A00.000Z`,
      ),
    );
    expect(reversedTime.status).toBe(422);
    expect(await petra.app.request(path)).toEqual(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("returns stable non-disclosing retained History continuation subcodes", async () => {
    const page = historyRetainedFixture.content.page;
    if (!page.has_more) throw new Error("Expected a retained cursor fixture.");
    const subcodes = [
      "CURSOR_INVALID",
      "CURSOR_BINDING_MISMATCH",
      "SNAPSHOT_UNAVAILABLE",
    ] as const;
    for (const subcode of subcodes) {
      const failingReader: ProjectHistoryViewReader = {
        ...historyReader,
        listRetainedProjectHistoryView: () =>
          Promise.reject(
            new ProjectHistoryRetainedContinuationError(
              subcode,
              `Internal continuation detail for ${subcode}`,
            ),
          ),
      };
      const petra = createPetraApp({
        authToken: TOKEN,
        projectHistoryViews: failingReader,
      });
      const response = await petra.app.request(
        authorized(
          `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&cursor=${encodeURIComponent(page.next_cursor)}`,
        ),
      );
      expect(response.status).toBe(422);
      const body =
        (await response.json()) as PetraProjectHistoryRetainedContinuationFailure;
      expect(body).toMatchObject({
        schema_name: "petra.project-history-retained-continuation-failure",
        schema_version: "1.0.0",
        error: {
          code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
          subcode,
          message: historyContinuationFailureFixture.error.message,
          restart: historyContinuationFailureFixture.error.restart,
        },
      });
      expect(JSON.stringify(body)).not.toContain(
        "Internal continuation detail",
      );
      expect(JSON.stringify(body)).not.toContain(page.next_cursor);
    }
  });

  it("does not substitute another Project and preserves the API auth boundary", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const missing = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/shell",
      ),
    );
    expect(missing.status).toBe(404);
    const missingBody = JSON.parse(await missing.text()) as unknown;
    expect(isRecord(missingBody)).toBe(true);
    if (!isRecord(missingBody) || !isRecord(missingBody.error)) {
      throw new Error("Expected Petra's structured missing-Project error.");
    }
    expect(missingBody.error.code).toBe("PROJECT_NOT_FOUND");

    const unauthorized = await petra.app.request("/api/queries/projects");
    expect(unauthorized.status).toBe(401);
  });

  it("fails visibly when the read boundary is absent or unavailable", async () => {
    const absent = createPetraApp({ authToken: TOKEN });
    const absentResponse = await absent.app.request(
      authorized("/api/queries/projects"),
    );
    expect(absentResponse.status).toBe(503);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectShellViews: {
        listProjectShellViews: () =>
          Promise.reject(new Error("repeatable-read snapshot unavailable")),
        getProjectShellView: () => Promise.resolve(undefined),
      },
    });
    const unavailableResponse = await unavailable.app.request(
      authorized("/api/queries/projects"),
    );
    expect(unavailableResponse.status).toBe(503);
    const unavailableBody = JSON.parse(
      await unavailableResponse.text(),
    ) as unknown;
    if (!isRecord(unavailableBody) || !isRecord(unavailableBody.error)) {
      throw new Error("Expected Petra's structured shell-read error.");
    }
    expect(unavailableBody.error.code).toBe("PROJECT_SHELL_READ_FAILED");
    expect(unavailableBody.error.message).toBe(
      "repeatable-read snapshot unavailable",
    );
  });

  it("returns only sources authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectSourceViews: sourceReader,
    });
    const collection = await petra.app.request(
      authorized(`/api/queries/projects/${sourceFixture.project_id}/sources`),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({
      sources: [sourceFixture],
    });

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${sourceFixture.project_id}/sources/${sourceFixture.project_source_id}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(sourceFixture);

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/sources/${sourceFixture.project_source_id}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_SOURCE_NOT_FOUND");
  });

  it("returns the exact read-only source lifecycle preview", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectSourceLifecycleViews: sourceLifecycleReader,
    });
    const path = `/api/queries/projects/${sourceLifecycleFixture.project_id}/sources/${sourceLifecycleFixture.project_source_id}/lifecycle`;
    const response = await petra.app.request(
      authorized(`${path}?requested_action=exclude_project_source`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as PetraProjectSourceLifecycleView;
    expect(body).toEqual(sourceLifecycleFixture);
    expect(body.content.operation.state).toBe("unavailable");
    expect(
      body.content.retention.find((item) => item.area === "local_artifact")
        ?.state,
    ).toBe("deletion_unavailable");

    for (const query of [
      "",
      "?requested_action=unknown",
      "?requested_action=exclude_project_source&requested_action=restore_project_source",
      "?requested_action=exclude_project_source&execute=true",
    ]) {
      const malformed = await petra.app.request(authorized(`${path}${query}`));
      expect(malformed.status).toBe(422);
      const malformedBody = (await malformed.json()) as {
        error: { code: string };
      };
      expect(malformedBody.error.code).toBe(
        "PROJECT_SOURCE_LIFECYCLE_QUERY_INVALID",
      );
    }

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/sources/${sourceLifecycleFixture.project_source_id}/lifecycle?requested_action=exclude_project_source`,
      ),
    );
    expect(crossProject.status).toBe(404);
  });

  it("returns an exact authenticated read-only SuggestedAction preview", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      suggestedActionViews: suggestedActionReader,
    });
    const linkId =
      suggestedActionFixture.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const path = `/api/queries/projects/${suggestedActionFixture.project_id}/suggested-actions?inquiry_result_link_id=${linkId}`;

    const unauthorized = await petra.app.request(path);
    expect(unauthorized.status).toBe(401);

    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    const body = (await response.json()) as PetraSuggestedActionView;
    expect(body).toEqual(suggestedActionFixture);
    expect(body.content.readiness.state).toBe("ready");
    expect(body.content.operation).toEqual({
      state: "read_only",
      work_start: "not_performed",
      authority_change: "none",
    });
    expect(body.content.action.invocation.kind).toBe("authenticated_read");
    expect(body.content.action_ref.suggested_action_id).toMatch(
      /^suggested_action_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );

    const malformed = await petra.app.request(
      authorized(`${path}&depth=research_deeply`),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = (await malformed.json()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("SUGGESTED_ACTION_QUERY_INVALID");

    const missingLink = await petra.app.request(
      authorized(`/api/queries/projects/${body.project_id}/suggested-actions`),
    );
    expect(missingLink.status).toBe(422);
    const missingLinkBody = (await missingLink.json()) as {
      error: { code: string };
    };
    expect(missingLinkBody.error.code).toBe("SUGGESTED_ACTION_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/suggested-actions?inquiry_result_link_id=${linkId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = (await crossProject.json()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("SUGGESTED_ACTION_NOT_FOUND");
  });

  it("previews and invokes one exact authenticated Work-starting SuggestedAction command", async () => {
    let invoked = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      suggestedActionViews: suggestedActionReader,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "resolved" as const,
            actor: {
              actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
              actor_kind: "human" as const,
            },
            capabilityGrantId: "capability_grant_01K4C000000000000000000062",
          }),
      },
      suggestedActionInvocations: {
        invoke: (envelope) => {
          invoked = true;
          expect(envelope.projectId).toBe(
            suggestedWorkActionFixture.project_id,
          );
          expect(envelope.request).toEqual(
            suggestedActionInvocationRequestFixture,
          );
          expect(envelope.action).toEqual(suggestedWorkActionFixture);
          return Promise.resolve(
            structuredClone(suggestedActionInvocationViewFixture),
          );
        },
      },
      suggestedActionInvocationViews: {
        acceptSuggestedActionInvocation: () =>
          Promise.reject(new Error("Read boundary cannot accept commands.")),
        getSuggestedActionInvocationView: (projectId, commandId) =>
          Promise.resolve(
            projectId === suggestedActionInvocationViewFixture.project_id &&
              commandId ===
                suggestedActionInvocationViewFixture.content.invocation.content
                  .command_ref.command_id
              ? structuredClone(suggestedActionInvocationViewFixture)
              : undefined,
          ),
      },
    });
    const linkId =
      suggestedWorkActionFixture.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const preview = await petra.app.request(
      authorized(
        `/api/queries/projects/${suggestedWorkActionFixture.project_id}/suggested-actions?inquiry_result_link_id=${linkId}&action_kind=run_grounded_synthesis`,
      ),
    );
    expect(preview.status).toBe(200);
    await expect(preview.json()).resolves.toEqual(suggestedWorkActionFixture);

    const actionId =
      suggestedActionInvocationRequestFixture.expected_action_ref
        .suggested_action_id;
    const commandPath = `/api/commands/projects/${suggestedWorkActionFixture.project_id}/suggested-actions/${actionId}/invoke`;
    const invokedResponse = await petra.app.request(
      authorizedJson(commandPath, suggestedActionInvocationRequestFixture),
    );
    expect(invokedResponse.status).toBe(202);
    expect(invoked).toBe(true);
    await expect(invokedResponse.json()).resolves.toEqual(
      suggestedActionInvocationViewFixture,
    );

    const commandId = suggestedActionInvocationRequestFixture.command_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${suggestedWorkActionFixture.project_id}/suggested-action-invocations/${commandId}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(
      suggestedActionInvocationViewFixture,
    );

    const stale = structuredClone(suggestedActionInvocationRequestFixture);
    stale.expected_action_ref.content_hash =
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const staleResponse = await petra.app.request(
      authorizedJson(commandPath, stale),
    );
    expect(staleResponse.status).toBe(409);
    const staleBody = (await staleResponse.json()) as {
      error: { code: string };
      regeneration: PetraSuggestedActionViewV11;
    };
    expect(staleBody.error.code).toBe("SUGGESTED_ACTION_INVOCATION_STALE");
    expect(staleBody.regeneration).toEqual(suggestedWorkActionFixture);
  });

  it("returns bounded Work collection and exact detail without promoting output authority", async () => {
    if (
      workCollectionFixture.content.view_kind !== "collection" ||
      workDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error("Expected collection and detail Work fixtures.");
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkViews: workReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${workCollectionFixture.project_id}/work?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(workCollectionFixture);

    const workUnitId =
      workDetailFixture.content.summary.work_unit_ref.work_unit_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${workDetailFixture.project_id}/work/${workUnitId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as PetraProjectWorkView;
    expect(detailBody).toEqual(workDetailFixture);
    if (detailBody.content.view_kind !== "detail") {
      throw new Error("Expected Work detail response.");
    }
    expect(detailBody.content.outputs[0]?.availability.state).toBe(
      "staged_handle_only",
    );
    expect(
      detailBody.content.controls.every(
        (control) => control.operation_state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${workDetailFixture.project_id}/work?limit=0&sort=urgency`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_WORK_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/work/${workUnitId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_WORK_NOT_FOUND");
  });

  it("returns bounded Project threads and exact metadata-only turn detail", async () => {
    if (
      threadCollectionFixture.content.view_kind !== "collection" ||
      threadDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error(
        "Expected collection and detail Project thread fixtures.",
      );
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectThreadViews: threadReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadCollectionFixture.project_id}/threads?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(threadCollectionFixture);

    const threadId =
      threadDetailFixture.content.summary.thread_ref.project_thread_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadDetailFixture.project_id}/threads/${threadId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as PetraProjectThreadView;
    expect(detailBody).toEqual(threadDetailFixture);
    if (detailBody.content.view_kind !== "detail") {
      throw new Error("Expected Project thread detail response.");
    }
    expect(detailBody.content.turns[0]?.input_representation.state).toBe(
      "hash_only",
    );
    expect(detailBody.content.turns[0]?.response_representation.state).toBe(
      "metadata_only",
    );
    expect(
      detailBody.content.operations.every(
        (operation) => operation.state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadDetailFixture.project_id}/threads?limit=0&sort=recent`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_THREAD_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/threads/${threadId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_THREAD_NOT_FOUND");
  });

  it("returns mapped inquiries with exact Work/result authority boundaries", async () => {
    if (
      inquiryCollectionFixture.content.view_kind !== "collection" ||
      inquiryDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error("Expected collection and detail inquiry fixtures.");
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectInquiryViews: inquiryReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryCollectionFixture.project_id}/inquiries?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(inquiryCollectionFixture);

    const objectiveId =
      inquiryDetailFixture.content.summary.inquiry_anchor_ref.objective_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryDetailFixture.project_id}/inquiries/${objectiveId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const body = (await detail.json()) as PetraProjectInquiryView;
    expect(body).toEqual(inquiryDetailFixture);
    if (body.content.view_kind !== "detail") {
      throw new Error("Expected inquiry detail response.");
    }
    expect(body.content.summary.resolution_boundary).toBe(
      "authored_status_only",
    );
    expect(body.content.basis.state).toBe("unavailable");
    expect(body.content.result_links[0]?.bearing).toBe("addresses");
    expect(
      body.content.operations.every(
        (operation) => operation.state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryDetailFixture.project_id}/inquiries?limit=0&authored_status=unknown&sort=recent`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_INQUIRY_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/inquiries/${objectiveId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_INQUIRY_NOT_FOUND");
  });

  it("returns only Review sessions authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectReviewViews: reviewReader,
    });
    const collection = await petra.app.request(
      authorized(`/api/queries/projects/${reviewFixture.project_id}/reviews`),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({
      reviews: [reviewFixture],
    });

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${reviewFixture.project_id}/reviews/${reviewFixture.review_session_id}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(reviewFixture);

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/reviews/${reviewFixture.review_session_id}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_REVIEW_NOT_FOUND");
  });

  it("returns the additive canonical-working Review view through the same authenticated API", async () => {
    const reader: ProjectReviewViewReader = {
      listProjectReviewViews: () =>
        Promise.resolve([structuredClone(workingReviewFixture)]),
      getProjectReviewView: () =>
        Promise.resolve(structuredClone(workingReviewFixture)),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectReviewViews: reader,
    });

    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${workingReviewFixture.project_id}/reviews`,
      ),
    );
    expect(collection.status).toBe(200);
    const body = (await collection.json()) as {
      reviews: PetraProjectReviewViewV120[];
    };
    expect(body.reviews[0]?.schema_version).toBe("1.2.0");
    expect(body.reviews[0]?.content.session.lifecycle).toBe("open");
    expect(
      body.reviews[0]?.content.members[0]?.working_state.authority_effect,
    ).toBe("none");

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${workingReviewFixture.project_id}/reviews/${workingReviewFixture.review_session_id}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(workingReviewFixture);
  });

  it("fails a lifecycle Review read closed when exact lifecycle is missing", async () => {
    const invalid = structuredClone(workingReviewFixture) as unknown as {
      content: { session: { lifecycle?: unknown } };
    };
    delete invalid.content.session.lifecycle;
    const reader: ProjectReviewViewReader = {
      listProjectReviewViews: () =>
        Promise.resolve([invalid as unknown as PetraProjectReviewViewV120]),
      getProjectReviewView: () =>
        Promise.resolve(invalid as unknown as PetraProjectReviewViewV120),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectReviewViews: reader,
    });

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${workingReviewFixture.project_id}/reviews/${workingReviewFixture.review_session_id}`,
      ),
    );
    expect(detail.status).toBe(503);
    await expect(detail.json()).resolves.toMatchObject({
      error: { code: "PROJECT_REVIEW_READ_FAILED" },
    });
  });

  it("authenticates the exact snapshot-consistent working-state query", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkingStateSnapshots: workingStateReader,
    });
    const unauthorized = await petra.app.request(
      `/api/queries/projects/${workingStateFixture.project_id}/working-state`,
    );
    expect(unauthorized.status).toBe(401);

    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${workingStateFixture.project_id}/working-state`,
      ),
    );
    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toEqual(workingStateFixture);

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/working-state",
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_WORKING_STATE_NOT_FOUND");
  });

  it("returns only the bounded relationship view authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectRelationshipViews: relationshipReader,
    });
    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${relationshipFixture.project_id}/relationship-view`,
      ),
    );
    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toEqual(relationshipFixture);

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/relationship-view",
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_RELATIONSHIP_NOT_FOUND");
  });

  it("authenticates the exact Project relationship overlay and rejects cross-Project reads", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectRelationshipOverlayViews: relationshipOverlayReader,
    });
    const unauthorized = await petra.app.request(
      `/api/queries/projects/${relationshipOverlayFixture.project_id}/relationship-overlay`,
    );
    expect(unauthorized.status).toBe(401);

    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${relationshipOverlayFixture.project_id}/relationship-overlay`,
      ),
    );
    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toEqual(relationshipOverlayFixture);

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/relationship-overlay",
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_RELATIONSHIP_OVERLAY_NOT_FOUND");
  });

  it("fails closed when the relationship overlay reader crosses the route Project boundary", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectRelationshipOverlayViews: {
        getProjectRelationshipOverlayView: () =>
          Promise.resolve(structuredClone(relationshipOverlayFixture)),
      },
    });
    const response = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/relationship-overlay",
      ),
    );
    expect(response.status).toBe(503);
    const body = JSON.parse(await response.text()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("PROJECT_RELATIONSHIP_OVERLAY_READ_FAILED");
    expect(body.error.message).toContain("another Project boundary");
  });

  it("returns semantic roles without client routes and validates bounded query input", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectObjectLocations: locationReader,
    });
    const parameters = new URLSearchParams({
      semanticKey: "petra.project-source",
      objectId: "project_source_01K4C000000000000000000007",
      taskIntent: "inspect",
    });
    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${locationFixture.project_id}/object-location?${parameters}`,
      ),
    );
    expect(current.status).toBe(200);
    const body = (await current.json()) as PetraProjectObjectLocationView;
    expect(body).toEqual(locationFixture);
    expect(body.content.primary_destination.role).toBe("sources");
    expect(JSON.stringify(body)).not.toContain("/projects/");

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${locationFixture.project_id}/object-location?${parameters}&ambientSelection=claim_01ARZ3NDEKTSV4RRFFQ69G5FBB`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_OBJECT_LOCATION_INVALID");

    const missingProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/object-location?${parameters}`,
      ),
    );
    expect(missingProject.status).toBe(404);
    const missingBody = JSON.parse(await missingProject.text()) as {
      error: { code: string };
    };
    expect(missingBody.error.code).toBe("PROJECT_NOT_FOUND");
  });
});
