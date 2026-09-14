import { createHash } from "node:crypto";

import type {
  PetraProjectWorkingStateSnapshot,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  ProjectWorkingStateSnapshotContent,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectWorkingStateSnapshotReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectWorkingStateSnapshotErrorCode =
  | "PROJECT_WORKING_STATE_STORED_RECORD_CORRUPT"
  | "PROJECT_WORKING_STATE_DEFINITION_STALE";

export class PostgresProjectWorkingStateSnapshotError extends Error {
  readonly code: PostgresProjectWorkingStateSnapshotErrorCode;

  constructor(
    code: PostgresProjectWorkingStateSnapshotErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectWorkingStateSnapshotError";
    this.code = code;
  }
}

interface DefinitionRow {
  project_id: string;
  project_definition_id: string;
  revision: string;
  content_hash: string;
  definition_family: string;
}

interface WorkingRow {
  payload: unknown;
  record_hash: string;
  project_definition_id: string;
  project_definition_revision: string;
  project_definition_content_hash: string;
  definition_family: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
  read_at: Date;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

/** Read-only current-head query. It intentionally does not compose a graph. */
export class PostgresProjectWorkingStateSnapshotReader implements ProjectWorkingStateSnapshotReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async getProjectWorkingStateSnapshot(
    projectId: string,
  ): Promise<PetraProjectWorkingStateSnapshot | undefined> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const definition = await client.query<DefinitionRow>(
        `SELECT revision.project_id, revision.project_definition_id, revision.revision,
                revision.content_hash, revision.definition_family
           FROM petra.project_definitions AS head
           JOIN petra.project_definition_revisions AS revision
             ON revision.project_definition_id = head.project_definition_id
            AND revision.revision = head.current_revision
          WHERE head.project_id = $1`,
        [projectId],
      );
      const definitionRow = definition.rows[0];
      if (definitionRow === undefined) {
        await client.query("COMMIT");
        return undefined;
      }
      const candidateRows = await this.#workingRows(
        client,
        "working_candidates",
        "working_candidate_revisions",
        "working_candidate_id",
        projectId,
      );
      const relationshipRows = await this.#workingRows(
        client,
        "working_relationships",
        "working_relationship_revisions",
        "working_relationship_id",
        projectId,
      );
      const candidates = candidateRows.map((row) =>
        this.#workingRecord<PetraWorkingCandidate>(
          "working-candidate",
          row,
          definitionRow,
        ),
      );
      const relationships = relationshipRows.map((row) =>
        this.#workingRecord<PetraWorkingRelationship>(
          "working-relationship",
          row,
          definitionRow,
        ),
      );
      const authority = await client.query<AuthorityRow>(
        `SELECT position.event_position,
                stream.current_stream_revision AS stream_revision,
                transaction_timestamp() AS read_at
           FROM petra.authority_positions AS position
           LEFT JOIN petra.project_event_stream_heads AS stream
             ON stream.project_id = $1
          WHERE position.singleton`,
        [projectId],
      );
      const authorityRow = authority.rows[0];
      if (authorityRow === undefined) {
        throw new PostgresProjectWorkingStateSnapshotError(
          "PROJECT_WORKING_STATE_STORED_RECORD_CORRUPT",
          "The canonical authority position is unavailable.",
        );
      }
      const content: ProjectWorkingStateSnapshotContent = {
        project_definition_ref: {
          project_definition_id: definitionRow.project_definition_id,
          revision: Number(definitionRow.revision),
          content_hash: definitionRow.content_hash,
          definition_family: definitionRow.definition_family,
        },
        authority: {
          isolation: "repeatable_read",
          event_position: Number(authorityRow.event_position),
          stream_revision: Number(authorityRow.stream_revision ?? 0),
        },
        selection_boundary: {
          selection_kind: "current_working_heads",
          historical_working_revisions_included: false,
          authoritative_records_included: false,
          graph_overlay_composed: false,
        },
        candidates,
        relationships,
      };
      const snapshot: PetraProjectWorkingStateSnapshot = {
        schema_name: "petra.project-working-state-snapshot",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: authorityRow.read_at.toISOString(),
      };
      this.#contracts.assertValid(
        "project-working-state-snapshot",
        "1.0.0",
        snapshot,
      );
      await client.query("COMMIT");
      return clone(snapshot);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #workingRows(
    client: PoolClient,
    headTable: "working_candidates" | "working_relationships",
    revisionTable:
      "working_candidate_revisions" | "working_relationship_revisions",
    idColumn: "working_candidate_id" | "working_relationship_id",
    projectId: string,
  ): Promise<WorkingRow[]> {
    const result = await client.query<WorkingRow>(
      `SELECT revision.payload, revision.record_hash,
              revision.project_definition_id,
              revision.project_definition_revision,
              revision.project_definition_content_hash,
              revision.definition_family
         FROM petra.${headTable} AS head
         JOIN petra.${revisionTable} AS revision
           ON revision.${idColumn} = head.${idColumn}
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY revision.recorded_at, revision.${idColumn}`,
      [projectId],
    );
    return result.rows;
  }

  #workingRecord<
    RecordType extends PetraWorkingCandidate | PetraWorkingRelationship,
  >(
    contractName: "working-candidate" | "working-relationship",
    row: WorkingRow,
    definition: DefinitionRow,
  ): RecordType {
    this.#contracts.assertValid(contractName, "1.0.0", row.payload);
    const record = row.payload as RecordType;
    const contentProjection = clone(record) as Record<string, unknown>;
    delete contentProjection.content_hash;
    const definitionRef = record.project_definition_ref;
    if (
      row.record_hash !== canonicalHash(record) ||
      record.content_hash !== canonicalHash(contentProjection) ||
      record.project_id !== definition.project_id ||
      definitionRef.project_definition_id !==
        definition.project_definition_id ||
      definitionRef.revision !== Number(definition.revision) ||
      definitionRef.content_hash !== definition.content_hash ||
      definitionRef.definition_family !== definition.definition_family ||
      row.project_definition_id !== definition.project_definition_id ||
      Number(row.project_definition_revision) !== Number(definition.revision) ||
      row.project_definition_content_hash !== definition.content_hash ||
      row.definition_family !== definition.definition_family
    ) {
      throw new PostgresProjectWorkingStateSnapshotError(
        row.record_hash !== canonicalHash(record)
          ? "PROJECT_WORKING_STATE_STORED_RECORD_CORRUPT"
          : record.content_hash !== canonicalHash(contentProjection)
            ? "PROJECT_WORKING_STATE_STORED_RECORD_CORRUPT"
            : "PROJECT_WORKING_STATE_DEFINITION_STALE",
        "The current working head is corrupt or no longer bound to the exact current ProjectDefinition.",
      );
    }
    return clone(record);
  }
}
