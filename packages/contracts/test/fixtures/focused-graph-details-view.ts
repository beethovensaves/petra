import type { PetraFocusedGraphDetailsView } from "../../src/index.js";

import { focusedGraphFixture } from "./focused-graph-view.js";

const hash = `sha256:${"a".repeat(64)}`;

export const focusedGraphDetailsFixture = (): PetraFocusedGraphDetailsView => {
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
                message:
                  "This fixture exposes an exact unavailable destination.",
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
