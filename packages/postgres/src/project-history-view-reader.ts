import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type {
  PetraActor,
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryImpactView,
  PetraProjectHistoryImpactViewV12,
  PetraProjectHistoryImpactViewV14,
  PetraProjectDefinition,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectHistoryView,
  ProjectHistoryCausalCommandLink,
  ProjectHistoryCommandRef,
  ProjectHistoryEventRef,
  ProjectHistoryOperationalAdapterGroupV14 as ProjectHistoryOperationalAdapterGroup,
  ProjectHistoryOperationalDefinitionRefV14 as ProjectHistoryOperationalDefinitionRef,
  ProjectHistoryOperationalDependentRefV14 as ProjectHistoryOperationalDependentRef,
  ProjectHistoryOperationalTargetAssessmentV14 as ProjectHistoryOperationalTargetAssessment,
  ProjectHistoryRecentChange,
  ProjectHistoryReceiptRef,
  ProjectHistoryRecovery,
  ProjectHistoryRetainedCollectionFiltersV12,
  ProjectHistoryRegisteredTargetAssessmentV12 as ProjectHistoryRegisteredTargetAssessment,
  ProjectHistoryResolvedTargetRefV12 as ProjectHistoryResolvedTargetRef,
  ProjectHistoryRetentionSnapshot,
  ProjectHistorySemanticDependentRefV12 as ProjectHistorySemanticDependentRef,
  ProjectHistorySemanticImpactAdapterGroupV12 as ProjectHistorySemanticImpactAdapterGroup,
  ProjectHistoryResolvedTargetRecordV14 as ProjectHistoryResolvedTargetRecord,
  ProjectHistoryTargetAssessmentV12 as ProjectHistoryTargetAssessment,
  ProjectHistoryTargetRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  buildPreviewBoundCompensatingReversalCommandPlan,
  ProjectHistoryCompensationPlanUnavailableError,
  ProjectHistoryRetainedContinuationError,
  ProjectHistoryRecoveryPreviewUnavailableError,
  ProjectHistoryViewRequestError,
  type ProjectHistoryRetainedCollectionRequest,
  type ProjectHistoryViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectHistoryViewErrorCode =
  | "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT"
  | "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED";

export class PostgresProjectHistoryViewError extends Error {
  readonly code: PostgresProjectHistoryViewErrorCode;

  constructor(code: PostgresProjectHistoryViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectHistoryViewError";
    this.code = code;
  }
}

interface HistoryRow {
  event_payload: unknown;
  event_record_hash: string;
  command_envelope: unknown;
  command_fingerprint: string;
  lifecycle_receipt_payload: unknown;
  lifecycle_receipt_record_hash: string | null;
  replacement_receipt_payload: unknown;
  replacement_receipt_record_hash: string | null;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface CountRow {
  total_count: string;
}

interface HistoryActorOptionRow {
  actor_id: string;
  actor_kind: PetraActor["actor_kind"];
  actor_payload: unknown;
  actor_record_hash: string;
  matching_event_count: string;
  total_count: string;
}

interface HistoryTargetOptionRow {
  semantic_key: keyof typeof HISTORY_TARGET_PREFIXES;
  object_id: string;
  matching_event_count: string;
  total_count: string;
}

interface CurrentSourceRow {
  project_source_id: string;
  revision: string;
  content_hash: string;
  record_hash: string;
  status: "active" | "excluded";
  has_active_replacement: boolean;
}

interface ReplacementHeadRow {
  project_source_replacement_id: string;
  revision: string;
  content_hash: string;
  record_hash: string;
  state: "active" | "retracted";
}

interface CausalCommandRow {
  command_id: string;
  event_payload: unknown;
  event_record_hash: string | null;
}

interface ImpactCausalCommandRow {
  command_envelope: unknown;
  command_fingerprint: string;
  outcome_kind: "success" | "failure";
  completed_at: Date;
  event_payload: unknown;
  event_record_hash: string | null;
  total_count: string;
}

interface ImpactOutboxRow {
  outbox_payload: unknown;
  outbox_record_hash: string;
  total_count: string;
}

interface ImpactProjectionRow {
  projection_payload: unknown;
  projection_record_hash: string;
  total_count: string;
}

interface ImpactGroundedResponseRow {
  response_payload: unknown;
  response_record_hash: string;
  current_revision: string;
  invalidation_position: string;
  event_type: string;
  change_set_id: string;
  total_count: string;
}

interface SemanticTargetRow {
  payload: unknown;
  content_hash: string | null;
  record_hash: string;
}

interface SemanticDependentRow {
  semantic_key: ProjectHistorySemanticDependentRef["semantic_key"];
  object_id: string;
  revision: string;
  schema_name: ProjectHistorySemanticDependentRef["schema_name"];
  schema_version: string;
  content_hash: string | null;
  record_hash: string;
  payload: unknown;
  posture: ProjectHistorySemanticDependentRef["posture"];
  relation: ProjectHistorySemanticDependentRef["relation"];
  relation_identity: string;
  total_count: string;
}

interface OperationalDependentRow {
  dependent_payload: unknown;
  dependent_record_hash: string;
  work_payload: unknown;
  work_record_hash: string;
  input_payload: unknown;
  input_record_hash: string;
  binding_position: string;
  binding_name: string;
  binding_payload: unknown;
  interaction_run_payload: unknown;
  interaction_run_record_hash: string | null;
  total_count: string;
}

interface OperationalDestinationDefinitionRow {
  definition_payload: unknown;
  definition_record_hash: string | null;
}

interface EventRow {
  event_payload: unknown;
  event_record_hash: string;
}

interface HistoryCursorPayload {
  version: 2;
  project_id: string;
  query_identity_hash: string;
  snapshot_event_position: number;
  snapshot_stream_revision: number;
  snapshot_head_event_id: string;
  snapshot_head_record_hash: string;
  before_stream_revision: number;
}

export interface PostgresProjectHistoryViewReaderOptions {
  readonly cursorSecret?: string;
  readonly recoveryPrincipal?: {
    readonly actor_id: string;
    readonly actor_kind: "human";
  };
}

interface RecoveryChangeSetRow {
  payload: unknown;
  record_hash: string;
  current_state:
    | "submitted"
    | "approved"
    | "rejected"
    | "applied"
    | "conflicted"
    | "reverted";
  applied_approval_id: string | null;
}

interface RecoveryApprovalRow {
  payload: unknown;
  record_hash: string;
}

interface RecoveryOperationRow {
  position: string;
  operation_kind:
    | "promote_claim"
    | "promote_assertion"
    | "retract_claim"
    | "retract_assertion";
  target_id: string;
  base_revision: string;
  operation: unknown;
}

interface RecoveryEvidenceRow {
  evidence_id: string;
  evidence_kind: "claim" | "assertion";
  current_revision: string;
  authority_zone: "quarantine" | "trusted";
  review_state:
    | "unreviewed"
    | "machine_checked"
    | "human_accepted"
    | "human_rejected"
    | "disputed";
  admission_kind: "proposal" | "promotion" | "reversal";
  schema_name: "petra.claim" | "petra.assertion";
  schema_version: "1.0.0";
  record_hash: string;
  payload: unknown;
}

interface RecoveryGrantRow {
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  capability_grant_id: string | null;
  revision: string | null;
  content_hash: string | null;
  record_hash: string | null;
  payload: unknown;
}

interface RecoveryCompensationRow extends RecoveryChangeSetRow {
  change_set_id: string;
  approval_payload: unknown;
  approval_record_hash: string;
  event_payload: unknown;
  event_record_hash: string;
}

interface RecoveryChangeSetAuthority {
  payload: JsonRecord;
  ref: PetraProjectHistoryRecoveryAssessmentView["content"]["recovery_subject"]["promotion_change_set"];
}

type JsonRecord = Record<string, unknown>;
interface DerivedHistoryChange {
  family: ProjectHistoryRecentChange["family"];
  targets: ProjectHistoryTargetRef[];
  observedEffect: ProjectHistoryRecentChange["observed_effect"];
  recovery: ProjectHistoryRecovery;
}

const HISTORY_LIMIT = 10;
const RETAINED_DEFAULT_LIMIT = 50;
const RETAINED_MAX_LIMIT = 100;
const RETAINED_FILTER_OPTION_LIMIT = 100;
const IMPACT_MAX_REFS = 100;
const SEMANTIC_TARGET_LIMIT = 10;
const SEMANTIC_ADAPTER_MAX_REFS = 25;
const OPERATIONAL_ADAPTER_MAX_REFS = 25;
const RETAINED_CURSOR = /^phc2\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/u;
const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;
const ACTOR_ID = /^actor_[0-9A-HJKMNP-TV-Z]{26}$/u;
const TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;
const DEFAULT_CURSOR_SECRET =
  "petra-local-development-history-cursor-secret-v1";
const EVENT_VERSIONS = ["1.0.0", "1.1.0", "1.2.0", "1.3.0"] as const;
const COMMAND_VERSIONS = EVENT_VERSIONS;
const HISTORY_FAMILIES = [
  "change_control",
  "project_source_lifecycle",
  "project_source_replacement",
] as const;
const HISTORY_COMMAND_NAMES = [
  "SubmitChangeSet",
  "RecordApproval",
  "ApplyChangeSet",
  "ExcludeProjectSource",
  "RestoreProjectSource",
  "CreateProjectSourceReplacement",
  "RetractProjectSourceReplacement",
] as const;
const HISTORY_EVENT_TYPES = [
  "change_set.submitted",
  "approval.recorded",
  "change_set.applied",
  "change_set.conflicted",
  "change_set.reverted",
  "change_set.reversal_conflicted",
  "project_source.excluded",
  "project_source.restored",
  "project_source.replacement_created",
  "project_source.replacement_retracted",
] as const;
const HISTORY_OUTCOMES = ["completed", "conflicted"] as const;
const HISTORY_EFFECTS = [
  "change_proposed",
  "approval_recorded",
  "authority_change_applied",
  "authority_change_conflicted",
  "authority_change_reverted",
  "reversal_conflicted",
  "project_source_excluded",
  "project_source_restored",
  "source_replacement_created",
  "source_replacement_retracted",
] as const;
const HISTORY_TARGET_PREFIXES = {
  "petra.change-set": "change_set_",
  "petra.approval": "approval_",
  "scientific.claim": "claim_",
  "scientific.assertion": "assertion_",
  "petra.project-source": "project_source_",
  "petra.project-source-replacement": "project_source_replacement_",
  "petra.project-source-replacement-retraction": "project_source_retraction_",
} as const;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const compensationPreviewBindingHash = (
  projectId: string,
  eventId: string,
  content: PetraProjectHistoryCompensationPreviewView["content"],
): string =>
  canonicalHash({
    project_id: projectId,
    event_id: eventId,
    assessment_content_hash: content.assessment_ref.content_hash,
    assessment_authority: content.assessment_ref.authority,
    promotion_change_set: content.compensates_change_set,
    targets: content.operation_preview,
    command_grants: content.command_sequence.map(
      ({ command_name, grant_ref }) => ({ command_name, grant_ref }),
    ),
    valid_through: content.freshness.valid_through,
  });

const record = (value: unknown, label: string): JsonRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PostgresProjectHistoryViewError(
      "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
      `${label} is not an object.`,
    );
  }
  return value as JsonRecord;
};

const member = <Value>(
  value: JsonRecord,
  key: string,
  label: string,
): Value => {
  const selected = value[key];
  if (selected === undefined || selected === null) {
    throw new PostgresProjectHistoryViewError(
      "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
      `${label}.${key} is missing.`,
    );
  }
  return selected as Value;
};

const stringMember = (
  value: JsonRecord,
  key: string,
  label: string,
): string => {
  const selected = member<unknown>(value, key, label);
  if (typeof selected !== "string") {
    throw new PostgresProjectHistoryViewError(
      "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
      `${label}.${key} is not a string.`,
    );
  }
  return selected;
};

const numberMember = (
  value: JsonRecord,
  key: string,
  label: string,
): number => {
  const selected = member<unknown>(value, key, label);
  if (!Number.isSafeInteger(selected) || Number(selected) < 1) {
    throw new PostgresProjectHistoryViewError(
      "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
      `${label}.${key} is not a positive safe integer.`,
    );
  }
  return Number(selected);
};

const objectMember = (
  value: JsonRecord,
  key: string,
  label: string,
): JsonRecord => record(member(value, key, label), `${label}.${key}`);

const objectArray = (
  value: JsonRecord,
  key: string,
  label: string,
): JsonRecord[] => {
  const selected = member<unknown>(value, key, label);
  if (!Array.isArray(selected)) {
    throw new PostgresProjectHistoryViewError(
      "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
      `${label}.${key} is not an array.`,
    );
  }
  return selected.map((item, index) =>
    record(item, `${label}.${key}[${index}]`),
  );
};

const exactTarget = (
  role: ProjectHistoryTargetRef["role"],
  semanticKey: string,
  value: JsonRecord,
  idKey: string,
  label: string,
  authorityState?: string,
): ProjectHistoryTargetRef => ({
  role,
  semantic_key: semanticKey,
  object_id: stringMember(value, idKey, label),
  ...(value.revision === undefined
    ? {}
    : { revision: numberMember(value, "revision", label) }),
  ...(typeof value.content_hash === "string"
    ? { content_hash: value.content_hash }
    : {}),
  ...(typeof value.record_hash === "string"
    ? { record_hash: value.record_hash }
    : {}),
  ...(authorityState === undefined ? {} : { authority_state: authorityState }),
});

const ineligible = (reason: string): ProjectHistoryRecovery => ({
  eligibility: "ineligible",
  reason,
});

const sameExactRef = (
  current: CurrentSourceRow,
  expected: JsonRecord,
): boolean =>
  current.project_source_id === expected.project_source_id &&
  Number(current.revision) === expected.revision &&
  current.content_hash === expected.content_hash &&
  current.record_hash === expected.record_hash &&
  current.status === expected.status;

export class PostgresProjectHistoryViewReader implements ProjectHistoryViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #cursorSecret: Buffer;
  readonly #recoveryPrincipal:
    { readonly actor_id: string; readonly actor_kind: "human" } | undefined;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    options: PostgresProjectHistoryViewReaderOptions = {},
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    const cursorSecret = options.cursorSecret ?? DEFAULT_CURSOR_SECRET;
    if (cursorSecret.trim().length < 16) {
      throw new Error(
        "Project History cursor secret must contain at least sixteen characters.",
      );
    }
    this.#cursorSecret = createHash("sha256").update(cursorSecret).digest();
    if (
      options.recoveryPrincipal !== undefined &&
      !ACTOR_ID.test(options.recoveryPrincipal.actor_id)
    ) {
      throw new Error(
        "Project History recovery principal must use a canonical Actor identity.",
      );
    }
    this.#recoveryPrincipal =
      options.recoveryPrincipal === undefined
        ? undefined
        : { ...options.recoveryPrincipal };
  }

  async getRecentProjectHistoryView(
    projectId: string,
  ): Promise<PetraProjectHistoryView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const exists = await client.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM petra.projects WHERE project_id = $1) AS exists",
        [projectId],
      );
      if (exists.rows[0]?.exists !== true) return undefined;

      const result = await client.query<HistoryRow>(
        `SELECT event.payload AS event_payload,
                event.record_hash AS event_record_hash,
                execution.envelope AS command_envelope,
                execution.command_fingerprint,
                lifecycle.payload AS lifecycle_receipt_payload,
                lifecycle.record_hash AS lifecycle_receipt_record_hash,
                replacement.payload AS replacement_receipt_payload,
                replacement.record_hash AS replacement_receipt_record_hash
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
           LEFT JOIN petra.project_source_lifecycle_receipts AS lifecycle
             ON lifecycle.command_id = event.command_id
           LEFT JOIN petra.project_source_replacement_receipts AS replacement
             ON replacement.command_id = event.command_id
          WHERE event.project_id = $1
          ORDER BY event.stream_revision DESC
          LIMIT $2`,
        [projectId, HISTORY_LIMIT + 1],
      );
      const changes: ProjectHistoryRecentChange[] = [];
      for (const row of result.rows.slice(0, HISTORY_LIMIT)) {
        changes.push(await this.#change(client, row));
      }
      const authority = await this.#authority(client, projectId);
      const content = {
        view_kind: "recent_changes",
        order: "newest_first",
        quick_window_limit: HISTORY_LIMIT,
        changes,
        has_older: result.rows.length > HISTORY_LIMIT,
        authority,
        graph_navigation_history: "client_local_separate",
      };
      const view = {
        schema_name: "petra.project-history-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("project-history-view", "1.0.0", view);
      return structuredClone(view as unknown as PetraProjectHistoryView);
    });
  }

  async listRetainedProjectHistoryView(
    projectId: string,
    request: ProjectHistoryRetainedCollectionRequest = {},
  ): Promise<PetraProjectHistoryRetainedViewV12 | undefined> {
    const query = this.#retainedQuery(request);
    const queryIdentityHash = canonicalHash({
      limit: query.limit,
      filters: query.filters,
    });
    const cursor =
      query.cursor === undefined
        ? undefined
        : this.#decodeCursor(query.cursor, projectId, queryIdentityHash);
    return this.#readTransaction(async (client, readAt) => {
      const exists = await client.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM petra.projects WHERE project_id = $1) AS exists",
        [projectId],
      );
      if (exists.rows[0]?.exists !== true) return undefined;

      const currentAuthority = await this.#authority(client, projectId);
      const retentionSnapshot =
        cursor === undefined
          ? await this.#retentionSnapshot(client, projectId, currentAuthority)
          : await this.#resolveCursorSnapshot(
              client,
              projectId,
              cursor,
              currentAuthority,
            );
      const beforeStreamRevision =
        cursor?.before_stream_revision ??
        retentionSnapshot.through_stream_revision + 1;
      const pageParameters: (number | string | null)[] = [
        projectId,
        retentionSnapshot.through_stream_revision,
        retentionSnapshot.through_event_position,
        beforeStreamRevision,
        query.limit + 1,
      ];
      const pageFilterSql = this.#retainedFilterSql(
        query.filters,
        pageParameters,
      );
      const result = await client.query<HistoryRow>(
        `SELECT event.payload AS event_payload,
                event.record_hash AS event_record_hash,
                execution.envelope AS command_envelope,
                execution.command_fingerprint,
                lifecycle.payload AS lifecycle_receipt_payload,
                lifecycle.record_hash AS lifecycle_receipt_record_hash,
                replacement.payload AS replacement_receipt_payload,
                replacement.record_hash AS replacement_receipt_record_hash
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
           LEFT JOIN petra.project_source_lifecycle_receipts AS lifecycle
             ON lifecycle.command_id = event.command_id
           LEFT JOIN petra.project_source_replacement_receipts AS replacement
             ON replacement.command_id = event.command_id
          WHERE event.project_id = $1
            AND event.stream_revision <= $2
            AND event.event_position <= $3
            AND event.stream_revision < $4
            ${pageFilterSql}
          ORDER BY event.stream_revision DESC
          LIMIT $5`,
        pageParameters,
      );
      const hasMore = result.rows.length > query.limit;
      const selectedRows = result.rows.slice(0, query.limit);
      const changes: ProjectHistoryRecentChange[] = [];
      for (const row of selectedRows) {
        changes.push(await this.#change(client, row));
      }
      const countParameters: (number | string | null)[] = [
        projectId,
        retentionSnapshot.through_stream_revision,
        retentionSnapshot.through_event_position,
      ];
      const countFilterSql = this.#retainedFilterSql(
        query.filters,
        countParameters,
      );
      const count = await client.query<CountRow>(
        `SELECT COUNT(*) AS total_count
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
          WHERE event.project_id = $1
            AND event.stream_revision <= $2
            AND event.event_position <= $3
            ${countFilterSql}`,
        countParameters,
      );
      const snapshotTotalCount = Number(count.rows[0]?.total_count);
      if (!Number.isSafeInteger(snapshotTotalCount) || snapshotTotalCount < 0) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The retained Project event count is outside Petra's safe range.",
        );
      }
      const lastChange = changes.at(-1);
      if (hasMore && lastChange === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A retained History continuation has no final event boundary.",
        );
      }
      let nextCursor: string | undefined;
      if (hasMore && lastChange !== undefined) {
        if (!("head_event_ref" in retentionSnapshot)) {
          throw new PostgresProjectHistoryViewError(
            "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
            "A retained History continuation has no snapshot head event.",
          );
        }
        nextCursor = this.#encodeCursor({
          version: 2,
          project_id: projectId,
          query_identity_hash: queryIdentityHash,
          snapshot_event_position: retentionSnapshot.through_event_position,
          snapshot_stream_revision: retentionSnapshot.through_stream_revision,
          snapshot_head_event_id: retentionSnapshot.head_event_ref.event_id,
          snapshot_head_record_hash:
            retentionSnapshot.head_event_ref.record_hash,
          before_stream_revision: lastChange.event_ref.stream_revision,
        });
      }
      const filterOptions = await this.#retainedFilterOptions(
        client,
        projectId,
        retentionSnapshot,
        query.filters,
      );
      const page: PetraProjectHistoryRetainedViewV12["content"]["page"] =
        hasMore
          ? {
              returned_count: changes.length,
              snapshot_total_count: snapshotTotalCount,
              has_more: true,
              next_cursor: nextCursor as string,
            }
          : {
              returned_count: changes.length,
              snapshot_total_count: snapshotTotalCount,
              has_more: false,
            };
      const content: PetraProjectHistoryRetainedViewV12["content"] = {
        view_kind: "retained_events",
        order_kind: "project_stream_newest_first",
        query,
        cursor_binding: "project_snapshot_and_complete_query",
        changes,
        page,
        filter_options: filterOptions,
        retention_snapshot: retentionSnapshot,
        current_authority: currentAuthority,
        recovery_authority: "current_at_page_read",
        omissions: [
          "origin_filter_not_supported",
          "dependency_impact_not_composed",
          "generic_reversal_assessment_not_composed",
          "historical_project_definition_not_interpreted",
          "cross_family_total_order_not_asserted",
        ],
        graph_navigation_history: "client_local_separate",
      };
      const view = {
        schema_name: "petra.project-history-retained-view",
        schema_version: "1.2.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-history-retained-view",
        "1.2.0",
        view,
      );
      return structuredClone(
        view as unknown as PetraProjectHistoryRetainedViewV12,
      );
    });
  }

  #retainedQuery(
    request: ProjectHistoryRetainedCollectionRequest,
  ): PetraProjectHistoryRetainedViewV12["content"]["query"] {
    const limit = request.limit ?? RETAINED_DEFAULT_LIMIT;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > RETAINED_MAX_LIMIT
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History limit must be an integer from 1 through 100.",
      );
    }
    if (
      request.cursor !== undefined &&
      (request.cursor.length > 1024 || !RETAINED_CURSOR.test(request.cursor))
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor is invalid.",
      );
    }
    const filters = this.#retainedFilters(request.filters ?? {});
    return {
      limit,
      filters,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
    };
  }

  #retainedFilters(
    supplied: ProjectHistoryRetainedCollectionFiltersV12,
  ): ProjectHistoryRetainedCollectionFiltersV12 {
    if (
      typeof supplied !== "object" ||
      supplied === null ||
      Array.isArray(supplied)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History filters must be an object.",
      );
    }
    const allowed = new Set([
      "family",
      "command_name",
      "event_type",
      "actor_id",
      "outcome",
      "effect",
      "target",
      "recorded_at",
    ]);
    if (Object.keys(supplied).some((key) => !allowed.has(key))) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History contains an unregistered filter.",
      );
    }
    const includes = <Value extends string>(
      values: readonly Value[],
      candidate: unknown,
    ): candidate is Value =>
      typeof candidate === "string" && values.includes(candidate as Value);
    if (
      supplied.family !== undefined &&
      !includes(HISTORY_FAMILIES, supplied.family)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History family filter is invalid.",
      );
    }
    if (
      supplied.command_name !== undefined &&
      !includes(HISTORY_COMMAND_NAMES, supplied.command_name)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History command filter is invalid.",
      );
    }
    if (
      supplied.event_type !== undefined &&
      !includes(HISTORY_EVENT_TYPES, supplied.event_type)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History event filter is invalid.",
      );
    }
    if (supplied.actor_id !== undefined && !ACTOR_ID.test(supplied.actor_id)) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History Actor filter is invalid.",
      );
    }
    if (
      supplied.outcome !== undefined &&
      !includes(HISTORY_OUTCOMES, supplied.outcome)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History outcome filter is invalid.",
      );
    }
    if (
      supplied.effect !== undefined &&
      !includes(HISTORY_EFFECTS, supplied.effect)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History authority-effect filter is invalid.",
      );
    }
    let target: ProjectHistoryRetainedCollectionFiltersV12["target"];
    if (supplied.target !== undefined) {
      if (
        typeof supplied.target !== "object" ||
        supplied.target === null ||
        Array.isArray(supplied.target) ||
        Object.keys(supplied.target).length !== 2 ||
        !Object.hasOwn(supplied.target, "semantic_key") ||
        !Object.hasOwn(supplied.target, "object_id")
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History target filter requires one exact semantic key and object identity.",
        );
      }
      const prefix = HISTORY_TARGET_PREFIXES[supplied.target.semantic_key];
      if (
        prefix === undefined ||
        supplied.target.object_id.length !== prefix.length + 26 ||
        !supplied.target.object_id.startsWith(prefix) ||
        !/^[0-9A-HJKMNP-TV-Z]{26}$/u.test(
          supplied.target.object_id.slice(prefix.length),
        )
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History target filter identity does not match its registered semantic key.",
        );
      }
      target = {
        semantic_key: supplied.target.semantic_key,
        object_id: supplied.target.object_id,
      };
    }
    let recordedAt: ProjectHistoryRetainedCollectionFiltersV12["recorded_at"];
    if (supplied.recorded_at !== undefined) {
      if (
        typeof supplied.recorded_at !== "object" ||
        supplied.recorded_at === null ||
        Array.isArray(supplied.recorded_at)
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History recorded-time filter must be an object.",
        );
      }
      const keys = Object.keys(supplied.recorded_at);
      if (
        keys.length < 1 ||
        keys.length > 2 ||
        keys.some(
          (key) => key !== "from_inclusive" && key !== "through_inclusive",
        )
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History recorded-time filter requires a registered inclusive bound.",
        );
      }
      const validTimestamp = (value: unknown): value is string =>
        typeof value === "string" &&
        TIMESTAMP.test(value) &&
        Number.isFinite(Date.parse(value));
      if (
        (supplied.recorded_at.from_inclusive !== undefined &&
          !validTimestamp(supplied.recorded_at.from_inclusive)) ||
        (supplied.recorded_at.through_inclusive !== undefined &&
          !validTimestamp(supplied.recorded_at.through_inclusive))
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History recorded-time filter is invalid.",
        );
      }
      if (
        supplied.recorded_at.from_inclusive !== undefined &&
        supplied.recorded_at.through_inclusive !== undefined &&
        Date.parse(supplied.recorded_at.from_inclusive) >
          Date.parse(supplied.recorded_at.through_inclusive)
      ) {
        throw new ProjectHistoryViewRequestError(
          "Retained Project History recorded-time bounds are reversed.",
        );
      }
      recordedAt = {
        ...(supplied.recorded_at.from_inclusive === undefined
          ? {}
          : { from_inclusive: supplied.recorded_at.from_inclusive }),
        ...(supplied.recorded_at.through_inclusive === undefined
          ? {}
          : { through_inclusive: supplied.recorded_at.through_inclusive }),
      };
    }
    return {
      ...(supplied.family === undefined ? {} : { family: supplied.family }),
      ...(supplied.command_name === undefined
        ? {}
        : { command_name: supplied.command_name }),
      ...(supplied.event_type === undefined
        ? {}
        : { event_type: supplied.event_type }),
      ...(supplied.actor_id === undefined
        ? {}
        : { actor_id: supplied.actor_id }),
      ...(supplied.outcome === undefined ? {} : { outcome: supplied.outcome }),
      ...(supplied.effect === undefined ? {} : { effect: supplied.effect }),
      ...(target === undefined ? {} : { target }),
      ...(recordedAt === undefined ? {} : { recorded_at: recordedAt }),
    };
  }

  #retainedFilterSql(
    filters: ProjectHistoryRetainedCollectionFiltersV12,
    parameters: (number | string | null)[],
    excludedDimension?: "actor_id" | "target",
  ): string {
    const clauses: string[] = [];
    const parameter = (value: string): string => {
      parameters.push(value);
      return `$${parameters.length}`;
    };
    if (filters.family !== undefined) {
      const value = parameter(filters.family);
      clauses.push(`CASE event.payload #>> '{event,event_type}'
          WHEN 'change_set.submitted' THEN 'change_control'
          WHEN 'approval.recorded' THEN 'change_control'
          WHEN 'change_set.applied' THEN 'change_control'
          WHEN 'change_set.conflicted' THEN 'change_control'
          WHEN 'change_set.reverted' THEN 'change_control'
          WHEN 'change_set.reversal_conflicted' THEN 'change_control'
          WHEN 'project_source.excluded' THEN 'project_source_lifecycle'
          WHEN 'project_source.restored' THEN 'project_source_lifecycle'
          WHEN 'project_source.replacement_created' THEN 'project_source_replacement'
          WHEN 'project_source.replacement_retracted' THEN 'project_source_replacement'
        END = ${value}::text`);
    }
    if (filters.command_name !== undefined) {
      const value = parameter(filters.command_name);
      clauses.push(
        `execution.envelope #>> '{command,command_name}' = ${value}::text`,
      );
    }
    if (filters.event_type !== undefined) {
      const value = parameter(filters.event_type);
      clauses.push(`event.payload #>> '{event,event_type}' = ${value}::text`);
    }
    if (filters.actor_id !== undefined && excludedDimension !== "actor_id") {
      const value = parameter(filters.actor_id);
      clauses.push(`event.payload #>> '{actor,actor_id}' = ${value}::text`);
    }
    if (filters.outcome !== undefined) {
      const value = parameter(filters.outcome);
      clauses.push(`CASE event.payload #>> '{event,event_type}'
          WHEN 'change_set.conflicted' THEN 'conflicted'
          WHEN 'change_set.reversal_conflicted' THEN 'conflicted'
          ELSE 'completed'
        END = ${value}::text`);
    }
    if (filters.effect !== undefined) {
      const value = parameter(filters.effect);
      clauses.push(`CASE event.payload #>> '{event,event_type}'
          WHEN 'change_set.submitted' THEN 'change_proposed'
          WHEN 'approval.recorded' THEN 'approval_recorded'
          WHEN 'change_set.applied' THEN 'authority_change_applied'
          WHEN 'change_set.conflicted' THEN 'authority_change_conflicted'
          WHEN 'change_set.reverted' THEN 'authority_change_reverted'
          WHEN 'change_set.reversal_conflicted' THEN 'reversal_conflicted'
          WHEN 'project_source.excluded' THEN 'project_source_excluded'
          WHEN 'project_source.restored' THEN 'project_source_restored'
          WHEN 'project_source.replacement_created' THEN 'source_replacement_created'
          WHEN 'project_source.replacement_retracted' THEN 'source_replacement_retracted'
        END = ${value}::text`);
    }
    if (filters.target !== undefined && excludedDimension !== "target") {
      const semanticKey = parameter(filters.target.semantic_key);
      const objectId = parameter(filters.target.object_id);
      clauses.push(`CASE ${semanticKey}::text
          WHEN 'petra.change-set' THEN
            CASE event.payload #>> '{event,event_type}'
              WHEN 'change_set.submitted' THEN event.payload #>> '{event,payload,change_set,change_set_id}'
              WHEN 'approval.recorded' THEN event.payload #>> '{event,payload,approval,subject,change_set_id}'
              WHEN 'change_set.applied' THEN event.payload #>> '{event,payload,change_set_id}'
              WHEN 'change_set.conflicted' THEN event.payload #>> '{event,payload,change_set_id}'
              WHEN 'change_set.reverted' THEN event.payload #>> '{event,payload,change_set_id}'
              WHEN 'change_set.reversal_conflicted' THEN event.payload #>> '{event,payload,change_set_id}'
              ELSE NULL
            END = ${objectId}::text
          WHEN 'petra.approval' THEN
            event.payload #>> '{event,event_type}' = 'approval.recorded'
            AND event.payload #>> '{event,payload,approval,approval_id}' = ${objectId}::text
          WHEN 'scientific.claim' THEN
            event.payload #>> '{event,payload,claim,claim_id}' = ${objectId}::text
            OR COALESCE(event.payload #> '{event,payload,targets}', '[]'::jsonb)
                 @> jsonb_build_array(jsonb_build_object('target_kind', 'claim', 'target_id', ${objectId}::text))
          WHEN 'scientific.assertion' THEN
            event.payload #>> '{event,payload,assertion,assertion_id}' = ${objectId}::text
            OR COALESCE(event.payload #> '{event,payload,targets}', '[]'::jsonb)
                 @> jsonb_build_array(jsonb_build_object('target_kind', 'assertion', 'target_id', ${objectId}::text))
          WHEN 'petra.project-source' THEN
            event.payload #>> '{event,payload,project_source,project_source_id}' = ${objectId}::text
            OR event.payload #>> '{event,payload,content,replaced_source_ref,project_source_id}' = ${objectId}::text
            OR event.payload #>> '{event,payload,content,replacement_source_ref,project_source_id}' = ${objectId}::text
            OR event.payload #>> '{event,payload,replacement,content,replaced_source_ref,project_source_id}' = ${objectId}::text
            OR event.payload #>> '{event,payload,replacement,content,replacement_source_ref,project_source_id}' = ${objectId}::text
          WHEN 'petra.project-source-replacement' THEN
            event.payload #>> '{event,payload,project_source_replacement_id}' = ${objectId}::text
            OR event.payload #>> '{event,payload,replacement,project_source_replacement_id}' = ${objectId}::text
          WHEN 'petra.project-source-replacement-retraction' THEN
            event.payload #>> '{event,payload,retraction,project_source_replacement_retraction_id}' = ${objectId}::text
          ELSE FALSE
        END`);
    }
    if (filters.recorded_at?.from_inclusive !== undefined) {
      const value = parameter(filters.recorded_at.from_inclusive);
      clauses.push(
        `(event.payload ->> 'recorded_at')::timestamptz >= ${value}::timestamptz`,
      );
    }
    if (filters.recorded_at?.through_inclusive !== undefined) {
      const value = parameter(filters.recorded_at.through_inclusive);
      clauses.push(
        `(event.payload ->> 'recorded_at')::timestamptz <= ${value}::timestamptz`,
      );
    }
    return clauses.length === 0
      ? ""
      : clauses.map((clause) => `AND (${clause})`).join("\n            ");
  }

  async #retainedFilterOptions(
    client: PoolClient,
    projectId: string,
    retentionSnapshot: PetraProjectHistoryRetainedViewV12["content"]["retention_snapshot"],
    filters: ProjectHistoryRetainedCollectionFiltersV12,
  ): Promise<PetraProjectHistoryRetainedViewV12["content"]["filter_options"]> {
    const actorParameters: (number | string | null)[] = [
      projectId,
      retentionSnapshot.through_stream_revision,
      retentionSnapshot.through_event_position,
    ];
    const actorFilterSql = this.#retainedFilterSql(
      filters,
      actorParameters,
      "actor_id",
    );
    actorParameters.push(filters.actor_id ?? null);
    const selectedActorParameter = `$${actorParameters.length}`;
    actorParameters.push(RETAINED_FILTER_OPTION_LIMIT);
    const actorLimitParameter = `$${actorParameters.length}`;
    const actorResult = await client.query<HistoryActorOptionRow>(
      `SELECT event.actor_id,
              event.actor_kind,
              actor.payload AS actor_payload,
              actor.record_hash AS actor_record_hash,
              COUNT(*)::text AS matching_event_count,
              COUNT(*) OVER ()::text AS total_count
         FROM petra.domain_events AS event
         JOIN petra.command_executions AS execution
           ON execution.command_id = event.command_id
          AND execution.project_id = event.project_id
         JOIN petra.actors AS actor
           ON actor.actor_id = event.actor_id
          AND actor.actor_kind = event.actor_kind
        WHERE event.project_id = $1
          AND event.stream_revision <= $2
          AND event.event_position <= $3
          ${actorFilterSql}
        GROUP BY event.actor_id, event.actor_kind, actor.payload,
                 actor.record_hash
        ORDER BY (event.actor_id = ${selectedActorParameter}::text) DESC,
                 COUNT(*) DESC, event.actor_id
        LIMIT ${actorLimitParameter}::integer`,
      actorParameters,
    );

    const targetParameters: (number | string | null)[] = [
      projectId,
      retentionSnapshot.through_stream_revision,
      retentionSnapshot.through_event_position,
    ];
    const targetFilterSql = this.#retainedFilterSql(
      filters,
      targetParameters,
      "target",
    );
    targetParameters.push(filters.target?.semantic_key ?? null);
    const selectedTargetKeyParameter = `$${targetParameters.length}`;
    targetParameters.push(filters.target?.object_id ?? null);
    const selectedTargetIdParameter = `$${targetParameters.length}`;
    targetParameters.push(RETAINED_FILTER_OPTION_LIMIT);
    const targetLimitParameter = `$${targetParameters.length}`;
    const targetResult = await client.query<HistoryTargetOptionRow>(
      `WITH matched_events AS (
         SELECT event.event_id, event.event_type, event.payload
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
          WHERE event.project_id = $1
            AND event.stream_revision <= $2
            AND event.event_position <= $3
            ${targetFilterSql}
       ), target_occurrences AS (
         SELECT event_id,
                'petra.change-set'::text AS semantic_key,
                CASE event_type
                  WHEN 'change_set.submitted' THEN
                    payload #>> '{event,payload,change_set,change_set_id}'
                  WHEN 'approval.recorded' THEN
                    payload #>> '{event,payload,approval,subject,change_set_id}'
                  ELSE payload #>> '{event,payload,change_set_id}'
                END AS object_id
           FROM matched_events
          WHERE event_type IN (
            'change_set.submitted', 'approval.recorded',
            'change_set.applied', 'change_set.conflicted',
            'change_set.reverted', 'change_set.reversal_conflicted'
          )
         UNION ALL
         SELECT event_id, 'petra.approval'::text,
                payload #>> '{event,payload,approval,approval_id}'
           FROM matched_events
          WHERE event_type = 'approval.recorded'
         UNION ALL
         SELECT event_id, 'scientific.claim'::text,
                payload #>> '{event,payload,claim,claim_id}'
           FROM matched_events
          WHERE event_type IN ('change_set.applied', 'change_set.reverted')
         UNION ALL
         SELECT event_id, 'scientific.assertion'::text,
                payload #>> '{event,payload,assertion,assertion_id}'
           FROM matched_events
          WHERE event_type IN ('change_set.applied', 'change_set.reverted')
         UNION ALL
         SELECT event_id,
                ('scientific.' || (conflict_target.value ->> 'target_kind'))::text,
                conflict_target.value ->> 'target_id'
           FROM matched_events
           CROSS JOIN LATERAL jsonb_array_elements(
             COALESCE(payload #> '{event,payload,targets}', '[]'::jsonb)
           ) AS conflict_target(value)
          WHERE event_type IN (
            'change_set.conflicted', 'change_set.reversal_conflicted'
          )
         UNION ALL
         SELECT event_id, 'petra.project-source'::text,
                payload #>> '{event,payload,project_source,project_source_id}'
           FROM matched_events
          WHERE event_type IN (
            'project_source.excluded', 'project_source.restored'
          )
         UNION ALL
         SELECT event_id, 'petra.project-source-replacement'::text,
                CASE event_type
                  WHEN 'project_source.replacement_created' THEN
                    payload #>> '{event,payload,project_source_replacement_id}'
                  ELSE
                    payload #>> '{event,payload,replacement,project_source_replacement_id}'
                END
           FROM matched_events
          WHERE event_type IN (
            'project_source.replacement_created',
            'project_source.replacement_retracted'
          )
         UNION ALL
         SELECT event_id, 'petra.project-source'::text, source.object_id
           FROM matched_events
           CROSS JOIN LATERAL (
             VALUES
               (CASE event_type
                  WHEN 'project_source.replacement_created' THEN
                    payload #>> '{event,payload,content,replaced_source_ref,project_source_id}'
                  ELSE
                    payload #>> '{event,payload,replacement,content,replaced_source_ref,project_source_id}'
                END),
               (CASE event_type
                  WHEN 'project_source.replacement_created' THEN
                    payload #>> '{event,payload,content,replacement_source_ref,project_source_id}'
                  ELSE
                    payload #>> '{event,payload,replacement,content,replacement_source_ref,project_source_id}'
                END)
           ) AS source(object_id)
          WHERE event_type IN (
            'project_source.replacement_created',
            'project_source.replacement_retracted'
          )
         UNION ALL
         SELECT event_id,
                'petra.project-source-replacement-retraction'::text,
                payload #>> '{event,payload,retraction,project_source_replacement_retraction_id}'
           FROM matched_events
          WHERE event_type = 'project_source.replacement_retracted'
       ), distinct_target_events AS (
         SELECT DISTINCT event_id, semantic_key, object_id
           FROM target_occurrences
          WHERE object_id IS NOT NULL
       ), grouped_targets AS (
         SELECT semantic_key, object_id,
                COUNT(*)::bigint AS matching_event_count
           FROM distinct_target_events
          GROUP BY semantic_key, object_id
       )
       SELECT semantic_key, object_id,
              matching_event_count::text,
              COUNT(*) OVER ()::text AS total_count
         FROM grouped_targets
        ORDER BY (
                   semantic_key = ${selectedTargetKeyParameter}::text
                   AND object_id = ${selectedTargetIdParameter}::text
                 ) DESC,
                 matching_event_count DESC, semantic_key, object_id
        LIMIT ${targetLimitParameter}::integer`,
      targetParameters,
    );

    const safeCount = (value: string | undefined, label: string): number => {
      const count = Number(value ?? "0");
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          `${label} is outside Petra's safe range.`,
        );
      }
      return count;
    };
    const actorTotalCount = safeCount(
      actorResult.rows[0]?.total_count,
      "The retained History Actor option count",
    );
    const actorOptions = actorResult.rows.map((row) => {
      this.#contracts.assertValid("actor", "1.0.0", row.actor_payload);
      const actor = row.actor_payload as PetraActor;
      if (
        actor.actor_id !== row.actor_id ||
        actor.actor_kind !== row.actor_kind ||
        canonicalHash(actor) !== row.actor_record_hash ||
        row.total_count !== actorResult.rows[0]?.total_count
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A retained History Actor option does not reproduce its immutable Actor authority.",
        );
      }
      return {
        actor_ref: {
          actor_id: actor.actor_id,
          actor_kind: actor.actor_kind,
        },
        display_descriptor: {
          state: "available" as const,
          display_name: actor.display_name,
          authority_ref: {
            schema_name: "petra.actor" as const,
            schema_version: "1.0.0" as const,
            actor_id: actor.actor_id,
            record_hash: row.actor_record_hash,
          },
        },
        matching_event_count: safeCount(
          row.matching_event_count,
          "A retained History Actor option event count",
        ),
      };
    });
    const targetTotalCount = safeCount(
      targetResult.rows[0]?.total_count,
      "The retained History target option count",
    );
    const targetOptions = targetResult.rows.map((row) => {
      const prefix = HISTORY_TARGET_PREFIXES[row.semantic_key];
      if (
        prefix === undefined ||
        row.object_id.length !== prefix.length + 26 ||
        !row.object_id.startsWith(prefix) ||
        !/^[0-9A-HJKMNP-TV-Z]{26}$/u.test(row.object_id.slice(prefix.length)) ||
        row.total_count !== targetResult.rows[0]?.total_count
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A retained History target option is not a registered exact target identity.",
        );
      }
      return {
        target_ref: {
          semantic_key: row.semantic_key,
          object_id: row.object_id,
        },
        display_descriptor: {
          state: "exact_identity_only" as const,
          fallback: "semantic_key_and_object_id" as const,
          reason_code:
            "revision_neutral_target_title_authority_not_registered" as const,
          reason:
            "No authorized revision-neutral title is registered for this exact History target identity." as const,
        },
        matching_event_count: safeCount(
          row.matching_event_count,
          "A retained History target option event count",
        ),
      };
    });
    if (
      actorTotalCount < actorOptions.length ||
      targetTotalCount < targetOptions.length
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A retained History filter option total is smaller than its returned catalogue.",
      );
    }

    return {
      authorization_scope: "authenticated_project",
      snapshot_and_query_binding:
        "retention_snapshot_and_complete_normalized_query",
      dimension_semantics: "replace_same_dimension_preserve_other_filters",
      count_basis: "matching_authorized_events_after_replacing_same_dimension",
      actor_catalogue: {
        option_limit: RETAINED_FILTER_OPTION_LIMIT,
        order_kind:
          "active_option_first_then_matching_event_count_desc_then_actor_id",
        returned_count: actorOptions.length,
        total_count: actorTotalCount,
        coverage:
          actorTotalCount > actorOptions.length ? "truncated" : "complete",
        continuation: "not_composed",
        options: actorOptions,
      },
      target_catalogue: {
        option_limit: RETAINED_FILTER_OPTION_LIMIT,
        order_kind:
          "active_option_first_then_matching_event_count_desc_then_target_identity",
        returned_count: targetOptions.length,
        total_count: targetTotalCount,
        coverage:
          targetTotalCount > targetOptions.length ? "truncated" : "complete",
        continuation: "not_composed",
        options: targetOptions,
      },
    };
  }

  #encodeCursor(payload: HistoryCursorPayload): string {
    const encodedPayload = Buffer.from(canonicalize(payload)).toString(
      "base64url",
    );
    const signature = createHmac("sha256", this.#cursorSecret)
      .update(encodedPayload)
      .digest("base64url");
    return `phc2.${encodedPayload}.${signature}`;
  }

  #decodeCursor(
    cursor: string,
    projectId: string,
    queryIdentityHash: string,
  ): HistoryCursorPayload {
    const match = RETAINED_CURSOR.exec(cursor);
    const encodedPayload = match?.[1];
    const encodedSignature = match?.[2];
    if (encodedPayload === undefined || encodedSignature === undefined) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor is invalid.",
      );
    }
    const expectedSignature = createHmac("sha256", this.#cursorSecret)
      .update(encodedPayload)
      .digest();
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor integrity check failed.",
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as unknown;
    } catch {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor payload is invalid.",
      );
    }
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor payload is invalid.",
      );
    }
    const value = decoded as Record<string, unknown>;
    const keys = Object.keys(value).sort();
    const expectedKeys = [
      "before_stream_revision",
      "project_id",
      "query_identity_hash",
      "snapshot_event_position",
      "snapshot_head_event_id",
      "snapshot_head_record_hash",
      "snapshot_stream_revision",
      "version",
    ];
    const isPositiveSafeInteger = (candidate: unknown): candidate is number =>
      Number.isSafeInteger(candidate) && Number(candidate) >= 1;
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index]) ||
      value.version !== 2 ||
      typeof value.project_id !== "string" ||
      !PROJECT_ID.test(value.project_id) ||
      typeof value.query_identity_hash !== "string" ||
      !CONTENT_HASH.test(value.query_identity_hash) ||
      !isPositiveSafeInteger(value.snapshot_event_position) ||
      !isPositiveSafeInteger(value.snapshot_stream_revision) ||
      typeof value.snapshot_head_event_id !== "string" ||
      !EVENT_ID.test(value.snapshot_head_event_id) ||
      typeof value.snapshot_head_record_hash !== "string" ||
      !CONTENT_HASH.test(value.snapshot_head_record_hash) ||
      !isPositiveSafeInteger(value.before_stream_revision) ||
      value.before_stream_revision > value.snapshot_stream_revision
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor payload is invalid.",
      );
    }
    const payload: HistoryCursorPayload = {
      version: 2,
      project_id: value.project_id,
      query_identity_hash: value.query_identity_hash,
      snapshot_event_position: value.snapshot_event_position,
      snapshot_stream_revision: value.snapshot_stream_revision,
      snapshot_head_event_id: value.snapshot_head_event_id,
      snapshot_head_record_hash: value.snapshot_head_record_hash,
      before_stream_revision: value.before_stream_revision,
    };
    if (this.#encodeCursor(payload) !== cursor) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_INVALID",
        "Retained Project History cursor encoding is not canonical.",
      );
    }
    if (payload.project_id !== projectId) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_BINDING_MISMATCH",
        "Retained Project History cursor belongs to a different Project.",
      );
    }
    if (payload.query_identity_hash !== queryIdentityHash) {
      throw new ProjectHistoryRetainedContinuationError(
        "CURSOR_BINDING_MISMATCH",
        "Retained Project History cursor belongs to a different normalized query.",
      );
    }
    return payload;
  }

  async #retentionSnapshot(
    client: PoolClient,
    projectId: string,
    authority: PetraProjectHistoryView["content"]["authority"],
  ): Promise<ProjectHistoryRetentionSnapshot> {
    if (authority.through_stream_revision === 0) {
      return {
        through_event_position: authority.through_event_position,
        through_stream_revision: 0,
      };
    }
    const result = await client.query<EventRow>(
      `SELECT payload AS event_payload, record_hash AS event_record_hash
         FROM petra.domain_events
        WHERE project_id = $1 AND stream_revision = $2`,
      [projectId, authority.through_stream_revision],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The retained Project event head is unavailable.",
      );
    }
    const headEventRef = this.#eventRef(
      row.event_payload,
      row.event_record_hash,
    );
    if (headEventRef.event_position > authority.through_event_position) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The retained Project event head exceeds current authority.",
      );
    }
    return {
      through_event_position: authority.through_event_position,
      through_stream_revision: authority.through_stream_revision,
      head_event_ref: headEventRef,
    };
  }

  async #resolveCursorSnapshot(
    client: PoolClient,
    projectId: string,
    cursor: HistoryCursorPayload,
    currentAuthority: PetraProjectHistoryView["content"]["authority"],
  ): Promise<ProjectHistoryRetentionSnapshot> {
    if (
      cursor.snapshot_event_position >
        currentAuthority.through_event_position ||
      cursor.snapshot_stream_revision > currentAuthority.through_stream_revision
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "SNAPSHOT_UNAVAILABLE",
        "Retained Project History cursor references an unavailable authority snapshot.",
      );
    }
    const result = await client.query<EventRow>(
      `SELECT payload AS event_payload, record_hash AS event_record_hash
         FROM petra.domain_events
        WHERE project_id = $1
          AND stream_revision = $2
          AND event_id = $3`,
      [
        projectId,
        cursor.snapshot_stream_revision,
        cursor.snapshot_head_event_id,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectHistoryRetainedContinuationError(
        "SNAPSHOT_UNAVAILABLE",
        "Retained Project History cursor does not resolve to its original Project snapshot.",
      );
    }
    const headEventRef = this.#eventRef(
      row.event_payload,
      row.event_record_hash,
    );
    if (
      headEventRef.record_hash !== cursor.snapshot_head_record_hash ||
      headEventRef.event_position > cursor.snapshot_event_position
    ) {
      throw new ProjectHistoryRetainedContinuationError(
        "SNAPSHOT_UNAVAILABLE",
        "Retained Project History cursor does not resolve to its original Project snapshot.",
      );
    }
    return {
      through_event_position: cursor.snapshot_event_position,
      through_stream_revision: cursor.snapshot_stream_revision,
      head_event_ref: headEventRef,
    };
  }

  async getProjectHistoryEpisodeView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryEpisodeView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const result = await client.query<HistoryRow>(
        `SELECT event.payload AS event_payload,
                event.record_hash AS event_record_hash,
                execution.envelope AS command_envelope,
                execution.command_fingerprint,
                lifecycle.payload AS lifecycle_receipt_payload,
                lifecycle.record_hash AS lifecycle_receipt_record_hash,
                replacement.payload AS replacement_receipt_payload,
                replacement.record_hash AS replacement_receipt_record_hash
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
           LEFT JOIN petra.project_source_lifecycle_receipts AS lifecycle
             ON lifecycle.command_id = event.command_id
           LEFT JOIN petra.project_source_replacement_receipts AS replacement
             ON replacement.command_id = event.command_id
          WHERE event.project_id = $1 AND event.event_id = $2`,
        [projectId, eventId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;

      const change = await this.#change(client, row);
      const envelope = record(row.command_envelope, "command envelope");
      const commandId = change.command_ref.command_id;
      const commandCausationId = envelope.causation_id;
      const parentCommand =
        typeof commandCausationId === "string" &&
        commandCausationId.startsWith("command_")
          ? await this.#causalCommandLink(client, projectId, commandCausationId)
          : undefined;
      const followingCommands = await this.#followingCommands(
        client,
        projectId,
        commandId,
      );
      const streamOrder = await this.#streamOrder(
        client,
        projectId,
        change.event_ref.stream_revision,
      );
      const authority = await this.#authority(client, projectId);
      const receiptRef = this.#receiptRef(row);
      const content = {
        view_kind: "causal_episode",
        change,
        causality: {
          event_causation_kind: "command",
          event_causation_command_id: commandId,
          ...(parentCommand === undefined
            ? {}
            : { parent_command: parentCommand }),
          following_commands: followingCommands,
        },
        stream_order: streamOrder,
        ...(receiptRef === undefined ? {} : { receipt_ref: receiptRef }),
        omissions: [
          "dependency_impact_not_composed",
          "generic_reversal_assessment_not_composed",
          "cross_family_total_order_not_asserted",
        ],
        authority,
        graph_navigation_history: "client_local_separate",
      };
      const view = {
        schema_name: "petra.project-history-episode-view",
        schema_version: "1.0.0",
        project_id: projectId,
        event_id: eventId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-history-episode-view",
        "1.0.0",
        view,
      );
      return structuredClone(view as unknown as PetraProjectHistoryEpisodeView);
    });
  }

  async getProjectHistoryImpactView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryImpactViewV14 | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const result = await client.query<HistoryRow>(
        `SELECT event.payload AS event_payload,
                event.record_hash AS event_record_hash,
                execution.envelope AS command_envelope,
                execution.command_fingerprint,
                lifecycle.payload AS lifecycle_receipt_payload,
                lifecycle.record_hash AS lifecycle_receipt_record_hash,
                replacement.payload AS replacement_receipt_payload,
                replacement.record_hash AS replacement_receipt_record_hash
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
           LEFT JOIN petra.project_source_lifecycle_receipts AS lifecycle
             ON lifecycle.command_id = event.command_id
           LEFT JOIN petra.project_source_replacement_receipts AS replacement
             ON replacement.command_id = event.command_id
          WHERE event.project_id = $1 AND event.event_id = $2`,
        [projectId, eventId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;

      const change = await this.#change(client, row);
      const event = record(row.event_payload, "selected domain event");
      const causalCommands = await this.#impactCausalCommands(
        client,
        projectId,
        change.command_ref.command_id,
      );
      const outboxRecords = await this.#impactOutboxRecords(
        client,
        projectId,
        change.event_ref,
        event,
      );
      const graphProjectionRecords = await this.#impactProjectionRecords(
        client,
        projectId,
        change.event_ref,
      );
      const groundedResponseInvalidations =
        await this.#impactGroundedResponseInvalidations(
          client,
          projectId,
          change.event_ref,
          event,
        );
      const groups = [
        causalCommands,
        outboxRecords,
        graphProjectionRecords,
        groundedResponseInvalidations,
      ];
      const totalCount = groups.reduce(
        (total, group) => total + group.total_count,
        0,
      );
      if (!Number.isSafeInteger(totalCount)) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The direct dependency total exceeds Petra's safe integer range.",
        );
      }
      const semanticTargetImpact = await this.#semanticTargetImpact(
        client,
        projectId,
        change.targets,
      );
      const operationalDependencyImpact =
        await this.#operationalDependencyImpact(
          client,
          projectId,
          change.targets,
          semanticTargetImpact,
        );
      const authority = await this.#authority(client, projectId);
      const content: PetraProjectHistoryImpactViewV14["content"] = {
        view_kind: "dependency_impact",
        selected_event: {
          command_ref: change.command_ref,
          event_ref: change.event_ref,
          actor: change.actor,
          occurred_at: change.occurred_at,
          recorded_at: change.recorded_at,
          family: change.family,
          targets: change.targets,
          observed_effect: change.observed_effect,
          semantic_destination: change.semantic_destination,
        },
        authorization_scope: "authenticated_project",
        impact: {
          scope: "registered_direct_event_and_command_dependents",
          summary: {
            registered_group_count: 4,
            total_count: totalCount,
            coverage: groups.some(({ coverage }) => coverage === "truncated")
              ? "truncated"
              : "complete",
          },
          causal_commands: causalCommands,
          outbox_records: outboxRecords,
          graph_projection_records: graphProjectionRecords,
          grounded_response_invalidations: groundedResponseInvalidations,
          unknowns: [
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
          ],
        },
        semantic_target_impact: semanticTargetImpact,
        operational_dependency_impact: operationalDependencyImpact,
        decision_boundary: {
          reversibility: "not_assessed",
          compensation: "not_composed",
          dependent_effect: "not_inferred_from_reference",
        },
        authority: {
          isolation: "repeatable_read",
          ...authority,
        },
        omissions: [
          "unregistered_semantic_target_adapters_not_composed",
          "identity_only_semantic_relations_not_composed",
          "transitive_dependency_closure_not_composed",
          "work_without_exact_record_binding_not_composed",
          "operational_dependent_effect_not_inferred",
          "unregistered_operational_destination_not_inferred",
          "reversibility_not_assessed",
          "compensation_not_composed",
          "historical_project_definition_not_interpreted",
          "cross_family_total_order_not_asserted",
        ],
        graph_navigation_history: "client_local_separate",
      };
      const view: PetraProjectHistoryImpactViewV14 = {
        schema_name: "petra.project-history-impact-view",
        schema_version: "1.4.0",
        project_id: projectId,
        event_id: eventId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("project-history-impact-view", "1.4.0", view);
      return structuredClone(view);
    });
  }

  async getProjectHistoryRecoveryAssessmentView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryRecoveryAssessmentView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const result = await client.query<HistoryRow>(
        `SELECT event.payload AS event_payload,
                event.record_hash AS event_record_hash,
                execution.envelope AS command_envelope,
                execution.command_fingerprint,
                lifecycle.payload AS lifecycle_receipt_payload,
                lifecycle.record_hash AS lifecycle_receipt_record_hash,
                replacement.payload AS replacement_receipt_payload,
                replacement.record_hash AS replacement_receipt_record_hash
           FROM petra.domain_events AS event
           JOIN petra.command_executions AS execution
             ON execution.command_id = event.command_id
            AND execution.project_id = event.project_id
           LEFT JOIN petra.project_source_lifecycle_receipts AS lifecycle
             ON lifecycle.command_id = event.command_id
           LEFT JOIN petra.project_source_replacement_receipts AS replacement
             ON replacement.command_id = event.command_id
          WHERE event.project_id = $1 AND event.event_id = $2`,
        [projectId, eventId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;

      const selectedEvent = await this.#change(client, row);
      const eventType = selectedEvent.event_ref.event_type;
      if (
        eventType !== "change_set.applied" &&
        eventType !== "change_set.reverted"
      ) {
        throw new ProjectHistoryViewRequestError(
          "A ChangeSet recovery assessment requires an exact change_set.applied or change_set.reverted event.",
        );
      }
      const event = record(row.event_payload, "selected recovery event");
      const eventFact = objectMember(event, "event", "selected recovery event");
      const eventPayload = objectMember(
        eventFact,
        "payload",
        "selected recovery event.event",
      );
      const selectedEventRole =
        eventType === "change_set.reverted" ? "compensation" : "promotion";
      const promotionChangeSetId =
        eventType === "change_set.reverted"
          ? stringMember(
              eventPayload,
              "compensates_change_set_id",
              "selected recovery event payload",
            )
          : stringMember(
              eventPayload,
              "change_set_id",
              "selected recovery event payload",
            );
      const selectedClaim = objectMember(
        eventPayload,
        "claim",
        "selected recovery event payload",
      );
      const selectedAssertion = objectMember(
        eventPayload,
        "assertion",
        "selected recovery event payload",
      );
      const claimId = stringMember(
        selectedClaim,
        "claim_id",
        "selected recovery claim",
      );
      const assertionId = stringMember(
        selectedAssertion,
        "assertion_id",
        "selected recovery assertion",
      );

      const promotionResult = await client.query<RecoveryChangeSetRow>(
        `SELECT payload, record_hash, current_state, applied_approval_id
           FROM petra.change_sets
          WHERE project_id = $1 AND change_set_id = $2`,
        [projectId, promotionChangeSetId],
      );
      const promotionRow = promotionResult.rows[0];
      if (promotionRow === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The selected recovery event does not resolve its promotion ChangeSet in this Project.",
        );
      }
      const promotion = this.#recoveryChangeSet(
        promotionRow,
        promotionChangeSetId,
        "promotion ChangeSet",
      );
      if (promotionRow.applied_approval_id === null) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The applied promotion ChangeSet has no exact Approval binding.",
        );
      }
      const approvalResult = await client.query<RecoveryApprovalRow>(
        `SELECT payload, record_hash
           FROM petra.approvals
          WHERE approval_id = $1
            AND change_set_id = $2
            AND change_set_revision = 1
            AND change_set_content_hash = $3`,
        [
          promotionRow.applied_approval_id,
          promotionChangeSetId,
          promotion.ref.content_hash,
        ],
      );
      const approvalRow = approvalResult.rows[0];
      if (approvalRow === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The applied promotion ChangeSet does not resolve its exact Approval.",
        );
      }
      const approvalPayload = record(approvalRow.payload, "promotion Approval");
      this.#contracts.assertValid("approval", "1.0.0", approvalPayload);
      if (canonicalHash(approvalPayload) !== approvalRow.record_hash) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The promotion Approval record hash does not match its immutable payload.",
        );
      }
      const approvalSubject = objectMember(
        approvalPayload,
        "subject",
        "promotion Approval",
      );
      if (
        stringMember(approvalPayload, "decision", "promotion Approval") !==
          "approved" ||
        stringMember(
          approvalSubject,
          "change_set_id",
          "promotion Approval subject",
        ) !== promotionChangeSetId
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The applied Approval does not authorize the exact promotion ChangeSet.",
        );
      }
      const appliedApproval = {
        approval_id: stringMember(
          approvalPayload,
          "approval_id",
          "promotion Approval",
        ),
        revision: 1 as const,
        change_set_id: promotionChangeSetId,
        change_set_revision: 1 as const,
        change_set_content_hash: promotion.ref.content_hash,
        decision: "approved" as const,
        record_hash: approvalRow.record_hash,
      };

      const operationsResult = await client.query<RecoveryOperationRow>(
        `SELECT position::text, operation_kind, target_id,
                base_revision::text, operation
           FROM petra.change_set_operations
          WHERE change_set_id = $1
          ORDER BY position`,
        [promotionChangeSetId],
      );
      const evidenceResult = await client.query<RecoveryEvidenceRow>(
        `SELECT entity.evidence_id, entity.evidence_kind,
                entity.current_revision::text,
                revision.authority_zone, revision.review_state,
                revision.admission_kind, revision.schema_name,
                revision.schema_version, revision.record_hash,
                revision.payload
           FROM petra.evidence_entities AS entity
           JOIN petra.evidence_entity_revisions AS revision
             ON revision.evidence_id = entity.evidence_id
            AND revision.evidence_kind = entity.evidence_kind
            AND revision.revision = entity.current_revision
          WHERE entity.evidence_id = ANY($1::text[])
          ORDER BY CASE entity.evidence_kind WHEN 'claim' THEN 1 ELSE 2 END`,
        [[claimId, assertionId]],
      );
      if (evidenceResult.rows.length !== 2) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The exact recovery Claim–Assertion pair is unavailable in current authority.",
        );
      }
      const currentTargets = evidenceResult.rows.map((evidenceRow) =>
        this.#recoveryEvidenceRef(evidenceRow),
      ) as PetraProjectHistoryRecoveryAssessmentView["content"]["recovery_subject"]["current_targets"];
      const claimRow = evidenceResult.rows.find(
        ({ evidence_kind }) => evidence_kind === "claim",
      );
      const assertionRow = evidenceResult.rows.find(
        ({ evidence_kind }) => evidence_kind === "assertion",
      );
      if (claimRow === undefined || assertionRow === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The recovery target authority does not contain one Claim and one Assertion.",
        );
      }

      const commandAuthority = await this.#recoveryCommandAuthority(
        client,
        projectId,
        readAt,
      );
      const compensation = await this.#recoveryCompensation(
        client,
        projectId,
        promotionChangeSetId,
      );

      const causalCommands = await this.#impactCausalCommands(
        client,
        projectId,
        selectedEvent.command_ref.command_id,
      );
      const outboxRecords = await this.#impactOutboxRecords(
        client,
        projectId,
        selectedEvent.event_ref,
        event,
      );
      const graphProjectionRecords = await this.#impactProjectionRecords(
        client,
        projectId,
        selectedEvent.event_ref,
      );
      const groundedResponseInvalidations =
        await this.#impactGroundedResponseInvalidations(
          client,
          projectId,
          selectedEvent.event_ref,
          event,
        );
      const directGroups = [
        causalCommands,
        outboxRecords,
        graphProjectionRecords,
        groundedResponseInvalidations,
      ];
      const directCount = directGroups.reduce(
        (total, group) => total + group.total_count,
        0,
      );
      if (!Number.isSafeInteger(directCount)) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The recovery dependency total exceeds Petra's safe integer range.",
        );
      }
      const semanticImpact = await this.#semanticTargetImpact(
        client,
        projectId,
        selectedEvent.targets,
      );

      const assessment =
        compensation === undefined
          ? this.#recoveryEligibility(
              promotion,
              operationsResult.rows,
              claimRow,
              assertionRow,
              selectedClaim,
              selectedAssertion,
              commandAuthority,
            )
          : {
              state: "already_compensated" as const,
              scope: "single_change_set_compensation" as const,
              reason:
                "The promotion has already been compensated by the exact retained reversal ChangeSet and event.",
              blockers: [] as [],
              compensation_change_set: compensation.changeSet,
              compensation_approval: compensation.approval,
              compensation_event_ref: compensation.eventRef,
            };
      if (
        eventType === "change_set.reverted" &&
        compensation?.changeSet.change_set_id !==
          stringMember(
            eventPayload,
            "change_set_id",
            "selected recovery event payload",
          )
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The selected compensation event is not the retained applied compensation for its promotion.",
        );
      }
      const authority = await this.#authority(client, projectId);
      const content: PetraProjectHistoryRecoveryAssessmentView["content"] = {
        view_kind: "change_set_recovery_assessment",
        authorization_scope: "authenticated_project",
        selected_event: selectedEvent,
        recovery_subject: {
          selected_event_role: selectedEventRole,
          promotion_change_set: promotion.ref,
          applied_approval: appliedApproval,
          current_targets: currentTargets,
        },
        command_authority: commandAuthority,
        causal_impact_basis: {
          source_event_id: eventId,
          direct_dependency_summary: {
            registered_group_count: 4,
            total_count: directCount,
            coverage: directGroups.some(
              ({ coverage }) => coverage === "truncated",
            )
              ? "truncated"
              : "complete",
          },
          semantic_dependency_summary: semanticImpact.summary,
          dependent_effect: "not_inferred_from_reference",
          unknowns: [
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
          ],
        },
        assessment,
        decision_boundary: {
          reversibility: "assessed_for_exact_change_set",
          compensation_preview: "not_composed",
          compensation_execution: "not_performed",
          multi_step_compensation: "not_assessed",
        },
        authority: { isolation: "repeatable_read", ...authority },
        omissions: [
          "compensation_preview_not_composed",
          "compensation_execution_not_performed",
          "generic_undo_not_implemented",
          "multi_step_compensation_not_assessed",
          "historical_project_definition_not_interpreted",
          "dependent_effect_not_inferred_from_reference",
          "cross_family_total_order_not_asserted",
        ],
        graph_navigation_history: "client_local_separate",
      };
      const view: PetraProjectHistoryRecoveryAssessmentView = {
        schema_name: "petra.project-history-recovery-assessment-view",
        schema_version: "1.0.0",
        project_id: projectId,
        event_id: eventId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-history-recovery-assessment-view",
        "1.0.0",
        view,
      );
      return structuredClone(view);
    });
  }

  async getProjectHistoryCompensationPreviewView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryCompensationPreviewView | undefined> {
    const assessment = await this.getProjectHistoryRecoveryAssessmentView(
      projectId,
      eventId,
    );
    if (assessment === undefined) return undefined;
    if (assessment.content.assessment.state !== "eligible_for_preview") {
      throw new ProjectHistoryRecoveryPreviewUnavailableError(
        `A compensation preview requires a currently eligible assessment; this assessment is ${assessment.content.assessment.state}.`,
      );
    }
    const principal = assessment.content.command_authority.principal_state;
    if (principal.state !== "configured") {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An eligible recovery assessment has no configured command principal.",
      );
    }
    const commandAuthority =
      assessment.content.command_authority.required_commands;
    if (commandAuthority.some(({ state }) => state !== "granted")) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An eligible recovery assessment has an unavailable command grant.",
      );
    }
    const claim = assessment.content.recovery_subject.current_targets.find(
      ({ semantic_key }) => semantic_key === "scientific.claim",
    );
    const assertion = assessment.content.recovery_subject.current_targets.find(
      ({ semantic_key }) => semantic_key === "scientific.assertion",
    );
    if (claim === undefined || assertion === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An eligible recovery assessment has no exact Claim–Assertion pair.",
      );
    }
    const nextClaimRevision = claim.revision + 1;
    const nextAssertionRevision = assertion.revision + 1;
    if (
      !Number.isSafeInteger(nextClaimRevision) ||
      !Number.isSafeInteger(nextAssertionRevision)
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The compensation result would exceed Petra's safe revision range.",
      );
    }
    const issuedAt = assessment.read_at;
    const issuedAtMilliseconds = Date.parse(issuedAt);
    if (!Number.isFinite(issuedAtMilliseconds)) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The recovery assessment has an invalid authority timestamp.",
      );
    }
    const validThrough = new Date(
      issuedAtMilliseconds + 5 * 60 * 1000,
    ).toISOString();
    const operations: PetraProjectHistoryCompensationPreviewView["content"]["operation_preview"] =
      [
        {
          operation_kind: "retract_claim",
          target_id: claim.object_id,
          base_revision: claim.revision,
          current_record_hash: claim.record_hash,
          before: { zone: "trusted", review_state: "human_accepted" },
          after: { zone: "quarantine", review_state: "human_rejected" },
        },
        {
          operation_kind: "retract_assertion",
          target_id: assertion.object_id,
          base_revision: assertion.revision,
          current_record_hash: assertion.record_hash,
          before: { zone: "trusted", review_state: "human_accepted" },
          after: { zone: "quarantine", review_state: "human_rejected" },
        },
      ];
    const commandSequence = commandAuthority.map((command, index) => {
      if (command.state !== "granted") {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "An eligible recovery assessment lost its command grant.",
        );
      }
      return {
        position: (index + 1) as 1 | 2 | 3,
        command_name: command.command_name,
        actor: { ...principal.actor },
        grant_ref: { ...command.grant_ref },
        composition_state: "not_composed" as const,
        authority_recheck: "required" as const,
        prerequisite: [
          "confirmed_preview_and_required_input",
          "submitted_exact_change_set",
          "approved_exact_change_set",
        ][index] as
          | "confirmed_preview_and_required_input"
          | "submitted_exact_change_set"
          | "approved_exact_change_set",
      };
    }) as PetraProjectHistoryCompensationPreviewView["content"]["command_sequence"];
    const bindingHash = canonicalHash({
      project_id: projectId,
      event_id: eventId,
      assessment_content_hash: assessment.content_hash,
      assessment_authority: assessment.content.authority,
      promotion_change_set:
        assessment.content.recovery_subject.promotion_change_set,
      targets: operations,
      command_grants: commandSequence.map(({ command_name, grant_ref }) => ({
        command_name,
        grant_ref,
      })),
      valid_through: validThrough,
    });
    const content: PetraProjectHistoryCompensationPreviewView["content"] = {
      view_kind: "single_change_set_compensation_preview",
      authorization_scope: "authenticated_project",
      assessment_ref: {
        schema_name: "petra.project-history-recovery-assessment-view",
        schema_version: "1.0.0",
        event_id: eventId,
        content_hash: assessment.content_hash,
        assessed_at: issuedAt,
        assessment_state: "eligible_for_preview",
        authority: { ...assessment.content.authority },
      },
      compensates_change_set: {
        ...assessment.content.recovery_subject.promotion_change_set,
      },
      target_change_set_schema: {
        schema_name: "petra.change-set",
        schema_version: "1.1.0",
        risk_tier: "R2",
        origin: "direct_edit",
      },
      operation_preview: operations,
      impact_basis: { ...assessment.content.causal_impact_basis },
      result_preview: [
        {
          semantic_key: "scientific.claim",
          object_id: claim.object_id,
          prior_revision: claim.revision,
          resulting_revision: nextClaimRevision,
          resulting_authority: {
            zone: "quarantine",
            review_state: "human_rejected",
          },
        },
        {
          semantic_key: "scientific.assertion",
          object_id: assertion.object_id,
          prior_revision: assertion.revision,
          resulting_revision: nextAssertionRevision,
          resulting_authority: {
            zone: "quarantine",
            review_state: "human_rejected",
          },
        },
      ],
      preservation: {
        prior_revisions: "retained",
        promotion_and_approval: "retained",
        selected_event: "retained",
        dependent_records: "not_rewritten",
        dependent_effects: "not_automatically_reversed",
      },
      required_user_input: [
        "reason",
        "approval_rationale",
        "explicit_confirmation",
      ],
      change_set_composition: "deferred_until_confirmed_input",
      command_sequence: commandSequence,
      freshness: {
        issued_at: issuedAt,
        valid_through: validThrough,
        binding_hash: bindingHash,
        invalidation_causes: [
          "expiry_reached",
          "project_authority_advanced",
          "promotion_state_changed",
          "target_revision_or_record_changed",
          "command_grant_changed",
        ],
      },
      decision_boundary: {
        preview: "read_only",
        change_set: "not_created",
        approval: "not_recorded",
        commands: "not_composed_or_executed",
        generic_undo: "not_available",
        multi_step_compensation: "not_assessed",
      },
      omissions: [
        "user_reason_not_supplied",
        "approval_rationale_not_supplied",
        "command_envelopes_not_composed",
        "compensation_not_persisted",
        "compensation_not_executed",
        "dependent_effect_not_inferred_or_reversed",
        "historical_project_definition_not_interpreted",
      ],
      graph_navigation_history: "client_local_separate",
    };
    const view: PetraProjectHistoryCompensationPreviewView = {
      schema_name: "petra.project-history-compensation-preview-view",
      schema_version: "1.0.0",
      project_id: projectId,
      event_id: eventId,
      content,
      content_hash: canonicalHash(content),
      read_at: issuedAt,
    };
    this.#contracts.assertValid(
      "project-history-compensation-preview-view",
      "1.0.0",
      view,
    );
    return structuredClone(view);
  }

  async composeProjectHistoryCompensationPlan(
    request: PetraProjectHistoryCompensationPlanRequest,
  ): Promise<PetraProjectHistoryCompensationPlanView | undefined> {
    return this.#composeProjectHistoryCompensationPlan(request);
  }

  async revalidateProjectHistoryCompensationPlan(
    plan: PetraProjectHistoryCompensationPlanView,
  ): Promise<boolean> {
    this.#contracts.assertValid(
      "project-history-compensation-plan-view",
      "1.0.0",
      plan,
    );
    if (canonicalHash(plan.content) !== plan.content_hash) {
      throw new ProjectHistoryCompensationPlanUnavailableError(
        "The compensation plan content no longer reproduces its canonical identity.",
      );
    }
    const recomposed = await this.#composeProjectHistoryCompensationPlan(
      {
        schema_name: "petra.project-history-compensation-plan-request",
        schema_version: "1.0.0",
        project_id: plan.project_id,
        event_id: plan.event_id,
        preview_ref: structuredClone(plan.content.preview_ref),
        confirmation: {
          confirmed: true,
          reason: plan.content.change_set.content.reason,
          approval_rationale: plan.content.approval.rationale,
        },
      },
      plan.read_at,
    );
    if (recomposed === undefined) return false;
    if (canonicalize(recomposed) !== canonicalize(plan)) {
      throw new ProjectHistoryCompensationPlanUnavailableError(
        "The compensation plan differs from the exact plan derived from current Project authority.",
      );
    }
    return true;
  }

  async #composeProjectHistoryCompensationPlan(
    request: PetraProjectHistoryCompensationPlanRequest,
    compositionTime?: string,
  ): Promise<PetraProjectHistoryCompensationPlanView | undefined> {
    this.#contracts.assertValid(
      "project-history-compensation-plan-request",
      "1.0.0",
      request,
    );
    const previewRef = request.preview_ref;
    const current = await this.getProjectHistoryCompensationPreviewView(
      request.project_id,
      request.event_id,
    );
    if (current === undefined) return undefined;
    const checkedAt = Date.parse(current.read_at);
    const issuedAt = Date.parse(previewRef.issued_at);
    const validThrough = Date.parse(previewRef.valid_through);
    const composedAt = compositionTime ?? current.read_at;
    const composedAtValue = Date.parse(composedAt);
    if (
      !Number.isFinite(checkedAt) ||
      !Number.isFinite(issuedAt) ||
      !Number.isFinite(validThrough) ||
      !Number.isFinite(composedAtValue) ||
      validThrough - issuedAt !== 5 * 60 * 1000 ||
      checkedAt < issuedAt ||
      checkedAt >= validThrough ||
      composedAtValue < issuedAt ||
      composedAtValue >= validThrough
    ) {
      throw new ProjectHistoryCompensationPlanUnavailableError(
        "The compensation preview is expired or has an invalid freshness interval.",
      );
    }
    const reproducedContent = structuredClone(current.content);
    reproducedContent.assessment_ref.assessed_at = previewRef.issued_at;
    reproducedContent.freshness.issued_at = previewRef.issued_at;
    reproducedContent.freshness.valid_through = previewRef.valid_through;
    reproducedContent.freshness.binding_hash = compensationPreviewBindingHash(
      request.project_id,
      request.event_id,
      reproducedContent,
    );
    if (
      reproducedContent.freshness.binding_hash !== previewRef.binding_hash ||
      canonicalHash(reproducedContent) !== previewRef.content_hash
    ) {
      throw new ProjectHistoryCompensationPlanUnavailableError(
        "The compensation preview no longer matches current Project, target, impact, or command-grant authority, or its canonical identity is invalid.",
      );
    }
    const plan = buildPreviewBoundCompensatingReversalCommandPlan({
      preview: current,
      reason: request.confirmation.reason,
      rationale: request.confirmation.approval_rationale,
      composed_at: composedAt,
    });
    const actor = current.content.command_sequence[0].actor;
    if (actor.actor_kind !== "human") {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A confirmed compensation plan requires the configured human principal.",
      );
    }
    const humanActor = {
      actor_id: actor.actor_id,
      actor_kind: "human" as const,
    };
    if (plan.review.command.command_name !== "RecordApproval") {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A confirmed compensation plan requires the exact Approval command.",
      );
    }
    const content: PetraProjectHistoryCompensationPlanView["content"] = {
      plan_kind: "single_change_set_compensation_command_plan",
      authorization_scope: "authenticated_project",
      preview_ref: {
        schema_name: "petra.project-history-compensation-preview-view",
        schema_version: "1.0.0",
        content_hash: previewRef.content_hash,
        binding_hash: previewRef.binding_hash,
        issued_at: previewRef.issued_at,
        valid_through: previewRef.valid_through,
      },
      confirmation: {
        state: "explicitly_confirmed",
        confirmed_by: humanActor,
        confirmed_at: composedAt,
      },
      revalidation: {
        state: "passed",
        checked_at: composedAt,
        assessment_content_hash: current.content.assessment_ref.content_hash,
        authority: structuredClone(current.content.assessment_ref.authority),
        target_bindings: structuredClone(current.content.operation_preview),
        preview_command_bindings: structuredClone(
          current.content.command_sequence,
        ),
        preview_expiry: "unexpired",
      },
      change_set: structuredClone(plan.change_set),
      approval: structuredClone(plan.review.command.approval),
      commands: [
        {
          position: 1,
          command_name: "SubmitChangeSet",
          envelope: structuredClone(plan.submit),
          state: "composed_not_submitted",
        },
        {
          position: 2,
          command_name: "RecordApproval",
          envelope: structuredClone(plan.review),
          state: "composed_not_submitted",
        },
        {
          position: 3,
          command_name: "ApplyChangeSet",
          envelope: structuredClone(plan.apply),
          state: "composed_not_submitted",
        },
      ],
      persistence: {
        change_set: "not_persisted",
        approval: "not_persisted",
        commands: "not_persisted",
      },
      execution: {
        state: "not_performed",
        requires_separate_request: true,
        authority_recheck: "required_at_each_command",
      },
      decision_boundary: {
        preview: "revalidated",
        command_plan: "composed",
        compensation: "not_persisted_or_executed",
        generic_undo: "not_available",
        multi_step_compensation: "not_assessed",
      },
      omissions: [
        "commands_not_submitted",
        "compensation_not_persisted",
        "compensation_not_executed",
        "dependent_effect_not_inferred_or_reversed",
        "historical_project_definition_not_interpreted",
      ],
      graph_navigation_history: "client_local_separate",
    };
    const view: PetraProjectHistoryCompensationPlanView = {
      schema_name: "petra.project-history-compensation-plan-view",
      schema_version: "1.0.0",
      project_id: request.project_id,
      event_id: request.event_id,
      content,
      content_hash: canonicalHash(content),
      read_at: composedAt,
    };
    this.#contracts.assertValid(
      "project-history-compensation-plan-view",
      "1.0.0",
      view,
    );
    return structuredClone(view);
  }

  #recoveryChangeSet(
    row: RecoveryChangeSetRow,
    expectedId: string,
    label: string,
  ): RecoveryChangeSetAuthority {
    const payload = record(row.payload, label);
    const version = stringMember(payload, "schema_version", label);
    if (version !== "1.0.0" && version !== "1.1.0") {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        `${label} uses an unsupported schema version.`,
      );
    }
    this.#contracts.assertValid("change-set", version, payload);
    const content = objectMember(payload, "content", label);
    const contentHash = stringMember(payload, "content_hash", label);
    if (
      stringMember(payload, "change_set_id", label) !== expectedId ||
      canonicalHash(content) !== contentHash ||
      canonicalHash(payload) !== row.record_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        `${label} cannot reproduce its immutable identities.`,
      );
    }
    return {
      payload,
      ref: {
        change_set_id: expectedId,
        revision: 1,
        schema_version: version,
        content_hash: contentHash,
        record_hash: row.record_hash,
        current_state: row.current_state,
      },
    };
  }

  #recoveryEvidenceRef(
    row: RecoveryEvidenceRow,
  ): PetraProjectHistoryRecoveryAssessmentView["content"]["recovery_subject"]["current_targets"][number] {
    const payload = record(row.payload, `current ${row.evidence_kind}`);
    this.#contracts.assertValid(row.evidence_kind, row.schema_version, payload);
    if (
      stringMember(
        payload,
        row.evidence_kind === "claim" ? "claim_id" : "assertion_id",
        `current ${row.evidence_kind}`,
      ) !== row.evidence_id ||
      canonicalHash(payload) !== row.record_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        `The current ${row.evidence_kind} cannot reproduce its immutable identity.`,
      );
    }
    const authority = objectMember(
      payload,
      "authority",
      `current ${row.evidence_kind}`,
    );
    const promotion =
      authority.promotion === undefined
        ? undefined
        : record(authority.promotion, `current ${row.evidence_kind} promotion`);
    return {
      semantic_key:
        row.evidence_kind === "claim"
          ? "scientific.claim"
          : "scientific.assertion",
      object_id: row.evidence_id,
      revision: this.#safeImpactPosition(
        row.current_revision,
        `current ${row.evidence_kind} revision`,
      ),
      schema_name: row.schema_name,
      schema_version: row.schema_version,
      record_hash: row.record_hash,
      authority_zone: row.authority_zone,
      review_state: row.review_state,
      admission_kind: row.admission_kind,
      ...(promotion === undefined
        ? {}
        : {
            promotion_change_set_id: stringMember(
              promotion,
              "change_set_id",
              `current ${row.evidence_kind} promotion`,
            ),
          }),
    };
  }

  async #recoveryCommandAuthority(
    client: PoolClient,
    projectId: string,
    readAt: string,
  ): Promise<
    PetraProjectHistoryRecoveryAssessmentView["content"]["command_authority"]
  > {
    const commands = [
      "SubmitChangeSet",
      "RecordApproval",
      "ApplyChangeSet",
    ] as const;
    if (this.#recoveryPrincipal === undefined) {
      return {
        principal_source: "server_authenticated_single_user",
        principal_state: {
          state: "unavailable",
          reason: "principal_not_configured",
        },
        required_commands: [
          {
            command_name: "SubmitChangeSet",
            state: "denied",
            reason: "principal_not_configured",
          },
          {
            command_name: "RecordApproval",
            state: "denied",
            reason: "principal_not_configured",
          },
          {
            command_name: "ApplyChangeSet",
            state: "denied",
            reason: "principal_not_configured",
          },
        ],
        execution_recheck: "required_at_each_command",
      };
    }
    const actor = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM petra.actors
          WHERE actor_id = $1 AND actor_kind = 'human'
       ) AS exists`,
      [this.#recoveryPrincipal.actor_id],
    );
    if (actor.rows[0]?.exists !== true) {
      return {
        principal_source: "server_authenticated_single_user",
        principal_state: {
          state: "unavailable",
          reason: "actor_not_registered",
        },
        required_commands: [
          {
            command_name: "SubmitChangeSet",
            state: "denied",
            reason: "actor_not_registered",
          },
          {
            command_name: "RecordApproval",
            state: "denied",
            reason: "actor_not_registered",
          },
          {
            command_name: "ApplyChangeSet",
            state: "denied",
            reason: "actor_not_registered",
          },
        ],
        execution_recheck: "required_at_each_command",
      };
    }
    const grants = await client.query<RecoveryGrantRow>(
      `SELECT required.command_name,
              eligible.capability_grant_id, eligible.revision::text,
              eligible.content_hash, eligible.record_hash, eligible.payload
         FROM unnest($4::text[]) WITH ORDINALITY
              AS required(command_name, command_order)
         LEFT JOIN LATERAL (
           SELECT grant_record.capability_grant_id, grant_record.revision,
                  grant_record.content_hash, grant_record.record_hash,
                  grant_record.payload
             FROM petra.capability_grants AS grant_record
            WHERE grant_record.project_id = $1
              AND grant_record.grantee_actor_id = $2
              AND grant_record.grantee_actor_kind = 'human'
              AND grant_record.valid_from <= $3::timestamptz
              AND (
                grant_record.expires_at IS NULL
                OR grant_record.expires_at > $3::timestamptz
              )
              AND required.command_name = ANY(grant_record.allowed_commands)
              AND NOT EXISTS (
                SELECT 1
                  FROM petra.capability_grant_revocations AS revocation
                 WHERE revocation.capability_grant_id =
                       grant_record.capability_grant_id
              )
            ORDER BY grant_record.valid_from DESC,
                     grant_record.capability_grant_id ASC
            LIMIT 2
         ) AS eligible ON true
        ORDER BY required.command_order, eligible.capability_grant_id`,
      [projectId, this.#recoveryPrincipal.actor_id, readAt, commands],
    );
    const requiredCommands = commands.map((commandName) => {
      const matching = grants.rows.filter(
        ({ command_name }) => command_name === commandName,
      );
      const eligible = matching.filter(
        ({ capability_grant_id }) => capability_grant_id !== null,
      );
      if (eligible.length === 0) {
        return {
          command_name: commandName,
          state: "denied" as const,
          reason: "active_grant_not_found" as const,
        };
      }
      if (eligible.length !== 1) {
        return {
          command_name: commandName,
          state: "denied" as const,
          reason: "active_grant_ambiguous" as const,
        };
      }
      const grant = eligible[0];
      if (
        grant === undefined ||
        grant.capability_grant_id === null ||
        grant.revision === null ||
        grant.content_hash === null ||
        grant.record_hash === null
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The recovery command grant lost its exact authority identity.",
        );
      }
      const payload = record(grant.payload, "recovery capability grant");
      const version = stringMember(
        payload,
        "schema_version",
        "recovery capability grant",
      );
      this.#contracts.assertValid("capability-grant", version, payload);
      if (
        canonicalHash(
          objectMember(payload, "content", "recovery capability grant"),
        ) !== grant.content_hash ||
        canonicalHash(payload) !== grant.record_hash
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The recovery command grant cannot reproduce its immutable identity.",
        );
      }
      return {
        command_name: commandName,
        state: "granted" as const,
        grant_ref: {
          capability_grant_id: grant.capability_grant_id,
          revision: 1 as const,
          content_hash: grant.content_hash,
          record_hash: grant.record_hash,
        },
      };
    }) as PetraProjectHistoryRecoveryAssessmentView["content"]["command_authority"]["required_commands"];
    return {
      principal_source: "server_authenticated_single_user",
      principal_state: {
        state: "configured",
        actor: { ...this.#recoveryPrincipal },
      },
      required_commands: requiredCommands,
      execution_recheck: "required_at_each_command",
    };
  }

  async #recoveryCompensation(
    client: PoolClient,
    projectId: string,
    promotionChangeSetId: string,
  ): Promise<
    | {
        changeSet: PetraProjectHistoryRecoveryAssessmentView["content"]["recovery_subject"]["promotion_change_set"];
        approval: PetraProjectHistoryRecoveryAssessmentView["content"]["recovery_subject"]["applied_approval"];
        eventRef: ProjectHistoryEventRef;
      }
    | undefined
  > {
    const result = await client.query<RecoveryCompensationRow>(
      `SELECT reversal.change_set_id, reversal.payload,
              reversal.record_hash, reversal.current_state,
              reversal.applied_approval_id,
              approval.payload AS approval_payload,
              approval.record_hash AS approval_record_hash,
              event.payload AS event_payload,
              event.record_hash AS event_record_hash
         FROM petra.change_sets AS reversal
         JOIN petra.domain_events AS event
           ON event.project_id = reversal.project_id
          AND event.event_type = 'change_set.reverted'
          AND event.payload #>> '{event,payload,change_set_id}' =
              reversal.change_set_id
         JOIN petra.approvals AS approval
           ON approval.approval_id = reversal.applied_approval_id
          AND approval.change_set_id = reversal.change_set_id
          AND approval.change_set_revision = reversal.revision
          AND approval.change_set_content_hash = reversal.content_hash
        WHERE reversal.project_id = $1
          AND reversal.compensates_change_set_id = $2
          AND reversal.current_state = 'applied'
        ORDER BY event.stream_revision
        LIMIT 2`,
      [projectId, promotionChangeSetId],
    );
    if (result.rows.length === 0) return undefined;
    if (result.rows.length !== 1) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "More than one applied compensation claims the same promotion ChangeSet.",
      );
    }
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const changeSet = this.#recoveryChangeSet(
      row,
      row.change_set_id,
      "compensation ChangeSet",
    );
    const approvalPayload = record(
      row.approval_payload,
      "compensation Approval",
    );
    this.#contracts.assertValid("approval", "1.0.0", approvalPayload);
    if (canonicalHash(approvalPayload) !== row.approval_record_hash) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The compensation Approval record hash does not match its immutable payload.",
      );
    }
    const approvalSubject = objectMember(
      approvalPayload,
      "subject",
      "compensation Approval",
    );
    const approval = {
      approval_id: stringMember(
        approvalPayload,
        "approval_id",
        "compensation Approval",
      ),
      revision: 1 as const,
      change_set_id: changeSet.ref.change_set_id,
      change_set_revision: 1 as const,
      change_set_content_hash: changeSet.ref.content_hash,
      decision: "approved" as const,
      record_hash: row.approval_record_hash,
    };
    if (
      stringMember(
        approvalSubject,
        "change_set_id",
        "compensation Approval subject",
      ) !== changeSet.ref.change_set_id ||
      stringMember(approvalPayload, "decision", "compensation Approval") !==
        "approved"
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The compensation Approval does not authorize the exact compensation ChangeSet.",
      );
    }
    const event = record(row.event_payload, "compensation event");
    const version = stringMember(event, "schema_version", "compensation event");
    this.#contracts.assertValid("domain-event", version, event);
    if (canonicalHash(event) !== row.event_record_hash) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The compensation event record hash does not match its immutable payload.",
      );
    }
    return {
      changeSet: changeSet.ref,
      approval,
      eventRef: {
        event_id: stringMember(event, "event_id", "compensation event"),
        schema_version: version as ProjectHistoryEventRef["schema_version"],
        event_type: "change_set.reverted",
        event_position: numberMember(
          event,
          "event_position",
          "compensation event",
        ),
        stream_revision: numberMember(
          event,
          "stream_revision",
          "compensation event",
        ),
        record_hash: row.event_record_hash,
      },
    };
  }

  #recoveryEligibility(
    promotion: RecoveryChangeSetAuthority,
    operations: readonly RecoveryOperationRow[],
    claimRow: RecoveryEvidenceRow,
    assertionRow: RecoveryEvidenceRow,
    selectedClaim: JsonRecord,
    selectedAssertion: JsonRecord,
    commandAuthority: PetraProjectHistoryRecoveryAssessmentView["content"]["command_authority"],
  ): PetraProjectHistoryRecoveryAssessmentView["content"]["assessment"] {
    const blockers: Array<{
      code:
        | "selected_change_set_is_compensation"
        | "change_set_not_applied"
        | "change_set_operation_set_invalid"
        | "target_revision_changed"
        | "target_authority_changed"
        | "target_pair_mismatch"
        | "impact_target_set_mismatch"
        | "command_authority_missing"
        | "command_authority_ambiguous";
      detail: string;
    }> = [];
    const content = objectMember(
      promotion.payload,
      "content",
      "promotion ChangeSet",
    );
    if (content.compensates_change_set_id !== undefined) {
      blockers.push({
        code: "selected_change_set_is_compensation",
        detail: "A compensation ChangeSet cannot itself be compensated.",
      });
    }
    if (promotion.ref.current_state !== "applied") {
      blockers.push({
        code: "change_set_not_applied",
        detail: `The promotion ChangeSet is currently ${promotion.ref.current_state}, not applied.`,
      });
    }
    const claimOperation = operations.find(
      ({ operation_kind }) => operation_kind === "promote_claim",
    );
    const assertionOperation = operations.find(
      ({ operation_kind }) => operation_kind === "promote_assertion",
    );
    if (
      operations.length !== 2 ||
      claimOperation === undefined ||
      assertionOperation === undefined
    ) {
      blockers.push({
        code: "change_set_operation_set_invalid",
        detail:
          "The promotion does not contain exactly one Claim and one Assertion promotion operation.",
      });
    } else {
      const expectedClaimRevision = numberMember(
        selectedClaim,
        "revision",
        "selected recovery claim",
      );
      const expectedAssertionRevision = numberMember(
        selectedAssertion,
        "revision",
        "selected recovery assertion",
      );
      if (
        claimOperation.target_id !== claimRow.evidence_id ||
        assertionOperation.target_id !== assertionRow.evidence_id ||
        this.#safeImpactPosition(
          claimOperation.base_revision,
          "promotion Claim base revision",
        ) +
          1 !==
          expectedClaimRevision ||
        this.#safeImpactPosition(
          assertionOperation.base_revision,
          "promotion Assertion base revision",
        ) +
          1 !==
          expectedAssertionRevision
      ) {
        blockers.push({
          code: "change_set_operation_set_invalid",
          detail:
            "The promotion operations do not bind the exact Claim and Assertion outputs recorded by the selected event.",
        });
      }
      if (
        this.#safeImpactPosition(
          claimRow.current_revision,
          "current Claim revision",
        ) !== expectedClaimRevision ||
        this.#safeImpactPosition(
          assertionRow.current_revision,
          "current Assertion revision",
        ) !== expectedAssertionRevision ||
        canonicalize(claimRow.payload) !== canonicalize(selectedClaim) ||
        canonicalize(assertionRow.payload) !== canonicalize(selectedAssertion)
      ) {
        blockers.push({
          code: "target_revision_changed",
          detail:
            "At least one current target no longer equals the exact authority revision produced by the selected event.",
        });
      }
    }
    const claim = record(claimRow.payload, "current recovery Claim");
    const assertion = record(
      assertionRow.payload,
      "current recovery Assertion",
    );
    const claimAuthority = objectMember(
      claim,
      "authority",
      "current recovery Claim",
    );
    const assertionAuthority = objectMember(
      assertion,
      "authority",
      "current recovery Assertion",
    );
    const claimPromotion =
      claimAuthority.promotion === undefined
        ? undefined
        : record(claimAuthority.promotion, "current Claim promotion");
    const assertionPromotion =
      assertionAuthority.promotion === undefined
        ? undefined
        : record(assertionAuthority.promotion, "current Assertion promotion");
    if (
      claimRow.authority_zone !== "trusted" ||
      assertionRow.authority_zone !== "trusted" ||
      claimRow.review_state !== "human_accepted" ||
      assertionRow.review_state !== "human_accepted" ||
      claimPromotion?.change_set_id !== promotion.ref.change_set_id ||
      assertionPromotion?.change_set_id !== promotion.ref.change_set_id
    ) {
      blockers.push({
        code: "target_authority_changed",
        detail:
          "The current targets are no longer the trusted, human-accepted pair authorized by this promotion.",
      });
    }
    const assertionObject = objectMember(
      assertion,
      "object",
      "current recovery Assertion",
    );
    if (
      assertion.predicate !== "ASSERTS" ||
      assertionObject.object_kind !== "entity" ||
      assertionObject.entity_id !== claimRow.evidence_id
    ) {
      blockers.push({
        code: "target_pair_mismatch",
        detail:
          "The current Assertion no longer forms the exact ASSERTS edge to the current Claim.",
      });
    }
    const impact = objectMember(content, "impact", "promotion ChangeSet");
    const affected = member<unknown>(
      impact,
      "affected_object_ids",
      "promotion ChangeSet impact",
    );
    if (
      !Array.isArray(affected) ||
      affected.length !== 2 ||
      new Set(affected).size !== 2 ||
      !affected.includes(claimRow.evidence_id) ||
      !affected.includes(assertionRow.evidence_id)
    ) {
      blockers.push({
        code: "impact_target_set_mismatch",
        detail:
          "The retained impact does not name exactly the Claim–Assertion pair to be compensated.",
      });
    }
    for (const command of commandAuthority.required_commands) {
      if (command.state === "denied") {
        blockers.push({
          code:
            command.reason === "active_grant_ambiguous"
              ? "command_authority_ambiguous"
              : "command_authority_missing",
          detail: `${command.command_name} is not currently authorized (${command.reason}).`,
        });
      }
    }
    return blockers.length === 0
      ? {
          state: "eligible_for_preview",
          scope: "single_change_set_compensation",
          reason:
            "The exact promotion, trusted Claim–ASSERTS pair, applied Approval, and required current command grants are available for a separately requested revision-bound preview.",
          blockers: [],
        }
      : ({
          state: "blocked",
          scope: "single_change_set_compensation",
          reason:
            "The exact single-ChangeSet compensation path cannot proceed to preview under current authority.",
          blockers: blockers.slice(0, 20),
        } as unknown as PetraProjectHistoryRecoveryAssessmentView["content"]["assessment"]);
  }

  async #semanticTargetImpact(
    client: PoolClient,
    projectId: string,
    targets: readonly ProjectHistoryTargetRef[],
  ): Promise<
    PetraProjectHistoryImpactViewV12["content"]["semantic_target_impact"]
  > {
    const selectedTargets = targets.slice(0, SEMANTIC_TARGET_LIMIT);
    const targetAssessments: ProjectHistoryTargetAssessment[] = [];
    for (const [targetIndex, target] of selectedTargets.entries()) {
      targetAssessments.push(
        await this.#semanticTargetAssessment(
          client,
          projectId,
          targetIndex,
          target,
        ),
      );
    }
    const groups = targetAssessments.flatMap((assessment) => assessment.groups);
    const totalCount = groups.reduce(
      (total, group) => total + group.total_count,
      0,
    );
    if (!Number.isSafeInteger(totalCount) || totalCount > 40_000_000) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The semantic-target dependency total exceeds Petra's bounded contract.",
      );
    }
    const targetCoverage =
      targets.length > selectedTargets.length ? "truncated" : "complete";
    const result = {
      scope: "registered_exact_semantic_target_dependents",
      target_limit: SEMANTIC_TARGET_LIMIT,
      per_adapter_ref_limit: SEMANTIC_ADAPTER_MAX_REFS,
      target_total_count: targets.length,
      target_returned_count: selectedTargets.length,
      target_coverage: targetCoverage,
      registry: [
        {
          adapter_kind: "change_control",
          authority_source: "immutable_change_control_target_bindings",
          semantic_keys: [
            "petra.change-set",
            "petra.approval",
            "scientific.claim",
            "scientific.assertion",
          ],
        },
        {
          adapter_kind: "review_membership",
          authority_source: "immutable_review_candidate_bindings",
          semantic_keys: ["scientific.claim", "scientific.assertion"],
        },
        {
          adapter_kind: "grounded_response_dependency",
          authority_source: "immutable_grounded_response_dependencies",
          semantic_keys: ["scientific.claim", "scientific.assertion"],
        },
        {
          adapter_kind: "composition_lineage",
          authority_source: "immutable_composition_target_bindings",
          semantic_keys: ["scientific.claim", "scientific.assertion"],
        },
        {
          adapter_kind: "project_source_lifecycle",
          authority_source: "immutable_project_source_lifecycle_receipts",
          semantic_keys: ["petra.project-source"],
        },
        {
          adapter_kind: "project_source_dependency",
          authority_source: "immutable_project_source_dependency_bindings",
          semantic_keys: ["petra.project-source"],
        },
        {
          adapter_kind: "project_source_replacement_lineage",
          authority_source: "immutable_project_source_replacement_bindings",
          semantic_keys: [
            "petra.project-source",
            "petra.project-source-replacement",
          ],
        },
        {
          adapter_kind: "project_source_replacement_receipt",
          authority_source: "immutable_project_source_replacement_receipts",
          semantic_keys: ["petra.project-source-replacement"],
        },
        {
          adapter_kind: "project_source_effective_head",
          authority_source: "current_project_source_replacement_heads",
          semantic_keys: [
            "petra.project-source",
            "petra.project-source-replacement",
          ],
        },
      ],
      target_assessments: targetAssessments,
      summary: {
        registered_adapter_count: 9,
        assessed_target_count: selectedTargets.length,
        supported_target_count: targetAssessments.filter(
          ({ adapter_state }) => adapter_state === "registered",
        ).length,
        total_count: totalCount,
        coverage:
          targetCoverage === "truncated" ||
          groups.some(({ coverage }) => coverage === "truncated")
            ? "truncated"
            : "complete",
      },
      unknowns: [
        "unregistered_semantic_keys_may_have_dependents",
        "identity_only_semantic_relations_are_excluded",
        "transitive_semantic_dependents_may_exist",
        "external_system_dependents_are_not_observable",
      ],
    };
    return result as unknown as PetraProjectHistoryImpactViewV12["content"]["semantic_target_impact"];
  }

  async #operationalDependencyImpact(
    client: PoolClient,
    projectId: string,
    targets: readonly ProjectHistoryTargetRef[],
    semanticImpact: PetraProjectHistoryImpactViewV12["content"]["semantic_target_impact"],
  ): Promise<
    PetraProjectHistoryImpactViewV14["content"]["operational_dependency_impact"]
  > {
    const workDestinationDefinition =
      await this.#operationalWorkDestinationDefinition(client, projectId);
    const selectedTargets = targets.slice(0, SEMANTIC_TARGET_LIMIT);
    const targetAssessments: ProjectHistoryOperationalTargetAssessment[] = [];
    for (const [targetIndex, target] of selectedTargets.entries()) {
      const semanticAssessment = semanticImpact.target_assessments[targetIndex];
      if (target.revision === undefined) {
        targetAssessments.push({
          target_index: targetIndex,
          target_ref: target,
          adapter_state: "target_identity_incomplete",
          reason: "Operational adapters require an immutable target revision.",
          groups: [],
        });
        continue;
      }
      const resolvedTarget =
        target.record_hash === undefined
          ? semanticAssessment?.adapter_state === "registered"
            ? {
                semantic_key: target.semantic_key,
                object_id: target.object_id,
                revision: target.revision,
                ...(semanticAssessment.resolved_target_ref.content_hash ===
                undefined
                  ? {}
                  : {
                      content_hash:
                        semanticAssessment.resolved_target_ref.content_hash,
                    }),
                record_hash: semanticAssessment.resolved_target_ref.record_hash,
                authority_source:
                  "resolved_immutable_semantic_authority" as const,
              }
            : undefined
          : {
              semantic_key: target.semantic_key,
              object_id: target.object_id,
              revision: target.revision,
              ...(target.content_hash === undefined
                ? {}
                : { content_hash: target.content_hash }),
              record_hash: target.record_hash,
              authority_source: "selected_event_target" as const,
            };
      if (resolvedTarget === undefined) {
        targetAssessments.push({
          target_index: targetIndex,
          target_ref: target,
          adapter_state: "target_record_authority_unavailable",
          reason:
            "The exact immutable target record authority is unavailable in this Project snapshot.",
          groups: [],
        });
        continue;
      }
      const workInputGroup = await this.#operationalWorkInputGroup(
        client,
        projectId,
        resolvedTarget,
        workDestinationDefinition,
      );
      const workOutputGroup = await this.#operationalWorkOutputGroup(
        client,
        projectId,
        resolvedTarget,
      );
      const interactionDeliveryGroup =
        await this.#operationalInteractionDeliveryGroup(
          client,
          projectId,
          resolvedTarget,
        );
      targetAssessments.push({
        target_index: targetIndex,
        target_ref: target,
        adapter_state: "registered",
        resolved_target_record: resolvedTarget,
        groups: [workInputGroup, workOutputGroup, interactionDeliveryGroup],
      });
    }
    const groups = targetAssessments.flatMap((assessment) => assessment.groups);
    const totalCount = groups.reduce(
      (total, group) => total + group.total_count,
      0,
    );
    if (!Number.isSafeInteger(totalCount) || totalCount > 30_000_000) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The operational dependency total exceeds Petra's bounded contract.",
      );
    }
    const targetCoverage =
      targets.length > selectedTargets.length ? "truncated" : "complete";
    return {
      scope: "registered_exact_operational_dependents",
      target_limit: SEMANTIC_TARGET_LIMIT,
      per_adapter_ref_limit: OPERATIONAL_ADAPTER_MAX_REFS,
      target_total_count: targets.length,
      target_returned_count: selectedTargets.length,
      target_coverage: targetCoverage,
      registry: [
        {
          adapter_kind: "work_input_binding",
          authority_source: "current_work_heads_with_immutable_input_bindings",
          dependent_semantic_key: "petra.work-unit",
        },
        {
          adapter_kind: "work_output",
          authority_source: "immutable_worker_output_manifests_for_bound_work",
          dependent_semantic_key: "petra.worker-output-manifest",
        },
        {
          adapter_kind: "interaction_delivery",
          authority_source:
            "immutable_interaction_replay_records_for_bound_work",
          dependent_semantic_key: "petra.interaction-replay-record",
        },
      ],
      target_assessments:
        targetAssessments as PetraProjectHistoryImpactViewV14["content"]["operational_dependency_impact"]["target_assessments"],
      summary: {
        registered_adapter_count: 3,
        assessed_target_count: selectedTargets.length,
        supported_target_count: targetAssessments.filter(
          ({ adapter_state }) => adapter_state === "registered",
        ).length,
        total_count: totalCount,
        coverage:
          targetCoverage === "truncated" ||
          groups.some(({ coverage }) => coverage === "truncated")
            ? "truncated"
            : "complete",
      },
      unknowns: [
        "work_without_exact_record_binding_is_excluded",
        "unresolved_target_record_authority_may_hide_bindings",
        "worker_output_effect_is_not_inferred",
        "interaction_delivery_effect_is_not_inferred",
        "transitive_operational_dependency_closure_is_not_composed",
        "cross_family_total_order_is_not_asserted",
      ],
    };
  }

  async #operationalWorkDestinationDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectHistoryOperationalDefinitionRef | undefined> {
    const result = await client.query<OperationalDestinationDefinitionRow>(
      `SELECT revision.payload AS definition_payload,
              revision.record_hash AS definition_record_hash
         FROM petra.projects AS project
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = definition.project_definition_id
          AND revision.revision = definition.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.definition_payload === null ||
      row.definition_record_hash === null
    ) {
      return undefined;
    }
    this.#contracts.assertValid(
      "project-definition",
      "1.0.0",
      row.definition_payload,
    );
    const definition = row.definition_payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content) ||
      row.definition_record_hash !== canonicalHash(definition)
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The current ProjectDefinition cannot authorize an operational destination.",
      );
    }
    if (!definition.content.supported_places.includes("work")) {
      return undefined;
    }
    return {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
  }

  async #operationalWorkInputGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRecord,
    workDestinationDefinition:
      ProjectHistoryOperationalDefinitionRef | undefined,
  ): Promise<ProjectHistoryOperationalAdapterGroup> {
    const result = await client.query<OperationalDependentRow>(
      `WITH matched AS (
         SELECT revision.payload AS dependent_payload,
                revision.record_hash AS dependent_record_hash,
                revision.payload AS work_payload,
                revision.record_hash AS work_record_hash,
                input.payload AS input_payload,
                input.record_hash AS input_record_hash,
                binding.position::text AS binding_position,
                binding.binding_name,
                binding.binding AS binding_payload,
                NULL::jsonb AS interaction_run_payload,
                NULL::text AS interaction_run_record_hash
           FROM petra.worker_input_bindings AS binding
           JOIN petra.worker_input_manifests AS input
             ON input.worker_input_manifest_id = binding.worker_input_manifest_id
            AND input.project_id = $1
           JOIN petra.work_units AS head
             ON head.work_unit_id = input.work_unit_id
            AND head.project_id = $1
            AND head.input_manifest_id = input.worker_input_manifest_id
           JOIN petra.work_unit_revisions AS revision
             ON revision.work_unit_id = head.work_unit_id
            AND revision.revision = head.current_revision
          WHERE binding.binding_kind = 'record'
            AND binding.record_id = $2
            AND binding.record_revision = $3
            AND binding.snapshot_hash = $4
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY dependent_payload ->> 'work_unit_id', binding_position::bigint
        LIMIT ${OPERATIONAL_ADAPTER_MAX_REFS}`,
      [projectId, target.object_id, target.revision, target.record_hash],
    );
    return this.#operationalGroup(
      "work_input_binding",
      "current_work_heads_with_immutable_input_bindings",
      result.rows.map((row) =>
        this.#operationalDependentRef(
          row,
          projectId,
          target,
          "work_input",
          workDestinationDefinition,
        ),
      ),
      result.rows[0]?.total_count,
    );
  }

  async #operationalWorkOutputGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRecord,
  ): Promise<ProjectHistoryOperationalAdapterGroup> {
    const result = await client.query<OperationalDependentRow>(
      `WITH matched AS (
         SELECT output.payload AS dependent_payload,
                output.record_hash AS dependent_record_hash,
                revision.payload AS work_payload,
                revision.record_hash AS work_record_hash,
                input.payload AS input_payload,
                input.record_hash AS input_record_hash,
                binding.position::text AS binding_position,
                binding.binding_name,
                binding.binding AS binding_payload,
                NULL::jsonb AS interaction_run_payload,
                NULL::text AS interaction_run_record_hash
           FROM petra.worker_input_bindings AS binding
           JOIN petra.worker_input_manifests AS input
             ON input.worker_input_manifest_id = binding.worker_input_manifest_id
            AND input.project_id = $1
           JOIN petra.work_units AS head
             ON head.work_unit_id = input.work_unit_id
            AND head.project_id = $1
            AND head.input_manifest_id = input.worker_input_manifest_id
           JOIN petra.work_unit_revisions AS revision
             ON revision.work_unit_id = head.work_unit_id
            AND revision.revision = head.current_revision
           JOIN petra.worker_output_manifests AS output
             ON output.work_unit_id = head.work_unit_id
            AND output.project_id = $1
            AND output.worker_input_manifest_id = input.worker_input_manifest_id
          WHERE binding.binding_kind = 'record'
            AND binding.record_id = $2
            AND binding.record_revision = $3
            AND binding.snapshot_hash = $4
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY dependent_payload ->> 'worker_output_manifest_id',
                 binding_position::bigint
        LIMIT ${OPERATIONAL_ADAPTER_MAX_REFS}`,
      [projectId, target.object_id, target.revision, target.record_hash],
    );
    return this.#operationalGroup(
      "work_output",
      "immutable_worker_output_manifests_for_bound_work",
      result.rows.map((row) =>
        this.#operationalDependentRef(row, projectId, target, "work_output"),
      ),
      result.rows[0]?.total_count,
    );
  }

  async #operationalInteractionDeliveryGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRecord,
  ): Promise<ProjectHistoryOperationalAdapterGroup> {
    const result = await client.query<OperationalDependentRow>(
      `WITH matched AS (
         SELECT replay.payload AS dependent_payload,
                replay.record_hash AS dependent_record_hash,
                work_revision.payload AS work_payload,
                work_revision.record_hash AS work_record_hash,
                input.payload AS input_payload,
                input.record_hash AS input_record_hash,
                binding.position::text AS binding_position,
                binding.binding_name,
                binding.binding AS binding_payload,
                run_revision.payload AS interaction_run_payload,
                run_revision.record_hash AS interaction_run_record_hash
           FROM petra.worker_input_bindings AS binding
           JOIN petra.worker_input_manifests AS input
             ON input.worker_input_manifest_id = binding.worker_input_manifest_id
            AND input.project_id = $1
           JOIN petra.work_units AS head
             ON head.work_unit_id = input.work_unit_id
            AND head.project_id = $1
            AND head.input_manifest_id = input.worker_input_manifest_id
           JOIN petra.interaction_runs AS run
             ON run.work_unit_id = head.work_unit_id
            AND run.project_id = $1
           JOIN petra.interaction_replay_records AS replay
             ON replay.interaction_run_id = run.interaction_run_id
            AND replay.project_id = $1
           JOIN petra.interaction_run_revisions AS run_revision
             ON run_revision.interaction_run_id = replay.interaction_run_id
            AND run_revision.revision = replay.interaction_run_revision
            AND run_revision.content_hash = replay.interaction_run_hash
           JOIN petra.work_unit_revisions AS work_revision
             ON work_revision.work_unit_id = run.work_unit_id
            AND work_revision.revision = run.work_unit_revision
            AND work_revision.project_id = $1
            AND work_revision.spec_hash = run.work_unit_spec_hash
          WHERE binding.binding_kind = 'record'
            AND binding.record_id = $2
            AND binding.record_revision = $3
            AND binding.snapshot_hash = $4
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY dependent_payload ->> 'interaction_replay_record_id',
                 binding_position::bigint
        LIMIT ${OPERATIONAL_ADAPTER_MAX_REFS}`,
      [projectId, target.object_id, target.revision, target.record_hash],
    );
    return this.#operationalGroup(
      "interaction_delivery",
      "immutable_interaction_replay_records_for_bound_work",
      result.rows.map((row) =>
        this.#operationalDependentRef(
          row,
          projectId,
          target,
          "interaction_delivery",
        ),
      ),
      result.rows[0]?.total_count,
    );
  }

  #operationalDependentRef(
    row: OperationalDependentRow,
    projectId: string,
    target: ProjectHistoryResolvedTargetRecord,
    kind: "work_input" | "work_output" | "interaction_delivery",
    workDestinationDefinition?: ProjectHistoryOperationalDefinitionRef,
  ): ProjectHistoryOperationalDependentRef {
    const input = record(row.input_payload, "operational WorkerInputManifest");
    const inputContent = objectMember(
      input,
      "content",
      "operational WorkerInputManifest",
    );
    this.#contracts.assertValid("worker-input-manifest", "1.0.0", input);
    const bindingPosition = this.#safeImpactPosition(
      row.binding_position,
      "operational input binding position",
    );
    const binding = record(row.binding_payload, "operational input binding");
    const inputs = member<unknown>(
      inputContent,
      "inputs",
      "operational WorkerInputManifest.content",
    );
    if (
      !Array.isArray(inputs) ||
      canonicalHash(input) !== row.input_record_hash ||
      canonicalHash(inputContent) !== input.content_hash ||
      input.project_id !== projectId ||
      binding.binding_kind !== "record" ||
      binding.name !== row.binding_name ||
      binding.record_id !== target.object_id ||
      binding.record_revision !== target.revision ||
      binding.snapshot_hash !== target.record_hash ||
      canonicalize(inputs[bindingPosition - 1]) !== canonicalize(binding)
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An operational dependency lost its exact immutable WorkerInputManifest binding.",
      );
    }

    const work = record(row.work_payload, "operational WorkUnit");
    const workSpec = objectMember(work, "spec", "operational WorkUnit");
    const inputRef = objectMember(
      workSpec,
      "input_manifest_ref",
      "operational WorkUnit.spec",
    );
    this.#contracts.assertValid("work-unit", "1.0.0", work);
    if (
      canonicalHash(work) !== row.work_record_hash ||
      canonicalHash(workSpec) !== work.spec_hash ||
      work.project_id !== projectId ||
      work.work_unit_id !== input.work_unit_id ||
      inputRef.worker_input_manifest_id !== input.worker_input_manifest_id ||
      inputRef.content_hash !== input.content_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An operational dependency lost its exact WorkUnit authority chain.",
      );
    }
    const workUnitRef = {
      work_unit_id: stringMember(work, "work_unit_id", "operational WorkUnit"),
      revision: numberMember(work, "revision", "operational WorkUnit"),
      spec_hash: stringMember(work, "spec_hash", "operational WorkUnit"),
      record_hash: row.work_record_hash,
    };
    const inputBindingRef = {
      worker_input_manifest_id: stringMember(
        input,
        "worker_input_manifest_id",
        "operational WorkerInputManifest",
      ),
      revision: 1 as const,
      content_hash: stringMember(
        input,
        "content_hash",
        "operational WorkerInputManifest",
      ),
      record_hash: row.input_record_hash,
      binding_position: bindingPosition,
      binding_name: row.binding_name,
      record_id: target.object_id,
      record_revision: target.revision,
      snapshot_hash: target.record_hash,
    };
    const relationPrefix = `input:${inputBindingRef.worker_input_manifest_id}/binding:${bindingPosition}`;

    if (kind === "work_input") {
      return {
        semantic_key: "petra.work-unit",
        object_id: workUnitRef.work_unit_id,
        revision: workUnitRef.revision,
        schema_name: "petra.work-unit",
        schema_version: "1.0.0",
        record_hash: row.work_record_hash,
        posture: "current",
        relation: "uses_exact_history_target_as_work_input",
        relation_identity: relationPrefix,
        work_unit_ref: workUnitRef,
        input_binding_ref: inputBindingRef,
        destination:
          workDestinationDefinition === undefined
            ? {
                state: "unavailable",
                reason_code: "project_work_route_authority_unavailable",
                reason:
                  "The current ProjectDefinition does not authorize the exact Project Work detail destination.",
              }
            : {
                state: "available",
                place_role: "work",
                task_intent: "inspect",
                object_ref: {
                  semantic_key: "petra.work-unit",
                  object_id: workUnitRef.work_unit_id,
                  revision: workUnitRef.revision,
                  record_hash: workUnitRef.record_hash,
                },
                route_authority: {
                  schema_name: "petra.project-work-view",
                  schema_version: "1.0.0",
                  view_kind: "detail",
                  authority_source:
                    "current_project_definition_and_project_work_view",
                },
                project_definition_ref: workDestinationDefinition,
              },
      };
    }

    const dependent = record(
      row.dependent_payload,
      kind === "work_output"
        ? "operational WorkerOutputManifest"
        : "operational InteractionReplayRecord",
    );
    if (kind === "work_output") {
      this.#contracts.assertValid("worker-output-manifest", "1.0.0", dependent);
      const outputContent = objectMember(
        dependent,
        "content",
        "operational WorkerOutputManifest",
      );
      if (
        canonicalHash(dependent) !== row.dependent_record_hash ||
        canonicalHash(outputContent) !== dependent.content_hash ||
        dependent.project_id !== projectId ||
        dependent.work_unit_id !== workUnitRef.work_unit_id ||
        dependent.worker_input_manifest_id !==
          inputBindingRef.worker_input_manifest_id ||
        dependent.worker_input_manifest_hash !== inputBindingRef.content_hash
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "An operational WorkerOutputManifest lost its exact bound Work authority.",
        );
      }
      const outputId = stringMember(
        dependent,
        "worker_output_manifest_id",
        "operational WorkerOutputManifest",
      );
      return {
        semantic_key: "petra.worker-output-manifest",
        object_id: outputId,
        revision: numberMember(
          dependent,
          "revision",
          "operational WorkerOutputManifest",
        ),
        schema_name: "petra.worker-output-manifest",
        schema_version: "1.0.0",
        content_hash: stringMember(
          dependent,
          "content_hash",
          "operational WorkerOutputManifest",
        ),
        record_hash: row.dependent_record_hash,
        posture: "immutable_revision",
        relation: "reports_output_for_work_using_exact_history_target",
        relation_identity: `${relationPrefix}/output:${outputId}`,
        work_unit_ref: workUnitRef,
        input_binding_ref: inputBindingRef,
        destination: {
          state: "unavailable",
          reason_code: "worker_output_manifest_route_not_registered",
          reason:
            "No exact Project-owned WorkerOutputManifest destination is registered.",
        },
      };
    }

    if (
      row.interaction_run_payload === null ||
      row.interaction_run_record_hash === null
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An interaction delivery dependency has no retained InteractionRun authority.",
      );
    }
    const interactionRun = record(
      row.interaction_run_payload,
      "operational InteractionRun",
    );
    const runContent = objectMember(
      interactionRun,
      "content",
      "operational InteractionRun",
    );
    const correlation = objectMember(
      runContent,
      "correlation",
      "operational InteractionRun.content",
    );
    const runWorkRef = objectMember(
      correlation,
      "work_unit_ref",
      "operational InteractionRun correlation",
    );
    this.#contracts.assertValid("interaction-run", "1.0.0", interactionRun);
    if (
      canonicalHash(interactionRun) !== row.interaction_run_record_hash ||
      canonicalHash(runContent) !== interactionRun.content_hash ||
      interactionRun.project_id !== projectId ||
      runWorkRef.work_unit_id !== workUnitRef.work_unit_id ||
      runWorkRef.revision !== workUnitRef.revision ||
      runWorkRef.spec_hash !== workUnitRef.spec_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An operational InteractionRun lost its exact bound WorkUnit authority.",
      );
    }
    this.#contracts.assertValid(
      "interaction-replay-record",
      "1.0.0",
      dependent,
    );
    const replayContent = objectMember(
      dependent,
      "content",
      "operational InteractionReplayRecord",
    );
    const replayRunRef = objectMember(
      dependent,
      "interaction_run_ref",
      "operational InteractionReplayRecord",
    );
    const observation = objectMember(
      replayContent,
      "work_unit_observation",
      "operational InteractionReplayRecord.content",
    );
    if (
      canonicalHash(dependent) !== row.dependent_record_hash ||
      canonicalHash(replayContent) !== dependent.content_hash ||
      dependent.project_id !== projectId ||
      replayRunRef.interaction_run_id !== interactionRun.interaction_run_id ||
      replayRunRef.revision !== interactionRun.revision ||
      replayRunRef.content_hash !== interactionRun.content_hash ||
      observation.work_unit_id !== workUnitRef.work_unit_id
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An InteractionReplayRecord lost its exact retained delivery authority chain.",
      );
    }
    const replayId = stringMember(
      dependent,
      "interaction_replay_record_id",
      "operational InteractionReplayRecord",
    );
    const interactionRunId = stringMember(
      interactionRun,
      "interaction_run_id",
      "operational InteractionRun",
    );
    return {
      semantic_key: "petra.interaction-replay-record",
      object_id: replayId,
      revision: numberMember(
        dependent,
        "revision",
        "operational InteractionReplayRecord",
      ),
      schema_name: "petra.interaction-replay-record",
      schema_version: "1.0.0",
      content_hash: stringMember(
        dependent,
        "content_hash",
        "operational InteractionReplayRecord",
      ),
      record_hash: row.dependent_record_hash,
      posture: "immutable_revision",
      relation: "delivers_interaction_for_work_using_exact_history_target",
      relation_identity: `${relationPrefix}/run:${interactionRunId}/replay:${replayId}`,
      work_unit_ref: workUnitRef,
      input_binding_ref: inputBindingRef,
      interaction_run_ref: {
        interaction_run_id: interactionRunId,
        revision: numberMember(
          interactionRun,
          "revision",
          "operational InteractionRun",
        ),
        content_hash: stringMember(
          interactionRun,
          "content_hash",
          "operational InteractionRun",
        ),
        record_hash: row.interaction_run_record_hash,
      },
      destination: {
        state: "unavailable",
        reason_code: "interaction_replay_record_route_not_registered",
        reason:
          "No exact Project-owned InteractionReplayRecord destination is registered; replay is not a ProjectThread binding.",
      },
    };
  }

  #operationalGroup(
    adapterKind: ProjectHistoryOperationalAdapterGroup["adapter_kind"],
    authoritySource: ProjectHistoryOperationalAdapterGroup["authority_source"],
    refs: ProjectHistoryOperationalDependentRef[],
    totalCountValue: string | undefined,
  ): ProjectHistoryOperationalAdapterGroup {
    const totalCount =
      totalCountValue === undefined
        ? 0
        : this.#safeImpactPosition(
            totalCountValue,
            `${adapterKind} operational dependency total`,
            true,
          );
    if (totalCount > 1_000_000 || refs.length > totalCount) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "An operational dependency group exceeds Petra's bounded contract.",
      );
    }
    return {
      adapter_kind: adapterKind,
      authority_source: authoritySource,
      relation_scope: "exact_target_record_binding",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    } as ProjectHistoryOperationalAdapterGroup;
  }

  async #semanticTargetAssessment(
    client: PoolClient,
    projectId: string,
    targetIndex: number,
    target: ProjectHistoryTargetRef,
  ): Promise<ProjectHistoryTargetAssessment> {
    if (!this.#registeredSemanticKey(target.semantic_key)) {
      return {
        target_index: targetIndex,
        target_ref: target,
        adapter_state: "no_registered_exact_adapter",
        reason:
          "No exact semantic-target adapter is registered for this semantic key.",
        groups: [],
      };
    }
    if (target.revision === undefined) {
      return {
        target_index: targetIndex,
        target_ref: target,
        adapter_state: "target_identity_incomplete",
        reason:
          "Registered semantic-target adapters require an immutable target revision.",
        groups: [],
      };
    }
    const resolvedTarget = await this.#resolveSemanticTarget(
      client,
      projectId,
      target,
    );
    if (resolvedTarget === undefined) {
      return {
        target_index: targetIndex,
        target_ref: target,
        adapter_state: "target_authority_unavailable",
        reason:
          "The exact immutable target authority is unavailable in this Project snapshot.",
        groups: [],
      };
    }
    const groups: ProjectHistorySemanticImpactAdapterGroup[] = [];
    if (
      resolvedTarget.semantic_key === "petra.change-set" ||
      resolvedTarget.semantic_key === "petra.approval"
    ) {
      groups.push(
        await this.#semanticChangeControlGroup(
          client,
          projectId,
          resolvedTarget,
        ),
      );
    } else if (
      resolvedTarget.semantic_key === "scientific.claim" ||
      resolvedTarget.semantic_key === "scientific.assertion"
    ) {
      groups.push(
        await this.#semanticChangeControlGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticReviewGroup(client, projectId, resolvedTarget),
        await this.#semanticGroundedResponseGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticCompositionGroup(client, projectId, resolvedTarget),
      );
    } else if (resolvedTarget.semantic_key === "petra.project-source") {
      groups.push(
        await this.#semanticProjectSourceLifecycleGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticProjectSourceDependencyGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticProjectSourceReplacementLineageGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticProjectSourceEffectiveHeadGroup(
          client,
          projectId,
          resolvedTarget,
        ),
      );
    } else if (
      resolvedTarget.semantic_key === "petra.project-source-replacement"
    ) {
      groups.push(
        await this.#semanticProjectSourceReplacementLineageGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticProjectSourceReplacementReceiptGroup(
          client,
          projectId,
          resolvedTarget,
        ),
        await this.#semanticProjectSourceEffectiveHeadGroup(
          client,
          projectId,
          resolvedTarget,
        ),
      );
    }
    return {
      target_index: targetIndex,
      target_ref: target,
      adapter_state: "registered",
      resolved_target_ref: resolvedTarget,
      groups:
        groups as unknown as ProjectHistoryRegisteredTargetAssessment["groups"],
    };
  }

  #registeredSemanticKey(
    semanticKey: string,
  ): semanticKey is ProjectHistoryResolvedTargetRef["semantic_key"] {
    return [
      "petra.change-set",
      "petra.approval",
      "scientific.claim",
      "scientific.assertion",
      "petra.project-source",
      "petra.project-source-replacement",
    ].includes(semanticKey);
  }

  async #resolveSemanticTarget(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryTargetRef,
  ): Promise<ProjectHistoryResolvedTargetRef | undefined> {
    const targetRevision = target.revision;
    if (targetRevision === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A registered semantic target has no immutable revision.",
      );
    }
    let result;
    let contractName: string;
    let schemaName: ProjectHistoryResolvedTargetRef["schema_name"];
    let idField: string;
    switch (target.semantic_key) {
      case "petra.change-set":
        contractName = "change-set";
        schemaName = "petra.change-set";
        idField = "change_set_id";
        result = await client.query<SemanticTargetRow>(
          `SELECT payload, content_hash, record_hash
             FROM petra.change_sets
            WHERE project_id = $1 AND change_set_id = $2 AND revision = $3`,
          [projectId, target.object_id, targetRevision],
        );
        break;
      case "petra.approval":
        contractName = "approval";
        schemaName = "petra.approval";
        idField = "approval_id";
        result = await client.query<SemanticTargetRow>(
          `SELECT approval.payload, NULL::text AS content_hash,
                  approval.record_hash
             FROM petra.approvals AS approval
             JOIN petra.change_sets AS change_set
               ON change_set.change_set_id = approval.change_set_id
            WHERE change_set.project_id = $1
              AND approval.approval_id = $2
              AND approval.revision = $3`,
          [projectId, target.object_id, targetRevision],
        );
        break;
      case "scientific.claim":
      case "scientific.assertion": {
        const evidenceKind =
          target.semantic_key === "scientific.claim" ? "claim" : "assertion";
        contractName = evidenceKind;
        schemaName = `petra.${evidenceKind}`;
        idField = `${evidenceKind}_id`;
        result = await client.query<SemanticTargetRow>(
          `SELECT payload, NULL::text AS content_hash, record_hash
             FROM petra.evidence_entity_revisions
            WHERE evidence_id = $1 AND evidence_kind = $2 AND revision = $3`,
          [target.object_id, evidenceKind, targetRevision],
        );
        break;
      }
      case "petra.project-source":
        contractName = "project-source";
        schemaName = "petra.project-source";
        idField = "project_source_id";
        result = await client.query<SemanticTargetRow>(
          `SELECT payload, content_hash, record_hash
             FROM petra.project_source_revisions
            WHERE project_id = $1
              AND project_source_id = $2
              AND revision = $3`,
          [projectId, target.object_id, targetRevision],
        );
        break;
      case "petra.project-source-replacement":
        contractName = "project-source-replacement";
        schemaName = "petra.project-source-replacement";
        idField = "project_source_replacement_id";
        result = await client.query<SemanticTargetRow>(
          `SELECT payload, content_hash, record_hash
             FROM petra.project_source_replacements
            WHERE project_id = $1
              AND project_source_replacement_id = $2
              AND revision = $3`,
          [projectId, target.object_id, targetRevision],
        );
        break;
      default:
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
          `No exact semantic target resolver is registered for ${target.semantic_key}.`,
        );
    }
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    const payload = record(row.payload, "semantic target");
    const schemaVersion = payload.schema_version;
    if (
      typeof schemaVersion !== "string" ||
      (schemaVersion !== "1.0.0" &&
        !(schemaName === "petra.change-set" && schemaVersion === "1.1.0"))
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A registered semantic target uses an unsupported authority contract version.",
      );
    }
    this.#contracts.assertValid(contractName, schemaVersion, payload);
    if (
      payload.schema_name !== schemaName ||
      payload.schema_version !== schemaVersion ||
      payload[idField] !== target.object_id ||
      payload.revision !== targetRevision ||
      canonicalHash(payload) !== row.record_hash ||
      (row.content_hash !== null &&
        payload.content_hash !== row.content_hash) ||
      (target.content_hash !== undefined &&
        target.content_hash !== row.content_hash) ||
      (target.record_hash !== undefined &&
        target.record_hash !== row.record_hash)
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A registered semantic target differs from the exact immutable authority record.",
      );
    }
    return {
      semantic_key: target.semantic_key,
      object_id: target.object_id,
      revision: targetRevision,
      schema_name: schemaName,
      schema_version: schemaVersion,
      ...(row.content_hash === null ? {} : { content_hash: row.content_hash }),
      record_hash: row.record_hash,
    };
  }

  async #semanticChangeControlGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    let result;
    if (target.semantic_key === "petra.change-set") {
      if (target.content_hash === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "An exact ChangeSet target is missing its content hash.",
        );
      }
      result = await client.query<SemanticDependentRow>(
        `WITH matched AS (
           SELECT 'petra.approval'::text AS semantic_key,
                  approval.approval_id AS object_id,
                  approval.revision::text AS revision,
                  'petra.approval'::text AS schema_name,
                  '1.0.0'::text AS schema_version,
                  NULL::text AS content_hash,
                  approval.record_hash, approval.payload,
                  'immutable_revision'::text AS posture,
                  'approves_exact_change_set'::text AS relation,
                  'approval:' || approval.approval_id AS relation_identity
             FROM petra.approvals AS approval
             JOIN petra.change_sets AS change_set
               ON change_set.change_set_id = approval.change_set_id
            WHERE change_set.project_id = $1
              AND approval.change_set_id = $2
              AND approval.change_set_revision = $3
              AND approval.change_set_content_hash = $4
           UNION ALL
           SELECT CASE evidence_authorization.evidence_kind
                    WHEN 'claim' THEN 'scientific.claim'
                    ELSE 'scientific.assertion'
                  END,
                  revision.evidence_id, revision.revision::text,
                  revision.schema_name, revision.schema_version,
                  NULL::text, revision.record_hash, revision.payload,
                  CASE WHEN head.current_revision = revision.revision
                    THEN 'current' ELSE 'historical' END,
                  'authorized_by_exact_change_set',
                  'authorization:' || revision.evidence_id || ':' ||
                    revision.revision::text
             FROM petra.evidence_revision_authorizations AS evidence_authorization
             JOIN petra.change_sets AS change_set
               ON change_set.change_set_id = evidence_authorization.change_set_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = evidence_authorization.evidence_id
              AND revision.evidence_kind = evidence_authorization.evidence_kind
              AND revision.revision = evidence_authorization.evidence_revision
             JOIN petra.evidence_entities AS head
               ON head.evidence_id = revision.evidence_id
              AND head.evidence_kind = revision.evidence_kind
            WHERE change_set.project_id = $1
              AND evidence_authorization.change_set_id = $2
              AND evidence_authorization.change_set_revision = $3
              AND evidence_authorization.change_set_content_hash = $4
         )
         SELECT matched.*, (count(*) OVER ())::text AS total_count
           FROM matched
          ORDER BY semantic_key, object_id, revision
          LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
        [projectId, target.object_id, target.revision, target.content_hash],
      );
    } else if (target.semantic_key === "petra.approval") {
      result = await client.query<SemanticDependentRow>(
        `WITH matched AS (
           SELECT CASE evidence_authorization.evidence_kind
                    WHEN 'claim' THEN 'scientific.claim'
                    ELSE 'scientific.assertion'
                  END AS semantic_key,
                  revision.evidence_id AS object_id,
                  revision.revision::text AS revision,
                  revision.schema_name, revision.schema_version,
                  NULL::text AS content_hash,
                  revision.record_hash, revision.payload,
                  CASE WHEN head.current_revision = revision.revision
                    THEN 'current' ELSE 'historical' END AS posture,
                  'authorized_by_exact_approval'::text AS relation,
                  'authorization:' || revision.evidence_id || ':' ||
                    revision.revision::text AS relation_identity
             FROM petra.evidence_revision_authorizations AS evidence_authorization
             JOIN petra.approvals AS approval
               ON approval.approval_id = evidence_authorization.approval_id
              AND approval.revision = evidence_authorization.approval_revision
             JOIN petra.change_sets AS change_set
               ON change_set.change_set_id = approval.change_set_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = evidence_authorization.evidence_id
              AND revision.evidence_kind = evidence_authorization.evidence_kind
              AND revision.revision = evidence_authorization.evidence_revision
             JOIN petra.evidence_entities AS head
               ON head.evidence_id = revision.evidence_id
              AND head.evidence_kind = revision.evidence_kind
            WHERE change_set.project_id = $1
              AND approval.approval_id = $2
              AND approval.revision = $3
              AND approval.record_hash = $4
         )
         SELECT matched.*, (count(*) OVER ())::text AS total_count
           FROM matched
          ORDER BY semantic_key, object_id, revision
          LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
        [projectId, target.object_id, target.revision, target.record_hash],
      );
    } else {
      const evidenceKind =
        target.semantic_key === "scientific.claim" ? "claim" : "assertion";
      result = await client.query<SemanticDependentRow>(
        `WITH matched AS (
           SELECT 'petra.change-set'::text AS semantic_key,
                  change_set.change_set_id AS object_id,
                  change_set.revision::text AS revision,
                  'petra.change-set'::text AS schema_name,
                  change_set.payload ->> 'schema_version' AS schema_version,
                  change_set.content_hash, change_set.record_hash,
                  change_set.payload,
                  'immutable_revision'::text AS posture,
                  'proposes_promotion_from_exact_evidence_revision'::text
                    AS relation,
                  'operation:' || operation.position::text AS relation_identity
             FROM petra.change_set_operations AS operation
             JOIN petra.change_sets AS change_set
               ON change_set.change_set_id = operation.change_set_id
              AND change_set.revision = operation.change_set_revision
             JOIN petra.evidence_entity_revisions AS target_revision
               ON target_revision.evidence_id = operation.target_id
              AND target_revision.evidence_kind = operation.target_evidence_kind
              AND target_revision.revision = operation.base_revision
            WHERE change_set.project_id = $1
              AND operation.target_evidence_kind = $2
              AND operation.target_id = $3
              AND operation.base_revision = $4
              AND target_revision.record_hash = $5
         )
         SELECT matched.*, (count(*) OVER ())::text AS total_count
           FROM matched
          ORDER BY object_id, revision, relation_identity
          LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
        [
          projectId,
          evidenceKind,
          target.object_id,
          target.revision,
          target.record_hash,
        ],
      );
    }
    return this.#semanticGroup(
      "change_control",
      "immutable_change_control_target_bindings",
      result.rows,
    );
  }

  async #semanticReviewGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const evidenceKind =
      target.semantic_key === "scientific.claim" ? "claim" : "assertion";
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.review-session'::text AS semantic_key,
                revision.review_session_id AS object_id,
                revision.revision::text AS revision,
                'petra.review-session'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                revision.content_hash, revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END AS posture,
                'contains_exact_review_candidate'::text AS relation,
                'member:' || binding.member_position::text || '/binding:' ||
                  binding.binding_position::text AS relation_identity
           FROM petra.review_session_candidate_bindings AS binding
           JOIN petra.review_session_revisions AS revision
             ON revision.review_session_id = binding.review_session_id
            AND revision.revision = binding.review_session_revision
           JOIN petra.review_sessions AS head
             ON head.review_session_id = revision.review_session_id
          WHERE head.project_id = $1
            AND binding.evidence_kind = $2
            AND binding.evidence_id = $3
            AND binding.evidence_revision = $4
            AND binding.evidence_record_hash = $5
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY object_id, revision, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        evidenceKind,
        target.object_id,
        target.revision,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "review_membership",
      "immutable_review_candidate_bindings",
      result.rows,
    );
  }

  async #semanticGroundedResponseGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const evidenceKind =
      target.semantic_key === "scientific.claim" ? "claim" : "assertion";
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.grounded-response'::text AS semantic_key,
                revision.grounded_response_id AS object_id,
                revision.revision::text AS revision,
                'petra.grounded-response'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                revision.content_hash, revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END AS posture,
                'depends_on_exact_grounded_evidence'::text AS relation,
                'dependency:' || dependency.position::text AS relation_identity
           FROM petra.grounded_response_dependencies AS dependency
           JOIN petra.grounded_response_revisions AS revision
             ON revision.grounded_response_id = dependency.grounded_response_id
            AND revision.revision = dependency.response_revision
           JOIN petra.grounded_responses AS head
             ON head.grounded_response_id = revision.grounded_response_id
          WHERE revision.project_id = $1
            AND dependency.object_kind = $2
            AND dependency.object_id = $3
            AND dependency.object_revision = $4
            AND dependency.object_hash = $5
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY object_id, revision, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        evidenceKind,
        target.object_id,
        target.revision,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "grounded_response_dependency",
      "immutable_grounded_response_dependencies",
      result.rows,
    );
  }

  async #semanticCompositionGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const evidenceKind =
      target.semantic_key === "scientific.claim" ? "claim" : "assertion";
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.composition-request'::text AS semantic_key,
                request.composition_request_id AS object_id,
                request.revision::text AS revision,
                'petra.composition-request'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                request.content_hash, request.record_hash, request.payload,
                'immutable_revision'::text AS posture,
                'selects_exact_composition_subject'::text AS relation,
                'subject:' || subject.position::text AS relation_identity
           FROM petra.composition_request_subjects AS subject
           JOIN petra.composition_requests AS request
             ON request.composition_request_id = subject.composition_request_id
          WHERE request.project_id = $1
            AND subject.object_kind = $2
            AND subject.object_id = $3
            AND subject.object_revision = $4
            AND subject.object_hash = $5
         UNION ALL
         SELECT 'petra.composition-plan', plan.composition_plan_id,
                plan.revision::text, 'petra.composition-plan', '1.0.0',
                plan.content_hash, plan.record_hash, plan.payload,
                'immutable_revision', 'uses_exact_composition_evidence',
                'section:' || evidence.section_position::text || '/move:' ||
                  evidence.move_position::text || '/evidence:' ||
                  evidence.evidence_position::text
           FROM petra.composition_plan_evidence_refs AS evidence
           JOIN petra.composition_plans AS plan
             ON plan.composition_plan_id = evidence.composition_plan_id
          WHERE plan.project_id = $1
            AND evidence.object_kind = $2
            AND evidence.object_id = $3
            AND evidence.object_revision = $4
            AND evidence.object_hash = $5
         UNION ALL
         SELECT 'petra.provenance-map', map.provenance_map_id,
                map.revision::text, 'petra.provenance-map', '1.0.0',
                map.content_hash, map.record_hash, map.payload,
                'immutable_revision', 'maps_exact_provenance_basis',
                'mapping:' || basis.mapping_position::text || '/basis:' ||
                  basis.basis_position::text
           FROM petra.provenance_bases AS basis
           JOIN petra.provenance_maps AS map
             ON map.provenance_map_id = basis.provenance_map_id
            AND map.revision = basis.provenance_map_revision
          WHERE map.project_id = $1
            AND basis.object_kind = $2
            AND basis.object_id = $3
            AND basis.object_revision = $4
            AND basis.object_hash = $5
         UNION ALL
         SELECT 'petra.draft-artifact', revision.draft_artifact_id,
                revision.revision::text, 'petra.draft-artifact', '1.0.0',
                revision.content_hash, revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END,
                'retains_exact_draft_authority_dependency',
                'dependency:' || dependency.position::text
           FROM petra.draft_authority_dependencies AS dependency
           JOIN petra.draft_artifact_revisions AS revision
             ON revision.draft_artifact_id = dependency.draft_artifact_id
            AND revision.revision = dependency.draft_artifact_revision
           JOIN petra.draft_artifacts AS head
             ON head.draft_artifact_id = revision.draft_artifact_id
          WHERE revision.project_id = $1
            AND dependency.object_kind = $2
            AND dependency.object_id = $3
            AND dependency.object_revision = $4
            AND dependency.object_hash = $5
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY semantic_key, object_id, revision, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        evidenceKind,
        target.object_id,
        target.revision,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "composition_lineage",
      "immutable_composition_target_bindings",
      result.rows,
    );
  }

  async #semanticProjectSourceLifecycleGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.project-source-lifecycle-receipt'::text AS semantic_key,
                receipt.project_source_lifecycle_receipt_id AS object_id,
                receipt.revision::text AS revision,
                'petra.project-source-lifecycle-receipt'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                receipt.content_hash, receipt.record_hash, receipt.payload,
                'immutable_revision'::text AS posture,
                CASE WHEN receipt.prior_revision = $3
                  THEN 'records_exact_source_prior_revision'
                  ELSE 'records_exact_source_resulting_revision'
                END::text AS relation,
                'lifecycle-receipt:' ||
                  receipt.project_source_lifecycle_receipt_id || ':' ||
                  CASE WHEN receipt.prior_revision = $3
                    THEN 'prior' ELSE 'resulting' END AS relation_identity
           FROM petra.project_source_lifecycle_receipts AS receipt
          WHERE receipt.project_id = $1
            AND receipt.project_source_id = $2
            AND (
              (receipt.prior_revision = $3
                AND receipt.prior_content_hash = $4
                AND receipt.prior_record_hash = $5)
              OR
              (receipt.resulting_revision = $3
                AND receipt.resulting_content_hash = $4
                AND receipt.resulting_record_hash = $5)
            )
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY object_id, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        target.object_id,
        target.revision,
        target.content_hash,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "project_source_lifecycle",
      "immutable_project_source_lifecycle_receipts",
      result.rows,
    );
  }

  async #semanticProjectSourceDependencyGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const result = await client.query<SemanticDependentRow>(
      `WITH source_target AS (
         SELECT artifact_manifest_id, work_version_id,
                work_version_revision, work_version_record_hash
           FROM petra.project_source_revisions
          WHERE project_id = $1
            AND project_source_id = $2
            AND revision = $3
            AND content_hash = $4
            AND record_hash = $5
       ), source_evidence AS (
         SELECT DISTINCT 'claim'::text AS evidence_kind,
                binding.claim_id AS evidence_id,
                binding.claim_revision AS evidence_revision
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
           JOIN petra.source_spans AS span
             ON span.parsed_document_id = document.parsed_document_id
           JOIN petra.claim_source_spans AS binding
             ON binding.source_span_id = span.source_span_id
         UNION
         SELECT DISTINCT 'assertion', binding.assertion_id,
                binding.assertion_revision
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
           JOIN petra.source_spans AS span
             ON span.parsed_document_id = document.parsed_document_id
           JOIN petra.assertion_provenance AS binding
             ON binding.source_span_id = span.source_span_id
            AND binding.provenance_kind = 'source_span'
       ), source_objects AS (
         SELECT 'source_span'::text AS object_kind,
                span.source_span_id AS object_id,
                span.revision AS object_revision,
                span.record_hash AS object_hash
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
           JOIN petra.source_spans AS span
             ON span.parsed_document_id = document.parsed_document_id
         UNION
         SELECT evidence.evidence_kind, revision.evidence_id,
                revision.revision, revision.record_hash
           FROM source_evidence AS evidence
           JOIN petra.evidence_entity_revisions AS revision
             ON revision.evidence_kind = evidence.evidence_kind
            AND revision.evidence_id = evidence.evidence_id
            AND revision.revision = evidence.evidence_revision
         UNION
         SELECT 'work_version', source.work_version_id,
                source.work_version_revision, source.work_version_record_hash
           FROM source_target AS source
       ), matched AS (
         SELECT 'petra.parsed-document'::text AS semantic_key,
                document.parsed_document_id AS object_id,
                document.revision::text AS revision,
                'petra.parsed-document'::text AS schema_name,
                (document.payload ->> 'schema_version')::text AS schema_version,
                NULL::text AS content_hash, document.record_hash,
                document.payload, 'current'::text AS posture,
                'parses_exact_source_artifact'::text AS relation,
                'source-artifact:' || source.artifact_manifest_id AS relation_identity
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
         UNION ALL
         SELECT 'petra.structural-block', block.structural_block_id,
                block.revision::text, 'petra.structural-block',
                block.payload ->> 'schema_version', NULL::text,
                block.record_hash, block.payload, 'current',
                'structures_exact_source_artifact',
                'source-artifact:' || source.artifact_manifest_id
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
           JOIN petra.structural_blocks AS block
             ON block.parsed_document_id = document.parsed_document_id
         UNION ALL
         SELECT 'petra.source-span', span.source_span_id,
                span.revision::text, 'petra.source-span',
                span.payload ->> 'schema_version', NULL::text,
                span.record_hash, span.payload, 'current',
                'locates_span_in_exact_source_artifact',
                'source-artifact:' || source.artifact_manifest_id
           FROM source_target AS source
           JOIN petra.parsed_documents AS document
             ON document.source_artifact_manifest_id = source.artifact_manifest_id
           JOIN petra.source_spans AS span
             ON span.parsed_document_id = document.parsed_document_id
         UNION
         SELECT 'scientific.claim', revision.evidence_id,
                revision.revision::text, 'petra.claim',
                revision.payload ->> 'schema_version', NULL::text,
                revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END,
                'derives_claim_from_exact_source_artifact',
                'source-artifact:' || source.artifact_manifest_id
           FROM source_target AS source
           JOIN source_evidence AS evidence ON evidence.evidence_kind = 'claim'
           JOIN petra.evidence_entity_revisions AS revision
             ON revision.evidence_kind = evidence.evidence_kind
            AND revision.evidence_id = evidence.evidence_id
            AND revision.revision = evidence.evidence_revision
           JOIN petra.evidence_entities AS head
             ON head.evidence_id = revision.evidence_id
            AND head.evidence_kind = revision.evidence_kind
         UNION
         SELECT 'scientific.assertion', revision.evidence_id,
                revision.revision::text, 'petra.assertion',
                revision.payload ->> 'schema_version', NULL::text,
                revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END,
                'derives_assertion_from_exact_source_artifact',
                'source-artifact:' || source.artifact_manifest_id
           FROM source_target AS source
           JOIN source_evidence AS evidence
             ON evidence.evidence_kind = 'assertion'
           JOIN petra.evidence_entity_revisions AS revision
             ON revision.evidence_kind = evidence.evidence_kind
            AND revision.evidence_id = evidence.evidence_id
            AND revision.revision = evidence.evidence_revision
           JOIN petra.evidence_entities AS head
             ON head.evidence_id = revision.evidence_id
            AND head.evidence_kind = revision.evidence_kind
         UNION
         SELECT 'petra.work-unit', revision.work_unit_id,
                revision.revision::text, 'petra.work-unit',
                revision.payload ->> 'schema_version', NULL::text,
                revision.record_hash, revision.payload, 'current',
                'uses_exact_source_artifact_in_active_work',
                'artifact:' || artifact.artifact_id
           FROM source_target AS source
           JOIN petra.artifact_manifests AS manifest
             ON manifest.artifact_manifest_id = source.artifact_manifest_id
           CROSS JOIN LATERAL (
             SELECT manifest.artifact_id
           ) AS artifact
           JOIN petra.worker_input_bindings AS binding
             ON binding.binding_kind = 'artifact'
            AND binding.artifact_id = artifact.artifact_id
           JOIN petra.worker_input_manifests AS input
             ON input.worker_input_manifest_id = binding.worker_input_manifest_id
            AND input.project_id = $1
           JOIN petra.work_units AS head
             ON head.work_unit_id = input.work_unit_id
           JOIN petra.work_unit_revisions AS revision
             ON revision.work_unit_id = head.work_unit_id
            AND revision.revision = head.current_revision
            AND revision.state IN ('requested', 'queued', 'running')
         UNION
         SELECT 'petra.review-session', revision.review_session_id,
                revision.revision::text, 'petra.review-session',
                revision.payload ->> 'schema_version', NULL::text,
                revision.record_hash, revision.payload, 'current',
                'reviews_evidence_from_exact_source_artifact',
                'member:' || binding.member_position::text || '/binding:' ||
                  binding.binding_position::text
           FROM source_evidence AS evidence
           JOIN petra.review_session_candidate_bindings AS binding
             ON binding.evidence_kind = evidence.evidence_kind
            AND binding.evidence_id = evidence.evidence_id
            AND binding.evidence_revision = evidence.evidence_revision
           JOIN petra.review_session_revisions AS revision
             ON revision.review_session_id = binding.review_session_id
            AND revision.revision = binding.review_session_revision
            AND revision.lifecycle = 'open'
           JOIN petra.review_sessions AS head
             ON head.review_session_id = revision.review_session_id
            AND head.project_id = $1
            AND head.current_revision = revision.revision
         UNION
         SELECT 'petra.grounded-response', revision.grounded_response_id,
                revision.revision::text, 'petra.grounded-response',
                revision.payload ->> 'schema_version', revision.content_hash,
                revision.record_hash, revision.payload,
                CASE WHEN head.current_revision = revision.revision
                  THEN 'current' ELSE 'historical' END,
                'depends_on_exact_source_authority',
                'dependency:' || dependency.position::text
           FROM source_objects AS object
           JOIN petra.grounded_response_dependencies AS dependency
             ON dependency.object_kind = object.object_kind
            AND dependency.object_id = object.object_id
            AND dependency.object_revision = object.object_revision
            AND dependency.object_hash = object.object_hash
           JOIN petra.grounded_response_revisions AS revision
             ON revision.grounded_response_id = dependency.grounded_response_id
            AND revision.revision = dependency.response_revision
            AND revision.project_id = $1
           JOIN petra.grounded_responses AS head
             ON head.grounded_response_id = revision.grounded_response_id
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY semantic_key, object_id, revision, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        target.object_id,
        target.revision,
        target.content_hash,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "project_source_dependency",
      "immutable_project_source_dependency_bindings",
      result.rows,
    );
  }

  async #semanticProjectSourceReplacementLineageGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const result =
      target.semantic_key === "petra.project-source"
        ? await client.query<SemanticDependentRow>(
            `WITH matched AS (
               SELECT 'petra.project-source-replacement'::text AS semantic_key,
                      replacement.project_source_replacement_id AS object_id,
                      replacement.revision::text AS revision,
                      'petra.project-source-replacement'::text AS schema_name,
                      '1.0.0'::text AS schema_version,
                      replacement.content_hash, replacement.record_hash,
                      replacement.payload, 'immutable_revision'::text AS posture,
                      CASE WHEN replacement.replaced_project_source_id = $2
                        THEN 'retains_exact_replaced_source'
                        ELSE 'retains_exact_replacement_source'
                      END::text AS relation,
                      'replacement:' ||
                        replacement.project_source_replacement_id || ':' ||
                        CASE WHEN replacement.replaced_project_source_id = $2
                          THEN 'predecessor' ELSE 'successor' END AS relation_identity
                 FROM petra.project_source_replacements AS replacement
                WHERE replacement.project_id = $1
                  AND (
                    (replacement.replaced_project_source_id = $2
                      AND replacement.replaced_revision = $3
                      AND replacement.replaced_content_hash = $4
                      AND replacement.replaced_record_hash = $5)
                    OR
                    (replacement.replacement_project_source_id = $2
                      AND replacement.replacement_revision = $3
                      AND replacement.replacement_content_hash = $4
                      AND replacement.replacement_record_hash = $5)
                  )
             )
             SELECT matched.*, (count(*) OVER ())::text AS total_count
               FROM matched
              ORDER BY object_id, relation_identity
              LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
            [
              projectId,
              target.object_id,
              target.revision,
              target.content_hash,
              target.record_hash,
            ],
          )
        : await client.query<SemanticDependentRow>(
            `WITH matched AS (
               SELECT 'petra.project-source-replacement-retraction'::text
                        AS semantic_key,
                      retraction.project_source_replacement_retraction_id
                        AS object_id,
                      retraction.revision::text AS revision,
                      'petra.project-source-replacement-retraction'::text
                        AS schema_name,
                      '1.0.0'::text AS schema_version,
                      retraction.content_hash, retraction.record_hash,
                      retraction.payload, 'immutable_revision'::text AS posture,
                      'retracts_exact_source_replacement'::text AS relation,
                      'replacement-retraction:' ||
                        retraction.project_source_replacement_retraction_id
                        AS relation_identity
                 FROM petra.project_source_replacement_retractions AS retraction
                WHERE retraction.project_id = $1
                  AND retraction.project_source_replacement_id = $2
                  AND retraction.replacement_revision = $3
                  AND retraction.replacement_content_hash = $4
                  AND retraction.replacement_record_hash = $5
             )
             SELECT matched.*, (count(*) OVER ())::text AS total_count
               FROM matched
              ORDER BY object_id
              LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
            [
              projectId,
              target.object_id,
              target.revision,
              target.content_hash,
              target.record_hash,
            ],
          );
    return this.#semanticGroup(
      "project_source_replacement_lineage",
      "immutable_project_source_replacement_bindings",
      result.rows,
    );
  }

  async #semanticProjectSourceReplacementReceiptGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.project-source-replacement-receipt'::text AS semantic_key,
                receipt.project_source_replacement_receipt_id AS object_id,
                receipt.revision::text AS revision,
                'petra.project-source-replacement-receipt'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                receipt.content_hash, receipt.record_hash, receipt.payload,
                'immutable_revision'::text AS posture,
                'records_exact_source_replacement_command'::text AS relation,
                'replacement-receipt:' ||
                  receipt.project_source_replacement_receipt_id AS relation_identity
           FROM petra.project_source_replacement_receipts AS receipt
          WHERE receipt.project_id = $1
            AND receipt.project_source_replacement_id = $2
            AND receipt.replacement_revision = $3
            AND receipt.replacement_content_hash = $4
            AND receipt.replacement_record_hash = $5
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY object_id
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        target.object_id,
        target.revision,
        target.content_hash,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "project_source_replacement_receipt",
      "immutable_project_source_replacement_receipts",
      result.rows,
    );
  }

  async #semanticProjectSourceEffectiveHeadGroup(
    client: PoolClient,
    projectId: string,
    target: ProjectHistoryResolvedTargetRef,
  ): Promise<ProjectHistorySemanticImpactAdapterGroup> {
    const targetPredicate =
      target.semantic_key === "petra.project-source"
        ? `AND (
             (replacement.replaced_project_source_id = $2
               AND replacement.replaced_revision = $3
               AND replacement.replaced_content_hash = $4
               AND replacement.replaced_record_hash = $5)
             OR
             (replacement.replacement_project_source_id = $2
               AND replacement.replacement_revision = $3
               AND replacement.replacement_content_hash = $4
               AND replacement.replacement_record_hash = $5)
           )`
        : `AND replacement.project_source_replacement_id = $2
           AND replacement.revision = $3
           AND replacement.content_hash = $4
           AND replacement.record_hash = $5`;
    const result = await client.query<SemanticDependentRow>(
      `WITH matched AS (
         SELECT 'petra.project-source-replacement'::text AS semantic_key,
                replacement.project_source_replacement_id AS object_id,
                replacement.revision::text AS revision,
                'petra.project-source-replacement'::text AS schema_name,
                '1.0.0'::text AS schema_version,
                replacement.content_hash, replacement.record_hash,
                replacement.payload, 'current'::text AS posture,
                CASE WHEN head.state = 'active'
                  THEN 'is_current_active_replacement_head'
                  ELSE 'is_current_retracted_replacement_head'
                END::text AS relation,
                'replacement-head:' || head.project_id || ':' ||
                  head.replaced_project_source_id || ':' ||
                  head.head_revision::text || ':' || head.state
                  AS relation_identity
           FROM petra.project_source_replacement_heads AS head
           JOIN petra.project_source_replacements AS replacement
             ON replacement.project_source_replacement_id =
                head.current_project_source_replacement_id
            AND replacement.project_id = head.project_id
            AND replacement.replaced_project_source_id =
                head.replaced_project_source_id
          WHERE head.project_id = $1
            ${targetPredicate}
       )
       SELECT matched.*, (count(*) OVER ())::text AS total_count
         FROM matched
        ORDER BY object_id, relation_identity
        LIMIT ${SEMANTIC_ADAPTER_MAX_REFS}`,
      [
        projectId,
        target.object_id,
        target.revision,
        target.content_hash,
        target.record_hash,
      ],
    );
    return this.#semanticGroup(
      "project_source_effective_head",
      "current_project_source_replacement_heads",
      result.rows,
    );
  }

  #semanticGroup(
    adapterKind: ProjectHistorySemanticImpactAdapterGroup["adapter_kind"],
    authoritySource: ProjectHistorySemanticImpactAdapterGroup["authority_source"],
    rows: readonly SemanticDependentRow[],
  ): ProjectHistorySemanticImpactAdapterGroup {
    const refs = rows.map((row) => this.#semanticDependentRef(row));
    const totalCount = this.#impactTotal(
      rows,
      `${adapterKind} semantic record`,
    );
    return {
      adapter_kind: adapterKind,
      authority_source: authoritySource,
      relation_scope: "exact_target_revision",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    } as unknown as ProjectHistorySemanticImpactAdapterGroup;
  }

  #semanticDependentRef(
    row: SemanticDependentRow,
  ): ProjectHistorySemanticDependentRef {
    const descriptor = this.#semanticDependentDescriptor(row.schema_name);
    const payload = record(
      row.payload,
      `${row.schema_name} semantic dependent`,
    );
    const schemaVersion = row.schema_version;
    if (
      schemaVersion !== "1.0.0" &&
      !(row.schema_name === "petra.change-set" && schemaVersion === "1.1.0")
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A semantic dependent uses an unsupported authority contract version.",
      );
    }
    this.#contracts.assertValid(
      descriptor.contractName,
      schemaVersion,
      payload,
    );
    const revision = this.#safeImpactPosition(
      row.revision,
      `${row.schema_name} revision`,
    );
    if (
      payload.schema_name !== row.schema_name ||
      payload.schema_version !== row.schema_version ||
      payload[descriptor.idField] !== row.object_id ||
      payload.revision !== revision ||
      canonicalHash(payload) !== row.record_hash ||
      (row.content_hash !== null &&
        payload.content_hash !== row.content_hash) ||
      descriptor.semanticKey !== row.semantic_key ||
      !["current", "historical", "immutable_revision"].includes(row.posture) ||
      !this.#semanticRelation(row.relation) ||
      row.relation_identity.length < 1 ||
      row.relation_identity.length > 300
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A semantic dependent differs from its exact owning authority record.",
      );
    }
    return {
      semantic_key: row.semantic_key,
      object_id: row.object_id,
      revision,
      schema_name: row.schema_name,
      schema_version: schemaVersion,
      ...(row.content_hash === null ? {} : { content_hash: row.content_hash }),
      record_hash: row.record_hash,
      posture: row.posture,
      relation: row.relation,
      relation_identity: row.relation_identity,
    };
  }

  #semanticDependentDescriptor(schemaName: string): {
    contractName: string;
    idField: string;
    semanticKey: ProjectHistorySemanticDependentRef["semantic_key"];
  } {
    switch (schemaName) {
      case "petra.change-set":
        return {
          contractName: "change-set",
          idField: "change_set_id",
          semanticKey: "petra.change-set",
        };
      case "petra.approval":
        return {
          contractName: "approval",
          idField: "approval_id",
          semanticKey: "petra.approval",
        };
      case "petra.claim":
        return {
          contractName: "claim",
          idField: "claim_id",
          semanticKey: "scientific.claim",
        };
      case "petra.assertion":
        return {
          contractName: "assertion",
          idField: "assertion_id",
          semanticKey: "scientific.assertion",
        };
      case "petra.review-session":
        return {
          contractName: "review-session",
          idField: "review_session_id",
          semanticKey: "petra.review-session",
        };
      case "petra.grounded-response":
        return {
          contractName: "grounded-response",
          idField: "grounded_response_id",
          semanticKey: "petra.grounded-response",
        };
      case "petra.composition-request":
        return {
          contractName: "composition-request",
          idField: "composition_request_id",
          semanticKey: "petra.composition-request",
        };
      case "petra.composition-plan":
        return {
          contractName: "composition-plan",
          idField: "composition_plan_id",
          semanticKey: "petra.composition-plan",
        };
      case "petra.provenance-map":
        return {
          contractName: "provenance-map",
          idField: "provenance_map_id",
          semanticKey: "petra.provenance-map",
        };
      case "petra.draft-artifact":
        return {
          contractName: "draft-artifact",
          idField: "draft_artifact_id",
          semanticKey: "petra.draft-artifact",
        };
      case "petra.parsed-document":
        return {
          contractName: "parsed-document",
          idField: "parsed_document_id",
          semanticKey: "petra.parsed-document",
        };
      case "petra.structural-block":
        return {
          contractName: "structural-block",
          idField: "structural_block_id",
          semanticKey: "petra.structural-block",
        };
      case "petra.source-span":
        return {
          contractName: "source-span",
          idField: "source_span_id",
          semanticKey: "petra.source-span",
        };
      case "petra.work-unit":
        return {
          contractName: "work-unit",
          idField: "work_unit_id",
          semanticKey: "petra.work-unit",
        };
      case "petra.project-source-lifecycle-receipt":
        return {
          contractName: "project-source-lifecycle-receipt",
          idField: "project_source_lifecycle_receipt_id",
          semanticKey: "petra.project-source-lifecycle-receipt",
        };
      case "petra.project-source-replacement":
        return {
          contractName: "project-source-replacement",
          idField: "project_source_replacement_id",
          semanticKey: "petra.project-source-replacement",
        };
      case "petra.project-source-replacement-retraction":
        return {
          contractName: "project-source-replacement-retraction",
          idField: "project_source_replacement_retraction_id",
          semanticKey: "petra.project-source-replacement-retraction",
        };
      case "petra.project-source-replacement-receipt":
        return {
          contractName: "project-source-replacement-receipt",
          idField: "project_source_replacement_receipt_id",
          semanticKey: "petra.project-source-replacement-receipt",
        };
      default:
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          `No semantic dependent contract is registered for ${schemaName}.`,
        );
    }
  }

  #semanticRelation(
    relation: string,
  ): relation is ProjectHistorySemanticDependentRef["relation"] {
    return [
      "approves_exact_change_set",
      "authorized_by_exact_change_set",
      "authorized_by_exact_approval",
      "proposes_promotion_from_exact_evidence_revision",
      "contains_exact_review_candidate",
      "depends_on_exact_grounded_evidence",
      "selects_exact_composition_subject",
      "uses_exact_composition_evidence",
      "maps_exact_provenance_basis",
      "retains_exact_draft_authority_dependency",
      "parses_exact_source_artifact",
      "structures_exact_source_artifact",
      "locates_span_in_exact_source_artifact",
      "derives_claim_from_exact_source_artifact",
      "derives_assertion_from_exact_source_artifact",
      "uses_exact_source_artifact_in_active_work",
      "reviews_evidence_from_exact_source_artifact",
      "depends_on_exact_source_authority",
      "records_exact_source_prior_revision",
      "records_exact_source_resulting_revision",
      "retains_exact_replaced_source",
      "retains_exact_replacement_source",
      "retracts_exact_source_replacement",
      "records_exact_source_replacement_command",
      "is_current_active_replacement_head",
      "is_current_retracted_replacement_head",
    ].includes(relation);
  }

  async #impactCausalCommands(
    client: PoolClient,
    projectId: string,
    commandId: string,
  ): Promise<
    PetraProjectHistoryImpactView["content"]["impact"]["causal_commands"]
  > {
    const result = await client.query<ImpactCausalCommandRow>(
      `SELECT execution.envelope AS command_envelope,
              execution.command_fingerprint,
              execution.outcome_kind,
              execution.completed_at,
              event.payload AS event_payload,
              event.record_hash AS event_record_hash,
              count(*) OVER ()::text AS total_count
         FROM petra.command_executions AS execution
         LEFT JOIN petra.domain_events AS event
           ON event.command_id = execution.command_id
          AND event.project_id = execution.project_id
        WHERE execution.project_id = $1
          AND execution.envelope ->> 'causation_id' = $2
        ORDER BY event.stream_revision NULLS LAST,
                 execution.completed_at, execution.command_id
        LIMIT ${IMPACT_MAX_REFS}`,
      [projectId, commandId],
    );
    const refs = result.rows.map((row) => {
      const commandRef = this.#commandRef(
        row.command_envelope,
        row.command_fingerprint,
      );
      if (row.event_payload === null || row.event_record_hash === null) {
        return {
          command_ref: commandRef,
          outcome: row.outcome_kind,
          completed_at: row.completed_at.toISOString(),
          event_state: "not_recorded" as const,
        };
      }
      return {
        command_ref: commandRef,
        outcome: row.outcome_kind,
        completed_at: row.completed_at.toISOString(),
        event_state: "recorded" as const,
        event_ref: this.#eventRef(row.event_payload, row.event_record_hash),
      };
    });
    const totalCount = this.#impactTotal(result.rows, "causal command");
    return {
      relation: "caused_by_selected_command",
      authority_source: "immutable_command_causation",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    };
  }

  async #impactOutboxRecords(
    client: PoolClient,
    projectId: string,
    eventRef: ProjectHistoryEventRef,
    selectedEvent: JsonRecord,
  ): Promise<
    PetraProjectHistoryImpactView["content"]["impact"]["outbox_records"]
  > {
    const result = await client.query<ImpactOutboxRow>(
      `SELECT outbox.payload AS outbox_payload,
              outbox.record_hash AS outbox_record_hash,
              count(*) OVER ()::text AS total_count
         FROM petra.outbox_records AS outbox
        WHERE outbox.partition_key = $1 AND outbox.event_id = $2
        ORDER BY outbox.outbox_position, outbox.outbox_id
        LIMIT ${IMPACT_MAX_REFS}`,
      [projectId, eventRef.event_id],
    );
    const refs = result.rows.map((row) => {
      const outbox = record(row.outbox_payload, "dependent outbox record");
      const version = stringMember(
        outbox,
        "schema_version",
        "dependent outbox record",
      );
      if (
        !EVENT_VERSIONS.includes(version as (typeof EVENT_VERSIONS)[number])
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
          `Dependent outbox schema ${version} is not supported by Project History.`,
        );
      }
      this.#contracts.assertValid("outbox-record", version, outbox);
      if (canonicalHash(outbox) !== row.outbox_record_hash) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A dependent immutable outbox record hash does not match its payload.",
        );
      }
      const message = objectMember(
        outbox,
        "message",
        "dependent outbox record",
      );
      const carriedEvent = objectMember(
        message,
        "event",
        "dependent outbox record.message",
      );
      if (
        stringMember(carriedEvent, "event_id", "carried domain event") !==
          eventRef.event_id ||
        canonicalize(carriedEvent) !== canonicalize(selectedEvent)
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A dependent outbox record does not carry the exact selected event.",
        );
      }
      return {
        outbox_id: stringMember(outbox, "outbox_id", "dependent outbox record"),
        schema_version: version as (typeof EVENT_VERSIONS)[number],
        outbox_position: numberMember(
          outbox,
          "outbox_position",
          "dependent outbox record",
        ),
        target: stringMember(outbox, "target", "dependent outbox record") as
          "neo4j_graph" | "interface_authority",
        target_sequence: numberMember(
          outbox,
          "target_sequence",
          "dependent outbox record",
        ),
        enqueued_at: stringMember(
          outbox,
          "enqueued_at",
          "dependent outbox record",
        ),
        record_hash: row.outbox_record_hash,
      };
    });
    const totalCount = this.#impactTotal(result.rows, "outbox record");
    return {
      relation: "carries_selected_event",
      authority_source: "immutable_event_outbox_binding",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    };
  }

  async #impactProjectionRecords(
    client: PoolClient,
    projectId: string,
    eventRef: ProjectHistoryEventRef,
  ): Promise<
    PetraProjectHistoryImpactView["content"]["impact"]["graph_projection_records"]
  > {
    const result = await client.query<ImpactProjectionRow>(
      `SELECT projection.payload AS projection_payload,
              projection.record_hash AS projection_record_hash,
              count(*) OVER ()::text AS total_count
         FROM petra.graph_projection_records AS projection
        WHERE projection.project_id = $1 AND projection.event_id = $2
        ORDER BY projection.outbox_position, projection.attempt,
                 projection.graph_projection_record_id
        LIMIT ${IMPACT_MAX_REFS}`,
      [projectId, eventRef.event_id],
    );
    const refs = result.rows.map((row) => {
      const projection = record(
        row.projection_payload,
        "dependent graph projection record",
      );
      this.#contracts.assertValid(
        "graph-projection-record",
        "1.0.0",
        projection,
      );
      const content = objectMember(
        projection,
        "content",
        "dependent graph projection record",
      );
      if (
        canonicalHash(content) !== projection.content_hash ||
        canonicalHash(projection) !== row.projection_record_hash
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A dependent graph projection record cannot be reproduced exactly.",
        );
      }
      const outbox = objectMember(
        content,
        "outbox_ref",
        "dependent graph projection record.content",
      );
      if (
        stringMember(outbox, "event_id", "projection outbox reference") !==
          eventRef.event_id ||
        numberMember(
          outbox,
          "event_position",
          "projection outbox reference",
        ) !== eventRef.event_position ||
        numberMember(
          outbox,
          "stream_revision",
          "projection outbox reference",
        ) !== eventRef.stream_revision
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A dependent projection record does not bind the exact selected event authority.",
        );
      }
      const outcome = objectMember(
        content,
        "outcome",
        "dependent graph projection record.content",
      );
      return {
        graph_projection_record_id: stringMember(
          projection,
          "graph_projection_record_id",
          "dependent graph projection record",
        ),
        revision: 1 as const,
        content_hash: stringMember(
          projection,
          "content_hash",
          "dependent graph projection record",
        ),
        record_hash: row.projection_record_hash,
        outbox_id: stringMember(
          outbox,
          "outbox_id",
          "projection outbox reference",
        ),
        outbox_position: numberMember(
          outbox,
          "outbox_position",
          "projection outbox reference",
        ),
        target_sequence: numberMember(
          outbox,
          "target_sequence",
          "projection outbox reference",
        ),
        attempt: numberMember(
          content,
          "attempt",
          "dependent graph projection record.content",
        ),
        outcome: stringMember(
          outcome,
          "outcome_kind",
          "dependent graph projection outcome",
        ) as "applied" | "failed",
        recorded_at: stringMember(
          projection,
          "recorded_at",
          "dependent graph projection record",
        ),
      };
    });
    const totalCount = this.#impactTotal(
      result.rows,
      "graph projection record",
    );
    return {
      relation: "projects_selected_event",
      authority_source: "immutable_projection_event_binding",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    };
  }

  async #impactGroundedResponseInvalidations(
    client: PoolClient,
    projectId: string,
    eventRef: ProjectHistoryEventRef,
    selectedEvent: JsonRecord,
  ): Promise<
    PetraProjectHistoryImpactView["content"]["impact"]["grounded_response_invalidations"]
  > {
    const result = await client.query<ImpactGroundedResponseRow>(
      `SELECT revision.payload AS response_payload,
              revision.record_hash AS response_record_hash,
              head.current_revision::text,
              cause.position::text AS invalidation_position,
              cause.event_type,
              cause.change_set_id,
              count(*) OVER ()::text AS total_count
         FROM petra.grounded_response_invalidation_causes AS cause
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = cause.grounded_response_id
          AND revision.revision = cause.response_revision
         JOIN petra.grounded_responses AS head
           ON head.grounded_response_id = revision.grounded_response_id
          AND head.project_id = revision.project_id
        WHERE revision.project_id = $1 AND cause.event_id = $2
        ORDER BY revision.grounded_response_id, revision.revision,
                 cause.position
        LIMIT ${IMPACT_MAX_REFS}`,
      [projectId, eventRef.event_id],
    );
    const eventFact = objectMember(
      selectedEvent,
      "event",
      "selected domain event",
    );
    const eventPayload = objectMember(
      eventFact,
      "payload",
      "selected domain event.event",
    );
    const selectedChangeSetId =
      typeof eventPayload.change_set_id === "string"
        ? eventPayload.change_set_id
        : undefined;
    const refs = result.rows.map((row) => {
      const response = record(
        row.response_payload,
        "dependent GroundedResponse revision",
      );
      this.#contracts.assertValid("grounded-response", "1.0.0", response);
      const content = objectMember(
        response,
        "content",
        "dependent GroundedResponse revision",
      );
      const cache = objectMember(
        content,
        "cache",
        "dependent GroundedResponse revision.content",
      );
      if (
        canonicalHash(content) !== response.content_hash ||
        canonicalHash(response) !== row.response_record_hash ||
        stringMember(cache, "state", "dependent GroundedResponse cache") !==
          "invalidated" ||
        row.event_type !== eventRef.event_type ||
        selectedChangeSetId === undefined ||
        row.change_set_id !== selectedChangeSetId
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "A dependent GroundedResponse invalidation does not bind the selected event exactly.",
        );
      }
      const revision = numberMember(
        response,
        "revision",
        "dependent GroundedResponse revision",
      );
      const currentRevision = this.#safeImpactPosition(
        row.current_revision,
        "current GroundedResponse revision",
      );
      return {
        grounded_response_id: stringMember(
          response,
          "grounded_response_id",
          "dependent GroundedResponse revision",
        ),
        revision,
        content_hash: stringMember(
          response,
          "content_hash",
          "dependent GroundedResponse revision",
        ),
        record_hash: row.response_record_hash,
        posture:
          currentRevision === revision
            ? ("current" as const)
            : ("historical" as const),
        cache_state: "invalidated" as const,
        invalidation_position: this.#safeImpactPosition(
          row.invalidation_position,
          "GroundedResponse invalidation position",
        ),
        change_set_id: row.change_set_id,
        recorded_at: stringMember(
          response,
          "recorded_at",
          "dependent GroundedResponse revision",
        ),
      };
    });
    const totalCount = this.#impactTotal(
      result.rows,
      "GroundedResponse invalidation",
    );
    return {
      relation: "invalidated_by_selected_event",
      authority_source: "immutable_response_invalidation_binding",
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
    };
  }

  #impactTotal(
    rows: readonly { total_count: string }[],
    label: string,
  ): number {
    const total =
      rows[0] === undefined
        ? 0
        : this.#safeImpactPosition(
            rows[0].total_count,
            `${label} total count`,
            true,
          );
    if (total > 1_000_000) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        `The ${label} total count exceeds Petra's registered group bound.`,
      );
    }
    return total;
  }

  #safeImpactPosition(value: string, label: string, allowZero = false): number {
    const parsed = Number(value);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < (allowZero ? 0 : 1) ||
      parsed > 4000000
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        `The ${label} is outside Petra's bounded safe range.`,
      );
    }
    return parsed;
  }

  async #causalCommandLink(
    client: PoolClient,
    projectId: string,
    commandId: string,
  ): Promise<ProjectHistoryCausalCommandLink> {
    const result = await client.query<CausalCommandRow>(
      `SELECT execution.command_id,
              event.payload AS event_payload,
              event.record_hash AS event_record_hash
         FROM petra.command_executions AS execution
         LEFT JOIN petra.domain_events AS event
           ON event.command_id = execution.command_id
          AND event.project_id = execution.project_id
        WHERE execution.project_id = $1 AND execution.command_id = $2`,
      [projectId, commandId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A command-shaped causal parent is unavailable in the selected Project.",
      );
    }
    if (row.event_payload === null || row.event_record_hash === null) {
      return { command_id: commandId, event_state: "not_recorded" };
    }
    return {
      command_id: commandId,
      event_state: "recorded",
      event_ref: this.#eventRef(row.event_payload, row.event_record_hash),
    };
  }

  async #followingCommands(
    client: PoolClient,
    projectId: string,
    commandId: string,
  ): Promise<ProjectHistoryCausalCommandLink[]> {
    const result = await client.query<CausalCommandRow>(
      `SELECT execution.command_id,
              event.payload AS event_payload,
              event.record_hash AS event_record_hash
         FROM petra.command_executions AS execution
         LEFT JOIN petra.domain_events AS event
           ON event.command_id = execution.command_id
          AND event.project_id = execution.project_id
        WHERE execution.project_id = $1
          AND execution.envelope ->> 'causation_id' = $2
        ORDER BY event.stream_revision NULLS LAST,
                 execution.completed_at, execution.command_id
        LIMIT 100`,
      [projectId, commandId],
    );
    return result.rows.map((row) =>
      row.event_payload === null || row.event_record_hash === null
        ? { command_id: row.command_id, event_state: "not_recorded" }
        : {
            command_id: row.command_id,
            event_state: "recorded",
            event_ref: this.#eventRef(row.event_payload, row.event_record_hash),
          },
    );
  }

  async #streamOrder(
    client: PoolClient,
    projectId: string,
    streamRevision: number,
  ): Promise<PetraProjectHistoryEpisodeView["content"]["stream_order"]> {
    const previous = await client.query<EventRow>(
      `SELECT payload AS event_payload, record_hash AS event_record_hash
         FROM petra.domain_events
        WHERE project_id = $1 AND stream_revision < $2
        ORDER BY stream_revision DESC
        LIMIT 1`,
      [projectId, streamRevision],
    );
    const next = await client.query<EventRow>(
      `SELECT payload AS event_payload, record_hash AS event_record_hash
         FROM petra.domain_events
        WHERE project_id = $1 AND stream_revision > $2
        ORDER BY stream_revision
        LIMIT 1`,
      [projectId, streamRevision],
    );
    const previousRow = previous.rows[0];
    const nextRow = next.rows[0];
    return {
      order_kind: "project_stream",
      ...(previousRow === undefined
        ? {}
        : {
            previous_event_ref: this.#eventRef(
              previousRow.event_payload,
              previousRow.event_record_hash,
            ),
          }),
      ...(nextRow === undefined
        ? {}
        : {
            next_event_ref: this.#eventRef(
              nextRow.event_payload,
              nextRow.event_record_hash,
            ),
          }),
    };
  }

  #eventRef(payload: unknown, recordHash: string): ProjectHistoryEventRef {
    const event = record(payload, "related domain event");
    const version = stringMember(
      event,
      "schema_version",
      "related domain event",
    );
    if (!EVENT_VERSIONS.includes(version as (typeof EVENT_VERSIONS)[number])) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
        `Related domain event schema ${version} is not supported by Project History.`,
      );
    }
    this.#contracts.assertValid("domain-event", version, event);
    if (canonicalHash(event) !== recordHash) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A related immutable domain event record hash does not match its payload.",
      );
    }
    const fact = objectMember(event, "event", "related domain event");
    return {
      event_id: stringMember(event, "event_id", "related domain event"),
      schema_version: version as (typeof EVENT_VERSIONS)[number],
      event_type: stringMember(
        fact,
        "event_type",
        "related domain event.event",
      ) as ProjectHistoryEventRef["event_type"],
      event_position: numberMember(
        event,
        "event_position",
        "related domain event",
      ),
      stream_revision: numberMember(
        event,
        "stream_revision",
        "related domain event",
      ),
      record_hash: recordHash,
    };
  }

  #receiptRef(row: HistoryRow): ProjectHistoryReceiptRef | undefined {
    if (
      row.lifecycle_receipt_payload !== null &&
      row.replacement_receipt_payload !== null
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "One Project command cannot resolve both lifecycle and replacement receipts.",
      );
    }
    const lifecycle = row.lifecycle_receipt_payload;
    if (lifecycle !== null) {
      const receipt = record(lifecycle, "lifecycle receipt");
      if (row.lifecycle_receipt_record_hash === null) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The lifecycle receipt record hash is unavailable.",
        );
      }
      return {
        schema_name: "petra.project-source-lifecycle-receipt",
        record_id: stringMember(
          receipt,
          "project_source_lifecycle_receipt_id",
          "lifecycle receipt",
        ),
        revision: 1,
        content_hash: stringMember(
          receipt,
          "content_hash",
          "lifecycle receipt",
        ),
        record_hash: row.lifecycle_receipt_record_hash,
      };
    }
    const replacement = row.replacement_receipt_payload;
    if (replacement === null) return undefined;
    const receipt = record(replacement, "replacement receipt");
    if (row.replacement_receipt_record_hash === null) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The replacement receipt record hash is unavailable.",
      );
    }
    return {
      schema_name: "petra.project-source-replacement-receipt",
      record_id: stringMember(
        receipt,
        "project_source_replacement_receipt_id",
        "replacement receipt",
      ),
      revision: 1,
      content_hash: stringMember(
        receipt,
        "content_hash",
        "replacement receipt",
      ),
      record_hash: row.replacement_receipt_record_hash,
    };
  }

  #commandRef(
    envelopePayload: unknown,
    commandFingerprint: string,
  ): ProjectHistoryCommandRef {
    const envelope = record(envelopePayload, "dependent command envelope");
    const version = stringMember(
      envelope,
      "schema_version",
      "dependent command envelope",
    );
    if (
      !COMMAND_VERSIONS.includes(version as (typeof COMMAND_VERSIONS)[number])
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
        `Dependent command envelope schema ${version} is not supported by Project History.`,
      );
    }
    this.#contracts.assertValid("command-envelope", version, envelope);
    const command = objectMember(
      envelope,
      "command",
      "dependent command envelope",
    );
    const commandName = stringMember(
      command,
      "command_name",
      "dependent command envelope.command",
    );
    const fingerprintValue = structuredClone(envelope);
    if (
      commandName === "ExcludeProjectSource" ||
      commandName === "RestoreProjectSource" ||
      commandName === "CreateProjectSourceReplacement" ||
      commandName === "RetractProjectSourceReplacement"
    ) {
      delete fingerprintValue.correlation_id;
      delete fingerprintValue.submitted_at;
    }
    if (canonicalHash(fingerprintValue) !== commandFingerprint) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A dependent immutable command fingerprint does not match its envelope.",
      );
    }
    return {
      command_id: stringMember(
        envelope,
        "command_id",
        "dependent command envelope",
      ),
      schema_version: version as (typeof COMMAND_VERSIONS)[number],
      command_name: commandName as ProjectHistoryCommandRef["command_name"],
      idempotency_key: stringMember(
        envelope,
        "idempotency_key",
        "dependent command envelope",
      ),
      command_fingerprint: commandFingerprint,
      capability_grant_id: stringMember(
        envelope,
        "capability_grant_id",
        "dependent command envelope",
      ),
      correlation_id: stringMember(
        envelope,
        "correlation_id",
        "dependent command envelope",
      ),
    };
  }

  async #change(
    client: PoolClient,
    row: HistoryRow,
  ): Promise<ProjectHistoryRecentChange> {
    const event = record(row.event_payload, "domain event");
    const eventVersion = stringMember(event, "schema_version", "domain event");
    if (
      !EVENT_VERSIONS.includes(eventVersion as (typeof EVENT_VERSIONS)[number])
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
        `Domain event schema ${eventVersion} is not supported by Project History.`,
      );
    }
    this.#contracts.assertValid("domain-event", eventVersion, event);
    if (canonicalHash(event) !== row.event_record_hash) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The immutable domain event record hash does not match its payload.",
      );
    }

    const envelope = record(row.command_envelope, "command envelope");
    const commandVersion = stringMember(
      envelope,
      "schema_version",
      "command envelope",
    );
    if (
      !COMMAND_VERSIONS.includes(
        commandVersion as (typeof COMMAND_VERSIONS)[number],
      )
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
        `Command envelope schema ${commandVersion} is not supported by Project History.`,
      );
    }
    this.#contracts.assertValid("command-envelope", commandVersion, envelope);
    const eventFact = objectMember(event, "event", "domain event");
    const eventType = stringMember(
      eventFact,
      "event_type",
      "domain event.event",
    );
    const command = objectMember(envelope, "command", "command envelope");
    const commandName = stringMember(
      command,
      "command_name",
      "command envelope.command",
    );
    const fingerprintValue = structuredClone(envelope);
    if (
      commandName === "ExcludeProjectSource" ||
      commandName === "RestoreProjectSource" ||
      commandName === "CreateProjectSourceReplacement" ||
      commandName === "RetractProjectSourceReplacement"
    ) {
      delete fingerprintValue.correlation_id;
      delete fingerprintValue.submitted_at;
    }
    if (canonicalHash(fingerprintValue) !== row.command_fingerprint) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The immutable command fingerprint does not match its stored envelope.",
      );
    }
    if (
      stringMember(event, "command_id", "domain event") !==
        stringMember(envelope, "command_id", "command envelope") ||
      stringMember(event, "project_id", "domain event") !==
        stringMember(envelope, "project_id", "command envelope")
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The event and command identities do not resolve to the same authority fact.",
      );
    }

    const derived = await this.#deriveEvent(
      client,
      eventType,
      eventFact,
      row.lifecycle_receipt_payload,
      row.lifecycle_receipt_record_hash,
      row.replacement_receipt_payload,
      row.replacement_receipt_record_hash,
    );
    this.#assertReceiptLinks(event, envelope, row);
    const primary = derived.targets.find(({ role }) => role === "primary");
    if (primary === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A Project History change has no primary target.",
      );
    }
    return {
      command_ref: {
        command_id: stringMember(envelope, "command_id", "command envelope"),
        schema_version: commandVersion as (typeof COMMAND_VERSIONS)[number],
        command_name:
          commandName as ProjectHistoryRecentChange["command_ref"]["command_name"],
        idempotency_key: stringMember(
          envelope,
          "idempotency_key",
          "command envelope",
        ),
        command_fingerprint: row.command_fingerprint,
        capability_grant_id: stringMember(
          envelope,
          "capability_grant_id",
          "command envelope",
        ),
        correlation_id: stringMember(
          envelope,
          "correlation_id",
          "command envelope",
        ),
      },
      event_ref: {
        event_id: stringMember(event, "event_id", "domain event"),
        schema_version: eventVersion as (typeof EVENT_VERSIONS)[number],
        event_type:
          eventType as ProjectHistoryRecentChange["event_ref"]["event_type"],
        event_position: numberMember(event, "event_position", "domain event"),
        stream_revision: numberMember(event, "stream_revision", "domain event"),
        record_hash: row.event_record_hash,
      },
      actor: objectMember(
        event,
        "actor",
        "domain event",
      ) as unknown as ProjectHistoryRecentChange["actor"],
      occurred_at: stringMember(event, "occurred_at", "domain event"),
      recorded_at: stringMember(event, "recorded_at", "domain event"),
      family: derived.family,
      targets: derived.targets as [
        ProjectHistoryTargetRef,
        ...ProjectHistoryTargetRef[],
      ],
      observed_effect: derived.observedEffect,
      recovery: derived.recovery,
      semantic_destination: {
        place_role: "history",
        task_intent: "view_history",
        object_ref: {
          semantic_key: primary.semantic_key,
          object_id: primary.object_id,
          ...(primary.revision === undefined
            ? {}
            : { revision: primary.revision }),
        },
      },
    };
  }

  #assertReceiptLinks(
    event: JsonRecord,
    envelope: JsonRecord,
    row: HistoryRow,
  ): void {
    const receiptPayload =
      row.lifecycle_receipt_payload ?? row.replacement_receipt_payload;
    if (receiptPayload === null) return;
    const receipt = record(receiptPayload, "command receipt");
    const content = objectMember(receipt, "content", "command receipt");
    const commandRef = objectMember(
      content,
      "command_ref",
      "command receipt.content",
    );
    const eventRef = objectMember(
      content,
      "event_ref",
      "command receipt.content",
    );
    const eventFact = objectMember(event, "event", "domain event");
    const command = objectMember(envelope, "command", "command envelope");
    if (
      receipt.project_id !== event.project_id ||
      commandRef.command_id !== event.command_id ||
      commandRef.command_name !== command.command_name ||
      commandRef.command_fingerprint !== row.command_fingerprint ||
      eventRef.event_id !== event.event_id ||
      eventRef.event_position !== event.event_position ||
      eventRef.stream_revision !== event.stream_revision ||
      eventRef.event_type !== eventFact.event_type ||
      eventRef.record_hash !== row.event_record_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The command receipt does not resolve the exact command and event authority records.",
      );
    }
  }

  async #deriveEvent(
    client: PoolClient,
    eventType: string,
    eventFact: JsonRecord,
    lifecycleReceiptPayload: unknown,
    lifecycleReceiptRecordHash: string | null,
    replacementReceiptPayload: unknown,
    replacementReceiptRecordHash: string | null,
  ): Promise<DerivedHistoryChange> {
    const payload = objectMember(eventFact, "payload", "domain event.event");
    const noDirectRecovery = (reason: string): ProjectHistoryRecovery =>
      ineligible(
        `${reason} Generic undo and multi-step compensation are outside this bounded History slice.`,
      );

    switch (eventType) {
      case "change_set.submitted": {
        const changeSet = objectMember(payload, "change_set", "event payload");
        const content = objectMember(changeSet, "content", "change set");
        return this.#derived(
          "change_control",
          [
            exactTarget(
              "primary",
              "petra.change-set",
              changeSet,
              "change_set_id",
              "change set",
              "submitted",
            ),
          ],
          "change_proposed",
          "completed",
          `Submitted a governed change proposal: ${stringMember(content, "reason", "change set.content")}`,
          noDirectRecovery(
            "A submitted proposal has no registered command-granular inverse.",
          ),
        );
      }
      case "approval.recorded": {
        const approval = objectMember(payload, "approval", "event payload");
        const subject = objectMember(approval, "subject", "approval");
        const state = stringMember(
          payload,
          "derived_change_set_state",
          "event payload",
        );
        return this.#derived(
          "change_control",
          [
            {
              role: "primary",
              semantic_key: "petra.change-set",
              object_id: stringMember(
                subject,
                "change_set_id",
                "approval.subject",
              ),
              revision: numberMember(
                subject,
                "change_set_revision",
                "approval.subject",
              ),
              content_hash: stringMember(
                subject,
                "change_set_content_hash",
                "approval.subject",
              ),
              authority_state: state,
            },
            exactTarget(
              "related",
              "petra.approval",
              approval,
              "approval_id",
              "approval",
              stringMember(approval, "decision", "approval"),
            ),
          ],
          "approval_recorded",
          "completed",
          `Recorded a human ${stringMember(approval, "decision", "approval")} decision for the exact ChangeSet revision.`,
          noDirectRecovery(
            "An immutable Approval decision cannot be erased or overwritten.",
          ),
        );
      }
      case "change_set.applied":
      case "change_set.reverted": {
        const changeSetId = stringMember(
          payload,
          "change_set_id",
          "event payload",
        );
        const claim = objectMember(payload, "claim", "event payload");
        const assertion = objectMember(payload, "assertion", "event payload");
        const reverted = eventType === "change_set.reverted";
        return this.#derived(
          "change_control",
          [
            {
              role: "primary",
              semantic_key: "petra.change-set",
              object_id: changeSetId,
              revision: numberMember(
                payload,
                "change_set_revision",
                "event payload",
              ),
              content_hash: stringMember(
                payload,
                "change_set_content_hash",
                "event payload",
              ),
              authority_state: reverted ? "reverted" : "applied",
            },
            exactTarget(
              "affected",
              "scientific.claim",
              claim,
              "claim_id",
              "event payload.claim",
            ),
            exactTarget(
              "affected",
              "scientific.assertion",
              assertion,
              "assertion_id",
              "event payload.assertion",
            ),
          ],
          reverted ? "authority_change_reverted" : "authority_change_applied",
          "completed",
          reverted
            ? `Applied the explicit ChangeSet compensation for ${stringMember(payload, "compensates_change_set_id", "event payload")}.`
            : "Applied the approved ChangeSet to the exact Claim and Assertion revisions.",
          noDirectRecovery(
            reverted
              ? "An applied compensation is retained as its own causal fact."
              : "ChangeSet reversal requires a separate causal assessment.",
          ),
        );
      }
      case "change_set.conflicted":
      case "change_set.reversal_conflicted": {
        const reversal = eventType === "change_set.reversal_conflicted";
        const targets: ProjectHistoryTargetRef[] = [
          {
            role: "primary",
            semantic_key: "petra.change-set",
            object_id: stringMember(payload, "change_set_id", "event payload"),
            revision: numberMember(
              payload,
              "change_set_revision",
              "event payload",
            ),
            content_hash: stringMember(
              payload,
              "change_set_content_hash",
              "event payload",
            ),
            authority_state: "conflicted",
          },
          ...objectArray(payload, "targets", "event payload").map((target) => ({
            role: "affected" as const,
            semantic_key: `scientific.${stringMember(target, "target_kind", "conflict target")}`,
            object_id: stringMember(target, "target_id", "conflict target"),
            revision: numberMember(
              target,
              "actual_revision",
              "conflict target",
            ),
            authority_state: stringMember(
              target,
              "actual_zone",
              "conflict target",
            ),
          })),
        ];
        return this.#derived(
          "change_control",
          targets,
          reversal ? "reversal_conflicted" : "authority_change_conflicted",
          "conflicted",
          `${reversal ? "ChangeSet compensation" : "ChangeSet application"} conflicted with current target authority (${stringMember(payload, "conflict_code", "event payload")}).`,
          noDirectRecovery(
            "A conflicted command changed no target authority and must be reviewed against current revisions.",
          ),
        );
      }
      case "project_source.excluded":
      case "project_source.restored":
        return this.#sourceLifecycle(
          client,
          eventType,
          payload,
          lifecycleReceiptPayload,
          lifecycleReceiptRecordHash,
        );
      case "project_source.replacement_created":
      case "project_source.replacement_retracted":
        return this.#sourceReplacement(
          client,
          eventType,
          payload,
          replacementReceiptPayload,
          replacementReceiptRecordHash,
        );
      default:
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_EVENT_UNSUPPORTED",
          `Project History has no registered composition for ${eventType}.`,
        );
    }
  }

  #derived(
    family: ProjectHistoryRecentChange["family"],
    targets: ProjectHistoryTargetRef[],
    effect: ProjectHistoryRecentChange["observed_effect"]["effect"],
    outcome: ProjectHistoryRecentChange["observed_effect"]["outcome"],
    summary: string,
    recovery: ProjectHistoryRecovery,
  ): DerivedHistoryChange {
    const observedEffect = { effect, outcome, summary };
    return {
      family,
      targets,
      observedEffect,
      recovery,
    };
  }

  async #sourceLifecycle(
    client: PoolClient,
    eventType: "project_source.excluded" | "project_source.restored",
    payload: JsonRecord,
    receiptPayload: unknown,
    receiptRecordHash: string | null,
  ): Promise<DerivedHistoryChange> {
    if (receiptPayload === null || receiptRecordHash === null) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A ProjectSource lifecycle event has no immutable command receipt.",
      );
    }
    this.#contracts.assertValid(
      "project-source-lifecycle-receipt",
      "1.0.0",
      receiptPayload,
    );
    const receipt = record(receiptPayload, "lifecycle receipt");
    const content = objectMember(receipt, "content", "lifecycle receipt");
    if (
      canonicalHash(content) !== receipt.content_hash ||
      canonicalHash(receipt) !== receiptRecordHash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The immutable ProjectSource lifecycle receipt cannot be reproduced exactly.",
      );
    }
    const resulting = objectMember(
      content,
      "resulting_source_ref",
      "lifecycle receipt.content",
    );
    const prior = objectMember(
      content,
      "prior_source_ref",
      "lifecycle receipt.content",
    );
    const eventPrior = objectMember(
      payload,
      "prior_source_ref",
      "ProjectSource lifecycle event payload",
    );
    const eventSource = objectMember(
      payload,
      "project_source",
      "ProjectSource lifecycle event payload",
    );
    if (
      canonicalize(prior) !== canonicalize(eventPrior) ||
      eventSource.project_source_id !== resulting.project_source_id ||
      eventSource.revision !== resulting.revision ||
      eventSource.content_hash !== resulting.content_hash ||
      canonicalHash(
        objectMember(eventSource, "content", "event ProjectSource"),
      ) !== eventSource.content_hash ||
      canonicalHash(eventSource) !== resulting.record_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The ProjectSource lifecycle receipt does not resolve the exact event transition.",
      );
    }
    const recoveryRecord = objectMember(
      content,
      "recovery",
      "lifecycle receipt.content",
    );
    const sourceId = stringMember(
      resulting,
      "project_source_id",
      "lifecycle resulting source",
    );
    const current = await this.#currentSource(client, sourceId);
    const inverse = stringMember(
      recoveryRecord,
      "inverse_command_name",
      "lifecycle recovery",
    ) as "ExcludeProjectSource" | "RestoreProjectSource";
    let recovery: ProjectHistoryRecovery;
    if (current === undefined || !sameExactRef(current, resulting)) {
      recovery = ineligible(
        "The resulting ProjectSource revision is no longer the exact current authority head.",
      );
    } else if (
      inverse === "RestoreProjectSource" &&
      current.has_active_replacement
    ) {
      recovery = ineligible(
        "The excluded ProjectSource has an active replacement relationship; retract that relationship before restoring the predecessor.",
      );
    } else {
      recovery = {
        eligibility: "eligible",
        command_name: inverse,
        expected_target_ref: {
          semantic_key: "petra.project-source",
          object_id: current.project_source_id,
          revision: Number(current.revision),
          content_hash: current.content_hash,
          record_hash: current.record_hash,
        },
        reason:
          inverse === "RestoreProjectSource"
            ? "The exact excluded source remains current and has no active replacement, so a separate RestoreProjectSource command is available."
            : "The exact active source remains current, so ExcludeProjectSource is available as the compensating status transition.",
      };
    }
    const excluded = eventType === "project_source.excluded";
    return this.#derived(
      "project_source_lifecycle",
      [
        exactTarget(
          "primary",
          "petra.project-source",
          resulting,
          "project_source_id",
          "lifecycle resulting source",
          excluded ? "excluded" : "active",
        ),
      ],
      excluded ? "project_source_excluded" : "project_source_restored",
      "completed",
      excluded
        ? "Excluded the exact ProjectSource revision from ordinary new Project use while retaining identity, provenance, and history."
        : "Restored the exact ProjectSource revision to ordinary new Project use without altering retained history.",
      recovery,
    );
  }

  async #sourceReplacement(
    client: PoolClient,
    eventType:
      | "project_source.replacement_created"
      | "project_source.replacement_retracted",
    payload: JsonRecord,
    receiptPayload: unknown,
    receiptRecordHash: string | null,
  ): Promise<DerivedHistoryChange> {
    if (receiptPayload === null || receiptRecordHash === null) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "A ProjectSource replacement event has no immutable command receipt.",
      );
    }
    this.#contracts.assertValid(
      "project-source-replacement-receipt",
      "1.0.0",
      receiptPayload,
    );
    const receipt = record(receiptPayload, "replacement receipt");
    const receiptContent = objectMember(
      receipt,
      "content",
      "replacement receipt",
    );
    if (
      canonicalHash(receiptContent) !== receipt.content_hash ||
      canonicalHash(receipt) !== receiptRecordHash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The immutable ProjectSource replacement receipt cannot be reproduced exactly.",
      );
    }
    const result = objectMember(
      receiptContent,
      "result",
      "replacement receipt.content",
    );
    const replacement =
      eventType === "project_source.replacement_created"
        ? payload
        : objectMember(
            payload,
            "replacement",
            "replacement retraction payload",
          );
    const replacementContent = objectMember(
      replacement,
      "content",
      "source replacement",
    );
    const replacedSource = objectMember(
      replacementContent,
      "replaced_source_ref",
      "source replacement.content",
    );
    const successorSource = objectMember(
      replacementContent,
      "replacement_source_ref",
      "source replacement.content",
    );
    const replacementRef = objectMember(
      result,
      "replacement_ref",
      "replacement receipt result",
    );
    if (
      replacement.project_source_replacement_id !==
        replacementRef.project_source_replacement_id ||
      replacement.revision !== replacementRef.revision ||
      replacement.content_hash !== replacementRef.content_hash ||
      canonicalHash(replacementContent) !== replacement.content_hash ||
      canonicalHash(replacement) !== replacementRef.record_hash
    ) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The ProjectSource replacement receipt does not resolve the exact event relationship.",
      );
    }
    const replacementId = stringMember(
      replacementRef,
      "project_source_replacement_id",
      "replacement receipt result.replacement_ref",
    );
    const created = eventType === "project_source.replacement_created";
    let recovery: ProjectHistoryRecovery;
    if (created) {
      const head = await this.#replacementHead(
        client,
        stringMember(
          replacedSource,
          "project_source_id",
          "source replacement replaced source",
        ),
      );
      if (
        head === undefined ||
        head.state !== "active" ||
        head.project_source_replacement_id !== replacementId ||
        Number(head.revision) !== replacementRef.revision ||
        head.content_hash !== replacementRef.content_hash ||
        head.record_hash !== replacementRef.record_hash
      ) {
        recovery = ineligible(
          "The replacement is no longer the exact active relationship head.",
        );
      } else {
        recovery = {
          eligibility: "eligible",
          command_name: "RetractProjectSourceReplacement",
          expected_target_ref: {
            semantic_key: "petra.project-source-replacement",
            object_id: replacementId,
            revision: Number(head.revision),
            content_hash: head.content_hash,
            record_hash: head.record_hash,
          },
          reason:
            "The exact replacement remains active and can be retracted without restoring the predecessor source.",
        };
      }
    } else {
      const current = await this.#currentSource(
        client,
        stringMember(
          replacedSource,
          "project_source_id",
          "source replacement replaced source",
        ),
      );
      if (current === undefined || !sameExactRef(current, replacedSource)) {
        recovery = ineligible(
          "The predecessor ProjectSource is no longer the exact excluded authority head required for restoration.",
        );
      } else if (current.has_active_replacement) {
        recovery = ineligible(
          "A newer active replacement relationship must be retracted before the predecessor can be restored.",
        );
      } else {
        recovery = {
          eligibility: "eligible",
          command_name: "RestoreProjectSource",
          expected_target_ref: {
            semantic_key: "petra.project-source",
            object_id: current.project_source_id,
            revision: Number(current.revision),
            content_hash: current.content_hash,
            record_hash: current.record_hash,
          },
          reason:
            "Replacement retraction left source status unchanged; the exact predecessor is now eligible for a separate RestoreProjectSource command.",
        };
      }
    }

    const targets: ProjectHistoryTargetRef[] = [
      exactTarget(
        "primary",
        "petra.project-source-replacement",
        replacementRef,
        "project_source_replacement_id",
        "replacement receipt result.replacement_ref",
        created ? "active" : "retracted",
      ),
      exactTarget(
        "affected",
        "petra.project-source",
        replacedSource,
        "project_source_id",
        "source replacement replaced source",
        "excluded",
      ),
      exactTarget(
        "related",
        "petra.project-source",
        successorSource,
        "project_source_id",
        "source replacement successor source",
        "active",
      ),
    ];
    if (!created) {
      const retractionRef = objectMember(
        result,
        "retraction_ref",
        "replacement receipt result",
      );
      const eventRetraction = objectMember(
        payload,
        "retraction",
        "replacement retraction payload",
      );
      if (
        eventRetraction.project_source_replacement_retraction_id !==
          retractionRef.project_source_replacement_retraction_id ||
        eventRetraction.revision !== retractionRef.revision ||
        eventRetraction.content_hash !== retractionRef.content_hash ||
        canonicalHash(
          objectMember(
            eventRetraction,
            "content",
            "event replacement retraction",
          ),
        ) !== eventRetraction.content_hash ||
        canonicalHash(eventRetraction) !== retractionRef.record_hash
      ) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "The replacement-retraction receipt does not resolve the exact event compensation.",
        );
      }
      targets.push(
        exactTarget(
          "related",
          "petra.project-source-replacement-retraction",
          retractionRef,
          "project_source_replacement_retraction_id",
          "replacement receipt result.retraction_ref",
        ),
      );
    }
    return this.#derived(
      "project_source_replacement",
      targets,
      created ? "source_replacement_created" : "source_replacement_retracted",
      "completed",
      created
        ? "Recorded an exact ProjectSource supersession relationship while retaining both source identities and their history."
        : "Retracted the exact supersession relationship without changing or restoring either ProjectSource status.",
      recovery,
    );
  }

  async #currentSource(
    client: PoolClient,
    projectSourceId: string,
  ): Promise<CurrentSourceRow | undefined> {
    const result = await client.query<CurrentSourceRow>(
      `SELECT source.project_source_id, revision.revision,
              revision.content_hash, revision.record_hash, revision.status,
              EXISTS (
                SELECT 1
                  FROM petra.project_source_replacement_heads AS replacement
                 WHERE replacement.project_id = source.project_id
                   AND replacement.replaced_project_source_id = source.project_source_id
                   AND replacement.state = 'active'
              ) AS has_active_replacement
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = source.project_source_id
          AND revision.revision = source.current_revision
        WHERE source.project_source_id = $1`,
      [projectSourceId],
    );
    return result.rows[0];
  }

  async #replacementHead(
    client: PoolClient,
    replacedProjectSourceId: string,
  ): Promise<ReplacementHeadRow | undefined> {
    const result = await client.query<ReplacementHeadRow>(
      `SELECT replacement.project_source_replacement_id,
              replacement.revision, replacement.content_hash,
              replacement.record_hash, head.state
         FROM petra.project_source_replacement_heads AS head
         JOIN petra.project_source_replacements AS replacement
           ON replacement.project_source_replacement_id =
              head.current_project_source_replacement_id
        WHERE head.replaced_project_source_id = $1`,
      [replacedProjectSourceId],
    );
    return result.rows[0];
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectHistoryView["content"]["authority"]> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectHistoryViewError(
        "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
        "The PostgreSQL authority position is unavailable.",
      );
    }
    return {
      through_event_position: Number(row.event_position),
      through_stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = timestamp.rows[0]?.read_at.toISOString();
      if (readAt === undefined) {
        throw new PostgresProjectHistoryViewError(
          "PROJECT_HISTORY_VIEW_STORED_RECORD_CORRUPT",
          "PostgreSQL did not provide a read timestamp.",
        );
      }
      const result = await operation(client, readAt);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
