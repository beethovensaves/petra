// Synthetic transport conformance harness; never imported by the production router.
import type {
  PetraCommunicationPlan,
  PetraProjectShellView,
  PetraSuggestedActionInvocationView,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";

import planFixture from "../../../packages/contracts/fixtures/accepted/communication-plan.json";
import invocationFixture from "../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json";
import shellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view.json";
import { PetraSurface } from "../src/product/WorkPetraSurface.js";
import {
  loadProjectPetra,
  projectRecordFromShellView,
  type ProjectPetraData,
} from "../src/product/project-data.js";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/work-petra.css";

const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const seal = async <Record extends { content: unknown; content_hash: string }>(
  record: Record,
): Promise<Record> => {
  record.content_hash = await hash(record.content);
  return record;
};

const linkedPlan = structuredClone(
  planFixture,
) as unknown as PetraCommunicationPlan;
const invocation = structuredClone(
  invocationFixture,
) as unknown as PetraSuggestedActionInvocationView;
const current = linkedPlan.content.current_response;
const command = invocation.content.invocation.content.command_ref;
command.actor = linkedPlan.content.delivery.content.authority_context.actor;
invocation.content.result = {
  state: "available",
  result_ref: {
    schema_name: "petra.grounded-response",
    schema_version: "1.0.0",
    record_id: current.grounded_response_id,
    revision: current.revision,
    content_hash: current.content_hash,
    record_hash: await hash(current),
  },
  authority_effect: "none",
};
invocation.content.operation_state = "failed";
invocation.content.work = {
  state: "available",
  work_unit_ref: {
    ...linkedPlan.content.source_response.content.interaction_ref.work_unit_ref,
    record_hash: `sha256:${"0".repeat(64)}`,
  },
  input_manifest_ref: {
    record_id: "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC3",
    revision: 1,
    content_hash: `sha256:${"0".repeat(64)}`,
    record_hash: `sha256:${"0".repeat(64)}`,
  },
  execution_state: "completed",
  terminal_outcome: "worker_failed",
};
await seal(invocation.content.invocation);
invocation.content.invocation_ref.content_hash =
  invocation.content.invocation.content_hash;
invocation.content.invocation_ref.record_hash = await hash(
  invocation.content.invocation,
);
invocation.content.history.command_receipt_ref = structuredClone(
  invocation.content.invocation_ref,
);
invocation.content.recovery.actions[0].eligibility = "ineligible";
invocation.content.recovery.actions[0].reason = "Work is already registered.";
const stoppedDelivery = structuredClone(linkedPlan.content.delivery);
stoppedDelivery.content.lifecycle = {
  state: "cancelled",
  started_at: "2026-09-13T12:00:00.000Z",
  ended_at: "2026-09-13T12:00:01.000Z",
  outcome_code: "DELIVERY_STOPPED",
};
await seal(stoppedDelivery);
invocation.content.interaction = {
  ...invocation.content.interaction,
  durable_state: "available",
  interaction_run_ref: {
    record_id: stoppedDelivery.interaction_run_id,
    revision: stoppedDelivery.revision,
    content_hash: stoppedDelivery.content_hash,
    record_hash: await hash(stoppedDelivery),
  },
};
await seal(invocation);
linkedPlan.content.invocation = invocation;
linkedPlan.content.current_invocation_delivery = stoppedDelivery;
const invocationCheck = linkedPlan.content.validation.checks.find(
  (check) => check.check === "exact_invocation_result_link",
)!;
invocationCheck.status = "passed";
invocationCheck.findings = [];
linkedPlan.content.limitations = linkedPlan.content.limitations.filter(
  (limitation) =>
    !limitation.startsWith("No linked invocation action report is available."),
);
linkedPlan.content.segments.push({
  segment_key: `command:${command.command_id}`,
  order: linkedPlan.content.segments.length + 1,
  family: "action_report",
  original_statement: null,
  preservation: "passed",
  findings: [],
  force: "unavailable_as_structured_source_data",
  conditions: "unavailable_as_structured_source_data",
  presentation_depth: "material",
  language_validation: "not_performed",
});
await seal(linkedPlan);

const project = projectRecordFromShellView(
  shellFixture as PetraProjectShellView,
);
const responseRecordHash = await hash(linkedPlan.content.source_response);
const testWindow = window as unknown as {
  communicationCalls: Array<{
    url: string;
    method: string;
    authorization: string | null;
  }>;
  communicationConsoleErrors: string[];
};
testWindow.communicationCalls = [];
testWindow.communicationConsoleErrors = [];
const realConsoleError = window.console.error.bind(window.console);
window.console.error = (...values: unknown[]) => {
  testWindow.communicationConsoleErrors.push(values.map(String).join(" "));
  realConsoleError(...values);
};
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.includes("/api/")) return realFetch(input, init);
  const headers = new Headers(init?.headers);
  testWindow.communicationCalls.push({
    url,
    method: init?.method ?? "GET",
    authorization: headers.get("authorization"),
  });
  if (url.includes("/communication?")) {
    const status = Number(
      new URL(window.location.href).searchParams.get("status") ?? 200,
    );
    return Response.json(status === 200 ? linkedPlan : {}, { status });
  }
  return Response.json({}, { status: 404 });
};

const query = new URLSearchParams({
  communication_response_id:
    linkedPlan.content.source_response.grounded_response_id,
  communication_response_revision: String(
    linkedPlan.content.source_response.revision,
  ),
  communication_response_content_hash:
    linkedPlan.content.source_response.content_hash,
  communication_response_record_hash: responseRecordHash,
  communication_locale: "en",
  communication_command_id: command.command_id,
  communication_definition_hash:
    linkedPlan.content.composition_definition.content_hash,
});

const CommunicationRoute = (): React.JSX.Element => {
  const data = useLoaderData<ProjectPetraData>();
  return <PetraSurface project={project} {...data} />;
};

const router = createMemoryRouter(
  [
    {
      path: "/projects/:projectId/petra",
      loader: loadProjectPetra,
      Component: CommunicationRoute,
    },
  ],
  {
    initialEntries: [
      `/projects/${linkedPlan.project_id}/petra?${query.toString()}`,
    ],
  },
);

createRoot(document.getElementById("root")!).render(
  <div className="reference-app">
    <RouterProvider router={router} />
  </div>,
);
