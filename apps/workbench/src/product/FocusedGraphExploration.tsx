import { FocusedGraphClient } from "@petra/adapters";
import type {
  FocusedGraphDisclosureCountV11,
  FocusedGraphExactRef,
  FocusedGraphExplorationFiltersV11,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
} from "@petra/contracts";
import type {
  FocusedGraphExplorationViewRequest,
  FocusedGraphReadRequest,
} from "@petra/core";
import { useMemo, useRef, useState } from "react";

import { PetraButton, PetraButtonGroup } from "../design-system/primitives.js";
import type { FocusedGraphEntry } from "./focused-graph-entry.js";
import { createFocusedGraphRequestId } from "./focused-graph-identities.js";
import { focusedGraphRegionsFromView } from "./focused-graph-regions.js";
import type { PetraFocusedGraphReadView } from "./focused-graph-regions.js";
import { FocusedGraphDetails } from "./FocusedGraphDetails.js";
import {
  FocusedGraphResult,
  type FocusedGraphLayout,
  type FocusedGraphRepresentation,
} from "./FocusedGraphResult.js";

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
): string => {
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

interface SavedExactQuestion {
  readonly key: string;
  readonly label: string;
  readonly snapshotId: string;
  readonly state: FocusedGraphPresentationState;
}

export const FocusedGraphExploration = ({
  entry,
  definition,
  initialRequest,
  initialView,
  read = readExpansion,
}: {
  entry: FocusedGraphEntry;
  definition: PetraProjectDefinition;
  initialRequest: FocusedGraphReadRequest;
  initialView: PetraFocusedGraphReadView;
  read?: (
    projectId: string,
    definition: PetraProjectDefinition,
    request: FocusedGraphExplorationViewRequest,
  ) => Promise<PetraFocusedGraphViewV11>;
}): React.JSX.Element => {
  const initialSelectedKey = selectedKeyForView(initialView, entry.focus_ref);
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
      representation: "graph",
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
  const [saved, setSaved] = useState<readonly SavedExactQuestion[]>([]);
  const active = useRef<FocusedGraphActiveExploration | undefined>(undefined);

  const invalidatePending = (): void => {
    active.current = undefined;
    setPendingRequestId(undefined);
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
    try {
      const response = await read(entry.project_id, definition, request);
      if (
        active.current !== intent ||
        !matchesActiveFocusedGraphExploration(
          response,
          intent,
          state.stateId,
        ) ||
        !focusedGraphViewPreservesSelection(response, state.selectedKey)
      ) {
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
      setMessage(
        `Accepted ${response.content.exploration.recipe_label} for the exact active snapshot.`,
      );
    } catch (error) {
      if (active.current !== intent) return;
      active.current = undefined;
      setPendingRequestId(undefined);
      setMessage(
        error instanceof Error
          ? error.message
          : "The exact expansion result is unavailable.",
      );
    }
  };

  const saveExactQuestion = (): void => {
    const key = `saved-question:${saved.length + 1}:${state.stateId}`;
    setSaved((current) => [
      ...current,
      {
        key,
        label: entry.question,
        snapshotId: state.view.content.requested_snapshot.snapshot_id,
        state,
      },
    ]);
    setMessage(
      "Saved this exact question and snapshot as local presentation state.",
    );
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
          <h3 id="focused-graph-saved-questions-title">
            Saved exact questions
          </h3>
          <PetraButton density="compact" onClick={saveExactQuestion}>
            Save exact question
          </PetraButton>
        </header>
        {saved.length === 0 ? (
          <p>No exact question is saved in this local view.</p>
        ) : (
          <ol>
            {saved.map((question) => (
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
        <p className="focused-graph-exploration__status" aria-live="polite">
          {message}
        </p>
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
    </section>
  );
};
