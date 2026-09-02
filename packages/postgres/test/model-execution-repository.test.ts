import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraEvidenceProposalBundle,
  PetraModelCall,
  PetraModelRequest,
  PetraModelRoleCertification,
  PetraProject,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresModelExecutionRepository } from "../src/model-execution-repository.js";
import type { ModelExecutionPersistenceError } from "../src/model-execution-repository.js";
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const modelProposal = (): PetraEvidenceProposalBundle => {
  const proposal = readFixture<PetraEvidenceProposalBundle>(
    "evidence-proposal-bundle",
  );
  proposal.evidence_proposal_bundle_id =
    "evidence_proposal_bundle_01ARZ3NDEKTSV4RRFFQ69G5FD9";
  proposal.content.extraction = {
    extraction_kind: "model_extraction",
    extraction_run_id: "extraction_run_01ARZ3NDEKTSV4RRFFQ69G5FD7",
    extractor: {
      name: "petra-source-grounded-extractor",
      version: "1.0.0",
    },
    recipe_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FD4",
    model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
    model_deployment: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FD1",
    prompt_profile: {
      name: "petra-source-grounded-extractor",
      version: "1.0.0",
    },
    prompt_hash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    parameters_hash:
      "sha256:440b3886b2eb3fb543f46ad712e2108b83e753774300260ca165f5cbb0f295a9",
    context_packet_ref: {
      context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
      content_hash:
        "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
    },
    started_at: "2026-09-02T18:31:00.000Z",
    completed_at: "2026-09-02T18:31:00.004Z",
  };
  const candidate = proposal.content.candidates[0];
  if (
    candidate === undefined ||
    candidate.claim.basis.basis_kind !== "source"
  ) {
    throw new Error("Expected one source-based proposal fixture.");
  }
  candidate.claim.basis.derivation = {
    derivation_kind: "model_extraction",
    derivation_ref: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
  };
  const serviceActor = {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "service" as const,
  };
  candidate.claim.basis.proposed_by = serviceActor;
  candidate.claim.created_by = serviceActor;
  candidate.assertion.created_by = serviceActor;
  const sourceRefs = candidate.assertion.provenance_refs.filter(
    (ref) => ref.provenance_kind === "source_span",
  );
  const firstSourceRef = sourceRefs[0];
  if (firstSourceRef === undefined) {
    throw new Error("Expected source provenance in the proposal fixture.");
  }
  candidate.assertion.provenance_refs = [
    firstSourceRef,
    ...sourceRefs.slice(1),
    {
      provenance_kind: "record",
      record_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
      role: "model_call",
    },
  ];
  proposal.created_by = serviceActor;
  proposal.created_at = "2026-09-02T18:31:00.004Z";
  proposal.content_hash = canonicalHash(proposal.content);
  return proposal;
};

describePostgres("PostgreSQL model execution records", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const repository = new PostgresModelExecutionRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    const human = readFixture<PetraActor>("actor");
    await scopes.registerActor(human);
    await scopes.registerActor({
      ...human,
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
      display_name: "Petra model gateway",
      created_at: "2026-08-28T18:00:01.000Z",
    });
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("atomically persists certification, request, call, and quarantine proposal", async () => {
    const certification = readFixture<PetraModelRoleCertification>(
      "model-role-certification",
    );
    const request = readFixture<PetraModelRequest>("model-request");
    const call = readFixture<PetraModelCall>("model-call");
    const proposal = modelProposal();

    expect(await repository.registerCertification(certification)).toEqual(
      certification,
    );
    expect(await repository.registerCertification(certification)).toEqual(
      certification,
    );
    const execution = {
      request,
      calls: [call],
      proposal_bundle: proposal,
    };
    expect(await repository.persistExecution(execution)).toEqual(execution);
    expect(await repository.persistExecution(execution)).toEqual(execution);
    expect(await repository.getRequest(request.model_request_id)).toEqual(
      request,
    );
    expect(await repository.listCalls(request.model_request_id)).toEqual([
      call,
    ]);
    expect(
      await repository.getProposalBundle(proposal.evidence_proposal_bundle_id),
    ).toEqual(proposal);

    const typed = await pool.query<{
      terminal_state: string;
      egress_class: string;
      selected_deployment_id: string;
      outcome: string;
      input_tokens: string;
      output_tokens: string;
      cost_amount: string;
      extraction_run_id: string;
    }>(
      `SELECT request.terminal_state, request.egress_class,
              request.selected_deployment_id, call.outcome,
              call.input_tokens, call.output_tokens, call.cost_amount,
              proposal.extraction_run_id
         FROM petra.model_requests AS request
         JOIN petra.model_calls AS call USING (model_request_id)
         JOIN petra.model_evidence_proposal_bundles AS proposal
           USING (model_request_id)
        WHERE request.model_request_id = $1`,
      [request.model_request_id],
    );
    expect(typed.rows[0]).toEqual({
      terminal_state: "completed",
      egress_class: "E0",
      selected_deployment_id: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FD1",
      outcome: "success",
      input_tokens: "84",
      output_tokens: "112",
      cost_amount: "0.000000000000",
      extraction_run_id: "extraction_run_01ARZ3NDEKTSV4RRFFQ69G5FD7",
    });
  });

  it("rejects cross-record drift before any partial execution persists", async () => {
    const certification = readFixture<PetraModelRoleCertification>(
      "model-role-certification",
    );
    await repository.registerCertification(certification);
    const request = readFixture<PetraModelRequest>("model-request");
    const call = readFixture<PetraModelCall>("model-call");
    call.content.model_request_id = "model_request_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    call.content_hash = canonicalHash(call.content);

    await expect(
      repository.persistExecution({
        request,
        calls: [call],
        proposal_bundle: modelProposal(),
      }),
    ).rejects.toMatchObject({
      code: "MODEL_CALL_SET_MISMATCH",
    } satisfies Partial<ModelExecutionPersistenceError>);
    expect(
      await repository.getRequest(request.model_request_id),
    ).toBeUndefined();
  });

  it("keeps persisted model records immutable and rejects ID reuse", async () => {
    const certification = readFixture<PetraModelRoleCertification>(
      "model-role-certification",
    );
    await repository.registerCertification(certification);
    const request = readFixture<PetraModelRequest>("model-request");
    const call = readFixture<PetraModelCall>("model-call");
    const execution = {
      request,
      calls: [call],
      proposal_bundle: modelProposal(),
    };
    await repository.persistExecution(execution);

    const changed = structuredClone(execution);
    changed.request.content.objective = "Different objective, same identity.";
    changed.request.content_hash = canonicalHash(changed.request.content);
    await expect(repository.persistExecution(changed)).rejects.toMatchObject({
      code: "MODEL_REQUEST_ID_REUSED",
    } satisfies Partial<ModelExecutionPersistenceError>);
    await expect(
      pool.query(
        "UPDATE petra.model_calls SET total_ms = total_ms + 1 WHERE model_call_id = $1",
        [call.model_call_id],
      ),
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      pool.query(
        "DELETE FROM petra.model_requests WHERE model_request_id = $1",
        [request.model_request_id],
      ),
    ).rejects.toMatchObject({ code: "55000" });
  });
});
