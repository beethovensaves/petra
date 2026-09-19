import type {
  PetraProjectModelReadinessView,
  ProjectDefinitionContractRef,
  ProjectModelCertificationRef,
  ProjectModelContextBinding,
  ProjectModelDefinitionRef,
  ProjectModelObjectiveRef,
  ProjectModelRecordRef,
  ProjectModelSelectedRole,
  ProjectModelSnapshotRef,
  ProjectModelUnavailableContext,
  ProjectModelUnavailableRole,
} from "@petra/contracts";

export interface CertifiedProjectModelBinding {
  readonly project_id: string;
  readonly role_semantic_key: string;
  readonly role_contract: ProjectDefinitionContractRef;
  readonly role_certification_ref: ProjectModelCertificationRef;
  readonly snapshot_ref: ProjectModelSnapshotRef;
  readonly context_packet_ref: ProjectModelRecordRef;
  readonly evidence_packet_ref: ProjectModelRecordRef;
}

export interface ProjectModelAuthorityRead {
  readonly project_id: string;
  readonly project_revision: number;
  readonly project_definition_ref: ProjectModelDefinitionRef;
  readonly objective_ref?: ProjectModelObjectiveRef;
  readonly role:
    | Pick<
        ProjectModelSelectedRole,
        "state" | "semantic_key" | "label" | "meaning"
      >
    | ProjectModelUnavailableRole;
  readonly context:
    | { readonly state: "bound"; readonly binding: ProjectModelContextBinding }
    | ProjectModelUnavailableContext;
}

/**
 * Server-owned authority read used to prove that the configured certified
 * runtime still names the current ProjectDefinition, focused Objective, and
 * exact immutable model packets. Provider health is intentionally composed at
 * the application boundary rather than inferred from PostgreSQL.
 */
export interface ProjectModelAuthorityReader {
  readProjectModelAuthority(
    projectId: string,
    expected: CertifiedProjectModelBinding,
  ): Promise<ProjectModelAuthorityRead | undefined>;
}

export interface ProjectModelInteractionAuthorization {
  readonly project_id: string;
  readonly prompt: string;
  readonly request_context: ProjectModelContextBinding;
}

/** Production query and command guard shared by the Petra HTTP surface. */
export interface ProjectModelReadinessReader {
  getProjectModelReadiness(
    projectId: string,
  ): Promise<PetraProjectModelReadinessView | undefined>;
  authorizeProjectModelInteraction(
    request: ProjectModelInteractionAuthorization,
  ): Promise<PetraProjectModelReadinessView>;
}

export type ProjectModelReadinessErrorCode =
  | "PROJECT_MODEL_INTERACTION_UNAVAILABLE"
  | "PROJECT_MODEL_INTERACTION_STALE"
  | "PROJECT_MODEL_PROMPT_UNREGISTERED"
  | "PROJECT_MODEL_READINESS_CORRUPT";

export class ProjectModelReadinessError extends Error {
  readonly code: ProjectModelReadinessErrorCode;

  constructor(code: ProjectModelReadinessErrorCode, message: string) {
    super(message);
    this.name = "ProjectModelReadinessError";
    this.code = code;
  }
}
