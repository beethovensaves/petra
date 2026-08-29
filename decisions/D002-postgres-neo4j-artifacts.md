# D002: PostgreSQL authority with a Neo4j GraphRAG projection

- **Status:** Accepted
- **Accepted:** 2026-08-27
- **Scope:** Persistence, graph projection, application boundaries, and derived retrieval units
- **Depends on:** [D001](D001-local-first-runtime.md)

## Decision

Petra will use:

- **PostgreSQL** as the authoritative research ledger and transactional application database;
- **Neo4j** as a first-class, visible, and rebuildable GraphRAG read model;
- **S3-compatible object storage** for immutable source and experiment artifacts;
- a **transactional outbox** to project committed PostgreSQL state into Neo4j;
- a **TypeScript modular monolith** for product behavior, domain commands, policy, retrieval orchestration, and graph projection;
- bounded **Python scientific workers** for parsing, scientific NLP, ML, statistics, and experiment execution;
- runtime-validated, language-neutral contracts from which TypeScript and Python types are generated;
- immutable structural documents and versioned `RetrievalUnit` projections so chunking can be evaluated and replaced without re-ingesting a source.

PostgreSQL is the authority for what Petra recorded, approved, and changed. Neo4j is an operational authority for graph retrieval only at a declared projection revision. If the two systems disagree, Petra trusts PostgreSQL, pauses affected graph-dependent actions when necessary, and repairs or rebuilds the Neo4j projection.

## Context

Petra is expected to ingest dozens or more scholarly works for each hypothesis, develop several projects each week, and reuse prior literature across later work. It is also expected to be hosted relatively early and to demonstrate an actual graph engine with inspectable visualization.

The projected node and relationship counts do not by themselves require a distributed database. The durable requirements are more important:

- one canonical scholarly corpus reused across projects;
- concurrent ingestion, agent, review, and experiment jobs;
- strong transactional history and approval semantics;
- native graph traversal, visualization, and GraphRAG retrieval;
- lexical and vector search over derived source representations;
- local and hosted deployment using the same logical architecture;
- a migration path that does not make scientific history dependent on one graph vendor.

An embedded SQLite-only design would keep local installation simple but would create an early hosted migration and would not satisfy the native graph-engine requirement. A Neo4j-only design would provide the clearest graph demonstration but would couple event history, workflow state, permissions, jobs, and research records to the graph engine. D002 adopts two explicit authorities rather than one ambiguous one: PostgreSQL for committed research state and Neo4j for a revisioned graph projection.

## System shape

```text
                         PostgreSQL
                authoritative research ledger
        ┌─────────────────────────────────────────┐
        │ events · entities · assertions          │
        │ projects · permissions · approvals      │
        │ protocols · runs · result metadata      │
        │ jobs · outbox · projection checkpoints  │
        └──────────────────┬──────────────────────┘
                           │ idempotent projection
                           ▼
                          Neo4j
                  GraphRAG retrieval model
        ┌─────────────────────────────────────────┐
        │ works · spans · claims · hypotheses     │
        │ evidence · methods · experiments        │
        │ retrieval units · full-text · vectors   │
        │ graph queries · analysis · visualization│
        └─────────────────────────────────────────┘

                   S3-compatible storage
        PDFs · structured documents · datasets · code
        environments · outputs · snapshot artifacts
```

The application never performs an uncoordinated dual write to PostgreSQL and Neo4j.

## PostgreSQL responsibilities

PostgreSQL stores the authoritative form of:

- append-only domain events and event schemas;
- command identities, idempotency keys, and correlation records;
- work, version, artifact, source-span, and external-identifier metadata;
- complete provenance-bearing assertions;
- project overlays, personal-evidence boundaries, and visibility decisions;
- hypothesis state, transition reasons, and dependency records;
- change sets, approvals, conflicts, reversals, and audit state;
- capability grants, egress policy, budgets, and revocations;
- agent runs, model-call metadata, and tool-use records;
- experiment, protocol, run, result, and reproduction metadata;
- background jobs, leases, retries, and failure state;
- transactional outbox messages;
- graph projection checkpoints and consistency diagnostics;
- snapshot and export manifests.

Structured fields that must be filtered, constrained, joined, or audited should use typed columns or normalized tables. Versioned payloads and provider-specific metadata may use JSON where a stable relational shape would be premature. JSON must not replace indexed fields required for identity, permission, lifecycle, ordering, or provenance.

PostgreSQL may later host a vector fallback through `pgvector`, but this is not the initial GraphRAG retrieval authority. Keeping embedding records addressable by Petra IDs will make such a fallback or migration possible.

## Neo4j responsibilities

Neo4j stores a derived property-graph representation optimized for:

- bounded and variable-length traversal;
- evidence, contradiction, qualification, and dependency neighborhoods;
- paths among works, claims, hypotheses, methods, datasets, experiments, and results;
- local and global GraphRAG retrieval;
- full-text and vector candidate generation;
- graph-guided reranking and context construction;
- community, similarity, centrality, path, and other declared graph analyses;
- developer inspection through Neo4j Browser;
- researcher-facing visualization through Petra's interface.

Every projected node and relationship must carry:

- its stable Petra ID or assertion ID;
- workspace and project scope where applicable;
- authoritative revision;
- originating event or outbox position;
- lifecycle, trust zone, and review state when relevant;
- the provenance references required by its scientific meaning.

Neo4j must not receive direct scientific mutations from the browser, an agent, a Python worker, or an administrative script. Edits enter through Petra's TypeScript command path, commit in PostgreSQL, and then project to Neo4j.

Neo4j indexes and derived graph-analysis results are projections. Their configuration and provenance are recorded, but their contents do not become scientific evidence merely because the graph engine computed them.

## Object-storage responsibilities

Large or immutable content lives outside both databases:

- original PDFs, HTML captures, XML, and structured document exports;
- page images, tables, figures, and extracted media;
- dataset and code snapshots;
- model, prompt, and environment artifacts when retention is justified;
- experiment inputs and outputs;
- logs too large for the transactional ledger;
- DraftArtifacts, rendered research outputs, citation bundles, and snapshot manifests.

Artifacts are addressed by content hash. PostgreSQL stores exact content
identity, hash, size, and media type on `Artifact`; source, retrieval, integrity,
and storage-location facts on immutable `ArtifactManifest` records; and
copy-specific license state and permitted operations on `RightsDecision`.

An artifact is registered only after Petra has written it to a staging location, computed and verified its hash, and atomically made it available under its content address. An unreferenced artifact may later be collected; an authoritative record must never point to an artifact that was not durably written.

S3 compatibility permits the local and hosted profiles to use the same adapter contract. The concrete local and hosted providers are deferred.

## Transactional outbox and projection

For every material command, one PostgreSQL transaction:

1. validates identity, state-transition, concurrency, approval, and capability rules;
2. appends the domain event;
3. updates authoritative tables;
4. inserts one or more ordered outbox records;
5. commits atomically.

The projection worker claims outbox records, applies idempotent Cypher operations, verifies expected Petra revisions, and advances a PostgreSQL checkpoint only after Neo4j commits.

Projection rules:

- processing the same outbox record twice produces the same graph state;
- gaps are detected before later records advance a stream checkpoint;
- stale revisions cannot overwrite newer graph objects;
- tombstones and supersession are projected explicitly;
- failed records enter a visible repair queue rather than being skipped silently;
- a complete projection can be rebuilt from authoritative PostgreSQL state and events;
- consistency checks sample identities, assertion state, counts by type, and revision parity.

The user interface exposes the authoritative revision and graph projection revision. When a just-committed change has not reached Neo4j, Petra shows a catch-up state. Operations that require the new graph state wait for the relevant checkpoint or use an explicit authoritative query path.

## Application architecture

Petra begins as a modular monolith, not a collection of independently deployed product services.

### TypeScript application

TypeScript owns:

- the internal application API and any later external API adapters;
- authentication and workspace boundaries;
- domain commands, invariants, and state transitions;
- capability, budget, approval, and egress policy;
- PostgreSQL transactions and event append;
- background job coordination;
- the outbox projector;
- Neo4j query adapters;
- retrieval planning and context-packet construction;
- model-provider adapters and tool orchestration;
- agent state and posture integration;
- snapshots, research-artifact composition, and scoped export preparation;
- the web interface and streaming interaction.

Initial infrastructure boundaries should be represented by a small set of TypeScript ports:

```ts
interface EventStore {}
interface ResearchRepository {}
interface ArtifactStore {}
interface GraphProjection {}
interface GraphQuery {}
interface RetrievalStrategy {}
interface ChunkingStrategy {}
interface ModelGateway {}
interface ExecutionBackend {}
interface PolicyEngine {}
interface SnapshotStore {}
```

Interfaces belong at replaceable or permission-sensitive boundaries. Petra should not create a repository, service, and interface for every entity.

The first implementation may run API handling, job coordination, and projection in one deployable process with separately managed worker loops. They can split later if measured load or failure isolation requires it.

### Python scientific workers

Python owns bounded scientific computations that materially benefit from its ecosystem:

- document parsing and layout analysis;
- OCR and table or figure extraction;
- scientific NLP and claim-extraction experiments;
- embeddings and rerankers;
- statistical analysis and evaluation;
- ML training and inference experiments;
- sandboxed research code execution.

A Python worker receives a versioned job specification and capability context. It reads permitted artifacts through scoped adapters and returns a result manifest plus immutable artifacts. It does not write PostgreSQL or Neo4j directly.

The TypeScript application validates the returned manifest, checks the job and capability state, and commits accepted results through the normal event path. Worker failure therefore cannot partially mutate trusted research state.

## Cross-language contracts

TypeScript interfaces vanish at runtime and cannot validate Python output, stored events, or network requests. Petra therefore maintains canonical runtime schemas for:

- event envelopes and event payloads;
- commands and change-set operations;
- job specifications and result manifests;
- parsed-document blocks and source selectors;
- retrieval and embedding recipes;
- model calls and tool records;
- protocols, runs, and result records;
- snapshot manifests.

TypeScript and Python types are generated from, or mechanically checked against, these schemas. Schema versions are explicit. Persisted events are not rewritten when a schema changes; readers use version-specific validation and upcasting where required.

The specific runtime-schema library is deferred. The contract must be language-neutral and testable without relying on compile-time TypeScript types.

## Chunking and retrieval-unit constraint

Ingestion produces an immutable structural representation before it produces chunks.

```text
WorkVersion
└── Artifact
    └── ParsedDocument
        ├── title and abstract
        ├── section hierarchy
        ├── paragraphs and sentences
        ├── tables and figures
        ├── captions and footnotes
        └── references
```

A `RetrievalUnit` is a versioned derived object, not an original source and not a scientific claim. It records:

- ordered source-span references;
- parent section and document context;
- previous and next structural neighbors where applicable;
- chunking recipe and version;
- parser and parsed-document version;
- enrichment applied, such as title or section path;
- tokenization and normalization;
- embedding recipe and resulting embedding references;
- content hash.

Retrieval units may be projected into Neo4j for full-text search, vector search, and graph expansion. The exact source span remains the citation target.

Petra distinguishes:

- structural document blocks, which preserve the source;
- retrieval units, which optimize candidate search and context assembly;
- claim units, which represent propositions and evidence relations.

Several retrieval-unit recipes may coexist over one artifact. A chunking or embedding change creates a new derived projection; it does not overwrite prior units or require source re-ingestion.

The first chunking experiments should compare structural and claim-sensitive strategies under fixed corpora, queries, embeddings, and budgets. Evaluation must split at `Work` or `WorkVersion`, never at chunk level, and should measure source-span recall, contradictory-evidence recall, citation entailment, scope preservation, evidence coverage, redundancy, latency, and cost.

Parser selection, individual chunking algorithms, evaluation datasets, and success thresholds remain part of D004 and the pilot evaluation specifications.

## Deployment profiles

### Local research profile

The local profile runs PostgreSQL, Neo4j, and S3-compatible storage on the researcher's machine through one Petra-managed startup and update path. Development may use container orchestration, but the public product must not require routine manual container or database administration.

Remote adapters remain governed by D001's egress levels. Local-first describes the authority and privacy boundary, not the absence of local server processes.

### Hosted private profile

The hosted profile runs the same logical services with managed or self-hosted infrastructure. Provider selection must support:

- export and recovery;
- encryption and secret management;
- private networking where required;
- pinned or supported database versions;
- observability and capacity controls;
- the licensing needed for Petra's access and security model.

The hosted profile does not change event, assertion, artifact, outbox, or graph identities.

### Deferred public-sharing profile

Petra does not currently define wholesale project publication or a public graph profile. If a demonstrated use later requires one, it must consume a deliberately prepared representation rather than querying live private services. D002 does not select that representation in advance.

## Backup and recovery

The minimum durable backup set is:

- a consistent PostgreSQL backup at a recorded transaction position;
- all referenced content-addressed artifacts;
- the schema registry, migration state, and snapshot manifests;
- encryption and recovery metadata handled through the chosen security policy.

Neo4j backups are valuable for recovery speed but are not required to preserve scientific authority if PostgreSQL and artifacts remain intact. Petra must test projection rebuild rather than treating it as a theoretical escape hatch.

A restored workspace verifies artifact hashes, replays or reconstructs authoritative projections, rebuilds Neo4j and search indexes as needed, and compares projection checkpoints before graph-dependent work resumes.

## Consequences

### Benefits

- Hosting does not require replacing an embedded prototype database.
- Canonical literature and claims can be reused across many projects.
- Neo4j provides an actual graph engine, Cypher, visualization, graph analysis, full-text retrieval, and vector retrieval.
- PostgreSQL provides a durable foundation for events, permissions, jobs, approvals, and workflow state.
- The outbox prevents lost graph updates without attempting an unsafe cross-database transaction.
- Neo4j can be rebuilt or replaced without reconstructing scientific history from graph records.
- TypeScript provides one product and orchestration model across the API and interface.
- Python remains available where scientific tooling is strongest without becoming an uncontrolled second backend.
- Chunking and embedding strategies remain reproducible experimental variables.

### Costs and risks

- PostgreSQL, Neo4j, and object storage make local packaging and hosted operations heavier.
- Graph reads are eventually consistent with committed PostgreSQL state.
- Selected data, source text, and embeddings are intentionally duplicated in the graph projection.
- Projection failures, lag, and repair become product states that require tests and UX.
- Developers must work with both SQL and Cypher.
- Neo4j deployment, security, graph-analysis, and visualization features differ by edition and may introduce commercial costs.
- Schema and contract governance across TypeScript and Python requires discipline.
- A generic graph visualization will not satisfy Petra's scientific UX; a custom evidence-aware interface is still required.

## Alternatives considered

### SQLite with derived graph tables

Rejected as the primary architecture because hosting and the explicit native graph demonstration would require an early migration or an added graph system with SQLite-specific authority.

### Neo4j as the only database

Rejected because the graph engine would also become the sole representation of event history, application workflows, job coordination, approval state, and future product control-plane data. That coupling would make replacement or licensing changes materially harder.

### PostgreSQL with Apache AGE

Retained as the principal fallback. It could provide relational and graph operations within one ACID system and avoid projection lag. It was not selected because Petra places high value on mature graph inspection, visualization, GraphRAG tooling, and graph-analysis ergonomics. Provider support and extension operations would also need independent verification.

### Separate vector database

Deferred. Neo4j can provide the first graph-connected vector projection, while PostgreSQL with `pgvector` remains a credible fallback. A third stateful retrieval system requires benchmarked need.

### Microservices and external queues

Rejected for the initial system. PostgreSQL jobs and outbox records provide sufficient coordination until independent scaling, isolation, or delivery requirements are demonstrated.

## Validation

D002 is satisfied when Petra can:

1. commit an event, authoritative assertion, and outbox record in one PostgreSQL transaction;
2. project the change into Neo4j idempotently and record the resulting checkpoint;
3. show the same Petra and assertion identities in both stores;
4. detect and repair a missed, duplicate, stale, or out-of-order projection record;
5. delete and rebuild the Neo4j read model from authoritative state;
6. ingest one artifact through local and hosted-compatible object-store adapters without changing its identity;
7. prevent direct Neo4j or Python-worker mutation of trusted scientific state;
8. validate one job and result manifest in both TypeScript and Python;
9. build two chunking recipes over the same parsed artifact without changing the source spans;
10. compare the two retrieval-unit projections in an evaluation run;
11. retrieve candidates through Neo4j full-text or vector search and expand them through typed scientific relations;
12. inspect the resulting graph in Neo4j Browser and resolve every scientific edge to its Petra assertion record;
13. show projection lag and prevent an operation from silently using a stale required revision;
14. back up PostgreSQL and referenced artifacts, rebuild Neo4j, and recover the same active assertion revisions;
15. run the architecture locally and in a hosted test environment with the same persisted identifiers and event contracts.

## Revisit triggers

Reconsider this decision if:

- projection operations or consistency repair consume disproportionate development or operational effort;
- PostgreSQL with an in-process graph extension meets Petra's measured graph and visualization needs more simply;
- Neo4j licensing or hosting constraints conflict with Petra's deployment and integration model;
- a different graph engine provides a materially better open and portable implementation of the required queries;
- Neo4j cannot meet representative retrieval or traversal requirements after appropriate modeling and indexing;
- local packaging of the three stateful components prevents the accepted D001 experience;
- synchronous multi-user collaboration changes consistency requirements;
- vector scale or retrieval quality justifies a specialized index service.

Any replacement must preserve Petra IDs, assertion provenance, event order, artifact hashes, and snapshot reproducibility.

## References considered

- [Neo4j transactional behavior](https://neo4j.com/docs/operations-manual/current/database-internals/transaction-management/)
- [Neo4j Browser](https://neo4j.com/docs/browser/)
- [Neo4j full-text indexes](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/full-text-indexes/)
- [Neo4j vector indexes](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/)
- [Neo4j Graph Data Science editions](https://neo4j.com/docs/graph-data-science/current/introduction/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Apache AGE architecture](https://age.apache.org/overview/)

## Next decision

D003 will define scholarly discovery, source acquisition, version resolution, and licensing. It must determine which metadata and full-text services Petra may use, how works and versions are reconciled, which artifacts may be stored, and how source rights constrain private use and scoped research artifacts.
