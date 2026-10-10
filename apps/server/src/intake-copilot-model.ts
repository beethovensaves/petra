import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  CodexProjectCopilotAdapter,
  intakeCopilotCertificationBasis,
  type CopilotRoleCertification,
} from "@petra/adapters/server";
import { copilotHash, derivePetraId, IntakeCopilotRuntime } from "@petra/core";
import type { ProjectShellPersistence } from "./project-shell-persistence.js";
import type { ProjectCopilotService } from "./project-copilot.js";
import { IntakeCopilotService } from "./intake-copilot.js";

export const createIntakeCopilotService = async (
  persistence: ProjectShellPersistence,
  projectCopilot: ProjectCopilotService | undefined,
  workspaceRoot: string | undefined,
): Promise<IntakeCopilotService | undefined> => {
  if (
    persistence.localActorId === undefined ||
    persistence.intakeCopilot === undefined
  )
    return undefined;
  const unavailable = (providerModel = "unavailable") =>
    new IntakeCopilotService(
      persistence.intakeCopilot!,
      persistence.localActorId!,
      persistence.definitionDrafts,
      providerModel,
    );
  if (
    workspaceRoot === undefined ||
    !(projectCopilot?.runtime?.model instanceof CodexProjectCopilotAdapter)
  )
    return unavailable();
  try {
    const certificate = JSON.parse(
      await readFile(
        join(
          workspaceRoot,
          "reports/model-certifications/codex-project-copilot-1.0.0.json",
        ),
        "utf8",
      ),
    ) as CopilotRoleCertification;
    const basis = intakeCopilotCertificationBasis();
    const sourceHash = `sha256:${createHash("sha256")
      .update(
        await readFile(
          join(workspaceRoot, "packages/core/src/intake-copilot.ts"),
        ),
      )
      .digest("hex")}`;
    if (
      certificate.intake_profile_hash !== basis.intake_profile_hash ||
      certificate.intake_context_schema_hash !==
        basis.intake_context_schema_hash ||
      certificate.runtime.intake_core_hash !== sourceHash
    )
      throw new Error("Stale intake role proof");
    const proof = JSON.parse(
      await readFile(
        join(workspaceRoot, "reports/FE-A1-COPILOT-ROLE-EVALUATION.json"),
        "utf8",
      ),
    ) as {
      checks?: {
        function: string;
        passed: boolean;
        provider_turn_id: string;
      }[];
    };
    if (
      copilotHash(proof) !== certificate.evaluation_artifact_hash ||
      !["pre_project_intake", "pre_project_intake_followup"].every((name) =>
        proof.checks?.some(
          (check) =>
            check.function === name &&
            check.passed &&
            check.provider_turn_id !== "",
        ),
      )
    )
      throw new Error("Missing intake role proof");
    const runtime = new IntakeCopilotRuntime(
      persistence.intakeCopilot,
      projectCopilot.runtime.model,
      derivePetraId(
        "copilot_instance",
        `intake:${Date.now()}:${crypto.randomUUID()}`,
      ),
    );
    await runtime.repository.recover();
    return new IntakeCopilotService(
      persistence.intakeCopilot,
      persistence.localActorId,
      persistence.definitionDrafts,
      certificate.provider_model,
      runtime,
    );
  } catch {
    return unavailable();
  }
};
