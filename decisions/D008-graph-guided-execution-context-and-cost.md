# D008: Graph-guided execution with bounded context and measured cost

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Model-free fast paths, context compilation, conversation state, processing depth, derived retrieval state, dependency-aware caching, work scheduling, cost and latency observability, progressive responses, and future retrieval benchmarks
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D004](D004-docling-ingestion-and-claim-extraction.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D007](D007-model-gateway-role-registry-and-routing.md)

## Decision

Petra will use the graph, local stores, deterministic functions, and cached derived state to resolve as much work as possible before invoking a generative model.

The runtime principle is:

> Use a language model as a semantic coprocessor, not as Petra's runtime.

D008 decides whether model work is necessary and compiles the smallest adequate graph-derived context. D007 decides which eligible deployment performs that work.

The default conversational path answers from the current local graph snapshot. Discovering new literature, deepening document analysis, or expanding the graph is a separate visible action with its own time, cost, egress, and mutation boundary.

Petra will support four execution paths:

| Path | Typical work | Generative model use |
| --- | --- | --- |
| `local_deterministic` | Navigation, provenance, timelines, state, counts, graph actions | None |
| `local_semantic` | Reference resolution, narrow classification, compact routine language | Small local model only when necessary |
| `bounded_reasoning` | Claim comparison, synthesis, review discussion | Certified model with a bounded `ContextPacket` |
| `deep_research` | New discovery, adversarial expansion, difficult synthesis, experiment design | Expanded retrieval and one or more explicitly budgeted roles |

The graph is not assumed to save tokens merely because it is a graph. Serializing an uncontrolled neighborhood can cost more than ordinary retrieval. Token and latency savings must come from bounded graph queries, precomputed scientific objects, exact references, dependency-aware reuse, and avoiding unnecessary model calls.

## Context

Petra's intended corpus grows continually and is reused across projects. A researcher may work on several projects each week and inspect dozens of papers for one hypothesis. The primary scaling risk is not only database size. Repeated parsing, extraction, summarization, model routing, and cross-paper comparison can multiply cost and latency even when the same source and question structure already exist locally.

A chat-first runtime would resend long instructions, conversation history, papers, and graph state to a large model on every turn. It would also ask the model to reconstruct permissions, workflow state, evidence paths, and valid actions that Petra already stores explicitly.

Petra instead compiles task-specific local state. The researcher receives a fast first useful result when the graph can answer directly, while deeper work remains visible and interruptible.

## Runtime boundary

The TypeScript application owns execution planning, policy, graph and relational queries, context compilation, caching, scheduling, cost accounting, validation, and response state.

Python workers own bounded parsing and scientific computations that require their ecosystem. They return versioned artifacts and do not call PostgreSQL or Neo4j directly.

The execution path is:

```text
user or workflow event
        ↓
reference and intent resolution
        ↓
authoritative state, policy, and dependency read
        ↓
deterministic fast-path check
        ├── complete locally → validate and render
        └── model work required
                 ↓
            ContextRecipe selection
                 ↓
            bounded ContextPacket
                 ↓
            D007 ModelRequest
                 ↓
            validation and typed result
        ↓
derived-artifact cache, trace, and optional graph change proposal
```

No model determines its own context, permission, processing depth, budget, or authoritative completion state.

## Separate control, authority, and retrieval state

Petra maintains three logically distinct namespaces even when their projections share physical infrastructure.

### Scientific authority graph

This graph contains canonical research objects and provenance-bearing Assertions governed by Petra's trust and review rules. It supports scientific synthesis and graph inspection.

### Derived retrieval graph

This graph or index contains rebuildable search structures such as RetrievalUnits, embeddings, phrase or concept nodes, semantic-neighbor links, proposition candidates, passage containment, community summaries, and ranking weights.

Derived retrieval edges help find evidence. They are not automatically scientific Assertions. Every derived object records its source objects, transformation, model where applicable, configuration, and invalidation dependencies.

### Control graph

The control namespace contains capability grants, ReviewPolicies, RoutingPolicies, RoleProfiles, ContextRecipes, workflow transitions, escalation rules, budgets, and response contracts.

Scientific source content may influence what Petra investigates, but it cannot author or modify a control object. Text inside a paper, web page, dataset, model output, or retrieved passage never becomes an executable instruction merely because it appears in context. This boundary is required to prevent source-borne prompt injection from becoming graph-native authority.

## Response depth is a separate control axis

Petra distinguishes four concepts:

| Axis | Question answered |
| --- | --- |
| Scientific posture | How should Petra reason about the current hypothesis? |
| Review mode | What may Petra promote automatically? |
| Response depth | How much retrieval and computation should this request receive? |
| Model routing | Which eligible deployment performs the remaining model work? |

Initial response-depth values are:

- `current_graph`: use current authoritative and already derived local state; do not discover sources or deepen processing;
- `investigate`: run bounded local retrieval and synthesis without open-ended corpus expansion;
- `research_deeply`: permit an explicit research workflow that can discover, ingest, extract, criticize, and propose graph changes under its policies.

The workflow graph recommends a depth according to the request, current objects, Hypothesis development and assessment, missing evidence, and user preference. The researcher can override it within capability and budget limits. A faster depth cannot weaken grounding, permission, or review rules.

## Progressive document processing

Each admissible WorkVersion exposes a visible processing depth:

| Depth | Completed work |
| --- | --- |
| `catalogued` | Identity, source metadata, rights, version, and abstract availability |
| `indexed` | Immutable artifact parse, SourceSpans, structural RetrievalUnits, and configured search indexes |
| `extracted` | Baseline source-local Claims, methods, results, limitations, and structured scope |
| `analyzed` | Question- or hypothesis-specific relation analysis, deep methods review, visual interpretation, or other expensive criticism |

Petra will normally parse and index every admitted full-text artifact once. Papers added to a research corpus receive the configured baseline extraction. Cross-paper, visual, and deep methodological analysis run when relevance, workflow state, or an explicit request justifies them.

Processing state is never summarized as “read” without naming its depth. Partial and failed stages remain visible.

## Canonical and project-specific work

Canonical work attaches to the exact WorkVersion and pipeline revision and may be reused across projects. It includes:

- parsing and OCR;
- structural spans and document objects;
- source-local retrieval units and embeddings;
- source-local Claim proposals and grounded paper summaries;
- bibliographic and version identity.

Project work attaches to the project overlay. It includes:

- relevance to a ResearchQuestion or Hypothesis;
- project evidence judgments;
- cross-paper scientific relations;
- hypothesis impact;
- project synthesis, review, and automation decisions.

A WorkVersion reused by another project does not repeat canonical processing unless an applicable artifact, parser, extraction, schema, embedding, or policy revision requires a new derived artifact. Project-specific judgments are never promoted into the shared corpus merely because the source object is canonical.

## ConversationState

Petra will not resend an unbounded transcript on each turn. A versioned `ConversationState` contains:

- project, active ResearchQuestion, selected objects, and current snapshot;
- referenced Hypotheses and descriptor revisions;
- current ReviewBatch, task, and response depth;
- unresolved questions and ambiguities;
- decisions and graph changes relevant to the next turn;
- pointers to source turns and protected artifacts;
- user explanation and interaction preferences.

Older turns may be represented by a derived summary, but the summary links to the original turn and the graph objects on which it depends. A summary cannot become scientific evidence.

The D006 hypothesis first-mention rule is resolved by the renderer from current descriptors; it does not require another reasoning call or repeated transcript context.

## ContextRecipe

A `ContextRecipe` is a versioned, task-specific plan for constructing a `ContextPacket`. Initial recipes include:

- `hypothesis_ledger`;
- `claim_source_inspection`;
- `compare_claim_scopes`;
- `review_batch_summary`;
- `contradiction_analysis`;
- `identity_merge_impact`;
- `experiment_readiness`;
- `answer_with_evidence_paths`.

A recipe records:

- task and eligible response depths;
- authoritative and derived views to query;
- allowed trust zones and evidence namespaces;
- traversal direction, edge types, limits, and stopping rules;
- lexical, vector, metadata, temporal, and graph ranking components;
- contrary-evidence and scope requirements;
- source-span expansion rules;
- input-token, object-count, passage, time, and cost budgets;
- omission and truncation behavior;
- recipe, schema, ranking, and policy revisions.

Recipes are control objects. A model may propose a change but cannot activate one.

## ContextPacket

A `ContextPacket` is an immutable artifact compiled for one task, snapshot, and recipe revision. It contains:

- objective and resolved graph references;
- relevant Claims and Assertions;
- exact SourceSpans or deferred source references;
- structured scope and source status;
- support, contradiction, qualification, and unresolved conflict;
- hypothesis, experiment, or workflow state needed for the task;
- retrieval routes, scores, and inclusion reasons;
- trust zone, review state, origin, and visibility;
- omitted objects and the budget or policy reason for omission;
- packet and dependency hashes.

The packet includes scientific objects rather than a text dump of graph neighborhoods. It loads full passages only when the role requires them. A model cannot expand the packet by following an identifier outside the authorized tool and policy path.

## Deterministic fast paths

Petra exposes typed local functions for common requests, including:

- resolve a project object or hypothesis reference;
- show an evidence or provenance path;
- read a hypothesis or experiment ledger;
- list contrary, qualifying, or abstract-only evidence;
- inspect review-policy eligibility and exceptions;
- summarize an already computed ReviewBatch;
- preview a ChangeSet impact;
- compare authoritative revisions;
- show change, model-call, and cost timelines;
- apply an already validated and approved typed command.

These functions return structured results. D006 rendering may produce a concise natural-language answer without a generative model when templates and deterministic composition preserve meaning. A small local semantic role may resolve ordinary ambiguity, but it cannot bypass typed reference or command validation.

## Derived artifacts and dependency-aware caching

Petra precomputes reusable work during ingestion and background processing, including:

- source-grounded paper summaries;
- Claim and scope projections;
- method, result, limitation, dataset, and measure indexes;
- citation and version neighborhoods;
- hypothesis-relevance candidates;
- contradiction candidates;
- embedding and reranking features;
- review-policy eligibility;
- source preview and visual-region artifacts.

Every derived artifact records its input object revisions, recipe or transformation, model and prompt where applicable, schema, policy-sensitive namespace, and output hash.

Cache reuse requires an exact dependency and visibility match. A change invalidates the affected descendants rather than flushing the whole corpus. Recomputing one Claim does not reprocess an unrelated paper; changing a global schema or embedding model may invalidate a broader projection.

Provider prompt caching and batch APIs may reduce cost opportunistically, but Petra's correctness and replay path do not depend on them.

## WorkUnit and scheduling

Every interactive, foreground, background, or batch task is a `WorkUnit` with:

- workflow, objective, input revisions, and dependencies;
- processing depth and output schema;
- priority and responsiveness class;
- estimated token, monetary, CPU, GPU, memory, storage, network, and time envelope where measurable;
- hard budget, deadline, attempt, and concurrency limits;
- cache and idempotency key;
- cancellation, checkpoint, retry, and partial-result semantics;
- eligible local and remote execution routes;
- actual outcome and resource records.

The scheduler enforces per-workspace, project, provider, and resource concurrency; provider rate limits; storage pressure; dependency order; and cancellation. It reserves capacity for interactive work so background ingestion cannot make graph navigation or review unresponsive.

Idle processing may deepen eligible high-value artifacts under an explicit compute and storage policy. It cannot silently raise a paper's analysis depth or incur remote cost outside its grant.

## Cost and latency observability

`CostRecord` and trace spans measure the work that actually occurred, including:

- input, output, cached, and other exposed token categories;
- estimated and actual provider cost;
- CPU and GPU time and peak memory when observable;
- queue, graph-query, retrieval, model, tool, validation, projection, and rendering time;
- bytes read, written, downloaded, stored, and sent remotely;
- cache decisions;
- retries, repairs, fallbacks, and discarded results.

Costs aggregate by WorkVersion, pipeline stage, project, ResearchQuestion, Hypothesis, workflow, role, deployment, provider, and time period without making every token a graph node.

Every material request produces a latency waterfall with correlation identifiers shared across local queries, WorkUnits, ModelRequests, ModelCalls, validators, and projections. The interface may show a concise explanation of where time and cost were spent.

Petra compares models and pipelines by cost per validated result, not advertised token price or raw call latency alone. Numerical service objectives are set after representative baseline measurements.

## Progressive response contract

Petra may respond in stages:

1. resolve and display the active object and current authoritative state;
2. stream local evidence paths, counts, limitations, and cached results;
3. state which deeper WorkUnit is running, why, and under which depth and budget;
4. add the validated model result without erasing the earlier state or provenance.

A preliminary graph result is labeled as based on the current snapshot. Petra does not imply that it searched new literature or completed deeper analysis when it did not.

The researcher can inspect, pause, cancel, deepen, or continue other local work. The system does not use filler text or simulated reasoning to create an impression of progress.

## Cross-paper relation candidate control

Petra will not compare every Claim with every other Claim. Relation candidates pass through bounded stages:

```text
concept, lexical, and semantic blocking
        ↓
scope and source compatibility
        ↓
citation, method, dataset, outcome, and temporal signals
        ↓
cheap local ranking or classification
        ↓
bounded scientific-relation analysis
        ↓
quarantine Assertion proposal
```

Weak similarity and candidate links remain in the derived retrieval graph. Only a scientific relation with the required rationale, scope, provenance, and review path becomes an Assertion.

Candidate generation records its blocked population, limits, ranking, and omissions so relation recall and graph growth can be evaluated.

## Retrieval strategies and future benchmark

D008 defines a replaceable `RetrievalStrategy` and benchmark contract. It does not select one permanent GraphRAG method before Petra has a calibration corpus and adjudicated queries.

The future benchmark should compare representative families rather than every available library:

- lexical BM25;
- dense passage retrieval;
- lexical–dense hybrid retrieval;
- direct typed Petra graph traversal;
- a Petra-native passage-and-concept Personalized PageRank strategy;
- official HippoRAG 2 as an isolated challenger;
- proposition-path retrieval inspired by PropRAG;
- Microsoft GraphRAG basic, local, global, or DRIFT variants appropriate to the query class;
- a hierarchical summary strategy such as RAPTOR;
- an incremental dual-level graph strategy such as LightRAG when its comparison adds information not covered by the other challengers.

The list is a benchmark queue, not a production dependency list. A challenger must first preserve artifact identity, SourceSpan traceability, trust-zone separation, rights, and frozen evaluation inputs. Its native graph or summaries remain derived artifacts and cannot replace Petra's authoritative graph.

Retrieval and reader generation are evaluated separately. The comparison freezes corpus, WorkVersion split, queries, relevance and contrary-evidence judgments, embedding and reranking models where applicable, context and token budgets, reader model, prompts, schemas, and output limits.

Petra-specific query classes include:

- direct factual and source lookup;
- multi-paper associative retrieval;
- support, contradiction, and qualification retrieval;
- scope and boundary-condition retrieval;
- methods, measures, and limitation retrieval;
- work-version, correction, retraction, and temporal retrieval;
- hypothesis-ledger and evidence-path retrieval;
- incremental corpus update and dependency invalidation.

Metrics include SourceSpan recall and precision, contrary-evidence recall, path validity, citation entailment, scope preservation, evidence coverage, unsupported assertions, redundancy, indexing tokens and compute, graph and index growth, update cost, query latency, memory, generated tokens, and cost per validated result.

HippoRAG 2 is useful primarily as a design and benchmark reference: its passage–concept integration, query seeding, graph propagation, and dense fallback may reduce online model reasoning. Its schema-less OpenIE triples must remain retrieval hints in Petra. PropRAG's context-rich propositions and model-free online path search are especially relevant to Petra's Claim-centered design. These remain hypotheses to test on scientific literature rather than assumed improvements.

## Consequences

### Benefits

- Many interface and graph questions avoid a large-model call entirely.
- Reused papers do not repeat canonical processing for every project.
- Context size follows the scientific task rather than corpus or transcript size.
- Background work cannot consume all interactive capacity.
- Cost and latency bottlenecks become attributable to concrete stages.
- Scientific and retrieval graphs can evolve independently without confusing hints with evidence.
- Retrieval methods can be compared under Petra's provenance and scientific requirements.

### Costs and risks

- Context recipes, dependency tracking, scheduling, and telemetry add substantial runtime design.
- Derived-artifact invalidation can become complex as schemas and models change.
- A fast cached answer may be mistaken for current research if snapshot and processing depth are unclear.
- Overly narrow packets can omit crucial contrary evidence or scope.
- Background precomputation can spend resources on work that is never used.
- Retrieval graphs can grow rapidly through semantic-neighbor or relation-candidate edges.
- Progressive responses can confuse users if preliminary and final states are not clearly distinguished.

Petra mitigates these risks through visible depth, immutable packets, omission reporting, dependency hashes, resource policies, graph-namespace separation, and benchmarked recipes.

## Validation

D008 is satisfied when Petra can:

1. answer a provenance or graph-state request without a generative model call;
2. compile a bounded ContextPacket from a versioned ContextRecipe and named snapshot;
3. show every included object and every material policy or budget omission;
4. prevent a model or source passage from modifying a control object;
5. answer from `current_graph` without silently performing discovery or graph mutation;
6. escalate the same request to `investigate` or `research_deeply` through a visible WorkUnit;
7. reuse canonical parse, span, embedding, and extraction artifacts in a second project;
8. invalidate only affected derived artifacts after a local Claim revision;
9. retain ConversationState without resending the full transcript;
10. preserve D006 hypothesis references through deterministic rendering;
11. keep interactive navigation responsive while background ingestion is saturated;
12. cancel and resume a checkpointable WorkUnit without duplicating committed outputs;
13. produce an end-to-end latency waterfall and cost record for a grounded answer;
14. distinguish a cached current-snapshot answer from newly completed research;
15. block all-pairs Claim relation analysis and record candidate-generation limits;
16. keep machine-derived retrieval edges outside the trusted scientific graph;
17. run lexical, dense, hybrid, and one graph-guided strategy under frozen retrieval and reader conditions;
18. compare retrieval quality, contrary-evidence coverage, graph growth, indexing cost, query latency, and validated answer cost separately;
19. rebuild a derived retrieval projection from authoritative objects and versioned transformations;
20. continue local graph and source inspection when model providers are unavailable.

## Deferred decisions

D008 does not choose:

- a permanent default retrieval strategy;
- HippoRAG 2, PropRAG, GraphRAG, RAPTOR, LightRAG, or another framework as a production dependency;
- numerical latency, throughput, graph-size, or cost targets before representative measurement;
- a final scheduler, telemetry library, or user-interface implementation;
- permanent processing-depth policy for every discipline;
- a learned context selector or learned routing policy;
- exact community detection, PageRank, beam-search, semantic-neighbor, or cache parameters;
- the research canvas and inspector layout, which belongs to D009.

## Revisit triggers

Reconsider D008 if:

- graph fast paths do not materially reduce validated latency or model use;
- ContextPackets routinely omit decisive evidence or require most of the source corpus;
- dependency tracking costs more than selective recomputation;
- background work prevents interactive responsiveness despite reserved capacity;
- processing-depth labels fail to communicate what Petra has and has not analyzed;
- retrieval graph growth or projection time becomes disproportionate to retrieval gains;
- one retrieval strategy dominates across Petra's query classes and meaningfully simplifies the architecture;
- progressive responses reduce rather than improve researcher comprehension;
- source-borne prompt injection crosses into control behavior.

Any revision must preserve authoritative graph identity, explicit omissions, bounded context, measured work, namespace separation, and the ability to compare retrieval strategies reproducibly.

## References considered

- [HippoRAG 2: From RAG to Memory](https://arxiv.org/html/2502.14802)
- [Official HippoRAG implementation](https://github.com/OSU-NLP-Group/HippoRAG)
- [PropRAG: Guiding Retrieval with Beam Search over Proposition Paths](https://aclanthology.org/2025.emnlp-main.317/)
- [Microsoft GraphRAG query modes](https://microsoft.github.io/graphrag/query/overview/)
- [RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval](https://proceedings.iclr.cc/paper_files/paper/2024/hash/8a2acd174940dbca361a6398a4f9df91-Abstract-Conference.html)
- [LightRAG: Simple and Fast Retrieval-Augmented Generation](https://arxiv.org/abs/2410.05779)

## Next decision

D009 will define the research canvas, evidence inbox and inspector, graph and path inspector, progressive response surfaces, and direct manipulation architecture over the contracts established in D005 through D008.
