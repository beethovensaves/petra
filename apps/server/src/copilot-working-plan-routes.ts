import type { Hono, Env } from "hono";
import type { ProjectCopilotService } from "./project-copilot.js";
import type { WorkingPlanDeployment } from "./copilot-working-plan-model.js";
/** Readiness is a read; invoking and applying proposals require their own owners. */
export function mountWorkingPlanReadiness<E extends Env>(
  app: Hono<E>,
  copilot?: ProjectCopilotService,
  deployment?: WorkingPlanDeployment,
): void {
  app.get("/api/projects/:projectId/copilot/working-plan", async (context) => {
    const projectId = context.req.param("projectId");
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId))
      return context.json(
        {
          error: {
            code: "INVALID_PROJECT",
            message: "The Project address is malformed.",
          },
        },
        400,
      );
    if (copilot === undefined)
      return context.json(
        {
          error: {
            code: "COPILOT_UNAVAILABLE",
            message: "The exact Project conversation cannot be read.",
          },
        },
        503,
      );
    try {
      const read = await copilot.read(projectId, []);
      context.header("Cache-Control", "no-store");
      return context.json({
        project_id: projectId,
        context_hash: read.context.content_hash,
        role: "petra.copilot-working-plan@1.0.0",
        output_contract: "petra.copilot-working-plan@1.0.0",
        authority: "proposed_only",
        availability:
          deployment?.state === "ready"
            ? {
                state: "ready",
                provider_model: deployment.certification.provider_model,
                profile_hash: deployment.certification.profile_hash,
                output_schema_hash: deployment.certification.output_schema_hash,
              }
            : {
                state: "unavailable",
                reason:
                  deployment?.reason ??
                  "No eligible working-structure role is installed.",
              },
        invocation: {
          state: "owner_required",
          reason:
            "An exact server-owned preview, canonical retained interaction, human decision and ordinary command owner are required before a proposal can be applied.",
        },
      });
    } catch {
      return context.json(
        {
          error: {
            code: "PROJECT_NOT_AVAILABLE",
            message:
              "This exact Project is unavailable; no alternative Project was selected.",
          },
        },
        404,
      );
    }
  });
}
