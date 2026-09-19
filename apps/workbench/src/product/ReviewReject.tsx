import type {
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionRejectResult,
} from "@petra/contracts";
import { useEffect, useRef } from "react";
import { Link } from "react-router";

import { PetraButton } from "../design-system/primitives.js";
import type { ReviewSession } from "./model.js";
import { executeReviewReject, prepareReviewReject } from "./project-data.js";
import { Observation, ReviewRecoveryAssessment } from "./ReviewRecovery.js";

export type ReviewRejectState =
  | { kind: "idle" | "preparing" }
  | { kind: "unavailable"; message: string }
  | {
      kind: "ready" | "rejecting";
      checkpoint: PetraReviewSessionRejectCheckpoint;
    }
  | { kind: "uncertain"; checkpoint: PetraReviewSessionRejectCheckpoint }
  | {
      kind: "result";
      result: PetraReviewSessionRejectResult;
      reloadFailed: boolean;
    };

const identity = (review: ReviewSession): string =>
  JSON.stringify([
    review.projectId,
    review.id,
    review.exactRef,
    review.reviewMemberId,
  ]);

export const reviewRejectPreparationFailure = (error: unknown): string => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (status === 401 || status === 403)
    return "Rejection preparation was not authorized. No rejection decision was sent.";
  if (status === 409)
    return "This rejection commitment is stale or needs reconciliation. Reload Review and check Recovery. No rejection decision was sent.";
  return "An exact supported rejection commitment could not be prepared or verified. No rejection decision was sent.";
};

/** Transient presentation only. One explicit decision; no suffix execution or retry. */
export const createReviewRejectController = (
  publish: (state: ReviewRejectState) => void,
  reload: () => void | Promise<void>,
  transport = { prepare: prepareReviewReject, reject: executeReviewReject },
  now = () => new Date().toISOString(),
) => {
  let state: ReviewRejectState = { kind: "idle" };
  let generation = 0;
  let selected = "";
  let submitted = false;
  const set = (next: ReviewRejectState) => {
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
            message: reviewRejectPreparationFailure(error),
          });
      }
    },
    reject: async (review: ReviewSession, rationale: string) => {
      const exactRationale = rationale.trim();
      if (
        submitted ||
        state.kind !== "ready" ||
        selected !== identity(review) ||
        exactRationale.length === 0 ||
        exactRationale.length > 4_000
      )
        return;
      submitted = true;
      const checkpoint = structuredClone(state.checkpoint);
      const request: PetraReviewSessionRejectRequest = {
        schema_name: "petra.review-session-reject-request",
        schema_version: "1.0.0",
        checkpoint,
        rationale: exactRationale,
        decided_at: now(),
      };
      set({ kind: "rejecting", checkpoint });
      let result: PetraReviewSessionRejectResult;
      try {
        result = await transport.reject(request);
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

export const ReviewRejectPreview = ({
  checkpoint,
  focus = false,
}: {
  checkpoint: PetraReviewSessionRejectCheckpoint;
  focus?: boolean;
}): React.JSX.Element => {
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) previewRef.current?.focus();
  }, [checkpoint.displayed_commitment_hash, focus]);
  const binding = checkpoint.binding;
  const changeSet = binding.change_set;
  return (
    <div
      className="review-reject-preview"
      ref={previewRef}
      tabIndex={-1}
      aria-label="Prepared rejection"
    >
      <h3>Exact rejection preview</h3>
      <p>
        <strong>One complete atomic ChangeSet.</strong>{" "}
        {binding.atomic_member_ids.length}{" "}
        {binding.atomic_member_ids.length === 1 ? "member" : "members"} ·{" "}
        {changeSet.content.operations.length} operations. Rejection records a
        rejected Approval for this whole ChangeSet. It does not apply the
        candidate or establish that no effect exists.
      </p>
      <dl>
        <div>
          <dt>Selected Review member</dt>
          <dd>
            <code>{binding.selected_review_member.review_member_id}</code>
          </dd>
        </div>
        <div>
          <dt>ChangeSet</dt>
          <dd>
            <code>{changeSet.change_set_id}</code> · revision{" "}
            {changeSet.revision} · <code>{changeSet.content_hash}</code>
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
            Reject by <code>{binding.authorization_basis.actor.actor_id}</code>.
            The server supplied the Actor and exact command grants.
          </dd>
        </div>
      </dl>
      <h4>Complete atomic membership</h4>
      <ul>
        {binding.atomic_member_ids.map((id) => (
          <li key={id}>
            <code>{id}</code>
          </li>
        ))}
      </ul>
      <h4>Exact consequences</h4>
      <ul>
        {binding.consequences.map((consequence, index) => (
          <li key={index}>{consequence}</li>
        ))}
      </ul>
      <details>
        <summary>
          Exact ChangeSet, working state, authorization basis, and command
          grants
        </summary>
        <Observation value={checkpoint} />
      </details>
    </div>
  );
};

const checkpointFrom = (
  state: ReviewRejectState,
): PetraReviewSessionRejectCheckpoint | undefined =>
  state.kind === "result"
    ? state.result.request.checkpoint
    : "checkpoint" in state
      ? state.checkpoint
      : undefined;

export const ReviewRejectNotice = ({
  review,
  state,
  onReload,
}: {
  review: ReviewSession;
  state: ReviewRejectState;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (state.kind === "idle") return null;
  const result = state.kind === "result" ? state.result : undefined;
  const checkpoint = checkpointFrom(state);
  const warning =
    state.kind === "unavailable" ||
    state.kind === "uncertain" ||
    result?.outcome === "reconciliation_required";
  const returnContext =
    result?.request.checkpoint.binding.review_session.content.return_context;
  return (
    <section
      className="review-lifecycle-notice review-reject-notice"
      id="review-reject-observation"
      tabIndex={-1}
      aria-label="Rejection observation"
      data-state={warning ? "uncertain" : undefined}
    >
      <p role={warning ? "alert" : "status"}>
        {state.kind === "preparing"
          ? "Preparing the exact rejection commitment. No decision has been sent."
          : state.kind === "ready"
            ? "Rejection commitment prepared. Inspect its complete membership and consequences, enter a rationale, then reject once."
            : state.kind === "rejecting"
              ? "Recording the explicit rejection decision. The outcome is not yet confirmed."
              : state.kind === "unavailable"
                ? state.message
                : state.kind === "uncertain"
                  ? "Rejection observation is unverified. Effects may exist. Reload Review and check Recovery before another attempt."
                  : result?.outcome === "rejected"
                    ? "The displayed ChangeSet was rejected. Rejection and effect knowledge remain separate."
                    : "Reconciliation required. Retained progress is shown below; no missing command was retried by the browser."}
      </p>
      {checkpoint === undefined ? null : (
        <ReviewRejectPreview
          checkpoint={checkpoint}
          focus={state.kind === "ready"}
        />
      )}
      {state.kind === "result" && state.reloadFailed ? (
        <p role="alert">
          Rejection evidence is retained, but the authorized Review reload
          failed. Reload Review to read current status.
        </p>
      ) : null}
      {result === undefined ? null : (
        <>
          <h3>Recorded rationale</h3>
          <p>{result.request.rationale}</p>
          <h3>Retained rejection progress</h3>
          <ol>
            {result.steps.map((step) => (
              <li key={step.envelope.command_id}>
                {step.envelope.command.command_name}: {step.observation} ·{" "}
                <code>{step.envelope.command_id}</code>
                {step.error_code === undefined ? null : (
                  <> · {step.error_code}</>
                )}
                {step.event === undefined ? null : (
                  <>
                    {" "}
                    · {step.event.event.event_type} ·{" "}
                    <code>{step.event.event_id}</code>
                  </>
                )}
              </li>
            ))}
          </ol>
          <h3>Reconciliation and member outcomes</h3>
          <ReviewRecoveryAssessment assessment={result.assessment} />
          <h3>Exact return</h3>
          {returnContext === undefined ? (
            <p>No originating task return was supplied by this Review.</p>
          ) : (
            <p>
              The retained Review returns to {returnContext.place}:{" "}
              <code>{returnContext.object_ref}</code>.
            </p>
          )}
          <Link className="reference-text-link" to={review.returnPath}>
            Return to {review.returnLabel}
          </Link>
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
