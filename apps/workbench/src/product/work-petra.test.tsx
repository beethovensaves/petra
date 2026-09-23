import { readFileSync } from "node:fs";

import type {
  PetraCommunicationPlan,
  PetraProjectInquiryView,
  PetraProjectShellView,
  PetraProjectWorkOperationsView,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectThreadView,
  PetraProjectWorkView,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  getProjectPetraThread,
  getProjectWork,
  getReferenceProject,
  getReferenceWorkUnit,
} from "./fixtures.js";
import {
  PetraSurface,
  WorkCollectionSurface,
  WorkDetailSurface,
  workDetailReturnContext,
} from "./WorkPetraSurface.js";
import {
  petraThreadFromView,
  projectRecordFromShellView,
  type ProjectWorkerOutputSelection,
  workProjectFromView,
} from "./project-data.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("Work task contextual return", () => {
  const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

  it("preserves one exact same-Project source task and focus", () => {
    const sourcePath = `/projects/${projectId}/sources/project_source_01K6T000000000000000000009?from=sources`;
    const context = workDetailReturnContext(
      projectId,
      new URLSearchParams({
        return_to: sourcePath,
        return_label: "source processing",
        return_focus: "source-processing",
      }),
    );

    expect(context).toStrictEqual({
      path: `${sourcePath}#source-processing`,
      label: "source processing",
    });
  });

  it("rejects cross-Project and external returns", () => {
    expect(
      workDetailReturnContext(
        projectId,
        new URLSearchParams({
          return_to: "https://example.test/projects/other/sources/source",
          return_label: "source processing",
        }),
      ),
    ).toBeUndefined();
    expect(
      workDetailReturnContext(
        projectId,
        new URLSearchParams({
          return_to: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAX/brief",
          return_label: "another Project",
        }),
      ),
    ).toBeUndefined();
  });
});

const suggestedWorkActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionViewV11;

const suggestedActionInvocationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationView;

const communicationPlan = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/communication-plan.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraCommunicationPlan;

const workOperations = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-operations-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkOperationsView;

const startAgainReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-start-again-receipt.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkStartAgainReceipt;

const resumableWorkOperations = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-operations-view-resumable.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkOperationsView;

const selectedWorkerOutput: ProjectWorkerOutputSelection = {
  resultRef: {
    semanticKey: "petra.worker-output-manifest",
    recordId: "worker_output_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC4",
    revision: 1,
    contentHash:
      "sha256:5f9c81ae2ed811c77a5166d2a672ddde2243501542a8be66586b63f512458abb",
    recordHash:
      "sha256:9e3dc06cbebfeca6bbbe15a4fd22aa15668113d6ae2334e7c929d1570a6a614a",
  },
  producingWorkRef: {
    workUnitId: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
    revision: 4,
    recordHash:
      "sha256:f4b25b52df46ad74d21738f50aa2690635c5681a9f2a4df3582edb457709b2ab",
  },
  worker: {
    name: "petra.science",
    version: "0.0.0",
    runtime: "python 3.13.7",
    entrypoint: "petra_science.parse",
  },
  outcome: "succeeded",
  attempt: 1,
  reportedAt: "2026-08-29T14:00:05.000Z",
  outputs: [
    {
      name: "parsed_document",
      role: "proposal",
      state: "reported",
      handle: "output:parsed-document-json",
      contentHash:
        "sha256:6b2fa76c316e066aa3e3156ef026f140f4a45f4bf7f3127c766115b462ad16d8",
      byteSize: 40218,
      mediaType: "application/json",
      limitation:
        "The worker reported an immutable staged handle; Project usability is not inferred.",
    },
  ],
  diagnostics: [],
  resourceUsage: {
    wallTimeMs: 3000,
    cpuTimeMs: 5100,
    peakMemoryBytes: 805306368,
    inputBytes: 21,
    outputBytes: 40218,
    networkBytes: 0,
  },
  limitations: [
    "Worker output handles are reported, but Project-level usability is not inferred.",
  ],
};

describe("reference Work and Petra packets", () => {
  const project = getReferenceProject("inlet-cycle");
  const work = getProjectWork("inlet-cycle");
  const inputTask = getReferenceWorkUnit(
    "inlet-cycle",
    "work-process-maintenance",
  );
  const runningTask = getReferenceWorkUnit(
    "inlet-cycle",
    "work-compare-adjustment",
  );
  const thread = getProjectPetraThread("inlet-cycle");

  if (
    project === undefined ||
    work === undefined ||
    inputTask === undefined ||
    runningTask === undefined ||
    thread === undefined
  ) {
    throw new Error("Work and Petra conformance fixtures are incomplete.");
  }

  it("keeps Project inquiry paths distinct from operational Work", () => {
    const markup = render(
      <WorkCollectionSurface project={project} work={work} />,
    );

    expect(markup).toContain("Parallel inquiry paths");
    expect(markup).toContain("They are not hypotheses by default");
    expect(markup).toContain("they are not Work execution stages");
    expect(markup).toContain("2 linked Work tasks");
    expect(markup).toContain("1 linked Work task");
    expect(markup).toContain("No operational Work linked");
    expect(markup).toContain("Work tasks");
  });

  it("keeps exact Work usable when the profile has no inquiry-path mapping", () => {
    const markup = render(
      <WorkCollectionSurface
        project={project}
        work={{
          ...work,
          branches: [],
          inquiryLimitation:
            "The current Project profile has no active inquiry-path mapping.",
        }}
      />,
    );

    expect(markup).toContain("Inquiry paths unavailable");
    expect(markup).toContain(
      "The current Project profile has no active inquiry-path mapping.",
    );
    expect(markup).toContain("Work tasks");
    expect(markup).not.toContain("Parallel inquiry paths");
  });

  it("explains the contextual recommendation and preserves other paths", () => {
    const markup = render(
      <WorkCollectionSurface project={project} work={work} />,
    );

    expect(markup).toContain("Resolve Actuator service event first");
    expect(markup).toContain(
      "earliest unresolved dependency shared by two questions",
    );
    expect(markup).toContain("Other paths stay available");
    expect(markup).toContain("does not cancel, reject, or weaken this path");
    expect(markup).toContain("This branch can proceed independently");
  });

  it("leads a blocked task with exact required input and consequences", () => {
    const markup = render(
      <WorkDetailSurface project={project} unit={inputTask} work={work} />,
    );

    expect(markup).toContain('id="required-input"');
    expect(markup).toContain("Which permitted local copy may Petra process?");
    expect(markup).toContain("Project author");
    expect(markup).toContain("cannot inspect or cite the note&#x27;s content");
    expect(markup).toContain("Choose a permitted local copy");
    expect(markup).toContain("Continue another inquiry branch");
    expect(markup).toContain("none can be recorded locally");
  });

  it("shows observable stages, dependencies, resources, and empty results", () => {
    const markup = render(
      <WorkDetailSurface project={project} unit={runningTask} work={work} />,
    );

    expect(markup).toContain("Gather exact inputs");
    expect(markup).toContain("Align operating windows");
    expect(markup).toContain("Evaluate difference");
    expect(markup).toContain("Ready after dependency");
    expect(markup).toContain("3 minutes 18 seconds measured");
    expect(markup).toContain("No finish-time estimate supplied");
    expect(markup).toContain("cost not supplied");
    expect(markup).toContain("No usable result has been recorded");
    expect(markup).toContain("Visible stage activity is not a result");
  });

  it("renders every server-assessed Work operation without inventing resume or start-again commands", () => {
    const liveUnit = {
      ...runningTask,
      id: workOperations.work_unit_ref.work_unit_id,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={workOperations}
      />,
    );

    expect(markup).toContain(
      "Availability comes from the current server-owned",
    );
    expect(markup).toContain("Start work");
    expect(markup).toContain("Steer work");
    expect(markup).toContain("Set priority");
    expect(markup).toContain("Leave running");
    expect(markup).toContain("Cancel work");
    expect(markup).toContain("Retry failed work");
    expect(markup).toContain("Resume work");
    expect(markup).toContain("Start again");
    expect(markup).toContain("No compatible registered checkpoint");
    expect(markup).toContain(
      "Fresh execution requires a workflow-specific input-rebinding command",
    );
    expect(markup).toContain("Project authority remains unchanged");
  });

  it("enables only server-bound Resume while Start again stays unavailable", () => {
    const liveUnit = {
      ...runningTask,
      id: resumableWorkOperations.work_unit_ref.work_unit_id,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={resumableWorkOperations}
      />,
    );
    const buttonMarkup = (label: string): string | undefined => {
      const labelIndex = markup.indexOf(`>${label}</span>`);
      if (labelIndex < 0) return undefined;
      const start = markup.lastIndexOf("<button", labelIndex);
      const end = markup.indexOf("</button>", labelIndex);
      return start < 0 || end < 0
        ? undefined
        : markup.slice(start, end + "</button>".length);
    };

    expect(buttonMarkup("Resume work")).not.toContain("aria-disabled");
    expect(buttonMarkup("Start again")).toContain('aria-disabled="true"');
    expect(markup).toContain(
      "owning workflow registered this exact retained checkpoint",
    );
  });

  it("enables only server-bound Start again and discloses the linked fresh execution outcome", () => {
    const startAgainOperations = structuredClone(resumableWorkOperations);
    startAgainOperations.work_unit_ref = structuredClone(
      startAgainReceipt.requested_prior_work_unit_ref,
    );
    startAgainOperations.execution_state = "completed";
    delete startAgainOperations.resume_binding;
    const resume = startAgainOperations.controls.find(
      (control) => control.operation === "resume",
    );
    const startAgain = startAgainOperations.controls.find(
      (control) => control.operation === "start_again",
    );
    if (resume === undefined || startAgain === undefined) {
      throw new TypeError("Expected Resume and Start again controls.");
    }
    resume.state = "unavailable";
    resume.reason = "No compatible registered checkpoint is available.";
    delete resume.command_path;
    startAgain.state = "available";
    startAgain.reason =
      "The owning workflow registered exact fresh input for one linked execution.";
    startAgain.command_path = `/api/commands/projects/${startAgainOperations.project_id}/work/${startAgainOperations.work_unit_ref.work_unit_id}/start-again`;
    startAgainOperations.start_again_binding = {
      project_id: startAgainOperations.project_id,
      expected_prior_work_unit_ref: structuredClone(
        startAgainOperations.work_unit_ref,
      ),
      start_again_registration_ref: structuredClone(
        startAgainReceipt.start_again_registration,
      ),
      fresh_work_unit_ref: {
        ...structuredClone(startAgainReceipt.new_attempt.work_unit_ref),
        revision: 1,
      },
      prior_work_attempt: startAgainReceipt.prior_attempt.work_attempt,
      prior_lineage_attempt: startAgainReceipt.prior_attempt.lineage_attempt,
      new_lineage_attempt: startAgainReceipt.new_attempt.lineage_attempt,
      input_transition: structuredClone(startAgainReceipt.fresh_input),
    };
    const liveUnit = {
      ...runningTask,
      id: startAgainOperations.work_unit_ref.work_unit_id,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={startAgainOperations}
        startAgain={{
          projectId: startAgainReceipt.project_id,
          receiptId: startAgainReceipt.receipt_id,
          summary: startAgainReceipt.effect.summary,
          priorWorkUnitId:
            startAgainReceipt.prior_attempt.work_unit_ref.work_unit_id,
          priorWorkAttempt: startAgainReceipt.prior_attempt.work_attempt,
          priorLineageAttempt: startAgainReceipt.prior_attempt.lineage_attempt,
          priorInputManifestId:
            startAgainReceipt.fresh_input.prior_input_manifest_ref
              .worker_input_manifest_id,
          freshInputManifestId:
            startAgainReceipt.fresh_input.fresh_input_manifest_ref
              .worker_input_manifest_id,
          freshInputSummary: startAgainReceipt.fresh_input.summary,
          newWorkUnitId:
            startAgainReceipt.new_attempt.work_unit_ref.work_unit_id,
          newWorkAttempt: startAgainReceipt.new_attempt.work_attempt,
          newLineageAttempt: startAgainReceipt.new_attempt.lineage_attempt,
        }}
      />,
    );
    const startAgainLabelIndex = markup.indexOf(">Start again</span>");
    const startAgainButton = markup.slice(
      markup.lastIndexOf("<button", startAgainLabelIndex),
      markup.indexOf("</button>", startAgainLabelIndex) + "</button>".length,
    );

    expect(startAgainButton).not.toContain("aria-disabled");
    expect(markup).toContain("Started again with fresh input");
    expect(markup).toContain("Prior attempt retained");
    expect(markup).toContain("Fresh immutable input");
    expect(markup).toContain("Output reuse");
    expect(markup).toContain("New linked Work");
    expect(markup).toContain("Prior outputs, history, and incurred use remain");
  });

  it("enables server-assessed query-only reconnect and replay controls", () => {
    const queryOnly = structuredClone(workOperations);
    for (const operation of ["reconnect", "replay"] as const) {
      const control = queryOnly.controls.find(
        (candidate) => candidate.operation === operation,
      );
      if (control === undefined) throw new Error(`${operation} is missing.`);
      control.state = "query_only";
      control.reason = `The exact ${operation} query is available.`;
    }
    const liveUnit = {
      ...runningTask,
      id: queryOnly.work_unit_ref.work_unit_id,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={queryOnly}
      />,
    );
    const buttonMarkup = (label: string): string | undefined => {
      const labelIndex = markup.indexOf(`>${label}</span>`);
      if (labelIndex < 0) return undefined;
      const start = markup.lastIndexOf("<button", labelIndex);
      const end = markup.indexOf("</button>", labelIndex);
      return start < 0 || end < 0
        ? undefined
        : markup.slice(start, end + "</button>".length);
    };
    const reconnectButton = buttonMarkup("Reconnect");
    const replayButton = buttonMarkup("Replay delivery");

    expect(reconnectButton).toBeDefined();
    expect(reconnectButton).not.toContain("aria-disabled");
    expect(replayButton).toBeDefined();
    expect(replayButton).not.toContain("aria-disabled");
  });

  it("renders a selected manifest under its producing Work with its exact empty diagnostics array", () => {
    const liveUnit = {
      ...runningTask,
      id: selectedWorkerOutput.producingWorkRef.workUnitId,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={workOperations}
        selectedResult={selectedWorkerOutput}
      />,
    );

    expect(markup).toContain('id="selected-work-result"');
    expect(markup).toContain("Worker output manifest");
    expect(markup).toContain(selectedWorkerOutput.resultRef.recordId);
    expect(markup).toContain(selectedWorkerOutput.producingWorkRef.workUnitId);
    expect(markup).toContain("Succeeded · attempt 1");
    expect(markup).toContain("output:parsed-document-json");
    expect(markup).toContain("Measured resources");
    expect(markup).toContain("40,218 bytes");
    expect(markup).toContain("No diagnostics reported");
    expect(markup).toContain(
      "exact WorkerOutputManifest contains an empty diagnostics array",
    );
  });

  it("renders every exact manifest diagnostic with non-color severity text", () => {
    const liveUnit = {
      ...runningTask,
      id: selectedWorkerOutput.producingWorkRef.workUnitId,
    };
    const markup = render(
      <WorkDetailSurface
        project={project}
        unit={liveUnit}
        work={{ ...work, units: [liveUnit] }}
        operations={workOperations}
        selectedResult={{
          ...selectedWorkerOutput,
          diagnostics: [
            {
              code: "WORKER_OUTPUT_PARTIAL",
              severity: "warning",
              message: "One optional output was not reported.",
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("WORKER_OUTPUT_PARTIAL");
    expect(markup).toContain("Warning");
    expect(markup).toContain("One optional output was not reported.");
    expect(markup).toContain('data-severity="warning"');
  });

  it("discloses Petra's exact context, omissions, and message force", () => {
    const markup = render(<PetraSurface project={project} thread={thread} />);

    expect(markup).toContain("Context disclosed to Petra");
    expect(markup).toContain("Unavailable or omitted");
    expect(markup).toContain("Maintenance-note content is unavailable");
    expect(markup).toContain("No authority to apply or reject");
    expect(markup).toContain("Explanation only · no state changed");
    expect(markup).toContain("Work update · awaiting input");
    expect(markup).toContain(
      "/projects/inlet-cycle/work/work-process-maintenance",
    );
  });

  it("keeps unavailable request controls in the persistent Agent", () => {
    const markup = render(<PetraSurface project={project} thread={thread} />);

    expect(markup).toContain("Continue this request in the Agent");
    expect(markup).toContain(
      "No registered model command is currently available",
    );
    expect(markup).not.toContain("petra-composer");
    expect(markup).toContain("only the Work input adapter can resolve it");
  });

  it("renders the typed communication record without upgrading blocked language validation", () => {
    const markup = render(
      <PetraSurface project={project} communicationPlan={communicationPlan} />,
    );

    expect(markup).toContain("Language validation blocked");
    expect(markup).toContain("This record is not a validated answer");
    expect(markup).toContain("Structured preservation blocked");
    expect(markup).toContain("Structured preservation passed");
    expect(markup).toContain("Source and current delivery state");
    expect(markup).toContain("Source response");
    expect(markup).toContain("Current response observation");
    expect(markup).toContain("Running · interaction_run_");
    expect(markup).toContain("Source report");
    expect(markup).toContain("Petra synthesis");
    expect(markup).toContain("Unresolved inference");
    expect(markup).toContain(
      "This reports the source attribution represented by ASSERTS",
    );
    expect(markup).toContain("No generalization evidence is present");
    expect(markup).toContain("Complete validation receipt · 11 checks");
    expect(markup).toContain("Renderer binding");
    expect(markup).toContain("Not implemented");
    expect(markup).toContain("No exact product thread linked");
    expect(markup.indexOf("Attributed report")).toBeLessThan(
      markup.indexOf("Petra assessment"),
    );
    expect(markup.indexOf("Petra assessment")).toBeLessThan(
      markup.indexOf("Inference"),
    );
  });

  it("returns an exact communication read to its producing Work task", () => {
    const path =
      "/projects/inlet-cycle/work/work-process-maintenance#work-destinations-title";
    const markup = render(
      <PetraSurface
        project={project}
        communicationPlan={communicationPlan}
        returnContext={{ path, label: "producing Work task" }}
      />,
    );

    expect(markup).toContain("Return to producing Work task");
    expect(markup).toContain(`href="${path}"`);
  });

  it("keeps the linked command outcome separate from Work, result, and delivery", () => {
    const linked = structuredClone(communicationPlan);
    linked.content.invocation = structuredClone(suggestedActionInvocationView);
    const invocationCheck = linked.content.validation.checks.find(
      (check) => check.check === "exact_invocation_result_link",
    );
    if (invocationCheck === undefined)
      throw new Error("Communication invocation check is missing.");
    invocationCheck.status = "passed";
    invocationCheck.findings = [];
    linked.content.limitations = linked.content.limitations.filter(
      (limitation) =>
        !limitation.startsWith(
          "No linked invocation action report is available.",
        ),
    );
    linked.content.segments.push({
      segment_key: `command:${suggestedActionInvocationView.content.invocation.content.command_ref.command_id}`,
      order: linked.content.segments.length + 1,
      family: "action_report",
      original_statement: null,
      preservation: "passed",
      findings: [],
      force: "unavailable_as_structured_source_data",
      conditions: "unavailable_as_structured_source_data",
      presentation_depth: "material",
      language_validation: "not_performed",
    });
    const markup = render(
      <PetraSurface project={project} communicationPlan={linked} />,
    );

    expect(markup).toContain("Observed action outcome");
    expect(markup).toContain("Accepted");
    expect(markup).toContain("Pending registration");
    expect(markup).toContain(
      "The exact Work has not yet produced a durable GroundedResponse",
    );
    expect(markup).toContain("No current invocation delivery record is linked");
    expect(markup).toContain("Current server-owned recovery assessment");
    expect(markup).toContain("Exact retry converges on the same receipt");
    expect(markup).toContain("Language validation blocked");
    expect(markup).not.toContain("No exact invocation was supplied");
  });

  it("submits the exact same SuggestedAction command from Petra presentation", () => {
    const markup = render(
      <PetraSurface
        project={project}
        thread={thread}
        suggestedWorkAction={suggestedWorkActionView}
        suggestedActionInvocation={suggestedActionInvocationView}
      />,
    );

    expect(markup).toContain("Continue this exact Project action");
    expect(markup).toContain(
      "This presentation submits the same exact Petra invocation command as the direct Brief path",
    );
    expect(markup).toContain("Continue this proposed action");
    expect(markup).toContain(
      'data-operation-ids="petra.preview-action petra.invoke-action"',
    );
    expect(markup).toContain('data-presentation-path="conversational"');
    expect(markup).toContain(
      'data-contract-name="petra.suggested-action-invocation-request"',
    );
    expect(markup).toContain('data-command-name="InvokeSuggestedAction"');
    expect(markup).toContain(
      suggestedActionInvocationView.content.invocation.content.command_ref
        .command_id,
    );
    expect(markup).toContain("Return to the same Brief action");
  });

  it("renders a live exact thread while disclosing unavailable message bytes", () => {
    const shellView = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectShellView;
    const threadView = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-thread-view-detail.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectThreadView;
    const liveProject = projectRecordFromShellView(shellView);
    const liveThread = petraThreadFromView(threadView);
    const markup = render(
      <PetraSurface project={liveProject} thread={liveThread} />,
    );

    expect(markup).toContain("Selected study result");
    expect(markup).toContain("Authority event 3 · snapshot revision 1");
    expect(markup).toContain("3 included Project records");
    expect(markup).toContain("exact input bytes are unavailable");
    expect(markup).toContain("metadata-only Project read");
    expect(markup).toContain("Linked Work");
    expect(markup).toContain("Open linked Work");
    expect(markup).toContain(
      "No registered model command is currently available",
    );
    expect(markup).not.toContain("measurable improvement on its evaluation");
  });

  it("renders live authored inquiry state beside exact operational Work", () => {
    const shellView = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectShellView;
    const workView = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-work-view-collection.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectWorkView;
    const inquiryView = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectInquiryView;
    const liveProject = projectRecordFromShellView(shellView);
    const liveWork = workProjectFromView(workView, [inquiryView]);
    const markup = render(
      <WorkCollectionSurface project={liveProject} work={liveWork} />,
    );

    expect(markup).toContain("Research question");
    expect(markup).toContain("Active · authored");
    expect(markup).toContain("1 linked Work task");
    expect(markup).toContain("1 completed");
    expect(markup).toContain(
      "Operational state does not change the authored inquiry status",
    );
    expect(markup).not.toContain("Recommended inquiry path");
  });

  it("does not fabricate Work or Petra context for another profile", () => {
    const unrelated = getReferenceProject("north-loop");
    if (unrelated === undefined)
      throw new Error("Unrelated profile is missing.");

    const workMarkup = render(
      <WorkCollectionSurface
        project={unrelated}
        work={getProjectWork(unrelated.id)}
      />,
    );
    const petraMarkup = render(
      <PetraSurface
        project={unrelated}
        thread={getProjectPetraThread(unrelated.id)}
      />,
    );

    expect(workMarkup).toContain("No Work has been registered");
    expect(workMarkup).toContain("will not invent an operational task");
    expect(petraMarkup).toContain("No Petra context is registered");
    expect(petraMarkup).toContain("will not infer a whole-Project context");
  });
});
