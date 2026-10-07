import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";

import { PetraMark } from "../design-system/brand.js";
import { StateNotice } from "../design-system/state.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import type {
  PetraCommunicationPlan,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import type {
  InquiryBranch,
  PetraThread,
  ProjectRecord,
  WorkProjectView,
  WorkStage,
  WorkUnit,
} from "./model.js";
import type {
  ProjectPetraData,
  ProjectWorkerOutputSelection,
  ProjectWorkDetailData,
} from "./project-data.js";
import {
  createProjectWorkOperationRequest,
  createProjectWorkResumeRequest,
  createProjectWorkStartAgainRequest,
  executeProjectWorkOperation,
  executeProjectWorkResume,
  executeProjectWorkStartAgain,
  readProjectWorkOperations,
  reconnectProjectWorkDelivery,
  replayProjectWorkDelivery,
  type ProjectWorkCommandOperation,
  type ProjectWorkCommandOptions,
  type ProjectWorkDeliveryObservation,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";
import { SuggestedWorkAction } from "./SuggestedAction.js";
import { AgentControlPortal } from "./AgentControlPlane.js";
import { useWorkspaceDraftState } from "./workspace-drafts.js";
import {
  FocusedGraphEntryLink,
  focusedGraphDefinitionRef,
  scientificFocusedGraphEntryDraft,
  scientificFocusedGraphSemantics,
} from "./focused-graph-entry.js";

const WorkState = ({ unit }: { unit: WorkUnit }) => (
  <span className="work-state" data-state={unit.execution}>
    <span aria-hidden="true">
      {unit.execution === "running"
        ? "↻"
        : unit.execution === "completed"
          ? "✓"
          : unit.execution === "awaiting_input"
            ? "!"
            : unit.execution === "failed"
              ? "×"
              : "·"}
    </span>
    {unit.executionLabel}
  </span>
);

const StageState = ({ stage }: { stage: WorkStage }) => (
  <span className="work-stage-state" data-state={stage.state}>
    <span aria-hidden="true">
      {stage.state === "completed"
        ? "✓"
        : stage.state === "running"
          ? "↻"
          : stage.state === "awaiting_input"
            ? "!"
            : stage.state === "failed"
              ? "×"
              : "·"}
    </span>
    {stage.stateLabel}
  </span>
);

const BranchCard = ({
  project,
  branch,
  work,
}: {
  project: ProjectRecord;
  branch: InquiryBranch;
  work: WorkProjectView;
}) => {
  const units = branch.workIds
    .map((workId) => work.units.find((unit) => unit.id === workId))
    .filter((unit): unit is WorkUnit => unit !== undefined);

  return (
    <article
      className="inquiry-branch"
      id={`inquiry-${branch.id}`}
      data-recommended={branch.recommended || undefined}
    >
      <header>
        <div>
          <p>{branch.kind}</p>
          <h3>{branch.label}</h3>
        </div>
        <span>{branch.state}</span>
      </header>
      <p>{branch.summary}</p>
      <dl>
        <div>
          <dt>Dependency</dt>
          <dd>{branch.dependency}</dd>
        </div>
        <div>
          <dt>Consequence</dt>
          <dd>{branch.consequence}</dd>
        </div>
      </dl>
      {branch.rationale === undefined ? null : (
        <div className="inquiry-branch__rationale">
          <strong>Why Petra recommends this first</strong>
          <p>{branch.rationale}</p>
        </div>
      )}
      <div className="inquiry-branch__work">
        <strong>
          {branch.workIds.length === 0
            ? "No operational Work linked"
            : `${branch.workIds.length} linked Work ${branch.workIds.length === 1 ? "task" : "tasks"}`}
        </strong>
        {branch.workIds.length === 0 ? (
          <p>This inquiry path remains useful without a running task.</p>
        ) : units.length === 0 ? (
          <p>Linked Work is outside the current bounded Work page.</p>
        ) : (
          <>
            <ul>
              {units.map((unit) => (
                <li key={unit.id}>
                  <Link to={`/projects/${project.id}/work/${unit.id}`}>
                    {unit.objective}
                  </Link>
                  <WorkState unit={unit} />
                </li>
              ))}
            </ul>
            {units.length === branch.workIds.length ? null : (
              <p>Additional linked Work is outside the current bounded page.</p>
            )}
          </>
        )}
      </div>
    </article>
  );
};

export const WorkCollectionSurface = ({
  project,
  work,
}: {
  project: ProjectRecord;
  work?: WorkProjectView | undefined;
}): React.JSX.Element => {
  const units = work?.units ?? [];
  const attention = units.filter(
    (unit) =>
      unit.execution === "awaiting_input" ||
      unit.execution === "failed" ||
      unit.execution === "queued",
  );
  const active = units.filter((unit) => unit.execution === "running");
  const terminal = units.filter((unit) =>
    ["completed", "cancelled"].includes(unit.execution),
  );
  const recommendedBranch = work?.branches.find((branch) => branch.recommended);
  const nextPage =
    work?.page?.hasMore === true && work.page.nextCursor !== undefined
      ? new URLSearchParams({
          limit: String(work.query?.limit ?? 50),
          cursor: work.page.nextCursor,
          ...(work.query?.state === undefined
            ? {}
            : { state: work.query.state }),
        })
      : undefined;

  return (
    <main className="reference-surface" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Work · current Project</p>
          <h1>Work</h1>
          <p className="reference-lede">
            Follow tasks that need input, active Work, and completed results.
          </p>
        </div>
      </header>

      {work === undefined ||
      (work.branches.length === 0 && units.length === 0) ? (
        <section className="reference-empty" aria-labelledby="work-empty-title">
          <PetraMark />
          <h2 id="work-empty-title">No Work has been registered</h2>
          <p>
            {project.focus.value} remains a Project focus. Petra will not invent
            an operational task from it.
          </p>
        </section>
      ) : (
        <>
          {work.inquiryLimitation === undefined ? null : (
            <StateNotice
              notice={{
                tone: "caution",
                title: "Inquiry paths unavailable",
                message: work.inquiryLimitation,
                recovery:
                  "You can still inspect and manage each exact Work task. Return later to inspect inquiry links after the Project profile registers that mapping.",
              }}
            />
          )}
          {recommendedBranch === undefined ? null : (
            <section
              className="work-recommendation"
              aria-labelledby="work-recommendation-title"
            >
              <span aria-hidden="true">↳</span>
              <div>
                <p className="reference-panel-kicker">
                  Recommended inquiry path
                </p>
                <h2 id="work-recommendation-title">
                  Resolve {recommendedBranch.label} first
                </h2>
                <p>{recommendedBranch.rationale}</p>
                <p>
                  Other paths stay available. Choosing one does not cancel,
                  reject, or weaken this path.
                </p>
              </div>
              <Link
                className="reference-primary-link"
                to={`/projects/${project.id}/work/${recommendedBranch.workIds[0]}`}
              >
                Open required Work
              </Link>
            </section>
          )}

          <section className="work-units" aria-labelledby="work-units-title">
            <header>
              <div>
                <p className="reference-panel-kicker">Operational records</p>
                <h2 id="work-units-title">Work tasks</h2>
              </div>
              <span>
                {units.length}
                {work?.page === undefined ? "" : ` of ${work.page.totalCount}`}
              </span>
            </header>
            <WorkGroup
              label="Needs attention"
              units={attention}
              project={project}
            />
            <WorkGroup label="Active" units={active} project={project} />
            <WorkGroup label="Completed" units={terminal} project={project} />
            {nextPage === undefined ? null : (
              <Link className="reference-text-link" to={`?${nextPage}`}>
                Next Work page
              </Link>
            )}
          </section>

          {work.branches.length === 0 ? null : (
            <section
              className="inquiry-branches"
              aria-labelledby="inquiry-branches-title"
            >
              <header>
                <div>
                  <p className="reference-panel-kicker">Project meaning</p>
                  <h2 id="inquiry-branches-title">Parallel inquiry paths</h2>
                </div>
                <span>{work.branches.length}</span>
              </header>
              <p className="inquiry-branches__explanation">
                These paths organize the Project's open questions. They are not
                hypotheses by default, and they are not Work execution stages. A
                path may link to several tasks or none.
              </p>
              <div className="inquiry-branches__grid">
                {work.branches.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    project={project}
                    branch={branch}
                    work={work}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
};

const WorkGroup = ({
  label,
  units,
  project,
}: {
  label: string;
  units: WorkUnit[];
  project: ProjectRecord;
}) => (
  <section
    className="work-group"
    aria-labelledby={`work-group-${label.replaceAll(" ", "-")}`}
  >
    <header>
      <h3 id={`work-group-${label.replaceAll(" ", "-")}`}>{label}</h3>
      <span>{units.length}</span>
    </header>
    {units.length === 0 ? (
      <p>No tasks in this group.</p>
    ) : (
      <ol>
        {units.map((unit) => (
          <li key={unit.id}>
            <article className="work-row">
              <div>
                <h4>
                  <Link to={`/projects/${project.id}/work/${unit.id}`}>
                    {unit.objective}
                  </Link>
                </h4>
                <p>{unit.expectedOutcome}</p>
              </div>
              <div>
                <span>Current stage</span>
                <strong>
                  {unit.stages.find((stage) => stage.id === unit.currentStageId)
                    ?.label ?? "No current stage"}
                </strong>
              </div>
              <WorkState unit={unit} />
              <span>{unit.elapsed}</span>
            </article>
          </li>
        ))}
      </ol>
    )}
  </section>
);

export const WorkCollectionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const work = useLoaderData<WorkProjectView>();
  return <WorkCollectionSurface project={project} work={work} />;
};

type RetainedWorkRequest = {
  fingerprint: string;
  request: PetraProjectWorkOperationRequest;
};

type RetainedWorkResumeRequest = {
  fingerprint: string;
  request: PetraProjectWorkResumeRequest;
};

type RetainedWorkStartAgainRequest = {
  fingerprint: string;
  request: PetraProjectWorkStartAgainRequest;
};

const workOperationLabel: Record<
  PetraProjectWorkOperationsView["controls"][number]["operation"],
  string
> = {
  start: "Start work",
  answer_input: "Answer required input",
  steer: "Steer work",
  prioritize: "Set priority",
  detach: "Leave running",
  reconnect: "Reconnect",
  replay: "Replay delivery",
  cancel: "Cancel work",
  retry: "Retry failed work",
  resume: "Resume work",
  start_again: "Start again",
};

const priorityLabel: Record<
  NonNullable<PetraProjectWorkOperationRequest["priority"]>,
  string
> = {
  user_blocking: "Blocking this task",
  user_visible: "Keep visible",
  normal: "Normal",
  opportunistic: "When capacity allows",
};

const workControl = (
  view: PetraProjectWorkOperationsView,
  operation: PetraProjectWorkOperationsView["controls"][number]["operation"],
) => view.controls.find((control) => control.operation === operation);

const unavailableFor = (
  view: PetraProjectWorkOperationsView,
  operation: PetraProjectWorkOperationsView["controls"][number]["operation"],
): { reason: string; prerequisite?: string } | undefined => {
  const control = workControl(view, operation);
  const queryOnlyDelivery =
    (operation === "reconnect" || operation === "replay") &&
    control?.state === "query_only";
  return control?.state === "available" ||
    control?.state === "client_owned" ||
    queryOnlyDelivery
    ? undefined
    : {
        reason: control?.reason ?? "This operation is not registered.",
      };
};

const unavailableForResume = (
  view: PetraProjectWorkOperationsView,
): { reason: string; prerequisite?: string } | undefined => {
  const assessed = unavailableFor(view, "resume");
  if (assessed !== undefined) return assessed;
  if (view.resume_binding === undefined) {
    return {
      reason:
        "The server has not supplied the exact retained checkpoint binding required to resume this task.",
    };
  }
  return undefined;
};

const unavailableForStartAgain = (
  view: PetraProjectWorkOperationsView,
): { reason: string; prerequisite?: string } | undefined => {
  const assessed = unavailableFor(view, "start_again");
  if (assessed !== undefined) return assessed;
  if (view.start_again_binding === undefined) {
    return {
      reason:
        "The server has not supplied the exact fresh-input registration required to start this task again.",
    };
  }
  return undefined;
};

const withUnavailable = (
  unavailable: { reason: string; prerequisite?: string } | undefined,
): { unavailable: { reason: string; prerequisite?: string } } | object =>
  unavailable === undefined ? {} : { unavailable };

export interface ProjectWorkStartAgainOutcome {
  readonly projectId: string;
  readonly receiptId: string;
  readonly summary: string;
  readonly priorWorkUnitId: string;
  readonly priorWorkAttempt: number;
  readonly priorLineageAttempt: number;
  readonly priorInputManifestId: string;
  readonly freshInputManifestId: string;
  readonly freshInputSummary: string;
  readonly newWorkUnitId: string;
  readonly newWorkAttempt: number;
  readonly newLineageAttempt: number;
}

const startAgainOutcome = (
  receipt: PetraProjectWorkStartAgainReceipt,
): ProjectWorkStartAgainOutcome => ({
  projectId: receipt.project_id,
  receiptId: receipt.receipt_id,
  summary: receipt.effect.summary,
  priorWorkUnitId: receipt.prior_attempt.work_unit_ref.work_unit_id,
  priorWorkAttempt: receipt.prior_attempt.work_attempt,
  priorLineageAttempt: receipt.prior_attempt.lineage_attempt,
  priorInputManifestId:
    receipt.fresh_input.prior_input_manifest_ref.worker_input_manifest_id,
  freshInputManifestId:
    receipt.fresh_input.fresh_input_manifest_ref.worker_input_manifest_id,
  freshInputSummary: receipt.fresh_input.summary,
  newWorkUnitId: receipt.new_attempt.work_unit_ref.work_unit_id,
  newWorkAttempt: receipt.new_attempt.work_attempt,
  newLineageAttempt: receipt.new_attempt.lineage_attempt,
});

const WorkStartAgainOutcome = ({
  outcome,
}: {
  outcome: ProjectWorkStartAgainOutcome;
}): React.JSX.Element => (
  <section
    className="work-start-again-outcome"
    aria-labelledby="work-start-again-outcome-title"
    role="status"
  >
    <p className="reference-panel-kicker">Registered fresh execution</p>
    <h2 id="work-start-again-outcome-title">Started again with fresh input</h2>
    <p>{outcome.summary}</p>
    <dl>
      <div>
        <dt>Prior attempt retained</dt>
        <dd>
          Attempt {outcome.priorWorkAttempt} · lineage attempt{" "}
          {outcome.priorLineageAttempt}
          <code>{outcome.priorWorkUnitId}</code>
        </dd>
      </div>
      <div>
        <dt>Fresh immutable input</dt>
        <dd>
          {outcome.freshInputSummary}
          <code>{outcome.freshInputManifestId}</code>
        </dd>
      </div>
      <div>
        <dt>Output reuse</dt>
        <dd>
          None. Prior outputs, history, and incurred use remain with the prior
          Work.
        </dd>
      </div>
      <div>
        <dt>New linked Work</dt>
        <dd>
          Attempt {outcome.newWorkAttempt} · lineage attempt{" "}
          {outcome.newLineageAttempt}
          <code>{outcome.newWorkUnitId}</code>
        </dd>
      </div>
    </dl>
    <details>
      <summary>Exact transition identities</summary>
      <dl>
        <div>
          <dt>Prior input manifest</dt>
          <dd>
            <code>{outcome.priorInputManifestId}</code>
          </dd>
        </div>
        <div>
          <dt>Start again receipt</dt>
          <dd>
            <code>{outcome.receiptId}</code>
          </dd>
        </div>
      </dl>
    </details>
  </section>
);

const WorkOperationControls = ({
  project,
  initialView,
  onOperationApplied,
}: {
  project: ProjectRecord;
  initialView: PetraProjectWorkOperationsView;
  onOperationApplied?: () => void;
}): React.JSX.Element => {
  const navigate = useNavigate();
  const [view, setView] = useState(initialView);
  const draftKey = `work-operation:${project.id}:${initialView.work_unit_ref.work_unit_id}`;
  const [instruction, setInstruction] = useWorkspaceDraftState(
    `${draftKey}:instruction`,
    "",
  );
  const [priority, setPriority] = useWorkspaceDraftState<
    NonNullable<PetraProjectWorkOperationRequest["priority"]>
  >(`${draftKey}:priority`, initialView.plan.selected_priority);
  const [cancelReason, setCancelReason] = useWorkspaceDraftState(
    `${draftKey}:cancel-reason`,
    "This task is no longer needed for the current Project decision.",
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pending, setPending] = useState<string>();
  const [receipt, setReceipt] = useWorkspaceDraftState<
    PetraProjectWorkOperationReceipt | undefined
  >(`${draftKey}:last-operation-receipt`, undefined);
  const [resumeReceipt, setResumeReceipt] = useWorkspaceDraftState<
    PetraProjectWorkResumeReceipt | undefined
  >(`${draftKey}:last-resume-receipt`, undefined);
  const [startAgainReceipt, setStartAgainReceipt] = useWorkspaceDraftState<
    PetraProjectWorkStartAgainReceipt | undefined
  >(`${draftKey}:last-start-again-receipt`, undefined);
  const [delivery, setDelivery] = useState<
    readonly ProjectWorkDeliveryObservation[]
  >([]);
  const [deliveryError, setDeliveryError] = useState<string>();
  const deliveryAttempted = useRef<string | undefined>(undefined);
  const [error, setError] = useState<{
    message: string;
    recovery: string;
  }>();
  const retained = useRef<RetainedWorkRequest | undefined>(undefined);
  const retainedResume = useRef<RetainedWorkResumeRequest | undefined>(
    undefined,
  );
  const retainedStartAgain = useRef<RetainedWorkStartAgainRequest | undefined>(
    undefined,
  );

  useEffect(() => {
    setView(initialView);
  }, [initialView.content_hash]);

  const execute = async (
    operation: ProjectWorkCommandOperation,
    options: ProjectWorkCommandOptions = {},
  ): Promise<void> => {
    const fingerprint = JSON.stringify({
      operation,
      options,
      work: view.work_unit_ref,
      plan: view.plan.revision,
    });
    const retainedRequest = retained.current;
    const request =
      retainedRequest?.fingerprint === fingerprint
        ? retainedRequest.request
        : createProjectWorkOperationRequest(view, operation, options);
    retained.current = { fingerprint, request };
    setPending(operation);
    setError(undefined);
    setDelivery([]);
    setResumeReceipt(undefined);
    setStartAgainReceipt(undefined);
    try {
      const nextReceipt = await executeProjectWorkOperation(
        view.project_id,
        view.work_unit_ref.work_unit_id,
        request,
      );
      const refreshed = await readProjectWorkOperations(
        view.project_id,
        view.work_unit_ref.work_unit_id,
      );
      setReceipt(nextReceipt);
      setView(refreshed);
      onOperationApplied?.();
      if (operation === "prioritize" || operation === "steer") {
        setPriority(refreshed.plan.selected_priority);
      }
      setInstruction("");
      setConfirmingCancel(false);
      retained.current = undefined;
    } catch (caught) {
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "Petra could not complete this exact Work operation.",
        recovery:
          "Your instruction and exact command identity are retained. Resolve the stated condition, then try the same operation again.",
      });
    } finally {
      setPending(undefined);
    }
  };

  const executeResume = async (): Promise<void> => {
    const fingerprint = JSON.stringify({
      project: view.project_id,
      binding: view.resume_binding,
    });
    const retainedRequest = retainedResume.current;
    let request: PetraProjectWorkResumeRequest;
    try {
      request =
        retainedRequest?.fingerprint === fingerprint
          ? retainedRequest.request
          : createProjectWorkResumeRequest(view);
    } catch (caught) {
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "Petra could not bind Resume to this exact checkpoint.",
        recovery:
          "Refresh this task to obtain the current server assessment. Resume stays unavailable without an exact registered checkpoint binding.",
      });
      return;
    }
    retainedResume.current = { fingerprint, request };
    setPending("resume");
    setError(undefined);
    setReceipt(undefined);
    setDelivery([]);
    setStartAgainReceipt(undefined);
    try {
      const nextReceipt = await executeProjectWorkResume(
        view.project_id,
        view.work_unit_ref.work_unit_id,
        request,
      );
      const refreshed = await readProjectWorkOperations(
        view.project_id,
        view.work_unit_ref.work_unit_id,
      );
      setResumeReceipt(nextReceipt);
      setView(refreshed);
      onOperationApplied?.();
      retainedResume.current = undefined;
    } catch (caught) {
      let refreshed = view;
      try {
        refreshed = await readProjectWorkOperations(
          view.project_id,
          view.work_unit_ref.work_unit_id,
        );
        setView(refreshed);
      } catch {
        // Preserve the last verified assessment when refresh is unavailable.
      }
      const currentResume = workControl(refreshed, "resume");
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "Petra could not complete this exact checkpoint Resume.",
        recovery:
          currentResume?.state === "available" &&
          refreshed.resume_binding !== undefined
            ? "The exact command identity and checkpoint binding are retained. Try Resume again to reconcile an unknown result without creating a second effect."
            : `The server assessment was refreshed. ${currentResume?.reason ?? "Resume is no longer available for this Work revision."} No new attempt was inferred.`,
      });
    } finally {
      setPending(undefined);
    }
  };

  const executeStartAgain = async (): Promise<void> => {
    const fingerprint = JSON.stringify({
      project: view.project_id,
      binding: view.start_again_binding,
    });
    const retainedRequest = retainedStartAgain.current;
    let request: PetraProjectWorkStartAgainRequest;
    try {
      request =
        retainedRequest?.request ?? createProjectWorkStartAgainRequest(view);
    } catch (caught) {
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "Petra could not bind Start again to this exact fresh-input transition.",
        recovery:
          "Refresh this task to obtain the current server assessment. Start again stays unavailable without an exact registered fresh-input binding.",
      });
      return;
    }
    retainedStartAgain.current = { fingerprint, request };
    setPending("start_again");
    setError(undefined);
    setReceipt(undefined);
    setResumeReceipt(undefined);
    setDelivery([]);
    setStartAgainReceipt(undefined);
    try {
      const nextReceipt = await executeProjectWorkStartAgain(
        view.project_id,
        view.work_unit_ref.work_unit_id,
        request,
      );
      retainedStartAgain.current = undefined;
      setStartAgainReceipt(nextReceipt);
      const returnPath = `/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(nextReceipt.prior_attempt.work_unit_ref.work_unit_id)}`;
      const destination = new URLSearchParams({
        return_to: returnPath,
        return_label: "prior Work task",
        return_focus: "work-control-boundary",
      });
      await navigate(
        `/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(nextReceipt.destination.work_unit_ref.work_unit_id)}?${destination}#work-control-boundary`,
        { state: { startAgainOutcome: startAgainOutcome(nextReceipt) } },
      );
    } catch (caught) {
      try {
        setView(
          await readProjectWorkOperations(
            view.project_id,
            view.work_unit_ref.work_unit_id,
          ),
        );
      } catch {
        // Preserve the last verified assessment when refresh is unavailable.
      }
      const retainedExactRequest = retainedStartAgain.current !== undefined;
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "Petra could not confirm this exact Start again transition.",
        recovery: retainedExactRequest
          ? "The exact command identity and fresh-input registration are retained. Retry Start again to reconcile the same command without creating a second effect."
          : "The Start again effect was recorded, but its exact Work destination did not open. Use the new linked Work destination below; do not issue another command.",
      });
    } finally {
      setPending(undefined);
    }
  };

  const restoreDelivery = async (): Promise<void> => {
    if (view.delivery.state !== "durable") return;
    setPending("delivery");
    setDeliveryError(undefined);
    try {
      const reconnected = await reconnectProjectWorkDelivery(view);
      setDelivery([reconnected]);
      const replayed = await replayProjectWorkDelivery(view);
      setDelivery([reconnected, replayed]);
      setView(
        await readProjectWorkOperations(
          view.project_id,
          view.work_unit_ref.work_unit_id,
        ),
      );
    } catch (caught) {
      setDeliveryError(
        caught instanceof Error
          ? caught.message
          : "Petra could not restore this exact Work delivery.",
      );
    } finally {
      setPending(undefined);
    }
  };

  useEffect(() => {
    if (view.delivery.state !== "durable") return;
    const key = `${view.project_id}:${view.work_unit_ref.work_unit_id}:${view.delivery.protocol_run_id}`;
    if (deliveryAttempted.current === key) return;
    deliveryAttempted.current = key;
    void restoreDelivery();
  }, [view]);

  const pendingInputs = view.required_inputs.filter(
    (input) => input.state === "pending",
  );
  const resultPath = (
    result: PetraProjectWorkOperationsView["results"][number],
  ): string | undefined => {
    if (result.destination.state !== "available") return undefined;
    const query = new URLSearchParams({
      semanticKey: result.destination.target_ref.semantic_key,
      objectId: result.destination.target_ref.object_id,
      revision: String(result.destination.target_ref.revision),
      taskIntent: "inspect",
      contentHash: result.record_ref.content_hash,
      recordHash: result.record_ref.record_hash,
    });
    return `/projects/${encodeURIComponent(project.id)}/locate?${query}`;
  };

  const executionActions = [
    {
      operation: "start",
      label: "Start work",
      busyLabel: "Starting work",
      unavailable: unavailableFor(view, "start"),
      onClick: () => void execute("start"),
    },
    {
      operation: "retry",
      label: "Retry failed work",
      busyLabel: "Retrying work",
      unavailable: unavailableFor(view, "retry"),
      onClick: () => void execute("retry"),
    },
    {
      operation: "resume",
      label: "Resume work",
      busyLabel: "Resuming work",
      unavailable: unavailableForResume(view),
      onClick: () => void executeResume(),
    },
    {
      operation: "start_again",
      label:
        retainedStartAgain.current === undefined
          ? "Start again"
          : "Retry Start again",
      busyLabel: "Starting again",
      unavailable:
        retainedStartAgain.current === undefined
          ? unavailableForStartAgain(view)
          : undefined,
      onClick: () => void executeStartAgain(),
    },
  ].sort(
    (left, right) =>
      Number(left.unavailable !== undefined) -
      Number(right.unavailable !== undefined),
  );
  const availableExecutionActions = executionActions.filter(
    (action) => action.unavailable === undefined,
  );
  const unavailableExecutionActions = executionActions.filter(
    (action) => action.unavailable !== undefined,
  );

  return (
    <>
      {pendingInputs.map((input) => (
        <section
          className="work-required-input"
          id="required-input"
          tabIndex={-1}
          aria-labelledby={`work-input-${input.input_request_ref.input_request_id}`}
          key={input.input_request_ref.input_request_id}
        >
          <span aria-hidden="true">!</span>
          <div>
            <p className="reference-panel-kicker">
              Required input · {input.kind.replaceAll("_", " ")}
            </p>
            <h2 id={`work-input-${input.input_request_ref.input_request_id}`}>
              {input.question}
            </h2>
            <p>{input.consequence}</p>
            <p className="work-command-boundary">
              Choose one registered response. Petra records it once against
              input revision {input.input_request_ref.revision}; it does not
              grant domain authority.
            </p>
            <PetraButtonGroup label="Required input responses">
              {input.response_options.map((response, index) => (
                <PetraButton
                  key={response}
                  variant={index === 0 ? "primary" : "secondary"}
                  busy={pending === "answer_input"}
                  busyLabel="Recording input"
                  onClick={() =>
                    void execute("answer_input", {
                      inputRequestRef: input.input_request_ref,
                      response,
                    })
                  }
                >
                  {response}
                </PetraButton>
              ))}
            </PetraButtonGroup>
          </div>
        </section>
      ))}

      <section className="work-controls" aria-labelledby="work-controls-title">
        <div className="work-controls__heading">
          <p className="reference-panel-kicker">Operational controls</p>
          <h2 id="work-controls-title">Manage this task</h2>
          <a className="reference-text-link" href="#work-execution-controls">
            Go to execution controls
          </a>
          <p id="work-control-boundary" tabIndex={-1}>
            Commands change Work state only. Project authority remains
            unchanged.
          </p>
        </div>

        <div className="work-controls__commands">
          <PetraButtonGroup
            id="work-execution-controls"
            tabIndex={-1}
            label="Execution controls"
          >
            {availableExecutionActions.map((action, index) => (
              <PetraButton
                key={action.operation}
                variant={index === 0 ? "primary" : "secondary"}
                busy={pending === action.operation}
                busyLabel={action.busyLabel}
                onClick={action.onClick}
              >
                {action.label}
              </PetraButton>
            ))}
          </PetraButtonGroup>
          {unavailableExecutionActions.length === 0 ? null : (
            <details className="work-controls__unavailable">
              <summary>
                Other execution actions and reasons (
                {unavailableExecutionActions.length})
              </summary>
              <PetraButtonGroup label="Unavailable execution controls">
                {unavailableExecutionActions.map((action) => (
                  <PetraButton
                    key={action.operation}
                    variant="secondary"
                    {...withUnavailable(action.unavailable)}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </PetraButton>
                ))}
              </PetraButtonGroup>
            </details>
          )}

          <form
            className="work-steering"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void execute("steer", { instruction, priority });
            }}
          >
            <PetraTextArea
              label="Instruction for the next scheduling boundary"
              hint={view.plan.effect_boundary.replaceAll("_", " ")}
              rows={3}
              maxLength={4_000}
              value={instruction}
              onChange={(event) => setInstruction(event.currentTarget.value)}
            />
            <label className="work-priority-field">
              <span>Scheduling priority</span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.currentTarget.value as NonNullable<
                      PetraProjectWorkOperationRequest["priority"]
                    >,
                  )
                }
              >
                {Object.entries(priorityLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <PetraButtonGroup label="Plan controls">
              <PetraButton
                type="submit"
                busy={pending === "steer"}
                busyLabel="Recording instruction"
                {...withUnavailable(
                  instruction.trim().length === 0
                    ? { reason: "Write a clear instruction first." }
                    : unavailableFor(view, "steer"),
                )}
              >
                Steer work
              </PetraButton>
              <PetraButton
                type="button"
                busy={pending === "prioritize"}
                busyLabel="Setting priority"
                {...withUnavailable(unavailableFor(view, "prioritize"))}
                onClick={() => void execute("prioritize", { priority })}
              >
                Set priority
              </PetraButton>
            </PetraButtonGroup>
          </form>

          <div className="work-delivery-controls">
            {workControl(view, "detach")?.state === "client_owned" ? (
              <Link
                className="reference-primary-link"
                to={`/projects/${project.id}/brief`}
              >
                Leave running
              </Link>
            ) : null}
            <p>{workControl(view, "detach")?.reason}</p>
            {pending === "delivery" ? (
              <p role="status">Restoring retained Work delivery…</p>
            ) : null}
            {deliveryError === undefined ? null : (
              <StateNotice
                notice={{
                  tone: "caution",
                  title: "Delivery could not be restored",
                  message: deliveryError,
                  recovery:
                    "The Work task remains available. Retry the exact delivery read when the connection is ready.",
                }}
              />
            )}
            {deliveryError === undefined ? null : (
              <PetraButton onClick={() => void restoreDelivery()}>
                Retry delivery read
              </PetraButton>
            )}
          </div>

          {!confirmingCancel ? (
            <PetraButton
              variant="danger"
              {...withUnavailable(unavailableFor(view, "cancel"))}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel work
            </PetraButton>
          ) : (
            <div className="work-cancel-confirmation">
              <PetraTextField
                label="Reason for cancellation"
                value={cancelReason}
                maxLength={4_000}
                onChange={(event) => setCancelReason(event.currentTarget.value)}
              />
              <PetraButtonGroup label="Confirm Work cancellation">
                <PetraButton
                  variant="danger"
                  busy={pending === "cancel"}
                  busyLabel="Cancelling work"
                  {...withUnavailable(
                    cancelReason.trim().length === 0
                      ? { reason: "Enter a cancellation reason." }
                      : undefined,
                  )}
                  onClick={() =>
                    void execute("cancel", { reason: cancelReason })
                  }
                >
                  Confirm cancellation
                </PetraButton>
                <PetraButton
                  variant="quiet"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep work running
                </PetraButton>
              </PetraButtonGroup>
            </div>
          )}
        </div>

        <details className="work-controls__assessment">
          <summary>Current Work assessment</summary>
          <p>
            Availability comes from the server's exact Work assessment. These
            commands cannot accept a finding or apply a Review.
          </p>
          <dl className="work-controls__snapshot">
            <div>
              <dt>Canonical execution</dt>
              <dd>{view.execution_state.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                Revision {view.plan.revision} ·{" "}
                {priorityLabel[view.plan.selected_priority]}
              </dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{view.read_at}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {view.delivery.state === "durable"
                  ? "Durable reconnect and replay available"
                  : view.delivery.reason}
              </dd>
            </div>
          </dl>
        </details>

        <details className="work-operation-availability">
          <summary>Why each Work operation is or is not available</summary>
          <dl>
            {view.controls.map((control) => (
              <div key={control.operation} data-state={control.state}>
                <dt>{workOperationLabel[control.operation]}</dt>
                <dd>
                  <strong>{control.state.replaceAll("_", " ")}</strong>
                  <span>{control.reason}</span>
                </dd>
              </div>
            ))}
          </dl>
        </details>

        {error === undefined ? null : (
          <StateNotice
            announce
            notice={{
              tone: "danger",
              title: "Work operation not completed",
              message: error.message,
              recovery: error.recovery,
            }}
          />
        )}
        {receipt === undefined ? null : (
          <div className="work-operation-result" role="status">
            <strong>{receipt.effect.summary}</strong>
            <p>
              {receipt.outcome.replaceAll("_", " ")} · Work revision{" "}
              {receipt.resulting_work_unit_ref.revision} · Project authority
              unchanged
            </p>
            <code>{receipt.receipt_id}</code>
          </div>
        )}
        {resumeReceipt === undefined ? null : (
          <div className="work-operation-result" role="status">
            <strong>{resumeReceipt.effect.summary}</strong>
            <p>
              Resumed attempt {resumeReceipt.resumed_attempt} · Work revision{" "}
              {resumeReceipt.resulting_work_unit_ref.revision} · retained
              checkpoint and prior attempts preserved · Project authority
              unchanged
            </p>
            <code>{resumeReceipt.receipt_id}</code>
            <Link
              className="reference-text-link"
              to={`/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(resumeReceipt.resulting_work_unit_ref.work_unit_id)}#work-control-boundary`}
            >
              Return to this Work task
            </Link>
          </div>
        )}
        {startAgainReceipt === undefined ? null : (
          <div className="work-operation-result" role="status">
            <strong>{startAgainReceipt.effect.summary}</strong>
            <p>
              The fresh Work was created as attempt{" "}
              {startAgainReceipt.new_attempt.work_attempt} · lineage attempt{" "}
              {startAgainReceipt.new_attempt.lineage_attempt}. Prior Work,
              attempts, outputs, and incurred use remain retained; no prior
              output was reused.
            </p>
            <code>{startAgainReceipt.receipt_id}</code>
            <Link
              className="reference-text-link"
              to={`/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(startAgainReceipt.destination.work_unit_ref.work_unit_id)}?${new URLSearchParams(
                {
                  return_to: `/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(startAgainReceipt.prior_attempt.work_unit_ref.work_unit_id)}`,
                  return_label: "prior Work task",
                  return_focus: "work-control-boundary",
                },
              )}#work-control-boundary`}
              state={{
                startAgainOutcome: startAgainOutcome(startAgainReceipt),
              }}
            >
              Open the new linked Work
            </Link>
          </div>
        )}
        {delivery.map((observation) => (
          <div
            className="work-operation-result"
            role="status"
            key={observation.kind}
          >
            <strong>{observation.summary}</strong>
            <p>
              InteractionRun {observation.interactionRunId} · protocol run{" "}
              {observation.protocolRunId}
            </p>
          </div>
        ))}

        <div className="work-controls__returns">
          <Link
            className="reference-text-link"
            to={`/projects/${encodeURIComponent(project.id)}/petra?${new URLSearchParams(
              {
                return_to: `/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(view.work_unit_ref.work_unit_id)}`,
                return_label: "Work task",
                return_focus: "work-control-boundary",
              },
            )}`}
          >
            Discuss this task with Petra
          </Link>
          <Link
            className="reference-text-link"
            to={`/projects/${project.id}/brief`}
          >
            Return to Brief without cancelling
          </Link>
        </div>
      </section>

      {view.results.length === 0 ? null : (
        <section
          className="work-results work-results--destinations"
          aria-labelledby="work-destinations-title"
        >
          <header>
            <div>
              <p className="reference-panel-kicker">
                Server-owned destinations
              </p>
              <h2 id="work-destinations-title">Open exact results</h2>
            </div>
            <span>{view.results.length}</span>
          </header>
          <ul>
            {view.results.map((result) => {
              const path = resultPath(result);
              return (
                <li
                  key={`${result.result_kind}:${result.record_ref.record_id}`}
                >
                  <div>
                    <strong>{result.result_kind.replaceAll("_", " ")}</strong>
                    <code>{result.record_ref.record_id}</code>
                  </div>
                  {path === undefined ? (
                    <span>
                      {result.destination.state === "unavailable"
                        ? result.destination.reason
                        : "No destination supplied."}
                    </span>
                  ) : (
                    <Link className="reference-text-link" to={path}>
                      Open result
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
};

const measuredBytes = (value: number): string =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);

const SelectedWorkerOutput = ({
  result,
}: {
  result: ProjectWorkerOutputSelection;
}): React.JSX.Element => (
  <section
    className="selected-worker-output"
    id="selected-work-result"
    tabIndex={-1}
    aria-labelledby="selected-work-result-title"
  >
    <header>
      <div>
        <p className="reference-panel-kicker">Selected exact result</p>
        <h2 id="selected-work-result-title">Worker output manifest</h2>
        <p>
          This immutable manifest belongs to the Work task shown below. Its
          identity is retained separately from the producing WorkUnit.
        </p>
      </div>
      <span data-state={result.outcome}>{words(result.outcome)}</span>
    </header>

    <dl className="selected-worker-output__identity">
      <div>
        <dt>Manifest</dt>
        <dd>
          <code>{result.resultRef.recordId}</code> · revision{" "}
          {result.resultRef.revision}
        </dd>
      </div>
      <div>
        <dt>Producing Work</dt>
        <dd>
          <code>{result.producingWorkRef.workUnitId}</code> · revision{" "}
          {result.producingWorkRef.revision}
        </dd>
      </div>
      <div>
        <dt>Outcome</dt>
        <dd>
          {words(result.outcome)} · attempt {result.attempt}
        </dd>
      </div>
      <div>
        <dt>Reported</dt>
        <dd>{result.reportedAt}</dd>
      </div>
      <div>
        <dt>Worker</dt>
        <dd>
          {result.worker.name} {result.worker.version} · {result.worker.runtime}
        </dd>
      </div>
      <div>
        <dt>Entrypoint</dt>
        <dd>
          <code>{result.worker.entrypoint}</code>
        </dd>
      </div>
    </dl>

    <section aria-labelledby="selected-work-outputs-title">
      <h3 id="selected-work-outputs-title">Reported outputs</h3>
      <ul className="selected-worker-output__outputs">
        {result.outputs.map((output) => (
          <li key={`${output.name}:${output.role}`}>
            <strong>{words(output.name)}</strong>
            <span>
              {words(output.role)} · {output.state} · {output.mediaType}
            </span>
            {output.handle === undefined ? null : <code>{output.handle}</code>}
            {output.contentHash === undefined ? null : (
              <span>
                {output.contentHash} · {measuredBytes(output.byteSize ?? 0)}
                {" bytes"}
              </span>
            )}
            <p>{output.limitation}</p>
          </li>
        ))}
      </ul>
    </section>

    <div className="selected-worker-output__detail-grid">
      <section aria-labelledby="selected-work-diagnostics-title">
        <h3 id="selected-work-diagnostics-title">Diagnostics</h3>
        {result.diagnostics.length === 0 ? (
          <StateNotice
            notice={{
              tone: "positive",
              title: "No diagnostics reported",
              message:
                "The exact WorkerOutputManifest contains an empty diagnostics array for this attempt.",
            }}
          />
        ) : (
          <ul className="selected-worker-output__diagnostics">
            {result.diagnostics.map((diagnostic, index) => (
              <li
                data-severity={diagnostic.severity}
                key={`${diagnostic.code}:${index}`}
              >
                <strong>{diagnostic.code}</strong>
                <span>{words(diagnostic.severity)}</span>
                <p>{diagnostic.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="selected-work-resources-title">
        <h3 id="selected-work-resources-title">Measured resources</h3>
        <dl>
          <div>
            <dt>Wall time</dt>
            <dd>{measuredBytes(result.resourceUsage.wallTimeMs)} ms</dd>
          </div>
          <div>
            <dt>CPU time</dt>
            <dd>{measuredBytes(result.resourceUsage.cpuTimeMs)} ms</dd>
          </div>
          <div>
            <dt>Peak memory</dt>
            <dd>{measuredBytes(result.resourceUsage.peakMemoryBytes)} bytes</dd>
          </div>
          <div>
            <dt>Input / output</dt>
            <dd>
              {measuredBytes(result.resourceUsage.inputBytes)} /{" "}
              {measuredBytes(result.resourceUsage.outputBytes)} bytes
            </dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{measuredBytes(result.resourceUsage.networkBytes)} bytes</dd>
          </div>
          {result.resourceUsage.inputTokens === undefined &&
          result.resourceUsage.outputTokens === undefined ? null : (
            <div>
              <dt>Input / output tokens</dt>
              <dd>
                {result.resourceUsage.inputTokens ?? "Not measured"} /{" "}
                {result.resourceUsage.outputTokens ?? "Not measured"}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>

    <details>
      <summary>Identity hashes and limitations</summary>
      <dl>
        <div>
          <dt>Manifest content hash</dt>
          <dd>
            <code>{result.resultRef.contentHash}</code>
          </dd>
        </div>
        <div>
          <dt>Manifest record hash</dt>
          <dd>
            <code>{result.resultRef.recordHash}</code>
          </dd>
        </div>
        <div>
          <dt>Producing Work record hash</dt>
          <dd>
            <code>{result.producingWorkRef.recordHash}</code>
          </dd>
        </div>
      </dl>
      <ul>
        {result.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </details>
  </section>
);

export const WorkDetailSurface = ({
  project,
  unit,
  work,
  operations,
  selectedResult,
  returnTo,
  startAgain,
  onOperationApplied,
}: {
  project: ProjectRecord;
  unit: WorkUnit;
  work: WorkProjectView;
  operations?: PetraProjectWorkOperationsView;
  selectedResult?: ProjectWorkerOutputSelection;
  returnTo?: { path: string; label: string };
  startAgain?: ProjectWorkStartAgainOutcome;
  onOperationApplied?: () => void;
}): React.JSX.Element => {
  const branches = work.branches.filter((branch) =>
    unit.branchIds.includes(branch.id),
  );

  return (
    <main className="reference-surface work-detail" id="reference-main">
      <header className="work-detail__heading">
        <Link
          className="reference-context-back"
          to={returnTo?.path ?? `/projects/${project.id}/work`}
        >
          <span aria-hidden="true">←</span> Return to{" "}
          {returnTo?.label ?? "Work"}
        </Link>
        <div className="work-detail__orientation">
          <div>
            <p className="reference-eyebrow">Work task · {unit.revision}</p>
            <h1>{unit.objective}</h1>
            <p className="reference-lede">{unit.expectedOutcome}</p>
          </div>
          <WorkState unit={unit} />
        </div>
        <details className="work-detail__record">
          <summary>Work record details</summary>
          <dl className="work-detail__identity">
            <div>
              <dt>Work identity</dt>
              <dd>
                <code>{unit.id}</code>
              </dd>
            </div>
            <div>
              <dt>Origin</dt>
              <dd>{unit.origin}</dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{unit.observedAt}</dd>
            </div>
            <div>
              <dt>Review state</dt>
              <dd>{unit.reviewState}</dd>
            </div>
          </dl>
        </details>
      </header>

      {startAgain === undefined ? null : (
        <WorkStartAgainOutcome outcome={startAgain} />
      )}

      {selectedResult === undefined ? null : (
        <SelectedWorkerOutput result={selectedResult} />
      )}

      {work.inquiryLimitation === undefined ? null : (
        <StateNotice
          notice={{
            tone: "caution",
            title: "Inquiry paths unavailable",
            message: work.inquiryLimitation,
            recovery:
              "This exact task and its server-owned controls remain available. Inquiry status cannot be inferred from Work execution.",
          }}
        />
      )}

      {operations !== undefined ? (
        <AgentControlPortal
          title="Control this Work"
          description="Supply required input, steer, stop, reconnect, retry, or resume this task. Progress and results remain in the Workspace."
          operationIds={[
            "work.answer-input",
            "work.steer",
            "work.prioritize",
            "work.cancel",
            "work.reconnect",
            "work.replay",
            "work.retry",
            "work.resume",
            "work.start-again",
            "work.open-result",
          ]}
          objectRef={operations.work_unit_ref.work_unit_id}
        >
          <WorkOperationControls
            project={project}
            initialView={operations}
            {...(onOperationApplied === undefined
              ? {}
              : { onOperationApplied })}
          />
        </AgentControlPortal>
      ) : unit.requiredInput === undefined ? null : (
        <section
          className="work-required-input"
          id="required-input"
          tabIndex={-1}
          aria-labelledby="required-input-title"
        >
          <span aria-hidden="true">!</span>
          <div>
            <p className="reference-panel-kicker">
              Required input · {unit.requiredInput.kind}
            </p>
            <h2 id="required-input-title">{unit.requiredInput.question}</h2>
            <p>{unit.requiredInput.consequence}</p>
            <dl>
              <div>
                <dt>Responsible</dt>
                <dd>{unit.requiredInput.responsible}</dd>
              </div>
              <div>
                <dt>Input identity</dt>
                <dd>
                  <code>{unit.requiredInput.id}</code>
                </dd>
              </div>
            </dl>
            <p id="work-input-boundary" className="work-command-boundary">
              The input adapter is unavailable. These valid responses are shown
              for orientation; none can be recorded locally.
            </p>
            <PetraButtonGroup label="Required input responses">
              {unit.requiredInput.responses.map((response, index) => (
                <PetraButton
                  key={response}
                  variant={
                    index === 0
                      ? "primary"
                      : index === 2
                        ? "quiet"
                        : "secondary"
                  }
                  aria-disabled="true"
                  aria-describedby="work-input-boundary"
                >
                  {response}
                </PetraButton>
              ))}
            </PetraButtonGroup>
          </div>
        </section>
      )}

      <section className="work-plan" aria-labelledby="work-plan-title">
        <header>
          <div>
            <p className="reference-panel-kicker">Declared dependency plan</p>
            <h2 id="work-plan-title">Stages</h2>
          </div>
          <span>{unit.stages.length}</span>
        </header>
        {unit.inputs === undefined ? null : (
          <p>Exact inputs: {unit.inputs.join("; ")}</p>
        )}
        {unit.dependencies === undefined ? null : (
          <p>
            Dependencies:{" "}
            {unit.dependencies.length === 0
              ? "No WorkUnit dependencies are declared."
              : unit.dependencies.join("; ")}
          </p>
        )}
        {unit.stagePlanLimitation === undefined ? null : (
          <p>{unit.stagePlanLimitation}</p>
        )}
        <ol>
          {unit.stages.map((stage, index) => (
            <li
              key={stage.id}
              data-current={stage.id === unit.currentStageId || undefined}
            >
              <details open={stage.id === unit.currentStageId}>
                <summary>
                  <span className="work-stage-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="work-stage-label">
                    <strong>{stage.label}</strong>
                    <small>{stage.purpose}</small>
                  </span>
                  <StageState stage={stage} />
                </summary>
                <div className="work-stage-detail">
                  <dl>
                    <div>
                      <dt>Prerequisites</dt>
                      <dd>
                        {stage.prerequisites.length === 0
                          ? "None"
                          : stage.prerequisites.join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Accountable role</dt>
                      <dd>{stage.accountableRole}</dd>
                    </div>
                    <div>
                      <dt>Exact input</dt>
                      <dd>{stage.input}</dd>
                    </div>
                    <div>
                      <dt>Output</dt>
                      <dd>{stage.output}</dd>
                    </div>
                  </dl>
                  <details className="work-activity">
                    <summary>Show activity ({stage.activity.length})</summary>
                    {stage.activity.length === 0 ? (
                      <p>No activity has been recorded for this stage.</p>
                    ) : (
                      <ol>
                        {stage.activity.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    )}
                  </details>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <div className="work-detail__columns">
        <section
          className="work-resources"
          aria-labelledby="work-resources-title"
        >
          <header>
            <p className="reference-panel-kicker">
              Measured and declared separately
            </p>
            <h2 id="work-resources-title">Time and resources</h2>
          </header>
          <dl>
            <div>
              <dt>Elapsed</dt>
              <dd>{unit.elapsed}</dd>
            </div>
            <div>
              <dt>Estimate</dt>
              <dd>{unit.estimate}</dd>
            </div>
            <div>
              <dt>Measured use</dt>
              <dd>{unit.resourceUse}</dd>
            </div>
            <div>
              <dt>Authorized limit</dt>
              <dd>{unit.authorizedLimit}</dd>
            </div>
          </dl>
        </section>

        <section className="work-links" aria-labelledby="work-links-title">
          <header>
            <p className="reference-panel-kicker">Project meaning</p>
            <h2 id="work-links-title">Linked inquiry paths</h2>
          </header>
          {branches.length === 0 ? (
            <p>
              {work.inquiryLimitation ??
                "No exact inquiry path is linked to this task."}
            </p>
          ) : (
            <>
              <ul>
                {branches.map((branch) => (
                  <li key={branch.id}>
                    <strong>{branch.label}</strong>
                    <span>
                      {branch.kind} · {branch.state}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                {unit.inquiryLimitation ??
                  "Work completion can supply a result to these paths. It does not resolve the inquiry or apply a candidate by itself."}
              </p>
            </>
          )}
        </section>
      </div>

      <section className="work-results" aria-labelledby="work-results-title">
        <header>
          <div>
            <p className="reference-panel-kicker">Exact outputs</p>
            <h2 id="work-results-title">Results</h2>
          </div>
          <span>{unit.results.length}</span>
        </header>
        {unit.results.length === 0 ? (
          <p>
            No usable result has been recorded. Visible stage activity is not a
            result.
          </p>
        ) : (
          <ul>
            {unit.results.map((result) => (
              <li key={result.id}>
                <strong>{result.label}</strong>
                <span>
                  {result.status} · {result.validation}
                </span>
                <p>{result.limitation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {operations === undefined ? (
        <section
          className="work-controls"
          aria-labelledby="work-controls-title"
        >
          <div>
            <p className="reference-panel-kicker">Operational controls</p>
            <h2 id="work-controls-title">Manage this task</h2>
            <p id="work-control-boundary" tabIndex={-1}>
              {unit.cancellation} The operational command boundary is
              unavailable in this workspace, so no control can change execution
              locally.
            </p>
          </div>
          <PetraButtonGroup label="Work controls">
            <PetraButton
              aria-disabled="true"
              aria-describedby="work-control-boundary"
            >
              Cancel work
            </PetraButton>
            <PetraButton
              variant="quiet"
              aria-disabled="true"
              aria-describedby="work-control-boundary"
            >
              Retry failed work
            </PetraButton>
          </PetraButtonGroup>
          <div className="work-controls__returns">
            <Link
              className="reference-text-link"
              to={`/projects/${encodeURIComponent(project.id)}/petra?${new URLSearchParams(
                {
                  return_to: `/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(unit.id)}`,
                  return_label: "Work task",
                  return_focus: "work-control-boundary",
                },
              )}`}
            >
              Discuss this task with Petra
            </Link>
            <Link
              className="reference-text-link"
              to={`/projects/${project.id}/brief`}
            >
              Return to Brief without cancelling
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
};

export const workDetailReturnContext = (
  projectId: string,
  search: URLSearchParams,
): { path: string; label: string } | undefined => {
  const paths = search.getAll("return_to");
  const labels = search.getAll("return_label");
  const focusIds = search.getAll("return_focus");
  if (paths.length === 0 && labels.length === 0 && focusIds.length === 0) {
    return undefined;
  }
  if (paths.length !== 1 || labels.length !== 1 || focusIds.length > 1) {
    return undefined;
  }
  const suppliedPath = paths[0]!;
  const label = labels[0]!.trim();
  const focusId = focusIds[0]?.trim();
  const parsed = new URL(suppliedPath, "http://petra.local");
  const projectRoot = `/projects/${encodeURIComponent(projectId)}/`;
  if (
    parsed.origin !== "http://petra.local" ||
    !parsed.pathname.startsWith(projectRoot) ||
    label.length === 0 ||
    label.length > 100 ||
    (focusId !== undefined &&
      (focusId.length === 0 ||
        focusId.length > 100 ||
        !/^[A-Za-z][A-Za-z0-9_.:-]*$/u.test(focusId)))
  ) {
    return undefined;
  }
  const hash =
    focusId === undefined ? parsed.hash : `#${encodeURIComponent(focusId)}`;
  return {
    path: `${parsed.pathname}${parsed.search}${hash}`,
    label,
  };
};

export const WorkDetailRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const revalidator = useRevalidator();
  const { work, unit, operations, selectedResult } =
    useLoaderData<ProjectWorkDetailData>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = workDetailReturnContext(project.id, searchParams);
  const state = location.state as {
    startAgainOutcome?: ProjectWorkStartAgainOutcome;
  } | null;
  const startAgain =
    state?.startAgainOutcome?.projectId === project.id &&
    state.startAgainOutcome.newWorkUnitId === unit.id
      ? state.startAgainOutcome
      : undefined;
  return (
    <WorkDetailSurface
      key={unit.id}
      project={project}
      unit={unit}
      work={work}
      operations={operations}
      onOperationApplied={() => void revalidator.revalidate()}
      {...(selectedResult === undefined ? {} : { selectedResult })}
      {...(returnTo === undefined ? {} : { returnTo })}
      {...(startAgain === undefined ? {} : { startAgain })}
    />
  );
};

const forceClass = (force: PetraThread["messages"][number]["force"]): string =>
  force.replaceAll("_", "-");

type CommunicationContent = PetraCommunicationPlan["content"];
type CommunicationSegment = CommunicationContent["segments"][number];
type EvidenceReference = NonNullable<
  CommunicationSegment["original_statement"]
>["evidence_refs"][number];

const communicationFamilyLabel: Record<CommunicationSegment["family"], string> =
  {
    attributed_report: "Attributed report",
    petra_assessment: "Petra assessment",
    inference: "Inference",
    action_report: "Action report",
  };

const words = (value: string): string =>
  value.replaceAll("_", " ").replace(/^./u, (letter) => letter.toUpperCase());

const authorityEffect = (value: string): string =>
  value === "none" ? "No authority effect" : `${words(value)} authority effect`;

const runState = (run: CommunicationContent["delivery"]): string => {
  const lifecycle = run.content.lifecycle;
  return "outcome_code" in lifecycle
    ? `${words(lifecycle.state)} · ${lifecycle.outcome_code}`
    : words(lifecycle.state);
};

const ExactCommunicationReference = ({
  plan,
  reference,
}: {
  plan: PetraCommunicationPlan;
  reference: EvidenceReference;
}): React.JSX.Element => {
  const label = plan.content.reference_labels.find(
    (candidate) =>
      candidate.canonical_id === reference.object_id &&
      candidate.revision === reference.object_revision &&
      candidate.content_hash === reference.object_hash,
  );
  const spans = reference.source_span_selection_orders.map((selectionOrder) =>
    plan.content.context_packet.content.included_objects.find(
      (included) => included.selection_order === selectionOrder,
    ),
  );
  return (
    <li>
      <strong>{label?.first_reference ?? words(reference.object_kind)}</strong>
      <code>{reference.object_id}</code>
      <span>
        Revision {reference.object_revision} · {reference.object_hash}
      </span>
      {label === undefined ? null : (
        <span className="communication-reference__alternative">
          Text alternative: {label.text_alternative}
        </span>
      )}
      {spans.length === 0 ? null : (
        <ul aria-label="Exact source-span references">
          {spans.map((span, index) => {
            const spanLabel = plan.content.reference_labels.find(
              (candidate) =>
                span !== undefined &&
                candidate.canonical_id === span.object_ref.object_id &&
                candidate.revision === span.object_ref.object_revision &&
                candidate.content_hash === span.object_ref.object_hash,
            );
            return (
              <li key={reference.source_span_selection_orders[index]}>
                {span === undefined ? (
                  <>
                    Source selection{" "}
                    {reference.source_span_selection_orders[index]} unavailable
                  </>
                ) : (
                  <>
                    {spanLabel?.first_reference ??
                      words(span.object_ref.object_kind)}{" "}
                    · <code>{span.object_ref.object_id}</code>, revision{" "}
                    {span.object_ref.object_revision} ·{" "}
                    {span.object_ref.object_hash}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {label?.limitations.length ? (
        <ul aria-label="Reference limitations">
          {label.limitations.map((limitation, index) => (
            <li key={`${index}:${limitation}`}>{limitation}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
};

const CommunicationSegmentRecord = ({
  plan,
  segment,
}: {
  plan: PetraCommunicationPlan;
  segment: CommunicationSegment;
}): React.JSX.Element => {
  const statement = segment.original_statement;
  const limitations = statement?.limitations ?? [];
  return (
    <li
      className="communication-segment"
      data-family={segment.family}
      data-preservation={segment.preservation}
      data-order={segment.order}
    >
      <article>
        <header>
          <div>
            <span>Statement {segment.order}</span>
            <h3>{communicationFamilyLabel[segment.family]}</h3>
          </div>
          <strong className="communication-preservation">
            <span aria-hidden="true">
              {segment.preservation === "passed" ? "✓" : "!"}
            </span>
            Structured preservation {segment.preservation}
          </strong>
        </header>
        <p className="communication-segment__origin">
          Origin:{" "}
          {statement === null
            ? "Exact linked command"
            : words(statement.origin)}
        </p>
        <p className="communication-segment__text">
          {statement?.text ??
            "This segment reports the exact linked invocation; its observed outcome follows below."}
        </p>
        {statement === null || statement.evidence_refs.length === 0 ? null : (
          <section aria-label={`References for statement ${segment.order}`}>
            <h4>Exact references</h4>
            <ul className="communication-references">
              {statement.evidence_refs.map((reference) => (
                <ExactCommunicationReference
                  key={`${reference.object_id}:${reference.object_revision}`}
                  plan={plan}
                  reference={reference}
                />
              ))}
            </ul>
          </section>
        )}
        {limitations.length === 0 ? null : (
          <section aria-label={`Limitations for statement ${segment.order}`}>
            <h4>Statement limitations</h4>
            <ul>
              {limitations.map((limitation, index) => (
                <li key={`${index}:${limitation}`}>{limitation}</li>
              ))}
            </ul>
          </section>
        )}
        {statement !== null && "resolution_requirement" in statement ? (
          <p className="communication-resolution">
            <strong>Resolution needed:</strong>{" "}
            {statement.resolution_requirement}
          </p>
        ) : null}
        {segment.findings.length === 0 ? null : (
          <section
            aria-label={`Preservation findings for statement ${segment.order}`}
          >
            <h4>Preservation findings</h4>
            <ul>
              {segment.findings.map((finding, index) => (
                <li key={`${index}:${finding}`}>{finding}</li>
              ))}
            </ul>
          </section>
        )}
        <dl className="communication-segment__bindings">
          <div>
            <dt>Statement key</dt>
            <dd>
              <code>{segment.segment_key}</code>
            </dd>
          </div>
          <div>
            <dt>Force</dt>
            <dd>{words(segment.force)}</dd>
          </div>
          <div>
            <dt>Conditions</dt>
            <dd>{words(segment.conditions)}</dd>
          </div>
          <div>
            <dt>Language validation</dt>
            <dd>{words(segment.language_validation)}</dd>
          </div>
        </dl>
      </article>
    </li>
  );
};

const CommunicationActionOutcome = ({
  plan,
}: {
  plan: PetraCommunicationPlan;
}): React.JSX.Element | null => {
  const invocation = plan.content.invocation;
  if (invocation === null) return null;
  const { work, result, recovery } = invocation.content;
  const command = invocation.content.invocation.content.command_ref;
  return (
    <section
      className="communication-action-outcome"
      aria-labelledby="communication-action-outcome-title"
    >
      <header>
        <p className="reference-panel-kicker">Observed action outcome</p>
        <h3 id="communication-action-outcome-title">
          {words(invocation.content.operation_state)}
        </h3>
        <p>
          The command receipt, Work, result, and delivery remain separate
          observations.
        </p>
      </header>
      <dl>
        <div>
          <dt>Command</dt>
          <dd>
            {command.command_name} · <code>{command.command_id}</code>
          </dd>
        </div>
        <div>
          <dt>Work</dt>
          <dd>
            {work.state === "pending_registration"
              ? `Pending registration · ${work.expected_work_unit_id}`
              : `${words(work.execution_state)}${
                  work.terminal_outcome === undefined
                    ? ""
                    : ` · ${words(work.terminal_outcome)}`
                } · ${work.work_unit_ref.work_unit_id}`}
          </dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>
            {result.state === "available"
              ? `Available · ${authorityEffect(result.authority_effect)} · ${result.result_ref.record_id} revision ${result.result_ref.revision}`
              : `${words(result.state)} · ${result.reason}`}
          </dd>
        </div>
        <div>
          <dt>Current action delivery</dt>
          <dd>
            {plan.content.current_invocation_delivery === null
              ? "No current invocation delivery record is linked."
              : `${runState(plan.content.current_invocation_delivery)} · ${plan.content.current_invocation_delivery.interaction_run_id} revision ${plan.content.current_invocation_delivery.revision}`}
          </dd>
        </div>
      </dl>
      <details>
        <summary>Current server-owned recovery assessment</summary>
        <ul>
          {recovery.actions.map((action) => (
            <li key={action.operation}>
              <strong>{words(action.operation)}</strong> ·{" "}
              {words(action.eligibility)} — {action.reason}
            </li>
          ))}
        </ul>
      </details>
      <ul aria-label="Action outcome limitations">
        {invocation.content.limitations.map((limitation, index) => (
          <li key={`${index}:${limitation}`}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
};

export const CommunicationPlanRecord = ({
  plan,
}: {
  plan: PetraCommunicationPlan;
}): React.JSX.Element => {
  const source = plan.content.source_response;
  const current = plan.content.current_response;
  const receipt = plan.content.validation;
  return (
    <article
      className="communication-plan"
      aria-labelledby="communication-plan-title"
      data-validation={receipt.outcome}
    >
      <header className="communication-plan__heading">
        <p className="reference-panel-kicker">
          Communication record · scientific profile
        </p>
        <h2 id="communication-plan-title">
          Exact response, preservation, and limits
        </h2>
        <p>{plan.content.context_packet.content.objective.statement}</p>
      </header>

      <StateNotice
        announce
        notice={{
          tone: "danger",
          title: "Language validation blocked",
          message:
            "The exact structured response is preserved, but full response-language validation is incomplete. This record is not a validated answer.",
          recovery:
            "No repair was recorded. The preserved statements and their limitations remain available until a supported language validator is available.",
        }}
      />

      <section
        className="communication-delivery-state"
        aria-labelledby="communication-delivery-title"
      >
        <h3 id="communication-delivery-title">
          Source and current delivery state
        </h3>
        <div>
          <section aria-labelledby="communication-source-response-title">
            <h4 id="communication-source-response-title">Source response</h4>
            <dl>
              <div>
                <dt>Response</dt>
                <dd>
                  <code>{source.grounded_response_id}</code> revision{" "}
                  {source.revision}
                </dd>
              </div>
              <div>
                <dt>Recorded result</dt>
                <dd>
                  {words(source.content.terminal.state)} ·{" "}
                  {authorityEffect(source.content.terminal.authority_effect)}
                </dd>
              </div>
              <div>
                <dt>Cache observation</dt>
                <dd>{words(source.content.cache.state)}</dd>
              </div>
              <div>
                <dt>Source delivery</dt>
                <dd>
                  {runState(plan.content.delivery)} ·{" "}
                  {plan.content.delivery.interaction_run_id} revision{" "}
                  {plan.content.delivery.revision}
                </dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="communication-current-response-title">
            <h4 id="communication-current-response-title">
              Current response observation
            </h4>
            <dl>
              <div>
                <dt>Response</dt>
                <dd>
                  <code>{current.grounded_response_id}</code> revision{" "}
                  {current.revision}
                </dd>
              </div>
              <div>
                <dt>Current result</dt>
                <dd>
                  {words(current.content.terminal.state)} ·{" "}
                  {authorityEffect(current.content.terminal.authority_effect)}
                </dd>
              </div>
              <div>
                <dt>Cache observation</dt>
                <dd>{words(current.content.cache.state)}</dd>
              </div>
              <div>
                <dt>Projection</dt>
                <dd>{words(plan.content.authority.projection)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <section
        className="communication-statements"
        aria-labelledby="communication-statements-title"
      >
        <header>
          <h3 id="communication-statements-title">
            Ordered response statements
          </h3>
          <p>
            {plan.content.segments.length} material segment
            {plan.content.segments.length === 1 ? "" : "s"} in the exact
            returned order.
          </p>
        </header>
        <ol>
          {plan.content.segments.map((segment) => (
            <CommunicationSegmentRecord
              key={`${segment.order}:${segment.segment_key}`}
              plan={plan}
              segment={segment}
            />
          ))}
        </ol>
      </section>

      <CommunicationActionOutcome plan={plan} />

      <section
        className="communication-plan__limitations"
        aria-labelledby="communication-limitations-title"
      >
        <h3 id="communication-limitations-title">Plan limitations</h3>
        <ul>
          {plan.content.limitations.map((limitation, index) => (
            <li key={`${index}:${limitation}`}>{limitation}</li>
          ))}
        </ul>
      </section>

      <details className="communication-plan__details">
        <summary>
          Complete validation receipt · {receipt.checks.length} checks
        </summary>
        <p>
          Scope: {words(receipt.scope)} · outcome {words(receipt.outcome)} ·
          language validation {words(receipt.language_validation)} · repair
          provenance {receipt.repair_provenance ?? "none"}
        </p>
        <ol>
          {receipt.checks.map((check) => (
            <li key={check.check}>
              <strong>{words(check.check)}</strong> · {words(check.status)}
              {check.findings.length === 0 ? null : (
                <ul>
                  {check.findings.map((finding, index) => (
                    <li key={`${index}:${finding}`}>{finding}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <ul aria-label="Validation receipt limitations">
          {receipt.limitations.map((limitation, index) => (
            <li key={`${index}:${limitation}`}>{limitation}</li>
          ))}
        </ul>
      </details>

      <details className="communication-plan__details">
        <summary>Exact record and version bindings</summary>
        <dl>
          <div>
            <dt>Response artifact</dt>
            <dd>
              <code>{plan.content.artifact.artifact_id}</code> ·{" "}
              {plan.content.artifact.media_type} ·{" "}
              {plan.content.artifact.byte_size} bytes ·{" "}
              {plan.content.artifact.content_hash}
            </dd>
          </div>
          <div>
            <dt>Response recorded by</dt>
            <dd>
              {words(plan.content.source_response.recorded_by.actor_kind)} ·{" "}
              <code>{plan.content.source_response.recorded_by.actor_id}</code>
            </dd>
          </div>
          <div>
            <dt>Context packet</dt>
            <dd>
              <code>{plan.content.context_packet.context_packet_id}</code>{" "}
              revision {plan.content.context_packet.revision}
            </dd>
          </div>
          <div>
            <dt>Evidence packet</dt>
            <dd>
              <code>{plan.content.evidence_packet.evidence_packet_id}</code>{" "}
              revision {plan.content.evidence_packet.revision}
            </dd>
          </div>
          <div>
            <dt>Model call</dt>
            <dd>
              <code>{plan.content.model_call.model_call_id}</code> ·{" "}
              {words(plan.content.model_call.content.outcome)} ·{" "}
              {plan.content.model_call.content.deployment.provider_model} ·{" "}
              <code>
                {plan.content.model_call.content.deployment.model_deployment_id}
              </code>
            </dd>
          </div>
          <div>
            <dt>Composition definition</dt>
            <dd>
              <code>
                {plan.content.composition_definition.project_definition_id}
              </code>{" "}
              revision {plan.content.composition_definition.revision}
            </dd>
          </div>
          <div>
            <dt>Project thread</dt>
            <dd>
              {plan.content.thread === null ? (
                "No unique exact product thread is linked"
              ) : (
                <>
                  <code>{plan.content.thread.project_thread_id}</code> revision{" "}
                  {plan.content.thread.revision}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Project turn</dt>
            <dd>
              {plan.content.project_turn_id === null ? (
                "No exact product turn is linked"
              ) : (
                <code>{plan.content.project_turn_id}</code>
              )}
            </dd>
          </div>
          <div>
            <dt>Context coverage</dt>
            <dd>{plan.content.context_packet.content.coverage.statement}</dd>
          </div>
          <div>
            <dt>Evidence coverage</dt>
            <dd>{plan.content.evidence_packet.content.coverage.statement}</dd>
          </div>
          <div>
            <dt>Material context omissions</dt>
            <dd>
              {plan.content.context_packet.content.omissions.length === 0 ? (
                "None recorded"
              ) : (
                <ul>
                  {plan.content.context_packet.content.omissions.map(
                    (omission, index) =>
                      omission.omission_kind === "search_boundary" ? (
                        <li key={`${index}:search:${omission.boundary}`}>
                          <strong>Search boundary:</strong> {omission.boundary}{" "}
                          {omission.detail} Reason: {words(omission.reason)};{" "}
                          {omission.material ? "material" : "not material"}.
                        </li>
                      ) : (
                        <li
                          key={`${index}:object:${omission.object_ref.object_id}`}
                        >
                          <strong>
                            Known {words(omission.object_ref.object_kind)}:
                          </strong>{" "}
                          <code>{omission.object_ref.object_id}</code> revision{" "}
                          {omission.object_ref.object_revision}.{" "}
                          {omission.detail} Reason: {words(omission.reason)};{" "}
                          {omission.material ? "material" : "not material"}.
                        </li>
                      ),
                  )}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt>Composition locale</dt>
            <dd>{plan.content.composition_binding.locale}</dd>
          </div>
          <div>
            <dt>Renderer binding</dt>
            <dd>{words(plan.content.composition_binding.renderer)}</dd>
          </div>
          <div>
            <dt>Source-time communication</dt>
            <dd>{words(plan.content.source_time_binding.communication)}</dd>
          </div>
          <div>
            <dt>Read position</dt>
            <dd>
              Event {plan.content.authority.event_position} · stream revision{" "}
              {plan.content.authority.stream_revision} · effect{" "}
              {words(plan.content.authority.effect)}
            </dd>
          </div>
        </dl>
      </details>
    </article>
  );
};

export const PetraSurface = ({
  project,
  thread,
  suggestedWorkAction,
  suggestedActionInvocation,
  communicationPlan,
  modelReadiness,
  returnContext,
}: {
  project: ProjectRecord;
  thread?: PetraThread | undefined;
  suggestedWorkAction?: PetraSuggestedActionViewV11;
  suggestedActionInvocation?: PetraSuggestedActionInvocationView;
  communicationPlan?: PetraCommunicationPlan;
  modelReadiness?: ProjectPetraData["modelReadiness"];
  returnContext?: ProjectPetraData["returnContext"];
}): React.JSX.Element => {
  const focusedDefinition = communicationPlan?.content.composition_definition;
  const focusedSemantics =
    focusedDefinition === undefined
      ? undefined
      : scientificFocusedGraphSemantics(focusedDefinition);
  const focusedEvidence =
    communicationPlan?.content.evidence_packet.content.selected_evidence.find(
      (selection) => selection.object_ref.object_kind === "claim",
    );
  const focusedSnapshot =
    communicationPlan?.content.evidence_packet.snapshot_ref;
  const communicationReturn =
    returnContext ??
    (communicationPlan === undefined
      ? undefined
      : {
          path: `/projects/${encodeURIComponent(project.id)}/brief`,
          label: "Brief",
        });

  return (
    <main className="reference-surface petra-focus" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          {communicationReturn === undefined ? null : (
            <Link
              className="reference-context-back"
              to={communicationReturn.path}
            >
              <span aria-hidden="true">←</span> Return to{" "}
              {communicationReturn.label}
            </Link>
          )}
          <p className="reference-eyebrow">Petra · current Project</p>
          <h1>
            {thread?.title ??
              (communicationPlan === undefined
                ? "Ask Petra"
                : "Recorded Petra response")}
          </h1>
          <p className="reference-lede">
            {thread?.task ??
              communicationPlan?.content.context_packet.content.objective
                .statement ??
              "Ask about an exact Project task after a registered context is available."}
          </p>
        </div>
      </header>

      {thread === undefined &&
      communicationPlan === undefined &&
      modelReadiness === undefined ? (
        <section
          className="reference-empty"
          aria-labelledby="petra-empty-title"
        >
          <PetraMark />
          <h2 id="petra-empty-title">No Petra context is registered</h2>
          <p>
            Petra will not infer a whole-Project context or read unselected
            sources.
          </p>
          <Link
            className="reference-text-link"
            to={`/projects/${project.id}/brief`}
          >
            Return to Brief
          </Link>
        </section>
      ) : (
        <div className="petra-focus__layout">
          <section
            className="petra-thread"
            aria-labelledby={
              thread !== undefined
                ? "petra-thread-title"
                : communicationPlan !== undefined
                  ? "communication-plan-title"
                  : "petra-model-readiness-title"
            }
          >
            {thread === undefined ? null : (
              <div className="petra-thread__context">
                <details open>
                  <summary>Context disclosed to Petra</summary>
                  <div className="petra-context-columns">
                    <section aria-labelledby="included-context-title">
                      <h2 id="included-context-title">Included</h2>
                      <ul>
                        {thread.context.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section aria-labelledby="omitted-context-title">
                      <h2 id="omitted-context-title">Unavailable or omitted</h2>
                      <ul>
                        {thread.omissions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </details>
                <span>
                  {thread.snapshot} · <code>{thread.id}</code>
                </span>
              </div>
            )}

            {communicationPlan === undefined ? null : (
              <CommunicationPlanRecord plan={communicationPlan} />
            )}

            {thread === undefined ? null : (
              <>
                <h2 className="visually-hidden" id="petra-thread-title">
                  Petra thread messages
                </h2>
                <ol className="petra-messages">
                  {thread.messages.map((message) => (
                    <li key={message.id} data-force={forceClass(message.force)}>
                      <article className="petra-message">
                        <header>
                          <div>
                            <strong>{message.speaker}</strong>
                            <span>{message.origin}</span>
                          </div>
                          <span>{message.forceLabel}</span>
                        </header>
                        <p>{message.content}</p>
                        {message.references.length === 0 ? null : (
                          <ul className="petra-message__references">
                            {message.references.map((reference) => (
                              <li key={reference.destination}>
                                <span>{reference.kind}</span>
                                <Link to={reference.destination}>
                                  {reference.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <section className="petra-agent-handoff" role="status">
              <p className="reference-panel-kicker">Agent control</p>
              <h2>Continue this request in the Agent</h2>
              <p>
                The persistent left panel owns requests, delivery recovery, and
                consequential interruptions. This Workspace keeps the recorded
                thread or response available for reading.
              </p>
              <span>
                {modelReadiness?.readiness.state === "ready"
                  ? "Registered operation: petra.ask"
                  : "No registered model command is currently available."}
              </span>
            </section>
          </section>

          <aside
            className="petra-task-context"
            aria-labelledby="petra-task-context-title"
          >
            <p className="reference-panel-kicker">
              {communicationPlan === undefined
                ? "Active task context"
                : "Communication boundary"}
            </p>
            <h2 id="petra-task-context-title">
              {thread?.activeWorkTitle ??
                (communicationPlan !== undefined
                  ? "Communication context"
                  : modelReadiness?.readiness.state === "ready"
                    ? modelReadiness.readiness.role.label
                    : "Source coverage Work")}
            </h2>
            <p>
              {thread?.activeWorkSummary ??
                (communicationPlan !== undefined
                  ? "This response is a read-only composition. Its communication record grants no command, Review, recovery, or Project authority."
                  : modelReadiness?.readiness.state === "ready"
                    ? "This server-selected role can answer only its registered Project question. Its result is advisory; Work and Review remain separate."
                    : "The Work task is awaiting an exact permitted-copy choice. The thread can explain this state; only the Work input adapter can resolve it.")}
            </p>
            {thread?.activeWorkId === undefined ? null : (
              <Link
                className="reference-primary-link"
                to={`/projects/${project.id}/work/${thread.activeWorkId}${
                  thread.activeWorkLinkLabel === undefined
                    ? "#required-input"
                    : ""
                }`}
              >
                {thread.activeWorkLinkLabel ?? "Open required input"}
              </Link>
            )}
            {focusedDefinition === undefined ||
            focusedSemantics === undefined ||
            focusedEvidence === undefined ||
            focusedSnapshot === undefined ||
            focusedEvidence.object_ref.object_kind !== "claim" ? null : (
              <p>
                <FocusedGraphEntryLink
                  entry={scientificFocusedGraphEntryDraft({
                    projectId: project.id,
                    question:
                      "Which recorded relationships concern this Claim?",
                    focusRef: {
                      record_id: focusedEvidence.object_ref.object_id,
                      revision: focusedEvidence.object_ref.object_revision,
                      record_hash: focusedEvidence.object_ref.object_hash,
                    },
                    originKind: "petra",
                    definitionRef: focusedGraphDefinitionRef(focusedDefinition),
                    returnDestinationKind: "evidence",
                    returnDestinationOwner: "project_relationship_view",
                    returnLabel: "Petra response",
                    returnFocusId: "petra-task-context-title",
                    expectedSnapshot: {
                      snapshot_id: focusedSnapshot.snapshot_id,
                      revision: focusedSnapshot.snapshot_revision,
                      event_position: focusedSnapshot.event_position,
                      content_hash: focusedSnapshot.content_hash,
                    },
                  })}
                >
                  Inspect this exact evidence object in Graph
                </FocusedGraphEntryLink>
              </p>
            )}
            <dl>
              <div>
                <dt>Thread</dt>
                <dd>
                  {thread === undefined ? (
                    "No exact product thread linked"
                  ) : (
                    <code>{thread.id}</code>
                  )}
                </dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>
                  {thread?.snapshot ??
                    (communicationPlan === undefined
                      ? "No exact snapshot linked"
                      : `Authority event ${communicationPlan.content.context_packet.snapshot_ref.event_position} · snapshot revision ${communicationPlan.content.context_packet.snapshot_ref.snapshot_revision}`)}
                </dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>Explanation and task direction only</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}

      {suggestedWorkAction === undefined ? null : (
        <AgentControlPortal
          title="Continue this proposed action"
          description="Start this proposed action here. Its Work and result remain in the Workspace."
          operationIds={["petra.preview-action", "petra.invoke-action"]}
          objectRef={suggestedWorkAction.content.action_ref.suggested_action_id}
        >
          <section
            className="petra-suggested-action"
            aria-labelledby="petra-suggested-action-region-title"
          >
            <header>
              <p className="reference-panel-kicker">Suggested action</p>
              <h2 id="petra-suggested-action-region-title">
                Continue this exact Project action
              </h2>
              <p>
                This presentation submits the same exact Petra invocation
                command as the direct Brief path.
              </p>
            </header>
            <SuggestedWorkAction
              projectId={project.id}
              actionView={suggestedWorkAction}
              {...(suggestedActionInvocation === undefined
                ? {}
                : { initialInvocation: suggestedActionInvocation })}
              presentationPath="conversational"
            />
          </section>
        </AgentControlPortal>
      )}
    </main>
  );
};

export const PetraRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectPetraData>();
  return <PetraSurface project={project} {...data} />;
};
