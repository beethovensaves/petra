import type { Env, Hono } from "hono";
import { ExaminationBoundaryError } from "@petra/core";
import { ContractRegistryError } from "@petra/contracts/validator";
import type {
  PetraProjectExaminationAuthorityRequest,
  PetraProjectExaminationRequest,
} from "@petra/contracts";
import type { ProjectExaminationService } from "./project-examination.js";
const project = (id: string): void => {
  if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(id))
    throw new ExaminationBoundaryError(
      "INVALID_PROJECT",
      "The Project address is malformed.",
    );
};
const input = async (request: Request): Promise<unknown> => {
  const reader = request.body?.getReader();
  if (reader === undefined)
    throw new ExaminationBoundaryError(
      "INVALID_REQUEST",
      "A reviewed examination request is required.",
    );
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 64000) {
        await reader.cancel();
        throw new ExaminationBoundaryError(
          "INPUT_LIMIT",
          "The examination request exceeds its declared budget.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
};
export const mountProjectExaminationRoutes = <E extends Env>(
  app: Hono<E>,
  service?: ProjectExaminationService,
): void => {
  const unavailable = {
    error: {
      code: "EXAMINATION_UNAVAILABLE",
      message: "The Project examination runtime is unavailable.",
    },
  };
  const failure = (error: unknown) => ({
    error: {
      code:
        error instanceof ExaminationBoundaryError
          ? error.code
          : error instanceof ContractRegistryError ||
              error instanceof SyntaxError ||
              error instanceof TypeError
            ? "INVALID_REQUEST"
            : "EXAMINATION_UNAVAILABLE",
      message:
        error instanceof ExaminationBoundaryError
          ? error.message
          : "Petra could not read or record this exact examination.",
    },
  });
  app.get("/api/queries/projects/:projectId/examinations", async (context) => {
    if (service === undefined) return context.json(unavailable, 503);
    try {
      const projectId = context.req.param("projectId");
      project(projectId);
      const url = new URL(context.req.url);
      if ([...url.searchParams.keys()].some((key) => key !== "after"))
        throw new ExaminationBoundaryError(
          "INVALID_CURSOR",
          "This bounded examination query accepts only its declared history cursor.",
        );
      const raw = url.searchParams.get("after") ?? "0";
      if (!/^(0|[1-9][0-9]{0,15})$/u.test(raw))
        throw new ExaminationBoundaryError(
          "INVALID_CURSOR",
          "The examination cursor is malformed.",
        );
      return context.json(await service.read(projectId, Number(raw)));
    } catch (error) {
      return context.json(failure(error), 409);
    }
  });
  app.post(
    "/api/commands/projects/:projectId/examinations",
    async (context) => {
      if (service === undefined) return context.json(unavailable, 503);
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        if (new URL(context.req.url).searchParams.size !== 0)
          throw new ExaminationBoundaryError(
            "INVALID_REQUEST",
            "Examination commands accept no query overrides.",
          );
        const request = (await input(
          context.req.raw,
        )) as PetraProjectExaminationRequest;
        return context.json(await service.execute(projectId, request));
      } catch (error) {
        return context.json(
          failure(error),
          error instanceof ExaminationBoundaryError &&
            [
              "EXAMINATION_NOT_AUTHORIZED",
              "EXAMINATION_NOT_AUTHENTICATED",
            ].includes(error.code)
            ? 403
            : 409,
        );
      }
    },
  );
  app.get(
    "/api/queries/projects/:projectId/examinations/commands/:commandId",
    async (context) => {
      if (service === undefined) return context.json(unavailable, 503);
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        const commandId = context.req.param("commandId");
        if (
          !/^command_[0-9A-HJKMNP-TV-Z]{26}$/u.test(commandId) ||
          new URL(context.req.url).searchParams.size !== 0
        )
          throw new ExaminationBoundaryError(
            "INVALID_REQUEST",
            "The exact examination command address is malformed.",
          );
        const result = await service.recover(projectId, commandId);
        return result === undefined
          ? context.json({ state: "not_recorded" })
          : context.json({ state: "recorded", ...result });
      } catch (error) {
        return context.json(failure(error), 409);
      }
    },
  );
  app.post(
    "/api/commands/projects/:projectId/examinations/authority",
    async (context) => {
      if (service?.ownerAuthority === undefined)
        return context.json(unavailable, 503);
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        if (new URL(context.req.url).searchParams.size !== 0)
          throw new ExaminationBoundaryError(
            "INVALID_REQUEST",
            "Authority commands accept no query overrides.",
          );
        const request = (await input(
          context.req.raw,
        )) as PetraProjectExaminationAuthorityRequest;
        return context.json(
          await service.ownerAuthority.execute(
            projectId,
            request,
            await service.actor(),
          ),
        );
      } catch (error) {
        return context.json(
          failure(error),
          error instanceof ExaminationBoundaryError &&
            error.code === "EXAMINATION_NOT_AUTHORIZED"
            ? 403
            : 409,
        );
      }
    },
  );
  app.get(
    "/api/queries/projects/:projectId/examinations/authority/:commandId",
    async (context) => {
      if (service?.ownerAuthority === undefined)
        return context.json(unavailable, 503);
      try {
        const projectId = context.req.param("projectId");
        project(projectId);
        const commandId = context.req.param("commandId");
        if (
          !/^command_[0-9A-HJKMNP-TV-Z]{26}$/u.test(commandId) ||
          new URL(context.req.url).searchParams.size !== 0
        )
          throw new ExaminationBoundaryError(
            "INVALID_REQUEST",
            "The authority command address is malformed.",
          );
        const receipt = await service.ownerAuthority.recover(
          projectId,
          commandId,
          await service.actor(),
        );
        return context.json(
          receipt === undefined
            ? { state: "not_recorded" }
            : { state: "recorded", receipt },
        );
      } catch (error) {
        return context.json(failure(error), 409);
      }
    },
  );
};
