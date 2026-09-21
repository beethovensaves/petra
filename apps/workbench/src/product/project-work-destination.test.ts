import { describe, expect, it } from "vitest";

import {
  expectedProjectWorkDestinationFromSearch,
  projectWorkDestinationPath,
} from "./project-work-destination.js";

const ref = {
  work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
  revision: 4,
  spec_hash: `sha256:${"a".repeat(64)}`,
  record_hash: `sha256:${"b".repeat(64)}`,
};

describe("exact Work destinations", () => {
  it("carries exact Work identity and a bounded return target", () => {
    const path = projectWorkDestinationPath(
      "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      ref,
      {
        path: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief#brief-attention-item-0",
        label: "Brief attention",
        focusId: "brief-attention-item-0",
      },
    );
    const url = new URL(path, "http://petra.local");

    expect(url.pathname).toBe(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
    );
    expect(expectedProjectWorkDestinationFromSearch(url.searchParams)).toEqual({
      revision: 4,
      specHash: ref.spec_hash,
      recordHash: ref.record_hash,
    });
    expect(url.searchParams.get("return_focus")).toBe("brief-attention-item-0");
  });

  it("rejects partial or malformed exact Work identity", () => {
    expect(() =>
      expectedProjectWorkDestinationFromSearch(
        new URLSearchParams({ expected_work_revision: "4" }),
      ),
    ).toThrow("requires one revision");
    expect(() =>
      expectedProjectWorkDestinationFromSearch(
        new URLSearchParams({
          expected_work_revision: "0",
          expected_work_spec_hash: ref.spec_hash,
          expected_work_record_hash: ref.record_hash,
        }),
      ),
    ).toThrow("identity is invalid");
  });
});
