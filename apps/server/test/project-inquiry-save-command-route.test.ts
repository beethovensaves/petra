import type {
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  PetraProjectObjective,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectInquirySaveAuthority,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-inquiry-save-token";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const actor = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};
const capabilityGrantId = "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FAX";
const definitionRef = {
  project_definition_id: "project_definition_01K4C000000000000000000001",
  revision: 1,
  content_hash: hash("a"),
  record_hash: hash("b"),
  definition_family: "petra.scientific-evidence",
};
const focusRef = {
  record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
  revision: 1,
  record_hash: hash("c"),
};
const snapshotRef = {
  snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
  revision: 1,
  event_position: 12,
  content_hash: hash("d"),
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
    record_hash: hash("e"),
  },
};
const request: PetraProjectInquirySaveRequest = {
  schema_name: "petra.project-inquiry-save-request",
  schema_version: "1.0.0",
  command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  idempotency_key: "graph.save-question:route-test",
  graph_request: {
    request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
    task_kind: "neighborhood",
    task_semantic_key: "scientific.research-question",
    question: "Which exact basis supports this Claim?",
    focus_ref: focusRef,
    origin: {
      origin_kind: "brief",
      origin_ref: returnDestination.target_ref,
    },
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
    content_hash: hash("f"),
  },
  selection: {
    state: "selected",
    selection_kind: "node",
    selected_keys: ["node:claim-a"],
  },
  submitted_at: "2026-09-19T22:30:00.000Z",
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
  content: {
    objective_kind: "scientific.research-question",
    statement: request.graph_request.question,
    status: "active",
    dependency_refs: [],
  },
  content_hash: hash("1"),
  created_by: actor,
  created_at: "2026-09-19T22:30:01.000Z",
  updated_at: "2026-09-19T22:30:01.000Z",
};
const receipt: PetraProjectInquirySaveReceipt = {
  schema_name: "petra.project-inquiry-save-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_inquiry_save_receipt_01ARZ3NDEKTSV4RRFFQ69G5FB0",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("2"),
  project_id: projectId,
  actor,
  capability_grant_id: capabilityGrantId,
  inquiry_role_ref: {
    project_inquiry_role_id: "project_inquiry_role_01K4F000000000000000000001",
    revision: 1,
    content_hash: hash("3"),
    record_hash: hash("4"),
  },
  objective_ref: {
    objective_id: inquiry.objective_id,
    revision: 1,
    content_hash: inquiry.content_hash,
    record_hash: hash("5"),
  },
  graph_binding: {
    graph_request_hash: hash("6"),
    focused_graph_ref: request.expected_graph,
    task_request_id: request.graph_request.request_id,
    task_request_hash: hash("7"),
    question_hash: hash("8"),
    project_definition_ref: definitionRef,
    snapshot_ref: snapshotRef,
    semantic_layer: "current",
    focus_refs: [focusRef],
    selection: request.selection,
    origin: request.graph_request.origin,
    return_destination: returnDestination,
  },
  effect: {
    kind: "project_inquiry_created",
    summary:
      "The exact question is retained as an active ProjectInquiry; its graph snapshot and selection remain provenance rather than authority.",
    graph_authority_changed: false,
    selection_granted_authority: false,
  },
  recovery: {
    command_path: `/api/commands/projects/${projectId}/inquiries`,
    assessment_path: `/api/queries/projects/${projectId}/inquiries/save-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: inquiry.created_at,
  record_hash: hash("9"),
};

const authorized = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const principal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({ state: "resolved", actor, capabilityGrantId }),
};

describe("ProjectInquiry save command routes", () => {
  it("resolves server-owned authority and binds the exact Graph request", async () => {
    const saveProjectInquiry = vi.fn<
      ProjectInquirySaveAuthority["saveProjectInquiry"]
    >(() =>
      Promise.resolve({
        receipt: structuredClone(receipt),
        inquiry: structuredClone(inquiry),
        applied: true,
      }),
    );
    const authority: ProjectInquirySaveAuthority = {
      saveProjectInquiry,
      assessProjectInquirySaveRecovery: vi.fn(),
    };
    const resolveCommandPrincipal = vi.fn(
      principal.resolveCommandPrincipal.bind(principal),
    );
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: { resolveCommandPrincipal },
      projectInquirySaveAuthority: authority,
    });

    const response = await petra.app.fetch(
      authorized(`/api/commands/projects/${projectId}/inquiries`, request),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual({
      receipt,
      inquiry,
      applied: true,
    });
    expect(resolveCommandPrincipal).toHaveBeenCalledWith({
      projectId,
      commandName: "SaveProjectInquiry",
    });
    expect(saveProjectInquiry).toHaveBeenCalledWith(projectId, request, {
      actor,
      capabilityGrantId,
    });
  });

  it("rejects client-supplied authority before command execution", async () => {
    const saveProjectInquiry = vi.fn();
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: principal,
      projectInquirySaveAuthority: {
        saveProjectInquiry,
        assessProjectInquirySaveRecovery: vi.fn(),
      },
    });

    const response = await petra.app.fetch(
      authorized(`/api/commands/projects/${projectId}/inquiries`, {
        ...request,
        actor,
        capability_grant_id: capabilityGrantId,
      }),
    );

    expect(response.status).toBe(422);
    expect(saveProjectInquiry).not.toHaveBeenCalled();
  });

  it("exposes exact no-store unknown-effect recovery", async () => {
    const recovery: PetraProjectInquirySaveRecoveryView = {
      schema_name: "petra.project-inquiry-save-recovery-view",
      schema_version: "1.0.0",
      assessment_id: "project_inquiry_save_recovery_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      project_id: projectId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash("2"),
      },
      effect: { state: "effect_confirmed", receipt },
      observed_at: "2026-09-19T22:31:00.000Z",
      content_hash: hash("a"),
    };
    const assessProjectInquirySaveRecovery = vi.fn<
      ProjectInquirySaveAuthority["assessProjectInquirySaveRecovery"]
    >(() => Promise.resolve(structuredClone(recovery)));
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: principal,
      projectInquirySaveAuthority: {
        saveProjectInquiry: vi.fn(),
        assessProjectInquirySaveRecovery,
      },
    });

    const response = await petra.app.fetch(
      authorized(
        `/api/queries/projects/${projectId}/inquiries/save-recovery`,
        request,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual(recovery);
    expect(assessProjectInquirySaveRecovery).toHaveBeenCalledWith(
      projectId,
      request,
      { actor, capabilityGrantId },
    );
  });
});
