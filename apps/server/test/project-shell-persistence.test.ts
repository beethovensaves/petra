import { describe, expect, it } from "vitest";

import { createProjectShellPersistenceFromEnvironment } from "../src/project-shell-persistence.js";

describe("Project shell persistence configuration", () => {
  it("rejects a noncanonical configured local Actor before connecting", async () => {
    await expect(
      createProjectShellPersistenceFromEnvironment({
        PETRA_LOCAL_ACTOR_ID: "request-selected-user",
      }),
    ).rejects.toThrow(
      "PETRA_LOCAL_ACTOR_ID must be a canonical actor-prefixed Petra ID.",
    );
  });
});
