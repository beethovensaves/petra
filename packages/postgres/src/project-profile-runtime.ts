import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
  RegisteredProjectTaxonomy,
  RegisteredProjectTaxonomySection,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectProfileRuntimeError,
  derivePetraId,
  type ProjectProfileCommandAuthority,
  type ProjectProfileRuntimeReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface PayloadRow {
  readonly payload: unknown;
}

interface StoredReceiptRow extends PayloadRow {
  readonly request_hash: string;
}

interface CurrentProjectRow extends PayloadRow {
  readonly current_revision: string;
  readonly created_by_actor_id: string;
  readonly created_by_actor_kind: ActorRef["actor_kind"];
}

interface DefinitionRow extends PayloadRow {
  readonly project_revision: string;
}

export interface ProjectProfileRuntimePrincipal {
  readonly actor_id: string;
  readonly actor_kind: "human";
}

export interface PostgresProjectProfileRuntimeOptions {
  readonly now?: () => string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const unavailableSection = (
  limitation: string,
): RegisteredProjectTaxonomySection => ({
  state: "unavailable",
  items: [],
  limitation,
});

const projectAuthoredTaxonomy = (
  definition: PetraProjectDefinition,
): RegisteredProjectTaxonomy => {
  const terms = new Map(
    definition.content.terms.map((term) => [term.semantic_key, term]),
  );
  const section = (
    registrationKind: PetraProjectDefinition["content"]["registrations"][number]["registration_kind"],
    emptyReason: string,
  ): RegisteredProjectTaxonomySection => {
    const registrations = definition.content.registrations.filter(
      (registration) => registration.registration_kind === registrationKind,
    );
    if (registrations.length === 0) return unavailableSection(emptyReason);
    return {
      state: "available",
      items: registrations.map((registration) => {
        const term = terms.get(registration.semantic_key);
        return {
          semantic_key: registration.semantic_key,
          label: term?.singular ?? registration.semantic_key,
          meaning:
            term?.definition ??
            `This exact semantic key is registered by ${registration.contract.name}@${registration.contract.version}; this ProjectDefinition supplies no additional terminology definition.`,
          availability: "available" as const,
          contract: clone(registration.contract),
        };
      }),
    };
  };
  return {
    object_kinds: section(
      "object_schema",
      "This ProjectDefinition registers no object schemas.",
    ),
    relationship_meanings: section(
      "relationship_schema",
      "This ProjectDefinition registers no relationship schemas.",
    ),
    source_roles: section(
      "source_role",
      "This ProjectDefinition registers no source roles.",
    ),
    validators: section(
      "validator",
      "This ProjectDefinition registers no Project-level validators.",
    ),
    work_families: section(
      "workflow",
      "This ProjectDefinition registers no Work families.",
    ),
    model_roles: section(
      "model_role",
      "This ProjectDefinition registers no model roles.",
    ),
    review_destinations: unavailableSection(
      "Project-authored definitions need an exact registered Review destination before Petra can present one as profile taxonomy.",
    ),
    terminology: clone(definition.content.terms),
    supported_places: clone(definition.content.supported_places),
    unavailable_operations: [
      {
        operation_id: "taxonomy.registered-profile",
        label: "Use registered profile operations",
        reason:
          "This Project owns a project-authored definition rather than an exact registered profile version.",
      },
    ],
  };
};

/**
 * PostgreSQL owner for the optional profile catalogue, exact taxonomy reads,
 * and authenticated create/reset composition. Project definitions remain
 * Project-owned copies; profile rows are immutable template origins only.
 */
export class PostgresProjectProfileRuntime
  implements ProjectProfileRuntimeReader, ProjectProfileCommandAuthority
{
  readonly #pool: Pool;
  readonly #principal: ProjectProfileRuntimePrincipal | undefined;
  readonly #contracts: PetraContractRegistry;
  readonly #now: () => string;

  constructor(
    pool: Pool,
    principal?: ProjectProfileRuntimePrincipal,
    contracts = new PetraContractRegistry(),
    options: PostgresProjectProfileRuntimeOptions = {},
  ) {
    this.#pool = pool;
    this.#principal = principal === undefined ? undefined : { ...principal };
    this.#contracts = contracts;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async registerProfile(
    profile: PetraRegisteredProjectProfile,
  ): Promise<PetraRegisteredProjectProfile> {
    this.#contracts.assertValid("registered-project-profile", "1.0.0", profile);
    if (canonicalHash(profile.content) !== profile.content_hash) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_RUNTIME_CORRUPT",
        "The registered profile content hash does not identify its exact canonical content.",
      );
    }
    const recordHash = canonicalHash(profile);
    const result = await this.#pool.query<{ record_hash: string }>(
      `INSERT INTO petra.registered_project_profiles (
         profile_id, profile_version, definition_family, status, content_hash,
         schema_name, schema_version, record_hash, payload, registered_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz)
       ON CONFLICT (profile_id, profile_version) DO NOTHING
       RETURNING record_hash`,
      [
        profile.profile_id,
        profile.profile_version,
        profile.definition_family,
        profile.status,
        profile.content_hash,
        profile.schema_name,
        profile.schema_version,
        recordHash,
        JSON.stringify(profile),
        profile.registered_at,
      ],
    );
    if (result.rowCount === 0) {
      const existing = await this.#pool.query<{ record_hash: string }>(
        `SELECT record_hash
           FROM petra.registered_project_profiles
          WHERE profile_id = $1 AND profile_version = $2`,
        [profile.profile_id, profile.profile_version],
      );
      if (existing.rows[0]?.record_hash !== recordHash) {
        throw new ProjectProfileRuntimeError(
          "PROJECT_PROFILE_COMMAND_CONFLICT",
          "The registered profile identity is already bound to different content.",
        );
      }
    }
    return clone(profile);
  }

  async listRegisteredProfiles(): Promise<PetraRegisteredProjectProfile[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT latest.payload
         FROM (
           SELECT DISTINCT ON (profile_id) profile_id, payload
             FROM petra.registered_project_profiles
            WHERE status = 'active'
            ORDER BY profile_id,
                     string_to_array(profile_version, '.')::int[] DESC
         ) AS latest
        ORDER BY latest.payload -> 'content' ->> 'label', latest.profile_id`,
    );
    return result.rows.map((row) => this.#profileFrom(row.payload));
  }

  async getRegisteredProfile(
    profileId: string,
    profileVersion?: string,
  ): Promise<PetraRegisteredProjectProfile | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      profileVersion === undefined
        ? `SELECT payload
             FROM petra.registered_project_profiles
            WHERE profile_id = $1 AND status = 'active'
            ORDER BY string_to_array(profile_version, '.')::int[] DESC
            LIMIT 1`
        : `SELECT payload
             FROM petra.registered_project_profiles
            WHERE profile_id = $1 AND profile_version = $2 AND status = 'active'`,
      profileVersion === undefined ? [profileId] : [profileId, profileVersion],
    );
    const payload = result.rows[0]?.payload;
    return payload === undefined ? undefined : this.#profileFrom(payload);
  }

  async getProjectProfileTaxonomy(
    projectId: string,
    definitionRevision?: number,
  ): Promise<PetraProjectProfileTaxonomyView | undefined> {
    const result = await this.#pool.query<DefinitionRow>(
      definitionRevision === undefined
        ? `SELECT definition_revision.payload,
                  project.current_revision AS project_revision
             FROM petra.projects AS project
             JOIN petra.project_definitions AS definition
               ON definition.project_id = project.project_id
             JOIN petra.project_definition_revisions AS definition_revision
               ON definition_revision.project_definition_id = definition.project_definition_id
              AND definition_revision.revision = definition.current_revision
            WHERE project.project_id = $1`
        : `SELECT definition_revision.payload,
                  project.current_revision AS project_revision
             FROM petra.projects AS project
             JOIN petra.project_definitions AS definition
               ON definition.project_id = project.project_id
             JOIN petra.project_definition_revisions AS definition_revision
               ON definition_revision.project_definition_id = definition.project_definition_id
              AND definition_revision.revision = $2
            WHERE project.project_id = $1`,
      definitionRevision === undefined
        ? [projectId]
        : [projectId, definitionRevision],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const definition = this.#definitionFrom(row.payload);
    const base = {
      schema_name: "petra.project-profile-taxonomy-view" as const,
      schema_version: "1.0.0" as const,
      project_id: projectId,
      project_revision: Number(row.project_revision),
      project_definition_ref: {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      },
      read_at: this.#now(),
    };
    let view: PetraProjectProfileTaxonomyView;
    if (definition.origin.origin_kind === "project_authored") {
      view = {
        ...base,
        resolution: {
          state: "project_authored",
          label: definition.content.label,
          purpose: definition.content.description,
          taxonomy: projectAuthoredTaxonomy(definition),
          limitation:
            "This exact ProjectDefinition is Project-authored. Registered-profile-only operations are unavailable unless an explicit compatible migration is reviewed.",
        },
      };
    } else {
      const profileRef = {
        profile_id: definition.origin.template_id,
        profile_version: definition.origin.template_version,
        content_hash: definition.origin.template_hash,
      };
      const exact = await this.#pool.query<PayloadRow>(
        `SELECT payload
           FROM petra.registered_project_profiles
          WHERE profile_id = $1
            AND profile_version = $2
            AND content_hash = $3
            AND status = 'active'`,
        [
          profileRef.profile_id,
          profileRef.profile_version,
          profileRef.content_hash,
        ],
      );
      const profilePayload = exact.rows[0]?.payload;
      if (profilePayload !== undefined) {
        const profile = this.#profileFrom(profilePayload);
        const matches =
          profile.definition_family === definition.definition_family &&
          canonicalHash(profile.content.definition) === definition.content_hash;
        view = matches
          ? {
              ...base,
              resolution: {
                state: "registered",
                profile_ref: profileRef,
                label: profile.content.label,
                purpose: profile.content.purpose,
                taxonomy: clone(profile.content.taxonomy),
              },
            }
          : {
              ...base,
              resolution: {
                state: "unsupported_profile",
                profile_ref: profileRef,
                reason: "definition_binding_mismatch",
                message:
                  "The retained ProjectDefinition does not match the exact registered profile basis. Petra will not substitute profile semantics.",
                safe_destination: "projects",
              },
            };
      } else {
        const identity = await this.#pool.query<{
          profile_exists: boolean;
          version_exists: boolean;
        }>(
          `SELECT
             EXISTS(
               SELECT 1 FROM petra.registered_project_profiles
                WHERE profile_id = $1
             ) AS profile_exists,
             EXISTS(
               SELECT 1 FROM petra.registered_project_profiles
                WHERE profile_id = $1 AND profile_version = $2
             ) AS version_exists`,
          [profileRef.profile_id, profileRef.profile_version],
        );
        const state = identity.rows[0];
        const reason = !state?.profile_exists
          ? "profile_not_registered"
          : !state.version_exists
            ? "profile_version_unavailable"
            : "profile_hash_mismatch";
        view = {
          ...base,
          resolution: {
            state: "unsupported_profile",
            profile_ref: profileRef,
            reason,
            message:
              "The exact profile version for this Project is unavailable. Petra will not borrow labels, operations, or meaning from another profile.",
            safe_destination: "projects",
          },
        };
      }
    }
    this.#contracts.assertValid("project-profile-taxonomy-view", "1.0.0", view);
    return clone(view);
  }

  async executeProjectProfileCommand(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandReceipt> {
    this.#contracts.assertValid(
      "project-profile-command-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    return this.#transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [
          `project-profile-command:${request.command_id}:${request.idempotency_key}`,
        ],
      );
      const retained = await client.query<StoredReceiptRow>(
        `SELECT request_hash, payload
           FROM petra.project_profile_command_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id`,
        [request.command_id, request.idempotency_key],
      );
      if (retained.rows.length > 0) {
        const exact = retained.rows.find(
          (row) => row.request_hash === requestHash,
        );
        if (retained.rows.length !== 1 || exact === undefined) {
          throw new ProjectProfileRuntimeError(
            "PROJECT_PROFILE_COMMAND_CONFLICT",
            "The command or idempotency key is already bound to a different Project profile request.",
          );
        }
        return this.#receiptFrom(exact.payload);
      }

      const profile = await this.#requireExactProfile(client, request);
      await this.#requirePrincipal(client);
      const prior =
        request.operation === "reset"
          ? await this.#requireResetProject(client, request)
          : undefined;
      const recordedAt = this.#now();
      const projectId = derivePetraId("project", request.command_id);
      const projectDefinitionId = derivePetraId(
        "project_definition",
        request.command_id,
      );
      const objectiveId = derivePetraId("objective", request.command_id);
      const receiptId = derivePetraId(
        "project_profile_receipt",
        request.command_id,
      );
      const actor = { ...this.#principal } as ProjectProfileRuntimePrincipal;
      const project: PetraProject = {
        schema_name: "petra.project",
        schema_version: "1.0.0",
        project_id: projectId,
        revision: 1,
        name: request.project.name,
        ...(request.project.description === undefined
          ? {}
          : { description: request.project.description }),
        status: "active",
        visibility: "private",
        enabled_evidence_namespaces: clone(
          profile.content.enabled_evidence_namespaces,
        ),
        created_by: actor,
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      const definitionContent = clone(profile.content.definition);
      const definitionHash = canonicalHash(definitionContent);
      const definition: PetraProjectDefinition = {
        schema_name: "petra.project-definition",
        schema_version: "1.0.0",
        project_definition_id: projectDefinitionId,
        revision: 1,
        project_id: projectId,
        definition_family: profile.definition_family,
        origin: {
          origin_kind: "template_seed",
          template_id: profile.profile_id,
          template_version: profile.profile_version,
          template_hash: profile.content_hash,
        },
        content: definitionContent,
        content_hash: definitionHash,
        created_by: actor,
        created_at: recordedAt,
      };
      const objectiveContent = {
        objective_kind: profile.content.objective_kind,
        statement: request.objective.statement,
        status: "active" as const,
        dependency_refs: [],
      };
      const objectiveHash = canonicalHash(objectiveContent);
      const objective: PetraProjectObjective = {
        schema_name: "petra.project-objective",
        schema_version: "1.0.0",
        objective_id: objectiveId,
        revision: 1,
        project_id: projectId,
        project_definition_ref: {
          project_definition_id: projectDefinitionId,
          revision: 1,
          content_hash: definitionHash,
        },
        content: objectiveContent,
        content_hash: objectiveHash,
        created_by: actor,
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      const receipt: PetraProjectProfileCommandReceipt = {
        schema_name: "petra.project-profile-command-receipt",
        schema_version: "1.0.0",
        receipt_id: receiptId,
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        operation: request.operation,
        actor,
        profile_ref: clone(request.profile_ref),
        ...(prior === undefined
          ? {}
          : {
              prior_project_ref: {
                project_id: prior.project_id,
                revision: prior.archived_revision,
                resulting_status: "archived" as const,
              },
            }),
        project_ref: { project_id: projectId, revision: 1 },
        project_definition_ref: {
          project_definition_id: projectDefinitionId,
          revision: 1,
          content_hash: definitionHash,
        },
        objective_ref: {
          objective_id: objectiveId,
          revision: 1,
          content_hash: objectiveHash,
        },
        destination: { place_role: "brief", project_id: projectId },
        recorded_at: recordedAt,
      };
      this.#contracts.assertValid("project", "1.0.0", project);
      this.#contracts.assertValid("project-definition", "1.0.0", definition);
      this.#contracts.assertValid("project-objective", "1.0.0", objective);
      this.#contracts.assertValid(
        "project-profile-command-receipt",
        "1.0.0",
        receipt,
      );

      if (prior !== undefined) {
        await this.#archivePriorProject(client, prior.payload, recordedAt);
      }
      await this.#insertCreatedProject(client, project, definition, objective);
      await client.query(
        `INSERT INTO petra.project_profile_command_receipts (
           receipt_id, command_id, idempotency_key, operation, request_hash,
           actor_id, actor_kind, profile_id, profile_version,
           profile_content_hash, prior_project_id, resulting_project_id,
           schema_name, schema_version, record_hash, payload, recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
           $15, $16::jsonb, $17::timestamptz
         )`,
        [
          receipt.receipt_id,
          receipt.command_id,
          receipt.idempotency_key,
          receipt.operation,
          requestHash,
          actor.actor_id,
          actor.actor_kind,
          profile.profile_id,
          profile.profile_version,
          profile.content_hash,
          prior?.project_id ?? null,
          projectId,
          receipt.schema_name,
          receipt.schema_version,
          canonicalHash(receipt),
          JSON.stringify(receipt),
          recordedAt,
        ],
      );
      return clone(receipt);
    });
  }

  async #requireExactProfile(
    client: PoolClient,
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraRegisteredProjectProfile> {
    const ref = request.profile_ref;
    const result = await client.query<PayloadRow>(
      `SELECT payload
         FROM petra.registered_project_profiles
        WHERE profile_id = $1
          AND profile_version = $2
          AND content_hash = $3
          AND status = 'active'`,
      [ref.profile_id, ref.profile_version, ref.content_hash],
    );
    if (result.rows[0]?.payload !== undefined) {
      return this.#profileFrom(result.rows[0].payload);
    }
    const state = await client.query<{
      profile_exists: boolean;
      version_exists: boolean;
    }>(
      `SELECT
         EXISTS(SELECT 1 FROM petra.registered_project_profiles WHERE profile_id = $1)
           AS profile_exists,
         EXISTS(
           SELECT 1 FROM petra.registered_project_profiles
            WHERE profile_id = $1 AND profile_version = $2
         ) AS version_exists`,
      [ref.profile_id, ref.profile_version],
    );
    if (!state.rows[0]?.profile_exists) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_NOT_REGISTERED",
        "The selected Project profile is not registered. No Project was created or reset.",
      );
    }
    if (!state.rows[0].version_exists) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_VERSION_UNAVAILABLE",
        "The selected Project profile version is unavailable. No nearby version was substituted.",
      );
    }
    throw new ProjectProfileRuntimeError(
      "PROJECT_PROFILE_HASH_MISMATCH",
      "The selected Project profile hash does not match the retained version. No Project was created or reset.",
    );
  }

  async #requirePrincipal(client: PoolClient): Promise<void> {
    if (this.#principal === undefined) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_COMMAND_DENIED",
        "The server-authenticated Project creator is not configured.",
      );
    }
    const actor = await client.query(
      `SELECT 1 FROM petra.actors WHERE actor_id = $1 AND actor_kind = $2`,
      [this.#principal.actor_id, this.#principal.actor_kind],
    );
    if (actor.rowCount !== 1) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_COMMAND_DENIED",
        "The server-authenticated Project creator is not registered.",
      );
    }
  }

  async #requireResetProject(
    client: PoolClient,
    request: PetraProjectProfileCommandRequest,
  ): Promise<{
    project_id: string;
    archived_revision: number;
    payload: PetraProject;
  }> {
    const expected = request.expected_project;
    if (expected === undefined) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_RESET_STALE",
        "Reset requires one exact current Project revision.",
      );
    }
    const result = await client.query<CurrentProjectRow>(
      `SELECT project.current_revision, project.created_by_actor_id,
              project.created_by_actor_kind, revision.payload
         FROM petra.projects AS project
         JOIN petra.project_revisions AS revision
           ON revision.project_id = project.project_id
          AND revision.revision = project.current_revision
        WHERE project.project_id = $1
        FOR UPDATE OF project`,
      [expected.project_id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_PROJECT_NOT_FOUND",
        "The Project selected for reset is unavailable.",
      );
    }
    const principal = this.#principal;
    if (principal === undefined) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_COMMAND_DENIED",
        "The server-authenticated Project creator is not configured.",
      );
    }
    if (
      Number(row.current_revision) !== expected.revision ||
      row.created_by_actor_id !== principal.actor_id ||
      row.created_by_actor_kind !== principal.actor_kind
    ) {
      throw new ProjectProfileRuntimeError(
        row.created_by_actor_id !== principal.actor_id
          ? "PROJECT_PROFILE_COMMAND_DENIED"
          : "PROJECT_PROFILE_RESET_STALE",
        row.created_by_actor_id !== principal.actor_id
          ? "Only the server-authenticated Project owner may reset this Project."
          : "The Project changed after reset was prepared. Refresh before trying again.",
      );
    }
    const project = row.payload as PetraProject;
    this.#contracts.assertValid("project", "1.0.0", project);
    if (project.status !== "active") {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_RESET_STALE",
        "Only an active Project can be reset.",
      );
    }
    return {
      project_id: expected.project_id,
      archived_revision: expected.revision + 1,
      payload: clone(project),
    };
  }

  async #archivePriorProject(
    client: PoolClient,
    project: PetraProject,
    recordedAt: string,
  ): Promise<void> {
    const archived: PetraProject = {
      ...clone(project),
      revision: project.revision + 1,
      status: "archived",
      updated_at: recordedAt,
    };
    this.#contracts.assertValid("project", "1.0.0", archived);
    await client.query(
      `INSERT INTO petra.project_revisions (
         project_id, revision, schema_name, schema_version, name, description,
         status, visibility, enabled_evidence_namespaces, created_by_actor_id,
         created_by_actor_kind, record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12,
         $13::jsonb, $14::timestamptz, $15::timestamptz
       )`,
      [
        archived.project_id,
        archived.revision,
        archived.schema_name,
        archived.schema_version,
        archived.name,
        archived.description ?? null,
        archived.status,
        archived.visibility,
        archived.enabled_evidence_namespaces,
        archived.created_by.actor_id,
        archived.created_by.actor_kind,
        canonicalHash(archived),
        JSON.stringify(archived),
        archived.created_at,
        archived.updated_at,
      ],
    );
    await client.query(
      `UPDATE petra.projects SET current_revision = $2 WHERE project_id = $1`,
      [archived.project_id, archived.revision],
    );
  }

  async #insertCreatedProject(
    client: PoolClient,
    project: PetraProject,
    definition: PetraProjectDefinition,
    objective: PetraProjectObjective,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.projects (
         project_id, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, 1, $2, $3, $4::timestamptz)`,
      [
        project.project_id,
        project.created_by.actor_id,
        project.created_by.actor_kind,
        project.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_revisions (
         project_id, revision, schema_name, schema_version, name, description,
         status, visibility, enabled_evidence_namespaces, created_by_actor_id,
         created_by_actor_kind, record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11,
         $12::jsonb, $13::timestamptz, $14::timestamptz
       )`,
      [
        project.project_id,
        project.schema_name,
        project.schema_version,
        project.name,
        project.description ?? null,
        project.status,
        project.visibility,
        project.enabled_evidence_namespaces,
        project.created_by.actor_id,
        project.created_by.actor_kind,
        canonicalHash(project),
        JSON.stringify(project),
        project.created_at,
        project.updated_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_definitions (
         project_definition_id, project_id, definition_family, current_revision
       ) VALUES ($1, $2, $3, 1)`,
      [
        definition.project_definition_id,
        definition.project_id,
        definition.definition_family,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_definition_revisions (
         project_definition_id, revision, project_id, schema_name,
         schema_version, definition_family, origin_kind, content_hash,
         created_by_actor_id, created_by_actor_kind, record_hash, payload,
         created_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
         $12::timestamptz
       )`,
      [
        definition.project_definition_id,
        definition.project_id,
        definition.schema_name,
        definition.schema_version,
        definition.definition_family,
        definition.origin.origin_kind,
        definition.content_hash,
        definition.created_by.actor_id,
        definition.created_by.actor_kind,
        canonicalHash(definition),
        JSON.stringify(definition),
        definition.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objectives (
         objective_id, project_id, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, $2, 1, $3, $4, $5::timestamptz)`,
      [
        objective.objective_id,
        objective.project_id,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        objective.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objective_revisions (
         objective_id, revision, project_id, schema_name, schema_version,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, objective_kind, status, content_hash,
         created_by_actor_id, created_by_actor_kind, record_hash, payload,
         created_at, updated_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12,
         $13::jsonb, $14::timestamptz, $15::timestamptz
       )`,
      [
        objective.objective_id,
        objective.project_id,
        objective.schema_name,
        objective.schema_version,
        objective.project_definition_ref.project_definition_id,
        objective.project_definition_ref.content_hash,
        objective.content.objective_kind,
        objective.content.status,
        objective.content_hash,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        canonicalHash(objective),
        JSON.stringify(objective),
        objective.created_at,
        objective.updated_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objective_focus (
         project_id, objective_id, objective_revision, objective_content_hash,
         changed_by_actor_id, changed_by_actor_kind, changed_at
       ) VALUES ($1, $2, 1, $3, $4, $5, $6::timestamptz)`,
      [
        project.project_id,
        objective.objective_id,
        objective.content_hash,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        objective.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objective_focus_history (
         project_id, objective_id, objective_revision, objective_content_hash,
         changed_by_actor_id, changed_by_actor_kind, changed_at
       ) VALUES ($1, $2, 1, $3, $4, $5, $6::timestamptz)`,
      [
        project.project_id,
        objective.objective_id,
        objective.content_hash,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        objective.created_at,
      ],
    );
  }

  #profileFrom(payload: unknown): PetraRegisteredProjectProfile {
    this.#contracts.assertValid("registered-project-profile", "1.0.0", payload);
    const profile = payload as PetraRegisteredProjectProfile;
    if (canonicalHash(profile.content) !== profile.content_hash) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_RUNTIME_CORRUPT",
        "The retained registered profile content hash is invalid.",
      );
    }
    return clone(profile);
  }

  #definitionFrom(payload: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (canonicalHash(definition.content) !== definition.content_hash) {
      throw new ProjectProfileRuntimeError(
        "PROJECT_PROFILE_RUNTIME_CORRUPT",
        "The retained ProjectDefinition content hash is invalid.",
      );
    }
    return clone(definition);
  }

  #receiptFrom(payload: unknown): PetraProjectProfileCommandReceipt {
    this.#contracts.assertValid(
      "project-profile-command-receipt",
      "1.0.0",
      payload,
    );
    return clone(payload as PetraProjectProfileCommandReceipt);
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
}
