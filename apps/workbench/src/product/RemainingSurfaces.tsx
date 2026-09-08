import { useState } from "react";
import { Link, useLoaderData, useParams } from "react-router";

import type { PetraProjectEffectiveControlsView } from "@petra/contracts";

import { PetraMark } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraDialog,
  PetraTextArea,
} from "../design-system/primitives.js";
import {
  getHistoryEpisode,
  getProjectArtifacts,
  getProjectHistory,
  getProjectProfileTool,
  getReferenceArtifact,
} from "./fixtures.js";
import type {
  CompositionArtifact,
  HistoryEpisode,
  ProfileToolTask,
  ProjectRecord,
} from "./model.js";
import type { ProjectSettingsData } from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";

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

export const HistoryRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const { episodeId } = useParams();
  const episodes = getProjectHistory(project.id);
  const selected =
    episodeId === undefined
      ? episodes[0]
      : getHistoryEpisode(project.id, episodeId);
  return (
    <HistorySurface project={project} episodes={episodes} selected={selected} />
  );
};

type ThemeChoice = "system" | "stone" | "graphite" | "contrast";

export const SettingsSurface = ({
  selectedProject,
  controls,
}: {
  selectedProject?: ProjectRecord | undefined;
  controls?: PetraProjectEffectiveControlsView | undefined;
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
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export const SettingsRoute = (): React.JSX.Element => {
  const { selectedProject, controls } = useLoaderData<ProjectSettingsData>();
  return (
    <SettingsSurface selectedProject={selectedProject} controls={controls} />
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
