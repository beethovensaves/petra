import { spawn } from "node:child_process";

const stages = [
  {
    id: "repository",
    label: "Cross-runtime contracts and repository behavior",
    command: ["npm", "run", "verify"],
    testGroups: [
      "M1.9-T01",
      "M1.9-T02",
      "M1.9-T07",
      "M1.9-T08",
      "M1.9-T09",
      "M1.9-T10",
      "M1.9-T11",
      "M1.9-T13",
    ],
  },
  {
    id: "postgres",
    label: "PostgreSQL transactions and idempotency",
    command: ["npm", "run", "test:postgres:integration"],
    testGroups: ["M1.9-T03"],
  },
  {
    id: "artifacts",
    label: "S3-compatible ArtifactStore conformance",
    command: ["npm", "run", "test:s3:integration"],
    testGroups: ["M1.9-T04"],
  },
  {
    id: "graph",
    label: "Neo4j projection replay and rebuild",
    command: ["npm", "run", "test:neo4j:integration"],
    testGroups: ["M1.9-T05"],
  },
  {
    id: "document",
    label: "Pinned offline Docling worker",
    command: ["npm", "run", "test:docling:integration"],
    testGroups: ["M1.9-T06", "M1.9-T07"],
  },
  {
    id: "proposal",
    label: "Deterministic evidence proposal quarantine",
    command: ["npm", "run", "test:evidence-proposals:integration"],
    testGroups: ["M1.9-T07", "M1.9-T08"],
  },
  {
    id: "recovery",
    label: "PostgreSQL and ArtifactStore restore with Neo4j rebuild",
    command: ["npm", "run", "test:m1:recovery"],
    testGroups: ["M1.9-T12"],
  },
];

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const requestedStage = args
  .find((argument) => argument.startsWith("--stage="))
  ?.slice("--stage=".length);
const selected =
  requestedStage === undefined
    ? stages
    : stages.filter((stage) => stage.id === requestedStage);

if (requestedStage !== undefined && selected.length === 0) {
  throw new Error(
    `Unknown M1 backend stage ${requestedStage}. Expected one of: ${stages.map(({ id }) => id).join(", ")}.`,
  );
}

const publicStage = (stage) => ({
  id: stage.id,
  label: stage.label,
  command: stage.command.join(" "),
  test_groups: stage.testGroups,
});

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        schema_name: "petra.m1-backend-gate-matrix",
        revision: 1,
        stages: selected.map(publicStage),
        remaining_m1_gate: ["M1.9-DEMO-01..15"],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const run = (stage) =>
  new Promise((resolve) => {
    const [program, ...programArgs] = stage.command;
    const child = spawn(program, programArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", (error) => resolve({ code: 1, error: error.message }));
    child.on("close", (code, signal) =>
      resolve({ code: code ?? 1, signal: signal ?? undefined }),
    );
  });

const completed = [];
const startedAt = new Date().toISOString();
for (const [index, stage] of selected.entries()) {
  console.log(
    `\n[M1 backend ${index + 1}/${selected.length}] ${stage.id}: ${stage.label}`,
  );
  const result = await run(stage);
  if (result.code !== 0) {
    throw new Error(
      `M1 backend stage ${stage.id} failed with exit ${result.code}${result.signal === undefined ? "" : ` (${result.signal})`}${result.error === undefined ? "" : `: ${result.error}`}.`,
    );
  }
  completed.push(stage);
}

console.log(
  JSON.stringify(
    {
      schema_name: "petra.m1-backend-gate-result",
      revision: 1,
      state: "passed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      stages: completed.map(publicStage),
      covered_test_groups: [
        ...new Set(completed.flatMap((stage) => stage.testGroups)),
      ].sort(),
      remaining_m1_gate: ["M1.9-DEMO-01..15"],
      authority_boundary: {
        result_is_scientific_evidence: false,
        component_pass_does_not_complete_m1: true,
      },
    },
    null,
    2,
  ),
);
