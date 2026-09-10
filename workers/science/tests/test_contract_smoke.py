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
        ("project-thread.json", "content", "content_hash"),
        ("project-thread-view-collection.json", "content", "content_hash"),
        ("project-thread-view-detail.json", "content", "content_hash"),
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
