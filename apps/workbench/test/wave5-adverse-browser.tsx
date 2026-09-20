// UX-FX25 browser harness: production components over a renderer-neutral fixture.
import type {
  FocusedGraphGovernedCorrectionPreview,
  FocusedGraphProjectionPosition,
  PetraFocusedGraphActionPreviewView,
  PetraFocusedGraphAnalysisView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
  PetraProjectInquirySaveRequest,
} from "@petra/contracts";
import type {
  FocusedGraphActionPreviewViewRequest,
  FocusedGraphExplorationViewRequest,
  FocusedGraphReadRequest,
} from "@petra/core";
import createGraph from "cytoscape";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import scientificDefinitionFixture from "../../../packages/contracts/fixtures/accepted/project-definition-scientific.json";
import impactSourceFixture from "../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/review-graph.css";
import {
  type FocusedGraphEntry,
  type FocusedGraphRouteData,
  FocusedGraphOrientationSurface,
} from "../src/product/focused-graph-entry.js";
import { FocusedGraphAnalysisSurface } from "../src/product/FocusedGraphAnalysis.js";
import type { FocusedGraphActionPreviewRead } from "../src/product/FocusedGraphActions.js";
import type { FocusedGraphExplorationRead } from "../src/product/FocusedGraphExploration.js";
import type { FocusedGraphRendererFactory } from "../src/product/FocusedGraphResult.js";
import {
  ProjectInquirySaveClientError,
  type ProjectInquirySaveCommand,
  type ProjectInquirySaveRecoveryRead,
} from "../src/product/project-inquiry-save.js";

declare global {
  interface Window {
    wave5Calls: Array<{ requestId: string; settled: string }>;
    wave5ActionRequests: FocusedGraphActionPreviewViewRequest[];
    wave5Online: boolean;
    wave5Mode: string;
    wave6InquirySaveRequests: PetraProjectInquirySaveRequest[];
    wave6InquiryRecoveryRequests: PetraProjectInquirySaveRequest[];
  }
}

const hash = `sha256:${"a".repeat(64)}`;
const secondHash = `sha256:${"b".repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const focusId = "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB";
const snapshotId = "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD";
const record = (record_id: string) => ({
  record_id,
  revision: 1,
  record_hash: hash,
});
const term = (
  semantic_key: string,
  generic_family: "focus" | "finding" | "relationship" | "task",
  singular: string,
) => ({
  semantic_key,
  singular,
  plural: `${singular}s`,
  definition: `${singular} meaning resolved by the exact scientific profile.`,
  generic_family,
});

const objectTerm = term("scientific.claim", "finding", "Claim");
const relationshipTerm = term(
  "scientific.assertion",
  "relationship",
  "Evidence relationship",
);
const meaningSequence = [
  "citation",
  "support",
  "contradiction",
  "qualification",
  "inference",
] as const;
const predicate = {
  citation: "CITES",
  support: "SUPPORTS",
  contradiction: "CONTRADICTS",
  qualification: "QUALIFIES",
  inference: "INFERS",
} as const;

const nodes: PetraFocusedGraphViewV11["content"]["nodes"] = Array.from(
  { length: 32 },
  (_, index) => ({
    node_key: `node:claim-${index}`,
    record_ref: record(index === 0 ? focusId : `claim_fixture_${index}`),
    semantic_key: objectTerm.semantic_key,
    term: objectTerm,
    label: index === 0 ? "Dense question focus" : `Bounded Claim ${index}`,
    summary:
      index === 31
        ? "The exact target is missing from the current inspection capability."
        : index === 30
          ? "The exact target is restricted to the current actor."
          : `A bounded fixture Claim at returned position ${index}.`,
    layer: index % 7 === 0 && index !== 0 ? "working" : "current",
    authority_position:
      index % 7 === 0 && index !== 0
        ? "working_non_authority"
        : "current_authority",
    lifecycle:
      index === 31 ? "missing" : index === 30 ? "restricted" : "represented",
    basis: {
      summary:
        index % 7 === 0 && index !== 0
          ? "WorkingCandidate based on snapshot event 40; event 42 is newer."
          : "Canonical PostgreSQL record represented through the bounded projection.",
      record_refs: [],
      limitations:
        index % 7 === 0 && index !== 0
          ? ["The working base is stale and remains non-authoritative."]
          : [],
    },
    destination_keys:
      index === 31
        ? ["destination:missing"]
        : index === 30
          ? ["destination:restricted"]
          : [],
  }),
);

const relationshipPairs = [
  ...Array.from({ length: 31 }, (_, index) => [0, index + 1] as const),
  [1, 2] as const,
  [2, 1] as const,
];
const relationships: PetraFocusedGraphViewV11["content"]["relationships"] =
  relationshipPairs.map(([source, target], index) => {
    const meaning = meaningSequence[index % meaningSequence.length]!;
    const working = index % 7 === 6;
    return {
      relationship_key: `relationship:dense-${index}`,
      relationship_ref: {
        element_id: `assertion_fixture_${index}`,
        revision: 1,
        record_hash: hash,
      },
      semantic_key: relationshipTerm.semantic_key,
      term: relationshipTerm,
      predicate: predicate[meaning],
      meaning_kind: meaning,
      source_node_key: `node:claim-${source}`,
      target_node_key: `node:claim-${target}`,
      direction: "outgoing",
      origin: working ? "working_candidate" : "canonical_record",
      layer: working ? "working" : "current",
      authority_position: working
        ? "working_non_authority"
        : "current_authority",
      summary: `${predicate[meaning]} remains a distinct registered relationship meaning.`,
      basis: {
        summary: `Exact ${predicate[meaning]} basis; layout supplies no meaning.`,
        record_refs: [],
        limitations: [
          index >= 31
            ? "This step repeats a member in the bounded two-edge cycle."
            : "This relationship is bounded to the returned question.",
        ],
      },
      destination_keys: [],
    };
  });

const paths: PetraFocusedGraphViewV11["content"]["paths"] = relationships.map(
  (relationship, index) => ({
    path_key: `path:dense-${index}`,
    state: index === 30 ? "partial" : "complete",
    ordering_rationale:
      "Recorded endpoint order for inspection; this is not rank, strength, chronology, or authority.",
    steps: [
      {
        position: 1,
        from_node_key: relationship.source_node_key,
        relationship_key: relationship.relationship_key,
        to_node_key: relationship.target_node_key,
        traversal_direction: "outgoing",
        repeated_member: index >= 31,
      },
    ],
    limitations:
      index === 30
        ? ["The restricted endpoint prevents a complete inspectable path."]
        : [],
  }),
);

const projectionDetail: Record<
  FocusedGraphProjectionPosition["state"],
  string
> = {
  current:
    "The bounded Neo4j projection represents authoritative PostgreSQL event 42.",
  catching_up:
    "PostgreSQL authority is at event 42 while the rebuildable projection represents event 40.",
  unavailable:
    "PostgreSQL remains authoritative; the rebuildable projection is unavailable and graph actions remain read only.",
  rebuilding:
    "The rebuildable projection is being reconstructed from PostgreSQL authority at event 42.",
};

const denseView = (
  projectionState: FocusedGraphProjectionPosition["state"] = "current",
  temporal: "current" | "historical_unknown" = "current",
): PetraFocusedGraphViewV11 => ({
  schema_name: "petra.focused-graph-view",
  schema_version: "1.1.0",
  project_id: projectId,
  content: {
    task: {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      request_hash: hash,
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question:
        "Which recorded relationships remain inspectable in this bounded adverse result?",
      question_hash: hash,
      focus_refs: [record(focusId)],
      origin: { origin_kind: "direct" },
      return_destination_key: "destination:brief",
    },
    profile: {
      project_definition_ref: {
        project_definition_id: "project_definition_01K4C000000000000000000001",
        revision: 2,
        content_hash: hash,
        record_hash: secondHash,
        definition_family: "petra.scientific-evidence",
      },
      kernel_compatibility: "petra.project-kernel@1.0.0",
      label: "Scientific evidence inquiry",
      focused_graph_registration: {
        semantic_key: "petra.focused-graph",
        registration_kind: "extension",
        contract: {
          name: "petra.focused-graph-view",
          version: "1.1.0",
          content_hash: hash,
        },
      },
      resolved_semantics: [
        {
          semantic_key: "scientific.research-question",
          role: "task",
          registration_kind: "objective_schema",
          contract: {
            name: "petra.project-objective",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term(
            "scientific.research-question",
            "focus",
            "Research question",
          ),
        },
        {
          semantic_key: objectTerm.semantic_key,
          role: "object",
          registration_kind: "object_schema",
          contract: {
            name: "petra.claim",
            version: "1.0.0",
            content_hash: hash,
          },
          term: objectTerm,
        },
        {
          semantic_key: relationshipTerm.semantic_key,
          role: "relationship",
          registration_kind: "relationship_schema",
          contract: {
            name: "petra.assertion",
            version: "1.0.0",
            content_hash: hash,
          },
          term: relationshipTerm,
        },
      ],
    },
    source_views: [],
    requested_snapshot: {
      snapshot_id: snapshotId,
      revision: 1,
      event_position: 42,
      content_hash: hash,
    },
    represented_snapshot: {
      snapshot_id: snapshotId,
      revision: 1,
      event_position: projectionState === "current" ? 42 : 40,
      content_hash: hash,
    },
    semantic_layer: temporal === "current" ? "current" : "historical",
    temporal_position:
      temporal === "current"
        ? { position_kind: "current", dimension: "project_snapshot" }
        : {
            position_kind: "historical",
            dimension: "publication_time",
            at: { state: "unknown" },
          },
    projection_position: {
      authority_source: "postgresql",
      projection_source: "neo4j_rebuildable_projection",
      state: projectionState,
      ...(projectionState === "unavailable"
        ? {}
        : { checkpoint_ref: record("projection_checkpoint_fixture") }),
      represented_event_position: projectionState === "current" ? 42 : 40,
      observed_event_position: 42,
      pending_records: projectionState === "current" ? 0 : 2,
      detail: projectionDetail[projectionState],
    },
    scope: {
      description:
        "UX-FX25 returns a finite dense neighborhood with a cycle, partial paths, stale working members, restricted and missing endpoints, and explicit omissions.",
      included_relationship_semantics: [relationshipTerm.semantic_key],
      directions: ["outgoing"],
      included_layers: ["current", "working", "historical"],
      limits: {
        maximum_depth: 2,
        maximum_nodes: 40,
        maximum_relationships: 40,
        maximum_paths: 40,
      },
      coverage: "partial",
      omissions: [
        {
          omission_kind: "capped",
          description:
            "Eight additional members are capped by the finite query.",
          count: { state: "exact", value: 8 },
        },
        {
          omission_kind: "restricted",
          description:
            "One path is restricted; its undisclosed identity is not inferred.",
          count: { state: "not_disclosed" },
        },
        {
          omission_kind: "unknown",
          description: "Unprojected paths remain unknown rather than absent.",
          count: { state: "unknown" },
        },
        {
          omission_kind: "working_hidden",
          description:
            "Four additional WorkingCandidate relationships are hidden from the Current layer.",
          count: { state: "exact", value: 4 },
        },
        {
          omission_kind: "missing",
          description:
            "One exact destination is missing from the retained snapshot and is not inferred absent.",
          count: { state: "exact", value: 1 },
        },
      ],
    },
    nodes,
    relationships,
    paths,
    selection: {
      state: "selected",
      selection_kind: "node",
      selected_keys: ["node:claim-0"],
    },
    destinations: [
      {
        destination_key: "destination:brief",
        destination_kind: "brief",
        state: "available",
        owner: "project_brief_view",
        label: "Return to exact Brief focus",
        target_ref: record(focusId),
      },
      {
        destination_key: "destination:restricted",
        destination_kind: "details",
        state: "unavailable",
        owner: "project_object_location_view",
        label: "Restricted exact Details",
        reason: "The current actor cannot inspect this exact target.",
      },
      {
        destination_key: "destination:missing",
        destination_kind: "details",
        state: "unavailable",
        owner: "project_object_location_view",
        label: "Missing exact Details",
        reason:
          "The exact target is not represented in this retained snapshot.",
      },
    ],
    actions: [
      {
        action_key: "action:return",
        action_kind: "return_to_origin",
        semantic_key: "scientific.graph.return",
        label: "Return to exact Brief focus",
        consequence: "read_only_navigation",
        target_keys: ["node:claim-0"],
        availability: {
          state: "available",
          destination_key: "destination:brief",
        },
      },
    ],
    authority_boundary: {
      postgresql_authoritative: true,
      neo4j_rebuildable_projection: true,
      renderer_neutral: true,
      renderer_queries_projection: false,
      layout_grants_authority: false,
      selection_grants_authority: false,
      actions_issue_domain_mutation: false,
      correction_requires_canonical_owner: true,
      work_requires_typed_preview: true,
    },
    limitations: [
      "This fixture does not claim completeness, importance, confidence, or a universal performance threshold.",
      "WorkingCandidate event 40 is stale relative to PostgreSQL authority event 42.",
    ],
    exploration: {
      mode: "named_expansion",
      expansion_key: "expansion:trace-sources:dense-focus",
      recipe_semantic_key: "scientific.graph.trace-sources",
      recipe_label: "Trace recorded sources",
      target_ref: record(focusId),
      target_node_key: "node:claim-0",
      maximum_depth: 2,
      filters: {
        meaning_kinds: ["citation", "provenance"],
        directions: ["outgoing"],
        origins: ["canonical_record"],
      },
      accounting: {
        result_state: "partial",
        capped_members: { state: "exact", value: 8 },
        hidden_relationships: { state: "exact", value: 5 },
        restricted_paths: { state: "not_disclosed" },
        cycle_paths: { state: "exact", value: 2 },
        incomplete_paths: { state: "exact", value: 1 },
        unknown_paths: { state: "unknown" },
      },
    },
    groups: meaningSequence.map((meaning) => {
      const keys = relationships
        .filter((relationship) => relationship.meaning_kind === meaning)
        .map((relationship) => relationship.relationship_key);
      return {
        group_key: `group:meaning:${meaning}`,
        facet: "relationship_meaning" as const,
        label: `${predicate[meaning]} relationships`,
        membership_rule: `Exact returned ${meaning} relationships only.`,
        count_unit: "relationships" as const,
        layer: "current" as const,
        meaning_kind: meaning,
        member_relationship_keys: keys,
        returned_count: keys.length,
        total_count: { state: "unknown" as const },
        filtered_count: { state: "exact" as const, value: 0 },
        hidden_count: {
          state: "exact" as const,
          value: meaning === "citation" ? 5 : 0,
        },
        coverage: "partial" as const,
        overlap: false as const,
      };
    }) as PetraFocusedGraphViewV11["content"]["groups"],
  },
  content_hash: hash,
  read_at: "2026-09-16T06:30:00.000Z",
});

const definition = structuredClone(
  scientificDefinitionFixture,
) as PetraProjectDefinition;
definition.content.registrations.push({
  registration_kind: "extension",
  semantic_key: "scientific.graph.trace-sources",
  contract: {
    name: "petra.focused-graph-view",
    version: "1.1.0",
    content_hash: hash,
  },
});
definition.content.terms.push({
  semantic_key: "scientific.graph.trace-sources",
  singular: "Trace recorded sources",
  plural: "Trace recorded sources",
  definition:
    "Reveal recorded citation and provenance relationships within exact bounds.",
  generic_family: "task",
});

const entryFor = (
  view: PetraFocusedGraphViewV11,
  temporal: "current" | "historical_unknown",
): FocusedGraphEntry => ({
  project_id: projectId,
  request_id: view.content.task.request_id,
  question: view.content.task.question,
  focus_ref: record(focusId),
  origin: { origin_kind: "direct" },
  project_definition_ref: structuredClone(
    view.content.profile.project_definition_ref,
  ),
  task_semantic_key: "scientific.research-question",
  object_semantic_key: objectTerm.semantic_key,
  relationship_semantic_key: relationshipTerm.semantic_key,
  return_action_semantic_key: "scientific.graph.return",
  return_destination: view.content.destinations[0] as Extract<
    PetraFocusedGraphViewV11["content"]["destinations"][number],
    { state: "available" }
  >,
  limits: {
    ...structuredClone(view.content.scope.limits),
    maximum_depth: 1,
  },
  semantic_layer: temporal === "current" ? "current" : "historical",
  presentation: "position",
  expected_snapshot: structuredClone(view.content.requested_snapshot),
  ...(mode === "action"
    ? {
        action_preview_target: {
          action_kind: "governed_correction" as const,
          requested_change: "edit_relationship" as const,
          review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAP",
          review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAQ",
        },
      }
    : {}),
  ...(temporal === "historical_unknown"
    ? {
        historical_position: {
          snapshot: structuredClone(view.content.requested_snapshot),
          temporal_position: {
            position_kind: "historical" as const,
            dimension: "recorded_time" as const,
            at: {
              state: "exact" as const,
              value: "2025-01-01T00:00:00.000Z",
            },
          },
        },
      }
    : {}),
  return_context: {
    path: `/projects/${projectId}/brief#focus`,
    label: "Exact Brief focus",
    focus_id: "focus",
  },
});

const requestFor = (
  entry: FocusedGraphEntry,
  view: PetraFocusedGraphViewV11,
): FocusedGraphReadRequest => ({
  request_id: entry.request_id,
  task_kind: "neighborhood",
  task_semantic_key: entry.task_semantic_key,
  question: entry.question,
  focus_ref: structuredClone(entry.focus_ref),
  origin: structuredClone(entry.origin),
  project_definition_ref: {
    ...structuredClone(entry.project_definition_ref),
    record_hash: entry.project_definition_ref.record_hash!,
  },
  semantic_layer: entry.semantic_layer,
  temporal_position:
    entry.semantic_layer === "historical"
      ? structuredClone(entry.historical_position!.temporal_position)
      : { position_kind: "current", dimension: "project_snapshot" },
  object_semantic_key: entry.object_semantic_key,
  relationship_semantic_key: entry.relationship_semantic_key,
  return_action_semantic_key: entry.return_action_semantic_key,
  return_destination: structuredClone(entry.return_destination),
  limits: structuredClone(entry.limits),
  expected_snapshot: structuredClone(view.content.requested_snapshot),
});

const alignExpansion = (
  base: PetraFocusedGraphViewV11,
  request: FocusedGraphExplorationViewRequest,
): PetraFocusedGraphViewV11 => {
  const response = structuredClone(base);
  response.content.task.request_id = request.request_id;
  response.content.task.task_kind = request.task_kind;
  response.content.task.task_semantic_key = request.task_semantic_key;
  response.content.task.question = request.question;
  response.content.task.focus_refs = [structuredClone(request.focus_ref)];
  response.content.task.origin = structuredClone(request.origin);
  response.content.task.return_destination_key =
    request.return_destination.destination_key;
  response.content.profile.project_definition_ref = structuredClone(
    request.project_definition_ref,
  );
  response.content.requested_snapshot = structuredClone(
    request.expected_snapshot,
  );
  response.content.semantic_layer = request.semantic_layer;
  response.content.temporal_position = structuredClone(
    request.temporal_position,
  );
  response.content.scope.limits = structuredClone(request.limits);
  response.content.scope.included_relationship_semantics = [
    request.relationship_semantic_key,
  ];
  response.content.scope.directions = structuredClone(
    request.exploration.filters.directions,
  );
  response.content.exploration = {
    ...response.content.exploration,
    expansion_key: request.exploration.expansion_key,
    recipe_semantic_key: request.exploration.recipe_semantic_key,
    target_ref: structuredClone(request.exploration.target_ref),
    maximum_depth: request.exploration.maximum_depth,
    filters: structuredClone(request.exploration.filters),
  };
  return response;
};

const incompleteComparison = (): PetraFocusedGraphAnalysisView => {
  const before = denseView("current");
  const after = structuredClone(before);
  after.content.task.request_id =
    "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAZ";
  after.content.semantic_layer = "working";
  after.content.nodes[0]!.layer = "working";
  after.content.nodes[0]!.authority_position = "working_non_authority";
  const member = before.content.nodes[0]!;
  return {
    schema_name: "petra.focused-graph-analysis-view",
    schema_version: "1.0.0",
    project_id: projectId,
    content: {
      task: {
        analysis_request_id:
          "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
        request_hash: hash,
        task_kind: "comparison",
        question: "What differs across this incomplete bounded comparison?",
        question_hash: hash,
        focus_refs: [record(focusId)],
        position_keys: ["position:before", "position:after"],
      },
      positions: [
        {
          position_key: "position:before",
          label: "Current authority",
          role: "before",
          graph_view: before,
        },
        {
          position_key: "position:after",
          label: "Stale working base",
          role: "after",
          graph_view: after,
        },
      ],
      analysis: {
        analysis_kind: "comparison",
        before_position_key: "position:before",
        after_position_key: "position:after",
        common_base: {
          state: "unavailable",
          reason:
            "The stale working result does not supply one exact compatible base.",
        },
        differences: [
          {
            difference_key: "difference:unavailable:claim-0",
            difference_kind: "unavailable",
            before: {
              state: "exact",
              member_kind: "node",
              member_key: member.node_key,
              record_ref: structuredClone(member.record_ref),
              semantic_key: member.semantic_key,
              label: member.label,
              layer: member.layer,
              authority_position: member.authority_position,
            },
            after: {
              state: "unavailable",
              reason:
                "The stale working base cannot establish an exact difference.",
            },
            basis: "exact_server_comparison_of_returned_record_identity",
            limitations: [
              "No difference, absence, or currentness is inferred from this gap.",
            ],
          },
        ],
        coverage: "partial",
        limitations: [
          "The comparison remains incomplete until the canonical working owner supplies a compatible base.",
        ],
      },
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
      limitations: ["This is one bounded incomplete comparison."],
    },
    content_hash: hash,
    read_at: "2026-09-16T06:30:00.000Z",
  };
};

const suppliedImpact = (): PetraFocusedGraphAnalysisView => {
  const graphView = denseView("current");
  const member = graphView.content.nodes[0]!;
  return {
    schema_name: "petra.focused-graph-analysis-view",
    schema_version: "1.0.0",
    project_id: projectId,
    content: {
      task: {
        analysis_request_id:
          "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAX",
        request_hash: secondHash,
        task_kind: "impact",
        question:
          "What recorded dependencies and supplied consequences concern this exact Claim?",
        question_hash: secondHash,
        focus_refs: [record(focusId)],
        position_keys: ["position:impact"],
      },
      positions: [
        {
          position_key: "position:impact",
          label: "Exact bounded position",
          role: "context",
          graph_view: graphView,
        },
      ],
      analysis: {
        analysis_kind: "impact",
        position_key: "position:impact",
        dependency_source: structuredClone(
          impactSourceFixture,
        ) as unknown as Extract<
          PetraFocusedGraphAnalysisView["content"]["analysis"],
          { analysis_kind: "impact" }
        >["dependency_source"],
        assessed_consequences: {
          state: "supplied",
          items: [
            {
              consequence_key: "consequence:review:dense-claim:1",
              source: {
                schema_name: "petra.project-review-view",
                schema_version: "1.3.0",
                review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAW",
                content_hash: secondHash,
                read_at: "2026-09-16T06:30:00.000Z",
              },
              review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAX",
              source_kind: "review_member",
              summary:
                "The supplied Review member identifies one exact affected Claim relationship.",
              target_refs: [structuredClone(member.record_ref)],
              coverage: "exact_requested_review_member",
              limitations: [
                "This supplied consequence is not inferred from graph topology.",
              ],
            },
          ],
          coverage: "exact_requested_review_members",
          limitations: [
            "Only the exact requested Review member is represented.",
          ],
        },
        coverage: "complete",
        limitations: [
          "Recorded dependencies and supplied consequences remain separate facts.",
        ],
      },
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
        "This deterministic impact fixture exercises the production presentation only.",
      ],
    },
    content_hash: secondHash,
    read_at: "2026-09-16T06:30:00.000Z",
  };
};

const mode = new URLSearchParams(window.location.search).get("mode") ?? "dense";
window.wave5Mode = mode;
window.wave5Calls = [];
window.wave5Online = mode !== "offline";
Object.defineProperty(window.navigator, "onLine", {
  configurable: true,
  get: () => window.wave5Online,
});

let readSequence = 0;
const adverseRead: FocusedGraphExplorationRead = async (
  _projectId,
  _definition,
  request,
) => {
  readSequence += 1;
  const sequence = readSequence;
  window.wave5Calls.push({ requestId: request.request_id, settled: "pending" });
  if (mode === "offline" && sequence === 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    window.wave5Calls[sequence - 1]!.settled = "disconnected";
    throw new TypeError("The focused graph endpoint is offline.");
  }
  const delay = mode === "late" && sequence === 1 ? 220 : 25;
  await new Promise((resolve) => setTimeout(resolve, delay));
  window.wave5Calls[sequence - 1]!.settled =
    mode === "late" && sequence === 1 ? "older_last" : "accepted_candidate";
  const response = alignExpansion(denseView("catching_up"), request);
  if (mode === "stale" && sequence === 1) {
    response.content.requested_snapshot.snapshot_id =
      "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAE";
    response.content.requested_snapshot.event_position = 41;
  }
  return response;
};

const adverseActionRead: FocusedGraphActionPreviewRead = (
  exactProjectId,
  _definition,
  actionRequest,
) => {
  window.wave5ActionRequests.push(structuredClone(actionRequest));
  const selectedKey = actionRequest.selection.selected_keys[0];
  const selectedRelationship = view.content.relationships.find(
    (relationship) => relationship.relationship_key === selectedKey,
  );
  if (selectedRelationship === undefined) {
    throw new Error("The deterministic correction target is unavailable.");
  }
  const reviewMemberId =
    actionRequest.target.action_kind === "governed_correction"
      ? actionRequest.target.review_member_id
      : "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAQ";
  const reviewSessionId =
    actionRequest.target.action_kind === "governed_correction"
      ? actionRequest.target.review_session_id
      : "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAP";
  return Promise.resolve<PetraFocusedGraphActionPreviewView>({
    schema_name: "petra.focused-graph-action-preview-view",
    schema_version: "1.0.0",
    project_id: exactProjectId,
    content: {
      action_request_id: actionRequest.action_request_id,
      request_hash: secondHash,
      graph_view: structuredClone(view),
      selection: structuredClone(actionRequest.selection),
      preview: {
        preview_kind: "governed_correction",
        requested_change: "edit_relationship",
        selected_relationship: structuredClone(selectedRelationship),
        review_session_ref: {
          review_session_id: reviewSessionId,
          revision: 3,
          content_hash: hash,
          lifecycle: "open",
        },
        review_member_id: reviewMemberId,
        working_candidate_ref: {
          working_candidate_id: "working_candidate_01ARZ3NDEKTSV4RRFFQ69G5FAR",
          revision: 2,
          content_hash: hash,
        },
        working_relationship_refs: [
          {
            working_relationship_id:
              "working_relationship_01ARZ3NDEKTSV4RRFFQ69G5FAS",
            revision: 1,
            content_hash: hash,
          },
        ],
        review_view: {
          content: {
            members: [
              {
                review_member_id: reviewMemberId,
                candidate: {
                  kind_label: "Claim correction",
                  current: "The retained Claim before correction.",
                  proposed: "The exact candidate Claim under Review.",
                  difference: "One bounded relationship correction.",
                },
              },
            ],
          },
        } as unknown as FocusedGraphGovernedCorrectionPreview["review_view"],
        affected_scope: [
          "The selected relationship and its existing candidate/Review binding.",
        ],
        unchanged: [
          "Project authority, Review decision, and graph layout remain unchanged.",
        ],
        operation: {
          state: "preview_only",
          working_revision: "only_after_canonical_correction_submission",
          review_decision: "not_performed",
          authority_change: "only_after_validated_review_apply",
          cancellation: "closing_preview_leaves_domain_state_unchanged",
        },
      },
      return_context: {
        graph_request_id: view.content.task.request_id,
        selection: structuredClone(actionRequest.selection),
        origin: structuredClone(view.content.task.origin),
        destination: structuredClone(view.content.destinations[0]),
      },
      authority_boundary: {
        postgresql_authoritative: true,
        neo4j_projection_only: true,
        focused_graph_owner_reused: true,
        working_candidate_owner: "reused",
        review_owner: "reused",
        suggested_action_owner: "not_applicable",
        work_preview_owner: "not_applicable",
        preview_is_read_only: true,
        selection_grants_authority: false,
        renderer_state_accepted: false,
        command_issued: false,
        work_started: false,
      },
      limitations: [
        "Deterministic UX-FX25 transport exercises the production browser controller; it is not a live server response.",
      ],
    },
    content_hash: secondHash,
    read_at: "2026-09-16T06:30:00.000Z",
  });
};

let rendererAttempts = 0;
const adverseRenderer: FocusedGraphRendererFactory = (options) => {
  rendererAttempts += 1;
  if (mode === "renderer" && rendererAttempts === 1) {
    throw new Error("Synthetic renderer initialization failure.");
  }
  return createGraph(options);
};

const projectionState = (
  ["current", "catching_up", "unavailable", "rebuilding"].includes(mode)
    ? mode
    : "current"
) as FocusedGraphProjectionPosition["state"];
const temporal = mode === "historical" ? "historical_unknown" : "current";
const view = denseView(projectionState, temporal);
const entry = entryFor(view, temporal);
const data: FocusedGraphRouteData = {
  kind: "focused_graph",
  entry,
  definition,
  request: requestFor(entry, view),
  view,
};

window.wave5ActionRequests = [];
window.wave6InquirySaveRequests = [];
window.wave6InquiryRecoveryRequests = [];

type InquirySaveResult = Awaited<ReturnType<ProjectInquirySaveCommand>>;
type InquirySaveRecovery = Awaited<ReturnType<ProjectInquirySaveRecoveryRead>>;

const inquirySave: ProjectInquirySaveCommand = (_exactProjectId, request) => {
  window.wave6InquirySaveRequests.push(structuredClone(request));
  if (mode === "save-conflict") {
    throw new ProjectInquirySaveClientError(
      "The command identity is already bound to another exact request.",
      409,
      "PROJECT_INQUIRY_SAVE_CONFLICT",
    );
  }
  if (mode === "save-stale") {
    throw new ProjectInquirySaveClientError(
      "The focused Graph result no longer matches this save request.",
      409,
      "PROJECT_INQUIRY_SAVE_GRAPH_STALE",
    );
  }
  if (mode === "save-unknown" && window.wave6InquirySaveRequests.length === 1) {
    throw new TypeError("The response disconnected before delivery.");
  }
  const applied = window.wave6InquirySaveRequests.length === 1;
  return Promise.resolve({
    applied,
    receipt: {
      objective_ref: {
        objective_id: "objective_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
      },
      graph_binding: {
        snapshot_ref: structuredClone(view.content.requested_snapshot),
      },
    } as InquirySaveResult["receipt"],
    inquiry: {
      objective_id: "objective_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
    } as InquirySaveResult["inquiry"],
  });
};

const inquiryRecovery: ProjectInquirySaveRecoveryRead = (
  _exactProjectId,
  request,
) => {
  window.wave6InquiryRecoveryRequests.push(structuredClone(request));
  return Promise.resolve({
    effect: {
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      retry: {
        method: "POST",
        path: `/api/commands/projects/${projectId}/inquiries`,
        reuse_exact_request: true,
      },
    },
  } as InquirySaveRecovery);
};

const content =
  mode === "comparison" ? (
    <main className="reference-surface graph-surface" id="reference-main">
      <FocusedGraphAnalysisSurface view={incompleteComparison()} />
    </main>
  ) : mode === "impact" ? (
    <main className="reference-surface graph-surface" id="reference-main">
      <FocusedGraphAnalysisSurface view={suppliedImpact()} />
    </main>
  ) : (
    <FocusedGraphOrientationSurface
      data={data}
      explorationRead={adverseRead}
      actionPreviewRead={adverseActionRead}
      saveInquiry={inquirySave}
      assessInquirySave={inquiryRecovery}
      rendererFactory={adverseRenderer}
    />
  );

createRoot(document.getElementById("root")!).render(
  <MemoryRouter initialEntries={[window.location.href]}>
    {content}
  </MemoryRouter>,
);
