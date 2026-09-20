import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { ProjectSourceRevisionClientError } from "@petra/adapters";
import type {
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceRevisionReceipt,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { PetraContractRegistry } from "./browser-contract-registry.js";
import {
  SourceRevisionPanel,
  SourceRevisionReceiptPanel,
} from "./SourceRevision.js";
import {
  createSourceRevisionRequest,
  sourceLifecycleReceiptRef,
  sourceRevisionConflict,
  sourceRevisionOutcomeUnknown,
  sourceRevisionPermissionLost,
  type SourceRevisionContext,
  type SourceRevisionDraft,
} from "./source-revision.js";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const predecessorId = "project_source_01K6V000000000000000000001";
const successorId = "project_source_01K6V000000000000000000002";

const context: SourceRevisionContext = {
  projectId,
  projectRef: { project_id: projectId, revision: 4, record_hash: hash("1") },
  projectDefinitionRef: {
    project_definition_id: "project_definition_01K6V000000000000000000003",
    revision: 2,
    content_hash: hash("2"),
    record_hash: hash("3"),
  },
  currentSourceRef: {
    project_source_id: predecessorId,
    revision: 3,
    content_hash: hash("4"),
    record_hash: hash("5"),
    status: "active",
  },
};

const draft: SourceRevisionDraft = {
  versionLabel: "Corrected manuscript",
  publicationStatus: "corrected",
  metadataSourceName: "Publisher record",
  metadataSourceRecordId: "version-2",
  metadataRetrievedAt: "2026-09-20T12:00:00.000Z",
  sourceLocation: "https://example.test/corrected.pdf",
  licenseStatus: "known",
  observedLicense: { identifier: "CC-BY-4.0", source: "user_declaration" },
  accessBasis: "open_license",
  decisionStatus: "verified",
  permissions: {
    store_raw_bytes: true,
    parse: true,
    index: true,
    embed: false,
    send_selected_text_remotely: false,
    quote_publicly: true,
    redistribute_artifact: false,
  },
  conditions: ["attribution"],
  requiredNotices: ["Credit the authors."],
  rightsRationale: "The corrected copy carries the observed license.",
  rightsObservedAt: "2026-09-20T12:01:00.000Z",
  policyVersion: "petra-local-rights-v1",
  replacementRationale: "The publisher identifies this as the correction.",
  reviewedAt: "2026-09-20T12:02:00.000Z",
};

const request = createSourceRevisionRequest({
  context,
  draft,
  material: {
    contentBase64: "UGV0cmE=",
    contentHash: hash("6"),
    originalFilename: "corrected.pdf",
    mediaType: "application/pdf",
    artifactKind: "pdf",
  },
  identity: {
    commandId: "command_01K6V000000000000000000004",
    idempotencyKey: "source.revision:intake:browser-test",
  },
});

const successorRef = {
  project_source_id: successorId,
  revision: 1 as const,
  content_hash: hash("7"),
  record_hash: hash("8"),
  status: "active" as const,
};

const receipt: PetraProjectSourceRevisionReceipt = {
  schema_name: "petra.project-source-revision-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_revision_receipt_01K6V000000000000000000005",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("9"),
  project_id: projectId,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  capability_grant_id: "capability_grant_01K6V000000000000000000006",
  project_ref: context.projectRef,
  project_definition_ref: context.projectDefinitionRef,
  predecessor_source_ref: context.currentSourceRef,
  work_ref: {
    record_id: "work_01K6V000000000000000000007",
    revision: 1,
    record_hash: hash("a"),
  },
  work_version_ref: {
    record_id: "work_version_01K6V000000000000000000008",
    revision: 1,
    record_hash: hash("b"),
  },
  material: {
    artifact_ref: {
      artifact_id: "artifact_01K6V000000000000000000009",
      revision: 1,
      content_hash: request.material.expected_content_hash,
      record_hash: hash("c"),
      byte_size: 5,
      media_type: request.material.media_type,
    },
    artifact_manifest_ref: {
      record_id: "artifact_manifest_01K6V00000000000000000000A",
      revision: 1,
      record_hash: hash("d"),
    },
    rights_decision_ref: {
      record_id: "rights_decision_01K6V00000000000000000000B",
      revision: 1,
      record_hash: hash("e"),
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
      expected_source_ref: context.currentSourceRef,
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
  recorded_at: "2026-09-20T12:03:00.000Z",
  record_hash: hash("f"),
};

describe("production source-version integration", () => {
  it("builds the exact reviewed intake without carrying server-owned authority or successor identity", () => {
    new PetraContractRegistry().assertValid(
      "project-source-revision-request",
      "1.0.0",
      request,
    );
    expect(request.expected).toStrictEqual({
      project_ref: context.projectRef,
      project_definition_ref: context.projectDefinitionRef,
      current_source_ref: context.currentSourceRef,
    });
    expect(request.replacement).toEqual({
      replacement_kind: "newer_version",
      rationale: draft.replacementRationale,
      reviewed_at: draft.reviewedAt,
    });
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "successor_source_ref",
      "storage",
      "recorded_at",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("distinguishes unknown, conflict, and authorization outcomes", () => {
    expect(sourceRevisionOutcomeUnknown(new TypeError("Failed to fetch"))).toBe(
      true,
    );
    expect(
      sourceRevisionConflict(
        new ProjectSourceRevisionClientError(
          409,
          "PROJECT_SOURCE_REVISION_PROJECT_STALE",
          "Stale.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceRevisionPermissionLost(
        new ProjectSourceRevisionClientError(
          403,
          "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
          "Denied.",
        ),
      ),
    ).toBe(true);
  });

  it("derives the exact immutable lifecycle receipt reference for the replacement owner", async () => {
    const lifecycle = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-source-lifecycle-receipt.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectSourceLifecycleReceipt;
    await expect(sourceLifecycleReceiptRef(lifecycle)).resolves.toEqual({
      project_source_lifecycle_receipt_id:
        lifecycle.project_source_lifecycle_receipt_id,
      revision: lifecycle.revision,
      content_hash: lifecycle.content_hash,
      record_hash: `sha256:${createHash("sha256")
        .update(canonicalize(lifecycle))
        .digest("hex")}`,
    });
  });

  it("renders the exact intake task and keeps replacement outside the intake action", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceRevisionPanel
          context={context}
          sourceTitle="Prior manuscript"
          sourceRevision="Accepted manuscript · source r3"
          taskReturnPath={`/projects/${projectId}/sources/${predecessorId}?from=review`}
          onCancel={() => undefined}
        />
      </MemoryRouter>,
    );
    for (const label of [
      "Add new version",
      "Reviewed version identity",
      "Exact new material",
      "Copy-specific rights",
      "Governed replacement review",
      "Add new immutable version",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain(
      "leaves Accepted manuscript · source r3 unchanged",
    );
    expect(markup).toContain(
      "does not exclude the earlier version or create the relationship",
    );
  });

  it("renders applied and replayed receipts with distinct governed controls and exact return", () => {
    const exactReturn = `/projects/${projectId}/sources/${predecessorId}?from=review&amp;reviewId=review_1`;
    const rendered = (applied: boolean, recovered = false) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <SourceRevisionReceiptPanel
            receipt={receipt}
            applied={applied}
            recovered={recovered}
            taskReturnPath={exactReturn.replace("&amp;", "&")}
          />
        </MemoryRouter>,
      );
    const applied = rendered(true);
    expect(applied).toContain('data-revision-outcome="applied"');
    expect(applied).toContain("New immutable version added");
    expect(applied).toContain("Exclude earlier version");
    expect(applied).toContain("Record newer-version relationship");
    expect(applied).toContain("The earlier version has not been replaced");
    expect(applied).toContain(exactReturn);

    expect(rendered(false)).toContain('data-revision-outcome="replayed"');
    expect(rendered(false)).toContain("This exact version was already added");
    expect(rendered(false, true)).toContain(
      'data-revision-outcome="recovered"',
    );
  });
});
