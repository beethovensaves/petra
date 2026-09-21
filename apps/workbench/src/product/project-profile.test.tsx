import { readFileSync } from "node:fs";

import type {
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { getReferenceProject } from "./fixtures.js";
import {
  ProfileTaxonomyPresentation,
  ProjectCreationPanel,
  ProjectProfileSurface,
  ProjectRecoveryPanel,
  ProjectResetPanel,
} from "./ProjectProfileSurface.js";

const scientific = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

const writing = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

const recovery = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-profile-command-recovery-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectProfileCommandRecoveryView;

const recoveryRequest: PetraProjectProfileCommandRequest = {
  schema_name: "petra.project-profile-command-request",
  schema_version: "1.0.0",
  command_id: recovery.content.subject.command_id,
  idempotency_key: recovery.content.subject.idempotency_key,
  operation: "create",
  profile_ref: {
    profile_id: scientific.profile_id,
    profile_version: scientific.profile_version,
    content_hash: scientific.content_hash,
  },
  project: { name: "Retained scientific Project" },
  objective: { statement: "Keep the exact recovery request available." },
};

const project = getReferenceProject("inlet-cycle");
if (project === undefined)
  throw new Error("The profile test Project is missing.");

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const taxonomyView = (
  resolution: PetraProjectProfileTaxonomyView["resolution"],
): PetraProjectProfileTaxonomyView => ({
  schema_name: "petra.project-profile-taxonomy-view",
  schema_version: "1.0.0",
  project_id: "project_01K6P000000000000000000301",
  project_revision: 4,
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000301",
    revision: 2,
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  resolution,
  read_at: "2026-09-19T12:00:00.000Z",
});

describe("usable Project profile UI", () => {
  it("distinguishes both registered profile families using exact supplied terms and availability", () => {
    const markup = render(
      <ProjectCreationPanel
        profiles={[scientific, writing]}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('data-family="petra.scientific-evidence"');
    expect(markup).toContain('data-family="petra.controlled-writing"');
    expect(markup).toContain("Scientific evidence inquiry");
    expect(markup).toContain("Research questions · Claims · Sources");
    expect(markup).toContain("Grounded synthesist");
    expect(markup).toContain("Controlled writing");
    expect(markup).toContain(
      "Document purposes · Requirements · Authority sources",
    );
    expect(markup).toContain("Ask a controlled-writing model");
    expect(markup).toContain("Start controlled-writing Work");
    expect(markup).toContain("Choose one registered profile first");
  });

  it("presents every taxonomy category and supplied operation limitation", () => {
    const markup = render(
      <ProfileTaxonomyPresentation
        idPrefix="scientific-profile"
        label={scientific.content.label}
        purpose={scientific.content.purpose}
        taxonomy={scientific.content.taxonomy}
      />,
    );

    for (const heading of [
      "Terms used in this Project",
      "Object kinds",
      "Relationship meanings",
      "Source roles",
      "Validators",
      "Work families",
      "Model roles",
      "Review destinations",
      "Supported places",
      "Unavailable operations",
    ]) {
      expect(markup).toContain(heading);
    }
    expect(markup).toContain("Retry Work");
    expect(markup).toContain("Delete local copy");
  });

  it("keeps registered, Project-authored, and unsupported resolutions distinct", () => {
    const registered = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "registered",
          profile_ref: {
            profile_id: scientific.profile_id,
            profile_version: scientific.profile_version,
            content_hash: scientific.content_hash,
          },
          label: scientific.content.label,
          purpose: scientific.content.purpose,
          taxonomy: scientific.content.taxonomy,
        })}
      />,
    );
    const projectAuthored = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "project_authored",
          label: writing.content.label,
          purpose: writing.content.purpose,
          taxonomy: writing.content.taxonomy,
          limitation:
            "This definition belongs to the Project and has no registered template origin.",
        })}
      />,
    );
    const unsupported = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "unsupported_profile",
          profile_ref: {
            profile_id: scientific.profile_id,
            profile_version: "0.9.0",
            content_hash: scientific.content_hash,
          },
          reason: "profile_version_unavailable",
          message: "The exact registered profile version is unavailable.",
          safe_destination: "projects",
        })}
      />,
    );

    expect(registered).toContain("Registered profile · version 1.0.0");
    expect(projectAuthored).toContain("Project-authored definition");
    expect(projectAuthored).toContain("has no registered template origin");
    expect(unsupported).toContain("Project profile unsupported");
    expect(unsupported).toContain(
      "No substitute terms, actions, or profile defaults were applied",
    );
    expect(unsupported).not.toContain("Terms used in this Project");
  });

  it("states the additive reset consequence before enabling its command", () => {
    const markup = render(
      <ProjectResetPanel
        project={{ ...project, revision: 7 }}
        profiles={[scientific, writing]}
      />,
    );

    expect(markup).toContain("Reset archives this exact Project revision");
    expect(markup).toContain("It does not delete this Project");
    expect(markup).toContain("Choose replacement profile");
  });

  it("offers a read-only recovery check before any Project command replay", () => {
    const markup = render(
      <ProjectRecoveryPanel
        request={recoveryRequest}
        failureTitle="Project not created."
        failureMessage="The connection ended before Petra returned a receipt."
      />,
    );

    expect(markup).toContain("Recover Project");
    expect(markup).toContain(
      "without sending the create or reset command again",
    );
    expect(markup).toContain("kept this exact request in your browser session");
    expect(markup).not.toContain("Retry exact command");
  });

  it("renders the supplied unknown effect, preservation, limitation, action, and safe return", () => {
    const markup = render(
      <ProjectRecoveryPanel
        request={recoveryRequest}
        failureTitle="Project not created."
        failureMessage="The connection ended before Petra returned a receipt."
        initialAssessment={recovery}
      />,
    );
    const action = recovery.content.eligible_actions[0];

    expect(markup).toContain(recovery.content.effect.meaning);
    expect(markup).toContain("Exact request");
    expect(markup).toContain("Client session");
    expect(markup).toContain(recovery.content.limitations[0]);
    expect(markup).toContain(action?.reason);
    expect(markup).toContain(action?.authority_effect);
    expect(markup).toContain(action?.history_effect);
    expect(markup).toContain("Retry exact command");
    expect(markup).toContain("Safe return");
    expect(markup).toContain(recovery.content.return.reason);
    expect(markup).toContain("Return to Projects");
  });

  it("exposes no retry for a conflicting assessment", () => {
    const conflict = structuredClone(recovery);
    conflict.content.effect = {
      state: "unavailable_to_verify",
      reason: "command_identity_conflict",
      meaning:
        "The command or idempotency identity cannot be reconciled to this exact authenticated request. Petra will not expose another request or retry with conflicting identity.",
    };
    conflict.content.eligible_actions = [];

    const markup = render(
      <ProjectRecoveryPanel
        request={recoveryRequest}
        failureTitle="Project not created."
        failureMessage="The command identity could not be reconciled."
        initialAssessment={conflict}
      />,
    );

    expect(markup).toContain("Unable to verify");
    expect(markup).toContain(conflict.content.effect.meaning);
    expect(markup).not.toContain("Eligible action");
    expect(markup).not.toContain("Retry exact command");
  });

  it("renders a confirmed receipt with only its supplied navigation and exact return", () => {
    const confirmed = structuredClone(recovery);
    const projectId = "project_01K6P000000000000000000401";
    confirmed.content.effect = {
      state: "effect_confirmed",
      meaning:
        "The exact Project-profile command receipt is retained. Repeating the same request returns this receipt without another effect.",
      receipt: {
        schema_name: "petra.project-profile-command-receipt",
        schema_version: "1.0.0",
        receipt_id: "project_profile_receipt_01K6P000000000000000000401",
        command_id: recoveryRequest.command_id,
        idempotency_key: recoveryRequest.idempotency_key,
        operation: "create",
        actor: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          actor_kind: "human",
        },
        profile_ref: structuredClone(recoveryRequest.profile_ref),
        project_ref: { project_id: projectId, revision: 1 },
        project_definition_ref: {
          project_definition_id:
            "project_definition_01K6P000000000000000000401",
          revision: 1,
          content_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        objective_ref: {
          objective_id: "objective_01K6P000000000000000000401",
          revision: 1,
          content_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        destination: { place_role: "brief", project_id: projectId },
        recorded_at: "2026-09-19T18:00:01.000Z",
      },
    };
    confirmed.content.eligible_actions = [
      {
        operation: "open_resulting_project",
        eligibility: "eligible",
        owner: "browser_navigation",
        method: "GET",
        path: `/projects/${projectId}`,
        input_behavior: "none",
        identity_behavior: "no_command",
        authority_effect:
          "Navigation reads the retained Project and creates no command.",
        history_effect:
          "Navigation creates no domain History event and does not replay the Project-profile command.",
        reason: "The retained receipt supplies the exact resulting Project.",
        success_destination: { place_role: "brief", project_id: projectId },
        failure_destination: { place_role: "projects" },
        execution_recheck: true,
      },
    ];
    confirmed.content.return = {
      state: "exact",
      destination: { place_role: "brief", project_id: projectId },
      reason:
        "The retained receipt supplies the resulting Project Brief destination.",
    };

    const markup = render(
      <ProjectRecoveryPanel
        request={recoveryRequest}
        failureTitle="Project not created."
        failureMessage="The connection ended before Petra returned a receipt."
        initialAssessment={confirmed}
      />,
    );

    expect(markup).toContain("Effect confirmed");
    expect(markup).toContain("Inspect retained receipt");
    expect(markup).toContain(projectId);
    expect(markup).toContain("Open resulting Project");
    expect(markup).not.toContain("Retry exact command");
    expect(markup).toContain("Exact return");
    expect(markup).toContain("Return to resulting Brief");
  });
});
