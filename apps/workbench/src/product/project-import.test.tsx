import { readFileSync } from "node:fs";

import type {
  PetraProjectImportCommandReceipt,
  PetraProjectShellViewV11,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectImportReceiptSummary } from "./ProjectImportSurface.js";
import {
  createProjectImportCommandRequest,
  executeProjectImportRequest,
} from "./project-import.js";
import { projectRecordFromShellView } from "./project-data.js";

const shell = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellViewV11;

const source = projectRecordFromShellView(shell);
if (source.importBinding === undefined) {
  throw new Error("The retained Project fixture requires an import binding.");
}

const request = createProjectImportCommandRequest({
  source: source.importBinding,
  project: { name: "Derived inlet analysis" },
  reviewedAt: "2026-09-20T12:20:00.000Z",
  commandId: "command_01K6P000000000000000000802",
  idempotencyKey: "wave6:workbench:project-import",
});

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const resultProjectId = "project_01K6P000000000000000000802";
const receipt: PetraProjectImportCommandReceipt = {
  schema_name: "petra.project-import-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_import_receipt_01K6P000000000000000000802",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  source: {
    source_kind: "retained_project",
    project_ref: {
      project_id: request.source.project_id,
      revision: request.source.project_revision,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      ...request.source.project_definition_ref,
      record_hash: hash("2"),
    },
    focused_objective_ref: {
      ...request.source.focused_objective_ref,
      record_hash: hash("3"),
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
      record_hash: hash("4"),
    },
    project_definition_ref: {
      project_definition_id: "project_definition_01K6P000000000000000000802",
      revision: 1,
      content_hash: request.source.project_definition_ref.content_hash,
      record_hash: hash("5"),
    },
    focused_objective_ref: {
      objective_id: "objective_01K6P000000000000000000802",
      revision: 1,
      content_hash: request.source.focused_objective_ref.content_hash,
      record_hash: hash("6"),
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

afterEach(() => vi.unstubAllGlobals());

const requestUrl = (input: string | URL | Request): URL =>
  new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );

describe("Project import UI boundary", () => {
  it("collects the exact server-owned Project, definition, and focused-objective binding", () => {
    expect(source.importBinding).toEqual({
      sourceKind: "retained_project",
      projectId: shell.project_id,
      projectRevision: shell.content.project.revision,
      projectDefinitionRef: {
        projectDefinitionId: shell.content.definition.project_definition_id,
        revision: shell.content.definition.revision,
        contentHash: shell.content.definition.content_hash,
      },
      focusedObjectiveRef: {
        objectiveId: shell.content.current_objective?.objective_id,
        revision: shell.content.current_objective?.revision,
        contentHash: shell.content.current_objective?.content_hash,
      },
    });
    expect(request.source.project_revision).toBe(
      shell.content.project.revision,
    );
    expect(request.admission).toEqual({
      decision: "create_derived_project",
      copy_scope: "definition_and_focused_objective",
      source_effect: "preserve_without_modification",
      reviewed_at: "2026-09-20T12:20:00.000Z",
    });
  });

  it("verifies the immutable ancestry read before publishing command success", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify(receipt), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(executeProjectImportRequest(request)).resolves.toEqual(
      receipt,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(requestUrl(fetch.mock.calls[0]![0]).pathname).toBe(
      "/api/commands/projects/import",
    );
    expect(requestUrl(fetch.mock.calls[1]![0]).pathname).toBe(
      `/api/queries/projects/${resultProjectId}/import-ancestry`,
    );
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(request));
  });

  it("shows the copied, retained-only, limited, and exact-return outcome", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ProjectImportReceiptSummary receipt={receipt} onOpen={() => {}} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Derived Project ready");
    expect(markup).toContain("Project definition");
    expect(markup).toContain("Focused objective");
    expect(markup).toContain("Original History");
    expect(markup).toContain("Original Sources");
    expect(markup).toContain(receipt.material.limitations[0]);
    expect(markup).toContain("Open derived Project Brief");
  });
});
