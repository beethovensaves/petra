import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import {
  ReviewSessionRefreshAuthorityError,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewSessionRefreshAuthorityErrorCode,
  type ReviewSessionRefreshAuthorityRepository,
  type ReviewSessionRefreshCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "review-session-refresh-command-token";

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
const refreshedSession = structuredClone(session);
refreshedSession.revision += 1;
refreshedSession.content.snapshot.event_position += 1;
refreshedSession.content.snapshot.stream_revision += 1;
refreshedSession.content.snapshot.captured_at = "2026-09-12T20:00:00.000Z";
refreshedSession.content_hash = canonicalHash(refreshedSession.content);
refreshedSession.updated_at = "2026-09-12T20:00:00.000Z";

const body = {
  command_id: "command_01K4D000000000000000000091",
  idempotency_key: "review-session:001:refresh:route:v1",
  expected_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    lifecycle: "open",
  },
} as const;

const receiptContent: PetraReviewSessionRefreshReceipt["content"] = {
  command_ref: {
    command_id: body.command_id,
    idempotency_key: body.idempotency_key,
    command_name: "RefreshReviewSession",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(session.created_by),
    capability_grant_id: "capability_grant_01K4D000000000000000000092",
    correlation_id: "trace_01K4D000000000000000000093",
  },
  prior_review_session_ref: {
    ...body.expected_review_session_ref,
    record_hash: canonicalHash(session),
  },
  resulting_review_session_ref: {
    review_session_id: refreshedSession.review_session_id,
    revision: refreshedSession.revision,
    content_hash: refreshedSession.content_hash,
    record_hash: canonicalHash(refreshedSession),
    lifecycle: "open",
  },
  transition: "refreshed",
  refresh_basis: {
    selection_basis: "same_review_members_current_working_heads",
    prior_snapshot: {
      event_position: session.content.snapshot.event_position,
      stream_revision: session.content.snapshot.stream_revision,
      captured_at: session.content.snapshot.captured_at,
    },
    resulting_snapshot: {
      event_position: refreshedSession.content.snapshot.event_position,
      stream_revision: refreshedSession.content.snapshot.stream_revision,
      captured_at: refreshedSession.content.snapshot.captured_at,
    },
    members: refreshedSession.content.members.map((member) => ({
      review_member_id: member.review_member_id,
      candidate_ref: structuredClone(member.working_state.candidate_ref),
      relationship_refs: structuredClone(
        member.working_state.relationship_refs,
      ),
    })) as PetraReviewSessionRefreshReceipt["content"]["refresh_basis"]["members"],
  },
  preservation: {
    stale_review_revision: "retained",
    review_members: "retained_same_identity",
    working_candidates: "retained",
    working_relationships: "retained",
    validation_records: "retained_unchanged",
    change_sets: "retained_unchanged",
    approvals: "retained_unchanged",
    command_events: "retained_unchanged",
    projection_receipts: "retained_unchanged",
  },
  authority_boundary: {
    review_decision: "none",
    domain_authority: "unchanged",
    candidate_authority: "none",
    validation_authority: "none",
    change_set_authority: "none",
    approval_authority: "none",
    domain_event_effect: "none",
    projection_effect: "none",
  },
};
const receipt: PetraReviewSessionRefreshReceipt = {
  schema_name: "petra.review-session-refresh-receipt",
  schema_version: "1.0.0",
  review_session_refresh_receipt_id:
    "review_session_refresh_receipt_01K4D000000000000000000094",
  revision: 1,
  project_id: session.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: refreshedSession.updated_at,
};

const path = `/api/commands/projects/${session.project_id}/reviews/${session.review_session_id}/refresh`;
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
      actor: structuredClone(session.created_by),
      capabilityGrantId: receipt.content.command_ref.capability_grant_id,
    }),
};

describe("ReviewSession refresh command route", () => {
  it("builds the governed refresh envelope from authenticated authority", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ReviewSessionRefreshCommandEnvelope | undefined;
    const authority: ReviewSessionRefreshAuthorityRepository = {
      executeReviewSessionRefreshCommand: (envelope) => {
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
          reviewSession: structuredClone(refreshedSession),
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
      reviewSessionRefreshAuthority: authority,
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(200);
    expect(resolvedInput).toEqual({
      projectId: session.project_id,
      commandName: "RefreshReviewSession",
    });
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.5.0",
        command_id: body.command_id,
        idempotency_key: body.idempotency_key,
        project_id: session.project_id,
        actor: session.created_by,
        capability_grant_id: receipt.content.command_ref.capability_grant_id,
        command: {
          command_name: "RefreshReviewSession",
          expected_review_session_ref: body.expected_review_session_ref,
        },
      }),
    );
  });

  it("rejects request-carried authority, member selection, mismatch, and query controls", async () => {
    let resolutionAttempted = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return resolvedPrincipal.resolveCommandPrincipal({
            projectId: session.project_id,
            commandName: "RefreshReviewSession",
          });
        },
      },
      reviewSessionRefreshAuthority: {
        executeReviewSessionRefreshCommand: () => {
          throw new Error("Invalid refresh input reached authority.");
        },
      },
    });

    for (const candidate of [
      { ...body, actor: session.created_by },
      { ...body, capability_grant_id: "request-selected-grant" },
      { ...body, member_ids: [session.content.members[0].review_member_id] },
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
          review_session_id: "review_session_01K4D000000000000000000099",
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
      error: { code: "REVIEW_SESSION_REFRESH_COMMAND_INVALID" },
    });
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed without an active refresh grant", async () => {
    let resolvedCommandName: string | undefined;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedCommandName = input.commandName;
          return Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          });
        },
      },
      reviewSessionRefreshAuthority: {
        executeReviewSessionRefreshCommand: () => {
          throw new Error("Denied refresh executed.");
        },
      },
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(403);
    expect(resolvedCommandName).toBe("RefreshReviewSession");
  });

  it("preserves refresh authority error status", async () => {
    const cases: readonly [ReviewSessionRefreshAuthorityErrorCode, number][] = [
      ["REVIEW_SESSION_REFRESH_COMMAND_NOT_AUTHORIZED", 403],
      ["REVIEW_SESSION_REFRESH_SESSION_NOT_FOUND", 404],
      ["REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED", 422],
      ["REVIEW_SESSION_REFRESH_STALE_SESSION", 409],
      ["REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION", 409],
      ["REVIEW_SESSION_REFRESH_NOT_REQUIRED", 409],
      ["REVIEW_SESSION_REFRESH_STORED_RECORD_CORRUPT", 503],
    ];
    for (const [code, expectedStatus] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        reviewSessionRefreshAuthority: {
          executeReviewSessionRefreshCommand: () =>
            Promise.reject(new ReviewSessionRefreshAuthorityError(code, code)),
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
