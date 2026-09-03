import type {
  AuthorityGraphNeighbor,
  AuthorityGraphNodeKind,
  AuthorityGraphObjectView,
  AuthorityGraphPredicate,
  AuthorityGraphProvenancePath,
  AuthorityGraphStore,
} from "@petra/core";

import { tokenizePaperTrail } from "./paper-trail-baseline.js";

export const SCIENTIFIC_LEXICAL_SCORER =
  "bm25-k1.5-b0.75-title2.5-body1.0" as const;
export const HYBRID_RETRIEVAL_RECIPE = {
  name: "petra-bounded-lexical-graph",
  version: "1.0.0",
} as const;

const MAX_QUERY_CHARACTERS = 2_000;
const MAX_LEXICAL_RESULTS = 25;
const MAX_NEIGHBORS = 50;
const TITLE_WEIGHT = 2.5;
const BODY_WEIGHT = 1;
const K1 = 1.5;
const B = 0.75;

export type ScientificRetrievalErrorCode =
  | "RETRIEVAL_RECORD_INVALID"
  | "RETRIEVAL_RECORD_DUPLICATE"
  | "RETRIEVAL_QUERY_INVALID"
  | "RETRIEVAL_LIMIT_INVALID";

export class ScientificRetrievalError extends Error {
  readonly code: ScientificRetrievalErrorCode;

  constructor(code: ScientificRetrievalErrorCode, message: string) {
    super(message);
    this.name = "ScientificRetrievalError";
    this.code = code;
  }
}

export interface ScientificLexicalRecord {
  projectId: string;
  objectId: string;
  objectKind: AuthorityGraphNodeKind;
  authoritativeRevision: number;
  recordHash: string;
  fields: {
    title: string;
    body: string;
  };
}

export interface ScientificRetrievalScope {
  projectId: string;
  objectKinds?: readonly AuthorityGraphNodeKind[];
}

export interface ScientificLexicalSearchRequest {
  query: string;
  scope: ScientificRetrievalScope;
  limit?: number;
}

export interface ScientificLexicalHit {
  rank: number;
  objectId: string;
  objectKind: AuthorityGraphNodeKind;
  authoritativeRevision: number;
  recordHash: string;
  score: number;
  matchedTerms: readonly string[];
}

export interface ScientificLexicalSearchResult {
  query: string;
  scorer: typeof SCIENTIFIC_LEXICAL_SCORER;
  scope: {
    projectId: string;
    objectKinds: readonly AuthorityGraphNodeKind[];
    scopedCorpusSize: number;
  };
  limit: number;
  hits: readonly ScientificLexicalHit[];
}

export interface ScientificLexicalIndex {
  search(
    request: ScientificLexicalSearchRequest,
  ): Promise<ScientificLexicalSearchResult>;
}

interface IndexedRecord {
  record: ScientificLexicalRecord;
  termCounts: ReadonlyMap<string, number>;
  length: number;
}

const invalidRecord = (message: string): never => {
  throw new ScientificRetrievalError("RETRIEVAL_RECORD_INVALID", message);
};

const requireNonEmpty = (value: string, field: string): void => {
  if (value.trim().length === 0) invalidRecord(`${field} must not be empty.`);
};

const boundedLimit = (
  value: number | undefined,
  fallback: number,
  maximum: number,
): number => {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
    throw new ScientificRetrievalError(
      "RETRIEVAL_LIMIT_INVALID",
      `Retrieval limit must be an integer from 1 to ${maximum}.`,
    );
  }
  return limit;
};

const validateQuery = (query: string): string => {
  const normalized = query.trim();
  if (normalized.length === 0 || normalized.length > MAX_QUERY_CHARACTERS) {
    throw new ScientificRetrievalError(
      "RETRIEVAL_QUERY_INVALID",
      `Retrieval query must contain 1 to ${MAX_QUERY_CHARACTERS} characters.`,
    );
  }
  return normalized;
};

const normalizeKinds = (
  kinds: readonly AuthorityGraphNodeKind[] | undefined,
  available: readonly AuthorityGraphNodeKind[],
): AuthorityGraphNodeKind[] => {
  const selected = kinds === undefined ? [...available] : [...kinds];
  return [...new Set(selected)].sort();
};

const addTerm = (counts: Map<string, number>, term: string, weight: number) => {
  counts.set(term, (counts.get(term) ?? 0) + weight);
};

const indexRecord = (input: ScientificLexicalRecord): IndexedRecord => {
  requireNonEmpty(input.projectId, "projectId");
  requireNonEmpty(input.objectId, "objectId");
  requireNonEmpty(input.recordHash, "recordHash");
  if (
    !Number.isSafeInteger(input.authoritativeRevision) ||
    input.authoritativeRevision < 1
  ) {
    invalidRecord("authoritativeRevision must be a positive safe integer.");
  }
  if (
    input.fields.title.trim().length === 0 &&
    input.fields.body.trim().length === 0
  ) {
    invalidRecord("At least one searchable field must not be empty.");
  }

  const termCounts = new Map<string, number>();
  for (const term of tokenizePaperTrail(input.fields.title)) {
    addTerm(termCounts, term, TITLE_WEIGHT);
  }
  for (const term of tokenizePaperTrail(input.fields.body)) {
    addTerm(termCounts, term, BODY_WEIGHT);
  }
  return {
    record: structuredClone(input),
    termCounts,
    length: [...termCounts.values()].reduce((total, count) => total + count, 0),
  };
};

/**
 * Deterministic development index. It establishes Petra's lexical port and
 * scoring semantics without choosing the eventual PostgreSQL search adapter.
 */
export class InMemoryScientificLexicalIndex implements ScientificLexicalIndex {
  readonly #records: readonly IndexedRecord[];

  constructor(records: readonly ScientificLexicalRecord[]) {
    const identities = new Set<string>();
    this.#records = records.map((record) => {
      const identity = `${record.projectId}\u0000${record.objectId}`;
      if (identities.has(identity)) {
        throw new ScientificRetrievalError(
          "RETRIEVAL_RECORD_DUPLICATE",
          `Lexical identity occurs more than once: ${record.projectId}/${record.objectId}.`,
        );
      }
      identities.add(identity);
      return indexRecord(record);
    });
  }

  search(
    request: ScientificLexicalSearchRequest,
  ): Promise<ScientificLexicalSearchResult> {
    try {
      return Promise.resolve(this.#search(request));
    } catch (error: unknown) {
      return Promise.reject(
        error instanceof Error
          ? error
          : new Error("Scientific lexical retrieval failed.", { cause: error }),
      );
    }
  }

  #search(
    request: ScientificLexicalSearchRequest,
  ): ScientificLexicalSearchResult {
    const query = validateQuery(request.query);
    requireNonEmpty(request.scope.projectId, "scope.projectId");
    const limit = boundedLimit(request.limit, 10, MAX_LEXICAL_RESULTS);
    const availableKinds = this.#records
      .filter(({ record }) => record.projectId === request.scope.projectId)
      .map(({ record }) => record.objectKind);
    const objectKinds = normalizeKinds(
      request.scope.objectKinds,
      availableKinds,
    );
    const allowedKinds = new Set(objectKinds);
    const corpus = this.#records.filter(
      ({ record }) =>
        record.projectId === request.scope.projectId &&
        allowedKinds.has(record.objectKind),
    );
    const queryTerms = [...new Set(tokenizePaperTrail(query))];
    const documentFrequency = new Map<string, number>();
    for (const { termCounts } of corpus) {
      for (const term of termCounts.keys()) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }
    const averageLength =
      corpus.length === 0
        ? 0
        : corpus.reduce((total, record) => total + record.length, 0) /
          corpus.length;
    const scored: Omit<ScientificLexicalHit, "rank">[] = [];
    for (const indexed of corpus) {
      let score = 0;
      const matchedTerms: string[] = [];
      for (const term of queryTerms) {
        const frequency = indexed.termCounts.get(term) ?? 0;
        if (frequency === 0) continue;
        matchedTerms.push(term);
        const frequencyAcrossCorpus = documentFrequency.get(term) ?? 0;
        const inverseDocumentFrequency = Math.log(
          1 +
            (corpus.length - frequencyAcrossCorpus + 0.5) /
              (frequencyAcrossCorpus + 0.5),
        );
        const normalizer =
          frequency +
          K1 * (1 - B + (B * indexed.length) / Math.max(averageLength, 1));
        score += (inverseDocumentFrequency * frequency * (K1 + 1)) / normalizer;
      }
      if (score > 0) {
        scored.push({
          objectId: indexed.record.objectId,
          objectKind: indexed.record.objectKind,
          authoritativeRevision: indexed.record.authoritativeRevision,
          recordHash: indexed.record.recordHash,
          score,
          matchedTerms,
        });
      }
    }
    scored.sort(
      (left, right) =>
        right.score - left.score || left.objectId.localeCompare(right.objectId),
    );
    return {
      query,
      scorer: SCIENTIFIC_LEXICAL_SCORER,
      scope: {
        projectId: request.scope.projectId,
        objectKinds,
        scopedCorpusSize: corpus.length,
      },
      limit,
      hits: scored.slice(0, limit).map((hit, index) => ({
        rank: index + 1,
        ...structuredClone(hit),
      })),
    };
  }
}

export interface FocusedNeighborhoodRequest {
  projectId: string;
  objectId: string;
  direction?: "outgoing" | "incoming" | "either";
  predicates?: readonly AuthorityGraphPredicate[];
  limit?: number;
}

export interface FocusedEvidenceNeighborhood {
  center: AuthorityGraphObjectView;
  direction: "outgoing" | "incoming" | "either";
  predicates: readonly AuthorityGraphPredicate[];
  limit: number;
  neighbors: readonly AuthorityGraphNeighbor[];
}

export type HybridCandidateOmissionReason =
  | "graph_object_missing"
  | "graph_identity_mismatch"
  | "lexical_projection_stale";

export interface HybridCandidateOmission {
  lexicalHit: ScientificLexicalHit;
  reason: HybridCandidateOmissionReason;
}

export interface HybridEvidenceCandidate {
  lexicalHit: ScientificLexicalHit;
  object: AuthorityGraphObjectView;
  neighbors: readonly AuthorityGraphNeighbor[];
}

export interface HybridRetrievalRequest extends ScientificLexicalSearchRequest {
  graph: {
    direction?: "outgoing" | "incoming" | "either";
    predicates?: readonly AuthorityGraphPredicate[];
    neighborsPerCandidate?: number;
  };
}

export interface HybridRetrievalResult {
  recipe: typeof HYBRID_RETRIEVAL_RECIPE;
  lexical: ScientificLexicalSearchResult;
  graphScope: {
    direction: "outgoing" | "incoming" | "either";
    predicates: readonly AuthorityGraphPredicate[];
    neighborsPerCandidate: number;
  };
  candidates: readonly HybridEvidenceCandidate[];
  omissions: readonly HybridCandidateOmission[];
}

export class GraphGuidedRetrievalService {
  readonly #graph: AuthorityGraphStore;
  readonly #lexical: ScientificLexicalIndex;

  constructor(graph: AuthorityGraphStore, lexical: ScientificLexicalIndex) {
    this.#graph = graph;
    this.#lexical = lexical;
  }

  async getCanonicalObject(
    projectId: string,
    objectId: string,
  ): Promise<AuthorityGraphObjectView | undefined> {
    requireNonEmpty(projectId, "projectId");
    requireNonEmpty(objectId, "objectId");
    return this.#graph.getObject(projectId, objectId);
  }

  async getFocusedNeighborhood(
    request: FocusedNeighborhoodRequest,
  ): Promise<FocusedEvidenceNeighborhood | undefined> {
    const center = await this.getCanonicalObject(
      request.projectId,
      request.objectId,
    );
    if (center === undefined) return undefined;
    const direction = request.direction ?? "either";
    const predicates = [...(request.predicates ?? [])];
    const limit = boundedLimit(request.limit, 20, MAX_NEIGHBORS);
    const neighbors = await this.#graph.getNeighborhood(
      request.projectId,
      request.objectId,
      { direction, predicates, limit },
    );
    return { center, direction, predicates, limit, neighbors };
  }

  async getExactProvenancePath(
    projectId: string,
    assertionId: string,
  ): Promise<AuthorityGraphProvenancePath | undefined> {
    requireNonEmpty(projectId, "projectId");
    requireNonEmpty(assertionId, "assertionId");
    return this.#graph.getProvenancePath(projectId, assertionId);
  }

  async retrieveHybrid(
    request: HybridRetrievalRequest,
  ): Promise<HybridRetrievalResult> {
    const lexical = await this.#lexical.search(request);
    const direction = request.graph.direction ?? "either";
    const predicates = [...(request.graph.predicates ?? [])];
    const neighborsPerCandidate = boundedLimit(
      request.graph.neighborsPerCandidate,
      8,
      MAX_NEIGHBORS,
    );

    const resolved = await Promise.all(
      lexical.hits.map(async (lexicalHit) => {
        const object = await this.#graph.getObject(
          request.scope.projectId,
          lexicalHit.objectId,
        );
        if (object === undefined) {
          return {
            omission: { lexicalHit, reason: "graph_object_missing" as const },
          };
        }
        if (
          object.elementKind !== "node" ||
          object.kind !== lexicalHit.objectKind
        ) {
          return {
            omission: {
              lexicalHit,
              reason: "graph_identity_mismatch" as const,
            },
          };
        }
        if (
          object.authoritativeRevision !== lexicalHit.authoritativeRevision ||
          object.recordHash !== lexicalHit.recordHash
        ) {
          return {
            omission: {
              lexicalHit,
              reason: "lexical_projection_stale" as const,
            },
          };
        }
        const neighbors = await this.#graph.getNeighborhood(
          request.scope.projectId,
          lexicalHit.objectId,
          { direction, predicates, limit: neighborsPerCandidate },
        );
        return { candidate: { lexicalHit, object, neighbors } };
      }),
    );

    const candidates: HybridEvidenceCandidate[] = [];
    const omissions: HybridCandidateOmission[] = [];
    for (const item of resolved) {
      if ("candidate" in item) candidates.push(item.candidate);
      else omissions.push(item.omission);
    }
    return {
      recipe: HYBRID_RETRIEVAL_RECIPE,
      lexical,
      graphScope: { direction, predicates, neighborsPerCandidate },
      candidates,
      omissions,
    };
  }
}
