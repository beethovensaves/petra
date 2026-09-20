import { ProjectSourceLocalCopyDeletionClientError } from "@petra/adapters";
import type { PetraProjectSourceLocalCopyDeletionPreview } from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { SourceLocalCopyDeletionAction } from "./SourceLocalCopyDeletion.js";
import {
  createSourceLocalCopyDeletionRequest,
  sourceLocalCopyDeletionConflict,
  sourceLocalCopyDeletionOutcomeUnknown,
  sourceLocalCopyDeletionPermissionLost,
} from "./source-local-copy-deletion.js";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const projectSourceId = "project_source_01K6W000000000000000000001";
const preview = {
  schema_name: "petra.project-source-local-copy-deletion-preview",
  schema_version: "1.0.0",
  project_id: projectId,
  project_source_id: projectSourceId,
  expected: {
    project_ref: { project_id: projectId, revision: 4, record_hash: hash("1") },
    project_definition_ref: {
      project_definition_id: "project_definition_01K6W000000000000000000002",
      revision: 2,
      content_hash: hash("2"),
      record_hash: hash("3"),
    },
    current_source_ref: {
      project_source_id: projectSourceId,
      revision: 3,
      content_hash: hash("4"),
      record_hash: hash("5"),
      status: "active",
    },
    copy_ref: {
      artifact_manifest_id: "artifact_manifest_01K6W000000000000000000003",
      manifest_revision: 1,
      manifest_record_hash: hash("6"),
      artifact_id: "artifact_01K6W000000000000000000004",
      store_name: "petra-local",
      object_key: `sha256/${"7".repeat(64)}`,
      content_hash: hash("7"),
      byte_size: 21,
      media_type: "application/pdf",
    },
  },
  eligibility: {
    state: "eligible",
    policy_version: "petra-local-copy-retention-v1",
    blockers: [],
  },
  operation: {
    state: "ready",
    command_name: "DeleteLocalSourceCopy",
  },
} as PetraProjectSourceLocalCopyDeletionPreview;

describe("production source local-copy deletion integration", () => {
  it("builds one exact reviewed request without client-selected authority", () => {
    const request = createSourceLocalCopyDeletionRequest({
      preview,
      reason: "  The registered origin can safely supply these bytes again.  ",
      identity: {
        commandId: "command_01K6W000000000000000000005",
        idempotencyKey: "source.delete-local-copy:test",
      },
    });

    expect(request).toEqual({
      schema_name: "petra.project-source-local-copy-deletion-request",
      schema_version: "1.0.0",
      command_id: "command_01K6W000000000000000000005",
      idempotency_key: "source.delete-local-copy:test",
      expected: preview.expected,
      reason: "The registered origin can safely supply these bytes again.",
    });
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "recorded_at",
      "receipt_id",
      "local_copy_state",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("requires eligibility and classifies conflict, permission, and unknown outcomes", () => {
    expect(() =>
      createSourceLocalCopyDeletionRequest({ preview, reason: "  " }),
    ).toThrow("Explain why");
    expect(() =>
      createSourceLocalCopyDeletionRequest({
        preview: {
          ...preview,
          eligibility: {
            ...preview.eligibility,
            state: "blocked",
          },
        },
        reason: "Delete it.",
      }),
    ).toThrow("current eligible preview");
    expect(
      sourceLocalCopyDeletionConflict(
        new ProjectSourceLocalCopyDeletionClientError(
          409,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_COPY_STALE",
          "Stale.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceLocalCopyDeletionPermissionLost(
        new ProjectSourceLocalCopyDeletionClientError(
          403,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED",
          "Denied.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceLocalCopyDeletionOutcomeUnknown(new TypeError("Failed to fetch")),
    ).toBe(true);
  });

  it("renders the production action as distinct from Project-link removal", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceLocalCopyDeletionAction
          projectId={projectId}
          projectSourceId={projectSourceId}
          sourceTitle="A retained source"
          taskReturnPath={`/projects/${projectId}/sources/${projectSourceId}`}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Delete local copy");
    expect(markup).toContain('id="source-local-copy-deletion-trigger"');
    expect(markup).not.toContain("Remove from Project");
    expect(markup).not.toContain('aria-disabled="true"');
  });
});
