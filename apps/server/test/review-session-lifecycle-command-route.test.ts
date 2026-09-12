import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRecord,
  PetraReviewSessionV110,
} from "@petra/contracts";
import {
  ReviewSessionLifecycleAuthorityError,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewSessionLifecycleAuthorityErrorCode,
  type ReviewSessionLifecycleAuthorityRepository,
  type ReviewSessionLifecycleCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "review-session-lifecycle-command-token";

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
const resultingSession: PetraReviewSessionRecord = {
  ...structuredClone(session),
  revision: 2,
  content: { ...structuredClone(session.content), lifecycle: "deferred" },
  updated_at: "2026-09-12T19:00:00.000Z",
};
resultingSession.content_hash = canonicalHash(resultingSession.content);

const body = {
  command_id: "command_01K4D000000000000000000050",
  idempotency_key: "review-session:001:defer:route:v1",
  requested_action: "defer",
  expected_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    lifecycle: "open",
  },
  rationale: "Wait for the author to check the material limitation.",
} as const;

const receiptContent: PetraReviewSessionLifecycleReceipt["content"] = {
  command_ref: {
    command_id: body.command_id,
    idempotency_key: body.idempotency_key,
    command_name: "DeferReviewSession",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(session.created_by),
    capability_grant_id: "capability_grant_01K4D000000000000000000051",
    correlation_id: "trace_01K4D000000000000000000052",
  },
  prior_review_session_ref: {
    ...body.expected_review_session_ref,
    record_hash: canonicalHash(session),
  },
  resulting_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: resultingSession.revision,
    content_hash: resultingSession.content_hash,
    record_hash: canonicalHash(resultingSession),
    lifecycle: "deferred",
  },
  transition: "deferred",
  rationale: body.rationale,
  preservation: {
    review_history: "retained",
    working_candidates: "retained",
    working_relationships: "retained",
    change_sets: "retained",
    approvals: "retained",
    command_events: "retained_unchanged",
    projection_receipts: "retained_unchanged",
  },
  authority_boundary: {
    review_decision: "none",
    domain_authority: "unchanged",
    change_set_authority: "none",
    validation_authority: "none",
    domain_event_effect: "none",
    projection_effect: "none",
  },
  recovery: {
    state: "available",
    inverse_command_name: "ReopenReviewSession",
    expected_review_session_ref: {
      review_session_id: session.review_session_id,
      revision: resultingSession.revision,
      content_hash: resultingSession.content_hash,
      record_hash: canonicalHash(resultingSession),
      lifecycle: "deferred",
    },
  },
};
const receipt: PetraReviewSessionLifecycleReceipt = {
  schema_name: "petra.review-session-lifecycle-receipt",
  schema_version: "1.0.0",
  review_session_lifecycle_receipt_id:
    "review_session_lifecycle_receipt_01K4D000000000000000000053",
  revision: 1,
  project_id: session.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: resultingSession.updated_at,
};

const path = `/api/commands/projects/${session.project_id}/reviews/${session.review_session_id}/lifecycle`;
const request = (payload: unknown, suffix = ""): Request =>
  new Request(`http://petra.local${path}${suffix}`, {
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

describe("ReviewSession lifecycle command route", () => {
  it("builds the governed defer envelope from authenticated server authority", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ReviewSessionLifecycleCommandEnvelope | undefined;
    const authority: ReviewSessionLifecycleAuthorityRepository = {
      executeReviewSessionLifecycleCommand: (envelope) => {
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
          reviewSession: structuredClone(resultingSession),
          applied: true,
        });
      },
      getReviewSessionLifecycleReceipt: () => Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedInput = input;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      reviewSessionLifecycleAuthority: authority,
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as {
      receipt: PetraReviewSessionLifecycleReceipt;
      review_session: PetraReviewSessionRecord;
      applied: boolean;
    };
    expect(responseBody.review_session).toEqual(resultingSession);
    expect(responseBody.applied).toBe(true);
    expect(resolvedInput).toEqual({
      projectId: session.project_id,
      commandName: "DeferReviewSession",
    });
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.4.0",
        command_id: body.command_id,
        idempotency_key: body.idempotency_key,
        project_id: session.project_id,
        actor: session.created_by,
        capability_grant_id: receipt.content.command_ref.capability_grant_id,
        command: {
          command_name: "DeferReviewSession",
          expected_review_session_ref: body.expected_review_session_ref,
          rationale: body.rationale,
        },
      }),
    );
  });

  it("rejects request-carried identity, invalid direction, and query controls", async () => {
    let resolutionAttempted = false;
    const authority: ReviewSessionLifecycleAuthorityRepository = {
      executeReviewSessionLifecycleCommand: () => {
        throw new Error("Invalid input reached command execution.");
      },
      getReviewSessionLifecycleReceipt: () => Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return resolvedPrincipal.resolveCommandPrincipal({
            projectId: session.project_id,
            commandName: "DeferReviewSession",
          });
        },
      },
      reviewSessionLifecycleAuthority: authority,
    });

    for (const candidate of [
      { ...body, actor: session.created_by },
      { ...body, capability_grant_id: "request-selected-grant" },
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
      const response = await petra.app.request(request(candidate));
      expect(response.status).toBe(422);
    }
    expect(
      (await (
        await petra.app.request(request(body, "?approved=true"))
      ).json()) as { error: { code: string } },
    ).toMatchObject({
      error: { code: "REVIEW_SESSION_LIFECYCLE_COMMAND_INVALID" },
    });
    expect(resolutionAttempted).toBe(false);
  });

  it("resolves reopen independently and fails closed without an active grant", async () => {
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
      reviewSessionLifecycleAuthority: {
        executeReviewSessionLifecycleCommand: () => {
          throw new Error("Denied reopen executed.");
        },
        getReviewSessionLifecycleReceipt: () => Promise.resolve(undefined),
      },
    });
    const reopenBody = {
      command_id: "command_01K4D000000000000000000054",
      idempotency_key: "review-session:001:reopen:route:v1",
      requested_action: "reopen",
      expected_review_session_ref: receipt.content.resulting_review_session_ref,
    } as const;
    const requestBody = {
      ...reopenBody,
      expected_review_session_ref: {
        review_session_id:
          reopenBody.expected_review_session_ref.review_session_id,
        revision: reopenBody.expected_review_session_ref.revision,
        content_hash: reopenBody.expected_review_session_ref.content_hash,
        lifecycle: "deferred",
      },
    } as const;

    const response = await petra.app.request(request(requestBody));

    expect(response.status).toBe(403);
    expect(resolvedCommandName).toBe("ReopenReviewSession");
  });

  it("preserves authority, stale, transition, and corruption error status", async () => {
    const cases: readonly [ReviewSessionLifecycleAuthorityErrorCode, number][] =
      [
        ["REVIEW_SESSION_LIFECYCLE_COMMAND_NOT_AUTHORIZED", 403],
        ["REVIEW_SESSION_LIFECYCLE_SESSION_NOT_FOUND", 404],
        ["REVIEW_SESSION_LIFECYCLE_STALE_SESSION", 409],
        ["REVIEW_SESSION_LIFECYCLE_TRANSITION_INVALID", 409],
        ["REVIEW_SESSION_LIFECYCLE_STORED_RECORD_CORRUPT", 503],
      ];
    for (const [code, expectedStatus] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        reviewSessionLifecycleAuthority: {
          executeReviewSessionLifecycleCommand: () =>
            Promise.reject(
              new ReviewSessionLifecycleAuthorityError(code, code),
            ),
          getReviewSessionLifecycleReceipt: () => Promise.resolve(undefined),
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
