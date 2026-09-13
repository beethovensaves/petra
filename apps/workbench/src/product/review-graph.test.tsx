import { ReviewCandidateCorrectionClientError } from "@petra/adapters";
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
import type { GraphQuestion, ReviewSession } from "./model.js";
import {
  ProjectDataError,
  createReviewCandidateCorrectionCommandInput,
  createReviewSessionDeferCommandInput,
  createReviewSessionRefreshCommandInput,
  createReviewSessionReopenCommandInput,
} from "./project-data.js";
import {
  ReviewCandidateCorrectionNotice,
  ReviewCollectionSurface,
  ReviewLifecycleNotice,
  ReviewRefreshNotice,
  ReviewSessionSurface,
  createReviewCandidateEditorState,
  reviewCandidateCorrectionFailureState,
  reviewCandidateEditorReducer,
  reviewLifecycleFailureState,
  reviewRefreshFailureState,
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

  const correctionReview = (): ReviewSession => ({
    ...structuredClone(review),
    lifecycle: "open",
    candidateCorrection: {
      reviewMemberId: "review_member_01K4D000000000000000000201",
      expectedWorkingCandidateRef: {
        working_candidate_id: "working_candidate_01K4D000000000000000000202",
        revision: 1,
        content_hash: `sha256:${"2".repeat(64)}`,
      },
      expectedWorkingRelationshipRef: {
        working_relationship_id:
          "working_relationship_01K4D000000000000000000203",
        revision: 1,
        content_hash: `sha256:${"3".repeat(64)}`,
      },
    },
  });

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

  it("keeps the frozen Edit candidate disclosure local and text-only", () => {
    const correctable = correctionReview();
    const markup = render(
      <ReviewSessionSurface
        project={project}
        review={correctable}
        initialCandidateEditOpen
      />,
    );

    expect(markup).toContain("Edit candidate");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="review-candidate-editor"');
    expect(markup).toContain('id="review-candidate-canonical-text"');
    expect(markup).toContain("Candidate Claim text");
    expect(markup).toContain("this is the only editable content sent");
    expect(markup).toContain(
      "Petra composes scope, basis, authorship, producer, task, provenance, validation, lineage, and hashes on the server",
    );
    expect(markup).toContain(
      "Closing the editor keeps this unsent text on this page",
    );
    expect(markup).toContain("Not a Review decision");
    expect(markup).toContain('data-operation="correct_review_candidate"');
    expect(markup).toContain("Change the Claim text before saving");
    expect(markup).toContain("required");
  });

  it("retains local draft, disclosure, and the exact uncertain request", () => {
    const correctable = correctionReview();
    const input = createReviewCandidateCorrectionCommandInput(
      correctable,
      "The corrected Claim keeps a narrower source-grounded statement.",
      {
        commandId: "command_01K4D000000000000000000204",
        idempotencyKey: "review-session:001:correction:surface:v1",
      },
    );
    let editor = createReviewCandidateEditorState(
      correctable.candidate.proposed,
    );
    editor = reviewCandidateEditorReducer(editor, { type: "toggle" });
    editor = reviewCandidateEditorReducer(editor, {
      type: "draft_changed",
      draft: input.request.correction_input.canonical_text,
    });
    editor = reviewCandidateEditorReducer(editor, { type: "toggle" });
    editor = reviewCandidateEditorReducer(editor, { type: "toggle" });
    expect(editor).toMatchObject({
      expanded: true,
      draft: input.request.correction_input.canonical_text,
    });

    editor = reviewCandidateEditorReducer(editor, {
      type: "correction_started",
      input,
    });
    const uncertain = reviewCandidateCorrectionFailureState(
      new TypeError("connection closed"),
      input,
    );
    if (
      uncertain.state === "idle" ||
      uncertain.state === "pending" ||
      uncertain.state === "success"
    ) {
      throw new Error("Expected an uncertain candidate-correction state.");
    }
    editor = reviewCandidateEditorReducer(editor, {
      type: "correction_failed",
      correction: uncertain,
    });
    const locked = reviewCandidateEditorReducer(editor, {
      type: "draft_changed",
      draft: "A different draft must not replace the uncertain request.",
    });
    expect(locked).toBe(editor);
    expect(locked.correction).toEqual({ state: "uncertain", input });
    expect(locked.draft).toBe(input.request.correction_input.canonical_text);

    const reloaded = reviewCandidateEditorReducer(locked, {
      type: "review_reloaded",
    });
    expect(reloaded).toMatchObject({
      expanded: true,
      draft: input.request.correction_input.canonical_text,
      correction: { state: "idle" },
    });
  });

  it("presents every material correction failure without claiming authority", () => {
    const correctable = correctionReview();
    const input = createReviewCandidateCorrectionCommandInput(
      correctable,
      "A source-grounded Claim correction for failure presentation.",
      {
        commandId: "command_01K4D000000000000000000205",
        idempotencyKey: "review-session:001:correction:surface:v2",
      },
    );
    const clientError = (
      status: number,
      code: string,
    ): ReviewCandidateCorrectionClientError =>
      new ReviewCandidateCorrectionClientError("rejected", status, {
        error: { code },
      });
    const states = [
      reviewCandidateCorrectionFailureState(
        clientError(409, "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE"),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        clientError(403, "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED"),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        clientError(422, "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED"),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        clientError(409, "REVIEW_CANDIDATE_CORRECTION_COMMAND_ID_REUSED"),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        new ReviewCandidateCorrectionClientError("invalid result", 200, {}),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        new TypeError("connection closed"),
        input,
      ),
      reviewCandidateCorrectionFailureState(
        clientError(422, "REVIEW_CANDIDATE_CORRECTION_COMMAND_INVALID"),
        input,
      ),
    ];
    expect(states.map((state) => state.state)).toEqual([
      "stale",
      "unauthorized",
      "unsupported_profile",
      "retry_mismatch",
      "invalid_response",
      "uncertain",
      "failed",
    ]);

    const markups = states.map((correction) =>
      render(
        <ReviewCandidateCorrectionNotice
          review={correctable}
          correction={correction}
          onRetry={() => undefined}
          onReload={() => undefined}
        />,
      ),
    );
    expect(markups[0]).toContain("Review changed before correction");
    expect(markups[0]).toContain("Reload Review");
    expect(markups[1]).toContain("was not authorized");
    expect(markups[2]).toContain("cannot use Claim-text correction");
    expect(markups[3]).toContain(
      "Command identity belongs to another correction",
    );
    expect(markups[3]).toContain("Reload Review");
    expect(markups[4]).toContain("could not be verified");
    expect(markups[4]).toContain("Retry exact correction");
    expect(markups[5]).toContain("result is not yet confirmed");
    expect(markups[5]).toContain("Retry exact correction");
    expect(markups[6]).toContain("was not accepted");
    for (const markup of markups) {
      expect(markup).toContain('role="alert"');
      expect(markup).toContain('tabindex="-1"');
      expect(markup).not.toContain("Review approved");
      expect(markup).not.toContain("Validation passed");
      expect(markup).not.toContain("Applied to Project");
    }
  });

  it("separates matching new and retained correction results from Review success", () => {
    const correctable = correctionReview();
    const input = createReviewCandidateCorrectionCommandInput(
      correctable,
      "The corrected Claim remains working material.",
      {
        commandId: "command_01K4D000000000000000000206",
        idempotencyKey: "review-session:001:correction:surface:v3",
      },
    );
    const appliedMarkup = render(
      <ReviewCandidateCorrectionNotice
        review={correctable}
        correction={{ state: "success", applied: true, input }}
        onRetry={() => undefined}
      />,
    );
    const retainedMarkup = render(
      <ReviewCandidateCorrectionNotice
        review={correctable}
        correction={{ state: "success", applied: false, input }}
        onRetry={() => undefined}
      />,
    );

    expect(appliedMarkup).toContain("Working correction confirmed");
    expect(appliedMarkup).toContain(
      "authenticated Review read is being reloaded",
    );
    expect(appliedMarkup).toContain(
      "did not approve, reject, apply, report validation success, or create domain authority",
    );
    expect(retainedMarkup).toContain("Exact correction result recovered");
    expect(retainedMarkup).toContain("without applying it again");
    expect(retainedMarkup).toContain("not a Review decision");
    expect(retainedMarkup).not.toContain(input.request.command_id);
  });

  it("does not infer reopen eligibility from an ambiguous Waiting state", () => {
    const waiting = structuredClone(review);
    waiting.status = "waiting";
    waiting.statusLabel = "Waiting";
    waiting.lifecycle = "open";
    const markup = render(
      <ReviewSessionSurface project={project} review={waiting} />,
    );

    expect(markup).toContain("Reopen is unavailable");
    expect(markup).toContain("exact lifecycle is open");
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(markup).not.toContain('data-operation="reopen_review_session"');
    expect(markup).not.toContain("Reason for deciding later (optional)");
  });

  it("presents Reopen only for the exact deferred lifecycle without implying authority", () => {
    const deferred = structuredClone(review);
    deferred.status = "waiting";
    deferred.statusLabel = "Waiting";
    deferred.lifecycle = "deferred";
    const markup = render(
      <ReviewSessionSurface project={project} review={deferred} />,
    );

    expect(markup).toContain("This Review is deferred");
    expect(markup).toContain(
      "seeing Deferred here does not mean the command is eligible or authorized",
    );
    expect(markup).toContain("Reopen review");
    expect(markup).toContain('data-operation="reopen_review_session"');
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup).not.toContain("Reason for deciding later (optional)");
  });

  it("presents Refresh only from the runtime-supplied stale and open state", () => {
    const stale = structuredClone(review);
    stale.snapshotState = "stale";
    stale.lifecycle = "open";
    const markup = render(
      <ReviewSessionSurface project={project} review={stale} />,
    );

    expect(markup).toContain("Refresh Review");
    expect(markup).toContain('data-operation="refresh_review_session"');
    expect(markup).toContain(
      "sends only the exact Review identity, revision, content hash, and open lifecycle",
    );
    expect(markup).toContain("does not establish eligibility or authorization");
    expect(markup).toContain(
      "does not approve, reject, apply, or separate anything and does not edit any candidate or basis record",
    );
    expect(markup).toContain(stale.candidate.current);
    expect(markup).toContain(stale.candidate.proposed);

    const withoutLifecycle = structuredClone(stale);
    delete withoutLifecycle.lifecycle;
    const unavailableMarkup = render(
      <ReviewSessionSurface project={project} review={withoutLifecycle} />,
    );
    expect(unavailableMarkup).toContain("Refresh Review is unavailable");
    expect(unavailableMarkup).not.toContain(
      'data-operation="refresh_review_session"',
    );
  });

  it("keeps Refresh pending, exact retry, conflict, authorization, and retained success explicit", () => {
    const stale = structuredClone(review);
    stale.snapshotState = "stale";
    stale.lifecycle = "open";
    const input = createReviewSessionRefreshCommandInput(stale, {
      commandId: "command_01K4D000000000000000000078",
      idempotencyKey: "review-session:001:refresh:surface:v1",
    });
    const conflict = reviewRefreshFailureState(
      new ProjectDataError("stale", 409),
      input,
    );
    const unauthorized = reviewRefreshFailureState(
      new ProjectDataError("forbidden", 403),
      input,
    );
    const uncertain = reviewRefreshFailureState(
      new TypeError("connection closed"),
      input,
    );

    const pendingMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={{ state: "pending", input }}
        onRetry={() => undefined}
      />,
    );
    const appliedMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={{ state: "success", applied: true, input }}
        onRetry={() => undefined}
      />,
    );
    const retainedMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={{ state: "success", applied: false, input }}
        onRetry={() => undefined}
      />,
    );
    const conflictMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={conflict}
        onRetry={() => undefined}
        onReload={() => undefined}
      />,
    );
    const unauthorizedMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={unauthorized}
        onRetry={() => undefined}
      />,
    );
    const uncertainMarkup = render(
      <ReviewRefreshNotice
        review={stale}
        refresh={uncertain}
        onRetry={() => undefined}
      />,
    );

    expect(pendingMarkup).toContain("stale comparison remains visible");
    expect(pendingMarkup).toContain("Nothing is shown as refreshed yet");
    expect(appliedMarkup).toContain("Review refreshed");
    expect(appliedMarkup).toContain(
      "did not approve, reject, apply, or separate anything",
    );
    expect(appliedMarkup).toContain(
      "did not edit any candidate or basis record",
    );
    expect(retainedMarkup).toContain("Review refresh already confirmed");
    expect(retainedMarkup).toContain("retained result for this exact command");
    expect(conflictMarkup).toContain("Review changed before refresh");
    expect(conflictMarkup).toContain("Nothing is shown as refreshed");
    expect(conflictMarkup).toContain("Reload Review");
    expect(conflictMarkup).not.toContain("Retry exact refresh");
    expect(unauthorizedMarkup).toContain("was not authorized");
    expect(unauthorizedMarkup).not.toContain("Retry exact refresh");
    expect(uncertainMarkup).toContain("Retry exact refresh");
    expect(uncertainMarkup).toContain("retained result");
    expect(retainedMarkup).not.toContain(input.commandId);
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

  it("keeps Reopen pending, reconciliation, failure, and no-authority language explicit", () => {
    const deferred = structuredClone(review);
    deferred.status = "waiting";
    deferred.statusLabel = "Waiting";
    deferred.lifecycle = "deferred";
    const input = createReviewSessionReopenCommandInput(deferred, {
      commandId: "command_01K4D000000000000000000072",
      idempotencyKey: "review-session:001:reopen:surface:v1",
    });
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
        review={deferred}
        lifecycle={{ state: "pending", input }}
        onRetry={() => undefined}
      />,
    );
    const retainedSuccessMarkup = render(
      <ReviewLifecycleNotice
        review={deferred}
        lifecycle={{ state: "success", applied: false, input }}
        onRetry={() => undefined}
      />,
    );
    const staleMarkup = render(
      <ReviewLifecycleNotice
        review={deferred}
        lifecycle={stale}
        onRetry={() => undefined}
        onRefresh={() => undefined}
      />,
    );
    const unauthorizedMarkup = render(
      <ReviewLifecycleNotice
        review={deferred}
        lifecycle={unauthorized}
        onRetry={() => undefined}
      />,
    );

    expect(pendingMarkup).toContain("Reopening this Review");
    expect(pendingMarkup).toContain("Review is not shown as open again yet");
    expect(retainedSuccessMarkup).toContain("Review already reopened");
    expect(retainedSuccessMarkup).toContain("retained result");
    expect(retainedSuccessMarkup).toContain("Review is open again");
    expect(retainedSuccessMarkup).toContain(
      "no candidate was approved, rejected, or applied",
    );
    expect(staleMarkup).toContain("Nothing is shown as reopened");
    expect(staleMarkup).toContain("Refresh Review");
    expect(unauthorizedMarkup).toContain("Reopen review was not authorized");
    expect(retainedSuccessMarkup).not.toContain(input.commandId);
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
