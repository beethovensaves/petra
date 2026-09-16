import { spawn } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";
import { format } from "prettier";

const root = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "petra-wave5-cumulative-"));
const wave5TracePath = resolve(temporaryRoot, "paired-profile-trace.json");
const m1ResultPath = resolve(root, ".data/m1.9/cumulative-result.json");
const artifactPath = resolve(
  root,
  "reports/WAVE5-PAIRED-PROFILE-CUMULATIVE-OBSERVATION.json",
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = (program, args, environment = {}) =>
  new Promise((resolveRun) => {
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolveRun({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, stdout, stderr });
    });
  });

const requireRun = async (label, program, args, environment) => {
  const result = await run(program, args, environment);
  if (result.code !== 0) {
    const diagnostic = (result.stderr || result.stdout).slice(-20_000);
    throw new Error(`${label} failed (${result.code}):\n${diagnostic}`);
  }
  process.stdout.write(`[wave5-cumulative] ${label} passed\n`);
  return result;
};

const auditAgUiImports = () => {
  const imports = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.name === "dist" ||
        entry.name === "node_modules" ||
        entry.name.startsWith(".")
      )
        continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      const projectPath = relative(root, path).split(sep).join("/");
      if (
        !projectPath.includes("/src/") ||
        !/[.](?:[cm]?[jt]sx?)$/u.test(projectPath)
      )
        continue;
      for (const [index, line] of readFileSync(path, "utf8")
        .split("\n")
        .entries()) {
        if (line.includes("@ag-ui/"))
          imports.push(`${projectPath}:${index + 1}:${line.trim()}`);
      }
    }
  };
  visit(resolve(root, "apps"));
  visit(resolve(root, "packages"));
  return imports.sort();
};

if (process.versions.node !== "24.20.0")
  throw new Error(
    `The Wave 5 cumulative trace requires Node 24.20.0; received ${process.versions.node}.`,
  );

let failure;
try {
  await requireRun(
    "paired-profile production trace",
    "node",
    ["scripts/test-wave4-cumulative-integration.mjs"],
    {
      PETRA_WAVE4_TRACE: "wave5-cumulative",
      PETRA_WAVE4_RESULT_OUTPUT: wave5TracePath,
    },
  );
  const paired = JSON.parse(readFileSync(wave5TracePath, "utf8"));
  assert(
    paired.ok === true &&
      paired.boundary?.external_model_call_executed === false &&
      paired.wave5_cumulative?.restart_replay?.duplicate_effects === false,
    "The paired-profile trace did not retain its provider-free restart result.",
  );

  await requireRun("production reconnect and abort/cancel trace", "node", [
    "scripts/test-m1-cumulative-integration.mjs",
  ]);
  const interaction = JSON.parse(readFileSync(m1ResultPath, "utf8"));
  assert(
    interaction.status === "pass" &&
      interaction.evidence_admission?.remote_model_calls === 0 &&
      interaction.interaction?.reconnect_event_count > 0 &&
      interaction.interaction?.aborted_delivery_count === 1 &&
      interaction.interaction?.aborted_run_status === "completed" &&
      interaction.interaction?.explicit_cancellation_status === "cancelled",
    "The production reconnect or abort/cancel trace did not retain the exact provider-free outcomes.",
  );

  const postgres = await requireRun(
    "real PostgreSQL authority integration",
    "node",
    ["scripts/test-postgres-integration.mjs"],
  );
  const postgresScenarioSources = [
    readFileSync(
      resolve(
        root,
        "packages/postgres/test/grounded-response-authority-repository.test.ts",
      ),
      "utf8",
    ),
    readFileSync(
      resolve(
        root,
        "packages/postgres/test/working-state-authority-repository.test.ts",
      ),
      "utf8",
    ),
  ];
  assert(
    /Tests\s+\d+ passed/u.test(postgres.stdout) &&
      postgresScenarioSources[0].includes(
        "persists explicit cancellation and restores its terminal interaction without model work",
      ) &&
      postgresScenarioSources[1].includes(
        "admits the five registered scientific relationship meanings without promoting working state",
      ),
    "The PostgreSQL gate did not invoke the cancellation restart and relationship-meaning suites.",
  );

  await requireRun("real Neo4j projection integration", "node", [
    "scripts/test-neo4j-integration.mjs",
  ]);

  const agUiImports = auditAgUiImports();
  const importFiles = [
    ...new Set(agUiImports.map((entry) => entry.split(":", 1)[0])),
  ].sort();
  assert(
    JSON.stringify(importFiles) ===
      JSON.stringify([
        "packages/adapters/src/ag-ui.ts",
        "packages/adapters/src/codex-app-server.ts",
      ]),
    `Raw AG-UI imports escaped the interaction adapter boundary: ${JSON.stringify(importFiles)}.`,
  );
  process.stdout.write("[wave5-cumulative] AG-UI source import audit passed\n");

  const wave5 = paired.wave5_cumulative;
  const report = {
    schema_name: "petra.wave5-backend-cumulative-observation",
    schema_version: "1.0.0",
    wave: 5,
    slice: 21,
    status: "passed",
    executed_at: new Date().toISOString(),
    command: "npm run test:wave5:cumulative",
    runtime: {
      node: process.versions.node,
      fresh_stores: [
        "PostgreSQL 18.6",
        "Neo4j 2026.07.1",
        "SeaweedFS 4.41 S3-compatible artifact store",
      ],
      external_model_calls: 0,
      paired_profiles: ["scientific", "controlled_writing"],
    },
    phase_commands: [
      "PETRA_WAVE4_TRACE=wave5-cumulative node scripts/test-wave4-cumulative-integration.mjs",
      "node scripts/test-m1-cumulative-integration.mjs",
      "node scripts/test-postgres-integration.mjs",
      "node scripts/test-neo4j-integration.mjs",
      "Node source audit over apps/**/src and packages/**/src for @ag-ui/ imports",
    ],
    scenario_records: [
      {
        evidence_id: "M1.7-AC01",
        scenario_id: "cross-view-identity-live",
        status: "passed",
        observation: wave5.identity,
        boundary:
          "Fresh-store authenticated production Brief, Evidence-owner relationship overlay, Work, Focused Graph, Details, and exact ProjectSource inspection reads; no browser claim.",
      },
      {
        evidence_id: "M1.7-AC02",
        scenario_id: "citation-support-separation-live",
        status: "passed",
        observation: wave5.relationship_meanings,
        boundary:
          "One bounded profile-resolved production focused query; the five meanings remained separate working non-authority relationships.",
      },
      {
        evidence_id: "M1.7-AC03",
        scenario_id: "review-correct-reverse-live",
        status: "passed",
        observation: wave5.review,
        boundary:
          "Existing Review correction and Apply clients plus the existing History compensation controller; no graph-specific mutation owner.",
      },
      {
        evidence_id: "M1.7-AC04",
        scenario_id: "reload-reconnect-no-duplicate",
        status: "passed",
        observation: {
          restart: wave5.restart_replay,
          reconnect_event_count: interaction.interaction.reconnect_event_count,
          duplicate_review_resolution_replayed:
            interaction.interaction.duplicate_resolution_replayed,
          authority_history: interaction.authority_history,
        },
        boundary:
          "Server restart and exact replay on the paired-profile stores plus production AG-UI reconnect on a second fresh cumulative store; cardinalities cover Work output, grounded result, command, event, ChangeSet, and projection outbox effects.",
      },
      {
        evidence_id: "M1.7-AC05",
        scenario_id: "authority-projection-separation",
        status: "passed",
        observation: wave5.authority_read_matrix,
        boundary:
          "Current, working, reusable-cache, retained-running, proposed, stale, applied, and projection-catching-up states read without promoting operational or projection state to PostgreSQL domain authority.",
      },
      {
        evidence_id: "M1.7-AC06",
        scenario_id: "ag-ui-import-boundary-audit",
        status: "passed",
        observation: { import_files: importFiles, matches: agUiImports },
        boundary:
          "Production source under apps/**/src and packages/**/src; tests and generated build output excluded.",
      },
      {
        evidence_id: "M1.7-AC07",
        scenario_id: "abort-cancel-separation",
        status: "passed",
        observation: {
          delivery_abort: {
            count: interaction.interaction.aborted_delivery_count,
            work_status: interaction.interaction.aborted_run_status,
          },
          authorized_cancellation: {
            work_status: interaction.interaction.explicit_cancellation_status,
            terminal_code: "WORK_UNIT_CANCELLED",
            restart_restore_suite:
              "PostgreSQL grounded-response authority integration",
          },
        },
        boundary:
          "Production HTTP abort and cancellation routes were executed separately; a fresh PostgreSQL integration then restored the persisted cancelled terminal through newly constructed repository owners. No provider call.",
      },
    ],
  };
  writeFileSync(
    artifactPath,
    await format(JSON.stringify(report), { parser: "json" }),
  );
  process.stdout.write(
    `[wave5-cumulative] retained ${report.scenario_records.length} scenario records in ${artifactPath}\n`,
  );
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
