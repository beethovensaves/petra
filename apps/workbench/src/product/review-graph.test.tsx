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
import type { GraphQuestion } from "./model.js";
import {
  ProjectDataError,
  createReviewSessionDeferCommandInput,
} from "./project-data.js";
import {
  ReviewCollectionSurface,
  ReviewLifecycleNotice,
  ReviewSessionSurface,
  reviewLifecycleFailureState,
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
    expect(markup).toContain(
      "0 other Review sessions do not require an immediate decision.",
    );
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

  it("enables only the exact defer command without implying other authority", () => {
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("the server rechecks lifecycle and authority");
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup).toContain("Apply 1 change");
    expect(markup).toContain("Reject candidate");
    expect(markup).toContain("Decide later");
    expect(markup).toContain('data-operation="defer_review_session"');
    expect(markup).toContain("Reason for deciding later (optional)");
    expect(markup).toContain("A scheduled revisit time is not supported yet");
    expect(markup).toContain(
      'href="/projects/inlet-cycle/brief#attention-source-depth"',
    );
  });

  it("does not infer reopen eligibility from an ambiguous Waiting state", () => {
    const waiting = structuredClone(review);
    waiting.status = "waiting";
    waiting.statusLabel = "Waiting";
    const markup = render(
      <ReviewSessionSurface project={project} review={waiting} />,
    );

    expect(markup).toContain("Reopen remains unavailable");
    expect(markup).toContain("does not distinguish a deferred session");
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(markup).not.toContain("Reason for deciding later (optional)");
  });

  it("keeps retry, reconciliation, stale, unauthorized, and return states explicit", () => {
    const input = createReviewSessionDeferCommandInput(review, {
      commandId: "command_01K4D000000000000000000071",
      idempotencyKey: "review-session:001:defer:surface:v1",
    });
    const uncertain = reviewLifecycleFailureState(
      new TypeError("connection closed"),
      input,
    );
    const stale = reviewLifecycleFailureState(
      new ProjectDataError("stale", 409),
      input,
    );
    const unauthorized = reviewLifecycleFailureState(
      new ProjectDataError("forbidden", 403),
      input,
    );

    const pendingMarkup = render(
      <ReviewLifecycleNotice
        review={review}
        lifecycle={{ state: "pending", input }}
        onRetry={() => undefined}
      />,
    );
    const uncertainMarkup = render(
      <ReviewLifecycleNotice
        review={review}
        lifecycle={uncertain}
        onRetry={() => undefined}
      />,
    );
    const staleMarkup = render(
      <ReviewLifecycleNotice
        review={review}
        lifecycle={stale}
        onRetry={() => undefined}
        onRefresh={() => undefined}
      />,
    );
    const unauthorizedMarkup = render(
      <ReviewLifecycleNotice
        review={review}
        lifecycle={unauthorized}
        onRetry={() => undefined}
      />,
    );
    const successMarkup = render(
      <ReviewLifecycleNotice
        review={review}
        lifecycle={{ state: "success", applied: false, input }}
        onRetry={() => undefined}
      />,
    );

    expect(pendingMarkup).toContain('role="status"');
    expect(pendingMarkup).toContain("No decision is shown as recorded yet");
    expect(uncertainMarkup).toContain('role="alert"');
    expect(uncertainMarkup).toContain("Retry exact command");
    expect(uncertainMarkup).toContain("without applying it again");
    expect(staleMarkup).toContain("Refresh Review");
    expect(staleMarkup).toContain("Nothing is shown as deferred");
    expect(unauthorizedMarkup).toContain("was not authorized");
    expect(successMarkup).toContain("retained result for this exact command");
    expect(successMarkup).toContain("Return to Inlet cycle review");
    expect(successMarkup).not.toContain(input.commandId);
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

  it("renders exact earlier working endpoints and keeps runtime positions separate", () => {
    const runtimeGraph = structuredClone(graph);
    runtimeGraph.focusNodeId = "current-work";
    runtimeGraph.authoritativeSnapshot =
      "Authority event 42 · Project stream 7";
    runtimeGraph.representedSnapshot =
      "Projection current · represented event 42 · observed event 42";
    runtimeGraph.workingRevision =
      "Working snapshot sha256:7777 · based on authority event 42 · Project stream 7";
    runtimeGraph.layerLabels = {
      current: "Current authority",
      working: "Working — not authoritative",
      historical: "Historical",
    };
    runtimeGraph.authorityBoundary =
      "Working records are not Project authority. Validation, visibility, selection, and projection do not grant authority; promotion requires Review.";
    runtimeGraph.resultCounts = [
      { label: "Referenced earlier working candidate revisions", value: 1 },
    ];
    runtimeGraph.omissions = [
      "Historical authoritative state is not included.",
    ];
    runtimeGraph.limitations = [
      "The first adapter is limited to one registered scientific profile.",
    ];
    runtimeGraph.nodes = [
      {
        id: "current-work",
        label: "Evidence extraction · version 1",
        kind: "Work version",
        summary: "The authoritative Work version.",
        basis: "Accepted Work record.",
        semanticLayer: "current",
        layers: ["current", "working"],
        position: { x: 25, y: 25 },
      },
      {
        id: "candidate-revision-2",
        label: "Narrowed working Claim",
        kind: "Claim",
        summary: "The current working head.",
        basis: "Human correction.",
        semanticLayer: "working",
        endpointPosture: "Current working revision",
        validationSummary: "Validation pending for revision 2.",
        layers: ["working"],
        position: { x: 50, y: 50 },
      },
      {
        id: "candidate-revision-1",
        label: "Earlier working Claim",
        kind: "Claim",
        summary: "The exact earlier referenced revision.",
        basis: "Model extraction.",
        semanticLayer: "working",
        endpointPosture: "Referenced earlier working revision — not current",
        validationSummary:
          "Validation completed; validation does not grant authority.",
        layers: ["working"],
        position: { x: 75, y: 75 },
      },
    ];
    runtimeGraph.edges = [
      {
        id: "working-relationship-1",
        from: "current-work",
        to: "candidate-revision-1",
        label: "asserts",
        summary: "The exact relationship still targets revision 1.",
        meaning: "Working source representation, not authority or approval.",
        scope: "The exact working input snapshot.",
        basis: "Working relationship revision 1.",
        direction: "outgoing",
        semanticLayer: "working",
        endpointPosture: "Referenced earlier working revision — not current",
        validationSummary:
          "Validation completed; validation does not grant authority.",
        layers: ["working"],
        tone: "working",
      },
    ];
    runtimeGraph.textualPeer = {
      title: "Scientific evidence inquiry: relationship layers",
      scope: "Textual peer for every returned node and relationship.",
      completeness: "complete_for_every_returned_node_and_relationship",
      nodes: runtimeGraph.nodes.map((node) => ({
        id: node.id,
        layer: node.semanticLayer === "working" ? "working" : "current",
        kind: node.kind,
        label: node.label,
        summary: node.summary,
        basis: node.basis,
        ...(node.endpointPosture === undefined
          ? {}
          : { endpointPosture: node.endpointPosture }),
        ...(node.validationSummary === undefined
          ? {}
          : { validationSummary: node.validationSummary }),
      })),
      relationships: [
        {
          id: "working-relationship-1",
          layer: "working",
          from: "current-work",
          fromLabel: "Evidence extraction · version 1",
          direction: "outgoing",
          label: "asserts",
          to: "candidate-revision-1",
          toLabel: "Earlier working Claim",
          summary: "The exact relationship still targets revision 1.",
          meaning: "Working source representation, not authority or approval.",
          scope: "The exact working input snapshot.",
          basis: "Working relationship revision 1.",
          endpointPosture: "Referenced earlier working revision — not current",
          validationSummary:
            "Validation completed; validation does not grant authority.",
        },
      ],
      omissions: ["Historical authoritative state is not included."],
    };

    const markup = render(
      <GraphSurface
        project={project}
        graph={runtimeGraph}
        initialLayer="working"
        initialSelectedNodeId="candidate-revision-1"
        initialViewMode="text"
      />,
    );

    expect(markup).toContain("Working — not authoritative");
    expect(markup).toContain(
      "Referenced earlier working revision — not current",
    );
    expect(markup).toContain(
      "Working source representation, not authority or approval.",
    );
    expect(markup).toContain(
      "Validation completed; validation does not grant authority.",
    );
    expect(markup).toContain("Current authority</dt><dd>Authority event 42");
    expect(markup).toContain("Graph projection</dt><dd>Projection current");
    expect(markup).toContain(
      "Working snapshot and base</dt><dd>Working snapshot",
    );
    expect(markup).toContain("Referenced earlier working candidate revisions");
    expect(markup).not.toContain("to: candidate-revision-2");
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

  it("keeps unsupported working and historical layers visible but unavailable", () => {
    const currentOnly: GraphQuestion = {
      ...graph,
      layerAvailability: {
        current: { available: true, label: "Current" },
        working: { available: false, label: "Working is not implemented" },
        historical: {
          available: false,
          label: "History is not implemented",
        },
      },
    };
    delete currentOnly.recommendation;
    const markup = render(
      <GraphSurface
        project={project}
        graph={currentOnly}
        initialLayer="working"
      />,
    );

    expect(markup).toContain("Current at Snapshot 17 contains 4 objects");
    expect(markup).toContain(
      'aria-label="Working changes: Working is not implemented"',
    );
    expect(markup).toContain(
      'aria-label="Historical: History is not implemented"',
    );
    expect(markup).not.toContain("Show recommended branch");
    expect(markup).not.toContain("Timing dependency");
  });
});
