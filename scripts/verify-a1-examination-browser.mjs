import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { serve } from "@hono/node-server";
import { createServer as createVite } from "vite";
import {
  PostgresProjectSemanticGraphReader,
  PostgresProjectShellViewReader,
  PostgresProjectWorkingStateSnapshotReader,
  PostgresCopilotTurnRepository,
  PostgresProjectExaminationRegistry,
  PostgresProjectExaminationRepository,
  PostgresProjectExaminationCommandAuthority,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresSingleUserCommandPrincipalResolver,
  PostgresProjectExaminationOwnerAuthority,
  PostgresWorkingStateAuthorityRepository,
} from "@petra/postgres";
import { ProjectCopilotService } from "../apps/server/src/project-copilot.ts";
import { mountProjectCopilotRoutes } from "../apps/server/src/project-copilot-routes.ts";
import { ProjectExaminationService } from "../apps/server/src/project-examination.ts";
import { mountProjectExaminationRoutes } from "../apps/server/src/project-examination-routes.ts";
import {
  createCdp,
  startChrome,
} from "../apps/workbench/test/cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "..");
const fixture = JSON.parse(
  await readFile(process.env.PETRA_A1_EXAMINATION_FIXTURE, "utf8"),
);
const pool = new pg.Pool({
  connectionString: process.env.PETRA_TEST_POSTGRES_URL,
});
const graphs = new PostgresProjectSemanticGraphReader(pool);
const registry = new PostgresProjectExaminationRegistry(pool);
const records = new PostgresProjectExaminationRepository(
  pool,
  graphs,
  async (project, graph, transaction) =>
    (await registry.resolve(project, graph, transaction))?.kernel,
);
const commands = new PostgresProjectExaminationCommandAuthority(
  pool,
  records,
  graphs,
  registry,
  new PostgresCapabilityGrantCommandAuthorizer(),
);
const ownerAuthority = new PostgresProjectExaminationOwnerAuthority(
  pool,
  graphs,
  registry,
);
const service = new ProjectExaminationService(
  graphs,
  records,
  registry,
  commands,
  new PostgresSingleUserCommandPrincipalResolver(pool, fixture.actor),
  undefined,
  ownerAuthority,
);
const app = new Hono();
app.use("/api/*", bearerAuth({ token: "petra-a1-examination-test" }));
mountProjectExaminationRoutes(app, service);
const copilot = new ProjectCopilotService(
  {
    views: new PostgresProjectShellViewReader(pool),
    semanticGraphs: graphs,
    examinations: service,
    workingStateSnapshots: new PostgresProjectWorkingStateSnapshotReader(pool),
    copilotTurns: new PostgresCopilotTurnRepository(pool),
  },
  fixture.actor.actor_id,
);
mountProjectCopilotRoutes(app, copilot, graphs);
const backend = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
await new Promise((done) =>
  backend.listening ? done() : backend.once("listening", done),
);
const backendUrl = `http://127.0.0.1:${backend.address().port}`;
const vite = await createVite({
  root: resolve(root, "apps/workbench"),
  configFile: resolve(root, "apps/workbench/vite.config.ts"),
  server: {
    host: "127.0.0.1",
    port: 0,
    strictPort: false,
    proxy: { "/api": backendUrl },
  },
});
await vite.listen();
const origin = vite.resolvedUrls.local[0].replace(/\/$/, "");
const chrome = await startChrome({ profilePrefix: "petra-a1-examination-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  const errors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
  });
  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  const click = async (text, selector = "button") => {
    await until(
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).some(el=>el.textContent.trim()===${JSON.stringify(text)} && !el.disabled)`,
      text,
    );
    await evaluate(
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>el.textContent.trim()===${JSON.stringify(text)}).click()`,
    );
  };
  const field = async (label, value) => {
    await evaluate(
      `(() => { const label=Array.from(document.querySelectorAll('label')).find(el=>el.firstChild?.textContent.trim()===${JSON.stringify(label)}); if(!label) throw new Error('Missing field '+${JSON.stringify(label)}); const input=label.querySelector('input,textarea,select'); Object.getOwnPropertyDescriptor(input.constructor.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true})); })()`,
    );
  };
  const record = async (review) => {
    await click(review);
    await click("Record this review");
    await until(
      "document.querySelector('.cycle-review')===null",
      "retained reviewed record",
    );
    assert.equal(
      await evaluate(
        "document.querySelector('.hypothesis-cycles [role=alert]')?.textContent ?? ''",
      ),
      "",
    );
  };
  const navigate = async () => {
    await send("Page.navigate", {
      url: `${origin}/test/a1-examination-functions.html?project=${fixture.projectId}`,
    });
    await until(
      "document.querySelector('.hypothesis-cycles') && (document.querySelector('.hypothesis-cycles')?.textContent.includes('Frame a Hypothesis') || document.querySelector('.hypothesis-cycles')?.textContent.includes('H1'))",
      "registered native examiner",
    );
  };
  await navigate();
  await click("Review examination permission");
  await click("Authorize my examinations");
  await until(
    "!Array.from(document.querySelectorAll('fieldset')).find(el=>el.textContent.includes('Frame a Hypothesis')).disabled",
    "owner-only authority recorded",
  );
  await field(
    "Short descriptor",
    "Bounded source-supported research hypothesis",
  );
  await field(
    "Why examine it?",
    "Examine only the reported population and source wording.",
  );
  await field(
    "What would count against it? One condition per line.",
    "A contrary passage within this exact bounded source would challenge the target.",
  );
  await record("Review Hypothesis");
  await click("Start examination on this basis");
  await field(
    "Source set and search boundary",
    "No source passages have been examined yet; this first cycle declares the represented source set as unsearched.",
  );
  await record("Review examination");
  await record("Review posture and obligations");
  await field("Conclusion", "insufficient");
  await record("Review cycle conclusion");
  const first = await service.read(fixture.projectId);
  assert.equal(first.records.length, 4);
  assert.equal(first.receipts.length, 4);
  assert(
    first.records.some(
      (r) =>
        r.schema_name === "petra.cycle-disposition" &&
        r.content.disposition === "insufficient",
    ),
  );
  await new PostgresWorkingStateAuthorityRepository(
    pool,
  ).admitWorkingCandidateRevision({
    candidate: fixture.correction.candidate,
    profileRecord: fixture.correction.claim,
  });
  await navigate();
  await until(
    "document.querySelector('.hypothesis-cycles')?.textContent.includes('invalidated')",
    "changed basis invalidates earlier judgment",
  );
  await record("Review binding to the current Claim");
  await click("Start examination on this basis");
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('.cycle-criterion select')).every(el=>el.value==='unknown')",
    ),
  );
  await evaluate(
    "document.querySelector('.hypothesis-cycles input[type=checkbox]').click()",
  );
  for (const label of [
    "Source fidelity",
    "Scope compatibility",
    "Contrary basis review",
  ])
    await field(label, "passed");
  for (let index = 0; index < 3; index++)
    await evaluate(
      `(() => {const input=document.querySelectorAll('.cycle-criterion textarea')[${index}];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Human checked this exact passage and the declared bounded scope; independent replication remains unknown.');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
  await field("Coverage", "bounded_search");
  await field(
    "Source set and search boundary",
    "Reviewed the one represented exact passage and corrected Claim scope for contradictory wording. No external or exhaustive search was performed.",
  );
  await field("Scoped finding", "scientific.scoped_support");
  await field(
    "Review rationale",
    "The required checks pass only for the declared source and scope; no independent replication has been examined.",
  );
  await record("Review examination");
  await field("Primary posture", "consolidate");
  await record("Review posture and obligations");
  await field("Conclusion", "supporting_within_scope");
  await record("Review cycle conclusion");
  const second = await service.read(fixture.projectId);
  assert.equal(second.records.length, 8);
  assert.equal(second.receipts.length, 8);
  assert.equal(
    second.scene.content.graph_content_hash,
    second.graph.content_hash,
  );
  assert(
    second.records.some(
      (r) =>
        r.schema_name === "petra.cycle-disposition" &&
        r.content.disposition === "supporting_within_scope" &&
        r.content.unresolved_questions.length > 0,
    ),
  );
  assert(
    second.scene.content.relationships.some(
      (e) => e.predicate === "prior_disposition",
    ),
  );
  await send("Page.reload");
  await until(
    "document.querySelector('.hypothesis-cycles')?.textContent.includes('H1') && document.querySelectorAll('[data-cycle-node]').length>=8",
    "reload retains cycles and graph",
  );
  await click("Read all represented objects and paths", "summary");
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.examination-graph-peer ol > li').length",
    ),
    second.scene.content.nodes.length,
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.examination-graph-peer ul > li').length",
    ),
    second.scene.content.relationships.length,
  );
  await until(
    "document.querySelector('[data-shared-scene-read]')?.dataset.sharedSceneRead==='ready'",
    "exact shared scene accepted through authenticated copilot read",
  );
  const shared = await evaluate(
    "JSON.parse(document.querySelector('[data-shared-scene-read]').dataset.sharedBinding)",
  );
  assert.equal(
    shared.parameters.semantic_content_hash,
    second.scene.content_hash,
  );
  await evaluate(
    "(() => { const select=document.querySelector('select[aria-label=\"Filter examination graph kinds\"]'); select.value='petra.hypothesis'; select.dispatchEvent(new Event('change',{bubbles:true})); })()",
  );
  await until(
    "document.querySelector('[data-shared-scene-read]')?.dataset.sharedSceneRead==='ready' && JSON.parse(document.querySelector('[data-shared-scene-read]').dataset.sharedBinding).parameters.excluded_kinds.length>0",
    "filtered shared scene and peer accepted",
  );
  const filtered = await evaluate(
    "JSON.parse(document.querySelector('[data-shared-scene-read]').dataset.sharedBinding)",
  );
  assert.notEqual(filtered.content_hash, shared.content_hash);
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.examination-graph-peer ol > li').length",
    ),
    second.scene.content.nodes.filter(
      (node) => node.kind === "petra.hypothesis",
    ).length,
  );
  const mismatchedPeerStatus = await evaluate(
    `(async () => { const binding=JSON.parse(document.querySelector('[data-shared-scene-read]').dataset.sharedBinding); binding.peer_content_hash='sha256:'+ 'f'.repeat(64); const query=new URLSearchParams({focus:JSON.stringify(binding.parameters.selected_keys),scene:JSON.stringify(binding)}); const response=await fetch('/api/projects/${fixture.projectId}/copilot?'+query,{headers:{authorization:'Bearer petra-a1-examination-test'}}); return response.status; })()`,
  );
  assert.equal(mismatchedPeerStatus, 409);
  assert.deepEqual(errors, []);
  const proof = {
    status: "passed",
    verified_at: new Date().toISOString(),
    scope:
      "Connected function verification using production native examiner, permission review, cycle controls, graph renderer and actual authenticated HTTP/PostgreSQL command owners. Basis correction uses the existing trusted working-state owner in the disposable test fixture. No model call, external evidence search or scenario gate.",
    project_id: fixture.projectId,
    records: second.records.length,
    receipts: second.receipts.length,
    scene_content_hash: second.scene.content_hash,
    graph_content_hash: second.graph.content_hash,
    shared_presentation_hash: shared.content_hash,
    filtered_shared_presentation_hash: filtered.content_hash,
    mismatched_peer_status: mismatchedPeerStatus,
    functions: [
      "review_owner_only_examination_permission",
      "record_hypothesis",
      "record_named_unknown_criteria",
      "record_posture_and_open_obligations",
      "record_insufficiency_and_unknowns",
      "invalidate_changed_target",
      "review_rebinding",
      "reset_stale_draft_judgments",
      "record_scoped_support_with_exact_passage",
      "satisfy_registered_obligations",
      "retain_explicit_scoped_disposition_and_prior_cycle",
      "restore_records_receipts_and_graph_after_reload",
      "match_graph_and_accessible_peer",
      "bind_visible_scene_through_authenticated_copilot_read",
      "retain_active_kind_filter_and_scene_omissions",
      "reject_mismatched_shared_peer",
    ],
    browser_errors: errors,
  };
  await writeFile(
    resolve(root, "reports/FE-A1-EXAMINATION-FUNCTION-BROWSER.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  process.stdout.write("Examination browser functions passed.\n");
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((done) => chrome.child.once("exit", done));
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
  await vite.close();
  await new Promise((done) => backend.close(done));
  await pool.end();
}
