import type { PetraFocusedGraphView } from "../../src/index.js";

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

export const focusedGraphFixture = (): PetraFocusedGraphView => ({
  schema_name: "petra.focused-graph-view",
  schema_version: "1.0.0",
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  content: {
    task: {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      request_hash: hash,
      task_kind: "provenance",
      task_semantic_key: "scientific.research-question",
      question: "Which exact basis supports this Claim?",
      question_hash: hash,
      focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
      origin: {
        origin_kind: "brief",
        origin_ref: record("objective_01ARZ3NDEKTSV4RRFFQ69G5FAC"),
      },
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
        {
          semantic_key: "scientific.graph.trace-sources",
          role: "action",
          registration_kind: "extension",
          contract: {
            name: "petra.focused-graph-view",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term("scientific.graph.trace-sources", "task", "Trace sources"),
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
      {
        schema_name: "petra.project-relationship-overlay-view",
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
        destination_keys: ["destination:details"],
      },
      {
        node_key: "node:claim-b",
        record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAF"),
        semantic_key: "scientific.claim",
        term: term("scientific.claim", "finding", "Claim"),
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
        relationship_key: "relationship:assertion-a",
        relationship_ref: {
          element_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FAG",
          revision: 1,
          record_hash: hash,
        },
        semantic_key: "scientific.assertion",
        term: term(
          "scientific.assertion",
          "relationship",
          "Evidence relationship",
        ),
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
          record_refs: [],
          limitations: [],
        },
        destination_keys: [],
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
            relationship_key: "relationship:assertion-a",
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
        destination_key: "destination:brief",
        destination_kind: "brief",
        state: "available",
        owner: "project_brief_view",
        label: "Return to Brief",
        target_ref: record("objective_01ARZ3NDEKTSV4RRFFQ69G5FAC"),
      },
      {
        destination_key: "destination:details",
        destination_kind: "details",
        state: "available",
        owner: "project_object_location_view",
        label: "Open Claim details",
        target_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
      },
    ],
    actions: [
      {
        action_key: "action:trace-sources",
        action_kind: "expand_recorded",
        semantic_key: "scientific.graph.trace-sources",
        label: "Trace sources",
        consequence: "read_only_expansion",
        target_keys: ["node:claim-a"],
        availability: { state: "available" },
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
      "This contract supplies semantic membership and no renderer geometry.",
    ],
  },
  content_hash: hash,
  read_at: "2026-09-15T20:00:00.000Z",
});
