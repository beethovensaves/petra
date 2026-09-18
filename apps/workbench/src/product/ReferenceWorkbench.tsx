import { ProjectBriefSurface } from "./ProjectBriefSurface.js";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  PetraProjectInquiryView,
  PetraSuggestedActionView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useOutletContext,
  useSearchParams,
} from "react-router";

import { PetraLockup, PetraMark } from "../design-system/brand.js";
import { PetraButton, PetraTextField } from "../design-system/primitives.js";
import { REFERENCE_PROJECTS, getProjectProfileTool } from "./fixtures.js";
import type { ProjectBriefData } from "./project-data.js";
import { SuggestedWorkAction } from "./SuggestedAction.js";
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
        <p>Projects</p>
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

export const hashFocusTargetId = (hash: string): string | undefined => {
  if (!hash.startsWith("#") || hash.length === 1) return undefined;
  try {
    const target = decodeURIComponent(hash.slice(1));
    return target.length === 0 ? undefined : target;
  } catch {
    return undefined;
  }
};

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
          <p className="reference-nav-label">Project workflow</p>
          <nav ref={projectNav} aria-label={`${project.title} places`}>
            {[
              { place: "brief" as const, to: "brief", label: "Brief" },
              {
                place: "petra" as const,
                to: "petra",
                label: "Ask Petra",
                primary: true,
              },
              { place: "work" as const, to: "work", label: "Work" },
              {
                place: "sources" as const,
                to: "sources",
                label: project.profile.terms.referencePlural,
              },
              { place: "graph" as const, to: "graph", label: "Graph" },
              { place: "review" as const, to: "review", label: "Review" },
              { place: "history" as const, to: "history", label: "History" },
              {
                place: "composition" as const,
                to: "composition",
                label: "Composition",
              },
            ].map(({ place, to, label, primary = false }) => {
              const summary = project.placeSummaries?.find(
                (candidate) => candidate.role === place,
              );
              return (
                <NavLink
                  key={place}
                  to={to}
                  {...(primary ? { "data-primary": "true" } : {})}
                >
                  <span>{label}</span>
                  {summary === undefined ||
                  summary.attentionCount === 0 ? null : (
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
            })}
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

      {suggestedAction === undefined ? null : (
        <SuggestedActionPreview
          actionView={suggestedAction}
          {...(suggestedWorkAction === undefined
            ? {}
            : { workActionView: suggestedWorkAction })}
          {...(invokedInquiry === undefined ? {} : { invokedInquiry })}
        />
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

export const BriefRoute = (): React.JSX.Element => {
  const data = useLoaderData<ProjectBriefData>();
  if (data.briefView === undefined)
    throw new Error("The Project Brief read is unavailable.");
  return (
    <ProjectBriefSurface
      view={data.briefView}
      {...(data.suggestedAction === undefined
        ? {}
        : {
            selectedAction: (
              <SuggestedActionPreview
                actionView={data.suggestedAction}
                {...(data.suggestedWorkAction === undefined
                  ? {}
                  : { workActionView: data.suggestedWorkAction })}
                {...(data.invokedInquiry === undefined
                  ? {}
                  : { invokedInquiry: data.invokedInquiry })}
              />
            ),
          })}
    />
  );
};

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

export const SourcesRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const sources = useLoaderData<SourceRecord[]>();
  return <SourcesSurface project={{ ...project, sources }} />;
};

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
  const source = useLoaderData<SourceRecord>();
  const [searchParams] = useSearchParams();
  const returnOrigin = searchParams.get("from");
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
