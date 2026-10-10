import {
  intakeBrowserHash,
  intakeCreationKey,
} from "./intake-browser-state.js";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  IntakeCopilotClient,
  CopilotRequestRejected,
  type CopilotDeliveryState,
  type IntakeCopilotRead,
} from "@petra/adapters/ag-ui";
import type { PetraIntakeCopilotRequest } from "@petra/contracts";
import type { IntakeCopilotTurn } from "@petra/core";
import { useIntakeWorkspace } from "./IntakeWorkspace.js";
export const intakeClient = (): IntakeCopilotClient =>
  new IntakeCopilotClient({
    baseUrl: window.location.origin,
    token:
      sessionStorage.getItem("petra.auth.token") ?? "petra-local-development",
  });
const identity = (kind: string): string => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  return `${kind}_${Array.from(crypto.getRandomValues(new Uint8Array(26)), (byte, index) => alphabet[byte % (index === 0 ? 8 : 32)]).join("")}`;
};
const saved = <T,>(key: string, fallback: T): T => {
  try {
    const value = sessionStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};
type Pending = {
  threadId: string;
  runId: string;
  question: string;
  request: PetraIntakeCopilotRequest;
};
type Home = Awaited<ReturnType<IntakeCopilotClient["home"]>>;

export const IntakeCopilotConversation = ({
  onReview,
}: {
  onReview: () => void;
}): React.JSX.Element => {
  const workspace = useIntakeWorkspace();
  const select = workspace?.select;
  const [home, setHome] = useState<Home>();
  const [intakeId, setIntakeId] = useState<string>(() =>
    saved("petra:intake:selected", ""),
  );
  const [data, setData] = useState<IntakeCopilotRead>();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [starting, setStarting] = useState<string>(() =>
    saved("petra:intake:starting", ""),
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] =
    useState<CopilotDeliveryState<IntakeCopilotTurn>>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  const mounted = useRef(true);
  const controller = useRef<AbortController>(null);
  const activeId = useRef(intakeId);
  activeId.current = intakeId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    let current = true;
    void intakeClient()
      .home()
      .then((value) => {
        if (current) {
          setHome(value);
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        if (current) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The retained intake could not be read.",
          );
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [reload, workspace?.revision]);
  useEffect(() => {
    let current = true;
    setData(undefined);
    setPending(null);
    setDraft(saved(`petra:intake:draft:${intakeId}`, ""));
    setDelivery(undefined);
    if (intakeId === "") return;
    setLoading(true);
    void intakeClient()
      .read(intakeId)
      .then(async (value) => {
        if (!current) return;
        setData(value);
        select?.(value);
        setError(undefined);
        workspace?.setCreationPending(
          sessionStorage.getItem(intakeCreationKey(intakeId)) !== null &&
            value.binding === undefined,
        );
        const retained = saved<Pending | null>(
          `petra:intake:pending:${intakeId}`,
          null,
        );
        if (
          retained !== null &&
          retained.request.intake_session_id === intakeId
        ) {
          const turn = value.turns.find(
            (item) => item.run_id === retained.runId,
          );
          if (turn?.terminal !== undefined) {
            if (turn.request_hash !== (await intakeBrowserHash(retained)))
              throw new Error(
                "The retained question differs from this pending request.",
              );
            if (!current) return;
            sessionStorage.removeItem(`petra:intake:pending:${intakeId}`);
            setDraft((currentDraft) =>
              currentDraft.trim() === retained.question ? "" : currentDraft,
            );
          } else setPending(retained);
        }
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (current) {
          setError(
            reason instanceof Error
              ? reason.message
              : "This exact intake is unavailable.",
          );
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [intakeId, reload, workspace?.revision, select]);
  useEffect(() => {
    if (intakeId !== "")
      sessionStorage.setItem(
        `petra:intake:draft:${intakeId}`,
        JSON.stringify(draft),
      );
  }, [intakeId, draft]);
  const choose = (id: string): void => {
    if (busy || pending !== null || workspace?.creationPending) return;
    setIntakeId(id);
    sessionStorage.setItem("petra:intake:selected", JSON.stringify(id));
  };
  const start = async (): Promise<void> => {
    if (home === undefined || !consent || busy || workspace?.creationPending)
      return;
    const id = starting || identity("intake_session");
    setStarting(id);
    sessionStorage.setItem("petra:intake:starting", JSON.stringify(id));
    setBusy(true);
    setError(undefined);
    try {
      const session = await intakeClient().create(id, home.policy_hash);
      if (!mounted.current) return;
      setIntakeId(session.content.intake_session_id);
      sessionStorage.setItem(
        "petra:intake:selected",
        JSON.stringify(session.content.intake_session_id),
      );
      sessionStorage.removeItem("petra:intake:starting");
      setStarting("");
      setConsent(false);
      setReload((value) => value + 1);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Starting this intake was interrupted. Its exact identity is retained for an explicit retry.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const receive = async (input: Pending): Promise<void> => {
    if (busy || workspace?.creationPending) return;
    setBusy(true);
    setError(undefined);
    setPending(input);
    sessionStorage.setItem(
      `petra:intake:pending:${input.request.intake_session_id}`,
      JSON.stringify(input),
    );
    const abort = new AbortController();
    controller.current = abort;
    try {
      await intakeClient().run(
        input,
        (state) => {
          if (
            !mounted.current ||
            activeId.current !== input.request.intake_session_id
          )
            return;
          setDelivery(state);
          if (state.turn !== undefined) {
            setData((previous) =>
              previous === undefined
                ? previous
                : {
                    ...previous,
                    turns: [
                      ...previous.turns.filter(
                        (turn) => turn.run_id !== input.runId,
                      ),
                      state.turn!,
                    ],
                  },
            );
            setPending(null);
            sessionStorage.removeItem(
              `petra:intake:pending:${input.request.intake_session_id}`,
            );
            setDraft((current) =>
              current.trim() === input.question ? "" : current,
            );
            if (state.phase === "completed") workspace?.present(state.turn);
          }
        },
        abort.signal,
      );
    } catch (reason) {
      if (!mounted.current) return;
      if (reason instanceof CopilotRequestRejected) {
        setPending(null);
        sessionStorage.removeItem(
          `petra:intake:pending:${input.request.intake_session_id}`,
        );
        setDelivery(undefined);
      } else setDelivery({ phase: "disconnected" });
      setError(
        abort.signal.aborted
          ? "Delivery stopped. The answer may still be running; read or reconnect to this same question."
          : reason instanceof Error
            ? reason.message
            : "Delivery was interrupted; the exact question identity is retained.",
      );
    } finally {
      if (mounted.current) {
        setBusy(false);
        setReload((value) => value + 1);
      }
    }
  };
  const reconnect = async (): Promise<void> => {
    if (pending === null || busy) return;
    setBusy(true);
    try {
      const read = await intakeClient().read(pending.request.intake_session_id);
      if (!mounted.current) return;
      setData(read);
      select?.(read);
      const retained = read.turns.find((turn) => turn.run_id === pending.runId);
      if (retained?.terminal !== undefined) {
        if (retained.request_hash !== (await intakeBrowserHash(pending)))
          throw new Error(
            "The retained question differs from this pending request.",
          );
        setPending(null);
        sessionStorage.removeItem(
          `petra:intake:pending:${pending.request.intake_session_id}`,
        );
        if (retained.terminal.state === "completed")
          workspace?.present(retained);
        return;
      }
      setBusy(false);
      await receive(pending);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "The exact question could not be read. Its pending identity remains retained.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const cancel = async (runId: string): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await intakeClient().cancel(intakeId, runId);
      controller.current?.abort();
      setReload((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Cancellation could not be confirmed; read the exact run before retrying.",
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const active = data?.turns.find((turn) => turn.terminal === undefined);
  const ready =
    data?.availability.state === "ready" &&
    !busy &&
    !loading &&
    pending === null &&
    active === undefined &&
    !workspace?.creationPending;
  return (
    <section
      className="copilot-conversation"
      aria-label="Pre-Project conversation with Petra"
    >
      <header>
        <p className="reference-panel-kicker">Your copilot</p>
        <h2>Talk through the outcome</h2>
        <p>
          Ask questions before creating a Project. Select and review its
          definition when you are ready.
        </p>
      </header>
      {loading ? <p role="status">Reading retained discussion…</p> : null}
      {home === undefined ? null : (
        <details open={intakeId === ""}>
          <summary>Start or resume a discussion</summary>
          <label>
            Retained intake
            <select
              value={intakeId}
              disabled={busy || pending !== null || workspace?.creationPending}
              onChange={(event) => choose(event.currentTarget.value)}
            >
              <option value="">New discussion</option>
              {home.sessions.map((session) => (
                <option
                  key={session.content.intake_session_id}
                  value={session.content.intake_session_id}
                >
                  {session.content.opened_at} ·{" "}
                  {session.content.intake_session_id.slice(-6)}
                </option>
              ))}
            </select>
          </label>
          <p>
            Selected wording and up to 12 prior turns (48 KB) are sent to the
            managed model. This owner-only session retains up to 20 questions.
            Input is limited to 160 KB and each call to 120 seconds. Per-call
            price is unavailable; failed calls are never retried automatically.
          </p>
          <p>
            Files and Project evidence are excluded from this pre-creation
            discussion.
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.currentTarget.checked)}
              disabled={busy || workspace?.creationPending}
            />
            I agree to this managed-model use and retained discussion policy.
          </label>
          <button
            type="button"
            disabled={
              !consent ||
              busy ||
              home.availability.state !== "ready" ||
              workspace?.creationPending ||
              pending !== null
            }
            onClick={() => void start()}
          >
            {starting ? "Retry this exact intake" : "Start a new discussion"}
          </button>
          {home.availability.state !== "ready" ? (
            <p>{home.availability.reason}</p>
          ) : null}
        </details>
      )}
      <div
        className="copilot-transcript"
        role="log"
        aria-label="Retained pre-Project questions and answers"
        aria-live="polite"
      >
        {data?.turns.map((turn) => (
          <article key={turn.run_id} className="copilot-turn">
            <div className="copilot-question">
              <small>You</small>
              <p>{turn.question}</p>
            </div>
            <div className="copilot-answer">
              <small>Petra</small>
              {turn.terminal === undefined ? (
                <p>Answer running or awaiting recovery.</p>
              ) : turn.terminal.output === undefined ? (
                <p>{turn.terminal.error}</p>
              ) : (
                <>
                  {turn.terminal.output.blocks.map((block, index) => (
                    <p key={index}>{block.text}</p>
                  ))}
                  <button
                    type="button"
                    onClick={() => workspace?.present(turn)}
                  >
                    Examine this answer
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        {pending !== null &&
        !data?.turns.some((turn) => turn.run_id === pending.runId) ? (
          <article className="copilot-turn">
            <div className="copilot-question">
              <small>You</small>
              <p>{pending.question}</p>
            </div>
            <p>Delivery outcome is awaiting an exact retained read.</p>
          </article>
        ) : null}
        {delivery?.phase === "answering" ? (
          <p role="status">Petra is answering…</p>
        ) : null}
      </div>
      {data?.binding === undefined ? null : (
        <p>
          This original discussion belongs to{" "}
          <Link to={`/projects/${data.binding.content.project_id}/brief`}>
            the created Project
          </Link>
          . Continue there.
        </p>
      )}
      <form
        className="copilot-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || data === undefined || draft.trim() === "") return;
          void receive({
            threadId: data.thread_id,
            runId: identity("run"),
            question: draft.trim(),
            request: {
              schema_name: "petra.intake-copilot-request",
              schema_version: "1.0.0",
              intake_session_id: intakeId,
              context_hash: data.context.content_hash,
              parent_run_id: data.turns.at(-1)?.run_id ?? null,
            },
          });
        }}
      >
        <label htmlFor="intake-question">Ask Petra</label>
        <textarea
          id="intake-question"
          value={draft}
          maxLength={8000}
          rows={3}
          placeholder="What are you trying to understand or accomplish?"
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <div className="copilot-composer-actions">
          <button type="submit" disabled={!ready || draft.trim() === ""}>
            Send
          </button>
          <button
            type="button"
            disabled={
              data === undefined ||
              data.binding !== undefined ||
              pending !== null ||
              active !== undefined ||
              busy ||
              workspace?.creationPending
            }
            onClick={onReview}
          >
            Review a Project
          </button>
          {busy ? (
            <button type="button" onClick={() => controller.current?.abort()}>
              Stop delivery
            </button>
          ) : null}
        </div>
      </form>
      {pending !== null ? (
        <button
          type="button"
          disabled={busy || workspace?.creationPending}
          onClick={() => void reconnect()}
        >
          Read and reconnect to this question
        </button>
      ) : null}
      {active === undefined ? null : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void cancel(active.run_id)}
        >
          Cancel this answer
        </button>
      )}
      {workspace?.creationPending ? (
        <p role="status">
          Creation outcome is pending. Read that exact outcome before asking
          another question.
        </p>
      ) : null}
      {data?.availability.state === "unavailable" ? (
        <p>{data.availability.reason}</p>
      ) : null}
      {error === undefined ? null : <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => setReload((value) => value + 1)}
      >
        Read retained state again
      </button>
    </section>
  );
};
