import { ProjectSourceProcessingClientError } from "@petra/adapters";
import type {
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
  PetraProjectSourceView,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import sourceFixture from "../../../packages/contracts/fixtures/accepted/project-source-view.json";
import { SourceProcessingPanel } from "../src/product/SourceProcessing.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

declare global {
  interface Window {
    sourceProcessingCalls: {
      reads: number;
      requests: PetraProjectSourceProcessingRequest[];
      recoveries: PetraProjectSourceProcessingRequest[];
    };
  }
}

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const source = sourceFixture as PetraProjectSourceView;
const projectId = source.project_id;
const projectSourceId = source.project_source_id;
const workUnitId = "work_unit_01K6T000000000000000000009";
const definitionRef = {
  project_definition_id:
    source.content.binding.project_definition_ref.record_id,
  revision: source.content.binding.project_definition_ref.revision,
  content_hash: source.content.binding.project_definition_ref.content_hash,
  record_hash: hash("2"),
};
const family = {
  semantic_key: "petra.source-processing" as const,
  contract: {
    name: "petra.document.parse" as const,
    version: "1.0.0" as const,
    content_hash: hash("3"),
  },
};
const requestTemplate = {
  project_ref: { project_id: projectId, revision: 4, record_hash: hash("1") },
  project_definition_ref: definitionRef,
  project_source_ref: {
    project_source_id: projectSourceId,
    revision: source.content.binding.revision,
    content_hash: source.content.binding.content_hash,
    record_hash: hash("4"),
    status: "active" as const,
  },
  source_role: source.content.binding.source_role,
  processing_family_ref: family,
};
const representation = {
  extent: "identity_only" as const,
  extent_label: "Identity only",
  page_count: 0,
  block_count: 0,
  source_span_count: 0,
};
const baseView = {
  schema_name: "petra.project-source-processing-view" as const,
  schema_version: "1.0.0" as const,
  project_id: projectId,
  project_source_id: projectSourceId,
  source: {
    ...source,
    content: { ...source.content, representation },
  },
  profile_binding: {
    project_ref: requestTemplate.project_ref,
    project_definition_ref: definitionRef,
    definition_family: "petra.scientific-evidence",
    profile_label: "Scientific evidence inquiry",
    source_role: source.content.binding.source_role,
    source_role_label: source.content.binding.source_role_label,
    processing_family_ref: family,
    processing_family_label: "Source processing" as const,
  },
  representation,
  limitations: [
    "Processing creates bounded Work; it does not endorse source meaning.",
    "No parsed representation is retained yet.",
    "Selected text cannot be sent remotely by this path.",
  ] as PetraProjectSourceProcessingView["limitations"],
  return: {
    place_role: "sources" as const,
    project_id: projectId,
    project_source_id: projectSourceId,
  },
  read_at: source.read_at,
  content_hash: hash("5"),
};
const readyView: PetraProjectSourceProcessingView = {
  ...baseView,
  processing: {
    state: "ready",
    reason: "exact_copy_and_parse_permission_available",
    request_template: requestTemplate,
    command: {
      method: "POST",
      path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
    },
  },
};
const activeView: PetraProjectSourceProcessingView = {
  ...baseView,
  processing: {
    state: "active",
    work_unit_ref: {
      work_unit_id: workUnitId,
      revision: 3,
      spec_hash: hash("6"),
      state: "running",
    },
    work_detail_path: `/api/queries/projects/${projectId}/work/${workUnitId}`,
    operations_path: `/api/queries/projects/${projectId}/work/${workUnitId}/operations`,
  },
};
const terminalView: PetraProjectSourceProcessingView = {
  ...baseView,
  processing: {
    state: "terminal",
    work_unit_ref: {
      work_unit_id: workUnitId,
      revision: 5,
      spec_hash: hash("6"),
      state: "completed",
    },
    work_detail_path: `/api/queries/projects/${projectId}/work/${workUnitId}`,
    operations_path: `/api/queries/projects/${projectId}/work/${workUnitId}/operations`,
  },
};

const receiptFor = (
  request: PetraProjectSourceProcessingRequest,
): PetraProjectSourceProcessingReceipt => ({
  schema_name: "petra.project-source-processing-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_processing_receipt_01K6T000000000000000000009",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("7"),
  project_id: projectId,
  actor: { actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV", actor_kind: "human" },
  capability_grant_id: "capability_grant_01K6T000000000000000000009",
  expected: request.expected,
  work_unit_ref: {
    work_unit_id: workUnitId,
    revision: 3,
    spec_hash: hash("6"),
    record_hash: hash("8"),
    state: "running",
  },
  input_manifest_ref: {
    worker_input_manifest_id:
      "worker_input_manifest_01K6T000000000000000000009",
    content_hash: hash("9"),
    record_hash: hash("a"),
  },
  effect: {
    kind: "source_processing_work_started",
    summary:
      "The exact source copy entered bounded local processing Work; source meaning is unchanged.",
    bounded_to_exact_source_copy: true,
    meaning_authority_unchanged: true,
  },
  destination: {
    place_role: "sources",
    project_id: projectId,
    project_source_id: projectSourceId,
    work_unit_id: workUnitId,
  },
  recovery: {
    command_path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
    assessment_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing-recovery`,
    processing_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T12:00:00.000Z",
  record_hash: hash("b"),
});

const mode =
  new URLSearchParams(window.location.search).get("mode") ?? "unknown";
window.sourceProcessingCalls = { reads: 0, requests: [], recoveries: [] };

const client = {
  get: (): Promise<PetraProjectSourceProcessingView> => {
    window.sourceProcessingCalls.reads += 1;
    if (mode === "load-failure")
      return Promise.reject(new TypeError("Offline"));
    if (mode === "unavailable") {
      return Promise.resolve({
        ...readyView,
        processing: {
          state: "unavailable",
          reason: "parse_not_permitted",
        },
      });
    }
    if (mode === "active") return Promise.resolve(activeView);
    if (mode === "terminal") return Promise.resolve(terminalView);
    if (mode === "stale" && window.sourceProcessingCalls.reads > 1) {
      return Promise.resolve(activeView);
    }
    return Promise.resolve(readyView);
  },
  start: (
    _projectId: string,
    _projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ) => {
    window.sourceProcessingCalls.requests.push(structuredClone(request));
    if (
      mode === "unknown" &&
      window.sourceProcessingCalls.requests.length === 1
    ) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    if (mode === "stale") {
      return Promise.reject(
        new ProjectSourceProcessingClientError(
          409,
          "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
          "Stale.",
        ),
      );
    }
    return Promise.resolve({
      receipt: receiptFor(request),
      workUnit: {} as PetraWorkUnit,
      inputManifest: {} as PetraWorkerInputManifest,
      processing: activeView,
      applied: true,
    });
  },
  assessRecovery: (
    _projectId: string,
    _projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ): Promise<PetraProjectSourceProcessingRecoveryView> => {
    window.sourceProcessingCalls.recoveries.push(structuredClone(request));
    return Promise.resolve({
      schema_name: "petra.project-source-processing-recovery-view",
      schema_version: "1.0.0",
      assessment_id: "source_processing_recovery_01K6T000000000000000000009",
      project_id: projectId,
      project_source_id: projectSourceId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash("7"),
      },
      effect: {
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
          reuse_exact_request: true,
        },
      },
      return: {
        state: "safe_fallback",
        destination: {
          place_role: "sources",
          project_id: projectId,
          project_source_id: projectSourceId,
        },
        reason: "No receipt was observed yet.",
      },
      observed_at: "2026-09-20T12:01:00.000Z",
      content_hash: hash("c"),
    });
  },
};

const root = document.querySelector("#root");
if (root === null)
  throw new Error("Source processing browser root is missing.");

createRoot(root).render(
  <StrictMode>
    <MemoryRouter>
      <main className="reference-reader" id="reference-main">
        <SourceProcessingPanel
          projectId={projectId}
          projectSourceId={projectSourceId}
          taskReturnPath={`/projects/${projectId}/sources/${projectSourceId}?from=sources&sourceQuery=Ada`}
          client={client}
        />
      </main>
    </MemoryRouter>
  </StrictMode>,
);
