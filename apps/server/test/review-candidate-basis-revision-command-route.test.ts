import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraReviewSessionV110,
  PetraSourceSpan,
} from "@petra/contracts";
import {
  ReviewCandidateBasisRevisionAuthorityError,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewCandidateBasisRevisionAuthorityErrorCode,
  type ReviewCandidateBasisRevisionAuthorityRepository,
  type ReviewCandidateBasisRevisionCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "review-candidate-basis-revision-command-token";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const session = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-working-scientific",
);
const claim = readFixture<PetraClaim>("claim");
const source = readFixture<PetraProjectSource>("project-source");
const span = readFixture<PetraSourceSpan>("source-span");
const member = session.content.members[0];
const relationshipRef = member.working_state.relationship_refs[0];

const body = {
  command_id: "command_01K4E000000000000000000121",
  idempotency_key: "review-session:001:basis-revision:route:v1",
  expected_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    lifecycle: "open",
  },
  review_member_id: member.review_member_id,
  expected_project_definition_ref: {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    definition_family: definition.definition_family,
  },
  expected_working_candidate_ref: structuredClone(
    member.working_state.candidate_ref,
  ),
  expected_working_relationship_ref: structuredClone(relationshipRef),
  expected_claim_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: claim.claim_id,
    revision: claim.revision,
    record_hash: canonicalHash(claim),
  },
  basis_revision_input: {
    input_kind: "human_scientific_source_basis_revision",
    project_source_ref: {
      project_source_id: source.project_source_id,
      revision: source.revision,
      content_hash: source.content_hash,
      record_hash: canonicalHash(source),
      status: "active",
    },
    source_span_refs: [
      {
        schema_name: "petra.source-span",
        schema_version: "1.0.0",
        record_id: span.source_span_id,
        revision: 1,
        record_hash: canonicalHash(span),
      },
    ],
    source_scope: "full_text",
    detail_level: "broad",
    source_stance: "qualifies",
    attribution: "The study authors",
    modality: "hedged",
    negated: false,
    uncertainty: "The selected translation narrows the reported effect.",
    reason: "The prior basis omitted a material qualification.",
  },
} as const;

const path = `/api/commands/projects/${session.project_id}/reviews/${session.review_session_id}/candidate-basis-revision`;
const request = (payload: unknown, query = ""): Request =>
  new Request(`http://petra.local${path}${query}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const principal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: structuredClone(session.content.responsible),
      capabilityGrantId: "capability_grant_01K4E000000000000000000122",
    }),
};

describe("Review candidate basis-revision command route", () => {
  it("builds the governed envelope from authenticated authority and exact source input", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope:
      ReviewCandidateBasisRevisionCommandEnvelope | undefined;
    const authority: ReviewCandidateBasisRevisionAuthorityRepository = {
      executeReviewCandidateBasisRevisionCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        return Promise.reject(
          new ReviewCandidateBasisRevisionAuthorityError(
            "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
            "Test boundary reached after exact envelope composition.",
          ),
        );
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedInput = input;
          return principal.resolveCommandPrincipal(input);
        },
      },
      reviewCandidateBasisRevisionAuthority: authority,
    });

    const response = await petra.app.request(request(body));
    const responseBody: unknown = await response.clone().json();

    expect(response.status, JSON.stringify(responseBody)).toBe(409);
    expect(resolvedInput).toEqual({
      projectId: session.project_id,
      commandName: "ReviseReviewCandidateBasis",
    });
    expect(executedEnvelope).toMatchObject({
      schema_name: "petra.command-envelope",
      schema_version: "1.8.0",
      command_id: body.command_id,
      idempotency_key: body.idempotency_key,
      project_id: session.project_id,
      actor: session.content.responsible,
      capability_grant_id: "capability_grant_01K4E000000000000000000122",
      command: {
        command_name: "ReviseReviewCandidateBasis",
        review_member_id: member.review_member_id,
        expected_project_definition_ref: body.expected_project_definition_ref,
        expected_claim_ref: body.expected_claim_ref,
        basis_revision_input: body.basis_revision_input,
      },
    });
    expect(body).not.toHaveProperty("actor");
  });

  it("rejects request-carried authority, unsupported basis kinds, incomplete source refs, and query controls before authority resolution", async () => {
    let resolutionAttempted = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return principal.resolveCommandPrincipal({
            projectId: session.project_id,
            commandName: "ReviseReviewCandidateBasis",
          });
        },
      },
      reviewCandidateBasisRevisionAuthority: {
        executeReviewCandidateBasisRevisionCommand: () => {
          throw new Error("Invalid basis revision reached authority.");
        },
      },
    });

    const unsupported = structuredClone(body) as unknown as {
      basis_revision_input: Record<string, unknown>;
    };
    unsupported.basis_revision_input.input_kind =
      "human_scientific_synthesis_basis_revision";
    const incomplete = structuredClone(body) as unknown as {
      basis_revision_input: {
        project_source_ref: Record<string, unknown>;
      };
    };
    delete incomplete.basis_revision_input.project_source_ref.record_hash;
    for (const invalid of [
      { ...body, actor: session.content.responsible },
      { ...body, capability_grant_id: "request-selected-grant" },
      unsupported,
      incomplete,
    ]) {
      expect((await petra.app.request(request(invalid))).status).toBe(422);
    }
    expect(
      (await petra.app.request(request(body, "?approve=true"))).status,
    ).toBe(422);
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed without a grant and preserves authority error status", async () => {
    const denied = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          }),
      },
      reviewCandidateBasisRevisionAuthority: {
        executeReviewCandidateBasisRevisionCommand: () => {
          throw new Error("Denied basis revision executed.");
        },
      },
    });
    expect((await denied.app.request(request(body))).status).toBe(403);

    const cases: readonly [
      ReviewCandidateBasisRevisionAuthorityErrorCode,
      number,
    ][] = [
      ["REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED", 403],
      ["REVIEW_CANDIDATE_BASIS_REVISION_SESSION_NOT_FOUND", 404],
      ["REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED", 422],
      ["REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE", 422],
      ["REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE", 409],
      ["REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE", 409],
      ["REVIEW_CANDIDATE_BASIS_REVISION_STORED_RECORD_CORRUPT", 503],
    ];
    for (const [code, status] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: principal,
        reviewCandidateBasisRevisionAuthority: {
          executeReviewCandidateBasisRevisionCommand: () =>
            Promise.reject(
              new ReviewCandidateBasisRevisionAuthorityError(code, code),
            ),
        },
      });
      expect((await petra.app.request(request(body))).status).toBe(status);
    }
  });
});
