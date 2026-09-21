import { describe, expect, it } from "vitest";

import {
  createPetraId,
  deriveModelCallId,
  derivePetraId,
  parsePetraId,
  petraIdKind,
} from "../src/identity.js";

const ULID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

describe("Petra identity", () => {
  it("constructs and parses a stable kind-prefixed ID", () => {
    const actorId = createPetraId("actor", ULID);

    expect(actorId).toBe(`actor_${ULID}`);
    expect(parsePetraId(actorId, "actor")).toBe(actorId);
    expect(petraIdKind(actorId)).toBe("actor");
  });

  it.each([
    ["friendly label", "project_friendly-name", "INVALID_PETRA_ID"],
    ["lowercase ULID", `project_${ULID.toLowerCase()}`, "INVALID_PETRA_ID"],
    [
      "ambiguous ULID character",
      "project_01ARZ3NDEKTSV4RRFFQ69G5FAI",
      "INVALID_PETRA_ID",
    ],
  ])("rejects %s", (_name, value, code) => {
    expect(() => parsePetraId(value)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it("rejects a valid ID used as the wrong kind", () => {
    expect(() => parsePetraId(`actor_${ULID}`, "project")).toThrowError(
      expect.objectContaining({ code: "PETRA_ID_KIND_MISMATCH" }),
    );
  });

  it("does not normalize malformed construction input", () => {
    expect(() => createPetraId("Project", ULID)).toThrowError(
      expect.objectContaining({ code: "INVALID_PETRA_ID_KIND" }),
    );
    expect(() => createPetraId("project", ULID.toLowerCase())).toThrowError(
      expect.objectContaining({ code: "INVALID_ULID_PAYLOAD" }),
    );
  });

  it("derives deterministic IDs compatible with the Python worker", () => {
    expect(derivePetraId("parsed_document", "immutable-parse-identity")).toBe(
      "parsed_document_6CYDJS87DQPQP0J98XC4Y3MG7B",
    );
    expect(
      derivePetraId("parsed_document", "immutable-parse-identity"),
    ).not.toBe(derivePetraId("artifact", "immutable-parse-identity"));
  });

  it("binds a server-owned model-call identity to request, attempt, and deployment", () => {
    expect(
      deriveModelCallId(
        "model_request_7Y5T5E8PD099P5F8FEH9QGVE2S",
        1,
        "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
      ),
    ).toBe("model_call_4X3F15NYEFARA8DWX7HPP6GH9G");
    expect(
      deriveModelCallId(
        "model_request_7Y5T5E8PD099P5F8FEH9QGVE2S",
        2,
        "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
      ),
    ).not.toBe(
      deriveModelCallId(
        "model_request_7Y5T5E8PD099P5F8FEH9QGVE2S",
        1,
        "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
      ),
    );
  });
});
