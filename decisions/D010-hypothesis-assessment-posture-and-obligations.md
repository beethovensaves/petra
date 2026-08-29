# D010: Snapshot-bound hypothesis assessment with extensible posture obligations

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Hypothesis development, activity, warrant, lifecycle, scientific standing, alternative coverage, project dependence, research stakes, assessment provenance and invalidation, posture decisions, extensible findings and obligations, enforcement and waiver, and the boundary for numerical criteria
- **Depends on:** [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md)

## Decision

Petra will assess a Hypothesis through several independent, snapshot-bound dimensions rather than one maturity ladder, confidence score, or mutable status.

The semantic pipeline is:

```text
graph evidence
      ↓
AssessmentIndicators
      ↓
AssessmentFindings
      ↓
AxisAssessments
      ↓
HypothesisAssessment
      ↓
PostureDecision
      ↓
Obligations and SuggestedActions
```

Development, activity, evidential warrant, and lifecycle answer different questions and remain separate. Scientific standing, alternative-landscape coverage, project dependence, and research stakes are additional assessment axes. Missing information remains unknown rather than being converted into a neutral score.

An assessment is immutable and pins its target revision, graph snapshot, `as_of` date, temporal perspective, scope, evidence, search coverage, methods, profiles, actors, and limitations. Dependency changes create a new assessment or make affected axes stale or invalid; Petra never rewrites an earlier assessment into agreement.

A `PostureDecision` selects one primary posture from a small stable vocabulary: `explore`, `clarify`, `challenge`, `discriminate`, `reproduce`, or `consolidate`. It may create zero or more typed Obligations and SuggestedActions. Petra will not attempt to enumerate every scientific rationale or obligation in the core schema.

The extension principle is:

> Petra may preserve and discuss novel scientific considerations, but only registered, validated semantics may control execution or authoritative transitions.

Numerical indicators and scoped operational thresholds are permitted. Universal numeric rules for truth, hypothesis confidence, paper quality, scientific currentness, or posture are not. [D011](D011-experiment-sandbox-and-reproducibility.md) defines experiment and validation criteria while preserving the distinction among measurement, decision rule, operational outcome, and scientific interpretation.

## Context

The earlier product model combined `Seed`, `Under test`, `Provisionally supported`, `Reproduced`, and `Retired` in one sequence. Those states describe different things: how well a Hypothesis is formulated, what work is active, what evidence bears on it, and whether a project still pursues it.

Combining them creates invalid implications. A developed Hypothesis can be unsupported. A retired Hypothesis can remain scientifically plausible. A reproduction changes evidence but not necessarily conceptual development. A failed run changes neither warrant nor lifecycle unless its output is scientifically interpretable and reviewed.

Petra also needs to work beyond literature synthesis. Progressive ML experimentation, psychology, computational linguistics, and other domains will add specialized validity checks, findings, and obligations. An exhaustive ontology now would encode untested assumptions. Free-form model reasoning, however, would make behavior invisible and unsafe.

D010 therefore defines a stable assessment envelope and extension mechanism. The first pilot supplies only the types it can evaluate.

## Four independent Hypothesis state families

### Development

Development answers: how completely has Petra represented the Hypothesis as a research object?

- `seed`: a rough conjecture whose wording and scope may change cheaply;
- `articulated`: an explicit target Claim, descriptor, and provisional scope exist;
- `structured`: applicable assumptions, rivals, predicted observations, confounds, and failure conditions are represented;
- `test_ready`: at least one valid discriminating literature-analysis or experiment protocol can bear on the target Claim;
- `developed`: the Hypothesis has passed through at least one formal research or test cycle and retains versioned operationalizations, limitations, revisions, and unresolved alternatives.

Development does not imply support. A scope or construct change can lower the applicable development state while preserving history.

### Activity

Activity answers: what work is currently occurring?

Initial activity values include:

- `idle`;
- `mapping_literature`;
- `analyzing_evidence`;
- `designing_test`;
- `under_test`;
- `awaiting_review`;
- `reproducing`;
- `updating_standing`.

Activity is derived from workflow and WorkUnits. Several activities may coexist. It does not express development, warrant, or truth.

### Evidential warrant

Warrant answers: what does the current scoped evidence bear on?

Initial summaries are:

- `unassessed`;
- `insufficient`;
- `supporting_within_scope`;
- `challenging_within_scope`;
- `mixed`;
- `scope_dependent`;
- `underdetermined`;
- `not_comparable`.

Every summary exposes directness, scope alignment, study-design adequacy, measurement validity, independence, reproduction status, relation types, known defects, and unresolved disputes where available. `mixed` is not a count of positive and negative papers.

### Lifecycle

Lifecycle answers: what does the project intend to do with the Hypothesis?

- `active`;
- `paused`;
- `retired`;
- `superseded`.

Retirement can reflect priority, tractability, redundancy, or scope. It does not mean disproof. Supersession identifies the replacement and whether it narrows, reformulates, or conflicts with the earlier Hypothesis.

## Additional assessment axes

### Scientific standing

Standing describes how the relevant literature and evidence landscape engage the target Claim under a named temporal perspective. It is not a consensus or currentness score.

The profile records:

- `as_of` date and graph snapshot;
- historical role;
- current research activity;
- recency and comparability of direct tests;
- adoption, testing, extension, reframing, qualification, challenge, reproduction, and methodological criticism;
- construct, method, dataset, population, and measurement continuity or drift;
- active intellectual descendants;
- alternative-landscape and corpus coverage;
- material search and processing limitations.

An old paper may provide strong source-native evidence and remain historically foundational while being insufficient to establish present standing. A recent publication is not current merely because of its date.

Substantive dialogue uses provenance-bearing Claim-level Assertions. `CITES_AS_BACKGROUND`, `ADOPTS`, `DIRECTLY_TESTS`, `EXTENDS`, `REFRAMES`, `CHALLENGES`, `QUALIFIES`, `REPLICATES`, `FAILS_TO_REPLICATE`, and `CRITIQUES_METHOD` remain distinguishable. Venue cannot substitute for this analysis.

### Alternative-landscape coverage

Initial coverage states are:

- `unsearched`;
- `seeded`;
- `bounded_search`;
- `broad_search`;
- `provisionally_saturated`.

Saturation is always relative to a recorded protocol, terminology, source set, field coverage, languages, time range, and marginal yield. Warnings such as `terminology_fragmented`, `adjacent_field_unsearched`, `language_coverage_limited`, `full_text_limited`, and `historical_coverage_limited` qualify the state.

Literature-derived alternatives and Petra-proposed rivals remain separate. “No alternative exists,” “none was found,” and “the search is incomplete” cannot collapse into one state.

### Project dependence

Dependence describes how much project state relies on the Hypothesis:

- `none`;
- `local`;
- `material`;
- `critical`.

It considers downstream Hypotheses, protocols, code, experiments, decisions, and outputs rather than raw edge count. Dependence raises the burden for dismissal or incompatible change; it does not increase scientific warrant.

### Research stakes

Stakes record the consequences of falsely treating the Hypothesis as supported, prematurely rejecting it, and acting under unresolved uncertainty. They include reversibility and ethical, financial, publication, or external effects where applicable.

The initial system does not need a universal stakes scale. A high-impact classification requires a project policy or human decision and cannot be silently assigned by a model.

## Assessment records

### AssessmentIndicator

An `AssessmentIndicator` is a reproducible description of graph or analysis state, such as the date of the latest identified direct test, the presence of unresolved contradictions, abstract-only coverage, dataset-family concentration, or a missing baseline.

It records its computation, inputs, scope, units where applicable, and limitations. An indicator does not decide what its value means scientifically.

### AssessmentFinding

An `AssessmentFinding` interprets indicators and evidence under a registered profile. It contains:

- namespaced type and schema version;
- target, scope, and temporal perspective;
- evidence and indicator references;
- origin: deterministic rule, model proposal, human judgment, or policy derivation;
- method, actor, and applicable model records;
- coverage and limitations;
- review state;
- invalidation dependencies;
- concise human-readable explanation.

Examples include `literature:contemporary_direct_tests_sparse`, `psychology:construct_validity_disputed`, `ml:baseline_compute_not_matched`, and `evaluation:test_set_leakage_risk`.

An unknown finding may be retained as `unmapped` for inspection. It cannot acquire executable meaning until its schema, validators, renderer, and policy behavior are registered.

### AxisAssessment

An `AxisAssessment` contains a controlled summary, supporting and conflicting Findings, material unknowns, scope, perspective, coverage, origin, review state, and any human override for one axis.

The summary never hides its basis. An axis may remain absent or unknown when the applicable profile cannot support an assessment.

### HypothesisAssessment

A `HypothesisAssessment` is an immutable envelope containing:

- Hypothesis and target Claim revisions;
- project, workspace, graph snapshot, and `as_of` date;
- present-day or historical temporal perspective;
- assessment profile, schema, and policy revisions;
- applicable domain and field profiles;
- evidence, indicator, Finding, and derived-artifact dependencies;
- corpus and search-coverage manifest;
- AxisAssessments, conflicts, and material unknowns;
- actor, pipeline, model, prompt, and validator records;
- creation reason and triggering events;
- freshness and invalidation rules;
- the prior assessment it supersedes.

Canonical indicators and literature analysis may be reused. The HypothesisAssessment remains project-scoped because scope, purpose, admissible evidence, dependence, stakes, and policy differ among projects.

## Review and freshness are separate

Assessment review state is:

- `partial`;
- `provisional`;
- `reviewed`;
- `disputed`.

Freshness state is:

- `current`;
- `stale`;
- `invalidated`;
- `superseded`.

`stale` means a time-sensitive search or analysis is due but no dependency is known to be wrong. `invalidated` means an input, method, scope, or policy changed materially. A stale assessment may remain informative with its date. An invalidated assessment cannot govern a new consequential transition without reassessment or an authorized waiver.

Petra invalidates the smallest affected portion when possible. A descriptor-only revision does not invalidate warrant. A target Claim or scope revision can invalidate warrant, standing, and alternative coverage. A new accepted Result may invalidate warrant without changing a historical standing assessment. Retraction, correction, SourceSpan relinking, profile changes, and LandscapeScan results invalidate their dependents.

Reassessment is event-driven, scheduled for time-sensitive work, or requested on demand. D008's scheduler debounces changes, groups work, and prioritizes active, dependent, consequential Hypotheses. Reassessment creates a new record and preserves the old one.

## PostureDecision

A `PostureDecision` is a versioned control object that pins one HypothesisAssessment and contains:

- one primary posture;
- determining Findings and material unknowns;
- posture-policy and registry revisions;
- Obligations and SuggestedActions;
- activation, expiry, and invalidation conditions;
- human override and reason;
- the changes that require reassessment.

The core postures are:

- `explore`: broaden ideas and abandon weak early candidates cheaply;
- `clarify`: stabilize meaning, scope, operationalization, and failure conditions;
- `challenge`: seek counterevidence, hidden assumptions, and credible alternative explanations;
- `discriminate`: identify predictions or analyses that separate live rivals;
- `reproduce`: seek independent repetition when dependence, uncertainty, or stakes justify it;
- `consolidate`: synthesize scoped stable findings while preserving boundaries and residual uncertainty.

The posture is not a scientific Assertion. It controls research behavior but cannot change its own assessment inputs. Outputs produced under a posture enter the normal evidence and review path before they affect a later assessment.

If an assessment becomes stale, Petra may display the last posture as dated. If it becomes invalidated, consequential posture-controlled work pauses unless a valid policy permits continuation.

Models may propose Findings, obligations, or an override rationale. They cannot activate a posture, set enforcement, accept a waiver, or declare satisfaction outside the applicable command, registry, and review path.

## Extensible semantic profiles

Petra uses layers:

| Layer | Change policy | Purpose |
| --- | --- | --- |
| Invariants | Rare schema decision | Provenance, scope, snapshot, authority, permission |
| Core postures | Deliberate product decision | Stable research-assistant stance and language |
| Generic obligation classes | Versioned registry | Gather evidence, resolve ambiguity, test validity, verify reproducibility |
| Domain profiles | Evaluated extension | Literature, psychology, computational linguistics, ML experimentation |
| Project extensions | Local, reviewed extension | Custom benchmarks, laboratory rules, publication requirements |
| Narrative explanation | Flexible but evidence-bound | User-facing rationale under D006 |

The first registered assessment subject is Hypothesis. The envelope uses a typed subject reference so D011 can add Protocol, Experiment, Model, Dataset, or another reviewed research object without introducing a universal base ontology now.

Profile definitions are versioned control objects. A model may propose one but cannot register or activate executable semantics.

## Obligations, enforcement, and waiver

An `Obligation` records:

- namespaced type and schema version;
- subject and applicable transitions or actions;
- creating Finding, PostureDecision, or policy;
- scientific or operational rationale;
- satisfaction criteria and admissible evidence;
- enforcement level;
- waiver policy;
- lifecycle, expiry, and invalidation conditions;
- SuggestedActions and WorkUnits that may address it.

Initial enforcement levels are:

- `advisory`;
- `required_for_transition`;
- `required_for_action`.

Obligation lifecycle is `open`, `in_progress`, `satisfied`, `waived`, `not_applicable`, `superseded`, or `expired`. A failed WorkUnit leaves the obligation open unless a separate decision changes applicability.

True system invariants are not ordinary obligations. Provenance, rights, capability, immutable-event, and other non-negotiable domain requirements cannot be waived through an Obligation. Workspace and project policy determine which registered obligations allow a waiver.

An `ObligationWaiver` records the exact obligation revision, actor and authority, rationale, scope, duration, accepted consequences, compensating controls, and expiry or invalidation. Waiver never means satisfaction.

A waiver can constrain downstream use. An exploratory ML Run may proceed without a matched baseline when policy permits, while its Result remains ineligible to support a matched-performance Claim until the obligation is satisfied.

## Automation boundary

- Indicators compute automatically when their registered dependencies are available.
- Findings may be proposed automatically and retain origin and review state.
- Low-impact AxisAssessments may activate under a calibrated ReviewPolicy.
- Posture changes that affect material downstream work, experiments, publication, or retirement follow review requirements based on mode, dependence, and stakes.
- Human overrides create parallel, versioned decisions rather than deleting Petra's assessment.
- Only an activated PostureDecision can create enforceable posture Obligations.

This permits routine reassessment without allowing a fluent model response to redirect a consequential research program silently.

## Numerical criteria boundary

Numerical indicators are valid when their quantity, units, scope, method, and limitations are explicit. Scoped thresholds may control an evaluation, stage gate, certification, budget, or transition under a versioned protocol or policy.

The governing rule is:

> Numbers may control an operation, evaluation, or transition. Crossing a threshold does not, by itself, make a scientific Claim true or false.

Petra keeps these concepts separate:

```text
Measurement
     ↓
DecisionCriterion
     ↓
CriterionEvaluation
     ↓
OperationalDecision
     ↓
optional reviewed scientific interpretation
```

Petra does not use a universal hypothesis-confidence percentage, paper-quality score, currentness score, paper-count rule, reproduction count, or model self-reported confidence as posture authority.

A numerical rule must identify its purpose, metric, scope, derivation, responsible actor, applicable protocol or policy, uncertainty requirements, missing or invalid data behavior, enforcement, and change history. It is labeled `prespecified`, `amended`, or `exploratory` according to when it was chosen. Raw results, uncertainty, distance from a decision boundary, and reasonable sensitivity remain inspectable.

[D011](D011-experiment-sandbox-and-reproducibility.md) defines DecisionCriterion and CriterionEvaluation for experimental design, tolerances, benchmark promotion, reproducibility, and validation. D007 and D008 may continue to use versioned role-quality, budget, latency, and resource limits under the same boundary.

## Options considered

### One Hypothesis state machine

Rejected because it conflates conceptual development, active work, evidence, and project intent.

### One confidence or currentness score

Rejected because it hides scope, disagreement, quality, coverage, temporal perspective, and the judgment used to combine them.

### Exhaustive central ontology

Rejected because Petra has not observed enough domains or experiments to define every Finding, Obligation, or rationale responsibly.

### Free-form model posture

Rejected because an unversioned explanation cannot provide deterministic authority, replay, validation, or stable UX.

### Stable envelope with namespaced profiles

Selected because it keeps authority and provenance strict while allowing evidence-backed scientific semantics to grow through evaluated use.

## Consequences

### Benefits

- Petra can treat early ideas cheaply without dismissing developed Hypotheses casually.
- Historical importance, present standing, warrant, development, and project intent remain distinct.
- Partial and disputed assessments remain usable without false completeness.
- Posture behavior is inspectable and independent of model weights.
- Literature and future ML experimentation can share a kernel without sharing every domain rule.
- Obligations can guide or gate progressive work while retaining waivers and consequences.
- Numerical validation remains available without becoming a truth score.

### Costs and risks

- Several orthogonal states require careful UX and schema naming.
- Profiles and registries require governance and evaluation.
- Scientific Findings may remain legitimately disputed.
- Dependency tracking and selective invalidation add runtime work.
- Too many Obligations can turn Petra into a bureaucratic checklist.
- Over-automation can make posture appear more objective than its inputs.

Petra mitigates these risks with a small initial registry, partial assessments, visible origin and coverage, one primary posture, user overrides, bounded enforcement, and pilot-driven extension.

## Validation

D010 is satisfied when Petra can:

1. represent one Hypothesis's development, concurrent activity, warrant, and lifecycle independently;
2. retain a developed but insufficiently supported Hypothesis without contradiction;
3. retire an active Hypothesis for project reasons without labeling it disproven;
4. create a partial HypothesisAssessment pinned to a target revision, snapshot, date, perspective, scope, and coverage manifest;
5. preserve deterministic, model-proposed, human, and policy-derived Findings as distinct origins;
6. show the basis, conflict, unknowns, and review state behind every AxisAssessment;
7. keep a historical standing assessment separate from a present-day standing assessment;
8. distinguish background citation from one substantive dialogue relation grounded in a SourceSpan;
9. distinguish no found alternative, incomplete search, provisional saturation, and a Petra-proposed rival;
10. invalidate warrant after a material Result while leaving an unrelated historical assessment current;
11. display a stale posture as dated and block an invalidated posture from a consequential transition;
12. activate one primary posture with determining Findings, Obligations, and SuggestedActions;
13. retain an unmapped Finding for review while preventing it from controlling execution;
14. satisfy, waive, supersede, and expire an Obligation without conflating those outcomes;
15. preserve the downstream limitation created by a valid waiver;
16. prevent a model from activating a posture, enforcement level, waiver, or satisfaction decision outside policy;
17. use a numerical indicator without converting it into hypothesis confidence;
18. evaluate a scoped operational threshold without presenting its pass or fail as a scientific conclusion;
19. preserve whether a criterion was prespecified, amended, or exploratory;
20. replay the assessment, posture, obligation, and waiver history from events and pinned artifacts.

## Deferred decisions

D010 does not choose:

- numerical posture, standing, warrant, or saturation thresholds;
- universal freshness windows or temporal-decay functions;
- exhaustive Finding, Obligation, dialogue, or field-profile registries;
- exact standing-summary vocabulary;
- a complete assessment-to-posture mapping table;
- ML experimentation obligations or stage gates;
- automatic posture-activation thresholds;
- a global confidence score;
- exact implementation schemas for D011's initial DecisionCriterion forms.

The first pilot should use one Hypothesis, a small inspectable Finding set, one reviewed PostureDecision, and at most a few Obligations. Petra promotes recurring semantics into shared profiles only after observed use and evaluation.

## Revisit triggers

Reconsider D010 if:

- researchers cannot distinguish the state families reliably;
- partial assessments are too difficult to interpret or compare;
- selective invalidation causes excessive reassessment or stale behavior;
- the six core postures cannot express a recurrent scientific stance;
- obligations accumulate without improving research decisions;
- field profiles require incompatible meanings for a core state;
- project overrides routinely disagree with posture recommendations;
- numerical criteria leak into unsupported truth or confidence language;
- progressive ML experimentation cannot use the envelope without distorting its objects.

Any revision must preserve provenance, scope, temporal perspective, explicit unknowns, extension governance, scientific-versus-control separation, and the distinction between operational criteria and scientific conclusions.

## Subsequent decision

[D011](D011-experiment-sandbox-and-reproducibility.md) defines progressive experiment execution and reproducibility. [D012](D012-scoped-research-artifacts-and-external-adapters.md) defines scoped research-artifact composition and the shared application boundary for future external adapters.
