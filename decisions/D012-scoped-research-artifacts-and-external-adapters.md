# D012: Scoped research artifacts and adapter-neutral access

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Research-artifact composition, provenance maps, citation bundles, output profiles and renderers, Felicity-governed prose, shared application commands and queries, and the boundary for future API and MCP adapters
- **Depends on:** [D002](D002-postgres-neo4j-artifacts.md), [D003](D003-scholarly-discovery-and-rights.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D006](D006-petra-language-and-reference-contract.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md), [D011](D011-experiment-sandbox-and-reproducibility.md)

## Decision

Petra will help researchers compose bounded research artifacts from a named graph snapshot. Wholesale project publication is not a current product requirement.

The composition path is:

```text
graph snapshot
      ↓
EvidencePacket
      ↓
CompositionRequest
      ↓
CompositionPlan
      ↓
DraftArtifact revision
      ├── ProvenanceMap
      ├── CitationBundle
      └── validation report
              ↓
         RenderedArtifact
```

A DraftArtifact may be a passage, outline, table, methods description, experiment report, literature synthesis, bibliography, or another researcher-directed output. Petra will not encode an exhaustive deliverable list. Versioned `OutputProfile` and renderer adapters may add requirements and formats as real use reveals them.

Every material user-facing model response follows [D006's Felicity- and Grice-guided language contract](D006-petra-language-and-reference-contract.md). Structured identifiers, scientific states, quoted source text, measurements, code, and serialization formats remain exact. A language revision cannot silently change scientific force, evidence origin, or citation scope.

Petra's interface, internal HTTP boundary, future public API, and possible MCP server will call the same runtime-validated TypeScript commands and queries. No adapter receives a second authority path or direct PostgreSQL or Neo4j mutation access.

The API and MCP details remain deferred. Petra will first build and observe the internal command and query contracts. An API is the likely deterministic integration surface; MCP is a candidate agent-facing adapter after Petra has stable objects, permissions, long-running work semantics, and tool boundaries.

## Context

Petra's immediate use is an individual scientific workbench. Researchers are more likely to ask Petra to help write part of a paper, explain provenance, prepare citations, generate BibTeX or LaTeX, describe a method, or summarize evidence than to publish the entire internal graph.

Those outputs still need a reproducible basis. A paragraph can become misleading when a later graph update changes its support, a citation refers only to an abstract, a stylistic rewrite strengthens a claim, or the user edits text after Petra mapped its provenance. The composition contract therefore treats generated prose as a versioned research artifact rather than an ephemeral chat response.

External integration presents a related boundary. A notebook, workflow engine, agent, or other application may eventually need to inspect Petra state or request work. If the UI, API, and MCP server implement separate business rules, permissions and scientific semantics will drift. D012 establishes adapter neutrality without committing to a premature external interface.

## Composition objects

### EvidencePacket

An `EvidencePacket` is a composition-specific ContextPacket. It pins:

- project and graph snapshot;
- requested subject, scope, and temporal perspective;
- selected Claims, Assertions, SourceSpans, Results, and Analyses;
- supporting, challenging, qualifying, and materially unresolved evidence;
- source access and processing depth, including abstract-only limitations;
- inclusion reasons, exclusions, omissions, and coverage limits;
- dependency hashes and freshness state.

An EvidencePacket does not make every included Assertion true. It records the bounded evidence Petra authorized for one composition task.

### CompositionRequest

A `CompositionRequest` records:

- researcher objective and intended audience;
- requested artifact, section, or function in ordinary language;
- project, subject objects, and snapshot;
- scope, length, language, format, and citation preferences where supplied;
- applicable OutputProfile;
- permitted evidence namespaces and inference policy;
- desired response depth;
- capability, privacy, cost, and approval context.

The request may remain open-ended. Petra should clarify only omissions that would materially change scientific meaning or the output's usefulness.

### CompositionPlan

A `CompositionPlan` is a reviewable structured outline of intended claims, evidence, uncertainty, citation placement, author-supplied material, Petra inferences, and sections. It records unresolved support and coverage problems before prose obscures them.

Short, low-risk responses may create the plan implicitly and retain it in provenance. Consequential or long-form outputs should make it inspectable before or alongside the draft.

### DraftArtifact

A `DraftArtifact` is an immutable revision of generated or researcher-edited content. It pins:

- CompositionRequest, CompositionPlan, EvidencePacket, and graph snapshot;
- content and semantic format;
- producing actor, ModelRequest, model, prompt profile, and validators;
- OutputProfile and language-contract revisions;
- ProvenanceMap and CitationBundle revisions;
- validation state, limitations, and unresolved support;
- parent revision and edit origin.

Researcher edits create a new revision. They are not silently attributed to Petra. If an edit changes a mapped statement, the affected provenance and citation mapping becomes stale until revalidated.

### ProvenanceMap

A `ProvenanceMap` links material DraftSpans to one or more bases:

- source-backed Claims and Assertions;
- Results or Analyses;
- explicit Petra inference;
- researcher-supplied statement or judgment;
- structural or connective language with no independent scientific claim.

The map records the relationship between the span and its basis: direct report, synthesis, qualification, comparison, interpretation, or another registered relation. Presence of a citation does not establish support.

Petra does not need to attach a citation to every sentence. It must make every material scientific assertion traceable or visibly mark it as unsupported, author-supplied, or inferential.

### CitationBundle

A `CitationBundle` is generated from canonical Work and WorkVersion records. It preserves:

- Petra and external identifiers;
- cited version and source locator;
- citation purpose and linked DraftSpans;
- metadata completeness and identity warnings;
- access and processing depth;
- requested style or export format;
- generated bibliography artifacts such as BibTeX when requested.

Formatting cannot repair incomplete or conflicting source identity. Petra exposes the problem rather than inventing missing bibliographic fields.

### OutputProfile and RenderedArtifact

An `OutputProfile` registers requirements, permitted source and inference types, required sections or metadata, validators, and language behavior for a class of output. Profiles should emerge from repeated use rather than an imagined complete taxonomy of academic deliverables.

A `RenderedArtifact` is a deterministic or recorded transformation of one DraftArtifact and CitationBundle into a requested representation such as Markdown, LaTeX, BibTeX, plain text, or a later supported document format. The renderer records its version, inputs, options, output hash, warnings, and loss or escape behavior.

Semantic content belongs to the DraftArtifact. A renderer does not decide scientific support.

## Felicity at the language boundary

Felicity is a user-facing language contract, not a cosmetic formatter.

Petra composes in this order:

```text
evidence-backed plan
      ↓
scientifically calibrated draft
      ↓
Felicity language validation or revision
      ↓
claim-force, provenance, and citation revalidation
```

This order permits clear, collaborative prose without allowing a rewrite to strengthen “suggests” into “demonstrates,” collapse source report into Petra judgment, or move a citation beyond its evidential scope.

The contract applies to:

- conversational responses;
- explanations, recommendations, warnings, and status summaries;
- provenance and uncertainty descriptions;
- generated research prose;
- human-readable API or MCP responses.

It does not alter stable IDs, controlled vocabularies, measurements, code, exact quotations, artifact bytes, or machine-readable payload fields. Rendered prose and structured data may travel together.

## One application boundary

The TypeScript application exposes runtime-validated commands and queries. Adapters authenticate an actor, establish project and capability context, validate input, invoke that application layer, and render its result.

```text
Petra interface ─┐
internal API ────┼──► commands and queries ─► policy ─► domain events and projections
future API ──────┤
possible MCP ────┘
```

The shared boundary preserves:

- stable Petra identities and revisions;
- authentication and project scope;
- CapabilityGrants, review policy, and approvals;
- budget, rights, privacy, and egress policy;
- idempotency, concurrency, and event provenance;
- WorkUnit start, observation, cancellation, and terminal state;
- ChangeSet proposal, review, application, and reversal;
- consistent structured errors and scientific language.

An adapter cannot bypass policy because its client is trusted or local. Direct Neo4j queries may be available for development inspection, but they are not a supported mutation or scientific-authority interface.

## API and MCP roles

A future API is the preferred surface for deterministic software integration, bulk workflows, notebooks, CI, and custom applications. It should return typed objects and job references rather than requiring clients to parse prose.

MCP may later provide an agent-facing representation of selected Petra resources and tools. Its value is tool discovery and bounded use from external assistants, not a replacement control plane.

An initial MCP adapter, if built, should favor:

- reading projects and selected research objects;
- searching evidence under an explicit project and snapshot;
- tracing Claim and DraftSpan provenance;
- requesting bounded EvidencePackets and DraftArtifacts;
- inspecting WorkUnits and experimental state;
- proposing ChangeSets;
- starting or cancelling work already permitted by a CapabilityGrant.

It should not initially expose:

- direct database or arbitrary graph mutation;
- ambient shell, sandbox, filesystem, network, or secret access;
- implicit approval of a ChangeSet, ProtocolVersion, ExecutionPlan, spend, or publication action;
- private model context or artifacts outside the requesting actor's scope;
- an open-ended tool that converts free-form model output directly into authoritative state.

Read, propose, and execute remain distinct operations. Default MCP access should be read-oriented and proposal-first until observed use justifies a narrower automated policy.

## Snapshots and sharing

Snapshots remain necessary for internal provenance, comparison, replay, evaluation, and stable artifact composition. A DraftArtifact names the exact snapshot from which it was composed even while the private project continues to change.

Petra does not currently define a “publish project” operation, public graph, or wholesale export package. Sharing a selected DraftArtifact, bibliography, method, table, code artifact, or provenance report is an ordinary explicit external action governed by its content, rights, and destination.

If future use demonstrates a need for shared interactive graphs or public research objects, Petra will define that boundary from real cases. D012 does not predesign it.

## Options considered

### Wholesale project publication as the next feature

Deferred because no current workflow requires it and its privacy, rights, and product assumptions are premature.

### A fixed catalog of academic deliverables

Rejected because Petra does not yet know which forms will recur. A generic artifact envelope plus versioned OutputProfiles preserves flexibility.

### Chat text without artifact identity

Rejected because citations, provenance, revisions, and later graph changes would be difficult to audit.

### Separate API, MCP, and interface behavior

Rejected because scientific semantics, permissions, and mutation paths would drift.

### MCP as Petra's canonical application protocol

Rejected for now. MCP may be a useful agent adapter, while deterministic pipelines still need stable typed commands, queries, and long-running work semantics independent of one external protocol.

## Consequences

### Benefits

- Petra supports real academic writing workflows without predicting every deliverable.
- Generated text remains connected to evidence, citations, and graph state after the conversation ends.
- Felicity applies consistently without becoming a hidden source of scientific claim drift.
- BibTeX, LaTeX, and later renderers can evolve independently of scientific semantics.
- UI, automation, and external agents cannot acquire different authority models.
- API and MCP integration remain possible without delaying the evidence spine.

### Costs and risks

- DraftSpan provenance requires alignment and revalidation after edits.
- A readable synthesis may combine several sources and resist simplistic sentence-to-citation mapping.
- OutputProfiles and renderers can proliferate without governance.
- External adapters enlarge the security and compatibility surface when implemented.
- Users may mistake fluent prose or a formatted bibliography for evidential adequacy.

Petra mitigates these risks with material-claim mapping, explicit origin, immutable revisions, stale-state handling, shared policy, and pilot-driven profiles.

## Validation

D012's composition contract is satisfied when Petra can:

1. create a CompositionRequest against a named project snapshot;
2. compile an EvidencePacket containing relevant and contrary evidence plus material omissions;
3. create a DraftArtifact with material DraftSpans mapped to evidence, inference, or researcher origin;
4. distinguish abstract-only support from full-text support in the draft and citation inspection;
5. generate a CitationBundle from canonical WorkVersions without inventing missing metadata;
6. render one DraftArtifact to Markdown and LaTeX and its citations to BibTeX without changing scientific semantics;
7. revise prose under the Felicity contract and detect a change in scientific force or citation scope;
8. preserve researcher edits as new revisions and mark affected mappings stale;
9. reproduce the draft's evidence paths from its pinned snapshot;
10. invoke the same read query and ChangeSet proposal through the interface adapter and internal API with equivalent authorization and results.

API and MCP publication are not D012 exit conditions.

## Deferred decisions

D012 does not choose:

- an exhaustive deliverable or OutputProfile catalog;
- final Markdown, LaTeX, BibTeX, document, or citation-style support;
- a public API version or compatibility policy;
- whether, when, or through which transport Petra will ship an MCP server;
- an MCP resource and tool catalog;
- external client authentication and deployment details;
- public graph publication, wholesale project export, or collaborative public review;
- journal, repository, reference-manager, or academic-platform integrations.

## Revisit triggers

Reconsider D012 if:

- researchers cannot inspect provenance without disrupting writing flow;
- span-level alignment is too brittle for normal editing;
- recurring outputs justify stable specialized schemas rather than OutputProfiles;
- renderers change scientific content or citation meaning;
- external pipelines require transactions or streaming semantics absent from the application layer;
- MCP clients provide enough demonstrated value to justify a supported adapter;
- a concrete public or collaborative sharing workflow appears.

Any revision must preserve snapshot provenance, epistemic origin, citation meaning, Felicity's scientific-force constraints, and one authoritative command and policy path.

## Next work

Petra will now implement the M1 evidence-spine vertical slice. Research-artifact composition begins with the grounded synthesis produced by that slice. External API and MCP contracts remain behind the observed internal commands and queries.
