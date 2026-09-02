import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  PaperTrailBaseline,
  parsePaperTrailSnapshot,
  tokenizePaperTrail,
  type PaperTrailSnapshot,
} from "../src/paper-trail-baseline.js";

const fixtureUrl = new URL(
  "../../../fixtures/paper-trail/openalex_works.json",
  import.meta.url,
);
const fixtureBytes = readFileSync(fixtureUrl);
const fixturePayload: unknown = JSON.parse(fixtureBytes.toString("utf8"));

const smallSnapshot = (): PaperTrailSnapshot => ({
  meta: {
    schema_version: "test",
    source: "hand-authored compatibility fixture",
    source_url: "https://example.test/paper-trail",
    documentation_url: "https://example.test/paper-trail/docs",
    license: "CC0",
    query: "retrieval",
    from_year: 2022,
    fetched_at: "2026-08-25T03:29:48+00:00",
    work_count: 3,
    limitations: ["Test-only corpus."],
  },
  works: [
    {
      id: "W1",
      title: "Graph Retrieval for Evidence",
      abstract: "A graph path connects recorded evidence.",
      year: 2024,
      openalex_url: "https://openalex.org/W1",
      referenced_works: ["W2"],
      cited_by_count: 1,
      quality_flags: [],
    },
    {
      id: "W2",
      title: "Lexical Retrieval Baselines",
      abstract: "BM25 is a sparse ranking baseline.",
      year: 2023,
      openalex_url: "https://openalex.org/W2",
      referenced_works: ["W3"],
      cited_by_count: 1,
      quality_flags: [],
    },
    {
      id: "W3",
      title: "Evaluation of Research Search",
      abstract: "Evaluation uses relevance judgments.",
      year: 2022,
      openalex_url: "https://openalex.org/W3",
      referenced_works: [],
      cited_by_count: 1,
      quality_flags: [],
    },
  ],
});

describe("Paper Trail compatibility baseline", () => {
  it("pins the exact CC0 snapshot and preserves the legacy tokenizer", () => {
    expect(createHash("sha256").update(fixtureBytes).digest("hex")).toBe(
      "3f3086df898fc2769b88209043c5ea374f2bf721ac7a6e46eaf0f155edd0e017",
    );
    const snapshot = parsePaperTrailSnapshot(fixturePayload);
    expect(snapshot.meta).toEqual(
      expect.objectContaining({
        source: "OpenAlex API",
        license: "CC0",
        fetched_at: "2026-08-25T03:29:48+00:00",
        work_count: 50,
      }),
    );
    expect(tokenizePaperTrail("Evidence-first GraphRAG")).toEqual([
      "evidence-first",
      "graphrag",
    ]);
  });

  it("preserves title-weighted BM25 ordering and scores on the frozen corpus", () => {
    const baseline = new PaperTrailBaseline(fixturePayload);
    const hits = baseline.bm25("graph retrieval augmented generation", 8);
    expect(hits.map((hit) => hit.workId)).toEqual([
      "W7134170217",
      "W4402670248",
      "W4403447129",
      "W4411119292",
      "W4410600121",
      "W4401453137",
      "W4416354085",
      "W4394619840",
    ]);
    expect(hits.map((hit) => Number(hit.score.toFixed(4)))).toEqual([
      3.8186, 3.3998, 3.3685, 3.1098, 3.1032, 3.0462, 2.9714, 2.9415,
    ]);
    expect(hits[0]?.matchedTerms).toEqual([
      "graph",
      "retrieval",
      "augmented",
      "generation",
    ]);

    const small = new PaperTrailBaseline(smallSnapshot());
    expect(small.bm25("lexical retrieval")[0]).toEqual(
      expect.objectContaining({
        workId: "W2",
        matchedTerms: ["lexical", "retrieval"],
      }),
    );
  });

  it("preserves explicit year filtering", () => {
    const baseline = new PaperTrailBaseline(smallSnapshot());
    expect(
      baseline.bm25("retrieval", 10, 2024).map((hit) => hit.workId),
    ).toEqual(["W1"]);
  });

  it("preserves directed reference and cited-by neighborhoods", () => {
    const baseline = new PaperTrailBaseline(smallSnapshot());
    expect(baseline.neighbors("W1", "references")).toEqual(["W2"]);
    expect(baseline.neighbors("W2", "cited-by")).toEqual(["W1"]);
  });

  it("preserves bounded path behavior", () => {
    const baseline = new PaperTrailBaseline(fixturePayload);
    expect(
      baseline.shortestPath("W4416379250", "W3027879771", "references", 2),
    ).toEqual(["W4416379250", "W4404351611", "W3027879771"]);
    expect(
      baseline.shortestPath("W4416379250", "W3027879771", "references", 1),
    ).toBe(undefined);
  });

  it("preserves source-native CITES direction regardless of traversal order", () => {
    const baseline = new PaperTrailBaseline(smallSnapshot());
    expect(baseline.edgeView("W2", "W1")).toEqual({
      source: "W1",
      relation: "CITES",
      target: "W2",
      pathStep: "W2←W1",
      qualityFlags: [],
    });
  });

  it("rejects unknown works explicitly", () => {
    const baseline = new PaperTrailBaseline(fixturePayload);
    expect(() => baseline.neighbors("W99", "references")).toThrowError(
      expect.objectContaining({ code: "PAPER_TRAIL_WORK_UNKNOWN" }),
    );
  });

  it("retains chronology warnings without converting citation into support", () => {
    const baseline = new PaperTrailBaseline(fixturePayload);
    const edge = baseline.edgeView("W4403447129", "W3027879771");
    expect(edge).toEqual({
      source: "W4403447129",
      relation: "CITES",
      target: "W3027879771",
      pathStep: "W4403447129→W3027879771",
      qualityFlags: ["citing_work_predates_referenced_work"],
    });
    expect(baseline.workView("W4403447129").qualityFlags).toContain(
      "references_later_dated_work",
    );
    expect(Object.values(edge)).not.toContain("SUPPORTS");
  });

  it("fails closed on a count mismatch or duplicate Work identity", () => {
    const wrongCount = smallSnapshot();
    wrongCount.meta.work_count = 4;
    expect(() => new PaperTrailBaseline(wrongCount)).toThrowError(
      expect.objectContaining({ code: "PAPER_TRAIL_SNAPSHOT_INVALID" }),
    );

    const duplicate = smallSnapshot();
    const first = duplicate.works[0];
    if (first === undefined) throw new Error("Expected small fixture Work.");
    duplicate.works.push(structuredClone(first));
    duplicate.meta.work_count = 4;
    expect(() => new PaperTrailBaseline(duplicate)).toThrowError(
      expect.objectContaining({ code: "PAPER_TRAIL_WORK_DUPLICATE" }),
    );
  });
});
