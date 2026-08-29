# D004: Grounded document ingestion with Docling and parser comparison

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** First artifact-to-span-to-proposal pipeline, parser routing, structural documents, selectors, extraction gates, and initial chunking evaluation
- **Depends on:** [D001](D001-local-first-runtime.md), [D002](D002-postgres-neo4j-artifacts.md), [D003](D003-scholarly-discovery-and-rights.md)

## Decision

Petra will implement ingestion as a staged, inspectable workflow that creates an immutable structural reading of an admissible artifact before any model proposes scientific meaning.

The first pipeline will use:

- **Docling** as the default local PDF parser in a bounded Python worker;
- **GROBID** as the first optional scholarly-parser challenger and bibliographic enrichment path;
- direct ingestion of native JATS, TEI, or other supported structured artifacts when available;
- a Petra-owned, language-neutral `ParsedDocument` schema rather than a provider-specific document model;
- compound source selectors that combine exact artifact identity, page geometry, text quotes, and hashes;
- structural and claim-centered `RetrievalUnit` recipes derived from the same immutable parse;
- bounded model extraction that can create only provenance-bearing proposals;
- deterministic validation before a proposal enters quarantine;
- optional model-based criticism recorded separately from extraction and never treated as approval.

The first successful path will use a permissively licensed, born-digital scientific paper with a representative two-column layout, stable DOI and repository identity, sections, references, and at least one non-prose object such as a table or figure. A recent ACL Anthology paper is the preferred calibration source because it exercises a layout and domain Petra is likely to encounter early. The exact paper will be pinned in the implementation test manifest after D003 rights checks.

The calibration set will also contain:

- a native structured artifact when a suitable JATS or TEI paper is available, used to compare representations rather than declare automatic ground truth; and
- an abstract-only record that must remain visibly limited and cannot enter detailed method extraction.

OCR is a routed fallback, not a requirement for the first successful path. Tables receive structured, grounded extraction in D004. Figures, charts, and equations are preserved and linked in D004; model-based interpretation of their scientific meaning enters through an optional derived-proposal path.

## Context

D003 establishes which artifacts Petra may acquire and process. D004 must now turn one such artifact into stable scientific provenance without allowing a parser, chunker, or language model to become an invisible source of truth.

PDF is a presentation format, not a reliable semantic document format. Scientific papers add multiple columns, headers, footers, tables, figures, formulas, citations, footnotes, and reading-order ambiguities. A parser can return plausible text while dropping negation, interleaving columns, detaching a caption, flattening a table, or assigning the wrong section. Those failures can propagate into retrieval and claim extraction without an obvious runtime error.

Petra therefore treats parsing as a versioned scientific transformation with inspectable inputs, outputs, quality state, and alternatives. It does not treat text extraction as housekeeping.

## Workflow graph

The TypeScript application owns the workflow and its transitions:

```text
ACQUIRED
   ↓ rights and admissibility gate
ADMISSIBLE
   ↓ format and page inspection
INSPECTED
   ├── NEEDS_OCR
   ├── NEEDS_ALTERNATE_PARSE
   └── ready
          ↓
       PARSED
          ↓ quality and completeness assessment
       PARSE_ASSESSED
          ↓
       SPANS_BUILT
          ├── RETRIEVAL_UNITS_BUILT
          └── EXTRACTION_RUN
                    ↓
                 VALIDATED
                    ↓
                QUARANTINED
```

Any stage may also enter `BLOCKED_RIGHTS`, `PARTIAL`, `FAILED`, `CANCELLED`, or `SUPERSEDED` with an explicit reason. A partial parse remains inspectable, but failed or unverified pages cannot silently participate in extraction.

Agents may propose or run permitted transitions, such as retrying a page with OCR or requesting GROBID comparison. They cannot skip the rights gate, declare a parse complete, rewrite source bytes, promote a proposal, or hide a failed stage. The workflow graph, capability policy, and researcher-visible toggles govern those actions.

## Parser routing

### Default parser: Docling

Docling is the initial default because it runs locally within Petra's Python-worker boundary and exposes structured text, document hierarchy, tables, pictures, bounding boxes, and provenance. Its conversion result also distinguishes success, partial success, and failure and includes structured errors and confidence information.

Petra will not persist Docling's representation as its sole permanent document contract. It retains:

- the exact input artifact;
- the Docling conversion output;
- pipeline, package, component-model, configuration, and hardware versions;
- conversion status, errors, confidence grades, and timings;
- a normalized Petra `ParsedDocument` produced by a versioned adapter.

The default born-digital recipe uses the embedded text layer, layout analysis, reading-order recovery, and table structure processing. It does not force full-page OCR when the source has a usable text layer.

### Challenger: GROBID

GROBID is the first alternate parser because it specializes in technical and scientific papers, returns TEI, can segment paragraphs and sentences, extracts bibliographic references, and can attach PDF coordinates to relevant structures.

GROBID is not mandatory for every paper. Petra routes a document to it when:

- the researcher requests comparison;
- Docling reports partial or low-quality output;
- reference, citation-marker, header, or scholarly-section extraction is important;
- an evaluation sample requires parser disagreement analysis.

The additional Java service or container remains an optional local component. D004 does not add it to the minimum idle runtime when no job needs it.

### Native structured artifacts

When a publisher or repository supplies JATS, TEI, or another supported structured representation, Petra preserves and normalizes it as its own parse path. It does not discard the PDF or assume the structured source is complete, error-free, or identical to another copy.

Each representation produces a separate `ParsedDocument`. A `ParseSelection` record identifies which parse a downstream run used and why. A later composite parse must record its component parses and alignment decisions rather than silently splicing them together.

### OCR routing

Initial inspection records page count, page dimensions, encryption and extraction state, text-layer coverage, image coverage, suspicious glyph or encoding behavior, and parser-readable content.

Pages with absent or unusable text enter `NEEDS_OCR`. Petra then runs a separately versioned OCR recipe for those pages or the whole document when necessary. OCR output remains derived text tied to page regions, engine configuration, language, and quality signals. It is not silently substituted for source-native text.

The first vertical slice must detect and expose the OCR requirement but need not select the long-term OCR engine or pass a scanned-document acceptance test. OCR-engine comparison requires a separate degraded or scanned calibration fixture.

## Petra-owned document contract

### Runtime schema

`ParsedDocument`, parser jobs, result manifests, source selectors, retrieval units, and extraction proposals will use canonical JSON Schema contracts. TypeScript and Python representations are generated from or mechanically checked against those schemas. Compile-time TypeScript interfaces or Python classes cannot serve as the cross-language authority on their own.

The first schema includes:

- schema, adapter, and normalization versions;
- artifact, `WorkVersion`, and parser-run identifiers;
- source format and language when known;
- page identities, dimensions, and coordinate systems;
- ordered blocks and structural hierarchy;
- block kind, content layer, page locations, and reading order;
- paragraphs, sentences, headings, lists, footnotes, references, formulas, tables, figures, and captions;
- explicit parent, child, previous, and next structural references where applicable;
- extracted text and structured values when permitted;
- parser provenance, warnings, errors, and quality state;
- links from blocks and structured values to source selectors.

A parser-specific item ID may identify an element inside that parser output. It is not a durable cross-parse citation target.

### Immutability and selection

A parser, model, configuration, normalization, or source-artifact change creates a new `ParserRun` and `ParsedDocument`. Petra never edits a parse in place.

Researcher corrections create annotations, mappings, or a new derived document revision with explicit provenance. The original parser artifact remains available for comparison and replay.

`ParseSelection` records may choose one complete parse, select different page parses, or reject all available parses. Selection does not erase disagreement.

## Stable source spans

Every evidence-bearing selector resolves against one immutable artifact, not merely a parsed-document block.

For PDF, the default `compound` selector contains:

- artifact ID and SHA-256;
- one or more page numbers;
- page dimensions, coordinate origin, units, and selector-schema version;
- one or more bounding boxes or polygons;
- exact selected text when text exists and rights permit retention;
- selected-text hash;
- optional prefix and suffix quotes for disambiguation;
- optional structural path and parser-run reference;
- extraction and verification state.

Normalized character offsets count Unicode code points, not UTF-16 code units
or encoded bytes. This keeps selector boundaries identical in TypeScript and
Python, including for non-BMP characters.

For XML, HTML, JSON, code, or other structured sources, a compound selector may use a structural pointer, exact quote, surrounding quote, content hash, and optional rendered location.

A selector verification run records whether it resolves:

- exactly by text and geometry;
- by permitted normalization with the exact transformations recorded;
- visually by page region only;
- through a reviewed manual alignment;
- not at all.

The UI uses the selector to highlight the original artifact. Parser upgrades may create new block alignments, but they do not rewrite an accepted span against the old artifact.

## Tables, figures, and equations

### Tables

D004 treats a table as structured source content rather than flattened prose. Petra preserves:

- table page region and image crop when permitted;
- title, caption, footnotes, and nearby textual references;
- rows, columns, cells, row and column spans, headers, and reading order;
- cell text, numbers, units, and uncertainty notation;
- provenance from every extracted cell back to its page region;
- parser warnings and unresolved structure.

A model may propose a narrow table-backed claim when the relevant row, column, headers, value, unit, note, and table region all resolve. For example, reporting two exact values from identified cells is distinct from concluding that one method is generally superior.

If table structure or header alignment is uncertain, Petra may preserve the table and block automatic quantitative claims from it. It does not repair missing cells through model completion.

### Figures and charts

D004 preserves figure and chart regions, captions, labels extracted by the parser, in-text references, and surrounding discussion. A figure remains useful for inspection even when Petra cannot interpret it automatically.

An optional `VisualInterpretationProposal` may later use a local or approved remote vision model to propose an interpretation from:

- the exact figure or chart region;
- caption;
- visible axes, units, and legend;
- surrounding source text;
- question or extraction purpose.

The proposal is model-derived, never source-native. It records the model call, input regions, visible labels, uncertainties, and validation results and enters quarantine. It cannot fill missing source text or bypass review.

### Equations

Petra preserves formula regions, extracted text or LaTeX when available, identifiers, and surrounding definitions. A semantic description of an equation is a derived proposal unless the source text states it explicitly.

## Extraction contract

### Bounded extraction jobs

Claim extraction is a bounded worker job, not an open-ended agent conversation. It receives:

- an admissible parse selection;
- selected blocks or spans and bounded structural context;
- artifact and abstract-only policy;
- a versioned extraction schema and prompt;
- model and tool capability context;
- explicit proposal types allowed for the run.

The extractor may propose:

- research objective or source-stated question;
- hypothesis or prediction;
- methodological detail;
- empirical result;
- limitation or boundary condition;
- definition or theoretical statement;
- dataset, measure, model, population, intervention, comparator, or outcome references;
- source-explicit relations among those objects.

It cannot directly create a trusted graph assertion, merge identities, infer cross-paper support or contradiction as accepted fact, or convert missing information into a positive or negative result.

### Proposal shape

Every scientific proposal includes:

- proposal and extraction-run identifiers;
- exact source quote or explicitly visual source region;
- one or more verified `SourceSpan` identifiers;
- normalized proposition or structured object;
- proposal type, claim kind, and structured scope;
- source stance such as `states`, `hypothesizes`, `reports`, `qualifies`, or `rejects`;
- relevant attribution, negation, modality, comparator, and uncertainty;
- extraction model, prompt, parameters, tokenizer, and context packet;
- validation outcomes, warnings, and ambiguity;
- quarantine-only review state.

One claim proposal should express one proposition. A composed synthesis is not emitted as though it were a source-native normalized claim.

Abstract-only extraction follows D003: it may produce only broad source-reported purposes, high-level findings, or conclusions. It cannot produce detailed method, validity, bias, causal-mechanism, or reproducibility assessments.

## Validation before quarantine

The TypeScript application validates worker results before committing proposals to quarantine.

Deterministic gates verify:

- job, schema, artifact, parse, model, prompt, and rights identities;
- source-span resolution and content hashes;
- exact quotation or declared normalization;
- table-cell, caption, figure, or equation grounding where applicable;
- presence and preservation of reported numbers, units, sample sizes, dataset names, model names, and comparators;
- basic negation, attribution, and modality markers;
- scope fields do not introduce unsupported entities or values;
- proposal type is permitted for full-text or abstract-only source scope;
- extraction did not use failed, blocked, or unverified pages;
- duplicate and near-duplicate proposal state is explicit.

Deterministic checks do not establish semantic entailment. An optional critic model may evaluate quotation entailment, scope preservation, atomicity, and likely contradiction, but its output is a separate validation proposal with its own provenance.

A critic cannot silently rewrite an extraction. Repair creates a new proposal revision linked to the rejected or superseded proposal. Passing all validators still means “eligible for researcher review,” not “scientifically accepted.”

Malformed, ungrounded, or policy-violating output remains in the job log and failure artifacts. It does not appear as a valid scientific proposal.

## Retrieval-unit recipes

Source spans remain the evidence and citation targets. Retrieval units are replaceable search projections.

### Structural recipe

The structural recipe:

- follows section hierarchy and reading order;
- does not cross a section boundary unless the recipe explicitly permits it;
- keeps captions, table headers, footnotes, attribution, and definitions with dependent content;
- splits oversized blocks at sentence or other declared structural boundaries;
- may merge small adjacent peers that share the same heading and content type;
- records previous and next blocks instead of relying only on duplicated overlap;
- serializes title, heading path, content kind, and version context separately from source text;
- uses a pinned tokenizer aligned with the intended embedding recipe.

Token ceilings and merge thresholds are recipe parameters, not permanent corpus properties.

### Claim-centered recipe

The claim-centered recipe:

- begins with a validated claim proposal or candidate claim span;
- includes its containing paragraph or table region;
- restores necessary attribution, comparator, qualifiers, uncertainty, and nearby definitions;
- includes bounded preceding or following structural context when the proposition depends on it;
- repeats table headers and notes when table rows must be segmented;
- retains ordered source-span references for all included content;
- records which context was added by the recipe rather than the source claim itself.

Changing or rejecting a claim proposal creates or invalidates corresponding claim-centered projections without modifying the structural parse.

### Diagnostic fixed-window baseline

Petra may generate a fixed-token, fixed-overlap recipe as a cheap control. It is not the preferred scientific representation and never becomes the citation target.

## Evaluation

The first evaluation suite freezes artifact hashes, parse selections, source-span judgments, queries, retrieval recipes, tokenizer, embedding model when used, top-k, and context budget.

Parser evaluation includes:

- reading-order and section-hierarchy accuracy;
- text omission, duplication, and corruption;
- selector round-trip success;
- table cell, header, caption, and note fidelity;
- figure and caption association;
- reference segmentation and identifier matching;
- page-level failure detection;
- latency and compute requirements.

Extraction evaluation includes:

- exact-span grounding;
- atomic-claim precision;
- normalization and quotation entailment;
- number, unit, negation, modality, and scope preservation;
- unsupported-proposal rate;
- abstention on unavailable detail;
- researcher correction and rejection effort.

Retrieval evaluation compares structural and claim-centered recipes under the same budgets and includes:

- source-span recall;
- contrary-evidence recall;
- citation entailment;
- scope and negation preservation;
- evidence coverage and redundancy;
- latency, storage, and model cost.

The calibration suite reports slices and failure examples rather than hiding parser, extraction, and retrieval errors in one aggregate score.

## Researcher controls and UX

The ingestion view exposes:

- original artifact and rights state;
- current workflow stage and queued actions;
- parse selection, parser version, quality state, and failed pages;
- source-highlight preview for structural blocks and spans;
- tables, figures, formulas, captions, and unresolved associations;
- extraction and validation runs;
- quarantine proposals and rejection reasons;
- derived retrieval recipes and evaluation runs.

Per project or ingestion run, the researcher can toggle:

- automatic progression through safe stages;
- OCR fallback;
- GROBID or another alternate parse;
- claim, method, result, and limitation extraction;
- optional critic validation;
- optional visual interpretation;
- remote processing when both D001 and D003 allow it.

Pausing or disabling a stage does not lose completed immutable artifacts. Resuming continues from the recorded workflow state.

## TypeScript and Python responsibilities

TypeScript owns:

- workflow commands and transition guards;
- D001 capability and D003 rights checks;
- job creation, idempotency, cancellation, and budgets;
- runtime validation of Python results;
- authoritative commits, events, quarantine state, and outbox projection;
- parse selection and researcher controls.

Python workers own:

- Docling and GROBID adapter execution;
- native structured-document normalization;
- OCR, layout, table, and figure extraction;
- deterministic linguistic preprocessing where selected;
- bounded claim extraction and model-based validation jobs;
- result manifests and immutable derived artifacts.

Python workers do not write PostgreSQL or Neo4j directly. A parser or model failure cannot partially mutate trusted scientific state.

## Consequences

### Benefits

- Petra has one stable document and source-span contract across parsers.
- Parser upgrades and comparisons do not require source re-ingestion or overwrite evidence.
- Failed pages, OCR, tables, and figures become visible workflow states.
- Exact source geometry and quotations support inspectable PDF highlighting.
- Model extraction cannot silently invent missing document content or promote itself.
- Tables can support narrow quantitative claims without flattening away headers and notes.
- Visual interpretation remains available without being confused with source-native text.
- Chunking stays an experimental retrieval variable rather than a corpus mutation.

### Costs and risks

- Petra must maintain adapters from Docling, GROBID, and native formats into its schema.
- Compound selectors and visual highlighting require careful coordinate normalization.
- Local layout models and optional GROBID add installation size and compute cost.
- Parser confidence signals may fail to detect plausible but consequential errors.
- Table extraction quality will vary by layout and domain.
- Claim-centered retrieval depends on extraction quality and requires invalidation when proposals change.
- Hand-labeled parser, extraction, and retrieval judgments require researcher time.

## Alternatives considered

### Persist DoclingDocument as Petra's canonical format

Rejected because it would couple Petra's durable provenance contract to one parser's schema and release history.

### GROBID as the mandatory default

Rejected for the first slice because its scholarly specialization is valuable but its Java service makes the minimum local package heavier. It remains the first challenger and enrichment path.

### Markdown as the canonical parse

Rejected because Markdown loses page geometry, content layers, table-cell provenance, parser errors, and competing structural interpretations.

### OCR every page

Rejected because it increases cost and can discard useful source-native typography or introduce recognition errors. OCR is routed to pages that need it.

### Interpret every visual during ingestion

Rejected because it would spend substantial compute, expand the attack and egress surface, and convert uncertain VLM output into apparently native document content.

### Chunk before preserving structure

Rejected because chunk boundaries would become the only remaining document model and parser or retrieval changes would require re-ingestion.

### One model extracts and approves claims

Rejected because agreement with itself does not establish grounding. Extraction, deterministic checks, optional criticism, and researcher review remain separate acts.

## Validation

D004 is satisfied when Petra can:

1. acquire one permissively licensed calibration PDF through D003's source path and bind it to the correct `WorkVersion`;
2. inspect the artifact and record whether OCR is required;
3. run Docling locally through a versioned Python job and retain input, output, errors, confidence, timing, and recipe provenance;
4. normalize the result into a runtime-validated Petra `ParsedDocument` without making Docling's schema authoritative;
5. run the same adapter contract for at least one GROBID or native structured parse;
6. retain multiple parses and select one without deleting or rewriting the others;
7. create compound source spans that round-trip to highlighted PDF regions and verified text;
8. expose a partial or failed page and prevent extraction from silently using it;
9. preserve one table's cells, headers, notes, caption, and page grounding;
10. preserve one figure or equation region and distinguish source-native content from any derived interpretation;
11. produce a narrow table-backed proposal only when its values, headers, units, notes, and source region resolve;
12. produce text-backed claim, method, result, and limitation proposals with exact spans and complete run provenance;
13. reject malformed, ungrounded, numerically altered, rights-violating, or source-scope-violating output before quarantine;
14. enforce D003's broad-claims-only abstract policy on the abstract-only control;
15. generate structural and claim-centered retrieval units from the same parse without changing source spans;
16. run a frozen comparison of the retrieval recipes under equal query and context budgets;
17. pause, resume, retry, cancel, or disable permitted pipeline stages without losing completed immutable artifacts;
18. project accepted workflow and quarantine state into Neo4j while tracing every object back to PostgreSQL events and artifact hashes.

## Deferred decisions

D004 does not choose:

- exact pinned Docling, GROBID, OCR, layout-model, or component-model versions;
- the long-term OCR engine or scanned-document benchmark;
- the default embedding or reranking model;
- extraction and critic model assignments, which belong to D007;
- autonomous interpretation of complex charts, diagrams, photographs, or mathematical derivations;
- automated methodological-quality and risk-of-bias assessment;
- cross-paper evidence synthesis and contradiction adjudication;
- trusted-graph promotion and direct editing, which belong to D005;
- final chunk sizes or measured success thresholds before the calibration suite exists;
- the exact implementation libraries for JSON Schema validation and code generation.

These choices must preserve the immutable artifact, parse, selector, proposal, and run boundaries established here.

## Revisit triggers

Reconsider D004 if:

- Docling fails representative scientific layouts or local packaging requirements;
- GROBID or another parser clearly dominates the measured quality and operational trade-off;
- compound selectors cannot round-trip reliably in the supported viewer;
- normalization into Petra's schema loses material parser information;
- table structure is too unreliable to permit grounded quantitative extraction;
- claim-centered retrieval does not improve relevant or contrary source-span recall;
- deterministic gates permit material unsupported transformations at an unacceptable rate;
- local parsing cost or latency makes the intended research cadence impractical;
- native structured sources cover enough of the target corpus to justify a different default route.

Any replacement must preserve artifact hashes, parser and model provenance, source-span stability, quarantine-only proposals, and reproducible retrieval recipes.

## References considered

- [Docling document model](https://docling-project.github.io/docling/concepts/docling_document/)
- [Docling conversion results and statuses](https://docling-project.github.io/docling/reference/document_converter/)
- [Docling confidence reports](https://docling-project.github.io/docling/concepts/confidence_scores/)
- [Docling PDF, OCR, table, and image options](https://docling-project.github.io/docling/reference/pipeline_options/)
- [Docling structural and hybrid chunking](https://docling-project.github.io/docling/concepts/chunking/)
- [Docling installation and supported platforms](https://docling-project.github.io/docling/getting_started/installation/)
- [GROBID design for scientific documents](https://grobid.readthedocs.io/en/latest/Principles/)
- [GROBID full-text and reference API](https://grobid.readthedocs.io/en/latest/Grobid-service/)
- [GROBID PDF coordinates](https://grobid.readthedocs.io/en/latest/Coordinates-in-PDF/)
- [GROBID license](https://grobid.readthedocs.io/en/latest/License/)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [W3C Web Annotation Data Model selectors](https://www.w3.org/TR/annotation-model/)

## Next decision

D005 will define trusted-graph review and direct editing. It must turn quarantine proposals and visible source spans into understandable, atomic, reversible graph changes without making the researcher approve opaque batches or edit Neo4j directly.
