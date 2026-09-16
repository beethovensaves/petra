import { FocusedGraphClient } from "@petra/adapters";
import type {
  PetraFocusedGraphActionPreviewView,
  PetraProjectDefinition,
} from "@petra/contracts";
import type {
  FocusedGraphActionPreviewViewRequest,
  FocusedGraphReadRequest,
  PetraFocusedGraphReadView,
} from "@petra/core";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";

import { PetraButton } from "../design-system/primitives.js";
import type {
  FocusedGraphActionPreviewTarget,
  FocusedGraphReturnContext,
} from "./focused-graph-entry.js";
import { createFocusedGraphActionRequestId } from "./focused-graph-identities.js";
import { SuggestedWorkAction } from "./SuggestedAction.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";

const words = (value: string): string => value.replaceAll("_", " ");

const selectionFor = (
  view: PetraFocusedGraphReadView,
  selectedKey: string,
): FocusedGraphActionPreviewViewRequest["selection"] => {
  const kinds = [
    view.content.nodes.some((node) => node.node_key === selectedKey)
      ? ("node" as const)
      : undefined,
    view.content.relationships.some(
      (relationship) => relationship.relationship_key === selectedKey,
    )
      ? ("relationship" as const)
      : undefined,
    view.content.paths.some((path) => path.path_key === selectedKey)
      ? ("path" as const)
      : undefined,
  ].filter(
    (
      kind,
    ): kind is FocusedGraphActionPreviewViewRequest["selection"]["selection_kind"] =>
      kind !== undefined,
  );
  if (kinds.length !== 1) {
    throw new TypeError(
      "A focused graph action preview requires one exact represented selection.",
    );
  }
  return { selection_kind: kinds[0]!, selected_keys: [selectedKey] };
};

/**
 * Builds the one renderer-neutral preview read shared by pointer selection and
 * the non-drag selection control. Presentation geometry is intentionally not
 * accepted by this function.
 */
export const createFocusedGraphActionPreviewRequest = (input: {
  readonly actionRequestId: string;
  readonly request: FocusedGraphReadRequest;
  readonly view: PetraFocusedGraphReadView;
  readonly selectedKey: string;
  readonly target: FocusedGraphActionPreviewTarget;
}): FocusedGraphActionPreviewViewRequest => {
  if (input.view.content.semantic_layer === "historical") {
    throw new TypeError(
      "Historical focused graph positions cannot prepare correction or Work previews.",
    );
  }
  const selection = selectionFor(input.view, input.selectedKey);
  if (
    input.target.action_kind === "governed_correction" &&
    selection.selection_kind !== "relationship"
  ) {
    throw new TypeError(
      "Select one exact relationship before opening its governed correction preview.",
    );
  }
  return {
    action_request_id: input.actionRequestId,
    focused_graph_request: {
      ...structuredClone(input.request),
      expected_snapshot: structuredClone(input.view.content.requested_snapshot),
    },
    expected_graph: {
      schema_name: input.view.schema_name,
      schema_version: input.view.schema_version,
      content_hash: input.view.content_hash,
    },
    selection,
    target: structuredClone(input.target),
  };
};

export interface FocusedGraphActiveActionPreview {
  readonly stateId: number;
  readonly projectId: string;
  readonly request: FocusedGraphActionPreviewViewRequest;
}

/** Rejects a preview that arrived after a newer selection or graph state. */
export const matchesActiveFocusedGraphActionPreview = (
  response: PetraFocusedGraphActionPreviewView,
  active: FocusedGraphActiveActionPreview,
  currentStateId: number,
): boolean =>
  active.stateId === currentStateId &&
  response.project_id === active.projectId &&
  response.content.action_request_id === active.request.action_request_id &&
  response.content.graph_view.content_hash ===
    active.request.expected_graph.content_hash &&
  response.content.graph_view.content.task.request_id ===
    active.request.focused_graph_request.request_id &&
  response.content.selection.selection_kind ===
    active.request.selection.selection_kind &&
  response.content.selection.selected_keys.length === 1 &&
  response.content.selection.selected_keys[0] ===
    active.request.selection.selected_keys[0];

export type FocusedGraphActionPreviewRead = (
  projectId: string,
  definition: PetraProjectDefinition,
  request: FocusedGraphActionPreviewViewRequest,
) => Promise<PetraFocusedGraphActionPreviewView>;

const readFocusedGraphActionPreview: FocusedGraphActionPreviewRead = (
  projectId: string,
  definition: PetraProjectDefinition,
  request: FocusedGraphActionPreviewViewRequest,
): Promise<PetraFocusedGraphActionPreviewView> =>
  new FocusedGraphClient({
    baseUrl:
      typeof window === "undefined"
        ? "http://petra.local"
        : window.location.origin,
    token:
      typeof window === "undefined"
        ? DEVELOPMENT_TOKEN
        : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ??
          DEVELOPMENT_TOKEN),
    projectDefinition: definition,
  }).readActionPreview(projectId, request);

const ExactReturnContext = ({
  view,
  localReturn,
}: {
  view: PetraFocusedGraphActionPreviewView;
  localReturn: FocusedGraphReturnContext;
}): React.JSX.Element => {
  const context = view.content.return_context;
  return (
    <section aria-labelledby="focused-graph-action-return-title">
      <h4 id="focused-graph-action-return-title">Preserved return context</h4>
      <dl className="history-facts">
        <div>
          <dt>Graph request</dt>
          <dd>
            <code>{context.graph_request_id}</code>
          </dd>
        </div>
        <div>
          <dt>Exact selection</dt>
          <dd>
            {words(context.selection.selection_kind)} ·{" "}
            <code>{context.selection.selected_keys.join(", ")}</code>
          </dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>{words(context.origin.origin_kind)}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>
            {context.destination.label} · {words(context.destination.owner)}
          </dd>
        </div>
        <div>
          <dt>Return route</dt>
          <dd>
            {localReturn.label} · <code>{localReturn.path}</code>
          </dd>
        </div>
        <div>
          <dt>Return focus</dt>
          <dd>
            {localReturn.focus_id === undefined ? (
              "Route start"
            ) : (
              <code>{localReturn.focus_id}</code>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
};

const CorrectionPreview = ({
  projectId,
  view,
}: {
  projectId: string;
  view: PetraFocusedGraphActionPreviewView;
}): React.JSX.Element => {
  const preview = view.content.preview;
  if (preview.preview_kind !== "governed_correction") {
    throw new TypeError(
      "A governed correction panel requires its exact preview.",
    );
  }
  const member = preview.review_view.content.members.find(
    (candidate) => candidate.review_member_id === preview.review_member_id,
  );
  if (member === undefined) {
    throw new TypeError("The exact Review member is absent from its preview.");
  }
  const candidate = member.candidate;
  const reviewQuery = new URLSearchParams({
    reviewMemberId: preview.review_member_id,
  });
  return (
    <div className="focused-graph-action-preview__body">
      <section aria-labelledby="focused-graph-correction-candidate-title">
        <p className="reference-panel-kicker">Exact existing candidate</p>
        <h3 id="focused-graph-correction-candidate-title">
          {candidate.kind_label} · {words(preview.requested_change)}
        </h3>
        <dl className="focused-graph-action-preview__comparison">
          <div>
            <dt>Current</dt>
            <dd>{candidate.current}</dd>
          </div>
          <div>
            <dt>Candidate · working</dt>
            <dd>{candidate.proposed}</dd>
          </div>
          <div>
            <dt>Supplied difference</dt>
            <dd>{candidate.difference}</dd>
          </div>
        </dl>
        <p>
          Selected {preview.selected_relationship.term.singular.toLowerCase()}:{" "}
          {preview.selected_relationship.predicate} ·{" "}
          <code>
            {preview.selected_relationship.relationship_ref.element_id}@
            {preview.selected_relationship.relationship_ref.revision}
          </code>
        </p>
        <dl className="history-facts">
          <div>
            <dt>Review</dt>
            <dd>
              <code>{preview.review_session_ref.review_session_id}</code> ·{" "}
              revision {preview.review_session_ref.revision} · open
            </dd>
          </div>
          <div>
            <dt>Review member</dt>
            <dd>
              <code>{preview.review_member_id}</code>
            </dd>
          </div>
          <div>
            <dt>WorkingCandidate</dt>
            <dd>
              <code>{preview.working_candidate_ref.working_candidate_id}</code>{" "}
              · revision {preview.working_candidate_ref.revision}
            </dd>
          </div>
          <div>
            <dt>WorkingRelationship revisions</dt>
            <dd>{preview.working_relationship_refs.length}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="focused-graph-correction-scope-title">
        <h4 id="focused-graph-correction-scope-title">Affected scope</h4>
        <ul>
          {preview.affected_scope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="focused-graph-correction-unchanged-title">
        <h4 id="focused-graph-correction-unchanged-title">
          Unchanged by this preview
        </h4>
        <ul>
          {preview.unchanged.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          Authority changes {words(preview.operation.authority_change)}. Closing
          this preview {words(preview.operation.cancellation)}.
        </p>
      </section>
      <Link
        className="reference-primary-link"
        to={`/projects/${encodeURIComponent(projectId)}/review/${encodeURIComponent(preview.review_session_ref.review_session_id)}?${reviewQuery}#review-comparison-title`}
      >
        Open this exact candidate in Review
      </Link>
    </div>
  );
};

export const FocusedGraphActionPreviewPanel = ({
  projectId,
  view,
  returnContext,
  onClose,
}: {
  projectId: string;
  view: PetraFocusedGraphActionPreviewView;
  returnContext: FocusedGraphReturnContext;
  onClose?: () => void;
}): React.JSX.Element => {
  const preview = view.content.preview;
  return (
    <article
      className="focused-graph-action-preview"
      aria-labelledby="focused-graph-action-preview-title"
      data-preview-kind={preview.preview_kind}
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Read-only action preview</p>
          <h2 id="focused-graph-action-preview-title">
            {preview.preview_kind === "governed_correction"
              ? "Review the governed correction path"
              : "Review the exact Work action"}
          </h2>
        </div>
        <span>No command issued</span>
      </header>

      {preview.preview_kind === "governed_correction" ? (
        <CorrectionPreview projectId={projectId} view={view} />
      ) : (
        <SuggestedWorkAction
          projectId={projectId}
          actionView={preview.suggested_action_view}
          presentationPath="direct"
        />
      )}

      <ExactReturnContext view={view} localReturn={returnContext} />

      <section aria-labelledby="focused-graph-action-authority-title">
        <h4 id="focused-graph-action-authority-title">
          Authority and renderer boundary
        </h4>
        <p>
          PostgreSQL remains authoritative. The graph is a projection-backed
          read. Selection grants no authority, renderer state was not accepted,
          and this preview started no Work or command.
        </p>
        <ul>
          {view.content.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      {onClose === undefined ? null : (
        <PetraButton variant="quiet" onClick={onClose}>
          Close preview and keep selection
        </PetraButton>
      )}
    </article>
  );
};

export const FocusedGraphActions = ({
  projectId,
  definition,
  request,
  view,
  selectedKey,
  stateId,
  target,
  returnContext,
  read = readFocusedGraphActionPreview,
}: {
  projectId: string;
  definition: PetraProjectDefinition;
  request: FocusedGraphReadRequest;
  view: PetraFocusedGraphReadView;
  selectedKey: string;
  stateId: number;
  target: FocusedGraphActionPreviewTarget;
  returnContext: FocusedGraphReturnContext;
  read?: FocusedGraphActionPreviewRead;
}): React.JSX.Element => {
  const [preview, setPreview] = useState<PetraFocusedGraphActionPreviewView>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const active = useRef<FocusedGraphActiveActionPreview | undefined>(undefined);
  const restoreTriggerFocus = useRef(false);
  const triggerId = useId();

  useEffect(() => {
    active.current = undefined;
    setPreview(undefined);
    setPending(false);
    setMessage(undefined);
  }, [selectedKey, stateId, target, view.content_hash]);

  useEffect(() => {
    if (preview === undefined && restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      document.getElementById(triggerId)?.focus();
    }
  }, [preview, triggerId]);

  const canPreview =
    view.content.semantic_layer !== "historical" &&
    (target.action_kind !== "governed_correction" ||
      view.content.relationships.some(
        (relationship) => relationship.relationship_key === selectedKey,
      ));

  const openPreview = async (): Promise<void> => {
    if (pending || !canPreview) return;
    let actionRequest: FocusedGraphActionPreviewViewRequest;
    try {
      actionRequest = createFocusedGraphActionPreviewRequest({
        actionRequestId: createFocusedGraphActionRequestId(),
        request,
        view,
        selectedKey,
        target,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The exact action preview is unavailable.",
      );
      return;
    }
    const intent = { stateId, projectId, request: actionRequest };
    active.current = intent;
    setPending(true);
    setMessage(undefined);
    try {
      const response = await read(projectId, definition, actionRequest);
      if (active.current !== intent) return;
      if (!matchesActiveFocusedGraphActionPreview(response, intent, stateId)) {
        active.current = undefined;
        setMessage(
          "Rejected a preview that did not match the active graph state. The selection and Project state are unchanged.",
        );
        return;
      }
      active.current = undefined;
      setPreview(response);
      setMessage(
        "Accepted the exact read-only preview. No command or Work was started.",
      );
    } catch (error) {
      if (active.current !== intent) return;
      active.current = undefined;
      setMessage(
        error instanceof Error
          ? error.message
          : "The exact action preview could not be read.",
      );
    } finally {
      if (active.current === undefined) setPending(false);
    }
  };

  const closePreview = (): void => {
    restoreTriggerFocus.current = true;
    setPreview(undefined);
    setMessage(
      "Closed the preview. The exact graph selection and Project state are unchanged.",
    );
  };

  return (
    <section
      className="focused-graph-actions"
      aria-labelledby="focused-graph-actions-title"
      data-action-kind={target.action_kind}
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Canonical task action</p>
          <h2 id="focused-graph-actions-title">
            {target.action_kind === "governed_correction"
              ? "Prepare a governed correction"
              : "Investigate with bounded Work"}
          </h2>
        </div>
        <span>Selection · {selectedKey}</span>
      </header>
      <p>
        Pointer selection in the graph and the non-drag selection control open
        this same typed preview. Layout, coordinates, pan, zoom, and gestures
        stay local and cannot enter its request or a domain command.
      </p>
      {preview === undefined ? (
        <PetraButton
          id={triggerId}
          variant="secondary"
          busy={pending}
          busyLabel="Reading exact preview…"
          {...(canPreview
            ? {}
            : {
                unavailable: {
                  reason:
                    "Select the exact relationship bound to this open Review before preparing its correction preview.",
                },
              })}
          onClick={() => void openPreview()}
        >
          {target.action_kind === "governed_correction"
            ? `Preview ${words(target.requested_change)}`
            : "Preview exact Work"}
        </PetraButton>
      ) : (
        <FocusedGraphActionPreviewPanel
          projectId={projectId}
          view={preview}
          returnContext={returnContext}
          onClose={closePreview}
        />
      )}
      {message === undefined ? null : (
        <p className="focused-graph-actions__status" role="status">
          {message}
        </p>
      )}
    </section>
  );
};
