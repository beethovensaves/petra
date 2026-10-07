import {
  ReviewCandidateBasisRevisionClientError,
  ReviewCandidateCorrectionClientError,
  ReviewSessionSeparationClientError,
} from "@petra/adapters";
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
  createReviewCandidateBasisRevisionCommandInput,
  createReviewCandidateCorrectionCommandInput,
  createReviewSessionDeferCommandInput,
  createReviewSessionRefreshCommandInput,
  createReviewSessionReopenCommandInput,
  createReviewSessionSeparationCommandInput,
} from "./project-data.js";
import {
  ReviewCandidateBasisRevisionNotice,
  ReviewCandidateCorrectionNotice,
  ReviewCollectionSurface,
  ReviewLifecycleNotice,
  ReviewRefreshNotice,
  ReviewSessionSurface,
  ReviewSessionSeparationNotice,
  createReviewCandidateBasisEditorState,
  createReviewCandidateEditorState,
  reviewCandidateBasisEditorReducer,
  reviewCandidateBasisRevisionFailureState,
  reviewCandidateCorrectionFailureState,
  reviewCandidateEditorReducer,
  reviewLifecycleFailureState,
  reviewRefreshFailureState,
  reviewSessionSeparationFailureState,
  reviewSessionWithMember,
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

  const basisReview = (): ReviewSession => ({
    ...correctionReview(),
    candidateBasisRevision: {
      reviewMemberId: "review_member_01K4E000000000000000000301",
      expectedProjectDefinitionRef: {
        project_definition_id: "project_definition_01K4C000000000000000000001",
        revision: 2,
        content_hash: `sha256:${"1".repeat(64)}`,
        definition_family: "petra.scientific-evidence",
      },
      expectedWorkingCandidateRef: {
        working_candidate_id: "working_candidate_01K4E000000000000000000302",
        revision: 2,
        content_hash: `sha256:${"2".repeat(64)}`,
      },
      expectedWorkingRelationshipRef: {
        working_relationship_id:
          "working_relationship_01K4E000000000000000000303",
        revision: 2,
        content_hash: `sha256:${"3".repeat(64)}`,
      },
      expectedClaimRef: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
        revision: 2,
        record_hash: `sha256:${"4".repeat(64)}`,
      },
      projectSourceId: "project_source_01K4C000000000000000000007",
      sourceSpanRefs: [
        {
          schema_name: "petra.source-span",
          schema_version: "1.0.0",
          record_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7",
          revision: 1,
          record_hash: `sha256:${"5".repeat(64)}`,
        },
      ],
      expectedProjectSourceRef: {
        project_source_id: "project_source_01K4C000000000000000000007",
        revision: 1,
        content_hash: `sha256:${"6".repeat(64)}`,
        record_hash: `sha256:${"7".repeat(64)}`,
        status: "active",
      },
    },
  });

  const multiMemberReview = (): ReviewSession => {
    const base = basisReview();
    if (
      base.candidateCorrection === undefined ||
      base.candidateBasisRevision === undefined ||
      base.changeSet === undefined
    ) {
      throw new Error("Expected complete multi-member Review fixture fields.");
    }
    const first = {
      reviewMemberId: "review_member_01K4F000000000000000000601",
      role: "ordinary" as const,
      outcome: "awaiting_decision" as const,
      candidate: structuredClone(base.candidate),
      candidateCorrection: structuredClone(base.candidateCorrection),
      candidateBasisRevision: structuredClone(base.candidateBasisRevision),
      basis: structuredClone(base.basis),
      qualifications: structuredClone(base.qualifications),
      validation: structuredClone(base.validation),
      consequences: structuredClone(base.consequences),
      commitment: structuredClone(base.commitment),
      changeSet: structuredClone(base.changeSet),
    };
    const second = {
      ...structuredClone(first),
      reviewMemberId: "review_member_01K4F000000000000000000602",
      role: "exception" as const,
      candidate: {
        ...structuredClone(first.candidate),
        id: "candidate-second-member",
        proposed:
          "A second exact working Claim keeps its own validation and decision.",
        difference: "Adds a second independently inspectable working position.",
      },
      validation: {
        state: "needs_judgment" as const,
        label: "Needs source judgment",
        detail: "The exact source stance requires a responsible decision.",
      },
    };
    return {
      ...base,
      lifecycle: "open",
      reviewMemberId: first.reviewMemberId,
      memberRole: first.role,
      memberOutcome: first.outcome,
      members: [first, second],
    };
  };

  const controlledWritingReview = (): ReviewSession => {
    const controlled = structuredClone(review);
    controlled.projectId = "project_01K4E000000000000000000001";
    controlled.lifecycle = "open";
    controlled.title = "Review the controlled-writing Requirement";
    controlled.objective =
      "Inspect the exact Requirement and governing relationship without implying a writing Apply path.";
    controlled.candidate = {
      id: "review_member_01K4E000000000000000000011",
      revision: "Requirement revision 1 · Governing relationship revision 1",
      kind: "Requirement and governing link",
      current:
        "No authoritative controlled-writing representation is installed",
      proposed:
        "The operating procedure must identify the exact authority source for each mandatory step.",
      difference:
        "Adds one non-authoritative Requirement and its exact GOVERNS relationship to Review. No controlled-writing mutation operation or Apply path is installed.",
      origin: "Project author",
      originDetail: "Direct edit · exact human-authored working records",
    };
    controlled.basis = [
      {
        id: "project_source_01K4E000000000000000000006",
        label: "Authority source",
        relation: "Governing link",
        extent: "Constraint",
        detail:
          "The named authority source is the recorded basis for this proposed requirement.",
        sourceId: "project_source_01K4E000000000000000000006",
      },
    ];
    controlled.validation = {
      state: "needs_judgment",
      label: "Validation pending",
      detail:
        "The exact controlled-writing working records remain pending validation. Review inclusion does not approve the Requirement or create an Apply path.",
    };
    controlled.consequences = [
      "The exact Requirement remains non-authoritative working state.",
      "No controlled-writing ChangeSet operation, Approval, or Apply path is installed.",
      "Review composition leaves the authority source, producer provenance, and Project authority unchanged.",
    ];
    controlled.commitment = {
      available: false,
      reason:
        "Petra has no controlled-writing ChangeSet operation, Approval, or Apply path.",
    };
    delete controlled.changeSet;
    return controlled;
  };

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
    expect(markup).not.toContain("<dt>Bound to</dt>");
  });

  it("uses the correct decision count language for multiple open Reviews", () => {
    const second = structuredClone(review);
    second.id = "review-second-decision";
    const markup = render(
      <ReviewCollectionSurface project={project} reviews={[review, second]} />,
    );

    expect(markup).toContain("2 decisions need your attention");
  });

  it("presents Current, Candidate, origin, basis, consequence, and exact ChangeSet", () => {
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("Responsible author: Project author");
    expect(markup).toContain('<p class="reference-eyebrow">Review session</p>');
    expect(markup).toContain(
      '<details class="review-session__record-details"><summary>Review record details</summary>',
    );
    expect(markup).toContain("<dt>Authority snapshot</dt><dd>Snapshot 18</dd>");
    expect(markup).toContain('class="review-validation" data-state="');
    expect(markup).toContain("Current · authoritative");
    expect(markup).toContain('<h2 id="review-comparison-title" tabindex="-1">');
    expect(markup).toContain("No accepted relationship");
    expect(markup).toContain("Candidate · working");
    expect(markup).toContain("Inquiry analyst");
    expect(markup).toContain("Actuator maintenance note");
    expect(markup).toContain("Limitations and qualifications");
    expect(markup).toContain(
      "No working-state qualification record is available",
    );
    expect(markup).toContain("Commitment blocked");
    expect(markup).toContain("Changes to apply");
    expect(markup).toContain("One atomic ChangeSet · 1 proposed change");
    expect(markup).toContain("No accepted finding is replaced or removed");
    expect(markup).toContain(
      "?from=review&amp;reviewId=review-service-link&amp;basisId=basis-maintenance-note",
    );
  });

  it("uses the validation state's own symbol for passed and pending material checks", () => {
    const passed = structuredClone(review);
    passed.validation = {
      state: "passed",
      label: "Applicable checks passed",
      detail: "The exact working checks passed.",
    };
    const pending = structuredClone(review);
    pending.validation = {
      state: "needs_judgment",
      label: "Needs source judgment",
      detail: "The basis requires a responsible decision.",
    };

    expect(
      render(<ReviewSessionSurface project={project} review={passed} />),
    ).toContain(
      'class="review-validation" data-state="passed" aria-labelledby="review-validation-title"><span aria-hidden="true">✓</span>',
    );
    expect(
      render(<ReviewSessionSurface project={project} review={pending} />),
    ).toContain(
      'class="review-validation" data-state="needs_judgment" aria-labelledby="review-validation-title"><span aria-hidden="true">!</span>',
    );
  });

  it("keeps exact working limitations visible and separate from validation", () => {
    const limited = structuredClone(review);
    limited.candidate.workingOrigin = {
      recordId: "working_candidate_01K4D000000000000000000701",
      revision: 2,
      contentHash: `sha256:${"7".repeat(64)}`,
      producerActorId: "actor_01K4D000000000000000000702",
      producerActorKind: "model",
      originKind: "model_output",
      originSummary: "The retained model output proposed this correction.",
      originRecordIds: ["model_call_01K4D000000000000000000703"],
      provenance: [
        {
          role: "model_call",
          recordId: "model_call_01K4D000000000000000000703",
          statement: "The exact model call produced the proposal.",
        },
      ],
    };
    limited.qualifications = [
      {
        recordKind: "candidate",
        recordId: "working_candidate_01K4D000000000000000000701",
        assessmentState: "stated",
        statements: [
          {
            kind: "limitation",
            statement:
              "The bounded passage does not establish broader generalization.",
            basisRecordId: "basis-observation-log",
          },
        ],
      },
    ];
    const markup = render(
      <ReviewSessionSurface project={project} review={limited} />,
    );

    expect(markup).toContain("Limitations and qualifications");
    expect(markup).toContain("exact non-authoritative working records");
    expect(markup).toContain(
      "The bounded passage does not establish broader generalization",
    );
    expect(markup).toContain("Basis: <code>basis-observation-log</code>");
    expect(markup).toContain("Exact working origin and provenance");
    expect(markup).toContain("actor_01K4D000000000000000000702");
    expect(markup).toContain("model_call_01K4D000000000000000000703");
    expect(markup).toContain("Commitment blocked");
  });

  it("enables only the exact defer command without implying other authority", () => {
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("the server rechecks lifecycle and authority");
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(markup).toContain("Apply unavailable");
    expect(markup).toContain("Reject candidate");
    expect(markup).toContain("Decide later");
    expect(markup).toContain('href="#review-decision-actions"');
    expect(markup).toContain('id="review-decision-actions" tabindex="-1"');
    expect(markup).toContain("Material validation is blocked:");
    expect(markup).toContain(
      '<details class="review-decision__conditions"><summary>Exact decision and recovery conditions</summary>',
    );
    expect(markup).toContain('data-operation="defer_review_session"');
    expect(markup).toContain("Reason for deciding later (optional)");
    expect(markup).toContain(
      '<details class="review-decision__defer-input"><summary>Add a reason for deciding later (optional)</summary>',
    );
    expect(markup).toContain("A scheduled revisit time is not supported yet");
    expect(markup).toContain(
      'href="/projects/inlet-cycle/brief#attention-source-depth"',
    );
  });

  it("offers rejection preparation only for an exact current open member", () => {
    const rejectable: ReviewSession = {
      ...structuredClone(review),
      lifecycle: "open",
      reviewMemberId: "review_member_01K4D000000000000000000005",
    };
    const markup = render(
      <ReviewSessionSurface project={project} review={rejectable} />,
    );
    const control = markup.match(
      /<button[^>]*data-operation="reject_review_candidate"[^>]*>/u,
    )?.[0];
    expect(control).toBeDefined();
    expect(control).not.toContain("aria-disabled");
    expect(markup).toContain(
      "Rejection records a rejected Approval for the complete ChangeSet",
    );
  });

  it("preserves the shared Review hierarchy while making controlled-writing commitment unavailable", () => {
    const controlled = controlledWritingReview();
    const writingProject = {
      ...project,
      id: controlled.projectId,
      title: "Controlled operating procedure",
      profile: {
        ...project.profile,
        label: "Controlled writing",
        terms: {
          focus: "Document purpose",
          focusPlural: "Document purposes",
          finding: "Requirement",
          findingPlural: "Requirements",
          reference: "Authority source",
          referencePlural: "Authority sources",
        },
      },
    };
    const markup = render(
      <ReviewSessionSurface project={writingProject} review={controlled} />,
    );

    for (const sharedRole of [
      "Current and Candidate",
      "Origin",
      "Basis",
      "Consequences",
      "Decision",
      "Recovery",
      "Validation pending",
    ]) {
      expect(markup).toContain(sharedRole);
    }
    expect(markup).toContain("Authority source");
    expect(markup).toContain("Governing link");
    expect(markup).toContain("Proposed effect · no Apply path");
    expect(markup).toContain("Commitment unavailable");
    expect(markup).toContain("No Apply path installed");
    expect(markup).toContain("Preparation unavailable");
    expect(markup).toContain("Apply unavailable");
    expect(markup).toContain(
      "The candidate remains non-authoritative working state",
    );
    expect(markup).not.toContain("Prepare changes to apply");
    expect(markup).not.toContain("Edit working Claim text");
    expect(markup).not.toContain("Apply requires the exact server-prepared");
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

  it("places Change basis in the frozen Basis role and keeps Claim text separate", () => {
    const reviewWithBasis = basisReview();
    const markup = render(
      <ReviewSessionSurface
        project={project}
        review={reviewWithBasis}
        initialBasisEditOpen
      />,
    );

    expect(markup).toContain("Edit candidate");
    expect(markup).toContain("Change basis");
    expect(markup).toContain('aria-controls="review-basis-editor"');
    expect(markup).toContain("Revise material source basis");
    expect(markup).toContain("Separate from Claim-text correction");
    expect(markup).toContain("Retained source coverage");
    expect(markup).toContain("Source stance");
    expect(markup).toContain("Source attribution");
    expect(markup).toContain("Modality");
    expect(markup).toContain("Source statement is negated");
    expect(markup).toContain("Reason for material basis revision");
    expect(markup).toContain(
      "This operation cannot change it; server authority rejects incompatible coverage",
    );
    expect(markup).toContain('data-operation="revise_review_candidate_basis"');
    expect(markup).toContain(
      reviewWithBasis.candidateBasisRevision?.projectSourceId ?? "missing",
    );
    expect(markup).toContain(
      "does not change Claim text, decide the Review, or apply anything",
    );
    expect(markup.indexOf("Edit working Claim text")).toBeLessThan(
      markup.indexOf("Revise material source basis"),
    );

    const withoutExactSource = basisReview();
    if (withoutExactSource.candidateBasisRevision !== undefined) {
      delete withoutExactSource.candidateBasisRevision.expectedProjectSourceRef;
    }
    const unavailableMarkup = render(
      <ReviewSessionSurface project={project} review={withoutExactSource} />,
    );
    expect(unavailableMarkup).toContain("Change basis");
    expect(unavailableMarkup).toContain(
      "do not supply the exact active ProjectSource revision",
    );
    expect(unavailableMarkup).not.toContain(
      'data-operation="revise_review_candidate_basis"',
    );
  });

  it("retains local basis fields and the exact uncertain command", () => {
    const reviewWithBasis = basisReview();
    const draft = {
      sourceScope: "full_text",
      detailLevel: "broad",
      sourceStance: "qualifies",
      attribution: "The study authors",
      modality: "hedged",
      negated: false,
      uncertainty: "The exact passage qualifies the result.",
      reason: "Retain the material source qualification.",
    } as const;
    const input = createReviewCandidateBasisRevisionCommandInput(
      reviewWithBasis,
      draft,
      {
        commandId: "command_01K4E000000000000000000304",
        idempotencyKey: "review-session:001:basis:surface:v1",
      },
    );
    let editor = createReviewCandidateBasisEditorState();
    editor = reviewCandidateBasisEditorReducer(editor, { type: "toggle" });
    editor = reviewCandidateBasisEditorReducer(editor, {
      type: "draft_changed",
      draft,
    });
    editor = reviewCandidateBasisEditorReducer(editor, {
      type: "revision_started",
      input,
    });
    const uncertain = reviewCandidateBasisRevisionFailureState(
      new TypeError("connection closed"),
      input,
    );
    if (
      uncertain.state === "idle" ||
      uncertain.state === "pending" ||
      uncertain.state === "success"
    ) {
      throw new Error("Expected an uncertain basis-revision state.");
    }
    editor = reviewCandidateBasisEditorReducer(editor, {
      type: "revision_failed",
      revision: uncertain,
    });
    const locked = reviewCandidateBasisEditorReducer(editor, {
      type: "draft_changed",
      draft: { ...draft, reason: "A different command must not replace it." },
    });
    expect(locked).toBe(editor);
    expect(locked.revision).toEqual({ state: "uncertain", input });
    expect(locked.draft).toEqual(draft);

    const closed = reviewCandidateBasisEditorReducer(locked, {
      type: "toggle",
    });
    const reopened = reviewCandidateBasisEditorReducer(closed, {
      type: "toggle",
    });
    expect(reopened).toMatchObject({ expanded: true, draft });
    const reloaded = reviewCandidateBasisEditorReducer(reopened, {
      type: "review_reloaded",
    });
    expect(reloaded).toMatchObject({
      expanded: true,
      draft,
      revision: { state: "idle" },
    });
  });

  it("presents material basis outcomes without implying validation or authority", () => {
    const reviewWithBasis = basisReview();
    const input = createReviewCandidateBasisRevisionCommandInput(
      reviewWithBasis,
      {
        sourceScope: "full_text",
        detailLevel: "broad",
        sourceStance: "qualifies",
        attribution: "The study authors",
        modality: "hedged",
        negated: false,
        reason: "Retain the material source qualification.",
      },
      {
        commandId: "command_01K4E000000000000000000305",
        idempotencyKey: "review-session:001:basis:surface:v2",
      },
    );
    const clientError = (
      status: number,
      code: string,
    ): ReviewCandidateBasisRevisionClientError =>
      new ReviewCandidateBasisRevisionClientError("rejected", status, {
        error: { code },
      });
    const states = [
      reviewCandidateBasisRevisionFailureState(
        clientError(409, "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE"),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        clientError(
          403,
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED",
        ),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        clientError(422, "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED"),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        clientError(409, "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE"),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        clientError(422, "REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE"),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        clientError(409, "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_ID_REUSED"),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        new ReviewCandidateBasisRevisionClientError("invalid result", 200, {}),
        input,
      ),
      reviewCandidateBasisRevisionFailureState(
        new TypeError("connection closed"),
        input,
      ),
    ];
    expect(states.map((state) => state.state)).toEqual([
      "stale",
      "unauthorized",
      "unsupported_profile",
      "incompatible_source",
      "no_material_change",
      "retry_mismatch",
      "invalid_response",
      "uncertain",
    ]);
    const markups = states.map((revision) =>
      render(
        <ReviewCandidateBasisRevisionNotice
          review={reviewWithBasis}
          revision={revision}
          onRetry={() => undefined}
          onReload={() => undefined}
        />,
      ),
    );
    expect(markups[0]).toContain("Review changed before the basis revision");
    expect(markups[1]).toContain("was not authorized");
    expect(markups[2]).toContain("cannot revise source basis");
    expect(markups[3]).toContain("Source basis is incompatible");
    expect(markups[4]).toContain("No material basis change was recorded");
    expect(markups[5]).toContain(
      "Command identity belongs to another basis revision",
    );
    expect(markups[6]).toContain("could not be verified");
    expect(markups[6]).toContain("Retry exact basis revision");
    expect(markups[7]).toContain("result is not yet confirmed");
    expect(markups[7]).toContain("Retry exact basis revision");
    for (const markup of markups) {
      expect(markup).toContain('role="alert"');
      expect(markup).not.toContain("Review approved");
      expect(markup).not.toContain("Validation passed");
      expect(markup).not.toContain("Applied to Project");
    }

    const appliedMarkup = render(
      <ReviewCandidateBasisRevisionNotice
        review={reviewWithBasis}
        revision={{ state: "success", applied: true, input }}
        onRetry={() => undefined}
      />,
    );
    const retainedMarkup = render(
      <ReviewCandidateBasisRevisionNotice
        review={reviewWithBasis}
        revision={{ state: "success", applied: false, input }}
        onRetry={() => undefined}
      />,
    );
    expect(appliedMarkup).toContain("Working basis revision confirmed");
    expect(appliedMarkup).toContain("Validation was reset to pending");
    expect(appliedMarkup).toContain(
      "did not approve, reject, apply, or create domain authority",
    );
    expect(retainedMarkup).toContain("Exact basis result recovered");
    expect(retainedMarkup).toContain("without applying it again");
    expect(retainedMarkup).not.toContain(input.request.command_id);
  });

  it("places Separate changes in the accepted multi-member Review hierarchy", () => {
    const multi = multiMemberReview();
    const markup = render(
      <ReviewSessionSurface project={project} review={multi} />,
    );

    expect(markup).toContain("Review members");
    expect(markup).toContain("2 exact members");
    expect(markup).toContain("Selection changes only this presentation");
    expect(markup).toContain(multi.members?.[0]?.reviewMemberId ?? "missing");
    expect(markup).toContain(multi.members?.[1]?.reviewMemberId ?? "missing");
    expect(markup).toContain(
      "A second exact working Claim keeps its own validation and decision",
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("Separate changes");
    expect(markup).toContain('data-operation="separate_review_session_member"');
    expect(markup).toContain("Separation changes only Review membership");
    expect(markup).toContain(
      "does not validate, approve, reject, apply, recover, or establish semantic compatibility",
    );
    expect(markup).not.toContain("compatible members");

    const second = multi.members?.[1];
    if (second === undefined) throw new Error("Expected a second member.");
    const selected = reviewSessionWithMember(multi, second);
    expect(selected.reviewMemberId).toBe(second.reviewMemberId);
    expect(selected.candidate.proposed).toBe(second.candidate.proposed);
    expect(selected.validation).toEqual(second.validation);
    expect(selected.basis).toEqual(second.basis);
    expect(selected.consequences).toEqual(second.consequences);
  });

  it("retains exact Review, member, command, and idempotency identities for separation", () => {
    const multi = multiMemberReview();
    const second = multi.members?.[1];
    if (second === undefined) throw new Error("Expected a second member.");
    const input = createReviewSessionSeparationCommandInput(
      multi,
      second.reviewMemberId,
      {
        commandId: "command_01K4F000000000000000000603",
        idempotencyKey: "review-session:surface:separation:603",
      },
    );

    expect(input.request).toEqual({
      command_id: "command_01K4F000000000000000000603",
      idempotency_key: "review-session:surface:separation:603",
      expected_review_session_ref: {
        review_session_id: multi.id,
        revision: multi.exactRef.revision,
        content_hash: multi.exactRef.contentHash,
        lifecycle: "open",
      },
      review_member_id: second.reviewMemberId,
    });
    const uncertain = reviewSessionSeparationFailureState(
      new TypeError("connection closed"),
      input,
    );
    expect(uncertain).toEqual({ state: "uncertain", input });
    const markup = render(
      <ReviewSessionSeparationNotice
        projectId={multi.projectId}
        review={multi}
        separation={uncertain}
        onRetry={() => undefined}
      />,
    );
    expect(markup).toContain("Retry exact separation");
    expect(markup).toContain("exact retained request");
    expect(markup).not.toContain(input.request.command_id);
  });

  it("presents every material separation outcome without claiming compatibility or authority", () => {
    const multi = multiMemberReview();
    const second = multi.members?.[1];
    if (second === undefined) throw new Error("Expected a second member.");
    const input = createReviewSessionSeparationCommandInput(
      multi,
      second.reviewMemberId,
      {
        commandId: "command_01K4F000000000000000000604",
        idempotencyKey: "review-session:surface:separation:604",
      },
    );
    const clientError = (
      status: number,
      code: string,
    ): ReviewSessionSeparationClientError =>
      new ReviewSessionSeparationClientError("rejected", status, {
        error: { code },
      });
    const states = [
      reviewSessionSeparationFailureState(
        clientError(409, "REVIEW_SESSION_SEPARATION_STALE_SESSION"),
        input,
      ),
      reviewSessionSeparationFailureState(
        clientError(422, "REVIEW_SESSION_SEPARATION_MEMBER_NOT_FOUND"),
        input,
      ),
      reviewSessionSeparationFailureState(
        clientError(403, "REVIEW_SESSION_SEPARATION_COMMAND_NOT_AUTHORIZED"),
        input,
      ),
      reviewSessionSeparationFailureState(
        clientError(422, "REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED"),
        input,
      ),
      reviewSessionSeparationFailureState(
        clientError(422, "REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE"),
        input,
      ),
      reviewSessionSeparationFailureState(
        clientError(409, "REVIEW_SESSION_SEPARATION_COMMAND_ID_REUSED"),
        input,
      ),
      reviewSessionSeparationFailureState(
        new ReviewSessionSeparationClientError("invalid result", 200, {}),
        input,
      ),
    ];
    expect(states.map((state) => state.state)).toEqual([
      "stale",
      "stale",
      "unauthorized",
      "unsupported_profile",
      "not_separable",
      "retry_mismatch",
      "invalid_response",
    ]);
    const markups = states.map((separation) =>
      render(
        <ReviewSessionSeparationNotice
          projectId={multi.projectId}
          review={multi}
          separation={separation}
          onRetry={() => undefined}
          onReload={() => undefined}
        />,
      ),
    );
    expect(markups[0]).toContain("Review changed before separation");
    expect(markups[0]).toContain("Reload Review");
    expect(markups[1]).toContain("Review changed before separation");
    expect(markups[2]).toContain("was not authorized");
    expect(markups[3]).toContain("cannot separate members");
    expect(markups[4]).toContain("cannot be separated");
    expect(markups[4]).toContain("existing ChangeSet boundaries");
    expect(markups[5]).toContain(
      "Command identity belongs to another separation",
    );
    expect(markups[6]).toContain("could not be verified");
    expect(markups[6]).toContain("Retry exact separation");
    for (const markup of markups) {
      expect(markup).toContain('role="alert"');
      expect(markup).not.toContain("Validation passed");
      expect(markup).not.toContain("Review approved");
      expect(markup).not.toContain("Applied to Project");
      expect(markup).not.toContain("members are compatible");
    }

    const successMarkup = render(
      <ReviewSessionSeparationNotice
        projectId={multi.projectId}
        review={multi}
        separation={{
          state: "success",
          applied: true,
          input,
          sourceReviewSessionId: multi.id,
          separatedReviewSessionId: "review_session_01K4F000000000000000000605",
        }}
        onRetry={() => undefined}
      />,
    );
    expect(successMarkup).toContain("Review member separated");
    expect(successMarkup).toContain("Open separated Review");
    expect(successMarkup).toContain(
      "/review/review_session_01K4F000000000000000000605",
    );
    expect(successMarkup).toContain(
      "did not validate, approve, reject, apply, recover a member, grant graph or domain authority, or establish semantic compatibility",
    );
    expect(successMarkup).not.toContain(input.request.command_id);
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
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(4);
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
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(markup).not.toContain("Reason for deciding later (optional)");
  });

  it("keeps stale Review refresh automatic and bound to the runtime-supplied open lifecycle", () => {
    const stale = structuredClone(review);
    stale.snapshotState = "stale";
    stale.lifecycle = "open";
    const markup = render(
      <ReviewSessionSurface project={project} review={stale} />,
    );

    expect(markup).toContain("Refresh Review");
    expect(markup).not.toContain('data-operation="refresh_review_session"');
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
