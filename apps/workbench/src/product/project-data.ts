import type {
  PetraProjectEffectiveControlsView,
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSourceView,
  ProjectDefinitionTerm,
} from "@petra/contracts";
import { redirect, type LoaderFunctionArgs } from "react-router";

import type {
  AttentionItem,
  GraphQuestion,
  ProjectProfile,
  ProjectRecord,
  ReviewSession,
  SourceRecord,
} from "./model.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";

class ProjectDataError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProjectDataError";
    this.status = status;
  }
}

const apiToken = (): string => {
  if (typeof window === "undefined") return DEVELOPMENT_TOKEN;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ProjectShellView = PetraProjectShellView | PetraProjectShellViewV11;

const shellView = (value: unknown): ProjectShellView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-shell-view" ||
    (value.schema_version !== "1.0.0" && value.schema_version !== "1.1.0") ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project shell view.",
      502,
    );
  }
  return value as unknown as ProjectShellView;
};

const effectiveControlsView = (
  value: unknown,
): PetraProjectEffectiveControlsView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-effective-controls-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid effective Project controls view.",
      502,
    );
  }
  return value as unknown as PetraProjectEffectiveControlsView;
};

const sourceView = (value: unknown): PetraProjectSourceView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-source-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.project_source_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source view.",
      502,
    );
  }
  return value as unknown as PetraProjectSourceView;
};

const reviewView = (value: unknown): PetraProjectReviewView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-review-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.review_session_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Review view.",
      502,
    );
  }
  return value as unknown as PetraProjectReviewView;
};

const relationshipView = (value: unknown): PetraProjectRelationshipView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-relationship-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project relationship view.",
      502,
    );
  }
  return value as unknown as PetraProjectRelationshipView;
};

const objectLocationView = (value: unknown): PetraProjectObjectLocationView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-object-location-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid semantic destination.",
      502,
    );
  }
  return value as unknown as PetraProjectObjectLocationView;
};

const requestJson = async (path: string): Promise<unknown> => {
  const response = await fetch(path, {
    headers: { authorization: `Bearer ${apiToken()}` },
  });
  if (!response.ok) {
    let message = `Petra could not read this Project (${response.status}).`;
    try {
      const body = (await response.json()) as unknown;
      if (
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.message === "string"
      ) {
        message = body.error.message;
      }
    } catch {
      // The status remains the authoritative error when no JSON body exists.
    }
    throw new ProjectDataError(message, response.status);
  }
  return response.json() as Promise<unknown>;
};

const fallbackTerm = (
  family: ProjectDefinitionTerm["generic_family"],
): ProjectDefinitionTerm => {
  const labels = {
    focus: ["Focus", "Focus items"],
    finding: ["Material", "Material"],
    reference: ["Reference", "References"],
    relationship: ["Relationship", "Relationships"],
    task: ["Task", "Tasks"],
    output: ["Output", "Outputs"],
    other: ["Item", "Items"],
  } as const;
  return {
    semantic_key: `petra.generic-${family}`,
    singular: labels[family][0],
    plural: labels[family][1],
    definition: `Petra's generic ${family} term.`,
    generic_family: family,
  };
};

const termFor = (
  view: ProjectShellView,
  family: "focus" | "finding" | "reference",
): ProjectDefinitionTerm =>
  view.content.definition.terms.find(
    (term) => term.generic_family === family,
  ) ?? fallbackTerm(family);

const profileFrom = (view: ProjectShellView): ProjectProfile => {
  const focus = termFor(view, "focus");
  const finding = termFor(view, "finding");
  const reference = termFor(view, "reference");
  return {
    id: view.content.definition.project_definition_id,
    version: String(view.content.definition.revision),
    label: view.content.definition.label,
    description: view.content.definition.description,
    compatibility: view.content.definition.kernel_compatibility,
    terms: {
      focus: focus.singular,
      focusPlural: focus.plural,
      finding: finding.singular,
      findingPlural: finding.plural,
      reference: reference.singular,
      referencePlural: reference.plural,
    },
  };
};

const attentionFrom = (view: ProjectShellView): AttentionItem[] => {
  const places = new Set(view.content.definition.supported_places);
  return view.content.attention.map((item) => ({
    id: item.attention_id,
    title: item.title,
    summary: item.summary,
    consequence: item.consequence,
    recommendation: item.recommendation,
    rationale: view.content.projection.detail,
    alternatives: [
      "Continue from the current focus",
      ...(places.has("review") ? ["Open Review"] : []),
      ...(places.has("history") ? ["Inspect retained History"] : []),
    ],
  }));
};

export const projectRecordFromShellView = (
  view: ProjectShellView,
): ProjectRecord => {
  const profile = profileFrom(view);
  const objective = view.content.current_objective;
  const hasAttention = view.content.attention.length > 0;
  return {
    id: view.project_id,
    title: view.content.project.name,
    objective:
      objective?.statement ?? "No current Project focus has been selected.",
    updatedAt: view.content.project.updated_at,
    state: hasAttention
      ? "attention"
      : objective === undefined
        ? "early"
        : "ready",
    stateLabel:
      view.content.project.status === "archived"
        ? "Archived"
        : hasAttention
          ? "Needs attention"
          : objective === undefined
            ? "Early Project"
            : "Ready to continue",
    profile,
    snapshot: {
      id: `authority-event-${view.content.authority.event_position}`,
      label: `Authority event ${view.content.authority.event_position}`,
      asOf: view.read_at,
    },
    projection: {
      state:
        view.content.projection.state === "blocked"
          ? "unavailable"
          : view.content.projection.state,
      label: view.content.projection.label,
      detail: view.content.projection.detail,
    },
    focus: {
      label: `Current ${profile.terms.focus.toLocaleLowerCase()}`,
      value: objective?.statement ?? "No current focus",
      summary:
        objective === undefined
          ? "Select an Objective through Petra's authoritative Project command path before starting material Work."
          : `${profile.terms.focus} revision ${objective.revision} is interpreted under ProjectDefinition revision ${view.content.definition.revision}.`,
    },
    baselineChange: `Project revision ${view.content.project.revision}, ProjectDefinition revision ${view.content.definition.revision}, and authority event ${view.content.authority.event_position} were read together under repeatable-read isolation.`,
    attention: attentionFrom(view),
    recentDecisions: [],
    sources: [],
    ...(view.schema_version === "1.0.0"
      ? {}
      : {
          placeSummaries: view.content.place_summaries.map((place) => ({
            role: place.role,
            coverage: place.coverage,
            label: place.label,
            summary: place.summary,
            ...(!("item_count" in place) || place.item_count === undefined
              ? {}
              : { itemCount: place.item_count }),
            attentionCount: place.attention_count,
            ...(place.limitation === undefined
              ? {}
              : { limitation: place.limitation }),
          })),
          ...(view.content.selection === undefined
            ? {}
            : {
                selection: {
                  state: view.content.selection.resolution.state,
                  semanticKey:
                    view.content.selection.resolution.requested_ref
                      .semantic_key,
                  objectId:
                    view.content.selection.resolution.requested_ref.object_id,
                  ...(view.content.selection.resolution.requested_ref
                    .revision === undefined
                    ? {}
                    : {
                        requestedRevision:
                          view.content.selection.resolution.requested_ref
                            .revision,
                      }),
                  ...("resolved_ref" in view.content.selection.resolution
                    ? {
                        resolvedRevision:
                          view.content.selection.resolution.resolved_ref
                            .revision,
                        recordHash:
                          view.content.selection.resolution.resolved_ref
                            .record_hash,
                        label:
                          view.content.selection.resolution.descriptor.label,
                        summary:
                          view.content.selection.resolution.descriptor.summary,
                      }
                    : {}),
                  destination: view.content.selection.primary_destination.role,
                },
              }),
        }),
  };
};

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

export const sourceRecordFromView = (
  view: PetraProjectSourceView,
): SourceRecord => {
  const { binding, identity, copy, rights, representation, downstream_use } =
    view.content;
  const linkedRecords =
    downstream_use.claim_count + downstream_use.assertion_count;
  const limitation =
    representation.extent === "restricted"
      ? "The exact copy is retained, but its RightsDecision does not permit parsing."
      : representation.extent === "identity_only"
        ? "Petra has verified the exact copy and its rights, but no parsed representation is registered."
        : representation.extent === "partial"
          ? `The selected ParsedDocument reports ${representation.quality_state?.replace("_", " ") ?? "partial"} quality.`
          : undefined;
  return {
    id: view.project_source_id,
    title: identity.title,
    kind: titleCase(identity.work_kind),
    role: `${binding.source_role_label}${binding.status === "excluded" ? " · Excluded" : ""}`,
    creator: identity.creators
      .map((creator) => creator.display_name)
      .join(", "),
    revision: `${identity.version_label} · source r${binding.revision}`,
    copy: `${copy.artifact_kind.toLocaleUpperCase()} · ${copy.byte_size.toLocaleString()} bytes · ${copy.artifact_ref.content_hash.slice(0, 18)}…`,
    location: copy.source_location,
    addedAt: binding.added_at,
    extent: representation.extent,
    extentLabel: representation.extent_label,
    rights: `${rights.license_label} · ${rights.decision_status.replace("_", " ")}`,
    downstreamUse:
      linkedRecords === 0
        ? "No Claims or Assertions currently cite this exact parsed copy."
        : `${downstream_use.claim_count} Claims and ${downstream_use.assertion_count} Assertions cite this exact parsed copy.`,
    ...(limitation === undefined ? {} : { limitation }),
    ...(representation.preview === undefined
      ? {}
      : {
          excerpt: {
            heading: representation.preview.heading,
            locator: representation.preview.locator,
            text: representation.preview.text,
            context: `Exact ${representation.preview.verification_status.replaceAll("_", " ")} span ${representation.preview.span_ref.record_id}; read with authority event ${view.content.authority.event_position}.`,
          },
        }),
  };
};

export const reviewSessionFromView = (
  view: PetraProjectReviewView,
): ReviewSession => {
  if (view.content.members.length !== 1) {
    throw new ProjectDataError(
      "The current frozen M1 Review surface requires one exact member per session; Petra did not hide or merge additional members.",
      502,
    );
  }
  const member = view.content.members[0];
  if (member === undefined) {
    throw new ProjectDataError("The Review session has no member.", 502);
  }
  if (member.change_sets.length > 1) {
    throw new ProjectDataError(
      "The current frozen M1 Review surface requires one current ChangeSet per member; Petra did not hide earlier or competing ChangeSets.",
      502,
    );
  }
  const changeSet = member.change_sets[0];
  return {
    id: view.review_session_id,
    projectId: view.project_id,
    title: view.content.session.title,
    objective: view.content.session.objective_summary,
    status: view.content.session.status,
    statusLabel: view.content.session.status_label,
    responsible: view.content.session.responsible.display_name,
    snapshot: `Authority event ${view.content.session.snapshot.event_position} · Project stream ${view.content.session.snapshot.stream_revision}${view.content.session.snapshot_state === "stale" ? " · stale" : ""}`,
    returnLabel: view.content.session.return_context.label,
    candidate: {
      id: member.candidate.candidate_id,
      revision: member.candidate.revision_label,
      kind: member.candidate.kind_label,
      current: member.candidate.current,
      proposed: member.candidate.proposed,
      difference: member.candidate.difference,
      origin: member.candidate.origin_label,
      originDetail: member.candidate.origin_detail,
    },
    basis: member.basis.map((basis) => ({
      id: basis.basis_id,
      label: basis.label,
      relation: basis.relation,
      extent: basis.extent,
      detail: basis.detail,
      ...(basis.project_source_id === undefined
        ? {}
        : { sourceId: basis.project_source_id }),
    })),
    validation: {
      state: member.validation.state,
      label: member.validation.label,
      detail: member.validation.detail,
      ...(member.validation.recovery === undefined
        ? {}
        : { recovery: member.validation.recovery }),
    },
    consequences: [...member.consequences],
    ...(changeSet === undefined
      ? {}
      : {
          changeSet: {
            id: changeSet.change_set_ref.record_id,
            revision: `Revision ${changeSet.change_set_ref.revision} · ${changeSet.state}`,
            atomicity: changeSet.atomicity,
            changes: [...changeSet.changes],
            protected: [...changeSet.protected],
          },
        }),
  };
};

const graphPosition = (
  kind: PetraProjectRelationshipView["content"]["nodes"][number]["object_kind"],
  index: number,
): { x: number; y: number } => {
  const positions = {
    work: { x: 18, y: 18 },
    work_version: { x: 40, y: 26 },
    claim: { x: 63, y: 43 },
    source_span: { x: 55 + (index % 2) * 20, y: 67 },
    artifact: { x: 30 + (index % 3) * 24, y: 87 },
  } as const;
  return positions[kind];
};

export const graphQuestionFromView = (
  view: PetraProjectRelationshipView,
): GraphQuestion => {
  const assertion = view.content.relationships.find(
    (relationship) => relationship.predicate === "ASSERTS",
  );
  if (
    assertion === undefined ||
    !view.content.nodes.some(
      (node) => node.node_ref.record_id === assertion.target_id,
    )
  ) {
    throw new ProjectDataError(
      "Petra returned a relationship view without its selected Claim node.",
      502,
    );
  }
  const { authority, projection } = view.content.position;
  const unavailable = "Unavailable in the current M1 relationship view";
  return {
    id: view.content.query.request_hash,
    projectId: view.project_id,
    question: view.content.query.question,
    focusNodeId: assertion.target_id,
    scope: view.content.query.scope,
    completeness: `${view.content.completeness.scope} ${view.content.completeness.omissions.join(" ")}`,
    authoritativeSnapshot: `Authority event ${authority.event_position} · Project stream ${authority.stream_revision}`,
    representedSnapshot: `Represented event ${projection.represented_event_position} · Project stream ${projection.represented_stream_revision} · graph target ${projection.represented_target_sequence}`,
    historicalSnapshot: unavailable,
    workingRevision: unavailable,
    projectionState:
      projection.state === "blocked" ? "unavailable" : projection.state,
    projectionDetail: projection.detail,
    layerAvailability: {
      current: { available: true, label: "Current" },
      working: { available: false, label: unavailable },
      historical: { available: false, label: unavailable },
    },
    nodes: view.content.nodes.map((node, index) => ({
      id: node.node_ref.record_id,
      label: node.label,
      kind: titleCase(node.object_kind),
      summary: node.summary,
      basis: node.basis,
      ...(node.source_destination === undefined
        ? {}
        : { sourceId: node.source_destination.project_source_id }),
      layers: ["current"],
      position: graphPosition(node.object_kind, index),
    })),
    edges: view.content.relationships.map((relationship) => ({
      id: relationship.relationship_ref.element_id,
      from: relationship.source_id,
      to: relationship.target_id,
      label: relationship.label,
      summary: relationship.summary,
      basis: relationship.basis,
      layers: ["current"],
      tone: "neutral",
    })),
  };
};

export const loadProjectCollection = async (): Promise<ProjectRecord[]> => {
  const value = await requestJson("/api/queries/projects");
  if (!isRecord(value) || !Array.isArray(value.projects)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project collection.",
      502,
    );
  }
  return value.projects.map((project) =>
    projectRecordFromShellView(shellView(project)),
  );
};

export const loadProjectRecord = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProjectRecord> => {
  if (params.projectId === undefined || params.projectId.length === 0) {
    throw new ProjectDataError("A Project ID is required.", 400);
  }
  const requestUrl = new URL(request.url);
  const incoming = requestUrl.searchParams;
  const semanticKey = incoming.get("semanticKey");
  const objectPathSegment =
    semanticKey === "petra.project-source"
      ? "sources"
      : semanticKey === "petra.work-unit"
        ? "work"
        : semanticKey === "petra.draft-artifact"
          ? "composition"
          : undefined;
  const pathParts = requestUrl.pathname.split("/").filter(Boolean);
  const objectPathIndex =
    objectPathSegment === undefined
      ? -1
      : pathParts.lastIndexOf(objectPathSegment);
  const pathObjectId =
    objectPathIndex < 0 ? undefined : pathParts[objectPathIndex + 1];
  const selected =
    incoming.get("selected") ??
    params.sourceId ??
    params.workId ??
    params.artifactId ??
    pathObjectId ??
    null;
  const revision = incoming.get("revision");
  const recordHash = incoming.get("recordHash");
  const hasExactSelection =
    semanticKey !== null &&
    selected !== null &&
    revision !== null &&
    recordHash !== null;
  const hasExactSelectionMetadata =
    semanticKey !== null || revision !== null || recordHash !== null;
  if (hasExactSelectionMetadata && !hasExactSelection) {
    throw new ProjectDataError(
      "An exact Project selection requires semantic key, object identity, revision, and record hash together.",
      400,
    );
  }
  const query = new URLSearchParams();
  if (hasExactSelection) {
    query.set("semanticKey", semanticKey);
    query.set("objectId", selected);
    query.set("revision", revision);
    query.set("taskIntent", "inspect");
  }
  const suffix = query.size === 0 ? "" : `?${query}`;
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(params.projectId)}/shell${suffix}`,
  );
  const view = shellView(value);
  if (hasExactSelection) {
    if (
      view.schema_version !== "1.1.0" ||
      view.content.selection === undefined ||
      !("resolved_ref" in view.content.selection.resolution) ||
      view.content.selection.resolution.resolved_ref.semantic_key !==
        semanticKey ||
      view.content.selection.resolution.resolved_ref.object_id !== selected ||
      view.content.selection.resolution.resolved_ref.revision !==
        Number(revision) ||
      view.content.selection.resolution.resolved_ref.record_hash !== recordHash
    ) {
      throw new ProjectDataError(
        "Petra could not reproduce the exact selected object in the Project shell snapshot.",
        502,
      );
    }
  }
  return projectRecordFromShellView(view);
};

export interface ProjectSettingsData {
  selectedProject?: ProjectRecord;
  controls?: PetraProjectEffectiveControlsView;
}

export const loadProjectSettings = async ({
  request,
}: LoaderFunctionArgs): Promise<ProjectSettingsData> => {
  const target = new URL(request.url).searchParams.get("project");
  if (target === null) return {};
  if (target.length === 0) {
    throw new ProjectDataError(
      "A Settings Project target cannot be empty.",
      400,
    );
  }
  const encoded = encodeURIComponent(target);
  const [projectValue, controlsValue] = await Promise.all([
    requestJson(`/api/queries/projects/${encoded}/shell`),
    requestJson(`/api/queries/projects/${encoded}/effective-controls`),
  ]);
  const projectView = shellView(projectValue);
  const controls = effectiveControlsView(controlsValue);
  if (
    projectView.project_id !== target ||
    controls.project_id !== target ||
    controls.content.project_ref.record_id !== target ||
    controls.content.project_ref.revision !==
      projectView.content.project.revision ||
    controls.content.project_definition_ref.project_definition_id !==
      projectView.content.definition.project_definition_id ||
    controls.content.project_definition_ref.revision !==
      projectView.content.definition.revision ||
    controls.content.project_definition_ref.content_hash !==
      projectView.content.definition.content_hash
  ) {
    throw new ProjectDataError(
      "Petra returned controls from a different Project or definition snapshot.",
      502,
    );
  }
  return {
    selectedProject: projectRecordFromShellView(projectView),
    controls,
  };
};

const requiredRouteIdentity = (
  value: string | undefined,
  label: string,
): string => {
  if (value === undefined || value.length === 0) {
    throw new ProjectDataError(`${label} is required.`, 400);
  }
  return value;
};

export const loadProjectSourceCollection = async ({
  params,
}: LoaderFunctionArgs): Promise<SourceRecord[]> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/sources`,
  );
  if (!isRecord(value) || !Array.isArray(value.sources)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source collection.",
      502,
    );
  }
  return value.sources.map((source) => {
    const view = sourceView(source);
    if (view.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned a source from another Project.",
        502,
      );
    }
    return sourceRecordFromView(view);
  });
};

export const loadProjectSourceRecord = async ({
  params,
}: LoaderFunctionArgs): Promise<SourceRecord> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const sourceId = requiredRouteIdentity(params.sourceId, "A ProjectSource ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}`,
  );
  const view = sourceView(value);
  if (view.project_id !== projectId || view.project_source_id !== sourceId) {
    throw new ProjectDataError(
      "Petra returned a different Project source identity.",
      502,
    );
  }
  return sourceRecordFromView(view);
};

export const loadProjectReviewCollection = async ({
  params,
}: LoaderFunctionArgs): Promise<ReviewSession[]> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/reviews`,
  );
  if (!isRecord(value) || !Array.isArray(value.reviews)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Review collection.",
      502,
    );
  }
  return value.reviews.map((review) => {
    const view = reviewView(review);
    if (view.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned a Review session from another Project.",
        502,
      );
    }
    return reviewSessionFromView(view);
  });
};

export const loadProjectReviewSession = async ({
  params,
}: LoaderFunctionArgs): Promise<ReviewSession> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const reviewSessionId = requiredRouteIdentity(
    params.reviewId,
    "A ReviewSession ID",
  );
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(reviewSessionId)}`,
  );
  const view = reviewView(value);
  if (
    view.project_id !== projectId ||
    view.review_session_id !== reviewSessionId
  ) {
    throw new ProjectDataError(
      "Petra returned a different Project Review identity.",
      502,
    );
  }
  return reviewSessionFromView(view);
};

export const loadProjectRelationshipView = async ({
  params,
}: LoaderFunctionArgs): Promise<GraphQuestion | undefined> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  let value: unknown;
  try {
    value = await requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/relationship-view`,
    );
  } catch (error) {
    if (error instanceof ProjectDataError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
  const view = relationshipView(value);
  if (view.project_id !== projectId) {
    throw new ProjectDataError(
      "Petra returned a relationship view from another Project.",
      502,
    );
  }
  return graphQuestionFromView(view);
};

const exactSelection = (
  target: NonNullable<
    PetraProjectObjectLocationView["content"]["primary_destination"]["target_ref"]
  >,
): URLSearchParams =>
  new URLSearchParams({
    selected: target.object_id,
    semanticKey: target.semantic_key,
    revision: String(target.revision),
    recordHash: target.record_hash,
  });

export const semanticDestinationPath = (
  view: PetraProjectObjectLocationView,
): string => {
  const projectRoot = `/projects/${encodeURIComponent(view.project_id)}`;
  const destination = view.content.primary_destination;
  const target = destination.target_ref;
  if (destination.role === "brief") return `${projectRoot}/brief`;
  if (destination.role === "settings") return "/settings";
  if (destination.role === "petra") return `${projectRoot}/petra`;
  if (destination.role === "profile_tool") {
    if (destination.profile_tool_key === undefined) {
      throw new ProjectDataError(
        "Petra returned a profile-tool destination without a registered key.",
        502,
      );
    }
    return `${projectRoot}/tools/${encodeURIComponent(destination.profile_tool_key)}`;
  }
  if (target === undefined) {
    throw new ProjectDataError(
      `Petra returned ${destination.role} without an exact target.`,
      502,
    );
  }
  const selection = exactSelection(target);
  if (destination.role === "sources") {
    selection.delete("selected");
    return `${projectRoot}/sources/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  if (destination.role === "work") {
    selection.delete("selected");
    return `${projectRoot}/work/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  if (destination.role === "composition") {
    selection.delete("selected");
    return `${projectRoot}/composition/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  return `${projectRoot}/${destination.role}?${selection}`;
};

export const loadProjectObjectLocationRedirect = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["semanticKey", "objectId", "revision", "taskIntent"]) {
    const values = incoming.getAll(key);
    for (const value of values) query.append(key, value);
  }
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/object-location?${query}`,
  );
  const view = objectLocationView(value);
  const requestedSemanticKey = incoming.get("semanticKey");
  const requestedObjectId = incoming.get("objectId");
  const requestedRevision = incoming.get("revision");
  const returnedRequest = view.content.request.object_ref;
  if (
    view.project_id !== projectId ||
    returnedRequest.semantic_key !== requestedSemanticKey ||
    returnedRequest.object_id !== requestedObjectId ||
    (requestedRevision === null
      ? returnedRequest.revision !== undefined
      : returnedRequest.revision !== Number(requestedRevision))
  ) {
    throw new ProjectDataError(
      "Petra returned a semantic destination for a different identity.",
      502,
    );
  }
  return redirect(semanticDestinationPath(view));
};
