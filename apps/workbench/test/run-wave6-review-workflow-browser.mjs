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
  `scripts/.wave6-review-workflow-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 Review workflow requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; Review workflow instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

const seedHelper = `const seedWave6ReviewWorkflow = async ({ pool, scientific }) => {
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const sessions = new PostgresReviewSessionAuthorityRepository(pool);
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const pairSpecs = [
    ["correction", 3],
    ["separation-retained", 4],
    ["separation-moved", 5],
    ["rejection", 6],
    ["apply", 7],
  ];
  const pairs = {};
  for (const [label, sequence] of pairSpecs) {
    const pair = makeScientificPair({
      definition: scientific.definition,
      objective: scientific.objective,
      workUnit: scientific.workUnit,
      sourceSpan: scientific.documentBundle.spans[0],
      workVersion: scientific.workVersion,
      label: \`wave6-review-ui:\${label}\`,
      sequence,
    });
    await evidence.proposeClaim(pair.claim);
    await evidence.proposeAssertion(pair.assertion);
    await working.admitWorkingCandidateRevision({
      candidate: pair.candidate,
      profileRecord: pair.claim,
    });
    await working.admitWorkingRelationshipRevision({
      relationship: pair.relationship,
      profileRecord: pair.assertion,
    });
    pairs[label] = pair;
  }
  const position = await authorityPosition(pool, scientificProjectId);
  const makeSession = async (label, members) => {
    const session = readAccepted("review-session-working-candidate");
    session.review_session_id = derivePetraId(
      "review_session",
      \`wave6-review-ui:\${label}\`,
    );
    session.project_definition_ref = {
      project_definition_id: scientific.definition.project_definition_id,
      revision: scientific.definition.revision,
      content_hash: scientific.definition.content_hash,
    };
    session.content.objective_ref = {
      objective_id: scientific.objective.objective_id,
      revision: scientific.objective.revision,
      content_hash: scientific.objective.content_hash,
    };
    session.content.snapshot = {
      event_position: position.event_position,
      stream_revision: position.stream_revision,
      captured_at: "2026-09-20T20:00:00.000Z",
    };
    session.content.origin.record_refs = [scientific.workUnit.work_unit_id];
    session.content.origin.summary =
      "Opened from the representative Work for the complete visible Review workflow.";
    session.content.return_context = {
      place: "work",
      object_ref: scientific.workUnit.work_unit_id,
      label: "Review workflow Work",
    };
    session.content.members = members;
    session.content_hash = hash(session.content);
    await sessions.registerReviewSessionRevision(session);
    return session;
  };
  const correction = await makeSession("correction", [
    reviewMember(
      pairs.correction,
      derivePetraId("review_member", "wave6-review-ui:correction"),
    ),
  ]);
  const retainedMemberId = derivePetraId(
    "review_member",
    "wave6-review-ui:separation-retained",
  );
  const separatedMemberId = derivePetraId(
    "review_member",
    "wave6-review-ui:separation-moved",
  );
  const separation = await makeSession("separation", [
    reviewMember(pairs["separation-retained"], retainedMemberId),
    reviewMember(pairs["separation-moved"], separatedMemberId, "exception"),
  ]);
  const rejection = await makeSession("rejection", [
    reviewMember(
      pairs.rejection,
      derivePetraId("review_member", "wave6-review-ui:rejection"),
    ),
  ]);
  const apply = await makeSession("apply", [
    reviewMember(
      pairs.apply,
      derivePetraId("review_member", "wave6-review-ui:apply"),
    ),
  ]);
  const registerGrant = async ({ label, version, command, reason }) => {
    const content = {
      scope_kind: "project_commands",
      allowed_commands: [command],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason,
    };
    const grant = {
      schema_name: "petra.capability-grant",
      schema_version: version,
      capability_grant_id: derivePetraId(
        "capability_grant",
        \`wave6-review-ui:\${label}\`,
      ),
      revision: 1,
      project_id: scientificProjectId,
      grantee: { actor_id: humanActorId, actor_kind: "human" },
      content,
      content_hash: hash(content),
      issued_by: { actor_id: humanActorId, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);
  };
  await registerGrant({
    label: "basis-revision",
    version: "1.6.0",
    command: "ReviseReviewCandidateBasis",
    reason:
      "Allow the representative Project author to revise one exact non-authoritative Review basis.",
  });
  await registerGrant({
    label: "separation",
    version: "1.7.0",
    command: "SeparateReviewSessionMember",
    reason:
      "Allow the representative Project author to separate one exact Review member.",
  });
  return {
    correction_review_session_id: correction.review_session_id,
    separation_review_session_id: separation.review_session_id,
    separated_review_member_id: separatedMemberId,
    reject_review_session_id: rejection.review_session_id,
    apply_review_session_id: apply.review_session_id,
    return_work_unit_id: scientific.workUnit.work_unit_id,
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
  `    const wave6ReviewScenario = await seedWave6ReviewWorkflow({
      pool,
      scientific,
    });
    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
      wave6ReviewScenario,
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
      else
        rejectRun(
          new Error(
            `The instrumented Review workflow failed (${code ?? signal}).`,
          ),
        );
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
