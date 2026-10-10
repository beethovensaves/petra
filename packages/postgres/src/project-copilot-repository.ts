import type { PetraCopilotInputManifest } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { Pool, PoolClient } from "pg";
import {
  CanonicalCopilotOwnership,
  type CanonicalCopilotOwnershipOptions,
} from "./canonical-copilot-ownership.js";
import {
  CopilotBoundaryError,
  copilotHash,
  COPILOT_PROFILE,
  graphPresentationPeer,
  type ConversationHistoryPage,
  type ConversationHistoryRequest,
  type CopilotTurn,
  type CopilotTerminal,
  type CopilotTurnRepository,
} from "@petra/core";

type Row = {
  payload: CopilotTurn;
  terminal: CopilotTerminal | null;
  input_manifest?: PetraCopilotInputManifest | null;
  manifest_hash?: string | null;
};
const contracts = new PetraContractRegistry();
const retryContent = (turn: CopilotTurn) => {
  const {
    started_at: ignoredStart,
    instance_id: ignoredInstance,
    ...content
  } = original(turn);
  void ignoredStart;
  void ignoredInstance;
  return content;
};
const original = ({
  terminal: ignoredTerminal,
  input_manifest: ignoredManifest,
  ...content
}: CopilotTurn) => {
  void ignoredTerminal;
  void ignoredManifest;
  return content;
};
const assertManifest = (
  turn: CopilotTurn,
  manifest: PetraCopilotInputManifest,
): void => {
  contracts.assertValid("copilot-input-manifest", "1.0.0", manifest);
  const content = manifest.content;
  if (
    copilotHash(content) !== manifest.content_hash ||
    content.run_id !== turn.run_id ||
    content.thread_id !== turn.thread_id ||
    content.project_id !== turn.project_id ||
    content.actor_id !== turn.actor_id ||
    content.context_hash !== turn.context.content_hash ||
    content.history.length !== content.retained_history_count ||
    content.history.filter(
      (entry) => entry.disclosure === "excluded_history_budget",
    ).length !== content.excluded_history_count ||
    content.retained_history_count - content.excluded_history_count > 12 ||
    copilotHash(content.context_record_keys) !==
      copilotHash(turn.context.records.map((record) => record.key))
  )
    throw new CopilotBoundaryError(
      "INPUT_MANIFEST_MISMATCH",
      "The prepared disclosure manifest does not bind this exact retained turn, context and bounded history.",
    );
};
const read = (row: Row): CopilotTurn => {
  contracts.assertValid(
    "copilot-turn",
    row.payload.schema_version,
    row.payload,
  );
  const scene = row.payload.shared_scene;
  if (
    scene !== undefined &&
    (scene.content.project_id !== row.payload.project_id ||
      copilotHash(scene.content) !== scene.content_hash ||
      copilotHash(graphPresentationPeer(scene.content)) !==
        scene.content.peer_content_hash ||
      row.payload.context.records.find(
        (record) => record.key === `scene:${scene.content_hash.slice(7, 23)}`,
      )?.ref.record_hash !== copilotHash(scene))
  )
    throw new CopilotBoundaryError(
      "SHARED_SCENE_MISMATCH",
      "The immutable turn's original shared graph scene is incoherent.",
    );
  if (row.input_manifest !== undefined && row.input_manifest !== null) {
    assertManifest(row.payload, row.input_manifest);
    if (copilotHash(row.input_manifest) !== row.manifest_hash)
      throw new CopilotBoundaryError(
        "INPUT_MANIFEST_MISMATCH",
        "The retained input manifest's exact identity is incoherent.",
      );
  }
  return {
    ...row.payload,
    ...(row.terminal === null ? {} : { terminal: row.terminal }),
    ...(row.input_manifest === undefined || row.input_manifest === null
      ? {}
      : { input_manifest: row.input_manifest }),
  };
};
const selection = `SELECT t.payload, t.sequence::text AS sequence, x.payload AS terminal,m.payload AS input_manifest,m.record_hash AS manifest_hash
  FROM petra.project_copilot_turns t
  LEFT JOIN petra.project_copilot_terminals x USING (run_id)
  LEFT JOIN petra.project_copilot_input_manifests m USING (run_id)`;

export class PostgresCopilotTurnRepository implements CopilotTurnRepository {
  readonly ownership: CanonicalCopilotOwnership | undefined;
  constructor(
    readonly pool: Pool,
    options?: CanonicalCopilotOwnershipOptions,
  ) {
    this.ownership =
      options === undefined
        ? undefined
        : new CanonicalCopilotOwnership(pool, options);
  }
  #requireOwnership(): CanonicalCopilotOwnership {
    if (this.ownership === undefined)
      throw new CopilotBoundaryError(
        "CANONICAL_CONVERSATION_UNAVAILABLE",
        "Retained Project conversation requires canonical Thread, Run and Work ownership.",
      );
    return this.ownership;
  }
  async #readOwned(
    row: Row,
    client: Pool | PoolClient = this.pool,
  ): Promise<CopilotTurn> {
    const turn = read(row);
    await this.#requireOwnership().assert(turn, client);
    return turn;
  }
  /** Explicit retention import: preserve legacy bytes; never reconstruct original execution authority. */
  async #adopt(
    projectId: string,
    actorId: string,
    threadId?: string,
  ): Promise<void> {
    if (this.ownership === undefined) return;
    const legacy = await this.pool.query<Row>(
      `${selection} WHERE t.project_id=$1 AND t.actor_id=$2 AND ($3::text IS NULL OR t.thread_id=$3)
      AND NOT EXISTS(SELECT 1 FROM petra.project_copilot_owner_bindings b WHERE b.run_id=t.run_id) ORDER BY t.sequence`,
      [projectId, actorId, threadId ?? null],
    );
    for (const row of legacy.rows) {
      const turn = read(row);
      const originalTerminal = turn.terminal;
      // An active provider outcome is not adopted or re-invoked. Recovery first records uncertainty.
      if (originalTerminal === undefined)
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISSING",
          "An unbound active legacy conversation awaits outcome recovery before retention import.",
        );
      const input = await this.ownership.retainContent(turn),
        response = await this.ownership.retainContent(turn, originalTerminal);
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`copilot:${projectId}:${actorId}:${turn.thread_id}`],
        );
        if (
          (await this.ownership.read(
            projectId,
            actorId,
            turn.run_id,
            client,
          )) === undefined
        ) {
          await this.ownership.begin(
            client,
            turn,
            input,
            "historical_adoption",
          );
          await this.ownership.finish(client, turn, originalTerminal, response);
        }
        await this.ownership.assert(turn, client);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async #readTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async listPage(
    projectId: string,
    actorId: string,
    request: ConversationHistoryRequest,
  ): Promise<ConversationHistoryPage> {
    const limit = request.limit ?? 10,
      byteLimit = 2 * 1024 * 1024;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      !/^thread_[0-9A-HJKMNP-TV-Z]{26}$/u.test(request.thread_id)
    )
      throw new CopilotBoundaryError(
        "INVALID_HISTORY_PAGE",
        "Conversation history requires a bounded page and exact protocol thread.",
      );
    let cursor:
      | {
          project_id: string;
          actor_id: string;
          thread_id: string;
          anchor: number;
          before: number;
        }
      | undefined;
    if (request.cursor !== undefined) {
      try {
        if (
          request.cursor.length > 2000 ||
          !/^history:[A-Za-z0-9_-]+$/u.test(request.cursor)
        )
          throw new Error();
        cursor = JSON.parse(
          Buffer.from(request.cursor.slice(8), "base64url").toString("utf8"),
        ) as typeof cursor;
      } catch {
        throw new CopilotBoundaryError(
          "INVALID_HISTORY_PAGE",
          "The conversation history cursor is malformed.",
        );
      }
      if (
        cursor === undefined ||
        cursor === null ||
        typeof cursor !== "object" ||
        Array.isArray(cursor) ||
        cursor.project_id !== projectId ||
        cursor.actor_id !== actorId ||
        cursor.thread_id !== request.thread_id ||
        !Number.isSafeInteger(cursor.anchor) ||
        cursor.anchor < 1 ||
        !Number.isSafeInteger(cursor.before) ||
        cursor.before < 1 ||
        cursor.before > cursor.anchor + 1
      )
        throw new CopilotBoundaryError(
          "INVALID_HISTORY_PAGE",
          "The history cursor does not belong to this exact actor, Project and thread.",
        );
    }
    if (
      this.ownership !== undefined &&
      actorId !== this.ownership.options.actorId
    )
      return {
        entries: [],
        page: {
          returned_count: 0,
          has_more: false,
          anchor_sequence: 0,
          byte_limit: byteLimit,
        },
      };
    await this.#adopt(projectId, actorId, request.thread_id);
    return this.#readTransaction(async (client) => {
      const latest = (
        await client.query<{ sequence: string }>(
          "SELECT max(sequence)::text AS sequence FROM petra.project_copilot_turns WHERE project_id=$1 AND actor_id=$2 AND thread_id=$3",
          [projectId, actorId, request.thread_id],
        )
      ).rows[0]?.sequence;
      const anchor = cursor?.anchor ?? Number(latest ?? 0),
        before = cursor?.before ?? anchor + 1;
      if (!Number.isSafeInteger(anchor) || !Number.isSafeInteger(before))
        throw new CopilotBoundaryError(
          "INVALID_HISTORY_PAGE",
          "The retained history position exceeds the supported page range.",
        );
      const result = await client.query<Row & { sequence: string }>(
        `${selection} WHERE t.project_id=$1 AND t.actor_id=$2 AND t.thread_id=$3 AND t.sequence <= $4 AND t.sequence < $5 ORDER BY t.sequence DESC LIMIT $6`,
        [projectId, actorId, request.thread_id, anchor, before, limit + 1],
      );
      const entries: {
        turn: CopilotTurn;
        owners: ConversationHistoryPage["entries"][number]["owners"];
      }[] = [];
      let bytes = 0,
        earliest = before,
        hasMore = result.rows.length > limit;
      for (const row of result.rows.slice(0, limit)) {
        const turn = await this.#readOwned(row, client),
          owned = await this.#requireOwnership().read(
            projectId,
            actorId,
            turn.run_id,
            client,
          );
        if (owned === undefined)
          throw new CopilotBoundaryError(
            "CONVERSATION_OWNER_MISSING",
            "A history turn has no canonical owner.",
          );
        const entry = { turn, owners: owned.binding },
          size = Buffer.byteLength(JSON.stringify(entry));
        if (bytes + size > byteLimit) {
          if (entries.length === 0)
            throw new CopilotBoundaryError(
              "HISTORY_CONTENT_LIMIT",
              "This exact retained turn exceeds the history page budget; its content has not been truncated or substituted.",
            );
          hasMore = true;
          break;
        }
        entries.push(entry);
        bytes += size;
        earliest = Number(row.sequence);
      }
      return {
        entries: entries.reverse(),
        page: {
          returned_count: entries.length,
          has_more: hasMore,
          anchor_sequence: anchor,
          byte_limit: byteLimit,
          ...(hasMore
            ? {
                next_cursor: `history:${Buffer.from(JSON.stringify({ project_id: projectId, actor_id: actorId, thread_id: request.thread_id, anchor, before: earliest })).toString("base64url")}`,
              }
            : {}),
        },
      };
    });
  }
  async list(
    projectId: string,
    actorId: string,
    threadId?: string,
  ): Promise<CopilotTurn[]> {
    if (
      this.ownership !== undefined &&
      actorId !== this.ownership.options.actorId
    )
      return [];
    await this.#adopt(projectId, actorId, threadId);
    return this.#readTransaction(async (client) => {
      const result = await client.query<Row>(
        `SELECT payload, terminal, input_manifest, manifest_hash FROM (SELECT t.payload, x.payload AS terminal, m.payload AS input_manifest,m.record_hash AS manifest_hash,t.sequence
      FROM petra.project_copilot_turns t LEFT JOIN petra.project_copilot_terminals x USING (run_id)
      LEFT JOIN petra.project_copilot_input_manifests m USING (run_id)
      WHERE t.project_id = $1 AND t.actor_id = $2
      AND ($3::text IS NULL OR t.thread_id = $3) ORDER BY t.sequence DESC
      LIMIT 200) latest ORDER BY sequence ASC`,
        [projectId, actorId, threadId ?? null],
      );
      return Promise.all(
        result.rows.map((row) => this.#readOwned(row, client)),
      );
    });
  }

  async get(
    projectId: string,
    actorId: string,
    runId: string,
  ): Promise<CopilotTurn | undefined> {
    if (
      this.ownership !== undefined &&
      actorId !== this.ownership.options.actorId
    )
      return undefined;
    const exact = await this.pool.query<{ thread_id: string }>(
      "SELECT thread_id FROM petra.project_copilot_turns WHERE project_id=$1 AND actor_id=$2 AND run_id=$3",
      [projectId, actorId, runId],
    );
    if (exact.rows[0] === undefined) return undefined;
    await this.#adopt(projectId, actorId, exact.rows[0].thread_id);
    return this.#readTransaction(async (client) => {
      const result = await client.query<Row>(
        `${selection}
      WHERE t.project_id = $1 AND t.actor_id = $2 AND t.run_id = $3`,
        [projectId, actorId, runId],
      );
      return result.rows[0] === undefined
        ? undefined
        : this.#readOwned(result.rows[0], client);
    });
  }

  async begin(
    turn: CopilotTurn,
  ): Promise<{ turn: CopilotTurn; claimed: boolean }> {
    const ownership = this.#requireOwnership();
    if (turn.actor_id !== ownership.options.actorId)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The turn does not belong to the server-authenticated actor.",
      );
    await this.#adopt(turn.project_id, turn.actor_id, turn.thread_id);
    const inputArtifact = await ownership.retainContent(turn);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`copilot:${turn.project_id}:${turn.actor_id}:${turn.thread_id}`],
      );
      const existing = await client.query<Row>(
        `${selection} WHERE t.run_id = $1`,
        [turn.run_id],
      );
      if (existing.rows[0] !== undefined) {
        const previous = await this.#readOwned(existing.rows[0], client);
        if (
          previous.project_id !== turn.project_id ||
          previous.actor_id !== turn.actor_id ||
          previous.request_hash !== turn.request_hash ||
          copilotHash(retryContent(previous)) !==
            copilotHash(retryContent(turn))
        ) {
          throw new CopilotBoundaryError(
            "RUN_ID_CONFLICT",
            "This run identity was already used for another request.",
          );
        }
        await client.query("COMMIT");
        return { turn: previous, claimed: false };
      }
      const tail = await client.query<Row>(
        `${selection}
        WHERE t.project_id = $1 AND t.actor_id = $2 AND t.thread_id = $3
        ORDER BY t.sequence DESC LIMIT 1`,
        [turn.project_id, turn.actor_id, turn.thread_id],
      );
      const previous =
        tail.rows[0] === undefined
          ? undefined
          : await this.#readOwned(tail.rows[0], client);
      if (
        (previous?.run_id ?? null) !== turn.parent_run_id ||
        (previous !== undefined && previous.terminal === undefined)
      ) {
        throw new CopilotBoundaryError(
          "STALE_CONTINUATION",
          "This conversation changed or still has an active answer. Refresh before continuing.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_copilot_turns
        (run_id, thread_id, project_id, actor_id, parent_run_id, request_hash, payload, started_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          turn.run_id,
          turn.thread_id,
          turn.project_id,
          turn.actor_id,
          turn.parent_run_id,
          turn.request_hash,
          JSON.stringify(turn),
          turn.started_at,
        ],
      );
      await ownership.begin(client, turn, inputArtifact);
      await ownership.assert(turn, client);
      await client.query("COMMIT");
      return { turn, claimed: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async putInputManifest(
    turn: CopilotTurn,
    manifest: PetraCopilotInputManifest,
  ): Promise<void> {
    assertManifest(turn, manifest);
    if (manifest.content.profile_hash !== copilotHash(COPILOT_PROFILE))
      throw new CopilotBoundaryError(
        "INPUT_MANIFEST_MISMATCH",
        "New advisory input must bind the current exact conversational role profile.",
      );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ payload: CopilotTurn }>(
        "SELECT payload FROM petra.project_copilot_turns WHERE run_id=$1 AND project_id=$2 AND actor_id=$3 FOR SHARE",
        [turn.run_id, turn.project_id, turn.actor_id],
      );
      const retained = result.rows[0]?.payload;
      if (
        retained === undefined ||
        retained.request_hash !== turn.request_hash ||
        copilotHash(retained.context) !== copilotHash(turn.context)
      )
        throw new CopilotBoundaryError(
          "INPUT_MANIFEST_MISMATCH",
          "An input manifest requires the exact retained owner and context before model invocation.",
        );
      await this.#requireOwnership().assert(retained, client);
      assertManifest(retained, manifest);
      await client.query(
        "INSERT INTO petra.project_copilot_input_manifests(run_id,project_id,actor_id,content_hash,record_hash,payload,prepared_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz) ON CONFLICT(run_id) DO NOTHING",
        [
          turn.run_id,
          turn.project_id,
          turn.actor_id,
          manifest.content_hash,
          copilotHash(manifest),
          JSON.stringify(manifest),
          manifest.content.prepared_at,
        ],
      );
      const stored = await client.query<{ record_hash: string }>(
        "SELECT record_hash FROM petra.project_copilot_input_manifests WHERE run_id=$1",
        [turn.run_id],
      );
      if (stored.rows[0]?.record_hash !== copilotHash(manifest))
        throw new CopilotBoundaryError(
          "INPUT_MANIFEST_CONFLICT",
          "This run already prepared a different model input; it cannot be silently replaced.",
        );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async finish(
    turn: CopilotTurn,
    terminal: CopilotTerminal,
  ): Promise<CopilotTurn> {
    const ownership = this.#requireOwnership();
    const response = await ownership.retainContent(turn, terminal);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`copilot:${turn.project_id}:${turn.actor_id}:${turn.thread_id}`],
      );
      const rows = await client.query<Row>(
        `${selection} WHERE t.run_id=$1 AND t.project_id=$2 AND t.actor_id=$3`,
        [turn.run_id, turn.project_id, turn.actor_id],
      );
      if (rows.rows[0] === undefined)
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISSING",
          "The retained conversation owner is missing.",
        );
      const previous = await this.#readOwned(rows.rows[0], client);
      if (copilotHash(original(previous)) !== copilotHash(original(turn)))
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISMATCH",
          "Completion must preserve the exact retained question and original context.",
        );
      if (previous.terminal !== undefined) {
        await client.query("COMMIT");
        return previous;
      }
      await this.#insertTerminal(client, turn.run_id, terminal);
      await ownership.finish(client, turn, terminal, response);
      const retained = { ...previous, terminal };
      await ownership.assert(retained, client);
      await client.query("COMMIT");
      return retained;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #insertTerminal(
    client: Pool | PoolClient,
    runId: string,
    terminal: CopilotTerminal,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.project_copilot_terminals
      (run_id, state, payload, finished_at) VALUES ($1,$2,$3::jsonb,$4)
      ON CONFLICT (run_id) DO NOTHING`,
      [runId, terminal.state, JSON.stringify(terminal), terminal.finished_at],
    );
  }

  async recover(): Promise<void> {
    // A provider invocation is bounded to 120s. After 180s its outcome is
    // uncertain, and recovery records failure rather than invoking it again.
    const expired = await this.pool.query<Row>(
      `${selection} WHERE x.run_id IS NULL AND t.started_at < clock_timestamp() - interval '180 seconds' ORDER BY t.sequence`,
    );
    for (const row of expired.rows) {
      const turn = read(row);
      const terminal: CopilotTerminal = {
        state: "failed",
        finished_at: new Date().toISOString(),
        error:
          "Delivery was interrupted. The provider outcome is unknown; this run will not be invoked again.",
      };
      const owned = await this.ownership?.read(
        turn.project_id,
        turn.actor_id,
        turn.run_id,
      );
      if (owned === undefined) {
        // Preserve unknown legacy outcomes before the separately labelled retention import.
        await this.#insertTerminal(this.pool, turn.run_id, terminal);
      } else await this.finish(turn, terminal);
    }
  }
}
