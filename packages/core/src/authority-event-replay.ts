import type {
  PetraAssertion,
  PetraClaim,
  PetraDomainEventRecord,
} from "@petra/contracts";

export type AuthorityEventReplayErrorCode =
  | "AUTHORITY_REPLAY_PROJECT_MISMATCH"
  | "AUTHORITY_REPLAY_STREAM_GAP"
  | "AUTHORITY_REPLAY_POSITION_INVALID"
  | "AUTHORITY_REPLAY_EVENT_DUPLICATE"
  | "AUTHORITY_REPLAY_CHANGE_SET_DUPLICATE"
  | "AUTHORITY_REPLAY_REVISION_INVALID"
  | "AUTHORITY_REPLAY_PROMOTION_INVALID"
  | "AUTHORITY_REPLAY_REVERSAL_INVALID";

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
  revertedChangeSetIds: readonly string[];
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const clone = <Value>(value: Value): Value => structuredClone(value);

const cloneReadonly = <Value>(value: DeepReadonly<Value>): Value =>
  structuredClone(value) as Value;

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
  events: readonly DeepReadonly<PetraDomainEventRecord>[],
): ReplayedScientificAuthority => {
  const claims = new Map<string, PetraClaim>();
  const assertions = new Map<string, PetraAssertion>();
  const eventIds = new Set<string>();
  const appliedChangeSetIds = new Set<string>();
  const revertedChangeSetIds = new Set<string>();
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

    if (
      event.event.event_type !== "change_set.applied" &&
      event.event.event_type !== "change_set.reverted"
    ) {
      continue;
    }
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
    if (event.event.event_type === "change_set.applied") {
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
    } else {
      const reversalPayload = event.event.payload;
      if (
        currentClaim?.authority.zone !== "trusted" ||
        currentAssertion?.authority.zone !== "trusted" ||
        currentClaim.authority.promotion.change_set_id !==
          reversalPayload.compensates_change_set_id ||
        currentAssertion.authority.promotion.change_set_id !==
          reversalPayload.compensates_change_set_id ||
        !appliedChangeSetIds.has(reversalPayload.compensates_change_set_id) ||
        revertedChangeSetIds.has(reversalPayload.compensates_change_set_id) ||
        payload.claim.authority.zone !== "quarantine" ||
        payload.claim.authority.review_state !== "human_rejected" ||
        payload.assertion.authority.zone !== "quarantine" ||
        payload.assertion.authority.review_state !== "human_rejected" ||
        payload.assertion.object.object_kind !== "entity" ||
        payload.assertion.object.entity_id !== payload.claim.claim_id
      ) {
        invalid(
          "AUTHORITY_REPLAY_REVERSAL_INVALID",
          "A reversed event must advance and quarantine the exact pair created by its compensated promotion.",
        );
      }
      revertedChangeSetIds.add(reversalPayload.compensates_change_set_id);
    }
    claims.set(
      payload.claim.claim_id,
      cloneReadonly<PetraClaim>(payload.claim),
    );
    assertions.set(
      payload.assertion.assertion_id,
      cloneReadonly<PetraAssertion>(payload.assertion),
    );
    appliedChangeSetIds.add(payload.change_set_id);
  }

  return {
    projectId,
    throughStreamRevision: events.length,
    throughEventPosition: priorPosition,
    claims: [...claims.values()].map(clone),
    assertions: [...assertions.values()].map(clone),
    appliedChangeSetIds: [...appliedChangeSetIds],
    revertedChangeSetIds: [...revertedChangeSetIds],
  };
};
