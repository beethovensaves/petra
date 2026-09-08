import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  getProjectGraph,
  getProjectReviews,
  getReferenceProject,
  getReferenceReview,
} from "./fixtures.js";
import { GraphSurface } from "./GraphSurface.js";
import {
  ReviewCollectionSurface,
  ReviewSessionSurface,
} from "./ReviewSurface.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("reference Review and Graph packets", () => {
  const project = getReferenceProject("inlet-cycle");
  const review = getReferenceReview("inlet-cycle", "review-service-link");
  const graph = getProjectGraph("inlet-cycle");

  if (project === undefined || review === undefined || graph === undefined) {
    throw new Error("Review and Graph conformance fixtures are incomplete.");
  }

  it("keeps the Review queue exception-led and decision-sized", () => {
    const markup = render(
      <ReviewCollectionSurface
        project={project}
        reviews={getProjectReviews(project.id)}
      />,
    );

    expect(markup).toContain("1 decision needs your attention");
    expect(markup).toContain("Four other working candidates passed");
    expect(markup).toContain("Counts represent decisions");
    expect(markup).toContain("Needs your decision");
    expect(markup).toContain("Waiting");
    expect(markup).toContain("Completed");
  });

  it("presents Current, Candidate, origin, basis, consequence, and exact ChangeSet", () => {
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("Current · authoritative");
    expect(markup).toContain("No accepted relationship");
    expect(markup).toContain("Candidate · working");
    expect(markup).toContain("Inquiry analyst");
    expect(markup).toContain("Actuator maintenance note");
    expect(markup).toContain("Commitment blocked");
    expect(markup).toContain("Changes to apply");
    expect(markup).toContain("One atomic ChangeSet · 1 proposed change");
    expect(markup).toContain("No accepted finding is replaced or removed");
    expect(markup).toContain("?from=review&amp;reviewId=review-service-link");
  });

  it("does not let local Review controls imply authority", () => {
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("no local control can record authority");
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(markup).toContain("Apply 1 change");
    expect(markup).toContain("Reject candidate");
    expect(markup).toContain("Decide later");
  });

  it("states the represented position instead of mixing projection generations", () => {
    const markup = render(
      <GraphSurface project={project} graph={graph} initialLayer="current" />,
    );

    expect(markup).toContain("Newer authoritative state available");
    expect(markup).toContain("safely represents Snapshot 17");
    expect(markup).toContain("Snapshot 18 is authoritative");
    expect(markup).toContain("Current at Snapshot 17 contains 4 objects");
    expect(markup).toContain(
      "does not encode authority, strength, or causal order",
    );
  });

  it("exposes accepted layers and a complete textual relationship peer", () => {
    const markup = render(
      <GraphSurface
        project={project}
        graph={graph}
        initialLayer="working"
        initialSelectedNodeId="node-service-event"
      />,
    );

    expect(markup).toContain("Current");
    expect(markup).toContain("Working changes");
    expect(markup).toContain("Historical");
    expect(markup).toContain("Graph");
    expect(markup).toContain("Text");
    expect(markup).toContain("Actuator service event");
    expect(markup).toContain("Timing dependency");
    expect(markup).toContain("depends on");
    expect(markup).toContain("Open candidate Review");
    expect(markup).toContain("What this graph represents");
    expect(markup).toContain(
      "from=graph&amp;graphLayer=working&amp;graphNodeId=node-service-event",
    );
  });

  it("keeps the branch recommendation advisory and explains its context", () => {
    const markup = render(
      <GraphSurface project={project} graph={graph} initialLayer="current" />,
    );

    expect(markup).toContain("Resolve the service-event branch first");
    expect(markup).toContain("earliest unresolved dependency shared by two");
    expect(markup).toContain("Following another branch is valid");
    expect(markup).toContain("does not damage accepted Project state");
    expect(markup).toContain("Show recommended branch");
  });
});
