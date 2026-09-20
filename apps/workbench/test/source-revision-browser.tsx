import { ProjectSourceRevisionClientError } from "@petra/adapters";
import type {
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import lifecycleReceiptFixture from "../../../packages/contracts/fixtures/accepted/project-source-lifecycle-receipt.json";
import sourceFixture from "../../../packages/contracts/fixtures/accepted/project-source-view.json";
import { SourceRevisionPanel } from "../src/product/SourceRevision.js";
import type {
  CreateProjectSourceReplacementInput,
  CreateProjectSourceReplacementResponse,
  ProjectSourceLifecycleCommandInput,
  ProjectSourceLifecycleCommandResponse,
} from "../src/product/project-data.js";
import type { SourceRevisionContext } from "../src/product/source-revision.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

declare global {
  interface Window {
    sourceRevisionCalls: {
      requests: PetraProjectSourceRevisionRequest[];
      recoveries: PetraProjectSourceRevisionRequest[];
      exclusions: ProjectSourceLifecycleCommandInput[];
      replacements: CreateProjectSourceReplacementInput[];
    };
  }
}

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const source = sourceFixture;
const lifecycleReceipt =
  lifecycleReceiptFixture as PetraProjectSourceLifecycleReceipt;
const projectId = source.project_id;
const predecessorId = source.project_source_id;
const successorId = "project_source_01K6V000000000000000000020";
const context: SourceRevisionContext = {
  projectId,
  projectRef: { project_id: projectId, revision: 1, record_hash: hash("1") },
  projectDefinitionRef: {
    project_definition_id:
      source.content.binding.project_definition_ref.record_id,
    revision: source.content.binding.project_definition_ref.revision,
    content_hash: source.content.binding.project_definition_ref.content_hash,
    record_hash: hash("2"),
  },
  currentSourceRef: {
    ...structuredClone(lifecycleReceipt.content.prior_source_ref),
    status: "active",
  },
};
const successorRef = {
  project_source_id: successorId,
  revision: 1 as const,
  content_hash: hash("3"),
  record_hash: hash("4"),
  status: "active" as const,
};

const receiptFor = (
  request: PetraProjectSourceRevisionRequest,
): PetraProjectSourceRevisionReceipt => ({
  schema_name: "petra.project-source-revision-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_revision_receipt_01K6V000000000000000000021",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("5"),
  project_id: projectId,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  capability_grant_id: "capability_grant_01K6V000000000000000000022",
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  predecessor_source_ref: request.expected.current_source_ref,
  work_ref: {
    record_id: source.content.identity.work_ref.record_id,
    revision: source.content.identity.work_ref.revision,
    record_hash: hash("6"),
  },
  work_version_ref: {
    record_id: source.content.identity.work_version_ref.record_id,
    revision: source.content.identity.work_version_ref.revision,
    record_hash: hash("7"),
  },
  material: {
    artifact_ref: {
      artifact_id: "artifact_01K6V000000000000000000023",
      revision: 1,
      content_hash: request.material.expected_content_hash,
      record_hash: hash("8"),
      byte_size: 25,
      media_type: request.material.media_type,
    },
    artifact_manifest_ref: {
      record_id: "artifact_manifest_01K6V000000000000000000024",
      revision: 1,
      record_hash: hash("9"),
    },
    rights_decision_ref: {
      record_id: "rights_decision_01K6V000000000000000000025",
      revision: 1,
      record_hash: hash("a"),
    },
    storage: {
      store_name: "petra-artifacts",
      object_key: "sha256/corrected",
      availability: "available",
    },
    origin: {
      origin_kind: "user_supplied",
      original_filename: request.material.original_filename,
      source_location: request.rights.source_location,
    },
  },
  successor_source_ref: successorRef,
  effect: {
    kind: "source_revision_intake_retained",
    summary: "The corrected version is retained as a distinct source.",
    predecessor_unchanged: true,
  },
  replacement_handoff: {
    state: "governed_replacement_required",
    exclude_predecessor: {
      command_name: "ExcludeProjectSource",
      method: "POST",
      path: `/api/commands/projects/${projectId}/sources/${predecessorId}/lifecycle`,
      requested_action: "exclude_project_source",
      expected_source_ref: request.expected.current_source_ref,
      reason: request.replacement.rationale,
    },
    create_replacement: {
      command_name: "CreateProjectSourceReplacement",
      method: "POST",
      path: `/api/commands/projects/${projectId}/source-replacements`,
      replacement_kind: "newer_version",
      replaced_source_from: "exclude_result.resulting_source_ref",
      replacement_source_ref: successorRef,
      exclusion_receipt_from: "exclude_result.receipt",
      rationale: request.replacement.rationale,
    },
  },
  destination: {
    place_role: "sources",
    project_id: projectId,
    project_source_id: successorId,
  },
  recovery: {
    command_path: `/api/commands/projects/${projectId}/sources/${predecessorId}/revisions`,
    assessment_path: `/api/queries/projects/${projectId}/source-revision-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T12:10:00.000Z",
  record_hash: hash("b"),
});

const delay = <Value,>(value: Value, milliseconds = 160): Promise<Value> =>
  new Promise((resolveDelay) => {
    setTimeout(() => resolveDelay(value), milliseconds);
  });
const rejectAfter = (error: Error): Promise<never> =>
  new Promise((_, reject) => {
    setTimeout(() => reject(error), 160);
  });

const mode =
  new URLSearchParams(window.location.search).get("mode") ?? "unknown";
window.sourceRevisionCalls = {
  requests: [],
  recoveries: [],
  exclusions: [],
  replacements: [],
};

const client = {
  addRevision: (
    _projectId: string,
    _projectSourceId: string,
    request: PetraProjectSourceRevisionRequest,
  ) => {
    window.sourceRevisionCalls.requests.push(structuredClone(request));
    if (
      mode === "unknown" &&
      window.sourceRevisionCalls.requests.length === 1
    ) {
      return rejectAfter(new TypeError("Failed to fetch"));
    }
    if (mode === "conflict") {
      return rejectAfter(
        new ProjectSourceRevisionClientError(
          409,
          "PROJECT_SOURCE_REVISION_SOURCE_STALE",
          "The active predecessor changed.",
        ),
      );
    }
    if (mode === "authorization") {
      return rejectAfter(
        new ProjectSourceRevisionClientError(
          403,
          "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
          "The signed-in actor is not authorized.",
        ),
      );
    }
    if (mode === "failure") {
      return rejectAfter(
        new ProjectSourceRevisionClientError(
          422,
          "PROJECT_SOURCE_REVISION_RIGHTS_INVALID",
          "Review the rights decision.",
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
    _projectId: string,
    _projectSourceId: string,
    request: PetraProjectSourceRevisionRequest,
  ): Promise<PetraProjectSourceRevisionRecoveryView> => {
    window.sourceRevisionCalls.recoveries.push(structuredClone(request));
    return delay({
      schema_name: "petra.project-source-revision-recovery-view",
      schema_version: "1.0.0",
      assessment_id: "source_revision_recovery_01K6V000000000000000000026",
      project_id: projectId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: hash("5"),
      },
      effect: {
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: `/api/commands/projects/${projectId}/sources/${predecessorId}/revisions`,
          reuse_exact_request: true,
        },
      },
      return: {
        state: "safe_fallback",
        destination: { place_role: "sources", project_id: projectId },
        reason: "No owned receipt was observed yet.",
      },
      observed_at: "2026-09-20T12:11:00.000Z",
      content_hash: hash("c"),
    });
  },
};

const executeExclusion = async (
  input: ProjectSourceLifecycleCommandInput,
): Promise<ProjectSourceLifecycleCommandResponse> => {
  window.sourceRevisionCalls.exclusions.push(structuredClone(input));
  return delay({
    receipt: lifecycleReceipt,
    projectSource: {} as PetraProjectSource,
    applied: true,
  });
};

const executeReplacement = async (
  input: CreateProjectSourceReplacementInput,
): Promise<CreateProjectSourceReplacementResponse> => {
  window.sourceRevisionCalls.replacements.push(structuredClone(input));
  return delay({
    receipt: {} as PetraProjectSourceReplacementReceipt,
    replacement: {} as PetraProjectSourceReplacement,
    applied: true,
  });
};

const root = document.querySelector("#root");
if (root === null) throw new Error("Source revision browser root is missing.");

createRoot(root).render(
  <StrictMode>
    <MemoryRouter>
      <main className="reference-reader" id="reference-main">
        <SourceRevisionPanel
          context={context}
          sourceTitle={source.content.identity.title}
          sourceRevision={`${source.content.identity.version_label} · source r${source.content.binding.revision}`}
          taskReturnPath={`/projects/${projectId}/sources/${predecessorId}?from=review&reviewId=review_session_01K6V000000000000000000027`}
          onCancel={() => undefined}
          client={client}
          executeExclusion={executeExclusion}
          executeReplacement={executeReplacement}
        />
      </main>
    </MemoryRouter>
  </StrictMode>,
);
