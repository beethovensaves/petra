import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
} from "../design-system/primitives.js";
import type {
  InquiryBranch,
  PetraThread,
  ProjectRecord,
  WorkProjectView,
  WorkStage,
  WorkUnit,
} from "./model.js";
import type { ProjectWorkDetailData } from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";

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
          {units.length === 0
            ? "No operational Work linked"
            : `${units.length} linked Work ${units.length === 1 ? "task" : "tasks"}`}
        </strong>
        {units.length === 0 ? (
          <p>This inquiry path remains useful without a running task.</p>
        ) : (
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
            Follow durable tasks, required input, results, and operational
            limits without collapsing them into the Project's inquiry paths.
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

export const WorkDetailSurface = ({
  project,
  unit,
  work,
}: {
  project: ProjectRecord;
  unit: WorkUnit;
  work: WorkProjectView;
}): React.JSX.Element => {
  const branches = work.branches.filter((branch) =>
    unit.branchIds.includes(branch.id),
  );

  return (
    <main className="reference-surface work-detail" id="reference-main">
      <header className="work-detail__heading">
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/work`}
        >
          <span aria-hidden="true">←</span> Return to Work
        </Link>
        <div className="work-detail__orientation">
          <div>
            <p className="reference-eyebrow">Work task · {unit.revision}</p>
            <h1>{unit.objective}</h1>
            <p className="reference-lede">{unit.expectedOutcome}</p>
          </div>
          <WorkState unit={unit} />
        </div>
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
      </header>

      {unit.requiredInput === undefined ? null : (
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

      <section className="work-controls" aria-labelledby="work-controls-title">
        <div>
          <p className="reference-panel-kicker">Operational controls</p>
          <h2 id="work-controls-title">Manage this task</h2>
          <p id="work-control-boundary">
            {unit.cancellation} The operational command boundary is unavailable
            in this workspace, so no control can change execution locally.
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
            to={`/projects/${project.id}/petra`}
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
    </main>
  );
};

export const WorkDetailRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const { work, unit } = useLoaderData<ProjectWorkDetailData>();
  return <WorkDetailSurface project={project} unit={unit} work={work} />;
};

const forceClass = (force: PetraThread["messages"][number]["force"]): string =>
  force.replaceAll("_", "-");

export const PetraSurface = ({
  project,
  thread,
}: {
  project: ProjectRecord;
  thread?: PetraThread | undefined;
}): React.JSX.Element => {
  const [draft, setDraft] = useState("");

  return (
    <main className="reference-surface petra-focus" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Petra · current Project</p>
          <h1>{thread?.title ?? "Ask Petra"}</h1>
          <p className="reference-lede">
            {thread?.task ??
              "Ask about an exact Project task after a registered context is available."}
          </p>
        </div>
      </header>

      {thread === undefined ? (
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
            aria-labelledby="petra-thread-title"
          >
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

            <form
              className="petra-composer"
              onSubmit={(event) => event.preventDefault()}
            >
              <PetraTextArea
                label="Message Petra"
                hint="Your unsent text remains local to this page."
                rows={4}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
              />
              <div>
                <span id="petra-send-boundary">
                  The model response boundary is unavailable. No prompt will be
                  sent.
                </span>
                <PetraButton
                  type="submit"
                  variant="primary"
                  aria-disabled="true"
                  aria-describedby="petra-send-boundary"
                >
                  Send
                </PetraButton>
              </div>
            </form>
          </section>

          <aside
            className="petra-task-context"
            aria-labelledby="petra-task-context-title"
          >
            <p className="reference-panel-kicker">Active task context</p>
            <h2 id="petra-task-context-title">
              {thread.activeWorkTitle ?? "Source coverage Work"}
            </h2>
            <p>
              {thread.activeWorkSummary ??
                "The Work task is awaiting an exact permitted-copy choice. The thread can explain this state; only the Work input adapter can resolve it."}
            </p>
            {thread.activeWorkId === undefined ? null : (
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
            <dl>
              <div>
                <dt>Thread</dt>
                <dd>
                  <code>{thread.id}</code>
                </dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>{thread.snapshot}</dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>Explanation and task direction only</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </main>
  );
};

export const PetraRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const thread = useLoaderData<PetraThread | undefined>();
  return <PetraSurface project={project} thread={thread} />;
};
