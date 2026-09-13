import type { PetraReviewRecoveryAssessment } from "../src/index.js";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PetraContractRegistry } from "../src/validator.js";

const registry = new PetraContractRegistry();
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../fixtures/accepted/review-recovery-assessment.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraReviewRecoveryAssessment;
describe("D020 read-only RecoveryAssessment contract", () => {
  it("accepts complete read observations with no actions", () => {
    expect(() =>
      registry.assertValid("review-recovery-assessment", "1.0.0", fixture),
    ).not.toThrow();
  });
  it.each(["retry", "apply", "reject", "revert", "redeliver"])(
    "rejects invented %s authority",
    (action) => {
      const changed = structuredClone(fixture);
      Object.assign(changed.content, { actions: [{ action }] });
      expect(() =>
        registry.assertValid("review-recovery-assessment", "1.0.0", changed),
      ).toThrow();
    },
  );
  it("rejects unsupported producer, incomplete coverage, and mutation claims", () => {
    for (const change of [
      { producer: "model" },
      { authority_effect: "applied" },
      { coverage: { ...fixture.content.coverage, state: "partial" } },
    ]) {
      const changed = structuredClone(fixture);
      Object.assign(changed.content, change);
      expect(() =>
        registry.assertValid("review-recovery-assessment", "1.0.0", changed),
      ).toThrow();
    }
  });
});
