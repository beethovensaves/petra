import { ProjectSourceReuseClientError } from "@petra/adapters";
import type {
  PetraProjectSource,
  PetraProjectSourceReuseOptionsView,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { SourceReusePanel } from "../src/product/SourceReuse.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

declare global {
  interface Window {
    sourceReuseCalls: {
      optionReads: number;
      requests: PetraProjectSourceReuseRequest[];
      recoveries: PetraProjectSourceReuseRequest[];
    };
    sourceReuseCompletion?: {
      projectId: string;
      projectSourceId: string;
      receipt: PetraProjectSourceReuseReceipt;
    };
  }
}

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const projectSourceId = "project_source_01K6T000000000000000000009";
const candidateKey = "artifact_manifest_01K6T000000000000000000001";

const availableOptions = {
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
    {
      semantic_key: "scientific.background",
      label: "Background",
      meaning: "Context that does not directly support a finding.",
    },
  ],
  availability: {
    state: "available",
    reason: "permitted_sources_found",
    message: "Choose a retained source copy.",
  },
  counts: { permitted: 1, already_linked: 1 },
  candidates: [
    {
      display: {
        title: "Reusable source",
        contributors: ["Ada Source", "Research Group"],
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
} as PetraProjectSourceReuseOptionsView;

const emptyOptions = (
  reason: PetraProjectSourceReuseOptionsView["availability"]["reason"],
): PetraProjectSourceReuseOptionsView => ({
  ...availableOptions,
  source_roles:
    reason === "profile_unsupported" || reason === "source_roles_unavailable"
      ? []
      : availableOptions.source_roles,
  availability: {
    state: reason === "profile_unsupported" ? "unsupported" : "empty",
    reason,
    message: "No current choice is available.",
  },
  counts: {
    permitted: 0,
    already_linked: reason === "all_permitted_sources_already_linked" ? 2 : 0,
  },
  candidates: [],
});

const receiptFor = (
  request: PetraProjectSourceReuseRequest,
): PetraProjectSourceReuseReceipt =>
  ({
    project_id: projectId,
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    project_source_ref: {
      project_source_id: projectSourceId,
      revision: 1,
      record_hash: hash("c"),
    },
    membership: {
      source_role: request.project_membership.source_role,
    },
    effect: {
      summary: "The exact retained copy is linked without cloning its bytes.",
    },
    destination: {
      project_id: projectId,
      project_source_id: projectSourceId,
    },
  }) as PetraProjectSourceReuseReceipt;

const mode = new URLSearchParams(window.location.search).get("mode") ?? "stale";
window.sourceReuseCalls = { optionReads: 0, requests: [], recoveries: [] };

const client = {
  getOptions: (): Promise<PetraProjectSourceReuseOptionsView> => {
    window.sourceReuseCalls.optionReads += 1;
    if (mode === "permission") {
      return Promise.reject(
        new ProjectSourceReuseClientError(
          403,
          "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
          "Denied.",
        ),
      );
    }
    if (mode === "failure") {
      return Promise.reject(
        new ProjectSourceReuseClientError(
          503,
          "PROJECT_SOURCE_REUSE_OPTIONS_UNAVAILABLE",
          "Unavailable.",
        ),
      );
    }
    if (mode === "empty") {
      return Promise.resolve(emptyOptions("no_permitted_sources"));
    }
    if (mode === "all-linked") {
      return Promise.resolve(
        emptyOptions("all_permitted_sources_already_linked"),
      );
    }
    if (mode === "unsupported") {
      return Promise.resolve(emptyOptions("profile_unsupported"));
    }
    if (mode === "roles") {
      return Promise.resolve(emptyOptions("source_roles_unavailable"));
    }
    if (mode === "duplicate" && window.sourceReuseCalls.optionReads > 1) {
      return Promise.resolve(
        emptyOptions("all_permitted_sources_already_linked"),
      );
    }
    return Promise.resolve(structuredClone(availableOptions));
  },
  reuse: (_projectId: string, request: PetraProjectSourceReuseRequest) => {
    window.sourceReuseCalls.requests.push(structuredClone(request));
    if (mode === "stale" && window.sourceReuseCalls.requests.length === 1) {
      return Promise.reject(
        new ProjectSourceReuseClientError(
          409,
          "PROJECT_SOURCE_REUSE_SOURCE_STALE",
          "Stale.",
        ),
      );
    }
    if (mode === "unknown" && window.sourceReuseCalls.requests.length === 1) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    if (mode === "duplicate") {
      return Promise.reject(
        new ProjectSourceReuseClientError(
          409,
          "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE",
          "Duplicate.",
        ),
      );
    }
    return Promise.resolve({
      receipt: receiptFor(request),
      projectSource: {
        project_source_id: projectSourceId,
        revision: 1,
      } as PetraProjectSource,
      applied: true,
    });
  },
  assessRecovery: (
    _projectId: string,
    request: PetraProjectSourceReuseRequest,
  ): Promise<PetraProjectSourceReuseRecoveryView> => {
    window.sourceReuseCalls.recoveries.push(structuredClone(request));
    return Promise.resolve({
      effect: {
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: `/api/commands/projects/${projectId}/sources/reuse`,
          reuse_exact_request: true,
        },
      },
    } as PetraProjectSourceReuseRecoveryView);
  },
};

const root = document.querySelector("#root");
if (root === null) throw new Error("Source reuse browser root is missing.");

createRoot(root).render(
  <StrictMode>
    <MemoryRouter>
      <main className="reference-surface" id="reference-main">
        <SourceReusePanel
          projectId={projectId}
          sourceTerm="source"
          sourceQuery="Ada"
          client={client}
          onCancel={() => undefined}
          onComplete={(completion) => {
            window.sourceReuseCompletion = structuredClone(completion);
          }}
        />
      </main>
    </MemoryRouter>
  </StrictMode>,
);
