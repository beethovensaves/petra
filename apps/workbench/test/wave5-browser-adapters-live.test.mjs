import { describe, expect, it } from "vitest";

import { ProjectShellClient } from "./wave5-browser-adapters-live.mjs";

describe("Wave 5 live browser adapter boundary", () => {
  it("exports the Project shell client required by every nested Project route", () => {
    expect(ProjectShellClient).toBeTypeOf("function");
  });
});
