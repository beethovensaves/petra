# Petra

> Where hypotheses earn their edges.

Petra is a graph-native scientific research workbench. M1.0–M1.2 now supply the
developer runtime, shared TypeScript/Python contract path, PostgreSQL authority,
verified S3-compatible Artifact storage, durable interaction history, Hono
server, React workbench shell, and official AG-UI interaction boundary. M1.3
adds the frozen Paper Trail retrieval baseline and the PostgreSQL-authorized,
official-driver Neo4j projection with bounded queries and rebuild. The current
interaction remains a deterministic boundary fixture, not yet a
literature-research or model-backed scientific run; lawful full-text ingestion
is the next implementation slice.

## Required software

| Tool | Petra version | Current machine |
| --- | --- | --- |
| Node.js | 24.20.0 LTS | Installed and active. |
| npm | 11.19.0 | Installed and active. |
| Python | 3.13.7 | Installed. `uv` also honors `workers/science/.python-version`. |
| uv | 0.12.5 | Installed. |
| Docker Desktop | Current Apple-silicon release with Compose | Docker 29.7.2 and Compose 5.4.0 are active. |

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
digest-pinned Flyway OSS profile. Eight M1.2 migrations establish immutable
research scope, scholarly identity, Artifact and document authority, evidence,
ChangeSets, events and outbox records, durable work and projection control, and
interaction history. Later migrations extend the ledger without changing an
applied migration's checksum.

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
| `npm run dev` | Run Hono on port 4310 and the Vite workbench on port 4311 with API proxying. |
| `npm run build` | Compile the server and build the workbench into `apps/server/public`. |
| `npm start` | Serve the built workbench and Petra HTTP routes from one Node process. |
| `npm run test` | Run contract, core, always-on S3, server-conformance, and Python tests. |
| `npm run test:retrieval` | Run the exact Paper Trail lexical, citation-direction, bounded-path, and scientific-semantics regression baseline. |
| `npm run test:server` | Run `D014-HC01`–`D014-HC10` against a real local Hono listener. |
| `npm run test:postgres:integration` | Migrate a disposable PostgreSQL instance, test the typed repository, validate Flyway history, and remove every labeled resource. |
| `npm run test:neo4j:integration` | Migrate disposable PostgreSQL, project reviewed authority through real Neo4j, exercise bounded queries/rebuild, and remove every labeled resource. |
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
terminal events; review interruption; replay; idempotent commands; explicit
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
