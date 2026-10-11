import type { PetraCopilotWorkingPlan } from "@petra/contracts";
import {
  copilotCommandPreview,
  assertCopilotCommandPreview,
  decidedCopilotCommandRequest,
  type CopilotCommandOperation,
  type CopilotCommandPreview,
} from "./copilot-command-preview.js";
import { validateCopilotCommandReceipt } from "./copilot-command-receipt.js";
import {
  validateWorkingPlan,
  validateWorkingPlanInput,
  WORKING_PLAN_PROFILE,
  type WorkingPlanInput,
  type WorkingPlanModelPort,
} from "./copilot-working-plan.js";
import {
  CopilotBoundaryError,
  copilotHash,
  type CopilotContext,
} from "./project-copilot.js";

export interface CopilotProposalOrigin {
  readonly project_id: string;
  readonly actor_id: string;
  readonly protocol_run_id: string;
  readonly project_turn_id: string;
  readonly project_thread_ref: {
    project_thread_id: string;
    revision: number;
    content_hash: string;
  };
  readonly interaction_run_ref: {
    interaction_run_id: string;
    revision: number;
    content_hash: string;
  };
  readonly question: string;
}
export interface NativeCopilotCommand {
  readonly operation_id: CopilotCommandOperation;
  readonly target_id: string;
  readonly request: unknown;
}
export interface OwnedCopilotCommandProposal {
  readonly proposal_id: string;
  readonly actor_id: string;
  readonly origin: CopilotProposalOrigin;
  readonly input: WorkingPlanInput;
  readonly commands: readonly CopilotCommandPreview[];
  readonly state: "running" | "completed" | "failed";
  readonly work_unit_ref: {
    work_unit_id: string;
    revision: number;
    spec_hash: string;
  };
  readonly interaction_run_ref: {
    interaction_run_id: string;
    revision: number;
    content_hash: string;
  };
  readonly output?: PetraCopilotWorkingPlan;
  readonly output_hash?: string;
  readonly error?: string;
}
export interface CopilotHumanCommandDecision {
  readonly decision_id: string;
  readonly proposal_id: string;
  readonly proposal_output_hash: string;
  readonly preview_key: string;
  readonly preview_hash: string;
  readonly actor_id: string;
  readonly decision: "accept" | "reject";
  readonly decided_at: string;
  readonly command: CopilotCommandPreview;
  readonly request: Record<string, unknown>;
}
export interface OwnedCopilotCommandDecision {
  readonly decision: CopilotHumanCommandDecision;
  readonly state:
    "rejected" | "pending" | "observed" | "reconciliation_required";
  readonly receipt?: Record<string, unknown>;
  readonly error?: string;
  /** A claim without an observation never authorizes another execution. */
  readonly command_claimed?: boolean;
}

/**
 * Implementations must retain exact private Artifacts and resolve the existing
 * ProjectThread, WorkUnit and InteractionRun owners. This is not an alternative
 * conversation store. Decisions are immutable and command claims are serialized.
 */
export interface CopilotCommandProposalRepository {
  readOrigin(
    projectId: string,
    actorId: string,
    runId: string,
  ): Promise<CopilotProposalOrigin>;
  begin(input: {
    proposal_id: string;
    actor_id: string;
    origin: CopilotProposalOrigin;
    input: WorkingPlanInput;
    commands: readonly CopilotCommandPreview[];
  }): Promise<{ created: boolean; proposal: OwnedCopilotCommandProposal }>;
  complete(
    proposalId: string,
    actorId: string,
    result: {
      output: PetraCopilotWorkingPlan;
      model: string;
      provider_thread_id: string;
      provider_turn_id: string;
    },
  ): Promise<OwnedCopilotCommandProposal>;
  fail(proposalId: string, actorId: string, error: string): Promise<void>;
  read(
    projectId: string,
    actorId: string,
    proposalId: string,
  ): Promise<OwnedCopilotCommandProposal>;
  retainDecision(
    decision: CopilotHumanCommandDecision,
  ): Promise<OwnedCopilotCommandDecision>;
  /** False means another request owns execution or a retained outcome already exists. */
  claimDecision(decisionId: string, actorId: string): Promise<boolean>;
  observeDecision(
    decisionId: string,
    actorId: string,
    result: {
      receipt?: Record<string, unknown>;
      error?: string;
    },
  ): Promise<OwnedCopilotCommandDecision>;
  readDecision(
    decisionId: string,
    actorId: string,
  ): Promise<OwnedCopilotCommandDecision | undefined>;
}
export interface CopilotCommandBridgePorts {
  readonly repository: CopilotCommandProposalRepository;
  readonly model: WorkingPlanModelPort;
  /** Re-read Actor, policy, access and the exact authorized native Project. */
  context(
    this: void,
    projectId: string,
    actorId: string,
  ): Promise<CopilotContext>;
  /** Catalogue comes from native preview owners, never from model arguments. */
  catalogue(
    this: void,
    origin: CopilotProposalOrigin,
    context: CopilotContext,
  ): Promise<readonly NativeCopilotCommand[]>;
  /** Re-read exact native revisions and ordinary-command permission before a decision. */
  revalidate(
    this: void,
    command: CopilotCommandPreview,
    actorId: string,
  ): Promise<void>;
  /** Existing command owner resolves the authenticated principal again. */
  execute(
    this: void,
    command: CopilotCommandPreview,
    request: Record<string, unknown>,
    actorId: string,
  ): Promise<unknown>;
  now(this: void): string;
}
const check = (condition: boolean, code: string, message: string): void => {
  if (!condition) throw new CopilotBoundaryError(code, message);
};
const sameBasis = (a: CopilotContext, b: CopilotContext): boolean =>
  a.project_id === b.project_id &&
  a.definition_family === b.definition_family &&
  copilotHash(a.basis) === copilotHash(b.basis);

/** Proposal generation and human command execution have separate authority boundaries. */
export class CopilotCommandBridge {
  constructor(readonly ports: CopilotCommandBridgePorts) {}

  async propose(request: {
    project_id: string;
    actor_id: string;
    origin_run_id: string;
    proposal_id: string;
    expected_context_hash: string;
  }): Promise<OwnedCopilotCommandProposal> {
    const origin = await this.ports.repository.readOrigin(
      request.project_id,
      request.actor_id,
      request.origin_run_id,
    );
    check(
      origin.project_id === request.project_id &&
        origin.actor_id === request.actor_id &&
        origin.protocol_run_id === request.origin_run_id,
      "PROPOSAL_ORIGIN_MISMATCH",
      "The proposed activity must bind the exact authorized retained turn.",
    );
    const context = await this.ports.context(
      request.project_id,
      request.actor_id,
    );
    check(
      context.content_hash === request.expected_context_hash,
      "STALE_PROPOSAL_CONTEXT",
      "The reviewed Project context changed before proposal generation.",
    );
    const commands = (await this.ports.catalogue(origin, context)).map(
      (native) => copilotCommandPreview({ ...native, context }),
    );
    const input: WorkingPlanInput = {
      project_id: request.project_id,
      context,
      question: origin.question,
      previews: commands.map((command) => command.preview),
    };
    validateWorkingPlanInput(input);
    const started = await this.ports.repository.begin({
      proposal_id: request.proposal_id,
      actor_id: request.actor_id,
      origin,
      input,
      commands,
    });
    if (!started.created) return started.proposal;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        abort.abort();
        reject(
          new CopilotBoundaryError(
            "PROPOSAL_DEADLINE",
            "The bounded proposal role exceeded its deadline.",
          ),
        );
      }, WORKING_PLAN_PROFILE.timeout_ms);
    });
    try {
      const generated = await Promise.race([
        this.ports.model.invokeWorkingPlan({
          ...structuredClone(input),
          signal: abort.signal,
        }),
        deadline,
      ]);
      check(
        !abort.signal.aborted,
        "PROPOSAL_DEADLINE",
        "The bounded proposal role exceeded its deadline.",
      );
      const validated = validateWorkingPlan(generated.output, input);
      check(
        generated.model.trim() !== "" &&
          generated.provider_thread_id.trim() !== "" &&
          generated.provider_turn_id.trim() !== "",
        "PROPOSAL_MODEL_IDENTITY",
        "The proposal requires an observed eligible provider result.",
      );
      const current = await this.ports.context(
        request.project_id,
        request.actor_id,
      );
      check(
        sameBasis(context, current),
        "STALE_PROPOSAL_CONTEXT",
        "The exact Project basis changed during proposal generation.",
      );
      // The proposal Work itself may appear in a new projection. Every record
      // originally admitted still has to resolve to the same exact private read.
      check(
        context.records.every((old) =>
          current.records.some(
            (now) =>
              now.key === old.key && copilotHash(now) === copilotHash(old),
          ),
        ),
        "STALE_PROPOSAL_CONTEXT",
        "An admitted native record changed or became unavailable during proposal generation.",
      );
      return await this.ports.repository.complete(
        request.proposal_id,
        request.actor_id,
        { ...generated, output: validated.plan },
      );
    } catch (error) {
      await this.ports.repository.fail(
        request.proposal_id,
        request.actor_id,
        error instanceof Error ? error.message : "The proposal role failed.",
      );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async decide(request: {
    project_id: string;
    actor_id: string;
    proposal_id: string;
    proposal_output_hash: string;
    preview_key: string;
    preview_hash: string;
    decision_id: string;
    decision: "accept" | "reject";
  }): Promise<OwnedCopilotCommandDecision> {
    check(
      request.decision === "accept" || request.decision === "reject",
      "INVALID_HUMAN_DECISION",
      "An explicit accept or reject decision is required.",
    );
    const proposal = await this.ports.repository.read(
      request.project_id,
      request.actor_id,
      request.proposal_id,
    );
    check(
      proposal.actor_id === request.actor_id &&
        proposal.origin.project_id === request.project_id &&
        proposal.proposal_id === request.proposal_id &&
        proposal.state === "completed" &&
        proposal.output !== undefined,
      "PROPOSAL_OWNER_MISMATCH",
      "A decision requires the exact completed proposal owners.",
    );
    check(
      proposal.output_hash === request.proposal_output_hash &&
        proposal.output_hash === copilotHash(proposal.output),
      "PROPOSAL_OUTPUT_MISMATCH",
      "The reviewed proposal differs from its exact retained output.",
    );
    const selected = validateWorkingPlan(
      proposal.output,
      proposal.input,
    ).proposals.find((item) => item.preview.key === request.preview_key);
    const command = proposal.commands.find(
      (item) => item.preview.key === request.preview_key,
    );
    check(
      selected !== undefined &&
        command !== undefined &&
        command.preview.preview_hash === request.preview_hash &&
        copilotHash(selected.payload) === copilotHash(command.preview.payload),
      "PROPOSAL_SELECTION_MISMATCH",
      "The decision must select the exact unchanged server-owned command proposed by the eligible role.",
    );
    const exact = command!;
    assertCopilotCommandPreview(exact, proposal.input.context);
    const assertDecision = (retained: OwnedCopilotCommandDecision): void => {
      check(
        retained.decision.decision_id === request.decision_id &&
          retained.decision.actor_id === request.actor_id &&
          retained.decision.proposal_id === request.proposal_id &&
          retained.decision.proposal_output_hash ===
            request.proposal_output_hash &&
          retained.decision.preview_key === request.preview_key &&
          retained.decision.preview_hash === request.preview_hash &&
          retained.decision.decision === request.decision &&
          copilotHash(retained.decision.command) === copilotHash(exact) &&
          copilotHash(retained.decision.request) ===
            copilotHash(
              decidedCopilotCommandRequest(exact, retained.decision.decided_at),
            ),
        "HUMAN_DECISION_MISMATCH",
        "The retained human decision was rebound to a different proposal, command or Actor.",
      );
    };
    const prior = await this.ports.repository.readDecision(
      request.decision_id,
      request.actor_id,
    );
    if (prior !== undefined) {
      assertDecision(prior);
      // Observations remain readable after their own command advances a target.
      if (prior.state !== "pending" || prior.command_claimed === true)
        return prior;
    }
    if (request.decision === "accept") {
      const current = await this.ports.context(
        request.project_id,
        request.actor_id,
      );
      check(
        sameBasis(proposal.input.context, current),
        "STALE_PROPOSAL_CONTEXT",
        "The Project basis changed; refresh the preview before accepting.",
      );
      await this.ports.revalidate(exact, request.actor_id);
    }
    const decidedAt = this.ports.now();
    const decision: CopilotHumanCommandDecision = {
      decision_id: request.decision_id,
      proposal_id: request.proposal_id,
      proposal_output_hash: request.proposal_output_hash,
      preview_key: request.preview_key,
      preview_hash: request.preview_hash,
      actor_id: request.actor_id,
      decision: request.decision,
      decided_at: decidedAt,
      command: exact,
      request: decidedCopilotCommandRequest(exact, decidedAt),
    };
    const retained =
      prior ?? (await this.ports.repository.retainDecision(decision));
    assertDecision(retained);
    // Replay uses the original immutable decision timestamp and ordinary body.
    if (retained.decision.decision === "reject" || retained.state !== "pending")
      return retained;
    if (
      !(await this.ports.repository.claimDecision(
        request.decision_id,
        request.actor_id,
      ))
    ) {
      const currentDecision = await this.ports.repository.readDecision(
        request.decision_id,
        request.actor_id,
      );
      check(
        currentDecision !== undefined,
        "HUMAN_DECISION_MISSING",
        "The claimed command requires its retained human decision.",
      );
      assertDecision(currentDecision!);
      return currentDecision!;
    }
    try {
      const observed = await this.ports.execute(
        retained.decision.command,
        retained.decision.request,
        request.actor_id,
      );
      const receipt = validateCopilotCommandReceipt(
        retained.decision.command,
        retained.decision.request,
        request.actor_id,
        observed,
      );
      return await this.ports.repository.observeDecision(
        request.decision_id,
        request.actor_id,
        { receipt },
      );
    } catch (error) {
      // A timeout or malformed receipt leaves the ordinary effect uncertain.
      // Do not retry automatically or turn transport failure into "no effect".
      return this.ports.repository.observeDecision(
        request.decision_id,
        request.actor_id,
        {
          error:
            error instanceof Error
              ? error.message
              : "The ordinary command outcome requires reconciliation.",
        },
      );
    }
  }
}
