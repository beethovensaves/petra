import type {
  PetraEvidenceProposalBundle,
  PetraModelCall,
  PetraModelRequest,
  PetraModelRoleCertification,
} from "@petra/contracts";

export interface PersistModelExecutionInput {
  readonly request: PetraModelRequest;
  readonly calls: readonly PetraModelCall[];
  readonly proposal_bundle?: PetraEvidenceProposalBundle;
}

export interface ModelExecutionRepository {
  registerCertification(
    certification: PetraModelRoleCertification,
  ): Promise<PetraModelRoleCertification>;
  getCertification(
    roleCertificationId: string,
  ): Promise<PetraModelRoleCertification | undefined>;
  persistExecution(
    execution: PersistModelExecutionInput,
  ): Promise<PersistModelExecutionInput>;
  getRequest(modelRequestId: string): Promise<PetraModelRequest | undefined>;
  listCalls(modelRequestId: string): Promise<readonly PetraModelCall[]>;
  getProposalBundle(
    evidenceProposalBundleId: string,
  ): Promise<PetraEvidenceProposalBundle | undefined>;
}
