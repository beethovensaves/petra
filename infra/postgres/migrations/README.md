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

`V005__evidence_authority.sql` creates the stable global Claim and Assertion
identity spine and deliberately admits only immutable revision-one quarantine
proposals. Claims and Assertions retain separate typed tables: Claim basis,
SourceSpan grounding, and validator results cannot be confused with Assertion
endpoints and provenance edges. A later forward migration owned by the
ChangeSet slice must explicitly replace the V005 admission restriction before
reviewed revisions can enter this ledger.

`V006__change_control_event_outbox.sql` opens only the reviewed-promotion path
proven by the initial ChangeSet contracts. It persists immutable ChangeSets and
human Approvals, appends trusted Claim and Assertion revisions with exact
authorization, records the command result and domain event, and enqueues the
same event for graph and interface projections in one transaction. Global and
per-consumer positions are allocated transactionally, so rollback creates no
false progress or gaps. Correction, compensating reversal, WorkUnits,
projection checkpoints, and interaction replay remain closed until their later
roadmap slices define and test them.

`V007__work_and_projection_control.sql` persists two operational aggregates
without promoting either into scientific authority. WorkUnits retain immutable
bounded specifications, exact worker inputs, dependencies, revisioned state,
resource observations, staged outputs, failure, retry, and cancellation.
Projection checkpoints retain the authoritative outbox head, contiguous graph
position, visible freshness, immutable Neo4j attempt receipts, exact projected
object revisions, and repair state. Both PostgreSQL repositories rehydrate the
existing in-memory domain engines before every mutation so persistence and
memory do not acquire different transition semantics. WorkUnit checkpoint
creation, scheduling leases, interaction replay, and the Neo4j adapter remain
later slices.

`V008__interaction_authority.sql` persists Petra's pinned AG-UI compatibility
profile, stable interaction-run identity, revisioned lifecycle and stream heads,
content-addressed presentation events, review interrupts, and immutable delivery
receipts. Typed columns retain protocol correlation, ordering, visibility,
Artifact provenance, command-input linkage, and observed WorkUnit state. The
database and storage-neutral repository both enforce the crucial authority
boundary: an interaction event is not a domain event, an interrupt response
does not apply its referenced command, replay does not reexecute authority, and
connection abort does not cancel durable work.
