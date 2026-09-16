import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraFocusedGraphActionPreviewView,
  PetraSuggestedActionViewV11,
} from "../../src/index.js";
import { canonicalize } from "json-canonicalize";

import { focusedGraphFixture } from "./focused-graph-view.js";

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const acceptedSuggestedAction = (): PetraSuggestedActionViewV11 =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../fixtures/accepted/suggested-action-view-v1-1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraSuggestedActionViewV11;

export const focusedGraphActionPreviewFixture =
  (): PetraFocusedGraphActionPreviewView => {
    const graph = focusedGraphFixture();
    const suggestedAction = acceptedSuggestedAction();
    suggestedAction.content.action.basis.project_definition_ref =
      structuredClone(graph.content.profile.project_definition_ref);
    suggestedAction.content.action.objective.semantic_key =
      graph.content.task.task_semantic_key;
    suggestedAction.content_hash = digest(suggestedAction.content);
    const selectedKey = graph.content.nodes[0]!.node_key;
    const selection = {
      selection_kind: "node" as const,
      selected_keys: [selectedKey] as [string],
    };
    const content: PetraFocusedGraphActionPreviewView["content"] = {
      action_request_id:
        "focused_graph_action_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
      request_hash: `sha256:${"b".repeat(64)}`,
      graph_view: graph,
      selection,
      preview: {
        preview_kind: "new_work",
        selected_member_keys: [selectedKey],
        inquiry_result_link_ref: structuredClone(
          suggestedAction.content.action.basis.inquiry_result_link_ref,
        ),
        suggested_action_view: suggestedAction,
        operation: {
          state: "preview_only",
          work_start: "only_after_exact_invocation",
          authority_change: "none",
          delivery_abort: "does_not_cancel_work",
          work_cancellation: "separate_authorized_command",
        },
      },
      return_context: {
        graph_request_id: graph.content.task.request_id,
        selection,
        origin: structuredClone(graph.content.task.origin),
        destination: structuredClone(graph.content.destinations[0]),
      },
      authority_boundary: {
        postgresql_authoritative: true,
        neo4j_projection_only: true,
        focused_graph_owner_reused: true,
        working_candidate_owner: "not_applicable",
        review_owner: "not_applicable",
        suggested_action_owner: "reused",
        work_preview_owner: "reused",
        preview_is_read_only: true,
        selection_grants_authority: false,
        renderer_state_accepted: false,
        command_issued: false,
        work_started: false,
      },
      limitations: [
        "This exact preview starts no Work and changes no Project authority.",
      ],
    };
    return {
      schema_name: "petra.focused-graph-action-preview-view",
      schema_version: "1.0.0",
      project_id: graph.project_id,
      content,
      content_hash: digest(content),
      read_at: suggestedAction.read_at,
    };
  };
