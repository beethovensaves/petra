# Petra: Minimum Viable Graph and Event Model

Status: design specification
Companion: [PETRA.md](PETRA.md)

Runtime, interface, posture, experiment, and composition decisions: [D007 model gateway and routing](decisions/D007-model-gateway-role-registry-and-routing.md), [D008 graph-guided execution](decisions/D008-graph-guided-execution-context-and-cost.md), [D009 object-centered research workspace](decisions/D009-object-centered-research-workspace.md), [D010 Hypothesis assessment and posture](decisions/D010-hypothesis-assessment-posture-and-obligations.md), [D011 progressive experiment execution](decisions/D011-experiment-sandbox-and-reproducibility.md), and [D012 scoped research artifacts](decisions/D012-scoped-research-artifacts-and-external-adapters.md)

## Purpose

This document defines the smallest graph and event model that can support Petra's first two research pilots without compromising provenance, reversibility, or scientific meaning.

The model is storage-neutral. Petra may use a graph database, relational event store, search index, vector index, and object store together. These are physical projections of one logical contract; none may silently change the meaning of a scientific object or relation.

The key design choice is:

> Petra stores meaningful relations as provenance-bearing assertions and may project accepted assertions as graph edges for retrieval and visualization.

A bare edge is convenient for traversal but insufficient for scientific work. Petra must be able to answer who or what asserted a relation, from which source span or experiment, through which method or model, at what time, under which review status, and within which project or evidence namespace.

The terms **MUST**, **SHOULD**, and **MAY** state requirements, recommendations, and permitted extensions.

---

## Competency questions

The minimum schema is adequate only if it can answer these questions without reconstructing meaning from chat logs:

1. Which exact source passage supports a displayed scientific claim?
2. Did the source state the claim, or did a human or model infer it?
3. What evidence supports, contradicts, or qualifies a hypothesis, and under what scope?
4. Why is a hypothesis in its current development and lifecycle states, and which events changed them?
5. Which ProtocolVersion, ExecutionPlan, and Run produced a Result, using which code, data, model, environment, and configuration?
6. Does a failed run bear on the hypothesis, or only on the attempted implementation?
7. Which graph changes did an agent propose, which were accepted, and by whom?
8. What was the agent permitted to do when an action occurred?
9. What did the trusted graph contain at the time an answer, DraftArtifact, evaluation, or external action was generated?
10. Can a researcher reverse a change without erasing the historical record?
11. Why did Petra use a particular model deployment, and which alternatives were excluded?
12. Which graph objects, source spans, policies, and omissions formed a model's context?
13. Could Petra answer a request from current local state, or did it initiate deeper research?
14. Which processing stage, retry, or cache decision consumed the time and cost of a result?
15. Can a researcher distinguish current authority, cached analysis, active work, a proposal, and an applied change?
16. Does one object preserve its identity and revision across Brief, Evidence, Graph, inspector, and conversation?
17. Why did Petra suggest an action, and how complete and current was its alternative-hypothesis search?
18. Can Petra distinguish Hypothesis development, activity, evidential warrant, and project lifecycle?
19. Which evidence, Findings, unknowns, temporal perspective, and profile produced a posture recommendation?
20. Which obligation blocks an action or transition, and was it satisfied, waived, or still open?
21. Did a numerical criterion govern an operational decision or get misrepresented as scientific truth?
22. Did an experimental change alter scientific meaning, exact execution, or only a later Analysis?
23. Did a Run fail operationally, produce an invalid measurement, or produce a valid Result that did not meet a criterion?
24. Which causal candidates and diagnostic evidence explain an execution incident or validity anomaly?
25. What kind of reproduction was attempted, and which dependencies were shared or independent?
26. Which snapshot and evidence support each material statement in a DraftArtifact?
27. Did a researcher edit or Felicity language revision make a provenance or citation mapping stale?
28. Can Petra render one semantic draft into another format without changing its scientific meaning?
29. Did an interface, API, or external agent use the same command, capability, and review path?

Node or relation types that do not help answer a competency question should not enter the minimum schema.

---

## Logical architecture

Petra maintains four related forms of state.

### Immutable artifacts

Papers, extracted text, tables, figures, dataset snapshots, code archives, run outputs, and exported reports are content-addressed artifacts. Once registered, their bytes do not change. A changed file becomes a new artifact.

### Canonical entities

Entities give stable identities to works, versions, claims, questions, hypotheses, experiments, and other research objects. Entity metadata can evolve through events, but identity changes are explicit and reversible.

### Assertions

Assertions represent typed relationships between entities or between an entity and a literal value. They preserve origin, evidence, review state, scope, and time. Accepted assertions can be projected as ordinary graph edges.

### Events

Events are the append-only record of what happened. Materialized graph views, search indexes, activity timelines, Hypothesis state, permissions, snapshots, and research artifacts are derived from events. Correcting state creates a compensating event; it does not rewrite history.

These forms of state span three logical namespaces:

- **Scientific authority:** canonical sources, research objects, provenance-bearing Assertions, workflow state, and experimental records.
- **Derived retrieval:** rebuildable embeddings, semantic neighbors, communities, candidate relations, summaries, ranking features, and other retrieval aids.
- **Control:** capability grants, role and routing policy, context recipes, review policy, budgets, and scheduler rules.

A derived retrieval relation is not a scientific Assertion. A paper, passage, model output, or retrieval artifact cannot become an executable control instruction. Promotion between namespaces requires Petra's typed command, policy, validation, event, and review path.

Interface projections combine authorized state from these namespaces for one task and revision. They are disposable views, not another authority namespace. Client-side snapshots, deltas, selection, filters, layout, and drafts cannot commit scientific or control state; material action returns through Petra's typed command path.

```text
immutable artifacts ──► canonical entities
         │                    │
         └──── provenance ─► assertions
                                  │
commands ─► policy checks ─► domain events ─► materialized graph/search/UI views
```

---

## Identity and common fields

### Internal identifiers

Every entity, assertion, event, and change set MUST have a stable opaque identifier. The canonical M1 format is:

```text
<type>_<ulid>
```

Examples:

```text
work_01K4E2...
claim_01K4E3...
assertion_01K4E4...
```

The type prefix is a lowercase machine discriminator; the payload is a canonical uppercase ULID. The identifier MUST NOT encode a title, mutable status, provider, project name, or other changeable meaning.

### External identifiers

DOIs, OpenAlex IDs, Semantic Scholar IDs, ORCIDs, repository URLs, dataset IDs, and provider model IDs are aliases, not Petra's primary keys. Each alias record stores its namespace, normalized value, source, and verification status.

An ambiguous match MUST remain unresolved. Petra must not merge entities because two titles or names have high embedding similarity.

### Common entity fields

All entities contain:

| Field | Meaning |
| --- | --- |
| `id` | Stable Petra identifier |
| `entity_type` | Controlled type name |
| `workspace_id` | Owning private workspace |
| `created_by` | Human or system actor identifier |
| `created_at` | Event-recorded creation time |
| `revision` | Optimistic concurrency version |
| `visibility` | `private`, `project`, `snapshot_public` |
| `lifecycle` | `active`, `superseded`, or `tombstoned` |

Canonical scholarly entities MAY be shared across projects in a workspace. Project research objects MUST carry `project_id`.

### Time

Petra distinguishes:

- **occurred time:** when the represented action or observation happened;
- **recorded time:** when Petra learned or recorded it;
- **valid time:** the interval during which a world-level assertion is claimed to apply, when known.

Publication date, ingestion date, and relation-valid time MUST NOT be collapsed into one timestamp. Unknown time remains unknown; Petra must not substitute ingestion time for publication or observation time.

---

## Minimum entity schema

### Workspace and Project

`Workspace` defines the private administrative and data-policy boundary. `Project` contains a specific research program and its overlays on the canonical corpus.

`Project` requires:

- `title`;
- `description`;
- `data_policy_id`;
- `default_capability_policy_id`;
- `created_by` and `created_at`.

### Work

`Work` is the canonical identity of a scholarly work across versions and artifacts.

Required fields:

- `title`;
- `work_kind`: `journal_article`, `conference_paper`, `preprint`, `thesis`, `book`, `chapter`, or `other`;
- `external_ids` when available;
- `identity_status`: `resolved`, `provisional`, or `disputed`.

A later journal article and an earlier preprint MAY share a `Work` only when evidence supports that identity. Otherwise Petra links separate works with a proposed `VERSION_OF` or `DERIVED_FROM` assertion pending review.

### WorkVersion

`WorkVersion` represents a dated version of a `Work`.

Required fields:

- `work_id`;
- `version_label` or source-native version identifier;
- `publication_status`: `preprint`, `peer_reviewed`, `accepted`, `corrected`, `retracted`, or `unknown`;
- `published_at` when known;
- `metadata_source`;
- `metadata_retrieved_at`.

Retraction and correction status are time-sensitive assertions. They MUST remain traceable to their source and retrieval time.

Processing depth is tracked per WorkVersion, artifact, and pipeline revision as `catalogued`, `indexed`, `extracted`, or `analyzed`. Partial and failed stages remain visible. Petra MUST NOT replace this ledger with an unqualified “read” status.

### Artifact

`Artifact` represents the immutable identity and physical characteristics of an
exact byte sequence processed by Petra. Acquisition, storage-location, and
rights facts are separate records because identical bytes can arrive from more
than one source under different terms.

Required fields:

- `artifact_kind`: `pdf`, `html`, `structured_text`, `dataset`, `code`, `environment_lock`, `run_output`, `image`, or `export`;
- `media_type`;
- exact SHA-256 `content_hash`;
- exact `byte_size`;
- immutable revision `1` and creation provenance.

`Artifact` is shared by scholarly ingestion and experiments. This avoids treating code and output provenance as a separate system.

### ArtifactManifest

`ArtifactManifest` is an immutable record of one acquisition, upload, or
generation path for an Artifact and one verified content-addressed storage
location. An acquired scholarly origin binds the exact `WorkVersion`, source
connector and version, retrieval URL and time, and bounded response metadata.
The manifest also records integrity status, warnings, recording actor and time,
and the applicable `RightsDecision`.

One Artifact may have multiple manifests. If two sources return identical
bytes, Petra shares the Artifact content identity while preserving every
source-specific acquisition and rights record. Failed integrity checks do not
create a trusted ArtifactManifest.

### RightsDecision

`RightsDecision` is specific to one ArtifactManifest and exact source location.
It records observed license evidence, access basis, decision status, explicit
permission booleans for storage, parsing, indexing, embedding, remote model
use, public quotation, and redistribution, plus conditions, notices, decision
maker, rationale, observation time, and policy version. Unknown or conflicting
rights never inherit a more permissive decision from another copy with the same
bytes.

### ParsedDocument

`ParsedDocument` is one immutable Petra-normalized interpretation of one source
Artifact. A source, parser, configuration, component model, adapter, or
normalization change creates a new parser run and ParsedDocument rather than
editing the prior parse.

Required fields:

- source Artifact ID and content hash;
- retained parser-output Artifact ID;
- exact WorkVersion and parser-run IDs;
- source format and language when known;
- adapter, parser, component-model, configuration, and normalization identity;
- parse quality state and ordered page ledger;
- ordered StructuralBlock IDs;
- explicit diagnostics and creation provenance.

Each page records dimensions, units, coordinate origin, text-layer state, parse
state, and optional measured quality. Partial, OCR-required, and failed states
remain visible and cannot silently appear complete.

### StructuralBlock

`StructuralBlock` is one immutable ordered and hierarchical unit within a
ParsedDocument. It preserves block kind, content layer, reading order,
structural path, parent/child and neighbor references, page locations, content
identity, and SourceSpan IDs. Text content retains a SHA-256 hash; large or
structured values remain referenced Artifacts; visual-only blocks remain
explicit rather than receiving invented text.

A parser-native item ID is not a durable evidence target. StructuralBlock IDs
belong to the exact ParsedDocument and remain interpretable only with its
parser and normalization provenance.

### SourceSpan

`SourceSpan` identifies a stable region within exactly one immutable source
Artifact and aligns it through one ParsedDocument, parser run, and
StructuralBlock.

Required fields:

- source Artifact ID and exact content hash;
- ParsedDocument, parser-run, and StructuralBlock IDs;
- selector-schema version;
- one closed selector variant: `text_quote`, `page_region`, `section_path`,
  `json_pointer`, `line_range`, or `compound`;
- extraction method, method version, and normalization version;
- verification status, time, and any recorded transformations;
- immutable creation provenance.

Compound PDF selectors may combine exact-text hashes and permitted text,
Unicode code-point offsets, prefix and suffix context, page dimensions,
coordinate system, bounding boxes or polygons, and structural path. Geometry
must remain inside the declared page. Parser upgrades create new alignments;
they do not rewrite an old SourceSpan.

A source-backed scientific assertion MUST resolve to a `SourceSpan` or to a
structured source field with equivalent precision. A search snippet is not an
admissible `SourceSpan`.

### ResearchQuestion

`ResearchQuestion` preserves both the researcher's original wording and Petra's structured interpretation.

Required fields:

- `project_id`;
- `original_text`;
- `working_text`;
- `status`: `open`, `answered_provisionally`, `deferred`, or `closed`.

Concepts, populations, outcomes, tasks, and subquestions enter through assertions rather than being embedded in an opaque question summary.

### Claim

`Claim` represents a proposition that can be supported, contradicted, qualified, or tested. It is not automatically true because it exists in the graph.

Required fields:

- `canonical_text`;
- `claim_kind`: `descriptive`, `comparative`, `causal`, `mechanistic`, `methodological`, `theoretical`, or `measurement`;
- `scope`;
- `normalization_status`: `verbatim`, `normalized`, or `composed`.

`scope` is a structured object that MAY contain population, language, task, model family, dataset, intervention or exposure, comparator, outcome, setting, and temporal boundary. Each dimension MUST appear either as a described scope dimension or in `unreported_dimensions`, but never both. Missing scope is therefore visible evidence state rather than an omitted property that a model may silently fill.

A verbatim claim closely follows one source span. A normalized claim restates one or more occurrences without intended change in meaning. A composed claim is a Petra or researcher synthesis and MUST NOT be presented as though one paper stated it.

Every Claim records one closed basis:

- a `source` basis names the exact WorkVersion and SourceSpans, whether Petra had full text or only an abstract, the permitted detail level, source stance, attribution, modality, negation, uncertainty, derivation, validators, and proposal actor;
- a `synthesis` basis names the Claims and Assertions composed plus the exact composition process; or
- a `researcher` basis preserves the researcher's rationale and authorship.

A source-derived Claim cannot be marked `composed`; a synthesis or researcher proposal must be. An unresolved SourceSpan, a span from another WorkVersion, or a failed validator cannot ground a Claim proposal. Abstract-only evidence is explicitly labelled and may ground only broad descriptive, comparative, or theoretical Claims. It cannot ground detailed, causal, mechanistic, methodological, or measurement interpretation.

Claim authority is separate from its proposition. New proposals begin with quarantine authority. A trusted authority object records representation review—not scientific truth—and MUST carry the exact promotion basis described below.

### Hypothesis

`Hypothesis` is a project-specific research object built around a testable target claim.

Required fields:

- `project_id`;
- `ordinal`: an immutable project-scoped reference such as `H12` that is never reused;
- `descriptor`: a concise human-readable identifier for the hypothesis;
- `target_claim_id`;
- `development`: `seed`, `articulated`, `structured`, `test_ready`, or `developed`;
- `research_lifecycle`: `active`, `paused`, `retired`, or `superseded`;
- `rationale`;
- `falsification_conditions`;
- `created_by`.

The descriptor aids recognition but does not replace the target Claim or scope. Descriptor revisions retain their history. A change in scientific meaning normally creates a new Hypothesis or an explicitly superseding target revision rather than silently renaming the old one.

Assumptions, predictions, rival hypotheses, and dependencies are assertions. Development and research lifecycle are separate projections of accepted transition events. Activity is derived from current WorkUnits. Evidential warrant and scientific standing belong to immutable HypothesisAssessments rather than mutable Hypothesis fields.

### Hypothesis assessment and posture

`AssessmentIndicator` records one reproducible description of graph or analysis state. It contains the target, value and unit where applicable, scope, inputs, computation and version, actor, limitations, and dependency hashes. It does not interpret scientific meaning.

`AssessmentFinding` interprets evidence or Indicators under one registered profile. It contains:

- namespaced type and schema version;
- target, scope, and temporal perspective;
- evidence and Indicator references;
- origin: `deterministic_rule`, `model_proposal`, `human_judgment`, or `policy_derivation`;
- method, actor, model, and validator references where applicable;
- coverage, limitations, and review state;
- invalidation dependencies and concise explanation.

An unknown Finding may remain `unmapped` for inspection but has no executable behavior.

`AxisAssessment` records the controlled summary, supporting and conflicting Findings, material unknowns, scope, perspective, coverage, origin, review state, and human override for one axis. Initial axes are `development`, `warrant`, `scientific_standing`, `alternative_coverage`, `project_dependence`, and `research_stakes`. Activity and lifecycle remain separate projections.

`HypothesisAssessment` is an immutable project-scoped envelope. It pins:

- Hypothesis and target Claim revisions;
- graph snapshot, `as_of` date, and present-day or historical perspective;
- assessment, schema, domain-profile, and policy revisions;
- evidence, Indicator, Finding, derived-artifact, and coverage-manifest dependencies;
- AxisAssessments, conflicts, and material unknowns;
- actor, pipeline, model, prompt, and validator records;
- creation reason, freshness and invalidation rules, and superseded assessment.

Review state is `partial`, `provisional`, `reviewed`, or `disputed`. Freshness is independently `current`, `stale`, `invalidated`, or `superseded`.

`PostureDecision` is a versioned control object that pins one HypothesisAssessment. It records one primary posture—`explore`, `clarify`, `challenge`, `discriminate`, `reproduce`, or `consolidate`—plus determining Findings, material unknowns, posture-policy and registry revisions, Obligations, SuggestedActions, activation, expiry, invalidation, and human override.

`Obligation` is a versioned, namespaced requirement or recommendation attached to a subject, transition, or action. It records its creating Finding, PostureDecision, or policy; rationale; satisfaction criteria and evidence; enforcement; waiver policy; lifecycle; expiry; invalidation; and addressing SuggestedActions and WorkUnits.

Enforcement is `advisory`, `required_for_transition`, or `required_for_action`. Lifecycle is `open`, `in_progress`, `satisfied`, `waived`, `not_applicable`, `superseded`, or `expired`.

`ObligationWaiver` pins the exact Obligation revision, actor and authority, rationale, scope, duration, accepted consequences, compensating controls, and expiry or invalidation. Waiver is not satisfaction.

`SemanticProfile` registers namespaced Finding and Obligation schemas, validators, renderers, applicability, satisfaction rules, and executable policy behavior. A model may propose an extension but cannot register or activate it.

### Experiment, ProtocolVersion, and ExecutionPlan

`Experiment` is the durable identity of an intended scientific test or testing program. `ProtocolVersion` is an immutable reviewed specification of scientific meaning. `ExecutionPlan` is an immutable, exactly authorized run matrix.

`ProtocolProfile` registers required fields, validators, and interpretation limits for a named use such as `exploratory`, `confirmatory`, `benchmark`, or `reproduction`. Profiles may extend the schema but cannot weaken core provenance and locking invariants.

`Experiment` requires:

- `project_id`;
- `title`;
- `research_question_ids`;
- `status`: `proposed`, `approved`, `active`, `completed`, `cancelled`, or `retired`.

`ProtocolVersion` requires:

- `experiment_id`;
- `version`;
- `profile_id` and profile revision;
- `state`: `draft`, `reviewed`, `locked`, `superseded`, or `retired`;
- hypotheses and predictions addressed;
- scope, design, baselines, controls, measures, analysis plan, and stopping rule;
- DecisionCriteria, uncertainty, missing-data, deviation, and invalidation rules where applicable;
- dataset, model, code, and environment requirements at the level required by scientific meaning;
- known limitations;
- artifact or structured content hash.

`ExecutionPlan` requires:

- one locked `protocol_version_id` and content hash;
- a versioned plan identity and optional superseded plan;
- exact code, data, model, prompt, environment, dependency, configuration, and seed identities where applicable;
- an explicit run matrix and stable plan-cell identities;
- requested hardware and provider constraints;
- filesystem, network, secret, and external-service capabilities;
- CPU, memory, disk, GPU, time, and budget limits;
- command or structured entry point, input bundle, output contract, and artifact policy;
- approval, idempotency, cancellation, retry, and cleanup rules;
- content hash.

A scientific Run MUST reference a locked ProtocolVersion and an authorized ExecutionPlan. Changing scientific meaning creates a new ProtocolVersion. Changing exact implementation or authorization creates a new ExecutionPlan. Neither operation mutates existing Runs.

### Run

`Run` is one attempt to execute one ExecutionPlan cell.

Required fields:

- `protocol_version_id`, `execution_plan_id`, `plan_cell_id`, and their content hashes;
- `run_kind`: `pilot`, `primary`, `ablation`, `negative_control`, `reproduction`, or `analysis`;
- `state`: `requested`, `approved`, `queued`, `running`, `completed`, or `cancelled`;
- terminal execution outcome, including `succeeded`, `execution_failed`, `environment_failed`, `resource_exhausted`, `timed_out`, or `cancelled`;
- code artifact, environment artifact, dataset snapshot, model version, configuration, and random seeds where applicable;
- execution backend, provider sandbox, observed hardware, region, and material replay limitations;
- start and end times;
- resource use and cost records where measurable;
- input, output, log, and telemetry manifests.

`completed` means the attempt reached a terminal recorded outcome; it does not mean execution succeeded. The terminal outcome carries that distinction. An execution failure does not constitute evidence against a Hypothesis. Retrying a plan cell creates a new Run.

### Result

`Result` records an observation produced by a completed Run.

Required fields:

- `run_id`;
- `result_kind`: `measurement`, `estimate`, `comparison`, `diagnostic`, or `qualitative_observation`;
- `measure` and value or artifact reference;
- unit, uncertainty interval, and analysis method where applicable;
- result scope;
- validity state—`pending`, `valid`, `valid_with_deviation`, or `invalidated`—and applicable Findings, including protocol deviation, measurement invalidity, or later invalidation;
- output artifact references.

Interpretations of Results are Assertions. A Result says what was measured before Petra says what it means.

### Analysis, criteria, and operational decisions

`Analysis` is an immutable versioned transformation or comparison over named Results and artifacts. It pins its code, method, inputs, exclusions, aggregation, assumptions, uncertainty calculation, outputs, actor, and applicable ProtocolVersion. Reanalysis creates a new Analysis.

`DecisionCriterion` is a versioned operational rule. It records its form, metric, units, scope, rationale, derivation, tolerance, uncertainty requirement, behavior for missing or invalid data, applicable ProtocolVersion or policy, actor, and timing: `prespecified`, `amended`, or `exploratory`.

`CriterionEvaluation` pins one criterion revision and its exact Results or Analysis. It records raw values, uncertainty, distance from the decision boundary, sensitivity where applicable, and outcome. `criterion_not_met` is a valid evaluation outcome, not an execution failure.

`OperationalDecision` records the action, stage gate, or transition governed by a CriterionEvaluation. It cannot directly create scientific support or contradiction.

### Reproduction and incident investigation

`ReproductionAttempt` identifies its target, type—`replay`, `repeat`, `direct_reproduction`, or `conceptual_replication`—ProtocolVersion, Runs, comparability assessment, and `IndependenceProfile`. The profile preserves shared and independent code, data, models, providers, authors, measurements, analyses, laboratories, and other applicable dimensions rather than producing one independence score.

`RootCauseInvestigation` diagnoses an execution incident or validity anomaly. It links a trigger to versioned CauseCandidates, DiagnosticTests, DiagnosticEvidence, CauseFindings, CorrectiveActions, and Verifications. CauseFinding status is `confirmed`, `contributing`, `excluded`, or `unresolved`. Scientific causal interpretations remain Assertions rather than operational cause findings.

### Actor, AgentRun, model registry, ModelRequest, and ModelCall

`Actor` identifies a human, service, or agent identity. `AgentRun` records one bounded attempt to achieve an objective.

`AgentRun` requires:

- objective and project;
- assigned role;
- posture at start and posture changes;
- capability grant references;
- status and parent run where applicable;
- correlation and trace identifiers.

The model registry keeps these identities separate:

- `Provider`: the local or remote destination, contractual data boundary, endpoint, and observed operational behavior;
- `ModelDeployment`: one callable model revision or alias with modality, context, tool, runtime, health, and replayability properties;
- `RoleProfile`: one bounded job with input and output schemas, required evidence, validators, tools, failure conditions, and language behavior;
- `RoleCertification`: evidence that one deployment met a versioned evaluation floor for one role and scope;
- `RoutingPolicy`: a versioned rule that filters and orders eligible deployments without creating a capability or approval.

`ModelRequest` records one logical need for model work. It requires:

- project, workflow, role, objective, task scope, and impact class;
- input artifact and `ContextPacket` references;
- prompt stack, schema, tool, policy, and budget revisions;
- outbound-context manifest with rights, visibility, redactions, egress level, destination, purpose, and grant;
- eligible deployments, exclusion reasons, selected route, and fallback chain;
- validation result, final artifact, cost summary, and typed terminal state.

`ModelCall` records one physical invocation within a `ModelRequest`. It requires:

- request and attempt identifiers plus retry, repair, fallback, or escalation cause;
- provider, endpoint, observed deployment identity, and replayability;
- exact input, prompt, context, parameter, tool, and schema artifacts or protected references;
- output, refusal, error, tool trace, validator results, and resulting proposal or Assertion identifiers;
- queue, first-token, completion, and validation timing when observable;
- token, local-compute, and monetary cost data when available;
- data-policy decision and provider request identifier where available.

Model output is provenance, not authority.

### ConversationState, PetraInteractionRun, ContextRecipe, ContextPacket, WorkUnit, CostRecord, SuggestedAction, and HypothesisLandscape

`ConversationState` is a versioned working reference to the active project, question, selected objects, snapshot, hypotheses, review state, response depth, unresolved ambiguities, and source turns. It avoids treating an unbounded transcript as runtime state. Derived summaries link to their source turns and cannot become scientific evidence.

`PetraInteractionRun` is a durable record of one AG-UI interaction run. It records the protocol thread and run identifiers, project and actor context, ConversationState revision, SDK and Petra profile versions, input, linked WorkUnits and AgentRuns, ordered protocol-event references, interrupt and resume linkage, replay checkpoint, visibility and redaction state, trace identifiers, start, and terminal outcome. Its event sequence supports interaction replay; it is not Petra's domain-event ledger.

`InteractionFeatureManifest` records the AG-UI interaction features an adapter reports for one SDK and Petra profile version. It is descriptive compatibility metadata and cannot create or expand a `CapabilityGrant`.

`ContextRecipe` is a versioned control object that defines which authoritative and derived views a task may query, its trust zones, traversal and ranking rules, contrary-evidence requirements, budgets, and omission behavior. A model may propose a recipe change but cannot activate one.

`ContextPacket` is an immutable artifact compiled for one objective, snapshot, and recipe revision. It contains the selected Claims, Assertions, SourceSpans, scope, conflicts, workflow state, inclusion reasons, trust and review metadata, omissions, and dependency hashes. Literature-grounded generation may use only its authorized packet and tools.

`WorkUnit` records an interactive, foreground, background, or batch task. It contains input revisions and dependencies, processing depth, priority, resource estimates and hard limits, cache and idempotency keys, cancellation and checkpoint semantics, eligible execution routes, operational outcome, and trace identifiers. Its revisioned lifecycle distinguishes requested, queued, running, checkpointed, completed, and cancelled state. A completed outcome such as `worker_failed`, `validation_failed`, `resource_exhausted`, or `timed_out` describes execution, not evidence for or against a Hypothesis.

Every worker boundary uses two immutable manifests. `WorkerInputManifest` binds one WorkUnit to exact Artifact bytes or record revisions, one selected worker/runtime and entrypoint, declared output slots, hard resource and attempt limits, network policy, and partial-result behavior. The same manifest may be reused unchanged by an authorized retry. `WorkerOutputManifest` identifies the attempt and returns only bounded staging handles, content hashes, byte sizes, declared contracts, diagnostics, measured resources, and exact network activity. It cannot assign an Artifact identity, create a trusted Claim or Assertion, emit a graph mutation, or decide that an output passed validation. The TypeScript control plane verifies the manifest and staged bytes before registering artifacts or accepting proposals.

`CostRecord` records measured resource use for a correlated operation or stage: tokens, provider cost, local compute, memory, storage, network, stage timing, cache decisions, and retry, repair, fallback, or discarded work. Measurements aggregate by scientific and operational object without making every measurement a graph node.

`SuggestedAction` is a versioned, derived proposal for one scientific objective. It records the target objects, rationale and graph dependencies, missing information, prerequisite and readiness state, expected artifact or decision, recommended response depth, estimated resource envelope, applicable grant and approval boundary, and related WorkUnits. A suggestion creates no permission or scientific authority.

`HypothesisLandscape` is an immutable derived artifact for one Hypothesis, snapshot, and search protocol. It records literature-derived alternatives, separately labeled Petra-proposed rivals, terminology, sources and databases searched, citation neighborhoods, temporal and language range, coverage state, marginal yield, omissions, cost, and invalidation dependencies. “No alternative found” always resolves to this recorded search boundary.

### EvidencePacket, CompositionRequest, DraftArtifact, and CitationBundle

`EvidencePacket` is a composition-specific ContextPacket. It pins one graph snapshot, objective, scope, temporal perspective, selected Claims, Assertions, SourceSpans, Results, Analyses, contrary and qualifying evidence, source processing depth, inclusion reasons, omissions, coverage, freshness, and dependency hashes.

`CompositionRequest` records the researcher objective, intended audience, requested artifact or function, target objects, snapshot, scope, language, length and format preferences, OutputProfile, permitted evidence and inference types, response depth, and applicable capability, privacy, cost, and approval context.

`CompositionPlan` is a versioned structured outline of intended claims, evidence, uncertainty, citation placement, author-supplied material, Petra inference, and unresolved support. A short low-risk response may retain the plan without displaying it; consequential or long-form work keeps it inspectable.

`DraftArtifact` is an immutable generated or researcher-edited content revision. It pins its CompositionRequest, CompositionPlan, EvidencePacket, graph snapshot, actor, ModelRequest, prompt and model records, OutputProfile and language-contract revisions, ProvenanceMap, CitationBundle, validators, limitations, parent revision, and edit origin.

`ProvenanceMap` links material DraftSpans to source-backed Claims and Assertions, Results or Analyses, explicit Petra inference, researcher-supplied judgment, or structural language. It records how each basis bears on the span. A researcher or language edit can make affected mappings stale until revalidation.

`CitationBundle` resolves citations through canonical WorkVersions and records external identifiers, cited version, source locator, citation purpose, linked DraftSpans, metadata warnings, access and processing depth, style or export format, and bibliography artifacts.

`OutputProfile` registers requirements, permitted evidence and inference, validators, metadata, and language behavior for a class of artifact. `RenderedArtifact` records a versioned transformation of one DraftArtifact and CitationBundle into Markdown, LaTeX, BibTeX, plain text, or another supported representation. Rendering cannot decide or change scientific support.

An interface projection records its authoritative revision, graph-projection revision, dependencies, freshness, and semantic state such as `current_snapshot`, `cached_derived`, `running`, `awaiting_input`, `proposed`, `validated`, or `applied`. Project, view, object, and stable filters may be addressable. Panel layout, hover, temporary expansion, and unsaved drafts remain local view state rather than domain events.

The Petra interface, internal API, future deterministic API, and possible MCP server are adapters over the same runtime-validated TypeScript commands and queries. Every adapter carries actor, project, revision, capability, policy, budget, idempotency, and trace context. No adapter writes PostgreSQL or Neo4j directly or converts free-form output into authoritative state.

### ChangeSet, ReviewBatch, ReviewPolicy, and Approval

`ChangeSet` is an atomic proposal to mutate trusted project state. It is used for direct user edits and agent proposals alike.

Required fields:

- `project_id`;
- proposer;
- reason;
- ordered operations with before and after values;
- base revisions of affected objects;
- affected-object and downstream-impact summary;
- risk tier;
- state: `draft`, `submitted`, `approved`, `rejected`, `applied`, `conflicted`, or `reverted`.

`ReviewBatch` groups independently atomic ChangeSets for one coherent review session. It contains the exact member revisions and hashes, common rationale and filters, outliers, audit selection, approval reference, and per-member outcome. A batch is not one large database transaction; one conflicted member does not partially apply or invalidate unrelated members.

`ReviewPolicy` is a versioned, scoped rule for batch or automatic promotion. It contains workflow and proposal scope, required provenance and validators, exclusions, pipeline and calibration references, batch limit, audit policy, escalation and stop conditions, lifecycle, and exact Approval. A review mode selects policy defaults; it does not grant capability.

`Approval` records a decision over a change set, review batch, review policy, run, spend request, capability grant, snapshot, or external action. It contains decision, scope, actor, time, conditions, and the exact revision approved.

Approval of one revision MUST NOT authorize a materially changed revision.

For the first evidence path, the immutable `ChangeSet.content` projection contains the Project, origin, proposer, reason, ordered operations, before and after authority states, base revisions, impact preview, and risk tier. Its `content_hash` is SHA-256 over the exact RFC 8785 canonical content projection. Lifecycle is derived from the submitted record, Approval, application, conflict, and later reversal events; changing lifecycle does not rewrite the approved content.

The initial scientific promotion operation set is intentionally narrow: exactly one quarantined Claim and its corresponding quarantined `ASSERTS` Assertion move together to human-accepted trusted authority as one `R2` decision. The Claim and Assertion each receive a new immutable revision with the exact ChangeSet, Approval, approving human, and application time. Their quarantine revisions remain addressable.

The first `Approval` contract is a human decision over one exact ChangeSet ID, revision, and content hash. A rejection cannot be applied. Conditions are not treated as silently satisfied; application remains blocked until a later contract can record condition-satisfaction evidence. ReviewPolicy execution remains a later calibrated path rather than being simulated through human approval.

`PetraCommandEnvelope` is the adapter-neutral command boundary for `SubmitChangeSet`, `RecordApproval`, and `ApplyChangeSet`. It carries command and idempotency identities, Project, actor, capability-grant reference, correlation and causation context, timestamp, and a closed typed payload. The core requests an explicit authorization decision, rejects a key or command identity rebound to different content, returns the original result for an identical retry, and applies no partial target revisions when optimistic concurrency fails.

---

## Assertion model

An `Assertion` is the canonical representation of a meaningful edge.

Required fields:

| Field | Meaning |
| --- | --- |
| `assertion_id` | Stable assertion identifier |
| `subject_id` | Source entity of the relation |
| `predicate` | Controlled relation type |
| `object` | Entity reference or typed literal |
| `assertion_kind` | How the relation entered Petra |
| `authority` | Closed quarantine, trusted, or personal authority state with its valid review states |
| `provenance_refs` | Source spans, structured fields, runs, model calls, actors, or basis assertions |
| `authority.promotion` | For trusted state, the exact ChangeSet, Approval, human or ReviewPolicy basis, calibration, audit, and application time |
| `scope` | Relation-specific boundary conditions |
| `scope_comparison` | Explicit alignment, overlap, narrowing, broadening, disjointness, or unknown relation between scientific scopes when applicable |
| `occurred_at` / `recorded_at` | Temporal provenance |
| `valid_time` | World-valid interval when known |
| `revision` | Concurrency and supersession version |

`assertion_kind` is one of:

- `source_native`: copied through a deterministic mapping from an identified source field;
- `source_stated`: a human or model extraction of what a source passage states;
- `deterministic_derivation`: computed by a declared non-model transformation;
- `model_inference`: proposed by a model beyond direct source restatement;
- `human_judgment`: asserted by the researcher;
- `experimental_observation`: derived directly from a recorded result;
- `synthesis`: a composed relation based on other assertions.

Extraction confidence, when available, describes confidence in the extraction process. It MUST NOT be displayed as the probability that the scientific claim is true.

### Minimum predicates

The first release permits:

| Predicate | Subject → object | Meaning |
| --- | --- | --- |
| `VERSION_OF` | `WorkVersion → Work` | Version membership |
| `REPRESENTED_BY` | entity → `Artifact` | Immutable representation |
| `LOCATED_IN` | `SourceSpan → Artifact` | Span containment |
| `CITES` | `WorkVersion → Work` | Source records a citation |
| `CITES_AS_BACKGROUND` | `WorkVersion → Work/Claim` | Source invokes prior work without substantive adoption or test |
| `ASSERTS` | `WorkVersion → Claim` | Work version states the claim |
| `ADDRESSES` | entity → `ResearchQuestion` | Object bears on a question |
| `SUPPORTS` | claim/result → claim/hypothesis | Evidence increases warrant within scope |
| `CONTRADICTS` | claim/result → claim/hypothesis | Evidence conflicts within comparable scope |
| `QUALIFIES` | claim/result → claim/hypothesis | Evidence narrows or conditions the target |
| `ADOPTS` | claim → claim | Later work takes a prior Claim as part of its account |
| `DIRECTLY_TESTS` | claim/experiment/protocol-version → claim/hypothesis | Object directly tests the target rather than merely mentioning it |
| `EXTENDS` | claim/method → claim/method | Later work adds scope, mechanism, or method while retaining the target |
| `REFRAMES` | claim → claim | Later work changes the construct or explanatory framing |
| `CHALLENGES` | claim → claim/hypothesis | Later work raises a substantive problem without necessarily contradicting the target |
| `CRITIQUES_METHOD` | claim → claim/method/protocol-version | Claim criticizes how the target was operationalized or tested |
| `ASSUMES` | hypothesis/protocol-version → claim | Dependency taken as given |
| `PREDICTS` | hypothesis → claim | Expected observation |
| `RIVAL_OF` | hypothesis → hypothesis | Live competing explanation |
| `TESTS` | experiment/protocol-version → hypothesis | Intended hypothesis test |
| `IMPLEMENTS` | execution-plan → protocol-version | Exact authorized implementation of scientific design |
| `USES` | protocol-version/execution-plan/run/analysis → entity/artifact | Scientific or operational dependency |
| `PRODUCED` | run → result/artifact | Run output |
| `ANALYZES` | analysis → result/artifact | Named input to a versioned analysis |
| `EVALUATES` | criterion-evaluation → decision-criterion/result/analysis | Operational rule and its evaluated inputs |
| `GOVERNS` | criterion-evaluation → operational-decision | Evaluation controls a named operation or transition |
| `INTERPRETS` | claim → result | Claim offered as result interpretation |
| `COMPOSED_FROM` | draft-artifact → evidence-packet/snapshot | Immutable evidence and graph basis of a draft revision |
| `GROUNDS` | claim/assertion/result/analysis/judgment → draft-span | Basis and epistemic origin of material prose |
| `RENDERS` | rendered-artifact → draft-artifact/citation-bundle | Format transformation over fixed semantic inputs |
| `REPLICATES` | claim/run/experiment → claim/run/experiment | Reproduction relationship with compatible target |
| `FAILS_TO_REPLICATE` | claim/run/experiment → claim/run/experiment | Valid attempt did not reproduce target result |
| `INVESTIGATES` | root-cause-investigation → run/result/analysis/incident | Operational failure or validity anomaly under diagnosis |
| `TESTS_CAUSE` | diagnostic-test → cause-candidate | Diagnostic intended to discriminate an operational cause |
| `CORRECTS` | corrective-action → cause-finding/incident | Versioned remediation of an identified operational problem |
| `DEPENDS_ON` | entity → entity | Explicit dependency not covered above |
| `SUPERSEDES` | entity/assertion → prior version | New active replacement |

Scientific evidence and substantive-dialogue predicates require a rationale, scope comparison, and applicable SourceSpan or experimental provenance. A citation edge must never be translated automatically into one of these relations.

`ASSERTS` has the executable endpoint contract `WorkVersion → Claim`. Its target must be a registered source-derived Claim, its subject must be the WorkVersion named by that Claim, and its provenance must include one of the exact grounding SourceSpans. These checks prevent a fluent extraction from silently changing which paper said what.

The predicate registry defines direction, allowed endpoint types, inverse display label, required provenance, and cardinality. Adding a predicate is a schema migration, not an arbitrary model action.

---

## Trust zones and promotion

Petra separates storage from trust.

### Quarantine

Discovered records, parsed artifacts, extracted claims, inferred relations, and uncertain identity links begin in quarantine. Quarantine objects can participate in search and review but cannot support an answer presented as trusted scientific synthesis.

### Trusted graph

Trusted means the object passed the configured promotion process. It does not mean the claim is true. Trust records confidence in provenance, identity, and representation quality—not scientific certainty.

Source-native metadata MAY be promoted automatically when the connector, mapping, and required fields have passed validation. Model-extracted scientific assertions require at least machine checks and the project's configured review rule. Material epistemic promotions require a `ChangeSet`.

The proposal boundary accepts only quarantine Claims and Assertions. Supplying a schema-valid trusted object to that boundary is still rejected. Trusted authority can be created only by the separate ChangeSet application path, which validates the named Approval or approved ReviewPolicy and records the promotion atomically.

### Personal graph

Personal evidence is trusted as an authentic record of the researcher's note or observation, not as published evidence. Its namespace and visibility must survive retrieval, synthesis, export, and publication filtering.

---

## State transitions and guards

### Hypothesis development and lifecycle

Allowed forward transitions are:

```text
development: seed → articulated → structured → test_ready → developed
lifecycle: active ↔ paused
lifecycle: active | paused | retired → superseded
lifecycle: retired → active | paused
```

Petra MAY return development to an earlier state when assumptions, scope, construct, or operationalization changes. The transition event must record the reason and affected dependencies. Reactivating a retired Hypothesis preserves its retirement history. Supersession identifies a successor and normally remains terminal for that revision.

Minimum guards:

- `articulated` requires a target Claim, descriptor, and provisional scope;
- `structured` requires applicable assumptions, rivals, predictions, confounds, and failure conditions or explicit reasons they do not apply;
- `test_ready` requires at least one reviewed literature-analysis or ProtocolVersion capable of bearing on the target Claim;
- `developed` requires at least one completed formal research or test cycle plus versioned operationalizations, limitations, revisions, and unresolved alternatives;
- `superseded` requires a successor and typed supersession relation;
- every development or lifecycle transition retains its actor, reason, base revision, and downstream impact.

Activity is derived from WorkUnits rather than stored in this transition machine. Warrant, standing, reproduction, and challenge are AxisAssessments or Assertions, not development or lifecycle states. A single failed or invalid run cannot change warrant directly.

An activated PostureDecision pins one HypothesisAssessment. Enforceable Obligations require an activated decision or policy, registered semantics, and the applicable review path.

### ProtocolVersion, ExecutionPlan, and Run

```text
protocol-version: draft → reviewed → locked → superseded | retired
execution-plan: draft → reviewed → authorized → superseded | retired
run: requested → approved → queued → running → completed | cancelled
```

Only a locked ProtocolVersion and authorized ExecutionPlan may enter an approved scientific Run. A scientific amendment creates a new ProtocolVersion. An implementation, configuration, capability, resource, or budget change creates a new ExecutionPlan. Neither change mutates recorded hashes or active and completed Runs.

Run lifecycle is independent of execution outcome, Result validity, Analysis resolution, and CriterionEvaluation. A completed process can produce an invalid measurement; a valid Result can fail its criterion; an Analysis can be inconclusive.

### Change sets

```text
draft → submitted → approved → applied
                  ↘ rejected
approved/applied → conflicted when base revisions no longer match
applied → reverted through a compensating change set
```

Applying a change set is atomic. If any required base revision has changed, Petra rejects the application as conflicted and regenerates the impact preview.

An identical command retry returns its original result and cannot create another revision. Reusing either a command ID or idempotency key for different content is an error. A competing ChangeSet may be submitted against the same base revision, but after one applies, every still-pending competitor fails its base-revision guard and becomes conflicted without partial promotion.

---

## Capability and approval model

Posture can recommend an action but cannot grant permission for it.

Capability grants are explicit objects with:

- grantee actor or agent role;
- action type;
- workspace, project, object, provider, and destination scope;
- start and expiry time;
- call, token, time, compute, and monetary limits;
- network and data-class restrictions;
- approving actor and approval reference;
- revocation state.

Recommended risk tiers:

| Tier | Examples | Default |
| --- | --- | --- |
| `R0` | Read trusted graph, search local indexes | Allowed |
| `R1` | Search approved scholarly services, ingest to quarantine, propose assertions | Allowed within limits |
| `R2` | Promote trusted assertions, merge identities, change hypothesis state | Human or configured batch approval |
| `R3` | Execute code, access network from sandbox, install dependencies, incur material cost | Explicit scoped approval |
| `R4` | Publish, share private data, message externally, mutate external systems | Exact-artifact and destination approval |

An agent action event MUST reference the capability grant that authorized it. No grant is inferred from role name, model provider, earlier approval, or scientific posture.

---

## Event envelope

Every domain event uses this envelope:

```json
{
  "schema_name": "petra.domain-event",
  "schema_version": "1.0.0",
  "event_id": "event_01K4F0...",
  "event_position": 42,
  "stream_type": "project",
  "stream_id": "project_01K4DZ...",
  "stream_revision": 19,
  "project_id": "project_01K4DZ...",
  "actor": {
    "actor_id": "actor_01K4EZ...",
    "actor_kind": "human"
  },
  "occurred_at": "2026-08-27T15:04:05Z",
  "recorded_at": "2026-08-27T15:04:06Z",
  "correlation_id": "trace_01K4EY...",
  "causation_id": "command_01K4EW...",
  "command_id": "command_01K4EW...",
  "idempotency_key": "connector-or-client-key",
  "capability_grant_id": "capability_grant_01K4EV...",
  "event": {
    "event_type": "change_set.applied",
    "payload": {}
  }
}
```

Rules:

- `event_position` orders the full authority log, while `stream_revision` orders one Project stream;
- `event_id`, `command_id`, and `idempotency_key` prevent duplicate application;
- command operations carry object base revisions for optimistic concurrency;
- `correlation_id` groups one user-visible operation or agent trace;
- `causation_id` identifies the command that directly caused this event; the command envelope retains any upstream causation;
- `occurred_at` and `recorded_at` remain separate;
- `event` is a closed discriminated union, and its payload is validated against the registered schema for `event_type`;
- accepted events are immutable.

Secrets, raw credentials, and unnecessary private model prompts MUST NOT appear in event payloads. Events refer to protected artifacts where retention is justified.

Each projection delivery is a separate immutable `petra.outbox-record`. It embeds the complete domain event, names exactly one projection target, partitions by Project, and carries a global `outbox_position`, a per-target-and-Project `target_sequence`, and a deterministic deduplication key. An authoritative transaction may therefore route one event to several consumers without making any projection part of the authority commit.

---

## Minimum event registry

### Corpus and identity

- `work.created`
- `work_version.registered`
- `artifact.registered`
- `source_span.created`
- `source.ingested_to_quarantine`
- `work_version.processing_depth_changed`
- `derived_artifact.created`
- `derived_artifact.invalidated`
- `identity_match.proposed`
- `identity_merge.applied`
- `identity_split.applied`
- `entity.superseded`
- `entity.tombstoned`

### Assertions and review

- `assertion.proposed`
- `assertion.machine_checked`
- `assertion.accepted`
- `assertion.rejected`
- `assertion.disputed`
- `assertion.superseded`
- `assertion.retracted`
- `assertion.audited`

### Research workflow

- `research_question.created`
- `research_question.reframed`
- `hypothesis.created`
- `hypothesis.descriptor_revised`
- `hypothesis.development_changed`
- `hypothesis.lifecycle_changed`
- `assessment_indicator.recorded`
- `assessment_finding.proposed`
- `assessment_finding.reviewed`
- `assessment_finding.disputed`
- `hypothesis_assessment.created`
- `hypothesis_assessment.marked_stale`
- `hypothesis_assessment.invalidated`
- `hypothesis_assessment.superseded`
- `posture_decision.created`
- `posture_decision.activated`
- `posture_decision.overridden`
- `posture_decision.invalidated`
- `posture_decision.superseded`
- `obligation.created`
- `obligation.started`
- `obligation.satisfied`
- `obligation.waived`
- `obligation.not_applicable`
- `obligation.superseded`
- `obligation.expired`
- `semantic_profile.registered`
- `semantic_profile.activated`
- `semantic_profile.superseded`
- `experiment.created`
- `protocol_version.created`
- `protocol_version.reviewed`
- `protocol_version.locked`
- `protocol_version.superseded`
- `execution_plan.created`
- `execution_plan.reviewed`
- `execution_plan.authorized`
- `execution_plan.superseded`

### Execution and results

- `run.requested`
- `run.approved`
- `run.queued`
- `run.started`
- `run.completed`
- `run.execution_failed`
- `run.environment_failed`
- `run.resource_exhausted`
- `run.timed_out`
- `run.cancelled`
- `result.recorded`
- `result.validity_assessed`
- `result.invalidated`
- `analysis.created`
- `criterion.created`
- `criterion.amended`
- `criterion.evaluated`
- `operational_decision.recorded`
- `root_cause_investigation.opened`
- `cause_candidate.proposed`
- `diagnostic_test.completed`
- `cause_finding.recorded`
- `corrective_action.approved`
- `corrective_action.completed`
- `corrective_action.verified`
- `root_cause_investigation.closed`
- `reproduction.started`
- `reproduction.assessed`

### Composition

- `evidence_packet.compiled`
- `composition.requested`
- `composition_plan.created`
- `draft_artifact.created`
- `draft_artifact.revised`
- `draft_artifact.mapping_stale`
- `draft_artifact.validated`
- `provenance_map.created`
- `provenance_map.revalidated`
- `citation_bundle.created`
- `rendered_artifact.created`

### Agency and governance

- `agent_run.started`
- `agent_run.posture_changed`
- `agent_run.completed`
- `agent_run.failed`
- `capability.granted`
- `capability.revoked`
- `review_policy.created`
- `review_policy.approved`
- `review_policy.activated`
- `review_policy.paused`
- `review_policy.superseded`
- `review_batch.created`
- `review_batch.approved`
- `review_batch.completed`
- `changeset.created`
- `changeset.submitted`
- `changeset.approved`
- `changeset.rejected`
- `changeset.applied`
- `changeset.reverted`
- `snapshot.created`
- `external_action.approved`
- `external_action.completed`

### Model gateway and graph-guided execution

- `provider.registered`
- `provider.policy_verified`
- `model_deployment.registered`
- `model_deployment.health_changed`
- `role_profile.created`
- `role_profile.revised`
- `role_certification.granted`
- `role_certification.invalidated`
- `routing_policy.created`
- `routing_policy.approved`
- `routing_policy.activated`
- `routing_policy.paused`
- `routing_policy.superseded`
- `model_request.created`
- `model_request.routed`
- `model_request.completed`
- `model_request.failed`
- `model_call.started`
- `model_call.completed`
- `model_call.failed`
- `conversation_state.revised`
- `context_recipe.created`
- `context_recipe.approved`
- `context_recipe.activated`
- `context_recipe.superseded`
- `context_packet.compiled`
- `work_unit.created`
- `work_unit.started`
- `work_unit.awaiting_input`
- `work_unit.checkpointed`
- `work_unit.resumed`
- `work_unit.completed`
- `work_unit.failed`
- `work_unit.cancelled`
- `cost.recorded`

Event types describe completed facts. Commands use imperative names such as `ProposeAssertion` or `StartRun`; failed commands do not become success events.

---

## Example: model-extracted claim proposal

An extractor proposes that a paper reports position bias in pairwise LLM judging. The claim remains in quarantine until reviewed.

```json
{
  "schema_version": "1.0",
  "event_id": "petra:event:01K4G1...",
  "event_type": "assertion.proposed",
  "stream_type": "project",
  "stream_id": "petra:project:01K4DZ...",
  "workspace_id": "petra:workspace:01K4DY...",
  "project_id": "petra:project:01K4DZ...",
  "actor": {
    "actor_id": "petra:agent_run:01K4G0...",
    "actor_type": "agent_run"
  },
  "occurred_at": "2026-08-27T15:10:00Z",
  "recorded_at": "2026-08-27T15:10:01Z",
  "correlation_id": "petra:trace:01K4FZ...",
  "causation_id": "petra:event:01K4FY...",
  "command_id": "petra:command:01K4FX...",
  "idempotency_key": "extractor:paper-version:claim:7",
  "expected_stream_revision": 22,
  "capability_grant_id": "petra:grant:01K4FW...",
  "payload": {
    "assertion": {
      "id": "petra:assertion:01K4G2...",
      "subject_id": "petra:work_version:01K4FV...",
      "predicate": "ASSERTS",
      "object": {
        "entity_id": "petra:claim:01K4G3..."
      },
      "assertion_kind": "source_stated",
      "zone": "quarantine",
      "review_state": "unreviewed",
      "provenance_refs": [
        "petra:source_span:01K4FU...",
        "petra:model_call:01K4FT..."
      ],
      "promotion_refs": [],
      "scope": {
        "task": "pairwise response comparison",
        "judge_type": "large language model",
        "ordering_condition": "candidate order swapped"
      }
    },
    "extraction_confidence": 0.86
  }
}
```

The value `0.86` estimates extraction confidence under the extractor's method. It is not an estimate that position bias exists or that the reported result generalizes.

---

## Change application and replay

The event store is the audit authority. Materialized views are disposable and rebuildable.

### Command path

1. A human or agent submits a command.
2. Petra authenticates the actor and resolves the applicable capability grant.
3. The policy engine checks project state, risk tier, budget, data policy, and required approval.
4. Domain rules validate identities, endpoint types, transition guards, and base revisions.
5. Petra appends one or more events atomically.
6. Projectors update graph, search, vector, timeline, cost, and UI views.
7. Petra records projection checkpoints and exposes the change to the user.

### Reversal

Reversal creates compensating events. If a user rejects an accepted model-extracted relation, Petra records the rejection and removes it from the active trusted projection. The original proposal and acceptance remain visible in history.

### Snapshots

A `snapshot.created` event pins:

- event-store position;
- graph schema and predicate-registry versions;
- artifact hashes;
- active entity and assertion revisions;
- index, derived-retrieval, ContextRecipe, and ranking configuration where relevant;
- included ContextPacket, ModelRequest, RoleCertification, routing-policy, model, and prompt revisions;
- redaction and license decisions.

Public artifacts and formal evaluations MUST reference a snapshot ID.

---

## Required invariants

The implementation must reject any operation that violates these rules.

1. A `WorkVersion` belongs to exactly one active `Work` identity at a time.
2. A `SourceSpan` belongs to exactly one immutable `Artifact` revision.
3. A source-backed scientific assertion has an admissible source span or equivalent structured field.
4. Search snippets and generated summaries cannot serve as primary scholarly evidence.
5. An assertion's kind, provenance, zone, and review state survive every projection.
6. `CITES` never implies `SUPPORTS`, `CONTRADICTS`, or `QUALIFIES`.
7. A model inference cannot be relabeled as source-stated without a reviewed change set.
8. Promotion to the trusted graph does not assert that a claim is true.
9. Personal evidence never enters a shared artifact, export, or future public snapshot without an explicit inclusion and redaction decision.
10. A scientific Run references one immutable locked ProtocolVersion, one authorized ExecutionPlan, and one stable plan cell.
11. A completed Run records code, data, environment, model, configuration, backend, input, output, and resource identities to the extent applicable.
12. An execution failure or invalid Result cannot directly produce a scientific support or contradiction Assertion.
13. Result, Analysis, CriterionEvaluation, OperationalDecision, and scientific interpretation remain distinct objects.
14. Hypothesis development and research-lifecycle changes use separate transition guards and retain their reasons.
15. Every agent mutation references the grant that authorized it.
16. Material graph changes use atomic `ChangeSet` application with revision checks.
17. No accepted event is edited or deleted; corrections are additive.
18. Every generated scientific assertion presented as sourced resolves to active trusted assertions in a named snapshot.
19. Every trusted Assertion identifies the exact ChangeSet, human decision, or approved ReviewPolicy responsible for promotion.
20. A ReviewPolicy cannot create a capability grant or authorize an action outside its referenced grant.
21. A ReviewBatch preserves the result and conflict state of each independently atomic member ChangeSet.
22. A Hypothesis ordinal is unique within its project, is never reused, and resolves to a versioned descriptor and target Claim.
23. No ModelCall begins without a ModelRequest, an applicable grant and RoutingPolicy, an active role certification, and an outbound-context manifest.
24. A retry, repair, or fallback cannot expand egress, rights, tools, role scope, quality floor, or approved budget.
25. Every ContextPacket pins its snapshot, ContextRecipe, included object revisions, dependency hashes, and material omissions.
26. A derived retrieval edge cannot appear as a trusted scientific edge unless it passes the normal Assertion and review path.
27. Source content, retrieved text, and model output cannot create or activate a capability, routing policy, ContextRecipe, ReviewPolicy, or scheduler rule.
28. Cache reuse requires matching dependency revisions and cannot cross workspace, project, visibility, rights, or policy boundaries.
29. Every WorkUnit has an idempotency key, resource limits, trace, and explicit completion, failure, cancellation, or checkpoint semantics.
30. Canonical WorkVersion processing can be reused across projects; project-specific relevance and evidence judgments cannot silently enter the shared corpus.
31. A client snapshot, delta, tool call, or local view-state change cannot mutate authoritative scientific or control state outside the typed command path.
32. The same material edit has the same ChangeSet and authorization semantics whether initiated directly or through conversation.
33. Every displayed present-standing assessment identifies its `as_of` date, graph snapshot, scope, search coverage, processing depth, and material limitations.
34. Literature-derived alternatives and Petra-proposed rivals remain distinguishable in every projection and synthesis.
35. A SuggestedAction identifies a scientific objective and readiness; response depth alone cannot name or justify the action.
36. `current_snapshot`, cached, running, awaiting-input, proposed, validated, and applied states cannot be rendered as interchangeable completion.
37. Development, current activity, evidential warrant, and research lifecycle cannot be projected as one Hypothesis state.
38. Every HypothesisAssessment is immutable and pins its subject and Claim revisions, snapshot, date, perspective, profiles, coverage, dependencies, conflicts, and material unknowns.
39. Review state and freshness state remain independent; `stale`, `invalidated`, and `superseded` are not review judgments.
40. Every PostureDecision pins one HypothesisAssessment and names exactly one primary posture.
41. An unmapped Finding can be inspected but cannot activate a posture, create enforceable behavior, or satisfy an Obligation.
42. Only an activated PostureDecision or applicable policy can create an enforceable Obligation.
43. An ObligationWaiver cannot set the Obligation to `satisfied` and must preserve its downstream constraints.
44. A failed WorkUnit cannot close its Obligation without a separate satisfaction, waiver, non-applicability, supersession, or expiry decision.
45. A numerical criterion can govern only its named operational decision; its result cannot directly create a scientific support or contradiction Assertion.
46. A scientific amendment creates a new ProtocolVersion; an operational implementation or authorization change creates a new ExecutionPlan.
47. Retrying an ExecutionPlan cell creates a new Run and cannot overwrite the earlier attempt.
48. Generated code and execution sandboxes cannot write PostgreSQL or Neo4j directly.
49. Automation mode cannot grant filesystem, network, secret, external-service, resource, or budget capability.
50. `FAILS_TO_REPLICATE` requires a valid reproduction attempt, explicit target, and reviewed comparability rationale.
51. A RootCauseInvestigation cannot invalidate a surprising Result or change scientific warrant without the applicable validity, Assertion, and review path.
52. Sandbox snapshots cannot substitute for canonical content-addressed input and output artifacts.
53. Every DraftArtifact pins one graph snapshot, CompositionRequest, EvidencePacket, ProvenanceMap, CitationBundle, and producing actor or model record.
54. Every material scientific DraftSpan resolves to evidence, experimental provenance, explicit Petra inference, or researcher-supplied judgment; a citation alone cannot supply that relation.
55. A researcher or Felicity language edit that changes a mapped DraftSpan makes its provenance and citation mapping stale until revalidated.
56. A RenderedArtifact cannot change the semantic DraftArtifact or acquire scientific support absent from it.
57. Interface, API, and future MCP mutations use the same typed command, capability, review, idempotency, and event path.
58. An external adapter cannot expose direct PostgreSQL, Neo4j, sandbox, filesystem, network, secret, or arbitrary graph-mutation authority.
59. An AG-UI event, interaction snapshot, delta, message, or serialized stream cannot substitute for a Petra domain event, authoritative snapshot, or scientific object.
60. A tool call or interrupt response remains untrusted command input until complete, runtime-validated, revision-checked, authorized, and executed server-side.
61. Aborting an AG-UI connection cannot change a durable WorkUnit's state; cancellation requires an explicit authorized Petra command.
62. AG-UI feature discovery cannot create, imply, or expand a `CapabilityGrant`.
63. Every versioned Petra custom interaction event is registered and allowlisted; unknown custom events cannot mutate authority or control execution.
64. Protocol types remain outside Petra's domain core and map through replaceable client and server adapters.

---

## Materialized views

The minimum system should build these projections:

- **Canonical corpus:** works, versions, artifacts, identifiers, and source spans.
- **Trusted project graph:** accepted project-visible assertions as typed edges plus assertion IDs.
- **Quarantine graph:** proposed entities and assertions awaiting review.
- **Personal overlay:** private evidence and judgments with strict retrieval filtering.
- **Hypothesis ledger:** development, activity, warrant, lifecycle, standing, alternative coverage, dependence, stakes, evidence, assumptions, predictions, tests, and transition history.
- **Assessment and posture:** Indicators, Findings, AxisAssessments, immutable HypothesisAssessments, posture decisions, profile versions, unknowns, invalidation, overrides, and history.
- **Obligation ledger:** open, active, satisfied, waived, inapplicable, superseded, and expired Obligations with satisfaction evidence and downstream constraints.
- **Experiment ledger:** Experiments, ProtocolVersions, ExecutionPlans, plan cells, Runs, Results, Analyses, criteria, evaluations, operational decisions, artifacts, costs, validity, reproduction, independence, comparability, and incident investigations.
- **Derived retrieval graph:** rebuildable semantic neighbors, communities, candidate relations, ranking features, and dependency revisions.
- **Model gateway:** providers, deployments, role profiles, certifications, routing policies, requests, calls, validation, and replayability.
- **Context workspace:** conversation state, active snapshot, ContextRecipes, ContextPackets, inclusions, and omissions.
- **Interaction trace:** PetraInteractionRuns, protocol/profile versions, ordered event references, interrupts, resumes, replay checkpoints, redaction state, and linked WorkUnits without treating the stream as scientific authority.
- **Work and cost:** WorkUnits, dependencies, status, cache decisions, latency waterfalls, resource use, and validated cost.
- **Research Brief:** active question, live Hypotheses, evidence frontier, disagreements, standing coverage, landscape readiness, active work, and SuggestedActions.
- **Hypothesis landscape:** literature-derived alternatives, Petra-proposed rivals, search coverage, freshness, omissions, and related WorkUnits.
- **Focused interface views:** evidence matrices, graph paths, paper inspection, selected-object provenance, authoritative revision, and projection freshness.
- **Composition workspace:** CompositionRequests, plans, EvidencePackets, DraftArtifact revisions, DraftSpan provenance, CitationBundles, mapping freshness, validations, and RenderedArtifacts.
- **Agent activity:** objectives, posture, permissions, model requests and calls, proposed changes, and outcomes.
- **Review workspace:** active mode, policy eligibility, batches, exceptions, audits, calibration, and projection status.
- **Change timeline:** applied and reverted change sets with impact summaries.
- **Snapshot view:** immutable state used by an evaluation, DraftArtifact, comparison, or later external representation.

All user-visible graph edges should provide a direct route to the assertion record behind them.

---

## Minimum acceptance tests

The schema and event implementation are ready for the first pilot when these tests pass:

1. Ingest two versions of one paper without duplicating the canonical work.
2. Preserve an ambiguous work or author match without forcing a merge.
3. Extract a claim into quarantine with an exact source span and model-call provenance.
4. Reject promotion of an extracted claim that has only a search snippet.
5. Promote a reviewed assertion through an atomic change set and show it as a graph edge.
6. Trace the projected edge back to the proposal, source span, model call, approval, and change set.
7. Record support and contradiction against the same hypothesis without resolving the disagreement automatically.
8. Prevent a Hypothesis from becoming `test_ready` without an applicable reviewed ProtocolVersion that can bear on its target Claim.
9. Prevent a scientific Run against a draft ProtocolVersion or unauthorized ExecutionPlan.
10. Record an execution failure without producing a Result or changing Hypothesis warrant.
11. Record a completed Run, Result, Analysis, CriterionEvaluation, OperationalDecision, and separate interpretation Assertion.
12. Reject an agent action after its capability grant is revoked or its budget is exhausted.
13. Detect a concurrent graph edit and mark the stale change set as conflicted.
14. Revert an applied change through compensating events and reconstruct both historical states.
15. Rebuild graph projections from the event log and obtain the same active assertion IDs.
16. Create a snapshot and reproduce the evidence paths shown in an answer from that snapshot.
17. Batch-review independently atomic ChangeSets and allow unaffected members to apply when one member conflicts.
18. Auto-promote an eligible Assertion under an approved ReviewPolicy and retain policy, calibration, pipeline, and audit provenance.
19. Pause a ReviewPolicy after a configured audit stop condition without revoking unrelated capabilities.
20. Create `H12` with a descriptor, revise the descriptor without reusing the ordinal, and preserve its target Claim and history.
21. Route a ModelRequest only through deployments with an active role certification and show every exclusion reason.
22. Block a remote ModelCall for `E0` context and prevent every fallback from widening its outbound manifest.
23. Compile a ContextPacket from a named snapshot and recipe, including contrary evidence and material omissions.
24. Answer a provenance-path request from local graph state without a generative ModelCall.
25. Invalidate only dependent derived artifacts after revising one Claim and prevent stale cache reuse.
26. Prevent an instruction embedded in a paper or model output from modifying a control object.
27. Reuse canonical parsing, SourceSpans, and extraction artifacts when one WorkVersion enters a second project while keeping project judgments separate.
28. Cancel and resume a checkpointable WorkUnit without duplicating committed outputs.
29. Reconstruct one grounded answer's latency and validated cost across graph query, retrieval, model, validation, and projection stages.
30. Preserve one Hypothesis identity and revision across the Research Brief, evidence matrix, focused graph, inspector, and assistant.
31. Distinguish current-snapshot, cached, running, awaiting-input, proposed, validated, and applied interface states.
32. Trace an assistant scientific assertion through the focused interface projection to its Assertion and exact SourceSpan.
33. Apply the same evidence-relation correction directly and conversationally through equivalent typed ChangeSet semantics.
34. Record a HypothesisLandscape that distinguishes an incomplete search, no found literature-derived alternative, and a Petra-proposed rival.
35. Reject a present-standing display that lacks an `as_of` date, graph snapshot, scope, or material coverage limitations.
36. Reject a SuggestedAction that names only `research_deeply` without a scientific objective, rationale, and readiness.
37. Recover a dropped interaction stream without duplicating a command, WorkUnit result, or ChangeSet application.
38. Prevent streamed or client-filtered tool arguments from executing an unauthorized command.
39. Represent a developed but insufficiently supported Hypothesis without changing its development or lifecycle.
40. Create a new ExecutionPlan for an environment repair without changing the locked ProtocolVersion.
41. Create a new ProtocolVersion for a changed measure and prevent it from rewriting earlier Runs.
42. Record a valid Result that does not meet a criterion without calling the Run an execution failure.
43. Preserve a criterion's timing, raw value, uncertainty, boundary distance, and sensitivity.
44. Block a sandbox from PostgreSQL, Neo4j, unapproved network destinations, and host filesystem writes.
45. Validate sandbox outputs before committing their manifest and artifact hashes.
46. Retry one plan cell as a new Run without duplicating committed outputs.
47. Record replay, repeat, direct reproduction, and conceptual replication with explicit independence and comparability.
48. Prevent a crashed or invalid attempt from creating `FAILS_TO_REPLICATE`.
49. Diagnose a deliberately induced operational failure through candidates, diagnostic evidence, correction, and verification without changing a scientific Result.
50. Run the same backend conformance suite against local OCI and the provisional managed adapter before hosted untrusted execution.
51. Compose one EvidencePacket from a named snapshot with relevant, contrary, and omitted-evidence fields.
52. Create a DraftArtifact whose material DraftSpans resolve to evidence, inference, or researcher origin.
53. Preserve an abstract-only limitation through prose, citation inspection, and rendering.
54. Generate a CitationBundle from canonical WorkVersions without inventing incomplete metadata.
55. Detect when a Felicity language revision changes scientific force or citation scope.
56. Store a researcher edit as a new DraftArtifact revision and mark affected provenance stale.
57. Render one semantic draft to Markdown and LaTeX plus a BibTeX bibliography without changing its support mapping.
58. Invoke one query and one ChangeSet proposal through interface and internal API adapters with equivalent authorization and event results.
59. Reject an adapter attempt to bypass the typed command path or request direct database authority.
40. Retire a Hypothesis for a project reason without labeling its warrant as challenged or disproven.
41. Create a partial HypothesisAssessment pinned to a target revision, snapshot, date, perspective, profile, and coverage manifest.
42. Preserve deterministic, model-proposed, human, and policy-derived Findings as distinct origins.
43. Keep one historical standing assessment current when an unrelated present-warrant dependency changes.
44. Mark a time-sensitive assessment stale without changing its review state or erasing its last posture.
45. Prevent an invalidated assessment from governing a consequential transition without reassessment or valid waiver.
46. Activate one primary posture with determining Findings, Obligations, SuggestedActions, and an inspectable policy reason.
47. Retain an unmapped Finding while preventing it from controlling execution.
48. Satisfy and waive separate Obligations without treating waiver as satisfaction.
49. Preserve the downstream limitation created by a valid ObligationWaiver.
50. Evaluate a scoped numerical operational criterion without converting its outcome into scientific support or contradiction.
51. Complete one run through the pinned official AG-UI client and Petra adapters with valid lifecycle, text, activity, state, tool, and terminal event order.
52. Present one review ChangeSet through an AG-UI interrupt and prove that direct and conversational decisions invoke the same idempotent Petra command.
53. Drop and reconnect an AG-UI stream without duplicating a command, WorkUnit result, interrupt resolution, or ChangeSet application.
54. Abort an interaction connection without cancelling its durable WorkUnit, then cancel that WorkUnit through the explicit authorized command.
55. Reject an unregistered custom event and prove that an `InteractionFeatureManifest` cannot grant a capability.

---

## Explicitly outside the minimum model

The first implementation does not need:

- a universal scientific ontology;
- automatic truth scores;
- unrestricted graph predicates generated at runtime;
- full causal graphical models;
- social collaboration or multi-tenant public editing;
- blockchain or external notarization;
- automated publication;
- deletion of provenance history;
- one physical database for every data type;
- automatic reconciliation of every bibliographic identity.

These features may be added only when a concrete competency question and evaluation justify them.

---

## First implementation slice

The smallest useful vertical slice is one source-to-answer path for the LLM-judge pilot:

1. register a project and bounded capability policy;
2. ingest one legitimate paper version and immutable artifact;
3. create source spans;
4. route one certified extractor ModelRequest and propose claims and `ASSERTS` relations into quarantine;
5. let Petra explain a guided review batch and promote selected Assertions through atomic ChangeSets;
6. apply and audit one bounded source-native ReviewPolicy;
7. create `H1` with a descriptor, rival, predicted Claims, `structured` development, and `active` research lifecycle;
8. create one partial HypothesisAssessment with a small inspectable Finding set and one reviewed PostureDecision;
9. create at most a few Obligations, including one that can demonstrate satisfaction or waiver without changing warrant directly;
10. compile a contradiction-aware ContextPacket from a versioned recipe and snapshot;
11. route one synthesist ModelRequest and generate a short synthesis whose first reference uses `H1 — descriptor` and whose scientific Assertions link back to source spans;
12. render the active question, `H1`, evidence limitations, synthesis, posture, and one scientifically specific SuggestedAction in a Research Brief;
13. preserve `H1` selection across its evidence matrix, focused graph path, inspector, and assistant reference;
14. answer one provenance-path question through a deterministic graph fast path;
15. show the WorkUnit, cache decisions, ModelCalls, latency waterfall, and validated cost behind the synthesis;
16. create a snapshot and replay the graph and interface projections from events;
17. carry the synthesis and its visible activity through the pinned official AG-UI client and Petra adapters;
18. persist and reconnect the `PetraInteractionRun`, resolve one review interrupt through the normal ChangeSet command, and distinguish stream abort from WorkUnit cancellation.

This slice tests Petra's defining contract before adding autonomous experiment execution. If it cannot preserve the difference between a paper, a passage, a claim, an inference, and a trusted graph assertion, additional agents will only produce mistakes faster.
