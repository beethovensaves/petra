import { ProjectSourceLinkRemovalClientError } from "@petra/adapters";
import type {
  PetraProjectSource,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
  PetraProjectSourceLifecycleReceipt,
} from "@petra/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import lifecycleReceiptFixture from "../../../packages/contracts/fixtures/accepted/project-source-lifecycle-receipt.json";
import sourceFixture from "../../../packages/contracts/fixtures/accepted/project-source-view.json";
import { SourceDetails } from "../src/product/ReferenceWorkbench.js";
import type { SourceRecord } from "../src/product/model.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

declare global {
  interface Window {
    sourceLinkRemovalCalls: {
      previews: Array<{ projectId: string; projectSourceId: string }>;
      removals: PetraProjectSourceLinkRemovalRequest[];
      recoveries: PetraProjectSourceLinkRemovalRequest[];
      revalidations: number;
    };
  }
}

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const lifecycleReceipt =
  lifecycleReceiptFixture as PetraProjectSourceLifecycleReceipt;
const projectId = sourceFixture.project_id;
const projectSourceId = sourceFixture.project_source_id;
const projectRef = {
  project_id: projectId,
  revision: 4,
  record_hash: hash("1"),
};
const definitionRef = {
  project_definition_id:
    sourceFixture.content.binding.project_definition_ref.record_id,
  revision: sourceFixture.content.binding.project_definition_ref.revision,
  content_hash:
    sourceFixture.content.binding.project_definition_ref.content_hash,
  record_hash: hash("2"),
};
const currentSourceRef = {
  ...structuredClone(lifecycleReceipt.content.prior_source_ref),
  status: "active" as const,
};

const preview: PetraProjectSourceLinkRemovalPreview = {
  schema_name: "petra.project-source-link-removal-preview",
  schema_version: "1.0.0",
  project_id: projectId,
  project_source_id: projectSourceId,
  expected: {
    project_ref: projectRef,
    project_definition_ref: definitionRef,
    current_source_ref: currentSourceRef,
  },
  transition: {
    state: "preview_available",
    from_status: "active",
    to_status: "excluded",
    effect: "ordinary_new_use_disabled",
    reason:
      "Removing this Project link disables ordinary new use while retaining authority.",
  },
  impact: {
    scope: "registered_direct_and_scientific_downstream",
    groups: [
      {
        group_kind: "parsed_documents",
        total_count: 1,
        returned_count: 1,
        coverage: "complete",
        refs: [
          {
            record_kind: "parsed_document",
            record_id: "parsed_document_01K6W000000000000000000010",
            revision: 1,
            record_hash: hash("a"),
            posture: "current",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "structural_blocks",
        total_count: 2,
        returned_count: 1,
        coverage: "truncated",
        refs: [
          {
            record_kind: "structural_block",
            record_id: "structural_block_01K6W000000000000000000011",
            revision: 1,
            record_hash: hash("b"),
            posture: "current_and_historical",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "source_spans",
        total_count: 3,
        returned_count: 1,
        coverage: "truncated",
        refs: [
          {
            record_kind: "source_span",
            record_id: "source_span_01K6W000000000000000000012",
            revision: 1,
            record_hash: hash("c"),
            posture: "current_and_historical",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "claims",
        total_count: 2,
        returned_count: 1,
        coverage: "truncated",
        refs: [
          {
            record_kind: "claim",
            record_id: "claim_01K6W000000000000000000013",
            revision: 1,
            record_hash: hash("d"),
            posture: "current",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "assertions",
        total_count: 1,
        returned_count: 1,
        coverage: "complete",
        refs: [
          {
            record_kind: "assertion",
            record_id: "assertion_01K6W000000000000000000014",
            revision: 1,
            record_hash: hash("e"),
            posture: "current",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "active_work",
        total_count: 1,
        returned_count: 1,
        coverage: "complete",
        refs: [
          {
            record_kind: "work_unit",
            record_id: "work_unit_01K6W000000000000000000015",
            revision: 1,
            record_hash: hash("f"),
            posture: "current",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "open_reviews",
        total_count: 1,
        returned_count: 1,
        coverage: "complete",
        refs: [
          {
            record_kind: "review_session",
            record_id: "review_session_01K6W000000000000000000016",
            revision: 1,
            record_hash: hash("7"),
            posture: "current",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
      {
        group_kind: "grounded_responses",
        total_count: 1,
        returned_count: 1,
        coverage: "complete",
        refs: [
          {
            record_kind: "grounded_response",
            record_id: "grounded_response_01K6W000000000000000000017",
            revision: 1,
            record_hash: hash("8"),
            posture: "historical",
            effect: "retained",
          },
        ],
        effect: "retained",
      },
    ],
    limitations: [
      "Registered direct and scientific dependencies are counted; unregistered profile-specific transitive dependencies are not inferred.",
    ],
  },
  retention: [
    {
      area: "project_source_history",
      state: "retained",
      reason: "Immutable Project-link revisions remain retained.",
    },
    {
      area: "canonical_identity",
      state: "retained",
      reason: "The global Work identity remains retained.",
    },
    {
      area: "selected_work_version",
      state: "retained",
      reason: "The immutable selected WorkVersion remains retained.",
    },
    {
      area: "artifact_manifest",
      state: "retained",
      reason: "The copy manifest remains retained.",
    },
    {
      area: "local_artifact",
      state: "deletion_unavailable",
      reason: "Project-link removal never authorizes local-copy deletion.",
    },
    {
      area: "parsed_representation",
      state: "retained",
      reason: "Parsed representations remain retained.",
    },
    {
      area: "provenance",
      state: "retained",
      reason: "Provenance remains retained.",
    },
  ],
  operation: {
    state: "ready",
    command_name: "ExcludeProjectSource",
    method: "POST",
    path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/link-removal`,
    recovery_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/link-removal-recovery`,
    separate_local_copy_deletion: true,
  },
  read_at: "2026-09-20T16:00:00.000Z",
  content_hash: hash("3"),
};

const receiptFor = (
  request: PetraProjectSourceLinkRemovalRequest,
): PetraProjectSourceLinkRemovalReceipt => ({
  schema_name: "petra.project-source-link-removal-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_link_removal_receipt_01K6W000000000000000000004",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("4"),
  project_id: projectId,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  capability_grant_id: "capability_grant_01K6W000000000000000000005",
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  prior_source_ref: request.expected.current_source_ref,
  resulting_source_ref: {
    ...structuredClone(lifecycleReceipt.content.resulting_source_ref),
    status: "excluded",
  },
  lifecycle_receipt: lifecycleReceipt,
  effect: {
    kind: "project_source_link_removed",
    summary:
      "Ordinary new Project use is disabled; retained source authority remains.",
    ordinary_new_project_use: "disabled",
    preservation: lifecycleReceipt.content.preservation,
    local_copy_deleted: false,
  },
  destination: {
    place_role: "sources",
    project_id: projectId,
    project_source_id: projectSourceId,
  },
  recovery: {
    command_path: preview.operation.path,
    assessment_path: preview.operation.recovery_path,
    inverse_command_name: "RestoreProjectSource",
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T16:05:00.000Z",
  record_hash: hash("5"),
});

const source: SourceRecord = {
  id: projectSourceId,
  title: sourceFixture.content.identity.title,
  kind: "Journal article",
  role: sourceFixture.content.binding.source_role_label,
  roleId: sourceFixture.content.binding.source_role,
  creator: "Ada Researcher",
  revision: "Version of record · source r1",
  copy: "PDF · 21 bytes",
  location: sourceFixture.content.copy.source_location,
  addedAt: sourceFixture.content.binding.added_at,
  extent: "complete",
  extentLabel: "Complete parsed representation",
  rights: "CC-BY-4.0 · verified",
  downstreamUse: "2 Claims and 1 Assertion cite this exact parsed copy.",
};

const delay = <Value,>(value: Value): Promise<Value> =>
  new Promise((resolveDelay) => setTimeout(() => resolveDelay(value), 120));
const rejectAfter = (error: Error): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(error), 120));
const mode =
  new URLSearchParams(window.location.search).get("mode") ?? "unknown";

window.sourceLinkRemovalCalls = {
  previews: [],
  removals: [],
  recoveries: [],
  revalidations: 0,
};

const client = {
  preview: (requestedProjectId: string, requestedProjectSourceId: string) => {
    window.sourceLinkRemovalCalls.previews.push({
      projectId: requestedProjectId,
      projectSourceId: requestedProjectSourceId,
    });
    return delay(structuredClone(preview));
  },
  remove: (
    _requestedProjectId: string,
    _requestedProjectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
  ) => {
    window.sourceLinkRemovalCalls.removals.push(structuredClone(request));
    if (
      mode === "unknown" &&
      window.sourceLinkRemovalCalls.removals.length === 1
    ) {
      return rejectAfter(new TypeError("Failed to fetch"));
    }
    if (mode === "conflict") {
      return rejectAfter(
        new ProjectSourceLinkRemovalClientError(
          409,
          "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE",
          "The source revision changed.",
        ),
      );
    }
    if (mode === "authorization") {
      return rejectAfter(
        new ProjectSourceLinkRemovalClientError(
          403,
          "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED",
          "The signed-in actor is not authorized.",
        ),
      );
    }
    if (mode === "failure") {
      return rejectAfter(
        new ProjectSourceLinkRemovalClientError(
          422,
          "PROJECT_SOURCE_LINK_REMOVAL_REASON_INVALID",
          "The reason was rejected.",
        ),
      );
    }
    return delay({
      receipt: receiptFor(request),
      projectSource: {} as PetraProjectSource,
      applied: mode === "applied",
    });
  },
  assessRecovery: (
    _requestedProjectId: string,
    _requestedProjectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
  ): Promise<PetraProjectSourceLinkRemovalRecoveryView> => {
    window.sourceLinkRemovalCalls.recoveries.push(structuredClone(request));
    return delay({
      schema_name: "petra.project-source-link-removal-recovery-view",
      schema_version: "1.0.0",
      assessment_id: "source_link_removal_recovery_01K6W000000000000000000006",
      project_id: projectId,
      project_source_id: projectSourceId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash("4"),
      },
      effect: {
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: preview.operation.path,
          reuse_exact_request: true,
        },
      },
      return: {
        state: "safe_fallback",
        destination: { place_role: "sources", project_id: projectId },
        reason: "No owned receipt was observed at the recovery cutoff.",
      },
      observed_at: "2026-09-20T16:06:00.000Z",
      content_hash: hash("6"),
    });
  },
};

const root = document.querySelector("#root");
if (root === null)
  throw new Error("Source link removal browser root is missing.");

createRoot(root).render(
  <StrictMode>
    <MemoryRouter>
      <main className="reference-reader" id="reference-main">
        <div className="reference-reader-layout">
          <article className="reference-document">
            <h1>{source.title}</h1>
            <p>Exact retained source content remains inspectable.</p>
          </article>
          <SourceDetails
            projectId={projectId}
            source={source}
            taskReturnPath={`/projects/${projectId}/sources/${projectSourceId}?from=graph&graphNodeId=claim_01K6W000000000000000000007&graphLayer=current`}
            linkRemovalClient={client}
            onLinkRemoved={() => {
              window.sourceLinkRemovalCalls.revalidations += 1;
            }}
          />
        </div>
      </main>
    </MemoryRouter>
  </StrictMode>,
);
