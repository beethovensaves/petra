import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import { StateNotice } from "../design-system/state.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
} from "../design-system/primitives.js";
import type {
  PetraCommunicationPlan,
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
  ProjectWorkDetailData,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";
import { SuggestedWorkAction } from "./SuggestedAction.js";

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
}: {
  project: ProjectRecord;
  thread?: PetraThread | undefined;
  suggestedWorkAction?: PetraSuggestedActionViewV11;
  suggestedActionInvocation?: PetraSuggestedActionInvocationView;
  communicationPlan?: PetraCommunicationPlan;
}): React.JSX.Element => {
  const [draft, setDraft] = useState("");

  return (
    <main className="reference-surface petra-focus" id="reference-main">
      <header className="reference-surface-heading">
        <div>
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

      {thread === undefined && communicationPlan === undefined ? (
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
              thread === undefined
                ? "communication-plan-title"
                : "petra-thread-title"
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
            <p className="reference-panel-kicker">
              {communicationPlan === undefined
                ? "Active task context"
                : "Communication boundary"}
            </p>
            <h2 id="petra-task-context-title">
              {thread?.activeWorkTitle ??
                (communicationPlan === undefined
                  ? "Source coverage Work"
                  : "Communication context")}
            </h2>
            <p>
              {thread?.activeWorkSummary ??
                (communicationPlan === undefined
                  ? "The Work task is awaiting an exact permitted-copy choice. The thread can explain this state; only the Work input adapter can resolve it."
                  : "This response is a read-only composition. Its communication record grants no command, Review, recovery, or Project authority.")}
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
              This conversational presentation submits the same exact Petra
              invocation command as Brief.
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
      )}
    </main>
  );
};

export const PetraRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectPetraData>();
  return <PetraSurface project={project} {...data} />;
};
