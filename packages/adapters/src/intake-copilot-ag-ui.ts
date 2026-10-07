import { RunAgentInputSchema } from "@ag-ui/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PetraIntakeCopilotContext,
  PetraIntakeCopilotSession,
  PetraIntakeCopilotRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
  PetraIntakeProjectBinding,
} from "@petra/contracts";
import type { IntakeCopilotTurn } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import {
  runTypedCopilotDelivery,
  type CopilotDeliveryState,
} from "./project-copilot-ag-ui.js";
const contracts = new PetraContractRegistry();
const id = (value: string, kind: string): boolean =>
  new RegExp(`^${kind}_[0-9A-HJKMNP-TV-Z]{26}$`, "u").test(value);
const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
export const parseIntakeCopilotAgUiInput = (
  value: unknown,
): {
  threadId: string;
  runId: string;
  question: string;
  request: PetraIntakeCopilotRequest;
} => {
  const input = RunAgentInputSchema.parse(value);
  if (
    !id(input.threadId, "thread") ||
    !id(input.runId, "run") ||
    input.messages.length !== 1 ||
    input.messages[0]?.role !== "user" ||
    typeof input.messages[0].content !== "string" ||
    input.tools.length !== 0 ||
    input.context.length !== 0 ||
    typeof input.state !== "object" ||
    input.state === null ||
    Array.isArray(input.state) ||
    Object.keys(input.state as Record<string, unknown>).length !== 0
  )
    throw new Error(
      "An intake permits one new human message and no client-supplied tools, state, context or history.",
    );
  const props: unknown = input.forwardedProps;
  if (
    typeof props !== "object" ||
    props === null ||
    Array.isArray(props) ||
    Object.keys(props).length !== 1 ||
    !("petra" in props)
  )
    throw new Error("The intake request envelope is malformed.");
  contracts.assertValid("intake-copilot-request", "1.0.0", props.petra);
  return {
    threadId: input.threadId,
    runId: input.runId,
    question: input.messages[0].content,
    request: props.petra as PetraIntakeCopilotRequest,
  };
};
const checkSession = async (
  session: PetraIntakeCopilotSession,
  intakeId?: string,
): Promise<void> => {
  contracts.assertValid("intake-copilot-session", "1.0.0", session);
  const c = session.content;
  if (
    (intakeId !== undefined && c.intake_session_id !== intakeId) ||
    (await hash(c)) !== session.content_hash ||
    (await hash(c.policy)) !== c.policy_hash ||
    c.consent.accepted_policy_hash !== c.policy_hash ||
    c.consent.accepted_by !== c.actor_id
  )
    throw new Error(
      "The retained intake session has incoherent ownership, consent or identity.",
    );
};
const checkContext = async (
  context: PetraIntakeCopilotContext,
  intakeId: string,
): Promise<void> => {
  contracts.assertValid("intake-copilot-context", "1.0.0", context);
  if (
    context.content.intake_session_id !== intakeId ||
    (await hash(context.content)) !== context.content_hash
  )
    throw new Error("The intake context does not bind this exact session.");
};
const checkTurn = async (
  turn: IntakeCopilotTurn,
  intakeId: string,
  threadId: string,
): Promise<void> => {
  contracts.assertValid("intake-copilot-turn", "1.0.0", turn);
  await checkContext(turn.context, intakeId);
  if (
    turn.intake_session_id !== intakeId ||
    turn.thread_id !== threadId ||
    turn.actor_id !== turn.context.content.actor_id ||
    turn.terminal?.output?.focus_keys.length ||
    turn.terminal?.output?.blocks.some(
      (block) => block.citations.length > 0 || block.kind === "source_report",
    )
  )
    throw new Error(
      "The retained intake answer has incoherent scope or implies unadmitted evidence.",
    );
  if (turn.input_manifest !== undefined) {
    const m = turn.input_manifest;
    if (
      (await hash(m.content)) !== m.content_hash ||
      m.content.run_id !== turn.run_id ||
      m.content.actor_id !== turn.actor_id ||
      m.content.intake_session_id !== intakeId ||
      m.content.context_hash !== turn.context.content_hash ||
      m.content.thread_id !== threadId
    )
      throw new Error(
        "The prepared input manifest belongs to different intake content.",
      );
  }
};
export interface IntakeCopilotRead {
  session: PetraIntakeCopilotSession;
  thread_id: string;
  context: PetraIntakeCopilotContext;
  turns: IntakeCopilotTurn[];
  draft?: PetraProjectDefinitionDraftView;
  binding?: PetraIntakeProjectBinding;
  availability: { state: "ready" | "unavailable"; reason?: string };
}
export class IntakeCopilotClient {
  constructor(
    readonly options: { baseUrl: string; token: string; fetch?: typeof fetch },
  ) {}
  async origin(projectId: string): Promise<IntakeCopilotRead | undefined> {
    if (!id(projectId, "project"))
      throw new Error("The Project identity is malformed.");
    const result = await this.#request<{
      binding: PetraIntakeProjectBinding | null;
    }>(`/api/projects/${encodeURIComponent(projectId)}/intake-origin`);
    if (result.binding === null) return undefined;
    contracts.assertValid("intake-project-binding", "1.0.0", result.binding);
    if (
      result.binding.content.project_id !== projectId ||
      (await hash(result.binding.content)) !== result.binding.content_hash
    )
      throw new Error(
        "The original discussion binding belongs to another Project.",
      );
    const read = await this.read(
      result.binding.content.intake_session_ref.record_id,
    );
    if (
      read.binding === undefined ||
      (await hash(read.binding)) !== (await hash(result.binding))
    )
      throw new Error(
        "The original discussion does not bind this exact created Project.",
      );
    return read;
  }
  async home(): Promise<{
    policy: PetraIntakeCopilotSession["content"]["policy"];
    policy_hash: string;
    sessions: PetraIntakeCopilotSession[];
    availability: IntakeCopilotRead["availability"];
  }> {
    const result = await this.#request<{
      policy: PetraIntakeCopilotSession["content"]["policy"];
      policy_hash: string;
      sessions: PetraIntakeCopilotSession[];
      availability: IntakeCopilotRead["availability"];
    }>("/api/intake-sessions");
    if (
      (await hash(result.policy)) !== result.policy_hash ||
      !Array.isArray(result.sessions) ||
      result.sessions.length > 50 ||
      !["ready", "unavailable"].includes(result.availability.state)
    )
      throw new Error(
        "The intake policy or retained session list is incoherent.",
      );
    for (const session of result.sessions) await checkSession(session);
    return result;
  }
  async create(
    intakeId: string,
    acceptedPolicyHash: string,
  ): Promise<PetraIntakeCopilotSession> {
    const result = await this.#request<PetraIntakeCopilotSession>(
      "/api/intake-sessions",
      {
        method: "POST",
        body: JSON.stringify({
          intake_session_id: intakeId,
          accepted_policy_hash: acceptedPolicyHash,
        }),
      },
    );
    await checkSession(result, intakeId);
    if (result.content.policy_hash !== acceptedPolicyHash)
      throw new Error(
        "The acknowledged policy differs from the retained intake consent.",
      );
    return result;
  }
  async read(intakeId: string): Promise<IntakeCopilotRead> {
    const result = await this.#request<IntakeCopilotRead>(
      `/api/intake-sessions/${encodeURIComponent(intakeId)}`,
    );
    await checkSession(result.session, intakeId);
    await checkContext(result.context, intakeId);
    if (
      result.thread_id !== result.session.content.thread_id ||
      result.context.content.actor_id !== result.session.content.actor_id ||
      result.context.content.session_record_hash !==
        (await hash(result.session)) ||
      !Array.isArray(result.turns) ||
      result.turns.length > 20 ||
      !["ready", "unavailable"].includes(result.availability.state)
    )
      throw new Error(
        "The intake read has incoherent ownership, thread or context.",
      );
    for (const turn of result.turns)
      await checkTurn(turn, intakeId, result.thread_id);
    if (result.draft !== undefined) {
      contracts.assertValid(
        "project-definition-draft-view",
        "1.0.0",
        result.draft,
      );
      if (
        result.draft.content_hash !== (await hash(result.draft.content)) ||
        result.context.content.definition_draft_ref?.record_hash !==
          (await hash(result.draft))
      )
        throw new Error("The retained intake draft and context do not match.");
    }
    if (result.binding !== undefined) {
      const b = result.binding;
      contracts.assertValid("intake-project-binding", "1.0.0", b);
      if (
        (await hash(b.content)) !== b.content_hash ||
        b.content.actor_id !== result.session.content.actor_id ||
        b.content.intake_session_ref.record_id !== intakeId ||
        b.content.intake_session_ref.record_hash !==
          (await hash(result.session))
      )
        throw new Error(
          "The retained Project creation binding belongs to a different intake.",
        );
    }
    if (result.binding !== undefined) {
      const originalTurns = [];
      for (const turn of result.turns) {
        if (turn.terminal === undefined)
          throw new Error("A bound intake contains an unsettled question.");
        const { terminal, input_manifest, ...original } = turn;
        void input_manifest;
        originalTurns.push({
          run_id: turn.run_id,
          record_hash: await hash(original),
          terminal_hash: await hash(terminal),
        });
      }
      if (
        canonicalize(originalTurns) !==
          canonicalize(result.binding.content.original_turns) ||
        result.draft === undefined ||
        result.binding.content.definition_draft_hash !==
          (await hash(result.draft))
      )
        throw new Error(
          "The binding does not preserve this exact original discussion and reviewed draft.",
        );
    }
    return result;
  }
  run(
    input: {
      threadId: string;
      runId: string;
      question: string;
      request: PetraIntakeCopilotRequest;
    },
    onState: (state: CopilotDeliveryState<IntakeCopilotTurn>) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    contracts.assertValid("intake-copilot-request", "1.0.0", input.request);
    return runTypedCopilotDelivery(
      {
        ...input,
        token: this.options.token,
        ...(this.options.fetch === undefined
          ? {}
          : { fetch: this.options.fetch }),
        url: new URL(
          `/api/intake-sessions/${encodeURIComponent(input.request.intake_session_id)}/run`,
          this.options.baseUrl,
        ).toString(),
        contextHash: input.request.context_hash,
        rejectedCodes: [
          "INTAKE_INPUT_INVALID",
          "INTAKE_ID",
          "INTAKE_SCOPE",
          "INTAKE_ROLE_UNAVAILABLE",
          "INTAKE_RUN_CONFLICT",
          "INTAKE_NOT_READY",
          "INTAKE_CONTEXT_CHANGED",
          "INTAKE_INPUT_MISMATCH",
          "INTAKE_CONTEXT_MISMATCH",
          "INTAKE_ALREADY_BOUND",
          "INTAKE_STALE_CONTINUATION",
          "INTAKE_TURN_LIMIT",
          "INTAKE_UNAVAILABLE",
          "INTAKE_INPUT_LIMIT",
        ],
        verifyTurn: (turn) =>
          checkTurn(turn, input.request.intake_session_id, input.threadId),
      },
      onState,
      signal,
    );
  }
  async cancel(intakeId: string, runId: string): Promise<void> {
    await this.#request(
      `/api/intake-sessions/${encodeURIComponent(intakeId)}/${encodeURIComponent(runId)}/cancel`,
      { method: "POST" },
    );
  }
  async prepareDraft(
    intakeId: string,
    request: PetraProjectDefinitionDraftRequest,
  ): Promise<PetraProjectDefinitionDraftView> {
    const draft = await this.#request<PetraProjectDefinitionDraftView>(
      `/api/intake-sessions/${encodeURIComponent(intakeId)}/definition-draft`,
      { method: "POST", body: JSON.stringify(request) },
    );
    contracts.assertValid("project-definition-draft-view", "1.0.0", draft);
    if ((await hash(draft.content)) !== draft.content_hash)
      throw new Error("The proposed definition draft identity is incoherent.");
    return draft;
  }
  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(path, this.options.baseUrl),
      {
        ...init,
        headers: {
          authorization: `Bearer ${this.options.token}`,
          "content-type": "application/json",
        },
      },
    );
    const reader = response.body?.getReader();
    if (reader === undefined) throw new Error("The intake response was empty.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 3000000) {
          await reader.cancel();
          throw new Error(
            "The retained intake exceeds its bounded response budget.",
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
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!response.ok) {
      const failure = body as { error?: { message?: string } };
      throw new Error(
        typeof failure.error?.message === "string"
          ? failure.error.message
          : "This intake request is unavailable.",
      );
    }
    return body as T;
  }
}
