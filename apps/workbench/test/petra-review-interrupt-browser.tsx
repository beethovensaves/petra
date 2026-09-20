// Synthetic transport around the production Review-interrupt component. The
// PostgreSQL command and restart boundary is exercised by test:wave6:actions.
import type {
  PetraReviewInterruptResponse,
  PetraReviewSessionApplyResult,
} from "@petra/contracts";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { PetraReviewInterrupt } from "../src/product/PetraReviewInterrupt.js";
import type { ProjectReviewInterruptPresentation } from "../src/product/petra-review-interrupt.js";
import applyResultJson from "../src/product/review-apply-result.fixture.json";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/work-petra.css";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const interruptId = "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FD8";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

const interrupt: ProjectReviewInterruptPresentation = {
  projectId,
  interactionRunId: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FD6",
  interruptRef: {
    interaction_interrupt_id: interruptId,
    revision: 1,
    content_hash: hash("1"),
  },
  changeSetRef: {
    change_set_id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
    revision: 1,
    content_hash:
      "sha256:40f3f95b427df39085f5471705ec3e8fad6290943320c98832ef2e2efc922a2a",
  },
  reason: "changeset_review",
  message:
    "Review the exact proposed ChangeSet before it becomes authoritative.",
};

const resolution = (response: PetraReviewInterruptResponse) => {
  const result = structuredClone(
    applyResultJson,
  ) as unknown as PetraReviewSessionApplyResult;
  result.request.decided_at = response.decided_at;
  return {
    replayed: false,
    response_recorded: true,
    interaction_interrupt_id: interruptId,
    interaction_interrupt_revision: 2,
    command_id: "command_11VZV703ZT28R2EFMB9051WZQ3",
    result,
    return_context: {
      project_thread_ref: {
        project_thread_id: "project_thread_01K4C000000000000000000101",
        revision: 1,
        content_hash: hash("2"),
        record_hash: hash("3"),
      },
      review_session_ref: {
        review_session_id:
          result.request.checkpoint.binding.review_session.review_session_id,
        revision: result.request.checkpoint.binding.review_session.revision,
        content_hash:
          result.request.checkpoint.binding.review_session.content_hash,
      },
      review_member_id:
        result.request.checkpoint.binding.selected_review_member_id,
      work_unit_ref: {
        work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        revision: 1,
        spec_hash: hash("4"),
        record_hash: hash("5"),
      },
      destination: {
        place: "work",
        object_ref: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        label: "Extract supported claims",
      },
      paths: {
        project_thread: `/projects/${projectId}/petra/project_thread_01K4C000000000000000000101`,
        review: `/projects/${projectId}/review/review_session_01K4D000000000000000000004`,
        work: `/projects/${projectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2`,
        return: `/projects/${projectId}/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2`,
      },
    },
  };
};

type ReviewCall = {
  readonly url: string;
  readonly method: string;
  readonly authorization: string | null;
  readonly body: PetraReviewInterruptResponse;
};

const testWindow = window as unknown as Window & {
  reviewCalls: ReviewCall[];
};
testWindow.reviewCalls = [];

window.fetch = async (input, init) => {
  const request = new Request(input, init);
  const body = (await request.json()) as PetraReviewInterruptResponse;
  testWindow.reviewCalls.push({
    url: request.url,
    method: request.method,
    authorization: request.headers.get("authorization"),
    body,
  });
  if (testWindow.reviewCalls.length === 1) {
    throw new Error(
      "Deliberate response-delivery interruption after request capture.",
    );
  }
  return Response.json(resolution(body));
};

const root = document.getElementById("root");
if (root === null) throw new Error("Review interrupt browser root is missing.");

createRoot(root).render(
  <MemoryRouter>
    <main className="reference-surface petra-focus">
      <div className="petra-thread">
        <PetraReviewInterrupt interrupt={interrupt} />
      </div>
    </main>
  </MemoryRouter>,
);
