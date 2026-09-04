export type CitationDirection = "references" | "cited-by";
export type PathDirection = CitationDirection | "either";
export type PaperTrailQualityFlag =
  "references_later_dated_work" | "cited_by_earlier_dated_work";

export interface PaperTrailSnapshotMeta {
  schema_version: string;
  source: string;
  source_url: string;
  documentation_url: string;
  license: string;
  query: string;
  from_year: number;
  fetched_at: string;
  work_count: number;
  limitations: string[];
}

export interface PaperTrailWork {
  id: string;
  openalex_url: string;
  title: string;
  year: number;
  abstract: string;
  cited_by_count: number;
  referenced_works: string[];
  quality_flags: PaperTrailQualityFlag[];
}

export interface PaperTrailSnapshot {
  meta: PaperTrailSnapshotMeta;
  works: PaperTrailWork[];
}

export interface PaperTrailHit {
  workId: string;
  score: number;
  matchedTerms: readonly string[];
}

export interface PaperTrailWorkView {
  id: string;
  title: string;
  year: number;
  url: string;
  citedByCount: number;
  qualityFlags: readonly PaperTrailQualityFlag[];
}

export interface PaperTrailCitationEdge {
  source: string;
  relation: "CITES";
  target: string;
  pathStep: string;
  qualityFlags: readonly "citing_work_predates_referenced_work"[];
}

export type PaperTrailBaselineErrorCode =
  | "PAPER_TRAIL_SNAPSHOT_INVALID"
  | "PAPER_TRAIL_CORPUS_EMPTY"
  | "PAPER_TRAIL_WORK_DUPLICATE"
  | "PAPER_TRAIL_WORK_UNKNOWN"
  | "PAPER_TRAIL_DIRECTION_INVALID"
  | "PAPER_TRAIL_LIMIT_INVALID"
  | "PAPER_TRAIL_DEPTH_INVALID"
  | "PAPER_TRAIL_NOT_ADJACENT";

export class PaperTrailBaselineError extends Error {
  readonly code: PaperTrailBaselineErrorCode;

  constructor(code: PaperTrailBaselineErrorCode, message: string) {
    super(message);
    this.name = "PaperTrailBaselineError";
    this.code = code;
  }
}

const TOKEN = /[a-z0-9]+(?:[-'][a-z0-9]+)?/g;
const QUALITY_FLAGS = new Set<PaperTrailQualityFlag>([
  "references_later_dated_work",
  "cited_by_earlier_dated_work",
]);

export const tokenizePaperTrail = (text: string): string[] =>
  text.toLowerCase().match(TOKEN) ?? [];

const invalidSnapshot = (message: string): never => {
  throw new PaperTrailBaselineError("PAPER_TRAIL_SNAPSHOT_INVALID", message);
};

const record = (value: unknown, name: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalidSnapshot(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const stringValue = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    invalidSnapshot(`${name} must be a non-empty string.`);
  }
  return value as string;
};

const integerValue = (value: unknown, name: string): number => {
  if (!Number.isSafeInteger(value)) {
    invalidSnapshot(`${name} must be a safe integer.`);
  }
  return value as number;
};

const stringArray = (value: unknown, name: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    invalidSnapshot(`${name} must be an array of strings.`);
  }
  return [...(value as string[])];
};

const parseMeta = (value: unknown): PaperTrailSnapshotMeta => {
  const meta = record(value, "meta");
  return {
    schema_version: stringValue(meta.schema_version, "meta.schema_version"),
    source: stringValue(meta.source, "meta.source"),
    source_url: stringValue(meta.source_url, "meta.source_url"),
    documentation_url: stringValue(
      meta.documentation_url,
      "meta.documentation_url",
    ),
    license: stringValue(meta.license, "meta.license"),
    query: stringValue(meta.query, "meta.query"),
    from_year: integerValue(meta.from_year, "meta.from_year"),
    fetched_at: stringValue(meta.fetched_at, "meta.fetched_at"),
    work_count: integerValue(meta.work_count, "meta.work_count"),
    limitations: stringArray(meta.limitations, "meta.limitations"),
  };
};

const parseWork = (value: unknown, index: number): PaperTrailWork => {
  const work = record(value, `works[${index}]`);
  const qualityFlags = stringArray(
    work.quality_flags,
    `works[${index}].quality_flags`,
  );
  if (
    !qualityFlags.every((flag) =>
      QUALITY_FLAGS.has(flag as PaperTrailQualityFlag),
    )
  ) {
    invalidSnapshot(`works[${index}].quality_flags contains an unknown flag.`);
  }
  return {
    id: stringValue(work.id, `works[${index}].id`),
    openalex_url: stringValue(
      work.openalex_url,
      `works[${index}].openalex_url`,
    ),
    title: stringValue(work.title, `works[${index}].title`),
    year: integerValue(work.year, `works[${index}].year`),
    abstract: stringValue(work.abstract, `works[${index}].abstract`),
    cited_by_count: integerValue(
      work.cited_by_count,
      `works[${index}].cited_by_count`,
    ),
    referenced_works: stringArray(
      work.referenced_works,
      `works[${index}].referenced_works`,
    ),
    quality_flags: qualityFlags as PaperTrailQualityFlag[],
  };
};

export const parsePaperTrailSnapshot = (
  payload: unknown,
): PaperTrailSnapshot => {
  const root = record(payload, "snapshot");
  const rawWorksValue = root.works;
  if (!Array.isArray(rawWorksValue)) {
    invalidSnapshot("snapshot.works must be an array.");
  }
  const rawWorks = rawWorksValue as unknown[];
  const meta = parseMeta(root.meta);
  const works = rawWorks.map(parseWork);
  if (works.length === 0) {
    throw new PaperTrailBaselineError(
      "PAPER_TRAIL_CORPUS_EMPTY",
      "The Paper Trail corpus contains no works.",
    );
  }
  if (meta.work_count !== works.length) {
    invalidSnapshot(
      `meta.work_count declares ${meta.work_count}, but the snapshot contains ${works.length} works.`,
    );
  }
  return { meta, works };
};

const increment = (counts: Map<string, number>, term: string, by = 1): void => {
  counts.set(term, (counts.get(term) ?? 0) + by);
};

const boundedLimit = (limit: number): number => {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new PaperTrailBaselineError(
      "PAPER_TRAIL_LIMIT_INVALID",
      "Paper Trail limits must be integers from 1 to 100.",
    );
  }
  return limit;
};

export class PaperTrailBaseline {
  readonly meta: PaperTrailSnapshotMeta;
  readonly #works = new Map<string, PaperTrailWork>();
  readonly #termCounts = new Map<string, Map<string, number>>();
  readonly #lengths = new Map<string, number>();
  readonly #documentFrequency = new Map<string, number>();
  readonly #references = new Map<string, Set<string>>();
  readonly #citedBy = new Map<string, Set<string>>();
  readonly #averageLength: number;

  constructor(payload: unknown) {
    const snapshot = parsePaperTrailSnapshot(payload);
    this.meta = structuredClone(snapshot.meta);
    for (const work of snapshot.works) {
      if (this.#works.has(work.id)) {
        throw new PaperTrailBaselineError(
          "PAPER_TRAIL_WORK_DUPLICATE",
          `Work ${work.id} occurs more than once in the snapshot.`,
        );
      }
      this.#works.set(work.id, structuredClone(work));
    }

    let totalLength = 0;
    for (const [workId, work] of this.#works) {
      const weighted = new Map<string, number>();
      for (const term of tokenizePaperTrail(work.abstract)) {
        increment(weighted, term);
      }
      for (const term of tokenizePaperTrail(work.title)) {
        increment(weighted, term, 2.5);
      }
      this.#termCounts.set(workId, weighted);
      const length = [...weighted.values()].reduce(
        (total, count) => total + count,
        0,
      );
      this.#lengths.set(workId, length);
      totalLength += length;
      for (const term of weighted.keys()) {
        increment(this.#documentFrequency, term);
      }
    }
    this.#averageLength = totalLength / this.#works.size;

    for (const [workId, work] of this.#works) {
      const known = new Set(
        work.referenced_works.filter((reference) => this.#works.has(reference)),
      );
      this.#references.set(workId, known);
      if (!this.#citedBy.has(workId)) this.#citedBy.set(workId, new Set());
      for (const referencedId of known) {
        const citing = this.#citedBy.get(referencedId) ?? new Set<string>();
        citing.add(workId);
        this.#citedBy.set(referencedId, citing);
      }
    }
  }

  get size(): number {
    return this.#works.size;
  }

  bm25(query: string, limit = 10, fromYear?: number): PaperTrailHit[] {
    const queryTerms = [...new Set(tokenizePaperTrail(query))];
    const hits: PaperTrailHit[] = [];
    const total = this.#works.size;
    const k1 = 1.5;
    const b = 0.75;
    for (const [workId, counts] of this.#termCounts) {
      const work = this.#requireWork(workId);
      if (fromYear && work.year < fromYear) continue;
      let score = 0;
      const matchedTerms: string[] = [];
      for (const term of queryTerms) {
        const frequency = counts.get(term) ?? 0;
        if (frequency === 0) continue;
        matchedTerms.push(term);
        const documentFrequency = this.#documentFrequency.get(term) ?? 0;
        const inverseDocumentFrequency = Math.log(
          1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5),
        );
        const length = this.#lengths.get(workId) ?? 0;
        const normalizer =
          frequency + k1 * (1 - b + (b * length) / this.#averageLength);
        score += (inverseDocumentFrequency * frequency * (k1 + 1)) / normalizer;
      }
      if (score > 0) hits.push({ workId, score, matchedTerms });
    }
    hits.sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      const leftWork = this.#requireWork(left.workId);
      const rightWork = this.#requireWork(right.workId);
      if (leftWork.year !== rightWork.year)
        return rightWork.year - leftWork.year;
      return leftWork.title < rightWork.title
        ? -1
        : leftWork.title > rightWork.title
          ? 1
          : 0;
    });
    return hits
      .slice(0, boundedLimit(limit))
      .map((hit) => structuredClone(hit));
  }

  neighbors(
    workId: string,
    direction: CitationDirection,
    limit = 50,
  ): string[] {
    this.#requireWork(workId);
    if (!(["references", "cited-by"] as const).includes(direction)) {
      throw new PaperTrailBaselineError(
        "PAPER_TRAIL_DIRECTION_INVALID",
        `Unknown citation direction: ${String(direction)}.`,
      );
    }
    const adjacent =
      direction === "references"
        ? this.#references.get(workId)
        : this.#citedBy.get(workId);
    return [...(adjacent ?? [])]
      .sort((left, right) => {
        const leftTitle = this.#requireWork(left).title;
        const rightTitle = this.#requireWork(right).title;
        return leftTitle < rightTitle ? -1 : leftTitle > rightTitle ? 1 : 0;
      })
      .slice(0, boundedLimit(limit));
  }

  shortestPath(
    start: string,
    end: string,
    direction: PathDirection = "either",
    maxDepth = 3,
  ): string[] | undefined {
    this.#requireWork(start);
    this.#requireWork(end);
    if (!(["references", "cited-by", "either"] as const).includes(direction)) {
      throw new PaperTrailBaselineError(
        "PAPER_TRAIL_DIRECTION_INVALID",
        `Unknown path direction: ${String(direction)}.`,
      );
    }
    if (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 6) {
      throw new PaperTrailBaselineError(
        "PAPER_TRAIL_DEPTH_INVALID",
        "Paper Trail path depth must be an integer from 1 to 6.",
      );
    }
    const queue: { node: string; path: string[] }[] = [
      { node: start, path: [start] },
    ];
    const visited = new Set([start]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) break;
      if (current.path.length - 1 >= maxDepth) continue;
      const adjacent = new Set<string>();
      if (direction === "references" || direction === "either") {
        for (const workId of this.#references.get(current.node) ?? []) {
          adjacent.add(workId);
        }
      }
      if (direction === "cited-by" || direction === "either") {
        for (const workId of this.#citedBy.get(current.node) ?? []) {
          adjacent.add(workId);
        }
      }
      for (const next of [...adjacent].sort()) {
        if (next === end) return [...current.path, next];
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ node: next, path: [...current.path, next] });
        }
      }
    }
    return undefined;
  }

  workView(workId: string): PaperTrailWorkView {
    const work = this.#requireWork(workId);
    return {
      id: work.id,
      title: work.title,
      year: work.year,
      url: work.openalex_url,
      citedByCount: work.cited_by_count,
      qualityFlags: [...work.quality_flags],
    };
  }

  edgeView(left: string, right: string): PaperTrailCitationEdge {
    this.#requireWork(left);
    this.#requireWork(right);
    let source: string;
    let target: string;
    let pathStep: string;
    if (this.#references.get(left)?.has(right)) {
      source = left;
      target = right;
      pathStep = `${left}→${right}`;
    } else if (this.#references.get(right)?.has(left)) {
      source = right;
      target = left;
      pathStep = `${left}←${right}`;
    } else {
      throw new PaperTrailBaselineError(
        "PAPER_TRAIL_NOT_ADJACENT",
        `Works are not adjacent in this snapshot: ${left}, ${right}.`,
      );
    }
    const sourceWork = this.#requireWork(source);
    const targetWork = this.#requireWork(target);
    return {
      source,
      relation: "CITES",
      target,
      pathStep,
      qualityFlags:
        sourceWork.year < targetWork.year
          ? ["citing_work_predates_referenced_work"]
          : [],
    };
  }

  #requireWork(workId: string): PaperTrailWork {
    const work = this.#works.get(workId);
    if (work === undefined) {
      throw new PaperTrailBaselineError(
        "PAPER_TRAIL_WORK_UNKNOWN",
        `Unknown work ID in this snapshot: ${workId}.`,
      );
    }
    return work;
  }
}
