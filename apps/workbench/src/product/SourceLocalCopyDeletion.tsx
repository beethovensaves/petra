import type { ProjectSourceLocalCopyDeletionClientResult } from "@petra/adapters";
import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
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
  createSourceLocalCopyDeletionRequest,
  projectSourceLocalCopyDeletionClient,
  sourceLocalCopyDeletionConflict,
  sourceLocalCopyDeletionErrorCode,
  sourceLocalCopyDeletionOutcomeUnknown,
  sourceLocalCopyDeletionPermissionLost,
} from "./source-local-copy-deletion.js";

export type SourceLocalCopyDeletionClient = Pick<
  ReturnType<typeof projectSourceLocalCopyDeletionClient>,
  "preview" | "delete" | "assessRecovery"
>;

interface DeletionFailure {
  readonly kind: "permission" | "conflict" | "rejected" | "unknown";
  readonly title: string;
  readonly message: string;
  readonly code?: string;
}

interface DeletionOutcome {
  readonly receipt: PetraProjectSourceLocalCopyDeletionReceipt;
  readonly applied?: boolean;
  readonly recovered: boolean;
}

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const deletionFailure = (error: unknown): DeletionFailure => {
  const code = sourceLocalCopyDeletionErrorCode(error);
  if (sourceLocalCopyDeletionPermissionLost(error)) {
    return {
      kind: "permission",
      title: "Storage permission changed",
      message:
        "The signed-in actor is no longer authorized to delete this exact local copy. Petra did not assume an effect.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceLocalCopyDeletionConflict(error)) {
    return {
      kind: "conflict",
      title: "The Project, source, or copy changed",
      message:
        "Petra rejected the stale reviewed preview. Re-read the exact Project, profile definition, source, and copy before deciding again.",
      ...(code === undefined ? {} : { code }),
    };
  }
  if (sourceLocalCopyDeletionOutcomeUnknown(error)) {
    return {
      kind: "unknown",
      title: "Deletion outcome not confirmed",
      message:
        "Petra did not receive a trustworthy storage result. Keep this exact reason and request identity while Petra reconciles the durable attempt.",
      ...(code === undefined ? {} : { code }),
    };
  }
  return {
    kind: "rejected",
    title: "Local copy was not deleted",
    message:
      "Petra rejected this exact request. The Project link, retained identities, history, and local-copy state remain unchanged.",
    ...(code === undefined ? {} : { code }),
  };
};

const blockerLabels: Record<
  PetraProjectSourceLocalCopyDeletionPreview["eligibility"]["blockers"][number]["kind"],
  string
> = {
  shared_storage_copy: "Shared storage copy",
  shared_project_use: "Another Project uses this copy",
  artifact_derivation: "A retained artifact depends on this copy",
  active_work: "Active Work depends on this copy",
  open_review: "An open Review depends on this copy",
  deletion_pending: "A deletion attempt is pending",
  copy_unavailable: "Exact local bytes are unavailable",
};

const retentionLabels: Record<
  PetraProjectSourceLocalCopyDeletionPreview["retention"][number]["area"],
  string
> = {
  project_link: "Project link",
  canonical_identity: "Canonical source identity",
  artifact_manifest: "Copy manifest and tombstone",
  rights_history: "Rights history",
  selectors: "Exact selectors",
  provenance: "Provenance and History",
  local_bytes: "Exact local bytes",
};

const recoveryLabel: Record<
  PetraProjectSourceLocalCopyDeletionPreview["consequences"]["recovery"],
  string
> = {
  reacquire_from_registered_origin:
    "Petra can reacquire the bytes from the registered origin when permitted.",
  resupply_required:
    "A person must supply the exact source again before byte-dependent use can continue.",
  regenerate_required:
    "Petra must regenerate this exact representation before byte-dependent use can continue.",
};

const RecoveryResult = ({
  recovery,
  retrying,
  onRetry,
}: {
  recovery: PetraProjectSourceLocalCopyDeletionRecoveryView;
  retrying: boolean;
  onRetry: () => void;
}): React.JSX.Element => {
  if (recovery.effect.state === "outcome_unknown") {
    return (
      <section
        className="source-local-copy-message source-local-copy-message--caution"
        aria-labelledby="source-local-copy-recovery-title"
      >
        <p className="reference-panel-kicker">Durable recovery</p>
        <h4 id="source-local-copy-recovery-title">
          Deletion outcome is still unknown
        </h4>
        <p>
          {recovery.effect.durable_intent
            ? "Petra retained the deletion intent, but storage delivery is not confirmed."
            : "No owned durable effect was observed at the recovery cutoff."}{" "}
          Retry the exact request; Petra will delete once or return its retained
          receipt.
        </p>
        <PetraButton
          variant="primary"
          busy={retrying}
          busyLabel="Retrying exact deletion"
          onClick={onRetry}
        >
          Retry exact deletion
        </PetraButton>
      </section>
    );
  }
  if (recovery.effect.state === "unavailable_to_verify") {
    return (
      <section
        className="source-local-copy-message source-local-copy-message--caution"
        aria-labelledby="source-local-copy-recovery-title"
      >
        <p className="reference-panel-kicker">Recovery unavailable</p>
        <h4 id="source-local-copy-recovery-title">
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

const DeletionReceipt = ({
  outcome,
  taskReturnPath,
  onReturnFocus,
}: {
  outcome: DeletionOutcome;
  taskReturnPath: string;
  onReturnFocus: () => void;
}): React.JSX.Element => {
  const { receipt } = outcome;
  const replayed = !outcome.recovered && outcome.applied === false;
  const title = outcome.recovered
    ? "Local-copy deletion confirmed"
    : replayed
      ? "Exact deletion result replayed"
      : "Local copy deleted";
  return (
    <section
      className="source-local-copy-receipt"
      data-local-copy-deletion-outcome={
        outcome.recovered ? "recovered" : replayed ? "replayed" : "applied"
      }
      aria-labelledby="source-local-copy-receipt-title"
      role="status"
    >
      <p className="reference-panel-kicker">
        {outcome.recovered
          ? "Durable effect recovered"
          : replayed
            ? "Retained result replayed"
            : "Applied once"}
      </p>
      <h4 id="source-local-copy-receipt-title">{title}</h4>
      <p>{receipt.effect.summary}</p>
      <dl>
        <div>
          <dt>Local copy</dt>
          <dd>Absent · {receipt.effect.observation.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Project link</dt>
          <dd>Retained · still belongs to this Project</dd>
        </div>
        <div>
          <dt>What remains</dt>
          <dd>
            Identity, copy manifest, rights, selectors, provenance, History
          </dd>
        </div>
        <div>
          <dt>What may need recovery</dt>
          <dd>Byte-dependent reading, processing, and representations</dd>
        </div>
      </dl>
      <details>
        <summary>Inspect durable receipt and exact copy identity</summary>
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
            <dt>Copy manifest</dt>
            <dd>
              <code>{receipt.copy_ref.artifact_manifest_id}</code>
            </dd>
          </div>
          <div>
            <dt>Content hash</dt>
            <dd>
              <code>{receipt.copy_ref.content_hash}</code>
            </dd>
          </div>
        </dl>
      </details>
      <div className="source-local-copy-actions">
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

export const SourceLocalCopyDeletionAction = ({
  projectId,
  projectSourceId,
  sourceTitle,
  taskReturnPath,
  client,
  onDeleted,
}: {
  projectId: string;
  projectSourceId: string;
  sourceTitle: string;
  taskReturnPath: string;
  client?: SourceLocalCopyDeletionClient;
  onDeleted?: () => void | Promise<void>;
}): React.JSX.Element => {
  const deletionClient = useMemo(
    () => client ?? projectSourceLocalCopyDeletionClient(),
    [client],
  );
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] =
    useState<PetraProjectSourceLocalCopyDeletionPreview>();
  const [previewFailure, setPreviewFailure] = useState<string>();
  const [reason, setReason] = useState("");
  const [request, setRequest] =
    useState<PetraProjectSourceLocalCopyDeletionRequest>();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<DeletionFailure>();
  const [outcome, setOutcome] = useState<DeletionOutcome>();
  const [recovery, setRecovery] =
    useState<PetraProjectSourceLocalCopyDeletionRecoveryView>();
  const [recoveryFailure, setRecoveryFailure] = useState<string>();

  const loadPreview = useCallback(async (): Promise<void> => {
    setLoadingPreview(true);
    setPreviewFailure(undefined);
    setFailure(undefined);
    setRecovery(undefined);
    setOutcome(undefined);
    try {
      setPreview(await deletionClient.preview(projectId, projectSourceId));
    } catch (error) {
      setPreview(undefined);
      setPreviewFailure(
        errorMessage(
          error,
          "Petra could not load the exact local-copy deletion preview.",
        ),
      );
    } finally {
      setLoadingPreview(false);
    }
  }, [deletionClient, projectId, projectSourceId]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  const closeAndFocus = (): void => {
    setOpen(false);
    globalThis.requestAnimationFrame?.(() =>
      document
        .querySelector<HTMLElement>("#source-local-copy-deletion-trigger")
        ?.focus(),
    );
  };

  const execute = async (
    exactRequest: PetraProjectSourceLocalCopyDeletionRequest,
  ): Promise<void> => {
    setSubmitting(true);
    setFailure(undefined);
    setRecovery(undefined);
    setRecoveryFailure(undefined);
    try {
      const result: ProjectSourceLocalCopyDeletionClientResult =
        await deletionClient.delete(projectId, projectSourceId, exactRequest);
      setOutcome({
        receipt: result.receipt,
        applied: result.applied,
        recovered: false,
      });
      void onDeleted?.();
    } catch (error) {
      setFailure(deletionFailure(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (preview === undefined) return;
    try {
      const nextRequest = createSourceLocalCopyDeletionRequest({
        preview,
        reason,
      });
      setRequest(nextRequest);
      void execute(nextRequest);
    } catch (error) {
      setFailure({
        kind: "rejected",
        title: "A deletion reason is required",
        message: errorMessage(error, "Review the required deletion reason."),
      });
    }
  };

  const assessRecovery = async (): Promise<void> => {
    if (request === undefined) return;
    setSubmitting(true);
    setRecoveryFailure(undefined);
    try {
      const assessment = await deletionClient.assessRecovery(
        projectId,
        projectSourceId,
        request,
      );
      setRecovery(assessment);
      if (assessment.effect.state === "effect_confirmed") {
        setOutcome({ receipt: assessment.effect.receipt, recovered: true });
        setFailure(undefined);
        void onDeleted?.();
      }
    } catch (error) {
      setRecoveryFailure(
        errorMessage(
          error,
          "Petra could not assess this exact local-copy deletion request.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const eligible =
    preview?.eligibility.state === "eligible" &&
    preview.operation.state === "ready";

  return (
    <div className="source-local-copy-deletion">
      <PetraButton
        id="source-local-copy-deletion-trigger"
        variant="secondary"
        onClick={() => {
          setOpen(true);
          if (preview === undefined && !loadingPreview) void loadPreview();
        }}
      >
        Delete local copy
      </PetraButton>

      {open ? (
        <section
          className="source-local-copy-panel"
          tabIndex={-1}
          ref={panelRef}
          aria-labelledby="source-local-copy-title"
        >
          <header>
            <div>
              <p className="reference-panel-kicker">Storage and retention</p>
              <h3 id="source-local-copy-title">Delete local copy</h3>
            </div>
            <PetraButton variant="quiet" onClick={closeAndFocus}>
              Close
            </PetraButton>
          </header>
          <p>
            Delete one exact local byte copy of <strong>{sourceTitle}</strong>.
            This is separate from removing the source from this Project: its
            Project link, identity, manifest, rights, provenance, and History
            remain.
          </p>

          {loadingPreview ? (
            <p role="status">Checking exact-copy eligibility…</p>
          ) : null}
          {previewFailure === undefined ? null : (
            <section
              className="source-local-copy-message source-local-copy-message--caution"
              aria-labelledby="source-local-copy-preview-error-title"
            >
              <h4 id="source-local-copy-preview-error-title">
                Deletion preview unavailable
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
                className="source-local-copy-review"
                aria-labelledby="source-local-copy-eligibility-title"
              >
                <p className="reference-panel-kicker">Server-owned decision</p>
                <h4 id="source-local-copy-eligibility-title">
                  {preview.eligibility.state === "eligible"
                    ? "Exact copy is eligible"
                    : preview.eligibility.state === "already_deleted"
                      ? "Exact copy is already absent"
                      : "Exact copy cannot be deleted yet"}
                </h4>
                <p>
                  Petra evaluated policy {preview.eligibility.policy_version} at{" "}
                  {new Date(preview.read_at).toLocaleString()}. The command will
                  recheck every binding before changing storage.
                </p>
                {preview.eligibility.blockers.length === 0 ? null : (
                  <ul className="source-local-copy-blockers">
                    {preview.eligibility.blockers.map((blocker) => (
                      <li key={blocker.kind}>
                        <strong>{blockerLabels[blocker.kind]}</strong>
                        <span>
                          {blocker.count.toLocaleString()} blocking record
                          {blocker.count === 1 ? "" : "s"}
                        </span>
                        <small>{blocker.reason}</small>
                        {blocker.record_ids.length === 0 ? null : (
                          <details>
                            <summary>Inspect blocking identities</summary>
                            <ul>
                              {blocker.record_ids.map((recordId) => (
                                <li key={recordId}>
                                  <code>{recordId}</code>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="source-local-copy-review"
                aria-labelledby="source-local-copy-binding-title"
              >
                <h4 id="source-local-copy-binding-title">
                  Exact copy and freshness
                </h4>
                <dl>
                  <div>
                    <dt>Project source</dt>
                    <dd>
                      Revision {preview.expected.current_source_ref.revision} ·{" "}
                      {preview.expected.current_source_ref.status}
                    </dd>
                  </div>
                  <div>
                    <dt>Copy</dt>
                    <dd>
                      {preview.expected.copy_ref.media_type} ·{" "}
                      {preview.expected.copy_ref.byte_size.toLocaleString()}{" "}
                      bytes
                    </dd>
                  </div>
                  <div>
                    <dt>Copy manifest</dt>
                    <dd>
                      <code>
                        {preview.expected.copy_ref.artifact_manifest_id}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Content hash</dt>
                    <dd>
                      <code>{preview.expected.copy_ref.content_hash}</code>
                    </dd>
                  </div>
                </dl>
                <details>
                  <summary>Inspect exact storage identity</summary>
                  <dl>
                    <div>
                      <dt>Store</dt>
                      <dd>
                        <code>{preview.expected.copy_ref.store_name}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Object key</dt>
                      <dd>
                        <code>{preview.expected.copy_ref.object_key}</code>
                      </dd>
                    </div>
                  </dl>
                </details>
              </section>

              <section
                className="source-local-copy-review"
                aria-labelledby="source-local-copy-boundary-title"
              >
                <h4 id="source-local-copy-boundary-title">
                  What remains and what changes
                </h4>
                <ul className="source-local-copy-retention">
                  {preview.retention.map((item) => (
                    <li key={item.area}>
                      <strong>{retentionLabels[item.area]}</strong>
                      <span>
                        {item.state === "retained"
                          ? "Retained"
                          : item.state === "already_deleted"
                            ? "Already absent"
                            : "Deleted only after confirmation"}
                      </span>
                      <small>{item.reason}</small>
                    </li>
                  ))}
                </ul>
                <div className="source-local-copy-consequence">
                  <strong>Recovery consequence</strong>
                  <p>{recoveryLabel[preview.consequences.recovery]}</p>
                  <p>
                    Byte-dependent representations may stop resolving. The
                    Project link is not removed.
                  </p>
                </div>
              </section>

              {eligible && outcome === undefined ? (
                <form onSubmit={submit}>
                  <PetraTextArea
                    label="Reason for deleting this exact local copy"
                    hint="Required. This explanation is retained with the durable storage receipt."
                    value={reason}
                    required
                    rows={3}
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />
                  <div className="source-local-copy-actions">
                    <PetraButton
                      type="submit"
                      variant="danger"
                      busy={submitting}
                      busyLabel="Deleting exact local copy"
                    >
                      Confirm exact local-copy deletion
                    </PetraButton>
                    <PetraButton variant="secondary" onClick={closeAndFocus}>
                      Keep local copy
                    </PetraButton>
                  </div>
                </form>
              ) : outcome === undefined ? (
                <div className="source-local-copy-actions">
                  <PetraButton onClick={() => void loadPreview()}>
                    Refresh eligibility
                  </PetraButton>
                  <PetraButton variant="secondary" onClick={closeAndFocus}>
                    Keep local copy
                  </PetraButton>
                </div>
              ) : null}

              {failure === undefined || outcome !== undefined ? null : (
                <section
                  className="source-local-copy-message source-local-copy-message--caution"
                  data-local-copy-failure-kind={failure.kind}
                  aria-labelledby="source-local-copy-failure-title"
                >
                  <p className="reference-panel-kicker">No success assumed</p>
                  <h4 id="source-local-copy-failure-title">{failure.title}</h4>
                  <p>{failure.message}</p>
                  {failure.code === undefined ? null : (
                    <p>
                      <code>{failure.code}</code>
                    </p>
                  )}
                  <div className="source-local-copy-actions">
                    {failure.kind === "unknown" ? (
                      <PetraButton
                        variant="primary"
                        busy={submitting}
                        busyLabel="Checking storage effect"
                        onClick={() => void assessRecovery()}
                      >
                        Check deletion effect
                      </PetraButton>
                    ) : null}
                    {failure.kind === "conflict" ? (
                      <PetraButton onClick={() => void loadPreview()}>
                        Refresh deletion preview
                      </PetraButton>
                    ) : null}
                  </div>
                </section>
              )}

              {recovery === undefined || outcome !== undefined ? null : (
                <RecoveryResult
                  recovery={recovery}
                  retrying={submitting}
                  onRetry={() => {
                    if (request !== undefined) void execute(request);
                  }}
                />
              )}
              {recoveryFailure === undefined ? null : (
                <p className="source-local-copy-recovery-error" role="alert">
                  {recoveryFailure} No effect is assumed.
                </p>
              )}
              {outcome === undefined ? null : (
                <DeletionReceipt
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
