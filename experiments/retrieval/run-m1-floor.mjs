import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  GraphGuidedRetrievalService,
  HYBRID_RETRIEVAL_RECIPE,
  InMemoryScientificLexicalIndex,
  PaperTrailBaseline,
  SCIENTIFIC_LEXICAL_SCORER,
  parsePaperTrailSnapshot,
} from "@petra/retrieval";
import { canonicalize } from "json-canonicalize";

const projectId = "project-paper-trail-retrieval-floor";
const query = "graph retrieval augmented generation";
const limit = 8;
const workspaceRoot = process.cwd();
const fixturePath = resolve(
  workspaceRoot,
  "fixtures/paper-trail/openalex_works.json",
);
const expectationsPath = resolve(
  workspaceRoot,
  "fixtures/paper-trail/baseline-expectations.json",
);
const outputPath = resolve(
  workspaceRoot,
  "experiments/retrieval/m1-floor-record.json",
);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalHash = (value) => `sha256:${sha256(canonicalize(value))}`;
const score4 = (value) => Number(value.toFixed(4));

const [fixtureBytes, expectationBytes] = await Promise.all([
  readFile(fixturePath),
  readFile(expectationsPath),
]);
const fixturePayload = JSON.parse(fixtureBytes.toString("utf8"));
const expectations = JSON.parse(expectationBytes.toString("utf8"));
const snapshot = parsePaperTrailSnapshot(fixturePayload);
const fixtureSha256 = sha256(fixtureBytes);

if (fixtureSha256 !== expectations.source_artifact_sha256) {
  throw new Error(
    "The Paper Trail fixture hash does not match its baseline record.",
  );
}
if (
  expectations.lexical_search.query !== query ||
  expectations.lexical_search.limit !== limit
) {
  throw new Error("The frozen Paper Trail query or limit has drifted.");
}

const recordHashByWork = new Map(
  snapshot.works.map((work) => [work.id, canonicalHash(work)]),
);
const lexicalRecords = snapshot.works.map((work) => ({
  projectId,
  objectId: work.id,
  objectKind: "Work",
  authoritativeRevision: 1,
  recordHash: recordHashByWork.get(work.id),
  fields: { title: work.title, body: work.abstract },
}));
const nodes = new Map(
  snapshot.works.map((work) => [
    work.id,
    {
      elementKind: "node",
      id: work.id,
      kind: "Work",
      authoritativeRevision: 1,
      recordHash: recordHashByWork.get(work.id),
      projectId,
      properties: {
        title: work.title,
        year: work.year,
        source_access: "abstract_only",
      },
    },
  ]),
);
const knownIds = new Set(nodes.keys());
const references = new Map(
  snapshot.works.map((work) => [
    work.id,
    work.referenced_works.filter((id) => knownIds.has(id)).sort(),
  ]),
);
const citedBy = new Map(snapshot.works.map((work) => [work.id, []]));
for (const [sourceId, targetIds] of references) {
  for (const targetId of targetIds) citedBy.get(targetId).push(sourceId);
}
for (const sourceIds of citedBy.values()) sourceIds.sort();

const relationship = (sourceId, targetId) => ({
  elementKind: "relationship",
  id: `citation:${sourceId}:${targetId}`,
  kind: "CITES",
  authoritativeRevision: 1,
  recordHash: canonicalHash({ sourceId, predicate: "CITES", targetId }),
  projectId,
  sourceId,
  targetId,
  relationClass: "bibliographic",
  properties: {},
});

const graph = {
  getObject(requestProjectId, id) {
    return Promise.resolve(
      requestProjectId === projectId ? nodes.get(id) : undefined,
    );
  },
  getNeighborhood(requestProjectId, id, options = {}) {
    if (requestProjectId !== projectId || !nodes.has(id)) {
      return Promise.resolve([]);
    }
    if (
      options.predicates?.length > 0 &&
      !options.predicates.includes("CITES")
    ) {
      return Promise.resolve([]);
    }
    const neighbors = [];
    if (options.direction !== "incoming") {
      for (const targetId of references.get(id) ?? []) {
        neighbors.push({
          direction: "outgoing",
          relationship: relationship(id, targetId),
          node: nodes.get(targetId),
        });
      }
    }
    if (options.direction !== "outgoing") {
      for (const sourceId of citedBy.get(id) ?? []) {
        neighbors.push({
          direction: "incoming",
          relationship: relationship(sourceId, id),
          node: nodes.get(sourceId),
        });
      }
    }
    neighbors.sort(
      (left, right) =>
        left.direction.localeCompare(right.direction) ||
        left.node.id.localeCompare(right.node.id),
    );
    return Promise.resolve(neighbors.slice(0, options.limit ?? 20));
  },
};

const baseline = new PaperTrailBaseline(fixturePayload);
const baselineHits = baseline.bm25(query, limit);
const expectedHits = expectations.lexical_search.ordered_hits;
if (
  canonicalize(
    baselineHits.map((hit) => ({
      work_id: hit.workId,
      score_4dp: score4(hit.score),
    })),
  ) !== canonicalize(expectedHits)
) {
  throw new Error(
    "The executable Paper Trail result has drifted from its floor.",
  );
}

const service = new GraphGuidedRetrievalService(
  graph,
  new InMemoryScientificLexicalIndex(lexicalRecords),
);
const hybrid = await service.retrieveHybrid({
  query,
  scope: { projectId, objectKinds: ["Work"] },
  limit,
  graph: {
    direction: "either",
    predicates: ["CITES"],
    neighborsPerCandidate: 8,
  },
});
const petraHits = hybrid.lexical.hits.map((hit) => ({
  rank: hit.rank,
  work_id: hit.objectId,
  score_4dp: score4(hit.score),
  matched_terms: hit.matchedTerms,
}));
const exactRankAndScoreParity = baselineHits.every(
  (hit, index) =>
    hit.workId === petraHits[index]?.work_id &&
    score4(hit.score) === petraHits[index]?.score_4dp,
);
if (!exactRankAndScoreParity) {
  throw new Error(
    "Petra's lexical stage has drifted from the Paper Trail floor.",
  );
}

const resultWithoutHash = {
  schema_name: "petra.m1-retrieval-floor",
  schema_version: "1.0.0",
  source: {
    fixture: "fixtures/paper-trail/openalex_works.json",
    fixture_sha256: fixtureSha256,
    expectations: "fixtures/paper-trail/baseline-expectations.json",
    expectations_sha256: sha256(expectationBytes),
    fetched_at: snapshot.meta.fetched_at,
    license: snapshot.meta.license,
    access_depth: "abstract_only",
    works: snapshot.works.length,
  },
  request: { query, limit, project_id: projectId, object_kinds: ["Work"] },
  paper_trail_floor: {
    scorer: "bm25-k1.5-b0.75-title2.5-abstract1.0",
    ordered_hits: baselineHits.map((hit, index) => ({
      rank: index + 1,
      work_id: hit.workId,
      score_4dp: score4(hit.score),
      matched_terms: hit.matchedTerms,
    })),
  },
  petra_hybrid: {
    recipe: hybrid.recipe,
    scorer: SCIENTIFIC_LEXICAL_SCORER,
    lexical_scope: hybrid.lexical.scope,
    graph_scope: hybrid.graphScope,
    ordered_hits: petraHits,
    admitted_candidates: hybrid.candidates.map((candidate) => ({
      work_id: candidate.object.id,
      rank: candidate.lexicalHit.rank,
      citation_neighbors_returned: candidate.neighbors.length,
    })),
    omissions: hybrid.omissions.map((omission) => ({
      work_id: omission.lexicalHit.objectId,
      reason: omission.reason,
    })),
  },
  descriptive_observations: {
    exact_rank_and_score_parity: exactRankAndScoreParity,
    top_k_overlap_count: petraHits.filter((hit) =>
      baselineHits.some((baselineHit) => baselineHit.workId === hit.work_id),
    ).length,
    admitted_candidate_count: hybrid.candidates.length,
    omitted_candidate_count: hybrid.omissions.length,
    model_calls: 0,
    external_calls: 0,
  },
  interpretation_boundary: {
    use: "deterministic_compatibility_and_graph_admission_floor",
    representative_relevance_judgments: false,
    retrieval_quality_ranking_permitted: false,
    latency_ranking_permitted: false,
    scientific_evidence_admissible: false,
    reason:
      "One abstract-only query with no relevance judgments can detect regression but cannot rank retrieval systems.",
  },
  challenger_gate: {
    status: "deferred_until_representative_corpus_and_judgments",
    candidates: [
      "dense_retrieval",
      "community_summaries",
      "hipporag2",
      "alternative_graph_retrieval",
    ],
    required_before_ranking: [
      "representative_multi-domain_corpus",
      "frozen_query_set",
      "independent_relevance_judgments",
      "quality_metrics_with_uncertainty",
      "latency_and_cost_measurement_protocol",
      "identical_rights_and_evidence_constraints",
    ],
  },
  recipe_identity: HYBRID_RETRIEVAL_RECIPE,
};
const result = {
  ...resultWithoutHash,
  content_hash: canonicalHash(resultWithoutHash),
};
const serialized = `${JSON.stringify(result, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8");
  if (existing !== serialized) {
    throw new Error(
      "The committed M1 retrieval floor is stale; run npm run benchmark:retrieval:m1-floor.",
    );
  }
  process.stdout.write(
    `Verified M1 retrieval floor ${result.content_hash} with ${hybrid.candidates.length} admitted candidates.\n`,
  );
} else {
  await writeFile(outputPath, serialized, { encoding: "utf8", flag: "w" });
  process.stdout.write(
    `Recorded M1 retrieval floor ${result.content_hash} at ${outputPath}.\n`,
  );
}
