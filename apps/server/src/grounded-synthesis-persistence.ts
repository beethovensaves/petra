import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  PostgresArtifactAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresGroundedResponseAuthorityRepository,
  PostgresInteractionAuthorityRepository,
  PostgresResearchScopeRepository,
  PostgresProjectSourceRegistrationAuthority,
  PostgresProjectSourceReuseAuthority,
  PostgresSynthesistExecutionRepository,
  PostgresWorkUnitAuthorityRepository,
} from "@petra/postgres";
import { S3ArtifactStore } from "@petra/s3";
import pg from "pg";

import type {
  ArtifactAuthorityRepository,
  ArtifactStore,
  GroundedResponseAuthorityRepository,
  InMemoryContextPacketRegistry,
  InteractionAuthorityRepository,
  ResearchScopeRepository,
  ProjectSourceRegistrationAuthority,
  ProjectSourceReuseAuthority,
  SynthesistExecutionRepository,
  WorkUnitAuthorityRepository,
} from "@petra/core";

const { Pool } = pg;

export interface GroundedSynthesisPersistence {
  readonly scopes: ResearchScopeRepository;
  readonly artifactStore: ArtifactStore;
  readonly artifacts: ArtifactAuthorityRepository;
  readonly sourceRegistrations: ProjectSourceRegistrationAuthority;
  readonly sourceReuses: ProjectSourceReuseAuthority;
  readonly executions: SynthesistExecutionRepository;
  readonly workUnits: WorkUnitAuthorityRepository;
  readonly interactions: InteractionAuthorityRepository;
  readonly groundedResponses: (
    packets: InMemoryContextPacketRegistry,
  ) => GroundedResponseAuthorityRepository;
  readonly runtimeVersion?: string;
  readonly close?: () => Promise<void>;
}

export interface GroundedSynthesisPersistenceEnvironment {
  readonly PETRA_POSTGRES_HOST?: string;
  readonly PETRA_POSTGRES_HOST_PORT?: string;
  readonly PETRA_POSTGRES_USER?: string;
  readonly PETRA_POSTGRES_PASSWORD?: string;
  readonly PETRA_POSTGRES_DATABASE?: string;
  readonly PETRA_S3_ENDPOINT?: string;
  readonly PETRA_S3_HOST_PORT?: string;
  readonly PETRA_S3_ACCESS_KEY?: string;
  readonly PETRA_S3_SECRET_KEY?: string;
  readonly PETRA_S3_BUCKET?: string;
}

export class GroundedSynthesisPersistenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroundedSynthesisPersistenceConfigurationError";
  }
}

const required = (
  environment: GroundedSynthesisPersistenceEnvironment,
  name:
    | "PETRA_POSTGRES_USER"
    | "PETRA_POSTGRES_PASSWORD"
    | "PETRA_POSTGRES_DATABASE"
    | "PETRA_S3_ACCESS_KEY"
    | "PETRA_S3_SECRET_KEY"
    | "PETRA_S3_BUCKET",
): string => {
  const value = environment[name]?.trim();
  if (value === undefined || value === "") {
    throw new GroundedSynthesisPersistenceConfigurationError(
      `${name} is required when the live grounded-synthesis runtime is enabled.`,
    );
  }
  return value;
};

const port = (value: string | undefined, fallback: number, name: string) => {
  const parsed = Number(value ?? String(fallback));
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new GroundedSynthesisPersistenceConfigurationError(
      `${name} must be an integer TCP port between 1 and 65535.`,
    );
  }
  return parsed;
};

const missingBucket = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    readonly name?: unknown;
    readonly $metadata?: { readonly httpStatusCode?: unknown };
  };
  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchBucket" ||
    candidate.$metadata?.httpStatusCode === 404
  );
};

const ensureBucket = async (
  client: S3Client,
  bucket: string,
): Promise<void> => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (error) {
    if (!missingBucket(error)) throw error;
  }
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(
        String((error as { readonly name?: unknown }).name),
      )
    ) {
      throw error;
    }
  }
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
};

/**
 * Composes Petra's local durable terminal from explicit PostgreSQL and S3
 * settings. These credentials authorize only Petra's local stores; model
 * authentication remains inside the Codex App Server managed ChatGPT flow.
 */
export const createGroundedSynthesisPersistenceFromEnvironment = async (
  environment: GroundedSynthesisPersistenceEnvironment = process.env,
): Promise<GroundedSynthesisPersistence> => {
  const postgresPort = port(
    environment.PETRA_POSTGRES_HOST_PORT,
    5432,
    "PETRA_POSTGRES_HOST_PORT",
  );
  const s3Port = port(
    environment.PETRA_S3_HOST_PORT,
    8333,
    "PETRA_S3_HOST_PORT",
  );
  const postgresUser = required(environment, "PETRA_POSTGRES_USER");
  const postgresPassword = required(environment, "PETRA_POSTGRES_PASSWORD");
  const postgresDatabase = required(environment, "PETRA_POSTGRES_DATABASE");
  const s3AccessKey = required(environment, "PETRA_S3_ACCESS_KEY");
  const s3SecretKey = required(environment, "PETRA_S3_SECRET_KEY");
  const bucket = required(environment, "PETRA_S3_BUCKET");
  const pool = new Pool({
    host: environment.PETRA_POSTGRES_HOST?.trim() || "127.0.0.1",
    port: postgresPort,
    user: postgresUser,
    password: postgresPassword,
    database: postgresDatabase,
    application_name: "petra-grounded-terminal",
    max: 10,
  });
  const client = new S3Client({
    region: "us-east-1",
    endpoint:
      environment.PETRA_S3_ENDPOINT?.trim() || `http://127.0.0.1:${s3Port}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: s3AccessKey,
      secretAccessKey: s3SecretKey,
    },
  });
  const artifactStore = new S3ArtifactStore({
    client,
    bucket,
    storeName: "petra-artifacts",
    namespace: "petra",
  });

  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= (async () => {
      client.destroy();
      await pool.end();
    })();
    return closePromise;
  };

  try {
    const schema = await pool.query<{ ready: boolean }>(
      `SELECT to_regclass('petra.grounded_responses') IS NOT NULL
          AND to_regclass('petra.project_source_registration_receipts') IS NOT NULL
          AND to_regclass('petra.project_source_reuse_receipts') IS NOT NULL
          AS ready`,
    );
    if (schema.rows[0]?.ready !== true) {
      throw new GroundedSynthesisPersistenceConfigurationError(
        "PostgreSQL is reachable, but the grounded response, source registration, or source reuse authority is not migrated.",
      );
    }
    await ensureBucket(client, bucket);
  } catch (error) {
    await close();
    if (error instanceof GroundedSynthesisPersistenceConfigurationError) {
      throw error;
    }
    throw new GroundedSynthesisPersistenceConfigurationError(
      `The grounded terminal stores are unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    scopes: new PostgresResearchScopeRepository(pool),
    artifactStore,
    artifacts: new PostgresArtifactAuthorityRepository(pool, artifactStore),
    sourceRegistrations: new PostgresProjectSourceRegistrationAuthority(
      pool,
      artifactStore,
      new PostgresCapabilityGrantCommandAuthorizer(),
    ),
    sourceReuses: new PostgresProjectSourceReuseAuthority(
      pool,
      new PostgresCapabilityGrantCommandAuthorizer(),
    ),
    executions: new PostgresSynthesistExecutionRepository(pool),
    workUnits: new PostgresWorkUnitAuthorityRepository(pool),
    interactions: new PostgresInteractionAuthorityRepository(pool),
    groundedResponses: (packets) =>
      new PostgresGroundedResponseAuthorityRepository(pool, packets),
    close,
  };
};
