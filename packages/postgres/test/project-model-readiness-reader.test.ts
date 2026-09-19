import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraContextPacket,
  PetraEvidencePacket,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import type { CertifiedProjectModelBinding } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectModelReadinessReader } from "../src/project-model-readiness-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

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

const certification = (
  JSON.parse(
    readFileSync(
      new URL(
        "../../../config/model-certifications/codex-terra-synthesist-1.1.0.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { certification: PetraSynthesistRoleCertification }
).certification;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const runtimeBinding: CertifiedProjectModelBinding = {
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  role_semantic_key: "scientific.grounded-synthesist",
  role_contract: {
    name: "petra.model-role-certification",
    version: "1.1.0",
    content_hash:
      "sha256:7bab65763e37fc2bec0b9fa64d178ae37e769882717a445bb2a5f0fb650a40f1",
  },
  role_certification_ref: {
    role_certification_id: certification.role_certification_id,
    revision: certification.revision,
    content_hash: certification.content_hash,
  },
  snapshot_ref: {
    snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
    snapshot_revision: 1,
    event_position: 3,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  context_packet_ref: {
    record_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
    revision: 1,
    content_hash:
      "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
  },
  evidence_packet_ref: {
    record_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
    revision: 1,
    content_hash:
      "sha256:e3d7679bec56bc80f2bbb9702398526ca69edac1c10836132efc365c36393d64",
  },
};

describePostgres("PostgreSQL Project model readiness authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const reader = new PostgresProjectModelReadinessReader(pool);
  const actor = readFixture<PetraActor>("actor");
  const project = readFixture<PetraProject>("project");
  const definition1 = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const definition2 = readFixture<PetraProjectDefinition>(
    "project-definition-working-scientific",
  );
  const definition3 = readFixture<PetraProjectDefinition>(
    "project-definition-certified-scientific",
  );
  const objective1 = readFixture<PetraProjectObjective>("project-objective");
  const objective2 = readFixture<PetraProjectObjective>(
    "project-objective-working-scientific",
  );
  const objective3 = readFixture<PetraProjectObjective>(
    "project-objective-certified-scientific",
  );
  const serviceActor: PetraActor = {
    schema_name: "petra.actor",
    schema_version: "1.0.0",
    actor_id: certification.certified_by.actor_id,
    actor_kind: "service",
    display_name: "Petra grounded synthesis service",
    created_at: certification.certified_at,
  };

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(actor);
    await scopes.registerActor(serviceActor);
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition1);
    await definitions.registerObjectiveRevision(objective1);
    await definitions.registerDefinitionRevision(definition2);
    await definitions.registerObjectiveRevision(objective2);
  });

  afterAll(async () => {
    await pool.end();
  });

  const focus = async (objective: PetraProjectObjective): Promise<void> => {
    await definitions.setCurrentObjectiveFocus({
      project_id: project.project_id,
      objective_ref: {
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      },
      changed_by: project.created_by,
      changed_at: objective.updated_at,
    });
  };

  const insertPackets = async (): Promise<void> => {
    const context = readFixture<PetraContextPacket>("context-packet");
    const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
    context.compiled_by = {
      actor_id: certification.certified_by.actor_id,
      actor_kind: "service",
    };
    evidence.compiled_by = {
      actor_id: certification.certified_by.actor_id,
      actor_kind: "service",
    };
    await pool.query(
      `INSERT INTO petra.context_packets (
         context_packet_id, revision, project_id, snapshot_id,
         snapshot_revision, snapshot_event_position, snapshot_hash,
         content_hash, compiled_by_actor_id, compiled_by_actor_kind,
         compiled_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11::timestamptz, $12, $13::jsonb
       )`,
      [
        context.context_packet_id,
        context.revision,
        context.project_id,
        context.snapshot_ref.snapshot_id,
        context.snapshot_ref.snapshot_revision,
        context.snapshot_ref.event_position,
        context.snapshot_ref.content_hash,
        context.content_hash,
        context.compiled_by.actor_id,
        context.compiled_by.actor_kind,
        context.compiled_at,
        canonicalHash(context),
        JSON.stringify(context),
      ],
    );
    await pool.query(
      `INSERT INTO petra.evidence_packets (
         evidence_packet_id, revision, project_id, context_packet_id,
         context_packet_hash, snapshot_id, snapshot_revision,
         snapshot_event_position, snapshot_hash, content_hash,
         compiled_by_actor_id, compiled_by_actor_kind, compiled_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13::timestamptz, $14, $15::jsonb
       )`,
      [
        evidence.evidence_packet_id,
        evidence.revision,
        evidence.project_id,
        evidence.content.context_packet_ref.context_packet_id,
        evidence.content.context_packet_ref.content_hash,
        evidence.snapshot_ref.snapshot_id,
        evidence.snapshot_ref.snapshot_revision,
        evidence.snapshot_ref.event_position,
        evidence.snapshot_ref.content_hash,
        evidence.content_hash,
        evidence.compiled_by.actor_id,
        evidence.compiled_by.actor_kind,
        evidence.compiled_at,
        canonicalHash(evidence),
        JSON.stringify(evidence),
      ],
    );
  };

  it("binds the certified role to current Project authority and exact immutable packets", async () => {
    await definitions.registerDefinitionRevision(definition3);
    await definitions.registerObjectiveRevision(objective3);
    await focus(objective3);
    await insertPackets();

    const result = await reader.readProjectModelAuthority(
      project.project_id,
      runtimeBinding,
    );

    expect(result).toMatchObject({
      project_id: project.project_id,
      project_revision: 1,
      project_definition_ref: {
        revision: 3,
        content_hash: definition3.content_hash,
      },
      objective_ref: {
        revision: 3,
        content_hash: objective3.content_hash,
      },
      role: {
        state: "selected",
        semantic_key: "scientific.grounded-synthesist",
        label: "Grounded synthesist",
      },
      context: {
        state: "bound",
        binding: {
          project_id: project.project_id,
          snapshot_ref: runtimeBinding.snapshot_ref,
          context_packet_ref: runtimeBinding.context_packet_ref,
          evidence_packet_ref: runtimeBinding.evidence_packet_ref,
          role_certification_ref: runtimeBinding.role_certification_ref,
        },
      },
    });
  });

  it("fails closed when model context is absent or the Objective is stale", async () => {
    await focus(objective2);
    const withoutRole = await reader.readProjectModelAuthority(
      project.project_id,
      runtimeBinding,
    );
    expect(withoutRole).toMatchObject({
      role: { state: "unavailable", reason: "role_not_registered" },
      context: {
        state: "unavailable",
        reason: "project_context_not_compiled",
      },
    });

    await definitions.registerDefinitionRevision(definition3);
    const stale = await reader.readProjectModelAuthority(
      project.project_id,
      runtimeBinding,
    );
    expect(stale).toMatchObject({
      role: { state: "selected" },
      context: { state: "unavailable", reason: "project_context_stale" },
    });
  });
});
