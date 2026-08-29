import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  InMemoryWorkUnitRegistry,
  type RegisterWorkUnitInput,
} from "../src/work-unit-registry.js";

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

const makeRegistration = (): RegisterWorkUnitInput => ({
  workUnit: readFixture<PetraWorkUnit>("work-unit-requested"),
  inputManifest: readFixture<PetraWorkerInputManifest>("worker-input-manifest"),
});

const makeOutput = (): PetraWorkerOutputManifest =>
  readFixture<PetraWorkerOutputManifest>("worker-output-manifest");

const rehashSpec = (workUnit: PetraWorkUnit): void => {
  workUnit.spec_hash = canonicalHash(workUnit.spec);
};

const rehashInput = (manifest: PetraWorkerInputManifest): void => {
  manifest.content_hash = canonicalHash(manifest.content);
};

const rehashOutput = (manifest: PetraWorkerOutputManifest): void => {
  manifest.content_hash = canonicalHash(manifest.content);
};

const registerAndStart = (): {
  registry: InMemoryWorkUnitRegistry;
  registration: RegisterWorkUnitInput;
} => {
  const registry = new InMemoryWorkUnitRegistry();
  const registration = makeRegistration();
  registry.register(registration);
  registry.queue(
    registration.workUnit.work_unit_id,
    1,
    "2026-08-29T14:00:01.000Z",
  );
  registry.start(
    registration.workUnit.work_unit_id,
    2,
    1,
    "2026-08-29T14:00:02.000Z",
  );
  return { registry, registration };
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

describe("bounded WorkUnit control", () => {
  it("registers one immutable WorkUnit and exact input manifest idempotently", () => {
    const registry = new InMemoryWorkUnitRegistry();
    const registration = makeRegistration();
    const first = registry.register(registration);
    const retry = registry.register(structuredClone(registration));

    expect(retry).toBe(first);
    expect(registry.size).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.spec)).toBe(true);
    expect(
      Object.isFrozen(
        registry.getInputManifest(
          registration.inputManifest.worker_input_manifest_id,
        )?.content,
      ),
    ).toBe(true);
    registration.workUnit.spec.objective = "Mutated caller copy";
    expect(registry.getWorkUnit(first.work_unit_id)?.spec.objective).not.toBe(
      "Mutated caller copy",
    );
  });

  it("moves through requested, queued, running, and operational success revisions", () => {
    const { registry, registration } = registerAndStart();
    const completed = registry.complete(makeOutput(), 3);

    expect(completed.revision).toBe(4);
    expect(completed.status).toEqual(
      expect.objectContaining({
        state: "completed",
        terminal_outcome: "succeeded",
        attempt: 1,
      }),
    );
    expect(
      registry.getWorkUnitRevision(completed.work_unit_id, 1)?.status.state,
    ).toBe("requested");
    expect(
      registry.getWorkUnitRevision(completed.work_unit_id, 2)?.status.state,
    ).toBe("queued");
    expect(
      registry.getWorkUnitRevision(completed.work_unit_id, 3)?.status.state,
    ).toBe("running");
    expect(registry.outputManifestCount).toBe(1);
    const output = registry.getOutputManifest(
      makeOutput().worker_output_manifest_id,
    );
    expect(output?.content.outcome.outcome_kind).toBe("succeeded");
    expect(
      "artifact_id" in (output?.content.outcome.produced_outputs[0] ?? {}),
    ).toBe(false);
    expect(
      registry.getInputManifest(
        registration.inputManifest.worker_input_manifest_id,
      )?.content.network_policy,
    ).toEqual({ network_mode: "blocked" });
  });

  it("rejects stale and out-of-order lifecycle changes", () => {
    const registry = new InMemoryWorkUnitRegistry();
    const registration = makeRegistration();
    registry.register(registration);

    expectCode(
      () =>
        registry.start(
          registration.workUnit.work_unit_id,
          1,
          1,
          "2026-08-29T14:00:02.000Z",
        ),
      "WORK_UNIT_STATE_INVALID",
    );
    registry.queue(
      registration.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    expectCode(
      () =>
        registry.start(
          registration.workUnit.work_unit_id,
          1,
          1,
          "2026-08-29T14:00:02.000Z",
        ),
      "STALE_WORK_UNIT_REVISION",
    );
    expect(
      registry.getWorkUnit(registration.workUnit.work_unit_id)?.revision,
    ).toBe(2);
  });

  it("rejects changed specifications and input manifests atomically", () => {
    const changedInput = makeRegistration();
    changedInput.inputManifest.content.task.task_version = "2.0.0";
    const firstRegistry = new InMemoryWorkUnitRegistry();

    expectCode(
      () => firstRegistry.register(changedInput),
      "INPUT_MANIFEST_HASH_MISMATCH",
    );
    expect(firstRegistry.size).toBe(0);

    const changedSpec = makeRegistration();
    changedSpec.workUnit.spec.objective = "Different work beneath old hash";
    const secondRegistry = new InMemoryWorkUnitRegistry();
    expectCode(
      () => secondRegistry.register(changedSpec),
      "WORK_UNIT_SPEC_HASH_MISMATCH",
    );
    expect(secondRegistry.size).toBe(0);
  });

  it("blocks dependent work until every dependency succeeds", () => {
    const registry = new InMemoryWorkUnitRegistry();
    const dependency = makeRegistration();
    registry.register(dependency);

    const dependent = makeRegistration();
    dependent.workUnit.work_unit_id = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC6";
    dependent.inputManifest.work_unit_id = dependent.workUnit.work_unit_id;
    dependent.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC7";
    dependent.workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      dependent.inputManifest.worker_input_manifest_id;
    dependent.workUnit.spec.dependency_work_unit_ids = [
      dependency.workUnit.work_unit_id,
    ];
    dependent.workUnit.spec.idempotency_key = "parse:dependent:fc6";
    dependent.workUnit.spec.cache = { cache_mode: "disabled" };
    rehashSpec(dependent.workUnit);
    registry.register(dependent);

    expectCode(
      () =>
        registry.queue(
          dependent.workUnit.work_unit_id,
          1,
          "2026-08-29T14:00:01.000Z",
        ),
      "WORK_UNIT_DEPENDENCY_NOT_READY",
    );

    registry.queue(
      dependency.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    registry.start(
      dependency.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    registry.complete(makeOutput(), 3);
    expect(
      registry.queue(
        dependent.workUnit.work_unit_id,
        1,
        "2026-08-29T14:00:06.000Z",
      ).status.state,
    ).toBe("queued");
  });

  it("rejects missing, undeclared, and oversized output without partial state", () => {
    const cases: {
      code: string;
      mutate: (output: PetraWorkerOutputManifest) => void;
    }[] = [
      {
        code: "REQUIRED_OUTPUT_MISSING",
        mutate: (output) => {
          output.content.outcome = {
            outcome_kind: "succeeded",
            produced_outputs: [
              {
                output_name: "worker_log",
                output_role: "log",
                output_handle: "output:worker-log",
                content_hash:
                  "sha256:6b2fa76c316e066aa3e3156ef026f140f4a45f4bf7f3127c766115b462ad16d8",
                byte_size: 100,
                media_type: "text/plain",
              },
            ],
          };
          output.content.resource_usage.output_bytes = 100;
        },
      },
      {
        code: "OUTPUT_SLOT_UNDECLARED",
        mutate: (output) => {
          output.content.outcome.produced_outputs[0].output_name =
            "undeclared_output";
        },
      },
      {
        code: "OUTPUT_SIZE_LIMIT_EXCEEDED",
        mutate: (output) => {
          output.content.outcome.produced_outputs[0].byte_size = 50000001;
          output.content.resource_usage.output_bytes = 50000001;
        },
      },
    ];

    for (const value of cases) {
      const { registry, registration } = registerAndStart();
      const output = makeOutput();
      value.mutate(output);
      rehashOutput(output);
      expectCode(() => registry.complete(output, 3), value.code);
      expect(registry.outputManifestCount).toBe(0);
      expect(
        registry.getWorkUnit(registration.workUnit.work_unit_id)?.status.state,
      ).toBe("running");
    }
  });

  it("enforces worker identity, resource limits, and blocked egress", () => {
    const workerCase = registerAndStart();
    const wrongWorker = makeOutput();
    wrongWorker.content.worker.worker_version = "9.9.9";
    rehashOutput(wrongWorker);
    expectCode(
      () => workerCase.registry.complete(wrongWorker, 3),
      "OUTPUT_WORKER_MISMATCH",
    );

    const resourceCase = registerAndStart();
    const excessive = makeOutput();
    excessive.content.resource_usage.wall_time_ms = 600001;
    rehashOutput(excessive);
    expectCode(
      () => resourceCase.registry.complete(excessive, 3),
      "RESOURCE_LIMIT_EXCEEDED",
    );

    const networkCase = registerAndStart();
    const networked = makeOutput();
    networked.content.network_activity = [
      {
        destination: "https://example.org",
        bytes_sent: 10,
        bytes_received: 20,
      },
    ];
    networked.content.resource_usage.network_bytes = 30;
    rehashOutput(networked);
    expectCode(
      () => networkCase.registry.complete(networked, 3),
      "NETWORK_POLICY_VIOLATED",
    );
  });

  it("records a retryable worker failure and reuses the exact input on attempt two", () => {
    const { registry, registration } = registerAndStart();
    const failed = makeOutput();
    failed.content.outcome = {
      outcome_kind: "worker_failed",
      failure: {
        code: "PARSER_PROCESS_EXITED",
        message: "The parser process exited before producing output.",
        retryable: true,
      },
      produced_outputs: [],
    };
    failed.content.resource_usage.output_bytes = 0;
    rehashOutput(failed);
    const failure = registry.complete(failed, 3);
    expect(failure.status).toEqual(
      expect.objectContaining({
        state: "completed",
        terminal_outcome: "worker_failed",
        attempt: 1,
      }),
    );

    registry.queue(
      registration.workUnit.work_unit_id,
      4,
      "2026-08-29T14:01:00.000Z",
    );
    registry.start(
      registration.workUnit.work_unit_id,
      5,
      2,
      "2026-08-29T14:01:01.000Z",
    );
    const succeeded = makeOutput();
    succeeded.worker_output_manifest_id =
      "worker_output_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC5";
    succeeded.attempt = 2;
    succeeded.content.started_at = "2026-08-29T14:01:01.000Z";
    succeeded.content.completed_at = "2026-08-29T14:01:04.000Z";
    succeeded.reported_at = "2026-08-29T14:01:04.000Z";
    rehashOutput(succeeded);
    const completed = registry.complete(succeeded, 6);

    expect(completed.revision).toBe(7);
    expect(completed.status).toEqual(
      expect.objectContaining({
        terminal_outcome: "succeeded",
        attempt: 2,
      }),
    );
    expect(completed.spec.input_manifest_ref).toEqual(
      registration.workUnit.spec.input_manifest_ref,
    );
  });

  it("records malformed worker output as an operational validation failure", () => {
    const { registry, registration } = registerAndStart();
    const failed = registry.failValidation(
      registration.workUnit.work_unit_id,
      3,
      1,
      {
        code: "OUTPUT_SCHEMA_INVALID",
        message: "The worker report did not satisfy its runtime schema.",
        retryable: false,
      },
      "2026-08-29T14:00:05.000Z",
    );

    expect(failed.status).toEqual(
      expect.objectContaining({
        state: "completed",
        terminal_outcome: "validation_failed",
      }),
    );
    expect(registry.outputManifestCount).toBe(0);
  });

  it("requires explicit cancellation policy and preserves exact completion replay", () => {
    const atomicRegistry = new InMemoryWorkUnitRegistry();
    const atomic = makeRegistration();
    atomic.workUnit.spec.cancellation_policy = "atomic";
    rehashSpec(atomic.workUnit);
    atomicRegistry.register(atomic);
    expectCode(
      () =>
        atomicRegistry.cancel(
          atomic.workUnit.work_unit_id,
          1,
          "User requested cancellation.",
          "2026-08-29T14:00:01.000Z",
        ),
      "WORK_UNIT_NOT_CANCELLABLE",
    );

    const value = registerAndStart();
    const output = makeOutput();
    const first = value.registry.complete(output, 3);
    const replay = value.registry.complete(structuredClone(output), 3);
    expect(replay).toBe(first);
    expect(value.registry.outputManifestCount).toBe(1);

    const cancellation = makeRegistration();
    rehashInput(cancellation.inputManifest);
    cancellation.workUnit.spec.input_manifest_ref.content_hash =
      cancellation.inputManifest.content_hash;
    rehashSpec(cancellation.workUnit);
    const cancellationRegistry = new InMemoryWorkUnitRegistry();
    cancellationRegistry.register(cancellation);
    expect(
      cancellationRegistry.cancel(
        cancellation.workUnit.work_unit_id,
        1,
        "No longer needed.",
        "2026-08-29T14:00:01.000Z",
      ).status,
    ).toEqual(
      expect.objectContaining({
        state: "cancelled",
        terminal_outcome: "cancelled",
        attempt: 0,
      }),
    );
  });
});
