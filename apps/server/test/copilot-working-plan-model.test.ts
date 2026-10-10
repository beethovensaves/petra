import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CodexSubscriptionProviderPort } from "@petra/adapters/server";
import { createWorkingPlanDeployment } from "../src/copilot-working-plan-model.js";
import type { ProjectCopilotService } from "../src/project-copilot.js";
const root = new URL("../../../", import.meta.url);
const readyConversation = { runtime: {} } as ProjectCopilotService;
async function workspace() {
  const path = await mkdtemp(join(tmpdir(), "petra-working-plan-eligibility-"));
  for (const relative of [
    "packages/adapters/src/codex-working-plan.ts",
    "packages/adapters/src/codex-app-server.ts",
    "packages/core/src/copilot-working-plan.ts",
  ]) {
    const target = join(path, relative);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(new URL(relative, root), target);
  }
  const certificate = JSON.parse(
    await readFile(
      new URL(
        "reports/model-certifications/codex-working-plan-1.0.0.json",
        root,
      ),
      "utf8",
    ),
  ) as { runtime: { codex_version: string } };
  const command = join(path, "codex-version");
  const quoted = `'${certificate.runtime.codex_version.replaceAll("'", "'\\''")}'`;
  await writeFile(command, `#!/bin/sh\nprintf '%s\\n' ${quoted}\n`, {
    mode: 0o700,
  });
  return { path, command };
}
describe("deployed working-structure role eligibility", () => {
  it("loads its own exact actual-model proof without invoking a provider during readiness", async () => {
    const fixture = await workspace();
    const access = vi.fn();
    const provider = new Proxy(
      {},
      {
        get() {
          access();
          throw new Error("Readiness cannot invoke a provider.");
        },
      },
    ) as CodexSubscriptionProviderPort;
    try {
      const deployment = await createWorkingPlanDeployment(
        readyConversation,
        provider,
        fixture.path,
        fixture.command,
      );
      expect(deployment.state).toBe("ready");
      if (deployment.state === "ready")
        expect(deployment.certification.role).toBe(
          "petra.copilot-working-plan@1.0.0",
        );
      expect(access).not.toHaveBeenCalled();
    } finally {
      await rm(fixture.path, { recursive: true, force: true });
    }
  });
  it("withholds a changed working-structure deployment before any provider access", async () => {
    const fixture = await workspace();
    const access = vi.fn();
    const provider = new Proxy(
      {},
      {
        get() {
          access();
          throw new Error("The stale role must not access the provider.");
        },
      },
    ) as CodexSubscriptionProviderPort;
    try {
      const path = join(
        fixture.path,
        "packages/core/src/copilot-working-plan.ts",
      );
      await writeFile(
        path,
        (await readFile(path, "utf8")) + "\n// changed deployed behavior\n",
      );
      const deployment = await createWorkingPlanDeployment(
        readyConversation,
        provider,
        fixture.path,
        fixture.command,
      );
      expect(deployment.state).toBe("unavailable");
      if (deployment.state === "unavailable")
        expect(deployment.reason).toContain(
          "differs from its eligible deployment",
        );
      expect(access).not.toHaveBeenCalled();
    } finally {
      await rm(fixture.path, { recursive: true, force: true });
    }
  });
  it("does not borrow conversation readiness when its owning provider or context is missing", async () => {
    expect(
      (
        await createWorkingPlanDeployment(
          undefined,
          {} as CodexSubscriptionProviderPort,
          "/unused",
        )
      ).state,
    ).toBe("unavailable");
    expect(
      (
        await createWorkingPlanDeployment(
          readyConversation,
          undefined,
          "/unused",
        )
      ).state,
    ).toBe("unavailable");
  });
});
