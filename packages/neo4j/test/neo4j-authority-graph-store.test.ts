import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraClaim,
  PetraCommandEnvelope,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectSource,
  PetraProjectionCheckpoint,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
  ProjectionIdentity,
} from "@petra/contracts";
import {
  RepositoryAuthorityGraphProjectionSource,
  ScientificGraphProjector,
  buildCompensatingReversalCommandPlan,
  buildAuthorityGraphBatch,
  executeCompensatingReversalPlan,
  type ArtifactStore,
  type AuthorityGraphNode,
  type AuthorityGraphRelationship,
  type AuthorityGraphStoreError,
  type DomainRecordFactory,
  type PersistDocumentBundleInput,
  type PersistVerifiedArtifactInput,
} from "@petra/core";
import {
  PostgresArtifactAuthorityRepository,
  PostgresChangeControlAuthorityRepository,
  PostgresDocumentAuthorityRepository,
  PostgresEvidenceAuthorityRepository,
  PostgresGraphProjectionAuthorityRepository,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectRelationshipViewReader,
  PostgresProjectSourceAuthorityRepository,
  PostgresResearchScopeRepository,
  PostgresScholarlyIdentityRepository,
} from "@petra/postgres";
import { canonicalize } from "json-canonicalize";
import neo4j from "neo4j-driver";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Neo4jAuthorityGraphStore } from "../src/neo4j-authority-graph-store.js";

const { Pool } = pg;
const postgresUrl = process.env.PETRA_TEST_POSTGRES_URL;
const neo4jUri = process.env.PETRA_TEST_NEO4J_URI;
const describeServices =
  postgresUrl === undefined || neo4jUri === undefined
    ? describe.skip
    : describe;

const readFixture = <Value>(name: string): Value =>
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

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBH",
  actor_kind: "service",
  display_name: "Petra graph projector",
  created_at: "2026-09-02T19:00:00.000Z",
});

const modelActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "model",
  display_name: "Petra extraction model",
  created_at: "2026-08-28T18:00:01.000Z",
});

const availableArtifactStore: Pick<ArtifactStore, "inspectByHash"> = {
  inspectByHash: (contentHash, expected) =>
    Promise.resolve(
      expected === undefined
        ? undefined
        : {
            contentHash,
            byteSize: expected.byteSize,
            mediaType: expected.mediaType,
            storeName: "petra-local",
            objectKey: `sha256/${contentHash.slice(7, 9)}/${contentHash.slice(9)}`,
            availableAt: "2026-08-28T18:10:00.000Z",
            verification: {
              status: "verified",
              declaredMediaType: expected.mediaType,
              observedMediaType: expected.mediaType,
              method: "integration-authority-fixture",
              problems: [],
            },
          },
    ),
};

const sourceArtifactInput = (): PersistVerifiedArtifactInput => {
  const artifact = readFixture<PetraArtifact>("artifact");
  const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
  const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
  artifact.created_by.actor_kind = "human";
  manifest.recorded_by.actor_kind = "human";
  rightsDecision.decision_maker.actor_kind = "human";
  return { artifact, manifest, rightsDecision };
};

const parserArtifactInput = (
  source: PersistVerifiedArtifactInput,
): PersistVerifiedArtifactInput => {
  const parserBytes = new TextEncoder().encode('{"parser":"output"}');
  const parserHash = `sha256:${createHash("sha256")
    .update(parserBytes)
    .digest("hex")}`;
  const artifact = structuredClone(source.artifact);
  artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
  artifact.artifact_kind = "structured_text";
  artifact.media_type = "application/json";
  artifact.content_hash = parserHash;
  artifact.byte_size = parserBytes.byteLength;
  artifact.created_at = "2026-08-28T18:11:02.000Z";

  const manifest = structuredClone(source.manifest);
  manifest.artifact_manifest_id =
    "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
  manifest.artifact_id = artifact.artifact_id;
  manifest.rights_decision_id = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
  manifest.origin = {
    origin_kind: "generated",
    generator_name: "petra-docling-adapter",
    generator_version: "1.0.0",
    generated_at: "2026-08-28T18:11:02.000Z",
    input_artifact_ids: [source.artifact.artifact_id],
  };
  manifest.storage_ref.object_key = `sha256/${parserHash.slice(7, 9)}/${parserHash.slice(9)}`;
  manifest.storage_ref.content_hash = parserHash;
  manifest.storage_ref.verified_at = "2026-08-28T18:11:02.000Z";
  manifest.integrity.checked_at = "2026-08-28T18:11:02.000Z";
  manifest.recorded_at = "2026-08-28T18:11:02.000Z";

  const rightsDecision = structuredClone(source.rightsDecision);
  rightsDecision.rights_decision_id = manifest.rights_decision_id;
  rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
  rightsDecision.source_location =
    "urn:petra:parser-output:01ARZ3NDEKTSV4RRFFQ69G5FB8";
  rightsDecision.observed_license = {
    statement:
      "Petra-generated parser output retained under source-copy terms.",
    source: "artifact",
  };
  rightsDecision.access_basis = "permission";
  rightsDecision.authorization_reference = "petra-local-processing/1.0.0";
  rightsDecision.observed_at = "2026-08-28T18:11:02.000Z";
  rightsDecision.created_at = "2026-08-28T18:11:02.000Z";
  return { artifact, manifest, rightsDecision };
};

const documentBundle = (
  sourceArtifactManifestId: string,
): PersistDocumentBundleInput => {
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const block = readFixture<PetraStructuralBlock>("structural-block");
  const span = readFixture<PetraSourceSpan>("source-span");
  document.created_by.actor_kind = "human";
  span.created_by.actor_kind = "human";
  return {
    sourceArtifactManifestId,
    document,
    blocks: [block],
    spans: [span],
  };
};

const claimFixture = (): PetraClaim => {
  const claim = readFixture<PetraClaim>("claim");
  claim.created_by = {
    actor_id: modelActor().actor_id,
    actor_kind: "model",
  };
  if (claim.basis.basis_kind !== "source") {
    throw new Error("Expected source-derived Claim fixture.");
  }
  claim.basis.proposed_by = structuredClone(claim.created_by);
  return claim;
};

const assertionFixture = (): PetraAssertion => {
  const assertion = readFixture<PetraAssertion>("assertion");
  assertion.created_by = {
    actor_id: modelActor().actor_id,
    actor_kind: "model",
  };
  return assertion;
};

interface CommandFixtureSet {
  submit: PetraCommandEnvelope;
  approve: PetraCommandEnvelope;
  apply: PetraCommandEnvelope;
}

const commandFixtures = (): CommandFixtureSet => {
  const submit = readFixture<PetraCommandEnvelope>("command-submit-change-set");
  if (submit.command.command_name !== "SubmitChangeSet") {
    throw new Error("Expected SubmitChangeSet fixture.");
  }
  submit.actor = {
    actor_id: modelActor().actor_id,
    actor_kind: "model",
  };
  submit.command.change_set.content.proposed_by = structuredClone(submit.actor);
  submit.command.change_set.content_hash = hash(
    submit.command.change_set.content,
  );

  const approve = readFixture<PetraCommandEnvelope>("command-record-approval");
  if (approve.command.command_name !== "RecordApproval") {
    throw new Error("Expected RecordApproval fixture.");
  }
  approve.command.approval.subject.change_set_content_hash =
    submit.command.change_set.content_hash;

  const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
  if (apply.command.command_name !== "ApplyChangeSet") {
    throw new Error("Expected ApplyChangeSet fixture.");
  }
  apply.command.change_set_content_hash =
    submit.command.change_set.content_hash;
  return { submit, approve, apply };
};

const domainFactory = (): DomainRecordFactory => {
  let eventIndex = 0;
  let outboxIndex = 0;
  return {
    nextId: (kind) => {
      if (kind === "event") {
        eventIndex += 1;
        return `event_01ARZ3NDEKTSV4RRFFQ69G5F${String(eventIndex).padStart(2, "0")}`;
      }
      outboxIndex += 1;
      return `outbox_01ARZ3NDEKTSV4RRFFQ69G5F${String(outboxIndex + 20).padStart(2, "0")}`;
    },
    now: () => "2026-09-02T19:00:01.000Z",
  };
};

const projection: ProjectionIdentity = {
  target: "neo4j_graph",
  projection_name: "petra.authority_graph",
  projection_version: "1.0.0",
  configuration_hash: `sha256:${"a".repeat(64)}`,
};

describe("Neo4j graph query bounds", () => {
  it("rejects an invalid neighborhood limit before opening a session", async () => {
    const offlineDriver = neo4j.driver(
      "bolt://127.0.0.1:1",
      neo4j.auth.basic("neo4j", "not-used"),
    );
    const offline = new Neo4jAuthorityGraphStore({ driver: offlineDriver });
    await expect(
      offline.getNeighborhood(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
        { limit: 101 },
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "GRAPH_QUERY_INVALID" }));
    await offlineDriver.close();
  });

  it("rejects an invalid observed position before opening a session", async () => {
    const offlineDriver = neo4j.driver(
      "bolt://127.0.0.1:1",
      neo4j.auth.basic("neo4j", "not-used"),
    );
    const offline = new Neo4jAuthorityGraphStore({ driver: offlineDriver });
    await expect(
      offline.getFreshness(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        projection,
        -1,
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "GRAPH_QUERY_INVALID" }));
    await offlineDriver.close();
  });

  it("rejects an invalid Project relationship predicate before opening a session", async () => {
    const offlineDriver = neo4j.driver(
      "bolt://127.0.0.1:1",
      neo4j.auth.basic("neo4j", "not-used"),
    );
    const offline = new Neo4jAuthorityGraphStore({ driver: offlineDriver });
    await expect(
      offline.getProjectRelationships("project_01ARZ3NDEKTSV4RRFFQ69G5FAW", {
        predicates: ["NOT_A_PREDICATE" as "ASSERTS"],
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "GRAPH_QUERY_INVALID" }));
    await offlineDriver.close();
  });
});

describeServices("Neo4j authority graph with PostgreSQL traceability", () => {
  const pool = new Pool({ connectionString: postgresUrl });
  const driver = neo4j.driver(
    neo4jUri ?? "bolt://127.0.0.1:1",
    neo4j.auth.basic(
      process.env.PETRA_TEST_NEO4J_USER ?? "neo4j",
      process.env.PETRA_TEST_NEO4J_PASSWORD ?? "petra-integration-only",
    ),
  );
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const projectSources = new PostgresProjectSourceAuthorityRepository(pool);
  const projectionAuthority = new PostgresGraphProjectionAuthorityRepository(
    pool,
  );
  const graph = new Neo4jAuthorityGraphStore({ driver });
  const relationshipViews = new PostgresProjectRelationshipViewReader(
    pool,
    graph,
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await graph.prepare();
  });

  afterAll(async () => {
    await Promise.all([pool.end(), driver.close()]);
  });

  it("projects, queries, rejects stale state, and rebuilds exact assertion identities", async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await pool.query(
      `UPDATE petra.authority_positions
          SET event_position = 0, outbox_position = 0
        WHERE singleton`,
    );
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(modelActor());
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await definitions.registerDefinitionRevision(
      readFixture<PetraProjectDefinition>("project-definition-scientific"),
    );
    await definitions.registerObjectiveRevision(
      readFixture<PetraProjectObjective>("project-objective"),
    );
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
    const sourceArtifact = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(sourceArtifact);
    await artifacts.registerVerifiedAcquisition(
      parserArtifactInput(sourceArtifact),
    );
    await documents.registerDocumentBundle(
      documentBundle(sourceArtifact.manifest.artifact_manifest_id),
    );
    const projectSource = readFixture<PetraProjectSource>("project-source");
    projectSource.content.artifact_manifest_ref.record_hash = hash(
      sourceArtifact.manifest,
    );
    projectSource.content_hash = hash(projectSource.content);
    await projectSources.registerProjectSourceRevision(projectSource);
    await evidence.proposeClaim(claimFixture());
    await evidence.proposeAssertion(assertionFixture());

    const commands = commandFixtures();
    const changeControl = new PostgresChangeControlAuthorityRepository(
      pool,
      { authorize: () => true },
      domainFactory(),
    );
    await changeControl.executeCommand(commands.submit);
    await changeControl.executeCommand(commands.approve);
    await changeControl.executeCommand(commands.apply);
    const outbox = (
      await changeControl.getOutboxRecords({
        projectId: commands.submit.project_id,
        target: "neo4j_graph",
      })
    )[0];
    if (outbox === undefined) throw new Error("Expected graph outbox record.");

    const checkpoint = readFixture<PetraProjectionCheckpoint>(
      "projection-checkpoint-catching-up",
    );
    checkpoint.projection = structuredClone(projection);
    checkpoint.recorded_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    checkpoint.recorded_at = "2026-09-02T19:00:02.000Z";
    checkpoint.content.observed_head = {
      outbox_id: outbox.outbox_id,
      outbox_position: outbox.outbox_position,
      target_sequence: outbox.target_sequence,
      event_id: outbox.message.event.event_id,
      event_position: outbox.message.event.event_position,
      stream_revision: outbox.message.event.stream_revision,
      observed_at: checkpoint.recorded_at,
    };
    checkpoint.content_hash = hash(checkpoint.content);
    await projectionAuthority.register(checkpoint);

    const source = new RepositoryAuthorityGraphProjectionSource({
      researchScope: scopes,
      scholarlyIdentity: identities,
      artifacts,
      documents,
      evidence,
    });
    let projectionRecordIndex = 0;
    let clockIndex = 0;
    const projector = new ScientificGraphProjector({
      authority: projectionAuthority,
      source,
      graph,
      factory: {
        nextProjectionRecordId: () =>
          `graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5F${String(40 + ++projectionRecordIndex).padStart(2, "0")}`,
        now: () =>
          `2026-09-02T19:00:${String(2 + ++clockIndex).padStart(2, "0")}.000Z`,
        serviceActor: {
          actor_id: serviceActor().actor_id,
          actor_kind: "service",
        },
      },
    });

    const projected = await projector.project(
      checkpoint.projection_checkpoint_id,
      outbox,
    );
    expect(projected.checkpoint.content.position.target_sequence).toBe(1);
    expect(projected.checkpoint.content.freshness.state).toBe("current");
    expect(projected.record?.content.outcome.outcome_kind).toBe("applied");
    expect(
      await projector.project(checkpoint.projection_checkpoint_id, outbox),
    ).toEqual(expect.objectContaining({ replayed: true }));

    const event = outbox.message.event;
    if (event.event.event_type !== "change_set.applied") {
      throw new Error("Expected applied graph event.");
    }
    const appliedPayload = event.event.payload;
    const trustedAssertion = await evidence.getAssertion(
      appliedPayload.assertion.assertion_id,
      appliedPayload.assertion.revision,
    );
    const assertionView = await graph.getObject(
      event.project_id,
      appliedPayload.assertion.assertion_id,
    );
    expect(assertionView).toEqual(
      expect.objectContaining({
        elementKind: "relationship",
        kind: "ASSERTS",
        authoritativeRevision: 2,
        recordHash: hash(trustedAssertion),
        relationClass: "representation",
      }),
    );
    expect(assertionView?.properties).toEqual(
      expect.objectContaining({
        authority_zone: "trusted",
        review_state: "human_accepted",
      }),
    );

    const provenance = await graph.getProvenancePath(
      event.project_id,
      appliedPayload.assertion.assertion_id,
    );
    expect(provenance?.assertion.kind).toBe("ASSERTS");
    expect(provenance?.work.kind).toBe("Work");
    expect(provenance?.workVersion.kind).toBe("WorkVersion");
    expect(provenance?.claim.kind).toBe("Claim");
    expect(provenance?.sourceSpans).toHaveLength(1);
    expect(provenance?.artifacts).toHaveLength(1);
    expect(provenance?.sourceSpans[0]?.properties).not.toHaveProperty(
      "exact_text",
    );
    expect(
      await graph.getProjectRelationships(event.project_id, {
        predicates: ["ASSERTS"],
        limit: 1,
      }),
    ).toEqual([
      expect.objectContaining({
        id: appliedPayload.assertion.assertion_id,
        kind: "ASSERTS",
        projectId: event.project_id,
      }),
    ]);
    expect(
      await graph.getProjectRelationships(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FB0",
        { predicates: ["ASSERTS"], limit: 1 },
      ),
    ).toEqual([]);
    const relationshipView = await relationshipViews.getProjectRelationshipView(
      event.project_id,
    );
    expect(relationshipView?.project_id).toBe(event.project_id);
    expect(relationshipView?.content.layer).toBe("current");
    expect(relationshipView?.content.capabilities).toEqual({
      current: "available",
      working: "unavailable",
      historical: "unavailable",
      comparison: "unavailable",
      expansion: "unavailable",
      continuation: "unavailable",
      text_peer: "available",
    });
    expect(relationshipView?.content.nodes).toHaveLength(5);
    expect(relationshipView?.content.relationships).toHaveLength(4);
    expect(relationshipView?.content.query.focus_ref.record_id).toBe(
      appliedPayload.assertion.assertion_id,
    );
    expect(
      relationshipView?.content.nodes.find(
        (node) => node.object_kind === "source_span",
      )?.source_destination,
    ).toEqual(
      expect.objectContaining({
        project_source_id: projectSource.project_source_id,
        status: "active",
      }),
    );
    const neighborhood = await graph.getNeighborhood(
      event.project_id,
      appliedPayload.claim.claim_id,
      { limit: 10 },
    );
    expect(
      neighborhood.map((neighbor) => [
        neighbor.direction,
        neighbor.relationship.kind,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["incoming", "ASSERTS"],
        ["outgoing", "GROUNDED_IN"],
      ]),
    );
    expect(await graph.getFreshness(event.project_id, projection, 1)).toEqual(
      expect.objectContaining({ state: "current", pendingRecords: 0 }),
    );
    expect(await graph.getFreshness(event.project_id, projection, 2)).toEqual(
      expect.objectContaining({ state: "catching_up", pendingRecords: 1 }),
    );

    const targetWork = structuredClone(readFixture<PetraWork>("work"));
    targetWork.work_id = "work_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    targetWork.title = "A cited competing account";
    await identities.registerWorkRevision(targetWork);

    const citedClaim = claimFixture();
    citedClaim.claim_id = "claim_01ARZ3NDEKTSV4RRFFQ69G5FD2";
    citedClaim.canonical_text = "A second scoped proposition.";
    await evidence.proposeClaim(citedClaim);

    const citation = assertionFixture();
    citation.assertion_id = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FD1";
    citation.predicate = "CITES";
    citation.object = { object_kind: "entity", entity_id: targetWork.work_id };
    citation.assertion_kind = "source_native";
    citation.rationale = "The source records a citation to the target Work.";
    await evidence.proposeAssertion(citation);

    const support = assertionFixture();
    support.assertion_id = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FD3";
    support.subject_id = appliedPayload.claim.claim_id;
    support.predicate = "SUPPORTS";
    support.object = { object_kind: "entity", entity_id: citedClaim.claim_id };
    support.assertion_kind = "model_inference";
    support.scope_comparison = {
      relation: "aligned",
      rationale: "Both fixtures use the same explicit scientific scope.",
    };
    support.rationale = "Test-only proposed scientific relation.";
    await evidence.proposeAssertion(support);

    const material = await source.load(outbox);
    const second = structuredClone(
      buildAuthorityGraphBatch(projection, outbox, material),
    );
    second.sourceEventId = "event_01ARZ3NDEKTSV4RRFFQ69G5FD4";
    second.outbox = {
      outboxId: "outbox_01ARZ3NDEKTSV4RRFFQ69G5FD5",
      outboxPosition: outbox.outbox_position + 1,
      targetSequence: 2,
      eventId: second.sourceEventId,
      eventPosition: outbox.message.event.event_position + 1,
      streamRevision: outbox.message.event.stream_revision + 1,
    };
    const extraNodes: AuthorityGraphNode[] = [
      {
        id: targetWork.work_id,
        kind: "Work",
        authoritativeRevision: targetWork.revision,
        recordHash: hash(targetWork),
        properties: {
          title: targetWork.title,
          work_kind: targetWork.work_kind,
          identity_status: targetWork.identity_status,
        },
      },
      {
        id: citedClaim.claim_id,
        kind: "Claim",
        authoritativeRevision: citedClaim.revision,
        recordHash: hash(citedClaim),
        properties: {
          canonical_text: citedClaim.canonical_text,
          claim_kind: citedClaim.claim_kind,
          authority_zone: citedClaim.authority.zone,
          review_state: citedClaim.authority.review_state,
        },
      },
    ];
    const extraRelationships: AuthorityGraphRelationship[] = [
      ...extraNodes.map((node): AuthorityGraphRelationship => ({
        edgeId: `project:${event.project_id}:projects:${node.id}`,
        predicate: "PROJECTS",
        relationClass: "projection_scope",
        sourceId: event.project_id,
        targetId: node.id,
        authoritativeRevision: second.outbox.streamRevision,
        recordHash: hash({
          projectId: event.project_id,
          node: node.recordHash,
        }),
        properties: { project_id: event.project_id },
      })),
      {
        edgeId: citation.assertion_id,
        assertionId: citation.assertion_id,
        predicate: "CITES",
        relationClass: "bibliographic",
        sourceId: citation.subject_id,
        targetId: targetWork.work_id,
        authoritativeRevision: citation.revision,
        recordHash: hash(citation),
        properties: {
          project_id: event.project_id,
          authority_zone: citation.authority.zone,
          review_state: citation.authority.review_state,
          assertion_kind: citation.assertion_kind,
        },
      },
      {
        edgeId: support.assertion_id,
        assertionId: support.assertion_id,
        predicate: "SUPPORTS",
        relationClass: "scientific",
        sourceId: support.subject_id,
        targetId: citedClaim.claim_id,
        authoritativeRevision: support.revision,
        recordHash: hash(support),
        properties: {
          project_id: event.project_id,
          authority_zone: support.authority.zone,
          review_state: support.authority.review_state,
          assertion_kind: support.assertion_kind,
        },
      },
    ];
    second.nodes = [...second.nodes, ...extraNodes];
    second.relationships = [...second.relationships, ...extraRelationships];
    await expect(graph.apply(second)).resolves.toEqual(
      expect.objectContaining({ targetSequence: 2, duplicate: false }),
    );

    expect(
      await graph.getCitationPath(
        event.project_id,
        material.work.work_id,
        targetWork.work_id,
        1,
      ),
    ).toEqual({
      workIds: [material.work.work_id, targetWork.work_id],
      assertionIds: [citation.assertion_id],
      predicates: ["CITES"],
    });
    expect(
      await graph.getEvidenceRelations(
        event.project_id,
        appliedPayload.claim.claim_id,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "SUPPORTS",
        assertionId: support.assertion_id,
        recordHash: hash(await evidence.getAssertion(support.assertion_id)),
      }),
    ]);
    expect(
      await graph.getObject(event.project_id, citation.assertion_id),
    ).toEqual(
      expect.objectContaining({
        kind: "CITES",
        relationClass: "bibliographic",
        recordHash: hash(await evidence.getAssertion(citation.assertion_id)),
      }),
    );
    expect(await graph.getFreshness(event.project_id, projection, 1)).toEqual(
      expect.objectContaining({ state: "ahead_invalid", pendingRecords: -1 }),
    );

    const stale = structuredClone(second);
    stale.sourceEventId = "event_01ARZ3NDEKTSV4RRFFQ69G5FD6";
    stale.outbox = {
      ...stale.outbox,
      outboxId: "outbox_01ARZ3NDEKTSV4RRFFQ69G5FD7",
      targetSequence: 3,
      eventId: stale.sourceEventId,
    };
    const staleClaim = stale.nodes.find(
      (node) => node.id === appliedPayload.claim.claim_id,
    );
    if (staleClaim === undefined) throw new Error("Expected projected Claim.");
    staleClaim.authoritativeRevision = 1;
    staleClaim.recordHash = hash(claimFixture());
    await expect(graph.apply(stale)).rejects.toEqual(
      expect.objectContaining({
        code: "GRAPH_PROJECTION_STALE",
      } satisfies Partial<AuthorityGraphStoreError>),
    );
    expect(await graph.getFreshness(event.project_id, projection, 2)).toEqual(
      expect.objectContaining({ state: "current", pendingRecords: 0 }),
    );

    const assertionIdBeforeRebuild = (
      await graph.getProvenancePath(
        event.project_id,
        appliedPayload.assertion.assertion_id,
      )
    )?.assertion.assertionId;
    await expect(
      projector.rebuild(event.project_id, projection, [outbox]),
    ).resolves.toEqual([
      expect.objectContaining({ targetSequence: 1, duplicate: false }),
    ]);
    expect(
      (
        await graph.getProvenancePath(
          event.project_id,
          appliedPayload.assertion.assertion_id,
        )
      )?.assertion.assertionId,
    ).toBe(assertionIdBeforeRebuild);
    expect(await graph.getObject(event.project_id, citation.assertion_id)).toBe(
      undefined,
    );
    expect(await graph.getFreshness(event.project_id, projection, 1)).toEqual(
      expect.objectContaining({ state: "current", pendingRecords: 0 }),
    );

    const trustedClaim = await evidence.getClaim(appliedPayload.claim.claim_id);
    const trustedPairAssertion = await evidence.getAssertion(
      appliedPayload.assertion.assertion_id,
    );
    if (trustedClaim === undefined || trustedPairAssertion === undefined) {
      throw new Error("Expected current trusted evidence before reversal.");
    }
    const reviewer =
      commands.approve.command.command_name === "RecordApproval"
        ? commands.approve.command.approval.decided_by
        : undefined;
    if (reviewer === undefined) throw new Error("Expected human reviewer.");
    const reversal = buildCompensatingReversalCommandPlan({
      project_id: event.project_id,
      claim: trustedClaim,
      assertion: trustedPairAssertion,
      compensates_change_set_id: appliedPayload.change_set_id,
      proposed_by: reviewer,
      reviewer,
      capability_grant_id: commands.submit.capability_grant_id,
      reason: "Correct the accepted direct evidence review.",
      rationale: "The represented claim does not survive exact-source review.",
      impact_summary: "Remove the ASSERTS edge from active graph authority.",
      timing: {
        proposed_at: "2026-09-02T19:00:10.000Z",
        decided_at: "2026-09-02T19:00:11.000Z",
        applied_at: "2026-09-02T19:00:12.000Z",
      },
    });
    await executeCompensatingReversalPlan(changeControl, reversal);
    const graphOutboxes = await changeControl.getOutboxRecords({
      projectId: event.project_id,
      target: "neo4j_graph",
    });
    const reversalOutbox = graphOutboxes[1];
    if (reversalOutbox === undefined) {
      throw new Error("Expected compensating graph outbox record.");
    }
    const observed = await projectionAuthority.observeHead(
      checkpoint.projection_checkpoint_id,
      reversalOutbox,
      projected.checkpoint.revision,
      "2026-09-02T19:00:05.500Z",
    );
    const reversedProjection = await projector.project(
      checkpoint.projection_checkpoint_id,
      reversalOutbox,
    );
    expect(observed.content.freshness.state).toBe("catching_up");
    expect(reversedProjection.checkpoint.content.freshness.state).toBe(
      "current",
    );
    expect(
      reversedProjection.record?.content.outcome.outcome_kind === "applied"
        ? reversedProjection.record.content.outcome.effect.objects
        : [],
    ).toContainEqual(
      expect.objectContaining({
        graph_element_kind: "relationship",
        object_id: appliedPayload.assertion.assertion_id,
        object_revision: 3,
        operation: "tombstone",
      }),
    );
    expect(
      await graph.getObject(
        event.project_id,
        appliedPayload.assertion.assertion_id,
      ),
    ).toBeUndefined();
    expect(
      await graph.getProvenancePath(
        event.project_id,
        appliedPayload.assertion.assertion_id,
      ),
    ).toBeUndefined();
    const rejectedClaimView = await graph.getObject(
      event.project_id,
      appliedPayload.claim.claim_id,
    );
    expect(rejectedClaimView).toEqual(
      expect.objectContaining({
        elementKind: "node",
        authoritativeRevision: 3,
      }),
    );
    expect(rejectedClaimView?.properties).toEqual(
      expect.objectContaining({
        authority_zone: "quarantine",
        review_state: "human_rejected",
      }),
    );
    await expect(
      projector.rebuild(event.project_id, projection, graphOutboxes),
    ).resolves.toEqual([
      expect.objectContaining({ targetSequence: 1 }),
      expect.objectContaining({ targetSequence: 2 }),
    ]);
    expect(
      await graph.getObject(
        event.project_id,
        appliedPayload.assertion.assertion_id,
      ),
    ).toBeUndefined();

    const records = await projectionAuthority.getProjectionRecords(
      checkpoint.projection_checkpoint_id,
    );
    expect(records).toHaveLength(2);
    expect(records[1]?.content.outcome).toEqual(
      expect.objectContaining({ outcome_kind: "applied" }),
    );
  });
});
