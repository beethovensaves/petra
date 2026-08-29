import { createHash } from "node:crypto";
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
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  InMemoryEvidenceRegistry,
  type CommandAuthorizer,
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

interface CommandPipeline {
  submit: PetraCommandEnvelope;
  review: PetraCommandEnvelope;
  apply: PetraCommandEnvelope;
}

interface ControlSetup {
  registry: InMemoryEvidenceRegistry;
  claim: PetraClaim;
  assertion: PetraAssertion;
  pipeline: CommandPipeline;
}

const commandPipeline = (): CommandPipeline => ({
  submit: readFixture<PetraCommandEnvelope>("command-submit-change-set"),
  review: readFixture<PetraCommandEnvelope>("command-record-approval"),
  apply: readFixture<PetraCommandEnvelope>("command-apply-change-set"),
});

const setup = (
  authorizer: CommandAuthorizer = { authorize: () => true },
): ControlSetup => {
  const claim = readFixture<PetraClaim>("claim");
  const assertion = readFixture<PetraAssertion>("assertion");
  const span = readFixture<PetraSourceSpan>("source-span");
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const resolver: EvidenceSourceResolver = {
    getSourceSpan: (id) => (id === span.source_span_id ? span : undefined),
    getParsedDocument: (id) =>
      id === document.parsed_document_id ? document : undefined,
  };
  const registry = new InMemoryEvidenceRegistry(resolver, authorizer);
  registry.proposeClaim(claim);
  registry.proposeAssertion(assertion);
  return { registry, claim, assertion, pipeline: commandPipeline() };
};

const expectControlCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

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

const rehash = (changeSet: PetraChangeSet): void => {
  changeSet.content_hash = canonicalHash(changeSet.content);
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

describe("ChangeSet approval and atomic application", () => {
  it("promotes one Claim and its ASSERTS Assertion through the command path", () => {
    const { registry, claim, assertion, pipeline } = setup();

    expect(registry.executeCommand(pipeline.submit).outcome).toBe("submitted");
    expect(registry.executeCommand(pipeline.review).outcome).toBe(
      "approval_recorded",
    );
    const result = registry.executeCommand(pipeline.apply);

    expect(result).toEqual(
      expect.objectContaining({
        outcome: "applied",
        claim_revision: 2,
        assertion_revision: 2,
      }),
    );
    if (result.outcome !== "applied") throw new Error("Expected application.");
    expect(registry.getChangeSetState(result.change_set_id)).toBe("applied");
    expect(registry.getClaim(claim.claim_id)?.authority).toEqual({
      zone: "trusted",
      review_state: "human_accepted",
      promotion: {
        change_set_id: result.change_set_id,
        approval_basis: {
          approval_kind: "human",
          approval_id: result.approval_id,
          approved_by: {
            actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            actor_kind: "human",
          },
        },
        applied_at: "2026-08-28T18:13:01.000Z",
      },
    });
    expect(registry.getAssertion(assertion.assertion_id)?.authority.zone).toBe(
      "trusted",
    );
    expect(registry.getClaimRevision(claim.claim_id, 1)?.authority.zone).toBe(
      "quarantine",
    );
    expect(
      registry.getAssertionRevision(assertion.assertion_id, 1)?.authority.zone,
    ).toBe("quarantine");
    expect(Object.isFrozen(registry.getClaim(claim.claim_id)?.authority)).toBe(
      true,
    );
  });

  it("returns the original result for an identical idempotent retry", () => {
    const { registry, pipeline, claim } = setup();
    registry.executeCommand(pipeline.submit);
    registry.executeCommand(pipeline.review);
    const first = registry.executeCommand(pipeline.apply);
    const replay = registry.executeCommand(structuredClone(pipeline.apply));

    expect(replay).toBe(first);
    expect(registry.getClaim(claim.claim_id)?.revision).toBe(2);
  });

  it("rejects an idempotency key reused for different command content", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    pipeline.review.idempotency_key = pipeline.submit.idempotency_key;

    expectControlCode(
      () => registry.executeCommand(pipeline.review),
      "IDEMPOTENCY_KEY_REUSED",
    );
    expect(registry.approvalCount).toBe(0);
  });

  it("rejects a command ID reused for different command content", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    pipeline.review.command_id = pipeline.submit.command_id;

    expectControlCode(
      () => registry.executeCommand(pipeline.review),
      "COMMAND_ID_REUSED",
    );
  });

  it("requires an explicit applicable capability decision", () => {
    const { registry, pipeline } = setup({ authorize: () => false });

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "COMMAND_NOT_AUTHORIZED",
    );
    expect(registry.changeSetCount).toBe(0);
  });

  it("passes exact actor, project, capability, and command context to authorization", () => {
    const requests: unknown[] = [];
    const { registry, pipeline } = setup({
      authorize: (request) => {
        requests.push(request);
        return true;
      },
    });

    registry.executeCommand(pipeline.submit);

    expect(requests).toEqual([
      {
        actor: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          actor_kind: "model",
        },
        capabilityGrantId: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
        commandName: "SubmitChangeSet",
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
    ]);
  });

  it("rejects changed ChangeSet content beneath its hash", () => {
    const { registry, pipeline } = setup();
    submittedChangeSet(pipeline.submit).content.reason =
      "Changed after hashing.";

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "CHANGE_SET_HASH_MISMATCH",
    );
    expect(registry.changeSetCount).toBe(0);
  });

  it("requires promotion to carry the R2 risk tier", () => {
    const { registry, pipeline } = setup();
    const changeSet = submittedChangeSet(pipeline.submit);
    changeSet.content.risk_tier = "R1";
    rehash(changeSet);

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "CHANGE_SET_RISK_TIER_INVALID",
    );
  });

  it("requires exactly one corresponding Claim and Assertion operation", () => {
    const { registry, pipeline } = setup();
    const changeSet = submittedChangeSet(pipeline.submit);
    changeSet.content.operations = [changeSet.content.operations[0]];
    changeSet.content.impact.affected_object_ids = [
      changeSet.content.operations[0].target_id,
    ];
    rehash(changeSet);

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "CHANGE_SET_OPERATION_SET_INVALID",
    );
  });

  it("requires the impact preview to name the exact changed objects", () => {
    const { registry, pipeline } = setup();
    const changeSet = submittedChangeSet(pipeline.submit);
    changeSet.content.impact.affected_object_ids = [
      changeSet.content.operations[0].target_id,
    ];
    rehash(changeSet);

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "CHANGE_SET_TARGET_MISMATCH",
    );
  });

  it("binds the preview to each target's exact authority state", () => {
    const { registry, pipeline } = setup();
    const changeSet = submittedChangeSet(pipeline.submit);
    changeSet.content.operations[0].before.review_state = "unreviewed";
    rehash(changeSet);

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "TARGET_AUTHORITY_MISMATCH",
    );
  });

  it("binds submission to the recorded proposer and Project", () => {
    const { registry, pipeline } = setup();
    pipeline.submit.actor.actor_kind = "human";

    expectControlCode(
      () => registry.executeCommand(pipeline.submit),
      "CHANGE_SET_PROPOSER_MISMATCH",
    );
  });

  it("binds Approval to the exact ChangeSet revision and hash", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    recordedApproval(pipeline.review).subject.change_set_content_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";

    expectControlCode(
      () => registry.executeCommand(pipeline.review),
      "APPROVAL_SUBJECT_MISMATCH",
    );
    expect(registry.approvalCount).toBe(0);
  });

  it("requires the command actor to be the human Approval authority", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    pipeline.review.actor.actor_kind = "model";

    expectControlCode(
      () => registry.executeCommand(pipeline.review),
      "APPROVAL_ACTOR_MISMATCH",
    );
  });

  it("does not apply a rejected decision", () => {
    const { registry, pipeline, claim } = setup();
    registry.executeCommand(pipeline.submit);
    recordedApproval(pipeline.review).decision = "rejected";
    registry.executeCommand(pipeline.review);

    expectControlCode(
      () => registry.executeCommand(pipeline.apply),
      "APPROVAL_NOT_GRANTED",
    );
    expect(registry.getClaim(claim.claim_id)?.revision).toBe(1);
    expect(
      registry.getChangeSetState(
        submittedChangeSet(pipeline.submit).change_set_id,
      ),
    ).toBe("rejected");
  });

  it("does not treat approval conditions as silently satisfied", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    recordedApproval(pipeline.review).conditions = [
      "Verify the table units before applying.",
    ];
    registry.executeCommand(pipeline.review);

    expectControlCode(
      () => registry.executeCommand(pipeline.apply),
      "APPROVAL_CONDITIONS_UNSATISFIED",
    );
  });

  it("marks a stale competing ChangeSet conflicted without a partial revision", () => {
    const { registry, pipeline, claim, assertion } = setup();
    const competing = alternatePipeline();
    registry.executeCommand(pipeline.submit);
    registry.executeCommand(competing.submit);
    registry.executeCommand(pipeline.review);
    registry.executeCommand(competing.review);
    registry.executeCommand(competing.apply);

    expectControlCode(
      () => registry.executeCommand(pipeline.apply),
      "STALE_TARGET_REVISION",
    );
    expect(
      registry.getChangeSetState(
        submittedChangeSet(pipeline.submit).change_set_id,
      ),
    ).toBe("conflicted");
    expect(registry.getClaim(claim.claim_id)?.revision).toBe(2);
    expect(registry.getAssertion(assertion.assertion_id)?.revision).toBe(2);
    expect(registry.getClaimRevision(claim.claim_id, 3)).toBeUndefined();
    expect(
      registry.getAssertionRevision(assertion.assertion_id, 3),
    ).toBeUndefined();
  });

  it("does not allow another command to apply an already applied ChangeSet", () => {
    const { registry, pipeline } = setup();
    registry.executeCommand(pipeline.submit);
    registry.executeCommand(pipeline.review);
    registry.executeCommand(pipeline.apply);
    pipeline.apply.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FBP";
    pipeline.apply.idempotency_key = "review:claim-fbb:apply:second-command";

    expectControlCode(
      () => registry.executeCommand(pipeline.apply),
      "CHANGE_SET_ALREADY_APPLIED",
    );
  });
});
