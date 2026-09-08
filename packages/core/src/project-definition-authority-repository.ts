import type {
  ActorRef,
  PetraProjectDefinition,
  PetraProjectObjective,
  ProjectObjectiveRef,
} from "@petra/contracts";

export interface ProjectObjectiveFocusChange {
  readonly project_id: string;
  readonly objective_ref?: ProjectObjectiveRef;
  readonly changed_by: ActorRef;
  readonly changed_at: string;
}

/**
 * Authoritative persistence for Project-owned semantics. Definitions and
 * Objectives are append-only revisions. Current definition and objective-focus
 * pointers may advance, but never rewrite the records they select.
 */
export interface ProjectDefinitionAuthorityRepository {
  registerDefinitionRevision(
    definition: PetraProjectDefinition,
  ): Promise<PetraProjectDefinition>;
  getDefinition(
    projectDefinitionId: string,
    revision?: number,
  ): Promise<PetraProjectDefinition | undefined>;
  getProjectDefinition(
    projectId: string,
    revision?: number,
  ): Promise<PetraProjectDefinition | undefined>;
  registerObjectiveRevision(
    objective: PetraProjectObjective,
  ): Promise<PetraProjectObjective>;
  getObjective(
    objectiveId: string,
    revision?: number,
  ): Promise<PetraProjectObjective | undefined>;
  listProjectObjectives(projectId: string): Promise<PetraProjectObjective[]>;
  setCurrentObjectiveFocus(
    change: ProjectObjectiveFocusChange,
  ): Promise<PetraProjectObjective | undefined>;
  getCurrentObjectiveFocus(
    projectId: string,
  ): Promise<PetraProjectObjective | undefined>;
}
