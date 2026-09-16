import type {
  FocusedGraphAnalysisPosition,
  FocusedGraphComparisonMember,
  FocusedGraphDateFact,
  FocusedGraphAnalysisExactMember,
  PetraFocusedGraphAnalysisView,
} from "@petra/contracts";
import { useState } from "react";

import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import { focusedGraphRegionsFromView } from "./focused-graph-regions.js";
import {
  FocusedGraphResult,
  type FocusedGraphRepresentation,
} from "./FocusedGraphResult.js";
import { FocusedGraphPositionFacts } from "./FocusedGraphPositions.js";

const words = (value: string): string => value.replaceAll("_", " ");

const DateFact = ({
  fact,
}: {
  fact: FocusedGraphDateFact;
}): React.JSX.Element =>
  fact.state === "exact_timestamp" ? (
    <time dateTime={fact.value}>{fact.value}</time>
  ) : (
    <span>
      <strong>
        {fact.state === "unknown" ? "Unknown date" : "Unavailable date"}
      </strong>
      {` · ${fact.reason}`}
    </span>
  );

const profileTerm = (
  positions: readonly FocusedGraphAnalysisPosition[],
  member: FocusedGraphAnalysisExactMember,
): string => {
  for (const position of positions) {
    const semantic =
      position.graph_view.content.profile.resolved_semantics.find(
        (candidate) => candidate.semantic_key === member.semantic_key,
      );
    if (semantic !== undefined) return semantic.term.singular;
  }
  return member.semantic_key;
};

const ComparisonMember = ({
  label,
  member,
  positions,
}: {
  label: string;
  member: FocusedGraphComparisonMember;
  positions: readonly FocusedGraphAnalysisPosition[];
}): React.JSX.Element => (
  <div data-member-state={member.state}>
    <dt>{label}</dt>
    <dd>
      {member.state === "exact" ? (
        <>
          <strong>{profileTerm(positions, member)}</strong>: {member.label}
          <br />
          {words(member.member_kind)} · {words(member.layer)} ·{" "}
          {words(member.authority_position)}
          <br />
          <code>{member.member_key}</code> · revision{" "}
          {member.record_ref.revision}
          <br />
          <code>{member.record_ref.record_hash}</code>
        </>
      ) : member.state === "absent_from_exact_position" ? (
        "Absent from this exact position"
      ) : (
        `Unavailable · ${member.reason}`
      )}
    </dd>
  </div>
);

const ComparisonFacts = ({
  view,
}: {
  view: PetraFocusedGraphAnalysisView;
}): React.JSX.Element => {
  const analysis = view.content.analysis;
  if (analysis.analysis_kind !== "comparison") {
    throw new Error("Comparison facts require a comparison analysis.");
  }
  return (
    <section
      className="focused-graph-analysis__facts"
      aria-labelledby="focused-graph-analysis-facts-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Supplied differences</p>
          <h2 id="focused-graph-analysis-facts-title">Exact comparison</h2>
        </div>
        <span>Coverage · {words(analysis.coverage)}</span>
      </header>
      <p>
        {analysis.common_base.state === "exact" ? (
          <>
            Common base:{" "}
            <code>{analysis.common_base.snapshot.snapshot_id}</code> · event{" "}
            {analysis.common_base.snapshot.event_position}
          </>
        ) : (
          <>Common base unavailable · {analysis.common_base.reason}</>
        )}
      </p>
      <ol className="focused-graph-analysis__differences">
        {analysis.differences.map((difference) => (
          <li
            key={difference.difference_key}
            data-difference-kind={difference.difference_kind}
          >
            <header>
              <strong>{words(difference.difference_kind)}</strong>
              <code>{difference.difference_key}</code>
            </header>
            <dl className="history-facts">
              <ComparisonMember
                label="Before"
                member={difference.before}
                positions={view.content.positions}
              />
              <ComparisonMember
                label="After"
                member={difference.after}
                positions={view.content.positions}
              />
            </dl>
            <p>Basis · {words(difference.basis)}</p>
            {difference.limitations.length === 0 ? null : (
              <ul>
                {difference.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <ul>
        {analysis.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
};

type DependencyRecord = {
  key: string;
  identity: string;
  relation: string;
  detail: string;
};

const DependencyGroup = ({
  label,
  relation,
  authoritySource,
  returnedCount,
  totalCount,
  coverage,
  records,
}: {
  label: string;
  relation: string;
  authoritySource: string;
  returnedCount: number;
  totalCount: number;
  coverage: string;
  records: readonly DependencyRecord[];
}): React.JSX.Element => (
  <article className="focused-graph-analysis__dependency-group">
    <header>
      <div>
        <h5>{label}</h5>
        <p>{words(relation)}</p>
      </div>
      <span>
        {returnedCount} of {totalCount} · {words(coverage)}
      </span>
    </header>
    <p>
      Authority · <code>{authoritySource}</code>
    </p>
    {records.length === 0 ? (
      <p>No records returned in this exact bounded group.</p>
    ) : (
      <ol className="focused-graph-analysis__dependency-records">
        {records.map((record) => (
          <li key={record.key}>
            <strong>{record.detail}</strong>
            <code>{record.identity}</code>
            <span>{words(record.relation)}</span>
          </li>
        ))}
      </ol>
    )}
  </article>
);

const ImpactFacts = ({
  view,
}: {
  view: PetraFocusedGraphAnalysisView;
}): React.JSX.Element => {
  const analysis = view.content.analysis;
  if (analysis.analysis_kind !== "impact") {
    throw new Error("Impact facts require an impact analysis.");
  }
  const source = analysis.dependency_source.content;
  const consequences = analysis.assessed_consequences;
  const directGroups = [
    {
      key: "causal-commands",
      label: "Causal commands",
      group: source.impact.causal_commands,
      records: source.impact.causal_commands.refs.map((record) => ({
        key: record.command_ref.command_id,
        identity: record.command_ref.command_id,
        relation: source.impact.causal_commands.relation,
        detail: `${record.command_ref.command_name} · ${words(record.event_state)} · ${record.outcome}`,
      })),
    },
    {
      key: "outbox-records",
      label: "Outbox records",
      group: source.impact.outbox_records,
      records: source.impact.outbox_records.refs.map((record) => ({
        key: record.outbox_id,
        identity: record.outbox_id,
        relation: source.impact.outbox_records.relation,
        detail: `${words(record.target)} · sequence ${record.target_sequence}`,
      })),
    },
    {
      key: "graph-projection-records",
      label: "Graph projection records",
      group: source.impact.graph_projection_records,
      records: source.impact.graph_projection_records.refs.map((record) => ({
        key: record.graph_projection_record_id,
        identity: record.graph_projection_record_id,
        relation: source.impact.graph_projection_records.relation,
        detail: `${record.outcome} · outbox ${record.outbox_position}`,
      })),
    },
    {
      key: "grounded-response-invalidations",
      label: "Grounded response invalidations",
      group: source.impact.grounded_response_invalidations,
      records: source.impact.grounded_response_invalidations.refs.map(
        (record) => ({
          key: record.grounded_response_id,
          identity: record.grounded_response_id,
          relation: source.impact.grounded_response_invalidations.relation,
          detail: `${words(record.cache_state)} · revision ${record.revision}`,
        }),
      ),
    },
  ];
  return (
    <section
      className="focused-graph-analysis__facts"
      aria-labelledby="focused-graph-analysis-facts-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Recorded dependencies</p>
          <h2 id="focused-graph-analysis-facts-title">
            Impact and assessed consequences
          </h2>
        </div>
        <span>Coverage · {words(analysis.coverage)}</span>
      </header>
      <dl className="history-facts">
        <div>
          <dt>Selected History event</dt>
          <dd>
            {source.selected_event.event_ref.event_type} ·{" "}
            <code>{analysis.dependency_source.event_id}</code>
            <br />
            {source.selected_event.observed_effect.summary}
          </dd>
        </div>
        <div>
          <dt>Direct event and command dependencies</dt>
          <dd>
            {source.impact.summary.total_count} · coverage{" "}
            {words(source.impact.summary.coverage)}
          </dd>
        </div>
        <div>
          <dt>Semantic-target dependencies</dt>
          <dd>
            {source.semantic_target_impact.summary.total_count} · coverage{" "}
            {words(source.semantic_target_impact.summary.coverage)}
          </dd>
        </div>
        <div>
          <dt>Operational dependencies</dt>
          <dd>
            {source.operational_dependency_impact.summary.total_count} ·
            coverage{" "}
            {words(source.operational_dependency_impact.summary.coverage)}
          </dd>
        </div>
        <div>
          <dt>Dependency authority position</dt>
          <dd>
            {words(source.authority.isolation)} · through event{" "}
            {source.authority.through_event_position} · stream revision{" "}
            {source.authority.through_stream_revision}
          </dd>
        </div>
      </dl>
      <details className="focused-graph-analysis__dependencies" open>
        <summary>Exact dependency records</summary>
        <section aria-labelledby="focused-graph-direct-dependencies-title">
          <h3 id="focused-graph-direct-dependencies-title">
            Direct event and command records
          </h3>
          <div className="focused-graph-analysis__dependency-groups">
            {directGroups.map(({ key, label, group, records }) => (
              <DependencyGroup
                key={key}
                label={label}
                relation={group.relation}
                authoritySource={group.authority_source}
                returnedCount={group.returned_count}
                totalCount={group.total_count}
                coverage={group.coverage}
                records={records}
              />
            ))}
          </div>
          <p>Unknowns · {source.impact.unknowns.map(words).join("; ")}</p>
        </section>
        <section aria-labelledby="focused-graph-semantic-dependencies-title">
          <h3 id="focused-graph-semantic-dependencies-title">
            Exact semantic-target records
          </h3>
          {source.semantic_target_impact.target_assessments.map(
            (assessment) => (
              <article
                className="focused-graph-analysis__dependency-target"
                key={`${assessment.target_index}:${assessment.target_ref.object_id}`}
              >
                <header>
                  <h4>
                    {assessment.target_ref.semantic_key} · target{" "}
                    {assessment.target_index + 1}
                  </h4>
                  <code>
                    {assessment.target_ref.object_id}@
                    {assessment.target_ref.revision ?? "unknown revision"}
                  </code>
                </header>
                {assessment.adapter_state === "registered" ? (
                  <div className="focused-graph-analysis__dependency-groups">
                    {assessment.groups.map((group) => (
                      <DependencyGroup
                        key={group.adapter_kind}
                        label={words(group.adapter_kind)}
                        relation={group.relation_scope}
                        authoritySource={group.authority_source}
                        returnedCount={group.returned_count}
                        totalCount={group.total_count}
                        coverage={group.coverage}
                        records={group.refs.map((record) => ({
                          key: record.relation_identity,
                          identity: `${record.object_id}@${record.revision}`,
                          relation: record.relation,
                          detail: `${record.semantic_key} · ${words(record.posture)}`,
                        }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="focused-graph-analysis__unknown">
                    <strong>{words(assessment.adapter_state)}</strong>
                    <p>{assessment.reason}</p>
                  </div>
                )}
              </article>
            ),
          )}
          <p>
            Unknowns ·{" "}
            {source.semantic_target_impact.unknowns.map(words).join("; ")}
          </p>
        </section>
        <section aria-labelledby="focused-graph-operational-dependencies-title">
          <h3 id="focused-graph-operational-dependencies-title">
            Exact operational records
          </h3>
          {source.operational_dependency_impact.target_assessments.map(
            (assessment) => (
              <article
                className="focused-graph-analysis__dependency-target"
                key={`${assessment.target_index}:${assessment.target_ref.object_id}`}
              >
                <header>
                  <h4>
                    {assessment.target_ref.semantic_key} · target{" "}
                    {assessment.target_index + 1}
                  </h4>
                  <code>
                    {assessment.target_ref.object_id}@
                    {assessment.target_ref.revision ?? "unknown revision"}
                  </code>
                </header>
                {assessment.adapter_state === "registered" ? (
                  <div className="focused-graph-analysis__dependency-groups">
                    {assessment.groups.map((group) => (
                      <DependencyGroup
                        key={group.adapter_kind}
                        label={words(group.adapter_kind)}
                        relation={group.relation_scope}
                        authoritySource={group.authority_source}
                        returnedCount={group.returned_count}
                        totalCount={group.total_count}
                        coverage={group.coverage}
                        records={group.refs.map((record) => ({
                          key: record.relation_identity,
                          identity: `${record.object_id}@${record.revision}`,
                          relation: record.relation,
                          detail: `${record.semantic_key} · ${words(record.posture)} · destination ${record.destination.state}${record.destination.state === "unavailable" ? ` · ${record.destination.reason_code}` : ""}`,
                        }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="focused-graph-analysis__unknown">
                    <strong>{words(assessment.adapter_state)}</strong>
                    <p>{assessment.reason}</p>
                  </div>
                )}
              </article>
            ),
          )}
          <p>
            Unknowns ·{" "}
            {source.operational_dependency_impact.unknowns
              .map(words)
              .join("; ")}
          </p>
        </section>
      </details>
      <section aria-labelledby="focused-graph-consequences-title">
        <h3 id="focused-graph-consequences-title">Assessed consequences</h3>
        {consequences.state === "unavailable" ? (
          <div className="focused-graph-analysis__unknown">
            <strong>Unavailable</strong>
            <p>{consequences.reason}</p>
            <p>Coverage · {words(consequences.coverage)}</p>
          </div>
        ) : (
          <ol className="focused-graph-analysis__consequences">
            {consequences.items.map((item) => (
              <li key={item.consequence_key}>
                <header>
                  <strong>{words(item.source_kind)}</strong>
                  <code>{item.review_member_id}</code>
                </header>
                <p>{item.summary}</p>
                <p>
                  Exact targets ·{" "}
                  {item.target_refs
                    .map((target) => `${target.record_id}@${target.revision}`)
                    .join(", ")}
                </p>
                <p>
                  Review source · <code>{item.source.review_session_id}</code> ·{" "}
                  {item.source.schema_version}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p>
        Reversibility {words(source.decision_boundary.reversibility)};
        compensation {words(source.decision_boundary.compensation)}; dependent
        effect {words(source.decision_boundary.dependent_effect)}.
      </p>
      <ul>
        {[...analysis.limitations, ...consequences.limitations].map(
          (limitation) => (
            <li key={limitation}>{limitation}</li>
          ),
        )}
      </ul>
    </section>
  );
};

const TimeFacts = ({
  view,
}: {
  view: PetraFocusedGraphAnalysisView;
}): React.JSX.Element => {
  const analysis = view.content.analysis;
  if (analysis.analysis_kind !== "time") {
    throw new Error("Time facts require a time analysis.");
  }
  return (
    <section
      className="focused-graph-analysis__facts"
      aria-labelledby="focused-graph-analysis-facts-title"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Supplied dates</p>
          <h2 id="focused-graph-analysis-facts-title">
            Time · {words(analysis.temporal_dimension)}
          </h2>
        </div>
        <span>Coverage · {words(analysis.coverage)}</span>
      </header>
      <p>
        <strong>Selected position date:</strong>{" "}
        <DateFact fact={analysis.position_date} />
      </p>
      <p>{analysis.ordering_rationale}</p>
      <ol className="focused-graph-analysis__timeline">
        {analysis.entries.map((entry) => (
          <li key={`${entry.position}:${entry.member.member_key}`}>
            <span aria-hidden="true">{entry.position}</span>
            <div>
              <h3>
                {profileTerm(view.content.positions, entry.member)}:{" "}
                {entry.member.label}
              </h3>
              <p>
                <code>{entry.member.member_key}</code> ·{" "}
                {words(entry.member.layer)} ·{" "}
                {words(entry.member.authority_position)}
              </p>
              <p>
                <DateFact fact={entry.date} /> · basis {words(entry.date_basis)}
              </p>
              <ul>
                {entry.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <ul>
        {analysis.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
};

const Position = ({
  position,
  representation,
}: {
  position: FocusedGraphAnalysisPosition;
  representation: FocusedGraphRepresentation;
}): React.JSX.Element => {
  const regions = focusedGraphRegionsFromView(position.graph_view);
  return (
    <article
      className="focused-graph-analysis__position"
      data-position-role={position.role}
      aria-labelledby={`focused-graph-analysis-${position.position_key.replaceAll(":", "-")}`}
    >
      <h2
        id={`focused-graph-analysis-${position.position_key.replaceAll(":", "-")}`}
      >
        {position.label} · {words(position.role)}
      </h2>
      <p>
        Exact position · <code>{position.position_key}</code>
      </p>
      <FocusedGraphPositionFacts label={position.label} regions={regions} />
      <FocusedGraphResult
        regions={regions}
        representation={representation}
        showRepresentationControls={false}
        idPrefix={`focused-graph-analysis-${position.position_key.replaceAll(":", "-")}-result`}
      />
    </article>
  );
};

export const FocusedGraphAnalysisSurface = ({
  view,
  initialRepresentation = "graph",
}: {
  view: PetraFocusedGraphAnalysisView;
  initialRepresentation?: FocusedGraphRepresentation;
}): React.JSX.Element => {
  const [representation, setRepresentation] =
    useState<FocusedGraphRepresentation>(initialRepresentation);
  const analysis = view.content.analysis;
  if (
    view.schema_name !== "petra.focused-graph-analysis-view" ||
    view.schema_version !== "1.0.0" ||
    analysis.analysis_kind !== view.content.task.task_kind
  ) {
    throw new Error(
      "Focused Graph analysis requires one compatible task-specific contract.",
    );
  }
  return (
    <section
      className="focused-graph-analysis"
      data-analysis-kind={analysis.analysis_kind}
      data-analysis-request-id={view.content.task.analysis_request_id}
      aria-labelledby="focused-graph-analysis-title"
    >
      <header className="graph-task__header">
        <div>
          <p className="reference-panel-kicker">Dedicated analysis</p>
          <h2 id="focused-graph-analysis-title">
            {analysis.analysis_kind === "comparison"
              ? "Comparison"
              : analysis.analysis_kind === "impact"
                ? "Impact"
                : "Time"}
          </h2>
          <p>{view.content.task.question}</p>
        </div>
        <span>Read only · exact supplied facts</span>
      </header>
      <div className="graph-controls focused-graph-analysis__controls">
        <PetraButtonGroup label="Analysis representation">
          {(["graph", "text"] as const).map((value) => (
            <PetraButton
              key={value}
              density="compact"
              variant={representation === value ? "secondary" : "quiet"}
              aria-pressed={representation === value}
              onClick={() => setRepresentation(value)}
            >
              {value === "graph" ? "Graph" : "Text"}
            </PetraButton>
          ))}
        </PetraButtonGroup>
        <p>
          The same exact positions, selection, facts, limitations, destinations,
          and actions remain available in both representations.
        </p>
      </div>
      <p className="focused-graph-peer__boundary">
        PostgreSQL remains authoritative and Neo4j remains a rebuildable
        projection. Layout, proximity, and order do not calculate importance,
        maturity, confidence, currentness, consequences, or dates.
      </p>
      <div
        className="focused-graph-analysis__positions"
        data-focused-analysis-peer={representation}
      >
        {view.content.positions.map((position) => (
          <Position
            key={position.position_key}
            position={position}
            representation={representation}
          />
        ))}
      </div>
      {analysis.analysis_kind === "comparison" ? (
        <ComparisonFacts view={view} />
      ) : analysis.analysis_kind === "impact" ? (
        <ImpactFacts view={view} />
      ) : (
        <TimeFacts view={view} />
      )}
      <footer className="graph-scope">
        <div>
          <strong>Analysis limitations</strong>
          <ul>
            {view.content.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Authority boundary</strong>
          <p>
            Analysis is read-only. The renderer calculates no domain fact or
            universal score, and selection or layout grants no authority.
          </p>
        </div>
      </footer>
    </section>
  );
};
