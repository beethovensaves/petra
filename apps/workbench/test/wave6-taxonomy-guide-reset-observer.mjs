import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const stablePort = 4311;
const stableUrl = `http://127.0.0.1:${stablePort}`;
const createdProjectName = "Wave 6 controlled-writing orientation Project";
const createdFocus =
  "Prepare a controlled explanation whose requirements remain bound to exact authority sources.";
const replacementProjectName = "Wave 6 controlled-writing reset Project";
const replacementFocus =
  "Return to a registered writing start with every requirement traceable to an authority source.";

const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const exactLink = (label) =>
  `[...document.querySelectorAll("a")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const projectMapLink = (label) =>
  `[...document.querySelectorAll(".reference-project-nav nav a")].find((element) => element.querySelector(":scope > span")?.textContent.trim() === ${JSON.stringify(label)})`;
const profileCard = (family) =>
  `document.querySelector('[data-family=${JSON.stringify(family)}]')`;
const fieldControl = (label) => `(()=>{
  const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.querySelector(".petra-field__label")?.textContent.startsWith(${JSON.stringify(label)}));
  return field?.querySelector("input, textarea, select");
})()`;

export const createWave4EvidenceObserver = async ({ root }) => {
  const output = resolve(
    root,
    process.env.PETRA_WAVE6_TAXONOMY_GUIDE_RESET_BROWSER_OUTPUT ??
      "reports/WAVE6-TAXONOMY-GUIDE-RESET-BROWSER.json",
  );
  const calls = [];
  const consoleFailures = [];
  let browser;
  let observation;
  let observerFailure;
  let closed = false;

  const readReviewSelection = async (context, reviewSessionId) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${context.scientificProjectId}/reviews/${reviewSessionId}`,
        context.backendUrl,
      ),
      { headers: { authorization: `Bearer ${context.token}` } },
    );
    assert.equal(response.status, 200);
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.ok(session && selected);
    return {
      project_id: context.scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    };
  };

  const prepareAndApply = async (context, reviewSessionId, beforeApply) => {
    const client = new ReviewSessionApplyClient({
      baseUrl: context.backendUrl,
      token: context.token,
    });
    const checkpoint = await client.prepare(
      await readReviewSelection(context, reviewSessionId),
    );
    await beforeApply?.();
    const request = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint,
      decided_at: new Date().toISOString(),
    };
    return { request, result: await client.apply(request) };
  };

  const runBrowser = async (context) => {
    const workbench = await startWorkbench({
      root,
      getBackendUrl: () => context.backendUrl,
      calls,
      port: stablePort,
      strictPort: true,
    });
    assert.equal(workbench.url, stableUrl);
    const chrome = await startChrome({
      profilePrefix: "petra-wave6-taxonomy-guide-reset-",
    });
    const cdp = await createCdp(chrome.socketUrl);
    browser = { workbench, chrome, cdp };
    const { send, evaluate, until } = cdp;

    cdp.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (
        message.method === "Runtime.consoleAPICalled" &&
        ["error", "assert"].includes(message.params?.type)
      ) {
        consoleFailures.push(
          message.params.args?.map(
            (argument) => argument.value ?? argument.description,
          ),
        );
      }
      if (message.method === "Runtime.exceptionThrown") {
        consoleFailures.push(
          message.params?.exceptionDetails?.exception?.description ??
            message.params?.exceptionDetails,
        );
      }
    });

    await Promise.all([
      send("Page.enable"),
      send("Runtime.enable"),
      send("Accessibility.enable"),
      send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 960,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);

    const summarizeCalls = () =>
      calls.slice(-20).map((call) => ({
        method: call.method,
        path: call.path,
        status: call.status,
        request_schema: call.requestJson?.schema_name,
        response_schema: call.json?.schema_name,
        error_code: call.json?.error?.code,
      }));
    const navigate = async (path, ready, label) => {
      const navigation = await send("Page.navigate", {
        url: new URL(path, workbench.url).href,
      });
      assert.equal(navigation.errorText, undefined);
      try {
        await until(ready, label);
        await evaluate("document.fonts.ready");
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(summarizeCalls())}\nConsole: ${JSON.stringify(consoleFailures)}`,
          { cause: error },
        );
      }
    };
    const activate = async (expression, label) => {
      await until(`(${expression}) != null`, label);
      await evaluate(`(${expression}).focus()`);
      assert.equal(
        await evaluate(`document.activeElement === (${expression})`),
        true,
      );
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        text: "\r",
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
      });
    };
    const click = async (expression, label) => {
      await until(`(${expression}) != null`, label);
      await evaluate(`(${expression}).click()`);
    };
    const setField = async (label, value) =>
      evaluate(`(()=>{
        const control=${fieldControl(label)};
        if(!control) throw new Error("Missing field: " + ${JSON.stringify(label)});
        const prototype=control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : control instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype,"value").set.call(control,${JSON.stringify(value)});
        control.dispatchEvent(new Event(control instanceof HTMLSelectElement?"change":"input",{bubbles:true}));
        control.dispatchEvent(new Event("change",{bubbles:true}));
      })()`);
    const bodyText = () => evaluate("document.body.textContent");
    const assertIncludes = (text, phrases, label) => {
      for (const phrase of phrases) {
        assert.ok(text.includes(phrase), `${label} omitted ${phrase}.`);
      }
    };
    const inspectChoice = async (family, phrases) => {
      const card = profileCard(family);
      await click(`${card}.querySelector("summary")`, `${family} inspection`);
      await until(`${card}.querySelector("details").open === true`, family);
      assertIncludes(await evaluate(`${card}.textContent`), phrases, family);
      await click(
        `${card}.querySelector('input[name="project-profile"]')`,
        `${family} choice`,
      );
      assert.equal(
        await evaluate(
          `${card}.querySelector('input[name="project-profile"]').checked`,
        ),
        true,
      );
    };

    const originalGuide = `/guide?project=${encodeURIComponent(context.scientificProjectId)}`;
    await navigate(
      originalGuide,
      'document.querySelector(".checkpoint-guide__start") !== null',
      "stable in-product guide",
    );
    const guideText = await bodyText();
    assertIncludes(
      guideText,
      [
        "Use Petra for one grounded Project task",
        "Starting state",
        "Scientific evidence inquiry",
        "Expected outcomes",
        "Safe optional mutations",
        "Return to a registered start",
        "Known limits",
      ],
      "guide",
    );
    const originalTitle = await evaluate(
      'document.querySelector("#checkpoint-start-title").textContent.trim()',
    );
    await activate(exactLink("Return to Projects"), "guide return");
    await until(
      'window.location.pathname === "/" && document.querySelector(".reference-projects") !== null',
      "Projects collection",
    );

    await activate(button("New Project"), "New Project");
    await until(
      'document.querySelector("#new-project-title") !== null',
      "Project creation",
    );
    await inspectChoice("petra.scientific-evidence", [
      "Scientific evidence inquiry",
      "Terms used in this Project",
      "Object kinds",
      "Relationship meanings",
      "Source roles",
      "Validators",
      "Work families",
      "Model roles",
      "Review destinations",
      "Supported places",
      "Unavailable operations",
      "Research questions",
      "Evidence link",
      "Grounded synthesis",
      "Grounded synthesist",
      "Claim Review",
      "Delete local copy",
    ]);
    await inspectChoice("petra.controlled-writing", [
      "Controlled writing",
      "Terms used in this Project",
      "Object kinds",
      "Relationship meanings",
      "Source roles",
      "Validators",
      "Work families",
      "Model roles",
      "Review destinations",
      "Supported places",
      "Unavailable operations",
      "Document purposes",
      "Authority sources",
      "Governing link",
      "Requirement Review",
      "Ask a controlled-writing model",
      "Start controlled-writing Work",
      "Delete local copy",
    ]);
    await setField("Project name", createdProjectName);
    await setField(
      "Project description",
      "Created from the visible registered profile choice.",
    );
    await setField("First focus", createdFocus);
    await click(button("Create Project"), "create Project command");
    await until(
      `window.location.pathname.startsWith("/projects/") && window.location.pathname.endsWith("/brief") && document.body.innerText.includes(${JSON.stringify(createdProjectName)})`,
      "created controlled-writing Brief",
    );
    const createCall = calls.findLast(
      (call) =>
        call.method === "POST" && call.path === "/api/commands/projects",
    );
    assert.equal(createCall?.status, 201);
    assert.equal(
      createCall?.requestJson?.profile_ref?.profile_id,
      "project_template_01K6P000000000000000000002",
    );
    const createdProjectId = createCall?.json?.destination?.project_id;
    assert.ok(createdProjectId);
    assertIncludes(
      await bodyText(),
      ["Controlled writing", createdFocus, "Project map", "Authority sources"],
      "created Brief and Project map",
    );
    const createdGuideHref = await evaluate(
      'document.querySelector(".reference-guide-link").getAttribute("href")',
    );
    assert.equal(createdGuideHref, `/guide?project=${createdProjectId}`);

    await navigate(
      `/projects/${context.scientificProjectId}/brief`,
      'document.querySelector(".live-project-brief") !== null',
      "representative scientific Brief",
    );
    const projectMap = await evaluate(
      'document.querySelector(".reference-project-nav").textContent',
    );
    assertIncludes(
      projectMap,
      [
        "Project map",
        "Brief",
        "Ask Petra",
        "Work",
        "Sources",
        "Graph",
        "Review",
        "History",
        "Composition",
        "Profile terms",
        "Research questions",
        "Claims",
      ],
      "scientific Project map",
    );
    await click(
      exactLink("Inspect Project profile"),
      "Project profile from the Project map",
    );
    await until(
      `window.location.pathname === ${JSON.stringify(`/projects/${context.scientificProjectId}/profile`)} && document.querySelector(".profile-taxonomy") !== null`,
      "scientific profile taxonomy",
    );
    const scientificTaxonomy = await evaluate(
      'document.querySelector(".profile-taxonomy").textContent',
    );
    assertIncludes(
      scientificTaxonomy,
      [
        "Scientific evidence inquiry",
        "Terms used in this Project",
        "Object kinds",
        "Relationship meanings",
        "Source roles",
        "Validators",
        "Work families",
        "Model roles",
        "Review destinations",
        "Supported places",
        "Unavailable operations",
        "Research question",
        "Claim",
        "Source",
        "Evidence relationship",
        "Grounded synthesis",
        "Grounded synthesist",
        "Project-authored definitions need an exact registered Review destination",
        "Use registered profile operations",
      ],
      "scientific taxonomy",
    );

    const corePlaces = [
      ["Sources", "/sources", "Sources"],
      ["Graph", "/graph", "Graph"],
      ["Review", "/review", "Review"],
      ["Work", "/work", "Work"],
      ["Ask Petra", "/petra", "Petra"],
      ["History", "/history", "History"],
    ];
    const coreSurfaceChecks = [];
    for (const [linkLabel, suffix, expectedText] of corePlaces) {
      await activate(
        projectMapLink(linkLabel),
        `${linkLabel} Project-map link`,
      );
      await until(
        `window.location.pathname === ${JSON.stringify(`/projects/${context.scientificProjectId}${suffix}`)} && document.querySelector("#reference-main") !== null`,
        `${linkLabel} surface`,
      );
      const text = await bodyText();
      assert.ok(
        text.includes(expectedText),
        `${linkLabel} lost its task label.`,
      );
      assert.ok(
        text.includes(originalTitle),
        `${linkLabel} lost Project context.`,
      );
      assert.ok(text.includes("Project map"), `${linkLabel} lost the map.`);
      coreSurfaceChecks.push({ place: linkLabel, path: suffix });
    }

    await activate(exactLink("Settings"), "Project Settings");
    await until(
      `window.location.pathname === "/settings" && document.body.innerText.includes(${JSON.stringify(originalTitle)})`,
      "Project reset Settings",
    );
    assertIncludes(
      await bodyText(),
      [
        "Project controls",
        "Scientific evidence inquiry",
        "Project-authored definition",
        "Reset with a registered profile",
      ],
      "Settings",
    );
    await click(button("Choose replacement profile"), "reset profile choice");
    await until(
      'document.querySelector(".settings-project-reset form") !== null',
      "reset form",
    );
    await inspectChoice("petra.scientific-evidence", [
      "Scientific evidence inquiry",
      "Research questions",
      "Grounded synthesis",
    ]);
    await inspectChoice("petra.controlled-writing", [
      "Controlled writing",
      "Document purposes",
      "Requirement Review",
      "Ask a controlled-writing model",
    ]);
    await setField("Replacement Project name", replacementProjectName);
    await setField("Replacement focus", replacementFocus);
    await click(
      'document.querySelector(".project-profile-command__confirmation input")',
      "additive replacement confirmation",
    );
    await click(
      button("Archive and create replacement"),
      "additive reset command",
    );
    await until(
      `window.location.pathname.startsWith("/projects/") && window.location.pathname.endsWith("/brief") && document.body.innerText.includes(${JSON.stringify(replacementProjectName)})`,
      "replacement Brief",
    );
    const resetPath = `/api/commands/projects/${context.scientificProjectId}/reset`;
    const resetCall = calls.findLast(
      (call) => call.method === "POST" && call.path === resetPath,
    );
    assert.equal(resetCall?.status, 200);
    assert.equal(
      resetCall?.requestJson?.profile_ref?.profile_id,
      "project_template_01K6P000000000000000000002",
    );
    assert.equal(
      resetCall?.json?.prior_project_ref?.project_id,
      context.scientificProjectId,
    );
    const replacementProjectId = resetCall?.json?.destination?.project_id;
    assert.ok(replacementProjectId);
    assert.notEqual(replacementProjectId, context.scientificProjectId);
    assertIncludes(
      await bodyText(),
      ["Controlled writing", replacementFocus, "Authority sources"],
      "replacement Brief",
    );
    const replacementGuideHref = await evaluate(
      'document.querySelector(".reference-guide-link").getAttribute("href")',
    );
    assert.equal(
      replacementGuideHref,
      `/guide?project=${replacementProjectId}`,
    );
    await activate(exactLink("Test guide"), "replacement Test guide");
    await until(
      `window.location.pathname === "/guide" && window.location.search === ${JSON.stringify(`?project=${replacementProjectId}`)} && document.querySelector("#checkpoint-start-title")?.textContent === ${JSON.stringify(replacementProjectName)}`,
      "replacement guide return",
    );
    assertIncludes(
      await bodyText(),
      [
        replacementProjectName,
        replacementFocus,
        "Controlled writing",
        "Inspect profile vocabulary",
        "Open the reset control",
      ],
      "replacement guide",
    );
    await activate(
      exactLink("Inspect profile vocabulary"),
      "replacement profile inspection",
    );
    await until(
      `window.location.pathname === ${JSON.stringify(`/projects/${replacementProjectId}/profile`)} && document.querySelector(".profile-taxonomy") !== null`,
      "controlled-writing taxonomy",
    );
    const writingTaxonomy = await evaluate(
      'document.querySelector(".profile-taxonomy").textContent',
    );
    assertIncludes(
      writingTaxonomy,
      [
        "Controlled writing",
        "Document purpose",
        "Requirement",
        "Authority source",
        "Governing link",
        "Requirement Review",
        "Ask a controlled-writing model",
        "Start controlled-writing Work",
        "Delete local copy",
      ],
      "controlled-writing taxonomy",
    );

    const accessibility = await send("Accessibility.getFullAXTree");
    for (const name of ["Project map", "Test guide", "Return to Brief"]) {
      assert.ok(
        accessibility.nodes.some(
          (node) =>
            typeof node.name?.value === "string" &&
            node.name.value.trim().toLocaleLowerCase() ===
              name.toLocaleLowerCase(),
        ),
        `${name} is missing from the accessibility tree.`,
      );
    }
    assert.deepEqual(consoleFailures, []);
    const browserVersion = await send("Browser.getVersion");
    const authenticatedCalls = calls.filter((call) =>
      call.path.startsWith("/api/"),
    );
    assert.ok(authenticatedCalls.length > 0);
    assert.ok(
      authenticatedCalls.every(
        (call) =>
          call.authorization === "Bearer petra-local-development" &&
          call.status >= 200 &&
          call.status < 500,
      ),
    );
    return {
      schema_name: "petra.wave6-taxonomy-guide-reset-browser-evidence",
      schema_version: "1.0.0",
      status: "passed",
      scenarios: [
        {
          evidence_id: "USER-TESTABLE-01",
          scenario_id: "stable-url-clean-start-reset",
          status: "passed",
        },
        {
          evidence_id: "UX1.6-TAXONOMY",
          scenario_id: "usable-profile-ui",
          status: "passed",
        },
      ],
      operation_ids: [
        "shell.project-map",
        "taxonomy.inspect-profile",
        "taxonomy.bind-project",
        "application.guide",
        "application.reset",
      ],
      executed_at: new Date().toISOString(),
      command:
        "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:taxonomy-guide-reset-ui",
      environment: {
        stable_url: `${stableUrl}/guide?project=${context.scientificProjectId}`,
        browser: {
          product: browserVersion.product,
          user_agent: browserVersion.userAgent,
          protocol_version: browserVersion.protocolVersion,
        },
        persistence:
          "fresh disposable PostgreSQL, Neo4j, and S3 stores created by the cumulative production harness",
        transport:
          "production React Router and authenticated Petra HTTP routes through the stable Vite proxy",
      },
      observations: {
        documented_start: {
          project_id: context.scientificProjectId,
          project_name: originalTitle,
          guide_path: originalGuide,
          guide_sections: [
            "purpose",
            "starting state",
            "guided task",
            "expected outcomes",
            "safe optional mutations",
            "reset",
            "known limits",
          ],
        },
        profile_choice: {
          selected_families: [
            "petra.scientific-evidence",
            "petra.controlled-writing",
          ],
          created_project_id: createdProjectId,
          created_project_name: createdProjectName,
          bound_profile_id: createCall.requestJson.profile_ref.profile_id,
        },
        scientific_profile: {
          project_id: context.scientificProjectId,
          resolution: "project_authored",
          complete_taxonomy_sections: true,
          project_map_used: true,
          core_surface_checks: coreSurfaceChecks,
        },
        reset: {
          prior_project_id: context.scientificProjectId,
          replacement_project_id: replacementProjectId,
          replacement_project_name: replacementProjectName,
          bound_profile_id: resetCall.requestJson.profile_ref.profile_id,
          exact_brief_path: `/projects/${replacementProjectId}/brief`,
          exact_guide_path: `/guide?project=${replacementProjectId}`,
          additive: true,
        },
        controlled_writing_profile: {
          project_id: replacementProjectId,
          complete_taxonomy_sections: true,
          unavailable_operations_visible: [
            "Ask a controlled-writing model",
            "Start controlled-writing Work",
            "Delete local copy",
          ],
        },
        unsupported_profile_boundary: {
          production_command_rejection:
            "reports/WAVE6-TAXONOMY-GUIDE-RESET-AUTHORITY.json",
          visible_fail_closed_presentation:
            "apps/workbench/src/product/project-profile.test.tsx",
          fallback_semantics_used: false,
        },
      },
      requests: summarizeCalls(),
      boundary:
        "Fresh disposable stores, the production Petra server, authenticated HTTP, the production React routes, and isolated Chromium executed one stable-URL workflow: the in-product guide, both complete registered profile choices, a controlled-writing profile-owned Project and map, the retained scientific Project-authored map and all applicable core task destinations, exact taxonomy resolution, the supported additive reset, the replacement Brief, and the Project-pinned guide return. No browser response, Project, taxonomy, command receipt, or reset outcome was mocked. The same command also invokes the focused fail-closed unsupported-profile presentation test; the retained backend authority artifact separately proves production unknown-profile rejection without fallback semantics.",
    };
  };

  const record = async (stage, context) => {
    try {
      if (stage === "projection_lag") {
        return prepareAndApply(context, context.scientificReviewSessionId);
      }
      if (stage === "governed_command_failure") {
        return prepareAndApply(
          context,
          context.failureReviewSessionId,
          context.advanceAuthority,
        );
      }
      if (stage === "restart_complete") {
        observation = await runBrowser(context);
        writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`);
      }
      return undefined;
    } catch (error) {
      observerFailure = error;
      throw error;
    }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    let failure = observerFailure;
    if (browser !== undefined) {
      const { workbench, chrome, cdp } = browser;
      try {
        if (cdp.socket.readyState === WebSocket.OPEN) {
          await Promise.race([
            cdp.send("Browser.close").catch(() => undefined),
            new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
          ]);
        }
      } catch (error) {
        if (failure === undefined) failure = error;
      } finally {
        cdp.socket.close();
        if (chrome.child.exitCode === null) chrome.child.kill("SIGTERM");
        await Promise.race([
          new Promise((resolveExit) =>
            chrome.child.addListener("close", resolveExit),
          ),
          new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
        ]);
        if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
        assert.ok(
          chrome.profile.startsWith(
            join(tmpdir(), "petra-wave6-taxonomy-guide-reset-"),
          ),
        );
        rmSync(chrome.profile, {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 100,
        });
        try {
          await workbench.vite.close();
        } catch (error) {
          if (failure === undefined) failure = error;
        }
      }
    }
    if (failure === undefined) {
      assert.equal(observation?.status, "passed");
    }
    if (failure !== undefined) throw failure;
  };

  return { record, close };
};
