export type { PetraActor } from "./generated/actor.js";
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
  ApprovalRecorded as ApprovalRecordedEvent,
  ChangeSetApplied as ChangeSetAppliedEvent,
  ChangeSetConflicted as ChangeSetConflictedEvent,
  ChangeSetSubmitted as ChangeSetSubmittedEvent,
  ConflictTarget,
  Event as PetraEvent,
  PetraDomainEvent,
} from "./generated/domain-event.js";
export type {
  DomainEventMessage,
  PetraOutboxRecord,
} from "./generated/outbox-record.js";
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
  DeliveryOutcome as InteractionDeliveryOutcome,
  PetraInteractionReplayRecord,
  ReplayContent as InteractionReplayContent,
  WorkUnitObservation as InteractionWorkUnitObservation,
} from "./generated/interaction-replay-record.js";
