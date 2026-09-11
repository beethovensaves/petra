import type {
  ActorRef,
  PetraSuggestedActionInvocation,
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";

/**
 * Project-scoped SuggestedAction preview reads. Implementations derive the
 * action from retained authority and must never start Work while composing it.
 */
export interface SuggestedActionViewReader {
  getSuggestedActionViewForInquiryResult(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraSuggestedActionView | undefined>;
  getWorkStartingSuggestedActionViewForInquiryResult(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraSuggestedActionViewV11 | undefined>;
}

export interface SuggestedActionInvocationEnvelope {
  readonly projectId: string;
  readonly request: PetraSuggestedActionInvocationRequest;
  readonly action: PetraSuggestedActionViewV11;
  readonly actor: ActorRef;
  readonly capabilityGrantId: string;
  readonly correlationId: string;
}

export interface SuggestedActionInvocationAcceptance {
  readonly invocation: PetraSuggestedActionInvocation;
  readonly applied: boolean;
}

/**
 * Persists one exact SuggestedAction command receipt and composes its current
 * Work/result/history/recovery state from Petra's existing authority ledgers.
 */
export interface SuggestedActionInvocationAuthorityRepository {
  acceptSuggestedActionInvocation(
    envelope: SuggestedActionInvocationEnvelope,
  ): Promise<SuggestedActionInvocationAcceptance>;
  getSuggestedActionInvocationView(
    projectId: string,
    commandId: string,
  ): Promise<PetraSuggestedActionInvocationView | undefined>;
}

export interface SuggestedActionWorkStarter {
  startSuggestedActionWork(input: {
    readonly invocation: PetraSuggestedActionInvocation;
    readonly prompt: string;
  }): Promise<void>;
}

export class SuggestedActionInvocationCoordinator {
  readonly #authority: SuggestedActionInvocationAuthorityRepository;
  readonly #work: SuggestedActionWorkStarter;

  constructor(
    authority: SuggestedActionInvocationAuthorityRepository,
    work: SuggestedActionWorkStarter,
  ) {
    this.#authority = authority;
    this.#work = work;
  }

  async invoke(
    envelope: SuggestedActionInvocationEnvelope,
  ): Promise<PetraSuggestedActionInvocationView> {
    const accepted =
      await this.#authority.acceptSuggestedActionInvocation(envelope);
    await this.#work.startSuggestedActionWork({
      invocation: accepted.invocation,
      prompt: envelope.action.content.action.execution.prompt,
    });
    const view = await this.#authority.getSuggestedActionInvocationView(
      envelope.projectId,
      envelope.request.command_id,
    );
    if (view === undefined) {
      throw new Error(
        "The accepted SuggestedAction command lost its invocation receipt.",
      );
    }
    return view;
  }
}
