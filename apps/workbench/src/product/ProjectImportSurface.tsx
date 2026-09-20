import { useRef, useState, type FormEvent } from "react";
import type {
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
} from "@petra/contracts";
import { Link, useNavigate } from "react-router";

import {
  PetraButton,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import type { ProjectRecord } from "./model.js";
import {
  assessProjectImportRecovery,
  createProjectImportCommandIdentity,
  createProjectImportCommandRequest,
  executeProjectImportRequest,
} from "./project-import.js";

const copiedMaterial: Record<
  PetraProjectImportCommandReceipt["material"]["copied"][number],
  string
> = {
  project_definition: "Project definition",
  focused_objective: "Focused objective",
};

const retainedMaterial: Record<
  PetraProjectImportCommandReceipt["material"]["retained_only"][number],
  string
> = {
  source_project_identity: "Original Project identity",
  source_history: "Original History",
  source_sources: "Original Sources",
  source_work: "Original Work",
  source_reviews: "Original Reviews",
};

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Petra could not complete the exact reviewed Project import.";

export const ProjectImportReceiptSummary = ({
  receipt,
  onOpen,
  recoveryConfirmed = false,
}: {
  receipt: PetraProjectImportCommandReceipt;
  onOpen: () => void;
  recoveryConfirmed?: boolean;
}): React.JSX.Element => (
  <section
    className="project-import-result"
    aria-labelledby={`project-import-result-${receipt.receipt_id}`}
    aria-live="polite"
  >
    <header>
      <p className="reference-panel-kicker">
        {recoveryConfirmed ? "Recovered exact effect" : "Retained ancestry"}
      </p>
      <h3 id={`project-import-result-${receipt.receipt_id}`}>
        Derived Project ready
      </h3>
      <p>
        Petra confirmed the reviewed copy and retained its exact ancestry. The
        original Project remains unchanged.
      </p>
    </header>

    <div className="project-import-material">
      <section aria-labelledby={`${receipt.receipt_id}-copied`}>
        <h4 id={`${receipt.receipt_id}-copied`}>Copied into the new Project</h4>
        <ul>
          {receipt.material.copied.map((item) => (
            <li key={item}>{copiedMaterial[item]}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={`${receipt.receipt_id}-retained`}>
        <h4 id={`${receipt.receipt_id}-retained`}>
          Stays with the original Project
        </h4>
        <ul>
          {receipt.material.retained_only.map((item) => (
            <li key={item}>{retainedMaterial[item]}</li>
          ))}
        </ul>
      </section>
    </div>

    <section aria-labelledby={`${receipt.receipt_id}-limits`}>
      <h4 id={`${receipt.receipt_id}-limits`}>Limits of this import</h4>
      <ul>
        {receipt.material.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>

    <details>
      <summary>Exact ancestry</summary>
      <dl className="project-import-identities">
        <div>
          <dt>Original Project</dt>
          <dd>
            <code>{receipt.source.project_ref.project_id}</code> · revision{" "}
            {receipt.source.project_ref.revision}
          </dd>
        </div>
        <div>
          <dt>Derived Project</dt>
          <dd>
            <code>{receipt.result.project_ref.project_id}</code> · revision{" "}
            {receipt.result.project_ref.revision}
          </dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{receipt.admission.reviewed_at}</dd>
        </div>
      </dl>
    </details>

    <PetraButton variant="primary" onClick={onOpen}>
      Open derived Project Brief
    </PetraButton>
  </section>
);

const recoveryHeading = (
  effect: PetraProjectImportCommandRecoveryView["content"]["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Import effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Import outcome still unknown"
      : "Import cannot be verified";

export const ProjectImportRecovery = ({
  request,
  failureMessage,
  onReceipt,
}: {
  request: PetraProjectImportCommandRequest;
  failureMessage: string;
  onReceipt: (receipt: PetraProjectImportCommandReceipt) => void;
}): React.JSX.Element => {
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<
    PetraProjectImportCommandRecoveryView | undefined
  >();
  const [assessing, setAssessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();

  const assess = async (): Promise<void> => {
    setAssessing(true);
    setRecoveryError(undefined);
    try {
      setAssessment(await assessProjectImportRecovery(request));
    } catch (error) {
      setRecoveryError(errorMessage(error));
    } finally {
      setAssessing(false);
    }
  };

  const retry = async (): Promise<void> => {
    setRetrying(true);
    setRecoveryError(undefined);
    try {
      onReceipt(await executeProjectImportRequest(request));
    } catch (error) {
      setRecoveryError(errorMessage(error));
    } finally {
      setRetrying(false);
    }
  };

  const content = assessment?.content;
  const action = content?.eligible_actions[0];
  const confirmedReceipt =
    content?.effect.state === "effect_confirmed"
      ? content.effect.receipt
      : undefined;

  return (
    <section
      className="project-import-recovery"
      aria-labelledby="import-failed"
    >
      <div className="project-profile-command__error" role="alert">
        <strong id="import-failed">Import outcome not confirmed.</strong>{" "}
        {failureMessage}
        <span>
          Petra kept the exact reviewed request in this browser session. Check
          the retained effect before retrying or opening another Project.
        </span>
      </div>

      {content === undefined ? (
        <div className="project-recovery__check">
          <PetraButton
            variant="secondary"
            busy={assessing}
            busyLabel="Checking import"
            onClick={() => void assess()}
          >
            Check import effect
          </PetraButton>
          <p>
            This read reconciles the retained command and idempotency identities
            without sending the import command again.
          </p>
        </div>
      ) : confirmedReceipt !== undefined ? (
        <ProjectImportReceiptSummary
          receipt={confirmedReceipt}
          recoveryConfirmed
          onOpen={() =>
            void navigate(
              `/projects/${confirmedReceipt.destination.project_id}/brief`,
            )
          }
        />
      ) : (
        <div
          className="project-import-recovery__assessment"
          data-state={content.effect.state}
          aria-live="polite"
        >
          <header>
            <p className="reference-panel-kicker">Recovery assessment</p>
            <h3>{recoveryHeading(content.effect)}</h3>
            <p>{content.effect.meaning}</p>
            <p className="project-recovery__cutoff">
              Observed through {content.observation_cutoff}
            </p>
          </header>

          <section aria-labelledby="project-import-recovery-limits">
            <h4 id="project-import-recovery-limits">Limits of this check</h4>
            <ul>
              {content.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>

          {action?.operation !== "retry_exact_command" ? null : (
            <section className="project-recovery__action">
              <h4>Eligible action</h4>
              <p>{action.reason}</p>
              <PetraButton
                variant="primary"
                busy={retrying}
                busyLabel="Retrying exact import"
                onClick={() => void retry()}
              >
                Retry exact import
              </PetraButton>
            </section>
          )}

          <section className="project-recovery__return">
            <h4>
              {content.return.state === "exact"
                ? "Exact return"
                : "Safe return"}
            </h4>
            <p>{content.return.reason}</p>
            {content.return.destination.place_role === "brief" ? (
              <Link
                to={`/projects/${content.return.destination.project_id}/brief`}
              >
                Return to derived Project Brief
              </Link>
            ) : (
              <Link to="/">Return to Projects</Link>
            )}
          </section>
        </div>
      )}

      {recoveryError === undefined ? null : (
        <p className="project-recovery__failure" role="alert">
          <strong>Recovery did not finish.</strong> {recoveryError} The exact
          reviewed request remains available for another assessment.
        </p>
      )}
    </section>
  );
};

type RetainedImportRequest = {
  readonly fingerprint: string;
  readonly request: PetraProjectImportCommandRequest;
};

export const ProjectImportPanel = ({
  projects,
  onCancel,
}: {
  projects: ProjectRecord[];
  onCancel: () => void;
}): React.JSX.Element => {
  const navigate = useNavigate();
  const importableProjects = projects.filter(
    (project) => project.importBinding !== undefined,
  );
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [retainedRequest, setRetainedRequest] =
    useState<PetraProjectImportCommandRequest>();
  const [receipt, setReceipt] = useState<PetraProjectImportCommandReceipt>();
  const retained = useRef<RetainedImportRequest | undefined>(undefined);
  const selected = importableProjects.find(
    (project) => project.id === selectedId,
  );

  const clearOutcome = (): void => {
    setError(undefined);
    setReceipt(undefined);
  };

  const selectProject = (project: ProjectRecord): void => {
    setSelectedId(project.id);
    if (name.trim().length === 0) setName(`Derived from ${project.title}`);
    setReviewed(false);
    clearOutcome();
  };

  const publishReceipt = (
    nextReceipt: PetraProjectImportCommandReceipt,
  ): void => {
    setReceipt(nextReceipt);
    setError(undefined);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (selected?.importBinding === undefined || !reviewed) return;
    const fingerprint = JSON.stringify({
      source: selected.importBinding,
      name: name.trim(),
      description: description.trim(),
    });
    let request: PetraProjectImportCommandRequest;
    if (retained.current?.fingerprint === fingerprint) {
      request = retained.current.request;
    } else {
      const identity = createProjectImportCommandIdentity();
      request = createProjectImportCommandRequest({
        source: selected.importBinding,
        project: {
          name: name.trim(),
          ...(description.trim().length === 0
            ? {}
            : { description: description.trim() }),
        },
        reviewedAt: new Date().toISOString(),
        commandId: identity.commandId,
        idempotencyKey: identity.idempotencyKey,
      });
      retained.current = { fingerprint, request };
    }
    setRetainedRequest(request);
    setBusy(true);
    setError(undefined);
    try {
      publishReceipt(await executeProjectImportRequest(request));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="project-profile-command project-import-command"
      aria-labelledby="import-project-title"
    >
      <header>
        <p className="reference-panel-kicker">Reviewed Project reuse</p>
        <h2 id="import-project-title">Import a retained Project</h2>
        <p>
          Create a separate Project from one exact retained definition and
          focused objective. Petra keeps the original identity, History,
          Sources, Work, and Reviews with the original Project.
        </p>
      </header>

      {receipt === undefined ? (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset className="project-import-source-choice">
            <legend>Choose the exact retained Project</legend>
            <p>
              The binding below comes from the current server-owned Project
              revision. A changed revision or hash is rejected before copying.
            </p>
            <div>
              {importableProjects.map((project) => (
                <label
                  key={project.id}
                  data-selected={project.id === selectedId || undefined}
                >
                  <input
                    type="radio"
                    name="project-import-source"
                    value={project.id}
                    checked={project.id === selectedId}
                    onChange={() => selectProject(project)}
                  />
                  <span>
                    <strong>{project.title}</strong>
                    <span>
                      {project.profile.label} · Project revision{" "}
                      {project.importBinding?.projectRevision}
                    </span>
                    <span>{project.objective}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {selected?.importBinding === undefined ? null : (
            <section
              className="project-import-admission"
              aria-labelledby="project-import-admission-title"
            >
              <header>
                <p className="reference-panel-kicker">Admission review</p>
                <h3 id="project-import-admission-title">
                  One bounded copy into a new Project
                </h3>
                <p>
                  This action preserves the original Project without
                  modification. It does not merge histories or transfer Work,
                  Sources, or Reviews.
                </p>
              </header>
              <div className="project-import-material">
                <section>
                  <h4>Copied</h4>
                  <ul>
                    <li>Project definition revision</li>
                    <li>Focused objective revision</li>
                  </ul>
                </section>
                <section>
                  <h4>Retained only in the original</h4>
                  <ul>
                    <li>Project identity and History</li>
                    <li>Sources, Work, and Reviews</li>
                  </ul>
                </section>
              </div>
              <details>
                <summary>Inspect exact source binding</summary>
                <dl className="project-import-identities">
                  <div>
                    <dt>Project</dt>
                    <dd>
                      <code>{selected.importBinding.projectId}</code> · revision{" "}
                      {selected.importBinding.projectRevision}
                    </dd>
                  </div>
                  <div>
                    <dt>Definition</dt>
                    <dd>
                      <code>
                        {
                          selected.importBinding.projectDefinitionRef
                            .projectDefinitionId
                        }
                      </code>{" "}
                      · revision{" "}
                      {selected.importBinding.projectDefinitionRef.revision}
                    </dd>
                  </div>
                  <div>
                    <dt>Focused objective</dt>
                    <dd>
                      <code>
                        {selected.importBinding.focusedObjectiveRef.objectiveId}
                      </code>{" "}
                      · revision{" "}
                      {selected.importBinding.focusedObjectiveRef.revision}
                    </dd>
                  </div>
                </dl>
              </details>
            </section>
          )}

          <div className="project-profile-command__fields">
            <PetraTextField
              label="New Project name"
              required
              maxLength={240}
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setReviewed(false);
                clearOutcome();
              }}
            />
            <PetraTextArea
              label="New Project description"
              hint="Optional context for recognizing the derived Project."
              rows={3}
              maxLength={4_000}
              value={description}
              onChange={(event) => {
                setDescription(event.currentTarget.value);
                setReviewed(false);
                clearOutcome();
              }}
            />
          </div>

          <label className="project-profile-command__confirmation">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.currentTarget.checked)}
            />
            <span>
              I reviewed the exact source binding and understand that only the
              definition and focused objective are copied into a separate
              Project.
            </span>
          </label>

          {error === undefined || retainedRequest === undefined ? null : (
            <ProjectImportRecovery
              key={retainedRequest.command_id}
              request={retainedRequest}
              failureMessage={error}
              onReceipt={publishReceipt}
            />
          )}

          <div className="project-profile-command__actions">
            <PetraButton
              type="submit"
              variant="primary"
              busy={busy}
              busyLabel="Importing Project"
              {...(selected?.importBinding === undefined
                ? {
                    unavailable: {
                      reason:
                        "Choose one retained Project with a current focus.",
                    },
                  }
                : name.trim().length === 0
                  ? { unavailable: { reason: "Name the derived Project." } }
                  : !reviewed
                    ? {
                        unavailable: {
                          reason: "Review and confirm the bounded copy first.",
                        },
                      }
                    : {})}
            >
              Import as new Project
            </PetraButton>
            <PetraButton type="button" variant="quiet" onClick={onCancel}>
              Cancel
            </PetraButton>
          </div>
        </form>
      ) : (
        <ProjectImportReceiptSummary
          receipt={receipt}
          onOpen={() =>
            void navigate(`/projects/${receipt.destination.project_id}/brief`)
          }
        />
      )}
    </section>
  );
};

export const projectImportAvailability = (
  projects: readonly ProjectRecord[],
): { reason: string; prerequisite: string } | undefined =>
  projects.some((project) => project.importBinding !== undefined)
    ? undefined
    : {
        reason: "No retained Project with an exact current focus is available.",
        prerequisite:
          "A server-owned Project revision with a retained definition and focused objective.",
      };
