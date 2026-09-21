import briefWorkerOutputManifestV100Schema from "../../../../packages/contracts/schemas/worker-output-manifest/1.0.0/schema.json";
import briefWorkerInputManifestV100Schema from "../../../../packages/contracts/schemas/worker-input-manifest/1.0.0/schema.json";
import briefWorkUnitV100Schema from "../../../../packages/contracts/schemas/work-unit/1.0.0/schema.json";
import briefSuggestedActionViewV100Schema from "../../../../packages/contracts/schemas/suggested-action-view/1.0.0/schema.json";
import briefResearchBriefPayloadV110Schema from "../../../../packages/contracts/schemas/research-brief-payload/1.1.0/schema.json";
import briefResearchBriefPayloadV100Schema from "../../../../packages/contracts/schemas/research-brief-payload/1.0.0/schema.json";
import briefProjectWorkViewV100Schema from "../../../../packages/contracts/schemas/project-work-view/1.0.0/schema.json";
import projectWorkViewV110Schema from "../../../../packages/contracts/schemas/project-work-view/1.1.0/schema.json";
import briefProjectSourceViewV100Schema from "../../../../packages/contracts/schemas/project-source-view/1.0.0/schema.json";
import briefProjectShellViewV120Schema from "../../../../packages/contracts/schemas/project-shell-view/1.2.0/schema.json";
import briefProjectShellViewV130Schema from "../../../../packages/contracts/schemas/project-shell-view/1.3.0/schema.json";
import briefProjectShellViewV110Schema from "../../../../packages/contracts/schemas/project-shell-view/1.1.0/schema.json";
import briefProjectShellViewV100Schema from "../../../../packages/contracts/schemas/project-shell-view/1.0.0/schema.json";
import projectShellCollectionViewV100Schema from "../../../../packages/contracts/schemas/project-shell-collection-view/1.0.0/schema.json";
import briefProjectObjectiveV100Schema from "../../../../packages/contracts/schemas/project-objective/1.0.0/schema.json";
import briefProjectObjectLocationViewV100Schema from "../../../../packages/contracts/schemas/project-object-location-view/1.0.0/schema.json";
import briefProjectInquiryLinkV100Schema from "../../../../packages/contracts/schemas/project-inquiry-link/1.0.0/schema.json";
import projectInquirySaveReceiptSchema from "../../../../packages/contracts/schemas/project-inquiry-save-receipt/1.0.0/schema.json";
import projectInquirySaveRecoveryViewSchema from "../../../../packages/contracts/schemas/project-inquiry-save-recovery-view/1.0.0/schema.json";
import projectInquirySaveRequestSchema from "../../../../packages/contracts/schemas/project-inquiry-save-request/1.0.0/schema.json";
import projectObjectiveCommandRequestSchema from "../../../../packages/contracts/schemas/project-objective-command-request/1.0.0/schema.json";
import projectObjectiveCommandReceiptSchema from "../../../../packages/contracts/schemas/project-objective-command-receipt/1.0.0/schema.json";
import projectObjectiveCommandRecoveryViewSchema from "../../../../packages/contracts/schemas/project-objective-command-recovery-view/1.0.0/schema.json";
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
import projectSourceRegistrationRequestSchema from "../../../../packages/contracts/schemas/project-source-registration-request/1.0.0/schema.json";
import projectSourceRegistrationReceiptSchema from "../../../../packages/contracts/schemas/project-source-registration-receipt/1.0.0/schema.json";
import projectSourceRegistrationRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-registration-recovery-view/1.0.0/schema.json";
import projectSourceRevisionRequestSchema from "../../../../packages/contracts/schemas/project-source-revision-request/1.0.0/schema.json";
import projectSourceRevisionReceiptSchema from "../../../../packages/contracts/schemas/project-source-revision-receipt/1.0.0/schema.json";
import projectSourceRevisionRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-revision-recovery-view/1.0.0/schema.json";
import projectSourceLifecycleReceiptSchema from "../../../../packages/contracts/schemas/project-source-lifecycle-receipt/1.0.0/schema.json";
import projectSourceLifecycleViewSchema from "../../../../packages/contracts/schemas/project-source-lifecycle-view/1.0.0/schema.json";
import projectSourceLinkRemovalRequestSchema from "../../../../packages/contracts/schemas/project-source-link-removal-request/1.0.0/schema.json";
import projectSourceLinkRemovalPreviewSchema from "../../../../packages/contracts/schemas/project-source-link-removal-preview/1.0.0/schema.json";
import projectSourceLinkRemovalReceiptSchema from "../../../../packages/contracts/schemas/project-source-link-removal-receipt/1.0.0/schema.json";
import projectSourceLinkRemovalRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-link-removal-recovery-view/1.0.0/schema.json";
import projectSourceProcessingRequestSchema from "../../../../packages/contracts/schemas/project-source-processing-request/1.0.0/schema.json";
import projectSourceProcessingReceiptSchema from "../../../../packages/contracts/schemas/project-source-processing-receipt/1.0.0/schema.json";
import projectSourceProcessingRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-processing-recovery-view/1.0.0/schema.json";
import projectSourceProcessingViewSchema from "../../../../packages/contracts/schemas/project-source-processing-view/1.0.0/schema.json";
import projectSourceReuseRequestSchema from "../../../../packages/contracts/schemas/project-source-reuse-request/1.0.0/schema.json";
import projectSourceReuseOptionsViewSchema from "../../../../packages/contracts/schemas/project-source-reuse-options-view/1.0.0/schema.json";
import projectSourceReuseReceiptSchema from "../../../../packages/contracts/schemas/project-source-reuse-receipt/1.0.0/schema.json";
import projectSourceReuseRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-reuse-recovery-view/1.0.0/schema.json";
import projectSourceLocalCopyDeletionRequestSchema from "../../../../packages/contracts/schemas/project-source-local-copy-deletion-request/1.0.0/schema.json";
import projectSourceLocalCopyDeletionPreviewSchema from "../../../../packages/contracts/schemas/project-source-local-copy-deletion-preview/1.0.0/schema.json";
import projectSourceLocalCopyDeletionReceiptSchema from "../../../../packages/contracts/schemas/project-source-local-copy-deletion-receipt/1.0.0/schema.json";
import projectSourceLocalCopyDeletionRecoveryViewSchema from "../../../../packages/contracts/schemas/project-source-local-copy-deletion-recovery-view/1.0.0/schema.json";
import capabilityGrantSchema from "../../../../packages/contracts/schemas/capability-grant/1.0.0/schema.json";
import rightsDecisionSchema from "../../../../packages/contracts/schemas/rights-decision/1.0.0/schema.json";
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
import projectWorkResumeRequestSchema from "../../../../packages/contracts/schemas/project-work-resume-request/1.0.0/schema.json";
import projectWorkResumeReceiptSchema from "../../../../packages/contracts/schemas/project-work-resume-receipt/1.0.0/schema.json";
import projectWorkStartAgainRequestSchema from "../../../../packages/contracts/schemas/project-work-start-again-request/1.0.0/schema.json";
import projectWorkStartAgainReceiptSchema from "../../../../packages/contracts/schemas/project-work-start-again-receipt/1.0.0/schema.json";
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
import commandEnvelopeV11Schema from "../../../../packages/contracts/schemas/command-envelope/1.1.0/schema.json";
import commandEnvelopeV12Schema from "../../../../packages/contracts/schemas/command-envelope/1.2.0/schema.json";
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
  | "project-shell-view@1.0.0"
  | "project-shell-view@1.1.0"
  | "project-shell-view@1.2.0"
  | "project-shell-view@1.3.0"
  | "project-shell-collection-view@1.0.0"
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
  | "project-objective-command-request@1.0.0"
  | "project-objective-command-receipt@1.0.0"
  | "project-objective-command-recovery-view@1.0.0"
  | "project-profile-command-request@1.0.0"
  | "project-profile-command-receipt@1.0.0"
  | "project-profile-command-recovery-view@1.0.0"
  | "project-import-command-request@1.0.0"
  | "project-import-command-receipt@1.0.0"
  | "project-import-command-recovery-view@1.0.0"
  | "project-work-operation-request@1.0.0"
  | "project-work-operation-receipt@1.0.0"
  | "project-work-operations-view@1.0.0"
  | "project-work-resume-request@1.0.0"
  | "project-work-resume-receipt@1.0.0"
  | "project-work-start-again-request@1.0.0"
  | "project-work-start-again-receipt@1.0.0"
  | "project-source@1.0.0"
  | "project-source-view@1.0.0"
  | "project-source-registration-request@1.0.0"
  | "project-source-registration-receipt@1.0.0"
  | "project-source-registration-recovery-view@1.0.0"
  | "project-source-revision-request@1.0.0"
  | "project-source-revision-receipt@1.0.0"
  | "project-source-revision-recovery-view@1.0.0"
  | "project-source-link-removal-request@1.0.0"
  | "project-source-link-removal-preview@1.0.0"
  | "project-source-link-removal-receipt@1.0.0"
  | "project-source-link-removal-recovery-view@1.0.0"
  | "project-source-processing-request@1.0.0"
  | "project-source-processing-receipt@1.0.0"
  | "project-source-processing-recovery-view@1.0.0"
  | "project-source-processing-view@1.0.0"
  | "project-source-reuse-request@1.0.0"
  | "project-source-reuse-options-view@1.0.0"
  | "project-source-reuse-receipt@1.0.0"
  | "project-source-reuse-recovery-view@1.0.0"
  | "project-source-local-copy-deletion-request@1.0.0"
  | "project-source-local-copy-deletion-preview@1.0.0"
  | "project-source-local-copy-deletion-receipt@1.0.0"
  | "project-source-local-copy-deletion-recovery-view@1.0.0"
  | "work-unit@1.0.0"
  | "worker-input-manifest@1.0.0"
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
  projectObjectiveCommandRequestSchema,
  projectObjectiveCommandReceiptSchema,
  projectObjectiveCommandRecoveryViewSchema,
  briefProjectObjectLocationViewV100Schema,
  briefProjectObjectiveV100Schema,
  briefProjectShellViewV100Schema,
  briefProjectShellViewV110Schema,
  briefProjectShellViewV120Schema,
  briefProjectShellViewV130Schema,
  projectShellCollectionViewV100Schema,
  briefProjectSourceViewV100Schema,
  briefProjectWorkViewV100Schema,
  projectWorkViewV110Schema,
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
  projectWorkResumeRequestSchema,
  projectWorkResumeReceiptSchema,
  projectWorkStartAgainRequestSchema,
  projectWorkStartAgainReceiptSchema,
  projectSourceRegistrationRequestSchema,
  projectSourceRegistrationReceiptSchema,
  projectSourceRegistrationRecoveryViewSchema,
  projectSourceRevisionRequestSchema,
  projectSourceRevisionReceiptSchema,
  projectSourceRevisionRecoveryViewSchema,
  projectSourceLifecycleReceiptSchema,
  projectSourceLifecycleViewSchema,
  projectSourceLinkRemovalRequestSchema,
  projectSourceLinkRemovalPreviewSchema,
  projectSourceLinkRemovalReceiptSchema,
  projectSourceLinkRemovalRecoveryViewSchema,
  projectSourceProcessingRequestSchema,
  projectSourceProcessingReceiptSchema,
  projectSourceProcessingRecoveryViewSchema,
  projectSourceProcessingViewSchema,
  projectSourceReuseRequestSchema,
  projectSourceReuseOptionsViewSchema,
  projectSourceReuseReceiptSchema,
  projectSourceReuseRecoveryViewSchema,
  projectSourceLocalCopyDeletionRequestSchema,
  projectSourceLocalCopyDeletionPreviewSchema,
  projectSourceLocalCopyDeletionReceiptSchema,
  projectSourceLocalCopyDeletionRecoveryViewSchema,
  capabilityGrantSchema,
  projectSourceSchema,
  rightsDecisionSchema,
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
  definitionDependency(commandEnvelopeV11Schema),
  definitionDependency(commandEnvelopeV12Schema),
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
  "project-shell-view@1.0.0": briefProjectShellViewV100Schema.$id,
  "project-shell-view@1.1.0": briefProjectShellViewV110Schema.$id,
  "project-shell-view@1.2.0": briefProjectShellViewV120Schema.$id,
  "project-shell-view@1.3.0": briefProjectShellViewV130Schema.$id,
  "project-shell-collection-view@1.0.0":
    projectShellCollectionViewV100Schema.$id,
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
  "project-objective-command-request@1.0.0":
    projectObjectiveCommandRequestSchema.$id,
  "project-objective-command-receipt@1.0.0":
    projectObjectiveCommandReceiptSchema.$id,
  "project-objective-command-recovery-view@1.0.0":
    projectObjectiveCommandRecoveryViewSchema.$id,
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
  "project-work-resume-request@1.0.0": projectWorkResumeRequestSchema.$id,
  "project-work-resume-receipt@1.0.0": projectWorkResumeReceiptSchema.$id,
  "project-work-start-again-request@1.0.0":
    projectWorkStartAgainRequestSchema.$id,
  "project-work-start-again-receipt@1.0.0":
    projectWorkStartAgainReceiptSchema.$id,
  "project-source@1.0.0": projectSourceSchema.$id,
  "project-source-view@1.0.0": briefProjectSourceViewV100Schema.$id,
  "project-source-registration-request@1.0.0":
    projectSourceRegistrationRequestSchema.$id,
  "project-source-registration-receipt@1.0.0":
    projectSourceRegistrationReceiptSchema.$id,
  "project-source-registration-recovery-view@1.0.0":
    projectSourceRegistrationRecoveryViewSchema.$id,
  "project-source-revision-request@1.0.0":
    projectSourceRevisionRequestSchema.$id,
  "project-source-revision-receipt@1.0.0":
    projectSourceRevisionReceiptSchema.$id,
  "project-source-revision-recovery-view@1.0.0":
    projectSourceRevisionRecoveryViewSchema.$id,
  "project-source-link-removal-request@1.0.0":
    projectSourceLinkRemovalRequestSchema.$id,
  "project-source-link-removal-preview@1.0.0":
    projectSourceLinkRemovalPreviewSchema.$id,
  "project-source-link-removal-receipt@1.0.0":
    projectSourceLinkRemovalReceiptSchema.$id,
  "project-source-link-removal-recovery-view@1.0.0":
    projectSourceLinkRemovalRecoveryViewSchema.$id,
  "project-source-processing-request@1.0.0":
    projectSourceProcessingRequestSchema.$id,
  "project-source-processing-receipt@1.0.0":
    projectSourceProcessingReceiptSchema.$id,
  "project-source-processing-recovery-view@1.0.0":
    projectSourceProcessingRecoveryViewSchema.$id,
  "project-source-processing-view@1.0.0": projectSourceProcessingViewSchema.$id,
  "project-source-reuse-request@1.0.0": projectSourceReuseRequestSchema.$id,
  "project-source-reuse-options-view@1.0.0":
    projectSourceReuseOptionsViewSchema.$id,
  "project-source-reuse-receipt@1.0.0": projectSourceReuseReceiptSchema.$id,
  "project-source-reuse-recovery-view@1.0.0":
    projectSourceReuseRecoveryViewSchema.$id,
  "project-source-local-copy-deletion-request@1.0.0":
    projectSourceLocalCopyDeletionRequestSchema.$id,
  "project-source-local-copy-deletion-preview@1.0.0":
    projectSourceLocalCopyDeletionPreviewSchema.$id,
  "project-source-local-copy-deletion-receipt@1.0.0":
    projectSourceLocalCopyDeletionReceiptSchema.$id,
  "project-source-local-copy-deletion-recovery-view@1.0.0":
    projectSourceLocalCopyDeletionRecoveryViewSchema.$id,
  "work-unit@1.0.0": briefWorkUnitV100Schema.$id,
  "worker-input-manifest@1.0.0": briefWorkerInputManifestV100Schema.$id,
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
      name: "project-shell-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:b96d956d1a89d63965000bcb7cea7ea33d4e4cf6d44554c5acccbb37ac4b2cc4",
    },
    {
      name: "project-shell-view",
      version: "1.1.0",
      canonical_sha256:
        "sha256:859cf372c29e2ed06d7f4e0173a3f8955ba020ff7bb4a022be953d0e98038daf",
    },
    {
      name: "project-shell-view",
      version: "1.2.0",
      canonical_sha256:
        "sha256:c846435a0b3efa9707a2a83251b108d509a2ea2070559cd01bb1a74c5e98186b",
    },
    {
      name: "project-shell-collection-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:bac8053554ca391baaba96cd0e84c65b9813e7e542ca49bf35704450fe798bff",
    },
    {
      name: "project-objective-command-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:55e4423042dab6c37f913f43198c444b5f4cde584108b1cd4b30d216b89ee373",
    },
    {
      name: "project-objective-command-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:15414d1bbd0f2c94e7909206d49134ea94f233f4d12b357cdce99c607e53be7c",
    },
    {
      name: "project-objective-command-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:b64ac1a2076a71feb56f5defde4867013f5386ebcc67ce00486430df702c0fd6",
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
      name: "project-work-resume-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:6688eeb22907a81055240c80ab1aedd94751b37fa5433078002aef042e2120f9",
    },
    {
      name: "project-work-resume-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:41ab775c6d9c0773574fd458ab09d146d99c0fb7e634741a777ad01476a57215",
    },
    {
      name: "project-work-start-again-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:09caaf1a07141acb319dd628ec0d929df1c730dcfaf4c98c2bd6497772a9ed00",
    },
    {
      name: "project-work-start-again-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:056fec8e90396d2a7eb8a8c8e5fbfaf1942c3e89e09b28e3fcd39f0c92331a84",
    },
    {
      name: "project-source",
      version: "1.0.0",
      canonical_sha256:
        "sha256:2bb24bb14f56bfb9606f7fc4730642ae23404177724048922982dbba425fd3bb",
    },
    {
      name: "project-source-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:996d4426d3aeba0a640347385696568d4ac50368c801d1aac8bf6f27b9c97ace",
    },
    {
      name: "project-source-registration-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:f24333e7b6a2aa84f690793578f9e0a45aaf9ed607f9cd821927f4541295f9fb",
    },
    {
      name: "project-source-registration-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:e651eb35eb22c788cf6e7e5eecc96d118a2fdae09b01cb5bfaac572ef4156fab",
    },
    {
      name: "project-source-registration-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:af195b8e201dae246dfee82e82c0d2069b5b3828db646a7d5908d79b48c83906",
    },
    {
      name: "project-source-revision-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:2ff6f4c45a028501667a03766c026a9832e96ab522b4f7c745c55203afb9811a",
    },
    {
      name: "project-source-revision-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:ee6a08640c1e27cffa4b11133ce31016427c34a1b53fe8597ce647c9ff1cc65a",
    },
    {
      name: "project-source-revision-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:483a6fbfa97bec988e20d460ddd50a6044d0586eda909ddfc3d138ebc4fb20d7",
    },
    {
      name: "project-source-link-removal-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:792e57ff0027a4d2042a9e42c27cfd0c47de3a0a825adcfaeefae22dc999cacc",
    },
    {
      name: "project-source-link-removal-preview",
      version: "1.0.0",
      canonical_sha256:
        "sha256:3cd1c6a01b92858f54c3667b88afcac9a81ea4d26b439c6b7880f95f7f6a1f12",
    },
    {
      name: "project-source-link-removal-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:fb0d4b9a9e260389833c12d9cd89095f0dd2828e5d6ddf907d2e72a7374a3e0d",
    },
    {
      name: "project-source-link-removal-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:358b6cce0cf1b1fefc31d621c1ee207a20b9a2a9adc276637810f23cfbbc4730",
    },
    {
      name: "project-source-processing-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:ed7e1f54b15d247485a47a502fb49fe474d0e5291c48be2cb313997d7be396ee",
    },
    {
      name: "project-source-processing-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:9f0272e553ef770c1b530738699c3edfa0ea688ce5b317e8c9dd3a75e6e44b56",
    },
    {
      name: "project-source-processing-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:ee2671041b39eefbfae79c7dd34fb509f1056ac4a4a8ff5c35284462dcc612f8",
    },
    {
      name: "project-source-processing-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:dd61aaf9dbaf8e11e19d710d240fd0bf49c109c74d5dec48008ed60537b91ab9",
    },
    {
      name: "project-source-reuse-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:9be4b4d55326dc521184f58c807895319349e8838770da5fc9746db4682a80b1",
    },
    {
      name: "project-source-reuse-options-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:36837fccc0c9e32f147a6a02bb458b72f147c8908ff2bec039530b4fabcb1407",
    },
    {
      name: "project-source-reuse-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:37dd0f699915772267d69db4247e5329ca1c9a0dcd8608a90eafe2b8a7bcec48",
    },
    {
      name: "project-source-reuse-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:68bc2afbb5c9cd5134b55c0ac59f978ba4e16865e1ae80c04800913d6b78df81",
    },
    {
      name: "project-source-local-copy-deletion-request",
      version: "1.0.0",
      canonical_sha256:
        "sha256:e00f0f94fbde05f903935576d6489d2c06757a88fc50f5c560dc3b339fc55451",
    },
    {
      name: "project-source-local-copy-deletion-preview",
      version: "1.0.0",
      canonical_sha256:
        "sha256:3dcc16dcab6e5a770d7497d1ea8aa87eddcf1d20d0d59c26af49bd314520d8de",
    },
    {
      name: "project-source-local-copy-deletion-receipt",
      version: "1.0.0",
      canonical_sha256:
        "sha256:6495a67536c7ec2dcd0f740b43170f10b629c74e79218bf527310e8856daf85a",
    },
    {
      name: "project-source-local-copy-deletion-recovery-view",
      version: "1.0.0",
      canonical_sha256:
        "sha256:2aa1e357697f59c2751e189101ef7a963e7247d3a2be04531a2b98516cbb5639",
    },
    {
      name: "work-unit",
      version: "1.0.0",
      canonical_sha256:
        "sha256:6009a3c4ec45df4f7073189f8ef111e59428392a9c8fec1ee14508aeca04c316",
    },
    {
      name: "worker-input-manifest",
      version: "1.0.0",
      canonical_sha256:
        "sha256:af13674bd5ef8f101f192f70de5d46f5fee9d9e38421451aaacbe203fa4c2d0b",
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
