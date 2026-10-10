import type { Pool, PoolClient } from "pg";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import {
  copilotHash,
  examinationRecordRef,
  ExaminationBoundaryError,
  type ProjectExaminationRecord,
  type ProjectExaminationRepository,
  type HypothesisExaminationKernel,
  type ProjectSemanticGraphReader,
} from "@petra/core";
import { PostgresProjectSemanticGraphReader } from "./project-semantic-graph-reader.js";
type Row = {
  payload: ProjectExaminationRecord;
  record_hash: string;
  record_sequence: string;
};

/** Append-only persistence for the A1 scoped examination kernel. No command,
 * capability, Review or model authority is conferred by this adapter. */
export class PostgresProjectExaminationRepository implements ProjectExaminationRepository {
  constructor(
    readonly pool: Pool,
    readonly graphs: ProjectSemanticGraphReader,
    readonly resolveKernel: (
      projectId: string,
      graph: PetraProjectSemanticGraphView,
      transaction?: PoolClient,
    ) =>
      | HypothesisExaminationKernel
      | undefined
      | Promise<HypothesisExaminationKernel | undefined>,
    readonly contracts = new PetraContractRegistry(),
  ) {}
  #stored(row: Row): ProjectExaminationRecord {
    this.contracts.assertValid(
      row.payload.schema_name.replace(/^petra\./u, ""),
      row.payload.schema_version,
      row.payload,
    );
    if (
      copilotHash(row.payload) !== row.record_hash ||
      copilotHash(row.payload.content) !== row.payload.content_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_RECORD_CORRUPT",
        "A retained examination record does not match its exact content and record hashes.",
      );
    return structuredClone(row.payload);
  }

  async getSnapshot(
    projectId: string,
    contentHash: string,
  ): Promise<PetraProjectSemanticGraphView | undefined> {
    const result = await this.pool.query<{
      payload: PetraProjectSemanticGraphView;
    }>(
      "SELECT payload FROM petra.project_examination_snapshots WHERE project_id=$1 AND content_hash=$2",
      [projectId, contentHash],
    );
    const view = result.rows[0]?.payload;
    if (view === undefined) return undefined;
    this.contracts.assertValid("project-semantic-graph-view", "1.0.0", view);
    if (
      view.project_id !== projectId ||
      view.content_hash !== contentHash ||
      copilotHash(view.content) !== contentHash
    )
      throw new ExaminationBoundaryError(
        "SNAPSHOT_CORRUPT",
        "The retained examination snapshot is incoherent.",
      );
    return structuredClone(view);
  }
  async get(
    projectId: string,
    recordId: string,
    revision?: number,
  ): Promise<ProjectExaminationRecord | undefined> {
    const result = await this.pool.query<Row>(
      "SELECT payload,record_hash,record_sequence FROM petra.project_examination_records WHERE project_id=$1 AND record_id=$2 AND ($3::bigint IS NULL OR revision=$3) ORDER BY revision DESC LIMIT 1",
      [projectId, recordId, revision ?? null],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }
  async list(
    projectId: string,
    afterSequence = 0,
  ): Promise<{
    records: ProjectExaminationRecord[];
    next_sequence?: number;
    has_more: boolean;
  }> {
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0)
      throw new ExaminationBoundaryError(
        "INVALID_CURSOR",
        "The examination cursor is malformed.",
      );
    const result = await this.pool.query<Row>(
      "SELECT payload,record_hash,record_sequence FROM petra.project_examination_records WHERE project_id=$1 AND record_sequence>$2 ORDER BY record_sequence LIMIT 101",
      [projectId, afterSequence],
    );
    const returned = result.rows.slice(0, 100);
    return {
      records: returned.map((row) => this.#stored(row)),
      has_more: result.rows.length > 100,
      ...(result.rows.length > 100
        ? { next_sequence: Number(returned.at(-1)!.record_sequence) }
        : {}),
    };
  }
  async #exact(
    client: PoolClient,
    projectId: string,
    ref: PetraHypothesisAssessment["content"]["subject_ref"],
  ): Promise<ProjectExaminationRecord> {
    const result = await client.query<Row>(
      "SELECT payload,record_hash,record_sequence FROM petra.project_examination_records WHERE project_id=$1 AND record_id=$2 AND revision=$3 AND record_hash=$4",
      [projectId, ref.record_id, ref.revision, ref.record_hash],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.payload.schema_name !== ref.schema_name ||
      row.payload.schema_version !== ref.schema_version
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_REFERENCE_UNAVAILABLE",
        "The exact linked Project examination record is unavailable.",
      );
    return this.#stored(row);
  }
  async append(
    record: ProjectExaminationRecord,
  ): Promise<ProjectExaminationRecord> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.#append(record);
      } catch (error) {
        if (
          attempt === 3 ||
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "40001"
        )
          throw error;
      }
    }
    throw new ExaminationBoundaryError(
      "EXAMINATION_CONCURRENT_CHANGE",
      "The examination could not be retained after concurrent changes.",
    );
  }

  async #append(
    record: ProjectExaminationRecord,
  ): Promise<ProjectExaminationRecord> {
    this.contracts.assertValid(
      record.schema_name.replace(/^petra\./u, ""),
      record.schema_version,
      record,
    );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const graph =
        this.graphs instanceof PostgresProjectSemanticGraphReader
          ? await this.graphs.getProjectSemanticGraphInTransaction(
              client,
              record.project_id,
            )
          : await this.graphs.getProjectSemanticGraph(record.project_id);
      if (graph === undefined)
        throw new ExaminationBoundaryError(
          "PROJECT_NOT_FOUND",
          "The Project examination snapshot is unavailable.",
        );
      const kernel = await this.resolveKernel(record.project_id, graph, client);
      if (kernel === undefined)
        throw new ExaminationBoundaryError(
          "EXAMINATION_PROFILE_UNREGISTERED",
          "This Project has no registered executable examination profile.",
        );
      const retained = await this.appendInTransaction(
        client,
        record,
        graph,
        kernel,
      );
      await client.query("COMMIT");
      return retained;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  /** Internal transaction composition for the authenticated command owner. */
  async appendInTransaction(
    client: PoolClient,
    record: ProjectExaminationRecord,
    graph: PetraProjectSemanticGraphView,
    kernel: HypothesisExaminationKernel,
  ): Promise<ProjectExaminationRecord> {
    this.contracts.assertValid(
      record.schema_name.replace(/^petra\./u, ""),
      record.schema_version,
      record,
    );
    const ref = examinationRecordRef(record);
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `project-examination:${record.project_id}`,
    ]);
    const stored = await client.query<Row>(
      "SELECT payload,record_hash,record_sequence FROM petra.project_examination_records WHERE record_id=$1 ORDER BY revision DESC LIMIT 1",
      [ref.record_id],
    );
    const previous =
      stored.rows[0] === undefined ? undefined : this.#stored(stored.rows[0]);
    if (previous?.revision === record.revision) {
      if (copilotHash(previous) !== ref.record_hash)
        throw new ExaminationBoundaryError(
          "EXAMINATION_IDENTITY_CONFLICT",
          "The examination revision is already bound to different immutable content.",
        );
      return previous;
    }
    if (
      (previous === undefined && record.revision !== 1) ||
      (previous !== undefined &&
        (previous.project_id !== record.project_id ||
          previous.schema_name !== record.schema_name ||
          record.revision !== previous.revision + 1))
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_LINEAGE",
        "Examination revisions require one exact uninterrupted Project-scoped lineage.",
      );
    if (record.schema_name === "petra.hypothesis") {
      kernel.validateHypothesis(record, graph);
      if (
        previous?.schema_name === "petra.hypothesis" &&
        previous.content.ordinal !== record.content.ordinal
      )
        throw new ExaminationBoundaryError(
          "HYPOTHESIS_ORDINAL",
          "An accepted Hypothesis ordinal can never be changed or reused.",
        );
      if (record.content.development === "test_ready")
        throw new ExaminationBoundaryError(
          "PROTOCOL_UNREGISTERED",
          "Test-ready development requires a separately accepted valid Protocol owner; this scoped literature profile grants none.",
        );
      if (
        record.content.development === "structured" &&
        record.content.falsification_conditions.length === 0
      )
        throw new ExaminationBoundaryError(
          "DEVELOPMENT_BASIS",
          "A structured Hypothesis must retain explicit falsification conditions.",
        );
      if (record.content.development === "developed") {
        const cycles = await client.query(
          "SELECT 1 FROM petra.project_examination_records d JOIN petra.project_examination_records a ON a.record_id=d.payload#>>'{content,assessment_ref,record_id}' AND a.revision=(d.payload#>>'{content,assessment_ref,revision}')::bigint WHERE d.project_id=$1 AND d.record_kind='cycle-disposition' AND a.payload#>>'{content,subject_ref,record_id}'=$2 LIMIT 1",
          [record.project_id, record.hypothesis_id],
        );
        if (cycles.rows.length === 0)
          throw new ExaminationBoundaryError(
            "DEVELOPMENT_BASIS",
            "Developed state requires a retained formal scoped cycle, its limitations and unresolved alternatives.",
          );
      }
      if (record.content.supersedes_ref !== null) {
        const superseded = await this.#exact(
          client,
          record.project_id,
          record.content.supersedes_ref,
        );
        if (
          superseded.schema_name !== "petra.hypothesis" ||
          superseded.hypothesis_id === record.hypothesis_id
        )
          throw new ExaminationBoundaryError(
            "HYPOTHESIS_SUPERSESSION",
            "Supersession must name another exact Hypothesis in this Project.",
          );
      }
      if (previous === undefined) {
        const ordinals = await client.query<{ ordinal: string }>(
          "SELECT payload#>>'{content,ordinal}' AS ordinal FROM petra.project_examination_records WHERE project_id=$1 AND record_kind='hypothesis' AND revision=1",
          [record.project_id],
        );
        const next =
          1 +
          Math.max(
            0,
            ...ordinals.rows.map((row) => Number(row.ordinal.slice(1))),
          );
        if (record.content.ordinal !== `H${next}`)
          throw new ExaminationBoundaryError(
            "HYPOTHESIS_ORDINAL",
            "The new Hypothesis must use the next immutable Project ordinal.",
          );
      }
    } else {
      const assessment =
        record.schema_name === "petra.hypothesis-assessment"
          ? record
          : ((await this.#exact(
              client,
              record.project_id,
              record.content.assessment_ref,
            )) as PetraHypothesisAssessment);
      if (assessment.schema_name !== "petra.hypothesis-assessment")
        throw new ExaminationBoundaryError(
          "ASSESSMENT_REFERENCE",
          "The linked record must be a HypothesisAssessment.",
        );
      const hypothesis = (await this.#exact(
        client,
        record.project_id,
        assessment.content.subject_ref,
      )) as PetraHypothesis;
      if (hypothesis.schema_name !== "petra.hypothesis")
        throw new ExaminationBoundaryError(
          "HYPOTHESIS_REFERENCE",
          "The linked subject must be an exact Hypothesis.",
        );
      if (record.schema_name === "petra.hypothesis-assessment") {
        kernel.validateAssessment(record, hypothesis, graph);
        if (record.content.prior_assessment_ref !== null) {
          const prior = await this.#exact(
            client,
            record.project_id,
            record.content.prior_assessment_ref,
          );
          if (
            prior.schema_name !== record.schema_name ||
            prior.content.subject_ref.record_id !==
              record.content.subject_ref.record_id
          )
            throw new ExaminationBoundaryError(
              "ASSESSMENT_LINEAGE",
              "Reassessment must retain the same exact Project subject lineage.",
            );
        }
        if (
          previous !== undefined &&
          record.content.prior_assessment_ref?.record_hash !==
            examinationRecordRef(previous).record_hash
        )
          throw new ExaminationBoundaryError(
            "ASSESSMENT_LINEAGE",
            "A later assessment must pin its immediately preceding immutable assessment.",
          );
      } else if (record.schema_name === "petra.posture-decision") {
        kernel.validatePosture(record, assessment, hypothesis, graph);
        if (previous?.schema_name === "petra.posture-decision") {
          for (const obligation of record.content.obligations) {
            const old = previous.content.obligations.find(
              (item) => item.obligation_id === obligation.obligation_id,
            );
            if (old === undefined) {
              if (obligation.revision !== 1)
                throw new ExaminationBoundaryError(
                  "OBLIGATION_LINEAGE",
                  "A new obligation starts at its first exact revision.",
                );
              continue;
            }
            if (copilotHash(old) === copilotHash(obligation)) continue;
            if (
              obligation.type_key !== old.type_key ||
              obligation.revision !== old.revision + 1
            )
              throw new ExaminationBoundaryError(
                "OBLIGATION_LINEAGE",
                "An obligation change retains its identity and advances one immutable revision.",
              );
          }
        }
      } else {
        const posture = (await this.#exact(
          client,
          record.project_id,
          record.content.posture_ref,
        )) as PetraPostureDecision;
        if (posture.schema_name !== "petra.posture-decision")
          throw new ExaminationBoundaryError(
            "POSTURE_REFERENCE",
            "The cycle must link one exact PostureDecision.",
          );
        if (
          previous !== undefined &&
          record.content.prior_disposition_ref?.record_hash !==
            examinationRecordRef(previous).record_hash
        )
          throw new ExaminationBoundaryError(
            "DISPOSITION_LINEAGE",
            "A later disposition must pin its immediately preceding exact disposition.",
          );
        kernel.validateDisposition(
          record,
          assessment,
          posture,
          hypothesis,
          graph,
        );
      }
    }
    await client.query(
      "INSERT INTO petra.project_examination_snapshots(project_id,content_hash,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(project_id,content_hash) DO NOTHING",
      [graph.project_id, graph.content_hash, JSON.stringify(graph)],
    );
    await client.query(
      "INSERT INTO petra.project_examination_records(project_id,record_kind,record_id,revision,record_hash,content_hash,actor_id,actor_kind,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",
      [
        record.project_id,
        record.schema_name.replace(/^petra\./u, ""),
        ref.record_id,
        record.revision,
        ref.record_hash,
        record.content_hash,
        record.created_by.actor_id,
        record.created_by.actor_kind,
        JSON.stringify(record),
      ],
    );
    return structuredClone(record);
  }
}
