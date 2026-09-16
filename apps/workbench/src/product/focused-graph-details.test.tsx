import { FocusedGraphClientError } from "@petra/adapters";
import type {
  PetraFocusedGraphDetailsView,
  PetraFocusedGraphView,
  ProjectObjectDestination,
} from "@petra/contracts";
import type { FocusedGraphReadRequest } from "@petra/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PetraContractRegistry as BrowserContractRegistry } from "./browser-contract-registry.js";
import {
  FocusedGraphDetailsPanel,
  createFocusedGraphDetailsRequest,
  focusedGraphDetailsRecoveryKind,
  focusedGraphSemanticDestinationPath,
  matchesActiveFocusedGraphDetails,
} from "./FocusedGraphDetails.js";

const hash = `sha256:${"a".repeat(64)}`;
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
  definition: `${singular} meaning resolved by the exact profile.`,
  generic_family,
});

const focusedGraphFixture = (): PetraFocusedGraphView => ({
  schema_name: "petra.focused-graph-view",
  schema_version: "1.0.0",
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  content: {
    task: {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      request_hash: hash,
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question: "Which exact relationships concern this Claim?",
      question_hash: hash,
      focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
      origin: { origin_kind: "brief" },
      return_destination_key: "destination:brief",
    },
    profile: {
      project_definition_ref: {
        project_definition_id: "project_definition_01K4C000000000000000000001",
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
          semantic_key: "scientific.claim",
          role: "object",
          registration_kind: "object_schema",
          contract: {
            name: "petra.claim",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term("scientific.claim", "finding", "Claim"),
        },
        {
          semantic_key: "scientific.assertion",
          role: "relationship",
          registration_kind: "relationship_schema",
          contract: {
            name: "petra.assertion",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term(
            "scientific.assertion",
            "relationship",
            "Evidence relationship",
          ),
        },
      ],
    },
    source_views: [],
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
      description: "One exact Claim at depth one.",
      included_relationship_semantics: ["scientific.assertion"],
      directions: ["outgoing"],
      included_layers: ["current"],
      limits: {
        maximum_depth: 1,
        maximum_nodes: 20,
        maximum_relationships: 20,
        maximum_paths: 10,
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
        semantic_key: "scientific.claim",
        term: term("scientific.claim", "finding", "Claim"),
        label: "Claim A",
        summary: "The selected Claim.",
        layer: "current",
        authority_position: "current_authority",
        lifecycle: "represented",
        basis: {
          summary: "Canonical Project record.",
          record_refs: [],
          limitations: [],
        },
        destination_keys: ["destination:brief"],
      },
    ],
    relationships: [],
    paths: [],
    selection: {
      state: "selected",
      selection_kind: "node",
      selected_keys: ["node:claim-a"],
    },
    destinations: [
      {
        destination_key: "destination:brief",
        destination_kind: "brief",
        state: "available",
        owner: "project_brief_view",
        label: "Return to Brief",
        target_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
      },
    ],
    actions: [
      {
        action_key: "action:return",
        action_kind: "return_to_origin",
        semantic_key: "scientific.research-question",
        label: "Return to Brief",
        consequence: "read_only_navigation",
        target_keys: ["node:claim-a"],
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
    limitations: ["No renderer geometry is supplied."],
  },
  content_hash: hash,
  read_at: "2026-09-15T20:00:00.000Z",
});

const focusedGraphDetailsFixture = (): PetraFocusedGraphDetailsView => {
  const graph = focusedGraphFixture();
  const node = structuredClone(graph.content.nodes[0]!);
  return {
    schema_name: "petra.focused-graph-details-view",
    schema_version: "1.0.0",
    project_id: graph.project_id,
    content: {
      details_request_id:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      graph: {
        schema_name: graph.schema_name,
        schema_version: graph.schema_version,
        content_hash: graph.content_hash,
        task: structuredClone(graph.content.task),
        profile: structuredClone(graph.content.profile),
        requested_snapshot: structuredClone(graph.content.requested_snapshot),
        represented_snapshot: structuredClone(
          graph.content.represented_snapshot,
        ),
        semantic_layer: graph.content.semantic_layer,
        temporal_position: structuredClone(graph.content.temporal_position),
        projection_position: structuredClone(graph.content.projection_position),
        scope: structuredClone(graph.content.scope),
        return_destination: structuredClone(graph.content.destinations[0]),
      },
      selection: {
        selection_kind: "node",
        selected_keys: [node.node_key],
      },
      nodes: [
        {
          member_kind: "node",
          member_key: node.node_key,
          member: node,
          semantic_location: {
            request: {
              object_ref: {
                semantic_key: node.semantic_key,
                object_id: node.record_ref.record_id,
                revision: node.record_ref.revision,
              },
              task_intent: "inspect",
            },
            definition_ref: {
              project_definition_id:
                graph.content.profile.project_definition_ref
                  .project_definition_id,
              revision: graph.content.profile.project_definition_ref.revision,
              content_hash:
                graph.content.profile.project_definition_ref.content_hash,
              definition_family:
                graph.content.profile.project_definition_ref.definition_family,
            },
            resolution: {
              state: "unsupported",
              requested_ref: {
                semantic_key: node.semantic_key,
                object_id: node.record_ref.record_id,
                revision: node.record_ref.revision,
              },
              failure: {
                code: "OBJECT_KIND_UNSUPPORTED",
                message: "This exact destination is unavailable.",
              },
            },
            primary_destination: {
              role: "brief",
              purpose: "Return to the current Project orientation.",
            },
            alternate_destinations: [],
            context: { details_allowed: false, petra_allowed: false },
            authority: {
              isolation: "repeatable_read",
              event_position: graph.content.requested_snapshot.event_position,
              stream_revision: 1,
            },
            projection: {
              state: "current",
              label: "Current",
              detail: "The exact fixture checkpoint is represented.",
              checkpoint_ref: {
                record_id:
                  graph.content.projection_position.checkpoint_ref!.record_id,
                revision:
                  graph.content.projection_position.checkpoint_ref!.revision,
                content_hash:
                  graph.content.projection_position.checkpoint_ref!.record_hash,
              },
              represented_event_position:
                graph.content.represented_snapshot.event_position,
              observed_event_position:
                graph.content.requested_snapshot.event_position,
              pending_records: 0,
            },
          },
          source_inspections: [],
        },
      ],
      relationships: [],
      paths: [],
      limitations: ["Exact Details remain read-only."],
      authority_boundary: {
        postgresql_authoritative: true,
        neo4j_projection_only: true,
        selection_is_presentation_state: true,
        details_are_read_only: true,
        source_owner: "project_source_view",
        semantic_location_owner: "project_object_location_view",
        graph_specific_registry_added: false,
      },
    },
    content_hash: hash,
    read_at: graph.read_at,
  };
};

const graphRequestFixture = (): FocusedGraphReadRequest => {
  const graph = focusedGraphFixture();
  const definition = graph.content.profile.project_definition_ref;
  const returnDestination = graph.content.destinations[0];
  if (returnDestination.state !== "available") {
    throw new TypeError("Expected an available exact return destination.");
  }
  return {
    request_id: graph.content.task.request_id,
    task_kind: "neighborhood",
    task_semantic_key: graph.content.task.task_semantic_key,
    question: graph.content.task.question,
    focus_ref: structuredClone(graph.content.task.focus_refs[0]),
    origin: structuredClone(graph.content.task.origin),
    project_definition_ref: structuredClone(definition),
    semantic_layer: graph.content.semantic_layer,
    temporal_position: {
      position_kind: "current",
      dimension: "project_snapshot",
    },
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.return",
    return_destination: structuredClone(returnDestination),
    limits: structuredClone(graph.content.scope.limits),
    expected_snapshot: structuredClone(graph.content.requested_snapshot),
  };
};

const returnContext = {
  path: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief#brief-result-0",
  label: "Brief result",
  focus_id: "brief-result-0",
};

describe("focused graph synchronized Details", () => {
  it("registers the exact Details schema in the browser validator", () => {
    expect(() =>
      new BrowserContractRegistry().assertValid(
        "focused-graph-details-view",
        "1.0.0",
        focusedGraphDetailsFixture(),
      ),
    ).not.toThrow();
  });

  it("builds a renderer-neutral Details request for the active selection", () => {
    const graph = focusedGraphFixture();
    const selectedKey = graph.content.nodes[0]!.node_key;
    const request = createFocusedGraphDetailsRequest({
      detailsRequestId:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      request: graphRequestFixture(),
      view: graph,
      selectedKey,
    });

    expect(request).toMatchObject({
      expected_graph: {
        schema_name: "petra.focused-graph-view",
        schema_version: "1.0.0",
        content_hash: graph.content_hash,
      },
      selection: { selection_kind: "node", selected_keys: [selectedKey] },
    });
    expect(request.focused_graph_request).toEqual(graphRequestFixture());
    expect(request).not.toHaveProperty("layout");
    expect(request).not.toHaveProperty("coordinates");
    expect(request).not.toHaveProperty("command");
  });

  it("rejects late Details after presentation state or selection changes", () => {
    const view = focusedGraphDetailsFixture();
    const focusedGraphRequest = {
      ...graphRequestFixture(),
      request_id: view.content.graph.task.request_id,
    };
    const active = {
      stateId: 8,
      projectId: view.project_id,
      selectedKey: view.content.selection.selected_keys[0],
      request: {
        details_request_id: view.content.details_request_id,
        focused_graph_request: focusedGraphRequest,
        expected_graph: {
          schema_name: view.content.graph.schema_name,
          schema_version: view.content.graph.schema_version,
          content_hash: view.content.graph.content_hash,
        },
        selection: structuredClone(view.content.selection),
      },
    };
    expect(matchesActiveFocusedGraphDetails(view, active, 8)).toBe(true);
    expect(matchesActiveFocusedGraphDetails(view, active, 9)).toBe(false);
    expect(
      matchesActiveFocusedGraphDetails(
        view,
        { ...active, selectedKey: "node:later-selection" },
        8,
      ),
    ).toBe(false);
  });

  it("maps stale, missing, restricted, and generic failures to explicit recovery", () => {
    expect(
      focusedGraphDetailsRecoveryKind(
        new FocusedGraphClientError(409, {
          error: { code: "FOCUSED_GRAPH_SNAPSHOT_STALE" },
        }),
      ),
    ).toBe("stale");
    expect(
      focusedGraphDetailsRecoveryKind(
        new FocusedGraphClientError(404, {
          error: { code: "FOCUSED_GRAPH_FOCUS_NOT_FOUND" },
        }),
      ),
    ).toBe("missing");
    expect(
      focusedGraphDetailsRecoveryKind(
        new FocusedGraphClientError(403, {
          error: { code: "PROJECT_UNAUTHORIZED" },
        }),
      ),
    ).toBe("restricted");
    expect(
      focusedGraphDetailsRecoveryKind(
        new FocusedGraphClientError(503, {
          error: { code: "FOCUSED_GRAPH_DETAILS_UNAVAILABLE" },
        }),
      ),
    ).toBe("unavailable");
  });

  it("maps resolved Brief and Review destinations without inventing an owner", () => {
    const target = {
      semantic_key: "scientific.claim",
      object_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      revision: 3,
      record_hash: `sha256:${"b".repeat(64)}`,
    };
    const brief: ProjectObjectDestination = {
      role: "brief",
      purpose: "Return to Brief.",
      target_ref: target,
    };
    const review: ProjectObjectDestination = {
      role: "review",
      purpose: "Inspect the exact Review context.",
      target_ref: target,
    };
    const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

    expect(focusedGraphSemanticDestinationPath(projectId, brief)).toBe(
      `/projects/${projectId}/brief`,
    );
    expect(focusedGraphSemanticDestinationPath(projectId, review)).toContain(
      `/projects/${projectId}/review?selected=${target.object_id}`,
    );
    expect(focusedGraphSemanticDestinationPath(projectId, review)).toContain(
      "semanticKey=scientific.claim",
    );
    expect(focusedGraphSemanticDestinationPath(projectId, review)).toContain(
      "revision=3",
    );
  });

  it("renders replacement, restricted source, unavailable return, and exact return focus", () => {
    const details: PetraFocusedGraphDetailsView = focusedGraphDetailsFixture();
    const selected = details.content.nodes[0]!;
    const requested = selected.semantic_location.resolution.requested_ref;
    const resolved = {
      semantic_key: requested.semantic_key,
      object_id: requested.object_id,
      revision: requested.revision!,
      record_hash: selected.member.record_ref.record_hash,
    };
    const current = { ...resolved, revision: resolved.revision + 1 };
    selected.member.lifecycle = "restricted";
    selected.semantic_location.resolution = {
      state: "superseded",
      requested_ref: requested,
      resolved_ref: resolved,
      current_ref: current,
      descriptor: {
        semantic_key: requested.semantic_key,
        generic_family: "finding",
        label: selected.member.label,
        summary: selected.member.summary,
        lifecycle_state: "superseded",
      },
      replacement_chain: [current],
    };
    selected.semantic_location.alternate_destinations = [
      {
        role: "review",
        purpose: "Inspect the exact Review context.",
        target_ref: current,
      },
    ];
    selected.source_inspections = [
      {
        state: "unavailable",
        owner: "project_source_view",
        source_span_ref: {
          record_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAS",
          revision: 1,
          record_hash: `sha256:${"c".repeat(64)}`,
        },
        reason: "The exact representation is restricted for this actor.",
      },
    ];
    details.content.graph.return_destination = {
      destination_key: "destination:brief",
      destination_kind: "brief",
      state: "unavailable",
      owner: "project_brief_view",
      label: "Return to Brief",
      reason: "The exact originating object is no longer available.",
    };

    const markup = renderToStaticMarkup(
      <FocusedGraphDetailsPanel
        details={details}
        returnContext={returnContext}
        onReturn={() => undefined}
      />,
    );

    for (const text of [
      "Synchronized Details",
      "Exact selected identity",
      "Replaced object",
      "Inspect the exact current replacement",
      "Open review",
      "Inspect exact source",
      "Source representation unavailable",
      "restricted for this actor",
      "Graph return destination unavailable",
      "Brief result",
      "brief-result-0",
      "Return to graph selection",
      "PostgreSQL authority",
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('tabindex="-1"');
    expect(markup).not.toContain("coordinates");
    expect(markup).not.toContain("direct mutation");
  });
});
