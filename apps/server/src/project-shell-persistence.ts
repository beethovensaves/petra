import { PostgresCommunicationPlanReader } from "@petra/postgres";
import type { CommunicationPlanReader } from "@petra/core";
import { PostgresProjectBriefViewReader } from "@petra/postgres";
import type { ProjectBriefViewReader } from "@petra/core";
import {
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresChangeControlAuthorityRepository,
  PostgresFocusedGraphViewReader,
  PostgresReviewSessionApplyBoundary,
  PostgresProjectHistoryCompensationExecutor,
  PostgresProjectSourceLifecycleAuthorityRepository,
  PostgresProjectSourceReplacementCommandAuthorityRepository,
  PostgresSingleUserCommandPrincipalResolver,
  PostgresProjectEffectiveControlsViewReader,
  PostgresProjectHistoryViewReader,
  PostgresProjectInquiryViewReader,
  PostgresProjectObjectLocationViewReader,
  PostgresProjectRelationshipOverlayViewReader,
  PostgresProjectRelationshipViewReader,
  PostgresProjectReviewViewReader,
  PostgresReviewRecoveryAssessmentReader,
  PostgresReviewSessionAuthorityRepository,
  PostgresProjectShellViewReader,
  PostgresProjectSourceLifecycleViewReader,
  PostgresProjectSourceViewReader,
  PostgresProjectThreadViewReader,
  PostgresProjectWorkViewReader,
  PostgresProjectWorkingStateSnapshotReader,
  PostgresSuggestedActionViewReader,
  PostgresSuggestedActionInvocationAuthorityRepository,
} from "@petra/postgres";
import { Neo4jAuthorityGraphStore } from "@petra/neo4j";
import { PetraContractRegistry } from "@petra/contracts/validator";
import neo4j, { type Driver } from "neo4j-driver";
import pg from "pg";

import type {
  AuthenticatedCommandPrincipalResolver,
  FocusedGraphViewReader,
  ProjectEffectiveControlsViewReader,
  ProjectHistoryViewReader,
  ProjectHistoryCompensationExecutionBoundary,
  ProjectInquiryViewReader,
  ProjectObjectLocationViewReader,
  ProjectRelationshipOverlayViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ReviewRecoveryAssessmentReader,
  ReviewCandidateBasisRevisionAuthorityRepository,
  ReviewCandidateCorrectionAuthorityRepository,
  ReviewSessionLifecycleAuthorityRepository,
  ReviewSessionApplyBoundary,
  ReviewSessionRefreshAuthorityRepository,
  ReviewSessionSeparationAuthorityRepository,
  ProjectShellViewReader,
  ProjectSourceLifecycleViewReader,
  ProjectSourceLifecycleAuthorityRepository,
  ProjectSourceReplacementCommandAuthorityRepository,
  ProjectSourceViewReader,
  ProjectThreadViewReader,
  ProjectWorkViewReader,
  ProjectWorkingStateSnapshotReader,
  SuggestedActionViewReader,
  SuggestedActionInvocationAuthorityRepository,
} from "@petra/core";
import { parsePetraId } from "@petra/core";

const { Pool } = pg;

export interface ProjectShellPersistence {
  readonly communicationPlans?: CommunicationPlanReader;
  readonly briefViews: ProjectBriefViewReader;
  readonly views: ProjectShellViewReader;
  readonly effectiveControls: ProjectEffectiveControlsViewReader;
  readonly historyViews: ProjectHistoryViewReader;
  readonly historyCompensationExecution: ProjectHistoryCompensationExecutionBoundary;
  readonly sourceViews: ProjectSourceViewReader;
  readonly sourceLifecycleViews: ProjectSourceLifecycleViewReader;
  readonly reviewViews: ProjectReviewViewReader;
  readonly reviewRecoveryAssessments: ReviewRecoveryAssessmentReader;
  readonly reviewSessionApply: ReviewSessionApplyBoundary;
  readonly reviewSessionLifecycleAuthority: ReviewSessionLifecycleAuthorityRepository;
  readonly reviewSessionRefreshAuthority: ReviewSessionRefreshAuthorityRepository;
  readonly reviewCandidateBasisRevisionAuthority: ReviewCandidateBasisRevisionAuthorityRepository;
  readonly reviewSessionSeparationAuthority: ReviewSessionSeparationAuthorityRepository;
  readonly reviewCandidateCorrectionAuthority: ReviewCandidateCorrectionAuthorityRepository;
  readonly workingStateSnapshots: ProjectWorkingStateSnapshotReader;
  readonly relationshipViews?: ProjectRelationshipViewReader;
  readonly focusedGraphViews?: FocusedGraphViewReader;
  readonly relationshipOverlayViews?: ProjectRelationshipOverlayViewReader;
  readonly objectLocations: ProjectObjectLocationViewReader;
  readonly workViews: ProjectWorkViewReader;
  readonly threadViews: ProjectThreadViewReader;
  readonly inquiryViews: ProjectInquiryViewReader;
  readonly suggestedActionViews: SuggestedActionViewReader;
  readonly suggestedActionInvocations: SuggestedActionInvocationAuthorityRepository;
  readonly commandPrincipalResolver?: AuthenticatedCommandPrincipalResolver;
  readonly sourceLifecycleAuthority: ProjectSourceLifecycleAuthorityRepository;
  readonly sourceReplacementAuthority: ProjectSourceReplacementCommandAuthorityRepository;
  readonly close: () => Promise<void>;
}

export interface ProjectShellPersistenceEnvironment {
  readonly PETRA_AUTH_TOKEN?: string;
  readonly PETRA_HISTORY_CURSOR_SECRET?: string;
  readonly PETRA_POSTGRES_HOST?: string;
  readonly PETRA_POSTGRES_HOST_PORT?: string;
  readonly PETRA_POSTGRES_USER?: string;
  readonly PETRA_POSTGRES_PASSWORD?: string;
  readonly PETRA_POSTGRES_DATABASE?: string;
  readonly PETRA_LOCAL_ACTOR_ID?: string;
  readonly PETRA_NEO4J_URI?: string;
  readonly PETRA_NEO4J_HOST?: string;
  readonly PETRA_NEO4J_BOLT_HOST_PORT?: string;
  readonly PETRA_NEO4J_USER?: string;
  readonly PETRA_NEO4J_PASSWORD?: string;
  readonly PETRA_NEO4J_DATABASE?: string;
}

const historyCursorSecret = (
  environment: ProjectShellPersistenceEnvironment,
): string => {
  const explicit = environment.PETRA_HISTORY_CURSOR_SECRET?.trim();
  if (explicit !== undefined && explicit !== "") return explicit;
  const authenticationToken =
    environment.PETRA_AUTH_TOKEN?.trim() || "petra-local-development";
  return `petra-history-cursor-v2:${authenticationToken}`;
};

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

const neo4jPort = (value: string | undefined): number => {
  const parsed = Number(value ?? "7687");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new ProjectShellPersistenceConfigurationError(
      "PETRA_NEO4J_BOLT_HOST_PORT must be an integer TCP port between 1 and 65535.",
    );
  }
  return parsed;
};

const neo4jCredential = (
  environment: ProjectShellPersistenceEnvironment,
  name: "PETRA_NEO4J_USER" | "PETRA_NEO4J_PASSWORD",
): string => {
  const value = environment[name]?.trim();
  if (value === undefined || value === "") {
    throw new ProjectShellPersistenceConfigurationError(
      `${name} is required when live Project relationship reads are enabled.`,
    );
  }
  return value;
};

export const createProjectShellPersistenceFromEnvironment = async (
  environment: ProjectShellPersistenceEnvironment = process.env,
): Promise<ProjectShellPersistence> => {
  const configuredActorId = environment.PETRA_LOCAL_ACTOR_ID?.trim();
  if (configuredActorId !== undefined && configuredActorId !== "") {
    try {
      parsePetraId(configuredActorId, "actor");
    } catch {
      throw new ProjectShellPersistenceConfigurationError(
        "PETRA_LOCAL_ACTOR_ID must be a canonical actor-prefixed Petra ID.",
      );
    }
  }
  const pool = new Pool({
    host: environment.PETRA_POSTGRES_HOST?.trim() || "127.0.0.1",
    port: port(environment.PETRA_POSTGRES_HOST_PORT),
    user: required(environment, "PETRA_POSTGRES_USER"),
    password: required(environment, "PETRA_POSTGRES_PASSWORD"),
    database: required(environment, "PETRA_POSTGRES_DATABASE"),
    application_name: "petra-project-shell",
    max: 5,
  });
  const contracts = new PetraContractRegistry();
  const historyViews = new PostgresProjectHistoryViewReader(pool, contracts, {
    cursorSecret: historyCursorSecret(environment),
    ...(configuredActorId === undefined || configuredActorId === ""
      ? {}
      : {
          recoveryPrincipal: {
            actor_id: configuredActorId,
            actor_kind: "human" as const,
          },
        }),
  });
  const changeControlAuthority = new PostgresChangeControlAuthorityRepository(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(),
    undefined,
    contracts,
  );
  const reviewSessionApply = new PostgresReviewSessionApplyBoundary(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    changeControlAuthority,
    contracts,
    new PostgresReviewRecoveryAssessmentReader(pool, contracts, historyViews),
  );
  const reviewSessionLifecycleAuthority =
    new PostgresReviewSessionAuthorityRepository(
      pool,
      contracts,
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
    );
  const historyCompensationExecution =
    new PostgresProjectHistoryCompensationExecutor(
      pool,
      historyViews,
      changeControlAuthority,
      contracts,
    );
  let driver: Driver | undefined;
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= Promise.all([pool.end(), driver?.close()]).then(
      () => undefined,
    );
    return closePromise;
  };

  try {
    const schema = await pool.query<{ ready: boolean }>(
      `SELECT to_regclass('petra.capability_grants') IS NOT NULL
          AND to_regclass('petra.project_source_replacement_receipts') IS NOT NULL
          AND to_regclass('petra.suggested_action_invocations') IS NOT NULL
          AND to_regclass('petra.working_candidate_revisions') IS NOT NULL
          AND to_regclass('petra.review_session_lifecycle_receipts') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'command_executions_command_name_check'
              AND pg_get_constraintdef(oid) LIKE '%SeparateReviewSessionMember%'
          )
          AND EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'command_executions_schema_version_check'
              AND pg_get_constraintdef(oid) LIKE '%1.9.0%'
          )
          AS ready`,
    );
    if (schema.rows[0]?.ready !== true) {
      throw new ProjectShellPersistenceConfigurationError(
        "PostgreSQL is reachable, but the V040 ReviewSession separation boundary is unavailable.",
      );
    }
    const neo4jConfigured = [
      environment.PETRA_NEO4J_URI,
      environment.PETRA_NEO4J_HOST,
      environment.PETRA_NEO4J_BOLT_HOST_PORT,
      environment.PETRA_NEO4J_USER,
      environment.PETRA_NEO4J_PASSWORD,
      environment.PETRA_NEO4J_DATABASE,
    ].some((value) => value?.trim());
    if (neo4jConfigured) {
      const uri =
        environment.PETRA_NEO4J_URI?.trim() ||
        `bolt://${environment.PETRA_NEO4J_HOST?.trim() || "127.0.0.1"}:${neo4jPort(environment.PETRA_NEO4J_BOLT_HOST_PORT)}`;
      driver = neo4j.driver(
        uri,
        neo4j.auth.basic(
          neo4jCredential(environment, "PETRA_NEO4J_USER"),
          neo4jCredential(environment, "PETRA_NEO4J_PASSWORD"),
        ),
      );
      const graph = new Neo4jAuthorityGraphStore({
        driver,
        ...(environment.PETRA_NEO4J_DATABASE?.trim()
          ? { database: environment.PETRA_NEO4J_DATABASE.trim() }
          : {}),
      });
      await graph.prepare();
      const relationshipViews = new PostgresProjectRelationshipViewReader(
        pool,
        graph,
        contracts,
      );
      const focusedGraphViews = new PostgresFocusedGraphViewReader(
        pool,
        graph,
        contracts,
      );
      return {
        views: new PostgresProjectShellViewReader(pool),
        briefViews: new PostgresProjectBriefViewReader(pool, contracts),
        communicationPlans: new PostgresCommunicationPlanReader(
          pool,
          contracts,
        ),
        effectiveControls: new PostgresProjectEffectiveControlsViewReader(pool),
        historyViews,
        historyCompensationExecution,
        sourceViews: new PostgresProjectSourceViewReader(pool),
        sourceLifecycleViews: new PostgresProjectSourceLifecycleViewReader(
          pool,
        ),
        reviewViews: new PostgresProjectReviewViewReader(pool),
        reviewRecoveryAssessments: new PostgresReviewRecoveryAssessmentReader(
          pool,
          contracts,
          historyViews,
        ),
        reviewSessionApply,
        reviewSessionLifecycleAuthority,
        reviewSessionRefreshAuthority: reviewSessionLifecycleAuthority,
        reviewCandidateBasisRevisionAuthority: reviewSessionLifecycleAuthority,
        reviewSessionSeparationAuthority: reviewSessionLifecycleAuthority,
        reviewCandidateCorrectionAuthority: reviewSessionLifecycleAuthority,
        workingStateSnapshots: new PostgresProjectWorkingStateSnapshotReader(
          pool,
          contracts,
        ),
        objectLocations: new PostgresProjectObjectLocationViewReader(pool),
        workViews: new PostgresProjectWorkViewReader(pool),
        threadViews: new PostgresProjectThreadViewReader(pool),
        inquiryViews: new PostgresProjectInquiryViewReader(pool),
        suggestedActionViews: new PostgresSuggestedActionViewReader(
          pool,
          contracts,
          configuredActorId === undefined
            ? {}
            : { authenticatedActorId: configuredActorId },
        ),
        suggestedActionInvocations:
          new PostgresSuggestedActionInvocationAuthorityRepository(
            pool,
            new PostgresCapabilityGrantCommandAuthorizer(contracts),
            contracts,
          ),
        ...(configuredActorId === undefined || configuredActorId === ""
          ? {}
          : {
              commandPrincipalResolver:
                new PostgresSingleUserCommandPrincipalResolver(pool, {
                  actor_id: configuredActorId,
                  actor_kind: "human",
                }),
            }),
        sourceLifecycleAuthority:
          new PostgresProjectSourceLifecycleAuthorityRepository(
            pool,
            new PostgresCapabilityGrantCommandAuthorizer(),
          ),
        sourceReplacementAuthority:
          new PostgresProjectSourceReplacementCommandAuthorityRepository(
            pool,
            new PostgresCapabilityGrantCommandAuthorizer(),
          ),
        relationshipViews,
        focusedGraphViews,
        relationshipOverlayViews:
          new PostgresProjectRelationshipOverlayViewReader(
            pool,
            relationshipViews,
            contracts,
          ),
        close,
      };
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
    briefViews: new PostgresProjectBriefViewReader(pool, contracts),
    communicationPlans: new PostgresCommunicationPlanReader(pool, contracts),
    effectiveControls: new PostgresProjectEffectiveControlsViewReader(pool),
    historyViews,
    historyCompensationExecution,
    sourceViews: new PostgresProjectSourceViewReader(pool),
    sourceLifecycleViews: new PostgresProjectSourceLifecycleViewReader(pool),
    reviewViews: new PostgresProjectReviewViewReader(pool),
    reviewRecoveryAssessments: new PostgresReviewRecoveryAssessmentReader(
      pool,
      contracts,
      historyViews,
    ),
    reviewSessionApply,
    reviewSessionLifecycleAuthority,
    reviewSessionRefreshAuthority: reviewSessionLifecycleAuthority,
    reviewCandidateBasisRevisionAuthority: reviewSessionLifecycleAuthority,
    reviewSessionSeparationAuthority: reviewSessionLifecycleAuthority,
    reviewCandidateCorrectionAuthority: reviewSessionLifecycleAuthority,
    workingStateSnapshots: new PostgresProjectWorkingStateSnapshotReader(
      pool,
      contracts,
    ),
    objectLocations: new PostgresProjectObjectLocationViewReader(pool),
    workViews: new PostgresProjectWorkViewReader(pool),
    threadViews: new PostgresProjectThreadViewReader(pool),
    inquiryViews: new PostgresProjectInquiryViewReader(pool),
    suggestedActionViews: new PostgresSuggestedActionViewReader(
      pool,
      contracts,
      configuredActorId === undefined
        ? {}
        : { authenticatedActorId: configuredActorId },
    ),
    suggestedActionInvocations:
      new PostgresSuggestedActionInvocationAuthorityRepository(
        pool,
        new PostgresCapabilityGrantCommandAuthorizer(contracts),
        contracts,
      ),
    ...(configuredActorId === undefined || configuredActorId === ""
      ? {}
      : {
          commandPrincipalResolver:
            new PostgresSingleUserCommandPrincipalResolver(pool, {
              actor_id: configuredActorId,
              actor_kind: "human",
            }),
        }),
    sourceLifecycleAuthority:
      new PostgresProjectSourceLifecycleAuthorityRepository(
        pool,
        new PostgresCapabilityGrantCommandAuthorizer(),
      ),
    sourceReplacementAuthority:
      new PostgresProjectSourceReplacementCommandAuthorityRepository(
        pool,
        new PostgresCapabilityGrantCommandAuthorizer(),
      ),
    close,
  };
};
