# Petra

> Where hypotheses earn their edges.

Implementation companion: [Minimum Viable Graph and Event Model](PETRA_GRAPH_MODEL.md)

Development sequence: [Petra Roadmap](ROADMAP.md)

Interaction and runtime contracts: [Trusted-graph review](decisions/D005-trusted-graph-review-and-direct-editing.md), [Petra language and reference](decisions/D006-petra-language-and-reference-contract.md), [model gateway and routing](decisions/D007-model-gateway-role-registry-and-routing.md), [graph-guided execution](decisions/D008-graph-guided-execution-context-and-cost.md), [object-centered research workspace](decisions/D009-object-centered-research-workspace.md), [Hypothesis assessment and posture](decisions/D010-hypothesis-assessment-posture-and-obligations.md), the [AG-UI SDK interaction boundary](decisions/D013-ag-ui-sdk-interaction-boundary.md), the [Hono-first React/Vite workbench shell](decisions/D014-hono-react-vite-workbench-shell.md), and the [language-neutral runtime contract](decisions/D015-language-neutral-runtime-contracts.md)

## Product brief and founding design

Petra is a graph-native scientific research workbench powered by multiple language models. It helps an individual researcher move from a rough question to a traceable body of literature, explicit hypotheses, reproducible experiments, and defensible conclusions.

The graph is not a visualization added after the work is done. It is the work's shared state. Papers, source passages, claims, disagreements, hypotheses, decisions, code, experiments, results, and model actions all become typed, inspectable objects. The interface lets the researcher see why Petra is making a suggestion, which evidence it depends on, what would change if that evidence changed, and what the system is permitted to do next.

Petra begins as a private research workbench. Its immediate outward products are scoped research artifacts—prose, provenance explanations, citations, bibliographies, methods, code, and experimental records—and controlled integration with researchers' existing tools. Public or collaborative graph sharing remains possible, but Petra will not design a wholesale project-publication workflow without a demonstrated use case.

The initial users are researchers working in computational linguistics, psychology, machine learning, agentic systems, and AI evaluation. The underlying evidence model must remain sufficiently general for other scientific fields.

---

## The problem

Scientific work is poorly represented by a chat transcript or a folder of PDFs. A literature review is not a list of documents, and an experiment is not merely the code that ran. Research depends on relationships:

- a claim is made in a particular passage of a particular version of a paper;
- another result supports, contradicts, narrows, or fails to reproduce it;
- a hypothesis depends on assumptions and prior findings;
- an experimental protocol tests only part of that hypothesis;
- a failed run may invalidate an implementation without bearing on the scientific claim;
- a conclusion may be reasonable within one population, task, model family, or measurement regime and unwarranted outside it.

Conventional retrieval-augmented generation usually retrieves chunks that resemble a query and places them in a model's context. This can improve factuality, but it does not by itself represent the structure of scientific justification. It can also hide crucial distinctions: citation versus agreement, document relevance versus evidential support, an author's report versus Petra's inference, and absence of evidence versus evidence of absence.

Petra treats those distinctions as product requirements.

---

## Product thesis

Scientific AI becomes more useful when the system is built around explicit research objects and constrained transitions between them.

Petra therefore combines three graphs:

1. **The knowledge graph** represents literature, claims, concepts, evidence, disagreements, and scope.
2. **The workflow graph** represents questions, hypotheses, tasks, decisions, approvals, model calls, and graph changes.
3. **The experiment graph** represents protocols, code, environments, runs, datasets, metrics, results, and attempts at reproduction.

These graphs share provenance and identity. A result can be traced through the run that produced it, the protocol and code used, the hypothesis it tested, the claims that motivated it, and the source passages behind those claims.

These three research graphs occupy Petra's scientific-authority namespace. Rebuildable retrieval structures and executable control policy remain separate logical namespaces so a semantic neighbor cannot masquerade as evidence and retrieved text cannot become an instruction.

The graph controls the harness in two senses. It supplies the context on which models act, and its typed state determines which actions are valid. A hypothesis cannot silently become a finding. A search result cannot silently become trusted evidence. A generated interpretation cannot silently become a source claim.

---

## Scientific contract

Petra cannot honestly guarantee that a probabilistic model will never produce a false statement. “Hallucination-free” must therefore be an operational contract, not a marketing absolute:

> Petra must not present a scientific assertion as established fact unless the assertion has a visible path to admissible evidence. Anything without that path must be typed and displayed as a question, hypothesis, inference, speculation, personal observation, or unsupported proposal.

This contract implies several rules.

### Claims are smaller than documents

A paper is a source, not a unit of truth. Petra extracts bounded claims and connects each one to the exact source span from which it was derived. Page, section, table, figure, and paragraph coordinates should be retained whenever the source permits it.

### Sources remain immutable

Petra never rewrites an original paper, dataset card, or source-native record. Corrections and interpretations are stored as versioned overlays. The researcher can revise an extracted claim without destroying the model's original proposal or the source passage.

### Provenance is transitive

Every generated statement, graph mutation, experiment, and conclusion records its inputs, actor, model and version, timestamp, configuration, and relevant approvals. A citation is not sufficient if Petra cannot show which claim it supports and which passage was inspected.

### Contradiction is first-class

The graph preserves disagreement rather than prematurely resolving it. `SUPPORTS`, `CONTRADICTS`, `QUALIFIES`, `REPLICATES`, `FAILS_TO_REPLICATE`, and `MENTIONS` are different relations. Citation links alone never imply scientific support.

### Scope travels with the claim

Population, language, task, dataset, model family, treatment, measurement, time period, and other boundary conditions belong to the claim. Retrieval and synthesis must not detach a result from the conditions under which it was observed.

### Uncertainty stays structured

Petra should avoid a single decorative “confidence score.” It should expose the reasons for uncertainty: source status, study design, sample size, measurement validity, replication status, conflicting results, extraction uncertainty, and distance from primary evidence. Formal probabilities can be used when a project has a defensible statistical model, but they should not be invented by a language model.

### Epistemic promotion is explicit

Search results begin as candidates. Extracted claims begin as proposals. Hypotheses do not become findings because an agent wrote persuasive prose. Important state changes require a recorded rule, adequate evidence, and—where configured—human approval.

---

## What counts as evidence

Petra maintains distinct evidence namespaces rather than flattening every useful source into the same pool.

### Scholarly evidence

The primary scientific corpus contains legitimate scholarly works, including peer-reviewed literature and clearly identified preprints. Each work should preserve version, publication status, venue, identifiers, dates, retraction or correction status, and links to accessible artifacts.

Preprints are admissible but visibly marked. Their claims should not be presented as peer-reviewed, and a later published version should be linked rather than treated as an unrelated paper.

### Operational evidence

Official documentation, standards, dataset cards, model cards, and code repositories can establish how an artifact is intended to work or how an experiment was implemented. They do not directly establish a scientific claim unless the claim is appropriate to that source type.

For example, a model card may support “the released checkpoint was trained on dataset X.” It does not by itself support “the model architecture improves reasoning.”

### Personal evidence

Private notes, pilot observations, unpublished data, and researcher judgments are first-class objects in a separate `PersonalEvidence` namespace. They may motivate a hypothesis or guide a decision, but Petra must not launder them into public or scholarly evidence.

### Discovery metadata

Search snippets, citation counts, recommender scores, and bibliographic metadata are useful for discovery and prioritization. They are not evidence for a paper's scientific claims.

---

## Canonical graph model

The first schema should be deliberately small, typed, and extensible.

| Layer | Core nodes | Purpose |
| --- | --- | --- |
| Scholarly | `Work`, `WorkVersion`, `SourceArtifact`, `SourceSpan`, `Author`, `Venue` | Preserve source identity, versions, location, and provenance |
| Scientific | `ResearchQuestion`, `Concept`, `Claim`, `EvidenceRelation`, `Hypothesis`, `Assumption`, `Limitation` | Represent what is being asked, asserted, disputed, and bounded |
| Operational | `Dataset`, `Model`, `Method`, `Instrument`, `Metric`, `CodeArtifact`, `Environment` | Connect scientific ideas to implementable objects |
| Experimental | `Experiment`, `ProtocolVersion`, `ExecutionPlan`, `Run`, `Result`, `Analysis`, `DecisionCriterion`, `CriterionEvaluation`, `OperationalDecision`, `ReproductionAttempt`, `RootCauseInvestigation` | Separate scientific design, exact execution, observation, evaluation, interpretation, reproduction, and failure diagnosis |
| Composition | `EvidencePacket`, `CompositionRequest`, `CompositionPlan`, `DraftArtifact`, `ProvenanceMap`, `CitationBundle`, `OutputProfile`, `RenderedArtifact` | Produce useful research writing and files without disconnecting them from evidence or origin |
| Workflow | `Task`, `Decision`, `Approval`, `AgentRun`, `ModelRequest`, `ModelCall`, `ConversationState`, `PetraInteractionRun`, `InteractionFeatureManifest`, `ContextPacket`, `WorkUnit`, `CostRecord`, `ReviewBatch`, `ChangeSet` | Make agency, interaction replay, review, routing, active work, cost, and graph mutations inspectable without treating protocol state as authority |
| Control | `CapabilityGrant`, `ReviewPolicy`, `Provider`, `ModelDeployment`, `RoleProfile`, `RoleCertification`, `RoutingPolicy`, `ContextRecipe` | Keep executable authority, model eligibility, and context compilation explicit and source-independent |
| Personal | `Note`, `Observation`, `Judgment` | Preserve private reasoning without confusing it with published evidence |

Important relations include:

- `VERSION_OF`, `CITES`, `AUTHORED_BY`, and `LOCATED_IN`
- `ASSERTS`, `SUPPORTED_BY`, `CONTRADICTED_BY`, and `QUALIFIED_BY`
- `HAS_SCOPE`, `DEPENDS_ON`, `ASSUMES`, and `OPERATIONALIZES`
- `MOTIVATES`, `TESTS`, `USES`, `PRODUCED`, and `MEASURED_BY`
- `REPLICATES`, `FAILS_TO_REPLICATE`, and `SUPERSEDES`
- `PROPOSED_BY`, `APPROVED_BY`, `REJECTED_BY`, and `CHANGED_BY`

Relations that carry scientific meaning should be assertion objects or otherwise support edge-level metadata. At minimum, each relation needs provenance, creator, creation method, timestamp, source span where applicable, extraction status, and review status.

The graph should distinguish identity from interpretation. One canonical `Work` may have multiple versions and artifacts. Projects reuse those canonical records while maintaining their own questions, hypotheses, judgments, experiments, and private overlays.

---

## Research lifecycle

Petra supports a continuous but inspectable research process.

### 1. Frame the rough question

The researcher begins in ordinary language. Petra collaborates to identify ambiguous terms, plausible interpretations, populations, outcomes, relevant disciplines, and the decisions the research is meant to inform. It records the original question rather than replacing it with a polished version.

### 2. Map the question

Petra decomposes the question into concepts, subquestions, candidate mechanisms, competing explanations, and search strategies. This becomes a provisional graph that the researcher can edit directly.

### 3. Discover literature

Search combines bibliographic APIs, lexical and semantic retrieval, citation traversal, author and venue expansion, and graph-guided queries. Search results enter a quarantine queue with source and licensing metadata.

The discovery agent should seek disconfirming and adjacent literature, not merely papers similar to those already selected.

### 4. Ingest and inspect

Petra resolves work identity and versions, parses available artifacts, identifies structural spans, and proposes claims, methods, datasets, results, limitations, and evidence relations. Deduplication and extraction occur in quarantine. Promotion into the trusted graph follows explicit review rules.

### 5. Synthesize the field

The system builds a claim-centered map: established areas, live disagreements, scope boundaries, missing evidence, methodological clusters, and potential publication bias. A synthesis must show its evidence coverage and preserve contrary findings.

### 6. Form hypotheses

Petra helps turn an intuition into explicit, falsifiable alternatives with assumptions, predicted observations, plausible confounds, and discriminating tests. It should prefer hypotheses that can fail informatively over vague claims that can absorb any outcome.

### 7. Design experiments

The experimentalist role proposes ProtocolVersions, baselines, ablations, negative controls, sample or dataset requirements, measures, analysis plans, DecisionCriteria, stopping rules, and reproducibility requirements. Petra identifies which part of which Hypothesis each proposed test can actually address. Exploratory, confirmatory, benchmark, and reproduction profiles increase obligations according to intended use.

### 8. Execute under permission

Approved experiments run from immutable ExecutionPlans in isolated environments. Code, dependencies, configurations, random seeds, datasets, model versions, prompts, outputs, failures, and costs become graph objects. Scientific meaning and exact authorized work are locked separately. A failed execution is not treated as a negative scientific Result.

### 9. Interpret adversarially

Petra compares observations with predictions, checks analysis validity, searches for alternative explanations, and asks what evidence would distinguish them. Models may propose interpretations, but the graph records which parts are results and which are inference.

### 10. Update without erasing history

New evidence may strengthen, narrow, challenge, supersede, or leave a hypothesis unresolved. Petra versions the change and shows its downstream impact. Earlier hypotheses remain available as part of the research history.

### 11. Produce research artifacts

The researcher may ask Petra to draft or revise a passage, outline, table, literature synthesis, method, experiment report, citation set, bibliography, code artifact, or another bounded output. Petra does not require a fixed catalog of deliverables.

Every DraftArtifact pins a graph snapshot and EvidencePacket. Its material prose maps to source-backed Claims, Results, Analyses, explicit Petra inference, or researcher-supplied judgment. CitationBundles resolve through canonical WorkVersions and retain abstract-only and metadata-quality warnings. Renderers may produce Markdown, LaTeX, BibTeX, and later formats without deciding scientific support.

Felicity governs composition and all other user-facing model prose. Petra revalidates scientific force, provenance, and citation scope after a language revision so a clearer sentence cannot silently become a stronger claim. [D012](decisions/D012-scoped-research-artifacts-and-external-adapters.md) defines this composition and adapter boundary.

---

## Hypothesis state, assessment, and scientific posture

Petra should respond differently to a new conjecture and a developed research program. This is a graph and policy problem, not just a prompt problem.

Every hypothesis has an immutable project-scoped ordinal and a concise human-readable descriptor, such as `H12 — Position bias persists under randomized ordering`. In conversation, Petra gives the descriptor on the first reference to that hypothesis in each assistant turn and may use the ordinal alone thereafter. The descriptor aids recognition; the target Claim and scope retain the hypothesis's precise scientific meaning.

Petra keeps four state families separate:

| Family | Question answered |
| --- | --- |
| Development | How completely is the Hypothesis represented as a research object? |
| Activity | What literature, analysis, experiment, review, or reproduction work is active? |
| Evidential warrant | What does the current scoped evidence bear on? |
| Lifecycle | Is the project actively pursuing, pausing, retiring, or superseding it? |

Development progresses from `seed` through `articulated`, `structured`, `test_ready`, and `developed`. Support, challenge, reproduction, active testing, retirement, and supersession do not belong in that ladder. A developed Hypothesis may remain unsupported or strongly challenged; a retired Hypothesis is not thereby disproven.

Petra creates immutable, snapshot-bound HypothesisAssessments from reproducible indicators, evidence-backed Findings, and separate AxisAssessments. In addition to the four state families, an assessment can describe scientific standing, alternative-landscape coverage, project dependence, and research stakes. It always preserves scope, temporal perspective, coverage, origin, conflict, and material unknowns rather than producing a universal confidence or currentness score.

It can then adopt an appropriate stance:

- **Explore:** generate alternatives freely and discard weak early ideas cheaply.
- **Clarify:** operationalize terms, scope, predictions, and failure conditions.
- **Challenge:** retrieve counterevidence and construct plausible rival explanations.
- **Discriminate:** design tests that separate live hypotheses rather than merely producing another positive result.
- **Reproduce:** demand independent repetition when a result has become consequential.
- **Consolidate:** summarize stable findings while retaining their scope and residual uncertainty.

The central asymmetry is intentional. An early hypothesis should be easy to abandon. A hypothesis supporting substantial evidence, code, or downstream decisions should not be dismissed because one agent found a conflicting sentence or one run failed. Petra should ask whether the new evidence tests the same claim, under comparable conditions, with adequate power and a valid implementation.

A versioned PostureDecision selects one primary posture and may create typed Obligations and scientifically specific SuggestedActions. Findings and obligations are extensible through registered domain and project profiles. Unknown scientific considerations may be preserved and discussed, but they cannot control execution until their semantics are registered and validated.

Obligations may be advisory, required for a transition, or required for an action. A valid waiver remains distinct from satisfaction and carries its scope, authority, rationale, consequences, and expiry. Non-waivable provenance, rights, capability, and event-integrity rules remain system invariants rather than ordinary obligations.

Numerical indicators and scoped operational thresholds are legitimate for experiments, validation, certification, budgets, and tolerances. Crossing a threshold may control an operation or transition; it does not by itself make a scientific Claim true or false. [D010](decisions/D010-hypothesis-assessment-posture-and-obligations.md) defines this semantic kernel; [D011](decisions/D011-experiment-sandbox-and-reproducibility.md) applies it to experimental DecisionCriteria, CriterionEvaluations, and OperationalDecisions.

---

## Agentic operation through visible modes and scoped capabilities

Petra should be agentic, but agency must be legible and bounded. Scientific posture determines what behavior is appropriate. Permissions determine what the system may actually do.

Researchers control review through visible governance modes rather than one global autonomy switch:

| Mode | Default behavior |
| --- | --- |
| `inspect` | Explain and propose; require review for every material promotion |
| `guide` | Group proposals, recommend decisions, and route exceptions for review |
| `delegate` | Apply eligible source-local decisions under approved, audited policies |
| `supervise` | Apply broader calibrated policies while escalating consequential changes |

Modes can differ by workflow. A researcher may delegate descriptive claim extraction while inspecting identity merges, scientific relations, hypothesis transitions, experiment execution, and publication. A mode selects policy defaults; it does not create a capability grant.

Capabilities are independently configurable per workspace, project, and run.

| Capability | Recommended default | Control |
| --- | --- | --- |
| Search scholarly services | On | Source allowlist, rate and time limits |
| Ingest into quarantine | On | File, source, and storage limits |
| Extract claims and propose edges | On | Proposals only; retain model provenance |
| Deduplicate and link canonical objects | On with review queue | Show uncertain matches |
| Generate and challenge hypotheses | On | Never promotes a hypothesis to a finding |
| Change the trusted graph | Guided approval | Direct Apply, exact batch approval, or an approved audited policy |
| Design experiments | On | Proposal only until approved |
| Run inexpensive sandboxed analyses | Configurable | Locked ProtocolVersion and ExecutionPlan, resource and time budget |
| Install dependencies or use networked code | Approval | Environment diff and destination visibility |
| Use paid remote models | Budgeted | Per-run and per-project caps |
| Run costly or consequential experiments | Approval | Cost, duration, protocol, and expected outputs |
| Publish, share, message, or act externally | Off until approval | Exact artifact and destination preview |

The interface must show the agent's current objective, posture, active capability, evidence path, queued changes, expected time and cost, and stop control. The researcher can pause a run, revoke a capability, approve individual or batched changes, inspect a diff, reject a proposal with a reason, and roll back or branch prior graph state.

No model receives ambient authority merely because it is called an “agent.”

---

## Multiple models as a governed research team

Petra is a harness, not a wrapper around one preferred model. It assigns scientific roles to evaluated capabilities and can change model providers without changing the research objects or workflow.

The first executable slice has four bounded roles:

- **Extractor:** proposes atomic, source-grounded claims and structured scope.
- **Claim critic:** checks extraction fidelity and defects without approving or silently repairing the proposal.
- **Synthesist:** builds evidence-bounded explanations from typed context packets.
- **Conversational research assistant:** mediates review, explains graph state, and proposes typed actions in Petra's voice.

Later workflows may add roles such as:

- **Navigator:** decomposes questions and plans graph traversal.
- **Retriever:** constructs and expands searches.
- **Skeptic:** seeks counterevidence, hidden assumptions, and alternative explanations.
- **Experimentalist:** designs discriminating tests and reproducibility checks.
- **Builder:** writes and repairs code under an approved protocol.
- **Auditor:** checks citations, evidence coverage, graph consistency, leakage, and unsupported promotion.

Roles are not permanently assigned to vendors. `Provider`, `ModelDeployment`, `RoleProfile`, and `RoleCertification` records separate the destination, callable model, job contract, and measured qualification. A deterministic `RoutingPolicy` first filters by data policy, capability, certification, budget, and runtime requirements, then chooses among eligible deployments by measured role performance, expected validated cost, and latency. Exact model assignments live in versioned configuration and evaluation manifests.

One logical `ModelRequest` may produce several physical `ModelCall` records for an attempt, retry, repair, or fallback. Each call records its inputs, bounded context, output, configuration, route, timing, cost, validation, and resulting proposals. A fallback cannot expand data egress, tools, role scope, or budget. Private or unpublished material must only be sent to deployments allowed by the project's data policy.

High-impact work may require a separately certified critic or heterogeneous model family when evaluation shows that it adds independent error coverage. Unweighted model voting is never a substitute for evidence, an experiment, or human judgment. [D007](decisions/D007-model-gateway-role-registry-and-routing.md) defines the gateway and routing contract.

---

## GraphRAG behavior

Petra uses the graph as an execution plan as well as a knowledge structure. Typed local functions answer graph-state, provenance, policy, revision, and cost questions without a generative model when possible. When model work remains necessary, a versioned `ContextRecipe` compiles the smallest adequate `ContextPacket` from a named snapshot. The default conversational path answers from `current_graph`; discovery and deeper analysis are separate, visible actions rather than hidden work inside every turn.

Petra uses retrieval modes appropriate to the research question rather than applying one retrieval recipe everywhere.

- **Local retrieval** follows a specific claim, source, author, method, dataset, or experiment neighborhood.
- **Global retrieval** summarizes themes, communities, disagreements, or methodological patterns across a corpus.
- **Hybrid retrieval** combines lexical, semantic, metadata, and graph signals.
- **Path retrieval** explains how two concepts, claims, or results are connected.
- **Temporal retrieval** respects publication and evidence order and can reconstruct what was knowable at a given time.
- **Adversarial retrieval** explicitly searches for contradiction, non-replication, boundary conditions, and alternative explanations.

Retrieval produces a typed context packet rather than a heap of chunks. A packet includes the question, relevant claims, exact source spans, relationship types, scope, source status, contrary evidence, retrieval method, and omissions caused by limits. Generation should be allowed to use only the packet for literature-grounded assertions.

The authoritative scientific graph remains separate from a rebuildable derived retrieval graph containing embeddings, semantic neighbors, communities, ranking features, or machine-generated retrieval hints. Such hints cannot become scientific relations without Petra's normal assertion and review path. Source content and model output also cannot author runtime policies, recipes, grants, or other control objects.

Retrieval strategies are replaceable. Petra will establish a frozen scientific benchmark once it has a representative corpus and adjudicated queries, then compare lexical, dense, hybrid, typed traversal, graph-propagation, proposition-path, hierarchical, and incremental graph approaches. HippoRAG 2 and other external systems are challengers in that future benchmark, not selected production dependencies. [D008](decisions/D008-graph-guided-execution-context-and-cost.md) defines the execution, context, caching, scheduling, observability, and benchmark contract.

Before an answer is accepted, an auditor should:

1. segment it into checkable assertions;
2. classify each assertion as sourced fact, graph inference, hypothesis, recommendation, or procedural statement;
3. verify that citations entail the sourced claims at the required scope;
4. reject or relabel unsupported scientific assertions;
5. report evidence coverage and unresolved conflict.

---

## User experience

Good scientific behavior depends on good interaction design. If provenance is technically available but difficult to inspect, users will rely on fluent summaries and the safety model will fail in practice.

Petra uses an object-centered workspace rather than a chat-first or graph-first shell. A project opens to a living Research Brief for the active question. It shows the live hypotheses, evidence frontier, central disagreements, scientific standing, alternative landscape, active work, and useful next scientific actions before the researcher opens a conversation.

The main workspace integrates four synchronized functions:

1. **Research map:** stable navigation among questions, hypotheses, evidence inbox, experiments, and outputs.
2. **Main research surface:** Brief, Evidence, focused Graph, Papers, and later Experiments views over the same selected objects.
3. **Selected-object inspector:** source passage, provenance, scope, processing depth, review state, history, downstream impact, and typed actions.
4. **Petra assistant and activity:** an explanatory research partner, progressive WorkUnits, recommendations, typed action previews, and interrupts.

Selecting an object in any surface updates the others without making interface state authoritative. Selecting a sentence in the assistant highlights its graph path and sources. Selecting a graph edge shows who or what created it, the supporting passage or run, its review status, and downstream dependents.

The graph is a focused explanatory mode, not the default whole-project view. Evidence matrices, tables, timelines, document views, and graph paths render the same objects according to the scientific relationship a researcher needs to understand.

### Direct manipulation

The researcher can edit graph objects without negotiating every correction through chat. They can narrow a claim, split or merge a concept, relink evidence, change a relation type, add a caveat, override a workflow state, or accept and reject proposed changes.

Each material edit creates a `ChangeSet` containing before and after state, author, reason, timestamp, affected objects, and reversal information. Material edits receive an impact preview before they are applied. For a direct human edit, the final Apply action approves that exact revision; Petra does not make the researcher approve the same correction twice.

The assistant can mediate the same workflow in conversation. It may summarize a batch, explain a classification, compare source context, identify exceptions, and translate a request into typed operations. Conversational prose never bypasses the ChangeSet, policy, approval, or provenance path.

Review should proceed by exception as a pipeline earns task- and domain-specific automation. `ReviewBatch` groups independently atomic ChangeSets so one conflict does not block unrelated decisions. Automatically promoted Assertions retain the policy, pipeline, calibration, audit, and model provenance that authorized them.

### Scientific standing and proactive actions

Petra distinguishes historical importance, source-native evidence, present scientific standing, Hypothesis development, and current project warrant. Standing is presented as a reasoned, multidimensional profile qualified by an `as_of` date, graph snapshot, corpus coverage, processing depth, and search limitations. It is never reduced to one currentness or confidence score.

Citation is distinct from substantive dialogue. Later work may cite a paper as background, adopt or directly test its Claim, extend or reframe it, qualify or challenge it, reproduce or fail to reproduce it, or critique its method. Scientific dialogue relations require Claim-level provenance and exact SourceSpans. Venue does not substitute for that analysis.

When a Hypothesis becomes active or changes materially, Petra may prepare a bounded alternative-hypothesis landscape in the background. Literature-derived competitors, methodological explanations, adjacent theories, boundary conditions, and Petra-proposed rivals remain distinguishable. “No alternative exists,” “none was found,” and “the search is incomplete” are different states.

Suggested actions state their scientific purpose, rationale, prerequisites, readiness, likely output, recommended response depth, and expected work. `research_deeply` is an execution depth rather than a generic button. Petra suggests actions such as tracing contemporary descendants, finding direct tests, mapping alternative theories, or comparing rival predictions.

### Progressive disclosure

Petra should not show the entire graph at once. Default views answer a current research question; users can expand provenance, contradictions, scope, or history as needed. Overview maps, focused neighborhoods, evidence tables, and timelines are complementary views of the same underlying state.

Current-snapshot results, cached derived work, active research, proposed changes, validated results, and applied mutations remain visibly distinct. Background work exposes its objective, depth, reason, stage, budget where relevant, and stop control without displaying private chain-of-thought.

[D009](decisions/D009-object-centered-research-workspace.md) defines the Research Brief, synchronized surfaces, and proactive action-readiness behavior. [D013](decisions/D013-ag-ui-sdk-interaction-boundary.md) defines the headless AG-UI production integration and preserves Petra's state and authority boundaries. [D014](decisions/D014-hono-react-vite-workbench-shell.md) hosts that boundary in Hono on Node with a React/Vite workbench.

### Explanation before assertion

The assistant adopts a collaborative research posture. It should explain why a question matters, which uncertainty it is trying to reduce, and why a proposed action is appropriate for the current assessment. It should distinguish “I found,” “the authors report,” “the graph suggests,” and “I propose.”

---

## Data architecture

Petra uses one canonical private corpus with project-specific overlays.

Canonical scholarly objects—works, versions, authors, artifacts, source spans, datasets, and repositories—are stored once and reused. Each project adds its questions, selected claims, evidence judgments, hypotheses, experiments, decisions, and private evidence without duplicating the source corpus.

A practical architecture will likely need:

- immutable object storage for original artifacts and run outputs;
- a graph store for typed entities and relations;
- full-text and vector indexes for candidate retrieval;
- a transactional store or event log for identities, permissions, approvals, and changes;
- an orchestration service that evaluates graph state and capability policy;
- a context compiler, derived-artifact cache, and scheduler with dependency-aware invalidation;
- isolated execution environments for code and experiments;
- a provider-neutral execution contract with local OCI and a conformance-tested managed sandbox for hosted untrusted code;
- a model gateway with role certification, routing, budgets, privacy policy, caching, and request and call records;
- a snapshot-bound research-artifact composer with provenance, citation, and renderer adapters;
- one runtime-validated TypeScript command and query layer shared by the interface and any future API or MCP adapter;
- one repository-owned JSON Schema Draft 2020-12 contract spine, validated directly in TypeScript and Python, with generated declarations and Pydantic kept downstream;
- end-to-end work, cost, and latency traces that remain queryable without turning every operational measurement into a scientific graph node;
- internal snapshots for reproducibility, comparison, evaluation, and stable artifact composition.

The graph is the semantic authority, but it need not be the only physical database. Petra should choose storage technologies by consistency, provenance, retrieval, and scale requirements rather than forcing every artifact into a property graph.

The interface, internal API, future deterministic API, and possible MCP server must use the same application commands, queries, policies, and events. API and MCP clients do not receive direct database authority. Their concrete public contracts follow observed internal use rather than preceding it.

Wholesale project publication is deferred. Sharing one selected artifact remains an explicit external action governed by its content, rights, destination, and applicable approval.

---

## Evaluation

Petra must be evaluated as a scientific instrument, not only as a chatbot.

### Retrieval

- recall of relevant and disconfirming work;
- source and version resolution accuracy;
- retrieval performance by field, year, venue, and query type;
- stability under paraphrase;
- graph-path validity.

### Extraction and graph construction

- claim and scope fidelity to source passages;
- relation classification accuracy;
- entity and version resolution;
- contradiction and qualification detection;
- calibration of quarantine and review decisions.

### Grounded generation

- citation entailment and source-span accuracy;
- scientific assertion coverage;
- rate of silent scope expansion;
- separation of report, inference, and hypothesis;
- appropriate abstention when evidence is insufficient.

### Scientific reasoning

- quality and diversity of alternative hypotheses;
- ability to propose discriminating rather than merely confirmatory tests;
- response to negative, conflicting, or failed-reproduction evidence;
- sensitivity to study design and measurement limitations;
- avoidance of premature epistemic promotion.

### Agentic safety

- permission-boundary violations;
- correctness of change and impact previews;
- reproducibility of model and tool actions;
- budget compliance;
- recovery after interruption, rejection, and rollback.

### Research and UX outcomes

- time to inspect and validate a claim;
- ability to detect a deliberately planted unsupported edge;
- researcher agreement with graph mutations;
- provenance comprehension;
- correction and rollback success;
- whether the interface encourages over-trust or appropriate verification.

---

## Initial pilot studies

The first release should be tested on two bounded research programs before choosing a public flagship question.

### Pilot 1: Bias in LLM-as-a-judge evaluation

This domain has a fast-moving literature, heterogeneous terminology, reusable datasets, competing bias mechanisms, and experiments that can often be run at manageable cost. It tests Petra's ability to distinguish claims about position bias, verbosity, self-preference, style, reference answers, judge-model families, and mitigation methods without collapsing them into “LLM judges are biased.”

The pilot should produce a claim map, evidence matrix, competing hypotheses, at least one preregistered discriminating experiment, reproducible runs, and a synthesis whose sentences resolve to source spans or experiment results.

### Pilot 2: Single-agent versus multi-agent systems

This domain tests whether Petra can handle vague constructs, inconsistent baselines, orchestration confounds, cost-quality trade-offs, and claims that depend strongly on task and implementation. The system should separate “more agents” from additional sampling, extra tokens, role specialization, communication topology, tool access, and verification.

The pilot should produce an operational taxonomy, matched-compute comparisons, failure analysis, and explicit boundary conditions for any observed advantage.

Together, the pilots cover literature synthesis, conceptual clarification, AI evaluation, code generation, experiment orchestration, and adversarial interpretation.

---

## Release sequence

### Foundation: trustworthy scholarly objects

Build canonical work and version identity, artifact ingestion, source spans, quarantine, claim proposals, evidence relations, graph inspection, and change history. The existing Paper Trail prototype provides a small evidence-first baseline for this layer.

### Research workbench: questions and synthesis

Add project overlays, hybrid and graph retrieval, contradiction-aware context packets, collaborative synthesis, direct graph editing, and evidence-coverage auditing.

### Hypothesis workbench: posture and protocols

Add Hypothesis development, assessments, assumptions, predictions, experimental design, obligations, approval policies, and the scientific posture engine.

### Experiment workbench: code and runs

Add progressive ProtocolProfiles, separate ProtocolVersion and ExecutionPlan locks, sandboxed execution, model and dataset registries, run graphs, artifacts, costs, Analysis, DecisionCriteria, reproduction attempts, and operational root-cause investigations. Local OCI is the development backend; Daytona is the provisional managed reference pending a later conformance test.

### Integrated Petra: composition and external workflows

Add snapshot-bound DraftArtifacts, provenance maps, stable citations, bibliography and LaTeX rendering, and deterministic external access where real workflows require it. Evaluate an MCP adapter only after Petra's internal objects, commands, permissions, and long-running work semantics are stable.

---

## Product identity

**Petra** is named for Lynn Petra Margulis. The reference is intentionally quiet: the product should stand on its own while honoring a scientist whose enduring work on endosymbiosis connected previously separate organisms into a more capable whole. That history resonates with a harness in which multiple models, tools, graphs, sources, and human judgment collaborate without losing their identities.

The name also carries its older meaning: rock. Evidence is a foundation, but scientific knowledge is not a featureless monolith. It has layers, fractures, inclusions, and a history of pressure.

### Visual mark

Petra's symbol is a single black rock.

It should be:

- irregular, compact, and recognizable at app-icon size;
- geometric enough to suggest structure, but not a crystal, mountain, or gemstone;
- faceted subtly, with a few edges that can read as a graph only on closer inspection;
- solid black in its primary form, without gradients or decorative network nodes;
- calm and durable rather than aggressive, luxurious, or occult.

The mark should work without the word Petra. The visual system around it can use restrained neutral colors, dense information design, and one functional accent color for selected paths, warnings, or active agent state.

### Voice

Petra speaks as an explanatory, collaborative research assistant. It is curious without being credulous, skeptical without being cynical, and precise without pretending that every uncertainty can be reduced to a number.

It does not say “the science proves” when the graph contains one scoped result. It says what was observed, by whom, under which conditions, what bears on the claim, what remains uncertain, and what could be done next.

Felicity and Grice guide Petra's prompt engineering and language description. Petra preserves claim force, states the useful answer or decision early, provides enough context for the current purpose, remains relevant, and uses stable, unambiguous terms. It distinguishes “the authors report,” “Petra extracted,” “the graph suggests,” “I recommend,” and “Petra applied” as different speech acts.

This language contract belongs to Petra rather than to any model provider. Prompts, typed responses, renderers, validators, and evaluations enforce it across model roles. [D006](decisions/D006-petra-language-and-reference-contract.md) defines the detailed behavior.

---

## Decisions already made

- Petra is a graph-native scientific workbench, not a general chat assistant.
- It uses multiple models through a policy-first gateway, separately evaluated role certifications, deterministic routing, and fully recorded logical requests and physical calls.
- The graph determines whether model work is needed and compiles bounded context; it does not resend the corpus or conversation by default.
- Scientific authority, derived retrieval structures, and executable control policy remain separate logical namespaces.
- Papers expose visible processing depth, and canonical processing is reused across projects while project judgments remain project-specific.
- Work, cache, latency, and validated cost are measured by pipeline stage so future optimization targets observed bottlenecks.
- Retrieval systems, including HippoRAG 2, will be benchmarked under frozen Petra tasks when a calibration corpus exists; none is selected as a production dependency now.
- Petra opens projects through an object-centered Research Brief; conversation and focused graph views are synchronized tools rather than competing sources of truth.
- Scientific standing is time- and coverage-qualified and multidimensional. Citation, substantive dialogue, historical importance, development, and present warrant remain distinct.
- Petra proactively prepares bounded alternative-hypothesis landscapes and presents scientifically specific SuggestedActions; response depth remains a separate control.
- Petra uses the official AG-UI SDK from M1 behind Petra-owned client and server adapters. AG-UI supplies the interaction protocol but does not define Petra's UX, domain state, scientific authority, or capabilities.
- The M1 workbench uses Hono on Node with React/Vite and React Router Data Mode. Fastify is the first fallback only after a recorded Hono conformance failure; neither server framework enters Petra core.
- Durable and cross-runtime records use repository-owned JSON Schema Draft 2020-12. Ajv and Python `jsonschema` enforce the same fixtures; generated TypeScript declarations and Pydantic models are conveniences rather than contract authorities.
- Hypothesis development, activity, warrant, and lifecycle remain separate. Immutable assessments also expose scientific standing, alternative coverage, project dependence, and stakes without a universal score.
- Petra uses one primary scientific posture plus extensible typed Obligations. Novel interpretations may remain open-ended; only registered semantics can control execution.
- Numerical criteria may govern scoped operational decisions, but crossing a threshold cannot by itself establish or refute a scientific Claim.
- Peer-reviewed papers and legitimate preprints are admissible scholarly sources.
- Official documentation, dataset cards, and code repositories are operational evidence.
- Private notes and unpublished observations are first-class but live in a separate namespace.
- Discovery and quarantine ingestion may run autonomously.
- Trusted-graph review supports `inspect`, `guide`, `delegate`, and `supervise` modes by workflow; modes never replace capability grants.
- Routine trusted-graph promotion may occur under a scoped, calibrated, audited review policy. Consequential graph changes, substantial experiments or spending, external actions, and publication require explicit approval by default.
- Scientific posture and operational permission are separate systems.
- The researcher can directly edit graph objects through typed, versioned, reversible ChangeSets, with conversational mediation available through the same command path.
- Every hypothesis has a stable project ordinal and descriptor; Petra restates the descriptor once per referenced hypothesis in each assistant turn.
- Petra's language follows a Felicity- and Grice-guided, model-independent scientific communication contract.
- The first pilots are LLM-as-a-judge bias and single-agent versus multi-agent systems.
- The initial product is private; external artifacts and integrations remain scoped and researcher-directed.
- The product is named Petra and uses a black rock as its visual mark.

## Next design decisions

The [roadmap](ROADMAP.md) owns the milestone sequence, and the [implementation roadmap](implementation_roadmap.md) owns the build order and gates. [D015](decisions/D015-language-neutral-runtime-contracts.md) completes the cross-runtime contract decision. Migration and integration-test tooling is the active `DISC-04` hypothesis: pinned Flyway OSS and a direct Compose harness lead, but must pass the frozen Petra comparison before any decision is locked or D016 is created. Contract scaffolding can proceed in parallel under D015. Petra's next build remains the M1 evidence-spine vertical slice, including its Hono-hosted AG-UI interaction path and first snapshot-bound DraftArtifact. API and MCP details remain deferred until the shared commands and queries have been exercised.

Petra should earn complexity in the same way its hypotheses earn edges: through visible need, explicit tests, and evidence that the added structure improves the research.
