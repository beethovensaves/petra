# Petra development services

This Compose profile supplies the three M1 persistence roles:

- PostgreSQL 18.6 is the authoritative ledger and metadata store.
- Neo4j Community 2026.07.1 is the rebuildable graph projection.
- SeaweedFS 4.41 supplies the local S3-compatible artifact endpoint.

The optional `tools` profile supplies Flyway OSS 13.4.0 as a short-lived
migration process. `npm run db:info`, `npm run db:validate`, and
`npm run db:migrate` invoke that profile separately from application and worker
startup. The Flyway image is pinned by tag and multi-architecture manifest
digest in `.env`.

All published ports bind to `127.0.0.1`. The values in `.env.example` are
development examples, not deployment credentials.

SeaweedFS is a replaceable development adapter, not a Petra storage contract.
It is used instead of MinIO because the MinIO community repository was archived
in April 2026 and its prebuilt community distribution is no longer maintained.
SeaweedFS remains active, is Apache-2.0 licensed, provides a current multi-arch
container, and exposes the S3 API Petra requires. A hosted profile may replace
it without changing artifact identities or application commands.

The `-admin.port=12646` option avoids SeaweedFS 4.41's default derived gRPC port
falling inside Linux's common ephemeral-port range. Remove the workaround only
after the upstream issue is fixed and the pinned image is retested.

Image references use exact release tags and the multi-architecture manifest
digests pulled and tested on Apple silicon on 2026-08-28. An intentional image
upgrade updates both the tag and digest, then repeats the native service checks.

Flyway uses PostgreSQL session-level advisory locks because transaction-level
locks conflict with `CREATE INDEX CONCURRENTLY`. Its connections set
`ApplicationName=petra-flyway` for diagnosis after an interrupted migration.
Its operational history remains explicitly in `public`, so creating the
application schema named `petra` cannot change later history-table resolution
through PostgreSQL's default `"$user", public` search path.
Non-transactional migrations require an explicit `.sql.conf` sidecar and a
reviewed partial-failure recovery procedure. See D016 and the DISC-04 evidence
before authoring one.
