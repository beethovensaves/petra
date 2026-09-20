import { createHash } from "node:crypto";

import type {
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  PetraProjectObjective,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectInquirySaveClientError,
  assessProjectInquirySaveRecovery,
  executeProjectInquirySave,
  projectInquirySaveFailureKind,
} from "./project-inquiry-save.js";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixedHash = (character: string): string =>
  `sha256:${character.repeat(64)}`;
const fetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
};
const fetchBodyText = (body: BodyInit | null | undefined): string => {
  if (typeof body !== "string") {
    throw new TypeError("Expected the browser adapter to send a JSON string.");
  }
  return body;
};
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const definitionRef = {
  project_definition_id: "project_definition_01K4C000000000000000000001",
  revision: 1,
  content_hash: fixedHash("a"),
  record_hash: fixedHash("b"),
  definition_family: "petra.scientific-evidence",
};
const focusRef = {
  record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
  revision: 1,
  record_hash: fixedHash("c"),
};
const snapshotRef = {
  snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
  revision: 1,
  event_position: 12,
  content_hash: fixedHash("d"),
};
const returnDestination = {
  destination_key: "destination:brief",
  destination_kind: "brief" as const,
  state: "available" as const,
  owner: "project_brief_view" as const,
  label: "Return to Brief",
  target_ref: {
    record_id: "objective_01ARZ3NDEKTSV4RRFFQ69G5FAC",
    revision: 1,
    record_hash: fixedHash("e"),
  },
};
const request: PetraProjectInquirySaveRequest = {
  schema_name: "petra.project-inquiry-save-request",
  schema_version: "1.0.0",
  command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  idempotency_key: "graph.save-question:browser-test",
  graph_request: {
    request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
    task_kind: "neighborhood",
    task_semantic_key: "scientific.research-question",
    question: "Which exact basis supports this Claim?",
    focus_ref: focusRef,
    origin: { origin_kind: "brief", origin_ref: returnDestination.target_ref },
    project_definition_ref: definitionRef,
    semantic_layer: "current",
    temporal_position: {
      position_kind: "current",
      dimension: "project_snapshot",
    },
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.return-to-brief",
    return_destination: returnDestination,
    limits: {
      maximum_depth: 1,
      maximum_nodes: 20,
      maximum_relationships: 20,
      maximum_paths: 10,
    },
    expected_snapshot: snapshotRef,
  },
  expected_graph: {
    schema_name: "petra.focused-graph-view",
    schema_version: "1.0.0",
    content_hash: fixedHash("f"),
  },
  selection: {
    state: "selected",
    selection_kind: "node",
    selected_keys: ["node:claim-a"],
  },
  submitted_at: "2026-09-19T22:30:00.000Z",
};

const resultFixture = (applied: boolean) => {
  const objectiveContent: PetraProjectObjective["content"] = {
    objective_kind: request.graph_request.task_semantic_key,
    statement: request.graph_request.question,
    status: "active",
    dependency_refs: [],
  };
  const inquiry: PetraProjectObjective = {
    schema_name: "petra.project-objective",
    schema_version: "1.0.0",
    objective_id: "objective_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
    revision: 1,
    project_id: projectId,
    project_definition_ref: {
      project_definition_id: definitionRef.project_definition_id,
      revision: definitionRef.revision,
      content_hash: definitionRef.content_hash,
    },
    content: objectiveContent,
    content_hash: hash(objectiveContent),
    created_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "human",
    },
    created_at: "2026-09-19T22:30:01.000Z",
    updated_at: "2026-09-19T22:30:01.000Z",
  };
  const receiptBase = {
    schema_name: "petra.project-inquiry-save-receipt" as const,
    schema_version: "1.0.0" as const,
    receipt_id: "project_inquiry_save_receipt_01ARZ3NDEKTSV4RRFFQ69G5FB0",
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
    project_id: projectId,
    actor: inquiry.created_by as Extract<
      PetraProjectInquirySaveReceipt["actor"],
      { actor_kind: "human" }
    >,
    capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    inquiry_role_ref: {
      project_inquiry_role_id:
        "project_inquiry_role_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      revision: 1,
      content_hash: fixedHash("1"),
      record_hash: fixedHash("2"),
    },
    objective_ref: {
      objective_id: inquiry.objective_id,
      revision: 1 as const,
      content_hash: inquiry.content_hash,
      record_hash: hash(inquiry),
    },
    graph_binding: {
      graph_request_hash: hash(request.graph_request),
      focused_graph_ref: request.expected_graph,
      task_request_id: request.graph_request.request_id,
      task_request_hash: fixedHash("3"),
      question_hash: fixedHash("4"),
      project_definition_ref: definitionRef,
      snapshot_ref: snapshotRef,
      semantic_layer: "current" as const,
      focus_refs: [focusRef] as [typeof focusRef],
      selection: request.selection,
      origin: request.graph_request.origin,
      return_destination: request.graph_request.return_destination,
    },
    effect: {
      kind: "project_inquiry_created" as const,
      summary:
        "The exact question is retained as an active ProjectInquiry; its graph snapshot and selection remain provenance rather than authority." as const,
      graph_authority_changed: false as const,
      selection_granted_authority: false as const,
    },
    recovery: {
      command_path: `/api/commands/projects/${projectId}/inquiries`,
      assessment_path: `/api/queries/projects/${projectId}/inquiries/save-recovery`,
      retry_reuses_command_identity: true as const,
      missing_receipt_means_unknown: true as const,
    },
    recorded_at: "2026-09-19T22:30:01.000Z",
  };
  const receipt: PetraProjectInquirySaveReceipt = {
    ...receiptBase,
    record_hash: hash(receiptBase),
  };
  return { receipt, inquiry, applied };
};

describe("ProjectInquiry save browser adapter", () => {
  it.each([true, false])(
    "executes and validates the exact server-owned result (applied=%s)",
    async (applied) => {
      const response = resultFixture(applied);
      const fetcher = vi.fn<typeof fetch>(() =>
        Promise.resolve(Response.json(response)),
      );

      await expect(
        executeProjectInquirySave(projectId, request, fetcher),
      ).resolves.toStrictEqual(response);
      const [url, init] = fetcher.mock.calls[0]!;
      expect(new URL(fetchUrl(url)).pathname).toBe(
        `/api/commands/projects/${projectId}/inquiries`,
      );
      expect(init?.method).toBe("POST");
      expect(JSON.parse(fetchBodyText(init?.body))).toStrictEqual(request);
      const sent = JSON.parse(fetchBodyText(init?.body)) as Record<
        string,
        unknown
      >;
      expect(sent).not.toHaveProperty("actor");
      expect(sent).not.toHaveProperty("capability_grant_id");
      expect(sent).not.toHaveProperty("objective_ref");
      expect(sent).not.toHaveProperty("inquiry_role_ref");
    },
  );

  it("rejects a receipt that substitutes the exact Graph binding", async () => {
    const substituted = resultFixture(true);
    substituted.receipt.graph_binding.selection = { state: "none" };
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json(substituted)),
    );

    await expect(
      executeProjectInquirySave(projectId, request, fetcher),
    ).rejects.toMatchObject({
      name: "ProjectInquirySaveClientError",
      code: "PROJECT_INQUIRY_SAVE_RESPONSE_MISMATCH",
    });
  });

  it("reads outcome-unknown recovery without changing the exact request", async () => {
    const recovery: PetraProjectInquirySaveRecoveryView = {
      schema_name: "petra.project-inquiry-save-recovery-view",
      schema_version: "1.0.0",
      assessment_id: "project_inquiry_save_recovery_01ARZ3NDEKTSV4RRFFQ69G5FB2",
      project_id: projectId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash(request),
      },
      effect: {
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: `/api/commands/projects/${projectId}/inquiries`,
          reuse_exact_request: true,
        },
      },
      observed_at: "2026-09-19T22:31:00.000Z",
      content_hash: fixedHash("5"),
    };
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json(recovery)),
    );

    await expect(
      assessProjectInquirySaveRecovery(projectId, request, fetcher),
    ).resolves.toStrictEqual(recovery);
    expect(
      JSON.parse(fetchBodyText(fetcher.mock.calls[0]?.[1]?.body)),
    ).toStrictEqual(request);
  });

  it("classifies stale, conflict, permission, and unknown outcomes", () => {
    expect(
      projectInquirySaveFailureKind(
        new ProjectInquirySaveClientError(
          "The Graph is stale.",
          409,
          "PROJECT_INQUIRY_SAVE_GRAPH_STALE",
        ),
      ),
    ).toBe("stale");
    expect(
      projectInquirySaveFailureKind(
        new ProjectInquirySaveClientError(
          "Identity conflict.",
          409,
          "PROJECT_INQUIRY_SAVE_CONFLICT",
        ),
      ),
    ).toBe("conflict");
    expect(
      projectInquirySaveFailureKind(
        new ProjectInquirySaveClientError("Forbidden.", 403),
      ),
    ).toBe("permission_lost");
    expect(projectInquirySaveFailureKind(new TypeError("disconnected"))).toBe(
      "outcome_unknown",
    );
  });
});
