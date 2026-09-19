import { useRef, useState, type FormEvent } from "react";
import type {
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { Link, useLoaderData, useNavigate } from "react-router";

import {
  PetraButton,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import type { ProjectRecord } from "./model.js";
import {
  createProjectProfileCommandIdentity,
  createProjectWithProfile,
  resetProjectWithProfile,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";

type ProfileTaxonomy = PetraRegisteredProjectProfile["content"]["taxonomy"];
type TaxonomySection = ProfileTaxonomy["object_kinds"];

const titleCase = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

const availabilityLabel = (section: TaxonomySection): string =>
  titleCase(section.state);

const TaxonomyGroup = ({
  id,
  title,
  section,
}: {
  id: string;
  title: string;
  section: TaxonomySection;
}): React.JSX.Element => (
  <section className="profile-taxonomy__group" aria-labelledby={id}>
    <header>
      <h3 id={id}>{title}</h3>
      <span data-state={section.state}>{availabilityLabel(section)}</span>
    </header>
    {section.items.length === 0 ? null : (
      <dl>
        {section.items.map((item) => (
          <div key={item.semantic_key} data-availability={item.availability}>
            <dt>{item.label}</dt>
            <dd>{item.meaning}</dd>
            {item.unavailable_reason === undefined ? null : (
              <dd className="profile-taxonomy__limitation">
                {item.unavailable_reason}
              </dd>
            )}
          </div>
        ))}
      </dl>
    )}
    {section.limitation === undefined ? null : (
      <p className="profile-taxonomy__limitation">{section.limitation}</p>
    )}
  </section>
);

export const ProfileTaxonomyPresentation = ({
  idPrefix,
  label,
  purpose,
  taxonomy,
  headingLevel = "h2",
}: {
  idPrefix?: string;
  label: string;
  purpose: string;
  taxonomy: ProfileTaxonomy;
  headingLevel?: "h2" | "h3";
}): React.JSX.Element => {
  const Heading = headingLevel;
  const prefix =
    idPrefix ?? label.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");
  const groups = [
    ["Object kinds", taxonomy.object_kinds],
    ["Relationship meanings", taxonomy.relationship_meanings],
    ["Source roles", taxonomy.source_roles],
    ["Validators", taxonomy.validators],
    ["Work families", taxonomy.work_families],
    ["Model roles", taxonomy.model_roles],
    ["Review destinations", taxonomy.review_destinations],
  ] as const;

  return (
    <article className="profile-taxonomy" data-profile-label={label}>
      <header className="profile-taxonomy__heading">
        <p className="reference-panel-kicker">Project profile</p>
        <Heading>{label}</Heading>
        <p>{purpose}</p>
      </header>

      <section
        className="profile-taxonomy__terms"
        aria-labelledby={`${prefix}-terms-title`}
      >
        <h3 id={`${prefix}-terms-title`}>Terms used in this Project</h3>
        <dl>
          {taxonomy.terminology.map((term) => (
            <div key={term.semantic_key}>
              <dt>
                {term.singular} <span>{term.plural}</span>
              </dt>
              <dd>{term.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="profile-taxonomy__grid">
        {groups.map(([title, section]) => (
          <TaxonomyGroup
            id={`${prefix}-${title.toLocaleLowerCase().replaceAll(" ", "-")}`}
            key={title}
            title={title}
            section={section}
          />
        ))}
      </div>

      <div className="profile-taxonomy__places">
        <section aria-labelledby={`${prefix}-places-title`}>
          <h3 id={`${prefix}-places-title`}>Supported places</h3>
          <ul>
            {taxonomy.supported_places.map((place) => (
              <li key={place}>{titleCase(place)}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${prefix}-unavailable-title`}>
          <h3 id={`${prefix}-unavailable-title`}>Unavailable operations</h3>
          {taxonomy.unavailable_operations.length === 0 ? (
            <p>No unavailable operation was supplied by this profile.</p>
          ) : (
            <ul>
              {taxonomy.unavailable_operations.map((operation) => (
                <li key={operation.operation_id}>
                  <strong>{operation.label}</strong>
                  <span>{operation.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
};

const ProfileChoice = ({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: PetraRegisteredProjectProfile[];
  selectedId: string;
  onSelect: (profileId: string) => void;
}): React.JSX.Element => (
  <fieldset className="profile-choice">
    <legend>Choose a registered profile</legend>
    <p>
      The selected version supplies this Project’s starting terms and available
      operations. Petra keeps the same authority, History, and recovery rules.
    </p>
    <div className="profile-choice__grid">
      {profiles.map((profile) => {
        const selected = profile.profile_id === selectedId;
        return (
          <article
            className="profile-choice__card"
            data-family={profile.definition_family}
            data-selected={selected || undefined}
            key={`${profile.profile_id}:${profile.profile_version}`}
          >
            <label className="profile-choice__control">
              <input
                type="radio"
                name="project-profile"
                value={profile.profile_id}
                checked={selected}
                onChange={() => onSelect(profile.profile_id)}
              />
              <strong>{profile.content.label}</strong>
              <span>Version {profile.profile_version}</span>
            </label>
            <p>{profile.content.purpose}</p>
            <p className="profile-choice__terms">
              {profile.content.taxonomy.terminology
                .map((term) => term.plural)
                .join(" · ")}
            </p>
            <details>
              <summary>Inspect this profile</summary>
              <ProfileTaxonomyPresentation
                idPrefix={`profile-choice-${profile.profile_id}`}
                label={profile.content.label}
                purpose={profile.content.purpose}
                taxonomy={profile.content.taxonomy}
                headingLevel="h3"
              />
            </details>
          </article>
        );
      })}
    </div>
  </fieldset>
);

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Petra could not complete the exact Project profile command.";

type RetainedCommand = ReturnType<
  typeof createProjectProfileCommandIdentity
> & {
  fingerprint: string;
};

const retainedCommandFor = (
  retained: React.RefObject<RetainedCommand | undefined>,
  operation: "create" | "reset",
  fingerprint: string,
): RetainedCommand => {
  if (retained.current?.fingerprint === fingerprint) return retained.current;
  retained.current = {
    ...createProjectProfileCommandIdentity(operation),
    fingerprint,
  };
  return retained.current;
};

export const ProjectCreationPanel = ({
  profiles,
  onCancel,
}: {
  profiles: PetraRegisteredProjectProfile[];
  onCancel: () => void;
}): React.JSX.Element => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const retainedCommand = useRef<RetainedCommand | undefined>(undefined);
  const selected = profiles.find(
    (profile) => profile.profile_id === selectedId,
  );
  const selectedFocusTerm = selected?.content.taxonomy.terminology.find(
    (term) => term.generic_family === "focus",
  );

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (selected === undefined || selectedFocusTerm === undefined) return;
    setBusy(true);
    setError(undefined);
    try {
      const profileRef = {
        profileId: selected.profile_id,
        profileVersion: selected.profile_version,
        contentHash: selected.content_hash,
      };
      const command = retainedCommandFor(
        retainedCommand,
        "create",
        JSON.stringify({
          profileRef,
          name: name.trim(),
          description: description.trim(),
          objective: objective.trim(),
        }),
      );
      const receipt = await createProjectWithProfile({
        profile: selected,
        project: {
          name: name.trim(),
          ...(description.trim().length === 0
            ? {}
            : { description: description.trim() }),
        },
        objective: objective.trim(),
        commandId: command.commandId,
        idempotencyKey: command.idempotencyKey,
      });
      await navigate(`/projects/${receipt.destination.project_id}/brief`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="project-profile-command"
      aria-labelledby="new-project-title"
    >
      <header>
        <p className="reference-panel-kicker">Registered starting point</p>
        <h2 id="new-project-title">Create a Project</h2>
        <p>
          Name the task, choose its exact registered profile, and set the first
          focus. The resulting definition belongs to the new Project.
        </p>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <ProfileChoice
          profiles={profiles}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="project-profile-command__fields">
          <PetraTextField
            label="Project name"
            required
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <PetraTextArea
            label="Project description"
            hint="Optional context for recognizing this workspace."
            rows={3}
            maxLength={2_000}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <PetraTextArea
            label="First focus"
            hint={
              selected === undefined
                ? "Choose a registered profile first."
                : selectedFocusTerm === undefined
                  ? "This profile supplies no focus terminology. Petra will not substitute a label."
                  : `This becomes the first ${selectedFocusTerm.singular.toLocaleLowerCase()}.`
            }
            required
            rows={3}
            maxLength={4_000}
            value={objective}
            onChange={(event) => setObjective(event.currentTarget.value)}
          />
        </div>
        {error === undefined ? null : (
          <p className="project-profile-command__error" role="alert">
            <strong>Project not created.</strong> {error}
            <span>
              Your entries remain here. Trying again without changing them
              reuses the same exact command.
            </span>
          </p>
        )}
        <div className="project-profile-command__actions">
          <PetraButton
            type="submit"
            variant="primary"
            busy={busy}
            {...(profiles.length === 0
              ? {
                  unavailable: {
                    reason: "No registered Project profiles are available.",
                  },
                }
              : selected === undefined
                ? {
                    unavailable: {
                      reason: "Choose one registered profile first.",
                    },
                  }
                : selectedFocusTerm === undefined
                  ? {
                      unavailable: {
                        reason:
                          "The selected profile supplies no focus terminology.",
                      },
                    }
                  : {})}
          >
            Create Project
          </PetraButton>
          <PetraButton type="button" variant="quiet" onClick={onCancel}>
            Cancel
          </PetraButton>
        </div>
      </form>
    </section>
  );
};

export const ProjectResetPanel = ({
  project,
  profiles,
}: {
  project: ProjectRecord;
  profiles: PetraRegisteredProjectProfile[];
}): React.JSX.Element => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState(project.title);
  const [objective, setObjective] = useState(project.objective);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const retainedCommand = useRef<RetainedCommand | undefined>(undefined);
  const selected = profiles.find(
    (profile) => profile.profile_id === selectedId,
  );
  const unavailable =
    project.revision === undefined
      ? "The exact current Project revision is unavailable."
      : profiles.length === 0
        ? "No registered Project profile is available."
        : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (selected === undefined || project.revision === undefined || !confirmed)
      return;
    setBusy(true);
    setError(undefined);
    try {
      const command = retainedCommandFor(
        retainedCommand,
        "reset",
        JSON.stringify({
          projectId: project.id,
          revision: project.revision,
          profileId: selected.profile_id,
          profileVersion: selected.profile_version,
          contentHash: selected.content_hash,
          name: name.trim(),
          objective: objective.trim(),
        }),
      );
      const receipt = await resetProjectWithProfile(
        project.id,
        project.revision,
        {
          profile: selected,
          project: { name: name.trim() },
          objective: objective.trim(),
          commandId: command.commandId,
          idempotencyKey: command.idempotencyKey,
        },
      );
      await navigate(`/projects/${receipt.destination.project_id}/brief`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="settings-section settings-project-reset"
      aria-labelledby="project-reset-title"
    >
      <header>
        <p className="reference-panel-kicker">Additive replacement</p>
        <h2 id="project-reset-title">Reset with a registered profile</h2>
        <p>
          Reset archives this exact Project revision and creates a replacement.
          It does not delete this Project or unrelated records.
        </p>
      </header>
      {!open ? (
        <PetraButton
          variant="danger"
          onClick={() => setOpen(true)}
          {...(unavailable === undefined
            ? {}
            : { unavailable: { reason: unavailable } })}
        >
          Choose replacement profile
        </PetraButton>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <ProfileChoice
            profiles={profiles}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="project-profile-command__fields">
            <PetraTextField
              label="Replacement Project name"
              required
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <PetraTextArea
              label="Replacement focus"
              required
              rows={3}
              maxLength={4_000}
              value={objective}
              onChange={(event) => setObjective(event.currentTarget.value)}
            />
          </div>
          <label className="project-profile-command__confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.currentTarget.checked)}
            />
            <span>
              Archive Project revision {project.revision} and create the named
              replacement from the selected profile.
            </span>
          </label>
          {error === undefined ? null : (
            <p className="project-profile-command__error" role="alert">
              <strong>Project not reset.</strong> {error}
              <span>
                Your entries remain here. Trying again without changing them
                reuses the same exact command.
              </span>
            </p>
          )}
          <div className="project-profile-command__actions">
            <PetraButton
              type="submit"
              variant="danger"
              busy={busy}
              {...(selected === undefined
                ? {
                    unavailable: {
                      reason: "Choose one registered replacement profile.",
                    },
                  }
                : !confirmed
                  ? {
                      unavailable: {
                        reason: "Confirm the additive replacement first.",
                      },
                    }
                  : {})}
            >
              Archive and create replacement
            </PetraButton>
            <PetraButton
              type="button"
              variant="quiet"
              onClick={() => setOpen(false)}
            >
              Keep current Project
            </PetraButton>
          </div>
        </form>
      )}
    </section>
  );
};

export const ProjectProfileSurface = ({
  project,
  view,
}: {
  project: ProjectRecord;
  view: PetraProjectProfileTaxonomyView;
}): React.JSX.Element => {
  const resolution = view.resolution;

  if (resolution.state === "unsupported_profile") {
    return (
      <main
        className="reference-surface profile-resolution"
        id="reference-main"
      >
        <section
          className="profile-resolution__unsupported"
          aria-labelledby="unsupported-profile-title"
        >
          <p className="reference-eyebrow">Project profile unsupported</p>
          <h1 id="unsupported-profile-title">
            Petra cannot resolve this Project’s exact profile
          </h1>
          <p>{resolution.message}</p>
          <p>
            No substitute terms, actions, or profile defaults were applied. The
            Project remains unchanged.
          </p>
          <Link className="reference-primary-link" to="/">
            Return to Projects
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="reference-surface profile-resolution" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Profile · current Project</p>
          <h1>How {project.title} is organized</h1>
          <p className="reference-lede">
            These server-supplied terms and operation boundaries apply across
            Brief, Sources, Review, Graph, Work, Petra, Details, History, and
            Settings.
          </p>
        </div>
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/brief`}
        >
          Return to Brief
        </Link>
      </header>
      {resolution.state === "project_authored" ? (
        <aside className="profile-resolution__notice">
          <strong>Project-authored definition</strong>
          <p>{resolution.limitation}</p>
        </aside>
      ) : (
        <p className="profile-resolution__origin">
          Registered profile · version {resolution.profile_ref.profile_version}
        </p>
      )}
      <ProfileTaxonomyPresentation
        idPrefix={`project-profile-${view.project_definition_ref.project_definition_id}`}
        label={resolution.label}
        purpose={resolution.purpose}
        taxonomy={resolution.taxonomy}
      />
    </main>
  );
};

export const ProjectProfileRoute = (): React.JSX.Element => (
  <ProjectProfileSurface
    project={useProjectRecord()}
    view={useLoaderData<PetraProjectProfileTaxonomyView>()}
  />
);
