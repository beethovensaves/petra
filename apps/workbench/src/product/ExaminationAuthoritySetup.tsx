import { useEffect, useState } from "react";
import type {
  PetraProjectExaminationAuthorityRequest,
  PetraProjectExaminationAuthorityReceipt,
  PetraProjectExaminationView,
} from "@petra/contracts";
import { examinationAuthorityProposal } from "@petra/core";
import {
  ExaminationRequestRejected,
  ProjectExaminationClient,
  examinationContentHash,
} from "@petra/adapters";
type Pending = {
  phase: "prepared" | "sending" | "unknown";
  request: PetraProjectExaminationAuthorityRequest;
};
const restore = (key: string): Pending | undefined => {
  try {
    return (
      (JSON.parse(sessionStorage.getItem(key) ?? "null") as
        Pending | undefined) ?? undefined
    );
  } catch {
    return undefined;
  }
};
const identity = () => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  return `command_${Array.from(crypto.getRandomValues(new Uint8Array(26)), (n, i) => alphabet[i === 0 ? n % 8 : n % 32]).join("")}`;
};
const client = () =>
  new ProjectExaminationClient({
    baseUrl: location.origin,
    token:
      sessionStorage.getItem("petra.auth.token") ?? "petra-local-development",
  });
export const ExaminationAuthoritySetup = ({
  view,
  displayedGraphHash,
  onRecorded,
}: {
  view: PetraProjectExaminationView;
  displayedGraphHash: string;
  onRecorded: () => Promise<void>;
}): React.JSX.Element | null => {
  const key = `petra.examination.authority.${view.project_id}`;
  const [pending, setPending] = useState<Pending | undefined>(() =>
    restore(key),
  );
  const [receipt, setReceipt] =
    useState<PetraProjectExaminationAuthorityReceipt>();
  const [reason, setReason] = useState(
    "Enable my own scoped examinations in this Project using its registered examination profile and policy.",
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (pending === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(pending));
  }, [key, pending]);
  useEffect(() => {
    const commandId = sessionStorage.getItem(key + ".recorded");
    let current = true;
    if (commandId !== null)
      void client()
        .recoverOwnerAuthority(view.project_id, commandId)
        .then((result) => {
          if (current) setReceipt(result);
        })
        .catch(() => {
          if (current)
            setError(
              "The retained authority receipt could not be read. Try again before relying on this browser's saved command identity.",
            );
        });
    return () => {
      current = false;
    };
  }, [key, view.project_id]);
  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The exact authority operation is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  };
  const accept = async (result: PetraProjectExaminationAuthorityReceipt) => {
    setReceipt(result);
    sessionStorage.setItem(key + ".recorded", result.content.command_id);
    setPending(undefined);
    await onRecorded();
  };
  const record = async () => {
    if (pending === undefined) return;
    const request = pending.request;
    setPending({ phase: "sending", request });
    try {
      // Read the immutable receipt before any user-authorized retry.
      const retained = await client().recoverOwnerAuthority(
        view.project_id,
        request.command_id,
      );
      await accept(retained ?? (await client().authorizeOwner(request)));
    } catch (failure) {
      setPending({
        phase:
          failure instanceof ExaminationRequestRejected
            ? "prepared"
            : "unknown",
        request,
      });
      throw failure;
    }
  };
  if (
    view.owner_setup === undefined &&
    pending === undefined &&
    receipt === undefined
  )
    return null;
  return (
    <section
      className="examination-authority-setup"
      aria-label="Examination permission"
    >
      {error === undefined ? null : <p role="alert">{error}</p>}
      {view.authorization.state === "unavailable" &&
      view.owner_setup?.state === "available" &&
      pending === undefined ? (
        <>
          <p>
            You can enable your own examinations on this Project. Review the
            capability before recording it.
          </p>
          <label>
            Reason for enabling examination
            <textarea
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={
              busy ||
              displayedGraphHash !== view.graph.content_hash ||
              reason.trim() === ""
            }
            onClick={() =>
              void perform(async () => {
                const commandId = identity();
                setPending({
                  phase: "prepared",
                  request: {
                    schema_name: "petra.project-examination-authority-request",
                    schema_version: "1.0.0",
                    project_id: view.project_id,
                    command_id: commandId,
                    idempotency_key: `owner-examination:${commandId}`,
                    graph_content_hash: view.graph.content_hash,
                    operation: "authorize_own_examination",
                    review: {
                      proposed_content_hash: await examinationContentHash(
                        examinationAuthorityProposal(
                          view.project_id,
                          view.graph.content_hash,
                        ),
                      ),
                      rationale: reason.trim(),
                      reviewed_at: new Date().toISOString(),
                    },
                  },
                });
              })
            }
          >
            Review examination permission
          </button>
        </>
      ) : null}
      {pending === undefined ? null : (
        <div role="group" aria-label="Review owner examination permission">
          <h4>
            {pending.phase === "prepared"
              ? "Review examination permission"
              : "Check the recorded permission"}
          </h4>
          <p>
            This grants the authenticated human owner only
            ConductProjectExamination in this Project. Every examination still
            requires review and its exact current registered basis.
          </p>
          <p>{pending.request.review.rationale}</p>
          <details>
            <summary>Inspect exact proposal</summary>
            <pre>{JSON.stringify(pending.request, null, 2)}</pre>
          </details>
          <button
            type="button"
            disabled={busy}
            onClick={() => void perform(record)}
          >
            {pending.phase === "prepared"
              ? "Authorize my examinations"
              : "Check receipt and retry this exact request"}
          </button>
          {pending.phase === "prepared" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(undefined)}
            >
              Discard permission proposal
            </button>
          ) : (
            <p>
              Delivery may have stopped after the grant was recorded. Check its
              retained receipt before discarding or issuing another request.
            </p>
          )}
        </div>
      )}
      {receipt === undefined ? null : (
        <details>
          <summary>Inspect recorded examination permission</summary>
          <p>
            Recorded {new Date(receipt.content.recorded_at).toLocaleString()}{" "}
            for {receipt.content.actor.actor_id}.
          </p>
          <pre>{JSON.stringify(receipt, null, 2)}</pre>
        </details>
      )}
    </section>
  );
};
