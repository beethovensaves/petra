import type {
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
  PetraProjectShellViewV11,
} from "@petra/contracts";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  ProductFrame,
  ProjectsRoute,
  RouteError,
} from "../src/product/ReferenceWorkbench.js";
import {
  deriveProjectImportIdentity,
  hashProjectImportValue,
} from "../src/product/project-import.js";
import { loadProjectCollection } from "../src/product/project-data.js";
import shellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-profile.css";

type ImportMode = "success" | "unknown" | "conflict";
type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;
};

declare global {
  interface Window {
    importCalls: RecordedCall[];
    importRouter: ReturnType<typeof createMemoryRouter>;
    setImportMode: (mode: ImportMode) => void;
  }
}

const sourceShell = structuredClone(
  shellFixture,
) as unknown as PetraProjectShellViewV11;
const derivedProjectId = "project_01K6P000000000000000000802";
const actor = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

let mode: ImportMode = "success";
let commandAttempts = 0;
let retainedRequest: PetraProjectImportCommandRequest | undefined;

window.importCalls = [];
window.setImportMode = (nextMode) => {
  mode = nextMode;
  commandAttempts = 0;
  retainedRequest = undefined;
  window.importCalls.length = 0;
};

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

const receiptFor = (
  request: PetraProjectImportCommandRequest,
): PetraProjectImportCommandReceipt => ({
  schema_name: "petra.project-import-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_import_receipt_01K6P000000000000000000802",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  actor,
  source: {
    source_kind: "retained_project",
    project_ref: {
      project_id: request.source.project_id,
      revision: request.source.project_revision,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      ...request.source.project_definition_ref,
      record_hash: hash("2"),
    },
    focused_objective_ref: {
      ...request.source.focused_objective_ref,
      record_hash: hash("3"),
    },
    project_status: "active",
  },
  admission: { ...request.admission, reviewed_by: actor },
  result: {
    project_ref: {
      project_id: derivedProjectId,
      revision: 1,
      record_hash: hash("4"),
    },
    project_definition_ref: {
      project_definition_id: "project_definition_01K6P000000000000000000802",
      revision: 1,
      content_hash: request.source.project_definition_ref.content_hash,
      record_hash: hash("5"),
    },
    focused_objective_ref: {
      objective_id: "objective_01K6P000000000000000000802",
      revision: 1,
      content_hash: request.source.focused_objective_ref.content_hash,
      record_hash: hash("6"),
    },
  },
  material: {
    copied: ["project_definition", "focused_objective"],
    retained_only: [
      "source_project_identity",
      "source_history",
      "source_sources",
      "source_work",
      "source_reviews",
    ],
    limitations: [
      "Only the exact definition and focused objective are copied.",
    ],
  },
  destination: { place_role: "brief", project_id: derivedProjectId },
  recorded_at: "2026-09-20T12:30:00.000Z",
});

const recoveryFor = async (
  request: PetraProjectImportCommandRequest,
): Promise<PetraProjectImportCommandRecoveryView> => {
  const requestHash = await hashProjectImportValue(request);
  const observationCutoff = "2026-09-20T12:31:00.000Z";
  const subject = {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: requestHash,
    source_project_id: request.source.project_id,
  };
  const exactRequest = {
    item: "exact_request" as const,
    identity: requestHash,
    durability: "client_session" as const,
    state: "client_copy_required" as const,
  };
  const content: PetraProjectImportCommandRecoveryView["content"] =
    mode === "unknown"
      ? {
          subject,
          effect: {
            state: "outcome_unknown",
            reason: "receipt_not_observed_at_cutoff",
            meaning:
              "No exact import receipt was visible at the observation cutoff. Absence does not prove that no derived Project was created later.",
          },
          preservation: [exactRequest],
          eligible_actions: [
            {
              operation: "retry_exact_command",
              owner: "project_import_command",
              method: "POST",
              path: "/api/commands/projects/import",
              input_behavior: "reuse_exact_request",
              identity_behavior: "reuse_command_and_idempotency",
              reason:
                "Exact idempotent redelivery is eligible; execution rechecks source ownership and every source revision and hash.",
              success_destination: {
                place_role: "brief",
                project_id: await deriveProjectImportIdentity(
                  "project",
                  request.command_id,
                ),
              },
              failure_destination: { place_role: "projects" },
              execution_recheck: true,
            },
          ],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "No retained receipt supplies a derived Project yet. Return to Projects without implying import success.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "This read reconciles only the immutable Project import receipt. A missing receipt is not proof that no later effect occurred.",
          ],
        }
      : {
          subject,
          effect: {
            state: "unavailable_to_verify",
            reason: "command_identity_conflict",
            meaning:
              "The command or idempotency identity cannot be reconciled to this exact authenticated import request. Petra will not expose another request or retry with conflicting identity.",
          },
          preservation: [exactRequest],
          eligible_actions: [],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "Return to Projects without exposing or repeating another import request.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "Conflicting command contents and results are intentionally undisclosed.",
          ],
        };
  const contentHash = await hashProjectImportValue(content);
  return {
    schema_name: "petra.project-import-command-recovery-view",
    schema_version: "1.0.0",
    assessment_id: await deriveProjectImportIdentity(
      "project_import_recovery",
      contentHash,
    ),
    content,
    content_hash: contentHash,
    read_at: observationCutoff,
  };
};

window.fetch = async (input, init): Promise<Response> => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as unknown)
      : undefined;
  const method = init?.method ?? "GET";
  window.importCalls.push({
    method,
    path: `${url.pathname}${url.search}`,
    ...(body === undefined ? {} : { body }),
  });

  if (url.pathname === "/health") {
    return json({ ok: true, accepting: true });
  }
  if (url.pathname === "/api/queries/projects") {
    return json({ projects: [sourceShell] });
  }
  if (url.pathname === "/api/commands/projects/import" && method === "POST") {
    retainedRequest = body as PetraProjectImportCommandRequest;
    commandAttempts += 1;
    if (mode === "conflict" || (mode === "unknown" && commandAttempts === 1)) {
      return json(
        {
          error: {
            code:
              mode === "conflict"
                ? "PROJECT_IMPORT_IDENTITY_CONFLICT"
                : "PROJECT_IMPORT_RUNTIME_FAILED",
            message:
              mode === "conflict"
                ? "The import identity conflicts with another retained request."
                : "The connection ended before Petra could confirm the import outcome.",
          },
        },
        mode === "conflict" ? 409 : 503,
      );
    }
    return json(receiptFor(retainedRequest), 201);
  }
  if (
    url.pathname === "/api/queries/project-import-command-recovery" &&
    method === "POST"
  ) {
    return json(await recoveryFor(body as PetraProjectImportCommandRequest));
  }
  if (
    url.pathname ===
      `/api/queries/projects/${derivedProjectId}/import-ancestry` &&
    retainedRequest !== undefined
  ) {
    return json(receiptFor(retainedRequest));
  }
  return json(
    { error: { code: "UNEXPECTED_TEST_ROUTE", message: url.pathname } },
    500,
  );
};

const DerivedBrief = (): React.JSX.Element => (
  <main id="reference-main" className="reference-surface">
    <p className="reference-eyebrow">Derived Project</p>
    <h1>Exact derived Project Brief</h1>
    <p>{derivedProjectId}</p>
  </main>
);

const router = createMemoryRouter([
  {
    path: "/",
    loader: () => ({
      ok: true,
      accepting: true,
    }),
    element: <ProductFrame />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        loader: async () => ({
          projects: await loadProjectCollection(),
          profiles: [],
        }),
        element: <ProjectsRoute />,
      },
      {
        path: "projects/:projectId/brief",
        element: <DerivedBrief />,
      },
    ],
  },
]);
window.importRouter = router;

const root = document.getElementById("root");
if (root === null) throw new Error("Project import trace root is missing.");
createRoot(root).render(<RouterProvider router={router} />);
