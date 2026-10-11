import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CopilotCommandBridge,
  type CopilotCommandBridgePorts,
  type CopilotCommandProposalRepository,
  type OwnedCopilotCommandDecision,
  type OwnedCopilotCommandProposal,
} from "../src/copilot-command-bridge.js";
import {
  WORKING_PLAN_PROFILE,
  type WorkingPlanModelPort,
} from "../src/copilot-working-plan.js";
import { copilotHash, type CopilotContext } from "../src/project-copilot.js";
import { validateCopilotCommandReceipt } from "../src/copilot-command-receipt.js";
import { copilotCommandPreview } from "../src/copilot-command-preview.js";

const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
const sealed = <T extends Record<string, unknown>>(
  value: T,
  field: "record_hash" | "content_hash" = "record_hash",
): T => {
  const { [field]: ignored, ...body } = value;
  void ignored;
  return {
    ...value,
    [field]: copilotHash(field === "content_hash" ? value.content : body),
  };
};
const context = (): CopilotContext => {
  const { content_hash, ...content } =
    fixture<CopilotContext>("copilot-context");
  void content_hash;
  return { ...content, content_hash: copilotHash(content) };
};
const actor = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
// These doubles test orchestration boundaries only. Durable canonical ownership,
// actual model delivery and visible Workspace convergence require integration.
const harness = () => {
  let proposal: OwnedCopilotCommandProposal;
  let decision: OwnedCopilotCommandDecision | undefined;
  let claimed = false;
  const native = fixture<Record<string, unknown>>(
    "project-work-operation-request",
  );
  const calls: string[] = [];
  const repository: CopilotCommandProposalRepository = {
    readOrigin: () =>
      Promise.resolve({
        project_id: context().project_id,
        actor_id: actor,
        protocol_run_id: "origin-run",
        project_turn_id: "project_turn_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        project_thread_ref: {
          project_thread_id: "project_thread_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          revision: 2,
          content_hash: `sha256:${"a".repeat(64)}`,
        },
        interaction_run_ref: {
          interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          revision: 2,
          content_hash: `sha256:${"b".repeat(64)}`,
        },
        question: "Which bounded Work should start?",
      }),
    begin: (input) => {
      calls.push("retain-input");
      const created = proposal === undefined;
      if (created)
        proposal = {
          ...input,
          state: "running",
          work_unit_ref: {
            work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            revision: 3,
            spec_hash: `sha256:${"c".repeat(64)}`,
          },
          interaction_run_ref: {
            interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
            revision: 1,
            content_hash: `sha256:${"d".repeat(64)}`,
          },
        };
      return Promise.resolve({ created, proposal });
    },
    complete: (_id, _actor, result) => {
      calls.push("retain-output");
      proposal = {
        ...proposal,
        state: "completed",
        output: result.output,
        output_hash: copilotHash(result.output),
      };
      return Promise.resolve(proposal);
    },
    fail: (_id, _actor, error) => {
      calls.push("retain-failure");
      proposal = { ...proposal, state: "failed", error };
      return Promise.resolve();
    },
    read: () => Promise.resolve(proposal),
    retainDecision: (input) => {
      calls.push("retain-human-decision");
      if (decision === undefined)
        decision = {
          decision: input,
          state: input.decision === "reject" ? "rejected" : "pending",
        };
      return Promise.resolve(decision);
    },
    claimDecision: () => {
      if (claimed) return Promise.resolve(false);
      claimed = true;
      return Promise.resolve(true);
    },
    observeDecision: (_id, _actor, result) => {
      calls.push("retain-observation");
      decision = {
        decision: decision!.decision,
        ...result,
        state: result.receipt ? "observed" : "reconciliation_required",
      };
      return Promise.resolve(decision);
    },
    readDecision: () => Promise.resolve(decision),
  };
  const model = vi.fn<WorkingPlanModelPort["invokeWorkingPlan"]>((input) => {
    calls.push("model");
    return Promise.resolve({
      model: "eligible-test-role",
      provider_thread_id: "provider-thread",
      provider_turn_id: "provider-turn",
      output: {
        schema_name: "petra.copilot-working-plan",
        schema_version: "1.0.0",
        authority: "proposed_only",
        explanation: "Review this bounded Work before deciding.",
        proposals: [
          {
            preview_key: input.previews[0]!.key,
            changes: [],
            reason: "The Work is proposed for human review.",
            basis_keys: [],
          },
        ],
      },
    });
  });
  const ports: CopilotCommandBridgePorts = {
    repository,
    context: vi.fn(() => Promise.resolve(context())),
    catalogue: () =>
      Promise.resolve([
        {
          operation_id: "work.start",
          target_id: (native.expected_work_unit_ref as { work_unit_id: string })
            .work_unit_id,
          request: native,
        },
      ]),
    model: { invokeWorkingPlan: model },
    revalidate: vi.fn(() => {
      calls.push("reread-native-authority");
      return Promise.resolve();
    }),
    execute: vi.fn(() => {
      calls.push("ordinary-command");
      return Promise.resolve(
        sealed(
          fixture<Record<string, unknown>>("project-work-operation-receipt"),
        ),
      );
    }),
    now: () => "2026-10-11T02:30:00.000Z",
  };
  const bridge = new CopilotCommandBridge(ports);
  const propose = () =>
    bridge.propose({
      project_id: context().project_id,
      actor_id: actor,
      origin_run_id: "origin-run",
      proposal_id: "proposal_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      expected_context_hash: context().content_hash,
    });
  const decide = (choice: "accept" | "reject" = "accept", overrides = {}) =>
    bridge.decide({
      project_id: context().project_id,
      actor_id: actor,
      proposal_id: proposal.proposal_id,
      proposal_output_hash: proposal.output_hash!,
      preview_key: proposal.commands[0]!.preview.key,
      preview_hash: proposal.commands[0]!.preview.preview_hash,
      decision_id: "decision_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      decision: choice,
      ...overrides,
    });
  return {
    bridge,
    ports,
    repository,
    calls,
    propose,
    decide,
    model,
  };
};

describe("copilot command bridge construction", () => {
  it("critical: terminates a provider that ignores cancellation and withholds a late result", async () => {
    vi.useFakeTimers();
    try {
      const h = harness();
      const generated = await h.model({
        signal: new AbortController().signal,
        project_id: context().project_id,
        context: context(),
        question: "Which Work should start?",
        previews: [
          copilotCommandPreview({
            operation_id: "work.start",
            context: context(),
            target_id: (
              fixture<Record<string, unknown>>("project-work-operation-request")
                .expected_work_unit_ref as { work_unit_id: string }
            ).work_unit_id,
            request: fixture("project-work-operation-request"),
          }).preview,
        ],
      });
      let deliver!: (value: typeof generated) => void;
      h.model.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            deliver = resolve;
          }),
      );
      const pending = h.propose();
      const denied = expect(pending).rejects.toThrow(/exceeded its deadline/u);
      await vi.advanceTimersByTimeAsync(WORKING_PLAN_PROFILE.timeout_ms + 1);
      await denied;
      deliver(generated);
      await Promise.resolve();
      expect(h.calls).toContain("retain-failure");
      expect(h.calls).not.toContain("retain-output");
      expect(h.ports.execute).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("retains the proposed activity without an effect and orders the explicit human decision before the ordinary command and receipt", async () => {
    const h = harness();
    const proposal = await h.propose();
    expect(proposal.output?.authority).toBe("proposed_only");
    expect(h.ports.execute).not.toHaveBeenCalled();
    expect(h.calls).toEqual(["retain-input", "model", "retain-output"]);
    const result = await h.decide();
    expect(result.state).toBe("observed");
    expect(h.calls.slice(3)).toEqual([
      "reread-native-authority",
      "retain-human-decision",
      "ordinary-command",
      "retain-observation",
    ]);
    expect(h.ports.execute).toHaveBeenCalledWith(
      proposal.commands[0],
      fixture("project-work-operation-request"),
      actor,
    );
    vi.mocked(h.ports.revalidate).mockRejectedValueOnce(
      new Error("native target advanced by the observed command"),
    );
    const replay = await h.decide();
    expect(replay).toEqual(result);
    expect(h.ports.execute).toHaveBeenCalledTimes(1);
    await h.propose();
    expect(h.model).toHaveBeenCalledTimes(1);
  });
  it("rejection never claims or executes a command and a substituted selection fails before decision retention", async () => {
    const h = harness();
    await h.propose();
    await expect(
      h.decide("accept", { preview_hash: `sha256:${"f".repeat(64)}` }),
    ).rejects.toThrow(/exact unchanged/u);
    expect(h.calls).not.toContain("retain-human-decision");
    expect((await h.decide("reject")).state).toBe("rejected");
    expect(h.ports.execute).not.toHaveBeenCalled();
    expect(h.ports.revalidate).not.toHaveBeenCalled();
  });
  it("denies changed native basis and revoked ordinary authority before retaining an acceptance", async () => {
    const h = harness();
    await h.propose();
    vi.mocked(h.ports.revalidate).mockRejectedValueOnce(
      new Error("grant revoked"),
    );
    await expect(h.decide()).rejects.toThrow("grant revoked");
    expect(h.calls).not.toContain("retain-human-decision");
    const changed = context();
    changed.basis.project_revision++;
    const { content_hash, ...body } = changed;
    void content_hash;
    vi.mocked(h.ports.context).mockResolvedValueOnce({
      ...body,
      content_hash: copilotHash(body),
    });
    await expect(h.decide()).rejects.toThrow(/basis changed/u);
    expect(h.ports.execute).not.toHaveBeenCalled();
  });
  it("marks transport loss as reconciliation required and never automatically repeats a possibly applied effect", async () => {
    const h = harness();
    await h.propose();
    vi.mocked(h.ports.execute).mockRejectedValueOnce(
      new Error("connection lost after owner accepted"),
    );
    const result = await h.decide();
    expect(result.state).toBe("reconciliation_required");
    expect(result.receipt).toBeUndefined();
    await h.decide();
    expect(h.ports.execute).toHaveBeenCalledTimes(1);
  });
  it("rejects model-selected arbitrary commands and a changed result before invoking any ordinary owner", async () => {
    const h = harness();
    vi.mocked(h.model).mockResolvedValueOnce({
      model: "eligible-test-role",
      provider_thread_id: "thread",
      provider_turn_id: "turn",
      output: {
        schema_name: "petra.copilot-working-plan",
        schema_version: "1.0.0",
        authority: "proposed_only",
        explanation: "Review a proposed command.",
        proposals: [
          {
            preview_key: "unregistered",
            changes: [],
            reason: "Proposed command.",
            basis_keys: [],
          },
        ],
      },
    });
    await expect(h.propose()).rejects.toThrow(/unique supplied/u);
    expect(h.calls).toContain("retain-failure");
    expect(h.ports.execute).not.toHaveBeenCalled();
  });
  it("does not release a proposal after rights or exact records change during the provider call", async () => {
    const h = harness();
    vi.mocked(h.ports.context)
      .mockResolvedValueOnce(context())
      .mockRejectedValueOnce(new Error("private read revoked"));
    await expect(h.propose()).rejects.toThrow("private read revoked");
    expect(h.calls).not.toContain("retain-output");
    expect(h.calls).toContain("retain-failure");
  });
});

describe("decision concurrency and immutable meaning", () => {
  it("serializes concurrent decisions without a duplicate ordinary effect", async () => {
    const h = harness();
    await h.propose();
    const results = await Promise.all([h.decide(), h.decide()]);
    expect(h.ports.execute).toHaveBeenCalledTimes(1);
    expect(results.some((result) => result.state === "observed")).toBe(true);
    expect((await h.decide()).state).toBe("observed");
  });
  it("cannot rebind a retained rejection to an acceptance on replay", async () => {
    const h = harness();
    await h.propose();
    await h.decide("reject");
    await expect(h.decide("accept")).rejects.toThrow(/rebound/u);
    expect(h.ports.execute).not.toHaveBeenCalled();
  });
});

describe("ordinary receipt challenges", () => {
  it("accepts the exact native Work and recovery receipts and retains their full content", () => {
    for (const [name, operation, refName] of [
      ["project-work-operation", "work.start", "expected_work_unit_ref"],
      ["project-work-resume", "work.resume", "expected_work_unit_ref"],
      [
        "project-work-start-again",
        "work.start-again",
        "expected_prior_work_unit_ref",
      ],
    ] as const) {
      const request = fixture<Record<string, unknown>>(`${name}-request`);
      const command = copilotCommandPreview({
        operation_id: operation,
        context: context(),
        target_id: (request[refName] as { work_unit_id: string }).work_unit_id,
        request,
      });
      const receipt = sealed(
        fixture<Record<string, unknown>>(`${name}-receipt`),
      );
      expect(
        validateCopilotCommandReceipt(command, request, actor, receipt),
      ).toEqual(receipt);
    }
  });
  it("rejects rehashed foreign Actor Project target operation or command receipts and unverified bytes", () => {
    const request = fixture<Record<string, unknown>>(
      "project-work-operation-request",
    );
    const command = copilotCommandPreview({
      operation_id: "work.start",
      context: context(),
      target_id: (request.expected_work_unit_ref as { work_unit_id: string })
        .work_unit_id,
      request,
    });
    const good = sealed(
      fixture<Record<string, unknown>>("project-work-operation-receipt"),
    );
    for (const replacement of [
      { project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAX" },
      {
        actor: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX",
          actor_kind: "human",
        },
      },
      { command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FAX" },
      {
        requested_work_unit_ref: {
          ...(good.requested_work_unit_ref as Record<string, unknown>),
          revision: 2,
        },
      },
      { operation: "cancel", outcome: "cancelled" },
    ])
      expect(() =>
        validateCopilotCommandReceipt(
          command,
          request,
          actor,
          sealed({ ...good, ...replacement }),
        ),
      ).toThrow(/differs/u);
    expect(() =>
      validateCopilotCommandReceipt(command, request, actor, {
        ...good,
        record_hash: `sha256:${"e".repeat(64)}`,
      }),
    ).toThrow(/differs/u);
  });
});
