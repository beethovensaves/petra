import type { ProjectSourceLinkRemovalClientResult } from "@petra/adapters";
import type {
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router";

import { PetraButton, PetraTextArea } from "../design-system/primitives.js";
import {
  SourceLocalCopyDeletionAction,
  type SourceLocalCopyDeletionClient,
} from "./SourceLocalCopyDeletion.js";
import {
  createSourceLinkRemovalRequest,
  projectSourceLinkRemovalClient,
  sourceLinkRemovalConflict,
  sourceLinkRemovalErrorCode,
  sourceLinkRemovalOutcomeUnknown,
  sourceLinkRemovalPermissionLost,
} from "./source-link-removal.js";

export type SourceLinkRemovalClient = Pick<
  ReturnType<typeof projectSourceLinkRemovalClient>,
  "preview" | "remove" | "assessRecovery"
>;

interface RemovalFailure {
  readonly kind: "permission" | "conflict" | "rejected" | "unknown";
  readonly title: string;
  readonly message: string;
  readonly code?: string;
}

interface RemovalOutcome {
  readonly receipt: PetraProjectSourceLinkRemovalReceipt;
  readonly applied?: boolean;
  readonly recovered: boolean;
}

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const removalFailure = (error: unknown): RemovalFailure => {
  const code = sourceLinkRemovalErrorCode(error);
  if (sourceLinkRemovalPermissionLost(error)) {
    return {
      kind: "permission",
      title: "Source access changed",
      message:
        "The signed-in actor is no longer authorized to remove this exact Project link. Petra did not assume an effect.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceLinkRemovalConflict(error)) {
    return {
      kind: "conflict",
      title: "The Project or source changed",
      message:
        "Petra rejected the stale reviewed preview. Re-read the exact Project, profile definition, and source before deciding again.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceLinkRemovalOutcomeUnknown(error)) {
    return {
      kind: "unknown",
      title: "Removal outcome not confirmed",
      message:
        "Petra did not receive a trustworthy result. Keep this exact reason and request identity while Petra checks the durable effect.",
      ...(code === undefined ? {} : { code }),
    };
  }
  return {
    kind: "rejected",
    title: "Source link was not removed",
    message:
      "Petra rejected this exact request. Ordinary Project use and the retained source remain unchanged.",
    ...(code === undefined ? {} : { code }),
  };
};

const impactLabels: Record<
  PetraProjectSourceLinkRemovalPreview["impact"]["groups"][number]["group_kind"],
  string
> = {
  parsed_documents: "Parsed documents",
  structural_blocks: "Structural blocks",
  source_spans: "Exact source spans",
  claims: "Claims",
  assertions: "Assertions",
  active_work: "Active Work",
  open_reviews: "Open Reviews",
  grounded_responses: "Grounded Petra responses",
};

const retentionLabels: Record<
  PetraProjectSourceLinkRemovalPreview["retention"][number]["area"],
  string
> = {
  project_source_history: "Immutable Project-link revisions",
  canonical_identity: "Global source identity",
  selected_work_version: "Selected source version",
  artifact_manifest: "Copy manifest",
  local_artifact: "Local copy",
  parsed_representation: "Parsed representation",
  provenance: "Provenance",
};

const RecoveryResult = ({
  recovery,
  retrying,
  onRetry,
}: {
  recovery: PetraProjectSourceLinkRemovalRecoveryView;
  retrying: boolean;
  onRetry: () => void;
}): React.JSX.Element => {
  if (recovery.effect.state === "outcome_unknown") {
    return (
      <section
        className="source-link-removal-message source-link-removal-message--caution"
        aria-labelledby="source-link-removal-recovery-title"
      >
        <p className="reference-panel-kicker">Durable recovery</p>
        <h4 id="source-link-removal-recovery-title">
          Removal outcome is still unknown
        </h4>
        <p>
          No owned receipt was observed at the recovery cutoff. Retry the exact
          request; Petra will apply it once or return its retained result.
        </p>
        <PetraButton
          variant="primary"
          busy={retrying}
          busyLabel="Retrying exact removal"
          onClick={onRetry}
        >
          Retry exact removal
        </PetraButton>
      </section>
    );
  }
  if (recovery.effect.state === "unavailable_to_verify") {
    return (
      <section
        className="source-link-removal-message source-link-removal-message--caution"
        aria-labelledby="source-link-removal-recovery-title"
      >
        <p className="reference-panel-kicker">Recovery unavailable</p>
        <h4 id="source-link-removal-recovery-title">
          Petra cannot verify this request identity
        </h4>
        <p>
          {recovery.effect.reason === "command_identity_conflict"
            ? "The command identity is retained for different input. Re-open the source and start a new reviewed request."
            : "The retained command belongs to another authenticated actor. No result is exposed or assumed."}
        </p>
      </section>
    );
  }
  return <></>;
};

const RemovalReceipt = ({
  outcome,
  taskReturnPath,
  onReturnFocus,
}: {
  outcome: RemovalOutcome;
  taskReturnPath: string;
  onReturnFocus: () => void;
}): React.JSX.Element => {
  const { receipt } = outcome;
  const title = outcome.recovered
    ? "Removal effect confirmed"
    : outcome.applied
      ? "Removed from this Project"
      : "Already removed from this Project";
  return (
    <section
      className="source-link-removal-receipt"
      data-removal-outcome={
        outcome.recovered
          ? "recovered"
          : outcome.applied
            ? "applied"
            : "replayed"
      }
      aria-labelledby="source-link-removal-receipt-title"
      role="status"
    >
      <p className="reference-panel-kicker">
        {outcome.recovered
          ? "Durable effect recovered"
          : outcome.applied
            ? "Applied once"
            : "Retained result replayed"}
      </p>
      <h4 id="source-link-removal-receipt-title">{title}</h4>
      <p>{receipt.effect.summary}</p>
      <dl>
        <div>
          <dt>Project use</dt>
          <dd>Ordinary new use is disabled</dd>
        </div>
        <div>
          <dt>Source revision</dt>
          <dd>
            r{receipt.prior_source_ref.revision} active → r
            {receipt.resulting_source_ref.revision} excluded
          </dd>
        </div>
        <div>
          <dt>What remains</dt>
          <dd>
            Global identity, immutable revisions, dependents, and provenance
          </dd>
        </div>
        <div>
          <dt>Local copy</dt>
          <dd>Retained · not deleted</dd>
        </div>
      </dl>
      <details>
        <summary>Inspect durable receipt and recovery</summary>
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
            <dt>Recovery</dt>
            <dd>{receipt.recovery.inverse_command_name}</dd>
          </div>
        </dl>
      </details>
      <div className="source-link-removal-actions">
        <Link className="reference-primary-link" to={taskReturnPath}>
          Return to the exact source task
        </Link>
        <PetraButton variant="secondary" onClick={onReturnFocus}>
          Keep inspecting this source
        </PetraButton>
      </div>
    </section>
  );
};

export const SourceLinkRemovalActions = ({
  projectId,
  projectSourceId,
  sourceTitle,
  sourceRole,
  sourceRoleId,
  taskReturnPath,
  available = true,
  client,
  localCopyDeletionClient,
  onRemoved,
  onLocalCopyDeleted,
}: {
  projectId: string;
  projectSourceId: string;
  sourceTitle: string;
  sourceRole: string;
  sourceRoleId?: string;
  taskReturnPath: string;
  available?: boolean;
  client?: SourceLinkRemovalClient;
  localCopyDeletionClient?: SourceLocalCopyDeletionClient;
  onRemoved?: () => void | Promise<void>;
  onLocalCopyDeleted?: () => void | Promise<void>;
}): React.JSX.Element => {
  const removalClient = useMemo(
    () => client ?? projectSourceLinkRemovalClient(),
    [client],
  );
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] =
    useState<PetraProjectSourceLinkRemovalPreview>();
  const [previewFailure, setPreviewFailure] = useState<string>();
  const [reason, setReason] = useState("");
  const [request, setRequest] =
    useState<PetraProjectSourceLinkRemovalRequest>();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<RemovalFailure>();
  const [outcome, setOutcome] = useState<RemovalOutcome>();
  const [recovery, setRecovery] =
    useState<PetraProjectSourceLinkRemovalRecoveryView>();
  const [recoveryFailure, setRecoveryFailure] = useState<string>();

  const loadPreview = useCallback(async (): Promise<void> => {
    setLoadingPreview(true);
    setPreviewFailure(undefined);
    setFailure(undefined);
    setRecovery(undefined);
    setOutcome(undefined);
    try {
      setPreview(await removalClient.preview(projectId, projectSourceId));
    } catch (error) {
      setPreview(undefined);
      setPreviewFailure(
        errorMessage(
          error,
          "Petra could not load the exact Project-link removal preview.",
        ),
      );
    } finally {
      setLoadingPreview(false);
    }
  }, [projectId, projectSourceId, removalClient]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  const closeAndFocus = (): void => {
    setOpen(false);
    globalThis.requestAnimationFrame?.(() =>
      document
        .querySelector<HTMLElement>("#source-link-removal-trigger")
        ?.focus(),
    );
  };

  const execute = async (
    exactRequest: PetraProjectSourceLinkRemovalRequest,
  ): Promise<void> => {
    setSubmitting(true);
    setFailure(undefined);
    setRecovery(undefined);
    setRecoveryFailure(undefined);
    try {
      const result: ProjectSourceLinkRemovalClientResult =
        await removalClient.remove(projectId, projectSourceId, exactRequest);
      setOutcome({
        receipt: result.receipt,
        applied: result.applied,
        recovered: false,
      });
      void onRemoved?.();
    } catch (error) {
      setFailure(removalFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (preview === undefined) return;
    try {
      const nextRequest = createSourceLinkRemovalRequest({ preview, reason });
      setRequest(nextRequest);
      void execute(nextRequest);
    } catch (error) {
      setFailure({
        kind: "rejected",
        title: "A removal reason is required",
        message: errorMessage(error, "Review the required removal reason."),
      });
    }
  };

  const assessRecovery = async (): Promise<void> => {
    if (request === undefined) return;
    setSubmitting(true);
    setRecoveryFailure(undefined);
    try {
      const assessment = await removalClient.assessRecovery(
        projectId,
        projectSourceId,
        request,
      );
      setRecovery(assessment);
      if (assessment.effect.state === "effect_confirmed") {
        setOutcome({ receipt: assessment.effect.receipt, recovered: true });
        setFailure(undefined);
        void onRemoved?.();
      }
    } catch (error) {
      setRecoveryFailure(
        errorMessage(
          error,
          "Petra could not assess this exact removal request.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retryExact = (): void => {
    if (request !== undefined) void execute(request);
  };

  return (
    <div className="source-link-removal">
      <div
        className="source-link-removal-actions source-link-removal-actions--entry"
        role="group"
        aria-label="Source retention actions"
      >
        <PetraButton
          id="source-link-removal-trigger"
          variant="danger"
          onClick={() => {
            setOpen(true);
            if (preview === undefined && !loadingPreview) void loadPreview();
          }}
          {...(available
            ? {}
            : {
                unavailable: {
                  reason: "This source link is not active in the Project.",
                  prerequisite:
                    "An exact active Project source link owned by the current Project and profile definition.",
                },
              })}
        >
          Remove from Project
        </PetraButton>
        <SourceLocalCopyDeletionAction
          projectId={projectId}
          projectSourceId={projectSourceId}
          sourceTitle={sourceTitle}
          taskReturnPath={taskReturnPath}
          {...(localCopyDeletionClient === undefined
            ? {}
            : { client: localCopyDeletionClient })}
          {...(onLocalCopyDeleted === undefined
            ? {}
            : { onDeleted: onLocalCopyDeleted })}
        />
      </div>

      {open ? (
        <section
          className="source-link-removal-panel"
          tabIndex={-1}
          ref={panelRef}
          aria-labelledby="source-link-removal-title"
        >
          <header>
            <div>
              <p className="reference-panel-kicker">Project source boundary</p>
              <h3 id="source-link-removal-title">Remove from Project</h3>
            </div>
            <PetraButton variant="quiet" onClick={closeAndFocus}>
              Close
            </PetraButton>
          </header>
          <p>
            Stop ordinary new use of <strong>{sourceTitle}</strong> in this
            Project. This does not delete its global identity, immutable
            versions, dependencies, provenance, or local copy.
          </p>

          {loadingPreview ? (
            <p role="status">Loading the exact removal preview…</p>
          ) : null}
          {previewFailure === undefined ? null : (
            <section
              className="source-link-removal-message source-link-removal-message--caution"
              aria-labelledby="source-link-removal-preview-error-title"
            >
              <h4 id="source-link-removal-preview-error-title">
                Removal preview unavailable
              </h4>
              <p>{previewFailure}</p>
              <PetraButton onClick={() => void loadPreview()}>
                Retry preview
              </PetraButton>
            </section>
          )}

          {preview === undefined ? null : (
            <>
              <section
                className="source-link-removal-review"
                aria-labelledby="source-link-removal-binding-title"
              >
                <h4 id="source-link-removal-binding-title">
                  Exact link and freshness
                </h4>
                <dl>
                  <div>
                    <dt>Registered Project role</dt>
                    <dd>
                      {sourceRole}
                      {sourceRoleId === undefined ? null : (
                        <>
                          {" "}
                          · <code>{sourceRoleId}</code>
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Project</dt>
                    <dd>Revision {preview.expected.project_ref.revision}</dd>
                  </div>
                  <div>
                    <dt>Profile definition</dt>
                    <dd>
                      Revision{" "}
                      {preview.expected.project_definition_ref.revision}
                    </dd>
                  </div>
                  <div>
                    <dt>Project source</dt>
                    <dd>
                      Revision {preview.expected.current_source_ref.revision} ·
                      active
                    </dd>
                  </div>
                </dl>
                <p>
                  {preview.transition.reason} Preview read{" "}
                  {new Date(preview.read_at).toLocaleString()}. Petra will
                  reject this request if any exact binding is stale.
                </p>
              </section>

              <section
                className="source-link-removal-review"
                aria-labelledby="source-link-removal-impact-title"
              >
                <h4 id="source-link-removal-impact-title">
                  Retained dependency impact
                </h4>
                <ul className="source-link-removal-impact">
                  {preview.impact.groups.map((group) => (
                    <li key={group.group_kind}>
                      <strong>{impactLabels[group.group_kind]}</strong>
                      <span>
                        {group.total_count.toLocaleString()} retained
                        {group.coverage === "truncated"
                          ? ` · ${group.returned_count.toLocaleString()} shown`
                          : " · complete count"}
                      </span>
                      {group.refs.length === 0 ? null : (
                        <details>
                          <summary>Inspect returned dependencies</summary>
                          <ul>
                            {group.refs.map((reference) => (
                              <li key={reference.record_id}>
                                <code>{reference.record_id}</code> · r
                                {reference.revision} ·{" "}
                                {reference.posture.replaceAll("_", " ")}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
                <ul className="source-link-removal-limitations">
                  {preview.impact.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>

              <section
                className="source-link-removal-review"
                aria-labelledby="source-link-removal-retention-title"
              >
                <h4 id="source-link-removal-retention-title">
                  Retention boundary
                </h4>
                <ul className="source-link-removal-retention">
                  {preview.retention.map((item) => (
                    <li key={item.area}>
                      <strong>{retentionLabels[item.area]}</strong>
                      <span>
                        {item.state === "deletion_unavailable"
                          ? "Retained · deletion unavailable"
                          : "Retained"}
                      </span>
                      <small>{item.reason}</small>
                    </li>
                  ))}
                </ul>
              </section>

              {outcome === undefined ? (
                <form onSubmit={submit}>
                  <PetraTextArea
                    label="Reason for removing this Project link"
                    hint="Required. This explanation is retained with the governed status change."
                    value={reason}
                    required
                    rows={3}
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />
                  <div className="source-link-removal-actions">
                    <PetraButton
                      type="submit"
                      variant="danger"
                      busy={submitting}
                      busyLabel="Removing from Project"
                    >
                      Confirm Project-link removal
                    </PetraButton>
                    <PetraButton variant="secondary" onClick={closeAndFocus}>
                      Keep link active
                    </PetraButton>
                  </div>
                </form>
              ) : null}

              {failure === undefined || outcome !== undefined ? null : (
                <section
                  className="source-link-removal-message source-link-removal-message--caution"
                  data-failure-kind={failure.kind}
                  aria-labelledby="source-link-removal-failure-title"
                >
                  <p className="reference-panel-kicker">No success assumed</p>
                  <h4 id="source-link-removal-failure-title">
                    {failure.title}
                  </h4>
                  <p>{failure.message}</p>
                  {failure.code === undefined ? null : (
                    <p>
                      <code>{failure.code}</code>
                    </p>
                  )}
                  <div className="source-link-removal-actions">
                    {failure.kind === "unknown" ? (
                      <PetraButton
                        variant="primary"
                        busy={submitting}
                        busyLabel="Checking removal effect"
                        onClick={() => void assessRecovery()}
                      >
                        Check removal effect
                      </PetraButton>
                    ) : null}
                    {failure.kind === "conflict" ? (
                      <PetraButton onClick={() => void loadPreview()}>
                        Refresh removal preview
                      </PetraButton>
                    ) : null}
                  </div>
                </section>
              )}

              {recovery === undefined || outcome !== undefined ? null : (
                <RecoveryResult
                  recovery={recovery}
                  retrying={submitting}
                  onRetry={retryExact}
                />
              )}
              {recoveryFailure === undefined ? null : (
                <p className="source-link-removal-recovery-error" role="alert">
                  {recoveryFailure} No effect is assumed.
                </p>
              )}
              {outcome === undefined ? null : (
                <RemovalReceipt
                  outcome={outcome}
                  taskReturnPath={taskReturnPath}
                  onReturnFocus={closeAndFocus}
                />
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
};
