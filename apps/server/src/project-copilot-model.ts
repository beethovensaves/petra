import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  CodexProjectCopilotAdapter,
  type CopilotRoleCertification,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import { copilotHash, ProjectCopilotRuntime, derivePetraId } from "@petra/core";
import type { ProjectShellPersistence } from "./project-shell-persistence.js";
import { ProjectCopilotService } from "./project-copilot.js";

export const createProjectCopilotService = async (
  persistence: ProjectShellPersistence,
  provider: CodexSubscriptionProviderPort | undefined,
  workspaceRoot: string | undefined,
  codexCommand = "codex",
): Promise<ProjectCopilotService | undefined> => {
  if (persistence.localActorId === undefined) return undefined;
  if (provider === undefined || workspaceRoot === undefined)
    return new ProjectCopilotService(
      persistence,
      persistence.localActorId,
      undefined,
      "Connect the registered managed model provider to start a conversation.",
    );
  try {
    const certificate = JSON.parse(
      await readFile(
        new URL(
          "../../../reports/model-certifications/codex-project-copilot-1.0.0.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as CopilotRoleCertification;
    const runtimeVersion = (
      await promisify(execFile)(codexCommand, ["--version"], {
        cwd: workspaceRoot,
      })
    ).stdout.trim();
    const adapterHash = `sha256:${createHash("sha256")
      .update(
        await readFile(
          join(workspaceRoot, "packages/adapters/src/codex-project-copilot.ts"),
        ),
      )
      .digest("hex")}`;
    const providerAdapterHash = `sha256:${createHash("sha256")
      .update(
        await readFile(
          join(workspaceRoot, "packages/adapters/src/codex-app-server.ts"),
        ),
      )
      .digest("hex")}`;
    const coreHash = `sha256:${createHash("sha256")
      .update(
        await readFile(
          join(workspaceRoot, "packages/core/src/project-copilot.ts"),
        ),
      )
      .digest("hex")}`;
    if (
      certificate.runtime?.codex_version !== runtimeVersion ||
      certificate.runtime.adapter_hash !== adapterHash ||
      certificate.runtime.provider_adapter_hash !== providerAdapterHash ||
      certificate.runtime.copilot_core_hash !== coreHash
    )
      throw new Error(
        "The copilot runtime differs from its eligible deployment.",
      );
    // The proof path is a fixed server-owned report, never a client path.
    if (
      certificate.evaluation_artifact !==
      "reports/FE-A1-COPILOT-ROLE-EVALUATION.json"
    )
      throw new Error("The copilot role proof is not registered.");
    const proof = JSON.parse(
      await readFile(
        new URL(
          "../../../reports/FE-A1-COPILOT-ROLE-EVALUATION.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      status?: string;
      provider_model?: string;
      checks?: {
        function: string;
        passed: boolean;
        provider_turn_id: string;
      }[];
    };
    if (
      copilotHash(proof) !== certificate.evaluation_artifact_hash ||
      proof.status !== "passed" ||
      proof.provider_model !== certificate.provider_model
    )
      throw new Error(
        "The copilot role proof does not match its certification.",
      );
    const required = [
      "empty_project_intake",
      "scientific_evidence_question",
      "retained_followup",
      "writing_native_question",
      "third_domain_question",
      "untrusted_instruction_resistance",
      "exact_shared_filtered_graph",
    ];
    if (
      !required.every((name) =>
        proof.checks?.some(
          (check) =>
            check.function === name &&
            check.passed &&
            check.provider_turn_id !== "",
        ),
      )
    )
      throw new Error(
        "The copilot role has incomplete functional eligibility evidence.",
      );
    const outputSchema = JSON.parse(
      await readFile(
        new URL(
          "../../../packages/contracts/schemas/copilot-output/1.0.0/schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const model = new CodexProjectCopilotAdapter({
      provider,
      workspaceRoot,
      outputSchema,
      certification: certificate,
    });
    const runtime = new ProjectCopilotRuntime(
      persistence.copilotTurns,
      model,
      derivePetraId("copilot_instance", `${Date.now()}:${crypto.randomUUID()}`),
    );
    await runtime.repository.recover(runtime.instanceId);
    return new ProjectCopilotService(
      persistence,
      persistence.localActorId,
      runtime,
      undefined,
      certificate.provider_model,
    );
  } catch (error) {
    return new ProjectCopilotService(
      persistence,
      persistence.localActorId,
      undefined,
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "The conversational model role is awaiting its registered functional eligibility evaluation."
        : "The conversational model certification is stale or unavailable. Inspect the role proof before enabling this deployment.",
    );
  }
};
