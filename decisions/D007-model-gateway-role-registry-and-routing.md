# D007: Policy-first model gateway with role-specific certification

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Model and provider identity, bounded scientific roles, role certification, deterministic routing, egress, budgets, retries, fallbacks, call provenance, and Petra-language integration
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D004](D004-docling-ingestion-and-claim-extraction.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md)

## Decision

Petra will route model work through one TypeScript-owned `ModelGateway`. The gateway selects a deployment for a bounded role only after data policy, capability, role certification, budget, and runtime constraints have established eligibility.

The initial routing principle is:

> Filter by permission and role qualification first; choose among the remaining deployments by measured task performance, expected validated cost, and latency.

Petra will not use a universal ranking of models, route by vendor reputation, or ask several models to vote by default. A model can serve several roles only when it qualifies separately for each one. Role, deployment, provider, and scientific authority remain distinct.

The first evidence-spine implementation supports four scientific model roles:

1. **Extractor:** emits atomic source-grounded proposals in D004's schema.
2. **Claim critic:** checks entailment, scope, attribution, modality, negation, numerical preservation, and extraction defects without rewriting or approving the proposal.
3. **Synthesist:** constructs evidence-bounded explanations from a typed `ContextPacket`.
4. **Conversational research assistant:** mediates review, explains graph state, proposes typed actions, and follows D006's language contract.

Embedding and reranking deployments also use the gateway, but they are model tasks rather than scientific personas. Navigator, relation analyst, experimentalist, builder, and code-auditor roles are added only when their workflows and evaluations exist.

The first router will be deterministic and inspectable. Exact provider and model assignments belong in versioned registry configuration and evaluation manifests, not in this decision document.

### Initial mixed-provider implementation constraint

The first non-fixture portfolio must exercise both model plurality and provider independence. It will contain at least two remote OpenAI deployments and at least one locally executed open-weight deployment. All candidates enter through the same role, policy, validation, provenance, and authority contracts even when their provider adapters use different wire protocols.

For the M1.5 extractor slice, every candidate runs the same versioned certification cases under comparable prompt, schema, context, and budget conditions. M1.5 closes only after at least one OpenAI deployment and one local deployment earn active extractor certifications and produce valid quarantine proposals through the recorded gateway route. A candidate that fails remains registered with its observed result but cannot be activated for that role.

The initial remote evaluation candidates are GPT-5.6 Luna and GPT-5.6 Terra. The local benchmark began with `gpt-oss-20b`, then added Qwen2.5 and Qwen3.5 after observed role-certification failures. These are test targets rather than permanent role assignments. GPT-5.6 Sol remains a possible later escalation candidate. The local development runtime is also test-before-lock: it must expose a bounded loopback adapter and cannot become part of the scientific contract.

The local route is first-class. It supports E0 processing, offline continuity, provider-outage continuity, private-corpus work, reproducible comparison, and future controlled fine-tuning. Agreement between local and remote models is recorded as model comparison, never presented as independent scientific corroboration.

## Context

Petra needs different model capabilities for extraction, criticism, synthesis, conversation, retrieval, vision, and later code and experiment work. Those tasks have different evidence requirements, privacy constraints, latency tolerances, failure modes, and cost profiles.

Treating one provider as Petra's intelligence layer would couple scientific behavior, language, data handling, and reproducibility to a changing external service. Treating all models as interchangeable would hide meaningful differences among roles. Calling several models for every task would increase cost and correlated output without establishing scientific independence.

D001 already makes egress and capability policy authoritative. D006 makes Petra's language independent of a provider. D007 connects these decisions to executable model selection.

## Registry objects

### Provider

`Provider` describes the destination and contractual boundary through which a deployment is reached. It records:

- provider and endpoint identity;
- local or remote execution;
- supported authentication and network destinations;
- declared retention, logging, and training behavior when known;
- data classes and egress levels the adapter can accept;
- region or deployment boundary where relevant;
- pricing and rate-limit observation source;
- capability grant requirements;
- availability, retry, and error behavior;
- date and provenance of the latest policy verification.

Unknown provider behavior remains unknown. Petra does not infer a safe retention or training policy from brand, model family, or an earlier provider configuration.

### ModelDeployment

`ModelDeployment` identifies one callable local or remote model configuration. It records:

- provider and provider model identifier;
- exact revision when exposed, otherwise the observed alias and its reproducibility limitation;
- modality and task types;
- context and output limits;
- structured-output, tool-use, streaming, batching, and seed support;
- tokenizer or usage-accounting behavior when known;
- local hardware and runtime requirements where applicable;
- endpoint-specific parameters and policy restrictions;
- lifecycle and health state.

Provider aliases that may change are not treated as pinned revisions. Petra retains the original output artifact and labels replayability as `exact`, `best_effort`, or `unavailable` according to what the provider exposes.

### RoleProfile

`RoleProfile` defines one bounded scientific job. It contains:

- role identifier and purpose;
- allowed input and output schemas;
- required provenance and evidence context;
- permitted tools and proposal types;
- scientific and operational failure conditions;
- required validators;
- evaluation suite;
- escalation and human-review boundary;
- applicable Petra language behavior.

A role is a contract, not an anthropomorphic identity or permission grant.

### RoleCertification

`RoleCertification` records that one deployment met a configured evaluation floor for one role under stated conditions. It contains:

- deployment, role, domain, language, modality, and document class;
- evaluation-suite and dataset-snapshot versions;
- prompt, schema, tool, retrieval, and validator versions;
- metric vector and observed error profile;
- cost, latency, retry, and repair results;
- certification scope, decision, time, and expiry or invalidation conditions.

Certification means eligible for routing within its scope. It does not assert that future outputs are correct.

### RoutingPolicy

`RoutingPolicy` maps a bounded task and impact class to eligible certifications and a deterministic selection order. It records:

- project, workflow, role, task, domain, and data scope;
- required modality, context, tools, and output contract;
- minimum certification and validator conditions;
- permitted providers, deployments, and egress levels;
- maximum cost, time, attempts, and output size;
- selection objective and tie-break order;
- fallback and escalation chain;
- policy revision, approval, start, expiry, and pause state.

A routing policy selects among capabilities already permitted by D001 and the capability model. It cannot create a grant, raise an egress level, change a ReviewPolicy, or approve its own output.

## Initial roles

### Extractor

The extractor receives one admissible parse selection, bounded structural context, a proposal schema, and explicit allowed proposal types. It can create only quarantine proposals.

Its certification emphasizes:

- exact SourceSpan grounding;
- proposition atomicity;
- attribution, negation, and modality;
- preservation of numbers, units, comparators, and named objects;
- scope fidelity;
- schema validity and refusal on insufficient evidence.

### Claim critic

The critic receives the proposal, source context, and validation purpose. It emits a separate criticism record. It cannot silently repair, promote, or reject the proposal.

Its certification emphasizes defect recall, false alarms, false reassurance, scope analysis, and error correlation with candidate extractors.

The gateway supports using a different model family for extraction and criticism and prefers it when the evaluation requires independent error coverage. A single deployment may perform both roles in the minimum offline profile, but Petra labels the criticism `non_independent` and does not present agreement as corroboration.

### Synthesist

The synthesist receives only a versioned, bounded `ContextPacket`. It emits typed scientific statements with Claim, Assertion, SourceSpan, and uncertainty references.

Its certification emphasizes assertion coverage, citation entailment, scope preservation, contrary-evidence inclusion, unsupported-assertion rate, and faithful distinction among source report, graph inference, and recommendation.

### Conversational research assistant

The conversational role plans and renders assistant turns, explains review and graph state, resolves user intent to typed command proposals, and obeys D006.

Its certification emphasizes epistemic speech acts, hypothesis-reference grammar, action fidelity, ambiguity handling, response relevance, appropriate depth, and preservation of scientific force. It receives no authority from fluency or persona consistency.

## Deterministic routing

The initial gateway uses this order:

1. Resolve the logical task, role, domain, modality, impact class, and output schema.
2. Build the data-egress decision and remove prohibited destinations.
3. Remove deployments that lack the required context, modality, tools, or structured output.
4. Remove deployments without an active RoleCertification for the task scope.
5. Apply hard cost, time, attempt, rate, and availability limits.
6. Select the eligible deployment with the lowest expected validated cost under the policy's quality floor and tie-breaks.
7. Record the eligible set, exclusions, selected route, and reason.

Expected validated cost includes retries, schema repair, validation failure, and escalation observed in evaluation. Advertised token price alone does not determine the cheapest route.

Routine, difficult, adversarial, and high-impact requests use separate policy branches. High impact may require a stronger deployment or a separately certified critic, but model agreement never replaces source evidence, an experiment, or human review.

Petra does not use a model-based meta-router initially. A learned or model-based router requires its own evaluation, reproducible decision record, and measured advantage over deterministic policies.

## Data-egress manifest

Every logical model request receives a machine-readable outbound-context manifest before routing. It records:

- referenced artifacts, SourceSpans, graph objects, and namespaces;
- visibility, rights, and data classes;
- project and object egress ceilings;
- exact selected fields or a policy-generated inspectable summary;
- redactions;
- provider, purpose, capability grant, and duration;
- estimated cost and retention decision.

The gateway routes according to D001:

- `E0` permits local deployments only;
- `E1` permits approved metadata and queries;
- `E2` permits selected inspectable context;
- `E3` permits broader project context only under a project-specific grant.

The gateway applies least context. Permission to send a project does not require sending the whole project. A fallback cannot raise the egress level, change the rights decision, or add a namespace.

If the destination's data behavior is unknown or the artifact policy does not permit remote processing, remote deployments are ineligible. Repeated E2 or E3 calls may operate under an approved scoped policy; each request still records the actual outbound manifest.

## ModelRequest and ModelCall

`ModelRequest` is one logical need for model work. `ModelCall` is one physical invocation against a deployment.

```text
ModelRequest
   ├── policy and routing decision
   ├── ModelCall attempt 1
   ├── optional repair, retry, or fallback call
   └── validated result or explicit terminal failure
```

The request records:

- project, workflow, role, objective, and impact class;
- input artifact and ContextPacket references;
- prompt-stack, schema, tool, policy, and budget revisions;
- outbound-context manifest;
- eligible deployments, exclusions, route, and fallback chain;
- final result, validation, and terminal state.

Each call records:

- request and attempt identifiers;
- provider, endpoint, observed deployment identity, and replayability;
- exact input, prompt, context, parameter, tool, and schema artifacts or protected references;
- start, queue, first-token, completion, and validation timing when observable;
- usage and cost details exposed by the provider or local runtime;
- output, refusal, error, tool trace, and validator results;
- provider request identifier where available;
- causal relationship to a retry, repair, fallback, or escalation.

Petra stores no secret, credential, or unnecessary hidden model reasoning in these records. It retains explicit outputs and rationales required for scientific and operational inspection.

## Retry, repair, fallback, and disagreement

Transient transport failures may retry the same deployment within the request's attempt and cost limits. A schema repair, resampling attempt, or deployment change is a new ModelCall.

The gateway follows these rules:

- no retry changes scientific state before validation;
- no fallback expands data egress or tool permission;
- no deployment is used unless it is certified for the role;
- no successful-looking sample erases earlier failed attempts;
- no repeated sampling converts scientific-validation failure into evidence;
- no disagreement is resolved by unweighted majority vote;
- no budget or availability failure silently lowers the quality floor.

When outputs disagree, Petra preserves the disagreement and routes according to its type: targeted source inspection, a separately certified critic, a stronger eligible deployment, a narrower question, or researcher review.

If every eligible route fails, the request ends visibly as `blocked_policy`, `budget_exhausted`, `provider_unavailable`, `validation_failed`, or another typed terminal state. Local work remains available.

## Budgets and caching

Budgets may apply per call, request, run, project, period, provider, or workflow. They cover monetary cost, input and output tokens, time, attempts, tool calls, and local compute where measurable.

The scheduler may reserve part of a request or project budget for validation and escalation so routine calls cannot consume every available resource before a necessary critic or repair.

A cached model artifact may satisfy a request only when its deployment identity, role, prompt, schema, input, ContextPacket, tools, parameters, and applicable policy-sensitive namespace match the cache key. Cache reuse remains a recorded routing result. Cached private artifacts cannot cross workspace or visibility boundaries.

D008 defines graph-derived caching, dependency invalidation, scheduling, and end-to-end cost accounting beyond the individual model request.

## Role-specific evaluation

Petra maintains no global model score. Each role evaluation reports a metric vector and error distribution under fixed inputs and budgets.

Initial suites measure:

- **Extractor:** span entailment, atomicity, attribution, negation, modality, scope, numbers, units, and schema validity.
- **Critic:** defect recall, false alarms, false reassurance, error correlation, and escalation value.
- **Synthesist:** evidence coverage, citation entailment, scope preservation, contrary-evidence inclusion, and unsupported assertions.
- **Conversational assistant:** D006 speech acts, hypothesis references, action fidelity, ambiguity repair, relevance, and explanation depth.
- **Embedding and reranking:** relevant and disconfirming SourceSpan recall, ranking quality, latency, memory, and incremental-update cost.

Later roles add role-specific suites before receiving certification. Builder certification, for example, cannot be inferred from conversational or extraction performance.

Evaluation data, prompt stacks, model outputs, validators, costs, and decisions are versioned. Certification is invalidated or narrowed when a material model, endpoint, prompt, schema, tool, domain, or policy change crosses its recorded conditions.

Targets are established after a representative baseline and error distribution exist. The router does not optimize a single score that hides scientific errors behind cost or style gains.

## Petra language boundary

Specialist models return typed artifacts. Raw extractor or critic prose may remain inspectable, but it does not automatically become Petra's user-facing voice.

The conversational role composes user-visible language from typed results and graph state under D006. Petra will not routinely add a separate unconstrained “rewrite in Petra's voice” call because that creates another opportunity to change scientific meaning. Any separate realization model must preserve references and speech acts and pass semantic validation.

A future fine-tuned Petra model may hold conversational or triage certifications. The language contract, evidence graph, policy engine, and authority remain outside its weights.

## Consequences

### Benefits

- Models and providers can change without changing scientific objects, policy, or Petra's voice.
- Local and remote deployments enter the same eligibility and provenance path.
- Routine work can use the least costly qualified deployment.
- Role-specific evaluation exposes where a model is useful and where it fails.
- Retries, fallbacks, disagreements, and non-independent criticism remain visible.
- Data egress is decided before model selection.

### Costs and risks

- Registry, certification, routing, and call records add schemas and operational work.
- Evaluation suites require labeled scientific examples and maintenance.
- Provider aliases may prevent exact replay.
- Deterministic policies may initially miss opportunities a well-evaluated adaptive router could find.
- A large eligible-model set can create configuration and benchmark burden.
- Cost estimates can be wrong when provider behavior or validation failure rates change.

Petra mitigates these risks through a small initial role set, explicit replayability, versioned manifests, bounded provider adapters, measured validated cost, and revisit triggers.

## Validation

D007 is satisfied when Petra can:

1. register local and remote providers without changing the role contract;
2. certify one deployment separately for two roles and reject an uncertified role assignment;
3. block a scientifically capable remote deployment because the outbound context is `E0`;
4. show the eligible set, exclusions, selected route, and selection reason;
5. choose the lowest expected validated-cost deployment above the configured quality floor;
6. create one ModelRequest with separately recorded retry, repair, and fallback ModelCalls;
7. prevent a fallback from expanding egress, tools, cost, or role scope;
8. retain a provider alias's replayability limitation and original output artifact;
9. label same-deployment extractor and critic use as non-independent;
10. preserve model disagreement rather than majority-voting it into an Assertion;
11. stop visibly when policy, budget, availability, or validation leaves no eligible route;
12. reuse an exact cached call without crossing visibility or project boundaries;
13. replace the conversational deployment while preserving D006 speech acts and references;
14. invalidate or narrow certification after a material model, prompt, schema, tool, or domain change;
15. reproduce a routing decision from its registry, policy, evaluation, and request records.

## Deferred decisions

D007 does not choose:

- permanent model or provider assignments;
- numerical certification thresholds before baseline evaluation;
- a learned or LLM-based meta-router;
- builder, vision, experimentalist, or other later role implementations;
- a permanent local runtime or model family after the initial mixed-provider proof;
- provider-specific prompt-caching or batch features as architectural dependencies;
- end-to-end context compilation, graph fast paths, or job scheduling, which belong to D008.

## Revisit triggers

Reconsider D007 if:

- deterministic routing underperforms a reproducible adaptive router enough to justify its complexity;
- validated cost estimates routinely select slower or more expensive routes;
- role certification fails to predict pilot performance;
- one deployment's role performance transfers reliably enough to simplify certification without hiding errors;
- provider revision opacity makes replayability labels insufficient;
- model-request records create unacceptable privacy or storage burden;
- local hardware cannot support the required E0 role path.

Any revision must preserve policy-first eligibility, role-specific evidence, explicit routing provenance, bounded attempts, data-egress enforcement, and model-independent scientific authority.

## Next decision

D008 defines graph-guided execution, context compilation, caching, scheduling, cost, and latency. It decides whether a model is needed and what bounded graph-derived state it receives; D007 decides which eligible model performs that remaining work.
