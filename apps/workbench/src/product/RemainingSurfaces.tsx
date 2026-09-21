import { useEffect, useRef, useState } from "react";
import { Link, useLoaderData, useParams } from "react-router";

import type {
  PetraProjectEffectiveControlsView,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryRetainedViewV12,
} from "@petra/contracts";

import { PetraMark } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraDialog,
  PetraTextArea,
} from "../design-system/primitives.js";
import {
  getProjectArtifacts,
  getProjectProfileTool,
  getReferenceArtifact,
} from "./fixtures.js";
import type {
  CompositionArtifact,
  HistoryEpisode,
  ProfileToolTask,
  ProjectRecord,
} from "./model.js";
import type {
  ProjectSettingsData,
  ProjectHistoryEventData,
  ProjectHistoryRouteData,
  ProjectSuggestedActionHistoryData,
} from "./project-data.js";
import {
  FocusedGraphEntryLink,
  scientificFocusedGraphEntryDraft,
} from "./focused-graph-entry.js";
import {
  composeProjectHistoryCompensationPlan,
  executeProjectHistoryCompensationPlan,
  getProjectHistoryCompensationPreview,
  getRetainedProjectHistory,
  ProjectDataError,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";
import { Observation } from "./ReviewRecovery.js";
import { ProjectResetPanel } from "./ProjectProfileSurface.js";

export const CompositionCollectionSurface = ({
  project,
  artifacts,
}: {
  project: ProjectRecord;
  artifacts: CompositionArtifact[];
}): React.JSX.Element => (
  <main className="reference-surface" id="reference-main">
    <header className="reference-surface-heading">
      <div>
        <p className="reference-eyebrow">Composition · current Project</p>
        <h1>Composition</h1>
        <p className="reference-lede">
          Create and inspect governed artifacts with exact revision, local
          persistence, validation, provenance, and output state.
        </p>
      </div>
      <PetraButton
        variant="primary"
        unavailable={{
          reason: "Artifact creation is unavailable in this workspace.",
          prerequisite: "A registered artifact creation command.",
        }}
      >
        New artifact
      </PetraButton>
    </header>

    {artifacts.length === 0 ? (
      <section
        className="reference-empty"
        aria-labelledby="composition-empty-title"
      >
        <PetraMark />
        <h2 id="composition-empty-title">No governed artifacts yet</h2>
        <p>
          {project.focus.value} has no Composition artifact. Petra will not
          treat a Work result or conversation as a saved document.
        </p>
      </section>
    ) : (
      <ol className="composition-list">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <article className="composition-row">
              <div>
                <p>{artifact.kind}</p>
                <h2>
                  <Link to={artifact.id}>{artifact.title}</Link>
                </h2>
                <span>{artifact.objective}</span>
              </div>
              <dl>
                <div>
                  <dt>Current</dt>
                  <dd>{artifact.currentRevision}</dd>
                </div>
                <div>
                  <dt>Working</dt>
                  <dd>{artifact.workingRevision}</dd>
                </div>
              </dl>
              <span
                className="composition-state"
                data-state={artifact.validation.state}
              >
                <span aria-hidden="true">!</span>
                {artifact.validation.summary}
              </span>
              <Link className="reference-text-link" to={artifact.id}>
                Open artifact
              </Link>
            </article>
          </li>
        ))}
      </ol>
    )}
  </main>
);

export const CompositionCollectionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  return (
    <CompositionCollectionSurface
      project={project}
      artifacts={getProjectArtifacts(project.id)}
    />
  );
};

type CompositionMode = "document" | "compare" | "checks";

export const CompositionArtifactSurface = ({
  project,
  artifact,
  initialMode = "document",
}: {
  project: ProjectRecord;
  artifact: CompositionArtifact;
  initialMode?: CompositionMode;
}): React.JSX.Element => {
  const [mode, setMode] = useState<CompositionMode>(initialMode);
  const [draft, setDraft] = useState(artifact.workingText);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const locallyChanged = draft !== artifact.workingText;

  return (
    <main
      className="reference-surface composition-document"
      id="reference-main"
    >
      <header className="composition-heading">
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/composition`}
        >
          <span aria-hidden="true">←</span> Return to Composition
        </Link>
        <div>
          <div>
            <p className="reference-eyebrow">
              {artifact.kind} · {artifact.workingRevision}
            </p>
            <h1>{artifact.title}</h1>
            <p className="reference-lede">{artifact.objective}</p>
          </div>
          <span
            className="composition-state"
            data-state={locallyChanged ? "local" : "saved"}
          >
            <span aria-hidden="true">{locallyChanged ? "•" : "✓"}</span>
            {locallyChanged
              ? "Unsaved in page memory"
              : artifact.localPersistence}
          </span>
        </div>
      </header>

      <nav className="composition-modes" aria-label="Artifact view">
        {(["document", "compare", "checks"] as CompositionMode[]).map(
          (view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mode === view}
              onClick={() => setMode(view)}
            >
              {view === "document"
                ? "Document"
                : view === "compare"
                  ? "Compare revisions"
                  : "Checks and provenance"}
            </button>
          ),
        )}
      </nav>

      {mode === "document" ? (
        <div className="composition-editor-layout">
          <aside
            className="composition-outline"
            aria-labelledby="composition-outline-title"
          >
            <p className="reference-panel-kicker">Document structure</p>
            <h2 id="composition-outline-title">Outline</h2>
            <ol>
              {artifact.structure.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.heading}</a>
                  <span>{section.status}</span>
                </li>
              ))}
            </ol>
          </aside>
          <section
            className="composition-editor"
            aria-labelledby="composition-editor-title"
          >
            <header>
              <div>
                <p className="reference-panel-kicker">Working document</p>
                <h2 id="composition-editor-title">Emergency sequence</h2>
              </div>
              <span>{artifact.workingRevision}</span>
            </header>
            <div id="section-action">
              <PetraTextArea
                label="Section text"
                hint="Local edits do not create a durable revision until the save command succeeds."
                rows={9}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
              />
            </div>
            <div className="composition-editor__actions">
              <span id="composition-save-boundary">
                Save is unavailable. The working revision remains unchanged.
              </span>
              <PetraButtonGroup label="Document actions">
                <PetraButton
                  variant="primary"
                  aria-disabled="true"
                  aria-describedby="composition-save-boundary"
                >
                  Save new revision
                </PetraButton>
                <PetraButton
                  variant="quiet"
                  onClick={() => setDraft(artifact.workingText)}
                  aria-disabled={!locallyChanged}
                >
                  Restore saved text
                </PetraButton>
              </PetraButtonGroup>
            </div>
          </section>
        </div>
      ) : mode === "compare" ? (
        <section
          className="composition-comparison"
          aria-labelledby="composition-comparison-title"
        >
          <header>
            <p className="reference-panel-kicker">Exact revision comparison</p>
            <h2 id="composition-comparison-title">Current and Working</h2>
          </header>
          <div>
            <article>
              <p>Current · authoritative</p>
              <h3>{artifact.currentRevision}</h3>
              <blockquote>{artifact.currentText}</blockquote>
            </article>
            <article>
              <p>Working · non-authoritative</p>
              <h3>{artifact.workingRevision}</h3>
              <blockquote>{draft}</blockquote>
            </article>
          </div>
          <section>
            <h3>Material difference</h3>
            <p>
              The working revision replaces conditional language with the exact
              approved action and adds an indicator check and exit instruction.
            </p>
          </section>
        </section>
      ) : (
        <section
          className="composition-checks"
          aria-labelledby="composition-checks-title"
        >
          <header>
            <div>
              <p className="reference-panel-kicker">
                Validation and statement basis
              </p>
              <h2 id="composition-checks-title">Checks and provenance</h2>
            </div>
            <span>{artifact.validation.checkedRevision}</span>
          </header>
          <div className="composition-validation">
            <strong>{artifact.validation.summary}</strong>
            <ul>
              {artifact.validation.findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </div>
          <ol className="composition-provenance">
            {artifact.provenance.map((item) => (
              <li key={item.statement}>
                <blockquote>{item.statement}</blockquote>
                <p>
                  <strong>Basis:</strong> {item.basis}
                </p>
                {item.sourceId === undefined ? null : (
                  <Link
                    className="reference-text-link"
                    to={`/projects/${project.id}/sources/${item.sourceId}`}
                  >
                    Inspect exact source
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section
        className="composition-outputs"
        aria-labelledby="composition-outputs-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">
              Prepared from exact revision
            </p>
            <h2 id="composition-outputs-title">Outputs</h2>
          </div>
          <span>{artifact.outputs.length}</span>
        </header>
        <ul>
          {artifact.outputs.map((output) => (
            <li key={output.id}>
              <div>
                <strong>{output.label}</strong>
                <span>{output.revision}</span>
              </div>
              <span>{output.status}</span>
              <span>{output.delivery}</span>
              <PetraButton
                variant="secondary"
                onClick={() => setExportPreviewOpen(true)}
              >
                Preview export
              </PetraButton>
            </li>
          ))}
        </ul>
      </section>

      <PetraDialog
        open={exportPreviewOpen}
        title={`Export ${artifact.workingRevision}?`}
        description="Review the exact input, output, and delivery consequence before starting export."
        onClose={() => setExportPreviewOpen(false)}
        footer={
          <PetraButtonGroup label="Export preview actions">
            <PetraButton
              variant="quiet"
              onClick={() => setExportPreviewOpen(false)}
            >
              Close preview
            </PetraButton>
            <PetraButton
              variant="primary"
              unavailable={{
                reason: "The export command is unavailable in this workspace.",
                prerequisite:
                  "A registered export operation for this artifact type.",
              }}
            >
              Export HTML
            </PetraButton>
          </PetraButtonGroup>
        }
      >
        <dl className="composition-export-preview">
          <div>
            <dt>Input</dt>
            <dd>{artifact.workingRevision}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Accessible HTML package</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>Local output folder; no external delivery</dd>
          </div>
          <div>
            <dt>Existing output</dt>
            <dd>Retained; a new receipt would be additive</dd>
          </div>
        </dl>
      </PetraDialog>
    </main>
  );
};

export const CompositionArtifactRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const { artifactId } = useParams();
  const artifact = getReferenceArtifact(project.id, artifactId);

  if (artifact === undefined) {
    return (
      <main className="reference-route-error" id="reference-main">
        <PetraMark />
        <p className="reference-eyebrow">Artifact unavailable</p>
        <h1>This artifact cannot be opened</h1>
        <p>
          The identity does not resolve inside {project.title}. No newer
          document was substituted.
        </p>
        <Link
          className="reference-text-link"
          to={`/projects/${project.id}/composition`}
        >
          Return to Composition
        </Link>
      </main>
    );
  }

  return <CompositionArtifactSurface project={project} artifact={artifact} />;
};

const historyFilterChoices = {
  family: [
    ["change_control", "Decisions and authority changes"],
    ["project_source_lifecycle", "Source lifecycle"],
    ["project_source_replacement", "Source replacements"],
  ],
  command_name: [
    ["SubmitChangeSet", "Submit ChangeSet"],
    ["RecordApproval", "Record Approval"],
    ["ApplyChangeSet", "Apply ChangeSet"],
    ["ExcludeProjectSource", "Exclude source"],
    ["RestoreProjectSource", "Restore source"],
    ["CreateProjectSourceReplacement", "Create source replacement"],
    ["RetractProjectSourceReplacement", "Retract source replacement"],
  ],
  event_type: [
    ["change_set.submitted", "Change proposed"],
    ["approval.recorded", "Approval recorded"],
    ["change_set.applied", "Authority change applied"],
    ["change_set.conflicted", "Authority change conflicted"],
    ["change_set.reverted", "Authority change reverted"],
    ["change_set.reversal_conflicted", "Reversal conflicted"],
    ["project_source.excluded", "Source excluded"],
    ["project_source.restored", "Source restored"],
    ["project_source.replacement_created", "Source replacement created"],
    ["project_source.replacement_retracted", "Source replacement retracted"],
  ],
  outcome: [
    ["completed", "Completed"],
    ["conflicted", "Conflicted"],
  ],
  effect: [
    ["change_proposed", "Change proposed"],
    ["approval_recorded", "Approval recorded"],
    ["authority_change_applied", "Authority change applied"],
    ["authority_change_conflicted", "Authority change conflicted"],
    ["authority_change_reverted", "Authority change reverted"],
    ["reversal_conflicted", "Reversal conflicted"],
    ["project_source_excluded", "Source excluded"],
    ["project_source_restored", "Source restored"],
    ["source_replacement_created", "Source replacement created"],
    ["source_replacement_retracted", "Source replacement retracted"],
  ],
} as const;

const historyTimestampInput = (value: string | undefined): string =>
  value?.slice(0, 16) ?? "";

const historyDisplayLabel = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

export const HistoryCollectionSurface = ({
  project,
  initialHistory,
}: {
  project: ProjectRecord;
  initialHistory: PetraProjectHistoryRetainedViewV12;
}): React.JSX.Element => {
  const [pages, setPages] = useState([initialHistory]);
  const [continuation, setContinuation] = useState<
    "idle" | "loading" | "failed"
  >("idle");
  const status = useRef<HTMLElement>(null);

  useEffect(() => {
    setPages([initialHistory]);
    setContinuation("idle");
  }, [initialHistory]);

  useEffect(() => {
    if (continuation !== "idle") status.current?.focus();
  }, [continuation]);

  const history = pages[0] ?? initialHistory;
  const lastPage = pages.at(-1) ?? history;
  const changes = pages.flatMap((page) => page.content.changes);
  const filters = history.content.query.filters;
  const actors = history.content.filter_options.actor_catalogue.options;
  const targets = history.content.filter_options.target_catalogue.options;
  const selectedTarget =
    filters.target === undefined
      ? ""
      : `${filters.target.semantic_key}::${filters.target.object_id}`;
  const selectedActorReturned = actors.some(
    (option) => option.actor_ref.actor_id === filters.actor_id,
  );
  const selectedTargetReturned = targets.some(
    (option) =>
      `${option.target_ref.semantic_key}::${option.target_ref.object_id}` ===
      selectedTarget,
  );

  const loadOlder = async (): Promise<void> => {
    const page = lastPage.content.page;
    if (!page.has_more || continuation === "loading") return;
    setContinuation("loading");
    try {
      const next = await getRetainedProjectHistory(project.id, {
        limit: history.content.query.limit,
        cursor: page.next_cursor,
        filters,
      });
      if (
        JSON.stringify(next.content.retention_snapshot) !==
          JSON.stringify(history.content.retention_snapshot) ||
        next.content.changes.some((change) =>
          changes.some(
            (existing) =>
              existing.event_ref.event_id === change.event_ref.event_id,
          ),
        )
      ) {
        throw new ProjectDataError(
          "Petra could not verify the next Full History page.",
          502,
        );
      }
      setPages((current) => [...current, next]);
      setContinuation("idle");
    } catch {
      setContinuation("failed");
    }
  };

  return (
    <main
      className="reference-surface history-collection"
      id="reference-main"
      data-runtime-history="authenticated-retained"
    >
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">History · retained Project events</p>
          <h1>Project History</h1>
          <p className="reference-lede">
            Follow recorded decisions and effects, narrow the exact scope, then
            open one event to inspect its historical position, impact, and safe
            recovery choices.
          </p>
        </div>
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/brief`}
        >
          Return to current Brief
        </Link>
      </header>

      <form
        className="history-filters"
        method="get"
        aria-labelledby="history-filters-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Exact retained scope</p>
            <h2 id="history-filters-title">Filter Project History</h2>
          </div>
          <p>
            Counts and choices reflect only events this Project author may
            inspect in the current retained snapshot.
          </p>
        </header>
        <div className="history-filters__grid">
          {(
            [
              "family",
              "command_name",
              "event_type",
              "outcome",
              "effect",
            ] as const
          ).map((name) => (
            <label key={name}>
              <span>{historyDisplayLabel(name)}</span>
              <select name={name} defaultValue={filters[name] ?? ""}>
                <option value="">Any</option>
                {historyFilterChoices[name].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span>Actor</span>
            <select name="actor_id" defaultValue={filters.actor_id ?? ""}>
              <option value="">Any permitted actor</option>
              {!selectedActorReturned && filters.actor_id !== undefined ? (
                <option value={filters.actor_id}>{filters.actor_id}</option>
              ) : null}
              {actors.map((option) => (
                <option
                  key={option.actor_ref.actor_id}
                  value={option.actor_ref.actor_id}
                >
                  {`${option.display_descriptor.display_name} · ${option.matching_event_count}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Exact target</span>
            <select name="target" defaultValue={selectedTarget}>
              <option value="">Any permitted target</option>
              {!selectedTargetReturned && filters.target !== undefined ? (
                <option value={selectedTarget}>
                  {filters.target.semantic_key} · {filters.target.object_id}
                </option>
              ) : null}
              {targets.map((option) => {
                const value = `${option.target_ref.semantic_key}::${option.target_ref.object_id}`;
                return (
                  <option key={value} value={value}>
                    {`${option.target_ref.semantic_key} · ${option.target_ref.object_id} · ${option.matching_event_count}`}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span>Recorded from (UTC)</span>
            <input
              type="datetime-local"
              name="recorded_from"
              defaultValue={historyTimestampInput(
                filters.recorded_at?.from_inclusive,
              )}
            />
          </label>
          <label>
            <span>Recorded through (UTC)</span>
            <input
              type="datetime-local"
              name="recorded_through"
              defaultValue={historyTimestampInput(
                filters.recorded_at?.through_inclusive,
              )}
            />
          </label>
        </div>
        <PetraButtonGroup label="Full History filter actions">
          <PetraButton variant="primary" type="submit">
            Apply exact filters
          </PetraButton>
          <Link
            className="reference-text-link"
            to={`/projects/${project.id}/history`}
          >
            Clear filters
          </Link>
        </PetraButtonGroup>
      </form>

      <section
        className="history-episodes history-retained-events"
        aria-labelledby="history-episodes-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Newest first</p>
            <h2 id="history-episodes-title">Causal events</h2>
          </div>
          <span>
            {changes.length} of {history.content.page.snapshot_total_count}
          </span>
        </header>
        {changes.length === 0 ? (
          <div className="history-runtime-empty">
            <h3>No permitted History events match these filters</h3>
            <p>
              The exact filters remain selected. Clear or change them to read a
              different retained scope.
            </p>
          </div>
        ) : (
          <ol>
            {changes.map((change) => (
              <li key={change.event_ref.event_id}>
                <Link
                  to={`/projects/${project.id}/history/${change.event_ref.event_id}`}
                >
                  <span>
                    {`${change.recorded_at} · ${historyDisplayLabel(change.family)}`}
                  </span>
                  <strong>
                    {historyDisplayLabel(change.observed_effect.effect)}
                  </strong>
                  <p>{change.observed_effect.summary}</p>
                  <span>
                    {historyDisplayLabel(change.observed_effect.outcome)} · Open
                    exact event
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div className="history-retained-events__continuation">
          <p>
            {`Snapshot through Project stream revision ${history.content.retention_snapshot.through_stream_revision} · read ${history.read_at}`}
          </p>
          {lastPage.content.page.has_more ? (
            <PetraButton
              variant="secondary"
              onClick={() => void loadOlder()}
              busy={continuation === "loading"}
              busyLabel="Loading older History events…"
            >
              Load older events
            </PetraButton>
          ) : (
            <p>End of this retained History snapshot.</p>
          )}
          <section
            ref={status}
            tabIndex={-1}
            role={continuation === "failed" ? "alert" : "status"}
          >
            {continuation === "failed" ? (
              <p>
                This History traversal can no longer continue from its verified
                snapshot. Clear the continuation by applying the same filters
                again.
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
};

export const HistorySurface = ({
  project,
  episodes,
  selected,
}: {
  project: ProjectRecord;
  episodes: HistoryEpisode[];
  selected?: HistoryEpisode | undefined;
}): React.JSX.Element => {
  const [revertPreviewOpen, setRevertPreviewOpen] = useState(false);

  return (
    <main className="reference-surface" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">History · current Project</p>
          <h1>History</h1>
          <p className="reference-lede">
            Inspect causal episodes, exact actions, authority effects,
            projection effects, and eligible compensation without rewriting
            prior events.
          </p>
        </div>
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/brief`}
        >
          Return to current Brief
        </Link>
      </header>

      {episodes.length === 0 ? (
        <section
          className="reference-empty"
          aria-labelledby="history-empty-title"
        >
          <PetraMark />
          <h2 id="history-empty-title">No permitted History episodes</h2>
          <p>
            Petra will not reconstruct a timeline from current objects alone.
          </p>
        </section>
      ) : (
        <div className="history-layout">
          <section
            className="history-episodes"
            aria-labelledby="history-episodes-title"
          >
            <header>
              <h2 id="history-episodes-title">Causal episodes</h2>
              <span>{episodes.length}</span>
            </header>
            <ol>
              {episodes.map((episode) => (
                <li
                  key={episode.id}
                  data-selected={selected?.id === episode.id || undefined}
                >
                  <Link to={`/projects/${project.id}/history/${episode.id}`}>
                    <span>{episode.recordedAt}</span>
                    <strong>{episode.title}</strong>
                    <p>{episode.summary}</p>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {selected === undefined ? (
            <section className="history-detail history-detail--empty">
              <h2>Select an episode</h2>
              <p>Choose an episode to inspect exact actions and effects.</p>
            </section>
          ) : (
            <article
              className="history-detail"
              aria-labelledby="history-detail-title"
            >
              <header>
                <p className="reference-panel-kicker">
                  Selected causal episode
                </p>
                <h2 id="history-detail-title">{selected.title}</h2>
                <p>{selected.summary}</p>
              </header>
              <dl className="history-facts">
                <div>
                  <dt>Actor</dt>
                  <dd>{selected.actor}</dd>
                </div>
                <div>
                  <dt>Occurred</dt>
                  <dd>{selected.occurredAt}</dd>
                </div>
                <div>
                  <dt>Recorded</dt>
                  <dd>{selected.recordedAt}</dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>{selected.action}</dd>
                </div>
              </dl>
              <section>
                <h3>Authority effect</h3>
                <p>{selected.authorityEffect}</p>
              </section>
              <section>
                <h3>Projection effect</h3>
                <p>{selected.projectionEffect}</p>
              </section>
              <section>
                <h3>Episode members</h3>
                <ol>
                  {selected.members.map((member) => (
                    <li key={member}>{member}</li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>Recovery relationship</h3>
                <p>{selected.recovery}</p>
              </section>
              <section
                className="history-revert"
                data-eligible={selected.revert.eligible || undefined}
              >
                <h3>{selected.revert.label}</h3>
                <p>{selected.revert.reason}</p>
                <p>
                  <strong>Consequence:</strong> {selected.revert.consequence}
                </p>
                {selected.revert.eligible ? (
                  <PetraButton
                    variant="secondary"
                    onClick={() => setRevertPreviewOpen(true)}
                  >
                    Prepare reversal
                  </PetraButton>
                ) : null}
              </section>
            </article>
          )}
        </div>
      )}

      {selected === undefined ? null : (
        <PetraDialog
          open={revertPreviewOpen}
          title={`Prepare reversal of ${selected.title}?`}
          description="This preview does not change Current or erase the original decision."
          onClose={() => setRevertPreviewOpen(false)}
          footer={
            <PetraButtonGroup label="Reversal preview actions">
              <PetraButton
                variant="quiet"
                onClick={() => setRevertPreviewOpen(false)}
              >
                Close preview
              </PetraButton>
              <PetraButton
                variant="primary"
                unavailable={{
                  reason:
                    "A compensating Review command is unavailable in this workspace.",
                  prerequisite:
                    "A revision-bound Revert preview and Review operation.",
                }}
              >
                Open Revert Review
              </PetraButton>
            </PetraButtonGroup>
          }
        >
          <p>{selected.revert.consequence}</p>
          <p>The original action, decision, and events remain in History.</p>
        </PetraDialog>
      )}
    </main>
  );
};

type GovernedRevertState =
  | { readonly kind: "idle" | "reading_preview" }
  | {
      readonly kind: "preview" | "composing_plan";
      readonly preview: PetraProjectHistoryCompensationPreviewView;
    }
  | {
      readonly kind: "plan" | "executing";
      readonly preview: PetraProjectHistoryCompensationPreviewView;
      readonly plan: PetraProjectHistoryCompensationPlanView;
    }
  | {
      readonly kind: "result";
      readonly result: PetraProjectHistoryCompensationExecutionView;
    }
  | { readonly kind: "failed"; readonly message: string };

const governedRevertFailure = (error: unknown): string => {
  if (error instanceof ProjectDataError) {
    if (error.status === 401 || error.status === 403)
      return "The authenticated actor is not authorized to continue this Revert. No compensation is shown as performed.";
    if (error.status === 409)
      return "Current authority no longer permits this exact Revert step. Reload the History event before deciding again; no effect is inferred from this failed request.";
  }
  return "The governed Revert result could not be verified. Do not repeat or reinterpret the request; reload this History event and reconcile current authority.";
};

export const HistoryEventSurface = ({
  project,
  data,
}: {
  project: ProjectRecord;
  data: ProjectHistoryEventData;
}): React.JSX.Element => {
  const { episode, impact, recovery } = data;
  const change = episode.content.change;
  const assessment = recovery.content.assessment;
  const graphTarget = change.targets.find(
    (target) =>
      target.semantic_key === "scientific.claim" &&
      target.revision !== undefined &&
      target.record_hash !== undefined,
  );
  const graphDefinitionAuthority = episode.content.project_definition_authority;
  const [reason, setReason] = useState("");
  const [approvalRationale, setApprovalRationale] = useState("");
  const [revert, setRevert] = useState<GovernedRevertState>({ kind: "idle" });
  const notice = useRef<HTMLElement>(null);

  useEffect(() => {
    if (revert.kind !== "idle") notice.current?.focus();
  }, [revert.kind]);

  const readPreview = async (): Promise<void> => {
    if (revert.kind !== "idle" && revert.kind !== "failed") return;
    setRevert({ kind: "reading_preview" });
    try {
      const preview = await getProjectHistoryCompensationPreview(
        project.id,
        episode.event_id,
      );
      setRevert({ kind: "preview", preview });
    } catch (error) {
      setRevert({ kind: "failed", message: governedRevertFailure(error) });
    }
  };

  const composePlan = async (): Promise<void> => {
    if (
      revert.kind !== "preview" ||
      reason.trim().length === 0 ||
      approvalRationale.trim().length === 0
    )
      return;
    const preview = revert.preview;
    setRevert({ kind: "composing_plan", preview });
    try {
      const plan = await composeProjectHistoryCompensationPlan({
        projectId: project.id,
        eventId: episode.event_id,
        preview,
        reason,
        approvalRationale,
        explicitConfirmation: true,
      });
      setRevert({ kind: "plan", preview, plan });
    } catch (error) {
      setRevert({ kind: "failed", message: governedRevertFailure(error) });
    }
  };

  const executePlan = async (): Promise<void> => {
    if (revert.kind !== "plan") return;
    const { preview, plan } = revert;
    setRevert({ kind: "executing", preview, plan });
    try {
      const result = await executeProjectHistoryCompensationPlan({
        projectId: project.id,
        eventId: episode.event_id,
        plan,
        explicitExecutionConfirmation: true,
      });
      setRevert({ kind: "result", result });
    } catch (error) {
      setRevert({ kind: "failed", message: governedRevertFailure(error) });
    }
  };

  const canPreview = assessment.state === "eligible_for_preview";
  const statusText =
    assessment.state === "eligible_for_preview"
      ? "Eligible for a revision-bound compensation preview"
      : assessment.state === "already_compensated"
        ? "This exact authoritative change is already compensated"
        : "Governed Revert is blocked by current authority";
  const activePreview =
    revert.kind === "preview" || revert.kind === "composing_plan"
      ? revert.preview
      : revert.kind === "plan" || revert.kind === "executing"
        ? revert.preview
        : undefined;
  const activePlan =
    revert.kind === "plan" || revert.kind === "executing"
      ? revert.plan
      : undefined;

  return (
    <main
      className="reference-surface history-event"
      id="reference-main"
      data-runtime-history="authenticated"
    >
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">History · exact retained event</p>
          <h1>{change.event_ref.event_type.replaceAll("_", " ")}</h1>
          <p className="reference-lede">{change.observed_effect.summary}</p>
        </div>
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/brief`}
        >
          Return to current Brief
        </Link>
      </header>

      <div className="history-event__layout">
        <article aria-labelledby="history-event-record-title">
          <p className="reference-panel-kicker">Recorded authority</p>
          <h2 id="history-event-record-title">Event and consequence</h2>
          <dl className="history-facts">
            <div>
              <dt>Event</dt>
              <dd>
                <code>{episode.event_id}</code>
              </dd>
            </div>
            <div>
              <dt>Command</dt>
              <dd>
                {change.command_ref.command_name} ·{" "}
                <code>{change.command_ref.command_id}</code>
              </dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>
                {change.actor.actor_kind} · <code>{change.actor.actor_id}</code>
              </dd>
            </div>
            <div>
              <dt>Authority effect</dt>
              <dd>
                {change.observed_effect.effect.replaceAll("_", " ")} ·{" "}
                {change.observed_effect.outcome}
              </dd>
            </div>
          </dl>
          <h3>Exact targets</h3>
          <ul>
            {change.targets.map((target) => (
              <li key={`${target.semantic_key}:${target.object_id}`}>
                {target.role} · {target.semantic_key} ·{" "}
                <code>{target.object_id}</code> revision {target.revision} ·{" "}
                {target.authority_state}
              </li>
            ))}
          </ul>
          <details className="history-event__comparison">
            <summary>Compare recorded state</summary>
            <h3>Historical position and current read</h3>
            <p>
              This event was retained at Project stream revision{" "}
              {change.event_ref.stream_revision}. The current impact read
              reaches Project stream revision{" "}
              {impact.content.authority.through_stream_revision}.
            </p>
            {graphDefinitionAuthority.state === "available" ? (
              <>
                <p>
                  Petra interpreted the event with the exact retained Project
                  profile definition revision{" "}
                  {graphDefinitionAuthority.project_definition_ref.revision},
                  effective before this event.
                </p>
                <p>
                  The historical definition itself is not reproduced here; its
                  immutable content and record identities remain available in
                  technical details.
                </p>
              </>
            ) : (
              <p>
                No exact retained Project profile definition is available for
                historical interpretation. Petra did not substitute the current
                profile.
              </p>
            )}
          </details>
          {graphTarget === undefined ||
          graphTarget.revision === undefined ||
          graphTarget.record_hash === undefined ||
          project.profile.definitionFamily === undefined ||
          graphDefinitionAuthority.state !== "available" ? null : (
            <ul>
              <li>
                <FocusedGraphEntryLink
                  entry={scientificFocusedGraphEntryDraft({
                    projectId: project.id,
                    question:
                      "Which recorded current relationships concern the Claim named by this event?",
                    focusRef: {
                      record_id: graphTarget.object_id,
                      revision: graphTarget.revision,
                      record_hash: graphTarget.record_hash,
                    },
                    originKind: "history",
                    definitionRef: {
                      project_definition_id:
                        graphDefinitionAuthority.project_definition_ref
                          .project_definition_id,
                      revision:
                        graphDefinitionAuthority.project_definition_ref
                          .revision,
                      content_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .content_hash,
                      record_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .record_hash,
                      definition_family: project.profile.definitionFamily,
                    },
                    returnDestinationKind: "history",
                    returnDestinationOwner: "project_history_episode_view",
                    returnLabel: "History event",
                    returnFocusId: "history-event-record-title",
                  })}
                >
                  Inspect this exact Claim in the current bounded Graph
                </FocusedGraphEntryLink>
              </li>
              <li>
                <FocusedGraphEntryLink
                  entry={scientificFocusedGraphEntryDraft({
                    projectId: project.id,
                    question:
                      "What recorded dependencies and assessed consequences concern this exact Claim and History event?",
                    focusRef: {
                      record_id: graphTarget.object_id,
                      revision: graphTarget.revision,
                      record_hash: graphTarget.record_hash,
                    },
                    originKind: "history",
                    definitionRef: {
                      project_definition_id:
                        graphDefinitionAuthority.project_definition_ref
                          .project_definition_id,
                      revision:
                        graphDefinitionAuthority.project_definition_ref
                          .revision,
                      content_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .content_hash,
                      record_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .record_hash,
                      definition_family: project.profile.definitionFamily,
                    },
                    returnDestinationKind: "history",
                    returnDestinationOwner: "project_history_episode_view",
                    returnLabel: "History event",
                    returnFocusId: "history-event-record-title",
                    analysis: {
                      analysis_kind: "impact",
                      history_event_id: episode.event_id,
                    },
                  })}
                >
                  Inspect exact impact in Graph
                </FocusedGraphEntryLink>
              </li>
              <li>
                <FocusedGraphEntryLink
                  entry={scientificFocusedGraphEntryDraft({
                    projectId: project.id,
                    question:
                      "What recorded-time facts are supplied for this exact Claim position?",
                    focusRef: {
                      record_id: graphTarget.object_id,
                      revision: graphTarget.revision,
                      record_hash: graphTarget.record_hash,
                    },
                    originKind: "history",
                    definitionRef: {
                      project_definition_id:
                        graphDefinitionAuthority.project_definition_ref
                          .project_definition_id,
                      revision:
                        graphDefinitionAuthority.project_definition_ref
                          .revision,
                      content_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .content_hash,
                      record_hash:
                        graphDefinitionAuthority.project_definition_ref
                          .record_hash,
                      definition_family: project.profile.definitionFamily,
                    },
                    returnDestinationKind: "history",
                    returnDestinationOwner: "project_history_episode_view",
                    returnLabel: "History event",
                    returnFocusId: "history-event-record-title",
                    analysis: {
                      analysis_kind: "time",
                      temporal_dimension: "recorded_time",
                    },
                  })}
                >
                  Inspect supplied recorded-time facts in Graph
                </FocusedGraphEntryLink>
              </li>
            </ul>
          )}
          <details>
            <summary>Complete retained event and causal record</summary>
            <Observation value={episode} />
          </details>
        </article>

        <aside aria-labelledby="history-impact-title">
          <p className="reference-panel-kicker">Current read-only assessment</p>
          <h2 id="history-impact-title">Impact and recovery boundary</h2>
          <p>{statusText}.</p>
          <ul>
            <li>
              Registered direct event and command dependents:{" "}
              {impact.content.impact.summary.total_count} · coverage{" "}
              {impact.content.impact.summary.coverage}
            </li>
            <li>
              Registered semantic-target dependents:{" "}
              {impact.content.semantic_target_impact.summary.total_count} ·
              coverage {impact.content.semantic_target_impact.summary.coverage}
            </li>
            <li>
              Recovery assessment: {assessment.state.replaceAll("_", " ")}
            </li>
          </ul>
          <p>
            Graph Back/Forward remains client-local. Revert is additive
            compensation; it does not erase this event, its decision, or its
            History.
          </p>
          <details className="history-event__impact-details">
            <summary>Inspect impact and recovery</summary>
            <Observation value={{ impact, recovery }} />
          </details>
        </aside>
      </div>

      <section
        className="history-event__revert"
        aria-labelledby="governed-revert-title"
      >
        <p className="reference-panel-kicker">Separate authority path</p>
        <h2 id="governed-revert-title">Governed Revert</h2>
        <p>
          Read the exact preview first. A confirmed reason and Approval
          rationale compose one new compensating ChangeSet. Execution is a
          separate explicit action and rechecks authority at every command.
        </p>
        {canPreview ? (
          <PetraButton
            variant="secondary"
            onClick={() => void readPreview()}
            busy={revert.kind === "reading_preview"}
            busyLabel="Reading governed Revert preview…"
            aria-disabled={revert.kind !== "idle" && revert.kind !== "failed"}
          >
            Read governed Revert preview
          </PetraButton>
        ) : (
          <PetraButton
            variant="secondary"
            unavailable={{
              reason: statusText,
              prerequisite:
                "A current eligible single-ChangeSet recovery assessment.",
            }}
          >
            Revert unavailable
          </PetraButton>
        )}

        <section
          ref={notice}
          className="history-event__revert-state"
          tabIndex={-1}
          aria-live={revert.kind === "failed" ? "assertive" : "polite"}
          role={revert.kind === "failed" ? "alert" : "status"}
        >
          {revert.kind === "idle" ? (
            <p>
              No compensation preview, plan, or execution has been requested.
            </p>
          ) : revert.kind === "reading_preview" ? (
            <p>
              Reading the exact current preview. No ChangeSet, Approval, or
              command has been composed or executed.
            </p>
          ) : revert.kind === "failed" ? (
            <p>{revert.message}</p>
          ) : revert.kind === "composing_plan" ? (
            <p>
              Revalidating the preview and composing the confirmed command plan.
              Nothing is shown as executed.
            </p>
          ) : revert.kind === "executing" ? (
            <p>
              Executing the exact confirmed plan. Completion and effects are not
              yet established.
            </p>
          ) : revert.kind === "result" ? (
            <>
              <h3>
                {revert.result.content.outcome === "completed"
                  ? "Governed Revert completed"
                  : "Governed Revert stopped"}
              </h3>
              <p>
                Completed prefix: {revert.result.content.completed_prefix} of{" "}
                {revert.result.content.steps.length}. Authority effect:{" "}
                {revert.result.content.authoritative_effect.state.replaceAll(
                  "_",
                  " ",
                )}
                . The original action and this compensation both remain in
                History.
              </p>
              <ol>
                {revert.result.content.steps.map((step) => (
                  <li key={step.command_ref.command_id}>
                    {step.command_name}: {step.state.replaceAll("_", " ")} ·{" "}
                    <code>{step.command_ref.command_id}</code>
                    {!("event_ref" in step) ||
                    step.event_ref === undefined ? null : (
                      <>
                        {" "}
                        · <code>{step.event_ref.event_id}</code>
                      </>
                    )}
                  </li>
                ))}
              </ol>
              <details>
                <summary>Complete governed Revert execution record</summary>
                <Observation value={revert.result} />
              </details>
              <p>
                <Link
                  className="reference-primary-link"
                  to={`/projects/${project.id}/brief`}
                >
                  Return to updated Brief
                </Link>
              </p>
            </>
          ) : (
            <p>
              {revert.kind === "preview"
                ? "Read-only compensation preview loaded. No ChangeSet, Approval, or command has been composed or executed."
                : "Confirmed compensation plan composed. It is not persisted or executed until the separate execution action."}
            </p>
          )}
        </section>

        {activePreview === undefined ? null : (
          <div className="history-event__preview">
            <h3>Read-only preview</h3>
            <p>
              {activePreview.content.operation_preview.length} operations ·{" "}
              {activePreview.content.command_sequence.length} commands · valid
              through {activePreview.content.freshness.valid_through}
            </p>
            <ol>
              {activePreview.content.operation_preview.map((operation) => (
                <li key={`${operation.operation_kind}:${operation.target_id}`}>
                  {operation.operation_kind.replaceAll("_", " ")} ·{" "}
                  <code>{operation.target_id}</code> · base revision{" "}
                  {operation.base_revision}
                </li>
              ))}
            </ol>
            <details>
              <summary>Complete preview, results, and command sequence</summary>
              <Observation value={activePreview} />
            </details>
          </div>
        )}

        {revert.kind !== "preview" ? null : (
          <div className="history-event__confirmation">
            <PetraTextArea
              label="Reason for governed Revert"
              hint="Explain why this exact authoritative change should be compensated."
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.currentTarget.value)}
            />
            <PetraTextArea
              label="Approval rationale"
              hint="State why the complete compensating ChangeSet is approved."
              rows={3}
              value={approvalRationale}
              onChange={(event) =>
                setApprovalRationale(event.currentTarget.value)
              }
            />
            <PetraButton
              variant="primary"
              onClick={() => void composePlan()}
              aria-disabled={
                reason.trim().length === 0 ||
                approvalRationale.trim().length === 0
              }
            >
              Confirm and compose Revert plan
            </PetraButton>
          </div>
        )}

        {activePlan === undefined ? null : (
          <div className="history-event__plan">
            <h3>Confirmed command plan</h3>
            <p>
              ChangeSet{" "}
              <code>{activePlan.content.change_set.change_set_id}</code>{" "}
              compensates{" "}
              <code>
                {
                  activePlan.content.change_set.content
                    .compensates_change_set_id
                }
              </code>
              . Persistence and execution remain not performed.
            </p>
            <ol>
              {activePlan.content.commands.map((step) => (
                <li key={step.envelope.command_id}>
                  {step.position}. {step.command_name} ·{" "}
                  {step.state.replaceAll("_", " ")}
                </li>
              ))}
            </ol>
            <details>
              <summary>Complete ChangeSet, Approval, and command plan</summary>
              <Observation value={activePlan} />
            </details>
            {revert.kind === "plan" ? (
              <PetraButton variant="primary" onClick={() => void executePlan()}>
                Execute governed Revert
              </PetraButton>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
};

export const HistoryEventRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectHistoryEventData>();
  return <HistoryEventSurface project={project} data={data} />;
};

const runtimeHistoryLabel = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

export const SuggestedActionWorkHistorySurface = ({
  project,
  data,
}: {
  project: ProjectRecord;
  data: ProjectSuggestedActionHistoryData;
}): React.JSX.Element => {
  const { invocation, historyDestination, workDestination } = data;
  const { content } = invocation;
  const { command_ref: commandRef } = content.invocation.content;
  const revisions = content.history.work_revisions;
  const workId = historyDestination.object_ref.object_id;
  const result = content.result;

  return (
    <main
      className="reference-surface"
      id="reference-main"
      data-contract-name={invocation.schema_name}
      data-runtime-history="authenticated"
      data-history-source={content.history.source}
    >
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">History · authenticated runtime</p>
          <h1>Work History</h1>
          <p className="reference-lede">
            Inspect the canonical WorkUnit revisions and current server-owned
            recovery posture for this exact SuggestedAction command receipt.
          </p>
        </div>
        <Link
          className="reference-context-back"
          to={`/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(workDestination.object_ref.object_id)}`}
          data-place-role={workDestination.place_role}
          data-task-intent={workDestination.task_intent}
        >
          Open exact Work
        </Link>
      </header>

      <div className="history-layout">
        <section
          className="history-episodes"
          aria-labelledby="runtime-work-revisions-title"
        >
          <header>
            <h2 id="runtime-work-revisions-title">Canonical Work revisions</h2>
            <span>{revisions.length}</span>
          </header>
          {revisions.length === 0 ? (
            <div className="history-runtime-empty">
              <strong>Pending registration</strong>
              <p>No canonical Work revision is registered yet.</p>
            </div>
          ) : (
            <ol>
              {revisions.map((entry, index) => (
                <li
                  key={`${entry.work_unit_ref.work_unit_id}:${entry.work_unit_ref.revision}`}
                  data-selected={index === revisions.length - 1 || undefined}
                >
                  <div className="history-runtime-revision">
                    <span>{entry.recorded_at}</span>
                    <strong>Revision {entry.work_unit_ref.revision}</strong>
                    <p>
                      {runtimeHistoryLabel(entry.state)}
                      {entry.terminal_outcome === undefined
                        ? ""
                        : ` · ${runtimeHistoryLabel(entry.terminal_outcome)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <article
          className="history-detail"
          aria-labelledby="runtime-work-history-title"
        >
          <header>
            <p className="reference-panel-kicker">
              Server-owned operational History
            </p>
            <h2 id="runtime-work-history-title">Exact invocation</h2>
            <p>
              This route reread the authenticated invocation and matched its
              supplied History destination before showing any Work state.
            </p>
          </header>

          <dl className="history-facts">
            <div>
              <dt>Command receipt</dt>
              <dd>
                <code>{commandRef.command_id}</code> · {commandRef.command_name}
              </dd>
            </div>
            <div>
              <dt>Work identity</dt>
              <dd>
                <code>{workId}</code> ·{" "}
                {runtimeHistoryLabel(content.operation_state)}
              </dd>
            </div>
            <div>
              <dt>Interaction</dt>
              <dd>
                <code>{content.interaction.protocol_run_id}</code> ·{" "}
                {runtimeHistoryLabel(content.interaction.durable_state)}
              </dd>
            </div>
            <div>
              <dt>Read position</dt>
              <dd>
                Authority event {content.authority.event_position} ·{" "}
                {invocation.read_at}
              </dd>
            </div>
          </dl>

          <section>
            <h3>Result</h3>
            {result.state === "available" ? (
              <p>
                <code>{result.result_ref.record_id}</code> · revision{" "}
                {result.result_ref.revision} · authority effect{" "}
                {result.authority_effect}
              </p>
            ) : (
              <p>
                {runtimeHistoryLabel(result.state)} · {result.reason}
              </p>
            )}
          </section>

          <section>
            <h3>Interruption and reconnect</h3>
            <p>
              Delivery abort cancels Work{" "}
              {content.interrupt.delivery_abort_cancels_work ? "yes" : "no"} ·
              reconnect {runtimeHistoryLabel(content.interrupt.reconnect)}.
            </p>
          </section>

          <section>
            <h3>Current recovery</h3>
            <p>{runtimeHistoryLabel(content.recovery.assessment)}</p>
            <ul className="history-runtime-recovery">
              {content.recovery.actions.map((action) => (
                <li
                  key={action.operation}
                  data-operation={action.operation}
                  data-eligibility={action.eligibility}
                >
                  <strong>{runtimeHistoryLabel(action.operation)}</strong> ·{" "}
                  {runtimeHistoryLabel(action.eligibility)}
                  <p>{action.reason}</p>
                  {action.command_name === undefined ? null : (
                    <code>{action.command_name}</code>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Authority and limitations</h3>
            <ul>
              {content.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Exact destinations</h3>
            <p>
              <Link
                className="reference-text-link"
                to={`/projects/${encodeURIComponent(project.id)}/work/${encodeURIComponent(workDestination.object_ref.object_id)}`}
                data-place-role={workDestination.place_role}
                data-task-intent={workDestination.task_intent}
              >
                Open Work · {workDestination.object_ref.object_id}
              </Link>
            </p>
            <p aria-current="page">
              History · {historyDestination.object_ref.object_id}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
};

export const HistoryRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectHistoryRouteData>();
  if (data.kind === "suggested_action") {
    return (
      <SuggestedActionWorkHistorySurface
        project={project}
        data={data.history}
      />
    );
  }
  return (
    <HistoryCollectionSurface project={project} initialHistory={data.history} />
  );
};

type ThemeChoice = "system" | "stone" | "graphite" | "contrast";

export const SettingsSurface = ({
  selectedProject,
  controls,
  profiles = [],
  taxonomy,
}: {
  selectedProject?: ProjectRecord | undefined;
  controls?: PetraProjectEffectiveControlsView | undefined;
  profiles?: PetraRegisteredProjectProfile[] | undefined;
  taxonomy?: PetraProjectProfileTaxonomyView | undefined;
}): React.JSX.Element => {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [density, setDensity] = useState("comfortable");
  const displayValue = (value: string | boolean | number | string[]): string =>
    Array.isArray(value) ? value.join(", ") : String(value);
  const sections =
    controls === undefined
      ? []
      : [
          controls.content.sections.privacy,
          controls.content.sections.capability,
          controls.content.sections.model_routing,
          controls.content.sections.work_budget,
          controls.content.sections.review_policy,
        ];

  return (
    <main
      className="settings-surface"
      id="reference-main"
      data-petra-theme={theme}
    >
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Settings · this browser session</p>
          <h1>Settings</h1>
          <p className="reference-lede">
            Personal presentation choices remain separate from governed Project
            controls.
          </p>
        </div>
        <Link
          className="reference-context-back"
          to={
            selectedProject === undefined
              ? "/"
              : `/projects/${selectedProject.id}/brief`
          }
        >
          {selectedProject === undefined
            ? "Return to Projects"
            : `Return to ${selectedProject.title}`}
        </Link>
      </header>

      <div className="settings-layout">
        <section
          className="settings-section"
          aria-labelledby="appearance-title"
        >
          <header>
            <p className="reference-panel-kicker">Personal · session only</p>
            <h2 id="appearance-title">Appearance</h2>
          </header>
          <fieldset>
            <legend>Theme</legend>
            {(["system", "stone", "graphite", "contrast"] as ThemeChoice[]).map(
              (choice) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name="theme"
                    value={choice}
                    checked={theme === choice}
                    onChange={() => setTheme(choice)}
                  />
                  <span>
                    {choice === "system"
                      ? "Use system setting"
                      : choice === "stone"
                        ? "Petra Stone"
                        : choice === "graphite"
                          ? "Petra Graphite"
                          : "High Contrast"}
                  </span>
                </label>
              ),
            )}
          </fieldset>
          <fieldset>
            <legend>Control spacing</legend>
            {(["comfortable", "compact"] as const).map((choice) => (
              <label key={choice}>
                <input
                  type="radio"
                  name="density"
                  value={choice}
                  checked={density === choice}
                  onChange={() => setDensity(choice)}
                />
                <span>
                  {choice === "comfortable" ? "Comfortable" : "Compact"}
                </span>
              </label>
            ))}
          </fieldset>
          <p className="settings-persistence">
            Current preview: {theme} theme, {density} controls. These choices
            reset when this page reloads.
          </p>
        </section>

        <section
          className="settings-section"
          aria-labelledby="accessibility-title"
        >
          <header>
            <p className="reference-panel-kicker">Personal · inherited</p>
            <h2 id="accessibility-title">Accessibility</h2>
          </header>
          <dl className="settings-readonly">
            <div>
              <dt>Reduced motion</dt>
              <dd>Uses the operating system preference</dd>
            </div>
            <div>
              <dt>Forced colors</dt>
              <dd>Uses the browser and operating system preference</dd>
            </div>
            <div>
              <dt>Text size</dt>
              <dd>Uses browser zoom without changing task semantics</dd>
            </div>
          </dl>
        </section>

        <section
          className="settings-section settings-project"
          aria-labelledby="project-controls-title"
        >
          <header>
            <p className="reference-panel-kicker">Governed Project scope</p>
            <h2 id="project-controls-title">Project controls</h2>
          </header>
          {selectedProject === undefined ? (
            <div className="reference-inline-empty">
              <strong>No Project selected</strong>
              <p>Open Settings from a Project to inspect its controls.</p>
            </div>
          ) : (
            <>
              <dl className="settings-readonly">
                <div>
                  <dt>Project</dt>
                  <dd>{selectedProject.title}</dd>
                </div>
                <div>
                  <dt>Profile</dt>
                  <dd>
                    {selectedProject.profile.label} ·{" "}
                    {selectedProject.profile.version}
                  </dd>
                </div>
                <div>
                  <dt>Profile origin</dt>
                  <dd>
                    ProjectDefinition revision {selectedProject.profile.version}
                  </dd>
                </div>
                {taxonomy === undefined ? null : (
                  <div>
                    <dt>Taxonomy resolution</dt>
                    <dd>
                      {taxonomy.resolution.state === "registered"
                        ? `Registered profile · version ${taxonomy.resolution.profile_ref.profile_version}`
                        : taxonomy.resolution.state === "project_authored"
                          ? `Project-authored definition · ${taxonomy.resolution.limitation}`
                          : `Unsupported profile · ${taxonomy.resolution.message}`}
                    </dd>
                  </div>
                )}
                {controls === undefined ? (
                  <div>
                    <dt>Project controls</dt>
                    <dd>The effective-control read is unavailable.</dd>
                  </div>
                ) : (
                  <>
                    <div>
                      <dt>Effective snapshot</dt>
                      <dd>
                        Authority event{" "}
                        {controls.content.authority.event_position}
                        {" · "}Project revision{" "}
                        {controls.content.project_ref.revision}
                      </dd>
                    </div>
                    {sections.map((section) => (
                      <div key={section.label}>
                        <dt>{section.label}</dt>
                        <dd>
                          {section.state.replaceAll("_", " ")}
                          {section.values.length === 0
                            ? ` · ${section.summary}`
                            : ` · ${section.values
                                .map(
                                  (value) =>
                                    `${value.label}: ${displayValue(value.value)}`,
                                )
                                .join("; ")}`}
                        </dd>
                      </div>
                    ))}
                  </>
                )}
              </dl>
              <p
                id="project-setting-boundary"
                className="settings-command-boundary"
              >
                Project controls require exact prospective effect, capability,
                and History recording. No typed Project control operation is
                connected.
              </p>
              <PetraButton
                aria-disabled="true"
                aria-describedby="project-setting-boundary"
              >
                Change Project controls
              </PetraButton>
              <Link
                className="reference-primary-link"
                to={`/projects/${selectedProject.id}/profile`}
              >
                Inspect Project profile
              </Link>
            </>
          )}
        </section>
        {selectedProject === undefined ? null : (
          <ProjectResetPanel project={selectedProject} profiles={profiles} />
        )}
      </div>
    </main>
  );
};

export const SettingsRoute = (): React.JSX.Element => {
  const { selectedProject, controls, profiles, taxonomy } =
    useLoaderData<ProjectSettingsData>();
  return (
    <SettingsSurface
      selectedProject={selectedProject}
      controls={controls}
      profiles={profiles}
      taxonomy={taxonomy}
    />
  );
};

export const ProfileToolSurface = ({
  project,
  tool,
}: {
  project: ProjectRecord;
  tool: ProfileToolTask;
}): React.JSX.Element => (
  <main className="reference-surface profile-tool" id="reference-main">
    <header className="reference-surface-heading">
      <div>
        <p className="reference-eyebrow">Profile tool · {tool.profileLabel}</p>
        <h1>{tool.label}</h1>
        <p className="reference-lede">{tool.objective}</p>
      </div>
      <span className="profile-tool__capability">{tool.capability}</span>
    </header>
    <section
      className="profile-tool__task"
      aria-labelledby="profile-tool-inputs-title"
    >
      <header>
        <p className="reference-panel-kicker">Typed profile inputs</p>
        <h2 id="profile-tool-inputs-title">Check scope</h2>
      </header>
      <dl>
        {tool.inputs.map((input) => (
          <div key={input.label}>
            <dt>{input.label}</dt>
            <dd>{input.value}</dd>
          </div>
        ))}
      </dl>
      {tool.result === undefined ? (
        <section
          className="profile-tool__unavailable"
          aria-labelledby="profile-tool-unavailable-title"
        >
          <span aria-hidden="true">!</span>
          <div>
            <h3 id="profile-tool-unavailable-title">The check cannot start</h3>
            <p>
              No registered alternatives are available, so constraint coverage
              cannot be evaluated.
            </p>
            <p id="profile-tool-boundary">
              Starting this tool also requires its registered Work operation.
              Petra will not invent alternatives or a result.
            </p>
            <PetraButton
              variant="primary"
              aria-disabled="true"
              aria-describedby="profile-tool-boundary"
            >
              Start coverage check
            </PetraButton>
          </div>
        </section>
      ) : null}
    </section>
    <footer className="reference-reader-return">
      <p>
        Profile terms and validation come from the registered tool; Petra owns
        Work, recovery, and return.
      </p>
      <Link
        className="reference-primary-link"
        to={`/projects/${project.id}/brief`}
      >
        Return to {tool.returnLabel}
      </Link>
    </footer>
  </main>
);

export const ProfileToolRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const { toolId } = useParams();
  const tool = getProjectProfileTool(project.id, toolId);
  if (tool === undefined) {
    return (
      <main className="reference-route-error" id="reference-main">
        <PetraMark />
        <p className="reference-eyebrow">Profile tool unavailable</p>
        <h1>This tool is not registered for the active profile</h1>
        <p>
          Petra did not substitute another profile's task or generic controls.
        </p>
        <Link
          className="reference-text-link"
          to={`/projects/${project.id}/brief`}
        >
          Return to Brief
        </Link>
      </main>
    );
  }
  return <ProfileToolSurface project={project} tool={tool} />;
};
