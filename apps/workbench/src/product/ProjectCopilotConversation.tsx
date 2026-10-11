import { intakeClient } from "./IntakeCopilotConversation.js";
import type { IntakeCopilotRead } from "@petra/adapters/ag-ui";
import { GraphPresentationDetails } from "./GraphPresentationDetails.js";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ProjectCopilotClient,
  CopilotRequestRejected,
  type CopilotDeliveryState,
} from "@petra/adapters/ag-ui";
import type { PetraCopilotAuthorityRequest } from "@petra/contracts";
import { intakeBrowserHash as browserHash } from "./intake-browser-state.js";
import type { CopilotTurn } from "@petra/core";
import type { CopilotRequest } from "@petra/core";
import type { ProjectRecord } from "./model.js";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";

type Read = Awaited<ReturnType<ProjectCopilotClient["read"]>>;
type Pending = {
  threadId: string;
  runId: string;
  question: string;
  request: CopilotRequest;
};
const client = (): ProjectCopilotClient =>
  new ProjectCopilotClient({
    baseUrl: window.location.origin,
    token:
      window.sessionStorage.getItem("petra.auth.token") ??
      "petra-local-development",
  });
const newRunId = (): string => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  return `run_${Array.from(bytes, (value, index) => alphabet[index === 0 ? value % 8 : value % 32]).join("")}`;
};
const saved = <T,>(key: string, fallback: T): T => {
  try {
    const value = sessionStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};
const labels = {
  source_report: "Source report",
  inference: "Tentative inference",
  advice: "Suggestion",
  question: "Question",
} as const;

export const ProjectCopilotConversation = ({
  project,
}: {
  project: ProjectRecord;
}): React.JSX.Element => {
  const draftKey = `petra:copilot:draft:${project.id}`;
  const pendingKey = `petra:copilot:pending:${project.id}`;
  const [data, setData] = useState<Read>();
  const [origin, setOrigin] = useState<IntakeCopilotRead>();
  const [originError, setOriginError] = useState<string>();
  const [readBasis, setReadBasis] = useState<string>();
  const [draft, setDraft] = useState(() => saved(draftKey, ""));
  const [pending, setPending] = useState<Pending | null>(() =>
    saved(pendingKey, null),
  );
  const [delivery, setDelivery] = useState<CopilotDeliveryState>();
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  const permissionKey = `petra:copilot:permission:${project.id}`;
  const [permissionConsent, setPermissionConsent] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionPending, setPermissionPending] =
    useState<PetraCopilotAuthorityRequest | null>(() =>
      saved(permissionKey, null),
    );
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const controller = useRef<AbortController>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const historyScroll = useRef<{ height: number; top: number } | undefined>(
    undefined,
  );
  const mounted = useRef(true);
  const workspace = useCopilotWorkspace();
  const location = useLocation();
  const requestedKey = new URLSearchParams(location.search).get("selected");
  const graphState =
    workspace?.visible === true ? undefined : workspace?.sharedGraph;
  const binding =
    graphState?.status === "ready" ? graphState.binding : undefined;
  const requestedKeys =
    binding?.parameters.selected_keys ??
    (requestedKey === null ? (workspace?.focusKeys ?? []) : [requestedKey]);
  const focusSignature = JSON.stringify({
    focus: requestedKeys,
    scene: binding ?? null,
    status: graphState?.status ?? "absent",
  });

  useEffect(() => {
    let current = true;
    void intakeClient()
      .origin(project.id)
      .then((value) => {
        if (current) {
          setOrigin(value);
          setOriginError(undefined);
        }
      })
      .catch((reason: unknown) => {
        if (current)
          setOriginError(
            reason instanceof Error
              ? reason.message
              : "The original pre-creation discussion could not be read.",
          );
      });
    return () => {
      current = false;
    };
  }, [project.id, reload]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    let current = true;
    setReadBasis(undefined);
    if (graphState !== undefined && graphState.status !== "ready") return;
    const selection = JSON.parse(focusSignature) as {
      focus: string[];
      scene: typeof binding | null;
    };
    void client()
      .read(project.id, selection.focus, selection.scene ?? undefined)
      .then((next) => {
        if (current) {
          setData(next);
          setReadBasis(focusSignature);
          setError(undefined);
        }
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : "The conversation could not be read.",
          );
      });
    return () => {
      current = false;
    };
  }, [
    project.id,
    reload,
    location.pathname,
    location.search,
    focusSignature,
    workspace?.contextRevision,
  ]);
  useEffect(() => {
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, draft]);
  useEffect(() => {
    if (pending === null) sessionStorage.removeItem(pendingKey);
    else sessionStorage.setItem(pendingKey, JSON.stringify(pending));
  }, [pendingKey, pending]);
  useEffect(() => {
    if (historyScroll.current !== undefined && transcript.current !== null) {
      const previous = historyScroll.current;
      historyScroll.current = undefined;
      transcript.current.scrollTop =
        previous.top + transcript.current.scrollHeight - previous.height;
      return;
    }
    transcript.current?.scrollTo({
      top: transcript.current.scrollHeight,
      behavior: "smooth",
    });
  }, [data?.turns.length, delivery?.phase, pending]);

  const loadEarlier = async (): Promise<void> => {
    const cursor = data?.history_page?.next_cursor;
    if (cursor === undefined || loadingHistory) return;
    setLoadingHistory(true);
    try {
      const earlier = await client().read(project.id, requestedKeys, binding, {
        cursor,
      });
      if (!mounted.current) return;
      if (transcript.current !== null)
        historyScroll.current = {
          height: transcript.current.scrollHeight,
          top: transcript.current.scrollTop,
        };
      setData((previous) =>
        previous === undefined || previous.thread_id !== earlier.thread_id
          ? previous
          : {
              ...previous,
              history_page: earlier.history_page!,
              owners: { ...earlier.owners, ...previous.owners },
              turns: [
                ...earlier.turns.filter(
                  (turn) =>
                    !previous.turns.some(
                      (existing) => existing.run_id === turn.run_id,
                    ),
                ),
                ...previous.turns,
              ],
            },
      );
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Earlier conversation could not be read.",
        );
    } finally {
      if (mounted.current) setLoadingHistory(false);
    }
  };

  const enableConversation = async (): Promise<void> => {
    if (permissionBusy) return;
    const proposal =
      data?.authorization?.state === "required"
        ? data.authorization.proposal
        : undefined;
    if (
      permissionPending === null &&
      (proposal === undefined || !permissionConsent)
    )
      return;
    setPermissionBusy(true);
    setError(undefined);
    try {
      const request = permissionPending ?? {
        schema_name: "petra.copilot-authority-request" as const,
        schema_version: "1.0.0" as const,
        project_id: project.id,
        command_id: newRunId().replace(/^run_/u, "command_"),
        idempotency_key: `copilot-permission:${crypto.randomUUID()}`,
        proposal: proposal!,
        review: {
          proposed_content_hash: await browserHash(proposal!),
          reviewed_at: new Date().toISOString(),
        },
      };
      sessionStorage.setItem(permissionKey, JSON.stringify(request));
      setPermissionPending(request);
      await client().authorize(project.id, request);
      if (!mounted.current) return;
      sessionStorage.removeItem(permissionKey);
      setPermissionPending(null);
      setPermissionConsent(false);
      setReload((value) => value + 1);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Conversation permission was not confirmed.",
        );
    } finally {
      if (mounted.current) setPermissionBusy(false);
    }
  };

  const receive = async (request: Pending): Promise<void> => {
    setBusy(true);
    setError(undefined);
    setPending(request);
    const abort = new AbortController();
    controller.current = abort;
    try {
      await client().run(
        request,
        (state) => {
          if (!mounted.current) return;
          setDelivery(state);
          if (state.turn !== undefined) {
            setData((previous) =>
              previous === undefined
                ? previous
                : {
                    ...previous,
                    turns: [
                      ...previous.turns.filter(
                        (turn) => turn.run_id !== state.turn?.run_id,
                      ),
                      state.turn as CopilotTurn,
                    ],
                  },
            );
            setPending(null);
            setDraft((current) =>
              current.trim() === request.question ? "" : current,
            );
            if (state.phase === "completed") workspace?.present(state.turn);
          }
        },
        abort.signal,
      );
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof CopilotRequestRejected) {
          setPending(null);
          setDelivery(undefined);
        } else setDelivery({ phase: "disconnected" });
        setError(
          abort.signal.aborted
            ? "Delivery stopped. The answer may still be running; reconnect to this same request."
            : reason instanceof Error
              ? reason.message
              : "Delivery was interrupted. The request identity has been retained.",
        );
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setReload((value) => value + 1);
      }
    }
  };
  const active = data?.turns.find((turn) => turn.terminal === undefined);
  const tail = data?.turns.at(-1);
  const ready =
    data?.availability.state === "ready" &&
    !busy &&
    active === undefined &&
    pending === null &&
    (graphState === undefined || graphState.status === "ready") &&
    readBasis === focusSignature &&
    requestedKeys.every((key) =>
      data?.context.records.some((record) => record.key === key),
    );
  const selected = data?.context.records.find(
    (record) =>
      record.key === new URLSearchParams(location.search).get("selected"),
  );
  const focusKeys = requestedKeys;

  return (
    <section
      className="copilot-conversation"
      aria-label="Conversation with Petra"
      data-operation-id="petra.ask"
      data-readiness={data?.availability.state ?? "loading"}
    >
      {data?.authorization?.state === "required" ||
      permissionPending !== null ? (
        <div className="copilot-permission">
          <h3>Enable this Project conversation</h3>
          <p>
            Allow Petra to run bounded advisory questions and retain their
            history in this Project. Examinations and changes still require
            their own reviewed actions.
          </p>
          <label>
            <input
              id="copilot-permission-consent"
              type="checkbox"
              checked={permissionConsent}
              onChange={(event) => setPermissionConsent(event.target.checked)}
            />
            Allow these conversation tasks in this Project.
          </label>
          <button
            type="button"
            id="copilot-enable-conversation"
            disabled={
              permissionBusy ||
              (!permissionConsent && permissionPending === null)
            }
            onClick={() => void enableConversation()}
          >
            {permissionBusy
              ? "Confirming permission…"
              : permissionPending === null
                ? "Enable conversation"
                : "Recover permission receipt"}
          </button>
        </div>
      ) : null}
      {origin === undefined ? null : (
        <details id="copilot-intake-origin" className="copilot-intake-origin">
          <summary>
            Original pre-Project discussion ({origin.turns.length} questions)
          </summary>
          <p>
            This discussion preceded creation. Its answers are advisory and
            contain no Project evidence or examination results.
          </p>
          {origin.turns.map((turn) => (
            <article key={turn.run_id} className="copilot-turn">
              <div className="copilot-question">
                <small>You</small>
                <p>{turn.question}</p>
              </div>
              <div className="copilot-answer">
                <small>Petra before creation</small>
                {turn.terminal?.output?.blocks.map((block, index) => (
                  <p key={index}>{block.text}</p>
                )) ?? <p>{turn.terminal?.error}</p>}
              </div>
            </article>
          ))}
          <details>
            <summary>Exact creation binding</summary>
            <pre>{JSON.stringify(origin.binding, null, 2)}</pre>
          </details>
        </details>
      )}
      {originError === undefined ? null : (
        <details>
          <summary>Original discussion read unavailable</summary>
          <p>{originError}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Read original discussion again
          </button>
        </details>
      )}
      <div
        className="copilot-transcript"
        ref={transcript}
        tabIndex={0}
        aria-label="Conversation history"
      >
        {data === undefined ? (
          <p role="status">{error ?? "Opening your conversation…"}</p>
        ) : data.authorization?.state === "required" ? (
          <p role="status">
            Your retained conversation will load after permission is confirmed.
          </p>
        ) : data.authorization?.state === "unavailable" ? (
          <p role="status">{data.authorization.reason}</p>
        ) : data.turns.length === 0 ? (
          <div className="copilot-welcome">
            <strong>What would you like to work through?</strong>
            <p>
              Ask about the evidence, explore a possible explanation, or tell me
              what outcome you want.
            </p>
            <div className="copilot-starters">
              {["What do we know so far?", "What should we examine next?"].map(
                (question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => setDraft(question)}
                  >
                    {question}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}
        {data?.history_page?.has_more ? (
          <button
            type="button"
            disabled={loadingHistory || busy}
            onClick={() => void loadEarlier()}
          >
            {loadingHistory
              ? "Loading earlier conversation…"
              : "Load earlier conversation"}
          </button>
        ) : null}
        {data?.turns.map((turn) => (
          <div key={turn.run_id} className="copilot-exchange">
            <article className="copilot-message copilot-message--user">
              <strong>You</strong>
              <p>{turn.question}</p>
            </article>
            <article className="copilot-message copilot-message--assistant">
              <strong>Petra</strong>
              {data.owners?.[turn.run_id] === undefined ? null : (
                <p>
                  <Link
                    to={`/projects/${project.id}/work/${data.owners[turn.run_id]!.work_unit_ref.work_unit_id}`}
                  >
                    Inspect conversation task
                  </Link>
                  {data.owners[turn.run_id]!.capture === "historical_adoption"
                    ? " · Retained history import"
                    : ""}
                </p>
              )}
              {turn.terminal === undefined ? (
                <p role="status">Working on your answer…</p>
              ) : turn.terminal.state !== "completed" ? (
                <p role="status">{turn.terminal.error}</p>
              ) : (
                <>
                  {turn.terminal.output?.blocks.map((block, index) => (
                    <div key={index} data-kind={block.kind}>
                      {block.kind === "advice" ||
                      block.kind === "question" ? null : (
                        <small>{labels[block.kind]}</small>
                      )}
                      <p>{block.text}</p>
                      <div className="copilot-citations">
                        {block.citations.map((key) => {
                          const record = turn.context.records.find(
                            (item) => item.key === key,
                          );
                          return record === undefined ? null : (
                            <button
                              key={key}
                              type="button"
                              onClick={() => workspace?.select(record)}
                            >
                              {record.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <details className="copilot-input-manifest">
                    <summary>Inspect what this turn could use</summary>
                    <p>
                      This turn uses its retained Project and definition
                      revisions. A follow-up binds its prior turn and refreshes
                      the Project basis; it cannot replace this original input.
                    </p>
                    <ul>
                      {turn.context.limitations.map((limitation, index) => (
                        <li key={index}>{limitation}</li>
                      ))}
                    </ul>
                    <details>
                      <summary>Included context and withheld material</summary>
                      {turn.context.records.map((record) => (
                        <article key={record.key}>
                          <strong>{record.label}</strong>
                          <p>
                            {record.kind} · revision {record.ref.revision}
                          </p>
                          {record.text === undefined ? (
                            <p>Reference only; content withheld.</p>
                          ) : (
                            <pre>{record.text}</pre>
                          )}
                        </article>
                      ))}
                    </details>
                    {turn.input_manifest === undefined ? (
                      <p>
                        This earlier turn has no retained input disclosure
                        manifest. Its exact context remains in its retained
                        turn; included historical text cannot be reconstructed
                        as a confirmed model input.
                      </p>
                    ) : (
                      <>
                        <p>
                          Prepared advisory input before provider invocation.
                          The terminal outcome records whether an answer
                          completed.
                        </p>
                        <p>
                          {
                            turn.input_manifest.content.context_record_keys
                              .length
                          }{" "}
                          context records ·{" "}
                          {turn.input_manifest.content.retained_history_count -
                            turn.input_manifest.content
                              .excluded_history_count}{" "}
                          historical entries selected ·{" "}
                          {turn.input_manifest.content.excluded_history_count}{" "}
                          excluded by the history budget.
                        </p>
                        {turn.input_manifest.content
                          .history_query_may_have_omissions ? (
                          <p>
                            Older conversation may lie outside the 200-turn read
                            window.
                          </p>
                        ) : null}
                        <ul>
                          {turn.input_manifest.content.history.map((entry) => (
                            <li key={entry.run_id}>
                              {entry.run_id}:{" "}
                              {entry.disclosure.replaceAll("_", " ")}
                            </li>
                          ))}
                        </ul>
                        <details>
                          <summary>Exact input identities and hashes</summary>
                          <pre>
                            {JSON.stringify(turn.input_manifest, null, 2)}
                          </pre>
                        </details>
                      </>
                    )}
                  </details>
                  {turn.shared_scene === undefined ? null : (
                    <GraphPresentationDetails scene={turn.shared_scene} />
                  )}
                  <button
                    className="copilot-open-answer"
                    type="button"
                    onClick={() => workspace?.present(turn)}
                  >
                    Open answer in workspace →
                  </button>
                </>
              )}
            </article>
          </div>
        ))}
        {pending !== null &&
        !data?.turns.some((turn) => turn.run_id === pending.runId) ? (
          <article className="copilot-message copilot-message--user">
            <strong>You</strong>
            <p>{pending.question}</p>
            <small>{busy ? "Sending…" : "Delivery interrupted"}</small>
          </article>
        ) : null}
        {busy ? (
          <p className="copilot-progress" role="status">
            {delivery?.phase === "connecting"
              ? "Connecting…"
              : "Examining the supplied Project context…"}
          </p>
        ) : null}
      </div>
      <div className="copilot-compose-area">
        {selected === undefined ? (
          focusKeys.length === 0 ? null : (
            <p className="copilot-context-chip">Using your selected evidence</p>
          )
        ) : (
          <p className="copilot-context-chip">About: {selected.label}</p>
        )}
        {error === undefined || data === undefined ? null : (
          <p className="copilot-error" role="alert">
            {error}
          </p>
        )}
        {data?.availability.state === "unavailable" ? (
          <p role="status">{data.availability.reason}</p>
        ) : null}
        {pending === null || busy ? null : (
          <button type="button" onClick={() => void receive(pending)}>
            Reconnect to this answer
          </button>
        )}
        {active === undefined || busy || pending !== null ? null : (
          <button
            type="button"
            onClick={() =>
              void receive({
                threadId: active.thread_id,
                runId: active.run_id,
                question: active.question,
                request: {
                  schema_name: "petra.copilot-request",
                  ...(active.shared_scene === undefined
                    ? { schema_version: "1.0.0" as const }
                    : {
                        schema_version: "1.1.0" as const,
                        shared_scene: {
                          parameters: active.shared_scene.content.parameters,
                          content_hash: active.shared_scene.content_hash,
                          peer_content_hash:
                            active.shared_scene.content.peer_content_hash,
                        },
                      }),
                  project_id: active.project_id,
                  context_hash: active.context.content_hash,
                  parent_run_id: active.parent_run_id,
                  focus_keys: active.focus_keys,
                },
              })
            }
          >
            Receive the running answer
          </button>
        )}
        {graphState === undefined ? null : (
          <p role="status">
            {graphState.status === "preparing"
              ? "Binding the displayed graph to your question…"
              : graphState.status === "failed"
                ? graphState.reason
                : `Your question uses the displayed ${graphState.binding.parameters.renderer === "native_working" ? "working" : "examination"} graph${graphState.binding.parameters.excluded_kinds.length > 0 ? " with its active kind filter" : ""}.`}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready || data === undefined || draft.trim() === "") return;
            void receive({
              threadId: data.thread_id,
              runId: newRunId(),
              question: draft.trim(),
              request: {
                schema_name: "petra.copilot-request",
                ...(binding === undefined
                  ? { schema_version: "1.0.0" as const }
                  : {
                      schema_version: "1.1.0" as const,
                      shared_scene: binding,
                    }),
                project_id: project.id,
                context_hash: data.context.content_hash,
                parent_run_id: tail?.run_id ?? null,
                focus_keys: focusKeys,
              },
            });
          }}
        >
          <label className="copilot-input-label" htmlFor="copilot-question">
            Message Petra
          </label>
          <textarea
            id="copilot-question"
            rows={3}
            maxLength={8000}
            placeholder="Ask Petra or describe what you need…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="copilot-compose-actions">
            <small>Enter to send · Shift + Enter for a new line</small>
            <button
              type="submit"
              disabled={!ready || draft.trim() === ""}
              aria-label="Send message to Petra"
            >
              Send ↑
            </button>
          </div>
        </form>
        {busy ? (
          <div className="copilot-run-controls">
            <button type="button" onClick={() => controller.current?.abort()}>
              Stop receiving
            </button>
            <button
              type="button"
              onClick={() => {
                const runId = pending?.runId ?? active?.run_id;
                if (runId !== undefined)
                  void client()
                    .cancel(project.id, runId)
                    .then(() => setReload((value) => value + 1))
                    .catch((reason: unknown) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Cancellation was not confirmed.",
                      ),
                    );
              }}
            >
              Cancel answer
            </button>
          </div>
        ) : null}
        <button
          className="copilot-refresh"
          type="button"
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh conversation
        </button>
      </div>
    </section>
  );
};
