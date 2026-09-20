import { readFileSync } from "node:fs";

import type {
  PetraProjectSourceProcessingView,
  PetraProjectSourceView,
} from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import { ProjectSourceProcessingClient } from "../src/project-source-processing-client.js";

const source = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;
const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const view: PetraProjectSourceProcessingView = {
  schema_name: "petra.project-source-processing-view",
  schema_version: "1.0.0",
  project_id: source.project_id,
  project_source_id: source.project_source_id,
  source,
  profile_binding: {
    project_ref: {
      project_id: source.project_id,
      revision: 1,
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
    source_role_label: "Source",
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
        revision: 1,
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
  representation: source.content.representation,
  limitations: ["Processing does not change source meaning."],
  return: {
    place_role: "sources",
    project_id: source.project_id,
    project_source_id: source.project_source_id,
  },
  read_at: source.read_at,
  content_hash: hash("5"),
};

describe("ProjectSourceProcessingClient", () => {
  it("reads and validates the exact renderer-neutral source processing view", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(view), { status: 200 })),
    );
    const client = new ProjectSourceProcessingClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: fetcher,
    });
    await expect(
      client.get(source.project_id, source.project_source_id),
    ).resolves.toStrictEqual(view);
    expect(fetcher).toHaveBeenCalledWith(
      new URL(
        `/api/queries/projects/${source.project_id}/sources/${source.project_source_id}/processing`,
        "http://petra.local",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects a response that crosses the exact source return", async () => {
    const crossed = structuredClone(view);
    crossed.return.project_source_id =
      "project_source_01K6T000000000000000000099";
    const client = new ProjectSourceProcessingClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: () =>
        Promise.resolve(new Response(JSON.stringify(crossed), { status: 200 })),
    });
    await expect(
      client.get(source.project_id, source.project_source_id),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_PROCESSING_RESPONSE_INVALID",
    });
  });
});
