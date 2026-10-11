import { useEffect, useRef, useState } from "react";
import type { PetraProjectModelReadinessView } from "@petra/contracts";
import {
  projectModelResultPresentation,
  type ProjectModelResultPresentation,
  type PetraInteractionResult,
} from "@petra/adapters/ag-ui";
export {
  projectModelResultPresentation,
  type ProjectModelResultPresentation,
  type ProjectModelProgressItem,
} from "@petra/adapters/ag-ui";
import { Link } from "react-router";

import { PetraButton, PetraTextArea } from "../design-system/primitives.js";
import { StateNotice } from "../design-system/state.js";
import {
  createProjectModelRunIdentity,
  replayProjectModelInteraction,
  runProjectModelInteraction,
  type ProjectModelRunIdentity,
  type ProjectPetraReturnContext,
} from "./project-data.js";
import { PetraReviewInterrupt } from "./PetraReviewInterrupt.js";
import {
  projectReviewInterruptsFromInteraction,
  type ProjectReviewInterruptPresentation,
} from "./petra-review-interrupt.js";

const MODEL_DRAFT_PREFIX = "petra.model-draft.";
const MODEL_RUN_PREFIX = "petra.model-run.";
const CONNECTION_ID = /^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROTOCOL_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readable = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

export const projectModelDraftStorageKey = (projectId: string): string =>
  `${MODEL_DRAFT_PREFIX}${projectId}`;

export const projectModelRunStorageKey = (projectId: string): string =>
  `${MODEL_RUN_PREFIX}${projectId}`;

const sessionStorageOrUndefined = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export const readProjectModelRunIdentity = (
  projectId: string,
  storage: Pick<Storage, "getItem"> | undefined = sessionStorageOrUndefined(),
): ProjectModelRunIdentity | undefined => {
  if (storage === undefined) return undefined;
  try {
    const encoded = storage.getItem(projectModelRunStorageKey(projectId));
    if (encoded === null) return undefined;
    const value: unknown = JSON.parse(encoded);
    if (
      !isRecord(value) ||
      typeof value.threadId !== "string" ||
      !PROTOCOL_ID.test(value.threadId) ||
      typeof value.runId !== "string" ||
      !PROTOCOL_ID.test(value.runId) ||
      typeof value.connectionId !== "string" ||
      !CONNECTION_ID.test(value.connectionId)
    ) {
      return undefined;
    }
    return {
      threadId: value.threadId,
      runId: value.runId,
      connectionId: value.connectionId,
    };
  } catch {
    return undefined;
  }
};

const writeProjectModelRunIdentity = (
  projectId: string,
  identity: ProjectModelRunIdentity | undefined,
): void => {
  const storage = sessionStorageOrUndefined();
  if (storage === undefined) return;
  try {
    if (identity === undefined) {
      storage.removeItem(projectModelRunStorageKey(projectId));
    } else {
      storage.setItem(
        projectModelRunStorageKey(projectId),
        JSON.stringify(identity),
      );
    }
  } catch {
    // The composer remains usable in memory when session storage is blocked.
  }
};

const initialDraft = (
  projectId: string,
  readiness: PetraProjectModelReadinessView,
): string => {
  const storage = sessionStorageOrUndefined();
  if (storage !== undefined) {
    try {
      const retained = storage.getItem(projectModelDraftStorageKey(projectId));
      if (retained !== null) return retained;
    } catch {
      // Fall through to the exact registered prompt.
    }
  }
  return readiness.readiness.state === "ready"
    ? readiness.readiness.command.registered_prompt
    : "";
};

const ModelReadiness = ({
  readiness,
}: {
  readiness: PetraProjectModelReadinessView;
}): React.JSX.Element => {
  const state = readiness.readiness;
  if (state.state === "unavailable") {
    const roleMessage =
      state.role.state === "unavailable"
        ? state.role.message
        : `${state.role.label} remains selected.`;
    const contextMessage =
      state.context.state === "unavailable"
        ? state.context.message
        : "The exact Project context is bound.";
    return (
      <section
        className="petra-model-readiness"
        aria-labelledby="petra-model-readiness-title"
        data-readiness="unavailable"
      >
        <header>
          <p className="reference-panel-kicker">Certified model role</p>
          <h2 id="petra-model-readiness-title">Unavailable for this Project</h2>
        </header>
        <StateNotice
          announce
          notice={{
            tone: "caution",
            title: state.command.message,
            message: state.provider.message,
            recovery: `${roleMessage} ${contextMessage}`,
          }}
        />
        <ul className="petra-model-limitations" aria-label="Model limitations">
          {readiness.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section
      className="petra-model-readiness"
      aria-labelledby="petra-model-readiness-title"
      data-readiness="ready"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Certified model role</p>
          <h2 id="petra-model-readiness-title">{state.role.label}</h2>
          <p>{state.role.meaning}</p>
        </div>
        <span className="petra-model-readiness__state">Ready</span>
      </header>
      <dl className="petra-model-readiness__facts">
        <div>
          <dt>Provider</dt>
          <dd>
            {state.provider.message} {state.provider.model}
          </dd>
        </div>
        <div>
          <dt>Project context</dt>
          <dd>
            Project revision {state.context.binding.project_revision} · snapshot
            event {state.context.binding.snapshot_ref.event_position}
          </dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>Streaming response with durable replay</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>No authority effect</dd>
        </div>
      </dl>
      <details>
        <summary>Model identity and exact context</summary>
        <dl>
          <div>
            <dt>Registered role</dt>
            <dd>
              {state.role.semantic_key} · {state.role.deployment.provider_model}
            </dd>
          </div>
          <div>
            <dt>Role certification</dt>
            <dd>
              <code>{state.role.certification_ref.role_certification_id}</code>
            </dd>
          </div>
          <div>
            <dt>Context packet</dt>
            <dd>
              <code>{state.context.binding.context_packet_ref.record_id}</code>
            </dd>
          </div>
          <div>
            <dt>Evidence packet</dt>
            <dd>
              <code>{state.context.binding.evidence_packet_ref.record_id}</code>
            </dd>
          </div>
        </dl>
      </details>
      <ul className="petra-model-limitations" aria-label="Model limitations">
        {readiness.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
};

const ModelResponse = ({
  projectId,
  presentation,
}: {
  projectId: string;
  presentation: ProjectModelResultPresentation;
}): React.JSX.Element => (
  <section
    className="petra-model-response"
    aria-labelledby="petra-model-response-title"
    data-result-state={presentation.state}
  >
    <header>
      <p className="reference-panel-kicker">Certified response</p>
      <h2 id="petra-model-response-title">
        {presentation.state === "completed"
          ? "Grounded answer"
          : presentation.state === "failed"
            ? "Response failed"
            : presentation.state === "awaiting_response"
              ? "Response needs your decision"
              : "Response delivery interrupted"}
      </h2>
      <p role="status">{presentation.message}</p>
    </header>
    {presentation.answer === undefined ? null : (
      <div className="petra-model-response__answer">{presentation.answer}</div>
    )}
    {presentation.progress.length === 0 ? null : (
      <details>
        <summary>Response progress</summary>
        <ol className="petra-model-progress">
          {presentation.progress.map((item, index) => (
            <li key={`${index}:${item.label}`}>
              <strong>{item.label}</strong>
              <span>
                {item.stage === undefined ? "" : `${item.stage} · `}
                {item.status}
              </span>
            </li>
          ))}
        </ol>
      </details>
    )}
    {presentation.state !== "completed" ? null : (
      <div className="petra-model-response__basis">
        <section aria-labelledby="petra-model-origin-title">
          <h3 id="petra-model-origin-title">Origin and force</h3>
          <p>
            Advisory model output · no Project authority effect
            {presentation.executionSource === undefined
              ? ""
              : ` · ${presentation.executionSource}`}
          </p>
          <ul>
            {presentation.origins.map((origin) => (
              <li key={origin}>{readable(origin)}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="petra-model-references-title">
          <h3 id="petra-model-references-title">Exact references</h3>
          <dl>
            <div>
              <dt>Context packet</dt>
              <dd>{presentation.contextPacketId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Evidence packet</dt>
              <dd>{presentation.evidencePacketId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Grounded response</dt>
              <dd>{presentation.groundedResponseId ?? "Not persisted"}</dd>
            </div>
            <div>
              <dt>Model deployment</dt>
              <dd>{presentation.modelDeploymentId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Role certification</dt>
              <dd>{presentation.roleCertificationId ?? "Not returned"}</dd>
            </div>
            <div>
              <dt>Snapshot</dt>
              <dd>{presentation.snapshotId ?? "Not returned"}</dd>
            </div>
          </dl>
          {presentation.coverage === undefined ? null : (
            <p>{presentation.coverage}</p>
          )}
        </section>
        <section aria-labelledby="petra-model-effects-title">
          <h3 id="petra-model-effects-title">Work and Review effects</h3>
          {presentation.workUnitId === undefined ? (
            <p>No durable Work destination was returned.</p>
          ) : (
            <p>
              <Link
                className="reference-text-link"
                to={`/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(presentation.workUnitId)}`}
              >
                Open the exact Work result
              </Link>
            </p>
          )}
          <p>
            {presentation.reviewInterrupts === 0
              ? "No Review request was returned. The answer remains advisory."
              : `${presentation.reviewInterrupts} Review request${presentation.reviewInterrupts === 1 ? " is" : "s are"} waiting; no change is applied by the answer.`}
          </p>
        </section>
      </div>
    )}
  </section>
);

type ModelActivity = "idle" | "submitting" | "replaying";

export const PetraModelInteraction = ({
  projectId,
  readiness,
  returnContext,
  mode = "workspace",
  onResult,
}: {
  projectId: string;
  readiness: PetraProjectModelReadinessView;
  returnContext: ProjectPetraReturnContext;
  mode?: "agent" | "workspace";
  onResult?: (result: PetraInteractionResult) => void;
}): React.JSX.Element => {
  const [draft, setDraft] = useState(() => initialDraft(projectId, readiness));
  const [activity, setActivity] = useState<ModelActivity>("idle");
  const [presentation, setPresentation] =
    useState<ProjectModelResultPresentation>();
  const [reviewInterrupts, setReviewInterrupts] = useState<
    ProjectReviewInterruptPresentation[]
  >([]);
  const [interruptError, setInterruptError] = useState<string>();
  const [transportError, setTransportError] = useState<string>();
  const retainedIdentity = useRef<ProjectModelRunIdentity | undefined>(
    readProjectModelRunIdentity(projectId),
  );
  const automaticReplayKey = useRef("");
  const readyState =
    readiness.readiness.state === "ready" ? readiness.readiness : undefined;
  const ready = readyState !== undefined;
  const registeredPrompt = readyState?.command.registered_prompt;
  const promptMatches =
    registeredPrompt !== undefined && draft === registeredPrompt;
  const busy = activity !== "idle";
  const sendUnavailable = ready
    ? promptMatches
      ? retainedIdentity.current === undefined
        ? undefined
        : {
            reason:
              "This exact run already exists. Review its retained response or retry delivery if it is unavailable.",
          }
      : {
          reason:
            "The draft differs from the exact registered Project question.",
        }
    : {
        reason:
          "The certified role, provider, context, or command is unavailable.",
      };

  useEffect(() => {
    const storage = sessionStorageOrUndefined();
    if (storage === undefined) return;
    try {
      storage.setItem(projectModelDraftStorageKey(projectId), draft);
    } catch {
      // The visible draft remains in memory when session storage is blocked.
    }
  }, [draft, projectId]);

  const publish = (result: PetraInteractionResult): void => {
    const next = projectModelResultPresentation(result);
    try {
      setReviewInterrupts(
        projectReviewInterruptsFromInteraction(result, projectId),
      );
      setInterruptError(undefined);
    } catch (error) {
      setReviewInterrupts([]);
      setInterruptError(
        error instanceof Error
          ? error.message
          : "Petra could not verify the pending Review identity.",
      );
    }
    if (
      next.state === "completed" &&
      readyState !== undefined &&
      (next.modelDeploymentId !==
        readyState.role.deployment.model_deployment_id ||
        next.roleCertificationId !==
          readyState.role.certification_ref.role_certification_id ||
        next.snapshotId !== readyState.context.binding.snapshot_ref.snapshot_id)
    ) {
      setPresentation({
        state: "failed",
        message:
          "Petra withheld a response whose model, certification, or snapshot identity did not match the selected readiness binding.",
        progress: next.progress,
        origins: [],
        reviewInterrupts: next.reviewInterrupts,
      });
      setTransportError(undefined);
      return;
    }
    setPresentation(next);
    setTransportError(undefined);
    onResult?.(result);
  };

  const submit = async (forceNewRun = false): Promise<void> => {
    if (!ready || registeredPrompt === undefined || !promptMatches || busy) {
      return;
    }
    if (forceNewRun) {
      retainedIdentity.current = undefined;
      writeProjectModelRunIdentity(projectId, undefined);
    }
    const identity =
      retainedIdentity.current ?? createProjectModelRunIdentity();
    retainedIdentity.current = identity;
    writeProjectModelRunIdentity(projectId, identity);
    setActivity("submitting");
    setPresentation(undefined);
    setTransportError(undefined);
    try {
      publish(
        await runProjectModelInteraction(readiness, identity, registeredPrompt),
      );
    } catch {
      await replayIdentity(identity);
    } finally {
      setActivity("idle");
    }
  };

  const replayIdentity = async (
    identity: ProjectModelRunIdentity,
  ): Promise<void> => {
    setActivity("replaying");
    setTransportError(undefined);
    try {
      publish(await replayProjectModelInteraction(readiness, identity));
    } catch (error) {
      setTransportError(
        error instanceof Error
          ? error.message
          : "Petra could not replay the retained response.",
      );
    } finally {
      setActivity("idle");
    }
  };

  const replay = async (): Promise<void> => {
    const identity = retainedIdentity.current;
    if (identity === undefined || busy) return;
    await replayIdentity(identity);
  };

  useEffect(() => {
    const identity = retainedIdentity.current;
    if (!ready || identity === undefined) return;
    const key = `${projectId}:${identity.threadId}:${identity.runId}:${identity.connectionId}`;
    if (automaticReplayKey.current === key) return;
    automaticReplayKey.current = key;
    void replayIdentity(identity);
  }, [projectId, ready]);

  return (
    <>
      {mode === "agent" ? (
        <details className="reference-agent-readiness">
          <summary>
            <span>Petra</span>
            <span data-state={ready ? "ready" : "unavailable"}>
              {ready ? "Ready" : "Unavailable"}
            </span>
          </summary>
          <ModelReadiness readiness={readiness} />
        </details>
      ) : (
        <ModelReadiness readiness={readiness} />
      )}
      {presentation === undefined ? null : (
        <ModelResponse projectId={projectId} presentation={presentation} />
      )}
      {reviewInterrupts.map((interrupt) => (
        <PetraReviewInterrupt
          key={interrupt.interruptRef.interaction_interrupt_id}
          interrupt={interrupt}
        />
      ))}
      {interruptError === undefined ? null : (
        <StateNotice
          announce
          notice={{
            tone: "danger",
            title: "Review response unavailable",
            message: interruptError,
            recovery:
              "Retry the retained response. Petra will not compose a Review decision without the server-owned interrupt and ChangeSet identities.",
          }}
        />
      )}
      {transportError === undefined ? null : (
        <StateNotice
          announce
          notice={{
            tone: "danger",
            title: "Response delivery was not confirmed",
            message: transportError,
            recovery:
              "Your draft and exact run identity are preserved. Retry the retained response; closing this page does not cancel Work.",
          }}
        />
      )}
      <form
        className="petra-composer"
        data-operation-id="petra.ask"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <PetraTextArea
          label={
            mode === "agent"
              ? "Registered question"
              : "Certified Project question"
          }
          hint={
            ready
              ? mode === "agent"
                ? "Petra can send only this registered question. Edits stay as a draft for Objective review."
                : "This role accepts the exact Project-bound prompt registered by readiness. Your draft is retained in this browser through failure and reconnect."
              : mode === "agent"
                ? "Your draft stays here until Petra is available."
                : "Your unsent text remains local. No prompt can be sent until the server returns a ready certified role, provider, and context."
          }
          rows={mode === "agent" ? 2 : 5}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        {!ready || promptMatches ? null : (
          <p className="petra-composer__prompt-boundary" role="status">
            This draft is preserved locally. The certified role can answer only
            its exact registered Project question.{" "}
            <Link
              to={"/projects/" + encodeURIComponent(projectId) + "/brief"}
              state={{ agentObjectiveDraft: draft }}
            >
              Review this draft as a Project objective
            </Link>
            .
          </p>
        )}
        <div>
          <span
            id="petra-send-boundary"
            className={mode === "agent" ? "visually-hidden" : undefined}
          >
            {ready
              ? mode === "agent"
                ? "Petra will keep results and decisions in the Workspace."
                : "The certified response is advisory. Work and Review outcomes remain separate."
              : mode === "agent"
                ? "Petra is unavailable for this Project."
                : "The selected Project has no usable certified model command."}
          </span>
          <div className="petra-composer__actions">
            {ready && !promptMatches ? (
              <PetraButton
                type="button"
                variant="quiet"
                onClick={() => setDraft(registeredPrompt ?? "")}
              >
                Restore registered question
              </PetraButton>
            ) : null}
            {retainedIdentity.current === undefined ||
            (transportError === undefined &&
              interruptError === undefined) ? null : (
              <PetraButton
                type="button"
                busy={activity === "replaying"}
                busyLabel="Replaying exact response…"
                onClick={() => void replay()}
              >
                Retry delivery read
              </PetraButton>
            )}
            {presentation?.state === "failed" ? (
              <PetraButton
                type="button"
                variant="quiet"
                busy={activity === "submitting"}
                busyLabel="Starting a new response…"
                {...(promptMatches
                  ? {}
                  : {
                      unavailable: {
                        reason:
                          "Restore the exact registered Project question before starting another run.",
                      },
                    })}
                onClick={() => void submit(true)}
              >
                Try in a new run
              </PetraButton>
            ) : null}
            <PetraButton
              type="submit"
              variant="primary"
              busy={activity === "submitting"}
              busyLabel="Grounding response…"
              {...(sendUnavailable === undefined
                ? {}
                : { unavailable: sendUnavailable })}
              aria-describedby="petra-send-boundary"
            >
              Ask Petra
            </PetraButton>
          </div>
        </div>
      </form>
      {mode === "agent" ? null : (
        <footer className="petra-model-return">
          <Link className="reference-context-back" to={returnContext.path}>
            <span aria-hidden="true">←</span> Return to {returnContext.label}
          </Link>
          <span>
            The local draft remains scoped to this Project when you return.
          </span>
        </footer>
      )}
    </>
  );
};
