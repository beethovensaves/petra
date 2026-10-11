import type { Pool, PoolClient } from "pg";
import { canonicalize } from "json-canonicalize";
import type {
  PetraActor,
  PetraArtifact,
  PetraInteractionRun,
  PetraProject,
  PetraProjectDefinition,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifestV11,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  derivePetraId,
  interactionContentArtifactRecords,
  validateWorkingPlan,
  validateWorkingPlanInput,
  validateCopilotCommandReceipt,
  assertCopilotCommandPreview,
  decidedCopilotCommandRequest,
  WORKING_PLAN_PROFILE,
  type CopilotCommandProposalRepository,
  type CopilotHumanCommandDecision,
  type CopilotProposalOrigin,
  type OwnedCopilotCommandDecision,
  type OwnedCopilotCommandProposal,
} from "@petra/core";
import {
  CanonicalCopilotOwnership,
  type CanonicalCopilotOwnershipOptions,
} from "./canonical-copilot-ownership.js";
import { PostgresCopilotTurnRepository } from "./project-copilot-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "./interaction-authority-repository.js";
import { PostgresResearchScopeRepository } from "./research-scope-repository.js";
import { PostgresSingleUserCommandPrincipalResolver } from "./single-user-command-principal-resolver.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "./capability-grant-authority-repository.js";

type Begin = Parameters<CopilotCommandProposalRepository["begin"]>[0];
type Result = Parameters<CopilotCommandProposalRepository["complete"]>[2];
type StartRow = {
  proposal_id: string;
  project_id: string;
  actor_id: string;
  input_artifact_id: string;
  input_hash: string;
  work_unit_id: string;
  interaction_run_id: string;
};
type TerminalRow = {
  state: "completed" | "failed";
  output_artifact_id: string | null;
  output_hash: string | null;
  error: string | null;
};
const assertOwner = (condition: boolean, message: string): void => {
  if (!condition)
    throw new CopilotBoundaryError("COMMAND_PROPOSAL_OWNER_MISMATCH", message);
};
const workRef = (work: PetraWorkUnit) => ({
  work_unit_id: work.work_unit_id,
  revision: work.revision,
  spec_hash: work.spec_hash,
});
const runRef = (run: PetraInteractionRun) => ({
  interaction_run_id: run.interaction_run_id,
  revision: run.revision,
  content_hash: run.content_hash,
});

/**
 * Proposal activities attach to an immutable canonical conversation turn.
 * Inputs and typed role outputs live in verified private Artifacts; bounded
 * WorkUnit and InteractionRun owners retain the actual delivery lifecycle.
 * SQL below indexes those owners and never substitutes for conversation text.
 */
export class PostgresCopilotCommandProposalRepository implements CopilotCommandProposalRepository {
  readonly contracts = new PetraContractRegistry();
  readonly turns: PostgresCopilotTurnRepository;
  readonly ownership: CanonicalCopilotOwnership;
  readonly work: PostgresWorkUnitAuthorityRepository;
  readonly runs: PostgresInteractionAuthorityRepository;
  readonly principal: PostgresSingleUserCommandPrincipalResolver;
  constructor(
    readonly pool: Pool,
    readonly options: CanonicalCopilotOwnershipOptions,
  ) {
    this.turns = new PostgresCopilotTurnRepository(pool, options);
    this.ownership = new CanonicalCopilotOwnership(pool, options);
    this.work = new PostgresWorkUnitAuthorityRepository(pool);
    this.runs = new PostgresInteractionAuthorityRepository(pool);
    this.principal = new PostgresSingleUserCommandPrincipalResolver(pool, {
      actor_id: options.actorId,
      actor_kind: "human",
    });
  }

  async #authorize(
    projectId: string,
    actorId: string,
    transactionClient?: PoolClient,
  ) {
    const query = transactionClient ?? (await this.pool.connect());
    try {
      assertOwner(
        actorId === this.options.actorId,
        "The proposal Actor differs from the authenticated owner.",
      );
      const project = (
        await query.query<{ payload: PetraProject; record_hash: string }>(
          "SELECT r.payload,r.record_hash FROM petra.projects p JOIN petra.project_revisions r ON r.project_id=p.project_id AND r.revision=p.current_revision WHERE p.project_id=$1 AND p.created_by_actor_id=$2 AND p.created_by_actor_kind='human'",
          [projectId, actorId],
        )
      ).rows[0];
      assertOwner(
        project !== undefined &&
          project.payload.status === "active" &&
          copilotHash(project.payload) === project.record_hash,
        "The exact active Project is unavailable to this owner.",
      );
      let commandName: "RunProjectCopilot" | "ManageProjectWork" =
        "RunProjectCopilot";
      let principal = await this.principal.resolveCommandPrincipal({
        projectId,
        commandName,
      });
      if (
        principal.state === "denied" &&
        principal.reason === "active_grant_not_found"
      ) {
        commandName = "ManageProjectWork";
        principal = await this.principal.resolveCommandPrincipal({
          projectId,
          commandName,
        });
      }
      assertOwner(
        principal.state === "resolved",
        "Current exact conversation permission is required for proposal activity.",
      );
      if (principal.state !== "resolved")
        throw new Error("Unreachable denied proposal principal.");
      assertOwner(
        principal.actor.actor_id === actorId &&
          (await new PostgresCapabilityGrantCommandAuthorizer().authorize(
            {
              actor: principal.actor,
              capabilityGrantId: principal.capabilityGrantId,
              projectId,
              commandName,
            },
            query,
          )),
        "The proposal requires the authenticated Actor's current exact grant.",
      );
      return { principal, project: project!.payload };
    } finally {
      if (transactionClient === undefined) query.release();
    }
  }

  async readOrigin(
    projectId: string,
    actorId: string,
    runId: string,
  ): Promise<CopilotProposalOrigin> {
    await this.#authorize(projectId, actorId);
    const turn = await this.turns.get(projectId, actorId, runId);
    const owned = await this.ownership.read(projectId, actorId, runId);
    assertOwner(
      turn?.terminal?.state === "completed" &&
        owned?.records.run.content.lifecycle.state === "completed",
      "A proposal activity requires its exact completed retained conversation turn.",
    );
    const native = owned!.records.thread.content.turns.find(
      (entry) => entry.input.source_message_id === runId,
    );
    assertOwner(
      native !== undefined &&
        native.response.state === "completed" &&
        native.authority_context.actor.actor_id === actorId,
      "The proposal origin must resolve to its immutable canonical ProjectThread turn.",
    );
    return {
      project_id: projectId,
      actor_id: actorId,
      protocol_run_id: runId,
      project_turn_id: native!.project_turn_id,
      project_thread_ref: owned!.binding.project_thread_ref,
      interaction_run_ref: owned!.binding.interaction_run_ref,
      question: turn!.question,
    };
  }

  async #serviceActor(): Promise<PetraActor> {
    const id = derivePetraId("actor", "petra.copilot-command-proposal@1.0.0");
    const read = async () =>
      (
        await this.pool.query<{ payload: PetraActor }>(
          "SELECT payload FROM petra.actors WHERE actor_id=$1",
          [id],
        )
      ).rows[0]?.payload;
    let actor = await read();
    if (actor === undefined) {
      const candidate: PetraActor = {
        schema_name: "petra.actor",
        schema_version: "1.0.0",
        actor_id: id,
        actor_kind: "service",
        display_name: "Petra command proposal control plane",
        created_at: new Date().toISOString(),
      };
      try {
        await new PostgresResearchScopeRepository(this.pool).registerActor(
          candidate,
        );
        actor = candidate;
      } catch (error) {
        actor = await read();
        if (actor === undefined) throw error;
      }
    }
    this.contracts.assertValid("actor", "1.0.0", actor);
    assertOwner(
      actor.actor_kind === "service",
      "The proposal control plane requires its exact service Actor.",
    );
    return actor;
  }
  async #retain(
    value: unknown,
    identity: string,
    sequence: number,
  ): Promise<PetraArtifact> {
    const bytes = new TextEncoder().encode(canonicalize(value));
    const available = await this.options.artifactStore.makeAvailable(
      await this.options.artifactStore.stage({
        bytes: [bytes],
        declaredByteSize: bytes.byteLength,
        declaredMediaType: "application/json",
        expectedContentHash: copilotHash(value),
      }),
    );
    const records = interactionContentArtifactRecords(
      { threadId: `proposal:${identity}`, runId: identity, sequence },
      available,
      await this.#serviceActor(),
      "application/json",
    );
    const existing = await this.options.artifacts.getArtifact(
      records.artifact.artifact_id,
    );
    if (existing !== undefined) {
      assertOwner(
        existing.content_hash === available.contentHash &&
          existing.byte_size === available.byteSize &&
          existing.media_type === "application/json",
        "The private proposal Artifact identity is corrupt.",
      );
      return existing;
    }
    try {
      return (await this.options.artifacts.registerVerifiedAcquisition(records))
        .artifact;
    } catch (error) {
      const concurrent = await this.options.artifacts.getArtifact(
        records.artifact.artifact_id,
      );
      if (
        concurrent === undefined ||
        concurrent.content_hash !== available.contentHash ||
        concurrent.byte_size !== available.byteSize ||
        concurrent.media_type !== "application/json"
      )
        throw error;
      return concurrent;
    }
  }
  async #content<T>(artifactId: string, hash?: string): Promise<T> {
    const artifact = await this.options.artifacts.getArtifact(artifactId);
    assertOwner(
      artifact !== undefined &&
        artifact.media_type === "application/json" &&
        (hash === undefined || artifact.content_hash === hash),
      "The exact private proposal Artifact is missing or corrupt.",
    );
    const read = await this.options.artifactStore.readByHash(
      artifact!.content_hash,
      { byteSize: artifact!.byte_size, mediaType: artifact!.media_type },
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of read.bytes) chunks.push(chunk);
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
    assertOwner(
      copilotHash(value) === artifact!.content_hash,
      "The retained private proposal bytes do not match their canonical identity.",
    );
    return value;
  }
  async #transaction<T>(
    identity: string,
    action: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const client = await this.pool.connect();
      const lock = `copilot-proposal:${identity}`;
      let locked = false;
      let begun = false;
      try {
        // Acquire serialization before taking the transaction snapshot. Taking
        // a snapshot while waiting on an xact lock hides the preceding commit.
        await client.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [
          lock,
        ]);
        locked = true;
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        begun = true;
        const result = await action(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        if (begun) await client.query("ROLLBACK");
        const code = (error as { code?: string }).code;
        if (attempt < 2 && (code === "40001" || code === "40P01")) continue;
        throw error;
      } finally {
        try {
          if (locked)
            await client.query(
              "SELECT pg_advisory_unlock(hashtextextended($1,0))",
              [lock],
            );
        } finally {
          client.release();
        }
      }
    }
    throw new Error("The bounded proposal transaction retries were exhausted.");
  }
  async #start(
    projectId: string,
    actorId: string,
    proposalId: string,
    query: Pool | PoolClient = this.pool,
  ): Promise<StartRow | undefined> {
    return (
      await query.query<StartRow>(
        "SELECT * FROM petra.copilot_command_proposals WHERE proposal_id=$1 AND project_id=$2 AND actor_id=$3",
        [proposalId, projectId, actorId],
      )
    ).rows[0];
  }
  async #read(
    start: StartRow,
    query: Pool | PoolClient = this.pool,
  ): Promise<OwnedCopilotCommandProposal> {
    const input = await this.#content<Begin>(
      start.input_artifact_id,
      start.input_hash,
    );
    assertOwner(
      input.proposal_id === start.proposal_id &&
        input.actor_id === start.actor_id &&
        input.origin.project_id === start.project_id,
      "The proposal index differs from its exact private input owner.",
    );
    validateWorkingPlanInput(input.input);
    input.commands.forEach((command) =>
      assertCopilotCommandPreview(command, input.input.context),
    );
    const workRepo =
      query === this.pool
        ? this.work
        : this.work.inTransaction(query as PoolClient);
    const runRepo =
      query === this.pool
        ? this.runs
        : this.runs.inTransaction(query as PoolClient);
    const work = await workRepo.getWorkUnit(start.work_unit_id);
    const run = await runRepo.getRun(start.interaction_run_id);
    assertOwner(
      work?.project_id === start.project_id &&
        run?.project_id === start.project_id &&
        run.content.authority_context.actor.actor_id === start.actor_id &&
        run.content.input.input_hash === start.input_hash &&
        run.content.correlation.work_unit_ref.work_unit_id ===
          start.work_unit_id,
      "The proposal must resolve to its exact canonical Work and InteractionRun.",
    );
    const manifest = await workRepo.getInputManifest(
      work!.spec.input_manifest_ref.worker_input_manifest_id,
    );
    const controls = run!.content.authority_context;
    assertOwner(
      manifest !== undefined &&
        manifest.work_unit_id === start.work_unit_id &&
        manifest.project_id === start.project_id &&
        manifest.content_hash === work!.spec.input_manifest_ref.content_hash &&
        controls.capability_grant_id === work!.capability_grant_id &&
        controls.budget_profile_ref.record_id ===
          manifest.worker_input_manifest_id &&
        controls.budget_profile_ref.revision === manifest.revision &&
        controls.budget_profile_ref.content_hash === manifest.content_hash &&
        manifest.content.inputs.some(
          (entry) =>
            entry.binding_kind === "artifact" &&
            entry.artifact_id === start.input_artifact_id &&
            entry.content_hash === start.input_hash,
        ),
      "The proposal input and budget must resolve to the exact canonical Work manifest.",
    );
    const privacy = (
      await query.query<{ payload: PetraProject; record_hash: string }>(
        "SELECT payload,record_hash FROM petra.project_revisions WHERE project_id=$1 AND revision=$2",
        [start.project_id, controls.privacy_profile_ref.revision],
      )
    ).rows[0];
    assertOwner(
      privacy !== undefined &&
        controls.privacy_profile_ref.record_id === start.project_id &&
        copilotHash(privacy.payload) === privacy.record_hash &&
        privacy.record_hash === controls.privacy_profile_ref.content_hash,
      "The retained proposal privacy control must resolve to its exact Project revision.",
    );
    const terminal = (
      await query.query<TerminalRow>(
        "SELECT state,output_artifact_id,output_hash,error FROM petra.copilot_command_proposal_terminals WHERE proposal_id=$1",
        [start.proposal_id],
      )
    ).rows[0];
    if (terminal === undefined) {
      assertOwner(
        work!.status.state === "running" &&
          run!.content.lifecycle.state === "running",
        "Unfinished proposal owners have inconsistent lifecycle.",
      );
      return {
        ...input,
        state: "running",
        work_unit_ref: workRef(work!),
        interaction_run_ref: runRef(run!),
      };
    }
    assertOwner(
      run!.content.lifecycle.state === terminal.state &&
        work!.status.state === "completed",
      "The retained proposal terminal differs from its canonical delivery lifecycle.",
    );
    if (terminal.state === "failed")
      return {
        ...input,
        state: "failed",
        work_unit_ref: workRef(work!),
        interaction_run_ref: runRef(run!),
        error: terminal.error!,
      };
    const output = await this.#content<Result["output"]>(
      terminal.output_artifact_id!,
      terminal.output_hash!,
    );
    validateWorkingPlan(output, input.input);
    assertOwner(
      work!.status.state === "completed" &&
        work!.status.terminal_outcome === "succeeded",
      "Completed proposal delivery requires successful bounded Work.",
    );
    if (
      work!.status.state !== "completed" ||
      work!.status.terminal_outcome !== "succeeded"
    )
      throw new Error("Unreachable unsuccessful proposal output.");
    const produced = await workRepo.getOutputManifest(
      work!.status.output_manifest_ref.worker_output_manifest_id,
    );
    assertOwner(
      produced !== undefined &&
        produced.content_hash ===
          work!.status.output_manifest_ref.content_hash &&
        produced.work_unit_id === start.work_unit_id &&
        produced.project_id === start.project_id &&
        produced.worker_input_manifest_id ===
          manifest!.worker_input_manifest_id &&
        produced.worker_input_manifest_hash === manifest!.content_hash &&
        produced.content.outcome.outcome_kind === "succeeded" &&
        produced.content.outcome.produced_outputs.some(
          (entry) =>
            entry.output_name === "retained_proposal" &&
            entry.output_role === "proposal" &&
            entry.output_handle === `output:${terminal.output_artifact_id}` &&
            entry.content_hash === terminal.output_hash &&
            entry.contract?.schema_name === "petra.copilot-working-plan" &&
            entry.contract.schema_version === "1.0.0",
        ),
      "The proposed output must resolve to the exact successful canonical worker output manifest.",
    );
    return {
      ...input,
      state: "completed",
      work_unit_ref: workRef(work!),
      interaction_run_ref: runRef(run!),
      output,
      output_hash: terminal.output_hash!,
    };
  }

  async begin(
    input: Begin,
  ): Promise<{ created: boolean; proposal: OwnedCopilotCommandProposal }> {
    assertOwner(
      input.input.project_id === input.origin.project_id &&
        input.input.context.project_id === input.origin.project_id &&
        input.actor_id === input.origin.actor_id &&
        input.input.question === input.origin.question,
      "Proposal input cannot substitute a foreign Project, Actor or original question.",
    );
    validateWorkingPlanInput(input.input);
    input.commands.forEach((command) =>
      assertCopilotCommandPreview(command, input.input.context),
    );
    assertOwner(
      copilotHash(input.input.previews) ===
        copilotHash(input.commands.map((command) => command.preview)),
      "Proposal command catalogue differs from the exact model input.",
    );
    const origin = await this.readOrigin(
      input.origin.project_id,
      input.actor_id,
      input.origin.protocol_run_id,
    );
    assertOwner(
      copilotHash(origin) === copilotHash(input.origin),
      "The proposal attempted to substitute its retained origin turn.",
    );
    const definition = (
      await this.pool.query<{
        payload: PetraProjectDefinition;
        record_hash: string;
      }>(
        "SELECT r.payload,r.record_hash FROM petra.project_definitions h JOIN petra.project_definition_revisions r ON r.project_definition_id=h.project_definition_id AND r.revision=h.current_revision WHERE h.project_id=$1 AND h.project_definition_id=$2 AND r.revision=$3 AND r.content_hash=$4",
        [
          origin.project_id,
          input.input.context.basis.definition.record_id,
          input.input.context.basis.definition.revision,
          input.input.context.basis.definition.content_hash,
        ],
      )
    ).rows[0];
    assertOwner(
      definition !== undefined &&
        definition.payload.definition_family ===
          input.input.context.definition_family &&
        copilotHash(definition.payload) === definition.record_hash,
      "The exact current native ProjectDefinition must own the proposal basis.",
    );
    const artifact = await this.#retain(input, input.proposal_id, 1);
    const service = await this.#serviceActor();
    const created = await this.#transaction(
      input.proposal_id,
      async (client) => {
        const existing = await this.#start(
          input.origin.project_id,
          input.actor_id,
          input.proposal_id,
          client,
        );
        if (existing !== undefined) {
          assertOwner(
            existing.input_hash === artifact.content_hash,
            "The proposal identity already belongs to different immutable input.",
          );
          return false;
        }
        const { principal, project } = await this.#authorize(
          input.origin.project_id,
          input.actor_id,
          client,
        );
        assertOwner(
          project.revision === input.input.context.basis.project_revision,
          "The Project changed before proposal Work could start.",
        );
        const originRun = await this.runs
          .inTransaction(client)
          .getRunRevision(
            origin.interaction_run_ref.interaction_run_id,
            origin.interaction_run_ref.revision,
          );
        assertOwner(
          originRun !== undefined &&
            originRun.content_hash === origin.interaction_run_ref.content_hash,
          "The exact origin InteractionRun is unavailable.",
        );
        const at = new Date().toISOString();
        const workId = derivePetraId(
          "work_unit",
          `command-proposal:${input.proposal_id}`,
        );
        const content: PetraWorkerInputManifest["content"] = {
          task: {
            task_family: "reasoning",
            task_name: "petra.copilot.command-proposal",
            task_version: "1.0.0",
          },
          worker: {
            executor_kind: "typescript_worker",
            worker_name: "petra.command-proposal",
            worker_version: "1.0.0",
            runtime_name: "node",
            runtime_version: process.versions.node,
            entrypoint: "CopilotCommandBridge.propose",
          },
          inputs: [
            {
              binding_kind: "artifact",
              name: "retained_proposal_input",
              artifact_id: artifact.artifact_id,
              content_hash: artifact.content_hash,
              byte_size: artifact.byte_size,
            },
          ],
          expected_outputs: [
            {
              output_name: "retained_proposal",
              output_role: "proposal",
              required: true,
              media_type: "application/json",
              max_bytes: WORKING_PLAN_PROFILE.max_output_bytes,
              contract: {
                schema_name: "petra.copilot-working-plan",
                schema_version: "1.0.0",
                schema_hash: this.contracts.entries.find(
                  (entry) =>
                    entry.name === "copilot-working-plan" &&
                    entry.version === "1.0.0",
                )!.canonical_sha256,
              },
            },
          ],
          resource_limits: {
            max_wall_time_ms: WORKING_PLAN_PROFILE.timeout_ms,
            max_output_bytes: WORKING_PLAN_PROFILE.max_output_bytes,
            max_attempts: 1,
            max_parallelism: 1,
          },
          network_policy: {
            network_mode: "allowlist",
            destinations: ["https://chatgpt.com"],
          },
          partial_result_policy: "discard",
        };
        const manifest: PetraWorkerInputManifest = {
          schema_name: "petra.worker-input-manifest",
          schema_version: "1.0.0",
          worker_input_manifest_id: derivePetraId(
            "worker_input_manifest",
            workId,
          ),
          revision: 1,
          work_unit_id: workId,
          project_id: project.project_id,
          content,
          content_hash: copilotHash(content),
          issued_by: { actor_id: service.actor_id, actor_kind: "service" },
          issued_at: at,
        };
        const spec: PetraWorkUnit["spec"] = {
          workflow_name: "petra.copilot.command-proposal",
          workflow_version: "1.0.0",
          objective:
            "Deliver a bounded proposed-only selection from exact authorized native command previews. Delivery applies no command and establishes no domain authority.",
          work_mode: "interactive",
          priority: "normal",
          dependency_work_unit_ids: [],
          input_manifest_ref: {
            worker_input_manifest_id: manifest.worker_input_manifest_id,
            content_hash: manifest.content_hash,
          },
          idempotency_key: `command-proposal:${input.proposal_id}`,
          cache: { cache_mode: "disabled" },
          cancellation_policy: "cancellable",
          checkpoint_policy: "disabled",
        };
        const workRepo = this.work.inTransaction(client);
        let work = await workRepo.register({
          workUnit: {
            schema_name: "petra.work-unit",
            schema_version: "1.0.0",
            work_unit_id: workId,
            revision: 1,
            project_id: project.project_id,
            spec,
            spec_hash: copilotHash(spec),
            status: { state: "requested", requested_at: at },
            capability_grant_id: principal.capabilityGrantId,
            trace_id: derivePetraId("trace", input.proposal_id),
            created_by: { actor_id: service.actor_id, actor_kind: "service" },
            created_at: at,
            updated_at: at,
          },
          inputManifest: manifest,
        });
        work = await workRepo.queue(workId, work.revision, at);
        work = await workRepo.start(workId, work.revision, 1, at);
        const runContent: PetraInteractionRun["content"] = {
          correlation: {
            protocol_thread_id: `command-proposal:${origin.project_thread_ref.project_thread_id}`,
            protocol_run_id: input.proposal_id,
            request_id: derivePetraId("request", input.proposal_id),
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
            input_hash: artifact.content_hash,
            source_message_id: input.proposal_id,
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
            `command-proposal:${input.proposal_id}`,
          ),
          revision: 1,
          project_id: project.project_id,
          feature_manifest_ref: originRun!.feature_manifest_ref,
          lineage: { lineage_kind: "root" },
          content: runContent,
          content_hash: copilotHash(runContent),
          created_by: principal.actor,
          created_at: at,
          updated_at: at,
        };
        await this.runs.inTransaction(client).registerRun(run);
        await client.query(
          "INSERT INTO petra.copilot_command_proposals(proposal_id,project_id,actor_id,origin_run_id,origin_thread_id,origin_thread_revision,origin_thread_hash,origin_turn_id,input_artifact_id,input_hash,work_unit_id,interaction_run_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [
            input.proposal_id,
            project.project_id,
            input.actor_id,
            origin.protocol_run_id,
            origin.project_thread_ref.project_thread_id,
            origin.project_thread_ref.revision,
            origin.project_thread_ref.content_hash,
            origin.project_turn_id,
            artifact.artifact_id,
            artifact.content_hash,
            workId,
            run.interaction_run_id,
          ],
        );
        return true;
      },
    );
    return {
      created,
      proposal: await this.read(
        input.origin.project_id,
        input.actor_id,
        input.proposal_id,
      ),
    };
  }

  async read(
    projectId: string,
    actorId: string,
    proposalId: string,
  ): Promise<OwnedCopilotCommandProposal> {
    await this.#authorize(projectId, actorId);
    const start = await this.#start(projectId, actorId, proposalId);
    assertOwner(
      start !== undefined,
      "The proposal is unavailable in this exact authorized Project.",
    );
    let proposal = await this.#transaction(`read:${proposalId}`, (client) =>
      this.#read(start!, client),
    );
    if (proposal.state === "running") {
      const run = await this.runs.getRun(start!.interaction_run_id);
      if (
        run?.content.lifecycle.state === "running" &&
        Date.now() - Date.parse(run.content.lifecycle.started_at) >
          WORKING_PLAN_PROFILE.timeout_ms
      ) {
        await this.#finish(
          start!,
          {
            error:
              "The proposal delivery expired before an observed terminal result. No command was executed.",
          },
          true,
        );
        proposal = await this.#transaction(`read:${proposalId}`, (client) =>
          this.#read(start!, client),
        );
      }
    }
    return proposal;
  }
  async complete(
    proposalId: string,
    actorId: string,
    result: Result,
  ): Promise<OwnedCopilotCommandProposal> {
    const row = (
      await this.pool.query<StartRow>(
        "SELECT * FROM petra.copilot_command_proposals WHERE proposal_id=$1 AND actor_id=$2",
        [proposalId, actorId],
      )
    ).rows[0];
    assertOwner(
      row !== undefined,
      "Proposal completion requires its retained start owners.",
    );
    await this.#authorize(row!.project_id, actorId);
    const retained = await this.#content<Begin>(
      row!.input_artifact_id,
      row!.input_hash,
    );
    validateWorkingPlan(result.output, retained.input);
    const output = await this.#retain(result.output, proposalId, 2);
    await this.#finish(row!, { output, result });
    return this.read(row!.project_id, actorId, proposalId);
  }
  async fail(
    proposalId: string,
    actorId: string,
    error: string,
  ): Promise<void> {
    assertOwner(
      actorId === this.options.actorId,
      "Proposal failure cannot substitute another Actor.",
    );
    const row = (
      await this.pool.query<StartRow>(
        "SELECT * FROM petra.copilot_command_proposals WHERE proposal_id=$1 AND actor_id=$2",
        [proposalId, actorId],
      )
    ).rows[0];
    assertOwner(
      row !== undefined,
      "Proposal failure requires its retained start owners.",
    );
    await this.#finish(row!, {
      error:
        error.trim().slice(0, 4000) ||
        "The proposal role failed without a usable result.",
    });
  }
  async #finish(
    start: StartRow,
    terminal: { output?: PetraArtifact; result?: Result; error?: string },
    retainExisting = false,
  ): Promise<void> {
    await this.#transaction(start.proposal_id, async (client) => {
      const existing = (
        await client.query<TerminalRow>(
          "SELECT * FROM petra.copilot_command_proposal_terminals WHERE proposal_id=$1",
          [start.proposal_id],
        )
      ).rows[0];
      if (existing !== undefined) {
        if (retainExisting) return;
        assertOwner(
          existing.output_hash === (terminal.output?.content_hash ?? null) &&
            existing.error === (terminal.error ?? null),
          "The terminal proposal is immutable and cannot be replaced.",
        );
        return;
      }
      const workRepo = this.work.inTransaction(client),
        runs = this.runs.inTransaction(client);
      const work = await workRepo.getWorkUnit(start.work_unit_id),
        run = await runs.getRun(start.interaction_run_id);
      assertOwner(
        work?.status.state === "running" &&
          run?.content.lifecycle.state === "running",
        "Proposal delivery requires its running canonical owners.",
      );
      const input = await workRepo.getInputManifest(
        work!.spec.input_manifest_ref.worker_input_manifest_id,
      );
      assertOwner(
        input !== undefined,
        "The bounded proposal input manifest is missing.",
      );
      const ended = new Date().toISOString();
      const elapsed = Math.max(
        0,
        Date.parse(ended) - Date.parse(run!.content.lifecycle.started_at),
      );
      if (terminal.output !== undefined) {
        assertOwner(
          elapsed <= WORKING_PLAN_PROFILE.timeout_ms,
          "The bounded proposal delivery exceeded its deadline.",
        );
        const content: PetraWorkerOutputManifestV11["content"] = {
          worker: input!.content.worker,
          started_at: run!.content.lifecycle.started_at,
          completed_at: ended,
          outcome: {
            outcome_kind: "succeeded",
            produced_outputs: [
              {
                output_name: "retained_proposal",
                output_role: "proposal",
                output_handle: `output:${terminal.output.artifact_id}`,
                content_hash: terminal.output.content_hash,
                byte_size: terminal.output.byte_size,
                media_type: terminal.output.media_type,
                contract: input!.content.expected_outputs[0].contract!,
              },
            ],
          },
          diagnostics: [
            {
              code: "PROPOSED_ONLY_DELIVERY",
              severity: "info",
              message:
                "Delivery retains a proposed-only command selection. A separate immutable human decision and ordinary command owner are still required; no command was executed.",
            },
          ],
          network_activity: [],
          resource_usage: {
            wall_time_ms: elapsed,
            cpu_time_ms: null,
            peak_memory_bytes: null,
            input_bytes: input!.content.inputs.reduce(
              (sum, binding) =>
                sum +
                (binding.binding_kind === "artifact" ? binding.byte_size : 0),
              0,
            ),
            output_bytes: terminal.output.byte_size,
            network_bytes: null,
            measurement_scope:
              "Elapsed wall time and retained Artifact bytes are observed. Provider CPU, memory, network, tokens and price are unavailable.",
          },
        };
        await workRepo.complete(
          {
            schema_name: "petra.worker-output-manifest",
            schema_version: "1.1.0",
            worker_output_manifest_id: derivePetraId(
              "worker_output_manifest",
              start.proposal_id,
            ),
            revision: 1,
            work_unit_id: work!.work_unit_id,
            project_id: start.project_id,
            attempt: 1,
            worker_input_manifest_id: input!.worker_input_manifest_id,
            worker_input_manifest_hash: input!.content_hash,
            content,
            content_hash: copilotHash(content),
            reported_at: ended,
          },
          work!.revision,
        );
      } else
        await workRepo.failExecution(
          work!.work_unit_id,
          work!.revision,
          1,
          elapsed > WORKING_PLAN_PROFILE.timeout_ms
            ? "timed_out"
            : "worker_failed",
          {
            code: "COMMAND_PROPOSAL_DELIVERY_FAILED",
            message: terminal.error!,
            retryable: false,
          },
          ended,
        );
      const content: PetraInteractionRun["content"] = {
        ...run!.content,
        lifecycle: {
          state: terminal.output ? "completed" : "failed",
          started_at: run!.content.lifecycle.started_at,
          ended_at: ended,
          outcome_code: terminal.output
            ? "COMMAND_PROPOSAL_RETAINED"
            : "COMMAND_PROPOSAL_UNAVAILABLE",
        },
      };
      await runs.registerRun({
        ...run!,
        revision: run!.revision + 1,
        lineage: {
          lineage_kind: "revision",
          parent_revision: run!.revision,
          parent_hash: run!.content_hash,
        },
        content,
        content_hash: copilotHash(content),
        updated_at: ended,
      });
      await client.query(
        "INSERT INTO petra.copilot_command_proposal_terminals(proposal_id,state,output_artifact_id,output_hash,error,provider_model,provider_thread_id,provider_turn_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          start.proposal_id,
          terminal.output ? "completed" : "failed",
          terminal.output?.artifact_id ?? null,
          terminal.output?.content_hash ?? null,
          terminal.error ?? null,
          terminal.result?.model ?? null,
          terminal.result?.provider_thread_id ?? null,
          terminal.result?.provider_turn_id ?? null,
        ],
      );
    });
  }

  #assertDecision(
    proposal: OwnedCopilotCommandProposal,
    decision: CopilotHumanCommandDecision,
  ): void {
    assertOwner(
      proposal.state === "completed" &&
        proposal.output !== undefined &&
        proposal.actor_id === decision.actor_id &&
        proposal.proposal_id === decision.proposal_id &&
        proposal.output_hash === decision.proposal_output_hash,
      "Human decisions require an exact completed proposal output.",
    );
    const selected = validateWorkingPlan(
      proposal.output!,
      proposal.input,
    ).proposals.find((item) => item.preview.key === decision.preview_key);
    const command = proposal.commands.find(
      (item) => item.preview.key === decision.preview_key,
    );
    assertOwner(
      selected !== undefined &&
        command !== undefined &&
        command.preview.preview_hash === decision.preview_hash &&
        copilotHash(selected.payload) ===
          copilotHash(command.preview.payload) &&
        copilotHash(command) === copilotHash(decision.command) &&
        copilotHash(
          decidedCopilotCommandRequest(command, decision.decided_at),
        ) === copilotHash(decision.request),
      "The human decision must select the exact model-proposed server command and complete ordinary body.",
    );
    assertCopilotCommandPreview(command!, proposal.input.context);
  }

  async retainDecision(
    decision: CopilotHumanCommandDecision,
  ): Promise<OwnedCopilotCommandDecision> {
    const proposal = await this.read(
      decision.command.preview.project_id,
      decision.actor_id,
      decision.proposal_id,
    );
    this.#assertDecision(proposal, decision);
    this.contracts.assertValid("copilot-human-command-decision", "1.0.0", {
      schema_name: "petra.copilot-human-command-decision",
      schema_version: "1.0.0",
      ...decision,
    });
    const artifact = await this.#retain(
      {
        schema_name: "petra.copilot-human-command-decision",
        schema_version: "1.0.0",
        ...decision,
      },
      decision.decision_id,
      1,
    );
    await this.#transaction(
      `decision:${decision.proposal_id}:${decision.preview_key}`,
      async (client) => {
        const existing = await this.readDecision(
          decision.decision_id,
          decision.actor_id,
        );
        if (existing !== undefined) {
          const {
            decided_at: ignored,
            request: ignoredRequest,
            ...prior
          } = existing.decision;
          void ignored;
          void ignoredRequest;
          const {
            decided_at: ignoredNow,
            request: ignoredNowRequest,
            ...candidate
          } = decision;
          void ignoredNow;
          void ignoredNowRequest;
          assertOwner(
            copilotHash(prior) === copilotHash(candidate),
            "An immutable decision cannot be rebound to another command or outcome.",
          );
          return;
        }
        await this.#authorize(
          proposal.origin.project_id,
          decision.actor_id,
          client,
        );
        await client.query(
          "INSERT INTO petra.copilot_command_decisions(decision_id,proposal_id,preview_key,actor_id,decision,decision_artifact_id,decision_hash) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            decision.decision_id,
            decision.proposal_id,
            decision.preview_key,
            decision.actor_id,
            decision.decision,
            artifact.artifact_id,
            artifact.content_hash,
          ],
        );
      },
    );
    return (await this.readDecision(decision.decision_id, decision.actor_id))!;
  }
  async claimDecision(decisionId: string, actorId: string): Promise<boolean> {
    const decision = await this.readDecision(decisionId, actorId);
    assertOwner(
      decision?.decision.decision === "accept",
      "Only an explicitly retained human acceptance can claim a command.",
    );
    if (decision!.state !== "pending") return false;
    const result = await this.pool.query(
      "INSERT INTO petra.copilot_command_decision_claims(decision_id,claimed_at) VALUES($1,now()) ON CONFLICT DO NOTHING",
      [decisionId],
    );
    return result.rowCount === 1;
  }
  async observeDecision(
    decisionId: string,
    actorId: string,
    result: { receipt?: Record<string, unknown>; error?: string },
  ): Promise<OwnedCopilotCommandDecision> {
    const decision = await this.readDecision(decisionId, actorId);
    assertOwner(
      decision !== undefined && decision.decision.decision === "accept",
      "An observed command requires its retained human acceptance.",
    );
    assertOwner(
      (result.receipt === undefined) !== (result.error === undefined),
      "An observation must retain either an exact receipt or an explicit uncertain outcome.",
    );
    if (result.receipt !== undefined)
      validateCopilotCommandReceipt(
        decision!.decision.command,
        decision!.decision.request,
        actorId,
        result.receipt,
        this.contracts,
      );
    const artifact = await this.#retain(result, decisionId, 2);
    await this.#transaction(`observation:${decisionId}`, async (client) => {
      const claim = (
        await client.query<{ decision_id: string }>(
          "SELECT decision_id FROM petra.copilot_command_decision_claims WHERE decision_id=$1",
          [decisionId],
        )
      ).rows[0];
      assertOwner(
        claim !== undefined,
        "An observation cannot substitute for a serialized command claim.",
      );
      const existing = (
        await client.query<{ observation_hash: string }>(
          "SELECT observation_hash FROM petra.copilot_command_decision_observations WHERE decision_id=$1",
          [decisionId],
        )
      ).rows[0];
      if (existing !== undefined) {
        assertOwner(
          existing.observation_hash === artifact.content_hash,
          "The immutable command observation cannot be replaced.",
        );
        return;
      }
      await client.query(
        "INSERT INTO petra.copilot_command_decision_observations(decision_id,observation_artifact_id,observation_hash,state) VALUES($1,$2,$3,$4)",
        [
          decisionId,
          artifact.artifact_id,
          artifact.content_hash,
          result.receipt ? "observed" : "reconciliation_required",
        ],
      );
    });
    return (await this.readDecision(decisionId, actorId))!;
  }
  async readDecision(
    decisionId: string,
    actorId: string,
  ): Promise<OwnedCopilotCommandDecision | undefined> {
    assertOwner(
      actorId === this.options.actorId,
      "Decision reads require the authenticated owner.",
    );
    const row = (
      await this.pool.query<{
        project_id: string;
        proposal_id: string;
        preview_key: string;
        decision_artifact_id: string;
        decision_hash: string;
        decision: "accept" | "reject";
        state: "observed" | "reconciliation_required" | null;
        observation_artifact_id: string | null;
        observation_hash: string | null;
        command_claimed: boolean;
      }>(
        "SELECT p.project_id,d.proposal_id,d.preview_key,d.decision_artifact_id,d.decision_hash,d.decision,o.state,o.observation_artifact_id,o.observation_hash,(c.decision_id IS NOT NULL) AS command_claimed FROM petra.copilot_command_decisions d JOIN petra.copilot_command_proposals p ON p.proposal_id=d.proposal_id LEFT JOIN petra.copilot_command_decision_claims c ON c.decision_id=d.decision_id LEFT JOIN petra.copilot_command_decision_observations o ON o.decision_id=d.decision_id WHERE d.decision_id=$1 AND d.actor_id=$2",
        [decisionId, actorId],
      )
    ).rows[0];
    if (row === undefined) return undefined;
    await this.#authorize(row.project_id, actorId);
    const record = await this.#content<
      CopilotHumanCommandDecision & {
        schema_name: string;
        schema_version: string;
      }
    >(row.decision_artifact_id, row.decision_hash);
    this.contracts.assertValid(
      "copilot-human-command-decision",
      "1.0.0",
      record,
    );
    const {
      schema_name: ignoredName,
      schema_version: ignoredVersion,
      ...decision
    } = record;
    void ignoredName;
    void ignoredVersion;
    assertOwner(
      decision.decision_id === decisionId &&
        decision.actor_id === actorId &&
        decision.command.preview.project_id === row.project_id &&
        decision.proposal_id === row.proposal_id &&
        decision.preview_key === row.preview_key &&
        decision.decision === row.decision,
      "The retained human decision differs from its exact canonical index.",
    );
    this.#assertDecision(
      await this.read(row.project_id, actorId, row.proposal_id),
      decision,
    );
    if (row.state === null)
      return {
        decision,
        state: decision.decision === "reject" ? "rejected" : "pending",
        ...(row.command_claimed ? { command_claimed: true } : {}),
      };
    const result = await this.#content<{
      receipt?: Record<string, unknown>;
      error?: string;
    }>(row.observation_artifact_id!, row.observation_hash!);
    assertOwner(
      decision.decision === "accept" &&
        (row.state === "observed"
          ? result.receipt !== undefined && result.error === undefined
          : result.receipt === undefined &&
            typeof result.error === "string" &&
            result.error.trim() !== ""),
      "The retained command observation differs from its immutable outcome index.",
    );
    if (result.receipt !== undefined)
      validateCopilotCommandReceipt(
        decision.command,
        decision.request,
        actorId,
        result.receipt,
        this.contracts,
      );
    return { decision, state: row.state, ...result };
  }
}
