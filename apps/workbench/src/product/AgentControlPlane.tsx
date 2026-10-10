import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import type { PetraProjectModelReadinessView } from "@petra/contracts";

import { PetraModelInteraction } from "./PetraModelInteraction.js";
import { ProjectCopilotConversation } from "./ProjectCopilotConversation.js";
import {
  getLatestProjectPetraThread,
  getProjectModelReadiness,
  type ProjectPetraReturnContext,
} from "./project-data.js";
import type { PetraThread, ProjectRecord } from "./model.js";
import { projectInspectPath } from "./WorkspaceHost.js";

const AgentControlTargetContext = createContext<{
  target: HTMLElement | null;
  project?: ProjectRecord;
}>({ target: null });

const AgentInspectLink = ({
  project,
  title,
  operationIds,
  objectRef,
}: {
  project: ProjectRecord;
  title: string;
  operationIds: readonly string[];
  objectRef?: string;
}): React.JSX.Element => {
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return (
    <Link
      to={projectInspectPath(
        project.id,
        from,
        project.selection,
        operationIds,
        objectRef,
      )}
      data-operation-id="shell.inspect-context"
      aria-label={`Inspect ${title}`}
    >
      Inspect
    </Link>
  );
};

export const AgentControlPlaneProvider = ({
  target,
  project,
  children,
}: {
  target: HTMLElement | null;
  project?: ProjectRecord;
  children: ReactNode;
}): React.JSX.Element => (
  <AgentControlTargetContext.Provider
    value={{ target, ...(project === undefined ? {} : { project }) }}
  >
    {children}
  </AgentControlTargetContext.Provider>
);

/**
 * Keeps an owning route's command controller mounted with that route while
 * presenting its controls in the persistent Agent. With no browser target
 * (SSR and isolated component tests), the exact same controller renders in
 * place rather than creating a second command path.
 */
export const AgentControlPortal = ({
  title,
  description,
  operationIds,
  objectRef,
  children,
}: {
  title: string;
  description: string;
  operationIds: readonly string[];
  objectRef?: string;
  children: ReactNode;
}): React.JSX.Element => {
  const { target, project } = useContext(AgentControlTargetContext);
  const content = (
    <section
      className="reference-agent-control"
      data-operation-ids={operationIds.join(" ")}
      {...(objectRef === undefined ? {} : { "data-object-ref": objectRef })}
      aria-labelledby={`agent-control-${operationIds[0]?.replaceAll(".", "-") ?? "task"}`}
    >
      <details className="copilot-task-disclosure">
        <summary>
          <span className="reference-panel-kicker">Current task</span>
          <h2
            id={`agent-control-${operationIds[0]?.replaceAll(".", "-") ?? "task"}`}
          >
            {title}
          </h2>
        </summary>
        <p>{description}</p>
        {project === undefined ? null : (
          <AgentInspectLink
            project={project}
            title={title}
            operationIds={operationIds}
            {...(objectRef === undefined ? {} : { objectRef })}
          />
        )}
        <details className="reference-agent-control__disclosure" open>
          <summary>Open {title.toLowerCase()} controls</summary>
          <div className="reference-agent-control__body">{children}</div>
        </details>
        <details className="reference-agent-control__identity">
          <summary>Operation identity</summary>
          <p>
            {operationIds.map((operationId, index) => (
              <span key={operationId}>
                {index === 0 ? "" : " · "}
                <code>{operationId}</code>
              </span>
            ))}
          </p>
          {objectRef === undefined ? null : (
            <p>
              Object <code>{objectRef}</code>
            </p>
          )}
        </details>
      </details>
    </section>
  );
  return target === null ? content : createPortal(content, target);
};

type AgentConversationState =
  | { readonly state: "loading" }
  | {
      readonly state: "ready";
      readonly readiness: PetraProjectModelReadinessView;
      readonly thread?: PetraThread;
      readonly threadWarning?: string;
    }
  | { readonly state: "unavailable"; readonly message: string };

const recentMessages = (thread: PetraThread): PetraThread["messages"] =>
  thread.messages.slice(Math.max(0, thread.messages.length - 4));

export const AgentConversation = ({
  project,
  returnContext,
  onControlTarget,
}: {
  project: ProjectRecord;
  returnContext: ProjectPetraReturnContext;
  onControlTarget: (target: HTMLDivElement | null) => void;
}): React.JSX.Element => {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AgentConversationState>({
    state: "loading",
  });

  useEffect(() => {
    let current = true;
    if (reloadKey === 0) setState({ state: "loading" });
    void Promise.allSettled([
      getProjectModelReadiness(project.id),
      getLatestProjectPetraThread(project.id),
    ]).then(([readinessResult, threadResult]) => {
      if (!current) return;
      if (readinessResult.status === "rejected") {
        setState({
          state: "unavailable",
          message:
            readinessResult.reason instanceof Error
              ? readinessResult.reason.message
              : "Petra could not read the Project's registered model command.",
        });
        return;
      }
      setState({
        state: "ready",
        readiness: readinessResult.value,
        ...(threadResult.status === "fulfilled" &&
        threadResult.value !== undefined
          ? { thread: threadResult.value }
          : {}),
        ...(threadResult.status === "rejected"
          ? {
              threadWarning:
                threadResult.reason instanceof Error
                  ? threadResult.reason.message
                  : "The retained Project thread could not be read.",
            }
          : {}),
      });
    });
    return () => {
      current = false;
    };
  }, [project.id, reloadKey]);

  const thread = state.state === "ready" ? state.thread : undefined;

  return (
    <>
      <ProjectCopilotConversation project={project} />
      <div
        className="reference-agent-control-slot"
        ref={onControlTarget}
        aria-live="polite"
      />

      <details className="copilot-registered-synthesis">
        <summary>Registered evidence synthesis and earlier thread</summary>
        <section
          className="reference-agent-composer"
          aria-label="Ask and direct Petra"
          data-operation-id="petra.ask"
        >
          {state.state === "loading" ? (
            <p role="status">Preparing Petra…</p>
          ) : state.state === "unavailable" ? (
            <div className="reference-agent-composer__unavailable">
              <strong>Petra is not ready for requests</strong>
              <p>Petra could not load this Project's request capability.</p>
              <details className="reference-agent-technical-note">
                <summary>Technical reason</summary>
                <p>{state.message}</p>
              </details>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            <PetraModelInteraction
              projectId={project.id}
              readiness={state.readiness}
              returnContext={returnContext}
              mode="agent"
              onResult={() => setReloadKey((key) => key + 1)}
            />
          )}
        </section>

        <section
          className="reference-agent-thread"
          aria-labelledby="agent-thread-title"
          data-operation-id="petra.resume-thread"
          {...(thread === undefined ? {} : { "data-object-ref": thread.id })}
        >
          <header>
            <div>
              <p className="reference-panel-kicker">Working thread</p>
              <h2 id="agent-thread-title">
                {thread?.title ?? "Start with the outcome"}
              </h2>
            </div>
            {thread === undefined ? null : (
              <span>{thread.messages.length}</span>
            )}
          </header>
          {state.state === "loading" ? (
            <p role="status">Reading the exact Project thread…</p>
          ) : state.state === "unavailable" ? (
            <p role="alert">{state.message}</p>
          ) : thread === undefined ? (
            <p>
              Tell Petra what should happen next. Petra will ask before taking
              an action that needs your confirmation.
            </p>
          ) : (
            <>
              <p className="reference-agent-thread__representation">
                This retained read shows turn records. Exact message text is not
                available in this view.
              </p>
              <ol>
                {recentMessages(thread).map((message) => (
                  <li key={message.id} data-force={message.force}>
                    <article>
                      <header>
                        <strong>{message.speaker}</strong>
                        <span>{message.forceLabel}</span>
                      </header>
                      <p>{message.content}</p>
                      {message.references.map((reference) => (
                        <Link
                          key={reference.destination}
                          to={reference.destination}
                        >
                          {reference.label}
                        </Link>
                      ))}
                    </article>
                  </li>
                ))}
              </ol>
              {thread.messages.length <= 4 ? null : (
                <Link to={`/projects/${encodeURIComponent(project.id)}/petra`}>
                  Open all {thread.messages.length} recorded entries
                </Link>
              )}
              <details>
                <summary>Thread context</summary>
                <p>
                  <code>{thread.id}</code>
                </p>
                <p>{thread.snapshot}</p>
                <ul>
                  {thread.context.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {state.state === "ready" && state.threadWarning !== undefined ? (
            <details className="reference-agent-technical-note">
              <summary>Thread could not be refreshed</summary>
              <p role="status">{state.threadWarning}</p>
            </details>
          ) : null}
        </section>
      </details>
    </>
  );
};
