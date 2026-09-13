import { readFileSync } from "node:fs";

import type {
  ReviewCandidateBasisRevisionResult,
  ReviewCandidateCorrectionResult,
  ReviewSessionSeparationResult,
} from "@petra/adapters";
import type {
  PetraCommunicationPlan,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedContinuationFailure,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectObjective,
  PetraProjectRelationshipOverlayView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectReviewViewV110,
  PetraProjectReviewViewV120,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionV110,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraSuggestedActionView,
  PetraProjectSource,
  PetraProjectSourceLifecycleView,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
  PetraProjectSourceView,
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionViewV11,
  PetraProjectThreadView,
  PetraProjectWorkView,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PetraContractRegistry as BrowserContractRegistry } from "./browser-contract-registry.js";
import {
  cancelProjectSuggestedActionWork,
  composeProjectHistoryCompensationPlan,
  createReviewCandidateBasisRevisionCommandInput,
  createReviewCandidateCorrectionCommandInput,
  createReviewSessionDeferCommandInput,
  createReviewSessionRefreshCommandInput,
  createReviewSessionReopenCommandInput,
  createReviewSessionSeparationCommandInput,
  createSuggestedActionInvocationRequest,
  createSuggestedActionInteractionReplayRequest,
  createSuggestedActionWorkCancellationRequest,
  createProjectSourceReplacement,
  executeProjectSourceLifecycleCommand,
  executeReviewCandidateBasisRevisionCommand,
  executeReviewCandidateCorrectionCommand,
  executeReviewSessionLifecycleCommand,
  executeReviewSessionRefreshCommand,
  executeReviewSessionSeparationCommand,
  executeProjectHistoryCompensationPlan,
  getRecentProjectHistory,
  getProjectSuggestedAction,
  getProjectHistoryEpisode,
  getProjectHistoryCompensationPreview,
  getProjectHistoryImpact,
  getProjectHistoryRecoveryAssessment,
  getProjectSuggestedActionInvocation,
  getProjectSuggestedWorkAction,
  getRetainedProjectHistory,
  graphQuestionFromOverlayView,
  graphQuestionFromView,
  loadProjectRelationshipOverlay,
  loadProjectRelationshipOverlayGraph,
  loadProjectReviewSession,
  loadProjectObjectLocationRedirect,
  loadProjectBriefAction as loadProjectBrief,
  loadProjectPetra,
  loadProjectPetraThread,
  loadProjectRecord,
  loadProjectSettings,
  loadProjectSuggestedActionHistory,
  loadProjectWorkCollection,
  loadProjectWorkDetail,
  invokeProjectSuggestedAction,
  projectRecordFromShellView,
  retractProjectSourceReplacement,
  replayProjectSuggestedActionInteraction,
  petraThreadFromView,
  reviewSessionFromView,
  sourceRecordFromView,
  semanticDestinationPath,
  workProjectFromView,
  workUnitFromView,
} from "./project-data.js";

const view = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const shellV11View = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellViewV11;

const controlledWritingProject = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProject;

const controlledWritingDefinition = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-definition-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectDefinition;

const controlledWritingObjective = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-objective-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjective;

const sourceView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const sourceRecord = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSource;

const sourceLifecycleView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-lifecycle-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceLifecycleView;

const sourceLifecycleReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-lifecycle-receipt.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceLifecycleReceipt;

const sourceReplacement = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacement;

const sourceReplacementCreatedReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-receipt-created.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementReceipt;

const sourceReplacementRetractedReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-receipt-retracted.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementReceipt;

const sourceReplacementRetraction = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-retraction.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementRetraction;

const controlsView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

const historyView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryView;

const historyEpisodeView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-episode-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryEpisodeViewV12;

const historyRetainedView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-retained-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedViewV12;

const historyContinuationFailure = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-retained-continuation-failure.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedContinuationFailure;

const historyImpactView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const historyRecoveryView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-recovery-assessment-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRecoveryAssessmentView;

const historyCompensationPreviewView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-preview-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPreviewView;

const historyCompensationPlanView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanView;

const historyCompensationExecutionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionView;

const reviewView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-review-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectReviewView;

const reviewSessionRecord = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/review-session-working-candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraReviewSessionV110;

const reviewWorkingCandidate = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/working-candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraWorkingCandidate;

const reviewWorkingRelationship = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/working-relationship.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraWorkingRelationship;

const relationshipView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-relationship-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectRelationshipView;

const relationshipOverlayView = {
  schema_name: "petra.project-relationship-overlay-view",
  schema_version: "1.0.0",
  project_id: relationshipView.project_id,
  content: {
    profile: {
      project_definition_ref: {
        project_definition_id: "project_definition_01K4C000000000000000000001",
        revision: 2,
        content_hash: `sha256:${"1".repeat(64)}`,
        record_hash: `sha256:${"2".repeat(64)}`,
        definition_family: "petra.scientific-evidence",
      },
    },
    positions: {
      authoritative: {
        authority: { event_position: 42, stream_revision: 7 },
      },
      working: {
        base_authority: { event_position: 42, stream_revision: 7 },
        project_definition_ref: {
          project_definition_id:
            "project_definition_01K4C000000000000000000001",
          revision: 2,
          content_hash: `sha256:${"1".repeat(64)}`,
          record_hash: `sha256:${"2".repeat(64)}`,
          definition_family: "petra.scientific-evidence",
        },
      },
    },
    relationships: [
      {
        layer: "working",
        target_endpoint_posture: "non_current_working_endpoint",
        target_node_key:
          "working:working_candidate_01K4D000000000000000000002:1:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    ],
  },
  content_hash: `sha256:${"3".repeat(64)}`,
  read_at: "2026-09-12T14:30:00.000Z",
} as unknown as PetraProjectRelationshipOverlayView;

const overlayDefinitionRef = {
  project_definition_id: "project_definition_01K4C000000000000000000001",
  revision: 2,
  content_hash: `sha256:${"1".repeat(64)}`,
  record_hash: `sha256:${"2".repeat(64)}`,
  definition_family: "petra.scientific-evidence",
};
const overlayWorkNodeKey =
  "current:work_version_01K4D000000000000000000001:1:sha256:1111111111111111111111111111111111111111111111111111111111111111";
const overlayClaimNodeKey =
  "current:claim_01K4D000000000000000000001:1:sha256:2222222222222222222222222222222222222222222222222222222222222222";
const overlayCandidateHeadNodeKey =
  "working:working_candidate_01K4D000000000000000000002:2:sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const overlayCandidateEarlierNodeKey =
  "working:working_candidate_01K4D000000000000000000002:1:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const overlayCurrentRelationshipKey =
  "current:assertion_01K4D000000000000000000001:1";
const overlayWorkingRelationshipKey =
  "working:working_relationship_01K4D000000000000000000003:1";

const overlayNodes = [
  {
    node_key: overlayWorkNodeKey,
    layer: "current",
    owner: {
      owner_kind: "authoritative_record",
      record_ref: {
        record_id: "work_version_01K4D000000000000000000001",
        revision: 1,
        record_hash: `sha256:${"1".repeat(64)}`,
      },
    },
    object_kind: "work_version",
    object_term: "Work version",
    label: "Evidence extraction · version 1",
    summary: "The exact authoritative Work version on the selected path.",
    basis: "Accepted Work record.",
    lifecycle: "represented",
  },
  {
    node_key: overlayClaimNodeKey,
    layer: "current",
    owner: {
      owner_kind: "authoritative_record",
      record_ref: {
        record_id: "claim_01K4D000000000000000000001",
        revision: 1,
        record_hash: `sha256:${"2".repeat(64)}`,
      },
    },
    object_kind: "claim",
    object_term: "Claim",
    label: "Current reported improvement",
    summary: "The current authoritative Claim on the selected path.",
    basis: "Accepted Claim revision 1.",
    lifecycle: "represented",
  },
  {
    node_key: overlayCandidateHeadNodeKey,
    layer: "working",
    owner: {
      owner_kind: "working_candidate",
      working_candidate_ref: {
        working_candidate_id: "working_candidate_01K4D000000000000000000002",
        revision: 2,
        content_hash: `sha256:${"b".repeat(64)}`,
        record_hash: `sha256:${"b".repeat(64)}`,
      },
    },
    profile_record_ref: {
      record_id: "claim_01K4D000000000000000000002",
      revision: 2,
      record_hash: `sha256:${"b".repeat(64)}`,
    },
    object_term: "Claim",
    label: "Narrowed working Claim",
    summary: "The current working candidate head after a material correction.",
    basis: "Human correction in ProjectThread turn 9.",
    validation_summary: "Validation pending for revision 2.",
    endpoint_posture: "current_working_head",
  },
  {
    node_key: overlayCandidateEarlierNodeKey,
    layer: "working",
    owner: {
      owner_kind: "working_candidate",
      working_candidate_ref: {
        working_candidate_id: "working_candidate_01K4D000000000000000000002",
        revision: 1,
        content_hash: `sha256:${"a".repeat(64)}`,
        record_hash: `sha256:${"a".repeat(64)}`,
      },
    },
    profile_record_ref: {
      record_id: "claim_01K4D000000000000000000002",
      revision: 1,
      record_hash: `sha256:${"a".repeat(64)}`,
    },
    object_term: "Claim",
    label: "Earlier working Claim",
    summary:
      "The exact earlier revision referenced by the working relationship.",
    basis: "Model extraction from the bounded source span.",
    validation_summary:
      "Validation completed: two passed; validation does not grant authority.",
    endpoint_posture: "non_current_working_endpoint",
  },
];

const overlayRelationships = [
  {
    relationship_key: overlayCurrentRelationshipKey,
    layer: "current",
    owner: {
      owner_kind: "authoritative_relationship",
      relationship_ref: {
        element_id: "assertion_01K4D000000000000000000001",
        revision: 1,
        record_hash: `sha256:${"3".repeat(64)}`,
      },
    },
    source_node_key: overlayWorkNodeKey,
    target_node_key: overlayClaimNodeKey,
    direction: "outgoing",
    relation_class: "representation",
    label: "asserts",
    summary: "The Work version records the current Claim.",
    meaning: "This is the accepted representation relationship.",
    scope: "The exact authoritative path in this result.",
    basis: "Accepted Assertion revision 1.",
  },
  {
    relationship_key: overlayWorkingRelationshipKey,
    layer: "working",
    owner: {
      owner_kind: "working_relationship",
      working_relationship_ref: {
        working_relationship_id:
          "working_relationship_01K4D000000000000000000003",
        revision: 1,
        content_hash: `sha256:${"4".repeat(64)}`,
        record_hash: `sha256:${"4".repeat(64)}`,
      },
    },
    profile_record_ref: {
      record_id: "assertion_01K4D000000000000000000002",
      revision: 1,
      record_hash: `sha256:${"4".repeat(64)}`,
    },
    source_node_key: overlayWorkNodeKey,
    target_node_key: overlayCandidateEarlierNodeKey,
    target_endpoint_posture: "non_current_working_endpoint",
    direction: "outgoing",
    relation_class: "representation",
    relationship_term: "Evidence relationship",
    label: "asserts",
    summary:
      "The exact working relationship still targets candidate revision 1.",
    meaning:
      "This is working source representation, not authority or approval.",
    scope: "The exact working input snapshot.",
    basis: "Working relationship revision 1.",
    validation_summary:
      "Validation completed: one passed; validation does not grant authority.",
  },
];

const relationshipOverlayGraphView = {
  schema_name: "petra.project-relationship-overlay-view",
  schema_version: "1.0.0",
  project_id: relationshipView.project_id,
  content: {
    query: {
      request_hash: `sha256:${"0".repeat(64)}`,
      query_kind: "scientific_provenance_working_overlay",
      question: "Which exact Work version supports this Claim?",
      scope: "One bounded provenance path and its relevant working overlay.",
      authoritative_focus_ref: {
        record_id: "claim_01K4D000000000000000000001",
        revision: 1,
        record_hash: `sha256:${"2".repeat(64)}`,
      },
      maximum_authoritative_depth: 3,
      working_selection:
        "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints",
    },
    profile: {
      project_definition_ref: overlayDefinitionRef,
      label: "Scientific evidence",
      object_term: {
        semantic_key: "scientific.claim",
        singular: "Claim",
        plural: "Claims",
        definition: "A bounded evidence statement.",
      },
      relationship_term: {
        semantic_key: "scientific.assertion",
        singular: "Evidence relationship",
        plural: "Evidence relationships",
        definition: "A recorded evidence relationship.",
      },
      source_term: {
        semantic_key: "scientific.literature",
        singular: "Source",
        plural: "Sources",
        definition: "A registered scientific source.",
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
          content_hash: `sha256:${"5".repeat(64)}`,
          read_at: "2026-09-12T14:29:59.000Z",
        },
        authority: { event_position: 42, stream_revision: 7 },
        projection: {
          checkpoint_ref: {
            record_id: "projection_checkpoint_01K4D000000000000000000001",
            revision: 3,
            content_hash: `sha256:${"6".repeat(64)}`,
          },
          state: "current",
          represented_event_position: 42,
          represented_stream_revision: 7,
          represented_target_sequence: 12,
          observed_event_position: 42,
          observed_stream_revision: 7,
          observed_target_sequence: 12,
          pending_records: 0,
          detail:
            "The projection represents the current authoritative position.",
        },
      },
      working: {
        snapshot_ref: {
          schema_name: "petra.project-working-state-snapshot",
          schema_version: "1.0.0",
          content_hash: `sha256:${"7".repeat(64)}`,
          read_at: "2026-09-12T14:30:00.000Z",
        },
        base_authority: { event_position: 42, stream_revision: 7 },
        project_definition_ref: overlayDefinitionRef,
        selection_kind: "current_heads_plus_exact_referenced_working_revisions",
        historical_working_revisions_included: "referenced_only",
        authoritative_records_included: false,
      },
    },
    nodes: overlayNodes,
    relationships: overlayRelationships,
    completeness: {
      state:
        "complete_for_selected_authoritative_path_and_relevant_working_heads",
      scope:
        "Complete for the selected authoritative path and exact relevant working records.",
      authoritative_nodes: 2,
      authoritative_relationships: 1,
      current_working_candidate_heads: 1,
      current_working_relationship_heads: 1,
      returned_working_candidate_revisions: 2,
      returned_working_relationships: 1,
      referenced_non_current_working_candidate_revisions: 1,
      returned_nodes: 4,
      returned_relationships: 2,
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
      omissions: [
        "Historical authoritative state and whole-Project traversal are not included.",
      ],
    },
    textual_peer: {
      title: "Scientific evidence inquiry: relationship layers",
      scope: "Textual peer for every returned node and relationship.",
      completeness: "complete_for_every_returned_node_and_relationship",
      nodes: overlayNodes.map((node) => ({
        node_key: node.node_key,
        layer: node.layer,
        object_term: node.object_term,
        label: node.label,
        summary: node.summary,
        basis: node.basis,
      })),
      relationships: overlayRelationships.map((relationship) => ({
        relationship_key: relationship.relationship_key,
        layer: relationship.layer,
        source_node_key: relationship.source_node_key,
        source_label: overlayNodes.find(
          (node) => node.node_key === relationship.source_node_key,
        )!.label,
        direction: relationship.direction,
        label: relationship.label,
        target_node_key: relationship.target_node_key,
        target_label: overlayNodes.find(
          (node) => node.node_key === relationship.target_node_key,
        )!.label,
        summary: relationship.summary,
        meaning: relationship.meaning,
        scope: relationship.scope,
        basis: relationship.basis,
      })),
      omissions: [
        "Historical authoritative state and whole-Project traversal are not included.",
      ],
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
    limitations: [
      "The first adapter is limited to one registered scientific profile.",
    ],
  },
  content_hash: `sha256:${"8".repeat(64)}`,
  read_at: "2026-09-12T14:30:00.000Z",
} as unknown as PetraProjectRelationshipOverlayView;

const locationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-object-location-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjectLocationView;

const workCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const workDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const inquiryCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const inquiryDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const suggestedActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionView;

const suggestedWorkActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionViewV11;

const suggestedActionInvocationRequest = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-invocation-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationRequest;

const suggestedActionInvocationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationView;

const completedSuggestedActionInvocationView =
  (): PetraSuggestedActionInvocationView => {
    const completed = structuredClone(suggestedActionInvocationView);
    if (completed.content.work.state !== "pending_registration") {
      throw new TypeError("Expected the pending SuggestedAction Work fixture.");
    }
    const workUnitId = completed.content.work.expected_work_unit_id;
    const workUnitRef = {
      work_unit_id: workUnitId,
      revision: 4,
      spec_hash:
        "sha256:2121212121212121212121212121212121212121212121212121212121212121",
      record_hash:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    };
    completed.content.operation_state = "completed";
    completed.content.work = {
      state: "available",
      work_unit_ref: workUnitRef,
      input_manifest_ref: {
        record_id: "worker_input_manifest_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:2323232323232323232323232323232323232323232323232323232323232323",
        record_hash:
          "sha256:2424242424242424242424242424242424242424242424242424242424242424",
      },
      execution_state: "completed",
      terminal_outcome: "succeeded",
    };
    completed.content.result = {
      state: "available",
      result_ref: {
        schema_name: "petra.grounded-response",
        schema_version: "1.0.0",
        record_id: "grounded_response_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:2525252525252525252525252525252525252525252525252525252525252525",
        record_hash:
          "sha256:2626262626262626262626262626262626262626262626262626262626262626",
      },
      authority_effect: "none",
    };
    completed.content.interaction = {
      ...completed.content.interaction,
      durable_state: "available",
      interaction_run_ref: {
        record_id: "interaction_run_01K4C000000000000000000062",
        revision: 3,
        content_hash:
          "sha256:2727272727272727272727272727272727272727272727272727272727272727",
        record_hash:
          "sha256:2828282828282828282828282828282828282828282828282828282828282828",
      },
    };
    completed.content.history.work_revisions = [
      {
        work_unit_ref: workUnitRef,
        state: "completed",
        terminal_outcome: "succeeded",
        recorded_at: "2026-09-11T18:40:03.000Z",
      },
    ];
    for (const action of completed.content.recovery.actions) {
      delete action.command_name;
      action.eligibility =
        action.operation === "reconnect_delivery" ||
        action.operation === "inspect_work" ||
        action.operation === "inspect_result"
          ? "eligible"
          : "ineligible";
    }
    return completed;
  };

const suggestedActionReplayWire = (
  invocation: PetraSuggestedActionInvocationView,
  workUnitId = invocation.content.invocation.content.expected_work_unit_id,
): string => {
  if (
    invocation.content.work.state !== "available" ||
    invocation.content.result.state !== "available" ||
    invocation.content.interaction.interaction_run_ref === undefined
  ) {
    throw new TypeError("Expected a completed SuggestedAction invocation.");
  }
  const correlation = invocation.content.interaction;
  const command = invocation.content.invocation.content.command_ref;
  const metadata = (sequence: number) => ({
    petra: {
      sequence,
      requestId: "request_01K4C000000000000000000062",
      traceId: command.correlation_id,
      workUnitId,
      modelRequestId: "model_request_01K4C000000000000000000062",
    },
  });
  const events = [
    {
      type: "RUN_STARTED",
      threadId: correlation.protocol_thread_id,
      runId: correlation.protocol_run_id,
      timestamp: 1,
      metadata: metadata(1),
    },
    {
      type: "TEXT_MESSAGE_START",
      messageId: "message_suggested_action_replay",
      role: "assistant",
      timestamp: 2,
      metadata: metadata(2),
    },
    {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "message_suggested_action_replay",
      delta: "The exact retained grounded response.",
      timestamp: 3,
      metadata: metadata(3),
    },
    {
      type: "TEXT_MESSAGE_END",
      messageId: "message_suggested_action_replay",
      timestamp: 4,
      metadata: metadata(4),
    },
    {
      type: "RUN_FINISHED",
      threadId: correlation.protocol_thread_id,
      runId: correlation.protocol_run_id,
      result: {
        authorityEffect: "none",
        terminalBinding: {
          grounded_response_id: invocation.content.result.result_ref.record_id,
          grounded_response_revision:
            invocation.content.result.result_ref.revision,
          grounded_response_hash:
            invocation.content.result.result_ref.content_hash,
          response_artifact_id: "artifact_01K4C000000000000000000062",
          response_artifact_hash:
            "sha256:2929292929292929292929292929292929292929292929292929292929292929",
          interaction_run_id:
            invocation.content.interaction.interaction_run_ref.record_id,
          interaction_run_revision: 2,
          interaction_run_hash:
            "sha256:3030303030303030303030303030303030303030303030303030303030303030",
          work_unit_id: invocation.content.work.work_unit_ref.work_unit_id,
          work_unit_revision: invocation.content.work.work_unit_ref.revision,
          work_unit_spec_hash: invocation.content.work.work_unit_ref.spec_hash,
          persisted_at: "2026-09-11T18:40:03.000Z",
        },
      },
      outcome: { type: "success" },
      timestamp: 5,
      metadata: metadata(5),
    },
  ];
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
};

const threadCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-thread-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const threadDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-thread-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const communicationPlan = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/communication-plan.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraCommunicationPlan;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Project shell workbench adapter", () => {
  it("bundles the exact Review-correction and basis response validators for the browser", () => {
    const contracts = new BrowserContractRegistry();
    expect(() =>
      contracts.assertValid(
        "working-candidate",
        "1.0.0",
        reviewWorkingCandidate,
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid(
        "working-relationship",
        "1.0.0",
        reviewWorkingRelationship,
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("review-session", "1.1.0", reviewSessionRecord),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("working-candidate", "1.0.0", {
        ...reviewWorkingCandidate,
        authority_boundary: {
          ...reviewWorkingCandidate.authority_boundary,
          domain_authority: true,
        },
      }),
    ).toThrow("does not satisfy working-candidate@1.0.0");
  });

  it("maps exact definition terminology and projection attention without mutating the view", () => {
    const before = structuredClone(view);
    const project = projectRecordFromShellView(view);

    expect(project.id).toBe(view.project_id);
    expect(project.title).toBe("Competing explanations");
    expect(project.objective).toContain("exact inspectable passages");
    expect(project.profile.id).toBe(
      "project_definition_01K4C000000000000000000001",
    );
    expect(project.profile.terms).toEqual({
      focus: "Research question",
      focusPlural: "Research questions",
      finding: "Claim",
      findingPlural: "Claims",
      reference: "Source",
      referencePlural: "Sources",
    });
    expect(project.projection.state).toBe("catching_up");
    expect(project.attention).toEqual([
      expect.objectContaining({
        id: "attention_01K4C000000000000000000008",
        title: "Graph projection is catching up",
      }),
    ]);
    expect(project.snapshot.label).toBe("Authority event 3");
    expect(view).toEqual(before);
  });

  it("maps a project-authored controlled-writing definition without scientific assumptions", () => {
    const controlledWritingShell = structuredClone(shellV11View);
    controlledWritingShell.project_id = controlledWritingProject.project_id;
    controlledWritingShell.content.project = {
      project_id: controlledWritingProject.project_id,
      revision: controlledWritingProject.revision,
      name: controlledWritingProject.name,
      description:
        controlledWritingProject.description ??
        "A project-authored controlled-writing Project.",
      status: controlledWritingProject.status,
      updated_at: controlledWritingProject.updated_at,
    };
    controlledWritingShell.content.definition = {
      project_definition_id: controlledWritingDefinition.project_definition_id,
      revision: controlledWritingDefinition.revision,
      content_hash: controlledWritingDefinition.content_hash,
      definition_family: controlledWritingDefinition.definition_family,
      label: controlledWritingDefinition.content.label,
      description: controlledWritingDefinition.content.description,
      kernel_compatibility:
        controlledWritingDefinition.content.kernel_compatibility,
      terms: controlledWritingDefinition.content.terms,
      supported_places: controlledWritingDefinition.content.supported_places,
    };
    controlledWritingShell.content.current_objective = {
      objective_id: controlledWritingObjective.objective_id,
      revision: controlledWritingObjective.revision,
      content_hash: controlledWritingObjective.content_hash,
      objective_kind: controlledWritingObjective.content.objective_kind,
      statement: controlledWritingObjective.content.statement,
      status: controlledWritingObjective.content.status,
    };
    const sourceSummary = controlledWritingShell.content.place_summaries.find(
      (place) => place.role === "sources",
    );
    if (sourceSummary === undefined) {
      throw new Error("Expected a sources place summary.");
    }
    sourceSummary.label = "Authority sources";

    const project = projectRecordFromShellView(controlledWritingShell);

    expect(project.profile).toEqual(
      expect.objectContaining({
        id: controlledWritingDefinition.project_definition_id,
        label: "Controlled writing",
        terms: {
          focus: "Document purpose",
          focusPlural: "Document purposes",
          finding: "Requirement",
          findingPlural: "Requirements",
          reference: "Authority source",
          referencePlural: "Authority sources",
        },
      }),
    );
    expect(project.objective).toContain("controlled operating procedure");
    expect(
      project.placeSummaries?.find((place) => place.role === "sources")?.label,
    ).toBe("Authority sources");
  });

  it("keeps a Project with no selected Objective explicit and usable", () => {
    const early = structuredClone(view);
    delete early.content.current_objective;
    early.content.attention = [];
    early.content.projection = {
      state: "unavailable",
      label: "Projection unavailable",
      detail: "No graph checkpoint is registered.",
      represented_event_position: 0,
      observed_event_position: 0,
      pending_records: 0,
    };

    const project = projectRecordFromShellView(early);
    expect(project.state).toBe("early");
    expect(project.objective).toBe(
      "No current Project focus has been selected.",
    );
    expect(project.projection.state).toBe("unavailable");
    expect(project.sources).toEqual([]);
    expect(project.recentDecisions).toEqual([]);
  });

  it("retains honest place coverage and exact semantic selection from shell 1.1", () => {
    const before = structuredClone(shellV11View);
    const project = projectRecordFromShellView(shellV11View);

    expect(project.placeSummaries).toHaveLength(9);
    expect(project.placeSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "work",
          coverage: "complete",
          itemCount: 2,
          attentionCount: 1,
        }),
        expect.objectContaining({
          role: "history",
          coverage: "partial",
          limitation:
            "A composed causal Project History read is not implemented.",
        }),
      ]),
    );
    expect(project.selection).toEqual(
      expect.objectContaining({
        state: "current",
        semanticKey: "petra.project-source",
        objectId: "project_source_01K4C000000000000000000007",
        resolvedRevision: 1,
        destination: "sources",
      }),
    );
    expect(shellV11View).toEqual(before);
  });

  it("requests and verifies an exact route selection in the shell snapshot", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify(shellV11View), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      "http://petra.test/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007?semanticKey=petra.project-source&revision=1&recordHash=sha256%3Afa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId",
      params: {
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
      context: new RouterContextProvider(),
    };

    const project = await loadProjectRecord(args);

    expect(project.selection?.recordHash).toBe(
      "sha256:fa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );
    const requestPath = fetch.mock.calls[0]?.[0];
    expect(typeof requestPath).toBe("string");
    if (typeof requestPath !== "string") {
      throw new TypeError("Expected the shell loader to request a URL string.");
    }
    expect(requestPath).toContain(
      "/shell?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&revision=1&taskIntent=inspect",
    );

    const incompleteUrl = new URL(url);
    incompleteUrl.searchParams.delete("recordHash");
    await expect(
      loadProjectRecord({
        ...args,
        request: new Request(incompleteUrl),
        url: incompleteUrl,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("loads Settings from one exact Project and definition snapshot", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.endsWith("/effective-controls") ? controlsView : shellV11View,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/settings?project=${controlsView.project_id}`,
    );
    const data = await loadProjectSettings({
      request: new Request(url),
      url,
      pattern: "/settings",
      params: {},
      context: new RouterContextProvider(),
    });

    expect(data.selectedProject?.id).toBe(controlsView.project_id);
    expect(data.controls?.content.sections.privacy.state).toBe("effective");
    expect(data.controls?.content.sections.capability.state).toBe(
      "unavailable",
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    const noTarget = new URL("http://petra.test/settings");
    await expect(
      loadProjectSettings({
        request: new Request(noTarget),
        url: noTarget,
        pattern: "/settings",
        params: {},
        context: new RouterContextProvider(),
      }),
    ).resolves.toEqual({});
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reads one exact server-owned SuggestedAction without client authority", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(suggestedActionView));
    vi.stubGlobal("fetch", fetch);
    const linkId =
      suggestedActionView.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;

    const result = await getProjectSuggestedAction(
      suggestedActionView.project_id,
      linkId,
    );

    expect(result).toEqual(suggestedActionView);
    expect(result.content.readiness.state).toBe("ready");
    expect(result.content.operation).toEqual({
      state: "read_only",
      work_start: "not_performed",
      authority_change: "none",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${suggestedActionView.project_id}/suggested-actions?inquiry_result_link_id=${linkId}`,
    );
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer petra-local-development");

    const substituted = structuredClone(suggestedActionView);
    substituted.content.action.invocation.objective_ref.objective_id =
      "objective_01K4C000000000000000000099";
    fetch.mockResolvedValueOnce(Response.json(substituted));
    await expect(
      getProjectSuggestedAction(suggestedActionView.project_id, linkId),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("uses the SuggestedAction's typed invocation for exact inquiry detail", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.includes("/suggested-actions?")
            ? path.includes("action_kind=run_grounded_synthesis")
              ? suggestedWorkActionView
              : suggestedActionView
            : inquiryDetailView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const linkId =
      suggestedActionView.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const operation = suggestedActionView.content.action.invocation.operation;
    const url = new URL(
      `http://petra.test/projects/${suggestedActionView.project_id}/brief?inquiry_result_link_id=${linkId}&invoke=${operation}`,
    );

    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/brief",
      params: { projectId: suggestedActionView.project_id },
      context: new RouterContextProvider(),
    });

    expect(result.suggestedAction).toEqual(suggestedActionView);
    expect(result.suggestedWorkAction).toEqual(suggestedWorkActionView);
    expect(result.invokedInquiry).toEqual(inquiryDetailView);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/api/queries/projects/${suggestedActionView.project_id}/suggested-actions?inquiry_result_link_id=${linkId}`,
      `/api/queries/projects/${suggestedActionView.project_id}/suggested-actions?inquiry_result_link_id=${linkId}&action_kind=run_grounded_synthesis`,
      `/api/queries/projects/${suggestedActionView.project_id}/inquiries/${suggestedActionView.content.action.invocation.objective_ref.objective_id}`,
    ]);
  });

  it("does not invoke a stale SuggestedAction or start substitute Work", async () => {
    const stale = structuredClone(suggestedActionView);
    stale.content.readiness = {
      state: "stale",
      reason_code: "result_invalidated",
      reason:
        "The exact GroundedResponse is no longer reusable under current authority.",
      missing_prerequisites: [
        "Regenerate a SuggestedAction from a current reusable result.",
      ],
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(stale));
    vi.stubGlobal("fetch", fetch);
    const linkId =
      stale.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const url = new URL(
      `http://petra.test/projects/${stale.project_id}/brief?inquiry_result_link_id=${linkId}&invoke=get_project_inquiry_detail`,
    );

    await expect(
      loadProjectBrief({
        request: new Request(url),
        url,
        pattern: "/projects/:projectId/brief",
        params: { projectId: stale.project_id },
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toContain("/suggested-actions?");
  });

  it("discovers one exact current-focus action without deriving priority", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.endsWith("/shell")
            ? view
            : path.includes("/inquiries/")
              ? inquiryDetailView
              : path.includes("action_kind=run_grounded_synthesis")
                ? suggestedWorkActionView
                : suggestedActionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${suggestedActionView.project_id}/brief`,
    );

    const result = await loadProjectBrief({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/brief",
      params: { projectId: suggestedActionView.project_id },
      context: new RouterContextProvider(),
    });

    expect(result).toEqual({
      suggestedAction: suggestedActionView,
      suggestedWorkAction: suggestedWorkActionView,
    });
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/api/queries/projects/${suggestedActionView.project_id}/shell`,
      `/api/queries/projects/${suggestedActionView.project_id}/inquiries/${suggestedActionView.content.action.invocation.objective_ref.objective_id}`,
      `/api/queries/projects/${suggestedActionView.project_id}/suggested-actions?inquiry_result_link_id=${suggestedActionView.content.action.basis.inquiry_result_link_ref.project_inquiry_link_id}`,
      `/api/queries/projects/${suggestedActionView.project_id}/suggested-actions?inquiry_result_link_id=${suggestedActionView.content.action.basis.inquiry_result_link_ref.project_inquiry_link_id}&action_kind=run_grounded_synthesis`,
    ]);

    const earlyShell = structuredClone(view);
    delete earlyShell.content.current_objective;
    fetch.mockResolvedValueOnce(Response.json(earlyShell));
    await expect(
      loadProjectBrief({
        request: new Request(url),
        url,
        pattern: "/projects/:projectId/brief",
        params: { projectId: suggestedActionView.project_id },
        context: new RouterContextProvider(),
      }),
    ).resolves.toEqual({});

    const multipleResults = structuredClone(inquiryDetailView);
    if (multipleResults.content.view_kind !== "detail") {
      throw new Error("Expected exact inquiry detail.");
    }
    const secondResult = structuredClone(
      multipleResults.content.result_links[0],
    );
    if (secondResult === undefined) {
      throw new Error("Expected one exact inquiry result link.");
    }
    secondResult.link_ref.project_inquiry_link_id =
      "project_inquiry_link_01K4F000000000000000000099";
    multipleResults.content.result_links.push(secondResult);
    multipleResults.content.summary.linked_result_count = 2;
    fetch
      .mockResolvedValueOnce(Response.json(view))
      .mockResolvedValueOnce(Response.json(multipleResults));
    await expect(
      loadProjectBrief({
        request: new Request(url),
        url,
        pattern: "/projects/:projectId/brief",
        params: { projectId: suggestedActionView.project_id },
        context: new RouterContextProvider(),
      }),
    ).resolves.toEqual({});
  });

  it("reads the bounded causal Recent changes contract without mixing graph history", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyView));
    vi.stubGlobal("fetch", fetch);

    const result = await getRecentProjectHistory(historyView.project_id);

    expect(result).toEqual(historyView);
    expect(result.content.quick_window_limit).toBe(10);
    expect(result.content.graph_navigation_history).toBe(
      "client_local_separate",
    );
    expect(result.content.changes[0]?.recovery.eligibility).toBe("eligible");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyView.project_id}/history/recent`,
    );
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer petra-local-development");

    const wrongProject = structuredClone(historyView);
    wrongProject.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongProject));
    await expect(
      getRecentProjectHistory(historyView.project_id),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads an exact event-selected episode without asserting cross-family order", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyEpisodeView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryEpisode(
      historyEpisodeView.project_id,
      historyEpisodeView.event_id,
    );

    expect(result).toEqual(historyEpisodeView);
    expect(result.content.stream_order.order_kind).toBe("project_stream");
    expect(result.content.omissions).toContain(
      "cross_family_total_order_not_asserted",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyEpisodeView.project_id}/history/events/${historyEpisodeView.event_id}`,
    );

    const wrongEvent = structuredClone(historyEpisodeView);
    wrongEvent.event_id = "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const noAuthority = structuredClone(historyEpisodeView);
    noAuthority.content.project_definition_authority = {
      state: "unavailable",
      reason_code: "retained_project_definition_authority_not_available",
      reason:
        "No exact retained ProjectDefinition authority binding is available for this selected event.",
      historical_destination_interpretation: "not_performed",
    };
    fetch.mockResolvedValueOnce(Response.json(noAuthority));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const substitutedDefinition = structuredClone(historyEpisodeView);
    if (
      substitutedDefinition.content.historical_semantic_destination.state !==
      "available"
    ) {
      throw new Error("Expected the available destination fixture.");
    }
    substitutedDefinition.content.historical_semantic_destination.project_definition_ref.revision += 1;
    fetch.mockResolvedValueOnce(Response.json(substitutedDefinition));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongRouteEvent = structuredClone(historyEpisodeView);
    if (
      wrongRouteEvent.content.historical_semantic_destination.state !==
      "available"
    ) {
      throw new Error("Expected the available destination fixture.");
    }
    wrongRouteEvent.content.historical_semantic_destination.route_authority.event_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongRouteEvent));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const lateBinding = structuredClone(historyEpisodeView);
    if (
      lateBinding.content.project_definition_authority.state !== "available"
    ) {
      throw new Error("Expected the available definition fixture.");
    }
    lateBinding.content.project_definition_authority.effective_after_stream_revision =
      historyEpisodeView.content.change.event_ref.stream_revision;
    fetch.mockResolvedValueOnce(Response.json(lateBinding));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads bounded semantic and operational impact without inferring effects or reversibility", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyImpactView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryImpact(
      historyImpactView.project_id,
      historyImpactView.event_id,
    );

    expect(result).toEqual(historyImpactView);
    expect(result.content.impact.summary.registered_group_count).toBe(4);
    expect(result.content.semantic_target_impact).toMatchObject({
      target_limit: 10,
      per_adapter_ref_limit: 25,
      target_total_count: 1,
      target_returned_count: 1,
      target_coverage: "complete",
      summary: {
        registered_adapter_count: 9,
        supported_target_count: 1,
        total_count: 4,
      },
    });
    expect(result.content.operational_dependency_impact).toMatchObject({
      target_limit: 10,
      per_adapter_ref_limit: 25,
      target_total_count: 1,
      target_returned_count: 1,
      target_coverage: "complete",
      summary: {
        registered_adapter_count: 3,
        supported_target_count: 1,
        total_count: 3,
      },
    });
    const destinationAssessment =
      result.content.operational_dependency_impact.target_assessments[0];
    if (destinationAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    expect(destinationAssessment.groups[0].refs[0]?.destination).toMatchObject({
      state: "available",
      place_role: "work",
      task_intent: "inspect",
      route_authority: {
        schema_name: "petra.project-work-view",
        schema_version: "1.0.0",
        view_kind: "detail",
      },
    });
    expect(destinationAssessment.groups[1].refs[0]?.destination).toEqual({
      state: "unavailable",
      reason_code: "worker_output_manifest_route_not_registered",
      reason:
        "No exact Project-owned WorkerOutputManifest destination is registered.",
    });
    expect(destinationAssessment.groups[2].refs[0]?.destination).toEqual({
      state: "unavailable",
      reason_code: "interaction_replay_record_route_not_registered",
      reason:
        "No exact Project-owned InteractionReplayRecord destination is registered; replay is not a ProjectThread binding.",
    });
    expect(result.content.decision_boundary).toEqual({
      reversibility: "not_assessed",
      compensation: "not_composed",
      dependent_effect: "not_inferred_from_reference",
    });
    expect(result.content.omissions).toContain(
      "transitive_dependency_closure_not_composed",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyImpactView.project_id}/history/events/${historyImpactView.event_id}/impact`,
    );

    const wrongEvent = structuredClone(historyImpactView);
    wrongEvent.content.selected_event.event_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongTarget = structuredClone(historyImpactView);
    wrongTarget.content.semantic_target_impact.target_assessments[0].target_ref.object_id =
      "change_set_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongTarget));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const collapsedReplacementState = structuredClone(historyImpactView);
    const effectiveGroup =
      collapsedReplacementState.content.semantic_target_impact
        .target_assessments[0].groups[3];
    if (effectiveGroup === undefined) {
      throw new Error("Expected the ProjectSource effective-head group.");
    }
    effectiveGroup.authority_source =
      "immutable_project_source_replacement_bindings";
    fetch.mockResolvedValueOnce(Response.json(collapsedReplacementState));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const reboundOperationalTarget = structuredClone(historyImpactView);
    const operationalAssessment =
      reboundOperationalTarget.content.operational_dependency_impact
        .target_assessments[0];
    if (operationalAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    operationalAssessment.groups[1].refs[0]!.input_binding_ref.snapshot_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    fetch.mockResolvedValueOnce(Response.json(reboundOperationalTarget));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const fabricatedReplayDestination = structuredClone(historyImpactView);
    const fabricatedAssessment =
      fabricatedReplayDestination.content.operational_dependency_impact
        .target_assessments[0];
    if (fabricatedAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    const replayDestination =
      fabricatedAssessment.groups[2].refs[0]?.destination;
    if (replayDestination === undefined) {
      throw new Error("Expected an interaction replay destination state.");
    }
    Object.assign(replayDestination, { state: "available" });
    fetch.mockResolvedValueOnce(Response.json(fabricatedReplayDestination));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads an exact recovery assessment without composing compensation", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyRecoveryView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryRecoveryAssessment(
      historyRecoveryView.project_id,
      historyRecoveryView.event_id,
    );

    expect(result).toEqual(historyRecoveryView);
    expect(result.content.assessment.state).toBe("eligible_for_preview");
    expect(result.content.decision_boundary.compensation_preview).toBe(
      "not_composed",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyRecoveryView.project_id}/history/events/${historyRecoveryView.event_id}/recovery`,
    );

    const wrongEvent = structuredClone(historyRecoveryView);
    wrongEvent.content.causal_impact_basis.source_event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryRecoveryAssessment(
        historyRecoveryView.project_id,
        historyRecoveryView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const reorderedCommands = structuredClone(historyRecoveryView);
    reorderedCommands.content.command_authority.required_commands.reverse();
    fetch.mockResolvedValueOnce(Response.json(reorderedCommands));
    await expect(
      getProjectHistoryRecoveryAssessment(
        historyRecoveryView.project_id,
        historyRecoveryView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads a revision-bound preview without treating it as execution authority", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationPreviewView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryCompensationPreview(
      historyCompensationPreviewView.project_id,
      historyCompensationPreviewView.event_id,
    );

    expect(result).toEqual(historyCompensationPreviewView);
    expect(
      result.content.operation_preview.map(
        ({ operation_kind }) => operation_kind,
      ),
    ).toEqual(["retract_claim", "retract_assertion"]);
    expect(result.content.decision_boundary).toMatchObject({
      preview: "read_only",
      change_set: "not_created",
      approval: "not_recorded",
      commands: "not_composed_or_executed",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyCompensationPreviewView.project_id}/history/events/${historyCompensationPreviewView.event_id}/recovery/preview`,
    );

    const staleShape = structuredClone(historyCompensationPreviewView);
    staleShape.content.result_preview[0].resulting_revision =
      staleShape.content.result_preview[0].prior_revision;
    fetch.mockResolvedValueOnce(Response.json(staleShape));
    await expect(
      getProjectHistoryCompensationPreview(
        historyCompensationPreviewView.project_id,
        historyCompensationPreviewView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongEvent = structuredClone(historyCompensationPreviewView);
    wrongEvent.content.assessment_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryCompensationPreview(
        historyCompensationPreviewView.project_id,
        historyCompensationPreviewView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("requests a confirmed command plan without client-supplied authority or execution", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationPlanView));
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: historyCompensationPreviewView.project_id,
      eventId: historyCompensationPreviewView.event_id,
      preview: historyCompensationPreviewView,
      reason:
        "Retract the accepted pair after confirmed review of its exact authority.",
      approvalRationale:
        "The exact promoted pair should leave current trusted authority while every prior revision and dependent record remains retained.",
      explicitConfirmation: true as const,
    };

    const result = await composeProjectHistoryCompensationPlan(input);
    expect(result).toEqual(historyCompensationPlanView);
    expect(result.content.persistence).toEqual({
      change_set: "not_persisted",
      approval: "not_persisted",
      commands: "not_persisted",
    });
    expect(result.content.execution).toMatchObject({
      state: "not_performed",
      requires_separate_request: true,
      authority_recheck: "required_at_each_command",
    });
    const requestBody = fetch.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") {
      throw new Error("Expected a JSON compensation-plan request body.");
    }
    const request = JSON.parse(requestBody) as Record<string, unknown>;
    expect(request).toHaveProperty("preview_ref");
    expect(request).not.toHaveProperty("actor");
    expect(request).not.toHaveProperty("capability_grant_id");
    expect(request).not.toHaveProperty("execute");

    const wrongReason = structuredClone(historyCompensationPlanView);
    wrongReason.content.change_set.content.reason = "another reason";
    fetch.mockResolvedValueOnce(Response.json(wrongReason));
    await expect(
      composeProjectHistoryCompensationPlan(input),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("submits the exact composed plan and preserves per-command execution recovery", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationExecutionView));
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: historyCompensationPlanView.project_id,
      eventId: historyCompensationPlanView.event_id,
      plan: historyCompensationPlanView,
      explicitExecutionConfirmation: true as const,
    };

    const result = await executeProjectHistoryCompensationPlan(input);
    expect(result).toEqual(historyCompensationExecutionView);
    expect(result.content.atomicity).toBe(
      "per_command_transaction_not_three_command_atomic",
    );
    expect(result.content.steps.map(({ state }) => state)).toEqual([
      "retained_success",
      "retained_success",
      "retained_success",
    ]);
    const requestBody = fetch.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") {
      throw new Error("Expected a JSON compensation-execution request body.");
    }
    const request = JSON.parse(requestBody) as {
      plan: PetraProjectHistoryCompensationPlanView;
      execution_confirmation: Record<string, unknown>;
    };
    expect(request.plan).toEqual(historyCompensationPlanView);
    expect(request.execution_confirmation).toEqual({
      confirmed: true,
      acknowledged_atomicity:
        "per_command_transaction_not_three_command_atomic",
    });

    const falseAtomicity = structuredClone(historyCompensationExecutionView);
    (falseAtomicity.content as { atomicity: string }).atomicity =
      "three_command_atomic";
    fetch.mockResolvedValueOnce(Response.json(falseAtomicity));
    await expect(
      executeProjectHistoryCompensationPlan(input),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads retained History pages without interpreting the opaque cursor", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyRetainedView));
    vi.stubGlobal("fetch", fetch);

    const first = await getRetainedProjectHistory(
      historyRetainedView.project_id,
      { limit: 1, filters: historyRetainedView.content.query.filters },
    );

    expect(first).toEqual(historyRetainedView);
    expect(first.content.order_kind).toBe("project_stream_newest_first");
    expect(first.content.recovery_authority).toBe("current_at_page_read");
    expect(first.content.cursor_binding).toBe(
      "project_snapshot_and_complete_query",
    );
    expect(first.content.graph_navigation_history).toBe(
      "client_local_separate",
    );
    expect(first.content.filter_options).toMatchObject({
      authorization_scope: "authenticated_project",
      snapshot_and_query_binding:
        "retention_snapshot_and_complete_normalized_query",
      dimension_semantics: "replace_same_dimension_preserve_other_filters",
      actor_catalogue: {
        total_count: 1,
        coverage: "complete",
      },
      target_catalogue: {
        total_count: 2,
        coverage: "complete",
      },
    });
    expect(
      first.content.filter_options.actor_catalogue.options[0]
        ?.display_descriptor,
    ).toEqual(
      expect.objectContaining({
        state: "available",
        display_name: "Researcher",
      }),
    );
    expect(
      first.content.filter_options.target_catalogue.options.every(
        ({ display_descriptor }) =>
          display_descriptor.state === "exact_identity_only",
      ),
    ).toBe(true);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyRetainedView.project_id}/history/events?limit=1&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`,
    );

    const firstPage = first.content.page;
    if (!firstPage.has_more) throw new Error("Expected an opaque cursor.");
    const continued = structuredClone(historyRetainedView);
    continued.content.query.cursor = firstPage.next_cursor;
    fetch.mockResolvedValueOnce(Response.json(continued));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor: firstPage.next_cursor,
        filters: historyRetainedView.content.query.filters,
      }),
    ).resolves.toEqual(continued);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `/api/queries/projects/${historyRetainedView.project_id}/history/events?limit=1&cursor=${encodeURIComponent(firstPage.next_cursor)}&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`,
    );

    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, { limit: 101 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor:
          "phc1.eyJ2IjoxLCJwcm9qZWN0Ijoib3BhcXVlIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        filters: {
          recorded_at: {
            from_inclusive: "2026-09-11T00:00:00.000Z",
            through_inclusive: "2026-09-10T00:00:00.000Z",
          },
        },
      }),
    ).rejects.toMatchObject({ status: 400 });

    const mismatched = structuredClone(historyRetainedView);
    mismatched.content.query.filters.family = "change_control";
    fetch.mockResolvedValueOnce(Response.json(mismatched));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({ status: 502 });

    const inferredTargetTitle = structuredClone(historyRetainedView);
    (
      inferredTargetTitle.content.filter_options.target_catalogue
        .options[0] as {
        display_descriptor: unknown;
      }
    ).display_descriptor = {
      state: "available",
      title: "A title inferred from a current object",
    };
    fetch.mockResolvedValueOnce(Response.json(inferredTargetTitle));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("preserves only validated retained History continuation failure subcodes", async () => {
    const page = historyRetainedView.content.page;
    if (!page.has_more) throw new Error("Expected an opaque cursor fixture.");
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    for (const subcode of [
      "CURSOR_INVALID",
      "CURSOR_BINDING_MISMATCH",
      "SNAPSHOT_UNAVAILABLE",
    ] as const) {
      const failure = structuredClone(historyContinuationFailure);
      failure.error.subcode = subcode;
      fetch.mockResolvedValueOnce(Response.json(failure, { status: 422 }));
      await expect(
        getRetainedProjectHistory(historyRetainedView.project_id, {
          limit: 1,
          cursor: page.next_cursor,
          filters: historyRetainedView.content.query.filters,
        }),
      ).rejects.toMatchObject({
        name: "ProjectDataError",
        status: 422,
        code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
        subcode,
        message: historyContinuationFailure.error.message,
        restart: historyContinuationFailure.error.restart,
      });
    }

    const disclosingFailure = {
      ...structuredClone(historyContinuationFailure),
      error: {
        ...structuredClone(historyContinuationFailure.error),
        subcode: "PROJECT_MISMATCH",
        message: "The cursor belongs to another exact Project.",
      },
    };
    fetch.mockResolvedValueOnce(
      Response.json(disclosingFailure, { status: 422 }),
    );
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor: page.next_cursor,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({
      name: "ProjectDataError",
      status: 422,
      code: undefined,
      subcode: undefined,
      message: historyContinuationFailure.error.message,
      restart: undefined,
    });
  });

  it("maps one exact ProjectSource authority chain into the frozen source surfaces", () => {
    const before = structuredClone(sourceView);
    const source = sourceRecordFromView(sourceView);

    expect(source.id).toBe("project_source_01K4C000000000000000000007");
    expect(source.title).toBe("A testable account of competing explanations");
    expect(source.creator).toBe("Ada Researcher");
    expect(source.extent).toBe("complete");
    expect(source.rights).toBe("CC-BY-4.0 · verified");
    expect(source.excerpt).toEqual(
      expect.objectContaining({
        heading: "Results / Paragraph 1",
        locator: "Page 1 · Results / Paragraph 1",
        text: "The study reports a measurable improvement.",
      }),
    );
    expect(sourceView).toEqual(before);
  });

  it("sends only exact lifecycle command input and verifies the resulting authority", async () => {
    const resultingSource: PetraProjectSource = {
      ...structuredClone(sourceRecord),
      revision: sourceLifecycleReceipt.content.resulting_source_ref.revision,
      content: {
        ...structuredClone(sourceRecord.content),
        status: sourceLifecycleReceipt.content.resulting_source_ref.status,
      },
      content_hash:
        sourceLifecycleReceipt.content.resulting_source_ref.content_hash,
      added_at: sourceLifecycleReceipt.recorded_at,
    };
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt: sourceLifecycleReceipt,
          project_source: resultingSource,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceLifecycleReceipt.project_id,
      projectSourceId: sourceRecord.project_source_id,
      commandId: sourceLifecycleReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceLifecycleReceipt.content.command_ref.idempotency_key,
      requestedAction: "exclude_project_source" as const,
      expectedSourceRef: sourceLifecycleReceipt.content.prior_source_ref,
      reason: "Exclude ordinary new use while retaining exact history.",
    };

    await expect(executeProjectSourceLifecycleCommand(input)).resolves.toEqual({
      receipt: sourceLifecycleReceipt,
      projectSource: resultingSource,
      applied: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/sources/${input.projectSourceId}/lifecycle`,
    );
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    const sent = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(sent).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      requested_action: input.requestedAction,
      expected_source_ref: input.expectedSourceRef,
      reason: input.reason,
    });
    expect(sent).not.toHaveProperty("actor");
    expect(sent).not.toHaveProperty("capability_grant_id");
    expect(sent).not.toHaveProperty("project_id");
    expect(sent).not.toHaveProperty("submitted_at");
  });

  it("rejects ineligible source state and mismatched lifecycle authority", async () => {
    const fetch = vi.fn(() => {
      const mismatchedReceipt = structuredClone(sourceLifecycleReceipt);
      mismatchedReceipt.content.prior_source_ref.revision += 1;
      return Promise.resolve(
        Response.json({
          receipt: mismatchedReceipt,
          project_source: sourceRecord,
          applied: false,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const base = {
      projectId: sourceLifecycleReceipt.project_id,
      projectSourceId: sourceRecord.project_source_id,
      commandId: sourceLifecycleReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceLifecycleReceipt.content.command_ref.idempotency_key,
      requestedAction: "exclude_project_source" as const,
      expectedSourceRef: sourceLifecycleReceipt.content.prior_source_ref,
      reason: "Exclude ordinary new use while retaining exact history.",
    };

    await expect(
      executeProjectSourceLifecycleCommand({
        ...base,
        expectedSourceRef: {
          ...base.expectedSourceRef,
          status: "excluded",
        },
      }),
    ).rejects.toThrow("exact eligible state");
    expect(fetch).not.toHaveBeenCalled();

    await expect(executeProjectSourceLifecycleCommand(base)).rejects.toThrow(
      "invalid Project source lifecycle command result",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("sends one exact ReviewSession defer command without client-carried authority", async () => {
    const resultingSession: PetraReviewSessionV110 = {
      ...structuredClone(reviewSessionRecord),
      revision: reviewSessionRecord.revision + 1,
      content: {
        ...structuredClone(reviewSessionRecord.content),
        lifecycle: "deferred",
      },
      content_hash: `sha256:${"1".repeat(64)}`,
      updated_at: "2026-09-12T19:00:00.000Z",
    };
    const resultingRef = {
      review_session_id: reviewSessionRecord.review_session_id,
      revision: resultingSession.revision,
      content_hash: resultingSession.content_hash,
      record_hash: `sha256:${"2".repeat(64)}`,
      lifecycle: "deferred" as const,
    };
    const receipt = {
      schema_name: "petra.review-session-lifecycle-receipt",
      schema_version: "1.0.0",
      review_session_lifecycle_receipt_id:
        "review_session_lifecycle_receipt_01K4D000000000000000000060",
      revision: 1,
      project_id: reviewSessionRecord.project_id,
      content: {
        command_ref: {
          command_id: "command_01K4D000000000000000000061",
          idempotency_key: "review-session:001:defer:client:v1",
          command_name: "DeferReviewSession",
          command_fingerprint: `sha256:${"3".repeat(64)}`,
          actor: structuredClone(reviewSessionRecord.created_by),
          capability_grant_id: "capability_grant_01K4D000000000000000000062",
          correlation_id: "trace_01K4D000000000000000000063",
        },
        prior_review_session_ref: {
          review_session_id: reviewSessionRecord.review_session_id,
          revision: reviewSessionRecord.revision,
          content_hash: reviewSessionRecord.content_hash,
          record_hash: `sha256:${"4".repeat(64)}`,
          lifecycle: "open",
        },
        resulting_review_session_ref: resultingRef,
        transition: "deferred",
        rationale: "Wait for the author to check the limitation.",
        preservation: {
          review_history: "retained",
          working_candidates: "retained",
          working_relationships: "retained",
          change_sets: "retained",
          approvals: "retained",
          command_events: "retained_unchanged",
          projection_receipts: "retained_unchanged",
        },
        authority_boundary: {
          review_decision: "none",
          domain_authority: "unchanged",
          change_set_authority: "none",
          validation_authority: "none",
          domain_event_effect: "none",
          projection_effect: "none",
        },
        recovery: {
          state: "available",
          inverse_command_name: "ReopenReviewSession",
          expected_review_session_ref: resultingRef,
        },
      },
      content_hash: `sha256:${"5".repeat(64)}`,
      recorded_at: resultingSession.updated_at,
    } as const satisfies PetraReviewSessionLifecycleReceipt;
    const fetch = vi.fn(
      (requestInput: RequestInfo | URL, init?: RequestInit) => {
        void requestInput;
        void init;
        return Promise.resolve(
          Response.json({
            receipt,
            review_session: resultingSession,
            applied: true,
          }),
        );
      },
    );
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: reviewSessionRecord.project_id,
      reviewSessionId: reviewSessionRecord.review_session_id,
      commandId: receipt.content.command_ref.command_id,
      idempotencyKey: receipt.content.command_ref.idempotency_key,
      requestedAction: "defer" as const,
      expectedReviewSessionRef: {
        review_session_id: reviewSessionRecord.review_session_id,
        revision: reviewSessionRecord.revision,
        content_hash: reviewSessionRecord.content_hash,
        lifecycle: "open" as const,
      },
      rationale: receipt.content.rationale,
    };

    await expect(executeReviewSessionLifecycleCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: resultingSession,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/reviews/${input.reviewSessionId}/lifecycle`,
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    const sent = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(sent).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      requested_action: input.requestedAction,
      expected_review_session_ref: input.expectedReviewSessionRef,
      rationale: input.rationale,
    });
    expect(sent).not.toHaveProperty("actor");
    expect(sent).not.toHaveProperty("capability_grant_id");
    expect(sent).not.toHaveProperty("project_id");

    fetch.mockResolvedValueOnce(
      Response.json({
        receipt,
        review_session: resultingSession,
        applied: false,
      }),
    );
    await expect(executeReviewSessionLifecycleCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: resultingSession,
      applied: false,
    });
    const retryBody = fetch.mock.calls[1]?.[1]?.body;
    expect(retryBody).toBe(requestInit.body);

    const corruptedReceipt = structuredClone(receipt) as unknown as {
      content: { authority_boundary: { domain_authority: string } };
    };
    corruptedReceipt.content.authority_boundary.domain_authority = "changed";
    fetch.mockResolvedValueOnce(
      Response.json({
        receipt: corruptedReceipt,
        review_session: resultingSession,
        applied: true,
      }),
    );
    await expect(executeReviewSessionLifecycleCommand(input)).rejects.toThrow(
      "invalid ReviewSession lifecycle command result",
    );
  });

  it("sends and reconciles one exact ReviewSession reopen command without client-carried authority", async () => {
    const deferredSession: PetraReviewSessionV110 = {
      ...structuredClone(reviewSessionRecord),
      revision: reviewSessionRecord.revision + 1,
      content: {
        ...structuredClone(reviewSessionRecord.content),
        lifecycle: "deferred",
      },
      content_hash: `sha256:${"6".repeat(64)}`,
      updated_at: "2026-09-12T19:05:00.000Z",
    };
    const reopenedSession: PetraReviewSessionV110 = {
      ...structuredClone(deferredSession),
      revision: deferredSession.revision + 1,
      content: {
        ...structuredClone(deferredSession.content),
        lifecycle: "open",
      },
      content_hash: `sha256:${"7".repeat(64)}`,
      updated_at: "2026-09-12T19:06:00.000Z",
    };
    const resultingRef = {
      review_session_id: reopenedSession.review_session_id,
      revision: reopenedSession.revision,
      content_hash: reopenedSession.content_hash,
      record_hash: `sha256:${"8".repeat(64)}`,
      lifecycle: "open" as const,
    };
    const receipt = {
      schema_name: "petra.review-session-lifecycle-receipt",
      schema_version: "1.0.0",
      review_session_lifecycle_receipt_id:
        "review_session_lifecycle_receipt_01K4D000000000000000000066",
      revision: 1,
      project_id: deferredSession.project_id,
      content: {
        command_ref: {
          command_id: "command_01K4D000000000000000000067",
          idempotency_key: "review-session:001:reopen:client:v1",
          command_name: "ReopenReviewSession",
          command_fingerprint: `sha256:${"9".repeat(64)}`,
          actor: structuredClone(deferredSession.created_by),
          capability_grant_id: "capability_grant_01K4D000000000000000000068",
          correlation_id: "trace_01K4D000000000000000000069",
        },
        prior_review_session_ref: {
          review_session_id: deferredSession.review_session_id,
          revision: deferredSession.revision,
          content_hash: deferredSession.content_hash,
          record_hash: `sha256:${"a".repeat(64)}`,
          lifecycle: "deferred",
        },
        resulting_review_session_ref: resultingRef,
        transition: "reopened",
        rationale: "Return the retained Review to open coordination.",
        preservation: {
          review_history: "retained",
          working_candidates: "retained",
          working_relationships: "retained",
          change_sets: "retained",
          approvals: "retained",
          command_events: "retained_unchanged",
          projection_receipts: "retained_unchanged",
        },
        authority_boundary: {
          review_decision: "none",
          domain_authority: "unchanged",
          change_set_authority: "none",
          validation_authority: "none",
          domain_event_effect: "none",
          projection_effect: "none",
        },
        recovery: {
          state: "available",
          inverse_command_name: "DeferReviewSession",
          expected_review_session_ref: resultingRef,
        },
      },
      content_hash: `sha256:${"b".repeat(64)}`,
      recorded_at: reopenedSession.updated_at,
    } as const satisfies PetraReviewSessionLifecycleReceipt;
    const fetch = vi.fn(
      (requestInput: RequestInfo | URL, init?: RequestInit) => {
        void requestInput;
        void init;
        return Promise.resolve(
          Response.json({
            receipt,
            review_session: reopenedSession,
            applied: true,
          }),
        );
      },
    );
    vi.stubGlobal("fetch", fetch);
    const review = {
      ...reviewSessionFromView(reviewView),
      id: deferredSession.review_session_id,
      projectId: deferredSession.project_id,
      exactRef: {
        revision: deferredSession.revision,
        contentHash: deferredSession.content_hash,
      },
      lifecycle: "deferred" as const,
    };
    const input = createReviewSessionReopenCommandInput(review, {
      commandId: receipt.content.command_ref.command_id,
      idempotencyKey: receipt.content.command_ref.idempotency_key,
      rationale: receipt.content.rationale,
    });

    await expect(executeReviewSessionLifecycleCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: reopenedSession,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/reviews/${input.reviewSessionId}/lifecycle`,
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    expect(JSON.parse(requestInit.body)).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      requested_action: "reopen",
      expected_review_session_ref: {
        review_session_id: deferredSession.review_session_id,
        revision: deferredSession.revision,
        content_hash: deferredSession.content_hash,
        lifecycle: "deferred",
      },
      rationale: input.rationale,
    });
    expect(JSON.parse(requestInit.body)).not.toHaveProperty("actor");
    expect(JSON.parse(requestInit.body)).not.toHaveProperty(
      "capability_grant_id",
    );

    fetch.mockResolvedValueOnce(
      Response.json({
        receipt,
        review_session: reopenedSession,
        applied: false,
      }),
    );
    await expect(executeReviewSessionLifecycleCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: reopenedSession,
      applied: false,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(requestInit.body);
  });

  it("sends and validates one exact ReviewSession refresh without client-selected authority", async () => {
    const refreshedSession: PetraReviewSessionV110 = {
      ...structuredClone(reviewSessionRecord),
      revision: reviewSessionRecord.revision + 1,
      content: {
        ...structuredClone(reviewSessionRecord.content),
        snapshot: {
          event_position:
            reviewSessionRecord.content.snapshot.event_position + 1,
          stream_revision:
            reviewSessionRecord.content.snapshot.stream_revision + 1,
          captured_at: "2026-09-12T20:00:00.000Z",
        },
      },
      content_hash: `sha256:${"c".repeat(64)}`,
      updated_at: "2026-09-12T20:00:00.000Z",
    };
    const input = createReviewSessionRefreshCommandInput(
      {
        ...reviewSessionFromView(reviewView),
        id: reviewSessionRecord.review_session_id,
        projectId: reviewSessionRecord.project_id,
        exactRef: {
          revision: reviewSessionRecord.revision,
          contentHash: reviewSessionRecord.content_hash,
        },
        lifecycle: "open",
        snapshotState: "stale",
      },
      {
        commandId: "command_01K4D000000000000000000073",
        idempotencyKey: "review-session:001:refresh:client:v1",
      },
    );
    const resultingRef = {
      review_session_id: refreshedSession.review_session_id,
      revision: refreshedSession.revision,
      content_hash: refreshedSession.content_hash,
      record_hash: `sha256:${"d".repeat(64)}`,
      lifecycle: "open" as const,
    };
    const receipt = {
      schema_name: "petra.review-session-refresh-receipt",
      schema_version: "1.0.0",
      review_session_refresh_receipt_id:
        "review_session_refresh_receipt_01K4D000000000000000000074",
      revision: 1,
      project_id: refreshedSession.project_id,
      content: {
        command_ref: {
          command_id: input.commandId,
          idempotency_key: input.idempotencyKey,
          command_name: "RefreshReviewSession",
          command_fingerprint: `sha256:${"e".repeat(64)}`,
          actor: structuredClone(refreshedSession.created_by),
          capability_grant_id: "capability_grant_01K4D000000000000000000075",
          correlation_id: "trace_01K4D000000000000000000076",
        },
        prior_review_session_ref: {
          ...input.expectedReviewSessionRef,
          record_hash: `sha256:${"f".repeat(64)}`,
        },
        resulting_review_session_ref: resultingRef,
        transition: "refreshed",
        refresh_basis: {
          selection_basis: "same_review_members_current_working_heads",
          prior_snapshot: structuredClone(reviewSessionRecord.content.snapshot),
          resulting_snapshot: structuredClone(
            refreshedSession.content.snapshot,
          ),
          members: refreshedSession.content.members.map((member) => ({
            review_member_id: member.review_member_id,
            candidate_ref: structuredClone(member.working_state.candidate_ref),
            relationship_refs: structuredClone(
              member.working_state.relationship_refs,
            ),
          })) as PetraReviewSessionRefreshReceipt["content"]["refresh_basis"]["members"],
        },
        preservation: {
          stale_review_revision: "retained",
          review_members: "retained_same_identity",
          working_candidates: "retained",
          working_relationships: "retained",
          validation_records: "retained_unchanged",
          change_sets: "retained_unchanged",
          approvals: "retained_unchanged",
          command_events: "retained_unchanged",
          projection_receipts: "retained_unchanged",
        },
        authority_boundary: {
          review_decision: "none",
          domain_authority: "unchanged",
          candidate_authority: "none",
          validation_authority: "none",
          change_set_authority: "none",
          approval_authority: "none",
          domain_event_effect: "none",
          projection_effect: "none",
        },
      },
      content_hash: `sha256:${"1".repeat(64)}`,
      recorded_at: refreshedSession.updated_at,
    } as const satisfies PetraReviewSessionRefreshReceipt;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          receipt,
          review_session: refreshedSession,
          applied: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          receipt,
          review_session: refreshedSession,
          applied: false,
        }),
      );
    vi.stubGlobal("fetch", fetch);

    await expect(executeReviewSessionRefreshCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: refreshedSession,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/reviews/${input.reviewSessionId}/refresh`,
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    expect(JSON.parse(requestInit.body)).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      expected_review_session_ref: {
        review_session_id: reviewSessionRecord.review_session_id,
        revision: reviewSessionRecord.revision,
        content_hash: reviewSessionRecord.content_hash,
        lifecycle: "open",
      },
    });
    expect(JSON.parse(requestInit.body)).not.toHaveProperty("actor");
    expect(JSON.parse(requestInit.body)).not.toHaveProperty(
      "capability_grant_id",
    );
    expect(JSON.parse(requestInit.body)).not.toHaveProperty("members");

    await expect(executeReviewSessionRefreshCommand(input)).resolves.toEqual({
      receipt,
      reviewSession: refreshedSession,
      applied: false,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(requestInit.body);

    const changedAuthority = structuredClone(receipt) as unknown as {
      content: { authority_boundary: { candidate_authority: string } };
    };
    changedAuthority.content.authority_boundary.candidate_authority = "changed";
    fetch.mockResolvedValueOnce(
      Response.json({
        receipt: changedAuthority,
        review_session: refreshedSession,
        applied: true,
      }),
    );
    await expect(executeReviewSessionRefreshCommand(input)).rejects.toThrow(
      "invalid ReviewSession refresh command result",
    );
  });

  it("rejects a ReviewSession lifecycle direction mismatch before transport", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    await expect(
      executeReviewSessionLifecycleCommand({
        projectId: reviewSessionRecord.project_id,
        reviewSessionId: reviewSessionRecord.review_session_id,
        commandId: "command_01K4D000000000000000000064",
        idempotencyKey: "review-session:001:defer:invalid:v1",
        requestedAction: "defer",
        expectedReviewSessionRef: {
          review_session_id: "review_session_01K4D000000000000000000099",
          revision: reviewSessionRecord.revision,
          content_hash: reviewSessionRecord.content_hash,
          lifecycle: "open",
        },
      }),
    ).rejects.toThrow("route session's exact eligible state");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends exact replacement creation input without client-selected authority", async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt: sourceReplacementCreatedReceipt,
          replacement: sourceReplacement,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceReplacement.project_id,
      commandId: sourceReplacementCreatedReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceReplacementCreatedReceipt.content.command_ref.idempotency_key,
      replacementKind: sourceReplacement.content.replacement_kind,
      replacedSourceRef: sourceReplacement.content.replaced_source_ref,
      replacementSourceRef: sourceReplacement.content.replacement_source_ref,
      exclusionReceiptRef: sourceReplacement.content.exclusion_receipt_ref,
      rationale: sourceReplacement.content.rationale,
    };

    await expect(createProjectSourceReplacement(input)).resolves.toEqual({
      receipt: sourceReplacementCreatedReceipt,
      replacement: sourceReplacement,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/source-replacements`,
    );
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    const sent = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(sent).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      replacement_kind: input.replacementKind,
      replaced_source_ref: input.replacedSourceRef,
      replacement_source_ref: input.replacementSourceRef,
      exclusion_receipt_ref: input.exclusionReceiptRef,
      rationale: input.rationale,
    });
    expect(sent).not.toHaveProperty("actor");
    expect(sent).not.toHaveProperty("capability_grant_id");
    expect(sent).not.toHaveProperty("project_id");
    expect(sent).not.toHaveProperty("submitted_at");
  });

  it("sends exact replacement retraction input and verifies relation-only recovery", async () => {
    const receipt = structuredClone(sourceReplacementRetractedReceipt);
    if (receipt.content.result.effect !== "replacement_retracted") {
      throw new Error("Expected replacement retraction receipt.");
    }
    receipt.content.result.replacement_ref.record_hash =
      sourceReplacementRetraction.content.replacement_ref.record_hash;
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt,
          replacement: sourceReplacement,
          retraction: sourceReplacementRetraction,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceReplacement.project_id,
      projectSourceReplacementId:
        sourceReplacement.project_source_replacement_id,
      commandId: receipt.content.command_ref.command_id,
      idempotencyKey: receipt.content.command_ref.idempotency_key,
      expectedReplacementRef: {
        ...sourceReplacementRetraction.content.replacement_ref,
        state: "active" as const,
      },
      reason: sourceReplacementRetraction.content.reason,
    };

    await expect(retractProjectSourceReplacement(input)).resolves.toEqual({
      receipt,
      replacement: sourceReplacement,
      retraction: sourceReplacementRetraction,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/source-replacements/${input.projectSourceReplacementId}/retraction`,
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    expect(JSON.parse(requestInit.body)).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      expected_replacement_ref: input.expectedReplacementRef,
      reason: input.reason,
    });
    expect(receipt.content.recovery).toEqual({
      recovery_kind: "separate_source_status_transition",
      source_status: "unchanged",
      separate_command_name: "RestoreProjectSource",
      effect: "relationship_inactive_predecessor_not_restored",
    });

    await expect(
      retractProjectSourceReplacement({
        ...input,
        projectSourceReplacementId:
          "project_source_replacement_01K4C000000000000000000099",
      }),
    ).rejects.toThrow("route relation's exact active state");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps one exact Review-session composition without treating validation as approval", () => {
    const before = structuredClone(reviewView);
    const review = reviewSessionFromView(reviewView);

    expect(review.id).toBe("review_session_01K4D000000000000000000001");
    expect(review.status).toBe("needs_decision");
    expect(review.snapshotState).toBe(
      reviewView.content.session.snapshot_state,
    );
    expect(review.exactRef).toEqual({
      revision: reviewView.content.session.revision,
      contentHash: reviewView.content.session.content_hash,
    });
    expect(review.returnPath).toBe(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007",
    );
    expect(review.candidate.proposed).toBe(
      "The study reports a measurable improvement.",
    );
    expect(review.validation).toEqual(
      expect.objectContaining({
        state: "passed",
        label: "Applicable checks passed",
      }),
    );
    expect(review.changeSet).toEqual(
      expect.objectContaining({
        id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
      }),
    );
    expect(review.changeSet?.changes.join(" ")).toContain(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
    );
    expect(review.basis[0]?.sourceId).toBe(
      "project_source_01K4C000000000000000000007",
    );
    expect(
      createReviewSessionDeferCommandInput(review, {
        commandId: "command_01K4D000000000000000000061",
        idempotencyKey: "review-session:001:defer:client:v1",
        rationale: "Wait for an exact source check.",
      }),
    ).toEqual({
      projectId: review.projectId,
      reviewSessionId: review.id,
      commandId: "command_01K4D000000000000000000061",
      idempotencyKey: "review-session:001:defer:client:v1",
      requestedAction: "defer",
      expectedReviewSessionRef: {
        review_session_id: review.id,
        revision: review.exactRef.revision,
        content_hash: review.exactRef.contentHash,
        lifecycle: "open",
      },
      rationale: "Wait for an exact source check.",
    });
    expect(reviewView).toEqual(before);
  });

  it("maps the additive working Review composition without changing the frozen Review model", () => {
    const workingView = structuredClone(
      reviewView,
    ) as unknown as PetraProjectReviewViewV110;
    workingView.schema_version = "1.1.0";
    workingView.content.members[0].working_state = {
      candidate: structuredClone(reviewWorkingCandidate),
      relationships: [structuredClone(reviewWorkingRelationship)],
      selection_basis: "exact_review_session_working_bindings",
      authority_effect: "none",
    };
    workingView.content.members[0].change_sets =
      workingView.content.members[0].change_sets.map((changeSet) => ({
        ...changeSet,
        commands: [],
        events: [],
      }));
    workingView.content.projection = {
      state: "unavailable",
      reason: "No projection receipt exists for the submitted ChangeSet.",
    };

    expect(reviewSessionFromView(workingView)).toEqual(
      reviewSessionFromView(reviewView),
    );
    expect(workingView.content.members[0].working_state.authority_effect).toBe(
      "none",
    );
  });

  it("maps every exact Review member and delegates only compact separation input", async () => {
    const multiView = structuredClone(
      reviewView,
    ) as unknown as PetraProjectReviewViewV120;
    multiView.schema_version = "1.2.0";
    multiView.content.session.lifecycle = "open";
    const first = multiView.content.members[0];
    if (first === undefined) throw new Error("Expected a Review member.");
    first.working_state = {
      candidate: structuredClone(reviewWorkingCandidate),
      relationships: [structuredClone(reviewWorkingRelationship)],
      selection_basis: "exact_review_session_working_bindings",
      authority_effect: "none",
    };
    first.change_sets = first.change_sets.map((changeSet) => ({
      ...changeSet,
      commands: [],
      events: [],
    }));
    const second = structuredClone(first);
    second.review_member_id = "review_member_01K4F000000000000000000501";
    second.member_role = "exception";
    second.candidate.candidate_id = "claim_01K4F000000000000000000502";
    second.candidate.proposed =
      "A second exact Claim remains independently inspectable.";
    second.working_state.candidate.working_candidate_id =
      "working_candidate_01K4F000000000000000000503";
    second.working_state.relationships[0].working_relationship_id =
      "working_relationship_01K4F000000000000000000504";
    multiView.content.members = [first, second];
    multiView.content.projection = {
      state: "unavailable",
      reason: "No projection receipt exists for this Review.",
    };

    const review = reviewSessionFromView(multiView);
    expect(review.members).toHaveLength(2);
    expect(review.members?.map((member) => member.reviewMemberId)).toEqual([
      first.review_member_id,
      second.review_member_id,
    ]);
    expect(review.members?.[1]?.candidate.proposed).toBe(
      second.candidate.proposed,
    );
    const input = createReviewSessionSeparationCommandInput(
      review,
      second.review_member_id,
      {
        commandId: "command_01K4F000000000000000000505",
        idempotencyKey: "review-session:001:separation:workbench:v1",
      },
    );
    expect(input).toEqual({
      projectId: review.projectId,
      reviewSessionId: review.id,
      request: {
        command_id: "command_01K4F000000000000000000505",
        idempotency_key: "review-session:001:separation:workbench:v1",
        expected_review_session_ref: {
          review_session_id: review.id,
          revision: review.exactRef.revision,
          content_hash: review.exactRef.contentHash,
          lifecycle: "open",
        },
        review_member_id: second.review_member_id,
      },
    });
    expect(input.request).not.toHaveProperty("actor");
    expect(input.request).not.toHaveProperty("capability_grant_id");
    expect(input.request).not.toHaveProperty("destination_review_session_id");
    expect(input.request).not.toHaveProperty("validation");
    expect(input.request).not.toHaveProperty("approval");

    const result = {} as ReviewSessionSeparationResult;
    const separate = vi.fn().mockResolvedValueOnce(result);
    await expect(
      executeReviewSessionSeparationCommand(input, { separate }),
    ).resolves.toBe(result);
    expect(separate).toHaveBeenCalledExactlyOnceWith(
      input.projectId,
      input.request,
    );
    expect(() =>
      createReviewSessionSeparationCommandInput(
        review,
        "review_member_01K4F000000000000000000599",
      ),
    ).toThrow("one exact member");
    expect(() =>
      createReviewSessionSeparationCommandInput(
        { ...review, members: [review.members![0]!] },
        first.review_member_id,
      ),
    ).toThrow("open multi-member ReviewSession");
  });

  it("maps and validates the exact ReviewSession lifecycle read independently of Waiting", async () => {
    const lifecycleView = structuredClone(
      reviewView,
    ) as unknown as PetraProjectReviewViewV120;
    lifecycleView.schema_version = "1.2.0";
    lifecycleView.content.session.lifecycle = "deferred";
    lifecycleView.content.session.status = "waiting";
    lifecycleView.content.session.status_label = "Waiting";
    lifecycleView.content.members[0].working_state = {
      candidate: structuredClone(reviewWorkingCandidate),
      relationships: [structuredClone(reviewWorkingRelationship)],
      selection_basis: "exact_review_session_working_bindings",
      authority_effect: "none",
    };
    lifecycleView.content.members[0].change_sets =
      lifecycleView.content.members[0].change_sets.map((changeSet) => ({
        ...changeSet,
        commands: [],
        events: [],
      }));
    lifecycleView.content.projection = {
      state: "unavailable",
      reason: "No projection receipt exists for the submitted ChangeSet.",
    };

    const deferredReview = reviewSessionFromView(lifecycleView);
    expect(deferredReview).toMatchObject({
      id: lifecycleView.review_session_id,
      status: "waiting",
      lifecycle: "deferred",
    });
    expect(
      createReviewSessionReopenCommandInput(deferredReview, {
        commandId: "command_01K4D000000000000000000065",
        idempotencyKey: "review-session:001:reopen:client:v1",
      }),
    ).toEqual({
      projectId: deferredReview.projectId,
      reviewSessionId: deferredReview.id,
      commandId: "command_01K4D000000000000000000065",
      idempotencyKey: "review-session:001:reopen:client:v1",
      requestedAction: "reopen",
      expectedReviewSessionRef: {
        review_session_id: deferredReview.id,
        revision: deferredReview.exactRef.revision,
        content_hash: deferredReview.exactRef.contentHash,
        lifecycle: "deferred",
      },
    });
    const aggregateWaitingView = structuredClone(lifecycleView);
    aggregateWaitingView.content.session.lifecycle = "open";
    aggregateWaitingView.content.session.snapshot_state = "stale";
    const aggregateWaitingReview = reviewSessionFromView(aggregateWaitingView);
    expect(aggregateWaitingReview).toMatchObject({
      status: "waiting",
      lifecycle: "open",
      snapshotState: "stale",
      candidateCorrection: {
        reviewMemberId:
          aggregateWaitingView.content.members[0].review_member_id,
        expectedWorkingCandidateRef: {
          working_candidate_id: reviewWorkingCandidate.working_candidate_id,
          revision: reviewWorkingCandidate.revision,
          content_hash: reviewWorkingCandidate.content_hash,
        },
        expectedWorkingRelationshipRef: {
          working_relationship_id:
            reviewWorkingRelationship.working_relationship_id,
          revision: reviewWorkingRelationship.revision,
          content_hash: reviewWorkingRelationship.content_hash,
        },
      },
    });
    expect(
      createReviewSessionRefreshCommandInput(aggregateWaitingReview, {
        commandId: "command_01K4D000000000000000000077",
        idempotencyKey: "review-session:001:refresh:client:v2",
      }),
    ).toEqual({
      projectId: aggregateWaitingReview.projectId,
      reviewSessionId: aggregateWaitingReview.id,
      commandId: "command_01K4D000000000000000000077",
      idempotencyKey: "review-session:001:refresh:client:v2",
      expectedReviewSessionRef: {
        review_session_id: aggregateWaitingReview.id,
        revision: aggregateWaitingReview.exactRef.revision,
        content_hash: aggregateWaitingReview.exactRef.contentHash,
        lifecycle: "open",
      },
    });
    expect(() =>
      createReviewSessionReopenCommandInput(aggregateWaitingReview),
    ).toThrow("requires an exact deferred lifecycle");
    expect(() =>
      createReviewSessionRefreshCommandInput(deferredReview),
    ).toThrow("requires an exact open lifecycle");

    const correctionInput = createReviewCandidateCorrectionCommandInput(
      aggregateWaitingReview,
      "The study reports a bounded measurable improvement.",
      {
        commandId: "command_01K4D000000000000000000081",
        idempotencyKey: "review-session:001:correction:workbench:v1",
      },
    );
    expect(correctionInput).toEqual({
      projectId: aggregateWaitingReview.projectId,
      reviewSessionId: aggregateWaitingReview.id,
      request: {
        command_id: "command_01K4D000000000000000000081",
        idempotency_key: "review-session:001:correction:workbench:v1",
        expected_review_session_ref: {
          review_session_id: aggregateWaitingReview.id,
          revision: aggregateWaitingReview.exactRef.revision,
          content_hash: aggregateWaitingReview.exactRef.contentHash,
          lifecycle: "open",
        },
        review_member_id:
          aggregateWaitingView.content.members[0].review_member_id,
        expected_working_candidate_ref: {
          working_candidate_id: reviewWorkingCandidate.working_candidate_id,
          revision: reviewWorkingCandidate.revision,
          content_hash: reviewWorkingCandidate.content_hash,
        },
        expected_working_relationship_ref: {
          working_relationship_id:
            reviewWorkingRelationship.working_relationship_id,
          revision: reviewWorkingRelationship.revision,
          content_hash: reviewWorkingRelationship.content_hash,
        },
        correction_input: {
          input_kind: "human_scientific_claim_text_edit",
          canonical_text: "The study reports a bounded measurable improvement.",
        },
      },
    });
    expect(correctionInput.request).not.toHaveProperty("corrected_candidate");
    expect(correctionInput.request).not.toHaveProperty(
      "corrected_profile_record",
    );
    const correctionResult = {} as ReviewCandidateCorrectionResult;
    const correctFromHumanEdit = vi
      .fn()
      .mockResolvedValueOnce(correctionResult);
    await expect(
      executeReviewCandidateCorrectionCommand(correctionInput, {
        correctFromHumanEdit,
      }),
    ).resolves.toBe(correctionResult);
    expect(correctFromHumanEdit).toHaveBeenCalledExactlyOnceWith(
      correctionInput.projectId,
      correctionInput.request,
    );
    expect(() =>
      createReviewCandidateCorrectionCommandInput(
        aggregateWaitingReview,
        aggregateWaitingReview.candidate.proposed,
      ),
    ).toThrow("requires changed Claim text");
    expect(() =>
      createReviewCandidateCorrectionCommandInput(
        deferredReview,
        "A changed Claim that must not bypass deferred lifecycle.",
      ),
    ).toThrow(
      "requires exact scientific working references and an open lifecycle",
    );

    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(lifecycleView))
      .mockResolvedValueOnce(
        Response.json({
          ...structuredClone(lifecycleView),
          content: {
            ...structuredClone(lifecycleView.content),
            session: {
              ...structuredClone(lifecycleView.content.session),
              lifecycle: "eligible_to_reopen",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.local/projects/${lifecycleView.project_id}/reviews/${lifecycleView.review_session_id}`,
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/reviews/:reviewId",
      params: {
        projectId: lifecycleView.project_id,
        reviewId: lifecycleView.review_session_id,
      },
      context: new RouterContextProvider(),
    };

    await expect(loadProjectReviewSession(args)).resolves.toMatchObject({
      lifecycle: "deferred",
    });
    await expect(loadProjectReviewSession(args)).rejects.toThrow(
      "invalid Project Review view",
    );
  });

  it("prepares and delegates one exact material basis revision without client authority", async () => {
    const openView = structuredClone(
      reviewView,
    ) as unknown as PetraProjectReviewViewV120;
    openView.schema_version = "1.2.0";
    openView.content.session.lifecycle = "open";
    openView.content.members[0].working_state = {
      candidate: structuredClone(reviewWorkingCandidate),
      relationships: [structuredClone(reviewWorkingRelationship)],
      selection_basis: "exact_review_session_working_bindings",
      authority_effect: "none",
    };
    openView.content.members[0].change_sets =
      openView.content.members[0].change_sets.map((changeSet) => ({
        ...changeSet,
        commands: [],
        events: [],
      }));
    openView.content.projection = {
      state: "unavailable",
      reason: "No projection receipt exists for the submitted ChangeSet.",
    };
    const reviewWithoutExactSource = reviewSessionFromView(openView);
    expect(
      reviewWithoutExactSource.candidateBasisRevision?.expectedProjectSourceRef,
    ).toBeUndefined();
    expect(() =>
      createReviewCandidateBasisRevisionCommandInput(reviewWithoutExactSource, {
        sourceScope: "full_text",
        detailLevel: "broad",
        sourceStance: "qualifies",
        attribution: "The study authors",
        modality: "hedged",
        negated: false,
        reason: "Retain the material qualification.",
      }),
    ).toThrow("requires exact scientific Review");
    const exactSourceView = structuredClone(sourceLifecycleView);
    exactSourceView.project_id = openView.project_id;
    exactSourceView.project_source_id =
      openView.content.members[0].basis[0].project_source_id ?? "";
    exactSourceView.content.source_ref.project_source_id =
      exactSourceView.project_source_id;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(openView))
      .mockResolvedValueOnce(Response.json(exactSourceView));
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.local/projects/${openView.project_id}/reviews/${openView.review_session_id}`,
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/reviews/:reviewId",
      params: {
        projectId: openView.project_id,
        reviewId: openView.review_session_id,
      },
      context: new RouterContextProvider(),
    };

    const review = await loadProjectReviewSession(args);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `/api/queries/projects/${openView.project_id}/sources/${exactSourceView.project_source_id}/lifecycle?requested_action=exclude_project_source`,
    );
    expect(review.candidateBasisRevision).toMatchObject({
      reviewMemberId: openView.content.members[0].review_member_id,
      expectedProjectDefinitionRef:
        reviewWorkingCandidate.project_definition_ref,
      expectedWorkingCandidateRef: {
        working_candidate_id: reviewWorkingCandidate.working_candidate_id,
        revision: reviewWorkingCandidate.revision,
        content_hash: reviewWorkingCandidate.content_hash,
      },
      expectedWorkingRelationshipRef: {
        working_relationship_id:
          reviewWorkingRelationship.working_relationship_id,
        revision: reviewWorkingRelationship.revision,
        content_hash: reviewWorkingRelationship.content_hash,
      },
      expectedProjectSourceRef: exactSourceView.content.source_ref,
    });

    const input = createReviewCandidateBasisRevisionCommandInput(
      review,
      {
        sourceScope: "full_text",
        detailLevel: "broad",
        sourceStance: "qualifies",
        attribution: " The study authors ",
        modality: "hedged",
        negated: false,
        uncertainty: " The exact passage qualifies the result. ",
        reason: " Retain the material qualification in the source basis. ",
      },
      {
        commandId: "command_01K4E000000000000000000301",
        idempotencyKey: "review-session:001:basis:workbench:v1",
      },
    );
    expect(input.request).toEqual({
      command_id: "command_01K4E000000000000000000301",
      idempotency_key: "review-session:001:basis:workbench:v1",
      expected_review_session_ref: {
        review_session_id: review.id,
        revision: review.exactRef.revision,
        content_hash: review.exactRef.contentHash,
        lifecycle: "open",
      },
      review_member_id: review.candidateBasisRevision?.reviewMemberId,
      expected_project_definition_ref:
        reviewWorkingCandidate.project_definition_ref,
      expected_working_candidate_ref:
        review.candidateBasisRevision?.expectedWorkingCandidateRef,
      expected_working_relationship_ref:
        review.candidateBasisRevision?.expectedWorkingRelationshipRef,
      expected_claim_ref: review.candidateBasisRevision?.expectedClaimRef,
      basis_revision_input: {
        input_kind: "human_scientific_source_basis_revision",
        project_source_ref: exactSourceView.content.source_ref,
        source_span_refs: review.candidateBasisRevision?.sourceSpanRefs,
        source_scope: "full_text",
        detail_level: "broad",
        source_stance: "qualifies",
        attribution: "The study authors",
        modality: "hedged",
        negated: false,
        uncertainty: "The exact passage qualifies the result.",
        reason: "Retain the material qualification in the source basis.",
      },
    });
    expect(input.request).not.toHaveProperty("actor");
    expect(input.request).not.toHaveProperty("capability_grant_id");
    expect(input.request).not.toHaveProperty("validation");
    expect(input.request).not.toHaveProperty("review_decision");

    const result = {} as ReviewCandidateBasisRevisionResult;
    const revise = vi.fn().mockResolvedValueOnce(result);
    await expect(
      executeReviewCandidateBasisRevisionCommand(input, { revise }),
    ).resolves.toBe(result);
    expect(revise).toHaveBeenCalledExactlyOnceWith(
      input.projectId,
      input.request,
    );
  });

  it("maps one bounded current provenance path without inventing unavailable graph layers", () => {
    const before = structuredClone(relationshipView);
    const graph = graphQuestionFromView(relationshipView);

    expect(graph.focusNodeId).toBe("claim_01ARZ3NDEKTSV4RRFFQ69G5FBB");
    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges).toHaveLength(4);
    expect(graph.nodes.every((node) => node.layers.join() === "current")).toBe(
      true,
    );
    expect(graph.layerAvailability).toEqual({
      current: { available: true, label: "Current" },
      working: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
      historical: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
    });
    expect(graph.recommendation).toBeUndefined();
    expect(
      graph.nodes.find((node) => node.kind === "Source Span")?.sourceId,
    ).toBe("project_source_01K4C000000000000000000007");
    expect(relationshipView).toEqual(before);
  });

  it("maps the runtime overlay into distinct authoritative and working layers without rebinding an earlier endpoint", () => {
    const before = structuredClone(relationshipOverlayGraphView);
    const graph = graphQuestionFromOverlayView(relationshipOverlayGraphView);

    expect(graph.focusNodeId).toBe(overlayClaimNodeKey);
    expect(graph.layerLabels).toEqual({
      current: "Current authority",
      working: "Working — not authoritative",
      historical: "Historical",
    });
    expect(graph.authoritativeSnapshot).toBe(
      "Authority event 42 · Project stream 7",
    );
    expect(graph.representedSnapshot).toContain(
      "Projection current · represented event 42",
    );
    expect(graph.workingRevision).toContain(
      "Working snapshot sha256:7777777777777777777777777777777777777777777777777777777777777777",
    );
    const currentNodeInWorkingOverlay = graph.nodes.find(
      (node) => node.id === overlayWorkNodeKey,
    );
    expect(currentNodeInWorkingOverlay).toEqual(
      expect.objectContaining({
        semanticLayer: "current",
        layers: ["current", "working"],
      }),
    );
    const workingEdge = graph.edges.find(
      (edge) => edge.id === overlayWorkingRelationshipKey,
    );
    expect(workingEdge).toEqual(
      expect.objectContaining({
        to: overlayCandidateEarlierNodeKey,
        semanticLayer: "working",
        endpointPosture: "Referenced earlier working revision — not current",
      }),
    );
    expect(workingEdge?.to).not.toBe(overlayCandidateHeadNodeKey);
    expect(
      graph.textualPeer?.relationships.find(
        (relationship) => relationship.id === overlayWorkingRelationshipKey,
      )?.to,
    ).toBe(overlayCandidateEarlierNodeKey);
    expect(graph.resultCounts).toContainEqual({
      label: "Referenced earlier working candidate revisions",
      value: 1,
    });
    expect(graph.layerCounts?.working).toEqual({
      objects: 4,
      relationships: 2,
      objectLayers: { current: 2, working: 2 },
    });
    expect(relationshipOverlayGraphView).toEqual(before);
  });

  it("fails closed when overlay text or exact working endpoint posture diverges", () => {
    const textMismatch = structuredClone(relationshipOverlayGraphView);
    const textWorkingRelationship =
      textMismatch.content.textual_peer.relationships.find(
        (relationship) => relationship.layer === "working",
      );
    if (textWorkingRelationship === undefined) {
      throw new Error("The overlay fixture requires a working text peer.");
    }
    textWorkingRelationship.target_label = "Current working head";
    expect(() => graphQuestionFromOverlayView(textMismatch)).toThrow(
      "rendered and textual members do not match",
    );

    const postureMismatch = structuredClone(relationshipOverlayGraphView);
    const workingRelationship = postureMismatch.content.relationships.find(
      (relationship) => relationship.layer === "working",
    );
    if (workingRelationship === undefined) {
      throw new Error("The overlay fixture requires a working relationship.");
    }
    workingRelationship.target_endpoint_posture = "current_working_head";
    expect(() => graphQuestionFromOverlayView(postureMismatch)).toThrow(
      "rendered and textual members do not match",
    );
  });

  it("loads the production Graph route from the authenticated overlay without fixture fallback", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      void input;
      return Promise.resolve(Response.json(relationshipOverlayGraphView));
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${relationshipOverlayGraphView.project_id}/graph`,
    );

    const graph = await loadProjectRelationshipOverlayGraph({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/graph",
      params: { projectId: relationshipOverlayGraphView.project_id },
      context: new RouterContextProvider(),
    });

    expect(graph?.edges).toHaveLength(2);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${relationshipOverlayGraphView.project_id}/relationship-overlay`,
    );
  });

  it("keeps the existing current-authority runtime view when no overlay exists", async () => {
    const fetch = vi
      .fn((input: RequestInfo | URL) => {
        void input;
        return Promise.resolve(Response.json(relationshipView));
      })
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/projects/${relationshipView.project_id}/graph`,
    );

    const graph = await loadProjectRelationshipOverlayGraph({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/graph",
      params: { projectId: relationshipView.project_id },
      context: new RouterContextProvider(),
    });

    expect(graph?.layerAvailability?.working.available).toBe(false);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/api/queries/projects/${relationshipView.project_id}/relationship-overlay`,
      `/api/queries/projects/${relationshipView.project_id}/relationship-view`,
    ]);
  });

  it("reads the renderer-neutral overlay without retargeting a non-current working endpoint", async () => {
    const before = structuredClone(relationshipOverlayView);
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(Response.json(before));
    });
    vi.stubGlobal("fetch", fetch);

    const result = await loadProjectRelationshipOverlay(before.project_id);

    expect(result).toEqual(before);
    const workingRelationship = result?.content.relationships.find(
      (relationship) => relationship.layer === "working",
    );
    expect(workingRelationship?.target_endpoint_posture).toBe(
      "non_current_working_endpoint",
    );
    expect(workingRelationship?.target_node_key).toContain(
      "working_candidate_01K4D000000000000000000002:1:",
    );
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/queries/projects/${before.project_id}/relationship-overlay`,
    );
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    expect(relationshipOverlayView).toEqual(before);
  });

  it("rejects a relationship overlay with mismatched authority or definition boundaries", async () => {
    const mismatch = structuredClone(relationshipOverlayView);
    mismatch.content.positions.working.base_authority.stream_revision = 8;
    const fetch = vi.fn(() => Promise.resolve(Response.json(mismatch)));
    vi.stubGlobal("fetch", fetch);
    await expect(
      loadProjectRelationshipOverlay(mismatch.project_id),
    ).rejects.toThrow("mismatched Project, definition, or authority positions");

    const definitionMismatch = structuredClone(relationshipOverlayView);
    definitionMismatch.content.positions.working.project_definition_ref.revision = 3;
    fetch.mockImplementationOnce(() =>
      Promise.resolve(Response.json(definitionMismatch)),
    );
    await expect(
      loadProjectRelationshipOverlay(definitionMismatch.project_id),
    ).rejects.toThrow("mismatched Project, definition, or authority positions");
  });

  it("maps bounded Work collection and detail without inventing stages, inquiry links, or usable outputs", () => {
    const collectionBefore = structuredClone(workCollectionView);
    const collection = workProjectFromView(workCollectionView);
    expect(collection.projectId).toBe(workCollectionView.project_id);
    expect(collection.branches).toEqual([]);
    expect(collection.units).toHaveLength(1);
    expect(collection.units[0]).toEqual(
      expect.objectContaining({
        id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        execution: "completed",
        executionLabel: "Completed operationally",
        stages: [],
        results: [],
      }),
    );
    expect(workCollectionView).toEqual(collectionBefore);

    const detailBefore = structuredClone(workDetailView);
    const detail = workUnitFromView(workDetailView);
    expect(detail.inputs?.[0]).toContain("artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1");
    expect(detail.dependencies).toEqual([]);
    expect(detail.stagePlanLimitation).toContain("does not reconstruct stages");
    expect(detail.inquiryLimitation).toContain("inquiry mapping");
    expect(detail.reviewState).toContain("Review linkage");
    expect(detail.results[0]).toEqual(
      expect.objectContaining({
        status: "Worker reported",
        validation: "Project usability unavailable",
      }),
    );
    expect(detail.results[0]?.limitation).toContain("does not infer");
    expect(workDetailView).toEqual(detailBefore);
  });

  it("composes exact inquiry links into Work without deriving inquiry resolution", () => {
    const before = structuredClone(inquiryDetailView);
    const collection = workProjectFromView(workCollectionView, [
      inquiryDetailView,
    ]);
    expect(collection.branches).toEqual([
      expect.objectContaining({
        id: "objective_01K4C000000000000000000005",
        kind: "Research question",
        state: "Active · authored",
        workIds: ["work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2"],
        recommended: false,
      }),
    ]);
    expect(collection.branches[0]?.consequence).toContain(
      "1 exact Work link (0 active, 1 completed, 0 cancelled)",
    );
    expect(collection.branches[0]?.consequence).toContain(
      "does not change the authored inquiry status",
    );
    expect(collection.units[0]?.branchIds).toEqual([
      "objective_01K4C000000000000000000005",
    ]);

    const detail = workProjectFromView(workDetailView, [inquiryDetailView]);
    expect(detail.units[0]?.inquiryLimitation).toContain(
      "Work completion does not resolve an inquiry",
    );
    expect(inquiryDetailView).toEqual(before);
  });

  it("loads exact Project Work identities from the authorized read routes", async () => {
    if (workDetailView.content.view_kind !== "detail") {
      throw new Error("Expected the Work detail fixture.");
    }
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (path.includes("/inquiries/")) {
        return Promise.resolve(Response.json(inquiryDetailView));
      }
      if (path.includes("/inquiries?")) {
        const inquiryCollection = structuredClone(inquiryCollectionView);
        if (
          inquiryCollection.content.view_kind === "collection" &&
          path.includes("work_unit_id=")
        ) {
          inquiryCollection.content.query.work_unit_id =
            "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2";
        }
        return Promise.resolve(Response.json(inquiryCollection));
      }
      return Promise.resolve(
        Response.json(
          path.includes("/work/") ? workDetailView : workCollectionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = workCollectionView.project_id;
    const workUnitId =
      workDetailView.content.summary.work_unit_ref.work_unit_id;
    const collectionUrl = new URL(
      `http://petra.test/projects/${projectId}/work`,
    );
    const collection = await loadProjectWorkCollection({
      request: new Request(collectionUrl),
      url: collectionUrl,
      pattern: "/projects/:projectId/work",
      params: { projectId },
      context: new RouterContextProvider(),
    });
    expect(collection.units[0]?.id).toBe(workUnitId);
    expect(collection.branches[0]?.id).toBe(
      "objective_01K4C000000000000000000005",
    );

    const detailUrl = new URL(
      `http://petra.test/projects/${projectId}/work/${workUnitId}`,
    );
    const detail = await loadProjectWorkDetail({
      request: new Request(detailUrl),
      url: detailUrl,
      pattern: "/projects/:projectId/work/:workId",
      params: { projectId, workId: workUnitId },
      context: new RouterContextProvider(),
    });
    expect(detail.unit.id).toBe(workUnitId);
    expect(detail.unit.branchIds).toEqual([
      "objective_01K4C000000000000000000005",
    ]);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/work?limit=50`,
      `/api/queries/projects/${projectId}/inquiries?limit=100`,
      `/api/queries/projects/${projectId}/inquiries/objective_01K4C000000000000000000005`,
      `/api/queries/projects/${projectId}/work/${workUnitId}`,
      `/api/queries/projects/${projectId}/inquiries?limit=100&work_unit_id=${workUnitId}`,
    ]);
  });

  it("previews, invokes, and rereads one exact Work-starting SuggestedAction", async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.includes("/suggested-action-invocations/") ||
            path.includes("/invoke")
            ? suggestedActionInvocationView
            : suggestedWorkActionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);

    const projectId = suggestedWorkActionView.project_id;
    const linkId =
      suggestedWorkActionView.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const actionId =
      suggestedWorkActionView.content.action_ref.suggested_action_id;
    const commandId = suggestedActionInvocationRequest.command_id;

    await expect(
      getProjectSuggestedWorkAction(projectId, linkId),
    ).resolves.toEqual(suggestedWorkActionView);
    await expect(
      invokeProjectSuggestedAction(
        projectId,
        actionId,
        suggestedActionInvocationRequest,
      ),
    ).resolves.toEqual(suggestedActionInvocationView);
    await expect(
      getProjectSuggestedActionInvocation(projectId, commandId),
    ).resolves.toEqual(suggestedActionInvocationView);

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/suggested-actions?inquiry_result_link_id=${linkId}&action_kind=run_grounded_synthesis`,
      `/api/commands/projects/${projectId}/suggested-actions/${actionId}/invoke`,
      `/api/queries/projects/${projectId}/suggested-action-invocations/${commandId}`,
    ]);
    const invokeInit = fetch.mock.calls[1]?.[1];
    expect(invokeInit?.method).toBe("POST");
    if (typeof invokeInit?.body !== "string") {
      throw new TypeError("Expected a serialized SuggestedAction request.");
    }
    expect(JSON.parse(invokeInit.body)).toEqual(
      suggestedActionInvocationRequest,
    );
    expect(new Headers(invokeInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );

    await expect(
      invokeProjectSuggestedAction(
        projectId,
        "suggested_action_01K4C000000000000000000999",
        suggestedActionInvocationRequest,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("builds only caller-owned invocation fields from the exact action ref", () => {
    const request = createSuggestedActionInvocationRequest(
      suggestedWorkActionView,
      {
        commandId: suggestedActionInvocationRequest.command_id,
        idempotencyKey: suggestedActionInvocationRequest.idempotency_key,
        submittedAt: suggestedActionInvocationRequest.submitted_at,
      },
    );

    expect(request).toEqual(suggestedActionInvocationRequest);
    expect(request).not.toHaveProperty("project_id");
    expect(request).not.toHaveProperty("actor");
    expect(request).not.toHaveProperty("capability_grant_id");
    expect(request).not.toHaveProperty("work_unit_id");
    expect(request).not.toHaveProperty("interaction");
    expect(request).not.toHaveProperty("trace_id");
  });

  it("retains the server-regenerated action on an exact stale invocation", async () => {
    const staleReference = structuredClone(suggestedActionInvocationRequest);
    staleReference.expected_action_ref.content_hash =
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "SUGGESTED_ACTION_INVOCATION_STALE",
            message:
              "The exact SuggestedAction revision or hash is stale; regenerate from current Project authority.",
          },
          regeneration: suggestedWorkActionView,
        },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      invokeProjectSuggestedAction(
        suggestedWorkActionView.project_id,
        suggestedWorkActionView.content.action_ref.suggested_action_id,
        staleReference,
      ),
    ).rejects.toMatchObject({
      status: 409,
      suggestedActionRegeneration: suggestedWorkActionView,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("loads the same exact action command context for Petra presentation", async () => {
    if (
      threadCollectionView.content.view_kind !== "collection" ||
      threadDetailView.content.view_kind !== "detail"
    ) {
      throw new Error("Expected exact Project thread fixtures.");
    }
    const threadId =
      threadDetailView.content.summary.thread_ref.project_thread_id;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const value = path.includes("/suggested-action-invocations/")
        ? suggestedActionInvocationView
        : path.includes("/suggested-actions?")
          ? suggestedWorkActionView
          : path.includes(`/threads/${threadId}`)
            ? threadDetailView
            : threadCollectionView;
      return Promise.resolve(Response.json(value));
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = suggestedWorkActionView.project_id;
    const linkId =
      suggestedWorkActionView.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id;
    const commandId = suggestedActionInvocationRequest.command_id;
    const url = new URL(
      `http://petra.test/projects/${projectId}/petra?inquiry_result_link_id=${linkId}&suggested_action_command_id=${commandId}`,
    );

    const data = await loadProjectPetra({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/petra",
      params: { projectId },
      context: new RouterContextProvider(),
    });

    expect(data.suggestedWorkAction).toEqual(suggestedWorkActionView);
    expect(data.suggestedActionInvocation).toEqual(
      suggestedActionInvocationView,
    );
    expect(data.thread?.id).toBe(threadId);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/api/queries/projects/${projectId}/threads?limit=1&lifecycle=open`,
      `/api/queries/projects/${projectId}/suggested-actions?inquiry_result_link_id=${linkId}&action_kind=run_grounded_synthesis`,
      `/api/queries/projects/${projectId}/suggested-action-invocations/${commandId}`,
      `/api/queries/projects/${projectId}/threads/${threadId}`,
    ]);
  });

  it("loads an exactly bound communication plan through the production typed client", async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const value = path.includes("/communication?") ? communicationPlan : {};
      void init;
      return Promise.resolve(Response.json(value));
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = communicationPlan.project_id;
    const source = communicationPlan.content.source_response;
    const query = new URLSearchParams({
      communication_response_id: source.grounded_response_id,
      communication_response_revision: String(source.revision),
      communication_response_content_hash: source.content_hash,
      communication_response_record_hash:
        "sha256:2a844523f685bd10c44d76d03a52a8708a2b184641bb8d89008d90b2f1c55419",
      communication_locale: "en",
      communication_definition_hash:
        communicationPlan.content.composition_definition.content_hash,
    });
    const url = new URL(
      `http://petra.test/projects/${projectId}/petra?${query.toString()}`,
    );

    const data = await loadProjectPetra({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/petra",
      params: { projectId },
      context: new RouterContextProvider(),
    });

    expect(data.communicationPlan).toEqual(communicationPlan);
    expect(data.thread).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
    const communicationCall = fetch.mock.calls.find(([input]) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return path.includes("/communication?");
    });
    expect(communicationCall).toBeDefined();
    if (communicationCall === undefined)
      throw new Error("The exact communication read was not requested.");
    const communicationInput = communicationCall[0];
    const communicationUrl = new URL(
      typeof communicationInput === "string"
        ? communicationInput
        : communicationInput instanceof URL
          ? communicationInput.href
          : communicationInput.url,
    );
    expect(communicationUrl.searchParams.get("response_id")).toBe(
      source.grounded_response_id,
    );
    expect(communicationUrl.searchParams.get("response_revision")).toBe("1");
    expect(communicationUrl.searchParams.get("expected_definition_hash")).toBe(
      communicationPlan.content.composition_definition.content_hash,
    );
    expect(communicationCall[1]?.headers).toEqual({
      authorization: "Bearer petra-local-development",
    });
  });

  it("rejects partial communication route bindings before any authority read", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    const projectId = communicationPlan.project_id;
    const url = new URL(
      `http://petra.test/projects/${projectId}/petra?communication_response_id=${communicationPlan.content.source_response.grounded_response_id}`,
    );

    await expect(
      loadProjectPetra({
        request: new Request(url),
        url,
        pattern: "/projects/:projectId/petra",
        params: { projectId },
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("binds an exact SuggestedAction Work destination to authenticated runtime History", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(suggestedActionInvocationView));
    vi.stubGlobal("fetch", fetch);
    const projectId = suggestedActionInvocationView.project_id;
    const commandId =
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id;
    const workId =
      suggestedActionInvocationView.content.invocation.content
        .expected_work_unit_id;
    const url = new URL(
      `http://petra.test/projects/${projectId}/history?target_semantic_key=petra.work-unit&target_object_id=${workId}&suggested_action_command_id=${commandId}`,
    );

    const data = await loadProjectSuggestedActionHistory({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/history",
      params: { projectId },
      context: new RouterContextProvider(),
    });

    expect(data).toEqual({
      invocation: suggestedActionInvocationView,
      historyDestination:
        suggestedActionInvocationView.content.history.destinations[1],
      workDestination:
        suggestedActionInvocationView.content.history.destinations[0],
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${projectId}/suggested-action-invocations/${commandId}`,
    );
    const headers = fetch.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
  });

  it("fails closed on incomplete or substituted runtime Work History identities", async () => {
    const projectId = suggestedActionInvocationView.project_id;
    const commandId =
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id;
    const workId =
      suggestedActionInvocationView.content.invocation.content
        .expected_work_unit_id;
    const partialUrl = new URL(
      `http://petra.test/projects/${projectId}/history?target_semantic_key=petra.work-unit&target_object_id=${workId}`,
    );
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(suggestedActionInvocationView));
    vi.stubGlobal("fetch", fetch);

    await expect(
      loadProjectSuggestedActionHistory({
        request: new Request(partialUrl),
        url: partialUrl,
        pattern: "/projects/:projectId/history",
        params: { projectId },
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();

    const substitutedUrl = new URL(
      `http://petra.test/projects/${projectId}/history?target_semantic_key=petra.work-unit&target_object_id=work_unit_01K4C000000000000000000099&suggested_action_command_id=${commandId}`,
    );
    await expect(
      loadProjectSuggestedActionHistory({
        request: new Request(substitutedUrl),
        url: substitutedUrl,
        pattern: "/projects/:projectId/history",
        params: { projectId },
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("replays one server-eligible SuggestedAction InteractionRun without command input", async () => {
    const completed = completedSuggestedActionInvocationView();
    const request = createSuggestedActionInteractionReplayRequest({
      connectionId: "interaction_connection_01K4C000000000000000000099",
    });
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (path.startsWith("/api/interactions/")) {
        return Promise.resolve(
          new Response(suggestedActionReplayWire(completed), {
            headers: { "content-type": "text/event-stream" },
          }),
        );
      }
      void init;
      return Promise.resolve(Response.json(completed));
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = completed.project_id;
    const command = completed.content.invocation.content.command_ref;
    const correlation = completed.content.interaction;
    if (
      completed.content.result.state !== "available" ||
      completed.content.interaction.interaction_run_ref === undefined
    ) {
      throw new TypeError("Expected exact completed replay identities.");
    }

    const result = await replayProjectSuggestedActionInteraction(
      projectId,
      command.command_id,
      request,
    );

    expect(result.invocation).toEqual(completed);
    expect(result.replay.messages).toContainEqual({
      id: "message_suggested_action_replay",
      role: "assistant",
      content: "The exact retained grounded response.",
    });
    expect(result.replay.events.at(-1)).toMatchObject({
      type: "RUN_FINISHED",
      payload: {
        threadId: correlation.protocol_thread_id,
        runId: correlation.protocol_run_id,
        result: {
          authorityEffect: "none",
          terminalBinding: {
            grounded_response_id: completed.content.result.result_ref.record_id,
            interaction_run_id:
              completed.content.interaction.interaction_run_ref.record_id,
            work_unit_id:
              completed.content.invocation.content.expected_work_unit_id,
          },
        },
      },
    });
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      `/api/queries/projects/${projectId}/suggested-action-invocations/${command.command_id}`,
      `/api/interactions/${encodeURIComponent(correlation.protocol_run_id)}?thread=${encodeURIComponent(correlation.protocol_thread_id)}&connection=${request.connectionId}&after=0`,
      `/api/queries/projects/${projectId}/suggested-action-invocations/${command.command_id}`,
    ]);
    const replayInit = fetch.mock.calls[1]?.[1];
    expect(replayInit?.method).toBe("GET");
    expect(replayInit?.body).toBeUndefined();
    expect(new Headers(replayInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    expect(request).toEqual({
      connectionId: "interaction_connection_01K4C000000000000000000099",
      afterSequence: 0,
    });
    expect(request).not.toHaveProperty("projectId");
    expect(request).not.toHaveProperty("commandId");
    expect(request).not.toHaveProperty("actor");
    expect(request).not.toHaveProperty("capabilityGrantId");
    expect(request).not.toHaveProperty("runId");
    expect(request).not.toHaveProperty("workUnitId");
  });

  it("fails closed when replay is ineligible or the delivered Work identity is substituted", async () => {
    const completed = completedSuggestedActionInvocationView();
    const ineligible = structuredClone(completed);
    const reconnect = ineligible.content.recovery.actions.find(
      (action) => action.operation === "reconnect_delivery",
    );
    if (reconnect === undefined) {
      throw new TypeError("Expected replay recovery authority.");
    }
    reconnect.eligibility = "ineligible";
    reconnect.reason = "No durable interaction delivery can be replayed.";
    const request = createSuggestedActionInteractionReplayRequest({
      connectionId: "interaction_connection_01K4C000000000000000000099",
    });
    const ineligibleFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(ineligible));
    vi.stubGlobal("fetch", ineligibleFetch);

    await expect(
      replayProjectSuggestedActionInteraction(
        ineligible.project_id,
        ineligible.content.invocation.content.command_ref.command_id,
        request,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(ineligibleFetch).toHaveBeenCalledOnce();

    const substitutedFetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        path.startsWith("/api/interactions/")
          ? new Response(
              suggestedActionReplayWire(
                completed,
                "work_unit_01K4C000000000000000000099",
              ),
              { headers: { "content-type": "text/event-stream" } },
            )
          : Response.json(completed),
      );
    });
    vi.stubGlobal("fetch", substitutedFetch);
    await expect(
      replayProjectSuggestedActionInteraction(
        completed.project_id,
        completed.content.invocation.content.command_ref.command_id,
        request,
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(substitutedFetch).toHaveBeenCalledTimes(3);

    await expect(
      replayProjectSuggestedActionInteraction(
        completed.project_id,
        completed.content.invocation.content.command_ref.command_id,
        { ...request, afterSequence: 1 as 0 },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(substitutedFetch).toHaveBeenCalledTimes(3);
  });

  it("cancels only the exact server-eligible SuggestedAction Work and rereads its History", async () => {
    const running = structuredClone(suggestedActionInvocationView);
    if (running.content.work.state !== "pending_registration") {
      throw new TypeError("Expected the pending fixture Work identity.");
    }
    const workUnitId = running.content.work.expected_work_unit_id;
    const specHash =
      "sha256:2121212121212121212121212121212121212121212121212121212121212121";
    const runningWorkRef = {
      work_unit_id: workUnitId,
      revision: 3,
      spec_hash: specHash,
      record_hash:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    };
    running.content.operation_state = "running";
    running.content.work = {
      state: "available",
      work_unit_ref: runningWorkRef,
      input_manifest_ref: {
        record_id: "worker_input_manifest_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:2323232323232323232323232323232323232323232323232323232323232323",
        record_hash:
          "sha256:2424242424242424242424242424242424242424242424242424242424242424",
      },
      execution_state: "running",
    };
    running.content.history.work_revisions = [
      {
        work_unit_ref: runningWorkRef,
        state: "running",
        recorded_at: "2026-09-11T18:40:02.000Z",
      },
    ];
    const runningCancellation = running.content.recovery.actions.find(
      (action) => action.operation === "cancel_work",
    );
    if (runningCancellation === undefined) {
      throw new TypeError("Expected the cancellation recovery operation.");
    }
    runningCancellation.eligibility = "eligible";
    runningCancellation.command_name = "CancelWorkUnit";
    runningCancellation.reason =
      "The registered Work is active and explicitly cancellable.";

    const cancelled = structuredClone(running);
    const cancelledWorkRef = {
      ...runningWorkRef,
      revision: 4,
      record_hash:
        "sha256:2525252525252525252525252525252525252525252525252525252525252525",
    };
    cancelled.content.operation_state = "cancelled";
    if (cancelled.content.work.state !== "available") {
      throw new TypeError("Expected the running exact WorkUnit.");
    }
    cancelled.content.work.work_unit_ref = cancelledWorkRef;
    cancelled.content.work.execution_state = "cancelled";
    cancelled.content.work.terminal_outcome = "cancelled";
    cancelled.content.history.work_revisions.push({
      work_unit_ref: cancelledWorkRef,
      state: "cancelled",
      terminal_outcome: "cancelled",
      recorded_at: "2026-09-11T18:40:03.000Z",
    });
    const cancelledRecovery = cancelled.content.recovery.actions.find(
      (action) => action.operation === "cancel_work",
    );
    if (cancelledRecovery === undefined) {
      throw new TypeError("Expected the cancellation recovery operation.");
    }
    cancelledRecovery.eligibility = "ineligible";
    delete cancelledRecovery.command_name;
    cancelledRecovery.reason =
      "Cancellation is available only while the exact Work is active.";

    const request = createSuggestedActionWorkCancellationRequest({
      commandId: "command_01K4C000000000000000000099",
      reason: "Stop this exact bounded synthesis.",
    });
    const cancellation = {
      applied: true,
      commandId: request.commandId,
      effectId: "work_unit_cancellation_01K4C000000000000000000099",
      runId: running.content.interaction.protocol_run_id,
      workUnitId,
      workUnitRevision: 4,
      workUnitCancellationId:
        "work_unit_cancellation_01K4C000000000000000000099",
      cancellationHash:
        "sha256:2626262626262626262626262626262626262626262626262626262626262626",
    };
    let reads = 0;
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(Response.json(cancellation));
      }
      reads += 1;
      return Promise.resolve(Response.json(reads === 1 ? running : cancelled));
    });
    vi.stubGlobal("fetch", fetch);

    const projectId = running.project_id;
    const invocationCommandId =
      running.content.invocation.content.command_ref.command_id;
    await expect(
      cancelProjectSuggestedActionWork(projectId, invocationCommandId, request),
    ).resolves.toEqual({ cancellation, invocation: cancelled });

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/suggested-action-invocations/${invocationCommandId}`,
      `/api/work-units/${encodeURIComponent(cancellation.runId)}/cancel`,
      `/api/queries/projects/${projectId}/suggested-action-invocations/${invocationCommandId}`,
    ]);
    const cancelInit = fetch.mock.calls[1]?.[1];
    expect(cancelInit?.method).toBe("POST");
    if (typeof cancelInit?.body !== "string") {
      throw new TypeError("Expected a serialized cancellation request.");
    }
    expect(JSON.parse(cancelInit.body)).toEqual(request);
    expect(new Headers(cancelInit.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    expect(JSON.parse(cancelInit.body)).not.toHaveProperty("projectId");
    expect(JSON.parse(cancelInit.body)).not.toHaveProperty("actor");
    expect(JSON.parse(cancelInit.body)).not.toHaveProperty("capabilityGrantId");
    expect(JSON.parse(cancelInit.body)).not.toHaveProperty("runId");
    expect(JSON.parse(cancelInit.body)).not.toHaveProperty("workUnitId");
  });

  it("leaves the final cancellation race decision to the authenticated server", async () => {
    let reads = 0;
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          Response.json(
            {
              error: {
                code: "CANCELLATION_REJECTED",
                message: "A terminal interaction run cannot be cancelled.",
              },
            },
            { status: 409 },
          ),
        );
      }
      reads += 1;
      const ineligible = structuredClone(suggestedActionInvocationView);
      ineligible.content.work = {
        state: "available",
        work_unit_ref: {
          work_unit_id: "work_unit_01K4C000000000000000000062",
          revision: 4,
          spec_hash:
            "sha256:2121212121212121212121212121212121212121212121212121212121212121",
          record_hash:
            "sha256:2525252525252525252525252525252525252525252525252525252525252525",
        },
        input_manifest_ref: {
          record_id: "worker_input_manifest_01K4C000000000000000000062",
          revision: 1,
          content_hash:
            "sha256:2323232323232323232323232323232323232323232323232323232323232323",
          record_hash:
            "sha256:2424242424242424242424242424242424242424242424242424242424242424",
        },
        execution_state: "completed",
        terminal_outcome: "succeeded",
      };
      return Promise.resolve(Response.json(ineligible));
    });
    vi.stubGlobal("fetch", fetch);
    const invocationCommandId =
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id;

    await expect(
      cancelProjectSuggestedActionWork(
        suggestedActionInvocationView.project_id,
        invocationCommandId,
        createSuggestedActionWorkCancellationRequest({
          commandId: "command_01K4C000000000000000000099",
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(reads).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `/api/work-units/${encodeURIComponent(suggestedActionInvocationView.content.interaction.protocol_run_id)}/cancel`,
    );
  });

  it("maps and loads one exact live Project thread without inventing message bytes", async () => {
    if (
      threadCollectionView.content.view_kind !== "collection" ||
      threadDetailView.content.view_kind !== "detail"
    ) {
      throw new Error(
        "Expected Project thread collection and detail fixtures.",
      );
    }
    const before = structuredClone(threadDetailView);
    const thread = petraThreadFromView(threadDetailView);
    expect(thread).toEqual(
      expect.objectContaining({
        id: "project_thread_01K4C000000000000000000101",
        snapshot: "Authority event 3 · snapshot revision 1",
        activeWorkId: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        activeWorkTitle: "Linked Work",
      }),
    );
    expect(thread.context).toContain("3 included Project records");
    expect(thread.omissions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exact input bytes are unavailable"),
        expect.stringContaining("review-policy capture"),
      ]),
    );
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0]?.force).toBe("author_instruction");
    expect(thread.messages[0]?.content).toContain(
      "exact input bytes are unavailable",
    );
    expect(thread.messages[1]?.force).toBe("explanation_only");
    expect(thread.messages[1]?.content).toContain("metadata-only Project read");
    expect(thread.messages[1]?.references[0]?.destination).toContain(
      "/work/work_unit_",
    );
    expect(threadDetailView).toEqual(before);

    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.includes("/threads/project_thread_")
            ? threadDetailView
            : threadCollectionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = threadCollectionView.project_id;
    const url = new URL(`http://petra.test/projects/${projectId}/petra`);
    const loaded = await loadProjectPetraThread({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/petra",
      params: { projectId },
      context: new RouterContextProvider(),
    });
    expect(loaded).toEqual(thread);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/threads?limit=1&lifecycle=open`,
      `/api/queries/projects/${projectId}/threads/${thread.id}`,
    ]);
  });

  it("maps semantic roles to client routes while retaining exact identity", () => {
    const currentPath = semanticDestinationPath(locationView);
    expect(currentPath).toContain(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007",
    );
    expect(currentPath).toContain("semanticKey=petra.project-source");
    expect(currentPath).toContain("revision=1");
    expect(currentPath).toContain(
      "recordHash=sha256%3Afa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );

    const historical = structuredClone(locationView);
    historical.content.resolution.state = "historical";
    historical.content.primary_destination =
      historical.content.alternate_destinations[1]!;
    expect(semanticDestinationPath(historical)).toContain(
      "/history?selected=project_source_01K4C000000000000000000007",
    );

    const missing = structuredClone(locationView);
    missing.content.resolution = {
      state: "missing",
      requested_ref: missing.content.request.object_ref,
      failure: {
        code: "OBJECT_UNAVAILABLE",
        message: "The requested object is unavailable.",
      },
    };
    missing.content.primary_destination = {
      role: "brief",
      purpose: "Return to the current Project orientation.",
    };
    expect(semanticDestinationPath(missing)).toBe(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief",
    );
  });

  it("resolves a deep link through the authorized semantic query without ambient selection", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      void input;
      return Promise.resolve(Response.json(locationView));
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      "http://petra.test/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/locate?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/locate",
      params: {
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
      context: new RouterContextProvider(),
    };

    const response = await loadProjectObjectLocationRedirect(args);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      semanticDestinationPath(locationView),
    );
    expect(fetch).toHaveBeenCalledOnce();
    const requestPath = fetch.mock.calls[0]?.[0];
    expect(typeof requestPath).toBe("string");
    if (typeof requestPath !== "string") {
      throw new TypeError(
        "Expected the location loader to request a URL string.",
      );
    }
    expect(requestPath).toContain(
      "/object-location?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    expect(requestPath).not.toContain("selected=");
  });
});
