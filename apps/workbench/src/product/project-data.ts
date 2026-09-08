import type {
  PetraProjectShellView,
  ProjectDefinitionTerm,
} from "@petra/contracts";
import type { LoaderFunctionArgs } from "react-router";

import type { AttentionItem, ProjectProfile, ProjectRecord } from "./model.js";

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

const shellView = (value: unknown): PetraProjectShellView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-shell-view" ||
    value.schema_version !== "1.0.0" ||
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
  return value as unknown as PetraProjectShellView;
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
  view: PetraProjectShellView,
  family: "focus" | "finding" | "reference",
): ProjectDefinitionTerm =>
  view.content.definition.terms.find(
    (term) => term.generic_family === family,
  ) ?? fallbackTerm(family);

const profileFrom = (view: PetraProjectShellView): ProjectProfile => {
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

const attentionFrom = (view: PetraProjectShellView): AttentionItem[] => {
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
  view: PetraProjectShellView,
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
}: LoaderFunctionArgs): Promise<ProjectRecord> => {
  if (params.projectId === undefined || params.projectId.length === 0) {
    throw new ProjectDataError("A Project ID is required.", 400);
  }
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(params.projectId)}/shell`,
  );
  return projectRecordFromShellView(shellView(value));
};
