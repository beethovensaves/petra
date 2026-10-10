import { prepareIntakeCreationBinding, recordIntakeCreationBinding } from "./intake-copilot-repository.js";
import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectDefinitionDraftCommandReceipt,
  PetraProjectDefinitionDraftCommandRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
  PetraProjectObjective,
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
  RegisteredProjectTaxonomy,
  RegisteredProjectTaxonomySection,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectDefinitionDraftError,
  ProjectProfileRuntimeError,
  derivePetraId,
  type ProjectDefinitionDraftCommandAuthority,
  type ProjectDefinitionDraftReader,
  type ProjectProfileCommandAuthority,
  type ProjectProfileCommandRecoveryReader,
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

const DRAFT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "project",
  "the",
  "this",
  "to",
  "with",
]);

const vocabulary = (value: string): Set<string> =>
  new Set(
    value
      .normalize("NFKD")
      .toLocaleLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length >= 3 && !DRAFT_STOP_WORDS.has(token)),
  );

const proposedProjectName = (outcome: string): string => {
  const firstLine = outcome.split(/\r?\n/u)[0]?.trim() ?? outcome;
  const firstSentence = firstLine.split(/(?<=[.!?])\s/u)[0] ?? firstLine;
  return firstSentence.length <= 120
    ? firstSentence
    : `${firstSentence.slice(0, 119).trimEnd()}…`;
};

const profileVocabulary = (
  profile: PetraRegisteredProjectProfile,
): Set<string> =>
  vocabulary(
    [
      profile.definition_family,
      profile.content.label,
      profile.content.purpose,
      profile.content.definition.label,
      profile.content.definition.description,
      ...profile.content.definition.terms.flatMap((term) => [
        term.singular,
        term.plural,
        term.definition,
      ]),
    ].join(" "),
  );

const profileMatchScore = (
  outcome: string,
  profile: PetraRegisteredProjectProfile,
): number => {
  const outcomeVocabulary = vocabulary(outcome);
  const candidateVocabulary = profileVocabulary(profile);
  return [...outcomeVocabulary].filter((token) =>
    candidateVocabulary.has(token),
  ).length;
};

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
  implements
    ProjectProfileRuntimeReader,
    ProjectProfileCommandAuthority,
    ProjectProfileCommandRecoveryReader,
    ProjectDefinitionDraftReader,
    ProjectDefinitionDraftCommandAuthority
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

  async draftProjectDefinition(
    request: PetraProjectDefinitionDraftRequest,
  ): Promise<PetraProjectDefinitionDraftView> {
    this.#contracts.assertValid(
      "project-definition-draft-request",
      "1.0.0",
      request,
    );
    this.#assertDraftRequest(request);
    return this.#readTransaction(async (client) =>
      this.#composeDefinitionDraft(client, request, this.#now()),
    );
  }

  async executeProjectDefinitionDraftCommand(
    request: PetraProjectDefinitionDraftCommandRequest,
  ): Promise<PetraProjectDefinitionDraftCommandReceipt> {
    this.#contracts.assertValid(
      "project-definition-draft-command-request",
      request.schema_version,
      request,
    );
    const requestHash = canonicalHash(request);
    return this.#transaction(async (client) => {
      const lockKeys = [
        `project-definition-draft-command:command:${request.command_id}`,
        `project-definition-draft-command:idempotency:${request.idempotency_key}`,
      ].sort();
      for (const lockKey of lockKeys) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [lockKey],
        );
      }
      const retained = await client.query<StoredReceiptRow>(
        `SELECT request_hash, payload
           FROM petra.project_definition_draft_command_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id`,
        [request.command_id, request.idempotency_key],
      );
      if (retained.rows.length > 0) {
        const exact = retained.rows.find(
          (row) => row.request_hash === requestHash,
        );
        if (retained.rows.length !== 1 || exact === undefined) {
          throw new ProjectDefinitionDraftError(
            "PROJECT_DEFINITION_DRAFT_COMMAND_CONFLICT",
            "The command or idempotency identity is already bound to a different definition-draft request.",
          );
        }
        return this.#draftReceiptFrom(exact.payload);
      }

      await this.#requireDraftPrincipal(client);
      const intake = request.schema_version === "1.1.0" ? await prepareIntakeCreationBinding(client,request,this.#principal!.actor_id) : undefined;
      this.#assertDraftRequest(request.draft.content.request);
      const currentDraft = await this.#composeDefinitionDraft(
        client,
        request.draft.content.request,
        this.#now(),
      );
      if (
        currentDraft.draft_id !== request.draft.draft_id ||
        currentDraft.content_hash !== request.draft.content_hash ||
        canonicalize(currentDraft.content) !==
          canonicalize(request.draft.content)
      ) {
        throw new ProjectDefinitionDraftError(
          "PROJECT_DEFINITION_DRAFT_STALE",
          "The reviewed Project definition draft no longer matches current registered capabilities. Review a fresh draft before creating the Project.",
        );
      }
      const requiredAssumptions = new Set(
        currentDraft.content.assumptions.map((assumption) => assumption.code),
      );
      const acceptedAssumptions = new Set(request.accepted_assumption_codes);
      if (
        requiredAssumptions.size !== acceptedAssumptions.size ||
        [...requiredAssumptions].some((code) => !acceptedAssumptions.has(code))
      ) {
        throw new ProjectDefinitionDraftError(
          "PROJECT_DEFINITION_DRAFT_ASSUMPTIONS_UNACCEPTED",
          "Project creation requires acceptance of every assumption in the exact reviewed draft and no unregistered assumption.",
        );
      }

      const recordedAt = this.#now();
      const projectId = derivePetraId("project", request.command_id);
      const projectDefinitionId = derivePetraId(
        "project_definition",
        request.command_id,
      );
      const objectiveId = derivePetraId("objective", request.command_id);
      const receiptId = derivePetraId(
        "definition_draft_receipt",
        request.command_id,
      );
      const actor = { ...this.#principal } as ProjectProfileRuntimePrincipal;
      const content = currentDraft.content;
      const project: PetraProject = {
        schema_name: "petra.project",
        schema_version: "1.0.0",
        project_id: projectId,
        revision: 1,
        name: content.project.name,
        description: content.project.description,
        status: "active",
        visibility: "private",
        enabled_evidence_namespaces: clone(content.enabled_evidence_namespaces),
        created_by: actor,
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      const definitionContent = clone(content.definition_content);
      const definitionHash = canonicalHash(definitionContent);
      const definition: PetraProjectDefinition = {
        schema_name: "petra.project-definition",
        schema_version: "1.0.0",
        project_definition_id: projectDefinitionId,
        revision: 1,
        project_id: projectId,
        definition_family: content.definition_family,
        origin: clone(content.definition_origin),
        content: definitionContent,
        content_hash: definitionHash,
        created_by: actor,
        created_at: recordedAt,
      };
      const objectiveContent = {
        objective_kind: content.objective.objective_kind,
        statement: content.objective.statement,
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
      const receipt: PetraProjectDefinitionDraftCommandReceipt = {
        schema_name: "petra.project-definition-draft-command-receipt",
        schema_version: "1.0.0",
        receipt_id: receiptId,
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        actor,
        draft_ref: {
          draft_id: currentDraft.draft_id,
          content_hash: currentDraft.content_hash,
        },
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
        initial_material_plan: clone(content.initial_material_plan),
        destination: { place_role: "brief", project_id: projectId },
        recorded_at: recordedAt,
      };
      this.#contracts.assertValid("project", "1.0.0", project);
      this.#contracts.assertValid("project-definition", "1.0.0", definition);
      this.#contracts.assertValid("project-objective", "1.0.0", objective);
      this.#contracts.assertValid(
        "project-definition-draft-command-receipt",
        "1.0.0",
        receipt,
      );
      await this.#insertCreatedProject(client, project, definition, objective);
      await client.query(
        `INSERT INTO petra.project_definition_draft_command_receipts (
           receipt_id, command_id, idempotency_key, request_hash, draft_id,
           draft_content_hash, actor_id, actor_kind, resulting_project_id,
           schema_name, schema_version, record_hash, payload, recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13::jsonb, $14::timestamptz
         )`,
        [
          receipt.receipt_id,
          receipt.command_id,
          receipt.idempotency_key,
          requestHash,
          currentDraft.draft_id,
          currentDraft.content_hash,
          actor.actor_id,
          actor.actor_kind,
          projectId,
          receipt.schema_name,
          receipt.schema_version,
          canonicalHash(receipt),
          JSON.stringify(receipt),
          recordedAt,
        ],
      );
      if (intake !== undefined) await recordIntakeCreationBinding(client,intake,receipt);
      return clone(receipt);
    }, "READ COMMITTED");
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

  async assessProjectProfileCommandRecovery(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandRecoveryView> {
    this.#contracts.assertValid(
      "project-profile-command-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    return this.#readTransaction(async (client) => {
      await this.#requirePrincipal(client);
      const retained = await client.query<StoredReceiptRow>(
        `SELECT request_hash, payload
           FROM petra.project_profile_command_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id`,
        [request.command_id, request.idempotency_key],
      );
      const exact =
        retained.rows.length === 1 &&
        retained.rows[0]?.request_hash === requestHash
          ? this.#receiptFrom(retained.rows[0].payload)
          : undefined;
      const principal = this.#principal as ProjectProfileRuntimePrincipal;
      const ownedExact =
        exact !== undefined &&
        exact.actor.actor_id === principal.actor_id &&
        exact.actor.actor_kind === principal.actor_kind
          ? exact
          : undefined;
      const observationCutoff = this.#now();
      const subject = {
        operation: request.operation,
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
        ...(request.expected_project === undefined
          ? {}
          : { expected_project: clone(request.expected_project) }),
      };
      const exactRequest = {
        item: "exact_request" as const,
        identity: requestHash,
        durability: "client_session" as const,
        state: "client_copy_required" as const,
      };
      let content: PetraProjectProfileCommandRecoveryView["content"];

      if (ownedExact !== undefined) {
        type PreservedItem =
          PetraProjectProfileCommandRecoveryView["content"]["preservation"][number];
        const basePreservation: [
          PreservedItem,
          PreservedItem,
          PreservedItem,
          PreservedItem,
          PreservedItem,
        ] = [
          exactRequest,
          {
            item: "command_receipt",
            identity: ownedExact.receipt_id,
            durability: "postgresql",
            state: "retained",
          },
          {
            item: "project",
            identity: ownedExact.project_ref.project_id,
            revision: ownedExact.project_ref.revision,
            durability: "postgresql",
            state: "retained",
          },
          {
            item: "project_definition",
            identity: ownedExact.project_definition_ref.project_definition_id,
            revision: ownedExact.project_definition_ref.revision,
            content_hash: ownedExact.project_definition_ref.content_hash,
            durability: "postgresql",
            state: "retained",
          },
          {
            item: "objective",
            identity: ownedExact.objective_ref.objective_id,
            revision: ownedExact.objective_ref.revision,
            content_hash: ownedExact.objective_ref.content_hash,
            durability: "postgresql",
            state: "retained",
          },
        ];
        const preservation: PetraProjectProfileCommandRecoveryView["content"]["preservation"] =
          ownedExact.prior_project_ref === undefined
            ? basePreservation
            : [
                ...basePreservation,
                {
                  item: "prior_project",
                  identity: ownedExact.prior_project_ref.project_id,
                  revision: ownedExact.prior_project_ref.revision,
                  durability: "postgresql",
                  state: "archived",
                },
              ];
        content = {
          subject,
          effect: {
            state: "effect_confirmed",
            meaning:
              "The exact Project-profile command receipt is retained. Repeating the same request returns this receipt without another effect.",
            receipt: clone(ownedExact),
          },
          preservation,
          eligible_actions: [
            {
              operation: "open_resulting_project",
              eligibility: "eligible",
              owner: "browser_navigation",
              method: "GET",
              path: `/projects/${ownedExact.project_ref.project_id}`,
              input_behavior: "none",
              identity_behavior: "no_command",
              authority_effect:
                "Navigation has no authority effect and uses the exact resulting Project identity from the retained receipt.",
              history_effect:
                "Navigation creates no domain History event and does not replay the Project-profile command.",
              reason:
                "The retained receipt supplies an exact resulting Project and Brief destination.",
              success_destination: clone(ownedExact.destination),
              failure_destination: { place_role: "projects" },
              execution_recheck: true,
            },
          ],
          return: {
            state: "exact",
            destination: clone(ownedExact.destination),
            reason:
              "The retained receipt supplies the resulting Project Brief destination.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "This assessment reconciles only the exact Project-profile command receipt and does not infer downstream task state.",
            "Opening the result re-reads current Project authority through the normal Project route.",
          ],
        };
      } else if (retained.rows.length === 0) {
        const resultingProjectId = derivePetraId("project", request.command_id);
        const commandPath =
          request.operation === "create"
            ? "/api/commands/projects"
            : `/api/commands/projects/${request.expected_project?.project_id}/reset`;
        content = {
          subject,
          effect: {
            state: "outcome_unknown",
            reason: "receipt_not_observed_at_cutoff",
            meaning:
              "No exact receipt was visible at the observation cutoff. Absence does not prove that no effect occurred after the cutoff.",
          },
          preservation: [exactRequest],
          eligible_actions: [
            {
              operation: "retry_exact_command",
              eligibility: "eligible",
              owner: "project_profile_command",
              method: "POST",
              path: commandPath,
              input_behavior: "reuse_exact_request",
              identity_behavior: "reuse_command_and_idempotency",
              authority_effect:
                request.operation === "create"
                  ? "The owning command may create one Project after rechecking the exact profile and authenticated actor."
                  : "The owning command may archive the exact expected Project revision and create one replacement after rechecking current authority.",
              history_effect:
                "The owning Project-profile receipt remains the only durable command result; this assessment creates no recovery event or second ledger.",
              reason:
                "Exact idempotent redelivery is safe because no conflicting command identity was observed; execution rechecks current authority.",
              success_destination: {
                place_role: "brief",
                project_id: resultingProjectId,
              },
              failure_destination: { place_role: "projects" },
              execution_recheck: true,
            },
          ],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "No retained receipt supplies an exact resulting Project yet. Return to Projects without implying command success.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "This assessment reads only the Project-profile command receipt authority.",
            "A missing receipt at the observation cutoff is not proof that no later effect occurred.",
          ],
        };
      } else {
        content = {
          subject,
          effect: {
            state: "unavailable_to_verify",
            reason:
              exact === undefined
                ? "command_identity_conflict"
                : "command_not_owned_by_authenticated_actor",
            meaning:
              "The command or idempotency identity cannot be reconciled to this exact authenticated request. Petra will not expose another request or retry with conflicting identity.",
          },
          preservation: [exactRequest],
          eligible_actions: [],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "Return to Projects without exposing or repeating a command bound to another exact request or actor.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "Conflicting command contents and results are intentionally undisclosed.",
            "Use a fresh command and idempotency identity only after reviewing the locally retained request.",
          ],
        };
      }

      const contentHash = canonicalHash(content);
      const view: PetraProjectProfileCommandRecoveryView = {
        schema_name: "petra.project-profile-command-recovery-view",
        schema_version: "1.0.0",
        assessment_id: derivePetraId("project_profile_recovery", contentHash),
        content,
        content_hash: contentHash,
        read_at: observationCutoff,
      };
      this.#contracts.assertValid(
        "project-profile-command-recovery-view",
        "1.0.0",
        view,
      );
      return clone(view);
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

  #assertDraftRequest(request: PetraProjectDefinitionDraftRequest): void {
    if (
      request.outcome !== request.outcome.trim() ||
      (request.project_name !== undefined &&
        request.project_name !== request.project_name.trim())
    ) {
      throw new ProjectDefinitionDraftError(
        "PROJECT_DEFINITION_DRAFT_INVALID",
        "The outcome and optional Project name must not contain leading or trailing whitespace.",
      );
    }
    const materialIds = (request.initial_material ?? []).map(
      (material) => material.material_id,
    );
    if (new Set(materialIds).size !== materialIds.length) {
      throw new ProjectDefinitionDraftError(
        "PROJECT_DEFINITION_DRAFT_INVALID",
        "Every initial material must have a distinct material identity.",
      );
    }
  }

  async #composeDefinitionDraft(
    client: PoolClient,
    request: PetraProjectDefinitionDraftRequest,
    readAt: string,
  ): Promise<PetraProjectDefinitionDraftView> {
    const available = await client.query<PayloadRow>(
      `SELECT latest.payload
         FROM (
           SELECT DISTINCT ON (profile_id) profile_id, payload
             FROM petra.registered_project_profiles
            WHERE status = 'active'
            ORDER BY profile_id,
                     string_to_array(profile_version, '.')::int[] DESC
         ) AS latest
        ORDER BY latest.profile_id`,
    );
    const profiles = available.rows.map((row) =>
      this.#profileFrom(row.payload),
    );
    let profile: PetraRegisteredProjectProfile | undefined;
    if (request.example_ref !== undefined) {
      profile = profiles.find(
        (candidate) =>
          candidate.profile_id === request.example_ref?.profile_id &&
          candidate.profile_version === request.example_ref.profile_version &&
          candidate.content_hash === request.example_ref.content_hash,
      );
      if (profile === undefined) {
        throw new ProjectDefinitionDraftError(
          "PROJECT_DEFINITION_DRAFT_EXAMPLE_UNAVAILABLE",
          "The exact optional example is no longer registered. Review the outcome without it or select a current example.",
        );
      }
    } else {
      const ranked = profiles
        .map((candidate) => ({
          profile: candidate,
          score: profileMatchScore(request.outcome, candidate),
        }))
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.profile.profile_id.localeCompare(right.profile.profile_id),
        );
      if (
        (ranked[0]?.score ?? 0) >= 2 &&
        ranked[0]!.score > (ranked[1]?.score ?? 0)
      ) {
        profile = ranked[0]!.profile;
      }
    }

    const objectiveContract = this.#contracts.entries.find(
      (entry) =>
        entry.name === "project-objective" && entry.version === "1.0.0",
    );
    const rightsDecisionContract = this.#contracts.entries.find(
      (entry) => entry.name === "rights-decision" && entry.version === "1.0.0",
    );
    if (
      objectiveContract === undefined ||
      rightsDecisionContract === undefined
    ) {
      throw new ProjectDefinitionDraftError(
        "PROJECT_DEFINITION_DRAFT_RUNTIME_CORRUPT",
        "The authoritative Project objective contract is unavailable.",
      );
    }

    const definitionContent: PetraProjectDefinition["content"] = profile
      ?.content.definition ?? {
      label: "Outcome-led Project",
      description:
        "A domain-neutral Project definition that preserves the stated outcome and uses Petra's shared graph, evidence, Work, Review, and History capabilities.",
      kernel_compatibility: "petra.project-kernel@1.0.0",
      registrations: [
        {
          registration_kind: "objective_schema",
          semantic_key: "project.outcome",
          contract: {
            name: "petra.project-objective",
            version: objectiveContract.version,
            content_hash: objectiveContract.canonical_sha256,
          },
        },
        {
          registration_kind: "source_role",
          semantic_key: "project.reference",
          contract: {
            name: "petra.rights-decision",
            version: rightsDecisionContract.version,
            content_hash: rightsDecisionContract.canonical_sha256,
          },
        },
      ],
      terms: [
        {
          semantic_key: "project.outcome",
          singular: "Outcome",
          plural: "Outcomes",
          definition: "The exact result this Project is trying to produce.",
          generic_family: "focus",
        },
        {
          semantic_key: "project.result",
          singular: "Result",
          plural: "Results",
          definition:
            "A durable Project object produced while pursuing the outcome.",
          generic_family: "finding",
        },
        {
          semantic_key: "project.reference",
          singular: "Reference",
          plural: "References",
          definition:
            "A retained source or other exact basis available to the Project.",
          generic_family: "reference",
        },
        {
          semantic_key: "project.relationship",
          singular: "Relationship",
          plural: "Relationships",
          definition: "An explicit graph connection between Project objects.",
          generic_family: "relationship",
        },
      ],
      supported_places: [
        "brief",
        "sources",
        "review",
        "graph",
        "work",
        "petra",
        "composition",
        "history",
        "settings",
      ],
      omitted_flows: [
        "Domain-specific automation not selected",
        "External filesystem editing",
        "Multi-user collaboration",
      ],
    };
    const terms = new Map(
      definitionContent.terms.map((term) => [term.semantic_key, term]),
    );
    const profileRef =
      profile === undefined
        ? undefined
        : {
            profile_id: profile.profile_id,
            profile_version: profile.profile_version,
            content_hash: profile.content_hash,
          };
    const selectedCapabilities =
      profile === undefined
        ? definitionContent.registrations.map((registration) => ({
            capability_id: registration.semantic_key,
            label:
              terms.get(registration.semantic_key)?.singular ??
              registration.semantic_key,
            source: "petra_kernel" as const,
            reason:
              registration.registration_kind === "source_role"
                ? "The shared Petra rights boundary can register user-supplied references after explicit copy-specific review."
                : "The shared Petra kernel can hold the exact objective, durable results, graph relationships, evidence, Work, Review, and History without a domain template.",
          }))
        : definitionContent.registrations.map((registration) => ({
            capability_id: registration.semantic_key,
            label:
              terms.get(registration.semantic_key)?.singular ??
              registration.semantic_key,
            source: "registered_template" as const,
            reason: `Selected from the exact optional capability example ${profile.content.label}.`,
            profile_ref: profileRef!,
          }));
    const assumptions = [
      {
        code: "project.private",
        statement: "The new Project is private to its creating actor.",
        consequence:
          "Only the authenticated Project owner receives creation authority in this step.",
      },
      {
        code: "objective.exact-wording",
        statement:
          "The stated outcome becomes the first objective without rewriting.",
        consequence:
          "Petra preserves the user's wording as the authoritative starting objective.",
      },
      ...(profile === undefined
        ? [
            {
              code: "definition.domain-neutral",
              statement:
                "No registered domain example was selected with enough confidence.",
              consequence:
                "The Project starts with a domain-neutral definition; specific capabilities can be registered later.",
            },
          ]
        : [
            {
              code: "definition.example-seed",
              statement: `The exact ${profile.content.label} example seeds the Project-owned definition.`,
              consequence:
                "The Project receives an immutable copy and does not depend on later changes to the example.",
            },
          ]),
      ...((request.initial_material?.length ?? 0) === 0
        ? []
        : [
            {
              code: "material.register-after-create",
              statement:
                "Selected initial files are identified in this draft but their bytes are not part of the Project creation transaction.",
              consequence:
                "Each file must pass the existing source registration and rights flow immediately after Project creation.",
            },
          ]),
    ];
    const content: PetraProjectDefinitionDraftView["content"] = {
      request: clone(request),
      project: {
        name: request.project_name ?? proposedProjectName(request.outcome),
        description:
          "Outcome-first Project created from the user's exact stated objective.",
      },
      definition_family: profile?.definition_family ?? "petra.project-authored",
      definition_origin:
        profile === undefined
          ? { origin_kind: "project_authored" }
          : {
              origin_kind: "template_seed",
              template_id: profile.profile_id,
              template_version: profile.profile_version,
              template_hash: profile.content_hash,
            },
      definition_content: clone(definitionContent),
      objective: {
        objective_kind: profile?.content.objective_kind ?? "project.outcome",
        statement: request.outcome,
      },
      enabled_evidence_namespaces: clone(
        profile?.content.enabled_evidence_namespaces ?? ["personal"],
      ),
      selected_capabilities:
        selectedCapabilities as PetraProjectDefinitionDraftView["content"]["selected_capabilities"],
      assumptions:
        assumptions as PetraProjectDefinitionDraftView["content"]["assumptions"],
      unsupported_capabilities: definitionContent.omitted_flows.map(
        (capability) => ({
          capability,
          reason:
            "This capability is not registered by the proposed Project definition and will not be implied by the agent.",
        }),
      ),
      initial_material_plan: (request.initial_material ?? []).map(
        (material) => ({
          material_id: material.material_id,
          disposition: "register_after_project_creation" as const,
          reason:
            "The existing source authority must validate bytes, rights, and Project linkage after the Project exists.",
        }),
      ) as PetraProjectDefinitionDraftView["content"]["initial_material_plan"],
    };
    const contentHash = canonicalHash(content);
    const view: PetraProjectDefinitionDraftView = {
      schema_name: "petra.project-definition-draft-view",
      schema_version: "1.0.0",
      draft_id: derivePetraId("project_definition_draft", contentHash),
      content,
      content_hash: contentHash,
      read_at: readAt,
    };
    this.#contracts.assertValid("project-definition-draft-view", "1.0.0", view);
    return clone(view);
  }

  async #requireDraftPrincipal(client: PoolClient): Promise<void> {
    if (this.#principal === undefined) {
      throw new ProjectDefinitionDraftError(
        "PROJECT_DEFINITION_DRAFT_COMMAND_DENIED",
        "The server-authenticated Project creator is not configured.",
      );
    }
    const actor = await client.query(
      `SELECT 1 FROM petra.actors WHERE actor_id = $1 AND actor_kind = $2`,
      [this.#principal.actor_id, this.#principal.actor_kind],
    );
    if (actor.rowCount !== 1) {
      throw new ProjectDefinitionDraftError(
        "PROJECT_DEFINITION_DRAFT_COMMAND_DENIED",
        "The server-authenticated Project creator is not registered.",
      );
    }
  }

  #draftReceiptFrom(
    payload: unknown,
  ): PetraProjectDefinitionDraftCommandReceipt {
    this.#contracts.assertValid(
      "project-definition-draft-command-receipt",
      "1.0.0",
      payload,
    );
    return clone(payload as PetraProjectDefinitionDraftCommandReceipt);
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
    isolation: "READ COMMITTED" | "SERIALIZABLE" = "SERIALIZABLE",
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
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

  async #readTransaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
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
