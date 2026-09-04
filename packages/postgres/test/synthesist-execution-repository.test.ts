import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraProject,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresSynthesistExecutionRepository } from "../src/synthesist-execution-repository.js";

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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra synthesist gateway",
  created_at: "2026-08-28T18:00:01.000Z",
});

const certification = (): PetraSynthesistRoleCertification => {
  const value = readFixture<PetraSynthesistRoleCertification>(
    "model-role-certification-synthesist",
  );
  value.content_hash = canonicalHash({
    deployment: value.deployment,
    role_profile: value.role_profile,
    scope: value.scope,
    evaluation: value.evaluation,
    decision: value.decision,
  });
  return value;
};

const execution = (): {
  request: PetraSynthesistModelRequest;
  calls: PetraSynthesistModelCall[];
} => {
  const request = readFixture<PetraSynthesistModelRequest>(
    "model-request-synthesist",
  );
  const call = readFixture<PetraSynthesistModelCall>("model-call-synthesist");
  if (
    request.content.terminal.state !== "completed" ||
    call.content.output === undefined
  ) {
    throw new Error("Expected completed synthesist fixtures.");
  }
  request.content.terminal.output_hash = canonicalHash(call.content.output);
  call.content_hash = canonicalHash(call.content);
  request.content_hash = canonicalHash(request.content);
  return { request, calls: [call] };
};

describePostgres("PostgreSQL synthesist execution records", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const repository = new PostgresSynthesistExecutionRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("persists and exactly replays the 1.1 synthesist route", async () => {
    const role = certification();
    const run = execution();

    expect(await repository.registerCertification(role)).toEqual(role);
    expect(await repository.registerCertification(role)).toEqual(role);
    expect(await repository.persistExecution(run)).toEqual(run);
    expect(await repository.persistExecution(run)).toEqual(run);
    expect(
      await repository.getCertification(role.role_certification_id),
    ).toEqual(role);
    expect(await repository.getRequest(run.request.model_request_id)).toEqual(
      run.request,
    );
    expect(await repository.listCalls(run.request.model_request_id)).toEqual(
      run.calls,
    );

    const typed = await pool.query<{
      certification_version: string;
      request_version: string;
      call_version: string;
      role: string;
    }>(
      `SELECT certification.payload ->> 'schema_version' AS certification_version,
              request.payload ->> 'schema_version' AS request_version,
              call.payload ->> 'schema_version' AS call_version,
              request.role
         FROM petra.model_requests AS request
         JOIN petra.model_calls AS call USING (model_request_id)
         JOIN petra.model_role_certifications AS certification
           ON certification.role_certification_id = request.selected_certification_id
        WHERE request.model_request_id = $1`,
      [run.request.model_request_id],
    );
    expect(typed.rows[0]).toEqual({
      certification_version: "1.1.0",
      request_version: "1.1.0",
      call_version: "1.1.0",
      role: "synthesist",
    });
  });

  it("rejects a terminal output hash mismatch before persistence", async () => {
    await repository.registerCertification(certification());
    const run = execution();
    if (run.request.content.terminal.state !== "completed") {
      throw new Error("Expected a completed request.");
    }
    run.request.content.terminal.output_hash =
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    run.request.content_hash = canonicalHash(run.request.content);

    await expect(repository.persistExecution(run)).rejects.toEqual(
      expect.objectContaining({
        code: "SYNTHESIST_OUTPUT_HASH_MISMATCH",
      }),
    );
    expect(await repository.getRequest(run.request.model_request_id)).toBe(
      undefined,
    );
  });

  it("keeps extractor and synthesist schema versions paired to their roles", async () => {
    const role = certification();
    await repository.registerCertification(role);
    const run = execution();
    const invalidPayload = structuredClone(run.request) as unknown as {
      content: { role: string };
      [key: string]: unknown;
    };
    invalidPayload.content.role = "extractor";
    const selected = run.request.content.routing.selected;
    if (selected === undefined) throw new Error("Expected a selected route.");

    await expect(
      pool.query(
        `INSERT INTO petra.model_requests (
           model_request_id, revision, project_id, workflow_id, role,
           impact_class, egress_class, routing_policy_id,
           routing_policy_hash, selected_deployment_id,
           selected_certification_id, terminal_state, content_hash,
           created_at, completed_at, record_hash, payload
         ) VALUES (
           $1, 1, $2, $3, 'extractor', 'routine', 'E0', $4, $5,
           $6, $7, 'completed', $8, $9::timestamptz,
           $10::timestamptz, $11, $12::jsonb
         )`,
        [
          run.request.model_request_id,
          run.request.content.project_id,
          run.request.content.workflow.workflow_id,
          run.request.content.routing_policy_ref.routing_policy_id,
          run.request.content.routing_policy_ref.content_hash,
          selected.model_deployment_id,
          selected.role_certification_id,
          run.request.content_hash,
          run.request.created_at,
          run.request.completed_at,
          canonicalHash(invalidPayload),
          JSON.stringify(invalidPayload),
        ],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "23514" }));
  });
});
