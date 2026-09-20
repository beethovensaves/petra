import { ProjectSourceRegistrationClientError } from "@petra/adapters";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { PetraContractRegistry } from "./browser-contract-registry.js";
import { SourceRegistrationPanel } from "./SourceRegistration.js";
import {
  createSourceRegistrationRequest,
  sourceRegistrationOutcomeUnknown,
  type SourceRegistrationContext,
  type SourceRegistrationDraft,
  type SourceRegistrationMaterial,
} from "./source-registration.js";

const fixedHash = (character: string): string =>
  `sha256:${character.repeat(64)}`;

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const context: SourceRegistrationContext = {
  projectId,
  projectRef: {
    project_id: projectId,
    revision: 4,
    record_hash: fixedHash("1"),
  },
  projectDefinitionRef: {
    project_definition_id: "project_definition_01K6S000000000000000000001",
    revision: 2,
    content_hash: fixedHash("2"),
    record_hash: fixedHash("3"),
  },
  sourceRoles: [
    {
      semanticKey: "scientific.literature",
      label: "Source",
      meaning: "A versioned, rights-governed basis for scientific claims.",
    },
  ],
};

const draft: SourceRegistrationDraft = {
  title: "A reviewed source",
  workKind: "journal_article",
  identityStatus: "provisional",
  authorNames: ["Ada Example", "Research Group"],
  authorKind: "person",
  versionLabel: "Accepted manuscript",
  publicationStatus: "accepted",
  metadataSourceName: "Publisher record",
  metadataSourceRecordId: "record-42",
  metadataRetrievedAt: "2026-09-19T12:00:00.000Z",
  sourceLocation: "https://example.test/reviewed-source.pdf",
  licenseStatus: "known",
  observedLicense: {
    identifier: "CC-BY-4.0",
    source: "user_declaration",
  },
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
  rightsRationale: "The submitted copy carries the observed license.",
  rightsObservedAt: "2026-09-19T12:05:00.000Z",
  policyVersion: "petra-local-rights-v1",
  sourceRole: "scientific.literature",
  reviewedAt: "2026-09-19T12:10:00.000Z",
};

const material: SourceRegistrationMaterial = {
  contentBase64: "UGV0cmEgc291cmNlIHJlZ2lzdHJhdGlvbgo=",
  contentHash: fixedHash("4"),
  originalFilename: "reviewed-source.pdf",
  mediaType: "application/pdf",
  artifactKind: "pdf",
};

describe("production source registration UI", () => {
  it("builds one exact reviewed request without client-owned authority or retained identities", () => {
    const request = createSourceRegistrationRequest({
      context,
      draft,
      material,
      identity: {
        commandId: "command_01K6S000000000000000000001",
        idempotencyKey: "source.register:browser-test",
      },
    });

    new PetraContractRegistry().assertValid(
      "project-source-registration-request",
      "1.0.0",
      request,
    );
    expect(request.expected).toStrictEqual({
      project_ref: context.projectRef,
      project_definition_ref: context.projectDefinitionRef,
    });
    expect(request.project_membership).toStrictEqual({
      decision: "register_and_link",
      source_role: "scientific.literature",
      reviewed_at: "2026-09-19T12:10:00.000Z",
    });
    expect(request.material).toStrictEqual({
      encoding: "base64",
      content_base64: material.contentBase64,
      expected_content_hash: material.contentHash,
      artifact_kind: "pdf",
      media_type: "application/pdf",
      original_filename: "reviewed-source.pdf",
    });
    for (const serverOwned of [
      "actor",
      "capability_grant_id",
      "project_source_id",
      "artifact_id",
      "storage",
      "recorded_at",
    ]) {
      expect(request).not.toHaveProperty(serverOwned);
    }
  });

  it("rejects unregistered roles and copy decisions that do not permit storage", () => {
    expect(() =>
      createSourceRegistrationRequest({
        context,
        draft: { ...draft, sourceRole: "client.invented-role" },
        material,
      }),
    ).toThrow("registered by this exact Project profile");
    expect(() =>
      createSourceRegistrationRequest({
        context,
        draft: {
          ...draft,
          permissions: { ...draft.permissions, store_raw_bytes: false },
        },
        material,
      }),
    ).toThrow("explicit permission to store");
  });

  it("keeps transport and server failures in recovery while treating definite client rejections as editable", () => {
    expect(
      sourceRegistrationOutcomeUnknown(new TypeError("Failed to fetch")),
    ).toBe(true);
    expect(
      sourceRegistrationOutcomeUnknown(
        new ProjectSourceRegistrationClientError(
          503,
          "PROJECT_SOURCE_REGISTRATION_FAILED",
          "Unavailable.",
        ),
      ),
    ).toBe(true);
    expect(
      sourceRegistrationOutcomeUnknown(
        new ProjectSourceRegistrationClientError(
          422,
          "PROJECT_SOURCE_REGISTRATION_RIGHTS_INVALID",
          "Review the copy rights.",
        ),
      ),
    ).toBe(false);
  });

  it("renders the reviewed identity, material, rights, registered role, and recovery language as one task", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SourceRegistrationPanel
          context={context}
          sourceTerm="source"
          onCancel={() => undefined}
        />
      </MemoryRouter>,
    );

    for (const label of [
      "Reviewed source identity",
      "Exact material",
      "Copy-specific rights",
      "Project membership review",
      "Metadata observed at",
      "Store this exact copy",
      "Source — A versioned, rights-governed basis for scientific claims.",
      "Register and link source",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain(
      "Petra will resolve authority, storage, and retained record identities",
    );
    expect(markup).not.toContain("actor_id");
    expect(markup).not.toContain("capability_grant_id");
  });
});
