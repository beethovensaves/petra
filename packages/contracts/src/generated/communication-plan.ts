/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CallContent = {
  model_request_id: string;
  attempt: number;
  attempt_kind: "initial" | "retry" | "schema_repair" | "fallback";
  deployment: DeploymentObservation;
  prompt_profile: PromptProfile;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  parameters_hash: string;
  output_contract: OutputContract;
  input: ExactInput;
  provider_request_id?: string;
  outcome:
    "success" | "validation_failed" | "provider_error" | "refusal" | "timeout";
  raw_output?: unknown;
  output?: PetraModelSynthesistOutput;
  failure?: Failure;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validation: [ValidatorResult, ...ValidatorResult[]];
  timing: Timing;
  usage: Usage;
  cost: Cost;
};
/**
 * @maxItems 100
 */
export type Limitations = string[];

export interface PetraCommunicationPlan {
  schema_name: "petra.communication-plan";
  schema_version: "1.0.0";
  project_id: string;
  content_hash: string;
  read_at: string;
  content: {
    composition_definition: PetraProjectDefinition;
    profile: PetraScientificCommunicationPayload;
    source_response: PetraGroundedResponse;
    current_response: PetraGroundedResponse;
    context_packet: PetraContextPacket;
    evidence_packet: PetraEvidencePacket;
    model_call: PetraSynthesistModelCall;
    artifact: PetraArtifact;
    /**
     * @maxItems 10000
     */
    actors: PetraActor[];
    /**
     * @maxItems 10000
     */
    source_records: (
      PetraClaim | PetraAssertion | PetraSourceSpan | PetraWorkVersion
    )[];
    thread: PetraProjectThread | null;
    project_turn_id: string | null;
    invocation: PetraSuggestedActionInvocationView | null;
    delivery: PetraInteractionRun;
    /**
     * @maxItems 10000
     */
    segments: CommunicationSegment[];
    validation: PetraCommunicationValidationReceipt;
    /**
     * @maxItems 10000
     */
    reference_labels: {
      canonical_id: string;
      revision: number;
      content_hash: string;
      semantic_key: string;
      first_reference: string;
      later_reference: string;
      text_alternative: string;
      /**
       * @maxItems 10000
       */
      limitations: string[];
      source_language: string | null;
    }[];
    composition_binding: {
      plan_contract_hash: string;
      validator_contract_hash: string;
      profile_contract_hash: string;
      locale: "en";
      renderer: "not_implemented";
    };
    source_time_binding: {
      communication: "not_recorded";
      renderer: "not_recorded";
      terminology: "not_recorded";
      definition: "exact_thread_turn_binding" | "unavailable";
      prompt: "exact_model_call_prompt_profile";
      validators: "exact_model_call_validation_records";
    };
    authority: {
      isolation: "repeatable_read";
      event_position: number;
      stream_revision: number;
      effect: "none";
      projection: "not_observed";
    };
    history_coverage: "invocation_work_revisions_first_100_when_linked";
    /**
     * @maxItems 10000
     */
    limitations: string[];
    current_invocation_delivery: PetraInteractionRun | null;
  };
}
/**
 * An immutable Project-owned semantic definition revision. Reusable templates may seed it but never remain a mutable dependency.
 */
export interface PetraProjectDefinition {
  schema_name: "petra.project-definition";
  schema_version: "1.0.0";
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  definition_family: string;
  origin:
    | {
        origin_kind: "project_authored";
      }
    | {
        origin_kind: "template_seed";
        template_id: string;
        template_version: string;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        template_hash: string;
      };
  content: DefinitionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface DefinitionContent {
  label: string;
  description: string;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  registrations: [Registration, ...Registration[]];
  /**
   * @minItems 3
   * @maxItems 1000
   */
  terms: [Term, Term, Term, ...Term[]];
  /**
   * @minItems 1
   */
  supported_places: [
    (
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    ),
    ...(
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    )[],
  ];
  /**
   * @maxItems 100
   */
  omitted_flows: string[];
}
export interface Registration {
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "validator"
    | "output"
    | "terminology"
    | "presentation_descriptor"
    | "model_context"
    | "prompt"
    | "tool"
    | "model_role"
    | "extension";
  semantic_key: string;
  contract: NamedVersionHash;
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
/**
 * Installed non-executable scientific communication semantics. Registration resolves this exact immutable payload, not arbitrary client-defined rules or response language validation.
 */
export interface PetraScientificCommunicationPayload {
  schema_name: "petra.scientific-communication-payload";
  schema_version: "1.0.0";
  profile: {
    definition_family: "petra.scientific-evidence";
    locale: {
      supported: ["en"];
      unsupported: "closed";
      source_language: "retain_exact_without_translation";
      english_coverage: "registered_terms_and_reference_rules_only";
    };
    origins: {
      source_report: "attributed_report";
      petra_synthesis: "petra_assessment";
      unresolved_inference: "inference";
    };
    structured_fields: {
      force: "unavailable_in_source_schema";
      conditions: "unavailable_in_source_schema";
      inference_rule: "unavailable_in_source_schema";
      author_decision: "unavailable_in_source_schema";
      pronunciation: "unavailable";
      relation_force_vocabulary: "unsupported";
    };
    preservation: [
      "statement_key",
      "statement_order",
      "original_text_bytes",
      "original_origin_subtype",
      "producer_and_attribution",
      "evidence_refs",
      "source_span_selections",
      "limitations",
      "resolution_requirement",
      "packet_coverage",
      "artifact_bytes_and_hashes",
      "evidence_snapshot",
      "source_time_versions",
    ];
    reference_rules: {
      first: "registered_singular_and_canonical_id_and_revision";
      later: "same_as_first";
      ambiguity: "retain_full_canonical_identity_never_guess";
      fallback: "generic_family_and_canonical_id_and_revision_with_visible_limitation";
      replacement: "separate_current_observation_preserve_original";
      quoted_bytes: "never_rewrite";
    };
    reference_owners: [
      {
        semantic_key: "scientific.claim";
        registration_kind: "object_schema";
        contract: {
          name: "petra.claim";
          version: "1.0.0";
          content_hash: "sha256:1cb1f7910202af21e0f8e610c0dcab605db50f8c8466a9c38f0acf69778db196";
        };
        canonical_kind: "claim";
        generic_family: "finding";
        singular: "Claim";
        plural: "Claims";
        revision_policy: "positive_revision";
      },
      {
        semantic_key: "scientific.assertion";
        registration_kind: "relationship_schema";
        contract: {
          name: "petra.assertion";
          version: "1.0.0";
          content_hash: "sha256:2c58656a9a93052112b26a9080c37811e570000de35d0f9240180da1742c8c91";
        };
        canonical_kind: "assertion";
        generic_family: "relationship";
        singular: "Assertion";
        plural: "Assertions";
        revision_policy: "positive_revision";
      },
      {
        semantic_key: "scientific.source-span";
        registration_kind: "object_schema";
        contract: {
          name: "petra.source-span";
          version: "1.0.0";
          content_hash: "sha256:c83b2cbb7c5d224f794f0fc9591edcfcef04fffdcd97e6ff0be07cd2f34db79d";
        };
        canonical_kind: "source_span";
        generic_family: "reference";
        singular: "Source span";
        plural: "Source spans";
        revision_policy: "immutable_revision_one";
      },
      {
        semantic_key: "scientific.work-version";
        registration_kind: "object_schema";
        contract: {
          name: "petra.work-version";
          version: "1.0.0";
          content_hash: "sha256:3a7c3133086af08c3434b1a83243fda095e8a47adbbc69fd4bc4090ac423aca3";
        };
        canonical_kind: "work_version";
        generic_family: "reference";
        singular: "Work version";
        plural: "Work versions";
        revision_policy: "positive_revision";
      },
      {
        semantic_key: "scientific.grounded-response";
        registration_kind: "output";
        contract: {
          name: "petra.grounded-response";
          version: "1.0.0";
          content_hash: "sha256:f3124ac0fe817fcce8d2c9937d73d16a6aa0aa91c648016a019d964c4cba2e3a";
        };
        canonical_kind: "grounded_response";
        generic_family: "output";
        singular: "Grounded response";
        plural: "Grounded responses";
        revision_policy: "positive_revision";
      },
    ];
    response_schema: {
      name: "petra.model-synthesist-output";
      version: "1.0.0";
      content_hash: "sha256:c9feeb397df01f2772c81c53fd2edadf7154c836a273df87a8e47806b500164b";
    };
    action_report: {
      family: "action_report";
      invocation_schema: {
        name: "petra.suggested-action-invocation";
        version: "1.0.0";
        content_hash: "sha256:dc5c0b6719f08f2b8ecae0509d845f70502247b61cc7300c2e48890bc0a9800c";
      };
      invocation_view_schema: {
        name: "petra.suggested-action-invocation-view";
        version: "1.0.0";
        content_hash: "sha256:f820c8fa92962fc0ea53eb16fc8d9a8f99dad75a2c28c778d69f6430977cf302";
      };
      work_schema: {
        name: "petra.work-unit";
        version: "1.0.0";
        content_hash: "sha256:6009a3c4ec45df4f7073189f8ef111e59428392a9c8fec1ee14508aeca04c316";
      };
      rules: {
        link: "exact_response_result_match";
        command: "immutable_acceptance_receipt_not_execution";
        work: "execution_state_and_terminal_outcome_separate";
        result: "availability_not_delivery";
        history: "canonical_command_and_work_revisions_coverage_bounded_at_100";
        authority: "no_scientific_or_inquiry_resolution_effect";
        recovery: "current_server_owned_assessment_only";
        retry_exact_start: "before_work_registration_only_never_terminal_failed_work";
        stop_response: "delivery_only_not_work_cancellation";
        recommendation: "unsupported_without_alternatives_and_preference_basis";
      };
    };
    validation: {
      scope: "profile_registration_and_reference_resolution_only";
      response_language_receipt: "not_implemented";
      existing_synthesis_checks: [
        "model-output-schema@1.0.0",
        "grounded-synthesis@1.0.0",
        "statement-origin-separation@1.0.0",
      ];
      existing_checks_meaning: "retain_original_scope_never_full_language_validation";
      draft_felicity_receipt: "not_applicable_to_response";
      future_required_checks: [
        "family_obligations",
        "reference_fidelity",
        "origin_and_producer",
        "force_preservation",
        "conditions_and_limitations",
        "action_fidelity",
        "progressive_and_terminal_state",
        "equivalent_textual_meaning",
      ];
      repair: "unsupported";
    };
    version_rules: {
      composition: "new_binding_not_source_time_evidence";
      historical: "retain_exact_original_versions_or_explicit_unavailable";
      prompt: "retain_exact_model_call_prompt_profile";
      renderer: "unavailable_until_versioned_composition";
      terminology_reference_discourse: "this_exact_payload_registration";
    };
    prohibited_conflations: [
      "origin_as_force",
      "source_report_as_accepted_finding",
      "synthesis_as_author_judgment",
      "validation_as_authority",
      "command_acceptance_as_work_completion",
      "failed_terminal_work_as_success",
      "result_available_as_delivered",
      "historical_recovery_as_current_permission",
      "inspect_reason_as_preferred_recommendation",
    ];
    textual_equivalence: "same_references_origin_basis_conditions_limitations_state_consequence_and_recovery";
    unsupported_scope: [
      "other_profile_payloads",
      "non_english_realization",
      "full_language_validation",
      "language_repair",
      "plan_composition",
      "receipt_composition",
      "authentication_and_snapshot_reads",
      "renderer_and_accessibility_conformance",
    ];
  };
}
/**
 * A revisioned operational record binding immutable grounded-response bytes to their exact scientific, model, WorkUnit, interaction, and cache dependencies. Invalidation never rewrites the Artifact or scientific authority.
 */
export interface PetraGroundedResponse {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  grounded_response_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  lineage:
    | {
        lineage_kind: "root";
      }
    | {
        lineage_kind: "revision";
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        parent_revision: number;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        parent_hash: string;
      };
  content: Content;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface Content {
  response_artifact_ref: ResponseArtifactRef;
  context_packet_ref: ContextPacketRef;
  evidence_packet_ref: EvidencePacketRef;
  snapshot_ref: SnapshotRef;
  execution_ref: ExecutionRef;
  interaction_ref: InteractionRef;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency, ...Dependency[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  model_output_hash: string;
  cache: ReusableCache | InvalidatedCache;
  terminal: PersistedTerminal;
}
export interface ResponseArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: "text/markdown; charset=utf-8";
}
export interface ContextPacketRef {
  context_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExecutionRef {
  model_request_id: string;
  model_call_id: string;
  model_deployment_id: string;
  role_certification_id: string;
}
export interface InteractionRef {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef;
}
export interface InteractionRunRef {
  interaction_run_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkUnitRef {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
}
export interface Dependency {
  dependency_role: "selected_evidence" | "provenance" | "control";
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
}
export interface ClaimRef {
  object_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface AssertionRef {
  object_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface SourceSpanRef {
  object_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface WorkVersionRef {
  object_kind: "work_version";
  /**
   * A Petra identifier whose kind is work_version.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface ReusableCache {
  state: "reusable";
  cache_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
}
export interface InvalidatedCache {
  state: "invalidated";
  cache_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  invalidated_by: [InvalidationCause, ...InvalidationCause[]];
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_dependency_ids: [string, ...string[]];
}
export interface InvalidationCause {
  event_id: string & string;
  event_type: "change_set.applied" | "change_set.reverted";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
}
export interface PersistedTerminal {
  state: "completed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  persisted_at: string;
  authority_effect: "none";
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
/**
 * An immutable, bounded manifest of the exact scientific records authorized as context for one objective, snapshot, and recipe revision.
 */
export interface PetraContextPacket {
  schema_name: "petra.context-packet";
  schema_version: "1.0.0";
  context_packet_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  recipe_ref: ContextRecipeRef;
  content: ContextPacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface ContextRecipeRef {
  context_recipe_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ContextPacketContent {
  objective: Objective;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  included_objects: [ContextInclusion, ...ContextInclusion[]];
  /**
   * @maxItems 10000
   */
  omissions: (KnownObjectOmission | SearchBoundaryOmission)[];
  coverage: Coverage;
  budget: PacketBudget;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency1, ...Dependency1[]];
}
export interface Objective {
  objective_kind:
    | "answer"
    | "inspect"
    | "compare"
    | "review"
    | "compose"
    | "experiment"
    | "other";
  statement: string;
  /**
   * @maxItems 1000
   */
  target_refs: (ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef)[];
}
export interface ContextInclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  /**
   * @minItems 1
   */
  evidence_roles: [
    (
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    ),
    ...(
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    )[],
  ];
  authority:
    | {
        zone: "quarantine";
        review_state:
          "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
      }
    | {
        zone: "trusted";
        review_state: "machine_checked" | "human_accepted" | "disputed";
      }
    | {
        zone: "personal";
        review_state: "unreviewed" | "human_accepted" | "disputed";
      }
    | {
        zone: "source_record";
        review_state: "not_applicable";
      };
  source_access:
    | "metadata_only"
    | "abstract_only"
    | "full_text_structured"
    | "full_text_analyzed"
    | "not_applicable";
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_refs: string[];
  selection: SelectionTrace;
  estimated_tokens: number;
}
export interface SelectionTrace {
  route:
    | "deterministic_graph"
    | "lexical"
    | "dense"
    | "hybrid"
    | "graph_expansion"
    | "cached"
    | "explicit_user_selection";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  rank: number;
  score?: string;
  reason: string;
}
export interface KnownObjectOmission {
  omission_kind: "known_object";
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
  material: boolean;
  detail: string;
}
export interface SearchBoundaryOmission {
  omission_kind: "search_boundary";
  boundary: string;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
  material: boolean;
  detail: string;
}
export interface Coverage {
  state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  statement: string;
  contrary_evidence_checked: boolean;
}
export interface PacketBudget {
  max_input_tokens: number;
  max_objects: number;
  max_source_spans: number;
  estimated_input_tokens: number;
  included_object_count: number;
  included_source_span_count: number;
  truncated: boolean;
}
export interface Dependency1 {
  dependency_kind:
    "record" | "artifact" | "schema" | "projection" | "ranking" | "policy";
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ServiceActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
/**
 * An immutable composition-specific selection over one exact ContextPacket; inclusion records authorized evidence, not truth.
 */
export interface PetraEvidencePacket {
  schema_name: "petra.evidence-packet";
  schema_version: "1.0.0";
  evidence_packet_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  content: EvidencePacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface EvidencePacketContent {
  context_packet_ref: ContextPacketRef1;
  composition_objective: string;
  temporal_perspective:
    | {
        perspective: "current";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        as_of: string;
      }
    | {
        perspective: "historical" | "comparative";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        as_of: string;
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        historical_boundary: string;
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  selected_evidence: [EvidenceSelection, ...EvidenceSelection[]];
  /**
   * @maxItems 10000
   */
  exclusions: ContextExclusion[];
  coverage: EvidenceCoverage;
  freshness:
    | {
        state: "current_for_snapshot";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
      }
    | {
        state: "stale";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
        /**
         * @minItems 1
         * @maxItems 1000
         *
         * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
         */
        invalidated_by: [string, ...string[]];
      }
    | {
        state: "unknown";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
        reason: string;
      };
}
export interface ContextPacketRef1 {
  context_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidenceSelection {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  bearing:
    | "supporting"
    | "contrary"
    | "qualifying"
    | "conflicting"
    | "background"
    | "unresolved";
  /**
   * @maxItems 10000
   *
   * Items: A one-based optimistic revision within JavaScript's safe-integer range.
   */
  source_span_selection_orders: number[];
  inclusion_reason: string;
  /**
   * @maxItems 100
   */
  use_limitations: string[];
}
export interface ContextExclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  reason:
    | "not_relevant"
    | "redundant"
    | "scope_mismatch"
    | "rights"
    | "budget"
    | "unsupported_depth";
  detail: string;
}
export interface EvidenceCoverage {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
/**
 * One physical bounded synthesist invocation with exact packet input, provider observation, structured output, validation, timing, usage, and cost; it stores no credentials or hidden reasoning.
 */
export interface PetraSynthesistModelCall {
  schema_name: "petra.model-call";
  schema_version: "1.1.0";
  model_call_id: string;
  revision: 1;
  content: CallContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
}
export interface DeploymentObservation {
  model_deployment_id: string;
  provider_id: string;
  provider_kind: string;
  provider_model: string;
  observed_revision: string;
  replayability: "exact" | "best_effort" | "unavailable";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  endpoint_fingerprint: string;
}
export interface PromptProfile {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface OutputContract {
  schema_name: "model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface ExactInput {
  context_packet_ref: ContextPacketRef2;
  evidence_packet_ref: EvidencePacketRef1;
  /**
   * @minItems 1
   * @maxItems 20
   */
  messages:
    | [Message]
    | [Message, Message]
    | [Message, Message, Message]
    | [Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message, Message, Message]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ];
  /**
   * @minItems 1
   * @maxItems 10000
   */
  context_selections: [ContextSelection, ...ContextSelection[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ContextPacketRef2 {
  context_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef1 {
  evidence_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Message {
  role: "system" | "user";
  content: string;
}
export interface ContextSelection {
  context_selection_order: number;
  object_ref: ContextObjectRef;
  rendered_content: string;
  /**
   * @maxItems 1000
   */
  source_span_selection_orders: number[];
}
export interface ContextObjectRef {
  object_kind: "claim" | "assertion" | "source_span" | "work_version";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
/**
 * A provider-neutral bounded scientific response whose material statements declare epistemic origin and exact EvidencePacket references; it contains no authority state or mutation commands.
 */
export interface PetraModelSynthesistOutput {
  schema_name: "petra.model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * @minItems 1
   * @maxItems 100
   */
  statements: [
    (
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    ),
    ...(
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    )[],
  ];
  coverage: CoverageDisclosure;
}
export interface SourceReportStatement {
  statement_key: string;
  origin: "source_report";
  text: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface EvidenceRef {
  context_selection_order: number;
  object_kind: "claim" | "assertion";
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  source_span_selection_orders: [number, ...number[]];
}
export interface PetraSynthesisStatement {
  statement_key: string;
  origin: "petra_synthesis";
  text: string;
  /**
   * @minItems 2
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface UnresolvedInferenceStatement {
  statement_key: string;
  origin: "unresolved_inference";
  text: string;
  /**
   * @maxItems 20
   */
  evidence_refs:
    | []
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
  resolution_requirement: string;
}
export interface CoverageDisclosure {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  material_omissions_acknowledged: boolean;
  abstract_only_sources_used: boolean;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface Timing {
  queue_ms: number;
  first_token_ms?: number;
  total_ms: number;
  validation_ms: number;
}
export interface Usage {
  accounting: "provider_reported" | "estimated" | "unavailable";
  input_tokens: number;
  output_tokens: number;
}
export interface Cost {
  amount: string;
  currency: "USD";
  accounting: "provider_reported" | "computed" | "unavailable";
  pricing_source: string;
}
/**
 * The immutable identity and physical characteristics of an exact byte sequence processed by Petra.
 */
export interface PetraArtifact {
  schema_name: "petra.artifact";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * Artifacts never update in place; changed bytes receive a new identity.
   */
  revision: 1;
  artifact_kind:
    | "pdf"
    | "html"
    | "structured_text"
    | "dataset"
    | "code"
    | "environment_lock"
    | "run_output"
    | "image"
    | "export";
  media_type: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
/**
 * An actor that can create, propose, review, or execute Petra work.
 */
export interface PetraActor {
  schema_name: "petra.actor";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
  display_name: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
/**
 * A proposition with explicit scientific scope, epistemic basis, and authority state; existence does not imply truth.
 */
export interface PetraClaim {
  schema_name: "petra.claim";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is claim.
   */
  claim_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  canonical_text: string;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  normalization_status: "verbatim" | "normalized" | "composed";
  scope: ScientificScope;
  basis: SourceBasis | SynthesisBasis | ResearcherBasis;
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * A Petra identifier whose kind is claim.
   */
  supersedes_claim_id?: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface ScientificScope {
  population?: ScopeDimension;
  language?: ScopeDimension;
  task?: ScopeDimension;
  model_family?: ScopeDimension;
  dataset?: ScopeDimension;
  intervention_or_exposure?: ScopeDimension;
  comparator?: ScopeDimension;
  outcome?: ScopeDimension;
  setting?: ScopeDimension;
  temporal_boundary?: ScopeDimension;
  /**
   * @maxItems 10
   */
  unreported_dimensions:
    | []
    | [
        | "population"
        | "language"
        | "task"
        | "model_family"
        | "dataset"
        | "intervention_or_exposure"
        | "comparator"
        | "outcome"
        | "setting"
        | "temporal_boundary",
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ];
  notes?: string;
}
export interface ScopeDimension {
  description: string;
  /**
   * @maxItems 1000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_refs: string[];
}
export interface SourceBasis {
  basis_kind: "source";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  source_scope: "full_text" | "abstract_only";
  detail_level: "broad" | "detailed";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string, ...string[]];
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
  derivation: Derivation;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validator_results: [ValidatorResult1, ...ValidatorResult1[]];
  extraction_confidence?: number;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface Derivation {
  derivation_kind:
    "deterministic_mapping" | "model_extraction" | "human_extraction";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  derivation_ref: string;
}
export interface ValidatorResult1 {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface SynthesisBasis {
  basis_kind: "synthesis";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is claim.
   */
  basis_claim_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is assertion.
   */
  basis_assertion_ids: string[];
  composition_kind: "human" | "model_assisted" | "deterministic";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  composition_ref: string;
  composed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  composed_at: string;
}
export interface ResearcherBasis {
  basis_kind: "researcher";
  rationale: string;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface QuarantineAuthority {
  zone: "quarantine";
  review_state:
    "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
}
export interface TrustedAuthority {
  zone: "trusted";
  review_state: "machine_checked" | "human_accepted" | "disputed";
  promotion: PromotionBasis;
}
export interface PromotionBasis {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  approval_basis: HumanApprovalBasis | PolicyApprovalBasis;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  applied_at: string;
}
export interface HumanApprovalBasis {
  approval_kind: "human";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  approved_by: ActorRef;
}
export interface PolicyApprovalBasis {
  approval_kind: "review_policy";
  /**
   * A Petra identifier whose kind is review_policy.
   */
  review_policy_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  calibration_ref: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  audit_ref?: string;
}
export interface PersonalAuthority {
  zone: "personal";
  review_state: "unreviewed" | "human_accepted" | "disputed";
  recorded_by: ActorRef;
}
/**
 * A provenance-bearing typed relation whose authority records representation review rather than scientific truth.
 */
export interface PetraAssertion {
  schema_name: "petra.assertion";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  subject_id: string;
  predicate:
    | "VERSION_OF"
    | "REPRESENTED_BY"
    | "LOCATED_IN"
    | "CITES"
    | "CITES_AS_BACKGROUND"
    | "ASSERTS"
    | "ADDRESSES"
    | "SUPPORTS"
    | "CONTRADICTS"
    | "QUALIFIES"
    | "ADOPTS"
    | "DIRECTLY_TESTS"
    | "EXTENDS"
    | "REFRAMES"
    | "CHALLENGES"
    | "CRITIQUES_METHOD"
    | "ASSUMES"
    | "PREDICTS"
    | "RIVAL_OF"
    | "TESTS"
    | "IMPLEMENTS"
    | "USES"
    | "PRODUCED"
    | "ANALYZES"
    | "EVALUATES"
    | "GOVERNS"
    | "INTERPRETS"
    | "COMPOSED_FROM"
    | "GROUNDS"
    | "RENDERS"
    | "REPLICATES"
    | "FAILS_TO_REPLICATE"
    | "INVESTIGATES"
    | "TESTS_CAUSE"
    | "CORRECTS"
    | "DEPENDS_ON"
    | "SUPERSEDES";
  object:
    | EntityObject
    | StringLiteral
    | BooleanLiteral
    | IntegerLiteral
    | DecimalLiteral
    | TimestampLiteral;
  assertion_kind:
    | "source_native"
    | "source_stated"
    | "deterministic_derivation"
    | "model_inference"
    | "human_judgment"
    | "experimental_observation"
    | "synthesis";
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  provenance_refs: [
    (
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    ),
    ...(
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    )[],
  ];
  scope: ScientificScope;
  scope_comparison?: ScopeComparison;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  valid_time?: ValidTime;
  /**
   * A Petra identifier whose kind is assertion.
   */
  supersedes_assertion_id?: string;
  created_by: ActorRef;
}
export interface EntityObject {
  object_kind: "entity";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_id: string;
}
export interface StringLiteral {
  object_kind: "string";
  value: string;
}
export interface BooleanLiteral {
  object_kind: "boolean";
  value: boolean;
}
export interface IntegerLiteral {
  object_kind: "integer";
  value: number;
}
export interface DecimalLiteral {
  object_kind: "decimal";
  value: string;
}
export interface TimestampLiteral {
  object_kind: "timestamp";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  value: string;
}
export interface SourceSpanProvenance {
  provenance_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string;
}
export interface StructuredFieldProvenance {
  provenance_kind: "structured_field";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  json_pointer: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  field_hash: string;
}
export interface AssertionProvenance {
  provenance_kind: "basis_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string;
}
export interface ActorProvenance {
  provenance_kind: "actor";
  actor: ActorRef;
}
export interface RecordProvenance {
  provenance_kind: "record";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  role:
    | "derivation"
    | "input"
    | "output"
    | "model_call"
    | "run"
    | "result"
    | "analysis";
}
export interface ScopeComparison {
  relation:
    "aligned" | "overlapping" | "narrower" | "broader" | "disjoint" | "unknown";
  rationale: string;
}
export interface ValidTime {
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_from?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_to?: string;
}
/**
 * A stable, verifiable region of exactly one immutable source Artifact, aligned through one ParsedDocument and StructuralBlock.
 */
export interface PetraSourceSpan {
  schema_name: "petra.source-span";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  artifact_content_hash: string;
  /**
   * A Petra identifier whose kind is parsed_document.
   */
  parsed_document_id: string;
  /**
   * A Petra identifier whose kind is parser_run.
   */
  parser_run_id: string;
  /**
   * A Petra identifier whose kind is structural_block.
   */
  structural_block_id: string;
  selector_schema_version: "1.0.0";
  selector:
    | TextQuoteSelector
    | PageRegionSelector
    | SectionPathSelector
    | JsonPointerSelector
    | LineRangeSelector
    | CompoundSelector;
  extraction: Extraction;
  verification: Verification;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface TextQuoteSelector {
  selector_type: "text_quote";
  quote: TextQuote;
}
export interface TextQuote {
  exact_text?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  selected_text_hash: string;
  prefix?: string;
  suffix?: string;
  start_codepoint: number;
  end_codepoint: number;
  normalization_version: string;
}
export interface PageRegionSelector {
  selector_type: "page_region";
  page_region: PageRegion;
}
export interface PageRegion {
  page_number: number;
  page_width: number;
  page_height: number;
  unit: "pt" | "px" | "mm";
  coordinate_origin: "top_left" | "bottom_left";
  /**
   * @minItems 1
   * @maxItems 10000
   */
  regions: [BoundingBox | Polygon, ...(BoundingBox | Polygon)[]];
}
export interface BoundingBox {
  region_kind: "bounding_box";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Polygon {
  region_kind: "polygon";
  /**
   * @minItems 3
   * @maxItems 100
   */
  points: [Point, Point, Point, ...Point[]];
}
export interface Point {
  x: number;
  y: number;
}
export interface SectionPathSelector {
  selector_type: "section_path";
  section_path: SectionPath;
}
export interface SectionPath {
  /**
   * @minItems 1
   * @maxItems 100
   */
  segments: [string, ...string[]];
}
export interface JsonPointerSelector {
  selector_type: "json_pointer";
  json_pointer: JsonPointer;
}
export interface JsonPointer {
  pointer: string;
}
export interface LineRangeSelector {
  selector_type: "line_range";
  line_range: LineRange;
}
export interface LineRange {
  start_line: number;
  end_line: number;
}
export interface CompoundSelector {
  selector_type: "compound";
  /**
   * @minItems 2
   * @maxItems 20
   */
  components:
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ];
}
export interface Extraction {
  method:
    | "embedded_text"
    | "ocr"
    | "structured_source"
    | "parser_alignment"
    | "manual_selection"
    | "visual_region";
  method_version: string;
  normalization_version: string;
}
export interface Verification {
  status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  verified_at: string;
  /**
   * @maxItems 100
   */
  transformations: string[];
}
/**
 * One identifiable dated version of a canonical scholarly Work.
 */
export interface PetraWorkVersion {
  schema_name: "petra.work-version";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  /**
   * A publication date that preserves the precision supplied by scholarly metadata instead of inventing a day or time.
   */
  published_date?:
    | {
        precision: "year";
        value: string;
      }
    | {
        precision: "month";
        value: string;
      }
    | {
        precision: "day";
        value: string;
      };
  metadata_source: MetadataSource;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  metadata_retrieved_at: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface MetadataSource {
  source_kind: "registry" | "repository" | "publisher" | "provider" | "user";
  source_name: string;
  source_record_id?: string;
}
/**
 * A revisioned Project-owned product thread whose immutable material turns bind exact inputs, context, execution, Work, and response records without replacing their authority.
 */
export interface PetraProjectThread {
  schema_name: "petra.project-thread";
  schema_version: "1.0.0";
  project_thread_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: DefinitionRef;
  lineage:
    | {
        lineage_kind: "root";
      }
    | {
        lineage_kind: "revision";
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        parent_revision: number;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        parent_hash: string;
      };
  content: ThreadContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface ThreadContent {
  title: string;
  task: string;
  lifecycle: "open" | "archived";
  origin:
    | {
        origin_kind: "root";
      }
    | {
        origin_kind: "branch";
        parent_thread_ref: ThreadRevisionRef;
        parent_turn_id: string;
        continuation_mode:
          "original_snapshot" | "current_snapshot" | "compare_then_continue";
      };
  /**
   * @maxItems 1000
   */
  turns: Turn[];
  retention: Retention;
}
export interface ThreadRevisionRef {
  project_thread_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Turn {
  project_turn_id: string;
  sequence: number;
  previous_turn_id?: string;
  project_definition_ref: DefinitionRef;
  objective_ref?: ObjectiveRef;
  input: HashOnlyInput | RetainedInput;
  context: ContextBinding;
  execution: ExecutionBinding;
  authority_context: AuthorityContext;
  response: CompletedResponse;
  compaction: UnmodifiedCompaction | CompactedContext;
  proposal_decision_linkage: UnavailablePolicy;
  presentation_context: UnavailablePolicy;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ObjectiveRef {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface HashOnlyInput {
  retention_state: "hash_only";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  input_hash: string;
  source_message_id: string;
  limitation: string;
}
export interface RetainedInput {
  retention_state: "retained_artifact";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  input_hash: string;
  source_message_id: string;
  artifact_ref: ExactArtifactRef;
}
export interface ExactArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface ContextBinding {
  context_record_ref: ExactTypedRecordRef;
  snapshot_ref: SnapshotRef;
  included_object_count: number;
  omission_count: number;
  coverage_state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  coverage_statement: string;
}
export interface ExactTypedRecordRef {
  schema_name: string;
  schema_version: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExecutionBinding {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef;
}
export interface AuthorityContext {
  actor: ActorRef;
  capability_grant_id: string;
  privacy_profile_ref: VersionedControlRef;
  budget_profile_ref: VersionedControlRef;
  review_policy: UnavailablePolicy;
}
export interface VersionedControlRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface UnavailablePolicy {
  state: "unavailable";
  reason: string;
}
export interface CompletedResponse {
  state: "completed";
  result_record_ref: ExactTypedRecordRef;
  response_artifact_ref: ExactArtifactRef;
  force: "explanation_only" | "work_update" | "proposal";
  authority_effect: "none";
}
export interface UnmodifiedCompaction {
  state: "unmodified";
}
export interface CompactedContext {
  state: "compacted";
  summary_artifact_ref: ExactArtifactRef;
  covered_through_sequence: number;
  method_ref: ExactTypedRecordRef;
}
export interface Retention {
  state: "retained";
  limitation: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
/**
 * A current read over one immutable SuggestedAction invocation and its canonical WorkUnit, result, InteractionRun, revision history, semantic destinations, and eligible recovery operations.
 */
export interface PetraSuggestedActionInvocationView {
  schema_name: "petra.suggested-action-invocation-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  view_kind: "invocation";
  invocation_ref: InvocationRef;
  invocation: PetraSuggestedActionInvocation;
  operation_state:
    "accepted" | "running" | "completed" | "cancelled" | "failed";
  work:
    | {
        state: "pending_registration";
        expected_work_unit_id: string;
      }
    | {
        state: "available";
        work_unit_ref: WorkUnitRef1;
        input_manifest_ref: RecordRef;
        execution_state:
          | "requested"
          | "queued"
          | "running"
          | "checkpointed"
          | "completed"
          | "cancelled";
        terminal_outcome?:
          | "succeeded"
          | "worker_failed"
          | "validation_failed"
          | "resource_exhausted"
          | "timed_out"
          | "cancelled";
      };
  result:
    | {
        state: "pending";
        reason: string;
      }
    | {
        state: "available";
        result_ref: TypedRecordRef;
        authority_effect: "none";
      }
    | {
        state: "unavailable";
        reason: string;
      };
  interaction: {
    protocol_thread_id: string;
    protocol_run_id: string;
    durable_state: "pending_terminal" | "available";
    interaction_run_ref?: RecordRef;
  };
  interrupt: {
    state: "none_expected";
    delivery_abort_cancels_work: false;
    reconnect: "exact_interaction_replay";
  };
  history: {
    source: "canonical_command_receipt_and_work_unit_revisions";
    command_receipt_ref: InvocationRef;
    /**
     * @maxItems 100
     */
    work_revisions: HistoryEntry[];
    /**
     * @minItems 2
     * @maxItems 2
     */
    destinations: [
      {
        place_role: "work" | "history";
        task_intent: "continue_work" | "view_history";
        object_ref: {
          semantic_key: "petra.work-unit";
          object_id: string;
        };
      },
      {
        place_role: "work" | "history";
        task_intent: "continue_work" | "view_history";
        object_ref: {
          semantic_key: "petra.work-unit";
          object_id: string;
        };
      },
    ];
  };
  recovery: {
    assessment: "current_server_owned";
    /**
     * @minItems 5
     * @maxItems 5
     */
    actions: [
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
      RecoveryAction,
    ];
  };
  authority: AuthorityPosition;
  /**
   * @minItems 1
   * @maxItems 16
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface InvocationRef {
  suggested_action_invocation_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
/**
 * An immutable receipt for one actor-authorized SuggestedAction command accepted against exact action inputs and deterministically bound to one WorkUnit and interaction correlation.
 */
export interface PetraSuggestedActionInvocation {
  schema_name: "petra.suggested-action-invocation";
  schema_version: "1.0.0";
  suggested_action_invocation_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: InvocationContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface InvocationContent {
  command_ref: CommandRef;
  action_ref: SuggestedActionRef;
  response_depth: "current_graph";
  exact_inputs: ExactInputs;
  expected_work_unit_id: string;
  interaction: InteractionCorrelation;
  path_convergence: "direct_and_conversational_same_command";
  authority_effect: "none";
}
export interface CommandRef {
  command_id: string;
  command_name: "InvokeSuggestedAction";
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  capability_grant_id: string;
  actor: ActorRef;
  correlation_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExactInputs {
  project_definition_ref: DefinitionRef1;
  objective_ref: ObjectiveRef1;
  inquiry_result_link_ref: InquiryLinkRef;
  source_result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  context_packet_ref: PacketRef;
  evidence_packet_ref: PacketRef;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  prompt_hash: string;
}
export interface DefinitionRef1 {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface ObjectiveRef1 {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface PacketRef {
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface InteractionCorrelation {
  protocol_thread_id: string;
  protocol_run_id: string;
}
export interface WorkUnitRef1 {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface RecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HistoryEntry {
  work_unit_ref: WorkUnitRef1;
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface RecoveryAction {
  operation:
    | "retry_exact_start"
    | "reconnect_delivery"
    | "cancel_work"
    | "inspect_work"
    | "inspect_result";
  eligibility: "eligible" | "ineligible";
  command_name?: "InvokeSuggestedAction" | "CancelWorkUnit";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
/**
 * A revisioned durable record of one Petra interaction run, its protocol correlation, bounded authority context, WorkUnit linkage, and presentation-stream head. It is not a scientific domain ledger.
 */
export interface PetraInteractionRun {
  schema_name: "petra.interaction-run";
  schema_version: "1.0.0";
  interaction_run_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  feature_manifest_ref: FeatureManifestRef;
  lineage:
    | {
        lineage_kind: "root";
      }
    | {
        lineage_kind: "revision";
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        parent_revision: number;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        parent_hash: string;
      };
  content: RunContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface FeatureManifestRef {
  interaction_feature_manifest_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RunContent {
  correlation: {
    protocol_thread_id: string;
    protocol_run_id: string;
    request_id: string;
    trace_id: string;
    work_unit_ref: WorkUnitRef;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    model_request_id?: string;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    agent_run_id?: string;
  };
  authority_context: {
    actor: ActorRef;
    capability_grant_id: string;
    privacy_profile_ref: VersionedControlRef;
    budget_profile_ref: VersionedControlRef;
  };
  input: {
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    input_hash: string;
    source_message_id: string;
  };
  lifecycle: ActiveLifecycle | AwaitingInterruptLifecycle | TerminalLifecycle;
  stream_head:
    | {
        state: "empty";
        event_count: 0;
      }
    | {
        state: "advanced";
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        event_count: number;
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        latest_sequence: number;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        head_hash: string;
      };
  authority_boundary: {
    interaction_state_is_authoritative: false;
    events_are_domain_ledger: false;
    connection_abort_cancels_work: false;
  };
}
export interface ActiveLifecycle {
  state: "queued" | "running";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
}
export interface AwaitingInterruptLifecycle {
  state: "awaiting_interrupt";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  interaction_interrupt_ids: [string & string, ...(string & string)[]];
}
export interface TerminalLifecycle {
  state: "completed" | "failed" | "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  ended_at: string;
  outcome_code: string;
}
export interface CommunicationSegment {
  segment_key: string;
  order: number;
  family:
    "attributed_report" | "petra_assessment" | "inference" | "action_report";
  original_statement:
    | (
        | SourceReportStatement
        | PetraSynthesisStatement
        | UnresolvedInferenceStatement
      )
    | null;
  preservation: "passed" | "blocked";
  /**
   * @maxItems 10000
   */
  findings: string[];
  force: "unavailable_as_structured_source_data";
  conditions: "unavailable_as_structured_source_data";
  presentation_depth: "material";
  language_validation: "not_performed";
}
export interface PetraCommunicationValidationReceipt {
  schema_name: "petra.communication-validation-receipt";
  schema_version: "1.0.0";
  scope: "structured_preservation_and_reference_fidelity";
  outcome: "blocked";
  /**
   * @maxItems 10000
   */
  checks: CommunicationCheck[];
  language_validation: "incomplete";
  repair_provenance: null;
  /**
   * @maxItems 10000
   */
  limitations: string[];
}
export interface CommunicationCheck {
  check: string;
  status: "passed" | "blocked" | "not_performed";
  /**
   * @maxItems 10000
   */
  findings: string[];
}
