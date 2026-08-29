# D011: Progressive experiment execution and reproducibility

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Experiment identity, protocol and execution locks, protocol profiles, sandbox authority, execution providers, provenance, Run and Result semantics, analysis, DecisionCriteria, failure diagnosis, reproduction, and progressive ML stage gates
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D010](D010-hypothesis-assessment-posture-and-obligations.md)

## Decision

Petra will support progressive experimentation without forcing exploratory work through a publication-grade protocol. Scientific meaning, concrete execution, observations, analyses, operational decisions, and scientific interpretation remain separate graph objects:

```text
Hypothesis
    ↓
Experiment
    ↓
ProtocolVersion          locks scientific meaning
    ↓
ExecutionPlan            locks exact authorized work
    ↓
Run × n
    ↓
Results
    ↓
Analysis
    ↓
CriterionEvaluations
    ↓
OperationalDecisions
    ↓
proposed scientific Assertions
```

`Experiment` is the durable identity of a scientific test or testing program. `ProtocolVersion` is an immutable, reviewed design. `ExecutionPlan` is an immutable run matrix with exact code, data, model, environment, configuration, resource, capability, and budget identities. `Run` is one attempt against one plan cell. `Result` records an observation. `Analysis` is a versioned transformation or comparison over named Results and artifacts. `CriterionEvaluation` applies a prespecified, amended, or exploratory operational rule. A scientific interpretation remains an Assertion and enters Petra's ordinary provenance and review path.

Petra will use a provider-neutral `ExecutionBackend` contract. Local development and trusted offline work may use an OCI-compatible local backend. Hosted or materially untrusted generated code will use an isolated managed backend or an equivalent deployment that passes the same conformance suite.

[Daytona](https://www.daytona.io/docs/) is the provisional managed reference backend. Petra will not integrate it during the design phase. A later vertical slice must test it before adoption. Failure of that test leaves the domain model unchanged and permits another backend.

## Why two locks are necessary

One lock cannot answer both scientific and operational questions.

`ProtocolVersion` answers: what test did the researcher intend, and what would its result mean? It locks the relevant Hypotheses and predictions, scope, design, measures, controls, analysis plan, decision rules, stopping rules, and invalidation conditions.

`ExecutionPlan` answers: what exactly is Petra authorized to run? It locks the code and environment artifacts, datasets, models, prompts, configuration, seeds, run matrix, hardware requirements, filesystem and network grants, secrets, resource envelope, time limit, budget, output contract, and applicable approvals.

A scientific amendment creates a new `ProtocolVersion`. An operational change creates a new `ExecutionPlan`. Existing Runs retain their original references. Petra never silently changes a seed, dependency, dataset, model, metric, exclusion, budget, or environment beneath an active or completed Run.

Cross-version synthesis requires an explicit comparability assessment. A changed implementation may preserve scientific meaning; a changed metric, exclusion rule, prediction, or operationalization usually does not. Petra records the judgment and its rationale rather than inferring equivalence from shared labels.

## Protocol profiles

Every locked ProtocolVersion uses a registered `ProtocolProfile`. Profiles add requirements without changing the core object model.

### Exploratory

An exploratory protocol requires:

- an objective and scoped target;
- identified inputs, measures, and planned outputs;
- exact provenance and environment capture;
- resource, time, capability, and cost limits;
- visible exploratory status;
- known conditions that would make the output unusable.

Exploratory work may revise cheaply. It cannot be relabeled as confirmatory after its results are known.

### Confirmatory

A confirmatory protocol additionally requires applicable:

- Hypotheses, predictions, and scope;
- baselines, controls, sampling, allocation, and exclusions;
- measures and uncertainty requirements;
- prespecified analysis and DecisionCriteria;
- stopping, invalidation, and missing-data rules;
- anticipated limitations and protocol-deviation handling.

### Benchmark

A benchmark protocol additionally identifies:

- exact artifact and task versions;
- resource-matching policy;
- data-contamination checks;
- metrics, tolerance, equivalence, or non-inferiority rules;
- seed aggregation and treatment of missing or failed Runs;
- hardware, provider, model, and implementation comparability limits.

### Reproduction

A reproduction protocol additionally identifies:

- the target Result, Analysis, Claim, or earlier experiment;
- reproduction type;
- intended similarities and differences;
- independence dimensions;
- comparability requirements;
- the boundary on any resulting interpretation.

Profiles are extensible. A field or methodological community may register a more specific profile after validation; a model cannot invent and activate one during execution.

## Engineering work and scientific Runs

Petra distinguishes engineering WorkUnits from scientific Runs.

Parsing, code generation, formatting, dependency resolution, unit tests, smoke tests, code repair, and diagnostic checks still require isolated execution, an immutable execution specification, provenance, and resource controls. Their outputs are engineering artifacts or diagnostics.

Only a Run attached to an eligible locked ProtocolVersion and ExecutionPlan may produce a Result that enters scientific evidence. Passing a unit test, fixing a dependency, or completing a pipeline does not support a Hypothesis.

This distinction allows Petra to automate inexpensive preparation without laundering successful execution into scientific success.

## Execution trust boundary

Generated code is untrusted. The TypeScript control plane owns commands, policy evaluation, approval, database mutation, artifact registration, and event commits. Python workers and execution sandboxes do not write PostgreSQL or Neo4j directly.

Every execution receives:

- a content-addressed, read-only input bundle;
- a pinned base image or environment artifact and dependency lock;
- an explicit command or structured entry point;
- a run-specific writable output directory;
- a declared output manifest schema;
- CPU, memory, disk, GPU, time, and cost limits where applicable;
- network disabled by default or limited to approved destinations;
- short-lived, narrowly scoped secrets only when required;
- an idempotency key, cancellation behavior, and retry policy.

The sandbox returns artifacts, structured events, logs, metrics, and a manifest. The control plane validates their hashes and schemas before committing authoritative state.

Automation mode and capability are independent. A workflow may be highly autonomous while having no network, no secrets, no host filesystem access, and a small resource envelope. Conversely, a user approval may authorize one networked or costly Run without granting Petra broad autonomy elsewhere.

Dependency installation is a separate environment-build operation. Its lockfile, sources, network destinations, image digest, builder identity, logs, and resulting artifact are recorded. A scientific Run does not perform an unrecorded package installation while executing.

## ExecutionBackend contract

The domain model depends on Petra's interface rather than a vendor SDK. An execution backend must support, or explicitly reject before approval:

- creation from a pinned image or environment identity;
- bounded CPU, memory, disk, GPU, duration, and idle time;
- read-only input staging and output retrieval;
- process start, streaming logs, status, cancellation, and terminal outcome;
- block-all networking and enforceable destination restrictions;
- scoped secret handling;
- stable provider and sandbox identifiers;
- resource and cost telemetry where available;
- cleanup and retention behavior;
- enough metadata to explain material replay limitations.

Provider-specific states are translated into Petra's vocabulary at the adapter boundary. Provider types do not enter ProtocolVersion, Result, CriterionEvaluation, or scientific Assertion schemas.

### Initial backends

`LocalOciBackend` is the local development and trusted-execution adapter. Local execution is not the security boundary for a public multi-user deployment.

`DaytonaBackend` is the provisional hosted and untrusted-execution adapter. Daytona currently documents:

- TypeScript lifecycle, process, filesystem, metrics, snapshot, and resource APIs;
- container and Linux VM sandbox classes;
- outbound block, CIDR allowlist, and domain allowlist controls;
- proxy-mediated secrets that need not enter a sandbox in plaintext;
- persistent snapshots, GPU allocation, and OpenTelemetry integration.

Relevant provider documentation includes [sandbox architecture](https://www.daytona.io/docs/en/architecture/), [network limits](https://www.daytona.io/docs/en/network-limits/), [secret handling](https://www.daytona.io/docs/en/secrets/), and the [TypeScript sandbox API](https://www.daytona.io/docs/en/typescript-sdk/sandbox/).

These are provider claims until Petra verifies the required behavior. Custom network controls may depend on Daytona account tier. The conformance test must therefore verify the actual contracted service, not merely the SDK shape.

### Deferred provider test

Before Daytona becomes a runtime dependency, Petra will test that it can:

1. create an isolated environment from a pinned image or snapshot;
2. block all outbound traffic and enforce an approved allowlist;
3. prevent sandbox code from reading or exfiltrating plaintext secrets;
4. enforce CPU, memory, disk, GPU, time, and cancellation limits;
5. stage hashed inputs and retrieve a complete output manifest;
6. reconnect to an active Run without duplicating execution or commits;
7. export logs and resource telemetry for failure diagnosis;
8. recreate an equivalent Run from a stored ExecutionPlan;
9. prove the absence of database credentials and host filesystem access;
10. expose pricing and limits sufficiently for Petra's budget policy.

If Daytona fails a material requirement or the required service tier is not viable, Petra will evaluate another adapter. [Modal Sandboxes](https://modal.com/docs/guide/sandboxes) are the first fallback because they document TypeScript control, network restrictions, snapshots, bounded CPU and memory, GPU execution, and scientific batch infrastructure. Modal may later serve as a specialized compute backend even if another provider supplies interactive sandboxes.

Petra will not implement several provider adapters before this test. Provider neutrality is demonstrated by the domain contract and its conformance suite, not by accumulating unused integrations.

## Artifact identity and replay

Every Run pins the applicable identities to the extent they exist:

- ProtocolVersion and ExecutionPlan hashes;
- code commit and content artifact;
- dataset identity, version, selection manifest, and content hashes where permitted;
- model provider, deployment, exposed revision, weights or artifact hash when available, and unresolved alias limitations;
- prompts, tools, schemas, and routing records;
- environment image digest, dependency lock, operating system, runtime, and relevant library versions;
- configuration, seeds, locale, clock, and determinism controls where applicable;
- requested and observed hardware, provider, region, and accelerator details;
- input and output manifests, logs, resource use, and validated cost.

Useful reproducibility does not imply bit-for-bit identity. External models may not expose immutable weights; GPU kernels may be nondeterministic; licensed datasets may not be redistributable; hardware may disappear. Petra records which dependencies are preserved, resolvable, substituted, or unavailable and prevents a replay claim from hiding those limits.

Sandbox snapshots are acceleration artifacts, not the permanent scientific record. Canonical inputs and outputs remain content-addressed in Petra's artifact store, with authoritative metadata in PostgreSQL and selected relations projected to Neo4j.

## Run, Result, Analysis, and interpretation

`Run` records one attempt to execute one ExecutionPlan cell. Its lifecycle and outcome remain distinct. A process can finish while its measurement is invalid; a valid Result can fail a criterion; a completed Analysis can remain inconclusive.

`Result` records an observation under its exact Run and scope. It does not claim why the observation occurred or what it means for a Hypothesis.

`Analysis` records a versioned transformation or comparison over named Results and artifacts. It pins code, method, exclusions, aggregation, uncertainty calculation, assumptions, and outputs. Reanalysis creates a new Analysis; it does not rewrite Results.

`DecisionCriterion` is a versioned operational rule. Initial forms may include:

- upper or lower bounds;
- accepted ranges;
- equality or interval containment;
- equivalence and non-inferiority;
- relative regression or improvement;
- composite gates;
- required human review.

Each criterion records its metric, units, scope, rationale, derivation, tolerance, uncertainty requirement, missing and invalid data behavior, protocol and analysis applicability, actor, version, and timing: `prespecified`, `amended`, or `exploratory`.

`CriterionEvaluation` records the applicable inputs, raw measurement, uncertainty, distance from the boundary, sensitivity where relevant, and outcome. `OperationalDecision` records the action or transition the evaluation controls.

The governing rule from D010 remains:

> A criterion may control an operation, evaluation, or transition. Its outcome does not directly make a scientific Claim true or false.

A reviewed Assertion may interpret Results, Analyses, and CriterionEvaluations within a stated scope. It retains the exact experimental provenance and remains open to challenge, qualification, or supersession.

## Failure and validity vocabulary

Petra does not use one overloaded `failed` state. It records the layer at which work stopped or became unusable.

Execution outcomes include:

- `execution_failed`;
- `environment_failed`;
- `resource_exhausted`;
- `timed_out`;
- `cancelled`.

Scientific-validity findings include:

- `protocol_deviation`;
- `measurement_invalid`;
- `result_invalidated`.

Analysis and decision outcomes include:

- `insufficient_precision`;
- `analysis_inconclusive`;
- `criterion_not_met`.

Only `criterion_not_met` describes a valid measurement evaluated against its named rule. Execution failure is not evidence against a Hypothesis. Insufficient precision is not evidence of absence. Protocol deviation may narrow use without invalidating every output; the applicable validity assessment decides that scope.

Retry semantics preserve this distinction. A retry of the same authorized plan cell is a new Run. A repair that changes an environment creates a new ExecutionPlan. A scientific change creates a new ProtocolVersion.

## Root-cause investigations

Petra supports root-cause investigation for execution incidents and validity anomalies. Scientific causal interpretation remains in the Claim, Evidence, Hypothesis, and Assessment system.

```text
Failure or anomaly
      ↓
RootCauseInvestigation
      ↓
CauseCandidate
      ↓
DiagnosticTest
      ↓
DiagnosticEvidence
      ↓
CauseFinding
      ↓
CorrectiveAction
      ↓
Verification
```

A CauseFinding is `confirmed`, `contributing`, `excluded`, or `unresolved`. Petra does not force one root cause when several contributing causes or unresolved alternatives better fit the evidence.

An agent may open a RootCauseInvestigation, collect safe diagnostics, propose cause candidates, and recommend a discriminating check within policy. Corrective changes retain previews and normal approval rules. The investigation never rewrites the affected Run or diagnoses away an inconvenient but valid Result.

Infrastructure correction normally creates a new ExecutionPlan. A changed measure, exclusion, prediction, analysis design, or interpretation requires a new ProtocolVersion or Analysis. CorrectiveAction and Verification remain linked to the original incident and later attempt.

## Reproduction and independence

Petra initially distinguishes:

- `replay`: the same preserved artifacts and configuration;
- `repeat`: the same implementation and protocol with new permitted randomness or observations;
- `direct_reproduction`: a substantially independent implementation of the same test;
- `conceptual_replication`: a different operationalization intended to bear on the same Hypothesis.

Every reproduction attempt names its target and carries an `IndependenceProfile`. The profile records shared or independent authors, code, data, model, provider, hardware, measurement, analysis, laboratory, and other applicable dimensions. It does not collapse independence into one universal score.

A comparability assessment records scope alignment, protocol differences, resource matching, measurement compatibility, implementation differences, known deviations, and limitations. Petra may record that a reproduction was valid yet incomparable for a particular Claim. `FAILS_TO_REPLICATE` requires a valid attempt and an explicit target and comparability rationale; a crashed job cannot produce that relation.

## Progressive ML experimentation

ML work may advance through registered stage gates such as:

1. smoke and integrity checks;
2. baseline parity;
3. feasibility;
4. stability across permitted variation;
5. matched-resource comparison;
6. ablations and negative controls;
7. robustness or distribution-shift evaluation;
8. reproduction;
9. artifact promotion;
10. eligibility for a scoped scientific Claim.

Projects and SemanticProfiles may add or omit stages. Each gate declares required artifacts, DecisionCriteria, validity checks, and consequences.

Passing a gate qualifies a code, dataset, model, environment, or analysis artifact for a named downstream use. It does not establish that a Hypothesis is true. Scientific interpretation still requires Results, Analysis, scope, alternatives, and review.

## Agent behavior and approvals

Petra may automate bounded diagnostics, smoke tests, low-cost exploratory Runs, and repeated plan cells under an active ReviewPolicy and CapabilityGrant. The interface exposes the active ProtocolVersion, ExecutionPlan, capability envelope, expected cost and duration, sandbox state, outputs, and stop control.

Preview or explicit approval is required when policy does not already authorize:

- a new or materially changed ProtocolVersion;
- a dependency, code, data, model, or environment change;
- network or secret access;
- a broader filesystem or data scope;
- material spend or duration;
- a consequential confirmatory, benchmark, or reproduction Run;
- an Assertion interpreting experimental evidence.

The agent cannot broaden its capability because a diagnostic suggests doing so. A recommended repair or follow-up becomes a SuggestedAction or proposed ChangeSet.

## Options considered

### One mutable experiment object

Rejected because scientific design, exact execution, observations, and interpretation have different revision and authority requirements.

### Publication-grade requirements for every Run

Rejected because it would make exploratory science slow and encourage researchers to work outside Petra. Progressive profiles preserve provenance while increasing obligations with intended use.

### Local containers only

Rejected as the hosted security boundary. Local OCI remains useful for trusted development and offline work but does not establish public multi-user isolation.

### Managed provider embedded in the domain model

Rejected because provider lifecycle, pricing, states, and capabilities will change. Petra records provider provenance while keeping scientific semantics portable.

### Immediate multi-provider implementation

Rejected because unused adapters would add maintenance without testing portability. One local backend, one managed conformance target, and a provider-neutral contract are sufficient now.

### Root-cause analysis as scientific causal inference

Rejected because operational diagnosis cannot establish a scientific mechanism. Petra links them where relevant but preserves their separate evidence and review burdens.

## Consequences

### Benefits

- Exploratory work stays inexpensive while confirmatory use earns stronger obligations.
- Scientific amendments cannot hide inside operational retries.
- Results, analyses, criteria, decisions, and interpretations remain independently inspectable.
- Failed infrastructure cannot count as negative evidence.
- Generated code has no direct path to authoritative graph mutation.
- The same domain contract supports local work and later hosted isolation.
- Root-cause investigations improve diagnosis without rationalizing valid results away.
- ML stage gates can promote artifacts without becoming hypothesis-confidence scores.

### Costs and risks

- Two locks and several result layers add schema and UX complexity.
- Exact replay may remain impossible when external providers hide revisions or dependencies disappear.
- Managed execution adds cost, data-governance review, and provider dependence.
- Daytona's required network and VM capabilities may depend on service tier or change before testing.
- Excessive protocol fields or gates could make Petra bureaucratic.
- Automated diagnostics could encourage post-hoc fishing if they are not visibly separated from prespecified analysis.

Petra mitigates these risks with progressive profiles, explicit unknowns, content-addressed artifacts, provider adapters, immutable history, visible criterion timing, and pilot-driven requirements.

## Validation

D011 is satisfied when Petra can:

1. create an Experiment with an exploratory ProtocolVersion and a separate ExecutionPlan;
2. prevent a scientific Run against an unlocked ProtocolVersion or unauthorized ExecutionPlan;
3. create a new plan without changing protocol meaning and retain comparability provenance;
4. create a new ProtocolVersion for a changed scientific design without rewriting earlier Runs;
5. execute one plan cell through `LocalOciBackend` with read-only inputs and a validated output manifest;
6. record a failed execution without producing a Result or changing Hypothesis warrant;
7. record a valid Result that does not meet a criterion without calling the Run an execution failure;
8. record an Analysis over named Results without mutating them;
9. preserve criterion timing, raw values, uncertainty, distance, and sensitivity;
10. prevent a CriterionEvaluation from directly creating a support or contradiction Assertion;
11. distinguish engineering smoke-test success from scientific evidence;
12. retry a plan cell as a new Run without duplicating committed output;
13. record replay, repeat, direct reproduction, and conceptual replication with comparability and independence dimensions;
14. prevent a crashed or invalid attempt from producing `FAILS_TO_REPLICATE`;
15. diagnose an execution incident through versioned candidates, tests, findings, correction, and verification;
16. preserve a valid surprising Result while investigating possible anomalies;
17. enforce separate automation policy and execution capability;
18. rebuild the experiment ledger from events and pinned artifacts;
19. pass the deferred managed-backend conformance suite before hosted untrusted execution;
20. replace the managed backend without changing scientific object schemas.

## Deferred decisions

D011 does not choose:

- universal publication, confirmation, reproduction, or benchmark thresholds;
- a complete registry of ProtocolProfiles, DecisionCriteria, failure causes, or ML stage gates;
- a guarantee of bit-identical replay;
- Daytona before its conformance test passes;
- a second managed provider integration;
- a dedicated large-scale training backend;
- retention periods for public or shared experiment artifacts;
- wholesale project publication, public graph visibility, and redaction rules, which remain deferred under D012.

The first experiment slice should use one exploratory ProtocolVersion, one ExecutionPlan, a few cheap Runs, one Analysis, and at most a few DecisionCriteria. Root-cause investigation should be exercised on a deliberately induced operational failure.

## Revisit triggers

Reconsider D011 if:

- researchers cannot distinguish protocol amendments from execution-plan changes;
- progressive profiles discourage exploratory work or fail to protect confirmatory claims;
- environment capture is insufficient to explain material replay differences;
- a provider cannot enforce Petra's network, secret, resource, or isolation contract;
- managed execution cost or latency prevents interactive use;
- the same workload routinely requires both interactive sandboxes and a separate batch or training backend;
- RootCauseInvestigations systematically misclassify valid surprising Results as defects;
- domain-specific experiments cannot express their validity or reproduction requirements through profiles.

Any revision must preserve immutable scientific meaning, exact execution provenance, provider neutrality, control-plane authority, failure-versus-evidence separation, and reviewed scientific interpretation.

## Next work

[D012](D012-scoped-research-artifacts-and-external-adapters.md) defines bounded research-artifact composition and preserves API and MCP as adapters over Petra's application layer. Petra now proceeds to the M1 evidence-spine vertical slice.
