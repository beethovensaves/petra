import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceReuseOptionsView,
  PetraRegisteredProjectProfile,
  PetraRightsDecision,
  PetraWork,
  PetraWorkVersion,
  ProjectSourceReuseCandidate,
  ProjectSourceReuseOptionRole,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectSourceReuseError,
  type ProjectSourceReuseOptionsReader,
  type ProjectSourceReusePrincipal,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface TargetRow {
  readonly project_payload: unknown;
  readonly project_record_hash: string;
  readonly definition_payload: unknown;
  readonly definition_record_hash: string | null;
}

interface PayloadRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface CandidateRow {
  readonly artifact_manifest_id: string;
  readonly already_linked: boolean;
  readonly source_payload: unknown;
  readonly source_record_hash: string;
  readonly source_actor_id: string;
  readonly source_actor_kind: string;
  readonly origin_project_payload: unknown;
  readonly origin_project_record_hash: string;
  readonly origin_definition_payload: unknown;
  readonly origin_definition_record_hash: string;
  readonly work_payload: unknown;
  readonly work_record_hash: string;
  readonly version_payload: unknown;
  readonly version_record_hash: string;
  readonly artifact_payload: unknown;
  readonly artifact_record_hash: string;
  readonly manifest_payload: unknown;
  readonly manifest_record_hash: string;
  readonly rights_payload: unknown;
  readonly rights_record_hash: string;
}

interface CandidateRecords {
  readonly source: PetraProjectSource;
  readonly originProject: PetraProject;
  readonly originDefinition: PetraProjectDefinition;
  readonly work: PetraWork;
  readonly version: PetraWorkVersion;
  readonly artifact: PetraArtifact;
  readonly manifest: PetraArtifactManifest;
  readonly rights: PetraRightsDecision;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

/**
 * Authenticated PostgreSQL selector for exact retained source copies. The read
 * holds the same source-reuse grant lock as the command and composes every
 * optimistic request ref from one repeatable snapshot.
 */
export class PostgresProjectSourceReuseOptionsReader implements ProjectSourceReuseOptionsReader {
  readonly #pool: Pool;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
  }

  async readProjectSourceReuseOptions(
    projectId: string,
    principal: ProjectSourceReusePrincipal,
  ): Promise<PetraProjectSourceReuseOptionsView> {
    return this.#readTransaction(async (client) => {
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "ReuseProjectSource",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectSourceReuseError(
          "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
          "The authenticated human and capability grant do not authorize source reuse in this Project.",
        );
      }

      const target = await this.#target(client, projectId);
      const project = this.#record<PetraProject>(
        "project",
        target.project_payload,
      );
      const definition = this.#record<PetraProjectDefinition>(
        "project-definition",
        target.definition_payload,
      );
      if (
        project.project_id !== projectId ||
        definition.project_id !== projectId ||
        canonicalHash(project) !== target.project_record_hash ||
        canonicalHash(definition) !== target.definition_record_hash ||
        canonicalHash(definition.content) !== definition.content_hash
      ) {
        throw this.#corrupt(
          "The current Project and ProjectDefinition do not form one exact selector target.",
        );
      }

      const profileResolution = await this.#profileResolution(
        client,
        definition,
      );
      const base = {
        schema_name: "petra.project-source-reuse-options-view" as const,
        schema_version: "1.0.0" as const,
        project_id: projectId,
        expected: {
          project_ref: {
            project_id: projectId,
            revision: project.revision,
            record_hash: target.project_record_hash,
          },
          project_definition_ref: {
            project_definition_id: definition.project_definition_id,
            revision: definition.revision,
            content_hash: definition.content_hash,
            record_hash: target.definition_record_hash,
          },
        },
        profile: {
          resolution: profileResolution,
          definition_family: definition.definition_family,
          label: definition.content.label,
          purpose: definition.content.description,
        },
      };

      if (profileResolution === "unsupported") {
        return this.#validated({
          ...base,
          source_roles: [],
          availability: {
            state: "unsupported",
            reason: "profile_unsupported",
            message:
              "This Project's exact profile binding is unavailable or mismatched. Petra will not substitute source roles or reuse semantics.",
          },
          counts: { permitted: 0, already_linked: 0 },
          candidates: [],
        });
      }

      const sourceRoles = this.#sourceRoles(definition);
      if (sourceRoles === undefined) {
        return this.#validated({
          ...base,
          source_roles: [],
          availability: {
            state: "unsupported",
            reason: "source_roles_unavailable",
            message:
              "This exact ProjectDefinition does not provide one human-readable, rights-bound source role for reuse.",
          },
          counts: { permitted: 0, already_linked: 0 },
          candidates: [],
        });
      }

      const rows = await this.#candidateRows(client, projectId, principal);
      const candidates = new Map<string, ProjectSourceReuseCandidate>();
      const alreadyLinked = new Set<string>();
      for (const row of rows) {
        const candidate = await this.#candidate(client, row, principal);
        if (candidate === undefined) continue;
        if (row.already_linked) {
          alreadyLinked.add(row.artifact_manifest_id);
        } else if (!candidates.has(row.artifact_manifest_id)) {
          candidates.set(row.artifact_manifest_id, candidate);
        }
      }
      const values = [...candidates.values()];
      const availability: PetraProjectSourceReuseOptionsView["availability"] =
        values.length > 0
          ? {
              state: "available",
              reason: "permitted_sources_found",
              message:
                "Choose an existing retained copy and a registered source role. Petra will recheck every exact reference before linking it.",
            }
          : alreadyLinked.size > 0
            ? {
                state: "empty",
                reason: "all_permitted_sources_already_linked",
                message:
                  "Every retained copy you may reuse is already linked to this Project.",
              }
            : {
                state: "empty",
                reason: "no_permitted_sources",
                message:
                  "No retained, storage-permitted source copy owned by the current human is available to reuse.",
              };

      return this.#validated({
        ...base,
        source_roles: sourceRoles,
        availability,
        counts: {
          permitted: values.length,
          already_linked: alreadyLinked.size,
        },
        candidates: values,
      });
    });
  }

  async #target(client: PoolClient, projectId: string): Promise<TargetRow> {
    const result = await client.query<TargetRow>(
      `SELECT project_revision.payload AS project_payload,
              project_revision.record_hash AS project_record_hash,
              definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash
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
        WHERE project.project_id = $1
        FOR SHARE OF project, project_revision`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_PROJECT_NOT_FOUND",
        "The Project is not retained.",
      );
    }
    if (
      row.definition_payload === null ||
      row.definition_record_hash === null
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_DEFINITION_STALE",
        "The Project has no retained current ProjectDefinition.",
      );
    }
    return row;
  }

  async #profileResolution(
    client: PoolClient,
    definition: PetraProjectDefinition,
  ): Promise<"registered" | "project_authored" | "unsupported"> {
    if (definition.origin.origin_kind === "project_authored") {
      return "project_authored";
    }
    const result = await client.query<PayloadRow>(
      `SELECT payload, record_hash
         FROM petra.registered_project_profiles
        WHERE profile_id = $1
          AND profile_version = $2
          AND content_hash = $3
          AND status = 'active'`,
      [
        definition.origin.template_id,
        definition.origin.template_version,
        definition.origin.template_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) return "unsupported";
    const profile = this.#record<PetraRegisteredProjectProfile>(
      "registered-project-profile",
      row.payload,
    );
    if (
      canonicalHash(profile) !== row.record_hash ||
      canonicalHash(profile.content) !== profile.content_hash
    ) {
      throw this.#corrupt(
        "The registered profile retained for source reuse failed exact hash validation.",
      );
    }
    return profile.definition_family === definition.definition_family &&
      canonicalHash(profile.content.definition) === definition.content_hash
      ? "registered"
      : "unsupported";
  }

  #sourceRoles(
    definition: PetraProjectDefinition,
  ): ProjectSourceReuseOptionRole[] | undefined {
    if (!definition.content.supported_places.includes("sources")) {
      return undefined;
    }
    const registrations = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.contract.name === "petra.rights-decision" &&
        registration.contract.version === "1.0.0",
    );
    if (registrations.length === 0) return undefined;
    const roles: ProjectSourceReuseOptionRole[] = [];
    const seen = new Set<string>();
    for (const registration of registrations) {
      if (seen.has(registration.semantic_key)) return undefined;
      seen.add(registration.semantic_key);
      const terms = definition.content.terms.filter(
        (term) => term.semantic_key === registration.semantic_key,
      );
      if (terms.length !== 1 || terms[0] === undefined) return undefined;
      roles.push({
        semantic_key: registration.semantic_key,
        label: terms[0].singular,
        meaning: terms[0].definition,
      });
    }
    return roles;
  }

  async #candidateRows(
    client: PoolClient,
    projectId: string,
    principal: ProjectSourceReusePrincipal,
  ): Promise<CandidateRow[]> {
    const result = await client.query<CandidateRow>(
      `SELECT source.artifact_manifest_id,
              (target_source.project_source_id IS NOT NULL) AS already_linked,
              source_revision.payload AS source_payload,
              source_revision.record_hash AS source_record_hash,
              source_revision.added_by_actor_id AS source_actor_id,
              source_revision.added_by_actor_kind AS source_actor_kind,
              origin_project_revision.payload AS origin_project_payload,
              origin_project_revision.record_hash AS origin_project_record_hash,
              origin_definition.payload AS origin_definition_payload,
              origin_definition.record_hash AS origin_definition_record_hash,
              work.payload AS work_payload,
              work.record_hash AS work_record_hash,
              version.payload AS version_payload,
              version.record_hash AS version_record_hash,
              artifact.payload AS artifact_payload,
              artifact.record_hash AS artifact_record_hash,
              manifest.payload AS manifest_payload,
              manifest.record_hash AS manifest_record_hash,
              rights.payload AS rights_payload,
              rights.record_hash AS rights_record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS source_revision
           ON source_revision.project_source_id = source.project_source_id
          AND source_revision.revision = source.current_revision
         JOIN petra.projects AS origin_project
           ON origin_project.project_id = source.project_id
         JOIN petra.project_revisions AS origin_project_revision
           ON origin_project_revision.project_id = origin_project.project_id
          AND origin_project_revision.revision = origin_project.current_revision
         JOIN petra.project_definition_revisions AS origin_definition
           ON origin_definition.project_id = source_revision.project_id
          AND origin_definition.project_definition_id =
                source_revision.project_definition_id
          AND origin_definition.revision =
                source_revision.project_definition_revision
          AND origin_definition.content_hash =
                source_revision.project_definition_content_hash
         JOIN petra.canonical_entity_revisions AS work
           ON work.entity_id = source_revision.work_id
          AND work.entity_kind = 'work'
          AND work.revision = source_revision.work_revision
          AND work.record_hash = source_revision.work_record_hash
         JOIN petra.canonical_entity_revisions AS version
           ON version.entity_id = source_revision.work_version_id
          AND version.entity_kind = 'work_version'
          AND version.revision = source_revision.work_version_revision
          AND version.record_hash = source_revision.work_version_record_hash
         JOIN petra.artifact_manifests AS manifest
           ON manifest.artifact_manifest_id = source.artifact_manifest_id
          AND manifest.revision = source_revision.artifact_manifest_revision
          AND manifest.record_hash = source_revision.artifact_manifest_record_hash
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
         LEFT JOIN petra.project_sources AS target_source
           ON target_source.project_id = $1
          AND target_source.artifact_manifest_id = source.artifact_manifest_id
        WHERE source_revision.added_by_actor_id = $2
          AND source_revision.added_by_actor_kind = $3
        ORDER BY source.artifact_manifest_id,
                 CASE source_revision.status WHEN 'active' THEN 0 ELSE 1 END,
                 lower(origin_project_revision.name),
                 source.project_id,
                 source.project_source_id`,
      [projectId, principal.actor.actor_id, principal.actor.actor_kind],
    );
    return result.rows;
  }

  async #candidate(
    client: PoolClient,
    row: CandidateRow,
    principal: ProjectSourceReusePrincipal,
  ): Promise<ProjectSourceReuseCandidate | undefined> {
    const records: CandidateRecords = {
      source: this.#record("project-source", row.source_payload),
      originProject: this.#record("project", row.origin_project_payload),
      originDefinition: this.#record(
        "project-definition",
        row.origin_definition_payload,
      ),
      work: this.#record("work", row.work_payload),
      version: this.#record("work-version", row.version_payload),
      artifact: this.#record("artifact", row.artifact_payload),
      manifest: this.#record("artifact-manifest", row.manifest_payload),
      rights: this.#record("rights-decision", row.rights_payload),
    };
    const { source, originProject, originDefinition, work, version } = records;
    const { artifact, manifest, rights } = records;
    if (
      canonicalHash(source) !== row.source_record_hash ||
      canonicalHash(source.content) !== source.content_hash ||
      canonicalHash(originProject) !== row.origin_project_record_hash ||
      canonicalHash(originDefinition) !== row.origin_definition_record_hash ||
      canonicalHash(originDefinition.content) !==
        originDefinition.content_hash ||
      canonicalHash(work) !== row.work_record_hash ||
      canonicalHash(version) !== row.version_record_hash ||
      canonicalHash(artifact) !== row.artifact_record_hash ||
      canonicalHash(manifest) !== row.manifest_record_hash ||
      canonicalHash(rights) !== row.rights_record_hash ||
      source.project_id !== originProject.project_id ||
      source.content.project_definition_ref.project_definition_id !==
        originDefinition.project_definition_id ||
      source.content.project_definition_ref.revision !==
        originDefinition.revision ||
      source.content.project_definition_ref.content_hash !==
        originDefinition.content_hash ||
      source.content.work_ref.work_id !== work.work_id ||
      source.content.work_ref.revision !== work.revision ||
      source.content.work_ref.record_hash !== row.work_record_hash ||
      source.content.work_version_ref.work_version_id !==
        version.work_version_id ||
      source.content.work_version_ref.revision !== version.revision ||
      source.content.work_version_ref.record_hash !== row.version_record_hash ||
      version.work_id !== work.work_id ||
      source.content.artifact_manifest_ref.artifact_manifest_id !==
        manifest.artifact_manifest_id ||
      source.content.artifact_manifest_ref.revision !== manifest.revision ||
      source.content.artifact_manifest_ref.record_hash !==
        row.manifest_record_hash ||
      row.artifact_manifest_id !== manifest.artifact_manifest_id ||
      manifest.artifact_id !== artifact.artifact_id ||
      manifest.storage_ref.content_hash !== artifact.content_hash ||
      manifest.rights_decision_id !== rights.rights_decision_id ||
      rights.artifact_manifest_id !== manifest.artifact_manifest_id ||
      (manifest.origin as { readonly work_version_id?: string })
        .work_version_id !== version.work_version_id ||
      source.added_by.actor_id !== row.source_actor_id ||
      source.added_by.actor_kind !== row.source_actor_kind ||
      !sameActor(source.added_by, principal.actor)
    ) {
      throw this.#corrupt(
        "A retained source candidate crossed its current ProjectSource, identity, copy, or ownership boundary.",
      );
    }
    if (
      !rights.permissions.store_raw_bytes ||
      manifest.storage_ref.availability !== "available"
    ) {
      return undefined;
    }

    const sourceRole = this.#originSourceRole(originDefinition, source);
    const contributors = await this.#contributors(client, source);
    return {
      display: {
        title: work.title,
        contributors,
        version_label: version.version_label,
        publication_status: version.publication_status,
        ...(version.published_date === undefined
          ? {}
          : { published_date: clone(version.published_date) }),
        origin_project_name: originProject.name,
        origin_source_role: sourceRole,
        origin_membership_status: source.content.status,
        copy_status: "available_for_reuse",
      },
      existing_source: {
        origin_project_source_ref: {
          project_id: source.project_id,
          project_source_id: source.project_source_id,
          revision: source.revision,
          content_hash: source.content_hash,
          record_hash: row.source_record_hash,
          status: source.content.status,
        },
        work_ref: clone(source.content.work_ref),
        work_version_ref: clone(source.content.work_version_ref),
        artifact_ref: {
          artifact_id: artifact.artifact_id,
          revision: artifact.revision,
          content_hash: artifact.content_hash,
          record_hash: row.artifact_record_hash,
        },
        artifact_manifest_ref: clone(source.content.artifact_manifest_ref),
        rights_decision_ref: {
          record_id: rights.rights_decision_id,
          revision: rights.revision,
          record_hash: row.rights_record_hash,
        },
      },
    };
  }

  #originSourceRole(
    definition: PetraProjectDefinition,
    source: PetraProjectSource,
  ): ProjectSourceReuseOptionRole {
    const registrations = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.semantic_key === source.content.source_role &&
        registration.contract.name === "petra.rights-decision" &&
        registration.contract.version === "1.0.0",
    );
    const terms = definition.content.terms.filter(
      (term) => term.semantic_key === source.content.source_role,
    );
    if (
      registrations.length !== 1 ||
      terms.length !== 1 ||
      terms[0] === undefined
    ) {
      throw this.#corrupt(
        "A reusable ProjectSource does not resolve to one human-readable registered source role.",
      );
    }
    return {
      semantic_key: source.content.source_role,
      label: terms[0].singular,
      meaning: terms[0].definition,
    };
  }

  async #contributors(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<[string, ...string[]]> {
    const result = await client.query<PayloadRow>(
      `SELECT author.payload, author.record_hash
         FROM petra.project_source_author_refs AS ref
         JOIN petra.canonical_entity_revisions AS author
           ON author.entity_id = ref.author_id
          AND author.entity_kind = 'author'
          AND author.revision = ref.author_revision
          AND author.record_hash = ref.author_record_hash
        WHERE ref.project_source_id = $1
          AND ref.project_source_revision = $2
        ORDER BY ref.position`,
      [source.project_source_id, source.revision],
    );
    if (result.rows.length !== source.content.author_refs.length) {
      throw this.#corrupt(
        "A reusable ProjectSource has an incomplete author binding.",
      );
    }
    const contributors = result.rows.map((row, index) => {
      const author = this.#record<PetraAuthor>("author", row.payload);
      const expected = source.content.author_refs[index];
      if (
        expected === undefined ||
        author.author_id !== expected.author_id ||
        author.revision !== expected.revision ||
        row.record_hash !== expected.record_hash ||
        canonicalHash(author) !== expected.record_hash
      ) {
        throw this.#corrupt(
          "A reusable ProjectSource author crossed its exact identity binding.",
        );
      }
      return author.display_name;
    });
    if (contributors[0] === undefined) {
      throw this.#corrupt(
        "A reusable ProjectSource has no human-readable contributor.",
      );
    }
    return contributors as [string, ...string[]];
  }

  #record<Value>(name: string, payload: unknown): Value {
    this.#contracts.assertValid(name, "1.0.0", payload);
    return clone(payload as Value);
  }

  #validated(
    view: PetraProjectSourceReuseOptionsView,
  ): PetraProjectSourceReuseOptionsView {
    this.#contracts.assertValid(
      "project-source-reuse-options-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  #corrupt(message: string): ProjectSourceReuseError {
    return new ProjectSourceReuseError(
      "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT",
      message,
    );
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
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
