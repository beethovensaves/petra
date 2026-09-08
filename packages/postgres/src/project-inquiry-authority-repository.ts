import { createHash } from "node:crypto";

import type {
  PetraGroundedResponse,
  PetraProjectDefinition,
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
  PetraProjectObjective,
  PetraWorkUnit,
  ProjectInquiryRoleRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectInquiryAuthorityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectInquiryErrorCode =
  | "PROJECT_INQUIRY_CONTENT_HASH_MISMATCH"
  | "PROJECT_INQUIRY_REFERENCE_MISSING"
  | "PROJECT_INQUIRY_DEFINITION_MISMATCH"
  | "PROJECT_INQUIRY_ROLE_UNREGISTERED"
  | "PROJECT_INQUIRY_ROLE_ID_CONFLICT"
  | "PROJECT_INQUIRY_ROLE_REVISION_CONFLICT"
  | "PROJECT_INQUIRY_ROLE_REVISION_GAP"
  | "PROJECT_INQUIRY_ROLE_INACTIVE"
  | "PROJECT_INQUIRY_ANCHOR_INVALID"
  | "PROJECT_INQUIRY_TARGET_UNSUPPORTED"
  | "PROJECT_INQUIRY_LINK_ID_CONFLICT"
  | "PROJECT_INQUIRY_LINK_DUPLICATE"
  | "PROJECT_INQUIRY_STORED_RECORD_CORRUPT";

export class PostgresProjectInquiryError extends Error {
  readonly code: PostgresProjectInquiryErrorCode;

  constructor(code: PostgresProjectInquiryErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectInquiryError";
    this.code = code;
  }
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface RoleHeadRow {
  project_inquiry_role_id: string;
  project_id: string;
  role_semantic_key: string;
  current_revision: string;
  created_by_actor_id: string;
  created_by_actor_kind: string;
  created_at: Date;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const exactRoleRef = (
  role: PetraProjectInquiryRole,
): ProjectInquiryRoleRef => ({
  project_inquiry_role_id: role.project_inquiry_role_id,
  revision: role.revision,
  content_hash: role.content_hash,
  record_hash: canonicalHash(role),
});

export class PostgresProjectInquiryAuthorityRepository implements ProjectInquiryAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerProjectInquiryRoleRevision(
    role: PetraProjectInquiryRole,
  ): Promise<PetraProjectInquiryRole> {
    this.#contracts.assertValid("project-inquiry-role", "1.0.0", role);
    this.#assertContentHash(role.content_hash, role.content);

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-inquiry-role:${role.project_inquiry_role_id}`,
        `project-inquiry-role-project:${role.project_id}:${role.content.role_semantic_key}`,
      ]);
      await this.#requireProjectAndActor(
        client,
        role.project_id,
        role.created_by.actor_id,
        role.created_by.actor_kind,
      );
      const definition = await this.#requireDefinition(
        client,
        role.project_id,
        role.content.project_definition_ref,
      );
      this.#assertRegisteredRole(definition, role);

      const heads = await client.query<RoleHeadRow>(
        `SELECT project_inquiry_role_id, project_id, role_semantic_key,
                current_revision, created_by_actor_id, created_by_actor_kind,
                created_at
           FROM petra.project_inquiry_roles
          WHERE project_inquiry_role_id = $1
             OR (project_id = $2 AND role_semantic_key = $3)
          FOR UPDATE`,
        [
          role.project_inquiry_role_id,
          role.project_id,
          role.content.role_semantic_key,
        ],
      );
      const conflict = heads.rows.find(
        (head) =>
          head.project_inquiry_role_id !== role.project_inquiry_role_id ||
          head.project_id !== role.project_id ||
          head.role_semantic_key !== role.content.role_semantic_key,
      );
      if (conflict !== undefined) {
        throw new PostgresProjectInquiryError(
          "PROJECT_INQUIRY_ROLE_ID_CONFLICT",
          "A Project inquiry semantic role has one stable identity.",
        );
      }

      const head = heads.rows[0];
      const recordHash = canonicalHash(role);
      if (head === undefined) {
        if (role.revision !== 1) {
          throw new PostgresProjectInquiryError(
            "PROJECT_INQUIRY_ROLE_REVISION_GAP",
            "A Project inquiry role must begin at revision one.",
          );
        }
        await client.query(
          `INSERT INTO petra.project_inquiry_roles (
             project_inquiry_role_id, project_id, role_semantic_key,
             current_revision, created_by_actor_id, created_by_actor_kind,
             created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
          [
            role.project_inquiry_role_id,
            role.project_id,
            role.content.role_semantic_key,
            role.revision,
            role.created_by.actor_id,
            role.created_by.actor_kind,
            role.created_at,
          ],
        );
      } else {
        if (
          head.created_by_actor_id !== role.created_by.actor_id ||
          head.created_by_actor_kind !== role.created_by.actor_kind ||
          head.created_at.toISOString() !== role.created_at
        ) {
          throw new PostgresProjectInquiryError(
            "PROJECT_INQUIRY_ROLE_ID_CONFLICT",
            "A Project inquiry role revision cannot change its Project, semantic key, creator, or creation time.",
          );
        }
        const currentRevision = Number(head.current_revision);
        if (role.revision <= currentRevision) {
          const existing = await client.query<StoredRow>(
            `SELECT payload, record_hash
               FROM petra.project_inquiry_role_revisions
              WHERE project_inquiry_role_id = $1 AND revision = $2`,
            [role.project_inquiry_role_id, role.revision],
          );
          if (existing.rows[0]?.record_hash === recordHash) {
            return this.#roleFrom(existing.rows[0]);
          }
          throw new PostgresProjectInquiryError(
            "PROJECT_INQUIRY_ROLE_REVISION_CONFLICT",
            "The Project inquiry role revision is already bound to different canonical content.",
          );
        }
        if (role.revision !== currentRevision + 1) {
          throw new PostgresProjectInquiryError(
            "PROJECT_INQUIRY_ROLE_REVISION_GAP",
            "Project inquiry role revisions must advance exactly once.",
          );
        }
      }

      const representation = role.content.representation;
      await client.query(
        `INSERT INTO petra.project_inquiry_role_revisions (
           project_inquiry_role_id, revision, project_id,
           project_definition_id, project_definition_revision,
           project_definition_content_hash, role_semantic_key,
           representation_kind, objective_kind, status, content_hash,
           created_by_actor_id, created_by_actor_kind, created_at, updated_at,
           record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14::timestamptz, $15::timestamptz, $16, $17::jsonb
         )`,
        [
          role.project_inquiry_role_id,
          role.revision,
          role.project_id,
          role.content.project_definition_ref.project_definition_id,
          role.content.project_definition_ref.revision,
          role.content.project_definition_ref.content_hash,
          role.content.role_semantic_key,
          representation.representation_kind,
          representation.objective_kind,
          role.content.status,
          role.content_hash,
          role.created_by.actor_id,
          role.created_by.actor_kind,
          role.created_at,
          role.updated_at,
          recordHash,
          JSON.stringify(role),
        ],
      );
      if (head !== undefined) {
        await client.query(
          `UPDATE petra.project_inquiry_roles
              SET current_revision = $2
            WHERE project_inquiry_role_id = $1`,
          [role.project_inquiry_role_id, role.revision],
        );
      }
      return clone(role);
    });
  }

  async getProjectInquiryRole(
    projectId: string,
    projectInquiryRoleId: string,
    revision?: number,
  ): Promise<PetraProjectInquiryRole | undefined> {
    const result = await this.#pool.query<StoredRow>(
      revision === undefined
        ? `SELECT record.payload, record.record_hash
             FROM petra.project_inquiry_roles AS head
             JOIN petra.project_inquiry_role_revisions AS record
               ON record.project_inquiry_role_id = head.project_inquiry_role_id
              AND record.revision = head.current_revision
            WHERE head.project_id = $1 AND head.project_inquiry_role_id = $2`
        : `SELECT payload, record_hash
             FROM petra.project_inquiry_role_revisions
            WHERE project_id = $1 AND project_inquiry_role_id = $2
              AND revision = $3`,
      revision === undefined
        ? [projectId, projectInquiryRoleId]
        : [projectId, projectInquiryRoleId, revision],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#roleFrom(result.rows[0]);
  }

  async listProjectInquiryRoles(
    projectId: string,
  ): Promise<PetraProjectInquiryRole[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_inquiry_roles AS head
         JOIN petra.project_inquiry_role_revisions AS record
           ON record.project_inquiry_role_id = head.project_inquiry_role_id
          AND record.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY head.role_semantic_key, head.project_inquiry_role_id`,
      [projectId],
    );
    return result.rows.map((row) => this.#roleFrom(row));
  }

  async registerProjectInquiryLink(
    link: PetraProjectInquiryLink,
  ): Promise<PetraProjectInquiryLink> {
    this.#contracts.assertValid("project-inquiry-link", "1.0.0", link);
    this.#assertContentHash(link.content_hash, link.content);

    return this.#transaction(async (client) => {
      const target = link.content.target;
      await this.#lock(client, [
        `project-inquiry-link:${link.project_inquiry_link_id}`,
        `project-inquiry-anchor:${link.project_id}:${link.content.inquiry_anchor.objective_ref.objective_id}`,
        ...(target.target_kind === "work"
          ? [`work-unit:${target.work_unit_ref.work_unit_id}`]
          : [
              `project-inquiry-result:${target.result_ref.schema_name}:${target.result_ref.record_id}`,
            ]),
      ]);
      await this.#requireProjectAndActor(
        client,
        link.project_id,
        link.created_by.actor_id,
        link.created_by.actor_kind,
      );
      await this.#requireDefinition(
        client,
        link.project_id,
        link.content.project_definition_ref,
      );
      const role = await this.#requireCurrentRole(
        client,
        link.project_id,
        link.content.inquiry_role_ref,
      );
      const objective = await this.#requireObjectiveAnchor(client, link, role);
      if (objective.content.status === "superseded") {
        throw new PostgresProjectInquiryError(
          "PROJECT_INQUIRY_ANCHOR_INVALID",
          "A superseded Objective revision cannot receive a new inquiry association.",
        );
      }
      await this.#requireTarget(client, link);

      const recordHash = canonicalHash(link);
      const existing = await client.query<StoredRow>(
        `SELECT payload, record_hash
           FROM petra.project_inquiry_links
          WHERE project_inquiry_link_id = $1`,
        [link.project_inquiry_link_id],
      );
      if (existing.rows[0] !== undefined) {
        if (existing.rows[0].record_hash === recordHash) {
          return this.#linkFrom(existing.rows[0]);
        }
        throw new PostgresProjectInquiryError(
          "PROJECT_INQUIRY_LINK_ID_CONFLICT",
          "The Project inquiry link identity is already bound to different canonical content.",
        );
      }

      const definition = link.content.project_definition_ref;
      const roleRef = link.content.inquiry_role_ref;
      const objectiveRef = link.content.inquiry_anchor.objective_ref;
      const workTarget = target.target_kind === "work" ? target : undefined;
      const resultTarget = target.target_kind === "result" ? target : undefined;
      const producedWork = resultTarget?.produced_by_work_ref;
      try {
        await client.query(
          `INSERT INTO petra.project_inquiry_links (
             project_inquiry_link_id, project_id, project_definition_id,
             project_definition_revision, project_definition_content_hash,
             project_inquiry_role_id, project_inquiry_role_revision,
             project_inquiry_role_content_hash, project_inquiry_role_record_hash,
             inquiry_semantic_key, objective_id, objective_revision,
             objective_content_hash, objective_record_hash, target_kind,
             relationship, bearing, work_unit_id, work_unit_revision,
             work_unit_spec_hash, work_unit_record_hash, result_schema_name,
             result_schema_version, result_record_id, result_revision,
             result_content_hash, result_record_hash,
             produced_by_work_unit_id, produced_by_work_unit_revision,
             produced_by_work_unit_spec_hash, produced_by_work_unit_record_hash,
             content_hash, created_by_actor_id, created_by_actor_kind,
             created_at, record_hash, payload
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
             $26, $27, $28, $29, $30, $31, $32, $33, $34, $35::timestamptz,
             $36, $37::jsonb
           )`,
          [
            link.project_inquiry_link_id,
            link.project_id,
            definition.project_definition_id,
            definition.revision,
            definition.content_hash,
            roleRef.project_inquiry_role_id,
            roleRef.revision,
            roleRef.content_hash,
            roleRef.record_hash,
            link.content.inquiry_anchor.semantic_key,
            objectiveRef.objective_id,
            objectiveRef.revision,
            objectiveRef.content_hash,
            objectiveRef.record_hash,
            target.target_kind,
            workTarget?.relationship ?? null,
            resultTarget?.bearing ?? null,
            workTarget?.work_unit_ref.work_unit_id ?? null,
            workTarget?.work_unit_ref.revision ?? null,
            workTarget?.work_unit_ref.spec_hash ?? null,
            workTarget?.work_unit_ref.record_hash ?? null,
            resultTarget?.result_ref.schema_name ?? null,
            resultTarget?.result_ref.schema_version ?? null,
            resultTarget?.result_ref.record_id ?? null,
            resultTarget?.result_ref.revision ?? null,
            resultTarget?.result_ref.content_hash ?? null,
            resultTarget?.result_ref.record_hash ?? null,
            producedWork?.work_unit_id ?? null,
            producedWork?.revision ?? null,
            producedWork?.spec_hash ?? null,
            producedWork?.record_hash ?? null,
            link.content_hash,
            link.created_by.actor_id,
            link.created_by.actor_kind,
            link.created_at,
            recordHash,
            JSON.stringify(link),
          ],
        );
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new PostgresProjectInquiryError(
            "PROJECT_INQUIRY_LINK_DUPLICATE",
            "This exact inquiry-to-Work or result association is already registered.",
          );
        }
        throw error;
      }
      return clone(link);
    });
  }

  async getProjectInquiryLink(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraProjectInquiryLink | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_inquiry_links
        WHERE project_id = $1 AND project_inquiry_link_id = $2`,
      [projectId, projectInquiryLinkId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#linkFrom(result.rows[0]);
  }

  async listProjectInquiryLinks(
    projectId: string,
    objectiveId?: string,
  ): Promise<PetraProjectInquiryLink[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_inquiry_links
        WHERE project_id = $1
          AND ($2::text IS NULL OR objective_id = $2)
        ORDER BY created_at, project_inquiry_link_id`,
      [projectId, objectiveId ?? null],
    );
    return result.rows.map((row) => this.#linkFrom(row));
  }

  async listProjectInquiryLinksForWork(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectInquiryLink[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_inquiry_links
        WHERE project_id = $1
          AND (work_unit_id = $2 OR produced_by_work_unit_id = $2)
        ORDER BY created_at, project_inquiry_link_id`,
      [projectId, workUnitId],
    );
    return result.rows.map((row) => this.#linkFrom(row));
  }

  async #requireDefinition(
    client: PoolClient,
    projectId: string,
    ref: PetraProjectInquiryRole["content"]["project_definition_ref"],
  ): Promise<PetraProjectDefinition> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_definition_revisions
        WHERE project_id = $1 AND project_definition_id = $2
          AND revision = $3 AND content_hash = $4`,
      [projectId, ref.project_definition_id, ref.revision, ref.content_hash],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The exact ProjectDefinition revision for this inquiry record does not exist.",
      );
    }
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = row.payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== ref.content_hash ||
      definition.content_hash !== canonicalHash(definition.content) ||
      row.record_hash !== canonicalHash(definition)
    ) {
      throw this.#corrupt(
        "The stored ProjectDefinition cannot reproduce the inquiry reference.",
      );
    }
    return clone(definition);
  }

  #assertRegisteredRole(
    definition: PetraProjectDefinition,
    role: PetraProjectInquiryRole,
  ): void {
    const representation = role.content.representation;
    if (
      role.content.role_semantic_key !== representation.objective_kind ||
      !definition.content.terms.some(
        (term) =>
          term.semantic_key === role.content.role_semantic_key &&
          term.generic_family === "focus",
      )
    ) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_ROLE_UNREGISTERED",
        "The inquiry role must resolve to a focus term registered by its exact ProjectDefinition.",
      );
    }
    const registration = definition.content.registrations.find(
      (candidate) =>
        candidate.registration_kind === representation.registration_kind &&
        candidate.semantic_key === representation.objective_kind,
    );
    if (
      registration === undefined ||
      registration.contract.name !== representation.contract.name ||
      registration.contract.version !== representation.contract.version ||
      registration.contract.content_hash !==
        representation.contract.content_hash
    ) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_ROLE_UNREGISTERED",
        "The inquiry representation must exactly match an Objective registration in its ProjectDefinition.",
      );
    }
  }

  async #requireCurrentRole(
    client: PoolClient,
    projectId: string,
    ref: ProjectInquiryRoleRef,
  ): Promise<PetraProjectInquiryRole> {
    const result = await client.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_inquiry_roles AS head
         JOIN petra.project_inquiry_role_revisions AS record
           ON record.project_inquiry_role_id = head.project_inquiry_role_id
          AND record.revision = head.current_revision
        WHERE head.project_id = $1 AND head.project_inquiry_role_id = $2
          AND record.revision = $3 AND record.content_hash = $4
          AND record.record_hash = $5`,
      [
        projectId,
        ref.project_inquiry_role_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The exact current Project inquiry role revision does not exist.",
      );
    }
    const role = this.#roleFrom(row);
    if (role.content.status !== "active") {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_ROLE_INACTIVE",
        "A superseded Project inquiry role cannot receive new links.",
      );
    }
    return role;
  }

  async #requireObjectiveAnchor(
    client: PoolClient,
    link: PetraProjectInquiryLink,
    role: PetraProjectInquiryRole,
  ): Promise<PetraProjectObjective> {
    const anchor = link.content.inquiry_anchor;
    const ref = anchor.objective_ref;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_objective_revisions
        WHERE project_id = $1 AND objective_id = $2 AND revision = $3
          AND content_hash = $4 AND record_hash = $5`,
      [
        link.project_id,
        ref.objective_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The exact Objective inquiry anchor does not exist.",
      );
    }
    this.#contracts.assertValid("project-objective", "1.0.0", row.payload);
    const objective = row.payload as PetraProjectObjective;
    const definition = link.content.project_definition_ref;
    if (
      objective.project_id !== link.project_id ||
      objective.content_hash !== canonicalHash(objective.content) ||
      row.record_hash !== canonicalHash(objective) ||
      anchor.semantic_key !== role.content.role_semantic_key ||
      objective.content.objective_kind !==
        role.content.representation.objective_kind ||
      objective.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      objective.project_definition_ref.revision !== definition.revision ||
      objective.project_definition_ref.content_hash !==
        definition.content_hash ||
      role.content.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      role.content.project_definition_ref.revision !== definition.revision ||
      role.content.project_definition_ref.content_hash !==
        definition.content_hash
    ) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_ANCHOR_INVALID",
        "The Objective anchor does not match the inquiry role and exact ProjectDefinition.",
      );
    }
    return clone(objective);
  }

  async #requireTarget(
    client: PoolClient,
    link: PetraProjectInquiryLink,
  ): Promise<void> {
    const target = link.content.target;
    if (target.target_kind === "work") {
      await this.#requireWork(client, link.project_id, target.work_unit_ref);
      return;
    }
    if (
      target.result_ref.schema_name !== "petra.grounded-response" ||
      target.result_ref.schema_version !== "1.0.0" ||
      target.bearing !== "addresses" ||
      target.produced_by_work_ref === undefined
    ) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_TARGET_UNSUPPORTED",
        "The initial result adapter only admits GroundedResponse records as non-authoritative addressing results with exact producing Work.",
      );
    }
    const work = await this.#requireWork(
      client,
      link.project_id,
      target.produced_by_work_ref,
    );
    const ref = target.result_ref;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.grounded_response_revisions
        WHERE project_id = $1 AND grounded_response_id = $2
          AND revision = $3 AND content_hash = $4 AND record_hash = $5`,
      [
        link.project_id,
        ref.record_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The exact GroundedResponse result does not exist.",
      );
    }
    this.#contracts.assertValid("grounded-response", "1.0.0", row.payload);
    const response = row.payload as PetraGroundedResponse;
    const responseWork = response.content.interaction_ref.work_unit_ref;
    if (
      response.project_id !== link.project_id ||
      response.content_hash !== canonicalHash(response.content) ||
      row.record_hash !== canonicalHash(response) ||
      responseWork.work_unit_id !== work.work_unit_id ||
      responseWork.revision !== work.revision ||
      responseWork.spec_hash !== work.spec_hash
    ) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_DEFINITION_MISMATCH",
        "The GroundedResponse does not reproduce the declared Project and producing Work chain.",
      );
    }
  }

  async #requireWork(
    client: PoolClient,
    projectId: string,
    ref: {
      work_unit_id: string;
      revision: number;
      spec_hash: string;
      record_hash: string;
    },
  ): Promise<PetraWorkUnit> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.work_unit_revisions
        WHERE project_id = $1 AND work_unit_id = $2 AND revision = $3
          AND spec_hash = $4 AND record_hash = $5`,
      [
        projectId,
        ref.work_unit_id,
        ref.revision,
        ref.spec_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The exact WorkUnit inquiry target does not exist.",
      );
    }
    this.#contracts.assertValid("work-unit", "1.0.0", row.payload);
    const work = row.payload as PetraWorkUnit;
    if (
      work.project_id !== projectId ||
      work.spec_hash !== canonicalHash(work.spec) ||
      row.record_hash !== canonicalHash(work)
    ) {
      throw this.#corrupt(
        "The stored WorkUnit cannot reproduce the inquiry target.",
      );
    }
    return clone(work);
  }

  #roleFrom(row: StoredRow): PetraProjectInquiryRole {
    this.#contracts.assertValid("project-inquiry-role", "1.0.0", row.payload);
    const role = row.payload as PetraProjectInquiryRole;
    if (
      role.content_hash !== canonicalHash(role.content) ||
      row.record_hash !== canonicalHash(role)
    ) {
      throw this.#corrupt(
        "The stored Project inquiry role cannot be reproduced exactly.",
      );
    }
    return clone(role);
  }

  #linkFrom(row: StoredRow): PetraProjectInquiryLink {
    this.#contracts.assertValid("project-inquiry-link", "1.0.0", row.payload);
    const link = row.payload as PetraProjectInquiryLink;
    if (
      link.content_hash !== canonicalHash(link.content) ||
      row.record_hash !== canonicalHash(link)
    ) {
      throw this.#corrupt(
        "The stored Project inquiry link cannot be reproduced exactly.",
      );
    }
    return clone(link);
  }

  #assertContentHash(expected: string, content: unknown): void {
    if (expected !== canonicalHash(content)) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_CONTENT_HASH_MISMATCH",
        "The Project inquiry content hash must identify its exact canonical content.",
      );
    }
  }

  async #requireProjectAndActor(
    client: PoolClient,
    projectId: string,
    actorId: string,
    actorKind: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1
         FROM petra.projects AS project
         JOIN petra.actors AS actor
           ON actor.actor_id = $2 AND actor.actor_kind = $3
        WHERE project.project_id = $1`,
      [projectId, actorId, actorKind],
    );
    if (result.rowCount !== 1) {
      throw new PostgresProjectInquiryError(
        "PROJECT_INQUIRY_REFERENCE_MISSING",
        "The Project and actor must exist before inquiry authority is registered.",
      );
    }
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...keys].sort()) {
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  #corrupt(message: string): PostgresProjectInquiryError {
    return new PostgresProjectInquiryError(
      "PROJECT_INQUIRY_STORED_RECORD_CORRUPT",
      message,
    );
  }
}

export { exactRoleRef as projectInquiryRoleRef };
