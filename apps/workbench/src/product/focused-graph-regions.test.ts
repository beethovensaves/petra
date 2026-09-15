import type { FocusedGraphTerm, PetraFocusedGraphView } from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  FocusedGraphRegionError,
  focusedGraphRegionsFromView,
} from "./focused-graph-regions.js";

const hash = `sha256:${"a".repeat(64)}`;
const record = (recordId: string) => ({
  record_id: recordId,
  revision: 1,
  record_hash: hash,
});
const term = (
  semanticKey: string,
  genericFamily: FocusedGraphTerm["generic_family"],
  singular: string,
): FocusedGraphTerm => ({
  semantic_key: semanticKey,
  singular,
  plural: `${singular}s`,
  definition: `${singular} meaning resolved by the exact profile.`,
  generic_family: genericFamily,
});

const focusedGraphView = (): PetraFocusedGraphView => {
  const taskTerm = term("scientific.research-question", "focus", "Question");
  const objectTerm = term("scientific.claim", "finding", "Claim");
  const relationshipTerm = term(
    "scientific.support",
    "relationship",
    "Support relationship",
  );
  const actionTerm = term(
    "scientific.graph.return",
    "task",
    "Return to evidence",
  );
  return {
    schema_name: "petra.focused-graph-view",
    schema_version: "1.0.0",
    project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    content: {
      task: {
        request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
        request_hash: hash,
        task_kind: "provenance",
        task_semantic_key: taskTerm.semantic_key,
        question: "Which exact basis supports this Claim?",
        question_hash: hash,
        focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
        origin: {
          origin_kind: "evidence",
          origin_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
        },
        return_destination_key: "destination:evidence",
      },
      profile: {
        project_definition_ref: {
          project_definition_id:
            "project_definition_01K4C000000000000000000001",
          revision: 2,
          content_hash: hash,
          record_hash: hash,
          definition_family: "petra.scientific-evidence",
        },
        kernel_compatibility: "petra.project-kernel@1.0.0",
        label: "Scientific evidence inquiry",
        focused_graph_registration: {
          semantic_key: "petra.focused-graph",
          registration_kind: "extension",
          contract: {
            name: "petra.focused-graph-view",
            version: "1.0.0",
            content_hash: hash,
          },
        },
        resolved_semantics: [
          {
            semantic_key: taskTerm.semantic_key,
            role: "task",
            registration_kind: "objective_schema",
            contract: {
              name: "petra.project-objective",
              version: "1.0.0",
              content_hash: hash,
            },
            term: taskTerm,
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
          {
            semantic_key: actionTerm.semantic_key,
            role: "action",
            registration_kind: "extension",
            contract: {
              name: "petra.focused-graph-view",
              version: "1.0.0",
              content_hash: hash,
            },
            term: actionTerm,
          },
        ],
      },
      source_views: [
        {
          schema_name: "petra.project-relationship-view",
          schema_version: "1.0.0",
          content_hash: hash,
          read_at: "2026-09-15T20:00:00.000Z",
        },
      ],
      requested_snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
        revision: 1,
        event_position: 12,
        content_hash: hash,
      },
      represented_snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
        revision: 1,
        event_position: 12,
        content_hash: hash,
      },
      semantic_layer: "current",
      temporal_position: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      projection_position: {
        authority_source: "postgresql",
        projection_source: "neo4j_rebuildable_projection",
        state: "current",
        checkpoint_ref: record(
          "projection_checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAE",
        ),
        represented_event_position: 12,
        observed_event_position: 12,
        pending_records: 0,
        detail: "The bounded projection represents the requested snapshot.",
      },
      scope: {
        description: "One exact Claim relationship at depth one.",
        included_relationship_semantics: [relationshipTerm.semantic_key],
        directions: ["outgoing"],
        included_layers: ["current"],
        limits: {
          maximum_depth: 1,
          maximum_nodes: 2,
          maximum_relationships: 1,
          maximum_paths: 1,
        },
        coverage: "complete_for_scope",
        omissions: [
          {
            omission_kind: "out_of_scope",
            description: "Whole-Project traversal is outside this result.",
            count: { state: "unknown" },
          },
        ],
      },
      nodes: [
        {
          node_key: "node:claim-a",
          record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
          semantic_key: objectTerm.semantic_key,
          term: objectTerm,
          label: "Claim A",
          summary: "The selected Claim.",
          layer: "current",
          authority_position: "current_authority",
          lifecycle: "represented",
          basis: {
            summary: "Canonical Project record.",
            record_refs: [record("source_span_01ARZ3NDEKTSV4RRFFQ69G5FAF")],
            limitations: [],
          },
          destination_keys: ["destination:details"],
        },
        {
          node_key: "node:claim-b",
          record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAG"),
          semantic_key: objectTerm.semantic_key,
          term: objectTerm,
          label: "Claim B",
          summary: "A related Claim.",
          layer: "current",
          authority_position: "current_authority",
          lifecycle: "represented",
          basis: {
            summary: "Canonical Project record.",
            record_refs: [],
            limitations: [],
          },
          destination_keys: [],
        },
      ],
      relationships: [
        {
          relationship_key: "relationship:support-a",
          relationship_ref: {
            element_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FAH",
            revision: 1,
            record_hash: hash,
          },
          semantic_key: relationshipTerm.semantic_key,
          term: relationshipTerm,
          predicate: "SUPPORTS",
          meaning_kind: "support",
          source_node_key: "node:claim-a",
          target_node_key: "node:claim-b",
          direction: "outgoing",
          origin: "canonical_record",
          layer: "current",
          authority_position: "current_authority",
          summary: "A registered supporting relationship.",
          basis: {
            summary: "Exact recorded relationship basis.",
            record_refs: [record("source_span_01ARZ3NDEKTSV4RRFFQ69G5FAF")],
            limitations: ["One recorded basis is represented."],
          },
          destination_keys: ["destination:source"],
        },
      ],
      paths: [
        {
          path_key: "path:support-a",
          state: "complete",
          ordering_rationale: "The exact recorded endpoint order.",
          steps: [
            {
              position: 1,
              from_node_key: "node:claim-a",
              relationship_key: "relationship:support-a",
              to_node_key: "node:claim-b",
              traversal_direction: "outgoing",
              repeated_member: false,
            },
          ],
          limitations: [],
        },
      ],
      selection: {
        state: "selected",
        selection_kind: "node",
        selected_keys: ["node:claim-a"],
      },
      destinations: [
        {
          destination_key: "destination:evidence",
          destination_kind: "evidence",
          state: "available",
          owner: "project_relationship_view",
          label: "Return to Evidence",
          target_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
        },
        {
          destination_key: "destination:details",
          destination_kind: "details",
          state: "available",
          owner: "project_object_location_view",
          label: "Open Claim details",
          target_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
        },
        {
          destination_key: "destination:source",
          destination_kind: "source_inspection",
          state: "available",
          owner: "project_source_view",
          label: "Open exact source",
          target_ref: record("source_span_01ARZ3NDEKTSV4RRFFQ69G5FAF"),
        },
      ],
      actions: [
        {
          action_key: "action:return",
          action_kind: "return_to_origin",
          semantic_key: actionTerm.semantic_key,
          label: "Return to Evidence",
          consequence: "read_only_navigation",
          target_keys: ["node:claim-a"],
          availability: {
            state: "available",
            destination_key: "destination:evidence",
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
        "This result supplies semantic membership and no renderer geometry.",
      ],
    },
    content_hash: hash,
    read_at: "2026-09-15T20:00:00.000Z",
  };
};

describe("focused graph renderer-neutral region conformance", () => {
  it("feeds every frozen region from the same exact semantic members", () => {
    const view = focusedGraphView();
    const regions = focusedGraphRegionsFromView(view);
    const relationship = view.content.relationships[0];
    const source = view.content.nodes[0];
    const target = view.content.nodes[1];
    const path = view.content.paths[0];

    expect(regions.graph.nodes).toBe(view.content.nodes);
    expect(regions.textualPeer.nodes).toBe(view.content.nodes);
    expect(regions.graph.relationships).toBe(view.content.relationships);
    expect(regions.textualPeer.relationships).toBe(view.content.relationships);
    expect(regions.graph.paths).toBe(view.content.paths);
    expect(regions.textualPeer.paths).toBe(view.content.paths);
    expect(regions.evidenceMatrix.rows[0]).toEqual({
      relationship,
      source,
      target,
      paths: [path],
    });

    expect(regions.details.selectedMembers).toEqual([
      { selectionKind: "node", member: source },
    ]);
    expect(regions.details.nodeTargets.get(source?.node_key ?? "")).toEqual({
      target: source,
      destinations: [view.content.destinations[1]],
    });
    expect(
      regions.details.relationshipTargets.get(
        relationship?.relationship_key ?? "",
      ),
    ).toEqual({
      target: relationship,
      destinations: [view.content.destinations[2]],
    });

    expect(regions.orientation.task).toBe(view.content.task);
    expect(regions.origin).toBe(view.content.task.origin);
    expect(regions.returnRegion.destination).toBe(view.content.destinations[0]);
    expect(regions.returnRegion.action).toBe(view.content.actions[0]);
    expect(regions.authority.requestedSnapshot).toBe(
      view.content.requested_snapshot,
    );
    expect(regions.authority.representedSnapshot).toBe(
      view.content.represented_snapshot,
    );
    expect(regions.authority.projectionPosition).toBe(
      view.content.projection_position,
    );
    expect(regions.authority.boundary).toBe(view.content.authority_boundary);
    expect(regions.evidenceMatrix.omissions).toBe(view.content.scope.omissions);

    expect("position" in (regions.graph.nodes[0] ?? {})).toBe(false);
    expect("tone" in (regions.graph.relationships[0] ?? {})).toBe(false);
    expect("query" in regions.graph).toBe(false);
    expect("command" in regions).toBe(false);
  });

  it("accepts profile-resolved terminology without hard-coded scientific meaning", () => {
    const view = focusedGraphView();
    const requirementTerm = term(
      "controlled-writing.requirement",
      "finding",
      "Requirement",
    );
    const governsTerm = term(
      "controlled-writing.governs",
      "relationship",
      "Governs",
    );
    view.content.profile.label = "Controlled writing inquiry";
    view.content.profile.project_definition_ref.definition_family =
      "petra.controlled-writing";
    const objectSemantic = view.content.profile.resolved_semantics.find(
      (semantic) => semantic.role === "object",
    );
    const relationshipSemantic = view.content.profile.resolved_semantics.find(
      (semantic) => semantic.role === "relationship",
    );
    if (objectSemantic === undefined || relationshipSemantic === undefined) {
      throw new Error("Expected resolved object and relationship semantics.");
    }
    objectSemantic.semantic_key = requirementTerm.semantic_key;
    objectSemantic.term = requirementTerm;
    objectSemantic.contract.name = "petra.controlled-writing-requirement";
    relationshipSemantic.semantic_key = governsTerm.semantic_key;
    relationshipSemantic.term = governsTerm;
    relationshipSemantic.contract.name =
      "petra.controlled-writing-governing-relationship";
    view.content.nodes.forEach((node) => {
      node.semantic_key = requirementTerm.semantic_key;
      node.term = requirementTerm;
    });
    view.content.relationships.forEach((relationship) => {
      relationship.semantic_key = governsTerm.semantic_key;
      relationship.term = governsTerm;
      relationship.predicate = "GOVERNS";
      relationship.meaning_kind = "governance";
    });
    view.content.scope.included_relationship_semantics = [
      governsTerm.semantic_key,
    ];

    const regions = focusedGraphRegionsFromView(view);

    expect(regions.orientation.profile.label).toBe(
      "Controlled writing inquiry",
    );
    expect(regions.graph.nodes[0]?.term).toBe(requirementTerm);
    expect(regions.textualPeer.relationships[0]?.term).toBe(governsTerm);
    expect(regions.evidenceMatrix.rows[0]?.relationship.meaning_kind).toBe(
      "governance",
    );
  });

  it("fails closed when exact membership, scope, or return identity is inconsistent", () => {
    const missingEndpoint = focusedGraphView();
    const missingEndpointRelationship =
      missingEndpoint.content.relationships[0];
    if (missingEndpointRelationship === undefined) {
      throw new Error("Expected the relationship conformance fixture.");
    }
    missingEndpointRelationship.target_node_key = "node:missing";
    expect(() => focusedGraphRegionsFromView(missingEndpoint)).toThrowError(
      new FocusedGraphRegionError(
        "Relationship target node node:missing is unavailable.",
      ),
    );

    const exceededLimit = focusedGraphView();
    exceededLimit.content.scope.limits.maximum_nodes = 1;
    expect(() => focusedGraphRegionsFromView(exceededLimit)).toThrowError(
      /outside its exact finite scope/u,
    );

    const missingSelection = focusedGraphView();
    missingSelection.content.selection = {
      state: "selected",
      selection_kind: "path",
      selected_keys: ["path:missing"],
    };
    expect(() => focusedGraphRegionsFromView(missingSelection)).toThrowError(
      /Selected path path:missing is unavailable/u,
    );

    const missingReturn = focusedGraphView();
    missingReturn.content.task.return_destination_key = "destination:missing";
    expect(() => focusedGraphRegionsFromView(missingReturn)).toThrowError(
      /Return destination destination:missing is unavailable/u,
    );
  });
});
