import { ProjectSourceReuseClientError } from "@petra/adapters";
import type { PetraProjectSourceReuseOptionsView } from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { PetraContractRegistry } from "./browser-contract-registry.js";
import { SourceReuseAvailability, SourceReusePanel } from "./SourceReuse.js";
import {
  createSourceReuseRequest,
  sourceReuseMembershipDuplicate,
  sourceReuseOptionsChanged,
  sourceReuseOutcomeUnknown,
  sourceReusePermissionLost,
} from "./source-reuse.js";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const candidateKey = "artifact_manifest_01K6T000000000000000000001";

const optionsView: PetraProjectSourceReuseOptionsView = {
  schema_name: "petra.project-source-reuse-options-view",
  schema_version: "1.0.0",
  project_id: projectId,
  expected: {
    project_ref: { project_id: projectId, revision: 4, record_hash: hash("1") },
    project_definition_ref: {
      project_definition_id: "project_definition_01K6T000000000000000000001",
      revision: 2,
      content_hash: hash("2"),
      record_hash: hash("3"),
    },
  },
  profile: {
    resolution: "registered",
    definition_family: "petra.scientific-evidence",
    label: "Scientific evidence inquiry",
    purpose: "Compare evidence without changing source authority.",
  },
  source_roles: [
    {
      semantic_key: "scientific.literature",
      label: "Source",
      meaning: "A versioned and rights-governed basis.",
    },
  ],
  availability: {
    state: "available",
    reason: "permitted_sources_found",
    message: "Choose a retained source copy.",
  },
  counts: { permitted: 1, already_linked: 0 },
  candidates: [
    {
      display: {
        title: "Reusable source",
        contributors: ["Ada Source"],
        version_label: "Accepted manuscript",
        publication_status: "accepted",
        published_date: { precision: "month", value: "2026-08" },
        origin_project_name: "Source Project",
        origin_source_role: {
          semantic_key: "scientific.literature",
          label: "Source",
          meaning: "A versioned and rights-governed basis.",
        },
        origin_membership_status: "active",
        copy_status: "available_for_reuse",
      },
      existing_source: {
        origin_project_source_ref: {
          project_id: "project_01K6T000000000000000000002",
          project_source_id: "project_source_01K6T000000000000000000003",
          revision: 1,
          content_hash: hash("4"),
          record_hash: hash("5"),
          status: "active",
        },
        work_ref: {
          work_id: "work_01K6T000000000000000000004",
          revision: 1,
          record_hash: hash("6"),
        },
        work_version_ref: {
          work_version_id: "work_version_01K6T000000000000000000005",
          revision: 1,
          record_hash: hash("7"),
        },
        artifact_ref: {
          artifact_id: "artifact_01K6T000000000000000000006",
          revision: 1,
          content_hash: hash("8"),
          record_hash: hash("9"),
        },
        artifact_manifest_ref: {
          artifact_manifest_id: candidateKey,
          revision: 1,
          record_hash: hash("a"),
        },
        rights_decision_ref: {
          record_id: "rights_decision_01K6T000000000000000000007",
          revision: 1,
          record_hash: hash("b"),
        },
      },
    },
  ],
};

describe("production existing-source reuse UI", () => {
  it("builds the registered request only from server-composed choices", () => {
    const request = createSourceReuseRequest({
      view: optionsView,
      candidateKey,
      sourceRole: "scientific.literature",
      identity: {
        commandId: "command_01K6T000000000000000000008",
        idempotencyKey: "source.reuse:browser-test",
      },
    });

    new PetraContractRegistry().assertValid(
      "project-source-reuse-request",
      "1.0.0",
      request,
    );
    expect(request.expected).toStrictEqual(optionsView.expected);
    expect(request.existing_source).toStrictEqual(
      optionsView.candidates[0]?.existing_source,
    );
    expect(request.project_membership).toStrictEqual({
      decision: "reuse_and_link",
      source_role: "scientific.literature",
    });
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "project_source_id",
      "storage",
      "recorded_at",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("rejects client-invented candidates and profile roles", () => {
    expect(() =>
      createSourceReuseRequest({
        view: optionsView,
        candidateKey: "artifact_manifest_01K6T000000000000000000099",
        sourceRole: "scientific.literature",
      }),
    ).toThrow("returned for this exact Project");
    expect(() =>
      createSourceReuseRequest({
        view: optionsView,
        candidateKey,
        sourceRole: "client.invented-role",
      }),
    ).toThrow("registered by this exact Project profile");
  });

  it("distinguishes unknown effects, stale choices, duplicates, and permission loss", () => {
    expect(sourceReuseOutcomeUnknown(new TypeError("Failed to fetch"))).toBe(
      true,
    );
    expect(
      sourceReuseOptionsChanged(
        new ProjectSourceReuseClientError(
          409,
          "PROJECT_SOURCE_REUSE_SOURCE_STALE",
          "Stale.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceReuseMembershipDuplicate(
        new ProjectSourceReuseClientError(
          409,
          "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE",
          "Duplicate.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceReusePermissionLost(
        new ProjectSourceReuseClientError(
          403,
          "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
          "Denied.",
        ),
      ),
    ).toBe(true);
  });

  it("presents empty, all-linked, unsupported-profile, and missing-role states without technical refs", () => {
    const states: Array<{
      reason: PetraProjectSourceReuseOptionsView["availability"]["reason"];
      expected: string;
    }> = [
      {
        reason: "no_permitted_sources",
        expected: "No permitted source is available to reuse",
      },
      {
        reason: "all_permitted_sources_already_linked",
        expected: "Every permitted source is already linked",
      },
      {
        reason: "profile_unsupported",
        expected: "This Project profile is not supported for source reuse",
      },
      {
        reason: "source_roles_unavailable",
        expected: "No registered Project role can receive this source",
      },
    ];
    for (const state of states) {
      const unsupported = state.reason === "profile_unsupported";
      const view: PetraProjectSourceReuseOptionsView = {
        ...optionsView,
        source_roles:
          unsupported || state.reason === "source_roles_unavailable"
            ? []
            : optionsView.source_roles,
        availability: {
          state: unsupported ? "unsupported" : "empty",
          reason: state.reason,
          message: "No current choice is available.",
        },
        counts: {
          permitted: 0,
          already_linked:
            state.reason === "all_permitted_sources_already_linked" ? 2 : 0,
        },
        candidates: [],
      };
      const markup = renderToStaticMarkup(
        <SourceReuseAvailability view={view} sourceTerm="source" />,
      );
      expect(markup).toContain(state.expected);
      expect(markup).not.toContain("sha256:");
      expect(markup).not.toContain("schema_name");
      expect(markup).not.toContain("artifact_manifest");
    }
  });

  it("introduces one understandable reuse task before loading protected choices", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceReusePanel
          projectId={projectId}
          sourceTerm="source"
          onCancel={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(markup).toContain("Use existing source");
    expect(markup).toContain("Existing permitted copy");
    expect(markup).toContain("without cloning them");
    expect(markup).toContain("Reading permitted existing sources");
  });
});
