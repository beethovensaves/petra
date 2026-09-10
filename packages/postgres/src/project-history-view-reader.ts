import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type {
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryRetainedView,
  PetraProjectHistoryView,
  ProjectHistoryCausalCommandLink,
  ProjectHistoryEventRef,
  ProjectHistoryRecentChange,
  ProjectHistoryReceiptRef,
  ProjectHistoryRecovery,
  ProjectHistoryRetentionSnapshot,
  ProjectHistoryTargetRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
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

interface EventRow {
  event_payload: unknown;
  event_record_hash: string;
}

interface HistoryCursorPayload {
  version: 1;
  project_id: string;
  snapshot_event_position: number;
  snapshot_stream_revision: number;
  snapshot_head_event_id: string;
  snapshot_head_record_hash: string;
  before_stream_revision: number;
}

export interface PostgresProjectHistoryViewReaderOptions {
  readonly cursorSecret?: string;
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
const RETAINED_CURSOR = /^phc1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/u;
const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;
const DEFAULT_CURSOR_SECRET =
  "petra-local-development-history-cursor-secret-v1";
const EVENT_VERSIONS = ["1.0.0", "1.1.0", "1.2.0", "1.3.0"] as const;
const COMMAND_VERSIONS = EVENT_VERSIONS;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

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
  ): Promise<PetraProjectHistoryRetainedView | undefined> {
    const query = this.#retainedQuery(request);
    const cursor =
      query.cursor === undefined
        ? undefined
        : this.#decodeCursor(query.cursor, projectId);
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
          ORDER BY event.stream_revision DESC
          LIMIT $5`,
        [
          projectId,
          retentionSnapshot.through_stream_revision,
          retentionSnapshot.through_event_position,
          beforeStreamRevision,
          query.limit + 1,
        ],
      );
      const hasMore = result.rows.length > query.limit;
      const selectedRows = result.rows.slice(0, query.limit);
      const changes: ProjectHistoryRecentChange[] = [];
      for (const row of selectedRows) {
        changes.push(await this.#change(client, row));
      }
      const count = await client.query<CountRow>(
        `SELECT COUNT(*) AS total_count
           FROM petra.domain_events
          WHERE project_id = $1
            AND stream_revision <= $2
            AND event_position <= $3`,
        [
          projectId,
          retentionSnapshot.through_stream_revision,
          retentionSnapshot.through_event_position,
        ],
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
          version: 1,
          project_id: projectId,
          snapshot_event_position: retentionSnapshot.through_event_position,
          snapshot_stream_revision: retentionSnapshot.through_stream_revision,
          snapshot_head_event_id: retentionSnapshot.head_event_ref.event_id,
          snapshot_head_record_hash:
            retentionSnapshot.head_event_ref.record_hash,
          before_stream_revision: lastChange.event_ref.stream_revision,
        });
      }
      const content = {
        view_kind: "retained_events",
        order_kind: "project_stream_newest_first",
        query,
        changes,
        page: {
          returned_count: changes.length,
          snapshot_total_count: snapshotTotalCount,
          has_more: hasMore,
          ...(nextCursor === undefined ? {} : { next_cursor: nextCursor }),
        },
        retention_snapshot: retentionSnapshot,
        current_authority: currentAuthority,
        recovery_authority: "current_at_page_read",
        omissions: [
          "filters_not_supported",
          "dependency_impact_not_composed",
          "generic_reversal_assessment_not_composed",
          "historical_project_definition_not_interpreted",
          "cross_family_total_order_not_asserted",
        ],
        graph_navigation_history: "client_local_separate",
      };
      const view = {
        schema_name: "petra.project-history-retained-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-history-retained-view",
        "1.0.0",
        view,
      );
      return structuredClone(
        view as unknown as PetraProjectHistoryRetainedView,
      );
    });
  }

  #retainedQuery(
    request: ProjectHistoryRetainedCollectionRequest,
  ): PetraProjectHistoryRetainedView["content"]["query"] {
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
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor is invalid.",
      );
    }
    return {
      limit,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
    };
  }

  #encodeCursor(payload: HistoryCursorPayload): string {
    const encodedPayload = Buffer.from(canonicalize(payload)).toString(
      "base64url",
    );
    const signature = createHmac("sha256", this.#cursorSecret)
      .update(encodedPayload)
      .digest("base64url");
    return `phc1.${encodedPayload}.${signature}`;
  }

  #decodeCursor(cursor: string, projectId: string): HistoryCursorPayload {
    const match = RETAINED_CURSOR.exec(cursor);
    const encodedPayload = match?.[1];
    const encodedSignature = match?.[2];
    if (encodedPayload === undefined || encodedSignature === undefined) {
      throw new ProjectHistoryViewRequestError(
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
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor integrity check failed.",
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as unknown;
    } catch {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor payload is invalid.",
      );
    }
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor payload is invalid.",
      );
    }
    const value = decoded as Record<string, unknown>;
    const keys = Object.keys(value).sort();
    const expectedKeys = [
      "before_stream_revision",
      "project_id",
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
      value.version !== 1 ||
      typeof value.project_id !== "string" ||
      !PROJECT_ID.test(value.project_id) ||
      !isPositiveSafeInteger(value.snapshot_event_position) ||
      !isPositiveSafeInteger(value.snapshot_stream_revision) ||
      typeof value.snapshot_head_event_id !== "string" ||
      !EVENT_ID.test(value.snapshot_head_event_id) ||
      typeof value.snapshot_head_record_hash !== "string" ||
      !CONTENT_HASH.test(value.snapshot_head_record_hash) ||
      !isPositiveSafeInteger(value.before_stream_revision) ||
      value.before_stream_revision > value.snapshot_stream_revision
    ) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor payload is invalid.",
      );
    }
    const payload: HistoryCursorPayload = {
      version: 1,
      project_id: value.project_id,
      snapshot_event_position: value.snapshot_event_position,
      snapshot_stream_revision: value.snapshot_stream_revision,
      snapshot_head_event_id: value.snapshot_head_event_id,
      snapshot_head_record_hash: value.snapshot_head_record_hash,
      before_stream_revision: value.before_stream_revision,
    };
    if (this.#encodeCursor(payload) !== cursor) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor encoding is not canonical.",
      );
    }
    if (payload.project_id !== projectId) {
      throw new ProjectHistoryViewRequestError(
        "Retained Project History cursor belongs to a different Project.",
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
      throw new ProjectHistoryViewRequestError(
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
      throw new ProjectHistoryViewRequestError(
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
      throw new ProjectHistoryViewRequestError(
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
