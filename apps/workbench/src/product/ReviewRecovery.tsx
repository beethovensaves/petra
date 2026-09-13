import type { PetraReviewRecoveryAssessment } from "@petra/contracts";
import { useEffect, useRef, useState } from "react";

import { PetraButton } from "../design-system/primitives.js";
import type { ReviewSession } from "./model.js";
import { getReviewRecoveryAssessment } from "./project-data.js";

export const reviewRecoveryFailure = (error: unknown): string => {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;
  if (status !== undefined) {
    if (status === 409)
      return "Recovery assessment needs refresh. Reload this Review before checking again.";
    if (status === 401 || status === 403)
      return "Recovery assessment was not authorized. No assessment is shown.";
  }
  return "Recovery assessment is unavailable or inconsistent. No effect or recovery permission can be established from this read.";
};

const label = (value: string): string => value.replaceAll("_", " ");

/** Lossless textual disclosure of supplied observations; never interprets eligibility. */
export const Observation = ({
  value,
}: {
  value: unknown;
}): React.JSX.Element => {
  if (Array.isArray(value))
    return value.length === 0 ? (
      <span>None supplied</span>
    ) : (
      <ol>
        {value.map((item: unknown, index) => (
          <li key={index}>
            <Observation value={item} />
          </li>
        ))}
      </ol>
    );
  if (value !== null && typeof value === "object")
    return (
      <dl>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>
              <Observation value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return (
    <span>
      {typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? String(value)
        : "Not supplied"}
    </span>
  );
};

const nextStep = {
  inspect: "Inspect the retained outcome.",
  return_to_review: "Return to Review for the remaining decision.",
  refresh_or_revise:
    "Refresh or revise through the existing Review owner before reassessment.",
  reconcile_status: "Reconcile status; the effect is not established.",
} as const;
const effect = {
  applied: "Application effect confirmed",
  no_effect: "No effect confirmed",
  unknown: "Outcome unknown",
} as const;

export const ReviewRecoveryAssessment = ({
  assessment,
}: {
  assessment: PetraReviewRecoveryAssessment;
}): React.JSX.Element => {
  const { content } = assessment;
  return (
    <div className="review-recovery__assessment">
      <h4>What is now known</h4>
      <p>
        {content.coverage.assessed_members} of {content.coverage.review_members}{" "}
        Review members assessed · {content.coverage.atomic_change_sets} complete
        atomic ChangeSets · {content.coverage.operations} operations. Coverage:{" "}
        {content.coverage.state}.
      </p>
      <p>
        Read at {assessment.read_at}. Reconciled at {assessment.reconciled_at}.
        Review identity: {content.freshness.expected_review_identity}. Authority
        snapshot: {content.freshness.authority_snapshot}.
      </p>
      <ul>
        {content.review.members.map((member) => (
          <li key={member.review_member_id}>
            <code>{member.review_member_id}</code> · {label(member.member_role)}{" "}
            · Review outcome: {label(member.outcome)} · Working heads:{" "}
            {
              content.freshness.members.find(
                (item) => item.review_member_id === member.review_member_id,
              )?.working_heads
            }
          </li>
        ))}
      </ul>
      <h4>What changed</h4>
      <p>
        Review outcomes and ChangeSet effects are separate. Each ChangeSet below
        is one complete atomic unit; its members cannot be retried or reversed
        separately.
      </p>
      {content.groups.length === 0 ? (
        <p>No associated ChangeSets were supplied.</p>
      ) : (
        content.groups.map((group) => (
          <section
            key={group.change_set.change_set_id}
            className="review-recovery__group"
            aria-label={`Atomic ChangeSet ${group.change_set.change_set_id}`}
          >
            <h5>
              ChangeSet <code>{group.change_set.change_set_id}</code>
            </h5>
            <p>
              {group.member_ids.length} members · {group.operation_count}{" "}
              operations · Coverage: {group.coverage} · ChangeSet state:{" "}
              {group.state}
            </p>
            <p>
              <strong>Effect: {effect[group.effect]}.</strong>{" "}
              {group.effect_basis}
            </p>
            <ul>
              {group.member_outcomes.map((member) => (
                <li key={member.review_member_id}>
                  <code>{member.review_member_id}</code> · Review outcome:{" "}
                  {label(member.review_outcome)}
                </li>
              ))}
            </ul>
            <p>
              Assessment explanation: {nextStep[group.next_step]} This
              explanation grants no execution permission.
            </p>
            <details>
              <summary>Complete ChangeSet and execution observations</summary>
              <Observation
                value={{
                  change_set: group.change_set,
                  record_hash: group.record_hash,
                  approvals: group.approvals,
                  commands: group.commands,
                  events: group.events,
                }}
              />
            </details>
            {group.history_assessment === undefined ? (
              <p>No History compensation assessment was supplied.</p>
            ) : (
              <details>
                <summary>History compensation assessment</summary>
                <p>
                  History owns compensation eligibility and grant checks. This
                  read offers no Revert or compensation execution.
                </p>
                <Observation value={group.history_assessment} />
              </details>
            )}
          </section>
        ))
      )}
      <h4>Members without a ChangeSet</h4>
      {content.unbound_member_ids.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {content.unbound_member_ids.map((id) => (
            <li key={id}>
              <code>{id}</code> · Review outcome:{" "}
              {label(
                content.review.members.find(
                  (member) => member.review_member_id === id,
                )!.outcome,
              )}{" "}
              · No associated ChangeSet; no effect is inferred.
            </li>
          ))}
        </ul>
      )}
      <h4>What remains</h4>
      <ul>
        {content.preservation.map((item) => (
          <li key={item.kind}>
            <strong>
              {label(item.kind)}: {item.state}.
            </strong>{" "}
            {item.detail}
            <details>
              <summary>Exact {label(item.kind)} records</summary>
              <Observation
                value={{
                  record_ids: item.record_ids,
                  record_hashes: item.record_hashes,
                }}
              />
            </details>
          </li>
        ))}
      </ul>
      <h4>Limitations and safe next step</h4>
      <p>
        This is a read-only assessment. No recovery execution is offered. Check
        status reads this entire Review again; it does not retry a command.
        Local unsent edits and navigation remain on this device and are outside
        the preservation inventory.
      </p>
      <ul>
        {content.limitations.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <details>
        <summary>
          Exact assessment identity, source records, and projection observations
        </summary>
        <Observation
          value={{
            assessment_id: assessment.assessment_id,
            content_hash: assessment.content_hash,
            project_id: assessment.project_id,
            producer: content.producer,
            producer_version: content.producer_version,
            rule_version: content.rule_version,
            privacy: content.privacy,
            authority_effect: content.authority_effect,
            review_session: content.review_session,
            review: content.review,
          }}
        />
      </details>
    </div>
  );
};

export type ReviewRecoveryReadState =
  | { kind: "idle" | "pending" }
  | { kind: "ready"; assessment: PetraReviewRecoveryAssessment }
  | { kind: "failed"; message: string };

/** Client-local read lifecycle. Invalidating drops late responses, never canonical records. */
export const createReviewRecoveryRead = (
  read: () => Promise<PetraReviewRecoveryAssessment>,
  publish: (state: ReviewRecoveryReadState) => void,
) => {
  let generation = 0;
  let pending = false;
  return {
    invalidate: () => {
      generation += 1;
      pending = false;
    },
    check: async () => {
      if (pending) return;
      pending = true;
      const request = ++generation;
      publish({ kind: "pending" });
      try {
        const assessment = await read();
        if (request === generation) publish({ kind: "ready", assessment });
      } catch (error) {
        if (request === generation)
          publish({ kind: "failed", message: reviewRecoveryFailure(error) });
      } finally {
        if (request === generation) pending = false;
      }
    },
  };
};

export const ReviewRecovery = ({
  review,
  disabled,
  onReload,
}: {
  review: ReviewSession;
  disabled: boolean;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element => {
  const [state, setState] = useState<ReviewRecoveryReadState>({ kind: "idle" });
  const [reader] = useState(() =>
    createReviewRecoveryRead(
      () => getReviewRecoveryAssessment(review),
      setState,
    ),
  );
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => reader.invalidate(), [reader]);
  useEffect(() => {
    if (state.kind === "ready" || state.kind === "failed")
      notice.current?.focus();
  }, [state.kind]);
  const check = (): void => {
    if (!disabled) void reader.check();
  };
  return (
    <details className="review-recovery">
      <summary>Recovery</summary>
      <h3>Check the complete Review</h3>
      <p>
        Read the owning records for <code>{review.id}</code>, revision{" "}
        {review.exactRef.revision}, in Project <code>{review.projectId}</code>.
        No member subset is requested.
      </p>
      <p>
        Expected content hash: <code>{review.exactRef.contentHash}</code>
      </p>
      <PetraButton
        onClick={check}
        aria-disabled={disabled}
        busy={state.kind === "pending"}
        busyLabel="Checking Review status…"
      >
        Check status
      </PetraButton>
      <p
        ref={notice}
        tabIndex={-1}
        role={state.kind === "failed" ? "alert" : "status"}
        aria-live={state.kind === "failed" ? "assertive" : "polite"}
      >
        {state.kind === "idle"
          ? "No recovery assessment has been read."
          : state.kind === "pending"
            ? "Reading the complete atomic manifest…"
            : state.kind === "failed"
              ? state.message
              : "Complete recovery assessment loaded. Review outcomes and effect knowledge are listed separately below."}
      </p>
      {state.kind === "failed" && onReload !== undefined ? (
        <PetraButton
          variant="secondary"
          onClick={() => {
            setState({ kind: "idle" });
            void Promise.resolve(onReload()).catch(() => {
              setState({
                kind: "failed",
                message:
                  "Review reload failed. No recovery assessment is shown.",
              });
            });
          }}
        >
          Reload Review
        </PetraButton>
      ) : null}
      {state.kind === "ready" ? (
        <ReviewRecoveryAssessment assessment={state.assessment} />
      ) : null}
    </details>
  );
};
