import { createHash } from "node:crypto";

import type {
  PetraInteractionInterrupt,
  PetraInteractionRun,
  PetraReviewSessionApplyResult,
  PetraReviewSessionRejectResult,
  PetraReviewInterruptResponse,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import {
  executeReviewDecisionPlan,
  type ReviewDecisionCommandPlan,
  type ReviewDecisionExecutionResult,
  type ReviewCommandExecutor,
} from "./evidence-review.js";

export const REVIEW_INTERRUPT_RESPONSE_SCHEMA = {
  name: "review-interrupt-response",
  version: "1.0.0",
  hash: "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
} as const;

type ResponseArtifactRef = Extract<
  PetraInteractionInterrupt["content"],
  { state: "responded" }
>["response_artifact_ref"];

type ServiceActorRef = PetraInteractionInterrupt["recorded_by"];

export interface ReviewInterruptRef {
  readonly interaction_interrupt_id: string;
  readonly revision: number;
  readonly content_hash: string;
}

export interface ReviewChangeSetRef {
  readonly change_set_id: string;
  readonly revision: number;
  readonly content_hash: string;
}

export interface ReviewInterruptPresentation {
  readonly protocol_run_id: string;
  readonly project_id: string;
  readonly interaction_run_id: string;
  readonly interrupt_ref: ReviewInterruptRef;
  readonly change_set_ref: ReviewChangeSetRef;
}

export interface ReviewResolutionContext {
  readonly actor: ReviewActorRef;
  readonly capability_grant_id: string;
}

export interface ReviewActorRef {
  readonly actor_id: string;
  readonly actor_kind: "human";
}

export interface ReviewInterruptResolutionResult {
  readonly replayed: boolean;
  readonly response_recorded: boolean;
  readonly interaction_interrupt_id: string;
  readonly interaction_interrupt_revision: number;
  readonly command_id: string;
  readonly result:
    | ReviewDecisionExecutionResult
    | PetraReviewSessionApplyResult
    | PetraReviewSessionRejectResult;
  readonly return_context?: ReviewInterruptReturnContext;
}

export interface ReviewInterruptReturnContext {
  readonly project_thread_ref: {
    readonly project_thread_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly record_hash: string;
  };
  readonly review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
  };
  readonly review_member_id: string;
  readonly work_unit_ref: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
    readonly record_hash: string;
  };
  readonly destination: {
    readonly place:
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "profile_tool";
    readonly object_ref?: string;
    readonly label: string;
  };
  readonly paths: {
    readonly project_thread: string;
    readonly review: string;
    readonly work: string;
    readonly return: string;
  };
}

export interface ReviewInterruptBoundary {
  presentReview(protocolRunId: string): Promise<ReviewInterruptPresentation>;
  resolveReview(
    response: PetraReviewInterruptResponse,
    context: ReviewResolutionContext,
  ): Promise<ReviewInterruptResolutionResult>;
}

export interface ReviewInterruptRepository {
  getRunRevision(
    interactionRunId: string,
    revision: number,
  ): PetraInteractionRun | undefined | Promise<PetraInteractionRun | undefined>;
  getInterrupt(
    interactionInterruptId: string,
  ):
    | PetraInteractionInterrupt
    | undefined
    | Promise<PetraInteractionInterrupt | undefined>;
  getInterruptRevision(
    interactionInterruptId: string,
    revision: number,
  ):
    | PetraInteractionInterrupt
    | undefined
    | Promise<PetraInteractionInterrupt | undefined>;
  registerInterrupt(
    interrupt: PetraInteractionInterrupt,
  ): PetraInteractionInterrupt | Promise<PetraInteractionInterrupt>;
}

export interface ReviewResponsePayloadRecorder {
  recordResponse(
    response: PetraReviewInterruptResponse,
  ): ResponseArtifactRef | Promise<ResponseArtifactRef>;
}

export interface ReviewInterruptAuthorizer {
  authorize(input: {
    readonly project_id: string;
    readonly actor: ReviewActorRef;
    readonly capability_grant_id: string;
    readonly decision: PetraReviewInterruptResponse["decision"];
    readonly change_set_ref: ReviewChangeSetRef;
  }): boolean | Promise<boolean>;
}

export interface ReviewInterruptBinding {
  readonly presentation: ReviewInterruptPresentation;
  readonly authority_context: ReviewResolutionContext;
  readonly buildPlan: (input: {
    readonly decision: "accepted" | "rejected";
    readonly rationale: string;
    readonly decided_at: string;
    readonly actor: ReviewActorRef;
    readonly capability_grant_id: string;
  }) => ReviewDecisionCommandPlan;
  readonly executePlan?: (input: {
    readonly plan: ReviewDecisionCommandPlan;
    readonly response: PetraReviewInterruptResponse;
    readonly context: ReviewResolutionContext;
  }) => Promise<
    | ReviewDecisionExecutionResult
    | PetraReviewSessionApplyResult
    | PetraReviewSessionRejectResult
  >;
  readonly return_context?: ReviewInterruptReturnContext;
}

export interface ReviewInterruptBindingLoader {
  loadForProtocolRun(
    protocolRunId: string,
  ): Promise<ReviewInterruptBinding | undefined>;
  loadForResponse(
    response: PetraReviewInterruptResponse,
  ): Promise<ReviewInterruptBinding | undefined>;
}

export type DurableReviewInterruptErrorCode =
  | "REVIEW_INTERRUPT_BINDING_CONFLICT"
  | "REVIEW_INTERRUPT_NOT_FOUND"
  | "REVIEW_INTERRUPT_STALE"
  | "REVIEW_INTERRUPT_RESPONSE_MISMATCH"
  | "REVIEW_INTERRUPT_UNAUTHORIZED"
  | "REVIEW_INTERRUPT_PAYLOAD_MISMATCH"
  | "REVIEW_INTERRUPT_PLAN_INVALID"
  | "REVIEW_INTERRUPT_ALREADY_RESOLVED";

export class DurableReviewInterruptError extends Error {
  readonly code: DurableReviewInterruptErrorCode;

  constructor(code: DurableReviewInterruptErrorCode, message: string) {
    super(message);
    this.name = "DurableReviewInterruptError";
    this.code = code;
  }
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const equal = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const exactInterruptRef = (
  interrupt: PetraInteractionInterrupt,
): ReviewInterruptRef => ({
  interaction_interrupt_id: interrupt.interaction_interrupt_id,
  revision: interrupt.revision,
  content_hash: interrupt.content_hash,
});

const exactChangeSetRef = (
  plan: ReviewDecisionCommandPlan,
): ReviewChangeSetRef => ({
  change_set_id: plan.change_set.change_set_id,
  revision: plan.change_set.revision,
  content_hash: plan.change_set.content_hash,
});

const exactCommandRef = (plan: ReviewDecisionCommandPlan) => ({
  command_id: plan.review.command_id,
  idempotency_key: plan.review.idempotency_key,
  command_hash: canonicalHash(plan.review),
});

const assertPlan = (
  plan: ReviewDecisionCommandPlan,
  response: PetraReviewInterruptResponse,
  context: ReviewResolutionContext,
): void => {
  const expectedDecision =
    response.decision === "accept" ? "accepted" : "rejected";
  if (
    plan.decision !== expectedDecision ||
    !equal(exactChangeSetRef(plan), response.change_set_ref) ||
    plan.change_set.content.project_id !== response.project_id ||
    plan.submit.project_id !== response.project_id ||
    plan.review.project_id !== response.project_id ||
    plan.submit.capability_grant_id !== context.capability_grant_id ||
    plan.review.capability_grant_id !== context.capability_grant_id ||
    !equal(plan.review.actor, context.actor) ||
    plan.review.command.command_name !== "RecordApproval" ||
    (expectedDecision === "rejected" &&
      plan.review.command.approval.rationale !== response.rationale) ||
    plan.review.command.approval.decided_at !== response.decided_at ||
    !equal(plan.review.command.approval.decided_by, context.actor) ||
    (expectedDecision === "accepted" && plan.apply === undefined) ||
    (expectedDecision === "rejected" && plan.apply !== undefined) ||
    (plan.apply !== undefined &&
      (plan.apply.project_id !== response.project_id ||
        plan.apply.capability_grant_id !== context.capability_grant_id ||
        !equal(plan.apply.actor, context.actor)))
  ) {
    throw new DurableReviewInterruptError(
      "REVIEW_INTERRUPT_PLAN_INVALID",
      "The generated command plan does not preserve the exact response, actor, capability, and ChangeSet binding.",
    );
  }
};

export class DurableReviewInterruptCoordinator implements ReviewInterruptBoundary {
  readonly #repository: ReviewInterruptRepository;
  readonly #executor: ReviewCommandExecutor;
  readonly #payloads: ReviewResponsePayloadRecorder;
  readonly #authorizer: ReviewInterruptAuthorizer;
  readonly #serviceActor: ServiceActorRef;
  readonly #bindingLoader: ReviewInterruptBindingLoader | undefined;
  readonly #bindingsByRun = new Map<string, ReviewInterruptBinding>();
  readonly #bindingsByInterrupt = new Map<string, ReviewInterruptBinding>();

  constructor(input: {
    repository: ReviewInterruptRepository;
    executor: ReviewCommandExecutor;
    payloads: ReviewResponsePayloadRecorder;
    authorizer: ReviewInterruptAuthorizer;
    serviceActor: ServiceActorRef;
    bindingLoader?: ReviewInterruptBindingLoader;
  }) {
    this.#repository = input.repository;
    this.#executor = input.executor;
    this.#payloads = input.payloads;
    this.#authorizer = input.authorizer;
    this.#serviceActor = structuredClone(input.serviceActor);
    this.#bindingLoader = input.bindingLoader;
  }

  registerBinding(binding: ReviewInterruptBinding): void {
    const byRun = this.#bindingsByRun.get(binding.presentation.protocol_run_id);
    const byInterrupt = this.#bindingsByInterrupt.get(
      binding.presentation.interrupt_ref.interaction_interrupt_id,
    );
    if (byRun !== undefined || byInterrupt !== undefined) {
      if (byRun === binding && byInterrupt === binding) return;
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_BINDING_CONFLICT",
        "A protocol run or interrupt is already bound to another review configuration.",
      );
    }
    this.#bindingsByRun.set(binding.presentation.protocol_run_id, binding);
    this.#bindingsByInterrupt.set(
      binding.presentation.interrupt_ref.interaction_interrupt_id,
      binding,
    );
  }

  async presentReview(
    protocolRunId: string,
  ): Promise<ReviewInterruptPresentation> {
    const binding =
      this.#bindingsByRun.get(protocolRunId) ??
      (await this.#bindingLoader?.loadForProtocolRun(protocolRunId));
    if (binding === undefined) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_NOT_FOUND",
        "No durable review interrupt is bound to this protocol run.",
      );
    }
    this.#rememberLoadedBinding(binding);
    const pending = await this.#repository.getInterruptRevision(
      binding.presentation.interrupt_ref.interaction_interrupt_id,
      binding.presentation.interrupt_ref.revision,
    );
    const run = await this.#repository.getRunRevision(
      binding.presentation.interaction_run_id,
      pending?.interaction_run_ref.revision ?? 0,
    );
    if (
      pending === undefined ||
      run === undefined ||
      pending.content.state !== "pending" ||
      !equal(exactInterruptRef(pending), binding.presentation.interrupt_ref) ||
      pending.project_id !== binding.presentation.project_id ||
      pending.interaction_run_ref.interaction_run_id !==
        binding.presentation.interaction_run_id ||
      run.project_id !== binding.presentation.project_id ||
      run.content.correlation.protocol_run_id !== protocolRunId ||
      !equal(
        run.content.authority_context.actor,
        binding.authority_context.actor,
      ) ||
      run.content.authority_context.capability_grant_id !==
        binding.authority_context.capability_grant_id ||
      !pending.content.subject_refs.includes(
        binding.presentation.change_set_ref.change_set_id,
      ) ||
      pending.content.response_schema_ref.schema_name !==
        REVIEW_INTERRUPT_RESPONSE_SCHEMA.name ||
      pending.content.response_schema_ref.schema_version !==
        REVIEW_INTERRUPT_RESPONSE_SCHEMA.version ||
      pending.content.response_schema_ref.content_hash !==
        REVIEW_INTERRUPT_RESPONSE_SCHEMA.hash
    ) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_STALE",
        "The review presentation no longer matches its exact pending durable interrupt.",
      );
    }
    return structuredClone(binding.presentation);
  }

  async resolveReview(
    response: PetraReviewInterruptResponse,
    context: ReviewResolutionContext,
  ): Promise<ReviewInterruptResolutionResult> {
    const binding =
      this.#bindingsByInterrupt.get(
        response.interrupt_ref.interaction_interrupt_id,
      ) ?? (await this.#bindingLoader?.loadForResponse(response));
    if (binding === undefined) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_NOT_FOUND",
        "The response does not name a registered review interrupt.",
      );
    }
    this.#rememberLoadedBinding(binding);
    const presentation = binding.presentation;
    if (
      response.project_id !== presentation.project_id ||
      response.interaction_run_id !== presentation.interaction_run_id ||
      !equal(response.interrupt_ref, presentation.interrupt_ref) ||
      !equal(response.change_set_ref, presentation.change_set_ref)
    ) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_RESPONSE_MISMATCH",
        "The response must bind the exact Project, run, interrupt revision, and ChangeSet presented for review.",
      );
    }
    if (!equal(context, binding.authority_context)) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_UNAUTHORIZED",
        "The authenticated authority context does not match the interaction run that requested review.",
      );
    }
    const authorized = await this.#authorizer.authorize({
      project_id: response.project_id,
      actor: context.actor,
      capability_grant_id: context.capability_grant_id,
      decision: response.decision,
      change_set_ref: response.change_set_ref,
    });
    if (!authorized) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_UNAUTHORIZED",
        "The authenticated actor lacks permission for this exact review decision.",
      );
    }

    const pending = await this.#repository.getInterruptRevision(
      response.interrupt_ref.interaction_interrupt_id,
      response.interrupt_ref.revision,
    );
    if (
      pending === undefined ||
      pending.content.state !== "pending" ||
      !equal(exactInterruptRef(pending), response.interrupt_ref)
    ) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_STALE",
        "The referenced pending interrupt revision does not exist or has changed.",
      );
    }

    const plan = binding.buildPlan({
      decision: response.decision === "accept" ? "accepted" : "rejected",
      rationale: response.rationale,
      decided_at: response.decided_at,
      actor: structuredClone(context.actor),
      capability_grant_id: context.capability_grant_id,
    });
    assertPlan(plan, response, context);

    const responseArtifact = await this.#payloads.recordResponse(response);
    const canonicalBytes = new TextEncoder().encode(canonicalize(response));
    if (
      responseArtifact.content_sha256 !== canonicalHash(response) ||
      responseArtifact.byte_size !== canonicalBytes.byteLength ||
      responseArtifact.media_type !== "application/json"
    ) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_PAYLOAD_MISMATCH",
        "The response Artifact must preserve the exact canonical response bytes.",
      );
    }

    const content: Extract<
      PetraInteractionInterrupt["content"],
      { state: "responded" }
    > = {
      state: "responded",
      interrupt_kind: pending.content.interrupt_kind,
      request_event_ref: structuredClone(pending.content.request_event_ref),
      subject_refs: [...pending.content.subject_refs],
      response_artifact_ref: structuredClone(responseArtifact),
      responded_by: structuredClone(context.actor),
      resulting_command_ref: exactCommandRef(plan),
      authority_effect: "command_input_only",
    };
    const responded: PetraInteractionInterrupt = {
      schema_name: "petra.interaction-interrupt",
      schema_version: "1.0.0",
      interaction_interrupt_id: pending.interaction_interrupt_id,
      revision: pending.revision + 1,
      project_id: pending.project_id,
      interaction_run_ref: structuredClone(pending.interaction_run_ref),
      lineage: {
        lineage_kind: "revision",
        parent_revision: pending.revision,
        parent_hash: pending.content_hash,
      },
      content,
      content_hash: canonicalHash(content),
      recorded_by: structuredClone(this.#serviceActor),
      created_at: pending.created_at,
      updated_at: response.decided_at,
    };

    const current = await this.#repository.getInterrupt(
      pending.interaction_interrupt_id,
    );
    let replayed: boolean;
    if (current?.content.state === "pending") {
      replayed = false;
    } else if (current !== undefined && equal(current, responded)) {
      replayed = true;
    } else {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_ALREADY_RESOLVED",
        "This interrupt already has a different terminal response.",
      );
    }
    const result =
      binding.executePlan === undefined
        ? await executeReviewDecisionPlan(this.#executor, plan)
        : await binding.executePlan({ plan, response, context });
    if (!replayed) await this.#repository.registerInterrupt(responded);
    return {
      replayed,
      response_recorded: !replayed,
      interaction_interrupt_id: responded.interaction_interrupt_id,
      interaction_interrupt_revision: responded.revision,
      command_id: plan.review.command_id,
      result,
      ...(binding.return_context === undefined
        ? {}
        : { return_context: structuredClone(binding.return_context) }),
    };
  }

  #rememberLoadedBinding(binding: ReviewInterruptBinding): void {
    const byRun = this.#bindingsByRun.get(binding.presentation.protocol_run_id);
    const byInterrupt = this.#bindingsByInterrupt.get(
      binding.presentation.interrupt_ref.interaction_interrupt_id,
    );
    if (byRun === undefined && byInterrupt === undefined) {
      this.registerBinding(binding);
      return;
    }
    if (byRun !== binding || byInterrupt !== binding) {
      throw new DurableReviewInterruptError(
        "REVIEW_INTERRUPT_BINDING_CONFLICT",
        "The restored durable interrupt conflicts with the active process binding.",
      );
    }
  }
}
