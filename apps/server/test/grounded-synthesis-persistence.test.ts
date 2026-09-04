import { describe, expect, it } from "vitest";

import {
  GroundedSynthesisPersistenceConfigurationError,
  createGroundedSynthesisPersistenceFromEnvironment,
} from "../src/grounded-synthesis-persistence.js";

describe("W20 grounded-synthesis persistence composition", () => {
  it("fails closed when required local-store settings are absent", async () => {
    await expect(
      createGroundedSynthesisPersistenceFromEnvironment({}),
    ).rejects.toThrow(GroundedSynthesisPersistenceConfigurationError);
    await expect(
      createGroundedSynthesisPersistenceFromEnvironment({}),
    ).rejects.toThrow("PETRA_POSTGRES_USER");
  });

  it("rejects invalid service ports before opening resources", async () => {
    await expect(
      createGroundedSynthesisPersistenceFromEnvironment({
        PETRA_POSTGRES_HOST_PORT: "0",
      }),
    ).rejects.toBeInstanceOf(GroundedSynthesisPersistenceConfigurationError);
  });
});
