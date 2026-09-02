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
import {
  DurableReviewInterruptCoordinator,
  InMemoryEvidenceRegistry,
  InMemoryInteractionRecordRegistry,
  PetraInteractionRuntime,
  admitEvidenceProposalBundle,
  buildReviewDecisionCommandPlan,
  type ReviewActorRef,
  type ReviewInterruptRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";

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

export const REVIEW_FIXTURE_ACTOR = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};
export const REVIEW_FIXTURE_CAPABILITY =
  "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FDF";

export const createDurableReviewFixture = (authorized = true) => {
  const source = readFixture<PetraDocumentParseBundle>("document-parse-bundle");
  const proposal = readFixture<PetraEvidenceProposalBundle>(
    "evidence-proposal-bundle",
  );
  const candidate = proposal.content.candidates[0];
  const evidence = new InMemoryEvidenceRegistry(
    {
      getSourceSpan: (id) =>
        source.spans.find((span) => span.source_span_id === id),
      getParsedDocument: (id) =>
        source.document.parsed_document_id === id ? source.document : undefined,
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
    actor: ReviewActorRef;
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
  const plan = buildPlan({
    decision: "accepted",
    rationale: response.rationale,
    decided_at: response.decided_at,
    actor: REVIEW_FIXTURE_ACTOR,
    capability_grant_id: REVIEW_FIXTURE_CAPABILITY,
  });

  const interactions = new InMemoryInteractionRecordRegistry();
  interactions.registerFeatureManifest(
    readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    ),
  );
  interactions.registerRun(readFixture<PetraInteractionRun>("interaction-run"));
  interactions.appendEvent(
    readFixture<PetraInteractionEventRecord>("interaction-event-record"),
  );
  const pending = readFixture<PetraInteractionInterrupt>(
    "interaction-interrupt-pending",
  );
  if (pending.content.state !== "pending") {
    throw new Error("Expected a pending interaction fixture.");
  }
  pending.content.subject_refs = [plan.change_set.change_set_id];
  pending.content.response_schema_ref = {
    schema_name: "review-interrupt-response",
    schema_version: "1.0.0",
    content_hash:
      "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
  };
  pending.content_hash = canonicalHash(pending.content);
  interactions.registerInterrupt(pending);

  response.interrupt_ref = {
    interaction_interrupt_id: pending.interaction_interrupt_id,
    revision: pending.revision,
    content_hash: pending.content_hash,
  };
  response.change_set_ref = {
    change_set_id: plan.change_set.change_set_id,
    revision: plan.change_set.revision,
    content_hash: plan.change_set.content_hash,
  };
  const repository: ReviewInterruptRepository = {
    getRunRevision: (id, revision) => {
      const value = interactions.getRun(id, revision);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionRun);
    },
    getInterrupt: (id) => {
      const value = interactions.getInterrupt(id);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionInterrupt);
    },
    getInterruptRevision: (id, revision) => {
      const value = interactions.getInterruptRevision(id, revision);
      return value === undefined
        ? undefined
        : (structuredClone(value) as PetraInteractionInterrupt);
    },
    registerInterrupt: (value) =>
      structuredClone(
        interactions.registerInterrupt(value),
      ) as PetraInteractionInterrupt,
  };
  const coordinator = new DurableReviewInterruptCoordinator({
    repository,
    executor: evidence,
    payloads: {
      recordResponse: (value) => {
        const bytes = new TextEncoder().encode(canonicalize(value));
        return {
          artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDK",
          content_sha256: canonicalHash(value),
          byte_size: bytes.byteLength,
          media_type: "application/json",
        };
      },
    },
    authorizer: { authorize: () => authorized },
    serviceActor: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    },
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
      actor: REVIEW_FIXTURE_ACTOR,
      capability_grant_id: REVIEW_FIXTURE_CAPABILITY,
    },
    buildPlan,
  });

  return {
    candidate,
    coordinator,
    evidence,
    interactions,
    response,
    runtime: new PetraInteractionRuntime({ reviewBoundary: coordinator }),
  };
};
