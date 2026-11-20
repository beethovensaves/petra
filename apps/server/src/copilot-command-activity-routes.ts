import type { Env, Hono } from "hono";
import {
  CopilotBoundaryError,
  copilotCommandActivity,
  type CopilotCommandProposalRepository,
} from "@petra/core";
import type { ProjectCopilotService } from "./project-copilot.js";

/** Owner-bound reads only. Model invocation and human commands have separate routes. */
export function mountCopilotCommandActivityRoutes<E extends Env>(
  app: Hono<E>,
  repository?: Pick<CopilotCommandProposalRepository, "listActivities">,
  copilot?: Pick<ProjectCopilotService, "actorId" | "assertAccess">,
): void {
  app.get(
    "/api/projects/:projectId/copilot/activities/:originRunId",
    async (context) => {
      if (repository?.listActivities === undefined || copilot === undefined)
        return context.json(
          {
            error: {
              code: "COMMAND_ACTIVITY_UNAVAILABLE",
              message: "Retained proposed activities are unavailable.",
            },
          },
          503,
        );
      const projectId = context.req.param("projectId"),
        originRunId = context.req.param("originRunId");
      if (
        !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
        !/^[A-Za-z0-9_-]{1,200}$/u.test(originRunId) ||
        new URL(context.req.url).searchParams.size !== 0
      )
        return context.json(
          {
            error: {
              code: "INVALID_ACTIVITY_SCOPE",
              message:
                "An exact Project and retained origin turn are required.",
            },
          },
          400,
        );
      try {
        await copilot.assertAccess(projectId);
        const owned = await repository.listActivities(
          projectId,
          copilot.actorId,
          originRunId,
          20,
        );
        if (
          owned.length > 20 ||
          owned.some(
            (item) =>
              item.actor_id !== copilot.actorId ||
              item.origin.project_id !== projectId ||
              item.origin.protocol_run_id !== originRunId,
          )
        )
          throw new CopilotBoundaryError(
            "COMMAND_ACTIVITY_OWNER_MISMATCH",
            "The proposed activity differs from its exact Project, Actor or original turn.",
          );
        const activities = owned.map(copilotCommandActivity);
        // Current permission is checked after private reads as well as before them.
        await copilot.assertAccess(projectId);
        context.header("Cache-Control", "no-store");
        return context.json({
          project_id: projectId,
          origin_run_id: originRunId,
          activities,
        });
      } catch (error) {
        return context.json(
          {
            error: {
              code:
                error instanceof CopilotBoundaryError
                  ? error.code
                  : "COMMAND_ACTIVITY_UNAVAILABLE",
              message:
                "Petra could not read these exact retained activities. Refresh after access or the connection is restored.",
            },
          },
          503,
        );
      }
    },
  );
}
