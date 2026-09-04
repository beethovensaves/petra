import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraAssertion,
  PetraClaim,
  PetraOutboxRecordRecord,
  PetraProject,
  PetraSourceSpan,
  PetraWork,
  PetraWorkVersion,
  ProjectionIdentity,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { ArtifactAuthorityRepository } from "./artifact-registry.js";
import type { DocumentAuthorityRepository } from "./document-authority-repository.js";
import type { EvidenceAuthorityRepository } from "./evidence-authority-repository.js";
import type {
  AuthorityGraphBatch,
  AuthorityGraphNode,
  AuthorityGraphRelationClass,
  AuthorityGraphRelationship,
  GraphProperty,
} from "./graph-store.js";
import type { ResearchScopeRepository } from "./research-scope-repository.js";
import type { ScholarlyIdentityRepository } from "./scholarly-identity-repository.js";

export interface AuthorityGraphProjectionMaterial {
  project: PetraProject;
  work: PetraWork;
  workVersion: PetraWorkVersion;
  artifacts: readonly PetraArtifact[];
  sourceSpans: readonly PetraSourceSpan[];
  claim: PetraClaim;
  assertion: PetraAssertion;
}

export interface AuthorityGraphProjectionSource {
  load(
    outbox: PetraOutboxRecordRecord,
  ): Promise<AuthorityGraphProjectionMaterial>;
}

export type AuthorityGraphProjectionLoadErrorCode =
  | "GRAPH_SOURCE_OUTBOX_INVALID"
  | "GRAPH_SOURCE_AUTHORITY_MISSING"
  | "GRAPH_SOURCE_AUTHORITY_MISMATCH"
  | "GRAPH_SOURCE_RELATION_INVALID";

export class AuthorityGraphProjectionLoadError extends Error {
  readonly code: AuthorityGraphProjectionLoadErrorCode;

  constructor(code: AuthorityGraphProjectionLoadErrorCode, message: string) {
    super(message);
    this.name = "AuthorityGraphProjectionLoadError";
    this.code = code;
  }
}

export interface AuthorityGraphProjectionRepositories {
  researchScope: ResearchScopeRepository;
  scholarlyIdentity: ScholarlyIdentityRepository;
  artifacts: ArtifactAuthorityRepository;
  documents: DocumentAuthorityRepository;
  evidence: EvidenceAuthorityRepository;
}

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const exact = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const missing = (kind: string, id: string): never => {
  throw new AuthorityGraphProjectionLoadError(
    "GRAPH_SOURCE_AUTHORITY_MISSING",
    `The authoritative ${kind} ${id} required by the graph projection is missing.`,
  );
};

const required = <Value>(
  value: Value | undefined,
  kind: string,
  id: string,
): Value => {
  if (value === undefined) return missing(kind, id);
  return value;
};

const sourceSpanIds = (
  claim: PetraClaim,
  assertion: PetraAssertion,
): string[] => {
  const ids = new Set<string>();
  if (claim.basis.basis_kind === "source") {
    for (const id of claim.basis.source_span_ids) ids.add(id);
  }
  for (const provenance of assertion.provenance_refs) {
    if (provenance.provenance_kind === "source_span") {
      ids.add(provenance.source_span_id);
    }
  }
  return [...ids].sort();
};

/**
 * Resolves an outbox event through storage-neutral authoritative repositories.
 * The embedded Claim and Assertion must exactly equal their persisted revision;
 * supporting identities are then loaded from those records, never model text.
 */
export class RepositoryAuthorityGraphProjectionSource implements AuthorityGraphProjectionSource {
  readonly #repositories: AuthorityGraphProjectionRepositories;

  constructor(repositories: AuthorityGraphProjectionRepositories) {
    this.#repositories = repositories;
  }

  async load(
    outbox: PetraOutboxRecordRecord,
  ): Promise<AuthorityGraphProjectionMaterial> {
    if (
      outbox.target !== "neo4j_graph" ||
      outbox.message.message_kind !== "domain_event" ||
      outbox.partition_key !== outbox.message.event.project_id
    ) {
      throw new AuthorityGraphProjectionLoadError(
        "GRAPH_SOURCE_OUTBOX_INVALID",
        "The authority graph accepts only Project-consistent Neo4j authority-change deliveries.",
      );
    }
    const event = outbox.message.event;
    if (
      event.event.event_type !== "change_set.applied" &&
      event.event.event_type !== "change_set.reverted"
    ) {
      throw new AuthorityGraphProjectionLoadError(
        "GRAPH_SOURCE_OUTBOX_INVALID",
        "The authority graph accepts only applied promotion or reversal domain events.",
      );
    }
    const { claim, assertion } = event.event.payload;
    const authorityStateMatches =
      event.event.event_type === "change_set.applied"
        ? claim.authority.zone === "trusted" &&
          assertion.authority.zone === "trusted"
        : claim.authority.zone === "quarantine" &&
          claim.authority.review_state === "human_rejected" &&
          assertion.authority.zone === "quarantine" &&
          assertion.authority.review_state === "human_rejected";
    if (
      !authorityStateMatches ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== claim.claim_id ||
      assertion.subject_id !==
        (claim.basis.basis_kind === "source"
          ? claim.basis.work_version_id
          : assertion.subject_id)
    ) {
      throw new AuthorityGraphProjectionLoadError(
        "GRAPH_SOURCE_RELATION_INVALID",
        "The authority event does not contain one state-consistent Claim and endpoint-consistent Assertion.",
      );
    }

    const [projectValue, storedClaimValue, storedAssertionValue] =
      await Promise.all([
        this.#repositories.researchScope.getProject(event.project_id),
        this.#repositories.evidence.getClaim(claim.claim_id, claim.revision),
        this.#repositories.evidence.getAssertion(
          assertion.assertion_id,
          assertion.revision,
        ),
      ]);
    const project = required(projectValue, "Project", event.project_id);
    const storedClaim = required(storedClaimValue, "Claim", claim.claim_id);
    const storedAssertion = required(
      storedAssertionValue,
      "Assertion",
      assertion.assertion_id,
    );
    if (!exact(claim, storedClaim) || !exact(assertion, storedAssertion)) {
      throw new AuthorityGraphProjectionLoadError(
        "GRAPH_SOURCE_AUTHORITY_MISMATCH",
        "The outbox Claim or Assertion differs from its exact PostgreSQL-authoritative revision.",
      );
    }

    const workVersion = required(
      await this.#repositories.scholarlyIdentity.getWorkVersion(
        assertion.subject_id,
      ),
      "WorkVersion",
      assertion.subject_id,
    );
    const work = required(
      await this.#repositories.scholarlyIdentity.getWork(workVersion.work_id),
      "Work",
      workVersion.work_id,
    );

    const spans: PetraSourceSpan[] = [];
    for (const id of sourceSpanIds(claim, assertion)) {
      const span = required(
        await this.#repositories.documents.getSourceSpan(id),
        "SourceSpan",
        id,
      );
      spans.push(span);
    }
    const artifactIds = [...new Set(spans.map((span) => span.artifact_id))];
    const artifacts: PetraArtifact[] = [];
    for (const id of artifactIds.sort()) {
      const artifact = required(
        await this.#repositories.artifacts.getArtifact(id),
        "Artifact",
        id,
      );
      artifacts.push(artifact);
    }
    for (const span of spans) {
      const artifact = artifacts.find(
        (candidate) => candidate.artifact_id === span.artifact_id,
      );
      if (
        artifact === undefined ||
        artifact.content_hash !== span.artifact_content_hash
      ) {
        throw new AuthorityGraphProjectionLoadError(
          "GRAPH_SOURCE_AUTHORITY_MISMATCH",
          `SourceSpan ${span.source_span_id} does not resolve to its exact Artifact content identity.`,
        );
      }
    }

    return {
      project,
      work,
      workVersion,
      artifacts,
      sourceSpans: spans,
      claim: storedClaim,
      assertion: storedAssertion,
    };
  }
}

const scalarProperties = (
  properties: Record<string, GraphProperty | undefined>,
): Readonly<Record<string, GraphProperty>> =>
  Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, GraphProperty] => entry[1] !== undefined,
    ),
  );

const node = (
  id: string,
  kind: AuthorityGraphNode["kind"],
  revision: number,
  record: unknown,
  properties: Record<string, GraphProperty | undefined>,
): AuthorityGraphNode => ({
  id,
  kind,
  authoritativeRevision: revision,
  recordHash: hash(record),
  properties: scalarProperties(properties),
});

const structural = (
  edgeId: string,
  predicate: AuthorityGraphRelationship["predicate"],
  relationClass: AuthorityGraphRelationClass,
  sourceId: string,
  targetId: string,
  revision: number,
  sourceRecord: unknown,
  properties: Record<string, GraphProperty | undefined> = {},
): AuthorityGraphRelationship => ({
  edgeId,
  predicate,
  relationClass,
  sourceId,
  targetId,
  authoritativeRevision: revision,
  recordHash: hash({ edgeId, sourceRecord }),
  properties: scalarProperties(properties),
});

const relationClass = (
  predicate: PetraAssertion["predicate"],
): AuthorityGraphRelationClass => {
  if (predicate === "CITES" || predicate === "CITES_AS_BACKGROUND") {
    return "bibliographic";
  }
  if (predicate === "ASSERTS") return "representation";
  return "scientific";
};

const spanSelectorProperties = (
  span: PetraSourceSpan,
): Record<string, GraphProperty | undefined> => {
  const properties: Record<string, GraphProperty | undefined> = {
    selector_type: span.selector.selector_type,
    verification_status: span.verification.status,
    parsed_document_id: span.parsed_document_id,
    structural_block_id: span.structural_block_id,
    parser_run_id: span.parser_run_id,
  };
  const components =
    span.selector.selector_type === "compound"
      ? span.selector.components
      : [
          span.selector.selector_type === "text_quote"
            ? {
                component_kind: "text_quote" as const,
                quote: span.selector.quote,
              }
            : span.selector.selector_type === "page_region"
              ? {
                  component_kind: "page_region" as const,
                  page_region: span.selector.page_region,
                }
              : span.selector.selector_type === "section_path"
                ? {
                    component_kind: "section_path" as const,
                    section_path: span.selector.section_path,
                  }
                : span.selector.selector_type === "json_pointer"
                  ? {
                      component_kind: "json_pointer" as const,
                      json_pointer: span.selector.json_pointer,
                    }
                  : {
                      component_kind: "line_range" as const,
                      line_range: span.selector.line_range,
                    },
        ];
  for (const component of components) {
    switch (component.component_kind) {
      case "text_quote":
        properties.selected_text_hash = component.quote.selected_text_hash;
        properties.start_codepoint = component.quote.start_codepoint;
        properties.end_codepoint = component.quote.end_codepoint;
        break;
      case "page_region":
        properties.page_number = component.page_region.page_number;
        break;
      case "section_path":
        properties.section_path = component.section_path.segments;
        break;
      case "json_pointer":
        properties.json_pointer = component.json_pointer.pointer;
        break;
      case "line_range":
        properties.start_line = component.line_range.start_line;
        properties.end_line = component.line_range.end_line;
        break;
    }
  }
  return properties;
};

export const buildAuthorityGraphBatch = (
  projection: ProjectionIdentity,
  outbox: PetraOutboxRecordRecord,
  material: AuthorityGraphProjectionMaterial,
): AuthorityGraphBatch => {
  const event = outbox.message.event;
  if (
    outbox.target !== "neo4j_graph" ||
    (event.event.event_type !== "change_set.applied" &&
      event.event.event_type !== "change_set.reverted") ||
    event.project_id !== material.project.project_id ||
    event.event.payload.claim.claim_id !== material.claim.claim_id ||
    event.event.payload.assertion.assertion_id !==
      material.assertion.assertion_id ||
    !exact(event.event.payload.claim, material.claim) ||
    !exact(event.event.payload.assertion, material.assertion)
  ) {
    throw new AuthorityGraphProjectionLoadError(
      "GRAPH_SOURCE_AUTHORITY_MISMATCH",
      "Projection material does not match the exact authority-change outbox event.",
    );
  }
  if (
    material.assertion.object.object_kind !== "entity" ||
    material.assertion.object.entity_id !== material.claim.claim_id ||
    material.assertion.subject_id !== material.workVersion.work_version_id ||
    material.workVersion.work_id !== material.work.work_id
  ) {
    throw new AuthorityGraphProjectionLoadError(
      "GRAPH_SOURCE_RELATION_INVALID",
      "Projection material contains inconsistent Work, WorkVersion, Claim, or Assertion endpoints.",
    );
  }

  const common = {
    source_event_id: event.event_id,
    event_position: event.event_position,
    stream_revision: event.stream_revision,
    outbox_id: outbox.outbox_id,
    target_sequence: outbox.target_sequence,
  } satisfies Record<string, GraphProperty>;
  const nodes: AuthorityGraphNode[] = [
    node(
      material.project.project_id,
      "Project",
      material.project.revision,
      material.project,
      {
        name: material.project.name,
        status: material.project.status,
        visibility: material.project.visibility,
        ...common,
      },
    ),
    node(material.work.work_id, "Work", material.work.revision, material.work, {
      title: material.work.title,
      work_kind: material.work.work_kind,
      identity_status: material.work.identity_status,
      ...common,
    }),
    node(
      material.workVersion.work_version_id,
      "WorkVersion",
      material.workVersion.revision,
      material.workVersion,
      {
        version_label: material.workVersion.version_label,
        publication_status: material.workVersion.publication_status,
        published_date_precision:
          material.workVersion.published_date?.precision,
        published_date_value: material.workVersion.published_date?.value,
        metadata_source_kind: material.workVersion.metadata_source.source_kind,
        metadata_source_name: material.workVersion.metadata_source.source_name,
        metadata_source_record_id:
          material.workVersion.metadata_source.source_record_id,
        metadata_retrieved_at: material.workVersion.metadata_retrieved_at,
        ...common,
      },
    ),
    node(
      material.claim.claim_id,
      "Claim",
      material.claim.revision,
      material.claim,
      {
        canonical_text: material.claim.canonical_text,
        claim_kind: material.claim.claim_kind,
        normalization_status: material.claim.normalization_status,
        authority_zone: material.claim.authority.zone,
        review_state: material.claim.authority.review_state,
        scope_json: canonicalize(material.claim.scope),
        source_scope:
          material.claim.basis.basis_kind === "source"
            ? material.claim.basis.source_scope
            : undefined,
        detail_level:
          material.claim.basis.basis_kind === "source"
            ? material.claim.basis.detail_level
            : undefined,
        ...common,
      },
    ),
    ...material.artifacts.map((artifact) =>
      node(artifact.artifact_id, "Artifact", artifact.revision, artifact, {
        artifact_kind: artifact.artifact_kind,
        media_type: artifact.media_type,
        content_hash: artifact.content_hash,
        byte_size: artifact.byte_size,
        ...common,
      }),
    ),
    ...material.sourceSpans.map((span) =>
      node(span.source_span_id, "SourceSpan", span.revision, span, {
        artifact_id: span.artifact_id,
        artifact_content_hash: span.artifact_content_hash,
        ...spanSelectorProperties(span),
        ...common,
      }),
    ),
  ];

  const relationships: AuthorityGraphRelationship[] = [];
  for (const projected of nodes) {
    if (projected.kind === "Project") continue;
    relationships.push(
      structural(
        `project:${material.project.project_id}:projects:${projected.id}`,
        "PROJECTS",
        "projection_scope",
        material.project.project_id,
        projected.id,
        event.stream_revision,
        { project: material.project, projected: projected.recordHash },
        { project_id: material.project.project_id, ...common },
      ),
    );
  }
  relationships.push(
    structural(
      `version:${material.workVersion.work_version_id}:of:${material.work.work_id}`,
      "VERSION_OF",
      "structural",
      material.workVersion.work_version_id,
      material.work.work_id,
      material.workVersion.revision,
      material.workVersion,
      common,
    ),
  );
  for (const artifact of material.artifacts) {
    relationships.push(
      structural(
        `version:${material.workVersion.work_version_id}:represented-by:${artifact.artifact_id}`,
        "REPRESENTED_BY",
        "structural",
        material.workVersion.work_version_id,
        artifact.artifact_id,
        artifact.revision,
        artifact,
        common,
      ),
    );
  }
  for (const span of material.sourceSpans) {
    relationships.push(
      structural(
        `span:${span.source_span_id}:located-in:${span.artifact_id}`,
        "LOCATED_IN",
        "structural",
        span.source_span_id,
        span.artifact_id,
        span.revision,
        span,
        common,
      ),
      structural(
        `claim:${material.claim.claim_id}:grounded-in:${span.source_span_id}`,
        "GROUNDED_IN",
        "provenance",
        material.claim.claim_id,
        span.source_span_id,
        material.claim.revision,
        { claim: material.claim, spanId: span.source_span_id },
        {
          source_assertion_id: material.assertion.assertion_id,
          project_id: material.project.project_id,
          ...common,
        },
      ),
    );
  }
  if (event.event.event_type === "change_set.applied") {
    relationships.push({
      edgeId: material.assertion.assertion_id,
      assertionId: material.assertion.assertion_id,
      predicate: material.assertion.predicate,
      relationClass: relationClass(material.assertion.predicate),
      sourceId: material.assertion.subject_id,
      targetId: material.claim.claim_id,
      authoritativeRevision: material.assertion.revision,
      recordHash: hash(material.assertion),
      properties: scalarProperties({
        project_id: material.project.project_id,
        assertion_kind: material.assertion.assertion_kind,
        authority_zone: material.assertion.authority.zone,
        review_state: material.assertion.authority.review_state,
        rationale: material.assertion.rationale,
        provenance_source_span_ids: material.sourceSpans.map(
          (span) => span.source_span_id,
        ),
        scope_json: canonicalize(material.assertion.scope),
        scope_comparison_json:
          material.assertion.scope_comparison === undefined
            ? undefined
            : canonicalize(material.assertion.scope_comparison),
        ...common,
      }),
    });
  }

  return {
    projectId: material.project.project_id,
    projection,
    sourceEventId: event.event_id,
    outbox: {
      outboxId: outbox.outbox_id,
      outboxPosition: outbox.outbox_position,
      targetSequence: outbox.target_sequence,
      eventId: event.event_id,
      eventPosition: event.event_position,
      streamRevision: event.stream_revision,
    },
    nodes,
    relationships,
    removals:
      event.event.event_type === "change_set.reverted"
        ? [
            {
              edgeId: material.assertion.assertion_id,
              expectedAuthoritativeRevision:
                event.event.payload.prior_assertion_revision,
              tombstoneRevision: material.assertion.revision,
              recordHash: hash(material.assertion),
            },
          ]
        : [],
  };
};
