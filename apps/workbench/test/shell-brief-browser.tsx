// Deterministic transport conformance harness; never imported by the production router.
import type {
  PetraProjectBriefViewV11,
  PetraProjectHistoryView,
  PetraProjectShellViewV13,
  PetraProjectWorkView,
} from "@petra/contracts";
import { projectBriefSnapshotMaterial } from "@petra/core/project-brief-view";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  useSearchParams,
  type LoaderFunctionArgs,
} from "react-router";
import { RouterProvider } from "react-router/dom";

import controlsFixture from "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json";
import historyFixture from "../../../packages/contracts/fixtures/accepted/project-history-view.json";
import workFixture from "../../../packages/contracts/fixtures/accepted/project-work-view-detail.json";
import {
  BriefRoute,
  ProjectShell,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import {
  loadProjectBrief,
  loadProjectRecord,
  workProjectFromView,
} from "../src/product/project-data.js";
import { workDetailReturnContext } from "../src/product/WorkPetraSurface.js";
import { WorkDetailSurface } from "../src/product/WorkPetraSurface.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-brief.css";
import "../src/product/work-petra.css";

const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const brief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefViewV11;
const projectId = brief.project_id;
const work = structuredClone(workFixture) as unknown as PetraProjectWorkView;
if (work.content.view_kind !== "detail")
  throw new Error("The shell/Brief harness requires exact Work detail.");
work.project_id = projectId;
work.read_at = brief.read_at;
work.content.authority = structuredClone(brief.content.shell.content.authority);
work.content.summary.execution = {
  state: "running",
  attempt: 1,
  requested_at: "2026-09-21T03:00:00.000Z",
  queued_at: "2026-09-21T03:00:01.000Z",
  started_at: "2026-09-21T03:00:02.000Z",
  updated_at: "2026-09-21T03:02:00.000Z",
};
work.content.summary.attention = {
  state: "active",
  reason_code: "running",
  reason: "Source parsing is running and remains visible.",
};
work.content.summary.elapsed = {
  state: "measured",
  milliseconds: 118_000,
  basis: "start_to_observation",
};
work.content.summary.reported_output_count = 0;
work.content_hash = await hash(work.content);

const resultLink = brief.content.inquiry_links[0]!;
const workLink = structuredClone(resultLink);
workLink.project_inquiry_link_id =
  "project_inquiry_link_01K4F000000000000000000004";
workLink.content.target = {
  target_kind: "work",
  relationship: "addresses",
  work_unit_ref: structuredClone(work.content.summary.work_unit_ref),
};
workLink.content_hash = await hash(workLink.content);
brief.content.inquiry_links = [resultLink, workLink];
brief.content.work = [work];
brief.content.attention = [
  {
    item_id: work.content.summary.work_unit_ref.work_unit_id,
    owner: "work",
    owner_content_hash: work.content_hash,
    consequence_class: "work_interruption",
    reason: "Source parsing is running and remains visible.",
    resolution: "inspect_canonical_owner",
    deferral: "preserves_underlying_condition",
    acknowledgment: "client_local",
  },
];

const history = structuredClone(
  historyFixture,
) as unknown as PetraProjectHistoryView;
const newer = structuredClone(history.content.changes[0]!);
const older = structuredClone(history.content.changes[0]!);
newer.event_ref.event_id = "event_01K4C000000000000000000058";
newer.event_ref.event_position = 2;
newer.event_ref.stream_revision = 2;
newer.event_ref.record_hash = `sha256:${"8".repeat(64)}`;
newer.observed_effect.summary =
  "Applied the reviewed source replacement to current authority.";
older.event_ref.event_id = "event_01K4C000000000000000000057";
older.event_ref.event_position = 1;
older.event_ref.stream_revision = 1;
older.event_ref.record_hash = `sha256:${"7".repeat(64)}`;
older.observed_effect.summary = "Recorded the inspectable source baseline.";
brief.content.recent_decisions = {
  ...history,
  project_id: projectId,
  read_at: brief.read_at,
  content: {
    ...history.content,
    changes: [newer, older],
    authority: {
      through_event_position:
        brief.content.shell.content.authority.event_position,
      through_stream_revision:
        brief.content.shell.content.authority.stream_revision,
    },
  },
};
brief.content.recent_decisions.content_hash = await hash(
  brief.content.recent_decisions.content,
);

const sealBrief = async (
  value: PetraProjectBriefViewV11,
): Promise<PetraProjectBriefViewV11> => {
  value.content_hash = await hash(value.content);
  value.snapshot_hash = await hash(projectBriefSnapshotMaterial(value.content));
  return value;
};
await sealBrief(brief);

const comparison = structuredClone(brief);
comparison.content.comparison = {
  state: "recent_history_interval",
  baseline: structuredClone(older.event_ref),
  through: structuredClone(brief.content.recent_decisions.content.authority),
  changes: [structuredClone(newer)],
  limitation:
    "This comparison covers canonical retained History after the selected baseline through current authority.",
};
await sealBrief(comparison);

const shellContent: PetraProjectShellViewV13["content"] = {
  ...structuredClone(brief.content.shell.content),
  attention_work: {
    state: "available",
    coverage: "complete",
    tasks: [structuredClone(work.content.summary)],
    returned_count: 1,
    total_count: 1,
  },
  resume: {
    state: "not_found",
    failure: {
      code: "PROJECT_RESUME_TASK_NOT_FOUND",
      message: "This Project has no retained task to resume.",
    },
    recovery: {
      action: "open_brief",
      destination: {
        role: "brief",
        purpose: "Open the current Project Brief.",
      },
      reason:
        "Brief is the safe Project entry when no more specific retained task exists.",
    },
  },
};
const shell: PetraProjectShellViewV13 = {
  schema_name: "petra.project-shell-view",
  schema_version: "1.3.0",
  project_id: projectId,
  content: shellContent,
  content_hash: await hash(shellContent),
  read_at: brief.read_at,
};

const controls = structuredClone(controlsFixture);
controls.project_id = projectId;
controls.content.project_ref.record_id = projectId;
controls.content.project_ref.revision = shell.content.project.revision;
controls.content.project_definition_ref.content_hash =
  brief.content.definition.content_hash;
controls.content.project_definition_ref.record_hash = await hash(
  brief.content.definition,
);

const calls: Array<{ url: string; status: number }> = [];
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.includes("/api/")) return realFetch(input, init);
  const parsed = new URL(url, window.location.origin);
  let response: Response;
  if (parsed.pathname.endsWith(`/projects/${projectId}/shell`)) {
    response = Response.json(shell);
  } else if (
    parsed.pathname.endsWith(`/projects/${projectId}/effective-controls`)
  ) {
    response = Response.json(controls);
  } else if (parsed.pathname.endsWith(`/projects/${projectId}/brief`)) {
    const baseline = parsed.searchParams.get("baseline_event_id");
    const expected = parsed.searchParams.get("expected_snapshot_hash");
    if (baseline === newer.event_ref.event_id) {
      response = Response.json(
        {
          error: {
            code: "PROJECT_BRIEF_BASELINE_UNAVAILABLE",
            message:
              "The selected History event left the recent comparison window.",
          },
        },
        { status: 422 },
      );
    } else if (baseline === older.event_ref.event_id && expected !== null) {
      response = Response.json(
        {
          error: {
            code: "PROJECT_BRIEF_STALE",
            message:
              "The expected Brief snapshot changed before comparison replay.",
          },
        },
        { status: 409 },
      );
    } else if (baseline === older.event_ref.event_id) {
      response = Response.json(comparison);
    } else {
      response = Response.json(brief);
    }
  } else {
    response = Response.json({}, { status: 404 });
  }
  calls.push({ url: parsed.href, status: response.status });
  return response;
};

const workProject = workProjectFromView(work);
const WorkOwner = (): React.JSX.Element => {
  const project = useProjectRecord();
  const [search] = useSearchParams();
  const returnTo = workDetailReturnContext(project.id, search);
  const unit = workProject.units[0];
  if (unit === undefined)
    throw new Error("The exact Work owner is unavailable.");
  return (
    <WorkDetailSurface
      project={project}
      work={workProject}
      unit={unit}
      {...(returnTo === undefined ? {} : { returnTo })}
    />
  );
};

const projectLoader = (args: LoaderFunctionArgs) => loadProjectRecord(args);
const briefLoader = (args: LoaderFunctionArgs) => loadProjectBrief(args);
const router = createMemoryRouter(
  [
    {
      path: "/projects/:projectId",
      loader: projectLoader,
      Component: ProjectShell,
      children: [
        { path: "brief", loader: briefLoader, Component: BriefRoute },
        { path: "work/:workId", Component: WorkOwner },
      ],
    },
  ],
  { initialEntries: [`/projects/${projectId}/brief`] },
);

Object.assign(window, { shellBriefRouter: router, shellBriefCalls: calls });
createRoot(document.getElementById("root")!).render(
  <div className="reference-app">
    <RouterProvider router={router} />
  </div>,
);
