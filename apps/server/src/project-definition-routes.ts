import type { Env, Hono } from "hono";
import type { ProjectDefinitionAuthorityRepository } from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";

export function mountProjectDefinitionRoutes<Environment extends Env>(
  app: Hono<Environment>,
  reader:
    | Pick<ProjectDefinitionAuthorityRepository, "getProjectDefinition">
    | undefined,
): void {
  app.get("/api/queries/projects/:projectId/definition", async (context) => {
    const failure = (status: 404 | 422 | 503, code: string, message: string) =>
      context.json({ error: { code, message } }, status);
    const projectId = context.req.param("projectId");
    const parameters = new URL(context.req.url).searchParams;
    const revisionText = parameters.get("definition_revision");
    if (
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId) ||
      [...parameters.keys()].some((key) => key !== "definition_revision") ||
      parameters.getAll("definition_revision").length !== 1 ||
      revisionText === null ||
      !/^[1-9][0-9]*$/u.test(revisionText) ||
      !Number.isSafeInteger(Number(revisionText))
    )
      return failure(
        422,
        "PROJECT_DEFINITION_READ_INVALID",
        "Choose one exact positive ProjectDefinition revision without overrides.",
      );
    if (reader === undefined)
      return failure(
        503,
        "PROJECT_DEFINITION_READ_UNAVAILABLE",
        "The authoritative ProjectDefinition reader is unavailable.",
      );
    try {
      const revision = Number(revisionText);
      const definition = await reader.getProjectDefinition(projectId, revision);
      if (definition === undefined)
        return failure(
          404,
          "PROJECT_DEFINITION_REVISION_UNAVAILABLE",
          "The exact retained ProjectDefinition revision is unavailable. No current or template definition was substituted.",
        );
      new PetraContractRegistry().assertValid(
        "project-definition",
        "1.0.0",
        definition,
      );
      const hash = `sha256:${createHash("sha256").update(canonicalize(definition.content)).digest("hex")}`;
      if (
        definition.project_id !== projectId ||
        definition.revision !== revision ||
        definition.content_hash !== hash
      )
        return failure(
          503,
          "PROJECT_DEFINITION_READ_CORRUPT",
          "The authoritative read did not preserve the requested identity or exact content.",
        );
      context.header("Cache-Control", "no-store");
      return context.json(definition);
    } catch {
      return failure(
        503,
        "PROJECT_DEFINITION_READ_CORRUPT",
        "The retained definition cannot be read under its exact contract.",
      );
    }
  });
}
