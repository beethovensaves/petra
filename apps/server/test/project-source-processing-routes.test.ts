import { readFileSync } from "node:fs";

import type {
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
  PetraProjectSourceView,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import type {
  ProjectSourceProcessingAuthority,
  ProjectSourceProcessingViewReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const TOKEN = "source-processing-token";
const source = fixture<PetraProjectSourceView>("project-source-view");
const work = fixture<PetraWorkUnit>("work-unit-requested");
const input = fixture<PetraWorkerInputManifest>("worker-input-manifest");
const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const family = {
  semantic_key: "petra.source-processing" as const,
  contract: {
    name: "petra.document.parse" as const,
    version: "1.0.0" as const,
    content_hash: hash("a"),
  },
};
const request: PetraProjectSourceProcessingRequest = {
  schema_name: "petra.project-source-processing-request",
  schema_version: "1.0.0",
  command_id: "command_01K6T000000000000000000053",
  idempotency_key: "wave6:source-processing:route",
  expected: {
    project_ref: {
      project_id: source.project_id,
      revision: 1,
      record_hash: hash("b"),
    },
    project_definition_ref: {
      project_definition_id:
        source.content.binding.project_definition_ref.record_id,
      revision: source.content.binding.project_definition_ref.revision,
      content_hash: source.content.binding.project_definition_ref.content_hash,
      record_hash: hash("c"),
    },
    project_source_ref: {
      project_source_id: source.project_source_id,
      revision: source.content.binding.revision,
      content_hash: source.content.binding.content_hash,
      record_hash: hash("d"),
      status: "active",
    },
    source_role: source.content.binding.source_role,
    processing_family_ref: family,
  },
};
const runningWork: PetraWorkUnit = {
  ...work,
  revision: 3,
  status: {
    state: "running",
    requested_at: work.status.requested_at,
    queued_at: "2026-09-20T12:00:00.000Z",
    started_at: "2026-09-20T12:00:00.000Z",
    attempt: 1,
  },
  updated_at: "2026-09-20T12:00:00.000Z",
};
const processing: PetraProjectSourceProcessingView = {
  schema_name: "petra.project-source-processing-view",
  schema_version: "1.0.0",
  project_id: source.project_id,
  project_source_id: source.project_source_id,
  source,
  profile_binding: {
    project_ref: request.expected.project_ref,
    project_definition_ref: request.expected.project_definition_ref,
    definition_family: "petra.scientific-evidence",
    profile_label: "Scientific evidence inquiry",
    source_role: request.expected.source_role,
    source_role_label: "Source",
    processing_family_ref: family,
    processing_family_label: "Source processing",
  },
  processing: {
    state: "active",
    work_unit_ref: {
      work_unit_id: runningWork.work_unit_id,
      revision: runningWork.revision,
      spec_hash: runningWork.spec_hash,
      state: "running",
    },
    work_detail_path: `/api/queries/projects/${source.project_id}/work/${runningWork.work_unit_id}`,
    operations_path: `/api/queries/projects/${source.project_id}/work/${runningWork.work_unit_id}/operations`,
  },
  representation: source.content.representation,
  limitations: ["Processing does not change source meaning."],
  return: {
    place_role: "sources",
    project_id: source.project_id,
    project_source_id: source.project_source_id,
  },
  read_at: source.read_at,
  content_hash: hash("e"),
};
const receipt: PetraProjectSourceProcessingReceipt = {
  schema_name: "petra.project-source-processing-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_processing_receipt_01K6T000000000000000000053",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("f"),
  project_id: source.project_id,
  actor: { actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV", actor_kind: "human" },
  capability_grant_id: "capability_grant_01K6T000000000000000000053",
  expected: request.expected,
  work_unit_ref: {
    work_unit_id: runningWork.work_unit_id,
    revision: runningWork.revision,
    spec_hash: runningWork.spec_hash,
    record_hash: hash("1"),
    state: "running",
  },
  input_manifest_ref: {
    worker_input_manifest_id: input.worker_input_manifest_id,
    content_hash: input.content_hash,
    record_hash: hash("2"),
  },
  effect: {
    kind: "source_processing_work_started",
    summary: "The exact source entered bounded processing Work.",
    bounded_to_exact_source_copy: true,
    meaning_authority_unchanged: true,
  },
  destination: {
    place_role: "sources",
    project_id: source.project_id,
    project_source_id: source.project_source_id,
    work_unit_id: runningWork.work_unit_id,
  },
  recovery: {
    command_path: `/api/commands/projects/${source.project_id}/sources/${source.project_source_id}/processing`,
    assessment_path: `/api/queries/projects/${source.project_id}/sources/${source.project_source_id}/processing-recovery`,
    processing_path: `/api/queries/projects/${source.project_id}/sources/${source.project_source_id}/processing`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T12:00:00.000Z",
  record_hash: hash("3"),
};
const recovery: PetraProjectSourceProcessingRecoveryView = {
  schema_name: "petra.project-source-processing-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_processing_recovery_01K6T000000000000000000053",
  project_id: source.project_id,
  project_source_id: source.project_source_id,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash("f"),
  },
  effect: { state: "effect_confirmed", receipt },
  return: { state: "exact", destination: receipt.destination },
  observed_at: "2026-09-20T12:01:00.000Z",
  content_hash: hash("4"),
};

describe("project source processing routes", () => {
  it("reads Details, starts exact Work, and reconciles the same return", async () => {
    const authority: ProjectSourceProcessingAuthority = {
      executeProjectSourceProcessing: vi.fn(() =>
        Promise.resolve({
          receipt,
          workUnit: runningWork,
          inputManifest: input,
          processing,
          applied: true,
        }),
      ),
      assessProjectSourceProcessingRecovery: vi.fn(() =>
        Promise.resolve(recovery),
      ),
    };
    const views: ProjectSourceProcessingViewReader = {
      getProjectSourceProcessingView: vi.fn(() => Promise.resolve(processing)),
    };
    const resolver = {
      resolveCommandPrincipal: vi.fn(() =>
        Promise.resolve({
          state: "resolved" as const,
          actor: receipt.actor,
          capabilityGrantId: receipt.capability_grant_id,
        }),
      ),
    };
    const app = createPetraApp({
      authToken: TOKEN,
      projectSourceProcessingAuthority: authority,
      projectSourceProcessingViews: views,
      commandPrincipalResolver: resolver,
    });
    const prefix = `/api/queries/projects/${source.project_id}/sources/${source.project_source_id}`;
    const detail = await app.app.request(`${prefix}/processing`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(detail.status).toBe(200);
    expect(await detail.json()).toStrictEqual(processing);

    const start = await app.app.request(
      `/api/commands/projects/${source.project_id}/sources/${source.project_source_id}/processing`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );
    expect(start.status).toBe(201);
    expect((await start.json()) as object).toMatchObject({
      applied: true,
      receipt,
    });

    const reconcile = await app.app.request(`${prefix}/processing-recovery`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    expect(reconcile.status).toBe(200);
    expect(await reconcile.json()).toStrictEqual(recovery);
    expect(resolver.resolveCommandPrincipal).toHaveBeenCalledWith({
      projectId: source.project_id,
      commandName: "StartProjectSourceProcessing",
    });
  });
});
