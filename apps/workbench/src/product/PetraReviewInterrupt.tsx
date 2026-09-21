import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
} from "../design-system/primitives.js";
import { StateNotice } from "../design-system/state.js";
import {
  createProjectReviewInterruptResponse,
  readRetainedProjectReviewInterruptResponse,
  resolveProjectReviewInterrupt,
  retainProjectReviewInterruptResponse,
  type ProjectReviewInterruptPresentation,
  type ProjectReviewInterruptResolution,
} from "./petra-review-interrupt.js";

const words = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

export const PetraReviewInterrupt = ({
  interrupt,
}: {
  interrupt: ProjectReviewInterruptPresentation;
}): React.JSX.Element => {
  const [retainedResponse, setRetainedResponse] = useState(() =>
    readRetainedProjectReviewInterruptResponse(interrupt),
  );
  const [decision, setDecision] = useState<"accept" | "reject" | "">(
    retainedResponse?.decision ?? "",
  );
  const [rationale, setRationale] = useState(retainedResponse?.rationale ?? "");
  const [pending, setPending] = useState(false);
  const [resolution, setResolution] =
    useState<ProjectReviewInterruptResolution>();
  const [error, setError] = useState<string>();
  const fieldName = `review-decision-${interrupt.interruptRef.interaction_interrupt_id}`;
  const exactResponseRetained = retainedResponse !== undefined;
  const responseUnavailable =
    decision === ""
      ? { reason: "Choose whether to accept or reject the exact ChangeSet." }
      : rationale.trim().length === 0
        ? { reason: "Explain the basis for this decision." }
        : undefined;

  const respond = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (decision === "" || rationale.trim().length === 0 || pending) return;
    const response =
      retainedResponse ??
      createProjectReviewInterruptResponse(interrupt, {
        decision,
        rationale,
      });
    if (retainedResponse === undefined) {
      retainProjectReviewInterruptResponse(interrupt, response);
      setRetainedResponse(response);
    }
    setPending(true);
    setError(undefined);
    try {
      setResolution(await resolveProjectReviewInterrupt(response));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Petra could not confirm this exact Review response.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="petra-review-interrupt"
      aria-labelledby={`${fieldName}-title`}
      data-response-state={
        resolution === undefined
          ? error === undefined
            ? "pending"
            : "recovery"
          : "resolved"
      }
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Durable Review interrupt</p>
          <h2 id={`${fieldName}-title`}>Respond before Work can continue</h2>
          <p>{interrupt.message}</p>
        </div>
        <span>Response required</span>
      </header>

      <dl className="petra-review-interrupt__identity">
        <div>
          <dt>Pending interrupt</dt>
          <dd>
            <code>{interrupt.interruptRef.interaction_interrupt_id}</code>
            <span>Revision {interrupt.interruptRef.revision}</span>
          </dd>
        </div>
        <div>
          <dt>Exact ChangeSet</dt>
          <dd>
            <code>{interrupt.changeSetRef.change_set_id}</code>
            <span>Revision {interrupt.changeSetRef.revision}</span>
          </dd>
        </div>
        <div>
          <dt>Interaction run</dt>
          <dd>
            <code>{interrupt.interactionRunId}</code>
          </dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>
            The signed-in server resolves the human Actor and capability. Model
            text supplies neither.
          </dd>
        </div>
      </dl>

      {resolution === undefined ? (
        <form onSubmit={(event) => void respond(event)}>
          <fieldset disabled={pending || exactResponseRetained}>
            <legend>Authenticated Review decision</legend>
            <p>
              Choose one decision for this exact ChangeSet. Accept applies only
              through the registered Review commands; reject records the human
              decision without applying the candidate.
            </p>
            <div className="petra-review-interrupt__choices">
              <label>
                <input
                  type="radio"
                  name={fieldName}
                  value="accept"
                  checked={decision === "accept"}
                  onChange={() => setDecision("accept")}
                />
                <span>
                  <strong>Accept and apply</strong>
                  <small>
                    Run the exact prepared ChangeSet command sequence.
                  </small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name={fieldName}
                  value="reject"
                  checked={decision === "reject"}
                  onChange={() => setDecision("reject")}
                />
                <span>
                  <strong>Reject</strong>
                  <small>Record rejection; do not apply the candidate.</small>
                </span>
              </label>
            </div>
            <PetraTextArea
              label="Decision rationale"
              hint="This rationale is retained with the exact response and reused unchanged if delivery is uncertain."
              required
              rows={4}
              maxLength={5_000}
              value={rationale}
              onChange={(event) => setRationale(event.currentTarget.value)}
            />
          </fieldset>
          {exactResponseRetained ? (
            <p className="petra-review-interrupt__retained" role="status">
              The exact {retainedResponse.decision} response is retained in this
              browser. Respond will replay those same bytes; it will not create
              another decision.
            </p>
          ) : null}
          <PetraButtonGroup label="Durable Review response">
            <PetraButton
              type="submit"
              variant="primary"
              busy={pending}
              busyLabel="Recording response…"
              {...(responseUnavailable === undefined
                ? {}
                : { unavailable: responseUnavailable })}
            >
              Respond
            </PetraButton>
          </PetraButtonGroup>
        </form>
      ) : (
        <div className="petra-review-interrupt__outcome" role="status">
          <header>
            <p className="reference-panel-kicker">Durable outcome</p>
            <h3>
              {resolution.decision === "accept"
                ? "Authenticated decision applied"
                : "Authenticated rejection recorded"}
            </h3>
            <p>
              {resolution.replayed
                ? "Petra replayed the retained response without another authority effect."
                : "Petra recorded the response and ran the registered direct Review command."}
            </p>
          </header>
          <dl>
            <div>
              <dt>Authenticated human</dt>
              <dd>
                <code>{resolution.actorId}</code>
              </dd>
            </div>
            <div>
              <dt>Decision and outcome</dt>
              <dd>
                {words(resolution.decision)} · {words(resolution.outcome)}
              </dd>
            </div>
            <div>
              <dt>Durable interrupt</dt>
              <dd>
                Revision {resolution.interactionInterruptRevision} · response{" "}
                {resolution.responseRecorded ? "recorded" : "already recorded"}
              </dd>
            </div>
            <div>
              <dt>Recovery assessment</dt>
              <dd>
                {words(resolution.coverageState)} · member{" "}
                {words(resolution.memberOutcome)} · snapshot{" "}
                {words(resolution.snapshotState)}
              </dd>
            </div>
          </dl>
          <nav aria-label="Exact Review response destinations">
            <Link
              className="reference-primary-link"
              to={resolution.returnContext.paths.return}
            >
              Return to {resolution.returnContext.destination.label}
            </Link>
            <Link
              className="reference-text-link"
              to={resolution.returnContext.paths.review}
            >
              Open exact Review
            </Link>
            <Link
              className="reference-text-link"
              to={resolution.returnContext.paths.work}
            >
              Open originating Work
            </Link>
            <Link
              className="reference-text-link"
              to={resolution.returnContext.paths.projectThread}
            >
              Open originating Project thread
            </Link>
          </nav>
          <details>
            <summary>Command, assessment, and exact return identities</summary>
            <dl>
              <div>
                <dt>Review command</dt>
                <dd>
                  <code>{resolution.commandId}</code>
                </dd>
              </div>
              <div>
                <dt>Recovery assessment</dt>
                <dd>
                  <code>{resolution.assessmentId}</code>
                </dd>
              </div>
              <div>
                <dt>Review member</dt>
                <dd>
                  <code>{resolution.returnContext.reviewMemberId}</code>
                </dd>
              </div>
              <div>
                <dt>Project thread</dt>
                <dd>
                  <code>
                    {resolution.returnContext.projectThreadRef.projectThreadId}
                  </code>
                  <span>
                    Revision{" "}
                    {resolution.returnContext.projectThreadRef.revision}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Review session</dt>
                <dd>
                  <code>
                    {resolution.returnContext.reviewSessionRef.reviewSessionId}
                  </code>
                  <span>
                    Revision{" "}
                    {resolution.returnContext.reviewSessionRef.revision}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Work task</dt>
                <dd>
                  <code>{resolution.returnContext.workUnitRef.workUnitId}</code>
                  <span>
                    Revision {resolution.returnContext.workUnitRef.revision}
                  </span>
                </dd>
              </div>
            </dl>
          </details>
        </div>
      )}

      {error === undefined ? null : (
        <StateNotice
          announce
          notice={{
            tone: "danger",
            title: "Review response was not confirmed",
            message: error,
            recovery:
              "The exact response remains retained. Reconnect and replay the run, then use Respond to retry the same response without inventing a new decision.",
          }}
        />
      )}
    </section>
  );
};
