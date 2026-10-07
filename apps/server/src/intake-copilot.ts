import type {
  PetraIntakeCopilotContext,
  PetraIntakeCopilotSession,
  PetraIntakeCopilotRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  derivePetraId,
  intakeCopilotPolicy,
  validateIntakeCopilotContext,
  type IntakeCopilotRepository,
  type IntakeCopilotRuntime,
  type IntakeCopilotTurn,
  type ProjectDefinitionDraftReader,
} from "@petra/core";
const contracts = new PetraContractRegistry();
export class IntakeCopilotService {
  constructor(
    readonly repository: IntakeCopilotRepository,
    readonly actorId: string,
    readonly definitionDrafts: ProjectDefinitionDraftReader,
    readonly providerModel: string,
    readonly runtime?: IntakeCopilotRuntime,
    readonly unavailableReason = "Pre-Project intake is awaiting its exact managed model-role eligibility proof.",
  ) {}
  policy() {
    const policy = intakeCopilotPolicy(this.providerModel);
    return { policy, policy_hash: copilotHash(policy) };
  }
  async home() {
    return {
      ...this.policy(),
      sessions: await this.repository.listSessions(this.actorId),
      availability: this.availability(),
    };
  }
  availability(): { state: "ready" | "unavailable"; reason?: string } {
    return this.runtime === undefined
      ? { state: "unavailable", reason: this.unavailableReason }
      : { state: "ready" };
  }
  async create(input: {
    intake_session_id: string;
    accepted_policy_hash: string;
  }): Promise<PetraIntakeCopilotSession> {
    if (
      !/^intake_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(input.intake_session_id)
    )
      throw new CopilotBoundaryError(
        "INTAKE_ID",
        "The intake session identity is malformed.",
      );
    const previous = await this.repository.getSession(
      input.intake_session_id,
      this.actorId,
    );
    if (previous !== undefined) {
      if (previous.content.policy_hash !== input.accepted_policy_hash)
        throw new CopilotBoundaryError(
          "INTAKE_CONSENT_CONFLICT",
          "This retained intake acknowledged a different privacy and resource policy.",
        );
      return previous;
    }
    if (this.runtime === undefined)
      throw new CopilotBoundaryError(
        "INTAKE_ROLE_UNAVAILABLE",
        this.unavailableReason,
      );
    const { policy, policy_hash } = this.policy();
    if (input.accepted_policy_hash !== policy_hash)
      throw new CopilotBoundaryError(
        "INTAKE_CONSENT_CHANGED",
        "Review the current managed-model, retention and resource policy before starting this intake.",
      );
    const opened_at = new Date().toISOString();
    const content: PetraIntakeCopilotSession["content"] = {
      intake_session_id: input.intake_session_id,
      thread_id: derivePetraId(
        "thread",
        `intake:${input.intake_session_id}:${this.actorId}`,
      ),
      actor_id: this.actorId,
      policy,
      policy_hash,
      consent: {
        accepted_policy_hash: policy_hash,
        accepted_at: opened_at,
        accepted_by: this.actorId,
      },
      opened_at,
    };
    return this.repository.createSession({
      schema_name: "petra.intake-copilot-session",
      schema_version: "1.0.0",
      content,
      content_hash: copilotHash(content),
    });
  }
  async session(intakeId: string): Promise<PetraIntakeCopilotSession> {
    const session = await this.repository.getSession(intakeId, this.actorId);
    if (session === undefined)
      throw new CopilotBoundaryError(
        "INTAKE_UNAVAILABLE",
        "This intake is unavailable to the authenticated actor.",
      );
    return session;
  }
  async read(intakeId: string) {
    const session = await this.session(intakeId);
    await this.repository.recover();
    const [turns, draft, binding] = await Promise.all([
      this.repository.list(intakeId, this.actorId),
      this.repository.latestDraft(intakeId, this.actorId),
      this.repository.binding(intakeId, this.actorId),
    ]);
    const content: PetraIntakeCopilotContext["content"] = {
      intake_session_id: intakeId,
      actor_id: this.actorId,
      session_record_hash: copilotHash(session),
      policy_hash: session.content.policy_hash,
      outcome_wording: draft?.content.request.outcome ?? null,
      definition_draft_ref:
        draft === undefined
          ? null
          : {
              record_id: draft.draft_id,
              revision: 1,
              record_hash: copilotHash(draft),
            },
      records: [],
      limitations: [
        "This is the original pre-creation discussion. It contains no Project evidence. Discussion and a proposed definition carry advisory authority only; creation requires a separate exact human review.",
        "Only selected user wording and the bounded discussion enter the acknowledged managed provider. No files or Project sources are included.",
        "This owner-only immutable session permits at most 20 new question runs, with at most 12 prior turns and 48 KB of history, a 160 KB input and a 120 second call budget. Per-call price is unavailable. No call is retried automatically.",
      ],
      authority: "pre_project_advice_only",
    };
    const context: PetraIntakeCopilotContext = {
      schema_name: "petra.intake-copilot-context",
      schema_version: "1.0.0",
      content,
      content_hash: copilotHash(content),
    };
    validateIntakeCopilotContext(context);
    const availability =
      binding !== undefined
        ? {
            state: "unavailable" as const,
            reason:
              "This intake is retained with its created Project. Continue in that exact Project's conversation.",
          }
        : session.content.policy_hash !== this.policy().policy_hash
          ? {
              state: "unavailable" as const,
              reason:
                "This intake acknowledged an earlier model or resource policy. Its discussion is retained; start a new intake to acknowledge the current policy.",
            }
          : this.availability();
    return {
      session,
      thread_id: session.content.thread_id,
      context,
      turns,
      ...(draft === undefined ? {} : { draft }),
      ...(binding === undefined ? {} : { binding }),
      availability,
    };
  }
  async start(input: {
    threadId: string;
    runId: string;
    question: string;
    request: PetraIntakeCopilotRequest;
  }): Promise<IntakeCopilotTurn> {
    const requestHash = copilotHash(input),
      previous = await this.repository.get(
        input.request.intake_session_id,
        this.actorId,
        input.runId,
      );
    if (previous !== undefined) {
      if (previous.request_hash !== requestHash)
        throw new CopilotBoundaryError(
          "INTAKE_RUN_CONFLICT",
          "This request identity belongs to a different retained intake question.",
        );
      await this.session(input.request.intake_session_id);
      return previous;
    }
    const { runtime } = this;
    if (runtime === undefined)
      throw new CopilotBoundaryError(
        "INTAKE_ROLE_UNAVAILABLE",
        this.unavailableReason,
      );
    const read = await this.read(input.request.intake_session_id);
    if (read.availability.state !== "ready")
      throw new CopilotBoundaryError(
        "INTAKE_NOT_READY",
        read.availability.reason ?? "The intake is unavailable.",
      );
    if (
      input.threadId !== read.thread_id ||
      input.request.context_hash !== read.context.content_hash
    )
      throw new CopilotBoundaryError(
        "INTAKE_CONTEXT_CHANGED",
        "The intake context or discussion changed. Read its exact current basis before asking.",
      );
    return runtime.start({
      schema_name: "petra.intake-copilot-turn",
      schema_version: "1.0.0",
      run_id: input.runId,
      intake_session_id: input.request.intake_session_id,
      thread_id: input.threadId,
      actor_id: this.actorId,
      parent_run_id: input.request.parent_run_id,
      question: input.question,
      context: read.context,
      request_hash: requestHash,
      started_at: new Date().toISOString(),
      instance_id: runtime.instanceId,
    });
  }
  async prepareDraft(
    intakeId: string,
    request: PetraProjectDefinitionDraftRequest,
  ): Promise<PetraProjectDefinitionDraftView> {
    contracts.assertValid("project-definition-draft-request", "1.0.0", request);
    await this.session(intakeId);
    const draft = await this.definitionDrafts.draftProjectDefinition(request);
    await this.repository.retainDraft(intakeId, this.actorId, draft);
    return draft;
  }
}
