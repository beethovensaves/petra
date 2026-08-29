# D003: Federated scholarly discovery with copy-level rights

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Scholarly discovery, identity and version resolution, artifact acquisition, source admissibility, and rights policy
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md)

## Decision

Petra will use a federated scholarly-source architecture. No external provider becomes Petra's database of truth. Providers contribute provenance-bearing records about works, versions, relationships, availability, and publication status; Petra reconciles those records into its own canonical identities without discarding disagreements or uncertainty.

The initial source federation will use:

- **OpenAlex** for broad discovery, citation-graph traversal, author and venue expansion, and candidate open-access locations;
- **Crossref and DataCite** as DOI-agency metadata and relationship authorities for the identifiers they register;
- **arXiv, OpenReview, ACL Anthology, and Europe PMC/PubMed Central** as initial repository-native sources for relevant domains;
- **user-provided artifacts** as a first-class private acquisition route when the researcher has a legitimate basis for access;
- **Semantic Scholar and Unpaywall** only as optional enrichment or compatibility adapters, not as identity or scientific authorities.

Petra will distinguish six linked records that ordinary RAG ingestion often collapses:

```text
SearchRun
   └── DiscoveryCandidate
          └── Work
                 └── WorkVersion
                        └── Artifact copy
                               └── SourceSpan
```

A search result, snippet, recommender score, abstract, work version, and exact PDF are not interchangeable. A discovery record cannot directly support a scientific claim. A source-backed claim must resolve to an admissible `SourceSpan` or an equivalently precise structured source field.

Petra will also separate:

- **connector terms**, which govern use of a provider and its response data; and
- **artifact rights**, which govern one particular copy of one particular work version.

Rights attach to the artifact copy. “Available online,” “free to read,” and “safe to redistribute” are not synonyms.

## Context

Petra is expected to reuse a growing canonical literature corpus across multiple projects. Each project may examine dozens of papers per hypothesis, combine peer-reviewed work with legitimate preprints, and later publish an inspectable evidence graph. The private workspace may also contain subscription-accessed or researcher-provided artifacts that cannot be redistributed or sent to remote models.

A single discovery vendor would simplify early implementation but would conflate that vendor's coverage, ranking, identity clusters, correction latency, licensing terms, and failure modes with Petra's scientific record. It would also create a difficult migration if the provider changed its API or commercial terms.

The source landscape supplies different kinds of authority:

- discovery indexes are useful for recall and graph expansion;
- DOI registration agencies preserve deposited identifiers and declared relationships;
- native repositories preserve repository-specific versions and records;
- publishers and correction services report publication changes;
- the bytes Petra actually processes carry their own integrity and rights state.

Petra therefore needs an explicit reconciliation layer rather than one nominally canonical upstream source.

## Source roles

### Broad discovery

OpenAlex is the default discovery backbone. Petra may use its lexical or semantic search, citation links, author and venue records, topical classifications, and per-location availability metadata.

OpenAlex metadata is discovery input, not trusted scientific evidence. Petra records the OpenAlex work ID and raw response provenance, then resolves stable identifiers and source-native records independently where needed. OpenAlex's cached PDF or TEI services may supply an artifact candidate, but the underlying content retains its original copyright and must pass Petra's artifact-rights policy.

### DOI and relationship resolution

Petra normalizes a DOI, determines its registration agency, and routes metadata retrieval to Crossref or DataCite as applicable.

Crossref is preferred for Crossref DOI deposits, including deposited bibliographic fields, typed preprint and version relationships, publisher updates, license metadata, and Retraction Watch records. DataCite is preferred for DataCite DOI deposits, including versions and relationships among papers, preprints, datasets, software, and other research outputs.

Deposited metadata remains a source assertion. It may be missing, stale, or inconsistent with another source. Petra retains the source record and does not silently convert it into an unquestioned graph fact.

### Repository-native sources

The first repository adapters are:

- **arXiv** for machine learning, AI, and adjacent preprints;
- **OpenReview** for public submissions, decisions, revisions, and public review discussion;
- **ACL Anthology** for computational linguistics publications and stable Anthology identifiers;
- **Europe PMC and PubMed Central** for biomedical, life-science, and relevant psychology literature, including structured full text when available.

Repository-native identifiers, version labels, timestamps, status, and license statements take precedence over an aggregator's inferred representation of that repository record.

This list establishes the connector contract and implementation direction. D004 may stage the adapters rather than implementing every source before the first evidence-spine test.

### Optional enrichments

Semantic Scholar may later contribute related-paper recommendations, citation annotations, or other derived signals through an opt-in adapter. Its standard API license is not an acceptable foundation for Petra's canonical or future public corpus, so public or commercial use requires a separate review or expanded license.

Unpaywall may be retained as an optional DOI-level open-access resolver or compatibility adapter. It is not required in the first implementation because OpenAlex already supplies copy-level location and license information and exposes a legacy-compatible Unpaywall view.

No provider-supplied relevance score, citation count, topic, author cluster, or semantic embedding becomes scientific evidence.

### Researcher-provided artifacts

A researcher may add a legitimately obtained PDF or other source artifact that Petra cannot acquire through an open connector. Petra records the researcher's stated access basis and treats the artifact as private and local-only by default.

Petra does not infer redistribution or remote-processing permission from possession of the file. It records and enforces a policy decision; it does not represent that decision as definitive legal advice.

## Connector boundary

The TypeScript application will expose one replaceable scholarly connector boundary rather than provider logic throughout the product. A connector declares which of these capabilities it supports:

- search and pagination;
- identifier resolution;
- author, venue, and work lookup;
- references, citations, and related-work traversal;
- work-version and correction status;
- artifact-location discovery;
- artifact acquisition;
- license or access metadata;
- incremental refresh.

Each connector also declares its provider terms, authentication requirements, rate and cost behavior, response retention rules, attribution requirements, and D001 capability grant. Unsupported operations return an explicit capability result rather than an ambiguous empty response.

Provider responses are retained as immutable or content-addressed ingestion artifacts when their terms allow it. Normalized records keep a pointer to the raw response, connector version, query, retrieval time, and transformation version.

## Reproducible discovery

Every material literature search creates a `SearchRun`. A run records:

- the research question or search-plan revision that motivated it;
- connector, exact query, filters, sort, date bounds, and corpus options;
- start and completion time;
- pagination or cursor state and retry history;
- raw response artifact hashes when retention is permitted;
- returned identifiers, provider order, and provider scores;
- Petra reranking, expansion, and deduplication recipe versions;
- inclusion, exclusion, and identity-resolution decisions;
- the agent, model, tool, or researcher responsible for each search step.

Search plans should include confirmatory, disconfirming, replication-failure, rival-mechanism, and boundary-condition queries when relevant. Citation, author, venue, and semantic-neighbor expansion must be recorded as new steps rather than appearing as unexplained candidates.

A `SearchRun` may remain open during exploratory research. It can later be frozen and included in a reproducible review or snapshot. A full systematic-review workflow is deferred, but the provenance required to build one is not.

## Identity and version resolution

### Identity levels

Petra distinguishes:

- `Work`: the scholarly work across its supported publication history;
- `WorkVersion`: a dated preprint revision, accepted manuscript, version of record, correction, or other identifiable version;
- `Artifact`: exact immutable bytes or an immutable external snapshot processed by Petra.

An identifier binds to the level it identifies. A DOI does not automatically identify an entire intellectual work, an unversioned repository ID does not erase repository revisions, and two differently formatted files are not the same artifact merely because they contain similar text.

### Matching rules

Identity resolution uses this evidence order:

1. source-declared stable identifiers and explicit relationships;
2. reciprocal repository, DOI-agency, or publisher links;
3. compatible identifiers, authors, dates, titles, and abstracts;
4. probabilistic content or bibliographic similarity used only to propose a match.

Title equality alone never completes a merge. Author names alone never establish person identity. ORCID may establish a declared person identifier; OpenAlex or other author clusters remain sourced identity proposals unless corroborated.

When evidence is insufficient, Petra keeps separate provisional identities and creates a proposed `VERSION_OF`, `PUBLISHED_AS`, `DERIVED_FROM`, or identity-equivalence assertion. A researcher or a sufficiently conservative reviewed rule may later accept or reject it. Conflicting identifiers create a visible disputed state rather than a forced merge.

### Version preservation and preference

All acquired versions and artifacts remain addressable. A new version does not overwrite earlier bytes, parsed documents, source spans, claims, or decisions.

For general synthesis, Petra prefers the latest applicable, unretracted, corrected peer-reviewed version when it is available and admissible. That preference does not move evidence between versions: every claim still cites the exact artifact and span from which it was extracted. A task may deliberately select an earlier version to study scientific change, priority, review response, or replication history.

Corrections, expressions of concern, withdrawals, and retractions are time-sensitive assertions with source and observation time. Petra refreshes them periodically. A retracted work remains in the graph but cannot support trusted synthesis by default; it may still support research about the retraction, historical record, or identified failure.

## Artifact acquisition

Petra uses this acquisition order:

1. a repository-native or publisher artifact with explicit copy-level rights metadata;
2. an open publisher or repository location discovered through OpenAlex or another resolver;
3. a permitted cached copy whose provenance and original license remain available;
4. a researcher-provided or otherwise explicitly authorized artifact, stored privately;
5. an abstract or other authoritative structured field when full text cannot be acquired.

Petra does not bypass access controls, evade paywalls, or use an automated acquisition method contrary to a provider's terms. A failure to acquire full text remains visible; it is not silently replaced with a search snippet or an LLM reconstruction.

Every acquired artifact records its retrieval URL and time, source connector, response metadata, content hash, media type, byte size, detected integrity problems, version binding, and rights decision. If two sources return identical bytes, Petra may deduplicate storage by hash while preserving both acquisition and rights records.

OpenAlex-provided TEI, repository XML, and Petra-generated parses are separate artifacts or derived representations. Petra may compare them, but it does not assume a provider parse is error-free or overwrite the original bytes with parsed text.

## Connector terms and artifact rights

### Connector terms

A `ConnectorTermsRecord` captures:

- provider and connector version;
- terms URL and observation time;
- retained terms snapshot or content hash when permitted;
- permitted purposes and users;
- attribution and public-display obligations;
- response retention, redistribution, and sublicensing limits;
- rate, cost, suspension, and termination conditions relevant to Petra;
- review status and next review time.

Provider-term changes do not rewrite history. They create a new terms record and may suspend affected connector capabilities until reviewed.

### Artifact rights

An `ArtifactRightsDecision`—named `RightsDecision` in the runtime contract—captures:

- artifact and exact source location;
- observed license identifier, URL, statement, and source;
- access basis: `open_license`, `public_repository`, `subscription`, `user_supplied`, `permission`, or `unknown`;
- decision status: `verified`, `inferred`, `unknown`, `conflicting`, or `restricted`;
- whether Petra may store raw bytes, parse, index, embed, send selected text remotely, quote publicly, or redistribute the artifact;
- decision maker, rationale, observation time, and policy version;
- attribution, notice, noncommercial, share-alike, or no-derivatives conditions when applicable.

The rights decision is specific to the copy and may differ among a preprint, accepted manuscript, and version of record. If rights metadata conflicts, the more permissive interpretation is never chosen automatically.

### Default policy

The initial conservative policy is:

- an explicitly permissive artifact may be stored and transformed privately; public quotation or redistribution follows its license conditions;
- a publicly readable artifact with unknown or restricted reuse terms may be stored or processed only under a recorded legitimate access basis and remains private;
- a user-provided artifact remains private and E0 by default;
- restricted or unknown source text cannot be sent to a remote model without a provider-, purpose-, artifact-, and time-scoped override;
- no source artifact enters a shared DraftArtifact, export, or future public snapshot unless its rights decision explicitly permits that use;
- metadata, identifiers, links, Petra-authored graph assertions, selectors, and provenance may be exported only when their own provider and data terms permit it;
- public source text is omitted or minimized when the applicable rights decision does not permit its inclusion.

D001's egress level is a maximum, not a source-rights grant. A project at E2 cannot send an artifact that its copy-level policy keeps at E0.

## Scientific admissibility

### Legitimate scholarly sources

A source may enter scholarly quarantine when it has enough provenance to represent a legitimate research object:

- a stable registry, repository, publisher, or venue record;
- attributable authorship or responsible organization;
- publication, posting, or version time when available;
- a visible content and review status;
- an artifact or authoritative structured source field;
- no unresolved integrity or rights condition that forbids the proposed processing.

Preprints, conference and workshop papers, journal articles, theses, and scholarly reviews may qualify. Their types and review states remain visible. Admission does not imply methodological quality, truth, or equal evidential weight.

Blogs, news articles, ordinary web pages, search snippets, and unsourced summaries may provide discovery hints or contextual leads, but they do not enter the scholarly-evidence namespace. Official documentation, model cards, standards, and code repositories may enter a separately typed operational-evidence namespace when a research question requires them.

### Gate before claim extraction

Claim extraction may begin only after Petra has:

1. created or selected a provisional `WorkVersion`;
2. bound an immutable artifact or authoritative structured field to that version;
3. recorded content integrity and provenance;
4. recorded review, correction, withdrawal, and retraction status as far as the configured sources permit;
5. applied a connector-terms and artifact-rights decision for the planned processing;
6. labeled the available source scope as full text or abstract-only.

Passing this gate permits proposals into quarantine. It does not promote claims to the trusted graph.

### Abstract-only evidence

An abstract is not treated as full-text evidence. Petra displays an `ABSTRACT ONLY` limitation wherever such evidence appears in retrieval, synthesis, graph inspection, or export.

Abstract-only extraction is restricted to broad claims that the abstract explicitly attributes to the work, such as its stated purpose, high-level finding, or broad conclusion. It must not infer or evaluate:

- detailed methodology, controls, sampling, or preprocessing;
- measurement validity, statistical assumptions, or risk of bias;
- effect sizes or subgroup results not stated in the abstract;
- limitations, confounds, boundary conditions, or causal mechanisms that require the body of the paper;
- reproducibility or evidential strength based on methods Petra could not inspect.

The resulting assertion records that the authors report the claim and that support is abstract-only. It cannot by itself satisfy a need for detailed methodological or experimental evidence. Acquiring full text later does not silently upgrade the assertion; Petra must extract and review new full-text support.

### Peer review and scholarly commentary

OpenReview reviews, editorial comments, decision letters, and similar material enter a separately typed scholarly-commentary or review-evidence namespace. They may support claims about the review process, raised concerns, requested changes, or evaluation history. They do not independently establish the underlying scientific result.

Public OpenReview comments may have different reuse terms from the submitted article. Petra applies separate artifact-rights decisions even when both appear on the same platform.

## Researcher-facing states

The discovery and quarantine interface must expose, without opening a raw metadata panel:

- candidate, resolved, provisional, or disputed identity;
- preprint, accepted, peer-reviewed, corrected, retracted, or unknown status;
- full-text, abstract-only, metadata-only, acquisition-failed, or access-required availability;
- open, private, restricted, conflicting, or unknown rights state;
- local-only and remote-egress eligibility;
- exact version selected for parsing or synthesis;
- correction or retraction warnings;
- why Petra included, excluded, merged, or preferred a record.

Researchers can inspect the underlying provider records and graph edges. Batch triage may apply reviewed rules, but it cannot hide uncertainty, rights failures, or version conflicts.

## Scoped exports and future public snapshots

Petra does not currently define wholesale project publication. A scoped external artifact or any future public snapshot may include:

- Petra identities and permitted bibliographic metadata;
- work and version relationships with their provenance;
- Petra-authored claims, hypotheses, decisions, and evidence relations;
- artifact identifiers, hashes, source locations, and selectors;
- permitted excerpts and artifacts;
- rights decisions, required notices, redactions, and omission reasons;
- search and acquisition provenance needed to reproduce the public evidence map.

It must exclude private or disallowed source bytes, extracted text, embeddings, and provider response data. An omitted artifact remains represented by a redacted manifest entry when that can be disclosed, so the public graph does not imply that the source never existed.

## Consequences

### Benefits

- Petra can change or add providers without migrating its scientific identity model.
- Broad discovery does not become scientific authority.
- Exact source copies and versions remain inspectable and reproducible.
- Preprints and peer-reviewed versions can coexist without losing their differences.
- Correction and retraction state remains visible and refreshable.
- Private research can use legitimately accessed material without accidentally publishing or remotely transmitting it.
- Public snapshots can preserve evidence topology even when source artifacts must be omitted.
- Search behavior is available for later systematic-review and retrieval evaluation.

### Costs and risks

- Provider reconciliation and uncertain identity states require additional schemas, jobs, and UX.
- Source coverage and metadata quality will vary by domain.
- Provider terms and artifact licenses require continuing review.
- Conservative rights defaults may make some remote-model and public-sharing workflows less convenient.
- Storing provider responses and terms snapshots consumes space and may itself be restricted.
- A legitimate source can still contain weak, false, fraudulent, or irreproducible science.
- No source policy can make model generation literally hallucination-free; Petra can instead prevent unsupported generation from silently becoming trusted scientific state.

## Alternatives considered

### One discovery and corpus provider

Rejected because one vendor's coverage, identifiers, rankings, license, and operational continuity would become Petra's scientific boundary.

### Discovery records as evidence

Rejected because snippets, abstracts, citation counts, and recommender output cannot support the detailed scientific claims Petra is expected to inspect.

### Full text required for every claim

Rejected because it would erase legitimate but incomplete parts of the scholarly record and bias the corpus toward convenient availability. Petra instead permits narrowly scoped, clearly labeled abstract-only claims.

### Treat all publicly readable artifacts as reusable

Rejected because access and reuse rights differ. Licenses can vary by location and version.

### Exclude restricted or user-provided artifacts

Rejected because it would make Petra less useful for ordinary academic research and create an incentive for invisible off-system evidence. Private ingestion with conservative rights and egress defaults keeps the evidence visible without assuming public rights.

### License at work level

Rejected because different copies and versions of one work can carry different licenses and access bases.

## Validation

D003 is satisfied when Petra can:

1. record and replay a search across at least two discovery or registry connectors;
2. preserve the raw-provider provenance and normalized candidate for every result retained;
3. prevent a discovery candidate or search snippet from directly supporting a scientific claim;
4. resolve a DOI through its registration agency and preserve conflicting metadata as sourced assertions;
5. group a preprint and version of record when explicit evidence supports the match while retaining their separate versions and artifacts;
6. leave an uncertain title-based match provisional rather than forcing a merge;
7. ingest identical bytes from two locations once while preserving both acquisition and rights records;
8. block parsing, remote egress, or export when the applicable connector or artifact policy forbids it;
9. ingest a user-provided artifact privately without inferring redistribution rights;
10. show the exact version, artifact, rights state, and source span behind a claim proposal;
11. label an abstract-only claim throughout retrieval and synthesis and prevent detailed methodological extraction from it;
12. keep a retracted work inspectable while preventing it from supporting trusted synthesis by default;
13. represent an OpenReview article and its review comments with separate evidence types and rights decisions;
14. freeze a `SearchRun` with exact connector queries, filters, results, and selection decisions;
15. build a scoped citation and provenance artifact that retains permitted graph metadata while omitting disallowed source content and recording why it was omitted.

## Deferred decisions

D003 does not choose:

- the exact TypeScript schemas or provider SDKs;
- parser, OCR, layout-analysis, or claim-extraction models;
- the initial chunking recipes and retrieval evaluation corpus;
- automated methodological-quality or risk-of-bias instruments;
- full systematic-review protocol and reporting UX;
- institutional or academic-access integration, including library link resolvers, proxies, subscriptions, and researcher-held entitlements;
- authenticated publisher acquisition workflows;
- formal legal review needed before a public or commercial launch;
- long-term artifact retention and deletion schedules.

Academic-access integration is expected as a future capability. It must preserve user authorization, provider terms, copy-level rights, local-first storage, and the public-snapshot boundary established here, but its mechanism is intentionally not selected in D003.

## Revisit triggers

Reconsider D003 if:

- core providers materially change their licenses, APIs, coverage, or availability;
- source reconciliation error prevents acceptable identity or version accuracy;
- a domain requires a specialized index or repository to achieve basic recall;
- institutional access becomes necessary for the minimum viable research workflow;
- public or commercial use changes the permitted provider or artifact policy;
- rights decisions cannot be made consistently enough for researchers to understand or trust them;
- abstract-only evidence causes measurable overclaiming despite the imposed restrictions;
- correction or retraction latency permits stale evidence to influence trusted outputs.

Any replacement must preserve provider provenance, stable Petra identities, version distinctions, artifact hashes, rights history, and search reproducibility.

## References considered

- [OpenAlex API and CC0 metadata](https://help.openalex.org/api/)
- [OpenAlex full-text access and licensing](https://help.openalex.org/access/fulltext/)
- [OpenAlex copy-level locations](https://help.openalex.org/data/locations/)
- [Crossref metadata retrieval and licensing](https://www.crossref.org/documentation/retrieve-metadata/)
- [Crossref Retraction Watch integration](https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/)
- [Crossref relationships](https://www.crossref.org/documentation/schema-library/markup-guide-metadata-segments/relationships/)
- [DataCite versions and related identifiers](https://support.datacite.org/docs/connecting-versions-with-related-identifiers)
- [DataCite data-file use policy](https://support.datacite.org/docs/datacite-data-file-use-policy)
- [arXiv API and reuse guidance](https://info.arxiv.org/help/api/index.html)
- [arXiv content and version licenses](https://info.arxiv.org/help/license/index.html)
- [ACL Anthology identifiers](https://aclanthology.org/info/ids/)
- [OpenReview API documentation](https://docs.openreview.net/getting-started/using-the-api)
- [OpenReview content and metadata terms](https://openreview.net/legal/terms)
- [Europe PMC content and reuse guidance](https://europepmc.org/help)
- [Semantic Scholar API license](https://api.semanticscholar.org/license/)

## Next decision

D004 will define the first executable ingestion and claim-extraction pipeline. It must turn one admissible artifact into an immutable parsed document, stable source spans, versioned retrieval units, and quarantine-only claim proposals while preserving D003's identity, rights, and abstract-only constraints.
