import type {
  PetraActor,
  PetraArtifact,
  PetraInteractionFeatureManifest,
  PetraInteractionRun,
  PetraProject,
  PetraProjectThreadV11,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifestV11,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";
import {
  conversationResultRecord,
  assertConversationOwnerBinding,
  CopilotBoundaryError,
  copilotHash,
  derivePetraId,
  interactionContentArtifactRecords,
  COPILOT_PROFILE,
  validateCopilotContext,
  validateCopilotOutput,
  type ArtifactStore,
  type ConversationOwnerBinding,
  type ExactConversationRecordRef,
  type ConversationOwnerRecords,
  type CopilotTurn,
  type CopilotTerminal,
} from "@petra/core";
import type { PostgresArtifactAuthorityRepository } from "./artifact-authority-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "./interaction-authority-repository.js";
import { PostgresProjectThreadAuthorityRepository } from "./project-thread-authority-repository.js";
import { PostgresResearchScopeRepository } from "./research-scope-repository.js";
import { PostgresSingleUserCommandPrincipalResolver } from "./single-user-command-principal-resolver.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "./capability-grant-authority-repository.js";

const MEDIA_TYPE = "application/json";
const originalContent = ({
  terminal: ignoredTerminal,
  input_manifest: ignoredManifest,
  ...content
}: CopilotTurn) => {
  void ignoredTerminal;
  void ignoredManifest;
  return content;
};
const threadRef = (thread: PetraProjectThreadV11) => ({
  project_thread_id: thread.project_thread_id,
  revision: thread.revision,
  content_hash: thread.content_hash,
});
const runRef = (run: PetraInteractionRun) => ({
  interaction_run_id: run.interaction_run_id,
  revision: run.revision,
  content_hash: run.content_hash,
});
const workRef = (work: PetraWorkUnit) => ({
  work_unit_id: work.work_unit_id,
  revision: work.revision,
  spec_hash: work.spec_hash,
});
const definitionRef = (turn: CopilotTurn) => ({
  project_definition_id: turn.context.basis.definition.record_id,
  revision: turn.context.basis.definition.revision,
  content_hash: turn.context.basis.definition.content_hash,
  definition_family: turn.context.definition_family,
});
const artifactRef = (artifact: PetraArtifact) => ({
  artifact_id: artifact.artifact_id,
  content_hash: artifact.content_hash,
  byte_size: artifact.byte_size,
  media_type: artifact.media_type,
});
const lineageOwners = [
  {
    schema: "petra.work-unit",
    kind: "work-unit",
    category: "work",
    table: "work_unit_revisions",
    key: "work_unit_id",
  },
  {
    schema: "petra.project-objective",
    kind: "project-objective",
    category: "inquiries",
    table: "project_objective_revisions",
    key: "objective_id",
  },
  {
    schema: "petra.project-inquiry-role",
    kind: "project-inquiry-role",
    category: "inquiries",
    table: "project_inquiry_role_revisions",
    key: "project_inquiry_role_id",
  },
  {
    schema: "petra.review-session",
    kind: "review-session",
    category: "reviews",
    table: "review_session_revisions",
    key: "review_session_id",
  },
  ...[
    "hypothesis",
    "hypothesis-assessment",
    "posture-decision",
    "cycle-disposition",
  ].map((kind) => ({
    schema: `petra.${kind}`,
    kind,
    category: "cycles" as const,
    table: "project_examination_records",
    key: "record_id",
  })),
] as const;
export interface CanonicalCopilotOwnershipOptions {
  readonly actorId: string;
  readonly artifactStore: ArtifactStore;
  readonly artifacts: PostgresArtifactAuthorityRepository;
}

/** Content extensions cannot substitute for the existing Thread, Run and Work owners. */
export class CanonicalCopilotOwnership {
  readonly #contracts = new PetraContractRegistry();
  readonly #work: PostgresWorkUnitAuthorityRepository;
  readonly #runs: PostgresInteractionAuthorityRepository;
  readonly #threads: PostgresProjectThreadAuthorityRepository;
  readonly #principal: PostgresSingleUserCommandPrincipalResolver;
  constructor(
    readonly pool: Pool,
    readonly options: CanonicalCopilotOwnershipOptions,
  ) {
    this.#work = new PostgresWorkUnitAuthorityRepository(pool);
    this.#runs = new PostgresInteractionAuthorityRepository(pool);
    this.#threads = new PostgresProjectThreadAuthorityRepository(pool);
    this.#principal = new PostgresSingleUserCommandPrincipalResolver(pool, {
      actor_id: options.actorId,
      actor_kind: "human",
    });
  }
  async #serviceActor(): Promise<PetraActor> {
    const id = derivePetraId("actor", "petra.canonical-copilot-history@1.0.0");
    const read = async () =>
      (
        await this.pool.query<{ payload: PetraActor }>(
          "SELECT payload FROM petra.actors WHERE actor_id=$1",
          [id],
        )
      ).rows[0]?.payload;
    let actor = await read();
    if (actor === undefined) {
      actor = {
        schema_name: "petra.actor",
        schema_version: "1.0.0",
        actor_id: id,
        actor_kind: "service",
        display_name: "Petra conversation control plane",
        created_at: new Date().toISOString(),
      };
      try {
        await new PostgresResearchScopeRepository(this.pool).registerActor(
          actor,
        );
      } catch (error) {
        const concurrent = await read();
        if (concurrent === undefined) throw error;
        actor = concurrent;
      }
    }
    this.#contracts.assertValid("actor", "1.0.0", actor);
    if (actor.actor_kind !== "service")
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The conversation control plane requires its exact registered service Actor.",
      );
    return actor;
  }
  async retainContent(
    turn: CopilotTurn,
    terminal?: CopilotTerminal,
  ): Promise<PetraArtifact> {
    if (
      turn.actor_id !== this.options.actorId ||
      turn.context.project_id !== turn.project_id
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "Retained content requires the authenticated actor and exact Project context.",
      );
    this.#contracts.assertValid(
      "copilot-turn",
      turn.schema_version,
      originalContent(turn),
    );
    validateCopilotContext(turn.context);
    if (terminal?.state === "completed")
      validateCopilotOutput(terminal.output, turn.context);
    const content =
      terminal === undefined
        ? originalContent(turn)
        : conversationResultRecord(turn, terminal);
    const bytes = new TextEncoder().encode(canonicalize(content));
    const hash = copilotHash(content);
    const available = await this.options.artifactStore.makeAvailable(
      await this.options.artifactStore.stage({
        bytes: [bytes],
        declaredByteSize: bytes.byteLength,
        declaredMediaType: MEDIA_TYPE,
        expectedContentHash: hash,
      }),
    );
    const records = interactionContentArtifactRecords(
      {
        threadId: turn.thread_id,
        runId: turn.run_id,
        sequence: terminal === undefined ? 1 : 2,
      },
      available,
      await this.#serviceActor(),
      MEDIA_TYPE,
    );
    const existing = await this.options.artifacts.getArtifact(
      records.artifact.artifact_id,
    );
    if (existing !== undefined) {
      if (
        existing.content_hash !== hash ||
        existing.byte_size !== bytes.byteLength ||
        existing.media_type !== MEDIA_TYPE ||
        existing.artifact_kind !== "structured_text"
      )
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISMATCH",
          "The retained private content has a conflicting Artifact identity.",
        );
      return existing;
    }
    return (await this.options.artifacts.registerVerifiedAcquisition(records))
      .artifact;
  }
  async #authorize(client: PoolClient, turn: CopilotTurn) {
    let commandName: "RunProjectCopilot" | "ManageProjectWork" =
      "RunProjectCopilot";
    let principal = await this.#principal.resolveCommandPrincipal({
      projectId: turn.project_id,
      commandName,
    });
    if (
      principal.state === "denied" &&
      principal.reason === "active_grant_not_found"
    ) {
      commandName = "ManageProjectWork";
      principal = await this.#principal.resolveCommandPrincipal({
        projectId: turn.project_id,
        commandName,
      });
    }
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_id !== turn.actor_id ||
      !(await new PostgresCapabilityGrantCommandAuthorizer().authorize(
        {
          actor: principal.actor,
          capabilityGrantId: principal.capabilityGrantId,
          commandName,
          projectId: turn.project_id,
        },
        client,
      ))
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_WORK_NOT_AUTHORIZED",
        "Starting retained conversation Work requires the authenticated actor's current exact conversation or Project Work grant.",
      );
    return principal;
  }
  async begin(
    client: PoolClient,
    turn: CopilotTurn,
    inputArtifact: PetraArtifact,
    capture: "native" | "historical_adoption" = "native",
  ): Promise<void> {
    const principal = await this.#authorize(client, turn);
    const projectRow = await client.query<{ payload: PetraProject }>(
      "SELECT payload FROM petra.project_revisions WHERE project_id=$1 AND revision=$2",
      [turn.project_id, turn.context.basis.project_revision],
    );
    const project = projectRow.rows[0]?.payload;
    if (project === undefined || project.status !== "active")
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "Conversation privacy must resolve to the exact retained Project revision.",
      );
    this.#contracts.assertValid("project", "1.0.0", project);
    const definition = (
      await client.query<{ payload: { definition_family: string } }>(
        "SELECT payload FROM petra.project_definition_revisions WHERE project_id=$1 AND project_definition_id=$2 AND revision=$3 AND content_hash=$4",
        [
          turn.project_id,
          turn.context.basis.definition.record_id,
          turn.context.basis.definition.revision,
          turn.context.basis.definition.content_hash,
        ],
      )
    ).rows[0]?.payload;
    if (
      definition === undefined ||
      definition.definition_family !== turn.context.definition_family
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The retained conversation definition must resolve to its exact native family and revision.",
      );
    const service = await this.#serviceActor();
    const features: PetraInteractionFeatureManifest["content"] = {
      protocol: {
        name: "ag-ui",
        sdk_version: "0.0.59",
        profile_version: "1.1.0",
      },
      transports: ["text_event_stream"],
      standard_events: [
        "RUN_STARTED",
        "RUN_FINISHED",
        "RUN_ERROR",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "STATE_SNAPSHOT",
      ],
      custom_events: [],
      features: [
        {
          feature: "text_streaming",
          support: "supported",
          limitation:
            "Only complete validated responses are released; provider partial JSON is withheld.",
        },
        { feature: "state_projection", support: "supported" },
        {
          feature: "replay",
          support: "supported",
          limitation:
            "Retained terminal delivery reads these exact canonical owners and never starts another provider invocation.",
        },
        { feature: "activity", support: "deferred" },
        { feature: "tool_proposals", support: "deferred" },
        { feature: "interrupts", support: "deferred" },
        { feature: "resumption", support: "deferred" },
        { feature: "explicit_work_cancellation", support: "deferred" },
      ],
      authority_boundary: {
        grants_capabilities: false,
        interaction_state_is_authoritative: false,
        replay_reapplies_authority: false,
        connection_abort_cancels_work: false,
      },
    };
    const feature: PetraInteractionFeatureManifest = {
      schema_name: "petra.interaction-feature-manifest",
      schema_version: "1.0.0",
      interaction_feature_manifest_id: derivePetraId(
        "interaction_feature_manifest",
        copilotHash(features),
      ),
      revision: 1,
      content: features,
      content_hash: copilotHash(features),
      compiled_by: { actor_id: service.actor_id, actor_kind: "service" },
      compiled_at: service.created_at,
    };
    const runs = this.#runs.inTransaction(client),
      workRepo = this.#work.inTransaction(client),
      threads = this.#threads.inTransaction(client);
    await runs.registerFeatureManifest(feature);
    const at =
      capture === "native" ? turn.started_at : new Date().toISOString();
    const workId = derivePetraId(
      "work_unit",
      `copilot:${capture}:${turn.project_id}:${turn.actor_id}:${turn.run_id}`,
    );
    const input: PetraWorkerInputManifest["content"] = {
      task: {
        task_family: capture === "native" ? "reasoning" : "maintenance",
        task_name:
          capture === "native"
            ? "petra.copilot.answer"
            : "petra.copilot.adopt-history",
        task_version: "1.0.0",
      },
      worker: {
        executor_kind: "typescript_worker",
        worker_name: "petra.conversation",
        worker_version: "1.0.0",
        runtime_name: "node",
        runtime_version: process.versions.node,
        entrypoint:
          capture === "native"
            ? "ProjectCopilotRuntime.start"
            : "CanonicalCopilotOwnership.adopt",
      },
      inputs: [
        {
          binding_kind: "artifact",
          name: "retained_question",
          artifact_id: inputArtifact.artifact_id,
          content_hash: inputArtifact.content_hash,
          byte_size: inputArtifact.byte_size,
        },
      ],
      expected_outputs: [
        {
          output_name: "retained_result",
          output_role: "result",
          required: true,
          media_type: MEDIA_TYPE,
          max_bytes: 256000,
          contract: {
            schema_name: "petra.conversation-result",
            schema_version: "1.0.0",
            schema_hash: this.#contracts.entries.find(
              (entry) =>
                entry.name === "conversation-result" &&
                entry.version === "1.0.0",
            )!.canonical_sha256,
          },
        },
      ],
      resource_limits: {
        max_wall_time_ms: COPILOT_PROFILE.timeout_ms,
        max_output_bytes: 256000,
        max_attempts: 1,
        max_parallelism: 1,
      },
      network_policy:
        capture === "native"
          ? {
              network_mode: "allowlist",
              destinations: ["https://chatgpt.com"],
            }
          : { network_mode: "blocked" },
      partial_result_policy: "discard",
    };
    const manifest: PetraWorkerInputManifest = {
      schema_name: "petra.worker-input-manifest",
      schema_version: "1.0.0",
      worker_input_manifest_id: derivePetraId("worker_input_manifest", workId),
      revision: 1,
      work_unit_id: workId,
      project_id: turn.project_id,
      content: input,
      content_hash: copilotHash(input),
      issued_by: { actor_id: service.actor_id, actor_kind: "service" },
      issued_at: at,
    };
    const spec: PetraWorkUnit["spec"] = {
      workflow_name:
        capture === "native"
          ? "petra.copilot.answer"
          : "petra.copilot.adopt-history",
      workflow_version: "1.0.0",
      objective:
        capture === "native"
          ? "Deliver one bounded advisory answer against the exact retained question and authorized native Project basis. Delivery success creates no domain authority."
          : "Adopt existing private conversation bytes into canonical history. Original execution grants, controls and Work outcomes were not captured and are not reconstructed.",
      work_mode: "interactive",
      priority: "normal",
      dependency_work_unit_ids: [],
      input_manifest_ref: {
        worker_input_manifest_id: manifest.worker_input_manifest_id,
        content_hash: manifest.content_hash,
      },
      idempotency_key: `copilot:${capture}:${turn.run_id}`,
      cache: { cache_mode: "disabled" },
      cancellation_policy: "cancellable",
      checkpoint_policy: "disabled",
    };
    let work: PetraWorkUnit = {
      schema_name: "petra.work-unit",
      schema_version: "1.0.0",
      work_unit_id: workId,
      revision: 1,
      project_id: turn.project_id,
      spec,
      spec_hash: copilotHash(spec),
      status: { state: "requested", requested_at: at },
      capability_grant_id: principal.capabilityGrantId,
      trace_id: derivePetraId("trace", turn.run_id),
      created_by: { actor_id: service.actor_id, actor_kind: "service" },
      created_at: at,
      updated_at: at,
    };
    work = await workRepo.register({ workUnit: work, inputManifest: manifest });
    work = await workRepo.queue(workId, work.revision, at);
    work = await workRepo.start(workId, work.revision, 1, at);
    const content: PetraInteractionRun["content"] = {
      correlation: {
        protocol_thread_id: turn.thread_id,
        protocol_run_id: turn.run_id,
        request_id: derivePetraId("request", turn.run_id),
        trace_id: work.trace_id,
        work_unit_ref: workRef(work),
      },
      authority_context: {
        actor: principal.actor,
        capability_grant_id: principal.capabilityGrantId,
        privacy_profile_ref: {
          record_id: project.project_id,
          revision: project.revision,
          content_hash: copilotHash(project),
        },
        budget_profile_ref: {
          record_id: manifest.worker_input_manifest_id,
          revision: 1,
          content_hash: manifest.content_hash,
        },
      },
      input: {
        input_hash: inputArtifact.content_hash,
        source_message_id: turn.run_id,
      },
      lifecycle: { state: "running", started_at: at },
      stream_head: { state: "empty", event_count: 0 },
      authority_boundary: {
        interaction_state_is_authoritative: false,
        events_are_domain_ledger: false,
        connection_abort_cancels_work: false,
      },
    };
    const run: PetraInteractionRun = {
      schema_name: "petra.interaction-run",
      schema_version: "1.0.0",
      interaction_run_id: derivePetraId(
        "interaction_run",
        `copilot:${turn.project_id}:${turn.actor_id}:${turn.run_id}`,
      ),
      revision: 1,
      project_id: turn.project_id,
      feature_manifest_ref: {
        interaction_feature_manifest_id:
          feature.interaction_feature_manifest_id,
        revision: 1,
        content_hash: feature.content_hash,
      },
      lineage: { lineage_kind: "root" },
      content,
      content_hash: copilotHash(content),
      created_by: principal.actor,
      created_at: at,
      updated_at: at,
    };
    await runs.registerRun(run);
    const threadId = derivePetraId(
      "project_thread",
      `copilot:${turn.project_id}:${turn.actor_id}:${turn.thread_id}`,
    );
    let thread = await threads.getProjectThread(turn.project_id, threadId);
    if (thread === undefined) {
      const threadContent: PetraProjectThreadV11["content"] = {
        title: turn.context.project_label.slice(0, 500),
        task: "Review this Project's evidence, working material and next steps through retained advisory conversation.",
        lifecycle: "open",
        origin: { origin_kind: "root" },
        turns: [],
        retention: {
          state: "retained",
          limitation:
            "Exact private input and terminal content are retained as Artifacts. Conversation is advisory; provider partial JSON is withheld. Run budget controls bind real bounded Work limits; Project price accounting remains unavailable. Historical adoption records an import, not reconstructed execution authority.",
        },
      };
      thread = await threads.registerProjectThreadRevision({
        schema_name: "petra.project-thread",
        schema_version: "1.1.0",
        project_thread_id: threadId,
        revision: 1,
        project_id: turn.project_id,
        project_definition_ref: definitionRef(turn),
        lineage: { lineage_kind: "root" },
        content: threadContent,
        content_hash: copilotHash(threadContent),
        created_by: { actor_id: principal.actor.actor_id, actor_kind: "human" },
        created_at: at,
        updated_at: at,
      });
    }
    if (thread.schema_version !== "1.1.0")
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "Native conversation requires its registered canonical Thread version.",
      );
    await client.query(
      "INSERT INTO petra.project_copilot_context_refs(run_id,project_id,actor_id,context_record_id,context_hash,turn_content_hash,input_artifact_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        turn.run_id,
        turn.project_id,
        turn.actor_id,
        derivePetraId(
          "copilot_context",
          `${turn.run_id}:${turn.context.content_hash}`,
        ),
        turn.context.content_hash,
        inputArtifact.content_hash,
        inputArtifact.artifact_id,
      ],
    );
    await this.#bind(client, turn, thread, run, work, capture, 1);
  }
  async #resolveLineage(
    client: Pool | PoolClient,
    projectId: string,
    reference: ExactConversationRecordRef,
  ): Promise<ConversationOwnerRecords["lineage"][number]> {
    const owner = lineageOwners.find(
      (item) => item.schema === reference.schema_name,
    );
    if (owner === undefined)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "An exact conversation lineage schema lacks its canonical resolver.",
      );
    const row = (
      await client.query<{
        record_id: string;
        revision: string;
        project_id: string;
        payload: { schema_name: string; schema_version: string };
      }>(
        `SELECT ${owner.key} AS record_id,revision::text,project_id,payload FROM petra.${owner.table} WHERE project_id=$1 AND ${owner.key}=$2 AND revision=$3`,
        [projectId, reference.record_id, reference.revision],
      )
    ).rows[0];
    if (
      row === undefined ||
      row.payload.schema_name !== reference.schema_name ||
      row.payload.schema_version !== reference.schema_version ||
      copilotHash(row.payload) !== reference.record_hash
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The conversation lineage does not resolve to the exact native owned record.",
      );
    this.#contracts.assertValid(
      reference.schema_name.replace(/^petra\./u, ""),
      reference.schema_version,
      row.payload,
    );
    return {
      ref: reference,
      record_id: row.record_id,
      revision: Number(row.revision),
      project_id: row.project_id,
      payload: row.payload,
    };
  }
  async #lineage(
    client: PoolClient,
    turn: CopilotTurn,
    work: PetraWorkUnit,
  ): Promise<ConversationOwnerBinding["lineage"]> {
    const lineage: Record<
      "inquiries" | "work" | "reviews" | "cycles",
      ExactConversationRecordRef[]
    > = {
      inquiries: [],
      work: [
        {
          schema_name: "petra.work-unit",
          schema_version: "1.0.0",
          record_id: work.work_unit_id,
          revision: work.revision,
          record_hash: copilotHash(work),
        },
      ],
      reviews: [],
      cycles: [],
    };
    for (const contextRecord of turn.context.records) {
      const owner = lineageOwners.find(
        (item) => item.kind === contextRecord.kind,
      );
      if (owner === undefined) continue;
      const row = (
        await client.query<{
          payload: { schema_name: string; schema_version: string };
        }>(
          `SELECT payload FROM petra.${owner.table} WHERE project_id=$1 AND ${owner.key}=$2 AND revision=$3`,
          [
            turn.project_id,
            contextRecord.ref.record_id,
            contextRecord.ref.revision,
          ],
        )
      ).rows[0];
      if (row === undefined)
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISMATCH",
          "A supplied inquiry, Work, Review or examination record lacks its exact native owner.",
        );
      const reference: ExactConversationRecordRef = {
        schema_name: owner.schema,
        schema_version: row.payload.schema_version,
        ...contextRecord.ref,
      };
      await this.#resolveLineage(client, turn.project_id, reference);
      if (
        !lineage[owner.category].some(
          (ref) => copilotHash(ref) === copilotHash(reference),
        )
      )
        lineage[owner.category].push(reference);
    }
    const objective = turn.context.basis.objective;
    if (objective !== null) {
      const row = (
        await client.query<{
          payload: { schema_name: string; schema_version: string };
        }>(
          "SELECT payload FROM petra.project_objective_revisions WHERE project_id=$1 AND objective_id=$2 AND revision=$3 AND content_hash=$4",
          [
            turn.project_id,
            objective.record_id,
            objective.revision,
            objective.content_hash,
          ],
        )
      ).rows[0];
      if (row === undefined)
        throw new CopilotBoundaryError(
          "CONVERSATION_OWNER_MISMATCH",
          "The exact conversation inquiry anchor is missing.",
        );
      const reference: ExactConversationRecordRef = {
        schema_name: "petra.project-objective",
        schema_version: row.payload.schema_version,
        record_id: objective.record_id,
        revision: objective.revision,
        record_hash: copilotHash(row.payload),
      };
      await this.#resolveLineage(client, turn.project_id, reference);
      lineage.inquiries.push(reference);
    }
    return lineage;
  }
  async #bind(
    client: PoolClient,
    turn: CopilotTurn,
    thread: PetraProjectThreadV11,
    run: PetraInteractionRun,
    work: PetraWorkUnit,
    capture: ConversationOwnerBinding["capture"],
    revision: 1 | 2,
  ): Promise<void> {
    const binding: ConversationOwnerBinding = {
      project_id: turn.project_id,
      actor_id: turn.actor_id,
      protocol_thread_id: turn.thread_id,
      protocol_run_id: turn.run_id,
      project_thread_ref: threadRef(thread),
      project_turn_id: derivePetraId("project_turn", turn.run_id),
      interaction_run_ref: runRef(run),
      work_unit_ref: workRef(work),
      turn_content_hash: copilotHash(originalContent(turn)),
      lineage: await this.#lineage(client, turn, work),
      capture,
    };
    await client.query(
      `INSERT INTO petra.project_copilot_owner_bindings(run_id,revision,project_id,actor_id,project_thread_id,thread_revision,thread_hash,interaction_run_id,interaction_run_revision,interaction_run_hash,work_unit_id,work_unit_revision,work_unit_spec_hash,record_hash,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)`,
      [
        turn.run_id,
        revision,
        turn.project_id,
        turn.actor_id,
        thread.project_thread_id,
        thread.revision,
        thread.content_hash,
        run.interaction_run_id,
        run.revision,
        run.content_hash,
        work.work_unit_id,
        work.revision,
        work.spec_hash,
        copilotHash(binding),
        JSON.stringify(binding),
      ],
    );
  }
  async finish(
    client: PoolClient,
    turn: CopilotTurn,
    terminal: CopilotTerminal,
    responseArtifact: PetraArtifact,
  ): Promise<void> {
    const owned = await this.read(
      turn.project_id,
      turn.actor_id,
      turn.run_id,
      client,
    );
    if (owned === undefined)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "Terminal content requires its canonical retained execution owners.",
      );
    if (owned.records.run.content.lifecycle.state !== "running") return;
    const { binding } = owned;
    let { work, run } = owned.records;
    const workRepo = this.#work.inTransaction(client),
      runs = this.#runs.inTransaction(client),
      threads = this.#threads.inTransaction(client);
    const input = await workRepo.getInputManifest(
      work.spec.input_manifest_ref.worker_input_manifest_id,
    );
    if (input === undefined)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The conversation Work input manifest is missing.",
      );
    const historical = binding.capture === "historical_adoption";
    const ended = historical ? new Date().toISOString() : terminal.finished_at;
    const overDeadline =
      Date.parse(ended) - Date.parse(run.content.lifecycle.started_at) >
      input.content.resource_limits.max_wall_time_ms;
    if (!historical && terminal.state === "failed" && overDeadline) {
      work = await workRepo.failExecution(
        work.work_unit_id,
        work.revision,
        1,
        "timed_out",
        {
          code: "COPILOT_DELIVERY_DEADLINE_EXCEEDED",
          message: terminal.error!,
          retryable: false,
        },
        ended,
      );
    } else if (terminal.state !== "cancelled" || historical) {
      const content: PetraWorkerOutputManifestV11["content"] = {
        worker: input.content.worker,
        started_at: run.content.lifecycle.started_at,
        completed_at: ended,
        outcome:
          terminal.state === "failed" && !historical
            ? {
                outcome_kind: "worker_failed",
                failure: {
                  code: "COPILOT_DELIVERY_FAILED",
                  message: terminal.error!,
                  retryable: false,
                },
                produced_outputs: [],
              }
            : {
                outcome_kind: "succeeded",
                produced_outputs: [
                  {
                    output_name: "retained_result",
                    output_role: "result",
                    output_handle: `output:${responseArtifact.artifact_id}`,
                    content_hash: responseArtifact.content_hash,
                    byte_size: responseArtifact.byte_size,
                    media_type: responseArtifact.media_type,
                    contract: input.content.expected_outputs[0].contract!,
                  },
                ],
              },
        diagnostics: [
          {
            code: "ADVISORY_DELIVERY_ONLY",
            severity: "info",
            message: historical
              ? "This successful Work imports historical bytes. Original model execution authority and measured resources are unavailable."
              : "This Work records the actual advisory delivery outcome, not domain verification. Remote provider CPU, memory, network and token use are unavailable and are retained as unknown.",
          },
        ],
        network_activity: [],
        resource_usage: {
          wall_time_ms: Math.max(
            0,
            Date.parse(ended) - Date.parse(run.content.lifecycle.started_at),
          ),
          cpu_time_ms: null,
          peak_memory_bytes: null,
          input_bytes: input.content.inputs.reduce(
            (sum, item) =>
              sum + (item.binding_kind === "artifact" ? item.byte_size : 0),
            0,
          ),
          output_bytes: responseArtifact.byte_size,
          network_bytes: historical ? 0 : null,
          measurement_scope:
            "Wall time covers the retained bounded Work; byte counts cover exact retained input/result Artifacts. Provider CPU, memory, tokens, network bytes and price are unavailable. Historical adoption has no provider call.",
        },
      };
      const manifest: PetraWorkerOutputManifestV11 = {
        schema_name: "petra.worker-output-manifest",
        schema_version: "1.1.0",
        worker_output_manifest_id: derivePetraId(
          "worker_output_manifest",
          `${work.work_unit_id}:${responseArtifact.content_hash}`,
        ),
        revision: 1,
        work_unit_id: work.work_unit_id,
        project_id: turn.project_id,
        attempt: 1,
        worker_input_manifest_id: input.worker_input_manifest_id,
        worker_input_manifest_hash: input.content_hash,
        content,
        content_hash: copilotHash(content),
        reported_at: ended,
      };
      work = await workRepo.complete(manifest, work.revision);
    } else if (terminal.state === "cancelled")
      work = await workRepo.cancel(
        work.work_unit_id,
        work.revision,
        terminal.error ?? "The canonical conversation Work was cancelled.",
        ended,
      );
    const content: PetraInteractionRun["content"] = {
      ...run.content,
      lifecycle: {
        state: historical ? "completed" : terminal.state,
        started_at: run.content.lifecycle.started_at,
        ended_at: ended,
        outcome_code: historical
          ? "HISTORICAL_CONTENT_ADOPTED"
          : terminal.state === "completed"
            ? "ADVISORY_DELIVERED"
            : "ADVISORY_DELIVERY_UNAVAILABLE",
      },
    };
    run = await runs.registerRun({
      ...run,
      revision: run.revision + 1,
      lineage: {
        lineage_kind: "revision",
        parent_revision: run.revision,
        parent_hash: run.content_hash,
      },
      content,
      content_hash: copilotHash(content),
      updated_at: ended,
    });
    await client.query(
      "INSERT INTO petra.project_copilot_result_refs(run_id,result_record_id,result_hash,response_artifact_id) VALUES($1,$2,$3,$4)",
      [
        turn.run_id,
        derivePetraId("conversation_result", turn.run_id),
        responseArtifact.content_hash,
        responseArtifact.artifact_id,
      ],
    );
    const previous = await threads.getProjectThread(
      turn.project_id,
      binding.project_thread_ref.project_thread_id,
    );
    if (previous?.schema_version !== "1.1.0")
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The exact native ProjectThread is missing.",
      );
    const inputArtifact = (
      await client.query<{ payload: PetraArtifact; context_record_id: string }>(
        "SELECT a.payload,c.context_record_id FROM petra.project_copilot_context_refs c JOIN petra.artifacts a ON a.artifact_id=c.input_artifact_id WHERE c.run_id=$1",
        [turn.run_id],
      )
    ).rows[0]!;
    const nativeTurn: PetraProjectThreadV11["content"]["turns"][number] = {
      project_turn_id: binding.project_turn_id,
      sequence: previous.content.turns.length + 1,
      ...(previous.content.turns.length === 0
        ? {}
        : { previous_turn_id: previous.content.turns.at(-1)!.project_turn_id }),
      project_definition_ref: definitionRef(turn),
      ...(turn.context.basis.objective === null
        ? {}
        : {
            objective_ref: {
              objective_id: turn.context.basis.objective.record_id,
              revision: turn.context.basis.objective.revision,
              content_hash: turn.context.basis.objective.content_hash,
            },
          }),
      input: {
        retention_state: "retained_artifact",
        input_hash: binding.turn_content_hash,
        source_message_id: turn.run_id,
        artifact_ref: artifactRef(inputArtifact.payload),
      },
      context: {
        context_record_ref: {
          schema_name: "petra.copilot-context",
          schema_version: "1.0.0",
          record_id: inputArtifact.context_record_id,
          revision: 1,
          content_hash: turn.context.content_hash,
        },
        basis: turn.context.basis,
        included_object_count: turn.context.records.length,
        omission_count: null,
        coverage_state: "bounded",
        coverage_statement:
          "Only the exact supplied bounded Project context was used. Its limitations retain omissions; absence is not an exhaustive finding.",
      },
      execution: {
        interaction_run_ref: runRef(run),
        work_unit_ref: workRef(work),
      },
      authority_context: {
        ...run.content.authority_context,
        review_policy: {
          state: "unavailable",
          reason:
            "This advisory conversation does not decide or approve proposals.",
        },
      },
      response: {
        state: terminal.state,
        result_record_ref: {
          schema_name: "petra.conversation-result",
          schema_version: "1.0.0",
          record_id: derivePetraId("conversation_result", turn.run_id),
          revision: 1,
          content_hash: responseArtifact.content_hash,
        },
        response_artifact_ref: artifactRef(responseArtifact),
        force: "explanation_only",
        authority_effect: "none",
      },
      compaction: { state: "unmodified" },
      proposal_decision_linkage: {
        state: "unavailable",
        reason: "No proposal decision is inferred from advisory wording.",
      },
      presentation_context: {
        state: "unavailable",
        reason:
          turn.shared_scene === undefined
            ? "No exact graph presentation was supplied."
            : "The exact supplied scene is retained in the original native input Artifact.",
      },
      recorded_at: terminal.finished_at,
    };
    const threadContent = {
      ...previous.content,
      turns: [...previous.content.turns, nativeTurn],
    };
    const thread = await threads.registerProjectThreadRevision({
      ...previous,
      revision: previous.revision + 1,
      project_definition_ref: definitionRef(turn),
      lineage: {
        lineage_kind: "revision",
        parent_revision: previous.revision,
        parent_hash: previous.content_hash,
      },
      content: threadContent,
      content_hash: copilotHash(threadContent),
      updated_at: ended,
    });
    if (thread.schema_version !== "1.1.0")
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The native Thread version changed.",
      );
    await this.#bind(client, turn, thread, run, work, binding.capture, 2);
  }
  async read(
    projectId: string,
    actorId: string,
    runId: string,
    client: Pool | PoolClient = this.pool,
  ): Promise<
    | { binding: ConversationOwnerBinding; records: ConversationOwnerRecords }
    | undefined
  > {
    const row = (
      await client.query<{
        payload: ConversationOwnerBinding;
        record_hash: string;
        thread: PetraProjectThreadV11;
        run: PetraInteractionRun;
        work: PetraWorkUnit;
      }>(
        `SELECT b.payload,b.record_hash,t.payload AS thread,r.payload AS run,w.payload AS work FROM petra.project_copilot_owner_bindings b JOIN petra.project_thread_revisions t ON t.project_thread_id=b.project_thread_id AND t.revision=b.thread_revision JOIN petra.interaction_run_revisions r ON r.interaction_run_id=b.interaction_run_id AND r.revision=b.interaction_run_revision JOIN petra.work_unit_revisions w ON w.work_unit_id=b.work_unit_id AND w.revision=b.work_unit_revision WHERE b.project_id=$1 AND b.actor_id=$2 AND b.run_id=$3 ORDER BY b.revision DESC LIMIT 1`,
        [projectId, actorId, runId],
      )
    ).rows[0];
    if (row === undefined) return undefined;
    if (copilotHash(row.payload) !== row.record_hash)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The immutable conversation binding hash is corrupt.",
      );
    const controls = row.run.content.authority_context;
    const project = (
      await client.query<{ payload: PetraProject }>(
        "SELECT payload FROM petra.project_revisions WHERE project_id=$1 AND revision=$2",
        [projectId, controls.privacy_profile_ref.revision],
      )
    ).rows[0]?.payload;
    const input = (
      await client.query<{ payload: PetraWorkerInputManifest }>(
        "SELECT payload FROM petra.worker_input_manifests WHERE worker_input_manifest_id=$1 AND work_unit_id=$2 AND project_id=$3",
        [
          controls.budget_profile_ref.record_id,
          row.work.work_unit_id,
          projectId,
        ],
      )
    ).rows[0]?.payload;
    if (
      project === undefined ||
      controls.privacy_profile_ref.record_id !== projectId ||
      copilotHash(project) !== controls.privacy_profile_ref.content_hash ||
      input === undefined ||
      input.revision !== controls.budget_profile_ref.revision ||
      input.content_hash !== controls.budget_profile_ref.content_hash ||
      input.content_hash !== copilotHash(input.content) ||
      row.work.spec.input_manifest_ref.worker_input_manifest_id !==
        input.worker_input_manifest_id ||
      row.work.spec.input_manifest_ref.content_hash !== input.content_hash
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISMATCH",
        "The retained conversation controls do not resolve to their exact Project privacy and bounded Work input owners.",
      );
    this.#contracts.assertValid("project", "1.0.0", project);
    this.#contracts.assertValid("worker-input-manifest", "1.0.0", input);
    const references = [
      ...row.payload.lineage.inquiries,
      ...row.payload.lineage.work,
      ...row.payload.lineage.reviews,
      ...row.payload.lineage.cycles,
    ];
    const lineage = [];
    for (const reference of references)
      lineage.push(await this.#resolveLineage(client, projectId, reference));
    return {
      binding: row.payload,
      records: { thread: row.thread, run: row.run, work: row.work, lineage },
    };
  }

  async assert(
    turn: CopilotTurn,
    client: Pool | PoolClient = this.pool,
  ): Promise<void> {
    const owned = await this.read(
      turn.project_id,
      turn.actor_id,
      turn.run_id,
      client,
    );
    if (owned === undefined)
      throw new CopilotBoundaryError(
        "CONVERSATION_OWNER_MISSING",
        "This retained conversation requires canonical ownership before content can be released.",
      );
    assertConversationOwnerBinding(
      turn,
      owned.binding,
      owned.records,
      this.#contracts,
    );
  }
}
