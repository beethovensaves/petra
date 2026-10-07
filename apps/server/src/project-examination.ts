import type {
  PetraHypothesisAssessment,
  PetraProjectExaminationRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  copilotHash,
  buildProjectExaminationScene,
  examinationRecordRef,
  ExaminationBoundaryError,
  type AuthenticatedCommandPrincipalResolver,
  type ExaminationActor,
  type ProjectExaminationCommandAuthority,
  type ProjectExaminationReadView,
  type ProjectExaminationRepository,
  type ProjectExaminationOwnerAuthority,
  type ProjectSemanticGraphReader,
} from "@petra/core";
import type { PostgresProjectExaminationRegistry } from "@petra/postgres";
export class ProjectExaminationService {
  constructor(
    readonly graphs: ProjectSemanticGraphReader,
    readonly records: ProjectExaminationRepository,
    readonly registry: Pick<PostgresProjectExaminationRegistry, "resolve">,
    readonly commands: ProjectExaminationCommandAuthority,
    readonly principalResolver: AuthenticatedCommandPrincipalResolver,
    readonly contracts = new PetraContractRegistry(),
    readonly ownerAuthority?: ProjectExaminationOwnerAuthority,
  ) {}
  async actor(): Promise<ExaminationActor> {
    const resolution =
      await this.principalResolver.resolveAuthenticatedActor?.();
    if (
      resolution?.state !== "resolved" ||
      resolution.actor.actor_kind !== "human"
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_NOT_AUTHENTICATED",
        "The authenticated examination actor is unavailable.",
      );
    return { actor_id: resolution.actor.actor_id, actor_kind: "human" };
  }
  async read(
    projectId: string,
    afterSequence = 0,
  ): Promise<ProjectExaminationReadView> {
    const actor = await this.actor();
    const graph = await this.graphs.getProjectSemanticGraph(projectId);
    if (graph === undefined)
      throw new ExaminationBoundaryError(
        "PROJECT_NOT_AVAILABLE",
        "This exact Project is unavailable.",
      );
    const configuration = await this.registry.resolve(projectId, graph);
    const page = await this.records.list(projectId, afterSequence);
    const principal =
      configuration === undefined
        ? undefined
        : await this.principalResolver.resolveCommandPrincipal({
            projectId,
            commandName: "ConductProjectExamination",
          });
    const assessments = new Map<string, PetraHypothesisAssessment>();
    for (const record of page.records)
      if (record.schema_name === "petra.hypothesis-assessment")
        assessments.set(copilotHash(examinationRecordRef(record)), record);
    const freshness: ProjectExaminationReadView["freshness"] = [];
    for (const record of page.records) {
      if (record.schema_name === "petra.hypothesis") continue;
      const assessmentRef =
        record.schema_name === "petra.hypothesis-assessment"
          ? examinationRecordRef(record)
          : record.content.assessment_ref;
      const refKey = copilotHash(assessmentRef);
      let assessment = assessments.get(refKey);
      if (assessment === undefined) {
        const linked = await this.records.get(
          projectId,
          assessmentRef.record_id,
          assessmentRef.revision,
        );
        if (
          linked?.schema_name !== "petra.hypothesis-assessment" ||
          copilotHash(linked) !== assessmentRef.record_hash
        )
          throw new ExaminationBoundaryError(
            "EXAMINATION_REFERENCE_UNAVAILABLE",
            "A retained cycle's exact assessment is unavailable.",
          );
        assessment = linked;
        assessments.set(refKey, linked);
      }
      const state =
        configuration === undefined
          ? {
              state: "profile_unavailable" as const,
              affected_axes: assessment.content.axes.map((axis) => axis.axis),
            }
          : configuration.kernel.freshness(assessment, graph);
      freshness.push({
        record_ref: examinationRecordRef(record),
        state: state.state,
        affected_axes:
          state.affected_axes as ProjectExaminationReadView["freshness"][number]["affected_axes"],
      });
    }
    const view: ProjectExaminationReadView = {
      schema_name: "petra.project-examination-view",
      schema_version: "1.0.0",
      project_id: projectId,
      graph,
      profile: configuration?.profile ?? null,
      policy: configuration?.policy ?? null,
      records: page.records,
      receipts: await this.commands.listReceipts(
        projectId,
        page.records,
        actor,
      ),
      freshness,
      has_more: page.has_more,
      ...(page.next_sequence === undefined
        ? {}
        : { next_sequence: page.next_sequence }),
      authorization:
        principal?.state === "resolved" &&
        principal.actor.actor_kind === "human"
          ? {
              state: "available",
              reason:
                "The authenticated human has one exact active examination grant. Each command rechecks it and the examined snapshot before committing.",
            }
          : {
              state: "unavailable",
              reason:
                configuration === undefined
                  ? "This ProjectDefinition registers no executable Hypothesis examination profile and policy."
                  : `Examination authority is unavailable: ${principal?.state === "denied" ? principal.reason : "actor_not_human"}.`,
            },
      ...(configuration === undefined || this.ownerAuthority === undefined
        ? {}
        : {
            owner_setup: await this.ownerAuthority.availability(
              projectId,
              actor,
            ),
          }),
      limitations: [
        "Each assessment retains its original graph snapshot and semantic versions. Current freshness is computed against the graph included in this read.",
        "Work success, a relationship, and an advisory answer do not establish warrant or close an obligation.",
        "Unassessed dimensions remain unknown. This bounded literature examination supplies no experiment, replication, waiver or universal confidence score.",
      ],
    };
    view.scene = buildProjectExaminationScene(view);
    this.contracts.assertValid("project-examination-view", "1.0.0", view);
    return view;
  }
  async execute(projectId: string, request: PetraProjectExaminationRequest) {
    const actor = await this.actor();
    const principal = await this.principalResolver.resolveCommandPrincipal({
      projectId,
      commandName: "ConductProjectExamination",
    });
    return this.commands.execute(projectId, request, {
      actor,
      ...(principal.state === "resolved" &&
      principal.actor.actor_kind === "human" &&
      principal.actor.actor_id === actor.actor_id
        ? { capabilityGrantId: principal.capabilityGrantId }
        : {}),
    });
  }
  async recover(projectId: string, commandId: string) {
    return this.commands.recover(projectId, commandId, await this.actor());
  }
}
