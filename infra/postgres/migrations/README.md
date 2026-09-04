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

`V009__scientific_authority_reversal.sql` adds compensating ChangeSets without
rewriting accepted history. A reversal appends superseding Claim and Assertion
revisions, records the relationship to the promotion it compensates, and emits
an immutable `change_set.reverted` ledger event and outbox record. Current
authority moves forward while the proposal, approval, promotion, and reversal
remain inspectable.

`V010__model_execution_records.sql` persists certified extractor executions:
role certifications, bounded requests, ordered calls, and proposal bundles.
Exact hashes and immutable payloads preserve what was selected, what left the
authority boundary, which deployment answered, and what validation accepted.

`V011__grounded_response_authority.sql` expands the model-execution tables to
the paired synthesist `1.1.0` contracts and adds durable ContextPackets,
EvidencePackets, and GroundedResponses. A response root is foreign-keyed to its
exact Artifact, packets, authority snapshot, certified request and call,
terminal InteractionRun revision, and successful WorkUnit revision. Selected
evidence dependencies remain queryable. Later authority events append an
invalidated response revision and advance its head atomically; neither the
original response nor its Markdown Artifact is rewritten.

`V012__durable_interaction_replay.sql` preserves terminal InteractionRun
outcomes while allowing a later revision to advance only the immutable
presentation-event head. This closes the answer-bearing suffix after its
GroundedResponse has persisted without reopening or rewriting the run.

`V013__durable_work_unit_cancellation.sql` adds the immutable command receipt
for explicit WorkUnit cancellation. A receipt binds the command and
idempotency identities, exact expected and resulting WorkUnit revisions,
capability, requesting service, interaction correlation, trace, reason, and
time. The transition and receipt commit atomically; duplicate delivery returns
the same result, conflicting reuse is rejected, and the stored authority
boundary makes clear that neither scientific authority nor a mere connection
abort caused the cancellation.

`V014__composition_control_authority.sql` persists immutable
CompositionRequests and ready or blocked CompositionPlans before prose exists.
Exact request, EvidencePacket, Project snapshot, actor, planned move, and
evidence-reference hashes remain both queryable and recoverable. This keeps a
model's eventual draft subordinate to an inspectable plan rather than allowing
fluent text to become its own authority.

`V015__composition_aggregate_authority.sql` persists one DraftArtifact revision,
its Unicode DraftSpans, exhaustive ProvenanceMap, and canonical CitationBundle
as a single transaction. Deferred foreign keys close the intentional
draft–provenance–citation reference cycle without weakening exact identity.
Normalized mappings, bases, citation authorities, linked spans, and dependency
rows support graph projection and later invalidation queries, while immutable
payloads retain exact restart recovery. A model-produced draft additionally
binds to the one current reusable GroundedResponse with the same execution,
EvidencePacket, and snapshot.

`V016__rendered_artifact_authority.sql` records deterministic Markdown, LaTeX,
and BibTeX publication lineage only after the exact output bytes are available
as a verified Artifact. Each record binds its DraftArtifact, CitationBundle,
renderer identity, semantic hash, output media identity, and explicitly
non-authoritative transformation boundary without copying source rights to the
generated export.

`V017__draft_revision_support_authority.sql` opens additive researcher editing
without permitting overwrite. One transaction advances a DraftArtifact head by
exactly one revision, commits its new spans, provenance, citations, and root
DraftSupportAssessment, or commits none of them. Later revalidation advances
only the immutable assessment ledger. Normalized support and citation states,
exact subject foreign keys, unique command binding, deferred completeness
checks, and immutable prior revisions make reuse eligibility queryable while
keeping the assessment explicitly outside scientific evidence authority.
