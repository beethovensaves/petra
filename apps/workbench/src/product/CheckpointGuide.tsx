import { Link, useLoaderData, useSearchParams } from "react-router";

import { PetraMark } from "../design-system/brand.js";
import type { ProjectRecord } from "./model.js";
import type { ProjectCollectionData } from "./project-data.js";

import "./checkpoint-guide.css";

const projectCoverageScore = (project: ProjectRecord): number => {
  const representedPlaces = (project.placeSummaries ?? []).filter(
    (place) => place.coverage !== "unavailable" && (place.itemCount ?? 0) > 0,
  ).length;
  const scientific = project.profile.definitionFamily?.includes("scientific")
    ? 10
    : 0;
  return scientific + representedPlaces;
};

export const selectRepresentativeProject = (
  projects: readonly ProjectRecord[],
  preferredProjectId?: string,
): ProjectRecord | undefined =>
  projects.find((project) => project.id === preferredProjectId) ??
  [...projects].sort(
    (left, right) =>
      projectCoverageScore(right) - projectCoverageScore(left) ||
      left.title.localeCompare(right.title),
  )[0];

const GuideAction = ({
  number,
  title,
  description,
  to,
  label,
}: {
  number: number;
  title: string;
  description: string;
  to?: string;
  label: string;
}): React.JSX.Element => (
  <li>
    <span aria-hidden="true">{number}</span>
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
      {to === undefined ? (
        <strong>{label}</strong>
      ) : (
        <Link className="reference-text-link" to={to}>
          {label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  </li>
);

export const CheckpointGuideSurface = ({
  projects,
  profiles,
  preferredProjectId,
}: ProjectCollectionData & {
  preferredProjectId?: string;
}): React.JSX.Element => {
  const project = selectRepresentativeProject(projects, preferredProjectId);
  const projectRoot =
    project === undefined
      ? undefined
      : "/projects/" + encodeURIComponent(project.id);
  const profile =
    project === undefined
      ? undefined
      : profiles.find(
          (candidate) =>
            candidate.definition_family === project.profile.definitionFamily,
        );

  return (
    <main className="checkpoint-guide" id="reference-main">
      <header className="checkpoint-guide__heading">
        <div>
          <p className="reference-eyebrow">Wave 6 user checkpoint</p>
          <h1>Use Petra for one grounded Project task</h1>
          <p className="reference-lede">
            This guide keeps the starting state, task sequence, expected
            outcomes, safe mutations, reset path, and current limits in the
            product. Keep this page open and follow the exact Project links.
          </p>
        </div>
        <span>Wave 6 · user checkpoint · /guide</span>
      </header>

      {project === undefined ? (
        <section
          className="checkpoint-guide__empty"
          aria-labelledby="checkpoint-empty-title"
        >
          <PetraMark />
          <div>
            <h2 id="checkpoint-empty-title">
              Create the representative Project first
            </h2>
            <p>
              The clean store has registered profiles but no Project. Create a
              scientific-evidence Project with a clear first focus, then return
              to this stable guide URL. Petra will not substitute fixture data
              or invent Work for an empty Project.
            </p>
            <Link className="reference-primary-link" to="/">
              Choose a profile and create a Project
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section
            className="checkpoint-guide__start"
            aria-labelledby="checkpoint-start-title"
          >
            <div>
              <p className="reference-panel-kicker">Starting state</p>
              <h2 id="checkpoint-start-title">{project.title}</h2>
              <p>{project.objective}</p>
            </div>
            <dl>
              <div>
                <dt>Profile</dt>
                <dd>
                  {project.profile.label} · ProjectDefinition revision{" "}
                  {project.profile.version}
                </dd>
              </div>
              <div>
                <dt>Current focus</dt>
                <dd>{project.focus.value}</dd>
              </div>
              <div>
                <dt>Authority snapshot</dt>
                <dd>{project.snapshot.label}</dd>
              </div>
              <div>
                <dt>Projection</dt>
                <dd>{project.projection.label}</dd>
              </div>
            </dl>
            <div className="checkpoint-guide__start-actions">
              <Link
                className="reference-primary-link"
                to={projectRoot + "/brief"}
              >
                Start from the Brief
              </Link>
              <Link
                className="reference-text-link"
                to={projectRoot + "/profile"}
              >
                Inspect profile vocabulary
              </Link>
            </div>
          </section>

          <section
            className="checkpoint-guide__sequence"
            aria-labelledby="checkpoint-sequence-title"
          >
            <header>
              <p className="reference-panel-kicker">Guided task</p>
              <h2 id="checkpoint-sequence-title">Complete in this order</h2>
              <p>
                Returning through these links preserves the same Project. Task
                pages supply their own exact return when entered from context.
              </p>
            </header>
            <ol>
              <GuideAction
                number={1}
                title="Confirm the profile language"
                description={
                  "Inspect the registered purpose, " +
                  project.profile.terms.focusPlural.toLocaleLowerCase() +
                  ", " +
                  project.profile.terms.findingPlural.toLocaleLowerCase() +
                  ", " +
                  project.profile.terms.referencePlural.toLocaleLowerCase() +
                  ", Work families, model roles, Review destinations, and unavailable operations."
                }
                to={projectRoot + "/profile"}
                label="Inspect Project profile"
              />
              <GuideAction
                number={2}
                title="Orient from Brief"
                description="Identify the current focus, the item needing attention, and the next action without opening technical records first."
                to={projectRoot + "/brief"}
                label="Open Brief"
              />
              <GuideAction
                number={3}
                title="Ask Petra from exact context"
                description="Submit the registered grounded prompt, inspect role and provider identity, then read references, limitations, Work, Review effects, and the no-authority boundary."
                to={projectRoot + "/petra"}
                label="Ask Petra"
              />
              <GuideAction
                number={4}
                title="Manage durable Work"
                description="Open one exact task. Use only controls the current server assessment marks available: start, answer input, steer or prioritize, leave running, reconnect or replay, cancel, or retry. Inspect unavailable resume and start-again reasons."
                to={projectRoot + "/work"}
                label="Open Work"
              />
              <GuideAction
                number={5}
                title={
                  "Inspect " +
                  project.profile.terms.referencePlural.toLocaleLowerCase() +
                  " and relationships"
                }
                description="Open an exact source and the bounded Graph or textual peer. Preserve the task and selection when returning."
                to={projectRoot + "/sources"}
                label={"Open " + project.profile.terms.referencePlural}
              />
              <GuideAction
                number={6}
                title="Decide a Review member"
                description="Inspect candidate, basis, consequences, validation, and exact destination. Use only live decision controls; a proposal or model answer never applies itself."
                to={projectRoot + "/review"}
                label="Open Review"
              />
              <GuideAction
                number={7}
                title="Inspect effect and recovery"
                description="Open the resulting History episode, inspect its canonical effect and eligible recovery, then use the exact return."
                to={projectRoot + "/history"}
                label="Open History"
              />
              <GuideAction
                number={8}
                title="Return to the updated Brief"
                description="Confirm the Project identity, current focus, attention, and projection state after the task."
                to={projectRoot + "/brief"}
                label="Return to Brief"
              />
            </ol>
          </section>
        </>
      )}

      <div className="checkpoint-guide__support">
        <section aria-labelledby="checkpoint-outcomes-title">
          <p className="reference-panel-kicker">Expected outcomes</p>
          <h2 id="checkpoint-outcomes-title">What to verify</h2>
          <ul>
            <li>Profile terms and permitted actions remain consistent.</li>
            <li>Petra identifies its model role, exact basis, and limits.</li>
            <li>
              Work exposes stages, inputs, activity, resources, outcomes,
              recovery, and exact destinations without implying authority.
            </li>
            <li>
              Sources, Graph, Review, History, and Brief retain the same Project
              and return context.
            </li>
            <li>
              Failures retain drafts and instructions without false success or
              duplicate effects.
            </li>
          </ul>
        </section>

        <section aria-labelledby="checkpoint-safe-title">
          <p className="reference-panel-kicker">Safe optional mutations</p>
          <h2 id="checkpoint-safe-title">Changes you may make</h2>
          <ul>
            <li>Send the exact registered Petra prompt.</li>
            <li>
              Answer registered Work input and change its next scheduling
              instruction or priority.
            </li>
            <li>Cancel or retry only when the Work assessment allows it.</li>
            <li>
              Use an explicit Review decision only after inspecting its exact
              commitment.
            </li>
          </ul>
        </section>

        <section aria-labelledby="checkpoint-reset-title">
          <p className="reference-panel-kicker">Reset</p>
          <h2 id="checkpoint-reset-title">Return to a registered start</h2>
          {project === undefined ? (
            <p>Create the first Project from the Projects page.</p>
          ) : (
            <>
              <p>
                Settings archives exact Project revision {project.revision} and
                creates an additive replacement from a registered profile. It
                does not delete the original Project or unrelated records.
              </p>
              <Link
                className="reference-primary-link"
                to={"/settings?project=" + encodeURIComponent(project.id)}
              >
                Open the reset control
              </Link>
            </>
          )}
        </section>

        <section aria-labelledby="checkpoint-limits-title">
          <p className="reference-panel-kicker">Known limits</p>
          <h2 id="checkpoint-limits-title">Do not infer completion</h2>
          <ul>
            <li>
              Resume and Start again appear only for exact workflow-registered
              checkpoint or fresh-input transitions; they are never inferred
              from task status.
            </li>
            <li>
              A certified model path requires the selected role, exact context,
              and provider to report ready.
            </li>
            <li>
              Controls that explain an unavailable operation do not satisfy it.
            </li>
            <li>
              Automated Wave 6 checks do not accept the product for you. Finish
              this guide, then explicitly accept or reject the checkpoint.
            </li>
          </ul>
        </section>
      </div>

      <footer className="checkpoint-guide__footer">
        <p>
          Registered profiles available: {profiles.length}.{" "}
          {profile === undefined
            ? "No registered profile in this catalogue matches the current ProjectDefinition family."
            : profile.content.label +
              " " +
              profile.profile_version +
              " is registered for " +
              profile.definition_family +
              "; the Project keeps its exact definition revision above."}
        </p>
        <Link className="reference-text-link" to="/">
          Return to Projects
        </Link>
      </footer>
    </main>
  );
};

export const CheckpointGuideRoute = (): React.JSX.Element => {
  const [searchParams] = useSearchParams();
  const preferredProjectId = searchParams.get("project") ?? undefined;
  return (
    <CheckpointGuideSurface
      {...useLoaderData<ProjectCollectionData>()}
      {...(preferredProjectId === undefined ? {} : { preferredProjectId })}
    />
  );
};
