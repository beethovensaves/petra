import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import type {
  PetraWorkerInputManifest,
  PetraWorkerOutputManifestV11,
  PetraWorkUnit,
} from "@petra/contracts";
import { InMemoryWorkUnitRegistry, copilotHash } from "../src/index.js";
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
function prepare(limit?: "cpu" | "memory" | "network" | "tokens" | "money") {
  const input = fixture<PetraWorkerInputManifest>("worker-input-manifest"),
    work = fixture<PetraWorkUnit>("work-unit-requested"),
    output = fixture<PetraWorkerOutputManifestV11>(
      "worker-output-manifest-v1-1",
    );
  delete input.content.resource_limits.max_cpu_time_ms;
  delete input.content.resource_limits.max_memory_bytes;
  input.content.network_policy = {
    network_mode: "allowlist",
    destinations: ["https://chatgpt.com"],
  };
  if (limit === "cpu") input.content.resource_limits.max_cpu_time_ms = 10000;
  if (limit === "memory")
    input.content.resource_limits.max_memory_bytes = 10000;
  if (limit === "network")
    input.content.resource_limits.max_network_bytes = 10000;
  if (limit === "tokens")
    input.content.resource_limits.max_input_tokens = 10000;
  if (limit === "money")
    input.content.resource_limits.monetary_limit = {
      currency: "USD",
      max_microunits: 10000,
    };
  input.content_hash = copilotHash(input.content);
  work.spec.input_manifest_ref.content_hash = input.content_hash;
  work.spec_hash = copilotHash(work.spec);
  output.worker_input_manifest_hash = input.content_hash;
  output.content_hash = copilotHash(output.content);
  const registry = new InMemoryWorkUnitRegistry();
  registry.register({ workUnit: work, inputManifest: input });
  registry.queue(work.work_unit_id, 1, "2026-08-29T14:00:01.000Z");
  registry.start(work.work_unit_id, 2, 1, "2026-08-29T14:00:02.000Z");
  return { registry, work, output };
}
it("preserves provider usage as unavailable without inventing zero", () => {
  const { registry, work, output } = prepare();
  expect(registry.complete(output, 3).status).toMatchObject({
    state: "completed",
    terminal_outcome: "succeeded",
  });
  expect(
    registry.getOutputManifest(output.worker_output_manifest_id)?.content
      .resource_usage,
  ).toMatchObject({
    cpu_time_ms: null,
    peak_memory_bytes: null,
    network_bytes: null,
  });
  expect(registry.getWorkUnit(work.work_unit_id)?.revision).toBe(4);
});
it.each(["cpu", "memory", "network", "tokens", "money"] as const)(
  "cannot certify an unknown %s measurement under an applicable hard limit",
  (limit) => {
    const { registry, work, output } = prepare(limit);
    expect(() => registry.complete(output, 3)).toThrow(/hard limit/u);
    expect(registry.getWorkUnit(work.work_unit_id)?.revision).toBe(3);
    expect(
      registry.getOutputManifest(output.worker_output_manifest_id),
    ).toBeUndefined();
  },
);

for (const outcome of [
  "worker_failed",
  "resource_exhausted",
  "timed_out",
] as const) {
  it(`retains an actual ${outcome} failure after an exceeded budget without accepting an output manifest`, () => {
    const { registry, work, output } = prepare("cpu");
    const failed = registry.failExecution(
      work.work_unit_id,
      3,
      1,
      outcome,
      {
        code: "ACTUAL_FAILURE",
        message: "Known execution failure; measurements unavailable.",
        retryable: false,
      },
      "2026-08-29T16:00:00.000Z",
    );
    expect(failed.status).toMatchObject({
      state: "completed",
      terminal_outcome: outcome,
      failure: { code: "ACTUAL_FAILURE" },
    });
    expect("output_manifest_ref" in failed.status).toBe(false);
    expect(
      registry.getOutputManifest(output.worker_output_manifest_id),
    ).toBeUndefined();
    expect(() => registry.complete(output, failed.revision)).toThrow(
      /running/u,
    );
  });
}
