# D016: Flyway migrations and direct Compose integration harness

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** PostgreSQL migration format and runner, migration locking and recovery, development and CI invocation, real-service integration lifecycle, language-native test runners, and Testcontainers activation boundary
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D011](D011-experiment-sandbox-and-reproducibility.md), [D015](D015-language-neutral-runtime-contracts.md)
- **Resolves:** `M1.0-DEC05` and `DISC-04`
- **Evidence:** [DISC-04 migration and integration evidence](../experiments/disc-04/EVIDENCE.md)

## Decision

Petra will use repository-owned, forward-only PostgreSQL SQL migrations and run
them through the pinned Flyway OSS Docker image. Migration execution remains a
separate command and deployment step; API or worker startup will never apply a
schema migration implicitly.

M1 integration tests will use Petra-owned Compose files with unique project
names, health checks, dynamic loopback ports, captured failure logs, and
unconditional removal of disposable volumes. Vitest remains the TypeScript test
runner and pytest remains the Python test runner. Petra will not add
Testcontainers while this direct harness satisfies the recorded lifecycle,
isolation, diagnostics, and cleanup requirements.

The selected versions and configuration are:

| Concern | Selected mechanism | Authority limit |
| --- | --- | --- |
| Migration source | Versioned `.sql` files under `infra/postgres/migrations` | SQL defines PostgreSQL schema changes; it does not define Petra's portable runtime schemas or scientific meaning. |
| Migration runner | Flyway OSS 13.4.0, pinned by release tag and manifest digest | Flyway orders, locks, validates, and records migrations; its metadata is operational state, not domain authority. |
| Ordinary transaction behavior | One Flyway transaction per migration on PostgreSQL | A migration review must not assume this behavior for a file explicitly marked non-transactional. |
| PostgreSQL lock mode | Session-level advisory locks through `flyway.postgresql.transactional.lock=false` | Required for statements such as `CREATE INDEX CONCURRENTLY`; interrupted sessions require explicit diagnosis. |
| Non-transactional escape hatch | A matching `.sql.conf` sidecar with `executeInTransaction=false` | Allowed only when PostgreSQL cannot execute the operation in an ordinary transaction and the migration records partial-failure recovery. |
| Integration lifecycle | Direct Docker Compose, Vitest, and pytest | Owns disposable test orchestration only; it does not enter application core or production topology. |

## Migration contract

An accepted migration follows these rules:

1. It is forward-only, reviewable PostgreSQL SQL named
   `V<zero-padded version>__<short_description>.sql`.
2. A successfully applied migration is immutable. A correction is a new
   migration, never a changed checksum.
3. Flyway validates applied history before later work and fails closed on a
   checksum mismatch.
4. The migration command runs before application traffic is admitted and never
   inside Hono, a worker, or a model-controlled action.
5. Ordinary migrations stay transactional. A non-transactional sidecar needs a
   review note naming possible partial objects, inspection queries, reversal,
   stale-session handling, and safe rerun steps.
6. Flyway identifies its PostgreSQL connections through a configured
   `ApplicationName`. Operators confirm process ownership before terminating a
   stale backend.
7. `repair` may remove or reconcile failed and interrupted history after the
   database state is inspected. It may not accept a modified successful
   migration.
8. Flyway version and image-digest changes repeat DISC-04's history mutation,
   concurrency, rollback, non-transactional recovery, and schema-equivalence
   fixtures before adoption.

Flyway configuration stays in the PostgreSQL adapter and deployment tooling.
`flyway_schema_history`, Flyway filenames, Docker image names, JDBC types, and
`.sql.conf` files remain absent from Petra's core packages, canonical JSON
Schemas, domain events, graph records, and scientific records.

## Why Flyway won the comparison

Both candidates applied the ordinary SQL, preserved seeded evidence through an
upgrade, serialized concurrent runs, rolled back a failed transactional
migration, and produced equivalent final application schemas.

Flyway passed the two differentiating safety gates:

- it rejected a changed applied migration before applying later work;
- it executed a PostgreSQL non-transactional operation through an explicit
  per-script setting and supported a visible interruption and recovery path.

`node-pg-migrate` 9.0.0 failed both gates under Petra's plain-SQL constraint. It
stored the applied filename and timestamp but no checksum, so it silently
accepted the altered V001 and applied V002. Setting `singleTransaction=false`
still wrapped each plain-SQL migration in its own transaction, so PostgreSQL
rejected `CREATE INDEX CONCURRENTLY`. A custom checksum ledger and a custom SQL
loader could compensate, but Petra would then own correctness mechanisms that
Flyway already supplied and tested.

Flyway's repeated Docker/JVM startup was materially slower in the local spike,
but migrations do not run on user queries or application startup. That latency
does not justify weakening migration-history integrity or adding a Petra-owned
migration engine.

## Integration harness contract

Every real-service integration run must:

- use a unique Compose project name;
- bind published test ports to `127.0.0.1` and let Docker select the host ports;
- wait for native service health before starting tests;
- expose explicit test URLs through process-local environment variables;
- run Vitest and pytest against the real PostgreSQL, Neo4j, and S3-compatible
  endpoints;
- capture bounded service logs when a test or startup step fails;
- execute `down --volumes --remove-orphans` in a finalization path;
- verify that no containers, networks, or volumes with the project label
  remain.

The controlled-failure fixture remains part of harness conformance. It is not a
normal CI job, but it must be rerun after material Compose or harness lifecycle
changes.

## Cost and licensing

The selected `flyway/flyway` image is the open-source Flyway distribution under
Apache License 2.0. It requires no Flyway account, paid Redgate tier, license
key, or managed service for Petra's selected features. The direct integration
harness uses the already selected Docker runtime and adds no paid cloud or test
orchestration product.

Petra will not use a Redgate Teams or Enterprise feature without a separate
decision that records the required capability, licensing terms, cost, and an
open alternative. Image license and official terms must be rechecked during a
major Flyway upgrade or before public distribution.

## Options considered

### Flyway OSS with forward-only SQL

Selected. It passed every frozen correctness and recovery gate while keeping
the schema legible as plain PostgreSQL SQL.

### `node-pg-migrate` with plain SQL

Rejected as the M1 default. Its Node-native speed and small runtime boundary are
attractive, but the tested version failed applied-history mutation detection
and the non-transactional plain-SQL case.

### A Petra checksum and transaction wrapper around `node-pg-migrate`

Rejected. This would create a second migration-integrity implementation and a
custom SQL-loader convention before Petra has evidence that owning either is
necessary.

### Testcontainers

Deferred. The direct Compose harness passed unique naming, health waits,
dynamic ports, language-native tests, failure logs, and cleanup on both success
and controlled failure.

## Consequences

### Benefits

- Applied SQL history fails closed when a migration file changes.
- PostgreSQL migration semantics remain visible and independent of TypeScript
  or Python code generation.
- Application startup stays fast and operationally separate from schema
  authority.
- Real-service integration tests use one inspectable lifecycle and no second
  orchestration library.
- The selected path requires no paid migration or testing service.

### Costs and risks

- Developers and CI need Docker to run the Java-based Flyway image.
- Repeated Flyway invocations have noticeable startup overhead on the tested
  development machine.
- PostgreSQL session-level migration locks can outlive an abruptly killed
  client until the backend detects disconnection or an operator terminates the
  identified stale session.
- Non-transactional migrations can leave partial schema effects and therefore
  need case-specific recovery instructions.
- The direct Compose harness remains Petra-maintained process code and must keep
  proving cleanup as its topology grows.

## Validation and revisit triggers

D016 remains valid while:

- the pinned Flyway OSS image passes DISC-04's ten gates;
- the production migration directory contains plain forward SQL and narrowly
  scoped sidecars only;
- migration types and history remain outside the core and canonical schemas;
- direct Compose tests remain isolated, diagnosable, and clean on success and
  failure;
- the selected features require no paid Flyway tier.

Reconsider the runner if an upgrade removes an OSS capability Petra uses,
changes licensing materially, fails checksum or lock behavior, cannot support a
required PostgreSQL operation, or creates an unacceptable CI or security
boundary. Activate Testcontainers only after a recorded direct-Compose failure
in lifecycle, parallel isolation, diagnostics, cleanup, or CI portability, and
run the same fixture against the proposed replacement.

## References considered

- [DISC-04 evidence](../experiments/disc-04/EVIDENCE.md)
- [Flyway PostgreSQL transactional lock](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-postgresql-namespace/flyway-postgresql-transactional-lock-setting)
- [Flyway script configuration](https://documentation.red-gate.com/flyway/reference/script-configuration)
- [Flyway Docker](https://documentation.red-gate.com/flyway/reference/usage/flyway-docker)
- [Flyway open-source repository](https://github.com/flyway/flyway)
- [`node-pg-migrate` repository](https://github.com/salsita/node-pg-migrate)
