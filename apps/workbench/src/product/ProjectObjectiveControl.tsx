import { useState, type FormEvent } from "react";
import type {
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
  PetraProjectObjectiveCommandRequest,
} from "@petra/contracts";
import { useNavigate } from "react-router";

import { PetraButton, PetraTextArea } from "../design-system/primitives.js";
import {
  assessProjectObjectiveCommandRecovery,
  createProjectObjectiveCommandRequest,
  executeProjectObjectiveCommand,
  projectObjectiveCommandFailureKind,
  type ProjectObjectiveCommandContext,
  type ProjectObjectiveCommandFailureKind,
} from "./project-objective-command.js";

export interface ProjectObjectiveReturnOutcome {
  readonly state: "applied" | "replayed" | "recovered";
  readonly operation: "frame" | "revise";
  readonly summary: string;
  readonly statement: string;
}

const failureTitle = (kind: ProjectObjectiveCommandFailureKind): string =>
  kind === "conflict"
    ? "Command identity conflict"
    : kind === "stale"
      ? "Objective review is stale"
      : kind === "permission_lost"
        ? "Permission changed"
        : kind === "invalid"
          ? "Objective was not applied"
          : "Objective outcome is unknown";

const recoveryTitle = (
  effect: PetraProjectObjectiveCommandRecoveryView["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Outcome still unknown"
      : effect.reason === "command_identity_conflict"
        ? "Command identity conflict"
        : "Unable to verify this command";

const outcomeFor = (
  receipt: PetraProjectObjectiveCommandReceipt,
  state: ProjectObjectiveReturnOutcome["state"],
): ProjectObjectiveReturnOutcome => ({
  state,
  operation: receipt.operation,
  summary: receipt.effect.summary,
  statement: receipt.review.proposed_statement,
});

export const ProjectObjectiveOutcome = ({
  outcome,
}: {
  outcome: ProjectObjectiveReturnOutcome;
}): React.JSX.Element => (
  <section
    className="brief-objective-outcome"
    aria-labelledby="brief-objective-outcome-title"
    aria-live="polite"
    data-outcome={outcome.state}
  >
    <p className="reference-panel-kicker">Reviewed Project effect</p>
    <h2 id="brief-objective-outcome-title">
      {outcome.state === "applied"
        ? `Objective ${outcome.operation === "frame" ? "framed" : "revised"}`
        : outcome.state === "replayed"
          ? "Exact command replayed"
          : "Objective effect recovered"}
    </h2>
    <p>{outcome.summary}</p>
    <p>
      <strong>Current focus:</strong> {outcome.statement}
    </p>
  </section>
);

export const ProjectObjectiveControl = ({
  context,
}: {
  context: ProjectObjectiveCommandContext;
}): React.JSX.Element => {
  const navigate = useNavigate();
  const operation = context.focus.state === "none" ? "frame" : "revise";
  const currentStatement =
    context.focus.state === "focused"
      ? context.focus.objective.content.statement
      : "";
  const [open, setOpen] = useState(false);
  const [roughStatement, setRoughStatement] = useState(currentStatement);
  const [proposedStatement, setProposedStatement] = useState(currentStatement);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<"apply" | "assess" | "retry">();
  const [retainedRequest, setRetainedRequest] =
    useState<PetraProjectObjectiveCommandRequest>();
  const [failure, setFailure] = useState<{
    kind: ProjectObjectiveCommandFailureKind;
    message: string;
  }>();
  const [recovery, setRecovery] =
    useState<PetraProjectObjectiveCommandRecoveryView>();

  const edited = (): void => {
    setReviewed(false);
    setRetainedRequest(undefined);
    setFailure(undefined);
    setRecovery(undefined);
  };

  const returnToBrief = async (
    receipt: PetraProjectObjectiveCommandReceipt,
    state: ProjectObjectiveReturnOutcome["state"],
  ): Promise<void> => {
    await navigate(
      `/projects/${encodeURIComponent(receipt.destination.project_id)}/brief#brief-focus`,
      {
        state: { objectiveCommandOutcome: outcomeFor(receipt, state) },
      },
    );
  };

  const execute = async (
    request: PetraProjectObjectiveCommandRequest,
    progress: "apply" | "retry",
  ): Promise<void> => {
    setBusy(progress);
    setFailure(undefined);
    try {
      const result = await executeProjectObjectiveCommand(
        context.projectId,
        request,
      );
      await returnToBrief(
        result.receipt,
        result.applied ? "applied" : "replayed",
      );
    } catch (error) {
      setFailure({
        kind: projectObjectiveCommandFailureKind(error),
        message:
          error instanceof Error
            ? error.message
            : "The reviewed Objective outcome is unknown.",
      });
    } finally {
      setBusy(undefined);
    }
  };

  const apply = async (): Promise<void> => {
    let request = retainedRequest;
    if (request === undefined) {
      try {
        request = createProjectObjectiveCommandRequest({
          context,
          roughStatement,
          proposedStatement,
        });
      } catch (error) {
        setFailure({
          kind: "invalid",
          message:
            error instanceof Error
              ? error.message
              : "The reviewed Objective request is invalid.",
        });
        return;
      }
      setRetainedRequest(request);
    }
    await execute(request, "apply");
  };

  const assess = async (): Promise<void> => {
    if (retainedRequest === undefined) return;
    setBusy("assess");
    try {
      const assessment = await assessProjectObjectiveCommandRecovery(
        context.projectId,
        retainedRequest,
      );
      setRecovery(assessment);
      if (assessment.effect.state === "effect_confirmed") {
        await returnToBrief(assessment.effect.receipt, "recovered");
      }
    } catch (error) {
      setFailure({
        kind: projectObjectiveCommandFailureKind(error),
        message:
          error instanceof Error
            ? error.message
            : "Petra could not assess this exact Objective command.",
      });
    } finally {
      setBusy(undefined);
    }
  };

  const review = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      roughStatement.trim().length === 0 ||
      proposedStatement.trim().length === 0
    ) {
      setFailure({
        kind: "invalid",
        message: "Both the rough intent and proposed Objective are required.",
      });
      return;
    }
    setFailure(undefined);
    setReviewed(true);
  };

  const retryAvailable = recovery?.effect.state === "outcome_unknown";

  return (
    <div className="brief-objective-control" data-operation={operation}>
      {!open ? (
        <PetraButton variant="secondary" onClick={() => setOpen(true)}>
          {operation === "frame" ? "Frame objective" : "Revise objective"}
        </PetraButton>
      ) : (
        <form onSubmit={review} aria-labelledby="brief-objective-editor-title">
          <header>
            <p className="reference-panel-kicker">Reviewed Project command</p>
            <h3 id="brief-objective-editor-title">
              {operation === "frame"
                ? "Frame the objective"
                : "Revise the objective"}
            </h3>
            <p>
              Keep your rough intent beside the exact wording you want to make
              the active {context.focus.term.toLocaleLowerCase()}. Petra will
              recheck the Project, profile, and current focus when you apply it.
            </p>
          </header>
          <div className="brief-objective-control__fields">
            <PetraTextArea
              label={
                operation === "frame" ? "Rough intent" : "Current objective"
              }
              hint={
                operation === "frame"
                  ? "Your working wording is retained in this exact reviewed command."
                  : "The exact current wording is fixed as the rough statement for this revision."
              }
              required
              readOnly={operation === "revise"}
              rows={3}
              maxLength={4_000}
              value={roughStatement}
              onChange={(event) => {
                if (operation === "revise") return;
                edited();
                setRoughStatement(event.currentTarget.value);
              }}
            />
            <PetraTextArea
              label="Proposed objective"
              hint={`Write the exact ${context.focus.term.toLocaleLowerCase()} that should become the Project focus.`}
              required
              rows={4}
              maxLength={4_000}
              value={proposedStatement}
              onChange={(event) => {
                edited();
                setProposedStatement(event.currentTarget.value);
              }}
            />
          </div>
          {reviewed ? (
            <section
              className="brief-objective-review"
              aria-labelledby="brief-objective-review-title"
            >
              <p className="reference-panel-kicker">Ready for your decision</p>
              <h4 id="brief-objective-review-title">Review exact wording</h4>
              <dl>
                <div>
                  <dt>
                    {operation === "frame"
                      ? "Rough intent"
                      : "Current objective"}
                  </dt>
                  <dd>{roughStatement}</dd>
                </div>
                <div>
                  <dt>Proposed {context.focus.term}</dt>
                  <dd>{proposedStatement}</dd>
                </div>
              </dl>
              <p>
                Applying creates a new focused Objective revision. It does not
                approve findings, start Work, or change profile authority.
              </p>
            </section>
          ) : null}
          {failure === undefined ? null : (
            <section
              className="brief-objective-failure"
              role="alert"
              data-failure={failure.kind}
            >
              <strong>{failureTitle(failure.kind)}</strong>
              <span>{failure.message}</span>
              <span>
                Your rough intent, proposal, and exact command identity remain
                here. Check the effect before any retry.
              </span>
            </section>
          )}
          {recovery === undefined ||
          recovery.effect.state === "effect_confirmed" ? null : (
            <section
              className="brief-objective-recovery"
              aria-live="polite"
              data-recovery={recovery.effect.state}
            >
              <strong>{recoveryTitle(recovery.effect)}</strong>
              <span>
                {recovery.effect.state === "outcome_unknown"
                  ? "No matching receipt was observed at the recovery cutoff. The same exact request may be retried."
                  : recovery.effect.reason === "command_identity_conflict"
                    ? "This identity belongs to different request material. Petra will not retry it."
                    : "The authenticated actor does not own the matching command receipt."}
              </span>
              {recovery.return.state === "safe_fallback" ? (
                <span>{recovery.return.reason}</span>
              ) : null}
            </section>
          )}
          <div className="brief-objective-control__actions">
            {!reviewed ? (
              <PetraButton type="submit" variant="secondary">
                Review proposed objective
              </PetraButton>
            ) : (
              <PetraButton
                variant="primary"
                busy={busy === "apply"}
                busyLabel="Applying reviewed objective"
                onClick={() => void apply()}
              >
                Apply reviewed objective
              </PetraButton>
            )}
            {retainedRequest === undefined ? null : (
              <PetraButton
                variant="secondary"
                busy={busy === "assess"}
                busyLabel="Checking exact outcome"
                onClick={() => void assess()}
              >
                Check exact command outcome
              </PetraButton>
            )}
            {!retryAvailable || retainedRequest === undefined ? null : (
              <PetraButton
                variant="secondary"
                busy={busy === "retry"}
                busyLabel="Retrying exact command"
                onClick={() => void execute(retainedRequest, "retry")}
              >
                Retry exact command
              </PetraButton>
            )}
            <PetraButton
              variant="quiet"
              onClick={() => setOpen(false)}
              {...(busy === undefined
                ? {}
                : { unavailable: { reason: "Wait for the current request." } })}
            >
              Close editor
            </PetraButton>
          </div>
        </form>
      )}
    </div>
  );
};

export const ProjectObjectiveEmptyBrief = ({
  context,
  outcome,
}: {
  context: ProjectObjectiveCommandContext;
  outcome?: ProjectObjectiveReturnOutcome;
}): React.JSX.Element => (
  <main className="reference-surface live-project-brief" id="reference-main">
    <header className="brief-heading">
      <div>
        <p className="reference-eyebrow">{context.projectName}</p>
        <h1>Brief</h1>
        <p className="reference-lede">
          Frame the first Project focus before continuing into task-specific
          Brief sections.
        </p>
      </div>
    </header>
    <div className="brief-position" aria-label="Current Brief position">
      <span>{context.definitionLabel}</span>
      <span data-state="partial">Focus not framed</span>
    </div>
    {outcome === undefined ? null : (
      <ProjectObjectiveOutcome outcome={outcome} />
    )}
    <section
      className="brief-section brief-focus"
      aria-labelledby="brief-focus"
    >
      <p className="reference-panel-kicker">Orientation</p>
      <h2 id="brief-focus">Current focus</h2>
      <p className="brief-focus__statement">
        No current {context.focus.term.toLocaleLowerCase()} is selected.
      </p>
      <p>
        Frame exact wording through the reviewed command below. Profile terms
        and Project authority remain server-owned.
      </p>
      <ProjectObjectiveControl context={context} />
    </section>
  </main>
);
