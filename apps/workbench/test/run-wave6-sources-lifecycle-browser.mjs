import { spawn } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const backendHarness = resolve(
  root,
  "scripts/test-wave4-cumulative-integration.mjs",
);
const instrumentedHarness = resolve(
  root,
  `scripts/.wave6-sources-lifecycle-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 Sources lifecycle requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; Sources lifecycle instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

const seedHelper = `const seedWave6SourcesLifecycle = async ({ pool, scientific, writing }) => {
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const registerGrant = async ({ label, projectId, commands, reason }) => {
    const content = {
      scope_kind: "project_commands",
      allowed_commands: commands,
      valid_from: "2026-09-01T00:00:00.000Z",
      reason,
    };
    await grants.registerCapabilityGrant({
      schema_name: "petra.capability-grant",
      schema_version: "1.15.0",
      capability_grant_id: derivePetraId(
        "capability_grant",
        \`wave6-sources-ui:\${label}\`,
      ),
      revision: 1,
      project_id: projectId,
      grantee: { actor_id: humanActorId, actor_kind: "human" },
      content,
      content_hash: hash(content),
      issued_by: { actor_id: humanActorId, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    });
  };
  await registerGrant({
    label: "scientific-lifecycle",
    projectId: scientificProjectId,
    commands: [
      "RegisterProjectSource",
      "StartProjectSourceProcessing",
      "AddProjectSourceRevision",
      "CreateProjectSourceReplacement",
    ],
    reason:
      "Allow the representative author to execute the complete visible scientific source lifecycle.",
  });
  await registerGrant({
    label: "writing-reuse-removal",
    projectId: writingProjectId,
    commands: ["ReuseProjectSource", "ExcludeProjectSource"],
    reason:
      "Allow paired-profile source reuse and the separately reviewed Project-link removal.",
  });
  const localCopy = scientific.localCopyWalkthrough?.projectSource;
  assert(
    localCopy !== undefined,
    "The Sources workflow requires the representative eligible local copy.",
  );
  return {
    scientific_project_id: scientificProjectId,
    writing_project_id: writingProjectId,
    local_copy_project_source_id: localCopy.project_source_id,
    local_copy_title: "Local-copy deletion walkthrough",
    scientific_definition_id: scientific.definition.project_definition_id,
    writing_definition_id: writing.definition.project_definition_id,
  };
};

`;

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  "const item53Counts = async (pool) => {",
  `${seedHelper}const item53Counts = async (pool) => {`,
);
source = replaceOnce(
  source,
  `    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
    });`,
  `    const wave6SourcesScenario = await seedWave6SourcesLifecycle({
      pool,
      scientific,
      writing,
    });
    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
      wave6SourcesScenario,
    });`,
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else {
        rejectRun(
          new Error(
            `The instrumented Sources lifecycle failed (${code ?? signal}).`,
          ),
        );
      }
    });
  });

let failure;
try {
  writeFileSync(instrumentedHarness, source, { flag: "wx" });
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    unlinkSync(instrumentedHarness);
  } catch (error) {
    if (error?.code !== "ENOENT" && failure === undefined) failure = error;
  }
}

if (failure !== undefined) throw failure;
