from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Literal

import rfc8785
from jsonschema import Draft202012Validator, FormatChecker
from pydantic import BaseModel, ConfigDict, Field, RootModel, model_validator
from referencing import Registry, Resource

PETRA_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS_ROOT = PETRA_ROOT / "packages" / "contracts"


def read_json(relative_path: str) -> Any:
    with (CONTRACTS_ROOT / relative_path).open(encoding="utf-8") as source:
        return json.load(source)


REGISTRY = read_json("registry.json")
MANIFEST = read_json("fixtures/manifest.json")
SCHEMAS = {
    (entry["name"], entry["version"]): read_json(entry["path"])
    for entry in REGISTRY["schemas"]
}
RESOURCE_REGISTRY = Registry().with_resources(
    [(schema["$id"], Resource.from_contents(schema)) for schema in SCHEMAS.values()]
)
VALIDATORS = {
    key: Draft202012Validator(
        schema,
        registry=RESOURCE_REGISTRY,
        format_checker=FormatChecker(),
    )
    for key, schema in SCHEMAS.items()
}
COMMON_SCHEMA_ID = next(
    entry["$id"] for entry in REGISTRY["schemas"] if entry["name"] == "common"
)
FOUNDATION_DEFINITIONS = {
    "petra_id": "PetraId",
    "actor_id": "ActorId",
    "project_id": "ProjectId",
    "artifact_id": "ArtifactId",
    "artifact_manifest_id": "ArtifactManifestId",
    "rights_decision_id": "RightsDecisionId",
    "parser_run_id": "ParserRunId",
    "parsed_document_id": "ParsedDocumentId",
    "structural_block_id": "StructuralBlockId",
    "source_span_id": "SourceSpanId",
    "claim_id": "ClaimId",
    "assertion_id": "AssertionId",
    "change_set_id": "ChangeSetId",
    "approval_id": "ApprovalId",
    "review_policy_id": "ReviewPolicyId",
    "revision": "Revision",
    "byte_size": "ByteSize",
    "content_hash": "ContentHash",
    "timestamp": "Timestamp",
    "actor_ref": "ActorRef",
    "project_scope": "ProjectScope",
    "evidence_namespace": "EvidenceNamespace",
}


class PetraModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)


class ContractSmoke(PetraModel):
    kind: Literal["petra.contract-smoke"]
    message: str
    schema_version: Literal["1.0.0"]
    sequence: int


class ActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["human", "service", "model"]


class PetraActor(PetraModel):
    schema_name: Literal["petra.actor"]
    schema_version: Literal["1.0.0"]
    actor_id: str
    actor_kind: Literal["human", "service", "model"]
    display_name: str
    created_at: str


class CapabilityGrantHumanActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["human"]


class CapabilityGrantContent(PetraModel):
    scope_kind: Literal["project_commands"]
    allowed_commands: list[
        Literal[
            "SubmitChangeSet",
            "RecordApproval",
            "ApplyChangeSet",
            "ExcludeProjectSource",
            "RestoreProjectSource",
        ]
    ]
    valid_from: str
    expires_at: str | None = None
    reason: str


class PetraCapabilityGrant(PetraModel):
    schema_name: Literal["petra.capability-grant"]
    schema_version: Literal["1.0.0"]
    capability_grant_id: str
    revision: Literal[1]
    project_id: str
    grantee: ActorRef
    content: CapabilityGrantContent
    content_hash: str
    issued_by: CapabilityGrantHumanActorRef
    issued_at: str


class CapabilityGrantContentV110(PetraModel):
    scope_kind: Literal["project_commands"]
    allowed_commands: list[
        Literal[
            "SubmitChangeSet",
            "RecordApproval",
            "ApplyChangeSet",
            "ExcludeProjectSource",
            "RestoreProjectSource",
            "CreateProjectSourceReplacement",
            "RetractProjectSourceReplacement",
        ]
    ]
    valid_from: str
    expires_at: str | None = None
    reason: str


class PetraCapabilityGrantV110(PetraModel):
    schema_name: Literal["petra.capability-grant"]
    schema_version: Literal["1.1.0"]
    capability_grant_id: str
    revision: Literal[1]
    project_id: str
    grantee: ActorRef
    content: CapabilityGrantContentV110
    content_hash: str
    issued_by: CapabilityGrantHumanActorRef
    issued_at: str


class CapabilityGrantRef(PetraModel):
    capability_grant_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class CapabilityGrantRevocationContent(PetraModel):
    reason: str


class PetraCapabilityGrantRevocation(PetraModel):
    schema_name: Literal["petra.capability-grant-revocation"]
    schema_version: Literal["1.0.0"]
    capability_grant_revocation_id: str
    revision: Literal[1]
    project_id: str
    grant_ref: CapabilityGrantRef
    content: CapabilityGrantRevocationContent
    content_hash: str
    revoked_by: CapabilityGrantHumanActorRef
    revoked_at: str


class PetraProject(PetraModel):
    schema_name: Literal["petra.project"]
    schema_version: Literal["1.0.0"]
    project_id: str
    revision: int
    name: str
    description: str | None = None
    status: Literal["active", "archived"]
    visibility: Literal["private"]
    enabled_evidence_namespaces: list[
        Literal["scholarly", "operational", "personal", "discovery"]
    ]
    created_by: ActorRef
    created_at: str
    updated_at: str


class ProjectAuthoredDefinitionOrigin(PetraModel):
    origin_kind: Literal["project_authored"]


class TemplateSeedDefinitionOrigin(PetraModel):
    origin_kind: Literal["template_seed"]
    template_id: str
    template_version: str
    template_hash: str


class ProjectDefinitionContractRef(PetraModel):
    name: str
    version: str
    content_hash: str


class ProjectDefinitionRegistration(PetraModel):
    registration_kind: Literal[
        "objective_schema",
        "object_schema",
        "relationship_schema",
        "source_role",
        "workflow",
        "validator",
        "output",
        "terminology",
        "presentation_descriptor",
        "model_context",
        "prompt",
        "tool",
        "model_role",
        "extension",
    ]
    semantic_key: str
    contract: ProjectDefinitionContractRef


class ProjectDefinitionTerm(PetraModel):
    semantic_key: str
    singular: str
    plural: str
    definition: str
    generic_family: Literal[
        "focus",
        "finding",
        "reference",
        "relationship",
        "task",
        "output",
        "other",
    ]


class ProjectDefinitionContent(PetraModel):
    label: str
    description: str
    kernel_compatibility: Literal["petra.project-kernel@1.0.0"]
    registrations: list[ProjectDefinitionRegistration]
    terms: list[ProjectDefinitionTerm]
    supported_places: list[
        Literal[
            "brief",
            "sources",
            "review",
            "graph",
            "work",
            "petra",
            "composition",
            "history",
            "settings",
            "profile_tool",
        ]
    ]
    omitted_flows: list[str]


class PetraProjectDefinition(PetraModel):
    schema_name: Literal["petra.project-definition"]
    schema_version: Literal["1.0.0"]
    project_definition_id: str
    revision: int
    project_id: str
    definition_family: str
    origin: ProjectAuthoredDefinitionOrigin | TemplateSeedDefinitionOrigin
    content: ProjectDefinitionContent
    content_hash: str
    created_by: ActorRef
    created_at: str


class ProjectObjectiveRef(PetraModel):
    objective_id: str
    revision: int
    content_hash: str


class ProjectDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str


class ProjectObjectiveContent(PetraModel):
    objective_kind: str
    statement: str
    status: Literal["active", "satisfied", "superseded", "abandoned"]
    parent_ref: ProjectObjectiveRef | None = None
    dependency_refs: list[ProjectObjectiveRef]


class PetraProjectObjective(PetraModel):
    schema_name: Literal["petra.project-objective"]
    schema_version: Literal["1.0.0"]
    objective_id: str
    revision: int
    project_id: str
    project_definition_ref: ProjectDefinitionRef
    content: ProjectObjectiveContent
    content_hash: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class ProjectShellProjectSummary(PetraModel):
    project_id: str
    revision: int
    name: str
    description: str | None = None
    status: Literal["active", "archived"]
    updated_at: str


class ProjectShellDefinitionSummary(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    definition_family: str
    label: str
    description: str
    kernel_compatibility: Literal["petra.project-kernel@1.0.0"]
    terms: list[ProjectDefinitionTerm]
    supported_places: list[
        Literal[
            "brief",
            "sources",
            "review",
            "graph",
            "work",
            "petra",
            "composition",
            "history",
            "settings",
            "profile_tool",
        ]
    ]


class ProjectShellObjectiveSummary(PetraModel):
    objective_id: str
    revision: int
    content_hash: str
    objective_kind: str
    statement: str
    status: Literal["active", "satisfied", "superseded", "abandoned"]


class ProjectShellAuthorityPosition(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectShellExactRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectShellProjectionSummary(PetraModel):
    state: Literal["current", "catching_up", "blocked", "unavailable"]
    label: str
    detail: str
    checkpoint_ref: ProjectShellExactRef | None = None
    represented_event_position: int
    observed_event_position: int
    pending_records: int
    failure_code: str | None = None


class ProjectShellAttentionItem(PetraModel):
    attention_id: str
    attention_kind: Literal["projection_catching_up", "projection_blocked"]
    title: str
    summary: str
    consequence: str
    recommendation: str


class ProjectShellContent(PetraModel):
    project: ProjectShellProjectSummary
    definition: ProjectShellDefinitionSummary
    current_objective: ProjectShellObjectiveSummary | None = None
    authority: ProjectShellAuthorityPosition
    projection: ProjectShellProjectionSummary
    attention: list[ProjectShellAttentionItem]


class PetraProjectShellView(PetraModel):
    schema_name: Literal["petra.project-shell-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectShellContent
    content_hash: str
    read_at: str


class ProjectHistoryCommandRef(PetraModel):
    command_id: str
    schema_version: Literal["1.0.0", "1.1.0", "1.2.0", "1.3.0"]
    command_name: Literal[
        "SubmitChangeSet",
        "RecordApproval",
        "ApplyChangeSet",
        "ExcludeProjectSource",
        "RestoreProjectSource",
        "CreateProjectSourceReplacement",
        "RetractProjectSourceReplacement",
    ]
    idempotency_key: str
    command_fingerprint: str
    capability_grant_id: str
    correlation_id: str


class ProjectHistoryEventRef(PetraModel):
    event_id: str
    schema_version: Literal["1.0.0", "1.1.0", "1.2.0", "1.3.0"]
    event_type: Literal[
        "change_set.submitted",
        "approval.recorded",
        "change_set.applied",
        "change_set.conflicted",
        "change_set.reverted",
        "change_set.reversal_conflicted",
        "project_source.excluded",
        "project_source.restored",
        "project_source.replacement_created",
        "project_source.replacement_retracted",
    ]
    event_position: int
    stream_revision: int
    record_hash: str


class ProjectHistoryTargetRef(PetraModel):
    role: Literal["primary", "affected", "related"]
    semantic_key: str
    object_id: str
    revision: int | None = None
    content_hash: str | None = None
    record_hash: str | None = None
    authority_state: str | None = None


class ProjectHistoryObservedEffect(PetraModel):
    effect: Literal[
        "change_proposed",
        "approval_recorded",
        "authority_change_applied",
        "authority_change_conflicted",
        "authority_change_reverted",
        "reversal_conflicted",
        "project_source_excluded",
        "project_source_restored",
        "source_replacement_created",
        "source_replacement_retracted",
    ]
    outcome: Literal["completed", "conflicted"]
    summary: str


class ProjectHistoryRecoveryRef(PetraModel):
    semantic_key: str
    object_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectHistoryEligibleRecovery(PetraModel):
    eligibility: Literal["eligible"]
    command_name: Literal[
        "ExcludeProjectSource",
        "RestoreProjectSource",
        "RetractProjectSourceReplacement",
    ]
    expected_target_ref: ProjectHistoryRecoveryRef
    reason: str


class ProjectHistoryIneligibleRecovery(PetraModel):
    eligibility: Literal["ineligible"]
    reason: str


class ProjectHistoryDestinationObjectRef(PetraModel):
    semantic_key: str
    object_id: str
    revision: int | None = None


class ProjectHistorySemanticDestination(PetraModel):
    place_role: Literal["history"]
    task_intent: Literal["view_history"]
    object_ref: ProjectHistoryDestinationObjectRef


class ProjectHistoryRecentChange(PetraModel):
    command_ref: ProjectHistoryCommandRef
    event_ref: ProjectHistoryEventRef
    actor: ActorRef
    occurred_at: str
    recorded_at: str
    family: Literal[
        "change_control",
        "project_source_lifecycle",
        "project_source_replacement",
    ]
    targets: list[ProjectHistoryTargetRef]
    observed_effect: ProjectHistoryObservedEffect
    recovery: ProjectHistoryEligibleRecovery | ProjectHistoryIneligibleRecovery
    semantic_destination: ProjectHistorySemanticDestination


class ProjectHistoryAuthorityPosition(PetraModel):
    through_event_position: int
    through_stream_revision: int


class ProjectHistoryContent(PetraModel):
    view_kind: Literal["recent_changes"]
    order: Literal["newest_first"]
    quick_window_limit: Literal[10]
    changes: list[ProjectHistoryRecentChange]
    has_older: bool
    authority: ProjectHistoryAuthorityPosition
    graph_navigation_history: Literal["client_local_separate"]


class PetraProjectHistoryView(PetraModel):
    schema_name: Literal["petra.project-history-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectHistoryContent
    content_hash: str
    read_at: str


class ProjectHistoryCausalCommandLink(PetraModel):
    command_id: str
    event_state: Literal["recorded", "not_recorded"]
    event_ref: ProjectHistoryEventRef | None = None

    @model_validator(mode="after")
    def exact_event_state(self) -> ProjectHistoryCausalCommandLink:
        if (self.event_state == "recorded") != (self.event_ref is not None):
            raise ValueError("recorded causal commands require exactly one event ref")
        return self


class ProjectHistoryCausality(PetraModel):
    event_causation_kind: Literal["command"]
    event_causation_command_id: str
    parent_command: ProjectHistoryCausalCommandLink | None = None
    following_commands: list[ProjectHistoryCausalCommandLink]


class ProjectHistoryStreamOrder(PetraModel):
    order_kind: Literal["project_stream"]
    previous_event_ref: ProjectHistoryEventRef | None = None
    next_event_ref: ProjectHistoryEventRef | None = None


class ProjectHistoryReceiptRef(PetraModel):
    schema_name: Literal[
        "petra.project-source-lifecycle-receipt",
        "petra.project-source-replacement-receipt",
    ]
    record_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectHistoryEpisodeContent(PetraModel):
    view_kind: Literal["causal_episode"]
    change: ProjectHistoryRecentChange
    causality: ProjectHistoryCausality
    stream_order: ProjectHistoryStreamOrder
    receipt_ref: ProjectHistoryReceiptRef | None = None
    omissions: list[
        Literal[
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "cross_family_total_order_not_asserted",
        ]
    ]
    authority: ProjectHistoryAuthorityPosition
    graph_navigation_history: Literal["client_local_separate"]


class PetraProjectHistoryEpisodeView(PetraModel):
    schema_name: Literal["petra.project-history-episode-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryEpisodeContent
    content_hash: str
    read_at: str


class ProjectHistoryDefinitionRefV110(PetraModel):
    schema_name: Literal["petra.project-definition"]
    schema_version: Literal["1.0.0"]
    project_definition_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectHistoryAvailableDefinitionAuthorityV110(PetraModel):
    state: Literal["available"]
    authority_source: Literal["immutable_project_definition_event_stream_binding"]
    selection_basis: Literal["latest_retained_binding_effective_before_selected_event"]
    effective_after_stream_revision: int
    project_definition_ref: ProjectHistoryDefinitionRefV110
    historical_destination_interpretation: Literal["not_performed"]


class ProjectHistoryUnavailableDefinitionAuthorityV110(PetraModel):
    state: Literal["unavailable"]
    reason_code: Literal["retained_project_definition_authority_not_available"]
    reason: Literal[
        "No exact retained ProjectDefinition authority binding is available "
        "for this selected event."
    ]
    historical_destination_interpretation: Literal["not_performed"]


class ProjectHistoryEpisodeContentV110(PetraModel):
    view_kind: Literal["causal_episode"]
    change: ProjectHistoryRecentChange
    causality: ProjectHistoryCausality
    stream_order: ProjectHistoryStreamOrder
    receipt_ref: ProjectHistoryReceiptRef | None = None
    project_definition_authority: (
        ProjectHistoryAvailableDefinitionAuthorityV110
        | ProjectHistoryUnavailableDefinitionAuthorityV110
    )
    omissions: list[
        Literal[
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ]
    authority: ProjectHistoryAuthorityPosition
    graph_navigation_history: Literal["client_local_separate"]


class PetraProjectHistoryEpisodeViewV110(PetraModel):
    schema_name: Literal["petra.project-history-episode-view"]
    schema_version: Literal["1.1.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryEpisodeContentV110
    content_hash: str
    read_at: str


class ProjectHistoryAvailableDefinitionAuthorityV120(PetraModel):
    state: Literal["available"]
    authority_source: Literal["immutable_project_definition_event_stream_binding"]
    selection_basis: Literal["latest_retained_binding_effective_before_selected_event"]
    effective_after_stream_revision: int = Field(ge=0)
    project_definition_ref: ProjectHistoryDefinitionRefV110
    historical_destination_interpretation: Literal[
        "performed_for_selected_event_target"
    ]


class ProjectHistoryEpisodeRouteAuthorityV120(PetraModel):
    schema_name: Literal["petra.project-history-episode-view"]
    schema_version: Literal["1.2.0"]
    view_kind: Literal["causal_episode"]
    event_ref: ProjectHistoryEventRef
    authority_source: Literal[
        "selected_project_event_and_exact_retained_project_definition"
    ]


class ProjectHistoryAvailableHistoricalDestinationV120(PetraModel):
    state: Literal["available"]
    target_ref: ProjectHistoryTargetRef
    place_role: Literal["history"]
    task_intent: Literal["view_history"]
    route_authority: ProjectHistoryEpisodeRouteAuthorityV120
    project_definition_ref: ProjectHistoryDefinitionRefV110
    interpretation_basis: Literal[
        "exact_retained_project_definition_and_registered_history_target"
    ]


class ProjectHistoryNoAuthorityHistoricalDestinationV120(PetraModel):
    state: Literal["unavailable"]
    target_ref: ProjectHistoryTargetRef
    reason_code: Literal["retained_project_definition_authority_not_available"]
    reason: Literal[
        "No historical semantic destination is available because exact retained "
        "ProjectDefinition authority is unavailable for this selected event."
    ]
    interpretation_status: Literal["not_performed"]


class ProjectHistoryUnsupportedPlaceHistoricalDestinationV120(PetraModel):
    state: Literal["unavailable"]
    target_ref: ProjectHistoryTargetRef
    reason_code: Literal["retained_project_definition_history_place_not_supported"]
    reason: Literal[
        "The exact retained ProjectDefinition does not authorize the History "
        "place for this selected event."
    ]
    interpretation_status: Literal["performed"]
    project_definition_ref: ProjectHistoryDefinitionRefV110


class ProjectHistoryUnregisteredTargetHistoricalDestinationV120(PetraModel):
    state: Literal["unavailable"]
    target_ref: ProjectHistoryTargetRef
    reason_code: Literal["historical_event_target_destination_not_registered"]
    reason: Literal[
        "No historical semantic-destination adapter is registered for this "
        "selected event target."
    ]
    interpretation_status: Literal["performed"]
    project_definition_ref: ProjectHistoryDefinitionRefV110


ProjectHistoryDefinitionAuthorityV120 = (
    ProjectHistoryAvailableDefinitionAuthorityV120
    | ProjectHistoryUnavailableDefinitionAuthorityV110
)
ProjectHistoryHistoricalDestinationV120 = (
    ProjectHistoryAvailableHistoricalDestinationV120
    | ProjectHistoryNoAuthorityHistoricalDestinationV120
    | ProjectHistoryUnsupportedPlaceHistoricalDestinationV120
    | ProjectHistoryUnregisteredTargetHistoricalDestinationV120
)


class ProjectHistoryEpisodeContentV120(PetraModel):
    view_kind: Literal["causal_episode"]
    change: ProjectHistoryRecentChange
    causality: ProjectHistoryCausality
    stream_order: ProjectHistoryStreamOrder
    receipt_ref: ProjectHistoryReceiptRef | None = None
    project_definition_authority: ProjectHistoryDefinitionAuthorityV120
    historical_semantic_destination: ProjectHistoryHistoricalDestinationV120
    omissions: list[
        Literal[
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_content_not_returned",
            "cross_family_total_order_not_asserted",
        ]
    ]
    authority: ProjectHistoryAuthorityPosition
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_historical_destination(self) -> ProjectHistoryEpisodeContentV120:
        primary = [target for target in self.change.targets if target.role == "primary"]
        if len(primary) != 1:
            raise ValueError("episode must retain one exact primary target")
        destination = self.historical_semantic_destination
        if destination.target_ref != primary[0]:
            raise ValueError("historical destination must retain the primary target")
        definition_authority = self.project_definition_authority
        if isinstance(
            definition_authority,
            ProjectHistoryUnavailableDefinitionAuthorityV110,
        ):
            if not isinstance(
                destination,
                ProjectHistoryNoAuthorityHistoricalDestinationV120,
            ):
                raise ValueError(
                    "unavailable definition authority yields no destination"
                )
            return self
        if definition_authority.effective_after_stream_revision >= (
            self.change.event_ref.stream_revision
        ):
            raise ValueError("definition binding must precede the selected event")
        if isinstance(
            destination,
            ProjectHistoryNoAuthorityHistoricalDestinationV120,
        ):
            raise ValueError("available definition authority must be interpreted")
        if destination.project_definition_ref != (
            definition_authority.project_definition_ref
        ):
            raise ValueError("destination must use the exact retained definition")
        if (
            isinstance(
                destination,
                ProjectHistoryAvailableHistoricalDestinationV120,
            )
            and destination.route_authority.event_ref != self.change.event_ref
        ):
            raise ValueError("route authority must retain the selected event")
        return self


class PetraProjectHistoryEpisodeViewV120(PetraModel):
    schema_name: Literal["petra.project-history-episode-view"]
    schema_version: Literal["1.2.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryEpisodeContentV120
    content_hash: str
    read_at: str

    @model_validator(mode="after")
    def exact_selected_event(self) -> PetraProjectHistoryEpisodeViewV120:
        if self.event_id != self.content.change.event_ref.event_id:
            raise ValueError("episode route must retain the selected event identity")
        return self


class ProjectHistoryRetainedQuery(PetraModel):
    limit: int = Field(ge=1, le=100)
    cursor: str | None = Field(
        default=None,
        min_length=80,
        max_length=1024,
        pattern=r"^phc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$",
    )


class ProjectHistoryContinuedPage(PetraModel):
    returned_count: int = Field(ge=1, le=100)
    snapshot_total_count: int = Field(ge=1)
    has_more: Literal[True]
    next_cursor: str = Field(
        min_length=80,
        max_length=1024,
        pattern=r"^phc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$",
    )


class ProjectHistoryCompletePage(PetraModel):
    returned_count: int = Field(ge=0, le=100)
    snapshot_total_count: int = Field(ge=0)
    has_more: Literal[False]


class ProjectHistoryEmptyRetentionSnapshot(PetraModel):
    through_event_position: int = Field(ge=0)
    through_stream_revision: Literal[0]


class ProjectHistoryNonemptyRetentionSnapshot(PetraModel):
    through_event_position: int = Field(ge=1)
    through_stream_revision: int = Field(ge=1)
    head_event_ref: ProjectHistoryEventRef


class ProjectHistoryRetainedContent(PetraModel):
    view_kind: Literal["retained_events"]
    order_kind: Literal["project_stream_newest_first"]
    query: ProjectHistoryRetainedQuery
    changes: list[ProjectHistoryRecentChange] = Field(max_length=100)
    page: ProjectHistoryContinuedPage | ProjectHistoryCompletePage
    retention_snapshot: (
        ProjectHistoryEmptyRetentionSnapshot | ProjectHistoryNonemptyRetentionSnapshot
    )
    current_authority: ProjectHistoryAuthorityPosition
    recovery_authority: Literal["current_at_page_read"]
    omissions: list[
        Literal[
            "filters_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ]
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_omissions(self) -> ProjectHistoryRetainedContent:
        expected = {
            "filters_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 5 or set(self.omissions) != expected:
            raise ValueError("retained History must declare its five exact omissions")
        return self


class PetraProjectHistoryRetainedView(PetraModel):
    schema_name: Literal["petra.project-history-retained-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectHistoryRetainedContent
    content_hash: str
    read_at: str


class ProjectHistoryRetainedExactTargetFilterV110(PetraModel):
    semantic_key: Literal[
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
        "petra.project-source",
        "petra.project-source-replacement",
        "petra.project-source-replacement-retraction",
    ]
    object_id: str


class ProjectHistoryRetainedRecordedTimeFilterV110(PetraModel):
    from_inclusive: str | None = None
    through_inclusive: str | None = None

    @model_validator(mode="after")
    def at_least_one_bound(self) -> ProjectHistoryRetainedRecordedTimeFilterV110:
        if self.from_inclusive is None and self.through_inclusive is None:
            raise ValueError("recorded History time filter requires a bound")
        return self


class ProjectHistoryRetainedFiltersV110(PetraModel):
    family: (
        Literal[
            "change_control",
            "project_source_lifecycle",
            "project_source_replacement",
        ]
        | None
    ) = None
    command_name: (
        Literal[
            "SubmitChangeSet",
            "RecordApproval",
            "ApplyChangeSet",
            "ExcludeProjectSource",
            "RestoreProjectSource",
            "CreateProjectSourceReplacement",
            "RetractProjectSourceReplacement",
        ]
        | None
    ) = None
    event_type: (
        Literal[
            "change_set.submitted",
            "approval.recorded",
            "change_set.applied",
            "change_set.conflicted",
            "change_set.reverted",
            "change_set.reversal_conflicted",
            "project_source.excluded",
            "project_source.restored",
            "project_source.replacement_created",
            "project_source.replacement_retracted",
        ]
        | None
    ) = None
    actor_id: str | None = None
    outcome: Literal["completed", "conflicted"] | None = None
    effect: (
        Literal[
            "change_proposed",
            "approval_recorded",
            "authority_change_applied",
            "authority_change_conflicted",
            "authority_change_reverted",
            "reversal_conflicted",
            "project_source_excluded",
            "project_source_restored",
            "source_replacement_created",
            "source_replacement_retracted",
        ]
        | None
    ) = None
    target: ProjectHistoryRetainedExactTargetFilterV110 | None = None
    recorded_at: ProjectHistoryRetainedRecordedTimeFilterV110 | None = None


class ProjectHistoryRetainedQueryV110(PetraModel):
    limit: int = Field(ge=1, le=100)
    filters: ProjectHistoryRetainedFiltersV110
    cursor: str | None = Field(
        default=None,
        min_length=80,
        max_length=1024,
        pattern=r"^phc2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$",
    )


class ProjectHistoryRetainedContinuedPageV110(PetraModel):
    returned_count: int = Field(ge=1, le=100)
    snapshot_total_count: int = Field(ge=1)
    has_more: Literal[True]
    next_cursor: str = Field(
        min_length=80,
        max_length=1024,
        pattern=r"^phc2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$",
    )


class ProjectHistoryRetainedContentV110(PetraModel):
    view_kind: Literal["retained_events"]
    order_kind: Literal["project_stream_newest_first"]
    query: ProjectHistoryRetainedQueryV110
    cursor_binding: Literal["project_snapshot_and_complete_query"]
    changes: list[ProjectHistoryRecentChange] = Field(max_length=100)
    page: ProjectHistoryRetainedContinuedPageV110 | ProjectHistoryCompletePage
    retention_snapshot: (
        ProjectHistoryEmptyRetentionSnapshot | ProjectHistoryNonemptyRetentionSnapshot
    )
    current_authority: ProjectHistoryAuthorityPosition
    recovery_authority: Literal["current_at_page_read"]
    omissions: list[
        Literal[
            "origin_filter_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ]
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_omissions(self) -> ProjectHistoryRetainedContentV110:
        expected = {
            "origin_filter_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 5 or set(self.omissions) != expected:
            raise ValueError("filtered retained History must declare exact omissions")
        return self


class PetraProjectHistoryRetainedViewV110(PetraModel):
    schema_name: Literal["petra.project-history-retained-view"]
    schema_version: Literal["1.1.0"]
    project_id: str
    content: ProjectHistoryRetainedContentV110
    content_hash: str
    read_at: str


class ProjectHistoryActorRecordRefV120(PetraModel):
    schema_name: Literal["petra.actor"]
    schema_version: Literal["1.0.0"]
    actor_id: str
    record_hash: str


class ProjectHistoryActorDisplayDescriptorV120(PetraModel):
    state: Literal["available"]
    display_name: str = Field(min_length=1, max_length=160)
    authority_ref: ProjectHistoryActorRecordRefV120


class ProjectHistoryActorOptionV120(PetraModel):
    actor_ref: ActorRef
    display_descriptor: ProjectHistoryActorDisplayDescriptorV120
    matching_event_count: int = Field(ge=1)


class ProjectHistoryTargetDisplayDescriptorV120(PetraModel):
    state: Literal["exact_identity_only"]
    fallback: Literal["semantic_key_and_object_id"]
    reason_code: Literal["revision_neutral_target_title_authority_not_registered"]
    reason: Literal[
        "No authorized revision-neutral title is registered "
        "for this exact History target identity."
    ]


class ProjectHistoryTargetOptionV120(PetraModel):
    target_ref: ProjectHistoryRetainedExactTargetFilterV110
    display_descriptor: ProjectHistoryTargetDisplayDescriptorV120
    matching_event_count: int = Field(ge=1)


class ProjectHistoryActorOptionCatalogueV120(PetraModel):
    option_limit: Literal[100]
    order_kind: Literal[
        "active_option_first_then_matching_event_count_desc_then_actor_id"
    ]
    returned_count: int = Field(ge=0, le=100)
    total_count: int = Field(ge=0)
    coverage: Literal["complete", "truncated"]
    continuation: Literal["not_composed"]
    options: list[ProjectHistoryActorOptionV120] = Field(max_length=100)

    @model_validator(mode="after")
    def catalogue_counts(self) -> ProjectHistoryActorOptionCatalogueV120:
        if self.returned_count != len(self.options):
            raise ValueError("Actor option count must match returned options")
        if self.coverage == "complete" and self.total_count != self.returned_count:
            raise ValueError("complete Actor option coverage requires the exact total")
        if self.coverage == "truncated" and self.total_count <= self.returned_count:
            raise ValueError("truncated Actor options require an omitted option")
        return self


class ProjectHistoryTargetOptionCatalogueV120(PetraModel):
    option_limit: Literal[100]
    order_kind: Literal[
        "active_option_first_then_matching_event_count_desc_then_target_identity"
    ]
    returned_count: int = Field(ge=0, le=100)
    total_count: int = Field(ge=0)
    coverage: Literal["complete", "truncated"]
    continuation: Literal["not_composed"]
    options: list[ProjectHistoryTargetOptionV120] = Field(max_length=100)

    @model_validator(mode="after")
    def catalogue_counts(self) -> ProjectHistoryTargetOptionCatalogueV120:
        if self.returned_count != len(self.options):
            raise ValueError("target option count must match returned options")
        if self.coverage == "complete" and self.total_count != self.returned_count:
            raise ValueError("complete target option coverage requires the exact total")
        if self.coverage == "truncated" and self.total_count <= self.returned_count:
            raise ValueError("truncated target options require an omitted option")
        return self


class ProjectHistoryFilterOptionsV120(PetraModel):
    authorization_scope: Literal["authenticated_project"]
    snapshot_and_query_binding: Literal[
        "retention_snapshot_and_complete_normalized_query"
    ]
    dimension_semantics: Literal["replace_same_dimension_preserve_other_filters"]
    count_basis: Literal["matching_authorized_events_after_replacing_same_dimension"]
    actor_catalogue: ProjectHistoryActorOptionCatalogueV120
    target_catalogue: ProjectHistoryTargetOptionCatalogueV120


class ProjectHistoryRetainedContentV120(PetraModel):
    view_kind: Literal["retained_events"]
    order_kind: Literal["project_stream_newest_first"]
    query: ProjectHistoryRetainedQueryV110
    cursor_binding: Literal["project_snapshot_and_complete_query"]
    changes: list[ProjectHistoryRecentChange] = Field(max_length=100)
    page: ProjectHistoryRetainedContinuedPageV110 | ProjectHistoryCompletePage
    filter_options: ProjectHistoryFilterOptionsV120
    retention_snapshot: (
        ProjectHistoryEmptyRetentionSnapshot | ProjectHistoryNonemptyRetentionSnapshot
    )
    current_authority: ProjectHistoryAuthorityPosition
    recovery_authority: Literal["current_at_page_read"]
    omissions: list[
        Literal[
            "origin_filter_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ]
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_option_semantics(self) -> ProjectHistoryRetainedContentV120:
        expected_omissions = {
            "origin_filter_not_supported",
            "dependency_impact_not_composed",
            "generic_reversal_assessment_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 5 or set(self.omissions) != expected_omissions:
            raise ValueError("filter-option History must declare exact omissions")

        actors = self.filter_options.actor_catalogue
        actor_ids = [option.actor_ref.actor_id for option in actors.options]
        if len(actor_ids) != len(set(actor_ids)):
            raise ValueError("Actor filter options must be unique")
        if any(
            option.actor_ref.actor_id
            != option.display_descriptor.authority_ref.actor_id
            for option in actors.options
        ):
            raise ValueError("Actor descriptor authority must match its option")
        selected_actor = self.query.filters.actor_id
        expected_actor_order = sorted(
            actors.options,
            key=lambda option: (
                option.actor_ref.actor_id != selected_actor,
                -option.matching_event_count,
                option.actor_ref.actor_id,
            ),
        )
        if actor_ids != [option.actor_ref.actor_id for option in expected_actor_order]:
            raise ValueError("Actor filter options have invalid order")
        selected_actor_options = [
            option
            for option in actors.options
            if option.actor_ref.actor_id == selected_actor
        ]
        if (
            self.page.snapshot_total_count > 0
            and selected_actor is not None
            and (
                len(selected_actor_options) != 1
                or selected_actor_options[0].matching_event_count
                != self.page.snapshot_total_count
            )
        ):
            raise ValueError("selected Actor count must match the filtered result")
        if (
            selected_actor is None
            and actors.coverage == "complete"
            and sum(option.matching_event_count for option in actors.options)
            != self.page.snapshot_total_count
        ):
            raise ValueError("complete Actor counts must partition matching events")

        targets = self.filter_options.target_catalogue
        target_ids = [
            (option.target_ref.semantic_key, option.target_ref.object_id)
            for option in targets.options
        ]
        if len(target_ids) != len(set(target_ids)):
            raise ValueError("target filter options must be unique")
        selected_target = self.query.filters.target
        expected_target_order = sorted(
            targets.options,
            key=lambda option: (
                selected_target is None
                or option.target_ref.semantic_key != selected_target.semantic_key
                or option.target_ref.object_id != selected_target.object_id,
                -option.matching_event_count,
                option.target_ref.semantic_key,
                option.target_ref.object_id,
            ),
        )
        if target_ids != [
            (option.target_ref.semantic_key, option.target_ref.object_id)
            for option in expected_target_order
        ]:
            raise ValueError("target filter options have invalid order")
        if self.page.snapshot_total_count > 0 and selected_target is not None:
            selected_target_options = [
                option
                for option in targets.options
                if option.target_ref.semantic_key == selected_target.semantic_key
                and option.target_ref.object_id == selected_target.object_id
            ]
            if (
                len(selected_target_options) != 1
                or selected_target_options[0].matching_event_count
                != self.page.snapshot_total_count
            ):
                raise ValueError("selected target count must match the filtered result")
        return self


class PetraProjectHistoryRetainedViewV120(PetraModel):
    schema_name: Literal["petra.project-history-retained-view"]
    schema_version: Literal["1.2.0"]
    project_id: str
    content: ProjectHistoryRetainedContentV120
    content_hash: str
    read_at: str


class ProjectHistoryRetainedContinuationRestart(PetraModel):
    cursor_disposition: Literal["discard_without_client_decoding"]
    request_kind: Literal["cursorless_same_project_limit_and_filters"]


class ProjectHistoryRetainedContinuationFailureContent(PetraModel):
    code: Literal["PROJECT_HISTORY_RETAINED_QUERY_INVALID"]
    subcode: Literal[
        "CURSOR_INVALID",
        "CURSOR_BINDING_MISMATCH",
        "SNAPSHOT_UNAVAILABLE",
    ]
    message: Literal[
        "This Full History traversal can no longer continue from its verified "
        "snapshot. Start again with the same filters."
    ]
    restart: ProjectHistoryRetainedContinuationRestart


class PetraProjectHistoryRetainedContinuationFailure(PetraModel):
    schema_name: Literal["petra.project-history-retained-continuation-failure"]
    schema_version: Literal["1.0.0"]
    error: ProjectHistoryRetainedContinuationFailureContent
    requestId: str = Field(
        min_length=1,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$",
    )
    traceId: str = Field(
        min_length=1,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$",
    )


class ProjectHistoryImpactEventAnchor(PetraModel):
    command_ref: ProjectHistoryCommandRef
    event_ref: ProjectHistoryEventRef
    actor: ActorRef
    occurred_at: str
    recorded_at: str
    family: Literal[
        "change_control",
        "project_source_lifecycle",
        "project_source_replacement",
    ]
    targets: list[ProjectHistoryTargetRef] = Field(min_length=1, max_length=100)
    observed_effect: ProjectHistoryObservedEffect
    semantic_destination: ProjectHistorySemanticDestination


class ProjectHistoryImpactRecordedCausalCommand(PetraModel):
    command_ref: ProjectHistoryCommandRef
    outcome: Literal["success", "failure"]
    completed_at: str
    event_state: Literal["recorded"]
    event_ref: ProjectHistoryEventRef


class ProjectHistoryImpactUnrecordedCausalCommand(PetraModel):
    command_ref: ProjectHistoryCommandRef
    outcome: Literal["success", "failure"]
    completed_at: str
    event_state: Literal["not_recorded"]


class ProjectHistoryImpactOutboxRef(PetraModel):
    outbox_id: str
    schema_version: Literal["1.0.0", "1.1.0", "1.2.0", "1.3.0"]
    outbox_position: int = Field(ge=1)
    target: Literal["neo4j_graph", "interface_authority"]
    target_sequence: int = Field(ge=1)
    enqueued_at: str
    record_hash: str


class ProjectHistoryImpactProjectionRef(PetraModel):
    graph_projection_record_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str
    outbox_id: str
    outbox_position: int = Field(ge=1)
    target_sequence: int = Field(ge=1)
    attempt: int = Field(ge=1, le=100)
    outcome: Literal["applied", "failed"]
    recorded_at: str


class ProjectHistoryImpactGroundedResponseRef(PetraModel):
    grounded_response_id: str
    revision: int = Field(ge=1)
    content_hash: str
    record_hash: str
    posture: Literal["current", "historical"]
    cache_state: Literal["invalidated"]
    invalidation_position: int = Field(ge=1)
    change_set_id: str
    recorded_at: str


class ProjectHistoryImpactCausalCommandGroup(PetraModel):
    relation: Literal["caused_by_selected_command"]
    authority_source: Literal["immutable_command_causation"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=100)
    coverage: Literal["complete", "truncated"]
    refs: list[
        ProjectHistoryImpactRecordedCausalCommand
        | ProjectHistoryImpactUnrecordedCausalCommand
    ] = Field(max_length=100)


class ProjectHistoryImpactOutboxGroup(PetraModel):
    relation: Literal["carries_selected_event"]
    authority_source: Literal["immutable_event_outbox_binding"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=100)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistoryImpactOutboxRef] = Field(max_length=100)


class ProjectHistoryImpactProjectionGroup(PetraModel):
    relation: Literal["projects_selected_event"]
    authority_source: Literal["immutable_projection_event_binding"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=100)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistoryImpactProjectionRef] = Field(max_length=100)


class ProjectHistoryImpactGroundedResponseGroup(PetraModel):
    relation: Literal["invalidated_by_selected_event"]
    authority_source: Literal["immutable_response_invalidation_binding"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=100)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistoryImpactGroundedResponseRef] = Field(max_length=100)


class ProjectHistoryImpactSummary(PetraModel):
    registered_group_count: Literal[4]
    total_count: int = Field(ge=0, le=4_000_000)
    coverage: Literal["complete", "truncated"]


class ProjectHistoryImpactInventory(PetraModel):
    scope: Literal["registered_direct_event_and_command_dependents"]
    summary: ProjectHistoryImpactSummary
    causal_commands: ProjectHistoryImpactCausalCommandGroup
    outbox_records: ProjectHistoryImpactOutboxGroup
    graph_projection_records: ProjectHistoryImpactProjectionGroup
    grounded_response_invalidations: ProjectHistoryImpactGroundedResponseGroup
    unknowns: list[
        Literal[
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        ]
    ] = Field(min_length=3, max_length=3)

    @model_validator(mode="after")
    def exact_unknowns(self) -> ProjectHistoryImpactInventory:
        expected = {
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        }
        if len(self.unknowns) != 3 or set(self.unknowns) != expected:
            raise ValueError("History impact must declare its three exact unknowns")
        return self


class ProjectHistoryImpactDecisionBoundary(PetraModel):
    reversibility: Literal["not_assessed"]
    compensation: Literal["not_composed"]
    dependent_effect: Literal["not_inferred_from_reference"]


class ProjectHistoryImpactAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    through_event_position: int = Field(ge=0)
    through_stream_revision: int = Field(ge=0)


class ProjectHistoryImpactContent(PetraModel):
    view_kind: Literal["dependency_impact"]
    selected_event: ProjectHistoryImpactEventAnchor
    authorization_scope: Literal["authenticated_project"]
    impact: ProjectHistoryImpactInventory
    decision_boundary: ProjectHistoryImpactDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "semantic_target_dependencies_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=6, max_length=6)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_omissions(self) -> ProjectHistoryImpactContent:
        expected = {
            "semantic_target_dependencies_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 6 or set(self.omissions) != expected:
            raise ValueError("History impact must declare its six exact omissions")
        return self


class PetraProjectHistoryImpactView(PetraModel):
    schema_name: Literal["petra.project-history-impact-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryImpactContent
    content_hash: str
    read_at: str


class ProjectHistorySemanticResolvedTargetRef(PetraModel):
    semantic_key: Literal[
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
    ]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal[
        "petra.change-set", "petra.approval", "petra.claim", "petra.assertion"
    ]
    schema_version: Literal["1.0.0", "1.1.0"]
    content_hash: str | None = None
    record_hash: str

    @model_validator(mode="after")
    def supported_schema_version(self) -> ProjectHistorySemanticResolvedTargetRef:
        if self.schema_name != "petra.change-set" and self.schema_version != "1.0.0":
            raise ValueError(
                "only ChangeSet semantic targets support authority version 1.1"
            )
        return self


class ProjectHistorySemanticDependentRef(PetraModel):
    semantic_key: Literal[
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
        "petra.review-session",
        "petra.grounded-response",
        "petra.composition-request",
        "petra.composition-plan",
        "petra.provenance-map",
        "petra.draft-artifact",
    ]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal[
        "petra.change-set",
        "petra.approval",
        "petra.claim",
        "petra.assertion",
        "petra.review-session",
        "petra.grounded-response",
        "petra.composition-request",
        "petra.composition-plan",
        "petra.provenance-map",
        "petra.draft-artifact",
    ]
    schema_version: Literal["1.0.0", "1.1.0"]
    content_hash: str | None = None
    record_hash: str
    posture: Literal["current", "historical", "immutable_revision"]
    relation: Literal[
        "approves_exact_change_set",
        "authorized_by_exact_change_set",
        "authorized_by_exact_approval",
        "proposes_promotion_from_exact_evidence_revision",
        "contains_exact_review_candidate",
        "depends_on_exact_grounded_evidence",
        "selects_exact_composition_subject",
        "uses_exact_composition_evidence",
        "maps_exact_provenance_basis",
        "retains_exact_draft_authority_dependency",
    ]
    relation_identity: str = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def supported_schema_version(self) -> ProjectHistorySemanticDependentRef:
        if self.schema_name != "petra.change-set" and self.schema_version != "1.0.0":
            raise ValueError("only ChangeSet semantic dependents support version 1.1")
        return self


class ProjectHistorySemanticAdapterGroup(PetraModel):
    adapter_kind: Literal[
        "change_control",
        "review_membership",
        "grounded_response_dependency",
        "composition_lineage",
    ]
    authority_source: Literal[
        "immutable_change_control_target_bindings",
        "immutable_review_candidate_bindings",
        "immutable_grounded_response_dependencies",
        "immutable_composition_target_bindings",
    ]
    relation_scope: Literal["exact_target_revision"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=25)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistorySemanticDependentRef] = Field(max_length=25)

    @model_validator(mode="after")
    def exact_authority_and_counts(self) -> ProjectHistorySemanticAdapterGroup:
        authorities = {
            "change_control": "immutable_change_control_target_bindings",
            "review_membership": "immutable_review_candidate_bindings",
            "grounded_response_dependency": (
                "immutable_grounded_response_dependencies"
            ),
            "composition_lineage": "immutable_composition_target_bindings",
        }
        if authorities[self.adapter_kind] != self.authority_source:
            raise ValueError("semantic adapter must name its exact owning authority")
        if self.returned_count != len(self.refs):
            raise ValueError(
                "semantic adapter returned count must match its references"
            )
        expected_coverage = (
            "truncated" if self.total_count > self.returned_count else "complete"
        )
        if self.coverage != expected_coverage:
            raise ValueError("semantic adapter coverage must match its bounded count")
        return self


class ProjectHistorySemanticRegisteredAssessment(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal["registered"]
    resolved_target_ref: ProjectHistorySemanticResolvedTargetRef
    groups: list[ProjectHistorySemanticAdapterGroup] = Field(min_length=1, max_length=4)


class ProjectHistorySemanticUnavailableAssessment(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal[
        "no_registered_exact_adapter",
        "target_identity_incomplete",
        "target_authority_unavailable",
    ]
    reason: Literal[
        "No exact semantic-target adapter is registered for this semantic key.",
        "Registered semantic-target adapters require an immutable target revision.",
        "The exact immutable target authority is unavailable in this Project snapshot.",
    ]
    groups: list[ProjectHistorySemanticAdapterGroup] = Field(max_length=0)

    @model_validator(mode="after")
    def exact_unavailability(self) -> ProjectHistorySemanticUnavailableAssessment:
        registered_keys = {
            "petra.change-set",
            "petra.approval",
            "scientific.claim",
            "scientific.assertion",
        }
        reasons = {
            "no_registered_exact_adapter": (
                "No exact semantic-target adapter is registered for this semantic key."
            ),
            "target_identity_incomplete": (
                "Registered semantic-target adapters require an immutable target "
                "revision."
            ),
            "target_authority_unavailable": (
                "The exact immutable target authority is unavailable in this Project "
                "snapshot."
            ),
        }
        if self.reason != reasons[self.adapter_state]:
            raise ValueError("semantic adapter state must name its exact reason")
        if self.adapter_state == "no_registered_exact_adapter":
            if self.target_ref.semantic_key in registered_keys:
                raise ValueError(
                    "registered semantic keys must use a registered adapter state"
                )
        elif self.target_ref.semantic_key not in registered_keys:
            raise ValueError(
                "unavailable registered-adapter states require a registered key"
            )
        if self.adapter_state == "target_identity_incomplete":
            if self.target_ref.revision is not None:
                raise ValueError("incomplete semantic targets cannot have a revision")
        elif (
            self.adapter_state == "target_authority_unavailable"
            and self.target_ref.revision is None
        ):
            raise ValueError("unavailable target authority requires an exact revision")
        return self


ProjectHistorySemanticTargetAssessment = (
    ProjectHistorySemanticRegisteredAssessment
    | ProjectHistorySemanticUnavailableAssessment
)


class ProjectHistorySemanticRegistryEntry(PetraModel):
    adapter_kind: Literal[
        "change_control",
        "review_membership",
        "grounded_response_dependency",
        "composition_lineage",
    ]
    authority_source: Literal[
        "immutable_change_control_target_bindings",
        "immutable_review_candidate_bindings",
        "immutable_grounded_response_dependencies",
        "immutable_composition_target_bindings",
    ]
    semantic_keys: list[
        Literal[
            "petra.change-set",
            "petra.approval",
            "scientific.claim",
            "scientific.assertion",
        ]
    ] = Field(min_length=2, max_length=4)


class ProjectHistorySemanticSummary(PetraModel):
    registered_adapter_count: Literal[4]
    assessed_target_count: int = Field(ge=0, le=10)
    supported_target_count: int = Field(ge=0, le=10)
    total_count: int = Field(ge=0, le=40_000_000)
    coverage: Literal["complete", "truncated"]


class ProjectHistorySemanticTargetImpact(PetraModel):
    scope: Literal["registered_exact_semantic_target_dependents"]
    target_limit: Literal[10]
    per_adapter_ref_limit: Literal[25]
    target_total_count: int = Field(ge=1, le=100)
    target_returned_count: int = Field(ge=1, le=10)
    target_coverage: Literal["complete", "truncated"]
    registry: list[ProjectHistorySemanticRegistryEntry] = Field(
        min_length=4, max_length=4
    )
    target_assessments: list[ProjectHistorySemanticTargetAssessment] = Field(
        min_length=1, max_length=10
    )
    summary: ProjectHistorySemanticSummary
    unknowns: list[
        Literal[
            "unregistered_semantic_keys_may_have_dependents",
            "identity_only_semantic_relations_are_excluded",
            "transitive_semantic_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        ]
    ] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def exact_registry_counts_and_unknowns(self) -> ProjectHistorySemanticTargetImpact:
        expected_registry = [
            (
                "change_control",
                "immutable_change_control_target_bindings",
                [
                    "petra.change-set",
                    "petra.approval",
                    "scientific.claim",
                    "scientific.assertion",
                ],
            ),
            (
                "review_membership",
                "immutable_review_candidate_bindings",
                ["scientific.claim", "scientific.assertion"],
            ),
            (
                "grounded_response_dependency",
                "immutable_grounded_response_dependencies",
                ["scientific.claim", "scientific.assertion"],
            ),
            (
                "composition_lineage",
                "immutable_composition_target_bindings",
                ["scientific.claim", "scientific.assertion"],
            ),
        ]
        actual_registry = [
            (entry.adapter_kind, entry.authority_source, entry.semantic_keys)
            for entry in self.registry
        ]
        if actual_registry != expected_registry:
            raise ValueError("semantic adapter registry must be exact and ordered")
        expected_unknowns = {
            "unregistered_semantic_keys_may_have_dependents",
            "identity_only_semantic_relations_are_excluded",
            "transitive_semantic_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        }
        if len(self.unknowns) != 4 or set(self.unknowns) != expected_unknowns:
            raise ValueError("semantic impact must declare its four exact unknowns")
        if self.target_returned_count != len(self.target_assessments):
            raise ValueError("semantic target count must match its assessments")
        supported = sum(
            assessment.adapter_state == "registered"
            for assessment in self.target_assessments
        )
        groups = [
            group
            for assessment in self.target_assessments
            for group in assessment.groups
        ]
        if (
            self.summary.assessed_target_count != len(self.target_assessments)
            or self.summary.supported_target_count != supported
            or self.summary.total_count != sum(group.total_count for group in groups)
        ):
            raise ValueError("semantic impact summary must match assessed groups")
        expected_coverage = (
            "truncated"
            if self.target_coverage == "truncated"
            or any(group.coverage == "truncated" for group in groups)
            else "complete"
        )
        if self.summary.coverage != expected_coverage:
            raise ValueError("semantic impact summary coverage must remain bounded")
        return self


class ProjectHistoryImpactContentV110(PetraModel):
    view_kind: Literal["dependency_impact"]
    selected_event: ProjectHistoryImpactEventAnchor
    authorization_scope: Literal["authenticated_project"]
    impact: ProjectHistoryImpactInventory
    semantic_target_impact: ProjectHistorySemanticTargetImpact
    decision_boundary: ProjectHistoryImpactDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=7, max_length=7)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_targets_and_omissions(self) -> ProjectHistoryImpactContentV110:
        expected_omissions = {
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 7 or set(self.omissions) != expected_omissions:
            raise ValueError(
                "History impact 1.1 must declare its seven exact omissions"
            )
        if self.semantic_target_impact.target_total_count != len(
            self.selected_event.targets
        ):
            raise ValueError("semantic impact must count the selected event targets")
        for index, assessment in enumerate(
            self.semantic_target_impact.target_assessments
        ):
            if (
                assessment.target_index != index
                or assessment.target_ref != self.selected_event.targets[index]
            ):
                raise ValueError(
                    "semantic assessment must preserve target identity/order"
                )
        return self


class PetraProjectHistoryImpactViewV110(PetraModel):
    schema_name: Literal["petra.project-history-impact-view"]
    schema_version: Literal["1.1.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryImpactContentV110
    content_hash: str
    read_at: str


class ProjectHistorySemanticResolvedTargetRefV120(PetraModel):
    semantic_key: Literal[
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
        "petra.project-source",
        "petra.project-source-replacement",
    ]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal[
        "petra.change-set",
        "petra.approval",
        "petra.claim",
        "petra.assertion",
        "petra.project-source",
        "petra.project-source-replacement",
    ]
    schema_version: Literal["1.0.0", "1.1.0"]
    content_hash: str | None = None
    record_hash: str

    @model_validator(mode="after")
    def supported_schema_version(
        self,
    ) -> ProjectHistorySemanticResolvedTargetRefV120:
        if self.schema_name != "petra.change-set" and self.schema_version != "1.0.0":
            raise ValueError(
                "only ChangeSet semantic targets support authority version 1.1"
            )
        return self


class ProjectHistorySemanticDependentRefV120(PetraModel):
    semantic_key: Literal[
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
        "petra.review-session",
        "petra.grounded-response",
        "petra.composition-request",
        "petra.composition-plan",
        "petra.provenance-map",
        "petra.draft-artifact",
        "petra.parsed-document",
        "petra.structural-block",
        "petra.source-span",
        "petra.work-unit",
        "petra.project-source-lifecycle-receipt",
        "petra.project-source-replacement",
        "petra.project-source-replacement-retraction",
        "petra.project-source-replacement-receipt",
    ]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal[
        "petra.change-set",
        "petra.approval",
        "petra.claim",
        "petra.assertion",
        "petra.review-session",
        "petra.grounded-response",
        "petra.composition-request",
        "petra.composition-plan",
        "petra.provenance-map",
        "petra.draft-artifact",
        "petra.parsed-document",
        "petra.structural-block",
        "petra.source-span",
        "petra.work-unit",
        "petra.project-source-lifecycle-receipt",
        "petra.project-source-replacement",
        "petra.project-source-replacement-retraction",
        "petra.project-source-replacement-receipt",
    ]
    schema_version: Literal["1.0.0", "1.1.0"]
    content_hash: str | None = None
    record_hash: str
    posture: Literal["current", "historical", "immutable_revision"]
    relation: Literal[
        "approves_exact_change_set",
        "authorized_by_exact_change_set",
        "authorized_by_exact_approval",
        "proposes_promotion_from_exact_evidence_revision",
        "contains_exact_review_candidate",
        "depends_on_exact_grounded_evidence",
        "selects_exact_composition_subject",
        "uses_exact_composition_evidence",
        "maps_exact_provenance_basis",
        "retains_exact_draft_authority_dependency",
        "parses_exact_source_artifact",
        "structures_exact_source_artifact",
        "locates_span_in_exact_source_artifact",
        "derives_claim_from_exact_source_artifact",
        "derives_assertion_from_exact_source_artifact",
        "uses_exact_source_artifact_in_active_work",
        "reviews_evidence_from_exact_source_artifact",
        "depends_on_exact_source_authority",
        "records_exact_source_prior_revision",
        "records_exact_source_resulting_revision",
        "retains_exact_replaced_source",
        "retains_exact_replacement_source",
        "retracts_exact_source_replacement",
        "records_exact_source_replacement_command",
        "is_current_active_replacement_head",
        "is_current_retracted_replacement_head",
    ]
    relation_identity: str = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def supported_schema_version(
        self,
    ) -> ProjectHistorySemanticDependentRefV120:
        if self.schema_name != "petra.change-set" and self.schema_version != "1.0.0":
            raise ValueError("only ChangeSet semantic dependents support version 1.1")
        return self


class ProjectHistorySemanticAdapterGroupV120(PetraModel):
    adapter_kind: Literal[
        "change_control",
        "review_membership",
        "grounded_response_dependency",
        "composition_lineage",
        "project_source_lifecycle",
        "project_source_dependency",
        "project_source_replacement_lineage",
        "project_source_replacement_receipt",
        "project_source_effective_head",
    ]
    authority_source: Literal[
        "immutable_change_control_target_bindings",
        "immutable_review_candidate_bindings",
        "immutable_grounded_response_dependencies",
        "immutable_composition_target_bindings",
        "immutable_project_source_lifecycle_receipts",
        "immutable_project_source_dependency_bindings",
        "immutable_project_source_replacement_bindings",
        "immutable_project_source_replacement_receipts",
        "current_project_source_replacement_heads",
    ]
    relation_scope: Literal["exact_target_revision"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=25)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistorySemanticDependentRefV120] = Field(max_length=25)

    @model_validator(mode="after")
    def exact_authority_and_counts(
        self,
    ) -> ProjectHistorySemanticAdapterGroupV120:
        authorities = {
            "change_control": "immutable_change_control_target_bindings",
            "review_membership": "immutable_review_candidate_bindings",
            "grounded_response_dependency": (
                "immutable_grounded_response_dependencies"
            ),
            "composition_lineage": "immutable_composition_target_bindings",
            "project_source_lifecycle": ("immutable_project_source_lifecycle_receipts"),
            "project_source_dependency": (
                "immutable_project_source_dependency_bindings"
            ),
            "project_source_replacement_lineage": (
                "immutable_project_source_replacement_bindings"
            ),
            "project_source_replacement_receipt": (
                "immutable_project_source_replacement_receipts"
            ),
            "project_source_effective_head": (
                "current_project_source_replacement_heads"
            ),
        }
        if authorities[self.adapter_kind] != self.authority_source:
            raise ValueError("semantic adapter must name its exact owning authority")
        if self.returned_count != len(self.refs):
            raise ValueError(
                "semantic adapter returned count must match its references"
            )
        expected_coverage = (
            "truncated" if self.total_count > self.returned_count else "complete"
        )
        if self.coverage != expected_coverage:
            raise ValueError("semantic adapter coverage must match its bounded count")
        return self


class ProjectHistorySemanticRegisteredAssessmentV120(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal["registered"]
    resolved_target_ref: ProjectHistorySemanticResolvedTargetRefV120
    groups: list[ProjectHistorySemanticAdapterGroupV120] = Field(
        min_length=1, max_length=4
    )


class ProjectHistorySemanticUnavailableAssessmentV120(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal[
        "no_registered_exact_adapter",
        "target_identity_incomplete",
        "target_authority_unavailable",
    ]
    reason: Literal[
        "No exact semantic-target adapter is registered for this semantic key.",
        "Registered semantic-target adapters require an immutable target revision.",
        "The exact immutable target authority is unavailable in this Project snapshot.",
    ]
    groups: list[ProjectHistorySemanticAdapterGroupV120] = Field(max_length=0)

    @model_validator(mode="after")
    def exact_unavailability(
        self,
    ) -> ProjectHistorySemanticUnavailableAssessmentV120:
        registered_keys = {
            "petra.change-set",
            "petra.approval",
            "scientific.claim",
            "scientific.assertion",
            "petra.project-source",
            "petra.project-source-replacement",
        }
        reasons = {
            "no_registered_exact_adapter": (
                "No exact semantic-target adapter is registered for this semantic key."
            ),
            "target_identity_incomplete": (
                "Registered semantic-target adapters require an immutable target "
                "revision."
            ),
            "target_authority_unavailable": (
                "The exact immutable target authority is unavailable in this Project "
                "snapshot."
            ),
        }
        if self.reason != reasons[self.adapter_state]:
            raise ValueError("semantic adapter state must name its exact reason")
        if self.adapter_state == "no_registered_exact_adapter":
            if self.target_ref.semantic_key in registered_keys:
                raise ValueError(
                    "registered semantic keys must use a registered adapter state"
                )
        elif self.target_ref.semantic_key not in registered_keys:
            raise ValueError(
                "unavailable registered-adapter states require a registered key"
            )
        if self.adapter_state == "target_identity_incomplete":
            if self.target_ref.revision is not None:
                raise ValueError("incomplete semantic targets cannot have a revision")
        elif (
            self.adapter_state == "target_authority_unavailable"
            and self.target_ref.revision is None
        ):
            raise ValueError("unavailable target authority requires an exact revision")
        return self


ProjectHistorySemanticTargetAssessmentV120 = (
    ProjectHistorySemanticRegisteredAssessmentV120
    | ProjectHistorySemanticUnavailableAssessmentV120
)


class ProjectHistorySemanticRegistryEntryV120(PetraModel):
    adapter_kind: str
    authority_source: str
    semantic_keys: list[str] = Field(min_length=1, max_length=4)


class ProjectHistorySemanticSummaryV120(PetraModel):
    registered_adapter_count: Literal[9]
    assessed_target_count: int = Field(ge=0, le=10)
    supported_target_count: int = Field(ge=0, le=10)
    total_count: int = Field(ge=0, le=40_000_000)
    coverage: Literal["complete", "truncated"]


class ProjectHistorySemanticTargetImpactV120(PetraModel):
    scope: Literal["registered_exact_semantic_target_dependents"]
    target_limit: Literal[10]
    per_adapter_ref_limit: Literal[25]
    target_total_count: int = Field(ge=1, le=100)
    target_returned_count: int = Field(ge=1, le=10)
    target_coverage: Literal["complete", "truncated"]
    registry: list[ProjectHistorySemanticRegistryEntryV120] = Field(
        min_length=9, max_length=9
    )
    target_assessments: list[ProjectHistorySemanticTargetAssessmentV120] = Field(
        min_length=1, max_length=10
    )
    summary: ProjectHistorySemanticSummaryV120
    unknowns: list[
        Literal[
            "unregistered_semantic_keys_may_have_dependents",
            "identity_only_semantic_relations_are_excluded",
            "transitive_semantic_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        ]
    ] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def exact_registry_counts_and_unknowns(
        self,
    ) -> ProjectHistorySemanticTargetImpactV120:
        expected_registry = [
            (
                "change_control",
                "immutable_change_control_target_bindings",
                [
                    "petra.change-set",
                    "petra.approval",
                    "scientific.claim",
                    "scientific.assertion",
                ],
            ),
            (
                "review_membership",
                "immutable_review_candidate_bindings",
                ["scientific.claim", "scientific.assertion"],
            ),
            (
                "grounded_response_dependency",
                "immutable_grounded_response_dependencies",
                ["scientific.claim", "scientific.assertion"],
            ),
            (
                "composition_lineage",
                "immutable_composition_target_bindings",
                ["scientific.claim", "scientific.assertion"],
            ),
            (
                "project_source_lifecycle",
                "immutable_project_source_lifecycle_receipts",
                ["petra.project-source"],
            ),
            (
                "project_source_dependency",
                "immutable_project_source_dependency_bindings",
                ["petra.project-source"],
            ),
            (
                "project_source_replacement_lineage",
                "immutable_project_source_replacement_bindings",
                ["petra.project-source", "petra.project-source-replacement"],
            ),
            (
                "project_source_replacement_receipt",
                "immutable_project_source_replacement_receipts",
                ["petra.project-source-replacement"],
            ),
            (
                "project_source_effective_head",
                "current_project_source_replacement_heads",
                ["petra.project-source", "petra.project-source-replacement"],
            ),
        ]
        actual_registry = [
            (entry.adapter_kind, entry.authority_source, entry.semantic_keys)
            for entry in self.registry
        ]
        if actual_registry != expected_registry:
            raise ValueError("semantic adapter registry must be exact and ordered")
        expected_unknowns = {
            "unregistered_semantic_keys_may_have_dependents",
            "identity_only_semantic_relations_are_excluded",
            "transitive_semantic_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        }
        if len(self.unknowns) != 4 or set(self.unknowns) != expected_unknowns:
            raise ValueError("semantic impact must declare its four exact unknowns")
        if self.target_returned_count != len(self.target_assessments):
            raise ValueError("semantic target count must match its assessments")
        supported = sum(
            assessment.adapter_state == "registered"
            for assessment in self.target_assessments
        )
        groups = [
            group
            for assessment in self.target_assessments
            for group in assessment.groups
        ]
        if (
            self.summary.assessed_target_count != len(self.target_assessments)
            or self.summary.supported_target_count != supported
            or self.summary.total_count != sum(group.total_count for group in groups)
        ):
            raise ValueError("semantic impact summary must match assessed groups")
        expected_coverage = (
            "truncated"
            if self.target_coverage == "truncated"
            or any(group.coverage == "truncated" for group in groups)
            else "complete"
        )
        if self.summary.coverage != expected_coverage:
            raise ValueError("semantic impact summary coverage must remain bounded")
        return self


class ProjectHistoryImpactContentV120(PetraModel):
    view_kind: Literal["dependency_impact"]
    selected_event: ProjectHistoryImpactEventAnchor
    authorization_scope: Literal["authenticated_project"]
    impact: ProjectHistoryImpactInventory
    semantic_target_impact: ProjectHistorySemanticTargetImpactV120
    decision_boundary: ProjectHistoryImpactDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=7, max_length=7)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_targets_and_omissions(self) -> ProjectHistoryImpactContentV120:
        expected_omissions = {
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 7 or set(self.omissions) != expected_omissions:
            raise ValueError(
                "History impact 1.2 must declare its seven exact omissions"
            )
        if self.semantic_target_impact.target_total_count != len(
            self.selected_event.targets
        ):
            raise ValueError("semantic impact must count the selected event targets")
        for index, assessment in enumerate(
            self.semantic_target_impact.target_assessments
        ):
            if (
                assessment.target_index != index
                or assessment.target_ref != self.selected_event.targets[index]
            ):
                raise ValueError(
                    "semantic assessment must preserve target identity/order"
                )
        return self


class PetraProjectHistoryImpactViewV120(PetraModel):
    schema_name: Literal["petra.project-history-impact-view"]
    schema_version: Literal["1.2.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryImpactContentV120
    content_hash: str
    read_at: str


class ProjectHistoryOperationalResolvedTargetRecordV130(PetraModel):
    semantic_key: str
    object_id: str
    revision: int = Field(ge=1)
    content_hash: str | None = None
    record_hash: str
    authority_source: Literal[
        "selected_event_target", "resolved_immutable_semantic_authority"
    ]


class ProjectHistoryOperationalWorkUnitRefV130(PetraModel):
    work_unit_id: str
    revision: int = Field(ge=1)
    spec_hash: str
    record_hash: str


class ProjectHistoryOperationalInputBindingRefV130(PetraModel):
    worker_input_manifest_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str
    binding_position: int = Field(ge=1, le=10_000)
    binding_name: str
    record_id: str
    record_revision: int = Field(ge=1)
    snapshot_hash: str


class ProjectHistoryOperationalInteractionRunRefV130(PetraModel):
    interaction_run_id: str
    revision: int = Field(ge=1)
    content_hash: str
    record_hash: str


class ProjectHistoryOperationalDependentRefV130(PetraModel):
    semantic_key: Literal[
        "petra.work-unit",
        "petra.worker-output-manifest",
        "petra.interaction-replay-record",
    ]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal[
        "petra.work-unit",
        "petra.worker-output-manifest",
        "petra.interaction-replay-record",
    ]
    schema_version: Literal["1.0.0"]
    content_hash: str | None = None
    record_hash: str
    posture: Literal["current", "immutable_revision"]
    relation: Literal[
        "uses_exact_history_target_as_work_input",
        "reports_output_for_work_using_exact_history_target",
        "delivers_interaction_for_work_using_exact_history_target",
    ]
    relation_identity: str = Field(min_length=1, max_length=500)
    work_unit_ref: ProjectHistoryOperationalWorkUnitRefV130
    input_binding_ref: ProjectHistoryOperationalInputBindingRefV130
    interaction_run_ref: ProjectHistoryOperationalInteractionRunRefV130 | None = None

    @model_validator(mode="after")
    def exact_kind_and_authority(
        self,
    ) -> ProjectHistoryOperationalDependentRefV130:
        expected = {
            "petra.work-unit": (
                "petra.work-unit",
                "current",
                "uses_exact_history_target_as_work_input",
            ),
            "petra.worker-output-manifest": (
                "petra.worker-output-manifest",
                "immutable_revision",
                "reports_output_for_work_using_exact_history_target",
            ),
            "petra.interaction-replay-record": (
                "petra.interaction-replay-record",
                "immutable_revision",
                "delivers_interaction_for_work_using_exact_history_target",
            ),
        }
        if (
            self.schema_name,
            self.posture,
            self.relation,
        ) != expected[self.semantic_key]:
            raise ValueError(
                "operational reference kind must preserve its exact relation"
            )
        if self.semantic_key == "petra.work-unit":
            if (
                self.content_hash is not None
                or self.interaction_run_ref is not None
                or self.object_id != self.work_unit_ref.work_unit_id
                or self.revision != self.work_unit_ref.revision
                or self.record_hash != self.work_unit_ref.record_hash
            ):
                raise ValueError(
                    "Work dependency must be the exact current WorkUnit ref"
                )
        elif self.content_hash is None:
            raise ValueError("immutable operational records require a content hash")
        if (self.semantic_key == "petra.interaction-replay-record") != (
            self.interaction_run_ref is not None
        ):
            raise ValueError(
                "only interaction deliveries require an InteractionRun ref"
            )
        return self


class ProjectHistoryOperationalAdapterGroupV130(PetraModel):
    adapter_kind: Literal["work_input_binding", "work_output", "interaction_delivery"]
    authority_source: Literal[
        "current_work_heads_with_immutable_input_bindings",
        "immutable_worker_output_manifests_for_bound_work",
        "immutable_interaction_replay_records_for_bound_work",
    ]
    relation_scope: Literal["exact_target_record_binding"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=25)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistoryOperationalDependentRefV130] = Field(max_length=25)

    @model_validator(mode="after")
    def exact_authority_and_counts(
        self,
    ) -> ProjectHistoryOperationalAdapterGroupV130:
        expected = {
            "work_input_binding": (
                "current_work_heads_with_immutable_input_bindings",
                "petra.work-unit",
            ),
            "work_output": (
                "immutable_worker_output_manifests_for_bound_work",
                "petra.worker-output-manifest",
            ),
            "interaction_delivery": (
                "immutable_interaction_replay_records_for_bound_work",
                "petra.interaction-replay-record",
            ),
        }
        authority, semantic_key = expected[self.adapter_kind]
        if self.authority_source != authority or any(
            ref.semantic_key != semantic_key for ref in self.refs
        ):
            raise ValueError("operational adapter must preserve its owning authority")
        if self.returned_count != len(self.refs):
            raise ValueError("operational returned count must match its refs")
        expected_coverage = (
            "truncated" if self.total_count > self.returned_count else "complete"
        )
        if self.coverage != expected_coverage:
            raise ValueError("operational coverage must match its bounded count")
        return self


class ProjectHistoryOperationalRegisteredAssessmentV130(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal["registered"]
    resolved_target_record: ProjectHistoryOperationalResolvedTargetRecordV130
    groups: list[ProjectHistoryOperationalAdapterGroupV130] = Field(
        min_length=3, max_length=3
    )

    @model_validator(mode="after")
    def exact_target_and_group_order(
        self,
    ) -> ProjectHistoryOperationalRegisteredAssessmentV130:
        resolved = self.resolved_target_record
        if (
            resolved.semantic_key != self.target_ref.semantic_key
            or resolved.object_id != self.target_ref.object_id
            or resolved.revision != self.target_ref.revision
            or (
                self.target_ref.record_hash is not None
                and resolved.record_hash != self.target_ref.record_hash
            )
        ):
            raise ValueError("operational assessment must preserve target identity")
        if [group.adapter_kind for group in self.groups] != [
            "work_input_binding",
            "work_output",
            "interaction_delivery",
        ]:
            raise ValueError("operational groups must retain registry order")
        for group in self.groups:
            for ref in group.refs:
                binding = ref.input_binding_ref
                if (
                    binding.record_id != resolved.object_id
                    or binding.record_revision != resolved.revision
                    or binding.snapshot_hash != resolved.record_hash
                ):
                    raise ValueError(
                        "operational ref must bind the exact target record"
                    )
        return self


class ProjectHistoryOperationalUnavailableAssessmentV130(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal[
        "target_identity_incomplete", "target_record_authority_unavailable"
    ]
    reason: Literal[
        "Operational adapters require an immutable target revision.",
        "The exact immutable target record authority is unavailable in this "
        "Project snapshot.",
    ]
    groups: list[ProjectHistoryOperationalAdapterGroupV130] = Field(max_length=0)

    @model_validator(mode="after")
    def exact_unavailability(
        self,
    ) -> ProjectHistoryOperationalUnavailableAssessmentV130:
        reasons = {
            "target_identity_incomplete": (
                "Operational adapters require an immutable target revision."
            ),
            "target_record_authority_unavailable": (
                "The exact immutable target record authority is unavailable in this "
                "Project snapshot."
            ),
        }
        if self.reason != reasons[self.adapter_state]:
            raise ValueError("operational adapter state must name its exact reason")
        if (self.adapter_state == "target_identity_incomplete") != (
            self.target_ref.revision is None
        ):
            raise ValueError(
                "operational target state must match revision availability"
            )
        return self


ProjectHistoryOperationalTargetAssessmentV130 = (
    ProjectHistoryOperationalRegisteredAssessmentV130
    | ProjectHistoryOperationalUnavailableAssessmentV130
)


class ProjectHistoryOperationalRegistryEntryV130(PetraModel):
    adapter_kind: str
    authority_source: str
    dependent_semantic_key: str


class ProjectHistoryOperationalSummaryV130(PetraModel):
    registered_adapter_count: Literal[3]
    assessed_target_count: int = Field(ge=0, le=10)
    supported_target_count: int = Field(ge=0, le=10)
    total_count: int = Field(ge=0, le=30_000_000)
    coverage: Literal["complete", "truncated"]


class ProjectHistoryOperationalDependencyImpactV130(PetraModel):
    scope: Literal["registered_exact_operational_dependents"]
    target_limit: Literal[10]
    per_adapter_ref_limit: Literal[25]
    target_total_count: int = Field(ge=1, le=100)
    target_returned_count: int = Field(ge=1, le=10)
    target_coverage: Literal["complete", "truncated"]
    registry: list[ProjectHistoryOperationalRegistryEntryV130] = Field(
        min_length=3, max_length=3
    )
    target_assessments: list[ProjectHistoryOperationalTargetAssessmentV130] = Field(
        min_length=1, max_length=10
    )
    summary: ProjectHistoryOperationalSummaryV130
    unknowns: list[
        Literal[
            "work_without_exact_record_binding_is_excluded",
            "unresolved_target_record_authority_may_hide_bindings",
            "worker_output_effect_is_not_inferred",
            "interaction_delivery_effect_is_not_inferred",
            "transitive_operational_dependency_closure_is_not_composed",
            "cross_family_total_order_is_not_asserted",
        ]
    ] = Field(min_length=6, max_length=6)

    @model_validator(mode="after")
    def exact_registry_counts_and_unknowns(
        self,
    ) -> ProjectHistoryOperationalDependencyImpactV130:
        expected_registry = [
            (
                "work_input_binding",
                "current_work_heads_with_immutable_input_bindings",
                "petra.work-unit",
            ),
            (
                "work_output",
                "immutable_worker_output_manifests_for_bound_work",
                "petra.worker-output-manifest",
            ),
            (
                "interaction_delivery",
                "immutable_interaction_replay_records_for_bound_work",
                "petra.interaction-replay-record",
            ),
        ]
        actual_registry = [
            (
                entry.adapter_kind,
                entry.authority_source,
                entry.dependent_semantic_key,
            )
            for entry in self.registry
        ]
        if actual_registry != expected_registry:
            raise ValueError("operational adapter registry must be exact and ordered")
        expected_unknowns = {
            "work_without_exact_record_binding_is_excluded",
            "unresolved_target_record_authority_may_hide_bindings",
            "worker_output_effect_is_not_inferred",
            "interaction_delivery_effect_is_not_inferred",
            "transitive_operational_dependency_closure_is_not_composed",
            "cross_family_total_order_is_not_asserted",
        }
        if len(self.unknowns) != 6 or set(self.unknowns) != expected_unknowns:
            raise ValueError("operational impact must declare its six exact unknowns")
        groups = [
            group
            for assessment in self.target_assessments
            for group in assessment.groups
        ]
        supported = sum(
            assessment.adapter_state == "registered"
            for assessment in self.target_assessments
        )
        if (
            self.target_returned_count != len(self.target_assessments)
            or self.summary.assessed_target_count != len(self.target_assessments)
            or self.summary.supported_target_count != supported
            or self.summary.total_count != sum(group.total_count for group in groups)
        ):
            raise ValueError("operational impact summary must match assessed groups")
        expected_coverage = (
            "truncated"
            if self.target_coverage == "truncated"
            or any(group.coverage == "truncated" for group in groups)
            else "complete"
        )
        if self.summary.coverage != expected_coverage:
            raise ValueError("operational impact coverage must remain bounded")
        return self


class ProjectHistoryImpactContentV130(PetraModel):
    view_kind: Literal["dependency_impact"]
    selected_event: ProjectHistoryImpactEventAnchor
    authorization_scope: Literal["authenticated_project"]
    impact: ProjectHistoryImpactInventory
    semantic_target_impact: ProjectHistorySemanticTargetImpactV120
    operational_dependency_impact: ProjectHistoryOperationalDependencyImpactV130
    decision_boundary: ProjectHistoryImpactDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "work_without_exact_record_binding_not_composed",
            "operational_dependent_effect_not_inferred",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=9, max_length=9)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_targets_and_omissions(self) -> ProjectHistoryImpactContentV130:
        expected_omissions = {
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "work_without_exact_record_binding_not_composed",
            "operational_dependent_effect_not_inferred",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 9 or set(self.omissions) != expected_omissions:
            raise ValueError("History impact 1.3 must declare its nine exact omissions")
        targets = self.selected_event.targets
        if self.semantic_target_impact.target_total_count != len(
            targets
        ) or self.operational_dependency_impact.target_total_count != len(targets):
            raise ValueError("History impact slices must count selected event targets")
        for assessments in (
            self.semantic_target_impact.target_assessments,
            self.operational_dependency_impact.target_assessments,
        ):
            for index, assessment in enumerate(assessments):
                if (
                    assessment.target_index != index
                    or assessment.target_ref != targets[index]
                ):
                    raise ValueError(
                        "History impact assessments must preserve target identity/order"
                    )
        return self


class PetraProjectHistoryImpactViewV130(PetraModel):
    schema_name: Literal["petra.project-history-impact-view"]
    schema_version: Literal["1.3.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryImpactContentV130
    content_hash: str
    read_at: str


class ProjectHistoryOperationalDefinitionRefV140(PetraModel):
    project_definition_id: str
    revision: int = Field(ge=1)
    content_hash: str
    definition_family: str


class ProjectHistoryOperationalDestinationObjectRefV140(PetraModel):
    semantic_key: Literal["petra.work-unit"]
    object_id: str
    revision: int = Field(ge=1)
    record_hash: str


class ProjectHistoryOperationalRouteAuthorityV140(PetraModel):
    schema_name: Literal["petra.project-work-view"]
    schema_version: Literal["1.0.0"]
    view_kind: Literal["detail"]
    authority_source: Literal["current_project_definition_and_project_work_view"]


class ProjectHistoryAvailableWorkDestinationV140(PetraModel):
    state: Literal["available"]
    place_role: Literal["work"]
    task_intent: Literal["inspect"]
    object_ref: ProjectHistoryOperationalDestinationObjectRefV140
    route_authority: ProjectHistoryOperationalRouteAuthorityV140
    project_definition_ref: ProjectHistoryOperationalDefinitionRefV140


class ProjectHistoryUnavailableWorkDestinationV140(PetraModel):
    state: Literal["unavailable"]
    reason_code: Literal["project_work_route_authority_unavailable"]
    reason: Literal[
        "The current ProjectDefinition does not authorize the exact Project Work "
        "detail destination."
    ]


class ProjectHistoryUnavailableOutputDestinationV140(PetraModel):
    state: Literal["unavailable"]
    reason_code: Literal["worker_output_manifest_route_not_registered"]
    reason: Literal[
        "No exact Project-owned WorkerOutputManifest destination is registered."
    ]


class ProjectHistoryUnavailableReplayDestinationV140(PetraModel):
    state: Literal["unavailable"]
    reason_code: Literal["interaction_replay_record_route_not_registered"]
    reason: Literal[
        "No exact Project-owned InteractionReplayRecord destination is registered; "
        "replay is not a ProjectThread binding."
    ]


ProjectHistoryOperationalDestinationV140 = (
    ProjectHistoryAvailableWorkDestinationV140
    | ProjectHistoryUnavailableWorkDestinationV140
    | ProjectHistoryUnavailableOutputDestinationV140
    | ProjectHistoryUnavailableReplayDestinationV140
)


class ProjectHistoryOperationalDependentRefV140(
    ProjectHistoryOperationalDependentRefV130
):
    destination: ProjectHistoryOperationalDestinationV140

    @model_validator(mode="after")
    def exact_destination(self) -> ProjectHistoryOperationalDependentRefV140:
        destination = self.destination
        if self.semantic_key == "petra.work-unit":
            if not isinstance(
                destination,
                ProjectHistoryAvailableWorkDestinationV140
                | ProjectHistoryUnavailableWorkDestinationV140,
            ):
                raise ValueError("Work must use only its exact destination state")
            if isinstance(destination, ProjectHistoryAvailableWorkDestinationV140):
                target = destination.object_ref
                if (
                    target.object_id != self.work_unit_ref.work_unit_id
                    or target.revision != self.work_unit_ref.revision
                    or target.record_hash != self.work_unit_ref.record_hash
                ):
                    raise ValueError(
                        "Work destination must preserve the exact current Work ref"
                    )
        elif self.semantic_key == "petra.worker-output-manifest":
            if not isinstance(
                destination, ProjectHistoryUnavailableOutputDestinationV140
            ):
                raise ValueError("Worker output has no exact registered destination")
        elif not isinstance(
            destination, ProjectHistoryUnavailableReplayDestinationV140
        ):
            raise ValueError("Interaction replay has no ProjectThread destination")
        return self


class ProjectHistoryOperationalAdapterGroupV140(PetraModel):
    adapter_kind: Literal["work_input_binding", "work_output", "interaction_delivery"]
    authority_source: Literal[
        "current_work_heads_with_immutable_input_bindings",
        "immutable_worker_output_manifests_for_bound_work",
        "immutable_interaction_replay_records_for_bound_work",
    ]
    relation_scope: Literal["exact_target_record_binding"]
    total_count: int = Field(ge=0, le=1_000_000)
    returned_count: int = Field(ge=0, le=25)
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectHistoryOperationalDependentRefV140] = Field(max_length=25)

    @model_validator(mode="after")
    def exact_authority_and_counts(
        self,
    ) -> ProjectHistoryOperationalAdapterGroupV140:
        expected = {
            "work_input_binding": (
                "current_work_heads_with_immutable_input_bindings",
                "petra.work-unit",
            ),
            "work_output": (
                "immutable_worker_output_manifests_for_bound_work",
                "petra.worker-output-manifest",
            ),
            "interaction_delivery": (
                "immutable_interaction_replay_records_for_bound_work",
                "petra.interaction-replay-record",
            ),
        }
        authority, semantic_key = expected[self.adapter_kind]
        if self.authority_source != authority or any(
            ref.semantic_key != semantic_key for ref in self.refs
        ):
            raise ValueError("operational adapter must preserve its owning authority")
        if self.returned_count != len(self.refs):
            raise ValueError("operational returned count must match its refs")
        expected_coverage = (
            "truncated" if self.total_count > self.returned_count else "complete"
        )
        if self.coverage != expected_coverage:
            raise ValueError("operational coverage must match its bounded count")
        return self


class ProjectHistoryOperationalRegisteredAssessmentV140(PetraModel):
    target_index: int = Field(ge=0, le=99)
    target_ref: ProjectHistoryTargetRef
    adapter_state: Literal["registered"]
    resolved_target_record: ProjectHistoryOperationalResolvedTargetRecordV130
    groups: list[ProjectHistoryOperationalAdapterGroupV140] = Field(
        min_length=3, max_length=3
    )

    @model_validator(mode="after")
    def exact_target_and_group_order(
        self,
    ) -> ProjectHistoryOperationalRegisteredAssessmentV140:
        resolved = self.resolved_target_record
        if (
            resolved.semantic_key != self.target_ref.semantic_key
            or resolved.object_id != self.target_ref.object_id
            or resolved.revision != self.target_ref.revision
            or (
                self.target_ref.record_hash is not None
                and resolved.record_hash != self.target_ref.record_hash
            )
        ):
            raise ValueError("operational assessment must preserve target identity")
        if [group.adapter_kind for group in self.groups] != [
            "work_input_binding",
            "work_output",
            "interaction_delivery",
        ]:
            raise ValueError("operational groups must retain registry order")
        for group in self.groups:
            for ref in group.refs:
                binding = ref.input_binding_ref
                if (
                    binding.record_id != resolved.object_id
                    or binding.record_revision != resolved.revision
                    or binding.snapshot_hash != resolved.record_hash
                ):
                    raise ValueError(
                        "operational ref must bind the exact target record"
                    )
        return self


ProjectHistoryOperationalTargetAssessmentV140 = (
    ProjectHistoryOperationalRegisteredAssessmentV140
    | ProjectHistoryOperationalUnavailableAssessmentV130
)


class ProjectHistoryOperationalDependencyImpactV140(PetraModel):
    scope: Literal["registered_exact_operational_dependents"]
    target_limit: Literal[10]
    per_adapter_ref_limit: Literal[25]
    target_total_count: int = Field(ge=1, le=100)
    target_returned_count: int = Field(ge=1, le=10)
    target_coverage: Literal["complete", "truncated"]
    registry: list[ProjectHistoryOperationalRegistryEntryV130] = Field(
        min_length=3, max_length=3
    )
    target_assessments: list[ProjectHistoryOperationalTargetAssessmentV140] = Field(
        min_length=1, max_length=10
    )
    summary: ProjectHistoryOperationalSummaryV130
    unknowns: list[
        Literal[
            "work_without_exact_record_binding_is_excluded",
            "unresolved_target_record_authority_may_hide_bindings",
            "worker_output_effect_is_not_inferred",
            "interaction_delivery_effect_is_not_inferred",
            "transitive_operational_dependency_closure_is_not_composed",
            "cross_family_total_order_is_not_asserted",
        ]
    ] = Field(min_length=6, max_length=6)

    @model_validator(mode="after")
    def exact_registry_counts_and_unknowns(
        self,
    ) -> ProjectHistoryOperationalDependencyImpactV140:
        expected_registry = [
            (
                "work_input_binding",
                "current_work_heads_with_immutable_input_bindings",
                "petra.work-unit",
            ),
            (
                "work_output",
                "immutable_worker_output_manifests_for_bound_work",
                "petra.worker-output-manifest",
            ),
            (
                "interaction_delivery",
                "immutable_interaction_replay_records_for_bound_work",
                "petra.interaction-replay-record",
            ),
        ]
        actual_registry = [
            (
                entry.adapter_kind,
                entry.authority_source,
                entry.dependent_semantic_key,
            )
            for entry in self.registry
        ]
        if actual_registry != expected_registry:
            raise ValueError("operational adapter registry must be exact and ordered")
        expected_unknowns = {
            "work_without_exact_record_binding_is_excluded",
            "unresolved_target_record_authority_may_hide_bindings",
            "worker_output_effect_is_not_inferred",
            "interaction_delivery_effect_is_not_inferred",
            "transitive_operational_dependency_closure_is_not_composed",
            "cross_family_total_order_is_not_asserted",
        }
        if len(self.unknowns) != 6 or set(self.unknowns) != expected_unknowns:
            raise ValueError("operational impact must declare its six exact unknowns")
        groups = [
            group
            for assessment in self.target_assessments
            for group in assessment.groups
        ]
        supported = sum(
            assessment.adapter_state == "registered"
            for assessment in self.target_assessments
        )
        if (
            self.target_returned_count != len(self.target_assessments)
            or self.summary.assessed_target_count != len(self.target_assessments)
            or self.summary.supported_target_count != supported
            or self.summary.total_count != sum(group.total_count for group in groups)
        ):
            raise ValueError("operational impact summary must match assessed groups")
        expected_coverage = (
            "truncated"
            if self.target_coverage == "truncated"
            or any(group.coverage == "truncated" for group in groups)
            else "complete"
        )
        if self.summary.coverage != expected_coverage:
            raise ValueError("operational impact coverage must remain bounded")
        return self


class ProjectHistoryImpactContentV140(PetraModel):
    view_kind: Literal["dependency_impact"]
    selected_event: ProjectHistoryImpactEventAnchor
    authorization_scope: Literal["authenticated_project"]
    impact: ProjectHistoryImpactInventory
    semantic_target_impact: ProjectHistorySemanticTargetImpactV120
    operational_dependency_impact: ProjectHistoryOperationalDependencyImpactV140
    decision_boundary: ProjectHistoryImpactDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "work_without_exact_record_binding_not_composed",
            "operational_dependent_effect_not_inferred",
            "unregistered_operational_destination_not_inferred",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=10, max_length=10)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_targets_and_omissions(self) -> ProjectHistoryImpactContentV140:
        expected_omissions = {
            "unregistered_semantic_target_adapters_not_composed",
            "identity_only_semantic_relations_not_composed",
            "transitive_dependency_closure_not_composed",
            "work_without_exact_record_binding_not_composed",
            "operational_dependent_effect_not_inferred",
            "unregistered_operational_destination_not_inferred",
            "reversibility_not_assessed",
            "compensation_not_composed",
            "historical_project_definition_not_interpreted",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 10 or set(self.omissions) != expected_omissions:
            raise ValueError("History impact 1.4 must declare its ten exact omissions")
        targets = self.selected_event.targets
        if self.semantic_target_impact.target_total_count != len(
            targets
        ) or self.operational_dependency_impact.target_total_count != len(targets):
            raise ValueError("History impact slices must count selected event targets")
        for assessments in (
            self.semantic_target_impact.target_assessments,
            self.operational_dependency_impact.target_assessments,
        ):
            for index, assessment in enumerate(assessments):
                if (
                    assessment.target_index != index
                    or assessment.target_ref != targets[index]
                ):
                    raise ValueError(
                        "History impact assessments must preserve target identity/order"
                    )
        return self


class PetraProjectHistoryImpactViewV140(PetraModel):
    schema_name: Literal["petra.project-history-impact-view"]
    schema_version: Literal["1.4.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryImpactContentV140
    content_hash: str
    read_at: str


class ProjectHistoryRecoveryChangeSetRef(PetraModel):
    change_set_id: str
    revision: Literal[1]
    schema_version: Literal["1.0.0", "1.1.0"]
    content_hash: str
    record_hash: str
    current_state: Literal[
        "submitted", "approved", "rejected", "applied", "conflicted", "reverted"
    ]


class ProjectHistoryRecoveryApprovalRef(PetraModel):
    approval_id: str
    revision: Literal[1]
    change_set_id: str
    change_set_revision: Literal[1]
    change_set_content_hash: str
    decision: Literal["approved"]
    record_hash: str


class ProjectHistoryRecoveryEvidenceRef(PetraModel):
    semantic_key: Literal["scientific.claim", "scientific.assertion"]
    object_id: str
    revision: int = Field(ge=1)
    schema_name: Literal["petra.claim", "petra.assertion"]
    schema_version: Literal["1.0.0"]
    record_hash: str
    authority_zone: Literal["quarantine", "trusted"]
    review_state: Literal[
        "unreviewed",
        "machine_checked",
        "human_accepted",
        "human_rejected",
        "disputed",
    ]
    admission_kind: Literal["proposal", "promotion", "reversal"]
    promotion_change_set_id: str | None = None


class ProjectHistoryRecoverySubject(PetraModel):
    selected_event_role: Literal["promotion", "compensation"]
    promotion_change_set: ProjectHistoryRecoveryChangeSetRef
    applied_approval: ProjectHistoryRecoveryApprovalRef
    current_targets: list[ProjectHistoryRecoveryEvidenceRef] = Field(
        min_length=2, max_length=2
    )

    @model_validator(mode="after")
    def exact_target_pair(self) -> ProjectHistoryRecoverySubject:
        if [target.semantic_key for target in self.current_targets] != [
            "scientific.claim",
            "scientific.assertion",
        ]:
            raise ValueError(
                "recovery authority requires an ordered Claim–Assertion pair"
            )
        return self


class ProjectHistoryRecoveryGrantRef(PetraModel):
    capability_grant_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectHistoryRecoveryGrantedCommand(PetraModel):
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    state: Literal["granted"]
    grant_ref: ProjectHistoryRecoveryGrantRef


class ProjectHistoryRecoveryDeniedCommand(PetraModel):
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    state: Literal["denied"]
    reason: Literal[
        "principal_not_configured",
        "actor_not_registered",
        "active_grant_not_found",
        "active_grant_ambiguous",
    ]


class ProjectHistoryRecoveryConfiguredPrincipal(PetraModel):
    state: Literal["configured"]
    actor: ActorRef


class ProjectHistoryRecoveryUnavailablePrincipal(PetraModel):
    state: Literal["unavailable"]
    reason: Literal["principal_not_configured", "actor_not_registered"]


class ProjectHistoryRecoveryCommandAuthority(PetraModel):
    principal_source: Literal["server_authenticated_single_user"]
    principal_state: (
        ProjectHistoryRecoveryConfiguredPrincipal
        | ProjectHistoryRecoveryUnavailablePrincipal
    )
    required_commands: list[
        ProjectHistoryRecoveryGrantedCommand | ProjectHistoryRecoveryDeniedCommand
    ] = Field(min_length=3, max_length=3)
    execution_recheck: Literal["required_at_each_command"]

    @model_validator(mode="after")
    def exact_command_order(self) -> ProjectHistoryRecoveryCommandAuthority:
        if [command.command_name for command in self.required_commands] != [
            "SubmitChangeSet",
            "RecordApproval",
            "ApplyChangeSet",
        ]:
            raise ValueError("recovery authority requires three exact ordered commands")
        return self


class ProjectHistoryRecoveryBlocker(PetraModel):
    code: Literal[
        "selected_change_set_is_compensation",
        "change_set_not_applied",
        "change_set_operation_set_invalid",
        "target_revision_changed",
        "target_authority_changed",
        "target_pair_mismatch",
        "impact_target_set_mismatch",
        "command_authority_missing",
        "command_authority_ambiguous",
    ]
    detail: str


class ProjectHistoryRecoveryEligible(PetraModel):
    state: Literal["eligible_for_preview"]
    scope: Literal["single_change_set_compensation"]
    reason: str
    blockers: list[ProjectHistoryRecoveryBlocker] = Field(max_length=0)


class ProjectHistoryRecoveryBlocked(PetraModel):
    state: Literal["blocked"]
    scope: Literal["single_change_set_compensation"]
    reason: str
    blockers: list[ProjectHistoryRecoveryBlocker] = Field(min_length=1, max_length=20)


class ProjectHistoryRecoveryAlreadyCompensated(PetraModel):
    state: Literal["already_compensated"]
    scope: Literal["single_change_set_compensation"]
    reason: str
    blockers: list[ProjectHistoryRecoveryBlocker] = Field(max_length=0)
    compensation_change_set: ProjectHistoryRecoveryChangeSetRef
    compensation_approval: ProjectHistoryRecoveryApprovalRef
    compensation_event_ref: ProjectHistoryEventRef


class ProjectHistoryRecoveryCausalBasis(PetraModel):
    source_event_id: str
    direct_dependency_summary: ProjectHistoryImpactSummary
    semantic_dependency_summary: ProjectHistorySemanticSummaryV120
    dependent_effect: Literal["not_inferred_from_reference"]
    unknowns: list[
        Literal[
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        ]
    ] = Field(min_length=3, max_length=3)


class ProjectHistoryRecoveryDecisionBoundary(PetraModel):
    reversibility: Literal["assessed_for_exact_change_set"]
    compensation_preview: Literal["not_composed"]
    compensation_execution: Literal["not_performed"]
    multi_step_compensation: Literal["not_assessed"]


class ProjectHistoryRecoveryContent(PetraModel):
    view_kind: Literal["change_set_recovery_assessment"]
    authorization_scope: Literal["authenticated_project"]
    selected_event: ProjectHistoryRecentChange
    recovery_subject: ProjectHistoryRecoverySubject
    command_authority: ProjectHistoryRecoveryCommandAuthority
    causal_impact_basis: ProjectHistoryRecoveryCausalBasis
    assessment: (
        ProjectHistoryRecoveryEligible
        | ProjectHistoryRecoveryBlocked
        | ProjectHistoryRecoveryAlreadyCompensated
    )
    decision_boundary: ProjectHistoryRecoveryDecisionBoundary
    authority: ProjectHistoryImpactAuthority
    omissions: list[
        Literal[
            "compensation_preview_not_composed",
            "compensation_execution_not_performed",
            "generic_undo_not_implemented",
            "multi_step_compensation_not_assessed",
            "historical_project_definition_not_interpreted",
            "dependent_effect_not_inferred_from_reference",
            "cross_family_total_order_not_asserted",
        ]
    ] = Field(min_length=7, max_length=7)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_boundaries(self) -> ProjectHistoryRecoveryContent:
        expected = {
            "compensation_preview_not_composed",
            "compensation_execution_not_performed",
            "generic_undo_not_implemented",
            "multi_step_compensation_not_assessed",
            "historical_project_definition_not_interpreted",
            "dependent_effect_not_inferred_from_reference",
            "cross_family_total_order_not_asserted",
        }
        if len(self.omissions) != 7 or set(self.omissions) != expected:
            raise ValueError("recovery assessment must preserve its exact omissions")
        expected_unknowns = {
            "unregistered_profile_specific_dependencies_may_exist",
            "transitive_dependents_may_exist",
            "external_system_dependents_are_not_observable",
        }
        if set(self.causal_impact_basis.unknowns) != expected_unknowns:
            raise ValueError("recovery assessment must preserve causal unknowns")
        return self


class PetraProjectHistoryRecoveryAssessmentView(PetraModel):
    schema_name: Literal["petra.project-history-recovery-assessment-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryRecoveryContent
    content_hash: str
    read_at: str


class ProjectHistoryCompensationAssessmentRef(PetraModel):
    schema_name: Literal["petra.project-history-recovery-assessment-view"]
    schema_version: Literal["1.0.0"]
    event_id: str
    content_hash: str
    assessed_at: str
    assessment_state: Literal["eligible_for_preview"]
    authority: ProjectHistoryImpactAuthority


class ProjectHistoryCompensationTrustedState(PetraModel):
    zone: Literal["trusted"]
    review_state: Literal["human_accepted"]


class ProjectHistoryCompensationRetractionState(PetraModel):
    zone: Literal["quarantine"]
    review_state: Literal["human_rejected"]


class ProjectHistoryCompensationClaimOperation(PetraModel):
    operation_kind: Literal["retract_claim"]
    target_id: str
    base_revision: int = Field(ge=1)
    current_record_hash: str
    before: ProjectHistoryCompensationTrustedState
    after: ProjectHistoryCompensationRetractionState


class ProjectHistoryCompensationAssertionOperation(PetraModel):
    operation_kind: Literal["retract_assertion"]
    target_id: str
    base_revision: int = Field(ge=1)
    current_record_hash: str
    before: ProjectHistoryCompensationTrustedState
    after: ProjectHistoryCompensationRetractionState


class ProjectHistoryCompensationResult(PetraModel):
    semantic_key: Literal["scientific.claim", "scientific.assertion"]
    object_id: str
    prior_revision: int = Field(ge=1)
    resulting_revision: int = Field(ge=1)
    resulting_authority: ProjectHistoryCompensationRetractionState


class ProjectHistoryCompensationGrantRef(PetraModel):
    capability_grant_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectHistoryCompensationCommandStep(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    actor: ActorRef
    grant_ref: ProjectHistoryCompensationGrantRef
    composition_state: Literal["not_composed"]
    authority_recheck: Literal["required"]
    prerequisite: Literal[
        "confirmed_preview_and_required_input",
        "submitted_exact_change_set",
        "approved_exact_change_set",
    ]


class ProjectHistoryCompensationPreservation(PetraModel):
    prior_revisions: Literal["retained"]
    promotion_and_approval: Literal["retained"]
    selected_event: Literal["retained"]
    dependent_records: Literal["not_rewritten"]
    dependent_effects: Literal["not_automatically_reversed"]


class ProjectHistoryCompensationFreshness(PetraModel):
    issued_at: str
    valid_through: str
    binding_hash: str
    invalidation_causes: list[
        Literal[
            "expiry_reached",
            "project_authority_advanced",
            "promotion_state_changed",
            "target_revision_or_record_changed",
            "command_grant_changed",
        ]
    ] = Field(min_length=5, max_length=5)


class ProjectHistoryCompensationTargetSchema(PetraModel):
    schema_name: Literal["petra.change-set"]
    schema_version: Literal["1.1.0"]
    risk_tier: Literal["R2"]
    origin: Literal["direct_edit"]


class ProjectHistoryCompensationDecisionBoundary(PetraModel):
    preview: Literal["read_only"]
    change_set: Literal["not_created"]
    approval: Literal["not_recorded"]
    commands: Literal["not_composed_or_executed"]
    generic_undo: Literal["not_available"]
    multi_step_compensation: Literal["not_assessed"]


class ProjectHistoryCompensationPreviewContent(PetraModel):
    view_kind: Literal["single_change_set_compensation_preview"]
    authorization_scope: Literal["authenticated_project"]
    assessment_ref: ProjectHistoryCompensationAssessmentRef
    compensates_change_set: ProjectHistoryRecoveryChangeSetRef
    target_change_set_schema: ProjectHistoryCompensationTargetSchema
    operation_preview: list[
        ProjectHistoryCompensationClaimOperation
        | ProjectHistoryCompensationAssertionOperation
    ] = Field(min_length=2, max_length=2)
    impact_basis: ProjectHistoryRecoveryCausalBasis
    result_preview: list[ProjectHistoryCompensationResult] = Field(
        min_length=2, max_length=2
    )
    preservation: ProjectHistoryCompensationPreservation
    required_user_input: list[
        Literal["reason", "approval_rationale", "explicit_confirmation"]
    ] = Field(min_length=3, max_length=3)
    change_set_composition: Literal["deferred_until_confirmed_input"]
    command_sequence: list[ProjectHistoryCompensationCommandStep] = Field(
        min_length=3, max_length=3
    )
    freshness: ProjectHistoryCompensationFreshness
    decision_boundary: ProjectHistoryCompensationDecisionBoundary
    omissions: list[
        Literal[
            "user_reason_not_supplied",
            "approval_rationale_not_supplied",
            "command_envelopes_not_composed",
            "compensation_not_persisted",
            "compensation_not_executed",
            "dependent_effect_not_inferred_or_reversed",
            "historical_project_definition_not_interpreted",
        ]
    ] = Field(min_length=7, max_length=7)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_preview(self) -> ProjectHistoryCompensationPreviewContent:
        if [operation.operation_kind for operation in self.operation_preview] != [
            "retract_claim",
            "retract_assertion",
        ]:
            raise ValueError("compensation preview requires an ordered retraction pair")
        if [result.semantic_key for result in self.result_preview] != [
            "scientific.claim",
            "scientific.assertion",
        ] or any(
            result.resulting_revision != result.prior_revision + 1
            for result in self.result_preview
        ):
            raise ValueError("compensation preview must advance the exact target pair")
        expected_steps = [
            (1, "SubmitChangeSet", "confirmed_preview_and_required_input"),
            (2, "RecordApproval", "submitted_exact_change_set"),
            (3, "ApplyChangeSet", "approved_exact_change_set"),
        ]
        if [
            (step.position, step.command_name, step.prerequisite)
            for step in self.command_sequence
        ] != expected_steps:
            raise ValueError("compensation preview must preserve its command sequence")
        if self.required_user_input != [
            "reason",
            "approval_rationale",
            "explicit_confirmation",
        ]:
            raise ValueError("compensation preview must require exact human input")
        expected_omissions = {
            "user_reason_not_supplied",
            "approval_rationale_not_supplied",
            "command_envelopes_not_composed",
            "compensation_not_persisted",
            "compensation_not_executed",
            "dependent_effect_not_inferred_or_reversed",
            "historical_project_definition_not_interpreted",
        }
        if set(self.omissions) != expected_omissions:
            raise ValueError("compensation preview must preserve exact omissions")
        return self


class PetraProjectHistoryCompensationPreviewView(PetraModel):
    schema_name: Literal["petra.project-history-compensation-preview-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryCompensationPreviewContent
    content_hash: str
    read_at: str


class ProjectSourceDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str


class ProjectSourceWorkRef(PetraModel):
    work_id: str
    revision: int
    record_hash: str


class ProjectSourceWorkVersionRef(PetraModel):
    work_version_id: str
    revision: int
    record_hash: str


class ProjectSourceAuthorRef(PetraModel):
    author_id: str
    revision: int
    record_hash: str


class ProjectSourceManifestRef(PetraModel):
    artifact_manifest_id: str
    revision: Literal[1]
    record_hash: str


class ProjectSourceContent(PetraModel):
    binding_kind: Literal["scientific_work_version"]
    project_definition_ref: ProjectSourceDefinitionRef
    source_role: str
    work_ref: ProjectSourceWorkRef
    work_version_ref: ProjectSourceWorkVersionRef
    author_refs: list[ProjectSourceAuthorRef]
    artifact_manifest_ref: ProjectSourceManifestRef
    status: Literal["active", "excluded"]


class PetraProjectSource(PetraModel):
    schema_name: Literal["petra.project-source"]
    schema_version: Literal["1.0.0"]
    project_source_id: str
    revision: int
    project_id: str
    content: ProjectSourceContent
    content_hash: str
    added_by: ActorRef
    added_at: str


class ProjectSourceReplacementExcludedRef(PetraModel):
    project_source_id: str
    revision: int
    content_hash: str
    record_hash: str
    status: Literal["excluded"]


class ProjectSourceReplacementActiveRef(PetraModel):
    project_source_id: str
    revision: int
    content_hash: str
    record_hash: str
    status: Literal["active"]


class ProjectSourceReplacementExclusionReceiptRef(PetraModel):
    project_source_lifecycle_receipt_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectSourceReplacementContent(PetraModel):
    relationship: Literal["supersedes"]
    replacement_kind: Literal[
        "newer_source_version",
        "identity_resolution",
        "preferred_copy_changed",
        "project_role_replacement",
    ]
    replaced_source_ref: ProjectSourceReplacementExcludedRef
    replacement_source_ref: ProjectSourceReplacementActiveRef
    exclusion_receipt_ref: ProjectSourceReplacementExclusionReceiptRef
    rationale: str


class PetraProjectSourceReplacement(PetraModel):
    schema_name: Literal["petra.project-source-replacement"]
    schema_version: Literal["1.0.0"]
    project_source_replacement_id: str
    revision: Literal[1]
    project_id: str
    content: ProjectSourceReplacementContent
    content_hash: str
    recorded_by: ActorRef
    recorded_at: str


class ProjectSourceReplacementRetractionRef(PetraModel):
    project_source_replacement_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectSourceReplacementRetractionContent(PetraModel):
    replacement_ref: ProjectSourceReplacementRetractionRef
    reason: str


class PetraProjectSourceReplacementRetraction(PetraModel):
    schema_name: Literal["petra.project-source-replacement-retraction"]
    schema_version: Literal["1.0.0"]
    project_source_replacement_retraction_id: str
    revision: Literal[1]
    project_id: str
    content: ProjectSourceReplacementRetractionContent
    content_hash: str
    retracted_by: ActorRef
    retracted_at: str


class ProjectSourceViewExactRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectSourceViewBinding(PetraModel):
    binding_kind: Literal["scientific_work_version"]
    revision: int
    content_hash: str
    project_definition_ref: ProjectSourceViewExactRef
    source_role: str
    source_role_label: str
    status: Literal["active", "excluded"]
    added_at: str


class ProjectSourceViewPublishedDate(PetraModel):
    precision: Literal["year", "month", "day"]
    value: str


class ProjectSourceViewCreator(PetraModel):
    author_ref: ProjectSourceViewExactRef
    display_name: str
    author_kind: Literal["person", "organization", "consortium"]
    identity_status: Literal["resolved", "provisional", "disputed"]


class ProjectSourceViewIdentity(PetraModel):
    work_ref: ProjectSourceViewExactRef
    title: str
    work_kind: Literal[
        "journal_article",
        "conference_paper",
        "preprint",
        "thesis",
        "book",
        "chapter",
        "other",
    ]
    identity_status: Literal["resolved", "provisional", "disputed"]
    work_version_ref: ProjectSourceViewExactRef
    version_label: str
    publication_status: Literal[
        "preprint",
        "peer_reviewed",
        "accepted",
        "corrected",
        "retracted",
        "unknown",
    ]
    published_date: ProjectSourceViewPublishedDate | None = None
    creators: list[ProjectSourceViewCreator]


class ProjectSourceViewCopy(PetraModel):
    manifest_ref: ProjectSourceViewExactRef
    artifact_ref: ProjectSourceViewExactRef
    artifact_kind: Literal[
        "pdf",
        "html",
        "structured_text",
        "dataset",
        "code",
        "environment_lock",
        "run_output",
        "image",
        "export",
    ]
    media_type: str
    byte_size: int
    origin_kind: Literal["acquired", "user_supplied", "generated"]
    source_location: str
    original_filename: str | None = None
    availability: Literal["available"]
    integrity_status: Literal["verified", "verified_with_warnings"]
    recorded_at: str


class ProjectSourceViewPermissions(PetraModel):
    store_raw_bytes: bool
    parse: bool
    index: bool
    embed: bool
    send_selected_text_remotely: bool
    quote_publicly: bool
    redistribute_artifact: bool


class ProjectSourceViewRights(PetraModel):
    rights_ref: ProjectSourceViewExactRef
    license_status: Literal["known", "unknown", "restricted"]
    license_label: str
    access_basis: Literal[
        "open_license",
        "public_repository",
        "subscription",
        "user_supplied",
        "permission",
        "unknown",
    ]
    decision_status: Literal[
        "verified", "inferred", "unknown", "conflicting", "restricted"
    ]
    permissions: ProjectSourceViewPermissions
    conditions: list[
        Literal[
            "attribution", "notice", "noncommercial", "share_alike", "no_derivatives"
        ]
    ]
    policy_version: str


class ProjectSourceViewPreview(PetraModel):
    span_ref: ProjectSourceViewExactRef
    structural_block_ref: ProjectSourceViewExactRef
    heading: str
    locator: str
    text: str
    verification_status: Literal[
        "exact_text_and_geometry",
        "normalized",
        "visual_only",
        "manual_alignment",
        "unresolved",
    ]


class ProjectSourceViewRepresentation(PetraModel):
    extent: Literal["identity_only", "partial", "complete", "restricted"]
    extent_label: str
    document_ref: ProjectSourceViewExactRef | None = None
    source_format: (
        Literal["pdf", "html", "xml", "json", "plain_text", "code", "image", "other"]
        | None
    ) = None
    document_language: str | None = None
    quality_state: Literal["complete", "partial", "needs_ocr", "failed"] | None = None
    page_count: int
    block_count: int
    source_span_count: int
    preview: ProjectSourceViewPreview | None = None


class ProjectSourceViewDownstreamUse(PetraModel):
    claim_count: int
    assertion_count: int


class ProjectSourceViewContent(PetraModel):
    model_config = ConfigDict(
        strict=True,
        extra="forbid",
        frozen=True,
        serialize_by_alias=True,
    )

    binding: ProjectSourceViewBinding
    identity: ProjectSourceViewIdentity
    copy_value: ProjectSourceViewCopy = Field(alias="copy")
    rights: ProjectSourceViewRights
    representation: ProjectSourceViewRepresentation
    downstream_use: ProjectSourceViewDownstreamUse
    authority: ProjectShellAuthorityPosition


class PetraProjectSourceView(PetraModel):
    schema_name: Literal["petra.project-source-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    project_source_id: str
    content: ProjectSourceViewContent
    content_hash: str
    read_at: str


class ProjectSourceLifecycleSourceRef(PetraModel):
    project_source_id: str
    revision: int
    content_hash: str
    record_hash: str
    status: Literal["active", "excluded"]


class ProjectSourceLifecycleExactDependentRef(PetraModel):
    record_kind: Literal[
        "parsed_document",
        "structural_block",
        "source_span",
        "claim",
        "assertion",
        "work_unit",
        "review_session",
        "grounded_response",
    ]
    record_id: str
    revision: int
    record_hash: str
    posture: Literal["current", "historical", "current_and_historical"]
    effect: Literal["retained"]


class ProjectSourceLifecycleImpactGroup(PetraModel):
    group_kind: Literal[
        "parsed_documents",
        "structural_blocks",
        "source_spans",
        "claims",
        "assertions",
        "active_work",
        "open_reviews",
        "grounded_responses",
    ]
    total_count: int
    returned_count: int
    coverage: Literal["complete", "truncated"]
    refs: list[ProjectSourceLifecycleExactDependentRef]
    effect: Literal["retained"]


class ProjectSourceLifecycleImpact(PetraModel):
    scope: Literal["registered_direct_and_scientific_downstream"]
    groups: list[ProjectSourceLifecycleImpactGroup]
    limitations: list[str]


class ProjectSourceLifecyclePreviewTransition(PetraModel):
    state: Literal["preview_available"]
    from_status: Literal["active", "excluded"]
    to_status: Literal["active", "excluded"]
    effect: Literal["ordinary_new_use_disabled", "ordinary_new_use_restored"]
    reason: str


class ProjectSourceLifecycleNotApplicableTransition(PetraModel):
    state: Literal["not_applicable"]
    current_status: Literal["active", "excluded"]
    reason: str


class ProjectSourceLifecycleUnavailableTransition(PetraModel):
    state: Literal["unavailable"]
    reason: str


class ProjectSourceLifecycleRetentionItem(PetraModel):
    area: Literal[
        "project_source_history",
        "canonical_identity",
        "selected_work_version",
        "artifact_manifest",
        "local_artifact",
        "parsed_representation",
        "provenance",
    ]
    state: Literal["retained", "deletion_unavailable"]
    reason: str


class ProjectSourceLifecycleOperation(PetraModel):
    state: Literal["unavailable"]
    reason: str


class ProjectSourceLifecycleContent(PetraModel):
    requested_action: Literal[
        "exclude_project_source", "restore_project_source", "delete_local_copy"
    ]
    source_ref: ProjectSourceLifecycleSourceRef
    transition: (
        ProjectSourceLifecyclePreviewTransition
        | ProjectSourceLifecycleNotApplicableTransition
        | ProjectSourceLifecycleUnavailableTransition
    )
    impact: ProjectSourceLifecycleImpact
    retention: list[ProjectSourceLifecycleRetentionItem]
    operation: ProjectSourceLifecycleOperation
    authority: ProjectShellAuthorityPosition


class PetraProjectSourceLifecycleView(PetraModel):
    schema_name: Literal["petra.project-source-lifecycle-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    project_source_id: str
    content: ProjectSourceLifecycleContent
    content_hash: str
    read_at: str


class ReviewSessionHumanActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["human"]


class ReviewSessionDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str


class ReviewSessionObjectiveRef(PetraModel):
    objective_id: str
    revision: int
    content_hash: str


class ReviewSessionExactRecordRef(PetraModel):
    record_id: str
    revision: int
    record_hash: str


class ReviewSessionProjectSnapshot(PetraModel):
    event_position: int
    stream_revision: int
    captured_at: str


class ReviewSessionOrigin(PetraModel):
    origin_kind: Literal[
        "direct_edit",
        "evidence_extraction",
        "work_result",
        "interaction",
        "history_reversal",
    ]
    record_refs: list[str]
    summary: str


class ReviewSessionReturnContext(PetraModel):
    place: Literal[
        "brief",
        "sources",
        "review",
        "graph",
        "work",
        "petra",
        "composition",
        "history",
        "profile_tool",
    ]
    object_ref: str | None = None
    label: str


class ReviewSessionCandidateBinding(PetraModel):
    semantic_key: str
    binding_role: Literal["candidate", "relationship", "finding"]
    record_ref: ReviewSessionExactRecordRef


class ReviewSessionMember(PetraModel):
    review_member_id: str
    member_role: Literal["ordinary", "exception"]
    candidate_bindings: list[ReviewSessionCandidateBinding]


class ReviewSessionContent(PetraModel):
    title: str
    objective_summary: str
    objective_ref: ReviewSessionObjectiveRef | None = None
    lifecycle: Literal["open", "deferred", "completed"]
    responsible: ReviewSessionHumanActorRef
    snapshot: ReviewSessionProjectSnapshot
    origin: ReviewSessionOrigin
    return_context: ReviewSessionReturnContext
    members: list[ReviewSessionMember]


class PetraReviewSession(PetraModel):
    schema_name: Literal["petra.review-session"]
    schema_version: Literal["1.0.0"]
    review_session_id: str
    revision: int
    project_id: str
    project_definition_ref: ReviewSessionDefinitionRef
    content: ReviewSessionContent
    content_hash: str
    created_by: ReviewSessionHumanActorRef
    created_at: str
    updated_at: str


class ProjectReviewExactRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectReviewExactRecordRef(PetraModel):
    record_id: str
    revision: int
    record_hash: str


class ProjectReviewObjectiveSummary(PetraModel):
    objective_ref: ProjectReviewExactRef
    objective_kind: str
    statement: str


class ProjectReviewResponsible(PetraModel):
    actor_id: str
    display_name: str


class ProjectReviewOriginSummary(PetraModel):
    origin_kind: Literal[
        "direct_edit",
        "evidence_extraction",
        "work_result",
        "interaction",
        "history_reversal",
    ]
    record_refs: list[str]
    label: str
    detail: str


class ProjectReviewSessionSummary(PetraModel):
    revision: int
    content_hash: str
    title: str
    objective_summary: str
    objective: ProjectReviewObjectiveSummary | None = None
    status: Literal["needs_decision", "waiting", "completed"]
    status_label: str
    responsible: ProjectReviewResponsible
    project_definition_ref: ProjectReviewExactRef
    project_definition_label: str
    snapshot: ReviewSessionProjectSnapshot
    snapshot_state: Literal["current", "stale"]
    origin: ProjectReviewOriginSummary
    return_context: ReviewSessionReturnContext


class ProjectReviewScientificEvidencePayload(PetraModel):
    payload_kind: Literal["scientific_evidence_pair"]
    claim_ref: ProjectReviewExactRecordRef
    assertion_ref: ProjectReviewExactRecordRef
    claim_kind: Literal[
        "descriptive",
        "comparative",
        "causal",
        "mechanistic",
        "methodological",
        "theoretical",
        "measurement",
    ]
    assertion_predicate: Literal["ASSERTS"]
    scope_dimensions: list[str]


class ProjectReviewCandidateSummary(PetraModel):
    candidate_id: str
    revision_label: str
    kind_label: str
    current: str
    proposed: str
    difference: str
    origin_label: str
    origin_detail: str
    profile_payload: ProjectReviewScientificEvidencePayload


class ProjectReviewBasisItem(PetraModel):
    basis_id: str
    label: str
    relation: str
    extent: str
    detail: str
    project_source_id: str | None = None
    project_source_status: Literal["active", "excluded"] | None = None
    source_span_ref: ProjectReviewExactRecordRef | None = None


class ProjectReviewValidationSummary(PetraModel):
    state: Literal["passed", "needs_judgment", "blocked"]
    label: str
    detail: str
    recovery: str | None = None


class ProjectReviewChangeSetSummary(PetraModel):
    change_set_ref: ProjectReviewExactRef
    state: Literal["submitted", "approved", "rejected", "applied", "conflicted"]
    atomicity: str
    changes: list[str]
    protected: list[str]
    impact_summary: str
    approval_ref: ProjectReviewExactRecordRef | None = None


class ProjectReviewMember(PetraModel):
    review_member_id: str
    member_role: Literal["ordinary", "exception"]
    outcome: Literal[
        "awaiting_decision", "waiting", "applied", "rejected", "conflicted"
    ]
    candidate: ProjectReviewCandidateSummary
    basis: list[ProjectReviewBasisItem]
    validation: ProjectReviewValidationSummary
    consequences: list[str]
    change_sets: list[ProjectReviewChangeSetSummary]


class ProjectReviewAuthorityPosition(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectReviewViewContent(PetraModel):
    session: ProjectReviewSessionSummary
    members: list[ProjectReviewMember]
    authority: ProjectReviewAuthorityPosition


class PetraProjectReviewView(PetraModel):
    schema_name: Literal["petra.project-review-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    review_session_id: str
    content: ProjectReviewViewContent
    content_hash: str
    read_at: str


class ProjectRelationshipExactRef(PetraModel):
    record_id: str
    revision: int
    record_hash: str


class ProjectRelationshipGraphElementRef(PetraModel):
    element_id: str
    revision: int
    record_hash: str


class ProjectRelationshipDefinitionRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectRelationshipCheckpointRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectRelationshipQuery(PetraModel):
    request_hash: str
    query_kind: Literal["scientific_provenance_path"]
    question: str
    scope: str
    focus_ref: ProjectRelationshipExactRef
    objective_ref: ProjectRelationshipExactRef | None = None
    requested_position: Literal["current_authority"]
    maximum_depth: Literal[3]


class ProjectRelationshipProfile(PetraModel):
    project_definition_ref: ProjectRelationshipDefinitionRef
    label: str
    object_term: str
    relationship_term: str
    source_term: str


class ProjectRelationshipCapabilities(PetraModel):
    current: Literal["available"]
    working: Literal["unavailable"]
    historical: Literal["unavailable"]
    comparison: Literal["unavailable"]
    expansion: Literal["unavailable"]
    continuation: Literal["unavailable"]
    text_peer: Literal["available"]


class ProjectRelationshipAuthorityPosition(PetraModel):
    event_position: int
    stream_revision: int


class ProjectRelationshipProjectionPosition(PetraModel):
    checkpoint_ref: ProjectRelationshipCheckpointRef
    state: Literal["current", "catching_up", "blocked"]
    represented_event_position: int
    represented_stream_revision: int
    represented_target_sequence: int
    observed_event_position: int
    observed_stream_revision: int
    observed_target_sequence: int
    pending_records: int
    detail: str
    failure_code: str | None = None


class ProjectRelationshipPosition(PetraModel):
    isolation: Literal["repeatable_read_with_projection_guard"]
    authority: ProjectRelationshipAuthorityPosition
    projection: ProjectRelationshipProjectionPosition


class ProjectRelationshipSourceDestination(PetraModel):
    project_source_id: str
    status: Literal["active", "excluded"]
    label: str


class ProjectRelationshipNode(PetraModel):
    node_ref: ProjectRelationshipExactRef
    object_kind: Literal["work", "work_version", "claim", "source_span", "artifact"]
    label: str
    summary: str
    basis: str
    layer: Literal["current"]
    lifecycle: Literal["represented"]
    source_destination: ProjectRelationshipSourceDestination | None = None


class ProjectRelationshipEdge(PetraModel):
    relationship_ref: ProjectRelationshipGraphElementRef
    predicate: Literal["VERSION_OF", "ASSERTS", "GROUNDED_IN", "LOCATED_IN"]
    relation_class: Literal["structural", "provenance", "representation"]
    source_id: str
    target_id: str
    direction: Literal["outgoing"]
    label: str
    summary: str
    basis: str
    layer: Literal["current"]
    assertion_id: str | None = None


class ProjectRelationshipPathStep(PetraModel):
    position: int
    from_node_id: str
    relationship_id: str
    to_node_id: str
    repeated_member: bool


class ProjectRelationshipPath(PetraModel):
    path_kind: Literal["scientific_provenance"]
    state: Literal["complete_for_selected_relationship"]
    ordering_rationale: str
    steps: list[ProjectRelationshipPathStep]


class ProjectRelationshipCompleteness(PetraModel):
    state: Literal["complete_for_selected_relationship"]
    scope: str
    returned_nodes: int
    returned_relationships: int
    known_path_nodes: int
    known_path_relationships: int
    filtered_members: Literal[0]
    hidden_working_members: Literal[0]
    traversal_limit: Literal[3]
    omissions: list[str]


class ProjectRelationshipViewContent(PetraModel):
    query: ProjectRelationshipQuery
    profile: ProjectRelationshipProfile
    capabilities: ProjectRelationshipCapabilities
    position: ProjectRelationshipPosition
    layer: Literal["current"]
    nodes: list[ProjectRelationshipNode]
    relationships: list[ProjectRelationshipEdge]
    path: ProjectRelationshipPath
    completeness: ProjectRelationshipCompleteness
    limitations: list[str]


class PetraProjectRelationshipView(PetraModel):
    schema_name: Literal["petra.project-relationship-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectRelationshipViewContent
    content_hash: str
    read_at: str


class ProjectObjectRequestedRef(PetraModel):
    semantic_key: str
    object_id: str
    revision: int | None = None


class ProjectObjectExactRef(PetraModel):
    semantic_key: str
    object_id: str
    revision: int
    record_hash: str


class ProjectObjectLocationRequest(PetraModel):
    object_ref: ProjectObjectRequestedRef
    task_intent: Literal[
        "orient",
        "inspect",
        "trace",
        "review",
        "continue_work",
        "view_history",
    ]


class ProjectObjectLocationDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    definition_family: str


class ProjectObjectDescriptor(PetraModel):
    semantic_key: str
    generic_family: Literal[
        "focus",
        "finding",
        "reference",
        "relationship",
        "task",
        "output",
        "other",
    ]
    label: str
    summary: str
    lifecycle_state: str


class ProjectObjectResolvedLocation(PetraModel):
    state: Literal["current", "historical", "superseded"]
    requested_ref: ProjectObjectRequestedRef
    resolved_ref: ProjectObjectExactRef
    current_ref: ProjectObjectExactRef
    descriptor: ProjectObjectDescriptor
    parent_ref: ProjectObjectExactRef | None = None
    replacement_chain: list[ProjectObjectExactRef]


class ProjectObjectLocationFailure(PetraModel):
    code: str
    message: str


class ProjectObjectUnavailableLocation(PetraModel):
    state: Literal["missing", "unauthorized", "unsupported"]
    requested_ref: ProjectObjectRequestedRef
    failure: ProjectObjectLocationFailure


class ProjectObjectDestination(PetraModel):
    role: Literal[
        "brief",
        "sources",
        "review",
        "graph",
        "work",
        "petra",
        "composition",
        "history",
        "settings",
        "profile_tool",
    ]
    purpose: str
    target_ref: ProjectObjectExactRef | None = None
    profile_tool_key: str | None = None


class ProjectObjectLocationContext(PetraModel):
    details_allowed: bool
    petra_allowed: bool


class ProjectObjectLocationContent(PetraModel):
    request: ProjectObjectLocationRequest
    definition_ref: ProjectObjectLocationDefinitionRef
    resolution: ProjectObjectResolvedLocation | ProjectObjectUnavailableLocation
    primary_destination: ProjectObjectDestination
    alternate_destinations: list[ProjectObjectDestination]
    fallback_destination: ProjectObjectDestination | None = None
    context: ProjectObjectLocationContext
    authority: ProjectShellAuthorityPosition
    projection: ProjectShellProjectionSummary


class PetraProjectObjectLocationView(PetraModel):
    schema_name: Literal["petra.project-object-location-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectObjectLocationContent
    content_hash: str
    read_at: str


class ProjectShellAvailablePlaceSummary(PetraModel):
    role: Literal[
        "brief",
        "sources",
        "review",
        "graph",
        "work",
        "petra",
        "composition",
        "history",
        "settings",
        "profile_tool",
    ]
    coverage: Literal["complete", "partial"]
    label: str
    summary: str
    item_count: int | None = None
    attention_count: int
    limitation: str | None = None


class ProjectShellUnavailablePlaceSummary(PetraModel):
    role: Literal[
        "brief",
        "sources",
        "review",
        "graph",
        "work",
        "petra",
        "composition",
        "history",
        "settings",
        "profile_tool",
    ]
    coverage: Literal["unavailable"]
    label: str
    summary: str
    attention_count: Literal[0]
    limitation: str


class ProjectShellContentV110(PetraModel):
    project: ProjectShellProjectSummary
    definition: ProjectShellDefinitionSummary
    current_objective: ProjectShellObjectiveSummary | None = None
    authority: ProjectShellAuthorityPosition
    projection: ProjectShellProjectionSummary
    attention: list[ProjectShellAttentionItem]
    place_summaries: list[
        ProjectShellAvailablePlaceSummary | ProjectShellUnavailablePlaceSummary
    ]
    selection: ProjectObjectLocationContent | None = None


class PetraProjectShellViewV110(PetraModel):
    schema_name: Literal["petra.project-shell-view"]
    schema_version: Literal["1.1.0"]
    project_id: str
    content: ProjectShellContentV110
    content_hash: str
    read_at: str


ProjectControlState = Literal[
    "effective",
    "inherited",
    "expired",
    "observed_only",
    "unavailable",
    "unknown",
    "unsupported",
    "conflicting",
]


class ProjectControlExactRecordRef(PetraModel):
    record_id: str
    revision: int
    record_hash: str


class ProjectControlDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectControlAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectControlScope(PetraModel):
    scope_kind: Literal["project"]
    project_id: str


class ProjectControlFreshness(PetraModel):
    state: Literal["current", "stale", "unknown"]
    observed_at: str
    limitation: str | None = None


class ProjectControlUnsupportedOperation(PetraModel):
    state: Literal["unsupported"]
    reason: str


class ProjectControlAvailableOperation(PetraModel):
    state: Literal["available"]
    command_name: str
    schema_name: str
    schema_version: str
    expected_revision: int


ProjectControlOperation = (
    ProjectControlUnsupportedOperation | ProjectControlAvailableOperation
)


class ProjectControlRetainedHistory(PetraModel):
    state: Literal["retained"]
    record_ref: ProjectControlExactRecordRef
    limitation: str


class ProjectControlUnavailableHistory(PetraModel):
    state: Literal["unavailable"]
    limitation: str


ProjectControlHistory = ProjectControlRetainedHistory | ProjectControlUnavailableHistory


class ProjectControlOrigin(PetraModel):
    owner_kind: Literal[
        "project",
        "capability_authority",
        "routing_policy",
        "budget_profile",
        "review_policy",
    ]
    record_ref: ProjectControlExactRecordRef


class ProjectControlMaterialValue(PetraModel):
    key: str
    label: str
    meaning: str
    state: ProjectControlState
    value: str | bool | int | list[str]
    origin: ProjectControlOrigin
    effective_from: str | None = None
    expires_at: str | None = None
    limitation: str | None = None
    operation: ProjectControlOperation


class ProjectControlSection(PetraModel):
    state: ProjectControlState
    label: str
    summary: str
    owner_kind: Literal[
        "project",
        "capability_authority",
        "routing_policy",
        "budget_profile",
        "review_policy",
    ]
    scope: ProjectControlScope
    freshness: ProjectControlFreshness
    values: list[ProjectControlMaterialValue]
    history: ProjectControlHistory
    operation: ProjectControlOperation


class ProjectControlSections(PetraModel):
    privacy: ProjectControlSection
    capability: ProjectControlSection
    model_routing: ProjectControlSection
    work_budget: ProjectControlSection
    review_policy: ProjectControlSection


class ProjectEffectiveControlsContent(PetraModel):
    project_ref: ProjectControlExactRecordRef
    project_definition_ref: ProjectControlDefinitionRef
    authority: ProjectControlAuthority
    sections: ProjectControlSections


class PetraProjectEffectiveControlsView(PetraModel):
    schema_name: Literal["petra.project-effective-controls-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectEffectiveControlsContent
    content_hash: str
    read_at: str


class PetraAuthor(PetraModel):
    schema_name: Literal["petra.author"]
    schema_version: Literal["1.0.0"]
    author_id: str
    revision: int
    author_kind: Literal["person", "organization", "consortium"]
    display_name: str
    identity_status: Literal["resolved", "provisional", "disputed"]
    created_by: ActorRef
    created_at: str
    updated_at: str


class AuthorCredit(PetraModel):
    author_id: str
    position: int
    credit_role: Literal["author", "editor"]
    corresponding: bool | None = None


class PetraWork(PetraModel):
    schema_name: Literal["petra.work"]
    schema_version: Literal["1.0.0"]
    work_id: str
    revision: int
    title: str
    work_kind: Literal[
        "journal_article",
        "conference_paper",
        "preprint",
        "thesis",
        "book",
        "chapter",
        "other",
    ]
    identity_status: Literal["resolved", "provisional", "disputed"]
    author_credits: list[AuthorCredit]
    created_by: ActorRef
    created_at: str
    updated_at: str


class PublicationYear(PetraModel):
    precision: Literal["year"]
    value: str


class PublicationMonth(PetraModel):
    precision: Literal["month"]
    value: str


class PublicationDay(PetraModel):
    precision: Literal["day"]
    value: str


class MetadataSource(PetraModel):
    source_kind: Literal["registry", "repository", "publisher", "provider", "user"]
    source_name: str
    source_record_id: str | None = None


class PetraWorkVersion(PetraModel):
    schema_name: Literal["petra.work-version"]
    schema_version: Literal["1.0.0"]
    work_version_id: str
    revision: int
    work_id: str
    version_label: str
    publication_status: Literal[
        "preprint",
        "peer_reviewed",
        "accepted",
        "corrected",
        "retracted",
        "unknown",
    ]
    published_date: PublicationYear | PublicationMonth | PublicationDay | None = None
    metadata_source: MetadataSource
    metadata_retrieved_at: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class WorkSubject(PetraModel):
    subject_kind: Literal["work"]
    work_id: str


class WorkVersionSubject(PetraModel):
    subject_kind: Literal["work_version"]
    work_version_id: str


class AuthorSubject(PetraModel):
    subject_kind: Literal["author"]
    author_id: str


class PetraExternalIdentifier(PetraModel):
    schema_name: Literal["petra.external-identifier"]
    schema_version: Literal["1.0.0"]
    external_identifier_id: str
    revision: int
    subject: WorkSubject | WorkVersionSubject | AuthorSubject
    namespace: Literal[
        "doi",
        "openalex_work",
        "semantic_scholar_work",
        "acl_anthology",
        "arxiv",
        "pmid",
        "isbn",
        "orcid",
        "openalex_author",
        "repository_url",
    ]
    normalized_value: str
    source_name: str
    verification_status: Literal[
        "verified", "source_reported", "unverified", "disputed"
    ]
    observed_at: str
    created_by: ActorRef
    created_at: str


class PetraArtifact(PetraModel):
    schema_name: Literal["petra.artifact"]
    schema_version: Literal["1.0.0"]
    artifact_id: str
    revision: Literal[1]
    artifact_kind: Literal[
        "pdf",
        "html",
        "structured_text",
        "dataset",
        "code",
        "environment_lock",
        "run_output",
        "image",
        "export",
    ]
    media_type: str
    content_hash: str
    byte_size: int
    created_by: ActorRef
    created_at: str


class ResponseMetadata(PetraModel):
    status_code: int | None = None
    content_type: str | None = None
    content_length: int | None = None
    etag: str | None = None
    last_modified: str | None = None


class AcquiredOrigin(PetraModel):
    origin_kind: Literal["acquired"]
    work_version_id: str
    source_connector: str
    connector_version: str
    retrieval_url: str
    retrieved_at: str
    response_metadata: ResponseMetadata


class UserSuppliedOrigin(PetraModel):
    origin_kind: Literal["user_supplied"]
    supplied_by: ActorRef
    supplied_at: str
    original_filename: str
    work_version_id: str | None = None


class GeneratedOrigin(PetraModel):
    origin_kind: Literal["generated"]
    generator_name: str
    generator_version: str
    generated_at: str
    input_artifact_ids: list[str]


class StorageRef(PetraModel):
    storage_kind: Literal["content_addressed_object"]
    store_name: str
    object_key: str
    content_hash: str
    availability: Literal["available"]
    verified_at: str


class IntegrityProblem(PetraModel):
    code: str
    severity: Literal["warning"]
    message: str


class VerifiedIntegrity(PetraModel):
    status: Literal["verified"]
    checked_at: str
    problems: list[IntegrityProblem]


class WarningIntegrity(PetraModel):
    status: Literal["verified_with_warnings"]
    checked_at: str
    problems: list[IntegrityProblem]


class PetraArtifactManifest(PetraModel):
    schema_name: Literal["petra.artifact-manifest"]
    schema_version: Literal["1.0.0"]
    artifact_manifest_id: str
    revision: Literal[1]
    artifact_id: str
    rights_decision_id: str
    origin: AcquiredOrigin | UserSuppliedOrigin | GeneratedOrigin
    storage_ref: StorageRef
    integrity: VerifiedIntegrity | WarningIntegrity
    recorded_by: ActorRef
    recorded_at: str


class ObservedLicense(PetraModel):
    identifier: str | None = None
    url: str | None = None
    statement: str | None = None
    source: Literal[
        "artifact",
        "license_file",
        "repository_record",
        "publisher_record",
        "user_declaration",
        "permission_record",
    ]


class RightsPermissions(PetraModel):
    store_raw_bytes: bool
    parse: bool
    index: bool
    embed: bool
    send_selected_text_remotely: bool
    quote_publicly: bool
    redistribute_artifact: bool


class PetraRightsDecision(PetraModel):
    schema_name: Literal["petra.rights-decision"]
    schema_version: Literal["1.0.0"]
    rights_decision_id: str
    revision: Literal[1]
    artifact_manifest_id: str
    source_location: str
    license_status: Literal["known", "unknown", "restricted"]
    observed_license: ObservedLicense | None = None
    access_basis: Literal[
        "open_license",
        "public_repository",
        "subscription",
        "user_supplied",
        "permission",
        "unknown",
    ]
    decision_status: Literal[
        "verified", "inferred", "unknown", "conflicting", "restricted"
    ]
    permissions: RightsPermissions
    conditions: list[
        Literal[
            "attribution",
            "notice",
            "noncommercial",
            "share_alike",
            "no_derivatives",
        ]
    ]
    required_notices: list[str]
    authorization_reference: str | None = None
    decision_maker: ActorRef
    rationale: str
    observed_at: str
    policy_version: str
    created_at: str


class VersionedComponent(PetraModel):
    name: str
    version: str


class ParserProvenance(PetraModel):
    parser: VersionedComponent
    configuration_hash: str
    component_models: list[VersionedComponent] | None = None
    started_at: str
    completed_at: str


class ParsedPage(PetraModel):
    page_number: int
    page_label: str | None = None
    width: float
    height: float
    unit: Literal["pt", "px", "mm"]
    coordinate_origin: Literal["top_left", "bottom_left"]
    text_layer_state: Literal["present", "absent", "unusable", "unknown"]
    parse_state: Literal["complete", "partial", "needs_ocr", "failed"]
    quality_score: float | None = None


class ParseDiagnostic(PetraModel):
    code: str
    severity: Literal["info", "warning", "error"]
    message: str
    page_number: int | None = None


class PetraParsedDocument(PetraModel):
    schema_name: Literal["petra.parsed-document"]
    schema_version: Literal["1.0.0"]
    parsed_document_id: str
    revision: Literal[1]
    source_artifact_id: str
    source_artifact_content_hash: str
    parser_output_artifact_id: str
    work_version_id: str
    parser_run_id: str
    source_format: Literal[
        "pdf", "html", "xml", "json", "plain_text", "code", "image", "other"
    ]
    document_language: str | None = None
    adapter: VersionedComponent
    normalization_version: str
    parser_provenance: ParserProvenance
    quality_state: Literal["complete", "partial", "needs_ocr", "failed"]
    pages: list[ParsedPage]
    block_ids: list[str]
    diagnostics: list[ParseDiagnostic]
    created_by: ActorRef
    created_at: str


class BlockBoundingBox(PetraModel):
    x: float
    y: float
    width: float
    height: float


class BlockPageLocation(PetraModel):
    page_number: int
    bounding_boxes: list[BlockBoundingBox]


class TextBlockContent(PetraModel):
    content_kind: Literal["text"]
    text: str
    content_hash: str


class StructuredBlockContent(PetraModel):
    content_kind: Literal["structured_artifact"]
    structured_artifact_id: str
    content_hash: str


class VisualBlockContent(PetraModel):
    content_kind: Literal["visual_only"]


class PetraStructuralBlock(PetraModel):
    schema_name: Literal["petra.structural-block"]
    schema_version: Literal["1.0.0"]
    structural_block_id: str
    revision: Literal[1]
    parsed_document_id: str
    block_kind: Literal[
        "document_title",
        "heading",
        "paragraph",
        "sentence",
        "list",
        "list_item",
        "footnote",
        "reference",
        "formula",
        "table",
        "table_row",
        "table_cell",
        "figure",
        "caption",
        "code_block",
        "other",
    ]
    content_layer: Literal["source_native", "ocr", "parser_derived", "visual_only"]
    reading_order: int
    structural_path: list[str]
    parent_block_id: str | None = None
    child_block_ids: list[str]
    previous_block_id: str | None = None
    next_block_id: str | None = None
    page_locations: list[BlockPageLocation]
    content: TextBlockContent | StructuredBlockContent | VisualBlockContent
    source_span_ids: list[str]
    created_at: str


class SpanTextQuote(PetraModel):
    exact_text: str | None = None
    selected_text_hash: str
    prefix: str | None = None
    suffix: str | None = None
    start_codepoint: int
    end_codepoint: int
    normalization_version: str


class SpanPoint(PetraModel):
    x: float
    y: float


class SpanBoundingBox(PetraModel):
    region_kind: Literal["bounding_box"]
    x: float
    y: float
    width: float
    height: float


class SpanPolygon(PetraModel):
    region_kind: Literal["polygon"]
    points: list[SpanPoint]


class SpanPageRegion(PetraModel):
    page_number: int
    page_width: float
    page_height: float
    unit: Literal["pt", "px", "mm"]
    coordinate_origin: Literal["top_left", "bottom_left"]
    regions: list[SpanBoundingBox | SpanPolygon]


class SpanSectionPath(PetraModel):
    segments: list[str]


class SpanJsonPointer(PetraModel):
    pointer: str


class SpanLineRange(PetraModel):
    start_line: int
    end_line: int


class TextQuoteSelector(PetraModel):
    selector_type: Literal["text_quote"]
    quote: SpanTextQuote


class PageRegionSelector(PetraModel):
    selector_type: Literal["page_region"]
    page_region: SpanPageRegion


class SectionPathSelector(PetraModel):
    selector_type: Literal["section_path"]
    section_path: SpanSectionPath


class JsonPointerSelector(PetraModel):
    selector_type: Literal["json_pointer"]
    json_pointer: SpanJsonPointer


class LineRangeSelector(PetraModel):
    selector_type: Literal["line_range"]
    line_range: SpanLineRange


class TextQuoteComponent(PetraModel):
    component_kind: Literal["text_quote"]
    quote: SpanTextQuote


class PageRegionComponent(PetraModel):
    component_kind: Literal["page_region"]
    page_region: SpanPageRegion


class SectionPathComponent(PetraModel):
    component_kind: Literal["section_path"]
    section_path: SpanSectionPath


class JsonPointerComponent(PetraModel):
    component_kind: Literal["json_pointer"]
    json_pointer: SpanJsonPointer


class LineRangeComponent(PetraModel):
    component_kind: Literal["line_range"]
    line_range: SpanLineRange


class CompoundSelector(PetraModel):
    selector_type: Literal["compound"]
    components: list[
        TextQuoteComponent
        | PageRegionComponent
        | SectionPathComponent
        | JsonPointerComponent
        | LineRangeComponent
    ]


class SpanExtraction(PetraModel):
    method: Literal[
        "embedded_text",
        "ocr",
        "structured_source",
        "parser_alignment",
        "manual_selection",
        "visual_region",
    ]
    method_version: str
    normalization_version: str


class SpanVerification(PetraModel):
    status: Literal[
        "exact_text_and_geometry",
        "normalized",
        "visual_only",
        "manual_alignment",
        "unresolved",
    ]
    verified_at: str
    transformations: list[str]


class PetraSourceSpan(PetraModel):
    schema_name: Literal["petra.source-span"]
    schema_version: Literal["1.0.0"]
    source_span_id: str
    revision: Literal[1]
    artifact_id: str
    artifact_content_hash: str
    parsed_document_id: str
    parser_run_id: str
    structural_block_id: str
    selector_schema_version: Literal["1.0.0"]
    selector: (
        TextQuoteSelector
        | PageRegionSelector
        | SectionPathSelector
        | JsonPointerSelector
        | LineRangeSelector
        | CompoundSelector
    )
    extraction: SpanExtraction
    verification: SpanVerification
    created_by: ActorRef
    created_at: str


class PetraDocumentParseBundle(PetraModel):
    schema_name: Literal["petra.document-parse-bundle"]
    schema_version: Literal["1.0.0"]
    document_parse_bundle_id: str
    revision: Literal[1]
    source_artifact_manifest_id: str
    rights_decision_id: str
    source_scope: Literal["full_text", "abstract_only"]
    document: PetraParsedDocument
    blocks: list[PetraStructuralBlock]
    spans: list[PetraSourceSpan]
    diagnostics: list[ParseDiagnostic]
    created_at: str


ScopeDimensionName = Literal[
    "population",
    "language",
    "task",
    "model_family",
    "dataset",
    "intervention_or_exposure",
    "comparator",
    "outcome",
    "setting",
    "temporal_boundary",
]


class ScientificScopeDimension(PetraModel):
    description: str
    entity_refs: list[str]


class ScientificScope(PetraModel):
    population: ScientificScopeDimension | None = None
    language: ScientificScopeDimension | None = None
    task: ScientificScopeDimension | None = None
    model_family: ScientificScopeDimension | None = None
    dataset: ScientificScopeDimension | None = None
    intervention_or_exposure: ScientificScopeDimension | None = None
    comparator: ScientificScopeDimension | None = None
    outcome: ScientificScopeDimension | None = None
    setting: ScientificScopeDimension | None = None
    temporal_boundary: ScientificScopeDimension | None = None
    unreported_dimensions: list[ScopeDimensionName]
    notes: str | None = None


class HumanApprovalBasis(PetraModel):
    approval_kind: Literal["human"]
    approval_id: str
    approved_by: ActorRef


class PolicyApprovalBasis(PetraModel):
    approval_kind: Literal["review_policy"]
    review_policy_id: str
    approval_id: str
    calibration_ref: str
    audit_ref: str | None = None


class PromotionBasis(PetraModel):
    change_set_id: str
    approval_basis: HumanApprovalBasis | PolicyApprovalBasis
    applied_at: str


class QuarantineAuthority(PetraModel):
    zone: Literal["quarantine"]
    review_state: Literal["unreviewed", "machine_checked", "human_rejected", "disputed"]


class TrustedAuthority(PetraModel):
    zone: Literal["trusted"]
    review_state: Literal["machine_checked", "human_accepted", "disputed"]
    promotion: PromotionBasis


class PersonalAuthority(PetraModel):
    zone: Literal["personal"]
    review_state: Literal["unreviewed", "human_accepted", "disputed"]
    recorded_by: ActorRef


class ClaimDerivation(PetraModel):
    derivation_kind: Literal[
        "deterministic_mapping", "model_extraction", "human_extraction"
    ]
    derivation_ref: str


class ClaimValidatorResult(PetraModel):
    validator_name: str
    validator_version: str
    outcome: Literal["pass", "warning", "fail"]
    code: str
    message: str | None = None


class SourceClaimBasis(PetraModel):
    basis_kind: Literal["source"]
    work_version_id: str
    source_scope: Literal["full_text", "abstract_only"]
    detail_level: Literal["broad", "detailed"]
    source_span_ids: list[str]
    source_stance: Literal["states", "hypothesizes", "reports", "qualifies", "rejects"]
    attribution: str
    modality: Literal["asserted", "hedged", "conditional", "speculative"]
    negated: bool
    uncertainty: str | None = None
    derivation: ClaimDerivation
    validator_results: list[ClaimValidatorResult]
    extraction_confidence: float | None = None
    proposed_by: ActorRef
    proposed_at: str


class SynthesisClaimBasis(PetraModel):
    basis_kind: Literal["synthesis"]
    basis_claim_ids: list[str]
    basis_assertion_ids: list[str]
    composition_kind: Literal["human", "model_assisted", "deterministic"]
    composition_ref: str
    composed_by: ActorRef
    composed_at: str


class ResearcherClaimBasis(PetraModel):
    basis_kind: Literal["researcher"]
    rationale: str
    proposed_by: ActorRef
    proposed_at: str


class PetraClaim(PetraModel):
    schema_name: Literal["petra.claim"]
    schema_version: Literal["1.0.0"]
    claim_id: str
    revision: int
    canonical_text: str
    claim_kind: Literal[
        "descriptive",
        "comparative",
        "causal",
        "mechanistic",
        "methodological",
        "theoretical",
        "measurement",
    ]
    normalization_status: Literal["verbatim", "normalized", "composed"]
    scope: ScientificScope
    basis: SourceClaimBasis | SynthesisClaimBasis | ResearcherClaimBasis
    authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority
    supersedes_claim_id: str | None = None
    created_by: ActorRef
    created_at: str


class EntityAssertionObject(PetraModel):
    object_kind: Literal["entity"]
    entity_id: str


class StringAssertionObject(PetraModel):
    object_kind: Literal["string"]
    value: str


class BooleanAssertionObject(PetraModel):
    object_kind: Literal["boolean"]
    value: bool


class IntegerAssertionObject(PetraModel):
    object_kind: Literal["integer"]
    value: int


class DecimalAssertionObject(PetraModel):
    object_kind: Literal["decimal"]
    value: str


class TimestampAssertionObject(PetraModel):
    object_kind: Literal["timestamp"]
    value: str


class SourceSpanProvenance(PetraModel):
    provenance_kind: Literal["source_span"]
    source_span_id: str


class StructuredFieldProvenance(PetraModel):
    provenance_kind: Literal["structured_field"]
    artifact_id: str
    json_pointer: str
    field_hash: str


class BasisAssertionProvenance(PetraModel):
    provenance_kind: Literal["basis_assertion"]
    assertion_id: str


class ActorAssertionProvenance(PetraModel):
    provenance_kind: Literal["actor"]
    actor: ActorRef


class RecordAssertionProvenance(PetraModel):
    provenance_kind: Literal["record"]
    record_id: str
    role: Literal[
        "derivation", "input", "output", "model_call", "run", "result", "analysis"
    ]


class ScopeComparison(PetraModel):
    relation: Literal[
        "aligned", "overlapping", "narrower", "broader", "disjoint", "unknown"
    ]
    rationale: str


class AssertionValidTime(PetraModel):
    valid_from: str | None = None
    valid_to: str | None = None


AssertionPredicate = Literal[
    "VERSION_OF",
    "REPRESENTED_BY",
    "LOCATED_IN",
    "CITES",
    "CITES_AS_BACKGROUND",
    "ASSERTS",
    "ADDRESSES",
    "SUPPORTS",
    "CONTRADICTS",
    "QUALIFIES",
    "ADOPTS",
    "DIRECTLY_TESTS",
    "EXTENDS",
    "REFRAMES",
    "CHALLENGES",
    "CRITIQUES_METHOD",
    "ASSUMES",
    "PREDICTS",
    "RIVAL_OF",
    "TESTS",
    "IMPLEMENTS",
    "USES",
    "PRODUCED",
    "ANALYZES",
    "EVALUATES",
    "GOVERNS",
    "INTERPRETS",
    "COMPOSED_FROM",
    "GROUNDS",
    "RENDERS",
    "REPLICATES",
    "FAILS_TO_REPLICATE",
    "INVESTIGATES",
    "TESTS_CAUSE",
    "CORRECTS",
    "DEPENDS_ON",
    "SUPERSEDES",
]


class PetraAssertion(PetraModel):
    schema_name: Literal["petra.assertion"]
    schema_version: Literal["1.0.0"]
    assertion_id: str
    revision: int
    subject_id: str
    predicate: AssertionPredicate
    object: (
        EntityAssertionObject
        | StringAssertionObject
        | BooleanAssertionObject
        | IntegerAssertionObject
        | DecimalAssertionObject
        | TimestampAssertionObject
    )
    assertion_kind: Literal[
        "source_native",
        "source_stated",
        "deterministic_derivation",
        "model_inference",
        "human_judgment",
        "experimental_observation",
        "synthesis",
    ]
    authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority
    provenance_refs: list[
        SourceSpanProvenance
        | StructuredFieldProvenance
        | BasisAssertionProvenance
        | ActorAssertionProvenance
        | RecordAssertionProvenance
    ]
    scope: ScientificScope
    scope_comparison: ScopeComparison | None = None
    rationale: str
    occurred_at: str | None = None
    recorded_at: str
    valid_time: AssertionValidTime | None = None
    supersedes_assertion_id: str | None = None
    created_by: ActorRef


class EvidenceProposalSourceIdentity(PetraModel):
    document_parse_bundle_id: str
    parsed_document_id: str
    source_artifact_id: str
    source_artifact_content_hash: str
    work_version_id: str
    source_scope: Literal["full_text", "abstract_only"]


class DeterministicEvidenceExtraction(PetraModel):
    extraction_kind: Literal["deterministic_mapping"]
    extraction_run_id: str
    extractor: VersionedComponent
    recipe_hash: str
    started_at: str
    completed_at: str


class EvidenceContextPacketRef(PetraModel):
    context_packet_id: str
    content_hash: str


class ModelEvidenceExtraction(PetraModel):
    extraction_kind: Literal["model_extraction"]
    extraction_run_id: str
    extractor: VersionedComponent
    recipe_hash: str
    model_request_id: str
    model_call_id: str
    model_deployment: str
    prompt_profile: VersionedComponent
    prompt_hash: str
    parameters_hash: str
    context_packet_ref: EvidenceContextPacketRef
    started_at: str
    completed_at: str


class EvidenceProposalSourceQuote(PetraModel):
    exact_text: str
    selected_text_hash: str
    source_span_ids: list[str]


class EvidenceProposalDiagnostic(PetraModel):
    code: str
    severity: Literal["info", "warning", "error"]
    message: str
    candidate_id: str | None = None


class EvidenceProposalCandidate(PetraModel):
    candidate_id: str
    proposal_role: Literal[
        "primary",
        "qualification",
        "limitation",
        "method",
        "result",
        "negative_control",
        "other",
    ]
    source_quote: EvidenceProposalSourceQuote
    claim: PetraClaim
    assertion: PetraAssertion
    warnings: list[EvidenceProposalDiagnostic]


class EvidenceProposalContent(PetraModel):
    project_id: str
    source: EvidenceProposalSourceIdentity
    extraction: DeterministicEvidenceExtraction | ModelEvidenceExtraction
    candidates: list[EvidenceProposalCandidate]
    diagnostics: list[EvidenceProposalDiagnostic]


class PetraEvidenceProposalBundle(PetraModel):
    schema_name: Literal["petra.evidence-proposal-bundle"]
    schema_version: Literal["1.0.0"]
    evidence_proposal_bundle_id: str
    revision: Literal[1]
    content: EvidenceProposalContent
    content_hash: str
    created_by: ActorRef
    created_at: str


class QuarantineChangeState(PetraModel):
    zone: Literal["quarantine"]
    review_state: Literal["unreviewed", "machine_checked"]


class HumanTrustedChangeState(PetraModel):
    zone: Literal["trusted"]
    review_state: Literal["human_accepted"]


class PromoteClaimOperation(PetraModel):
    operation_kind: Literal["promote_claim"]
    target_id: str
    base_revision: int
    before: QuarantineChangeState
    after: HumanTrustedChangeState


class PromoteAssertionOperation(PetraModel):
    operation_kind: Literal["promote_assertion"]
    target_id: str
    base_revision: int
    before: QuarantineChangeState
    after: HumanTrustedChangeState


class ChangeSetImpactPreview(PetraModel):
    affected_object_ids: list[str]
    downstream_object_ids: list[str]
    summary: str
    generated_at: str


class ChangeSetContent(PetraModel):
    project_id: str
    origin: Literal["direct_edit", "agent_proposal", "worker_proposal"]
    proposed_by: ActorRef
    reason: str
    operations: list[PromoteClaimOperation | PromoteAssertionOperation]
    impact: ChangeSetImpactPreview
    risk_tier: Literal["R0", "R1", "R2", "R3", "R4"]


class PetraChangeSet(PetraModel):
    schema_name: Literal["petra.change-set"]
    schema_version: Literal["1.0.0"]
    change_set_id: str
    revision: int
    state: Literal[
        "draft",
        "submitted",
        "approved",
        "rejected",
        "applied",
        "conflicted",
        "reverted",
    ]
    content: ChangeSetContent
    content_hash: str
    proposed_at: str


class ApprovalChangeSetSubject(PetraModel):
    subject_kind: Literal["change_set"]
    change_set_id: str
    change_set_revision: int
    change_set_content_hash: str


class HumanActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["human"]


class PetraApproval(PetraModel):
    schema_name: Literal["petra.approval"]
    schema_version: Literal["1.0.0"]
    approval_id: str
    revision: int
    subject: ApprovalChangeSetSubject
    decision: Literal["approved", "rejected"]
    decision_scope: Literal["exact_change_set"]
    decided_by: HumanActorRef
    rationale: str
    conditions: list[str]
    decided_at: str


class SubmitChangeSet(PetraModel):
    command_name: Literal["SubmitChangeSet"]
    change_set: PetraChangeSet


class RecordApproval(PetraModel):
    command_name: Literal["RecordApproval"]
    approval: PetraApproval


class ApplyChangeSet(PetraModel):
    command_name: Literal["ApplyChangeSet"]
    change_set_id: str
    change_set_revision: int
    change_set_content_hash: str
    approval_id: str
    approval_revision: int


class PetraCommandEnvelope(PetraModel):
    schema_name: Literal["petra.command-envelope"]
    schema_version: Literal["1.0.0"]
    command_id: str
    idempotency_key: str
    project_id: str
    actor: ActorRef
    capability_grant_id: str
    correlation_id: str
    causation_id: str | None = None
    submitted_at: str
    command: SubmitChangeSet | RecordApproval | ApplyChangeSet


class ChangeSetSubmittedPayload(PetraModel):
    change_set: PetraChangeSet


class ChangeSetSubmittedEvent(PetraModel):
    event_type: Literal["change_set.submitted"]
    payload: ChangeSetSubmittedPayload


class ApprovalRecordedPayload(PetraModel):
    approval: PetraApproval
    derived_change_set_state: Literal["approved", "rejected"]


class ApprovalRecordedEvent(PetraModel):
    event_type: Literal["approval.recorded"]
    payload: ApprovalRecordedPayload


class ChangeSetAppliedPayload(PetraModel):
    change_set_id: str
    change_set_revision: int
    change_set_content_hash: str
    approval_id: str
    approval_revision: int
    prior_claim_revision: int
    claim: PetraClaim
    prior_assertion_revision: int
    assertion: PetraAssertion


class ChangeSetAppliedEvent(PetraModel):
    event_type: Literal["change_set.applied"]
    payload: ChangeSetAppliedPayload


class ClaimConflictTarget(PetraModel):
    target_kind: Literal["claim"]
    target_id: str
    expected_revision: int
    actual_revision: int
    expected_zone: Literal["quarantine"]
    actual_zone: Literal["quarantine", "trusted", "personal"]


class AssertionConflictTarget(PetraModel):
    target_kind: Literal["assertion"]
    target_id: str
    expected_revision: int
    actual_revision: int
    expected_zone: Literal["quarantine"]
    actual_zone: Literal["quarantine", "trusted", "personal"]


class ChangeSetConflictedPayload(PetraModel):
    change_set_id: str
    change_set_revision: int
    change_set_content_hash: str
    conflict_code: Literal["STALE_TARGET_REVISION", "TARGET_AUTHORITY_MISMATCH"]
    targets: list[ClaimConflictTarget | AssertionConflictTarget]


class ChangeSetConflictedEvent(PetraModel):
    event_type: Literal["change_set.conflicted"]
    payload: ChangeSetConflictedPayload


class PetraDomainEvent(PetraModel):
    schema_name: Literal["petra.domain-event"]
    schema_version: Literal["1.0.0"]
    event_id: str
    event_position: int
    stream_type: Literal["project"]
    stream_id: str
    stream_revision: int
    project_id: str
    actor: ActorRef
    occurred_at: str
    recorded_at: str
    correlation_id: str
    causation_id: str
    command_id: str
    idempotency_key: str
    capability_grant_id: str
    event: (
        ChangeSetSubmittedEvent
        | ApprovalRecordedEvent
        | ChangeSetAppliedEvent
        | ChangeSetConflictedEvent
    )


class DomainEventMessage(PetraModel):
    message_kind: Literal["domain_event"]
    event: PetraDomainEvent


class PetraOutboxRecord(PetraModel):
    schema_name: Literal["petra.outbox-record"]
    schema_version: Literal["1.0.0"]
    outbox_id: str
    outbox_position: int
    target: Literal["neo4j_graph", "interface_authority"]
    target_sequence: int
    partition_key: str
    deduplication_key: str
    enqueued_at: str
    message: DomainEventMessage


class HumanRejectedChangeState(PetraModel):
    zone: Literal["quarantine"]
    review_state: Literal["human_rejected"]


class RetractClaimOperation(PetraModel):
    operation_kind: Literal["retract_claim"]
    target_id: str
    base_revision: int
    before: HumanTrustedChangeState
    after: HumanRejectedChangeState


class RetractAssertionOperation(PetraModel):
    operation_kind: Literal["retract_assertion"]
    target_id: str
    base_revision: int
    before: HumanTrustedChangeState
    after: HumanRejectedChangeState


class ChangeSetContentV110(PetraModel):
    project_id: str
    origin: Literal["direct_edit", "agent_proposal", "worker_proposal"]
    proposed_by: ActorRef
    reason: str
    operations: list[
        PromoteClaimOperation
        | PromoteAssertionOperation
        | RetractClaimOperation
        | RetractAssertionOperation
    ]
    impact: ChangeSetImpactPreview
    risk_tier: Literal["R0", "R1", "R2", "R3", "R4"]
    compensates_change_set_id: str | None = None


class PetraChangeSetV110(PetraModel):
    schema_name: Literal["petra.change-set"]
    schema_version: Literal["1.1.0"]
    change_set_id: str
    revision: Literal[1]
    state: Literal["submitted"]
    content: ChangeSetContentV110
    content_hash: str
    proposed_at: str


class SubmitChangeSetV110(PetraModel):
    command_name: Literal["SubmitChangeSet"]
    change_set: PetraChangeSetV110


class PetraCommandEnvelopeV110(PetraModel):
    schema_name: Literal["petra.command-envelope"]
    schema_version: Literal["1.1.0"]
    command_id: str
    idempotency_key: str
    project_id: str
    actor: ActorRef
    capability_grant_id: str
    correlation_id: str
    causation_id: str | None = None
    submitted_at: str
    command: SubmitChangeSetV110 | RecordApproval | ApplyChangeSet


class ProjectHistoryCompensationPlanPreviewRef(PetraModel):
    schema_name: Literal["petra.project-history-compensation-preview-view"]
    schema_version: Literal["1.0.0"]
    content_hash: str
    binding_hash: str
    issued_at: str
    valid_through: str


class ProjectHistoryCompensationPlanRequestConfirmation(PetraModel):
    confirmed: Literal[True]
    reason: str = Field(min_length=1, max_length=8000)
    approval_rationale: str = Field(min_length=1, max_length=8000)


class PetraProjectHistoryCompensationPlanRequest(PetraModel):
    schema_name: Literal["petra.project-history-compensation-plan-request"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    preview_ref: ProjectHistoryCompensationPlanPreviewRef
    confirmation: ProjectHistoryCompensationPlanRequestConfirmation


class ProjectHistoryCompensationPlanRevalidation(PetraModel):
    state: Literal["passed"]
    checked_at: str
    assessment_content_hash: str
    authority: ProjectHistoryImpactAuthority
    target_bindings: list[
        ProjectHistoryCompensationClaimOperation
        | ProjectHistoryCompensationAssertionOperation
    ] = Field(min_length=2, max_length=2)
    preview_command_bindings: list[ProjectHistoryCompensationCommandStep] = Field(
        min_length=3, max_length=3
    )
    preview_expiry: Literal["unexpired"]


class ProjectHistoryCompensationPlannedCommand(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    envelope: PetraCommandEnvelopeV110
    state: Literal["composed_not_submitted"]


class ProjectHistoryCompensationPlanConfirmation(PetraModel):
    state: Literal["explicitly_confirmed"]
    confirmed_by: HumanActorRef
    confirmed_at: str


class ProjectHistoryCompensationPlanPersistence(PetraModel):
    change_set: Literal["not_persisted"]
    approval: Literal["not_persisted"]
    commands: Literal["not_persisted"]


class ProjectHistoryCompensationPlanExecution(PetraModel):
    state: Literal["not_performed"]
    requires_separate_request: Literal[True]
    authority_recheck: Literal["required_at_each_command"]


class ProjectHistoryCompensationPlanDecisionBoundary(PetraModel):
    preview: Literal["revalidated"]
    command_plan: Literal["composed"]
    compensation: Literal["not_persisted_or_executed"]
    generic_undo: Literal["not_available"]
    multi_step_compensation: Literal["not_assessed"]


class ProjectHistoryCompensationPlanContent(PetraModel):
    plan_kind: Literal["single_change_set_compensation_command_plan"]
    authorization_scope: Literal["authenticated_project"]
    preview_ref: ProjectHistoryCompensationPlanPreviewRef
    confirmation: ProjectHistoryCompensationPlanConfirmation
    revalidation: ProjectHistoryCompensationPlanRevalidation
    change_set: PetraChangeSetV110
    approval: PetraApproval
    commands: list[ProjectHistoryCompensationPlannedCommand] = Field(
        min_length=3, max_length=3
    )
    persistence: ProjectHistoryCompensationPlanPersistence
    execution: ProjectHistoryCompensationPlanExecution
    decision_boundary: ProjectHistoryCompensationPlanDecisionBoundary
    omissions: list[
        Literal[
            "commands_not_submitted",
            "compensation_not_persisted",
            "compensation_not_executed",
            "dependent_effect_not_inferred_or_reversed",
            "historical_project_definition_not_interpreted",
        ]
    ] = Field(min_length=5, max_length=5)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_plan(self) -> ProjectHistoryCompensationPlanContent:
        expected_commands = ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
        if [command.command_name for command in self.commands] != expected_commands or [
            command.position for command in self.commands
        ] != [1, 2, 3]:
            raise ValueError("compensation plan must preserve exact command order")
        if [
            command.envelope.command.command_name for command in self.commands
        ] != expected_commands:
            raise ValueError("compensation plan envelope order is inconsistent")
        submit = self.commands[0].envelope.command
        review = self.commands[1].envelope.command
        apply = self.commands[2].envelope.command
        if not isinstance(submit, SubmitChangeSetV110):
            raise ValueError("compensation plan must begin with its exact ChangeSet")
        if not isinstance(review, RecordApproval) or not isinstance(
            apply, ApplyChangeSet
        ):
            raise ValueError("compensation plan Approval/apply sequence is invalid")
        if submit.change_set != self.change_set or review.approval != self.approval:
            raise ValueError("compensation plan embedded records must be exact")
        if (
            self.approval.subject.change_set_id != self.change_set.change_set_id
            or self.approval.subject.change_set_content_hash
            != self.change_set.content_hash
            or apply.change_set_id != self.change_set.change_set_id
            or apply.change_set_content_hash != self.change_set.content_hash
            or apply.approval_id != self.approval.approval_id
        ):
            raise ValueError("compensation plan causal identities must agree")
        if [command.envelope.capability_grant_id for command in self.commands] != [
            grant.grant_ref.capability_grant_id
            for grant in self.revalidation.preview_command_bindings
        ]:
            raise ValueError("compensation plan grants must match revalidation")
        return self


class PetraProjectHistoryCompensationPlanView(PetraModel):
    schema_name: Literal["petra.project-history-compensation-plan-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryCompensationPlanContent
    content_hash: str
    read_at: str

    @model_validator(mode="after")
    def exact_view_binding(self) -> PetraProjectHistoryCompensationPlanView:
        if (
            self.content.change_set.content.project_id != self.project_id
            or any(
                command.envelope.project_id != self.project_id
                for command in self.content.commands
            )
            or self.content.confirmation.confirmed_at != self.read_at
            or self.content.revalidation.checked_at != self.read_at
            or self.content.change_set.proposed_at != self.read_at
            or self.content.approval.decided_at != self.read_at
        ):
            raise ValueError(
                "compensation plan must preserve exact Project and read authority"
            )
        return self


class ProjectHistoryCompensationExecutionConfirmation(PetraModel):
    confirmed: Literal[True]
    acknowledged_atomicity: Literal["per_command_transaction_not_three_command_atomic"]


class PetraProjectHistoryCompensationExecutionRequest(PetraModel):
    schema_name: Literal["petra.project-history-compensation-execution-request"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    plan: PetraProjectHistoryCompensationPlanView
    execution_confirmation: ProjectHistoryCompensationExecutionConfirmation

    @model_validator(mode="after")
    def exact_request_binding(
        self,
    ) -> PetraProjectHistoryCompensationExecutionRequest:
        if (
            self.project_id != self.plan.project_id
            or self.event_id != self.plan.event_id
        ):
            raise ValueError("compensation execution must use the routed exact plan")
        return self


class ProjectHistoryCompensationExecutionPlanRef(PetraModel):
    schema_name: Literal["petra.project-history-compensation-plan-view"]
    schema_version: Literal["1.0.0"]
    content_hash: str
    composed_at: str
    change_set_id: str
    change_set_content_hash: str
    approval_id: str
    correlation_id: str


class ProjectHistoryCompensationSubmittedResult(PetraModel):
    outcome: Literal["submitted"]
    command_id: str
    change_set_id: str
    change_set_state: Literal["submitted"]


class ProjectHistoryCompensationApprovalResult(PetraModel):
    outcome: Literal["approval_recorded"]
    command_id: str
    change_set_id: str
    change_set_state: Literal["approved"]
    approval_id: str


class ProjectHistoryCompensationRevertedResult(PetraModel):
    outcome: Literal["reverted"]
    command_id: str
    change_set_id: str
    change_set_state: Literal["applied"]
    compensates_change_set_id: str
    approval_id: str
    claim_id: str
    claim_revision: int = Field(ge=1)
    assertion_id: str
    assertion_revision: int = Field(ge=1)
    applied_at: str


ProjectHistoryCompensationExecutionResult = (
    ProjectHistoryCompensationSubmittedResult
    | ProjectHistoryCompensationApprovalResult
    | ProjectHistoryCompensationRevertedResult
)


class ProjectHistoryCompensationExecutionError(PetraModel):
    code: str
    message: str = Field(min_length=1, max_length=4000)


class ProjectHistoryCompensationRetainedSuccess(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    command_ref: ProjectHistoryCommandRef
    state: Literal["retained_success"]
    completed_at: str
    result: ProjectHistoryCompensationExecutionResult
    event_ref: ProjectHistoryEventRef


class ProjectHistoryCompensationRetainedFailure(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    command_ref: ProjectHistoryCommandRef
    state: Literal["retained_failure"]
    completed_at: str
    error: ProjectHistoryCompensationExecutionError
    event_ref: ProjectHistoryEventRef


class ProjectHistoryCompensationUnretainedFailure(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    command_ref: ProjectHistoryCommandRef
    state: Literal["attempt_failed_not_retained"]
    error: ProjectHistoryCompensationExecutionError
    retention: Literal["not_in_immutable_command_executions"]


class ProjectHistoryCompensationNotAttempted(PetraModel):
    position: Literal[1, 2, 3]
    command_name: Literal["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
    command_ref: ProjectHistoryCommandRef
    state: Literal["not_attempted"]
    reason: Literal["prior_command_did_not_complete"]


ProjectHistoryCompensationExecutionStep = (
    ProjectHistoryCompensationRetainedSuccess
    | ProjectHistoryCompensationRetainedFailure
    | ProjectHistoryCompensationUnretainedFailure
    | ProjectHistoryCompensationNotAttempted
)


class ProjectHistoryCompensationCompletedEffect(PetraModel):
    state: Literal["compensation_applied"]
    compensation_change_set_id: str
    compensated_change_set_id: str
    approval_id: str
    claim_ref: ProjectHistoryCompensationResult
    assertion_ref: ProjectHistoryCompensationResult
    reversal_event_ref: ProjectHistoryEventRef


class ProjectHistoryCompensationIncompleteEffect(PetraModel):
    state: Literal["not_completed"]
    reason: Literal["command_sequence_stopped"]


class ProjectHistoryCompensationCompletedRecovery(PetraModel):
    state: Literal["complete"]
    same_request: Literal["returns_exact_retained_result"]


class ProjectHistoryCompensationIncompleteRecovery(PetraModel):
    state: Literal["retry_exact_plan", "review_retained_failure"]
    completed_prefix: int = Field(ge=0, le=2)
    same_request_is_idempotent: Literal[True]
    next_position: int | None = Field(default=None, ge=1, le=3)
    reason: str = Field(min_length=1, max_length=4000)


class ProjectHistoryCompensationExecutionPreflight(PetraModel):
    state: Literal[
        "fresh_plan_revalidated",
        "retained_prefix_validated",
        "retained_completion_replayed",
    ]
    checked_at: str


class ProjectHistoryCompensationExecutionDerivation(PetraModel):
    aggregate_ledger: Literal["not_created"]
    sources: list[
        Literal[
            "immutable_command_executions",
            "immutable_domain_events",
            "current_change_control_authority",
        ]
    ] = Field(min_length=3, max_length=3)


class ProjectHistoryCompensationExecutionDecisionBoundary(PetraModel):
    single_plan_execution: Literal["performed_or_stopped_exactly"]
    generic_undo: Literal["not_available"]
    multi_step_compensation: Literal["not_assessed"]
    reversal_of_reversal: Literal["not_available"]


class ProjectHistoryCompensationExecutionContent(PetraModel):
    execution_kind: Literal["single_change_set_compensation_execution"]
    authorization_scope: Literal["authenticated_project"]
    plan_ref: ProjectHistoryCompensationExecutionPlanRef
    preflight: ProjectHistoryCompensationExecutionPreflight
    outcome: Literal["completed", "stopped"]
    completed_prefix: int = Field(ge=0, le=3)
    steps: list[ProjectHistoryCompensationExecutionStep] = Field(
        min_length=3, max_length=3
    )
    authoritative_effect: (
        ProjectHistoryCompensationCompletedEffect
        | ProjectHistoryCompensationIncompleteEffect
    )
    recovery: (
        ProjectHistoryCompensationCompletedRecovery
        | ProjectHistoryCompensationIncompleteRecovery
    )
    atomicity: Literal["per_command_transaction_not_three_command_atomic"]
    derivation: ProjectHistoryCompensationExecutionDerivation
    decision_boundary: ProjectHistoryCompensationExecutionDecisionBoundary
    omissions: list[
        Literal[
            "dependent_effect_not_inferred_or_reversed",
            "historical_project_definition_not_interpreted",
            "cross_family_global_order_not_asserted",
        ]
    ] = Field(min_length=3, max_length=3)
    graph_navigation_history: Literal["client_local_separate"]

    @model_validator(mode="after")
    def exact_execution(self) -> ProjectHistoryCompensationExecutionContent:
        expected_commands = ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"]
        if [step.position for step in self.steps] != [1, 2, 3] or [
            step.command_name for step in self.steps
        ] != expected_commands:
            raise ValueError("compensation execution must preserve command order")
        if any(
            step.command_ref.command_name != step.command_name for step in self.steps
        ):
            raise ValueError("compensation execution command references must agree")
        prefix = 0
        for step in self.steps:
            if isinstance(step, ProjectHistoryCompensationRetainedSuccess):
                if prefix != step.position - 1:
                    raise ValueError("retained successes must form an exact prefix")
                prefix += 1
        if prefix != self.completed_prefix:
            raise ValueError("completed prefix does not match retained outcomes")
        if self.outcome == "completed":
            if (
                prefix != 3
                or not isinstance(
                    self.authoritative_effect,
                    ProjectHistoryCompensationCompletedEffect,
                )
                or not isinstance(
                    self.recovery, ProjectHistoryCompensationCompletedRecovery
                )
            ):
                raise ValueError("completed execution must expose exact effect")
        elif (
            prefix > 2
            or not isinstance(
                self.authoritative_effect,
                ProjectHistoryCompensationIncompleteEffect,
            )
            or not isinstance(
                self.recovery, ProjectHistoryCompensationIncompleteRecovery
            )
        ):
            raise ValueError("stopped execution must expose recovery posture")
        return self


class PetraProjectHistoryCompensationExecutionView(PetraModel):
    schema_name: Literal["petra.project-history-compensation-execution-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    event_id: str
    content: ProjectHistoryCompensationExecutionContent
    content_hash: str
    read_at: str


class ChangeSetSubmittedPayloadV110(PetraModel):
    change_set: PetraChangeSetV110


class ChangeSetSubmittedEventV110(PetraModel):
    event_type: Literal["change_set.submitted"]
    payload: ChangeSetSubmittedPayloadV110


class ChangeSetRevertedPayload(PetraModel):
    change_set_id: str
    change_set_revision: Literal[1]
    change_set_content_hash: str
    compensates_change_set_id: str
    approval_id: str
    approval_revision: Literal[1]
    prior_claim_revision: int
    claim: PetraClaim
    prior_assertion_revision: int
    assertion: PetraAssertion


class ChangeSetRevertedEvent(PetraModel):
    event_type: Literal["change_set.reverted"]
    payload: ChangeSetRevertedPayload


class ReversalConflictTarget(PetraModel):
    target_kind: Literal["claim", "assertion"]
    target_id: str
    expected_revision: int
    actual_revision: int
    expected_zone: Literal["trusted"]
    actual_zone: Literal["quarantine", "trusted", "personal"]


class ReversalConflictedPayload(PetraModel):
    change_set_id: str
    change_set_revision: Literal[1]
    change_set_content_hash: str
    compensates_change_set_id: str
    conflict_code: Literal["STALE_TARGET_REVISION", "TARGET_AUTHORITY_MISMATCH"]
    targets: list[ReversalConflictTarget]


class ReversalConflictedEvent(PetraModel):
    event_type: Literal["change_set.reversal_conflicted"]
    payload: ReversalConflictedPayload


class PetraDomainEventV110(PetraModel):
    schema_name: Literal["petra.domain-event"]
    schema_version: Literal["1.1.0"]
    event_id: str
    event_position: int
    stream_type: Literal["project"]
    stream_id: str
    stream_revision: int
    project_id: str
    actor: ActorRef
    occurred_at: str
    recorded_at: str
    correlation_id: str
    causation_id: str
    command_id: str
    idempotency_key: str
    capability_grant_id: str
    event: (
        ChangeSetSubmittedEventV110
        | ApprovalRecordedEvent
        | ChangeSetAppliedEvent
        | ChangeSetConflictedEvent
        | ChangeSetRevertedEvent
        | ReversalConflictedEvent
    )


class DomainEventMessageV110(PetraModel):
    message_kind: Literal["domain_event"]
    event: PetraDomainEventV110


class PetraOutboxRecordV110(PetraModel):
    schema_name: Literal["petra.outbox-record"]
    schema_version: Literal["1.1.0"]
    outbox_id: str
    outbox_position: int
    target: Literal["neo4j_graph", "interface_authority"]
    target_sequence: int
    partition_key: str
    deduplication_key: str
    enqueued_at: str
    message: DomainEventMessageV110


class ProjectSourceCommandExactRef(PetraModel):
    project_source_id: str
    revision: int
    content_hash: str
    record_hash: str
    status: Literal["active", "excluded"]


class ExcludeProjectSourceCommand(PetraModel):
    command_name: Literal["ExcludeProjectSource"]
    expected_source_ref: ProjectSourceCommandExactRef
    reason: str


class RestoreProjectSourceCommand(PetraModel):
    command_name: Literal["RestoreProjectSource"]
    expected_source_ref: ProjectSourceCommandExactRef
    reason: str


class PetraCommandEnvelopeV120(PetraModel):
    schema_name: Literal["petra.command-envelope"]
    schema_version: Literal["1.2.0"]
    command_id: str
    idempotency_key: str
    project_id: str
    actor: ActorRef
    capability_grant_id: str
    correlation_id: str
    causation_id: str | None = None
    submitted_at: str
    command: (
        SubmitChangeSetV110
        | RecordApproval
        | ApplyChangeSet
        | ExcludeProjectSourceCommand
        | RestoreProjectSourceCommand
    )


class CreateProjectSourceReplacementCommand(PetraModel):
    command_name: Literal["CreateProjectSourceReplacement"]
    replacement_kind: Literal[
        "newer_source_version",
        "identity_resolution",
        "preferred_copy_changed",
        "project_role_replacement",
    ]
    replaced_source_ref: ProjectSourceReplacementExcludedRef
    replacement_source_ref: ProjectSourceReplacementActiveRef
    exclusion_receipt_ref: ProjectSourceReplacementExclusionReceiptRef
    rationale: str


class ProjectSourceReplacementExactActiveRef(PetraModel):
    project_source_replacement_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str
    state: Literal["active"]


class RetractProjectSourceReplacementCommand(PetraModel):
    command_name: Literal["RetractProjectSourceReplacement"]
    expected_replacement_ref: ProjectSourceReplacementExactActiveRef
    reason: str


class PetraCommandEnvelopeV130(PetraModel):
    schema_name: Literal["petra.command-envelope"]
    schema_version: Literal["1.3.0"]
    command_id: str
    idempotency_key: str
    project_id: str
    actor: ActorRef
    capability_grant_id: str
    correlation_id: str
    causation_id: str | None = None
    submitted_at: str
    command: (
        SubmitChangeSetV110
        | RecordApproval
        | ApplyChangeSet
        | ExcludeProjectSourceCommand
        | RestoreProjectSourceCommand
        | CreateProjectSourceReplacementCommand
        | RetractProjectSourceReplacementCommand
    )


class ProjectSourceTransitionPayload(PetraModel):
    prior_source_ref: ProjectSourceCommandExactRef
    project_source: PetraProjectSource


class ProjectSourceExcludedEvent(PetraModel):
    event_type: Literal["project_source.excluded"]
    payload: ProjectSourceTransitionPayload


class ProjectSourceRestoredEvent(PetraModel):
    event_type: Literal["project_source.restored"]
    payload: ProjectSourceTransitionPayload


class PetraDomainEventV120(PetraModel):
    schema_name: Literal["petra.domain-event"]
    schema_version: Literal["1.2.0"]
    event_id: str
    event_position: int
    stream_type: Literal["project"]
    stream_id: str
    stream_revision: int
    project_id: str
    actor: ActorRef
    occurred_at: str
    recorded_at: str
    correlation_id: str
    causation_id: str
    command_id: str
    idempotency_key: str
    capability_grant_id: str
    event: (
        ChangeSetSubmittedEventV110
        | ApprovalRecordedEvent
        | ChangeSetAppliedEvent
        | ChangeSetConflictedEvent
        | ChangeSetRevertedEvent
        | ReversalConflictedEvent
        | ProjectSourceExcludedEvent
        | ProjectSourceRestoredEvent
    )


class DomainEventMessageV120(PetraModel):
    message_kind: Literal["domain_event"]
    event: PetraDomainEventV120


class PetraOutboxRecordV120(PetraModel):
    schema_name: Literal["petra.outbox-record"]
    schema_version: Literal["1.2.0"]
    outbox_id: str
    outbox_position: int
    target: Literal["neo4j_graph", "interface_authority"]
    target_sequence: int
    partition_key: str
    deduplication_key: str
    enqueued_at: str
    message: DomainEventMessageV120


class ProjectSourceLifecycleReceiptCommandRef(PetraModel):
    command_id: str
    idempotency_key: str
    command_name: Literal["ExcludeProjectSource", "RestoreProjectSource"]
    command_fingerprint: str


class ProjectSourceLifecycleReceiptEventRef(PetraModel):
    event_id: str
    event_position: int
    stream_revision: int
    event_type: Literal["project_source.excluded", "project_source.restored"]
    record_hash: str


class ProjectSourceLifecyclePreservation(PetraModel):
    project_source_history: Literal["retained"]
    canonical_identity: Literal["retained"]
    selected_work_version: Literal["retained"]
    artifact_manifest: Literal["retained"]
    local_artifact: Literal["retained"]
    parsed_representation: Literal["retained"]
    provenance: Literal["retained"]


class ProjectSourceLifecycleRecovery(PetraModel):
    recovery_kind: Literal["compensating_status_transition"]
    state: Literal["available"]
    inverse_command_name: Literal["ExcludeProjectSource", "RestoreProjectSource"]
    expected_source_ref: ProjectSourceCommandExactRef
    effect: Literal["ordinary_new_use_disabled", "ordinary_new_use_restored"]


class ProjectSourceLifecycleReceiptContent(PetraModel):
    command_ref: ProjectSourceLifecycleReceiptCommandRef
    prior_source_ref: ProjectSourceCommandExactRef
    resulting_source_ref: ProjectSourceCommandExactRef
    event_ref: ProjectSourceLifecycleReceiptEventRef
    preservation: ProjectSourceLifecyclePreservation
    recovery: ProjectSourceLifecycleRecovery


class PetraProjectSourceLifecycleReceipt(PetraModel):
    schema_name: Literal["petra.project-source-lifecycle-receipt"]
    schema_version: Literal["1.0.0"]
    project_source_lifecycle_receipt_id: str
    revision: Literal[1]
    project_id: str
    content: ProjectSourceLifecycleReceiptContent
    content_hash: str
    recorded_at: str


class ProjectSourceReplacementReceiptCommandRef(PetraModel):
    command_id: str
    idempotency_key: str
    command_name: Literal[
        "CreateProjectSourceReplacement", "RetractProjectSourceReplacement"
    ]
    command_fingerprint: str


class ProjectSourceReplacementReceiptEventRef(PetraModel):
    event_id: str
    event_position: int
    stream_revision: int
    event_type: Literal[
        "project_source.replacement_created",
        "project_source.replacement_retracted",
    ]
    record_hash: str


class ProjectSourceReplacementExactRetractedRef(PetraModel):
    project_source_replacement_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str
    state: Literal["retracted"]


class ProjectSourceReplacementExactRetractionRef(PetraModel):
    project_source_replacement_retraction_id: str
    revision: Literal[1]
    content_hash: str
    record_hash: str


class ProjectSourceReplacementPreservation(PetraModel):
    replacement_history: Literal["retained"]
    retraction_history: Literal["retained"]
    predecessor_source_history: Literal["retained"]
    successor_source_history: Literal["retained"]
    dependent_history: Literal["retained"]
    artifact_material: Literal["retained"]


class ProjectSourceReplacementCreatedResult(PetraModel):
    effect: Literal["replacement_activated"]
    replacement_ref: ProjectSourceReplacementExactActiveRef


class ProjectSourceReplacementRetractedResult(PetraModel):
    effect: Literal["replacement_retracted"]
    replacement_ref: ProjectSourceReplacementExactRetractedRef
    retraction_ref: ProjectSourceReplacementExactRetractionRef


class ProjectSourceReplacementCreateRecovery(PetraModel):
    recovery_kind: Literal["compensating_relationship_retraction"]
    state: Literal["available"]
    inverse_command_name: Literal["RetractProjectSourceReplacement"]
    expected_replacement_ref: ProjectSourceReplacementExactActiveRef
    effect: Literal["relationship_retracted_without_source_restore"]


class ProjectSourceReplacementRetractionDisposition(PetraModel):
    recovery_kind: Literal["separate_source_status_transition"]
    source_status: Literal["unchanged"]
    separate_command_name: Literal["RestoreProjectSource"]
    effect: Literal["relationship_inactive_predecessor_not_restored"]


class ProjectSourceReplacementCreateReceiptContent(PetraModel):
    command_ref: ProjectSourceReplacementReceiptCommandRef
    event_ref: ProjectSourceReplacementReceiptEventRef
    result: ProjectSourceReplacementCreatedResult
    preservation: ProjectSourceReplacementPreservation
    recovery: ProjectSourceReplacementCreateRecovery


class ProjectSourceReplacementRetractionReceiptContent(PetraModel):
    command_ref: ProjectSourceReplacementReceiptCommandRef
    event_ref: ProjectSourceReplacementReceiptEventRef
    result: ProjectSourceReplacementRetractedResult
    preservation: ProjectSourceReplacementPreservation
    recovery: ProjectSourceReplacementRetractionDisposition


class PetraProjectSourceReplacementReceipt(PetraModel):
    schema_name: Literal["petra.project-source-replacement-receipt"]
    schema_version: Literal["1.0.0"]
    project_source_replacement_receipt_id: str
    revision: Literal[1]
    project_id: str
    content: (
        ProjectSourceReplacementCreateReceiptContent
        | ProjectSourceReplacementRetractionReceiptContent
    )
    content_hash: str
    recorded_at: str


class WorkerTaskDescriptor(PetraModel):
    task_family: Literal[
        "ingestion",
        "document_processing",
        "scientific_extraction",
        "retrieval",
        "reasoning",
        "scientific_computation",
        "experiment_execution",
        "projection",
        "maintenance",
    ]
    task_name: str
    task_version: str


class WorkerDescriptor(PetraModel):
    executor_kind: Literal["python_worker", "typescript_worker", "sandbox"]
    worker_name: str
    worker_version: str
    runtime_name: str
    runtime_version: str
    entrypoint: str


class WorkerContractRef(PetraModel):
    schema_name: str
    schema_version: str
    schema_hash: str


class WorkerArtifactInput(PetraModel):
    binding_kind: Literal["artifact"]
    name: str
    artifact_id: str
    content_hash: str
    byte_size: int


class WorkerRecordInput(PetraModel):
    binding_kind: Literal["record"]
    name: str
    record_id: str
    record_revision: int
    snapshot_hash: str


class WorkerExpectedOutput(PetraModel):
    output_name: str
    output_role: Literal[
        "result", "proposal", "diagnostic", "log", "metrics", "checkpoint"
    ]
    required: bool
    media_type: str
    max_bytes: int
    contract: WorkerContractRef | None = None


class WorkerMonetaryLimit(PetraModel):
    currency: str
    max_microunits: int


class WorkerResourceLimits(PetraModel):
    max_wall_time_ms: int
    max_output_bytes: int
    max_attempts: int
    max_parallelism: int
    max_cpu_time_ms: int | None = None
    max_memory_bytes: int | None = None
    max_storage_bytes: int | None = None
    max_network_bytes: int | None = None
    max_gpu_time_ms: int | None = None
    max_input_tokens: int | None = None
    max_output_tokens: int | None = None
    monetary_limit: WorkerMonetaryLimit | None = None


class BlockedWorkerNetwork(PetraModel):
    network_mode: Literal["blocked"]


class AllowlistedWorkerNetwork(PetraModel):
    network_mode: Literal["allowlist"]
    destinations: list[str]


class WorkerInputContent(PetraModel):
    task: WorkerTaskDescriptor
    worker: WorkerDescriptor
    inputs: list[WorkerArtifactInput | WorkerRecordInput]
    expected_outputs: list[WorkerExpectedOutput]
    resource_limits: WorkerResourceLimits
    network_policy: BlockedWorkerNetwork | AllowlistedWorkerNetwork
    partial_result_policy: Literal["discard", "retain_declared", "retain_diagnostics"]


class PetraWorkerInputManifest(PetraModel):
    schema_name: Literal["petra.worker-input-manifest"]
    schema_version: Literal["1.0.0"]
    worker_input_manifest_id: str
    revision: Literal[1]
    work_unit_id: str
    project_id: str
    content: WorkerInputContent
    content_hash: str
    issued_by: ActorRef
    issued_at: str


class WorkerProducedOutput(PetraModel):
    output_name: str
    output_role: Literal[
        "result", "proposal", "diagnostic", "log", "metrics", "checkpoint"
    ]
    output_handle: str
    content_hash: str
    byte_size: int
    media_type: str
    contract: WorkerContractRef | None = None


class WorkerFailure(PetraModel):
    code: str
    message: str
    retryable: bool


class WorkerSucceeded(PetraModel):
    outcome_kind: Literal["succeeded"]
    produced_outputs: list[WorkerProducedOutput]


class WorkerUnsuccessful(PetraModel):
    outcome_kind: Literal[
        "worker_failed", "resource_exhausted", "timed_out", "cancelled"
    ]
    failure: WorkerFailure
    produced_outputs: list[WorkerProducedOutput]


class WorkerDiagnostic(PetraModel):
    code: str
    severity: Literal["info", "warning", "error"]
    message: str


class WorkerNetworkActivity(PetraModel):
    destination: str
    bytes_sent: int
    bytes_received: int


class WorkerMeasuredCost(PetraModel):
    currency: str
    microunits: int


class WorkerResourceUsage(PetraModel):
    wall_time_ms: int
    cpu_time_ms: int
    peak_memory_bytes: int
    input_bytes: int
    output_bytes: int
    network_bytes: int
    gpu_time_ms: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost: WorkerMeasuredCost | None = None


class WorkerOutputContent(PetraModel):
    worker: WorkerDescriptor
    started_at: str
    completed_at: str
    outcome: WorkerSucceeded | WorkerUnsuccessful
    diagnostics: list[WorkerDiagnostic]
    network_activity: list[WorkerNetworkActivity]
    resource_usage: WorkerResourceUsage


class PetraWorkerOutputManifest(PetraModel):
    schema_name: Literal["petra.worker-output-manifest"]
    schema_version: Literal["1.0.0"]
    worker_output_manifest_id: str
    revision: Literal[1]
    work_unit_id: str
    project_id: str
    attempt: int
    worker_input_manifest_id: str
    worker_input_manifest_hash: str
    content: WorkerOutputContent
    content_hash: str
    reported_at: str


ProjectWorkExecutionState = Literal[
    "requested", "queued", "running", "checkpointed", "completed", "cancelled"
]
ProjectWorkTerminalOutcome = Literal[
    "succeeded",
    "worker_failed",
    "validation_failed",
    "resource_exhausted",
    "timed_out",
    "cancelled",
]


class ProjectWorkDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    definition_family: str


class ProjectWorkUnitRef(PetraModel):
    work_unit_id: str
    revision: int
    spec_hash: str
    record_hash: str


class ProjectWorkContentRecordRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectWorkAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectWorkWorkflow(PetraModel):
    workflow_name: str
    workflow_version: str
    task_family: Literal[
        "ingestion",
        "document_processing",
        "scientific_extraction",
        "retrieval",
        "reasoning",
        "scientific_computation",
        "experiment_execution",
        "projection",
        "maintenance",
    ]
    task_name: str
    task_version: str


class ProjectWorkExecution(PetraModel):
    state: ProjectWorkExecutionState
    terminal_outcome: ProjectWorkTerminalOutcome | None = None
    attempt: int
    requested_at: str
    queued_at: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    updated_at: str
    failure: WorkerFailure | None = None


class ProjectWorkAttention(PetraModel):
    state: Literal["needs_attention", "active", "settled"]
    reason_code: Literal[
        "requested",
        "queued",
        "running",
        "retryable_failure",
        "terminal_failure",
        "completed",
        "cancelled",
    ]
    reason: str


class ProjectWorkMeasuredElapsed(PetraModel):
    state: Literal["measured"]
    milliseconds: int
    basis: Literal["start_to_observation", "start_to_terminal"]


class ProjectWorkUnavailable(PetraModel):
    state: Literal["unavailable"]
    reason: str


class ProjectWorkDestination(PetraModel):
    role: Literal["work"]
    target_ref: ProjectWorkUnitRef


class ProjectWorkTaskSummary(PetraModel):
    work_unit_ref: ProjectWorkUnitRef
    task_label: str
    objective: str
    work_mode: Literal["interactive", "foreground", "background", "batch"]
    priority: Literal["user_blocking", "user_visible", "normal", "opportunistic"]
    workflow: ProjectWorkWorkflow
    execution: ProjectWorkExecution
    attention: ProjectWorkAttention
    elapsed: ProjectWorkMeasuredElapsed | ProjectWorkUnavailable
    resource_coverage: Literal["limits_only", "measured"]
    reported_output_count: int
    stage_plan: ProjectWorkUnavailable
    destination: ProjectWorkDestination


class ProjectWorkCollectionQuery(PetraModel):
    limit: int
    cursor: str | None = None
    state: ProjectWorkExecutionState | None = None


class ProjectWorkPage(PetraModel):
    returned_count: int
    total_count: int
    has_more: bool
    next_cursor: str | None = None


class ProjectWorkCollection(PetraModel):
    view_kind: Literal["collection"]
    project_definition_ref: ProjectWorkDefinitionRef
    query: ProjectWorkCollectionQuery
    tasks: list[ProjectWorkTaskSummary]
    page: ProjectWorkPage
    authority: ProjectWorkAuthority


class ProjectWorkDependency(PetraModel):
    work_unit_ref: ProjectWorkUnitRef
    state: ProjectWorkExecutionState
    terminal_outcome: ProjectWorkTerminalOutcome | None = None


class ProjectWorkSpecification(PetraModel):
    input_manifest_ref: ProjectWorkContentRecordRef
    task: WorkerTaskDescriptor
    worker: WorkerDescriptor
    inputs: list[WorkerArtifactInput | WorkerRecordInput]
    expected_outputs: list[WorkerExpectedOutput]
    network_policy: BlockedWorkerNetwork | AllowlistedWorkerNetwork
    partial_result_policy: Literal["discard", "retain_declared", "retain_diagnostics"]
    cache_mode: Literal["reuse_exact", "refresh", "disabled"]
    cancellation_policy: Literal["cancellable", "checkpoint_then_cancel", "atomic"]
    checkpoint_policy: Literal["disabled", "latest_valid", "all_valid"]
    deadline_at: str | None = None


class ProjectWorkMeasuredUsage(PetraModel):
    state: Literal["measured"]
    output_manifest_ref: ProjectWorkContentRecordRef
    resource_usage: WorkerResourceUsage


class ProjectWorkResources(PetraModel):
    limits: WorkerResourceLimits
    usage: ProjectWorkMeasuredUsage | ProjectWorkUnavailable


class ProjectWorkStagedAvailability(PetraModel):
    state: Literal["staged_handle_only"]
    limitation: str


class ProjectWorkUnavailableAvailability(PetraModel):
    state: Literal["unavailable"]
    limitation: str


class ProjectWorkReportedOutput(PetraModel):
    declaration: WorkerExpectedOutput
    report_state: Literal["reported"]
    produced_output: WorkerProducedOutput
    availability: ProjectWorkStagedAvailability


class ProjectWorkUnreportedOutput(PetraModel):
    declaration: WorkerExpectedOutput
    report_state: Literal["not_reported"]
    availability: ProjectWorkUnavailableAvailability


class ProjectWorkControl(PetraModel):
    control_name: Literal["cancel", "retry", "resume"]
    policy_state: Literal["permitted", "forbidden", "not_applicable", "unresolved"]
    operation_state: Literal["unavailable"]
    reason: str
    consequence: str


class ProjectWorkCoverage(PetraModel):
    area: Literal[
        "identity",
        "execution",
        "inputs",
        "dependencies",
        "stages",
        "resources",
        "outputs",
        "controls",
        "inquiries",
        "review",
        "recovery",
    ]
    state: Literal["complete", "partial", "unavailable"]
    limitation: str | None = None


class ProjectWorkDetail(PetraModel):
    view_kind: Literal["detail"]
    project_definition_ref: ProjectWorkDefinitionRef
    summary: ProjectWorkTaskSummary
    specification: ProjectWorkSpecification
    dependencies: list[ProjectWorkDependency]
    stage_plan: ProjectWorkUnavailable
    resources: ProjectWorkResources
    outputs: list[ProjectWorkReportedOutput | ProjectWorkUnreportedOutput]
    controls: list[ProjectWorkControl]
    inquiry_linkage: ProjectWorkUnavailable
    review: ProjectWorkUnavailable
    semantic_location: ProjectObjectLocationContent
    coverage: list[ProjectWorkCoverage]
    authority: ProjectWorkAuthority


class PetraProjectWorkView(PetraModel):
    schema_name: Literal["petra.project-work-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectWorkCollection | ProjectWorkDetail
    content_hash: str
    read_at: str


class ProjectInquiryDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str


class ProjectInquiryRegistrationContract(PetraModel):
    name: Literal["petra.project-objective"]
    version: Literal["1.0.0"]
    content_hash: str


class ProjectInquiryObjectiveRepresentation(PetraModel):
    representation_kind: Literal["project_objective"]
    registration_kind: Literal["objective_schema"]
    objective_kind: str
    contract: ProjectInquiryRegistrationContract


class ProjectInquiryRoleContent(PetraModel):
    project_definition_ref: ProjectInquiryDefinitionRef
    role_semantic_key: str
    representation: ProjectInquiryObjectiveRepresentation
    status: Literal["active", "superseded"]


class PetraProjectInquiryRole(PetraModel):
    schema_name: Literal["petra.project-inquiry-role"]
    schema_version: Literal["1.0.0"]
    project_inquiry_role_id: str
    revision: int
    project_id: str
    content: ProjectInquiryRoleContent
    content_hash: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class ProjectInquiryRoleRef(PetraModel):
    project_inquiry_role_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectInquiryObjectiveRef(PetraModel):
    objective_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectInquiryAnchor(PetraModel):
    anchor_kind: Literal["project_objective"]
    semantic_key: str
    objective_ref: ProjectInquiryObjectiveRef


class ProjectInquiryWorkUnitRef(PetraModel):
    work_unit_id: str
    revision: int
    spec_hash: str
    record_hash: str


class ProjectInquiryTypedRecordRef(PetraModel):
    schema_name: str
    schema_version: str
    record_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectInquiryWorkTarget(PetraModel):
    target_kind: Literal["work"]
    relationship: Literal["addresses"]
    work_unit_ref: ProjectInquiryWorkUnitRef


class ProjectInquiryResultTarget(PetraModel):
    target_kind: Literal["result"]
    bearing: Literal["addresses", "admissible_basis", "accepted_finding"]
    result_ref: ProjectInquiryTypedRecordRef
    produced_by_work_ref: ProjectInquiryWorkUnitRef | None = None


class ProjectInquiryLinkContent(PetraModel):
    project_definition_ref: ProjectInquiryDefinitionRef
    inquiry_role_ref: ProjectInquiryRoleRef
    inquiry_anchor: ProjectInquiryAnchor
    target: ProjectInquiryWorkTarget | ProjectInquiryResultTarget


class PetraProjectInquiryLink(PetraModel):
    schema_name: Literal["petra.project-inquiry-link"]
    schema_version: Literal["1.0.0"]
    project_inquiry_link_id: str
    project_id: str
    content: ProjectInquiryLinkContent
    content_hash: str
    created_by: ActorRef
    created_at: str


ProjectInquiryAuthoredStatus = Literal["active", "satisfied", "superseded", "abandoned"]


class ProjectInquiryViewDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    definition_family: str


class ProjectInquiryViewRoleSummary(PetraModel):
    role_ref: ProjectInquiryRoleRef
    semantic_key: str
    singular: str
    plural: str
    representation_kind: Literal["project_objective"]


class ProjectInquiryViewDestination(PetraModel):
    role: Literal["brief"]
    objective_ref: ProjectInquiryObjectiveRef


class ProjectInquiryViewOperationalCounts(PetraModel):
    active: int
    completed: int
    cancelled: int


class ProjectInquiryViewSummary(PetraModel):
    role: ProjectInquiryViewRoleSummary
    inquiry_anchor_ref: ProjectInquiryObjectiveRef
    original_framing: str
    current_framing: str
    authored_status: ProjectInquiryAuthoredStatus
    resolution_boundary: Literal["authored_status_only"]
    parent_ref: ProjectInquiryObjectiveRef | None = None
    dependency_count: int
    linked_work_count: int
    linked_result_count: int
    operational_work: ProjectInquiryViewOperationalCounts
    destination: ProjectInquiryViewDestination
    updated_at: str


class ProjectInquiryViewCollectionQuery(PetraModel):
    limit: int
    cursor: str | None = None
    authored_status: ProjectInquiryAuthoredStatus | None = None
    work_unit_id: str | None = None


class ProjectInquiryViewPage(PetraModel):
    returned_count: int
    total_count: int
    has_more: bool
    next_cursor: str | None = None


class ProjectInquiryViewUnavailable(PetraModel):
    state: Literal["unavailable"]
    reason: str


class ProjectInquiryViewOperation(PetraModel):
    operation: Literal["create", "revise", "focus", "link_work", "unlink"]
    state: Literal["unavailable"]
    reason: str


class ProjectInquiryViewAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectInquiryViewCollection(PetraModel):
    view_kind: Literal["collection"]
    project_definition_ref: ProjectInquiryViewDefinitionRef
    query: ProjectInquiryViewCollectionQuery
    inquiries: list[ProjectInquiryViewSummary]
    page: ProjectInquiryViewPage
    operations: list[ProjectInquiryViewOperation]
    authority: ProjectInquiryViewAuthority


class ProjectInquiryViewFramingRevision(PetraModel):
    objective_ref: ProjectInquiryObjectiveRef
    statement: str
    authored_status: ProjectInquiryAuthoredStatus
    updated_at: str


class ProjectInquiryViewRelatedInquiry(PetraModel):
    relationship: Literal["parent", "dependency"]
    objective_ref: ProjectInquiryObjectiveRef
    framing: str
    authored_status: ProjectInquiryAuthoredStatus


class ProjectInquiryViewOpenQuestion(PetraModel):
    state: Literal["available"]
    items: list[str]
    basis: Literal["authored_active_framing"]


class ProjectInquiryViewCurrentWork(PetraModel):
    work_unit_ref: ProjectInquiryWorkUnitRef
    state: Literal[
        "requested", "queued", "running", "checkpointed", "completed", "cancelled"
    ]
    terminal_outcome: ProjectWorkTerminalOutcome | None = None
    updated_at: str


class ProjectInquiryViewLinkRef(PetraModel):
    project_inquiry_link_id: str
    content_hash: str
    record_hash: str


class ProjectInquiryViewWorkLink(PetraModel):
    link_ref: ProjectInquiryViewLinkRef
    relationship: Literal["addresses"]
    linked_work_ref: ProjectInquiryWorkUnitRef
    current_work: ProjectInquiryViewCurrentWork


class ProjectInquiryViewResultLink(PetraModel):
    link_ref: ProjectInquiryViewLinkRef
    bearing: Literal["addresses", "admissible_basis", "accepted_finding"]
    result_ref: ProjectInquiryTypedRecordRef
    produced_by_work_ref: ProjectInquiryWorkUnitRef | None = None
    authority_statement: str


class ProjectInquiryViewCoverage(PetraModel):
    area: Literal[
        "identity",
        "framing",
        "relationships",
        "open_questions",
        "understanding",
        "basis",
        "work",
        "results",
        "recommendation",
        "commands",
    ]
    state: Literal["complete", "partial", "unavailable"]
    limitation: str | None = None


class ProjectInquiryViewDetail(PetraModel):
    view_kind: Literal["detail"]
    project_definition_ref: ProjectInquiryViewDefinitionRef
    summary: ProjectInquiryViewSummary
    framing_history: list[ProjectInquiryViewFramingRevision]
    related_inquiries: list[ProjectInquiryViewRelatedInquiry]
    open_questions: ProjectInquiryViewOpenQuestion | ProjectInquiryViewUnavailable
    current_understanding: ProjectInquiryViewUnavailable
    basis: ProjectInquiryViewUnavailable
    work_links: list[ProjectInquiryViewWorkLink]
    result_links: list[ProjectInquiryViewResultLink]
    recommendation: ProjectInquiryViewUnavailable
    coverage: list[ProjectInquiryViewCoverage]
    operations: list[ProjectInquiryViewOperation]
    authority: ProjectInquiryViewAuthority


class PetraProjectInquiryView(PetraModel):
    schema_name: Literal["petra.project-inquiry-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectInquiryViewCollection | ProjectInquiryViewDetail
    content_hash: str
    read_at: str


class ProjectThreadDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    definition_family: str


class ProjectThreadObjectiveRef(PetraModel):
    objective_id: str
    revision: int
    content_hash: str


class ProjectThreadRootLineage(PetraModel):
    lineage_kind: Literal["root"]


class ProjectThreadRevisionLineage(PetraModel):
    lineage_kind: Literal["revision"]
    parent_revision: int
    parent_hash: str


class ProjectThreadRevisionRef(PetraModel):
    project_thread_id: str
    revision: int
    content_hash: str


class ProjectThreadRootOrigin(PetraModel):
    origin_kind: Literal["root"]


class ProjectThreadBranchOrigin(PetraModel):
    origin_kind: Literal["branch"]
    parent_thread_ref: ProjectThreadRevisionRef
    parent_turn_id: str
    continuation_mode: Literal[
        "original_snapshot", "current_snapshot", "compare_then_continue"
    ]


class ProjectThreadExactArtifactRef(PetraModel):
    artifact_id: str
    content_hash: str
    byte_size: int
    media_type: str


class ProjectThreadExactRecordRef(PetraModel):
    schema_name: str
    schema_version: str
    record_id: str
    revision: int
    content_hash: str


class ProjectThreadHashOnlyInput(PetraModel):
    retention_state: Literal["hash_only"]
    input_hash: str
    source_message_id: str
    limitation: str


class ProjectThreadRetainedInput(PetraModel):
    retention_state: Literal["retained_artifact"]
    input_hash: str
    source_message_id: str
    artifact_ref: ProjectThreadExactArtifactRef


class ProjectThreadSnapshotRef(PetraModel):
    snapshot_id: str
    snapshot_revision: int
    event_position: int
    content_hash: str


class ProjectThreadContext(PetraModel):
    context_record_ref: ProjectThreadExactRecordRef
    snapshot_ref: ProjectThreadSnapshotRef
    included_object_count: int
    omission_count: int
    coverage_state: Literal["complete_for_recipe", "bounded", "partial", "unknown"]
    coverage_statement: str


class ProjectThreadInteractionRunRef(PetraModel):
    interaction_run_id: str
    revision: int
    content_hash: str


class ProjectThreadWorkUnitRef(PetraModel):
    work_unit_id: str
    revision: int
    spec_hash: str


class ProjectThreadExecution(PetraModel):
    interaction_run_ref: ProjectThreadInteractionRunRef
    work_unit_ref: ProjectThreadWorkUnitRef


class ProjectThreadControlRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class ProjectThreadUnavailable(PetraModel):
    state: Literal["unavailable"]
    reason: str


class ProjectThreadAuthorityContext(PetraModel):
    actor: ActorRef
    capability_grant_id: str
    privacy_profile_ref: ProjectThreadControlRef
    budget_profile_ref: ProjectThreadControlRef
    review_policy: ProjectThreadUnavailable


class ProjectThreadCompletedResponse(PetraModel):
    state: Literal["completed"]
    result_record_ref: ProjectThreadExactRecordRef
    response_artifact_ref: ProjectThreadExactArtifactRef
    force: Literal["explanation_only", "work_update", "proposal"]
    authority_effect: Literal["none"]


class ProjectThreadUnmodifiedCompaction(PetraModel):
    state: Literal["unmodified"]


class ProjectThreadCompactedContext(PetraModel):
    state: Literal["compacted"]
    summary_artifact_ref: ProjectThreadExactArtifactRef
    covered_through_sequence: int
    method_ref: ProjectThreadExactRecordRef


class ProjectThreadTurn(PetraModel):
    project_turn_id: str
    sequence: int
    previous_turn_id: str | None = None
    project_definition_ref: ProjectThreadDefinitionRef
    objective_ref: ProjectThreadObjectiveRef | None = None
    input: ProjectThreadHashOnlyInput | ProjectThreadRetainedInput
    context: ProjectThreadContext
    execution: ProjectThreadExecution
    authority_context: ProjectThreadAuthorityContext
    response: ProjectThreadCompletedResponse
    compaction: ProjectThreadUnmodifiedCompaction | ProjectThreadCompactedContext
    proposal_decision_linkage: ProjectThreadUnavailable
    presentation_context: ProjectThreadUnavailable
    recorded_at: str


class ProjectThreadRetention(PetraModel):
    state: Literal["retained"]
    limitation: str


class ProjectThreadContent(PetraModel):
    title: str
    task: str
    lifecycle: Literal["open", "archived"]
    origin: ProjectThreadRootOrigin | ProjectThreadBranchOrigin
    turns: list[ProjectThreadTurn]
    retention: ProjectThreadRetention


class PetraProjectThread(PetraModel):
    schema_name: Literal["petra.project-thread"]
    schema_version: Literal["1.0.0"]
    project_thread_id: str
    revision: int
    project_id: str
    project_definition_ref: ProjectThreadDefinitionRef
    lineage: ProjectThreadRootLineage | ProjectThreadRevisionLineage
    content: ProjectThreadContent
    content_hash: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class ProjectThreadViewThreadRef(PetraModel):
    project_thread_id: str
    revision: int
    content_hash: str
    record_hash: str


class ProjectThreadViewLatestTurn(PetraModel):
    state: Literal["available"]
    project_turn_id: str
    sequence: int
    snapshot_ref: ProjectThreadSnapshotRef
    force: Literal["explanation_only", "work_update", "proposal"]
    recorded_at: str


class ProjectThreadViewSummary(PetraModel):
    thread_ref: ProjectThreadViewThreadRef
    project_definition_ref: ProjectThreadDefinitionRef
    title: str
    task: str
    lifecycle: Literal["open", "archived"]
    origin: ProjectThreadRootOrigin | ProjectThreadBranchOrigin
    turn_count: int
    latest_turn: ProjectThreadViewLatestTurn | ProjectThreadUnavailable
    retention: ProjectThreadRetention
    updated_at: str


class ProjectThreadViewOperation(PetraModel):
    operation: Literal["create", "append_turn", "branch", "archive", "reopen"]
    state: Literal["unavailable"]
    reason: str


class ProjectThreadViewQuery(PetraModel):
    limit: int
    cursor: str | None = None
    lifecycle: Literal["open", "archived"] | None = None


class ProjectThreadViewPage(PetraModel):
    returned_count: int
    total_count: int
    has_more: bool
    next_cursor: str | None = None


class ProjectThreadViewAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class ProjectThreadViewCollection(PetraModel):
    view_kind: Literal["collection"]
    project_definition_ref: ProjectThreadDefinitionRef
    query: ProjectThreadViewQuery
    threads: list[ProjectThreadViewSummary]
    page: ProjectThreadViewPage
    operations: list[ProjectThreadViewOperation]
    authority: ProjectThreadViewAuthority


class ProjectThreadViewHashOnlyRepresentation(PetraModel):
    state: Literal["hash_only"]
    reason: str
    input_hash: str


class ProjectThreadViewMetadataRepresentation(PetraModel):
    state: Literal["metadata_only"]
    reason: str
    artifact_ref: ProjectThreadExactArtifactRef


class ProjectThreadViewWorkDestination(PetraModel):
    role: Literal["work"]
    work_unit_ref: ProjectThreadWorkUnitRef


class ProjectThreadViewTurn(PetraModel):
    turn: ProjectThreadTurn
    input_representation: (
        ProjectThreadViewHashOnlyRepresentation
        | ProjectThreadViewMetadataRepresentation
    )
    response_representation: ProjectThreadViewMetadataRepresentation
    work_destination: ProjectThreadViewWorkDestination


class ProjectThreadViewDetail(PetraModel):
    view_kind: Literal["detail"]
    summary: ProjectThreadViewSummary
    turns: list[ProjectThreadViewTurn]
    operations: list[ProjectThreadViewOperation]
    authority: ProjectThreadViewAuthority


class PetraProjectThreadView(PetraModel):
    schema_name: Literal["petra.project-thread-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: ProjectThreadViewCollection | ProjectThreadViewDetail
    content_hash: str
    read_at: str


class WorkUnitInputManifestRef(PetraModel):
    worker_input_manifest_id: str
    content_hash: str


class WorkUnitCacheEnabled(PetraModel):
    cache_mode: Literal["reuse_exact", "refresh"]
    cache_key: str


class WorkUnitCacheDisabled(PetraModel):
    cache_mode: Literal["disabled"]


class WorkUnitSpec(PetraModel):
    workflow_name: str
    workflow_version: str
    objective: str
    work_mode: Literal["interactive", "foreground", "background", "batch"]
    priority: Literal["user_blocking", "user_visible", "normal", "opportunistic"]
    dependency_work_unit_ids: list[str]
    input_manifest_ref: WorkUnitInputManifestRef
    idempotency_key: str
    cache: WorkUnitCacheEnabled | WorkUnitCacheDisabled
    cancellation_policy: Literal["cancellable", "checkpoint_then_cancel", "atomic"]
    checkpoint_policy: Literal["disabled", "latest_valid", "all_valid"]
    deadline_at: str | None = None


class WorkUnitRequested(PetraModel):
    state: Literal["requested"]
    requested_at: str


class WorkUnitQueued(PetraModel):
    state: Literal["queued"]
    requested_at: str
    queued_at: str


class WorkUnitRunning(PetraModel):
    state: Literal["running"]
    requested_at: str
    queued_at: str
    started_at: str
    attempt: int


class WorkUnitCheckpointRef(PetraModel):
    artifact_id: str
    content_hash: str
    recorded_at: str


class WorkUnitCheckpointed(PetraModel):
    state: Literal["checkpointed"]
    requested_at: str
    queued_at: str
    started_at: str
    attempt: int
    checkpoint: WorkUnitCheckpointRef


class WorkUnitOutputManifestRef(PetraModel):
    worker_output_manifest_id: str
    content_hash: str


class WorkUnitSucceeded(PetraModel):
    state: Literal["completed"]
    terminal_outcome: Literal["succeeded"]
    requested_at: str
    queued_at: str
    started_at: str
    completed_at: str
    attempt: int
    output_manifest_ref: WorkUnitOutputManifestRef


class WorkUnitFailed(PetraModel):
    state: Literal["completed"]
    terminal_outcome: Literal[
        "worker_failed", "validation_failed", "resource_exhausted", "timed_out"
    ]
    requested_at: str
    queued_at: str
    started_at: str
    completed_at: str
    attempt: int
    failure: WorkerFailure
    output_manifest_ref: WorkUnitOutputManifestRef | None = None


class WorkUnitCancelled(PetraModel):
    state: Literal["cancelled"]
    terminal_outcome: Literal["cancelled"]
    requested_at: str
    queued_at: str | None = None
    started_at: str | None = None
    cancelled_at: str
    attempt: int
    reason: str
    output_manifest_ref: WorkUnitOutputManifestRef | None = None


class PetraWorkUnit(PetraModel):
    schema_name: Literal["petra.work-unit"]
    schema_version: Literal["1.0.0"]
    work_unit_id: str
    revision: int
    project_id: str
    spec: WorkUnitSpec
    spec_hash: str
    status: (
        WorkUnitRequested
        | WorkUnitQueued
        | WorkUnitRunning
        | WorkUnitCheckpointed
        | WorkUnitSucceeded
        | WorkUnitFailed
        | WorkUnitCancelled
    )
    capability_grant_id: str
    trace_id: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class WorkUnitCancellationServiceActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["service"]


class WorkUnitCancellationRef(PetraModel):
    work_unit_id: str
    revision: int
    spec_hash: str


class WorkUnitCancellationInteraction(PetraModel):
    protocol_thread_id: str
    protocol_run_id: str


class WorkUnitCancellationCommand(PetraModel):
    command_name: Literal["CancelWorkUnit"]
    command_id: str
    idempotency_key: str
    expected_work_unit_ref: WorkUnitCancellationRef
    interaction: WorkUnitCancellationInteraction
    reason: str
    requested_by: WorkUnitCancellationServiceActorRef
    capability_grant_id: str
    trace_id: str
    requested_at: str


class WorkUnitCancellationOutcome(PetraModel):
    outcome_kind: Literal["cancelled"]
    work_unit_ref: WorkUnitCancellationRef
    cancelled_at: str


class WorkUnitCancellationAuthorityBoundary(PetraModel):
    effect_kind: Literal["operational_only"]
    scientific_authority_changed: Literal[False]
    connection_abort_was_command: Literal[False]


class WorkUnitCancellationContent(PetraModel):
    command: WorkUnitCancellationCommand
    outcome: WorkUnitCancellationOutcome
    authority_boundary: WorkUnitCancellationAuthorityBoundary


class PetraWorkUnitCancellation(PetraModel):
    schema_name: Literal["petra.work-unit-cancellation"]
    schema_version: Literal["1.0.0"]
    work_unit_cancellation_id: str
    revision: Literal[1]
    project_id: str
    content: WorkUnitCancellationContent
    content_hash: str
    recorded_by: WorkUnitCancellationServiceActorRef
    recorded_at: str


class ProjectionIdentity(PetraModel):
    target: Literal["neo4j_graph"]
    projection_name: str
    projection_version: str
    configuration_hash: str


class ProjectionServiceActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["service"]


class ProjectionOutboxRef(PetraModel):
    outbox_id: str
    outbox_position: int
    target_sequence: int
    event_id: str
    event_position: int
    stream_revision: int


class ProjectedObject(PetraModel):
    graph_element_kind: Literal["node", "relationship"]
    object_id: str
    object_revision: int
    operation: Literal["upsert", "tombstone"]


class ProjectionEffect(PetraModel):
    source_event_id: str
    objects: list[ProjectedObject]


class ProjectionBackendReceipt(PetraModel):
    backend_kind: Literal["neo4j"]
    receipt: str


class ProjectionApplied(PetraModel):
    outcome_kind: Literal["applied"]
    effect: ProjectionEffect
    effect_hash: str
    backend_receipt: ProjectionBackendReceipt


class ProjectionFailure(PetraModel):
    code: str
    message: str
    retryable: bool


class ProjectionFailed(PetraModel):
    outcome_kind: Literal["failed"]
    failure: ProjectionFailure


class GraphProjectionContent(PetraModel):
    outbox_ref: ProjectionOutboxRef
    attempt: int
    started_at: str
    completed_at: str
    outcome: ProjectionApplied | ProjectionFailed


class PetraGraphProjectionRecord(PetraModel):
    schema_name: Literal["petra.graph-projection-record"]
    schema_version: Literal["1.0.0"]
    graph_projection_record_id: str
    revision: Literal[1]
    project_id: str
    projection: ProjectionIdentity
    content: GraphProjectionContent
    content_hash: str
    recorded_by: ProjectionServiceActorRef
    recorded_at: str


class ProjectionEmptyPosition(PetraModel):
    position_kind: Literal["empty"]
    target_sequence: Literal[0]


class ProjectionAdvancedPosition(PetraModel):
    position_kind: Literal["advanced"]
    target_sequence: int
    outbox_id: str
    outbox_position: int
    event_id: str
    event_position: int
    stream_revision: int
    graph_projection_record_id: str
    advanced_at: str


class ProjectionObservedHead(PetraModel):
    target_sequence: int
    outbox_id: str
    outbox_position: int
    event_id: str
    event_position: int
    stream_revision: int
    observed_at: str


class ProjectionCurrent(PetraModel):
    state: Literal["current"]
    pending_records: Literal[0]


class ProjectionCatchingUp(PetraModel):
    state: Literal["catching_up"]
    pending_records: int


class ProjectionBlocked(PetraModel):
    state: Literal["blocked"]
    pending_records: int
    blocking_projection_record_id: str
    failure_code: str
    message: str
    blocked_at: str


class ProjectionCheckpointContent(PetraModel):
    position: ProjectionEmptyPosition | ProjectionAdvancedPosition
    observed_head: ProjectionObservedHead
    freshness: ProjectionCurrent | ProjectionCatchingUp | ProjectionBlocked


class PetraProjectionCheckpoint(PetraModel):
    schema_name: Literal["petra.projection-checkpoint"]
    schema_version: Literal["1.0.0"]
    projection_checkpoint_id: str
    revision: int
    project_id: str
    projection: ProjectionIdentity
    content: ProjectionCheckpointContent
    content_hash: str
    recorded_by: ProjectionServiceActorRef
    recorded_at: str


class PacketSnapshotRef(PetraModel):
    snapshot_id: str
    snapshot_revision: int
    event_position: int
    content_hash: str


class PacketRecipeRef(PetraModel):
    context_recipe_id: str
    revision: int
    content_hash: str


class PacketObjectRef(PetraModel):
    object_kind: Literal["claim", "assertion", "source_span", "work_version"]
    object_id: str
    object_revision: int
    object_hash: str


class PacketObjective(PetraModel):
    objective_kind: Literal[
        "answer", "inspect", "compare", "review", "compose", "experiment", "other"
    ]
    statement: str
    target_refs: list[PacketObjectRef]


class PacketSelectionAuthority(PetraModel):
    zone: Literal["quarantine", "trusted", "personal", "source_record"]
    review_state: Literal[
        "unreviewed",
        "machine_checked",
        "human_rejected",
        "human_accepted",
        "disputed",
        "not_applicable",
    ]


class PacketSelectionTrace(PetraModel):
    route: Literal[
        "deterministic_graph",
        "lexical",
        "dense",
        "hybrid",
        "graph_expansion",
        "cached",
        "explicit_user_selection",
    ]
    rank: int
    score: str | None = None
    reason: str


class PacketInclusion(PetraModel):
    selection_order: int
    object_ref: PacketObjectRef
    evidence_roles: list[
        Literal[
            "relevant",
            "supporting",
            "contrary",
            "qualifying",
            "conflicting",
            "source_location",
            "workflow_state",
        ]
    ]
    authority: PacketSelectionAuthority
    source_access: Literal[
        "metadata_only",
        "abstract_only",
        "full_text_structured",
        "full_text_analyzed",
        "not_applicable",
    ]
    source_span_refs: list[str]
    selection: PacketSelectionTrace
    estimated_tokens: int


class PacketKnownObjectOmission(PetraModel):
    omission_kind: Literal["known_object"]
    object_ref: PacketObjectRef
    reason: Literal[
        "budget",
        "policy",
        "rights",
        "visibility",
        "truncation",
        "unavailable",
        "not_retrieved",
    ]
    material: bool
    detail: str


class PacketSearchBoundaryOmission(PetraModel):
    omission_kind: Literal["search_boundary"]
    boundary: str
    reason: Literal[
        "budget",
        "policy",
        "rights",
        "visibility",
        "truncation",
        "unavailable",
        "not_retrieved",
    ]
    material: bool
    detail: str


class PacketCoverage(PetraModel):
    state: Literal["complete_for_recipe", "bounded", "partial", "unknown"]
    statement: str
    contrary_evidence_checked: bool


class PacketBudget(PetraModel):
    max_input_tokens: int
    max_objects: int
    max_source_spans: int
    estimated_input_tokens: int
    included_object_count: int
    included_source_span_count: int
    truncated: bool


class PacketDependency(PetraModel):
    dependency_kind: Literal[
        "record", "artifact", "schema", "projection", "ranking", "policy"
    ]
    name: str
    version: str
    content_hash: str


class ContextPacketContent(PetraModel):
    objective: PacketObjective
    included_objects: list[PacketInclusion]
    omissions: list[PacketKnownObjectOmission | PacketSearchBoundaryOmission]
    coverage: PacketCoverage
    budget: PacketBudget
    dependencies: list[PacketDependency]


class PetraContextPacket(PetraModel):
    schema_name: Literal["petra.context-packet"]
    schema_version: Literal["1.0.0"]
    context_packet_id: str
    revision: Literal[1]
    project_id: str
    snapshot_ref: PacketSnapshotRef
    recipe_ref: PacketRecipeRef
    content: ContextPacketContent
    content_hash: str
    compiled_by: ProjectionServiceActorRef
    compiled_at: str


class ContextPacketRef(PetraModel):
    context_packet_id: str
    content_hash: str


class CurrentTemporalPerspective(PetraModel):
    perspective: Literal["current"]
    as_of: str


class HistoricalTemporalPerspective(PetraModel):
    perspective: Literal["historical", "comparative"]
    as_of: str
    historical_boundary: str


class EvidenceSelection(PetraModel):
    context_selection_order: int
    object_ref: PacketObjectRef
    bearing: Literal[
        "supporting",
        "contrary",
        "qualifying",
        "conflicting",
        "background",
        "unresolved",
    ]
    source_span_selection_orders: list[int]
    inclusion_reason: str
    use_limitations: list[str]


class EvidenceExclusion(PetraModel):
    context_selection_order: int
    reason: Literal[
        "not_relevant",
        "redundant",
        "scope_mismatch",
        "rights",
        "budget",
        "unsupported_depth",
    ]
    detail: str


class EvidenceCoverage(PetraModel):
    state: Literal["complete_for_context", "bounded", "partial"]
    statement: str
    contrary_evidence_status: Literal[
        "included", "checked_none_in_context", "not_checked"
    ]
    qualifying_evidence_status: Literal[
        "included", "checked_none_in_context", "not_checked"
    ]


class EvidenceCurrentFreshness(PetraModel):
    state: Literal["current_for_snapshot"]
    checked_at: str


class EvidenceStaleFreshness(PetraModel):
    state: Literal["stale"]
    checked_at: str
    invalidated_by: list[str]


class EvidenceUnknownFreshness(PetraModel):
    state: Literal["unknown"]
    checked_at: str
    reason: str


class EvidencePacketContent(PetraModel):
    context_packet_ref: ContextPacketRef
    composition_objective: str
    temporal_perspective: CurrentTemporalPerspective | HistoricalTemporalPerspective
    selected_evidence: list[EvidenceSelection]
    exclusions: list[EvidenceExclusion]
    coverage: EvidenceCoverage
    freshness: (
        EvidenceCurrentFreshness | EvidenceStaleFreshness | EvidenceUnknownFreshness
    )


class PetraEvidencePacket(PetraModel):
    schema_name: Literal["petra.evidence-packet"]
    schema_version: Literal["1.0.0"]
    evidence_packet_id: str
    revision: Literal[1]
    project_id: str
    snapshot_ref: PacketSnapshotRef
    content: EvidencePacketContent
    content_hash: str
    compiled_by: ProjectionServiceActorRef
    compiled_at: str


class CompositionNamedVersionHash(PetraModel):
    name: str
    version: str
    content_hash: str


class CompositionFelicityContractRef(PetraModel):
    name: Literal["petra.felicity"]
    version: str
    content_hash: str


class CompositionVersionedControlRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class CompositionRequestedOutput(PetraModel):
    artifact_kind: Literal[
        "passage",
        "outline",
        "table",
        "methods_description",
        "experiment_report",
        "literature_synthesis",
        "bibliography",
        "other",
    ]
    description: str
    audience: str
    language: str
    semantic_format: Literal["plain_text", "markdown", "structured_json"]
    permitted_scientific_forces: list[
        Literal[
            "direct_report",
            "descriptive",
            "association",
            "comparison",
            "qualification",
            "causal",
            "mechanistic",
            "methodological",
            "none",
        ]
    ]
    target_code_points: int | None = None


class CompositionCitationStyle(PetraModel):
    style_kind: Literal["csl"]
    style_name: str
    style_version: str


class CompositionCitationPreferences(PetraModel):
    style: CompositionCitationStyle
    export_formats: list[Literal["inline", "markdown", "latex", "bibtex"]]


class CompositionEvidencePolicy(PetraModel):
    allowed_namespaces: list[
        Literal["scholarly", "operational", "personal", "discovery"]
    ]
    inference_policy: Literal[
        "source_reports_only",
        "bounded_synthesis_allowed",
        "researcher_material_allowed",
    ]
    desired_depth: Literal["concise", "standard", "deep"]


class CompositionControlContext(PetraModel):
    output_profile: CompositionNamedVersionHash
    language_contract: CompositionFelicityContractRef
    capability_grant_id: str
    privacy_profile_ref: CompositionVersionedControlRef
    budget_profile_ref: CompositionVersionedControlRef
    approval_mode: Literal["automatic_with_validation", "review_before_draft"]


class CompositionRequestAuthorityBoundary(PetraModel):
    request_is_scientific_authority: Literal[False]
    request_authorizes_publication: Literal[False]


class CompositionRequestContent(PetraModel):
    objective: str
    subject_refs: list[PacketObjectRef]
    requested_output: CompositionRequestedOutput
    citation_preferences: CompositionCitationPreferences
    evidence_policy: CompositionEvidencePolicy
    control_context: CompositionControlContext
    authority_boundary: CompositionRequestAuthorityBoundary


class PetraCompositionRequest(PetraModel):
    schema_name: Literal["petra.composition-request"]
    schema_version: Literal["1.0.0"]
    composition_request_id: str
    revision: Literal[1]
    project_id: str
    snapshot_ref: PacketSnapshotRef
    content: CompositionRequestContent
    content_hash: str
    requested_by: ActorRef
    requested_at: str


class CompositionRequestRef(PetraModel):
    composition_request_id: str
    revision: Literal[1]
    content_hash: str


class CompositionPlanEvidencePacketRef(PetraModel):
    evidence_packet_id: str
    revision: Literal[1]
    content_hash: str


class CompositionPlanEvidenceRef(PetraModel):
    context_selection_order: int
    object_ref: PacketObjectRef
    relation: Literal["direct_report", "qualification", "supports_inference", "context"]


class CompositionMove(PetraModel):
    move_id: str
    position: int
    planned_text: str
    semantic_origin: Literal[
        "source_report",
        "petra_inference",
        "researcher_statement",
        "structural_language",
    ]
    scientific_force: Literal[
        "direct_report",
        "descriptive",
        "association",
        "comparison",
        "qualification",
        "causal",
        "mechanistic",
        "methodological",
        "none",
    ]
    evidence_refs: list[CompositionPlanEvidenceRef]
    citation_required: bool
    limitations: list[str]


class CompositionSection(PetraModel):
    section_id: str
    position: int
    heading: str
    purpose: str
    moves: list[CompositionMove]


class CompositionUnresolvedSupport(PetraModel):
    description: str
    affected_move_ids: list[str]


class CompositionCoverage(PetraModel):
    state: Literal["sufficient", "partial", "insufficient"]
    statement: str
    limitations: list[str]


class CompositionPlanAuthorityBoundary(PetraModel):
    plan_is_scientific_authority: Literal[False]
    prose_may_exceed_evidence: Literal[False]


class CompositionPlanContent(PetraModel):
    state: Literal["ready", "blocked"]
    sections: list[CompositionSection]
    unresolved_support: list[CompositionUnresolvedSupport]
    coverage: CompositionCoverage
    authority_boundary: CompositionPlanAuthorityBoundary


class PetraCompositionPlan(PetraModel):
    schema_name: Literal["petra.composition-plan"]
    schema_version: Literal["1.0.0"]
    composition_plan_id: str
    revision: Literal[1]
    project_id: str
    composition_request_ref: CompositionRequestRef
    evidence_packet_ref: CompositionPlanEvidencePacketRef
    snapshot_ref: PacketSnapshotRef
    content: CompositionPlanContent
    content_hash: str
    compiled_by: ProjectionServiceActorRef
    compiled_at: str


class DraftVersionedControlRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class DraftEvidencePacketRef(PetraModel):
    evidence_packet_id: str
    revision: Literal[1]
    content_hash: str


class DraftProvenanceMapRef(PetraModel):
    provenance_map_id: str
    revision: Literal[1]


class DraftCitationBundleRef(PetraModel):
    citation_bundle_id: str
    revision: Literal[1]


class DraftRootLineage(PetraModel):
    lineage_kind: Literal["root"]


class DraftRevisionLineage(PetraModel):
    lineage_kind: Literal["revision"]
    parent_draft_artifact_id: str
    parent_revision: int
    edit_origin: Literal["researcher_edit", "felicity_revision", "model_revision"]


class DraftNamedVersion(PetraModel):
    name: str
    version: str


class DraftNamedVersionHash(PetraModel):
    name: str
    version: str
    content_hash: str


class DraftModelProduction(PetraModel):
    origin_kind: Literal["model_generated"]
    model_request_id: str
    model_call_id: str
    model_deployment: str
    prompt_profile: DraftNamedVersion
    prompt_hash: str


class DraftResearcherProduction(PetraModel):
    origin_kind: Literal["researcher_authored"]
    researcher_id: str


class DraftDeterministicProduction(PetraModel):
    origin_kind: Literal["deterministic"]
    producer: DraftNamedVersion


class DraftControls(PetraModel):
    output_profile: DraftNamedVersionHash
    language_contract: DraftNamedVersionHash


class DraftContent(PetraModel):
    artifact_kind: Literal[
        "passage",
        "outline",
        "table",
        "methods_description",
        "experiment_report",
        "literature_synthesis",
        "bibliography",
        "other",
    ]
    semantic_format: Literal["plain_text", "markdown", "structured_json"]
    language: str
    text: str
    draft_span_ids: list[str]


class DraftValidatorResult(PetraModel):
    validator: str
    version: str
    outcome: Literal["pass", "fail", "warning"]
    code: str
    message: str | None = None


class DraftValidation(PetraModel):
    state: Literal["pending", "passed", "failed", "stale"]
    validator_results: list[DraftValidatorResult]
    limitations: list[str]
    unresolved_support_span_ids: list[str]


class PetraDraftArtifact(PetraModel):
    schema_name: Literal["petra.draft-artifact"]
    schema_version: Literal["1.0.0"]
    draft_artifact_id: str
    revision: int
    project_id: str
    snapshot_ref: PacketSnapshotRef
    composition_request_ref: DraftVersionedControlRef
    composition_plan_ref: DraftVersionedControlRef
    evidence_packet_ref: DraftEvidencePacketRef
    provenance_map_ref: DraftProvenanceMapRef
    citation_bundle_ref: DraftCitationBundleRef
    lineage: DraftRootLineage | DraftRevisionLineage
    production: (
        DraftModelProduction | DraftResearcherProduction | DraftDeterministicProduction
    )
    controls: DraftControls
    content: DraftContent
    content_hash: str
    validation: DraftValidation
    created_by: ActorRef
    created_at: str


class DraftRef(PetraModel):
    draft_artifact_id: str
    revision: int
    content_hash: str


class DraftSpanContent(PetraModel):
    offset_unit: Literal["unicode_code_point"]
    start: int
    end: int
    exact_text: str
    exact_text_hash: str
    materiality: Literal["material", "nonmaterial"]
    semantic_origin: Literal[
        "source_report",
        "petra_inference",
        "researcher_statement",
        "structural_language",
    ]
    scientific_force: Literal[
        "direct_report",
        "descriptive",
        "association",
        "comparison",
        "qualification",
        "causal",
        "mechanistic",
        "methodological",
        "none",
    ]


class PetraDraftSpan(PetraModel):
    schema_name: Literal["petra.draft-span"]
    schema_version: Literal["1.0.0"]
    draft_span_id: str
    revision: Literal[1]
    project_id: str
    draft_ref: DraftRef
    content: DraftSpanContent
    content_hash: str
    created_by: ActorRef
    created_at: str


class ProvenanceEvidenceBasis(PetraModel):
    basis_kind: Literal["evidence"]
    evidence_selection_order: int
    object_ref: PacketObjectRef
    relation: Literal[
        "direct_report",
        "support",
        "qualification",
        "comparison",
        "interpretation",
        "synthesis",
        "structural",
        "unsupported",
    ]


class ProvenanceInferenceBasis(PetraModel):
    basis_kind: Literal["petra_inference"]
    inference_kind: Literal[
        "synthesis", "comparison", "interpretation", "recommendation"
    ]
    evidence_selection_orders: list[int]
    model_request_id: str
    relation: Literal[
        "direct_report",
        "support",
        "qualification",
        "comparison",
        "interpretation",
        "synthesis",
        "structural",
        "unsupported",
    ]
    rationale: str


class ProvenanceResearcherBasis(PetraModel):
    basis_kind: Literal["researcher"]
    researcher_id: str
    statement_kind: Literal["supplied_statement", "judgment"]
    relation: Literal[
        "direct_report",
        "support",
        "qualification",
        "comparison",
        "interpretation",
        "synthesis",
        "structural",
        "unsupported",
    ]


class ProvenanceStructuralBasis(PetraModel):
    basis_kind: Literal["structural"]
    function: Literal["heading", "connective", "transition", "organization"]
    relation: Literal["structural"]


class ProvenanceUnsupportedBasis(PetraModel):
    basis_kind: Literal["unsupported"]
    relation: Literal["unsupported"]
    reason: str


ProvenanceBasis = (
    ProvenanceEvidenceBasis
    | ProvenanceInferenceBasis
    | ProvenanceResearcherBasis
    | ProvenanceStructuralBasis
    | ProvenanceUnsupportedBasis
)


class ProvenanceCurrentMapping(PetraModel):
    draft_span_id: str
    draft_span_revision: Literal[1]
    mapping_state: Literal["current"]
    bases: list[ProvenanceBasis]


class ProvenanceStaleMapping(PetraModel):
    draft_span_id: str
    draft_span_revision: Literal[1]
    mapping_state: Literal["stale"]
    bases: list[ProvenanceBasis]
    invalidated_by: list[str]


class ProvenanceContent(PetraModel):
    state: Literal["current", "stale"]
    mappings: list[ProvenanceCurrentMapping | ProvenanceStaleMapping]


class PetraProvenanceMap(PetraModel):
    schema_name: Literal["petra.provenance-map"]
    schema_version: Literal["1.0.0"]
    provenance_map_id: str
    revision: Literal[1]
    project_id: str
    draft_ref: DraftRef
    evidence_packet_ref: DraftEvidencePacketRef
    content: ProvenanceContent
    content_hash: str
    compiled_by: ActorRef
    compiled_at: str


class CitationStyle(PetraModel):
    style_kind: Literal["csl", "bibtex", "plain"]
    style_name: str
    style_version: str


class CitationWorkRef(PetraModel):
    work_id: str
    revision: int
    content_hash: str


class CitationWorkVersionRef(PetraModel):
    work_version_id: str
    revision: int
    content_hash: str


class CitationAuthorRef(PetraModel):
    author_id: str
    revision: int
    content_hash: str
    position: int
    display_name: str


class CitationExternalIdentifierRef(PetraModel):
    external_identifier_id: str
    revision: int
    content_hash: str
    namespace: Literal[
        "doi",
        "openalex_work",
        "semantic_scholar_work",
        "acl_anthology",
        "arxiv",
        "pmid",
        "isbn",
        "repository_url",
    ]
    normalized_value: str
    verification_status: Literal[
        "verified", "source_reported", "unverified", "disputed"
    ]


class CitationMetadata(PetraModel):
    title: str
    work_kind: Literal[
        "journal_article",
        "conference_paper",
        "preprint",
        "thesis",
        "book",
        "chapter",
        "other",
    ]
    version_label: str
    publication_status: Literal[
        "preprint",
        "peer_reviewed",
        "accepted",
        "corrected",
        "retracted",
        "unknown",
    ]
    published_date: PublicationYear | PublicationMonth | PublicationDay | None


class CitationIdentityWarning(PetraModel):
    code: str
    message: str


class CitationNamedLocator(PetraModel):
    locator_kind: Literal["page", "section", "paragraph", "figure", "table"]
    value: str


class CitationSourceSpanLocator(PetraModel):
    locator_kind: Literal["source_span"]
    source_span_id: str


class CitationSourceAccess(PetraModel):
    processing_depth: Literal[
        "metadata_only", "abstract_only", "full_text_structured", "full_text_analyzed"
    ]
    source_span_ids: list[str]


class CitationEntry(PetraModel):
    citation_id: str
    bibliography_key: str
    work_ref: CitationWorkRef
    work_version_ref: CitationWorkVersionRef
    author_refs: list[CitationAuthorRef]
    external_identifier_refs: list[CitationExternalIdentifierRef]
    metadata: CitationMetadata
    identity_status: Literal["resolved", "provisional", "disputed"]
    metadata_completeness: Literal["complete", "partial", "conflicted"]
    identity_warnings: list[CitationIdentityWarning]
    purposes: list[
        Literal["evidence", "background", "method", "data", "software", "quotation"]
    ]
    linked_draft_span_ids: list[str]
    locator: CitationNamedLocator | CitationSourceSpanLocator
    source_access: CitationSourceAccess


class CitationBibliographyArtifact(PetraModel):
    format: Literal["markdown", "latex", "bibtex", "csl_json"]
    artifact_id: str
    content_hash: str


class CitationContent(PetraModel):
    style: CitationStyle
    export_formats: list[Literal["inline", "markdown", "latex", "bibtex", "csl_json"]]
    citations: list[CitationEntry]
    bibliography_artifacts: list[CitationBibliographyArtifact]


class PetraCitationBundle(PetraModel):
    schema_name: Literal["petra.citation-bundle"]
    schema_version: Literal["1.0.0"]
    citation_bundle_id: str
    revision: Literal[1]
    project_id: str
    draft_ref: DraftRef
    evidence_packet_ref: DraftEvidencePacketRef
    content: CitationContent
    content_hash: str
    compiled_by: ActorRef
    compiled_at: str


class DraftSupportProvenanceMapRef(PetraModel):
    provenance_map_id: str
    revision: Literal[1]
    content_hash: str


class DraftSupportCitationBundleRef(PetraModel):
    citation_bundle_id: str
    revision: Literal[1]
    content_hash: str


class DraftSupportRootLineage(PetraModel):
    lineage_kind: Literal["root"]


class DraftSupportRevisionLineage(PetraModel):
    lineage_kind: Literal["revision"]
    parent_revision: int
    parent_content_hash: str


class DraftSupportHumanActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["human"]


class DraftSupportServiceActorRef(PetraModel):
    actor_id: str
    actor_kind: Literal["service"]


class DraftSupportResearcherEditTrigger(PetraModel):
    trigger_kind: Literal["researcher_edit"]
    command_id: str
    researcher: DraftSupportHumanActorRef


class DraftSupportRevalidationTrigger(PetraModel):
    trigger_kind: Literal["support_revalidation"]
    command_id: str
    requested_by: DraftSupportHumanActorRef
    executed_by: DraftSupportServiceActorRef


class DraftSupportValidatorResult(PetraModel):
    validator: str
    version: str
    outcome: Literal["pass", "fail", "warning"]
    code: str
    message: str | None = None


class DraftSupportSpanAssessment(PetraModel):
    draft_span_id: str
    support_state: Literal["current", "stale", "passed", "failed"]
    citation_state: Literal["current", "stale", "not_required"]
    basis_snapshot: list[ProvenanceBasis]
    validator_results: list[DraftSupportValidatorResult]
    reasons: list[str]


class DraftSupportCitationAssessment(PetraModel):
    citation_id: str
    link_state: Literal["current", "partially_stale", "stale"]
    stale_draft_span_ids: list[str]


class DraftSupportReusePolicy(PetraModel):
    reuse_allowed: bool
    reason: str


class DraftSupportAuthorityBoundary(PetraModel):
    assessment_is_scientific_evidence: Literal[False]
    assessment_controls_draft_reuse: Literal[True]


class DraftSupportContent(PetraModel):
    state: Literal["stale", "passed", "failed"]
    span_assessments: list[DraftSupportSpanAssessment]
    citation_assessments: list[DraftSupportCitationAssessment]
    validator_results: list[DraftSupportValidatorResult]
    limitations: list[str]
    reuse_policy: DraftSupportReusePolicy
    authority_boundary: DraftSupportAuthorityBoundary

    @model_validator(mode="after")
    def reuse_matches_state(self) -> DraftSupportContent:
        if self.reuse_policy.reuse_allowed != (self.state == "passed"):
            raise ValueError("Draft support reuse must match the assessment state.")
        return self


class PetraDraftSupportAssessment(PetraModel):
    schema_name: Literal["petra.draft-support-assessment"]
    schema_version: Literal["1.0.0"]
    draft_support_assessment_id: str
    revision: int
    project_id: str
    draft_ref: DraftRef
    provenance_map_ref: DraftSupportProvenanceMapRef
    citation_bundle_ref: DraftSupportCitationBundleRef
    lineage: DraftSupportRootLineage | DraftSupportRevisionLineage
    trigger: DraftSupportResearcherEditTrigger | DraftSupportRevalidationTrigger
    content: DraftSupportContent
    content_hash: str
    assessed_by: ActorRef
    assessed_at: str


class FelicityNamedVersionHash(PetraModel):
    name: str
    version: str
    content_hash: str


class FelicitySpanTransformation(PetraModel):
    position: int
    previous_draft_span_id: str
    previous_exact_text_hash: str
    revised_draft_span_id: str
    revised_exact_text_hash: str
    transformation_kind: Literal[
        "unchanged",
        "filler_reduction",
        "whitespace_normalization",
        "filler_and_whitespace",
    ]
    basis_snapshot_hash: str
    previous_citation_ids: list[str]
    revised_citation_ids: list[str]


class FelicityPreservationBoundary(PetraModel):
    scientific_force_preserved: Literal[True]
    epistemic_origin_preserved: Literal[True]
    provenance_bases_preserved: Literal[True]
    citation_scope_preserved: Literal[True]


class FelicityAuthorityBoundary(PetraModel):
    record_is_scientific_evidence: Literal[False]
    content_changes_require_new_draft_revision: Literal[True]


class FelicityRevisionContent(PetraModel):
    state: Literal["passed"]
    transformations: list[FelicitySpanTransformation]
    validator_results: list[DraftSupportValidatorResult]
    preservation: FelicityPreservationBoundary
    authority_boundary: FelicityAuthorityBoundary


class PetraFelicityRevisionRecord(PetraModel):
    schema_name: Literal["petra.felicity-revision-record"]
    schema_version: Literal["1.0.0"]
    felicity_revision_record_id: str
    revision: Literal[1]
    project_id: str
    command_id: str
    previous_draft_ref: DraftRef
    revised_draft_ref: DraftRef
    provenance_map_ref: DraftSupportProvenanceMapRef
    citation_bundle_ref: DraftSupportCitationBundleRef
    language_contract: FelicityNamedVersionHash
    content: FelicityRevisionContent
    content_hash: str
    recorded_by: DraftSupportServiceActorRef
    recorded_at: str


class RenderedArtifactDraftRef(PetraModel):
    draft_artifact_id: str
    revision: int
    content_hash: str


class RenderedArtifactCitationBundleRef(PetraModel):
    citation_bundle_id: str
    revision: Literal[1]
    content_hash: str


class RenderedArtifactRendererRef(PetraModel):
    name: str
    version: str
    content_hash: str


class RenderedArtifactOptions(PetraModel):
    encoding: Literal["utf-8"]
    line_ending: Literal["lf"]
    citation_rendering: Literal["linked_span_suffix"]
    bibliography_rendering: Literal["canonical_metadata_only"]
    standalone_document: bool


class RenderedArtifactOutputRef(PetraModel):
    artifact_id: str
    revision: Literal[1]
    content_hash: str
    byte_size: int
    media_type: str


class RenderedArtifactWarning(PetraModel):
    code: str
    message: str


class RenderedArtifactTransformation(PetraModel):
    kind: Literal[
        "citation_insertion",
        "syntax_escape",
        "bibliography_projection",
        "document_wrapper",
    ]
    behavior: str
    lossy: bool
    semantic_effect: Literal["none"]


class RenderedArtifactAuthorityBoundary(PetraModel):
    rendered_artifact_is_scientific_authority: Literal[False]
    renderer_may_change_support: Literal[False]


class RenderedArtifactContent(PetraModel):
    format: Literal["markdown", "latex", "bibtex"]
    content_scope: Literal["draft_with_citations", "citations_only"]
    renderer: RenderedArtifactRendererRef
    options: RenderedArtifactOptions
    output_artifact_ref: RenderedArtifactOutputRef
    semantic_content_hash: str
    warnings: list[RenderedArtifactWarning]
    transformations: list[RenderedArtifactTransformation]
    authority_boundary: RenderedArtifactAuthorityBoundary


class PetraRenderedArtifact(PetraModel):
    schema_name: Literal["petra.rendered-artifact"]
    schema_version: Literal["1.0.0"]
    rendered_artifact_id: str
    revision: Literal[1]
    project_id: str
    draft_ref: RenderedArtifactDraftRef
    citation_bundle_ref: RenderedArtifactCitationBundleRef
    content: RenderedArtifactContent
    content_hash: str
    rendered_by: ActorRef
    rendered_at: str


class InteractionProtocolProfile(PetraModel):
    name: Literal["ag-ui"]
    sdk_version: str
    profile_version: str


class InteractionSchemaRef(PetraModel):
    schema_name: str
    schema_version: str
    content_hash: str
    json_pointer: str | None = None


class InteractionCustomEventRegistration(PetraModel):
    event_name: str
    payload_schema_ref: InteractionSchemaRef
    stability: Literal["stable", "experimental"]
    authority_effect: Literal["none"]


class InteractionFeatureSupport(PetraModel):
    feature: Literal[
        "text_streaming",
        "activity",
        "tool_proposals",
        "state_projection",
        "interrupts",
        "resumption",
        "replay",
        "explicit_work_cancellation",
    ]
    support: Literal["supported", "deferred", "unsupported"]
    limitation: str | None = None


class InteractionFeatureAuthorityBoundary(PetraModel):
    grants_capabilities: Literal[False]
    interaction_state_is_authoritative: Literal[False]
    replay_reapplies_authority: Literal[False]
    connection_abort_cancels_work: Literal[False]


class InteractionFeatureContent(PetraModel):
    protocol: InteractionProtocolProfile
    transports: list[Literal["text_event_stream", "binary_stream"]]
    standard_events: list[
        Literal[
            "RUN_STARTED",
            "RUN_FINISHED",
            "RUN_ERROR",
            "TEXT_MESSAGE_START",
            "TEXT_MESSAGE_CONTENT",
            "TEXT_MESSAGE_END",
            "TOOL_CALL_START",
            "TOOL_CALL_ARGS",
            "TOOL_CALL_END",
            "STATE_SNAPSHOT",
            "STATE_DELTA",
            "ACTIVITY_SNAPSHOT",
            "ACTIVITY_DELTA",
            "CUSTOM",
        ]
    ]
    custom_events: list[InteractionCustomEventRegistration]
    features: list[InteractionFeatureSupport]
    authority_boundary: InteractionFeatureAuthorityBoundary


class PetraInteractionFeatureManifest(PetraModel):
    schema_name: Literal["petra.interaction-feature-manifest"]
    schema_version: Literal["1.0.0"]
    interaction_feature_manifest_id: str
    revision: Literal[1]
    content: InteractionFeatureContent
    content_hash: str
    compiled_by: ActorRef
    compiled_at: str


class WorkUnitStatusPayload(PetraModel):
    work_unit_id: str
    work_unit_revision: int
    status: Literal[
        "requested",
        "queued",
        "running",
        "checkpointed",
        "succeeded",
        "failed",
        "cancelled",
    ]
    label: str
    authority_effect: Literal["none"]


class WorkUnitStatusInteractionEvent(PetraModel):
    schema_name: Literal["petra.interaction-custom-event"]
    schema_version: Literal["1.0.0"]
    event_name: Literal["petra.work_unit.status"]
    payload: WorkUnitStatusPayload


class InteractionChangeSetRef(PetraModel):
    change_set_id: str
    revision: int
    content_hash: str


class ReviewInterruptPayload(PetraModel):
    interaction_interrupt_id: str
    change_set_ref: InteractionChangeSetRef
    authority_effect: Literal["none"]


class ReviewInterruptInteractionEvent(PetraModel):
    schema_name: Literal["petra.interaction-custom-event"]
    schema_version: Literal["1.0.0"]
    event_name: Literal["petra.review.interrupt"]
    payload: ReviewInterruptPayload


class PetraInteractionCustomEvent(
    RootModel[WorkUnitStatusInteractionEvent | ReviewInterruptInteractionEvent]
):
    model_config = ConfigDict(strict=True, frozen=True)


class InteractionFeatureManifestRef(PetraModel):
    interaction_feature_manifest_id: str
    revision: Literal[1]
    content_hash: str


class InteractionRootLineage(PetraModel):
    lineage_kind: Literal["root"]


class InteractionRevisionLineage(PetraModel):
    lineage_kind: Literal["revision"]
    parent_revision: int
    parent_hash: str


class InteractionWorkUnitRef(PetraModel):
    work_unit_id: str
    revision: int
    spec_hash: str


class InteractionCorrelation(PetraModel):
    protocol_thread_id: str
    protocol_run_id: str
    request_id: str
    trace_id: str
    work_unit_ref: InteractionWorkUnitRef
    model_request_id: str | None = None
    agent_run_id: str | None = None


class InteractionControlRef(PetraModel):
    record_id: str
    revision: int
    content_hash: str


class InteractionAuthorityContext(PetraModel):
    actor: ActorRef
    capability_grant_id: str
    privacy_profile_ref: InteractionControlRef
    budget_profile_ref: InteractionControlRef


class InteractionInput(PetraModel):
    input_hash: str
    source_message_id: str


class InteractionActiveLifecycle(PetraModel):
    state: Literal["queued", "running"]
    started_at: str


class InteractionAwaitingLifecycle(PetraModel):
    state: Literal["awaiting_interrupt"]
    started_at: str
    interaction_interrupt_ids: list[str]


class InteractionTerminalLifecycle(PetraModel):
    state: Literal["completed", "failed", "cancelled"]
    started_at: str
    ended_at: str
    outcome_code: str


class EmptyInteractionHead(PetraModel):
    state: Literal["empty"]
    event_count: Literal[0]


class AdvancedInteractionHead(PetraModel):
    state: Literal["advanced"]
    event_count: int
    latest_sequence: int
    head_hash: str


class InteractionRunAuthorityBoundary(PetraModel):
    interaction_state_is_authoritative: Literal[False]
    events_are_domain_ledger: Literal[False]
    connection_abort_cancels_work: Literal[False]


class InteractionRunContent(PetraModel):
    correlation: InteractionCorrelation
    authority_context: InteractionAuthorityContext
    input: InteractionInput
    lifecycle: (
        InteractionActiveLifecycle
        | InteractionAwaitingLifecycle
        | InteractionTerminalLifecycle
    )
    stream_head: EmptyInteractionHead | AdvancedInteractionHead
    authority_boundary: InteractionRunAuthorityBoundary


class PetraInteractionRun(PetraModel):
    schema_name: Literal["petra.interaction-run"]
    schema_version: Literal["1.0.0"]
    interaction_run_id: str
    revision: int
    project_id: str
    feature_manifest_ref: InteractionFeatureManifestRef
    lineage: InteractionRootLineage | InteractionRevisionLineage
    content: InteractionRunContent
    content_hash: str
    created_by: ActorRef
    created_at: str
    updated_at: str


class InteractionRunRef(PetraModel):
    interaction_run_id: str
    revision: int
    content_hash: str


class StartEventLineage(PetraModel):
    lineage_kind: Literal["start"]


class ContinuedEventLineage(PetraModel):
    lineage_kind: Literal["continuation"]
    previous_event_record_id: str
    previous_sequence: int
    previous_content_hash: str


class StandardInteractionProtocolEvent(PetraModel):
    protocol: Literal["ag-ui"]
    event_type: Literal[
        "RUN_STARTED",
        "RUN_FINISHED",
        "RUN_ERROR",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "TOOL_CALL_START",
        "TOOL_CALL_ARGS",
        "TOOL_CALL_END",
        "STATE_SNAPSHOT",
        "STATE_DELTA",
        "ACTIVITY_SNAPSHOT",
        "ACTIVITY_DELTA",
    ]
    protocol_event_id: str | None = None


class CustomInteractionDescriptor(PetraModel):
    event_name: str
    schema_name: Literal["interaction-custom-event"]
    schema_version: Literal["1.0.0"]
    schema_hash: str


class CustomInteractionProtocolEvent(PetraModel):
    protocol: Literal["ag-ui"]
    event_type: Literal["CUSTOM"]
    protocol_event_id: str | None = None
    custom_event: CustomInteractionDescriptor


class InteractionPayloadArtifactRef(PetraModel):
    artifact_id: str
    content_sha256: str
    byte_size: int
    media_type: str


class InteractionVisibility(PetraModel):
    audience: Literal["researcher", "project", "private_system"]
    redaction: Literal["none", "metadata_only", "payload_withheld"]
    reason: str | None = None


class NoInteractionAuthorityEffect(PetraModel):
    effect_kind: Literal["none"]


class InteractionCommandRef(PetraModel):
    command_id: str
    idempotency_key: str
    command_hash: str


class ReferencedInteractionAuthorityEffect(PetraModel):
    effect_kind: Literal["command_proposed", "command_result_observed"]
    command_ref: InteractionCommandRef


class InteractionEventContent(PetraModel):
    protocol: StandardInteractionProtocolEvent | CustomInteractionProtocolEvent
    semantic_kind: Literal[
        "run_lifecycle",
        "assistant_text",
        "activity",
        "tool_proposal",
        "state_projection",
        "interrupt",
        "error",
        "custom",
    ]
    payload_artifact_ref: InteractionPayloadArtifactRef
    visibility: InteractionVisibility
    authority_effect: (
        NoInteractionAuthorityEffect | ReferencedInteractionAuthorityEffect
    )


class PetraInteractionEventRecord(PetraModel):
    schema_name: Literal["petra.interaction-event-record"]
    schema_version: Literal["1.0.0"]
    interaction_event_record_id: str
    revision: Literal[1]
    project_id: str
    interaction_run_ref: InteractionRunRef
    sequence: int
    lineage: StartEventLineage | ContinuedEventLineage
    content: InteractionEventContent
    content_hash: str
    recorded_by: ActorRef
    recorded_at: str


class InteractionEventRecordRef(PetraModel):
    interaction_event_record_id: str
    sequence: int
    content_hash: str


class PendingInteractionInterrupt(PetraModel):
    state: Literal["pending"]
    interrupt_kind: Literal[
        "clarification", "review", "approval", "correction", "budget_escalation"
    ]
    request_event_ref: InteractionEventRecordRef
    subject_refs: list[str]
    prompt_artifact_ref: InteractionPayloadArtifactRef
    response_schema_ref: InteractionSchemaRef
    authority_effect: Literal["none"]


class RespondedInteractionInterrupt(PetraModel):
    state: Literal["responded"]
    interrupt_kind: Literal[
        "clarification", "review", "approval", "correction", "budget_escalation"
    ]
    request_event_ref: InteractionEventRecordRef
    subject_refs: list[str]
    response_artifact_ref: InteractionPayloadArtifactRef
    responded_by: ActorRef
    resulting_command_ref: InteractionCommandRef
    authority_effect: Literal["command_input_only"]


class ClosedInteractionInterrupt(PetraModel):
    state: Literal["closed_without_response"]
    interrupt_kind: Literal[
        "clarification", "review", "approval", "correction", "budget_escalation"
    ]
    request_event_ref: InteractionEventRecordRef
    subject_refs: list[str]
    close_reason: Literal["expired", "withdrawn", "superseded"]
    authority_effect: Literal["none"]


class PetraInteractionInterrupt(PetraModel):
    schema_name: Literal["petra.interaction-interrupt"]
    schema_version: Literal["1.0.0"]
    interaction_interrupt_id: str
    revision: int
    project_id: str
    interaction_run_ref: InteractionRunRef
    lineage: InteractionRootLineage | InteractionRevisionLineage
    content: (
        PendingInteractionInterrupt
        | RespondedInteractionInterrupt
        | ClosedInteractionInterrupt
    )
    content_hash: str
    recorded_by: ActorRef
    created_at: str
    updated_at: str


class InteractionReplayRequest(PetraModel):
    delivery_kind: Literal["initial", "resume", "replay"]
    after_sequence: int


class CompletedReplayOutcome(PetraModel):
    outcome_kind: Literal["completed"]


class AbortedReplayOutcome(PetraModel):
    outcome_kind: Literal["connection_aborted"]
    last_delivered_sequence: int


class ReplayError(PetraModel):
    code: str
    message: str


class FailedReplayOutcome(PetraModel):
    outcome_kind: Literal["write_error"]
    last_delivered_sequence: int
    error: ReplayError


class InteractionWorkUnitObservation(PetraModel):
    work_unit_id: str
    revision: int
    status: Literal[
        "requested",
        "queued",
        "running",
        "checkpointed",
        "succeeded",
        "failed",
        "cancelled",
    ]


class InteractionReplayAuthorityBoundary(PetraModel):
    authority_reapplied: Literal[False]
    commands_reexecuted: Literal[False]
    durable_work_cancelled: Literal[False]


class InteractionReplayContent(PetraModel):
    connection_id: str
    attempt: int
    request: InteractionReplayRequest
    started_at: str
    completed_at: str
    delivered_event_refs: list[InteractionEventRecordRef]
    outcome: CompletedReplayOutcome | AbortedReplayOutcome | FailedReplayOutcome
    work_unit_observation: InteractionWorkUnitObservation
    authority_boundary: InteractionReplayAuthorityBoundary


class PetraInteractionReplayRecord(PetraModel):
    schema_name: Literal["petra.interaction-replay-record"]
    schema_version: Literal["1.0.0"]
    interaction_replay_record_id: str
    revision: Literal[1]
    project_id: str
    interaction_run_ref: InteractionRunRef
    content: InteractionReplayContent
    content_hash: str
    recorded_by: ActorRef
    recorded_at: str


class PetraModelExtractorOutput(PetraModel):
    schema_name: Literal["petra.model-extractor-output"]
    schema_version: Literal["1.0.0"]
    candidates: list[dict[str, Any]]
    diagnostics: list[dict[str, Any]]


class PetraModelSynthesistOutput(PetraModel):
    schema_name: Literal["petra.model-synthesist-output"]
    schema_version: Literal["1.0.0"]
    statements: list[dict[str, Any]]
    coverage: dict[str, Any]


class PetraModelRoleCertification(PetraModel):
    schema_name: Literal["petra.model-role-certification"]
    schema_version: Literal["1.0.0"]
    role_certification_id: str
    revision: Literal[1]
    deployment: dict[str, Any]
    role_profile: dict[str, Any]
    scope: dict[str, Any]
    evaluation: dict[str, Any]
    decision: dict[str, Any]
    content_hash: str
    certified_by: ActorRef
    certified_at: str


class PetraModelRequest(PetraModel):
    schema_name: Literal["petra.model-request"]
    schema_version: Literal["1.0.0"]
    model_request_id: str
    revision: Literal[1]
    content: dict[str, Any]
    content_hash: str
    created_at: str
    completed_at: str


class PetraModelCall(PetraModel):
    schema_name: Literal["petra.model-call"]
    schema_version: Literal["1.0.0"]
    model_call_id: str
    revision: Literal[1]
    content: dict[str, Any]
    content_hash: str
    started_at: str
    completed_at: str


class PetraSynthesistRoleCertification(PetraModel):
    schema_name: Literal["petra.model-role-certification"]
    schema_version: Literal["1.1.0"]
    role_certification_id: str
    revision: Literal[1]
    deployment: dict[str, Any]
    role_profile: dict[str, Any]
    scope: dict[str, Any]
    evaluation: dict[str, Any]
    decision: dict[str, Any]
    content_hash: str
    certified_by: ActorRef
    certified_at: str


class PetraSynthesistModelRequest(PetraModel):
    schema_name: Literal["petra.model-request"]
    schema_version: Literal["1.1.0"]
    model_request_id: str
    revision: Literal[1]
    content: dict[str, Any]
    content_hash: str
    created_at: str
    completed_at: str


class PetraSynthesistModelCall(PetraModel):
    schema_name: Literal["petra.model-call"]
    schema_version: Literal["1.1.0"]
    model_call_id: str
    revision: Literal[1]
    content: dict[str, Any]
    content_hash: str
    started_at: str
    completed_at: str


class ReviewInterruptRef(PetraModel):
    interaction_interrupt_id: str
    revision: int
    content_hash: str


class ReviewChangeSetRef(PetraModel):
    change_set_id: str
    revision: int
    content_hash: str


class PetraReviewInterruptResponse(PetraModel):
    schema_name: Literal["petra.review-interrupt-response"]
    schema_version: Literal["1.0.0"]
    client_response_id: str
    project_id: str
    interaction_run_id: str
    interrupt_ref: ReviewInterruptRef
    change_set_ref: ReviewChangeSetRef
    decision: Literal["accept", "reject"]
    rationale: str
    decided_at: str


class GroundedResponseArtifactRef(PetraModel):
    artifact_id: str
    content_hash: str
    byte_size: int
    media_type: Literal["text/markdown; charset=utf-8"]


class GroundedContextPacketRef(PetraModel):
    context_packet_id: str
    revision: Literal[1]
    content_hash: str


class GroundedEvidencePacketRef(PetraModel):
    evidence_packet_id: str
    revision: Literal[1]
    content_hash: str


class GroundedExecutionRef(PetraModel):
    model_request_id: str
    model_call_id: str
    model_deployment_id: str
    role_certification_id: str


class GroundedInteractionRef(PetraModel):
    interaction_run_ref: InteractionRunRef
    work_unit_ref: InteractionWorkUnitRef


class GroundedDependency(PetraModel):
    dependency_role: Literal["selected_evidence", "provenance", "control"]
    object_ref: PacketObjectRef


class GroundedReusableCache(PetraModel):
    state: Literal["reusable"]
    cache_key: str
    checked_at: str


class GroundedInvalidationCause(PetraModel):
    event_id: str
    event_type: Literal["change_set.applied", "change_set.reverted"]
    change_set_id: str


class GroundedInvalidatedCache(PetraModel):
    state: Literal["invalidated"]
    cache_key: str
    checked_at: str
    invalidated_by: list[GroundedInvalidationCause]
    affected_dependency_ids: list[str]


class GroundedPersistedTerminal(PetraModel):
    state: Literal["completed"]
    persisted_at: str
    authority_effect: Literal["none"]


class GroundedResponseContent(PetraModel):
    response_artifact_ref: GroundedResponseArtifactRef
    context_packet_ref: GroundedContextPacketRef
    evidence_packet_ref: GroundedEvidencePacketRef
    snapshot_ref: PacketSnapshotRef
    execution_ref: GroundedExecutionRef
    interaction_ref: GroundedInteractionRef
    dependencies: list[GroundedDependency]
    model_output_hash: str
    cache: GroundedReusableCache | GroundedInvalidatedCache
    terminal: GroundedPersistedTerminal


class PetraGroundedResponse(PetraModel):
    schema_name: Literal["petra.grounded-response"]
    schema_version: Literal["1.0.0"]
    grounded_response_id: str
    revision: int
    project_id: str
    lineage: InteractionRootLineage | InteractionRevisionLineage
    content: GroundedResponseContent
    content_hash: str
    recorded_by: ProjectionServiceActorRef
    recorded_at: str


class SuggestedActionRef(PetraModel):
    suggested_action_id: str
    revision: Literal[1]
    content_hash: str


class SuggestedActionDefinitionRef(PetraModel):
    project_definition_id: str
    revision: int
    content_hash: str
    record_hash: str
    definition_family: str


class SuggestedActionObjective(PetraModel):
    objective_ref: ProjectInquiryObjectiveRef
    semantic_key: str
    statement: str


class SuggestedActionInquiryLinkRef(PetraModel):
    project_inquiry_link_id: str
    content_hash: str
    record_hash: str


class SuggestedActionBasis(PetraModel):
    derivation: Literal["exact_immutable_inquiry_result_link"]
    project_definition_ref: SuggestedActionDefinitionRef
    inquiry_result_link_ref: SuggestedActionInquiryLinkRef
    result_ref: ProjectInquiryTypedRecordRef
    snapshot_ref: PacketSnapshotRef
    produced_by_work_ref: ProjectInquiryWorkUnitRef | None = None


class SuggestedActionScope(PetraModel):
    scope_kind: Literal["exact_existing_result"]
    included: str
    excluded: list[str]


class SuggestedActionReady(PetraModel):
    state: Literal["ready"]
    reason_code: Literal["exact_existing_result_available"]
    reason: str
    missing_prerequisites: list[str]


class SuggestedActionStale(PetraModel):
    state: Literal["stale"]
    reason_code: Literal[
        "project_definition_changed",
        "objective_changed",
        "objective_inactive",
        "result_invalidated",
    ]
    reason: str
    missing_prerequisites: list[str]


class SuggestedActionResponseDepth(PetraModel):
    allowed: list[Literal["current_graph"]]
    recommended: Literal["current_graph"]
    adjustable: Literal[False]


class SuggestedActionExpectedResult(PetraModel):
    state: Literal["already_available"]
    result_kind: Literal["grounded_response"]
    result_ref: ProjectInquiryTypedRecordRef
    authority_effect: Literal["none"]
    reusable: bool


class SuggestedActionResources(PetraModel):
    duration: Literal["not_required"]
    cost: Literal["not_required"]
    basis: Literal["read_only_existing_result"]


class SuggestedActionCapability(PetraModel):
    capability_key: Literal["petra.project-inquiry.read"]
    grant_status: Literal["satisfied_by_authenticated_project_read"]
    approval: Literal["not_required"]


class SuggestedActionInterrupt(PetraModel):
    expectation: Literal["none"]


class SuggestedActionCancellation(PetraModel):
    consequence: Literal["not_applicable_no_work_started"]


class SuggestedActionCompletedWork(PetraModel):
    state: Literal["completed"]
    work_unit_ref: ProjectInquiryWorkUnitRef
    terminal_outcome: ProjectWorkTerminalOutcome


class SuggestedActionUnavailableWork(PetraModel):
    state: Literal["unavailable"]
    reason: str


class SuggestedActionInvocation(PetraModel):
    kind: Literal["authenticated_read"]
    contract_name: Literal["petra.project-inquiry-view"]
    contract_version: Literal["1.0.0"]
    operation: Literal["get_project_inquiry_detail"]
    project_id: str
    objective_ref: ProjectInquiryObjectiveRef
    place_role: Literal["brief"]
    task_intent: Literal["inspect"]
    idempotency: Literal["safe_exact_read"]


class SuggestedAction(PetraModel):
    action_kind: Literal["inspect_existing_inquiry_result"]
    title: str
    objective: SuggestedActionObjective
    reason: str
    basis: SuggestedActionBasis
    scope: SuggestedActionScope
    missing_information: list[str]
    response_depth: SuggestedActionResponseDepth
    expected_result: SuggestedActionExpectedResult
    resources: SuggestedActionResources
    capability: SuggestedActionCapability
    interrupt: SuggestedActionInterrupt
    cancellation: SuggestedActionCancellation
    background_work: SuggestedActionCompletedWork | SuggestedActionUnavailableWork
    invocation: SuggestedActionInvocation


class SuggestedActionOperation(PetraModel):
    state: Literal["read_only"]
    work_start: Literal["not_performed"]
    authority_change: Literal["none"]


class SuggestedActionAuthority(PetraModel):
    isolation: Literal["repeatable_read"]
    event_position: int
    stream_revision: int


class SuggestedActionViewContent(PetraModel):
    view_kind: Literal["preview"]
    action_ref: SuggestedActionRef
    action: SuggestedAction
    readiness: SuggestedActionReady | SuggestedActionStale
    operation: SuggestedActionOperation
    authority: SuggestedActionAuthority
    limitations: list[str]


class PetraSuggestedActionView(PetraModel):
    schema_name: Literal["petra.suggested-action-view"]
    schema_version: Literal["1.0.0"]
    project_id: str
    content: SuggestedActionViewContent
    content_hash: str
    read_at: str


PYDANTIC_MODELS_V100: dict[str, type[BaseModel]] = {
    "contract-smoke": ContractSmoke,
    "actor": PetraActor,
    "capability-grant": PetraCapabilityGrant,
    "capability-grant-revocation": PetraCapabilityGrantRevocation,
    "project": PetraProject,
    "project-definition": PetraProjectDefinition,
    "project-objective": PetraProjectObjective,
    "project-shell-view": PetraProjectShellView,
    "project-history-view": PetraProjectHistoryView,
    "project-history-episode-view": PetraProjectHistoryEpisodeView,
    "project-history-retained-view": PetraProjectHistoryRetainedView,
    "project-history-retained-continuation-failure": (
        PetraProjectHistoryRetainedContinuationFailure
    ),
    "project-history-impact-view": PetraProjectHistoryImpactView,
    "project-history-recovery-assessment-view": (
        PetraProjectHistoryRecoveryAssessmentView
    ),
    "project-history-compensation-preview-view": (
        PetraProjectHistoryCompensationPreviewView
    ),
    "project-history-compensation-plan-request": (
        PetraProjectHistoryCompensationPlanRequest
    ),
    "project-history-compensation-plan-view": PetraProjectHistoryCompensationPlanView,
    "project-history-compensation-execution-request": (
        PetraProjectHistoryCompensationExecutionRequest
    ),
    "project-history-compensation-execution-view": (
        PetraProjectHistoryCompensationExecutionView
    ),
    "project-effective-controls-view": PetraProjectEffectiveControlsView,
    "project-source": PetraProjectSource,
    "project-source-replacement": PetraProjectSourceReplacement,
    "project-source-replacement-retraction": PetraProjectSourceReplacementRetraction,
    "project-source-replacement-receipt": PetraProjectSourceReplacementReceipt,
    "project-source-view": PetraProjectSourceView,
    "project-source-lifecycle-view": PetraProjectSourceLifecycleView,
    "project-source-lifecycle-receipt": PetraProjectSourceLifecycleReceipt,
    "review-session": PetraReviewSession,
    "project-review-view": PetraProjectReviewView,
    "project-relationship-view": PetraProjectRelationshipView,
    "project-object-location-view": PetraProjectObjectLocationView,
    "project-work-view": PetraProjectWorkView,
    "project-inquiry-role": PetraProjectInquiryRole,
    "project-inquiry-link": PetraProjectInquiryLink,
    "project-inquiry-view": PetraProjectInquiryView,
    "suggested-action-view": PetraSuggestedActionView,
    "project-thread": PetraProjectThread,
    "project-thread-view": PetraProjectThreadView,
    "author": PetraAuthor,
    "work": PetraWork,
    "work-version": PetraWorkVersion,
    "external-identifier": PetraExternalIdentifier,
    "artifact": PetraArtifact,
    "artifact-manifest": PetraArtifactManifest,
    "rights-decision": PetraRightsDecision,
    "parsed-document": PetraParsedDocument,
    "structural-block": PetraStructuralBlock,
    "source-span": PetraSourceSpan,
    "document-parse-bundle": PetraDocumentParseBundle,
    "evidence-proposal-bundle": PetraEvidenceProposalBundle,
    "model-extractor-output": PetraModelExtractorOutput,
    "model-synthesist-output": PetraModelSynthesistOutput,
    "model-role-certification": PetraModelRoleCertification,
    "model-request": PetraModelRequest,
    "model-call": PetraModelCall,
    "claim": PetraClaim,
    "assertion": PetraAssertion,
    "change-set": PetraChangeSet,
    "approval": PetraApproval,
    "command-envelope": PetraCommandEnvelope,
    "domain-event": PetraDomainEvent,
    "outbox-record": PetraOutboxRecord,
    "worker-input-manifest": PetraWorkerInputManifest,
    "worker-output-manifest": PetraWorkerOutputManifest,
    "work-unit": PetraWorkUnit,
    "work-unit-cancellation": PetraWorkUnitCancellation,
    "graph-projection-record": PetraGraphProjectionRecord,
    "projection-checkpoint": PetraProjectionCheckpoint,
    "context-packet": PetraContextPacket,
    "evidence-packet": PetraEvidencePacket,
    "grounded-response": PetraGroundedResponse,
    "composition-request": PetraCompositionRequest,
    "composition-plan": PetraCompositionPlan,
    "draft-artifact": PetraDraftArtifact,
    "draft-span": PetraDraftSpan,
    "provenance-map": PetraProvenanceMap,
    "citation-bundle": PetraCitationBundle,
    "draft-support-assessment": PetraDraftSupportAssessment,
    "felicity-revision-record": PetraFelicityRevisionRecord,
    "rendered-artifact": PetraRenderedArtifact,
    "interaction-feature-manifest": PetraInteractionFeatureManifest,
    "interaction-custom-event": PetraInteractionCustomEvent,
    "interaction-run": PetraInteractionRun,
    "interaction-event-record": PetraInteractionEventRecord,
    "interaction-interrupt": PetraInteractionInterrupt,
    "review-interrupt-response": PetraReviewInterruptResponse,
    "interaction-replay-record": PetraInteractionReplayRecord,
}
PYDANTIC_MODELS: dict[tuple[str, str], type[BaseModel]] = {
    (name, "1.0.0"): model for name, model in PYDANTIC_MODELS_V100.items()
}
PYDANTIC_MODELS.update(
    {
        ("capability-grant", "1.1.0"): PetraCapabilityGrantV110,
        ("change-set", "1.1.0"): PetraChangeSetV110,
        ("command-envelope", "1.1.0"): PetraCommandEnvelopeV110,
        ("domain-event", "1.1.0"): PetraDomainEventV110,
        ("outbox-record", "1.1.0"): PetraOutboxRecordV110,
        ("command-envelope", "1.2.0"): PetraCommandEnvelopeV120,
        ("command-envelope", "1.3.0"): PetraCommandEnvelopeV130,
        ("domain-event", "1.2.0"): PetraDomainEventV120,
        ("outbox-record", "1.2.0"): PetraOutboxRecordV120,
        (
            "model-role-certification",
            "1.1.0",
        ): PetraSynthesistRoleCertification,
        ("model-request", "1.1.0"): PetraSynthesistModelRequest,
        ("model-call", "1.1.0"): PetraSynthesistModelCall,
        ("project-shell-view", "1.1.0"): PetraProjectShellViewV110,
        (
            "project-history-episode-view",
            "1.1.0",
        ): PetraProjectHistoryEpisodeViewV110,
        (
            "project-history-episode-view",
            "1.2.0",
        ): PetraProjectHistoryEpisodeViewV120,
        (
            "project-history-retained-view",
            "1.1.0",
        ): PetraProjectHistoryRetainedViewV110,
        (
            "project-history-retained-view",
            "1.2.0",
        ): PetraProjectHistoryRetainedViewV120,
        (
            "project-history-impact-view",
            "1.1.0",
        ): PetraProjectHistoryImpactViewV110,
        (
            "project-history-impact-view",
            "1.2.0",
        ): PetraProjectHistoryImpactViewV120,
        (
            "project-history-impact-view",
            "1.3.0",
        ): PetraProjectHistoryImpactViewV130,
        (
            "project-history-impact-view",
            "1.4.0",
        ): PetraProjectHistoryImpactViewV140,
    }
)


def test_registry_and_draft_2020_12_schemas() -> None:
    for entry in REGISTRY["schemas"]:
        schema = SCHEMAS[(entry["name"], entry["version"])]
        Draft202012Validator.check_schema(schema)
        assert schema["$id"] == entry["$id"]
        canonical = rfc8785.dumps(schema)
        digest = hashlib.sha256(canonical).hexdigest()
        assert f"sha256:{digest}" == entry["canonical_sha256"]


def test_accepted_contract_parity_without_mutation() -> None:
    for fixture in MANIFEST["accepted"]:
        value = read_json(fixture["path"])
        before = json.loads(json.dumps(value))
        key = (fixture["schema"], fixture.get("version", "1.0.0"))
        VALIDATORS[key].validate(value)
        assert value == before

        model = PYDANTIC_MODELS[key].model_validate(value, strict=True)
        result = model.model_dump(mode="json", exclude_none=True)
        assert result == value
        VALIDATORS[key].validate(result)


def test_rejected_contract_parity() -> None:
    for fixture in MANIFEST["rejected"]:
        value = read_json(fixture["path"])
        key = (fixture["schema"], fixture.get("version", "1.0.0"))
        assert not VALIDATORS[key].is_valid(value), fixture["path"]


def test_rfc_8785_hash_parity() -> None:
    for fixture_entry in MANIFEST["canonical"]:
        fixture = read_json(fixture_entry["path"])
        key = (
            fixture_entry["schema"],
            fixture_entry.get("version", "1.0.0"),
        )
        VALIDATORS[key].validate(fixture["input"])
        canonical = rfc8785.dumps(fixture["input"])
        digest = hashlib.sha256(canonical).hexdigest()

        assert canonical.decode("utf-8") == fixture["canonical"]
        assert f"sha256:{digest}" == fixture["sha256"]


def test_change_set_content_hash_parity() -> None:
    change_set = read_json("fixtures/accepted/change-set.json")
    canonical = rfc8785.dumps(change_set["content"])
    digest = hashlib.sha256(canonical).hexdigest()

    assert change_set["content_hash"] == f"sha256:{digest}"


def test_worker_manifest_and_work_unit_hash_parity() -> None:
    fixtures = [
        ("capability-grant-v1-1.json", "content", "content_hash"),
        ("worker-input-manifest.json", "content", "content_hash"),
        ("worker-output-manifest.json", "content", "content_hash"),
        ("work-unit-requested.json", "spec", "spec_hash"),
        ("work-unit-completed.json", "spec", "spec_hash"),
        ("graph-projection-record-failed.json", "content", "content_hash"),
        ("graph-projection-record-applied.json", "content", "content_hash"),
        ("projection-checkpoint-catching-up.json", "content", "content_hash"),
        ("projection-checkpoint-blocked.json", "content", "content_hash"),
        ("projection-checkpoint-current.json", "content", "content_hash"),
        ("context-packet.json", "content", "content_hash"),
        ("evidence-packet.json", "content", "content_hash"),
        ("draft-artifact.json", "content", "content_hash"),
        ("draft-span-report.json", "content", "content_hash"),
        ("draft-span-qualification.json", "content", "content_hash"),
        ("provenance-map.json", "content", "content_hash"),
        ("citation-bundle.json", "content", "content_hash"),
        ("draft-support-assessment-stale.json", "content", "content_hash"),
        ("felicity-revision-record.json", "content", "content_hash"),
        ("rendered-artifact-markdown.json", "content", "content_hash"),
        ("rendered-artifact-latex.json", "content", "content_hash"),
        ("rendered-artifact-bibtex.json", "content", "content_hash"),
        ("interaction-feature-manifest.json", "content", "content_hash"),
        ("interaction-run.json", "content", "content_hash"),
        ("interaction-event-record.json", "content", "content_hash"),
        ("interaction-interrupt-pending.json", "content", "content_hash"),
        ("interaction-interrupt-responded.json", "content", "content_hash"),
        ("interaction-replay-record.json", "content", "content_hash"),
        ("model-request.json", "content", "content_hash"),
        ("model-call.json", "content", "content_hash"),
        ("project-effective-controls-view.json", "content", "content_hash"),
        ("project-work-view-collection.json", "content", "content_hash"),
        ("project-work-view-detail.json", "content", "content_hash"),
        ("project-inquiry-role.json", "content", "content_hash"),
        ("project-inquiry-work-link.json", "content", "content_hash"),
        ("project-inquiry-result-link.json", "content", "content_hash"),
        ("project-inquiry-view-collection.json", "content", "content_hash"),
        ("project-inquiry-view-detail.json", "content", "content_hash"),
        ("suggested-action-view.json", "content", "content_hash"),
        ("project-thread.json", "content", "content_hash"),
        ("project-thread-view-collection.json", "content", "content_hash"),
        ("project-thread-view-detail.json", "content", "content_hash"),
        (
            "project-history-compensation-execution-view.json",
            "content",
            "content_hash",
        ),
        ("project-source-lifecycle-view.json", "content", "content_hash"),
        ("project-source-lifecycle-receipt.json", "content", "content_hash"),
        ("project-source-replacement.json", "content", "content_hash"),
        (
            "project-source-replacement-retraction.json",
            "content",
            "content_hash",
        ),
        (
            "project-source-replacement-receipt-created.json",
            "content",
            "content_hash",
        ),
        (
            "project-source-replacement-receipt-retracted.json",
            "content",
            "content_hash",
        ),
    ]
    for filename, projection, hash_field in fixtures:
        value = read_json(f"fixtures/accepted/{filename}")
        canonical = rfc8785.dumps(value[projection])
        digest = hashlib.sha256(canonical).hexdigest()
        assert value[hash_field] == f"sha256:{digest}"


def test_model_certification_hash_parity() -> None:
    value = read_json("fixtures/accepted/model-role-certification.json")
    projection = {
        field: value[field]
        for field in ["deployment", "role_profile", "scope", "evaluation", "decision"]
    }
    digest = hashlib.sha256(rfc8785.dumps(projection)).hexdigest()
    assert value["content_hash"] == f"sha256:{digest}"


def test_draft_span_text_hash_parity() -> None:
    for filename in ["draft-span-report.json", "draft-span-qualification.json"]:
        value = read_json(f"fixtures/accepted/{filename}")
        digest = hashlib.sha256(value["content"]["exact_text"].encode()).hexdigest()
        assert value["content"]["exact_text_hash"] == f"sha256:{digest}"


def test_graph_projection_effect_hash_parity() -> None:
    value = read_json("fixtures/accepted/graph-projection-record-applied.json")
    outcome = value["content"]["outcome"]
    canonical = rfc8785.dumps(outcome["effect"])
    digest = hashlib.sha256(canonical).hexdigest()

    assert outcome["effect_hash"] == f"sha256:{digest}"


def common_definition_validator(definition: str) -> Draft202012Validator:
    schema = {"$ref": f"{COMMON_SCHEMA_ID}#/$defs/{definition}"}
    return Draft202012Validator(
        schema,
        registry=RESOURCE_REGISTRY,
        format_checker=FormatChecker(),
    )


def test_portable_foundation_values_without_mutation() -> None:
    values = read_json("fixtures/accepted/foundation-values.json")
    before = json.loads(json.dumps(values))
    for field, definition in FOUNDATION_DEFINITIONS.items():
        common_definition_validator(definition).validate(values[field])
    assert values == before


def test_rejected_foundation_values() -> None:
    fixtures = read_json("fixtures/rejected/foundation-values.json")
    for fixture in fixtures:
        validator = common_definition_validator(fixture["definition"])
        assert not validator.is_valid(fixture["value"]), fixture["definition"]
