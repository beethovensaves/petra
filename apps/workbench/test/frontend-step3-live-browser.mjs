import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const applicationUrl =
  process.env.PETRA_LIVE_APP_URL ?? "http://127.0.0.1:4311/";
let chrome;
let cdp;
let failure;

const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

try {
  chrome = await startChrome({ profilePrefix: "petra-frontend-step3-" });
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  const browserFailures = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "assert"].includes(message.params?.type)
    ) {
      browserFailures.push(message.params.args?.map((item) => item.value));
    }
    if (message.method === "Runtime.exceptionThrown") {
      browserFailures.push(message.params?.exceptionDetails);
    }
  });
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);

  const navigateHome = async () => {
    const navigation = await send("Page.navigate", { url: applicationUrl });
    assert.equal(navigation.errorText, undefined);
    await until(`${button("New Project")} != null`, "Project collection");
    await evaluate("document.fonts.ready");
  };
  const setControl = async (selector, value) => {
    await until(`document.querySelector(${JSON.stringify(selector)}) != null`);
    await evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      const prototype = control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(
        control,
        ${JSON.stringify(value)},
      );
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
  };
  const createProject = async ({ outcome, name, definition, initialFile }) => {
    await navigateHome();
    await evaluate(`${button("New Project")}.click()`);
    await until(
      'document.querySelector("#new-project-title")?.textContent === "Create a Project"',
      "outcome-first creation panel",
    );
    const creationText = await evaluate(
      'document.querySelector(".project-profile-command").innerText',
    );
    assert.ok(creationText.includes("What are you trying to accomplish?"));
    assert.ok(creationText.includes("Start from an example (optional)"));
    assert.ok(!creationText.includes("Choose a registered profile"));
    await setControl(".project-profile-command textarea", outcome);
    await setControl(
      '.project-profile-command input.petra-field__control:not([type="file"])',
      name,
    );
    if (initialFile !== undefined) {
      await evaluate(`(() => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(
          [${JSON.stringify(initialFile.content)}],
          ${JSON.stringify(initialFile.name)},
          { type: "text/plain", lastModified: 1790136000000 },
        ));
        const control = document.querySelector('.project-definition-files input[type="file"]');
        control.files = transfer.files;
        control.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
    }
    assert.equal(
      await evaluate(
        `${button("Review Project")}.getAttribute("aria-disabled")`,
      ),
      null,
    );
    await evaluate(`${button("Review Project")}.click()`);
    await until(
      `document.querySelector(".project-definition-review")?.innerText.includes(${JSON.stringify(definition)})`,
      `${definition} definition review`,
    );
    const reviewText = await evaluate(
      'document.querySelector(".project-definition-review").innerText',
    );
    for (const phrase of [
      outcome,
      "Starting capabilities",
      "Assumptions",
      "Not available in this definition",
    ]) {
      assert.ok(reviewText.includes(phrase), `Draft review omitted ${phrase}`);
    }
    await evaluate(`(() => {
      const control = document.querySelector('.project-definition-review input[type="checkbox"]');
      control.click();
    })()`);
    assert.equal(
      await evaluate(
        `${button("Create Project")}.getAttribute("aria-disabled")`,
      ),
      null,
    );
    await evaluate(`${button("Create Project")}.click()`);
    await until(
      initialFile === undefined
        ? 'window.location.pathname.startsWith("/projects/project_") && window.location.pathname.endsWith("/brief") && document.querySelector(".live-project-brief h1")?.textContent === "Brief"'
        : `window.location.pathname.startsWith("/projects/project_") && window.location.pathname.endsWith("/sources") && document.querySelector("#source-registration-title") != null && document.body.innerText.includes(${JSON.stringify(initialFile.name)})`,
      initialFile === undefined
        ? "receipt-bound Project Brief"
        : "initial file source and rights review",
    );
    const projectId = await evaluate('window.location.pathname.split("/")[2]');
    const body = await evaluate("document.body.innerText");
    assert.ok(body.includes(name));
    assert.ok(body.includes(outcome));
    return {
      projectId,
      definition,
      name,
      outcome,
      initialFileRetained: initialFile?.name,
    };
  };

  const projects = [];
  projects.push(
    await createProject({
      outcome:
        "Compare scientific claims against scholarly evidence and retained sources.",
      name: "Step 3 scientific inquiry",
      definition: "Scientific evidence inquiry",
    }),
  );
  projects.push(
    await createProject({
      outcome:
        "Prepare a controlled writing procedure governed by auditable requirements.",
      name: "Step 3 controlled procedure",
      definition: "Controlled writing",
    }),
  );
  projects.push(
    await createProject({
      outcome:
        "Plan a neighborhood block party with a budget, volunteer shifts, and a rain date.",
      name: "Step 3 neighborhood gathering",
      definition: "Outcome-led Project",
      initialFile: {
        name: "neighborhood-plan.txt",
        content: "Budget, volunteer shifts, and rain-date notes.",
      },
    }),
  );

  assert.equal(new Set(projects.map(({ projectId }) => projectId)).size, 3);
  assert.deepEqual(browserFailures, []);
  const artifact = {
    schema_name: "petra.frontend-step3-agnostic-project-creation",
    schema_version: "1.0.0",
    status: "passed",
    executed_at: new Date().toISOString(),
    application_url: applicationUrl,
    projects,
    verified: {
      same_shell: true,
      mandatory_profile_selection_absent: true,
      reviewed_definition_before_creation: true,
      assumptions_and_limits_visible: true,
      receipt_bound_destination: true,
      initial_file_retained_for_source_rights_review: true,
    },
  };
  writeFileSync(
    resolve(
      import.meta.dirname,
      "../../../reports/FRONTEND-STEP3-AGNOSTIC-PROJECT-CREATION.json",
    ),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} catch (error) {
  failure = error;
} finally {
  try {
    if (cdp?.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
        new Promise((resolveClose) => setTimeout(resolveClose, 2_000)),
      ]);
    }
  } finally {
    cdp?.socket.close();
    if (chrome?.child.exitCode === null) chrome.child.kill("SIGTERM");
    if (chrome !== undefined) {
      await Promise.race([
        new Promise((resolveExit) =>
          chrome.child.addListener("close", resolveExit),
        ),
        new Promise((resolveExit) => setTimeout(resolveExit, 5_000)),
      ]);
      if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
      assert.ok(
        chrome.profile.startsWith(join(tmpdir(), "petra-frontend-step3-")),
      );
      rmSync(chrome.profile, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  }
}

if (failure !== undefined) throw failure;
