# Petra Roadmap

This roadmap is a navigation and sequencing document. It does not pre-decide unresolved architecture or assign speculative dates. Petra will advance through one consequential decision at a time, record that decision, implement the smallest testable slice, and update this file with what was learned.

Companion documents:

- [Product brief and founding design](PETRA.md)
- [Minimum viable graph and event model](PETRA_GRAPH_MODEL.md)
- [Implementation roadmap](implementation_roadmap.md)
- [Design implementation roadmap](design_implementation_roadmap.md)

## Working method

For each consequential decision:

1. define the question and the constraints that make it consequential;
2. compare a small number of viable options;
3. choose the simplest reversible option that supports the next vertical slice;
4. record the decision and its consequences in a focused decision document;
5. implement and evaluate it against explicit exit criteria;
6. revisit the decision only when evidence or requirements cross a recorded trigger.

Decision documents should stay focused. Each one records:

- context and decision;
- constraints and options considered;
- reasons for the choice;
- consequences and risks;
- validation plan;
- reversibility and revisit triggers.

The roadmap tracks order and status. Decision documents hold the reasoning. Implementation specifications define exact contracts. These documents should not be collapsed into one growing master plan.

## Current position

| Area | Status | Evidence of completion |
| --- | --- | --- |
| Product thesis and scientific contract | Complete | `PETRA.md` |
| Logical graph and event model | Complete as design | `PETRA_GRAPH_MODEL.md` |
| Implementation roadmap | M1.5 in progress; deterministic evidence proposal and quarantine admission complete, review path next | `implementation_roadmap.md`, `reports/M1.4-DOCLING-WORKER.md`, `reports/M1.5-DETERMINISTIC-PROPOSALS.md` |
| Design implementation roadmap | UX1.0 foundations and UX1.1 research shell in progress | `design_implementation_roadmap.md` |
| Source-control boundary | Dedicated `/petra` repository on `main`, backed by the private `beethovensaves/petra` remote; verified stages are committed and pushed | `.git/`, `.gitignore`, `implementation_roadmap.md` |
| Machine-readable schemas | JSON Schema authority and the M1.1 contract kernel complete; Ajv/Python parity, generation, rejection, and canonical-hash gates pass | `decisions/D015-language-neutral-runtime-contracts.md`, `packages/contracts/` |
| Developer runtime | npm and uv verification passes; digest-pinned PostgreSQL, Neo4j, and S3-compatible services pass Compose health and native probes on Docker Desktop | `README.md`, `infra/dev/compose.yaml`, `implementation_roadmap.md` |
| Migration and integration testing | D016 accepts digest-pinned Flyway OSS with forward-only SQL and a direct disposable Compose harness; the frozen comparison and failure evidence pass | `decisions/D016-flyway-compose-persistence-tooling.md`, `experiments/disc-04/EVIDENCE.md` |
| Executable event store and graph projection | PostgreSQL events/outbox/checkpoints plus official-driver Neo4j projection, bounded queries, freshness, exact retry, stale refusal, and rebuild complete | `packages/postgres/`, `packages/neo4j/`, `packages/core/src/scientific-graph-projector.ts`, `reports/M1.3-NEO4J-PROJECTION.md` |
| Literature source and rights policy | Complete as design | `decisions/D003-scholarly-discovery-and-rights.md` |
| Ingestion and claim-extraction pipeline | Complete as design | `decisions/D004-docling-ingestion-and-claim-extraction.md` |
| Trusted-graph review and direct editing | Complete as design | `decisions/D005-trusted-graph-review-and-direct-editing.md` |
| Language and hypothesis-reference contract | Complete as design | `decisions/D006-petra-language-and-reference-contract.md` |
| Model gateway, role registry, and routing | Complete as design | `decisions/D007-model-gateway-role-registry-and-routing.md` |
| Graph-guided execution, context, and cost | Complete as design | `decisions/D008-graph-guided-execution-context-and-cost.md` |
| Executable Petra ingestion workflow | Abstract-only Paper Trail baseline and exact CC BY full-text fixture complete; offline Docling returns stable document proposals, and independent TypeScript admission converts supported source passages into atomic quarantine-only Claim–Assertion pairs while rejecting fabricated spans | `fixtures/paper-trail/`, `fixtures/full-text/fair-guiding-principles/`, `packages/retrieval/`, `workers/science/`, `reports/M1.4-DOCLING-WORKER.md`, `reports/M1.5-DETERMINISTIC-PROPOSALS.md` |
| Petra interface | Object-centered design accepted; deterministic shell preview exists; module design and validation are in progress | `decisions/D009-object-centered-research-workspace.md`, `design_implementation_roadmap.md` |
| AG-UI interaction protocol | Official SDK and Petra adapter boundary accepted; M1 scaffold and conformance fixtures pass | `decisions/D013-ag-ui-sdk-interaction-boundary.md`, `reports/M1.0-AGUI-HONO-CONFORMANCE.md` |
| Web workbench shell | Hono/React/Vite shell and addressable preview routes exist; scientific production views remain M1.7 work | `decisions/D014-hono-react-vite-workbench-shell.md`, `implementation_roadmap.md` |
| Hypothesis assessment and posture | Complete as design | `decisions/D010-hypothesis-assessment-posture-and-obligations.md` |
| Agent runtime and permissions | Partial design | Product, graph, D005, D007, D008, and D010 specifications |
| Experiment runtime | Complete as design; implementation not started | `decisions/D011-experiment-sandbox-and-reproducibility.md` |
| Research-artifact composition | Complete as design; implementation follows grounded synthesis | `decisions/D012-scoped-research-artifacts-and-external-adapters.md` |
| External API and MCP | Shared boundary accepted; concrete adapters deferred | `decisions/D012-scoped-research-artifacts-and-external-adapters.md` |
| Pilot evaluations | Questions selected | LLM-judge bias; single- versus multi-agent systems |

`M1.0-DEC01` is resolved by the dedicated Petra repository, D013 fixes AG-UI as the M1 interaction protocol, D014 selects the Hono-on-Node and React/Vite workbench shell, D015 fixes the language-neutral contract spine, and D016 selects Flyway OSS plus direct Compose after the frozen `DISC-04` comparison. The **M1 evidence-spine vertical slice** covers machine-readable contracts, one project, one scholarly WorkVersion and Artifact, stable SourceSpans, quarantined Claim proposals, reviewed Assertions, a visible graph projection, one grounded synthesis, its AG-UI interaction path, and D012's first provenance-bearing DraftArtifact.

## Decision queue

Only the current decision should be resolved in detail. Later decisions remain provisional until their dependencies are understood.

| ID | Decision | Why it comes here | Status |
| --- | --- | --- | --- |
| [D001](decisions/D001-local-first-runtime.md) | Runtime and deployment boundary | Establishes privacy, packaging, connectivity, and future hosting constraints | Accepted |
| [D002](decisions/D002-postgres-neo4j-artifacts.md) | Physical persistence and projection stack | Implements the logical event, graph, artifact, and search contracts within D001's boundary | Accepted |
| [D003](decisions/D003-scholarly-discovery-and-rights.md) | Scholarly discovery, full-text acquisition, and licensing | Determines admissible sources, artifact availability, and ingestion limits | Accepted |
| [D004](decisions/D004-docling-ingestion-and-claim-extraction.md) | First ingestion and claim-extraction pipeline | Creates the source-to-span-to-assertion path for the first pilot | Accepted |
| [D005](decisions/D005-trusted-graph-review-and-direct-editing.md) | Trusted-graph review and direct-editing interaction | Defines assistant-mediated review, direct correction, modes, calibrated automation, batching, and reversal | Accepted |
| [D006](decisions/D006-petra-language-and-reference-contract.md) | Petra language, reference, and conversational contract | Makes scientific force, hypothesis reference, and assistant identity stable across models | Accepted |
| [D007](decisions/D007-model-gateway-role-registry-and-routing.md) | Policy-first model gateway with role-specific certification | Governs multiple models, private-data policy, budgets, and role assignment | Accepted |
| [D008](decisions/D008-graph-guided-execution-context-and-cost.md) | Graph-guided execution with bounded context and measured cost | Lets graph state eliminate or bound model work and defines the future retrieval benchmark | Accepted |
| [D009](decisions/D009-object-centered-research-workspace.md) | Object-centered research workspace with progressive agent interaction | Turns provenance, processing depth, proactive preparation, graph state, and progressive work into usable scientific interaction | Accepted |
| [D010](decisions/D010-hypothesis-assessment-posture-and-obligations.md) | Snapshot-bound Hypothesis assessment with extensible posture obligations | Separates development, activity, warrant, lifecycle, standing, posture, obligation, waiver, and numerical-criterion meaning | Accepted |
| [D011](decisions/D011-experiment-sandbox-and-reproducibility.md) | Progressive experiment execution and reproducibility | Separates scientific and execution locks, sandbox authority, results, criteria, diagnosis, reproduction, and artifact promotion | Accepted |
| [D012](decisions/D012-scoped-research-artifacts-and-external-adapters.md) | Scoped research artifacts and adapter-neutral access | Connects generated prose, citations, formats, and future external clients to one snapshot-bound command and provenance path | Accepted |
| [D013](decisions/D013-ag-ui-sdk-interaction-boundary.md) | Official AG-UI SDK behind Petra-owned interaction adapters | Establishes the production interaction protocol before the workbench and scientific workflows couple to a bespoke stream | Accepted |
| [D014](decisions/D014-hono-react-vite-workbench-shell.md) | Hono-first TypeScript server and React/Vite workbench shell | Gives the mandatory AG-UI stream a Web Standard Node host while keeping Fastify as an evidence-triggered fallback | Accepted |
| [D015](decisions/D015-language-neutral-runtime-contracts.md) | Language-neutral runtime contracts with JSON Schema | Gives TypeScript, Python, persistence, workers, and adapters one portable contract authority while keeping generated types and Pydantic downstream | Accepted |
| [D016](decisions/D016-flyway-compose-persistence-tooling.md) | Flyway migrations and direct Compose integration harness | Selects the migration and real-service test lifecycle only after checksum, concurrency, rollback, interruption, recovery, diagnostics, and cleanup fixtures pass | Accepted |

The queue may change when an implementation slice reveals a dependency. Reordering requires a short reason in the roadmap; it does not require pretending the original sequence was a failure.

D008 was inserted before the interface decision because latency, context, processing depth, active work, and cost must have stable semantics before the UI presents them. Public snapshot design was later removed from the active queue because no wholesale-publication use case had been established. D012 instead records scoped artifact composition and keeps API and MCP as adapters over the internal application boundary. D013 amends D009's provisional AG-UI boundary: the official SDK now begins in M1, while Petra retains its own UX, state, commands, capabilities, and scientific authority. D014 selects Hono on Node first because its Web Standard stream boundary fits AG-UI; Fastify activates only after a recorded Hono conformance failure. D015 establishes JSON Schema Draft 2020-12 as the portable contract authority. D016 then selects Flyway OSS and direct Compose after the candidates pass or fail the same frozen persistence and lifecycle gates.

## Milestones

### M0 — Scientific and graph contract

Status: complete as design.

Outputs:

- product thesis, scope, evidence classes, and scientific posture;
- minimum entities, assertions, trust zones, events, invariants, and acceptance tests;
- first pilot domains and private-to-public direction;
- Petra name and black-rock identity.

Exit condition: the project can distinguish a source, source span, claim, inference, hypothesis, result, interpretation, model action, and trusted graph mutation in writing.

### M1 — Evidence spine

Goal: prove Petra's defining source-to-graph contract without experiment execution.

Scope:

- create a project under a bounded capability policy;
- ingest one legitimate paper and immutable artifact;
- identify stable source spans;
- propose claims and provenance-bearing assertions into quarantine;
- route extractor and synthesist work through certified ModelRequests with recorded egress and validation;
- review and promote selected assertions through assistant-mediated, atomic change sets;
- apply one bounded ReviewPolicy and retain its calibration and audit history;
- project accepted assertions into an inspectable graph;
- compile one bounded ContextPacket and generate one grounded synthesis from a frozen snapshot;
- answer one provenance-path request through a deterministic graph fast path;
- expose the synthesis's WorkUnit, cache decision, latency waterfall, and validated cost;
- render the active question, one Hypothesis, evidence limitations, and a scientifically specific SuggestedAction in a Research Brief;
- preserve object identity across the evidence matrix, focused graph, inspector, and assistant;
- carry assistant text, activity, tool proposals, review interrupts, and resumption through the official AG-UI SDK and Petra adapters;
- host the React/Vite workbench and Petra routes through Hono on Node, with Fastify activated only by a recorded conformance failure;
- rebuild the graph projection from the event log.

Exit conditions:

- every sourced assertion in the synthesis resolves to an admissible source span;
- model proposals remain distinguishable from source-native and human assertions;
- a rejected or reverted edge disappears from the active view without losing history;
- projection replay produces the same active assertion identifiers;
- an unsupported scientific assertion is blocked or visibly relabeled;
- routine delegated promotion remains distinguishable from human-reviewed promotion;
- routing, context, and cost remain reconstructable without consulting a chat transcript;
- an AG-UI reconnect, replay, or interrupt response cannot duplicate a WorkUnit result, command, or ChangeSet application;
- the Hono production topology passes D014's streaming, validation, tracing, static-serving, and graceful-shutdown criteria or records the exact criterion that activates Fastify;
- a researcher can orient to the project and trace the synthesis without beginning in chat.

### M2 — Literature research loop

Goal: move from a rough question to a contradiction-aware literature map.

Scope:

- question framing and decomposition;
- scholarly search and citation expansion;
- identity and version resolution;
- visible `catalogued`, `indexed`, `extracted`, and `analyzed` processing depth;
- quarantine triage and batch review;
- `inspect`, `guide`, and bounded `delegate` review flows;
- local, global, hybrid, path, temporal, and adversarial retrieval recipes;
- evidence packets with scope and contrary findings;
- direct editing through the research canvas and evidence inspector;
- conversational review that resolves recommendations to typed graph operations;
- proactive, bounded HypothesisLandscape preparation with explicit search coverage;
- scientifically specific SuggestedActions with visible readiness and response depth;
- present-standing summaries that expose their date, snapshot, scope, and limitations;
- extension of the M1 AG-UI profile for longer literature work, background landscape activity, and efficient review;
- an adjudicated retrieval calibration set, followed by frozen lexical, dense, hybrid, typed-graph, and selected challenger comparisons when the corpus is representative.

Exit conditions:

- a researcher can find, inspect, correct, and reuse a claim without relying on chat history;
- each conversational hypothesis reference includes its descriptor once per assistant turn;
- citation edges are never displayed as scientific support;
- preprints, peer-reviewed versions, operational evidence, and personal evidence remain visibly distinct;
- retrieval evaluation includes relevant and disconfirming work;
- external retrieval systems remain replaceable derived projections and cannot silently alter scientific authority;
- a dropped or resumed interaction cannot duplicate a command, result, or applied change;
- literature-derived alternatives remain distinguishable from Petra-proposed rivals.

### M3 — Hypotheses and governed agency

Goal: let Petra collaborate scientifically while keeping behavior and authority legible.

Scope:

- separate Hypothesis development, activity, warrant, and lifecycle projections;
- immutable, snapshot-bound assessments of standing, alternative coverage, dependence, and stakes;
- assumptions, predictions, rivals, confounds, and falsification conditions;
- explore, clarify, challenge, discriminate, reproduce, and consolidate postures;
- registered Findings, one primary posture, extensible Obligations, waiver consequences, and selective invalidation;
- per-project capability grants, budgets, and approval tiers;
- review modes and policies that remain separate from capability grants;
- model roles, routing records, activity traces, pause, revocation, and rollback.

Exit conditions:

- posture changes because of visible graph state rather than hidden prompt state;
- an agent cannot exceed a revoked, expired, or exhausted capability grant;
- early hypotheses can be discarded cheaply;
- developed Hypotheses cannot be dismissed by an incomparable Result without an explicit scope analysis;
- retirement, challenge, reproduction, and development remain distinct;
- an unmapped Finding remains inspectable but cannot control execution;
- a waiver remains distinguishable from satisfaction and preserves downstream constraints;
- all material agent graph mutations enter through reviewable change sets;
- the assistant preserves Petra's epistemic language contract when its underlying model changes.

### M4 — Experiment loop

Goal: connect hypotheses to reproducible protocols, code, runs, results, and interpretations.

Scope:

- experiment proposals and approval;
- reviewed and locked ProtocolVersions plus separately authorized ExecutionPlans;
- sandboxed code execution;
- code, dataset, model, environment, configuration, seed, output, and cost capture;
- Result, Analysis, CriterionEvaluation, OperationalDecision, and interpretation separation;
- execution failure, validity, insufficient precision, inconclusive analysis, and criterion-outcome semantics;
- operational root-cause investigations with versioned diagnosis and correction;
- reproduction attempts and matched-compute comparisons;
- versioned DecisionCriteria, tolerances, uncertainty requirements, and stage gates;
- prespecified, amended, and exploratory criterion provenance;
- progressive ML obligations and artifact-promotion rules.

Exit conditions:

- no scientific Run executes against an unlocked ProtocolVersion or unauthorized ExecutionPlan;
- a completed run can be reconstructed to the extent permitted by its dependencies;
- failed execution does not automatically count against a hypothesis;
- scientific amendments create new ProtocolVersions and implementation changes create new ExecutionPlans;
- claims derived from results identify the exact run and analysis;
- passing an operational criterion does not automatically create scientific support;
- raw measurements, uncertainty, criterion distance, and sensitivity remain inspectable.

### M5 — Pilot validation

Goal: test Petra as a scientific instrument in the two selected domains.

#### Pilot A: LLM-as-a-judge bias

Required outputs:

- scoped claim and disagreement map;
- taxonomy of reported judge biases and mitigations;
- contradiction-aware synthesis;
- at least one discriminating experiment with a locked protocol;
- reproducible runs and evidence-linked interpretation;
- documented errors discovered in retrieval, extraction, reasoning, and UX.

#### Pilot B: Single- versus multi-agent systems

Required outputs:

- operational taxonomy separating agent count from sampling, token budget, roles, topology, tools, and verification;
- comparable baseline and matched-resource experimental design;
- cost, performance, and failure analysis;
- explicit boundary conditions for any observed advantage;
- comparison with lessons from Pilot A.

Exit conditions:

- Petra improves traceability and correction without making research review prohibitively cumbersome;
- evaluations expose failure modes by component rather than reducing performance to one answer score;
- at least one original assumption about Petra is revised in response to pilot evidence;
- the graph snapshot supports independent inspection of each reported pilot conclusion.

### M6 — Private beta and external integration

Goal: stabilize the individual workbench and test controlled use from researchers' existing tools and pipelines.

Scope:

- onboarding, recovery, backup, migration, and correction flows;
- performance and cost controls;
- privacy and threat-model review;
- stable, runtime-validated application commands and queries;
- deterministic API access where observed workflows require it;
- an MCP adapter only if agent-facing use demonstrates sufficient value;
- scoped DraftArtifact, citation, bibliography, method, code, and provenance exports;
- accessibility and provenance-comprehension testing;
- trademark and domain clearance for Petra.

Exit conditions:

- private notes, unpublished evidence, credentials, and disallowed artifacts cannot leak through external access or artifact composition;
- an external client cannot bypass project, capability, review, budget, or event semantics;
- a DraftArtifact remains traceable to its snapshot, evidence, citations, model work, and researcher revisions;
- researchers understand the difference between source evidence, Petra inference, and hypothesis status in UX testing;
- the system has documented limits and correction routes.

## Cross-cutting evaluation

Every milestone should preserve a small set of continuous checks:

- source-span and citation entailment accuracy;
- identity-resolution errors and unresolved cases;
- assertion precision by relation and origin type;
- relevant and disconfirming retrieval coverage;
- silent scope expansion;
- permission, budget, and data-policy violations;
- event replay and snapshot reproducibility;
- researcher correction time and provenance comprehension;
- review automation precision, audit yield, escalation burden, and policy drift;
- epistemic-origin language accuracy and hypothesis-reference comprehension;
- model-route eligibility, certification drift, fallback safety, and cost per validated result;
- ContextPacket evidence coverage, contrary-evidence omissions, dependency correctness, and stale-cache rate;
- interactive latency, background-work interference, cancellation behavior, and end-to-end cost attribution;
- project-orientation time, provenance comprehension, action-readiness comprehension, and accidental approval;
- distinction among current, cached, running, proposed, validated, and applied work;
- hypothesis-landscape coverage, alternative-origin accuracy, and proactive-work yield;
- assessment-origin accuracy, selective-invalidation correctness, posture override, and obligation burden;
- criterion provenance, tolerance sensitivity, operational-decision correctness, scientific-interpretation leakage, failure classification, and root-cause diagnosis quality.

Targets should be set only after a baseline task and error distribution exist. Petra should not invent success thresholds before observing what the first pilot actually requires.

## Next implementation slice: M1 evidence spine

The first build should establish:

1. runtime-validated identifiers, revisions, commands, events, and artifact manifests shared by TypeScript and Python;
2. one project with one canonical Work, WorkVersion, immutable source Artifact, and stable SourceSpans;
3. a bounded Docling parse and quarantined Claim proposal with exact provenance;
4. one reviewed ChangeSet that promotes an Assertion into PostgreSQL authority;
5. an idempotent Neo4j projection and a focused graph view that resolves back to the Assertion and SourceSpan;
6. one snapshot-bound EvidencePacket and grounded synthesis with contrary-evidence and omission fields, even if empty for the minimal fixture;
7. one DraftArtifact revision that maps its material prose to the synthesis evidence and creates a canonical CitationBundle;
8. trace, failure, replay, and cost records sufficient to diagnose the slice without a chat transcript.

The slice should use Petra's internal commands and queries from the beginning. It does not require a public API, MCP server, managed experiment sandbox, full hypothesis-posture engine, or public sharing design.
