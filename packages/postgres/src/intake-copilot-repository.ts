import type { Pool, PoolClient } from "pg";
import type {
  PetraIntakeCopilotSession,
  PetraIntakeCopilotInputManifest,
  PetraProjectDefinitionDraftView,
  PetraIntakeProjectBinding,
  PetraProjectDefinitionDraftCommandRequestV11,
  PetraProjectDefinitionDraftCommandReceipt,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  derivePetraId,
  INTAKE_COPILOT_PROFILE,
  type IntakeCopilotTurn,
  type IntakeCopilotTurnRepository,
  type CopilotTerminal,
} from "@petra/core";
const contracts = new PetraContractRegistry();
type SessionRow = { payload: PetraIntakeCopilotSession; record_hash: string };
type TurnRow = {
  payload: IntakeCopilotTurn;
  record_hash: string;
  terminal: CopilotTerminal | null;
  input_manifest: PetraIntakeCopilotInputManifest | null;
  manifest_hash: string | null;
};
const sessionFrom = (row: SessionRow): PetraIntakeCopilotSession => {
  contracts.assertValid("intake-copilot-session", "1.0.0", row.payload);
  const session = row.payload,
    content = session.content;
  if (
    copilotHash(session) !== row.record_hash ||
    copilotHash(content) !== session.content_hash ||
    copilotHash(content.policy) !== content.policy_hash ||
    content.consent.accepted_policy_hash !== content.policy_hash ||
    content.consent.accepted_by !== content.actor_id
  )
    throw new CopilotBoundaryError(
      "INTAKE_SESSION_CORRUPT",
      "The retained intake ownership or consent identity is incoherent.",
    );
  return structuredClone(session);
};
const assertManifest = (
  turn: IntakeCopilotTurn,
  manifest: PetraIntakeCopilotInputManifest,
): void => {
  contracts.assertValid("intake-copilot-input-manifest", "1.0.0", manifest);
  const c = manifest.content;
  if (
    copilotHash(c) !== manifest.content_hash ||
    c.run_id !== turn.run_id ||
    c.intake_session_id !== turn.intake_session_id ||
    c.actor_id !== turn.actor_id ||
    c.thread_id !== turn.thread_id ||
    c.context_hash !== turn.context.content_hash ||
    c.retained_history_count !== c.history.length ||
    c.included_history_count !==
      c.history.filter(
        (entry) => entry.disclosure !== "excluded_history_budget",
      ).length
  )
    throw new CopilotBoundaryError(
      "INTAKE_MANIFEST_MISMATCH",
      "The intake input manifest does not bind this exact owner, turn and discussion.",
    );
};
const turnFrom = (row: TurnRow): IntakeCopilotTurn => {
  contracts.assertValid("intake-copilot-turn", "1.0.0", row.payload);
  if (
    copilotHash(row.payload) !== row.record_hash ||
    copilotHash(row.payload.context.content) !==
      row.payload.context.content_hash
  )
    throw new CopilotBoundaryError(
      "INTAKE_TURN_CORRUPT",
      "The retained intake turn identity is incoherent.",
    );
  if (row.input_manifest !== null) {
    assertManifest(row.payload, row.input_manifest);
    if (copilotHash(row.input_manifest) !== row.manifest_hash)
      throw new CopilotBoundaryError(
        "INTAKE_MANIFEST_MISMATCH",
        "The retained manifest hash is incoherent.",
      );
  }
  const turn = {
    ...structuredClone(row.payload),
    ...(row.terminal === null ? {} : { terminal: row.terminal }),
    ...(row.input_manifest === null
      ? {}
      : { input_manifest: row.input_manifest }),
  };
  contracts.assertValid("intake-copilot-turn", "1.0.0", turn);
  return turn;
};
const selection = `SELECT t.payload,t.record_hash,x.payload AS terminal,m.payload AS input_manifest,m.record_hash AS manifest_hash
  FROM petra.intake_copilot_turns t JOIN petra.intake_copilot_sessions s USING(intake_session_id)
  LEFT JOIN petra.intake_copilot_terminals x USING(run_id) LEFT JOIN petra.intake_copilot_input_manifests m USING(run_id)`;
export const lockIntakeCopilotSession = async (
  client: PoolClient,
  intakeId: string,
): Promise<void> => {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `intake-session:${intakeId}`,
  ]);
};
export class PostgresIntakeCopilotRepository implements IntakeCopilotTurnRepository {
  constructor(readonly pool: Pool) {}
  async getSession(
    intakeId: string,
    actorId: string,
  ): Promise<PetraIntakeCopilotSession | undefined> {
    const result = await this.pool.query<SessionRow>(
      "SELECT payload,record_hash FROM petra.intake_copilot_sessions WHERE intake_session_id=$1 AND actor_id=$2",
      [intakeId, actorId],
    );
    return result.rows[0] === undefined
      ? undefined
      : sessionFrom(result.rows[0]);
  }
  async createSession(
    session: PetraIntakeCopilotSession,
  ): Promise<PetraIntakeCopilotSession> {
    sessionFrom({ payload: session, record_hash: copilotHash(session) });
    return this.#transaction(async (client) => {
      await lockIntakeCopilotSession(client, session.content.intake_session_id);
      const previous = await client.query<SessionRow>(
        "SELECT payload,record_hash FROM petra.intake_copilot_sessions WHERE intake_session_id=$1",
        [session.content.intake_session_id],
      );
      if (previous.rows[0] !== undefined) {
        const old = sessionFrom(previous.rows[0]);
        if (
          old.content.actor_id !== session.content.actor_id ||
          old.content.policy_hash !== session.content.policy_hash ||
          old.content.thread_id !== session.content.thread_id
        )
          throw new CopilotBoundaryError(
            "INTAKE_SESSION_CONFLICT",
            "This session identity belongs to different ownership or acknowledged policy.",
          );
        return old;
      }
      await client.query(
        `INSERT INTO petra.intake_copilot_sessions(intake_session_id,actor_id,thread_id,policy_hash,record_hash,payload,opened_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,
        [
          session.content.intake_session_id,
          session.content.actor_id,
          session.content.thread_id,
          session.content.policy_hash,
          copilotHash(session),
          JSON.stringify(session),
          session.content.opened_at,
        ],
      );
      return session;
    });
  }
  async listSessions(actorId: string): Promise<PetraIntakeCopilotSession[]> {
    const result = await this.pool.query<SessionRow>(
      "SELECT payload,record_hash FROM petra.intake_copilot_sessions WHERE actor_id=$1 ORDER BY opened_at DESC LIMIT 50",
      [actorId],
    );
    return result.rows.map(sessionFrom);
  }
  async list(intakeId: string, actorId: string): Promise<IntakeCopilotTurn[]> {
    const result = await this.pool.query<TurnRow>(
      `${selection} WHERE t.intake_session_id=$1 AND s.actor_id=$2 AND t.actor_id=s.actor_id ORDER BY t.sequence LIMIT 20`,
      [intakeId, actorId],
    );
    return result.rows.map(turnFrom);
  }
  async get(
    intakeId: string,
    actorId: string,
    runId: string,
  ): Promise<IntakeCopilotTurn | undefined> {
    const result = await this.pool.query<TurnRow>(
      `${selection} WHERE t.intake_session_id=$1 AND s.actor_id=$2 AND t.actor_id=s.actor_id AND t.run_id=$3`,
      [intakeId, actorId, runId],
    );
    return result.rows[0] === undefined ? undefined : turnFrom(result.rows[0]);
  }
  async begin(
    turn: IntakeCopilotTurn,
  ): Promise<{ turn: IntakeCopilotTurn; claimed: boolean }> {
    contracts.assertValid("intake-copilot-turn", "1.0.0", turn);
    return this.#transaction(async (client) => {
      await lockIntakeCopilotSession(client, turn.intake_session_id);
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`intake-run:${turn.run_id}`],
      );
      const existing = await client.query<TurnRow>(
        `${selection} WHERE t.run_id=$1`,
        [turn.run_id],
      );
      if (existing.rows[0] !== undefined) {
        const previous = turnFrom(existing.rows[0]);
        if (
          previous.intake_session_id !== turn.intake_session_id ||
          previous.actor_id !== turn.actor_id ||
          previous.request_hash !== turn.request_hash
        )
          throw new CopilotBoundaryError(
            "INTAKE_RUN_CONFLICT",
            "This request identity belongs to a different retained intake question.",
          );
        return { turn: previous, claimed: false };
      }
      const owner = await client.query<SessionRow>(
        "SELECT payload,record_hash FROM petra.intake_copilot_sessions WHERE intake_session_id=$1 AND actor_id=$2",
        [turn.intake_session_id, turn.actor_id],
      );
      if (owner.rows[0] === undefined)
        throw new CopilotBoundaryError(
          "INTAKE_UNAVAILABLE",
          "This intake is unavailable to the authenticated actor.",
        );
      const session = sessionFrom(owner.rows[0]);
      if (
        session.content.thread_id !== turn.thread_id ||
        copilotHash(session) !== turn.context.content.session_record_hash ||
        session.content.policy_hash !== turn.context.content.policy_hash ||
        turn.context.content.actor_id !== turn.actor_id ||
        turn.context.content.intake_session_id !== turn.intake_session_id ||
        copilotHash(turn.context.content) !== turn.context.content_hash
      )
        throw new CopilotBoundaryError(
          "INTAKE_CONTEXT_MISMATCH",
          "The question does not bind this exact acknowledged intake session.",
        );
      const binding = await client.query(
        "SELECT 1 FROM petra.intake_project_bindings WHERE intake_session_id=$1",
        [turn.intake_session_id],
      );
      if (binding.rowCount !== 0)
        throw new CopilotBoundaryError(
          "INTAKE_ALREADY_BOUND",
          "This intake is retained with its created Project. Continue in that Project's conversation.",
        );
      const drafts = await client.query<{
        payload: PetraProjectDefinitionDraftView;
        draft_hash: string;
      }>(
        "SELECT payload,draft_hash FROM petra.intake_copilot_definition_drafts WHERE intake_session_id=$1 ORDER BY sequence DESC LIMIT 1",
        [turn.intake_session_id],
      );
      const latestDraft = drafts.rows[0];
      const draftRef = turn.context.content.definition_draft_ref;
      if (
        (latestDraft === undefined &&
          (draftRef !== null ||
            turn.context.content.outcome_wording !== null)) ||
        (latestDraft !== undefined &&
          (draftRef?.record_id !== latestDraft.payload.draft_id ||
            draftRef.revision !== 1 ||
            draftRef.record_hash !== latestDraft.draft_hash ||
            turn.context.content.outcome_wording !==
              latestDraft.payload.content.request.outcome))
      )
        throw new CopilotBoundaryError(
          "INTAKE_CONTEXT_CHANGED",
          "The selected definition draft changed before the question was retained. Read its exact current basis before asking.",
        );
      const history = await client.query<TurnRow>(
        `${selection} WHERE t.intake_session_id=$1 ORDER BY t.sequence DESC`,
        [turn.intake_session_id],
      );
      if (history.rows.length >= 20)
        throw new CopilotBoundaryError(
          "INTAKE_TURN_LIMIT",
          "This session reached its acknowledged 20-turn limit. Review creation or explicitly start another intake.",
        );
      const tail =
        history.rows[0] === undefined ? undefined : turnFrom(history.rows[0]);
      if (
        (tail?.run_id ?? null) !== turn.parent_run_id ||
        (tail !== undefined && tail.terminal === undefined)
      )
        throw new CopilotBoundaryError(
          "INTAKE_STALE_CONTINUATION",
          "The intake changed or still has an active answer. Read its retained outcome before continuing.",
        );
      await client.query(
        `INSERT INTO petra.intake_copilot_turns(run_id,intake_session_id,actor_id,parent_run_id,request_hash,record_hash,payload,started_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          turn.run_id,
          turn.intake_session_id,
          turn.actor_id,
          turn.parent_run_id,
          turn.request_hash,
          copilotHash(turn),
          JSON.stringify(turn),
          turn.started_at,
        ],
      );
      return { turn, claimed: true };
    });
  }
  async putInputManifest(
    turn: IntakeCopilotTurn,
    manifest: PetraIntakeCopilotInputManifest,
  ): Promise<void> {
    assertManifest(turn, manifest);
    if (manifest.content.profile_hash !== copilotHash(INTAKE_COPILOT_PROFILE))
      throw new CopilotBoundaryError(
        "INTAKE_MANIFEST_PROFILE",
        "The prepared intake input uses an unregistered role profile.",
      );
    await this.#transaction(async (client) => {
      const retained = await client.query<{ record_hash: string }>(
        "SELECT record_hash FROM petra.intake_copilot_turns WHERE run_id=$1 AND intake_session_id=$2 AND actor_id=$3 FOR SHARE",
        [turn.run_id, turn.intake_session_id, turn.actor_id],
      );
      const {
        terminal: ignoredTerminal,
        input_manifest: ignoredManifest,
        ...input
      } = turn;
      void ignoredTerminal;
      void ignoredManifest;
      if (retained.rows[0]?.record_hash !== copilotHash(input))
        throw new CopilotBoundaryError(
          "INTAKE_TURN_MISMATCH",
          "The manifest does not belong to this immutable question input.",
        );
      await client.query(
        `INSERT INTO petra.intake_copilot_input_manifests(run_id,intake_session_id,actor_id,record_hash,payload,prepared_at) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(run_id) DO NOTHING`,
        [
          turn.run_id,
          turn.intake_session_id,
          turn.actor_id,
          copilotHash(manifest),
          JSON.stringify(manifest),
          manifest.content.prepared_at,
        ],
      );
      const row = await client.query<{ record_hash: string }>(
        "SELECT record_hash FROM petra.intake_copilot_input_manifests WHERE run_id=$1",
        [turn.run_id],
      );
      if (row.rows[0]?.record_hash !== copilotHash(manifest))
        throw new CopilotBoundaryError(
          "INTAKE_MANIFEST_CONFLICT",
          "This turn already has a different immutable prepared input.",
        );
    });
  }
  async finish(
    turn: IntakeCopilotTurn,
    terminal: CopilotTerminal,
  ): Promise<IntakeCopilotTurn> {
    contracts.assertValid("intake-copilot-turn", "1.0.0", {
      ...turn,
      terminal,
    });
    return this.#transaction(async (client) => {
      const stored = await client.query<TurnRow>(
        `${selection} WHERE t.run_id=$1 AND s.actor_id=$2 AND t.intake_session_id=$3 FOR UPDATE OF t`,
        [turn.run_id, turn.actor_id, turn.intake_session_id],
      );
      if (
        stored.rows[0] === undefined ||
        stored.rows[0].payload.request_hash !== turn.request_hash
      )
        throw new CopilotBoundaryError(
          "INTAKE_RUN_UNAVAILABLE",
          "This retained intake question is unavailable.",
        );
      await client.query(
        "INSERT INTO petra.intake_copilot_terminals(run_id,state,payload,finished_at) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(run_id) DO NOTHING",
        [
          turn.run_id,
          terminal.state,
          JSON.stringify(terminal),
          terminal.finished_at,
        ],
      );
      const result = await client.query<TurnRow>(
        `${selection} WHERE t.run_id=$1`,
        [turn.run_id],
      );
      return turnFrom(result.rows[0]!);
    });
  }
  async recover(): Promise<void> {
    await this.pool
      .query(`INSERT INTO petra.intake_copilot_terminals(run_id,state,payload,finished_at)
    SELECT t.run_id,'failed',jsonb_build_object('state','failed','finished_at',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'error','The intake owner stopped before delivering a retained answer. No automatic retry or Project creation occurred.'),clock_timestamp()
    FROM petra.intake_copilot_turns t LEFT JOIN petra.intake_copilot_terminals x USING(run_id)
    WHERE x.run_id IS NULL AND t.started_at<clock_timestamp()-interval '180 seconds' ON CONFLICT(run_id) DO NOTHING`);
  }
  async retainDraft(
    intakeId: string,
    actorId: string,
    draft: PetraProjectDefinitionDraftView,
  ): Promise<void> {
    contracts.assertValid("project-definition-draft-view", "1.0.0", draft);
    await this.#transaction(async (client) => {
      await lockIntakeCopilotSession(client, intakeId);
      await this.#requireOpenSession(client, intakeId, actorId);
      await client.query(
        "INSERT INTO petra.intake_copilot_definition_drafts(intake_session_id,draft_hash,payload,selected_at) VALUES($1,$2,$3::jsonb,clock_timestamp()) ON CONFLICT DO NOTHING",
        [intakeId, copilotHash(draft), JSON.stringify(draft)],
      );
    });
  }
  async latestDraft(
    intakeId: string,
    actorId: string,
  ): Promise<PetraProjectDefinitionDraftView | undefined> {
    const result = await this.pool.query<{
      payload: PetraProjectDefinitionDraftView;
      draft_hash: string;
    }>(
      `SELECT d.payload,d.draft_hash FROM petra.intake_copilot_definition_drafts d JOIN petra.intake_copilot_sessions s USING(intake_session_id) WHERE d.intake_session_id=$1 AND s.actor_id=$2 ORDER BY d.sequence DESC LIMIT 1`,
      [intakeId, actorId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    contracts.assertValid(
      "project-definition-draft-view",
      "1.0.0",
      row.payload,
    );
    if (copilotHash(row.payload) !== row.draft_hash)
      throw new CopilotBoundaryError(
        "INTAKE_DRAFT_CORRUPT",
        "The retained intake definition draft is incoherent.",
      );
    return row.payload;
  }
  async binding(
    intakeId: string,
    actorId: string,
  ): Promise<PetraIntakeProjectBinding | undefined> {
    const result = await this.pool.query<{
      payload: PetraIntakeProjectBinding;
      record_hash: string;
      session_hash: string;
      receipt: PetraProjectDefinitionDraftCommandReceipt;
    }>(
      `SELECT b.payload,b.record_hash,s.record_hash AS session_hash,r.payload AS receipt FROM petra.intake_project_bindings b JOIN petra.intake_copilot_sessions s USING(intake_session_id) JOIN petra.project_definition_draft_command_receipts r ON r.command_id=b.creation_command_id WHERE b.intake_session_id=$1 AND s.actor_id=$2`,
      [intakeId, actorId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    contracts.assertValid("intake-project-binding", "1.0.0", row.payload);
    if (
      copilotHash(row.payload) !== row.record_hash ||
      copilotHash(row.payload.content) !== row.payload.content_hash ||
      row.payload.content.actor_id !== actorId ||
      row.payload.content.intake_session_ref.record_hash !== row.session_hash ||
      row.payload.content.creation_receipt_hash !== copilotHash(row.receipt) ||
      row.payload.content.creation_command_id !== row.receipt.command_id ||
      row.payload.content.project_id !== row.receipt.project_ref.project_id ||
      row.receipt.actor.actor_id !== actorId ||
      row.payload.content.project_thread_id !==
        derivePetraId(
          "thread",
          `copilot:${row.payload.content.project_id}:${actorId}`,
        )
    )
      throw new CopilotBoundaryError(
        "INTAKE_BINDING_CORRUPT",
        "The retained intake creation binding is incoherent.",
      );
    const turns = await this.list(intakeId, actorId);
    const originals = turns.map((turn) => {
      const { terminal, input_manifest, ...original } = turn;
      void input_manifest;
      if (terminal === undefined)
        throw new CopilotBoundaryError(
          "INTAKE_BINDING_CORRUPT",
          "The bound discussion contains an unsettled question.",
        );
      return {
        run_id: turn.run_id,
        record_hash: copilotHash(original),
        terminal_hash: copilotHash(terminal),
      };
    });
    const draft = await this.latestDraft(intakeId, actorId);
    if (
      copilotHash(originals) !==
        copilotHash(row.payload.content.original_turns) ||
      draft === undefined ||
      copilotHash(draft) !== row.payload.content.definition_draft_hash
    )
      throw new CopilotBoundaryError(
        "INTAKE_BINDING_CORRUPT",
        "The creation binding does not preserve the exact original discussion and reviewed draft.",
      );
    return row.payload;
  }
  async bindingForProject(
    projectId: string,
    actorId: string,
  ): Promise<PetraIntakeProjectBinding | undefined> {
    const result = await this.pool.query<{ intake_session_id: string }>(
      "SELECT b.intake_session_id FROM petra.intake_project_bindings b JOIN petra.intake_copilot_sessions s USING(intake_session_id) WHERE b.project_id=$1 AND s.actor_id=$2",
      [projectId, actorId],
    );
    const intakeId = result.rows[0]?.intake_session_id;
    return intakeId === undefined ? undefined : this.binding(intakeId, actorId);
  }
  async #requireOpenSession(
    client: PoolClient,
    intakeId: string,
    actorId: string,
  ): Promise<void> {
    const result = await client.query(
      "SELECT 1 FROM petra.intake_copilot_sessions s WHERE s.intake_session_id=$1 AND s.actor_id=$2 AND NOT EXISTS(SELECT 1 FROM petra.intake_project_bindings b WHERE b.intake_session_id=s.intake_session_id) AND NOT EXISTS(SELECT 1 FROM petra.intake_copilot_turns t LEFT JOIN petra.intake_copilot_terminals x USING(run_id) WHERE t.intake_session_id=s.intake_session_id AND x.run_id IS NULL)",
      [intakeId, actorId],
    );
    if (result.rowCount !== 1)
      throw new CopilotBoundaryError(
        "INTAKE_NOT_READY",
        "Read the retained answer or creation outcome before preparing another draft.",
      );
  }
  async #transaction<T>(
    action: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await action(client);
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

export interface PreparedIntakeCreationBinding {
  session: PetraIntakeCopilotSession;
  draftHash: string;
  originalTurns: PetraIntakeProjectBinding["content"]["original_turns"];
}
/** Called inside the existing human-reviewed creation transaction, under its
 * command locks. The same intake lock fences a concurrently starting question. */
export const prepareIntakeCreationBinding = async (
  client: PoolClient,
  request: PetraProjectDefinitionDraftCommandRequestV11,
  actorId: string,
): Promise<PreparedIntakeCreationBinding> => {
  const ref = request.intake_ref;
  await lockIntakeCopilotSession(client, ref.intake_session_id);
  const sessions = await client.query<SessionRow>(
    "SELECT payload,record_hash FROM petra.intake_copilot_sessions WHERE intake_session_id=$1 AND actor_id=$2",
    [ref.intake_session_id, actorId],
  );
  if (sessions.rows[0] === undefined)
    throw new CopilotBoundaryError(
      "INTAKE_CREATION_UNAVAILABLE",
      "The reviewed intake is unavailable to the authenticated creator.",
    );
  const session = sessionFrom(sessions.rows[0]);
  if (
    copilotHash(session) !== ref.session_record_hash ||
    copilotHash(request.draft) !== ref.definition_draft_hash
  )
    throw new CopilotBoundaryError(
      "INTAKE_CREATION_MISMATCH",
      "The creation review does not bind the exact retained intake and definition draft.",
    );
  const drafts = await client.query<{ draft_hash: string }>(
    "SELECT draft_hash FROM petra.intake_copilot_definition_drafts WHERE intake_session_id=$1 ORDER BY sequence DESC LIMIT 1",
    [ref.intake_session_id],
  );
  if (drafts.rows[0]?.draft_hash !== ref.definition_draft_hash)
    throw new CopilotBoundaryError(
      "INTAKE_DRAFT_CHANGED",
      "The selected definition draft changed. Review its current exact proposal before creating the Project.",
    );
  const bound = await client.query(
    "SELECT 1 FROM petra.intake_project_bindings WHERE intake_session_id=$1",
    [ref.intake_session_id],
  );
  if (bound.rowCount !== 0)
    throw new CopilotBoundaryError(
      "INTAKE_ALREADY_BOUND",
      "This intake already belongs to a created Project. Read that exact creation outcome.",
    );
  const history = await client.query<TurnRow>(
    `${selection} WHERE t.intake_session_id=$1 ORDER BY t.sequence`,
    [ref.intake_session_id],
  );
  if (
    history.rows.some((row) => row.terminal === null) ||
    (history.rows.at(-1)?.payload.run_id ?? null) !== ref.last_run_id
  )
    throw new CopilotBoundaryError(
      "INTAKE_CREATION_CHANGED",
      "The discussion changed or still has an active answer. Read its retained outcome before reviewing creation.",
    );
  const originalTurns = history.rows.map((row) => {
    turnFrom(row);
    return {
      run_id: row.payload.run_id,
      record_hash: row.record_hash,
      terminal_hash: copilotHash(row.terminal),
    };
  }) as PetraIntakeProjectBinding["content"]["original_turns"];
  return { session, draftHash: ref.definition_draft_hash, originalTurns };
};
export const recordIntakeCreationBinding = async (
  client: PoolClient,
  prepared: PreparedIntakeCreationBinding,
  receipt: PetraProjectDefinitionDraftCommandReceipt,
): Promise<PetraIntakeProjectBinding> => {
  const { session } = prepared;
  if (
    receipt.actor.actor_id !== session.content.actor_id ||
    receipt.actor.actor_kind !== "human"
  )
    throw new CopilotBoundaryError(
      "INTAKE_CREATION_ACTOR",
      "The creation receipt and intake have different authenticated owners.",
    );
  const content: PetraIntakeProjectBinding["content"] = {
    intake_session_ref: {
      record_id: session.content.intake_session_id,
      revision: 1,
      record_hash: copilotHash(session),
    },
    actor_id: session.content.actor_id,
    definition_draft_hash: prepared.draftHash,
    creation_command_id: receipt.command_id,
    creation_receipt_hash: copilotHash(receipt),
    project_id: receipt.project_ref.project_id,
    project_thread_id: derivePetraId(
      "thread",
      `copilot:${receipt.project_ref.project_id}:${session.content.actor_id}`,
    ),
    original_turns: prepared.originalTurns,
    bound_at: receipt.recorded_at,
    authority: "human_reviewed_creation_binding",
  };
  const binding: PetraIntakeProjectBinding = {
    schema_name: "petra.intake-project-binding",
    schema_version: "1.0.0",
    content,
    content_hash: copilotHash(content),
  };
  contracts.assertValid("intake-project-binding", "1.0.0", binding);
  await client.query(
    "INSERT INTO petra.intake_project_bindings(intake_session_id,project_id,creation_command_id,record_hash,payload,bound_at) VALUES($1,$2,$3,$4,$5::jsonb,$6)",
    [
      session.content.intake_session_id,
      content.project_id,
      receipt.command_id,
      copilotHash(binding),
      JSON.stringify(binding),
      content.bound_at,
    ],
  );
  return binding;
};
