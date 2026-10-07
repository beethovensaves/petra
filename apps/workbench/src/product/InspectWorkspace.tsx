import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import type {
  PetraProjectHistoryRetainedViewV12,
  PetraProjectSourceProcessingView,
  PetraProjectSourceRegistrationReceipt,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkStartAgainReceipt,
  ProjectHistoryRetainedExactTargetFilterV12,
} from "@petra/contracts";

import type {
  ProjectPlace,
  ProjectRecord,
  ReviewSession,
  SourceRecord,
  WorkUnit,
} from "./model.js";
import {
  getProjectHistoryEvent,
  getProjectReviewSession,
  getProjectSourceInspection,
  getProjectWorkInspection,
  getRetainedProjectHistory,
  ProjectDataError,
  readProjectWorkReceipts,
  type ProjectHistoryEventData,
} from "./project-data.js";
import { loadSourceProcessing } from "./source-processing.js";
import { readSourceRegistrationReceipt } from "./source-registration.js";
import { projectInspectPath } from "./WorkspaceHost.js";

const readFailure = (error: unknown, fallback: string): string =>
  error instanceof ProjectDataError ? error.message : fallback;

const projectPath = (project: ProjectRecord, place: string): string =>
  `/projects/${encodeURIComponent(project.id)}/${place}`;

const placeAvailable = (project: ProjectRecord, place: ProjectPlace): boolean =>
  project.placeSummaries === undefined ||
  project.placeSummaries.some(
    (summary) => summary.role === place && summary.coverage !== "unavailable",
  );

const retainedTargetKeys = new Set<string>([
  "scientific.claim",
  "scientific.assertion",
  "petra.change-set",
  "petra.approval",
  "petra.project-source",
  "petra.project-source-replacement",
  "petra.project-source-replacement-retraction",
]);

const isRetainedTargetKey = (
  value: string,
): value is ProjectHistoryRetainedExactTargetFilterV12["semantic_key"] =>
  retainedTargetKeys.has(value);

const owningSurfacePath = (
  project: ProjectRecord,
  selection: NonNullable<ProjectRecord["selection"]>,
): string | undefined => {
  if (
    selection.state === "current" &&
    selection.destination === "sources" &&
    selection.semanticKey === "petra.project-source"
  ) {
    return projectPath(
      project,
      `sources/${encodeURIComponent(selection.objectId)}`,
    );
  }
  if (
    selection.state === "current" &&
    selection.destination === "work" &&
    selection.semanticKey === "petra.work-unit"
  ) {
    return projectPath(
      project,
      `work/${encodeURIComponent(selection.objectId)}`,
    );
  }
  return undefined;
};

export const safeInspectionReturn = (
  projectId: string,
  requested: string | null,
): string => {
  const base = `/projects/${encodeURIComponent(projectId)}/`;
  if (requested === null || !requested.startsWith("/")) return `${base}brief`;
  try {
    const url = new URL(requested, "http://petra.local");
    return url.origin === "http://petra.local" &&
      url.pathname.startsWith(base) &&
      !url.pathname.startsWith(`${base}inspect`)
      ? `${url.pathname}${url.search}${url.hash}`
      : `${base}brief`;
  } catch {
    return `${base}brief`;
  }
};

/** The project shell read owns every asserted identity and authority value here. */
export const InspectWorkspace = ({
  project,
}: {
  project: ProjectRecord;
}): React.JSX.Element => {
  const query = new URLSearchParams(useLocation().search);
  const shellSelection = project.selection;
  const selection =
    shellSelection !== undefined &&
    shellSelection.objectId === query.get("selected") &&
    shellSelection.semanticKey === query.get("semanticKey") &&
    String(shellSelection.resolvedRevision) === query.get("revision") &&
    shellSelection.recordHash === query.get("recordHash")
      ? shellSelection
      : undefined;
  const selectedSourceId =
    selection?.state === "current" &&
    selection.semanticKey === "petra.project-source" &&
    selection.resolvedRevision !== undefined
      ? selection.objectId
      : undefined;
  const selectedSourceRevision =
    selectedSourceId === undefined ? undefined : selection?.resolvedRevision;
  const sourceKey = `${selectedSourceId ?? ""}:${selectedSourceRevision ?? ""}`;
  const [sourceState, setSourceState] = useState<
    | { state: "loading"; key: string }
    | { state: "ready"; key: string; source: SourceRecord }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  useEffect(() => {
    if (selectedSourceId === undefined || selectedSourceRevision === undefined)
      return;
    let active = true;
    setSourceState({ state: "loading", key: sourceKey });
    void getProjectSourceInspection(
      project.id,
      selectedSourceId,
      selectedSourceRevision,
    ).then(
      (source) => {
        if (active) setSourceState({ state: "ready", key: sourceKey, source });
      },
      (error: unknown) => {
        if (active)
          setSourceState({
            state: "unavailable",
            key: sourceKey,
            message: readFailure(
              error,
              "Petra could not read this exact Source. Return to the source and try Inspect again.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, selectedSourceId, selectedSourceRevision, sourceKey]);
  const verifiedSource =
    sourceState.state === "ready" && sourceState.key === sourceKey
      ? sourceState.source
      : undefined;
  const [processingState, setProcessingState] = useState<
    | { state: "loading"; key: string }
    | {
        state: "ready";
        key: string;
        view: PetraProjectSourceProcessingView;
      }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  useEffect(() => {
    if (selectedSourceId === undefined || selectedSourceRevision === undefined)
      return;
    let active = true;
    setProcessingState({ state: "loading", key: sourceKey });
    void loadSourceProcessing(project.id, selectedSourceId).then(
      (view) => {
        if (!active) return;
        if (view.source.content.binding.revision !== selectedSourceRevision) {
          setProcessingState({
            state: "unavailable",
            key: sourceKey,
            message:
              "Processing details changed since this Source was selected. Return to the Source and inspect its current revision.",
          });
          return;
        }
        setProcessingState({ state: "ready", key: sourceKey, view });
      },
      (error: unknown) => {
        if (active)
          setProcessingState({
            state: "unavailable",
            key: sourceKey,
            message: readFailure(
              error,
              "Petra could not read processing details for this exact Source.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, selectedSourceId, selectedSourceRevision, sourceKey]);
  const verifiedProcessing =
    verifiedSource !== undefined &&
    processingState.state === "ready" &&
    processingState.key === sourceKey
      ? processingState.view
      : undefined;
  const [sourceReceiptState, setSourceReceiptState] = useState<
    | { state: "loading"; key: string }
    | {
        state: "ready";
        key: string;
        receipt?: PetraProjectSourceRegistrationReceipt;
      }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  useEffect(() => {
    if (selectedSourceId === undefined || verifiedSource === undefined) return;
    let active = true;
    setSourceReceiptState({ state: "loading", key: sourceKey });
    void readSourceRegistrationReceipt(project.id, selectedSourceId).then(
      (receipt) => {
        if (active)
          setSourceReceiptState({
            state: "ready",
            key: sourceKey,
            ...(receipt === undefined ? {} : { receipt }),
          });
      },
      (error: unknown) => {
        if (active)
          setSourceReceiptState({
            state: "unavailable",
            key: sourceKey,
            message: readFailure(
              error,
              "Petra could not read this Source's retained registration receipt.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, selectedSourceId, verifiedSource, sourceKey]);
  const displaySourceReceiptState =
    sourceReceiptState.key === sourceKey
      ? sourceReceiptState
      : ({ state: "loading" } as const);
  const verifiedSourceReceipt =
    verifiedSource !== undefined && displaySourceReceiptState.state === "ready"
      ? displaySourceReceiptState.receipt
      : undefined;
  const selectedWorkId =
    selection?.state === "current" &&
    selection.semanticKey === "petra.work-unit" &&
    selection.resolvedRevision !== undefined &&
    selection.recordHash !== undefined
      ? selection.objectId
      : undefined;
  const selectedWorkRevision =
    selectedWorkId === undefined ? undefined : selection?.resolvedRevision;
  const selectedWorkHash =
    selectedWorkId === undefined ? undefined : selection?.recordHash;
  const workKey = `${selectedWorkId ?? ""}:${selectedWorkRevision ?? ""}:${selectedWorkHash ?? ""}`;
  const [workState, setWorkState] = useState<
    | { state: "loading"; key: string }
    | {
        state: "ready";
        key: string;
        work: WorkUnit;
        operations: PetraProjectWorkOperationsView;
      }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  useEffect(() => {
    if (
      selectedWorkId === undefined ||
      selectedWorkRevision === undefined ||
      selectedWorkHash === undefined
    )
      return;
    let active = true;
    setWorkState({ state: "loading", key: workKey });
    void getProjectWorkInspection(
      project.id,
      selectedWorkId,
      selectedWorkRevision,
      selectedWorkHash,
    ).then(
      (data) => {
        if (active) setWorkState({ state: "ready", key: workKey, ...data });
      },
      (error: unknown) => {
        if (active)
          setWorkState({
            state: "unavailable",
            key: workKey,
            message: readFailure(
              error,
              "Petra could not read this exact Work task. Return to Work and try Inspect again.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [
    project.id,
    selectedWorkId,
    selectedWorkRevision,
    selectedWorkHash,
    workKey,
  ]);
  const verifiedWork =
    workState.state === "ready" && workState.key === workKey
      ? workState.work
      : undefined;
  const verifiedWorkOperations =
    workState.state === "ready" && workState.key === workKey
      ? workState.operations
      : undefined;
  const [workReceiptState, setWorkReceiptState] = useState<
    | { state: "loading"; key: string }
    | {
        state: "ready";
        key: string;
        receipts: readonly (
          | PetraProjectWorkOperationReceipt
          | PetraProjectWorkResumeReceipt
          | PetraProjectWorkStartAgainReceipt
        )[];
      }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  useEffect(() => {
    if (selectedWorkId === undefined || verifiedWork === undefined) return;
    let active = true;
    setWorkReceiptState({ state: "loading", key: workKey });
    void readProjectWorkReceipts(project.id, selectedWorkId).then(
      (receipts) => {
        if (active)
          setWorkReceiptState({ state: "ready", key: workKey, receipts });
      },
      (error: unknown) => {
        if (active)
          setWorkReceiptState({
            state: "unavailable",
            key: workKey,
            message: readFailure(
              error,
              "Petra could not read retained receipts for this Work task.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, selectedWorkId, verifiedWork, workKey]);
  const displayWorkReceiptState =
    workReceiptState.key === workKey
      ? workReceiptState
      : ({ state: "loading" } as const);
  const workReceipts =
    verifiedWork !== undefined && displayWorkReceiptState.state === "ready"
      ? displayWorkReceiptState.receipts
      : [];
  const requestedObject = query.get("object");
  const projectObjectRequested = requestedObject === project.id;
  const objectiveObjectRequested =
    requestedObject !== null &&
    requestedObject === project.importBinding?.focusedObjectiveRef.objectiveId;
  const requestedReviewId =
    requestedObject !== null &&
    /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(requestedObject)
      ? requestedObject
      : undefined;
  const requestedEventId =
    requestedObject !== null &&
    /^event_[0-9A-HJKMNP-TV-Z]{26}$/u.test(requestedObject)
      ? requestedObject
      : undefined;
  const [reviewState, setReviewState] = useState<
    | { state: "loading"; id: string }
    | { state: "ready"; id: string; review: ReviewSession }
    | { state: "unavailable"; id: string; message: string }
  >({ state: "loading", id: "" });
  useEffect(() => {
    if (requestedReviewId === undefined) return;
    let active = true;
    setReviewState({ state: "loading", id: requestedReviewId });
    void getProjectReviewSession(project.id, requestedReviewId).then(
      (review) => {
        if (active)
          setReviewState({ state: "ready", id: requestedReviewId, review });
      },
      (error: unknown) => {
        if (active)
          setReviewState({
            state: "unavailable",
            id: requestedReviewId,
            message: readFailure(
              error,
              "Petra could not resolve this Review in the Project. Return to the Review and try again.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, requestedReviewId]);
  const displayReviewState =
    reviewState.id === requestedReviewId
      ? reviewState
      : ({ state: "loading" } as const);
  const verifiedReview =
    requestedReviewId !== undefined && displayReviewState.state === "ready"
      ? displayReviewState.review
      : undefined;
  const [eventState, setEventState] = useState<
    | { state: "loading"; id: string }
    | { state: "ready"; id: string; data: ProjectHistoryEventData }
    | { state: "unavailable"; id: string; message: string }
  >({ state: "loading", id: "" });
  useEffect(() => {
    if (requestedEventId === undefined) return;
    let active = true;
    setEventState({ state: "loading", id: requestedEventId });
    void getProjectHistoryEvent(project.id, requestedEventId).then(
      (data) => {
        if (active)
          setEventState({ state: "ready", id: requestedEventId, data });
      },
      (error: unknown) => {
        if (active)
          setEventState({
            state: "unavailable",
            id: requestedEventId,
            message: readFailure(
              error,
              "Petra could not read this exact History event. Return to History and try again.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [project.id, requestedEventId]);
  const displayEventState =
    eventState.id === requestedEventId
      ? eventState
      : ({ state: "loading" } as const);
  const verifiedEvent =
    requestedEventId !== undefined && displayEventState.state === "ready"
      ? displayEventState.data
      : undefined;
  const operationIds = (query.get("operations") ?? "")
    .split(",")
    .filter((id) => /^[a-z][a-z0-9.-]{1,80}$/u.test(id))
    .slice(0, 8);
  const returnPath = safeInspectionReturn(project.id, query.get("from"));
  const ownerPath =
    verifiedEvent !== undefined
      ? projectPath(
          project,
          `history/${encodeURIComponent(verifiedEvent.episode.event_id)}`,
        )
      : verifiedReview !== undefined
        ? projectPath(
            project,
            `review/${encodeURIComponent(verifiedReview.id)}`,
          )
        : selection === undefined
          ? undefined
          : owningSurfacePath(project, selection);
  const historyTarget =
    selection !== undefined && isRetainedTargetKey(selection.semanticKey)
      ? { semantic_key: selection.semanticKey, object_id: selection.objectId }
      : undefined;
  const historyPath =
    historyTarget === undefined
      ? projectPath(project, "history")
      : `${projectPath(project, "history")}?${new URLSearchParams({ target: `${historyTarget.semantic_key}::${historyTarget.object_id}` })}`;
  const historyAvailable = placeAvailable(project, "history");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<
    | { state: "loading"; key: string }
    | { state: "ready"; key: string; view: PetraProjectHistoryRetainedViewV12 }
    | { state: "unavailable"; key: string; message: string }
  >({ state: "loading", key: "" });
  const selectedSemanticKey = historyTarget?.semantic_key;
  const selectedObjectId = historyTarget?.object_id;
  const historyKey = `${project.id}:${selectedSemanticKey ?? ""}:${selectedObjectId ?? ""}`;
  const displayHistory =
    history.key === historyKey ? history : ({ state: "loading" } as const);
  useEffect(() => {
    if (!historyOpen || !historyAvailable) return;
    let active = true;
    setHistory({ state: "loading", key: historyKey });
    void getRetainedProjectHistory(project.id, {
      limit: 10,
      ...(selectedSemanticKey === undefined || selectedObjectId === undefined
        ? {}
        : {
            filters: {
              target: {
                semantic_key: selectedSemanticKey,
                object_id: selectedObjectId,
              },
            },
          }),
    }).then(
      (view) => {
        if (active) setHistory({ state: "ready", key: historyKey, view });
      },
      (error: unknown) => {
        if (active)
          setHistory({
            state: "unavailable",
            key: historyKey,
            message: readFailure(
              error,
              "Petra could not read retained History. Try opening it again.",
            ),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [
    historyOpen,
    historyAvailable,
    project.id,
    selectedSemanticKey,
    selectedObjectId,
    historyKey,
  ]);
  return (
    <div
      className="reference-inspect"
      data-inspect-snapshot={project.snapshot.id}
    >
      <div className="reference-inspect__intro">
        <p className="reference-panel-kicker">Project inspection</p>
        <h1>
          {verifiedSource?.title ??
            verifiedWork?.objective ??
            selection?.label ??
            verifiedReview?.title ??
            verifiedEvent?.episode.content.change.observed_effect.summary ??
            (objectiveObjectRequested ? "Current objective" : project.title)}
        </h1>
        <p>
          {verifiedWork !== undefined
            ? `${verifiedWork.executionLabel} · ${verifiedWork.expectedOutcome}`
            : verifiedSource === undefined
              ? (selection?.summary ??
                verifiedReview?.objective ??
                verifiedEvent?.episode.content.change.observed_effect.summary ??
                project.objective)
              : `${verifiedSource.kind} · ${verifiedSource.role} · ${verifiedSource.extentLabel}`}
        </p>
        <Link to={returnPath}>Return to task</Link>
      </div>

      <section aria-labelledby="inspect-explanation">
        <h2 id="inspect-explanation">Explanation</h2>
        <p>{project.objective}</p>
        <dl>
          <div>
            <dt>Project state</dt>
            <dd>{project.stateLabel}</dd>
          </div>
          <div>
            <dt>Selected object</dt>
            <dd>
              {verifiedSource?.title ??
                verifiedWork?.objective ??
                selection?.label ??
                verifiedReview?.title ??
                (verifiedEvent === undefined ? undefined : "History event") ??
                (objectiveObjectRequested
                  ? "Current objective"
                  : "Project outcome")}
            </dd>
          </div>
          {verifiedReview === undefined ? null : (
            <div>
              <dt>Review state</dt>
              <dd>{verifiedReview.statusLabel}</dd>
            </div>
          )}
          {verifiedEvent === undefined ? null : (
            <div>
              <dt>Event outcome</dt>
              <dd>
                {verifiedEvent.episode.content.change.observed_effect.outcome}
              </dd>
            </div>
          )}
          {selection === undefined ? null : (
            <div>
              <dt>Resolution</dt>
              <dd>{selection.state}</dd>
            </div>
          )}
        </dl>
        {requestedObject === null ||
        requestedObject === selection?.objectId ||
        projectObjectRequested ||
        objectiveObjectRequested ||
        verifiedReview !== undefined ||
        verifiedEvent !== undefined ||
        requestedReviewId !== undefined ||
        requestedEventId !== undefined ? null : (
          <p role="status">
            The requested object {requestedObject} was not resolved in this
            Project shell read.
          </p>
        )}
        {requestedReviewId === undefined ? null : displayReviewState.state ===
          "loading" ? (
          <p role="status">Reading this exact Review…</p>
        ) : displayReviewState.state === "unavailable" ? (
          <p role="alert">{displayReviewState.message}</p>
        ) : null}
        {selectedSourceId === undefined ? null : sourceState.key !==
            sourceKey || sourceState.state === "loading" ? (
          <p role="status">Reading this exact Source…</p>
        ) : sourceState.state === "unavailable" ? (
          <p role="alert">{sourceState.message}</p>
        ) : null}
        {selectedWorkId === undefined ? null : workState.key !== workKey ||
          workState.state === "loading" ? (
          <p role="status">Reading this exact Work task…</p>
        ) : workState.state === "unavailable" ? (
          <p role="alert">{workState.message}</p>
        ) : null}
        {requestedEventId === undefined ? null : displayEventState.state ===
          "loading" ? (
          <p role="status">Reading this exact History event…</p>
        ) : displayEventState.state === "unavailable" ? (
          <p role="alert">{displayEventState.message}</p>
        ) : null}
      </section>

      <details>
        <summary>Basis and limitations</summary>
        <p>{selection?.summary ?? project.focus.summary}</p>
        <p>{project.projection.detail}</p>
        {verifiedSource === undefined ? null : (
          <>
            <dl>
              <div>
                <dt>Creator</dt>
                <dd>{verifiedSource.creator || "Not supplied"}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{verifiedSource.revision}</dd>
              </div>
              <div>
                <dt>Copy</dt>
                <dd>{verifiedSource.copy}</dd>
              </div>
              <div>
                <dt>Rights</dt>
                <dd>{verifiedSource.rights}</dd>
              </div>
            </dl>
            {verifiedSource.excerpt === undefined ? null : (
              <figure>
                <blockquote>{verifiedSource.excerpt.text}</blockquote>
                <figcaption>
                  {verifiedSource.excerpt.heading} ·{" "}
                  {verifiedSource.excerpt.locator}
                </figcaption>
              </figure>
            )}
            <p>{verifiedSource.downstreamUse}</p>
            {verifiedSource.limitation === undefined ? null : (
              <p>{verifiedSource.limitation}</p>
            )}
            {processingState.key !== sourceKey ||
            processingState.state === "loading" ? (
              <p role="status">Reading exact processing details…</p>
            ) : processingState.state === "unavailable" ? (
              <p role="status">{processingState.message}</p>
            ) : verifiedProcessing === undefined ? null : (
              <div className="reference-inspect__processing">
                <h3>Processing and representation</h3>
                <dl>
                  <div>
                    <dt>Representation</dt>
                    <dd>{verifiedProcessing.representation.extent_label}</dd>
                  </div>
                  <div>
                    <dt>Verified spans</dt>
                    <dd>
                      {verifiedProcessing.representation.source_span_count}{" "}
                      source spans across{" "}
                      {verifiedProcessing.representation.page_count} pages
                    </dd>
                  </div>
                  <div>
                    <dt>Processing state</dt>
                    <dd>
                      {verifiedProcessing.processing.state === "ready"
                        ? "Ready for one exact processing request"
                        : verifiedProcessing.processing.state === "unavailable"
                          ? verifiedProcessing.processing.reason.replaceAll(
                              "_",
                              " ",
                            )
                          : `${verifiedProcessing.processing.state} Work ${verifiedProcessing.processing.work_unit_ref.work_unit_id}`}
                    </dd>
                  </div>
                </dl>
                <ul>
                  {verifiedProcessing.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {verifiedWork === undefined ? null : (
          <>
            <p>{verifiedWork.origin}</p>
            <p>{verifiedWork.expectedOutcome}</p>
            {verifiedWork.stages.length === 0 ? null : (
              <ol>
                {verifiedWork.stages.map((stage) => (
                  <li key={stage.id}>
                    {stage.label}: {stage.stateLabel}. {stage.purpose}
                  </li>
                ))}
              </ol>
            )}
            {verifiedWork.stagePlanLimitation === undefined ? null : (
              <p>{verifiedWork.stagePlanLimitation}</p>
            )}
            {verifiedWork.results.length === 0 ? null : (
              <ul>
                {verifiedWork.results.map((result) => (
                  <li key={result.id}>
                    {result.label}: {result.status}. {result.limitation}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {verifiedReview === undefined ? null : (
          <>
            <h3>Review basis</h3>
            <ul>
              {verifiedReview.basis.map((basis) => (
                <li key={basis.id}>
                  <strong>{basis.label}</strong> — {basis.detail}
                </li>
              ))}
            </ul>
            <p>
              <strong>Validation:</strong> {verifiedReview.validation.label}.{" "}
              {verifiedReview.validation.detail}
            </p>
            {verifiedReview.qualifications.length === 0 ? null : (
              <>
                <h3>Recorded qualifications</h3>
                <ul>
                  {verifiedReview.qualifications.flatMap((qualification) =>
                    qualification.statements.map((statement) => (
                      <li
                        key={`${qualification.recordId}:${statement.kind}:${statement.statement}`}
                      >
                        {statement.kind}: {statement.statement}
                      </li>
                    )),
                  )}
                </ul>
              </>
            )}
            {verifiedReview.members === undefined ||
            verifiedReview.members.length < 2 ? null : (
              <>
                <h3>Review members</h3>
                <ul>
                  {verifiedReview.members.map((member) => (
                    <li key={member.reviewMemberId}>
                      {member.candidate.kind}: {member.candidate.proposed} ·{" "}
                      {member.outcome.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {verifiedEvent === undefined ? null : (
          <>
            <h3>Recorded targets</h3>
            <ul>
              {verifiedEvent.episode.content.change.targets.map((target) => (
                <li key={`${target.semantic_key}:${target.object_id}`}>
                  {target.role}: {target.semantic_key} · {target.object_id} ·
                  revision {target.revision}
                </li>
              ))}
            </ul>
            <dl>
              <div>
                <dt>Recorded actor</dt>
                <dd>
                  {verifiedEvent.episode.content.change.actor.actor_kind} ·{" "}
                  <code>
                    {verifiedEvent.episode.content.change.actor.actor_id}
                  </code>
                </dd>
              </div>
              <div>
                <dt>Occurred</dt>
                <dd>{verifiedEvent.episode.content.change.occurred_at}</dd>
              </div>
              <div>
                <dt>Historical Project definition</dt>
                <dd>
                  {verifiedEvent.episode.content.project_definition_authority
                    .state === "available" ? (
                    <>
                      <code>
                        {
                          verifiedEvent.episode.content
                            .project_definition_authority.project_definition_ref
                            .project_definition_id
                        }
                      </code>{" "}
                      · revision{" "}
                      {
                        verifiedEvent.episode.content
                          .project_definition_authority.project_definition_ref
                          .revision
                      }
                    </>
                  ) : (
                    verifiedEvent.episode.content.project_definition_authority
                      .reason
                  )}
                </dd>
              </div>
            </dl>
          </>
        )}
        <dl>
          <div>
            <dt>Project definition</dt>
            <dd>
              {project.profile.label}, revision {project.profile.version}
            </dd>
          </div>
          <div>
            <dt>Authority snapshot</dt>
            <dd>
              {project.snapshot.label}, read {project.snapshot.asOf}
            </dd>
          </div>
        </dl>
        {placeAvailable(project, "sources") ? (
          <Link to={projectPath(project, "sources")}>Open sources</Link>
        ) : null}
      </details>

      <details>
        <summary>Control and identity</summary>
        <p>{project.baselineChange}</p>
        {selection === undefined ? null : (
          <dl>
            <div>
              <dt>Semantic key</dt>
              <dd>
                <code>{selection.semanticKey}</code>
              </dd>
            </div>
            <div>
              <dt>Object ID</dt>
              <dd>
                <code>{selection.objectId}</code>
              </dd>
            </div>
            {selection.resolvedRevision === undefined ? null : (
              <div>
                <dt>Revision</dt>
                <dd>{selection.resolvedRevision}</dd>
              </div>
            )}
            {selection.recordHash === undefined ? null : (
              <div>
                <dt>Record hash</dt>
                <dd>
                  <code>{selection.recordHash}</code>
                </dd>
              </div>
            )}
          </dl>
        )}
        {verifiedWork === undefined ? null : (
          <dl>
            <div>
              <dt>Execution</dt>
              <dd>{verifiedWork.executionLabel}</dd>
            </div>
            <div>
              <dt>Authorized limit</dt>
              <dd>{verifiedWork.authorizedLimit}</dd>
            </div>
            {verifiedWork.requiredInput === undefined ? null : (
              <div>
                <dt>Required input</dt>
                <dd>{verifiedWork.requiredInput.question}</dd>
              </div>
            )}
          </dl>
        )}
        {verifiedWorkOperations === undefined ? null : (
          <>
            <h3>Server-assessed Work controls</h3>
            <ul>
              {verifiedWorkOperations.controls.map((control) => (
                <li key={control.operation}>
                  <strong>{control.operation.replaceAll("_", " ")}</strong> ·{" "}
                  {control.state}. {control.reason}
                </li>
              ))}
            </ul>
          </>
        )}
        {selectedSourceId ===
        undefined ? null : displaySourceReceiptState.state === "loading" ? (
          <p role="status">Reading retained Source registration evidence…</p>
        ) : displaySourceReceiptState.state === "unavailable" ? (
          <p role="status">{displaySourceReceiptState.message}</p>
        ) : verifiedSourceReceipt === undefined ? (
          <p>No new-source registration receipt is retained for this Source.</p>
        ) : (
          <>
            <h3>Retained registration receipt</h3>
            <p>{verifiedSourceReceipt.effect.summary}</p>
            <dl>
              <div>
                <dt>Receipt</dt>
                <dd>
                  <code>{verifiedSourceReceipt.receipt_id}</code>
                </dd>
              </div>
              <div>
                <dt>Command</dt>
                <dd>
                  <code>{verifiedSourceReceipt.command_id}</code>
                </dd>
              </div>
              <div>
                <dt>Rights decision</dt>
                <dd>
                  <code>
                    {
                      verifiedSourceReceipt.material.rights_decision_ref
                        .record_id
                    }
                  </code>
                </dd>
              </div>
              <div>
                <dt>Recorded actor</dt>
                <dd>
                  <code>{verifiedSourceReceipt.actor.actor_id}</code>
                </dd>
              </div>
              <div>
                <dt>Capability grant</dt>
                <dd>
                  <code>{verifiedSourceReceipt.capability_grant_id}</code>
                </dd>
              </div>
              <div>
                <dt>Recorded</dt>
                <dd>{verifiedSourceReceipt.recorded_at}</dd>
              </div>
            </dl>
          </>
        )}
        {verifiedWork === undefined ? null : (
          <>
            <h3>Recent retained command receipts</h3>
            {displayWorkReceiptState.state === "loading" ? (
              <p>Reading receipts for this task…</p>
            ) : displayWorkReceiptState.state === "unavailable" ? (
              <p role="status">{displayWorkReceiptState.message}</p>
            ) : workReceipts.length === 0 ? (
              <p>No retained commands by this actor for this task.</p>
            ) : (
              <ol>
                {workReceipts.map((receipt) => (
                  <li key={receipt.receipt_id}>
                    <strong>{receipt.effect.summary}</strong>
                    <p>
                      {"operation" in receipt
                        ? receipt.operation.replaceAll("_", " ")
                        : receipt.outcome.replaceAll("_", " ")}{" "}
                      · recorded {receipt.recorded_at} · Project authority
                      unchanged
                    </p>
                    <p>
                      Receipt <code>{receipt.receipt_id}</code> · command{" "}
                      <code>{receipt.command_id}</code>
                    </p>
                    <details>
                      <summary>Authority and exact Work transition</summary>
                      <dl>
                        <div>
                          <dt>Recorded actor</dt>
                          <dd>
                            <code>{receipt.actor.actor_id}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Recorded capability grant</dt>
                          <dd>
                            <code>{receipt.capability_grant_id}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Requested task revision</dt>
                          <dd>
                            {"requested_prior_work_unit_ref" in receipt
                              ? receipt.requested_prior_work_unit_ref.revision
                              : receipt.requested_work_unit_ref.revision}
                          </dd>
                        </div>
                        <div>
                          <dt>Resulting task</dt>
                          <dd>
                            <code>
                              {"new_attempt" in receipt
                                ? receipt.new_attempt.work_unit_ref.work_unit_id
                                : receipt.resulting_work_unit_ref.work_unit_id}
                            </code>{" "}
                            · revision{" "}
                            {"new_attempt" in receipt
                              ? receipt.new_attempt.work_unit_ref.revision
                              : receipt.resulting_work_unit_ref.revision}
                          </dd>
                        </div>
                        {"resume_registration" in receipt ? (
                          <div>
                            <dt>Checkpoint resume registration</dt>
                            <dd>
                              <code>
                                {
                                  receipt.resume_registration
                                    .resume_registration_id
                                }
                              </code>
                            </dd>
                          </div>
                        ) : null}
                        {"start_again_registration" in receipt ? (
                          <div>
                            <dt>Fresh input registration</dt>
                            <dd>
                              <code>
                                {
                                  receipt.start_again_registration
                                    .start_again_registration_id
                                }
                              </code>
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Receipt record hash</dt>
                          <dd>
                            <code>{receipt.record_hash}</code>
                          </dd>
                        </div>
                      </dl>
                      <p>
                        This grant authorized the recorded command. Current
                        permission is assessed separately.
                      </p>
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {objectiveObjectRequested && project.importBinding !== undefined ? (
          <dl>
            <div>
              <dt>Objective ID</dt>
              <dd>
                <code>
                  {project.importBinding.focusedObjectiveRef.objectiveId}
                </code>
              </dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>{project.importBinding.focusedObjectiveRef.revision}</dd>
            </div>
          </dl>
        ) : null}
        {verifiedReview === undefined ? null : (
          <>
            <dl>
              <div>
                <dt>Review ID</dt>
                <dd>
                  <code>{verifiedReview.id}</code>
                </dd>
              </div>
              <div>
                <dt>Review revision</dt>
                <dd>{verifiedReview.exactRef.revision}</dd>
              </div>
              <div>
                <dt>Content hash</dt>
                <dd>
                  <code>{verifiedReview.exactRef.contentHash}</code>
                </dd>
              </div>
              <div>
                <dt>Candidate</dt>
                <dd>{verifiedReview.candidate.proposed}</dd>
              </div>
            </dl>
            {verifiedReview.changeSet === undefined ? null : (
              <div>
                <h3>Proposed ChangeSet</h3>
                <p>{verifiedReview.changeSet.atomicity}</p>
                <ul>
                  {verifiedReview.changeSet.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
                {verifiedReview.changeSet.protected.length === 0 ? null : (
                  <p>
                    Protected: {verifiedReview.changeSet.protected.join(", ")}
                  </p>
                )}
              </div>
            )}
            <p>
              <strong>Commitment:</strong>{" "}
              {verifiedReview.commitment.available
                ? "Available for the current validated Review."
                : verifiedReview.commitment.reason}
            </p>
            <h3>Consequences</h3>
            <ul>
              {verifiedReview.consequences.map((consequence) => (
                <li key={consequence}>{consequence}</li>
              ))}
            </ul>
            {verifiedReview.validation.recovery === undefined ? null : (
              <p>
                <strong>Recovery:</strong> {verifiedReview.validation.recovery}
              </p>
            )}
          </>
        )}
        {verifiedEvent === undefined ? null : (
          <>
            <dl>
              <div>
                <dt>Operation</dt>
                <dd>
                  {
                    verifiedEvent.episode.content.change.command_ref
                      .command_name
                  }
                </dd>
              </div>
              <div>
                <dt>Command ID</dt>
                <dd>
                  <code>
                    {
                      verifiedEvent.episode.content.change.command_ref
                        .command_id
                    }
                  </code>
                </dd>
              </div>
              <div>
                <dt>Command fingerprint</dt>
                <dd>
                  <code>
                    {
                      verifiedEvent.episode.content.change.command_ref
                        .command_fingerprint
                    }
                  </code>
                </dd>
              </div>
              <div>
                <dt>Original capability grant</dt>
                <dd>
                  <code>
                    {
                      verifiedEvent.episode.content.change.command_ref
                        .capability_grant_id
                    }
                  </code>
                </dd>
              </div>
              <div>
                <dt>Event ID</dt>
                <dd>
                  <code>{verifiedEvent.episode.event_id}</code>
                </dd>
              </div>
              <div>
                <dt>Project stream revision</dt>
                <dd>
                  {
                    verifiedEvent.episode.content.change.event_ref
                      .stream_revision
                  }
                </dd>
              </div>
              {verifiedEvent.episode.content.receipt_ref ===
              undefined ? null : (
                <div>
                  <dt>Receipt</dt>
                  <dd>
                    <code>
                      {verifiedEvent.episode.content.receipt_ref.record_id}
                    </code>
                  </dd>
                </div>
              )}
            </dl>
            <h3>Current recovery command assessment</h3>
            <ul>
              {verifiedEvent.recovery.content.command_authority.required_commands.map(
                (command) => (
                  <li key={command.command_name}>
                    {command.command_name}: {command.state}
                    {command.state === "denied"
                      ? ` · ${command.reason.replaceAll("_", " ")}`
                      : ""}
                  </li>
                ),
              )}
            </ul>
            <p>
              <strong>Recovery:</strong>{" "}
              {verifiedEvent.recovery.content.assessment.state}.{" "}
              {verifiedEvent.recovery.content.assessment.reason}
            </p>
          </>
        )}
        {operationIds.length === 0 ? null : (
          <p>
            Opened from{" "}
            {operationIds.map((id) => (
              <code key={id}>{id} </code>
            ))}
            .
          </p>
        )}
        <p>
          Command eligibility and receipts appear with the owning Source, Work,
          Review, or History record.
        </p>
        {ownerPath === undefined ? null : (
          <Link to={ownerPath}>Open current object</Link>
        )}
      </details>

      <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
        <summary>Graph and History</summary>
        <p>
          Explore the bounded graph and retained events for this Project.
          {selection !== undefined && historyTarget === undefined
            ? " Targeted History filtering is unavailable for this object type."
            : ""}
        </p>
        {verifiedEvent === undefined ? null : (
          <>
            <p>
              <strong>Causal command:</strong>{" "}
              <code>
                {
                  verifiedEvent.episode.content.causality
                    .event_causation_command_id
                }
              </code>
              .{" "}
              {
                verifiedEvent.episode.content.causality.following_commands
                  .length
              }{" "}
              following commands are in this bounded episode.
            </p>
            <p>
              <strong>Recorded downstream impact:</strong>{" "}
              {verifiedEvent.impact.content.impact.summary.total_count}{" "}
              registered direct dependents;{" "}
              {
                verifiedEvent.recovery.content.causal_impact_basis
                  .semantic_dependency_summary.total_count
              }{" "}
              registered semantic dependents. Direct coverage is{" "}
              {verifiedEvent.impact.content.impact.summary.coverage}; semantic
              coverage is{" "}
              {
                verifiedEvent.recovery.content.causal_impact_basis
                  .semantic_dependency_summary.coverage
              }
              .
            </p>
            <p>
              Petra does not infer downstream effects from those references.
              Transitive and external dependents may remain unknown.
            </p>
          </>
        )}
        {!historyAvailable ? (
          <p>Retained History is unavailable for this Project.</p>
        ) : displayHistory.state === "loading" ? (
          <p role="status">Reading retained events…</p>
        ) : displayHistory.state === "unavailable" ? (
          <p role="status">{displayHistory.message}</p>
        ) : displayHistory.view.content.changes.length === 0 ? (
          <p>
            {historyTarget === undefined
              ? "No retained events are in this page."
              : "No retained events match this selection in the current page."}
          </p>
        ) : (
          <ol className="reference-inspect__events">
            {displayHistory.view.content.changes.map((change) => (
              <li key={change.event_ref.event_id}>
                <Link
                  to={projectInspectPath(
                    project.id,
                    returnPath,
                    undefined,
                    ["history.open"],
                    change.event_ref.event_id,
                  )}
                >
                  {change.observed_effect.summary}
                </Link>
                <small>
                  {change.command_ref.command_name} · {change.recorded_at}
                </small>
              </li>
            ))}
          </ol>
        )}
        <div className="reference-inspect__links">
          {placeAvailable(project, "graph") ? (
            <Link to={projectPath(project, "graph")}>Open focused Graph</Link>
          ) : null}
          {historyAvailable ? (
            <Link to={historyPath}>Open full History</Link>
          ) : null}
          {placeAvailable(project, "work") ? (
            <Link to={projectPath(project, "work")}>Open Work</Link>
          ) : null}
          {placeAvailable(project, "review") ? (
            <Link to={projectPath(project, "review")}>Open Review</Link>
          ) : null}
        </div>
      </details>
    </div>
  );
};
