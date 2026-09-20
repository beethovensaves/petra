import { PetraContractRegistry } from "../src/validator.js";
import { describe, expect, it } from "vitest";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const request = {
  schema_name: "petra.project-source-revision-request",
  schema_version: "1.0.0",
  command_id: "command_01K6V000000000000000000001",
  idempotency_key: "wave6:source-revision:contract",
  expected: {
    project_ref: {
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      revision: 1,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      project_definition_id: "project_definition_01K4C000000000000000000001",
      revision: 1,
      content_hash: hash("2"),
      record_hash: hash("3"),
    },
    current_source_ref: {
      project_source_id: "project_source_01K5F000000000000000000001",
      revision: 1,
      content_hash: hash("4"),
      record_hash: hash("5"),
      status: "active",
    },
  },
  version: {
    version_label: "corrected manuscript",
    publication_status: "corrected",
    metadata_source_name: "Project author",
    metadata_retrieved_at: "2026-09-20T12:00:00.000Z",
  },
  material: {
    encoding: "base64",
    content_base64: "UGV0cmE=",
    expected_content_hash: hash("6"),
    artifact_kind: "structured_text",
    media_type: "text/plain",
    original_filename: "revision.txt",
  },
  rights: {
    source_location: "https://example.test/revision.txt",
    license_status: "unknown",
    access_basis: "user_supplied",
    decision_status: "unknown",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: true,
      embed: false,
      send_selected_text_remotely: false,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [],
    rationale: "The Project author supplied this exact private copy.",
    observed_at: "2026-09-20T12:00:00.000Z",
    policy_version: "petra-local-rights-v1",
  },
  replacement: {
    replacement_kind: "newer_version",
    rationale: "Use the corrected source version after governed replacement.",
    reviewed_at: "2026-09-20T12:00:00.000Z",
  },
};

describe("project source revision contracts", () => {
  const contracts = new PetraContractRegistry();

  it("accepts exact intake refs while keeping successor and authority identities server-owned", () => {
    expect(() =>
      contracts.assertValid(
        "project-source-revision-request",
        "1.0.0",
        request,
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("project-source-revision-request", "1.0.0", {
        ...request,
        successor_project_source_id:
          "project_source_01K6V000000000000000000099",
      }),
    ).toThrow();
  });

  it("requires an exact active predecessor and the registered newer-version handoff", () => {
    expect(() =>
      contracts.assertValid("project-source-revision-request", "1.0.0", {
        ...request,
        expected: {
          ...request.expected,
          current_source_ref: {
            ...request.expected.current_source_ref,
            status: "excluded",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      contracts.assertValid("project-source-revision-request", "1.0.0", {
        ...request,
        replacement: {
          ...request.replacement,
          replacement_kind: "preferred_copy_change",
        },
      }),
    ).toThrow();
  });
});
