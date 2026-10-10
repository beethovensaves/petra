import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  CodexWorkingPlanAdapter,
  type WorkingPlanRoleCertification,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import { copilotHash, type WorkingPlanModelPort } from "@petra/core";
import type { ProjectCopilotService } from "./project-copilot.js";
export type WorkingPlanDeployment =
  | {
      state: "ready";
      model: WorkingPlanModelPort;
      certification: WorkingPlanRoleCertification;
    }
  | { state: "unavailable"; reason: string };

/** Fixed server-owned eligibility records; clients cannot select a proof or model. */
export async function createWorkingPlanDeployment(
  copilot: ProjectCopilotService | undefined,
  provider: CodexSubscriptionProviderPort | undefined,
  workspaceRoot: string | undefined,
  codexCommand = "codex",
): Promise<WorkingPlanDeployment> {
  if (
    copilot?.runtime === undefined ||
    provider === undefined ||
    workspaceRoot === undefined
  )
    return {
      state: "unavailable",
      reason:
        "The registered conversation context and managed provider must be ready before structured work can be proposed.",
    };
  try {
    const certification = JSON.parse(
      await readFile(
        new URL(
          "../../../reports/model-certifications/codex-working-plan-1.0.0.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as WorkingPlanRoleCertification;
    const paths = {
      adapter_hash: "packages/adapters/src/codex-working-plan.ts",
      provider_adapter_hash: "packages/adapters/src/codex-app-server.ts",
      core_hash: "packages/core/src/copilot-working-plan.ts",
    };
    for (const key of Object.keys(paths) as (keyof typeof paths)[]) {
      const hash = `sha256:${createHash("sha256")
        .update(await readFile(join(workspaceRoot, paths[key])))
        .digest("hex")}`;
      if (certification.runtime[key] !== hash)
        throw new Error(
          "The working-structure runtime differs from its eligible deployment.",
        );
    }
    if (
      certification.runtime.codex_version !==
      (
        await promisify(execFile)(codexCommand, ["--version"], {
          cwd: workspaceRoot,
        })
      ).stdout.trim()
    )
      throw new Error(
        "The managed provider version differs from the working-structure evaluation.",
      );
    if (
      certification.evaluation_artifact !==
      "reports/FE-A1-WORKING-PLAN-ROLE-EVALUATION.json"
    )
      throw new Error("The working-structure role proof is not registered.");
    const proof = JSON.parse(
      await readFile(
        new URL(
          "../../../reports/FE-A1-WORKING-PLAN-ROLE-EVALUATION.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      status: string;
      provider_model: string;
      checks: { function: string; passed: boolean; provider_turn_id: string }[];
    };
    if (
      copilotHash(proof) !== certification.evaluation_artifact_hash ||
      proof.status !== "passed" ||
      proof.provider_model !== certification.provider_model
    )
      throw new Error(
        "The working-structure eligibility proof does not match its certificate.",
      );
    for (const name of [
      "scientific_working_structure",
      "writing_working_structure",
      "unavailable_preview_boundary",
      "untrusted_proposal_resistance",
    ])
      if (
        !proof.checks?.some(
          (check) =>
            check.function === name &&
            check.passed &&
            check.provider_turn_id.trim() !== "",
        )
      )
        throw new Error(
          "The working-structure role lacks its required actual-model functional and adverse probes.",
        );
    const outputSchema = JSON.parse(
      await readFile(
        new URL(
          "../../../packages/contracts/schemas/copilot-working-plan/1.0.0/schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    return {
      state: "ready",
      certification,
      model: new CodexWorkingPlanAdapter({
        provider,
        workspaceRoot,
        outputSchema,
        certification,
      }),
    };
  } catch (error) {
    return {
      state: "unavailable",
      reason:
        error instanceof Error
          ? error.message
          : "The working-structure role is unavailable; the current question and draft remain retained.",
    };
  }
}
