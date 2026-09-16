import type {
  FocusedGraphExactRef,
  FocusedGraphLimits,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphSemanticDestination,
  FocusedGraphTemporalPosition,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
} from "@petra/contracts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { focusedGraphRegionsFromView } from "./focused-graph-regions.js";
import { createFocusedGraphRequestId } from "./focused-graph-identities.js";
import { FocusedGraphExploration } from "./FocusedGraphExploration.js";
import {
  FocusedGraphComparison,
  FocusedGraphPositionNavigation,
} from "./FocusedGraphPositions.js";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REQUEST_ID = /^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const DEFINITION_ID = /^project_definition_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PETRA_ID = /^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;
const SEMANTIC_KEY = /^[a-z][a-z0-9._/-]{1,199}$/u;
const STABLE_KEY = /^[a-z][a-z0-9._:/-]{1,999}$/u;
const DESTINATION_KINDS = new Set([
  "details",
  "source_inspection",
  "brief",
  "evidence",
  "review",
  "history",
  "work",
]);
const DESTINATION_OWNERS = new Set([
  "project_object_location_view",
  "project_source_view",
  "project_brief_view",
  "project_relationship_view",
  "project_review_view",
  "project_history_episode_view",
  "project_work_view",
]);

const ENTRY_VERSION = "1";
export { createFocusedGraphRequestId } from "./focused-graph-identities.js";

export type FocusedGraphEntryOriginKind =
  "brief" | "review" | "petra" | "history" | "saved_question" | "direct";

export interface FocusedGraphEntryDefinitionRef {
  readonly project_definition_id: string;
  readonly revision: number;
  readonly content_hash: string;
  readonly definition_family: string;
  readonly record_hash?: string;
}

export interface FocusedGraphReturnContext {
  readonly path: string;
  readonly label: string;
  readonly focus_id?: string;
}

export interface FocusedGraphHistoricalPosition {
  readonly snapshot: FocusedGraphProjectSnapshotRef;
  readonly temporal_position: Extract<
    FocusedGraphTemporalPosition,
    { readonly position_kind: "historical" }
  > & {
    readonly dimension: "recorded_time";
    readonly at: { readonly state: "exact"; readonly value: string };
  };
}

export type FocusedGraphPresentation =
  "position" | "current_working_comparison";

export interface FocusedGraphEntry {
  readonly project_id: string;
  readonly request_id: string;
  readonly question: string;
  readonly focus_ref: FocusedGraphExactRef;
  readonly origin: {
    readonly origin_kind: FocusedGraphEntryOriginKind;
    readonly origin_ref?: FocusedGraphExactRef;
  };
  readonly project_definition_ref: FocusedGraphEntryDefinitionRef;
  readonly task_semantic_key: string;
  readonly object_semantic_key: string;
  readonly relationship_semantic_key: string;
  readonly return_action_semantic_key: string;
  readonly return_destination: FocusedGraphSemanticDestination & {
    readonly state: "available";
  };
  readonly limits: FocusedGraphLimits;
  readonly semantic_layer: "current" | "working" | "historical";
  readonly presentation: FocusedGraphPresentation;
  readonly expected_snapshot?: FocusedGraphProjectSnapshotRef;
  readonly historical_position?: FocusedGraphHistoricalPosition;
  readonly return_context: FocusedGraphReturnContext;
}

export type FocusedGraphEntryDraft = Omit<
  FocusedGraphEntry,
  "request_id" | "return_context"
> & {
  readonly return_context: Omit<FocusedGraphReturnContext, "path"> & {
    readonly path?: string;
  };
};

export interface FocusedGraphRouteData {
  readonly kind: "focused_graph";
  readonly entry: FocusedGraphEntry;
  readonly definition: PetraProjectDefinition;
  readonly view: PetraFocusedGraphView | PetraFocusedGraphViewV11;
  readonly comparison?: {
    readonly before: PetraFocusedGraphView;
    readonly after: PetraFocusedGraphView;
  };
}

export class FocusedGraphEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FocusedGraphEntryError";
  }
}

const requiredParam = (params: URLSearchParams, key: string): string => {
  const values = params.getAll(key);
  if (values.length !== 1 || values[0]?.length === 0) {
    throw new FocusedGraphEntryError(
      `The focused graph entry requires one exact ${key}.`,
    );
  }
  return values[0]!;
};

const optionalParam = (
  params: URLSearchParams,
  key: string,
): string | undefined => {
  const values = params.getAll(key);
  if (values.length > 1) {
    throw new FocusedGraphEntryError(
      `The focused graph entry accepts at most one ${key}.`,
    );
  }
  return values[0];
};

const positiveInteger = (
  value: string,
  key: string,
  maximum?: number,
): number => {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    (maximum !== undefined && parsed > maximum)
  ) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${key}.`,
    );
  }
  return parsed;
};

const nonNegativeInteger = (value: string, key: string): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${key}.`,
    );
  }
  return parsed;
};

const exactRef = (
  params: URLSearchParams,
  prefix: string,
): FocusedGraphExactRef => {
  const record_id = requiredParam(params, `${prefix}Id`);
  const revision = positiveInteger(
    requiredParam(params, `${prefix}Revision`),
    `${prefix}Revision`,
  );
  const record_hash = requiredParam(params, `${prefix}Hash`);
  if (!PETRA_ID.test(record_id) || !HASH.test(record_hash)) {
    throw new FocusedGraphEntryError(
      `The focused graph entry has an invalid ${prefix} reference.`,
    );
  }
  return { record_id, revision, record_hash };
};

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const safeReturnPath = (projectId: string, value: string): string => {
  const url = new URL(value, "https://petra.local");
  const root = `/projects/${encodeURIComponent(projectId)}`;
  if (
    url.origin !== "https://petra.local" ||
    (url.pathname !== root && !url.pathname.startsWith(`${root}/`))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph return context must stay inside the exact Project.",
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const validSnapshot = (snapshot: FocusedGraphProjectSnapshotRef): boolean =>
  /^snapshot_[0-9A-HJKMNP-TV-Z]{26}$/u.test(snapshot.snapshot_id) &&
  Number.isSafeInteger(snapshot.revision) &&
  snapshot.revision >= 1 &&
  Number.isSafeInteger(snapshot.event_position) &&
  snapshot.event_position >= 0 &&
  HASH.test(snapshot.content_hash);

const exactRecordedTime = (value: string): boolean => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const assertEntry = (entry: FocusedGraphEntry): FocusedGraphEntry => {
  if (
    !PROJECT_ID.test(entry.project_id) ||
    !REQUEST_ID.test(entry.request_id) ||
    entry.question.trim().length === 0 ||
    entry.question.length > 8000 ||
    !DEFINITION_ID.test(entry.project_definition_ref.project_definition_id) ||
    !Number.isSafeInteger(entry.project_definition_ref.revision) ||
    entry.project_definition_ref.revision < 1 ||
    !HASH.test(entry.project_definition_ref.content_hash) ||
    (entry.project_definition_ref.record_hash !== undefined &&
      !HASH.test(entry.project_definition_ref.record_hash)) ||
    !/^[a-z][a-z0-9.-]{2,127}$/u.test(
      entry.project_definition_ref.definition_family,
    ) ||
    !SEMANTIC_KEY.test(entry.task_semantic_key) ||
    !SEMANTIC_KEY.test(entry.object_semantic_key) ||
    !SEMANTIC_KEY.test(entry.relationship_semantic_key) ||
    !SEMANTIC_KEY.test(entry.return_action_semantic_key) ||
    !STABLE_KEY.test(entry.return_destination.destination_key) ||
    !DESTINATION_KINDS.has(entry.return_destination.destination_kind) ||
    !DESTINATION_OWNERS.has(entry.return_destination.owner) ||
    entry.return_destination.state !== "available" ||
    !["current", "working", "historical"].includes(entry.semantic_layer) ||
    !["position", "current_working_comparison"].includes(entry.presentation) ||
    (entry.expected_snapshot !== undefined &&
      !validSnapshot(entry.expected_snapshot)) ||
    (entry.historical_position !== undefined &&
      (!validSnapshot(entry.historical_position.snapshot) ||
        entry.historical_position.temporal_position.position_kind !==
          "historical" ||
        entry.historical_position.temporal_position.dimension !==
          "recorded_time" ||
        entry.historical_position.temporal_position.at.state !== "exact" ||
        !exactRecordedTime(
          entry.historical_position.temporal_position.at.value,
        ))) ||
    (entry.semantic_layer === "historical" &&
      entry.historical_position === undefined) ||
    (entry.presentation === "current_working_comparison" &&
      entry.semantic_layer === "historical") ||
    entry.return_context.label.trim().length === 0 ||
    entry.return_context.label.length > 240 ||
    (entry.return_context.focus_id !== undefined &&
      !/^[A-Za-z][A-Za-z0-9_:.-]{0,199}$/u.test(entry.return_context.focus_id))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry is incomplete or incompatible.",
    );
  }
  if (
    entry.origin.origin_kind !== "direct" &&
    entry.origin.origin_ref === undefined
  ) {
    throw new FocusedGraphEntryError(
      "A contextual focused graph entry requires its exact originating object.",
    );
  }
  if (
    entry.origin.origin_ref !== undefined &&
    !sameRef(entry.origin.origin_ref, entry.focus_ref)
  ) {
    throw new FocusedGraphEntryError(
      "This bounded entry requires the selected object to remain its exact origin.",
    );
  }
  if (!sameRef(entry.return_destination.target_ref, entry.focus_ref)) {
    throw new FocusedGraphEntryError(
      "The focused graph return destination must preserve the selected object.",
    );
  }
  if (
    entry.limits.maximum_depth !== 1 ||
    entry.limits.maximum_nodes < 1 ||
    entry.limits.maximum_nodes > 100 ||
    entry.limits.maximum_relationships < 1 ||
    entry.limits.maximum_relationships > 99 ||
    entry.limits.maximum_paths < 1 ||
    entry.limits.maximum_paths > 99
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry exceeds the current finite query boundary.",
    );
  }
  safeReturnPath(entry.project_id, entry.return_context.path);
  return entry;
};

const appendRef = (
  params: URLSearchParams,
  prefix: string,
  ref: FocusedGraphExactRef,
): void => {
  params.set(`${prefix}Id`, ref.record_id);
  params.set(`${prefix}Revision`, String(ref.revision));
  params.set(`${prefix}Hash`, ref.record_hash);
};

export const focusedGraphEntryPath = (entry: FocusedGraphEntry): string => {
  assertEntry(entry);
  const params = new URLSearchParams({
    graphEntry: ENTRY_VERSION,
    requestId: entry.request_id,
    question: entry.question,
    origin: entry.origin.origin_kind,
    definitionId: entry.project_definition_ref.project_definition_id,
    definitionRevision: String(entry.project_definition_ref.revision),
    definitionHash: entry.project_definition_ref.content_hash,
    definitionFamily: entry.project_definition_ref.definition_family,
    taskSemanticKey: entry.task_semantic_key,
    objectSemanticKey: entry.object_semantic_key,
    relationshipSemanticKey: entry.relationship_semantic_key,
    returnActionSemanticKey: entry.return_action_semantic_key,
    returnDestinationKey: entry.return_destination.destination_key,
    returnDestinationKind: entry.return_destination.destination_kind,
    returnDestinationOwner: entry.return_destination.owner,
    returnDestinationLabel: entry.return_destination.label,
    semanticLayer: entry.semantic_layer,
    presentation: entry.presentation,
    maximumDepth: String(entry.limits.maximum_depth),
    maximumNodes: String(entry.limits.maximum_nodes),
    maximumRelationships: String(entry.limits.maximum_relationships),
    maximumPaths: String(entry.limits.maximum_paths),
    returnPath: entry.return_context.path,
    returnLabel: entry.return_context.label,
  });
  appendRef(params, "focus", entry.focus_ref);
  appendRef(params, "returnTarget", entry.return_destination.target_ref);
  if (entry.origin.origin_ref !== undefined) {
    appendRef(params, "originRef", entry.origin.origin_ref);
  }
  if (entry.project_definition_ref.record_hash !== undefined) {
    params.set(
      "definitionRecordHash",
      entry.project_definition_ref.record_hash,
    );
  }
  if (entry.return_context.focus_id !== undefined) {
    params.set("returnFocus", entry.return_context.focus_id);
  }
  if (entry.expected_snapshot !== undefined) {
    params.set("snapshotId", entry.expected_snapshot.snapshot_id);
    params.set("snapshotRevision", String(entry.expected_snapshot.revision));
    params.set(
      "snapshotEventPosition",
      String(entry.expected_snapshot.event_position),
    );
    params.set("snapshotHash", entry.expected_snapshot.content_hash);
  }
  if (entry.historical_position !== undefined) {
    const historical = entry.historical_position;
    params.set("historicalSnapshotId", historical.snapshot.snapshot_id);
    params.set(
      "historicalSnapshotRevision",
      String(historical.snapshot.revision),
    );
    params.set(
      "historicalSnapshotEventPosition",
      String(historical.snapshot.event_position),
    );
    params.set("historicalSnapshotHash", historical.snapshot.content_hash);
    params.set("historicalRecordedAt", historical.temporal_position.at.value);
  }
  return `/projects/${encodeURIComponent(entry.project_id)}/graph?${params}`;
};

const requiredKeys = new Set([
  "graphEntry",
  "requestId",
  "question",
  "focusId",
  "focusRevision",
  "focusHash",
  "origin",
  "definitionId",
  "definitionRevision",
  "definitionHash",
  "definitionFamily",
  "taskSemanticKey",
  "objectSemanticKey",
  "relationshipSemanticKey",
  "returnActionSemanticKey",
  "returnDestinationKey",
  "returnDestinationKind",
  "returnDestinationOwner",
  "returnDestinationLabel",
  "semanticLayer",
  "presentation",
  "returnTargetId",
  "returnTargetRevision",
  "returnTargetHash",
  "maximumDepth",
  "maximumNodes",
  "maximumRelationships",
  "maximumPaths",
  "returnPath",
  "returnLabel",
]);

const optionalKeys = new Set([
  "originRefId",
  "originRefRevision",
  "originRefHash",
  "definitionRecordHash",
  "returnFocus",
  "snapshotId",
  "snapshotRevision",
  "snapshotEventPosition",
  "snapshotHash",
  "historicalSnapshotId",
  "historicalSnapshotRevision",
  "historicalSnapshotEventPosition",
  "historicalSnapshotHash",
  "historicalRecordedAt",
]);

export const focusedGraphEntryFromSearch = (
  projectId: string,
  params: URLSearchParams,
): FocusedGraphEntry | undefined => {
  if (!params.has("graphEntry")) return undefined;
  if (
    [...params.keys()].some(
      (key) => !requiredKeys.has(key) && !optionalKeys.has(key),
    ) ||
    [...requiredKeys].some((key) => params.getAll(key).length !== 1)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry contains missing, duplicate, or unsupported fields.",
    );
  }
  if (requiredParam(params, "graphEntry") !== ENTRY_VERSION) {
    throw new FocusedGraphEntryError(
      "This focused graph entry version is unsupported.",
    );
  }
  const originKind = requiredParam(params, "origin");
  if (
    ![
      "brief",
      "review",
      "petra",
      "history",
      "saved_question",
      "direct",
    ].includes(originKind)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry origin is unsupported.",
    );
  }
  const originRefFields = [
    optionalParam(params, "originRefId"),
    optionalParam(params, "originRefRevision"),
    optionalParam(params, "originRefHash"),
  ];
  if (
    originRefFields.some((value) => value !== undefined) &&
    originRefFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry origin reference is incomplete.",
    );
  }
  const snapshotFields = [
    optionalParam(params, "snapshotId"),
    optionalParam(params, "snapshotRevision"),
    optionalParam(params, "snapshotEventPosition"),
    optionalParam(params, "snapshotHash"),
  ];
  if (
    snapshotFields.some((value) => value !== undefined) &&
    snapshotFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry snapshot reference is incomplete.",
    );
  }
  const historicalFields = [
    optionalParam(params, "historicalSnapshotId"),
    optionalParam(params, "historicalSnapshotRevision"),
    optionalParam(params, "historicalSnapshotEventPosition"),
    optionalParam(params, "historicalSnapshotHash"),
    optionalParam(params, "historicalRecordedAt"),
  ];
  if (
    historicalFields.some((value) => value !== undefined) &&
    historicalFields.some((value) => value === undefined)
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph historical position is incomplete.",
    );
  }
  const focus = exactRef(params, "focus");
  const originRef =
    originRefFields[0] === undefined
      ? undefined
      : exactRef(params, "originRef");
  const snapshotId = snapshotFields[0];
  const expectedSnapshot =
    snapshotId === undefined
      ? undefined
      : {
          snapshot_id: snapshotId,
          revision: positiveInteger(snapshotFields[1]!, "snapshotRevision"),
          event_position: nonNegativeInteger(
            snapshotFields[2]!,
            "snapshotEventPosition",
          ),
          content_hash: snapshotFields[3]!,
        };
  if (
    expectedSnapshot !== undefined &&
    (!/^snapshot_[0-9A-HJKMNP-TV-Z]{26}$/u.test(expectedSnapshot.snapshot_id) ||
      !HASH.test(expectedSnapshot.content_hash))
  ) {
    throw new FocusedGraphEntryError(
      "The focused graph entry snapshot reference is invalid.",
    );
  }
  const definitionRecordHash = optionalParam(params, "definitionRecordHash");
  const returnFocus = optionalParam(params, "returnFocus");
  const semanticLayer = requiredParam(params, "semanticLayer");
  const presentation = requiredParam(params, "presentation");
  const historicalSnapshotId = historicalFields[0];
  const historicalPosition =
    historicalSnapshotId === undefined
      ? undefined
      : {
          snapshot: {
            snapshot_id: historicalSnapshotId,
            revision: positiveInteger(
              historicalFields[1]!,
              "historicalSnapshotRevision",
            ),
            event_position: nonNegativeInteger(
              historicalFields[2]!,
              "historicalSnapshotEventPosition",
            ),
            content_hash: historicalFields[3]!,
          },
          temporal_position: {
            position_kind: "historical" as const,
            dimension: "recorded_time" as const,
            at: {
              state: "exact" as const,
              value: historicalFields[4]!,
            },
          },
        };
  const entry: FocusedGraphEntry = {
    project_id: projectId,
    request_id: requiredParam(params, "requestId"),
    question: requiredParam(params, "question"),
    focus_ref: focus,
    origin: {
      origin_kind: originKind as FocusedGraphEntryOriginKind,
      ...(originRef === undefined ? {} : { origin_ref: originRef }),
    },
    project_definition_ref: {
      project_definition_id: requiredParam(params, "definitionId"),
      revision: positiveInteger(
        requiredParam(params, "definitionRevision"),
        "definitionRevision",
      ),
      content_hash: requiredParam(params, "definitionHash"),
      definition_family: requiredParam(params, "definitionFamily"),
      ...(definitionRecordHash === undefined
        ? {}
        : { record_hash: definitionRecordHash }),
    },
    task_semantic_key: requiredParam(params, "taskSemanticKey"),
    object_semantic_key: requiredParam(params, "objectSemanticKey"),
    relationship_semantic_key: requiredParam(params, "relationshipSemanticKey"),
    return_action_semantic_key: requiredParam(
      params,
      "returnActionSemanticKey",
    ),
    return_destination: {
      destination_key: requiredParam(params, "returnDestinationKey"),
      destination_kind: requiredParam(
        params,
        "returnDestinationKind",
      ) as FocusedGraphSemanticDestination["destination_kind"],
      state: "available",
      owner: requiredParam(
        params,
        "returnDestinationOwner",
      ) as FocusedGraphSemanticDestination["owner"],
      label: requiredParam(params, "returnDestinationLabel"),
      target_ref: exactRef(params, "returnTarget"),
    },
    limits: {
      maximum_depth: positiveInteger(
        requiredParam(params, "maximumDepth"),
        "maximumDepth",
        1,
      ),
      maximum_nodes: positiveInteger(
        requiredParam(params, "maximumNodes"),
        "maximumNodes",
        100,
      ),
      maximum_relationships: positiveInteger(
        requiredParam(params, "maximumRelationships"),
        "maximumRelationships",
        99,
      ),
      maximum_paths: positiveInteger(
        requiredParam(params, "maximumPaths"),
        "maximumPaths",
        99,
      ),
    },
    semantic_layer: semanticLayer as FocusedGraphEntry["semantic_layer"],
    presentation: presentation as FocusedGraphPresentation,
    ...(expectedSnapshot === undefined
      ? {}
      : { expected_snapshot: expectedSnapshot }),
    ...(historicalPosition === undefined
      ? {}
      : { historical_position: historicalPosition }),
    return_context: {
      path: safeReturnPath(projectId, requiredParam(params, "returnPath")),
      label: requiredParam(params, "returnLabel"),
      ...(returnFocus === undefined ? {} : { focus_id: returnFocus }),
    },
  };
  return assertEntry(entry);
};

export const focusedGraphDefinitionRef = (
  definition: PetraProjectDefinition,
): FocusedGraphEntryDefinitionRef => ({
  project_definition_id: definition.project_definition_id,
  revision: definition.revision,
  content_hash: definition.content_hash,
  definition_family: definition.definition_family,
});

export const scientificFocusedGraphSemantics = (
  definition: PetraProjectDefinition,
):
  | Pick<
      FocusedGraphEntry,
      | "task_semantic_key"
      | "object_semantic_key"
      | "relationship_semantic_key"
      | "return_action_semantic_key"
    >
  | undefined => {
  const expected = [
    ["scientific.research-question", "objective_schema"],
    ["scientific.claim", "object_schema"],
    ["scientific.assertion", "relationship_schema"],
    ["scientific.graph.return", "extension"],
    ["petra.focused-graph", "extension"],
  ] as const;
  const registered = expected.every(
    ([semanticKey, registrationKind]) =>
      definition.content.registrations.filter(
        (registration) =>
          registration.semantic_key === semanticKey &&
          registration.registration_kind === registrationKind,
      ).length === 1 &&
      (semanticKey === "petra.focused-graph" ||
        definition.content.terms.filter(
          (term) => term.semantic_key === semanticKey,
        ).length === 1),
  );
  if (!registered) return undefined;
  return {
    task_semantic_key: "scientific.research-question",
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.return",
  };
};

export const scientificFocusedGraphEntryDraft = (input: {
  readonly projectId: string;
  readonly question: string;
  readonly focusRef: FocusedGraphExactRef;
  readonly originKind: FocusedGraphEntryOriginKind;
  readonly definitionRef: FocusedGraphEntryDefinitionRef;
  readonly returnDestinationKind: FocusedGraphSemanticDestination["destination_kind"];
  readonly returnDestinationOwner: FocusedGraphSemanticDestination["owner"];
  readonly returnLabel: string;
  readonly returnFocusId?: string;
  readonly expectedSnapshot?: FocusedGraphProjectSnapshotRef;
  readonly historicalPosition?: FocusedGraphHistoricalPosition;
  readonly semanticLayer?: FocusedGraphEntry["semantic_layer"];
}): FocusedGraphEntryDraft => ({
  project_id: input.projectId,
  question: input.question,
  focus_ref: structuredClone(input.focusRef),
  origin: {
    origin_kind: input.originKind,
    ...(input.originKind === "direct"
      ? {}
      : { origin_ref: structuredClone(input.focusRef) }),
  },
  project_definition_ref: structuredClone(input.definitionRef),
  task_semantic_key: "scientific.research-question",
  object_semantic_key: "scientific.claim",
  relationship_semantic_key: "scientific.assertion",
  return_action_semantic_key: "scientific.graph.return",
  return_destination: {
    destination_key: `destination:${input.originKind}:${input.focusRef.record_id.toLowerCase()}`,
    destination_kind: input.returnDestinationKind,
    state: "available",
    owner: input.returnDestinationOwner,
    label: input.returnLabel,
    target_ref: structuredClone(input.focusRef),
  },
  limits: {
    maximum_depth: 1,
    maximum_nodes: 25,
    maximum_relationships: 24,
    maximum_paths: 24,
  },
  semantic_layer: input.semanticLayer ?? "current",
  presentation: "position",
  ...(input.expectedSnapshot === undefined
    ? {}
    : { expected_snapshot: structuredClone(input.expectedSnapshot) }),
  ...(input.historicalPosition === undefined
    ? {}
    : { historical_position: structuredClone(input.historicalPosition) }),
  return_context: {
    label: input.returnLabel,
    ...(input.returnFocusId === undefined
      ? {}
      : { focus_id: input.returnFocusId }),
  },
});

export const FocusedGraphEntryLink = ({
  entry,
  children,
  className = "reference-text-link",
}: {
  entry: FocusedGraphEntryDraft;
  children: ReactNode;
  className?: string;
}): React.JSX.Element | null => {
  const location = useLocation();
  const [requestId] = useState(createFocusedGraphRequestId);
  const currentReturnPath = `${location.pathname}${location.search}${
    entry.return_context.focus_id === undefined
      ? location.hash
      : `#${encodeURIComponent(entry.return_context.focus_id)}`
  }`;
  const returnPath = entry.return_context.path ?? currentReturnPath;
  const exactEntry: FocusedGraphEntry = {
    ...entry,
    request_id: requestId,
    return_context: { ...entry.return_context, path: returnPath },
  };
  let path: string;
  try {
    path = focusedGraphEntryPath(exactEntry);
  } catch (error) {
    if (error instanceof FocusedGraphEntryError) return null;
    throw error;
  }
  return (
    <Link className={className} to={path}>
      {children}
    </Link>
  );
};

const originLabel: Record<FocusedGraphEntryOriginKind, string> = {
  brief: "Brief",
  review: "Review",
  petra: "Petra",
  history: "History",
  saved_question: "saved question",
  direct: "direct Graph entry",
};

const layerLabel: Record<FocusedGraphEntry["semantic_layer"], string> = {
  current: "Current",
  working: "Working changes",
  historical: "Historical",
};

const layerSymbol: Record<FocusedGraphEntry["semantic_layer"], string> = {
  current: "C",
  working: "W",
  historical: "H",
};

export const FocusedGraphOrientationSurface = ({
  data,
}: {
  data: FocusedGraphRouteData;
}): React.JSX.Element => {
  const regions = focusedGraphRegionsFromView(data.view);
  const heading = useRef<HTMLHeadingElement>(null);
  const [navigationIds] = useState(() => ({
    current: createFocusedGraphRequestId(),
    working: createFocusedGraphRequestId(),
    historical: createFocusedGraphRequestId(),
    comparison: createFocusedGraphRequestId(),
  }));
  useEffect(() => heading.current?.focus(), []);
  const focus = regions.graph.nodes.find((node) =>
    sameRef(node.record_ref, data.entry.focus_ref),
  );
  if (focus === undefined) {
    throw new FocusedGraphEntryError(
      "The focused graph response omitted the exact selected object.",
    );
  }
  const requested = regions.orientation.requestedSnapshot;
  const represented = regions.orientation.representedSnapshot;
  const projection = regions.orientation.projectionPosition;
  const activeLayer = regions.orientation.semanticLayer;
  const positionPath = (
    layer: FocusedGraphEntry["semantic_layer"],
    requestId: string,
    presentation: FocusedGraphPresentation = "position",
  ): string =>
    focusedGraphEntryPath({
      ...data.entry,
      request_id: requestId,
      semantic_layer: layer,
      presentation,
    });
  const positionPaths = {
    current: positionPath("current", navigationIds.current),
    working: positionPath("working", navigationIds.working),
    ...(data.entry.historical_position === undefined
      ? {}
      : {
          historical: positionPath("historical", navigationIds.historical),
        }),
    comparison: positionPath(
      activeLayer === "historical" ? "working" : activeLayer,
      navigationIds.comparison,
      "current_working_comparison",
    ),
  };
  const comparison =
    data.comparison === undefined
      ? undefined
      : {
          before: focusedGraphRegionsFromView(data.comparison.before),
          after: focusedGraphRegionsFromView(data.comparison.after),
        };
  return (
    <main
      className="reference-surface graph-surface"
      id="reference-main"
      data-focused-request-id={regions.orientation.task.request_id}
    >
      <header className="graph-heading">
        <div>
          <p className="reference-eyebrow">
            Graph · bounded relationship question
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {regions.orientation.task.question}
          </h1>
          <p className="reference-lede">
            {focus.term.singular}: {focus.label}
          </p>
          <p>
            Opened from {originLabel[data.entry.origin.origin_kind]}. This{" "}
            {layerLabel[activeLayer].toLowerCase()}, snapshot-bound entry
            preserves the exact selected object and return context.
          </p>
        </div>
        <span className="graph-state" data-layer={activeLayer}>
          <span aria-hidden="true">{layerSymbol[activeLayer]}</span>
          {layerLabel[activeLayer]}
        </span>
      </header>

      <FocusedGraphPositionNavigation
        activeLayer={activeLayer}
        comparisonActive={comparison !== undefined}
        paths={positionPaths}
      />

      {activeLayer === "historical" ? (
        <section
          className="reference-notice"
          aria-labelledby="focused-graph-historical-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            H
          </span>
          <div>
            <h2 id="focused-graph-historical-title">Historical · read only</h2>
            <p>
              This exact retained position cannot be edited. Return to current
              before starting a current correction or Review path.
            </p>
          </div>
        </section>
      ) : null}

      {projection.state === "current" ? null : (
        <section
          className="reference-notice"
          aria-labelledby="focused-graph-projection-title"
        >
          <span className="reference-notice__symbol" aria-hidden="true">
            ↻
          </span>
          <div>
            <h2 id="focused-graph-projection-title">
              Projection position · {projection.state.replaceAll("_", " ")}
            </h2>
            <p>{projection.detail}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="focused-graph-orientation-title">
        <p className="reference-panel-kicker">Exact entry orientation</p>
        <h2 id="focused-graph-orientation-title">Entry scope and position</h2>
        <p>{regions.graph.scope.description}</p>
        <dl className="history-facts">
          <div>
            <dt>Requested snapshot</dt>
            <dd>
              <code>{requested.snapshot_id}</code> · event{" "}
              {requested.event_position}
            </dd>
          </div>
          <div>
            <dt>Represented snapshot</dt>
            <dd>
              <code>{represented.snapshot_id}</code> · event{" "}
              {represented.event_position}
            </dd>
          </div>
          <div>
            <dt>Entry result</dt>
            <dd>
              {regions.graph.nodes.length} objects ·{" "}
              {regions.graph.relationships.length} relationships ·{" "}
              {regions.graph.paths.length} paths
            </dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{regions.graph.scope.coverage.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Semantic layer</dt>
            <dd>{layerLabel[activeLayer]}</dd>
          </div>
          <div>
            <dt>Temporal position</dt>
            <dd>
              {regions.orientation.temporalPosition.position_kind.replaceAll(
                "_",
                " ",
              )}{" "}
              ·{" "}
              {regions.orientation.temporalPosition.dimension.replaceAll(
                "_",
                " ",
              )}
              {regions.orientation.temporalPosition.position_kind ===
                "historical" &&
              regions.orientation.temporalPosition.at.state === "exact"
                ? ` · ${regions.orientation.temporalPosition.at.value}`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Projection position</dt>
            <dd>
              {projection.state.replaceAll("_", " ")} · represented event{" "}
              {projection.represented_event_position} · observed event{" "}
              {projection.observed_event_position} · pending{" "}
              {projection.pending_records}
            </dd>
          </div>
        </dl>
        <details>
          <summary>Entry request, finite limits, and omissions</summary>
          <dl className="history-facts">
            <div>
              <dt>Request</dt>
              <dd>
                <code>{regions.orientation.task.request_id}</code>
              </dd>
            </div>
            <div>
              <dt>Definition</dt>
              <dd>
                {regions.orientation.profile.label} · revision{" "}
                {regions.orientation.profile.project_definition_ref.revision}
              </dd>
            </div>
            <div>
              <dt>Limits</dt>
              <dd>
                depth {regions.graph.scope.limits.maximum_depth}; nodes{" "}
                {regions.graph.scope.limits.maximum_nodes}; relationships{" "}
                {regions.graph.scope.limits.maximum_relationships}; paths{" "}
                {regions.graph.scope.limits.maximum_paths}
              </dd>
            </div>
          </dl>
          <ul>
            {regions.graph.scope.omissions.map((omission, index) => (
              <li key={`${omission.omission_kind}:${index}`}>
                {omission.description}
              </li>
            ))}
            {regions.graph.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      </section>

      {comparison === undefined ? (
        <FocusedGraphExploration
          key={`${data.view.content.task.request_id}:${data.view.content_hash}`}
          entry={data.entry}
          definition={data.definition}
          initialView={data.view}
        />
      ) : (
        <FocusedGraphComparison
          before={comparison.before}
          after={comparison.after}
        />
      )}

      <footer className="reference-reader-return">
        <p>
          This entry is read-only. Selection, layout, and this return link grant
          no Project authority.
        </p>
        <Link
          className="reference-primary-link"
          to={data.entry.return_context.path}
          {...(data.entry.return_context.focus_id === undefined
            ? {}
            : { "data-return-focus": data.entry.return_context.focus_id })}
        >
          Return to {data.entry.return_context.label}
        </Link>
      </footer>
    </main>
  );
};

export const isFocusedGraphRouteData = (
  value: unknown,
): value is FocusedGraphRouteData =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  value.kind === "focused_graph";
