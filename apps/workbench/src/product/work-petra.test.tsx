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
} from "./WorkPetraSurface.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

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

  it("keeps message drafting local when the model boundary is absent", () => {
    const markup = render(<PetraSurface project={project} thread={thread} />);

    expect(markup).toContain("Your unsent text remains local to this page");
    expect(markup).toContain("No prompt will be sent");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("only the Work input adapter can resolve it");
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
