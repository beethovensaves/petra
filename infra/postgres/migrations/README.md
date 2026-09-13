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

`V018__felicity_revision_authority.sql` opens only the deterministic bounded
Felicity edit origin. It commits the next DraftArtifact revision, exact
ProvenanceMap and CitationBundle, normalized one-to-one span transformations,
and immutable FelicityRevisionRecord before advancing the draft head. Deferred
checks require all five preservation validators, exact language-contract and
service identity, and complete canonical transformations. A shared immutable
command ledger prevents one revision command from being reused across
researcher edits, revalidation, and Felicity revision while remaining outside
scientific evidence authority.

`V019__project_definition_authority.sql` adds the immutable semantic root for a
Project. A ProjectDefinition registers its objective, object, relationship,
source-role, workflow, validator, output, terminology, presentation, context,
prompt, tool, model-role, and extension contracts without requiring membership
in a reusable profile catalogue. Project Objectives bind to an exact definition
revision, and a guarded Project head selects the current definition and focused
Objective without rewriting earlier meaning.

`V020__project_source_authority.sql` adds stable ProjectSource identities over
exact ProjectDefinition source roles, scholarly Work and WorkVersion revisions,
ordered Authors, and one immutable ArtifactManifest copy. Additive revisions can
mark a Project binding active or excluded without changing global source
identity, deleting retained bytes, or making the client infer membership.

`V021__review_session_authority.sql` adds stable, revisioned ReviewSession
identity independently of ChangeSet identity. Each revision retains one exact
ProjectDefinition, optional Objective, responsible human, authority snapshot,
origin, return context, ordered members, and exact semantic candidate bindings.
The first persistence resolver deliberately accepts the existing scientific
Claim–`ASSERTS` pair only, verifies its registered ProjectDefinition semantics
and ProjectSource basis, and leaves other profile payloads to additive authority
resolvers. A ReviewSession may exist before any ChangeSet; it does not itself
approve or apply domain authority.

`V033__working_state_authority.sql` adds stable WorkingCandidate and
WorkingRelationship heads with immutable additive revisions. Exact foreign keys
retain ProjectDefinition and existing evidence-record identities. A guarded
`working_correction` admission advances only a contiguous quarantine Claim or
Assertion revision; it does not require or imitate ChangeSet authority and emits
no domain event. Profile registration, reference, task, producer, validator,
lineage, and endpoint checks remain in the scientific adapter, while the
snapshot reader selects current heads in a read-only repeatable-read
transaction.

`V038__server_composed_review_candidate_correction.sql` admits command envelope
1.7 in the existing canonical command ledger. The additive envelope accepts one
human-authored scientific Claim text field while the existing serialized
candidate-correction authority composes exact profile authorship, retained
source basis, working provenance and lineage, validation reset, and hashes. It
creates no preparation, candidate, Review, decision, or recovery ledger.

`V039__review_candidate_basis_revision_authority.sql` admits command envelope
1.8, CapabilityGrant 1.6, and `ReviseReviewCandidateBasis` in the existing
canonical command ledger. One serialized operation advances the same
source-grounded Claim, WorkingCandidate, ASSERTS WorkingRelationship, Review
member, and open ReviewSession while retaining prior revisions and resetting
registered validation to pending. It accepts only exact material inside the
current active ProjectSource and WorkVersion and creates no decision,
ChangeSet, Approval, event, projection, or second ledger.

`V040__review_session_member_separation_authority.sql` admits command envelope
1.9, CapabilityGrant 1.7, and `SeparateReviewSessionMember` in the existing
canonical command ledger. One serializable command moves one exact unchanged
member from a fresh open multi-member ReviewSession into a new canonical
ReviewSession while retaining the source revision and every candidate,
relationship, basis, validation, ChangeSet, Approval, event, projection, and
member-outcome identity. A ChangeSet that crosses the requested partition makes
the member non-separable; separation emits no domain event or projection work.
