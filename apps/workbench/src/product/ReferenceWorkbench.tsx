import { IntakeCopilotConversation } from "./IntakeCopilotConversation.js";
import {
  IntakeWorkspaceProvider,
  IntakeWorkspaceAnswer,
  useIntakeWorkspace,
} from "./IntakeWorkspace.js";
import { ProjectBriefSurface } from "./ProjectBriefSurface.js";
import {
  CopilotWorkspaceProvider,
  CopilotWorkspaceBody,
} from "./CopilotWorkspace.js";
import {
  ProjectObjectiveEmptyBrief,
  type ProjectObjectiveReturnOutcome,
} from "./ProjectObjectiveControl.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  PetraProjectInquiryView,
  PetraProjectSemanticGraphView,
  PetraSuggestedActionView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useMatches,
  useLocation,
  useNavigate,
  useOutletContext,
  useRevalidator,
  useRouteError,
  useSearchParams,
} from "react-router";

import { PetraLockup, PetraMark } from "../design-system/brand.js";
import { PetraButton, PetraTextField } from "../design-system/primitives.js";
import { getProjectProfileTool } from "./fixtures.js";
import { ProjectCreationPanel } from "./ProjectProfileSurface.js";
import {
  ProjectImportPanel,
  projectImportAvailability,
} from "./ProjectImportSurface.js";
import { SourceRegistrationPanel } from "./SourceRegistration.js";
import { SourceProcessingPanel } from "./SourceProcessing.js";
import {
  SourceLinkRemovalActions,
  type SourceLinkRemovalClient,
} from "./SourceLinkRemoval.js";
import type { SourceLocalCopyDeletionClient } from "./SourceLocalCopyDeletion.js";
import { SourceRevisionPanel } from "./SourceRevision.js";
import { SourceReusePanel, type SourceReuseCompletion } from "./SourceReuse.js";
import type {
  ProjectBriefData,
  ProjectCollectionData,
  ProjectCollectionPage,
  ProjectSourceCollectionData,
  ProjectSourceRecordData,
} from "./project-data.js";
import { searchProjectCollection } from "./project-data.js";
import type { ProjectShellCollectionRequest } from "@petra/core";
import type { SourceRevisionContext } from "./source-revision.js";
import { SuggestedWorkAction } from "./SuggestedAction.js";
import {
  AgentControlPlaneProvider,
  AgentControlPortal,
  AgentConversation,
} from "./AgentControlPlane.js";
import { projectWorkDestinationPath } from "./project-work-destination.js";
import { WorkspaceHost, type WorkspacePlace } from "./WorkspaceHost.js";
import { InspectWorkspace } from "./InspectWorkspace.js";
import {
  WorkspaceDraftProvider,
  useWorkspaceDraftState,
} from "./workspace-drafts.js";
import { usePersonalPreferences } from "./use-personal-preferences.js";
import type {
  EngineState,
  ProjectPlace,
  ProjectRecord,
  SourceExtent,
  SourceRecord,
} from "./model.js";

const join = (...parts: Array<string | false | undefined>): string =>
  parts.filter(Boolean).join(" ");

type ProjectSwitchOrigin = {
  readonly href: string;
  readonly projectId: string;
  readonly projectTitle: string;
  readonly taskLabel: string;
};

type ProjectSwitchLocationState = {
  readonly projectSwitchOrigin: ProjectSwitchOrigin;
};

const projectSwitchOriginFromState = (
  state: unknown,
): ProjectSwitchOrigin | undefined => {
  if (typeof state !== "object" || state === null) return undefined;
  const origin = (state as Partial<ProjectSwitchLocationState>)
    .projectSwitchOrigin;
  if (
    typeof origin !== "object" ||
    origin === null ||
    typeof origin.href !== "string" ||
    !origin.href.startsWith("/projects/") ||
    typeof origin.projectId !== "string" ||
    !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(origin.projectId) ||
    !origin.href.startsWith(
      `/projects/${encodeURIComponent(origin.projectId)}/`,
    ) ||
    typeof origin.projectTitle !== "string" ||
    origin.projectTitle.trim().length === 0 ||
    typeof origin.taskLabel !== "string"
  ) {
    return undefined;
  }
  return origin;
};

const projectSwitchState = (
  origin: ProjectSwitchOrigin | undefined,
): ProjectSwitchLocationState | undefined =>
  origin === undefined ? undefined : { projectSwitchOrigin: origin };

const ProjectStateLabel = ({ project }: { project: ProjectRecord }) => (
  <span className="reference-status" data-state={project.state}>
    <span aria-hidden="true" className="reference-status__symbol">
      {project.state === "attention"
        ? "!"
        : project.state === "ready"
          ? "✓"
          : "·"}
    </span>
    {project.stateLabel}
  </span>
);

const ProjectionLabel = ({ project }: { project: ProjectRecord }) => (
  <span
    className="reference-status"
    data-state={project.projection.state}
    title={project.projection.detail}
  >
    <span aria-hidden="true" className="reference-status__symbol">
      {project.projection.state === "current" ? "✓" : "↻"}
    </span>
    {project.projection.label}
  </span>
);

const ProjectResumeState = ({ project }: { project: ProjectRecord }) => {
  const resume = project.resume;
  if (resume === undefined) return null;
  const label =
    resume.state === "available"
      ? (resume.retained_task?.label ?? resume.recovery.destination.purpose)
      : (resume.failure?.message ?? resume.recovery.reason);
  return (
    <div
      className="reference-project-resume-state"
      data-resume-state={resume.state}
    >
      <strong>
        {resume.state === "available"
          ? "Retained task ready"
          : resume.state === "unavailable"
            ? "Resume read unavailable"
            : "Brief recovery"}
      </strong>
      <span>{label}</span>
    </div>
  );
};

const extentSymbol: Record<SourceExtent, string> = {
  identity_only: "○",
  preview: "◔",
  partial: "◑",
  complete: "●",
  restricted: "×",
};

const SourceExtentLabel = ({ source }: { source: SourceRecord }) => (
  <span className="reference-status" data-state={source.extent}>
    <span aria-hidden="true" className="reference-status__symbol">
      {extentSymbol[source.extent]}
    </span>
    {source.extentLabel}
  </span>
);

export const ProductFrame = (): React.JSX.Element => {
  const health = useLoaderData<EngineState>();
  const { receipt: personalPreferences } = usePersonalPreferences();
  const preferences = personalPreferences.preferences;
  const servicesReady = health.ok && health.accepting;

  return (
    <div
      className="reference-app"
      data-petra-theme={preferences.appearance.theme}
      data-petra-reduced-motion={
        preferences.accessibility.reduceMotion || undefined
      }
      data-personal-layout={preferences.layout.preset}
      style={
        {
          "--petra-project-map-width": `${preferences.layout.panels.map}px`,
          "--petra-editor-font-size": `${preferences.editor.fontSize}px`,
          "--petra-editor-ligatures": preferences.editor.ligatures
            ? "normal"
            : "none",
        } as CSSProperties
      }
    >
      <a className="reference-skip-link" href="#reference-main">
        Skip to main content
      </a>
      <header className="reference-global-header">
        <Link to="/" className="reference-brand" aria-label="Petra Projects">
          <PetraLockup variant="compact" />
        </Link>
        <p>Agent workspace</p>
        <div
          className="reference-global-status"
          role="status"
          aria-live="polite"
        >
          <span className="reference-scope">Local · private</span>
          <span>
            <span
              className={join(
                "reference-engine-dot",
                servicesReady && "is-ready",
              )}
              aria-hidden="true"
            />
            <span className="reference-engine-label">
              <span className="reference-engine-prefix">Services </span>
              {servicesReady ? "ready" : "unavailable"}
            </span>
          </span>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

const ProjectsSurfaceContent = ({
  projects = [],
  profiles = [],
  query: initialQuery = { limit: 12 },
  page: initialPage = {
    returned_count: projects.length,
    total_count: projects.length,
    has_more: false,
  },
  searchProjects = searchProjectCollection,
}: {
  projects?: ProjectRecord[];
  profiles?: ProjectCollectionData["profiles"];
  query?: ProjectCollectionData["query"];
  page?: ProjectCollectionData["page"];
  searchProjects?: (
    request: ProjectShellCollectionRequest,
  ) => Promise<ProjectCollectionPage>;
}): React.JSX.Element => {
  const intakeWorkspace = useIntakeWorkspace();
  const location = useLocation();
  const switchOrigin = projectSwitchOriginFromState(location.state);
  const targetState = projectSwitchState(switchOrigin);
  const [searchText, setSearchText] = useState(initialQuery.search ?? "");
  const [status, setStatus] = useState<"" | "active" | "archived">(
    initialQuery.status ?? "",
  );
  const [profile, setProfile] = useState(initialQuery.profile ?? "");
  const [results, setResults] = useState<ProjectCollectionPage>({
    projects,
    query: initialQuery,
    page: initialPage,
  });
  const [cursorTrail, setCursorTrail] = useState<Array<string | undefined>>([]);
  const [lastRequest, setLastRequest] =
    useState<ProjectShellCollectionRequest>(initialQuery);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<
    | { readonly kind: "invalid" | "unavailable"; readonly message: string }
    | undefined
  >();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const requestSequence = useRef(0);
  const importUnavailable = projectImportAvailability(results.projects);
  const hasFilters =
    results.query.search !== undefined ||
    results.query.status !== undefined ||
    results.query.profile !== undefined;
  const profileOptions = useMemo(
    () =>
      Array.from(
        new Map(
          profiles.map((registered) => [
            registered.definition_family,
            registered,
          ]),
        ).values(),
      ),
    [profiles],
  );
  useEffect(() => {
    setResults({ projects, query: initialQuery, page: initialPage });
    setSearchText(initialQuery.search ?? "");
    setStatus(initialQuery.status ?? "");
    setProfile(initialQuery.profile ?? "");
    setCursorTrail([]);
    setLastRequest(initialQuery);
    setFailure(undefined);
  }, [initialPage, initialQuery, projects]);

  const runSearch = async (
    request: ProjectShellCollectionRequest,
    history: "reset" | "next" | "previous" | "retry",
  ): Promise<void> => {
    if (busy) return;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setBusy(true);
    setFailure(undefined);
    setLastRequest(request);
    try {
      const next = await searchProjects(request);
      if (requestSequence.current !== sequence) return;
      setResults(next);
      if (history === "reset") setCursorTrail([]);
      if (history === "next") {
        setCursorTrail((trail) => [...trail, results.query.cursor]);
      }
      if (history === "previous") {
        setCursorTrail((trail) => trail.slice(0, -1));
      }
    } catch (error) {
      if (requestSequence.current !== sequence) return;
      const invalid = error instanceof TypeError;
      setFailure({
        kind: invalid ? "invalid" : "unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Petra could not search Projects right now.",
      });
    } finally {
      if (requestSequence.current === sequence) setBusy(false);
    }
  };

  const submitSearch = (): void => {
    const trimmed = searchText.trim();
    if (searchText.length > 240 || (searchText.length > 0 && trimmed === "")) {
      setFailure({
        kind: "invalid",
        message:
          "Enter up to 240 characters, or leave Find a Project empty to show all Projects.",
      });
      return;
    }
    setSearchText(trimmed);
    void runSearch(
      {
        ...(trimmed === "" ? {} : { search: trimmed }),
        ...(status === "" ? {} : { status }),
        ...(profile === "" ? {} : { profile }),
        limit: results.query.limit,
      },
      "reset",
    );
  };

  const clearSearch = (): void => {
    setSearchText("");
    setStatus("");
    setProfile("");
    void runSearch({ limit: results.query.limit }, "reset");
  };

  return (
    <div className="reference-project-layout reference-intake-layout">
      <aside className="reference-agent-panel reference-intake-panel">
        <IntakeCopilotConversation
          onReview={() => {
            intakeWorkspace?.dismiss();
            setImporting(false);
            setCreating(true);
          }}
        />
      </aside>
      <div className="reference-intake-workspace">
        <IntakeWorkspaceAnswer />
        <div hidden={intakeWorkspace?.turn !== undefined}>
          <main className="reference-projects" id="reference-main">
            <section
              className="reference-page-heading"
              aria-labelledby="projects-title"
            >
              <div>
                <p className="reference-eyebrow">Projects</p>
                <h1 id="projects-title">Choose where to continue</h1>
                <p className="reference-lede">
                  Each Project keeps its own definition, history, work, and
                  authoritative state. Petra stores this workspace locally.
                </p>
              </div>
              <div className="reference-page-heading__actions">
                <PetraButton
                  variant="secondary"
                  onClick={() => {
                    setCreating(false);
                    setImporting(true);
                  }}
                  {...(importUnavailable === undefined
                    ? {}
                    : { unavailable: importUnavailable })}
                >
                  Import Project
                </PetraButton>
                <PetraButton
                  variant="primary"
                  onClick={() => {
                    setImporting(false);
                    setCreating(true);
                  }}
                >
                  New Project
                </PetraButton>
              </div>
            </section>

            {switchOrigin === undefined ? null : (
              <section
                className="reference-project-switch"
                aria-labelledby="project-switch-title"
              >
                <div>
                  <p className="reference-panel-kicker">Project switch</p>
                  <h2 id="project-switch-title">
                    Choose another Project without stopping prior Work
                  </h2>
                  <p>
                    You came from {switchOrigin.taskLabel} in{" "}
                    <strong>{switchOrigin.projectTitle}</strong>. Opening a
                    different Project only changes the visible workspace; it
                    does not cancel or replace Work in the prior Project.
                  </p>
                  <p>
                    The opened Project will offer an exact return to this task.
                    Unsubmitted fields, local selection, browser focus, and
                    local presentation history are not transferred between
                    Projects; save or submit them first when their surface does
                    not say they are retained.
                  </p>
                </div>
                <Link className="reference-primary-link" to={switchOrigin.href}>
                  Return to prior task
                </Link>
              </section>
            )}

            {creating ? (
              <ProjectCreationPanel
                profiles={[...profiles]}
                onCancel={() => setCreating(false)}
              />
            ) : null}

            {importing ? (
              <ProjectImportPanel
                projects={results.projects}
                onCancel={() => setImporting(false)}
              />
            ) : null}

            <form
              className="reference-project-search"
              aria-label="Find a Project"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <PetraTextField
                label="Find a Project"
                hint="Petra searches the current Project name, Objective statement, and definition label."
                placeholder="Name, Objective, or definition"
                type="search"
                maxLength={241}
                value={searchText}
                {...(failure?.kind === "invalid"
                  ? { error: failure.message }
                  : {})}
                onChange={(event) => setSearchText(event.currentTarget.value)}
              />
              <label className="petra-field">
                <span className="petra-field__label">Status</span>
                <select
                  className="petra-field__control"
                  name="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.currentTarget.value as "" | "active" | "archived",
                    )
                  }
                >
                  <option value="">Any status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="petra-field">
                <span className="petra-field__label">Starting definition</span>
                <select
                  className="petra-field__control"
                  name="profile"
                  value={profile}
                  onChange={(event) => setProfile(event.currentTarget.value)}
                >
                  <option value="">Any definition</option>
                  {profileOptions.map((registered) => (
                    <option
                      key={registered.definition_family}
                      value={registered.definition_family}
                    >
                      {registered.content.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="reference-project-search__actions">
                <PetraButton
                  variant="primary"
                  type="submit"
                  busy={busy}
                  busyLabel="Searching Projects"
                >
                  Find Projects
                </PetraButton>
                {hasFilters ||
                searchText !== "" ||
                status !== "" ||
                profile !== "" ? (
                  <PetraButton variant="quiet" onClick={clearSearch}>
                    Clear search
                  </PetraButton>
                ) : null}
              </div>
            </form>

            {failure?.kind === "unavailable" ? (
              <section
                className="reference-project-search__failure"
                role="alert"
                aria-labelledby="project-search-failure-title"
              >
                <div>
                  <h2 id="project-search-failure-title">
                    Project search is temporarily unavailable
                  </h2>
                  <p>{failure.message}</p>
                  <p>
                    Your last server results remain below. No local substitute
                    was used.
                  </p>
                </div>
                <PetraButton
                  variant="secondary"
                  busy={busy}
                  busyLabel="Retrying search"
                  onClick={() => void runSearch(lastRequest, "retry")}
                >
                  Retry search
                </PetraButton>
              </section>
            ) : null}

            <p
              className="reference-result-count"
              role="status"
              aria-live="polite"
            >
              {busy
                ? "Searching Projects…"
                : `Showing ${results.page.returned_count} of ${results.page.total_count} ${results.page.total_count === 1 ? "Project" : "Projects"}`}
            </p>

            <div
              className="reference-project-results"
              aria-busy={busy || undefined}
            >
              {results.projects.length === 0 ? (
                <section
                  className="reference-empty"
                  aria-labelledby="no-projects-title"
                >
                  <PetraMark />
                  <h2 id="no-projects-title">
                    {hasFilters
                      ? "No Projects match this search"
                      : "No Projects yet"}
                  </h2>
                  <p>
                    {hasFilters
                      ? "Change or clear the search to ask Petra for another bounded Project list."
                      : "Describe an outcome to create your first Project."}
                  </p>
                  {hasFilters ? (
                    <PetraButton variant="secondary" onClick={clearSearch}>
                      Show all Projects
                    </PetraButton>
                  ) : null}
                </section>
              ) : (
                <ul className="reference-project-grid">
                  {results.projects.map((project) => (
                    <li key={project.id}>
                      <article className="reference-project-card">
                        <div className="reference-project-card__topline">
                          <span>{project.profile.label}</span>
                          <ProjectStateLabel project={project} />
                        </div>
                        <h2>
                          <Link
                            to={`/projects/${project.id}/${project.resume?.state === "available" ? "resume" : "brief"}`}
                            state={targetState}
                          >
                            {project.title}
                          </Link>
                        </h2>
                        <p>{project.objective}</p>
                        <ProjectResumeState project={project} />
                        <dl className="reference-compact-facts">
                          <div>
                            <dt>Current</dt>
                            <dd>{project.snapshot.label}</dd>
                          </div>
                          <div>
                            <dt>Updated</dt>
                            <dd>{project.updatedAt}</dd>
                          </div>
                        </dl>
                        <div className="reference-project-card__footer">
                          <ProjectionLabel project={project} />
                          <div className="reference-project-card__actions">
                            <Link
                              className="reference-text-link"
                              to={`/projects/${project.id}/brief`}
                              state={targetState}
                            >
                              Open Brief
                            </Link>
                            {project.resume === undefined ||
                            project.resume.state === "available" ? null : (
                              <Link
                                className="reference-primary-link"
                                to={`/projects/${project.id}/resume`}
                                state={targetState}
                              >
                                {project.resume.state === "unavailable"
                                  ? "Retry Resume"
                                  : "Open Brief recovery"}
                                <span aria-hidden="true">→</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cursorTrail.length > 0 || results.page.has_more ? (
              <nav
                className="reference-project-pagination"
                aria-label="Project pages"
              >
                <PetraButton
                  variant="secondary"
                  {...(cursorTrail.length === 0
                    ? {
                        unavailable: {
                          reason: "This is the first Project page.",
                        },
                      }
                    : {})}
                  onClick={() => {
                    const previousCursor = cursorTrail.at(-1);
                    const { cursor: currentCursor, ...baseRequest } =
                      results.query;
                    void currentCursor;
                    const request =
                      previousCursor === undefined
                        ? baseRequest
                        : { ...baseRequest, cursor: previousCursor };
                    void runSearch(request, "previous");
                  }}
                >
                  Previous page
                </PetraButton>
                <span>Server page {cursorTrail.length + 1}</span>
                <PetraButton
                  variant="secondary"
                  {...(results.page.has_more
                    ? {}
                    : {
                        unavailable: {
                          reason: "There are no more matching Projects.",
                        },
                      })}
                  onClick={() => {
                    if (results.page.next_cursor === undefined) return;
                    void runSearch(
                      { ...results.query, cursor: results.page.next_cursor },
                      "next",
                    );
                  }}
                >
                  Next page
                </PetraButton>
              </nav>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
};

export const ProjectsSurface = (
  props: React.ComponentProps<typeof ProjectsSurfaceContent>,
): React.JSX.Element => (
  <IntakeWorkspaceProvider>
    <ProjectsSurfaceContent {...props} />
  </IntakeWorkspaceProvider>
);

export const ProjectsRoute = (): React.JSX.Element => (
  <ProjectsSurface {...useLoaderData<ProjectCollectionData>()} />
);

type ProjectOutletContext = { project: ProjectRecord };

export const useProjectRecord = (): ProjectRecord => {
  const context = useOutletContext<ProjectOutletContext>();
  return context.project;
};

const placeFromPath = (pathname: string): WorkspacePlace =>
  pathname.includes("/profile")
    ? "profile_tool"
    : pathname.includes("/inspect")
      ? "inspect"
      : pathname.includes("/resume")
        ? "graph"
        : pathname.includes("/sources")
          ? "sources"
          : pathname.includes("/review")
            ? "review"
            : pathname.includes("/graph")
              ? "graph"
              : pathname.includes("/work")
                ? "work"
                : pathname.includes("/composition")
                  ? "composition"
                  : pathname.includes("/history")
                    ? "history"
                    : pathname.includes("/tools/")
                      ? "profile_tool"
                      : pathname.includes("/petra")
                        ? "petra"
                        : "brief";

export const hashFocusTargetId = (hash: string): string | undefined => {
  if (!hash.startsWith("#") || hash.length === 1) return undefined;
  try {
    const target = decodeURIComponent(hash.slice(1));
    return target.length === 0 ? undefined : target;
  } catch {
    return undefined;
  }
};

const AGENT_WIDTH_STORAGE_KEY = "petra.agent-width-percent";
const boundedAgentWidth = (value: number): number =>
  Math.max(30, Math.min(40, Math.round(value)));
const initialAgentWidth = (): number => {
  if (typeof window === "undefined") return 30;
  try {
    const stored = Number(
      window.sessionStorage.getItem(AGENT_WIDTH_STORAGE_KEY),
    );
    return Number.isFinite(stored) && stored >= 30 && stored <= 40
      ? boundedAgentWidth(stored)
      : 30;
  } catch {
    return 30;
  }
};

export const ProjectShell = (): React.JSX.Element => {
  const project = useLoaderData<ProjectRecord>();
  const matches = useMatches();
  const candidateGraph = matches.at(-1)?.loaderData as
    PetraProjectSemanticGraphView | undefined;
  const nativeGraph =
    candidateGraph?.schema_name === "petra.project-semantic-graph-view"
      ? candidateGraph
      : undefined;
  const location = useLocation();
  const projectLayout = useRef<HTMLDivElement>(null);
  const resizingAgent = useRef(false);
  const [agentWidth, setAgentWidth] = useState(initialAgentWidth);
  const projectNav = useRef<HTMLElement>(null);
  const previousWorkspacePath = useRef(location.pathname);
  const [mobilePane, setMobilePane] = useState<"agent" | "workspace">(
    "workspace",
  );
  const [agentControlTarget, setAgentControlTarget] =
    useState<HTMLDivElement | null>(null);
  const currentPlace = placeFromPath(location.pathname);
  const openReviewCount =
    project.placeSummaries?.find((summary) => summary.role === "review")
      ?.attentionCount ?? 0;
  const currentWorkspaceLabel: Record<WorkspacePlace | "settings", string> = {
    brief: "Overview",
    petra: "Conversation",
    work: "Work",
    sources: "Sources",
    graph: "Graph",
    review: "Review",
    history: "History",
    composition: "Outputs",
    profile_tool: "Project definition",
    settings: "Settings",
    inspect: "Inspect",
  };
  const incomingSwitchOrigin = projectSwitchOriginFromState(location.state);
  const currentTaskLabel =
    location.pathname.endsWith("/resume") &&
    project.resume?.state === "available"
      ? (project.resume.retained_task?.label ?? "the retained task")
      : currentPlace === "profile_tool"
        ? "the Project definition"
        : `the Project ${currentWorkspaceLabel[currentPlace]}`;
  const currentSwitchOrigin: ProjectSwitchOrigin = {
    href: `${location.pathname}${location.search}${location.hash}`,
    projectId: project.id,
    projectTitle: project.title,
    taskLabel: currentTaskLabel,
  };
  const collectionSwitchOrigin =
    incomingSwitchOrigin === undefined ||
    incomingSwitchOrigin.projectId === project.id
      ? currentSwitchOrigin
      : incomingSwitchOrigin;
  const returnSwitchOrigin =
    incomingSwitchOrigin !== undefined &&
    incomingSwitchOrigin.projectId !== project.id
      ? incomingSwitchOrigin
      : undefined;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        AGENT_WIDTH_STORAGE_KEY,
        String(agentWidth),
      );
    } catch {
      // The selected width remains available for this mounted workspace.
    }
  }, [agentWidth]);

  const resizeAgentTo = (clientX: number): void => {
    const bounds = projectLayout.current?.getBoundingClientRect();
    if (bounds === undefined || bounds.width === 0) return;
    setAgentWidth(
      boundedAgentWidth(((clientX - bounds.left) / bounds.width) * 100),
    );
  };

  useEffect(() => {
    projectNav.current
      ?.querySelector<HTMLElement>('a[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentPlace]);

  useEffect(() => {
    const targetId = hashFocusTargetId(location.hash);
    if (targetId === undefined) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (target === null) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  useEffect(() => {
    const pathChanged = previousWorkspacePath.current !== location.pathname;
    previousWorkspacePath.current = location.pathname;
    if (!pathChanged || hashFocusTargetId(location.hash) !== undefined) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("project-workspace-title")?.focus({
        preventScroll: true,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  const destinationLink = ({
    place,
    to,
    label,
  }: {
    place: ProjectPlace;
    to: string;
    label: string;
  }): React.JSX.Element => {
    const summary = project.placeSummaries?.find(
      (candidate) => candidate.role === place,
    );
    return (
      <NavLink key={place} to={to} onClick={() => setMobilePane("workspace")}>
        <span>{label}</span>
        {summary === undefined || summary.attentionCount === 0 ? null : (
          <span
            className="reference-nav-attention"
            aria-label={`${summary.attentionCount} ${summary.attentionCount === 1 ? "item" : "items"} need attention`}
          >
            <span aria-hidden="true">!</span>
            {summary.attentionCount}
          </span>
        )}
      </NavLink>
    );
  };

  const workspaceNavigation = (
    <nav
      ref={projectNav}
      aria-label={`${project.title} workspace destinations`}
    >
      <div className="reference-workspace-destinations">
        <p className="reference-nav-label">Workspace</p>
        {[
          { place: "brief" as const, to: "brief", label: "Overview" },
          {
            place: "sources" as const,
            to: "sources",
            label: "Sources",
          },
          { place: "review" as const, to: "review", label: "Review" },
          { place: "graph" as const, to: "graph", label: "Graph" },
          {
            place: "composition" as const,
            to: "composition",
            label: "Outputs",
          },
        ].map(destinationLink)}
      </div>

      <details className="reference-project-inspection">
        <summary>Inspect project</summary>
        <div className="reference-project-inspection__content">
          <p>
            See the retained work, graph, history, and project definition that
            Petra is using.
          </p>
          <div className="reference-project-inspection__state">
            <span>
              <strong>{project.snapshot.label}</strong>
              <small>{project.snapshot.asOf}</small>
            </span>
            <ProjectionLabel project={project} />
          </div>
          <div className="reference-project-inspection__links">
            {[
              { place: "work" as const, to: "work", label: "Work" },
              {
                place: "history" as const,
                to: "history",
                label: "History",
              },
              {
                place: "profile_tool" as const,
                to: "profile",
                label: "Project definition",
              },
            ].map(destinationLink)}
          </div>
          <p className="reference-project-inspection__definition">
            <strong>{project.profile.label}</strong>
            <span>{project.profile.description}</span>
          </p>
        </div>
      </details>
    </nav>
  );

  return (
    <div className="reference-project-shell">
      <a
        className="reference-skip-link reference-skip-link--project"
        href="#project-agent"
      >
        Skip to Agent
      </a>
      <div
        className="reference-context-bar"
        aria-label="Current Project context"
      >
        <div className="reference-context-bar__identity">
          <Link
            to="/"
            className="reference-context-back"
            state={projectSwitchState(collectionSwitchOrigin)}
          >
            <span aria-hidden="true">←</span> Projects
          </Link>
          <div>
            <strong>{project.title}</strong>
            <span>{currentWorkspaceLabel[currentPlace]}</span>
          </div>
        </div>
        <div className="reference-context-bar__state">
          {returnSwitchOrigin === undefined ? null : (
            <Link
              className="reference-context-action"
              to={returnSwitchOrigin.href}
            >
              Return to {returnSwitchOrigin.projectTitle}
            </Link>
          )}
          <div
            className="reference-mobile-pane-switcher"
            role="group"
            aria-label="Choose project pane"
          >
            <button
              type="button"
              aria-pressed={mobilePane === "agent"}
              onClick={() => setMobilePane("agent")}
            >
              Agent
            </button>
            <button
              type="button"
              aria-pressed={mobilePane === "workspace"}
              onClick={() => setMobilePane("workspace")}
            >
              Workspace
            </button>
          </div>
          <Link
            className="reference-context-action"
            to={`/settings?project=${project.id}`}
          >
            Settings
          </Link>
        </div>
      </div>

      <CopilotWorkspaceProvider
        key={project.id}
        onOpenWorkspace={() => setMobilePane("workspace")}
      >
        <AgentControlPlaneProvider
          target={agentControlTarget}
          project={project}
        >
          <div
            ref={projectLayout}
            className="reference-project-layout"
            data-mobile-pane={mobilePane}
            style={{ "--petra-agent-share": `${agentWidth}%` } as CSSProperties}
          >
            <aside
              className="reference-project-nav reference-agent-panel"
              id="project-agent"
              aria-labelledby="project-agent-title"
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest("a") !== null) {
                  setMobilePane("workspace");
                }
              }}
            >
              <header className="reference-agent-heading">
                <span className="reference-agent-mark" aria-hidden="true">
                  <PetraMark />
                </span>
                <div>
                  <p className="reference-panel-kicker">Your copilot</p>
                  <h2 id="project-agent-title">Petra</h2>
                </div>
              </header>

              <section
                className="reference-agent-outcome"
                aria-labelledby="current-outcome-title"
              >
                <p className="reference-nav-label" id="current-outcome-title">
                  Current outcome
                </p>
                <details className="copilot-outcome-disclosure">
                  <summary>Project objective</summary>
                  <p>{project.objective}</p>
                </details>
                <div className="reference-agent-outcome__state">
                  <ProjectStateLabel project={project} />
                  {openReviewCount > 0 ? (
                    <Link
                      className="reference-agent-review-attention"
                      to={`/projects/${project.id}/review`}
                      data-operation-id="review.queue"
                      onClick={() => setMobilePane("workspace")}
                    >
                      {openReviewCount} open{" "}
                      {openReviewCount === 1 ? "Review" : "Reviews"}
                    </Link>
                  ) : null}
                </div>
              </section>

              <AgentConversation
                key={project.id}
                project={project}
                returnContext={{
                  path: currentSwitchOrigin.href,
                  label: currentWorkspaceLabel[currentPlace],
                }}
                onControlTarget={setAgentControlTarget}
              />

              {project.attentionWork === undefined ? null : (
                <details className="copilot-work-attention">
                  <summary>Tasks needing attention</summary>
                  <aside
                    className="reference-attention-work"
                    id="shell-attention-work"
                    tabIndex={-1}
                    aria-labelledby="shell-attention-work-title"
                    data-state={project.attentionWork.state}
                  >
                    <p className="reference-panel-kicker">
                      Needs your attention
                    </p>
                    <h2 id="shell-attention-work-title">
                      Active or waiting on you
                    </h2>
                    {project.attentionWork.state === "unavailable" ? (
                      <p>{project.attentionWork.reason}</p>
                    ) : (
                      <>
                        <p>
                          {project.attentionWork.total_count === 0
                            ? "Nothing needs your attention right now."
                            : `${project.attentionWork.total_count} ${project.attentionWork.total_count === 1 ? "task needs" : "tasks need"} attention.`}
                        </p>
                        {project.attentionWork.tasks.length === 0 ? null : (
                          <ul>
                            {project.attentionWork.tasks.map((task) => (
                              <li key={task.work_unit_ref.work_unit_id}>
                                <Link
                                  to={projectWorkDestinationPath(
                                    project.id,
                                    task.destination.target_ref,
                                    {
                                      path: `${location.pathname}${location.search}#shell-attention-work`,
                                      label: "Needs your attention",
                                      focusId: "shell-attention-work",
                                    },
                                  )}
                                  onClick={() => setMobilePane("workspace")}
                                >
                                  <strong>{task.task_label}</strong>
                                  <span>{task.objective}</span>
                                  <small data-state={task.attention.state}>
                                    {presentationLabel(task.execution.state)} ·{" "}
                                    {task.attention.reason}
                                  </small>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {project.attentionWork.coverage === "partial" ? (
                          <p className="reference-attention-work__limit">
                            {project.attentionWork.limitation}
                          </p>
                        ) : null}
                      </>
                    )}
                  </aside>
                </details>
              )}
            </aside>

            <div
              className="reference-agent-resize"
              role="separator"
              aria-label="Resize Agent and Workspace"
              aria-orientation="vertical"
              aria-controls="project-agent project-workspace"
              aria-valuemin={30}
              aria-valuemax={40}
              aria-valuenow={agentWidth}
              aria-valuetext={`Agent ${agentWidth} percent, Workspace ${100 - agentWidth} percent`}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  setAgentWidth((current) =>
                    boundedAgentWidth(
                      current + (event.key === "ArrowRight" ? 2 : -2),
                    ),
                  );
                } else if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  setAgentWidth(event.key === "Home" ? 30 : 40);
                }
              }}
              onPointerDown={(event) => {
                resizingAgent.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                resizeAgentTo(event.clientX);
              }}
              onPointerMove={(event) => {
                if (resizingAgent.current) resizeAgentTo(event.clientX);
              }}
              onPointerUp={(event) => {
                resizingAgent.current = false;
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                resizingAgent.current = false;
              }}
            />

            <WorkspaceDraftProvider key={project.id}>
              <WorkspaceHost
                navigation={workspaceNavigation}
                project={project}
                place={currentPlace}
                {...(nativeGraph === undefined ? {} : { nativeGraph })}
              >
                <CopilotWorkspaceBody>
                  <Outlet
                    context={{ project } satisfies ProjectOutletContext}
                  />
                </CopilotWorkspaceBody>
              </WorkspaceHost>
            </WorkspaceDraftProvider>
          </div>
        </AgentControlPlaneProvider>
      </CopilotWorkspaceProvider>
    </div>
  );
};

export const InspectRoute = (): React.JSX.Element => (
  <InspectWorkspace project={useProjectRecord()} />
);

const SurfaceHeading = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}): React.JSX.Element => (
  <header className="reference-surface-heading">
    <div>
      <p className="reference-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="reference-lede">{description}</p>
    </div>
    {actions === undefined ? null : (
      <div className="reference-surface-actions">{actions}</div>
    )}
  </header>
);

const plainLabel = (value: string): string => value.replaceAll("_", " ");

const presentationLabel = (value: string): string =>
  plainLabel(value).replace(/^./u, (character) =>
    character.toLocaleUpperCase(),
  );

const SuggestedActionStateLabel = ({
  action,
}: {
  action: PetraSuggestedActionView;
}): React.JSX.Element => {
  const readiness = action.content.readiness;
  return (
    <span className="reference-status" data-state={readiness.state}>
      <span aria-hidden="true" className="reference-status__symbol">
        {readiness.state === "ready" ? "✓" : "!"}
      </span>
      {readiness.state === "ready" ? "Ready" : "Stale"}
    </span>
  );
};

export const SuggestedActionPreview = ({
  actionView,
  workActionView,
  invokedInquiry,
}: {
  actionView: PetraSuggestedActionView;
  workActionView?: PetraSuggestedActionViewV11;
  invokedInquiry?: PetraProjectInquiryView;
}): React.JSX.Element => {
  const {
    action_ref: actionRef,
    action,
    readiness,
    authority,
  } = actionView.content;
  const { basis, expected_result: expectedResult, invocation } = action;
  const invokedDetail =
    invokedInquiry?.content.view_kind === "detail"
      ? invokedInquiry.content
      : undefined;
  const invokedResult = invokedDetail?.result_links.find(
    ({ link_ref: linkRef }) =>
      linkRef.project_inquiry_link_id ===
      basis.inquiry_result_link_ref.project_inquiry_link_id,
  );
  const invocationQuery = new URLSearchParams({
    inquiry_result_link_id:
      basis.inquiry_result_link_ref.project_inquiry_link_id,
    invoke: invocation.operation,
  });
  const invocationHref = `?${invocationQuery}#suggested-action-result`;
  const noWorkConsequence = `Duration ${plainLabel(action.resources.duration)} · cost ${plainLabel(action.resources.cost)} · interrupt ${plainLabel(action.interrupt.expectation)} · cancellation ${plainLabel(action.cancellation.consequence)}`;

  return (
    <section
      className="reference-section reference-suggested-action"
      aria-labelledby="suggested-action-title"
    >
      <div className="reference-section__heading">
        <div>
          <p className="reference-panel-kicker">Next steps</p>
          <h2 id="suggested-action-title">Suggested action</h2>
        </div>
        <SuggestedActionStateLabel action={actionView} />
      </div>

      <article className="reference-suggested-action__preview">
        <header>
          <p className="reference-contract-label">Read-only preview</p>
          <h3>{action.title}</h3>
          <p>{action.reason}</p>
        </header>

        <dl className="reference-suggested-action__summary">
          <div>
            <dt>Objective</dt>
            <dd>{action.objective.statement}</dd>
          </div>
          <div>
            <dt>Current readiness</dt>
            <dd>
              <strong>{presentationLabel(readiness.reason_code)}</strong>
              <span>{readiness.reason}</span>
            </dd>
          </div>
          <div>
            <dt>Exact scope</dt>
            <dd>{action.scope.included}</dd>
          </div>
          <div>
            <dt>Result and authority</dt>
            <dd>
              Existing {plainLabel(expectedResult.result_kind)} · authority
              effect {expectedResult.authority_effect} · reusable{" "}
              {expectedResult.reusable ? "yes" : "no"}
            </dd>
          </div>
        </dl>

        {readiness.missing_prerequisites.length === 0 ? null : (
          <div className="reference-suggested-action__prerequisites">
            <strong>Required before this action can be used</strong>
            <ul>
              {readiness.missing_prerequisites.map((prerequisite) => (
                <li key={prerequisite}>{prerequisite}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="reference-suggested-action__boundary">
          <strong>No new Work or Project authority change</strong>
          <p>
            {presentationLabel(actionView.content.operation.state)}
            {" · Work "}
            {plainLabel(actionView.content.operation.work_start)}
            {" · authority change "}
            {actionView.content.operation.authority_change}. {noWorkConsequence}
            .
          </p>
          <p>
            Capability <code>{action.capability.capability_key}</code> is{" "}
            {plainLabel(action.capability.grant_status)}; approval is{" "}
            {plainLabel(action.capability.approval)}.
          </p>
        </div>

        <details className="reference-suggested-action__scope">
          <summary>Scope, omissions, and limitations</summary>
          <strong>Excluded</strong>
          <ul>
            {action.scope.excluded.map((exclusion) => (
              <li key={exclusion}>{exclusion}</li>
            ))}
          </ul>
          {action.missing_information.length === 0 ? null : (
            <>
              <strong>Missing information</strong>
              <ul>
                {action.missing_information.map((missing) => (
                  <li key={missing}>{missing}</li>
                ))}
              </ul>
            </>
          )}
          <strong>Contract limitations</strong>
          <ul>
            {actionView.content.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>

        <details className="reference-suggested-action__identity">
          <summary>Exact action and authority basis</summary>
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
              <dt>ProjectDefinition</dt>
              <dd>
                <code>
                  {basis.project_definition_ref.project_definition_id}
                </code>{" "}
                · revision {basis.project_definition_ref.revision} ·{" "}
                {basis.project_definition_ref.definition_family}
                <span>
                  Content hash {basis.project_definition_ref.content_hash}
                </span>
                <span>
                  Record hash {basis.project_definition_ref.record_hash}
                </span>
              </dd>
            </div>
            <div>
              <dt>Objective</dt>
              <dd>
                <code>{action.objective.objective_ref.objective_id}</code> ·
                revision {action.objective.objective_ref.revision} ·{" "}
                {action.objective.semantic_key}
                <span>
                  Content hash {action.objective.objective_ref.content_hash}
                </span>
                <span>
                  Record hash {action.objective.objective_ref.record_hash}
                </span>
              </dd>
            </div>
            <div>
              <dt>Inquiry-result link</dt>
              <dd>
                <code>
                  {basis.inquiry_result_link_ref.project_inquiry_link_id}
                </code>
                <span>
                  Content hash {basis.inquiry_result_link_ref.content_hash}
                </span>
                <span>
                  Record hash {basis.inquiry_result_link_ref.record_hash}
                </span>
              </dd>
            </div>
            <div>
              <dt>GroundedResponse</dt>
              <dd>
                <code>{basis.result_ref.record_id}</code> · revision{" "}
                {basis.result_ref.revision} · {basis.result_ref.schema_name}@
                {basis.result_ref.schema_version}
                <span>Content hash {basis.result_ref.content_hash}</span>
                <span>Record hash {basis.result_ref.record_hash}</span>
              </dd>
            </div>
            <div>
              <dt>Snapshot</dt>
              <dd>
                <code>{basis.snapshot_ref.snapshot_id}</code> · revision{" "}
                {basis.snapshot_ref.snapshot_revision} · authority event{" "}
                {basis.snapshot_ref.event_position}
                <span>Content hash {basis.snapshot_ref.content_hash}</span>
              </dd>
            </div>
            <div>
              <dt>Declared Work basis</dt>
              <dd>
                {basis.produced_by_work_ref === undefined ? (
                  plainLabel(action.background_work.state)
                ) : (
                  <>
                    <code>{basis.produced_by_work_ref.work_unit_id}</code> ·
                    revision {basis.produced_by_work_ref.revision}
                    <span>
                      Spec hash {basis.produced_by_work_ref.spec_hash}
                    </span>
                    <span>
                      Record hash {basis.produced_by_work_ref.record_hash}
                    </span>
                    {action.background_work.state === "completed" ? (
                      <span>
                        Server state: completed ·{" "}
                        {plainLabel(action.background_work.terminal_outcome)}
                      </span>
                    ) : null}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Read authority</dt>
              <dd>
                {presentationLabel(authority.isolation)} · event{" "}
                {authority.event_position} · stream revision{" "}
                {authority.stream_revision}
                <span>
                  View hash {actionView.content_hash} · read{" "}
                  {actionView.read_at}
                </span>
              </dd>
            </div>
            <div>
              <dt>Typed invocation</dt>
              <dd>
                <code>
                  {invocation.contract_name}@{invocation.contract_version}
                </code>{" "}
                · {invocation.operation} · {invocation.place_role} ·{" "}
                {invocation.task_intent} · {invocation.idempotency}
              </dd>
            </div>
          </dl>
        </details>

        <div className="reference-suggested-action__actions">
          {readiness.state === "ready" ? (
            <Link
              className="reference-primary-link"
              to={invocationHref}
              data-contract-name={invocation.contract_name}
              data-contract-version={invocation.contract_version}
              data-operation={invocation.operation}
            >
              Inspect existing inquiry result
            </Link>
          ) : (
            <PetraButton
              variant="primary"
              unavailable={{
                reason: readiness.reason,
                prerequisite: readiness.missing_prerequisites.join(" "),
              }}
            >
              Inspect existing inquiry result
            </PetraButton>
          )}
          <span>
            This invokes an authenticated exact read. It does not start Work.
          </span>
        </div>

        {invokedDetail === undefined || invokedResult === undefined ? null : (
          <article
            className="reference-suggested-action__result"
            id="suggested-action-result"
            tabIndex={-1}
            aria-labelledby="suggested-action-result-title"
          >
            <p className="reference-panel-kicker">Exact inquiry detail</p>
            <h3 id="suggested-action-result-title">
              {invokedDetail.summary.current_framing}
            </h3>
            <p>
              Authored status {invokedDetail.summary.authored_status}. Work and
              result state do not change that authored status.
            </p>
            <dl>
              <div>
                <dt>Linked result</dt>
                <dd>
                  <code>{invokedResult.result_ref.record_id}</code> · revision{" "}
                  {invokedResult.result_ref.revision}
                </dd>
              </div>
              <div>
                <dt>Authority statement</dt>
                <dd>{invokedResult.authority_statement}</dd>
              </div>
              <div>
                <dt>Current understanding</dt>
                <dd>{invokedDetail.current_understanding.reason}</dd>
              </div>
              <div>
                <dt>Admissible basis</dt>
                <dd>{invokedDetail.basis.reason}</dd>
              </div>
            </dl>
          </article>
        )}
      </article>
      {workActionView === undefined ? null : (
        <SuggestedWorkAction
          projectId={actionView.project_id}
          actionView={workActionView}
          presentationPath="direct"
        />
      )}
    </section>
  );
};

export const BriefSurface = ({
  project,
  suggestedAction,
  suggestedWorkAction,
  invokedInquiry,
}: {
  project: ProjectRecord;
  suggestedAction?: PetraSuggestedActionView;
  suggestedWorkAction?: PetraSuggestedActionViewV11;
  invokedInquiry?: PetraProjectInquiryView;
}) => {
  const profileTool = getProjectProfileTool(project.id);

  return (
    <main className="reference-surface" id="reference-main">
      <SurfaceHeading
        eyebrow="Brief · current Project"
        title={project.title}
        description={project.objective}
        actions={<ProjectStateLabel project={project} />}
      />

      {project.projection.state === "current" ? null : (
        <section
          className="reference-notice"
          aria-labelledby="projection-notice-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            ↻
          </span>
          <div>
            <h2 id="projection-notice-title">{project.projection.label}</h2>
            <p>{project.projection.detail}</p>
          </div>
        </section>
      )}

      <div className="reference-brief-grid">
        <section
          className="reference-panel reference-focus"
          aria-labelledby="current-focus-title"
        >
          <div className="reference-panel__heading">
            <div>
              <p className="reference-panel-kicker">{project.focus.label}</p>
              <h2 id="current-focus-title">{project.focus.value}</h2>
            </div>
            <span>{project.snapshot.label}</span>
          </div>
          <p>{project.focus.summary}</p>
          <div className="reference-baseline">
            <strong>Change from baseline</strong>
            <p>{project.baselineChange}</p>
          </div>
        </section>

        <aside
          className="reference-panel reference-project-profile"
          aria-labelledby="profile-title"
        >
          <p className="reference-panel-kicker">Project definition</p>
          <h2 id="profile-title">{project.profile.label}</h2>
          <p>{project.profile.description}</p>
          <span className="reference-contract-label">
            {project.profile.compatibility}
          </span>
          {profileTool === undefined ? null : (
            <Link
              className="reference-text-link reference-profile-tool-link"
              to={`/projects/${project.id}/tools/${profileTool.id}`}
            >
              Open {profileTool.label}
            </Link>
          )}
        </aside>
      </div>

      <section className="reference-section" aria-labelledby="attention-title">
        <div className="reference-section__heading">
          <div>
            <p className="reference-panel-kicker">Material status</p>
            <h2 id="attention-title">Attention</h2>
          </div>
          <span>{project.attention.length}</span>
        </div>

        {project.attention.length === 0 ? (
          <div className="reference-inline-empty">
            <strong>No item needs attention</strong>
            <p>Continue from the current focus or inspect its basis.</p>
          </div>
        ) : (
          <ol className="reference-attention-list">
            {project.attention.map((item) => (
              <li key={item.id}>
                <article
                  className="reference-attention"
                  id={item.id}
                  tabIndex={-1}
                >
                  <div className="reference-attention__heading">
                    <span aria-hidden="true">!</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                    </div>
                  </div>
                  <dl className="reference-consequence">
                    <div>
                      <dt>Why it matters</dt>
                      <dd>{item.consequence}</dd>
                    </div>
                    <div>
                      <dt>Petra recommends</dt>
                      <dd>
                        <strong>{item.recommendation}</strong>
                        <span>{item.rationale}</span>
                      </dd>
                    </div>
                  </dl>
                  <div className="reference-attention__actions">
                    {item.sourceId === undefined ? null : (
                      <>
                        <Link
                          className="reference-primary-link"
                          to={`/projects/${project.id}/sources/${item.sourceId}?from=brief`}
                        >
                          Inspect source and limitation
                        </Link>
                        <Link
                          className="reference-text-link"
                          to={`/projects/${project.id}/work/work-process-maintenance#required-input`}
                        >
                          Open related Work
                        </Link>
                      </>
                    )}
                    <details>
                      <summary>Other valid next steps</summary>
                      <ul>
                        {item.alternatives.map((alternative) => (
                          <li key={alternative}>{alternative}</li>
                        ))}
                      </ul>
                      <p>
                        Choosing another branch does not change or dismiss this
                        recommendation.
                      </p>
                    </details>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      {suggestedAction === undefined ? null : (
        <AgentControlPortal
          title="Proposed next action"
          description="Review the proposed action here. Its progress and result open in the Workspace."
          operationIds={["brief.suggested-preview", "brief.suggested-invoke"]}
          objectRef={suggestedAction.content.action_ref.suggested_action_id}
        >
          <SuggestedActionPreview
            actionView={suggestedAction}
            {...(suggestedWorkAction === undefined
              ? {}
              : { workActionView: suggestedWorkAction })}
            {...(invokedInquiry === undefined ? {} : { invokedInquiry })}
          />
        </AgentControlPortal>
      )}

      <section className="reference-section" aria-labelledby="decisions-title">
        <div className="reference-section__heading">
          <div>
            <p className="reference-panel-kicker">Recent change</p>
            <h2 id="decisions-title">Recent decisions</h2>
          </div>
        </div>
        <ol className="reference-decision-list">
          {project.recentDecisions.map((decision) => (
            <li key={decision}>{decision}</li>
          ))}
        </ol>
      </section>
    </main>
  );
};

export const ProjectResumeOutcome = ({
  project,
  outcome,
}: {
  project: ProjectRecord;
  outcome: string;
}): React.JSX.Element => {
  const resume = project.resume;
  const readFailure = ["read-failed", "read-stale", "selection-stale"].includes(
    outcome,
  );
  const returnUnavailable = outcome === "return-unavailable";
  if (resume === undefined) {
    return (
      <section
        className="project-resume-outcome"
        id="project-resume-outcome"
        data-resume-state="unavailable"
        tabIndex={-1}
        aria-labelledby="project-resume-outcome-title"
      >
        <p className="reference-panel-kicker">Project resume</p>
        <h2 id="project-resume-outcome-title">Resume is not installed</h2>
        <p>
          This Project read does not include a server-owned resume assessment.
          The current Brief remains available.
        </p>
      </section>
    );
  }
  const retry = resume.state === "unavailable" || readFailure;
  const title = returnUnavailable
    ? "The exact return is unavailable"
    : readFailure
      ? "The retained task needs a fresh read"
      : resume.state === "available"
        ? "The retained task is ready now"
        : resume.state === "stale"
          ? "Review the current Brief before continuing"
          : resume.state === "not_found"
            ? "No retained task is available"
            : "Resume is temporarily unavailable";
  const message = returnUnavailable
    ? resume.retained_task?.return_destination.state === "unavailable"
      ? resume.retained_task.return_destination.reason
      : "The retained task no longer has an exact available return destination."
    : readFailure
      ? "Petra did not open a Graph result that still matched the retained task, expected result, and selection. No identity was rebuilt in the browser."
      : resume.state === "available"
        ? resume.recovery.reason
        : (resume.failure?.message ?? resume.recovery.reason);
  return (
    <section
      className="project-resume-outcome"
      id="project-resume-outcome"
      data-resume-state={readFailure ? "unavailable" : resume.state}
      tabIndex={-1}
      aria-labelledby="project-resume-outcome-title"
      role={retry ? "alert" : "status"}
    >
      <p className="reference-panel-kicker">Project resume</p>
      <h2 id="project-resume-outcome-title">{title}</h2>
      <p>{message}</p>
      <p>{resume.recovery.reason}</p>
      {resume.retained_task === undefined ? null : (
        <details>
          <summary>Retained context</summary>
          <dl className="reference-detail-list">
            <div>
              <dt>Task</dt>
              <dd>{resume.retained_task.label}</dd>
            </div>
            <div>
              <dt>Origin</dt>
              <dd>{resume.retained_task.origin.origin_kind}</dd>
            </div>
            <div>
              <dt>Retained</dt>
              <dd>{resume.retained_task.retained_at}</dd>
            </div>
          </dl>
        </details>
      )}
      <div className="project-resume-outcome__actions">
        {retry || (resume.state === "available" && !returnUnavailable) ? (
          <Link
            className="reference-primary-link"
            to={`/projects/${project.id}/resume`}
          >
            {retry ? "Retry Project resume" : "Resume Project"}
          </Link>
        ) : (
          <a className="reference-primary-link" href="#brief-focus">
            Continue in current Brief
          </a>
        )}
        <span>{resume.recovery.destination.purpose}</span>
      </div>
    </section>
  );
};

export const BriefRoute = (): React.JSX.Element => {
  const data = useLoaderData<ProjectBriefData>();
  const project = useProjectRecord();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resumeOutcome = searchParams.get("projectResume");
  if (data.profileStartingBrief !== undefined) {
    return (
      <main
        className="reference-surface live-project-brief"
        id="reference-main"
      >
        <header className="brief-heading">
          <div>
            <p className="reference-eyebrow">{project.title}</p>
            <h1>Brief</h1>
            <p className="reference-lede">
              Start from this Project’s current objective and definition.
            </p>
          </div>
        </header>
        <div className="brief-position" aria-label="Current Brief position">
          <span>{project.profile.label}</span>
          <span data-state="partial">Definition starting state</span>
        </div>
        <section
          className="brief-section brief-focus"
          aria-labelledby="brief-focus"
        >
          <p className="reference-panel-kicker">Orientation</p>
          <h2 id="brief-focus" tabIndex={-1}>
            Current {project.profile.terms.focus.toLocaleLowerCase()}
          </h2>
          <p className="brief-focus__statement">{project.objective}</p>
          <p>
            This Project definition does not supply composed outcome sections
            for this starting state. Petra has not inferred missing sections or
            actions.
          </p>
          <div className="reference-surface-actions">
            <Link
              className="reference-primary-link"
              to={`/projects/${project.id}/profile`}
            >
              Inspect Project definition
            </Link>
          </div>
          <details className="brief-technical">
            <summary>Why composed Brief sections are unavailable</summary>
            <p>{data.profileStartingBrief.limitation}</p>
            <dl>
              <div>
                <dt>Project revision</dt>
                <dd>{data.profileStartingBrief.projectRef.revision}</dd>
              </div>
              <div>
                <dt>Project definition revision</dt>
                <dd>
                  {data.profileStartingBrief.projectDefinitionRef.revision}
                </dd>
              </div>
              <div>
                <dt>Focus revision</dt>
                <dd>{data.profileStartingBrief.objectiveRef.revision}</dd>
              </div>
            </dl>
          </details>
        </section>
      </main>
    );
  }
  if (data.objectiveCommandContext === undefined)
    throw new Error("The reviewed Project Objective boundary is unavailable.");
  const state = location.state as {
    objectiveCommandOutcome?: ProjectObjectiveReturnOutcome;
    agentObjectiveDraft?: unknown;
  } | null;
  const objectiveCommandOutcome = state?.objectiveCommandOutcome;
  const objectiveSuggestion =
    typeof state?.agentObjectiveDraft === "string" &&
    state.agentObjectiveDraft.trim().length > 0 &&
    state.agentObjectiveDraft.length <= 4_000
      ? state.agentObjectiveDraft
      : undefined;
  if (data.briefView === undefined) {
    return (
      <ProjectObjectiveEmptyBrief
        context={data.objectiveCommandContext}
        {...(objectiveSuggestion === undefined
          ? {}
          : { suggestedStatement: objectiveSuggestion })}
        {...(objectiveCommandOutcome === undefined
          ? {}
          : { outcome: objectiveCommandOutcome })}
      />
    );
  }
  return (
    <ProjectBriefSurface
      view={data.briefView}
      objectiveCommandContext={data.objectiveCommandContext}
      {...(objectiveSuggestion === undefined ? {} : { objectiveSuggestion })}
      {...(data.comparisonRecovery === undefined
        ? {}
        : { comparisonRecovery: data.comparisonRecovery })}
      {...(objectiveCommandOutcome === undefined
        ? {}
        : { objectiveCommandOutcome })}
      {...(resumeOutcome === null
        ? {}
        : {
            resumeOutcome: (
              <ProjectResumeOutcome project={project} outcome={resumeOutcome} />
            ),
          })}
      {...(data.suggestedAction !== undefined
        ? {
            selectedAction: (
              <AgentControlPortal
                title="Proposed next action"
                description="Review the proposed action here. Its progress and result open in the Workspace."
                operationIds={[
                  "brief.suggested-preview",
                  "brief.suggested-invoke",
                  "work.start",
                ]}
                objectRef={
                  data.suggestedAction.content.action_ref.suggested_action_id
                }
              >
                <SuggestedActionPreview
                  actionView={data.suggestedAction}
                  {...(data.suggestedWorkAction === undefined
                    ? {}
                    : { workActionView: data.suggestedWorkAction })}
                  {...(data.invokedInquiry === undefined
                    ? {}
                    : { invokedInquiry: data.invokedInquiry })}
                />
              </AgentControlPortal>
            ),
          }
        : data.suggestedWorkAction !== undefined
          ? {
              selectedAction: (
                <AgentControlPortal
                  title="Start proposed Work"
                  description="Start this proposed action here. Its progress and result open in the Workspace."
                  operationIds={["work.start"]}
                  objectRef={
                    data.suggestedWorkAction.content.action_ref
                      .suggested_action_id
                  }
                >
                  <SuggestedWorkAction
                    projectId={data.suggestedWorkAction.project_id}
                    actionView={data.suggestedWorkAction}
                    presentationPath="direct"
                  />
                </AgentControlPortal>
              ),
            }
          : {})}
    />
  );
};

const sourceSearchText = (source: SourceRecord): string =>
  `${source.title} ${source.kind} ${source.role} ${source.creator}`.toLocaleLowerCase();

const sourceInspectionPath = (
  sourceId: string,
  sourceQuery: string,
): string => {
  const query = new URLSearchParams({ from: "sources" });
  if (sourceQuery.trim().length > 0) query.set("sourceQuery", sourceQuery);
  return `${encodeURIComponent(sourceId)}?${query}`;
};

export const SourcesSurface = ({
  project,
  registration,
  initialQuery = "",
  onSourceReuseComplete,
  initialFiles = [],
  onInitialFileRegistered,
}: {
  project: ProjectRecord;
  registration?: ProjectSourceCollectionData["registration"];
  initialQuery?: string;
  onSourceReuseComplete?: (
    completion: SourceReuseCompletion,
    sourceQuery: string,
  ) => void | Promise<void>;
  initialFiles?: readonly File[];
  onInitialFileRegistered?: () => void | Promise<void>;
}) => {
  const [query, setQuery] = useWorkspaceDraftState(
    `source-collection:${project.id}:query`,
    initialQuery,
  );
  const [pendingInitialFiles, setPendingInitialFiles] = useWorkspaceDraftState<
    File[]
  >(`source-collection:${project.id}:initial-files`, () => [...initialFiles]);
  const [adding, setAdding] = useWorkspaceDraftState(
    `source-collection:${project.id}:adding`,
    initialFiles.length > 0,
  );
  const [reusing, setReusing] = useWorkspaceDraftState(
    `source-collection:${project.id}:reusing`,
    false,
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const sources = project.sources.filter((source) =>
    sourceSearchText(source).includes(normalizedQuery),
  );

  return (
    <main className="reference-surface" id="reference-main">
      <SurfaceHeading
        eyebrow={`${project.profile.terms.referencePlural} · current Project`}
        title={project.profile.terms.referencePlural}
        description={`Inspect identity, available content, rights, and downstream use for this Project's ${project.profile.terms.referencePlural.toLocaleLowerCase()}.`}
      />

      <AgentControlPortal
        title={`Find or add ${project.profile.terms.referencePlural.toLocaleLowerCase()}`}
        description="Search this Project’s source collection or start reviewed intake and reuse. Source details stay in the Workspace."
        operationIds={["source.find", "source.register", "source.reuse"]}
        objectRef={project.id}
      >
        <PetraTextField
          label={`Find ${project.profile.terms.referencePlural}`}
          placeholder="Title, kind, role, or creator"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <div className="reference-source-actions">
          <PetraButton
            variant="primary"
            onClick={() => {
              setPendingInitialFiles([]);
              setReusing(false);
              setAdding(true);
            }}
            {...(registration === undefined ||
            registration.sourceRoles.length === 0
              ? {
                  unavailable: {
                    reason: `This Project definition has no available registered ${project.profile.terms.reference.toLocaleLowerCase()} role.`,
                    prerequisite:
                      "A current registered source role with copy-rights governance.",
                  },
                }
              : {})}
          >
            Add {project.profile.terms.reference}
          </PetraButton>
          <PetraButton
            variant="secondary"
            onClick={() => {
              setAdding(false);
              setReusing(true);
            }}
          >
            Use existing {project.profile.terms.reference.toLocaleLowerCase()}
          </PetraButton>
        </div>
      </AgentControlPortal>

      {adding && registration !== undefined ? (
        <SourceRegistrationPanel
          key={
            `${registration.projectDefinitionRef.revision}:` +
            (pendingInitialFiles[0] === undefined
              ? "manual-source-registration"
              : `${pendingInitialFiles[0].name}:${pendingInitialFiles[0].size}:${pendingInitialFiles[0].lastModified}`)
          }
          context={registration}
          sourceTerm={project.profile.terms.reference.toLocaleLowerCase()}
          {...(pendingInitialFiles[0] === undefined
            ? {}
            : {
                initialFile: pendingInitialFiles[0],
                onContinue: async () => {
                  await onInitialFileRegistered?.();
                  setPendingInitialFiles((current) => current.slice(1));
                  if (pendingInitialFiles.length <= 1) setAdding(false);
                },
              })}
          onCancel={() => {
            setPendingInitialFiles([]);
            setAdding(false);
          }}
        />
      ) : null}

      {reusing ? (
        <SourceReusePanel
          projectId={project.id}
          sourceTerm={project.profile.terms.reference.toLocaleLowerCase()}
          sourceQuery={query}
          onCancel={() => setReusing(false)}
          onComplete={(completion) =>
            onSourceReuseComplete?.(completion, query)
          }
        />
      ) : null}

      <div className="reference-source-toolbar" id="source-reuse-return">
        {query.trim() === "" ? null : <span>Filtered by “{query}”</span>}
        <p role="status" aria-live="polite">
          {sources.length} of {project.sources.length}
        </p>
      </div>

      {project.sources.length === 0 ? (
        <section
          className="reference-empty"
          aria-labelledby="sources-empty-title"
        >
          <PetraMark />
          <h2 id="sources-empty-title">
            No {project.profile.terms.referencePlural.toLocaleLowerCase()} yet
          </h2>
          <p>
            This early Project has no registered basis. Add one by reviewing its
            identity, exact copy rights, and registered Project role.
          </p>
        </section>
      ) : sources.length === 0 ? (
        <section
          className="reference-inline-empty"
          aria-labelledby="sources-filter-empty"
        >
          <h2 id="sources-filter-empty">
            No matching{" "}
            {project.profile.terms.referencePlural.toLocaleLowerCase()}
          </h2>
          <p>Clear the search to restore the complete Project collection.</p>
        </section>
      ) : (
        <ol className="reference-source-list">
          {sources.map((source) => (
            <li key={source.id}>
              <article className="reference-source-row">
                <div className="reference-source-row__identity">
                  <p>{source.kind}</p>
                  <h2>
                    <Link to={sourceInspectionPath(source.id, query)}>
                      {source.title}
                    </Link>
                  </h2>
                  <span>{source.role}</span>
                </div>
                <div className="reference-source-row__coverage">
                  <SourceExtentLabel source={source} />
                  <span>{source.location}</span>
                </div>
                <dl className="reference-source-row__facts">
                  <div>
                    <dt>Revision</dt>
                    <dd>{source.revision}</dd>
                  </div>
                  <div>
                    <dt>Rights</dt>
                    <dd>{source.rights}</dd>
                  </div>
                </dl>
                <Link
                  className="reference-text-link"
                  to={sourceInspectionPath(source.id, query)}
                >
                  Inspect{" "}
                  <span className="visually-hidden">{source.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
};

export const SourcesRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectSourceCollectionData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialFiles =
    typeof location.state === "object" &&
    location.state !== null &&
    Array.isArray(Reflect.get(location.state, "initialSourceFiles"))
      ? (Reflect.get(location.state, "initialSourceFiles") as unknown[]).filter(
          (value): value is File => value instanceof File,
        )
      : [];
  return (
    <SourcesSurface
      project={{ ...project, sources: data.sources }}
      registration={data.registration}
      initialQuery={searchParams.get("query") ?? ""}
      initialFiles={initialFiles}
      onInitialFileRegistered={() => revalidator.revalidate()}
      onSourceReuseComplete={async (completion, sourceQuery) => {
        await revalidator.revalidate();
        const destinationQuery = new URLSearchParams({
          from: "sources",
        });
        if (sourceQuery.trim().length > 0) {
          destinationQuery.set("sourceQuery", sourceQuery);
        }
        await navigate(
          `/projects/${encodeURIComponent(completion.projectId)}/sources/${encodeURIComponent(completion.projectSourceId)}?${destinationQuery}`,
        );
      }}
    />
  );
};

export const SourceDetails = ({
  projectId,
  source,
  taskReturnPath,
  linkRemovalAvailable = true,
  linkRemovalClient,
  localCopyDeletionClient,
  onLinkRemoved,
  onLocalCopyDeleted,
}: {
  projectId: string;
  source: SourceRecord;
  taskReturnPath: string;
  linkRemovalAvailable?: boolean;
  linkRemovalClient?: SourceLinkRemovalClient;
  localCopyDeletionClient?: SourceLocalCopyDeletionClient;
  onLinkRemoved?: () => void | Promise<void>;
  onLocalCopyDeleted?: () => void | Promise<void>;
}) => (
  <aside className="reference-details" aria-labelledby="source-details-title">
    <div className="reference-details__heading">
      <div>
        <p className="reference-panel-kicker">Selected object</p>
        <h2 id="source-details-title">Details</h2>
      </div>
      <SourceExtentLabel source={source} />
    </div>
    <dl className="reference-detail-list">
      <div>
        <dt>Revision</dt>
        <dd>{source.revision}</dd>
      </div>
      <div>
        <dt>Creator</dt>
        <dd>{source.creator}</dd>
      </div>
      <div>
        <dt>Rights</dt>
        <dd>{source.rights}</dd>
      </div>
      <div>
        <dt>Project role</dt>
        <dd>{source.role}</dd>
      </div>
      <div>
        <dt>Downstream use</dt>
        <dd>{source.downstreamUse}</dd>
      </div>
    </dl>
    <details className="reference-source-record-details">
      <summary>Record and copy identity</summary>
      <dl className="reference-detail-list">
        <div>
          <dt>Identity</dt>
          <dd>
            <code>{source.id}</code>
          </dd>
        </div>
        <div>
          <dt>Copy</dt>
          <dd>{source.copy}</dd>
        </div>
      </dl>
    </details>
    <SourceLinkRemovalActions
      projectId={projectId}
      projectSourceId={source.id}
      sourceTitle={source.title}
      sourceRole={source.role}
      {...(source.roleId === undefined ? {} : { sourceRoleId: source.roleId })}
      taskReturnPath={taskReturnPath}
      available={linkRemovalAvailable}
      {...(linkRemovalClient === undefined
        ? {}
        : { client: linkRemovalClient })}
      {...(localCopyDeletionClient === undefined
        ? {}
        : { localCopyDeletionClient })}
      {...(onLinkRemoved === undefined ? {} : { onRemoved: onLinkRemoved })}
      {...(onLocalCopyDeleted === undefined ? {} : { onLocalCopyDeleted })}
    />
  </aside>
);

export const SourceReaderSurface = ({
  project,
  source,
  returnTo,
  taskReturnPath,
  revision,
  revisionUnavailable,
  linkRemovalAvailable = true,
  linkRemovalClient,
  localCopyDeletionClient,
  onLinkRemoved,
  onLocalCopyDeleted,
}: {
  project: ProjectRecord;
  source: SourceRecord;
  returnTo?: { path: string; label: string } | undefined;
  taskReturnPath?: string;
  revision?: SourceRevisionContext;
  revisionUnavailable?: string;
  linkRemovalAvailable?: boolean;
  linkRemovalClient?: SourceLinkRemovalClient;
  localCopyDeletionClient?: SourceLocalCopyDeletionClient;
  onLinkRemoved?: () => void | Promise<void>;
  onLocalCopyDeleted?: () => void | Promise<void>;
}) => {
  const [addingRevision, setAddingRevision] = useState(false);
  const returnPath = returnTo?.path ?? `/projects/${project.id}/sources`;
  const returnLabel =
    returnTo?.label ?? `Return to ${project.profile.terms.referencePlural}`;
  const exactTaskReturn =
    taskReturnPath ??
    `/projects/${encodeURIComponent(project.id)}/sources/${encodeURIComponent(source.id)}`;

  return (
    <main className="reference-reader" id="reference-main">
      <header className="reference-reader-heading">
        <Link className="reference-context-back" to={returnPath}>
          <span aria-hidden="true">←</span> {returnLabel}
        </Link>
        <p className="reference-eyebrow">
          {source.kind} · {source.revision}
        </p>
        <h1>{source.title}</h1>
        <p className="reference-lede">{source.role}</p>
        <div className="reference-reader-heading__state">
          <SourceExtentLabel source={source} />
          <span>{source.location}</span>
          <PetraButton
            variant="secondary"
            onClick={() => setAddingRevision(true)}
            {...(revision === undefined
              ? {
                  unavailable: {
                    reason:
                      revisionUnavailable ??
                      "The exact active predecessor is unavailable.",
                    prerequisite:
                      "A current Project, ProjectDefinition, and active Project source reference.",
                  },
                }
              : {})}
          >
            Add new version
          </PetraButton>
        </div>
      </header>

      {addingRevision && revision !== undefined ? (
        <SourceRevisionPanel
          key={`${revision.currentSourceRef.project_source_id}:${revision.currentSourceRef.revision}`}
          context={revision}
          sourceTitle={source.title}
          sourceRevision={source.revision}
          taskReturnPath={exactTaskReturn}
          onCancel={() => setAddingRevision(false)}
        />
      ) : null}

      <div className="reference-reader-layout">
        <article
          className="reference-document"
          aria-labelledby="source-content-title"
        >
          <div className="reference-document__heading">
            <div>
              <p className="reference-panel-kicker">Available content</p>
              <h2 id="source-content-title">
                {source.excerpt?.heading ?? "Content unavailable"}
              </h2>
            </div>
            <span>{source.excerpt?.locator ?? source.location}</span>
          </div>

          {source.excerpt === undefined ? (
            <section
              className="reference-unavailable"
              aria-labelledby="content-unavailable-title"
            >
              <span aria-hidden="true">○</span>
              <div>
                <h3 id="content-unavailable-title">
                  Only identity is available
                </h3>
                <p>{source.limitation}</p>
              </div>
            </section>
          ) : (
            <>
              <blockquote>{source.excerpt.text}</blockquote>
              <section
                className="reference-source-context"
                aria-labelledby="source-context-title"
              >
                <h3 id="source-context-title">Location and context</h3>
                <p>{source.excerpt.context}</p>
              </section>
              {source.limitation === undefined ? null : (
                <section
                  className="reference-limitation"
                  aria-labelledby="source-limitation-title"
                >
                  <h3 id="source-limitation-title">Coverage limit</h3>
                  <p>{source.limitation}</p>
                </section>
              )}
            </>
          )}
        </article>
        <SourceDetails
          projectId={project.id}
          source={source}
          taskReturnPath={exactTaskReturn}
          linkRemovalAvailable={linkRemovalAvailable}
          {...(linkRemovalClient === undefined ? {} : { linkRemovalClient })}
          {...(localCopyDeletionClient === undefined
            ? {}
            : { localCopyDeletionClient })}
          {...(onLinkRemoved === undefined ? {} : { onLinkRemoved })}
          {...(onLocalCopyDeleted === undefined ? {} : { onLocalCopyDeleted })}
        />
      </div>

      <SourceProcessingPanel
        projectId={project.id}
        projectSourceId={source.id}
        taskReturnPath={exactTaskReturn}
      />

      <footer className="reference-reader-return">
        <p>
          Returning preserves the current Project, snapshot, and source
          selection.
        </p>
        <Link className="reference-primary-link" to={returnPath}>
          {returnLabel}
        </Link>
      </footer>
    </main>
  );
};

export const SourceReaderRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const data = useLoaderData<ProjectSourceRecordData>();
  const source = data.source;
  const location = useLocation();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();
  const returnOrigin = searchParams.get("from");
  const returnSourceQuery = searchParams.get("sourceQuery");
  const returnReviewId = searchParams.get("reviewId");
  const returnBasisId = searchParams.get("basisId");
  const returnGraphNodeId = searchParams.get("graphNodeId");
  const requestedGraphLayer = searchParams.get("graphLayer");
  const returnGraphLayer =
    requestedGraphLayer === "working" || requestedGraphLayer === "historical"
      ? requestedGraphLayer
      : "current";
  const returnTo =
    returnOrigin === "brief"
      ? {
          path: `/projects/${project.id}/brief#attention-source-depth`,
          label: "Return to Attention",
        }
      : returnOrigin === "sources"
        ? {
            path: `/projects/${project.id}/sources${
              returnSourceQuery === null || returnSourceQuery.length === 0
                ? ""
                : `?${new URLSearchParams({ query: returnSourceQuery })}`
            }#source-reuse-return`,
            label: `Return to ${project.profile.terms.referencePlural}`,
          }
        : returnOrigin === "graph" &&
            returnGraphNodeId !== null &&
            returnGraphNodeId.length > 0
          ? {
              path: `/projects/${project.id}/graph?layer=${returnGraphLayer}&selected=${encodeURIComponent(returnGraphNodeId)}#graph-selection`,
              label: "Return to Graph",
            }
          : returnOrigin === "review" &&
              returnReviewId !== null &&
              returnReviewId.length > 0 &&
              returnBasisId !== null &&
              returnBasisId.length > 0
            ? {
                path: `/projects/${encodeURIComponent(project.id)}/review/${encodeURIComponent(returnReviewId)}#basis-${encodeURIComponent(returnBasisId)}`,
                label: "Return to Review",
              }
            : undefined;

  return (
    <SourceReaderSurface
      project={project}
      source={source}
      returnTo={returnTo}
      taskReturnPath={`${location.pathname}${location.search}`}
      linkRemovalAvailable={data.linkRemovalAvailable}
      onLinkRemoved={() => revalidator.revalidate()}
      onLocalCopyDeleted={() => revalidator.revalidate()}
      {...(data.revision === undefined ? {} : { revision: data.revision })}
      {...(data.revisionUnavailable === undefined
        ? {}
        : { revisionUnavailable: data.revisionUnavailable })}
    />
  );
};

export const RouteError = (): React.JSX.Element => {
  const error = useRouteError();
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;
  const permissionLost = status === 401 || status === 403;
  const connectionLost =
    status === 502 || status === 503 || error instanceof TypeError;
  const detail =
    error instanceof Error && error.message.trim() !== ""
      ? error.message
      : permissionLost
        ? "Your current access no longer permits this Project read."
        : connectionLost
          ? "Petra could not confirm the server response."
          : "The current address is missing, malformed, or no longer available.";

  return (
    <main
      className="reference-route-error"
      id="reference-main"
      data-route-error-state={
        permissionLost
          ? "permission_lost"
          : connectionLost
            ? "offline"
            : "unavailable"
      }
    >
      <PetraMark />
      <p className="reference-eyebrow">
        {permissionLost
          ? "Access changed"
          : connectionLost
            ? "Connection unavailable"
            : "Route unavailable"}
      </p>
      <h1>
        {permissionLost
          ? "Petra could not verify your access"
          : connectionLost
            ? "Petra could not reach this place"
            : "Petra could not open this place"}
      </h1>
      <p>{detail}</p>
      <p>
        No Project data was substituted and no task was marked complete. Drafts
        kept in this browser remain available after access or the connection is
        restored.
      </p>
      <div className="reference-route-error__actions">
        <button
          className="reference-primary-link reference-route-error__retry"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try this place again
        </button>
        <Link className="reference-text-link" to="/">
          Return to Projects
        </Link>
      </div>
    </main>
  );
};
