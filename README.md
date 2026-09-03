# Petra

> Where hypotheses earn their edges.

Petra is a graph-native scientific research workbench. M1.0–M1.2 now supply the
developer runtime, shared TypeScript/Python contract path, PostgreSQL authority,
verified S3-compatible Artifact storage, durable interaction history, Hono
server, React workbench shell, and official AG-UI interaction boundary. M1.3
adds the frozen Paper Trail retrieval baseline and the PostgreSQL-authorized,
official-driver Neo4j projection with bounded queries and rebuild. M1.4 adds a
lawful full-text calibration paper and an offline, proposal-only Docling worker
that emits stable geometry-backed SourceSpans through shared contracts. M1.5 now
adds deterministic and model-gateway evidence proposals, independent quarantine
admission, human-reviewed promotion, graph projection, and compensating
reversal. Its official AG-UI boundary now resolves a durable review interrupt
through the same authority commands as direct review. A certified Qwen3.5 local
extractor now exercises the real quarantine route. An opt-in Codex App Server
provider can also use the researcher's managed ChatGPT subscription for bounded
agentic and coding work, but is not certified for scientific extraction. The
current interaction is not yet a literature-research run.

## Required software

| Tool | Petra version | Current machine |
| --- | --- | --- |
| Node.js | 24.20.0 LTS | Installed and active. |
| npm | 11.19.0 | Installed and active. |
| Python | 3.13.7 | Installed. `uv` also honors `workers/science/.python-version`. |
| uv | 0.12.5 | Installed. |
| Docker Desktop | Current Apple-silicon release with Compose | Docker 29.7.2 and Compose 5.4.0 are active. |
| Codex CLI | Optional; required only for the subscription provider | Codex CLI 0.151.0 passed the current App Server smoke test. |

For the current Apple-silicon development machine, install Docker Desktop from
the [official macOS installer](https://docs.docker.com/desktop/setup/install/mac-install/)
and start it once. Install Node 24.20.0 through a version manager, the official
installer, or Homebrew's `node@24`; do not replace the repository pin with an
unrelated installed version.

With Homebrew, activate the pinned Node release in the current shell before
running Petra commands:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
```

No database, graph engine, object store, or Python package needs to be installed
directly on macOS. Docker and the project lockfiles own those dependencies.

## First bootstrap

From the repository root:

```sh
cp .env.example .env
npm run check:prerequisites
npm run bootstrap
npm run services:up
npm run db:migrate
npm run verify
```

`services:up` starts PostgreSQL, Neo4j, and the S3-compatible artifact service,
then waits for their health checks. `db:migrate` runs the separately selected,
digest-pinned Flyway OSS profile. Ten forward-only migrations establish
immutable research scope, scholarly identity, Artifact and document authority,
evidence, ChangeSets, events and outbox records, durable work and projection
control, interaction history, scientific reversal, and model execution records.
Later migrations extend the ledger without changing an applied migration's
checksum.

## Daily commands

| Command | Purpose |
| --- | --- |
| `npm run services:up` | Start local persistence services and wait until healthy. |
| `npm run services:health` | Show container state and health. |
| `npm run services:logs` | Show the latest service diagnostics. |
| `npm run services:down` | Stop services while preserving named volumes. |
| `npm run services:reset` | Stop services and delete their disposable local volumes. |
| `npm run db:info` | Show applied, pending, and failed PostgreSQL migrations. |
| `npm run db:validate` | Validate available migrations against applied Flyway history. |
| `npm run db:migrate` | Validate and apply pending forward PostgreSQL migrations. |
| `npm run contracts:generate` | Regenerate TypeScript declarations from canonical JSON Schema. |
| `npm run fixtures:generate` | Regenerate deterministic Petra records for the frozen M1.4 full-text fixture. |
| `npm run fixtures:check-generated` | Verify the full-text source hashes and prove its generated records are current. |
| `npm run models:docling` | Download the pinned Docling layout and TableFormer assets into the ignored local cache and verify their hashes. |
| `npm run models:docling:check` | Verify all required local Docling model files without downloading anything. |
| `npm run dev` | Run Hono on port 4310 and the Vite workbench on port 4311 with API proxying. |
| `npm run build` | Compile the server and build the workbench into `apps/server/public`. |
| `npm start` | Serve the built workbench and Petra HTTP routes from one Node process. |
| `npm run test` | Run contract, core, always-on S3, server-conformance, and Python tests. |
| `npm run test:retrieval` | Run the exact Paper Trail lexical, citation-direction, bounded-path, and scientific-semantics regression baseline. |
| `npm run test:server` | Run `D014-HC01`–`D014-HC10` against a real local Hono listener. |
| `npm run test:postgres:integration` | Migrate a disposable PostgreSQL instance, test the typed repository, validate Flyway history, and remove every labeled resource. |
| `npm run test:neo4j:integration` | Migrate disposable PostgreSQL, project reviewed authority through real Neo4j, exercise bounded queries/rebuild, and remove every labeled resource. |
| `npm run test:docling:integration` | Run the lawful PDF twice through local Docling, cross-validate all spans in TypeScript/Python, and prove malformed-PDF containment. |
| `npm run test:evidence-proposals:integration` | Parse the lawful PDF once, admit grounded primary and qualification pairs into quarantine, and reject a fabricated SourceSpan without partial state. |
| `npm run test:codex-app-server:integration` | Start a real Codex App Server sidecar, use the existing managed ChatGPT session for one ephemeral read-only no-tool turn, verify AG-UI and graph-runtime translation, and close it. |
| `npm run test:s3:integration` | Test streaming, verification, publication, readback, deduplication, and cleanup against disposable S3-compatible storage. |
| `npm run test:integration` | Run Vitest and pytest against disposable real services, then delete the stack. |
| `npm run measure:m1-boundary` | Rebuild and measure the isolated browser cost of Petra's AG-UI client boundary. |
| `npm run verify` | Run generation, formatting, linting, type checking, and tests. |

`services:reset` destroys local development data. Use it only when that is the
intended recovery action.

## Current contract proof

`packages/contracts` contains the canonical Draft 2020-12 schemas, their
versioned registry, accepted and rejected fixtures, and expected RFC 8785 bytes
and SHA-256 identities. Vitest uses Ajv 2020; pytest uses Python
`Draft202012Validator`. Both runtimes must
accept, reject, and hash the same fixtures without input mutation.

Generated TypeScript declarations are committed for inspection but never become
runtime authority. Pydantic consumes canonically validated data inside the
Python worker and cannot broaden the shared contract.

## Paper Trail compatibility proof

`fixtures/paper-trail` contains exact byte copies of the 50-Work CC0 OpenAlex
snapshot and source manifest used by the earlier teaching baseline. The
`@petra/retrieval` adapter independently reproduces its title-weighted BM25,
year filter, directed neighborhoods, bounded paths, citation orientation, and
chronology warnings. Tests pin the real corpus's ranking and scores rather than
only checking a synthetic example.

This sample is abstract-only and does not establish peer-review status,
methodological quality, agreement, or scientific support. Its graph relation is
only `CITES`; Petra cannot promote it to `SUPPORTS` without proposition-level
evidence, inspectable SourceSpans, and the scientific-authority review path.
Exact provenance, hashes, limits, and preserved behavior are recorded in the
[Paper Trail fixture notes](fixtures/paper-trail/README.md) and
[M1.3 baseline report](reports/M1.3-PAPER-TRAIL-BASELINE.md).

## Neo4j projection proof

`@petra/neo4j` uses the official `neo4j-driver` behind Petra's storage-neutral
graph-store and query ports. The production projector accepts only the next
PostgreSQL `neo4j_graph` outbox record, resolves its exact authoritative
dependencies, commits Neo4j, and then records the backend receipt and advances
the PostgreSQL checkpoint. Exact retries converge; gaps, changed identities,
and stale revisions fail closed.

The read model exposes Work, WorkVersion, Artifact, SourceSpan, Claim, and
Project nodes; visible typed provenance and Assertion relationships; stable
Petra IDs, revisions, hashes, trust/review state, and projection positions; and
bounded identity, neighborhood, provenance, evidence, citation, and freshness
queries. Neo4j stores SourceSpan selectors and hashes, not selected source text.
`CITES` is a bibliographic class and is excluded from scientific-evidence
queries.

Run `npm run test:neo4j:integration` for the disposable cross-database proof.
For graph shape, Browser inspection queries, limits, and rebuild behavior, see
the [Neo4j adapter notes](infra/neo4j/README.md) and
[M1.3 projection report](reports/M1.3-NEO4J-PROJECTION.md).

## Lawful full-text calibration source

M1.4 freezes the exact nine-page publisher PDF of Wilkinson et al. (2016), “The
FAIR Guiding Principles for scientific data management and stewardship.” The
article is peer-reviewed and the exact copy is CC BY 4.0. Its 254,899 bytes,
publisher response metadata, Crossref observation, full 53-author credit list,
Work/WorkVersion identity, Artifact manifest, and copy-specific RightsDecision
are checked in and hash-pinned.

The fixture deliberately keeps redistribution rights separate from execution
authority: CC BY permits the local fixture and attributed redistribution, while
remote-model egress remains disabled. Its prose, multi-column reading order,
and two boxed structures provide the Docling calibration target; one broad
claim and one source-local qualification are frozen for SourceSpan and evidence
admission round-trip tests. See the
[fixture notes](fixtures/full-text/fair-guiding-principles/README.md).

The science worker runs Docling 2.121.0 with a pinned born-digital PDF recipe
and locally hash-verified model assets. It stages a gzipped native parser
Artifact, a contract-valid document parse bundle, a log, and a content-bound
worker output manifest. It has no database or graph mutation capability. The
TypeScript verifier independently checks output bytes, contracts, authority
links, block ordering, text hashes, code-point offsets, page geometry, and both
frozen source targets before treating the result as a quarantine proposal.

Prepare the ignored model cache once with `npm run models:docling`, then run the
two-pass and malformed-input proof with `npm run test:docling:integration`.
The current fixture is correctly labeled `partial` because known Box 2 reading
order, figure-caption, and multipage-block defects remain visible. Exact
configuration, results, and limits are recorded in the
[M1.4 worker report](reports/M1.4-DOCLING-WORKER.md).

## Deterministic evidence proposal proof

M1.5 begins with a model-free reference path. A portable, content-hashed
evidence proposal names the exact parse bundle, source bytes, parser result,
WorkVersion, extractor recipe, Claim–`ASSERTS` pairs, candidate roles, exact
quotes, and SourceSpans. All proposals remain `machine_checked` in quarantine.
The TypeScript control plane independently resolves the declared source chain;
extractor warnings or validator results cannot authorize admission.

Run `npm run test:evidence-proposals:integration` to parse the pinned FAIR paper
once and exercise three deterministic candidates. The page-1 primary Claim and
page-5 qualification enter the in-memory quarantine registry as atomic pairs.
A plausible but fabricated reproducibility guarantee cites a nonexistent span,
is rejected with `SOURCE_SPAN_NOT_IN_BUNDLE`, and leaves no orphaned Claim. The
test uses no remote model. Exact behavior and current limits are recorded in
the [M1.5 deterministic proposal report](reports/M1.5-DETERMINISTIC-PROPOSALS.md).

## Direct evidence review proof

An immutable review projection now gives the interface and assistant one
model-agnostic shape containing the exact quote and surrounding block, pages,
SourceSpan verification, source identity, scientific scope, extraction origin,
declared validators, independent admission result, and proposed action. Human
acceptance and rejection compile to exact ChangeSet and Approval commands.
Corrections preserve the rejected original and create a new independently
grounded proposal with Claim and Assertion supersession lineage.

Review batches are presentation manifests over independently executed command
plans. A stale member cannot roll back or block another valid decision. Run
`npm run test:core` for all direct decision and batch cases, and
`npm run test:postgres:integration` for the disposable durable proof that a
generated review plan becomes trusted revisions plus event/outbox history.
The review command path and its durable evidence are recorded in the
[M1.5 direct review report](reports/M1.5-DIRECT-REVIEW.md).

## Compensating reversal proof

An accepted evidence pair can now leave active authority without losing its
history. Petra builds a second R2 ChangeSet that names the exact promotion it
compensates, requires a human Approval, and writes rejected Claim and Assertion
revision 3. The proposal, trusted revision 2, Approval, commands, and events
remain immutable in PostgreSQL.

The ordered graph projector updates the Claim to visible rejected state and
tombstones the active `ASSERTS` relationship. A real PostgreSQL–Neo4j test
proves the same result after incremental projection and a complete rebuild.
See the
[M1.5 compensating reversal report](reports/M1.5-COMPENSATING-REVERSAL.md)
for semantics, constraints, and evidence.

## Bounded graph-guided retrieval

M1.6 begins with a model-free fast path. Petra can resolve a known object or an
exact Assertion provenance chain directly from the authority graph. Exploratory
queries use a provider-neutral lexical index whose response names its BM25
scorer, Project and object-kind scope, corpus size, rank, score, matched terms,
object revision, and record hash.

The first hybrid recipe resolves each lexical candidate against the current
graph object before expanding a small predicate-explicit neighborhood. Missing,
identity-mismatched, and stale index entries remain visible omissions; they are
never silently supplied as context. The current in-memory index establishes
deterministic behavior for evaluation and leaves the eventual PostgreSQL search
adapter replaceable. Run `npm run test:retrieval`; architecture and limits are
recorded in the
[M1.6 retrieval report](reports/M1.6-RETRIEVAL-FOUNDATION.md).

## Measured model-gateway foundation

The first extractor route now passes through a TypeScript-owned ModelGateway.
The gateway filters deployments by provider policy, data class and egress,
active role certification, scientific scope, structured-output support, health,
context capacity, and hard request budgets. It records eligible and excluded
routes before selecting by expected validated cost, latency, and stable identity.

Model output has its own narrow schema with no Petra object IDs or authority
fields. A schema-valid response must also cite an authorized SourceSpan and use
an exact quote present in the immutable source block. A passing response becomes
a content-bound Claim–`ASSERTS` proposal in quarantine; it cannot write trusted
state. Malformed responses, fabricated quotes, deployment-revision drift, E0
remote routes, and observed budget overruns remain visible but produce no
proposal.

`V010` stores the RoleCertification, logical ModelRequest, physical ModelCall,
raw and validated output, prompt and context identities, validation results,
latency, token use, cost, and proposal bundle as immutable PostgreSQL records.
The three-case certification fixture establishes exact expected behavior, not a
general quality score. The first non-fixture portfolio compares
subscription-backed GPT-5.6 Luna and GPT-5.6 Terra with benchmarked local
open-weight deployments under the same role contract. Pinned Qwen3.5 35B-A3B
passed the bounded extractor suite twice and produced a machine-checked
quarantine proposal through the real gateway; gpt-oss and Qwen2.5 remain
visible failed local candidates. GPT-5.6 Terra passed the same suite twice and
produced machine-checked quarantine proposals through the subscription-backed
gateway route; Luna remains a visible failed candidate. Model agreement is not
treated as scientific corroboration. See the
[M1.5 model-gateway report](reports/M1.5-MODEL-GATEWAY.md).

The active remote candidate uses Codex App Server and managed ChatGPT OAuth. An
official-SDK Responses API adapter remains available for optional future
Platform deployments, but Petra's individual-workbench baseline does not
require an API key. The local implementation uses a separate OpenAI-compatible
HTTP adapter restricted to loopback addresses. All stop at the same
provider-neutral gateway response, and the local adapter requires a
runtime-specific revision resolver before Petra can call its weights exactly
replayable.
The reproducible Docker Model Runner setup and live command are in
[experiments/model-certification](experiments/model-certification/README.md).

## Codex subscription provider

Petra can start Codex App Server as an opt-in local sidecar and use the person's
managed ChatGPT session for coding and agentic experimentation. This is a
separate provider from both the OpenAI Responses API and the local open-weight
runtime.

Enable it for the server process:

```sh
export PETRA_CODEX_APP_SERVER_ENABLED=true
npm run dev
```

The authenticated Petra API then exposes credential-free account status,
entitlement-derived model discovery, managed `chatgpt` or
`chatgptDeviceCode` login, thread and turn commands, interruption, and
command/file approval resolution under
`/api/providers/codex/*`. Petra fixes the workspace root and permits only
`read-only` or `workspace-write` sandboxes at this boundary.

Codex App Server owns OAuth persistence and refresh. Petra never reads or copies
Codex credential files, does not accept `chatgptAuthTokens`, and does not treat
the subscription as general Responses API access. App Server notifications are
translated into AG-UI and provider-neutral graph-runtime observations with no
scientific-authority effect. A strict read-only, no-tool structured extractor
adapter reaches the same provider-neutral ModelGateway port. GPT-5.6 Terra is
active only for the exact certified extractor role; other Codex models and
scientific roles remain inactive until they pass their own Petra suites. See
[D017](decisions/D017-codex-app-server-subscription-provider.md) and the
[live adapter report](reports/M1.5-CODEX-APP-SERVER.md), plus the
[subscription extractor report](reports/M1.5-CODEX-EXTRACTOR-CERTIFICATION.md).

## Durable assistant-mediated review

The review interrupt now names an exact pending interrupt revision and exact
ChangeSet. The browser may submit only `accept` or `reject`, a rationale, a
client retry identity, and those immutable references. Actor and capability
identity come from authenticated server context, never the response body.

Petra records the response as a second immutable interrupt revision with
`command_input_only` effect, then calls the same `SubmitChangeSet →
RecordApproval → ApplyChangeSet` executor used by direct review. Exact retries
return the prior result without another evidence revision or domain event;
malformed, incomplete, stale, conflicting, and unauthorized inputs cannot
apply. The official AG-UI SDK remains contained in the adapter. See the
[M1.5 AG-UI review report](reports/M1.5-AGUI-REVIEW-INTERRUPT.md).

## Workbench visual baseline

`petra_brand_inspiration` is the design source for Petra's palette, typography
roles, interaction principles, rock-first identity, and scientific-IDE layout.
The synchronized delivery rules, module sequence, acceptance criteria, and
design evidence requirements are maintained in the
[design implementation roadmap](design_implementation_roadmap.md).
Parallel frontend work starts from the separate-worktree rules in the
[design terminal handoff](DESIGN_TERMINAL_HANDOFF.md).
The workbench now presents the graph canvas, evidence inspector, and Petra
assistant as synchronized views; preview graph data and the model-free transport
fixture are labeled explicitly. The supplied SVG remains an inspiration asset
rather than the final production logo. Condensed display type, Inter, and
JetBrains Mono use local availability and documented system fallbacks, so startup
does not depend on a remote font service.

## Workbench and interaction proof

`npm run dev` opens the client at `http://localhost:4311`. The workbench uses
React Router Data Mode for addressable project, question, Hypothesis, paper,
evidence, graph, and WorkUnit views. It imports the official AG-UI client only
through `PetraInteractionClient`; AG-UI and Hono types do not enter Petra core.

The fixture demonstrates ordered run, state, activity, custom, tool, text, and
terminal events; durable review interruption; replay; idempotent commands; explicit
cancellation; trace correlation; stream abort; body and authentication limits;
SPA route precedence; concurrent streams; and graceful shutdown. It keeps
connection abort separate from WorkUnit cancellation. PostgreSQL now persists
the exact interaction manifest, run history, event sequence, interruptions, and
replay receipts without making the presentation protocol authoritative. Real
model requests and literature research remain later slices. The ledger and
artifact gates are independently executable with
`npm run test:postgres:integration` and `npm run test:s3:integration`.

The exact conformance results and their limits are in
[M1.0 AG-UI and Hono conformance](reports/M1.0-AGUI-HONO-CONFORMANCE.md).

## Troubleshooting

- If prerequisite checking reports another Node release, activate Node 24.20.0 and rerun it.
- If Docker is missing, install and start Docker Desktop, then confirm
  `docker compose version` succeeds.
- If a host port is occupied, change only the corresponding `*_HOST_PORT` value
  in `.env`; container ports and Petra connection defaults remain unchanged.
- If a service does not become healthy, run `npm run services:logs` before
  stopping it so the failure remains visible.
- If Flyway reports a checksum mismatch for a successful migration, restore the
  applied file and create a new forward migration. Do not use `repair` to accept
  the edit.
- If local service state is intentionally disposable and corrupt, run
  `npm run services:reset`, followed by `npm run services:up`.

Design authority and build order remain in [PETRA.md](PETRA.md),
[ROADMAP.md](ROADMAP.md), and
[implementation_roadmap.md](implementation_roadmap.md).
