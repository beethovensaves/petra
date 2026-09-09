import { createHash } from "node:crypto";

import type {
  PetraCapabilityGrant,
  PetraCapabilityGrantRevocation,
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

interface CapabilityRow {
  grant_record_hash: string;
  grant_payload: unknown;
  revocation_record_hash: string | null;
  revocation_payload: unknown;
  total_count: string;
  effective_count: string;
  revoked_count: string;
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
    const capability = await this.#capability(
      client,
      project.project_id,
      scope,
      readAt,
    );
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
        capability,
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

  async #capability(
    client: PoolClient,
    projectId: string,
    scope: { readonly scope_kind: "project"; readonly project_id: string },
    readAt: string,
  ): Promise<ProjectEffectiveControlSection> {
    const result = await client.query<CapabilityRow>(
      `SELECT grant_record.record_hash AS grant_record_hash,
              grant_record.payload AS grant_payload,
              revocation.record_hash AS revocation_record_hash,
              revocation.payload AS revocation_payload,
              count(*) OVER()::text AS total_count,
              count(*) FILTER (
                WHERE revocation.capability_grant_revocation_id IS NULL
                  AND grant_record.valid_from <= CURRENT_TIMESTAMP
                  AND (
                    grant_record.expires_at IS NULL
                    OR grant_record.expires_at > CURRENT_TIMESTAMP
                  )
              ) OVER()::text AS effective_count,
              count(*) FILTER (
                WHERE revocation.capability_grant_revocation_id IS NOT NULL
              ) OVER()::text AS revoked_count
         FROM petra.capability_grants AS grant_record
         LEFT JOIN petra.capability_grant_revocations AS revocation
           ON revocation.capability_grant_id =
                grant_record.capability_grant_id
        WHERE grant_record.project_id = $1
        ORDER BY grant_record.issued_at DESC,
                 grant_record.capability_grant_id ASC
        LIMIT 100`,
      [projectId],
    );
    if (result.rows.length === 0) {
      const limitation =
        "No immutable Project-scoped command grant is registered for this Project.";
      return {
        state: "unavailable",
        label: "Capabilities",
        summary:
          "The CapabilityGrant registry is available, but this Project has no registered command grant.",
        owner_kind: "capability_authority",
        scope,
        freshness: { state: "current", observed_at: readAt, limitation },
        values: [],
        history: { state: "unavailable", limitation },
        operation: {
          state: "unsupported",
          reason:
            "Grant issuance and revocation are not exposed through public typed commands.",
        },
      };
    }

    const countRow = result.rows[0];
    if (countRow === undefined) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "The CapabilityGrant query lost its retained result.",
      );
    }
    const retainedCount = this.#safePosition(
      countRow.total_count,
      "CapabilityGrant count",
    );
    const effectiveCount = this.#safePosition(
      countRow.effective_count,
      "effective CapabilityGrant count",
    );
    const revokedCount = this.#safePosition(
      countRow.revoked_count,
      "revoked CapabilityGrant count",
    );
    const observedAt = Date.parse(readAt);
    const values: ProjectEffectiveControlSection["values"] = [];
    for (const row of result.rows) {
      const grant = this.#capabilityGrant(
        row.grant_payload,
        row.grant_record_hash,
      );
      if (grant.project_id !== projectId) {
        throw new PostgresProjectEffectiveControlsViewError(
          "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
          "A CapabilityGrant crossed the effective-control Project boundary.",
        );
      }
      const revocation =
        row.revocation_payload === null || row.revocation_record_hash === null
          ? undefined
          : this.#capabilityRevocation(
              row.revocation_payload,
              row.revocation_record_hash,
              grant,
              row.grant_record_hash,
            );
      const notYetValid = Date.parse(grant.content.valid_from) > observedAt;
      const expired =
        grant.content.expires_at !== undefined &&
        Date.parse(grant.content.expires_at) <= observedAt;
      const effective = revocation === undefined && !notYetValid && !expired;
      values.push({
        key: `petra.capability-grant.${grant.capability_grant_id.toLowerCase()}`,
        label: `Commands granted to ${grant.grantee.actor_id}`,
        meaning:
          "The exact registered Petra commands this immutable grant permits for its named Actor and Project.",
        state: effective
          ? "effective"
          : notYetValid && revocation === undefined
            ? "observed_only"
            : "expired",
        value: clone(grant.content.allowed_commands),
        origin: {
          owner_kind: "capability_authority",
          record_ref: {
            record_id: grant.capability_grant_id,
            revision: grant.revision,
            record_hash: row.grant_record_hash,
          },
        },
        effective_from: grant.content.valid_from,
        ...(grant.content.expires_at === undefined
          ? {}
          : { expires_at: grant.content.expires_at }),
        ...(revocation !== undefined
          ? {
              limitation: `Revoked by retained record ${revocation.capability_grant_revocation_id} at ${revocation.revoked_at}.`,
            }
          : notYetValid
            ? { limitation: "This grant is not valid yet." }
            : expired
              ? { limitation: "This grant has expired." }
              : {}),
        operation: {
          state: "unsupported",
          reason:
            "This immutable grant cannot be edited; public issuance and revocation commands are not registered.",
        },
      });
    }

    const latest = countRow;
    const latestGrant = this.#capabilityGrant(
      latest.grant_payload,
      latest.grant_record_hash,
    );
    return {
      state: effectiveCount > 0 ? "effective" : "expired",
      label: "Capabilities",
      summary: `${effectiveCount} effective Project command grant${effectiveCount === 1 ? "" : "s"}; ${revokedCount} revoked; ${retainedCount} retained total.`,
      owner_kind: "capability_authority",
      scope,
      freshness: {
        state: "current",
        observed_at: readAt,
        ...(retainedCount > values.length
          ? {
              limitation: `Showing the 100 most recently issued grants of ${retainedCount} retained records. Aggregate posture includes all retained grants.`,
            }
          : {}),
      },
      values,
      history: {
        state: "retained",
        record_ref: {
          record_id: latestGrant.capability_grant_id,
          revision: latestGrant.revision,
          record_hash: latest.grant_record_hash,
        },
        limitation:
          "All grant and revocation records are retained; the composed causal History destination is not implemented.",
      },
      operation: {
        state: "unsupported",
        reason:
          "Grant issuance and revocation are not exposed through public typed commands.",
      },
    };
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

  #capabilityGrant(payload: unknown, recordHash: string): PetraCapabilityGrant {
    this.#contracts.assertValid("capability-grant", "1.0.0", payload);
    const grant = payload as PetraCapabilityGrant;
    if (
      grant.content_hash !== canonicalHash(grant.content) ||
      recordHash !== canonicalHash(grant)
    ) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "A retained CapabilityGrant hash is invalid.",
      );
    }
    return clone(grant);
  }

  #capabilityRevocation(
    payload: unknown,
    recordHash: string,
    grant: PetraCapabilityGrant,
    grantRecordHash: string,
  ): PetraCapabilityGrantRevocation {
    this.#contracts.assertValid(
      "capability-grant-revocation",
      "1.0.0",
      payload,
    );
    const revocation = payload as PetraCapabilityGrantRevocation;
    if (
      revocation.content_hash !== canonicalHash(revocation.content) ||
      recordHash !== canonicalHash(revocation) ||
      revocation.project_id !== grant.project_id ||
      revocation.grant_ref.capability_grant_id !== grant.capability_grant_id ||
      revocation.grant_ref.revision !== grant.revision ||
      revocation.grant_ref.content_hash !== grant.content_hash ||
      revocation.grant_ref.record_hash !== grantRecordHash
    ) {
      throw new PostgresProjectEffectiveControlsViewError(
        "PROJECT_EFFECTIVE_CONTROLS_STORED_RECORD_CORRUPT",
        "A retained CapabilityGrant revocation does not bind its exact grant.",
      );
    }
    return clone(revocation);
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
