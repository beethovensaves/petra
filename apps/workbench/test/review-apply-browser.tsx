// Mounted conformance harness only; never imported by the production router.
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { ReviewSessionSurface } from "../src/product/ReviewSurface.js";
import { getReferenceProject } from "../src/product/fixtures.js";
import { reviewSessionFromView } from "../src/product/project-data.js";
import type { PetraProjectReviewViewV120 } from "@petra/contracts";
import checkpoint from "../src/product/review-apply-checkpoint.fixture.json";
import success from "../src/product/review-apply-result.fixture.json";
import recovery from "../../../packages/contracts/fixtures/accepted/review-recovery-assessment.json";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/review-graph.css";
import "../src/design-system/primitives.css";

const testWindow = window as unknown as {
  calls: { url: string; method: string; body?: string }[];
  reloads: number;
};
testWindow.calls = [];
testWindow.reloads = 0;
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.includes("/api/")) return realFetch(input, init);
  testWindow.calls.push({
    url,
    method: init?.method ?? "GET",
    ...(typeof init?.body === "string" ? { body: init.body } : {}),
  });
  if (url.endsWith("/apply")) {
    // Fixed clock makes the exact decision/result fixture deterministic.
    return Response.json(success);
  }
  if (url.includes("apply-checkpoint")) return Response.json(checkpoint);
  if (url.includes("recovery-assessment"))
    return Response.json(success.assessment);
  return Response.json({}, { status: 404 });
};
const OriginalDate = Date;
class FixtureDate extends OriginalDate {
  constructor(value?: string | number) {
    super(value ?? success.request.decided_at);
  }
}
window.Date = FixtureDate as DateConstructor;
const view = {
  schema_name: "petra.project-review-view",
  schema_version: "1.2.0",
  project_id: checkpoint.binding.project_id,
  review_session_id: checkpoint.binding.review_session.review_session_id,
  content: recovery.content.review,
} as unknown as PetraProjectReviewViewV120;
const review = reviewSessionFromView(view);
const project = {
  ...getReferenceProject("inlet-cycle")!,
  id: review.projectId,
};
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <ReviewSessionSurface
      project={project}
      review={review}
      onReviewChange={() => {
        testWindow.reloads += 1;
      }}
    />
  </MemoryRouter>,
);
