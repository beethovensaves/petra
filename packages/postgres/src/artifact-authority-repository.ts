import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraArtifact,
  PetraArtifactManifest,
  PetraRightsDecision,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ArtifactAuthorityRepository,
  ArtifactStore,
  AttachArtifactManifestInput,
  PersistVerifiedArtifactInput,
  RegisteredArtifact,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresArtifactAuthorityErrorCode =
  | "ARTIFACT_ID_CONFLICT"
  | "ARTIFACT_CONTENT_CONFLICT"
  | "ARTIFACT_NOT_REGISTERED"
  | "ARTIFACT_MANIFEST_ID_CONFLICT"
  | "RIGHTS_DECISION_ID_CONFLICT"
  | "ARTIFACT_RELATION_INVALID"
  | "ARTIFACT_REFERENCE_MISSING"
  | "ARTIFACT_OBJECT_UNAVAILABLE"
  | "ARTIFACT_OBJECT_MISMATCH";

export class PostgresArtifactAuthorityError extends Error {
  readonly code: PostgresArtifactAuthorityErrorCode;

  constructor(code: PostgresArtifactAuthorityErrorCode, message: string) {
    super(message);
    this.name = "PostgresArtifactAuthorityError";
    this.code = code;
  }
}

interface StoredRecordRow {
  record_hash: string;
  payload: unknown;
}

interface ArtifactIdRow {
  artifact_id: string;
}

interface AcquisitionPayloadRow {
  artifact_payload: unknown;
  manifest_payload: unknown;
  rights_payload: unknown;
}

interface OriginColumns {
  workVersionId: string | null;
  workVersionKind: "work_version" | null;
  actorId: string | null;
  actorKind: ActorRef["actor_kind"] | null;
  sourceConnector: string | null;
  connectorVersion: string | null;
  sourceLocation: string | null;
  originalFilename: string | null;
  generatorName: string | null;
  generatorVersion: string | null;
  originAt: string;
  inputArtifactIds: readonly string[];
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const originColumns = (manifest: PetraArtifactManifest): OriginColumns => {
  switch (manifest.origin.origin_kind) {
    case "acquired":
      return {
        workVersionId: manifest.origin.work_version_id,
        workVersionKind: "work_version",
        actorId: null,
        actorKind: null,
        sourceConnector: manifest.origin.source_connector,
        connectorVersion: manifest.origin.connector_version,
        sourceLocation: manifest.origin.retrieval_url,
        originalFilename: null,
        generatorName: null,
        generatorVersion: null,
        originAt: manifest.origin.retrieved_at,
        inputArtifactIds: [],
      };
    case "user_supplied":
      return {
        workVersionId: manifest.origin.work_version_id ?? null,
        workVersionKind:
          manifest.origin.work_version_id === undefined ? null : "work_version",
        actorId: manifest.origin.supplied_by.actor_id,
        actorKind: manifest.origin.supplied_by.actor_kind,
        sourceConnector: null,
        connectorVersion: null,
        sourceLocation: null,
        originalFilename: manifest.origin.original_filename,
        generatorName: null,
        generatorVersion: null,
        originAt: manifest.origin.supplied_at,
        inputArtifactIds: [],
      };
    case "generated":
      return {
        workVersionId: null,
        workVersionKind: null,
        actorId: null,
        actorKind: null,
        sourceConnector: null,
        connectorVersion: null,
        sourceLocation: null,
        originalFilename: null,
        generatorName: manifest.origin.generator_name,
        generatorVersion: manifest.origin.generator_version,
        originAt: manifest.origin.generated_at,
        inputArtifactIds: manifest.origin.input_artifact_ids,
      };
  }
};

const registrationCopy = (
  artifact: PetraArtifact,
  manifest: PetraArtifactManifest,
  rightsDecision: PetraRightsDecision,
): RegisteredArtifact => clone({ artifact, manifest, rightsDecision });

export class PostgresArtifactAuthorityRepository implements ArtifactAuthorityRepository {
  readonly #pool: Pool;
  readonly #artifactStore: Pick<ArtifactStore, "inspectByHash">;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    artifactStore: Pick<ArtifactStore, "inspectByHash">,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#artifactStore = artifactStore;
    this.#contracts = contracts;
  }

  async registerVerifiedAcquisition(
    input: PersistVerifiedArtifactInput,
  ): Promise<RegisteredArtifact> {
    const { artifact, manifest, rightsDecision } = input;
    this.#validateContracts(artifact, manifest, rightsDecision);
    this.#validateRelations(artifact, manifest, rightsDecision);
    await this.#verifyAvailableArtifact(artifact, manifest);

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await this.#lock(
        client,
        artifact.artifact_id,
        artifact.content_hash,
        manifest.artifact_manifest_id,
        rightsDecision.rights_decision_id,
      );
      await this.#requireRegistrationReferences(
        client,
        artifact,
        manifest,
        rightsDecision,
      );

      const artifactRow = await this.#getStoredRecord(
        client,
        "artifacts",
        "artifact_id",
        artifact.artifact_id,
      );
      if (artifactRow !== undefined) {
        if (artifactRow.record_hash !== recordHash(artifact)) {
          throw new PostgresArtifactAuthorityError(
            "ARTIFACT_ID_CONFLICT",
            "The Artifact ID is already bound to different canonical content.",
          );
        }
        const replay = await this.#resolveAcquisitionReplay(
          client,
          artifact,
          manifest,
          rightsDecision,
        );
        if (replay === undefined) {
          throw new PostgresArtifactAuthorityError(
            "ARTIFACT_ID_CONFLICT",
            "The Artifact is already registered; attach a distinct verified manifest instead of registering its byte identity again.",
          );
        }
        await client.query("COMMIT");
        return replay;
      }

      const contentOwner = await client.query<ArtifactIdRow>(
        "SELECT artifact_id FROM petra.artifacts WHERE content_hash = $1",
        [artifact.content_hash],
      );
      if (contentOwner.rows[0] !== undefined) {
        throw new PostgresArtifactAuthorityError(
          "ARTIFACT_CONTENT_CONFLICT",
          `The exact bytes are already registered as ${contentOwner.rows[0].artifact_id}.`,
        );
      }
      await this.#requireUnusedAcquisitionIds(
        client,
        manifest.artifact_manifest_id,
        rightsDecision.rights_decision_id,
      );

      await this.#insertArtifact(client, artifact);
      await this.#insertManifestAndRights(client, manifest, rightsDecision);
      await client.query("COMMIT");
      return registrationCopy(artifact, manifest, rightsDecision);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async attachVerifiedManifest(
    input: AttachArtifactManifestInput,
  ): Promise<RegisteredArtifact> {
    const { artifactId, manifest, rightsDecision } = input;
    this.#contracts.assertValid("artifact-manifest", "1.0.0", manifest);
    this.#contracts.assertValid("rights-decision", "1.0.0", rightsDecision);

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await this.#lock(
        client,
        artifactId,
        manifest.artifact_manifest_id,
        rightsDecision.rights_decision_id,
      );
      const artifactRow = await this.#getStoredRecord(
        client,
        "artifacts",
        "artifact_id",
        artifactId,
      );
      if (artifactRow === undefined) {
        throw new PostgresArtifactAuthorityError(
          "ARTIFACT_NOT_REGISTERED",
          "An Artifact must be registered before another acquisition manifest can be attached.",
        );
      }
      const artifact = artifactRow.payload as PetraArtifact;
      this.#contracts.assertValid("artifact", "1.0.0", artifact);
      this.#validateRelations(artifact, manifest, rightsDecision);
      await this.#verifyAvailableArtifact(artifact, manifest);
      await this.#requireManifestReferences(client, manifest, rightsDecision);

      const replay = await this.#resolveAcquisitionReplay(
        client,
        artifact,
        manifest,
        rightsDecision,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireUnusedAcquisitionIds(
        client,
        manifest.artifact_manifest_id,
        rightsDecision.rights_decision_id,
      );
      await this.#insertManifestAndRights(client, manifest, rightsDecision);
      await client.query("COMMIT");
      return registrationCopy(artifact, manifest, rightsDecision);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getArtifact(artifactId: string): Promise<PetraArtifact | undefined> {
    const result = await this.#pool.query<{ payload: unknown }>(
      "SELECT payload FROM petra.artifacts WHERE artifact_id = $1",
      [artifactId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("artifact", "1.0.0", payload);
    return clone(payload as PetraArtifact);
  }

  async getByManifestId(
    manifestId: string,
  ): Promise<RegisteredArtifact | undefined> {
    const result = await this.#pool.query<AcquisitionPayloadRow>(
      `SELECT artifact.payload AS artifact_payload,
              manifest.payload AS manifest_payload,
              rights.payload AS rights_payload
         FROM petra.artifact_manifests AS manifest
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE manifest.artifact_manifest_id = $1`,
      [manifestId],
    );
    return this.#payloadRowToRegistration(result.rows[0]);
  }

  async getRightsDecision(
    rightsDecisionId: string,
  ): Promise<PetraRightsDecision | undefined> {
    const result = await this.#pool.query<{ payload: unknown }>(
      "SELECT payload FROM petra.rights_decisions WHERE rights_decision_id = $1",
      [rightsDecisionId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("rights-decision", "1.0.0", payload);
    return clone(payload as PetraRightsDecision);
  }

  async getAcquisitionsForArtifact(
    artifactId: string,
  ): Promise<readonly RegisteredArtifact[]> {
    const result = await this.#pool.query<AcquisitionPayloadRow>(
      `SELECT artifact.payload AS artifact_payload,
              manifest.payload AS manifest_payload,
              rights.payload AS rights_payload
         FROM petra.artifact_manifests AS manifest
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE manifest.artifact_id = $1
        ORDER BY manifest.recorded_at, manifest.artifact_manifest_id`,
      [artifactId],
    );
    return result.rows.map((row) => {
      const registration = this.#payloadRowToRegistration(row);
      if (registration === undefined) {
        throw new PostgresArtifactAuthorityError(
          "ARTIFACT_RELATION_INVALID",
          "A persisted acquisition is missing its Artifact, manifest, or rights payload.",
        );
      }
      return registration;
    });
  }

  #validateContracts(
    artifact: PetraArtifact,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): void {
    this.#contracts.assertValid("artifact", "1.0.0", artifact);
    this.#contracts.assertValid("artifact-manifest", "1.0.0", manifest);
    this.#contracts.assertValid("rights-decision", "1.0.0", rightsDecision);
  }

  #validateRelations(
    artifact: PetraArtifact,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): void {
    if (
      manifest.artifact_id !== artifact.artifact_id ||
      manifest.storage_ref.content_hash !== artifact.content_hash
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_RELATION_INVALID",
        "The manifest must identify the exact Artifact and content hash.",
      );
    }
    if (
      manifest.rights_decision_id !== rightsDecision.rights_decision_id ||
      rightsDecision.artifact_manifest_id !== manifest.artifact_manifest_id
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_RELATION_INVALID",
        "The ArtifactManifest and RightsDecision must link to each other exactly.",
      );
    }
    if (
      manifest.origin.origin_kind === "acquired" &&
      manifest.origin.retrieval_url !== rightsDecision.source_location
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_RELATION_INVALID",
        "The RightsDecision must describe the exact acquired source copy.",
      );
    }
    if (!rightsDecision.permissions.store_raw_bytes) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_RELATION_INVALID",
        "An available stored Artifact requires explicit raw-byte storage permission.",
      );
    }
  }

  async #verifyAvailableArtifact(
    artifact: PetraArtifact,
    manifest: PetraArtifactManifest,
  ): Promise<void> {
    const available = await this.#artifactStore.inspectByHash(
      artifact.content_hash,
      {
        byteSize: artifact.byte_size,
        mediaType: artifact.media_type,
      },
    );
    if (available === undefined) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_OBJECT_UNAVAILABLE",
        "Artifact authority cannot be registered before its exact bytes are durably available.",
      );
    }
    if (
      available.storeName !== manifest.storage_ref.store_name ||
      available.objectKey !== manifest.storage_ref.object_key ||
      available.contentHash !== manifest.storage_ref.content_hash ||
      available.byteSize !== artifact.byte_size ||
      available.mediaType !== artifact.media_type
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_OBJECT_MISMATCH",
        "The available object does not reproduce the ArtifactManifest storage identity.",
      );
    }
    if (
      available.verification.status === "verified_with_warnings" &&
      manifest.integrity.status !== "verified_with_warnings"
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_OBJECT_MISMATCH",
        "ArtifactManifest integrity cannot omit warnings retained by object verification.",
      );
    }
  }

  async #lock(client: PoolClient, ...keys: string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #requireRegistrationReferences(
    client: PoolClient,
    artifact: PetraArtifact,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): Promise<void> {
    await this.#requireActor(client, artifact.created_by);
    await this.#requireManifestReferences(client, manifest, rightsDecision);
  }

  async #requireManifestReferences(
    client: PoolClient,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): Promise<void> {
    await this.#requireActor(client, manifest.recorded_by);
    await this.#requireActor(client, rightsDecision.decision_maker);
    const origin = originColumns(manifest);
    if (origin.actorId !== null && origin.actorKind !== null) {
      await this.#requireActor(client, {
        actor_id: origin.actorId,
        actor_kind: origin.actorKind,
      });
    }
    if (origin.workVersionId !== null) {
      const workVersion = await client.query(
        `SELECT 1
           FROM petra.canonical_entities
          WHERE entity_id = $1 AND entity_kind = 'work_version'`,
        [origin.workVersionId],
      );
      if (workVersion.rowCount !== 1) {
        throw new PostgresArtifactAuthorityError(
          "ARTIFACT_REFERENCE_MISSING",
          "The Artifact origin WorkVersion is not registered.",
        );
      }
    }
    for (const inputArtifactId of origin.inputArtifactIds) {
      const inputArtifact = await client.query(
        "SELECT 1 FROM petra.artifacts WHERE artifact_id = $1",
        [inputArtifactId],
      );
      if (inputArtifact.rowCount !== 1) {
        throw new PostgresArtifactAuthorityError(
          "ARTIFACT_REFERENCE_MISSING",
          "A generated Artifact input is not registered.",
        );
      }
    }
  }

  async #requireActor(client: PoolClient, actor: ActorRef): Promise<void> {
    const result = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== actor.actor_kind) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_REFERENCE_MISSING",
        "The Artifact record must resolve to the exact registered Actor kind.",
      );
    }
  }

  async #getStoredRecord(
    client: PoolClient,
    table: "artifacts" | "artifact_manifests" | "rights_decisions",
    idColumn: "artifact_id" | "artifact_manifest_id" | "rights_decision_id",
    id: string,
  ): Promise<StoredRecordRow | undefined> {
    const result = await client.query<StoredRecordRow>(
      `SELECT record_hash, payload FROM petra.${table} WHERE ${idColumn} = $1`,
      [id],
    );
    return result.rows[0];
  }

  async #requireUnusedAcquisitionIds(
    client: PoolClient,
    manifestId: string,
    rightsDecisionId: string,
  ): Promise<void> {
    const manifest = await this.#getStoredRecord(
      client,
      "artifact_manifests",
      "artifact_manifest_id",
      manifestId,
    );
    if (manifest !== undefined) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_MANIFEST_ID_CONFLICT",
        "The ArtifactManifest ID is already registered.",
      );
    }
    const rights = await this.#getStoredRecord(
      client,
      "rights_decisions",
      "rights_decision_id",
      rightsDecisionId,
    );
    if (rights !== undefined) {
      throw new PostgresArtifactAuthorityError(
        "RIGHTS_DECISION_ID_CONFLICT",
        "The RightsDecision ID is already registered.",
      );
    }
  }

  async #resolveAcquisitionReplay(
    client: PoolClient,
    artifact: PetraArtifact,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): Promise<RegisteredArtifact | undefined> {
    const manifestRow = await this.#getStoredRecord(
      client,
      "artifact_manifests",
      "artifact_manifest_id",
      manifest.artifact_manifest_id,
    );
    const rightsRow = await this.#getStoredRecord(
      client,
      "rights_decisions",
      "rights_decision_id",
      rightsDecision.rights_decision_id,
    );
    if (manifestRow === undefined && rightsRow === undefined) return undefined;
    if (
      manifestRow === undefined ||
      manifestRow.record_hash !== recordHash(manifest)
    ) {
      throw new PostgresArtifactAuthorityError(
        "ARTIFACT_MANIFEST_ID_CONFLICT",
        "The ArtifactManifest ID is already bound to different canonical content.",
      );
    }
    if (
      rightsRow === undefined ||
      rightsRow.record_hash !== recordHash(rightsDecision)
    ) {
      throw new PostgresArtifactAuthorityError(
        "RIGHTS_DECISION_ID_CONFLICT",
        "The RightsDecision ID is already bound to different canonical content.",
      );
    }
    return registrationCopy(artifact, manifest, rightsDecision);
  }

  async #insertArtifact(
    client: PoolClient,
    artifact: PetraArtifact,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.artifacts (
         artifact_id, revision, artifact_kind, media_type, content_hash,
         byte_size, created_by_actor_id, created_by_actor_kind, schema_name,
         schema_version, record_hash, payload, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb,
         $13::timestamptz
       )`,
      [
        artifact.artifact_id,
        artifact.revision,
        artifact.artifact_kind,
        artifact.media_type,
        artifact.content_hash,
        artifact.byte_size,
        artifact.created_by.actor_id,
        artifact.created_by.actor_kind,
        artifact.schema_name,
        artifact.schema_version,
        recordHash(artifact),
        JSON.stringify(artifact),
        artifact.created_at,
      ],
    );
  }

  async #insertManifestAndRights(
    client: PoolClient,
    manifest: PetraArtifactManifest,
    rightsDecision: PetraRightsDecision,
  ): Promise<void> {
    const origin = originColumns(manifest);
    await client.query(
      `INSERT INTO petra.artifact_manifests (
         artifact_manifest_id, revision, artifact_id, rights_decision_id,
         origin_kind, origin_work_version_id, origin_work_version_kind,
         origin_actor_id, origin_actor_kind, origin_source_connector,
         origin_connector_version, origin_source_location,
         origin_original_filename, origin_generator_name,
         origin_generator_version, origin_at, storage_kind, store_name,
         object_key, storage_content_hash, availability, storage_verified_at,
         integrity_status, integrity_checked_at, recorded_by_actor_id,
         recorded_by_actor_kind, schema_name, schema_version, record_hash,
         payload, recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16::timestamptz, $17, $18, $19, $20, $21,
         $22::timestamptz, $23, $24::timestamptz, $25, $26, $27, $28,
         $29, $30::jsonb, $31::timestamptz
       )`,
      [
        manifest.artifact_manifest_id,
        manifest.revision,
        manifest.artifact_id,
        manifest.rights_decision_id,
        manifest.origin.origin_kind,
        origin.workVersionId,
        origin.workVersionKind,
        origin.actorId,
        origin.actorKind,
        origin.sourceConnector,
        origin.connectorVersion,
        origin.sourceLocation,
        origin.originalFilename,
        origin.generatorName,
        origin.generatorVersion,
        origin.originAt,
        manifest.storage_ref.storage_kind,
        manifest.storage_ref.store_name,
        manifest.storage_ref.object_key,
        manifest.storage_ref.content_hash,
        manifest.storage_ref.availability,
        manifest.storage_ref.verified_at,
        manifest.integrity.status,
        manifest.integrity.checked_at,
        manifest.recorded_by.actor_id,
        manifest.recorded_by.actor_kind,
        manifest.schema_name,
        manifest.schema_version,
        recordHash(manifest),
        JSON.stringify(manifest),
        manifest.recorded_at,
      ],
    );
    for (const [index, inputArtifactId] of origin.inputArtifactIds.entries()) {
      await client.query(
        `INSERT INTO petra.artifact_manifest_inputs (
           artifact_manifest_id, position, input_artifact_id
         ) VALUES ($1, $2, $3)`,
        [manifest.artifact_manifest_id, index + 1, inputArtifactId],
      );
    }
    await client.query(
      `INSERT INTO petra.rights_decisions (
         rights_decision_id, revision, artifact_manifest_id, source_location,
         license_status, access_basis, decision_status, store_raw_bytes,
         parse_permitted, index_permitted, embed_permitted,
         remote_selected_text_permitted, quote_publicly_permitted,
         redistribute_artifact_permitted, conditions, required_notices,
         decision_maker_actor_id, decision_maker_actor_kind, observed_at,
         policy_version, schema_name, schema_version, record_hash, payload,
         created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15::text[], $16::text[], $17, $18, $19::timestamptz, $20, $21,
         $22, $23, $24::jsonb, $25::timestamptz
       )`,
      [
        rightsDecision.rights_decision_id,
        rightsDecision.revision,
        rightsDecision.artifact_manifest_id,
        rightsDecision.source_location,
        rightsDecision.license_status,
        rightsDecision.access_basis,
        rightsDecision.decision_status,
        rightsDecision.permissions.store_raw_bytes,
        rightsDecision.permissions.parse,
        rightsDecision.permissions.index,
        rightsDecision.permissions.embed,
        rightsDecision.permissions.send_selected_text_remotely,
        rightsDecision.permissions.quote_publicly,
        rightsDecision.permissions.redistribute_artifact,
        rightsDecision.conditions,
        rightsDecision.required_notices,
        rightsDecision.decision_maker.actor_id,
        rightsDecision.decision_maker.actor_kind,
        rightsDecision.observed_at,
        rightsDecision.policy_version,
        rightsDecision.schema_name,
        rightsDecision.schema_version,
        recordHash(rightsDecision),
        JSON.stringify(rightsDecision),
        rightsDecision.created_at,
      ],
    );
  }

  #payloadRowToRegistration(
    row: AcquisitionPayloadRow | undefined,
  ): RegisteredArtifact | undefined {
    if (row === undefined) return undefined;
    this.#contracts.assertValid("artifact", "1.0.0", row.artifact_payload);
    this.#contracts.assertValid(
      "artifact-manifest",
      "1.0.0",
      row.manifest_payload,
    );
    this.#contracts.assertValid("rights-decision", "1.0.0", row.rights_payload);
    return registrationCopy(
      row.artifact_payload as PetraArtifact,
      row.manifest_payload as PetraArtifactManifest,
      row.rights_payload as PetraRightsDecision,
    );
  }
}
