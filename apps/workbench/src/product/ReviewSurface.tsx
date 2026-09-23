import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";

import { PetraMark } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraTextArea,
  PetraTextField,
} from "../design-system/primitives.js";
import type {
  ProjectRecord,
  ReviewSession,
  ReviewSessionMember,
} from "./model.js";
import {
  ProjectDataError,
  createReviewCandidateBasisRevisionCommandInput,
  createReviewCandidateCorrectionCommandInput,
  createReviewSessionDeferCommandInput,
  createReviewSessionRefreshCommandInput,
  createReviewSessionReopenCommandInput,
  createReviewSessionSeparationCommandInput,
  executeReviewCandidateBasisRevisionCommand,
  executeReviewCandidateCorrectionCommand,
  executeReviewSessionLifecycleCommand,
  executeReviewSessionRefreshCommand,
  executeReviewSessionSeparationCommand,
  type ReviewCandidateBasisRevisionCommandInput,
  type ReviewCandidateBasisRevisionDraft,
  type ReviewCandidateCorrectionCommandInput,
  type ReviewSessionLifecycleCommandInput,
  type ReviewSessionRefreshCommandInput,
  type ReviewSessionSeparationCommandInput,
} from "./project-data.js";
import { useProjectRecord } from "./ReferenceWorkbench.js";
import { AgentControlPortal } from "./AgentControlPlane.js";

import {
  createReviewApplyController,
  ReviewApplyNotice,
  ReviewApplyPreview,
  type ReviewApplyState,
} from "./ReviewApply.js";
import {
  createReviewRejectController,
  ReviewRejectNotice,
  type ReviewRejectState,
} from "./ReviewReject.js";

import { ReviewRecovery } from "./ReviewRecovery.js";
import {
  FocusedGraphEntryLink,
  scientificFocusedGraphEntryDraft,
  type FocusedGraphActionPreviewTarget,
} from "./focused-graph-entry.js";

const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;

const graphCorrectionTarget = (
  review: ReviewSession,
): FocusedGraphActionPreviewTarget | undefined => {
  const correction = review.candidateCorrection;
  return correction !== undefined &&
    REVIEW_SESSION_ID.test(review.id) &&
    REVIEW_MEMBER_ID.test(correction.reviewMemberId)
    ? {
        action_kind: "governed_correction",
        requested_change: "edit_relationship",
        review_session_id: review.id,
        review_member_id: correction.reviewMemberId,
      }
    : undefined;
};

const ReviewState = ({ review }: { review: ReviewSession }) => (
  <span className="review-state" data-state={review.status}>
    <span aria-hidden="true">
      {review.status === "needs_decision"
        ? "!"
        : review.status === "completed"
          ? "✓"
          : "…"}
    </span>
    {review.statusLabel}
  </span>
);

const ValidationState = ({ review }: { review: ReviewSession }) => (
  <span className="review-state" data-state={review.validation.state}>
    <span aria-hidden="true">
      {review.validation.state === "passed"
        ? "✓"
        : review.validation.state === "blocked"
          ? "×"
          : "!"}
    </span>
    {review.validation.label}
  </span>
);

const ReviewBasisSelect = ({
  id,
  label,
  hint,
  value,
  disabled,
  children,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  children: React.ReactNode;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
}): React.JSX.Element => (
  <label className="petra-field" htmlFor={id}>
    <span className="petra-field__label">
      {label}
      <span className="petra-field__required">Required</span>
    </span>
    <span className="petra-field__hint" id={`${id}-hint`}>
      {hint}
    </span>
    <select
      className="petra-field__control petra-control--comfortable"
      id={id}
      required
      value={value}
      disabled={disabled}
      aria-describedby={`${id}-hint`}
      onChange={onChange}
    >
      {children}
    </select>
  </label>
);

export type ReviewLifecyclePresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewSessionLifecycleCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewSessionLifecycleCommandInput;
    }
  | {
      readonly state: "stale" | "unauthorized" | "uncertain" | "failed";
      readonly input: ReviewSessionLifecycleCommandInput;
    };

export const reviewLifecycleFailureState = (
  error: unknown,
  input: ReviewSessionLifecycleCommandInput,
): ReviewLifecyclePresentationState => {
  if (error instanceof ProjectDataError && error.status === 409) {
    return { state: "stale", input };
  }
  if (
    error instanceof ProjectDataError &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    !(error instanceof ProjectDataError) ||
    error.status >= 500 ||
    error.status === 408
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewLifecycleNotice = ({
  review,
  lifecycle,
  onRetry,
  onRefresh,
}: {
  review: ReviewSession;
  lifecycle: ReviewLifecyclePresentationState;
  onRetry: (input: ReviewSessionLifecycleCommandInput) => void;
  onRefresh?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (lifecycle.state === "idle") return null;

  const uncertain = lifecycle.state === "uncertain";
  const stale = lifecycle.state === "stale";
  const unauthorized = lifecycle.state === "unauthorized";
  const failed = lifecycle.state === "failed";
  const success = lifecycle.state === "success";
  const reopening = lifecycle.input.requestedAction === "reopen";
  const title =
    lifecycle.state === "pending"
      ? reopening
        ? "Reopening this Review…"
        : "Deferring this Review…"
      : success
        ? lifecycle.applied
          ? reopening
            ? "Review reopened"
            : "Review deferred"
          : reopening
            ? "Review already reopened"
            : "Review deferral confirmed"
        : stale
          ? "Review needs refresh"
          : unauthorized
            ? reopening
              ? "Reopen review was not authorized"
              : "Decide later was not authorized"
            : uncertain
              ? "Command result is not yet confirmed"
              : reopening
                ? "Review was not reopened"
                : "Review was not deferred";
  const detail =
    lifecycle.state === "pending"
      ? reopening
        ? "Petra is checking the exact Review revision and command authority. The Review is not shown as open again yet."
        : "Petra is checking the exact Review revision and command authority. No decision is shown as recorded yet."
      : success
        ? lifecycle.applied
          ? reopening
            ? "The Review is open again. No candidate was approved, rejected, or applied."
            : "The Review is waiting. No candidate was approved, rejected, or applied."
          : reopening
            ? "Petra returned the retained result for this exact command. The Review is open again, and no candidate was approved, rejected, or applied."
            : "Petra returned the retained result for this exact command. The Review is waiting, and no candidate was approved, rejected, or applied."
        : stale
          ? reopening
            ? "This Review changed or no longer accepts this transition. Nothing is shown as reopened; refresh the Review before trying again."
            : "This Review changed or no longer accepts this transition. Nothing is shown as deferred; refresh the Review before deciding again."
          : unauthorized
            ? "Petra did not grant this Review command. The Review remains unchanged in this view."
            : uncertain
              ? "Petra could not verify whether the command took effect. Retry the exact command to reconcile; if it already succeeded, Petra will return its retained result without applying it again."
              : `Petra rejected the command before a verified result was returned. The Review is not shown as ${reopening ? "reopened" : "deferred"} in this view.`;

  return (
    <section
      className="review-lifecycle-notice"
      data-state={lifecycle.state}
      role={stale || unauthorized || uncertain || failed ? "alert" : "status"}
      aria-live={
        stale || unauthorized || uncertain || failed ? "assertive" : "polite"
      }
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {uncertain ? (
        <PetraButton
          variant="secondary"
          onClick={() => onRetry(lifecycle.input)}
        >
          Retry exact command
        </PetraButton>
      ) : null}
      {stale ? (
        <PetraButton variant="secondary" onClick={() => void onRefresh?.()}>
          Refresh Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export type ReviewRefreshPresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewSessionRefreshCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewSessionRefreshCommandInput;
    }
  | {
      readonly state: "conflict" | "unauthorized" | "uncertain" | "failed";
      readonly input: ReviewSessionRefreshCommandInput;
    };

export const reviewRefreshFailureState = (
  error: unknown,
  input: ReviewSessionRefreshCommandInput,
): ReviewRefreshPresentationState => {
  if (error instanceof ProjectDataError && error.status === 409) {
    return { state: "conflict", input };
  }
  if (
    error instanceof ProjectDataError &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    !(error instanceof ProjectDataError) ||
    error.status >= 500 ||
    error.status === 408
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewRefreshNotice = ({
  review,
  refresh,
  onRetry,
  onReload,
}: {
  review: ReviewSession;
  refresh: ReviewRefreshPresentationState;
  onRetry: (input: ReviewSessionRefreshCommandInput) => void;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (refresh.state === "idle") return null;

  const conflict = refresh.state === "conflict";
  const unauthorized = refresh.state === "unauthorized";
  const uncertain = refresh.state === "uncertain";
  const failed = refresh.state === "failed";
  const success = refresh.state === "success";
  const title =
    refresh.state === "pending"
      ? "Refreshing this Review…"
      : success
        ? refresh.applied
          ? "Review refreshed"
          : "Review refresh already confirmed"
        : conflict
          ? "Review changed before refresh"
          : unauthorized
            ? "Review refresh was not authorized"
            : uncertain
              ? "Refresh result is not yet confirmed"
              : "Review was not refreshed";
  const detail =
    refresh.state === "pending"
      ? "Petra is checking the exact Review revision and open lifecycle. The stale comparison remains visible until a result is validated. Nothing is shown as refreshed yet."
      : success
        ? refresh.applied
          ? "Petra refreshed the Review against the current Project position and compatible working heads. Refresh did not approve, reject, apply, or separate anything and did not edit any candidate or basis record."
          : "Petra returned the retained result for this exact command. Refresh was not applied again; it did not approve, reject, apply, or separate anything and did not edit any candidate or basis record."
        : conflict
          ? "The exact Review changed, a compatible refresh could not be composed, or refresh is no longer required. Nothing is shown as refreshed; reload the authenticated Review before choosing another action."
          : unauthorized
            ? "Petra did not grant this refresh command. The stale comparison remains visible, and nothing is shown as refreshed."
            : uncertain
              ? "Petra could not verify whether refresh took effect. Retry the exact command to reconcile; if it already succeeded, Petra will return its retained result without refreshing again."
              : "Petra rejected the refresh before a verified result was returned. The stale comparison remains visible, and nothing is shown as refreshed.";

  return (
    <section
      className="review-lifecycle-notice review-refresh-notice"
      data-state={refresh.state}
      role={
        conflict || unauthorized || uncertain || failed ? "alert" : "status"
      }
      aria-live={
        conflict || unauthorized || uncertain || failed ? "assertive" : "polite"
      }
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {uncertain ? (
        <PetraButton variant="secondary" onClick={() => onRetry(refresh.input)}>
          Retry exact refresh
        </PetraButton>
      ) : null}
      {conflict ? (
        <PetraButton variant="secondary" onClick={() => void onReload?.()}>
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export type ReviewCandidateCorrectionPresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewCandidateCorrectionCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewCandidateCorrectionCommandInput;
    }
  | {
      readonly state:
        | "stale"
        | "unauthorized"
        | "unsupported_profile"
        | "invalid_response"
        | "retry_mismatch"
        | "uncertain"
        | "failed";
      readonly input: ReviewCandidateCorrectionCommandInput;
    };

export interface ReviewCandidateEditorState {
  readonly expanded: boolean;
  readonly draft: string;
  readonly correction: ReviewCandidateCorrectionPresentationState;
}

export type ReviewCandidateEditorAction =
  | { readonly type: "toggle" }
  | { readonly type: "draft_changed"; readonly draft: string }
  | {
      readonly type: "correction_started";
      readonly input: ReviewCandidateCorrectionCommandInput;
    }
  | {
      readonly type: "correction_succeeded";
      readonly input: ReviewCandidateCorrectionCommandInput;
      readonly applied: boolean;
    }
  | {
      readonly type: "correction_failed";
      readonly correction: Exclude<
        ReviewCandidateCorrectionPresentationState,
        { readonly state: "idle" | "pending" | "success" }
      >;
    }
  | { readonly type: "review_reloaded" };

export const createReviewCandidateEditorState = (
  draft: string,
  expanded = false,
): ReviewCandidateEditorState => ({
  expanded,
  draft,
  correction: { state: "idle" },
});

const correctionDraftIsLocked = (
  correction: ReviewCandidateCorrectionPresentationState,
): boolean =>
  correction.state === "pending" ||
  correction.state === "success" ||
  correction.state === "stale" ||
  correction.state === "invalid_response" ||
  correction.state === "retry_mismatch" ||
  correction.state === "uncertain";

export const reviewCandidateEditorReducer = (
  state: ReviewCandidateEditorState,
  action: ReviewCandidateEditorAction,
): ReviewCandidateEditorState => {
  if (action.type === "toggle") {
    return { ...state, expanded: !state.expanded };
  }
  if (action.type === "draft_changed") {
    if (correctionDraftIsLocked(state.correction)) return state;
    return {
      ...state,
      draft: action.draft,
      correction: { state: "idle" },
    };
  }
  if (action.type === "correction_started") {
    return {
      ...state,
      correction: { state: "pending", input: action.input },
    };
  }
  if (action.type === "correction_succeeded") {
    return {
      ...state,
      correction: {
        state: "success",
        input: action.input,
        applied: action.applied,
      },
    };
  }
  if (action.type === "correction_failed") {
    return { ...state, correction: action.correction };
  }
  return { ...state, correction: { state: "idle" } };
};

const isReviewCandidateCorrectionClientError = (
  error: unknown,
): error is Error & { readonly status: number; readonly response: unknown } =>
  error instanceof Error &&
  error.name === "ReviewCandidateCorrectionClientError" &&
  typeof (error as { readonly status?: unknown }).status === "number" &&
  "response" in error;

const correctionErrorCode = (error: unknown): string | undefined => {
  if (!isReviewCandidateCorrectionClientError(error)) {
    return undefined;
  }
  const response = error.response;
  if (
    typeof response !== "object" ||
    response === null ||
    !("error" in response) ||
    typeof response.error !== "object" ||
    response.error === null ||
    !("code" in response.error) ||
    typeof response.error.code !== "string"
  ) {
    return undefined;
  }
  return response.error.code;
};

export const reviewCandidateCorrectionFailureState = (
  error: unknown,
  input: ReviewCandidateCorrectionCommandInput,
): ReviewCandidateCorrectionPresentationState => {
  const code = correctionErrorCode(error);
  if (
    code === "REVIEW_CANDIDATE_CORRECTION_COMMAND_ID_REUSED" ||
    code === "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED"
  ) {
    return { state: "retry_mismatch", input };
  }
  if (code === "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED") {
    return { state: "unsupported_profile", input };
  }
  if (
    isReviewCandidateCorrectionClientError(error) &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    isReviewCandidateCorrectionClientError(error) &&
    (error.status === 404 || error.status === 409)
  ) {
    return { state: "stale", input };
  }
  if (
    (isReviewCandidateCorrectionClientError(error) &&
      error.status >= 200 &&
      error.status < 300) ||
    (error instanceof Error &&
      (error.name === "ContractRegistryError" || error instanceof SyntaxError))
  ) {
    return { state: "invalid_response", input };
  }
  if (
    !isReviewCandidateCorrectionClientError(error) ||
    error.status === 408 ||
    error.status >= 500
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewCandidateCorrectionNotice = ({
  review,
  correction,
  onRetry,
  onReload,
}: {
  review: ReviewSession;
  correction: ReviewCandidateCorrectionPresentationState;
  onRetry: (input: ReviewCandidateCorrectionCommandInput) => void;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (correction.state === "idle") return null;

  const success = correction.state === "success";
  const stale = correction.state === "stale";
  const unauthorized = correction.state === "unauthorized";
  const unsupported = correction.state === "unsupported_profile";
  const invalidResponse = correction.state === "invalid_response";
  const retryMismatch = correction.state === "retry_mismatch";
  const uncertain = correction.state === "uncertain";
  const failed = correction.state === "failed";
  const title =
    correction.state === "pending"
      ? "Saving a working correction…"
      : success
        ? correction.applied
          ? "Working correction confirmed"
          : "Exact correction result recovered"
        : stale
          ? "Review changed before correction"
          : unauthorized
            ? "Candidate correction was not authorized"
            : unsupported
              ? "This Review profile cannot use Claim-text correction"
              : invalidResponse
                ? "Correction response could not be verified"
                : retryMismatch
                  ? "Command identity belongs to another correction"
                  : uncertain
                    ? "Correction result is not yet confirmed"
                    : "Candidate correction was not accepted";
  const detail =
    correction.state === "pending"
      ? "Petra is checking the exact open Review, member, candidate, relationship, and command authority. The candidate shown above remains the loaded revision; nothing is shown as validated, decided, or applied."
      : success
        ? correction.applied
          ? "Petra returned a matching new working revision. The authenticated Review read is being reloaded. This did not approve, reject, apply, report validation success, or create domain authority."
          : "Petra returned the retained matching result for this exact command without applying it again. The authenticated Review read is being reloaded. This was not a Review decision, validation success, application, or domain change."
        : stale
          ? "The Review or one of its exact working references changed. Nothing is shown as corrected. Reload the authenticated Review before creating another command; your draft remains on this page."
          : unauthorized
            ? "Petra did not grant this correction command. The loaded candidate and Review remain unchanged in this view, and the draft remains local."
            : unsupported
              ? "Server authority does not support this exact Review profile for human Claim-text correction. No working revision or Review decision is shown, and the draft remains local."
              : invalidResponse
                ? "The response did not match the typed command and resulting Review identities. This view does not accept it as success. The exact request is retained for reconciliation."
                : retryMismatch
                  ? "The command or idempotency identity is bound to different correction content. Nothing is shown as corrected. Reload the authenticated Review before preparing another command."
                  : uncertain
                    ? "Petra could not verify whether the correction took effect. Retry the exact retained request to reconcile; a completed command returns its stored result without creating another revision."
                    : "Petra rejected the correction before a matching result was returned. The loaded candidate and Review remain unchanged in this view.";
  const alert = !success && correction.state !== "pending";

  return (
    <section
      className="review-lifecycle-notice review-correction-notice"
      data-state={correction.state}
      role={alert ? "alert" : "status"}
      aria-live={alert ? "assertive" : "polite"}
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || unsupported || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {invalidResponse || uncertain ? (
        <PetraButton
          variant="secondary"
          onClick={() => onRetry(correction.input)}
        >
          Retry exact correction
        </PetraButton>
      ) : null}
      {stale || retryMismatch ? (
        <PetraButton variant="secondary" onClick={() => void onReload?.()}>
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export type ReviewCandidateBasisRevisionPresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewCandidateBasisRevisionCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewCandidateBasisRevisionCommandInput;
    }
  | {
      readonly state:
        | "stale"
        | "unauthorized"
        | "unsupported_profile"
        | "incompatible_source"
        | "no_material_change"
        | "invalid_response"
        | "retry_mismatch"
        | "uncertain"
        | "failed";
      readonly input: ReviewCandidateBasisRevisionCommandInput;
    };

export interface ReviewCandidateBasisDraftState {
  readonly sourceScope: "" | ReviewCandidateBasisRevisionDraft["sourceScope"];
  readonly detailLevel: "" | ReviewCandidateBasisRevisionDraft["detailLevel"];
  readonly sourceStance: "" | ReviewCandidateBasisRevisionDraft["sourceStance"];
  readonly attribution: string;
  readonly modality: "" | ReviewCandidateBasisRevisionDraft["modality"];
  readonly negated: boolean;
  readonly uncertainty: string;
  readonly reason: string;
}

export interface ReviewCandidateBasisEditorState {
  readonly expanded: boolean;
  readonly draft: ReviewCandidateBasisDraftState;
  readonly revision: ReviewCandidateBasisRevisionPresentationState;
}

export type ReviewCandidateBasisEditorAction =
  | { readonly type: "toggle" }
  | {
      readonly type: "draft_changed";
      readonly draft: ReviewCandidateBasisDraftState;
    }
  | {
      readonly type: "revision_started";
      readonly input: ReviewCandidateBasisRevisionCommandInput;
    }
  | {
      readonly type: "revision_succeeded";
      readonly input: ReviewCandidateBasisRevisionCommandInput;
      readonly applied: boolean;
    }
  | {
      readonly type: "revision_failed";
      readonly revision: Exclude<
        ReviewCandidateBasisRevisionPresentationState,
        { readonly state: "idle" | "pending" | "success" }
      >;
    }
  | { readonly type: "review_reloaded" };

const emptyBasisDraft = (): ReviewCandidateBasisDraftState => ({
  sourceScope: "",
  detailLevel: "",
  sourceStance: "",
  attribution: "",
  modality: "",
  negated: false,
  uncertainty: "",
  reason: "",
});

export const createReviewCandidateBasisEditorState = (
  expanded = false,
): ReviewCandidateBasisEditorState => ({
  expanded,
  draft: emptyBasisDraft(),
  revision: { state: "idle" },
});

const basisRevisionIsLocked = (
  revision: ReviewCandidateBasisRevisionPresentationState,
): boolean =>
  revision.state === "pending" ||
  revision.state === "success" ||
  revision.state === "stale" ||
  revision.state === "incompatible_source" ||
  revision.state === "invalid_response" ||
  revision.state === "retry_mismatch" ||
  revision.state === "uncertain";

export const reviewCandidateBasisEditorReducer = (
  state: ReviewCandidateBasisEditorState,
  action: ReviewCandidateBasisEditorAction,
): ReviewCandidateBasisEditorState => {
  if (action.type === "toggle") {
    return { ...state, expanded: !state.expanded };
  }
  if (action.type === "draft_changed") {
    if (basisRevisionIsLocked(state.revision)) return state;
    return { ...state, draft: action.draft, revision: { state: "idle" } };
  }
  if (action.type === "revision_started") {
    return {
      ...state,
      revision: { state: "pending", input: action.input },
    };
  }
  if (action.type === "revision_succeeded") {
    return {
      ...state,
      revision: {
        state: "success",
        input: action.input,
        applied: action.applied,
      },
    };
  }
  if (action.type === "revision_failed") {
    return { ...state, revision: action.revision };
  }
  return { ...state, revision: { state: "idle" } };
};

const isReviewCandidateBasisRevisionClientError = (
  error: unknown,
): error is Error & { readonly status: number; readonly response: unknown } =>
  error instanceof Error &&
  error.name === "ReviewCandidateBasisRevisionClientError" &&
  typeof (error as { readonly status?: unknown }).status === "number" &&
  "response" in error;

const basisRevisionErrorCode = (error: unknown): string | undefined => {
  if (!isReviewCandidateBasisRevisionClientError(error)) return undefined;
  const response = error.response;
  if (
    typeof response !== "object" ||
    response === null ||
    !("error" in response) ||
    typeof response.error !== "object" ||
    response.error === null ||
    !("code" in response.error) ||
    typeof response.error.code !== "string"
  ) {
    return undefined;
  }
  return response.error.code;
};

export const reviewCandidateBasisRevisionFailureState = (
  error: unknown,
  input: ReviewCandidateBasisRevisionCommandInput,
): ReviewCandidateBasisRevisionPresentationState => {
  const code = basisRevisionErrorCode(error);
  if (
    code === "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_ID_REUSED" ||
    code === "REVIEW_CANDIDATE_BASIS_REVISION_IDEMPOTENCY_KEY_REUSED"
  ) {
    return { state: "retry_mismatch", input };
  }
  if (code === "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED") {
    return { state: "unsupported_profile", input };
  }
  if (code === "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE") {
    return { state: "incompatible_source", input };
  }
  if (code === "REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE") {
    return { state: "no_material_change", input };
  }
  if (
    isReviewCandidateBasisRevisionClientError(error) &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    isReviewCandidateBasisRevisionClientError(error) &&
    (error.status === 404 || error.status === 409)
  ) {
    return { state: "stale", input };
  }
  if (
    (isReviewCandidateBasisRevisionClientError(error) &&
      error.status >= 200 &&
      error.status < 300) ||
    (error instanceof Error &&
      (error.name === "ContractRegistryError" || error instanceof SyntaxError))
  ) {
    return { state: "invalid_response", input };
  }
  if (
    !isReviewCandidateBasisRevisionClientError(error) ||
    error.status === 408 ||
    error.status >= 500
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewCandidateBasisRevisionNotice = ({
  review,
  revision,
  onRetry,
  onReload,
}: {
  review: ReviewSession;
  revision: ReviewCandidateBasisRevisionPresentationState;
  onRetry: (input: ReviewCandidateBasisRevisionCommandInput) => void;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (revision.state === "idle") return null;

  const success = revision.state === "success";
  const stale = revision.state === "stale";
  const unauthorized = revision.state === "unauthorized";
  const unsupported = revision.state === "unsupported_profile";
  const incompatible = revision.state === "incompatible_source";
  const noMaterialChange = revision.state === "no_material_change";
  const invalidResponse = revision.state === "invalid_response";
  const retryMismatch = revision.state === "retry_mismatch";
  const uncertain = revision.state === "uncertain";
  const failed = revision.state === "failed";
  const title =
    revision.state === "pending"
      ? "Saving a material basis revision…"
      : success
        ? revision.applied
          ? "Working basis revision confirmed"
          : "Exact basis result recovered"
        : stale
          ? "Review changed before the basis revision"
          : unauthorized
            ? "Basis revision was not authorized"
            : unsupported
              ? "This Review profile cannot revise source basis"
              : incompatible
                ? "Source basis is incompatible"
                : noMaterialChange
                  ? "No material basis change was recorded"
                  : invalidResponse
                    ? "Basis response could not be verified"
                    : retryMismatch
                      ? "Command identity belongs to another basis revision"
                      : uncertain
                        ? "Basis revision result is not yet confirmed"
                        : "Basis revision was not accepted";
  const detail =
    revision.state === "pending"
      ? "The exact loaded Review, member, ProjectDefinition, working records, Claim, active ProjectSource, SourceSpans, and command are being checked. Nothing is shown as revised, validated, decided, or applied yet."
      : success
        ? revision.applied
          ? "A matching new working basis revision was returned, and the authenticated Review read is being reloaded. Validation was reset to pending; this did not approve, reject, apply, or create domain authority."
          : "The retained matching result for this exact command was returned without applying it again, and the authenticated Review read is being reloaded. This was not a Review decision, validation success, application, or domain change."
        : stale
          ? "The Review or one of its exact records changed. Nothing is shown as revised. Reload the authenticated Review before creating another command; your unsent basis fields remain on this page."
          : unauthorized
            ? "The basis command was not granted. The loaded basis and Review remain unchanged in this view, and your fields remain local."
            : unsupported
              ? "Server authority does not support material source-basis revision for this exact Review profile. No working revision or Review decision is shown."
              : incompatible
                ? "The active source, SourceSpans, retained source coverage, or registered scientific source semantics are incompatible with this operation. Nothing is shown as revised; reload before preparing another command."
                : noMaterialChange
                  ? "Server authority found no material source-basis change. No working revision, validation reset, Review decision, application, or domain change is shown."
                  : invalidResponse
                    ? "The response did not match the typed command and resulting identities. This view does not accept it as success; the exact request is retained for reconciliation."
                    : retryMismatch
                      ? "The command or idempotency identity is bound to different basis content. Nothing is shown as revised. Reload the authenticated Review before preparing another command."
                      : uncertain
                        ? "The result could not be confirmed. Retry the exact retained request to reconcile; a completed command returns its stored result without creating another revision."
                        : "The basis revision was rejected before a matching result was returned. The loaded basis and Review remain unchanged in this view.";
  const alert = !success && revision.state !== "pending";

  return (
    <section
      className="review-lifecycle-notice review-basis-revision-notice"
      data-state={revision.state}
      role={alert ? "alert" : "status"}
      aria-live={alert ? "assertive" : "polite"}
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success || unauthorized || unsupported || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {invalidResponse || uncertain ? (
        <PetraButton
          variant="secondary"
          onClick={() => onRetry(revision.input)}
        >
          Retry exact basis revision
        </PetraButton>
      ) : null}
      {stale || incompatible || retryMismatch ? (
        <PetraButton variant="secondary" onClick={() => void onReload?.()}>
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export type ReviewSessionSeparationPresentationState =
  | { readonly state: "idle" }
  | {
      readonly state: "pending";
      readonly input: ReviewSessionSeparationCommandInput;
    }
  | {
      readonly state: "success";
      readonly applied: boolean;
      readonly input: ReviewSessionSeparationCommandInput;
      readonly sourceReviewSessionId: string;
      readonly separatedReviewSessionId: string;
    }
  | {
      readonly state:
        | "stale"
        | "unauthorized"
        | "unsupported_profile"
        | "not_separable"
        | "invalid_response"
        | "retry_mismatch"
        | "uncertain"
        | "failed";
      readonly input: ReviewSessionSeparationCommandInput;
    };

const isReviewSessionSeparationClientError = (
  error: unknown,
): error is Error & { readonly status: number; readonly response: unknown } =>
  error instanceof Error &&
  error.name === "ReviewSessionSeparationClientError" &&
  typeof (error as { readonly status?: unknown }).status === "number" &&
  "response" in error;

const separationErrorCode = (error: unknown): string | undefined => {
  if (!isReviewSessionSeparationClientError(error)) return undefined;
  const response = error.response;
  if (typeof response !== "object" || response === null) return undefined;
  if (
    "error" in response &&
    typeof response.error === "object" &&
    response.error !== null &&
    "code" in response.error &&
    typeof response.error.code === "string"
  ) {
    return response.error.code;
  }
  return "error" in response && typeof response.error === "string"
    ? response.error
    : undefined;
};

export const reviewSessionSeparationFailureState = (
  error: unknown,
  input: ReviewSessionSeparationCommandInput,
): ReviewSessionSeparationPresentationState => {
  const code = separationErrorCode(error);
  if (
    code === "REVIEW_SESSION_SEPARATION_COMMAND_ID_REUSED" ||
    code === "REVIEW_SESSION_SEPARATION_IDEMPOTENCY_KEY_REUSED"
  ) {
    return { state: "retry_mismatch", input };
  }
  if (code === "REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED") {
    return { state: "unsupported_profile", input };
  }
  if (code === "REVIEW_SESSION_SEPARATION_MEMBER_NOT_FOUND") {
    return { state: "stale", input };
  }
  if (
    code === "REVIEW_SESSION_SEPARATION_MEMBER_NOT_SEPARABLE" ||
    code === "REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE" ||
    code === "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION" ||
    code === "REVIEW_SESSION_SEPARATION_AMBIGUOUS_MEMBERSHIP" ||
    code === "REVIEW_SESSION_SEPARATION_DESTINATION_CONFLICT"
  ) {
    return { state: "not_separable", input };
  }
  if (
    isReviewSessionSeparationClientError(error) &&
    (error.status === 401 || error.status === 403)
  ) {
    return { state: "unauthorized", input };
  }
  if (
    isReviewSessionSeparationClientError(error) &&
    (error.status === 404 || error.status === 409)
  ) {
    return { state: "stale", input };
  }
  if (
    (isReviewSessionSeparationClientError(error) &&
      error.status >= 200 &&
      error.status < 300) ||
    (error instanceof Error &&
      (error.name === "ContractRegistryError" || error instanceof SyntaxError))
  ) {
    return { state: "invalid_response", input };
  }
  if (
    !isReviewSessionSeparationClientError(error) ||
    error.status === 408 ||
    error.status >= 500
  ) {
    return { state: "uncertain", input };
  }
  return { state: "failed", input };
};

export const ReviewSessionSeparationNotice = ({
  projectId,
  review,
  separation,
  onRetry,
  onReload,
}: {
  projectId: string;
  review: ReviewSession;
  separation: ReviewSessionSeparationPresentationState;
  onRetry: (input: ReviewSessionSeparationCommandInput) => void;
  onReload?: (() => void | Promise<void>) | undefined;
}): React.JSX.Element | null => {
  if (separation.state === "idle") return null;

  const success = separation.state === "success";
  const stale = separation.state === "stale";
  const unauthorized = separation.state === "unauthorized";
  const unsupported = separation.state === "unsupported_profile";
  const notSeparable = separation.state === "not_separable";
  const invalidResponse = separation.state === "invalid_response";
  const retryMismatch = separation.state === "retry_mismatch";
  const uncertain = separation.state === "uncertain";
  const failed = separation.state === "failed";
  const title =
    separation.state === "pending"
      ? "Separating this Review member…"
      : success
        ? separation.applied
          ? "Review member separated"
          : "Retained separation result confirmed"
        : stale
          ? "Review changed before separation"
          : unauthorized
            ? "Review separation was not authorized"
            : unsupported
              ? "This Review profile cannot separate members"
              : notSeparable
                ? "This member cannot be separated"
                : invalidResponse
                  ? "Separation response could not be verified"
                  : retryMismatch
                    ? "Command identity belongs to another separation"
                    : uncertain
                      ? "Separation result is not yet confirmed"
                      : "Review member was not separated";
  const detail =
    separation.state === "pending"
      ? "Petra is checking the exact open Review revision, selected member, command authority, and existing ChangeSet boundaries. All loaded Review membership positions remain unchanged until a matching result is verified."
      : success
        ? separation.applied
          ? "Petra created a separate Review for the exact unchanged member. The authenticated source Review is now reloading. Candidate, relationship, basis, provenance, validation, ChangeSet, Approval, command, event, projection, and member-outcome records were retained. Separation did not validate, approve, reject, apply, recover a member, grant graph or domain authority, or establish semantic compatibility."
          : "Petra returned the retained matching result for this exact command without separating the member again. The authenticated source Review is now reloading. This was not validation, approval, rejection, application, member recovery, a grant of graph or domain authority, or a compatibility finding."
        : stale
          ? "The Review, lifecycle, revision, or selected member changed. Nothing is shown as separated. Reload the authenticated Review before creating another command."
          : unauthorized
            ? "Petra did not grant this separation command. The loaded Review membership remains unchanged in this view."
            : unsupported
              ? "Server authority does not support separation for this exact Review profile. No Review membership or authority change is shown."
              : notSeparable
                ? "Server authority could not complete an exact member partition while retaining the existing ChangeSet boundaries. No Review membership, validation, decision, or authority record changed."
                : invalidResponse
                  ? "The response did not match the exact command, Review revision, member partition, and shared Review context. This view does not accept it as success; the exact request is retained for reconciliation."
                  : retryMismatch
                    ? "The command or idempotency identity is bound to different separation input. Nothing is shown as separated. Reload the authenticated Review before preparing another command."
                    : uncertain
                      ? "Petra could not verify whether separation took effect. Retry the exact retained request to reconcile; a completed command returns its stored partition without separating the member again."
                      : "Petra rejected the separation before a matching result was returned. The loaded Review membership remains unchanged in this view.";
  const alert = !success && separation.state !== "pending";

  return (
    <section
      className="review-lifecycle-notice review-separation-notice"
      data-state={separation.state}
      role={alert ? "alert" : "status"}
      aria-live={alert ? "assertive" : "polite"}
      tabIndex={-1}
    >
      <strong>{title}</strong>
      <p>{detail}</p>
      {success ? (
        <Link
          className="reference-text-link"
          to={`/projects/${encodeURIComponent(projectId)}/review/${encodeURIComponent(separation.separatedReviewSessionId)}`}
        >
          Open separated Review
        </Link>
      ) : null}
      {success || unauthorized || unsupported || notSeparable || failed ? (
        <Link className="reference-text-link" to={review.returnPath}>
          Return to {review.returnLabel}
        </Link>
      ) : null}
      {invalidResponse || uncertain ? (
        <PetraButton
          variant="secondary"
          onClick={() => onRetry(separation.input)}
        >
          Retry exact separation
        </PetraButton>
      ) : null}
      {stale || retryMismatch ? (
        <PetraButton variant="secondary" onClick={() => void onReload?.()}>
          Reload Review
        </PetraButton>
      ) : null}
    </section>
  );
};

export const ReviewCollectionSurface = ({
  project,
  reviews,
}: {
  project: ProjectRecord;
  reviews: ReviewSession[];
}): React.JSX.Element => {
  const needsDecision = reviews.filter(
    (review) => review.status === "needs_decision",
  );
  const waiting = reviews.filter((review) => review.status === "waiting");
  const completed = reviews.filter((review) => review.status === "completed");

  return (
    <main className="reference-surface" id="reference-main">
      <header className="reference-surface-heading">
        <div>
          <p className="reference-eyebrow">Review · current Project</p>
          <h1>Review</h1>
          <p className="reference-lede">
            Inspect exact candidates, basis, differences, and consequences
            before an accountable Project decision.
          </p>
        </div>
      </header>

      {reviews.length === 0 ? (
        <section
          className="reference-empty"
          aria-labelledby="review-empty-title"
        >
          <PetraMark />
          <h2 id="review-empty-title">No decisions are waiting</h2>
          <p>
            Working material stays in its task until a responsible decision is
            required.
          </p>
        </section>
      ) : (
        <>
          <section
            className="review-summary"
            aria-labelledby="review-summary-title"
          >
            <span aria-hidden="true">!</span>
            <div>
              <h2 id="review-summary-title">
                {needsDecision.length} decision needs your attention
              </h2>
              <p>
                {waiting.length + completed.length} other Review{" "}
                {waiting.length + completed.length === 1
                  ? "session does"
                  : "sessions do"}{" "}
                not require an immediate decision.
              </p>
            </div>
          </section>

          <ReviewGroup
            label="Needs your decision"
            reviews={needsDecision}
            project={project}
          />
          <ReviewGroup label="Waiting" reviews={waiting} project={project} />
          <ReviewGroup
            label="Completed"
            reviews={completed}
            project={project}
          />
        </>
      )}
    </main>
  );
};

const ReviewGroup = ({
  label,
  reviews,
  project,
}: {
  label: string;
  reviews: ReviewSession[];
  project: ProjectRecord;
}) => (
  <section
    className="review-group"
    aria-labelledby={`review-group-${label.replaceAll(" ", "-")}`}
  >
    <header>
      <h2 id={`review-group-${label.replaceAll(" ", "-")}`}>{label}</h2>
      <span>{reviews.length}</span>
    </header>
    {reviews.length === 0 ? (
      <p className="review-group__empty">No Review sessions in this group.</p>
    ) : (
      <ol>
        {reviews.map((review) => (
          <li key={review.id}>
            <article className="review-row">
              <div>
                <p>{review.candidate.kind}</p>
                <h3>
                  <Link to={review.id}>{review.title}</Link>
                </h3>
                <span>{review.objective}</span>
              </div>
              <dl>
                <div>
                  <dt>Bound to</dt>
                  <dd>{review.snapshot}</dd>
                </div>
                <div>
                  <dt>Responsible</dt>
                  <dd>{review.responsible}</dd>
                </div>
              </dl>
              <ReviewState review={review} />
              <Link className="reference-text-link" to={review.id}>
                Open decision{" "}
                <span className="visually-hidden">for {review.title}</span>
              </Link>
            </article>
          </li>
        ))}
      </ol>
    )}
    {label === "Needs your decision" && reviews.length > 0 ? (
      <p className="review-group__note">
        Counts represent decisions, not every candidate or graph object in{" "}
        {project.title}.
      </p>
    ) : null}
  </section>
);

export const ReviewCollectionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  return (
    <ReviewCollectionSurface
      project={project}
      reviews={useLoaderData<ReviewSession[]>()}
    />
  );
};

export const reviewSessionWithMember = (
  review: ReviewSession,
  member: ReviewSessionMember,
): ReviewSession => ({
  id: review.id,
  projectId: review.projectId,
  exactRef: { ...review.exactRef },
  title: review.title,
  objective: review.objective,
  status: review.status,
  statusLabel: review.statusLabel,
  ...(review.lifecycle === undefined ? {} : { lifecycle: review.lifecycle }),
  responsible: review.responsible,
  snapshot: review.snapshot,
  snapshotState: review.snapshotState,
  returnLabel: review.returnLabel,
  returnPath: review.returnPath,
  reviewMemberId: member.reviewMemberId,
  memberRole: member.role,
  memberOutcome: member.outcome,
  ...(review.members === undefined ? {} : { members: review.members }),
  candidate: member.candidate,
  ...(member.candidateCorrection === undefined
    ? {}
    : { candidateCorrection: member.candidateCorrection }),
  ...(member.candidateBasisRevision === undefined
    ? {}
    : { candidateBasisRevision: member.candidateBasisRevision }),
  basis: member.basis,
  qualifications: member.qualifications,
  validation: member.validation,
  consequences: member.consequences,
  commitment: member.commitment,
  ...(member.changeSet === undefined ? {} : { changeSet: member.changeSet }),
});

const ReviewMemberNavigation = ({
  members,
  activeMemberId,
  locked,
  focusSelected,
  onSelect,
}: {
  members: ReviewSessionMember[];
  activeMemberId: string;
  locked: boolean;
  focusSelected: boolean;
  onSelect: (reviewMemberId: string) => void;
}): React.JSX.Element => {
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusSelected) selectedButtonRef.current?.focus();
  }, [activeMemberId, focusSelected]);

  return (
    <section className="review-members" aria-labelledby="review-members-title">
      <header>
        <div>
          <p className="reference-panel-kicker">Exact session membership</p>
          <h2 id="review-members-title">Review members</h2>
        </div>
        <span>
          {members.length} exact {members.length === 1 ? "member" : "members"}
        </span>
      </header>
      <p id="review-members-help">
        Choose a member to inspect its Current, Candidate, Origin, Basis,
        Difference, Consequences, and available controls. Selection changes only
        this presentation. Member selection pauses while local edits or exact
        command reconciliation must be retained.
      </p>
      <ol aria-describedby="review-members-help">
        {members.map((member, index) => {
          const selected = member.reviewMemberId === activeMemberId;
          return (
            <li key={member.reviewMemberId}>
              <button
                ref={selected ? selectedButtonRef : undefined}
                type="button"
                className="review-member-selector"
                aria-pressed={selected}
                disabled={locked}
                onClick={() => onSelect(member.reviewMemberId)}
              >
                <span>
                  Member {index + 1} · {member.role}
                </span>
                <strong>{member.candidate.proposed}</strong>
                <small>
                  {member.validation.label} ·{" "}
                  {member.outcome.replaceAll("_", " ")}
                </small>
                <code>{member.reviewMemberId}</code>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const ReviewSessionMemberSurface = ({
  project,
  review,
  applyState,
  rejectState,
  onPrepareApply,
  onApply,
  onDiscardApply,
  onPrepareReject,
  onReject,
  onDiscardReject,
  onReviewChange,
  memberNavigation,
  separation,
  onSeparate,
  onSeparationRetry,
  onSeparationReload,
  onMemberSelectionLockChange,
  initialCandidateEditOpen = false,
  initialBasisEditOpen = false,
}: {
  project: ProjectRecord;
  review: ReviewSession;
  applyState: ReviewApplyState;
  rejectState: ReviewRejectState;
  onPrepareApply: () => void;
  onApply: () => void;
  onDiscardApply: () => void;
  onPrepareReject: () => void;
  onReject: (rationale: string) => void;
  onDiscardReject: () => void;
  onReviewChange?: (() => void | Promise<void>) | undefined;
  memberNavigation?: React.ReactNode;
  separation: ReviewSessionSeparationPresentationState;
  onSeparate: () => void;
  onSeparationRetry: (input: ReviewSessionSeparationCommandInput) => void;
  onSeparationReload: () => void | Promise<void>;
  onMemberSelectionLockChange: (locked: boolean) => void;
  initialCandidateEditOpen?: boolean;
  initialBasisEditOpen?: boolean;
}): React.JSX.Element => {
  const [rationale, setRationale] = useState("");
  const [rejectRationale, setRejectRationale] = useState("");
  const [lifecycle, setLifecycle] = useState<ReviewLifecyclePresentationState>({
    state: "idle",
  });
  const [refresh, setRefresh] = useState<ReviewRefreshPresentationState>({
    state: "idle",
  });
  const [candidateEditor, dispatchCandidateEditor] = useReducer(
    reviewCandidateEditorReducer,
    createReviewCandidateEditorState(
      review.candidate.proposed,
      initialCandidateEditOpen,
    ),
  );
  const [basisEditor, dispatchBasisEditor] = useReducer(
    reviewCandidateBasisEditorReducer,
    createReviewCandidateBasisEditorState(initialBasisEditOpen),
  );
  const decisionRef = useRef<HTMLElement>(null);
  const correctionRef = useRef<HTMLElement>(null);
  const correctionToggleRef = useRef<HTMLDivElement>(null);
  const basisRef = useRef<HTMLElement>(null);
  const basisToggleRef = useRef<HTMLDivElement>(null);
  const candidateEditorWasExpanded = useRef(initialCandidateEditOpen);
  const basisEditorWasExpanded = useRef(initialBasisEditOpen);
  const applyBusy =
    applyState.kind === "preparing" || applyState.kind === "applying";
  const applyLocked =
    applyBusy ||
    applyState.kind === "ready" ||
    applyState.kind === "uncertain" ||
    (applyState.kind === "result" &&
      applyState.result.outcome === "reconciliation_required");
  const applyCheckpoint =
    "checkpoint" in applyState
      ? applyState.checkpoint
      : applyState.kind === "result"
        ? applyState.result.request.checkpoint
        : undefined;
  const rejectBusy =
    rejectState.kind === "preparing" || rejectState.kind === "rejecting";
  const rejectLocked =
    rejectBusy ||
    rejectState.kind === "ready" ||
    rejectState.kind === "uncertain" ||
    rejectState.kind === "result";
  const rejectRationaleError =
    rejectRationale.trim().length === 0
      ? "Enter the material reason for rejecting this ChangeSet."
      : rejectRationale.length > 4_000
        ? "Rejection rationale must contain no more than 4000 characters."
        : undefined;
  const lifecyclePending = lifecycle.state === "pending";
  const refreshPending = refresh.state === "pending";
  const correctionPending = candidateEditor.correction.state === "pending";
  const basisRevisionPending = basisEditor.revision.state === "pending";
  const separationPending = separation.state === "pending";
  const separationIsLocked =
    separation.state === "pending" ||
    separation.state === "success" ||
    separation.state === "stale" ||
    separation.state === "invalid_response" ||
    separation.state === "retry_mismatch" ||
    separation.state === "uncertain";
  const commandPending =
    applyLocked ||
    rejectLocked ||
    lifecyclePending ||
    refreshPending ||
    correctionDraftIsLocked(candidateEditor.correction) ||
    basisRevisionIsLocked(basisEditor.revision) ||
    separationIsLocked;
  const deferPresented =
    review.status === "needs_decision" &&
    review.lifecycle !== "deferred" &&
    review.lifecycle !== "completed" &&
    lifecycle.state !== "success";
  const reopenPresented =
    review.lifecycle === "deferred" && lifecycle.state !== "success";
  const refreshControlPresented =
    review.snapshotState === "stale" &&
    (refresh.state === "idle" || refresh.state === "pending");
  const refreshAvailable =
    !applyLocked &&
    !rejectLocked &&
    refresh.state === "idle" &&
    review.snapshotState === "stale" &&
    review.lifecycle === "open" &&
    !lifecyclePending &&
    !correctionDraftIsLocked(candidateEditor.correction) &&
    !basisRevisionIsLocked(basisEditor.revision) &&
    !separationIsLocked;
  const separationControlPresented =
    (review.members?.length ?? 0) > 1 &&
    review.reviewMemberId !== undefined &&
    (separation.state === "idle" || separation.state === "pending");
  const separationAvailable =
    !applyLocked &&
    !rejectLocked &&
    separation.state === "idle" &&
    review.lifecycle === "open" &&
    !lifecyclePending &&
    !refreshPending &&
    !correctionDraftIsLocked(candidateEditor.correction) &&
    !basisRevisionIsLocked(basisEditor.revision);
  const graphActionTarget = graphCorrectionTarget(review);

  const basisDraftHasInput =
    basisEditor.draft.sourceScope !== "" ||
    basisEditor.draft.detailLevel !== "" ||
    basisEditor.draft.sourceStance !== "" ||
    basisEditor.draft.attribution.length > 0 ||
    basisEditor.draft.modality !== "" ||
    basisEditor.draft.negated ||
    basisEditor.draft.uncertainty.length > 0 ||
    basisEditor.draft.reason.length > 0;
  useEffect(() => {
    onMemberSelectionLockChange(
      candidateEditor.draft !== review.candidate.proposed ||
        candidateEditor.correction.state !== "idle" ||
        basisDraftHasInput ||
        basisEditor.revision.state !== "idle" ||
        lifecycle.state !== "idle" ||
        refresh.state !== "idle",
    );
  }, [
    basisDraftHasInput,
    basisEditor.revision.state,
    candidateEditor.correction.state,
    candidateEditor.draft,
    lifecycle.state,
    onMemberSelectionLockChange,
    refresh.state,
    review.candidate.proposed,
  ]);

  useEffect(() => {
    if (candidateEditor.expanded) {
      correctionRef.current
        ?.querySelector<HTMLTextAreaElement>("textarea")
        ?.focus();
    } else if (candidateEditorWasExpanded.current) {
      correctionToggleRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }
    candidateEditorWasExpanded.current = candidateEditor.expanded;
  }, [candidateEditor.expanded]);

  useEffect(() => {
    if (basisEditor.expanded) {
      basisRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
    } else if (basisEditorWasExpanded.current) {
      basisToggleRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }
    basisEditorWasExpanded.current = basisEditor.expanded;
  }, [basisEditor.expanded]);

  useEffect(() => {
    if (lifecycle.state !== "idle" && lifecycle.state !== "pending") {
      decisionRef.current
        ?.querySelector<HTMLElement>(".review-lifecycle-notice")
        ?.focus();
    }
  }, [lifecycle.state]);

  useEffect(() => {
    if (refresh.state !== "idle" && refresh.state !== "pending") {
      decisionRef.current
        ?.querySelector<HTMLElement>(".review-refresh-notice")
        ?.focus();
    }
  }, [refresh.state]);

  useEffect(() => {
    if (
      candidateEditor.correction.state !== "idle" &&
      candidateEditor.correction.state !== "pending"
    ) {
      correctionRef.current
        ?.querySelector<HTMLElement>(".review-correction-notice")
        ?.focus();
    }
  }, [candidateEditor.correction.state]);

  useEffect(() => {
    if (
      basisEditor.revision.state !== "idle" &&
      basisEditor.revision.state !== "pending"
    ) {
      basisRef.current
        ?.querySelector<HTMLElement>(".review-basis-revision-notice")
        ?.focus();
    }
  }, [basisEditor.revision.state]);

  useEffect(() => {
    if (separation.state !== "idle" && separation.state !== "pending") {
      decisionRef.current
        ?.querySelector<HTMLElement>(".review-separation-notice")
        ?.focus();
    }
  }, [separation.state]);

  const runLifecycleCommand = (
    input: ReviewSessionLifecycleCommandInput,
  ): void => {
    setLifecycle({ state: "pending", input });
    void executeReviewSessionLifecycleCommand(input).then(
      (result) => {
        setLifecycle({ state: "success", applied: result.applied, input });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        setLifecycle(reviewLifecycleFailureState(error, input));
      },
    );
  };

  const deferReview = (): void => {
    const reason = rationale.trim();
    runLifecycleCommand(
      createReviewSessionDeferCommandInput(review, {
        ...(reason.length === 0 ? {} : { rationale: reason }),
      }),
    );
  };

  const reopenReview = (): void => {
    runLifecycleCommand(createReviewSessionReopenCommandInput(review));
  };

  const reloadReview = async (): Promise<void> => {
    if (onReviewChange !== undefined) await onReviewChange();
    setLifecycle({ state: "idle" });
    setRefresh({ state: "idle" });
  };

  const runRefreshCommand = (input: ReviewSessionRefreshCommandInput): void => {
    setRefresh({ state: "pending", input });
    void executeReviewSessionRefreshCommand(input).then(
      (result) => {
        setRefresh({ state: "success", applied: result.applied, input });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        setRefresh(reviewRefreshFailureState(error, input));
      },
    );
  };

  const refreshReview = (): void => {
    runRefreshCommand(createReviewSessionRefreshCommandInput(review));
  };

  const runCandidateCorrection = (
    input: ReviewCandidateCorrectionCommandInput,
  ): void => {
    dispatchCandidateEditor({ type: "correction_started", input });
    void executeReviewCandidateCorrectionCommand(input).then(
      (result) => {
        dispatchCandidateEditor({
          type: "correction_succeeded",
          input,
          applied: result.applied,
        });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        const correction = reviewCandidateCorrectionFailureState(error, input);
        if (
          correction.state === "idle" ||
          correction.state === "pending" ||
          correction.state === "success"
        ) {
          return;
        }
        dispatchCandidateEditor({ type: "correction_failed", correction });
      },
    );
  };

  const submitCandidateCorrection = (
    event: FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    runCandidateCorrection(
      createReviewCandidateCorrectionCommandInput(
        review,
        candidateEditor.draft,
      ),
    );
  };

  const reloadCandidateReview = async (): Promise<void> => {
    if (onReviewChange !== undefined) await onReviewChange();
    dispatchCandidateEditor({ type: "review_reloaded" });
  };

  const runCandidateBasisRevision = (
    input: ReviewCandidateBasisRevisionCommandInput,
  ): void => {
    dispatchBasisEditor({ type: "revision_started", input });
    void executeReviewCandidateBasisRevisionCommand(input).then(
      (result) => {
        dispatchBasisEditor({
          type: "revision_succeeded",
          input,
          applied: result.applied,
        });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        const revision = reviewCandidateBasisRevisionFailureState(error, input);
        if (
          revision.state === "idle" ||
          revision.state === "pending" ||
          revision.state === "success"
        ) {
          return;
        }
        dispatchBasisEditor({ type: "revision_failed", revision });
      },
    );
  };

  const basisDraftError =
    basisEditor.draft.sourceScope === "" ||
    basisEditor.draft.detailLevel === "" ||
    basisEditor.draft.sourceStance === "" ||
    basisEditor.draft.modality === ""
      ? "Choose each required source-semantic field."
      : basisEditor.draft.attribution.trim().length === 0
        ? "Enter the source attribution."
        : basisEditor.draft.attribution.length > 4000
          ? "Source attribution must contain no more than 4000 characters."
          : basisEditor.draft.reason.trim().length === 0
            ? "Enter the material reason for this basis revision."
            : basisEditor.draft.reason.length > 4000
              ? "Material reason must contain no more than 4000 characters."
              : basisEditor.draft.uncertainty.length > 4000
                ? "Uncertainty must contain no more than 4000 characters."
                : undefined;

  const submitCandidateBasisRevision = (
    event: FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    const draft = basisEditor.draft;
    if (
      basisDraftError !== undefined ||
      draft.sourceScope === "" ||
      draft.detailLevel === "" ||
      draft.sourceStance === "" ||
      draft.modality === ""
    ) {
      return;
    }
    runCandidateBasisRevision(
      createReviewCandidateBasisRevisionCommandInput(review, {
        sourceScope: draft.sourceScope,
        detailLevel: draft.detailLevel,
        sourceStance: draft.sourceStance,
        attribution: draft.attribution,
        modality: draft.modality,
        negated: draft.negated,
        uncertainty: draft.uncertainty,
        reason: draft.reason,
      }),
    );
  };

  const reloadBasisReview = async (): Promise<void> => {
    if (onReviewChange !== undefined) await onReviewChange();
    dispatchBasisEditor({ type: "review_reloaded" });
  };

  const candidateTextError =
    candidateEditor.draft.trim().length === 0
      ? "Enter Claim text."
      : candidateEditor.draft.length > 20_000
        ? "Claim text must contain no more than 20000 characters."
        : candidateEditor.draft === review.candidate.proposed
          ? "Change the Claim text before saving."
          : undefined;
  const candidateEditorLocked = correctionDraftIsLocked(
    candidateEditor.correction,
  );
  const basisRevisionContext = review.candidateBasisRevision;
  const basisUnavailableReason =
    review.lifecycle !== "open"
      ? "The authenticated Review read does not supply the exact open lifecycle required for a basis revision."
      : basisRevisionContext?.expectedProjectSourceRef === undefined
        ? "The authenticated reads do not supply the exact active ProjectSource revision required for this basis operation."
        : undefined;

  const lifecycleBoundary = !review.commitment.available
    ? `${review.commitment.reason} Review inclusion and validation do not grant mutation authority.`
    : review.lifecycle === "deferred"
      ? "This Review is deferred. Reopen review sends this exact Review revision to Petra. The server rechecks current lifecycle and authority; seeing Deferred here does not mean the command is eligible or authorized."
      : review.status === "needs_decision"
        ? "Apply and reject each require their own exact server-prepared commitment and one explicit human decision. Rejection records a rejected Approval for the complete ChangeSet; it does not apply the candidate or establish no effect. Decide later sends the exact Review revision to Petra; the server rechecks lifecycle and authority before changing coordination state."
        : review.status === "waiting"
          ? review.lifecycle === "open"
            ? "This Review is waiting for another reason; its exact lifecycle is open. Reopen is unavailable, and the client does not treat Waiting as Deferred."
            : "This Review is waiting. This retained Review read does not supply an exact deferred lifecycle, so Reopen is unavailable."
          : "This Review is completed. No Review lifecycle action is available from this presentation.";
  const refreshBoundary =
    review.snapshotState !== "stale"
      ? ""
      : review.lifecycle === "open"
        ? " This authenticated Review read marks the comparison stale and supplies its exact open lifecycle. Refresh Review sends only the exact Review identity, revision, content hash, and open lifecycle. Seeing Stale and Open here does not establish eligibility or authorization; the server rechecks both. Refresh does not approve, reject, apply, or separate anything and does not edit any candidate or basis record."
        : " This authenticated Review read marks the comparison stale but does not supply the exact open lifecycle required by RefreshReviewSession. Refresh Review is unavailable; the client does not infer lifecycle or eligibility.";
  const separationBoundary =
    (review.members?.length ?? 0) < 2 || review.reviewMemberId === undefined
      ? ""
      : review.lifecycle === "open"
        ? " Separate changes sends this exact Review revision and selected member to Petra. The server rechecks authority and existing ChangeSet boundaries. Separation changes only Review membership; it does not validate, approve, reject, apply, recover, or establish semantic compatibility."
        : " Separate changes is unavailable because this authenticated Review read does not supply an exact open multi-member lifecycle.";
  const decisionBoundary = `${lifecycleBoundary}${refreshBoundary}${separationBoundary}`;

  return (
    <main className="reference-surface review-session" id="reference-main">
      <header className="review-session__heading">
        <Link
          className="reference-context-back"
          to={`/projects/${project.id}/review`}
        >
          <span aria-hidden="true">←</span> Return to Review
        </Link>
        <div className="review-session__orientation">
          <div>
            <p className="reference-eyebrow">
              Review session · {review.snapshot}
            </p>
            <h1>{review.title}</h1>
            <p className="reference-lede">{review.objective}</p>
          </div>
          <ReviewState review={review} />
        </div>
        <dl className="review-session__identity">
          <div>
            <dt>Review identity</dt>
            <dd>
              <code>{review.id}</code>
            </dd>
          </div>
          <div>
            <dt>Responsible author</dt>
            <dd>{review.responsible}</dd>
          </div>
          <div>
            <dt>Return</dt>
            <dd>{review.returnLabel}</dd>
          </div>
        </dl>
      </header>

      {memberNavigation}

      <section
        className="review-validation"
        data-state={review.validation.state}
        aria-labelledby="review-validation-title"
      >
        <span aria-hidden="true">×</span>
        <div>
          <div className="review-validation__title">
            <h2 id="review-validation-title">Material validation state</h2>
            <ValidationState review={review} />
          </div>
          <p>{review.validation.detail}</p>
          {review.validation.recovery === undefined ? null : (
            <p>
              <strong>Recovery:</strong> {review.validation.recovery}
            </p>
          )}
        </div>
      </section>

      <section
        ref={correctionRef}
        className="review-comparison"
        aria-labelledby="review-comparison-title"
      >
        <header>
          <p className="reference-panel-kicker">Exact comparison</p>
          <h2 id="review-comparison-title" tabIndex={-1}>
            Current and Candidate
          </h2>
        </header>
        <div className="review-comparison__positions">
          <article>
            <p>Current · authoritative</p>
            <h3>{review.candidate.current}</h3>
            <span>{review.snapshot}</span>
          </article>
          <article>
            <p>Candidate · working</p>
            <h3>{review.candidate.proposed}</h3>
            <span>{review.candidate.revision}</span>
            {review.candidateCorrection === undefined ? null : (
              <div
                className="review-candidate-edit__toggle"
                ref={correctionToggleRef}
              >
                <PetraButton
                  variant="secondary"
                  density="compact"
                  aria-expanded={candidateEditor.expanded}
                  aria-controls="review-candidate-editor"
                  data-operation="edit_review_candidate"
                  {...(review.lifecycle === "open"
                    ? {}
                    : {
                        unavailable: {
                          reason:
                            "The authenticated Review read does not supply the exact open lifecycle required for correction.",
                        },
                      })}
                  aria-disabled={
                    applyLocked ||
                    lifecyclePending ||
                    refreshPending ||
                    basisRevisionIsLocked(basisEditor.revision) ||
                    separationIsLocked
                  }
                  onClick={() => dispatchCandidateEditor({ type: "toggle" })}
                >
                  Edit candidate
                </PetraButton>
              </div>
            )}
          </article>
        </div>
        {review.candidateCorrection === undefined ||
        !candidateEditor.expanded ? null : (
          <section
            className="review-candidate-edit"
            id="review-candidate-editor"
            aria-labelledby="review-candidate-editor-title"
          >
            <header>
              <div>
                <p className="reference-panel-kicker">Local edit</p>
                <h3 id="review-candidate-editor-title">
                  Edit working Claim text
                </h3>
              </div>
              <span>Not a Review decision</span>
            </header>
            <form onSubmit={submitCandidateCorrection}>
              <PetraTextArea
                id="review-candidate-canonical-text"
                label="Candidate Claim text"
                hint="Along with caller-owned command identity and exact server-supplied Review references, this is the only editable content sent. Petra composes scope, basis, authorship, producer, task, provenance, validation, lineage, and hashes on the server."
                {...(candidateTextError === undefined
                  ? {}
                  : { error: candidateTextError })}
                rows={6}
                maxLength={20_000}
                required
                value={candidateEditor.draft}
                disabled={
                  candidateEditorLocked ||
                  applyLocked ||
                  lifecyclePending ||
                  refreshPending ||
                  basisRevisionIsLocked(basisEditor.revision) ||
                  separationIsLocked
                }
                onChange={(event) =>
                  dispatchCandidateEditor({
                    type: "draft_changed",
                    draft: event.currentTarget.value,
                  })
                }
              />
              <p
                className="review-candidate-edit__local-note"
                id="review-candidate-edit-local-note"
              >
                {candidateEditor.draft.length} of 20000 characters. Closing the
                editor keeps this unsent text on this page. Saving can create a
                new non-authoritative working revision; it does not approve,
                reject, apply, or report validation success.
              </p>
              <PetraButtonGroup label="Candidate edit">
                <PetraButton
                  type="submit"
                  variant="primary"
                  busy={correctionPending}
                  busyLabel="Saving correction…"
                  aria-disabled={
                    candidateTextError !== undefined ||
                    candidateEditorLocked ||
                    applyLocked ||
                    lifecyclePending ||
                    refreshPending ||
                    basisRevisionIsLocked(basisEditor.revision) ||
                    separationIsLocked
                  }
                  aria-describedby="review-candidate-edit-local-note"
                  data-operation="correct_review_candidate"
                >
                  Save working correction
                </PetraButton>
                <PetraButton
                  variant="quiet"
                  onClick={() => dispatchCandidateEditor({ type: "toggle" })}
                >
                  Close editor
                </PetraButton>
              </PetraButtonGroup>
            </form>
          </section>
        )}
        <ReviewCandidateCorrectionNotice
          review={review}
          correction={candidateEditor.correction}
          onRetry={runCandidateCorrection}
          onReload={reloadCandidateReview}
        />
        <div className="review-difference">
          <strong>Material difference</strong>
          <p>{review.candidate.difference}</p>
        </div>
        <dl className="review-origin">
          <div>
            <dt>Origin</dt>
            <dd>
              <strong>{review.candidate.origin}</strong>{" "}
              {review.candidate.originDetail}
            </dd>
          </div>
          <div>
            <dt>Candidate identity</dt>
            <dd>
              <code>{review.candidate.id}</code>
            </dd>
          </div>
        </dl>
        {review.candidate.workingOrigin === undefined ? null : (
          <details className="review-origin-disclosure">
            <summary>Exact working origin and provenance</summary>
            <dl>
              <div>
                <dt>Working candidate</dt>
                <dd>
                  <code>{review.candidate.workingOrigin.recordId}</code> ·
                  revision {review.candidate.workingOrigin.revision} ·{" "}
                  <code>{review.candidate.workingOrigin.contentHash}</code>
                </dd>
              </div>
              <div>
                <dt>Producer</dt>
                <dd>
                  {review.candidate.workingOrigin.producerActorKind} ·{" "}
                  <code>{review.candidate.workingOrigin.producerActorId}</code>
                </dd>
              </div>
              <div>
                <dt>Origin kind</dt>
                <dd>{review.candidate.workingOrigin.originKind}</dd>
              </div>
              <div>
                <dt>Origin summary</dt>
                <dd>{review.candidate.workingOrigin.originSummary}</dd>
              </div>
            </dl>
            <h3>Origin records</h3>
            <ul>
              {review.candidate.workingOrigin.originRecordIds.map(
                (recordId) => (
                  <li key={recordId}>
                    <code>{recordId}</code>
                  </li>
                ),
              )}
            </ul>
            <h3>Provenance records</h3>
            <ol>
              {review.candidate.workingOrigin.provenance.map((item, index) => (
                <li key={`${item.role}:${item.recordId}:${index}`}>
                  <strong>{item.role.replaceAll("_", " ")}</strong> ·{" "}
                  <code>{item.recordId}</code> · {item.statement}
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>

      <div className="review-session__columns">
        <section
          ref={basisRef}
          className="review-basis"
          aria-labelledby="review-basis-title"
        >
          <header className="review-basis__heading">
            <div>
              <p className="reference-panel-kicker">Why and with what limits</p>
              <h2 id="review-basis-title">Basis</h2>
            </div>
            {basisRevisionContext === undefined ? null : (
              <div ref={basisToggleRef}>
                <PetraButton
                  variant="secondary"
                  density="compact"
                  aria-expanded={basisEditor.expanded}
                  aria-controls="review-basis-editor"
                  data-operation="edit_review_candidate_basis"
                  {...(basisUnavailableReason === undefined
                    ? {}
                    : {
                        unavailable: { reason: basisUnavailableReason },
                      })}
                  aria-disabled={
                    applyLocked ||
                    lifecyclePending ||
                    refreshPending ||
                    correctionDraftIsLocked(candidateEditor.correction) ||
                    separationIsLocked
                  }
                  onClick={() => dispatchBasisEditor({ type: "toggle" })}
                >
                  Change basis
                </PetraButton>
              </div>
            )}
          </header>
          <ol>
            {review.basis.map((basis) => (
              <li key={basis.id} id={`basis-${basis.id}`} tabIndex={-1}>
                <div>
                  <span>{basis.relation}</span>
                  <strong>{basis.label}</strong>
                </div>
                <span className="review-basis__extent">{basis.extent}</span>
                <p>{basis.detail}</p>
                {basis.sourceId === undefined ? null : (
                  <Link
                    className="reference-text-link"
                    to={`/projects/${encodeURIComponent(project.id)}/sources/${encodeURIComponent(basis.sourceId)}?from=review&reviewId=${encodeURIComponent(review.id)}&basisId=${encodeURIComponent(basis.id)}`}
                  >
                    Inspect exact source
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <section
            className="review-qualifications"
            aria-labelledby="review-qualifications-title"
          >
            <h3 id="review-qualifications-title">
              Limitations and qualifications
            </h3>
            <p>
              These statements come from the exact non-authoritative working
              records. They remain separate from material validation and the
              Review decision.
            </p>
            {review.qualifications.length === 0 ? (
              <p>No working-state qualification record is available.</p>
            ) : (
              <ol>
                {review.qualifications.map((qualification) => (
                  <li
                    key={`${qualification.recordKind}:${qualification.recordId}`}
                  >
                    <div>
                      <span>{qualification.recordKind}</span>
                      <strong>
                        {qualification.assessmentState.replaceAll("_", " ")}
                      </strong>
                    </div>
                    <code>{qualification.recordId}</code>
                    {qualification.statements.length === 0 ? (
                      <p>No qualification statement was recorded.</p>
                    ) : (
                      <ul>
                        {qualification.statements.map((statement, index) => (
                          <li key={`${statement.kind}:${index}`}>
                            <strong>{statement.kind}</strong>:{" "}
                            {statement.statement}
                            {statement.basisRecordId === undefined ? null : (
                              <>
                                {" "}
                                Basis: <code>{statement.basisRecordId}</code>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
          {basisRevisionContext === undefined ||
          !basisEditor.expanded ? null : (
            <section
              className="review-candidate-edit review-basis-edit"
              id="review-basis-editor"
              aria-labelledby="review-basis-editor-title"
            >
              <header>
                <div>
                  <p className="reference-panel-kicker">Local source fields</p>
                  <h3 id="review-basis-editor-title">
                    Revise material source basis
                  </h3>
                </div>
                <span>Separate from Claim-text correction</span>
              </header>
              <p className="review-basis-edit__exact-source">
                Exact material: ProjectSource{" "}
                <code>{basisRevisionContext.projectSourceId}</code> ·{" "}
                {basisRevisionContext.sourceSpanRefs.length} SourceSpan
                {basisRevisionContext.sourceSpanRefs.length === 1 ? "" : "s"}.
              </p>
              <form onSubmit={submitCandidateBasisRevision}>
                <div className="review-basis-edit__fields">
                  <ReviewBasisSelect
                    id="review-basis-source-scope"
                    label="Retained source coverage"
                    hint="Restate the current coverage shown above. This operation cannot change it; server authority rejects incompatible coverage."
                    value={basisEditor.draft.sourceScope}
                    disabled={commandPending}
                    onChange={(event) =>
                      dispatchBasisEditor({
                        type: "draft_changed",
                        draft: {
                          ...basisEditor.draft,
                          sourceScope: event.currentTarget.value as
                            | ""
                            | ReviewCandidateBasisRevisionDraft["sourceScope"],
                        },
                      })
                    }
                  >
                    <option value="">Choose coverage</option>
                    <option value="full_text">Full text</option>
                    <option value="abstract_only">Abstract only</option>
                  </ReviewBasisSelect>
                  <ReviewBasisSelect
                    id="review-basis-detail-level"
                    label="Detail level"
                    hint="Describe how narrowly this source material supports the unchanged Claim text."
                    value={basisEditor.draft.detailLevel}
                    disabled={commandPending}
                    onChange={(event) =>
                      dispatchBasisEditor({
                        type: "draft_changed",
                        draft: {
                          ...basisEditor.draft,
                          detailLevel: event.currentTarget.value as
                            | ""
                            | ReviewCandidateBasisRevisionDraft["detailLevel"],
                        },
                      })
                    }
                  >
                    <option value="">Choose detail</option>
                    <option value="broad">Broad</option>
                    <option value="detailed">Detailed</option>
                  </ReviewBasisSelect>
                  <ReviewBasisSelect
                    id="review-basis-source-stance"
                    label="Source stance"
                    hint="Record the source's communicative stance; this is not Petra's judgment."
                    value={basisEditor.draft.sourceStance}
                    disabled={commandPending}
                    onChange={(event) =>
                      dispatchBasisEditor({
                        type: "draft_changed",
                        draft: {
                          ...basisEditor.draft,
                          sourceStance: event.currentTarget.value as
                            | ""
                            | ReviewCandidateBasisRevisionDraft["sourceStance"],
                        },
                      })
                    }
                  >
                    <option value="">Choose stance</option>
                    <option value="states">States</option>
                    <option value="hypothesizes">Hypothesizes</option>
                    <option value="reports">Reports</option>
                    <option value="qualifies">Qualifies</option>
                    <option value="rejects">Rejects</option>
                  </ReviewBasisSelect>
                  <ReviewBasisSelect
                    id="review-basis-modality"
                    label="Modality"
                    hint="Record the force of the selected source statement."
                    value={basisEditor.draft.modality}
                    disabled={commandPending}
                    onChange={(event) =>
                      dispatchBasisEditor({
                        type: "draft_changed",
                        draft: {
                          ...basisEditor.draft,
                          modality: event.currentTarget.value as
                            "" | ReviewCandidateBasisRevisionDraft["modality"],
                        },
                      })
                    }
                  >
                    <option value="">Choose modality</option>
                    <option value="asserted">Asserted</option>
                    <option value="hedged">Hedged</option>
                    <option value="conditional">Conditional</option>
                    <option value="speculative">Speculative</option>
                  </ReviewBasisSelect>
                </div>
                <PetraTextField
                  id="review-basis-attribution"
                  label="Source attribution"
                  hint="Name who or what makes the source statement."
                  maxLength={4000}
                  required
                  value={basisEditor.draft.attribution}
                  disabled={commandPending}
                  onChange={(event) =>
                    dispatchBasisEditor({
                      type: "draft_changed",
                      draft: {
                        ...basisEditor.draft,
                        attribution: event.currentTarget.value,
                      },
                    })
                  }
                />
                <label className="review-basis-edit__checkbox">
                  <input
                    type="checkbox"
                    checked={basisEditor.draft.negated}
                    disabled={commandPending}
                    onChange={(event) =>
                      dispatchBasisEditor({
                        type: "draft_changed",
                        draft: {
                          ...basisEditor.draft,
                          negated: event.currentTarget.checked,
                        },
                      })
                    }
                  />
                  <span>
                    <strong>Source statement is negated</strong>
                    <small>
                      Record only whether the selected source statement uses a
                      negated proposition.
                    </small>
                  </span>
                </label>
                <PetraTextArea
                  id="review-basis-uncertainty"
                  label="Uncertainty (optional)"
                  hint="Retain a material uncertainty expressed by or about this exact source basis."
                  rows={3}
                  maxLength={4000}
                  value={basisEditor.draft.uncertainty}
                  disabled={commandPending}
                  onChange={(event) =>
                    dispatchBasisEditor({
                      type: "draft_changed",
                      draft: {
                        ...basisEditor.draft,
                        uncertainty: event.currentTarget.value,
                      },
                    })
                  }
                />
                <PetraTextArea
                  id="review-basis-reason"
                  label="Reason for material basis revision"
                  hint="Explain why the unchanged Claim text needs this source-basis revision."
                  rows={3}
                  maxLength={4000}
                  required
                  value={basisEditor.draft.reason}
                  disabled={commandPending}
                  onChange={(event) =>
                    dispatchBasisEditor({
                      type: "draft_changed",
                      draft: {
                        ...basisEditor.draft,
                        reason: event.currentTarget.value,
                      },
                    })
                  }
                />
                <p
                  className="review-candidate-edit__local-note"
                  id="review-basis-edit-local-note"
                >
                  These unsent fields stay on this page when the editor closes.
                  The exact ProjectSource and SourceSpan identities come from
                  authenticated reads. Saving can create a new non-authoritative
                  working revision and reset validation to pending; it does not
                  change Claim text, decide the Review, or apply anything.
                </p>
                {basisDraftError === undefined ? null : (
                  <p
                    className="petra-field__error"
                    id="review-basis-edit-error"
                  >
                    <span aria-hidden="true">!</span>
                    {basisDraftError}
                  </p>
                )}
                <PetraButtonGroup label="Material basis revision">
                  <PetraButton
                    type="submit"
                    variant="primary"
                    busy={basisRevisionPending}
                    busyLabel="Saving basis revision…"
                    aria-disabled={
                      basisDraftError !== undefined || commandPending
                    }
                    aria-describedby={
                      basisDraftError === undefined
                        ? "review-basis-edit-local-note"
                        : "review-basis-edit-local-note review-basis-edit-error"
                    }
                    data-operation="revise_review_candidate_basis"
                  >
                    Save working basis revision
                  </PetraButton>
                  <PetraButton
                    variant="quiet"
                    onClick={() => dispatchBasisEditor({ type: "toggle" })}
                  >
                    Close basis editor
                  </PetraButton>
                </PetraButtonGroup>
              </form>
            </section>
          )}
          <ReviewCandidateBasisRevisionNotice
            review={review}
            revision={basisEditor.revision}
            onRetry={runCandidateBasisRevision}
            onReload={reloadBasisReview}
          />
        </section>

        <section
          className="review-consequences"
          aria-labelledby="review-consequences-title"
        >
          <header>
            <p className="reference-panel-kicker">
              {review.commitment.available
                ? "If applied"
                : "Proposed effect · no Apply path"}
            </p>
            <h2 id="review-consequences-title">Consequences</h2>
          </header>
          <ul>
            {review.consequences.map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </section>
      </div>

      <section
        className="review-changeset"
        aria-labelledby="review-changeset-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Commitment preview</p>
            <h2 id="review-changeset-title">
              {review.commitment.available
                ? "Changes to apply"
                : "Commitment unavailable"}
            </h2>
          </div>
          <span>
            {!review.commitment.available
              ? "No Apply path installed"
              : applyCheckpoint !== undefined
                ? "One complete atomic ChangeSet"
                : (review.changeSet?.atomicity ?? "No ChangeSet prepared")}
          </span>
        </header>
        {!review.commitment.available ? (
          <p>
            The candidate remains non-authoritative working state. Review does
            not create a commitment or change Project authority.
          </p>
        ) : applyCheckpoint !== undefined ? (
          <ReviewApplyPreview
            checkpoint={applyCheckpoint}
            focus={applyState.kind === "ready"}
          />
        ) : review.changeSet === undefined ? (
          <p>
            This durable Review session exists before commitment. Petra must
            prepare and validate an exact ChangeSet before anything can be
            applied.
          </p>
        ) : (
          <>
            <dl>
              <div>
                <dt>ChangeSet</dt>
                <dd>
                  <code>{review.changeSet.id}</code> ·{" "}
                  {review.changeSet.revision}
                </dd>
              </div>
            </dl>
            <div className="review-changeset__lists">
              <section aria-labelledby="proposed-changes-title">
                <h3 id="proposed-changes-title">Proposed change</h3>
                <ul>
                  {review.changeSet.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="protected-state-title">
                <h3 id="protected-state-title">Unchanged and protected</h3>
                <ul>
                  {review.changeSet.protected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
        {!review.commitment.available ? (
          <PetraButton
            variant="secondary"
            unavailable={{ reason: review.commitment.reason }}
            aria-describedby="review-apply-scope"
          >
            Preparation unavailable
          </PetraButton>
        ) : applyState.kind === "idle" ||
          applyState.kind === "unavailable" ||
          applyState.kind === "preparing" ? (
          <PetraButton
            variant="secondary"
            busy={applyState.kind === "preparing"}
            busyLabel="Preparing changes…"
            aria-disabled={
              commandPending ||
              review.lifecycle !== "open" ||
              review.reviewMemberId === undefined ||
              review.changeSet !== undefined ||
              review.snapshotState !== "current" ||
              candidateEditor.expanded ||
              basisEditor.expanded ||
              basisDraftHasInput ||
              candidateEditor.draft !== review.candidate.proposed
            }
            aria-describedby="review-apply-scope"
            onClick={onPrepareApply}
          >
            Prepare changes to apply
          </PetraButton>
        ) : null}
        {applyState.kind === "ready" ? (
          <PetraButton variant="quiet" onClick={onDiscardApply}>
            Discard prepared preview
          </PetraButton>
        ) : null}
        <p id="review-apply-scope">
          {review.commitment.available
            ? "Preparation reads the exact commitment without approving it. This path supports fresh candidates without an existing ChangeSet; the server checks profile support and current authority. Targets already bound to a ChangeSet require Recovery reconciliation."
            : "No commitment can be prepared from this Review. Decide later remains a Review-coordination action; Recovery remains a read-only status check."}
        </p>
      </section>

      <AgentControlPortal
        title="Decide this Review"
        description="Approve or reject the displayed change, defer or reopen the decision, or recover an interrupted command here. Preparation, editing, and comparison remain in the Workspace."
        operationIds={[
          "review.apply",
          "review.reject",
          "review.defer",
          "review.reopen",
        ]}
        objectRef={review.id}
      >
        <section
          ref={decisionRef}
          className="review-decision"
          aria-labelledby="review-decision-title"
        >
          <div>
            <p className="reference-panel-kicker">Accountable boundary</p>
            <h2 id="review-decision-title" tabIndex={-1}>
              Decision
            </h2>
            <p id="review-decision-boundary">
              {review.validation.state === "blocked"
                ? `${review.validation.detail} `
                : ""}
              {decisionBoundary}
            </p>
          </div>
          {review.status === "needs_decision" &&
          lifecycle.state !== "success" ? (
            <div className="review-decision__defer-input">
              <PetraTextArea
                label="Reason for deciding later (optional)"
                hint="Petra retains this reason with the deferral. It grants no approval. A scheduled revisit time is not supported yet."
                rows={3}
                maxLength={4000}
                value={rationale}
                disabled={commandPending}
                onChange={(event) => setRationale(event.currentTarget.value)}
              />
            </div>
          ) : null}
          {rejectState.kind === "ready" ? (
            <div className="review-decision__reject-input">
              <PetraTextArea
                label="Reason for rejection"
                hint="Required. Petra retains this exact rationale with the rejected Approval for the complete displayed ChangeSet. Rejection does not Apply the ChangeSet or establish no effect."
                rows={4}
                maxLength={4000}
                required
                value={rejectRationale}
                {...(rejectRationaleError === undefined
                  ? {}
                  : { error: rejectRationaleError })}
                onChange={(event) =>
                  setRejectRationale(event.currentTarget.value)
                }
              />
            </div>
          ) : null}
          <PetraButtonGroup label="Review decision">
            <PetraButton
              variant="primary"
              aria-disabled={applyState.kind !== "ready"}
              {...(review.commitment.available
                ? {}
                : { unavailable: { reason: review.commitment.reason } })}
              busy={applyState.kind === "applying"}
              busyLabel="Applying commitment…"
              aria-describedby="review-decision-boundary review-apply-scope"
              onClick={onApply}
            >
              {applyState.kind === "ready"
                ? "Apply displayed ChangeSet"
                : "Apply unavailable"}
            </PetraButton>
            {rejectState.kind === "ready" ? (
              <>
                <PetraButton
                  variant="danger"
                  aria-disabled={rejectRationaleError !== undefined}
                  aria-describedby="review-decision-boundary"
                  data-operation="reject_review_candidate"
                  onClick={() => onReject(rejectRationale)}
                >
                  Reject displayed ChangeSet
                </PetraButton>
                <PetraButton
                  variant="quiet"
                  onClick={() => {
                    setRejectRationale("");
                    onDiscardReject();
                  }}
                >
                  Discard rejection preview
                </PetraButton>
              </>
            ) : rejectState.kind === "uncertain" ||
              rejectState.kind === "result" ? null : (
              <PetraButton
                variant="danger"
                busy={rejectState.kind === "preparing"}
                busyLabel="Preparing rejection…"
                aria-disabled={
                  commandPending ||
                  applyState.kind === "result" ||
                  !review.commitment.available ||
                  review.status !== "needs_decision" ||
                  review.lifecycle !== "open" ||
                  review.reviewMemberId === undefined ||
                  review.snapshotState !== "current" ||
                  candidateEditor.expanded ||
                  basisEditor.expanded ||
                  basisDraftHasInput ||
                  candidateEditor.draft !== review.candidate.proposed
                }
                aria-describedby="review-decision-boundary"
                data-operation="reject_review_candidate"
                onClick={onPrepareReject}
              >
                Reject candidate
              </PetraButton>
            )}
            <PetraButton
              variant="quiet"
              busy={lifecyclePending}
              busyLabel={
                reopenPresented ? "Reopening Review…" : "Deferring Review…"
              }
              aria-disabled={
                applyLocked ||
                rejectLocked ||
                refreshPending ||
                correctionDraftIsLocked(candidateEditor.correction) ||
                basisRevisionIsLocked(basisEditor.revision) ||
                separationIsLocked ||
                !(deferPresented || reopenPresented)
              }
              aria-describedby="review-decision-boundary"
              data-operation={
                reopenPresented
                  ? "reopen_review_session"
                  : "defer_review_session"
              }
              onClick={reopenPresented ? reopenReview : deferReview}
            >
              {reopenPresented ? "Reopen review" : "Decide later"}
            </PetraButton>
            {refreshControlPresented ? (
              <PetraButton
                variant="secondary"
                busy={refreshPending}
                busyLabel="Refreshing Review…"
                aria-disabled={!refreshAvailable}
                aria-describedby="review-decision-boundary"
                data-operation={
                  review.lifecycle === "open"
                    ? "refresh_review_session"
                    : undefined
                }
                onClick={refreshReview}
              >
                Refresh Review
              </PetraButton>
            ) : null}
            {separationControlPresented ? (
              <PetraButton
                variant="secondary"
                busy={separationPending}
                busyLabel="Separating changes…"
                aria-disabled={!separationAvailable}
                aria-describedby="review-decision-boundary"
                data-operation={
                  review.lifecycle === "open"
                    ? "separate_review_session_member"
                    : undefined
                }
                onClick={onSeparate}
              >
                Separate changes
              </PetraButton>
            ) : null}
          </PetraButtonGroup>
          <ReviewApplyNotice state={applyState} onReload={onReviewChange} />
          <ReviewRejectNotice
            review={review}
            state={rejectState}
            onReload={onReviewChange}
          />
          <ReviewRecovery
            key={`${review.projectId}:${review.id}:${review.exactRef.revision}:${review.exactRef.contentHash}:${lifecycle.state}:${refresh.state}:${candidateEditor.correction.state}:${basisEditor.revision.state}:${separation.state}:${applyState.kind}:${rejectState.kind}`}
            review={review}
            disabled={
              applyBusy || rejectBusy || (commandPending && !applyLocked)
            }
            onReload={onReviewChange}
          />
          <ReviewLifecycleNotice
            review={review}
            lifecycle={lifecycle}
            onRetry={runLifecycleCommand}
            onRefresh={reloadReview}
          />
          <ReviewRefreshNotice
            review={review}
            refresh={refresh}
            onRetry={runRefreshCommand}
            onReload={reloadReview}
          />
          <ReviewSessionSeparationNotice
            projectId={project.id}
            review={review}
            separation={separation}
            onRetry={onSeparationRetry}
            onReload={onSeparationReload}
          />
          <div className="review-decision__alternatives">
            {review.candidateBasisRevision === undefined ? null : (
              <FocusedGraphEntryLink
                entry={scientificFocusedGraphEntryDraft({
                  projectId: project.id,
                  question:
                    "Which recorded current relationships concern this Claim?",
                  focusRef: {
                    record_id:
                      review.candidateBasisRevision.expectedClaimRef.record_id,
                    revision:
                      review.candidateBasisRevision.expectedClaimRef.revision,
                    record_hash:
                      review.candidateBasisRevision.expectedClaimRef
                        .record_hash,
                  },
                  originKind: "review",
                  definitionRef:
                    review.candidateBasisRevision.expectedProjectDefinitionRef,
                  returnDestinationKind: "review",
                  returnDestinationOwner: "project_review_view",
                  returnLabel: "Review",
                  returnFocusId: "review-decision-title",
                  ...(graphActionTarget === undefined
                    ? {}
                    : {
                        actionPreviewTarget: graphActionTarget,
                      }),
                })}
              >
                Inspect bounded current relationships
              </FocusedGraphEntryLink>
            )}
            <Link
              className="reference-text-link"
              to={`/projects/${project.id}/graph?layer=working`}
            >
              Inspect working graph
            </Link>
            <Link className="reference-text-link" to={review.returnPath}>
              Return to {review.returnLabel}
            </Link>
          </div>
        </section>
      </AgentControlPortal>
    </main>
  );
};

export const ReviewSessionSurface = ({
  project,
  review,
  onReviewChange,
  initialCandidateEditOpen = false,
  initialBasisEditOpen = false,
  initialMemberId,
}: {
  project: ProjectRecord;
  review: ReviewSession;
  onReviewChange?: (() => void | Promise<void>) | undefined;
  initialCandidateEditOpen?: boolean;
  initialBasisEditOpen?: boolean;
  initialMemberId?: string;
}): React.JSX.Element => {
  const [applyState, setApplyState] = useState<ReviewApplyState>({
    kind: "idle",
  });
  const [rejectState, setRejectState] = useState<ReviewRejectState>({
    kind: "idle",
  });
  useEffect(() => {
    if (["unavailable", "uncertain", "result"].includes(applyState.kind)) {
      document.getElementById("review-apply-observation")?.focus();
    }
  }, [applyState.kind]);
  useEffect(() => {
    if (["unavailable", "uncertain", "result"].includes(rejectState.kind)) {
      document.getElementById("review-reject-observation")?.focus();
    }
  }, [rejectState.kind]);
  const reloadApplyRef = useRef(onReviewChange);
  useEffect(() => {
    reloadApplyRef.current = onReviewChange;
  }, [onReviewChange]);
  const [applyController] = useState(() =>
    createReviewApplyController(setApplyState, () =>
      reloadApplyRef.current?.(),
    ),
  );
  const [rejectController] = useState(() =>
    createReviewRejectController(setRejectState, () =>
      reloadApplyRef.current?.(),
    ),
  );
  const [activeMemberId, setActiveMemberId] = useState(
    initialMemberId ??
      review.reviewMemberId ??
      review.members?.[0]?.reviewMemberId ??
      "",
  );
  const [separation, setSeparation] =
    useState<ReviewSessionSeparationPresentationState>({ state: "idle" });
  const [memberInteractionLocked, setMemberInteractionLocked] = useState(false);
  const memberSelectionFocus = useRef("");
  const members = review.members ?? [];
  const activeMember =
    members.find((member) => member.reviewMemberId === activeMemberId) ??
    members[0];
  const selectedReview =
    activeMember === undefined
      ? review
      : reviewSessionWithMember(review, activeMember);
  useEffect(() => {
    applyController.invalidatePreparation();
    rejectController.invalidatePreparation();
    return () => {
      applyController.invalidatePreparation();
      rejectController.invalidatePreparation();
    };
  }, [
    applyController,
    rejectController,
    review.projectId,
    review.id,
    review.exactRef.revision,
    review.exactRef.contentHash,
    activeMemberId,
  ]);
  const memberSelectionLocked =
    applyState.kind === "preparing" ||
    applyState.kind === "ready" ||
    applyState.kind === "applying" ||
    rejectState.kind === "preparing" ||
    rejectState.kind === "ready" ||
    rejectState.kind === "rejecting" ||
    rejectState.kind === "uncertain" ||
    rejectState.kind === "result" ||
    separation.state === "pending" ||
    separation.state === "success" ||
    separation.state === "stale" ||
    separation.state === "invalid_response" ||
    separation.state === "retry_mismatch" ||
    separation.state === "uncertain";

  const runSeparation = (input: ReviewSessionSeparationCommandInput): void => {
    setSeparation({ state: "pending", input });
    void executeReviewSessionSeparationCommand(input).then(
      (result) => {
        setSeparation({
          state: "success",
          applied: result.applied,
          input,
          sourceReviewSessionId: result.source_review_session.review_session_id,
          separatedReviewSessionId:
            result.separated_review_session.review_session_id,
        });
        if (onReviewChange !== undefined) {
          void Promise.resolve(onReviewChange()).catch(() => undefined);
        }
      },
      (error: unknown) => {
        setSeparation(reviewSessionSeparationFailureState(error, input));
      },
    );
  };

  const separateMember = (): void => {
    if (selectedReview.reviewMemberId === undefined) return;
    runSeparation(
      createReviewSessionSeparationCommandInput(
        selectedReview,
        selectedReview.reviewMemberId,
      ),
    );
  };

  const reloadSeparationReview = async (): Promise<void> => {
    if (onReviewChange !== undefined) await onReviewChange();
    setSeparation({ state: "idle" });
  };

  return (
    <ReviewSessionMemberSurface
      key={selectedReview.reviewMemberId ?? selectedReview.id}
      project={project}
      review={selectedReview}
      applyState={applyState}
      rejectState={rejectState}
      onPrepareApply={() => void applyController.prepare(selectedReview)}
      onApply={() => void applyController.apply(selectedReview)}
      onDiscardApply={() => applyController.invalidatePreparation()}
      onPrepareReject={() => void rejectController.prepare(selectedReview)}
      onReject={(rationale) =>
        void rejectController.reject(selectedReview, rationale)
      }
      onDiscardReject={() => rejectController.invalidatePreparation()}
      onReviewChange={onReviewChange}
      memberNavigation={
        members.length > 1 ? (
          <ReviewMemberNavigation
            members={members}
            activeMemberId={
              activeMember?.reviewMemberId ??
              selectedReview.reviewMemberId ??
              ""
            }
            locked={memberSelectionLocked || memberInteractionLocked}
            focusSelected={
              memberSelectionFocus.current === selectedReview.reviewMemberId
            }
            onSelect={(reviewMemberId) => {
              memberSelectionFocus.current = reviewMemberId;
              setActiveMemberId(reviewMemberId);
            }}
          />
        ) : undefined
      }
      separation={separation}
      onSeparate={separateMember}
      onSeparationRetry={runSeparation}
      onSeparationReload={reloadSeparationReview}
      onMemberSelectionLockChange={setMemberInteractionLocked}
      initialCandidateEditOpen={initialCandidateEditOpen}
      initialBasisEditOpen={initialBasisEditOpen}
    />
  );
};

export const ReviewSessionRoute = (): React.JSX.Element => {
  const project = useProjectRecord();
  const review = useLoaderData<ReviewSession>();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();
  const requestedMemberId = searchParams.get("reviewMemberId");
  const initialMemberId = review.members?.some(
    (member) => member.reviewMemberId === requestedMemberId,
  )
    ? (requestedMemberId ?? undefined)
    : undefined;
  return (
    <ReviewSessionSurface
      key={`${project.id}:${review.id}`}
      project={project}
      review={review}
      {...(initialMemberId === undefined ? {} : { initialMemberId })}
      onReviewChange={() => revalidator.revalidate()}
    />
  );
};
