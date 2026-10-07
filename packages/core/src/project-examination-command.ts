import type {
  PetraProjectExaminationRequest,
  PetraProjectExaminationReceipt,
  PetraProjectExaminationAuthorityRequest,
  PetraProjectExaminationAuthorityReceipt,
} from "@petra/contracts";
import type { ProjectExaminationRecord } from "./project-examination-repository.js";
export type ExaminationActor = {
  readonly actor_id: string;
  readonly actor_kind: "human";
};
export interface ProjectExaminationCommandResult {
  readonly outcome: "recorded" | "replayed";
  readonly record: ProjectExaminationRecord;
  readonly receipt: PetraProjectExaminationReceipt;
}
export interface ProjectExaminationCommandAuthority {
  execute(
    projectId: string,
    request: PetraProjectExaminationRequest,
    principal: {
      readonly actor: ExaminationActor;
      readonly capabilityGrantId?: string;
    },
  ): Promise<ProjectExaminationCommandResult>;
  listReceipts(
    projectId: string,
    records: readonly ProjectExaminationRecord[],
    actor: ExaminationActor,
  ): Promise<PetraProjectExaminationReceipt[]>;
  recover(
    projectId: string,
    commandId: string,
    actor: ExaminationActor,
  ): Promise<ProjectExaminationCommandResult | undefined>;
}
export type { PetraProjectExaminationView as ProjectExaminationReadView } from "@petra/contracts";

/** Owner-only authority setup is a separate reviewed command; it performs no
 * examination and cannot grant another actor or another capability. */
export const examinationAuthorityProposal = (
  projectId: string,
  graphHash: string,
) => ({
  project_id: projectId,
  graph_content_hash: graphHash,
  allowed_commands: ["ConductProjectExamination"] as const,
  scope: "owner_only" as const,
});
export interface ProjectExaminationOwnerAuthority {
  availability(
    projectId: string,
    actor: ExaminationActor,
  ): Promise<{ state: "available" | "unavailable"; reason: string }>;
  execute(
    projectId: string,
    request: PetraProjectExaminationAuthorityRequest,
    actor: ExaminationActor,
  ): Promise<PetraProjectExaminationAuthorityReceipt>;
  recover(
    projectId: string,
    commandId: string,
    actor: ExaminationActor,
  ): Promise<PetraProjectExaminationAuthorityReceipt | undefined>;
}
