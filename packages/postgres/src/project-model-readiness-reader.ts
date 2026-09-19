import { createHash } from "node:crypto";

import type {
  PetraContextPacket,
  PetraEvidencePacket,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  ProjectModelContextBinding,
  ProjectModelDefinitionRef,
  ProjectModelObjectiveRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CertifiedProjectModelBinding,
  ProjectModelAuthorityRead,
  ProjectModelAuthorityReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface RecordRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface ProjectDefinitionRow {
  readonly project_payload: unknown;
  readonly project_record_hash: string;
  readonly definition_payload: unknown;
  readonly definition_record_hash: string;
}

interface ObjectiveRow extends RecordRow {
  readonly focus_revision: string;
  readonly head_revision: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

export class PostgresProjectModelReadinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostgresProjectModelReadinessError";
  }
}

/**
 * Reads only current Project authority plus exact immutable packets named by a
 * server-configured certified runtime. It never selects a nearby packet,
 * profile role, Objective, or Project when an exact binding is absent.
 */
export class PostgresProjectModelReadinessReader implements ProjectModelAuthorityReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async readProjectModelAuthority(
    projectId: string,
    expected: CertifiedProjectModelBinding,
  ): Promise<ProjectModelAuthorityRead | undefined> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const result = await this.#read(client, projectId, expected);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #read(
    client: PoolClient,
    projectId: string,
    expected: CertifiedProjectModelBinding,
  ): Promise<ProjectModelAuthorityRead | undefined> {
    const projectDefinition = (
      await client.query<ProjectDefinitionRow>(
        `SELECT project_revision.payload AS project_payload,
                project_revision.record_hash AS project_record_hash,
                definition_revision.payload AS definition_payload,
                definition_revision.record_hash AS definition_record_hash
           FROM petra.projects AS project
           JOIN petra.project_revisions AS project_revision
             ON project_revision.project_id = project.project_id
            AND project_revision.revision = project.current_revision
           JOIN petra.project_definitions AS definition
             ON definition.project_id = project.project_id
           JOIN petra.project_definition_revisions AS definition_revision
             ON definition_revision.project_definition_id = definition.project_definition_id
            AND definition_revision.revision = definition.current_revision
          WHERE project.project_id = $1`,
        [projectId],
      )
    ).rows[0];
    if (projectDefinition === undefined) return undefined;

    const project = this.#record<PetraProject>(
      "project",
      projectDefinition.project_payload,
      projectDefinition.project_record_hash,
    );
    const definition = this.#record<PetraProjectDefinition>(
      "project-definition",
      projectDefinition.definition_payload,
      projectDefinition.definition_record_hash,
    );
    if (
      project.project_id !== projectId ||
      definition.project_id !== projectId ||
      project.status !== "active"
    ) {
      throw new PostgresProjectModelReadinessError(
        "The current Project and ProjectDefinition readiness authority is inconsistent.",
      );
    }

    const definitionRef: ProjectModelDefinitionRef = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      record_hash: projectDefinition.definition_record_hash,
      definition_family: definition.definition_family,
    };
    const registration = definition.content.registrations.find(
      (candidate) =>
        candidate.registration_kind === "model_role" &&
        candidate.semantic_key === expected.role_semantic_key,
    );
    const term = definition.content.terms.find(
      (candidate) => candidate.semantic_key === expected.role_semantic_key,
    );
    const role: ProjectModelAuthorityRead["role"] =
      registration === undefined
        ? {
            state: "unavailable",
            reason: "role_not_registered",
            message:
              "This ProjectDefinition does not register the certified grounded-synthesist role.",
          }
        : !same(registration.contract, expected.role_contract) ||
            term === undefined
          ? {
              state: "unavailable",
              reason: "role_binding_mismatch",
              message:
                "The ProjectDefinition model-role registration does not match the active certified runtime.",
            }
          : {
              state: "selected",
              semantic_key: registration.semantic_key,
              label: term.singular,
              meaning: term.definition,
            };

    const objectiveRow = (
      await client.query<ObjectiveRow>(
        `SELECT objective_revision.payload,
                objective_revision.record_hash,
                focus.objective_revision AS focus_revision,
                objective.current_revision AS head_revision
           FROM petra.project_objective_focus AS focus
           JOIN petra.project_objectives AS objective
             ON objective.project_id = focus.project_id
            AND objective.objective_id = focus.objective_id
           JOIN petra.project_objective_revisions AS objective_revision
             ON objective_revision.project_id = focus.project_id
            AND objective_revision.objective_id = focus.objective_id
            AND objective_revision.revision = focus.objective_revision
            AND objective_revision.content_hash = focus.objective_content_hash
          WHERE focus.project_id = $1`,
        [projectId],
      )
    ).rows[0];
    const objective =
      objectiveRow === undefined
        ? undefined
        : this.#record<PetraProjectObjective>(
            "project-objective",
            objectiveRow.payload,
            objectiveRow.record_hash,
          );
    const objectiveRef: ProjectModelObjectiveRef | undefined =
      objective === undefined
        ? undefined
        : {
            objective_id: objective.objective_id,
            revision: objective.revision,
            content_hash: objective.content_hash,
            record_hash: objectiveRow!.record_hash,
          };

    let context: ProjectModelAuthorityRead["context"];
    if (expected.project_id !== projectId) {
      context = {
        state: "unavailable",
        reason: "profile_context_unsupported",
        message:
          "The certified runtime is not compiled for this Project. No other Project context was substituted.",
      };
    } else if (objective === undefined || objectiveRow === undefined) {
      context = {
        state: "unavailable",
        reason: "objective_unavailable",
        message:
          "The Project has no exact active focused Objective for model context.",
      };
    } else if (
      Number(objectiveRow.focus_revision) !==
        Number(objectiveRow.head_revision) ||
      objective.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      objective.project_definition_ref.revision !== definition.revision ||
      objective.project_definition_ref.content_hash !== definition.content_hash
    ) {
      context = {
        state: "unavailable",
        reason: "project_context_stale",
        message:
          "The focused Objective does not bind the current ProjectDefinition. Refresh or compile new model context.",
      };
    } else {
      context = await this.#readPacketContext(
        client,
        expected,
        project,
        definitionRef,
        objectiveRef!,
      );
    }

    return {
      project_id: projectId,
      project_revision: project.revision,
      project_definition_ref: definitionRef,
      ...(objectiveRef === undefined ? {} : { objective_ref: objectiveRef }),
      role,
      context,
    };
  }

  async #readPacketContext(
    client: PoolClient,
    expected: CertifiedProjectModelBinding,
    project: PetraProject,
    definitionRef: ProjectModelDefinitionRef,
    objectiveRef: ProjectModelObjectiveRef,
  ): Promise<ProjectModelAuthorityRead["context"]> {
    const contextRow = (
      await client.query<RecordRow>(
        `SELECT payload, record_hash
           FROM petra.context_packets
          WHERE project_id = $1
            AND context_packet_id = $2
            AND revision = $3
            AND content_hash = $4`,
        [
          project.project_id,
          expected.context_packet_ref.record_id,
          expected.context_packet_ref.revision,
          expected.context_packet_ref.content_hash,
        ],
      )
    ).rows[0];
    const evidenceRow = (
      await client.query<RecordRow>(
        `SELECT payload, record_hash
           FROM petra.evidence_packets
          WHERE project_id = $1
            AND evidence_packet_id = $2
            AND revision = $3
            AND content_hash = $4`,
        [
          project.project_id,
          expected.evidence_packet_ref.record_id,
          expected.evidence_packet_ref.revision,
          expected.evidence_packet_ref.content_hash,
        ],
      )
    ).rows[0];
    if (contextRow === undefined || evidenceRow === undefined) {
      return {
        state: "unavailable",
        reason: "project_context_not_compiled",
        message:
          "The exact certified ContextPacket and EvidencePacket are not compiled for this Project.",
      };
    }

    const contextPacket = this.#record<PetraContextPacket>(
      "context-packet",
      contextRow.payload,
      contextRow.record_hash,
    );
    const evidencePacket = this.#record<PetraEvidencePacket>(
      "evidence-packet",
      evidenceRow.payload,
      evidenceRow.record_hash,
    );
    if (
      !same(contextPacket.snapshot_ref, expected.snapshot_ref) ||
      !same(evidencePacket.snapshot_ref, expected.snapshot_ref) ||
      evidencePacket.content.context_packet_ref.context_packet_id !==
        contextPacket.context_packet_id ||
      evidencePacket.content.context_packet_ref.content_hash !==
        contextPacket.content_hash
    ) {
      return {
        state: "unavailable",
        reason: "project_context_stale",
        message:
          "The certified packets do not share the configured authoritative snapshot and context identity.",
      };
    }

    const binding: ProjectModelContextBinding = {
      project_id: project.project_id,
      project_revision: project.revision,
      project_definition_ref: definitionRef,
      objective_ref: objectiveRef,
      snapshot_ref: expected.snapshot_ref,
      context_packet_ref: expected.context_packet_ref,
      evidence_packet_ref: expected.evidence_packet_ref,
      role_certification_ref: expected.role_certification_ref,
    };
    return { state: "bound", binding };
  }

  #record<Value>(
    contractName: string,
    payload: unknown,
    recordHash: string,
  ): Value {
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    const record = payload as {
      readonly content?: unknown;
      readonly content_hash?: string;
    };
    if (
      canonicalHash(payload) !== recordHash ||
      (record.content !== undefined &&
        canonicalHash(record.content) !== record.content_hash)
    ) {
      throw new PostgresProjectModelReadinessError(
        `The exact ${contractName} readiness owner failed its stored hash check.`,
      );
    }
    return structuredClone(payload) as Value;
  }
}
