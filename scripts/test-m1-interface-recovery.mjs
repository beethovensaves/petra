import { spawn } from "node:child_process";

const stages = [
  {
    id: "presentation",
    label: "Frozen-workbench recovery and exact-return assertions",
    command: [
      "npm",
      "test",
      "--workspace",
      "@petra/workbench",
      "--",
      "src/product/m1-interface-recovery.test.tsx",
    ],
    testGroups: ["M1.9-T11"],
  },
  {
    id: "protocol",
    label: "Authenticated reads, replay, abort, Review, and cancellation",
    command: [
      "npm",
      "test",
      "--workspace",
      "@petra/server",
      "--",
      "test/project-shell-routes.test.ts",
      "test/conformance.test.ts",
    ],
    testGroups: ["M1.9-T11", "M1.9-T13"],
  },
];

const run = (stage) =>
  new Promise((resolve) => {
    const [program, ...args] = stage.command;
    const child = spawn(program, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", (error) => resolve({ code: 1, error: error.message }));
    child.on("close", (code, signal) =>
      resolve({ code: code ?? 1, signal: signal ?? undefined }),
    );
  });

const publicStage = (stage) => ({
  id: stage.id,
  label: stage.label,
  command: stage.command.join(" "),
  test_groups: stage.testGroups,
});

const completed = [];
const startedAt = new Date().toISOString();
for (const [index, stage] of stages.entries()) {
  console.log(
    `\n[M1 interface recovery ${index + 1}/${stages.length}] ${stage.id}: ${stage.label}`,
  );
  const result = await run(stage);
  if (result.code !== 0) {
    throw new Error(
      `M1 interface recovery stage ${stage.id} failed with exit ${result.code}${result.signal === undefined ? "" : ` (${result.signal})`}${result.error === undefined ? "" : `: ${result.error}`}.`,
    );
  }
  completed.push(stage);
}

console.log(
  JSON.stringify(
    {
      schema_name: "petra.m1-interface-recovery-result",
      revision: 1,
      state: "passed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      stages: completed.map(publicStage),
      covered_test_groups: [
        ...new Set(completed.flatMap((stage) => stage.testGroups)),
      ].sort(),
      verified_boundaries: [
        "authority_and_projection_positions_remain_distinct",
        "source_identity_survives_unavailable_representation",
        "stale_review_cannot_commit",
        "blocked_graph_exposes_only_its_coherent_position",
        "missing_relationship_path_never_uses_fixture_fallback",
        "failed_read_remains_attributable",
        "delivery_abort_does_not_cancel_work",
        "explicit_cancellation_is_durable_before_provider_abort",
        "replay_preserves_interaction_identity",
      ],
      authority_boundary: {
        presentation_state_is_scientific_authority: false,
        recovery_repeats_commands_implicitly: false,
        m1_closure_implies_neutral_product_completion: false,
      },
    },
    null,
    2,
  ),
);
