import { ProjectSourceLinkRemovalClientError } from "@petra/adapters";
import type { PetraProjectSourceLinkRemovalPreview } from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { SourceLinkRemovalActions } from "./SourceLinkRemoval.js";
import {
  createSourceLinkRemovalRequest,
  sourceLinkRemovalConflict,
  sourceLinkRemovalOutcomeUnknown,
  sourceLinkRemovalPermissionLost,
} from "./source-link-removal.js";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const projectSourceId = "project_source_01K6W000000000000000000001";
const preview = {
  schema_name: "petra.project-source-link-removal-preview",
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
  },
  operation: {
    state: "ready",
    command_name: "ExcludeProjectSource",
  },
} as PetraProjectSourceLinkRemovalPreview;

describe("production Project-link removal integration", () => {
  it("builds one exact human-reviewed request without server-owned authority", () => {
    const request = createSourceLinkRemovalRequest({
      preview,
      reason: "  This source no longer belongs in the current evidence set.  ",
      identity: {
        commandId: "command_01K6W000000000000000000003",
        idempotencyKey: "source.remove-project-link:test",
      },
    });

    expect(request).toEqual({
      schema_name: "petra.project-source-link-removal-request",
      schema_version: "1.0.0",
      command_id: "command_01K6W000000000000000000003",
      idempotency_key: "source.remove-project-link:test",
      expected: preview.expected,
      reason: "This source no longer belongs in the current evidence set.",
    });
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "recorded_at",
      "resulting_source_ref",
      "local_copy_deleted",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("requires a reason and classifies conflict, permission, and unknown outcomes", () => {
    expect(() =>
      createSourceLinkRemovalRequest({ preview, reason: "  " }),
    ).toThrow("Explain why");
    expect(
      sourceLinkRemovalConflict(
        new ProjectSourceLinkRemovalClientError(
          409,
          "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE",
          "Stale.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceLinkRemovalPermissionLost(
        new ProjectSourceLinkRemovalClientError(
          403,
          "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED",
          "Denied.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceLinkRemovalOutcomeUnknown(new TypeError("Failed to fetch")),
    ).toBe(true);
  });

  it("keeps Project-link removal and local-copy deletion visibly distinct", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceLinkRemovalActions
          projectId={projectId}
          projectSourceId={projectSourceId}
          sourceTitle="A retained source"
          sourceRole="Literature source"
          sourceRoleId="scientific.literature"
          taskReturnPath={`/projects/${projectId}/sources/${projectSourceId}?from=graph&selected=claim_01K6W000000000000000000004`}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Remove from Project");
    expect(markup).toContain("Delete local copy");
    expect(markup).toContain('id="source-link-removal-trigger"');
    expect(markup).toContain('id="source-local-copy-deletion-trigger"');
    expect(markup).not.toContain(
      "No separate eligible local-copy deletion owner",
    );
  });
});
