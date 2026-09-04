import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraArtifact,
  PetraAssertion,
  PetraClaim,
  PetraCommandEnvelope,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionRun,
  PetraParsedDocument,
  PetraSourceSpan,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraWorkUnit,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  InMemoryContextPacketRegistry,
  type PacketRecord,
} from "../src/context-packet-registry.js";
import {
  InMemoryEvidenceRegistry,
  type EvidenceSourceResolver,
} from "../src/evidence-registry.js";
import {
  buildCompensatingReversalCommandPlan,
  executeCompensatingReversalPlan,
} from "../src/evidence-review.js";
import {
  groundedResponseCacheKey,
  InMemoryGroundedResponseRegistry,
  type RegisterGroundedResponseInput,
} from "../src/grounded-response-registry.js";

const RESPONSE_TEXT =
  "H01 — The selected study reports a measurable improvement on its evaluation task.\n\nThe claim is limited to its study-defined evaluation task.";

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

const makePacketRecords = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEventRecord>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected an applied authority event fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const makePackets = (): {
  registry: InMemoryContextPacketRegistry;
  evidence: PetraEvidencePacket;
} => {
  const registry = new InMemoryContextPacketRegistry();
  const context =
    readFixture<
      Parameters<InMemoryContextPacketRegistry["registerContextPacket"]>[0]
    >("context-packet");
  const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
  registry.registerContextPacket(context, makePacketRecords());
  registry.registerEvidencePacket(evidence);
  return { registry, evidence };
};

const makeTerminalInteraction = (
  request: PetraSynthesistModelRequest,
  workUnit: PetraWorkUnit,
): PetraInteractionRun => {
  const initial = readFixture<PetraInteractionRun>("interaction-run");
  const terminal = structuredClone(initial);
  terminal.revision = 2;
  terminal.lineage = {
    lineage_kind: "revision",
    parent_revision: initial.revision,
    parent_hash: initial.content_hash,
  };
  terminal.content.correlation.work_unit_ref = {
    work_unit_id: workUnit.work_unit_id,
    revision: workUnit.revision,
    spec_hash: workUnit.spec_hash,
  };
  terminal.content.correlation.model_request_id = request.model_request_id;
  terminal.content.lifecycle = {
    state: "completed",
    started_at: initial.content.lifecycle.started_at,
    ended_at: "2026-09-04T01:59:59.000Z",
    outcome_code: "GROUNDED_RESPONSE_READY",
  };
  terminal.updated_at = "2026-09-04T01:59:59.000Z";
  terminal.content_hash = canonicalHash(terminal.content);
  return terminal;
};

const makeRegistration = (): {
  registry: InMemoryGroundedResponseRegistry;
  input: RegisterGroundedResponseInput;
} => {
  const { registry: packets, evidence } = makePackets();
  const request = readFixture<PetraSynthesistModelRequest>(
    "model-request-synthesist",
  );
  const call = readFixture<PetraSynthesistModelCall>("model-call-synthesist");
  const workUnit = readFixture<PetraWorkUnit>("work-unit-completed");
  if (
    request.content.terminal.state !== "completed" ||
    call.content.output === undefined
  ) {
    throw new Error("Expected successful synthesist fixtures.");
  }
  request.content.terminal.output_hash = canonicalHash(call.content.output);
  call.content_hash = canonicalHash(call.content);
  request.content_hash = canonicalHash(request.content);
  const cacheKey = groundedResponseCacheKey(request, evidence);
  workUnit.spec.workflow_name = "petra.synthesis.grounded";
  workUnit.spec.workflow_version = "1.0.0";
  workUnit.spec.objective = request.content.objective;
  workUnit.spec.work_mode = "interactive";
  workUnit.spec.priority = "user_blocking";
  workUnit.spec.idempotency_key = `work:${cacheKey}`;
  workUnit.spec.cache = {
    cache_mode: "reuse_exact",
    cache_key: cacheKey,
  };
  workUnit.spec_hash = canonicalHash(workUnit.spec);
  const interaction = makeTerminalInteraction(request, workUnit);
  const response = readFixture<PetraGroundedResponse>("grounded-response");
  response.content.interaction_ref.interaction_run_ref.content_hash =
    interaction.content_hash;
  response.content.interaction_ref.work_unit_ref = {
    work_unit_id: workUnit.work_unit_id,
    revision: workUnit.revision,
    spec_hash: workUnit.spec_hash,
  };
  response.content.model_output_hash = request.content.terminal.output_hash;
  response.content.cache.cache_key = cacheKey;
  response.content_hash = canonicalHash(response.content);
  const bytes = new TextEncoder().encode(RESPONSE_TEXT);
  const artifact: PetraArtifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: response.content.response_artifact_ref.artifact_id,
    revision: 1,
    artifact_kind: "run_output",
    media_type: response.content.response_artifact_ref.media_type,
    content_hash: response.content.response_artifact_ref.content_hash,
    byte_size: response.content.response_artifact_ref.byte_size,
    created_by: structuredClone(response.recorded_by),
    created_at: "2026-09-04T01:59:59.500Z",
  };
  return {
    registry: new InMemoryGroundedResponseRegistry(packets),
    input: {
      response,
      responseArtifact: artifact,
      responseBytes: bytes,
      modelRequest: request,
      modelCall: call,
      interactionRun: interaction,
      workUnit,
    },
  };
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

const makeReversalEvent = async (): Promise<PetraDomainEventRecord> => {
  const claim = readFixture<PetraClaim>("claim");
  const assertion = readFixture<PetraAssertion>("assertion");
  const span = readFixture<PetraSourceSpan>("source-span");
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const submit = readFixture<PetraCommandEnvelope>("command-submit-change-set");
  const review = readFixture<PetraCommandEnvelope>("command-record-approval");
  const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
  const resolver: EvidenceSourceResolver = {
    getSourceSpan: (id) => (id === span.source_span_id ? span : undefined),
    getParsedDocument: (id) =>
      id === document.parsed_document_id ? document : undefined,
  };
  const authority = new InMemoryEvidenceRegistry(resolver, {
    authorize: () => true,
  });
  authority.proposeEvidencePair({ claim, assertion });
  authority.executeCommand(submit);
  authority.executeCommand(review);
  const promoted = authority.executeCommand(apply);
  if (
    promoted.outcome !== "applied" ||
    submit.command.command_name !== "SubmitChangeSet" ||
    review.command.command_name !== "RecordApproval"
  ) {
    throw new Error("Expected the accepted promotion fixture pipeline.");
  }
  const trustedClaim = authority.getClaim(claim.claim_id);
  const trustedAssertion = authority.getAssertion(assertion.assertion_id);
  if (trustedClaim === undefined || trustedAssertion === undefined) {
    throw new Error("Expected promoted scientific records.");
  }
  const plan = buildCompensatingReversalCommandPlan({
    project_id: submit.project_id,
    claim: structuredClone(trustedClaim) as PetraClaim,
    assertion: structuredClone(trustedAssertion) as PetraAssertion,
    compensates_change_set_id: promoted.change_set_id,
    proposed_by: review.command.approval.decided_by,
    reviewer: review.command.approval.decided_by,
    capability_grant_id: submit.capability_grant_id,
    reason: "The direct evidence review was corrected by the researcher.",
    rationale: "Invalidate derivatives without erasing scientific history.",
    impact_summary: "The Claim and its ASSERTS edge leave active authority.",
    timing: {
      proposed_at: "2026-09-04T02:01:00.000Z",
      decided_at: "2026-09-04T02:02:00.000Z",
      applied_at: "2026-09-04T02:03:00.000Z",
    },
  });
  await executeCompensatingReversalPlan(authority, plan);
  const event = authority.getEvents().at(-1);
  if (event?.event.event_type !== "change_set.reverted") {
    throw new Error("Expected the compensating reversal event.");
  }
  return structuredClone(event) as PetraDomainEventRecord;
};

describe("grounded response registration and authority invalidation", () => {
  it("registers exact terminal output immutably and replays idempotently", () => {
    const { registry, input } = makeRegistration();
    const first = registry.register(input);
    const replay = registry.register(structuredClone(input));

    expect(replay).toBe(first);
    expect(registry.size).toBe(1);
    expect(registry.revisionCount).toBe(1);
    expect(registry.getReusableByCacheKey(first.content.cache.cache_key)).toBe(
      first,
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.content.dependencies)).toBe(true);
    input.response.content.model_output_hash =
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    expect(first.content.model_output_hash).not.toBe(
      input.response.content.model_output_hash,
    );
  });

  it("keeps per-interaction WorkUnit caching separate from response reuse", () => {
    const { registry, input } = makeRegistration();
    input.workUnit.spec.cache = { cache_mode: "disabled" };
    input.workUnit.spec_hash = canonicalHash(input.workUnit.spec);
    input.interactionRun.content.correlation.work_unit_ref.spec_hash =
      input.workUnit.spec_hash;
    input.interactionRun.content_hash = canonicalHash(
      input.interactionRun.content,
    );
    input.response.content.interaction_ref.work_unit_ref.spec_hash =
      input.workUnit.spec_hash;
    input.response.content.interaction_ref.interaction_run_ref.content_hash =
      input.interactionRun.content_hash;
    input.response.content_hash = canonicalHash(input.response.content);

    const stored = registry.register(input);
    expect(input.workUnit.spec.cache.cache_mode).toBe("disabled");
    expect(stored.content.cache.state).toBe("reusable");
  });

  it("rejects mismatched immutable response bytes atomically", () => {
    const { registry, input } = makeRegistration();
    const mismatched = {
      ...input,
      responseBytes: new TextEncoder().encode(`${RESPONSE_TEXT}!`),
    };

    expectCode(
      () => registry.register(mismatched),
      "GROUNDED_RESPONSE_ARTIFACT_BYTES_MISMATCH",
    );
    expect(registry.size).toBe(0);
    expect(registry.revisionCount).toBe(0);
  });

  it("rejects hidden evidence dependency omissions atomically", () => {
    const { registry, input } = makeRegistration();
    input.response.content.dependencies.pop();
    input.response.content_hash = canonicalHash(input.response.content);

    expectCode(
      () => registry.register(input),
      "GROUNDED_RESPONSE_DEPENDENCY_MISMATCH",
    );
    expect(registry.size).toBe(0);
  });

  it("rejects model and interaction bindings that are merely similar", () => {
    const first = makeRegistration();
    first.input.response.content.execution_ref.model_call_id =
      "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    first.input.response.content_hash = canonicalHash(
      first.input.response.content,
    );
    expectCode(
      () => first.registry.register(first.input),
      "GROUNDED_RESPONSE_MODEL_CALL_MISMATCH",
    );

    const second = makeRegistration();
    second.input.interactionRun.content.lifecycle = {
      state: "running",
      started_at: "2026-09-04T01:59:59.000Z",
    };
    second.input.interactionRun.content_hash = canonicalHash(
      second.input.interactionRun.content,
    );
    second.input.response.content.interaction_ref.interaction_run_ref.content_hash =
      second.input.interactionRun.content_hash;
    second.input.response.content_hash = canonicalHash(
      second.input.response.content,
    );
    expectCode(
      () => second.registry.register(second.input),
      "GROUNDED_RESPONSE_INTERACTION_MISMATCH",
    );
  });

  it("creates an invalidated revision after a later compensating reversal", async () => {
    const { registry, input } = makeRegistration();
    const original = registry.register(input);
    const reversal = await makeReversalEvent();
    const [invalidated] = registry.invalidateByAuthorityEvent(reversal);

    expect(invalidated).toEqual(
      expect.objectContaining({
        grounded_response_id: original.grounded_response_id,
        revision: 2,
        lineage: {
          lineage_kind: "revision",
          parent_revision: 1,
          parent_hash: original.content_hash,
        },
      }),
    );
    expect(invalidated?.content.cache.state).toBe("invalidated");
    if (invalidated?.content.cache.state !== "invalidated") {
      throw new Error("Expected an invalidated response revision.");
    }
    expect(invalidated.content.cache.affected_dependency_ids).toContain(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
    );
    expect(invalidated.content.cache.affected_dependency_ids).toContain(
      "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
    );
    expect(invalidated?.content.response_artifact_ref).toEqual(
      original.content.response_artifact_ref,
    );
    expect(registry.getRevision(original.grounded_response_id, 1)).toBe(
      original,
    );
    expect(
      registry.getReusableByCacheKey(original.content.cache.cache_key),
    ).toBeUndefined();
    expect(registry.revisionCount).toBe(2);
    expect(registry.register(structuredClone(input))).toBe(original);
    expect(registry.revisionCount).toBe(2);
  });

  it("replays an authority event exactly and rejects conflicting event identity", async () => {
    const { registry, input } = makeRegistration();
    registry.register(input);
    const reversal = await makeReversalEvent();
    const first = registry.invalidateByAuthorityEvent(reversal);
    const replay = registry.invalidateByAuthorityEvent(
      structuredClone(reversal),
    );

    expect(replay).toBe(first);
    expect(registry.revisionCount).toBe(2);

    const conflict = structuredClone(reversal);
    conflict.correlation_id = "trace_01ARZ3NDEKTSV4RRFFQ69G5FBM";
    expectCode(
      () => registry.invalidateByAuthorityEvent(conflict),
      "GROUNDED_RESPONSE_AUTHORITY_EVENT_CONFLICT",
    );
    expect(registry.revisionCount).toBe(2);
  });

  it("keeps cache reuse for unrelated or pre-snapshot authority events", async () => {
    const unrelated = makeRegistration();
    const unrelatedOriginal = unrelated.registry.register(unrelated.input);
    const unrelatedEvent = await makeReversalEvent();
    unrelatedEvent.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FBP";
    unrelatedEvent.stream_id = unrelatedEvent.project_id;

    expect(
      unrelated.registry.invalidateByAuthorityEvent(unrelatedEvent),
    ).toEqual([]);
    expect(
      unrelated.registry.getReusableByCacheKey(
        unrelatedOriginal.content.cache.cache_key,
      ),
    ).toBe(unrelatedOriginal);

    const old = makeRegistration();
    const oldOriginal = old.registry.register(old.input);
    const oldEvent = await makeReversalEvent();
    oldEvent.event_position = oldOriginal.content.snapshot_ref.event_position;
    oldEvent.stream_revision = oldEvent.event_position;

    expect(old.registry.invalidateByAuthorityEvent(oldEvent)).toEqual([]);
    expect(
      old.registry.getReusableByCacheKey(oldOriginal.content.cache.cache_key),
    ).toBe(oldOriginal);
  });
});
