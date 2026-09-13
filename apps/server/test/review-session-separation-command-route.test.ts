import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraReviewSessionSeparationReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import {
  ReviewSessionSeparationAuthorityError,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewSessionSeparationAuthorityErrorCode,
  type ReviewSessionSeparationAuthorityRepository,
  type ReviewSessionSeparationCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "review-session-separation-command-token";

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

const original = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const body = {
  command_id: "command_01K4F000000000000000000401",
  idempotency_key: "review-session:route:separation:401",
  expected_review_session_ref: {
    review_session_id: original.review_session_id,
    revision: original.revision,
    content_hash: original.content_hash,
    lifecycle: "open",
  },
  review_member_id: "review_member_01K4F000000000000000000402",
} as const;

const source = structuredClone(original);
source.revision += 1;
source.content_hash = canonicalHash(source.content);
source.updated_at = "2026-09-12T23:40:00.000Z";

const separated = structuredClone(source);
separated.review_session_id = "review_session_01K4F000000000000000000403";
separated.revision = 1;
separated.content.members[0].review_member_id = body.review_member_id;
separated.content.members[0].working_state.candidate_ref = {
  working_candidate_id: "working_candidate_01K4F000000000000000000404",
  revision: 1,
  content_hash: `sha256:${"1".repeat(64)}`,
};
separated.content.members[0].working_state.relationship_refs = [
  {
    working_relationship_id: "working_relationship_01K4F000000000000000000405",
    revision: 1,
    content_hash: `sha256:${"2".repeat(64)}`,
  },
];
separated.content.members[0].candidate_bindings[0].record_ref = {
  record_id: "claim_01K4F000000000000000000406",
  revision: 1,
  record_hash: `sha256:${"3".repeat(64)}`,
};
separated.content.members[0].candidate_bindings[1]!.record_ref = {
  record_id: "assertion_01K4F000000000000000000407",
  revision: 1,
  record_hash: `sha256:${"4".repeat(64)}`,
};
separated.content_hash = canonicalHash(separated.content);
separated.created_at = "2026-09-12T23:40:00.000Z";
separated.updated_at = "2026-09-12T23:40:00.000Z";

const receiptContent: PetraReviewSessionSeparationReceipt["content"] = {
  command_ref: {
    command_id: body.command_id,
    idempotency_key: body.idempotency_key,
    command_name: "SeparateReviewSessionMember",
    command_fingerprint: `sha256:${"5".repeat(64)}`,
    actor: structuredClone(original.created_by),
    capability_grant_id: "capability_grant_01K4F000000000000000000408",
    correlation_id: "trace_01K4F000000000000000000409",
  },
  source_prior_review_session_ref: {
    ...body.expected_review_session_ref,
    record_hash: canonicalHash(original),
  },
  source_resulting_review_session_ref: {
    review_session_id: source.review_session_id,
    revision: source.revision,
    content_hash: source.content_hash,
    record_hash: canonicalHash(source),
    lifecycle: "open",
  },
  separated_review_session_ref: {
    review_session_id: separated.review_session_id,
    revision: separated.revision,
    content_hash: separated.content_hash,
    record_hash: canonicalHash(separated),
    lifecycle: "open",
  },
  partition: {
    separated_review_member_id: body.review_member_id,
    retained_review_member_ids: [source.content.members[0].review_member_id],
    semantic_unit: "exact_review_member_unchanged",
    atomicity: "existing_change_sets_retained_without_cross_partition_unit",
  },
  preservation: {
    prior_review_revision: "retained",
    review_member_identities: "retained_exactly_once",
    working_candidates: "retained_unchanged",
    working_relationships: "retained_unchanged",
    profile_records: "retained_unchanged",
    basis_and_provenance: "retained_unchanged",
    validation_records: "retained_unchanged",
    change_sets: "retained_unchanged_atomic_boundaries",
    approvals: "retained_unchanged",
    command_events: "retained_unchanged",
    projection_receipts: "retained_unchanged",
    member_outcomes: "retained_derived_from_existing_authority",
  },
  authority_boundary: {
    review_membership: "separated_explicitly",
    review_decision: "none",
    candidate_authority: "none",
    validation_authority: "none",
    change_set_authority: "none",
    approval_authority: "none",
    domain_authority: "unchanged",
    domain_event_effect: "none",
    projection_effect: "none",
    recovery_effect: "none",
  },
};
const receipt: PetraReviewSessionSeparationReceipt = {
  schema_name: "petra.review-session-separation-receipt",
  schema_version: "1.0.0",
  review_session_separation_receipt_id:
    "review_separation_receipt_01K4F000000000000000000410",
  revision: 1,
  project_id: original.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: "2026-09-12T23:40:00.000Z",
};

const path = `/api/commands/projects/${original.project_id}/reviews/${original.review_session_id}/separation`;
const request = (payload: unknown, query = ""): Request =>
  new Request(`http://petra.local${path}${query}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const resolvedPrincipal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: structuredClone(original.created_by),
      capabilityGrantId: receipt.content.command_ref.capability_grant_id,
    }),
};

describe("ReviewSession separation command route", () => {
  it("builds the governed envelope from compact input and authenticated authority", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ReviewSessionSeparationCommandEnvelope | undefined;
    const authority: ReviewSessionSeparationAuthorityRepository = {
      executeReviewSessionSeparationCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        const responseReceipt = structuredClone(receipt);
        responseReceipt.content.command_ref.correlation_id =
          envelope.correlation_id;
        responseReceipt.content.command_ref.actor = structuredClone(
          envelope.actor,
        );
        responseReceipt.content_hash = canonicalHash(responseReceipt.content);
        return Promise.resolve({
          receipt: responseReceipt,
          sourceReviewSession: structuredClone(source),
          separatedReviewSession: structuredClone(separated),
          applied: true,
        });
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedInput = input;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      reviewSessionSeparationAuthority: authority,
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(200);
    expect(resolvedInput).toEqual({
      projectId: original.project_id,
      commandName: "SeparateReviewSessionMember",
    });
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.9.0",
        command_id: body.command_id,
        idempotency_key: body.idempotency_key,
        project_id: original.project_id,
        actor: original.created_by,
        capability_grant_id: receipt.content.command_ref.capability_grant_id,
        command: {
          command_name: "SeparateReviewSessionMember",
          expected_review_session_ref: body.expected_review_session_ref,
          review_member_id: body.review_member_id,
        },
      }),
    );
  });

  it("rejects request-carried authority, destination identity, mismatch, and query controls", async () => {
    let resolutionAttempted = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return resolvedPrincipal.resolveCommandPrincipal({
            projectId: original.project_id,
            commandName: "SeparateReviewSessionMember",
          });
        },
      },
      reviewSessionSeparationAuthority: {
        executeReviewSessionSeparationCommand: () => {
          throw new Error("Invalid separation input reached authority.");
        },
      },
    });

    for (const candidate of [
      { ...body, actor: original.created_by },
      { ...body, capability_grant_id: "request-selected-grant" },
      {
        ...body,
        separated_review_session_id:
          "review_session_01K4F000000000000000000411",
      },
      {
        ...body,
        expected_review_session_ref: {
          ...body.expected_review_session_ref,
          lifecycle: "deferred",
        },
      },
      {
        ...body,
        expected_review_session_ref: {
          ...body.expected_review_session_ref,
          review_session_id: "review_session_01K4F000000000000000000412",
        },
      },
    ]) {
      expect((await petra.app.request(request(candidate))).status).toBe(422);
    }
    expect(
      (await (
        await petra.app.request(request(body, "?approve=true"))
      ).json()) as { error: { code: string } },
    ).toMatchObject({
      error: { code: "REVIEW_SESSION_SEPARATION_COMMAND_INVALID" },
    });
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed without an active separation grant", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          }),
      },
      reviewSessionSeparationAuthority: {
        executeReviewSessionSeparationCommand: () => {
          throw new Error("Denied separation executed.");
        },
      },
    });

    expect((await petra.app.request(request(body))).status).toBe(403);
  });

  it("preserves typed separation failure status", async () => {
    const cases: readonly [
      ReviewSessionSeparationAuthorityErrorCode,
      number,
    ][] = [
      ["REVIEW_SESSION_SEPARATION_COMMAND_NOT_AUTHORIZED", 403],
      ["REVIEW_SESSION_SEPARATION_SESSION_NOT_FOUND", 404],
      ["REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED", 422],
      ["REVIEW_SESSION_SEPARATION_MEMBER_NOT_SEPARABLE", 422],
      ["REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE", 422],
      ["REVIEW_SESSION_SEPARATION_STALE_SESSION", 409],
      ["REVIEW_SESSION_SEPARATION_STORED_RECORD_CORRUPT", 503],
    ];
    for (const [code, expectedStatus] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        reviewSessionSeparationAuthority: {
          executeReviewSessionSeparationCommand: () =>
            Promise.reject(
              new ReviewSessionSeparationAuthorityError(code, code),
            ),
        },
      });
      const response = await petra.app.request(request(body));
      expect(response.status).toBe(expectedStatus);
      expect(
        (await response.json()) as { error: { code: string } },
      ).toMatchObject({ error: { code } });
    }
  });
});
