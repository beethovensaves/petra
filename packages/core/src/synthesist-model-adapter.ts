import type {
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";

type SynthesistTiming = PetraSynthesistModelCall["content"]["timing"];
type SynthesistUsage = PetraSynthesistModelCall["content"]["usage"];
type SynthesistCost = PetraSynthesistModelCall["content"]["cost"];

export interface SynthesistAdapterRequest {
  readonly model_request_id: string;
  readonly model_call_id: string;
  readonly deployment: PetraSynthesistRoleCertification["deployment"];
  readonly input: PetraSynthesistModelCall["content"]["input"];
  readonly parameters: Omit<
    PetraSynthesistModelRequest["content"]["parameters"],
    "content_hash"
  >;
  readonly output_contract: PetraSynthesistModelRequest["content"]["output_contract"];
}

export interface SynthesistAdapterInvocationOptions {
  readonly signal?: AbortSignal;
}

interface SynthesistAdapterObservation {
  readonly provider_request_id?: string;
  readonly observed_revision: string;
  readonly timing: SynthesistTiming;
  readonly usage: SynthesistUsage;
  readonly cost: SynthesistCost;
}

export type SynthesistAdapterResponse =
  | (SynthesistAdapterObservation & {
      readonly outcome: "success";
      readonly output: unknown;
    })
  | (SynthesistAdapterObservation & {
      readonly outcome: "provider_error" | "refusal" | "timeout";
      readonly output?: unknown;
      readonly failure: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
    });

export interface SynthesistModelAdapter {
  readonly invoke: (
    request: SynthesistAdapterRequest,
    options?: SynthesistAdapterInvocationOptions,
  ) => Promise<SynthesistAdapterResponse>;
}
