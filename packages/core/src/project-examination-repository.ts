import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
export type ProjectExaminationRecord =
  | PetraHypothesis
  | PetraHypothesisAssessment
  | PetraPostureDecision
  | PetraCycleDisposition;
export interface ProjectExaminationRepository {
  getSnapshot(
    projectId: string,
    contentHash: string,
  ): Promise<PetraProjectSemanticGraphView | undefined>;
  get(
    projectId: string,
    recordId: string,
    revision?: number,
  ): Promise<ProjectExaminationRecord | undefined>;
  list(
    projectId: string,
    afterSequence?: number,
  ): Promise<{
    records: ProjectExaminationRecord[];
    next_sequence?: number;
    has_more: boolean;
  }>;
  /** Internal persistence only. Product mutations require an authenticated,
   * authorized command owner; this port is never exposed to the model or UI. */
  append(record: ProjectExaminationRecord): Promise<ProjectExaminationRecord>;
}
