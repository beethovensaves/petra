import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router";

import { PetraLockup, PetraMark } from "../design-system/brand.js";
import { PetraButton, PetraTextField } from "../design-system/primitives.js";
import {
  REFERENCE_PROJECTS,
  getProjectGraph,
  getProjectProfileTool,
  getReferenceReview,
  getReferenceSource,
} from "./fixtures.js";
import type {
  EngineState,
  ProjectPlace,
  ProjectRecord,
  SourceExtent,
  SourceRecord,
} from "./model.js";

const join = (...parts: Array<string | false | undefined>): string =>
  parts.filter(Boolean).join(" ");

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
  const servicesReady = health.ok && health.accepting;

  return (
    <div className="reference-app">
      <a className="reference-skip-link" href="#reference-main">
        Skip to main content
      </a>
      <header className="reference-global-header">
        <Link to="/" className="reference-brand" aria-label="Petra Projects">
          <PetraLockup variant="compact" />
        </Link>
        <p>Private project workbench</p>
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

export const ProjectsSurface = ({
  projects = REFERENCE_PROJECTS,
}: {
  projects?: ProjectRecord[];
}): React.JSX.Element => {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.title} ${project.objective} ${project.profile.label}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, projects],
  );

  return (
    <main className="reference-projects" id="reference-main">
      <section
        className="reference-page-heading"
        aria-labelledby="projects-title"
      >
        <div>
          <p className="reference-eyebrow">Projects</p>
          <h1 id="projects-title">Choose where to continue</h1>
          <p className="reference-lede">
            Each Project keeps its own profile, history, work, and authoritative
            state. Petra stores this workspace locally.
          </p>
        </div>
        <PetraButton
          variant="primary"
          unavailable={{
            reason: "Project creation is unavailable in this workspace.",
            prerequisite: "Project creation capability.",
          }}
        >
          New Project
        </PetraButton>
      </section>

      <PetraTextField
        label="Find a Project"
        placeholder="Name, objective, or profile"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      <p className="reference-result-count" role="status" aria-live="polite">
        {visibleProjects.length}{" "}
        {visibleProjects.length === 1 ? "Project" : "Projects"}
      </p>

      {visibleProjects.length === 0 ? (
        <section
          className="reference-empty"
          aria-labelledby="no-projects-title"
        >
          <PetraMark />
          <h2 id="no-projects-title">No Projects match this search</h2>
          <p>Clear the search to return to the available local Projects.</p>
        </section>
      ) : (
        <ul className="reference-project-grid">
          {visibleProjects.map((project) => (
            <li key={project.id}>
              <article className="reference-project-card">
                <div className="reference-project-card__topline">
                  <span>{project.profile.label}</span>
                  <ProjectStateLabel project={project} />
                </div>
                <h2>
                  <Link to={`/projects/${project.id}/brief`}>
                    {project.title}
                  </Link>
                </h2>
                <p>{project.objective}</p>
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
                  <Link
                    className="reference-text-link"
                    to={`/projects/${project.id}/brief`}
                  >
                    Open Brief <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <aside
        className="reference-disclosure"
        aria-labelledby="profiles-heading"
      >
        <h2 id="profiles-heading">How profiles fit</h2>
        <p>
          Profiles supply compatible domain terms and tasks. Petra continues to
          own navigation, authority, provenance, status, recovery, and history.
        </p>
        <ul>
          {projects.map((project) => (
            <li key={project.profile.id}>
              <strong>{project.profile.label}</strong>:{" "}
              {project.profile.terms.focusPlural},{" "}
              {project.profile.terms.findingPlural}, and{" "}
              {project.profile.terms.referencePlural}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
};

export const ProjectsRoute = (): React.JSX.Element => (
  <ProjectsSurface projects={useLoaderData<ProjectRecord[]>()} />
);

type ProjectOutletContext = { project: ProjectRecord };

export const useProjectRecord = (): ProjectRecord => {
  const context = useOutletContext<ProjectOutletContext>();
  return context.project;
};

const placeFromPath = (pathname: string): ProjectPlace =>
  pathname.includes("/sources")
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

export const ProjectShell = (): React.JSX.Element => {
  const project = useLoaderData<ProjectRecord>();
  const location = useLocation();
  const projectNav = useRef<HTMLElement>(null);
  const currentPlace = placeFromPath(location.pathname);

  useEffect(() => {
    projectNav.current
      ?.querySelector<HTMLElement>('a[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentPlace]);

  return (
    <div className="reference-project-shell">
      <a
        className="reference-skip-link reference-skip-link--project"
        href="#project-navigation"
      >
        Skip to Project navigation
      </a>
      <div
        className="reference-context-bar"
        aria-label="Current Project context"
      >
        <div className="reference-context-bar__identity">
          <Link to="/" className="reference-context-back">
            <span aria-hidden="true">←</span> Projects
          </Link>
          <div>
            <strong>{project.title}</strong>
            <span>{project.profile.label}</span>
          </div>
        </div>
        <div className="reference-context-bar__state">
          <span>
            <strong>{project.snapshot.label}</strong>
            <small>{project.snapshot.asOf}</small>
          </span>
          <ProjectionLabel project={project} />
          <Link className="reference-context-action" to="petra">
            Ask Petra
          </Link>
          <Link
            className="reference-context-action"
            to={`/settings?project=${project.id}`}
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="reference-project-layout">
        <aside className="reference-project-nav" id="project-navigation">
          <p className="reference-nav-label">Project</p>
          <nav ref={projectNav} aria-label={`${project.title} places`}>
            <NavLink to="brief">Brief</NavLink>
            <NavLink to="sources">
              {project.profile.terms.referencePlural}
            </NavLink>
            <NavLink to="review">Review</NavLink>
            <NavLink to="graph">Graph</NavLink>
            <NavLink to="work">Work</NavLink>
            <NavLink to="composition">Composition</NavLink>
            <NavLink to="history">History</NavLink>
          </nav>
          <details className="reference-profile-details">
            <summary>Profile terms</summary>
            <p>{project.profile.description}</p>
            <dl>
              <div>
                <dt>Focus</dt>
                <dd>{project.profile.terms.focusPlural}</dd>
              </div>
              <div>
                <dt>Material</dt>
                <dd>{project.profile.terms.findingPlural}</dd>
              </div>
              <div>
                <dt>Basis</dt>
                <dd>{project.profile.terms.referencePlural}</dd>
              </div>
            </dl>
          </details>
        </aside>

        <div className="reference-project-main" data-place={currentPlace}>
          <Outlet context={{ project } satisfies ProjectOutletContext} />
        </div>
      </div>
    </div>
  );
};

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

export const BriefSurface = ({ project }: { project: ProjectRecord }) => {
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
          <p className="reference-panel-kicker">Profile</p>
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

export const BriefRoute = (): React.JSX.Element => (
  <BriefSurface project={useProjectRecord()} />
);

const sourceSearchText = (source: SourceRecord): string =>
  `${source.title} ${source.kind} ${source.role} ${source.creator}`.toLocaleLowerCase();

export const SourcesSurface = ({ project }: { project: ProjectRecord }) => {
  const [query, setQuery] = useState("");
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
        actions={
          <PetraButton
            variant="primary"
            unavailable={{
              reason: `${project.profile.terms.reference} registration is unavailable in this workspace.`,
              prerequisite: "Source registration capability.",
            }}
          >
            Add {project.profile.terms.reference}
          </PetraButton>
        }
      />

      <div className="reference-source-toolbar">
        <PetraTextField
          label={`Find ${project.profile.terms.referencePlural}`}
          placeholder="Title, kind, role, or creator"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
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
            This early Project has no registered basis. Adding one requires the
            source command that owns identity and permissions.
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
                    <Link to={source.id}>{source.title}</Link>
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
                <Link className="reference-text-link" to={source.id}>
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

export const SourcesRoute = (): React.JSX.Element => (
  <SourcesSurface project={useProjectRecord()} />
);

const SourceDetails = ({ source }: { source: SourceRecord }) => (
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
        <dt>Identity</dt>
        <dd>
          <code>{source.id}</code>
        </dd>
      </div>
      <div>
        <dt>Revision</dt>
        <dd>{source.revision}</dd>
      </div>
      <div>
        <dt>Copy</dt>
        <dd>{source.copy}</dd>
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
  </aside>
);

export const SourceReaderSurface = ({
  project,
  source,
  returnTo,
}: {
  project: ProjectRecord;
  source: SourceRecord;
  returnTo?: { path: string; label: string } | undefined;
}) => {
  const returnPath = returnTo?.path ?? `/projects/${project.id}/sources`;
  const returnLabel =
    returnTo?.label ?? `Return to ${project.profile.terms.referencePlural}`;

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
        </div>
      </header>

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
                <PetraButton
                  variant="primary"
                  unavailable={{
                    reason:
                      "Processing eligibility and permission are unresolved.",
                    prerequisite:
                      "A permitted copy and source processing capability.",
                  }}
                >
                  Process source
                </PetraButton>
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
        <SourceDetails source={source} />
      </div>

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
  const { sourceId } = useParams();
  const [searchParams] = useSearchParams();
  const source = getReferenceSource(project, sourceId);
  const returnOrigin = searchParams.get("from");
  const returnReview = getReferenceReview(
    project.id,
    searchParams.get("reviewId") ?? undefined,
  );
  const returnBasis = returnReview?.basis.find(
    (basis) => basis.sourceId === source?.id,
  );
  const returnGraph = getProjectGraph(project.id);
  const returnGraphNode = returnGraph?.nodes.find(
    (node) => node.id === searchParams.get("graphNodeId"),
  );
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
      : returnOrigin === "graph" &&
          returnGraphNode?.layers.includes(returnGraphLayer) === true
        ? {
            path: `/projects/${project.id}/graph?layer=${returnGraphLayer}&selected=${returnGraphNode.id}#graph-selection`,
            label: "Return to Graph",
          }
        : returnOrigin === "review" &&
            returnReview !== undefined &&
            returnBasis !== undefined
          ? {
              path: `/projects/${project.id}/review/${returnReview.id}#basis-${returnBasis.id}`,
              label: "Return to Review",
            }
          : undefined;

  if (source === undefined) {
    return (
      <main className="reference-route-error" id="reference-main">
        <PetraMark />
        <p className="reference-eyebrow">Source unavailable</p>
        <h1>This source cannot be opened</h1>
        <p>
          The address does not resolve inside {project.title}. Petra did not
          show a similarly named source or content from another Project.
        </p>
        <Link
          className="reference-text-link"
          to={`/projects/${project.id}/sources`}
        >
          Return to {project.profile.terms.referencePlural}
        </Link>
      </main>
    );
  }

  return (
    <SourceReaderSurface
      project={project}
      source={source}
      returnTo={returnTo}
    />
  );
};

export const RouteError = (): React.JSX.Element => (
  <main className="reference-route-error" id="reference-main">
    <PetraMark />
    <p className="reference-eyebrow">Route unavailable</p>
    <h1>Petra could not open this place</h1>
    <p>
      The current address is missing or malformed. No Project data was
      substituted.
    </p>
    <Link className="reference-text-link" to="/">
      Return to Projects
    </Link>
  </main>
);
