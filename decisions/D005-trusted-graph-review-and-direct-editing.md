# D005: Assistant-mediated trusted-graph review and direct editing

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Quarantine review, direct editing, review modes, calibrated automation, atomic change application, correction, reversal, and visible graph interaction
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D003](D003-scholarly-discovery-and-rights.md), [D004](D004-docling-ingestion-and-claim-extraction.md)

## Decision

Petra will make trusted-graph review an assistant-mediated, graph-visible workflow optimized for review by exception. Researchers will be able to inspect and edit scientific objects directly, discuss proposals with Petra in ordinary scientific language, approve coherent batches, and delegate eligible decisions to versioned review policies.

Direct editing will feel immediate in the interface, but every material mutation will follow the same authoritative path:

```text
researcher or agent gesture
        ↓
typed command
        ↓
validated ChangeSet and impact preview
        ↓
human decision or approved review policy
        ↓
atomic PostgreSQL events
        ↓
Neo4j, search, retrieval, timeline, and interface projections
```

Neither the interface nor an agent may mutate Neo4j directly. Neo4j remains a disposable graph projection of PostgreSQL's event-backed authority.

Petra will support four review modes:

| Mode | Petra's behavior | Researcher's default responsibility |
| --- | --- | --- |
| `inspect` | Explains and proposes; promotes nothing automatically | Review each material promotion |
| `guide` | Groups proposals, recommends decisions, and isolates exceptions | Approve coherent batches rather than every item |
| `delegate` | Applies eligible source-local decisions under approved rules | Review exceptions and audit samples |
| `supervise` | Applies broader calibrated rules within explicit boundaries | Monitor audits, consequential changes, and hypothesis impact |

A mode is a visible governance profile, not ambient authority. It selects defaults for review policies, thresholds, sampling, and escalation. Capability grants and data policy still determine what Petra may do. Modes can be set independently for discovery, ingestion, identity resolution, claim extraction, relation classification, synthesis, hypothesis transitions, and experiment work.

The default initial profile is:

- `delegate` for validated source-native metadata and deterministic housekeeping;
- `guide` for grounded source-stated claim extraction;
- `inspect` for scientific evidence relations, identity merges and splits, hypothesis transitions, and public-snapshot decisions.

Broader automation must be earned through task-specific evaluation. Petra will not treat familiarity with its persona, one model's confidence, or agreement among similar models as sufficient evidence for delegation.

## Context

Petra may process dozens of papers for one hypothesis and reuse the same corpus across many projects. Requiring a researcher to read each paper in full and approve every extracted claim would preserve nominal control while defeating the purpose of the workbench. At the other extreme, silently promoting model output would turn fluent extraction errors into trusted graph structure.

The review design must therefore reduce repeated reading without concealing scientific judgment. Petra should read broadly, ask selectively, and show why an item was accepted, escalated, disputed, or reversed.

The language model has an important role in this workflow. It can summarize a review batch, compare scopes, explain an extraction, identify outliers, answer challenges, and translate the researcher's intent into typed operations. It does not become the transaction boundary, evidence source, policy engine, or approval authority by speaking in a research-assistant voice.

## Review surfaces

The review workflow uses synchronized views of the same authoritative objects.

### Evidence inbox

The inbox is the high-throughput review surface. It groups proposals by paper, extraction run, proposal type, research question, hypothesis impact, review policy, and exception reason.

The default view emphasizes decisions rather than model scores. It shows:

- source and artifact status, including preprint, peer-review, correction, retraction, and abstract-only state;
- proposal origin and extraction revision;
- exact span availability and validation state;
- claim kind, scope completeness, and source stance;
- eligible review policy and proposed action;
- disagreement, novelty, ambiguity, and downstream-impact signals;
- audit selection and prior correction history.

A researcher may accept, reject, edit, defer, dispute, or request comparison. Keyboard and batch actions remain available, but heterogeneous or consequential outliers leave the batch automatically.

### Evidence inspector

The inspector shows the smallest context sufficient to judge the current decision, with deeper document context available on demand.

For a claim, it shows the exact passage or region, surrounding paragraph and section, exact-versus-normalized diff, structured scope, source stance, source version, and proposal provenance.

For a table-backed claim, it also shows the relevant cells, row and column headers, units, notes, caption, and table region. For a visual interpretation, it shows the figure crop, caption, visible axes and legend, surrounding text, and an explicit derived-interpretation label.

For `SUPPORTS`, `CONTRADICTS`, or `QUALIFIES`, it shows both endpoints, direction, predicate meaning, rationale, scope comparison, relevant spans, and competing or contrary assertions.

For an identity merge or split, it shows identifiers, titles, authors, dates, declared version relationships, conflicts, and every affected version, artifact, assertion, project, and snapshot boundary.

### Research canvas

The canvas exposes questions, claims, hypotheses, experiments, and evidence structures as scientific objects rather than generic database nodes. Dragging, relinking, splitting, narrowing, or changing a relation creates a typed command and visible draft; it does not create an unreviewed edge in the trusted graph.

Presentation-only changes such as layout, filters, collapsed clusters, and saved views may apply immediately without a scientific ChangeSet.

### Graph and path inspector

The graph view defaults to focused neighborhoods, evidence matrices, hypothesis ledgers, provenance paths, contradiction maps, and change timelines. A generic node-link explorer may exist as an advanced view, but it is not the primary scientific interface.

Every displayed scientific edge opens the Assertion behind it. Every grounded answer sentence exposes this trace:

```text
answer sentence → retrieved claim → accepted assertion path → source span → artifact
```

The interface also exposes projection state so a researcher can distinguish an authoritative commit from a delayed or failed Neo4j/search projection.

## Conversational review

Petra's assistant is a primary review surface, not a replacement for the source and graph views. It may say, for example:

> I extracted 38 claims from five papers. Twenty-seven are direct descriptive claims with exact full-text spans and passed the current source-local policy. Six have incomplete scope, three are causal, and two would materially change H2 — Evaluator position bias persists after counterbalancing. I recommend promoting the 27 as one review batch and inspecting the eleven exceptions.

The researcher can ask Petra to explain a classification, compare passages, change the batch, exclude a source class, audit a sample, or draft a temporary policy. Conversational decisions resolve to explicit proposal, policy, Approval, and ChangeSet identifiers.

An assistant utterance is not itself a scientific event. A structured command parsed from conversation must be shown in its operative form before it is applied. Ambiguous references, mixed scopes, materially changed revisions, or commands whose consequences cannot be summarized require clarification or a narrower proposal.

Petra's language and hypothesis-reference behavior are governed by [D006](D006-petra-language-and-reference-contract.md).

## Review modes and scoped policies

### Modes are presets, not grants

Modes provide understandable defaults while keeping the underlying controls explicit. A project may use `delegate` for descriptive full-text extraction, `guide` for methodological claims, and `inspect` for causal relations. Changing one setting does not grant permission in another workflow.

The active mode and policy are visible in the review header, assistant activity, Assertion history, and change timeline. A mode change applies prospectively. It does not relabel or silently re-review existing Assertions.

### ReviewPolicy

A `ReviewPolicy` is a versioned rule governing eligibility for batch or automatic promotion. It records:

- workspace, project, workflow, proposal type, claim kind, predicate, and source scope;
- allowed origin kinds and required provenance;
- artifact and source-status restrictions;
- required deterministic validators;
- scope completeness and ambiguity gates;
- identity, contradiction, novelty, and downstream-impact exclusions;
- calibrated evaluation evidence and the pipeline versions to which it applies;
- maximum batch size, audit sample policy, and escalation rules;
- start, expiry, pause, and supersession state;
- approving actor and exact policy revision.

Policy eligibility is a conjunction of inspectable gates, not a single decorative confidence score. A simple mode control may summarize these settings, but the advanced policy view exposes them.

A model may propose a policy. It cannot approve or activate the policy that expands its own authority.

### Initial automation boundary

The initial review treatment is:

| Proposal or action | Default treatment |
| --- | --- |
| Validated source-native metadata | Automatic under a versioned mapping policy |
| Deterministic DOI normalization or exact artifact deduplication | Automatic with event history |
| Grounded descriptive source-stated claim | Guided batch review; eligible for delegation after calibration |
| Abstract-only broad claim | Guided batch review with persistent scope label |
| Grounded table extraction | Batch-eligible only when cells, headers, units, notes, and region resolve |
| Figure or equation interpretation | Individual review |
| `SUPPORTS`, `CONTRADICTS`, or `QUALIFIES` | Individual review initially |
| Identity merge or split | Guarded individual review |
| Hypothesis development, lifecycle, or consequential posture transition | Guarded individual review |
| Public-snapshot inclusion | Exact-artifact and destination approval |

These are defaults, not permanent prohibitions. Scientific-relation classification may become eligible for bounded delegation when its own domain- and predicate-specific evidence justifies it.

## Earned automation and drift

Automation eligibility belongs to a particular transformation, not to Petra or a model in general. The calibration record is segmented by:

- workflow and proposal type;
- claim kind or predicate;
- discipline, domain, language, and document class where material;
- parser, extraction, critic, model, prompt, schema, and policy versions;
- artifact scope such as full text or abstract-only;
- human correction, rejection, false-promotion, and audit outcomes.

Targets are set only after a representative baseline and error distribution exist. Petra must not invent a universal precision threshold in advance.

A model, prompt, parser, schema, predicate, or material domain change invalidates or narrows the calibration evidence it affects. Audit failures, distribution shift, increased corrections, or unresolved projection errors may increase sampling, downgrade a workflow to `guide`, or pause the policy. This automatic safety response must be visible and reversible by an authorized researcher; it may not silently broaden automation.

Agreement among models is one input to evaluation. It is not treated as independent replication when the models or training distributions are related.

## Review by exception and audit

Under `delegate` or `supervise`, Petra:

1. evaluates each proposal against the exact active policy revision;
2. separates ineligible, unusual, or consequential proposals;
3. forms bounded homogeneous review batches;
4. promotes eligible items or prepares them for one batch decision;
5. withholds the configured random or risk-stratified audit sample;
6. summarizes decisions, exceptions, and downstream impact;
7. updates calibration evidence from reviewed outcomes;
8. pauses or narrows the policy when its stop conditions fire.

Typical escalation triggers include causal or mechanistic language, missing scope, abstract-only evidence, parser disagreement, ambiguous identity, retraction or correction warnings, a new contradiction, unfamiliar document structure, domain shift, or impact on a mature hypothesis.

Audit selection and results are event-backed. Petra cannot choose only easy examples after seeing their contents or omit rejected audit items from reported performance.

## Direct editing and scientific identity

Direct editing has three classes.

### Presentation state

Layout, filters, panel state, graph positions, and saved views do not change scientific meaning. They may update immediately and remain outside scientific review, subject to ordinary workspace persistence.

### Source-local correction

A researcher may correct a span alignment, transcription annotation, metadata mapping, or meaning-preserving normalization. The source artifact and original parser or model proposal remain immutable.

- A corrected alignment creates a new `SourceSpan` or reviewed mapping and supersedes the prior active alignment.
- Editing a model proposal creates a human-authored proposal revision with a visible diff and lineage.
- A meaning-preserving Claim wording correction may retain the Claim identity with a new revision.

### Epistemic or structural change

Changing polarity, population, outcome, comparator, scope, claim kind, or other scientific meaning creates a new Claim or semantic revision with explicit supersession. Changing an accepted predicate creates a new Assertion that supersedes the prior Assertion. Identity merges, identity splits, hypothesis transitions, and evidence relinking receive downstream-impact previews.

Petra never hard-deletes accepted scientific history. It supersedes, disputes, retracts, or tombstones active objects through events.

Promotion means that an object passed its configured representation and provenance process. It does not mean the Claim is true. Petra may retain mutually contradictory trusted Assertions when each is admissibly represented and scoped.

## ChangeSet and ReviewBatch boundaries

A `ChangeSet` is the smallest semantic unit that must succeed and reverse together. Accepting one extracted claim may atomically create or revise its Claim, SourceSpan mapping, `ASSERTS` relation, review decision, and provenance links.

A `ReviewBatch` is a review-session manifest that groups independently atomic ChangeSets. It is not one large database transaction. This prevents one stale object from blocking hundreds of unrelated decisions and permits precise retry, conflict handling, and reversal.

A batch records:

- exact member ChangeSet revisions and hashes;
- common policy, rationale, and filters;
- outliers removed from the batch;
- approving actor or policy;
- audit selection;
- per-member application outcome;
- aggregate summary derived from, but never replacing, member history.

One human batch action may approve the exact manifest. Adding or materially changing a member invalidates that approval for the changed manifest.

For a direct human edit, the final **Apply** action counts as approval of that exact ChangeSet. Petra does not require the researcher to approve the same edit twice. High-impact edits still require an impact preview and explicit confirmation. Agent proposals remain unapproved until a human or already approved policy authorizes the exact revision.

## Conflict, reversal, and projection failure

Every ChangeSet includes base revisions. PostgreSQL applies its operations and events atomically. If a base revision changed, Petra marks the affected ChangeSet as conflicted and regenerates the preview. It does not use silent last-write-wins or partially apply the set.

The interface calls post-commit undo **Revert**. Reversal creates a compensating ChangeSet and events; the original proposal, approval, application, and graph state remain reconstructable. If downstream objects depend on the change, Petra shows them and requires an explicit cascade, replacement, or narrower correction.

Public snapshots remain immutable. Correcting live state creates a new snapshot rather than rewriting an exported one.

If PostgreSQL commits but a graph, search, or vector projection fails, the authoritative change remains committed. Petra reports the projection as stale, retries idempotently from the outbox or event position, and blocks views or actions that require a falsely current projection.

## Consequences

### Benefits

- Researchers can review dozens of papers without approving every grounded extraction individually.
- Conversational explanation and direct manipulation share one command and provenance path.
- Automation can expand from measured performance while remaining domain- and task-specific.
- Batch review does not sacrifice precise history, conflict handling, or reversal.
- The graph remains demonstrably active in retrieval, review, and generation rather than serving as a decorative visualization.
- Model changes do not alter Petra's authority or interaction contract.

### Costs and risks

- Policies, calibration records, audits, and mode-specific UI add implementation complexity.
- A fluent assistant may encourage broader trust than its measured pipeline warrants.
- Batch summaries may conceal heterogeneous errors if exception detection is poor.
- Excessive escalation can erase the intended time savings.
- Overly broad policies can promote systematic errors at scale.
- Projection-status and conflict handling must remain understandable to non-database users.

The mitigations are narrow policies, exact provenance, visible promotion basis, representative audits, automatic stop conditions, persistent source access, and role-specific evaluation.

## Validation

D005 is satisfied when Petra can:

1. show a grounded proposal in the inbox, source inspector, canvas, and graph path without changing its identity;
2. let the assistant explain a batch and resolve every recommendation to proposal and source identifiers;
3. accept one direct human edit with one exact Apply action and an atomic ChangeSet;
4. batch-approve homogeneous claim proposals while isolating material outliers;
5. activate a versioned source-local ReviewPolicy without granting broader capability;
6. auto-promote an eligible proposal and retain its policy, calibration, model, prompt, validator, and audit provenance;
7. keep an ineligible or escalated proposal out of the automatic path;
8. select and record an audit sample and pause or narrow a policy after a configured failure condition;
9. prevent an abstract-only proposal from acquiring method-level or causal scope;
10. show both endpoints, scope comparison, rationale, and source basis before a scientific relation is accepted;
11. preview all downstream effects before an identity merge, split, or hypothesis transition;
12. preserve the original model proposal after a human correction;
13. reject a stale ChangeSet without partially applying it;
14. revert an applied ChangeSet through compensating events and reconstruct both states;
15. apply unaffected ChangeSets in a ReviewBatch when another member conflicts;
16. expose a delayed graph projection without presenting it as current;
17. trace a generated sentence through the graph to active Assertions and exact source spans;
18. replace the conversational model without changing policy, ChangeSet, or graph semantics.

## Deferred decisions

D005 does not choose:

- numerical automation targets before baseline evaluation;
- the final visual layout of the inbox, canvas, or inspectors;
- production model assignments and routing;
- the exact JSON Schemas and TypeScript components for review objects;
- autonomous execution, publication, or external-action policies;
- a permanent boundary against automating scientific relations after adequate evaluation.

## Revisit triggers

Reconsider D005 if:

- guided review still requires paper-by-paper rereading for routine extraction;
- users cannot predict what a mode or policy will do;
- audit samples fail to detect systematic promotion errors;
- mode changes create confusing differences among projects or workflows;
- ChangeSet volume or ReviewBatch replay becomes operationally impractical;
- researchers routinely bypass the review surfaces and rely on unsupported chat summaries;
- graph visualization fails to improve correction, provenance comprehension, or retrieval inspection;
- calibrated automation cannot transfer safely enough to justify `supervise` mode.

Any revision must preserve typed commands, immutable source and proposal history, atomic authoritative events, visible promotion basis, scoped capabilities, and projection rebuildability.

## Next decision

D006 defines Petra's language, reference, and conversational contract. It must keep the research-assistant identity stable across models while making scientific origin, uncertainty, action, and hypothesis references unambiguous.
