import { Link, useLoaderData } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import type { ProjectRecord, ReviewSession } from "./model.js";
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
}: {
  project: ProjectRecord;
  review: ReviewSession;
}): React.JSX.Element => (
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
                <code>{review.changeSet.id}</code> · {review.changeSet.revision}
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
          Apply, Reject, and Decide later remain unavailable until the Review
          command boundary is connected; no local control can record authority.
        </p>
      </div>
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
          aria-disabled="true"
          aria-describedby="review-decision-boundary"
        >
          Decide later
        </PetraButton>
      </PetraButtonGroup>
      <div className="review-decision__alternatives">
        <Link
          className="reference-text-link"
          to={`/projects/${project.id}/graph?layer=working`}
        >
          Inspect working graph
        </Link>
        <Link
          className="reference-text-link"
          to={`/projects/${project.id}/brief#attention-source-depth`}
        >
          Return to the dependency recommendation
        </Link>
      </div>
    </section>
  </main>
);

export const ReviewSessionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const review = useLoaderData<ReviewSession>();
  return <ReviewSessionSurface project={project} review={review} />;
};
