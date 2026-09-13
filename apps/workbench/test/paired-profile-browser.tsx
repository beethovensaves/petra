// Synthetic transport conformance harness; never imported by the production router.
import type {
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectRelationshipOverlayView,
  PetraProjectReviewViewV120,
  PetraProjectReviewViewV130,
  PetraProjectShellViewV11,
  PetraReviewRecoveryAssessment,
} from "@petra/contracts";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createMemoryRouter,
  type RouteObject,
} from "react-router";

import controlledGoverningFixture from "../../../packages/contracts/fixtures/accepted/controlled-writing-governing-relationship.json";
import controlledRequirementFixture from "../../../packages/contracts/fixtures/accepted/controlled-writing-requirement.json";
import controlledDefinitionFixture from "../../../packages/contracts/fixtures/accepted/project-definition-controlled-writing.json";
import controlledObjectiveFixture from "../../../packages/contracts/fixtures/accepted/project-objective-controlled-writing.json";
import controlledProjectFixture from "../../../packages/contracts/fixtures/accepted/project-controlled-writing.json";
import scientificReviewFixture from "../../../packages/contracts/fixtures/accepted/review-recovery-assessment.json";
import scientificShellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json";
import { GraphRoute } from "../src/product/GraphSurface.js";
import { ProjectShell, RouteError } from "../src/product/ReferenceWorkbench.js";
import { ReviewSessionRoute } from "../src/product/ReviewSurface.js";
import {
  loadProjectRecord,
  loadProjectRelationshipOverlayGraph,
  loadProjectReviewSession,
} from "../src/product/project-data.js";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/review-graph.css";

const scientificShell = structuredClone(
  scientificShellFixture,
) as unknown as PetraProjectShellViewV11;
const controlledProject = structuredClone(
  controlledProjectFixture,
) as PetraProject;
const controlledDefinition = structuredClone(
  controlledDefinitionFixture,
) as PetraProjectDefinition;
const controlledObjective = structuredClone(
  controlledObjectiveFixture,
) as PetraProjectObjective;
const controlledRequirement = structuredClone(
  controlledRequirementFixture,
) as PetraControlledWritingRequirement;
const controlledGoverning = structuredClone(
  controlledGoverningFixture,
) as PetraControlledWritingGoverningRelationship;
const scientificRecovery = structuredClone(
  scientificReviewFixture,
) as unknown as PetraReviewRecoveryAssessment;

const controlledShell = (): PetraProjectShellViewV11 => {
  const shell = structuredClone(scientificShell);
  shell.project_id = controlledProject.project_id;
  shell.content.project = {
    project_id: controlledProject.project_id,
    revision: controlledProject.revision,
    name: controlledProject.name,
    description: controlledProject.description ?? "Controlled writing Project",
    status: controlledProject.status,
    updated_at: controlledProject.updated_at,
  };
  shell.content.definition = {
    project_definition_id: controlledDefinition.project_definition_id,
    revision: controlledDefinition.revision,
    content_hash: controlledDefinition.content_hash,
    definition_family: controlledDefinition.definition_family,
    label: controlledDefinition.content.label,
    description: controlledDefinition.content.description,
    kernel_compatibility: controlledDefinition.content.kernel_compatibility,
    terms: structuredClone(controlledDefinition.content.terms),
    supported_places: structuredClone(
      controlledDefinition.content.supported_places,
    ),
  };
  shell.content.current_objective = {
    objective_id: controlledObjective.objective_id,
    revision: controlledObjective.revision,
    content_hash: controlledObjective.content_hash,
    objective_kind: controlledObjective.content.objective_kind,
    statement: controlledObjective.content.statement,
    status: controlledObjective.content.status,
  };
  shell.content.authority = {
    isolation: "repeatable_read",
    event_position: 12,
    stream_revision: 5,
  };
  shell.content.projection = {
    state: "current",
    label: "Projection current",
    detail:
      "The rendered conformance position matches the supplied authority position.",
    checkpoint_ref: {
      record_id: "projection_checkpoint_01K4E000000000000000000012",
      revision: 1,
      content_hash: `sha256:${"c".repeat(64)}`,
    },
    represented_event_position: 12,
    observed_event_position: 12,
    pending_records: 0,
  };
  shell.content.attention = [];
  shell.content.place_summaries = shell.content.place_summaries.map((place) =>
    place.role === "sources"
      ? {
          ...place,
          label: "Authority sources",
          summary: "One exact authority source is supplied to this scenario.",
        }
      : place,
  ) as typeof shell.content.place_summaries;
  delete shell.content.selection;
  shell.content_hash = `sha256:${"d".repeat(64)}`;
  shell.read_at = "2026-09-13T15:30:00.000Z";
  return shell;
};

const scientificReview = {
  schema_name: "petra.project-review-view",
  schema_version: "1.2.0",
  project_id: scientificRecovery.project_id,
  review_session_id:
    scientificRecovery.content.review_session.review_session_id,
  content: structuredClone(scientificRecovery.content.review),
  content_hash: `sha256:${"e".repeat(64)}`,
  read_at: "2026-09-13T15:30:00.000Z",
} as unknown as PetraProjectReviewViewV120;

const controlledReview = (): PetraProjectReviewViewV130 => {
  const view = structuredClone(
    scientificReview,
  ) as unknown as PetraProjectReviewViewV130;
  const member = view.content.members[0];
  const definitionRef = controlledRequirement.project_definition_ref;
  view.schema_version = "1.3.0";
  view.project_id = controlledProject.project_id;
  view.review_session_id = "review_session_01K4E000000000000000000009";
  view.content.session.title = "Review the controlled-writing Requirement";
  view.content.session.objective_summary =
    "Inspect the exact Requirement and governing relationship without implying a writing Apply path.";
  view.content.session.project_definition_ref = {
    record_id: definitionRef.project_definition_id,
    revision: definitionRef.revision,
    content_hash: definitionRef.content_hash,
  };
  view.content.session.project_definition_label =
    controlledDefinition.content.label;
  view.content.session.responsible = {
    actor_id: controlledRequirement.created_by.actor_id,
    display_name: "Project author",
  };
  view.content.session.snapshot = {
    event_position: 12,
    stream_revision: 5,
    captured_at: "2026-09-13T15:25:00.000Z",
  };
  view.content.session.origin = {
    origin_kind: "direct_edit",
    record_refs: [controlledRequirement.requirement_id],
    label: "Human-authored proposal",
    detail: "Created from the exact controlled-writing working records.",
  };
  view.content.session.return_context = {
    place: "work",
    object_ref: "work_unit_01K4E000000000000000000010",
    label: "Requirement proposal work",
  };
  member.review_member_id = "review_member_01K4E000000000000000000011";
  member.candidate = {
    candidate_id: member.review_member_id,
    revision_label:
      "Requirement revision 1 · Governing relationship revision 1",
    kind_label: "Requirement and governing link",
    current: "No authoritative controlled-writing representation is installed",
    proposed: controlledRequirement.content.statement,
    difference:
      "Adds one non-authoritative Requirement and its exact GOVERNS relationship to Review. No controlled-writing mutation operation or Apply path is installed.",
    origin_label: "Project author",
    origin_detail: "Direct edit · retained human producer provenance",
    profile_payload: {
      payload_kind: "controlled_writing_requirement",
      requirement_ref: {
        ...structuredClone(controlledGoverning.content.requirement_ref),
        schema_name: "petra.controlled-writing-requirement",
        schema_version: "1.0.0",
      },
      governing_relationship_ref: {
        schema_name: "petra.controlled-writing-governing-relationship",
        schema_version: "1.0.0",
        record_id: controlledGoverning.governing_relationship_id,
        revision: controlledGoverning.revision,
        record_hash: `sha256:${"f".repeat(64)}`,
      },
      authority_source_ref: {
        schema_name: "petra.project-source",
        schema_version: "1.0.0",
        record_id: controlledGoverning.content.authority_source_ref.record_id,
        revision: controlledGoverning.content.authority_source_ref.revision,
        record_hash:
          controlledGoverning.content.authority_source_ref.record_hash,
      },
      requirement_kind: controlledRequirement.content.requirement_kind,
      relationship_predicate: "GOVERNS",
      apply_available: false,
    },
  };
  member.working_state.candidate.project_id = controlledProject.project_id;
  member.working_state.candidate.project_definition_ref = definitionRef;
  member.working_state.candidate.profile_object.registration = {
    registration_kind: "object_schema",
    semantic_key: "writing.requirement",
    contract: {
      name: "petra.controlled-writing-requirement",
      version: "1.0.0",
      content_hash:
        "sha256:5a6d449b44078f2df1c2f29fe15164d22b0c4151a05c6f35dd8718964c3c3f1e",
    },
  };
  member.working_state.relationships[0].project_id =
    controlledProject.project_id;
  member.working_state.relationships[0].project_definition_ref = definitionRef;
  member.working_state.relationships[0].profile_relationship.registration = {
    registration_kind: "relationship_schema",
    semantic_key: "writing.governs",
    contract: {
      name: "petra.controlled-writing-governing-relationship",
      version: "1.0.0",
      content_hash:
        "sha256:8875324fac5a6911a90aaf833289d0cc5ae2141c10f023d087a1cd876bd9e896",
    },
  };
  member.working_state.relationships[0].profile_relationship.predicate =
    "GOVERNS";
  member.basis = [
    {
      basis_id: controlledGoverning.content.authority_source_ref.record_id,
      label: "Authority source",
      relation: "Governing link",
      extent: "Constraint",
      detail: controlledGoverning.content.rationale,
      project_source_id:
        controlledGoverning.content.authority_source_ref.record_id,
      project_source_status: "active",
    },
  ];
  member.validation = {
    state: "needs_judgment",
    label: "Validation pending",
    detail:
      "The exact controlled-writing working records remain pending validation. Review inclusion does not approve the Requirement or create an Apply path.",
  };
  member.consequences = [
    "The exact Requirement remains non-authoritative working state.",
    "No controlled-writing ChangeSet operation, Approval, or Apply path is installed.",
    "Review composition leaves the authority source, producer provenance, and Project authority unchanged.",
  ];
  member.change_sets = [];
  view.content.authority = {
    isolation: "repeatable_read",
    event_position: 12,
    stream_revision: 5,
  };
  view.content.projection = {
    state: "unavailable",
    reason: "No controlled-writing projection instruction exists.",
  };
  view.content_hash = `sha256:${"1".repeat(64)}`;
  return view;
};

const relationshipOverlay = ({
  projectId,
  definitionId,
  definitionHash,
  definitionFamily,
  profileLabel,
  sourceTerm,
  objectTerm,
  relationshipTerm,
  sourceLabel,
  candidateLabel,
  predicateLabel,
  limitation,
}: {
  projectId: string;
  definitionId: string;
  definitionHash: string;
  definitionFamily: string;
  profileLabel: string;
  sourceTerm: string;
  objectTerm: string;
  relationshipTerm: string;
  sourceLabel: string;
  candidateLabel: string;
  predicateLabel: string;
  limitation: string;
}): PetraProjectRelationshipOverlayView => {
  const definitionRef = {
    project_definition_id: definitionId,
    revision: 1,
    content_hash: definitionHash,
    record_hash: `sha256:${"2".repeat(64)}`,
    definition_family: definitionFamily,
  };
  const sourceId =
    definitionFamily === "petra.controlled-writing"
      ? controlledGoverning.content.authority_source_ref.record_id
      : "work_version_01K4D000000000000000000001";
  const focusRef = {
    record_id: sourceId,
    revision: 1,
    record_hash: `sha256:${"3".repeat(64)}`,
  };
  const sourceKey = `current:${sourceId}:1:sha256:${"3".repeat(64)}`;
  const candidateId =
    definitionFamily === "petra.controlled-writing"
      ? "working_candidate_01K4E000000000000000000007"
      : "working_candidate_01K4D000000000000000000002";
  const candidateKey = `working:${candidateId}:1:sha256:${"4".repeat(64)}`;
  const relationshipKey = `working:${definitionFamily}:sha256:${"5".repeat(64)}`;
  const nodes = [
    {
      node_key: sourceKey,
      layer: "current",
      owner: {
        owner_kind: "authoritative_record",
        record_ref: focusRef,
      },
      object_kind: "artifact",
      object_term: sourceTerm,
      label: sourceLabel,
      summary: `The exact current ${sourceTerm.toLocaleLowerCase()} in this bounded result.`,
      basis: "Supplied current authority position.",
      lifecycle: "represented",
    },
    {
      node_key: candidateKey,
      layer: "working",
      owner: {
        owner_kind: "working_candidate",
        working_candidate_ref: {
          working_candidate_id: candidateId,
          revision: 1,
          content_hash: `sha256:${"4".repeat(64)}`,
          record_hash: `sha256:${"4".repeat(64)}`,
        },
      },
      profile_record_ref: {
        record_id:
          definitionFamily === "petra.controlled-writing"
            ? controlledRequirement.requirement_id
            : "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
        revision: 1,
        record_hash: `sha256:${"6".repeat(64)}`,
      },
      object_term: objectTerm,
      label: candidateLabel,
      summary: `The exact non-authoritative working ${objectTerm.toLocaleLowerCase()}.`,
      basis: "Retained exact working-state basis and producer provenance.",
      validation_summary:
        "Validation is pending; this does not grant authority.",
      endpoint_posture: "current_working_head",
    },
  ];
  const relationships = [
    {
      relationship_key: relationshipKey,
      layer: "working",
      owner: {
        owner_kind: "working_relationship",
        working_relationship_ref: {
          working_relationship_id:
            "working_relationship_01K4E000000000000000000008",
          revision: 1,
          content_hash: `sha256:${"5".repeat(64)}`,
          record_hash: `sha256:${"5".repeat(64)}`,
        },
      },
      profile_record_ref: {
        record_id:
          definitionFamily === "petra.controlled-writing"
            ? controlledGoverning.governing_relationship_id
            : "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
        revision: 1,
        record_hash: `sha256:${"7".repeat(64)}`,
      },
      source_node_key: sourceKey,
      target_node_key: candidateKey,
      target_endpoint_posture: "current_working_head",
      direction: "outgoing",
      relation_class: "representation",
      relationship_term: relationshipTerm,
      label: predicateLabel,
      summary: `The exact working ${relationshipTerm.toLocaleLowerCase()} retains both endpoints.`,
      meaning: `${predicateLabel} is working structure, not truth, approval, or authority.`,
      scope: "The exact working input snapshot.",
      basis: "Working relationship revision 1.",
      validation_summary:
        "Validation is pending; this does not grant authority.",
    },
  ];
  return {
    schema_name: "petra.project-relationship-overlay-view",
    schema_version: "1.0.0",
    project_id: projectId,
    content: {
      query: {
        request_hash: `sha256:${"8".repeat(64)}`,
        query_kind: "scientific_provenance_working_overlay",
        question: `Which exact ${sourceTerm.toLocaleLowerCase()} is linked to this working ${objectTerm.toLocaleLowerCase()}?`,
        scope: "One bounded current-to-working relationship.",
        authoritative_focus_ref: structuredClone(focusRef),
        maximum_authoritative_depth: 3,
        working_selection:
          "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints",
      },
      profile: {
        project_definition_ref: definitionRef,
        label: profileLabel,
        object_term: {
          semantic_key:
            definitionFamily === "petra.controlled-writing"
              ? "writing.requirement"
              : "scientific.claim",
          singular: objectTerm,
          plural: `${objectTerm}s`,
          definition: `Definition-resolved ${objectTerm.toLocaleLowerCase()} term.`,
        },
        relationship_term: {
          semantic_key:
            definitionFamily === "petra.controlled-writing"
              ? "writing.governs"
              : "scientific.assertion",
          singular: relationshipTerm,
          plural: `${relationshipTerm}s`,
          definition: `Definition-resolved ${relationshipTerm.toLocaleLowerCase()} term.`,
        },
        source_term: {
          semantic_key:
            definitionFamily === "petra.controlled-writing"
              ? "writing.authority-source"
              : "scientific.literature",
          singular: sourceTerm,
          plural: `${sourceTerm}s`,
          definition: `Definition-resolved ${sourceTerm.toLocaleLowerCase()} term.`,
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
            content_hash: `sha256:${"9".repeat(64)}`,
            read_at: "2026-09-13T15:29:59.000Z",
          },
          authority: { event_position: 12, stream_revision: 5 },
          projection: {
            checkpoint_ref: {
              record_id: "projection_checkpoint_01K4E000000000000000000012",
              revision: 1,
              content_hash: `sha256:${"a".repeat(64)}`,
            },
            state: "current",
            represented_event_position: 12,
            represented_stream_revision: 5,
            represented_target_sequence: 7,
            observed_event_position: 12,
            observed_stream_revision: 5,
            observed_target_sequence: 7,
            pending_records: 0,
            detail:
              "The projection represents the supplied authority position.",
          },
        },
        working: {
          snapshot_ref: {
            schema_name: "petra.project-working-state-snapshot",
            schema_version: "1.0.0",
            content_hash: `sha256:${"b".repeat(64)}`,
            read_at: "2026-09-13T15:30:00.000Z",
          },
          base_authority: { event_position: 12, stream_revision: 5 },
          project_definition_ref: definitionRef,
          selection_kind:
            "current_heads_plus_exact_referenced_working_revisions",
          historical_working_revisions_included: "referenced_only",
          authoritative_records_included: false,
        },
      },
      nodes,
      relationships,
      completeness: {
        state:
          "complete_for_selected_authoritative_path_and_relevant_working_heads",
        scope:
          "Complete for the two returned objects and their one exact working relationship.",
        authoritative_nodes: 1,
        authoritative_relationships: 0,
        current_working_candidate_heads: 1,
        current_working_relationship_heads: 1,
        returned_working_candidate_revisions: 1,
        returned_working_relationships: 1,
        referenced_non_current_working_candidate_revisions: 0,
        returned_nodes: 2,
        returned_relationships: 1,
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
          "Historical authority, expansion, comparison, and continuation are not included.",
        ],
      },
      textual_peer: {
        title: `${profileLabel}: relationship layers`,
        scope: "Textual peer for every returned object and relationship.",
        completeness: "complete_for_every_returned_node_and_relationship",
        nodes: nodes.map((node) => ({
          node_key: node.node_key,
          layer: node.layer,
          object_term: node.object_term,
          label: node.label,
          summary: node.summary,
          basis: node.basis,
        })),
        relationships: relationships.map((relationship) => ({
          relationship_key: relationship.relationship_key,
          layer: relationship.layer,
          source_node_key: relationship.source_node_key,
          source_label: sourceLabel,
          direction: relationship.direction,
          label: relationship.label,
          target_node_key: relationship.target_node_key,
          target_label: candidateLabel,
          summary: relationship.summary,
          meaning: relationship.meaning,
          scope: relationship.scope,
          basis: relationship.basis,
        })),
        omissions: [
          "Historical authority, expansion, comparison, and continuation are not included.",
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
      limitations: [limitation],
    },
    content_hash: `sha256:${"c".repeat(64)}`,
    read_at: "2026-09-13T15:30:00.000Z",
  } as unknown as PetraProjectRelationshipOverlayView;
};

const scientificOverlay = relationshipOverlay({
  projectId: scientificShell.project_id,
  definitionId: scientificShell.content.definition.project_definition_id,
  definitionHash: scientificShell.content.definition.content_hash,
  definitionFamily: scientificShell.content.definition.definition_family,
  profileLabel: scientificShell.content.definition.label,
  sourceTerm: "Source",
  objectTerm: "Claim",
  relationshipTerm: "Evidence relationship",
  sourceLabel: "Exact results passage",
  candidateLabel: "Working measurable-improvement Claim",
  predicateLabel: "asserts",
  limitation: "This browser scenario is bounded to one scientific path.",
});
const writingShell = controlledShell();
const writingOverlay = relationshipOverlay({
  projectId: writingShell.project_id,
  definitionId: writingShell.content.definition.project_definition_id,
  definitionHash: writingShell.content.definition.content_hash,
  definitionFamily: writingShell.content.definition.definition_family,
  profileLabel: writingShell.content.definition.label,
  sourceTerm: "Authority source",
  objectTerm: "Requirement",
  relationshipTerm: "Governing link",
  sourceLabel: "Exact operating authority source",
  candidateLabel: controlledRequirement.content.statement,
  predicateLabel: "governs",
  limitation:
    "Controlled-writing overlay transport is not installed; this scenario exercises the production mapper and renderer only.",
});
const writingReview = controlledReview();

const testWindow = window as unknown as {
  pairedCalls: Array<{
    url: string;
    method: string;
    authorization: string | null;
  }>;
  pairedConsoleErrors: string[];
  pairedRouter: ReturnType<typeof createMemoryRouter>;
};
testWindow.pairedCalls = [];
testWindow.pairedConsoleErrors = [];
const originalError = console.error;
console.error = (...values: unknown[]) => {
  testWindow.pairedConsoleErrors.push(values.map(String).join(" "));
  originalError(...values);
};
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const raw = input instanceof Request ? input.url : input.toString();
  if (!raw.includes("/api/")) return realFetch(input, init);
  const headers = new Headers(init?.headers);
  testWindow.pairedCalls.push({
    url: raw,
    method: init?.method ?? "GET",
    authorization: headers.get("authorization"),
  });
  const path = new URL(raw, window.location.origin).pathname;
  const projectId = path.includes(writingShell.project_id)
    ? writingShell.project_id
    : scientificShell.project_id;
  if (path === `/api/queries/projects/${projectId}/shell`) {
    return Response.json(
      projectId === writingShell.project_id ? writingShell : scientificShell,
    );
  }
  if (path.endsWith("/relationship-overlay")) {
    return Response.json(
      projectId === writingShell.project_id
        ? writingOverlay
        : scientificOverlay,
    );
  }
  if (path.endsWith(`/reviews/${writingReview.review_session_id}`)) {
    return Response.json(writingReview);
  }
  if (path.endsWith(`/reviews/${scientificReview.review_session_id}`)) {
    return Response.json(scientificReview);
  }
  return Response.json({}, { status: 404 });
};

const routes: RouteObject[] = [
  {
    path: "/projects/:projectId",
    loader: loadProjectRecord,
    element: <ProjectShell />,
    errorElement: <RouteError />,
    children: [
      {
        path: "graph",
        loader: loadProjectRelationshipOverlayGraph,
        element: <GraphRoute />,
      },
      {
        path: "review/:reviewId",
        loader: loadProjectReviewSession,
        element: <ReviewSessionRoute />,
      },
    ],
  },
];
const pairedRouter = createMemoryRouter(routes, {
  initialEntries: [
    `/projects/${scientificShell.project_id}/graph?layer=working`,
  ],
});
testWindow.pairedRouter = pairedRouter;
createRoot(document.getElementById("root")!).render(
  <div className="reference-app">
    <RouterProvider router={pairedRouter} />
  </div>,
);
