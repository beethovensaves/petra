import type { Pool, PoolClient } from "pg";
import type {
  PetraCommunicationPlan,
  PetraSynthesistModelRequest,
  PetraWorkUnit,
  PetraProjectDefinition,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CommunicationPlanError,
  communicationHash,
  composeCommunicationPlan,
  validateCommunicationRequest,
  type CommunicationPlanReader,
  type CommunicationPlanRequest,
  type CommunicationPlanSources,
} from "@petra/core";
import { PostgresSuggestedActionInvocationAuthorityRepository } from "./suggested-action-invocation-authority-repository.js";

type Row = { payload: unknown; record_hash: string };
/** D022: the authenticated API establishes visibility; every read is Project-scoped or an exact owned dependency. */
export class PostgresCommunicationPlanReader implements CommunicationPlanReader {
  constructor(
    private readonly pool: Pool,
    private readonly contracts = new PetraContractRegistry(),
  ) {}
  private record<T>(name: string, row: Row | undefined, version = "1.0.0"): T {
    if (!row)
      throw new CommunicationPlanError(
        `The exact ${name} owner is unavailable.`,
      );
    this.contracts.assertValid(name, version, row.payload);
    const record = row.payload as { content?: unknown; content_hash?: string };
    if (
      communicationHash(record) !== row.record_hash ||
      (record.content !== undefined &&
        communicationHash(record.content) !== record.content_hash)
    )
      throw new CommunicationPlanError(
        `The exact ${name} owner failed its stored hash check.`,
      );
    return structuredClone(row.payload) as T;
  }
  async getCommunicationPlan(
    projectId: string,
    request: CommunicationPlanRequest,
  ): Promise<PetraCommunicationPlan | undefined> {
    validateCommunicationRequest(projectId, request);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const result = await this.read(client, projectId, request);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  private async read(
    client: PoolClient,
    projectId: string,
    request: CommunicationPlanRequest,
  ): Promise<PetraCommunicationPlan | undefined> {
    const query = async (sql: string, values: unknown[]) =>
      (await client.query<Row>(sql, values)).rows[0];
    const responseRow = await query(
      `SELECT payload, record_hash FROM petra.grounded_response_revisions WHERE project_id = $1 AND grounded_response_id = $2 AND revision = $3 AND content_hash = $4 AND record_hash = $5`,
      [
        projectId,
        request.response_id,
        request.response_revision,
        request.response_content_hash,
        request.response_record_hash,
      ],
    );
    if (!responseRow) return undefined;
    const response = this.record<CommunicationPlanSources["source_response"]>(
      "grounded-response",
      responseRow,
    );
    if (
      response.project_id !== projectId ||
      response.grounded_response_id !== request.response_id ||
      response.revision !== request.response_revision ||
      response.content_hash !== request.response_content_hash
    )
      throw new CommunicationPlanError(
        "Stored response identity conflicts with the exact request.",
      );
    const c = response.content;
    const definition = this.record<
      CommunicationPlanSources["composition_definition"]
    >(
      "project-definition",
      await query(
        `SELECT revision.payload, revision.record_hash FROM petra.project_definitions head JOIN petra.project_definition_revisions revision ON revision.project_definition_id = head.project_definition_id AND revision.revision = head.current_revision WHERE head.project_id = $1`,
        [projectId],
      ),
    );
    if (
      definition.project_id !== projectId ||
      (request.expected_definition_hash !== undefined &&
        definition.content_hash !== request.expected_definition_hash)
    )
      throw new CommunicationPlanError(
        "The current communication definition differs from the requested Project binding.",
      );
    const current = this.record<CommunicationPlanSources["current_response"]>(
      "grounded-response",
      await query(
        `SELECT revision.payload, revision.record_hash FROM petra.grounded_responses head JOIN petra.grounded_response_revisions revision ON revision.grounded_response_id = head.grounded_response_id AND revision.revision = head.current_revision WHERE head.project_id = $1 AND head.grounded_response_id = $2`,
        [projectId, response.grounded_response_id],
      ),
    );
    const context = this.record<CommunicationPlanSources["context_packet"]>(
      "context-packet",
      await query(
        `SELECT payload, record_hash FROM petra.context_packets WHERE project_id = $1 AND context_packet_id = $2 AND content_hash = $3`,
        [
          projectId,
          c.context_packet_ref.context_packet_id,
          c.context_packet_ref.content_hash,
        ],
      ),
    );
    const evidence = this.record<CommunicationPlanSources["evidence_packet"]>(
      "evidence-packet",
      await query(
        `SELECT payload, record_hash FROM petra.evidence_packets WHERE project_id = $1 AND evidence_packet_id = $2 AND content_hash = $3`,
        [
          projectId,
          c.evidence_packet_ref.evidence_packet_id,
          c.evidence_packet_ref.content_hash,
        ],
      ),
    );
    const call = this.record<CommunicationPlanSources["model_call"]>(
      "model-call",
      await query(
        `SELECT payload, record_hash FROM petra.model_calls WHERE model_call_id = $1`,
        [c.execution_ref.model_call_id],
      ),
      "1.1.0",
    );
    const modelRequest = this.record<PetraSynthesistModelRequest>(
      "model-request",
      await query(
        `SELECT payload, record_hash FROM petra.model_requests WHERE project_id = $1 AND model_request_id = $2`,
        [projectId, c.execution_ref.model_request_id],
      ),
      "1.1.0",
    );
    const terminal = modelRequest.content.terminal;
    if (
      modelRequest.content.project_id !== projectId ||
      modelRequest.model_request_id !== c.execution_ref.model_request_id ||
      terminal.state !== "completed" ||
      !terminal.model_call_ids.includes(call.model_call_id) ||
      terminal.output_hash !== c.model_output_hash ||
      modelRequest.content.context_packet_ref.content_hash !==
        context.content_hash ||
      modelRequest.content.evidence_packet_ref.content_hash !==
        evidence.content_hash
    )
      throw new CommunicationPlanError(
        "The original model request does not bind this exact completed response.",
      );
    const certification = this.record<PetraSynthesistRoleCertification>(
      "model-role-certification",
      await query(
        `SELECT payload, record_hash FROM petra.model_role_certifications WHERE role_certification_id = $1`,
        [c.execution_ref.role_certification_id],
      ),
      "1.1.0",
    );
    if (
      certification.role_certification_id !==
        c.execution_ref.role_certification_id ||
      certification.deployment.model_deployment_id !==
        c.execution_ref.model_deployment_id
    )
      throw new CommunicationPlanError(
        "The original model certification does not match this execution.",
      );
    const workRef = c.interaction_ref.work_unit_ref;
    const sourceWork = this.record<PetraWorkUnit>(
      "work-unit",
      await query(
        `SELECT payload, record_hash FROM petra.work_unit_revisions WHERE project_id = $1 AND work_unit_id = $2 AND revision = $3`,
        [projectId, workRef.work_unit_id, workRef.revision],
      ),
    );
    if (
      sourceWork.project_id !== projectId ||
      sourceWork.work_unit_id !== workRef.work_unit_id ||
      sourceWork.revision !== workRef.revision ||
      sourceWork.spec_hash !== workRef.spec_hash ||
      communicationHash(sourceWork.spec) !== workRef.spec_hash
    )
      throw new CommunicationPlanError(
        "The source Work reference does not match its canonical revision.",
      );
    const artifact = this.record<CommunicationPlanSources["artifact"]>(
      "artifact",
      await query(
        `SELECT payload, record_hash FROM petra.artifacts WHERE artifact_id = $1 AND content_hash = $2 AND byte_size = $3`,
        [
          c.response_artifact_ref.artifact_id,
          c.response_artifact_ref.content_hash,
          c.response_artifact_ref.byte_size,
        ],
      ),
    );
    const delivery = this.record<CommunicationPlanSources["delivery"]>(
      "interaction-run",
      await query(
        `SELECT payload, record_hash FROM petra.interaction_run_revisions WHERE project_id = $1 AND interaction_run_id = $2 AND revision = $3 AND content_hash = $4`,
        [
          projectId,
          c.interaction_ref.interaction_run_ref.interaction_run_id,
          c.interaction_ref.interaction_run_ref.revision,
          c.interaction_ref.interaction_run_ref.content_hash,
        ],
      ),
    );
    const invocation =
      request.command_id === undefined
        ? null
        : await new PostgresSuggestedActionInvocationAuthorityRepository(
            this.pool,
            {
              authorize: () =>
                Promise.reject(
                  new CommunicationPlanError(
                    "A communication read cannot authorize a command.",
                  ),
                ),
            },
            this.contracts,
          ).readSuggestedActionInvocationView(
            client,
            projectId,
            request.command_id,
          );
    if (invocation === undefined)
      throw new CommunicationPlanError(
        "The requested exact invocation is unavailable in this Project.",
      );
    const currentInteraction = invocation?.content.interaction;
    if (
      currentInteraction?.durable_state === "available" &&
      !currentInteraction.interaction_run_ref
    )
      throw new CommunicationPlanError(
        "The linked interaction has no exact revision reference.",
      );
    const currentDelivery =
      currentInteraction?.durable_state === "available"
        ? this.record<
            NonNullable<CommunicationPlanSources["current_invocation_delivery"]>
          >(
            "interaction-run",
            await query(
              `SELECT payload, record_hash FROM petra.interaction_run_revisions WHERE project_id = $1 AND interaction_run_id = $2 AND revision = $3 AND content_hash = $4 AND record_hash = $5`,
              [
                projectId,
                currentInteraction.interaction_run_ref!.record_id,
                currentInteraction.interaction_run_ref!.revision,
                currentInteraction.interaction_run_ref!.content_hash,
                currentInteraction.interaction_run_ref!.record_hash,
              ],
            ),
          )
        : null;
    // Only original Project packet dependencies may reach these global immutable owners.
    const records: CommunicationPlanSources["source_records"] = [];
    for (const inclusion of context.content.included_objects) {
      const ref = inclusion.object_ref;
      let row: Row | undefined;
      if (ref.object_kind === "claim" || ref.object_kind === "assertion")
        row = await query(
          `SELECT payload, record_hash FROM petra.evidence_entity_revisions WHERE evidence_id = $1 AND revision = $2 AND record_hash = $3`,
          [ref.object_id, ref.object_revision, ref.object_hash],
        );
      else if (ref.object_kind === "source_span")
        row = await query(
          `SELECT payload, record_hash FROM petra.source_spans WHERE source_span_id = $1 AND revision = $2 AND record_hash = $3`,
          [ref.object_id, ref.object_revision, ref.object_hash],
        );
      else if (ref.object_kind === "work_version")
        row = await query(
          `SELECT payload, record_hash FROM petra.canonical_entity_revisions WHERE entity_id = $1 AND revision = $2 AND record_hash = $3`,
          [ref.object_id, ref.object_revision, ref.object_hash],
        );
      if (row)
        records.push(this.record(ref.object_kind.replaceAll("_", "-"), row));
    }
    const turnRows = await client.query<{
      payload: unknown;
      record_hash: string;
      project_turn_id: string;
    }>(
      `SELECT revision.payload, revision.record_hash, binding.project_turn_id
      FROM petra.project_thread_turn_bindings binding JOIN petra.project_thread_revisions revision ON revision.project_thread_id = binding.project_thread_id AND revision.revision = binding.thread_revision
      WHERE binding.project_id = $1 AND binding.grounded_response_id = $2 AND binding.grounded_response_revision = $3 AND binding.grounded_response_hash = $4
      ORDER BY binding.project_thread_id, binding.thread_revision, binding.turn_position LIMIT 2`,
      [
        projectId,
        response.grounded_response_id,
        response.revision,
        response.content_hash,
      ],
    );
    // More than one retained revision is not a unique turn selector; never guess a product context.
    const turnRow = turnRows.rows.length === 1 ? turnRows.rows[0] : undefined;
    const thread = turnRow
      ? this.record<NonNullable<CommunicationPlanSources["thread"]>>(
          "project-thread",
          turnRow,
        )
      : null;
    if (thread) {
      const turn = thread.content.turns.find(
        (turn) => turn.project_turn_id === turnRow?.project_turn_id,
      );
      if (!turn)
        throw new CommunicationPlanError(
          "The exact product turn is unavailable.",
        );
      const ref = turn.project_definition_ref;
      const originalDefinition = this.record<PetraProjectDefinition>(
        "project-definition",
        await query(
          `SELECT payload, record_hash FROM petra.project_definition_revisions WHERE project_id = $1 AND project_definition_id = $2 AND revision = $3 AND content_hash = $4`,
          [
            projectId,
            ref.project_definition_id,
            ref.revision,
            ref.content_hash,
          ],
        ),
      );
      if (
        originalDefinition.project_id !== projectId ||
        originalDefinition.definition_family !== ref.definition_family
      )
        throw new CommunicationPlanError(
          "The original turn definition has a mismatched Project or profile family.",
        );
    }
    const actorRefs = [
      response.recorded_by,
      artifact.created_by,
      context.compiled_by,
      evidence.compiled_by,
      delivery.content.authority_context.actor,
      ...(thread
        ? [
            thread.created_by,
            ...thread.content.turns
              .filter(
                (turn) => turn.project_turn_id === turnRow?.project_turn_id,
              )
              .map((turn) => turn.authority_context.actor),
          ]
        : []),
      ...(invocation
        ? [invocation.content.invocation.content.command_ref.actor]
        : []),
    ];
    const actors: CommunicationPlanSources["actors"] = [];
    for (const ref of actorRefs) {
      if (actors.some((actor) => actor.actor_id === ref.actor_id)) continue;
      actors.push(
        this.record(
          "actor",
          await query(
            `SELECT payload, record_hash FROM petra.actors WHERE actor_id = $1 AND actor_kind = $2`,
            [ref.actor_id, ref.actor_kind],
          ),
        ),
      );
    }
    const position = (
      await client.query<{
        read_at: Date;
        event_position: string;
        stream_revision: string;
      }>(
        `SELECT transaction_timestamp() AS read_at, authority.event_position, COALESCE(stream.current_stream_revision, 0) AS stream_revision FROM petra.authority_positions authority LEFT JOIN petra.project_event_stream_heads stream ON stream.project_id = $1 WHERE authority.singleton`,
        [projectId],
      )
    ).rows[0];
    if (
      !position ||
      !Number.isSafeInteger(Number(position.event_position)) ||
      !Number.isSafeInteger(Number(position.stream_revision))
    )
      throw new CommunicationPlanError(
        "The communication read position is unavailable.",
      );
    return composeCommunicationPlan(
      {
        composition_definition: definition,
        source_response: response,
        current_response: current,
        context_packet: context,
        evidence_packet: evidence,
        model_call: call,
        artifact,
        delivery,
        current_invocation_delivery: currentDelivery,
        invocation,
        actors,
        source_records: records,
        thread,
        project_turn_id: turnRow?.project_turn_id ?? null,
        authority: {
          isolation: "repeatable_read",
          event_position: Number(position.event_position),
          stream_revision: Number(position.stream_revision),
          effect: "none",
          projection: "not_observed",
        },
      },
      request.locale,
      position.read_at.toISOString(),
      this.contracts,
    );
  }
}
