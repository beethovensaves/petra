import { readFileSync } from "node:fs";

import { ProjectSourceProcessingClientError } from "@petra/adapters";
import type {
  PetraProjectSourceProcessingView,
  PetraProjectSourceView,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { PetraContractRegistry } from "./browser-contract-registry.js";
import { SourceProcessingPanel } from "./SourceProcessing.js";
import {
  createSourceProcessingRequest,
  sourceProcessingOutcomeUnknown,
  sourceProcessingPermissionLost,
  sourceProcessingStateChanged,
} from "./source-processing.js";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const source = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const readyView: PetraProjectSourceProcessingView = {
  schema_name: "petra.project-source-processing-view",
  schema_version: "1.0.0",
  project_id: source.project_id,
  project_source_id: source.project_source_id,
  source: {
    ...source,
    content: {
      ...source.content,
      representation: {
        extent: "identity_only",
        extent_label: "Identity only",
        page_count: 0,
        block_count: 0,
        source_span_count: 0,
      },
    },
  },
  profile_binding: {
    project_ref: {
      project_id: source.project_id,
      revision: 4,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      project_definition_id:
        source.content.binding.project_definition_ref.record_id,
      revision: source.content.binding.project_definition_ref.revision,
      content_hash: source.content.binding.project_definition_ref.content_hash,
      record_hash: hash("2"),
    },
    definition_family: "petra.scientific-evidence",
    profile_label: "Scientific evidence inquiry",
    source_role: source.content.binding.source_role,
    source_role_label: source.content.binding.source_role_label,
    processing_family_ref: {
      semantic_key: "petra.source-processing",
      contract: {
        name: "petra.document.parse",
        version: "1.0.0",
        content_hash: hash("3"),
      },
    },
    processing_family_label: "Source processing",
  },
  processing: {
    state: "ready",
    reason: "exact_copy_and_parse_permission_available",
    request_template: {
      project_ref: {
        project_id: source.project_id,
        revision: 4,
        record_hash: hash("1"),
      },
      project_definition_ref: {
        project_definition_id:
          source.content.binding.project_definition_ref.record_id,
        revision: source.content.binding.project_definition_ref.revision,
        content_hash:
          source.content.binding.project_definition_ref.content_hash,
        record_hash: hash("2"),
      },
      project_source_ref: {
        project_source_id: source.project_source_id,
        revision: source.content.binding.revision,
        content_hash: source.content.binding.content_hash,
        record_hash: hash("4"),
        status: "active",
      },
      source_role: source.content.binding.source_role,
      processing_family_ref: {
        semantic_key: "petra.source-processing",
        contract: {
          name: "petra.document.parse",
          version: "1.0.0",
          content_hash: hash("3"),
        },
      },
    },
    command: {
      method: "POST",
      path: `/api/commands/projects/${source.project_id}/sources/${source.project_source_id}/processing`,
    },
  },
  representation: {
    extent: "identity_only",
    extent_label: "Identity only",
    page_count: 0,
    block_count: 0,
    source_span_count: 0,
  },
  limitations: [
    "Processing does not endorse source meaning or apply Project authority.",
  ],
  return: {
    place_role: "sources",
    project_id: source.project_id,
    project_source_id: source.project_source_id,
  },
  read_at: source.read_at,
  content_hash: hash("5"),
};

describe("production Project source processing UI", () => {
  it("submits only the exact server-composed template with caller identities", () => {
    const request = createSourceProcessingRequest({
      view: readyView,
      identity: {
        commandId: "command_01K6T000000000000000000008",
        idempotencyKey: "source.process:browser-test",
      },
    });

    new PetraContractRegistry().assertValid(
      "project-source-processing-request",
      "1.0.0",
      request,
    );
    expect(request.expected).toStrictEqual(
      readyView.processing.state === "ready"
        ? readyView.processing.request_template
        : undefined,
    );
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "work_unit_id",
      "worker",
      "recorded_at",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("refuses to invent a processing command outside the ready state", () => {
    expect(() =>
      createSourceProcessingRequest({
        view: {
          ...readyView,
          processing: {
            state: "unavailable",
            reason: "parse_not_permitted",
          },
        },
      }),
    ).toThrow("server-composed ready state");
  });

  it("distinguishes unknown effects, changed source state, and permission loss", () => {
    expect(
      sourceProcessingOutcomeUnknown(new TypeError("Failed to fetch")),
    ).toBe(true);
    expect(
      sourceProcessingStateChanged(
        new ProjectSourceProcessingClientError(
          409,
          "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
          "Stale.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceProcessingPermissionLost(
        new ProjectSourceProcessingClientError(
          403,
          "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED",
          "Denied.",
        ),
      ),
    ).toBe(true);
  });

  it("introduces one exact processing task while eligibility loads", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceProcessingPanel
          projectId={source.project_id}
          projectSourceId={source.project_source_id}
          taskReturnPath={`/projects/${source.project_id}/sources/${source.project_source_id}`}
        />
      </MemoryRouter>,
    );
    expect(markup).toContain("Processing details");
    expect(markup).toContain("Bounded Work");
    expect(markup).toContain("Reading processing details");
  });
});
