import type { PetraCopilotInputManifest } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { Pool, PoolClient } from "pg";
import {
  CopilotBoundaryError,
  copilotHash,
  COPILOT_PROFILE,
  graphPresentationPeer,
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
const selection = `SELECT t.payload, x.payload AS terminal,m.payload AS input_manifest,m.record_hash AS manifest_hash
  FROM petra.project_copilot_turns t
  LEFT JOIN petra.project_copilot_terminals x USING (run_id)
  LEFT JOIN petra.project_copilot_input_manifests m USING (run_id)`;

export class PostgresCopilotTurnRepository implements CopilotTurnRepository {
  constructor(readonly pool: Pool) {}

  async list(
    projectId: string,
    actorId: string,
    threadId?: string,
  ): Promise<CopilotTurn[]> {
    const result = await this.pool.query<Row>(
      `SELECT payload, terminal, input_manifest, manifest_hash FROM (SELECT t.payload, x.payload AS terminal, m.payload AS input_manifest,m.record_hash AS manifest_hash,t.sequence
      FROM petra.project_copilot_turns t LEFT JOIN petra.project_copilot_terminals x USING (run_id)
      LEFT JOIN petra.project_copilot_input_manifests m USING (run_id)
      WHERE t.project_id = $1 AND t.actor_id = $2
      AND ($3::text IS NULL OR t.thread_id = $3) ORDER BY t.sequence DESC
      LIMIT 200) latest ORDER BY sequence ASC`,
      [projectId, actorId, threadId ?? null],
    );
    return result.rows.map(read);
  }

  async get(
    projectId: string,
    actorId: string,
    runId: string,
  ): Promise<CopilotTurn | undefined> {
    const result = await this.pool.query<Row>(
      `${selection}
      WHERE t.project_id = $1 AND t.actor_id = $2 AND t.run_id = $3`,
      [projectId, actorId, runId],
    );
    return result.rows[0] === undefined ? undefined : read(result.rows[0]);
  }

  async begin(
    turn: CopilotTurn,
  ): Promise<{ turn: CopilotTurn; claimed: boolean }> {
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
        const previous = read(existing.rows[0]);
        if (
          previous.project_id !== turn.project_id ||
          previous.actor_id !== turn.actor_id ||
          previous.request_hash !== turn.request_hash
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
        tail.rows[0] === undefined ? undefined : read(tail.rows[0]);
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
    await this.#insertTerminal(this.pool, turn.run_id, terminal);
    const result = await this.get(turn.project_id, turn.actor_id, turn.run_id);
    if (result === undefined)
      throw new Error("The retained conversation turn is missing.");
    return result;
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
    await this.pool.query(`INSERT INTO petra.project_copilot_terminals
      (run_id, state, payload, finished_at)
      SELECT t.run_id, 'failed', jsonb_build_object('state','failed',
        'finished_at',to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'error','Delivery was interrupted. The provider outcome is unknown; this run will not be invoked again.'), clock_timestamp()
      FROM petra.project_copilot_turns t
      LEFT JOIN petra.project_copilot_terminals x USING (run_id)
      WHERE x.run_id IS NULL AND t.started_at < clock_timestamp() - interval '180 seconds'
      ON CONFLICT (run_id) DO NOTHING`);
  }
}
