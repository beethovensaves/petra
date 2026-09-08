import { describe, expect, it, vi } from "vitest";

import type {
  AuthorityGraphFreshness,
  AuthorityGraphNeighbor,
  AuthorityGraphObjectView,
  AuthorityGraphProvenancePath,
  AuthorityGraphStore,
  GraphCommitReceipt,
} from "@petra/core";

import {
  GraphGuidedRetrievalService,
  HYBRID_RETRIEVAL_RECIPE,
  InMemoryScientificLexicalIndex,
  SCIENTIFIC_LEXICAL_SCORER,
  type ScientificLexicalRecord,
} from "../src/scientific-retrieval.js";

const node = (
  id: string,
  kind: "Work" | "Claim",
  authoritativeRevision = 1,
  recordHash = `sha256:${id}`,
): AuthorityGraphObjectView => ({
  elementKind: "node",
  id,
  kind,
  authoritativeRevision,
  recordHash,
  projectId: "project-alpha",
  properties: { title: id },
});

const lexicalRecords = (): ScientificLexicalRecord[] => [
  {
    projectId: "project-alpha",
    objectId: "claim-current",
    objectKind: "Claim",
    authoritativeRevision: 2,
    recordHash: "sha256:claim-current-v2",
    fields: {
      title: "Graph evidence supports retrieval",
      body: "A current scientific claim about bounded retrieval.",
    },
  },
  {
    projectId: "project-alpha",
    objectId: "claim-stale",
    objectKind: "Claim",
    authoritativeRevision: 1,
    recordHash: "sha256:claim-stale-v1",
    fields: {
      title: "Retrieval claim",
      body: "Graph evidence from an older projection.",
    },
  },
  {
    projectId: "project-alpha",
    objectId: "work-missing",
    objectKind: "Work",
    authoritativeRevision: 1,
    recordHash: "sha256:work-missing",
    fields: {
      title: "Graph retrieval paper",
      body: "Scientific evidence.",
    },
  },
  {
    projectId: "project-beta",
    objectId: "claim-other-project",
    objectKind: "Claim",
    authoritativeRevision: 1,
    recordHash: "sha256:other",
    fields: {
      title: "Graph retrieval",
      body: "This record must not cross project scope.",
    },
  },
];

class TestGraphStore implements AuthorityGraphStore {
  readonly objects = new Map<string, AuthorityGraphObjectView>();
  readonly neighborhoods = new Map<string, readonly AuthorityGraphNeighbor[]>();
  provenance?: AuthorityGraphProvenancePath;
  readonly getObject = vi.fn((_projectId: string, id: string) =>
    Promise.resolve(this.objects.get(id)),
  );
  readonly getNeighborhood = vi.fn((_projectId: string, id: string) =>
    Promise.resolve(this.neighborhoods.get(id) ?? []),
  );
  readonly getProvenancePath = vi.fn(() => Promise.resolve(this.provenance));

  prepare(): Promise<void> {
    return Promise.resolve();
  }
  apply(): Promise<GraphCommitReceipt> {
    return Promise.reject(new Error("Not used by retrieval tests."));
  }
  clearProject(): Promise<void> {
    return Promise.resolve();
  }
  getEvidenceRelations(): Promise<readonly AuthorityGraphObjectView[]> {
    return Promise.resolve([]);
  }
  getProjectRelationships(): Promise<readonly AuthorityGraphObjectView[]> {
    return Promise.resolve([]);
  }
  getCitationPath(): Promise<undefined> {
    return Promise.resolve(undefined);
  }
  getFreshness(): Promise<AuthorityGraphFreshness> {
    return Promise.reject(new Error("Not used by retrieval tests."));
  }
}

describe("scientific retrieval", () => {
  it("retrieves canonical identity directly without invoking lexical search", async () => {
    const graph = new TestGraphStore();
    graph.objects.set("work-1", node("work-1", "Work"));
    const lexical = { search: vi.fn() };
    const service = new GraphGuidedRetrievalService(graph, lexical);

    await expect(
      service.getCanonicalObject("project-alpha", "work-1"),
    ).resolves.toEqual(node("work-1", "Work"));
    expect(graph.getObject).toHaveBeenCalledOnce();
    expect(lexical.search).not.toHaveBeenCalled();
  });

  it("returns deterministic BM25 candidates with explicit Project and kind scope", async () => {
    const index = new InMemoryScientificLexicalIndex(lexicalRecords());
    const result = await index.search({
      query: "graph bounded retrieval",
      scope: { projectId: "project-alpha", objectKinds: ["Claim"] },
      limit: 2,
    });

    expect(result).toEqual(
      expect.objectContaining({
        query: "graph bounded retrieval",
        scorer: SCIENTIFIC_LEXICAL_SCORER,
        scope: {
          projectId: "project-alpha",
          objectKinds: ["Claim"],
          scopedCorpusSize: 2,
        },
        limit: 2,
      }),
    );
    expect(result.hits.map((hit) => hit.objectId)).toEqual([
      "claim-current",
      "claim-stale",
    ]);
    expect(result.hits[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        authoritativeRevision: 2,
        recordHash: "sha256:claim-current-v2",
        matchedTerms: ["graph", "bounded", "retrieval"],
      }),
    );
    expect(result.hits.every((hit) => hit.score > 0)).toBe(true);
    expect(result.hits).not.toContainEqual(
      expect.objectContaining({ objectId: "claim-other-project" }),
    );
  });

  it("bounds lexical work and rejects invalid records or requests", async () => {
    const index = new InMemoryScientificLexicalIndex(lexicalRecords());
    await expect(
      index.search({
        query: "retrieval",
        scope: { projectId: "project-alpha" },
        limit: 26,
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "RETRIEVAL_LIMIT_INVALID" }),
    );
    await expect(
      index.search({ query: " ", scope: { projectId: "project-alpha" } }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "RETRIEVAL_QUERY_INVALID" }),
    );
    expect(
      () =>
        new InMemoryScientificLexicalIndex([
          lexicalRecords()[0]!,
          lexicalRecords()[0]!,
        ]),
    ).toThrowError(
      expect.objectContaining({ code: "RETRIEVAL_RECORD_DUPLICATE" }),
    );
  });

  it("returns a bounded, predicate-explicit focused neighborhood", async () => {
    const graph = new TestGraphStore();
    graph.objects.set("claim-current", node("claim-current", "Claim", 2));
    const neighbor: AuthorityGraphNeighbor = {
      direction: "incoming",
      relationship: {
        elementKind: "relationship",
        id: "assertion-1",
        kind: "SUPPORTS",
        authoritativeRevision: 1,
        recordHash: "sha256:assertion-1",
        sourceId: "claim-source",
        targetId: "claim-current",
        relationClass: "scientific",
        properties: {},
      },
      node: node("claim-source", "Claim"),
    };
    graph.neighborhoods.set("claim-current", [neighbor]);
    const service = new GraphGuidedRetrievalService(
      graph,
      new InMemoryScientificLexicalIndex([]),
    );

    await expect(
      service.getFocusedNeighborhood({
        projectId: "project-alpha",
        objectId: "claim-current",
        direction: "incoming",
        predicates: ["SUPPORTS", "CHALLENGES"],
        limit: 4,
      }),
    ).resolves.toEqual({
      center: node("claim-current", "Claim", 2),
      direction: "incoming",
      predicates: ["SUPPORTS", "CHALLENGES"],
      limit: 4,
      neighbors: [neighbor],
    });
    expect(graph.getNeighborhood).toHaveBeenCalledWith(
      "project-alpha",
      "claim-current",
      {
        direction: "incoming",
        predicates: ["SUPPORTS", "CHALLENGES"],
        limit: 4,
      },
    );
  });

  it("delegates exact provenance to the graph fast path with no lexical or model call", async () => {
    const graph = new TestGraphStore();
    graph.provenance = {
      assertion: {
        elementKind: "relationship",
        id: "assertion-1",
        kind: "ASSERTS",
        authoritativeRevision: 2,
        recordHash: "sha256:assertion-1",
        sourceId: "version-1",
        targetId: "claim-current",
        relationClass: "representation",
        properties: {},
      },
      work: node("work-1", "Work"),
      workVersion: {
        ...node("version-1", "Work"),
        kind: "WorkVersion",
      },
      claim: node("claim-current", "Claim", 2),
      sourceSpans: [],
      artifacts: [],
    };
    const lexical = { search: vi.fn() };
    const service = new GraphGuidedRetrievalService(graph, lexical);

    await expect(
      service.getExactProvenancePath("project-alpha", "assertion-1"),
    ).resolves.toBe(graph.provenance);
    expect(graph.getProvenancePath).toHaveBeenCalledWith(
      "project-alpha",
      "assertion-1",
    );
    expect(lexical.search).not.toHaveBeenCalled();
  });

  it("joins candidates to current graph revisions and exposes stale or missing omissions", async () => {
    const graph = new TestGraphStore();
    graph.objects.set(
      "claim-current",
      node("claim-current", "Claim", 2, "sha256:claim-current-v2"),
    );
    graph.objects.set(
      "claim-stale",
      node("claim-stale", "Claim", 2, "sha256:claim-stale-v2"),
    );
    const service = new GraphGuidedRetrievalService(
      graph,
      new InMemoryScientificLexicalIndex(lexicalRecords()),
    );
    const result = await service.retrieveHybrid({
      query: "graph retrieval evidence",
      scope: { projectId: "project-alpha" },
      limit: 3,
      graph: {
        direction: "either",
        predicates: ["SUPPORTS", "CHALLENGES", "GROUNDED_IN"],
        neighborsPerCandidate: 5,
      },
    });

    expect(result.recipe).toBe(HYBRID_RETRIEVAL_RECIPE);
    expect(result.lexical.scope).toEqual(
      expect.objectContaining({
        projectId: "project-alpha",
        scopedCorpusSize: 3,
      }),
    );
    expect(result.graphScope).toEqual({
      direction: "either",
      predicates: ["SUPPORTS", "CHALLENGES", "GROUNDED_IN"],
      neighborsPerCandidate: 5,
    });
    expect(
      result.candidates.map(({ lexicalHit }) => lexicalHit.objectId),
    ).toEqual(["claim-current"]);
    expect(
      result.omissions.find(
        ({ lexicalHit }) => lexicalHit.objectId === "claim-stale",
      )?.reason,
    ).toBe("lexical_projection_stale");
    expect(
      result.omissions.find(
        ({ lexicalHit }) => lexicalHit.objectId === "work-missing",
      )?.reason,
    ).toBe("graph_object_missing");
    expect(graph.getNeighborhood).toHaveBeenCalledTimes(1);
    expect(graph.getNeighborhood).toHaveBeenCalledWith(
      "project-alpha",
      "claim-current",
      {
        direction: "either",
        predicates: ["SUPPORTS", "CHALLENGES", "GROUNDED_IN"],
        limit: 5,
      },
    );
  });
});
