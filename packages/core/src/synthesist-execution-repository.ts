import type {
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";

export interface PersistSynthesistExecutionInput {
  readonly request: PetraSynthesistModelRequest;
  readonly calls: readonly PetraSynthesistModelCall[];
}

export interface SynthesistExecutionRepository {
  registerCertification(
    certification: PetraSynthesistRoleCertification,
  ): Promise<PetraSynthesistRoleCertification>;
  getCertification(
    roleCertificationId: string,
  ): Promise<PetraSynthesistRoleCertification | undefined>;
  persistExecution(
    execution: PersistSynthesistExecutionInput,
  ): Promise<PersistSynthesistExecutionInput>;
  getRequest(
    modelRequestId: string,
  ): Promise<PetraSynthesistModelRequest | undefined>;
  listCalls(
    modelRequestId: string,
  ): Promise<readonly PetraSynthesistModelCall[]>;
}
