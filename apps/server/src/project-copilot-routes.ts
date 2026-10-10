import type { PetraCopilotAuthorityRequest } from "@petra/contracts";
import type { Hono, Env } from "hono";
import {
  CopilotBoundaryError,
  parseGraphPresentationBinding,
  type ProjectSemanticGraphReader,
} from "@petra/core";
import {
  parseCopilotAgUiInput,
  encodeCopilotAgUiDelivery,
} from "@petra/adapters/server";
import type { ProjectCopilotService } from "./project-copilot.js";

const boundedRequestBytes = async (request: Request): Promise<Uint8Array> => {
  const reader = request.body?.getReader();
  if (reader === undefined) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        throw new CopilotBoundaryError(
          "INPUT_LIMIT",
          "The conversation request exceeds its input budget.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

export const mountProjectCopilotRoutes = <E extends Env>(
  app: Hono<E>,
  service?: ProjectCopilotService,
  semanticGraphs?: ProjectSemanticGraphReader,
): void => {
  const failure = (
    error: unknown,
  ): { error: { code: string; message: string } } => ({
    error: {
      code:
        error instanceof CopilotBoundaryError
          ? error.code
          : "COPILOT_UNAVAILABLE",
      message:
        error instanceof CopilotBoundaryError
          ? error.message
          : "Petra could not read or deliver this conversation.",
    },
  });
  const project = (id: string): void => {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(id))
      throw new CopilotBoundaryError(
        "INVALID_PROJECT",
        "The Project address is malformed.",
      );
  };
  app.get("/api/projects/:projectId/intake-origin", async (context) => {
    if (service === undefined)
      return context.json(
        {
          error: {
            code: "COPILOT_UNAVAILABLE",
            message: "The Project conversation service is unavailable.",
          },
        },
        503,
      );
    try {
      const id = context.req.param("projectId");
      project(id);
      context.header("Cache-Control", "no-store");
      return context.json(await service.intakeOrigin(id));
    } catch (error) {
      return context.json(
        failure(error),
        error instanceof CopilotBoundaryError &&
          error.code === "PROJECT_NOT_FOUND"
          ? 404
          : 409,
      );
    }
  });
  app.post("/api/projects/:projectId/copilot/authorize", async (context) => {
    if (service === undefined)
      return context.json(
        {
          error: {
            code: "COPILOT_UNAVAILABLE",
            message: "The Project conversation service is unavailable.",
          },
        },
        503,
      );
    try {
      const projectId = context.req.param("projectId");
      project(projectId);
      const bytes = await boundedRequestBytes(context.req.raw);
      const request = JSON.parse(
        new TextDecoder().decode(bytes),
      ) as PetraCopilotAuthorityRequest;
      return context.json(
        await service.authorizeConversation(projectId, request),
      );
    } catch (error) {
      return context.json(failure(error), 409);
    }
  });
  app.get("/api/projects/:projectId/copilot", async (context) => {
    if (service === undefined)
      return context.json(
        {
          error: {
            code: "COPILOT_UNAVAILABLE",
            message: "The Project conversation service is unavailable.",
          },
        },
        503,
      );
    try {
      const projectId = context.req.param("projectId");
      project(projectId);
      const focusValue = context.req.query("focus");
      const focus: unknown =
        focusValue === undefined
          ? []
          : focusValue.length <= 2000
            ? JSON.parse(focusValue)
            : undefined;
      if (
        !Array.isArray(focus) ||
        focus.length > 8 ||
        focus.some(
          (key) =>
            typeof key !== "string" || key.length === 0 || key.length > 200,
        ) ||
        new Set(focus).size !== focus.length
      )
        throw new CopilotBoundaryError(
          "INVALID_FOCUS",
          "The bounded conversation selection is malformed.",
        );
      const sceneValue = context.req.query("scene");
      const binding =
        sceneValue === undefined
          ? undefined
          : sceneValue.length <= 6500
            ? parseGraphPresentationBinding(JSON.parse(sceneValue) as unknown)
            : undefined;
      if (sceneValue !== undefined && binding === undefined)
        throw new CopilotBoundaryError(
          "SHARED_SCENE_LIMIT",
          "The shared graph parameters exceed their budget.",
        );
      return context.json(
        await service.read(projectId, focus as string[], binding, {
          ...(context.req.query("cursor") === undefined
            ? {}
            : { cursor: context.req.query("cursor")! }),
          ...(context.req.query("limit") === undefined
            ? {}
            : { limit: Number(context.req.query("limit")) }),
        }),
      );
    } catch (error) {
      return context.json(
        failure(error),
        error instanceof CopilotBoundaryError &&
          error.code === "PROJECT_NOT_FOUND"
          ? 404
          : 409,
      );
    }
  });
  app.get(
    "/api/queries/projects/:projectId/semantic-graph",
    async (context) => {
      if (semanticGraphs === undefined)
        return context.json(
          {
            error: {
              code: "SEMANTIC_GRAPH_UNAVAILABLE",
              message: "The registered working graph reader is unavailable.",
            },
          },
          503,
        );
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        const view = await semanticGraphs.getProjectSemanticGraph(projectId);
        if (view === undefined)
          return context.json(
            {
              error: {
                code: "PROJECT_NOT_FOUND",
                message: "This Project is unavailable.",
              },
            },
            404,
          );
        return context.json(view);
      } catch (error) {
        return context.json(failure(error), 409);
      }
    },
  );
  app.post("/api/projects/:projectId/copilot/run", async (context) => {
    if (service === undefined)
      return context.json(
        {
          error: {
            code: "COPILOT_UNAVAILABLE",
            message: "The Project conversation service is unavailable.",
          },
        },
        503,
      );
    try {
      const projectId = context.req.param("projectId");
      project(projectId);
      const bytes = await boundedRequestBytes(context.req.raw);
      const input = parseCopilotAgUiInput(
        JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      );
      if (input.request.project_id !== projectId)
        throw new CopilotBoundaryError(
          "PROJECT_SCOPE",
          "The conversation request belongs to another Project.",
        );
      const turn = await service.start(input);
      const delivery = encodeCopilotAgUiDelivery(
        turn,
        () => service.runtime?.wait(turn) ?? Promise.resolve(turn),
        context.req.header("accept"),
      );
      return new Response(delivery.stream, {
        headers: {
          "content-type": delivery.contentType,
          "cache-control": "no-store",
          "x-accel-buffering": "no",
        },
      });
    } catch (error) {
      return context.json(
        failure(error),
        error instanceof CopilotBoundaryError &&
          error.code === "ROLE_UNAVAILABLE"
          ? 503
          : 409,
      );
    }
  });
  app.post(
    "/api/projects/:projectId/copilot/:runId/cancel",
    async (context) => {
      if (service?.runtime === undefined)
        return context.json(
          {
            error: {
              code: "COPILOT_UNAVAILABLE",
              message: "The conversation runtime is unavailable.",
            },
          },
          503,
        );
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        await service.assertAccess(projectId);
        const turn = await service.runtime.cancel(
          projectId,
          service.actorId,
          context.req.param("runId"),
        );
        if (turn === undefined)
          return context.json(
            {
              error: {
                code: "RUN_NOT_FOUND",
                message: "This conversation run is unavailable.",
              },
            },
            404,
          );
        return context.json({ turn });
      } catch (error) {
        return context.json(failure(error), 409);
      }
    },
  );
};
