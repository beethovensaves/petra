// Synthetic transport conformance harness; never imported by the production router.
import { createRoot } from "react-dom/client";
import { createMemoryRouter, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";
import { BriefRoute } from "../src/product/ReferenceWorkbench.js";
import { loadProjectBrief } from "../src/product/project-data.js";
import fixture from "../src/product/project-brief.fixture.json";
import controlsFixture from "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json";
import type {
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRequest,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

const testWindow = window as unknown as {
  briefCalls: { url: string; method: string; body?: unknown }[];
  objectiveMode: "applied" | "recovery" | "replay" | "conflict";
  briefRouter: ReturnType<typeof createMemoryRouter>;
};
testWindow.briefCalls = [];
testWindow.objectiveMode =
  (new URL(window.location.href).searchParams.get("mode") as
    typeof testWindow.objectiveMode | null) ?? "applied";
const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const controls = structuredClone(controlsFixture);
controls.content.project_definition_ref.content_hash =
  fixture.content.definition.content_hash;
controls.content.project_definition_ref.record_hash = await canonicalHash(
  fixture.content.definition,
);
const commandResult = async (
  request: PetraProjectObjectiveCommandRequest,
  applied: boolean,
) => {
  const objective = structuredClone(
    fixture.content.objective,
  ) as PetraProjectObjective;
  objective.revision += 1;
  objective.content = structuredClone(request.review.proposed_content);
  objective.content_hash = await canonicalHash(objective.content);
  objective.updated_at = "2026-09-20T12:01:00.000Z";
  const objectiveRef = {
    objective_id: objective.objective_id,
    revision: objective.revision,
    content_hash: objective.content_hash,
    record_hash: await canonicalHash(objective),
  };
  const receiptBase = {
    schema_name: "petra.project-objective-command-receipt" as const,
    schema_version: "1.0.0" as const,
    receipt_id: "project_objective_receipt_01K6P000000000000000001001",
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: await canonicalHash(request),
    operation: request.operation,
    project_id: fixture.project_id,
    actor: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "human" as const,
    },
    capability_grant_id: "capability_grant_01K6P000000000000000001001",
    project_definition_ref: request.expected.project_definition_ref,
    prior_focus: request.expected.focus,
    objective_ref: objectiveRef,
    review: {
      decision: "applied" as const,
      rough_statement: request.review.rough_statement,
      proposed_statement: request.review.proposed_content.statement,
      reviewed_by: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        actor_kind: "human" as const,
      },
      reviewed_at: request.review.reviewed_at,
    },
    effect: {
      kind: "objective_revised" as const,
      summary:
        "The reviewed Objective revision is retained and is now the active Project focus.",
      current_focus_updated: true as const,
    },
    destination: {
      place_role: "brief" as const,
      project_id: fixture.project_id,
      objective_ref: objectiveRef,
    },
    recovery: {
      command_path: `/api/commands/projects/${fixture.project_id}/objective`,
      assessment_path: `/api/queries/projects/${fixture.project_id}/objective-command-recovery`,
      retry_reuses_command_identity: true as const,
      missing_receipt_means_unknown: true as const,
    },
    recorded_at: objective.updated_at,
  };
  const receipt: PetraProjectObjectiveCommandReceipt = {
    ...receiptBase,
    record_hash: await canonicalHash(receiptBase),
  };
  return { receipt, objective, applied };
};
const recoveryResult = async (request: PetraProjectObjectiveCommandRequest) => {
  const conflict = testWindow.objectiveMode === "conflict";
  const effect = conflict
    ? ({
        state: "unavailable_to_verify",
        reason: "command_identity_conflict",
      } as const)
    : ({
        state: "outcome_unknown",
        reason: "receipt_not_observed_at_cutoff",
        retry: {
          method: "POST",
          path: `/api/commands/projects/${fixture.project_id}/objective`,
          reuse_exact_request: true,
        },
      } as const);
  const content = {
    project_id: fixture.project_id,
    subject: {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: await canonicalHash(request),
    },
    effect,
    return: {
      state: "safe_fallback" as const,
      destination: {
        place_role: "brief" as const,
        project_id: fixture.project_id,
      },
      reason: "Re-read the current Brief before another action.",
    },
    observed_at: "2026-09-20T12:02:00.000Z",
  };
  if (!conflict) testWindow.objectiveMode = "replay";
  return {
    schema_name: "petra.project-objective-command-recovery-view" as const,
    schema_version: "1.0.0" as const,
    assessment_id: "project_objective_recovery_01K6P000000000000000001001",
    ...content,
    content_hash: await canonicalHash(content),
  };
};
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.includes("/api/")) return realFetch(input, init);
  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as unknown)
      : undefined;
  testWindow.briefCalls.push({
    url,
    method: init?.method ?? "GET",
    ...(body === undefined ? {} : { body }),
  });
  if (url.endsWith(`/projects/${fixture.project_id}/effective-controls`)) {
    return Response.json(controls);
  }
  if (url.endsWith(`/projects/${fixture.project_id}/shell`)) {
    return Response.json(fixture.content.shell);
  }
  if (url.endsWith(`/projects/${fixture.project_id}/brief`)) {
    const status = Number(
      new URL(window.location.href).searchParams.get("status") ?? 200,
    );
    return Response.json(status === 200 ? fixture : {}, { status });
  }
  if (url.endsWith(`/projects/${fixture.project_id}/objective`)) {
    const request = body as PetraProjectObjectiveCommandRequest;
    if (testWindow.objectiveMode === "recovery") {
      throw new TypeError("Synthetic delivery disconnected after send.");
    }
    if (testWindow.objectiveMode === "conflict") {
      return Response.json(
        {
          error: {
            code: "PROJECT_OBJECTIVE_COMMAND_IDEMPOTENCY_CONFLICT",
            message:
              "The command identity conflicts with retained request material.",
          },
        },
        { status: 409 },
      );
    }
    return Response.json(
      await commandResult(request, testWindow.objectiveMode === "applied"),
      { status: testWindow.objectiveMode === "applied" ? 201 : 200 },
    );
  }
  if (
    url.endsWith(`/projects/${fixture.project_id}/objective-command-recovery`)
  ) {
    return Response.json(
      await recoveryResult(body as PetraProjectObjectiveCommandRequest),
    );
  }
  return Response.json({}, { status: 404 });
};
const router = createMemoryRouter(
  [
    {
      path: "/projects/:projectId",
      element: (
        <Outlet
          context={{
            project: {
              id: fixture.project_id,
              title: fixture.content.shell.content.project.name,
            },
          }}
        />
      ),
      children: [
        {
          path: "brief",
          loader: loadProjectBrief,
          Component: BriefRoute,
        },
      ],
    },
  ],
  {
    initialEntries: [`/projects/${fixture.project_id}/brief`],
  },
);
testWindow.briefRouter = router;
createRoot(document.getElementById("root")!).render(
  <div className="reference-app">
    <RouterProvider router={router} />
  </div>,
);
