# DISC-04 migration and integration evidence

- **Status:** Complete
- **Observed:** 2026-08-28
- **Machine:** Apple silicon, Docker Desktop 29.7.2, Compose 5.4.0
- **Runtime:** Node 24.20.0, npm 11.19.0, Python 3.13.7, uv 0.12.5
- **Database:** PostgreSQL 18.6

## Result

Flyway OSS 13.4.0 passes the frozen migration gates. `node-pg-migrate` 9.0.0
does not: it accepts a changed applied SQL migration and its plain-SQL loader
cannot opt one migration out of the per-migration transaction. The direct
Compose integration harness passes its success and controlled-failure paths, so
DISC-04 does not activate Testcontainers.

This result selects an implementation tool. It does not make Flyway metadata,
filenames, or configuration part of Petra's domain, scientific, event, or
runtime-schema authority.

## Frozen inputs

Both migration candidates receive the same SQL bytes from:

- `migrations/001_evidence_spine.sql`;
- `migrations/002_artifact_authority.sql`;
- `fixtures/seed-v001.sql`;
- the transactional and non-transactional failure fixtures under `fixtures/`.

The ordinary fixtures cover typed identifiers and revisions, schema-versioned
JSONB, append-only domain events, stream revisions, idempotency keys, outbox
records, a partial unique index, and projection checkpoints. The candidates
differ only where their runners require a filename convention. Flyway's
non-transactional case also uses its documented `.sql.conf` sidecar with
`executeInTransaction=false`.

## Gate results

| Gate | Flyway OSS 13.4.0 | `node-pg-migrate` 9.0.0 | Observed evidence |
| --- | --- | --- | --- |
| `T01` identical SQL | Pass | Pass | Each runner applied the two canonical SQL files and produced the same inspected PostgreSQL objects. |
| `T02` empty to head | Pass | Pass | Each created two history entries; the second run was a no-op. |
| `T03` seeded upgrade | Pass | Pass | The V001 record, event position, outbox record, and projection checkpoint survived V002. Append-only, duplicate-idempotency, and JSON schema-version violations were rejected. |
| `T04` changed history | Pass | **Fail** | Flyway rejected the V001 checksum change before V002. `node-pg-migrate` skipped the changed V001 and applied V002 because its history table stores no migration checksum. |
| `T05` concurrent launch | Pass | Pass | Two processes exited cleanly and left exactly two history entries. Flyway used PostgreSQL session-level advisory locking; `node-pg-migrate` used advisory-lock wait mode. |
| `T06` transactional failure | Pass | Pass | A V002 division-by-zero failure removed the probe table and left only V001 in history; each diagnostic named V002 and the database error. |
| `T07` non-transactional interruption | Pass | **Fail** | Flyway created an index concurrently outside a transaction, was killed during a following sleep, left the committed index visible, and recovered after the stale identified session was terminated, the partial index was removed, and the migration was rerun. The plain-SQL `node-pg-migrate` path rejected `CREATE INDEX CONCURRENTLY` inside its per-file transaction. |
| `T08` disposable integration | Pass | Pass | A unique Compose project started healthy PostgreSQL, Neo4j, and S3-compatible services on dynamic loopback ports. Vitest passed 4 service tests and pytest passed 2. A forced Vitest and pytest failure captured service logs. Both paths ended with zero labeled containers, networks, or volumes. |
| `T09` schema equivalence | Pass | Pass | Repository-owned inspection found equivalent columns, constraints, indexes, triggers, and domains for empty-to-head and V001-seeded upgrade paths. Final application schemas also matched across candidates after successful ordinary migrations. |
| `T10` operations, cost, and diagnostics | Pass | Pass | Dependencies, licenses, runtimes, observed durations, Docker behavior, CI requirements, and failure output are recorded below. Correctness gates decide the selection; duration does not override T04 or T07. |

## T07 recovery finding

Flyway's default PostgreSQL transactional advisory lock caused `CREATE INDEX
CONCURRENTLY` to wait on Flyway's own transaction during the first exploratory
run. The passing configuration uses the documented
`flyway.postgresql.transactional.lock=false` setting, which replaces it with a
session-level lock.

Killing the Flyway container left one PostgreSQL backend and its session lock
alive long enough to block an immediate retry. The fixture made Flyway sessions
identifiable with `ApplicationName=petra-disc04-flyway`, confirmed that the
owning process was gone, terminated that one stale backend, removed the partial
index, ran `repair`, and reapplied the corrected, not-yet-successful migration.
`repair` reported no failed history row because the killed process had not
recorded one.

Production recovery must preserve the same order and narrower identity:

1. stop other migration launches;
2. inspect `pg_stat_activity` and confirm that the identified Flyway process no
   longer exists;
3. terminate only its stale PostgreSQL backend if the session lock remains;
4. inspect and manually reverse partial effects from the non-transactional SQL;
5. run `repair` only for failed or interrupted history state;
6. rerun the unapplied migration and validate the schema history.

Petra must never use `repair` to bless a checksum change to a successfully
applied migration.

## Operational observations

The final migration run observed a roughly 5.7-second disposable PostgreSQL
cold start. Flyway's candidate cases took about 13.2 seconds in total;
`node-pg-migrate` took about 0.44 seconds. The Flyway figure includes repeated
short-lived Docker/JVM processes. These are machine-specific observations, not
performance thresholds. Migration correctness and recoverability outweigh this
development-only latency, and migrations remain separate from API startup.

The successful three-service integration run observed:

- about 7.3 seconds to start and health-check the stack;
- 4 passing Vitest service assertions, including a PostgreSQL transaction,
  authenticated Neo4j Cypher, and signed S3 bucket listing;
- 2 passing pytest assertions covering loopback binding and reachability;
- about 3.5 seconds to stop services and delete volumes;
- zero remaining Compose-labeled containers, networks, or volumes.

The controlled-failure run failed both language-native probes as instructed,
captured the last 40 service-log lines, and reached the same zero-resource
cleanup state.

## Dependencies, licenses, and CI

| Component | Pinned candidate | License or cost observation | Runtime boundary |
| --- | --- | --- | --- |
| Flyway | `flyway/flyway:13.4.0@sha256:e19dbd5c73a1487d825ffe02f9e11e0ce3f37b80bbc012ece1cba15af4f9f9ce` | Flyway OSS is Apache-2.0 licensed; the OSS Docker image requires no paid service or license key. | Short-lived Docker/JVM process |
| `node-pg-migrate` | `node-pg-migrate@9.0.0` with `pg@8.16.3` | MIT licensed; no paid service. | Petra's Node process or a separate Node command |
| Integration lifecycle | Petra-owned Compose files | Uses the already selected Docker Desktop development runtime; no Testcontainers dependency or paid cloud feature. | Docker Compose plus Vitest and pytest |

CI needs a Linux Docker daemon with Compose, the pinned multi-architecture
images, workspace bind mounts, dynamic localhost ports, Node 24.20.0, npm
11.19.0, Python 3.13.7, and uv 0.12.5. CI must run migrations as a separate job
before admitting application traffic. Hosted deployment must supply database
credentials through its secret mechanism rather than command-line arguments or
repository files.

## Reproduction

From the Petra repository root with Docker running:

```sh
npm run disc04:compare
npm run disc04:integration
node experiments/disc-04/run-integration.mjs --force-test-failure
```

The third command is expected to exit nonzero. Its evidence is a controlled
test failure, captured service logs, successful Compose teardown, and zero
remaining labeled resources.

## Sources used for the operational configuration

- [Flyway PostgreSQL transactional lock](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-postgresql-namespace/flyway-postgresql-transactional-lock-setting)
- [Flyway script configuration](https://documentation.red-gate.com/flyway/reference/script-configuration)
- [Flyway Docker and OSS image](https://documentation.red-gate.com/flyway/reference/usage/flyway-docker)
- [Flyway open-source repository and license](https://github.com/flyway/flyway)
- [`node-pg-migrate` repository and license](https://github.com/salsita/node-pg-migrate)
