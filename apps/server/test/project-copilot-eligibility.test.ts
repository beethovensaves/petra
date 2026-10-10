import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";
import type { CodexSubscriptionProviderPort } from "@petra/adapters/server";
import type { ProjectShellPersistence } from "../src/project-shell-persistence.js";
import { createProjectCopilotService } from "../src/project-copilot-model.js";

it("withholds a changed deployed copilot before provider access even when the CLI version matches", async () => {
  const root = resolve(import.meta.dirname, "../../..");
  const temporary = await mkdtemp(join(tmpdir(), "petra-copilot-eligibility-"));
  try {
    const certificate = JSON.parse(
      await readFile(
        join(
          root,
          "reports/model-certifications/codex-project-copilot-1.0.0.json",
        ),
        "utf8",
      ),
    ) as { runtime: { codex_version: string } };
    for (const path of [
      "packages/adapters/src/codex-project-copilot.ts",
      "packages/adapters/src/codex-app-server.ts",
      "packages/core/src/project-copilot.ts",
    ]) {
      await mkdir(join(temporary, path, ".."), { recursive: true });
      const bytes = await readFile(join(root, path));
      await writeFile(
        join(temporary, path),
        path.includes("packages/core/")
          ? Buffer.concat([
              bytes,
              Buffer.from(
                "\n// Deliberate deployed-source drift for the eligibility challenge.\n",
              ),
            ])
          : bytes,
      );
    }
    const cli = join(temporary, "codex-version");
    await writeFile(
      cli,
      `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(certificate.runtime.codex_version)});\n`,
      { mode: 0o700 },
    );
    const providerRead = vi.fn();
    const provider = new Proxy({} as CodexSubscriptionProviderPort, {
      get(_target, property) {
        providerRead(property);
        throw new Error("The stale deployment must not access the provider.");
      },
    });
    const recovery = vi.fn(() => Promise.resolve());
    const persistence = {
      localActorId: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      copilotTurns: { recover: recovery },
    } as unknown as ProjectShellPersistence;
    const service = await createProjectCopilotService(
      persistence,
      provider,
      temporary,
      cli,
    );
    expect(service?.runtime).toBeUndefined();
    expect(service?.unavailableReason).toContain("stale or unavailable");
    expect(providerRead).not.toHaveBeenCalled();
    expect(recovery).not.toHaveBeenCalled();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
