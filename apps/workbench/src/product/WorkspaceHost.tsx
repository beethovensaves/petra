import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";
import type { PetraProjectSemanticGraphView } from "@petra/contracts";

import type { ProjectPlace, ProjectRecord } from "./model.js";

export type WorkspaceRole =
  "outcome" | "artifact" | "source" | "review" | "work" | "inspect";
export type WorkspacePlace = Exclude<ProjectPlace, "settings"> | "inspect";

type WorkspaceDestination = {
  readonly role: WorkspaceRole;
  readonly place: WorkspacePlace;
  readonly label: string;
  readonly coverage?: "complete" | "partial" | "unavailable";
  readonly limitation?: string;
  readonly selected?: NonNullable<ProjectRecord["selection"]>;
  readonly conflict?: string;
};

const workspaceRegistry: Record<
  WorkspacePlace,
  { readonly role: WorkspaceRole; readonly label: string }
> = {
  brief: { role: "outcome", label: "Outcome" },
  composition: { role: "artifact", label: "Artifact" },
  sources: { role: "source", label: "Source" },
  review: { role: "review", label: "Review" },
  work: { role: "work", label: "Work" },
  graph: { role: "inspect", label: "Graph" },
  history: { role: "inspect", label: "History" },
  profile_tool: { role: "inspect", label: "Project definition" },
  petra: { role: "outcome", label: "Conversation" },
  inspect: { role: "inspect", label: "Inspect" },
};

export const projectInspectPath = (
  projectId: string,
  from: string,
  selection?: ProjectRecord["selection"],
  operationIds: readonly string[] = [],
  objectRef?: string,
): string => {
  const query = new URLSearchParams({ from });
  if (operationIds.length > 0) query.set("operations", operationIds.join(","));
  if (objectRef !== undefined) query.set("object", objectRef);
  if (
    selection !== undefined &&
    selection.resolvedRevision !== undefined &&
    selection.recordHash !== undefined &&
    (objectRef === undefined || objectRef === selection.objectId)
  ) {
    query.set("selected", selection.objectId);
    query.set("semanticKey", selection.semanticKey);
    query.set("revision", String(selection.resolvedRevision));
    query.set("recordHash", selection.recordHash);
  }
  return `/projects/${encodeURIComponent(projectId)}/inspect?${query}`;
};

export const resolveWorkspaceDestination = (
  project: ProjectRecord,
  place: WorkspacePlace,
  selectionRequested: boolean,
  nativeGraphAvailable = false,
): WorkspaceDestination => {
  const registered = workspaceRegistry[place];
  const summary = project.placeSummaries?.find((entry) => entry.role === place);
  const selection = selectionRequested ? project.selection : undefined;
  const conflict =
    nativeGraphAvailable && place === "graph"
      ? undefined
      : selection !== undefined &&
          place !== "inspect" &&
          selection.destination !== place
        ? `The selected object belongs in ${selection.destination}, not ${place}. Return to the Project outcome and open it from its current destination.`
        : project.placeSummaries !== undefined &&
            place !== "profile_tool" &&
            place !== "inspect" &&
            summary === undefined
          ? `This Workspace destination is not registered for ${project.title}. Return to the Project outcome.`
          : summary?.coverage === "unavailable"
            ? (summary.limitation ??
              `This Workspace destination is unavailable for ${project.title}.`)
            : undefined;
  return {
    role: registered.role,
    place,
    label: registered.label,
    ...(summary === undefined
      ? {}
      : {
          coverage: summary.coverage,
          ...(summary.limitation === undefined
            ? {}
            : { limitation: summary.limitation }),
        }),
    ...(selection === undefined ||
    (selection.destination !== place && place !== "inspect")
      ? {}
      : { selected: selection }),
    ...(conflict === undefined ? {} : { conflict }),
  };
};

export const hasExactWorkspaceSelection = (
  pathname: string,
  search: string,
): boolean => {
  const query = new URLSearchParams(search);
  if (
    query.has("semanticKey") &&
    query.has("revision") &&
    query.has("recordHash")
  ) {
    return true;
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[0] !== "projects") return false;
  const objectId = parts[3];
  if (objectId === undefined) return false;
  return (
    (parts[2] === "sources" &&
      /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u.test(objectId)) ||
    (parts[2] === "work" &&
      /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u.test(objectId)) ||
    (parts[2] === "composition" &&
      /^draft_artifact_[0-9A-HJKMNP-TV-Z]{26}$/u.test(objectId))
  );
};

export const shouldRevalidateProjectShell = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}): boolean =>
  defaultShouldRevalidate ||
  ((currentUrl.pathname !== nextUrl.pathname ||
    currentUrl.search !== nextUrl.search) &&
    (hasExactWorkspaceSelection(currentUrl.pathname, currentUrl.search) ||
      hasExactWorkspaceSelection(nextUrl.pathname, nextUrl.search)));

const WorkspaceRenderer = ({
  destination,
  project,
  children,
  navigation,
}: {
  navigation?: ReactNode;
  destination: WorkspaceDestination;
  project: ProjectRecord;
  children: ReactNode;
}): React.JSX.Element => {
  const copilot = useCopilotWorkspace();
  const activeAnswer =
    copilot?.visible === true &&
    (copilot.turn !== undefined || copilot.selection !== undefined);
  const selection = destination.selected;
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return (
    <section
      className="reference-workspace-panel"
      id="project-workspace"
      aria-labelledby="project-workspace-title"
      data-workspace-role={destination.role}
      data-workspace-place={destination.place}
      data-workspace-object-ref={selection?.objectId}
      data-workspace-snapshot={project.snapshot.id}
    >
      <div className="reference-workspace-chrome">
        <header className="reference-workspace-heading">
          <div>
            <p className="reference-panel-kicker">Workspace</p>
            <h2 id="project-workspace-title" tabIndex={-1}>
              {activeAnswer
                ? (copilot?.selection?.label ?? "Petra answer")
                : destination.role === "inspect"
                  ? destination.label
                  : (selection?.label ?? destination.label)}
            </h2>
          </div>
          <div className="reference-workspace-heading__actions">
            {destination.role === "inspect" ? null : (
              <Link
                className="reference-workspace-inspect"
                to={projectInspectPath(project.id, from, selection)}
                data-operation-id="shell.inspect-context"
                aria-label={`Inspect ${activeAnswer ? "Project" : (selection?.label ?? destination.label)}`}
              >
                Inspect
              </Link>
            )}
            {selection === undefined ? null : (
              <span
                className="reference-workspace-selection"
                data-state={selection.state}
              >
                {selection.state === "current" ? "Current" : selection.state}
                {selection.resolvedRevision === undefined
                  ? ""
                  : ` · revision ${selection.resolvedRevision}`}
              </span>
            )}
          </div>
        </header>
        {navigation}
      </div>
      {destination.conflict === undefined ? (
        <div className="reference-project-main" data-place={destination.place}>
          {children}
        </div>
      ) : (
        <div className="reference-workspace-conflict" role="alert">
          <p>{destination.conflict}</p>
          <Link to={`/projects/${encodeURIComponent(project.id)}/brief`}>
            Return to outcome
          </Link>
        </div>
      )}
    </section>
  );
};

export const WorkspaceHost = ({
  project,
  place,
  children,
  nativeGraph,
  navigation,
}: {
  project: ProjectRecord;
  navigation?: ReactNode;
  nativeGraph?: PetraProjectSemanticGraphView;
  place: WorkspacePlace;
  children: ReactNode;
}): React.JSX.Element => {
  const location = useLocation();
  const graph = nativeGraph;
  // The native working reader has its own registered authority basis. A stale
  // Neo4j projection summary cannot hide a successfully validated native view.
  const nativeGraphAvailable =
    graph?.schema_name === "petra.project-semantic-graph-view" &&
    graph.project_id === project.id &&
    graph.content.definition_ref.record_id === project.profile.id &&
    String(graph.content.definition_ref.revision) === project.profile.version;
  const destination = resolveWorkspaceDestination(
    project,
    place,
    hasExactWorkspaceSelection(location.pathname, location.search),
    nativeGraphAvailable,
  );
  return (
    <WorkspaceRenderer
      destination={destination}
      project={project}
      navigation={navigation}
    >
      {children}
    </WorkspaceRenderer>
  );
};
