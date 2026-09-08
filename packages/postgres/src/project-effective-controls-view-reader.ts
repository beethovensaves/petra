import { createHash } from "node:crypto";

import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectEffectiveControlsView,
  ProjectEffectiveControlSection,
  ProjectEffectiveControlsContent,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectEffectiveControlsViewReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectEffectiveControlsViewErrorCode =
  | "PROJECT_EFFECTIVE_CONTROLS_DEFINITION_MISSING"
  | "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT";

export class PostgresProjectEffectiveControlsViewError extends Error {
  readonly code: PostgresProjectEffectiveControlsViewErrorCode;

  constructor(
    code: PostgresProjectEffectiveControlsViewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectEffectiveControlsViewError";
    this.code = code;
  }
}

interface ControlsRow {
  project_id: string;
  project_record_hash: string;
  project_payload: unknown;
  definition_record_hash: string | null;
  definition_payload: unknown;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

export class PostgresProjectEffectiveControlsViewReader implements ProjectEffectiveControlsViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async getProjectEffectiveControlsView(
    projectId: string,
  ): Promise<PetraProjectEffectiveControlsView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const row = await this.#selectProject(client, projectId);
      if (row === undefined) return undefined;
      return this.#compose(client, row, readAt);
    });
  }

  async #selectProject(
    client: PoolClient,
    projectId: string,
  ): Promise<ControlsRow | undefined> {
    const result = await client.query<ControlsRow>(
      `SELECT project.project_id,
              project_revision.record_hash AS project_record_hash,
              project_revision.payload AS project_payload,
              definition_revision.record_hash AS definition_record_hash,
              definition_revision.payload AS definition_payload
         FROM petra.projects AS project
         JOIN petra.project_revisions AS project_revision
           ON project_revision.project_id = project.project_id
          AND project_revision.revision = project.current_revision
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    return result.rows[0];
  }

  async #compose(
    client: PoolClient,
    row: ControlsRow,
    readAt: string,
  ): Promise<PetraProjectEffectiveControlsView> {
    const project = this.#project(row.project_payload);
    if (
      row.definition_payload === null ||
      row.definition_record_hash === null
    ) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_DEFINITION_MISSING",
        `Project ${project.project_id} has no current ProjectDefinition and cannot resolve effective controls.`,
      );
    }
    const definition = this.#definition(row.definition_payload);
    if (
      project.project_id !== row.project_id ||
      definition.project_id !== project.project_id
    ) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "The effective-control composition crossed a Project authority boundary.",
      );
    }
    const authority = await this.#authority(client, project.project_id);
    const projectRef = {
      record_id: project.project_id,
      revision: project.revision,
      record_hash: row.project_record_hash,
    };
    const scope = {
      scope_kind: "project" as const,
      project_id: project.project_id,
    };
    const unsupported = (
      ownerKind: Exclude<
        ProjectEffectiveControlSection["owner_kind"],
        "project"
      >,
      label: string,
      summary: string,
      limitation: string,
      operationReason: string,
    ): ProjectEffectiveControlSection => ({
      state: "unsupported",
      label,
      summary,
      owner_kind: ownerKind,
      scope,
      freshness: {
        state: "current",
        observed_at: readAt,
        limitation,
      },
      values: [],
      history: { state: "unavailable", limitation },
      operation: { state: "unsupported", reason: operationReason },
    });
    const privacyOperation = {
      state: "unsupported" as const,
      reason:
        "Privacy values are read-only until their owning typed Project transitions are accepted.",
    };
    const content: ProjectEffectiveControlsContent = {
      project_ref: projectRef,
      project_definition_ref: {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        record_hash: row.definition_record_hash,
      },
      authority,
      sections: {
        privacy: {
          state: "effective",
          label: "Privacy and data access",
          summary: `Private visibility and the enabled evidence namespaces come from Project revision ${project.revision}.`,
          owner_kind: "project",
          scope,
          freshness: { state: "current", observed_at: readAt },
          values: [
            {
              key: "petra.project.visibility",
              label: "Visibility",
              meaning:
                "Who can discover or enter this Project through Petra's current Project authority.",
              state: "effective",
              value: project.visibility,
              origin: { owner_kind: "project", record_ref: projectRef },
              effective_from: project.updated_at,
              operation: {
                state: "unsupported",
                reason:
                  "No accepted typed Project-visibility transition is registered.",
              },
            },
            {
              key: "petra.project.enabled-evidence-namespaces",
              label: "Enabled evidence namespaces",
              meaning:
                "The evidence families that this Project revision permits Petra to register.",
              state: "effective",
              value: clone(project.enabled_evidence_namespaces),
              origin: { owner_kind: "project", record_ref: projectRef },
              effective_from: project.updated_at,
              operation: {
                state: "unsupported",
                reason:
                  "No accepted typed evidence-namespace transition is registered.",
              },
            },
          ],
          history: {
            state: "retained",
            record_ref: projectRef,
            limitation:
              "Project revisions are retained, but the composed causal History destination is not implemented.",
          },
          operation: privacyOperation,
        },
        capability: unsupported(
          "capability_authority",
          "Capabilities",
          "Runtime records can reference capability grants, but Petra has no canonical CapabilityGrant registry to resolve an effective Project grant.",
          "CapabilityGrant history is unavailable because no owning registry is implemented; reference identifiers are not treated as grant definitions.",
          "No accepted typed capability transition is registered.",
        ),
        model_routing: unsupported(
          "routing_policy",
          "Model routing",
          "Model requests preserve routing and certification references, but no Project-effective RoutingPolicy record is registered.",
          "RoutingPolicy history is unavailable because prior request references cannot be promoted into a current Project routing preference.",
          "No accepted typed Project routing transition is registered.",
        ),
        work_budget: unsupported(
          "budget_profile",
          "Work budgets",
          "Concrete Work and model requests retain bounded limits, but no Project-effective BudgetProfile record is registered.",
          "BudgetProfile history is unavailable because per-action limits remain on their concrete Work or model request.",
          "No accepted typed Project budget transition is registered.",
        ),
        review_policy: unsupported(
          "review_policy",
          "Review policy",
          "Review sessions retain decisions and context, but they do not define one effective Project ReviewPolicy.",
          "ReviewPolicy history is unavailable because Review session state is not interpreted as policy.",
          "No accepted typed Project ReviewPolicy transition is registered.",
        ),
      },
    };
    const view: PetraProjectEffectiveControlsView = {
      schema_name: "petra.project-effective-controls-view",
      schema_version: "1.0.0",
      project_id: project.project_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid(
      "project-effective-controls-view",
      "1.0.0",
      view,
    );
    return view;
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectEffectiveControlsContent["authority"]> {
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
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "The PostgreSQL authority position is unavailable.",
      );
    }
    return {
      isolation: "repeatable_read",
      event_position: this.#safePosition(row.event_position, "event"),
      stream_revision: this.#safePosition(
        row.stream_revision ?? "0",
        "Project stream revision",
      ),
    };
  }

  #safePosition(value: string, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        `The ${label} position is outside Petra's safe range.`,
      );
    }
    return parsed;
  }

  #project(payload: unknown): PetraProject {
    this.#contracts.assertValid("project", "1.0.0", payload);
    return clone(payload as PetraProject);
  }

  #definition(payload: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (definition.content_hash !== canonicalHash(definition.content)) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "The current ProjectDefinition content hash is invalid.",
      );
    }
    return clone(definition);
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
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
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
