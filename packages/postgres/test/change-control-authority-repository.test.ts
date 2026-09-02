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
  PetraEvidenceProposalBundle,
  PetraParsedDocument,
  PetraProject,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import type {
  DomainRecordFactory,
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
} from "@petra/core";
import {
  buildCompensatingReversalCommandPlan,
  buildReviewDecisionCommandPlan,
  executeCompensatingReversalPlan,
  executeReviewDecisionPlan,
  replayScientificAuthority,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { availableArtifactStore } from "./artifact-store-fixture.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

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

const sha256 = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const canonicalHash = (value: unknown): string =>
  sha256(new TextEncoder().encode(canonicalize(value)));

const expectChangeCode = async (
  operation: () => Promise<unknown>,
  code: string,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(expect.objectContaining({ code }));
};

interface CommandFixtureSet {
  submit: PetraCommandEnvelope;
  approve: PetraCommandEnvelope;
  apply: PetraCommandEnvelope;
}

describePostgres("PostgreSQL ChangeSet authority, event, and outbox", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await pool.query(
      `UPDATE petra.authority_positions
          SET event_position = 0, outbox_position = 0
        WHERE singleton`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const modelActor = (): PetraActor => ({
    ...readFixture<PetraActor>("actor"),
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "model",
    display_name: "Petra extraction model",
    created_at: "2026-08-28T18:00:01.000Z",
  });

  const registerResearchIdentities = async (): Promise<void> => {
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(modelActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
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
    const parserHash = sha256(parserBytes);
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
    sourceManifestId: string,
  ): PersistDocumentBundleInput => {
    const document = readFixture<PetraParsedDocument>("parsed-document");
    const block = readFixture<PetraStructuralBlock>("structural-block");
    const span = readFixture<PetraSourceSpan>("source-span");
    document.created_by.actor_kind = "human";
    span.created_by.actor_kind = "human";
    return {
      sourceArtifactManifestId: sourceManifestId,
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

  const registerEvidenceChain = async (): Promise<void> => {
    await registerResearchIdentities();
    const source = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
    await documents.registerDocumentBundle(
      documentBundle(source.manifest.artifact_manifest_id),
    );
    await evidence.proposeClaim(claimFixture());
    await evidence.proposeAssertion(assertionFixture());
  };

  const commandFixtures = (): CommandFixtureSet => {
    const submit = readFixture<PetraCommandEnvelope>(
      "command-submit-change-set",
    );
    if (submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected SubmitChangeSet fixture.");
    }
    submit.actor = {
      actor_id: modelActor().actor_id,
      actor_kind: "model",
    };
    submit.command.change_set.content.proposed_by = structuredClone(
      submit.actor,
    );
    submit.command.change_set.content_hash = canonicalHash(
      submit.command.change_set.content,
    );

    const approve = readFixture<PetraCommandEnvelope>(
      "command-record-approval",
    );
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

  const secondCommandFixtures = (): CommandFixtureSet => {
    const fixtures = commandFixtures();
    if (
      fixtures.submit.command.command_name !== "SubmitChangeSet" ||
      fixtures.approve.command.command_name !== "RecordApproval" ||
      fixtures.apply.command.command_name !== "ApplyChangeSet"
    ) {
      throw new Error("Expected command fixture discriminators.");
    }
    const changeSetId = "change_set_01ARZ3NDEKTSV4RRFFQ69G5FC1";
    const approvalId = "approval_01ARZ3NDEKTSV4RRFFQ69G5FC2";
    fixtures.submit.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC3";
    fixtures.submit.idempotency_key = "review:claim-fbb:submit:competitor";
    fixtures.submit.command.change_set.change_set_id = changeSetId;
    fixtures.submit.command.change_set.content_hash = canonicalHash(
      fixtures.submit.command.change_set.content,
    );

    fixtures.approve.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC4";
    fixtures.approve.idempotency_key = "review:claim-fbb:approve:competitor";
    fixtures.approve.causation_id = fixtures.submit.command_id;
    fixtures.approve.command.approval.approval_id = approvalId;
    fixtures.approve.command.approval.subject.change_set_id = changeSetId;
    fixtures.approve.command.approval.subject.change_set_content_hash =
      fixtures.submit.command.change_set.content_hash;

    fixtures.apply.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC5";
    fixtures.apply.idempotency_key = "review:claim-fbb:apply:competitor";
    fixtures.apply.causation_id = fixtures.approve.command_id;
    fixtures.apply.command.change_set_id = changeSetId;
    fixtures.apply.command.change_set_content_hash =
      fixtures.submit.command.change_set.content_hash;
    fixtures.apply.command.approval_id = approvalId;
    return fixtures;
  };

  const deterministicFactory = (
    options: { invalidFirstEvent?: boolean } = {},
  ): DomainRecordFactory => {
    let eventIndex = 0;
    let outboxIndex = 0;
    return {
      nextId: (kind) => {
        if (kind === "event") {
          eventIndex += 1;
          if (options.invalidFirstEvent && eventIndex === 1) {
            return "outbox_01ARZ3NDEKTSV4RRFFQ69G5FE0";
          }
          return `event_01ARZ3NDEKTSV4RRFFQ69G5F${String(eventIndex).padStart(2, "0")}`;
        }
        outboxIndex += 1;
        return `outbox_01ARZ3NDEKTSV4RRFFQ69G5F${String(outboxIndex + 20).padStart(2, "0")}`;
      },
      now: () => "2026-08-28T18:14:00.000Z",
    };
  };

  const authority = (
    factory = deterministicFactory(),
    authorized = true,
  ): PostgresChangeControlAuthorityRepository =>
    new PostgresChangeControlAuthorityRepository(
      pool,
      { authorize: () => authorized },
      factory,
    );

  it("atomically promotes a Claim and ASSERTS edge with events and target-ordered outbox", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();

    await expect(repository.executeCommand(commands.submit)).resolves.toEqual(
      expect.objectContaining({ outcome: "submitted" }),
    );
    await expect(repository.executeCommand(commands.approve)).resolves.toEqual(
      expect.objectContaining({
        outcome: "approval_recorded",
        change_set_state: "approved",
      }),
    );
    const applied = await repository.executeCommand(commands.apply);
    if (applied.outcome !== "applied") {
      throw new Error("Expected applied ChangeSet result.");
    }
    expect(applied).toEqual(
      expect.objectContaining({
        outcome: "applied",
        claim_revision: 2,
        assertion_revision: 2,
      }),
    );
    await expect(repository.executeCommand(commands.apply)).resolves.toEqual(
      applied,
    );

    expect(await repository.getChangeSetState(applied.change_set_id)).toBe(
      "applied",
    );
    expect(await repository.getChangeSet(applied.change_set_id)).toEqual(
      (commands.submit.command as { change_set: unknown }).change_set,
    );
    expect(await repository.getApproval(applied.approval_id)).toEqual(
      (commands.approve.command as { approval: unknown }).approval,
    );

    const trustedClaim = await evidence.getClaim(applied.claim_id);
    const trustedAssertion = await evidence.getAssertion(applied.assertion_id);
    expect(trustedClaim?.revision).toBe(2);
    expect(trustedClaim?.authority.zone).toBe("trusted");
    expect(trustedClaim?.authority.review_state).toBe("human_accepted");
    expect(trustedAssertion?.revision).toBe(2);
    expect((await evidence.getClaim(applied.claim_id, 1))?.authority.zone).toBe(
      "quarantine",
    );

    const events = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    expect(events.map((event) => event.event.event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
    ]);
    expect(events.map((event) => event.event_position)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.stream_revision)).toEqual([1, 2, 3]);

    const replayedAuthority = replayScientificAuthority(
      commands.submit.project_id,
      events,
    );
    expect(replayedAuthority.claims).toEqual([trustedClaim]);
    expect(replayedAuthority.assertions).toEqual([trustedAssertion]);
    expect(replayedAuthority.appliedChangeSetIds).toEqual([
      applied.change_set_id,
    ]);

    const interfaceOutbox = await repository.getOutboxRecords({
      projectId: commands.submit.project_id,
      target: "interface_authority",
    });
    const graphOutbox = await repository.getOutboxRecords({
      projectId: commands.submit.project_id,
      target: "neo4j_graph",
    });
    expect(interfaceOutbox.map((record) => record.target_sequence)).toEqual([
      1, 2, 3,
    ]);
    expect(graphOutbox.map((record) => record.target_sequence)).toEqual([1]);
    expect(graphOutbox[0]?.message.event).toEqual(events[2]);

    const authorization = await pool.query<{
      evidence_kind: string;
      evidence_revision: string;
      admission_kind: string;
      change_set_id: string;
      approval_id: string;
    }>(
      `SELECT evidence_kind, evidence_revision::text, admission_kind,
              change_set_id, approval_id
         FROM petra.evidence_revision_authorizations
        ORDER BY evidence_kind`,
    );
    expect(authorization.rows).toEqual([
      {
        evidence_kind: "assertion",
        evidence_revision: "2",
        admission_kind: "promotion",
        change_set_id: applied.change_set_id,
        approval_id: applied.approval_id,
      },
      {
        evidence_kind: "claim",
        evidence_revision: "2",
        admission_kind: "promotion",
        change_set_id: applied.change_set_id,
        approval_id: applied.approval_id,
      },
    ]);
  });

  it("executes a generated review plan through the durable command boundary", async () => {
    await registerEvidenceChain();
    const repository = authority();
    const candidate = readFixture<PetraEvidenceProposalBundle>(
      "evidence-proposal-bundle",
    ).content.candidates[0];
    candidate.claim = claimFixture();
    candidate.assertion = assertionFixture();
    const reviewer = readFixture<PetraActor>("actor");
    const plan = buildReviewDecisionCommandPlan({
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      candidate,
      origin: "agent_proposal",
      proposed_by: candidate.claim.created_by,
      reviewer: {
        actor_id: reviewer.actor_id,
        actor_kind: "human",
      },
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
      decision: "accepted",
      reason: "Promote the independently reviewed evidence pair.",
      rationale: "The exact source and scoped representation agree.",
      impact_summary:
        "The Claim and ASSERTS edge become trusted representations.",
      timing: {
        proposed_at: "2026-08-28T18:12:30.000Z",
        decided_at: "2026-08-28T18:13:00.000Z",
        applied_at: "2026-08-28T18:13:01.000Z",
      },
    });

    const result = await executeReviewDecisionPlan(repository, plan);

    expect(result).toMatchObject({
      outcome: "applied",
      candidate_id: candidate.candidate_id,
      claim_revision: 2,
      assertion_revision: 2,
    });
    expect(
      await repository.getChangeSet(plan.change_set.change_set_id),
    ).toEqual(plan.change_set);
    expect(
      (await evidence.getClaim(candidate.claim.claim_id))?.authority.zone,
    ).toBe("trusted");
  });

  it("durably reverses a trusted pair while preserving every prior revision", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();
    await repository.executeCommand(commands.submit);
    await repository.executeCommand(commands.approve);
    const promoted = await repository.executeCommand(commands.apply);
    if (
      promoted.outcome !== "applied" ||
      commands.submit.command.command_name !== "SubmitChangeSet" ||
      commands.approve.command.command_name !== "RecordApproval"
    ) {
      throw new Error("Expected an applied promotion pipeline.");
    }
    const trustedClaim = await evidence.getClaim(promoted.claim_id);
    const trustedAssertion = await evidence.getAssertion(promoted.assertion_id);
    if (trustedClaim === undefined || trustedAssertion === undefined) {
      throw new Error("Expected current trusted evidence.");
    }
    const reviewer = commands.approve.command.approval.decided_by;
    const reversal = buildCompensatingReversalCommandPlan({
      project_id: commands.submit.project_id,
      claim: trustedClaim,
      assertion: trustedAssertion,
      compensates_change_set_id: promoted.change_set_id,
      proposed_by: reviewer,
      reviewer,
      capability_grant_id: commands.submit.capability_grant_id,
      reason: "Correct the direct evidence review.",
      rationale:
        "The accepted representation does not survive exact-source review.",
      impact_summary:
        "Remove the Claim and ASSERTS edge from active authority.",
      timing: {
        proposed_at: "2026-08-30T10:00:00.000Z",
        decided_at: "2026-08-30T10:01:00.000Z",
        applied_at: "2026-08-30T10:02:00.000Z",
      },
    });

    const result = await executeCompensatingReversalPlan(repository, reversal);

    expect(result).toMatchObject({
      outcome: "reverted",
      compensates_change_set_id: promoted.change_set_id,
      claim_revision: 3,
      assertion_revision: 3,
    });
    expect(await repository.getChangeSetState(promoted.change_set_id)).toBe(
      "reverted",
    );
    expect(
      await repository.getChangeSetState(reversal.change_set.change_set_id),
    ).toBe("applied");
    expect((await evidence.getClaim(promoted.claim_id))?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(
      (await evidence.getAssertion(promoted.assertion_id))?.authority,
    ).toEqual({ zone: "quarantine", review_state: "human_rejected" });
    expect(
      (await evidence.getClaim(promoted.claim_id, 2))?.authority.zone,
    ).toBe("trusted");

    const events = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    expect(events.map((event) => event.event.event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
      "change_set.submitted",
      "approval.recorded",
      "change_set.reverted",
    ]);
    expect(events.slice(-3).map((event) => event.schema_version)).toEqual([
      "1.1.0",
      "1.1.0",
      "1.1.0",
    ]);
    const authorizations = await pool.query<{
      admission_kind: string;
      evidence_revision: string;
    }>(
      `SELECT admission_kind, evidence_revision::text
         FROM petra.evidence_revision_authorizations
        WHERE evidence_revision = 3
        ORDER BY evidence_kind`,
    );
    expect(authorizations.rows).toEqual([
      { admission_kind: "reversal", evidence_revision: "3" },
      { admission_kind: "reversal", evidence_revision: "3" },
    ]);
  });

  it("deduplicates concurrent exact retries and rejects key or command rebound", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();

    const results = await Promise.all([
      repository.executeCommand(structuredClone(commands.submit)),
      repository.executeCommand(structuredClone(commands.submit)),
    ]);
    expect(results[0]).toEqual(results[1]);

    const reboundKey = structuredClone(commands.submit);
    reboundKey.submitted_at = "2026-08-28T18:12:31.000Z";
    await expectChangeCode(
      () => repository.executeCommand(reboundKey),
      "IDEMPOTENCY_KEY_REUSED",
    );

    const reboundCommand = structuredClone(commands.submit);
    reboundCommand.idempotency_key = "review:claim-fbb:submit:rebound";
    await expectChangeCode(
      () => repository.executeCommand(reboundCommand),
      "COMMAND_ID_REUSED",
    );

    const counts = await pool.query<{
      commands: string;
      events: string;
      outbox: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.command_executions)::text AS commands,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox`,
    );
    expect(counts.rows[0]).toEqual({
      commands: "1",
      events: "1",
      outbox: "1",
    });
  });

  it("records rejection but never records an unauthorized or rejected application", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const denied = authority(deterministicFactory(), false);
    await expectChangeCode(
      () => denied.executeCommand(commands.submit),
      "COMMAND_NOT_AUTHORIZED",
    );
    expect(
      await denied.getDomainEvents({ projectId: commands.submit.project_id }),
    ).toEqual([]);

    const repository = authority();
    await repository.executeCommand(commands.submit);
    if (commands.approve.command.command_name !== "RecordApproval") {
      throw new Error("Expected RecordApproval fixture.");
    }
    commands.approve.command.approval.decision = "rejected";
    await repository.executeCommand(commands.approve);
    await expectChangeCode(
      () => repository.executeCommand(commands.apply),
      "APPROVAL_NOT_GRANTED",
    );
    expect(
      await repository.getChangeSetState(
        (commands.apply.command as { change_set_id: string }).change_set_id,
      ),
    ).toBe("rejected");
    expect((await evidence.getClaim(claimFixture().claim_id))?.revision).toBe(
      1,
    );
    expect(
      (
        await repository.getDomainEvents({
          projectId: commands.submit.project_id,
        })
      ).map((event) => event.event.event_type),
    ).toEqual(["change_set.submitted", "approval.recorded"]);
  });

  it("commits one durable conflict event when a reviewed competitor becomes stale", async () => {
    await registerEvidenceChain();
    const first = commandFixtures();
    const second = secondCommandFixtures();
    const repository = authority();

    await repository.executeCommand(first.submit);
    await repository.executeCommand(second.submit);
    await repository.executeCommand(first.approve);
    await repository.executeCommand(second.approve);
    await repository.executeCommand(first.apply);
    await expectChangeCode(
      () => repository.executeCommand(second.apply),
      "STALE_TARGET_REVISION",
    );
    await expectChangeCode(
      () => repository.executeCommand(second.apply),
      "STALE_TARGET_REVISION",
    );

    if (second.apply.command.command_name !== "ApplyChangeSet") {
      throw new Error("Expected ApplyChangeSet fixture.");
    }
    expect(
      await repository.getChangeSetState(second.apply.command.change_set_id),
    ).toBe("conflicted");
    expect((await evidence.getClaim(claimFixture().claim_id))?.revision).toBe(
      2,
    );
    const events = await repository.getDomainEvents({
      projectId: first.submit.project_id,
    });
    expect(events).toHaveLength(6);
    expect(events.at(-1)?.event).toEqual(
      expect.objectContaining({ event_type: "change_set.conflicted" }),
    );
    const durable = await pool.query<{
      outcome_kind: string;
      error_code: string;
    }>(
      "SELECT outcome_kind, error_code FROM petra.command_executions WHERE command_id = $1",
      [second.apply.command_id],
    );
    expect(durable.rows[0]).toEqual({
      outcome_kind: "failure",
      error_code: "STALE_TARGET_REVISION",
    });
  });

  it("rolls back domain state when event construction fails", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority(
      deterministicFactory({ invalidFirstEvent: true }),
    );

    await expect(repository.executeCommand(commands.submit)).rejects.toThrow(
      "non-event ID",
    );
    if (commands.submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected SubmitChangeSet fixture.");
    }
    expect(
      await repository.getChangeSet(
        commands.submit.command.change_set.change_set_id,
      ),
    ).toBe(undefined);
    const counts = await pool.query<{
      commands: string;
      events: string;
      outbox: string;
      event_position: string;
      outbox_position: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.command_executions)::text AS commands,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox,
         event_position::text,
         outbox_position::text
       FROM petra.authority_positions`,
    );
    expect(counts.rows[0]).toEqual({
      commands: "0",
      events: "0",
      outbox: "0",
      event_position: "0",
      outbox_position: "0",
    });
  });

  it("keeps commands, events, outbox records, and approvals append-only in PostgreSQL", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();
    await repository.executeCommand(commands.submit);
    await repository.executeCommand(commands.approve);

    await expect(pool.query("DELETE FROM petra.approvals")).rejects.toEqual(
      expect.objectContaining({ code: "55000" }),
    );
    await expect(
      pool.query("UPDATE petra.domain_events SET stream_revision = 99"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("UPDATE petra.outbox_records SET target_sequence = 99"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("DELETE FROM petra.command_executions"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });
});
