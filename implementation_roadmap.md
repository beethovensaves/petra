# Petra Implementation Roadmap

Status: M1.2 PostgreSQL authority and artifact spine in progress
Last updated: 2026-08-29
Scope: turn Petra's accepted product and architecture decisions into tested vertical slices without reopening them as speculative platform work

Companion documents:

- [Product brief and founding design](PETRA.md)
- [Logical graph and event model](PETRA_GRAPH_MODEL.md)
- [Decision and milestone roadmap](ROADMAP.md)
- [Design implementation roadmap](design_implementation_roadmap.md)
- [Accepted decisions](decisions/)

## Outcome

Petra's next work is the M1 evidence spine. The first useful build will ingest one legitimate scholarly paper, preserve its bytes and structure, propose one source-grounded Claim, promote one reviewed Assertion, project it into Neo4j, answer one bounded question from a named snapshot through the production AG-UI interaction path, and produce one DraftArtifact with provenance and a canonical citation.

The first build is complete only when a researcher can see and reverse the path:

```text
Project
  → Work and WorkVersion
  → immutable Artifact
  → ParsedDocument and SourceSpan
  → quarantined Claim proposal
  → reviewed ChangeSet and trusted Assertion
  → Neo4j graph edge
  → EvidencePacket and grounded response
  → PetraInteractionRun and AG-UI stream
  → DraftArtifact, ProvenanceMap, and CitationBundle
```

This roadmap uses gates rather than speculative dates. Later stages remain deliberately less detailed until M1 exposes their real constraints.

## Work numbering and status

Petra implementation work uses stable identifiers so a roadmap item can be discussed, implemented, tested, and referenced in the graph without depending on its position on the page.

| Form | Meaning | Example |
| --- | --- | --- |
| `M1.4` | Milestone 1, implementation slice 4 | Lawful full-text fixture and Docling worker |
| `M1.4-W10` | Required work item within the slice | Emit a validated worker manifest |
| `M1.4-AC02` | Acceptance criterion for the slice | Resolve a SourceSpan to its Artifact page |
| `M1.0-DEC02` | Decision required within the slice | Select the local service runner |
| `M1.0-COST03` | Cost or licensing guardrail | Do not require paid Docker cloud services |
| `M1.1-CS03` | Cross-boundary contract requirement | Validate controlled vocabularies |
| `M1.1-B05` | In-memory domain behavior or invariant | Promote only through a ChangeSet |
| `M1.4-SS02` | SourceSpan selector requirement | Record page and bounding box |
| `M1-D04` | Explicit M1 deferral | Universal confidence score |
| `P02` | Implementation principle | Keep PostgreSQL authoritative |
| `M1.9-DEMO-07` | Step in the M1 acceptance demonstration | Promote a reviewed Assertion |
| `M1.9-T05` | Required M1 test group | Neo4j projection replay |
| `EV05` | Required completion-evidence class | Artifact and snapshot manifests |
| `CC03` | Documentation change-control route | Update build order here |
| `DISC-01` | Ordered implementation discussion | Select the local service runner |

Identifiers are never reused. If the build order changes, the ID remains stable. If work is removed or replaced, retain the item and mark it `superseded` with its replacement.

Allowed roadmap statuses are:

- `planned`: specified but not started;
- `in_progress`: active work exists;
- `blocked`: a named external condition prevents progress;
- `complete`: every acceptance criterion has recorded evidence;
- `deferred`: intentionally outside the active gate;
- `superseded`: replaced by an identified item.

Completion is evidence-based. “Code exists” is not a completion status unless the slice's acceptance criteria pass.

## M1 at a glance

| ID | Status | What Petra builds | Why Petra needs it now | Depends on | Completion evidence |
| --- | --- | --- | --- | --- | --- |
| `M1.0` | `complete` | Dedicated repository, reproducible developer runtime, Hono/React shell, and AG-UI interaction scaffold | Every later result needs a controlled source, toolchain, local service boundary, and production interaction contract | Accepted D001–D016 | Clean bootstrap, health checks, cross-language contract smoke test, Hono and AG-UI conformance fixtures |
| `M1.1` | `in_progress` | Shared runtime and interaction contracts with an in-memory domain kernel | TypeScript, Python, events, jobs, and adapters must agree on identity and authority before persistence | `M1.0` | Cross-language fixtures, stable hashes, invariant and AG-UI mapping tests |
| `M1.2` | `in_progress` | PostgreSQL authority, interaction trace, and S3-compatible artifact spine | Petra cannot trust or replay evidence or reconnect interactions without transactional history and immutable bytes | `M1.1` | Repository conformance, domain and interaction replay, artifact verification |
| `M1.3` | `planned` | Paper Trail regression baseline and Neo4j projection | Petra must demonstrate a real graph while keeping citation and scientific evidence distinct | `M1.2` | Projection replay, assertion trace, baseline retrieval tests |
| `M1.4` | `planned` | Lawful full-text fixture, Docling worker, and stable SourceSpans | Claims need inspectable source locations rather than metadata or model recollection | `M1.1`, `M1.2` | Reproducible parse, page-level inspection, worker isolation tests |
| `M1.5` | `planned` | Claim proposal, direct and AG-UI-mediated review, ChangeSet, and trusted graph path | Petra's core promise depends on visible promotion and reversible scientific state through one command path | `M1.3`, `M1.4` | Supported promotion, interrupt review, unsupported rejection, correction, reversal |
| `M1.6` | `planned` | Bounded retrieval, ContextPacket, EvidencePacket, and streamed grounded response | The first LLM answer must be graph-guided, scoped, traceable, and carried by the production interaction protocol | `M1.5` | Provenance fast path, validated model response, AG-UI trace, invalidation |
| `M1.7` | `planned` | Research Brief, evidence view, focused graph, inspector, and Petra interaction client | Researchers need to understand and correct Petra without reading logs, raw tables, or protocol events | `M1.5`, `M1.6` | Cross-view identity, review flow, reconnect, honest async states |
| `M1.8` | `planned` | DraftArtifact, ProvenanceMap, citations, BibTeX, and LaTeX | Petra must turn evidence into usable scientific writing without losing origin or force | `M1.6`, `M1.7` | Span support, renderer parity, edit and Felicity revalidation |
| `M1.9` | `planned` | Clean-start acceptance run, replay, recovery, and M1 closure | The parts count only when the complete evidence path survives failure and rebuild | `M1.0`–`M1.8` | Scripted demonstration and all required test groups |

## Later milestones at a glance

| ID | Status | What Petra builds | Why it follows M1 | Entry gate |
| --- | --- | --- | --- | --- |
| `M2` | `planned` | Reusable literature research loop | Scale source discovery and retrieval only after one evidence path is trustworthy | `M1.9` complete |
| `M3` | `planned` | Hypotheses, posture, obligations, and governed agency | Agent behavior needs stable evidence and correction semantics beneath it | M2 representative corpus and review data |
| `M4` | `planned` | Reproducible experiment loop and sandbox execution | Experimental evidence requires established authority, policy, and artifact identity | M3 grants and posture controls exercised |
| `M5` | `planned` | Two scientific pilot evaluations | Petra needs realistic evidence about its own retrieval, reasoning, UX, and cost | M2–M4 pilot paths operational |
| `M6` | `planned` | Private-beta hardening and demonstrated external integrations | API or MCP commitments should follow observed workflows and stable commands | M5 findings reviewed |

## Repository audit

### Current Petra state

The `/petra` directory contains product, graph, roadmap, and D001–D016 decision documents; an npm workspace; a Python `uv` worker project; canonical schema fixtures; digest-pinned Compose services; the selected Flyway command profile; executable TypeScript, Python, migration, and real-service integration tests; and the Hono/React/AG-UI application shell. The authoritative event-store migrations remain unimplemented until the M1.1 contracts define the records they must preserve.

The current development environment exposes:

- Node.js 24.20.0 and npm 11.19.0;
- Python 3.13.7 and `uv` 0.12.5;
- no detected `pnpm` command;
- Docker Desktop with Docker 29.7.2 and Compose 5.4.0;
- no detected Neo4j command or Java runtime.

These observations describe the current machine, not Petra's supported-runtime policy. Bootstrap work must pin supported versions rather than relying on whichever versions happen to be installed.

### Source-control boundary

The source-control boundary is resolved. `/Users/felipe.casadei/vscode/graphRAG/petra` is a dedicated Git repository on branch `main`. A Petra-specific `.gitignore` excludes dependencies, build products, Python environments, secrets, runtime state, service volumes, and logs. No initial commit has been created.

The parent repository rooted at `/Users/felipe.casadei/vscode` still contains unrelated modified, deleted, and untracked files. Petra commands must run with `/petra` as their repository root and must not stage, commit, reset, clean, or otherwise mutate the parent worktree.

Paper Trail fixtures needed by Petra will be copied or transformed with their provenance. Petra will not acquire a runtime dependency on `/course` or other files outside its repository.

### Paper Trail baseline

`/course/labs` provides a small Python 3.10+ teaching baseline:

- a pinned 50-work OpenAlex metadata and abstract snapshot;
- a content hash and source manifest;
- BM25 over weighted title and abstract terms;
- directed citation neighbors and bounded paths;
- provenance-bearing JSON run records;
- explicit limitations and chronology quality flags;
- seven passing standard-library unit tests.

Paper Trail is useful as:

- a frozen metadata fixture;
- a lexical and citation-traversal regression oracle;
- an example of honest run records and limitation language;
- an abstract-only test case.

It is not Petra's production foundation. It has no full-text artifacts, stable SourceSpans, event ledger, review path, PostgreSQL authority, Neo4j projection, model gateway, application boundary, or research UI. Petra should preserve its useful fixtures and behavioral tests without importing the teaching module as a runtime dependency.

## Implementation principles

Every slice follows these rules:

| ID | Principle | Architectural consequence |
| --- | --- | --- |
| `P01` | Vertical before broad. | Finish one inspectable path through storage, policy, graph, and interface before adding another subsystem. |
| `P02` | PostgreSQL is authoritative. | Neo4j, search indexes, interface projections, and caches remain rebuildable. |
| `P03` | Artifacts are immutable. | Changed bytes create a new content identity. |
| `P04` | Proposals are not trusted state. | Models and workers return manifests and proposals; the TypeScript control plane validates and commits them. |
| `P05` | Runtime schemas cross boundaries. | TypeScript, Python, stored events, jobs, and HTTP payloads cannot rely on compile-time types alone. |
| `P06` | One command path. | The interface, developer tooling, internal HTTP routes, and future API or MCP adapters invoke the same application commands and queries. |
| `P07` | Fixtures precede live providers. | Deterministic fixtures establish schemas and failure behavior before a model or remote source adds variability. |
| `P08` | Abstract-only stays abstract-only. | The OpenAlex fixture may support broad source-reported statements, not detailed method or validity Claims. |
| `P09` | Felicity is tested at the output boundary. | Clear prose cannot change scientific force, origin, scope, or citation meaning. |
| `P10` | No silent partial success. | A failed worker, projection, model call, or renderer has an explicit terminal state and cannot partially mutate trusted state. |
| `P11` | AG-UI is native at the interaction boundary and absent from the domain core. | Petra uses the official SDK for streaming and interaction while its own commands, state, capabilities, and scientific objects remain authoritative. |
| `P12` | Hono is a replaceable HTTP adapter. | Hono hosts Node routes and streams; Petra core, schemas, commands, queries, and AG-UI profile remain portable to the recorded Fastify fallback. |

## Initial repository shape

Start with one JavaScript workspace and one Python worker project. Avoid a package per domain entity.

```text
petra/
├── apps/
│   └── workbench/          # Hono/Node host, React/Vite client, Petra-wrapped AG-UI boundary
├── packages/
│   ├── contracts/          # canonical runtime schemas and generated bindings
│   ├── core/               # commands, queries, invariants, events, application services
│   └── adapters/           # PostgreSQL, Neo4j, artifacts, models, retrieval, renderers
├── workers/
│   └── science/            # Python/uv worker, Docling, later statistics and ML
├── infra/
│   └── dev/                # local service definitions and health checks
├── fixtures/
│   ├── paper-trail/        # copied or transformed fixture data with provenance
│   └── m1-paper/           # lawful full-text fixture or acquisition recipe
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── projection/
│   └── acceptance/
├── decisions/
├── PETRA.md
├── PETRA_GRAPH_MODEL.md
├── ROADMAP.md
├── design_implementation_roadmap.md
└── implementation_roadmap.md
```

`apps/server`, `apps/workbench`, and the packages deploy as one TypeScript modular monolith. Package boundaries organize code and enforce dependency direction; they do not imply separately deployed services.

The initial dependency direction is:

```text
contracts
    ↑
core
    ↑
adapters
    ↑
server, workbench, and worker entry points
```

`core` does not import a database, web framework, model SDK, AG-UI SDK, graph driver, or Docling. Adapters implement ports owned by the application boundary.

## M1.0 — repository and developer runtime

- **Status:** `complete`
- **Builds:** a dedicated Petra repository, pinned toolchains, local service orchestration, a Hono/React workbench shell, an AG-UI interaction scaffold, and one documented developer command surface.
- **Why:** every later artifact, event, parse, graph projection, model trace, and interaction depends on a reproducible environment and an isolated source-control boundary.
- **Depends on:** D001–D016; no implementation slice.

### Work

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.0-W01` | `complete` | Make `/petra` a dedicated Git repository on `main`. | Petra work must be isolated from the unrelated parent worktree. |
| `M1.0-W02` | `complete` | Add Petra-owned ignore rules for dependencies, generated output, secrets, runtime state, service volumes, and logs. | Local development must not leak credentials or accidentally version disposable state. |
| `M1.0-W03` | `complete` | Create the JavaScript workspace and pin a supported Node LTS and npm version. | The TypeScript control plane and workbench need a reproducible toolchain. |
| `M1.0-W04` | `complete` | Create the Python `uv` project and pin a Docling-supported Python version. | Scientific workers need an isolated, reproducible dependency environment. |
| `M1.0-W05` | `complete` | Configure Docker Desktop as the M1 reference runner and provide a Petra-owned Compose service definition for PostgreSQL, Neo4j, and S3-compatible storage. | The evidence spine needs all three persistence roles without requiring ad hoc machine setup or binding Petra to a runner-specific feature. |
| `M1.0-W06` | `complete` | Provide Petra-owned startup, health-check, migration, test, and shutdown commands. | Developers need one observable lifecycle for the whole local system. |
| `M1.0-W07` | `complete` | Add environment templates containing variable names and safe examples, never credentials. | Configuration must be discoverable without making secrets part of the repository. |
| `M1.0-W08` | `complete` | Add a root README with exact bootstrap, verification, failure-diagnosis, and recovery commands. | A new checkout must be operable without undocumented context. |
| `M1.0-W09` | `complete` | Establish formatting, linting, type checking, unit testing, Draft 2020-12 schema validation, deterministic TypeScript generation, Python boundary validation, and shared contract-fixture commands. | Every later slice needs one reproducible quality gate and one language-neutral contract path. |
| `M1.0-W10` | `complete` | Pin the official AG-UI SDK packages and pass one run-input-to-event-stream fixture through Petra-owned client and server adapters. | The first workbench code must use the production interaction contract rather than a disposable stream. |
| `M1.0-W11` | `complete` | Scaffold Hono on the pinned Node runtime with health, diagnostics, command, query, interaction, replay, and WorkUnit-cancellation route groups. | Petra needs one explicit HTTP host whose route handlers remain outside the application core. |
| `M1.0-W12` | `complete` | Scaffold a React/Vite SPA using React Router Data Mode and a documented development proxy to Hono. | The object-centered workbench needs addressable routes and a fast local client loop without adopting a full-stack framework. |
| `M1.0-W13` | `complete` | Build the React client and serve its assets and SPA fallback from Hono in one production Node process. | M1 needs one reproducible deployable unit rather than a development-only topology. |
| `M1.0-W14` | `complete` | Execute and record `D014-HC01`–`D014-HC10`; activate Fastify only through a failed criterion and passing replacement fixture. | Framework selection must follow Petra's AG-UI, authority, recovery, and operational requirements rather than familiarity. |
| `M1.0-W15` | `complete` | Execute and record the `DISC-04` migration-runner and integration-harness comparison before accepting `M1.0-DEC05`. | Flyway OSS and direct Compose earned selection through Petra's persistence and recovery cases rather than tool preference. |
| `M1.0-W16` | `complete` | Apply the supplied Petra inspiration kit as the workbench's tokenized visual system, implement a provisional rock-first faceted mark, and compose the initial shell as synchronized graph, evidence, and assistant views without treating the supplied inspiration SVG as a final production logo. | Early scientific UX work needs a stable semantic palette, typography hierarchy, recognizable identity, and truthful product composition without prematurely freezing the final mark or depicting unfinished capabilities as real. |

### Choices to resolve at kickoff

| ID | Status | Decision | Why it matters |
| --- | --- | --- | --- |
| `M1.0-DEC01` | `complete` | Use `/petra` as a dedicated repository. | It fixes Petra's ownership and source-control boundary. |
| `M1.0-DEC02` | `complete` | Use the Compose Specification as Petra's development-service contract and Docker Desktop as the M1 reference runner. | Docker Desktop provides the conventional macOS Compose path while the portable repository contract prevents architectural coupling to the desktop product. |
| `M1.0-DEC03` | `complete` | Use Hono on Node with React/Vite and React Router Data Mode; use Fastify only after a recorded Hono conformance failure. | It gives AG-UI a Web Standard stream host while keeping the HTTP framework outside Petra core. |
| `M1.0-DEC04` | `complete` | Use repository-owned JSON Schema Draft 2020-12 as canonical; validate with Ajv 2020 and Python `Draft202012Validator`; generate TypeScript declarations with pinned `json-schema-to-typescript`; keep Pydantic downstream of canonical validation. | It prevents TypeScript and Python contracts from drifting without making either runtime the authority. |
| `M1.0-DEC05` | `complete` | Use forward-only plain PostgreSQL migrations with pinned Flyway OSS; keep migrations separate from API startup; use Vitest and pytest with a Petra-owned disposable Compose harness; defer Testcontainers. | `DISC-04-T01`–`DISC-04-T10` passed for Flyway and direct Compose; `node-pg-migrate` failed changed-history detection and the plain-SQL non-transactional case. D016 records the boundary and recovery rules. |
| `M1.0-DEC06` | `complete` | Use the official AG-UI SDK from M1 behind Petra-owned adapters; do not adopt CopilotKit initially or expose protocol types to the domain core. | It fixes the production interaction boundary while preserving Petra's UX, state, and authority model. |

### Docker cost and licensing guardrails

| ID | Status | Guardrail | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.0-COST01` | `complete` | Record Docker Desktop as a zero-cost M1 dependency under Petra's current individual-use context. | The implementation plan should distinguish an actual project cost from a possible future licensing trigger. |
| `M1.0-COST02` | `planned` | Recheck Docker Desktop eligibility before Petra is used by a government entity, an organization at or above Docker's free-use thresholds, or another context outside the then-current free terms. | Licensing depends on the user's context and may change over time. |
| `M1.0-COST03` | `complete` | Require no paid Docker cloud, build, test, security, support, or registry feature in M1. | Local scientific work must not acquire an unnecessary metered dependency. |
| `M1.0-COST04` | `complete` | Pin and cache public service images and authenticate registry pulls only when needed. | Normal bootstrap should remain within free registry limits and reproducible if a tag changes. |
| `M1.0-COST05` | `planned` | Keep Docker Desktop a developer-runtime prerequisite, not Petra's promised public end-user installation model. | Future researchers should not become container administrators or inherit an avoidable third-party desktop license requirement. |
| `M1.0-COST06` | `complete` | Record Hono as an MIT-licensed dependency with no required paid Hono service or separate production process. | The server choice should not create a framework subscription or vendor-hosting commitment. |
| `M1.0-COST07` | `complete` | Record installed licenses and versions for Hono, its Node adapter, React, Vite, React Router, AG-UI, and their direct production dependencies. | Public or commercial distribution needs a reproducible dependency and notice inventory. |

Completion evidence for `M1.0-W10`–`M1.0-W14`, including fixture limits, measured stream and bundle overhead, and the installed dependency inventory, is recorded in [M1.0 AG-UI and Hono conformance](reports/M1.0-AGUI-HONO-CONFORMANCE.md). Fastify was not activated because the executable fixture found no Hono-specific failure.

Docker subscription prices, eligibility thresholds, registry allowances, and product names are external facts rather than permanent Petra constants. Verify their current official terms whenever `M1.0-COST02` is triggered; do not encode prices or eligibility thresholds into application behavior.

The recommendation is to use npm workspaces initially because npm is already available and Petra does not yet need another package-manager dependency. Pin the toolchain; do not treat the currently installed Node version as the target merely because it is present.

For the web boundary, D014 selects Hono through `@hono/node-server`, a React/Vite SPA, and React Router Data Mode. Development uses a Vite proxy; production serves the built workbench and Petra routes from one Hono Node process. Domain behavior must not live in Hono handlers, router loaders, AG-UI state, or client state. Hono RPC, Hono JSX, SSR, and edge deployment remain outside M1.

### M1.0 bootstrap evidence

| ID | Status | Observed implementation evidence | Consequence |
| --- | --- | --- | --- |
| `M1.0-EV01` | `pass` | The npm workspace pins Node 24.20.0 LTS and npm 11.19.0; `package-lock.json` records exact installed dependencies for `contracts`, `core`, and `adapters`. | `M1.0-W03` is complete and the pinned Node/npm pair is active on the development machine. |
| `M1.0-EV02` | `pass` | The `workers/science` uv project pins Python 3.13.7, has a committed lockfile, and installs a strict Pydantic boundary downstream of canonical validation. | `M1.0-W04` is complete without installing Docling before the ingestion slice needs it. |
| `M1.0-EV03` | `pass` | `npm run verify` regenerates declarations, passes Prettier, ESLint, Ruff, TypeScript, mypy, four Vitest assertions, and two pytest assertions. Ajv 2020 and `Draft202012Validator` agree on accepted and rejected fixtures and produce the same RFC 8785 bytes and SHA-256 hash. | The first D015 cross-runtime contract path and `M1.0-W09` are executable rather than documentary. |
| `M1.0-EV04` | `pass` | Docker Compose starts loopback-bound PostgreSQL 18.6, Neo4j Community 2026.07.1, and SeaweedFS 4.41 from tag-and-manifest-digest-pinned images; all three report healthy on Apple silicon. | `M1.0-W05`, `M1.0-COST04`, and the service-health portion of `M1.0-AC03` are complete for the M1 development profile. |
| `M1.0-EV05` | `pass` | The prerequisite command observes Node 24.20.0, npm 11.19.0, Python 3.13.7, uv 0.12.5, Docker 29.7.2, and Compose 5.4.0. | The selected M1 toolchain is active on the development machine; a clean-checkout bootstrap still remains for `M1.0-AC01`. |
| `M1.0-EV06` | `pass` | Startup, wait-for-health, status, Flyway migration information/validation/application, unit tests, real-service integration tests, logs, shutdown, and destructive-reset commands exist. Migration remains a separate command and the production migration directory intentionally stays empty until M1.2. | `M1.0-W06` is complete without letting API startup acquire schema authority. |
| `M1.0-EV07` | `pass` | Native probes return PostgreSQL database and server identity, a Neo4j Cypher result, and the pre-created `petra-artifacts` S3 bucket. Neo4j usage reporting, Fleet Manager, fleet discovery, and X-Forward processing are disabled in the private local profile. | Compose health is corroborated through each service's own interface, and the local graph engine does not broadcast discovery or send usage reports. |
| `M1.0-EV08` | `pass` | The frozen `DISC-04` comparison applied identical evidence-spine SQL through Flyway 13.4.0 and `node-pg-migrate` 9.0.0. Flyway passed history mutation, concurrency, rollback, literal process interruption, non-transactional recovery, and schema-equivalence cases. The three-service Compose harness passed Vitest and pytest and left zero labeled resources after both success and controlled failure. | D016 accepts Flyway OSS and direct Compose, rejects `node-pg-migrate` as the M1 default, and leaves Testcontainers inactive. |
| `M1.0-EV09` | `pass` | The built workbench was compared with the supplied design reference at 1440×1000 and at Chrome's 500×844 minimum headless viewport. The final shell exposes the three-view composition, uses semantic graph state rather than decorative color, labels preview data and the model-free transport demo, moves navigation to a compact responsive rail, and reports no document-level horizontal overflow at the narrow viewport. | `M1.0-W16` is a tested product-layout baseline rather than a palette applied to the earlier generic intake page. |

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.0-AC01` | A new checkout under the chosen source-control boundary runs one documented bootstrap command. |
| `M1.0-AC02` | TypeScript and Python hello-world contract tests pass. |
| `M1.0-AC03` | Local services report healthy, or bootstrap reports the exact unmet prerequisite and recovery action. |
| `M1.0-AC04` | Repository inspection finds no secret, generated data directory, database volume, unlawfully redistributed PDF, or staged parent-repository file. |
| `M1.0-AC05` | The official AG-UI client completes one deterministic streamed run through Petra adapters, and the core package imports no AG-UI type. |
| `M1.0-AC06` | `D014-HC01`–`D014-HC10` pass on Hono, or one failed criterion and the same passing Fastify fixture activate the documented fallback. |
| `M1.0-AC07` | The development topology runs Vite with a documented proxy to Hono, and the production topology serves the built workbench and Petra routes from one Node process. |
| `M1.0-AC08` | Hono, React Router, Vite, and AG-UI types remain absent from Petra core, Python workers, scientific records, and canonical command/query contracts. |
| `M1.0-AC09` | One accepted and one rejected Draft 2020-12 smoke fixture produce the same result in Ajv and Python, TypeScript declarations regenerate without a diff, and one canonical fixture produces identical RFC 8785 bytes and SHA-256 hash in both runtimes. |
| `M1.0-AC10` | The `DISC-04` evidence record selects a migration runner and integration harness only after every required gate passes, or leaves `M1.0-DEC05` open with the failed gate and next candidate named. |

## M1.1 — machine-readable contract kernel

- **Status:** `complete`
- **Builds:** the shared runtime schemas and smallest in-memory domain that define Petra identity, provenance, authority boundaries, and revision history.
- **Why:** cross-language and persisted work cannot be trusted if TypeScript, Python, events, and jobs assign different meanings to the same object.
- **Depends on:** `M1.0`.

### Objects

Implement only the schemas required to describe the first evidence path:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.1-W01` | `complete` | Define `PetraId`, revision, content hash, timestamp, actor, project scope, and evidence namespace. | Every object and event needs stable identity, ownership, and temporal context. |
| `M1.1-W02` | `complete` | Define `Project`. | All evidence and work must remain explicitly scoped. |
| `M1.1-W03` | `complete` | Define `Work`, `WorkVersion`, `ExternalIdentifier`, and `Author`. | Scholarly identity must distinguish a conceptual work from the exact version used. |
| `M1.1-W04` | `complete` | Define `Artifact`, `ArtifactManifest`, and `RightsDecision`. | Stored bytes need content identity, acquisition provenance, and lawful-use state. |
| `M1.1-W05` | `complete` | Define `ParsedDocument`, `StructuralBlock`, and `SourceSpan`. | Scientific Claims must resolve to inspectable locations in immutable source material. |
| `M1.1-W06` | `complete` | Define scoped `Claim` basis and provenance-bearing typed `Assertion`, then enforce quarantine-only proposal, exact source grounding, abstract-only limits, and scientific-relation provenance in memory. | Petra must separate proposed scientific meaning from reviewed trusted relations. |
| `M1.1-W07` | `complete` | Define content-bound `ChangeSet`, exact human `Approval`, and adapter-neutral command envelopes, then implement authorized, idempotent, optimistic, atomic Claim-plus-Assertion promotion. | Trusted state may change only through visible, reviewable, idempotent intent. |
| `M1.1-W08` | `complete` | Define immutable, command-correlated Project domain events and self-contained, target-ordered outbox records, then emit them atomically from the in-memory ChangeSet path without mutating projections. | PostgreSQL changes must be replayable into graph and interface projections. |
| `M1.1-W09` | `complete` | Define revisioned `WorkUnit`, immutable content-bound worker input, and immutable worker output manifests, then enforce the initial requested-to-terminal lifecycle, exact retry, dependency, resource, egress, output-slot, and validation boundaries in memory. | Python and future sandboxed work must be bounded, inspectable, and unable to self-authorize. |
| `M1.1-W10` | `complete` | Define immutable per-attempt graph-projection receipts and PostgreSQL-authoritative, revisioned checkpoints, then enforce exact outbox linkage, contiguous attempts and target sequences, commit-before-advance, visible failure and repair state, exact replay, projection identity, effect hashes, and event-embedded object revisions in memory. | Neo4j freshness, replay position, failed delivery, and repair must be visible without allowing the graph projection to become scientific authority. |
| `M1.1-W11` | `complete` | Define immutable, snapshot- and recipe-bound `ContextPacket` manifests over exact record revisions and hashes plus composition-specific `EvidencePacket` selections, then enforce visible selection order, source depth and SourceSpan closure, authority labels, token/object budgets, omissions, dependencies, exhaustive inclusion/exclusion, evidence bearing, contrary/qualifying coverage, and freshness in memory. | Model context must be a named, bounded, reproducible data structure rather than hidden prompt assembly, and composition must not silently add evidence outside it. |
| `M1.1-W12` | `complete` | Define immutable, revisioned `DraftArtifact`, Unicode-code-point `DraftSpan`, exhaustive `ProvenanceMap`, and renderer-independent `CitationBundle` records, then enforce exact EvidencePacket and snapshot binding, production origin, Felicity controls, span replay, visible unsupported and stale states, canonical scholarly identity, source-access limits, and additive researcher revisions in memory. | Scientific prose needs inspectable span-level support, explicit inference and edit origin, and exact bibliographic identity without allowing a model or renderer to invent evidence. |

### Contract authority

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.1-W13` | `complete` | Implement D015's repository-owned Draft 2020-12 schema registry, reusable strict Ajv and Python validators, local-reference and registered-format profile audit, deterministic checked-in TypeScript declarations with a generation-diff gate, shared accepted and rejected fixtures, RFC 8785 hash fixtures, finite-number enforcement, strict Pydantic revalidation, immutable accepted-schema identities, and an explicit unsupported-version transition fixture. | TypeScript and Python need one portable contract authority and executable proof that they interpret it equally, fail closed on unregistered meaning, and cannot silently drift after generation. |
| `M1.1-W14` | `complete` | Define `PetraInteractionRun`, `InteractionFeatureManifest`, custom-event payload, immutable event-record, interrupt linkage, protocol correlation, and replay-record schemas through the same D015 contract path; enforce their cross-record invariants in memory and map the registered profile at the AG-UI adapter boundary. | Interaction records need Petra-owned meaning without importing AG-UI protocol types into `core` or allowing interface state, replay, reconnect, or interrupts to become authority paths. |

### Incremental evidence

| ID | Status | Observed implementation evidence | Consequence |
| --- | --- | --- | --- |
| `M1.1-EV01` | `pass` | The accepted registry now pins immutable canonical identities for the common definitions, Actor, Project, Author, Work, WorkVersion, ExternalIdentifier, Artifact, ArtifactManifest, RightsDecision, ParsedDocument, StructuralBlock, and SourceSpan schemas; registry-driven generation fails if an accepted schema changes under the same identity. | `M1.1-W01`–`M1.1-W05` and the schema-immutability part of `M1.1-W13` have executable evidence. |
| `M1.1-EV02` | `pass` | Ajv 2020 passes 202 shared registry, accepted, rejected, non-mutation, primitive, semantic-ID, discriminated-union, publication-date, artifact-integrity, explicit-rights, parsed-structure, selector, Claim, Assertion, ChangeSet, Approval, command, event, outbox, WorkUnit, worker-manifest, graph-projection, checkpoint, ContextPacket, EvidencePacket, DraftArtifact, DraftSpan, ProvenanceMap, CitationBundle, interaction feature, custom event, run, event record, interrupt, replay, authority-state, and RFC 8785 assertions; Python passes the same contract corpus in ten parity test functions through `Draft202012Validator` and strict frozen Pydantic models. | The foundation, scholarly identity, source-copy, parsed-evidence, scientific-authority, command, delivery, bounded-work, projection-observability, model-context, scientific-composition, and interaction records have one cross-language runtime meaning rather than parallel handwritten acceptance rules. |
| `M1.1-EV03` | `pass` | Six core tests construct and parse kind-prefixed ULIDs and reject malformed, ambiguous, normalized, or kind-mismatched identities with typed errors. | `M1.1-B01` is complete in memory before persistence assigns any identity. |
| `M1.1-EV04` | `pass` | `npm run verify` regenerates declarations and passes formatting, linting, TypeScript, mypy, the branded workbench production build, contract tests, core tests, Hono/AG-UI conformance, and Python tests. | The first M1.1 increment preserves the full M1.0 quality gate. |
| `M1.1-EV05` | `pass` | Work remains distinct from WorkVersion; external aliases bind through a closed discriminated subject to exactly one Work, WorkVersion, or Author; partial publication dates preserve year, month, or day precision; invalid calendar dates, ambiguous subjects, wrong ID kinds, empty authorship, and unknown identifier namespaces fail in both runtimes. | `M1.1-W03` preserves scholarly identity and metadata uncertainty before Petra connects a discovery provider or ingests an artifact. |
| `M1.1-EV06` | `pass` | Artifact contains exact byte identity only; ArtifactManifest preserves a closed acquired, user-supplied, or generated origin plus verified content-addressed storage and integrity; RightsDecision binds one exact manifest and exposes every permitted operation as an explicit boolean. Mutable Artifact revisions, ambiguous origins, failed integrity, incomplete permissions, wrong ID kinds, and non-portable values fail in both runtimes. | `M1.1-W04` prevents content deduplication from collapsing acquisition provenance or copy-specific rights. |
| `M1.1-EV07` | `pass` | Eleven in-memory Artifact registry assertions verify SHA-256 and byte size, manifest/content and bidirectional rights linkage, exact acquired source, storage permission, immutable snapshots, reused IDs, and atomic failure. A second source manifest with different rights attaches to the same Artifact without duplicating its content identity. | `M1.1-B02` is complete in memory and already supports the many-sources-to-one-content shape required by a growing research library. |
| `M1.1-EV08` | `pass` | ParsedDocument pins its source and parser-output Artifacts, WorkVersion, parser run, configuration, normalization, page ledger, block order, quality, and diagnostics. StructuralBlock preserves closed content variants, hierarchy, reading order, page geometry, content hash, and declared SourceSpans. SourceSpan preserves six closed selector variants, exact source hash, parser alignment, Unicode code-point offsets, geometry, extraction, and verification. Duplicate blocks, ambiguous content or selectors, invalid polygons, wrong ID kinds, and underspecified compound selectors fail in both runtimes. | `M1.1-W05` establishes inspectable parsed evidence without making Docling's provider schema or a chunk string authoritative. |
| `M1.1-EV09` | `pass` | Nineteen document-registry assertions verify source and parser-output registration, immutable parse/block/span snapshots, page identity, declared reading order, text hashes, exact Artifact and parser linkage, source-span declaration, normalization identity, exact quote hashes and context, Unicode code-point slicing, page coordinate identity, in-bounds geometry, and atomic failure. | `M1.1-B03` is complete in memory: every accepted SourceSpan resolves through one exact parse and block to one registered immutable Artifact. |
| `M1.1-EV10` | `pass` | Claim contracts encode one closed source, synthesis, or researcher basis; ten explicitly reported-or-unreported scope dimensions; source stance, attribution, modality, negation, uncertainty, derivation, validators, source processing depth, and structured authority. Assertion contracts encode typed objects, the controlled predicate registry, exact provenance variants, scope comparison, valid time, and a trusted authority that cannot exist without a named ChangeSet and human or policy Approval basis. | `M1.1-W06` gives scientific meaning, missing scope, epistemic origin, and representation authority portable machine-readable forms without reducing trust to a boolean or truth score. |
| `M1.1-EV11` | `pass` | Eighteen evidence-registry assertions accept immutable quarantine proposals and reject direct trusted insertion, incomplete or contradictory scope accounting, missing or unresolved spans, WorkVersion mismatch, failed validators, basis/normalization mismatch, unsupported synthesis dependencies, abstract-only overreach, invalid `ASSERTS` endpoints or spans, and scientific relations lacking scope comparison or exact source/experimental provenance. | `M1.1-B04` is complete in memory, and its guarded quarantine boundary now feeds the separate reviewed ChangeSet path implemented by `M1.1-W07`. |
| `M1.1-EV12` | `pass` | ChangeSet contracts bind Project, origin, proposer, reason, ordered typed operations, base revisions, explicit before/after authority, impact, and `R2` risk in an RFC 8785 content hash. Approval binds a human decision to the exact ChangeSet ID, revision, and hash. Submit, review, and apply commands share one closed envelope with command, idempotency, actor, Project, capability, correlation, causation, and time context. | `M1.1-W07` gives direct, conversational, and future external adapters one portable intent boundary without giving any adapter or model authority to promote evidence. |
| `M1.1-EV13` | `pass` | Eighteen change-control assertions execute successful Claim-plus-`ASSERTS` promotion and preserve quarantine revisions; verify the authorization request; return one result for an identical retry; reject rebound idempotency keys and command IDs, absent authorization, changed content, wrong risk, incomplete operation pairs, inaccurate impact, stale before-state, proposer mismatch, imprecise or non-human Approval, rejection, unsatisfied conditions, duplicate application, and a stale competing ChangeSet without partial revision. | `M1.1-B05`, `M1.1-B07`, and `M1.1-B08` are complete in memory for the initial human-review path; automated ReviewPolicy application and additive reversal remain explicit later increments. |
| `M1.1-EV14` | `pass` | Domain-event contracts define submitted, approval-recorded, applied, and conflicted facts in one closed Project stream; outbox contracts embed the exact event once per named projection target with global position, target sequence, partition, and deduplication key. Five accepted and four rejected fixtures pass identically through Ajv and strict frozen Pydantic models, including discriminator, conflict-target cardinality, causation-kind, and target rejection. | `M1.1-W08` gives PostgreSQL persistence and later Neo4j/interface projectors a language-neutral replay boundary without importing a transport or projection SDK into authority. |
| `M1.1-EV15` | `pass` | Nine in-memory event/outbox assertions verify global and per-Project order, independent target sequences, exact trusted snapshots, immutable reads, self-contained delivery, successful-retry deduplication, no false application event after rejection, one durable event for a replayed stale conflict, zero records after authorization failure, generated-ID validation, and complete authority/event/outbox rollback after an injected append failure. | `M1.1-B09` is complete in memory: commands produce replayable facts and delivery intent atomically, while Neo4j and interface projections remain downstream consumers only. |
| `M1.1-EV16` | `pass` | WorkUnit contracts separate lifecycle state from operational terminal outcome and bind an immutable specification to an exact input manifest. Worker input manifests name exact Artifact or record revisions, selected worker/runtime, declared output slots, hard resource limits, egress policy, and partial-result behavior. Worker output manifests can return only bounded staging handles, hashes, diagnostics, egress accounting, and resource use; a rejected fixture proves they cannot self-register an Artifact. Four accepted, three rejected, and four canonical-content hash assertions pass identically through Ajv and strict frozen Pydantic models. | `M1.1-W09` gives Python and future sandbox adapters a portable job boundary without granting them database, graph, Artifact-registration, or scientific authority. |
| `M1.1-EV17` | `pass` | Ten in-memory WorkUnit assertions verify immutable and idempotent registration, requested/queued/running/completed history, optimistic revisions, exact input and specification hashes, successful dependencies, declared and required outputs, per-output and aggregate byte limits, exact worker identity, resource budgets, blocked egress, visible validation failure, explicit cancellation policy, terminal replay, and a retry that reuses one unchanged input manifest while creating attempt two. Invalid output leaves the WorkUnit running and stores no output manifest. | The first bounded-worker lifecycle is executable before persistence: operational failure cannot masquerade as scientific evidence, and a worker report cannot partially mutate Petra authority. |
| `M1.1-EV18` | `pass` | GraphProjectionRecord contracts bind one immutable Neo4j attempt to the exact Project, projection version and configuration, outbox position, target sequence, event position, stream revision, timing, outcome, and service actor. Applied attempts additionally bind the exact projected object revisions, effect hash, and post-commit backend receipt. ProjectionCheckpoint contracts expose a contiguous position, observed head, and closed `current`, `catching_up`, or `blocked` freshness state. Five accepted, two rejected, five canonical-content-hash, and one effect-hash assertions pass identically through Ajv and strict frozen Pydantic models. | Projection lag and failure are portable, queryable facts; a backend acknowledgment cannot be mistaken for scientific authority or hide which authoritative revisions were projected. |
| `M1.1-EV19` | `pass` | Eight in-memory graph-projection assertions verify immutable checkpoint registration, optimistic revisions, failed-commit visibility without position advance, successful retry after failure, exact replay without duplication, active repair-queue resolution, content and effect hashes, exact event-derived object revisions, head observation, sequence-gap blocking, Project/target/projection/outbox linkage, and contiguous attempts. Invalid attempts leave both records and checkpoint position unchanged. | D002's initial projector safety boundary is executable before persistence: Neo4j can lag or fail visibly, but it cannot skip deliveries, accept stale scientific revisions, or advance PostgreSQL's checkpoint before an applied receipt exists. |
| `M1.1-EV20` | `pass` | ContextPacket and EvidencePacket contracts pin one Project snapshot, ContextRecipe revision, objective, exact record revisions and canonical hashes, visible selection route and order, trust/review labels, source depth, SourceSpan references, object and input-token budgets, material omissions, coverage, dependency hashes, temporal perspective, exhaustive composition selection or exclusion, evidence bearing, limitations, and freshness. Two accepted, two rejected, and two canonical-content-hash assertions pass identically through Ajv and strict frozen Pydantic models. | Petra has a portable model-context manifest that can stay compact through exact record references while still exposing everything prompt materialization is authorized to load. Evidence inclusion remains a bounded composition decision, not a declaration of truth. |
| `M1.1-EV21` | `pass` | Eight in-memory packet assertions verify immutable exact replay, record kind/revision/hash resolution, target closure, source authority labels, full-text versus abstract-only depth, complete SourceSpan provenance, contiguous ordering, exact token/object/span accounting, explicit truncation and material-omission semantics, dependency identity, EvidencePacket Project/snapshot/context binding, exhaustive disjoint selection, selected SourceSpan closure, compatible evidence bearing, contrary/qualifying coverage labels, and compile order. Invalid packets leave both registries unchanged. | Hidden prompt assembly now has an executable counter-boundary: a model or composition step cannot silently expand beyond the named packet, omit an available context object without accounting for it, or present abstract-only and unchecked contrary evidence as deeper coverage. |
| `M1.1-EV22` | `pass` | DraftArtifact, DraftSpan, ProvenanceMap, and CitationBundle contracts preserve the exact snapshot, EvidencePacket, control profiles, production origin, immutable lineage, Unicode code-point ranges and UTF-8 text hashes, exhaustive span bases, stale causes, canonical Work, WorkVersion, Author and external-identifier references, metadata uncertainty, source locators, and export intent. Five accepted, four rejected, five canonical-content-hash, and two exact-text-hash assertions pass identically through Ajv and strict frozen Pydantic models. Eight in-memory composition assertions additionally verify atomic immutable registration, exact span replay and non-overlap, complete EvidencePacket grounding, visible unsupported and stale outcomes, canonical citation metadata and identity, evidence-to-WorkVersion resolution, source-access bounds, material citation coverage, and additive researcher revision. | Petra can compose useful prose without treating fluent text as evidence: each material span remains inspectable, unsupported language cannot pass validation, citations cannot exceed the selected source record, and researcher edits preserve the prior draft while visibly invalidating support. |
| `M1.1-EV23` | `pass` | D015's ten conformance criteria are executable: both reusable registries validate Draft 2020-12 schemas, accepted canonical digests, allowlisted formats, and registry-local references (`VC01`, `VC09`); 202 shared fixture, primitive, union, authority, and hash assertions plus ten strict Pydantic parity test functions preserve common acceptance, rejection, non-mutation, and RFC 8785 identity (`VC02`, `VC04`, `VC07`); dedicated cross-runtime tests reject non-finite numbers, unknown formats, remote references, unknown versions, wrong types, unsafe integers, unknown properties, and ambiguous unions (`VC03`); every strict Pydantic result is revalidated by its canonical result schema (`VC06`); canonical schemas are separately rooted from generated declarations and reject adapter-specific extension keys (`VC08`); and the version-transition fixture explicitly rejects unregistered `contract-smoke@2.0.0` rather than silently accepting it (`VC10`). `contracts:check-generated` regenerates in memory, compares every committed declaration byte-for-byte, and runs before formatting or tests in `npm run verify`; generated declarations also compile under the pinned TypeScript toolchain (`VC05`). The complete gate passes 207 contract assertions, 123 core assertions, 11 Hono/AG-UI assertions, and 14 Python tests. | `M1.1-W13` and `D015-VC01`–`D015-VC10` are closed. Future schema or generator changes must declare new meaning, retain local resolution, reproduce committed bindings, and preserve cross-runtime behavior before they can enter Petra. |
| `M1.1-EV24` | `pass` | Six canonical interaction schemas cover the feature manifest, closed custom-event payloads, revisioned run, immutable hash-chained event record, revisioned interrupt, and per-connection replay record. Seven accepted fixtures, six rejected fixtures, six canonical-content hashes, strict Python models, and eight in-memory registry assertions enforce exact feature registration, protocol correlation, run and interrupt lineage, event sequence and hash chain, payload Artifact references, explicit command linkage, contiguous replay, and non-authoritative reconnect semantics. The AG-UI adapter advertises the exact canonical profile and emits schema-valid WorkUnit-status and review-interrupt custom events; the live conformance fixture covers run, state, tool, interrupt, replay, abort, and explicit command behavior without importing AG-UI into `core`. | `M1.1-W14`, `M1.1-B10`, and `M1.1-AC05` are closed. AG-UI remains a replaceable transport and presentation protocol: only a separately validated Petra command can affect authority or cancel durable work. |

`M1.1-W01`–`M1.1-W14` and the M1.1 exit gate are complete. Compensating scientific reversal remains deliberately assigned to `M1.5-W12`: M1.1 proves immutable prior revisions and the authority-change boundary, while M1.5 will define and test the actual inverse ChangeSet against trusted Claims, Assertions, outbox delivery, and the graph projection.

Every schema produced under `M1.1-W01`–`M1.1-W14` must specify:

| ID | Contract specification | Why Petra needs it |
| --- | --- | --- |
| `M1.1-CS01` | Explicit schema name and version. | Stored and transmitted records must identify their interpretation. |
| `M1.1-CS02` | Required versus optional fields. | Missing evidence cannot be confused with nullable or unavailable evidence. |
| `M1.1-CS03` | Controlled-vocabulary validation. | Scientific relation and state terms need consistent machine meaning. |
| `M1.1-CS04` | Stable serialization and canonical hashing wherever identity depends on content. | TypeScript and Python must derive identical identities. |
| `M1.1-CS05` | Defined behavior for unknown fields and enum values. | Older components must fail or degrade explicitly when contracts evolve. |
| `M1.1-CS06` | Positive and negative fixtures. | Acceptance and rejection behavior must be executable across languages. |
| `M1.1-CS07` | Migration or supersession rule. | Persistent scientific records cannot silently change meaning. |
| `M1.1-CS08` | Closed-object behavior, explicit extension maps, and non-mutating validation. | Unknown or coercible input must not be silently discarded or rewritten. |
| `M1.1-CS09` | Portable formats, discriminated unions, safe integers, exact-decimal strings, and artifact references for bulk scientific data. | JavaScript and Python must preserve the same value and variant. |
| `M1.1-CS10` | Runtime validation remains authoritative over generated TypeScript declarations and Pydantic models. | Developer ergonomics must not create a second acceptance path. |

### Domain behavior

Implement these rules in memory before persistence:

| ID | Behavior specification | Why Petra needs it |
| --- | --- | --- |
| `M1.1-B01` | Construct and validate stable Petra IDs. | Identity must not depend on a UI label or database row accident. |
| `M1.1-B02` | Register an immutable Artifact from verified bytes and manifest. | Source content must not change beneath its provenance. |
| `M1.1-B03` | Attach each SourceSpan to exactly one Artifact revision. | A quotation or region must resolve to the bytes from which it was derived. |
| `M1.1-B04` | Place every Claim proposal in quarantine. | Extracted statements are candidates, not trusted facts. |
| `M1.1-B05` | Promote an Assertion only through an eligible ChangeSet. | Authority requires an auditable policy and review path. |
| `M1.1-B06` | Preserve prior revisions under every authority change; implement correction and compensating reversal through the same additive ChangeSet path in `M1.5-W08` and `M1.5-W12`. | The kernel must make scientific history non-destructive without prematurely inventing inverse semantics before the complete Claim/Assertion projection path exists. |
| `M1.1-B07` | Handle repeated commands idempotently. | Retries and reconnects must not duplicate scientific state. |
| `M1.1-B08` | Reject stale optimistic revisions. | Concurrent work must not overwrite newer research decisions. |
| `M1.1-B09` | Produce events without mutating projections directly. | Neo4j and interface state must remain rebuildable from authority. |
| `M1.1-B10` | Reject any interaction snapshot, delta, tool argument, or interrupt response that attempts to bypass a Petra command. | Bidirectional protocol state must not become an authority path. |

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.1-AC01` | TypeScript and Python validate the same accepted and rejected fixtures. |
| `M1.1-AC02` | Both languages produce identical hashes for canonical test payloads. |
| `M1.1-AC03` | A deterministic test executes proposal, approval, and application entirely in memory while retaining the exact prior quarantine revisions; `M1.5-AC04` owns compensating reversal of the active projected relation without history deletion. |
| `M1.1-AC04` | Invalid provenance, stale revisions, reused IDs, and direct trusted-state insertion fail with typed errors. |
| `M1.1-AC05` | Adapter fixtures map AG-UI runs, state, tools, and interrupts to Petra interaction contracts without importing AG-UI into `core`. |
| `M1.1-AC06` | `D015-VC01`–`D015-VC10` pass against the pinned TypeScript and Python toolchains. |

## M1.2 — PostgreSQL authority and artifact spine

- **Status:** `in_progress`
- **Builds:** Petra's transactional research ledger, append-only event path, outbox, and immutable S3-compatible artifact storage.
- **Why:** Neo4j and the interface need a replayable authority, while scientific sources and outputs need durable content identity.
- **Depends on:** `M1.1`.

### PostgreSQL

Create migrations for the smallest authoritative ledger:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.2-W01` | `complete` | Persist immutable canonical Actors, stable Project identities, and contiguous immutable Project revisions through a typed `ResearchScopeRepository` and the forward-only `V001__research_scope.sql` migration. | Every mutation needs explicit scope and authorship, while exact retry and later Project changes must preserve the record a researcher originally created. |
| `M1.2-W02` | `complete` | Persist global canonical Author, Work, WorkVersion, and ExternalIdentifier identities through one guarded entity-head and immutable revision mechanism, with typed revision tables for authorship, Work credits, publication status and date precision, metadata origin, and exact external-identifier subject level. | Current state and historical versions must coexist, while corpus reuse depends on keeping a scholarly Work distinct from its versions and from every source-observed alias. |
| `M1.2-W03` | `complete` | Persist one immutable Artifact identity per verified content hash; allow multiple copy-specific acquisition manifests and rights decisions to reference that identity; retain content-addressed object coordinates, integrity results, exact acquired WorkVersion or supplying Actor origin, generated-Artifact inputs, and responsible Actors through the typed `ArtifactAuthorityRepository` and `V003__artifact_authority.sql`. The repository accepts only records whose bytes have already passed the ArtifactStore verification boundary. | PostgreSQL must authorize access to verified immutable bytes without becoming blob storage, preserve where each copy came from and what Petra may do with it, and reuse identical papers without collapsing copy-specific provenance or rights. |
| `M1.2-W04` | `complete` | Persist each parser interpretation as one atomic `DocumentBundle`: the exact permission-bearing source ArtifactManifest, immutable ParsedDocument and parser run, ordered StructuralBlocks, declared SourceSpans, and generated parser-output Artifact lineage. Retain queryable source hashes, WorkVersion and Actor references, reading order, block relations, selector type, text hash and offsets, page number, structural path, extraction version, normalization version, and verification state through the typed `DocumentAuthorityRepository` and `V004__document_authority.sql`. | A SourceSpan is evidence only when it resolves through one authorized source copy, immutable byte hash, reproducible parser interpretation, and declared document region; committing the bundle atomically prevents partial parse output from acquiring scientific authority. |
| `M1.2-W05` | `complete` | Persist globally reusable Claim and Assertion identities over one guarded revision spine while retaining separate typed revision tables, ordered Claim basis edges, validator results, queryable source grounding, Assertion endpoints, and ordered typed provenance. `V005__evidence_authority.sql` and the storage-neutral `EvidenceAuthorityRepository` admit only immutable revision-1 quarantine proposals; exact replay is safe, and trusted or later revisions remain inaccessible until `M1.2-W06` supplies ChangeSet authority. | Quarantined proposals must never be mistaken for reviewed evidence, while later review must be able to append authority without replacing stable scientific identities or rebuilding provenance. |
| `M1.2-W06` | `complete` | Persist immutable submitted ChangeSets and their exact ordered operations, human Approvals bound to one ChangeSet revision and content hash, guarded derived lifecycle state, and authorization rows that bind each initial Claim-plus-`ASSERTS` promotion to its approving human. Correction and compensating reversal remain assigned to `M1.5-W08` and `M1.5-W12`; V006 deliberately does not admit those operations before their semantics are defined and tested. | Trusted-state history must explain who changed what and why without giving an unimplemented correction or reversal label authority. |
| `M1.2-W07` | `complete` | Persist immutable project-scoped domain events with a gapless rollback-safe global position, contiguous per-Project stream revision, exact command metadata binding, and bounded ordered reads. | Petra needs deterministic replay and audit history whose ordering survives concurrency and transaction failure. |
| `M1.2-W08` | `complete` | Persist immutable command executions keyed by both command ID and idempotency key, with canonical-envelope fingerprints and durable success or conflict outcomes. Serialize competing command scopes with transaction-level advisory locks and return the original result or typed failure for an exact retry. | Network and worker retries must be safe, while reuse of either key for different content must fail rather than duplicate authority. |
| `M1.2-W09` | `complete` | Persist stable WorkUnit identities, immutable bounded specifications, exact input manifests and ordered Artifact/record bindings, dependencies, every lifecycle revision, validated immutable worker output manifests, typed resource/network/diagnostic observations, staged output declarations, retryable validation failure, explicit cancellation, and operational terminal outcomes through a storage-neutral repository. PostgreSQL transactions rehydrate and execute the same `InMemoryWorkUnitRegistry` transition semantics; the still-undefined `checkpointed` transition remains closed until it has an explicit command and Artifact contract. | Background work, failure, retry, and cancellation need visible lifecycle state, but a worker report or operational outcome must never self-authorize an Artifact or become evidence for a Hypothesis. |
| `M1.2-W10` | `complete` | Persist an immutable transactional outbox in the same PostgreSQL transaction as the ChangeSet mutation, command result, and domain event. Retain rollback-safe global ordering, contiguous per-target/per-Project sequence, deterministic deduplication keys, and the exact embedded authoritative event for `neo4j_graph` and `interface_authority`. | Authoritative mutations and projection messages must commit atomically, while each consumer needs an independent ordered replay cursor. |
| `M1.2-W11` | `complete` | Persist one revisioned PostgreSQL-authoritative checkpoint per Project and exact graph-projection identity plus immutable per-attempt Neo4j receipts and ordered projected-object effects. Bind observed heads and receipts to the exact authoritative outbox/event, advance only on the next applied target sequence after a graph commit, retain failed attempts in a derived repair queue, expose `current`, `catching_up`, and `blocked` freshness, and replay every mutation through the tested in-memory projection state machine. | Graph freshness, lag, gaps, failed delivery, repair, and recovery position must be measurable without permitting Neo4j to become authority. |
| `M1.2-W12` | `planned` | Persist `PetraInteractionRun` records, protocol event sequence, interrupt linkage, and replay checkpoints separately from domain events. | Reconnection and interaction audit need durable history without confusing the stream with scientific authority. |

Use explicit constraints for IDs, revisions, state, uniqueness, and referential integrity. Provider-specific and immature payloads may use validated JSON, but identity, authority, ordering, and review fields remain queryable columns.

### Incremental evidence

| ID | Status | Observed implementation evidence | Consequence |
| --- | --- | --- | --- |
| `M1.2-EV01` | `pass` | Flyway applies and validates `V001__research_scope.sql` against a unique disposable PostgreSQL 18.6 Compose project. Three real-repository tests verify canonical Actor and Project validation; content-bound exact replay; immutable Actor identity; stable Project authorship; contiguous revisions and current-pointer reads; historical revision reads; missing-reference, rebound-ID, stale-content, and gap rejection without partial state; database-level namespace and privacy constraints; mutation-trigger rejection; caller-copy isolation; and unconditional container, network, and volume cleanup. | `M1.2-W01` is complete through the selected production migration runner and real database rather than a mock. The same narrow port and migration-test pattern can now extend the ledger without importing PostgreSQL or Flyway into `core`. |
| `M1.2-EV02` | `pass` | Flyway applies and separately validates `V001` and `V002__scholarly_identity.sql`; its operational history is pinned to `public` so creating the `petra` application schema cannot redirect later history lookup through PostgreSQL's `"$user", public` search path. Three additional real-repository tests execute Author → Work credit → WorkVersion → version-level DOI identity registration; exact replay; current and historical Author reads; typed SQL traversal; stable authorship; caller-copy isolation; and atomic rejection of absent identities, ambiguous credit positions, rebound revisions, gaps, wrong identity levels, and direct row mutation. | `M1.2-W02` is complete with one shared revision guard and typed scientific identity relations rather than either duplicated head logic or an opaque all-JSON ledger. Scholarly identity can be reused across Projects without collapsing Work, WorkVersion, Author, or external-alias meaning. |
| `M1.2-EV03` | `pass` | Flyway applies and validates `V001`–`V003__artifact_authority.sql` against a unique disposable PostgreSQL 18.6 Compose project. Five new real-repository tests verify immutable Artifact identity; exact retry; one content hash with acquired and user-supplied copy-specific manifests and rights decisions; typed Artifact → content-addressed storage → acquired WorkVersion → RightsDecision traversal; generated-output lineage through ordered input Artifacts; caller-copy isolation; database-enforced Artifact/hash, manifest/rights, source-copy, permission, origin, and generated-input relations; missing-reference, mismatched-source, duplicate-content, rebound-ID, direct-update, and direct-delete rejection; transactional rollback without partial Artifact authority; and unconditional resource cleanup. All 11 PostgreSQL integration tests and the full repository verification gate pass. | `M1.2-W03` is complete without storing bytes in PostgreSQL or falsely claiming that a database reference proves object availability. The next artifact slice can implement staging and verification behind `ArtifactStore`, then call this narrow authority port only after the object is durably available. |
| `M1.2-EV04` | `pass` | Flyway applies and validates `V001`–`V004__document_authority.sql` against a unique disposable PostgreSQL 18.6 Compose project. Six new real-repository tests execute atomic DocumentBundle registration and exact replay; typed ArtifactManifest → ParsedDocument → ordered StructuralBlock → queryable SourceSpan traversal; source-copy parse-permission enforcement; generated parser-output lineage; caller-copy isolation; incomplete-bundle and cross-record mismatch rollback; ParsedDocument and parser-run rebound rejection; immutable-row enforcement; and declaration foreign-key rejection. Deferred circular constraints require every document block and every block span to resolve exactly at commit. Two additional core tests reject missing or hash-mismatched structured block Artifacts. All 17 PostgreSQL integration tests and the full repository gate—207 contract, 125 core, 11 server, and 14 Python tests—pass. | `M1.2-W04` is complete as a storage-neutral authority boundary. M1.4 can now add the lawful paper fixture and Docling worker without inventing a second persistence shape or allowing worker output to self-authorize; Claims in `M1.2-W05` can reference durable SourceSpan IDs immediately. |
| `M1.2-EV05` | `pass` | Flyway applies and validates `V001`–`V005__evidence_authority.sql` against disposable PostgreSQL 18.6. Five new real-repository scenarios verify separate Claim and Assertion persistence; exact replay; current and historical reads; WorkVersion → Claim and Claim ↔ Assertion traversal; ordered SourceSpan grounding and Assertion provenance; queryable quarantine, review, basis-Actor, endpoint, and scientific-scope fields; caller-copy isolation; trusted-revision refusal; missing and cross-WorkVersion grounding rejection; ASSERTS/Claim alignment; ID rebound rejection; transactional rollback; and immutable-row enforcement. Database constraints independently restrict V005 to revision-1 quarantine proposals, bind typed query columns to canonical payloads, require complete ordered provenance, reject unresolved or cross-paper SourceSpans, and preserve the scientific-relation evidence requirement. All 22 PostgreSQL integration tests and the full repository gate—207 contract, 125 core, 11 server, and 14 Python tests—pass. | `M1.2-W05` is complete without conflating Claim propositions with Assertion edges or giving model proposals a route into trusted state. `M1.2-W06` can add reviewed revisions and ChangeSet history by replacing the explicit V005 admission restriction in a forward migration, without changing evidence IDs or provenance tables. |
| `M1.2-EV06` | `pass` | Flyway applies and validates `V001`–`V006__change_control_event_outbox.sql` against disposable PostgreSQL 18.6. Six new real-repository scenarios execute submitted ChangeSet → exact human Approval → atomic Claim-plus-`ASSERTS` promotion; retain quarantine history; verify exact revision authorization; replay the same apply result; serialize concurrent retries; reject idempotency-key and command-ID rebound; refuse unauthorized and rejected application; commit one durable typed conflict for a stale competing ChangeSet; roll back state, commands, events, outbox records, and their counters when event construction fails; and enforce append-only commands, events, outbox records, and Approvals. Database constraints bind queryable reasons, impact previews, rationales, conditions, times, ordered operations, the applied Approval, approving human, command metadata, and embedded outbox event to their canonical records. All 28 PostgreSQL integration tests and the full repository gate—207 contract, 125 core, 11 server, and 14 Python tests—pass. | `M1.2-W06`, `M1.2-W07`, `M1.2-W08`, and `M1.2-W10` are complete as one transactionally indivisible authority path. PostgreSQL can now prove that a reviewed promotion, its audit event, its retry result, and both projection intents either exist together or do not exist; correction and reversal remain closed until M1.5 defines their actual operations. |
| `M1.2-EV07` | `pass` | Flyway applies and validates `V001`–`V007__work_and_projection_control.sql` against disposable PostgreSQL 18.6. Five new WorkUnit scenarios persist exact idempotent registration, queryable specifications and Artifact inputs, requested → queued → running → successful history, immutable input/output manifests, output-slot and resource enforcement, atomic invalid-output refusal, explicit cancellation, retryable validation failure, attempt-two reuse of the exact input manifest, dependency gating, rebound rejection, and database immutability. Three new graph-projection scenarios retain a failed Neo4j receipt in the repair queue without advancing position, apply the exact retry and clear repair state, replay without duplication, persist exact projected Claim/Assertion revisions, observe a later head, refuse sequence gaps atomically, reject a fabricated outbox payload, and enforce immutable receipts and checkpoint history. All 36 PostgreSQL integration tests and the full repository gate—207 contract, 125 core, 11 server, and 14 Python tests—pass. | `M1.2-W09` and `M1.2-W11` are complete without implementing a scheduler or Neo4j adapter prematurely. Durable work and projection freshness now have repository ports and PostgreSQL authority, while their transition meaning remains shared with the already-proven in-memory engines. |

### Artifact storage

Implement the `ArtifactStore` port with:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.2-W13` | `planned` | Stage bytes before registration. | Incomplete acquisition must not become trusted source material. |
| `M1.2-W14` | `planned` | Calculate SHA-256 while streaming. | Large papers and future datasets need verified identity without duplicate memory copies. |
| `M1.2-W15` | `planned` | Derive content-addressed final keys. | Identical bytes should share durable identity across projects. |
| `M1.2-W16` | `planned` | Verify size and media type. | Corrupt or misdeclared objects must fail before registration. |
| `M1.2-W17` | `planned` | Make the object atomically available before committing its PostgreSQL reference. | Authority must never point to unavailable evidence. |
| `M1.2-W18` | `planned` | Support read-by-hash and manifest inspection. | Retrieval and audit paths need a stable source lookup. |
| `M1.2-W19` | `planned` | Clean abandoned staging objects safely. | Failed jobs must not accumulate ambiguous or trusted-looking residue. |

The persisted M1 runtime uses the accepted S3-compatible adapter against Petra's local development service. Unit tests may use an in-memory or temporary-filesystem test double, but the application schema and services never expose local paths as artifact identity.

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.2-AC01` | The in-memory domain tests pass unchanged against PostgreSQL repositories. |
| `M1.2-AC02` | Replaying accepted events reconstructs the same active revisions. |
| `M1.2-AC03` | Repeating a command with the same idempotency key cannot duplicate an event or Artifact reference. |
| `M1.2-AC04` | PostgreSQL cannot point to an Artifact that failed storage verification. |
| `M1.2-AC05` | A database transaction failure leaves no partially trusted Claim or Assertion. |
| `M1.2-AC06` | Replaying an interaction stream restores its interface projection but cannot create or alter authoritative domain state. |

## M1.3 — Paper Trail compatibility and Neo4j projection

- **Status:** `planned`
- **Builds:** a frozen retrieval regression baseline plus Petra's first real graph projection and bounded graph queries.
- **Why:** Petra must demonstrate graph-native retrieval without confusing source citations, derived paths, and scientific evidence.
- **Depends on:** `M1.2`.

### Reuse without coupling

Copy or transform only the pinned OpenAlex fixture and its manifest into `/petra/fixtures/paper-trail`, preserving source, date, license, checksum, and limitations. Do not make production Petra import `course/labs/paper_trail.py`.

Port these behavioral baselines into Petra tests:

| ID | Status | Compatibility specification | Why Petra preserves it |
| --- | --- | --- | --- |
| `M1.3-W01` | `planned` | Preserve title-weighted lexical ordering for the frozen sample. | Later retrieval must beat a known, deterministic baseline. |
| `M1.3-W02` | `planned` | Preserve explicit year filtering. | Temporal scope must be visible and testable. |
| `M1.3-W03` | `planned` | Preserve directed reference and cited-by neighbors. | Citation direction affects traversal meaning. |
| `M1.3-W04` | `planned` | Preserve bounded path behavior. | Graph retrieval must have predictable scope and cost. |
| `M1.3-W05` | `planned` | Preserve source-native `CITES` direction. | Petra must not infer scientific support from graph orientation. |
| `M1.3-W06` | `planned` | Reject unknown works explicitly. | Missing identity must not degrade into fabricated graph objects. |
| `M1.3-W07` | `planned` | Preserve chronology quality flags. | Imperfect source metadata must remain visible. |
| `M1.3-W08` | `planned` | Test that citation and scientific support remain distinct. | Bibliographic dialogue is not evidence for a proposition. |

The exact BM25 implementation may initially remain a test adapter. Its results provide a floor for later PostgreSQL, Neo4j, or dedicated retrieval implementations.

### Neo4j projection

Implement the outbox projector and bounded graph-query ports:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.3-W09` | `planned` | Project Work and WorkVersion nodes. | The graph needs canonical scholarly objects with explicit versions. |
| `M1.3-W10` | `planned` | Project Artifact and SourceSpan inspection identities. | A graph relation must lead back to inspectable source evidence. |
| `M1.3-W11` | `planned` | Project Claim nodes. | Scientific propositions need explicit, reusable graph identity. |
| `M1.3-W12` | `planned` | Project accepted Assertion relationships with Assertion IDs. | Every scientific edge must resolve to PostgreSQL authority. |
| `M1.3-W13` | `planned` | Project source-native `CITES` separately from evidence relations. | Literature dialogue and epistemic support require different semantics. |
| `M1.3-W14` | `planned` | Project revision, trust-zone, review, and projection-position metadata. | Users and services need to see whether a graph object is current and trusted. |
| `M1.3-W15` | `planned` | Query an object by stable identity. | All focused graph work begins with canonical lookup. |
| `M1.3-W16` | `planned` | Query an immediate typed neighborhood. | The workbench needs an explainable local graph, not an unbounded corpus view. |
| `M1.3-W17` | `planned` | Query an exact provenance path. | Common inspection should be fast and require no LLM call. |
| `M1.3-W18` | `planned` | Query evidence relations around one Claim. | Petra must present support, challenge, qualification, and absence locally. |
| `M1.3-W19` | `planned` | Query a bounded citation path. | Literature lineage must remain navigable with controlled cost. |
| `M1.3-W20` | `planned` | Report projection revision and lag. | Stale graph state must be observable rather than silently displayed as current. |

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.3-AC01` | The Paper Trail regression suite passes against Petra's fixture adapter. |
| `M1.3-AC02` | Every projected scientific relationship resolves to its PostgreSQL Assertion. |
| `M1.3-AC03` | `CITES` never appears as `SUPPORTS`. |
| `M1.3-AC04` | Reprocessing an outbox record is idempotent. |
| `M1.3-AC05` | A stale projection record cannot overwrite a newer revision. |
| `M1.3-AC06` | Neo4j can be deleted and rebuilt from PostgreSQL without changing active Assertion IDs. |

## M1.4 — lawful full-text fixture and Docling worker

- **Status:** `planned`
- **Builds:** one rights-aware full-text ingestion path, an isolated Docling worker, and stable SourceSpan identities.
- **Why:** Petra cannot ground detailed Claims in metadata, abstracts, or reconstructed model text.
- **Depends on:** `M1.1`, `M1.2`.

### Fixture selection

Choose one legitimate scholarly paper meeting this fixture specification:

| ID | Status | Fixture specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.4-W01` | `planned` | Record a stable Work identity and exact version. | Results must identify the paper version actually processed. |
| `M1.4-W02` | `planned` | Use a full-text PDF Petra may lawfully store and process for the test. | The first detailed Claim must be grounded in accessible source text. |
| `M1.4-W03` | `planned` | Record redistribution rights, or provide a reproducible acquisition recipe with pinned checksum. | The repository must not trade reproducibility for unlawful redistribution. |
| `M1.4-W04` | `planned` | Include ordinary paragraphs and at least one layout feature worth validating. | The worker path should test structure, not merely plain-text extraction. |
| `M1.4-W05` | `planned` | Select text supporting one broad Claim and one source-local limitation or qualification. | The fixture must exercise both assertion and scientific scope. |

The fixture proves the ingestion contract; it does not select Petra's flagship research question.

### Worker boundary

Implement the Python science worker as a bounded job processor:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.4-W06` | `planned` | Receive a validated job and capability envelope. | The worker must know exactly what it may read, spend, and produce. |
| `M1.4-W07` | `planned` | Read one permitted Artifact through a scoped adapter. | Processing access must remain least-privileged and traceable. |
| `M1.4-W08` | `planned` | Run a pinned Docling version and configuration. | Parse output must be reproducible and attributable. |
| `M1.4-W09` | `planned` | Emit a ParsedDocument, StructuralBlocks, SourceSpan candidates, diagnostics, and output artifacts. | The control plane needs structured proposals plus explicit defects. |
| `M1.4-W10` | `planned` | Return a shared-contract-validated worker manifest. | Cross-process completion must be machine-verifiable. |
| `M1.4-W11` | `planned` | Prohibit direct PostgreSQL and Neo4j writes. | Workers may propose results but cannot grant them authority. |

### SourceSpan stability

Define selectors that survive normal inspection and replay:

| ID | Selector specification | Why Petra needs it |
| --- | --- | --- |
| `M1.4-SS01` | Artifact hash and parser-run identity. | A span must name both its source bytes and derivation. |
| `M1.4-SS02` | Page and bounding box when available. | Researchers need visual source inspection. |
| `M1.4-SS03` | Structural path and block identity. | Semantic document structure helps recovery and navigation. |
| `M1.4-SS04` | Normalized Unicode code-point offsets within the immutable parsed Artifact. | TypeScript and Python need identical deterministic text boundaries, including for non-BMP characters. |
| `M1.4-SS05` | Exact quoted-text hash. | Drift or accidental substitution must be detectable. |
| `M1.4-SS06` | Parser and normalization versions. | A changed parser must not silently reinterpret an old span. |

`M1.4-W12` records partial parsing, reading-order defects, missing pages, table or caption ambiguity, and span relinking as explicit states so missing or ambiguous structure cannot silently appear complete.

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.4-AC01` | The same PDF and parser configuration reproduce the same structural and span identities, or expose recorded nondeterminism. |
| `M1.4-AC02` | One selected SourceSpan opens in context and resolves to the original Artifact page. |
| `M1.4-AC03` | A deliberately malformed or unsupported Artifact fails without mutating trusted state. |
| `M1.4-AC04` | Abstract-only fixture content cannot produce detailed method, validity, or reproduction Claims. |
| `M1.4-AC05` | Worker payloads pass the shared TypeScript and Python contract tests. |

## M1.5 — Claim proposal, review, and trusted graph

- **Status:** `planned`
- **Builds:** quarantine, validation, review, ChangeSet application, projection, correction, and reversal for scientific Claims.
- **Why:** visible, reversible promotion is Petra's boundary between model or worker proposals and trusted research state.
- **Depends on:** `M1.3`, `M1.4`.

### Deterministic path first

Before a live model, create and process a deterministic extractor fixture:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.5-W01` | `planned` | Include one source-native Claim proposal. | The happy path needs a known scientific proposition. |
| `M1.5-W02` | `planned` | Include one scoped qualifier or limitation. | Petra must preserve conditions that constrain claim force. |
| `M1.5-W03` | `planned` | Include one deliberately unsupported proposal. | The system must prove it can refuse plausible but ungrounded output. |
| `M1.5-W04` | `planned` | Include exact SourceSpan references. | Review must operate against inspectable source evidence. |
| `M1.5-W05` | `planned` | Include extractor provenance and validation results. | A proposal needs an attributable derivation and machine-check history. |
| `M1.5-W06` | `planned` | Ingest proposals into quarantine. | Model output cannot begin as trusted state. |
| `M1.5-W07` | `planned` | Inspect source span, scope, origin, and validation state together. | Reviewers need the information required for a scientific decision. |
| `M1.5-W08` | `planned` | Represent accepted, rejected, and corrected review outcomes. | Review is not a binary approval toggle. |
| `M1.5-W09` | `planned` | Apply one atomic ChangeSet per independently reviewable mutation. | Individual scientific decisions must be reversible without unwinding a batch. |
| `M1.5-W10` | `planned` | Present review batches without coupling their transactions. | Efficient review must not create all-or-nothing scientific authority. |
| `M1.5-W11` | `planned` | Project applied changes through the outbox and expose catch-up state. | Graph visibility must follow authority with observable lag. |
| `M1.5-W12` | `planned` | Apply compensating reversal. | A bad promotion must be undoable without deleting history. |

### Live extraction after the fixture passes

`M1.5-W13` connects one extractor route through the ModelGateway only after fixture tests establish the output contract. `M1.5-W14` runs a small role-certification fixture before activation. `M1.5-W15` records ModelRequest, ModelCall, prompt profile, deployment identity, context, output, validation, latency, cost, and proposal IDs so live behavior remains reproducible and comparable. `M1.5-W16` presents one fixture ChangeSet through an AG-UI review interrupt and resolves the response through the same idempotent command used by direct review.

A live model is allowed to fail the fixture-derived quality checks. Failure remains visible and cannot block development of the deterministic spine, but M1 closure requires one certified configured deployment to return a valid proposal through the recorded route.

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.5-AC01` | The supported proposal can be promoted and projected. |
| `M1.5-AC02` | The unsupported proposal is blocked or visibly rejected. |
| `M1.5-AC03` | A correction uses the same ChangeSet semantics whether initiated from the inspector or assistant. |
| `M1.5-AC04` | Reversal removes the active projected edge without deleting its history. |
| `M1.5-AC05` | No model or worker output can write trusted state directly. |
| `M1.5-AC06` | Malformed, incomplete, stale, duplicate, or unauthorized AG-UI interrupt input cannot apply a ChangeSet. |

## M1.6 — bounded retrieval, ContextPacket, and grounded response

- **Status:** `planned`
- **Builds:** the first graph-guided retrieval recipe, immutable context artifacts, provenance fast path, and validated LLM synthesis.
- **Why:** Petra's assistant must answer from explicit graph state and evidence rather than an opaque prompt assembled anew each turn.
- **Depends on:** `M1.5`.

### Retrieval routes

Implement only the routes needed by the M1 demonstration:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.6-W01` | `planned` | Retrieve a canonical object by stable identity. | Known-object questions should bypass expensive search and generation. |
| `M1.6-W02` | `planned` | Retrieve lexical candidates with explicit scores and scope. | Text relevance provides a cheap, inspectable candidate generator. |
| `M1.6-W03` | `planned` | Retrieve a focused typed evidence neighborhood. | The graph should guide the model to local scientific structure. |
| `M1.6-W04` | `planned` | Retrieve an exact provenance path. | Common evidence inspection should feel immediate and use no LLM. |
| `M1.6-W05` | `planned` | Join text candidates and typed graph evidence in one small hybrid recipe. | M1 must test graph-guided RAG without prematurely adopting a retrieval framework. |

`M1.6-W17` records the Paper Trail lexical result beside Petra's hybrid route so later challengers are compared against a stable floor rather than memory. Dense retrieval, community summaries, HippoRAG2, and other challengers remain benchmark candidates after a representative corpus and judgments exist.

### Context compilation

Compile one immutable ContextPacket and composition-specific EvidencePacket with:

| ID | Status | Packet specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.6-W06` | `planned` | Project and graph snapshot. | An answer must name the research state it describes. |
| `M1.6-W07` | `planned` | Objective and ContextRecipe revision. | Retrieval intent and assembly logic must be reproducible. |
| `M1.6-W08` | `planned` | Included Claims, Assertions, and SourceSpans. | Every supplied scientific premise must be inspectable. |
| `M1.6-W09` | `planned` | Contrary and qualifying evidence. | Synthesis must not hide disagreement or scope limits. |
| `M1.6-W10` | `planned` | Trust, review, rights, and processing depth. | The model and user must know what kind of evidence is being used. |
| `M1.6-W11` | `planned` | Explicit omissions and coverage limits. | Absence from the packet must not be presented as absence from the literature. |
| `M1.6-W12` | `planned` | Dependency hashes and token budget. | Cache validity, cost, and truncation need explicit control. |

### Grounded response

`M1.6-W13` establishes the synthesist contract with a deterministic fixture. `M1.6-W14` produces one short response through a certified configured deployment. `M1.6-W15` validates that every material scientific statement resolves to included trusted Assertions and exact SourceSpans. `M1.6-W16` labels source report, Petra synthesis, and unresolved inference distinctly so fluent prose cannot conceal epistemic origin. `M1.6-W18` translates the bounded run, visible activity, grounded text, EvidencePacket readiness, and terminal outcome into the registered Petra AG-UI profile.

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.6-AC01` | A provenance-path request completes without a generative model. |
| `M1.6-AC02` | The grounded response cannot cite an object outside its named packet and snapshot. |
| `M1.6-AC03` | One configured synthesist ModelRequest and ModelCall pass schema, evidence, Felicity, and provenance validation. |
| `M1.6-AC04` | Removing or reversing its supporting Assertion invalidates the response Artifact and cache. |
| `M1.6-AC05` | The response exposes abstract-only, contrary-evidence, and omission states accurately. |
| `M1.6-AC06` | The trace reports graph, retrieval, model, validation, and projection time and cost separately. |
| `M1.6-AC07` | Every streamed scientific response links to its `PetraInteractionRun`, WorkUnit, EvidencePacket, snapshot, and persisted terminal state. |

## M1.7 — Research Brief and provenance UX

- **Status:** `planned`
- **Builds:** the first object-centered workbench surface for orientation, evidence inspection, graph explanation, and review.
- **Why:** scientific traceability is only useful when a researcher can understand and correct it without reconstructing the database manually.
- **Depends on:** `M1.5`, `M1.6`.

### Minimum interface

Build the smallest object-centered workbench surface:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.7-W01` | `planned` | Show the project and active snapshot in a persistent header. | Researchers must always know which research state they are viewing. |
| `M1.7-W02` | `planned` | Show a Research Brief with current question, bounded synthesis, evidence frontier, and SuggestedAction. | The primary surface should orient the next scientific decision, not merely display chat. |
| `M1.7-W03` | `planned` | Show Papers with canonical identity, version, rights, and processing depth. | Source quality and availability must be visible before interpretation. |
| `M1.7-W04` | `planned` | Show evidence with Claim, relation, scope, origin, and review state. | Users need to distinguish what is said, how it relates, and how much Petra trusts it. |
| `M1.7-W05` | `planned` | Show a focused graph neighborhood rather than an unrestricted corpus hairball. | The graph should explain the active question without sacrificing navigability or latency. |
| `M1.7-W06` | `planned` | Inspect the selected object with exact SourceSpan and provenance. | Every scientific object needs a direct route to source context. |
| `M1.7-W07` | `planned` | Show review controls and the exact ChangeSet diff. | Automation remains governable only when proposed authority changes are legible. |
| `M1.7-W08` | `planned` | Represent current, cached, running, proposed, validated, applied, stale, and projection-catching-up states. | Async work must never masquerade as current scientific authority. |
| `M1.7-W09` | `planned` | Expose active work, stop control, latency, and cost. | Agentic automation needs visible control and resource consequences. |
| `M1.7-W10` | `planned` | Wrap the official AG-UI client in `PetraInteractionClient` and Petra-specific React hooks and view models. | Feature components should consume scientific interaction concepts rather than parse generic protocol events. |
| `M1.7-W11` | `planned` | Render assistant text, activity, tool proposals, and review interrupts through Petra-owned components. | The protocol must support Petra's scientific UX without becoming its design system. |
| `M1.7-W12` | `planned` | Support stream reconnection, interaction replay, and explicit WorkUnit cancellation as separate actions. | A dropped connection must not duplicate or silently terminate durable research work. |

The first graph view needs interaction and traceability, not visual polish. Renderer selection remains replaceable behind a focused graph-view model.

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.7-AC01` | One Work, Claim, Assertion, and SourceSpan retain identity across Brief, Evidence, Graph, and inspector. |
| `M1.7-AC02` | A researcher can distinguish a citation edge from scientific support. |
| `M1.7-AC03` | A researcher can approve, reject, correct, and reverse the fixture proposal. |
| `M1.7-AC04` | Reloading or reconnecting cannot duplicate a command or ChangeSet application. |
| `M1.7-AC05` | The interface never presents running, proposed, or cached work as applied authority. |
| `M1.7-AC06` | No workbench feature outside the interaction integration module imports or switches on raw AG-UI event types. |
| `M1.7-AC07` | Aborting the client stream leaves its durable WorkUnit unchanged; only the explicit authorized cancel command changes WorkUnit state. |

## M1.8 — first DraftArtifact and citations

- **Status:** `planned`
- **Builds:** snapshot-bound scientific prose, span-level provenance, canonical citations, BibTeX, LaTeX, and revision-aware editing.
- **Why:** Petra must convert evidence into useful research writing without turning fluent language or formatted references into unsupported authority.
- **Depends on:** `M1.6`, `M1.7`.

### Composition

Wrap the grounded response in:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.8-W01` | `planned` | Create one CompositionRequest. | The requested output, audience, and scientific force need explicit input identity. |
| `M1.8-W02` | `planned` | Retain one inspectable CompositionPlan. | Users and validators need to see how evidence was assigned to prose. |
| `M1.8-W03` | `planned` | Bind one EvidencePacket. | Drafting must operate on a fixed evidence boundary. |
| `M1.8-W04` | `planned` | Create one immutable DraftArtifact revision. | Scientific prose needs reproducible history. |
| `M1.8-W05` | `planned` | Map DraftSpans through a ProvenanceMap. | Material language must resolve to evidence or an explicit non-evidence origin. |
| `M1.8-W06` | `planned` | Create one CitationBundle resolving to the exact WorkVersion. | Bibliography and claims must cite the version actually used. |
| `M1.8-W07` | `planned` | Render Markdown and LaTeX Artifacts. | Researchers need usable formats without divergent scientific content. |
| `M1.8-W08` | `planned` | Render a BibTeX Artifact. | Citation reuse should be immediate and canonically generated. |

`M1.8-W14` applies D006 and D012's Felicity contract to user-facing prose and then reruns claim-force, origin, provenance, and citation validators so stylistic improvement cannot silently strengthen or detach a scientific statement.

### Editing behavior

Support one researcher edit that:

| ID | Status | Behavior specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M1.8-W09` | `planned` | Create a new DraftArtifact revision. | Human editing must not overwrite the generated record. |
| `M1.8-W10` | `planned` | Preserve edit origin. | Petra must distinguish researcher language from model language. |
| `M1.8-W11` | `planned` | Mark affected provenance and citations stale. | Changed wording may no longer be supported by the prior evidence mapping. |
| `M1.8-W12` | `planned` | Permit explicit revalidation. | Researchers need a controlled way to restore trustworthy support state. |
| `M1.8-W13` | `planned` | Keep the prior revision inspectable. | Comparison and audit require the complete drafting history. |

### Exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.8-AC01` | Every material DraftSpan is evidence-backed, experimental, explicitly inferential, or researcher-supplied. |
| `M1.8-AC02` | The bibliography contains canonical metadata and visible warnings rather than invented fields. |
| `M1.8-AC03` | Markdown, LaTeX, and BibTeX render without changing semantic support. |
| `M1.8-AC04` | A language rewrite that strengthens scientific force is rejected or returned for repair. |
| `M1.8-AC05` | The draft's evidence path is reproducible from its named snapshot after the project advances. |

## M1.9 — hardening and M1 closure

- **Status:** `planned`
- **Builds:** a clean-start acceptance demonstration, complete test evidence, backup, replay, projection rebuild, and recovery.
- **Why:** M1 is a scientific evidence spine only if the complete path survives retries, reversals, failure, and reconstruction.
- **Depends on:** `M1.0`–`M1.8`.

### Acceptance demonstration

Run one scripted demonstration from a clean Petra environment:

| ID | Demonstration step | What it proves |
| --- | --- | --- |
| `M1.9-DEMO-01` | Create a Project. | Petra establishes explicit research scope before work begins. |
| `M1.9-DEMO-02` | Register or acquire the full-text fixture. | Lawful source ingestion works through the application boundary. |
| `M1.9-DEMO-03` | Verify its Artifact hash and RightsDecision. | Bytes, identity, and permitted use are inspectable. |
| `M1.9-DEMO-04` | Parse it with the pinned Docling worker. | Bounded cross-language processing produces a recorded result. |
| `M1.9-DEMO-05` | Inspect one SourceSpan in context. | Structured evidence resolves to original source material. |
| `M1.9-DEMO-06` | Ingest deterministic Claim proposals. | Extractor output enters quarantine through validated contracts. |
| `M1.9-DEMO-07` | Reject the unsupported proposal and promote the supported one. | Review separates plausible output from trusted scientific state. |
| `M1.9-DEMO-08` | Observe the Neo4j projection and trace its edge to PostgreSQL authority. | The visible graph is real, useful, and non-authoritative. |
| `M1.9-DEMO-09` | Ask one bounded question and inspect its EvidencePacket. | Retrieval is graph-guided, snapshot-bound, and transparent. |
| `M1.9-DEMO-10` | Generate a DraftArtifact, citation, BibTeX, and LaTeX output. | Petra turns evidence into usable scientific material without losing provenance. |
| `M1.9-DEMO-11` | Reverse the trusted Assertion. | Scientific authority can be withdrawn without deleting history. |
| `M1.9-DEMO-12` | Observe projection catch-up and dependent-output invalidation. | Derived graph and prose react visibly to authority changes. |
| `M1.9-DEMO-13` | Replay PostgreSQL events and rebuild Neo4j. | The graph is reconstructable from the authoritative ledger. |
| `M1.9-DEMO-14` | Recover the same active Assertion IDs and historical trace. | Rebuild preserves scientific identity and auditability. |
| `M1.9-DEMO-15` | Replay and reconnect to the recorded AG-UI interaction, resolve one review interrupt, and distinguish stream abort from WorkUnit cancellation. | The production interaction path preserves identity, authority, and durable-work semantics across failure and human review. |

### Required test groups

| ID | Test specification | Failure Petra must detect |
| --- | --- | --- |
| `M1.9-T01` | Contract compatibility across TypeScript and Python. | Cross-language acceptance, rejection, or hashing drift. |
| `M1.9-T02` | Domain invariants and state transitions. | An illegal authority, revision, correction, or reversal path. |
| `M1.9-T03` | PostgreSQL transaction and idempotency tests. | Partial commits or duplicate effects after retry. |
| `M1.9-T04` | ArtifactStore conformance. | An unverified, mutable, missing, or wrongly identified object. |
| `M1.9-T05` | Neo4j projection replay and lag tests. | Duplicate, stale, unrebuildable, or silently lagging graph state. |
| `M1.9-T06` | Worker and malformed-document tests. | Unbounded access, invalid manifests, partial mutation, or hidden parse failure. |
| `M1.9-T07` | Rights and abstract-only policy tests. | Unlawful storage or scientific claims exceeding available text depth. |
| `M1.9-T08` | Model-fixture validation and live-adapter isolation. | Provider output bypassing schema, provenance, or proposal quarantine. |
| `M1.9-T09` | Grounded-response entailment fixtures. | A material statement lacking packet-bound evidence. |
| `M1.9-T10` | DraftArtifact provenance and citation tests. | Unsupported prose, invented metadata, or renderer-induced meaning drift. |
| `M1.9-T11` | Interface state and dropped-stream recovery tests. | Duplicate commands or async work displayed as trusted current state. |
| `M1.9-T12` | Backup, rebuild, and recovery exercise. | Loss of active identity, history, artifacts, or projection reproducibility. |
| `M1.9-T13` | Pinned AG-UI SDK conformance, event-ordering, custom-event, interrupt, replay, cancellation, and adapter-boundary tests. | Protocol drift, authority leakage, duplicate effects, or raw AG-UI types entering Petra core or feature components. |

### M1 exit gate

| ID | Acceptance specification |
| --- | --- |
| `M1.9-AC01` | `M1.9-DEMO-01`–`M1.9-DEMO-15` pass from a documented clean start. |
| `M1.9-AC02` | Every failed operation is attributable to a named component and recorded terminal state. |
| `M1.9-AC03` | Every displayed scientific relation and material DraftSpan resolves to authoritative provenance without reading the chat transcript. |
| `M1.9-AC04` | `M1.9-T01`–`M1.9-T13` pass and leave inspectable repository evidence. |

## After M1

### M2 — literature research loop

Expand from one paper to a reusable corpus and one bounded research question:

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M2-W01` | `planned` | Add scholarly discovery, identity resolution, and rights-aware acquisition. | Petra must find legitimate literature without admitting random web claims as evidence. |
| `M2-W02` | `planned` | Reuse canonical Works, WorkVersions, and Artifacts across projects. | Dozens of papers per Hypothesis should compound into shared knowledge rather than duplicate storage and processing. |
| `M2-W03` | `planned` | Add ingestion queues and processing-depth states. | Corpus growth requires visible, resumable background work. |
| `M2-W04` | `planned` | Add lexical, dense, hybrid, graph, temporal, and adversarial retrieval recipes behind one benchmark interface. | Retrieval choices should be measured per scientific task, not selected by fashion. |
| `M2-W05` | `planned` | Add LandscapeScans and alternative-Hypothesis coverage. | Deep research should be preceded by evidence that alternatives and meaningful literature dialogue exist. |
| `M2-W06` | `planned` | Add calibrated review policies and efficient batch workflows. | Researchers need trustworthy automation without approving every extracted sentence manually. |
| `M2-W07` | `planned` | Build a retrieval judgment set and challenger benchmark. | HippoRAG2 and other candidates need representative, repeatable evaluation. |
| `M2-W08` | `planned` | Strengthen the Research Brief, evidence matrix, Papers, and focused graph views. | Larger corpora need usable orientation and cross-view identity. |
| `M2-W09` | `planned` | Extend DraftArtifacts and citation workflows from observed use. | Longer scientific outputs should follow real researcher needs rather than an exhaustive upfront catalog. |

Do not start M2 until M1's event replay, provenance path, and correction behavior are reliable.

### M3 — Hypotheses and governed agency

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M3-W01` | `planned` | Add Hypothesis ordinals and plain-language descriptors. | Researchers need stable shorthand without losing the proposition's meaning. |
| `M3-W02` | `planned` | Add development, activity, warrant, and lifecycle projections. | Petra's posture should reflect where a Hypothesis is in the research process. |
| `M3-W03` | `planned` | Add snapshot-bound assessments and posture decisions. | Later evidence must not silently rewrite what Petra advised earlier. |
| `M3-W04` | `planned` | Add Findings, Obligations, waivers, and invalidation. | Evidence must generate explicit scientific consequences that can be satisfied or reconsidered. |
| `M3-W05` | `planned` | Separate review modes from CapabilityGrants. | Trust in review automation must not silently grant broader tool authority. |
| `M3-W06` | `planned` | Add proactive background work with visible budgets and stop controls. | Petra should investigate useful alternatives while keeping agency legible and interruptible. |
| `M3-W07` | `planned` | Certify and route additional role-specific models. | Multiple models should be used for demonstrated strengths under recorded contracts. |

Use one pilot Hypothesis and a small registered semantic profile before adding domain breadth.

### M4 — experiment loop

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M4-W01` | `planned` | Add Experiment, ProtocolVersion, and ExecutionPlan. | Experimental intent and procedure must be versioned before execution. |
| `M4-W02` | `planned` | Add a local OCI ExecutionBackend. | Early experiments need reproducible isolation without premature managed-sandbox dependence. |
| `M4-W03` | `planned` | Add Run, Result, Analysis, DecisionCriterion, CriterionEvaluation, and OperationalDecision. | Observations, interpretations, thresholds, and actions must remain distinct. |
| `M4-W04` | `planned` | Record Artifact and environment identity. | A scientific result is not reproducible without exact inputs, code, and runtime. |
| `M4-W05` | `planned` | Classify execution failure and scientific validity separately. | Broken infrastructure must not be misread as disconfirmed science. |
| `M4-W06` | `planned` | Add RootCauseInvestigation. | Unexpected outcomes need a governed diagnostic path before interpretation changes. |
| `M4-W07` | `planned` | Add reproduction types and IndependenceProfile. | Confirmation strength depends on what was independently repeated. |
| `M4-W08` | `planned` | Add progressive ML stage gates. | Cost and rigor should increase only as an experimental idea earns further investment. |
| `M4-W09` | `planned` | Run the accepted Daytona conformance test before hosted untrusted execution. | A managed sandbox must prove Petra's control, identity, networking, and recovery requirements. |

Do not integrate several managed sandbox providers. Run the accepted conformance suite against the provisional target when a real experiment needs it.

### M5 — pilot validation

| ID | Status | Validation specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M5-W01` | `planned` | Run the LLM-as-a-judge bias pilot. | It exercises literature synthesis, measurement validity, and model-evaluation evidence. |
| `M5-W02` | `planned` | Run the single- versus multi-agent pilot under matched resources. | It tests agentic claims while controlling cost, tools, and opportunity. |
| `M5-W03` | `planned` | Evaluate retrieval, extraction, evidence mapping, contradiction coverage, posture, experiment validity, correction burden, language calibration, latency, and cost separately. | Petra needs component-level diagnosis rather than one flattering end-to-end score. |
| `M5-W04` | `planned` | Record architectural assumptions changed by pilot evidence. | Petra should treat its own design as revisable scientific work. |

### M6 — private beta and external integration

| ID | Status | Build specification | Why Petra needs it |
| --- | --- | --- | --- |
| `M6-W01` | `planned` | Stabilize installation, upgrades, backup, recovery, and migrations. | A hosted workbench must preserve research state across operational change. |
| `M6-W02` | `planned` | Validate accessibility and provenance comprehension. | Visible evidence is useful only if researchers can perceive and understand it. |
| `M6-W03` | `planned` | Establish performance and budget policy. | Agentic research must remain responsive and economically bounded. |
| `M6-W04` | `planned` | Complete private-data and threat-model review. | Public use expands the consequences of source, model, and tool access. |
| `M6-W05` | `planned` | Expose deterministic external API access for demonstrated workflows. | Pipelines should invoke the same commands as the workbench without creating a second authority path. |
| `M6-W06` | `planned` | Add an MCP adapter only if external agent use justifies it. | Protocol commitment should follow a concrete integration need. |
| `M6-W07` | `planned` | Add selected reference-manager, LaTeX, notebook, or academic integrations based on observed demand. | Petra should meet researchers in real workflows without guessing every deliverable upfront. |

Wholesale public graph publication remains outside the active implementation plan until a concrete use case appears.

## Deferred from the first build

The following are explicitly absent from M1:

| ID | Status | Deferred capability | Why it is outside M1 |
| --- | --- | --- | --- |
| `M1-D01` | `deferred` | Multi-agent orchestration beyond minimal recorded model roles. | One trusted evidence path must work before coordination multiplies failure modes. |
| `M1-D02` | `deferred` | Learned routing or model-based meta-routing. | Routing needs task traces and role benchmarks first. |
| `M1-D03` | `deferred` | Automated Hypothesis posture transitions. | M1 has no mature Hypothesis lifecycle or behavioral evidence. |
| `M1-D04` | `deferred` | Universal confidence, currentness, or evidence scores. | A single number would erase construct-specific meaning before calibration exists. |
| `M1-D05` | `deferred` | Dense and GraphRAG framework benchmarks. | Representative corpora and relevance judgments do not yet exist. |
| `M1-D06` | `deferred` | HippoRAG2 or another retrieval framework as Petra's authority. | Retrieval implementations are challengers; Petra's graph and evidence contracts remain authoritative. |
| `M1-D07` | `deferred` | CopilotKit, draft AG-UI features, or AG-UI-defined workbench state and components. | M1 uses the official stable SDK headlessly; Petra retains its own UX, commands, state, capabilities, and authority. |
| `M1-D08` | `deferred` | Managed sandbox integration. | Local execution and a conformance suite should expose actual requirements first. |
| `M1-D09` | `deferred` | Full experiment execution. | M1 establishes literature evidence and composition, not experimental authority. |
| `M1-D10` | `deferred` | MCP server or public API contract. | External interfaces should follow demonstrated internal commands and user workflows. |
| `M1-D11` | `deferred` | Exhaustive paper-section or OutputProfile catalog. | Petra needs extensible semantics informed by real research use. |
| `M1-D12` | `deferred` | Real-time collaboration. | M1 targets an individual research workbench. |
| `M1-D13` | `deferred` | Public graph or wholesale project publication. | No concrete wholesale publication use case has been established. |
| `M1-D14` | `deferred` | Fine-tuning through Tinker. | Prompt, graph, and model-routing evidence should identify a real fine-tuning target first. |
| `M1-D15` | `deferred` | Mobile parity and final visual identity work. | Core scientific comprehension and desktop workbench behavior come first. |

## Verification and evidence policy

Each slice must leave evidence of completion in the repository:

| ID | Required completion evidence | Why Petra requires it |
| --- | --- | --- |
| `EV01` | Tests and fixtures. | Behavior must be repeatable, including expected rejection. |
| `EV02` | Migration and schema versions. | Stored meaning must be recoverable across software changes. |
| `EV03` | Example commands or scripted acceptance flows. | Another developer must be able to reproduce the claimed capability. |
| `EV04` | Recorded failure cases. | Scientific and operational limits must remain visible. |
| `EV05` | Artifact and snapshot manifests. | Results must name their exact inputs and research state. |
| `EV06` | Trace or projection diagnostics. | Latency, cost, routing, and stale derived state need component attribution. |
| `EV07` | A short implementation note when observed behavior changes a design assumption. | Architecture should change in response to evidence without losing its rationale. |

“Implemented” means the behavior passes its gate. A file, endpoint, database table, or UI panel alone does not complete a slice.

## Change control

Implementation discoveries should update the smallest relevant document:

| ID | Change type | Authoritative document |
| --- | --- | --- |
| `CC01` | Schema and invariant detail | `PETRA_GRAPH_MODEL.md` |
| `CC02` | Consequential reversible architecture choice | A focused decision document |
| `CC03` | Build order, work-item status, and current gate | `implementation_roadmap.md` |
| `CC04` | Product scope | `PETRA.md` |
| `CC05` | Milestone status | `ROADMAP.md` |

Do not create an ADR for routine library selection unless it changes Petra's scientific semantics, authority boundary, portability, privacy, or replacement cost.

## Next implementation discussion

`M1.0-DEC01`, `M1.0-DEC02`, `M1.0-DEC03`, `M1.0-DEC04`, and `M1.0-DEC06` are resolved. Retain completed discussions for traceability and resolve the remaining questions one at a time:

| ID | Status | Needed by | Discussion or outcome | Why it matters |
| --- | --- | --- | --- | --- |
| `DISC-01` | `complete` | `M1.0-W05` | Use Docker Desktop as the M1 reference runner over a portable Compose contract. | It fixes the tested bootstrap environment without making Docker Desktop part of Petra's domain architecture. |
| `DISC-02` | `complete` | `M1.0-W10`–`M1.0-W14` | Use Hono on Node with React/Vite and React Router Data Mode; retain Fastify as the first fallback only after a recorded `D014-HC01`–`D014-HC10` failure. | It fixes the application shell and protocol host while keeping AG-UI and framework types outside the core. |
| `DISC-03` | `complete` | `M1.0-W09`, `M1.1-W13` | Use JSON Schema Draft 2020-12 as canonical; Ajv 2020 and Python `Draft202012Validator` enforce it; pinned `json-schema-to-typescript` generates declarations; Pydantic remains downstream; shared fixtures and RFC 8785 hashes prove parity. | It fixes one durable contract spine without making a runtime library, framework, or generator authoritative. |
| `DISC-04` | `complete` | `M1.0-W15`, `M1.0-DEC05`, `M1.2-W01` | D016 accepts forward-only plain SQL through pinned Flyway OSS and Vitest/pytest through disposable Compose; `node-pg-migrate` remains a recorded failed challenger and Testcontainers remains deferred. | The frozen comparison now supplies reproducible evidence for ledger history, upgrade, concurrency, recovery, integration isolation, diagnostics, and cleanup. |
| `DISC-05` | `planned` | `M1.4-W01`–`M1.4-W05` | Which lawful full-text scholarly paper should become the frozen ingestion fixture? | It must be selected before M1.4 but need not become Petra's flagship research topic. |

### DISC-04 completed comparison and decision gate

`DISC-04` is complete. The comparison used the same frozen migrations and database fixtures for each candidate and is recorded in [`experiments/disc-04/EVIDENCE.md`](experiments/disc-04/EVIDENCE.md). D016 accepts Flyway OSS and direct Compose without authorizing runner-specific semantics in Petra's contracts.

| ID | Status | Working hypothesis | Why it is plausible but not locked |
| --- | --- | --- | --- |
| `DISC-04-H01` | `complete` | Keep PostgreSQL migrations forward-only, repository-owned, and expressed as reviewable plain SQL; run them through a separate command rather than API startup. | Accepted in D016 after the frozen migrations passed bootstrap, upgrade, rollback, and recovery cases. |
| `DISC-04-H02` | `complete` | Use pinned Flyway OSS as the leading migration-runner candidate and node-pg-migrate as the first challenger. | Flyway passed all required gates; the challenger failed `T04` and `T07`. |
| `DISC-04-H03` | `complete` | Use Vitest for TypeScript, pytest for Python, and a Petra-owned disposable Compose harness for real PostgreSQL, Neo4j, and S3-compatible integration tests. | The harness passed its normal and controlled-failure lifecycles with zero remaining labeled resources. |
| `DISC-04-H04` | `complete` | Add Testcontainers only if the direct Compose harness fails a recorded lifecycle, isolation, parallelism, diagnostics, or CI-portability gate. | No activation failure occurred; Testcontainers remains deferred. |

#### Frozen comparison

| ID | Required experiment | Passing evidence | Why Petra needs it |
| --- | --- | --- | --- |
| `DISC-04-T01` | Run identical `V001` and `V002` plain-SQL fixtures with each migration candidate against real PostgreSQL. The fixtures cover typed identifiers and revisions, JSONB schema-version checks, a partial unique index, append-only events, idempotency keys, outbox records, and projection checkpoints. | Both candidates receive byte-identical SQL apart from a small, explicitly recorded runner header or filename convention. | The comparison must exercise Petra's expected schema rather than a toy table or vendor-specific DSL. |
| `DISC-04-T02` | Migrate an empty database to head. | The expected history, schema objects, constraints, and invariants exist, and a second run is a no-op. | New environments must bootstrap deterministically. |
| `DISC-04-T03` | Seed data under `V001`, then upgrade to `V002`. | Data, identifiers, revisions, event order, and projection checkpoints survive with the expected transformed schema. | Petra will accumulate long-lived research records that cannot be rebuilt casually. |
| `DISC-04-T04` | Alter a migration after it has been applied. | The runner rejects the changed history before applying later work. A challenger without native checks must demonstrate a bounded, repository-owned equivalent or fail this criterion. | Silent history mutation would make provenance and incident reconstruction unreliable. |
| `DISC-04-T05` | Start two migration processes concurrently against one database. | At most one process applies each migration; neither leaves partial or divergent history. | Hosted startup and CI can create competing migration attempts. |
| `DISC-04-T06` | Inject a failing statement into a transactional migration. | Schema and history roll back together, and diagnostics identify the migration and failing operation. | Failure must be recoverable without ambiguous database state. |
| `DISC-04-T07` | Exercise one operation that cannot use an ordinary transaction and interrupt it once. | The runner's opt-out, failure state, and documented recovery path are explicit and reproducible. | Some future PostgreSQL maintenance operations require different transaction handling; Petra must know the escape hatch before relying on it. |
| `DISC-04-T08` | Start the integration stack under a unique Compose project name, wait on health conditions, run Vitest and pytest fixtures, collect service logs on failure, and remove disposable volumes on success and failure. | One documented command completes the lifecycle without stale ports, containers, networks, or volumes affecting the next run. | Real-service tests are useful only if isolation and cleanup are dependable. |
| `DISC-04-T09` | Compare an empty-to-head database with a `V001`-seeded-and-upgraded database. | A repository-owned schema inspection reports equivalent final objects and invariants, with any expected metadata difference explained. | A long-lived installation and a clean installation must implement the same scientific contract. |
| `DISC-04-T10` | Record cold and warm run time, image and package dependencies, licenses, Docker Desktop behavior on the development machine, CI requirements, and failure diagnostics. | The evidence record contains observations and material tradeoffs; no unearned numerical threshold is used as a proxy for correctness. | Cost, latency, portability, and operator clarity can distinguish candidates after correctness gates pass. |

#### Lock rule

Flyway OSS becomes the default only if `DISC-04-T01`–`DISC-04-T10` pass without a paid service, hidden migration state, or runner-specific authority leaking into Petra's domain and contract layers. If Flyway fails and node-pg-migrate passes the same fixtures—including durable mutation detection—select node-pg-migrate. If neither passes, keep `M1.0-DEC05` open and test the next candidate against the unchanged fixtures. Activate Testcontainers only through the failure rule in `DISC-04-H04`.

`DISC-04` no longer blocks persistence scaffolding. D016 and the comparison evidence govern `M1.2-W01`; the first authoritative migration still waits for the M1.1 contract kernel. `DISC-05` can wait until before M1.4.
