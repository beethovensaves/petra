import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectShellCollectionView,
  PetraProjectShellViewV11,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  ProductFrame,
  ProjectShell,
  ProjectsRoute,
  RouteError,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import {
  loadProjectRecord,
  loadProjectsHome,
} from "../src/product/project-data.js";
import shellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json";
import scientificProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json";
import writingProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-controlled-writing.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-profile.css";

type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly authorization: string | null;
  readonly body?: unknown;
  readonly status: number;
};

declare global {
  interface Window {
    projectCreateCalls: RecordedCall[];
    projectCreateRouter: ReturnType<typeof createMemoryRouter>;
    projectCreateExpected: {
      readonly unrelatedProjectId: string;
      readonly unrelatedProjectTitle: string;
      readonly selectedProfileId: string;
      readonly selectedProfileVersion: string;
      readonly selectedProfileHash: string;
      readonly projectName: string;
      readonly firstFocus: string;
    };
    projectCreateState: {
      commandAttempts: number;
      effectCount: number;
      resultingProjectId?: string;
    };
  }
}

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const deriveIdentity = async (
  kind: string,
  immutableIdentity: string,
): Promise<string> => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${kind}:${immutableIdentity}`),
    ),
  ).slice(0, 16);
  let value = BigInt(
    `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    )}`,
  );
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = alphabet[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};

const scientific = structuredClone(
  scientificProfileFixture,
) as unknown as PetraRegisteredProjectProfile;
const writing = structuredClone(
  writingProfileFixture,
) as unknown as PetraRegisteredProjectProfile;
const unrelatedShell = structuredClone(
  shellFixture,
) as unknown as PetraProjectShellViewV11;

const projectName = "Wave 6 browser-created Project";
const firstFocus =
  "Determine which retained evidence most strongly separates the candidate explanations.";

window.projectCreateCalls = [];
window.projectCreateState = { commandAttempts: 0, effectCount: 0 };
window.projectCreateExpected = {
  unrelatedProjectId: unrelatedShell.project_id,
  unrelatedProjectTitle: unrelatedShell.content.project.name,
  selectedProfileId: scientific.profile_id,
  selectedProfileVersion: scientific.profile_version,
  selectedProfileHash: scientific.content_hash,
  projectName,
  firstFocus,
};
window.sessionStorage.setItem(
  "petra.auth.token",
  "browser-project-create-token",
);

let retainedRequest: PetraProjectProfileCommandRequest | undefined;
let retainedReceipt: PetraProjectProfileCommandReceipt | undefined;

const receiptFor = async (
  request: PetraProjectProfileCommandRequest,
): Promise<PetraProjectProfileCommandReceipt> => {
  const projectId = await deriveIdentity("project", request.command_id);
  return {
    schema_name: "petra.project-profile-command-receipt",
    schema_version: "1.0.0",
    receipt_id: await deriveIdentity(
      "project_profile_receipt",
      request.command_id,
    ),
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    operation: "create",
    actor: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "human",
    },
    profile_ref: structuredClone(request.profile_ref),
    project_ref: { project_id: projectId, revision: 1 },
    project_definition_ref: {
      project_definition_id: await deriveIdentity(
        "project_definition",
        request.command_id,
      ),
      revision: 1,
      content_hash: unrelatedShell.content.definition.content_hash,
    },
    objective_ref: {
      objective_id: await deriveIdentity("objective", request.command_id),
      revision: 1,
      content_hash:
        unrelatedShell.content.current_objective?.content_hash ??
        `sha256:${"a".repeat(64)}`,
    },
    destination: { place_role: "brief", project_id: projectId },
    recorded_at: "2026-09-20T23:55:00.000Z",
  };
};

const recoveryFor = async (
  request: PetraProjectProfileCommandRequest,
): Promise<PetraProjectProfileCommandRecoveryView> => {
  const requestHash = await digest(request);
  const projectId = await deriveIdentity("project", request.command_id);
  const observationCutoff = "2026-09-20T23:54:59.000Z";
  const content: PetraProjectProfileCommandRecoveryView["content"] = {
    subject: {
      operation: "create",
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
    },
    effect: {
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      meaning:
        "No exact receipt was visible at the observation cutoff. Absence does not prove that no effect occurred after the cutoff.",
    },
    preservation: [
      {
        item: "exact_request",
        identity: requestHash,
        durability: "client_session",
        state: "client_copy_required",
      },
    ],
    eligible_actions: [
      {
        operation: "retry_exact_command",
        eligibility: "eligible",
        owner: "project_profile_command",
        method: "POST",
        path: "/api/commands/projects",
        input_behavior: "reuse_exact_request",
        identity_behavior: "reuse_command_and_idempotency",
        authority_effect:
          "The owning command may create one Project after rechecking the exact profile and authenticated actor.",
        history_effect:
          "The owning Project-profile receipt remains the only durable command result; this assessment creates no recovery event or second ledger.",
        reason:
          "Exact idempotent redelivery is safe because no conflicting command identity was observed; execution rechecks current authority.",
        success_destination: { place_role: "brief", project_id: projectId },
        failure_destination: { place_role: "projects" },
        execution_recheck: true,
      },
    ],
    return: {
      state: "safe_fallback",
      destination: { place_role: "projects" },
      reason:
        "No retained receipt supplies an exact resulting Project yet. Return to Projects without implying command success.",
    },
    observation_cutoff: observationCutoff,
    limitations: [
      "This assessment reads only the Project-profile command receipt authority.",
      "A missing receipt at the observation cutoff is not proof that no later effect occurred.",
    ],
  };
  const contentHash = await digest(content);
  return {
    schema_name: "petra.project-profile-command-recovery-view",
    schema_version: "1.0.0",
    assessment_id: await deriveIdentity(
      "project_profile_recovery",
      contentHash,
    ),
    content,
    content_hash: contentHash,
    read_at: observationCutoff,
  };
};

const createdShell = async (): Promise<PetraProjectShellViewV11> => {
  if (retainedRequest === undefined || retainedReceipt === undefined) {
    throw new Error("The resulting Project shell requires its exact receipt.");
  }
  const shell = structuredClone(unrelatedShell);
  shell.project_id = retainedReceipt.project_ref.project_id;
  shell.content.project.project_id = retainedReceipt.project_ref.project_id;
  shell.content.project.revision = retainedReceipt.project_ref.revision;
  shell.content.project.name = retainedRequest.project.name;
  shell.content.project.description =
    retainedRequest.project.description ?? "Created from a registered profile.";
  shell.content.project.updated_at = retainedReceipt.recorded_at;
  shell.content.definition.project_definition_id =
    retainedReceipt.project_definition_ref.project_definition_id;
  shell.content.definition.revision =
    retainedReceipt.project_definition_ref.revision;
  shell.content.definition.content_hash =
    retainedReceipt.project_definition_ref.content_hash;
  if (shell.content.current_objective === undefined) {
    throw new Error("The shell fixture requires a current Objective.");
  }
  shell.content.current_objective.objective_id =
    retainedReceipt.objective_ref.objective_id;
  shell.content.current_objective.revision =
    retainedReceipt.objective_ref.revision;
  shell.content.current_objective.content_hash =
    retainedReceipt.objective_ref.content_hash;
  shell.content.current_objective.statement =
    retainedRequest.objective.statement;
  delete shell.content.selection;
  shell.content_hash = await digest(shell.content);
  return shell;
};

const collection = async (): Promise<PetraProjectShellCollectionView> => {
  const projects =
    window.projectCreateState.effectCount === 0
      ? [unrelatedShell]
      : [await createdShell(), unrelatedShell];
  const content: PetraProjectShellCollectionView["content"] = {
    query: { limit: 12 },
    projects,
    page: {
      returned_count: projects.length,
      total_count: projects.length,
      has_more: false,
    },
  };
  return {
    schema_name: "petra.project-shell-collection-view",
    schema_version: "1.0.0",
    content,
    content_hash: await digest(content),
    read_at: "2026-09-20T23:56:00.000Z",
  };
};

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

window.fetch = async (input, init): Promise<Response> => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  const headers = new Headers(input instanceof Request ? input.headers : {});
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const method =
    init?.method ?? (input instanceof Request ? input.method : "GET");
  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as unknown)
      : undefined;

  const respond = (value: unknown, status = 200): Response => {
    window.projectCreateCalls.push({
      method,
      path: `${url.pathname}${url.search}`,
      authorization: headers.get("authorization"),
      ...(body === undefined ? {} : { body: structuredClone(body) }),
      status,
    });
    return json(value, status);
  };

  if (url.pathname === "/api/queries/projects" && method === "GET") {
    return respond(await collection());
  }
  if (url.pathname === "/api/queries/project-profiles" && method === "GET") {
    return respond({ profiles: [scientific, writing] });
  }
  if (url.pathname === "/api/commands/projects" && method === "POST") {
    const request = body as PetraProjectProfileCommandRequest;
    window.projectCreateState.commandAttempts += 1;
    retainedRequest ??= structuredClone(request);
    if (window.projectCreateState.commandAttempts === 1) {
      return respond(
        {
          error: {
            code: "PROJECT_CREATE_RESPONSE_UNRESOLVED",
            message:
              "The Project create response was not observed. Check the exact effect before retrying.",
          },
        },
        503,
      );
    }
    retainedReceipt ??= await receiptFor(retainedRequest);
    window.projectCreateState.effectCount += 1;
    window.projectCreateState.resultingProjectId =
      retainedReceipt.project_ref.project_id;
    return respond(retainedReceipt, 201);
  }
  if (
    url.pathname === "/api/queries/project-profile-command-recovery" &&
    method === "POST" &&
    retainedRequest !== undefined
  ) {
    return respond(await recoveryFor(retainedRequest));
  }
  if (
    retainedReceipt !== undefined &&
    url.pathname ===
      `/api/queries/projects/${retainedReceipt.project_ref.project_id}/shell` &&
    method === "GET"
  ) {
    return respond(await createdShell());
  }
  return respond(
    {
      error: {
        code: "UNEXPECTED_TEST_ROUTE",
        message: `${method} ${url.pathname}${url.search}`,
      },
    },
    500,
  );
};

const CreatedBrief = (): React.JSX.Element => {
  const project = useProjectRecord();
  return (
    <main className="reference-surface live-project-brief" id="reference-main">
      <p className="reference-eyebrow">{project.title}</p>
      <h1>Brief</h1>
      <p>{project.objective}</p>
      <p data-created-project-id={project.id}>{project.id}</p>
    </main>
  );
};

const router = createMemoryRouter(
  [
    {
      path: "/",
      loader: () => ({ ok: true, accepting: true }),
      element: <ProductFrame />,
      errorElement: <RouteError />,
      children: [
        {
          index: true,
          loader: loadProjectsHome,
          element: <ProjectsRoute />,
        },
        {
          path: "projects/:projectId",
          loader: loadProjectRecord,
          element: <ProjectShell />,
          children: [{ path: "brief", element: <CreatedBrief /> }],
        },
      ],
    },
  ],
  { initialEntries: ["/"] },
);
window.projectCreateRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
