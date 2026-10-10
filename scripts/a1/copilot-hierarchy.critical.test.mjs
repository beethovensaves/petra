import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { copilotSurface } from "./copilot-surface.mjs";
let surface;
before(async () => {
  surface = await copilotSurface("critical");
});
after(() => surface?.close());
test("FE-A1.1-W01-AC01 critical: short and narrow viewports preserve accessible composition and sequential panes", async () => {
  await surface.resize(1000, 650);
  let g = await surface.geometry();
  assert(g.composer.bottom <= 650 + 1 && g.composer.top >= g.agent.top);
  assert(g.transcript.height >= 80);
  assert(g.viewport.scrollWidth <= 1001);
  const short = g;
  await surface.resize(640, 800);
  await surface.evaluate(
    "Array.from(document.querySelectorAll('.reference-mobile-pane-switcher button')).find(e=>e.textContent.includes('Agent')).focus()",
  );
  await surface.key("Enter", "Enter", 13);
  await surface.until(
    "document.querySelector('.reference-project-layout').dataset.mobilePane==='agent'",
    "keyboard Agent pane",
  );
  g = await surface.geometry();
  assert.equal(g.workspace.display, "none");
  assert(g.agent.width >= 600 && g.input.width >= 250);
  assert(g.viewport.scrollWidth <= 641);
  assert(g.composer.bottom <= 800 + 1);
  surface.observations.push({
    criterion: "FE-A1.1-W01-AC01",
    short,
    narrow: g,
  });
});
test("FE-A1.1-W01-AC02 critical: expanded disclosures and a long objective cannot crowd out the composer", async () => {
  await surface.resize(1000, 650);
  await surface.evaluate(
    "document.querySelector('.copilot-outcome-disclosure').open=true;document.querySelector('.copilot-registered-synthesis').open=true;document.querySelector('.copilot-work-attention').open=true",
  );
  await surface.evaluate(
    "new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))",
  );
  const g = await surface.geometry();
  assert(g.composer.bottom <= 650 + 1 && g.composer.top >= g.agent.top);
  assert(g.input.height >= 48);
  assert(g.composer.bottom <= g.conversation.bottom + 1);
  assert(g.transcript.height >= 64);
  const composerVisible = await surface.evaluate(
    "(()=>{const e=document.getElementById('copilot-question'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})()",
  );
  assert(
    composerVisible,
    "Expanded controls must not clip or cover the input.",
  );
  surface.observations.push({
    criterion: "FE-A1.1-W01-AC02",
    expanded_geometry: g,
    composer_visible: composerVisible,
  });
  await surface.evaluate(
    "document.querySelector('.copilot-outcome-disclosure').open=false;document.querySelector('.copilot-registered-synthesis').open=false;document.querySelector('.copilot-work-attention').open=false",
  );
});
test("FE-A1.1-W01-AC03 critical: keyboard opening and dismissal preserve the exact answer and route identity", async () => {
  await surface.resize(640, 800);
  await surface.evaluate(
    "Array.from(document.querySelectorAll('.reference-mobile-pane-switcher button')).find(e=>e.textContent.includes('Agent')).click()",
  );
  await surface.until(
    "document.querySelector('.reference-project-layout').dataset.mobilePane==='agent'",
    "independent Agent setup",
  );
  await surface.evaluate(
    "Array.from(document.querySelectorAll('.copilot-open-answer')).at(-1).focus()",
  );
  await surface.key("Enter", "Enter", 13);
  await surface.until(
    "document.querySelector('.reference-project-layout').dataset.mobilePane==='workspace' && document.querySelector('.copilot-workspace-result')!==null",
    "answer activates narrow Workspace",
  );
  assert.equal(
    await surface.evaluate(
      "document.querySelector('.copilot-workspace-result h2').textContent",
    ),
    surface.retained.turns.at(-1).question,
  );
  assert.equal(
    await surface.evaluate(
      "document.getElementById('project-workspace-title').textContent",
    ),
    "Petra answer",
  );
  await surface.evaluate(
    "Array.from(document.querySelectorAll('.copilot-workspace-result button')).find(e=>e.textContent==='Return to workspace').focus()",
  );
  await surface.key("Enter", "Enter", 13);
  await surface.until(
    "document.querySelector('.copilot-workspace-result')===null",
    "return to native Workspace",
  );
  assert.equal(
    await surface.evaluate(
      "document.querySelector('#project-workspace').dataset.workspacePlace",
    ),
    "brief",
  );
  assert.equal(
    await surface.evaluate(
      "document.getElementById('project-workspace-title').textContent",
    ),
    "Outcome",
  );
  await surface.resize(1440, 1000);
  surface.observations.push({
    criterion: "FE-A1.1-W01-AC03",
    exact_answer: true,
    keyboard_activation: true,
    route_after_dismissal: "brief",
    geometry: await surface.geometry(),
  });
});
