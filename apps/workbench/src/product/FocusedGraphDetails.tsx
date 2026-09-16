import { FocusedGraphClient, FocusedGraphClientError } from "@petra/adapters";
import type {
  FocusedGraphNodeDetails,
  FocusedGraphRelationshipDetails,
  FocusedGraphSourceInspection,
  PetraFocusedGraphDetailsView,
  PetraProjectDefinition,
  ProjectObjectDestination,
  ProjectObjectLocationContent,
} from "@petra/contracts";
import type {
  FocusedGraphDetailsViewRequest,
  FocusedGraphReadRequest,
  PetraFocusedGraphReadView,
} from "@petra/core";
import { useEffect, useRef, useState } from "react";

import { PetraButton } from "../design-system/primitives.js";
import type { FocusedGraphReturnContext } from "./focused-graph-entry.js";
import { createFocusedGraphDetailsRequestId } from "./focused-graph-identities.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";

const words = (value: string): string => value.replaceAll("_", " ");

const selectedKind = (
  view: PetraFocusedGraphReadView,
  selectedKey: string,
): FocusedGraphDetailsViewRequest["selection"]["selection_kind"] => {
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
    ): kind is FocusedGraphDetailsViewRequest["selection"]["selection_kind"] =>
      kind !== undefined,
  );
  if (kinds.length !== 1) {
    throw new TypeError(
      "Focused graph Details requires one exact represented selection.",
    );
  }
  return kinds[0]!;
};

export const createFocusedGraphDetailsRequest = (input: {
  readonly detailsRequestId: string;
  readonly request: FocusedGraphReadRequest;
  readonly view: PetraFocusedGraphReadView;
  readonly selectedKey: string;
}): FocusedGraphDetailsViewRequest => ({
  details_request_id: input.detailsRequestId,
  focused_graph_request: structuredClone(input.request),
  expected_graph: {
    schema_name: input.view.schema_name,
    schema_version: input.view.schema_version,
    content_hash: input.view.content_hash,
  },
  selection: {
    selection_kind: selectedKind(input.view, input.selectedKey),
    selected_keys: [input.selectedKey],
  },
});

export interface FocusedGraphActiveDetails {
  readonly stateId: number;
  readonly projectId: string;
  readonly selectedKey: string;
  readonly request: FocusedGraphDetailsViewRequest;
}

/** Rejects an older Details response after selection or presentation changes. */
export const matchesActiveFocusedGraphDetails = (
  response: PetraFocusedGraphDetailsView,
  active: FocusedGraphActiveDetails,
  currentStateId: number,
): boolean =>
  active.stateId === currentStateId &&
  response.project_id === active.projectId &&
  response.content.details_request_id === active.request.details_request_id &&
  response.content.graph.content_hash ===
    active.request.expected_graph.content_hash &&
  response.content.graph.task.request_id ===
    active.request.focused_graph_request.request_id &&
  response.content.selection.selection_kind ===
    active.request.selection.selection_kind &&
  response.content.selection.selected_keys.length === 1 &&
  response.content.selection.selected_keys[0] === active.selectedKey;

export type FocusedGraphDetailsRecoveryKind =
  "stale" | "missing" | "restricted" | "unavailable";

const responseCode = (value: unknown): string | undefined => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("error" in value) ||
    typeof value.error !== "object" ||
    value.error === null ||
    !("code" in value.error) ||
    typeof value.error.code !== "string"
  ) {
    return undefined;
  }
  return value.error.code;
};

export const focusedGraphDetailsRecoveryKind = (
  error: unknown,
): FocusedGraphDetailsRecoveryKind => {
  if (!(error instanceof FocusedGraphClientError)) return "unavailable";
  const code = responseCode(error.response)?.toUpperCase();
  if (
    error.status === 409 ||
    code?.includes("STALE") === true ||
    code?.includes("REPLACED") === true
  ) {
    return "stale";
  }
  if (error.status === 404 || code?.includes("NOT_FOUND") === true) {
    return "missing";
  }
  if (
    error.status === 401 ||
    error.status === 403 ||
    code?.includes("UNAUTHORIZED") === true ||
    code?.includes("RESTRICTED") === true
  ) {
    return "restricted";
  }
  return "unavailable";
};

const recoveryCopy: Record<
  FocusedGraphDetailsRecoveryKind,
  { readonly title: string; readonly detail: string }
> = {
  stale: {
    title: "The selected Details are stale",
    detail:
      "The Project, definition, snapshot, or selected record advanced. The older response was not allowed to replace this graph state.",
  },
  missing: {
    title: "The selected destination is missing",
    detail:
      "Petra could not reproduce this exact selected destination. The graph selection and return context remain available.",
  },
  restricted: {
    title: "The selected destination is restricted",
    detail:
      "The exact identity is retained, but this actor cannot inspect its protected representation from this Project.",
  },
  unavailable: {
    title: "The selected Details are unavailable",
    detail:
      "Petra kept the bounded graph and selected identity intact. Retry the typed read or return to the originating task.",
  },
};

const exactSelection = (
  target: NonNullable<ProjectObjectDestination["target_ref"]>,
): string => {
  const params = new URLSearchParams({
    selected: target.object_id,
    semanticKey: target.semantic_key,
    revision: String(target.revision),
    recordHash: target.record_hash,
  });
  return params.toString();
};

export const focusedGraphSemanticDestinationPath = (
  projectId: string,
  destination: ProjectObjectDestination,
): string | undefined => {
  const projectRoot = `/projects/${encodeURIComponent(projectId)}`;
  if (destination.role === "brief") return `${projectRoot}/brief`;
  if (destination.role === "settings") return "/settings";
  if (destination.role === "petra") return `${projectRoot}/petra`;
  if (destination.role === "profile_tool") {
    return destination.profile_tool_key === undefined
      ? undefined
      : `${projectRoot}/tools/${encodeURIComponent(destination.profile_tool_key)}`;
  }
  const target = destination.target_ref;
  if (target === undefined) return undefined;
  const query = exactSelection(target);
  if (destination.role === "sources") {
    return `${projectRoot}/sources/${encodeURIComponent(target.object_id)}?${query}`;
  }
  if (destination.role === "work") {
    return `${projectRoot}/work/${encodeURIComponent(target.object_id)}?${query}`;
  }
  if (destination.role === "composition") {
    return `${projectRoot}/composition/${encodeURIComponent(target.object_id)}?${query}`;
  }
  return `${projectRoot}/${destination.role}?${query}`;
};

const currentLocationPath = (
  projectId: string,
  location: ProjectObjectLocationContent,
): string | undefined => {
  const resolution = location.resolution;
  if (resolution.state !== "superseded" && resolution.state !== "historical") {
    return undefined;
  }
  const current = resolution.current_ref;
  const query = new URLSearchParams({
    semanticKey: current.semantic_key,
    objectId: current.object_id,
    revision: String(current.revision),
    taskIntent: "inspect",
  });
  return `/projects/${encodeURIComponent(projectId)}/locate?${query}`;
};

const LocationStatus = ({
  projectId,
  location,
  onReturn,
}: {
  projectId: string;
  location: ProjectObjectLocationContent;
  onReturn: () => void;
}): React.JSX.Element => {
  const resolution = location.resolution;
  const destinations = [
    location.primary_destination,
    ...location.alternate_destinations,
    ...(location.fallback_destination === undefined
      ? []
      : [location.fallback_destination]),
  ];
  const currentPath = currentLocationPath(projectId, location);
  return (
    <section
      className="focused-graph-details__location"
      aria-label="Exact semantic destinations"
      data-location-state={resolution.state}
    >
      <h4>Destination and recovery</h4>
      {resolution.state === "current" ? (
        <p>Current exact object · {resolution.descriptor.lifecycle_state}</p>
      ) : resolution.state === "historical" ? (
        <p>
          Historical exact object. The current revision remains a separate
          destination.
        </p>
      ) : resolution.state === "superseded" ? (
        <p>
          Replaced object. Petra retained the requested revision and supplied
          its exact current replacement without substituting it in this view.
        </p>
      ) : "failure" in resolution ? (
        <p>
          {resolution.state === "missing"
            ? "Missing destination"
            : resolution.state === "unauthorized"
              ? "Restricted destination"
              : "Unavailable destination"}
          : {resolution.failure.message}
        </p>
      ) : null}
      {currentPath === undefined ? null : (
        <a className="reference-text-link" href={currentPath}>
          Inspect the exact current replacement
        </a>
      )}
      <ul>
        {destinations.map((destination, index) => {
          const path = focusedGraphSemanticDestinationPath(
            projectId,
            destination,
          );
          const key = `${destination.role}:${destination.target_ref?.object_id ?? index}`;
          return (
            <li key={key}>
              <strong>{words(destination.role)}</strong> · {destination.purpose}
              {destination.role === "graph" ? (
                <PetraButton
                  density="compact"
                  variant="quiet"
                  onClick={onReturn}
                >
                  Return to selected graph object
                </PetraButton>
              ) : path === undefined ? (
                <span> Exact route unavailable.</span>
              ) : (
                <a className="reference-text-link" href={path}>
                  Open {words(destination.role)}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const SourceInspection = ({
  inspection,
}: {
  inspection: FocusedGraphSourceInspection;
}): React.JSX.Element => (
  <details
    className="focused-graph-source-inspection"
    data-source-state={inspection.state}
  >
    <summary>
      Inspect exact source · <code>{inspection.source_span_ref.record_id}</code>
    </summary>
    {inspection.state === "unavailable" ? (
      <div className="focused-graph-source-inspection__unavailable">
        <strong>Source representation unavailable</strong>
        <p>{inspection.reason}</p>
        <p>
          The exact SourceSpan identity remains visible; unavailability does not
          establish absence or lack of support.
        </p>
      </div>
    ) : (
      <article>
        <p className="reference-panel-kicker">Exact ProjectSource inspection</p>
        <h5>{inspection.source_view.identity.title}</h5>
        <dl>
          <div>
            <dt>ProjectSource</dt>
            <dd>
              <code>{inspection.project_source_id}</code> · binding revision{" "}
              {inspection.binding_revision}
            </dd>
          </div>
          <div>
            <dt>SourceSpan</dt>
            <dd>
              <code>{inspection.source_span_ref.record_id}</code> · revision{" "}
              {inspection.source_span_ref.revision}
            </dd>
          </div>
          <div>
            <dt>Representation</dt>
            <dd>
              {words(inspection.source_view.representation.extent)} ·{" "}
              {inspection.source_view.representation.extent_label}
            </dd>
          </div>
          <div>
            <dt>Rights</dt>
            <dd>
              {inspection.source_view.rights.license_label} ·{" "}
              {words(inspection.source_view.rights.decision_status)}
            </dd>
          </div>
          <div>
            <dt>Authority position</dt>
            <dd>
              PostgreSQL event {inspection.source_view.authority.event_position}
              {" · "}stream revision{" "}
              {inspection.source_view.authority.stream_revision}
            </dd>
          </div>
        </dl>
        {inspection.source_view.representation.preview === undefined ? (
          <p>
            The exact source identity is available, but no reproducible preview
            was supplied.
          </p>
        ) : (
          <blockquote>
            <strong>
              {inspection.source_view.representation.preview.heading} ·{" "}
              {inspection.source_view.representation.preview.locator}
            </strong>
            <p>{inspection.source_view.representation.preview.text}</p>
            <cite>
              {words(
                inspection.source_view.representation.preview
                  .verification_status,
              )}
            </cite>
          </blockquote>
        )}
      </article>
    )}
  </details>
);

type ExactMember = FocusedGraphNodeDetails | FocusedGraphRelationshipDetails;

const ExactMemberDetails = ({
  projectId,
  item,
  selected,
  onReturn,
}: {
  projectId: string;
  item: ExactMember;
  selected: boolean;
  onReturn: () => void;
}): React.JSX.Element => {
  const node = item.member_kind === "node" ? item.member : undefined;
  const relationship =
    item.member_kind === "relationship" ? item.member : undefined;
  const member = node ?? relationship!;
  const label = node?.label ?? relationship!.predicate;
  const ref =
    node !== undefined
      ? node.record_ref
      : {
          record_id: relationship!.relationship_ref.element_id,
          revision: relationship!.relationship_ref.revision,
          record_hash: relationship!.relationship_ref.record_hash,
        };
  return (
    <article
      className="focused-graph-details__member"
      data-member-kind={item.member_kind}
      data-lifecycle={node?.lifecycle}
      data-selected={selected || undefined}
    >
      <header>
        <div>
          <p className="reference-panel-kicker">
            {selected ? "Selected" : "Path context"} {item.member_kind} ·{" "}
            {member.term.singular}
          </p>
          <h3>{label}</h3>
        </div>
        <span>{words(member.authority_position)}</span>
      </header>
      <p>{member.summary}</p>
      <dl>
        <div>
          <dt>Exact record</dt>
          <dd>
            <code>{ref.record_id}</code> · revision {ref.revision}
            <br />
            <code>{ref.record_hash}</code>
          </dd>
        </div>
        <div>
          <dt>Semantic identity</dt>
          <dd>
            <code>{member.semantic_key}</code> · {words(member.layer)}
          </dd>
        </div>
        {node !== undefined ? (
          <div>
            <dt>Lifecycle</dt>
            <dd>{words(node.lifecycle)}</dd>
          </div>
        ) : (
          <div>
            <dt>Relationship</dt>
            <dd>
              {words(relationship!.meaning_kind)} ·{" "}
              {words(relationship!.direction)} · {words(relationship!.origin)}
            </dd>
          </div>
        )}
        <div>
          <dt>Basis and provenance</dt>
          <dd>{member.basis.summary}</dd>
        </div>
      </dl>
      {member.basis.record_refs.length === 0 ? (
        <p>No exact basis record is supplied for this member.</p>
      ) : (
        <ul className="focused-graph-details__basis">
          {member.basis.record_refs.map((basis) => (
            <li key={`${basis.record_id}:${basis.revision}`}>
              <code>{basis.record_id}</code> · revision {basis.revision}
            </li>
          ))}
        </ul>
      )}
      {member.basis.limitations.map((limitation) => (
        <p key={limitation} className="focused-graph-details__limitation">
          {limitation}
        </p>
      ))}
      <LocationStatus
        projectId={projectId}
        location={item.semantic_location}
        onReturn={onReturn}
      />
      <section aria-label="Exact source inspections">
        <h4>Source inspection</h4>
        {item.source_inspections.length === 0 ? (
          <p>No exact SourceSpan destination is supplied for this member.</p>
        ) : (
          item.source_inspections.map((inspection) => (
            <SourceInspection
              key={`${inspection.source_span_ref.record_id}:${inspection.source_span_ref.revision}`}
              inspection={inspection}
            />
          ))
        )}
      </section>
    </article>
  );
};

export const FocusedGraphDetailsPanel = ({
  details,
  returnContext,
  onReturn,
  headingRef,
}: {
  details: PetraFocusedGraphDetailsView;
  returnContext: FocusedGraphReturnContext;
  onReturn: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}): React.JSX.Element => {
  const graph = details.content.graph;
  const members: ExactMember[] = [
    ...details.content.nodes,
    ...details.content.relationships,
  ];
  return (
    <section
      className="focused-graph-details"
      aria-labelledby="focused-graph-details-title"
      data-selection-kind={details.content.selection.selection_kind}
      data-details-request-id={details.content.details_request_id}
    >
      <header className="focused-graph-details__heading">
        <div>
          <p className="reference-panel-kicker">Synchronized Details</p>
          <h2 id="focused-graph-details-title" ref={headingRef} tabIndex={-1}>
            Exact selected identity
          </h2>
          <p>
            This read preserves the graph request and selection. It does not
            promote layout, selection, or navigation to Project authority.
          </p>
        </div>
        <PetraButton density="compact" variant="quiet" onClick={onReturn}>
          Return to graph selection
        </PetraButton>
      </header>

      <dl className="focused-graph-details__identity">
        <div>
          <dt>Project and definition</dt>
          <dd>
            <code>{details.project_id}</code>
            <br />
            <code>
              {graph.profile.project_definition_ref.project_definition_id}
            </code>{" "}
            · revision {graph.profile.project_definition_ref.revision}
          </dd>
        </div>
        <div>
          <dt>Task and Details requests</dt>
          <dd>
            <code>{graph.task.request_id}</code>
            <br />
            <code>{details.content.details_request_id}</code>
          </dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>
            {details.content.selection.selection_kind} ·{" "}
            <code>{details.content.selection.selected_keys.join(", ")}</code>
          </dd>
        </div>
        <div>
          <dt>Snapshot</dt>
          <dd>
            requested <code>{graph.requested_snapshot.snapshot_id}</code> ·
            event {graph.requested_snapshot.event_position}
            <br />
            represented <code>{graph.represented_snapshot.snapshot_id}</code> ·
            event {graph.represented_snapshot.event_position}
          </dd>
        </div>
        <div>
          <dt>Semantic and temporal position</dt>
          <dd>
            {words(graph.semantic_layer)} ·{" "}
            {words(graph.temporal_position.position_kind)} ·{" "}
            {words(graph.temporal_position.dimension)}
          </dd>
        </div>
        <div>
          <dt>Projection position</dt>
          <dd>
            {words(graph.projection_position.state)} · represented event{" "}
            {graph.projection_position.represented_event_position} · observed
            event {graph.projection_position.observed_event_position} · pending{" "}
            {graph.projection_position.pending_records}
          </dd>
        </div>
        <div>
          <dt>Bounded scope</dt>
          <dd>
            {graph.scope.description} Depth {graph.scope.limits.maximum_depth};{" "}
            {graph.scope.limits.maximum_nodes} objects;{" "}
            {graph.scope.limits.maximum_relationships} relationships;{" "}
            {graph.scope.limits.maximum_paths} paths.
          </dd>
        </div>
        <div>
          <dt>Return context</dt>
          <dd>
            {returnContext.label} · <code>{returnContext.path}</code>
            {returnContext.focus_id === undefined ? null : (
              <>
                <br />
                focus <code>{returnContext.focus_id}</code>
              </>
            )}
          </dd>
        </div>
      </dl>

      {graph.return_destination.state === "available" ? (
        <p>
          Graph return owner: {words(graph.return_destination.owner)} ·{" "}
          {graph.return_destination.label}
        </p>
      ) : (
        <p className="focused-graph-details__limitation">
          Graph return destination unavailable:{" "}
          {graph.return_destination.reason}
        </p>
      )}

      {members.map((item) => (
        <ExactMemberDetails
          key={`${item.member_kind}:${item.member_key}`}
          projectId={details.project_id}
          item={item}
          selected={
            details.content.selection.selection_kind === item.member_kind &&
            details.content.selection.selected_keys.includes(item.member_key)
          }
          onReturn={onReturn}
        />
      ))}

      {details.content.paths.map((path) => (
        <article key={path.path_key} className="focused-graph-details__path">
          <h3>Selected path · {words(path.state)}</h3>
          <p>{path.ordering_rationale}</p>
          <ol>
            {path.steps.map((step) => (
              <li key={`${path.path_key}:${step.position}`}>
                {step.position}. <code>{step.from_node_key}</code> →{" "}
                <code>{step.relationship_key}</code> →{" "}
                <code>{step.to_node_key}</code> ·{" "}
                {words(step.traversal_direction)}
                {step.repeated_member ? " · repeated member" : ""}
              </li>
            ))}
          </ol>
        </article>
      ))}

      <footer className="focused-graph-details__footer">
        <ul>
          {details.content.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p>
          PostgreSQL authority and read-only semantic/source owners remain
          separate from the rebuildable graph projection.
        </p>
      </footer>
    </section>
  );
};

const readFocusedGraphDetails = (
  projectId: string,
  definition: PetraProjectDefinition,
  request: FocusedGraphDetailsViewRequest,
): Promise<PetraFocusedGraphDetailsView> =>
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
  }).readDetails(projectId, request);

export const FocusedGraphDetails = ({
  projectId,
  definition,
  request,
  view,
  selectedKey,
  stateId,
  returnContext,
  read = readFocusedGraphDetails,
}: {
  projectId: string;
  definition: PetraProjectDefinition;
  request: FocusedGraphReadRequest;
  view: PetraFocusedGraphReadView;
  selectedKey: string;
  stateId: number;
  returnContext: FocusedGraphReturnContext;
  read?: (
    projectId: string,
    definition: PetraProjectDefinition,
    request: FocusedGraphDetailsViewRequest,
  ) => Promise<PetraFocusedGraphDetailsView>;
}): React.JSX.Element => {
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef<FocusedGraphActiveDetails | undefined>(undefined);
  const restoreTriggerFocus = useRef(false);
  const [pending, setPending] = useState(false);
  const [details, setDetails] = useState<PetraFocusedGraphDetailsView>();
  const [recovery, setRecovery] = useState<FocusedGraphDetailsRecoveryKind>();

  useEffect(() => {
    if (details !== undefined || recovery !== undefined) {
      heading.current?.focus();
    } else if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      root.current
        ?.querySelector<HTMLButtonElement>("[data-focused-details-trigger]")
        ?.focus();
    }
  }, [details, recovery]);

  useEffect(
    () => () => {
      active.current = undefined;
    },
    [],
  );

  const returnToSelection = (): void => {
    active.current = undefined;
    restoreTriggerFocus.current = true;
    setPending(false);
    setDetails(undefined);
    setRecovery(undefined);
  };

  const openDetails = async (): Promise<void> => {
    const detailsRequest = createFocusedGraphDetailsRequest({
      detailsRequestId: createFocusedGraphDetailsRequestId(),
      request,
      view,
      selectedKey,
    });
    const intent: FocusedGraphActiveDetails = {
      stateId,
      projectId,
      selectedKey,
      request: detailsRequest,
    };
    active.current = intent;
    setPending(true);
    setDetails(undefined);
    setRecovery(undefined);
    try {
      const response = await read(projectId, definition, detailsRequest);
      if (
        active.current !== intent ||
        !matchesActiveFocusedGraphDetails(response, intent, stateId)
      ) {
        return;
      }
      active.current = undefined;
      setPending(false);
      setDetails(response);
    } catch (error) {
      if (active.current !== intent) return;
      active.current = undefined;
      setPending(false);
      setRecovery(focusedGraphDetailsRecoveryKind(error));
    }
  };

  return (
    <section ref={root} className="focused-graph-details-controller">
      <div className="focused-graph-details-controller__actions">
        <PetraButton
          variant="secondary"
          busy={pending}
          busyLabel="Loading exact Details…"
          aria-controls="focused-graph-details-region"
          data-focused-details-trigger
          onClick={() => void openDetails()}
        >
          Inspect selected Details
        </PetraButton>
        <p>
          The authenticated read retains this task, scope, snapshot, selection,
          semantic layer, temporal position, provenance, and projection
          position.
        </p>
      </div>
      <div id="focused-graph-details-region">
        {details === undefined ? null : (
          <FocusedGraphDetailsPanel
            details={details}
            returnContext={returnContext}
            onReturn={returnToSelection}
            headingRef={heading}
          />
        )}
        {recovery === undefined ? null : (
          <section
            className="focused-graph-details focused-graph-details--recovery"
            aria-labelledby="focused-graph-details-title"
            data-recovery={recovery}
          >
            <p className="reference-panel-kicker">Details recovery</p>
            <h2 id="focused-graph-details-title" ref={heading} tabIndex={-1}>
              {recoveryCopy[recovery].title}
            </h2>
            <p>{recoveryCopy[recovery].detail}</p>
            <div className="focused-graph-details__recovery-actions">
              <PetraButton variant="primary" onClick={() => void openDetails()}>
                Retry exact Details
              </PetraButton>
              <PetraButton variant="quiet" onClick={returnToSelection}>
                Keep graph selection
              </PetraButton>
              <a className="reference-text-link" href={returnContext.path}>
                Return to {returnContext.label}
              </a>
            </div>
          </section>
        )}
      </div>
    </section>
  );
};
