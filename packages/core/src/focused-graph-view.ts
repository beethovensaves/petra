import { createHash } from "node:crypto";

import type {
  FocusedGraphContractRef,
  FocusedGraphExactRef,
  FocusedGraphRegisteredAction,
  FocusedGraphResolvedSemantic,
  FocusedGraphLimits,
  FocusedGraphExplorationFiltersV11,
  FocusedGraphProjectDefinitionRef,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphSemanticDestination,
  FocusedGraphTask,
  FocusedGraphTerm,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
  ProjectDefinitionContractRef,
  ProjectDefinitionRegistration,
  ProjectDefinitionTerm,
} from "@petra/contracts";
import {
  ContractRegistryError,
  type PetraContractRegistry,
} from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export type FocusedGraphViewContractErrorCode =
  | "FOCUSED_GRAPH_CONTRACT_INVALID"
  | "FOCUSED_GRAPH_DEFINITION_MISMATCH"
  | "FOCUSED_GRAPH_PROFILE_UNREGISTERED"
  | "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS"
  | "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED"
  | "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE"
  | "FOCUSED_GRAPH_LAYER_INCOMPATIBLE"
  | "FOCUSED_GRAPH_TEMPORAL_POSITION_INCOMPATIBLE"
  | "FOCUSED_GRAPH_ACTION_INCOMPATIBLE"
  | "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE";

export class FocusedGraphViewContractError extends Error {
  constructor(
    readonly code: FocusedGraphViewContractErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FocusedGraphViewContractError";
  }
}

export type FocusedGraphQueryErrorCode =
  | "FOCUSED_GRAPH_QUERY_INVALID"
  | "FOCUSED_GRAPH_PROJECT_NOT_FOUND"
  | "FOCUSED_GRAPH_DEFINITION_STALE"
  | "FOCUSED_GRAPH_SNAPSHOT_STALE"
  | "FOCUSED_GRAPH_PROJECTION_UNAVAILABLE"
  | "FOCUSED_GRAPH_PROJECTION_INCOHERENT"
  | "FOCUSED_GRAPH_FOCUS_NOT_FOUND"
  | "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED"
  | "FOCUSED_GRAPH_STORED_RECORD_CORRUPT";

export class FocusedGraphQueryError extends Error {
  constructor(
    readonly code: FocusedGraphQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FocusedGraphQueryError";
  }
}

/**
 * Exact, renderer-neutral input to the production focused query owner. Current
 * and working reads share the current Project position while an historical read
 * requires one exact retained snapshot and recorded-time position. Expansion,
 * comparison, and mutation entry remain separate bounded slices.
 */
export interface FocusedGraphViewRequest {
  readonly request_id: string;
  readonly task_kind: "neighborhood";
  readonly task_semantic_key: string;
  readonly question: string;
  readonly focus_ref: FocusedGraphExactRef;
  readonly origin: FocusedGraphTask["origin"];
  readonly project_definition_ref: FocusedGraphProjectDefinitionRef;
  readonly semantic_layer: "current" | "working" | "historical";
  readonly temporal_position:
    | {
        readonly position_kind: "current";
        readonly dimension: "project_snapshot";
      }
    | {
        readonly position_kind: "historical";
        readonly dimension: "recorded_time";
        readonly at: { readonly state: "exact"; readonly value: string };
      };
  readonly object_semantic_key: string;
  readonly relationship_semantic_key: string;
  readonly return_action_semantic_key: string;
  readonly return_destination: FocusedGraphSemanticDestination;
  readonly limits: FocusedGraphLimits;
  readonly expected_snapshot?: FocusedGraphProjectSnapshotRef;
}

export interface FocusedGraphNamedExpansionRequest {
  readonly mode: "named_expansion";
  readonly expansion_key: string;
  readonly recipe_semantic_key: string;
  readonly target_ref: FocusedGraphExactRef;
  readonly maximum_depth: number;
  readonly filters: FocusedGraphExplorationFiltersV11;
}

/**
 * Opt-in additive query shape for one registered, snapshot-bound expansion.
 * The recipe semantic is resolved from the exact ProjectDefinition; the client
 * supplies no predicate, Cypher, renderer geometry, or completeness claim.
 */
export interface FocusedGraphExplorationViewRequest extends FocusedGraphViewRequest {
  readonly exploration: FocusedGraphNamedExpansionRequest;
  readonly expected_snapshot: FocusedGraphProjectSnapshotRef;
}

export type FocusedGraphReadRequest =
  FocusedGraphViewRequest | FocusedGraphExplorationViewRequest;

export type PetraFocusedGraphReadView =
  PetraFocusedGraphView | PetraFocusedGraphViewV11;

export interface FocusedGraphViewReader {
  queryFocusedGraph(
    projectId: string,
    request: FocusedGraphReadRequest,
  ): Promise<PetraFocusedGraphReadView | undefined>;
}

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const PETRA_ID_PATTERN = /^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_DEFINITION_ID_PATTERN =
  /^project_definition_[0-9A-HJKMNP-TV-Z]{26}$/u;
const FOCUSED_REQUEST_ID_PATTERN =
  /^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SEMANTIC_KEY_PATTERN = /^[a-z][a-z0-9._/-]{1,199}$/u;
const STABLE_KEY_PATTERN = /^[a-z][a-z0-9._:/-]{1,999}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean => {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
};

const exactRefInput = (value: unknown): value is FocusedGraphExactRef =>
  isRecord(value) &&
  exactKeys(value, ["record_id", "revision", "record_hash"]) &&
  typeof value.record_id === "string" &&
  PETRA_ID_PATTERN.test(value.record_id) &&
  Number.isSafeInteger(value.revision) &&
  Number(value.revision) >= 1 &&
  typeof value.record_hash === "string" &&
  HASH_PATTERN.test(value.record_hash);

const snapshotInput = (
  value: unknown,
): value is FocusedGraphProjectSnapshotRef =>
  isRecord(value) &&
  exactKeys(value, [
    "snapshot_id",
    "revision",
    "event_position",
    "content_hash",
  ]) &&
  typeof value.snapshot_id === "string" &&
  /^snapshot_[0-9A-HJKMNP-TV-Z]{26}$/u.test(value.snapshot_id) &&
  Number.isSafeInteger(value.revision) &&
  Number(value.revision) >= 1 &&
  Number.isSafeInteger(value.event_position) &&
  Number(value.event_position) >= 0 &&
  typeof value.content_hash === "string" &&
  HASH_PATTERN.test(value.content_hash);

const temporalPositionInput = (
  value: unknown,
): value is FocusedGraphViewRequest["temporal_position"] => {
  if (!isRecord(value) || typeof value.position_kind !== "string") return false;
  if (value.position_kind === "current") {
    return (
      exactKeys(value, ["position_kind", "dimension"]) &&
      value.dimension === "project_snapshot"
    );
  }
  if (
    value.position_kind !== "historical" ||
    !exactKeys(value, ["position_kind", "dimension", "at"]) ||
    value.dimension !== "recorded_time" ||
    !isRecord(value.at) ||
    !exactKeys(value.at, ["state", "value"]) ||
    value.at.state !== "exact" ||
    typeof value.at.value !== "string"
  ) {
    return false;
  }
  const parsed = Date.parse(value.at.value);
  return (
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value.at.value
  );
};

const definitionRefInput = (
  value: unknown,
): value is FocusedGraphProjectDefinitionRef =>
  isRecord(value) &&
  exactKeys(value, [
    "project_definition_id",
    "revision",
    "content_hash",
    "record_hash",
    "definition_family",
  ]) &&
  typeof value.project_definition_id === "string" &&
  PROJECT_DEFINITION_ID_PATTERN.test(value.project_definition_id) &&
  Number.isSafeInteger(value.revision) &&
  Number(value.revision) >= 1 &&
  typeof value.content_hash === "string" &&
  HASH_PATTERN.test(value.content_hash) &&
  typeof value.record_hash === "string" &&
  HASH_PATTERN.test(value.record_hash) &&
  typeof value.definition_family === "string" &&
  /^[a-z][a-z0-9.-]{2,127}$/u.test(value.definition_family);

const originInput = (value: unknown): value is FocusedGraphTask["origin"] => {
  if (!isRecord(value) || !exactKeys(value, ["origin_kind"], ["origin_ref"]))
    return false;
  if (
    typeof value.origin_kind !== "string" ||
    ![
      "brief",
      "evidence",
      "review",
      "petra",
      "history",
      "direct",
      "saved_question",
    ].includes(value.origin_kind)
  )
    return false;
  return value.origin_ref === undefined || exactRefInput(value.origin_ref);
};

const destinationInput = (
  value: unknown,
): value is FocusedGraphSemanticDestination => {
  if (!isRecord(value)) return false;
  const common =
    typeof value.destination_key === "string" &&
    STABLE_KEY_PATTERN.test(value.destination_key) &&
    typeof value.destination_kind === "string" &&
    [
      "details",
      "source_inspection",
      "brief",
      "evidence",
      "review",
      "history",
      "work",
    ].includes(value.destination_kind) &&
    typeof value.owner === "string" &&
    [
      "project_object_location_view",
      "project_source_view",
      "project_brief_view",
      "project_relationship_view",
      "project_review_view",
      "project_history_episode_view",
      "project_work_view",
    ].includes(value.owner) &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    value.label.length <= 240;
  if (!common) return false;
  return value.state === "available"
    ? exactKeys(value, [
        "destination_key",
        "destination_kind",
        "state",
        "owner",
        "label",
        "target_ref",
      ]) && exactRefInput(value.target_ref)
    : value.state === "unavailable" &&
        exactKeys(value, [
          "destination_key",
          "destination_kind",
          "state",
          "owner",
          "label",
          "reason",
        ]) &&
        typeof value.reason === "string" &&
        value.reason.trim().length > 0 &&
        value.reason.length <= 2000;
};

const limitsInput = (
  value: unknown,
  maximumDepth: number,
): value is FocusedGraphLimits =>
  isRecord(value) &&
  exactKeys(value, [
    "maximum_depth",
    "maximum_nodes",
    "maximum_relationships",
    "maximum_paths",
  ]) &&
  value.maximum_depth === maximumDepth &&
  Number.isSafeInteger(value.maximum_nodes) &&
  Number(value.maximum_nodes) >= 1 &&
  Number(value.maximum_nodes) <= 100 &&
  Number.isSafeInteger(value.maximum_relationships) &&
  Number(value.maximum_relationships) >= 1 &&
  Number(value.maximum_relationships) <= 99 &&
  Number.isSafeInteger(value.maximum_paths) &&
  Number(value.maximum_paths) >= 1 &&
  Number(value.maximum_paths) <= 99;

const uniqueStrings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((item): item is string => typeof item === "string") &&
  new Set(value).size === value.length;

const explorationInput = (
  value: unknown,
): value is FocusedGraphNamedExpansionRequest => {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "mode",
      "expansion_key",
      "recipe_semantic_key",
      "target_ref",
      "maximum_depth",
      "filters",
    ]) ||
    value.mode !== "named_expansion" ||
    typeof value.expansion_key !== "string" ||
    !STABLE_KEY_PATTERN.test(value.expansion_key) ||
    typeof value.recipe_semantic_key !== "string" ||
    !SEMANTIC_KEY_PATTERN.test(value.recipe_semantic_key) ||
    !exactRefInput(value.target_ref) ||
    !Number.isSafeInteger(value.maximum_depth) ||
    Number(value.maximum_depth) < 1 ||
    Number(value.maximum_depth) > 4 ||
    !isRecord(value.filters) ||
    !exactKeys(value.filters, ["meaning_kinds", "directions", "origins"]) ||
    !uniqueStrings(value.filters.meaning_kinds) ||
    value.filters.meaning_kinds.length === 0 ||
    value.filters.meaning_kinds.some(
      (item) =>
        ![
          "citation",
          "support",
          "contradiction",
          "qualification",
          "inference",
          "structural",
          "provenance",
          "governance",
          "dependency",
        ].includes(item),
    ) ||
    !uniqueStrings(value.filters.directions) ||
    value.filters.directions.length === 0 ||
    value.filters.directions.some(
      (item) => !["outgoing", "incoming"].includes(item),
    ) ||
    !uniqueStrings(value.filters.origins) ||
    value.filters.origins.length === 0 ||
    value.filters.origins.some(
      (item) =>
        ![
          "canonical_record",
          "working_candidate",
          "historical_record",
          "model_inference",
        ].includes(item),
    )
  ) {
    return false;
  }
  return true;
};

/** Parse an untrusted API body without accepting renderer or command fields. */
export const parseFocusedGraphViewRequest = (
  value: unknown,
): FocusedGraphReadRequest => {
  const required = [
    "request_id",
    "task_kind",
    "task_semantic_key",
    "question",
    "focus_ref",
    "origin",
    "project_definition_ref",
    "semantic_layer",
    "temporal_position",
    "object_semantic_key",
    "relationship_semantic_key",
    "return_action_semantic_key",
    "return_destination",
    "limits",
  ] as const;
  const semantic = (candidate: unknown): candidate is string =>
    typeof candidate === "string" && SEMANTIC_KEY_PATTERN.test(candidate);
  if (
    !isRecord(value) ||
    !exactKeys(value, required, ["expected_snapshot", "exploration"]) ||
    typeof value.request_id !== "string" ||
    !FOCUSED_REQUEST_ID_PATTERN.test(value.request_id) ||
    value.task_kind !== "neighborhood" ||
    !semantic(value.task_semantic_key) ||
    typeof value.question !== "string" ||
    value.question.trim().length === 0 ||
    value.question.length > 8000 ||
    !exactRefInput(value.focus_ref) ||
    !originInput(value.origin) ||
    !definitionRefInput(value.project_definition_ref) ||
    !["current", "working", "historical"].includes(
      String(value.semantic_layer),
    ) ||
    !temporalPositionInput(value.temporal_position) ||
    ((value.semantic_layer === "current" ||
      value.semantic_layer === "working") &&
      value.temporal_position.position_kind !== "current") ||
    (value.semantic_layer === "historical" &&
      value.temporal_position.position_kind !== "historical") ||
    !semantic(value.object_semantic_key) ||
    !semantic(value.relationship_semantic_key) ||
    !semantic(value.return_action_semantic_key) ||
    !destinationInput(value.return_destination) ||
    (value.exploration === undefined
      ? !limitsInput(value.limits, 1)
      : !explorationInput(value.exploration) ||
        !limitsInput(value.limits, value.exploration.maximum_depth)) ||
    (value.expected_snapshot !== undefined &&
      !snapshotInput(value.expected_snapshot)) ||
    (value.semantic_layer === "historical" &&
      value.expected_snapshot === undefined) ||
    (value.exploration !== undefined &&
      (value.expected_snapshot === undefined ||
        value.semantic_layer === "historical"))
  ) {
    throw new FocusedGraphQueryError(
      "FOCUSED_GRAPH_QUERY_INVALID",
      "A focused graph query requires one exact registered current, working, or retained historical neighborhood request.",
    );
  }
  return structuredClone(value) as unknown as FocusedGraphReadRequest;
};

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const sameContract = (
  left: FocusedGraphContractRef | ProjectDefinitionContractRef,
  right: FocusedGraphContractRef | ProjectDefinitionContractRef,
): boolean =>
  left.name === right.name &&
  left.version === right.version &&
  left.content_hash === right.content_hash;

const sameTerm = (
  left: FocusedGraphTerm,
  right: ProjectDefinitionTerm,
): boolean =>
  left.semantic_key === right.semantic_key &&
  left.singular === right.singular &&
  left.plural === right.plural &&
  left.definition === right.definition &&
  left.generic_family === right.generic_family;

const sameRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const registrationKindsByRole = {
  task: new Set(["objective_schema", "workflow", "extension"]),
  object: new Set(["object_schema", "source_role"]),
  relationship: new Set(["relationship_schema"]),
  action: new Set(["workflow", "tool", "extension"]),
} satisfies Record<
  FocusedGraphResolvedSemantic["role"],
  ReadonlySet<ProjectDefinitionRegistration["registration_kind"]>
>;

const termFamiliesByRole = {
  task: new Set(["focus", "task"]),
  object: new Set(["focus", "finding", "reference", "output", "other"]),
  relationship: new Set(["relationship"]),
  action: new Set(["task"]),
} satisfies Record<
  FocusedGraphResolvedSemantic["role"],
  ReadonlySet<ProjectDefinitionTerm["generic_family"]>
>;

const consequenceByAction = {
  inspect_details: "read_only_navigation",
  open_source: "read_only_navigation",
  inspect_path: "read_only_navigation",
  expand_recorded: "read_only_expansion",
  prepare_correction: "prepares_working_candidate",
  open_review: "opens_canonical_review",
  preview_work: "previews_typed_work",
  return_to_origin: "read_only_navigation",
} satisfies Record<
  FocusedGraphRegisteredAction["action_kind"],
  FocusedGraphRegisteredAction["consequence"]
>;

const authorityByLayer = {
  current: "current_authority",
  working: "working_non_authority",
  historical: "historical_authority",
} as const;

const uniqueMap = <Value>(
  values: readonly Value[],
  keyOf: (value: Value) => string,
  code: FocusedGraphViewContractErrorCode,
  label: string,
): Map<string, Value> => {
  const result = new Map<string, Value>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key))
      throw new FocusedGraphViewContractError(
        code,
        `${label} ${key} is ambiguous.`,
      );
    result.set(key, value);
  }
  return result;
};

/**
 * Pure conformance boundary over an already authorized ProjectDefinition and a
 * composed view. It performs no query, authority read, persistence, route, or
 * mutation. Profile text and actions are accepted only from exact installed
 * registrations on the supplied immutable definition revision.
 */
export class FocusedGraphViewContractResolver {
  constructor(private readonly contracts: PetraContractRegistry) {}

  private fail(
    code: FocusedGraphViewContractErrorCode,
    message: string,
  ): never {
    throw new FocusedGraphViewContractError(code, message);
  }

  private installed(contract: FocusedGraphContractRef): void {
    const entry = this.contracts.entries.find(
      (candidate) =>
        `petra.${candidate.name}` === contract.name &&
        candidate.version === contract.version,
    );
    if (entry === undefined || entry.canonical_sha256 !== contract.content_hash)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${contract.name}@${contract.version} semantic contract is not installed.`,
      );
    try {
      this.contracts.validator(entry.name, entry.version);
    } catch {
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The installed ${contract.name}@${contract.version} contract has no validator.`,
      );
    }
  }

  private exactRegistration(
    definition: PetraProjectDefinition,
    semanticKey: string,
  ): ProjectDefinitionRegistration {
    const matches = definition.content.registrations.filter(
      (registration) => registration.semantic_key === semanticKey,
    );
    if (matches.length > 1)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
        `The exact ${semanticKey} profile registration is ambiguous.`,
      );
    const match = matches[0];
    if (match === undefined)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${semanticKey} profile registration is unavailable.`,
      );
    return match;
  }

  private exactTerm(
    definition: PetraProjectDefinition,
    semanticKey: string,
  ): ProjectDefinitionTerm {
    const matches = definition.content.terms.filter(
      (term) => term.semantic_key === semanticKey,
    );
    if (matches.length > 1)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
        `The exact ${semanticKey} profile term is ambiguous.`,
      );
    const match = matches[0];
    if (match === undefined)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        `The exact ${semanticKey} profile term is unavailable.`,
      );
    return match;
  }

  private resolveSemantic(
    definition: PetraProjectDefinition,
    semantic: FocusedGraphResolvedSemantic,
  ): void {
    const registrationKinds: ReadonlySet<
      ProjectDefinitionRegistration["registration_kind"]
    > = registrationKindsByRole[semantic.role];
    const termFamilies: ReadonlySet<ProjectDefinitionTerm["generic_family"]> =
      termFamiliesByRole[semantic.role];
    if (semantic.term.semantic_key !== semantic.semantic_key)
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} term names a different meaning.`,
      );
    if (!registrationKinds.has(semantic.registration_kind))
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} registration kind is incompatible with its ${semantic.role} role.`,
      );
    if (!termFamilies.has(semantic.term.generic_family))
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} term family is incompatible with its ${semantic.role} role.`,
      );
    const registration = this.exactRegistration(
      definition,
      semantic.semantic_key,
    );
    const term = this.exactTerm(definition, semantic.semantic_key);
    if (
      registration.registration_kind !== semantic.registration_kind ||
      !sameContract(registration.contract, semantic.contract) ||
      !sameTerm(semantic.term, term)
    )
      this.fail(
        "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
        `The ${semantic.semantic_key} view meaning is incompatible with the exact ProjectDefinition.`,
      );
    this.installed(semantic.contract);
  }

  resolve<View extends PetraFocusedGraphReadView>(
    definition: PetraProjectDefinition,
    view: View,
  ): {
    state: "resolved";
    definition_family: string;
    view: View;
  } {
    try {
      this.contracts.assertValid("project-definition", "1.0.0", definition);
      this.contracts.assertValid(
        "focused-graph-view",
        view.schema_version,
        view,
      );
    } catch (error) {
      const detail =
        error instanceof ContractRegistryError &&
        error.validationErrors.length > 0
          ? `: ${error.validationErrors
              .map(
                (failure) =>
                  `${failure.instancePath || "/"} ${failure.message ?? "is invalid"}`,
              )
              .join("; ")}`
          : error instanceof Error
            ? `: ${error.message}`
            : ".";
      this.fail(
        "FOCUSED_GRAPH_CONTRACT_INVALID",
        `The ProjectDefinition or focused graph value is not contract-valid${detail}`,
      );
    }

    const content = view.content;
    const profile = content.profile;
    const definitionRef = profile.project_definition_ref;
    if (
      view.project_id !== definition.project_id ||
      definitionRef.project_definition_id !==
        definition.project_definition_id ||
      definitionRef.revision !== definition.revision ||
      definitionRef.content_hash !== definition.content_hash ||
      definitionRef.record_hash !== digest(definition) ||
      definitionRef.definition_family !== definition.definition_family ||
      definition.content_hash !== digest(definition.content)
    )
      this.fail(
        "FOCUSED_GRAPH_DEFINITION_MISMATCH",
        "Focused graph resolution requires one exact Project-owned definition revision and record hash.",
      );
    if (
      profile.kernel_compatibility !==
        definition.content.kernel_compatibility ||
      profile.label !== definition.content.label ||
      !definition.content.supported_places.includes("graph")
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "The exact ProjectDefinition is not registered for this focused graph profile.",
      );

    const graphRegistration = this.exactRegistration(
      definition,
      profile.focused_graph_registration.semantic_key,
    );
    if (
      graphRegistration.registration_kind !== "extension" ||
      !sameContract(
        graphRegistration.contract,
        profile.focused_graph_registration.contract,
      )
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "The exact ProjectDefinition focused graph registration is incompatible.",
      );
    const focusedContract = this.contracts.entries.find(
      (candidate) =>
        candidate.name === "focused-graph-view" &&
        candidate.version === "1.0.0",
    );
    if (
      focusedContract === undefined ||
      graphRegistration.contract.name !== "petra.focused-graph-view" ||
      graphRegistration.contract.version !== "1.0.0" ||
      graphRegistration.contract.content_hash !==
        focusedContract.canonical_sha256
    )
      this.fail(
        "FOCUSED_GRAPH_PROFILE_UNREGISTERED",
        "No installed focused graph contract supports this ProjectDefinition.",
      );
    this.installed(profile.focused_graph_registration.contract);

    const semantics = uniqueMap(
      profile.resolved_semantics,
      (semantic) => semantic.semantic_key,
      "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
      "Resolved semantic",
    );
    for (const semantic of semantics.values())
      this.resolveSemantic(definition, semantic);
    const requireSemantic = (
      semanticKey: string,
      role: FocusedGraphResolvedSemantic["role"],
    ): FocusedGraphResolvedSemantic => {
      const semantic = semantics.get(semanticKey);
      if (semantic === undefined)
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
          `The ${semanticKey} ${role} meaning is not resolved by this profile.`,
        );
      if (semantic.role !== role)
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `The ${semanticKey} meaning cannot be used as a ${role}.`,
        );
      return semantic;
    };

    requireSemantic(content.task.task_semantic_key, "task");
    for (const semanticKey of content.scope.included_relationship_semantics)
      requireSemantic(semanticKey, "relationship");
    for (const node of content.nodes) {
      const semantic = requireSemantic(node.semantic_key, "object");
      if (!sameTerm(node.term, semantic.term))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Node ${node.node_key} does not preserve its resolved profile term.`,
        );
    }
    for (const relationship of content.relationships) {
      const semantic = requireSemantic(
        relationship.semantic_key,
        "relationship",
      );
      if (!sameTerm(relationship.term, semantic.term))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} does not preserve its resolved profile term.`,
        );
    }
    for (const action of content.actions)
      requireSemantic(action.semantic_key, "action");

    const { request_hash: requestHash, ...requestIdentity } = content.task;
    if (
      content.task.question_hash !== digest(content.task.question) ||
      requestHash !== digest(requestIdentity) ||
      view.content_hash !== digest(content)
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The focused graph question, request, or content identity is inconsistent.",
      );

    if (!content.scope.included_layers.includes(content.semantic_layer))
      this.fail(
        "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
        "The active semantic layer is outside the bounded scope.",
      );
    const historical = content.semantic_layer === "historical";
    if (
      historical !==
        (content.temporal_position.position_kind === "historical") ||
      (historical &&
        content.scope.included_layers.some((layer) => layer !== "historical"))
    )
      this.fail(
        "FOCUSED_GRAPH_TEMPORAL_POSITION_INCOMPATIBLE",
        "The temporal position is incompatible with the active semantic layer.",
      );
    if (
      content.projection_position.represented_event_position !==
      content.represented_snapshot.event_position
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The projection position does not identify the represented snapshot.",
      );

    const nodes = uniqueMap(
      content.nodes,
      (node) => node.node_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Node",
    );
    const relationships = uniqueMap(
      content.relationships,
      (relationship) => relationship.relationship_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Relationship",
    );
    const paths = uniqueMap(
      content.paths,
      (path) => path.path_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Path",
    );
    const destinations = uniqueMap(
      content.destinations,
      (destination) => destination.destination_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Destination",
    );
    uniqueMap(
      content.actions,
      (action) => action.action_key,
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
      "Action",
    );

    if (
      content.nodes.length > content.scope.limits.maximum_nodes ||
      content.relationships.length >
        content.scope.limits.maximum_relationships ||
      content.paths.length > content.scope.limits.maximum_paths
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The returned membership exceeds its declared finite limits.",
      );
    if (
      !content.task.focus_refs.some((focus) =>
        [...nodes.values()].some((node) => sameRef(node.record_ref, focus)),
      )
    )
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The exact task focus is not represented by the bounded result.",
      );

    const memberKeys = new Set([
      ...nodes.keys(),
      ...relationships.keys(),
      ...paths.keys(),
    ]);
    for (const node of nodes.values()) {
      if (
        !content.scope.included_layers.includes(node.layer) ||
        node.authority_position !== authorityByLayer[node.layer]
      )
        this.fail(
          "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
          `Node ${node.node_key} has incompatible layer authority.`,
        );
      for (const destinationKey of node.destination_keys)
        if (!destinations.has(destinationKey))
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Node ${node.node_key} names an unavailable destination key.`,
          );
    }
    for (const relationship of relationships.values()) {
      if (
        !nodes.has(relationship.source_node_key) ||
        !nodes.has(relationship.target_node_key)
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has an unrepresented endpoint.`,
        );
      if (
        !content.scope.included_layers.includes(relationship.layer) ||
        relationship.authority_position !== authorityByLayer[relationship.layer]
      )
        this.fail(
          "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has incompatible layer authority.`,
        );
      if (!content.scope.directions.includes(relationship.direction))
        this.fail(
          "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
          `Relationship ${relationship.relationship_key} has a direction outside the bounded scope.`,
        );
      for (const destinationKey of relationship.destination_keys)
        if (!destinations.has(destinationKey))
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Relationship ${relationship.relationship_key} names an unavailable destination key.`,
          );
    }

    for (const path of paths.values()) {
      if (
        (path.state === "no_path" && path.steps.length !== 0) ||
        (path.state !== "no_path" && path.steps.length === 0) ||
        path.steps.length > content.scope.limits.maximum_depth
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          `Path ${path.path_key} is inconsistent with its state or depth limit.`,
        );
      for (const [index, step] of path.steps.entries()) {
        const relationship = relationships.get(step.relationship_key);
        if (
          step.position !== index + 1 ||
          relationship === undefined ||
          !nodes.has(step.from_node_key) ||
          !nodes.has(step.to_node_key)
        )
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Path ${path.path_key} has an invalid ordered step.`,
          );
        const forward =
          relationship.source_node_key === step.from_node_key &&
          relationship.target_node_key === step.to_node_key;
        const reverse =
          relationship.source_node_key === step.to_node_key &&
          relationship.target_node_key === step.from_node_key;
        if (
          (step.traversal_direction === "outgoing" && !forward) ||
          (step.traversal_direction === "incoming" && !reverse)
        )
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Path ${path.path_key} reverses an endpoint without naming incoming traversal.`,
          );
      }
    }

    if (!destinations.has(content.task.return_destination_key))
      this.fail(
        "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
        "The exact return destination is unavailable.",
      );
    if (content.selection.state === "selected") {
      const selected =
        content.selection.selection_kind === "node"
          ? nodes
          : content.selection.selection_kind === "relationship"
            ? relationships
            : paths;
      if (content.selection.selected_keys.some((key) => !selected.has(key)))
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          "The selection does not resolve within the represented membership.",
        );
    }
    for (const action of content.actions) {
      if (action.consequence !== consequenceByAction[action.action_kind])
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has an incompatible consequence.`,
        );
      if (action.target_keys.some((key) => !memberKeys.has(key)))
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has a target outside the represented membership.`,
        );
      if (
        action.availability.state === "available" &&
        action.availability.destination_key !== undefined &&
        !destinations.has(action.availability.destination_key)
      )
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          `Action ${action.action_key} has an unavailable semantic destination.`,
        );
      if (
        historical &&
        (action.action_kind === "prepare_correction" ||
          action.action_kind === "preview_work")
      )
        this.fail(
          "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
          "Historical focused graph positions cannot prepare current correction or Work actions.",
        );
    }

    if (view.schema_version === "1.1.0") {
      const exploration = view.content.exploration;
      const expansionSemantic = requireSemantic(
        exploration.recipe_semantic_key,
        "action",
      );
      const expansionContract = this.contracts.entries.find(
        (candidate) =>
          candidate.name === "focused-graph-view" &&
          candidate.version === "1.1.0",
      );
      const target = nodes.get(exploration.target_node_key);
      const expansionActions = content.actions.filter(
        (action) =>
          action.action_kind === "expand_recorded" &&
          action.semantic_key === expansionSemantic.semantic_key &&
          action.target_keys.includes(exploration.target_node_key),
      );
      if (
        target === undefined ||
        expansionContract === undefined ||
        expansionSemantic.contract.name !== "petra.focused-graph-view" ||
        expansionSemantic.contract.version !== "1.1.0" ||
        expansionSemantic.contract.content_hash !==
          expansionContract.canonical_sha256 ||
        !sameRef(target.record_ref, exploration.target_ref) ||
        exploration.maximum_depth !== content.scope.limits.maximum_depth ||
        canonicalize(content.scope.directions) !==
          canonicalize(exploration.filters.directions) ||
        expansionActions.length !== 1
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          "The named expansion does not preserve one exact registered recipe, target, action, and finite depth.",
        );

      const grouped = new Set<string>();
      for (const group of view.content.groups) {
        if (
          group.returned_count !== group.member_relationship_keys.length ||
          group.overlap ||
          group.member_relationship_keys.some((key) => grouped.has(key))
        )
          this.fail(
            "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
            `Group ${group.group_key} has incompatible count or overlap accounting.`,
          );
        for (const key of group.member_relationship_keys) {
          const relationship = relationships.get(key);
          if (
            relationship === undefined ||
            relationship.layer !== group.layer ||
            relationship.meaning_kind !== group.meaning_kind
          )
            this.fail(
              "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
              `Group ${group.group_key} names a relationship outside its disclosed facet.`,
            );
          grouped.add(key);
        }
      }
      if (
        grouped.size !== relationships.size ||
        [...relationships.keys()].some((key) => !grouped.has(key)) ||
        [...relationships.values()].some(
          (relationship) =>
            !exploration.filters.meaning_kinds.includes(
              relationship.meaning_kind,
            ) || !exploration.filters.origins.includes(relationship.origin),
        ) ||
        [...paths.values()].some((path) =>
          path.steps.some(
            (step) =>
              !exploration.filters.directions.includes(
                step.traversal_direction,
              ),
          ),
        )
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          "The named expansion membership is outside its normalized filters or disclosed groups.",
        );

      const exactCycleCount =
        exploration.accounting.cycle_paths.state === "exact"
          ? exploration.accounting.cycle_paths.value
          : undefined;
      const representedCycleCount = content.paths.filter((path) =>
        path.steps.some((step) => step.repeated_member),
      ).length;
      if (
        exactCycleCount !== undefined &&
        exactCycleCount !== representedCycleCount
      )
        this.fail(
          "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
          "The named expansion cycle accounting does not match its represented paths.",
        );
    }

    return {
      state: "resolved",
      definition_family: definition.definition_family,
      view: structuredClone(view),
    };
  }
}
