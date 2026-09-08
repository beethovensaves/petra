import {
  PostgresProjectReviewViewReader,
  PostgresProjectShellViewReader,
  PostgresProjectSourceViewReader,
} from "@petra/postgres";
import pg from "pg";

import type {
  ProjectReviewViewReader,
  ProjectShellViewReader,
  ProjectSourceViewReader,
} from "@petra/core";

const { Pool } = pg;

export interface ProjectShellPersistence {
  readonly views: ProjectShellViewReader;
  readonly sourceViews: ProjectSourceViewReader;
  readonly reviewViews: ProjectReviewViewReader;
  readonly close: () => Promise<void>;
}

export interface ProjectShellPersistenceEnvironment {
  readonly PETRA_POSTGRES_HOST?: string;
  readonly PETRA_POSTGRES_HOST_PORT?: string;
  readonly PETRA_POSTGRES_USER?: string;
  readonly PETRA_POSTGRES_PASSWORD?: string;
  readonly PETRA_POSTGRES_DATABASE?: string;
}

export class ProjectShellPersistenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectShellPersistenceConfigurationError";
  }
}

const required = (
  environment: ProjectShellPersistenceEnvironment,
  name:
    | "PETRA_POSTGRES_USER"
    | "PETRA_POSTGRES_PASSWORD"
    | "PETRA_POSTGRES_DATABASE",
): string => {
  const value = environment[name]?.trim();
  if (value === undefined || value === "") {
    throw new ProjectShellPersistenceConfigurationError(
      `${name} is required when live Project shell reads are enabled.`,
    );
  }
  return value;
};

const port = (value: string | undefined): number => {
  const parsed = Number(value ?? "5432");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new ProjectShellPersistenceConfigurationError(
      "PETRA_POSTGRES_HOST_PORT must be an integer TCP port between 1 and 65535.",
    );
  }
  return parsed;
};

export const createProjectShellPersistenceFromEnvironment = async (
  environment: ProjectShellPersistenceEnvironment = process.env,
): Promise<ProjectShellPersistence> => {
  const pool = new Pool({
    host: environment.PETRA_POSTGRES_HOST?.trim() || "127.0.0.1",
    port: port(environment.PETRA_POSTGRES_HOST_PORT),
    user: required(environment, "PETRA_POSTGRES_USER"),
    password: required(environment, "PETRA_POSTGRES_PASSWORD"),
    database: required(environment, "PETRA_POSTGRES_DATABASE"),
    application_name: "petra-project-shell",
    max: 5,
  });
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= pool.end();
    return closePromise;
  };

  try {
    const schema = await pool.query<{ ready: boolean }>(
      "SELECT to_regclass('petra.review_session_revisions') IS NOT NULL AS ready",
    );
    if (schema.rows[0]?.ready !== true) {
      throw new ProjectShellPersistenceConfigurationError(
        "PostgreSQL is reachable, but V021 has not created petra.review_session_revisions.",
      );
    }
  } catch (error) {
    await close();
    if (error instanceof ProjectShellPersistenceConfigurationError) {
      throw error;
    }
    throw new ProjectShellPersistenceConfigurationError(
      `Project shell authority is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    views: new PostgresProjectShellViewReader(pool),
    sourceViews: new PostgresProjectSourceViewReader(pool),
    reviewViews: new PostgresProjectReviewViewReader(pool),
    close,
  };
};
