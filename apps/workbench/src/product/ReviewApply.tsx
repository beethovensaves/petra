import type {
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionApplyResult,
} from "@petra/contracts";
import { useEffect, useRef } from "react";
import { PetraButton } from "../design-system/primitives.js";
import type { ReviewSession } from "./model.js";
import { executeReviewApply, prepareReviewApply } from "./project-data.js";
import { Observation, ReviewRecoveryAssessment } from "./ReviewRecovery.js";

export type ReviewApplyState =
  | { kind: "idle" | "preparing" }
  | { kind: "unavailable"; message: string }
  | {
      kind: "ready" | "applying";
      checkpoint: PetraReviewSessionApplyCheckpoint;
    }
  | { kind: "uncertain"; checkpoint: PetraReviewSessionApplyCheckpoint }
  | {
      kind: "result";
      result: PetraReviewSessionApplyResult;
      reloadFailed: boolean;
    };

const identity = (review: ReviewSession): string =>
  JSON.stringify([
    review.projectId,
    review.id,
    review.exactRef,
    review.reviewMemberId,
  ]);

export const reviewApplyPreparationFailure = (error: unknown): string => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (status === 401 || status === 403)
    return "Apply preparation was not authorized. No Apply request was sent.";
  if (status === 409)
    return "This commitment is unavailable or needs reconciliation. Reload Review and check Recovery. No Apply request was sent.";
  return "An exact supported commitment could not be prepared or verified. No Apply request was sent.";
};

/** Transient presentation only. One explicit decision; no suffix execution or retry. */
export const createReviewApplyController = (
  publish: (state: ReviewApplyState) => void,
  reload: () => void | Promise<void>,
  transport = { prepare: prepareReviewApply, apply: executeReviewApply },
  now = () => new Date().toISOString(),
) => {
  let state: ReviewApplyState = { kind: "idle" };
  let generation = 0;
  let selected = "";
  let submitted = false;
  const set = (next: ReviewApplyState) => {
    state = next;
    publish(next);
  };
  return {
    invalidatePreparation: () => {
      generation += 1;
      if (!submitted) set({ kind: "idle" });
    },
    prepare: async (review: ReviewSession) => {
      if (submitted || state.kind === "preparing" || state.kind === "ready")
        return;
      const captured = structuredClone(review);
      selected = identity(captured);
      const current = ++generation;
      set({ kind: "preparing" });
      try {
        const checkpoint = await transport.prepare(captured);
        if (current === generation) set({ kind: "ready", checkpoint });
      } catch (error) {
        if (current === generation)
          set({
            kind: "unavailable",
            message: reviewApplyPreparationFailure(error),
          });
      }
    },
    apply: async (review: ReviewSession) => {
      if (submitted || state.kind !== "ready" || selected !== identity(review))
        return;
      submitted = true;
      const checkpoint = structuredClone(state.checkpoint);
      const request: PetraReviewSessionApplyRequest = {
        schema_name: "petra.review-session-apply-request",
        schema_version: "1.0.0",
        checkpoint,
        decided_at: now(),
      };
      set({ kind: "applying", checkpoint });
      let result: PetraReviewSessionApplyResult;
      try {
        result = await transport.apply(request);
      } catch {
        set({ kind: "uncertain", checkpoint });
        return;
      }
      set({ kind: "result", result, reloadFailed: false });
      try {
        await reload();
      } catch {
        set({ kind: "result", result, reloadFailed: true });
      }
    },
  };
};

export const ReviewApplyPreview = ({
  checkpoint,
  focus = false,
}: {
  checkpoint: PetraReviewSessionApplyCheckpoint;
  focus?: boolean;
}): React.JSX.Element => {
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) previewRef.current?.focus();
  }, [checkpoint.displayed_commitment_hash, focus]);
  const b = checkpoint.binding;
  const cs = b.change_set;
  return (
    <div
      className="review-apply-preview"
      ref={previewRef}
      tabIndex={-1}
      aria-label="Prepared commitment"
    >
      <p>
        <strong>One complete atomic ChangeSet.</strong>{" "}
        {b.atomic_member_ids.length}{" "}
        {b.atomic_member_ids.length === 1 ? "member" : "members"} ·{" "}
        {cs.content.operations.length} operations. Other Review members retain
        their own outcomes.
      </p>
      <p>{cs.content.reason}</p>
      <p>{cs.content.impact.summary}</p>
      <dl>
        <div>
          <dt>ChangeSet</dt>
          <dd>
            <code>{cs.change_set_id}</code> · revision {cs.revision} ·{" "}
            <code>{cs.content_hash}</code>
          </dd>
        </div>
        <div>
          <dt>Displayed commitment</dt>
          <dd>
            <code>{checkpoint.displayed_commitment_hash}</code>
          </dd>
        </div>
        <div>
          <dt>Human decision</dt>
          <dd>
            Apply by <code>{b.authorization_basis.actor.actor_id}</code>.
            ReviewPolicy: not applicable. Delegated and automatic Apply are
            unavailable.
          </dd>
        </div>
      </dl>
      <h3>Complete atomic membership</h3>
      <ul>
        {b.atomic_member_ids.map((id) => (
          <li key={id}>
            <code>{id}</code>
          </li>
        ))}
      </ul>
      <h3>Every operation</h3>
      <ol>
        {cs.content.operations.map((op, index) => (
          <li key={index}>
            <strong>{op.operation_kind.replaceAll("_", " ")}</strong> ·{" "}
            <code>{op.target_id}</code> · base revision {op.base_revision}
            <dl>
              <div>
                <dt>Before</dt>
                <dd>
                  <Observation value={op.before} />
                </dd>
              </div>
              <div>
                <dt>After</dt>
                <dd>
                  <Observation value={op.after} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <h3>Consequences and protected state</h3>
      <ul>
        {b.consequences.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <h3>Material validation and qualifications</h3>
      {b.members
        .filter((m) => b.atomic_member_ids.includes(m.review_member_id))
        .map((member) => (
          <section
            key={member.review_member_id}
            aria-label={`Validation for ${member.review_member_id}`}
          >
            <p>
              <code>{member.review_member_id}</code>
            </p>
            <Observation
              value={{
                candidate_validation: member.working_state.candidate.validation,
                candidate_qualifications:
                  member.working_state.candidate.qualifications,
                relationships: member.working_state.relationships.map((r) => ({
                  working_relationship_id: r.working_relationship_id,
                  validation: r.validation,
                  qualifications: r.qualifications,
                })),
              }}
            />
          </section>
        ))}
      <details>
        <summary>
          Exact commitment, origin, basis, provenance, and dependencies
        </summary>
        <Observation value={checkpoint} />
      </details>
    </div>
  );
};

export const ReviewApplyNotice = ({
  state,
  onReload,
}: {
  state: ReviewApplyState;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (state.kind === "idle") return null;
  const result = state.kind === "result" ? state.result : undefined;
  const warning =
    state.kind === "unavailable" ||
    state.kind === "uncertain" ||
    result?.outcome === "reconciliation_required";
  return (
    <section
      className="review-lifecycle-notice review-apply-notice"
      id="review-apply-observation"
      tabIndex={-1}
      aria-label="Apply observation"
    >
      <p role={warning ? "alert" : "status"}>
        {state.kind === "preparing"
          ? "Preparing the exact commitment. No decision has been sent."
          : state.kind === "ready"
            ? "Commitment prepared. Inspect Changes to apply, then use Apply once to record your exact decision."
            : state.kind === "applying"
              ? "Sending the explicit Apply decision. Application is not yet confirmed."
              : state.kind === "unavailable"
                ? state.message
                : state.kind === "uncertain"
                  ? "Apply observation is unverified. Effects may exist. Reload Review and check Recovery to reconcile status before another attempt."
                  : result?.outcome === "applied"
                    ? "The displayed ChangeSet applied. This does not mean every Review member applied."
                    : "Reconciliation required. Retained steps are shown below; missing steps were not retried."}
      </p>
      {state.kind === "result" && state.reloadFailed ? (
        <p role="alert">
          Apply evidence is retained, but the authorized Review reload failed.
          Reload Review to read current status.
        </p>
      ) : null}
      {result === undefined ? null : (
        <>
          <h3>Retained command observations</h3>
          <ol>
            {result.steps.map((step) => (
              <li key={step.envelope.command_id}>
                {step.envelope.command.command_name}: {step.observation} ·{" "}
                <code>{step.envelope.command_id}</code>
                {step.error_code === undefined ? null : (
                  <> · {step.error_code}</>
                )}
              </li>
            ))}
          </ol>
          <h3>Canonical History references</h3>
          <ul>
            {result.steps.flatMap((step) =>
              step.event === undefined
                ? []
                : [
                    <li key={step.event.event_id}>
                      {step.event.event.event_type} ·{" "}
                      <code>{step.event.event_id}</code>
                    </li>,
                  ],
            )}
          </ul>
          <h3>Projection observation</h3>
          {result.outcome === "applied" &&
          result.assessment.content.review.projection.state ===
            "catching_up" ? (
            <p>
              Applied—updating views. Projection lag does not permit
              resubmission.
            </p>
          ) : null}
          <Observation
            value={{
              authority: result.assessment.content.review.authority,
              projection: result.assessment.content.review.projection,
            }}
          />
          <h3>Every Review member outcome</h3>
          <ReviewRecoveryAssessment assessment={result.assessment} />
        </>
      )}
      {(state.kind === "uncertain" ||
        state.kind === "unavailable" ||
        state.kind === "result") &&
      onReload !== undefined ? (
        <PetraButton
          variant="secondary"
          onClick={() =>
            void Promise.resolve(onReload()).catch(() => undefined)
          }
        >
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};
