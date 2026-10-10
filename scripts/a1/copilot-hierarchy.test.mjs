import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { copilotSurface } from "./copilot-surface.mjs";
let surface;
before(async () => {
  surface = await copilotSurface("execution");
});
after(() => surface?.close());
test("FE-A1.1-W01-AC01 execution: conversation and result remain legible at ordinary desktop widths", async () => {
  const measurements = [];
  for (const [width, height] of [
    [1280, 900],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await surface.resize(width, height);
    const g = await surface.geometry();
    assert(Math.abs(g.agent.width / width - 0.3) < 0.015);
    assert(g.workspace.width >= g.agent.width * 2.2);
    assert(g.transcript.height >= 250);
    assert(g.input.width >= 250 && g.input.height >= 48);
    assert(g.composer.top >= g.agent.top && g.composer.bottom <= height + 1);
    assert(g.viewport.scrollWidth <= width + 1);
    measurements.push(g);
  }
  surface.observations.push({ criterion: "FE-A1.1-W01-AC01", measurements });
});
test("FE-A1.1-W01-AC02 execution: normal retained Q/A and draft remain available while navigating the Workspace", async () => {
  await surface.resize(1440, 1000);
  assert.equal(
    await surface.evaluate(
      "document.querySelector('#project-agent nav')===null",
    ),
    true,
  );
  assert.equal(
    await surface.evaluate(
      "document.querySelectorAll('.copilot-message--user').length>=2 && document.querySelectorAll('.copilot-message--assistant').length>=2",
    ),
    true,
  );
  const draft = "A draft question held while I inspect Sources.";
  await surface.evaluate(
    `(()=>{const e=document.getElementById('copilot-question');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(draft)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await surface.until(
    `document.getElementById('copilot-question').value===${JSON.stringify(draft)}`,
    "draft composition",
  );
  for (const destination of ["sources", "brief"]) {
    await surface.evaluate(
      `document.querySelector('.reference-workspace-chrome a[href$="/${destination}"]').click()`,
    );
    await surface.until(
      `document.querySelector('#project-workspace')?.dataset.workspacePlace===${JSON.stringify(destination)}`,
      "actual Workspace navigation",
    );
    assert.equal(
      await surface.evaluate(
        "document.getElementById('copilot-question').value",
      ),
      draft,
    );
    assert.equal(
      await surface.evaluate(
        "document.querySelector('.copilot-conversation').dataset.readiness",
      ),
      "ready",
    );
  }
  const shownForms = await surface.evaluate(
    "Array.from(document.querySelectorAll('#project-agent form')).filter(e=>e.checkVisibility()).length",
  );
  assert.equal(shownForms, 1);
  surface.observations.push({
    criterion: "FE-A1.1-W01-AC02",
    retained_questions: surface.retained.turns.length,
    draft_retained: true,
    visible_forms: shownForms,
  });
});
test("FE-A1.1-W01-AC03 execution: opening an actual answer makes its Workspace object the strongest visual element", async () => {
  const question = surface.retained.turns.at(-1).question;
  await surface.evaluate(
    "Array.from(document.querySelectorAll('.copilot-open-answer')).at(-1).click()",
  );
  await surface.until(
    `document.querySelector('.copilot-workspace-result h2')?.textContent===${JSON.stringify(question)}`,
    "actual answer in Workspace",
  );
  assert.equal(
    await surface.evaluate(
      "document.getElementById('project-workspace-title').textContent",
    ),
    "Petra answer",
  );
  const g = await surface.geometry();
  assert(g.object.font >= 24 && g.object.font > g.heading.font);
  assert(g.workspace.width >= g.agent.width * 2.2);
  assert.equal(
    await surface.evaluate(
      "document.querySelector('.copilot-workspace-result').textContent.includes('Return to workspace')",
    ),
    true,
  );
  surface.observations.push({
    criterion: "FE-A1.1-W01-AC03",
    question,
    geometry: g,
    workspace_heading: "Petra answer",
  });
});
