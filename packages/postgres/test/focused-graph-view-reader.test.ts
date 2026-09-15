import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraAssertion,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectionCheckpoint,
  PetraSourceSpan,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  AuthorityGraphObjectView,
  AuthorityGraphStore,
  FocusedGraphViewRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresFocusedGraphViewReader } from "../src/focused-graph-view-reader.js";

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const result = <Row extends Record<string, unknown>>(
  rows: Row[],
): QueryResult<Row> =>
  ({ rows, rowCount: rows.length }) as unknown as QueryResult<Row>;

const contracts = new PetraContractRegistry();
const contract = (name: string) => {
  const entry = contracts.entries.find((candidate) => candidate.name === name);
  if (entry === undefined) throw new Error(`Missing contract ${name}.`);
  return {
    name: `petra.${name}`,
    version: entry.version,
    content_hash: entry.canonical_sha256,
  };
};

const definition = (): PetraProjectDefinition => {
  const value = fixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  value.content.registrations = [
    {
      registration_kind: "objective_schema",
      semantic_key: "scientific.research-question",
      contract: contract("project-objective"),
    },
    {
      registration_kind: "object_schema",
      semantic_key: "scientific.claim",
      contract: contract("claim"),
    },
    {
      registration_kind: "relationship_schema",
      semantic_key: "scientific.assertion",
      contract: contract("assertion"),
    },
    {
      registration_kind: "extension",
      semantic_key: "petra.focused-graph",
      contract: contract("focused-graph-view"),
    },
    {
      registration_kind: "extension",
      semantic_key: "scientific.graph.return",
      contract: contract("focused-graph-view"),
    },
  ];
  value.content.terms.push(
    {
      semantic_key: "scientific.assertion",
      singular: "Evidence relationship",
      plural: "Evidence relationships",
      definition: "A registered scientific relationship with exact basis.",
      generic_family: "relationship",
    },
    {
      semantic_key: "scientific.graph.return",
      singular: "Return to evidence",
      plural: "Return to evidence",
      definition: "Return to the exact originating evidence object.",
      generic_family: "task",
    },
  );
  value.content_hash = hash(value.content);
  return value;
};

const trustedClaim = (id: string, label: string): PetraClaim => {
  const value = fixture<PetraClaim>("claim");
  value.claim_id = id;
  value.canonical_text = label;
  value.authority = structuredClone(
    fixture<PetraAssertion>("assertion-trusted").authority,
  );
  return value;
};

const graphNode = (claim: PetraClaim): AuthorityGraphObjectView => ({
  elementKind: "node",
  id: claim.claim_id,
  kind: "Claim",
  authoritativeRevision: claim.revision,
  recordHash: hash(claim),
  properties: { target_sequence: 1, stream_revision: 3, event_position: 3 },
});

describe("PostgreSQL focused graph query reader", () => {
  it("binds exact definition, snapshots, limits, canonical records, and the guarded Neo4j neighborhood", async () => {
    const projectDefinition = definition();
    const focus = trustedClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
      "Focused claim",
    );
    const related = trustedClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FD2",
      "Related claim",
    );
    related.basis = {
      basis_kind: "researcher",
      rationale:
        "The researcher recorded this related Claim without a direct SourceSpan.",
      proposed_by: structuredClone(related.created_by),
      proposed_at: related.created_at,
    };
    const predicates = [
      "CITES",
      "SUPPORTS",
      "CONTRADICTS",
      "QUALIFIES",
      "ADOPTS",
    ] as const;
    const assertions = predicates.map((predicate, index) => {
      const assertion = fixture<PetraAssertion>("assertion-trusted");
      assertion.assertion_id = `assertion_01ARZ3NDEKTSV4RRFFQ69G5FD${index + 3}`;
      assertion.subject_id = focus.claim_id;
      assertion.predicate = predicate;
      assertion.object = {
        object_kind: "entity",
        entity_id: related.claim_id,
      };
      assertion.assertion_kind =
        predicate === "ADOPTS" ? "model_inference" : "source_stated";
      assertion.rationale = `The exact accepted Assertion records ${predicate}.`;
      return assertion;
    });
    const sourceSpan = fixture<PetraSourceSpan>("source-span");
    const checkpoint = fixture<PetraProjectionCheckpoint>(
      "projection-checkpoint-current",
    );
    const focusNode = graphNode(focus);
    const relatedNode = graphNode(related);
    const relationships: AuthorityGraphObjectView[] = assertions.map(
      (assertion) => ({
        elementKind: "relationship",
        id: assertion.assertion_id,
        kind: assertion.predicate,
        authoritativeRevision: assertion.revision,
        recordHash: hash(assertion),
        projectId: projectDefinition.project_id,
        sourceId: focus.claim_id,
        targetId: related.claim_id,
        assertionId: assertion.assertion_id,
        relationClass: "scientific",
        properties: {
          target_sequence: 1,
          stream_revision: 3,
          event_position: 3,
        },
      }),
    );
    const evidence = new Map<string, PetraClaim | PetraAssertion>([
      [focus.claim_id, focus],
      [related.claim_id, related],
      ...assertions.map(
        (assertion) => [assertion.assertion_id, assertion] as const,
      ),
    ]);
    const queries: string[] = [];
    const client = {
      query: async <Row extends Record<string, unknown>>(
        text: string,
        values: readonly unknown[] = [],
      ): Promise<QueryResult<Row>> => {
        await Promise.resolve();
        queries.push(text);
        if (
          text.startsWith("BEGIN") ||
          text === "COMMIT" ||
          text === "ROLLBACK"
        )
          return result([]);
        if (text.includes("transaction_timestamp()"))
          return result([
            { read_at: new Date("2026-09-15T20:00:00.000Z") } as unknown as Row,
          ]);
        if (text.includes("FROM petra.projects AS project"))
          return values[0] === projectDefinition.project_id
            ? result([
                {
                  project_id: projectDefinition.project_id,
                  definition_payload: structuredClone(projectDefinition),
                  definition_record_hash: hash(projectDefinition),
                } as unknown as Row,
              ])
            : result([]);
        if (text.includes("FROM petra.projection_checkpoints AS head"))
          return result([
            {
              payload: structuredClone(checkpoint),
              record_hash: hash(checkpoint),
            } as unknown as Row,
          ]);
        if (text.includes("FROM petra.authority_positions AS authority"))
          return result([
            { event_position: "3", stream_revision: "3" } as unknown as Row,
          ]);
        if (text.includes("FROM petra.outbox_target_heads AS head"))
          return result([
            {
              target_sequence: "1",
              event_position: "3",
              stream_revision: "3",
            } as unknown as Row,
          ]);
        if (text.includes("FROM petra.source_spans AS span"))
          return values[1] === sourceSpan.source_span_id
            ? result([
                {
                  payload: structuredClone(sourceSpan),
                  record_hash: hash(sourceSpan),
                  project_scoped: true,
                } as unknown as Row,
              ])
            : result([]);
        if (text.includes("FROM petra.evidence_entity_revisions")) {
          const record = evidence.get(String(values[0]));
          return record === undefined
            ? result([])
            : result([
                {
                  payload: structuredClone(record),
                  record_hash: hash(record),
                } as unknown as Row,
              ]);
        }
        throw new Error(`Unexpected query: ${text}`);
      },
      release: vi.fn(),
    };
    const pool = {
      connect: () => Promise.resolve(client),
    } as unknown as Pool;
    const getFreshness = vi.fn(() =>
      Promise.resolve({
        projectId: projectDefinition.project_id,
        projection: checkpoint.projection,
        projectedTargetSequence: 1,
        projectedEventId: checkpoint.content.observed_head.event_id,
        projectedStreamRevision: 3,
        observedTargetSequence: 1,
        pendingRecords: 0,
        state: "current" as const,
      }),
    );
    const graph = {
      getFreshness,
      getObject: (_projectId: string, id: string) =>
        Promise.resolve(
          id === focus.claim_id
            ? focusNode
            : id === related.claim_id
              ? relatedNode
              : undefined,
        ),
      getEvidenceRelations: () => Promise.resolve(relationships),
    } as unknown as AuthorityGraphStore;
    const request: FocusedGraphViewRequest = {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question: "What directly supports this Claim?",
      focus_ref: {
        record_id: focus.claim_id,
        revision: focus.revision,
        record_hash: hash(focus),
      },
      origin: { origin_kind: "direct" },
      project_definition_ref: {
        project_definition_id: projectDefinition.project_definition_id,
        revision: projectDefinition.revision,
        content_hash: projectDefinition.content_hash,
        record_hash: hash(projectDefinition),
        definition_family: projectDefinition.definition_family,
      },
      semantic_layer: "current",
      temporal_position: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      object_semantic_key: "scientific.claim",
      relationship_semantic_key: "scientific.assertion",
      return_action_semantic_key: "scientific.graph.return",
      return_destination: {
        destination_key: "destination:evidence",
        destination_kind: "evidence",
        state: "available",
        owner: "project_relationship_view",
        label: "Return to Evidence",
        target_ref: {
          record_id: focus.claim_id,
          revision: focus.revision,
          record_hash: hash(focus),
        },
      },
      limits: {
        maximum_depth: 1,
        maximum_nodes: 5,
        maximum_relationships: 8,
        maximum_paths: 8,
      },
    };
    const reader = new PostgresFocusedGraphViewReader(pool, graph, contracts);
    const view = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      request,
    );

    expect(view?.project_id).toBe(projectDefinition.project_id);
    expect(view?.content.profile.project_definition_ref).toEqual(
      request.project_definition_ref,
    );
    expect(view?.content.requested_snapshot.event_position).toBe(3);
    expect(view?.content.represented_snapshot.event_position).toBe(3);
    expect(view?.content.projection_position).toEqual(
      expect.objectContaining({
        state: "current",
        represented_event_position: 3,
        observed_event_position: 3,
        pending_records: 0,
      }),
    );
    expect(view?.content.scope.limits).toEqual(request.limits);
    expect(view?.content.scope.coverage).toBe("complete_for_scope");
    expect(
      view?.content.nodes.map((node) => node.record_ref.record_id),
    ).toEqual([focus.claim_id, related.claim_id]);
    expect(
      view?.content.relationships.map((relationship) => ({
        predicate: relationship.predicate,
        meaning: relationship.meaning_kind,
      })),
    ).toEqual([
      { predicate: "CITES", meaning: "citation" },
      { predicate: "SUPPORTS", meaning: "support" },
      { predicate: "CONTRADICTS", meaning: "contradiction" },
      { predicate: "QUALIFIES", meaning: "qualification" },
      { predicate: "ADOPTS", meaning: "inference" },
    ]);
    expect(view?.content.relationships.at(-1)?.origin).toBe("model_inference");
    expect(view?.content.paths).toHaveLength(5);
    expect(
      view?.content.paths.every(
        (path) =>
          path.steps.length === 1 &&
          path.steps[0]?.traversal_direction === "outgoing",
      ),
    ).toBe(true);
    const sourceDestination = view?.content.destinations.find(
      (destination) => destination.destination_kind === "source_inspection",
    );
    expect(sourceDestination).toEqual(
      expect.objectContaining({
        state: "available",
        owner: "project_object_location_view",
        target_ref: {
          record_id: sourceSpan.source_span_id,
          revision: sourceSpan.revision,
          record_hash: hash(sourceSpan),
        },
      }),
    );
    expect(
      view?.content.nodes[0]?.basis.record_refs.some(
        (ref) => ref.record_id === sourceSpan.source_span_id,
      ),
    ).toBe(true);
    expect(view?.content.nodes[0]?.basis.limitations).toEqual([]);
    expect(view?.content.nodes[0]?.basis.summary).toContain(
      "source-span-resolution=pass:SPAN_RESOLVED",
    );
    expect(view?.content.relationships[0]?.basis.summary).toContain(
      "trusted/human_accepted",
    );
    const unavailableSource = view?.content.destinations.find(
      (destination) => destination.state === "unavailable",
    );
    expect(unavailableSource?.destination_kind).toBe("source_inspection");
    expect(
      unavailableSource?.state === "unavailable"
        ? unavailableSource.reason
        : undefined,
    ).toContain("No direct SourceSpan location");
    expect(view?.content.nodes[1]?.destination_keys).toContain(
      unavailableSource?.destination_key,
    );
    expect(view?.content.authority_boundary.renderer_queries_projection).toBe(
      false,
    );
    expect(getFreshness).toHaveBeenCalledTimes(2);
    expect(queries.at(-1)).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();

    const staleRequest: FocusedGraphViewRequest = {
      ...structuredClone(request),
      expected_snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        revision: 1,
        event_position: 2,
        content_hash: `sha256:${"f".repeat(64)}`,
      },
    };
    await expect(
      reader.queryFocusedGraph(projectDefinition.project_id, staleRequest),
    ).rejects.toEqual(
      expect.objectContaining({ code: "FOCUSED_GRAPH_SNAPSHOT_STALE" }),
    );
    expect(queries.at(-1)).toBe("ROLLBACK");
  });
});
