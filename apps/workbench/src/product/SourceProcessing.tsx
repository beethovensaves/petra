import type { ProjectSourceProcessingClientResult } from "@petra/adapters";
import type {
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
} from "@petra/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { PetraButton } from "../design-system/primitives.js";
import { AgentControlPortal } from "./AgentControlPlane.js";
import {
  createSourceProcessingRequest,
  projectSourceProcessingClient,
  sourceProcessingErrorCode,
  sourceProcessingOutcomeUnknown,
  sourceProcessingPermissionLost,
  sourceProcessingStateChanged,
} from "./source-processing.js";

type SourceProcessingClient = Pick<
  ReturnType<typeof projectSourceProcessingClient>,
  "get" | "start" | "assessRecovery"
>;

interface ProcessingFailure {
  readonly kind: "permission" | "rejected" | "stale" | "unknown";
  readonly title: string;
  readonly message: string;
  readonly code?: string;
}

const words = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (first) => first.toLocaleUpperCase());

const unavailableCopy: Record<
  Extract<
    PetraProjectSourceProcessingView["processing"],
    { state: "unavailable" }
  >["reason"],
  { title: string; message: string }
> = {
  source_not_active: {
    title: "This source is not active",
    message:
      "Processing cannot start from a source that is no longer active in this Project.",
  },
  copy_not_available: {
    title: "The retained copy is unavailable",
    message:
      "Restore an authorized exact copy before starting processing Work.",
  },
  parse_not_permitted: {
    title: "Processing is not permitted",
    message:
      "The current rights decision does not permit parsing this exact copy.",
  },
  unsupported_source_format: {
    title: "This source format is not supported",
    message:
      "The registered processing family cannot parse this exact retained format.",
  },
  source_role_not_current: {
    title: "The Project source role changed",
    message:
      "Reconcile this source with a role in the current registered profile before processing it.",
  },
  representation_already_available: {
    title: "A representation is already available",
    message:
      "Inspect the retained representation below. Petra will not start duplicate processing Work.",
  },
};

const failureCopy = (error: unknown): ProcessingFailure => {
  const code = sourceProcessingErrorCode(error);
  if (sourceProcessingPermissionLost(error)) {
    return {
      kind: "permission",
      title: "Source processing access changed",
      message:
        "Petra can no longer start processing for this exact Project source. No success is assumed; the current Details task remains available.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceProcessingStateChanged(error)) {
    return {
      kind: "stale",
      title: "The source processing state changed",
      message:
        "Petra re-read the exact source, profile role, rights, and retained Work. Review the current state before taking another action.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceProcessingOutcomeUnknown(error)) {
    return {
      kind: "unknown",
      title: "Processing outcome not confirmed",
      message:
        "Petra did not receive a trustworthy result. Keep this exact request unchanged while Petra checks its durable effect.",
      ...(code === undefined ? {} : { code }),
    };
  }
  return {
    kind: "rejected",
    title: "Processing did not start",
    message:
      "Petra rejected the exact reviewed request. No processing Work was assumed or added.",
    ...(code === undefined ? {} : { code }),
  };
};

const workDestination = (
  projectId: string,
  workUnitId: string,
  taskReturnPath: string,
): string =>
  `/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(workUnitId)}?${new URLSearchParams(
    {
      return_to: taskReturnPath,
      return_label: "source processing",
      return_focus: "source-processing",
    },
  )}`;

const ProcessingState = ({
  view,
  taskReturnPath,
}: {
  view: PetraProjectSourceProcessingView;
  taskReturnPath: string;
}): React.JSX.Element | null => {
  if (view.processing.state === "ready") return null;
  if (view.processing.state === "unavailable") {
    const copy = unavailableCopy[view.processing.reason];
    return (
      <section
        className="source-processing-state source-processing-state--unavailable"
        aria-labelledby="source-processing-state-title"
      >
        <p className="reference-panel-kicker">Unavailable</p>
        <h3 id="source-processing-state-title">{copy.title}</h3>
        <p>{copy.message}</p>
      </section>
    );
  }
  const terminal = view.processing.state === "terminal";
  return (
    <section
      className="source-processing-state"
      aria-labelledby="source-processing-state-title"
    >
      <p className="reference-panel-kicker">
        {terminal ? "Processing Work retained" : "Processing Work active"}
      </p>
      <h3 id="source-processing-state-title">
        {terminal
          ? `Work is ${words(view.processing.work_unit_ref.state).toLocaleLowerCase()}`
          : `Work is ${view.processing.work_unit_ref.state}`}
      </h3>
      <p>
        {terminal
          ? "Inspect the retained task, its exact result destinations, and any available recovery."
          : "This source is already bound to one durable Work task. Open it for stages, required input, or recovery."}
      </p>
      <Link
        className="reference-primary-link"
        to={workDestination(
          view.project_id,
          view.processing.work_unit_ref.work_unit_id,
          taskReturnPath,
        )}
      >
        Open processing Work <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
};

const ProcessingReceipt = ({
  receipt,
  applied,
  taskReturnPath,
}: {
  receipt: PetraProjectSourceProcessingReceipt;
  applied: boolean;
  taskReturnPath: string;
}): React.JSX.Element => (
  <section
    className="source-processing-receipt"
    aria-labelledby="source-processing-receipt-title"
    role="status"
  >
    <p className="reference-panel-kicker">Durable receipt</p>
    <h3 id="source-processing-receipt-title">
      {applied ? "Processing Work started" : "Processing Work already retained"}
    </h3>
    <p>{receipt.effect.summary}</p>
    <dl>
      <div>
        <dt>Source binding</dt>
        <dd>
          Revision {receipt.expected.project_source_ref.revision} · exact active
          copy
        </dd>
      </div>
      <div>
        <dt>Work state</dt>
        <dd>{words(receipt.work_unit_ref.state)}</dd>
      </div>
      <div>
        <dt>Authority</dt>
        <dd>Source meaning and Project authority are unchanged</dd>
      </div>
    </dl>
    <div className="source-processing-actions">
      <Link
        className="reference-primary-link"
        to={workDestination(
          receipt.project_id,
          receipt.work_unit_ref.work_unit_id,
          taskReturnPath,
        )}
      >
        Open processing Work <span aria-hidden="true">→</span>
      </Link>
    </div>
    <details>
      <summary>Inspect durable identities</summary>
      <dl>
        <div>
          <dt>Receipt</dt>
          <dd>
            <code>{receipt.receipt_id}</code>
          </dd>
        </div>
        <div>
          <dt>Command</dt>
          <dd>
            <code>{receipt.command_id}</code>
          </dd>
        </div>
        <div>
          <dt>Idempotency</dt>
          <dd>
            <code>{receipt.idempotency_key}</code>
          </dd>
        </div>
        <div>
          <dt>Project source</dt>
          <dd>
            <code>{receipt.destination.project_source_id}</code>
          </dd>
        </div>
      </dl>
    </details>
  </section>
);

const recoveryHeading = (
  effect: PetraProjectSourceProcessingRecoveryView["effect"],
): string =>
  effect.state === "effect_confirmed"
    ? "Processing effect confirmed"
    : effect.state === "outcome_unknown"
      ? "Processing outcome is still unknown"
      : "Processing effect cannot be verified";

export const SourceProcessingPanel = ({
  projectId,
  projectSourceId,
  taskReturnPath,
  client,
}: {
  projectId: string;
  projectSourceId: string;
  taskReturnPath: string;
  client?: SourceProcessingClient;
}): React.JSX.Element => {
  const [resolvedClient] = useState<SourceProcessingClient>(
    () => client ?? projectSourceProcessingClient(),
  );
  const [view, setView] = useState<PetraProjectSourceProcessingView>();
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [activeRequest, setActiveRequest] =
    useState<PetraProjectSourceProcessingRequest>();
  const [failure, setFailure] = useState<ProcessingFailure>();
  const [receipt, setReceipt] = useState<PetraProjectSourceProcessingReceipt>();
  const [receiptApplied, setReceiptApplied] = useState(true);
  const [assessment, setAssessment] =
    useState<PetraProjectSourceProcessingRecoveryView>();
  const [assessing, setAssessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();
  const initiallyReadSource = useRef<string | undefined>(undefined);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadFailure(undefined);
    try {
      setView(await resolvedClient.get(projectId, projectSourceId));
    } catch {
      setView(undefined);
      setLoadFailure(
        "Petra could not read processing eligibility for this exact source. The source Details task remains unchanged.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, projectSourceId, resolvedClient]);

  useEffect(() => {
    const key = `${projectId}:${projectSourceId}`;
    if (initiallyReadSource.current === key) return;
    initiallyReadSource.current = key;
    void reload();
  }, [projectId, projectSourceId, reload]);

  const applyResult = (result: ProjectSourceProcessingClientResult): void => {
    setReceipt(result.receipt);
    setReceiptApplied(result.applied);
    setView(result.processing);
    setFailure(undefined);
    setAssessment(undefined);
    setActiveRequest(undefined);
  };

  const start = async (): Promise<void> => {
    if (view?.processing.state !== "ready") return;
    const request = createSourceProcessingRequest({ view });
    setActiveRequest(request);
    setStarting(true);
    setFailure(undefined);
    setAssessment(undefined);
    setRecoveryError(undefined);
    try {
      applyResult(
        await resolvedClient.start(projectId, projectSourceId, request),
      );
    } catch (error) {
      const nextFailure = failureCopy(error);
      setFailure(nextFailure);
      if (nextFailure.kind !== "unknown") setActiveRequest(undefined);
      if (nextFailure.kind === "stale" || nextFailure.kind === "permission") {
        await reload();
      }
    } finally {
      setStarting(false);
    }
  };

  const assess = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setAssessing(true);
    setRecoveryError(undefined);
    try {
      const nextAssessment = await resolvedClient.assessRecovery(
        projectId,
        projectSourceId,
        activeRequest,
      );
      setAssessment(nextAssessment);
      if (nextAssessment.effect.state === "effect_confirmed") {
        const confirmedReceipt = nextAssessment.effect.receipt;
        setReceipt(confirmedReceipt);
        setReceiptApplied(false);
        setFailure(undefined);
        setActiveRequest(undefined);
        setView((current) =>
          current === undefined
            ? current
            : {
                ...current,
                processing: {
                  state: "active",
                  work_unit_ref: {
                    work_unit_id: confirmedReceipt.work_unit_ref.work_unit_id,
                    revision: confirmedReceipt.work_unit_ref.revision,
                    spec_hash: confirmedReceipt.work_unit_ref.spec_hash,
                    state: confirmedReceipt.work_unit_ref.state,
                  },
                  work_detail_path: `/api/queries/projects/${projectId}/work/${confirmedReceipt.work_unit_ref.work_unit_id}`,
                  operations_path: `/api/queries/projects/${projectId}/work/${confirmedReceipt.work_unit_ref.work_unit_id}/operations`,
                },
              },
        );
      }
    } catch {
      setRecoveryError(
        "Petra could not check the durable effect. Keep this request unchanged and try the read-only check again.",
      );
    } finally {
      setAssessing(false);
    }
  };

  const retry = async (): Promise<void> => {
    if (activeRequest === undefined) return;
    setRetrying(true);
    setRecoveryError(undefined);
    try {
      applyResult(
        await resolvedClient.start(projectId, projectSourceId, activeRequest),
      );
    } catch (error) {
      const nextFailure = failureCopy(error);
      if (nextFailure.kind === "unknown") {
        setRecoveryError(
          "The exact retry still has no trustworthy result. Check the durable effect again before another action.",
        );
        setAssessment(undefined);
      } else {
        setFailure(nextFailure);
        setActiveRequest(undefined);
        setAssessment(undefined);
        if (nextFailure.kind === "stale" || nextFailure.kind === "permission") {
          await reload();
        }
      }
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section
      className="source-processing"
      id="source-processing"
      tabIndex={-1}
      aria-labelledby="source-processing-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Bounded Work</p>
          <h2 id="source-processing-title">Processing details</h2>
          <p>
            Inspect eligibility, representation, and limits for this exact
            Project source before starting any Work.
          </p>
        </div>
        {view === undefined ? null : (
          <span
            className="reference-status"
            data-state={
              view.processing.state === "ready" ? "ready" : "attention"
            }
          >
            {words(view.processing.state)}
          </span>
        )}
      </header>

      {loading ? <p role="status">Reading processing details…</p> : null}

      {loadFailure === undefined ? null : (
        <section
          className="source-processing-error"
          aria-labelledby="source-processing-load-error-title"
          role="alert"
        >
          <h3 id="source-processing-load-error-title">
            Processing details unavailable
          </h3>
          <p>{loadFailure}</p>
          <PetraButton variant="secondary" onClick={() => void reload()}>
            Re-read processing details
          </PetraButton>
        </section>
      )}

      {view === undefined ? null : (
        <>
          <dl className="source-processing-bindings">
            <div>
              <dt>Project profile</dt>
              <dd>{view.profile_binding.profile_label}</dd>
            </div>
            <div>
              <dt>Source role</dt>
              <dd>{view.profile_binding.source_role_label}</dd>
            </div>
            <div>
              <dt>Processing family</dt>
              <dd>{view.profile_binding.processing_family_label}</dd>
            </div>
          </dl>

          <section
            className="source-processing-representation"
            aria-labelledby="source-processing-representation-title"
          >
            <h3 id="source-processing-representation-title">
              Retained representation
            </h3>
            <dl>
              <div>
                <dt>Extent</dt>
                <dd>{view.representation.extent_label}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  {view.representation.source_format === undefined
                    ? "Not retained"
                    : words(view.representation.source_format)}
                </dd>
              </div>
              <div>
                <dt>Quality</dt>
                <dd>
                  {view.representation.quality_state === undefined
                    ? "Not assessed"
                    : words(view.representation.quality_state)}
                </dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>
                  {view.representation.page_count} pages ·{" "}
                  {view.representation.block_count} blocks ·{" "}
                  {view.representation.source_span_count} exact spans
                </dd>
              </div>
            </dl>
          </section>

          {receipt === undefined ? null : (
            <ProcessingReceipt
              receipt={receipt}
              applied={receiptApplied}
              taskReturnPath={taskReturnPath}
            />
          )}

          {failure === undefined ? null : (
            <section
              className="source-processing-error"
              aria-labelledby="source-processing-action-error-title"
              role="alert"
            >
              <h3 id="source-processing-action-error-title">{failure.title}</h3>
              <p>{failure.message}</p>
              {failure.code === undefined ? null : (
                <p>
                  <strong>Reference:</strong> {failure.code}
                </p>
              )}
            </section>
          )}

          {failure?.kind === "unknown" && activeRequest !== undefined ? (
            <section
              className="source-processing-recovery"
              aria-labelledby="source-processing-recovery-title"
            >
              <h3 id="source-processing-recovery-title">
                {assessment === undefined
                  ? "Check before trying again"
                  : recoveryHeading(assessment.effect)}
              </h3>
              {assessment?.effect.state === "outcome_unknown" ? (
                <p>
                  No durable receipt was observed at the assessment cutoff.
                  Retrying uses the same command and idempotency identities.
                </p>
              ) : assessment?.effect.state === "unavailable_to_verify" ? (
                <p>
                  This signed-in actor cannot verify the retained command. No
                  retry or success is assumed.
                </p>
              ) : (
                <p>
                  The check is read-only and keeps the reviewed request
                  unchanged.
                </p>
              )}
              <AgentControlPortal
                title="Recover source processing"
                description="Check the retained command effect before an exact retry."
                operationIds={["source.start-processing"]}
                objectRef={projectSourceId}
              >
                <div className="source-processing-actions">
                  <PetraButton
                    variant="secondary"
                    busy={assessing}
                    busyLabel="Checking processing effect"
                    onClick={() => void assess()}
                  >
                    Check processing effect
                  </PetraButton>
                  {assessment?.effect.state === "outcome_unknown" ? (
                    <PetraButton
                      variant="primary"
                      busy={retrying}
                      busyLabel="Retrying exact request"
                      onClick={() => void retry()}
                    >
                      Retry exact processing request
                    </PetraButton>
                  ) : null}
                </div>
              </AgentControlPortal>
              {recoveryError === undefined ? null : (
                <p className="source-processing-recovery__error" role="alert">
                  {recoveryError}
                </p>
              )}
            </section>
          ) : null}

          {view.processing.state === "ready" &&
          failure?.kind !== "unknown" &&
          receipt === undefined ? (
            <section
              className="source-processing-state"
              aria-labelledby="source-processing-ready-title"
            >
              <p className="reference-panel-kicker">Ready</p>
              <h3 id="source-processing-ready-title">
                Start bounded processing Work
              </h3>
              <p>
                Petra will bind one durable Work task to this exact copy,
                current Project definition, source role, and registered
                processing family. Processing does not endorse source meaning.
              </p>
              <AgentControlPortal
                title="Process this source"
                description="Start one bounded Work task from the selected copy and registered source role."
                operationIds={["source.start-processing"]}
                objectRef={projectSourceId}
              >
                <PetraButton
                  variant="primary"
                  busy={starting}
                  busyLabel="Starting processing Work"
                  onClick={() => void start()}
                >
                  Process source
                </PetraButton>
              </AgentControlPortal>
            </section>
          ) : (
            <ProcessingState view={view} taskReturnPath={taskReturnPath} />
          )}

          <section
            className="source-processing-limitations"
            aria-labelledby="source-processing-limitations-title"
          >
            <h3 id="source-processing-limitations-title">Processing limits</h3>
            <ul>
              {view.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>

          <details className="source-processing-exact">
            <summary>Inspect exact bindings</summary>
            <dl>
              <div>
                <dt>Project source</dt>
                <dd>
                  <code>{view.project_source_id}</code>
                </dd>
              </div>
              <div>
                <dt>Project profile family</dt>
                <dd>
                  <code>{view.profile_binding.definition_family}</code>
                </dd>
              </div>
              <div>
                <dt>Source role</dt>
                <dd>
                  <code>{view.profile_binding.source_role}</code>
                </dd>
              </div>
              <div>
                <dt>Processing contract</dt>
                <dd>
                  <code>
                    {view.profile_binding.processing_family_ref.contract.name}@
                    {
                      view.profile_binding.processing_family_ref.contract
                        .version
                    }
                  </code>
                </dd>
              </div>
            </dl>
          </details>
        </>
      )}
    </section>
  );
};
