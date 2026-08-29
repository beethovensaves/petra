import { readFileSync } from "node:fs";

import type {
  PetraApproval,
  PetraAssertion,
  PetraChangeSet,
  PetraClaim,
  PetraCommandEnvelope,
  PetraParsedDocument,
  PetraSourceSpan,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  ChangeControlError,
  InMemoryEvidenceRegistry,
  type DomainRecordFactory,
  type EvidenceSourceResolver,
} from "../src/evidence-registry.js";

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

interface CommandPipeline {
  submit: PetraCommandEnvelope;
  review: PetraCommandEnvelope;
  apply: PetraCommandEnvelope;
}

const commandPipeline = (): CommandPipeline => ({
  submit: readFixture<PetraCommandEnvelope>("command-submit-change-set"),
  review: readFixture<PetraCommandEnvelope>("command-record-approval"),
  apply: readFixture<PetraCommandEnvelope>("command-apply-change-set"),
});

const submittedChangeSet = (envelope: PetraCommandEnvelope): PetraChangeSet => {
  if (envelope.command.command_name !== "SubmitChangeSet") {
    throw new Error("Expected a SubmitChangeSet fixture.");
  }
  return envelope.command.change_set;
};

const recordedApproval = (envelope: PetraCommandEnvelope): PetraApproval => {
  if (envelope.command.command_name !== "RecordApproval") {
    throw new Error("Expected a RecordApproval fixture.");
  }
  return envelope.command.approval;
};

const alternatePipeline = (): CommandPipeline => {
  const pipeline = commandPipeline();
  const changeSet = submittedChangeSet(pipeline.submit);
  changeSet.change_set_id = "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBP";
  pipeline.submit.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FBR";
  pipeline.submit.idempotency_key = "review:claim-fbb:submit:alternate";

  const approval = recordedApproval(pipeline.review);
  approval.approval_id = "approval_01ARZ3NDEKTSV4RRFFQ69G5FBQ";
  approval.subject.change_set_id = changeSet.change_set_id;
  pipeline.review.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FBS";
  pipeline.review.idempotency_key = "review:claim-fbb:approval:alternate";
  pipeline.review.causation_id = pipeline.submit.command_id;

  if (pipeline.apply.command.command_name !== "ApplyChangeSet") {
    throw new Error("Expected an ApplyChangeSet fixture.");
  }
  pipeline.apply.command.change_set_id = changeSet.change_set_id;
  pipeline.apply.command.approval_id = approval.approval_id;
  pipeline.apply.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FBT";
  pipeline.apply.idempotency_key = "review:claim-fbb:apply:alternate";
  pipeline.apply.causation_id = pipeline.review.command_id;
  return pipeline;
};

class DeterministicRecordFactory implements DomainRecordFactory {
  readonly #failureCall: number | undefined;
  #callCount = 0;

  constructor(failureCall?: number) {
    this.#failureCall = failureCall;
  }

  nextId(kind: "event" | "outbox"): string {
    this.#callCount += 1;
    if (this.#callCount === this.#failureCall) {
      throw new Error("Injected domain-record append failure.");
    }
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const first = alphabet[Math.floor(this.#callCount / alphabet.length)];
    const second = alphabet[this.#callCount % alphabet.length];
    if (first === undefined || second === undefined) {
      throw new Error("Deterministic test ID space exhausted.");
    }
    return `${kind}_01ARZ3NDEKTSV4RRFFQ69G5F${first}${second}`;
  }

  now(): string {
    return "2026-08-29T12:00:00.000Z";
  }
}

interface Setup {
  registry: InMemoryEvidenceRegistry;
  claim: PetraClaim;
  assertion: PetraAssertion;
  pipeline: CommandPipeline;
}

const setup = (
  factory: DomainRecordFactory = new DeterministicRecordFactory(),
  authorize = true,
): Setup => {
  const claim = readFixture<PetraClaim>("claim");
  const assertion = readFixture<PetraAssertion>("assertion");
  const span = readFixture<PetraSourceSpan>("source-span");
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const resolver: EvidenceSourceResolver = {
    getSourceSpan: (id) => (id === span.source_span_id ? span : undefined),
    getParsedDocument: (id) =>
      id === document.parsed_document_id ? document : undefined,
  };
  const registry = new InMemoryEvidenceRegistry(
    resolver,
    { authorize: () => authorize },
    factory,
  );
  registry.proposeClaim(claim);
  registry.proposeAssertion(assertion);
  return { registry, claim, assertion, pipeline: commandPipeline() };
};

const executeSuccessfulPipeline = (setupValue: Setup): void => {
  setupValue.registry.executeCommand(setupValue.pipeline.submit);
  setupValue.registry.executeCommand(setupValue.pipeline.review);
  setupValue.registry.executeCommand(setupValue.pipeline.apply);
};

describe("immutable domain events and transactional outbox", () => {
  it("orders one Project stream and independent delivery sequences", () => {
    const value = setup();
    executeSuccessfulPipeline(value);

    const events = value.registry.getEvents();
    expect(events.map((event) => event.event.event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
    ]);
    expect(events.map((event) => event.event_position)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.stream_revision)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.command_id)).toEqual([
      value.pipeline.submit.command_id,
      value.pipeline.review.command_id,
      value.pipeline.apply.command_id,
    ]);
    expect(events.map((event) => event.recorded_at)).toEqual([
      "2026-08-29T12:00:00.000Z",
      "2026-08-29T12:00:00.000Z",
      "2026-08-29T12:00:00.000Z",
    ]);

    const outbox = value.registry.getOutboxRecords();
    expect(outbox.map((record) => record.outbox_position)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(outbox.map((record) => record.target)).toEqual([
      "interface_authority",
      "interface_authority",
      "neo4j_graph",
      "interface_authority",
    ]);
    expect(
      value.registry
        .getOutboxRecords("interface_authority")
        .map((record) => record.target_sequence),
    ).toEqual([1, 2, 3]);
    expect(
      value.registry
        .getOutboxRecords("neo4j_graph")
        .map((record) => record.target_sequence),
    ).toEqual([1]);
  });

  it("makes an applied event a self-contained exact projection input", () => {
    const value = setup();
    executeSuccessfulPipeline(value);

    const event = value.registry.getEvents()[2];
    expect(event?.event.event_type).toBe("change_set.applied");
    if (event?.event.event_type !== "change_set.applied") {
      throw new Error("Expected an applied event.");
    }
    expect(event.event.payload.change_set_id).toBe(
      submittedChangeSet(value.pipeline.submit).change_set_id,
    );
    expect(event.event.payload.prior_claim_revision).toBe(1);
    expect(event.event.payload.prior_assertion_revision).toBe(1);
    expect(event.event.payload.claim.revision).toBe(2);
    expect(event.event.payload.claim.authority.zone).toBe("trusted");
    expect(event.event.payload.assertion.revision).toBe(2);
    expect(event.event.payload.assertion.authority.zone).toBe("trusted");

    const deliveries = value.registry
      .getOutboxRecords()
      .filter((record) => record.message.event.event_id === event.event_id);
    expect(deliveries).toHaveLength(2);
    for (const delivery of deliveries) {
      expect(delivery.partition_key).toBe(value.pipeline.apply.project_id);
      expect(delivery.deduplication_key).toBe(
        `${delivery.target}:${event.event_id}`,
      );
      expect(delivery.message.event).toEqual(event);
    }
  });

  it("returns immutable event and outbox snapshots", () => {
    const value = setup();
    value.registry.executeCommand(value.pipeline.submit);
    const events = value.registry.getEvents();
    const outbox = value.registry.getOutboxRecords();

    expect(Object.isFrozen(events)).toBe(true);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(Object.isFrozen(events[0]?.event)).toBe(true);
    expect(Object.isFrozen(outbox)).toBe(true);
    expect(Object.isFrozen(outbox[0])).toBe(true);
    expect(Object.isFrozen(outbox[0]?.message.event)).toBe(true);
  });

  it("does not duplicate events or deliveries for an exact successful retry", () => {
    const value = setup();
    executeSuccessfulPipeline(value);
    const eventIds = value.registry.getEvents().map((event) => event.event_id);
    const outboxIds = value.registry
      .getOutboxRecords()
      .map((record) => record.outbox_id);

    value.registry.executeCommand(structuredClone(value.pipeline.apply));

    expect(value.registry.getEvents().map((event) => event.event_id)).toEqual(
      eventIds,
    );
    expect(
      value.registry.getOutboxRecords().map((record) => record.outbox_id),
    ).toEqual(outboxIds);
  });

  it("does not emit an application event when review denies application", () => {
    const value = setup();
    value.registry.executeCommand(value.pipeline.submit);
    recordedApproval(value.pipeline.review).decision = "rejected";
    value.registry.executeCommand(value.pipeline.review);

    expect(() => value.registry.executeCommand(value.pipeline.apply)).toThrow(
      expect.objectContaining({ code: "APPROVAL_NOT_GRANTED" }),
    );
    expect(
      value.registry.getEvents().map((event) => event.event.event_type),
    ).toEqual(["change_set.submitted", "approval.recorded"]);
    expect(value.registry.outboxCount).toBe(2);
    expect(value.registry.getClaim(value.claim.claim_id)?.revision).toBe(1);
  });

  it("records and idempotently replays a durable stale conflict", () => {
    const value = setup();
    const competing = alternatePipeline();
    value.registry.executeCommand(value.pipeline.submit);
    value.registry.executeCommand(competing.submit);
    value.registry.executeCommand(value.pipeline.review);
    value.registry.executeCommand(competing.review);
    value.registry.executeCommand(competing.apply);

    const applyStale = (): void => {
      value.registry.executeCommand(value.pipeline.apply);
    };
    expect(applyStale).toThrow(
      expect.objectContaining({ code: "STALE_TARGET_REVISION" }),
    );
    const eventCount = value.registry.eventCount;
    const outboxCount = value.registry.outboxCount;
    expect(applyStale).toThrow(
      expect.objectContaining({ code: "STALE_TARGET_REVISION" }),
    );
    expect(value.registry.eventCount).toBe(eventCount);
    expect(value.registry.outboxCount).toBe(outboxCount);

    const conflict = value.registry.getEvents().at(-1);
    expect(conflict?.event.event_type).toBe("change_set.conflicted");
    if (conflict?.event.event_type !== "change_set.conflicted") {
      throw new Error("Expected a conflict event.");
    }
    expect(conflict.event.payload.conflict_code).toBe("STALE_TARGET_REVISION");
    expect(conflict.event.payload.targets).toEqual([
      expect.objectContaining({
        target_kind: "claim",
        expected_revision: 1,
        actual_revision: 2,
        actual_zone: "trusted",
      }),
      expect.objectContaining({
        target_kind: "assertion",
        expected_revision: 1,
        actual_revision: 2,
        actual_zone: "trusted",
      }),
    ]);
    expect(
      value.registry.getChangeSetState(
        submittedChangeSet(value.pipeline.submit).change_set_id,
      ),
    ).toBe("conflicted");
  });

  it("rolls authority, event, and outbox state back when record append fails", () => {
    const value = setup(new DeterministicRecordFactory(7));
    value.registry.executeCommand(value.pipeline.submit);
    value.registry.executeCommand(value.pipeline.review);

    expect(() => value.registry.executeCommand(value.pipeline.apply)).toThrow(
      "Injected domain-record append failure.",
    );
    expect(value.registry.getClaim(value.claim.claim_id)?.revision).toBe(1);
    expect(
      value.registry.getAssertion(value.assertion.assertion_id)?.revision,
    ).toBe(1);
    expect(
      value.registry.getChangeSetState(
        submittedChangeSet(value.pipeline.submit).change_set_id,
      ),
    ).toBe("approved");
    expect(value.registry.eventCount).toBe(2);
    expect(value.registry.outboxCount).toBe(2);

    expect(value.registry.executeCommand(value.pipeline.apply).outcome).toBe(
      "applied",
    );
    expect(value.registry.eventCount).toBe(3);
    expect(value.registry.outboxCount).toBe(4);
  });

  it("emits nothing for a command rejected before authority mutation", () => {
    const value = setup(new DeterministicRecordFactory(), false);

    expect(() => value.registry.executeCommand(value.pipeline.submit)).toThrow(
      ChangeControlError,
    );
    expect(value.registry.changeSetCount).toBe(0);
    expect(value.registry.eventCount).toBe(0);
    expect(value.registry.outboxCount).toBe(0);
  });

  it("rejects invalid generated identities without committing domain state", () => {
    const factory: DomainRecordFactory = {
      nextId: () => "claim_01ARZ3NDEKTSV4RRFFQ69G5FBV",
      now: () => "2026-08-29T12:00:00.000Z",
    };
    const value = setup(factory);

    expect(() => value.registry.executeCommand(value.pipeline.submit)).toThrow(
      "DomainRecordFactory returned a non-event ID.",
    );
    expect(value.registry.changeSetCount).toBe(0);
    expect(value.registry.eventCount).toBe(0);
    expect(value.registry.outboxCount).toBe(0);
  });
});
