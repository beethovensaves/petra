import type { PetraProjectBriefReadView } from "@petra/contracts";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  FocusedGraphEntryLink,
  focusedGraphDefinitionRef,
  scientificFocusedGraphEntryDraft,
  scientificFocusedGraphSemantics,
} from "./focused-graph-entry.js";
import {
  ProjectObjectiveControl,
  ProjectObjectiveOutcome,
  type ProjectObjectiveReturnOutcome,
} from "./ProjectObjectiveControl.js";
import type { ProjectObjectiveCommandContext } from "./project-objective-command.js";
import type { ProjectBriefComparisonRecovery } from "./project-data.js";
import { projectWorkDestinationPath } from "./project-work-destination.js";
import "./project-brief.css";

const RecordDetails = ({ label, value }: { label: string; value: unknown }) => (
  <details className="brief-record brief-technical">
    <summary>{label}</summary>
    <pre>{JSON.stringify(value, null, 2)}</pre>
  </details>
);

const Limitations = ({ items }: { items: readonly string[] }) =>
  items.length === 0 ? null : (
    <div className="brief-limitations">
      <strong>Limits</strong>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );

const presentationLabel = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

const originLabels = {
  source_report: "Source report",
  petra_synthesis: "Petra synthesis",
  unresolved_inference: "Unresolved inference",
} as const;

/** Read-only DB07 mapping. All ordering and scientific statements come from the validated view. */
export const ProjectBriefSurface = ({
  view,
  resumeOutcome,
  selectedAction,
  objectiveCommandContext,
  objectiveCommandOutcome,
  comparisonRecovery,
}: {
  view: PetraProjectBriefReadView;
  resumeOutcome?: ReactNode;
  selectedAction?: ReactNode;
  objectiveCommandContext: ProjectObjectiveCommandContext;
  objectiveCommandOutcome?: ProjectObjectiveReturnOutcome;
  comparisonRecovery?: ProjectBriefComparisonRecovery;
}) => {
  const c = view.content;
  const payload = c.profile_payload;
  const focusedGraphSemantics = scientificFocusedGraphSemantics(c.definition);
  const claimTerm = c.definition.content.terms.find(
    (term) => term.semantic_key === "scientific.claim",
  );
  const nextAction = c.next_steps.at(0);
  const currentBriefPath = `/projects/${view.project_id}/brief`;
  const comparisonReturnPath =
    c.comparison.state === "recent_history_interval"
      ? `${currentBriefPath}?${new URLSearchParams({
          baseline_event_id: c.comparison.baseline.event_id,
          baseline_record_hash: c.comparison.baseline.record_hash,
        })}`
      : currentBriefPath;
  return (
    <main className="reference-surface live-project-brief" id="reference-main">
      <header className="brief-heading">
        <div>
          <p className="reference-eyebrow">{c.shell.content.project.name}</p>
          <h1>Brief</h1>
          <p className="reference-lede">
            The current focus, what needs attention, and where to continue.
          </p>
        </div>
        {nextAction === undefined ? null : (
          <a className="reference-primary-link" href="#brief-next">
            Review next step
          </a>
        )}
      </header>
      <div className="brief-position" aria-label="Current Brief position">
        <span>{c.definition.content.label}</span>
        <span data-state={c.coverage.state}>
          {presentationLabel(c.coverage.state)} coverage
        </span>
        <span data-state={c.shell.content.projection.state}>
          {c.shell.content.projection.label}
        </span>
      </div>
      {resumeOutcome}
      {objectiveCommandOutcome === undefined ? null : (
        <ProjectObjectiveOutcome outcome={objectiveCommandOutcome} />
      )}
      <section
        className="brief-section brief-focus"
        aria-labelledby="brief-focus"
      >
        <p className="reference-panel-kicker">Orientation</p>
        <h2 id="brief-focus" tabIndex={-1}>
          Current focus
        </h2>
        <p className="brief-focus__statement">{c.orientation.statement}</p>
        <ProjectObjectiveControl context={objectiveCommandContext} />
        <Limitations items={c.coverage.limitations} />
        <RecordDetails
          label="Technical position and scope"
          value={{
            read_at: view.read_at,
            snapshot_hash: view.snapshot_hash,
            objective: c.objective,
            definition: c.definition,
            registration: c.profile_registration,
            shell: c.shell,
            content_hash: view.content_hash,
          }}
        />
      </section>
      <section
        className="brief-section brief-attention"
        aria-labelledby="brief-attention"
      >
        <p className="reference-panel-kicker">Act first</p>
        <h2 id="brief-attention">Needs your attention</h2>
        <p>
          Items appear in the order supplied by the Project. Leaving one for
          later does not dismiss it.
        </p>
        {c.attention.length === 0 ? (
          <p className="brief-empty">
            No attention items were returned within this coverage.
          </p>
        ) : (
          <ol className="brief-attention-list">
            {c.attention.map((item, index) => {
              const focusId = `brief-attention-item-${index}`;
              const workOwner =
                item.owner === "work"
                  ? c.work.find(
                      (work) =>
                        work.content.view_kind === "detail" &&
                        work.content.summary.work_unit_ref.work_unit_id ===
                          item.item_id,
                    )
                  : undefined;
              const workDestination =
                workOwner?.content.view_kind === "detail"
                  ? workOwner.content.summary.destination.target_ref
                  : undefined;
              return (
                <li key={item.item_id} id={focusId} tabIndex={-1}>
                  <details
                    name="brief-attention-observation"
                    open={index === 0}
                  >
                    <summary>{item.reason}</summary>
                    <p>
                      Review the {item.owner} observation. Its recorded
                      consequence is{" "}
                      {presentationLabel(
                        item.consequence_class,
                      ).toLocaleLowerCase()}
                      .
                    </p>
                    {workDestination === undefined ? (
                      <p className="brief-owner-unavailable">
                        This Brief does not contain an exact visible destination
                        for the canonical owner. Refresh before navigating.
                      </p>
                    ) : (
                      <Link
                        className="reference-primary-link"
                        to={projectWorkDestinationPath(
                          view.project_id,
                          workDestination,
                          {
                            path: `${comparisonReturnPath}#${focusId}`,
                            label: "Brief attention",
                            focusId,
                          },
                        )}
                      >
                        Open exact Work task
                      </Link>
                    )}
                    <RecordDetails
                      label="Exact attention and owner observation"
                      value={{
                        item,
                        owner:
                          item.owner === "shell"
                            ? c.shell
                            : item.owner === "review"
                              ? c.reviews.find(
                                  (r) => r.review_session_id === item.item_id,
                                )
                              : c.work.find(
                                  (w) =>
                                    w.content.view_kind === "detail" &&
                                    w.content.summary.work_unit_ref
                                      .work_unit_id === item.item_id,
                                ),
                      }}
                    />
                  </details>
                </li>
              );
            })}
          </ol>
        )}
        <RecordDetails label="Technical Review coverage" value={c.reviews} />
      </section>
      <section
        className="brief-section brief-changed"
        aria-labelledby="brief-changed"
      >
        <p className="reference-panel-kicker">Since the baseline</p>
        <h2 id="brief-changed" tabIndex={-1}>
          What changed
        </h2>
        {comparisonRecovery === undefined ? null : (
          <div
            className="brief-comparison-recovery"
            data-state={comparisonRecovery.state}
            role="status"
          >
            <strong>
              {comparisonRecovery.state === "stale"
                ? "The Brief changed before comparison"
                : "That baseline is no longer available"}
            </strong>
            <p>
              {comparisonRecovery.state === "stale"
                ? "Petra re-read the current Brief without substituting a comparison. Choose a current History baseline to try again."
                : "Petra re-read the current Brief without inventing a historical snapshot. Choose another retained History event."}
            </p>
            <details className="brief-technical">
              <summary>Comparison recovery detail</summary>
              <p>{comparisonRecovery.reason}</p>
              <code>{comparisonRecovery.eventId}</code>
            </details>
          </div>
        )}
        {c.comparison.state === "current_only" ? (
          <>
            <p>{c.comparison.reason}</p>
            {c.recent_decisions.content.changes.length === 0 ? (
              <p className="brief-empty">
                No retained recent History event is available as a comparison
                baseline.
              </p>
            ) : (
              <ul className="brief-baseline-list" aria-label="Brief baselines">
                {c.recent_decisions.content.changes.map((change) => (
                  <li key={change.event_ref.event_id}>
                    <Link
                      className="reference-text-link"
                      to={`${currentBriefPath}?${new URLSearchParams({
                        baseline_event_id: change.event_ref.event_id,
                        baseline_record_hash: change.event_ref.record_hash,
                      })}#brief-changed`}
                    >
                      Compare from {change.observed_effect.summary}
                    </Link>
                    <span>
                      {new Date(change.occurred_at).toLocaleString()} · event
                      position {change.event_ref.event_position}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p>
              This exact interval starts after the selected History event and
              runs through current authority position{" "}
              {c.comparison.through.through_event_position}.
            </p>
            <p>{c.comparison.limitation}</p>
            {c.comparison.changes.length === 0 ? (
              <p className="brief-empty">
                No canonical changes occurred after this baseline.
              </p>
            ) : (
              <ol className="brief-change-list">
                {c.comparison.changes.map((change) => (
                  <li key={change.event_ref.event_id}>
                    <strong>{change.observed_effect.summary}</strong>
                    <span>
                      {presentationLabel(change.event_ref.event_type)} · event
                      position {change.event_ref.event_position}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="brief-change-actions">
              <Link
                className="reference-primary-link"
                to={`${comparisonReturnPath}&${new URLSearchParams({
                  expected_snapshot_hash: view.snapshot_hash,
                })}#brief-changed`}
              >
                Refresh this exact comparison
              </Link>
              <Link
                className="reference-text-link"
                to={`${currentBriefPath}#brief-changed`}
              >
                Return to current Brief
              </Link>
            </div>
            <RecordDetails
              label="Technical comparison endpoints and changes"
              value={c.comparison}
            />
          </>
        )}
      </section>
      <section
        className="brief-section brief-state"
        aria-labelledby="brief-state"
      >
        <p className="reference-panel-kicker">Grounded picture</p>
        <h2 id="brief-state">Current state</h2>
        <p>
          These retained results remain separately attributable. They do not by
          themselves establish admissible inquiry basis, accepted findings,
          inquiry resolution, or Hypothesis standing.
        </p>
        <Limitations items={payload.limitations} />
        {payload.schema_version === "1.0.0" ? (
          <p>
            Retained synthesis is unavailable in this registered payload
            version.
          </p>
        ) : (
          <>
            <p>
              Results linked to the current Objective are shown below. This read
              returned {payload.current_state.syntheses.length} of at most{" "}
              {payload.current_state.coverage.link_limit} linked results; the
              limit is shared with Work links.
            </p>
            <Limitations items={payload.current_state.limitations} />
            {payload.current_state.syntheses.length === 0 ? (
              <p>
                No addressing results were returned within this query. Relevant
                evidence and unresolved questions may exist outside it.
              </p>
            ) : (
              payload.current_state.syntheses.map((synthesis, index) => (
                <article
                  className="brief-result"
                  key={synthesis.project_inquiry_link_id}
                  aria-labelledby={`brief-result-${index}`}
                >
                  <header className="brief-result__heading">
                    <div>
                      <p className="reference-panel-kicker">
                        Retained Project result
                      </p>
                      <h3 id={`brief-result-${index}`} tabIndex={-1}>
                        Result {index + 1}
                      </h3>
                    </div>
                    <span
                      className="reference-status"
                      data-state={
                        synthesis.current_response.content.cache.state
                      }
                    >
                      {presentationLabel(
                        synthesis.current_response.content.cache.state,
                      )}
                    </span>
                  </header>
                  <p className="brief-result__position">
                    Linked response revision{" "}
                    {synthesis.linked_response.revision}; current response
                    revision {synthesis.current_response.revision}. Current
                    cache observation:{" "}
                    <strong>
                      {synthesis.current_response.content.cache.state}
                    </strong>
                    .
                  </p>
                  <p>
                    This result keeps its original evidence position.
                    Reusability does not establish complete current Project
                    coverage.
                  </p>
                  <RecordDetails
                    label="Technical result identity, position, and invalidation"
                    value={{
                      link: c.inquiry_links.find(
                        (link) =>
                          link.project_inquiry_link_id ===
                          synthesis.project_inquiry_link_id,
                      ),
                      linked_response: synthesis.linked_response,
                      current_response: synthesis.current_response,
                    }}
                  />
                  <ol className="brief-statements">
                    {synthesis.output.statements.map((statement) => {
                      const claimRefs = statement.evidence_refs.filter(
                        (reference) => reference.object_kind === "claim",
                      );
                      const workPreviewTarget = c.next_steps.find(
                        (action) =>
                          action.content.action.basis.inquiry_result_link_ref
                            .project_inquiry_link_id ===
                          synthesis.project_inquiry_link_id,
                      )?.content.action.basis.inquiry_result_link_ref;
                      return (
                        <li key={statement.statement_key}>
                          <h4>{originLabels[statement.origin]}</h4>
                          <p>{statement.text}</p>
                          <Limitations items={statement.limitations} />
                          {statement.origin === "unresolved_inference" ? (
                            <p>
                              <strong>Resolution requirement: </strong>
                              {statement.resolution_requirement}
                            </p>
                          ) : null}
                          <RecordDetails
                            label={`Technical evidence references for ${statement.statement_key}`}
                            value={statement.evidence_refs}
                          />
                          {focusedGraphSemantics === undefined ||
                          claimRefs.length === 0 ? null : (
                            <ul>
                              {claimRefs.map((reference) => {
                                const focusRef = {
                                  record_id: reference.object_id,
                                  revision: reference.object_revision,
                                  record_hash: reference.object_hash,
                                };
                                return (
                                  <li
                                    key={`${reference.object_id}:${reference.context_selection_order}`}
                                  >
                                    <FocusedGraphEntryLink
                                      entry={scientificFocusedGraphEntryDraft({
                                        projectId: view.project_id,
                                        question: `Which recorded relationships concern this ${claimTerm?.singular ?? "Claim"}?`,
                                        focusRef,
                                        originKind: "brief",
                                        definitionRef:
                                          focusedGraphDefinitionRef(
                                            c.definition,
                                          ),
                                        returnDestinationKind: "brief",
                                        returnDestinationOwner:
                                          "project_brief_view",
                                        returnLabel: "Brief result",
                                        returnFocusId: `brief-result-${index}`,
                                        ...(workPreviewTarget === undefined
                                          ? {}
                                          : {
                                              actionPreviewTarget: {
                                                action_kind: "new_work",
                                                inquiry_result_link_ref:
                                                  structuredClone(
                                                    workPreviewTarget,
                                                  ),
                                              },
                                            }),
                                      })}
                                    >
                                      Inspect bounded current relationships for
                                      this {claimTerm?.singular ?? "Claim"}
                                    </FocusedGraphEntryLink>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <p>{synthesis.output.coverage.statement}</p>
                  <RecordDetails
                    label="Complete output and original coverage"
                    value={synthesis.output}
                  />
                  <RecordDetails
                    label="Complete original ContextPacket and EvidencePacket basis, freshness, omissions, and limitations"
                    value={{
                      context_packet: synthesis.context_packet,
                      evidence_packet: synthesis.evidence_packet,
                    }}
                  />
                </article>
              ))
            )}
          </>
        )}
        <p className="brief-coverage-note">
          Source inventory coverage: {payload.source_coverage}. Source
          observations and packet coverage are separate.
        </p>
        <RecordDetails
          label="Technical source observations and limitations"
          value={payload.sources}
        />
        <RecordDetails
          label="Technical current-Objective inquiry links"
          value={c.inquiry_links}
        />
      </section>
      <section
        className="brief-section brief-work"
        aria-labelledby="brief-work"
      >
        <p className="reference-panel-kicker">In progress and retained</p>
        <h2 id="brief-work">Work</h2>
        <p>
          {c.work.length === 0
            ? "No Work records were returned for the current Objective."
            : `${c.work.length} Work ${c.work.length === 1 ? "record is" : "records are"} linked to the current Objective.`}{" "}
          Operational completion does not resolve the inquiry or apply a result.
        </p>
        <Link
          className="reference-text-link"
          to={`/projects/${view.project_id}/work`}
        >
          Open Work
        </Link>
        <RecordDetails
          label="Technical Work revisions, outcomes, and provenance"
          value={c.work}
        />
      </section>
      <section
        className="brief-section brief-next"
        aria-labelledby="brief-next"
      >
        <p className="reference-panel-kicker">Continue from here</p>
        <h2 id="brief-next">Next steps</h2>
        <p>
          A preferred recommendation and ranked alternatives are unavailable.
          These returned actions inspect existing results.
        </p>
        {c.next_steps.length === 0 ? (
          <p className="brief-empty">
            No SuggestedActions were returned within this coverage.
          </p>
        ) : (
          <ul className="brief-next-list">
            {c.next_steps.map((action) => (
              <li
                key={
                  action.content.action.basis.inquiry_result_link_ref
                    .project_inquiry_link_id
                }
              >
                <h3>{action.content.action.title}</h3>
                <p>{action.content.action.reason}</p>
                <Link
                  className="reference-primary-link"
                  to={`/projects/${view.project_id}/brief?inquiry_result_link_id=${encodeURIComponent(action.content.action.basis.inquiry_result_link_ref.project_inquiry_link_id)}`}
                >
                  Read current preview for this result
                </Link>
                <RecordDetails
                  label="Technical SuggestedAction in this Brief snapshot"
                  value={action}
                />
              </li>
            ))}
          </ul>
        )}
        {selectedAction === undefined ? null : (
          <aside
            className="brief-selected-action"
            aria-label="Separately read current action preview"
          >
            <p>
              This selected preview is read separately from the Brief snapshot
              and keeps its own basis and freshness.
            </p>
            {selectedAction}
          </aside>
        )}
      </section>
      <section
        className="brief-section brief-decisions"
        aria-labelledby="brief-decisions"
      >
        <p className="reference-panel-kicker">Recent Project effects</p>
        <h2 id="brief-decisions">Recent decisions</h2>
        <p>
          Recent-ten canonical History window. Open an exact event to inspect
          its current impact, recovery assessment, and eligible governed Revert
          path.
        </p>
        <p>
          <Link
            className="reference-text-link"
            to={`/projects/${view.project_id}/history`}
          >
            View all Project History
          </Link>
        </p>
        {c.recent_decisions.content.changes.length === 0 ? (
          <p className="brief-empty">
            No recent decisions were returned within this History window.
          </p>
        ) : (
          <ol className="brief-decision-list">
            {c.recent_decisions.content.changes.map((change) => (
              <li key={change.event_ref.event_id}>
                <p>{change.observed_effect.summary}</p>
                <Link
                  className="reference-text-link"
                  to={`/projects/${view.project_id}/history/${change.event_ref.event_id}`}
                >
                  Inspect History event
                </Link>
                <RecordDetails
                  label={`Technical decision ${change.event_ref.event_id}`}
                  value={change}
                />
              </li>
            ))}
          </ol>
        )}
        <RecordDetails
          label="Technical History window and recovery boundaries"
          value={c.recent_decisions}
        />
      </section>
    </main>
  );
};
