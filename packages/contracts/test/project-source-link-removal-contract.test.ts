import { PetraContractRegistry } from "../src/validator.js";
import { describe, expect, it } from "vitest";

const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const request = {
  schema_name: "petra.project-source-link-removal-request",
  schema_version: "1.0.0",
  command_id: "command_01K6W000000000000000000001",
  idempotency_key: "wave6:source-link-removal:contract",
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
  reason: "Stop ordinary new Project use while retaining source authority.",
};

describe("project source link-removal contracts", () => {
  const contracts = new PetraContractRegistry();

  it("accepts only an exact active Project, definition, and ProjectSource binding", () => {
    expect(() =>
      contracts.assertValid(
        "project-source-link-removal-request",
        "1.0.0",
        request,
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("project-source-link-removal-request", "1.0.0", {
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
  });

  it("keeps Actor, grant, deletion intent, and authority time server-owned", () => {
    for (const injected of [
      { actor: { actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV" } },
      { capability_grant_id: "capability_grant_01K6W000000000000000000001" },
      { delete_local_copy: true },
      { submitted_at: "2026-09-20T12:00:00.000Z" },
    ]) {
      expect(() =>
        contracts.assertValid("project-source-link-removal-request", "1.0.0", {
          ...request,
          ...injected,
        }),
      ).toThrow();
    }
  });
});
