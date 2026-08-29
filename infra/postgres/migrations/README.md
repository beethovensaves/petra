# PostgreSQL migrations

This directory holds Petra's authoritative forward-only PostgreSQL migrations.
M1.0 selected the runner and established the command surface; M1.2 begins with
`V001__research_scope.sql`, after the M1.1 contract kernel fixed the persisted
identifiers and envelopes.

Migration rules:

- name files `V<zero-padded version>__<short_description>.sql`;
- write reviewable PostgreSQL SQL rather than a Flyway or application DSL;
- never alter an applied version; add a new forward migration;
- keep migration execution separate from API startup;
- allow Flyway to wrap ordinary migrations in a transaction;
- when PostgreSQL requires a non-transactional operation, add a matching
  `.sql.conf` sidecar containing `executeInTransaction=false` and document the
  partial-failure recovery procedure in the migration review;
- do not use `repair` to accept a checksum change to a successfully applied
  migration.

The development command uses PostgreSQL session-level advisory locks because
transaction-level locks conflict with operations such as `CREATE INDEX
CONCURRENTLY`. The runner identifies its PostgreSQL sessions with
`ApplicationName=petra-flyway` so an interrupted process can be diagnosed
without guessing which connection owns a stale lock. Flyway's operational
history schema is fixed to `public`; otherwise creating the application schema
named `petra` changes PostgreSQL's `"$user", public` search-path resolution for
later Flyway connections.

`V001__research_scope.sql` creates only the first persistence slice: immutable
Actors, stable Project identities, immutable Project revisions, and a guarded
current-revision pointer. It stores validated canonical payloads for exact
recovery while keeping identity, authorship, lifecycle, privacy, namespace, and
revision fields queryable and constrained.

`V002__scholarly_identity.sql` extends the same pattern to global Author, Work,
WorkVersion, and ExternalIdentifier identities. One canonical entity head and
revision ledger owns common history, while typed tables retain authorship,
version, publication, metadata-source, and exact identifier-subject relations
for ordinary SQL queries and referential constraints.
