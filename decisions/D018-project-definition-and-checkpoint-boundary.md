# D018: Project definitions, managed folders, and reconstructable checkpoints

- **Status:** Accepted
- **Accepted:** 2026-09-08
- **Scope:** Project semantics, reusable origins, objective binding, extension admission, managed Project folders, import, GitHub synchronization boundary, and `.petra` checkpoints
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md), [D012](D012-scoped-research-artifacts-and-external-adapters.md), [D015](D015-language-neutral-runtime-contracts.md)
- **Amends:** D009's scientific-workbench emphasis by defining a use-agnostic Project semantic root

## Decision

Every Petra Project binds an exact, immutable, versioned `ProjectDefinition`
revision. The definition describes what the Project is trying to accomplish,
which object and relationship types it admits, how sources and Work are
interpreted, which validators and outputs apply, and which terminology and
presentation descriptors may be used.

A definition may be authored uniquely for one Project. Reusable templates are
optional recorded origins, not mandatory Project categories and not Petra's
architectural center. Seeding from a template copies an exact definition basis
into a Project-owned revision. A later template change cannot silently alter an
existing Project.

The physical boundary remains:

```text
PostgreSQL authority
  ├── Project identity and exact ProjectDefinition revision
  ├── objectives, commands, events, Work, Review, and retained history
  └── hashes and references to immutable bytes

ArtifactStore byte authority
  └── source, working, output, export, and checkpoint members

Neo4j rebuildable projection
  └── current, working, historical, temporal, and comparison graph views

Petra-managed Project folder
  └── inspectable local materialization; never a second editable ledger
```

## Definition contents

A `ProjectDefinition` names exact versioned references for the semantic behavior
that applies to its Project:

- objective kinds and dependency rules;
- object and relationship schemas;
- source roles and source-capability rules;
- Work task families, tools, model roles, prompts, and context compilers;
- candidate, validation, Review, approval, and output rules;
- terminology and discourse conventions;
- bounded presentation descriptors; and
- admitted extension manifests and their compatibility requirements.

The shared Petra kernel retains the same meaning across definitions: Project,
Artifact, source revision, WorkUnit, proposal, ChangeSet, Review, approval,
capability, provenance, projection, event, interaction, cancellation, promotion,
reversal, recovery, and History. A definition can add typed domain meaning but
cannot redefine those controls, create a second command envelope, or grant a
capability.

Definitions are closed portable records under D015. Referenced schemas,
validators, tools, prompts, roles, terminology, and descriptors resolve through
registered identities and versions. Arbitrary executable client code, CSS,
layout coordinates, raw colors, remote assets, unvalidated markup, and
authority-state aliases are not definition content.

## Objectives and task context

Objectives are revisioned Project objects with optional parent and dependency
references. A Project may have several active or historical objectives; one
exact objective revision may be the current focus without becoming the sole
Project purpose.

Every material WorkUnit, model call, candidate, decision, and output records the
ProjectDefinition and objective revisions it interpreted. A task also binds one
coherent snapshot of its relevant inputs, rules, capabilities, limits, and
expected result. Later relevant changes require an impact explanation and
explicit adoption or revalidation. Unrelated Project changes do not invalidate
the task.

## Definition change and derivation

Changing a definition creates a reviewed additive revision with an impact
assessment. A compatible migration within one definition family retains the
prior interpretation and records the exact transition. A materially different
semantic family creates a linked derived Project. Petra does not reinterpret
the existing Project in place.

Historical records retain the definition and terminology revisions under which
they were produced. An unsupported or unavailable definition revision fails
closed with an inspectable compatibility error; the client cannot substitute a
nearby template or current definition.

## Model and extension boundary

Material model input binds the applicable definition, object and relationship
schemas, terminology, prompts, tools, role certification, validators, source
permissions, and context snapshot. The model gateway remains provider-neutral.
Model output enters the ordinary typed candidate and Review path and cannot gain
authority from the selected definition.

An extension declares its schemas, tools, validators, outputs, permissions,
compatibility, omissions, and recovery behavior. It must map effects back to
Petra's shared Work, proposal, Review, approval, provenance, revision, and
History contracts. An extension that needs different permission, approval,
provenance, cancellation, or history semantics requires another architecture
decision.

## Graph and conversation

One authoritative history supports several graph views. The default graph is a
focused projection of the latest relevant state. Current, working, historical,
temporal, comparison, and Project-evolution views derive from retained records;
none is another authority database. Domain time, such as publication or story
time, remains a typed definition dimension and does not replace recorded or
valid time.

Conversation and direct graph interaction use the same command path. A
conversational action becomes visible in the graph, while graph selection adds
exact context to conversation. Zoom, layout, selection, focus, and disclosure
are presentation state. Material effects still require the same preview,
versioned command, Review, receipt, and History records.

## Candidates, review, and bounded autonomy

Human, model, tool, import, and extension results enter a typed working layer
with exact identity, revision, origin, basis, producer, and validation state.
They may reference canonical objects but never inherit canonical authority.
Execution success does not mean validation, acceptance, or application.

Similarity may group candidates and open an expedited batch Review. Similarity
alone cannot reuse validation or approval. A materially revised candidate runs
the applicable checks again. Dependency-coupled members apply atomically when a
partial effect would be invalid; independent members retain independent
outcomes and receipts.

One authorization may cover internal steps within its declared objective,
material, tools, permissions, cost, time, and result limits. Petra asks again
only when consequential meaning is unresolved or more authority is required.
Interrupted work may resume only from a supported durable checkpoint within the
original boundary.

## Project folder

Each Project has a Petra-managed, inspectable folder with a canonical,
domain-neutral layout covering:

- identity and manifests;
- definitions and objectives;
- sources;
- working material;
- outputs;
- Work and interaction records;
- History;
- graph exports; and
- extensions.

The exact directory names and materialization strategy are implementation
details. PostgreSQL and the ArtifactStore remain authoritative. External folder
editing is out of scope for this version: an unexpected filesystem change is an
integrity mismatch, not an admitted Project revision.

Code, Markdown, documents, folders, and other existing material enter through
explicit import or re-import operations. Import records identity, exact bytes,
origin, rights, selected definition and objective, validation, and resulting
candidate lineage. It does not silently promote extracted meaning.

GitHub is the only contemplated external synchronization channel for the next
version. Any integration uses explicit snapshots and synchronization receipts;
Petra will not treat a watched checkout as its authority ledger.

## `.petra` checkpoints

`.petra` is Petra's application-specific extension for an open, documented,
versioned, preferably ZIP-compatible Project checkpoint. A complete checkpoint
contains one coherent Project-scoped state:

- Project identity and the complete Project identity taxonomy;
- exact definitions, objectives, terminology, and extension manifests;
- retained authority history, commands, decisions, and recovery relations;
- permitted source, working, output, Work, interaction, graph, and lineage
  records;
- included immutable Artifact bytes or explicit external dependencies;
- member hashes, a root manifest, format version, and integrity information; and
- declared omissions and the reason for each omission.

Credentials, bearer tokens, provider sessions, local secrets, and capability
grants are never transferred. Authorization must be established again in the
receiving runtime.

Archives are self-contained by default when rights allow it. A reference-only
or incomplete archive names every required omission and cannot claim complete
reconstruction. **Open/Restore** preserves Project identity. **Create Derived
Project** assigns a new identity and records lineage to the source checkpoint.
If an identical, older, or divergent copy already exists, Petra offers an exact
inspection, comparison, restore, or derivation path; it never silently
duplicates or overwrites the Project.

## Recovery and retention

The current product provides quick recovery for the latest ten user-visible
atomic steps in each supported working-edit, graph-navigation, and applied-change
history. Internal model and tool calls are not user steps. Governed reversal
adds a validated compensating ChangeSet, explains affected dependents, and
preserves unrelated work and the original event.

Ten is an interaction window, not a retention limit. Material Project history
is retained for the Project lifetime and included in checkpoints subject to
explicit rights, dependency, retention, and deletion rules.

## Observable-context preservation

Petra records the observable inputs and outputs needed to understand Work as
models evolve: prompts, compiled context, exact source revisions, tool inputs
and outputs, exposed provider and model configuration, schemas, validators,
extensions, limits, intermediate Artifacts, checkpoints, receipts, and results.

Restoration guarantees inspection of what Petra recorded. Re-execution with a
changed or unavailable model creates a linked Work revision and cannot claim
bit-identical reproduction.

## Options considered

### Mandatory reusable profile catalogue

Rejected. It would bias Petra toward a fixed taxonomy and make unique Projects
second-class. Reusable templates remain useful optional origins.

### Mutable Project configuration document

Rejected. In-place edits would make historical meaning and model context
ambiguous and would weaken replay, comparison, and provenance.

### Folder or Git repository as authority

Rejected for this version. External edits, partial writes, merge semantics, and
filesystem observation cannot replace Petra's typed commands and event ledger.

### Proprietary opaque archive

Rejected. A Petra extension is useful for recognition, but durable recovery
requires an open format, documented members, checksums, and explicit omissions.

## Consequences

### Benefits

- Petra remains graph-native and use-agnostic without becoming semantically
  empty.
- Unique Projects and reusable templates use one revisioned definition model.
- Model routing can evolve without losing the exact observable context of past
  work.
- Conversation, graph interaction, imports, Review, and recovery converge on
  one authority path.
- Managed folders and `.petra` checkpoints support inspectability and future
  GitHub integration without creating a second ledger.

### Costs and risks

- Project creation now requires a definition and at least one objective before
  material Work can begin.
- Compatibility, definition migration, and extension admission need explicit
  registries and conformance tests.
- Complete checkpoints may be large, and source rights may require incomplete
  archives with visible omissions.
- Existing scientific M1 records predate this decision and need an explicit
  additive scientific definition binding; they must not be silently re-read as
  though the binding always existed.

## Validation

D018's first implementation is complete when Petra can:

1. register a Project-owned definition revision without modifying
   `petra.project@1.0.0`;
2. bind a Project to exactly one supported current definition revision and
   retain earlier bindings;
3. register versioned objectives and bind material Work to exact definition and
   objective revisions;
4. seed a definition from an optional exact template origin without creating a
   template dependency;
5. reject unknown schemas, executable presentation content, authority aliases,
   missing dependencies, revision gaps, incompatible migrations, and silent
   definition substitution;
6. render one scientific and one unrelated synthetic definition through the
   same shell grammar without hard-coded shared semantics;
7. materialize a Project folder and detect an unexpected external edit without
   admitting it;
8. create and verify a complete `.petra` checkpoint, plus an incomplete
   rights-constrained checkpoint whose omissions are explicit;
9. restore the complete checkpoint with the same Project identity and create a
   derived Project with new identity and retained lineage; and
10. reconstruct retained Project meaning without relying on the availability of
    the original model.

## Deferred work

D018 does not yet select:

- the final canonical Project folder names;
- a public template marketplace or template-discovery service;
- executable third-party extensions;
- external folder editing or filesystem watching;
- GitHub authentication, branching, pull-request, or conflict UX;
- hosted multi-user sharing and role management; or
- a bulk retention and deletion policy.

## Revisit triggers

Revisit D018 if a real ProjectDefinition cannot map its behavior to Petra's
shared authority kernel; if checkpoint size or rights omissions prevent useful
reconstruction; if managed-folder materialization becomes a measured
performance bottleneck; or if GitHub synchronization requires a conflict model
that cannot remain subordinate to Petra authority.

