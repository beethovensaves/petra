import { PetraContractRegistry } from "../src/validator.js";
import { describe, expect, it } from "vitest";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const request = {
  schema_name: "petra.project-source-processing-request",
  schema_version: "1.0.0",
  command_id: "command_01K6T000000000000000000053",
  idempotency_key: "wave6:source-processing:contract",
  expected: {
    project_ref: {
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      revision: 1,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      project_definition_id: "project_definition_01K4C000000000000000000001",
      revision: 3,
      content_hash: hash("2"),
      record_hash: hash("3"),
    },
    project_source_ref: {
      project_source_id: "project_source_01K5F000000000000000000001",
      revision: 1,
      content_hash: hash("4"),
      record_hash: hash("5"),
      status: "active",
    },
    source_role: "scientific.literature",
    processing_family_ref: {
      semantic_key: "petra.source-processing",
      contract: {
        name: "petra.document.parse",
        version: "1.0.0",
        content_hash: hash("6"),
      },
    },
  },
};

describe("project source processing contracts", () => {
  const contracts = new PetraContractRegistry();

  it("accepts exact client refs while keeping actor, grant, worker, and limits server-owned", () => {
    expect(() =>
      contracts.assertValid(
        "project-source-processing-request",
        "1.0.0",
        request,
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("project-source-processing-request", "1.0.0", {
        ...request,
        actor: { actor_id: "forged", actor_kind: "human" },
      }),
    ).toThrow();
  });

  it("rejects client-selected processing identities", () => {
    expect(() =>
      contracts.assertValid("project-source-processing-request", "1.0.0", {
        ...request,
        expected: {
          ...request.expected,
          processing_family_ref: {
            ...request.expected.processing_family_ref,
            semantic_key: "scientific.client-invented-parser",
          },
        },
      }),
    ).toThrow();
  });
});
