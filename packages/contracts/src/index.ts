export type { PetraActor } from "./generated/actor.js";
export type {
  ActorRef as CapabilityGrantActorRef,
  GrantContent as CapabilityGrantContent,
  HumanActorRef as CapabilityGrantIssuerRef,
  PetraCapabilityGrant,
} from "./generated/capability-grant.js";
export type {
  GrantContent as CapabilityGrantContentV110,
  PetraCapabilityGrantV110,
} from "./generated/capability-grant-v1-1.js";
export type {
  GrantContent as CapabilityGrantContentV120,
  PetraCapabilityGrantV120,
} from "./generated/capability-grant-v1-2.js";
export type {
  GrantContent as CapabilityGrantContentV130,
  PetraCapabilityGrantV130,
} from "./generated/capability-grant-v1-3.js";
export type {
  GrantContent as CapabilityGrantContentV140,
  PetraCapabilityGrantV140,
} from "./generated/capability-grant-v1-4.js";
export type {
  GrantContent as CapabilityGrantContentV150,
  PetraCapabilityGrantV150,
} from "./generated/capability-grant-v1-5.js";
export type {
  GrantContent as CapabilityGrantContentV160,
  PetraCapabilityGrantV160,
} from "./generated/capability-grant-v1-6.js";
export type {
  GrantContent as CapabilityGrantContentV170,
  PetraCapabilityGrantV170,
} from "./generated/capability-grant-v1-7.js";
export type {
  GrantRef as CapabilityGrantRevocationGrantRef,
  HumanActorRef as CapabilityGrantRevokerRef,
  PetraCapabilityGrantRevocation,
  RevocationContent as CapabilityGrantRevocationContent,
} from "./generated/capability-grant-revocation.js";
export type { PetraArtifact } from "./generated/artifact.js";
export type {
  AcquiredOrigin,
  GeneratedOrigin,
  Integrity,
  IntegrityProblem,
  Origin,
  PetraArtifactManifest,
  ResponseMetadata,
  StorageRef,
  UserSuppliedOrigin,
} from "./generated/artifact-manifest.js";
export type { PetraAuthor } from "./generated/author.js";
export type { PetraContractSmoke } from "./generated/contract-smoke.js";
export type {
  AuthorSubject,
  PetraExternalIdentifier,
  WorkSubject,
  WorkVersionSubject,
} from "./generated/external-identifier.js";
export type { ActorRef, PetraProject } from "./generated/project.js";
export type {
  DefinitionContent as ProjectDefinitionContent,
  DefinitionOrigin as ProjectDefinitionOrigin,
  NamedVersionHash as ProjectDefinitionContractRef,
  PetraProjectDefinition,
  Registration as ProjectDefinitionRegistration,
  Term as ProjectDefinitionTerm,
} from "./generated/project-definition.js";
export type {
  ObjectiveContent as ProjectObjectiveContent,
  ObjectiveRef as ProjectObjectiveRef,
  PetraProjectObjective,
} from "./generated/project-objective.js";
export type {
  ObjectiveRepresentation as ProjectInquiryObjectiveRepresentation,
  PetraProjectInquiryRole,
  RoleContent as ProjectInquiryRoleContent,
} from "./generated/project-inquiry-role.js";
export type {
  InquiryAnchor as ProjectInquiryAnchor,
  InquiryRoleRef as ProjectInquiryRoleRef,
  LinkContent as ProjectInquiryLinkContent,
  ObjectiveRef as ProjectInquiryObjectiveRef,
  PetraProjectInquiryLink,
  ResultTarget as ProjectInquiryResultTarget,
  TypedRecordRef as ProjectInquiryTypedRecordRef,
  WorkTarget as ProjectInquiryWorkTarget,
  WorkUnitRef as ProjectInquiryWorkUnitRef,
} from "./generated/project-inquiry-link.js";
export type {
  AuthorityPosition as ProjectInquiryViewAuthorityPosition,
  CollectionContent as ProjectInquiryViewCollectionContent,
  CollectionQuery as ProjectInquiryViewCollectionQuery,
  CoverageItem as ProjectInquiryViewCoverageItem,
  CurrentWork as ProjectInquiryViewCurrentWork,
  DetailContent as ProjectInquiryViewDetailContent,
  FramingRevision as ProjectInquiryViewFramingRevision,
  InquirySummary as ProjectInquiryViewSummary,
  OpenQuestion as ProjectInquiryViewOpenQuestion,
  Page as ProjectInquiryViewPage,
  PetraProjectInquiryView,
  RelatedInquiry as ProjectInquiryViewRelatedInquiry,
  ResultLink as ProjectInquiryViewResultLink,
  RoleSummary as ProjectInquiryViewRoleSummary,
  WorkLink as ProjectInquiryViewWorkLink,
} from "./generated/project-inquiry-view.js";
export type {
  Action as SuggestedAction,
  AuthorityPosition as SuggestedActionAuthorityPosition,
  BackgroundWork as SuggestedActionBackgroundWork,
  Basis as SuggestedActionBasis,
  Objective as SuggestedActionObjective,
  PetraSuggestedActionView,
  Ready as SuggestedActionReady,
  Stale as SuggestedActionStale,
  SuggestedActionRef,
  ViewContent as SuggestedActionViewContent,
} from "./generated/suggested-action-view.js";
export type {
  AuthorityPosition as SuggestedActionAuthorityPositionV11,
  GrantRef as SuggestedActionGrantRefV11,
  PetraSuggestedActionViewV110 as PetraSuggestedActionViewV11,
  WorkAction as SuggestedWorkAction,
  WorkBasis as SuggestedWorkActionBasis,
  WorkPreviewContent as SuggestedWorkActionViewContent,
  WorkReady as SuggestedWorkActionReady,
  WorkStale as SuggestedWorkActionStale,
  WorkUnavailable as SuggestedWorkActionUnavailable,
} from "./generated/suggested-action-view-v1-1.js";
export type { PetraSuggestedActionInvocationRequest } from "./generated/suggested-action-invocation-request.js";
export type {
  CommandRef as SuggestedActionInvocationCommandRef,
  ExactInputs as SuggestedActionInvocationExactInputs,
  InteractionCorrelation as SuggestedActionInteractionCorrelation,
  InvocationContent as SuggestedActionInvocationContent,
  PetraSuggestedActionInvocation,
} from "./generated/suggested-action-invocation.js";
export type {
  HistoryEntry as SuggestedActionInvocationHistoryEntry,
  InvocationRef as SuggestedActionInvocationRef,
  PetraSuggestedActionInvocationView,
  RecoveryAction as SuggestedActionInvocationRecoveryAction,
  ViewContent as SuggestedActionInvocationViewContent,
} from "./generated/suggested-action-invocation-view.js";
export type {
  AttentionItem as ProjectShellAttentionItem,
  AuthorityPosition as ProjectShellAuthorityPosition,
  DefinitionSummary as ProjectShellDefinitionSummary,
  ExactRef as ProjectShellExactRef,
  ObjectiveSummary as ProjectShellObjectiveSummary,
  PetraProjectShellView,
  ProjectSummary as ProjectShellProjectSummary,
  ProjectionSummary as ProjectShellProjectionSummary,
  ShellContent as ProjectShellContent,
} from "./generated/project-shell-view.js";
export type {
  AvailablePlaceSummary as ProjectShellAvailablePlaceSummary,
  PetraProjectShellViewV11,
  PlaceSummary as ProjectShellPlaceSummary,
  ShellContent as ProjectShellContentV11,
  UnavailablePlaceSummary as ProjectShellUnavailablePlaceSummary,
} from "./generated/project-shell-view-v1-1.js";
export type {
  AuthorityPosition as ProjectHistoryAuthorityPosition,
  CommandRef as ProjectHistoryCommandRef,
  EligibleRecovery as ProjectHistoryEligibleRecovery,
  EventRef as ProjectHistoryEventRef,
  HistoryContent as ProjectHistoryContent,
  IneligibleRecovery as ProjectHistoryIneligibleRecovery,
  ObservedEffect as ProjectHistoryObservedEffect,
  PetraProjectHistoryView,
  RecentChange as ProjectHistoryRecentChange,
  Recovery as ProjectHistoryRecovery,
  RecoveryRef as ProjectHistoryRecoveryRef,
  SemanticDestination as ProjectHistorySemanticDestination,
  TargetRef as ProjectHistoryTargetRef,
} from "./generated/project-history-view.js";
export type {
  CausalCommandLink as ProjectHistoryCausalCommandLink,
  Causality as ProjectHistoryCausality,
  EpisodeContent as ProjectHistoryEpisodeContent,
  PetraProjectHistoryEpisodeView,
  ReceiptRef as ProjectHistoryReceiptRef,
  StreamOrder as ProjectHistoryStreamOrder,
} from "./generated/project-history-episode-view.js";
export type {
  AvailableProjectDefinitionAuthority as ProjectHistoryAvailableDefinitionAuthorityV11,
  EpisodeContent as ProjectHistoryEpisodeContentV11,
  PetraProjectHistoryEpisodeViewV110 as PetraProjectHistoryEpisodeViewV11,
  ProjectDefinitionAuthority as ProjectHistoryDefinitionAuthorityV11,
  ProjectDefinitionRef as ProjectHistoryDefinitionRefV11,
  UnavailableProjectDefinitionAuthority as ProjectHistoryUnavailableDefinitionAuthorityV11,
} from "./generated/project-history-episode-view-v1-1.js";
export type {
  AvailableHistoricalSemanticDestination as ProjectHistoryAvailableHistoricalSemanticDestinationV12,
  AvailableProjectDefinitionAuthority as ProjectHistoryAvailableDefinitionAuthorityV12,
  EpisodeContent as ProjectHistoryEpisodeContentV12,
  HistoricalSemanticDestination as ProjectHistoryHistoricalSemanticDestinationV12,
  HistoryEpisodeRouteAuthority as ProjectHistoryEpisodeRouteAuthorityV12,
  PetraProjectHistoryEpisodeViewV120 as PetraProjectHistoryEpisodeViewV12,
  ProjectDefinitionAuthority as ProjectHistoryDefinitionAuthorityV12,
  ProjectDefinitionRef as ProjectHistoryDefinitionRefV12,
  RegisteredHistoricalTargetRef as ProjectHistoryRegisteredHistoricalTargetRefV12,
  UnavailableHistoricalSemanticDestinationUnregisteredTarget as ProjectHistoryUnregisteredHistoricalSemanticDestinationV12,
  UnavailableHistoricalSemanticDestinationUnsupportedPlace as ProjectHistoryUnsupportedHistoricalSemanticDestinationV12,
  UnavailableHistoricalSemanticDestinationWithoutAuthority as ProjectHistoryNoAuthorityHistoricalSemanticDestinationV12,
  UnavailableProjectDefinitionAuthority as ProjectHistoryUnavailableDefinitionAuthorityV12,
} from "./generated/project-history-episode-view-v1-2.js";
export type {
  AuthorityPosition as ProjectHistoryRetainedAuthorityPosition,
  CollectionQuery as ProjectHistoryRetainedCollectionQuery,
  EmptyRetentionSnapshot as ProjectHistoryEmptyRetentionSnapshot,
  NonemptyRetentionSnapshot as ProjectHistoryNonemptyRetentionSnapshot,
  OpaqueCursor as ProjectHistoryOpaqueCursor,
  Page as ProjectHistoryRetainedPage,
  PetraProjectHistoryRetainedView,
  RetainedContent as ProjectHistoryRetainedContent,
  RetentionSnapshot as ProjectHistoryRetentionSnapshot,
} from "./generated/project-history-retained-view.js";
export type {
  CollectionFilters as ProjectHistoryRetainedCollectionFiltersV11,
  CollectionQuery as ProjectHistoryRetainedCollectionQueryV11,
  ExactTargetFilter as ProjectHistoryRetainedExactTargetFilterV11,
  PetraProjectHistoryRetainedViewV110 as PetraProjectHistoryRetainedViewV11,
  RecordedTimeFilter as ProjectHistoryRetainedRecordedTimeFilterV11,
  RetainedContent as ProjectHistoryRetainedContentV11,
} from "./generated/project-history-retained-view-v1-1.js";
export type {
  ActorDisplayDescriptor as ProjectHistoryActorDisplayDescriptorV12,
  ActorOption as ProjectHistoryActorOptionV12,
  ActorOptionCatalogue as ProjectHistoryActorOptionCatalogueV12,
  ActorRecordRef as ProjectHistoryActorRecordRefV12,
  CollectionFilters as ProjectHistoryRetainedCollectionFiltersV12,
  CollectionQuery as ProjectHistoryRetainedCollectionQueryV12,
  ExactTargetFilter as ProjectHistoryRetainedExactTargetFilterV12,
  FilterOptions as ProjectHistoryFilterOptionsV12,
  PetraProjectHistoryRetainedViewV120 as PetraProjectHistoryRetainedViewV12,
  RecordedTimeFilter as ProjectHistoryRetainedRecordedTimeFilterV12,
  RetainedContent as ProjectHistoryRetainedContentV12,
  TargetDisplayDescriptor as ProjectHistoryTargetDisplayDescriptorV12,
  TargetOption as ProjectHistoryTargetOptionV12,
  TargetOptionCatalogue as ProjectHistoryTargetOptionCatalogueV12,
} from "./generated/project-history-retained-view-v1-2.js";
export type {
  ContinuationFailure as ProjectHistoryRetainedContinuationFailureContent,
  ContinuationFailureSubcode as ProjectHistoryRetainedContinuationFailureSubcode,
  PetraProjectHistoryRetainedContinuationFailure,
  Restart as ProjectHistoryRetainedContinuationRestart,
} from "./generated/project-history-retained-continuation-failure.js";
export type {
  AuthorityPosition as ProjectHistoryImpactAuthorityPosition,
  CausalCommand as ProjectHistoryImpactCausalCommand,
  CausalCommandGroup as ProjectHistoryImpactCausalCommandGroup,
  DecisionBoundary as ProjectHistoryImpactDecisionBoundary,
  EventAnchor as ProjectHistoryImpactEventAnchor,
  GraphProjectionRecordRef as ProjectHistoryImpactGraphProjectionRecordRef,
  GroundedResponseGroup as ProjectHistoryImpactGroundedResponseGroup,
  GroundedResponseInvalidationRef as ProjectHistoryImpactGroundedResponseInvalidationRef,
  Impact as ProjectHistoryImpact,
  ImpactContent as ProjectHistoryImpactContent,
  ImpactSummary as ProjectHistoryImpactSummary,
  OutboxGroup as ProjectHistoryImpactOutboxGroup,
  OutboxRecordRef as ProjectHistoryImpactOutboxRecordRef,
  PetraProjectHistoryImpactView,
  ProjectionGroup as ProjectHistoryImpactProjectionGroup,
} from "./generated/project-history-impact-view.js";
export type {
  AdapterGroup as ProjectHistorySemanticImpactAdapterGroup,
  DependentRef as ProjectHistorySemanticDependentRef,
  ImpactContent as ProjectHistoryImpactContentV11,
  PetraProjectHistoryImpactViewV11,
  RegisteredAssessment as ProjectHistoryRegisteredTargetAssessment,
  RegistryEntry as ProjectHistorySemanticAdapterRegistration,
  ResolvedTargetRef as ProjectHistoryResolvedTargetRef,
  SemanticSummary as ProjectHistorySemanticImpactSummary,
  SemanticTargetImpact as ProjectHistorySemanticTargetImpact,
  TargetAssessment as ProjectHistoryTargetAssessment,
  UnavailableAssessment as ProjectHistoryUnavailableTargetAssessment,
} from "./generated/project-history-impact-view-v1-1.js";
export type {
  AdapterGroup as ProjectHistorySemanticImpactAdapterGroupV12,
  DependentRef as ProjectHistorySemanticDependentRefV12,
  ImpactContent as ProjectHistoryImpactContentV12,
  PetraProjectHistoryImpactViewV12,
  RegisteredAssessment as ProjectHistoryRegisteredTargetAssessmentV12,
  ResolvedTargetRef as ProjectHistoryResolvedTargetRefV12,
  SemanticSummary as ProjectHistorySemanticImpactSummaryV12,
  SemanticTargetImpact as ProjectHistorySemanticTargetImpactV12,
  TargetAssessment as ProjectHistoryTargetAssessmentV12,
  UnavailableAssessment as ProjectHistoryUnavailableTargetAssessmentV12,
} from "./generated/project-history-impact-view-v1-2.js";
export type {
  ImpactContent as ProjectHistoryImpactContentV13,
  InputBindingRef as ProjectHistoryOperationalInputBindingRefV13,
  InteractionRunRef as ProjectHistoryOperationalInteractionRunRefV13,
  OperationalAdapterGroup as ProjectHistoryOperationalAdapterGroupV13,
  OperationalDependencyImpact as ProjectHistoryOperationalDependencyImpactV13,
  OperationalDependentRef as ProjectHistoryOperationalDependentRefV13,
  OperationalTargetAssessment as ProjectHistoryOperationalTargetAssessmentV13,
  PetraProjectHistoryImpactViewV13,
  RegisteredOperationalAssessment as ProjectHistoryRegisteredOperationalAssessmentV13,
  ResolvedTargetRecord as ProjectHistoryResolvedTargetRecordV13,
  UnavailableOperationalAssessment as ProjectHistoryUnavailableOperationalAssessmentV13,
  WorkUnitRef as ProjectHistoryOperationalWorkUnitRefV13,
} from "./generated/project-history-impact-view-v1-3.js";
export type {
  AvailableWorkDestination as ProjectHistoryAvailableWorkDestinationV14,
  DefinitionRef as ProjectHistoryOperationalDefinitionRefV14,
  ImpactContent as ProjectHistoryImpactContentV14,
  InputBindingRef as ProjectHistoryOperationalInputBindingRefV14,
  InteractionRunRef as ProjectHistoryOperationalInteractionRunRefV14,
  OperationalAdapterGroup as ProjectHistoryOperationalAdapterGroupV14,
  OperationalDependencyImpact as ProjectHistoryOperationalDependencyImpactV14,
  OperationalDependentRef as ProjectHistoryOperationalDependentRefV14,
  OperationalDestination as ProjectHistoryOperationalDestinationV14,
  OperationalTargetAssessment as ProjectHistoryOperationalTargetAssessmentV14,
  OutputOperationalDestination as ProjectHistoryOutputOperationalDestinationV14,
  PetraProjectHistoryImpactViewV14,
  ProjectWorkRouteAuthority as ProjectHistoryProjectWorkRouteAuthorityV14,
  RegisteredOperationalAssessment as ProjectHistoryRegisteredOperationalAssessmentV14,
  ReplayOperationalDestination as ProjectHistoryReplayOperationalDestinationV14,
  ResolvedTargetRecord as ProjectHistoryResolvedTargetRecordV14,
  UnavailableOperationalAssessment as ProjectHistoryUnavailableOperationalAssessmentV14,
  UnavailableWorkDestination as ProjectHistoryUnavailableWorkDestinationV14,
  WorkOperationalDestination as ProjectHistoryWorkOperationalDestinationV14,
  WorkUnitRef as ProjectHistoryOperationalWorkUnitRefV14,
} from "./generated/project-history-impact-view-v1-4.js";
export type {
  Assessment as ProjectHistoryRecoveryAssessment,
  AssessmentBlocker as ProjectHistoryRecoveryAssessmentBlocker,
  CausalImpactBasis as ProjectHistoryRecoveryCausalImpactBasis,
  ChangeSetAuthorityRef as ProjectHistoryRecoveryChangeSetRef,
  CommandAuthority as ProjectHistoryRecoveryCommandAuthority,
  PetraProjectHistoryRecoveryAssessmentView,
  RecoveryAssessmentContent as ProjectHistoryRecoveryAssessmentContent,
  RecoverySubject as ProjectHistoryRecoverySubject,
} from "./generated/project-history-recovery-assessment-view.js";
export type {
  AssessmentRef as ProjectHistoryCompensationPreviewAssessmentRef,
  CommandStep as ProjectHistoryCompensationPreviewCommandStep,
  Freshness as ProjectHistoryCompensationPreviewFreshness,
  OperationPreview as ProjectHistoryCompensationOperationPreview,
  PetraProjectHistoryCompensationPreviewView,
  PreviewContent as ProjectHistoryCompensationPreviewContent,
  ResultingTarget as ProjectHistoryCompensationResultingTarget,
} from "./generated/project-history-compensation-preview-view.js";
export type { PetraProjectHistoryCompensationPlanRequest } from "./generated/project-history-compensation-plan-request.js";
export type {
  PetraProjectHistoryCompensationPlanView,
  PlanContent as ProjectHistoryCompensationPlanContent,
  PlannedCommand as ProjectHistoryCompensationPlannedCommand,
  PreviewRef as ProjectHistoryCompensationPlanPreviewRef,
  Revalidation as ProjectHistoryCompensationPlanRevalidation,
} from "./generated/project-history-compensation-plan-view.js";
export type { PetraProjectHistoryCompensationExecutionRequest } from "./generated/project-history-compensation-execution-request.js";
export type {
  ExecutionContent as ProjectHistoryCompensationExecutionContent,
  ExecutionStep as ProjectHistoryCompensationExecutionStep,
  PetraProjectHistoryCompensationExecutionView,
  PlanRef as ProjectHistoryCompensationExecutionPlanRef,
} from "./generated/project-history-compensation-execution-view.js";
export type {
  AuthoritySnapshot as ProjectEffectiveControlsAuthoritySnapshot,
  ControlSection as ProjectEffectiveControlSection,
  ControlSections as ProjectEffectiveControlSections,
  EffectiveControlsContent as ProjectEffectiveControlsContent,
  MaterialValue as ProjectEffectiveControlValue,
  PetraProjectEffectiveControlsView,
} from "./generated/project-effective-controls-view.js";
export type {
  AttentionSummary as ProjectWorkAttentionSummary,
  AuthorityPosition as ProjectWorkAuthorityPosition,
  CollectionContent as ProjectWorkCollectionContent,
  CollectionQuery as ProjectWorkCollectionQuery,
  ContentRecordRef as ProjectWorkContentRecordRef,
  ControlSummary as ProjectWorkControlSummary,
  CoverageItem as ProjectWorkCoverageItem,
  DefinitionRef as ProjectWorkDefinitionRef,
  DependencySummary as ProjectWorkDependencySummary,
  DetailContent as ProjectWorkDetailContent,
  ElapsedSummary as ProjectWorkElapsedSummary,
  ExecutionSummary as ProjectWorkExecutionSummary,
  OutputSummary as ProjectWorkOutputSummary,
  Page as ProjectWorkPage,
  PetraProjectWorkView,
  ResourceSummary as ProjectWorkResourceSummary,
  SpecificationSummary as ProjectWorkSpecificationSummary,
  TaskSummary as ProjectWorkTaskSummary,
  UnavailableLinkage as ProjectWorkUnavailableLinkage,
  WorkflowSummary as ProjectWorkWorkflowSummary,
  WorkUnitRef as ProjectWorkUnitRef,
} from "./generated/project-work-view.js";
export type {
  AuthorityContext as ProjectThreadAuthorityContext,
  ContextBinding as ProjectThreadContextBinding,
  DefinitionRef as ProjectThreadDefinitionRef,
  ExactArtifactRef as ProjectThreadExactArtifactRef,
  ExactTypedRecordRef as ProjectThreadExactTypedRecordRef,
  PetraProjectThread,
  ThreadContent as ProjectThreadContent,
  ThreadOrigin as ProjectThreadOrigin,
  Turn as ProjectThreadTurn,
} from "./generated/project-thread.js";
export type {
  AuthorityPosition as ProjectThreadViewAuthorityPosition,
  CollectionContent as ProjectThreadViewCollectionContent,
  CollectionQuery as ProjectThreadViewCollectionQuery,
  DetailContent as ProjectThreadViewDetailContent,
  LatestTurn as ProjectThreadViewLatestTurn,
  OperationCapability as ProjectThreadViewOperationCapability,
  Page as ProjectThreadViewPage,
  PetraProjectThreadView,
  ThreadRef as ProjectThreadViewThreadRef,
  ThreadSummary as ProjectThreadViewThreadSummary,
  TurnView as ProjectThreadViewTurn,
} from "./generated/project-thread-view.js";
export type {
  ArtifactManifestRef as ProjectSourceArtifactManifestRef,
  AuthorRef as ProjectSourceAuthorRef,
  DefinitionRef as ProjectSourceDefinitionRef,
  PetraProjectSource,
  ProjectSourceContent,
  WorkRef as ProjectSourceWorkRef,
  WorkVersionRef as ProjectSourceWorkVersionRef,
} from "./generated/project-source.js";
export type {
  ActiveSourceRef as ProjectSourceReplacementActiveSourceRef,
  ExcludedSourceRef as ProjectSourceReplacementExcludedSourceRef,
  ExclusionReceiptRef as ProjectSourceReplacementExclusionReceiptRef,
  PetraProjectSourceReplacement,
  ReplacementContent as ProjectSourceReplacementContent,
} from "./generated/project-source-replacement.js";
export type {
  PetraProjectSourceReplacementRetraction,
  ReplacementRef as ProjectSourceReplacementRetractionReplacementRef,
  RetractionContent as ProjectSourceReplacementRetractionContent,
} from "./generated/project-source-replacement-retraction.js";
export type {
  CreateReceiptContent as ProjectSourceReplacementCreateReceiptContent,
  PetraProjectSourceReplacementReceipt,
  RetractionReceiptContent as ProjectSourceReplacementRetractionReceiptContent,
} from "./generated/project-source-replacement-receipt.js";
export type ProjectSourceReplacementSourceRef =
  ProjectSourceReplacementExcludedRef | ProjectSourceReplacementActiveRef;
export type {
  AuthorityPosition as ProjectSourceLifecycleAuthorityPosition,
  ExactDependentRef as ProjectSourceLifecycleDependentRef,
  Impact as ProjectSourceLifecycleImpact,
  ImpactGroup as ProjectSourceLifecycleImpactGroup,
  LifecycleContent as ProjectSourceLifecycleContent,
  NotApplicableTransition as ProjectSourceLifecycleNotApplicableTransition,
  Operation as ProjectSourceLifecycleOperation,
  PetraProjectSourceLifecycleView,
  PreviewTransition as ProjectSourceLifecyclePreviewTransition,
  RetentionItem as ProjectSourceLifecycleRetentionItem,
  SourceRef as ProjectSourceLifecycleSourceRef,
  UnavailableTransition as ProjectSourceLifecycleUnavailableTransition,
} from "./generated/project-source-lifecycle-view.js";
export type {
  CommandRef as ProjectSourceLifecycleCommandRef,
  EventRef as ProjectSourceLifecycleEventRef,
  ExactProjectSourceRef as ProjectSourceLifecycleExactSourceRef,
  PetraProjectSourceLifecycleReceipt,
  Preservation as ProjectSourceLifecyclePreservation,
  ReceiptContent as ProjectSourceLifecycleReceiptContent,
  Recovery as ProjectSourceLifecycleRecovery,
} from "./generated/project-source-lifecycle-receipt.js";
export type {
  ActorRef as WorkingCandidateActorRef,
  AuthorityBoundary as WorkingCandidateAuthorityBoundary,
  BasisItem as WorkingCandidateBasisItem,
  CandidateLineage as WorkingCandidateLineage,
  ExactTypedRecordRef as WorkingCandidateExactRecordRef,
  InputSnapshot as WorkingCandidateInputSnapshot,
  NamedVersionHash as WorkingCandidateNamedVersionHash,
  Origin as WorkingCandidateOrigin,
  PetraWorkingCandidate,
  Producer as WorkingCandidateProducer,
  ProfileObjectBinding as WorkingCandidateProfileObjectBinding,
  ProjectDefinitionRef as WorkingCandidateDefinitionRef,
  ProjectSnapshotRef as WorkingCandidateSnapshotRef,
  ProvenanceItem as WorkingCandidateProvenanceItem,
  QualificationStatement as WorkingCandidateQualificationStatement,
  Qualifications as WorkingCandidateQualifications,
  TaskContext as WorkingCandidateTaskContext,
  Validation as WorkingCandidateValidation,
  ValidationResult as WorkingCandidateValidationResult,
  WorkingCandidateId,
  WorkingCandidateRef,
} from "./generated/working-candidate.js";
export type {
  Endpoint as WorkingRelationshipEndpoint,
  LiteralEndpoint as WorkingRelationshipLiteralEndpoint,
  PetraWorkingRelationship,
  ProfileRecordEndpoint as WorkingRelationshipProfileRecordEndpoint,
  ProfileRelationshipBinding as WorkingRelationshipProfileBinding,
  RelationshipEndpoints as WorkingRelationshipEndpoints,
  RelationshipLineage as WorkingRelationshipLineage,
  WorkingCandidateEndpoint as WorkingRelationshipCandidateEndpoint,
  WorkingRelationshipId,
  WorkingRelationshipRef,
} from "./generated/working-relationship.js";
export type {
  AuthorityPosition as ProjectWorkingStateAuthorityPosition,
  PetraProjectWorkingStateSnapshot,
  SelectionBoundary as ProjectWorkingStateSelectionBoundary,
  SnapshotContent as ProjectWorkingStateSnapshotContent,
} from "./generated/project-working-state-snapshot.js";
export type {
  AuthorityPosition as ProjectSourceAuthorityPosition,
  BindingSummary as ProjectSourceBindingSummary,
  CopySummary as ProjectSourceCopySummary,
  CreatorSummary as ProjectSourceCreatorSummary,
  DownstreamUse as ProjectSourceDownstreamUse,
  ExactRef as ProjectSourceExactRef,
  IdentitySummary as ProjectSourceIdentitySummary,
  PetraProjectSourceView,
  Preview as ProjectSourcePreview,
  RepresentationSummary as ProjectSourceRepresentationSummary,
  RightsSummary as ProjectSourceRightsSummary,
  SourceViewContent as ProjectSourceViewContent,
} from "./generated/project-source-view.js";
export type {
  CandidateBinding as ReviewSessionCandidateBinding,
  DefinitionRef as ReviewSessionDefinitionRef,
  ExactRecordRef as ReviewSessionExactRecordRef,
  HumanActorRef as ReviewSessionHumanActorRef,
  ObjectiveRef as ReviewSessionObjectiveRef,
  Origin as ReviewSessionOrigin,
  PetraReviewSession,
  ProjectSnapshot as ReviewSessionProjectSnapshot,
  ReturnContext as ReviewSessionReturnContext,
  ReviewMember as ReviewSessionMember,
  SessionContent as ReviewSessionContent,
} from "./generated/review-session.js";
export type {
  CandidateBinding as ReviewSessionCandidateBindingV110,
  PetraReviewSessionV110,
  ReviewMember as ReviewSessionMemberV110,
  SessionContent as ReviewSessionContentV110,
  WorkingCandidateRef as ReviewSessionWorkingCandidateRef,
  WorkingRelationshipRef as ReviewSessionWorkingRelationshipRef,
  WorkingStateBinding as ReviewSessionWorkingStateBinding,
} from "./generated/review-session-v1-1.js";
export type {
  AuthorityBoundary as ReviewSessionLifecycleAuthorityBoundary,
  CommandRef as ReviewSessionLifecycleCommandRef,
  ExactReviewSessionRecordRef as ReviewSessionLifecycleExactRef,
  PetraReviewSessionLifecycleReceipt,
  Preservation as ReviewSessionLifecyclePreservation,
  ReceiptContent as ReviewSessionLifecycleReceiptContent,
  Recovery as ReviewSessionLifecycleRecovery,
} from "./generated/review-session-lifecycle-receipt.js";
export type {
  AuthorityBoundary as ReviewSessionRefreshAuthorityBoundary,
  CommandRef as ReviewSessionRefreshCommandRef,
  ExactReviewSessionRef as ReviewSessionRefreshExactRef,
  PetraReviewSessionRefreshReceipt,
  Preservation as ReviewSessionRefreshPreservation,
  ReceiptContent as ReviewSessionRefreshReceiptContent,
  RefreshedMember as ReviewSessionRefreshedMember,
  RefreshBasis as ReviewSessionRefreshBasis,
  Snapshot as ReviewSessionRefreshSnapshot,
} from "./generated/review-session-refresh-receipt.js";
export type {
  AuthorityBoundary as ReviewCandidateCorrectionAuthorityBoundary,
  CommandRef as ReviewCandidateCorrectionCommandRef,
  ExactReviewSessionRef as ReviewCandidateCorrectionReviewSessionRef,
  ExactTypedRecordRef as ReviewCandidateCorrectionProfileRecordRef,
  PetraReviewCandidateCorrectionReceipt,
  Preservation as ReviewCandidateCorrectionPreservation,
  ReceiptContent as ReviewCandidateCorrectionReceiptContent,
  ValidationBinding as ReviewCandidateCorrectionValidationBinding,
  WorkingCandidateRecordRef as ReviewCandidateCorrectionWorkingCandidateRef,
  WorkingRelationshipRecordRef as ReviewCandidateCorrectionWorkingRelationshipRef,
} from "./generated/review-candidate-correction-receipt.js";
export type {
  AuthorityBoundary as ReviewCandidateBasisRevisionAuthorityBoundary,
  CommandRef as ReviewCandidateBasisRevisionCommandRef,
  ExactProjectSourceRef as ReviewCandidateBasisRevisionProjectSourceRef,
  ExactReviewSessionRef as ReviewCandidateBasisRevisionReviewSessionRef,
  ExactSourceSpanRef as ReviewCandidateBasisRevisionSourceSpanRef,
  ExactTypedRecordRef as ReviewCandidateBasisRevisionProfileRecordRef,
  PetraReviewCandidateBasisRevisionReceipt,
  Preservation as ReviewCandidateBasisRevisionPreservation,
  ProjectDefinitionRef as ReviewCandidateBasisRevisionProjectDefinitionRef,
  ReceiptContent as ReviewCandidateBasisRevisionReceiptContent,
  SourceBasisSnapshot as ReviewCandidateBasisRevisionSourceBasisSnapshot,
  ValidationReset as ReviewCandidateBasisRevisionValidationReset,
  WorkingCandidateRecordRef as ReviewCandidateBasisRevisionWorkingCandidateRef,
  WorkingRelationshipRecordRef as ReviewCandidateBasisRevisionWorkingRelationshipRef,
} from "./generated/review-candidate-basis-revision-receipt.js";
export type {
  AuthorityBoundary as ReviewSessionSeparationAuthorityBoundary,
  CommandRef as ReviewSessionSeparationCommandRef,
  ExactReviewSessionRef as ReviewSessionSeparationExactRef,
  MemberPartition as ReviewSessionSeparationMemberPartition,
  PetraReviewSessionSeparationReceipt,
  Preservation as ReviewSessionSeparationPreservation,
  ReceiptContent as ReviewSessionSeparationReceiptContent,
} from "./generated/review-session-separation-receipt.js";
export type {
  AuthorityPosition as ProjectReviewAuthorityPosition,
  BasisItem as ProjectReviewBasisItem,
  CandidateSummary as ProjectReviewCandidateSummary,
  ChangeSetSummary as ProjectReviewChangeSetSummary,
  ExactRecordRef as ProjectReviewExactRecordRef,
  ExactRef as ProjectReviewExactRef,
  ObjectiveSummary as ProjectReviewObjectiveSummary,
  OriginSummary as ProjectReviewOriginSummary,
  PetraProjectReviewView,
  ReviewMember as ProjectReviewMember,
  ReviewViewContent as ProjectReviewViewContent,
  ScientificEvidencePayload as ProjectReviewScientificEvidencePayload,
  SessionSummary as ProjectReviewSessionSummary,
  ValidationSummary as ProjectReviewValidationSummary,
} from "./generated/project-review-view.js";
export type {
  AvailableProjection as ProjectReviewAvailableProjectionV110,
  ChangeSetSummary as ProjectReviewChangeSetSummaryV110,
  CommandTrace as ProjectReviewCommandTraceV110,
  EventTrace as ProjectReviewEventTraceV110,
  PetraProjectReviewViewV110,
  ProjectionState as ProjectReviewProjectionStateV110,
  ReviewMember as ProjectReviewMemberV110,
  ReviewViewContent as ProjectReviewViewContentV110,
  UnavailableProjection as ProjectReviewUnavailableProjectionV110,
  WorkingStateComposition as ProjectReviewWorkingStateCompositionV110,
} from "./generated/project-review-view-v1-1.js";
export type {
  PetraProjectReviewViewV120,
  ReviewViewContent as ProjectReviewViewContentV120,
  SessionSummary as ProjectReviewSessionSummaryV120,
} from "./generated/project-review-view-v1-2.js";
export type {
  AuthorityPosition as ProjectRelationshipAuthorityPosition,
  Capabilities as ProjectRelationshipCapabilities,
  Completeness as ProjectRelationshipCompleteness,
  ExactRef as ProjectRelationshipExactRef,
  GraphElementRef as ProjectRelationshipGraphElementRef,
  Node as ProjectRelationshipNode,
  Path as ProjectRelationshipPath,
  PathStep as ProjectRelationshipPathStep,
  PetraProjectRelationshipView,
  Position as ProjectRelationshipPosition,
  Profile as ProjectRelationshipProfile,
  ProjectionPosition as ProjectRelationshipProjectionPosition,
  Query as ProjectRelationshipQuery,
  Relationship as ProjectRelationship,
  SourceDestination as ProjectRelationshipSourceDestination,
  ViewContent as ProjectRelationshipViewContent,
} from "./generated/project-relationship-view.js";
export type {
  AuthorityBoundary1 as ProjectRelationshipOverlayAuthorityBoundary,
  AuthorityPosition as ProjectRelationshipOverlayAuthorityPosition,
  Capabilities as ProjectRelationshipOverlayCapabilities,
  Completeness as ProjectRelationshipOverlayCompleteness,
  CurrentNode as ProjectRelationshipOverlayCurrentNode,
  CurrentRelationship as ProjectRelationshipOverlayCurrentRelationship,
  Exclusion as ProjectRelationshipOverlayExclusion,
  Node as ProjectRelationshipOverlayNode,
  PetraProjectRelationshipOverlayView,
  Positions as ProjectRelationshipOverlayPositions,
  Profile as ProjectRelationshipOverlayProfile,
  Query as ProjectRelationshipOverlayQuery,
  Relationship as ProjectRelationshipOverlayRelationship,
  TextPeer as ProjectRelationshipOverlayTextPeer,
  ViewContent as ProjectRelationshipOverlayViewContent,
  WorkingNode as ProjectRelationshipOverlayWorkingNode,
  WorkingRelationship as ProjectRelationshipOverlayWorkingRelationship,
} from "./generated/project-relationship-overlay-view.js";
export type {
  AuthorityPosition as ProjectObjectLocationAuthorityPosition,
  DefinitionRef as ProjectObjectLocationDefinitionRef,
  Destination as ProjectObjectDestination,
  ExactObjectRef as ProjectObjectExactRef,
  LocationContent as ProjectObjectLocationContent,
  LocationContext as ProjectObjectLocationContext,
  LocationRequest as ProjectObjectLocationRequestContent,
  ObjectDescriptor as ProjectObjectDescriptor,
  PetraProjectObjectLocationView,
  PlaceRole as ProjectObjectPlaceRole,
  ProjectionSummary as ProjectObjectLocationProjectionSummary,
  RequestedObjectRef as ProjectObjectRequestedRef,
  ResolvedLocation as ResolvedProjectObjectLocation,
  UnavailableLocation as UnavailableProjectObjectLocation,
} from "./generated/project-object-location-view.js";
export type { AuthorCredit, PetraWork } from "./generated/work.js";
export type {
  MetadataSource,
  PetraWorkVersion,
} from "./generated/work-version.js";
export type {
  ObservedLicense,
  Permissions,
  PetraRightsDecision,
} from "./generated/rights-decision.js";
export type {
  Diagnostic,
  Page,
  ParserProvenance,
  PetraParsedDocument,
  VersionedComponent,
} from "./generated/parsed-document.js";
export type {
  BlockContent,
  PageLocation,
  PetraStructuralBlock,
  StructuredContent,
  TextContent,
  VisualContent,
} from "./generated/structural-block.js";
export type {
  CompoundSelector,
  Extraction,
  JsonPointer,
  JsonPointerSelector,
  LineRange,
  LineRangeSelector,
  PageRegion,
  PageRegionSelector,
  PetraSourceSpan,
  Point,
  Polygon,
  Region,
  SectionPath,
  SectionPathSelector,
  Selector,
  SelectorComponent,
  TextQuote,
  TextQuoteSelector,
  Verification,
} from "./generated/source-span.js";
export type { PetraDocumentParseBundle } from "./generated/document-parse-bundle.js";
export type {
  Candidate as EvidenceProposalCandidate,
  DeterministicExtraction as DeterministicEvidenceExtraction,
  Diagnostic as EvidenceProposalDiagnostic,
  ExtractionIdentity as EvidenceExtractionIdentity,
  ModelExtraction as ModelEvidenceExtraction,
  PetraEvidenceProposalBundle,
  SourceIdentity as EvidenceProposalSourceIdentity,
  SourceQuote as EvidenceProposalSourceQuote,
} from "./generated/evidence-proposal-bundle.js";
export type {
  Candidate as ModelExtractorCandidate,
  Diagnostic as ModelExtractorDiagnostic,
  PetraModelExtractorOutput,
  SourceQuote as ModelExtractorSourceQuote,
} from "./generated/model-extractor-output.js";
export type {
  CoverageDisclosure as ModelSynthesisCoverageDisclosure,
  EvidenceRef as ModelSynthesisEvidenceRef,
  PetraModelSynthesistOutput,
  PetraSynthesisStatement as ModelPetraSynthesisStatement,
  SourceReportStatement as ModelSourceReportStatement,
  Statement as ModelSynthesisStatement,
  UnresolvedInferenceStatement as ModelUnresolvedInferenceStatement,
} from "./generated/model-synthesist-output.js";
export type {
  CertificationScope as ModelCertificationScope,
  DeploymentSnapshot as CertifiedModelDeployment,
  PetraModelRoleCertification,
  RoleProfileSnapshot as CertifiedRoleProfile,
} from "./generated/model-role-certification.js";
export type {
  CertificationScope as SynthesistCertificationScope,
  DeploymentSnapshot as CertifiedSynthesistDeployment,
  PetraSynthesistRoleCertification,
  RoleProfile as CertifiedSynthesistRoleProfile,
} from "./generated/model-role-certification-v1-1.js";
export type {
  OutboundContextManifest,
  PetraModelRequest,
  RoutingDecision as ModelRoutingDecision,
  TerminalResult as ModelRequestTerminalResult,
} from "./generated/model-request.js";
export type {
  OutboundContext as SynthesistOutboundContext,
  PetraSynthesistModelRequest,
  RoutingDecision as SynthesistRoutingDecision,
  TerminalResult as SynthesistModelRequestTerminalResult,
} from "./generated/model-request-v1-1.js";
export type {
  DeploymentObservation as ModelDeploymentObservation,
  ExactInput as ModelCallInput,
  PetraModelCall,
} from "./generated/model-call.js";
export type {
  DeploymentObservation as SynthesistDeploymentObservation,
  ExactInput as SynthesistModelCallInput,
  PetraSynthesistModelCall,
} from "./generated/model-call-v1-1.js";
export type {
  ClaimBasis,
  Derivation as ClaimDerivation,
  PetraClaim,
  ResearcherBasis as ClaimResearcherBasis,
  ScientificScope as ClaimScientificScope,
  ScopeDimension as ClaimScopeDimension,
  SourceBasis as ClaimSourceBasis,
  SynthesisBasis as ClaimSynthesisBasis,
  ValidatorResult as ClaimValidatorResult,
} from "./generated/claim.js";
export type {
  AssertionObject,
  PetraAssertion,
  Predicate as AssertionPredicate,
  ProvenanceRef as AssertionProvenanceRef,
  ScopeComparison as AssertionScopeComparison,
  ValidTime as AssertionValidTime,
} from "./generated/assertion.js";
export type {
  ChangeOperation,
  ChangeSetContent,
  ImpactPreview as ChangeSetImpactPreview,
  PetraChangeSet,
  PromoteAssertionOperation,
  PromoteClaimOperation,
} from "./generated/change-set.js";
export type {
  ChangeOperation as ChangeOperationV110,
  ChangeSetContent as ChangeSetContentV110,
  HumanRejectedState,
  PetraChangeSetV110,
  RetractAssertionOperation,
  RetractClaimOperation,
} from "./generated/change-set-v1-1.js";
export type {
  ChangeSetSubject as ApprovalChangeSetSubject,
  PetraApproval,
} from "./generated/approval.js";
export type {
  ApplyChangeSet,
  Command as PetraCommand,
  PetraCommandEnvelope,
  RecordApproval,
  SubmitChangeSet,
} from "./generated/command-envelope.js";
export type {
  Command as PetraCommandV110,
  PetraCommandEnvelopeV110,
} from "./generated/command-envelope-v1-1.js";
export type {
  Command as PetraCommandV120,
  ExactProjectSourceRef as CommandProjectSourceRef,
  ExcludeProjectSource,
  PetraCommandEnvelopeV120,
  RestoreProjectSource,
} from "./generated/command-envelope-v1-2.js";
export type {
  Command as PetraCommandV130,
  CreateProjectSourceReplacement,
  ExactReplacementRef as CommandProjectSourceReplacementRef,
  PetraCommandEnvelopeV130,
  RetractProjectSourceReplacement,
} from "./generated/command-envelope-v1-3.js";
export type {
  Command as PetraCommandV140,
  DeferReviewSession,
  ExactReviewSessionRef as CommandReviewSessionRef,
  PetraCommandEnvelopeV140,
  ReopenReviewSession,
} from "./generated/command-envelope-v1-4.js";
export type {
  Command as PetraCommandV150,
  ExactReviewSessionRef as CommandRefreshReviewSessionRef,
  PetraCommandEnvelopeV150,
  RefreshReviewSession,
} from "./generated/command-envelope-v1-5.js";
export type {
  Command as PetraCommandV160,
  CorrectReviewCandidate,
  ExactWorkingCandidateRef as CommandCorrectReviewWorkingCandidateRef,
  ExactWorkingRelationshipRef as CommandCorrectReviewWorkingRelationshipRef,
  PetraCommandEnvelopeV160,
} from "./generated/command-envelope-v1-6.js";
export type {
  Command as PetraCommandV170,
  CorrectReviewCandidateFromHumanEdit,
  HumanScientificClaimTextEdit,
  PetraCommandEnvelopeV170,
} from "./generated/command-envelope-v1-7.js";
export type {
  Command as PetraCommandV180,
  ExactClaimRef as CommandReviseReviewClaimRef,
  ExactProjectSourceRef1 as CommandReviseReviewProjectSourceRef,
  ExactSourceSpanRef as CommandReviseReviewSourceSpanRef,
  HumanScientificSourceBasisRevision,
  PetraCommandEnvelopeV180,
  ReviseReviewCandidateBasis,
} from "./generated/command-envelope-v1-8.js";
export type {
  Command as PetraCommandV190,
  PetraCommandEnvelopeV190,
  SeparateReviewSessionMember,
} from "./generated/command-envelope-v1-9.js";
export type {
  ApprovalRecorded as ApprovalRecordedEvent,
  ChangeSetApplied as ChangeSetAppliedEvent,
  ChangeSetConflicted as ChangeSetConflictedEvent,
  ChangeSetSubmitted as ChangeSetSubmittedEvent,
  ConflictTarget,
  Event as PetraEvent,
  PetraDomainEvent,
} from "./generated/domain-event.js";
export type {
  ChangeSetReverted as ChangeSetRevertedEvent,
  Event as PetraEventV110,
  PetraDomainEventV110,
  ReversalConflicted as ReversalConflictedEvent,
  ReversalConflictTarget,
} from "./generated/domain-event-v1-1.js";
export type {
  Event as PetraEventV120,
  PetraDomainEventV120,
  ProjectSourceExcluded as ProjectSourceExcludedEvent,
  ProjectSourceRestored as ProjectSourceRestoredEvent,
  ProjectSourceTransitionPayload,
} from "./generated/domain-event-v1-2.js";
export type {
  Event as PetraEventV130,
  PetraDomainEventV130,
  ProjectSourceReplacementCreated as ProjectSourceReplacementCreatedEvent,
  ProjectSourceReplacementRetracted as ProjectSourceReplacementRetractedEvent,
} from "./generated/domain-event-v1-3.js";
export type {
  DomainEventMessage,
  PetraOutboxRecord,
} from "./generated/outbox-record.js";
export type { PetraOutboxRecordV110 } from "./generated/outbox-record-v1-1.js";
export type { PetraOutboxRecordV120 } from "./generated/outbox-record-v1-2.js";
export type { PetraOutboxRecordV130 } from "./generated/outbox-record-v1-3.js";
export type {
  ArtifactInputBinding as WorkerArtifactInputBinding,
  ContractRef as WorkerContractRef,
  ExpectedOutput as WorkerExpectedOutput,
  InputBinding as WorkerInputBinding,
  InputContent as WorkerInputContent,
  NetworkPolicy as WorkerNetworkPolicy,
  PetraWorkerInputManifest,
  RecordInputBinding as WorkerRecordInputBinding,
  ResourceLimits as WorkerResourceLimits,
  TaskDescriptor as WorkerTaskDescriptor,
  WorkerDescriptor,
} from "./generated/worker-input-manifest.js";
export type {
  Diagnostic as WorkerDiagnostic,
  Failure as WorkerFailure,
  PetraWorkerOutputManifest,
  ProducedOutput as WorkerProducedOutput,
  ResourceUsage as WorkerResourceUsage,
  WorkerOutcome,
} from "./generated/worker-output-manifest.js";
export type {
  Failure as WorkUnitFailure,
  PetraWorkUnit,
  WorkUnitSpec,
  WorkUnitStatus,
} from "./generated/work-unit.js";
export type {
  CancellationCommand as WorkUnitCancellationCommand,
  PetraWorkUnitCancellation,
} from "./generated/work-unit-cancellation.js";
export type {
  AppliedOutcome as GraphProjectionAppliedOutcome,
  BackendReceipt as GraphProjectionBackendReceipt,
  FailedOutcome as GraphProjectionFailedOutcome,
  OutboxRef as GraphProjectionOutboxRef,
  PetraGraphProjectionRecord,
  ProjectedObject,
  ProjectionContent as GraphProjectionContent,
  ProjectionEffect,
  ProjectionFailure,
  ProjectionIdentity,
  ProjectionOutcome,
  ServiceActorRef as ProjectionServiceActorRef,
} from "./generated/graph-projection-record.js";
export type {
  AdvancedPosition as ProjectionAdvancedPosition,
  BlockedFreshness as ProjectionBlockedFreshness,
  CatchingUpFreshness as ProjectionCatchingUpFreshness,
  CheckpointContent as ProjectionCheckpointContent,
  CheckpointPosition as ProjectionCheckpointPosition,
  CurrentFreshness as ProjectionCurrentFreshness,
  EmptyPosition as ProjectionEmptyPosition,
  Freshness as ProjectionFreshness,
  ObservedHead as ProjectionObservedHead,
  PetraProjectionCheckpoint,
} from "./generated/projection-checkpoint.js";
export type {
  AssertionRef as ContextAssertionRef,
  ClaimRef as ContextClaimRef,
  ContextInclusion,
  ContextPacketContent,
  ContextRecipeRef,
  Coverage as ContextCoverage,
  Dependency as ContextDependency,
  KnownObjectOmission as ContextKnownObjectOmission,
  Objective as ContextObjective,
  Omission as ContextOmission,
  PacketBudget as ContextPacketBudget,
  PetraContextPacket,
  SearchBoundaryOmission as ContextSearchBoundaryOmission,
  SelectionAuthority as ContextSelectionAuthority,
  SelectionTrace as ContextSelectionTrace,
  SnapshotRef,
  SourceSpanRef as ContextSourceSpanRef,
  VersionedObjectRef as ContextObjectRef,
  WorkVersionRef as ContextWorkVersionRef,
} from "./generated/context-packet.js";
export type {
  ContextExclusion as EvidenceContextExclusion,
  ContextPacketRef,
  EvidenceCoverage,
  EvidencePacketContent,
  EvidenceSelection,
  Freshness as EvidencePacketFreshness,
  PetraEvidencePacket,
  TemporalPerspective as EvidenceTemporalPerspective,
} from "./generated/evidence-packet.js";
export type {
  CacheState as GroundedResponseCacheState,
  Content as GroundedResponseContent,
  Dependency as GroundedResponseDependency,
  ExecutionRef as GroundedResponseExecutionRef,
  InteractionRef as GroundedResponseInteractionRef,
  InvalidationCause as GroundedResponseInvalidationCause,
  PetraGroundedResponse,
  ResponseArtifactRef as GroundedResponseArtifactRef,
} from "./generated/grounded-response.js";
export type {
  CitationPreferences as CompositionCitationPreferences,
  CompositionRequestContent,
  ControlContext as CompositionControlContext,
  EvidencePolicy as CompositionEvidencePolicy,
  PetraCompositionRequest,
  RequestedOutput as CompositionRequestedOutput,
} from "./generated/composition-request.js";
export type {
  CompositionMove,
  CompositionPlanContent,
  CompositionRequestRef,
  CompositionSection,
  EvidencePacketRef as CompositionEvidencePacketRef,
  PetraCompositionPlan,
  PlanEvidenceRef,
  UnresolvedSupport as CompositionUnresolvedSupport,
} from "./generated/composition-plan.js";
export type {
  CitationBundleRef as DraftCitationBundleRef,
  DeterministicProduction as DraftDeterministicProduction,
  DraftContent,
  DraftControls,
  DraftLineage,
  DraftValidation,
  EvidencePacketRef as DraftEvidencePacketRef,
  ModelProduction as DraftModelProduction,
  NamedVersion as DraftNamedVersion,
  NamedVersionHash as DraftNamedVersionHash,
  PetraDraftArtifact,
  ProductionOrigin as DraftProductionOrigin,
  ProvenanceMapRef as DraftProvenanceMapRef,
  ResearcherProduction as DraftResearcherProduction,
  ValidatorResult as DraftValidatorResult,
  VersionedControlRef as DraftVersionedControlRef,
} from "./generated/draft-artifact.js";
export type {
  DraftRef,
  DraftSpanContent,
  PetraDraftSpan,
} from "./generated/draft-span.js";
export type {
  CurrentMapping as CurrentProvenanceMapping,
  EvidenceBasis as ProvenanceEvidenceBasis,
  PetraInferenceBasis as ProvenancePetraInferenceBasis,
  PetraProvenanceMap,
  ProvenanceBasis,
  ProvenanceContent,
  ProvenanceRelation,
  ResearcherBasis as ProvenanceResearcherBasis,
  SpanMapping as ProvenanceSpanMapping,
  StaleMapping as StaleProvenanceMapping,
  StructuralBasis as ProvenanceStructuralBasis,
  UnsupportedBasis as ProvenanceUnsupportedBasis,
} from "./generated/provenance-map.js";
export type {
  AuthorCitationRef,
  BibliographyArtifactRef,
  CitationContent,
  CitationEntry,
  CitationLocator,
  CitationMetadata,
  CitationSourceAccess,
  CitationStyle,
  ExternalIdentifierCitationRef,
  IdentityWarning as CitationIdentityWarning,
  PetraCitationBundle,
  WorkRef as CitationWorkRef,
  WorkVersionCitationRef,
} from "./generated/citation-bundle.js";
export type {
  AssessmentContent as DraftSupportAssessmentContent,
  AssessmentLineage as DraftSupportAssessmentLineage,
  AssessmentTrigger as DraftSupportAssessmentTrigger,
  CitationAssessment as DraftCitationAssessment,
  PetraDraftSupportAssessment,
  ReusePolicy as DraftReusePolicy,
  SpanAssessment as DraftSpanAssessment,
  ValidatorResult as DraftSupportValidatorResult,
} from "./generated/draft-support-assessment.js";
export type {
  AuthorityBoundary as FelicityRevisionAuthorityBoundary,
  PetraFelicityRevisionRecord,
  PreservationBoundary as FelicityPreservationBoundary,
  RevisionContent as FelicityRevisionContent,
  SpanTransformation as FelicitySpanTransformation,
} from "./generated/felicity-revision-record.js";
export type {
  AuthorityBoundary as RenderedArtifactAuthorityBoundary,
  CitationBundleRef as RenderedArtifactCitationBundleRef,
  DraftRef as RenderedArtifactDraftRef,
  OutputArtifactRef as RenderedOutputArtifactRef,
  PetraRenderedArtifact,
  RendererRef,
  RenderOptions,
  RenderedContent,
  RenderWarning,
  Transformation as RenderTransformation,
} from "./generated/rendered-artifact.js";
export type {
  CustomEventRegistration,
  FeatureContent as InteractionFeatureContent,
  FeatureSupport as InteractionFeatureSupport,
  PetraInteractionFeatureManifest,
  SchemaRef as InteractionFeatureSchemaRef,
  StandardEventType as InteractionStandardEventType,
} from "./generated/interaction-feature-manifest.js";
export type {
  PetraInteractionCustomEvent,
  ReviewInterruptEvent,
  WorkUnitStatusEvent,
} from "./generated/interaction-custom-event.js";
export type {
  ActiveLifecycle as InteractionActiveLifecycle,
  AwaitingInterruptLifecycle,
  FeatureManifestRef as InteractionFeatureManifestRef,
  PetraInteractionRun,
  RunContent as InteractionRunContent,
  RunLifecycle as InteractionRunLifecycle,
  RunLineage as InteractionRunLineage,
  StreamHead as InteractionStreamHead,
  TerminalLifecycle as InteractionTerminalLifecycle,
  VersionedControlRef as InteractionControlRef,
  WorkUnitRef as InteractionWorkUnitRef,
} from "./generated/interaction-run.js";
export type {
  AuthorityEffect as InteractionAuthorityEffect,
  CommandRef as InteractionCommandRef,
  CustomProtocolEvent,
  EventContent as InteractionEventContent,
  EventLineage as InteractionEventLineage,
  PetraInteractionEventRecord,
  ProtocolEvent as InteractionProtocolEvent,
  StandardProtocolEvent,
  Visibility as InteractionEventVisibility,
} from "./generated/interaction-event-record.js";
export type {
  ClosedInterrupt,
  InterruptContent,
  InterruptKind,
  InterruptLineage,
  PendingInterrupt,
  PetraInteractionInterrupt,
  RespondedInterrupt,
} from "./generated/interaction-interrupt.js";
export type {
  ChangeSetRef as ReviewInterruptChangeSetRef,
  InterruptRef as ReviewInterruptRef,
  PetraReviewInterruptResponse,
} from "./generated/review-interrupt-response.js";
export type {
  DeliveryOutcome as InteractionDeliveryOutcome,
  PetraInteractionReplayRecord,
  ReplayContent as InteractionReplayContent,
  WorkUnitObservation as InteractionWorkUnitObservation,
} from "./generated/interaction-replay-record.js";

import type { PetraChangeSet } from "./generated/change-set.js";
import type { PetraChangeSetV110 } from "./generated/change-set-v1-1.js";
import type { PetraCapabilityGrant } from "./generated/capability-grant.js";
import type { PetraCapabilityGrantV110 } from "./generated/capability-grant-v1-1.js";
import type { PetraCapabilityGrantV120 } from "./generated/capability-grant-v1-2.js";
import type { PetraCapabilityGrantV130 } from "./generated/capability-grant-v1-3.js";
import type { PetraCapabilityGrantV140 } from "./generated/capability-grant-v1-4.js";
import type { PetraCapabilityGrantV150 } from "./generated/capability-grant-v1-5.js";
import type { PetraCapabilityGrantV160 } from "./generated/capability-grant-v1-6.js";
import type { PetraCapabilityGrantV170 } from "./generated/capability-grant-v1-7.js";
import type { PetraCommandEnvelope } from "./generated/command-envelope.js";
import type { PetraCommandEnvelopeV110 } from "./generated/command-envelope-v1-1.js";
import type { PetraDomainEvent } from "./generated/domain-event.js";
import type { PetraDomainEventV110 } from "./generated/domain-event-v1-1.js";
import type { PetraDomainEventV120 } from "./generated/domain-event-v1-2.js";
import type { PetraOutboxRecord } from "./generated/outbox-record.js";
import type { PetraOutboxRecordV110 } from "./generated/outbox-record-v1-1.js";
import type { PetraOutboxRecordV120 } from "./generated/outbox-record-v1-2.js";
import type { PetraProjectReviewViewV110 } from "./generated/project-review-view-v1-1.js";
import type { PetraProjectReviewViewV120 } from "./generated/project-review-view-v1-2.js";
import type { PetraProjectReviewView } from "./generated/project-review-view.js";
import type { PetraReviewSessionV110 } from "./generated/review-session-v1-1.js";
import type { PetraReviewSession } from "./generated/review-session.js";
import type {
  ActiveSourceRef as ProjectSourceReplacementActiveRef,
  ExcludedSourceRef as ProjectSourceReplacementExcludedRef,
} from "./generated/project-source-replacement.js";

export type PetraChangeSetRecord = PetraChangeSet | PetraChangeSetV110;
export type PetraCapabilityGrantRecord =
  | PetraCapabilityGrant
  | PetraCapabilityGrantV110
  | PetraCapabilityGrantV120
  | PetraCapabilityGrantV130
  | PetraCapabilityGrantV140
  | PetraCapabilityGrantV150
  | PetraCapabilityGrantV160
  | PetraCapabilityGrantV170;
export type PetraCommandEnvelopeRecord =
  PetraCommandEnvelope | PetraCommandEnvelopeV110;
export type PetraDomainEventRecord =
  PetraDomainEvent | PetraDomainEventV110 | PetraDomainEventV120;
export type PetraOutboxRecordRecord =
  PetraOutboxRecord | PetraOutboxRecordV110 | PetraOutboxRecordV120;
export type PetraProjectReviewViewRecord =
  | PetraProjectReviewView
  | PetraProjectReviewViewV110
  | PetraProjectReviewViewV120;
export type PetraReviewSessionRecord =
  PetraReviewSession | PetraReviewSessionV110;

export type { PetraReviewRecoveryAssessment } from "./generated/review-recovery-assessment.js";
export type { PetraReviewSessionApplyCheckpoint } from "./generated/review-session-apply-checkpoint.js";
export type { PetraReviewSessionApplyResult } from "./generated/review-session-apply-result.js";
export type { PetraReviewSessionApplyRequest } from "./generated/review-session-apply-request.js";

export type { PetraResearchBriefPayload } from "./generated/research-brief-payload.js";

export type {
  PetraProjectBriefView,
  ProjectBriefContent,
} from "./generated/project-brief-view.js";

export type {
  PetraProjectBriefView as PetraProjectBriefViewV11,
  ProjectBriefContent as ProjectBriefContentV11,
} from "./generated/project-brief-view-v1-1.js";
export type {
  PetraResearchBriefPayload as PetraResearchBriefPayloadV11,
  RetainedSynthesis as ResearchBriefRetainedSynthesis,
} from "./generated/research-brief-payload-v1-1.js";
import type { PetraProjectBriefView as BriefV10 } from "./generated/project-brief-view.js";
import type { PetraProjectBriefView as BriefV11 } from "./generated/project-brief-view-v1-1.js";
export type PetraProjectBriefReadView = BriefV10 | BriefV11;
