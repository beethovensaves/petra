import type { AssertionPredicate, ProjectionIdentity } from "@petra/contracts";

export type AuthorityGraphNodeKind =
  "Project" | "Work" | "WorkVersion" | "Artifact" | "SourceSpan" | "Claim";

export type ProjectionStructuralPredicate =
  "PROJECTS" | "VERSION_OF" | "REPRESENTED_BY" | "LOCATED_IN" | "GROUNDED_IN";

export type AuthorityGraphPredicate =
  AssertionPredicate | ProjectionStructuralPredicate;

export type AuthorityGraphRelationClass =
  | "projection_scope"
  | "structural"
  | "provenance"
  | "bibliographic"
  | "representation"
  | "scientific";

export type GraphProperty =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | readonly boolean[];

export interface AuthorityGraphNode {
  id: string;
  kind: AuthorityGraphNodeKind;
  authoritativeRevision: number;
  recordHash: string;
  properties: Readonly<Record<string, GraphProperty>>;
}

export interface AuthorityGraphRelationship {
  edgeId: string;
  predicate: AuthorityGraphPredicate;
  relationClass: AuthorityGraphRelationClass;
  sourceId: string;
  targetId: string;
  authoritativeRevision: number;
  recordHash: string;
  assertionId?: string;
  properties: Readonly<Record<string, GraphProperty>>;
}

export interface AuthorityGraphRelationshipRemoval {
  edgeId: string;
  expectedAuthoritativeRevision: number;
  tombstoneRevision: number;
  recordHash: string;
}

export interface AuthorityGraphOutboxReference {
  outboxId: string;
  outboxPosition: number;
  targetSequence: number;
  eventId: string;
  eventPosition: number;
  streamRevision: number;
}

export interface AuthorityGraphBatch {
  projectId: string;
  projection: ProjectionIdentity;
  sourceEventId: string;
  outbox: AuthorityGraphOutboxReference;
  nodes: readonly AuthorityGraphNode[];
  relationships: readonly AuthorityGraphRelationship[];
  removals?: readonly AuthorityGraphRelationshipRemoval[];
}

export interface GraphCommitReceipt {
  backendKind: "neo4j";
  receipt: string;
  duplicate: boolean;
  targetSequence: number;
}

export interface AuthorityGraphObjectView {
  elementKind: "node" | "relationship";
  id: string;
  kind: AuthorityGraphNodeKind | AuthorityGraphPredicate;
  authoritativeRevision: number;
  recordHash: string;
  projectId?: string;
  sourceId?: string;
  targetId?: string;
  assertionId?: string;
  relationClass?: AuthorityGraphRelationClass;
  properties: Readonly<Record<string, GraphProperty>>;
}

export interface AuthorityGraphNeighbor {
  direction: "outgoing" | "incoming";
  relationship: AuthorityGraphObjectView;
  node: AuthorityGraphObjectView;
}

export interface AuthorityGraphNeighborhoodQuery {
  direction?: "outgoing" | "incoming" | "either";
  predicates?: readonly AuthorityGraphPredicate[];
  limit?: number;
}

export interface AuthorityGraphRelationshipQuery {
  predicates?: readonly AuthorityGraphPredicate[];
  limit?: number;
}

export interface AuthorityGraphProvenancePath {
  assertion: AuthorityGraphObjectView;
  work: AuthorityGraphObjectView;
  workVersion: AuthorityGraphObjectView;
  claim: AuthorityGraphObjectView;
  sourceSpans: readonly AuthorityGraphObjectView[];
  artifacts: readonly AuthorityGraphObjectView[];
}

export interface AuthorityGraphCitationPath {
  workIds: readonly string[];
  assertionIds: readonly string[];
  predicates: readonly ("CITES" | "CITES_AS_BACKGROUND")[];
}

export interface AuthorityGraphFreshness {
  projectId: string;
  projection: ProjectionIdentity;
  projectedTargetSequence: number;
  projectedEventId?: string;
  projectedStreamRevision?: number;
  observedTargetSequence: number;
  pendingRecords: number;
  state: "current" | "catching_up" | "ahead_invalid";
}

/**
 * Rebuildable graph read-model boundary. Implementations may mutate only
 * derived graph state supplied by the authoritative outbox projector.
 */
export interface AuthorityGraphStore {
  prepare(): Promise<void>;
  apply(batch: AuthorityGraphBatch): Promise<GraphCommitReceipt>;
  clearProject(
    projectId: string,
    projection: ProjectionIdentity,
  ): Promise<void>;
  getObject(
    projectId: string,
    id: string,
  ): Promise<AuthorityGraphObjectView | undefined>;
  getNeighborhood(
    projectId: string,
    id: string,
    query?: AuthorityGraphNeighborhoodQuery,
  ): Promise<readonly AuthorityGraphNeighbor[]>;
  getProjectRelationships(
    projectId: string,
    query?: AuthorityGraphRelationshipQuery,
  ): Promise<readonly AuthorityGraphObjectView[]>;
  getProvenancePath(
    projectId: string,
    assertionId: string,
  ): Promise<AuthorityGraphProvenancePath | undefined>;
  getEvidenceRelations(
    projectId: string,
    claimId: string,
    limit?: number,
  ): Promise<readonly AuthorityGraphObjectView[]>;
  getCitationPath(
    projectId: string,
    startWorkId: string,
    endWorkId: string,
    maxDepth?: number,
  ): Promise<AuthorityGraphCitationPath | undefined>;
  getFreshness(
    projectId: string,
    projection: ProjectionIdentity,
    observedTargetSequence: number,
  ): Promise<AuthorityGraphFreshness>;
}

export type AuthorityGraphStoreErrorCode =
  | "GRAPH_BATCH_INVALID"
  | "GRAPH_IDENTITY_CONFLICT"
  | "GRAPH_PROJECTION_STALE"
  | "GRAPH_PROJECTION_GAP"
  | "GRAPH_QUERY_INVALID";

export class AuthorityGraphStoreError extends Error {
  readonly code: AuthorityGraphStoreErrorCode;

  constructor(code: AuthorityGraphStoreErrorCode, message: string) {
    super(message);
    this.name = "AuthorityGraphStoreError";
    this.code = code;
  }
}
