import type {
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
} from "@petra/contracts";
import type {
  ProjectImportAncestryReader,
  ProjectImportCommandAuthority,
  ProjectImportCommandRecoveryReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const token = "wave6-project-import-route";
const sourceProjectId = "project_01K6P000000000000000000801";
const resultProjectId = "project_01K6P000000000000000000802";
const commandId = "command_01K6P000000000000000000802";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

const request: PetraProjectImportCommandRequest = {
  schema_name: "petra.project-import-command-request",
  schema_version: "1.0.0",
  command_id: commandId,
  idempotency_key: "wave6:route:project-import",
  source: {
    source_kind: "retained_project",
    project_id: sourceProjectId,
    project_revision: 3,
    project_definition_ref: {
      project_definition_id: "project_definition_01K6P000000000000000000801",
      revision: 2,
      content_hash: hash("a"),
    },
    focused_objective_ref: {
      objective_id: "objective_01K6P000000000000000000801",
      revision: 4,
      content_hash: hash("b"),
    },
  },
  admission: {
    decision: "create_derived_project",
    copy_scope: "definition_and_focused_objective",
    source_effect: "preserve_without_modification",
    reviewed_at: "2026-09-20T12:20:00.000Z",
  },
  project: { name: "Derived route Project" },
};

const receipt: PetraProjectImportCommandReceipt = {
  schema_name: "petra.project-import-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_import_receipt_01K6P000000000000000000802",
  command_id: commandId,
  idempotency_key: request.idempotency_key,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  source: {
    source_kind: "retained_project",
    project_ref: {
      project_id: sourceProjectId,
      revision: 3,
      record_hash: hash("c"),
    },
    project_definition_ref: {
      ...request.source.project_definition_ref,
      record_hash: hash("d"),
    },
    focused_objective_ref: {
      ...request.source.focused_objective_ref,
      record_hash: hash("e"),
    },
    project_status: "active",
  },
  admission: {
    ...request.admission,
    reviewed_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "human",
    },
  },
  result: {
    project_ref: {
      project_id: resultProjectId,
      revision: 1,
      record_hash: hash("f"),
    },
    project_definition_ref: {
      project_definition_id: "project_definition_01K6P000000000000000000802",
      revision: 1,
      content_hash: hash("a"),
      record_hash: hash("1"),
    },
    focused_objective_ref: {
      objective_id: "objective_01K6P000000000000000000802",
      revision: 1,
      content_hash: hash("b"),
      record_hash: hash("2"),
    },
  },
  material: {
    copied: ["project_definition", "focused_objective"],
    retained_only: [
      "source_project_identity",
      "source_history",
      "source_sources",
      "source_work",
      "source_reviews",
    ],
    limitations: [
      "Only the exact definition and focused objective are copied.",
    ],
  },
  destination: { place_role: "brief", project_id: resultProjectId },
  recorded_at: "2026-09-20T12:30:00.000Z",
};

const recovery: PetraProjectImportCommandRecoveryView = {
  schema_name: "petra.project-import-command-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "project_import_recovery_01K6P000000000000000000802",
  content: {
    subject: {
      command_id: commandId,
      idempotency_key: request.idempotency_key,
      request_hash: hash("3"),
      source_project_id: sourceProjectId,
    },
    effect: {
      state: "effect_confirmed",
      meaning:
        "The exact Project import receipt and ancestry are retained. Repeating the same request returns this receipt without another derived Project.",
      receipt,
    },
    preservation: [
      {
        item: "import_receipt",
        identity: receipt.receipt_id,
        durability: "postgresql",
        state: "retained",
      },
    ],
    eligible_actions: [
      {
        operation: "open_derived_project",
        owner: "browser_navigation",
        method: "GET",
        path: `/projects/${resultProjectId}/brief`,
        input_behavior: "none",
        identity_behavior: "navigate_to_receipt_project",
        reason: "The retained receipt supplies the exact derived Project.",
        success_destination: receipt.destination,
        failure_destination: { place_role: "projects" },
        execution_recheck: true,
      },
    ],
    return: {
      state: "exact",
      destination: receipt.destination,
      reason: "The retained receipt supplies the exact derived Project.",
    },
    observation_cutoff: "2026-09-20T12:31:00.000Z",
    limitations: receipt.material.limitations,
  },
  content_hash: hash("4"),
  read_at: "2026-09-20T12:31:00.000Z",
};

const authorized = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://petra.local${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

describe("Project import routes", () => {
  it("executes the exact reviewed import command and returns its ancestry receipt", async () => {
    const execute = vi.fn(() => Promise.resolve(structuredClone(receipt)));
    const authority: ProjectImportCommandAuthority = {
      executeProjectImportCommand: execute,
    };
    const app = createPetraApp({
      authToken: token,
      projectImportCommands: authority,
    });

    const response = await app.app.fetch(
      authorized("/api/commands/projects/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toStrictEqual(receipt);
    expect(execute).toHaveBeenCalledWith(request);
  });

  it("exposes read-only recovery and resulting-Project ancestry through their registered owners", async () => {
    const assess = vi.fn(() => Promise.resolve(structuredClone(recovery)));
    const getAncestry = vi.fn(() => Promise.resolve(structuredClone(receipt)));
    const recoveryOwner: ProjectImportCommandRecoveryReader = {
      assessProjectImportCommandRecovery: assess,
    };
    const ancestryOwner: ProjectImportAncestryReader = {
      getProjectImportAncestry: getAncestry,
    };
    const app = createPetraApp({
      authToken: token,
      projectImportRecovery: recoveryOwner,
      projectImportAncestry: ancestryOwner,
    });

    const recoveryResponse = await app.app.fetch(
      authorized("/api/queries/project-import-command-recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );
    const ancestryResponse = await app.app.fetch(
      authorized(`/api/queries/projects/${resultProjectId}/import-ancestry`),
    );

    expect(
      recoveryResponse.status,
      JSON.stringify(await recoveryResponse.clone().json()),
    ).toBe(200);
    expect(recoveryResponse.headers.get("cache-control")).toBe("no-store");
    expect(await recoveryResponse.json()).toStrictEqual(recovery);
    expect(ancestryResponse.status).toBe(200);
    expect(await ancestryResponse.json()).toStrictEqual(receipt);
    expect(assess).toHaveBeenCalledWith(request);
    expect(getAncestry).toHaveBeenCalledWith(resultProjectId);
  });

  it("requires bearer authentication for command, recovery, and ancestry reads", async () => {
    const app = createPetraApp({
      authToken: token,
      projectImportCommands: {
        executeProjectImportCommand: vi.fn(() => Promise.resolve(receipt)),
      },
      projectImportRecovery: {
        assessProjectImportCommandRecovery: vi.fn(() =>
          Promise.resolve(recovery),
        ),
      },
      projectImportAncestry: {
        getProjectImportAncestry: vi.fn(() => Promise.resolve(receipt)),
      },
    });
    for (const [path, method] of [
      ["/api/commands/projects/import", "POST"],
      ["/api/queries/project-import-command-recovery", "POST"],
      [`/api/queries/projects/${resultProjectId}/import-ancestry`, "GET"],
    ] as const) {
      const response = await app.app.fetch(
        new Request(`http://petra.local${path}`, { method }),
      );
      expect(response.status).toBe(401);
    }
  });
});
