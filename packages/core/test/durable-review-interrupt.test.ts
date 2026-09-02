import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionRun,
  PetraReviewInterruptResponse,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  DurableReviewInterruptCoordinator,
  type ReviewInterruptRepository,
} from "../src/durable-review-interrupt.js";
import { admitEvidenceProposalBundle } from "../src/evidence-proposal-admission.js";
import { InMemoryEvidenceRegistry } from "../src/evidence-registry.js";
import { buildReviewDecisionCommandPlan } from "../src/evidence-review.js";
import { InMemoryInteractionRecordRegistry } from "../src/interaction-record-registry.js";

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

const HUMAN = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};
const SERVICE = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service" as const,
};
const CAPABILITY = "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FDF";

const setup = (authorized = true) => {
  const source = readFixture<PetraDocumentParseBundle>("document-parse-bundle");
  const proposal = readFixture<PetraEvidenceProposalBundle>(
    "evidence-proposal-bundle",
  );
  const candidate = proposal.content.candidates[0];
  const evidence = new InMemoryEvidenceRegistry(
    {
      getSourceSpan: (sourceSpanId) =>
        source.spans.find((span) => span.source_span_id === sourceSpanId),
      getParsedDocument: (parsedDocumentId) =>
        source.document.parsed_document_id === parsedDocumentId
          ? source.document
          : undefined,
    },
    { authorize: () => true },
  );
  admitEvidenceProposalBundle(proposal, source, evidence);

  const response = readFixture<PetraReviewInterruptResponse>(
    "review-interrupt-response",
  );
  const buildPlan = (input: {
    decision: "accepted" | "rejected";
    rationale: string;
    decided_at: string;
    actor: typeof HUMAN;
    capability_grant_id: string;
  }) =>
    buildReviewDecisionCommandPlan({
      project_id: response.project_id,
      candidate,
      origin: "agent_proposal",
      proposed_by: candidate.claim.created_by,
      reviewer: input.actor,
      capability_grant_id: input.capability_grant_id,
      decision: input.decision,
      reason: "Review the exact source-grounded Claim and ASSERTS pair.",
      rationale: input.rationale,
      impact_summary:
        "This decision changes representation authority, not the proposition's truth value.",
      timing: {
        proposed_at: "2026-08-29T16:00:02.000Z",
        decided_at: input.decided_at,
        applied_at: input.decided_at,
      },
    });
  const initialPlan = buildPlan({
    decision: "accepted",
    rationale: response.rationale,
    decided_at: response.decided_at,
    actor: HUMAN,
    capability_grant_id: CAPABILITY,
  });

  const interactionRecords = new InMemoryInteractionRecordRegistry();
  interactionRecords.registerFeatureManifest(
    readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    ),
  );
  interactionRecords.registerRun(
    readFixture<PetraInteractionRun>("interaction-run"),
  );
  interactionRecords.appendEvent(
    readFixture<PetraInteractionEventRecord>("interaction-event-record"),
  );
  const pending = readFixture<PetraInteractionInterrupt>(
    "interaction-interrupt-pending",
  );
  if (pending.content.state !== "pending") {
    throw new Error("Expected a pending interaction interrupt fixture.");
  }
  pending.content.subject_refs = [initialPlan.change_set.change_set_id];
  pending.content.response_schema_ref = {
    schema_name: "review-interrupt-response",
    schema_version: "1.0.0",
    content_hash:
      "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
  };
  pending.content_hash = canonicalHash(pending.content);
  interactionRecords.registerInterrupt(pending);

  response.interrupt_ref = {
    interaction_interrupt_id: pending.interaction_interrupt_id,
    revision: pending.revision,
    content_hash: pending.content_hash,
  };
  response.change_set_ref = {
    change_set_id: initialPlan.change_set.change_set_id,
    revision: initialPlan.change_set.revision,
    content_hash: initialPlan.change_set.content_hash,
  };

  const repository: ReviewInterruptRepository = {
    getRunRevision: (id, revision) => {
      const value = interactionRecords.getRun(id, revision);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionRun);
    },
    getInterrupt: (id) => {
      const value = interactionRecords.getInterrupt(id);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionInterrupt);
    },
    getInterruptRevision: (id, revision) => {
      const value = interactionRecords.getInterruptRevision(id, revision);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionInterrupt);
    },
    registerInterrupt: (value) =>
      structuredClone(
        interactionRecords.registerInterrupt(value),
      ) as PetraInteractionInterrupt,
  };
  const recordResponse = vi.fn((value: PetraReviewInterruptResponse) => {
    const bytes = new TextEncoder().encode(canonicalize(value));
    return {
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDK",
      content_sha256: canonicalHash(value),
      byte_size: bytes.byteLength,
      media_type: "application/json" as const,
    };
  });
  const coordinator = new DurableReviewInterruptCoordinator({
    repository,
    executor: evidence,
    payloads: { recordResponse },
    authorizer: { authorize: () => authorized },
    serviceActor: SERVICE,
  });
  coordinator.registerBinding({
    presentation: {
      protocol_run_id: "run-m1-fixture",
      project_id: pending.project_id,
      interaction_run_id: pending.interaction_run_ref.interaction_run_id,
      interrupt_ref: structuredClone(response.interrupt_ref),
      change_set_ref: structuredClone(response.change_set_ref),
    },
    authority_context: {
      actor: HUMAN,
      capability_grant_id: CAPABILITY,
    },
    buildPlan,
  });
  return {
    candidate,
    coordinator,
    evidence,
    interactionRecords,
    pending,
    recordResponse,
    response,
  };
};

describe("durable AG-UI review interrupt command boundary", () => {
  it("presents the exact pending ChangeSet and applies through the direct review executor", async () => {
    const { candidate, coordinator, evidence, interactionRecords, response } =
      setup();

    const presentation = await coordinator.presentReview("run-m1-fixture");
    const result = await coordinator.resolveReview(response, {
      actor: HUMAN,
      capability_grant_id: CAPABILITY,
    });

    expect(presentation.change_set_ref).toEqual(response.change_set_ref);
    expect(result).toMatchObject({
      replayed: false,
      response_recorded: true,
      result: { outcome: "applied", claim_revision: 2, assertion_revision: 2 },
    });
    expect(evidence.getClaim(candidate.claim.claim_id)?.authority.zone).toBe(
      "trusted",
    );
    expect(
      interactionRecords.getInterrupt(
        response.interrupt_ref.interaction_interrupt_id,
      )?.content,
    ).toMatchObject({
      state: "responded",
      authority_effect: "command_input_only",
      resulting_command_ref: { command_id: result.command_id },
    });
  });

  it("replays one exact response without duplicating authority effects", async () => {
    const { coordinator, evidence, response } = setup();
    const context = { actor: HUMAN, capability_grant_id: CAPABILITY };

    await coordinator.resolveReview(response, context);
    const eventCount = evidence.getEvents().length;
    const replay = await coordinator.resolveReview(response, context);

    expect(replay).toMatchObject({
      replayed: true,
      response_recorded: false,
      result: { outcome: "applied" },
    });
    expect(evidence.getEvents()).toHaveLength(eventCount);
  });

  it("rejects stale, conflicting, and unauthorized responses before another command can apply", async () => {
    const stale = setup();
    stale.response.interrupt_ref.content_hash = canonicalHash({ stale: true });
    await expect(
      stale.coordinator.resolveReview(stale.response, {
        actor: HUMAN,
        capability_grant_id: CAPABILITY,
      }),
    ).rejects.toMatchObject({ code: "REVIEW_INTERRUPT_RESPONSE_MISMATCH" });
    expect(stale.recordResponse).not.toHaveBeenCalled();
    expect(
      stale.evidence.getClaim(stale.candidate.claim.claim_id)?.authority.zone,
    ).toBe("quarantine");

    const denied = setup(false);
    await expect(
      denied.coordinator.resolveReview(denied.response, {
        actor: HUMAN,
        capability_grant_id: CAPABILITY,
      }),
    ).rejects.toMatchObject({ code: "REVIEW_INTERRUPT_UNAUTHORIZED" });
    expect(denied.recordResponse).not.toHaveBeenCalled();

    const conflict = setup();
    const context = { actor: HUMAN, capability_grant_id: CAPABILITY };
    await conflict.coordinator.resolveReview(conflict.response, context);
    const changed = structuredClone(conflict.response);
    changed.client_response_id = "review-response-conflicting";
    changed.rationale = "A conflicting second response.";
    await expect(
      conflict.coordinator.resolveReview(changed, context),
    ).rejects.toMatchObject({ code: "REVIEW_INTERRUPT_ALREADY_RESOLVED" });
    expect(conflict.evidence.getEvents()).toHaveLength(3);
  });
});
