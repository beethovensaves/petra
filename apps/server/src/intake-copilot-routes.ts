import type { Env, Hono } from "hono";
import { CopilotBoundaryError } from "@petra/core";
import {
  encodeCopilotAgUiDelivery,
  parseIntakeCopilotAgUiInput,
} from "@petra/adapters/server";
import type { PetraProjectDefinitionDraftRequest } from "@petra/contracts";
import type { IntakeCopilotService } from "./intake-copilot.js";

const boundedJson = async (request: Request): Promise<unknown> => {
  const reader = request.body?.getReader();
  if (reader === undefined)
    throw new CopilotBoundaryError(
      "INTAKE_INPUT_INVALID",
      "An intake request body is required.",
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 40000) {
        await reader.cancel();
        throw new CopilotBoundaryError(
          "INTAKE_INPUT_LIMIT",
          "The intake request exceeds its declared input budget.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new CopilotBoundaryError(
      "INTAKE_INPUT_INVALID",
      "The intake request is malformed.",
    );
  }
};
const intake = (id: string): void => {
  if (!/^intake_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(id))
    throw new CopilotBoundaryError(
      "INTAKE_ID",
      "The intake address is malformed.",
    );
};
export const mountIntakeCopilotRoutes = <E extends Env>(
  app: Hono<E>,
  service?: IntakeCopilotService,
): void => {
  app.use("/api/intake-sessions/*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });
  const unavailable = () => ({
    error: {
      code: "INTAKE_ROLE_UNAVAILABLE",
      message: "The pre-Project conversation service is unavailable.",
    },
  });
  const failure = (error: unknown) => ({
    error: {
      code:
        error instanceof CopilotBoundaryError
          ? error.code
          : "INTAKE_DELIVERY_UNAVAILABLE",
      message:
        error instanceof CopilotBoundaryError
          ? error.message
          : "Petra could not accept this intake request. Read its retained discussion before continuing.",
    },
  });
  app.get("/api/intake-sessions", async (context) => {
    context.header("Cache-Control", "no-store");
    if (service === undefined) return context.json(unavailable(), 503);
    try {
      return context.json(await service.home());
    } catch (error) {
      return context.json(failure(error), 409);
    }
  });
  app.post("/api/intake-sessions", async (context) => {
    context.header("Cache-Control", "no-store");
    if (service === undefined) return context.json(unavailable(), 503);
    try {
      const value = await boundedJson(context.req.raw);
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        Object.keys(value).length !== 2 ||
        !("intake_session_id" in value) ||
        !("accepted_policy_hash" in value) ||
        typeof value.intake_session_id !== "string" ||
        typeof value.accepted_policy_hash !== "string" ||
        !/^sha256:[0-9a-f]{64}$/u.test(value.accepted_policy_hash)
      )
        throw new CopilotBoundaryError(
          "INTAKE_INPUT_INVALID",
          "Starting an intake requires one explicit identity and its acknowledged policy hash.",
        );
      return context.json(
        await service.create({
          intake_session_id: value.intake_session_id,
          accepted_policy_hash: value.accepted_policy_hash,
        }),
        201,
      );
    } catch (error) {
      return context.json(
        failure(error),
        error instanceof CopilotBoundaryError &&
          error.code === "INTAKE_ROLE_UNAVAILABLE"
          ? 503
          : 409,
      );
    }
  });
  app.get("/api/intake-sessions/:intakeId", async (context) => {
    if (service === undefined) return context.json(unavailable(), 503);
    try {
      const id = context.req.param("intakeId");
      intake(id);
      return context.json(await service.read(id));
    } catch (error) {
      return context.json(
        failure(error),
        error instanceof CopilotBoundaryError &&
          error.code === "INTAKE_UNAVAILABLE"
          ? 404
          : 409,
      );
    }
  });
  app.post("/api/intake-sessions/:intakeId/run", async (context) => {
    if (service === undefined) return context.json(unavailable(), 503);
    try {
      const id = context.req.param("intakeId");
      intake(id);
      let input: ReturnType<typeof parseIntakeCopilotAgUiInput>;
      try {
        input = parseIntakeCopilotAgUiInput(await boundedJson(context.req.raw));
      } catch (error) {
        if (error instanceof CopilotBoundaryError) throw error;
        throw new CopilotBoundaryError(
          "INTAKE_INPUT_INVALID",
          "An intake accepts one human question and its exact session context, without tools, history or state.",
        );
      }
      if (input.request.intake_session_id !== id)
        throw new CopilotBoundaryError(
          "INTAKE_SCOPE",
          "The request belongs to another intake session.",
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
          error.code === "INTAKE_ROLE_UNAVAILABLE"
          ? 503
          : 409,
      );
    }
  });
  app.post("/api/intake-sessions/:intakeId/:runId/cancel", async (context) => {
    if (service === undefined) return context.json(unavailable(), 503);
    try {
      const id = context.req.param("intakeId");
      intake(id);
      await service.session(id);
      const runId = context.req.param("runId");
      if (!/^run_[0-9A-HJKMNP-TV-Z]{26}$/u.test(runId))
        throw new CopilotBoundaryError(
          "INTAKE_INPUT_INVALID",
          "The intake run identity is malformed.",
        );
      const retained = await service.repository.get(id, service.actorId, runId);
      if (retained === undefined)
        return context.json(
          {
            error: {
              code: "INTAKE_RUN_UNAVAILABLE",
              message: "This retained question is unavailable.",
            },
          },
          404,
        );
      const turn =
        retained.terminal !== undefined
          ? retained
          : await service.runtime?.cancel(id, service.actorId, runId);
      if (turn === undefined) return context.json(unavailable(), 503);
      return context.json({ turn });
    } catch (error) {
      return context.json(failure(error), 409);
    }
  });
  app.post(
    "/api/intake-sessions/:intakeId/definition-draft",
    async (context) => {
      if (service === undefined) return context.json(unavailable(), 503);
      try {
        const id = context.req.param("intakeId");
        intake(id);
        return context.json(
          await service.prepareDraft(
            id,
            (await boundedJson(
              context.req.raw,
            )) as PetraProjectDefinitionDraftRequest,
          ),
        );
      } catch (error) {
        return context.json(failure(error), 409);
      }
    },
  );
};
