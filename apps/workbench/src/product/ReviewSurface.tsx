import { useEffect, useRef, useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
} from "../design-system/primitives.js";
import type { ProjectRecord, ReviewSession } from "./model.js";
import {
  ProjectDataError,
  createReviewSessionDeferCommandInput,
  createReviewSessionRefreshCommandInput,
  createReviewSessionReopenCommandInput,
  executeReviewSessionLifecycleCommand,
  executeReviewSessionRefreshCommand,
  type ReviewSessionLifecycleCommandInput,
  type ReviewSessionRefreshCommandInput,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";

const ReviewState = ({ review }: { review: ReviewSession }) => (
  <span className="review-state" data-state={review.status}>
    <span aria-hidden="true">
      {review.status === "needs_decision"
        ? "!"
        : review.status === "completed"
          ? "✓"
          : "…"}
    </span>
    {review.statusLabel}
  </span>
);

const ValidationState = ({ review }: { review: ReviewSession }) => (
  <span className="review-state" data-state={review.validation.state}>
    <span aria-hidden="true">
      {review.validation.state === "passed"
        ? "✓"
        : review.validation.state === "blocked"
          ? "×"
          : "!"}
    </span>
    {review.validation.label}
  </span>
);

export type ReviewLifecyclePresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewSessionLifecycleCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewSessionLifecycleCommandInput;
    }
  | {
      readonly state: "stale" | "unauthorized" | "uncertain" | "failed";
      readonly input: ReviewSessionLifecycleCommandInput;
    };

export const reviewLifecycleFailureState = (
  error: unknown,
  input: ReviewSessionLifecycleCommandInput,
): ReviewLifecyclePresentationState => {
  if (error instanceof ProjectDataError && error.status === 409) {
    return { state: "stale", input };
  }
  if (
    error instanceof ProjectDataError &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    !(error instanceof ProjectDataError) ||
    error.status >= 500 ||
    error.status === 408
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewLifecycleNotice = ({
  review,
  lifecycle,
  onRetry,
  onRefresh,
}: {
  review: ReviewSession;
  lifecycle: ReviewLifecyclePresentationState;
  onRetry: (input: ReviewSessionLifecycleCommandInput) => void;
  onRefresh?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (lifecycle.state === "idle") return null;

  const uncertain = lifecycle.state === "uncertain";
  const stale = lifecycle.state === "stale";
  const unauthorized = lifecycle.state === "unauthorized";
  const failed = lifecycle.state === "failed";
  const success = lifecycle.state === "success";
  const reopening = lifecycle.input.requestedAction === "reopen";
  const title =
    lifecycle.state === "pending"
      ? reopening
        ? "Reopening this Review…"
        : "Deferring this Review…"
      : success
        ? lifecycle.applied
          ? reopening
            ? "Review reopened"
            : "Review deferred"
          : reopening
            ? "Review already reopened"
            : "Review deferral confirmed"
        : stale
          ? "Review needs refresh"
          : unauthorized
            ? reopening
              ? "Reopen review was not authorized"
              : "Decide later was not authorized"
            : uncertain
              ? "Command result is not yet confirmed"
              : reopening
                ? "Review was not reopened"
                : "Review was not deferred";
  const detail =
    lifecycle.state === "pending"
      ? reopening
        ? "Petra is checking the exact Review revision and command authority. The Review is not shown as open again yet."
        : "Petra is checking the exact Review revision and command authority. No decision is shown as recorded yet."
      : success
        ? lifecycle.applied
          ? reopening
            ? "The Review is open again. No candidate was approved, rejected, or applied."
            : "The Review is waiting. No candidate was approved, rejected, or applied."
          : reopening
            ? "Petra returned the retained result for this exact command. The Review is open again, and no candidate was approved, rejected, or applied."
            : "Petra returned the retained result for this exact command. The Review is waiting, and no candidate was approved, rejected, or applied."
        : stale
          ? reopening
            ? "This Review changed or no longer accepts this transition. Nothing is shown as reopened; refresh the Review before trying again."
            : "This Review changed or no longer accepts this transition. Nothing is shown as deferred; refresh the Review before deciding again."
          : unauthorized
            ? "Petra did not grant this Review command. The Review remains unchanged in this view."
            : uncertain
              ? "Petra could not verify whether the command took effect. Retry the exact command to reconcile; if it already succeeded, Petra will return its retained result without applying it again."
              : `Petra rejected the command before a verified result was returned. The Review is not shown as ${reopening ? "reopened" : "deferred"} in this view.`;

  return (
    <section
      className="review-lifecycle-notice"
      data-state={lifecycle.state}
      role={stale || unauthorized || uncertain || failed ? "alert" : "status"}
      aria-live={
        stale || unauthorized || uncertain || failed ? "assertive" : "polite"
      }
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {uncertain ? (
        <PetraButton
          variant="secondary"
          onClick={() => onRetry(lifecycle.input)}
        >
          Retry exact command
        </PetraButton>
      ) : null}
      {stale ? (
        <PetraButton variant="secondary" onClick={() => void onRefresh?.()}>
          Refresh Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export type ReviewRefreshPresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewSessionRefreshCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewSessionRefreshCommandInput;
    }
  | {
      readonly state: "conflict" | "unauthorized" | "uncertain" | "failed";
      readonly input: ReviewSessionRefreshCommandInput;
    };

export const reviewRefreshFailureState = (
  error: unknown,
  input: ReviewSessionRefreshCommandInput,
): ReviewRefreshPresentationState => {
  if (error instanceof ProjectDataError && error.status === 409) {
    return { state: "conflict", input };
  }
  if (
    error instanceof ProjectDataError &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    !(error instanceof ProjectDataError) ||
    error.status >= 500 ||
    error.status === 408
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewRefreshNotice = ({
  review,
  refresh,
  onRetry,
  onReload,
}: {
  review: ReviewSession;
  refresh: ReviewRefreshPresentationState;
  onRetry: (input: ReviewSessionRefreshCommandInput) => void;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (refresh.state === "idle") return null;

  const conflict = refresh.state === "conflict";
  const unauthorized = refresh.state === "unauthorized";
  const uncertain = refresh.state === "uncertain";
  const failed = refresh.state === "failed";
  const success = refresh.state === "success";
  const title =
    refresh.state === "pending"
      ? "Refreshing this Review…"
      : success
        ? refresh.applied
          ? "Review refreshed"
          : "Review refresh already confirmed"
        : conflict
          ? "Review changed before refresh"
          : unauthorized
            ? "Review refresh was not authorized"
            : uncertain
              ? "Refresh result is not yet confirmed"
              : "Review was not refreshed";
  const detail =
    refresh.state === "pending"
      ? "Petra is checking the exact Review revision and open lifecycle. The stale comparison remains visible until a result is validated. Nothing is shown as refreshed yet."
      : success
        ? refresh.applied
          ? "Petra refreshed the Review against the current Project position and compatible working heads. Refresh did not approve, reject, apply, or separate anything and did not edit any candidate or basis record."
          : "Petra returned the retained result for this exact command. Refresh was not applied again; it did not approve, reject, apply, or separate anything and did not edit any candidate or basis record."
        : conflict
          ? "The exact Review changed, a compatible refresh could not be composed, or refresh is no longer required. Nothing is shown as refreshed; reload the authenticated Review before choosing another action."
          : unauthorized
            ? "Petra did not grant this refresh command. The stale comparison remains visible, and nothing is shown as refreshed."
            : uncertain
              ? "Petra could not verify whether refresh took effect. Retry the exact command to reconcile; if it already succeeded, Petra will return its retained result without refreshing again."
              : "Petra rejected the refresh before a verified result was returned. The stale comparison remains visible, and nothing is shown as refreshed.";

  return (
    <section
      className="review-lifecycle-notice review-refresh-notice"
      data-state={refresh.state}
      role={
        conflict || unauthorized || uncertain || failed ? "alert" : "status"
      }
      aria-live={
        conflict || unauthorized || uncertain || failed ? "assertive" : "polite"
      }
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {uncertain ? (
        <PetraButton variant="secondary" onClick={() => onRetry(refresh.input)}>
          Retry exact refresh
        </PetraButton>
      ) : null}
      {conflict ? (
        <PetraButton variant="secondary" onClick={() => void onReload?.()}>
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export const ReviewCollectionSurface = ({
  project,
  reviews,
}: {
  project: ProjectRecord;
  reviews: ReviewSession[];
}): React.JSX.Element => {
  const needsDecision = reviews.filter(
    (review) => review.status === "needs_decision",
  );
  const waiting = reviews.filter((review) => review.status === "waiting");
  const completed = reviews.filter((review) => review.status === "completed");

  return (
    <main className="reference-surface" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Review · current Project</p>
          <h1>Review</h1>
          <p className="reference-lede">
            Inspect exact candidates, basis, differences, and consequences
            before an accountable Project decision.
          </p>
        </div>
      </header>

      {reviews.length === 0 ? (
        <section
          className="reference-empty"
          aria-labelledby="review-empty-title"
        >
          <PetraMark />
          <h2 id="review-empty-title">No decisions are waiting</h2>
          <p>
            Working material stays in its task until a responsible decision is
            required.
          </p>
        </section>
      ) : (
        <>
          <section
            className="review-summary"
            aria-labelledby="review-summary-title"
          >
            <span aria-hidden="true">!</span>
            <div>
              <h2 id="review-summary-title">
                {needsDecision.length} decision needs your attention
              </h2>
              <p>
                {waiting.length + completed.length} other Review{" "}
                {waiting.length + completed.length === 1
                  ? "session does"
                  : "sessions do"}{" "}
                not require an immediate decision.
              </p>
            </div>
          </section>

          <ReviewGroup
            label="Needs your decision"
            reviews={needsDecision}
            project={project}
          />
          <ReviewGroup label="Waiting" reviews={waiting} project={project} />
          <ReviewGroup
            label="Completed"
            reviews={completed}
            project={project}
          />
        </>
      )}
    </main>
  );
};

const ReviewGroup = ({
  label,
  reviews,
  project,
}: {
  label: string;
  reviews: ReviewSession[];
  project: ProjectRecord;
}) => (
  <section
    className="review-group"
    aria-labelledby={`review-group-${label.replaceAll(" ", "-")}`}
  >
    <header>
      <h2 id={`review-group-${label.replaceAll(" ", "-")}`}>{label}</h2>
      <span>{reviews.length}</span>
    </header>
    {reviews.length === 0 ? (
      <p className="review-group__empty">No Review sessions in this group.</p>
    ) : (
      <ol>
        {reviews.map((review) => (
          <li key={review.id}>
            <article className="review-row">
              <div>
                <p>{review.candidate.kind}</p>
                <h3>
                  <Link to={review.id}>{review.title}</Link>
                </h3>
                <span>{review.objective}</span>
              </div>
              <dl>
                <div>
                  <dt>Bound to</dt>
                  <dd>{review.snapshot}</dd>
                </div>
                <div>
                  <dt>Responsible</dt>
                  <dd>{review.responsible}</dd>
                </div>
              </dl>
              <ReviewState review={review} />
              <Link className="reference-text-link" to={review.id}>
                Open decision{" "}
                <span className="visually-hidden">for {review.title}</span>
              </Link>
            </article>
          </li>
        ))}
      </ol>
    )}
    {label === "Needs your decision" && reviews.length > 0 ? (
      <p className="review-group__note">
        Counts represent decisions, not every candidate or graph object in{" "}
        {project.title}.
      </p>
    ) : null}
  </section>
);

export const ReviewCollectionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  return (
    <ReviewCollectionSurface
      project={project}
      reviews={useLoaderData<ReviewSession[]>()}
    />
  );
};

export const ReviewSessionSurface = ({
  project,
  review,
  onReviewChange,
}: {
  project: ProjectRecord;
  review: ReviewSession;
  onReviewChange?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element => {
  const [rationale, setRationale] = useState("");
  const [lifecycle, setLifecycle] = useState<ReviewLifecyclePresentationState>({
    state: "idle",
  });
  const [refresh, setRefresh] = useState<ReviewRefreshPresentationState>({
    state: "idle",
  });
  const decisionRef = useRef<HTMLElement>(null);
  const lifecyclePending = lifecycle.state === "pending";
  const refreshPending = refresh.state === "pending";
  const commandPending = lifecyclePending || refreshPending;
  const deferPresented =
    review.status === "needs_decision" &&
    review.lifecycle !== "deferred" &&
    review.lifecycle !== "completed" &&
    lifecycle.state !== "success";
  const reopenPresented =
    review.lifecycle === "deferred" && lifecycle.state !== "success";
  const refreshControlPresented =
    review.snapshotState === "stale" &&
    (refresh.state === "idle" || refresh.state === "pending");
  const refreshAvailable =
    refresh.state === "idle" &&
    review.snapshotState === "stale" &&
    review.lifecycle === "open" &&
    !lifecyclePending;

  useEffect(() => {
    if (lifecycle.state !== "idle" && lifecycle.state !== "pending") {
      decisionRef.current
        ?.querySelector<HTMLElement>(".review-lifecycle-notice")
        ?.focus();
    }
  }, [lifecycle.state]);

  useEffect(() => {
    if (refresh.state !== "idle" && refresh.state !== "pending") {
      decisionRef.current
        ?.querySelector<HTMLElement>(".review-refresh-notice")
        ?.focus();
    }
  }, [refresh.state]);

  const runLifecycleCommand = (
    input: ReviewSessionLifecycleCommandInput,
  ): void => {
    setLifecycle({ state: "pending", input });
    void executeReviewSessionLifecycleCommand(input).then(
      (result) => {
        setLifecycle({ state: "success", applied: result.applied, input });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        setLifecycle(reviewLifecycleFailureState(error, input));
      },
    );
  };

  const deferReview = (): void => {
    const reason = rationale.trim();
    runLifecycleCommand(
      createReviewSessionDeferCommandInput(review, {
        ...(reason.length === 0 ? {} : { rationale: reason }),
      }),
    );
  };

  const reopenReview = (): void => {
    runLifecycleCommand(createReviewSessionReopenCommandInput(review));
  };

  const reloadReview = async (): Promise<void> => {
    if (onReviewChange !== undefined) await onReviewChange();
    setLifecycle({ state: "idle" });
    setRefresh({ state: "idle" });
  };

  const runRefreshCommand = (input: ReviewSessionRefreshCommandInput): void => {
    setRefresh({ state: "pending", input });
    void executeReviewSessionRefreshCommand(input).then(
      (result) => {
        setRefresh({ state: "success", applied: result.applied, input });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        setRefresh(reviewRefreshFailureState(error, input));
      },
    );
  };

  const refreshReview = (): void => {
    runRefreshCommand(createReviewSessionRefreshCommandInput(review));
  };

  const lifecycleBoundary =
    review.lifecycle === "deferred"
      ? "This Review is deferred. Reopen review sends this exact Review revision to Petra. The server rechecks current lifecycle and authority; seeing Deferred here does not mean the command is eligible or authorized."
      : review.status === "needs_decision"
        ? "Apply and Reject remain unavailable until their Review command boundaries are connected. Decide later sends the exact Review revision to Petra; the server rechecks lifecycle and authority before changing coordination state."
        : review.status === "waiting"
          ? review.lifecycle === "open"
            ? "This Review is waiting for another reason; its exact lifecycle is open. Reopen is unavailable, and the client does not treat Waiting as Deferred."
            : "This Review is waiting. This retained Review read does not supply an exact deferred lifecycle, so Reopen is unavailable."
          : "This Review is completed. No Review lifecycle action is available from this presentation.";
  const refreshBoundary =
    review.snapshotState !== "stale"
      ? ""
      : review.lifecycle === "open"
        ? " This authenticated Review read marks the comparison stale and supplies its exact open lifecycle. Refresh Review sends only the exact Review identity, revision, content hash, and open lifecycle. Seeing Stale and Open here does not establish eligibility or authorization; the server rechecks both. Refresh does not approve, reject, apply, or separate anything and does not edit any candidate or basis record."
        : " This authenticated Review read marks the comparison stale but does not supply the exact open lifecycle required by RefreshReviewSession. Refresh Review is unavailable; the client does not infer lifecycle or eligibility.";
  const decisionBoundary = `${lifecycleBoundary}${refreshBoundary}`;

  return (
    <main className="reference-surface review-session" id="reference-main">
      <header className="review-session__heading">
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/review`}
        >
          <span aria-hidden="true">←</span> Return to Review
        </Link>
        <div className="review-session__orientation">
          <div>
            <p className="reference-eyebrow">
              Review session · {review.snapshot}
            </p>
            <h1>{review.title}</h1>
            <p className="reference-lede">{review.objective}</p>
          </div>
          <ReviewState review={review} />
        </div>
        <dl className="review-session__identity">
          <div>
            <dt>Review identity</dt>
            <dd>
              <code>{review.id}</code>
            </dd>
          </div>
          <div>
            <dt>Responsible author</dt>
            <dd>{review.responsible}</dd>
          </div>
          <div>
            <dt>Return</dt>
            <dd>{review.returnLabel}</dd>
          </div>
        </dl>
      </header>

      <section
        className="review-validation"
        data-state={review.validation.state}
        aria-labelledby="review-validation-title"
      >
        <span aria-hidden="true">×</span>
        <div>
          <div className="review-validation__title">
            <h2 id="review-validation-title">Material validation state</h2>
            <ValidationState review={review} />
          </div>
          <p>{review.validation.detail}</p>
          {review.validation.recovery === undefined ? null : (
            <p>
              <strong>Recovery:</strong> {review.validation.recovery}
            </p>
          )}
        </div>
      </section>

      <section
        className="review-comparison"
        aria-labelledby="review-comparison-title"
      >
        <header>
          <p className="reference-panel-kicker">Exact comparison</p>
          <h2 id="review-comparison-title">Current and Candidate</h2>
        </header>
        <div className="review-comparison__positions">
          <article>
            <p>Current · authoritative</p>
            <h3>{review.candidate.current}</h3>
            <span>{review.snapshot}</span>
          </article>
          <article>
            <p>Candidate · working</p>
            <h3>{review.candidate.proposed}</h3>
            <span>{review.candidate.revision}</span>
          </article>
        </div>
        <div className="review-difference">
          <strong>Material difference</strong>
          <p>{review.candidate.difference}</p>
        </div>
        <dl className="review-origin">
          <div>
            <dt>Origin</dt>
            <dd>
              <strong>{review.candidate.origin}</strong>{" "}
              {review.candidate.originDetail}
            </dd>
          </div>
          <div>
            <dt>Candidate identity</dt>
            <dd>
              <code>{review.candidate.id}</code>
            </dd>
          </div>
        </dl>
      </section>

      <div className="review-session__columns">
        <section className="review-basis" aria-labelledby="review-basis-title">
          <header>
            <p className="reference-panel-kicker">Why and with what limits</p>
            <h2 id="review-basis-title">Basis</h2>
          </header>
          <ol>
            {review.basis.map((basis) => (
              <li key={basis.id} id={`basis-${basis.id}`} tabIndex={-1}>
                <div>
                  <span>{basis.relation}</span>
                  <strong>{basis.label}</strong>
                </div>
                <span className="review-basis__extent">{basis.extent}</span>
                <p>{basis.detail}</p>
                {basis.sourceId === undefined ? null : (
                  <Link
                    className="reference-text-link"
                    to={`/projects/${project.id}/sources/${basis.sourceId}?from=review&reviewId=${review.id}`}
                  >
                    Inspect exact source
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section
          className="review-consequences"
          aria-labelledby="review-consequences-title"
        >
          <header>
            <p className="reference-panel-kicker">If applied</p>
            <h2 id="review-consequences-title">Consequences</h2>
          </header>
          <ul>
            {review.consequences.map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </section>
      </div>

      <section
        className="review-changeset"
        aria-labelledby="review-changeset-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Commitment preview</p>
            <h2 id="review-changeset-title">Changes to apply</h2>
          </div>
          <span>{review.changeSet?.atomicity ?? "No ChangeSet prepared"}</span>
        </header>
        {review.changeSet === undefined ? (
          <p>
            This durable Review session exists before commitment. Petra must
            prepare and validate an exact ChangeSet before anything can be
            applied.
          </p>
        ) : (
          <>
            <dl>
              <div>
                <dt>ChangeSet</dt>
                <dd>
                  <code>{review.changeSet.id}</code> ·{" "}
                  {review.changeSet.revision}
                </dd>
              </div>
            </dl>
            <div className="review-changeset__lists">
              <section aria-labelledby="proposed-changes-title">
                <h3 id="proposed-changes-title">Proposed change</h3>
                <ul>
                  {review.changeSet.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="protected-state-title">
                <h3 id="protected-state-title">Unchanged and protected</h3>
                <ul>
                  {review.changeSet.protected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </section>

      <section
        ref={decisionRef}
        className="review-decision"
        aria-labelledby="review-decision-title"
      >
        <div>
          <p className="reference-panel-kicker">Accountable boundary</p>
          <h2 id="review-decision-title">Decision</h2>
          <p id="review-decision-boundary">
            {review.validation.state === "blocked"
              ? `${review.validation.detail} `
              : ""}
            {decisionBoundary}
          </p>
        </div>
        {review.status === "needs_decision" && lifecycle.state !== "success" ? (
          <div className="review-decision__defer-input">
            <PetraTextArea
              label="Reason for deciding later (optional)"
              hint="Petra retains this reason with the deferral. It grants no approval. A scheduled revisit time is not supported yet."
              rows={3}
              maxLength={4000}
              value={rationale}
              disabled={commandPending}
              onChange={(event) => setRationale(event.currentTarget.value)}
            />
          </div>
        ) : null}
        <PetraButtonGroup label="Review decision">
          <PetraButton
            variant="primary"
            aria-disabled="true"
            aria-describedby="review-decision-boundary"
          >
            {review.changeSet === undefined
              ? "Apply unavailable"
              : `Apply ${review.changeSet.changes.length} changes`}
          </PetraButton>
          <PetraButton
            aria-disabled="true"
            aria-describedby="review-decision-boundary"
          >
            Reject candidate
          </PetraButton>
          <PetraButton
            variant="quiet"
            busy={lifecyclePending}
            busyLabel={
              reopenPresented ? "Reopening Review…" : "Deferring Review…"
            }
            aria-disabled={
              refreshPending || !(deferPresented || reopenPresented)
            }
            aria-describedby="review-decision-boundary"
            data-operation={
              reopenPresented ? "reopen_review_session" : "defer_review_session"
            }
            onClick={reopenPresented ? reopenReview : deferReview}
          >
            {reopenPresented ? "Reopen review" : "Decide later"}
          </PetraButton>
          {refreshControlPresented ? (
            <PetraButton
              variant="secondary"
              busy={refreshPending}
              busyLabel="Refreshing Review…"
              aria-disabled={!refreshAvailable}
              aria-describedby="review-decision-boundary"
              data-operation={
                review.lifecycle === "open"
                  ? "refresh_review_session"
                  : undefined
              }
              onClick={refreshReview}
            >
              Refresh Review
            </PetraButton>
          ) : null}
        </PetraButtonGroup>
        <ReviewLifecycleNotice
          review={review}
          lifecycle={lifecycle}
          onRetry={runLifecycleCommand}
          onRefresh={reloadReview}
        />
        <ReviewRefreshNotice
          review={review}
          refresh={refresh}
          onRetry={runRefreshCommand}
          onReload={reloadReview}
        />
        <div className="review-decision__alternatives">
          <Link
            className="reference-text-link"
            to={`/projects/${project.id}/graph?layer=working`}
          >
            Inspect working graph
          </Link>
          <Link className="reference-text-link" to={review.returnPath}>
            Return to {review.returnLabel}
          </Link>
        </div>
      </section>
    </main>
  );
};

export const ReviewSessionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const review = useLoaderData<ReviewSession>();
  const revalidator = useRevalidator();
  return (
    <ReviewSessionSurface
      project={project}
      review={review}
      onReviewChange={() => revalidator.revalidate()}
    />
  );
};
