import { FocusedGraphClient } from "@petra/adapters";
import type {
  FocusedGraphDisclosureCountV11,
  FocusedGraphExactRef,
  FocusedGraphExplorationFiltersV11,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  ProjectInquirySaveSelection,
} from "@petra/contracts";
import type {
  FocusedGraphExplorationViewRequest,
  FocusedGraphReadRequest,
} from "@petra/core";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";

import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import type { FocusedGraphEntry } from "./focused-graph-entry.js";
import { createFocusedGraphRequestId } from "./focused-graph-identities.js";
import { focusedGraphRegionsFromView } from "./focused-graph-regions.js";
import type { PetraFocusedGraphReadView } from "./focused-graph-regions.js";
import {
  FocusedGraphActions,
  type FocusedGraphActionPreviewRead,
} from "./FocusedGraphActions.js";
import { FocusedGraphDetails } from "./FocusedGraphDetails.js";
import {
  FocusedGraphResult,
  type FocusedGraphLayout,
  type FocusedGraphRepresentation,
  type FocusedGraphRendererFactory,
} from "./FocusedGraphResult.js";
import {
  assessProjectInquirySaveRecovery,
  createProjectInquirySaveRequest,
  executeProjectInquirySave,
  projectInquirySaveFailureKind,
  type ProjectInquirySaveCommand,
  type ProjectInquirySaveFailureKind,
  type ProjectInquirySaveRecoveryRead,
  type ProjectInquirySaveResult,
} from "./project-inquiry-save.js";

type ExplorationMeaning =
  FocusedGraphExplorationFiltersV11["meaning_kinds"][number];
type ExplorationDirection =
  FocusedGraphExplorationFiltersV11["directions"][number];
type ExplorationOrigin = FocusedGraphExplorationFiltersV11["origins"][number];

const words = (value: string): string => value.replaceAll("_", " ");

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

export class FocusedGraphExplorationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FocusedGraphExplorationError";
  }
}

export interface FocusedGraphRecipe {
  readonly semanticKey: string;
  readonly label: string;
  readonly definition: string;
  readonly allowedMeanings: readonly ExplorationMeaning[];
  readonly allowedDirections: readonly ExplorationDirection[];
  readonly defaultOrigins: readonly ExplorationOrigin[];
}

const SCIENTIFIC_RECIPE_POLICY = {
  "scientific.graph.trace-sources": {
    meanings: ["citation", "provenance"],
    directions: ["outgoing", "incoming"],
  },
  "scientific.graph.show-contrary": {
    meanings: ["contradiction"],
    directions: ["outgoing", "incoming"],
  },
  "scientific.graph.show-downstream": {
    meanings: [
      "citation",
      "support",
      "contradiction",
      "qualification",
      "inference",
      "provenance",
    ],
    directions: ["outgoing"],
  },
} as const satisfies Record<
  string,
  {
    readonly meanings: readonly ExplorationMeaning[];
    readonly directions: readonly ExplorationDirection[];
  }
>;

const recipePolicy = (
  definitionFamily: string,
  semanticKey: string,
):
  | {
      readonly meanings: readonly ExplorationMeaning[];
      readonly directions: readonly ExplorationDirection[];
    }
  | undefined => {
  if (definitionFamily !== "petra.scientific-evidence") return undefined;
  return SCIENTIFIC_RECIPE_POLICY[
    semanticKey as keyof typeof SCIENTIFIC_RECIPE_POLICY
  ];
};

/**
 * Resolves only exact profile registrations understood by this profile client.
 * Unknown profiles or recipe semantics remain unavailable rather than falling
 * back to renderer-owned meaning.
 */
export const registeredFocusedGraphRecipes = (
  definition: PetraProjectDefinition,
  semanticLayer: "current" | "working" | "historical",
): readonly FocusedGraphRecipe[] => {
  if (semanticLayer === "historical") return [];
  const defaultOrigins: readonly ExplorationOrigin[] =
    semanticLayer === "working"
      ? ["canonical_record", "model_inference", "working_candidate"]
      : ["canonical_record", "model_inference"];
  return definition.content.registrations.flatMap((registration) => {
    const policy = recipePolicy(
      definition.definition_family,
      registration.semantic_key,
    );
    const terms = definition.content.terms.filter(
      (term) => term.semantic_key === registration.semantic_key,
    );
    if (
      policy === undefined ||
      registration.registration_kind !== "extension" ||
      registration.contract.name !== "petra.focused-graph-view" ||
      registration.contract.version !== "1.1.0" ||
      terms.length !== 1
    ) {
      return [];
    }
    const term = terms[0]!;
    return [
      {
        semanticKey: registration.semantic_key,
        label: term.singular,
        definition: term.definition,
        allowedMeanings: policy.meanings,
        allowedDirections: policy.directions,
        defaultOrigins,
      },
    ];
  });
};

const orderedUnique = <Value extends string>(
  allowed: readonly Value[],
  selected: readonly Value[],
): Value[] => allowed.filter((value) => selected.includes(value));

/** Normalizes filter order and rejects values outside the registered recipe. */
export const normalizeFocusedGraphFilters = (
  recipe: FocusedGraphRecipe,
  filters: FocusedGraphExplorationFiltersV11,
): FocusedGraphExplorationFiltersV11 => {
  const meanings = orderedUnique(recipe.allowedMeanings, filters.meaning_kinds);
  const directions = orderedUnique(
    recipe.allowedDirections,
    filters.directions,
  );
  const allowedOrigins: readonly ExplorationOrigin[] = [
    "canonical_record",
    "working_candidate",
    "historical_record",
    "model_inference",
  ];
  const origins = orderedUnique(allowedOrigins, filters.origins).filter(
    (origin) => recipe.defaultOrigins.includes(origin),
  );
  if (
    meanings.length === 0 ||
    directions.length === 0 ||
    origins.length === 0 ||
    filters.meaning_kinds.some(
      (meaning) => !recipe.allowedMeanings.includes(meaning),
    ) ||
    filters.directions.some(
      (direction) => !recipe.allowedDirections.includes(direction),
    ) ||
    filters.origins.some((origin) => !recipe.defaultOrigins.includes(origin))
  ) {
    throw new FocusedGraphExplorationError(
      "The filter selection is empty or incompatible with the registered expansion recipe.",
    );
  }
  return {
    meaning_kinds:
      meanings as FocusedGraphExplorationFiltersV11["meaning_kinds"],
    directions: directions as FocusedGraphExplorationFiltersV11["directions"],
    origins: origins as FocusedGraphExplorationFiltersV11["origins"],
  };
};

export const defaultFocusedGraphFilters = (
  recipe: FocusedGraphRecipe,
): FocusedGraphExplorationFiltersV11 =>
  normalizeFocusedGraphFilters(recipe, {
    meaning_kinds: [
      ...recipe.allowedMeanings,
    ] as FocusedGraphExplorationFiltersV11["meaning_kinds"],
    directions: [
      ...recipe.allowedDirections,
    ] as FocusedGraphExplorationFiltersV11["directions"],
    origins: [
      ...recipe.defaultOrigins,
    ] as FocusedGraphExplorationFiltersV11["origins"],
  });

const exactReturnDestination = (
  view: PetraFocusedGraphReadView,
): PetraFocusedGraphReadView["content"]["destinations"][number] => {
  const matches = view.content.destinations.filter(
    (destination) =>
      destination.destination_key === view.content.task.return_destination_key,
  );
  if (matches.length !== 1) {
    throw new FocusedGraphExplorationError(
      "The exact return destination is unavailable for this expansion.",
    );
  }
  return matches[0]!;
};

export const createFocusedGraphExplorationRequest = (input: {
  readonly entry: FocusedGraphEntry;
  readonly view: PetraFocusedGraphReadView;
  readonly recipe: FocusedGraphRecipe;
  readonly targetRef: FocusedGraphExactRef;
  readonly filters: FocusedGraphExplorationFiltersV11;
  readonly maximumDepth: number;
  readonly requestId: string;
}): FocusedGraphExplorationViewRequest => {
  const { entry, view, recipe, targetRef, maximumDepth, requestId } = input;
  if (
    view.content.semantic_layer === "historical" ||
    view.content.temporal_position.position_kind !== "current" ||
    !Number.isSafeInteger(maximumDepth) ||
    maximumDepth < 1 ||
    maximumDepth > 4 ||
    !view.content.nodes.some((node) => sameRef(node.record_ref, targetRef))
  ) {
    throw new FocusedGraphExplorationError(
      "A named expansion requires one represented current or working object and a finite depth.",
    );
  }
  const filters = normalizeFocusedGraphFilters(recipe, input.filters);
  return {
    request_id: requestId,
    task_kind: "neighborhood",
    task_semantic_key: entry.task_semantic_key,
    question: entry.question,
    focus_ref: structuredClone(entry.focus_ref),
    origin: structuredClone(entry.origin),
    project_definition_ref: structuredClone(
      view.content.profile.project_definition_ref,
    ),
    semantic_layer: view.content.semantic_layer,
    temporal_position: structuredClone(view.content.temporal_position),
    object_semantic_key: entry.object_semantic_key,
    relationship_semantic_key: entry.relationship_semantic_key,
    return_action_semantic_key: entry.return_action_semantic_key,
    return_destination: structuredClone(exactReturnDestination(view)),
    limits: {
      ...structuredClone(view.content.scope.limits),
      maximum_depth: maximumDepth,
    },
    expected_snapshot: structuredClone(view.content.requested_snapshot),
    exploration: {
      mode: "named_expansion",
      expansion_key: `expansion:${recipe.semanticKey}:${targetRef.record_id.toLowerCase()}`,
      recipe_semantic_key: recipe.semanticKey,
      target_ref: structuredClone(targetRef),
      maximum_depth: maximumDepth,
      filters,
    },
  };
};

export interface FocusedGraphActiveExploration {
  readonly stateId: number;
  readonly projectId: string;
  readonly request: FocusedGraphExplorationViewRequest;
}

/**
 * A second client-side acceptance boundary over the typed client: an older
 * response cannot replace a newer request or a changed presentation state.
 */
export const matchesActiveFocusedGraphExploration = (
  response: PetraFocusedGraphViewV11,
  active: FocusedGraphActiveExploration,
  currentStateId: number,
): boolean => {
  const request = active.request;
  const exploration = response.content.exploration;
  return (
    active.stateId === currentStateId &&
    response.schema_version === "1.1.0" &&
    response.project_id === active.projectId &&
    response.content.task.request_id === request.request_id &&
    response.content.task.task_kind === request.task_kind &&
    response.content.task.task_semantic_key === request.task_semantic_key &&
    response.content.task.question === request.question &&
    same(response.content.task.focus_refs, [request.focus_ref]) &&
    same(response.content.task.origin, request.origin) &&
    response.content.task.return_destination_key ===
      request.return_destination.destination_key &&
    response.content.semantic_layer === request.semantic_layer &&
    same(response.content.temporal_position, request.temporal_position) &&
    same(
      response.content.profile.project_definition_ref,
      request.project_definition_ref,
    ) &&
    same(response.content.requested_snapshot, request.expected_snapshot) &&
    same(response.content.scope.limits, request.limits) &&
    same(response.content.scope.included_relationship_semantics, [
      request.relationship_semantic_key,
    ]) &&
    response.content.scope.included_layers.includes(request.semantic_layer) &&
    same(
      response.content.scope.directions,
      request.exploration.filters.directions,
    ) &&
    exploration.expansion_key === request.exploration.expansion_key &&
    exploration.recipe_semantic_key ===
      request.exploration.recipe_semantic_key &&
    same(exploration.target_ref, request.exploration.target_ref) &&
    exploration.maximum_depth === request.exploration.maximum_depth &&
    same(exploration.filters, request.exploration.filters)
  );
};

export interface FocusedGraphPresentationState {
  readonly stateId: number;
  readonly request: FocusedGraphReadRequest;
  readonly view: PetraFocusedGraphReadView;
  readonly selectedKey: string;
  readonly pinnedNodeKeys: readonly string[];
  readonly collapsedNodeKeys: readonly string[];
  readonly layout: FocusedGraphLayout;
  readonly representation: FocusedGraphRepresentation;
}

export interface FocusedGraphPresentationTimeline {
  readonly states: readonly FocusedGraphPresentationState[];
  readonly index: number;
}

export const createFocusedGraphPresentationTimeline = (
  state: FocusedGraphPresentationState,
): FocusedGraphPresentationTimeline => ({ states: [state], index: 0 });

/** Adds one state, drops the forward branch, and retains at most ten states. */
export const appendFocusedGraphPresentationState = (
  timeline: FocusedGraphPresentationTimeline,
  state: FocusedGraphPresentationState,
): FocusedGraphPresentationTimeline => {
  const branched = [...timeline.states.slice(0, timeline.index + 1), state];
  const states = branched.slice(-10);
  return { states, index: states.length - 1 };
};

export const moveFocusedGraphPresentationHistory = (
  timeline: FocusedGraphPresentationTimeline,
  direction: "back" | "forward",
): FocusedGraphPresentationTimeline => ({
  ...timeline,
  index:
    direction === "back"
      ? Math.max(0, timeline.index - 1)
      : Math.min(timeline.states.length - 1, timeline.index + 1),
});

const selectedKeyForView = (
  view: PetraFocusedGraphReadView,
  focusRef: FocusedGraphExactRef,
  retainedSelection?: ProjectInquirySaveSelection,
): string => {
  if (retainedSelection?.state === "selected") {
    const retainedKeys = retainedSelection.selected_keys;
    const hasExactKind = retainedKeys.every((key) =>
      retainedSelection.selection_kind === "node"
        ? view.content.nodes.some((node) => node.node_key === key)
        : retainedSelection.selection_kind === "relationship"
          ? view.content.relationships.some(
              (relationship) => relationship.relationship_key === key,
            )
          : view.content.paths.some((path) => path.path_key === key),
    );
    if (!hasExactKind) {
      throw new FocusedGraphExplorationError(
        "The retained Project selection is absent from its exact Graph result.",
      );
    }
    return retainedKeys[0];
  }
  if (retainedSelection?.state === "none") {
    const retainedFocus = view.content.nodes.find((node) =>
      sameRef(node.record_ref, focusRef),
    );
    if (retainedFocus === undefined) {
      throw new FocusedGraphExplorationError(
        "The retained Project focus is absent from its exact Graph result.",
      );
    }
    return retainedFocus.node_key;
  }
  if (view.content.selection.state === "selected") {
    const selected = view.content.selection.selected_keys[0];
    if (selected !== undefined) return selected;
  }
  const focus = view.content.nodes.find((node) =>
    sameRef(node.record_ref, focusRef),
  );
  if (focus === undefined) {
    throw new FocusedGraphExplorationError(
      "The focused result omitted the exact home object.",
    );
  }
  return focus.node_key;
};

const nodeForKey = (view: PetraFocusedGraphReadView, key: string) =>
  view.content.nodes.find((node) => node.node_key === key);

const containsKey = (view: PetraFocusedGraphReadView, key: string): boolean =>
  view.content.nodes.some((node) => node.node_key === key) ||
  view.content.relationships.some(
    (relationship) => relationship.relationship_key === key,
  ) ||
  view.content.paths.some((path) => path.path_key === key);

export const focusedGraphViewPreservesSelection = (
  view: PetraFocusedGraphReadView,
  selectedKey: string,
): boolean => containsKey(view, selectedKey);

const countText = (count: FocusedGraphDisclosureCountV11): string =>
  count.state === "exact" ? String(count.value) : words(count.state);

const toggle = <Value extends string>(
  values: readonly Value[],
  value: Value,
  checked: boolean,
): Value[] =>
  checked
    ? [...new Set([...values, value])]
    : values.filter((item) => item !== value);

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";

const readExpansion = async (
  projectId: string,
  definition: PetraProjectDefinition,
  request: FocusedGraphExplorationViewRequest,
): Promise<PetraFocusedGraphViewV11> => {
  const client = new FocusedGraphClient({
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
  });
  return client.read(projectId, request);
};

export type FocusedGraphExplorationRead = (
  projectId: string,
  definition: PetraProjectDefinition,
  request: FocusedGraphExplorationViewRequest,
) => Promise<PetraFocusedGraphViewV11>;

const initialFocusedGraphRepresentation = (): FocusedGraphRepresentation =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 40rem)").matches
    ? "text"
    : "graph";

interface BookmarkedExactView {
  readonly key: string;
  readonly label: string;
  readonly snapshotId: string;
  readonly state: FocusedGraphPresentationState;
}

interface RetainedProjectInquirySaveRequest {
  readonly signature: string;
  readonly request: PetraProjectInquirySaveRequest;
}

type ProjectInquirySaveState =
  | { readonly state: "idle" }
  | {
      readonly state: "saving";
      readonly request: PetraProjectInquirySaveRequest;
    }
  | {
      readonly state: "failed";
      readonly request?: PetraProjectInquirySaveRequest;
      readonly kind: ProjectInquirySaveFailureKind;
      readonly message: string;
    }
  | {
      readonly state: "assessing";
      readonly request: PetraProjectInquirySaveRequest;
      readonly failureKind: ProjectInquirySaveFailureKind;
      readonly failureMessage: string;
    }
  | {
      readonly state: "assessed";
      readonly request: PetraProjectInquirySaveRequest;
      readonly recovery: PetraProjectInquirySaveRecoveryView;
    }
  | {
      readonly state: "retained";
      readonly request: PetraProjectInquirySaveRequest;
      readonly receipt: PetraProjectInquirySaveReceipt;
      readonly result?: ProjectInquirySaveResult;
    };

const saveRequestSignature = (state: FocusedGraphPresentationState): string =>
  JSON.stringify({
    graphRequest: state.request,
    graph: {
      schemaVersion: state.view.schema_version,
      contentHash: state.view.content_hash,
    },
    selectedKey: state.selectedKey,
  });

const saveFailureTitle: Record<ProjectInquirySaveFailureKind, string> = {
  conflict: "Save identity conflict",
  stale: "Graph position changed",
  permission_lost: "Permission no longer available",
  invalid: "This exact question cannot be saved",
  outcome_unknown: "Save outcome unknown",
};

export const FocusedGraphExploration = ({
  entry,
  definition,
  initialRequest,
  initialView,
  initialSelection,
  read = readExpansion,
  actionPreviewRead,
  saveInquiry = executeProjectInquirySave,
  assessInquirySave = assessProjectInquirySaveRecovery,
  rendererFactory,
}: {
  entry: FocusedGraphEntry;
  definition: PetraProjectDefinition;
  initialRequest: FocusedGraphReadRequest;
  initialView: PetraFocusedGraphReadView;
  initialSelection?: ProjectInquirySaveSelection;
  read?: FocusedGraphExplorationRead;
  actionPreviewRead?: FocusedGraphActionPreviewRead | undefined;
  saveInquiry?: ProjectInquirySaveCommand | undefined;
  assessInquirySave?: ProjectInquirySaveRecoveryRead | undefined;
  rendererFactory?: FocusedGraphRendererFactory | undefined;
}): React.JSX.Element => {
  const initialSelectedKey = selectedKeyForView(
    initialView,
    entry.focus_ref,
    initialSelection,
  );
  const stateSequence = useRef(1);
  const baseline = useMemo<FocusedGraphPresentationState>(
    () => ({
      stateId: 1,
      request: initialRequest,
      view: initialView,
      selectedKey: initialSelectedKey,
      pinnedNodeKeys: [],
      collapsedNodeKeys: [],
      layout: "relationship",
      representation: initialFocusedGraphRepresentation(),
    }),
    [initialRequest, initialSelectedKey, initialView],
  );
  const [timeline, setTimeline] = useState(() =>
    createFocusedGraphPresentationTimeline(baseline),
  );
  const state = timeline.states[timeline.index]!;
  const recipes = useMemo(
    () =>
      registeredFocusedGraphRecipes(
        definition,
        state.view.content.semantic_layer,
      ),
    [definition, state.view.content.semantic_layer],
  );
  const [recipeKey, setRecipeKey] = useState(
    () => recipes[0]?.semanticKey ?? "",
  );
  const selectedRecipe =
    recipes.find((recipe) => recipe.semanticKey === recipeKey) ?? recipes[0];
  const [draftFilters, setDraftFilters] = useState<
    FocusedGraphExplorationFiltersV11 | undefined
  >(() =>
    selectedRecipe === undefined
      ? undefined
      : defaultFocusedGraphFilters(selectedRecipe),
  );
  const [maximumDepth, setMaximumDepth] = useState(2);
  const [pendingRequestId, setPendingRequestId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [bookmarks, setBookmarks] = useState<readonly BookmarkedExactView[]>(
    [],
  );
  const [inquirySave, setInquirySave] = useState<ProjectInquirySaveState>({
    state: "idle",
  });
  const retainedInquirySave = useRef<
    RetainedProjectInquirySaveRequest | undefined
  >(undefined);
  const active = useRef<FocusedGraphActiveExploration | undefined>(undefined);

  const invalidatePending = (): void => {
    active.current = undefined;
    setPendingRequestId(undefined);
    setRetryAvailable(false);
  };
  const nextState = (
    update: Omit<FocusedGraphPresentationState, "stateId">,
  ): void => {
    invalidatePending();
    stateSequence.current += 1;
    setTimeline((current) =>
      appendFocusedGraphPresentationState(current, {
        ...update,
        stateId: stateSequence.current,
      }),
    );
  };
  const updatePresentation = (
    update: Partial<Omit<FocusedGraphPresentationState, "stateId" | "view">>,
  ): void => nextState({ ...state, ...update });
  const moveHistory = (direction: "back" | "forward"): void => {
    invalidatePending();
    setTimeline((current) =>
      moveFocusedGraphPresentationHistory(current, direction),
    );
  };
  const selectRecipe = (semanticKey: string): void => {
    invalidatePending();
    const recipe = recipes.find(
      (candidate) => candidate.semanticKey === semanticKey,
    );
    setRecipeKey(semanticKey);
    setDraftFilters(
      recipe === undefined ? undefined : defaultFocusedGraphFilters(recipe),
    );
    setMessage(undefined);
  };
  const updateDraftFilters = (
    filters: FocusedGraphExplorationFiltersV11,
  ): void => {
    invalidatePending();
    setDraftFilters(filters);
  };

  const selectedNode = nodeForKey(state.view, state.selectedKey);
  const homeNode = state.view.content.nodes.find((node) =>
    sameRef(node.record_ref, entry.focus_ref),
  );
  const activeExpansion =
    state.view.schema_version === "1.1.0"
      ? state.view.content.exploration
      : undefined;
  const activeExpansionView =
    state.view.schema_version === "1.1.0" ? state.view : undefined;

  const applyExpansion = async (): Promise<void> => {
    if (
      selectedRecipe === undefined ||
      draftFilters === undefined ||
      selectedNode === undefined
    ) {
      setMessage(
        "Select one represented object and one registered expansion recipe.",
      );
      return;
    }
    const requestId = createFocusedGraphRequestId();
    let request: FocusedGraphExplorationViewRequest;
    try {
      request = createFocusedGraphExplorationRequest({
        entry,
        view: state.view,
        recipe: selectedRecipe,
        targetRef: selectedNode.record_ref,
        filters: draftFilters,
        maximumDepth,
        requestId,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The exact expansion request is unavailable.",
      );
      return;
    }
    const intent = {
      stateId: state.stateId,
      projectId: entry.project_id,
      request,
    };
    active.current = intent;
    setPendingRequestId(requestId);
    setMessage(undefined);
    setRetryAvailable(false);
    try {
      const response = await read(entry.project_id, definition, request);
      if (active.current !== intent) return;
      if (
        !matchesActiveFocusedGraphExploration(
          response,
          intent,
          state.stateId,
        ) ||
        !focusedGraphViewPreservesSelection(response, state.selectedKey)
      ) {
        active.current = undefined;
        setPendingRequestId(undefined);
        setRetryAvailable(true);
        setMessage(
          `Mismatched expansion ignored. The response did not match the active request, snapshot, scope, or selected object. The displayed cached ${words(state.view.content.semantic_layer)} result remains the retained response for snapshot ${state.view.content.requested_snapshot.snapshot_id}.`,
        );
        return;
      }
      active.current = undefined;
      setPendingRequestId(undefined);
      stateSequence.current += 1;
      setTimeline((current) => {
        const currentState = current.states[current.index]!;
        if (currentState.stateId !== intent.stateId) return current;
        return appendFocusedGraphPresentationState(current, {
          ...currentState,
          stateId: stateSequence.current,
          request,
          view: response,
        });
      });
      setDraftFilters(response.content.exploration.filters);
      setRetryAvailable(false);
      setMessage(
        `Accepted ${response.content.exploration.recipe_label} for the exact active snapshot.`,
      );
    } catch (error) {
      if (active.current !== intent) return;
      active.current = undefined;
      setPendingRequestId(undefined);
      setRetryAvailable(true);
      const failure =
        error instanceof Error
          ? error.message
          : "The exact expansion result is unavailable.";
      const disconnected =
        typeof navigator !== "undefined" && navigator.onLine === false;
      setMessage(
        `${disconnected ? "Connection unavailable" : "Expansion unavailable"}. The displayed cached ${words(state.view.content.semantic_layer)} result remains the retained response for snapshot ${state.view.content.requested_snapshot.snapshot_id}; Petra does not claim it is newer than that exact represented position. ${failure}`,
      );
    }
  };

  const bookmarkExactView = (): void => {
    const key = `bookmarked-view:${bookmarks.length + 1}:${state.stateId}`;
    setBookmarks((current) => [
      ...current,
      {
        key,
        label: entry.question,
        snapshotId: state.view.content.requested_snapshot.snapshot_id,
        state,
      },
    ]);
    setMessage(
      "Bookmarked this exact question, snapshot, selection, and presentation for this tab. No Project record was created.",
    );
  };

  const saveExactQuestion = async (
    exactRetry?: PetraProjectInquirySaveRequest,
  ): Promise<void> => {
    let request = exactRetry;
    if (request === undefined) {
      const signature = saveRequestSignature(state);
      if (retainedInquirySave.current?.signature === signature) {
        request = retainedInquirySave.current.request;
      } else {
        try {
          request = createProjectInquirySaveRequest({
            projectId: entry.project_id,
            graphRequest: state.request,
            graph: state.view,
            selectedKey: state.selectedKey,
          });
        } catch (error) {
          const kind = projectInquirySaveFailureKind(error);
          setInquirySave({
            state: "failed",
            ...(retainedInquirySave.current === undefined
              ? {}
              : { request: retainedInquirySave.current.request }),
            kind,
            message:
              error instanceof Error
                ? error.message
                : "This exact Graph question cannot be saved.",
          });
          return;
        }
        retainedInquirySave.current = { signature, request };
      }
    }
    setInquirySave({ state: "saving", request });
    try {
      const result = await saveInquiry(entry.project_id, request);
      setInquirySave({
        state: "retained",
        request,
        receipt: result.receipt,
        result,
      });
    } catch (error) {
      setInquirySave({
        state: "failed",
        request,
        kind: projectInquirySaveFailureKind(error),
        message:
          error instanceof Error
            ? error.message
            : "The Project question save outcome is unknown.",
      });
    }
  };

  const assessSaveOutcome = async (
    request: PetraProjectInquirySaveRequest,
    failureKind: ProjectInquirySaveFailureKind,
    failureMessage: string,
  ): Promise<void> => {
    setInquirySave({
      state: "assessing",
      request,
      failureKind,
      failureMessage,
    });
    try {
      const recovery = await assessInquirySave(entry.project_id, request);
      if (recovery.effect.state === "effect_confirmed") {
        setInquirySave({
          state: "retained",
          request,
          receipt: recovery.effect.receipt,
        });
      } else {
        setInquirySave({ state: "assessed", request, recovery });
      }
    } catch (error) {
      setInquirySave({
        state: "failed",
        request,
        kind: projectInquirySaveFailureKind(error),
        message:
          error instanceof Error
            ? error.message
            : "Petra could not assess this exact save request.",
      });
    }
  };

  const reset = (): void => {
    nextState({ ...baseline });
    const first = registeredFocusedGraphRecipes(
      definition,
      baseline.view.content.semantic_layer,
    )[0];
    setRecipeKey(first?.semanticKey ?? "");
    setDraftFilters(
      first === undefined ? undefined : defaultFocusedGraphFilters(first),
    );
    setMaximumDepth(2);
    setMessage(
      "Returned to the exact entry result and reset presentation state.",
    );
  };

  const regions = focusedGraphRegionsFromView(state.view);
  const saveAvailable = state.view.content.semantic_layer !== "historical";
  const assessedEffect =
    inquirySave.state === "assessed" ? inquirySave.recovery.effect : undefined;
  return (
    <section
      className="focused-graph-exploration"
      aria-labelledby="focused-graph-exploration-title"
      data-history-count={timeline.states.length}
      data-history-position={timeline.index + 1}
      data-active-request-id={regions.orientation.task.request_id}
    >
      <header className="focused-graph-exploration__header">
        <div>
          <p className="reference-panel-kicker">Local exploration</p>
          <h2 id="focused-graph-exploration-title">
            Explore the exact bounded result
          </h2>
          <p>
            Filters, layout, selection, pinning, collapse, saved questions, and
            this ten-state history are presentation state. They grant no Project
            authority.
          </p>
        </div>
        <span aria-live="polite">
          History {timeline.index + 1} of {timeline.states.length} · 10-state
          limit
        </span>
      </header>

      <div className="focused-graph-exploration__toolbar">
        <PetraButtonGroup label="Exploration history">
          <PetraButton
            density="compact"
            variant="quiet"
            aria-disabled={timeline.index === 0}
            onClick={() => moveHistory("back")}
          >
            Back
          </PetraButton>
          <PetraButton
            density="compact"
            variant="quiet"
            aria-disabled={timeline.index >= timeline.states.length - 1}
            onClick={() => moveHistory("forward")}
          >
            Forward
          </PetraButton>
          <PetraButton
            density="compact"
            variant="quiet"
            aria-disabled={homeNode === undefined}
            onClick={() =>
              homeNode === undefined
                ? undefined
                : updatePresentation({ selectedKey: homeNode.node_key })
            }
          >
            Home
          </PetraButton>
          <PetraButton density="compact" variant="quiet" onClick={reset}>
            Reset
          </PetraButton>
        </PetraButtonGroup>
        <PetraButtonGroup label="Selected object presentation">
          <PetraButton
            density="compact"
            variant="quiet"
            aria-disabled={selectedNode === undefined}
            aria-pressed={
              selectedNode !== undefined &&
              state.pinnedNodeKeys.includes(selectedNode.node_key)
            }
            onClick={() =>
              selectedNode === undefined
                ? undefined
                : updatePresentation({
                    pinnedNodeKeys: toggle(
                      state.pinnedNodeKeys,
                      selectedNode.node_key,
                      !state.pinnedNodeKeys.includes(selectedNode.node_key),
                    ),
                  })
            }
          >
            {selectedNode !== undefined &&
            state.pinnedNodeKeys.includes(selectedNode.node_key)
              ? "Unpin"
              : "Pin"}
          </PetraButton>
          <PetraButton
            density="compact"
            variant="quiet"
            aria-disabled={selectedNode === undefined}
            aria-pressed={
              selectedNode !== undefined &&
              state.collapsedNodeKeys.includes(selectedNode.node_key)
            }
            onClick={() =>
              selectedNode === undefined
                ? undefined
                : updatePresentation({
                    collapsedNodeKeys: toggle(
                      state.collapsedNodeKeys,
                      selectedNode.node_key,
                      !state.collapsedNodeKeys.includes(selectedNode.node_key),
                    ),
                  })
            }
          >
            {selectedNode !== undefined &&
            state.collapsedNodeKeys.includes(selectedNode.node_key)
              ? "Expand neighbors"
              : "Collapse neighbors"}
          </PetraButton>
        </PetraButtonGroup>
        <PetraButtonGroup label="Graph layout">
          {(["relationship", "radial"] as const).map((layout) => (
            <PetraButton
              key={layout}
              density="compact"
              variant={state.layout === layout ? "secondary" : "quiet"}
              aria-pressed={state.layout === layout}
              onClick={() => updatePresentation({ layout })}
            >
              {layout === "relationship" ? "Relationship" : "Radial"}
            </PetraButton>
          ))}
        </PetraButtonGroup>
      </div>

      <label className="focused-graph-exploration__selection">
        <span>Active selection</span>
        <select
          value={state.selectedKey}
          onChange={(event) =>
            updatePresentation({ selectedKey: event.currentTarget.value })
          }
        >
          <optgroup label="Objects">
            {state.view.content.nodes.map((node) => (
              <option key={node.node_key} value={node.node_key}>
                {node.term.singular}: {node.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Relationships">
            {state.view.content.relationships.map((relationship) => (
              <option
                key={relationship.relationship_key}
                value={relationship.relationship_key}
              >
                {relationship.term.singular}: {relationship.predicate}
              </option>
            ))}
          </optgroup>
          <optgroup label="Paths">
            {state.view.content.paths.map((path, index) => (
              <option key={path.path_key} value={path.path_key}>
                Path {index + 1}: {words(path.state)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <section
        className="focused-graph-expansion-controls"
        aria-labelledby="focused-graph-expansion-controls-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Named expansion</p>
            <h3 id="focused-graph-expansion-controls-title">
              Reveal registered relationships
            </h3>
          </div>
          <span>
            Snapshot {state.view.content.requested_snapshot.snapshot_id}
          </span>
        </header>
        {recipes.length === 0 ? (
          <p>
            No compatible named expansion is registered for this exact profile
            and semantic layer. Petra will not infer one from the renderer.
          </p>
        ) : (
          <>
            <label>
              <span>Registered recipe</span>
              <select
                value={selectedRecipe?.semanticKey}
                onChange={(event) => selectRecipe(event.currentTarget.value)}
              >
                {recipes.map((recipe) => (
                  <option key={recipe.semanticKey} value={recipe.semanticKey}>
                    {recipe.label}
                  </option>
                ))}
              </select>
            </label>
            {selectedRecipe === undefined ||
            draftFilters === undefined ? null : (
              <div className="focused-graph-expansion-controls__filters">
                <fieldset>
                  <legend>Relationship meaning</legend>
                  {selectedRecipe.allowedMeanings.map((meaning) => (
                    <label key={meaning}>
                      <input
                        type="checkbox"
                        checked={draftFilters.meaning_kinds.includes(meaning)}
                        onChange={(event) =>
                          updateDraftFilters({
                            ...draftFilters,
                            meaning_kinds: toggle(
                              draftFilters.meaning_kinds,
                              meaning,
                              event.currentTarget.checked,
                            ) as FocusedGraphExplorationFiltersV11["meaning_kinds"],
                          })
                        }
                      />
                      {words(meaning)}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Direction</legend>
                  {selectedRecipe.allowedDirections.map((direction) => (
                    <label key={direction}>
                      <input
                        type="checkbox"
                        checked={draftFilters.directions.includes(direction)}
                        onChange={(event) =>
                          updateDraftFilters({
                            ...draftFilters,
                            directions: toggle(
                              draftFilters.directions,
                              direction,
                              event.currentTarget.checked,
                            ) as FocusedGraphExplorationFiltersV11["directions"],
                          })
                        }
                      />
                      {words(direction)}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Recorded origin</legend>
                  {selectedRecipe.defaultOrigins.map((origin) => (
                    <label key={origin}>
                      <input
                        type="checkbox"
                        checked={draftFilters.origins.includes(origin)}
                        onChange={(event) =>
                          updateDraftFilters({
                            ...draftFilters,
                            origins: toggle(
                              draftFilters.origins,
                              origin,
                              event.currentTarget.checked,
                            ) as FocusedGraphExplorationFiltersV11["origins"],
                          })
                        }
                      />
                      {words(origin)}
                    </label>
                  ))}
                </fieldset>
                <label>
                  <span>Finite depth</span>
                  <select
                    value={maximumDepth}
                    onChange={(event) => {
                      invalidatePending();
                      setMaximumDepth(Number(event.currentTarget.value));
                    }}
                  >
                    {[1, 2, 3, 4].map((depth) => (
                      <option key={depth} value={depth}>
                        {depth}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <p>{selectedRecipe?.definition}</p>
            <PetraButton
              variant="primary"
              busy={pendingRequestId !== undefined}
              busyLabel="Loading exact expansion…"
              aria-disabled={selectedNode === undefined}
              onClick={() => void applyExpansion()}
            >
              Expand selected object
            </PetraButton>
          </>
        )}
      </section>

      <section
        className="focused-graph-saved-questions"
        aria-labelledby="focused-graph-saved-questions-title"
      >
        <header>
          <div>
            <p className="reference-panel-kicker">Question and view</p>
            <h3 id="focused-graph-saved-questions-title">Keep this context</h3>
            <p>
              A Project question keeps the exact bounded request, snapshot,
              selection, origin, and return. A tab bookmark keeps only this
              local presentation.
            </p>
          </div>
          <PetraButton density="compact" onClick={bookmarkExactView}>
            Bookmark this view
          </PetraButton>
        </header>
        <PetraButton
          density="compact"
          variant="primary"
          busy={inquirySave.state === "saving"}
          busyLabel="Saving exact question…"
          aria-disabled={inquirySave.state === "assessing" || undefined}
          {...(saveAvailable
            ? {}
            : {
                unavailable: {
                  reason:
                    "Historical Graph positions are read-only and cannot become a current Project question.",
                  prerequisite:
                    "Open the current or working Graph position before saving this question.",
                },
              })}
          onClick={() => void saveExactQuestion()}
        >
          Save exact question to Project
        </PetraButton>
        {inquirySave.state === "idle" ||
        inquirySave.state === "saving" ? null : inquirySave.state ===
          "retained" ? (
          <section
            className="focused-graph-inquiry-save"
            data-state="retained"
            aria-labelledby="focused-graph-inquiry-save-title"
            aria-live="polite"
          >
            <header>
              <div>
                <p className="reference-panel-kicker">Project question</p>
                <h4 id="focused-graph-inquiry-save-title">
                  {inquirySave.result?.applied === false
                    ? "Question was already saved"
                    : inquirySave.result?.applied === true
                      ? "Question saved to the Project"
                      : "Saved outcome confirmed"}
                </h4>
              </div>
              <span>Active</span>
            </header>
            <p>
              {inquirySave.request.graph_request.question} The graph snapshot
              and selection remain context; neither changed Project authority.
            </p>
            <dl className="history-facts">
              <div>
                <dt>Retained question</dt>
                <dd>
                  <code>{inquirySave.receipt.objective_ref.objective_id}</code>
                </dd>
              </div>
              <div>
                <dt>Recorded snapshot</dt>
                <dd>
                  <code>
                    {inquirySave.receipt.graph_binding.snapshot_ref.snapshot_id}
                  </code>
                </dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>
                  {inquirySave.result?.applied === false
                    ? "Idempotent replay returned the original retained question."
                    : "The exact request has one retained ProjectInquiry destination."}
                </dd>
              </div>
            </dl>
            <div className="focused-graph-inquiry-save__actions">
              <Link
                className="reference-primary-link"
                to={`/projects/${encodeURIComponent(entry.project_id)}/work#inquiry-${encodeURIComponent(inquirySave.receipt.objective_ref.objective_id)}`}
              >
                Open retained Project question
              </Link>
              <Link
                className="reference-text-link"
                to={entry.return_context.path}
                {...(entry.return_context.focus_id === undefined
                  ? {}
                  : { "data-return-focus": entry.return_context.focus_id })}
              >
                Return to {entry.return_context.label}
              </Link>
            </div>
          </section>
        ) : inquirySave.state === "failed" ? (
          <section
            className="focused-graph-inquiry-save"
            data-state={inquirySave.kind}
            aria-labelledby="focused-graph-inquiry-save-title"
            role="alert"
          >
            <header>
              <div>
                <p className="reference-panel-kicker">Project question</p>
                <h4 id="focused-graph-inquiry-save-title">
                  {saveFailureTitle[inquirySave.kind]}
                </h4>
              </div>
            </header>
            <p>{inquirySave.message}</p>
            <p>
              Petra has not claimed success. The displayed Graph, selection, and
              originating task remain unchanged.
            </p>
            <div className="focused-graph-inquiry-save__actions">
              {inquirySave.request === undefined ? null : (
                <PetraButton
                  density="compact"
                  variant="secondary"
                  onClick={() =>
                    void assessSaveOutcome(
                      inquirySave.request!,
                      inquirySave.kind,
                      inquirySave.message,
                    )
                  }
                >
                  Check exact save outcome
                </PetraButton>
              )}
              <Link
                className="reference-text-link"
                to={entry.return_context.path}
              >
                Return to {entry.return_context.label}
              </Link>
            </div>
          </section>
        ) : inquirySave.state === "assessing" ? (
          <section
            className="focused-graph-inquiry-save"
            data-state="assessing"
            aria-live="polite"
          >
            <h4>Checking the exact save request</h4>
            <p>
              {inquirySave.failureMessage} Petra is checking the retained
              command identity before any retry.
            </p>
          </section>
        ) : (
          <section
            className="focused-graph-inquiry-save"
            data-state={assessedEffect?.state}
            aria-labelledby="focused-graph-inquiry-save-title"
            role={
              assessedEffect?.state === "outcome_unknown" ? "alert" : undefined
            }
          >
            <header>
              <div>
                <p className="reference-panel-kicker">Recovery assessment</p>
                <h4 id="focused-graph-inquiry-save-title">
                  {assessedEffect?.state === "outcome_unknown"
                    ? "Outcome remains unknown"
                    : "Exact request cannot be verified"}
                </h4>
              </div>
            </header>
            <p>
              {assessedEffect?.state === "outcome_unknown"
                ? "No receipt was observed. Only the retained request may be delivered again; a new identity could duplicate the question."
                : assessedEffect?.state === "unavailable_to_verify"
                  ? assessedEffect.reason === "command_identity_conflict"
                    ? "This command identity belongs to a different request. Petra will not replace or reinterpret it."
                    : "The authenticated person cannot verify this command identity. No Project effect is claimed."
                  : "The recovery result is unavailable. No Project effect is claimed."}
            </p>
            <div className="focused-graph-inquiry-save__actions">
              {assessedEffect?.state === "outcome_unknown" ? (
                <PetraButton
                  density="compact"
                  variant="primary"
                  onClick={() => void saveExactQuestion(inquirySave.request)}
                >
                  Retry exact save request
                </PetraButton>
              ) : null}
              <Link
                className="reference-text-link"
                to={entry.return_context.path}
              >
                Return to {entry.return_context.label}
              </Link>
            </div>
          </section>
        )}
        {bookmarks.length === 0 ? (
          <p className="focused-graph-saved-questions__empty">
            No local view is bookmarked in this tab.
          </p>
        ) : (
          <ol>
            {bookmarks.map((question) => (
              <li key={question.key}>
                <PetraButton
                  density="compact"
                  variant="quiet"
                  onClick={() => nextState({ ...question.state })}
                >
                  {question.label}
                </PetraButton>
                <code>{question.snapshotId}</code>
              </li>
            ))}
          </ol>
        )}
      </section>

      {message === undefined ? null : (
        <div
          className="focused-graph-exploration__status"
          data-recovery={retryAvailable ? "retry_available" : "status"}
          role={retryAvailable ? "alert" : "status"}
          aria-live={retryAvailable ? "assertive" : "polite"}
        >
          <p>{message}</p>
          {retryAvailable ? (
            <PetraButton
              density="compact"
              variant="secondary"
              onClick={() => void applyExpansion()}
            >
              Retry exact expansion
            </PetraButton>
          ) : null}
        </div>
      )}

      {activeExpansion === undefined ? null : (
        <section
          className="focused-graph-expansion-summary"
          aria-labelledby="focused-graph-expansion-summary-title"
        >
          <header>
            <div>
              <p className="reference-panel-kicker">Accepted expansion</p>
              <h3 id="focused-graph-expansion-summary-title">
                {activeExpansion.recipe_label}
              </h3>
            </div>
            <span>{words(activeExpansion.accounting.result_state)}</span>
          </header>
          <dl className="history-facts">
            <div>
              <dt>Request</dt>
              <dd>
                <code>{state.view.content.task.request_id}</code>
              </dd>
            </div>
            <div>
              <dt>Recipe</dt>
              <dd>
                <code>{activeExpansion.recipe_semantic_key}</code>
              </dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>
                <code>{activeExpansion.target_ref.record_id}</code> · revision{" "}
                {activeExpansion.target_ref.revision}
              </dd>
            </div>
            <div>
              <dt>Normalized meanings</dt>
              <dd>
                {activeExpansion.filters.meaning_kinds.map(words).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Normalized directions</dt>
              <dd>
                {activeExpansion.filters.directions.map(words).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Normalized origins</dt>
              <dd>{activeExpansion.filters.origins.map(words).join(", ")}</dd>
            </div>
          </dl>
          <ul className="focused-graph-expansion-summary__accounting">
            <li>
              Capped members:{" "}
              {countText(activeExpansion.accounting.capped_members)}
            </li>
            <li>
              Hidden relationships:{" "}
              {countText(activeExpansion.accounting.hidden_relationships)}
            </li>
            <li>
              Restricted paths:{" "}
              {countText(activeExpansion.accounting.restricted_paths)}
            </li>
            <li>
              Cyclic paths: {countText(activeExpansion.accounting.cycle_paths)}
            </li>
            <li>
              Incomplete paths:{" "}
              {countText(activeExpansion.accounting.incomplete_paths)}
            </li>
            <li>
              Unknown paths:{" "}
              {countText(activeExpansion.accounting.unknown_paths)}
            </li>
          </ul>
          <ul className="focused-graph-expansion-summary__groups">
            {activeExpansionView?.content.groups.map((group) => (
              <li key={group.group_key}>
                <strong>{group.label}</strong>
                <span>
                  {group.returned_count} returned ·{" "}
                  {countText(group.filtered_count)} filtered ·{" "}
                  {countText(group.hidden_count)} hidden ·{" "}
                  {words(group.coverage)}
                </span>
                <small>{group.membership_rule}</small>
              </li>
            ))}
          </ul>
          <p>
            Hidden, filtered, capped, restricted, incomplete, and unknown paths
            do not establish absence or completeness beyond this exact scope.
          </p>
        </section>
      )}

      <FocusedGraphResult
        regions={regions}
        selectedKey={state.selectedKey}
        pinnedNodeKeys={state.pinnedNodeKeys}
        collapsedNodeKeys={state.collapsedNodeKeys}
        homeNodeKey={homeNode?.node_key}
        layout={state.layout}
        representation={state.representation}
        onRepresentationChange={(representation) =>
          updatePresentation({ representation })
        }
        onSelect={(selectedKey) => updatePresentation({ selectedKey })}
        rendererFactory={rendererFactory}
      />
      <FocusedGraphDetails
        key={`${state.stateId}:${state.selectedKey}`}
        projectId={entry.project_id}
        definition={definition}
        request={state.request}
        view={state.view}
        selectedKey={state.selectedKey}
        stateId={state.stateId}
        returnContext={entry.return_context}
      />
      {entry.action_preview_target === undefined ? null : (
        <FocusedGraphActions
          key={`${state.stateId}:${state.selectedKey}:action-preview`}
          projectId={entry.project_id}
          definition={definition}
          request={state.request}
          view={state.view}
          selectedKey={state.selectedKey}
          stateId={state.stateId}
          target={entry.action_preview_target}
          returnContext={entry.return_context}
          {...(actionPreviewRead === undefined
            ? {}
            : { read: actionPreviewRead })}
        />
      )}
    </section>
  );
};
