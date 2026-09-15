import type { PetraProjectBriefReadView } from "@petra/contracts";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  FocusedGraphEntryLink,
  focusedGraphDefinitionRef,
  scientificFocusedGraphEntryDraft,
  scientificFocusedGraphSemantics,
} from "./focused-graph-entry.js";
import "./project-brief.css";

const RecordDetails = ({ label, value }: { label: string; value: unknown }) => (
  <details className="brief-record">
    <summary>{label}</summary>
    <pre>{JSON.stringify(value, null, 2)}</pre>
  </details>
);

const Limitations = ({ items }: { items: readonly string[] }) => (
  <ul>
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const originLabels = {
  source_report: "Source report",
  petra_synthesis: "Petra synthesis",
  unresolved_inference: "Unresolved inference",
} as const;

/** Read-only DB07 mapping. All ordering and scientific statements come from the validated view. */
export const ProjectBriefSurface = ({
  view,
  selectedAction,
}: {
  view: PetraProjectBriefReadView;
  selectedAction?: ReactNode;
}) => {
  const c = view.content;
  const payload = c.profile_payload;
  const focusedGraphSemantics = scientificFocusedGraphSemantics(c.definition);
  const claimTerm = c.definition.content.terms.find(
    (term) => term.semantic_key === "scientific.claim",
  );
  return (
    <main className="reference-surface live-project-brief" id="reference-main">
      <header>
        <p className="reference-panel-kicker">Brief · current observations</p>
        <h1>{c.shell.content.project.name}</h1>
      </header>
      <section aria-labelledby="brief-focus">
        <h2 id="brief-focus">Current focus</h2>
        <p>{c.orientation.statement}</p>
        <p>
          Partial Brief coverage. Read at {view.read_at}. Shell navigation may
          have a separate read position.
        </p>
        <p>
          Brief snapshot: <code>{view.snapshot_hash}</code>
        </p>
        <Limitations items={c.coverage.limitations} />
        <RecordDetails
          label="Objective, profile, authority, and projection observations"
          value={{
            objective: c.objective,
            definition: c.definition,
            registration: c.profile_registration,
            shell: c.shell,
            content_hash: view.content_hash,
          }}
        />
      </section>
      <section aria-labelledby="brief-attention">
        <h2 id="brief-attention">Needs your attention</h2>
        <p>
          Server order within returned coverage. Deferring inspection preserves
          the underlying condition.
        </p>
        {c.attention.length === 0 ? (
          <p>No attention items were returned within this coverage.</p>
        ) : (
          <ol>
            {c.attention.map((item, index) => (
              <li key={item.item_id}>
                <details name="brief-attention-observation" open={index === 0}>
                  <summary>{item.reason}</summary>
                  <p>
                    Consequence class: {item.consequence_class}. Inspect the{" "}
                    {item.owner} observation.
                  </p>
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
            ))}
          </ol>
        )}
        <RecordDetails
          label="All returned Review manifests"
          value={c.reviews}
        />
      </section>
      <section aria-labelledby="brief-changed">
        <h2 id="brief-changed">What changed</h2>
        {c.comparison.state === "current_only" ? (
          <p>{c.comparison.reason}</p>
        ) : (
          <>
            <p>
              Event interval after {c.comparison.baseline.event_id} through
              event position {c.comparison.through.through_event_position}.
            </p>
            <p>{c.comparison.limitation}</p>
            <RecordDetails
              label="Exact comparison endpoints and changes"
              value={c.comparison}
            />
          </>
        )}
        <p>A historical Brief snapshot comparison is unavailable.</p>
      </section>
      <section aria-labelledby="brief-state">
        <h2 id="brief-state">Current state</h2>
        <p>
          Retained addressing results do not establish admissible inquiry basis,
          accepted findings, inquiry resolution, or Hypothesis standing. Results
          remain separately attributable; no preferred interpretation is
          selected.
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
              Addressing results in returned links to the exact current
              Objective. Link query coverage:{" "}
              {payload.current_state.coverage.state}; limit{" "}
              {payload.current_state.coverage.link_limit}, shared with Work
              links.
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
                  key={synthesis.project_inquiry_link_id}
                  aria-labelledby={`brief-result-${index}`}
                >
                  <h3 id={`brief-result-${index}`}>
                    Retained result {index + 1}
                  </h3>
                  <p>
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
                    Original evidence snapshot:{" "}
                    <code>
                      {
                        synthesis.linked_response.content.snapshot_ref
                          .snapshot_id
                      }
                    </code>
                    . Reusability does not establish complete current Project
                    coverage.
                  </p>
                  <RecordDetails
                    label="Exact inquiry link, linked and current response, and invalidation causes"
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
                            label={`Exact evidence references for ${statement.statement_key}`}
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
        <p>
          Source inventory coverage: {payload.source_coverage}. Source
          observations and packet coverage are separate.
        </p>
        <RecordDetails
          label="Complete source observations and limitations"
          value={payload.sources}
        />
        <RecordDetails
          label="All returned exact current-Objective inquiry links"
          value={c.inquiry_links}
        />
      </section>
      <section aria-labelledby="brief-work">
        <h2 id="brief-work">Work</h2>
        <p>
          Returned Work is linked to the current Objective. Newly completed Work
          cannot be identified from this current-only read; operational
          completion does not resolve the inquiry or apply a result.
        </p>
        <RecordDetails
          label="All returned Work revisions, outcomes, and result provenance"
          value={c.work}
        />
      </section>
      <section aria-labelledby="brief-next">
        <h2 id="brief-next">Next steps</h2>
        <p>
          A preferred recommendation and ranked alternatives are unavailable.
          These returned actions inspect existing results.
        </p>
        {c.next_steps.length === 0 ? (
          <p>No SuggestedActions were returned within this coverage.</p>
        ) : (
          <ul>
            {c.next_steps.map((action) => (
              <li
                key={
                  action.content.action.basis.inquiry_result_link_ref
                    .project_inquiry_link_id
                }
              >
                <p>{action.content.action.title}</p>
                <p>{action.content.action.reason}</p>
                <Link
                  to={`/projects/${view.project_id}/brief?inquiry_result_link_id=${encodeURIComponent(action.content.action.basis.inquiry_result_link_ref.project_inquiry_link_id)}`}
                >
                  Read current preview for this result
                </Link>
                <RecordDetails
                  label="Exact SuggestedAction in this Brief snapshot"
                  value={action}
                />
              </li>
            ))}
          </ul>
        )}
        {selectedAction === undefined ? null : (
          <aside aria-label="Separately read current action preview">
            <p>
              This selected preview is read separately from the Brief snapshot
              and keeps its own basis and freshness.
            </p>
            {selectedAction}
          </aside>
        )}
      </section>
      <section aria-labelledby="brief-decisions">
        <h2 id="brief-decisions">Recent decisions</h2>
        <p>
          Recent-ten canonical History window. Open an exact event to inspect
          its current impact, recovery assessment, and eligible governed Revert
          path.
        </p>
        <ol>
          {c.recent_decisions.content.changes.map((change) => (
            <li key={change.event_ref.event_id}>
              <p>{change.observed_effect.summary}</p>
              <Link
                to={`/projects/${view.project_id}/history/${change.event_ref.event_id}`}
              >
                Inspect History event
              </Link>
              <RecordDetails
                label={`Exact decision ${change.event_ref.event_id}`}
                value={change}
              />
            </li>
          ))}
        </ol>
        <RecordDetails
          label="Complete returned History window and recovery boundaries"
          value={c.recent_decisions}
        />
      </section>
    </main>
  );
};
