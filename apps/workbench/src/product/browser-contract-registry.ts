import briefWorkerOutputManifestV100Schema from "../../../../packages/contracts/schemas/worker-output-manifest/1.0.0/schema.json";
import briefWorkerInputManifestV100Schema from "../../../../packages/contracts/schemas/worker-input-manifest/1.0.0/schema.json";
import briefWorkUnitV100Schema from "../../../../packages/contracts/schemas/work-unit/1.0.0/schema.json";
import briefSuggestedActionViewV100Schema from "../../../../packages/contracts/schemas/suggested-action-view/1.0.0/schema.json";
import briefResearchBriefPayloadV110Schema from "../../../../packages/contracts/schemas/research-brief-payload/1.1.0/schema.json";
import briefResearchBriefPayloadV100Schema from "../../../../packages/contracts/schemas/research-brief-payload/1.0.0/schema.json";
import briefProjectWorkViewV100Schema from "../../../../packages/contracts/schemas/project-work-view/1.0.0/schema.json";
import briefProjectSourceViewV100Schema from "../../../../packages/contracts/schemas/project-source-view/1.0.0/schema.json";
import briefProjectShellViewV120Schema from "../../../../packages/contracts/schemas/project-shell-view/1.2.0/schema.json";
import briefProjectShellViewV110Schema from "../../../../packages/contracts/schemas/project-shell-view/1.1.0/schema.json";
import briefProjectShellViewV100Schema from "../../../../packages/contracts/schemas/project-shell-view/1.0.0/schema.json";
import briefProjectObjectiveV100Schema from "../../../../packages/contracts/schemas/project-objective/1.0.0/schema.json";
import briefProjectObjectLocationViewV100Schema from "../../../../packages/contracts/schemas/project-object-location-view/1.0.0/schema.json";
import briefProjectInquiryLinkV100Schema from "../../../../packages/contracts/schemas/project-inquiry-link/1.0.0/schema.json";
import projectInquirySaveReceiptSchema from "../../../../packages/contracts/schemas/project-inquiry-save-receipt/1.0.0/schema.json";
import projectInquirySaveRecoveryViewSchema from "../../../../packages/contracts/schemas/project-inquiry-save-recovery-view/1.0.0/schema.json";
import projectInquirySaveRequestSchema from "../../../../packages/contracts/schemas/project-inquiry-save-request/1.0.0/schema.json";
import briefProjectBriefViewV110Schema from "../../../../packages/contracts/schemas/project-brief-view/1.1.0/schema.json";
import briefProjectBriefViewV100Schema from "../../../../packages/contracts/schemas/project-brief-view/1.0.0/schema.json";
import briefModelSynthesistOutputV100Schema from "../../../../packages/contracts/schemas/model-synthesist-output/1.0.0/schema.json";
import briefInteractionRunV100Schema from "../../../../packages/contracts/schemas/interaction-run/1.0.0/schema.json";
import briefInteractionEventRecordV100Schema from "../../../../packages/contracts/schemas/interaction-event-record/1.0.0/schema.json";
import briefGroundedResponseV100Schema from "../../../../packages/contracts/schemas/grounded-response/1.0.0/schema.json";
import focusedGraphViewV100Schema from "../../../../packages/contracts/schemas/focused-graph-view/1.0.0/schema.json";
import focusedGraphViewV110Schema from "../../../../packages/contracts/schemas/focused-graph-view/1.1.0/schema.json";
import focusedGraphActionPreviewViewV100Schema from "../../../../packages/contracts/schemas/focused-graph-action-preview-view/1.0.0/schema.json";
import focusedGraphDetailsViewV100Schema from "../../../../packages/contracts/schemas/focused-graph-details-view/1.0.0/schema.json";
import focusedGraphAnalysisViewV100Schema from "../../../../packages/contracts/schemas/focused-graph-analysis-view/1.0.0/schema.json";
import briefEvidencePacketV100Schema from "../../../../packages/contracts/schemas/evidence-packet/1.0.0/schema.json";
import briefContextPacketV100Schema from "../../../../packages/contracts/schemas/context-packet/1.0.0/schema.json";
import actorSchema from "../../../../packages/contracts/schemas/actor/1.0.0/schema.json";
import artifactSchema from "../../../../packages/contracts/schemas/artifact/1.0.0/schema.json";
import communicationPlanSchema from "../../../../packages/contracts/schemas/communication-plan/1.0.0/schema.json";
import communicationValidationReceiptSchema from "../../../../packages/contracts/schemas/communication-validation-receipt/1.0.0/schema.json";
import modelCallV11Schema from "../../../../packages/contracts/schemas/model-call/1.1.0/schema.json";
import modelRequestV11Schema from "../../../../packages/contracts/schemas/model-request/1.1.0/schema.json";
import modelRuntimeCommonSchema from "../../../../packages/contracts/schemas/model-runtime-common/1.0.0/schema.json";
import projectThreadSchema from "../../../../packages/contracts/schemas/project-thread/1.0.0/schema.json";
import scientificCommunicationPayloadSchema from "../../../../packages/contracts/schemas/scientific-communication-payload/1.0.0/schema.json";
import sourceSpanSchema from "../../../../packages/contracts/schemas/source-span/1.0.0/schema.json";
import suggestedActionInvocationSchema from "../../../../packages/contracts/schemas/suggested-action-invocation/1.0.0/schema.json";
import suggestedActionInvocationViewSchema from "../../../../packages/contracts/schemas/suggested-action-invocation-view/1.0.0/schema.json";
import suggestedActionViewV11Schema from "../../../../packages/contracts/schemas/suggested-action-view/1.1.0/schema.json";
import workVersionSchema from "../../../../packages/contracts/schemas/work-version/1.0.0/schema.json";
import assertionSchema from "../../../../packages/contracts/schemas/assertion/1.0.0/schema.json";
import projectSourceSchema from "../../../../packages/contracts/schemas/project-source/1.0.0/schema.json";
import projectDefinitionSchema from "../../../../packages/contracts/schemas/project-definition/1.0.0/schema.json";
import registeredProjectProfileSchema from "../../../../packages/contracts/schemas/registered-project-profile/1.0.0/schema.json";
import projectProfileTaxonomyViewSchema from "../../../../packages/contracts/schemas/project-profile-taxonomy-view/1.0.0/schema.json";
import projectModelReadinessViewSchema from "../../../../packages/contracts/schemas/project-model-readiness-view/1.0.0/schema.json";
import projectProfileCommandRequestSchema from "../../../../packages/contracts/schemas/project-profile-command-request/1.0.0/schema.json";
import projectProfileCommandReceiptSchema from "../../../../packages/contracts/schemas/project-profile-command-receipt/1.0.0/schema.json";
import projectProfileCommandRecoveryViewSchema from "../../../../packages/contracts/schemas/project-profile-command-recovery-view/1.0.0/schema.json";
import projectImportCommandRequestSchema from "../../../../packages/contracts/schemas/project-import-command-request/1.0.0/schema.json";
import projectImportCommandReceiptSchema from "../../../../packages/contracts/schemas/project-import-command-receipt/1.0.0/schema.json";
import projectImportCommandRecoveryViewSchema from "../../../../packages/contracts/schemas/project-import-command-recovery-view/1.0.0/schema.json";
import projectWorkOperationRequestSchema from "../../../../packages/contracts/schemas/project-work-operation-request/1.0.0/schema.json";
import projectWorkOperationReceiptSchema from "../../../../packages/contracts/schemas/project-work-operation-receipt/1.0.0/schema.json";
import projectWorkOperationsViewSchema from "../../../../packages/contracts/schemas/project-work-operations-view/1.0.0/schema.json";
import applyResultSchema from "../../../../packages/contracts/schemas/review-session-apply-result/1.0.0/schema.json";
import applyRequestSchema from "../../../../packages/contracts/schemas/review-session-apply-request/1.0.0/schema.json";
import applyCheckpointSchema from "../../../../packages/contracts/schemas/review-session-apply-checkpoint/1.0.0/schema.json";
import rejectCheckpointSchema from "../../../../packages/contracts/schemas/review-session-reject-checkpoint/1.0.0/schema.json";
import rejectRequestSchema from "../../../../packages/contracts/schemas/review-session-reject-request/1.0.0/schema.json";
import rejectResultSchema from "../../../../packages/contracts/schemas/review-session-reject-result/1.0.0/schema.json";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import claimSchema from "../../../../packages/contracts/schemas/claim/1.0.0/schema.json";
import commandEnvelopeSchema from "../../../../packages/contracts/schemas/command-envelope/1.0.0/schema.json";
import commandEnvelopeV18Schema from "../../../../packages/contracts/schemas/command-envelope/1.8.0/schema.json";
import commonSchema from "../../../../packages/contracts/schemas/common/1.0.0/schema.json";
import correctionReceiptSchema from "../../../../packages/contracts/schemas/review-candidate-correction-receipt/1.0.0/schema.json";
import basisRevisionReceiptSchema from "../../../../packages/contracts/schemas/review-candidate-basis-revision-receipt/1.0.0/schema.json";
import refreshReceiptSchema from "../../../../packages/contracts/schemas/review-session-refresh-receipt/1.0.0/schema.json";
import separationReceiptSchema from "../../../../packages/contracts/schemas/review-session-separation-receipt/1.0.0/schema.json";
import reviewSessionSchema from "../../../../packages/contracts/schemas/review-session/1.0.0/schema.json";
import reviewSessionV11Schema from "../../../../packages/contracts/schemas/review-session/1.1.0/schema.json";
import workingCandidateSchema from "../../../../packages/contracts/schemas/working-candidate/1.0.0/schema.json";
import workingRelationshipSchema from "../../../../packages/contracts/schemas/working-relationship/1.0.0/schema.json";

import recoveryAssessmentSchema from "../../../../packages/contracts/schemas/review-recovery-assessment/1.0.0/schema.json";
import reviewViewSchema from "../../../../packages/contracts/schemas/project-review-view/1.0.0/schema.json";
import reviewViewV11Schema from "../../../../packages/contracts/schemas/project-review-view/1.1.0/schema.json";
import reviewViewV12Schema from "../../../../packages/contracts/schemas/project-review-view/1.2.0/schema.json";
import reviewViewV13Schema from "../../../../packages/contracts/schemas/project-review-view/1.3.0/schema.json";
import changeSetSchema from "../../../../packages/contracts/schemas/change-set/1.0.0/schema.json";
import changeSetV11Schema from "../../../../packages/contracts/schemas/change-set/1.1.0/schema.json";
import approvalSchema from "../../../../packages/contracts/schemas/approval/1.0.0/schema.json";
import historyRecoverySchema from "../../../../packages/contracts/schemas/project-history-recovery-assessment-view/1.0.0/schema.json";
import historyViewSchema from "../../../../packages/contracts/schemas/project-history-view/1.0.0/schema.json";
import domainEventSchema from "../../../../packages/contracts/schemas/domain-event/1.0.0/schema.json";
import historyImpactSchema from "../../../../packages/contracts/schemas/project-history-impact-view/1.0.0/schema.json";
import historyImpactV12Schema from "../../../../packages/contracts/schemas/project-history-impact-view/1.2.0/schema.json";
import historyImpactV14Schema from "../../../../packages/contracts/schemas/project-history-impact-view/1.4.0/schema.json";

type BrowserContractName =
  | "communication-plan@1.0.0"
  | "focused-graph-analysis-view@1.0.0"
  | "focused-graph-action-preview-view@1.0.0"
  | "focused-graph-details-view@1.0.0"
  | "focused-graph-view@1.0.0"
  | "focused-graph-view@1.1.0"
  | "research-brief-payload@1.1.0"
  | "research-brief-payload@1.0.0"
  | "project-brief-view@1.1.0"
  | "project-brief-view@1.0.0"
  | "review-session-apply-checkpoint@1.0.0"
  | "review-session-apply-request@1.0.0"
  | "review-session-apply-result@1.0.0"
  | "review-session-reject-checkpoint@1.0.0"
  | "review-session-reject-request@1.0.0"
  | "review-session-reject-result@1.0.0"
  | "review-recovery-assessment@1.0.0"
  | "claim@1.0.0"
  | "review-candidate-basis-revision-receipt@1.0.0"
  | "review-candidate-correction-receipt@1.0.0"
  | "review-session-separation-receipt@1.0.0"
  | "review-session@1.1.0"
  | "registered-project-profile@1.0.0"
  | "project-profile-taxonomy-view@1.0.0"
  | "project-model-readiness-view@1.0.0"
  | "project-objective@1.0.0"
  | "project-inquiry-save-request@1.0.0"
  | "project-inquiry-save-receipt@1.0.0"
  | "project-inquiry-save-recovery-view@1.0.0"
  | "project-profile-command-request@1.0.0"
  | "project-profile-command-receipt@1.0.0"
  | "project-profile-command-recovery-view@1.0.0"
  | "project-import-command-request@1.0.0"
  | "project-import-command-receipt@1.0.0"
  | "project-import-command-recovery-view@1.0.0"
  | "project-work-operation-request@1.0.0"
  | "project-work-operation-receipt@1.0.0"
  | "project-work-operations-view@1.0.0"
  | "worker-output-manifest@1.0.0"
  | "working-candidate@1.0.0"
  | "working-relationship@1.0.0";

const definitionDependency = <
  Schema extends {
    readonly $schema: string;
    readonly $id: string;
    readonly $defs: object;
  },
>(
  schema: Schema,
): Pick<Schema, "$schema" | "$id" | "$defs"> => ({
  $schema: schema.$schema,
  $id: schema.$id,
  $defs: schema.$defs,
});

const schemas = [
  actorSchema,
  artifactSchema,
  communicationValidationReceiptSchema,
  modelCallV11Schema,
  modelRequestV11Schema,
  modelRuntimeCommonSchema,
  projectThreadSchema,
  scientificCommunicationPayloadSchema,
  sourceSpanSchema,
  suggestedActionInvocationSchema,
  suggestedActionInvocationViewSchema,
  suggestedActionViewV11Schema,
  workVersionSchema,
  briefContextPacketV100Schema,
  briefEvidencePacketV100Schema,
  briefGroundedResponseV100Schema,
  focusedGraphDetailsViewV100Schema,
  focusedGraphViewV100Schema,
  focusedGraphViewV110Schema,
  focusedGraphActionPreviewViewV100Schema,
  briefInteractionEventRecordV100Schema,
  briefInteractionRunV100Schema,
  briefModelSynthesistOutputV100Schema,
  briefProjectBriefViewV100Schema,
  briefProjectBriefViewV110Schema,
  briefProjectInquiryLinkV100Schema,
  projectInquirySaveRequestSchema,
  projectInquirySaveReceiptSchema,
  projectInquirySaveRecoveryViewSchema,
  briefProjectObjectLocationViewV100Schema,
  briefProjectObjectiveV100Schema,
  briefProjectShellViewV100Schema,
  briefProjectShellViewV110Schema,
  briefProjectShellViewV120Schema,
  briefProjectSourceViewV100Schema,
  briefProjectWorkViewV100Schema,
  briefResearchBriefPayloadV100Schema,
  briefResearchBriefPayloadV110Schema,
  briefSuggestedActionViewV100Schema,
  briefWorkUnitV100Schema,
  briefWorkerInputManifestV100Schema,
  briefWorkerOutputManifestV100Schema,
  applyCheckpointSchema,
  applyRequestSchema,
  applyResultSchema,
  rejectCheckpointSchema,
  rejectRequestSchema,
  rejectResultSchema,
  projectDefinitionSchema,
  registeredProjectProfileSchema,
  projectProfileTaxonomyViewSchema,
  projectModelReadinessViewSchema,
  projectProfileCommandRequestSchema,
  projectProfileCommandReceiptSchema,
  projectProfileCommandRecoveryViewSchema,
  projectImportCommandRequestSchema,
  projectImportCommandReceiptSchema,
  projectImportCommandRecoveryViewSchema,
  projectWorkOperationRequestSchema,
  projectWorkOperationReceiptSchema,
  projectWorkOperationsViewSchema,
  projectSourceSchema,
  assertionSchema,
  recoveryAssessmentSchema,
  reviewViewSchema,
  reviewViewV11Schema,
  reviewViewV12Schema,
  reviewViewV13Schema,
  changeSetSchema,
  changeSetV11Schema,
  approvalSchema,
  definitionDependency(historyRecoverySchema),
  historyViewSchema,
  domainEventSchema,
  definitionDependency(historyImpactSchema),
  definitionDependency(historyImpactV12Schema),
  historyImpactV14Schema,
  focusedGraphAnalysisViewV100Schema,
  commonSchema,
  commandEnvelopeSchema,
  definitionDependency(commandEnvelopeV18Schema),
  claimSchema,
  workingCandidateSchema,
  workingRelationshipSchema,
  definitionDependency(reviewSessionSchema),
  definitionDependency(refreshReceiptSchema),
  reviewSessionV11Schema,
  correctionReceiptSchema,
  basisRevisionReceiptSchema,
  separationReceiptSchema,
  communicationPlanSchema,
] as const;

const contractIds: Record<BrowserContractName, string> = {
  "communication-plan@1.0.0": communicationPlanSchema.$id,
  "focused-graph-analysis-view@1.0.0": focusedGraphAnalysisViewV100Schema.$id,
  "focused-graph-action-preview-view@1.0.0":
    focusedGraphActionPreviewViewV100Schema.$id,
  "focused-graph-details-view@1.0.0": focusedGraphDetailsViewV100Schema.$id,
  "focused-graph-view@1.0.0": focusedGraphViewV100Schema.$id,
  "focused-graph-view@1.1.0": focusedGraphViewV110Schema.$id,
  "research-brief-payload@1.1.0": briefResearchBriefPayloadV110Schema.$id,
  "research-brief-payload@1.0.0": briefResearchBriefPayloadV100Schema.$id,
  "project-brief-view@1.1.0": briefProjectBriefViewV110Schema.$id,
  "project-brief-view@1.0.0": briefProjectBriefViewV100Schema.$id,
  "review-session-apply-checkpoint@1.0.0": applyCheckpointSchema.$id,
  "review-session-apply-request@1.0.0": applyRequestSchema.$id,
  "review-session-apply-result@1.0.0": applyResultSchema.$id,
  "review-session-reject-checkpoint@1.0.0": rejectCheckpointSchema.$id,
  "review-session-reject-request@1.0.0": rejectRequestSchema.$id,
  "review-session-reject-result@1.0.0": rejectResultSchema.$id,
  "review-recovery-assessment@1.0.0": recoveryAssessmentSchema.$id,
  "claim@1.0.0": claimSchema.$id,
  "review-candidate-basis-revision-receipt@1.0.0":
    basisRevisionReceiptSchema.$id,
  "review-candidate-correction-receipt@1.0.0": correctionReceiptSchema.$id,
  "review-session-separation-receipt@1.0.0": separationReceiptSchema.$id,
  "review-session@1.1.0": reviewSessionV11Schema.$id,
  "registered-project-profile@1.0.0": registeredProjectProfileSchema.$id,
  "project-profile-taxonomy-view@1.0.0": projectProfileTaxonomyViewSchema.$id,
  "project-model-readiness-view@1.0.0": projectModelReadinessViewSchema.$id,
  "project-objective@1.0.0": briefProjectObjectiveV100Schema.$id,
  "project-inquiry-save-request@1.0.0": projectInquirySaveRequestSchema.$id,
  "project-inquiry-save-receipt@1.0.0": projectInquirySaveReceiptSchema.$id,
  "project-inquiry-save-recovery-view@1.0.0":
    projectInquirySaveRecoveryViewSchema.$id,
  "project-profile-command-request@1.0.0":
    projectProfileCommandRequestSchema.$id,
  "project-profile-command-receipt@1.0.0":
    projectProfileCommandReceiptSchema.$id,
  "project-profile-command-recovery-view@1.0.0":
    projectProfileCommandRecoveryViewSchema.$id,
  "project-import-command-request@1.0.0": projectImportCommandRequestSchema.$id,
  "project-import-command-receipt@1.0.0": projectImportCommandReceiptSchema.$id,
  "project-import-command-recovery-view@1.0.0":
    projectImportCommandRecoveryViewSchema.$id,
  "project-work-operation-request@1.0.0": projectWorkOperationRequestSchema.$id,
  "project-work-operation-receipt@1.0.0": projectWorkOperationReceiptSchema.$id,
  "project-work-operations-view@1.0.0": projectWorkOperationsViewSchema.$id,
  "worker-output-manifest@1.0.0": briefWorkerOutputManifestV100Schema.$id,
  "working-candidate@1.0.0": workingCandidateSchema.$id,
  "working-relationship@1.0.0": workingRelationshipSchema.$id,
};

export class ContractRegistryError extends Error {
  readonly validationErrors: readonly unknown[];

  constructor(message: string, validationErrors: readonly unknown[] = []) {
    super(message);
    this.name = "ContractRegistryError";
    this.validationErrors = validationErrors;
  }
}

/**
 * Browser-only validator for the exact response contracts consumed by product
 * clients, including the complete Brief dependency closure and both focused
 * graph response versions. Vite aliases the Node filesystem-backed registry to
 * this bundled schema set; server and package consumers keep the canonical
 * registry implementation.
 */
export class PetraContractRegistry {
  readonly #validators = new Map<BrowserContractName, ValidateFunction>();

  readonly entries = [
    {
      name: "communication-plan",
      version: "1.0.0",
      canonical_sha256:
        "sha256:19f7b88210d5fce73a584e1bfcdd59c4a23826126dbf9ae0c30eb07a3e3e9466",
    },
    {
      name: "communication-validation-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:93889738972355d70b7085472b0070a357e19bb459efc0bb6091e5d3d19ca066",
    },
    {
      name: "focused-graph-action-preview-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:7dd323776916eebab315123cf2ba52ba5cd60ca026571122a7b3d59980f663f4",
    },
    {
      name: "focused-graph-analysis-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:54e9c1d7d45b561a18d07ea7a8c2711c5909c969e0dab23578ca0f2c5955aa09",
    },
    {
      name: "focused-graph-details-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:5545761863811ffa19b465d9a37f61f82a5fb4a2aa2b9eaebe08949cadcae8ef",
    },
    {
      name: "focused-graph-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:bc8e4cb6693778872d3d6806a0d809191cf039bec121069a2d940eba36f36ca6",
    },
    {
      name: "focused-graph-view",
      version: "1.1.0",
      canonical_sha256:
        "sha256:9074cdf0cb7eae9e5717808cd6cb69b554407b485d00d87f5f360f735d45c4a1",
    },
    {
      name: "scientific-communication-payload",
      version: "1.0.0",
      canonical_sha256:
        "sha256:c32fbcc062c28b100babf7ca372a62d9eeb25fb7446f49b6491d8fab61d4882a",
    },
    {
      name: "registered-project-profile",
      version: "1.0.0",
      canonical_sha256:
        "sha256:c08a6749198248bf1cabba134e320dbe90d1d6b5307b045fa88fc3639295dcaa",
    },
    {
      name: "project-profile-taxonomy-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:4176da336913b2eaf10679fb9f984e23c0ca8fbc3b03e14d1bc1b149402dd4a6",
    },
    {
      name: "project-model-readiness-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:6a9cacc35e9df3b73a4eaed2db936f8c2452cf07ebd0256523388c743eb2b22e",
    },
    {
      name: "project-profile-command-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:69e1df55b23578ffb0179d09995f81e9696f871d2d5a27d326e0ad26b85cf4f1",
    },
    {
      name: "project-profile-command-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:5131baf319411d989a9f14de7a30cda8fd4ea729370e19f440763a6140bb188b",
    },
    {
      name: "project-profile-command-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:77534795a71219fd9974160e547455966389f642f85c0e26fa3b44e2295c195e",
    },
    {
      name: "project-import-command-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:e4ea1c2594c0c92ae0ccf17bd2cf1e2365753a04dac0022091dd77df40a4e4c2",
    },
    {
      name: "project-import-command-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:76ce2aa5258d10be647ca47d782b124dfff8d611f5c51705ce0907bfae8b2bd6",
    },
    {
      name: "project-import-command-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:1ba7b7d77a05f49014b08bb154f9511eed96cff7de08972d73ba7dfda9734930",
    },
    {
      name: "project-work-operation-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:b0364e9458c0cf08ec28a729a8e88e3c066ca5c970d8fd65eaf5f0c791cdcb7d",
    },
    {
      name: "project-work-operation-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:80a46aa22cee93ddd1d7542dfb67dec75db34f44f555ba4bff15a935a70e615b",
    },
    {
      name: "project-work-operations-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:cc61cba0158681b3f8417a6e52c0feb356bb1c4838cf952facaaf4c37cbb5010",
    },
    {
      name: "worker-output-manifest",
      version: "1.0.0",
      canonical_sha256:
        "sha256:ed12de26da2bd491c573f44d2cd9ad3af6c6d3601c6bd41941ac179861f4845a",
    },
  ] as const;

  constructor() {
    const ajv = new Ajv2020({
      allErrors: true,
      coerceTypes: false,
      removeAdditional: false,
      strict: true,
      useDefaults: false,
    });
    addFormats(ajv, { formats: ["date", "date-time", "uri"] });
    for (const schema of schemas) ajv.addSchema(schema);
    for (const [key, id] of Object.entries(contractIds)) {
      const validator = ajv.getSchema(id);
      if (validator === undefined) {
        throw new ContractRegistryError(
          `The browser contract validator is missing ${key}.`,
        );
      }
      this.#validators.set(key as BrowserContractName, validator);
    }
  }

  assertValid(name: string, version: string, value: unknown): void {
    const key = `${name}@${version}` as BrowserContractName;
    const validator = this.#validators.get(key);
    if (validator === undefined) {
      throw new ContractRegistryError(
        `The browser contract validator does not register ${key}.`,
      );
    }
    if (!validator(value)) {
      throw new ContractRegistryError(
        `The value does not satisfy ${key}.`,
        validator.errors ?? [],
      );
    }
  }
}
