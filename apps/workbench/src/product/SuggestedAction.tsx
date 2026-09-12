import { useEffect, useRef, useState } from "react";
import type {
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import { Link } from "react-router";

import { PetraButton } from "../design-system/primitives.js";
import {
  ProjectDataError,
  createSuggestedActionInvocationRequest,
  getProjectSuggestedActionInvocation,
  invokeProjectSuggestedAction,
} from "./project-data.js";

export type SuggestedActionPresentationPath = "direct" | "conversational";

const plainLabel = (value: string): string => value.replaceAll("_", " ");

const titleLabel = (value: string): string =>
  plainLabel(value).replace(/^./u, (character) =>
    character.toLocaleUpperCase(),
  );

const destinationHref = (
  projectId: string,
  commandId: string,
  destination: PetraSuggestedActionInvocationView["content"]["history"]["destinations"][number],
): string => {
  const objectId = encodeURIComponent(destination.object_ref.object_id);
  if (destination.place_role === "work") {
    return `/projects/${encodeURIComponent(projectId)}/work/${objectId}`;
  }
  const query = new URLSearchParams({
    target_semantic_key: destination.object_ref.semantic_key,
    target_object_id: destination.object_ref.object_id,
    suggested_action_command_id: commandId,
  });
  return `/projects/${encodeURIComponent(projectId)}/history?${query}`;
};

const regenerationMatchesSelection = (
  current: PetraSuggestedActionViewV11,
  regenerated: PetraSuggestedActionViewV11,
): boolean =>
  regenerated.project_id === current.project_id &&
  regenerated.content.action.basis.inquiry_result_link_ref
    .project_inquiry_link_id ===
    current.content.action.basis.inquiry_result_link_ref
      .project_inquiry_link_id;

export const SuggestedWorkAction = ({
  projectId,
  actionView: suppliedActionView,
  initialInvocation,
  presentationPath,
}: {
  projectId: string;
  actionView: PetraSuggestedActionViewV11;
  initialInvocation?: PetraSuggestedActionInvocationView;
  presentationPath: SuggestedActionPresentationPath;
}): React.JSX.Element => {
  const [actionView, setActionView] = useState(suppliedActionView);
  const [invocation, setInvocation] = useState(initialInvocation);
  const [busy, setBusy] = useState<"invoke" | "refresh">();
  const [message, setMessage] = useState<string>();
  const retainedRequest = useRef<
    PetraSuggestedActionInvocationRequest | undefined
  >(undefined);
  useEffect(() => {
    setActionView(suppliedActionView);
    setInvocation(initialInvocation);
    setMessage(undefined);
    retainedRequest.current = undefined;
  }, [suppliedActionView, initialInvocation]);
  const { action, action_ref: actionRef, readiness } = actionView.content;
  const linkId = action.basis.inquiry_result_link_ref.project_inquiry_link_id;
  const invocationCommandId =
    invocation?.content.invocation.content.command_ref.command_id;
  const conversationalQuery = new URLSearchParams({
    inquiry_result_link_id: linkId,
    ...(invocationCommandId === undefined
      ? {}
      : { suggested_action_command_id: invocationCommandId }),
  });

  const invoke = async (): Promise<void> => {
    if (busy !== undefined || readiness.state !== "ready") return;
    setBusy("invoke");
    setMessage(undefined);
    const request =
      retainedRequest.current ??
      createSuggestedActionInvocationRequest(actionView);
    retainedRequest.current = request;
    try {
      const next = await invokeProjectSuggestedAction(
        projectId,
        actionRef.suggested_action_id,
        request,
      );
      setInvocation(next);
      setMessage(
        "The exact invocation was accepted. Work and delivery state remain server-owned.",
      );
    } catch (error) {
      if (
        error instanceof ProjectDataError &&
        error.suggestedActionRegeneration !== undefined &&
        regenerationMatchesSelection(
          actionView,
          error.suggestedActionRegeneration,
        )
      ) {
        setActionView(error.suggestedActionRegeneration);
        retainedRequest.current = undefined;
        setMessage(
          "The selected action changed. Review the regenerated server preview before starting Work.",
        );
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "The exact SuggestedAction invocation could not be confirmed.",
        );
      }
    } finally {
      setBusy(undefined);
    }
  };

  const refresh = async (): Promise<void> => {
    if (busy !== undefined || invocationCommandId === undefined) return;
    setBusy("refresh");
    setMessage(undefined);
    try {
      setInvocation(
        await getProjectSuggestedActionInvocation(
          projectId,
          invocationCommandId,
        ),
      );
      setMessage(
        "The exact invocation, Work, result, History, and recovery state were refreshed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The exact SuggestedAction invocation could not be refreshed.",
      );
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <article
      className="reference-suggested-work-action"
      data-presentation-path={presentationPath}
      data-contract-name={action.invocation.contract_name}
      data-command-name={action.invocation.command_name}
      aria-labelledby={`suggested-work-action-title-${presentationPath}`}
    >
      <header>
        <div>
          <p className="reference-contract-label">
            {presentationPath === "direct"
              ? "Exact Work preview"
              : "Petra action preview"}
          </p>
          <h3 id={`suggested-work-action-title-${presentationPath}`}>
            {action.title}
          </h3>
          <p>{action.reason}</p>
        </div>
        <span className="reference-status" data-state={readiness.state}>
          <span aria-hidden="true" className="reference-status__symbol">
            {readiness.state === "ready"
              ? "✓"
              : readiness.state === "stale"
                ? "!"
                : "×"}
          </span>
          {titleLabel(readiness.state)}
        </span>
      </header>

      <dl className="reference-suggested-action__summary">
        <div>
          <dt>Objective</dt>
          <dd>{action.objective.statement}</dd>
        </div>
        <div>
          <dt>Why now</dt>
          <dd>
            <strong>{titleLabel(readiness.reason_code)}</strong>
            <span>{readiness.reason}</span>
          </dd>
        </div>
        <div>
          <dt>Exact scope</dt>
          <dd>{action.scope.included}</dd>
        </div>
        <div>
          <dt>Expected result</dt>
          <dd>
            New {plainLabel(action.expected_result.result_kind)} · authority
            effect {action.expected_result.authority_effect} · reusable{" "}
            {action.expected_result.reusable ? "yes" : "no"}
          </dd>
        </div>
        <div>
          <dt>Time and cost</dt>
          <dd>
            {plainLabel(action.resources.duration)} ·{" "}
            {plainLabel(action.resources.cost)}
            <span>
              Hard wall-time limit {action.resources.limits.max_wall_time_ms} ms
            </span>
          </dd>
        </div>
        <div>
          <dt>Execution limit</dt>
          <dd>
            {action.resources.limits.max_attempts} attempt ·{" "}
            {action.resources.limits.max_parallelism} worker
            <span>
              {action.resources.limits.max_input_tokens ?? "No supplied"} input
              tokens ·{" "}
              {action.resources.limits.max_output_tokens ?? "No supplied"}{" "}
              output tokens
            </span>
          </dd>
        </div>
      </dl>

      <div className="reference-suggested-action__boundary">
        <strong>Work starts only after this exact command</strong>
        <p>
          {action.capability.command_name} ·{" "}
          {plainLabel(action.capability.approval)} · authority change{" "}
          {actionView.content.operation.authority_change}. Delivery abort{" "}
          {plainLabel(action.interrupt.delivery_abort)}; reconnect uses{" "}
          {plainLabel(action.interrupt.reconnect)}.
        </p>
        <p>
          Direct and conversational presentation use the same{" "}
          <code>{action.invocation.contract_name}</code> command; the browser
          does not supply Actor, grant, Project, Work, interaction, or trace
          identity.
        </p>
      </div>

      {readiness.missing_prerequisites.length === 0 ? null : (
        <div className="reference-suggested-action__prerequisites">
          <strong>Required before Work can start</strong>
          <ul>
            {readiness.missing_prerequisites.map((prerequisite) => (
              <li key={prerequisite}>{prerequisite}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="reference-suggested-action__scope">
        <summary>Exact scope, execution, and limitations</summary>
        <strong>Excluded</strong>
        <ul>
          {action.scope.excluded.map((exclusion) => (
            <li key={exclusion}>{exclusion}</li>
          ))}
        </ul>
        <strong>Execution authority</strong>
        <p>
          {action.execution.workflow_name}@{action.execution.workflow_version} ·{" "}
          {action.execution.validator} · network{" "}
          {plainLabel(action.execution.network_policy)}
        </p>
        <strong>Cancellation consequence</strong>
        <p>
          {action.cancellation.command_name} ·{" "}
          {plainLabel(action.cancellation.consequence)}
        </p>
        <strong>Contract limitations</strong>
        <ul>
          {actionView.content.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>

      <details className="reference-suggested-action__identity">
        <summary>Exact action and retained basis</summary>
        <dl>
          <div>
            <dt>SuggestedAction</dt>
            <dd>
              <code>{actionRef.suggested_action_id}</code> · revision{" "}
              {actionRef.revision}
              <span>Content hash {actionRef.content_hash}</span>
            </dd>
          </div>
          <div>
            <dt>Source result</dt>
            <dd>
              <code>{action.basis.source_result_ref.record_id}</code> · revision{" "}
              {action.basis.source_result_ref.revision}
              <span>
                Record hash {action.basis.source_result_ref.record_hash}
              </span>
            </dd>
          </div>
          <div>
            <dt>Context and evidence</dt>
            <dd>
              <code>{action.basis.context_packet_ref.record_id}</code> ·{" "}
              <code>{action.basis.evidence_packet_ref.record_id}</code>
              <span>Prompt hash {action.execution.prompt_hash}</span>
            </dd>
          </div>
          <div>
            <dt>Invocation posture</dt>
            <dd>
              {plainLabel(action.invocation.idempotency)} ·{" "}
              {plainLabel(action.invocation.path_convergence)}
              {readiness.state === "ready" ? (
                <span>
                  Grant reference {readiness.grant_ref.capability_grant_id} ·{" "}
                  record hash {readiness.grant_ref.record_hash}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </details>

      <div className="reference-suggested-action__actions">
        <PetraButton
          variant="primary"
          busy={busy === "invoke"}
          busyLabel="Starting exact Work…"
          {...(readiness.state === "ready"
            ? {}
            : {
                unavailable: {
                  reason: readiness.reason,
                  prerequisite: readiness.missing_prerequisites.join(" "),
                },
              })}
          onClick={() => void invoke()}
        >
          Start exact Work
        </PetraButton>
        {presentationPath === "direct" ? (
          <Link
            className="reference-text-link"
            to={`/projects/${encodeURIComponent(projectId)}/petra?${conversationalQuery}`}
          >
            Continue with Petra
          </Link>
        ) : (
          <Link
            className="reference-text-link"
            to={`/projects/${encodeURIComponent(projectId)}/brief?inquiry_result_link_id=${encodeURIComponent(linkId)}`}
          >
            Return to the same Brief action
          </Link>
        )}
      </div>

      {message === undefined ? null : (
        <p className="reference-suggested-action__message" role="status">
          {message}
        </p>
      )}

      {invocation === undefined ? null : (
        <SuggestedActionInvocationResult
          view={invocation}
          busy={busy === "refresh"}
          onRefresh={() => void refresh()}
        />
      )}
    </article>
  );
};

export const SuggestedActionInvocationResult = ({
  view,
  busy = false,
  onRefresh,
}: {
  view: PetraSuggestedActionInvocationView;
  busy?: boolean;
  onRefresh?: () => void;
}): React.JSX.Element => {
  const { content } = view;
  const { command_ref: commandRef } = content.invocation.content;
  const workId =
    content.work.state === "available"
      ? content.work.work_unit_ref.work_unit_id
      : content.work.expected_work_unit_id;
  return (
    <section
      className="reference-suggested-action__invocation"
      aria-labelledby="suggested-action-invocation-title"
      aria-live="polite"
      aria-busy={busy || undefined}
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Exact invocation</p>
          <h4 id="suggested-action-invocation-title">
            {titleLabel(content.operation_state)}
          </h4>
        </div>
        <PetraButton
          variant="quiet"
          busy={busy}
          busyLabel="Refreshing…"
          onClick={onRefresh}
        >
          Refresh exact state
        </PetraButton>
      </header>

      <dl>
        <div>
          <dt>Command receipt</dt>
          <dd>
            <code>{commandRef.command_id}</code> · {commandRef.command_name}
            <span>Fingerprint {commandRef.command_fingerprint}</span>
          </dd>
        </div>
        <div>
          <dt>Work identity</dt>
          <dd>
            <code>{workId}</code> · {plainLabel(content.work.state)}
            {content.work.state === "available" ? (
              <span>
                Revision {content.work.work_unit_ref.revision} ·{" "}
                {plainLabel(content.work.execution_state)}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>
            {content.result.state === "available" ? (
              <>
                <code>{content.result.result_ref.record_id}</code> · revision{" "}
                {content.result.result_ref.revision}
                <span>
                  Authority effect {content.result.authority_effect} · record
                  hash {content.result.result_ref.record_hash}
                </span>
              </>
            ) : (
              <>
                {titleLabel(content.result.state)}
                <span>{content.result.reason}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Delivery and reconnect</dt>
          <dd>
            <code>{content.interaction.protocol_run_id}</code> ·{" "}
            {plainLabel(content.interaction.durable_state)}
            <span>
              Delivery abort cancels Work{" "}
              {content.interrupt.delivery_abort_cancels_work ? "yes" : "no"} ·{" "}
              reconnect {plainLabel(content.interrupt.reconnect)}
            </span>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="suggested-action-history-title">
        <h5 id="suggested-action-history-title">Work History</h5>
        <p>{plainLabel(content.history.source)}</p>
        {content.history.work_revisions.length === 0 ? (
          <p>No canonical Work revision is registered yet.</p>
        ) : (
          <ol>
            {content.history.work_revisions.map((entry) => (
              <li
                key={`${entry.work_unit_ref.work_unit_id}:${entry.work_unit_ref.revision}`}
              >
                Revision {entry.work_unit_ref.revision} ·{" "}
                {plainLabel(entry.state)} · {entry.recorded_at}
              </li>
            ))}
          </ol>
        )}
        <div className="reference-suggested-action__destinations">
          {content.history.destinations.map((destination) => (
            <Link
              className="reference-text-link"
              key={`${destination.place_role}:${destination.object_ref.object_id}`}
              to={destinationHref(
                view.project_id,
                commandRef.command_id,
                destination,
              )}
              data-place-role={destination.place_role}
              data-task-intent={destination.task_intent}
            >
              Open {titleLabel(destination.place_role)} ·{" "}
              {destination.object_ref.object_id}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="suggested-action-recovery-title">
        <h5 id="suggested-action-recovery-title">Current recovery</h5>
        <p>{plainLabel(content.recovery.assessment)}</p>
        <ul className="reference-suggested-action__recovery">
          {content.recovery.actions.map((recovery) => (
            <li
              key={recovery.operation}
              data-operation={recovery.operation}
              data-eligibility={recovery.eligibility}
            >
              <strong>{titleLabel(recovery.operation)}</strong>
              <span>{titleLabel(recovery.eligibility)}</span>
              <p>{recovery.reason}</p>
              {recovery.command_name === undefined ? null : (
                <code>{recovery.command_name}</code>
              )}
            </li>
          ))}
        </ul>
      </section>

      <details className="reference-suggested-action__identity">
        <summary>Invocation authority and limitations</summary>
        <p>
          Actor <code>{commandRef.actor.actor_id}</code> · grant{" "}
          <code>{commandRef.capability_grant_id}</code> · authority event{" "}
          {content.authority.event_position} · stream revision{" "}
          {content.authority.stream_revision}
        </p>
        <ul>
          {content.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
    </section>
  );
};
