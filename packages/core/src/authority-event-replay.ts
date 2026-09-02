import type {
  PetraAssertion,
  PetraClaim,
  PetraDomainEvent,
} from "@petra/contracts";

export type AuthorityEventReplayErrorCode =
  | "AUTHORITY_REPLAY_PROJECT_MISMATCH"
  | "AUTHORITY_REPLAY_STREAM_GAP"
  | "AUTHORITY_REPLAY_POSITION_INVALID"
  | "AUTHORITY_REPLAY_EVENT_DUPLICATE"
  | "AUTHORITY_REPLAY_CHANGE_SET_DUPLICATE"
  | "AUTHORITY_REPLAY_REVISION_INVALID"
  | "AUTHORITY_REPLAY_PROMOTION_INVALID";

export class AuthorityEventReplayError extends Error {
  readonly code: AuthorityEventReplayErrorCode;

  constructor(code: AuthorityEventReplayErrorCode, message: string) {
    super(message);
    this.name = "AuthorityEventReplayError";
    this.code = code;
  }
}

export interface ReplayedScientificAuthority {
  projectId: string;
  throughStreamRevision: number;
  throughEventPosition: number;
  claims: readonly PetraClaim[];
  assertions: readonly PetraAssertion[];
  appliedChangeSetIds: readonly string[];
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const invalid = (
  code: AuthorityEventReplayErrorCode,
  message: string,
): never => {
  throw new AuthorityEventReplayError(code, message);
};

/**
 * Rebuild the active trusted scientific revisions from one complete Project
 * event stream. Events must already have passed the canonical contract
 * validator; this fold independently enforces replay order and promotion
 * continuity.
 */
export const replayScientificAuthority = (
  projectId: string,
  events: readonly PetraDomainEvent[],
): ReplayedScientificAuthority => {
  const claims = new Map<string, PetraClaim>();
  const assertions = new Map<string, PetraAssertion>();
  const eventIds = new Set<string>();
  const appliedChangeSetIds = new Set<string>();
  let priorPosition = 0;

  for (const [index, event] of events.entries()) {
    const expectedStreamRevision = index + 1;
    if (
      event.project_id !== projectId ||
      event.stream_type !== "project" ||
      event.stream_id !== projectId
    ) {
      invalid(
        "AUTHORITY_REPLAY_PROJECT_MISMATCH",
        "Every replayed event must belong to the requested Project stream.",
      );
    }
    if (event.stream_revision !== expectedStreamRevision) {
      invalid(
        "AUTHORITY_REPLAY_STREAM_GAP",
        `Expected Project stream revision ${expectedStreamRevision}, received ${event.stream_revision}.`,
      );
    }
    if (event.event_position <= priorPosition) {
      invalid(
        "AUTHORITY_REPLAY_POSITION_INVALID",
        "Global event positions must increase throughout a Project replay.",
      );
    }
    priorPosition = event.event_position;
    if (eventIds.has(event.event_id)) {
      invalid(
        "AUTHORITY_REPLAY_EVENT_DUPLICATE",
        `Event ${event.event_id} occurs more than once in the replay stream.`,
      );
    }
    eventIds.add(event.event_id);

    if (event.event.event_type !== "change_set.applied") continue;
    const payload = event.event.payload;
    if (appliedChangeSetIds.has(payload.change_set_id)) {
      invalid(
        "AUTHORITY_REPLAY_CHANGE_SET_DUPLICATE",
        `ChangeSet ${payload.change_set_id} was applied more than once.`,
      );
    }
    const currentClaim = claims.get(payload.claim.claim_id);
    const currentAssertion = assertions.get(payload.assertion.assertion_id);
    if (
      payload.claim.revision !== payload.prior_claim_revision + 1 ||
      payload.assertion.revision !== payload.prior_assertion_revision + 1 ||
      (currentClaim !== undefined &&
        currentClaim.revision !== payload.prior_claim_revision) ||
      (currentAssertion !== undefined &&
        currentAssertion.revision !== payload.prior_assertion_revision)
    ) {
      invalid(
        "AUTHORITY_REPLAY_REVISION_INVALID",
        "An applied event must advance both evidence objects from the recorded active revisions.",
      );
    }
    if (
      payload.claim.authority.zone !== "trusted" ||
      payload.assertion.authority.zone !== "trusted" ||
      payload.claim.authority.promotion.change_set_id !==
        payload.change_set_id ||
      payload.assertion.authority.promotion.change_set_id !==
        payload.change_set_id ||
      payload.assertion.object.object_kind !== "entity" ||
      payload.assertion.object.entity_id !== payload.claim.claim_id
    ) {
      invalid(
        "AUTHORITY_REPLAY_PROMOTION_INVALID",
        "An applied event must contain its exact trusted Claim and Assertion promotion pair.",
      );
    }
    claims.set(payload.claim.claim_id, clone(payload.claim));
    assertions.set(payload.assertion.assertion_id, clone(payload.assertion));
    appliedChangeSetIds.add(payload.change_set_id);
  }

  return {
    projectId,
    throughStreamRevision: events.length,
    throughEventPosition: priorPosition,
    claims: [...claims.values()].map(clone),
    assertions: [...assertions.values()].map(clone),
    appliedChangeSetIds: [...appliedChangeSetIds],
  };
};
