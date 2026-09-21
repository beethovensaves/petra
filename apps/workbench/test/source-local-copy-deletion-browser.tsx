import { ProjectSourceLocalCopyDeletionClientError } from "@petra/adapters";
import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import sourceFixture from "../../../packages/contracts/fixtures/accepted/project-source-view.json";
import { SourceDetails } from "../src/product/ReferenceWorkbench.js";
import type { SourceRecord } from "../src/product/model.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

declare global {
  interface Window {
    sourceLocalCopyDeletionCalls: {
      previews: Array<{ projectId: string; projectSourceId: string }>;
      deletions: PetraProjectSourceLocalCopyDeletionRequest[];
      recoveries: PetraProjectSourceLocalCopyDeletionRequest[];
      revalidations: number;
    };
  }
}

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
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
  project_source_id: projectSourceId,
  revision: sourceFixture.content.binding.revision,
  content_hash: sourceFixture.content.binding.content_hash,
  record_hash: hash("3"),
  status: "active" as const,
};
const copyRef = {
  artifact_manifest_id: sourceFixture.content.copy.manifest_ref.record_id,
  manifest_revision: 1 as const,
  manifest_record_hash: sourceFixture.content.copy.manifest_ref.content_hash,
  artifact_id: sourceFixture.content.copy.artifact_ref.record_id,
  store_name: "petra-local",
  object_key: `sha256/${sourceFixture.content.copy.artifact_ref.content_hash.slice(7, 9)}/${sourceFixture.content.copy.artifact_ref.content_hash.slice(9)}`,
  content_hash: sourceFixture.content.copy.artifact_ref.content_hash,
  byte_size: sourceFixture.content.copy.byte_size,
  media_type: sourceFixture.content.copy.media_type,
};

const retention: PetraProjectSourceLocalCopyDeletionPreview["retention"] = [
  {
    area: "project_link",
    state: "retained",
    reason: "The source remains linked to this Project.",
  },
  {
    area: "canonical_identity",
    state: "retained",
    reason: "The canonical source identity remains registered.",
  },
  {
    area: "artifact_manifest",
    state: "retained",
    reason: "The manifest becomes the retained copy identity and tombstone.",
  },
  {
    area: "rights_history",
    state: "retained",
    reason: "Rights decisions remain inspectable.",
  },
  {
    area: "selectors",
    state: "retained",
    reason: "Exact selectors remain part of retained evidence history.",
  },
  {
    area: "provenance",
    state: "retained",
    reason: "Provenance and History remain inspectable.",
  },
  {
    area: "local_bytes",
    state: "deleted_if_confirmed",
    reason: "Only these exact content-addressed bytes are deleted.",
  },
];

const previewFor = (
  blocked: boolean,
): PetraProjectSourceLocalCopyDeletionPreview => ({
  schema_name: "petra.project-source-local-copy-deletion-preview",
  schema_version: "1.0.0",
  project_id: projectId,
  project_source_id: projectSourceId,
  expected: {
    project_ref: projectRef,
    project_definition_ref: definitionRef,
    current_source_ref: currentSourceRef,
    copy_ref: copyRef,
  },
  eligibility: blocked
    ? {
        state: "blocked",
        policy_version: "petra-local-copy-retention-v1",
        blockers: [
          {
            kind: "active_work",
            count: 1,
            record_ids: ["work_unit_01K6W000000000000000000010"],
            reason:
              "Active parsing Work still depends on these exact local bytes.",
          },
        ],
      }
    : {
        state: "eligible",
        policy_version: "petra-local-copy-retention-v1",
        blockers: [],
      },
  retention,
  consequences: {
    project_link_unchanged: true,
    representations_may_stop_resolving: true,
    recovery: "reacquire_from_registered_origin",
  },
  operation: {
    state: blocked ? "blocked" : "ready",
    command_name: "DeleteLocalSourceCopy",
    method: "POST",
    path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion`,
    recovery_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion-recovery`,
  },
  read_at: "2026-09-20T16:10:00.000Z",
  content_hash: hash("4"),
});

const receiptFor = (
  request: PetraProjectSourceLocalCopyDeletionRequest,
): PetraProjectSourceLocalCopyDeletionReceipt => ({
  schema_name: "petra.project-source-local-copy-deletion-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_local_copy_deletion_receipt_01K6W000000000000000000011",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("5"),
  project_id: projectId,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  capability_grant_id: "capability_grant_01K6W000000000000000000012",
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  source_ref: request.expected.current_source_ref,
  copy_ref: request.expected.copy_ref,
  effect: {
    kind: "local_source_copy_deleted",
    local_copy_state: "absent",
    observation: "deleted_now",
    summary:
      "The exact local bytes are absent. The Project link and retained authority remain.",
  },
  preservation: {
    project_link: "retained",
    canonical_identity: "retained",
    artifact_manifest: "retained_as_tombstoned_copy_identity",
    rights_history: "retained",
    selectors: "retained",
    provenance: "retained",
    history: "retained",
  },
  destination: {
    place_role: "source_details",
    project_id: projectId,
    project_source_id: projectSourceId,
  },
  recovery: {
    command_path: previewFor(false).operation.path,
    assessment_path: previewFor(false).operation.recovery_path,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T16:11:00.000Z",
  record_hash: hash("6"),
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
  downstreamUse: "No Claims or Assertions cite this exact parsed copy.",
};

const delay = <Value,>(value: Value): Promise<Value> =>
  new Promise((resolveDelay) => setTimeout(() => resolveDelay(value), 100));
const rejectAfter = (error: Error): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(error), 100));
const mode =
  new URLSearchParams(window.location.search).get("mode") ?? "unknown";

window.sourceLocalCopyDeletionCalls = {
  previews: [],
  deletions: [],
  recoveries: [],
  revalidations: 0,
};

const client = {
  preview: (requestedProjectId: string, requestedProjectSourceId: string) => {
    window.sourceLocalCopyDeletionCalls.previews.push({
      projectId: requestedProjectId,
      projectSourceId: requestedProjectSourceId,
    });
    return delay(previewFor(mode === "blocked"));
  },
  delete: (
    _requestedProjectId: string,
    _requestedProjectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ) => {
    window.sourceLocalCopyDeletionCalls.deletions.push(
      structuredClone(request),
    );
    if (
      mode === "unknown" &&
      window.sourceLocalCopyDeletionCalls.deletions.length === 1
    ) {
      return rejectAfter(new TypeError("Failed to fetch"));
    }
    if (mode === "conflict") {
      return rejectAfter(
        new ProjectSourceLocalCopyDeletionClientError(
          409,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_COPY_STALE",
          "The exact copy changed.",
        ),
      );
    }
    if (mode === "authorization") {
      return rejectAfter(
        new ProjectSourceLocalCopyDeletionClientError(
          403,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED",
          "The signed-in actor is not authorized.",
        ),
      );
    }
    if (mode === "failure") {
      return rejectAfter(
        new ProjectSourceLocalCopyDeletionClientError(
          422,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_REASON_INVALID",
          "The reason was rejected.",
        ),
      );
    }
    return delay({
      receipt: receiptFor(request),
      applied: mode === "applied",
    });
  },
  assessRecovery: (
    _requestedProjectId: string,
    _requestedProjectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): Promise<PetraProjectSourceLocalCopyDeletionRecoveryView> => {
    window.sourceLocalCopyDeletionCalls.recoveries.push(
      structuredClone(request),
    );
    return delay({
      schema_name: "petra.project-source-local-copy-deletion-recovery-view",
      schema_version: "1.0.0",
      assessment_id:
        "source_local_copy_deletion_recovery_01K6W000000000000000000013",
      project_id: projectId,
      project_source_id: projectSourceId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash("5"),
      },
      effect: {
        state: "outcome_unknown",
        reason: "storage_delivery_unconfirmed",
        durable_intent: true,
        retry: {
          method: "POST",
          path: previewFor(false).operation.path,
          reuse_exact_request: true,
        },
      },
      return: {
        state: "exact",
        destination: {
          place_role: "source_details",
          project_id: projectId,
          project_source_id: projectSourceId,
        },
      },
      observed_at: "2026-09-20T16:12:00.000Z",
      content_hash: hash("7"),
    });
  },
};

const root = document.querySelector("#root");
if (root === null)
  throw new Error("Source local-copy deletion browser root is missing.");

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
            taskReturnPath={`/projects/${projectId}/sources/${projectSourceId}?from=graph&graphNodeId=claim_01K6W000000000000000000014&graphLayer=current`}
            localCopyDeletionClient={client}
            onLocalCopyDeleted={() => {
              window.sourceLocalCopyDeletionCalls.revalidations += 1;
            }}
          />
        </div>
      </main>
    </MemoryRouter>
  </StrictMode>,
);
