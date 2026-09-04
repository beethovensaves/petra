import { createHash } from "node:crypto";

import type {
  ActorRef,
  CitationEntry,
  PetraArtifact,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraRenderedArtifact,
  RenderWarning,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { CompositionAggregate } from "./composition-registry.js";
import { derivePetraId } from "./identity.js";

export type CompositionRenderFormat = "markdown" | "latex" | "bibtex";

export type CompositionRendererErrorCode =
  | "COMPOSITION_RENDERER_ACTOR_INVALID"
  | "COMPOSITION_RENDERER_AGGREGATE_INVALID"
  | "COMPOSITION_RENDERER_FORMAT_NOT_REQUESTED";

export class CompositionRendererError extends Error {
  readonly code: CompositionRendererErrorCode;

  constructor(code: CompositionRendererErrorCode, message: string) {
    super(message);
    this.name = "CompositionRendererError";
    this.code = code;
  }
}

export interface RenderCompositionInput {
  aggregate: CompositionAggregate;
  renderedBy: ActorRef;
  renderedAt: string;
}

export interface RenderedCompositionArtifact {
  format: CompositionRenderFormat;
  record: PetraRenderedArtifact;
  artifact: PetraArtifact;
  text: string;
  bytes: Uint8Array;
  semanticContentHash: string;
  draftRef: {
    draft_artifact_id: string;
    revision: number;
    content_hash: string;
  };
  citationBundleRef: {
    citation_bundle_id: string;
    revision: number;
    content_hash: string;
  };
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const RENDERER_PROFILE = {
  name: "petra.deterministic-composition-renderer",
  version: "1.0.0",
  supported_formats: ["markdown", "latex", "bibtex"],
  encoding: "utf-8",
  line_ending: "lf",
  citation_rendering: "linked_span_suffix",
  bibliography_rendering: "canonical_metadata_only",
  scientific_authority: "none",
} as const;

const RENDERER_PROFILE_HASH = canonicalHash(RENDERER_PROFILE);

const mediaType = (format: CompositionRenderFormat): string => {
  switch (format) {
    case "markdown":
      return "text/markdown; charset=utf-8";
    case "latex":
      return "application/x-latex; charset=utf-8";
    case "bibtex":
      return "application/x-bibtex; charset=utf-8";
  }
};

const escapeMarkdown = (value: string): string =>
  value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");

const escapeLatex = (value: string): string =>
  [...value]
    .map((character) => {
      switch (character) {
        case "\\":
          return "\\textbackslash{}";
        case "{":
          return "\\{";
        case "}":
          return "\\}";
        case "$":
          return "\\$";
        case "&":
          return "\\&";
        case "#":
          return "\\#";
        case "_":
          return "\\_";
        case "%":
          return "\\%";
        case "^":
          return "\\textasciicircum{}";
        case "~":
          return "\\textasciitilde{}";
        default:
          return character;
      }
    })
    .join("");

const publishedDate = (citation: CitationEntry): string =>
  citation.metadata.published_date?.value ?? "n.d.";

const publicationYear = (citation: CitationEntry): string =>
  citation.metadata.published_date?.value.slice(0, 4) ?? "n.d.";

const displayAuthors = (citation: CitationEntry): string =>
  [...citation.author_refs]
    .sort((left, right) => left.position - right.position)
    .map((author) => author.display_name)
    .join(", ");

const identifierLabel = (
  citation: CitationEntry,
): { label: string; value: string } | undefined => {
  const order = [
    "doi",
    "arxiv",
    "pmid",
    "acl_anthology",
    "repository_url",
    "isbn",
    "openalex_work",
    "semantic_scholar_work",
  ];
  const identifiers = [...citation.external_identifier_refs].sort(
    (left, right) =>
      (order.indexOf(left.namespace) === -1
        ? order.length
        : order.indexOf(left.namespace)) -
      (order.indexOf(right.namespace) === -1
        ? order.length
        : order.indexOf(right.namespace)),
  );
  const identifier = identifiers[0];
  return identifier === undefined
    ? undefined
    : { label: identifier.namespace, value: identifier.normalized_value };
};

const visibleWarnings = (citation: CitationEntry): string[] => {
  const warnings = citation.identity_warnings.map((warning) => warning.message);
  if (citation.metadata_completeness !== "complete") {
    warnings.push(`Metadata is ${citation.metadata_completeness}.`);
  }
  if (citation.metadata.publication_status === "retracted") {
    warnings.push("The cited WorkVersion is retracted.");
  }
  warnings.push(
    `Source access: ${citation.source_access.processing_depth.replaceAll("_", " ")}.`,
  );
  return [...new Set(warnings)];
};

const renderWarnings = (
  citations: readonly CitationEntry[],
): RenderWarning[] => {
  const warnings = new Map<string, RenderWarning>();
  const add = (warning: RenderWarning): void => {
    warnings.set(`${warning.code}:${warning.message}`, warning);
  };
  for (const citation of citations) {
    for (const warning of citation.identity_warnings) add(warning);
    if (citation.metadata_completeness !== "complete") {
      add({
        code: `CITATION_METADATA_${citation.metadata_completeness.toUpperCase()}`,
        message: `Citation ${citation.bibliography_key} has ${citation.metadata_completeness} canonical metadata.`,
      });
    }
    if (citation.metadata.publication_status === "retracted") {
      add({
        code: "CITED_VERSION_RETRACTED",
        message: `Citation ${citation.bibliography_key} identifies a retracted WorkVersion.`,
      });
    }
    if (citation.source_access.processing_depth === "abstract_only") {
      add({
        code: "ABSTRACT_ONLY_SOURCE",
        message: `Citation ${citation.bibliography_key} was composed from abstract-only evidence.`,
      });
    }
  }
  return [...warnings.values()].sort((left, right) =>
    `${left.code}:${left.message}`.localeCompare(
      `${right.code}:${right.message}`,
    ),
  );
};

const markdownReference = (citation: CitationEntry): string => {
  const identifier = identifierLabel(citation);
  const parts = [
    `${escapeMarkdown(displayAuthors(citation))} (${escapeMarkdown(publicationYear(citation))}).`,
    `${escapeMarkdown(citation.metadata.title)}.`,
    `${escapeMarkdown(citation.metadata.version_label)}.`,
  ];
  if (identifier !== undefined) {
    parts.push(
      `${escapeMarkdown(identifier.label.toUpperCase())}: ${escapeMarkdown(identifier.value)}.`,
    );
  }
  const warnings = visibleWarnings(citation);
  if (warnings.length > 0) {
    parts.push(`_[${warnings.map(escapeMarkdown).join(" ")}]_`);
  }
  return parts.join(" ");
};

const latexReference = (citation: CitationEntry): string => {
  const identifier = identifierLabel(citation);
  const parts = [
    `${escapeLatex(displayAuthors(citation))} (${escapeLatex(publicationYear(citation))}).`,
    `${escapeLatex(citation.metadata.title)}.`,
    `${escapeLatex(citation.metadata.version_label)}.`,
  ];
  if (identifier !== undefined) {
    parts.push(
      `${escapeLatex(identifier.label.toUpperCase())}: ${escapeLatex(identifier.value)}.`,
    );
  }
  const warnings = visibleWarnings(citation);
  if (warnings.length > 0) {
    parts.push(`\\emph{[${warnings.map(escapeLatex).join(" ")}]}`);
  }
  return parts.join(" ");
};

const bibtexEntryType = (citation: CitationEntry): string => {
  switch (citation.metadata.work_kind) {
    case "journal_article":
      return "article";
    case "conference_paper":
      return "inproceedings";
    case "book":
      return "book";
    case "chapter":
      return "incollection";
    case "thesis":
      return "phdthesis";
    case "preprint":
    case "other":
      return "misc";
  }
};

const bibtexEntry = (citation: CitationEntry): string => {
  const fields: { name: string; value: string; encoded?: boolean }[] = [
    {
      name: "author",
      value: [...citation.author_refs]
        .sort((left, right) => left.position - right.position)
        .map((author) => `{${escapeLatex(author.display_name)}}`)
        .join(" and "),
      encoded: true,
    },
    { name: "title", value: citation.metadata.title },
  ];
  if (citation.metadata.published_date !== null) {
    fields.push({ name: "year", value: publicationYear(citation) });
    if (citation.metadata.published_date.precision !== "year") {
      fields.push({ name: "date", value: publishedDate(citation) });
    }
  }
  const notes = [
    `Version: ${citation.metadata.version_label}.`,
    `Publication status: ${citation.metadata.publication_status.replaceAll("_", " ")}.`,
    ...visibleWarnings(citation),
  ];
  for (const identifier of citation.external_identifier_refs) {
    switch (identifier.namespace) {
      case "doi":
        fields.push({ name: "doi", value: identifier.normalized_value });
        break;
      case "isbn":
        fields.push({ name: "isbn", value: identifier.normalized_value });
        break;
      case "repository_url":
        fields.push({ name: "url", value: identifier.normalized_value });
        break;
      case "arxiv":
        fields.push({ name: "eprint", value: identifier.normalized_value });
        fields.push({ name: "archiveprefix", value: "arXiv" });
        break;
      default:
        notes.push(
          `${identifier.namespace}: ${identifier.normalized_value} (${identifier.verification_status}).`,
        );
    }
  }
  fields.push({ name: "note", value: [...new Set(notes)].join(" ") });
  const renderedFields = fields
    .map(
      ({ name, value, encoded }) =>
        `  ${name} = {${encoded === true ? value : escapeLatex(value)}},`,
    )
    .join("\n");
  return `@${bibtexEntryType(citation)}{${citation.bibliography_key},\n${renderedFields}\n}`;
};

export class DeterministicCompositionRenderer {
  readonly #contracts: PetraContractRegistry;

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  renderRequested(
    input: RenderCompositionInput,
  ): RenderedCompositionArtifact[] {
    this.#assertInput(input);
    const requested = new Set(
      input.aggregate.citationBundle.content.export_formats,
    );
    return (["markdown", "latex", "bibtex"] as const)
      .filter((format) => requested.has(format))
      .map((format) => this.#renderValidated(input, format));
  }

  renderOne(
    input: RenderCompositionInput,
    format: CompositionRenderFormat,
  ): RenderedCompositionArtifact {
    this.#assertInput(input);
    if (
      !input.aggregate.citationBundle.content.export_formats.includes(format)
    ) {
      throw new CompositionRendererError(
        "COMPOSITION_RENDERER_FORMAT_NOT_REQUESTED",
        `The CitationBundle did not authorize a ${format} export.`,
      );
    }
    return this.#renderValidated(input, format);
  }

  #renderValidated(
    input: RenderCompositionInput,
    format: CompositionRenderFormat,
  ): RenderedCompositionArtifact {
    const text = this.#renderText(input.aggregate, format);
    const bytes = new TextEncoder().encode(text);
    const artifact: PetraArtifact = {
      schema_name: "petra.artifact",
      schema_version: "1.0.0",
      artifact_id: derivePetraId(
        "artifact",
        [
          "composition-render",
          input.aggregate.draft.draft_artifact_id,
          input.aggregate.draft.revision,
          input.aggregate.draft.content_hash,
          input.aggregate.citationBundle.content_hash,
          format,
        ].join(":"),
      ),
      revision: 1,
      artifact_kind: "export",
      media_type: mediaType(format),
      content_hash: textHash(text),
      byte_size: bytes.byteLength,
      created_by: structuredClone(input.renderedBy),
      created_at: input.renderedAt,
    };
    this.#contracts.assertValid("artifact", "1.0.0", artifact);
    const citations = input.aggregate.citationBundle.content.citations;
    const transformations: PetraRenderedArtifact["content"]["transformations"] =
      format === "markdown"
        ? [
            {
              kind: "citation_insertion",
              behavior:
                "Append canonical bibliography keys to linked DraftSpans.",
              lossy: false,
              semantic_effect: "none",
            },
            {
              kind: "bibliography_projection",
              behavior:
                "Render only canonical citation metadata and visible warnings.",
              lossy: false,
              semantic_effect: "none",
            },
            {
              kind: "document_wrapper",
              behavior: "Add a provenance comment and References section.",
              lossy: false,
              semantic_effect: "none",
            },
          ]
        : format === "latex"
          ? [
              {
                kind: "citation_insertion",
                behavior:
                  "Append LaTeX citation commands to linked DraftSpans.",
                lossy: false,
                semantic_effect: "none",
              },
              {
                kind: "syntax_escape",
                behavior:
                  "Escape LaTeX control characters while retaining Unicode text.",
                lossy: false,
                semantic_effect: "none",
              },
              {
                kind: "bibliography_projection",
                behavior:
                  "Render only canonical citation metadata and visible warnings.",
                lossy: false,
                semantic_effect: "none",
              },
              {
                kind: "document_wrapper",
                behavior: "Wrap the draft in a standalone article document.",
                lossy: false,
                semantic_effect: "none",
              },
            ]
          : [
              {
                kind: "syntax_escape",
                behavior:
                  "Escape BibTeX field values without parsing canonical display names.",
                lossy: false,
                semantic_effect: "none",
              },
              {
                kind: "bibliography_projection",
                behavior:
                  "Project citations only; omit unavailable bibliographic fields.",
                lossy: false,
                semantic_effect: "none",
              },
              {
                kind: "document_wrapper",
                behavior: "Add source-record comments to the BibTeX file.",
                lossy: false,
                semantic_effect: "none",
              },
            ];
    const content: PetraRenderedArtifact["content"] = {
      format,
      content_scope:
        format === "bibtex" ? "citations_only" : "draft_with_citations",
      renderer: {
        name: RENDERER_PROFILE.name,
        version: RENDERER_PROFILE.version,
        content_hash: RENDERER_PROFILE_HASH,
      },
      options: {
        encoding: "utf-8",
        line_ending: "lf",
        citation_rendering: "linked_span_suffix",
        bibliography_rendering: "canonical_metadata_only",
        standalone_document: format === "latex",
      },
      output_artifact_ref: {
        artifact_id: artifact.artifact_id,
        revision: artifact.revision,
        content_hash: artifact.content_hash,
        byte_size: artifact.byte_size,
        media_type: artifact.media_type,
      },
      semantic_content_hash: input.aggregate.draft.content_hash,
      warnings: renderWarnings(citations),
      transformations,
      authority_boundary: {
        rendered_artifact_is_scientific_authority: false,
        renderer_may_change_support: false,
      },
    };
    const record: PetraRenderedArtifact = {
      schema_name: "petra.rendered-artifact",
      schema_version: "1.0.0",
      rendered_artifact_id: derivePetraId(
        "rendered_artifact",
        artifact.artifact_id,
      ),
      revision: 1,
      project_id: input.aggregate.draft.project_id,
      draft_ref: {
        draft_artifact_id: input.aggregate.draft.draft_artifact_id,
        revision: input.aggregate.draft.revision,
        content_hash: input.aggregate.draft.content_hash,
      },
      citation_bundle_ref: {
        citation_bundle_id: input.aggregate.citationBundle.citation_bundle_id,
        revision: input.aggregate.citationBundle.revision,
        content_hash: input.aggregate.citationBundle.content_hash,
      },
      content,
      content_hash: canonicalHash(content),
      rendered_by: structuredClone(input.renderedBy),
      rendered_at: input.renderedAt,
    };
    this.#contracts.assertValid("rendered-artifact", "1.0.0", record);
    return {
      format,
      record,
      artifact,
      text,
      bytes,
      semanticContentHash: input.aggregate.draft.content_hash,
      draftRef: {
        draft_artifact_id: input.aggregate.draft.draft_artifact_id,
        revision: input.aggregate.draft.revision,
        content_hash: input.aggregate.draft.content_hash,
      },
      citationBundleRef: {
        citation_bundle_id: input.aggregate.citationBundle.citation_bundle_id,
        revision: input.aggregate.citationBundle.revision,
        content_hash: input.aggregate.citationBundle.content_hash,
      },
    };
  }

  #renderText(
    aggregate: CompositionAggregate,
    format: CompositionRenderFormat,
  ): string {
    const draft = aggregate.draft;
    const citations = aggregate.citationBundle.content.citations;
    if (format === "bibtex") {
      return [
        `% Petra DraftArtifact: ${draft.draft_artifact_id}@${draft.revision}`,
        `% Semantic content hash: ${draft.content_hash}`,
        `% CitationBundle: ${aggregate.citationBundle.citation_bundle_id}@${aggregate.citationBundle.revision}`,
        "",
        citations.map(bibtexEntry).join("\n\n"),
        "",
      ].join("\n");
    }
    const citationsBySpan = this.#citationsBySpan(citations);
    if (format === "markdown") {
      const body = this.#decorateDraft(
        draft,
        aggregate.spans,
        citationsBySpan,
        (keys) => ` [${keys.map((key) => `@${key}`).join("; ")}]`,
        (value) => value,
      );
      const references = citations
        .map(
          (citation) =>
            `- <a id="ref-${citation.bibliography_key}"></a>[@${citation.bibliography_key}] ${markdownReference(citation)}`,
        )
        .join("\n");
      return [
        `<!-- Petra DraftArtifact ${draft.draft_artifact_id}@${draft.revision}; semantic-content-hash ${draft.content_hash}; CitationBundle ${aggregate.citationBundle.citation_bundle_id}@${aggregate.citationBundle.revision} -->`,
        "",
        body,
        "",
        "## References",
        "",
        references,
        "",
      ].join("\n");
    }
    const body = this.#decorateDraft(
      draft,
      aggregate.spans,
      citationsBySpan,
      (keys) => ` \\cite{${keys.join(",")}}`,
      escapeLatex,
    );
    const references = citations
      .map(
        (citation) =>
          `\\bibitem{${citation.bibliography_key}} ${latexReference(citation)}`,
      )
      .join("\n");
    return [
      `%% Petra DraftArtifact ${draft.draft_artifact_id}@${draft.revision}`,
      `%% Semantic content hash: ${draft.content_hash}`,
      `%% CitationBundle: ${aggregate.citationBundle.citation_bundle_id}@${aggregate.citationBundle.revision}`,
      "\\documentclass{article}",
      "\\usepackage[T1]{fontenc}",
      "\\usepackage[utf8]{inputenc}",
      "\\begin{document}",
      body,
      "",
      "\\begin{thebibliography}{99}",
      references,
      "\\end{thebibliography}",
      "\\end{document}",
      "",
    ].join("\n");
  }

  #citationsBySpan(
    citations: readonly CitationEntry[],
  ): ReadonlyMap<string, readonly string[]> {
    const values = new Map<string, string[]>();
    for (const citation of citations) {
      for (const spanId of citation.linked_draft_span_ids) {
        const keys = values.get(spanId) ?? [];
        keys.push(citation.bibliography_key);
        values.set(spanId, keys);
      }
    }
    return new Map(
      [...values.entries()].map(([spanId, keys]) => [
        spanId,
        [...new Set(keys)].sort(),
      ]),
    );
  }

  #decorateDraft(
    draft: PetraDraftArtifact,
    spans: readonly PetraDraftSpan[],
    citationsBySpan: ReadonlyMap<string, readonly string[]>,
    citation: (keys: readonly string[]) => string,
    escape: (value: string) => string,
  ): string {
    const codePoints = Array.from(draft.content.text);
    const sorted = [...spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    const fragments: string[] = [];
    let cursor = 0;
    for (const span of sorted) {
      fragments.push(
        escape(codePoints.slice(cursor, span.content.end).join("")),
      );
      const keys = citationsBySpan.get(span.draft_span_id) ?? [];
      if (keys.length > 0) fragments.push(citation(keys));
      cursor = span.content.end;
    }
    fragments.push(escape(codePoints.slice(cursor).join("")));
    return fragments.join("");
  }

  #assertInput(input: RenderCompositionInput): void {
    if (input.renderedBy.actor_kind !== "service") {
      throw new CompositionRendererError(
        "COMPOSITION_RENDERER_ACTOR_INVALID",
        "Deterministic composition exports must name their service renderer.",
      );
    }
    const { draft, spans, provenanceMap, citationBundle } = input.aggregate;
    try {
      this.#contracts.assertValid("draft-artifact", "1.0.0", draft);
      for (const span of spans) {
        this.#contracts.assertValid("draft-span", "1.0.0", span);
      }
      this.#contracts.assertValid("provenance-map", "1.0.0", provenanceMap);
      this.#contracts.assertValid("citation-bundle", "1.0.0", citationBundle);
    } catch (error) {
      throw new CompositionRendererError(
        "COMPOSITION_RENDERER_AGGREGATE_INVALID",
        `The composition aggregate failed contract validation: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    const draftRef = {
      draft_artifact_id: draft.draft_artifact_id,
      revision: draft.revision,
      content_hash: draft.content_hash,
    };
    const spanIds = spans.map((span) => span.draft_span_id);
    const codePoints = Array.from(draft.content.text);
    const sorted = [...spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    let priorEnd = 0;
    const spansValid = sorted.every((span) => {
      const exact = codePoints
        .slice(span.content.start, span.content.end)
        .join("");
      const valid =
        same(span.draft_ref, draftRef) &&
        span.content_hash === canonicalHash(span.content) &&
        span.content.start >= priorEnd &&
        span.content.end > span.content.start &&
        exact === span.content.exact_text &&
        textHash(exact) === span.content.exact_text_hash;
      priorEnd = span.content.end;
      return valid;
    });
    const mappedIds = provenanceMap.content.mappings.map(
      (mapping) => mapping.draft_span_id,
    );
    const citedIds = citationBundle.content.citations.flatMap(
      (entry) => entry.linked_draft_span_ids,
    );
    if (
      draft.content_hash !== canonicalHash(draft.content) ||
      provenanceMap.content_hash !== canonicalHash(provenanceMap.content) ||
      citationBundle.content_hash !== canonicalHash(citationBundle.content) ||
      !same(draft.content.draft_span_ids, spanIds) ||
      !same(provenanceMap.draft_ref, draftRef) ||
      !same(citationBundle.draft_ref, draftRef) ||
      !same(provenanceMap.evidence_packet_ref, draft.evidence_packet_ref) ||
      !same(citationBundle.evidence_packet_ref, draft.evidence_packet_ref) ||
      new Set(mappedIds).size !== spans.length ||
      spanIds.some((id) => !mappedIds.includes(id)) ||
      citedIds.some((id) => !spanIds.includes(id)) ||
      spans.some(
        (span) =>
          span.content.materiality === "material" &&
          span.content.semantic_origin === "source_report" &&
          !citedIds.includes(span.draft_span_id),
      ) ||
      !spansValid
    ) {
      throw new CompositionRendererError(
        "COMPOSITION_RENDERER_AGGREGATE_INVALID",
        "Rendering requires one hash-valid aggregate with exact span, provenance, evidence, and citation references.",
      );
    }
  }
}
