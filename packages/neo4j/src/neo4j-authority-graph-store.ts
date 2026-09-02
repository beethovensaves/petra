import { createHash, randomUUID } from "node:crypto";

import {
  AuthorityGraphStoreError,
  type AuthorityGraphBatch,
  type AuthorityGraphCitationPath,
  type AuthorityGraphFreshness,
  type AuthorityGraphNeighbor,
  type AuthorityGraphNeighborhoodQuery,
  type AuthorityGraphNode,
  type AuthorityGraphObjectView,
  type AuthorityGraphPredicate,
  type AuthorityGraphProvenancePath,
  type AuthorityGraphRelationClass,
  type AuthorityGraphRelationship,
  type AuthorityGraphStore,
  type GraphCommitReceipt,
  type GraphProperty,
} from "@petra/core";
import { int, integer, isInt, isNode, isRelationship } from "neo4j-driver";
import type {
  Driver,
  ManagedTransaction,
  Record as Neo4jRecord,
} from "neo4j-driver";

const NODE_LABELS = new Set<AuthorityGraphNode["kind"]>([
  "Project",
  "Work",
  "WorkVersion",
  "Artifact",
  "SourceSpan",
  "Claim",
]);

const RELATION_TYPES = new Set<AuthorityGraphPredicate>([
  "PROJECTS",
  "VERSION_OF",
  "REPRESENTED_BY",
  "LOCATED_IN",
  "GROUNDED_IN",
  "CITES",
  "CITES_AS_BACKGROUND",
  "ASSERTS",
  "ADDRESSES",
  "SUPPORTS",
  "CONTRADICTS",
  "QUALIFIES",
  "ADOPTS",
  "DIRECTLY_TESTS",
  "EXTENDS",
  "REFRAMES",
  "CHALLENGES",
  "CRITIQUES_METHOD",
  "ASSUMES",
  "PREDICTS",
  "RIVAL_OF",
  "TESTS",
  "IMPLEMENTS",
  "USES",
  "PRODUCED",
  "ANALYZES",
  "EVALUATES",
  "GOVERNS",
  "INTERPRETS",
  "COMPOSED_FROM",
  "GROUNDS",
  "RENDERS",
  "REPLICATES",
  "FAILS_TO_REPLICATE",
  "INVESTIGATES",
  "TESTS_CAUSE",
  "CORRECTS",
  "DEPENDS_ON",
  "SUPERSEDES",
]);

const SCIENTIFIC_RELATIONS = [
  "SUPPORTS",
  "CONTRADICTS",
  "QUALIFIES",
  "ADOPTS",
  "DIRECTLY_TESTS",
  "EXTENDS",
  "REFRAMES",
  "CHALLENGES",
  "CRITIQUES_METHOD",
  "INTERPRETS",
  "REPLICATES",
  "FAILS_TO_REPLICATE",
] as const satisfies readonly AuthorityGraphPredicate[];

const HASH = /^sha256:[0-9a-f]{64}$/;

export interface Neo4jAuthorityGraphStoreOptions {
  driver: Driver;
  database?: string;
}

interface RawProperties {
  [key: string]: unknown;
}

const error = (
  code: ConstructorParameters<typeof AuthorityGraphStoreError>[0],
  message: string,
): AuthorityGraphStoreError => new AuthorityGraphStoreError(code, message);

const recordGet = (record: Neo4jRecord, key: string): unknown =>
  record.get(key) as unknown;

const nativeNumber = (value: unknown, name: string): number => {
  const converted = isInt(value) ? integer.toNumber(value) : value;
  if (typeof converted !== "number" || !Number.isSafeInteger(converted)) {
    throw error("GRAPH_IDENTITY_CONFLICT", `${name} is not a safe integer.`);
  }
  return converted;
};

const nativeValue = (value: unknown): unknown => {
  if (isInt(value)) return integer.toNumber(value);
  if (Array.isArray(value)) return value.map(nativeValue);
  return value;
};

const rawProperties = (value: unknown): RawProperties => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw error(
      "GRAPH_IDENTITY_CONFLICT",
      "Neo4j returned invalid properties.",
    );
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, member]) => [key, nativeValue(member)]),
  );
};

const graphProperties = (value: unknown): Record<string, GraphProperty> => {
  const properties = rawProperties(value);
  const result: Record<string, GraphProperty> = {};
  for (const [key, member] of Object.entries(properties)) {
    if (
      typeof member === "string" ||
      typeof member === "number" ||
      typeof member === "boolean" ||
      (Array.isArray(member) &&
        member.every(
          (item) =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean",
        ))
    ) {
      result[key] = member as GraphProperty;
    }
  }
  return result;
};

const asNodeView = (value: unknown): AuthorityGraphObjectView => {
  if (!isNode(value)) {
    throw error("GRAPH_IDENTITY_CONFLICT", "Neo4j did not return a node.");
  }
  const raw = value as unknown as {
    labels: string[];
    properties: RawProperties;
  };
  const properties = graphProperties(raw.properties);
  const id = properties.petra_id;
  const kind = properties.kind;
  const revision = properties.authoritative_revision;
  const recordHash = properties.record_hash;
  if (
    typeof id !== "string" ||
    typeof kind !== "string" ||
    !NODE_LABELS.has(kind as AuthorityGraphNode["kind"]) ||
    typeof revision !== "number" ||
    typeof recordHash !== "string"
  ) {
    throw error(
      "GRAPH_IDENTITY_CONFLICT",
      "A projected node is missing its visible Petra identity fields.",
    );
  }
  return {
    elementKind: "node",
    id,
    kind: kind as AuthorityGraphNode["kind"],
    authoritativeRevision: revision,
    recordHash,
    properties,
  };
};

const asRelationshipView = (
  value: unknown,
  sourceIdValue: unknown,
  targetIdValue: unknown,
): AuthorityGraphObjectView => {
  if (!isRelationship(value)) {
    throw error(
      "GRAPH_IDENTITY_CONFLICT",
      "Neo4j did not return a relationship.",
    );
  }
  const raw = value as unknown as {
    type: string;
    properties: RawProperties;
  };
  const properties = graphProperties(raw.properties);
  const id = properties.assertion_id ?? properties.petra_edge_id;
  const revision = properties.authoritative_revision;
  const recordHash = properties.record_hash;
  const projectId = properties.project_id;
  const relationClass = properties.relation_class;
  if (
    typeof id !== "string" ||
    !RELATION_TYPES.has(raw.type as AuthorityGraphPredicate) ||
    typeof revision !== "number" ||
    typeof recordHash !== "string" ||
    typeof sourceIdValue !== "string" ||
    typeof targetIdValue !== "string"
  ) {
    throw error(
      "GRAPH_IDENTITY_CONFLICT",
      "A projected relationship is missing its visible Petra identity fields.",
    );
  }
  return {
    elementKind: "relationship",
    id,
    kind: raw.type as AuthorityGraphPredicate,
    authoritativeRevision: revision,
    recordHash,
    sourceId: sourceIdValue,
    targetId: targetIdValue,
    ...(typeof projectId === "string" ? { projectId } : {}),
    ...(typeof properties.assertion_id === "string"
      ? { assertionId: properties.assertion_id }
      : {}),
    ...(typeof relationClass === "string"
      ? {
          relationClass: relationClass as AuthorityGraphRelationClass,
        }
      : {}),
    properties,
  };
};

const projectionParameters = (batch: AuthorityGraphBatch) => ({
  projectId: batch.projectId,
  projectionName: batch.projection.projection_name,
  projectionVersion: batch.projection.projection_version,
  configurationHash: batch.projection.configuration_hash,
});

const projectionHash = (batch: AuthorityGraphBatch): string =>
  `sha256:${createHash("sha256").update(JSON.stringify(batch)).digest("hex")}`;

const validateLimit = (limit = 50): number => {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw error(
      "GRAPH_QUERY_INVALID",
      "Graph query limits must be integers from 1 to 100.",
    );
  }
  return limit;
};

const validateDepth = (depth = 3): number => {
  if (!Number.isSafeInteger(depth) || depth < 1 || depth > 6) {
    throw error(
      "GRAPH_QUERY_INVALID",
      "Citation path depth must be an integer from 1 to 6.",
    );
  }
  return depth;
};

const validateBatch = (batch: AuthorityGraphBatch): void => {
  if (
    batch.projectId === "" ||
    batch.sourceEventId !== batch.outbox.eventId ||
    batch.outbox.targetSequence < 1 ||
    !Number.isSafeInteger(batch.outbox.targetSequence) ||
    !HASH.test(batch.projection.configuration_hash)
  ) {
    throw error(
      "GRAPH_BATCH_INVALID",
      "The graph batch has an invalid Project, event, sequence, or projection identity.",
    );
  }
  const nodes = new Map<string, AuthorityGraphNode>();
  for (const node of batch.nodes) {
    if (
      node.id === "" ||
      !NODE_LABELS.has(node.kind) ||
      !Number.isSafeInteger(node.authoritativeRevision) ||
      node.authoritativeRevision < 1 ||
      !HASH.test(node.recordHash) ||
      nodes.has(node.id)
    ) {
      throw error(
        "GRAPH_BATCH_INVALID",
        `Graph node ${node.id || "<empty>"} has invalid or duplicate identity.`,
      );
    }
    nodes.set(node.id, node);
  }
  if (nodes.get(batch.projectId)?.kind !== "Project") {
    throw error(
      "GRAPH_BATCH_INVALID",
      "Every graph batch must include its exact Project node.",
    );
  }
  const edges = new Set<string>();
  for (const relationship of batch.relationships) {
    if (
      relationship.edgeId === "" ||
      edges.has(relationship.edgeId) ||
      !RELATION_TYPES.has(relationship.predicate) ||
      !nodes.has(relationship.sourceId) ||
      !nodes.has(relationship.targetId) ||
      !Number.isSafeInteger(relationship.authoritativeRevision) ||
      relationship.authoritativeRevision < 1 ||
      !HASH.test(relationship.recordHash) ||
      (relationship.assertionId !== undefined &&
        relationship.assertionId !== relationship.edgeId)
    ) {
      throw error(
        "GRAPH_BATCH_INVALID",
        `Graph relationship ${relationship.edgeId || "<empty>"} is invalid.`,
      );
    }
    edges.add(relationship.edgeId);
  }
};

const neo4jValue = (value: GraphProperty): unknown => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? int(value) : value;
  }
  if (Array.isArray(value)) {
    const members = value as readonly (string | number | boolean)[];
    return members.map((member) =>
      typeof member === "number" && Number.isSafeInteger(member)
        ? int(member)
        : member,
    );
  }
  return value;
};

const storedProperties = (
  properties: Readonly<Record<string, GraphProperty>>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, neo4jValue(value)]),
  );

export class Neo4jAuthorityGraphStore implements AuthorityGraphStore {
  readonly #driver: Driver;
  readonly #database: string | undefined;

  constructor(options: Neo4jAuthorityGraphStoreOptions) {
    this.#driver = options.driver;
    this.#database = options.database;
  }

  async prepare(): Promise<void> {
    await this.#driver.verifyConnectivity();
    const session = this.#session();
    try {
      await session.executeWrite(async (transaction) => {
        await transaction.run(
          "CREATE CONSTRAINT petra_node_id IF NOT EXISTS FOR (node:PetraNode) REQUIRE node.petra_id IS UNIQUE",
        );
        await transaction.run(
          "CREATE CONSTRAINT petra_projection_head IF NOT EXISTS FOR (head:PetraProjectionHead) REQUIRE (head.project_id, head.projection_name, head.projection_version, head.configuration_hash) IS UNIQUE",
        );
        await transaction.run(
          "CREATE CONSTRAINT petra_edge_identity IF NOT EXISTS FOR (identity:PetraEdgeIdentity) REQUIRE identity.petra_edge_id IS UNIQUE",
        );
        await transaction.run(
          "CREATE INDEX petra_asserts_assertion_id IF NOT EXISTS FOR ()-[relation:ASSERTS]-() ON (relation.assertion_id)",
        );
        await transaction.run(
          "CREATE INDEX petra_cites_assertion_id IF NOT EXISTS FOR ()-[relation:CITES]-() ON (relation.assertion_id)",
        );
      });
    } finally {
      await session.close();
    }
  }

  async apply(batch: AuthorityGraphBatch): Promise<GraphCommitReceipt> {
    validateBatch(batch);
    const batchHash = projectionHash(batch);
    const session = this.#session();
    try {
      const duplicate = await session.executeWrite(async (transaction) => {
        const headResult = await transaction.run(
          `MERGE (head:PetraProjectionHead {
             project_id: $projectId,
             projection_name: $projectionName,
             projection_version: $projectionVersion,
             configuration_hash: $configurationHash
           })
           ON CREATE SET head.target_sequence = 0
           SET head.lock_token = $lockToken
           RETURN head.target_sequence AS target_sequence,
                  head.last_outbox_id AS last_outbox_id,
                  head.last_batch_hash AS last_batch_hash`,
          { ...projectionParameters(batch), lockToken: randomUUID() },
        );
        const head = headResult.records[0];
        if (head === undefined) {
          throw error(
            "GRAPH_IDENTITY_CONFLICT",
            "Neo4j did not return the locked projection head.",
          );
        }
        const current = nativeNumber(
          recordGet(head, "target_sequence"),
          "Projection target sequence",
        );
        if (batch.outbox.targetSequence === current) {
          if (
            recordGet(head, "last_outbox_id") !== batch.outbox.outboxId ||
            recordGet(head, "last_batch_hash") !== batchHash
          ) {
            throw error(
              "GRAPH_IDENTITY_CONFLICT",
              "One graph target sequence is already bound to different projection content.",
            );
          }
          return true;
        }
        if (batch.outbox.targetSequence < current) {
          throw error(
            "GRAPH_PROJECTION_STALE",
            "A stale graph batch cannot move the Neo4j projection backward.",
          );
        }
        if (batch.outbox.targetSequence !== current + 1) {
          throw error(
            "GRAPH_PROJECTION_GAP",
            "The Neo4j projection cannot advance across a missing target sequence.",
          );
        }

        for (const node of [...batch.nodes].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          await this.#upsertNode(transaction, batch, node);
        }
        for (const relationship of [...batch.relationships].sort((a, b) =>
          a.edgeId.localeCompare(b.edgeId),
        )) {
          await this.#upsertRelationship(transaction, batch, relationship);
        }
        await transaction.run(
          `MATCH (head:PetraProjectionHead {
             project_id: $projectId,
             projection_name: $projectionName,
             projection_version: $projectionVersion,
             configuration_hash: $configurationHash
           })
           SET head.target_sequence = $targetSequence,
               head.last_outbox_id = $outboxId,
               head.last_outbox_position = $outboxPosition,
               head.last_event_id = $eventId,
               head.last_event_position = $eventPosition,
               head.last_stream_revision = $streamRevision,
               head.last_batch_hash = $batchHash
           REMOVE head.lock_token`,
          {
            ...projectionParameters(batch),
            targetSequence: int(batch.outbox.targetSequence),
            outboxId: batch.outbox.outboxId,
            outboxPosition: int(batch.outbox.outboxPosition),
            eventId: batch.outbox.eventId,
            eventPosition: int(batch.outbox.eventPosition),
            streamRevision: int(batch.outbox.streamRevision),
            batchHash,
          },
        );
        return false;
      });
      const bookmarks = session.lastBookmarks();
      return {
        backendKind: "neo4j",
        receipt:
          bookmarks.length === 0
            ? `neo4j:${batch.projectId}:${batch.outbox.targetSequence}`
            : `neo4j:${bookmarks.join(",")}`,
        duplicate,
        targetSequence: batch.outbox.targetSequence,
      };
    } finally {
      await session.close();
    }
  }

  async clearProject(
    projectId: string,
    projection: AuthorityGraphBatch["projection"],
  ): Promise<void> {
    const session = this.#session();
    try {
      await session.executeWrite(async (transaction) => {
        await transaction.run(
          "MATCH ()-[relation]->() WHERE relation.project_id = $projectId DELETE relation",
          { projectId },
        );
        await transaction.run(
          "MATCH (project:PetraNode:Project {petra_id: $projectId}) DETACH DELETE project",
          { projectId },
        );
        await transaction.run(
          `MATCH (head:PetraProjectionHead {
             project_id: $projectId,
             projection_name: $projectionName,
             projection_version: $projectionVersion,
             configuration_hash: $configurationHash
           }) DELETE head`,
          {
            projectId,
            projectionName: projection.projection_name,
            projectionVersion: projection.projection_version,
            configurationHash: projection.configuration_hash,
          },
        );
        await transaction.run(
          `MATCH (node:PetraNode)
           WHERE NOT node:Project
             AND NOT EXISTS {
               MATCH (:PetraNode:Project)-[:PROJECTS]->(node)
             }
           DETACH DELETE node`,
        );
        await transaction.run(
          `MATCH (identity:PetraEdgeIdentity)
           WHERE NOT EXISTS {
             MATCH (:PetraNode)-[relation {petra_edge_id: identity.petra_edge_id}]->(:PetraNode)
           }
           DELETE identity`,
        );
      });
    } finally {
      await session.close();
    }
  }

  async getObject(
    projectId: string,
    id: string,
  ): Promise<AuthorityGraphObjectView | undefined> {
    const session = this.#session();
    try {
      return await session.executeRead(async (transaction) => {
        const nodeResult = await transaction.run(
          `MATCH (node:PetraNode {petra_id: $id})
           WHERE node.petra_id = $projectId OR EXISTS {
             MATCH (:PetraNode:Project {petra_id: $projectId})-[:PROJECTS]->(node)
           }
           RETURN node LIMIT 1`,
          { projectId, id },
        );
        const nodeRecord = nodeResult.records[0];
        if (nodeRecord !== undefined) {
          return asNodeView(recordGet(nodeRecord, "node"));
        }
        const relationshipResult = await transaction.run(
          `MATCH (source:PetraNode)-[relation]->(target:PetraNode)
           WHERE relation.assertion_id = $id
             AND relation.project_id = $projectId
           RETURN relation, source.petra_id AS source_id,
                  target.petra_id AS target_id
           LIMIT 1`,
          { projectId, id },
        );
        const relationshipRecord = relationshipResult.records[0];
        return relationshipRecord === undefined
          ? undefined
          : asRelationshipView(
              recordGet(relationshipRecord, "relation"),
              recordGet(relationshipRecord, "source_id"),
              recordGet(relationshipRecord, "target_id"),
            );
      });
    } finally {
      await session.close();
    }
  }

  async getNeighborhood(
    projectId: string,
    id: string,
    query: AuthorityGraphNeighborhoodQuery = {},
  ): Promise<readonly AuthorityGraphNeighbor[]> {
    const limit = validateLimit(query.limit);
    const direction = query.direction ?? "either";
    if (!(["outgoing", "incoming", "either"] as const).includes(direction)) {
      throw error("GRAPH_QUERY_INVALID", "Unknown graph query direction.");
    }
    const predicates = query.predicates ?? [];
    if (predicates.some((predicate) => !RELATION_TYPES.has(predicate))) {
      throw error("GRAPH_QUERY_INVALID", "Unknown graph predicate filter.");
    }
    const pattern =
      direction === "outgoing"
        ? "(center)-[relation]->(other)"
        : direction === "incoming"
          ? "(center)<-[relation]-(other)"
          : "(center)-[relation]-(other)";
    const session = this.#session();
    try {
      const result = await session.executeRead((transaction) =>
        transaction.run(
          `MATCH (center:PetraNode {petra_id: $id})
           MATCH ${pattern}
           WHERE type(relation) <> 'PROJECTS'
             AND (relation.project_id IS NULL OR relation.project_id = $projectId)
             AND ($predicates = [] OR type(relation) IN $predicates)
             AND EXISTS {
               MATCH (:PetraNode:Project {petra_id: $projectId})-[:PROJECTS]->(other)
             }
           RETURN relation, other,
                  startNode(relation).petra_id AS source_id,
                  endNode(relation).petra_id AS target_id
           ORDER BY type(relation), other.petra_id
           LIMIT $limit`,
          {
            projectId,
            id,
            predicates: [...predicates],
            limit: int(limit),
          },
        ),
      );
      return result.records.map((record) => {
        const relationship = asRelationshipView(
          recordGet(record, "relation"),
          recordGet(record, "source_id"),
          recordGet(record, "target_id"),
        );
        return {
          direction: relationship.sourceId === id ? "outgoing" : "incoming",
          relationship,
          node: asNodeView(recordGet(record, "other")),
        };
      });
    } finally {
      await session.close();
    }
  }

  async getProvenancePath(
    projectId: string,
    assertionId: string,
  ): Promise<AuthorityGraphProvenancePath | undefined> {
    const session = this.#session();
    try {
      const result = await session.executeRead((transaction) =>
        transaction.run(
          `MATCH (workVersion:PetraNode:WorkVersion)-[assertion:ASSERTS {
             assertion_id: $assertionId,
             project_id: $projectId
           }]->(claim:PetraNode:Claim)
           MATCH (workVersion)-[:VERSION_OF]->(work:PetraNode:Work)
           MATCH (claim)-[:GROUNDED_IN]->(span:PetraNode:SourceSpan)
           MATCH (span)-[:LOCATED_IN]->(artifact:PetraNode:Artifact)
           RETURN assertion, workVersion, work, claim,
                  startNode(assertion).petra_id AS assertion_source_id,
                  endNode(assertion).petra_id AS assertion_target_id,
                  collect(DISTINCT span) AS spans,
                  collect(DISTINCT artifact) AS artifacts
           LIMIT 1`,
          { projectId, assertionId },
        ),
      );
      const record = result.records[0];
      if (record === undefined) return undefined;
      const spans = recordGet(record, "spans");
      const artifacts = recordGet(record, "artifacts");
      if (!Array.isArray(spans) || !Array.isArray(artifacts)) {
        throw error(
          "GRAPH_IDENTITY_CONFLICT",
          "Neo4j returned an invalid provenance collection.",
        );
      }
      return {
        assertion: asRelationshipView(
          recordGet(record, "assertion"),
          recordGet(record, "assertion_source_id"),
          recordGet(record, "assertion_target_id"),
        ),
        workVersion: asNodeView(recordGet(record, "workVersion")),
        work: asNodeView(recordGet(record, "work")),
        claim: asNodeView(recordGet(record, "claim")),
        sourceSpans: spans.map(asNodeView),
        artifacts: artifacts.map(asNodeView),
      };
    } finally {
      await session.close();
    }
  }

  async getEvidenceRelations(
    projectId: string,
    claimId: string,
    requestedLimit?: number,
  ): Promise<readonly AuthorityGraphObjectView[]> {
    const limit = validateLimit(requestedLimit);
    const session = this.#session();
    try {
      const result = await session.executeRead((transaction) =>
        transaction.run(
          `MATCH (claim:PetraNode:Claim {petra_id: $claimId})-[relation]-(other:PetraNode)
           WHERE relation.project_id = $projectId
             AND relation.relation_class = 'scientific'
             AND type(relation) IN $predicates
           RETURN relation, startNode(relation).petra_id AS source_id,
                  endNode(relation).petra_id AS target_id
           ORDER BY type(relation), relation.assertion_id
           LIMIT $limit`,
          {
            projectId,
            claimId,
            predicates: [...SCIENTIFIC_RELATIONS],
            limit: int(limit),
          },
        ),
      );
      return result.records.map((record) =>
        asRelationshipView(
          recordGet(record, "relation"),
          recordGet(record, "source_id"),
          recordGet(record, "target_id"),
        ),
      );
    } finally {
      await session.close();
    }
  }

  async getCitationPath(
    projectId: string,
    startWorkId: string,
    endWorkId: string,
    requestedDepth?: number,
  ): Promise<AuthorityGraphCitationPath | undefined> {
    const maxDepth = validateDepth(requestedDepth);
    if (startWorkId === endWorkId) {
      return { workIds: [startWorkId], assertionIds: [], predicates: [] };
    }
    interface QueueItem {
      workIds: string[];
      assertionIds: string[];
      predicates: ("CITES" | "CITES_AS_BACKGROUND")[];
    }
    const queue: QueueItem[] = [
      { workIds: [startWorkId], assertionIds: [], predicates: [] },
    ];
    const visited = new Set([startWorkId]);
    const session = this.#session();
    try {
      while (queue.length > 0) {
        const path = queue.shift();
        if (path === undefined) break;
        if (path.assertionIds.length >= maxDepth) continue;
        const current = path.workIds.at(-1);
        if (current === undefined) continue;
        const result = await session.executeRead((transaction) =>
          transaction.run(
            `MATCH (work:PetraNode:Work {petra_id: $workId})
                   <-[:VERSION_OF]-(version:PetraNode:WorkVersion)
                   -[citation:CITES|CITES_AS_BACKGROUND]->(next:PetraNode:Work)
             WHERE citation.project_id = $projectId
             RETURN next.petra_id AS next_id,
                    citation.assertion_id AS assertion_id,
                    type(citation) AS predicate
             ORDER BY next.petra_id, citation.assertion_id
             LIMIT 100`,
            { projectId, workId: current },
          ),
        );
        for (const record of result.records) {
          const nextId = recordGet(record, "next_id");
          const assertionId = recordGet(record, "assertion_id");
          const predicate = recordGet(record, "predicate");
          if (
            typeof nextId !== "string" ||
            typeof assertionId !== "string" ||
            (predicate !== "CITES" && predicate !== "CITES_AS_BACKGROUND")
          ) {
            throw error(
              "GRAPH_IDENTITY_CONFLICT",
              "Neo4j returned an invalid citation step.",
            );
          }
          const candidate: QueueItem = {
            workIds: [...path.workIds, nextId],
            assertionIds: [...path.assertionIds, assertionId],
            predicates: [...path.predicates, predicate],
          };
          if (nextId === endWorkId) return candidate;
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(candidate);
          }
        }
      }
      return undefined;
    } finally {
      await session.close();
    }
  }

  async getFreshness(
    projectId: string,
    projection: AuthorityGraphBatch["projection"],
    observedTargetSequence: number,
  ): Promise<AuthorityGraphFreshness> {
    if (
      !Number.isSafeInteger(observedTargetSequence) ||
      observedTargetSequence < 0
    ) {
      throw error(
        "GRAPH_QUERY_INVALID",
        "Observed target sequence must be a non-negative safe integer.",
      );
    }
    const session = this.#session();
    try {
      const result = await session.executeRead((transaction) =>
        transaction.run(
          `OPTIONAL MATCH (head:PetraProjectionHead {
             project_id: $projectId,
             projection_name: $projectionName,
             projection_version: $projectionVersion,
             configuration_hash: $configurationHash
           })
           RETURN coalesce(head.target_sequence, 0) AS target_sequence,
                  head.last_event_id AS event_id,
                  head.last_stream_revision AS stream_revision`,
          {
            projectId,
            projectionName: projection.projection_name,
            projectionVersion: projection.projection_version,
            configurationHash: projection.configuration_hash,
          },
        ),
      );
      const record = result.records[0];
      if (record === undefined) {
        throw error(
          "GRAPH_IDENTITY_CONFLICT",
          "Neo4j did not return projection freshness.",
        );
      }
      const projectedTargetSequence = nativeNumber(
        recordGet(record, "target_sequence"),
        "Projected target sequence",
      );
      const pendingRecords = observedTargetSequence - projectedTargetSequence;
      const eventId = recordGet(record, "event_id");
      const streamRevision = recordGet(record, "stream_revision");
      return {
        projectId,
        projection: structuredClone(projection),
        projectedTargetSequence,
        ...(typeof eventId === "string" ? { projectedEventId: eventId } : {}),
        ...(streamRevision === null || streamRevision === undefined
          ? {}
          : {
              projectedStreamRevision: nativeNumber(
                streamRevision,
                "Projected stream revision",
              ),
            }),
        observedTargetSequence,
        pendingRecords,
        state:
          pendingRecords === 0
            ? "current"
            : pendingRecords > 0
              ? "catching_up"
              : "ahead_invalid",
      };
    } finally {
      await session.close();
    }
  }

  async #upsertNode(
    transaction: ManagedTransaction,
    batch: AuthorityGraphBatch,
    node: AuthorityGraphNode,
  ): Promise<void> {
    const existing = await transaction.run(
      `MERGE (node:PetraNode {petra_id: $id})
       ON CREATE SET node.authoritative_revision = 0,
                     node.record_hash = '',
                     node.kind = $kind
       SET node.lock_token = $lockToken
       RETURN node.authoritative_revision AS revision,
              node.record_hash AS record_hash,
              node.kind AS kind`,
      { id: node.id, kind: node.kind, lockToken: randomUUID() },
    );
    const record = existing.records[0];
    if (record === undefined) {
      throw error("GRAPH_IDENTITY_CONFLICT", "Node preflight returned no row.");
    }
    const revisionValue = recordGet(record, "revision");
    if (revisionValue !== null) {
      const revision = nativeNumber(revisionValue, "Node revision");
      if (revision > node.authoritativeRevision) {
        throw error(
          "GRAPH_PROJECTION_STALE",
          `Node ${node.id} already has newer authoritative revision ${revision}.`,
        );
      }
      if (
        recordGet(record, "kind") !== node.kind ||
        (revision === node.authoritativeRevision &&
          recordGet(record, "record_hash") !== node.recordHash)
      ) {
        throw error(
          "GRAPH_IDENTITY_CONFLICT",
          `Node ${node.id} is already bound to different authoritative content.`,
        );
      }
    }
    const properties = {
      ...storedProperties(node.properties),
      petra_id: node.id,
      kind: node.kind,
      authoritative_revision: int(node.authoritativeRevision),
      record_hash: node.recordHash,
      projection_name: batch.projection.projection_name,
      projection_version: batch.projection.projection_version,
      projection_configuration_hash: batch.projection.configuration_hash,
    };
    await transaction.run(
      `MERGE (node:PetraNode {petra_id: $id})
       SET node:${node.kind}
       SET node = $properties`,
      { id: node.id, properties },
    );
  }

  async #upsertRelationship(
    transaction: ManagedTransaction,
    batch: AuthorityGraphBatch,
    relationship: AuthorityGraphRelationship,
  ): Promise<void> {
    const existing = await transaction.run(
      `MERGE (identity:PetraEdgeIdentity {petra_edge_id: $edgeId})
       ON CREATE SET identity.authoritative_revision = 0,
                     identity.record_hash = '',
                     identity.predicate = $predicate,
                     identity.source_id = $sourceId,
                     identity.target_id = $targetId
       SET identity.lock_token = $lockToken
       RETURN identity.authoritative_revision AS revision,
              identity.record_hash AS record_hash,
              identity.predicate AS predicate,
              identity.source_id AS source_id,
              identity.target_id AS target_id`,
      {
        edgeId: relationship.edgeId,
        predicate: relationship.predicate,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        lockToken: randomUUID(),
      },
    );
    const record = existing.records[0];
    if (record === undefined) {
      throw error(
        "GRAPH_IDENTITY_CONFLICT",
        "Relationship preflight returned no row.",
      );
    }
    const revisionValue = recordGet(record, "revision");
    if (revisionValue !== null) {
      const revision = nativeNumber(revisionValue, "Relationship revision");
      if (revision > relationship.authoritativeRevision) {
        throw error(
          "GRAPH_PROJECTION_STALE",
          `Relationship ${relationship.edgeId} already has newer authoritative revision ${revision}.`,
        );
      }
      if (
        (revision !== 0 &&
          recordGet(record, "predicate") !== relationship.predicate) ||
        (revision !== 0 &&
          recordGet(record, "source_id") !== relationship.sourceId) ||
        (revision !== 0 &&
          recordGet(record, "target_id") !== relationship.targetId) ||
        (revision === relationship.authoritativeRevision &&
          recordGet(record, "record_hash") !== relationship.recordHash)
      ) {
        throw error(
          "GRAPH_IDENTITY_CONFLICT",
          `Relationship ${relationship.edgeId} is already bound to different authoritative content.`,
        );
      }
    }
    const properties = {
      ...storedProperties(relationship.properties),
      petra_edge_id: relationship.edgeId,
      ...(relationship.assertionId === undefined
        ? {}
        : { assertion_id: relationship.assertionId }),
      relation_class: relationship.relationClass,
      authoritative_revision: int(relationship.authoritativeRevision),
      record_hash: relationship.recordHash,
      projection_name: batch.projection.projection_name,
      projection_version: batch.projection.projection_version,
      projection_configuration_hash: batch.projection.configuration_hash,
    };
    await transaction.run(
      `MATCH (source:PetraNode {petra_id: $sourceId})
       MATCH (target:PetraNode {petra_id: $targetId})
       MERGE (source)-[relation:${relationship.predicate} {petra_edge_id: $edgeId}]->(target)
       SET relation = $properties`,
      {
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        edgeId: relationship.edgeId,
        properties,
      },
    );
    await transaction.run(
      `MATCH (identity:PetraEdgeIdentity {petra_edge_id: $edgeId})
       SET identity.authoritative_revision = $revision,
           identity.record_hash = $recordHash,
           identity.predicate = $predicate,
           identity.source_id = $sourceId,
           identity.target_id = $targetId
       REMOVE identity.lock_token`,
      {
        edgeId: relationship.edgeId,
        revision: int(relationship.authoritativeRevision),
        recordHash: relationship.recordHash,
        predicate: relationship.predicate,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
      },
    );
  }

  #session() {
    return this.#driver.session(
      this.#database === undefined ? {} : { database: this.#database },
    );
  }
}
