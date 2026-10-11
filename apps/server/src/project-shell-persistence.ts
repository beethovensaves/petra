import { PostgresIntakeCopilotRepository } from "@petra/postgres";
import type { IntakeCopilotRepository } from "@petra/core";
import {
  PostgresProjectExaminationCommandAuthority,
  PostgresProjectExaminationOwnerAuthority,
  PostgresProjectExaminationRegistry,
  PostgresProjectExaminationRepository,
} from "@petra/postgres";
import type {
  PetraAssessmentProfile,
  PetraAssessmentPolicy,
} from "@petra/contracts";
import { ProjectExaminationService } from "./project-examination.js";
import { PostgresCommunicationPlanReader } from "@petra/postgres";
import { PostgresCopilotPermissionAuthority } from "@petra/postgres";
import { PostgresCopilotTurnRepository } from "@petra/postgres";
import { PostgresProjectSemanticGraphReader } from "@petra/postgres";
import type { ProjectSemanticGraphReader } from "@petra/core";
import type {
  ConversationHistoryReader,
  ConversationPermissionAuthority,
  CopilotTurnRepository,
} from "@petra/core";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3ArtifactStore } from "@petra/s3";
import type { PetraRegisteredProjectProfile } from "@petra/contracts";
import { readFile } from "node:fs/promises";
import type { CommunicationPlanReader } from "@petra/core";
import { PostgresProjectBriefViewReader } from "@petra/postgres";
import type { ProjectBriefViewReader } from "@petra/core";
import {
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresArtifactAuthorityRepository,
  PostgresChangeControlAuthorityRepository,
  PostgresFocusedGraphViewReader,
  PostgresReviewSessionApplyBoundary,
  PostgresProjectHistoryCompensationExecutor,
  PostgresProjectSourceLifecycleAuthorityRepository,
  PostgresProjectSourceLocalCopyDeletionAuthority,
  PostgresProjectSourceReplacementCommandAuthorityRepository,
  PostgresSingleUserCommandPrincipalResolver,
  PostgresProjectEffectiveControlsViewReader,
  PostgresProjectModelReadinessReader,
  PostgresProjectImportAuthority,
  PostgresInteractionAuthorityRepository,
  PostgresProjectObjectiveCommandAuthority,
  PostgresProjectProfileRuntime,
  PostgresProjectHistoryViewReader,
  PostgresProjectInquirySaveAuthority,
  PostgresProjectInquiryViewReader,
  PostgresProjectObjectLocationViewReader,
  PostgresProjectRelationshipOverlayViewReader,
  PostgresProjectRelationshipViewReader,
  PostgresProjectReviewViewReader,
  PostgresReviewRecoveryAssessmentReader,
  PostgresReviewSessionAuthorityRepository,
  PostgresProjectShellViewReader,
  PostgresProjectSourceLifecycleViewReader,
  PostgresProjectSourceReuseOptionsReader,
  PostgresProjectSourceProcessingAuthority,
  PostgresProjectSourceViewReader,
  PostgresProjectThreadViewReader,
  PostgresProjectWorkOperations,
  PostgresProjectWorkViewReader,
  PostgresProjectWorkerOutputManifestReader,
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
  FocusedGraphActionPreviewViewReader,
  FocusedGraphAnalysisViewReader,
  FocusedGraphViewReader,
  ProjectEffectiveControlsViewReader,
  ProjectModelAuthorityReader,
  ProjectProfileCommandAuthority,
  ProjectProfileCommandRecoveryReader,
  ProjectProfileRuntimeReader,
  ProjectDefinitionDraftCommandAuthority,
  ProjectDefinitionDraftReader,
  ProjectHistoryViewReader,
  ProjectHistoryCompensationExecutionBoundary,
  ProjectImportAncestryReader,
  ProjectImportCommandAuthority,
  ProjectImportCommandRecoveryReader,
  ProjectObjectiveCommandAuthority,
  ProjectInquiryViewReader,
  ProjectInquirySaveAuthority,
  ProjectObjectLocationViewReader,
  ProjectRelationshipOverlayViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ReviewRecoveryAssessmentReader,
  ReviewCandidateBasisRevisionAuthorityRepository,
  ReviewCandidateCorrectionAuthorityRepository,
  ReviewSessionLifecycleAuthorityRepository,
  ReviewSessionApplyBoundary,
  ReviewSessionRejectBoundary,
  ReviewSessionRefreshAuthorityRepository,
  ReviewSessionSeparationAuthorityRepository,
  ProjectShellViewReader,
  ProjectSourceLifecycleViewReader,
  ProjectSourceReuseOptionsReader,
  ProjectSourceProcessingAuthority,
  ProjectSourceProcessingViewReader,
  ProjectSourceLifecycleAuthorityRepository,
  ProjectSourceLinkRemovalAuthority,
  ProjectSourceLinkRemovalPreviewReader,
  ProjectSourceLocalCopyDeletionAuthority,
  ProjectSourceLocalCopyDeletionPreviewReader,
  ProjectSourceReplacementCommandAuthorityRepository,
  ProjectSourceViewReader,
  ProjectThreadViewReader,
  ProjectWorkOperationAuthority,
  ProjectWorkOperationsViewReader,
  ProjectWorkReceiptReader,
  ProjectWorkResumeAuthority,
  ProjectWorkStartAgainAuthority,
  ProjectWorkerOutputManifestReader,
  ProjectWorkViewReader,
  ProjectWorkingStateSnapshotReader,
  SuggestedActionViewReader,
  SuggestedActionInvocationAuthorityRepository,
  ReviewInterruptBoundary,
} from "@petra/core";
import {
  ArtifactStoreReviewResponsePayloadRecorder,
  DurableReviewInterruptCoordinator,
  DurableReviewInterruptProductBindingLoader,
  FocusedGraphActionPreviewViewComposer,
  FocusedGraphAnalysisViewComposer,
  parsePetraId,
} from "@petra/core";

const { Pool } = pg;

const BUILT_IN_PROFILE_URLS = [
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific-v1-5.json",
    import.meta.url,
  ),
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
    import.meta.url,
  ),
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific-v1-1.json",
    import.meta.url,
  ),
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific-v1-2.json",
    import.meta.url,
  ),
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific-v1-3.json",
    import.meta.url,
  ),
  new URL(
    "../../../packages/contracts/fixtures/accepted/registered-project-profile-controlled-writing.json",
    import.meta.url,
  ),
] as const;

const readBuiltInProfiles = async (): Promise<
  PetraRegisteredProjectProfile[]
> =>
  Promise.all(
    BUILT_IN_PROFILE_URLS.map(async (url) => {
      const parsed: unknown = JSON.parse(await readFile(url, "utf8"));
      return parsed as PetraRegisteredProjectProfile;
    }),
  );

export interface ProjectShellPersistence {
  readonly examinations?: ProjectExaminationService;
  readonly copilotTurns: CopilotTurnRepository;
  readonly copilotHistory?: ConversationHistoryReader;
  readonly copilotPermission?: ConversationPermissionAuthority;
  readonly intakeCopilot?: IntakeCopilotRepository;
  readonly semanticGraphs?: ProjectSemanticGraphReader;
  readonly localActorId?: string;
  readonly modelContexts: ProjectModelAuthorityReader;
  readonly profileReads: ProjectProfileRuntimeReader;
  readonly profileCommands: ProjectProfileCommandAuthority;
  readonly profileRecovery: ProjectProfileCommandRecoveryReader;
  readonly definitionDrafts: ProjectDefinitionDraftReader;
  readonly definitions: Pick<
    ProjectDefinitionAuthorityRepository,
    "getProjectDefinition"
  >;
  readonly definitionDraftCommands: ProjectDefinitionDraftCommandAuthority;
  readonly importCommands: ProjectImportCommandAuthority;
  readonly importRecovery: ProjectImportCommandRecoveryReader;
  readonly importAncestry: ProjectImportAncestryReader;
  readonly objectiveCommands: ProjectObjectiveCommandAuthority;
  readonly communicationPlans?: CommunicationPlanReader;
  readonly briefViews: ProjectBriefViewReader;
  readonly views: ProjectShellViewReader;
  readonly effectiveControls: ProjectEffectiveControlsViewReader;
  readonly historyViews: ProjectHistoryViewReader;
  readonly historyCompensationExecution: ProjectHistoryCompensationExecutionBoundary;
  readonly sourceViews: ProjectSourceViewReader;
  readonly sourceReuseOptions: ProjectSourceReuseOptionsReader;
  readonly sourceProcessingAuthority: ProjectSourceProcessingAuthority;
  readonly sourceProcessingViews: ProjectSourceProcessingViewReader;
  readonly sourceLifecycleViews: ProjectSourceLifecycleViewReader;
  readonly sourceLinkRemovalPreviews: ProjectSourceLinkRemovalPreviewReader;
  readonly sourceLocalCopyDeletionPreviews: ProjectSourceLocalCopyDeletionPreviewReader;
  readonly reviewViews: ProjectReviewViewReader;
  readonly reviewRecoveryAssessments: ReviewRecoveryAssessmentReader;
  readonly reviewSessionApply: ReviewSessionApplyBoundary;
  readonly reviewSessionReject: ReviewSessionRejectBoundary;
  readonly reviewSessionLifecycleAuthority: ReviewSessionLifecycleAuthorityRepository;
  readonly reviewSessionRefreshAuthority: ReviewSessionRefreshAuthorityRepository;
  readonly reviewCandidateBasisRevisionAuthority: ReviewCandidateBasisRevisionAuthorityRepository;
  readonly reviewSessionSeparationAuthority: ReviewSessionSeparationAuthorityRepository;
  readonly reviewCandidateCorrectionAuthority: ReviewCandidateCorrectionAuthorityRepository;
  readonly workingStateSnapshots: ProjectWorkingStateSnapshotReader;
  readonly relationshipViews?: ProjectRelationshipViewReader;
  readonly focusedGraphViews?: FocusedGraphViewReader;
  readonly focusedGraphActionPreviewViews?: FocusedGraphActionPreviewViewReader;
  readonly focusedGraphAnalysisViews?: FocusedGraphAnalysisViewReader;
  readonly relationshipOverlayViews?: ProjectRelationshipOverlayViewReader;
  readonly objectLocations: ProjectObjectLocationViewReader;
  readonly workViews: ProjectWorkViewReader;
  readonly workerOutputManifests: ProjectWorkerOutputManifestReader;
  readonly workOperations: ProjectWorkOperationsViewReader;
  readonly workReceipts: ProjectWorkReceiptReader;
  readonly workOperationAuthority: ProjectWorkOperationAuthority;
  readonly workResumeAuthority: ProjectWorkResumeAuthority;
  readonly workStartAgainAuthority: ProjectWorkStartAgainAuthority;
  readonly threadViews: ProjectThreadViewReader;
  readonly inquiryViews: ProjectInquiryViewReader;
  readonly inquirySaveAuthority?: ProjectInquirySaveAuthority;
  readonly suggestedActionViews: SuggestedActionViewReader;
  readonly suggestedActionInvocations: SuggestedActionInvocationAuthorityRepository;
  readonly commandPrincipalResolver?: AuthenticatedCommandPrincipalResolver;
  readonly sourceLifecycleAuthority: ProjectSourceLifecycleAuthorityRepository;
  readonly sourceLinkRemovals: ProjectSourceLinkRemovalAuthority;
  readonly sourceLocalCopyDeletions: ProjectSourceLocalCopyDeletionAuthority;
  readonly sourceReplacementAuthority: ProjectSourceReplacementCommandAuthorityRepository;
  readonly createReviewInterruptBoundary: (serviceActor: {
    readonly actor_id: string;
    readonly actor_kind: "human" | "service" | "model";
  }) => ReviewInterruptBoundary;
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
  readonly PETRA_S3_ENDPOINT?: string;
  readonly PETRA_S3_HOST_PORT?: string;
  readonly PETRA_S3_ACCESS_KEY?: string;
  readonly PETRA_S3_SECRET_KEY?: string;
  readonly PETRA_S3_BUCKET?: string;
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

const required = (
  environment: ProjectShellPersistenceEnvironment,
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

const s3Port = (value: string | undefined): number => {
  const parsed = Number(value ?? "8333");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new ProjectShellPersistenceConfigurationError(
      "PETRA_S3_HOST_PORT must be an integer TCP port between 1 and 65535.",
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
  const s3Bucket = required(environment, "PETRA_S3_BUCKET");
  const s3AccessKey = required(environment, "PETRA_S3_ACCESS_KEY");
  const s3SecretKey = required(environment, "PETRA_S3_SECRET_KEY");
  const pool = new Pool({
    host: environment.PETRA_POSTGRES_HOST?.trim() || "127.0.0.1",
    port: port(environment.PETRA_POSTGRES_HOST_PORT),
    user: required(environment, "PETRA_POSTGRES_USER"),
    password: required(environment, "PETRA_POSTGRES_PASSWORD"),
    database: required(environment, "PETRA_POSTGRES_DATABASE"),
    application_name: "petra-project-shell",
    max: 5,
  });
  const s3Client = new S3Client({
    region: "us-east-1",
    endpoint:
      environment.PETRA_S3_ENDPOINT?.trim() ||
      `http://127.0.0.1:${s3Port(environment.PETRA_S3_HOST_PORT)}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: s3AccessKey,
      secretAccessKey: s3SecretKey,
    },
  });
  const artifactStore = new S3ArtifactStore({
    client: s3Client,
    bucket: s3Bucket,
    storeName: "petra-artifacts",
    namespace: "petra",
  });
  const artifactAuthority = new PostgresArtifactAuthorityRepository(
    pool,
    artifactStore,
  );
  const copilotTurns = new PostgresCopilotTurnRepository(
    pool,
    configuredActorId === undefined || configuredActorId === ""
      ? undefined
      : {
          actorId: configuredActorId,
          artifactStore,
          artifacts: artifactAuthority,
        },
  );
  const copilotPermission =
    configuredActorId === undefined || configuredActorId === ""
      ? undefined
      : new PostgresCopilotPermissionAuthority(pool, configuredActorId);
  const contracts = new PetraContractRegistry();
  const semanticGraphs = new PostgresProjectSemanticGraphReader(
    pool,
    contracts,
  );
  const examinationRegistry = new PostgresProjectExaminationRegistry(
    pool,
    contracts,
  );
  const examinationRecords = new PostgresProjectExaminationRepository(
    pool,
    semanticGraphs,
    async (projectId, graph, transaction) =>
      (await examinationRegistry.resolve(projectId, graph, transaction))
        ?.kernel,
    contracts,
  );
  const examinationCommands = new PostgresProjectExaminationCommandAuthority(
    pool,
    examinationRecords,
    semanticGraphs,
    examinationRegistry,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    contracts,
  );
  const examinations =
    configuredActorId === undefined || configuredActorId === ""
      ? undefined
      : new ProjectExaminationService(
          semanticGraphs,
          examinationRecords,
          examinationRegistry,
          examinationCommands,
          new PostgresSingleUserCommandPrincipalResolver(pool, {
            actor_id: configuredActorId,
            actor_kind: "human",
          }),
          contracts,
          new PostgresProjectExaminationOwnerAuthority(
            pool,
            semanticGraphs,
            examinationRegistry,
            contracts,
          ),
        );
  const profileRuntime = new PostgresProjectProfileRuntime(
    pool,
    configuredActorId === undefined || configuredActorId === ""
      ? undefined
      : { actor_id: configuredActorId, actor_kind: "human" },
    contracts,
  );
  const importRuntime = new PostgresProjectImportAuthority(
    pool,
    configuredActorId === undefined || configuredActorId === ""
      ? undefined
      : { actor_id: configuredActorId, actor_kind: "human" },
    contracts,
  );
  const objectiveCommands = new PostgresProjectObjectiveCommandAuthority(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    contracts,
  );
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
  const reviewViews = new PostgresProjectReviewViewReader(pool, contracts);
  const threadViews = new PostgresProjectThreadViewReader(pool, contracts);
  const workViews = new PostgresProjectWorkViewReader(pool, contracts);
  const interactions = new PostgresInteractionAuthorityRepository(
    pool,
    contracts,
  );
  const suggestedActionViews = new PostgresSuggestedActionViewReader(
    pool,
    contracts,
    configuredActorId === undefined
      ? {}
      : { authenticatedActorId: configuredActorId },
  );
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
  const createReviewInterruptBoundary = (serviceActor: {
    readonly actor_id: string;
    readonly actor_kind: "human" | "service" | "model";
  }): ReviewInterruptBoundary => {
    if (serviceActor.actor_kind !== "service") {
      throw new ProjectShellPersistenceConfigurationError(
        "The durable Review interrupt boundary requires Petra's server-owned service Actor.",
      );
    }
    const durableServiceActor = {
      actor_id: serviceActor.actor_id,
      actor_kind: "service" as const,
    };
    const authorizer = new PostgresCapabilityGrantCommandAuthorizer(contracts);
    return new DurableReviewInterruptCoordinator({
      repository: interactions,
      executor: changeControlAuthority,
      payloads: new ArtifactStoreReviewResponsePayloadRecorder({
        store: artifactStore,
        artifacts: artifactAuthority,
        serviceActor: durableServiceActor,
      }),
      authorizer: {
        authorize: async (input) => {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const commands =
              input.decision === "accept"
                ? ([
                    "SubmitChangeSet",
                    "RecordApproval",
                    "ApplyChangeSet",
                  ] as const)
                : (["SubmitChangeSet", "RecordApproval"] as const);
            for (const commandName of commands) {
              if (
                !(await authorizer.authorize(
                  {
                    projectId: input.project_id,
                    actor: input.actor,
                    capabilityGrantId: input.capability_grant_id,
                    commandName,
                  },
                  client,
                ))
              ) {
                await client.query("ROLLBACK");
                return false;
              }
            }
            await client.query("COMMIT");
            return true;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        },
      },
      serviceActor: durableServiceActor,
      bindingLoader: new DurableReviewInterruptProductBindingLoader({
        interactions,
        artifactStore,
        reviews: reviewViews,
        threads: threadViews,
        work: workViews,
        apply: reviewSessionApply,
        reject: reviewSessionApply,
      }),
    });
  };
  const historyCompensationExecution =
    new PostgresProjectHistoryCompensationExecutor(
      pool,
      historyViews,
      changeControlAuthority,
      contracts,
    );
  const workOperations = new PostgresProjectWorkOperations(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    contracts,
  );
  const sourceProcessing = new PostgresProjectSourceProcessingAuthority(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    contracts,
  );
  const sourceLifecycleViews = new PostgresProjectSourceLifecycleViewReader(
    pool,
    contracts,
  );
  const sourceLifecycleAuthority =
    new PostgresProjectSourceLifecycleAuthorityRepository(
      pool,
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
      undefined,
      contracts,
    );
  const sourceLocalCopyDeletions =
    new PostgresProjectSourceLocalCopyDeletionAuthority(
      pool,
      artifactStore,
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
      contracts,
    );
  let driver: Driver | undefined;
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= Promise.all([pool.end(), driver?.close()]).then(() => {
      s3Client.destroy();
    });
    return closePromise;
  };

  try {
    const schema = await pool.query<{ ready: boolean }>(
      `SELECT to_regclass('petra.capability_grants') IS NOT NULL
          AND to_regclass('petra.project_source_replacement_receipts') IS NOT NULL
          AND to_regclass('petra.suggested_action_invocations') IS NOT NULL
          AND to_regclass('petra.working_candidate_revisions') IS NOT NULL
          AND to_regclass('petra.review_session_lifecycle_receipts') IS NOT NULL
          AND to_regclass('petra.project_copilot_input_manifests') IS NOT NULL
          AND to_regclass('petra.intake_project_bindings') IS NOT NULL
          AND to_regclass('petra.project_examination_authority_receipts') IS NOT NULL
          AND to_regclass('petra.assessment_catalog_records') IS NOT NULL
          AND to_regclass('petra.project_examination_command_receipts') IS NOT NULL
          AND to_regclass('petra.registered_project_profiles') IS NOT NULL
          AND to_regclass('petra.project_profile_command_receipts') IS NOT NULL
          AND to_regclass('petra.project_source_link_removal_receipts') IS NOT NULL
          AND to_regclass('petra.project_source_local_copy_deletion_receipts') IS NOT NULL
          AND to_regclass('petra.project_work_operation_receipts') IS NOT NULL
          AND to_regclass('petra.project_inquiry_save_receipts') IS NOT NULL
          AND to_regclass('petra.project_import_command_receipts') IS NOT NULL
          AND to_regclass('petra.project_objective_command_receipts') IS NOT NULL
          AND to_regclass('petra.project_source_processing_commands') IS NOT NULL
          AND to_regclass('petra.interaction_interrupts') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'petra'
              AND table_name = 'command_executions'
              AND column_name = 'review_reject_request'
          )
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
        "PostgreSQL is reachable, but the required Project runtime through V065 intake and examination authority is unavailable.",
      );
    }
    for (const name of ["assessment-profile", "assessment-policy"]) {
      const record: unknown = JSON.parse(
        await readFile(
          new URL(
            `../../../packages/contracts/fixtures/accepted/${name}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await examinationRegistry.register(
        record as PetraAssessmentProfile | PetraAssessmentPolicy,
      );
    }
    await ensureBucket(s3Client, s3Bucket);
    for (const profile of await readBuiltInProfiles()) {
      await profileRuntime.registerProfile(profile);
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
      const inquirySaveAuthority = new PostgresProjectInquirySaveAuthority(
        pool,
        focusedGraphViews,
        new PostgresCapabilityGrantCommandAuthorizer(contracts),
        contracts,
      );
      const focusedGraphAnalysisViews = new FocusedGraphAnalysisViewComposer(
        focusedGraphViews,
        historyViews,
        reviewViews,
        contracts,
      );
      const focusedGraphActionPreviewViews =
        new FocusedGraphActionPreviewViewComposer(
          focusedGraphViews,
          reviewViews,
          suggestedActionViews,
          contracts,
        );
      return {
        copilotTurns,
        copilotHistory: copilotTurns,
        ...(copilotPermission === undefined ? {} : { copilotPermission }),
        intakeCopilot: new PostgresIntakeCopilotRepository(pool),
        semanticGraphs,
        ...(examinations === undefined ? {} : { examinations }),
        ...(configuredActorId === undefined
          ? {}
          : { localActorId: configuredActorId }),
        modelContexts: new PostgresProjectModelReadinessReader(pool, contracts),
        profileReads: profileRuntime,
        profileCommands: profileRuntime,
        profileRecovery: profileRuntime,
        definitionDrafts: profileRuntime,
        definitions: new PostgresProjectDefinitionAuthorityRepository(
          pool,
          contracts,
        ),
        definitionDraftCommands: profileRuntime,
        importCommands: importRuntime,
        importRecovery: importRuntime,
        importAncestry: importRuntime,
        objectiveCommands,
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
        sourceReuseOptions: new PostgresProjectSourceReuseOptionsReader(
          pool,
          new PostgresCapabilityGrantCommandAuthorizer(contracts),
          contracts,
        ),
        sourceProcessingAuthority: sourceProcessing,
        sourceProcessingViews: sourceProcessing,
        sourceLifecycleViews,
        sourceLinkRemovalPreviews: sourceLifecycleViews,
        sourceLocalCopyDeletionPreviews: sourceLocalCopyDeletions,
        reviewViews,
        reviewRecoveryAssessments: new PostgresReviewRecoveryAssessmentReader(
          pool,
          contracts,
          historyViews,
        ),
        reviewSessionApply,
        reviewSessionReject: reviewSessionApply,
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
        workViews,
        workerOutputManifests: new PostgresProjectWorkerOutputManifestReader(
          pool,
          contracts,
        ),
        workOperations,
        workReceipts: workOperations,
        workOperationAuthority: workOperations,
        workResumeAuthority: workOperations,
        workStartAgainAuthority: workOperations,
        threadViews,
        inquiryViews: new PostgresProjectInquiryViewReader(pool),
        inquirySaveAuthority,
        suggestedActionViews,
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
        sourceLifecycleAuthority,
        sourceLinkRemovals: sourceLifecycleAuthority,
        sourceLocalCopyDeletions,
        sourceReplacementAuthority:
          new PostgresProjectSourceReplacementCommandAuthorityRepository(
            pool,
            new PostgresCapabilityGrantCommandAuthorizer(),
          ),
        createReviewInterruptBoundary,
        relationshipViews,
        focusedGraphViews,
        focusedGraphActionPreviewViews,
        focusedGraphAnalysisViews,
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
    copilotTurns,
    copilotHistory: copilotTurns,
    ...(copilotPermission === undefined ? {} : { copilotPermission }),
    intakeCopilot: new PostgresIntakeCopilotRepository(pool),
    semanticGraphs,
    ...(examinations === undefined ? {} : { examinations }),
    ...(configuredActorId === undefined
      ? {}
      : { localActorId: configuredActorId }),
    modelContexts: new PostgresProjectModelReadinessReader(pool, contracts),
    profileReads: profileRuntime,
    profileCommands: profileRuntime,
    profileRecovery: profileRuntime,
    definitionDrafts: profileRuntime,
    definitions: new PostgresProjectDefinitionAuthorityRepository(
      pool,
      contracts,
    ),
    definitionDraftCommands: profileRuntime,
    importCommands: importRuntime,
    importRecovery: importRuntime,
    importAncestry: importRuntime,
    objectiveCommands,
    views: new PostgresProjectShellViewReader(pool),
    briefViews: new PostgresProjectBriefViewReader(pool, contracts),
    communicationPlans: new PostgresCommunicationPlanReader(pool, contracts),
    effectiveControls: new PostgresProjectEffectiveControlsViewReader(pool),
    historyViews,
    historyCompensationExecution,
    sourceViews: new PostgresProjectSourceViewReader(pool),
    sourceReuseOptions: new PostgresProjectSourceReuseOptionsReader(
      pool,
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
      contracts,
    ),
    sourceProcessingAuthority: sourceProcessing,
    sourceProcessingViews: sourceProcessing,
    sourceLifecycleViews,
    sourceLinkRemovalPreviews: sourceLifecycleViews,
    sourceLocalCopyDeletionPreviews: sourceLocalCopyDeletions,
    reviewViews,
    reviewRecoveryAssessments: new PostgresReviewRecoveryAssessmentReader(
      pool,
      contracts,
      historyViews,
    ),
    reviewSessionApply,
    reviewSessionReject: reviewSessionApply,
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
    workViews,
    workerOutputManifests: new PostgresProjectWorkerOutputManifestReader(
      pool,
      contracts,
    ),
    workOperations,
    workReceipts: workOperations,
    workOperationAuthority: workOperations,
    workResumeAuthority: workOperations,
    workStartAgainAuthority: workOperations,
    threadViews,
    inquiryViews: new PostgresProjectInquiryViewReader(pool),
    suggestedActionViews,
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
    sourceLifecycleAuthority,
    sourceLinkRemovals: sourceLifecycleAuthority,
    sourceLocalCopyDeletions,
    sourceReplacementAuthority:
      new PostgresProjectSourceReplacementCommandAuthorityRepository(
        pool,
        new PostgresCapabilityGrantCommandAuthorizer(),
      ),
    createReviewInterruptBoundary,
    close,
  };
};
import { PostgresProjectDefinitionAuthorityRepository } from "@petra/postgres";
import type { ProjectDefinitionAuthorityRepository } from "@petra/core";
