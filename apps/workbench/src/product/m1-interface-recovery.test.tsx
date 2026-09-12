import { readFileSync } from "node:fs";

import type {
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectSourceView,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MemoryRouter,
  RouterContextProvider,
  type LoaderFunctionArgs,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GraphSurface } from "./GraphSurface.js";
import { BriefSurface, SourceReaderSurface } from "./ReferenceWorkbench.js";
import { ReviewSessionSurface } from "./ReviewSurface.js";
import {
  graphQuestionFromView,
  loadProjectRelationshipView,
  projectRecordFromShellView,
  reviewSessionFromView,
  sourceRecordFromView,
} from "./project-data.js";

const fixture = <Value,>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const shellView = fixture<PetraProjectShellView>("project-shell-view");
const sourceView = fixture<PetraProjectSourceView>("project-source-view");
const reviewView = fixture<PetraProjectReviewView>("project-review-view");
const relationshipView = fixture<PetraProjectRelationshipView>(
  "project-relationship-view",
);
const project = projectRecordFromShellView(shellView);

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const loaderArgs = (projectId: string): LoaderFunctionArgs => {
  const url = new URL(`http://petra.test/projects/${projectId}/graph`);
  return {
    request: new Request(url),
    url,
    pattern: "/projects/:projectId/graph",
    params: { projectId },
    context: new RouterContextProvider(),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("M1.9 interface recovery assertions", () => {
  it("keeps authoritative and represented positions distinct while projection catches up", () => {
    const graphInput = structuredClone(relationshipView);
    graphInput.content.position.projection.state = "catching_up";
    graphInput.content.position.projection.observed_event_position = 4;
    graphInput.content.position.projection.observed_stream_revision = 4;
    graphInput.content.position.projection.observed_target_sequence = 2;
    graphInput.content.position.projection.pending_records = 1;
    graphInput.content.position.projection.detail =
      "The graph safely represents Project stream revision 3 at event 3; one record is pending through Project stream revision 4.";
    const graph = graphQuestionFromView(graphInput);

    const briefMarkup = render(<BriefSurface project={project} />);
    const graphMarkup = render(
      <GraphSurface project={project} graph={graph} />,
    );

    expect(briefMarkup).toContain("Projection catching up");
    expect(briefMarkup).toContain(
      "authority ledger is at event 3; the graph safely represents event 0",
    );
    expect(graphMarkup).toContain("Newer authoritative state available");
    expect(graphMarkup).toContain(
      "safely represents Project stream revision 3",
    );
    expect(graphMarkup).toContain("pending through Project stream revision 4");
    expect(graphMarkup).toContain("Represented event 3 · Project stream 3");
    expect(graphMarkup).toContain(
      "contains 5 objects and 4 recorded relationships",
    );
  });

  it("keeps exact source identity and recovery visible when content is unavailable", () => {
    const identityOnly = structuredClone(sourceView);
    identityOnly.content.representation = {
      extent: "identity_only",
      extent_label: "Exact copy retained; representation unavailable",
      page_count: 0,
      block_count: 0,
      source_span_count: 0,
    };
    const source = sourceRecordFromView(identityOnly);
    const markup = render(
      <SourceReaderSurface
        project={project}
        source={source}
        returnTo={{
          path: `/projects/${project.id}/graph?layer=current&selected=claim_01ARZ3NDEKTSV4RRFFQ69G5FBB#graph-selection`,
          label: "Return to Graph",
        }}
      />,
    );

    expect(markup).toContain("Content unavailable");
    expect(markup).toContain("Only identity is available");
    expect(markup).toContain(
      "verified the exact copy and its rights, but no parsed representation is registered",
    );
    expect(markup).toContain(
      "Processing eligibility and permission are unresolved",
    );
    expect(markup).toContain("Return to Graph");
    expect(markup).toContain("selected=claim_01ARZ3NDEKTSV4RRFFQ69G5FBB");
  });

  it("blocks stale Review commitment while preserving candidate, basis, and recovery", () => {
    const stale = structuredClone(reviewView);
    stale.content.session.snapshot_state = "stale";
    const member = stale.content.members[0];
    if (member === undefined) throw new Error("Expected one Review member.");
    member.validation = {
      state: "blocked",
      label: "Refresh required",
      detail:
        "The Project advanced after this Review snapshot; the existing ChangeSet cannot be applied.",
      recovery:
        "Refresh the comparison and prepare a new ChangeSet from current authority.",
    };
    const review = reviewSessionFromView(stale);
    const markup = render(
      <ReviewSessionSurface project={project} review={review} />,
    );

    expect(markup).toContain("Project stream 0 · stale");
    expect(markup).toContain("Current · authoritative");
    expect(markup).toContain("Candidate · working");
    expect(markup).toContain("Refresh required");
    expect(markup).toContain("the existing ChangeSet cannot be applied");
    expect(markup).toContain(
      "Refresh the comparison and prepare a new ChangeSet from current authority",
    );
    expect(markup.match(/aria-disabled="true"/gu)).toHaveLength(2);
    expect(markup).toContain('data-operation="defer_review_session"');
    expect(markup).toContain("server rechecks lifecycle and authority");
  });

  it("shows only the coherent represented Graph when projection is blocked", () => {
    const blockedInput = structuredClone(relationshipView);
    blockedInput.content.position.projection.state = "blocked";
    blockedInput.content.position.projection.failure_code =
      "GRAPH_PROJECTION_WRITE_FAILED";
    blockedInput.content.position.projection.detail =
      "Projection stopped after the last coherent represented position; current authority remains in PostgreSQL.";
    const graph = graphQuestionFromView(blockedInput);
    const markup = render(<GraphSurface project={project} graph={graph} />);

    expect(markup).toContain("Graph projection unavailable");
    expect(markup).toContain("last coherent represented position");
    expect(markup).toContain("Current at Represented event 3");
    expect(markup).toContain(
      'aria-label="Working changes: Unavailable in the current M1 relationship view"',
    );
    expect(markup).toContain("Open exact source");
    expect(markup).not.toContain("Show recommended branch");
  });

  it("treats a post-reversal missing path as empty and never falls back to fixture data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "PROJECT_RELATIONSHIP_NOT_FOUND",
                message:
                  "No current supported relationship path is available for this Project.",
              },
            },
            { status: 404 },
          ),
        ),
      ),
    );

    await expect(
      loadProjectRelationshipView(loaderArgs(project.id)),
    ).resolves.toBeUndefined();
  });

  it("keeps an unavailable projection boundary attributable instead of returning stale content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "PROJECT_RELATIONSHIP_READ_FAILED",
                message: "Neo4j and PostgreSQL checkpoint identity diverged.",
              },
            },
            { status: 503 },
          ),
        ),
      ),
    );

    await expect(
      loadProjectRelationshipView(loaderArgs(project.id)),
    ).rejects.toThrow("Neo4j and PostgreSQL checkpoint identity diverged.");
  });
});
