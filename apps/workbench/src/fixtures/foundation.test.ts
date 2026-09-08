import { describe, expect, it } from "vitest";

import {
  FOUNDATION_FIXTURES,
  FOUNDATION_PRESSURES,
  getFoundationFixture,
} from "./foundation.js";

describe("UX1.0 foundation fixtures", () => {
  it("covers every required UX1.0 pressure exactly once", () => {
    const pressures = FOUNDATION_FIXTURES.map((fixture) => fixture.pressure);

    expect(new Set(pressures)).toEqual(new Set(FOUNDATION_PRESSURES));
    expect(pressures).toHaveLength(FOUNDATION_PRESSURES.length);
  });

  it("uses stable unique route identifiers", () => {
    const ids = FOUNDATION_FIXTURES.map((fixture) => fixture.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(getFoundationFixture(id)?.id).toBe(id);
    }
  });

  it("declares a contract basis and scenario for every fixture", () => {
    for (const fixture of FOUNDATION_FIXTURES) {
      expect(fixture.scenarioId.length).toBeGreaterThan(0);
      expect(fixture.contractRefs.length).toBeGreaterThan(0);
      expect(["mapped", "presentation_only"]).toContain(fixture.contractStatus);
    }
  });

  it("keeps loading presentation state free of scientific markers", () => {
    const loading = getFoundationFixture("loading");

    expect(loading?.contractStatus).toBe("presentation_only");
    expect(loading?.markers).toEqual([]);
  });

  it("keeps abstract-only limitations and projection lag explicit", () => {
    const abstractOnly = getFoundationFixture("abstract-only");
    const stale = getFoundationFixture("stale");

    expect(abstractOnly?.sourceDepth?.depth).toBe("abstract_only");
    expect(abstractOnly?.sourceDepth?.limitation).toMatch(/Do not describe/);
    expect(stale?.freshness?.state).toBe("projection_catching_up");
    expect(stale?.markers).toContainEqual({
      dimension: "scientific_authority",
      value: "applied",
    });
  });
});
